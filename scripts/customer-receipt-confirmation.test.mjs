import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { buildShippingConfirmationEmail, notifyShippingConfirmation } from '../src/lib/shippingEmails.mjs';

test('receipt confirmation starts the refund timer only after shipment',async()=>{
 const db=new PGlite();
 const customer='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',order='33333333-3333-4333-8333-333333333333',item='44444444-4444-4444-8444-444444444444';
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
   CREATE TABLE shop_orders(id uuid PRIMARY KEY,user_id uuid,payment_status text,delivery_confirmed_at timestamptz,delivery_verification_note text);
   CREATE TABLE seller_order_items(id uuid PRIMARY KEY,order_id uuid,fulfilment text,confirmed_at timestamptz,confirmed_by uuid,confirmation_method text);
   CREATE TABLE seller_order_events(item_id uuid,actor_id uuid,action text,note text);
   CREATE FUNCTION admin_confirm_order_delivery(uuid,uuid,text,text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
   GRANT EXECUTE ON FUNCTION admin_confirm_order_delivery(uuid,uuid,text,text) TO service_role;
   INSERT INTO shop_orders VALUES('${order}','${customer}','paid',null,null);
   INSERT INTO seller_order_items VALUES('${item}','${order}','new',null,null,null);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261110180000_customer_receipt_confirmation.sql',import.meta.url),'utf8'));
  await assert.rejects(db.query('SELECT customer_confirm_shipped_item($1,$2)',[customer,item]),/not shipped/);
  await assert.rejects(db.query('SELECT customer_confirm_shipped_item($1,$2)',[other,item]),/access denied/);
  await db.query(`UPDATE seller_order_items SET fulfilment='shipped' WHERE id=$1`,[item]);
  await db.query('SELECT customer_confirm_shipped_item($1,$2)',[customer,item]);
  const saved=await db.query('SELECT confirmed_at FROM seller_order_items WHERE id=$1',[item]);
  assert.ok(saved.rows[0].confirmed_at);
  assert.ok((await db.query('SELECT delivery_confirmed_at FROM shop_orders WHERE id=$1',[order])).rows[0].delivery_confirmed_at);
  await db.query('SELECT customer_confirm_shipped_item($1,$2)',[customer,item]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM seller_order_events')).rows[0].n,1);
 }finally{await db.close();}
});

test('shipped email asks the customer to confirm receipt before the deadline starts',()=>{
 const message=buildShippingConfirmationEmail({id:'order',customer_email:'customer@example.invalid',customer_name:'Ada'}, {id:'item',product_name:'Dress'});
 assert.match(message.html,/confirm receipt/i);
 assert.match(message.text,/three-day return\/refund period begins when you confirm receipt/i);
 assert.match(message.html,/\/account\/orders/);
});

test('shipping notification claims and sends a tracked customer email',async()=>{
 const claims=[];const sends=[];
 const db={rpc:async(name,args)=>{claims.push({name,args});return {data:{token:'lease',recipient:args.p_recipient,message:args.p_message},error:null};},from:()=>({update(){return this;},eq(){return this;},select(){return this;},maybeSingle:async()=>({data:{notification_key:'key'},error:null})})};
 const sent=await notifyShippingConfirmation(db,{id:'order',customer_email:'customer@example.invalid',customer_name:'Ada'},{id:'item',product_name:'Dress'},'shipped',{sendEmail:async message=>{sends.push(message);return true;}});
 assert.equal(sent,true);assert.equal(claims[0].name,'claim_order_email');assert.equal(claims[0].args.p_recipient,'customer@example.invalid');assert.equal(sends[0].idempotencyKey,'shipping-confirm/item/shipped');
});
