import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { requireOrderAdmin,OrderRequestError } from '@/lib/orderManagement.mjs';
export async function GET(request){
 try{
  const db=checkoutDatabase();await requireOrderAdmin(request,db);
  const ids=z.array(z.uuid()).max(100).parse((new URL(request.url).searchParams.get('ids')||'').split(',').filter(Boolean));
  if(!ids.length)return NextResponse.json({owners:[]});
  const owners=await db.from('product_owners').select('product_id,user_id,seller_kind').in('product_id',ids);
  if(owners.error)throw owners.error;
  const users=await db.from('users').select('id,email').in('id',[...new Set(owners.data.map(owner=>owner.user_id))]);
  if(users.error)throw users.error;
  return NextResponse.json({owners:owners.data.map(owner=>({...owner,email:users.data.find(user=>user.id===owner.user_id)?.email}))},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Unable to load product ownership.'},{status:error.status||503});}
}
