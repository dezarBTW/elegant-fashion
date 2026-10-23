import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutDatabase } from '@/lib/checkoutServer';
import { readAccountBody, checkRequestOrigin } from '@/lib/accountServer';
import { requireOrderAdmin, OrderRequestError } from '@/lib/orderManagement.mjs';
import { removeQueuedMedia } from '@/lib/storageCleanup.mjs';
import { studentReviewSchema } from '@/lib/registration.mjs';

export const runtime = 'nodejs';
const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('student'), id: studentReviewSchema.shape.id }).strict(),
  z.object({ kind: z.enum(['product', 'bespoke']), id: z.uuid() }).strict(),
]);
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const failure = error => json({ error: error instanceof OrderRequestError ? error.message : 'Unable to delete this record. Please try again.' }, error instanceof OrderRequestError ? error.status : 503);

export async function DELETE(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, schema);
    // This transaction captures references and queues cleanup before committing.
    // Existing stock-reservation guards run before any files can be removed.
    const result = await db.rpc('admin_delete_with_media', { p_kind: input.kind, p_id: String(input.id) });
    if (result.error?.code === '23514') throw new OrderRequestError('This product has a pending payment reservation. Resolve that payment before deleting it.', 409);
    if (result.error) throw result.error;
    let cleanup;
    try { cleanup = await removeQueuedMedia(db, result.data); }
    catch { cleanup = { failed: 1 }; }
    return json({ deleted: true, cleanupPending: cleanup.failed > 0,
      warning: cleanup.failed ? 'The record was deleted, but some images could not be removed yet. Automatic cleanup will retry; you can also retry image cleanup now.' : null });
  } catch (error) { return failure(error); }
}

export async function POST(request) {
  try {
    checkRequestOrigin(request);
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const cleanup = await removeQueuedMedia(db);
    if (cleanup.failed) throw new OrderRequestError('Image cleanup is temporarily unavailable. The files remain queued for automatic retry.', 503);
    return json({ cleaned: true });
  } catch (error) { return failure(error); }
}
