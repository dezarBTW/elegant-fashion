import { NextResponse } from 'next/server';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { checkRequestOrigin } from '@/lib/accountServer';
import { OrderRequestError, requireOrderAdmin } from '@/lib/orderManagement.mjs';
import { uploadProductImage } from '@/lib/productImageUpload';

export const runtime = 'nodejs';
export async function POST(request) {
  try {
    checkRequestOrigin(request);
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    return NextResponse.json({ url: await uploadProductImage(request, db, 'products') });
  } catch (error) {
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : 'Image upload failed.' }, { status: error.status || 503 });
  }
}
