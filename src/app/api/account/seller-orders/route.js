import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendorServer';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
import { checkRequestOrigin } from '@/lib/accountServer';
import { z } from 'zod';
import { notifyShippingConfirmation } from '@/lib/shippingEmails.mjs';

export async function GET(request) {
  try {
    const {db,user}=await requireVendor(request);
    if(new URL(request.url).searchParams.get('mode')!=='vendor')throw new OrderRequestError('Invalid sales view.',400);
    const result=await db.from('seller_order_items').select('id,order_id,product_id,product_name,size,quantity,line_amount_minor,fulfilment,shipped_at')
      .eq('seller_id',user.id).eq('seller_kind','vendor').order('id').limit(200);
    if(result.error)throw result.error;
    const ids=[...new Set(result.data.map(item=>item.order_id))];
    const orders=ids.length?await db.from('shop_orders').select('id,paid_at,delivery,items').in('id',ids).eq('payment_status','paid'):{data:[]};
    if(orders.error)throw orders.error;
    const paid=new Map(orders.data.map(order=>[order.id,order]));
    const productIds=[...new Set(result.data.map(item=>item.product_id))];
    const productImages=productIds.length?await db.from('products').select('id,image').in('id',productIds):{data:[]};if(productImages.error)throw productImages.error;
    const images=new Map(productImages.data.map(product=>[product.id,product.image]));
    const sellers=ids.length?await db.from('seller_order_items').select('order_id,seller_id').in('order_id',ids):{data:[]};if(sellers.error)throw sellers.error;
    const direct=new Map(ids.map(id=>[id,new Set(sellers.data.filter(item=>item.order_id===id).map(item=>item.seller_id)).size===1&&paid.get(id)?.delivery?.method!=='pickup']));
    return NextResponse.json({items:result.data.filter(item=>paid.has(item.order_id)).map(item=>({...item,image:paid.get(item.order_id).items?.find(line=>line.productId===item.product_id&&line.size===item.size)?.image||images.get(item.product_id)||null,paid_at:paid.get(item.order_id).paid_at,direct_ship:direct.get(item.order_id)}))},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {
    return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to load sales history.'},{status:error.status||503});
  }
}
export async function POST(request) {
 try{checkRequestOrigin(request);const {db,user}=await requireVendor(request);const raw=await request.text();if(raw.length>2000)throw new OrderRequestError('Request too large.',413);
  const parsed=z.object({itemId:z.uuid(),expected:z.enum(['new','ready']),next:z.enum(['ready','shipped'])}).strict().safeParse(JSON.parse(raw));
  if(!parsed.success)throw new OrderRequestError('Invalid progress update.',400);
  const result=await db.rpc('set_seller_shipping_progress',{p_actor:user.id,p_item:parsed.data.itemId,p_expected:parsed.data.expected,p_next:parsed.data.next});
  if(result.error?.code==='40001')throw new OrderRequestError('Progress changed. Refresh and try again.',409);
  if(result.error?.code==='42501')throw new OrderRequestError(result.error.message,403);
  if(result.error?.code==='P0002')throw new OrderRequestError('Item not found.',404);
  if(result.error)throw result.error;
  let emailSent=null;
  if(parsed.data.next==='shipped'){
   const order=await db.from('shop_orders').select('id,customer_name,customer_email').eq('id',result.data.order_id).single();if(order.error)throw order.error;
   emailSent=await notifyShippingConfirmation(db,order.data,result.data);
  }
  return NextResponse.json({item:result.data,emailSent},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){if(!(error instanceof OrderRequestError))console.error('Vendor progress failed',error?.code||error?.message);return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to update item progress.'},{status:error.status||503});}
}
