import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notifyPaidVendors } from '../src/lib/vendorOrderEmails.mjs';
import { notifySellerItem } from '../src/lib/sellerItemEmails.mjs';
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
test('combined customer shipment is one direct email covering all products',async()=>{
 const messages=[];assert.equal(await notifySellerItem(database(items),items[0],'shipped',{sendEmail:async message=>{messages.push(message);return true;}}),true);
 assert.equal(messages.length,1);assert.equal(messages[0].to,'customer@example.invalid');
 assert.equal(messages[0].idempotencyKey,'seller-order/order/shipped');
 assert.ok(messages[0].html.includes('Dress &lt;one&gt;')&&messages[0].html.includes('Dress two'));
 assert.ok(messages[0].html.includes('three days'));
});
test('payment notifications retain recipients and report a failed delivery attempt',async()=>{
 let recipient;
 assert.equal(await notifySellerItem(database(items),items[0],'payment_fulfilled',{sendEmail:async message=>{recipient=message.to;return false;}}),false);
 assert.equal(recipient,'one@example.invalid');
 assert.equal(await notifySellerItem(database(items),items[0],'payment_received',{sendEmail:async message=>{recipient=message.to;return true;}}),true);
 assert.equal(recipient,'elegantyoufashion18@gmail.com');
});
