import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { sendServiceEmail, wrapBrandEmail } from './orderEmails.mjs';

export const DEACTIVATION_CODE_MINUTES = 10;

export async function hasGoogleIdentity(db, userId) {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data?.user) throw new Error('Unable to inspect account identities');
  return data.user.identities?.some(identity => identity.provider === 'google') === true ||
    data.user.app_metadata?.providers?.includes('google') === true ||
    data.user.app_metadata?.provider === 'google';
}

export function hashDeactivationCode(userId, code, secret = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!secret) throw new Error('Deactivation code secret is unavailable');
  return createHmac('sha256', secret).update(`account-deactivation/v1/${userId}/${code}`).digest('hex');
}

export function deactivationEmail(email, code, idempotencyKey) {
  return {
    to: email,
    subject: 'Your Elegant Style deactivation code',
    html: wrapBrandEmail('Confirm account deactivation', `<p>Enter this six-digit code in your Elegant Style account page:</p><p style="font-size:30px;letter-spacing:6px;font-weight:700">${code}</p><p>The code expires in ${DEACTIVATION_CODE_MINUTES} minutes. If you did not request deactivation, you can ignore this email.</p>`),
    text: `Your Elegant Style account deactivation code is ${code}. It expires in ${DEACTIVATION_CODE_MINUTES} minutes. If you did not request deactivation, ignore this email.`,
    idempotencyKey,
  };
}

export async function sendDeactivationCode(db, user) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = hashDeactivationCode(user.id, code);
  const expiresAt = new Date(Date.now() + DEACTIVATION_CODE_MINUTES * 60_000).toISOString();
  const { error } = await db.from('account_deactivation_codes').upsert({
    user_id: user.id, code_hash: codeHash, expires_at: expiresAt, attempts: 0,
  });
  if (error) throw error;
  const sent = await sendServiceEmail(deactivationEmail(user.email, code, `account-deactivation/${user.id}/${randomUUID()}`));
  if (!sent) {
    const { error: removeError } = await db.from('account_deactivation_codes').delete().eq('user_id', user.id).eq('code_hash', codeHash);
    if (removeError) throw removeError;
    return false;
  }
  return true;
}
