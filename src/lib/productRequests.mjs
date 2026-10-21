import { z } from 'zod';
import { ADMIN_NOTIFY_EMAIL, escapeEmailHtml as safe, wrapBrandEmail } from './orderEmails.mjs';

export const productRequestSchema = z.object({
  id: z.uuid(), productId: z.uuid(),
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{7,30}$/, 'Enter a valid phone number.'),
  size: z.string().trim().max(100).default(''),
  colour: z.string().trim().max(100).default(''),
  details: z.string().trim().max(1500).default(''),
  website: z.literal('').optional(),
}).strict().refine(input => input.size || input.colour, { message: 'Enter the different size or colour you would like.' });

export function productRequestEmail(request) {
  const details = `Request: ${request.id}\nProduct: ${request.product_name}\nCustomer: ${request.customer_name}\nEmail: ${request.customer_email}\nPhone: ${request.customer_phone}\nRequested size: ${request.requested_size || 'Current size'}\nRequested colour: ${request.requested_colour || 'Current colour'}\nDetails: ${request.details || 'None'}\nSubmitted: ${request.created_at}`;
  return { to: ADMIN_NOTIFY_EMAIL, reply_to: request.customer_email, subject: `Product size / colour request — ${request.product_name}`, idempotencyKey: `product-request/${request.id}/admin`,
    html: wrapBrandEmail('New product size or colour request', `<p style="white-space:pre-line">${safe(details)}</p><p>Contact the customer to confirm availability and pricing. This request is not a paid order.</p>`),
    text: `${details}\n\nContact the customer to confirm availability and pricing. This request is not a paid order.` };
}
