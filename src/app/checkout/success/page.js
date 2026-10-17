"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CART_KEY, readCart, subtractPurchasedItems, PICKUP_ADDRESS } from "@/lib/checkout.mjs";
import styles from "../checkout.module.css";
import { PaymentStatusSkeleton } from "../CheckoutSkeleton";

const money = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

function removePurchasedItems(order) {
  try {
    if (localStorage.getItem(`es_paid_${order.id}`)) return;
    const remaining = subtractPurchasedItems(readCart(), order.items);
    localStorage.setItem(CART_KEY, JSON.stringify(remaining));
    localStorage.setItem(`es_paid_${order.id}`, "1");
    sessionStorage.removeItem("es_pending_order");
  } catch { /* Payment confirmation is independent of browser storage. */ }
}

export default function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timer;
    let attempts = 0;
    const id = new URLSearchParams(window.location.search).get("order_id");
    const check = async () => {
      try {
        if (!id) throw new Error("No order reference was provided.");
        const response = await fetch(`/api/checkout/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to check your order.");
        if (!mounted) return;
        setOrder(data);
        setError("");
        if (data.paymentStatus === "paid") removePurchasedItems(data);
        else if (data.paymentStatus === "pending" && ++attempts < 20) timer = setTimeout(check, 3000);
      } catch (err) { if (mounted) setError(err.message || "Unable to check your payment."); }
      finally { if (mounted) setChecking(false); }
    };
    check();
    return () => { mounted = false; clearTimeout(timer); };
  }, [reload]);

  const paid = order?.paymentStatus === "paid";
  if (checking && !order && !error) return <PaymentStatusSkeleton />;

  return (
    <main className={`${styles.page} ${styles.receipt}`}>
      <Link className={styles.back} href="/ready-to-wear">← Back to the shop</Link>
      <h1>{paid ? "Payment confirmed" : order?.paymentStatus === "review" ? "Payment needs a review" : "Checking your payment"}</h1>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {checking && <p role="status">Checking your order…</p>}
      {order && <>
        <p className={styles.lede} role="status">{paid ? "Thank you. Your order is paid and has been received by Elegant Style." : order.paymentStatus === "review" ? "The payment details need to be checked by the shop. Please contact us before making another payment." : "We are waiting for payment confirmation from Bachs. If you have paid, please do not pay again."}</p>
        <p className={styles.reference}>Order reference: <strong>{order.id}</strong></p>
        <section className={styles.summary} aria-label="Order details">
          <h2>Your order</h2>
          {order.items.map((item) => <p className={styles.line} key={item.productId}><span>{item.name} × {item.quantity}</span><span>{money(item.lineAmountMinor)}</span></p>)}
          <p className={styles.line}><span>{order.method === "pickup" ? "Pickup" : "Delivery"}</span><span>{Number(order.shippingMinor) ? money(order.shippingMinor) : "Free"}</span></p>
          <p className={`${styles.line} ${styles.total}`}><span>Total</span><span>{money(order.totalMinor)}</span></p>
        </section>
        {paid && <p className={styles.lede}>{order.method === "pickup" ? `Pickup location: ${PICKUP_ADDRESS}. The shop will contact you when your order is ready.` : "The shop will contact you to arrange delivery."}</p>}
      </>}
      {!paid && <button className={styles.button} type="button" disabled={checking} onClick={() => { setChecking(true); setReload((value) => value + 1); }}>Check payment status</button>}
      {order?.checkoutUrl && <p className={styles.reference}>Haven&apos;t paid yet? <a href={order.checkoutUrl}>Resume this payment</a>. If you have paid, wait for confirmation.</p>}
      <p className={styles.lede}>Need help? Call <a href="tel:+2348166361710">08166361710</a> and quote your order reference.</p>
    </main>
  );
}
