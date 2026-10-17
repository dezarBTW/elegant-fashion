import { NextResponse } from "next/server";
import { accountActionSchema } from "@/lib/accountContracts.mjs";
import { passwordClient, readAccountBody, requireActiveAccount } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  let auth;
  try {
    const { db, user, token } = await requireActiveAccount(request);
    const input = await readAccountBody(request, accountActionSchema, 4000);
    const { data: allowed, error: limitError } = await db.rpc("consume_account_action_limit", { p_user_id: user.id, p_action: input.action });
    if (limitError) throw limitError;
    if (!allowed) throw new OrderRequestError("Too many attempts. Please wait 15 minutes before trying again.", 429);
    auth = passwordClient();
    const { data, error: passwordError } = await auth.auth.signInWithPassword({ email: user.email, password: input.currentPassword });
    if (passwordError || data.user?.id !== user.id) throw new OrderRequestError("Your current password is incorrect.", 400);
    if (input.action === "password") {
      const { error } = await auth.auth.updateUser({ password: input.newPassword });
      if (error) throw new OrderRequestError("Password could not be changed. Check the password requirements and try again.", 400);
      return NextResponse.json({ message: "Password changed successfully." });
    }
    const { data: changed, error } = await db.from("users").update({ is_active: false }).eq("id", user.id).select("id").single();
    if (error || !changed) throw error || new Error("Account was not updated");
    const { error: revokeError } = await db.auth.admin.signOut(token, "global");
    if (revokeError) console.error("Deactivated account session revocation failed", revokeError.message);
    return NextResponse.json({ deactivated: true, message: "Your account is deactivated. Contact Elegant Style to request reactivation." });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Account action failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to update your account." }, { status: error.status || 503 });
  } finally {
    if (auth) await auth.auth.signOut({ scope: "local" }).catch(() => {});
  }
}
