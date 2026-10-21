import { after, NextResponse } from 'next/server';
import { createHash, createHmac } from 'node:crypto';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { readAccountBody } from '@/lib/accountServer';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
import { productRequestEmail, productRequestSchema } from '@/lib/productRequests.mjs';
import { sendServiceEmail } from '@/lib/orderEmails.mjs';

export const runtime = 'nodejs';
export async function POST(request) {
  try {
    const input = await readAccountBody(request, productRequestSchema, 7000);
    const db = checkoutDatabase();
    const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY).update(`product-request:${ip}`).digest('hex');
    const { data: allowed, error: limitError } = await db.rpc('consume_checkout_rate_limit', { p_ip_hash: ipHash });
    if (limitError) throw limitError;
    if (!allowed) throw new OrderRequestError('Too many requests. Please wait before trying again.', 429);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const { data: existing, error: lookupError } = await db.from('product_requests').select('id,request_fingerprint').eq('id', input.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      if (existing.request_fingerprint !== fingerprint) throw new OrderRequestError('This request reference has already been used. Refresh the page and try again.', 409);
      return NextResponse.json({ id: existing.id, duplicate: true });
    }
    const { data: product, error: productError } = await db.from('products').select('id,name').eq('id', input.productId).eq('is_active', true).maybeSingle();
    if (productError) throw productError;
    if (!product) throw new OrderRequestError('This product is no longer available.', 404);
    const { data, error } = await db.from('product_requests').insert({ id: input.id, product_id: product.id, product_name: product.name, customer_name: input.name, customer_email: input.email, customer_phone: input.phone, requested_size: input.size, requested_colour: input.colour, details: input.details, request_fingerprint: fingerprint }).select('*').single();
    if (error?.code === '23505') {
      const { data: duplicate } = await db.from('product_requests').select('request_fingerprint').eq('id', input.id).maybeSingle();
      if (duplicate?.request_fingerprint !== fingerprint) throw new OrderRequestError('This request reference has already been used.', 409);
      return NextResponse.json({ id: input.id, duplicate: true });
    }
    if (error) throw error;
    after(async () => {
      if (await sendServiceEmail(productRequestEmail(data))) {
        const { error } = await db.from('product_requests').update({ email_sent_at: new Date().toISOString() }).eq('id', data.id);
        if (error) console.error('Product request email status could not be recorded', error.code);
      }
    });
    return NextResponse.json({ id: data.id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error('Product request failed', error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : 'Unable to save your request. Please try again.' }, { status: error.status || 503 });
  }
}
