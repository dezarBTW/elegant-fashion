import { NextResponse } from 'next/server';
import { checkRequestOrigin, claimAccountOrders, requireActiveAccount } from '@/lib/accountServer';
import { OrderRequestError } from '@/lib/orderManagement.mjs';

export async function POST(request) {
  try {
    checkRequestOrigin(request);
    const { db, user } = await requireActiveAccount(request);
    await claimAccountOrders(db, user);
    return NextResponse.json({ linked: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error('Account linking failed', error?.code);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : 'Unable to link your previous orders. Please try again.' }, { status: error.status || 503 });
  }
}
