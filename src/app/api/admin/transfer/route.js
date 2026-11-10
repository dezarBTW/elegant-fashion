import { NextResponse } from 'next/server';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { requireOrderAdmin } from '@/lib/orderManagement.mjs';
import { checkRequestOrigin } from '@/lib/accountServer';
import { sendPaidOrderNotifications } from '@/lib/paidOrderNotifications.mjs';
export const runtime='nodejs';
export async function POST(request){
 try{const db=checkoutDatabase();const admin=await requireOrderAdmin(request,db);checkRequestOrigin(request);const {id,action='approve'}=await request.json();if(!/^[0-9a-f-]{36}$/i.test(id)||!['approve','flag'].includes(action))return NextResponse.json({error:'Invalid order action.'},{status:400});
  if(action==='flag'){const flagged=await db.rpc('flag_transfer_order',{p_order:id,p_actor:admin.id});if(flagged.error)return NextResponse.json({error:flagged.error.message},{status:409});return NextResponse.json({flagged:true});}
  const approved=await db.rpc('approve_transfer_order',{p_order:id,p_actor:admin.id});if(approved.error)return NextResponse.json({error:approved.error.message},{status:409});
  const notifications=await sendPaidOrderNotifications(db,approved.data);return NextResponse.json({paid:true,emailFailures:notifications.failed});
 }catch(error){console.error('Transfer approval failed',error?.code||error?.message);return NextResponse.json({error:'Unable to approve transfer.'},{status:503});}
}
export async function GET(request){
 try{const db=checkoutDatabase();await requireOrderAdmin(request,db);const id=new URL(request.url).searchParams.get('id');if(!/^[0-9a-f-]{36}$/i.test(id||''))return NextResponse.json({error:'Invalid order.'},{status:400});
 const found=await db.from('shop_orders').select('transfer_receipt_path').eq('id',id).single();if(found.error||!found.data?.transfer_receipt_path)return NextResponse.json({error:'Receipt unavailable.'},{status:404});
 const signed=await db.storage.from('transfer-receipts').createSignedUrl(found.data.transfer_receipt_path,300);if(signed.error)throw signed.error;return NextResponse.json({url:signed.data.signedUrl},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Unable to open receipt.'},{status:503});}
}
