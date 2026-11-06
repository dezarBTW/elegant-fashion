"use client";
import {useEffect,useState} from 'react';
import {authenticatedFetch} from '@/lib/clientApi';
import styles from '@/components/marketplace.module.css';
export default function Vendors(){
 const [email,setEmail]=useState(''),[users,setUsers]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();authenticatedFetch('/api/admin/vendors',{signal:controller.signal}).then(result=>setUsers(result.users)).catch(error=>{if(!controller.signal.aborted)setMessage(error.message);});return()=>controller.abort();},[]);
 async function load(query=''){setBusy(true);setMessage('');try{const result=await authenticatedFetch(`/api/admin/vendors?email=${encodeURIComponent(query)}`);setUsers(result.users);}catch(error){setMessage(error.message);}finally{setBusy(false);}}
 return <div className={styles.panel}><h1>Approved vendors</h1><p>Vendor access is managed offline. Enable or disable is_vendor on the user record in Supabase.</p><form onSubmit={event=>{event.preventDefault();load(email);}}><label>Find vendor by email<input type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><button disabled={busy}>Search</button><button type="button" disabled={busy} onClick={()=>{setEmail('');load();}}>Show approved vendors</button></form><p role="status">{message}</p>{users.map(user=><article key={user.id}><h2>{user.email}</h2><p>Vendor ID: {user.id}</p><p>Account: {user.is_active?'Active':'Inactive'}</p></article>)}</div>;
}
