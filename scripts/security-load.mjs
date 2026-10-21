// Loopback-only load harness. Executes real checkout and webhook handlers against
// isolated PostgreSQL. Auth identity and payment/email providers are simulated.
// This measures local handler behaviour, NOT Vercel/Supabase/provider capacity.
import {createServer, request as httpRequest, Agent} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus,totalmem} from 'node:os';
import * as crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {PGlite} from '../output/security-runtime/node_modules/@electric-sql/pglite/dist/index.js';
import * as checkout from '../src/lib/checkout.mjs';
import * as bachs from '../src/lib/bachs.mjs';
import * as management from '../src/lib/orderManagement.mjs';
import * as receipts from '../src/lib/checkoutServer.js';
import {SIZE_VALUES} from '../src/lib/products.mjs';
const db=new PGlite(), identities=new Map(), provider=new Map(), emails=[];
const schema=JSON.parse(await readFile('scripts/fixtures/security-schema-before.json','utf8'));
const q=s=>'"'+s.replaceAll('"','""')+'"';
let providerMode='ok',rateMode='normal',sessionMode='normal';
const report={environment:{kind:'isolated loopback Node HTTP + actual route handlers + PGlite PostgreSQL; mocked auth, payments and email',node:process.version,cpu:cpus()[0].model,memoryGB:Math.round(totalmem()/1024**3),productionTraffic:0},security:[],load:[]};
let server;
// Bound TCP connections so Windows connection churn does not masquerade as an app failure.
const agent=new Agent({keepAlive:true,maxSockets:100,maxFreeSockets:100});
const localFetch=(url,options)=>new Promise((resolve,reject)=>{
 const req=httpRequest(url,{method:options.method,headers:options.headers,agent},res=>{
  const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));res.on('error',reject);
 });req.on('error',reject);req.setTimeout(120000,()=>req.destroy(new Error('Local request timeout')));req.end(options.body);
});
try {
await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.sessions(id uuid primary key,user_id uuid); CREATE TABLE public.users(id uuid primary key,is_active boolean,is_admin boolean,email text); CREATE TABLE products(id uuid primary key,name text,price numeric,sale_price numeric,is_active boolean,available_sizes text[]);');
for(const table of ['shop_orders','checkout_rate_limits']) {
 const cols=schema.columns.filter(c=>c.table===table).map(c=>q(c.name)+' '+c.type+(c.default?' DEFAULT '+c.default:'')+(c.notnull?' NOT NULL':''));
 await db.exec(`CREATE TABLE ${q(table)}(${cols.join(',')})`);
 for(const c of schema.constraints.filter(c=>c.table===table&&c.type!=='f'))await db.exec(`ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(c.name)} ${c.definition}`);
}
await db.exec(schema.functions.find(f=>f.startsWith('CREATE OR REPLACE FUNCTION public.consume_checkout_rate_limit(')));
const productId=crypto.randomUUID();
await db.query('INSERT INTO products VALUES ($1,$2,18000,NULL,true,ARRAY[\'S\',\'M\',\'L\'])',[productId,'Isolated test skirt']);
const adapter={auth:{getUser:async token=>({data:{user:identities.get(token)||null},error:identities.has(token)?null:{message:'Invalid token'}})},
 async rpc(name,args){try{if(name==='is_live_account_session') {if(sessionMode==='error')return {data:null,error:{code:'unavailable'}};return {data:(await db.query('select exists(select 1 from auth.sessions where id=$1 and user_id=$2) ok',[args.p_session_id,args.p_user_id])).rows[0].ok};}if(rateMode==='error')return {error:{code:'unavailable'}};return {data:(await db.query('select consume_checkout_rate_limit($1) ok',[args.p_ip_hash])).rows[0].ok};}catch(e){return {error:{code:e.code}};}},
 from(table){let action='select',value,filters=[],single=false,selected='*';
 const run=async()=>{try{
  let sql,params=[];const bind=v=>{params.push(v);return '$'+params.length;};
  if(action==='insert')sql=`INSERT INTO ${q(table)} (${Object.keys(value).map(q)}) VALUES (${Object.values(value).map(v=>bind(typeof v==='object'?JSON.stringify(v):v))})`;
  else if(action==='update')sql=`UPDATE ${q(table)} SET `+Object.entries(value).map(([k,v])=>`${q(k)}=${bind(typeof v==='object'?JSON.stringify(v):v)}`).join(',');
  else sql=`SELECT ${selected==='*'?'*':selected.split(',').map(q).join(',')} FROM ${q(table)}`;
  if(filters.length)sql+=' WHERE '+filters.map(([k,op,v])=>`${q(k)} ${op==='in'?'= ANY('+bind(v)+')':op+bind(v)}`).join(' AND ');
  if(action!=='select')sql+=' RETURNING *';
  const rows=(await db.query(sql,params)).rows;return {data:single?(rows[0]||null):rows,error:null};
 }catch(e){return {data:null,error:{code:e.code,message:e.message}};}};
 const chain={select(c){selected=c;return this;},eq(k,v){filters.push([k,'=',v]);return this;},neq(k,v){filters.push([k,'<>',v]);return this;},in(k,v){filters.push([k,'in',v]);return this;},insert(v){action='insert';value=v;return this;},update(v){action='update';value=v;return this;},maybeSingle(){single=true;return run();},then(a,b){return run().then(a,b);}};return chain;}
};
const NextResponse={json:(body,options)=>{const res=Response.json(body,options);res.cookies={set(name,value){res.headers.append('set-cookie',`${name}=${value}; Path=/api/checkout; HttpOnly; SameSite=Lax`);}};return res;}};
const env={BACHS_API_KEY:'sk_sandbox_isolated',BACHS_WEBHOOK_SECRET:'isolated-signature-secret',SUPABASE_SERVICE_ROLE_KEY:'isolated-hash-key'};
const context=vm.createContext({URL,Response,Buffer,AbortSignal,Date,console:{error(){}},process:{env},fetch:async(url,options)=>{
 if(!url.startsWith('https://sandbox-api.bachs.io/'))throw Error('Unexpected outbound fetch blocked');
 if(providerMode==='timeout')throw Error('Simulated provider timeout');
 if(providerMode==='reject')return Response.json({error:'provider rejected'}, {status:502});
 const id=options.headers['Idempotency-Key'];await new Promise(r=>setTimeout(r,10));
 const response=provider.get(id)||{checkout_id:'isolated_'+id,checkout_url:'https://sandbox-checkout.bachs.io/'+id};provider.set(id,response);return Response.json(response);
}});
const deps={'@supabase/supabase-js':{createClient(){}},'./checkoutServer.js':{checkoutDatabase:()=>adapter},'./orderManagement.mjs':management,'next/server':{NextResponse},'node:crypto':crypto,zod:{z},'@/lib/checkoutServer':{...receipts,checkoutDatabase:()=>adapter},'@/lib/orderManagement.mjs':management,'@/lib/checkout.mjs':checkout,'@/lib/bachs.mjs':bachs,'@/lib/products.mjs':{SIZE_VALUES},'@/lib/seo.mjs':{SITE_URL:'http://localhost'},'@/lib/orderEmails.mjs':{sendOrderEmails:async order=>emails.push(order.id)}};
const link=name=>{if(!deps[name])throw Error(name);return new vm.SyntheticModule(Object.keys(deps[name]),function(){for(const [k,v]of Object.entries(deps[name]))this.setExport(k,v);},{context});};
async function load(file){const m=new vm.SourceTextModule(await readFile(file,'utf8'),{context});await m.link(link);await m.evaluate();return m.namespace;}
deps['@/lib/accountServer']=await load('src/lib/accountServer.js');
const route=await load('src/app/api/checkout/route.js'),webhook=await load('src/app/api/bachs/webhook/route.js');
server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(`http://127.0.0.1:${server.address().port}${req.url}`,{method:req.method,headers:req.headers,body:Buffer.concat(chunks)});request.cookies={get:name=>{const cookie=(req.headers.cookie||'').split('; ').find(c=>c.startsWith(name+'='));return cookie?{value:cookie.slice(name.length+1)}:undefined;}};const response=await(req.url==='/api/checkout'?route.POST(request):webhook.POST(request));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch{res.writeHead(500,{'content-type':'application/json'});res.end('{"error":"Harness failure"}');}});
await new Promise(r=>server.listen({port:0,host:'127.0.0.1',backlog:4096},r));const origin=`http://127.0.0.1:${server.address().port}`;
async function actor(){const id=crypto.randomUUID(),sid=crypto.randomUUID(),user={id,email:'test@example.invalid',email_confirmed_at:'2026-10-21',is_anonymous:false};const token='header.'+Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')+'.signature';identities.set(token,user);await db.query('insert into users values($1,true,false)',[id]);await db.query('insert into auth.sessions values($1,$2)',[sid,id]);return {id,sid,token};}
const input=()=>({attemptId:crypto.randomUUID(),items:[{productId,quantity:1,size:'M'}],customer:{name:'Load test',email:'test@example.invalid',phone:'08012345678'},delivery:{method:'pickup'}});
async function purchase(a,body=input(),opts={}) {const start=performance.now();try{const r=await localFetch(origin+'/api/checkout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+a.token,'x-vercel-forwarded-for':a.id,...opts.headers},body:opts.raw??JSON.stringify(body)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],ms:performance.now()-start};}catch(e){return {status:0,body:{error:e.message},ms:performance.now()-start};}}
async function negative(name,run,status){const r=await run();assert.equal(r.status,status,name);assert.equal(typeof r.body.error,'string',name);report.security.push({name,status,error:r.body.error});}
const a=await actor();
await negative('Missing login',()=>purchase(a,input(),{headers:{Authorization:''}}),401);
await negative('Forged login',()=>purchase(a,input(),{headers:{Authorization:'Bearer forged'}}),401);
await negative('Wrong origin',()=>purchase(a,input(),{headers:{Origin:'https://evil.invalid'}}),403);
await negative('Malformed JSON',()=>purchase(a,input(),{raw:'{'}),400);
await negative('Oversized body',()=>purchase(a,input(),{raw:' '.repeat(21000)}),413);
for(const [name,change] of [['Missing size',b=>delete b.items[0].size],['Unavailable size',b=>b.items[0].size='XL'],['Negative quantity',b=>b.items[0].quantity=-1],['Excess quantity',b=>b.items[0].quantity=11],['Injected price',b=>b.items[0].price=1],['SQL-like product ID',b=>b.items[0].productId="' OR 1=1--"],['Unknown product',b=>b.items[0].productId=crypto.randomUUID()]]){const b=input();change(b);await negative(name,()=>purchase(a,b),400);}
sessionMode='error';await negative('Session database unavailable',()=>purchase(a),503);sessionMode='normal';
rateMode='error';await negative('Rate limiter unavailable',()=>purchase(a),503);rateMode='normal';
await db.query('delete from auth.sessions where id=$1',[a.sid]);await negative('Retained token after logout',()=>purchase(a),401);
const b=await actor();providerMode='timeout';await negative('Payment provider timeout',()=>purchase(b),503);providerMode='reject';await negative('Payment provider rejection',()=>purchase(b),502);providerMode='ok';
const repeatBody=input(),first=await purchase(b,repeatBody);assert.equal(first.status,200);const second=await purchase(b,repeatBody,{headers:{cookie:first.cookie}});assert.equal(second.status,200);assert.equal(first.body.checkoutUrl,second.body.checkoutUrl);
const other=await actor();await negative('Another account reuses order',()=>purchase(other,repeatBody),403);
const racing=await actor(),same=input();const races=await Promise.all(Array.from({length:10},()=>purchase(racing,same)));assert.equal(races.filter(r=>r.status===200).length,1);assert.ok(races.every(r=>[200,403,409].includes(r.status)));report.security.push({name:'10 simultaneous identical checkout attempts',statuses:races.map(r=>r.status),orders:1,providerSessions:1});
for(const count of [50,200,1000]){
 await db.exec('TRUNCATE shop_orders,checkout_rate_limits');provider.clear();emails.length=0;
 const actors=[];for(let i=0;i<count;i++)actors.push(await actor());
 const start=performance.now();const responses=await Promise.all(actors.map(a=>purchase(a)));const duration=performance.now()-start;
 const times=responses.map(r=>r.ms).sort((a,b)=>a-b),statuses={};for(const r of responses)statuses[r.status]=(statuses[r.status]||0)+1;
 const orders=(await db.query('select id,checkout_id,total_minor from shop_orders')).rows;
 const webhookStart=performance.now();const webhookResults=await Promise.all(orders.map(async order=>{
  const raw=JSON.stringify({id:'event_'+order.id,type:'collection.succeeded',data:{reference:order.id,checkout_id:order.checkout_id,charge_id:'charge_'+order.id,status:'SUCCEEDED',currency:'NGN',amount:'18000.00'}});
  const timestamp=Math.floor(Date.now()/1000),sig=crypto.createHmac('sha256',env.BACHS_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
  const send=async()=>{try{const r=await localFetch(origin+'/api/bachs/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-bachs-signature-v2':`t=${timestamp},v1=${sig}`},body:raw});await r.text();return r.status;}catch{return 0;}};return Promise.all([send(),send()]);
 }));
 const paid=(await db.query("select count(*)::int n from shop_orders where payment_status='paid'")).rows[0].n;
 const stage={users:count,simultaneousVirtualUsers:count,maxTcpConnections:100,statuses,durationMs:Math.round(duration),requestsPerSecond:+(count/(duration/1000)).toFixed(1),medianMs:Math.round(times[Math.floor(count*.5)]),p95Ms:Math.round(times[Math.floor(count*.95)]),p99Ms:Math.round(times[Math.floor(count*.99)]),maxMs:Math.round(times.at(-1)),orders:orders.length,providerSessions:provider.size,paidOrders:paid,emailBatches:emails.length,duplicateWebhookRequests:count*2,webhookDurationMs:Math.round(performance.now()-webhookStart),webhookFailures:webhookResults.flat().filter(s=>s!==200).length,webhookStatuses:webhookResults.flat().reduce((a,s)=>(a[s]=(a[s]||0)+1,a),{})};report.load.push(stage);console.log(JSON.stringify(stage));
 assert.equal(statuses[200],count);assert.equal(orders.length,count);assert.equal(paid,count);assert.equal(provider.size,count);assert.equal(emails.length,count);assert.equal(new Set(emails).size,count);assert.ok(orders.every(o=>Number(o.total_minor)===1800000));
}
// Shared-network traffic must be rejected politely once the configured cap is reached.
await db.exec('TRUNCATE checkout_rate_limits');const shared=await actor(),sharedResults=[];
for(let i=0;i<15;i++)sharedResults.push(await purchase(shared));
assert.equal(sharedResults.filter(r=>r.status===429).length,3);report.security.push({name:'Shared IP: configured 12 attempts/hour',allowed:12,throttled:3});
}catch(error){report.failure=error.message;console.error(error);process.exitCode=1;}finally{agent.destroy();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await db.close();await writeFile('output/security-load-results.json',JSON.stringify(report,null,2));}
