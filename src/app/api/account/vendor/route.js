import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireActiveAccount, readAccountBody } from '@/lib/accountServer';
import { VENDOR_TERMS_VERSION } from '@/lib/vendorTerms.mjs';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
const schema = z.object({ accept: z.boolean(), version: z.literal(VENDOR_TERMS_VERSION) }).strict();
const reply = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const { data, error } = await db.from('vendor_accounts').select('status,accepted_at,accepted_terms_version').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return reply({ vendor: data || { status: 'not_invited' }, termsVersion: VENDOR_TERMS_VERSION });
  } catch (error) { return reply({ error: error instanceof OrderRequestError ? error.message : 'Unable to load vendor access.' }, error.status || 503); }
}
export async function POST(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const input = await readAccountBody(request, schema);
    const { data, error } = await db.from('vendor_accounts').update({
      status: input.accept ? 'active' : 'declined',
      accepted_at: input.accept ? new Date().toISOString() : null,
      accepted_terms_version: input.accept ? input.version : null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id).in('status', ['pending', 'active']).select('status').maybeSingle();
    if (error) throw error;
    if (!data) throw new OrderRequestError('An administrator invitation is required.', 403);
    return reply(data);
  } catch (error) { return reply({ error: error instanceof OrderRequestError ? error.message : 'Unable to save your decision.' }, error.status || 503); }
}
