"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../../checkout/checkout.module.css";
import account from "../../account/account.module.css";

export default function ReceiptConfirmation({ orderId }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy || !confirmed) return;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!/^[a-f0-9]{64}$/.test(token || "")) { setError("Open the personal confirmation link in the email we sent when your order shipped."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/checkout/orders/${encodeURIComponent(orderId)}/received`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ token, confirmed: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your confirmation could not be saved.");
      setResult(data);
    } catch (err) { setError(err.message || "Connection lost. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className={`${styles.page} ${styles.receipt}`}>
    <Link className={styles.back} href="/ready-to-wear">← Back to the shop</Link>
    <h1>{result ? "Receipt confirmed" : "Have you received your order?"}</h1>
    {result ? <div className={account.success} role="status"><p>{result.alreadyConfirmed ? "You have already confirmed receipt of this order." : "Thank you. Your confirmation has been saved and the shop can see that you received your order."}</p><p>Confirmed on {new Date(result.receivedAt).toLocaleString("en-GB")}.</p></div> : <>
      <p className={styles.lede}>Only confirm after you have received every product in this order. You do not need to sign in.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <form className={account.form} onSubmit={submit}>
        <label className={account.check}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} required />I confirm that I have received every product in this order.</label>
        <button className={styles.button} type="submit" disabled={busy || !confirmed}>{busy ? "Saving confirmation…" : "I have received the product"}</button>
      </form>
    </>}
    <p className={styles.lede}>If anything is missing, damaged, or incorrect, contact the shop on <a href="tel:+2348166361710">08166361710</a>. Confirming receipt does not prevent you from reporting a product problem.</p>
  </main>;
}
