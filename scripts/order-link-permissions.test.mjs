import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath=process.env.PGLITE_MODULE_PATH;
const fix=await readFile(new URL('../supabase/migrations/20261022115614_fix_legacy_order_link_permissions.sql',import.meta.url),'utf8');
const original=await readFile(new URL('../supabase/migrations/20261021232139_remaining_query_optimizations.sql',import.meta.url),'utf8');
const originalFunction=original.match(/CREATE FUNCTION public\.link_legacy_account_orders[\s\S]*?GRANT EXECUTE ON FUNCTION public\.link_legacy_account_orders\(uuid,text\) TO service_role;/)?.[0];
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
test('order linking works with hosted Supabase service-role permissions without widening Auth access',{skip:!modulePath&&'Set PGLITE_MODULE_PATH'},async()=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,is_anonymous boolean);
  CREATE TABLE public.users(id uuid PRIMARY KEY,is_active boolean);
  CREATE TABLE shop_orders(id integer PRIMARY KEY,user_id uuid,customer_email text);
  CREATE TABLE account_order_claims(user_id uuid REFERENCES auth.users(id),verified_email text,PRIMARY KEY(user_id,verified_email));
  ALTER TABLE account_order_claims ENABLE ROW LEVEL SECURITY;
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  INSERT INTO auth.users VALUES('${alice}','alice@example.invalid',now(),false),('${bob}','bob@example.invalid',now(),false);
  INSERT INTO public.users VALUES('${alice}',true),('${bob}',false);
  INSERT INTO shop_orders VALUES(1,NULL,'alice@example.invalid'),(2,'${bob}','alice@example.invalid'),(3,NULL,'other@example.invalid');`);
  const call=async(role,user=alice,email='alice@example.invalid')=>{
   await db.exec('BEGIN');try{await db.exec('SET LOCAL ROLE '+role);return await db.query('SELECT link_legacy_account_orders($1,$2) n',[user,email]);}finally{await db.exec('ROLLBACK');}
  };
  await db.exec(originalFunction);
  await assert.rejects(call('service_role'),e=>e.code==='42501');
  await db.exec(fix);
  assert.equal((await call('service_role')).rows[0].n,1);
  await db.exec('BEGIN;SET LOCAL ROLE service_role');
  try{
   assert.equal((await db.query('SELECT link_legacy_account_orders($1,$2) n',[alice,'alice@example.invalid'])).rows[0].n,1);
   assert.equal((await db.query('SELECT link_legacy_account_orders($1,$2) n',[alice,'alice@example.invalid'])).rows[0].n,0);
   assert.equal((await db.query('SELECT user_id FROM shop_orders WHERE id=2')).rows[0].user_id,bob);
   assert.equal((await db.query('SELECT user_id FROM shop_orders WHERE id=3')).rows[0].user_id,null);
  }finally{await db.exec('ROLLBACK');}
  for(const role of['anon','authenticated'])await assert.rejects(call(role),e=>e.code==='42501');
  await assert.rejects(call('service_role',bob,'bob@example.invalid'),e=>e.code==='42501');
  await assert.rejects(call('service_role',alice,'invalid'),e=>e.code==='42501');
  const privileges=(await db.query("SELECT has_table_privilege('service_role','auth.users','SELECT') auth_read,(SELECT prosecdef FROM pg_proc WHERE oid='link_legacy_account_orders(uuid,text)'::regprocedure) definer")).rows[0];
  assert.deepEqual(privileges,{auth_read:false,definer:false});
 }finally{await db.close();}
});
