"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { deliveryFeeMinor, priceCart, readCart, PICKUP_ADDRESS } from "@/lib/checkout.mjs";
import styles from "./checkout.module.css";

const formatMoney = (minor) => `₦${(minor / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

export default function Checkout() {
  const router = useRouter();
  const attemptId = useRef(null);
  const [lines, setLines] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [delivery, setDelivery] = useState({ method: "pickup", address: "", city: "", state: "" });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const wasCancelled = new URLSearchParams(window.location.search).has("cancelled");
      setCancelled(wasCancelled);
      if (wasCancelled) {
        try {
          const pendingId = sessionStorage.getItem("es_pending_order");
          if (pendingId) {
            router.replace(`/checkout/success?order_id=${encodeURIComponent(pendingId)}`);
            return;
          }
        } catch { /* Browser storage may be unavailable. */ }
      }
      try {
        const saved = readCart();
        if (!saved.length) return;
        const quantities = new Map();
        saved.forEach((item) => quantities.set(item.id, (quantities.get(item.id) || 0) + 1));
        const { data, error: fetchError } = await supabase.from("products").select("id,name,price,sale_price,is_active").in("id", [...quantities.keys()]);
        if (fetchError) throw fetchError;
        const priced = priceCart([...quantities].map(([productId, quantity]) => ({ productId, quantity })), data || []);
        if (mounted) { setLines(priced.lines); setSubtotal(priced.subtotalMinor); }
      } catch (err) {
        if (mounted) setError(err.message || "Unable to load your cart. Please return to the shop.");
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [router]);

  const changeCustomer = (event) => {
    attemptId.current = null;
    setCustomer({ ...customer, [event.target.name]: event.target.value });
  };
  const chooseDelivery = (method) => {
    attemptId.current = null;
    setDelivery({ ...delivery, method, city: method === "yenagoa" ? "Yenagoa" : "", state: method === "yenagoa" ? "Bayelsa" : "" });
  };
  const changeAddress = (event) => {
    attemptId.current = null;
    setDelivery({ ...delivery, [event.target.name]: event.target.value });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (submitting || uncertain || !lines.length) return;
    setSubmitting(true);
    setError("");
    attemptId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attemptId.current, items: lines.map(({ productId, quantity }) => ({ productId, quantity })), customer, delivery }),
      });
      const result = await response.json();
      if (!response.ok) {
        setReference(result.orderId || "");
        setUncertain(Boolean(result.uncertain));
        throw new Error(result.error || "Unable to start payment.");
      }
      if (result.paid) { router.push(`/checkout/success?order_id=${result.orderId}`); return; }
      try { sessionStorage.setItem("es_pending_order", result.orderId); } catch { /* Receipt remains available after the provider redirect. */ }
      window.location.assign(result.checkoutUrl);
    } catch (err) { setError(err.message || "Connection lost. Try again to resume this checkout."); }
    finally { setSubmitting(false); }
  };
  const shipping = deliveryFeeMinor(delivery.method);

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/ready-to-wear">← Back to the shop</Link>
      <h1>Checkout</h1>
      <p className={styles.lede}>Your pieces, your details, and a secure payment.</p>
      {loading ? <p role="status">Loading your cart…</p> : <>
        {cancelled && <p className={styles.notice} role="status">You returned from payment. Your cart is saved. If you already paid, check your order status before starting another payment.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {reference && <p className={styles.reference}>Order reference: {reference}. <Link href={`/checkout/success?order_id=${reference}`}>Check order status</Link></p>}
        {uncertain && <p>Contact the shop on <a href="tel:+2348166361710">08166361710</a> with your order reference.</p>}
        {!lines.length ? <p>Your cart is empty or contains an unavailable item. <Link href="/ready-to-wear">Return to the shop</Link>.</p> :
          <div className={styles.grid}>
            <form className={styles.form} onSubmit={submit}>
              <fieldset disabled={submitting || uncertain}>
                <legend>Your details</legend>
                <label>Full name<input name="name" autoComplete="name" value={customer.name} onChange={changeCustomer} maxLength={100} required /></label>
                <label>Email<input name="email" type="email" autoComplete="email" value={customer.email} onChange={changeCustomer} maxLength={254} required /></label>
                <label>Phone number<input name="phone" type="tel" autoComplete="tel" value={customer.phone} onChange={changeCustomer} placeholder="08012345678" required /></label>
              </fieldset>
              <fieldset disabled={submitting || uncertain}>
                <legend>Delivery or pickup</legend>
                {[["pickup", "Pickup — Free"], ["yenagoa", "Delivery within Yenagoa — Free"], ["outside_yenagoa", "Delivery outside Yenagoa — ₦2,000"]].map(([method, label]) =>
                  <label key={method} className={styles.option}><input type="radio" name="deliveryMethod" value={method} checked={delivery.method === method} onChange={() => chooseDelivery(method)} />{label}</label>)}
                {delivery.method === "pickup" ? <p className={styles.hint}>Pickup location: {PICKUP_ADDRESS}.</p> : <>
                  <label>Street address<textarea name="address" autoComplete="street-address" value={delivery.address} onChange={changeAddress} maxLength={300} required /></label>
                  <label>City<input name="city" autoComplete="address-level2" value={delivery.city} onChange={changeAddress} readOnly={delivery.method === "yenagoa"} maxLength={100} required /></label>
                  <label>State<input name="state" autoComplete="address-level1" value={delivery.state} onChange={changeAddress} readOnly={delivery.method === "yenagoa"} maxLength={100} required /></label>
                  <p className={styles.hint}>Delivery addresses in Nigeria.</p>
                </>}
              </fieldset>
              <p className={styles.hint}>By continuing, you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>. Bachs securely processes your payment.</p>
              <button className={styles.button} type="submit" disabled={submitting || uncertain}>{submitting ? "Opening secure payment…" : `Pay ${formatMoney(subtotal + shipping)}`}</button>
            </form>
            <aside className={styles.summary} aria-label="Order summary">
              <h2>Your order</h2>
              {lines.map((line) => <p className={styles.line} key={line.productId}><span>{line.name} × {line.quantity}</span><span>{formatMoney(line.lineAmountMinor)}</span></p>)}
              <p className={styles.line}><span>Subtotal</span><span>{formatMoney(subtotal)}</span></p>
              <p className={styles.line}><span>{delivery.method === "pickup" ? "Pickup" : "Delivery"}</span><span>{shipping ? formatMoney(shipping) : "Free"}</span></p>
              <p className={`${styles.line} ${styles.total}`}><span>Total</span><span>{formatMoney(subtotal + shipping)}</span></p>
              <p className={styles.hint}>Prices are checked again before payment. Your payment details are handled by Bachs.</p>
            </aside>
          </div>}
      </>}
    </main>
  );
}
