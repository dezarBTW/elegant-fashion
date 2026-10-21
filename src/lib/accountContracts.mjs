import { z } from "zod";
import { addCartItem } from "./checkout.mjs";

export const REQUEST_TYPES = ["refund", "complaint"];
export const REQUEST_STATUSES = {
  refund: ["pending", "approved", "rejected"],
  complaint: ["pending", "in_review", "resolved", "rejected"],
};
export const REQUEST_TABLES = { refund: "refund_requests", complaint: "product_complaints" };
export const requestSchema = z.object({
  id: z.uuid(), kind: z.enum(REQUEST_TYPES), orderId: z.uuid(), productId: z.uuid(),
  description: z.string().trim().min(10, "Please provide at least 10 characters.").max(2000),
  received: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  if (value.kind === "complaint" && !value.received) ctx.addIssue({ code: "custom", path: ["received"], message: "Confirm that you received this product." });
});
export const requestQuerySchema = z.object({ kind: z.enum(REQUEST_TYPES).default("refund"), page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
export const requestReviewSchema = z.object({
  id: z.uuid(), kind: z.enum(REQUEST_TYPES), expectedStatus: z.string(), status: z.string(), response: z.string().trim().max(2000).default(""),
}).strict().superRefine((value, ctx) => {
  const allowed = value.kind === "refund" ? { pending: ["approved", "rejected"] } : { pending: ["in_review", "resolved", "rejected"], in_review: ["resolved", "rejected"] };
  if (!allowed[value.expectedStatus]?.includes(value.status)) ctx.addIssue({ code: "custom", path: ["status"], message: "This status change is not allowed." });
});
export const accountActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("password"), currentPassword: z.string().min(1).max(256), newPassword: z.string().min(8, "Use at least 8 characters.").max(128) }).strict(),
  z.object({ action: z.literal("deactivate"), currentPassword: z.string().min(1).max(256), confirmed: z.literal(true) }).strict(),
]);

export function repurchaseCart(cart, productId, size = "") {
  return addCartItem(cart, productId, 1, size);
}
