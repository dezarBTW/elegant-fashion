"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { PICKUP_ADDRESS } from "@/lib/checkout.mjs";
import { PAYMENT_STATUSES, FULFILLMENT_STATUSES, nextFulfillmentStatuses } from "@/lib/orderManagement.mjs";
import { formatDateTime } from "../adminUtils";
import styles from "../adminShell.module.css";
import orderStyles from "./orders.module.css";

const money = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const deliveryLabel = (method) => method === "pickup" ? "Shop pickup" : method === "yenagoa" ? "Delivery within Yenagoa" : "Delivery outside Yenagoa";

async function adminHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Your session has expired. Please sign in again.");
  return { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
}

export default function Orders() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [payment, setPayment] = useState("all");
  const [fulfillment, setFulfillment] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    let mounted = true;
    const controller = new AbortController();
    const load = async () => {
      let repaging = false;
      try {
        const headers = await adminHeaders();
        if (!mounted) return;
        const query = new URLSearchParams({ payment, fulfillment, page: String(page) });
        const response = await fetch(`/api/admin/orders?${query}`, { headers, cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load orders.");
        if (mounted) {
          setTotal(result.total);
          setPageSize(result.pageSize);
          const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
          if (page > lastPage) { repaging = true; setPage(lastPage); return; }
          setOrders(result.orders);
          setError("");
        }
      } catch (err) {
        if (mounted) { setError(err.message || "Unable to load orders."); setOrders([]); setTotal(0); }
      } finally { if (mounted && !repaging) setLoading(false); }
    };
    load();
    return () => { mounted = false; controller.abort(); };
  }, [isAdmin, authLoading, payment, fulfillment, page, refresh]);

  const updateStatus = async (order, fulfillment_status) => {
    if (saving) return;
    setSaving(order.id);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH", headers: await adminHeaders(),
        body: JSON.stringify({ id: order.id, expected_status: order.fulfillment_status, fulfillment_status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update this order.");
      setLoading(true);
      setRefresh((value) => value + 1);
    } catch (err) { setError(err.message || "Unable to update this order."); }
    finally { setSaving(""); }
  };
  const changeFilter = (setFilter, value) => { setFilter(value); setPage(1); setLoading(true); };
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className={styles.pageHeader}>
        <div><h1 className={styles.pageTitle}>Shop orders</h1><p className={styles.pageSub}>Manage paid orders. Payments under review must be checked in Bachs before fulfilment.</p></div>
        <button type="button" className={styles.btn} disabled={loading || Boolean(saving)} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh orders</button>
      </div>
      <div className={styles.toolbar}>
        <label className={orderStyles.filter}>Payment status
          <select className={styles.selectField} value={payment} disabled={Boolean(saving)} onChange={(event) => changeFilter(setPayment, event.target.value)}>
            <option value="all">All payments</option>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className={orderStyles.filter}>Fulfilment status
          <select className={styles.selectField} value={fulfillment} disabled={Boolean(saving)} onChange={(event) => changeFilter(setFulfillment, event.target.value)}>
            <option value="all">All fulfilment statuses</option>{FULFILLMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? <p className={styles.empty} role="status">Loading orders…</p> : <>
        <p className={styles.resultCount}>{total} matching {total === 1 ? "order" : "orders"} · newest first</p>
        {!orders.length ? <p className={styles.empty}>No orders match these filters.</p> : <div className={styles.list}>
          {orders.map((order) => {
            const review = order.payment_status === "review";
            const nextStatuses = nextFulfillmentStatuses(order.fulfillment_status, order.delivery?.method);
            return (
              <article className={`${styles.card} ${review ? orderStyles.review : ""}`} key={order.id}>
                <div className={styles.cardTop}>
                  <div><h2 className={styles.cardTitle}>{order.customer_name} — {money(order.total_minor)}</h2>
                    <p className={`${styles.meta} ${orderStyles.reference}`}>Reference: {order.id}</p>
                    <p className={styles.meta}>{formatDateTime(order.created_at)} · {deliveryLabel(order.delivery?.method)}</p>
                  </div>
                  <div className={styles.statusPills}>
                    <span className={`${styles.badge} ${review ? styles.badgeDeclined : order.payment_status === "paid" ? styles.badgeConfirmed : styles.badgePending}`}>Payment: {order.payment_status}</span>
                    <span className={styles.badge}>Fulfilment: {order.fulfillment_status}</span>
                  </div>
                </div>
                {review && <p className={orderStyles.reviewMessage}>Payment needs a manual check: the amount or currency did not match. Do not fulfil this order yet.</p>}
                <details className={orderStyles.details}>
                  <summary>View order details</summary>
                  <dl className={styles.detailGrid}>
                    <div><dt className={styles.detailLabel}>Customer</dt><dd className={styles.detailValue}>{order.customer_name}</dd></div>
                    <div><dt className={styles.detailLabel}>Email</dt><dd className={styles.detailValue}><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></dd></div>
                    <div><dt className={styles.detailLabel}>Phone</dt><dd className={styles.detailValue}><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></dd></div>
                    <div><dt className={styles.detailLabel}>{order.delivery?.method === "pickup" ? "Pickup address" : "Delivery address"}</dt>
                      <dd className={styles.detailValue}>{order.delivery?.method === "pickup" ? PICKUP_ADDRESS : [order.delivery?.address, order.delivery?.city, order.delivery?.state].filter(Boolean).join(", ")}</dd></div>
                    <div><dt className={styles.detailLabel}>Paid at</dt><dd className={styles.detailValue}>{order.paid_at ? formatDateTime(order.paid_at) : "Not confirmed"}</dd></div>
                  </dl>
                  <div className={orderStyles.tableWrap}><table className={orderStyles.table}>
                    <caption>Order items</caption><thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead>
                    <tbody>{(order.items || []).map((item, index) => <tr key={`${item.productId || "item"}-${index}`}><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.unitAmountMinor)}</td><td>{money(item.lineAmountMinor)}</td></tr>)}</tbody>
                  </table></div>
                  <p>Subtotal: {money(order.subtotal_minor)} · Delivery / pickup: {money(order.shipping_minor)} · <strong>Total: {money(order.total_minor)}</strong></p>
                </details>
                <div className={styles.actions}>
                  {order.payment_status === "paid" ? nextStatuses.length ? nextStatuses.map((status) => <button type="button" key={status} className={`${styles.btn} ${styles.btnPrimary}`} disabled={Boolean(saving)} onClick={() => updateStatus(order, status)}>{saving === order.id ? "Saving…" : `Mark ${status}`}</button>) : <span className={styles.meta}>Fulfilment completed.</span> : <span className={styles.meta}>Fulfilment is locked until payment is confirmed.</span>}
                </div>
              </article>
            );
          })}
        </div>}
        <nav className={`${styles.actions} ${orderStyles.pagination}`} aria-label="Order pages">
          <button type="button" className={styles.btn} disabled={page <= 1 || Boolean(saving)} onClick={() => { setPage((value) => value - 1); setLoading(true); }}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className={styles.btn} disabled={page >= pages || Boolean(saving)} onClick={() => { setPage((value) => value + 1); setLoading(true); }}>Next</button>
        </nav>
      </>}
    </>
  );
}
