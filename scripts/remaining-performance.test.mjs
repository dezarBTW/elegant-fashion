import test from 'node:test';
import assert from 'node:assert/strict';
import { createPurchaseLimitStore } from '../src/lib/purchaseLimitStore.mjs';
import { verifyBespokeImages } from '../src/lib/bespokeImages.mjs';

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
test('stock subscriptions batch overlapping products and share one timer, with hidden-tab suspension', async () => {
  let calls = [], visible = true, tick, events, timers = 0, stops = 0, clock = 10000;
  const store = createPurchaseLimitStore({
    fetchLimits: async ids => { calls.push(ids); return Object.fromEntries(ids.map(id => [id,{L:4}])); },
    isVisible: () => visible, now: () => clock,
    setTimer(callback) { timers++; tick = callback; return 1; }, clearTimer() { stops++; },
    listen(callback) { events = callback; return () => {}; },
  });
  let first, second;
  const off1=store.subscribe(['a'],state=>{first=state;}),off2=store.subscribe(['a','b'],state=>{second=state;});
  try {
    await settle(); assert.deepEqual(calls,[['a','b']]); assert.equal(timers,1); assert.equal(first.limits.a.L,4); assert.equal(second.limits.b.L,4);
    visible=false; clock+=15000; tick(); await settle(); assert.equal(calls.length,1);
    visible=true; events(); events(); await settle(); assert.equal(calls.length,2);
    const result=await store.refresh(['a']); assert.equal(result.a.L,4); assert.equal(calls.length,3);
  } finally { off1();off2(); }
  assert.equal(stops,1);
});
test('concurrent explicit stock checks deduplicate in flight and failures clear stale availability', async () => {
  let finish, fail=false, calls=0;
  const store=createPurchaseLimitStore({ fetchLimits: async()=>{calls++;if(fail)throw Error('offline');await new Promise(resolve=>{finish=resolve;});return {a:{L:4}};} });
  const a=store.refresh(['a']),b=store.refresh(['a']); await settle();finish();assert.deepEqual(await a,await b);assert.equal(calls,1);
  fail=true;await assert.rejects(store.refresh(['a']),/Unable to check availability/);
  let state;const off=store.subscribe(['a'],next=>{state=next;});off();assert.deepEqual(state.limits.a,{});assert.ok(state.error);
});
test('stock requests respect the 50-product RPC bound and empty sets make no request', async () => {
  const batches=[];const store=createPurchaseLimitStore({fetchLimits:async ids=>{batches.push(ids);return {};}});
  assert.deepEqual(await store.refresh([]),{});assert.equal(batches.length,0);
  await store.refresh(Array.from({length:121},(_,i)=>String(i)));assert.deepEqual(batches.map(batch=>batch.length),[50,50,21]);
});
test('four bespoke objects verify concurrently with exact names and failed storage checks fail closed', async () => {
  let active=0,peak=0;
  const image=new Blob([Uint8Array.from([0xff,0xd8,0xff,0,0,0,0,0,0,0,0,0])]);
  const db={storage:{from:()=>({list:async(_folder,{search})=>{active++;peak=Math.max(peak,active);await settle();active--;return {data:[{name:search,metadata:{size:image.size}}]};},download:async()=>({data:image})})}};
  assert.equal(await verifyBespokeImages(db,'private',['requests/a.jpg','requests/b.jpg','requests/c.jpg','requests/d.jpg']),true);assert.equal(peak,4);
  const missing={storage:{from:()=>({list:async()=>({data:[{name:'prefix-a.jpg'}]})})}};
  assert.equal(await verifyBespokeImages(missing,'private',['requests/a.jpg']),false);
  const spoofed={storage:{from:()=>({list:async()=>({data:[{name:'a.jpg',metadata:{size:12}}]}),download:async()=>({data:new Blob(['<script>x</script>'])})})}};
  assert.equal(await verifyBespokeImages(spoofed,'private',['requests/a.jpg']),false);
  const broken={storage:{from:()=>({list:async()=>({error:{message:'offline'}})})}};
  await assert.rejects(verifyBespokeImages(broken,'private',['requests/a.jpg']),/Unable to verify/);
  await assert.rejects(verifyBespokeImages(db,'private',Array(5).fill('requests/a.jpg')),/Invalid/);
});
