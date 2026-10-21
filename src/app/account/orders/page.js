"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/clientApi";
import { writeCart, readCart } from "@/lib/checkout.mjs";
import { availableSizes, productHref } from "@/lib/products.mjs";
import { repurchaseCart } from "@/lib/accountContracts.mjs";
import { supabase } from "@/lib/supabaseClient";
import styles from "../../admin/adminShell.module.css";
import account from "../account.module.css";

const money = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

export default function AccountOrders() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [description, setDescription] = useState("");
  const [received, setReceived] = useState(false);
  const requestId = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(`/api/account/orders?page=${page}`, { signal: controller.signal }).then((result) => {
      setOrders(result.orders); setTotal(result.total); setError("");
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page]);

  async function repurchase(item) {
    setError(""); setMessage(""); setBusy(true);
    try {
      const { data, error: productError } = await supabase.from("products").select("id,slug,available_sizes").eq("id", item.productId).eq("is_active", true).maybeSingle();
      if (productError) throw new Error("Unable to check availability. Try again.");
      if (!data) throw new Error("This product is no longer available.");
      if (!item.size || !availableSizes(data).includes(item.size)) { window.location.assign(productHref(data)); return; }
      writeCart(repurchaseCart(readCart(), item.productId, item.size));
      setMessage(`${item.name} added to your cart. Current prices apply at checkout.`);
    } catch (err) { setError(err.message || "Your cart could not be saved."); }
    finally { setBusy(false); }
  }

  function openRequest(kind, order, item) {
    setSelected({ kind, order, item }); setDescription(""); setReceived(false); setError(""); setMessage(""); requestId.current = crypto.randomUUID();
  }

  async function submitRequest(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await authenticatedFetch("/api/account/requests", { method: "POST", body: JSON.stringify({ id: requestId.current, kind: selected.kind, orderId: selected.order.id, productId: selected.item.productId, description, received }) });
      setMessage(result.duplicate ? "A request for this product has already been submitted. View it in Refunds & complaints." : "Your request has been saved. You can follow its progress in Refunds & complaints.");
      setSelected(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>My orders</h1><p className={styles.pageSub}>Your paid ready-to-wear purchases and order progress.</p></div></div>
    <p className={account.hint}>Your purchases are linked to your verified account email. <Link href="/account/requests">View refunds & complaints</Link>.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={account.success} role="status">{message} <Link href="/checkout">Go to checkout</Link></p>}
    {loading ? <p role="status">Loading your orders…</p> : !orders.length ? <p className={styles.empty}>No paid orders match this account email yet. <Link href="/ready-to-wear">Visit the shop</Link>.</p> : <div className={account.stack}>
      {orders.map((order) => <article className={styles.card} key={order.id}>
        <h2 className={styles.cardTitle}>{new Date(order.created_at).toLocaleDateString("en-GB")}: {money(order.total_minor)}</h2>
        <p className={account.reference}>Order {order.id}</p><p>Payment: {order.payment_status} · Order progress: {order.fulfillment_status}</p>
        {order.customer_received_at && <p className={account.success}>You confirmed receipt on {new Date(order.customer_received_at).toLocaleString("en-GB")}.</p>}
        {order.items.map((item) => <div className={account.item} key={`${item.productId}:${item.size || ''}`}><h3>{item.name}{item.size && ` · Size ${item.size}`}</h3><p>{item.quantity} × {money(item.unitAmountMinor)} · {money(item.lineAmountMinor)}</p>
          <div className={account.actions}><button className={styles.btn} type="button" disabled={busy} onClick={() => repurchase(item)}>Buy again</button><button className={styles.btn} type="button" disabled={busy} onClick={() => openRequest("refund", order, item)}>Request refund</button><button className={styles.btn} type="button" disabled={busy} onClick={() => openRequest("complaint", order, item)}>Make a complaint</button></div>
        </div>)}
      </article>)}
    </div>}
    {selected && <section className={account.panel} aria-labelledby="request-heading"><h2 id="request-heading">{selected.kind === "refund" ? "Request a refund" : "Complain about a received product"}</h2><p>{selected.item.name}</p>
      <form className={account.form} onSubmit={submitRequest}>
        <label>{selected.kind === "refund" ? "Reason for the refund request" : "Describe your complaint"}<textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={2000} required disabled={busy} /></label>
        {selected.kind === "complaint" && <label className={account.check}><input type="checkbox" checked={received} onChange={(event) => setReceived(event.target.checked)} required disabled={busy} />I confirm I received this product.</label>}
        {selected.kind === "refund" && <p className={account.hint}>The shop reviews each request. Approval does not itself issue a payment refund; the shop arranges any refund through Bachs.</p>}
        <div className={account.actions}><button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Submitting…" : "Submit request"}</button><button type="button" className={styles.btn} disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div>
      </form>
    </section>}
    {total > 20 && <nav className={account.pagination} aria-label="Order pages"><button className={styles.btn} disabled={page === 1 || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>Previous</button><span>{page} / {Math.ceil(total / 20)}</span><button className={styles.btn} disabled={page * 20 >= total || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>Next</button></nav>}
  </>;
}
