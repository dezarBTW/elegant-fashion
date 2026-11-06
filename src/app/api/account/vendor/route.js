import { NextResponse } from 'next/server';
import { requireActiveAccount } from '@/lib/accountServer';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
export async function GET(request) {
 try {
  const { profile } = await requireActiveAccount(request);
  return NextResponse.json({ vendor: { is_vendor: profile.is_vendor === true } }, { headers: { 'Cache-Control': 'private, no-store' } });
 } catch(error) { return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to check vendor access.'},{status:error.status||503}); }
}
