import { z } from "zod";

export const BESPOKE_TRANSITIONS = Object.freeze({
  new: ["contacted", "cancelled"],
  contacted: ["quoted", "cancelled"],
  quoted: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
});
const status = z.enum(Object.keys(BESPOKE_TRANSITIONS));
export const bespokeReviewSchema = z
  .object({
    id: z.uuid(),
    expectedStatus: status,
    status,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (!BESPOKE_TRANSITIONS[input.expectedStatus].includes(input.status)) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "This bespoke status change is not allowed.",
      });
    }
  });
