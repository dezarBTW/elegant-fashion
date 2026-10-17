import { after, NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { readAccountBody } from "@/lib/accountServer";
import { studentReviewSchema } from "@/lib/registration.mjs";
import { notifyAcceptance } from "@/lib/registrationEmails.mjs";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, studentReviewSchema);
    const { data, error } = await db.rpc("review_student_application", { p_id: input.id, p_status: input.status });
    if (error?.code === "P0002") throw new OrderRequestError("Student application not found.", 404);
    if (error) throw error;
    if (data.send_acceptance) after(() => notifyAcceptance(data.student));
    return NextResponse.json({ student: data.student }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Student review failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to update this application." }, { status: error.status || 503 });
  }
}
