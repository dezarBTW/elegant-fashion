import { requireActiveAccount } from './accountServer';
import { OrderRequestError } from './orderManagement.mjs';
import { VENDOR_TERMS_VERSION } from './vendorTerms.mjs';
export async function requireVendor(request) {
  const account = await requireActiveAccount(request);
  const { data, error } = await account.db.from('vendor_accounts').select('status,accepted_terms_version').eq('user_id', account.user.id).maybeSingle();
  if (error) throw new OrderRequestError('Unable to check vendor access.', 503);
  if (data?.status !== 'active' || data.accepted_terms_version !== VENDOR_TERMS_VERSION) throw new OrderRequestError('Active vendor access and acceptance of the current agreement are required.', 403);
  return account;
}
