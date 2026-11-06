import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVendor } from '@/lib/vendorServer';
import { readAccountBody } from '@/lib/accountServer';
import { sellerProductSchema } from '@/lib/productInput.mjs';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
const reply = (body, status=200) => NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const fail = error => { console.error('Vendor product operation failed',error.code||error.status,error.message); return reply({error: error instanceof OrderRequestError ? error.message : 'Unable to manage products.'},error.status || 503); };
export async function GET(request) {
  try {
    const { db,user }=await requireVendor(request);
    const {data:owners,error}=await db.from('product_owners').select('product_id').eq('user_id',user.id);
    if(error)throw error;
    const ids=owners.map(owner=>owner.product_id);
    if(!ids.length)return reply({products:[]});
    const result=await db.from('products').select('id,name,price,category,gender,description,image,is_active').in('id',ids).order('created_at',{ascending:false});
    const stock=await db.from('product_size_stock').select('product_id,quantities,revision').in('product_id',ids);
    if(result.error||stock.error)throw result.error||stock.error;
    return reply({products:result.data.map(product=>({...product,stock:stock.data.find(s=>s.product_id===product.id)}))});
  }catch(error){return fail(error);}
}
export async function POST(request) {
  try {
    const {db,user}=await requireVendor(request);
    const input=await readAccountBody(request,sellerProductSchema);
    const {data,error}=await db.rpc('seller_save_product',{p_actor:user.id,p_id:input.id,p_product:input.product,p_quantities:input.quantities,p_revision:input.revision});
    if(error?.code==='42501')throw new OrderRequestError('You can only manage your own products.',403);
    if(['40001','P0002'].includes(error?.code))throw new OrderRequestError('Stock changed. Reload before saving.',409);
    if(error?.code==='P0001')throw new OrderRequestError('Stock reserved for pending payments cannot be removed.',409);
    if(error)throw error;
    return reply({id:data});
  }catch(error){return fail(error);}
}
export async function DELETE(request) {
  try {
    const {db,user}=await requireVendor(request);
    const input=await readAccountBody(request,z.object({id:z.uuid()}).strict());
    const {error}=await db.rpc('vendor_remove_product',{p_actor:user.id,p_id:input.id});
    if(error?.code==='42501')throw new OrderRequestError('You can only remove your own products.',403);
    if(error?.code==='23514')throw new OrderRequestError('Resolve pending payment reservations before removing this product.',409);
    if(error)throw error;
    return reply({removed:true});
  }catch(error){return fail(error);}
}
