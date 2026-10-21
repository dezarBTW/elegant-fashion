import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bachsClient} from '../src/lib/bachsServer.js';
test('stock checkout uses the official SDK with a retained order idempotency key and exact amount',async()=>{
 const original=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return Response.json({checkout_id:'checkout_fixture',checkout_url:'https://sandbox-checkout.bachs.io/fixture',status:'pending',expires_at:'2026-10-22T00:00:00Z',created_at:'2026-10-21T23:00:00Z',reference:'stock-order'});};
  const session=await bachsClient('sk_sandbox_fixture').checkoutSessions.create({pricing:{currency:'NGN',amount:'18000.00'},reference:'stock-order',customer:{email:'test@example.invalid',name:'Fixture'}},{idempotencyKey:'stock-order'});
  assert.equal(session.checkout_id,'checkout_fixture');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://sandbox-api.bachs.io/v1/checkout-sessions');
  assert.equal(new Headers(calls[0].options.headers).get('Idempotency-Key'),'stock-order');assert.equal(JSON.parse(calls[0].options.body).pricing.amount,'18000.00');
 }finally{globalThis.fetch=original;}
});
test('uncertain provider writes are not automatically repeated or treated as free stock',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;throw Error('Simulated connection loss');};await assert.rejects(bachsClient('sk_sandbox_fixture').checkoutSessions.create({pricing:{currency:'NGN',amount:'18000.00'},reference:'uncertain'},{idempotencyKey:'uncertain'}),error=>error.outcomeUnknown===true);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
