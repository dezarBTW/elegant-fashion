import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { recommendProducts } from '../src/lib/products.mjs';
const modulePath=process.env.PGLITE_MODULE_PATH;
const migration=await readFile(new URL('../supabase/migrations/20261021232139_remaining_query_optimizations.sql',import.meta.url),'utf8');
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222',admin='33333333-3333-4333-8333-333333333333',inactive='44444444-4444-4444-8444-444444444444';
test('remaining performance RPCs preserve permissions and bounded results', {skip:!modulePath&&'Set PGLITE_MODULE_PATH'}, async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE users(id uuid PRIMARY KEY,is_admin boolean,is_active boolean);
 CREATE FUNCTION is_admin_user() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT coalesce((SELECT is_admin AND is_active FROM public.users WHERE id=auth.uid()),false)$$;
 CREATE TABLE students(id bigint PRIMARY KEY,created_at timestamptz,user_id uuid,status text,accepted boolean,name text,surname text,first_name text,middle_name text,email text,telephone text);
 CREATE TABLE bespoke_requests(id uuid PRIMARY KEY,created_at timestamptz,name text,phone text,description text,status text,image_paths text[]);
 CREATE TABLE products(id uuid PRIMARY KEY,slug text,name text,description text,category text,price numeric,sale_price numeric,image text,is_featured boolean,is_active boolean,available_sizes text[]);
 CREATE TABLE shop_orders(id uuid PRIMARY KEY,user_id uuid,customer_email text);
 CREATE TABLE product_size_stock(product_id uuid PRIMARY KEY,quantities jsonb);
 CREATE TABLE shop_stock_reservations(product_id uuid,size text,quantity integer,status text);
 ALTER TABLE product_size_stock ENABLE ROW LEVEL SECURITY;ALTER TABLE shop_stock_reservations ENABLE ROW LEVEL SECURITY;
 CREATE TABLE product_complaints(order_id uuid,reviewed_by uuid);CREATE TABLE refund_requests(order_id uuid,reviewed_by uuid);
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 GRANT SELECT ON products TO anon,authenticated;GRANT SELECT ON students,bespoke_requests,users TO authenticated;
 GRANT ALL ON ALL TABLES IN SCHEMA public,auth TO service_role;
 ALTER TABLE products ENABLE ROW LEVEL SECURITY;ALTER TABLE students ENABLE ROW LEVEL SECURITY;ALTER TABLE bespoke_requests ENABLE ROW LEVEL SECURITY;
 CREATE POLICY products_read ON products FOR SELECT USING(is_active OR (SELECT is_admin_user()));
 CREATE POLICY students_read ON students FOR SELECT TO authenticated USING((SELECT is_admin_user()));
 CREATE POLICY bespoke_read ON bespoke_requests FOR SELECT TO authenticated USING((SELECT is_admin_user()));`);
 for(const [id,isAdmin,active]of [[alice,false,true],[bob,false,true],[admin,true,true],[inactive,true,false]]){
  await db.query('INSERT INTO users VALUES($1,$2,$3)',[id,isAdmin,active]);await db.query("INSERT INTO auth.users VALUES($1,$2,now(),false)",[id,id===alice?'alice@example.invalid':id+'@example.invalid']);
 }
 await db.exec(`INSERT INTO students SELECT n,'2026-01-01','${alice}',CASE n%4 WHEN 0 THEN NULL WHEN 1 THEN 'pending' WHEN 2 THEN 'accepted' ELSE 'declined' END,n%4=0,'Legacy','Student '||n,'Ada','Middle','student'||n||'@example.invalid','08000000000' FROM generate_series(1,1057)n;
 INSERT INTO bespoke_requests SELECT md5(n::text)::uuid,'2026-01-01','Client '||n,'08000000000','Cotton tailoring',CASE WHEN n%2=0 THEN 'new' ELSE 'completed' END,ARRAY['requests/'||n||'.jpg'] FROM generate_series(1,1010)n;
 INSERT INTO products SELECT md5(n::text)::uuid,'product-'||n,CASE WHEN n=149 THEN 'blue silk gown' ELSE 'Cotton piece '||n END,CASE WHEN n=149 THEN 'blue silk gown' ELSE 'relaxed cotton' END,CASE WHEN n%7=0 THEN 'Skirts' WHEN n%4=0 THEN ' dresses ' ELSE 'Dresses' END,10000+n*10,NULL,NULL,n%5=0,n%15<>0,CASE WHEN n%13=0 THEN '{}'::text[] ELSE ARRAY['L'] END FROM generate_series(1,150)n;
 INSERT INTO products VALUES(md5('source')::uuid,'source','blue silk gown','blue silk gown','Dresses',11500,NULL,NULL,false,true,ARRAY['L']);
 INSERT INTO shop_orders VALUES(md5('legacy')::uuid,NULL,'alice@example.invalid'),(md5('other')::uuid,NULL,'other@example.invalid'),(md5('assigned')::uuid,'${bob}','alice@example.invalid');`);
 await db.exec(migration);
 const as=async(role,user,sql,params=[])=>{await db.exec('BEGIN');try{await db.exec('SET LOCAL ROLE '+role);await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[user||'']);return await db.query(sql,params);}finally{await db.exec('ROLLBACK');}};
 const list=async(kind,page=1,status='all',search='')=>(await as('authenticated',admin,'SELECT get_admin_list_page($1,$2,$3,$4) result',[kind,page,status,search])).rows[0].result;
 await t.test('students use 25-item pages, preserve total counts and reach beyond 1,000',async()=>{
  const seen=new Set();for(let page=1;page<=43;page++){const result=await list('students',page);assert.equal(result.pageSize,25);assert.equal(result.total,1057);for(const row of result.rows){assert.ok(!seen.has(row.id));seen.add(row.id);}}
  assert.equal(seen.size,1057);assert.equal((await list('students',43)).rows.length,7);
  const pending=await list('students',1,'pending');assert.equal(pending.total,265);assert.equal(pending.counts.all,1057);
  const search=await list('students',1,'all','Student 1057');assert.equal(search.total,1);assert.equal(search.rows[0].id,1057);
 });
 await t.test('bespoke uses 15-item pages and only returns photo paths for that page',async()=>{
  const result=await list('bespoke',68);assert.equal(result.rows.length,5);assert.equal(result.total,1010);assert.equal(result.pageSize,15);
  assert.equal((await list('bespoke',1,'new')).total,505);assert.equal((await list('bespoke',1,'all','Client 1010')).total,1);
  assert.equal((await list('bespoke',100000)).page,68);assert.equal((await list('students',1,'all','%_')).total,0);
 });
 await t.test('one dashboard RPC returns accurate aggregate counts',async()=>{
  const r=(await as('authenticated',admin,'SELECT get_admin_overview() result')).rows[0].result;
  assert.deepEqual(r,{products:151,pendingStudents:265,acceptedStudents:528,newBespoke:505,totalBespoke:1010});
 });
 await t.test('recommendations match similarity ranking across the entire category, return six and hide private fields',async()=>{
  const source=(await db.query("SELECT * FROM products WHERE slug='source'")).rows[0];
  const candidates=(await db.query('SELECT * FROM products')).rows;
  const rows=(await as('anon',null,'SELECT get_similar_products($1) result',[source.id])).rows[0].result;
  assert.deepEqual(rows.map(row=>row.id),recommendProducts(source,candidates).map(row=>row.id));assert.equal(rows.length,6);assert.equal(rows[0].slug,'product-149');assert.ok(!('description'in rows[0]));
 });
 await t.test('customer, guest and inactive admin cannot read admin pages, dashboard or claim RPC',async()=>{
  for(const [role,user]of [['anon',null],['authenticated',alice],['authenticated',inactive]]){
   for(const sql of ["SELECT get_admin_list_page('students')",'SELECT get_admin_overview()',`SELECT link_legacy_account_orders('${alice}','alice@example.invalid')`])await assert.rejects(as(role,user,sql),e=>e.code==='42501');
  }
  await assert.rejects(list('students',0),e=>e.code==='22023');await assert.rejects(list('bespoke',1,'accepted'),e=>e.code==='22023');
 });
 await t.test('batched reservation totals preserve the private capped purchase limits',async()=>{
  await db.exec(`INSERT INTO product_size_stock VALUES(md5('1')::uuid,'{"S":0,"M":0,"L":5,"XL":30,"XXL":0}');
  UPDATE products SET available_sizes=ARRAY['L','XL'] WHERE id=md5('1')::uuid;
  INSERT INTO shop_stock_reservations VALUES(md5('1')::uuid,'L',2,'held'),(md5('1')::uuid,'L',1,'sold');`);
  const id=(await db.query("SELECT md5('1')::uuid id")).rows[0].id;
  const rows=(await as('anon',null,'SELECT * FROM get_size_purchase_limits($1)',[[id]])).rows;
  assert.deepEqual(rows,[{product_id:id,purchase_limits:{S:0,M:0,L:3,XL:10,XXL:0}}]);
  assert.equal((await as('anon',null,'SELECT * FROM get_size_purchase_limits(NULL)')).rows.length,0);
  await assert.rejects(as('anon',null,'SELECT * FROM product_size_stock'),e=>e.code==='42501');
 });
 await t.test('legacy order linking is once per verified account/email, preserves ownership and rejects forged emails',async()=>{
  const run=()=>db.query('SELECT link_legacy_account_orders($1,$2) n',[alice,'alice@example.invalid']);
  assert.equal((await run()).rows[0].n,1);assert.equal((await run()).rows[0].n,0);
  assert.equal((await db.query("SELECT user_id FROM shop_orders WHERE id=md5('assigned')::uuid")).rows[0].user_id,bob);
  assert.equal((await db.query("SELECT user_id FROM shop_orders WHERE id=md5('other')::uuid")).rows[0].user_id,null);
  await assert.rejects(db.query('SELECT link_legacy_account_orders($1,$2)',[alice,'other@example.invalid']),e=>e.code==='42501');
  await db.query('UPDATE auth.users SET email_confirmed_at=NULL WHERE id=$1',[alice]);await assert.rejects(run(),e=>e.code==='42501');
  assert.equal((await db.query('SELECT count(*)::int n FROM account_order_claims')).rows[0].n,1);
 });
 }finally{await db.close();}
});
