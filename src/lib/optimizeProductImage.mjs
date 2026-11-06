import sharp from 'sharp';
import { hasImageSignature } from './imageSignature.mjs';
import { OrderRequestError } from './orderManagement.mjs';

// Decode and re-encode before Storage receives the file. Do not trust MIME alone.
export async function optimizeProductImage(file) {
  if (!(file instanceof File) || file.size < 12 || file.size > 4000000) {
    throw new OrderRequestError('Choose an image under 4 MB.', 400);
  }
  const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const extension = file.name.split('.').pop().toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!types[extension] || file.type !== types[extension] || !hasImageSignature(bytes, file.name)) {
    throw new OrderRequestError('Choose a valid JPEG, PNG or WebP image.', 400);
  }
  try {
    const image = sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' });
    const metadata = await image.metadata();
    if ((metadata.pages || 1) > 1) throw new Error('Animated images are not supported');
    return await image.rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90, effort: 4 }).toBuffer();
  } catch {
    throw new OrderRequestError('This image could not be processed. Choose a valid photo under 40 megapixels.', 400);
  }
}
