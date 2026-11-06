import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendorServer';
import { OrderRequestError } from '@/lib/orderManagement.mjs';

export async function GET(request) {
  try {
    const {db,user}=await requireVendor(request);
    if(new URL(request.url).searchParams.get('mode')!=='vendor')throw new OrderRequestError('Only read-only vendor sales history is available.',400);
    const result=await db.from('seller_order_items').select('id,order_id,product_name,size,quantity,line_amount_minor')
      .eq('seller_id',user.id).eq('seller_kind','vendor').order('id').limit(200);
    if(result.error)throw result.error;
    const ids=[...new Set(result.data.map(item=>item.order_id))];
    const orders=ids.length?await db.from('shop_orders').select('id,paid_at').in('id',ids).eq('payment_status','paid'):{data:[]};
    if(orders.error)throw orders.error;
    const paid=new Map(orders.data.map(order=>[order.id,order.paid_at]));
    return NextResponse.json({items:result.data.filter(item=>paid.has(item.order_id)).map(item=>({...item,paid_at:paid.get(item.order_id)}))},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {
    return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to load sales history.'},{status:error.status||503});
  }
}
export async function POST() {
  return NextResponse.json({error:'Seller fulfilment and vendor payments are managed offline.'},{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
}
