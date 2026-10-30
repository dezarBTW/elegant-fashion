import { hasImageSignature } from './imageSignature.mjs';

// At most four references; verify stored bytes before an image can be
// attached to an admin email or included in a customer request.
export async function verifyBespokeImages(db, bucket, paths) {
  if (!Array.isArray(paths) || paths.length > 4) throw new Error('Invalid reference images');
  const found = await Promise.all([...new Set(paths)].map(async path => {
    const name = path.split('/').pop();
    const { data, error } = await db.storage.from(bucket).list('requests', { limit: 100, search: name });
    if (error) throw new Error('Unable to verify reference images');
    const file = data?.find(entry => entry.name === name);
    if (!file || Number(file.metadata?.size) <= 0 || Number(file.metadata.size) > 5 * 1024 * 1024) return false;
    const { data: image, error: downloadError } = await db.storage.from(bucket).download(path);
    if (downloadError) throw new Error('Unable to verify reference images');
    if (!image || image.size <= 0 || image.size > 5 * 1024 * 1024) return false;
    return hasImageSignature(new Uint8Array(await image.arrayBuffer()), name);
  }));
  return found.every(Boolean);
}
