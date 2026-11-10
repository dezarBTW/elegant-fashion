import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRequestOrigin, requireActiveAccount } from '@/lib/accountServer';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
export async function POST(request){
 try{checkRequestOrigin(request);const {db,user}=await requireActiveAccount(request);const raw=await request.text();if(raw.length>1000)throw new OrderRequestError('Request too large.',413);
  const parsed=z.object({itemId:z.uuid()}).strict().safeParse(JSON.parse(raw));if(!parsed.success)throw new OrderRequestError('Invalid item.',400);
  const result=await db.rpc('customer_confirm_shipped_item',{p_actor:user.id,p_item:parsed.data.itemId});
  if(result.error?.code==='42501')throw new OrderRequestError(result.error.message,403);
  if(result.error?.code==='P0002')throw new OrderRequestError('Item not found.',404);
  if(result.error)throw result.error;
  return NextResponse.json({confirmedAt:result.data.confirmed_at},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){if(!(error instanceof OrderRequestError))console.error('Customer receipt failed',error?.code||error?.message);return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to confirm receipt.'},{status:error.status||503});}
}
