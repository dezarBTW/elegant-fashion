import { createClient } from "@supabase/supabase-js";
import { checkoutDatabase } from "./checkoutServer";
import { OrderRequestError } from "./orderManagement.mjs";

export async function requireActiveAccount(request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new OrderRequestError("Please sign in.", 401);
  const db = checkoutDatabase();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || !data.user.email_confirmed_at) throw new OrderRequestError("Sign in with a verified email address.", 401);
  const { data: profile, error: profileError } = await db.from("users").select("id,email,is_admin,is_active").eq("id", data.user.id).maybeSingle();
  if (profileError) throw new OrderRequestError("Unable to check your account.", 503);
  if (profile?.is_active !== true) throw new OrderRequestError("This account is inactive. Contact Elegant Style for help.", 403);
  return { db, user: data.user, profile, token };
}

export function checkRequestOrigin(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new OrderRequestError("Invalid request origin.", 403);
}

export async function readAccountBody(request, schema, maxLength = 16000) {
  checkRequestOrigin(request);
  const text = await request.text();
  if (text.length > maxLength) throw new OrderRequestError("Request is too large.", 413);
  let input;
  try { input = JSON.parse(text); } catch { throw new OrderRequestError("Invalid request details.", 400); }
  const result = schema.safeParse(input);
  if (!result.success) throw new OrderRequestError(result.error.issues[0].message, 400);
  return result.data;
}

export async function claimAccountOrders(db, user) {
  // Only a server-verified, confirmed email can claim an unassigned guest order.
  const { error } = await db.from("shop_orders").update({ user_id: user.id })
    .is("user_id", null).eq("customer_email", user.email.toLowerCase());
  if (error) throw error;
}

export function passwordClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
