'use client';
import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/clientApi';
import styles from '../adminShell.module.css';
export default function Vendors() {
  const [email, setEmail] = useState('');
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function load(query = '') {
    setBusy(true);
    try { const result = await authenticatedFetch(`/api/admin/vendors?email=${encodeURIComponent(query)}`); setUsers(result.users); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { const controller=new AbortController(); authenticatedFetch('/api/admin/vendors',{signal:controller.signal}).then(result=>setUsers(result.users)).catch(error=>{if(!controller.signal.aborted)setMessage(error.message);}); return ()=>controller.abort(); }, []);
  async function change(user, action) {
    setBusy(true); setMessage('');
    try {
      const result = await authenticatedFetch('/api/admin/vendors', { method: 'POST', body: JSON.stringify({ email: user.email, action }) });
      setMessage(result.emailSent === false ? 'Invitation saved, but email delivery failed. You can resend the invitation.' : 'Vendor status updated.');
      await load(email);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <><h1>Vendors</h1><form onSubmit={event => { event.preventDefault(); load(email); }}><label>Find account by email<input type="email" value={email} onChange={event => setEmail(event.target.value)} /></label><button className={styles.btn} disabled={busy}>Search</button><button className={styles.btn} type="button" disabled={busy} onClick={() => { setEmail(''); load(); }}>Show accounts</button></form><p role="status">{message}</p>{users.map(user => <article className={styles.card} key={user.id}><h2>{user.email}</h2><p>Vendor status: {user.vendor.status}</p><p>Accepted terms: {user.vendor.accepted_terms_version || 'None'}</p><button className={styles.btn} disabled={busy || !user.is_active || user.vendor.status === 'active'} onClick={() => change(user, 'invite')}>Invite / resend invitation</button><button className={styles.btn} disabled={busy || ['not_invited', 'revoked'].includes(user.vendor.status)} onClick={() => change(user, 'revoke')}>Revoke vendor access</button></article>)}</>;
}
