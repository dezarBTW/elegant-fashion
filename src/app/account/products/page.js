"use client";
import { useEffect, useState, useRef } from "react";
import { authenticatedFetch } from "@/lib/clientApi";
import { VENDOR_TERMS, VENDOR_TERMS_VERSION } from "@/lib/vendorTerms.mjs";
import styles from '@/components/marketplace.module.css';
import VendorProductManager from "@/components/VendorProductManager";
export default function VendorProducts() {
  const agreement = useRef(null);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const result = await authenticatedFetch("/api/account/vendor");
      setVendor(result.vendor);
    } catch (error) {
      setError(error.message);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch("/api/account/vendor", { signal: controller.signal })
      .then((result) => setVendor(result.vendor))
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, []);
  async function decide(accept) {
    setBusy(true);
    setError("");
    try {
      await authenticatedFetch("/api/account/vendor", {
        method: "POST",
        body: JSON.stringify({ accept, version: VENDOR_TERMS_VERSION }),
      });
      await load();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const needsTerms =
    vendor &&
    (vendor.status === "pending" ||
      (vendor.status === "active" &&
        vendor.accepted_terms_version !== VENDOR_TERMS_VERSION));
  useEffect(() => { if (needsTerms && agreement.current && !agreement.current.open) agreement.current.showModal(); }, [needsTerms]);
  return (
    <div className={styles.panel}>
      <h1>Product management</h1>
      {error && <p role="alert">{error}</p>}
      {!vendor ? (
        <p>Loading vendor access…</p>
      ) : (
        <p>Vendor status: {vendor.status.replaceAll("_", " ")}</p>
      )}
      {needsTerms && (
        <dialog ref={agreement} className={styles.agreement} aria-label="Vendor agreement" onCancel={event => event.preventDefault()}>
          <h2>Vendor agreement</h2>
          <p>
            Version {VENDOR_TERMS_VERSION}. Read these terms before accepting
            vendor access.
          </p>
          {VENDOR_TERMS.map(([title, description]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </section>
          ))}
          <button disabled={busy} onClick={() => decide(true)}>
            I accept
          </button>
          <button disabled={busy} onClick={() => decide(false)}>
            I do not accept
          </button>
        </dialog>
      )}
      {vendor && !["active", "pending"].includes(vendor.status) && (
        <p>An administrator invitation is required to manage products.</p>
      )}
      {vendor?.status === "active" && !needsTerms && <VendorProductManager />}
    </div>
  );
}
