"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/clientApi";
import { REQUEST_STATUSES } from "@/lib/accountContracts.mjs";
import styles from "@/app/admin/adminShell.module.css";
import account from "@/app/account/account.module.css";

export default function SupportRequests({ admin = false }) {
  const [kind, setKind] = useState("refund");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ requests: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const endpoint = admin ? "/api/admin/customer-requests" : "/api/account/requests";

  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(`${endpoint}?kind=${kind}&page=${page}`, { signal: controller.signal }).then((data) => {
      setResult(data); setError("");
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, kind, page, refresh]);

  async function update(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await authenticatedFetch(endpoint, { method: "PATCH", body: JSON.stringify({ id: selected.id, kind, expectedStatus: selected.status, status, response }) });
      setSelected(null); setLoading(true); setRefresh((value) => value + 1);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>Refunds & complaints</h1><p className={styles.pageSub}>{admin ? "Review customer requests and send a response." : "Follow your requests and the shop's responses."}</p></div><button className={styles.btn} type="button" disabled={loading || busy} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh</button></div>
    <div className={styles.tabs} aria-label="Request types">{["refund", "complaint"].map((value) => <button key={value} type="button" className={`${styles.tab} ${kind === value ? styles.tabActive : ""}`} aria-pressed={kind === value} disabled={busy} onClick={() => { setKind(value); setPage(1); setSelected(null); setLoading(true); }}>{value === "refund" ? "Refund requests" : "Complaints"}</button>)}</div>
    <p className={account.hint}>{kind === "refund" ? "Approval records the shop's decision. Payment refunds must be arranged separately through Bachs." : "Complaints concern products the customer confirms they received."}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading ? <p role="status">Loading requests…</p> : !result.requests.length ? <p className={styles.empty}>No requests found.</p> : <div className={account.stack}>{result.requests.map((entry) => <article className={styles.card} key={entry.id}>
      <h2 className={styles.cardTitle}>{entry.product_name}</h2><p>Status: <strong>{entry.status.replaceAll("_", " ")}</strong></p>
      <p className={account.reference}>Request {entry.id}<br />Order {entry.order_id} · {new Date(entry.created_at).toLocaleDateString("en-GB")}</p>
      {admin && entry.order && <p className={account.message}><strong>Customer:</strong> {entry.order.customer_name}<br />{entry.order.customer_email}<br />{entry.order.customer_phone}</p>}
      <p className={account.message}>{entry.description}</p>{entry.response && <p className={account.message}><strong>Shop response:</strong> {entry.response}</p>}
      {admin && ["pending", "in_review"].includes(entry.status) && <button type="button" className={styles.btn} disabled={busy} onClick={() => { setSelected(entry); setStatus(REQUEST_STATUSES[kind].find((value) => value !== "pending" && value !== entry.status)); setResponse(entry.response || ""); }}>Review request</button>}
    </article>)}</div>}
    {selected && <section className={account.panel} aria-labelledby="review-request-title"><h2 id="review-request-title">Review {selected.product_name}</h2><form className={account.form} onSubmit={update}>
      <label>New status<select value={status} onChange={(event) => setStatus(event.target.value)} disabled={busy}>{REQUEST_STATUSES[kind].filter((value) => value !== "pending" && value !== selected.status).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <label>Response to the customer<textarea value={response} onChange={(event) => setResponse(event.target.value)} maxLength={2000} disabled={busy} /></label>
      <div className={account.actions}><button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Saving…" : "Save and notify customer"}</button><button type="button" className={styles.btn} disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div>
    </form></section>}
    {result.total > result.pageSize && <nav className={account.pagination} aria-label="Request pages"><button className={styles.btn} disabled={page === 1 || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>Previous</button><span>{page} / {Math.ceil(result.total / result.pageSize)}</span><button className={styles.btn} disabled={page * result.pageSize >= result.total || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>Next</button></nav>}
  </>;
}
