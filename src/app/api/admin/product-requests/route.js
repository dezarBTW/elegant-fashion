import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { OrderRequestError, requireOrderAdmin } from '@/lib/orderManagement.mjs';
import { readAccountBody } from '@/lib/accountServer';
import { productRequestEmail } from '@/lib/productRequests.mjs';
import { sendServiceEmail } from '@/lib/orderEmails.mjs';

const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
function failure(error) {
  if (!(error instanceof OrderRequestError)) console.error('Admin product requests failed', error?.code || error?.message);
  return json({ error: error instanceof OrderRequestError ? error.message : 'Unable to load product requests.' }, error.status || 503);
}
export async function GET(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const page = Math.max(1, Math.min(10000, Math.floor(Number(new URL(request.url).searchParams.get('page'))) || 1));
    const { data, error, count } = await db.from('product_requests').select('id,product_id,product_name,customer_name,customer_email,customer_phone,requested_size,requested_colour,details,created_at,email_sent_at', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * 25, page * 25 - 1);
    if (error) throw error;
    return json({ requests: data, total: count });
  } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, z.object({ id: z.uuid() }).strict());
    const { data, error } = await db.from('product_requests').select('*').eq('id', input.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new OrderRequestError('Request not found.', 404);
    if (data.email_sent_at) return json({ emailSent: true });
    if (!await sendServiceEmail(productRequestEmail(data))) throw new OrderRequestError('The request is saved, but its email could not be sent. Please try again later.', 503);
    const { error: updateError } = await db.from('product_requests').update({ email_sent_at: new Date().toISOString() }).eq('id', data.id);
    if (updateError) throw updateError;
    return json({ emailSent: true });
  } catch (error) { return failure(error); }
}
