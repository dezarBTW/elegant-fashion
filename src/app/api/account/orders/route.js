import { NextResponse } from "next/server";
import { claimAccountOrders, requireActiveAccount } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const rawPage = new URL(request.url).searchParams.get("page") || "1";
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1 || Number(rawPage) > 100000) throw new OrderRequestError("Invalid page.", 400);
    const page = Number(rawPage), pageSize = 20;
    await claimAccountOrders(db, user);
    const { data, count, error } = await db.from("shop_orders")
      .select("id,created_at,items,total_minor,payment_status,fulfillment_status,delivery,customer_received_at", { count: "exact" })
      .eq("user_id", user.id).eq("payment_status", "paid").order("created_at", { ascending: false }).order("id", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return NextResponse.json({ orders: data, total: count, page, pageSize }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Account orders failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to load your orders." }, { status: error.status || 503 });
  }
}
