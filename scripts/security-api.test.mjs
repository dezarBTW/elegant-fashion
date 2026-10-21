import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {z} from 'zod';
import {passportPath} from '../src/lib/passport.mjs';
const origin='https://audit.example.invalid';
async function load(file,{allowed=true,error=null}={}){
 let uploads=0;
 const db={rpc:async()=>({data:allowed,error}),storage:{from:()=>({createSignedUploadUrl:async()=>{uploads++;return {data:{signedUrl:'https://example.invalid/test'}};}})}};
 const context=vm.createContext({Request,Response,URL,console:{warn(){},error(){}},crypto:webcrypto,TextEncoder,process:{env:{NEXT_PUBLIC_SUPABASE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:'isolated'}}});
 const deps={'next/server':{NextResponse:Response,NextRequest:Request},'@supabase/supabase-js':{createClient:()=>db},zod:{z},'@/lib/supabaseClient':{supabase:db}};
 const source=stripTypeScriptTypes(await readFile(file,'utf8'));
 const m=new vm.SourceTextModule(source,{context});await m.link(name=>{const v=deps[name];if(!v)throw Error(name);return new vm.SyntheticModule(Object.keys(v),function(){for(const [k,x]of Object.entries(v))this.setExport(k,x);},{context});});await m.evaluate();
 return {module:m.namespace,uploads:()=>uploads};
}
const req=body=>new Request(origin+'/api/bespoke/upload-url',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
test('both current and legacy image upload formats enforce the shared rate limiter',async()=>{
 for(const body of [{files:[{fileName:'x.jpg',contentType:'image/jpeg',size:10}]},{fileNames:['x.jpg'],fileTypes:['image/jpeg']}]){
  const x=await load('src/app/api/bespoke/upload-url/route.ts',{allowed:false});const r=await x.module.POST(req(body));assert.equal(r.status,429);assert.ok((await r.json()).error);assert.equal(x.uploads(),0);
 }
});
test('image uploads fail closed if limiter fails; malformed and oversized requests give clear errors',async()=>{
 const x=await load('src/app/api/bespoke/upload-url/route.ts',{error:{message:'offline'}});assert.equal((await x.module.POST(req({files:[{fileName:'x.jpg',contentType:'image/jpeg',size:10}]}))).status,503);assert.equal(x.uploads(),0);
 for(const [body,status] of [['{',400],[' '.repeat(16001),413]]){const x=await load('src/app/api/bespoke/upload-url/route.ts');const r=await x.module.POST(req(body));assert.equal(r.status,status);assert.ok((await r.json()).error);}
});
test('invalid search parameters return 400 rather than database errors',async()=>{
 const x=await load('src/app/api/search/route.ts');for(const query of ['q=a','q=dress&page=-1','q=dress&page=nope','q=dress&limit=0','q=dress&minPrice=nope','q=dress&minPrice=100&maxPrice=1','q='+'a'.repeat(201)]){const r=await x.module.GET(new Request(origin+'/api/search?'+query));assert.equal(r.status,400,query);assert.ok((await r.json()).error);}
});
test('malformed stock IDs return 400',async()=>{const x=await load('src/app/api/stock/route.ts');for(const suffix of ['','?id=bad','?id=1%27%20OR%201=1']){const r=await x.module.GET(new Request(origin+'/api/stock'+suffix));assert.equal(r.status,400);assert.ok((await r.json()).error);}});
test('private passport paths accept own project paths and reject external or arbitrary image locations',()=>{
 const path='11111111-1111-4111-8111-111111111111/passport.jpg';assert.equal(passportPath(origin+'/storage/v1/object/public/student-passports/'+path,origin),path);
 for(const url of ['https://evil.invalid/storage/v1/object/public/student-passports/'+path,origin+'/storage/v1/object/public/product-images/x.jpg','javascript:alert(1)'])assert.equal(passportPath(url,origin),null);
});
