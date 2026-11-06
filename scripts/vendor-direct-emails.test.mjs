import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notifyPaidVendors } from '../src/lib/vendorOrderEmails.mjs';
import { buildDeliveryCompletedEmail } from '../src/lib/orderEmails.mjs';
function database(items){
 const tables={seller_order_items:items,shop_orders:[{id:'order',customer_email:'customer@example.invalid',delivery:{method:'outside_yenagoa'}}],users:[{id:'vendor1',email:'one@example.invalid'},{id:'vendor2',email:'two@example.invalid'}]};
 return {from(table){assert.ok(table in tables,`Unexpected table access: ${table}`);let rows=tables[table],single=false;return {select(){return this;},eq(column,value){rows=rows.filter(row=>row[column]===value);return this;},in(column,values){rows=rows.filter(row=>values.includes(row[column]));return this;},single(){single=true;return this;},then(resolve,reject){return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve,reject);}};}};
}
const items=[{id:'item1',order_id:'order',seller_id:'vendor1',seller_kind:'vendor',product_name:'Dress <one>',quantity:1},{id:'item2',order_id:'order',seller_id:'vendor2',seller_kind:'vendor',product_name:'Dress two',quantity:2}];
test('paid vendor messages are sent directly without a queue or duplicate administrator email',async()=>{
 const messages=[];const ok=await notifyPaidVendors(database(items),'order',{sendEmail:async message=>{messages.push(message);return true;}});
 assert.equal(ok,true);assert.equal(messages.length,2);
 assert.deepEqual(messages.map(message=>message.to),['one@example.invalid','two@example.invalid']);
 assert.ok(messages.every(message=>message.html.includes('multiple-vendor order')));
 assert.ok(messages[0].html.includes('Dress &lt;one&gt;'));
 assert.ok(!messages[0].html.includes('Dress two'));
});
test('vendor notification directs coordination offline and contains no payout approval link',async()=>{
 const messages=[];
 await notifyPaidVendors(database(items),'order',{sendEmail:async message=>{messages.push(message);return true;}});
 assert.ok(messages.every(message=>message.html.includes('offline')&&!message.html.includes('confirm payment receipt')));
});
test('delivery completion email states the deadline and sends customers to order history',()=>{
 const message=buildDeliveryCompletedEmail({id:'order',customer_email:'customer@example.invalid',delivery_confirmed_at:'2026-11-01T10:00:00Z'});
 assert.ok(message.text.includes('2026-11-04T10:00:00.000Z'));
 assert.ok(message.html.includes('/account/orders')&&!message.html.includes('/account/deliveries'));
 assert.equal(buildDeliveryCompletedEmail({delivery_confirmed_at:null}),null);
});
