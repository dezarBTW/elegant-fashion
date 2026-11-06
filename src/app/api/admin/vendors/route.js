import { NextResponse } from 'next/server';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { requireOrderAdmin,OrderRequestError } from '@/lib/orderManagement.mjs';
export async function GET(request) {
 try {
  const db=checkoutDatabase(); await requireOrderAdmin(request,db);
  const email=new URL(request.url).searchParams.get('email')?.trim().toLowerCase();
  let query=db.from('users').select('id,email,is_active,is_vendor').eq('is_vendor',true).order('email').limit(100);
  if(email) query=query.eq('email',email);
  const {data,error}=await query; if(error)throw error;
  return NextResponse.json({users:data},{headers:{'Cache-Control':'private, no-store'}});
 } catch(error){return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to load approved vendors.'},{status:error.status||503});}
}
