import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireVendor } from '@/lib/vendorServer';
import { checkRequestOrigin } from '@/lib/accountServer';
import { hasImageSignature } from '@/lib/imageSignature.mjs';
import { OrderRequestError } from '@/lib/orderManagement.mjs';
export async function POST(request){
 try{
  checkRequestOrigin(request);const {db,user}=await requireVendor(request);
  if(Number(request.headers.get('content-length')||0)>4200000)throw new OrderRequestError('Choose an image under 4 MB.',413);
  const body=await request.formData(),file=body.get('image');
  if(!(file instanceof File)||file.size>4000000||file.size<12)throw new OrderRequestError('Choose an image under 4 MB.',400);
  const extension=file.name.split('.').pop().toLowerCase();
  const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!types[extension]||file.type!==types[extension]||!hasImageSignature(bytes,file.name))throw new OrderRequestError('Choose a valid JPEG, PNG or WebP image.',400);
  const path=`vendors/${user.id}/${randomUUID()}.${extension}`;
  const {error}=await db.storage.from('product-images').upload(path,bytes,{contentType:types[extension],upsert:false});
  if(error)throw error;
  return NextResponse.json({url:db.storage.from('product-images').getPublicUrl(path).data.publicUrl});
 }catch(error){return NextResponse.json({error:error instanceof OrderRequestError?error.message:'Image upload failed.'},{status:error.status||503});}
}
