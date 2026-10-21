'use client';
import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/clientApi';
import styles from '../adminShell.module.css';
import local from './requests.module.css';

export default function ProductRequestsAdmin() {
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(`/api/admin/product-requests?page=${page}`, { signal: controller.signal }).then(result => { setRequests(result.requests); setTotal(result.total); setError(''); }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page]);
  const retry = async request => {
    setBusy(request.id); setError('');
    try {
      await authenticatedFetch('/api/admin/product-requests', { method: 'POST', body: JSON.stringify({ id: request.id }) });
      setRequests(current => current.map(item => item.id === request.id ? { ...item, email_sent_at: new Date().toISOString() } : item));
    } catch (error) { setError(error.message); }
    finally { setBusy(null); }
  };
  return <>
    <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>Product size & colour requests</h1><p className={styles.pageSub}>Customer requests are saved here and emailed to elegantyoufashion18@gmail.com.</p></div></div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading requests…</p> : requests.length ? requests.map(request => <article className={local.card} key={request.id}>
      <h2>{request.product_name}</h2><p>{new Date(request.created_at).toLocaleString('en-GB')}</p>
      <dl><dt>Customer</dt><dd>{request.customer_name}</dd><dt>Email</dt><dd><a href={`mailto:${request.customer_email}`}>{request.customer_email}</a></dd><dt>Phone</dt><dd>{request.customer_phone}</dd><dt>Requested size</dt><dd>{request.requested_size || 'Current size'}</dd><dt>Requested colour</dt><dd>{request.requested_colour || 'Current colour'}</dd><dt>Details</dt><dd>{request.details || 'None'}</dd><dt>Reference</dt><dd>{request.id}</dd></dl>
      <p>{request.email_sent_at ? 'Admin email accepted by the email service.' : 'Admin email is pending or could not be sent.'}</p>
      {!request.email_sent_at && <button className={styles.btn} type="button" disabled={busy !== null} onClick={() => retry(request)}>{busy === request.id ? 'Sending…' : 'Retry email notification'}</button>}
    </article>) : <p>No product requests yet.</p>}
    {total > 25 && <div className={styles.actions}><button className={styles.btn} disabled={page === 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button><span>Page {page} of {Math.ceil(total / 25)}</span><button className={styles.btn} disabled={page * 25 >= total} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button></div>}
  </>;
}
