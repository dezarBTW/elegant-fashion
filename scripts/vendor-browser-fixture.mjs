import { createClient } from '@supabase/supabase-js';
import { randomUUID,randomBytes } from 'node:crypto';
import { writeFile,readFile,unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const statePath=join(tmpdir(),'elegant-vendor-browser-state.json'),manifestPath=join(tmpdir(),'elegant-vendor-browser-fixture.json');
if(process.argv[2]==='cleanup'){
 const {id}=JSON.parse(await readFile(manifestPath,'utf8'));
 await db.from('vendor_notifications').delete().eq('entity_id',id);
 await db.from('vendor_terms_acceptances').delete().eq('user_id',id);
 await db.from('vendor_accounts').delete().eq('user_id',id);
 const removed=await db.auth.admin.deleteUser(id);if(removed.error)throw removed.error;
 await db.from('users').delete().eq('id',id);
 await unlink(statePath);await unlink(manifestPath);console.log('Browser fixture removed.');
}else{
 const email=`vendor-qa-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex');
 const created=await db.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;
 const id=created.data.user.id;
 await writeFile(manifestPath,JSON.stringify({id}));
 const saved=await db.from('vendor_accounts').insert({user_id:id,status:'pending',invited_at:new Date().toISOString()});if(saved.error)throw saved.error;
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;
 const key=`sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
 await writeFile(statePath,JSON.stringify({cookies:[],origins:[{origin:'http://localhost:3000',localStorage:[{name:key,value:JSON.stringify(login.data.session)}]}]}));
 console.log('Browser fixture state:',statePath);
}
