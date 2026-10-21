import { after, NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { readAccountBody } from "@/lib/accountServer";
import { studentReviewSchema } from "@/lib/registration.mjs";
import { notifyAcceptance, notifyRegistration } from "@/lib/registrationEmails.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, studentReviewSchema.pick({ id: true }));
    const { data: student, error } = await db.from("students").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    if (!student) throw new OrderRequestError("Student application not found.", 404);
    if (student.registration_email_sent_at) return NextResponse.json({ student }, { headers: { "Cache-Control": "no-store" } });
    if (!await notifyRegistration(student)) throw new OrderRequestError("The registration is saved, but its admin email could not be sent. Please try again later.", 503);
    const { data, error: saveError } = await db.from("students").update({ registration_email_sent_at: new Date().toISOString() }).eq("id", input.id).select("*").single();
    if (saveError) throw saveError;
    return NextResponse.json({ student: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Student notification retry failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to send the admin notification." }, { status: error.status || 503 });
  }
}

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
