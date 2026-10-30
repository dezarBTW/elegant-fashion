import { NextResponse } from 'next/server';
import { checkRequestOrigin, requireActiveAccount } from '@/lib/accountServer';
import { hasGoogleIdentity, sendDeactivationCode } from '@/lib/accountDeactivation.mjs';
import { OrderRequestError } from '@/lib/orderManagement.mjs';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'private, no-store' };

function errorResponse(error) {
  if (!(error instanceof OrderRequestError)) console.error('Deactivation setup failed', error?.code || error?.message);
  return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : 'Unable to prepare deactivation.' },
    { status: error.status || 503, headers: noStore });
}

export async function GET(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const google = await hasGoogleIdentity(db, user.id);
    return NextResponse.json({ method: google ? 'email-code' : 'password' }, { headers: noStore });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  try {
    checkRequestOrigin(request);
    const { db, user } = await requireActiveAccount(request);
    if (!await hasGoogleIdentity(db, user.id)) throw new OrderRequestError('This account uses password confirmation.', 403);
    const { data: allowed, error: limitError } = await db.rpc('consume_account_action_limit', {
      p_user_id: user.id, p_action: 'deactivate_code_send',
    });
    if (limitError) throw limitError;
    if (!allowed) throw new OrderRequestError('Too many codes requested. Please wait 15 minutes.', 429);
    if (!await sendDeactivationCode(db, user)) throw new OrderRequestError('The code could not be emailed. Please try again.', 503);
    return NextResponse.json({ message: 'A six-digit code was sent to your account email. It expires in 10 minutes.' }, { headers: noStore });
  } catch (error) { return errorResponse(error); }
}
