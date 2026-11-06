import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('offline delivery is admin-only, immutable, and keeps the three-day refund boundary', async () => {
  const db = new PGlite();
  const admin='11111111-1111-4111-8111-111111111111', vendor='22222222-2222-4222-8222-222222222222', order='33333333-3333-4333-8333-333333333333';
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.users(id uuid PRIMARY KEY,is_admin boolean,is_active boolean);
      CREATE TABLE public.shop_orders(id uuid PRIMARY KEY,payment_status text,fulfillment_status text,customer_received_at timestamptz);
      CREATE TABLE public.seller_order_items(id uuid PRIMARY KEY,order_id uuid,product_id uuid,confirmed_at timestamptz,confirmed_by uuid,confirmation_method text,verification_note text,fulfilment text,payment_received_at timestamptz);
      CREATE TABLE public.refund_requests(order_id uuid,product_id uuid);
      INSERT INTO auth.users VALUES('${admin}'),('${vendor}');
      INSERT INTO public.users VALUES('${admin}',true,true),('${vendor}',false,true);
      INSERT INTO shop_orders VALUES('${order}','pending','new',null);
      INSERT INTO seller_order_items(id,order_id,product_id) VALUES('${order}','${order}','${vendor}');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261106173829_offline_seller_fulfilment.sql',import.meta.url),'utf8'));
    await db.exec(`CREATE TRIGGER refund_guard BEFORE INSERT ON refund_requests FOR EACH ROW EXECUTE FUNCTION enforce_refund_deadline()`);
    const confirm=(actor=admin,status='new')=>db.query('SELECT admin_confirm_order_delivery($1,$2,$3,$4) AS result',[actor,order,status,'Verified directly with the customer']);
    await assert.rejects(confirm(vendor),/Administrator/);
    await assert.rejects(confirm(),/Payment must/);
    await db.exec(`UPDATE shop_orders SET payment_status='paid'`);
    await assert.rejects(confirm(admin,'shipped'),/Order changed/);
    const first=(await confirm()).rows[0].result;
    assert.equal(first.changed,true);
    assert.equal(first.order.fulfillment_status,'completed');
    const again=(await confirm()).rows[0].result;
    assert.equal(again.changed,false);
    assert.equal(again.order.delivery_confirmed_at,first.order.delivery_confirmed_at);
    const item=(await db.query('SELECT * FROM seller_order_items')).rows[0];
    assert.ok(item.confirmed_at);assert.equal(item.payment_received_at,null);
    await db.exec(`INSERT INTO refund_requests VALUES('${order}','${vendor}')`);
    await db.exec(`UPDATE seller_order_items SET confirmed_at=now()-interval '3 days'`);
    await assert.rejects(db.exec(`INSERT INTO refund_requests VALUES('${order}','${vendor}')`),/within three days/);
    await assert.rejects(db.query(`SELECT seller_item_action($1,$2,'payment_fulfilled','')`,[admin,order]),/managed offline/);
    const privileges=await db.query(`SELECT has_function_privilege('service_role','seller_item_action(uuid,uuid,text,text)','execute') AS retired,has_function_privilege('authenticated','admin_confirm_order_delivery(uuid,uuid,text,text)','execute') AS client`);
    assert.deepEqual(privileges.rows[0],{retired:false,client:false});
    // Legacy orders without seller snapshots use the order-level confirmation.
    await db.exec('DELETE FROM seller_order_items');
    await db.exec(`INSERT INTO refund_requests VALUES('${order}','${vendor}')`);
    await db.exec(`UPDATE shop_orders SET delivery_confirmed_at=now()-interval '4 days'`);
    await assert.rejects(db.exec(`INSERT INTO refund_requests VALUES('${order}','${vendor}')`),/within three days/);
  } finally { await db.close(); }
});
