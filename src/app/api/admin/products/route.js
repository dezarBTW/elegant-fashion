import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { requireOrderAdmin, OrderRequestError } from '@/lib/orderManagement.mjs';
import { readAccountBody } from '@/lib/accountServer';
const count=z.number().int().min(0).max(999999);
const schema=z.object({id:z.uuid(),revision:z.number().int().nonnegative().nullable(),quantities:z.object({S:count,M:count,L:count,XL:count,XXL:count}).strict(),product:z.object({name:z.string().trim().min(1).max(200),price:z.number().positive().max(999999999),category:z.string().trim().min(1).max(100),gender:z.enum(['male','female','unisex']),description:z.string().trim().min(1).max(2000),image:z.string().max(2000).nullable()}).strict()}).strict();
export async function POST(request){
 try{
  const db=checkoutDatabase();await requireOrderAdmin(request,db);
  const input=await readAccountBody(request,schema);
  const {data,error}=await db.rpc('admin_save_stock_product',{p_id:input.id,p_product:input.product,p_quantities:input.quantities,p_revision:input.revision});
  if(error?.code==='40001')throw new OrderRequestError('Stock changed while you were editing. Reload the product before saving.',409);
  if(error?.code==='P0001')throw new OrderRequestError('Some stock is reserved for pending payments. You cannot reduce stock below those reservations.',409);
  if(error)throw error;
  return NextResponse.json({id:data},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to save this product and its stock.'},{status:error instanceof OrderRequestError?error.status:503});}
}
