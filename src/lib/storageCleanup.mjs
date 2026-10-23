// Only database-triggered cleanup entries may delete objects. Never accept a
// browser-supplied storage path. Keep failures queued for the scheduled retry.
export async function removeQueuedMedia(db, candidates = null) {
  let query = db.from('storage_cleanup_queue').select('id,bucket,path').order('id').limit(200);
  if (candidates) {
    if (!candidates.length) return { removed: 0, failed: 0 };
    query = query.in('path', [...new Set(candidates.map(item => item.path))]);
  }
  const { data, error } = await query;
  if (error) return { removed: 0, failed: 1 };
  let removed = 0, failed = 0;
  for (const row of data || []) {
    if (candidates && !candidates.some(item => item.bucket === row.bucket && item.path === row.path)) continue;
    const check = await db.rpc('storage_path_in_use', { p_bucket: row.bucket, p_path: row.path });
    if (check.error) { failed++; continue; }
    if (check.data) continue; // Another record still owns this image.
    try {
      const result = await db.storage.from(row.bucket).remove([row.path]);
      if (result.error) { failed++; continue; }
      const cleared = await db.from('storage_cleanup_queue').delete().eq('id', row.id);
      if (cleared.error) failed++; else removed++;
    } catch { failed++; }
  }
  return { removed, failed };
}
