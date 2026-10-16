"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "../adminUtils";
import styles from "../adminShell.module.css";

const money = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

export default function Orders() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (!isAdmin) return;
    supabase.from("shop_orders").select("id,created_at,customer_name,customer_email,customer_phone,items,delivery,total_minor,shipping_minor,payment_status,fulfillment_status").order("created_at", { ascending: false }).limit(100).then(({ data, error: fetchError }) => {
      if (!mounted) return;
      setError(fetchError ? "Unable to load orders. Check that the checkout database migration has been applied." : "");
      setOrders(data || []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [isAdmin, refresh]);

  const updateStatus = async (id, fulfillment_status) => {
    setSaving(id);
    const { data, error: saveError } = await supabase.from("shop_orders").update({ fulfillment_status }).eq("id", id).eq("payment_status", "paid").select("id,fulfillment_status").single();
    if (saveError || !data) setError("Unable to update this order. Only paid orders can be fulfilled.");
    else { setOrders((current) => current.map((order) => order.id === id ? { ...order, fulfillment_status: data.fulfillment_status } : order)); setError(""); }
    setSaving("");
  };

  return (
    <>
      <h1 className={styles.pageTitle}>Shop orders</h1>
      <p className={styles.pageSub}>Prepare and fulfil orders marked paid. Pending or review orders need payment confirmation first.</p>
      <div className={styles.toolbar}><button type="button" className={styles.btn} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh orders</button></div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading orders…</p> : <div className={styles.list}>
        {!orders.length && <p>No orders yet.</p>}
        {orders.map((order) => <article className={styles.card} key={order.id}>
          <h2>{order.customer_name} — {money(order.total_minor)}</h2>
          <p>{formatDateTime(order.created_at)} · Payment: <strong>{order.payment_status}</strong></p>
          <p style={{ overflowWrap: "anywhere" }}>Reference: {order.id}</p>
          <p><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a> · <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></p>
          <ul>{order.items.map((item) => <li key={item.productId}>{item.name} × {item.quantity} — {money(item.lineAmountMinor)}</li>)}</ul>
          <p>{order.delivery.method === "pickup" ? "Shop pickup" : `Deliver to: ${order.delivery.address}, ${order.delivery.city}, ${order.delivery.state}. Delivery: ${Number(order.shipping_minor) ? money(order.shipping_minor) : "Free"}`}</p>
          <label>Fulfilment status <select value={order.fulfillment_status} disabled={order.payment_status !== "paid" || saving === order.id} onChange={(event) => updateStatus(order.id, event.target.value)}>
            <option value="new">New</option><option value="ready">Ready / dispatched</option><option value="completed">Completed</option>
          </select></label>
        </article>)}
      </div>}
    </>
  );
}
