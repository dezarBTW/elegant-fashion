import { randomUUID } from 'node:crypto';
import { optimizeProductImage } from './optimizeProductImage.mjs';
import { OrderRequestError } from './orderManagement.mjs';

export async function uploadProductImage(request, db, folder) {
  if (Number(request.headers.get('content-length') || 0) > 4200000) {
    throw new OrderRequestError('Choose an image under 4 MB.', 413);
  }
  const body = await request.formData();
  const image = await optimizeProductImage(body.get('image'));
  const path = `${folder}/${randomUUID()}.webp`;
  const { error } = await db.storage.from('product-images').upload(path, image, {
    contentType: 'image/webp', cacheControl: '31536000', upsert: false,
  });
  if (error) throw error;
  return db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
