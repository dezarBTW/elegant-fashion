import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendorServer';
import { checkRequestOrigin } from '@/lib/accountServer';
import { uploadProductImage } from '@/lib/productImageUpload';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
export const runtime = 'nodejs';
export async function POST(request){
 try{
  checkRequestOrigin(request);const {db,user}=await requireVendor(request);
  const url = await uploadProductImage(request,db,`vendors/${user.id}`);
  return NextResponse.json({url});
 }catch(error){return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Image upload failed.'},{status:error.status||503});}
}
