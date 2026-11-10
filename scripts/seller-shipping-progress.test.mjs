import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('vendors ship direct items; administrators dispatch shop drop offs',async()=>{
 const db=new PGlite();
 const vendor='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222',admin='33333333-3333-4333-8333-333333333333';
 const direct='44444444-4444-4444-8444-444444444444',combined='55555555-5555-4555-8555-555555555555';
 const directItem='66666666-6666-4666-8666-666666666666',firstDrop='77777777-7777-4777-8777-777777777777',secondDrop='88888888-8888-4888-8888-888888888888';
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
   CREATE TABLE public.users(id uuid PRIMARY KEY,is_admin boolean DEFAULT false,is_vendor boolean DEFAULT false,is_active boolean DEFAULT true);
   CREATE TABLE public.shop_orders(id uuid PRIMARY KEY,payment_status text,delivery jsonb,fulfillment_status text DEFAULT 'new');
   CREATE TABLE public.seller_order_items(id uuid PRIMARY KEY,order_id uuid,seller_id uuid,seller_kind text,fulfilment text DEFAULT 'new',shipped_at timestamptz);
   CREATE TABLE public.seller_order_events(id uuid DEFAULT gen_random_uuid(),item_id uuid,actor_id uuid,action text,note text);
   INSERT INTO public.users VALUES('${vendor}',false,true,true),('${second}',false,true,true),('${admin}',true,false,true);
   INSERT INTO public.shop_orders VALUES('${direct}','paid','{"method":"outside_yenagoa"}','new'),('${combined}','paid','{"method":"outside_yenagoa"}','new');
   INSERT INTO public.seller_order_items VALUES('${directItem}','${direct}','${vendor}','vendor','new',null),('${firstDrop}','${combined}','${vendor}','vendor','new',null),('${secondDrop}','${combined}','${second}','vendor','new',null);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261110153000_seller_shipping_progress.sql',import.meta.url),'utf8'));
  await db.query('SELECT public.set_seller_shipping_progress($1,$2,$3,$4)',[vendor,directItem,'new','ready']);
  await db.query('SELECT public.set_seller_shipping_progress($1,$2,$3,$4)',[vendor,directItem,'ready','shipped']);
  assert.equal((await db.query('SELECT fulfilment FROM seller_order_items WHERE id=$1',[directItem])).rows[0].fulfilment,'shipped');
  await assert.rejects(db.query('SELECT public.set_seller_shipping_progress($1,$2,$3,$4)',[vendor,firstDrop,'new','ready']),/Shop drop offs/);
  await db.query('SELECT public.set_shop_shipping_progress($1,$2,$3,$4,$5)',[admin,combined,firstDrop,'new','at_shop']);
  await assert.rejects(db.query('SELECT public.set_shop_shipping_progress($1,$2,$3,$4,$5)',[admin,combined,firstDrop,'at_shop','shipped']),/Wait for all vendor drop offs/);
  await db.query('SELECT public.set_shop_shipping_progress($1,$2,$3,$4,$5)',[admin,combined,secondDrop,'new','at_shop']);
  await db.query('SELECT public.set_shop_shipping_progress($1,$2,$3,$4,$5)',[admin,combined,firstDrop,'at_shop','shipped']);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM seller_order_items WHERE order_id=$1 AND fulfilment=$2',[combined,'shipped'])).rows[0].n,2);
 }finally{await db.close();}
});
