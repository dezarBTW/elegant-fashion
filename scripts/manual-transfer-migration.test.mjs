import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('manual transfer migration runs locally and guards approval', async () => {
 const db=new PGlite();
 try{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   CREATE TABLE public.users(id uuid PRIMARY KEY,is_admin boolean,is_active boolean);
   CREATE TABLE public.shop_orders(id uuid PRIMARY KEY,payment_status text DEFAULT 'pending',payment_review_reason text,paid_at timestamptz,payment_id text,paid_event_id text,emails_claimed_at timestamptz,email_tracking_started_at timestamptz,reservation_expires_at timestamptz,stock_required boolean DEFAULT false,items jsonb DEFAULT '[]');
   CREATE TABLE public.shop_stock_reservations(order_id uuid,expires_at timestamptz,status text DEFAULT 'held');`);
  const migration=await readFile(new URL('../supabase/migrations/20261110120000_manual_transfer_payments.sql',import.meta.url),'utf8');
  await db.exec(migration);
  const bucket=await db.query(`SELECT public,file_size_limit FROM storage.buckets WHERE id='transfer-receipts'`);
  assert.equal(bucket.rows[0].public,false);assert.equal(Number(bucket.rows[0].file_size_limit),5242880);
  await db.exec(`INSERT INTO public.users VALUES ('11111111-1111-4111-8111-111111111111',true,true);
   INSERT INTO public.shop_orders(id,payment_method,reservation_expires_at,transfer_receipt_path,transfer_submitted_at) VALUES ('22222222-2222-4222-8222-222222222222','bank_transfer',now()+interval '48 hours','receipt.png',now());`);
  const paid=await db.query(`SELECT payment_status,payment_id FROM public.approve_transfer_order('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111')`);
  assert.equal(paid.rows[0].payment_status,'paid');assert.match(paid.rows[0].payment_id,/^transfer:/);
  await assert.rejects(db.query(`SELECT public.approve_transfer_order('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111')`),/not awaiting transfer approval/);
 }finally{await db.close();}
});
