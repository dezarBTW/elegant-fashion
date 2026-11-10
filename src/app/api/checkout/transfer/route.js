import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes, createHash, createHmac } from 'node:crypto';
import { requireActiveAccount, checkRequestOrigin } from '@/lib/accountServer';
import { receiptHash, setOrderCookie } from '@/lib/checkoutServer';
import { priceCart, deliveryFeeMinor } from '@/lib/checkout.mjs';
import { SIZE_VALUES } from '@/lib/products.mjs';

export const runtime = 'nodejs';
const schema=z.object({attemptId:z.uuid(),items:z.array(z.object({productId:z.uuid(),quantity:z.number().int().min(1).max(10),size:z.enum(SIZE_VALUES).optional()}).strict()).min(1).max(20),customer:z.object({name:z.string().trim().min(2).max(100),email:z.email().max(254),phone:z.string().regex(/^(?:0[789]\d{9}|\+234[789]\d{9})$/)}).strict(),delivery:z.object({method:z.enum(['pickup','yenagoa','outside_yenagoa']),address:z.string().max(300),city:z.string().max(100),state:z.string().max(100)}).strict()}).strict();
const reply=(body,status=200)=>NextResponse.json(body,{status});
export async function POST(request){
 try{
  checkRequestOrigin(request);
  const {db,user}=await requireActiveAccount(request);
  const raw=await request.text();if(raw.length>20000)return reply({error:'Request is too large.'},413);
  const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return reply({error:parsed.error.issues[0].message},400);
  const input=parsed.data;
  if(input.delivery.method!=='pickup'&&(!input.delivery.address.trim()||!input.delivery.city.trim()||!input.delivery.state.trim()))return reply({error:'Enter your delivery address.'},400);
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
  const ipHash=createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY).update(ip).digest('hex');
  const limit=await db.rpc('consume_checkout_rate_limit',{p_ip_hash:ipHash});if(limit.error||!limit.data)return reply({error:'Checkout is temporarily unavailable or rate limited.'},429);
  const existing=await db.from('shop_orders').select('id,user_id,request_fingerprint,payment_method,transfer_submitted_at').eq('id',input.attemptId).maybeSingle();if(existing.error)throw existing.error;
  if(existing.data){if(existing.data.user_id!==user.id||existing.data.request_fingerprint!==fingerprint||existing.data.payment_method!=='bank_transfer')return reply({error:'This checkout cannot be reused.'},409);return reply({orderId:input.attemptId,submitted:Boolean(existing.data.transfer_submitted_at)});}
  const ids=[...new Set(input.items.map(item=>item.productId))];
  const products=await db.from('products').select('id,name,image,price,sale_price,is_active,available_sizes').in('id',ids).eq('is_active',true);if(products.error)throw products.error;
  const priced=priceCart(input.items,products.data||[]);const shipping=deliveryFeeMinor(input.delivery.method,priced.lines);
  const token=randomBytes(32).toString('hex');
  const inserted=await db.from('shop_orders').insert({id:input.attemptId,user_id:user.id,customer_name:input.customer.name,customer_email:input.customer.email.toLowerCase(),customer_phone:input.customer.phone,delivery:input.delivery,items:priced.lines,subtotal_minor:priced.subtotalMinor,shipping_minor:shipping,total_minor:priced.subtotalMinor+shipping,receipt_hash:receiptHash(token),request_fingerprint:fingerprint,payment_method:'bank_transfer',checkout_state:'open',reservation_expires_at:new Date(Date.now()+48*3600000).toISOString()}).select('id').single();
  if(inserted.error)return reply({error:inserted.error.code==='P0001'?'An item is no longer available. Update your cart.':'Unable to create the order.'},inserted.error.code==='P0001'?409:503);
  return setOrderCookie(reply({orderId:input.attemptId}),input.attemptId,token);
 }catch(error){console.error('Transfer checkout failed',error?.code||error?.message);return reply({error:error?.code==='42703'?'Bank transfer database setup is pending. Contact the shop before making a transfer.':'Unable to start transfer checkout.'},503);}
}
