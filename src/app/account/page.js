"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { authenticatedFetch } from "@/lib/clientApi";
import styles from "../admin/adminShell.module.css";
import account from "./account.module.css";

export default function Account() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [deactivating, setDeactivating] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [methodResult, setMethodResult] = useState(null);
  const deactivationMethod = methodResult?.userId === user?.id ? methodResult.method : null;
  const [deactivationCode, setDeactivationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    authenticatedFetch("/api/account/deactivation").then(result => {
      if (active) setMethodResult({ userId: user.id, method: result.method });
    }).catch(() => {
      if (active) setError("Unable to load account confirmation options. Please refresh the page.");
    });
    return () => { active = false; };
  }, [user?.id]);

  async function changePassword(event) {
    event.preventDefault();
    setError(""); setMessage("");
    if (passwords.next !== passwords.confirm) { setError("The new passwords do not match."); return; }
    setBusy(true);
    try {
      const result = await authenticatedFetch("/api/account", { method: "POST", body: JSON.stringify({ action: "password", currentPassword: passwords.current, newPassword: passwords.next }) });
      setPasswords({ current: "", next: "", confirm: "" }); setMessage(result.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function deactivate(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const confirmation = deactivationMethod === "email-code"
        ? { action: "deactivate_code", code: deactivationCode, confirmed }
        : { action: "deactivate", currentPassword: deactivatePassword, confirmed };
      await authenticatedFetch("/api/account", { method: "POST", body: JSON.stringify(confirmation) });
      logout();
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      router.replace("/sign-in?deactivated=true");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function requestDeactivationCode() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await authenticatedFetch("/api/account/deactivation", { method: "POST" });
      setDeactivationCode("");
      setCodeSent(true);
      setMessage(result.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function cancelDeactivation() {
    setDeactivating(false);
    setDeactivatePassword("");
    setDeactivationCode("");
    setCodeSent(false);
    setConfirmed(false);
    setMessage("");
  }

  return <div className={account.stack}>
    <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>Profile & account</h1><p className={styles.pageSub}>Your details, password, and account access.</p></div></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={account.success} role="status">{message}</p>}
    <section className={styles.card} aria-labelledby="profile-title"><h2 id="profile-title" className={styles.cardTitle}>Your profile</h2>
      <dl className={account.details}><div><dt>Username</dt><dd>{userData?.username || user?.email?.split("@")[0]}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Account status</dt><dd>Active</dd></div></dl>
      <p className={account.hint}>Order history uses the verified email address you supplied at checkout. Contact the shop if an order used another email.</p>
    </section>
    <section className={styles.card} aria-labelledby="password-title"><h2 id="password-title" className={styles.cardTitle}>Change password</h2>
      <p className={account.hint}>{deactivationMethod === "email-code" ? "This Google-connected account can set a password through password recovery if you need one." : "Use at least 8 characters. Need to set or recover a password?"} <Link href="/forgot-password">Reset your password</Link>.</p>
      {deactivationMethod === "password" && <form className={account.form} onSubmit={changePassword}>
        <label>Current password<input type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required maxLength={256} disabled={busy} /></label>
        <label>New password<input type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required minLength={8} maxLength={128} disabled={busy} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} required minLength={8} maxLength={128} disabled={busy} /></label>
        <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>{busy ? "Please wait…" : "Update password"}</button>
      </form>}
    </section>
    <section className={styles.card} aria-labelledby="deactivate-title"><h2 id="deactivate-title" className={styles.cardTitle}>Deactivate account</h2>
      <p className={account.hint}>Deactivation disables sign-in and signs you out. Applications, orders, and support records are retained. Contact Elegant Style to request reactivation or data deletion.</p>
      {!deactivating ? <button className={`${styles.btn} ${styles.btnDanger}`} type="button" disabled={busy || !deactivationMethod} onClick={() => setDeactivating(true)}>{deactivationMethod ? "Deactivate my account" : "Loading confirmation method…"}</button> : <form className={account.form} onSubmit={deactivate}>
        {deactivationMethod === "email-code" ? <>
          <p className={account.hint}>We will send a six-digit code to {user?.email}. The code expires in 10 minutes.</p>
          <button className={styles.btn} type="button" disabled={busy} onClick={requestDeactivationCode}>{codeSent ? "Send a new code" : "Email me a code"}</button>
          {codeSent && <label>Six-digit code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={deactivationCode} onChange={(event) => setDeactivationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required disabled={busy} /></label>}
        </> : <label>Confirm your password<input type="password" autoComplete="current-password" value={deactivatePassword} onChange={(event) => setDeactivatePassword(event.target.value)} required disabled={busy} maxLength={256} /></label>}
        <label className={account.check}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required disabled={busy} />I understand that I will be signed out and cannot sign in until the shop reactivates my account.</label>
        <div className={account.actions}><button className={`${styles.btn} ${styles.btnDanger}`} type="submit" disabled={busy || !confirmed || (deactivationMethod === "email-code" && (!codeSent || deactivationCode.length !== 6))}>Confirm deactivation</button><button className={styles.btn} type="button" disabled={busy} onClick={cancelDeactivation}>Keep my account</button></div>
      </form>}
    </section>
  </div>;
}
