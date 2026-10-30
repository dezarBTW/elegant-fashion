import { NextResponse } from "next/server";
import { registrationSchema } from "@/lib/registration.mjs";
import { readAccountBody, requireActiveAccount } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";
import { hasImageSignature } from "@/lib/imageSignature.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const input = await readAccountBody(request, registrationSchema);
    const photo = new URL(input.passport_photo);
    const expected = `/storage/v1/object/public/student-passports/${user.id}/`;
    if (photo.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin ||
      !photo.pathname.startsWith(expected) || !/^passport\.(jpg|png)$/.test(photo.pathname.slice(expected.length)) || photo.search) {
      throw new OrderRequestError("Upload your own passport photograph before submitting.", 400);
    }
    const fileName = photo.pathname.slice(expected.length);
    const { data: files, error: fileError } = await db.storage.from("student-passports").list(user.id, { limit: 10 });
    const file = files?.find((entry) => entry.name === fileName);
    if (fileError || !file || !["image/jpeg", "image/png"].includes(file.metadata?.mimetype) ||
      Number(file.metadata?.size || 0) <= 0 || Number(file.metadata.size) > 5 * 1024 * 1024) {
      throw new OrderRequestError("Your passport photograph could not be verified. Upload it again.", 400);
    }
    const { data: image, error: downloadError } = await db.storage.from("student-passports").download(`${user.id}/${fileName}`);
    if (downloadError || !image || image.size <= 0 || image.size > 5 * 1024 * 1024 ||
      !hasImageSignature(new Uint8Array(await image.arrayBuffer()), fileName)) {
      throw new OrderRequestError("Your passport photograph could not be verified. Upload it again.", 400);
    }
    const { data, error } = await db.rpc("submit_student_application", { p_user_id: user.id, p_details: input });
    if (error?.code === "23505") throw new OrderRequestError("You already have a registration. Open your registration details.", 409);
    if (error) throw error;
    // No admin email is sent for new registrations; review them in the admin dashboard.
    return NextResponse.json({ registration: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Student registration failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to submit your registration. Please try again." }, { status: error.status || 503 });
  }
}
