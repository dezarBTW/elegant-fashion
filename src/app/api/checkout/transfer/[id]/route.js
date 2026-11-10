import { NextResponse } from 'next/server';
import { checkoutDatabase, hasOrderAccess } from '@/lib/checkoutServer';
import { checkRequestOrigin } from '@/lib/accountServer';
import { ADMIN_NOTIFY_EMAIL, sendServiceEmail, wrapBrandEmail, escapeEmailHtml } from '@/lib/orderEmails.mjs';
export const runtime='nodejs';
export async function POST(request,{params}){
 try{
  checkRequestOrigin(request);const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Invalid order.'},{status:400});
  const db=checkoutDatabase();const found=await db.from('shop_orders').select('*').eq('id',id).maybeSingle();if(found.error)throw found.error;
  const order=found.data;if(!order||!hasOrderAccess(request,order)||order.payment_method!=='bank_transfer')return NextResponse.json({error:'Order not found.'},{status:404});
  if(order.transfer_submitted_at)return NextResponse.json({submitted:true});
  if(order.payment_status!=='pending'||new Date(order.reservation_expires_at)<=new Date())return NextResponse.json({error:'This order is no longer accepting receipts. Contact the shop.'},{status:409});
  const form=await request.formData();const file=form.get('receipt');
  if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<1||file.size>5*1024*1024)return NextResponse.json({error:'Upload a JPG, PNG, or WebP receipt under 5 MB.'},{status:400});
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];const path=`${id}/receipt.${ext}`;
  const uploaded=await db.storage.from('transfer-receipts').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error&&uploaded.error.statusCode!=='409')throw uploaded.error;
  const saved=await db.from('shop_orders').update({transfer_receipt_path:path,transfer_submitted_at:new Date().toISOString()}).eq('id',id).eq('payment_status','pending').is('transfer_submitted_at',null).select('id').maybeSingle();if(saved.error)throw saved.error;
  if(saved.data){
   const signed=await db.storage.from('transfer-receipts').createSignedUrl(path,7*24*3600);
   const link=signed.data?.signedUrl||'';
   await sendServiceEmail({to:ADMIN_NOTIFY_EMAIL,idempotencyKey:`transfer-submitted/${id}`,subject:`Transfer submitted — ${id}`,attachments:[{filename:`transfer-${id}.${ext}`,content:Buffer.from(await file.arrayBuffer()).toString('base64')}],html:wrapBrandEmail('Transfer awaiting verification',`<p>Order ${escapeEmailHtml(id)} · Amount ₦${(order.total_minor/100).toLocaleString('en-NG')}</p><p>Customer: ${escapeEmailHtml(order.customer_name)}</p><p><a href="${escapeEmailHtml(link)}">View receipt</a></p><p>Verify funds in the bank before marking paid.</p>`),text:`Transfer submitted for order ${id}. Amount: NGN ${order.total_minor/100}. Receipt: ${link}. Verify funds before approval.`});
  }
  return NextResponse.json({submitted:true});
 }catch(error){console.error('Transfer receipt failed',error?.code||error?.message);return NextResponse.json({error:'Unable to save receipt.'},{status:503});}
}
