import { after, NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { readAccountBody } from "@/lib/accountServer";
import { OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { requestQuerySchema, requestReviewSchema, REQUEST_TABLES } from "@/lib/accountContracts.mjs";
import { notifySupportRequest } from "@/lib/supportEmails.mjs";

export const runtime = "nodejs";
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error) {
  if (!(error instanceof OrderRequestError)) console.error("Customer request review failed", error?.code || error?.message);
  return json({ error: error instanceof OrderRequestError ? error.message : "Unable to manage customer requests." }, error.status || 503);
}

export async function GET(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const parsed = requestQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new OrderRequestError("Invalid request filter.", 400);
    const { kind, page } = parsed.data, pageSize = 25;
    const { data, count, error } = await db.from(REQUEST_TABLES[kind]).select("id,order_id,product_id,product_name,description,status,response,created_at,updated_at,order:shop_orders(customer_name,customer_email,customer_phone)", { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return json({ requests: data, total: count, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    const admin = await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, requestReviewSchema, 6000);
    const { data: changed, error } = await db.from(REQUEST_TABLES[input.kind]).update({ status: input.status, response: input.response, reviewed_by: admin.id })
      .eq("id", input.id).eq("status", input.expectedStatus).select("*").maybeSingle();
    if (error) throw error;
    if (!changed) throw new OrderRequestError("This request changed. Refresh before updating it.", 409);
    after(async () => {
      try {
        const { data: customer, error: userError } = await db.auth.admin.getUserById(changed.user_id);
        if (userError) console.error("Customer notification lookup failed", userError.message);
        await notifySupportRequest(changed, input.kind, customer?.user?.email, true);
      } catch (mailError) { console.error("Customer status email failed", mailError.message); }
    });
    return json({ request: changed });
  } catch (error) { return failure(error); }
}
