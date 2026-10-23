import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {passportUploadError} from '../src/lib/passportUpload.mjs';

test('passport errors offer recovery without exposing database errors',()=>{
 for(const error of [{statusCode:'403'},{message:'new row violates row-level security policy'},{message:'JWT expired'}])assert.match(passportUploadError(error),/sign in again/);
 assert.match(passportUploadError({message:'network error'}),/connection/);
 assert.doesNotMatch(passportUploadError({message:'internal sensitive details'}),/sensitive/);
});
test('passport policies accept metadata-free preflight, own inserts and replacements and reject foreign paths',{skip:!process.env.PGLITE_MODULE_PATH},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE_PATH).href),db=new PGlite();
 const alice='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bob='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 try{
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA storage;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$SELECT string_to_array($1,'/')$$;
 CREATE FUNCTION storage.filename(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT reverse(split_part(reverse($1),'/',1))$$;
 CREATE TABLE storage.buckets(id text,file_size_limit bigint,allowed_mime_types text[]);INSERT INTO storage.buckets(id) VALUES('student-passports');
 CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb,PRIMARY KEY(bucket_id,name));ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage,auth TO authenticated,anon;GRANT SELECT,INSERT,UPDATE ON storage.objects TO authenticated,anon;
 CREATE POLICY own_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='student-passports' AND (storage.foldername(name))[1]=auth.uid()::text);
 INSERT INTO storage.objects VALUES('student-passports','${bob}/passport.png','{"size":100,"mimetype":"image/png"}');
 SELECT set_config('request.jwt.claim.sub','${alice}',false);`);
 const sql=await readFile(new URL('../supabase/migrations/20261023071648_fix_passport_upload_policy.sql',import.meta.url),'utf8');await db.exec(sql);
 await db.exec(await readFile(new URL('../supabase/migrations/20261023071841_allow_passport_upload_preflight.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query('SELECT file_size_limit,allowed_mime_types FROM storage.buckets')).rows[0],{file_size_limit:5242880,allowed_mime_types:['image/jpeg','image/png']});
 await db.exec('SET ROLE authenticated');
 const insert=(name,mimetype='image/png',size=100)=>db.query('INSERT INTO storage.objects VALUES($1,$2,$3)',['student-passports',name,{mimetype,size}]);
 await db.query('INSERT INTO storage.objects VALUES($1,$2,NULL)',['student-passports',alice+'/passport.png']);await insert(alice+'/passport.jpg','image/jpeg');
 assert.equal((await db.query("UPDATE storage.objects SET metadata=metadata||'{\"size\":200}'::jsonb WHERE name=$1 RETURNING name",[alice+'/passport.png'])).rows.length,1);
 for(const[name,mime,size]of [[bob+'/passport.jpg','image/jpeg',100],[alice+'/other.png','image/png',100]]){
  await assert.rejects(db.query('UPDATE storage.objects SET name=$1,metadata=$2 WHERE name=$3',[name,{mimetype:mime,size},alice+'/passport.png']),e=>e.code==='42501');
 }
 assert.equal((await db.query('SELECT * FROM storage.objects WHERE name=$1',[bob+'/passport.png'])).rows.length,0);
 await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(insert(alice+'/passport.jpg','image/jpeg'),e=>e.code==='42501');
 }finally{await db.close();}
});

