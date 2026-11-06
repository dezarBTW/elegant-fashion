import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const base=process.env.VENDOR_TEST_URL||'http://localhost:3000';
const created=[];const productId=randomUUID();
async function account(admin=false){
 const email=`vendor-qa-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex');
 const result=await db.auth.admin.createUser({email,password,email_confirm:true});if(result.error)throw result.error;
 created.push(result.data.user.id);
 const saved=await db.from('users').update({is_admin:admin,is_active:true}).eq('id',result.data.user.id);if(saved.error)throw saved.error;
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;
 return {id:result.data.user.id,email,token:login.data.session.access_token};
}
async function request(path,user,body,method=body?'POST':'GET'){
 const response=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(user?{Authorization:`Bearer ${user.token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,data:await response.text().then(text=>text?JSON.parse(text):{})};
}
try{
 const admin=await account(true),vendor=await account(),other=await account();
 const untrusted=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${other.token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const promotion=await untrusted.from('users').update({is_vendor:true}).eq('id',other.id);assert.ok(promotion.error,'A customer must not grant vendor access');
 assert.equal((await request('/api/vendor/products')).status,401);
 assert.equal((await request('/api/admin/vendors',vendor)).status,403);
 const approved=await db.from('users').update({is_vendor:true}).eq('id',vendor.id);if(approved.error)throw approved.error;
 const input={id:productId,revision:null,product:{name:'Temporary API test',price:100,category:'Dresses',gender:'female',description:'Temporary API permission test',image:null},quantities:{S:2,M:0,L:0,XL:0,XXL:0}};
 assert.equal((await request('/api/vendor/products',vendor,input)).status,200);
 assert.equal((await request('/api/vendor/products',other,input)).status,403);
 const list=await request('/api/vendor/products',vendor);assert.equal(list.status,200);assert.ok(list.data.products.some(product=>product.id===productId));
 const conflict=await request('/api/vendor/products',vendor,{...input,revision:999});assert.equal(conflict.status,409,JSON.stringify(conflict.data));
 assert.equal((await request('/api/vendor/products',vendor,{id:productId},'DELETE')).status,200);
 const removed=await db.from('products').select('is_active').eq('id',productId).single();assert.equal(removed.data.is_active,false);
 const directory=await request('/api/admin/vendors',admin);assert.equal(directory.status,200);assert.ok(directory.data.users.some(u=>u.id===vendor.id));assert.ok(directory.data.users.every(u=>u.is_vendor===true));
 assert.equal((await request('/api/account/vendor',vendor,{accept:true,version:'2026-11-05'})).status,405);
 assert.equal((await request('/api/admin/vendors',admin,{email:vendor.email,action:'invite'})).status,405);
 const revoked=await db.from('users').update({is_vendor:false}).eq('id',vendor.id);if(revoked.error)throw revoked.error;
 assert.equal((await request('/api/vendor/products',vendor,input)).status,403);
 const afterRevocation=await request('/api/admin/vendors',admin);assert.ok(!afterRevocation.data.users.some(u=>u.id===vendor.id));
 console.log('Vendor API permission, stock-conflict, removal and revocation checks passed.');
}finally{
 await db.from('products').delete().eq('id',productId);
 for(const id of created){
  const result=await db.auth.admin.deleteUser(id);if(result.error)console.error('Temporary account cleanup needs review:',result.error.message); else await db.from('users').delete().eq('id',id);
 }
}
