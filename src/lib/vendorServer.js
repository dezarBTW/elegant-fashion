import { requireActiveAccount } from './accountServer';
import { OrderRequestError } from './orderManagement.mjs';
export async function requireVendor(request) {
 const account = await requireActiveAccount(request);
 if(account.profile.is_vendor !== true) throw new OrderRequestError('Approved vendor access is required.',403);
 return account;
}
