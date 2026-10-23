"use client";
import { useEffect, useState } from "react";
import { useAdminList } from '@/hooks/useAdminList';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage } from "@/lib/sanitizeInput";
import { BESPOKE_STATUSES, formatDateTime, toWhatsAppUrl } from "../adminUtils";
import styles from "../adminShell.module.css";
import { authenticatedFetch } from '@/lib/clientApi';
import MediaCleanupNotice from '@/components/MediaCleanupNotice';

const BUCKET = "bespoke-requests";
const SIGNED_URL_SECONDS = 60 * 60;

const badgeClass = (status) => {
  const key = `badge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return `${styles.badge} ${styles[key] || ""}`;
};

// Bespoke outfit requests sent from /bespoke/request. The photos live in a private bucket, so
// they are shown through short-lived signed links that only admins are allowed to create.
export default function BespokeRequests() {
  const { user, isAdmin } = useAuth();
  const [imageUrls, setImageUrls] = useState({});
  const [error, setError] = useState("");
  const [cleanupWarning, setCleanupWarning] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const { rows: requests, loading, counts, total, error: loadError } = useAdminList('bespoke', isAdmin, { page, status: tab, search, version, onPage: setPage });

  useEffect(() => {
    if (!isAdmin || loading) return;
    let current = true;
    const sign = async () => {
      setImageUrls({});
      setPhotoError('');
      const paths = [...new Set(requests.flatMap(row => row.image_paths || []))];
      if (!paths.length) return;
      try {
        const {data,error} = await supabase.storage.from(BUCKET).createSignedUrls(paths,SIGNED_URL_SECONDS);
        if (error) throw error;
        if (current) setImageUrls(Object.fromEntries((data || []).filter(item => item.path && item.signedUrl).map(item => [item.path,item.signedUrl])));
      } catch { if (current) setPhotoError('Unable to load reference photos. Refresh to try again.'); }
    };
    sign();
    return () => { current = false; };
  }, [isAdmin, loading, requests]);

  const updateStatus = async (request, nextStatus) => {
    if (!user || busyId || request.status === nextStatus) return;

    const rateLimit = consumeRateLimit(`admin-bespoke-write:${user.id}`, 60, 60 * 1000);
    if (!rateLimit.allowed) {
      setError(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setBusyId(request.id);
    setError("");

    const { error: updateError } = await supabase
      .from("bespoke_requests")
      .update({ status: nextStatus })
      .eq("id", request.id);

    setBusyId(null);

    if (updateError) {
      console.error("Could not update request:", updateError);
      setError("Could not update this request. Please try again.");
      return;
    }

    setVersion(current => current + 1);
  };

  const deleteRequest = async (request) => {
    if (!user || busyId) return;

    const label = request.name || request.phone;
    if (!window.confirm(`Delete the request from ${label}? Its photos will be deleted too. This cannot be undone.`)) {
      return;
    }

    const rateLimit = consumeRateLimit(`admin-bespoke-delete:${user.id}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      setError(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setBusyId(request.id);
    setError("");

    try {
      const result = await authenticatedFetch('/api/admin/media', { method: 'DELETE', body: JSON.stringify({ kind: 'bespoke', id: request.id }) });
      setCleanupWarning(result.warning || '');
      setVersion(current => current + 1);
    } catch (error) { setError(error.message); }
    finally { setBusyId(null); }
  };

  if (!isAdmin) return null;

  const tabs = [{ key: "all", label: "All" }, ...BESPOKE_STATUSES];

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bespoke requests</h1>
          <p className={styles.pageSub}>Outfit requests from customers. Track each one from first contact to delivery.</p>
        </div>
        <button type="button" className={styles.btn} onClick={() => { setError(''); setVersion(current => current + 1); }} disabled={loading}>
          Refresh
        </button>
      </div>

      {(error || loadError || photoError) && <div className={styles.error} role="alert">{error || loadError || photoError}</div>}
      <MediaCleanupNotice message={cleanupWarning} onClear={() => setCleanupWarning('')} />

      <div className={styles.tabs} role="tablist" aria-label="Request status">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`${styles.tab} ${tab === item.key ? styles.tabActive : ""}`}
            onClick={() => { setTab(item.key); setPage(1); }}
          >
            {item.label} ({counts[item.key] ?? 0})
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          maxLength={200}
          className={styles.search}
          placeholder="Search by name, phone or description"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          aria-label="Search requests"
        />
      </div>

      {loading ? (
        <div className={styles.empty} role="status">Loading requests...</div>
      ) : loadError ? null : requests.length === 0 ? (
        <div className={styles.empty}>
          {search || tab !== "all" ? "No requests match this view." : "No bespoke requests yet."}
        </div>
      ) : (
        <div className={styles.list}>
          {requests.map((request) => {
            const whatsApp = toWhatsAppUrl(request.phone);
            const busy = busyId === request.id;
            const photos = (request.image_paths || []).filter((path) => imageUrls[path]);

            return (
              <article key={request.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>{request.name || "No name given"}</h2>
                    <p className={styles.meta}>
                      {request.phone} · {formatDateTime(request.created_at)}
                    </p>
                  </div>
                  <span className={badgeClass(request.status)}>{request.status}</span>
                </div>

                <p className={styles.desc}>{request.description}</p>

                {photos.length > 0 && (
                  <div className={styles.thumbs}>
                    {photos.map((path, index) => (
                      <a key={path} href={imageUrls[path]} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrls[path]}
                          alt={`Reference photo ${index + 1} from ${request.name || request.phone}`}
                          className={styles.thumb}
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className={styles.actions}>
                  <a className={styles.btn} href={`tel:${request.phone}`}>
                    Call
                  </a>
                  {whatsApp && (
                    <a className={styles.btn} href={whatsApp} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={busy}
                    onClick={() => deleteRequest(request)}
                  >
                    Delete
                  </button>
                </div>

                <div className={styles.statusPills} role="group" aria-label="Set status">
                  {BESPOKE_STATUSES.map((status) => (
                    <button
                      key={status.key}
                      type="button"
                      className={`${styles.pill} ${request.status === status.key ? styles.pillActive : ""}`}
                      disabled={busy}
                      aria-pressed={request.status === status.key}
                      onClick={() => updateStatus(request, status.key)}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {total > 15 && <nav className={styles.actions} aria-label="Bespoke pages">
        <button className={styles.btn} disabled={loading || page === 1} onClick={() => { setPage(page - 1); window.scrollTo({top:0,behavior:'auto'}); }}>Previous</button>
        <span>Page {page} of {Math.ceil(total / 15)}</span>
        <button className={styles.btn} disabled={loading || page * 15 >= total} onClick={() => { setPage(page + 1); window.scrollTo({top:0,behavior:'auto'}); }}>Next</button>
      </nav>}
    </>
  );
}
