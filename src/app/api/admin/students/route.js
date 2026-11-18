import { after, NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { readAccountBody } from "@/lib/accountServer";
import { studentDeclineSchema, studentReviewSchema } from "@/lib/registration.mjs";
import { ageFromDateOfBirth } from "@/lib/guardianConsent.mjs";
import { verifyGuardianConsent } from "@/lib/guardianConsentServer.mjs";
import { notifyAcceptance, notifyDecline, notifyRegistration } from "@/lib/registrationEmails.mjs";
import { removeQueuedMedia } from "@/lib/storageCleanup.mjs";

export const runtime = "nodejs";

async function finishDecline(db, student) {
  if (!student.correction_opened_at) {
    const candidates = student.declined_passport_path
      ? [{ bucket: "student-passports", path: student.declined_passport_path }] : [];
    const cleanup = await removeQueuedMedia(db, candidates);
    if (cleanup.failed) return { student, cleanupPending: true, emailSent: false };
    if (student.declined_passport_path) {
      const [folder, fileName] = student.declined_passport_path.split("/");
      const check = await db.storage.from("student-passports").list(folder, { limit: 100, search: fileName });
      if (check.error || check.data?.some((file) => file.name === fileName)) {
        return { student, cleanupPending: true, emailSent: false };
      }
    }
    const opened = await db.from("students").update({ correction_opened_at: new Date().toISOString() })
      .eq("id", student.id).eq("status", "declined").eq("decline_revision", student.decline_revision)
      .select("*").maybeSingle();
    if (opened.error || !opened.data) throw opened.error || new OrderRequestError("The application changed during review. Refresh and try again.", 409);
    student = opened.data;
  }
  if (student.decline_email_sent_at) return { student, cleanupPending: false, emailSent: true };
  let recipient = student.email;
  if (student.user_id) {
    const account = await db.auth.admin.getUserById(student.user_id);
    recipient = account.data?.user?.email || recipient;
  }
  const emailSent = await notifyDecline(student, recipient);
  if (emailSent) {
    const saved = await db.from("students").update({ decline_email_sent_at: new Date().toISOString() })
      .eq("id", student.id).eq("status", "declined").eq("decline_revision", student.decline_revision)
      .select("*").maybeSingle();
    if (saved.error) throw saved.error;
    if (saved.data) student = saved.data;
  }
  return { student, cleanupPending: false, emailSent };
}

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
    const input = await readAccountBody(request, z.union([
      studentDeclineSchema,
      studentReviewSchema.refine((value) => value.status !== "declined", "A decline reason and correction fields are required."),
    ]));
    if (input.status === "declined") {
      const declined = await db.rpc("decline_student_application", {
        p_id: input.id, p_reason: input.reason, p_fields: input.correction_fields,
      });
      if (declined.error?.code === "P0002") throw new OrderRequestError("Student application not found.", 404);
      if (declined.error?.code === "23514") throw new OrderRequestError(declined.error.message, 409);
      if (declined.error) throw declined.error;
      return NextResponse.json(await finishDecline(db, declined.data), { headers: { "Cache-Control": "no-store" } });
    }
    if (input.status === "accepted") {
      const { data: applicant, error: lookupError } = await db.from("students")
        .select("user_id,date_of_birth,guardian_consent_path").eq("id", input.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (!applicant) throw new OrderRequestError("Student application not found.", 404);
      const age = ageFromDateOfBirth(applicant.date_of_birth);
      if (age !== null && age < 18 && !applicant.guardian_consent_path) {
        throw new OrderRequestError("A signed guardian consent form is required before accepting this applicant. Request a correction.", 409);
      }
      if (age !== null && age < 18) await verifyGuardianConsent(db, applicant.user_id, applicant.guardian_consent_path);
    }
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

export async function PUT(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, studentReviewSchema.pick({ id: true }));
    const { data: student, error } = await db.from("students").select("*").eq("id", input.id).maybeSingle();
    if (error) throw error;
    if (!student || student.status !== "declined") throw new OrderRequestError("Declined application not found.", 404);
    if (!student.decline_reason || student.passport_photo) {
      throw new OrderRequestError("Set the decline reason and correction fields first.", 409);
    }
    return NextResponse.json(await finishDecline(db, student), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Student decline retry failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to finish the decline notification." }, { status: error.status || 503 });
  }
}
