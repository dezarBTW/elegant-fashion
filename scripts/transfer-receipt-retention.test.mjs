import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('transfer receipts queue for deletion only 30 days after every customer confirmation',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
   CREATE TABLE public.shop_orders(id uuid PRIMARY KEY,payment_method text,transfer_receipt_path text,delivery_confirmed_at timestamptz);
   CREATE TABLE public.seller_order_items(order_id uuid,confirmed_at timestamptz,confirmation_method text);
   CREATE TABLE public.storage_cleanup_queue(bucket text,path text);
   CREATE FUNCTION public.enqueue_storage_cleanup(bucket text,path text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.storage_cleanup_queue VALUES(bucket,path); END $$;
   INSERT INTO public.shop_orders VALUES
    ('11111111-1111-4111-8111-111111111111','bank_transfer','recent.png',now()-interval '29 days'),
    ('22222222-2222-4222-8222-222222222222','bank_transfer','eligible.png',now()-interval '31 days'),
    ('33333333-3333-4333-8333-333333333333','bank_transfer','partial.png',now()-interval '31 days'),
    ('44444444-4444-4444-8444-444444444444','bank_transfer','admin.png',now()-interval '31 days');
   INSERT INTO public.seller_order_items VALUES
    ('11111111-1111-4111-8111-111111111111',now()-interval '29 days','customer'),
    ('22222222-2222-4222-8222-222222222222',now()-interval '31 days','customer'),
    ('33333333-3333-4333-8333-333333333333',now()-interval '31 days','customer'),
    ('33333333-3333-4333-8333-333333333333',null,null),
    ('44444444-4444-4444-8444-444444444444',now()-interval '31 days','admin');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261110200000_transfer_receipt_retention.sql',import.meta.url),'utf8'));
  const count=await db.query('SELECT public.expire_transfer_receipts() AS count');assert.equal(count.rows[0].count,1);
  const queued=await db.query('SELECT bucket,path FROM public.storage_cleanup_queue');assert.deepEqual(queued.rows,[{bucket:'transfer-receipts',path:'eligible.png'}]);
  const remaining=await db.query('SELECT transfer_receipt_path FROM public.shop_orders WHERE id=$1',['22222222-2222-4222-8222-222222222222']);assert.equal(remaining.rows[0].transfer_receipt_path,null);
  assert.equal((await db.query('SELECT public.expire_transfer_receipts() AS count')).rows[0].count,0);
 }finally{await db.close();}
});
