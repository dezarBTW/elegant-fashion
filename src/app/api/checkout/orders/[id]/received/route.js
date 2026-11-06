import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({error:'Delivery is now verified directly by Elegant Style. Contact the shop with your order reference.'},{status:405,headers:{'Cache-Control':'no-store'}});
}
