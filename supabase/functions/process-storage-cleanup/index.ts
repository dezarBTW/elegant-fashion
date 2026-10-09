import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Removes storage files that were queued by database triggers because no row
// references them any more. Idempotent: it only deletes what is in the queue.
const BATCH_SIZE = 200;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: rows, error } = await supabase
    .from("storage_cleanup_queue")
    .select("id, bucket, path")
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("Could not read cleanup queue:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return Response.json({ removed: 0, failed: 0 });
  }

  const byBucket = new Map<string, { id: number; path: string }[]>();
  for (const row of rows) {
    const list = byBucket.get(row.bucket) ?? [];
    list.push({ id: row.id, path: row.path });
    byBucket.set(row.bucket, list);
  }

  let removed = 0;
  let failed = 0;

  for (const [bucket, items] of byBucket) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(items.map((item) => item.path));

    if (removeError) {
      // Keep the rows in the queue so the next run retries them.
      console.error(`Could not remove files from ${bucket}:`, removeError.message);
      failed += items.length;
      continue;
    }

    const { error: deleteError } = await supabase
      .from("storage_cleanup_queue")
      .delete()
      .in("id", items.map((item) => item.id));

    if (deleteError) {
      console.error("Files removed but queue rows were not cleared:", deleteError.message);
      failed += items.length;
    } else {
      removed += items.length;
    }
  }

  return Response.json({ removed, failed });
});
