import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { removeQueuedMedia } from '../src/lib/storageCleanup.mjs';

test('cleanup deletes only queued, unreferenced files and retains failed attempts', async () => {
  const rows = [{id:1,bucket:'product-images',path:'deleted.jpg'},{id:2,bucket:'product-images',path:'shared.jpg'},{id:3,bucket:'student-passports',path:'failed.jpg'}];
  const removed=[],cleared=[];
  const db={from:()=>({select(){return this;},order(){return this;},limit(){return this;},in(){return this;},then(resolve){resolve({data:rows});},delete(){return this;},eq:async(_key,id)=>{cleared.push(id);return {};}}),
    rpc:async(_name,args)=>({data:args.p_path==='shared.jpg'}),storage:{from:bucket=>({remove:async paths=>{removed.push([bucket,...paths]);return {error:paths[0]==='failed.jpg'?{}:null};}})}};
  assert.deepEqual(await removeQueuedMedia(db),{removed:1,failed:1});
  assert.deepEqual(cleared,[1]);assert.deepEqual(removed,[['product-images','deleted.jpg'],['student-passports','failed.jpg']]);
  removed.length=0;cleared.length=0;
  assert.deepEqual(await removeQueuedMedia(db,[{bucket:'product-images',path:'deleted.jpg'}]),{removed:1,failed:0});
  assert.equal(removed.length,1);
  assert.deepEqual(await removeQueuedMedia(db,[]),{removed:0,failed:0});
  db.rpc=async()=>({error:{message:'offline'}});
  assert.deepEqual(await removeQueuedMedia(db),{removed:0,failed:3});
});

test('actual deletion triggers queue all media, protect shared files and roll back reserved products', {skip:!process.env.PGLITE_MODULE_PATH}, async()=>{
  const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE_PATH).href),db=new PGlite();
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  try {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE products(id uuid PRIMARY KEY,image text);
    CREATE TABLE product_images(id int,product_id uuid REFERENCES products(id) ON DELETE CASCADE,url text);
    CREATE TABLE categories(image_url text);CREATE TABLE students(id bigint PRIMARY KEY,passport_photo text);
    CREATE TABLE bespoke_requests(id uuid PRIMARY KEY,image_paths text[]);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
    const old=await readFile(new URL('../supabase/migrations/20261009_storage_cleanup.sql',import.meta.url),'utf8');
    await db.exec(old.split('-- Schedule:')[0]);
    await db.exec(await readFile(new URL('../supabase/migrations/20261023065348_immediate_media_cleanup.sql',import.meta.url),'utf8'));
    await db.exec(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    INSERT INTO products VALUES('${id}','https://example.supabase.co/storage/v1/object/public/product-images/main.jpg'),('${other}','shared.jpg');
    INSERT INTO product_images VALUES(1,'${id}','gallery.jpg'),(2,'${id}','shared.jpg');
    INSERT INTO students VALUES(1,'passports/student.jpg');
    INSERT INTO bespoke_requests VALUES('${id}',ARRAY['requests/a.jpg','requests/b.jpg']);
    SET ROLE service_role;`);
    for(const[kind,key,expected]of [['product',id,3],['student','1',1],['bespoke',id,2]]) {
      const result=await db.query('SELECT admin_delete_with_media($1,$2) refs',[kind,key]);assert.equal(result.rows[0].refs.length,expected);
    }
    const queue=(await db.query('SELECT path FROM storage_cleanup_queue ORDER BY path')).rows.map(r=>r.path);
    assert.deepEqual(queue,['gallery.jpg','main.jpg','passports/student.jpg','requests/a.jpg','requests/b.jpg']);
    assert.equal((await db.query('SELECT admin_delete_with_media($1,$2) refs',['student','1'])).rows[0].refs,null);
    await db.exec('RESET ROLE;SET ROLE authenticated');
    await assert.rejects(db.query('SELECT admin_delete_with_media($1,$2)',['product',other]),e=>e.code==='42501');
    await db.exec(`RESET ROLE;CREATE FUNCTION prevent_test_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'reserved' USING ERRCODE='23514';END;$$;
    CREATE TRIGGER protect BEFORE DELETE ON products FOR EACH ROW EXECUTE FUNCTION prevent_test_delete();SET ROLE service_role;`);
    await assert.rejects(db.query('SELECT admin_delete_with_media($1,$2)',['product',other]),e=>e.code==='23514');
    assert.equal((await db.query('SELECT count(*)::int n FROM products')).rows[0].n,1);
    assert.equal((await db.query('SELECT count(*)::int n FROM storage_cleanup_queue')).rows[0].n,5);
  } finally {await db.close();}
});

