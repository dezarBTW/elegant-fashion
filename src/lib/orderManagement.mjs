export const PAYMENT_STATUSES = ["pending", "paid", "review"];
export const FULFILLMENT_STATUSES = ["new", "processing", "ready", "shipped", "completed"];
export const ORDER_COLUMNS = "id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,payment_status,fulfillment_status,paid_at,created_at";

export class OrderRequestError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function requireOrderAdmin(request, db) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new OrderRequestError("Sign in to manage orders.", 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new OrderRequestError("Your session has expired. Please sign in again.", 401);
  const { data: profile, error: profileError } = await db.from("users")
    .select("is_admin,is_active").eq("id", data.user.id).maybeSingle();
  if (profileError) throw new OrderRequestError("Unable to check administrator access.", 503);
  if (profile?.is_admin !== true || profile?.is_active !== true) throw new OrderRequestError("Administrator access is required.", 403);
  return data.user;
}

export function nextFulfillmentStatuses(status, deliveryMethod) {
  if (status === "new") return ["processing"];
  if (status === "processing") return deliveryMethod === "pickup" ? ["ready"] : ["ready", "shipped"];
  if (status === "ready") return deliveryMethod === "pickup" ? ["completed"] : ["shipped"];
  if (status === "shipped") return ["completed"];
  return [];
}
