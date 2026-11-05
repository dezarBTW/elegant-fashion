import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { requireOrderAdmin, OrderRequestError } from '@/lib/orderManagement.mjs';
import { readAccountBody } from '@/lib/accountServer';
const reply = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
const schema = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), action: z.enum(['invite', 'revoke']) }).strict();
export async function GET(request) {
  try {
    const db = checkoutDatabase(); await requireOrderAdmin(request, db);
    const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase();
    let query = db.from('users').select('id,email,is_active').order('email').limit(50);
    if (email) query = query.eq('email', email);
    const { data, error } = await query;
    if (error) throw error;
    const ids = (data || []).map(u => u.id);
    const vendors = ids.length ? await db.from('vendor_accounts').select('*').in('user_id', ids) : { data: [] };
    if (vendors.error) throw vendors.error;
    return reply({ users: (data || []).map(u => ({ ...u, vendor: vendors.data.find(v => v.user_id === u.id) || { status: 'not_invited' } })) });
  } catch (error) { return reply({ error: error instanceof OrderRequestError ? error.message : 'Unable to load vendors.' }, error.status || 503); }
}
export async function POST(request) {
  try {
    const db = checkoutDatabase(); await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, schema);
    const { data: user, error } = await db.from('users').select('id,email,is_active').eq('email', input.email).maybeSingle();
    if (error) throw error;
    if (!user?.is_active) throw new OrderRequestError('An active existing account is required.', 400);
    const { data: current, error: lookupError } = await db.from('vendor_accounts').select('status').eq('user_id', user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (input.action === 'invite' && current?.status === 'active') throw new OrderRequestError('This vendor is already active.', 409);
    const { error: saveError } = await db.from('vendor_accounts').upsert({ user_id: user.id, status: input.action === 'invite' ? 'pending' : 'revoked', updated_at: new Date().toISOString(), ...(input.action === 'invite' ? { invited_at: new Date().toISOString(), accepted_at: null, accepted_terms_version: null } : {}) });
    if (saveError) throw saveError;
    return reply({ success: true, emailQueued: input.action === 'invite' });
  } catch (error) { return reply({ error: error instanceof OrderRequestError ? error.message : 'Unable to update vendor.' }, error.status || 503); }
}
