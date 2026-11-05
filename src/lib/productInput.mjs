import { z } from 'zod';
const count = z.number().int().min(0).max(999999);
export const sellerProductSchema = z.object({
  id: z.uuid(), revision: z.number().int().nonnegative().nullable(),
  quantities: z.object({ S: count, M: count, L: count, XL: count, XXL: count }).strict(),
  product: z.object({ name: z.string().trim().min(1).max(200), price: z.number().positive().max(999999999), category: z.string().trim().min(1).max(100), gender: z.enum(['male','female','unisex']), description: z.string().trim().min(1).max(2000), image: z.string().url().max(2000).nullable() }).strict(),
}).strict();
