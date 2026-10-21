// At most four references; retain exact object-name checks after Storage search.
export async function verifyBespokeImages(db, bucket, paths) {
  if (!Array.isArray(paths) || paths.length > 4) throw new Error('Invalid reference images');
  const found = await Promise.all([...new Set(paths)].map(async path => {
    const name = path.split('/').pop();
    const { data, error } = await db.storage.from(bucket).list('requests', { limit: 100, search: name });
    if (error) throw new Error('Unable to verify reference images');
    return data?.some(file => file.name === name) === true;
  }));
  return found.every(Boolean);
}
