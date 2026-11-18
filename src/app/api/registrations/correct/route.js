import { NextResponse } from "next/server";
import { requireActiveAccount, readAccountBody } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";
import { CORRECTION_FIELD_KEYS, registrationSchema, studentCorrectionSchema } from "@/lib/registration.mjs";
import { passportPath } from "@/lib/passport.mjs";
import { hasImageSignature } from "@/lib/imageSignature.mjs";
import { ageFromDateOfBirth } from "@/lib/guardianConsent.mjs";
import { verifyGuardianConsent } from "@/lib/guardianConsentServer.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const input = await readAccountBody(request, studentCorrectionSchema);
    const { data: student, error } = await db.from("students").select("*").eq("id", input.id).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!student) throw new OrderRequestError("Application not found.", 404);
    if (student.status !== "declined" || !student.correction_opened_at) {
      throw new OrderRequestError("This application is not open for corrections.", 409);
    }
    const allowed = new Set(student.correction_fields || []);
    if (allowed.has("sponsorship")) allowed.add("sponsor_organization");
    const changed = Object.keys(input.changes);
    if (changed.some((key) => !CORRECTION_FIELD_KEYS.includes(key) || !allowed.has(key))) {
      throw new OrderRequestError("Only the details selected by admissions can be changed.", 400);
    }
    const base = Object.fromEntries(CORRECTION_FIELD_KEYS.map((key) => [key, student[key] ?? ""]));
    const checked = registrationSchema.safeParse({
      ...base, ...input.changes, passport_photo: input.passport_photo,
      guardian_consent_path: input.guardian_consent_path || student.guardian_consent_path || "", agreed: true,
    });
    if (!checked.success) throw new OrderRequestError(checked.error.issues[0].message, 400);
    const age = ageFromDateOfBirth(checked.data.date_of_birth);
    if (age === null) throw new OrderRequestError("Enter a valid date of birth.", 400);
    if (age < 18) await verifyGuardianConsent(db, user.id, checked.data.guardian_consent_path);
    const path = passportPath(input.passport_photo, process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (path !== `${user.id}/passport-${student.decline_revision}` || new URL(input.passport_photo).search) {
      throw new OrderRequestError("Upload a new passport photograph before resubmitting.", 400);
    }
    const fileName = path.slice(user.id.length + 1);
    const { data: files, error: fileError } = await db.storage.from("student-passports").list(user.id, { limit: 100, search: fileName });
    const file = files?.find((entry) => entry.name === fileName);
    if (fileError || !file || !["image/jpeg", "image/png"].includes(file.metadata?.mimetype) ||
      Number(file.metadata?.size || 0) <= 0 || Number(file.metadata.size) > 5 * 1024 * 1024) {
      throw new OrderRequestError("Your new passport photograph could not be verified. Upload it again.", 400);
    }
    const { data: image, error: downloadError } = await db.storage.from("student-passports").download(path);
    if (downloadError || !image || image.size <= 0 || image.size > 5 * 1024 * 1024 ||
      !hasImageSignature(new Uint8Array(await image.arrayBuffer()), file.metadata.mimetype === "image/png" ? "passport.png" : "passport.jpg")) {
      throw new OrderRequestError("Your new passport photograph could not be verified. Upload it again.", 400);
    }
    const changes = Object.fromEntries(changed.map((key) => [key, checked.data[key]]));
    changes.guardian_consent_path = age < 18 ? checked.data.guardian_consent_path : null;
    const resubmitted = await db.rpc("resubmit_student_application", {
      p_user_id: user.id, p_id: input.id, p_changes: changes, p_passport_photo: input.passport_photo,
    });
    if (resubmitted.error?.code === "23514") throw new OrderRequestError(resubmitted.error.message, 409);
    if (resubmitted.error) throw resubmitted.error;
    return NextResponse.json({ registration: resubmitted.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Student correction failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to resubmit this application. Please try again." }, { status: error.status || 503 });
  }
}
