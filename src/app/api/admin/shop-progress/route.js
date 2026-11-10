import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { requireOrderAdmin, OrderRequestError } from '@/lib/orderManagement.mjs';
import { checkRequestOrigin } from '@/lib/accountServer';
import { notifyShippingConfirmation } from '@/lib/shippingEmails.mjs';
export async function POST(request){
 try{const db=checkoutDatabase();const admin=await requireOrderAdmin(request,db);checkRequestOrigin(request);const raw=await request.text();if(raw.length>2000)throw new OrderRequestError('Request too large.',413);
  const parsed=z.object({orderId:z.uuid(),itemId:z.uuid(),expected:z.enum(['new','at_shop','ready','shipped']),next:z.enum(['at_shop','ready','shipped','notify'])}).strict().safeParse(JSON.parse(raw));
  if(!parsed.success)throw new OrderRequestError('Invalid shop progress update.',400);
  if(parsed.data.next==='notify'){
   const order=await db.from('shop_orders').select('id,customer_name,customer_email,payment_status').eq('id',parsed.data.orderId).single();if(order.error)throw order.error;
   const item=await db.from('seller_order_items').select('id,product_name,fulfilment').eq('id',parsed.data.itemId).eq('order_id',parsed.data.orderId).single();if(item.error)throw item.error;
   if(order.data.payment_status!=='paid'||!['ready','shipped'].includes(item.data.fulfilment))throw new OrderRequestError('Shipping email is unavailable.',403);
   const emailSent=await notifyShippingConfirmation(db,order.data,item.data,item.data.fulfilment);
   return NextResponse.json({emailSent},{headers:{'Cache-Control':'private, no-store'}});
  }
  const result=await db.rpc('set_shop_shipping_progress',{p_actor:admin.id,p_order:parsed.data.orderId,p_item:parsed.data.itemId,p_expected:parsed.data.expected,p_next:parsed.data.next});
  if(result.error?.code==='40001')throw new OrderRequestError('Order progress changed. Refresh and try again.',409);
  if(result.error?.code==='42501')throw new OrderRequestError(result.error.message,403);
  if(result.error?.code==='P0002')throw new OrderRequestError('Order not found.',404);
  if(result.error)throw result.error;
  let emailFailures=0;
  if(parsed.data.next==='shipped'||parsed.data.next==='ready'){
   const order=await db.from('shop_orders').select('id,customer_name,customer_email').eq('id',parsed.data.orderId).single();if(order.error)throw order.error;
   const items=await db.from('seller_order_items').select('id,product_name').eq('order_id',parsed.data.orderId);if(items.error)throw items.error;
   const sent=await Promise.all(items.data.map(item=>notifyShippingConfirmation(db,order.data,item,parsed.data.next)));
   emailFailures=sent.filter(value=>!value).length;
  }
  return NextResponse.json({updated:true,emailFailures},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){if(!(error instanceof OrderRequestError))console.error('Shop progress failed',error?.code||error?.message);return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to update shop progress.'},{status:error.status||503});}
}
