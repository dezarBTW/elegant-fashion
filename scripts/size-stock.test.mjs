import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {previewCheckoutCart} from '../src/lib/checkout.mjs';
const modulePath=process.env.PGLITE_MODULE_PATH;
const migration=await readFile(new URL('../supabase/migrations/20261021222045_size_stock_reservations.sql',import.meta.url),'utf8');
const sizes={S:0,M:0,L:4,XL:0,XXL:0};
test('checkout preview blocks quantities beyond current size availability',()=>{
 const p={id:'dress',name:'Dress',price:100,is_active:true,available_sizes:['L']};
 assert.equal(previewCheckoutCart([{id:'dress',size:'L',quantity:4}],[p],{dress:{L:4}}).ready,true);
 assert.equal(previewCheckoutCart([{id:'dress',size:'L',quantity:5}],[p],{dress:{L:4}}).ready,false);
 assert.equal(previewCheckoutCart([{id:'dress',size:'L',quantity:1}],[p],{dress:{L:0}}).ready,false);
});
test('per-size stock, atomic checkout reservations and once-only payment deduction',{skip:!modulePath&&'Set PGLITE_MODULE_PATH to exercise isolated SQL'},async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;
 CREATE TABLE users(id uuid primary key,is_admin boolean,is_active boolean);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$SELECT coalesce((select is_admin and is_active from public.users where id=auth.uid()),false)$$;
 CREATE TABLE products(id uuid primary key,name text not null,price numeric not null,category text,gender text,description text,image text,available_sizes text[],is_active boolean default true);
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;GRANT ALL ON public.products,public.users TO service_role;
 ALTER TABLE products ENABLE ROW LEVEL SECURITY;GRANT SELECT ON products TO anon,authenticated;CREATE POLICY catalog_read ON products FOR SELECT TO anon,authenticated USING(is_active);`);
 const snapshot=JSON.parse(await readFile(new URL('./fixtures/security-schema-before.json',import.meta.url),'utf8'));
 const q=v=>'"'+v.replaceAll('"','""')+'"';const cols=snapshot.columns.filter(c=>c.table==='shop_orders').map(c=>q(c.name)+' '+c.type+(c.default?' DEFAULT '+c.default:'')+(c.notnull?' NOT NULL':''));
 await db.exec(`CREATE TABLE shop_orders(${cols.join(',')});GRANT ALL ON shop_orders TO service_role;`);
 for(const c of snapshot.constraints.filter(c=>c.table==='shop_orders'&&c.type!=='f'))await db.exec(`ALTER TABLE shop_orders ADD CONSTRAINT ${q(c.name)} ${c.definition}`);
 await db.exec(migration);
 const product=randomUUID(),otherProduct=randomUUID();
 const details={name:'Isolated gown',price:100,category:'Dresses',gender:'female',description:'Stock test',image:null};
 const save=(id,quantities,revision)=>db.query('select admin_save_stock_product($1,$2,$3,$4)',[id,JSON.stringify(details),JSON.stringify(quantities),revision]);
 await save(product,sizes,null);await save(otherProduct,{...sizes,L:1},null);
 const limits=async(id=product)=>(await db.query('select * from get_size_purchase_limits($1)',[[id]])).rows[0].purchase_limits;
 const order=async(items=[{productId:product,size:'L',quantity:1}],id=randomUUID())=>{
  const total=items.reduce((n,i)=>n+i.quantity*10000,0);await db.query(`insert into shop_orders(id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,receipt_hash,request_fingerprint) values($1,'Test','test@example.invalid','08012345678','{"method":"pickup"}',$2,$3,0,$3,$4,$4)`,[id,JSON.stringify(items),total,'a'.repeat(64)]);return id;
 };
 await t.test('admin counts generate sizes; no inventory or totals are exposed to ordinary roles',async()=>{
  assert.deepEqual(await limits(),sizes);for(const role of ['anon','authenticated']){await db.exec('BEGIN;SET LOCAL ROLE '+role);try{try{assert.equal((await db.query('select quantities from product_size_stock')).rows.length,0);}catch(error){if(error.code!=='42501')throw error;}}finally{await db.exec('ROLLBACK');}}
 });
 await t.test('buyer can reserve all four Large units but cannot reserve a fifth',async()=>{
  const id=await order([{productId:product,size:'L',quantity:4}]);assert.equal((await limits()).L,0);
  await assert.rejects(order(),e=>e.code==='P0001');assert.equal((await db.query('select count(*)::int n from shop_orders')).rows[0].n,1);
  // Mismatched/review events retain the reservation for eventual reconciliation.
  await db.query("update shop_orders set payment_status='review' where id=$1",[id]);assert.equal((await limits()).L,0);
  await db.query("update shop_orders set payment_status='paid',paid_at=now(),paid_event_id='event',payment_id='payment' where id=$1",[id]);
  await db.query("update shop_orders set payment_status='paid' where id=$1",[id]);
  assert.equal((await db.query('select quantities from product_size_stock where product_id=$1',[product])).rows[0].quantities.L,0);
  assert.equal((await db.query("select count(*)::int n from shop_stock_reservations where status='sold'")).rows[0].n,1);
 });
 await t.test('admin restock is editable; stale edits and reductions below reservations are blocked',async()=>{
  let revision=(await db.query('select revision from product_size_stock where product_id=$1',[product])).rows[0].revision;
  await save(product,sizes,revision);await assert.rejects(save(product,sizes,revision),e=>e.code==='40001');
  await order([{productId:product,size:'L',quantity:2}]);revision=(await db.query('select revision from product_size_stock where product_id=$1',[product])).rows[0].revision;
  await assert.rejects(save(product,{...sizes,L:1},revision),e=>e.code==='P0001');assert.equal((await limits()).L,2);
  await assert.rejects(db.query('delete from products where id=$1',[product]),e=>e.code==='23514');
 });
 await t.test('multiple products roll back together when one size is unavailable',async()=>{
  const before=(await limits()).L;await assert.rejects(order([{productId:product,size:'L',quantity:1},{productId:otherProduct,size:'XL',quantity:1}]),e=>e.code==='P0001');assert.equal((await limits()).L,before);
 });
 await t.test('an authenticated admin can delete unreserved products without gaining stock-write access',async()=>{
  const spare=randomUUID(),admin='33333333-3333-4333-8333-333333333333';await save(spare,sizes,null);
  await db.query('insert into users values($1,true,true)',[admin]);await db.exec('GRANT DELETE ON products TO authenticated;CREATE POLICY admin_delete ON products FOR DELETE TO authenticated USING(public.is_admin_user());');
  await db.exec('BEGIN;SET LOCAL ROLE authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);assert.equal((await db.query('delete from products where id=$1 returning id',[spare])).rows.length,1);}finally{await db.exec('ROLLBACK');}
 });
 await t.test('1000 competing local order attempts cannot allocate more than four units',async()=>{
  await db.exec('TRUNCATE shop_orders CASCADE');const revision=(await db.query('select revision from product_size_stock where product_id=$1',[product])).rows[0].revision;await save(product,sizes,revision);
  const start=performance.now();const results=await Promise.allSettled(Array.from({length:1000},()=>order()));
  const passed=results.filter(r=>r.status==='fulfilled').length,rejected=results.filter(r=>r.status==='rejected');assert.equal(passed,4);assert.equal(rejected.length,996);assert.ok(rejected.every(r=>r.reason.code==='P0001'));
  assert.equal((await db.query("select sum(quantity)::int held from shop_stock_reservations where status='held'")).rows[0].held,4);
  assert.equal((await limits()).L,0);
  await writeFile('output/size-stock-contention-results.json',JSON.stringify({attempts:1000,reserved:passed,rejected:rejected.length,heldUnits:4,elapsedMs:Math.round(performance.now()-start),engine:'isolated PGlite PostgreSQL; query execution is serialized, not a hosted multi-connection benchmark'},null,2));
 });
 }finally{await db.close();}
});

