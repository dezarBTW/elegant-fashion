import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as crypto from 'node:crypto';
import { z } from 'zod';
import * as checkout from '../src/lib/checkout.mjs';
import * as bachs from '../src/lib/bachs.mjs';
import * as management from '../src/lib/orderManagement.mjs';
import { SIZE_VALUES } from '../src/lib/products.mjs';
import { authReturnPath, withAuthReturn, CHECKOUT_SIGN_IN } from '../src/lib/authLinks.mjs';

const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const productId='11111111-1111-4111-8111-111111111111';
const attemptId='22222222-2222-4222-8222-222222222222';
const tokenFor = label => 'header.'+Buffer.from(JSON.stringify({session_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',label})).toString('base64url')+'.signature';
const origin='https://elegantstyle.com.ng';
const body={attemptId,items:[{productId,quantity:3,size:'M'}],customer:{name:'Test Customer',email:'customer@example.invalid',phone:'08012345678'},delivery:{method:'pickup'}};

async function setup({ confirmed=true, active=true, anonymous=false }={}) {
  const orders=[],providerCalls=[],reads=[];
  const user={id:userId,email:'customer@example.invalid',email_confirmed_at:confirmed?'2026-10-21':null,is_anonymous:anonymous};
  const db={
    auth:{getUser:async token=>({data:{user:token===tokenFor('valid')?user:token===tokenFor('other')?{...user,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}:null},error:![tokenFor('valid'),tokenFor('other')].includes(token)?{message:'Invalid session'}:null})},
    rpc:async()=>({data:true}),
    from(table){
      reads.push(table);let inserted,patch;const filters=[];
      const run=()=>{
        if(inserted){orders.push({...inserted});return {data:null};}
        const rows=table==='users'?[{id:userId,is_active:active}]:table==='products'?[{id:productId,name:'Dress',price:100,is_active:true,available_sizes:['M']}]:orders;
        const matches=rows.filter(row=>filters.every(([key,value])=>row[key]===value));
        if(patch)matches.forEach(row=>Object.assign(row,patch));
        return {data:matches};
      };
      return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},in(){return this;},insert(value){inserted=value;return this;},update(value){patch=value;return this;},async maybeSingle(){const result=run();return {...result,data:result.data[0]||null};},then(resolve,reject){return Promise.resolve(run()).then(resolve,reject);}};
    }
  };
  const NextResponse={json:(value,options)=>{const response=Response.json(value,options);response.cookies={set(){}};return response;}};
  const context=vm.createContext({URL,URLSearchParams,Response,console:{error(){}},AbortSignal,process:{env:{BACHS_API_KEY:'sk_sandbox_fixture',BACHS_WEBHOOK_SECRET:'fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture'}},fetch:async(url,options)=>{providerCalls.push({url,options});return Response.json({checkout_id:'fixture',checkout_url:'https://sandbox-checkout.bachs.io/fixture'});}});
  const deps={
    '@supabase/supabase-js':{createClient(){}},'./checkoutServer.js':{checkoutDatabase:()=>db},'./orderManagement.mjs':management,
    'next/server':{NextResponse},'node:crypto':crypto,zod:{z},'@/lib/checkoutServer':{hasOrderAccess:()=>true,receiptHash:value=>value,setOrderCookie:response=>response},
    '@/lib/checkout.mjs':checkout,'@/lib/bachs.mjs':bachs,'@/lib/seo.mjs':{SITE_URL:origin},'@/lib/products.mjs':{SIZE_VALUES},'@/lib/orderManagement.mjs':management
  };
  const synthetic=name=>{const values=deps[name];if(!values)throw new Error(`Unexpected dependency: ${name}`);return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});};
  const accountModule=new vm.SourceTextModule(await readFile(new URL('../src/lib/accountServer.js',import.meta.url),'utf8'),{context});
  await accountModule.link(synthetic);await accountModule.evaluate();
  deps['@/lib/accountServer']={requireActiveAccount:accountModule.namespace.requireActiveAccount};
  const routeModule=new vm.SourceTextModule(await readFile(new URL('../src/app/api/checkout/route.js',import.meta.url),'utf8'),{context});
  await routeModule.link(synthetic);await routeModule.evaluate();
  const request=(token='valid',value=body)=>new Request(`${origin}/api/checkout`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${tokenFor(token)}`}:{})},body:JSON.stringify(value)});
  return {POST:routeModule.namespace.POST,request,orders,providerCalls,reads};
}

test('checkout return destinations are restricted to checkout and preserve sign-up/OAuth return links',()=>{
  assert.equal(authReturnPath('?next=%2Fcheckout'),'/checkout');
  assert.equal(withAuthReturn('/sign-up','/checkout'),'/sign-up?next=%2Fcheckout');
  assert.equal(CHECKOUT_SIGN_IN,'/sign-in?next=%2Fcheckout');
  for(const next of ['https://evil.invalid','//evil.invalid','/admin','/checkout/../admin','javascript:alert(1)'])assert.equal(authReturnPath(`next=${encodeURIComponent(next)}`),'/');
});

test('checkout rejects missing, forged, expired, anonymous and unverified sessions before creating orders or payments',async()=>{
  for(const options of [{token:null},{token:'forged'},{token:'expired'},{anonymous:true},{confirmed:false},{active:false}]){
    const endpoint=await setup(options);const response=await endpoint.POST(endpoint.request(options.token===undefined?'valid':options.token));
    assert.equal(response.status,options.active===false?403:401);
    assert.equal(endpoint.orders.length,0);assert.equal(endpoint.providerCalls.length,0);
    assert.ok(!endpoint.reads.includes('shop_orders'));
  }
});

test('authenticated checkout binds the order to the verified user and resumes the same payment once',async()=>{
  const endpoint=await setup();const response=await endpoint.POST(endpoint.request());
  assert.equal(response.status,200);assert.equal(endpoint.orders.length,1);
  assert.equal(endpoint.orders[0].user_id,userId);assert.equal(endpoint.orders[0].total_minor,30000);
  assert.equal(endpoint.providerCalls.length,1);
  const repeated=await endpoint.POST(endpoint.request());
  assert.equal(repeated.status,200);assert.equal(endpoint.orders.length,1);assert.equal(endpoint.providerCalls.length,1);
});

test('a valid session cannot resume another account’s checkout',async()=>{
  const endpoint=await setup();await endpoint.POST(endpoint.request());
  endpoint.orders[0].user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const response=await endpoint.POST(endpoint.request());
  assert.equal(response.status,403);assert.equal(endpoint.providerCalls.length,1);
});
