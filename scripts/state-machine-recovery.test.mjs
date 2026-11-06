import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createAuthRequestGate } from '../src/lib/authRequestGate.mjs';
import { bespokeReviewSchema } from '../src/lib/bespokeWorkflow.mjs';
import { reservationExpired, checkoutLifetimeMinutes } from '../src/lib/reservationExpiry.mjs';
import { sendTrackedOrderEmail } from '../src/lib/paidOrderNotifications.mjs';

const id='11111111-1111-4111-8111-111111111111';
const product='22222222-2222-4222-8222-222222222222';
async function database() {
  const db=new PGlite();
  try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.shop_orders(id uuid PRIMARY KEY,created_at timestamptz DEFAULT now(),
      reservation_dummy text,checkout_state text DEFAULT 'open' CONSTRAINT shop_orders_checkout_state_check CHECK(checkout_state IN ('creating','open','unknown')),
      payment_status text DEFAULT 'pending',stock_required boolean DEFAULT true,items jsonb DEFAULT '[]',emails_claimed_at timestamptz);
    CREATE TABLE public.product_size_stock(product_id uuid PRIMARY KEY,quantities jsonb,revision bigint DEFAULT 0);
    CREATE TABLE public.shop_stock_reservations(order_id uuid,product_id uuid,size text,quantity integer,
      status text DEFAULT 'held' CONSTRAINT shop_stock_reservations_status_check CHECK(status IN ('held','sold')),created_at timestamptz DEFAULT now());
    CREATE TABLE public.bespoke_requests(id uuid PRIMARY KEY,status text DEFAULT 'new');
    CREATE FUNCTION public.commit_order_size_stock() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
    CREATE TRIGGER commit_paid_size_stock BEFORE UPDATE OF payment_status ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.commit_order_size_stock();
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261106171124_state_machine_recovery_guards.sql',import.meta.url),'utf8'));
  await db.query(`INSERT INTO public.shop_orders(id)VALUES($1)`,[id]);
  await db.query(`INSERT INTO public.product_size_stock(product_id,quantities)VALUES($1,'{"S":2}')`,[product]);
  await db.query(`INSERT INTO public.shop_stock_reservations(order_id,product_id,size,quantity)VALUES($1,$2,'S',1)`,[id,product]);
  return db;
  } catch (error) { await db.close(); throw error; }
}

test('expiry releases availability once; late payment becomes review without selling stock',async()=>{
  const db=await database();
  try {
    const deadline=await db.query('SELECT expires_at-created_at AS lifetime FROM shop_stock_reservations');
    assert.match(String(deadline.rows[0].lifetime),/00:30:00/);
    await db.exec(`UPDATE shop_orders SET reservation_expires_at=now()-interval '1 second'; UPDATE shop_stock_reservations SET expires_at=now()-interval '1 second';`);
    assert.equal((await db.query('SELECT release_expired_stock_reservations() AS n')).rows[0].n,1);
    assert.equal((await db.query('SELECT release_expired_stock_reservations() AS n')).rows[0].n,0);
    await db.exec(`UPDATE shop_orders SET payment_status='paid',email_tracking_started_at=now(),emails_claimed_at=now()`);
    const order=(await db.query('SELECT * FROM shop_orders')).rows[0];
    assert.equal(order.payment_status,'review');assert.equal(order.payment_review_reason,'reservation_expired');
    assert.equal(order.email_tracking_started_at,null);
    assert.equal((await db.query('SELECT quantities FROM product_size_stock')).rows[0].quantities.S,2);
    assert.equal((await db.query('SELECT status FROM shop_stock_reservations')).rows[0].status,'released');
  } finally {await db.close();}
});

test('unexpired paid order sells units exactly once and expiry cleanup leaves sold units alone',async()=>{
  const db=await database();
  try {
    await db.exec(`UPDATE shop_orders SET payment_status='paid'; UPDATE shop_orders SET payment_status='paid';`);
    assert.equal((await db.query('SELECT quantities FROM product_size_stock')).rows[0].quantities.S,1);
    assert.equal((await db.query('SELECT status FROM shop_stock_reservations')).rows[0].status,'sold');
    await db.exec(`UPDATE shop_stock_reservations SET expires_at=now()-interval '1 hour'`);
    assert.equal((await db.query('SELECT release_expired_stock_reservations() AS n')).rows[0].n,0);
  } finally {await db.close();}
});

test('email claims serialize, sent records cannot resend, failed attempts retry with immutable payload',async()=>{
  const db=await database();
  try {
    await db.exec(`UPDATE shop_orders SET payment_status='paid',email_tracking_started_at=now()`);
    const claim=async()=> (await db.query(`SELECT claim_order_email($1,'mail-key','a@example.invalid','{"subject":"Original"}') AS result`,[id])).rows[0].result;
    const first=await claim();assert.ok(first.token);
    assert.equal((await claim()).busy,true);
    await db.query(`UPDATE order_email_deliveries SET email_status='failed',lease_token=null,lease_until=null WHERE notification_key='mail-key'`);
    const retry=(await db.query(`SELECT claim_order_email($1,'mail-key','different@example.invalid','{"subject":"Changed"}') AS result`,[id])).rows[0].result;
    assert.equal(retry.recipient,'a@example.invalid');assert.equal(retry.message.subject,'Original');
    await db.exec(`UPDATE order_email_deliveries SET email_status='sent'`);
    assert.equal((await claim()).sent,true);
    await db.exec(`UPDATE order_email_deliveries SET email_status='failed',first_attempt_at=now()-interval '24 hours'`);
    assert.equal((await claim()).blocked,true);
    assert.equal((await db.query(`SELECT has_table_privilege('authenticated','order_email_deliveries','SELECT') AS allowed`)).rows[0].allowed,false);
  } finally {await db.close();}
});

test('bespoke database guard and compare-and-set prevent backwards, terminal and stale updates',async()=>{
  const db=await database();
  try {
    await db.query(`INSERT INTO bespoke_requests(id)VALUES($1)`,[id]);
    await db.exec(`UPDATE bespoke_requests SET status='contacted' WHERE status='new'`);
    assert.equal((await db.query(`UPDATE bespoke_requests SET status='cancelled' WHERE status='new' RETURNING id`)).rows.length,0);
    await assert.rejects(db.exec(`UPDATE bespoke_requests SET status='new'`),/Invalid bespoke/);
    await db.exec(`UPDATE bespoke_requests SET status='quoted'; UPDATE bespoke_requests SET status='confirmed'; UPDATE bespoke_requests SET status='completed'`);
    await assert.rejects(db.exec(`UPDATE bespoke_requests SET status='cancelled'`),/Invalid bespoke/);
    assert.equal((await db.query(`SELECT has_table_privilege('authenticated','bespoke_requests','UPDATE') AS allowed`)).rows[0].allowed,false);
  } finally {await db.close();}
});

test('auth generations discard previous identities, sign-outs, and same-account older requests',()=>{
  const gate=createAuthRequestGate();
  const first=gate.begin('admin');const next=gate.begin('vendor');
  assert.equal(gate.isCurrent(first),false);assert.equal(gate.isCurrent(next),true);
  gate.invalidate();assert.equal(gate.isCurrent(next),false);
  const old=gate.begin('vendor');const fresh=gate.begin('vendor');
  assert.equal(gate.isCurrent(old),false);assert.equal(gate.isCurrent(fresh),true);
});

test('API bespoke contract rejects arbitrary jumps and expiry is closed at the exact deadline',()=>{
  assert.equal(bespokeReviewSchema.safeParse({id,expectedStatus:'new',status:'completed'}).success,false);
  assert.equal(bespokeReviewSchema.safeParse({id,expectedStatus:'new',status:'contacted'}).success,true);
  assert.equal(reservationExpired({reservation_expires_at:'2026-01-01T00:00:00Z'},Date.parse('2026-01-01T00:00:00Z')),true);
  assert.equal(checkoutLifetimeMinutes('2026-01-01T00:30:00Z',Date.parse('2026-01-01T00:00:01Z')),29);
  assert.throws(()=>checkoutLifetimeMinutes('2026-01-01T00:00:00Z',Date.parse('2026-01-01T00:00:01Z')));
});

test('failed sends persist failure and retries reuse the provider key',async()=>{
  const updates=[];const keys=[];let calls=0;
  const db={rpc:async()=>({data:{token:'lease',recipient:'a@example.invalid',message:{subject:'Saved',html:'Hello'}}}),
    from:()=>({update(value){updates.push(value);return this;},eq(){return this;},select(){return this;},maybeSingle:async()=>({data:{notification_key:'key'},error:null})})};
  const message={idempotencyKey:'key',to:'a@example.invalid',subject:'Saved'};
  const sendEmail=async input=>{keys.push(input.idempotencyKey);return ++calls>1;};
  assert.equal(await sendTrackedOrderEmail(db,id,message,{sendEmail}),false);
  assert.equal(updates[0].email_status,'failed');
  assert.equal(await sendTrackedOrderEmail(db,id,message,{sendEmail}),true);
  assert.equal(updates[1].email_status,'sent');assert.deepEqual(keys,['key','key']);
});
