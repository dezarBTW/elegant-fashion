import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { z } from 'zod';
import { verifyBespokeImages } from '../src/lib/bespokeImages.mjs';
import { OrderRequestError, requireLiveSession } from '../src/lib/orderManagement.mjs';

const origin='https://fixture.example.invalid';
async function moduleAt(file,deps,extra={}){
 const context=vm.createContext({Request,Response,URL,TextEncoder,Buffer,AbortSignal,crypto:webcrypto,console:{error(){},warn(){},info(){}},...extra});
 const m=new vm.SourceTextModule(file.endsWith('.ts')?stripTypeScriptTypes(await readFile(file,'utf8')):await readFile(file,'utf8'),{context});
 await m.link(name=>{const values=deps[name];if(!values)throw Error(name);return new vm.SyntheticModule(Object.keys(values),function(){for(const[key,value]of Object.entries(values))this.setExport(key,value);},{context});});await m.evaluate();return m.namespace;
}
const request=(path,body,requestOrigin=origin)=>new Request(origin+path,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
test('bespoke submission verifies references before inserting and batches email signing once',async()=>{
 const callbacks=[],inserts=[],sent=[];let signCalls=0;
 const db={rpc:async()=>({data:true}),storage:{from:()=>({list:async(_folder,{search})=>({data:[{name:search}]}),createSignedUrls:async paths=>{signCalls++;return {data:paths.map(path=>({path,signedUrl:'https://images.example.invalid/'+path}))};}})},from:()=>({insert(row){inserts.push(row);return this;},select(){return this;},single:async()=>({data:{id:'11111111-1111-4111-8111-111111111111',created_at:'2026-01-01'}})})};
 const m=await moduleAt('src/app/api/bespoke/submit/route.ts',{'next/server':{after:callback=>callbacks.push(callback),NextRequest:Request,NextResponse:Response},'@supabase/supabase-js':{createClient:()=>db},zod:{z},'@/lib/orderEmails.mjs':{ADMIN_NOTIFY_EMAIL:'elegantyoufashion18@gmail.com'},'@/lib/bespokeImages.mjs':{verifyBespokeImages}},{process:{env:{NEXT_PUBLIC_SUPABASE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:'fixture',RESEND_API_KEY:'fixture',RESEND_FROM_EMAIL:'fixture@example.invalid'}},fetch:async(url,options)=>{if(url.startsWith('https://images.example.invalid/'))return new Response('fixture');sent.push(JSON.parse(options.body));return Response.json({id:'fixture'});}});
 const body={name:'Fixture Customer',phone:'08012345678',description:'Please tailor a blue cotton gown.',imagePaths:Array.from({length:4},(_,i)=>'requests/00000000-0000-4000-8000-'+String(i+1).padStart(12,'0')+'.jpg')};
 const response=await m.POST(request('/api/bespoke/submit',body));assert.equal(response.status,200);assert.equal(inserts.length,1);
 await callbacks[0]();assert.equal(signCalls,1);assert.equal(sent.length,1);assert.equal(sent[0].attachments.length,4);assert.deepEqual(sent[0].to,['elegantyoufashion18@gmail.com']);
});
test('missing bespoke objects and storage failures cannot create requests',async()=>{
 for(const failure of ['missing','offline']){
  let inserts=0;const db={rpc:async()=>({data:true}),storage:{from:()=>({list:async()=>failure==='missing'?{data:[]}:{error:{message:'offline'}}})},from:()=>{inserts++;throw Error('must not insert');}};
  const m=await moduleAt('src/app/api/bespoke/submit/route.ts',{'next/server':{after(){},NextRequest:Request,NextResponse:Response},'@supabase/supabase-js':{createClient:()=>db},zod:{z},'@/lib/orderEmails.mjs':{ADMIN_NOTIFY_EMAIL:'fixture@example.invalid'},'@/lib/bespokeImages.mjs':{verifyBespokeImages}},{process:{env:{NEXT_PUBLIC_SUPABASE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:'fixture'}}});
  const r=await m.POST(request('/api/bespoke/submit',{phone:'08012345678',description:'Please tailor a blue cotton gown.',imagePaths:['requests/00000000-0000-4000-8000-000000000001.jpg']}));assert.equal(r.status,failure==='missing'?400:500);assert.ok((await r.json()).error);assert.equal(inserts,0);
 }
});
test('order-history reads execute no claim RPC or database write',async()=>{
 const query={select(){return this;},eq(){return this;},order(){return this;},range:async()=>({data:[],count:0})};
 const db={from:()=>query,rpc:()=>{throw Error('Unexpected claim');}};
 const m=await moduleAt('src/app/api/account/orders/route.js',{'next/server':{NextResponse:Response},'@/lib/accountServer':{requireActiveAccount:async()=>({db,user:{id:'fixture'}})},'@/lib/orderManagement.mjs':{OrderRequestError}});
 const r=await m.GET(new Request(origin+'/api/account/orders?page=2'));assert.equal(r.status,200);assert.equal((await r.json()).page,2);
});
test('account-link endpoint checks origin and authentication and returns clear failure responses',async()=>{
 let calls=0,authenticated=false;
 const m=await moduleAt('src/app/api/account/link-orders/route.js',{'next/server':{NextResponse:Response},'@/lib/accountServer':{
  checkRequestOrigin:r=>{if(r.headers.get('origin')!==origin)throw new OrderRequestError('Invalid request origin.',403);},
  requireActiveAccount:async()=>{if(!authenticated)throw new OrderRequestError('Please sign in.',401);return {db:{},user:{id:'fixture'}};},claimAccountOrders:async()=>{calls++;},
 },'@/lib/orderManagement.mjs':{OrderRequestError}});
 assert.equal((await m.POST(request('/api/account/link-orders',undefined,'https://other.invalid'))).status,403);
 assert.equal((await m.POST(request('/api/account/link-orders'))).status,401);assert.equal(calls,0);
 authenticated=true;assert.equal((await m.POST(request('/api/account/link-orders'))).status,200);assert.equal(calls,1);
});

test('linking takes identity only from verified Auth and rejects unverified, inactive and revoked accounts',async()=>{
 const user={id:'11111111-1111-4111-8111-111111111111',email:'verified@example.invalid',email_confirmed_at:'2026-01-01',is_anonymous:false};
 const token='h.'+Buffer.from(JSON.stringify({session_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'})).toString('base64url')+'.s';
 let mode='valid',calls=[];
 const db={auth:{getUser:async()=>({data:{user:{...user,email_confirmed_at:mode==='unverified'?null:user.email_confirmed_at,is_anonymous:mode==='anonymous'}},error:mode==='invalid'?{}:null})},
  rpc:async(name,args)=>{if(name==='is_live_account_session')return {data:mode!=='revoked'};calls.push(args);return {data:0};},
  from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{is_active:mode!=='inactive'}})})};
 const account=await moduleAt('src/lib/accountServer.js',{'@supabase/supabase-js':{createClient(){}},'./checkoutServer.js':{checkoutDatabase:()=>db},'./orderManagement.mjs':{OrderRequestError,requireLiveSession}});
 const m=await moduleAt('src/app/api/account/link-orders/route.js',{'next/server':{NextResponse:Response},'@/lib/accountServer':{...account},'@/lib/orderManagement.mjs':{OrderRequestError}});
 const req=()=>new Request(origin+'/api/account/link-orders',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:'forged',p_email:'someone-else@example.invalid'})});
 assert.equal((await m.POST(req())).status,200);assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{p_user_id:user.id,p_email:user.email}]);
 for(const [scenario,status]of[['unverified',401],['anonymous',401],['revoked',401],['inactive',403],['invalid',401]]){mode=scenario;const before=calls.length;assert.equal((await m.POST(req())).status,status);assert.equal(calls.length,before);}
});
