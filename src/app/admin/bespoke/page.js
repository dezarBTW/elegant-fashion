"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage } from "@/lib/sanitizeInput";
import { BESPOKE_STATUSES, formatDateTime, toWhatsAppUrl } from "../adminUtils";
import styles from "../adminShell.module.css";

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
  const [requests, setRequests] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadRequests = useCallback(async () => {
    setError("");
    const { data, error: fetchError } = await supabase
      .from("bespoke_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Could not load bespoke requests:", fetchError);
      setError("Could not load bespoke requests. Please refresh the page.");
      setLoading(false);
      return;
    }

    const rows = data || [];
    setRequests(rows);
    setLoading(false);

    const paths = rows.flatMap((row) => row.image_paths || []);
    if (paths.length === 0) {
      setImageUrls({});
      return;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);

    if (signError) {
      console.error("Could not create photo links:", signError);
      return;
    }

    const urls = {};
    (signed || []).forEach((item) => {
      if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
    });
    setImageUrls(urls);
  }, []);

  useEffect(() => {
    if (isAdmin) loadRequests();
  }, [isAdmin, loadRequests]);

  const counts = useMemo(() => {
    const result = { all: requests.length };
    BESPOKE_STATUSES.forEach((status) => {
      result[status.key] = 0;
    });
    requests.forEach((request) => {
      if (result[request.status] !== undefined) result[request.status] += 1;
    });
    return result;
  }, [requests]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (tab !== "all" && request.status !== tab) return false;
      if (!term) return true;
      const haystack = `${request.name || ""} ${request.phone || ""} ${request.description || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [requests, tab, search]);

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

    setRequests((current) =>
      current.map((item) => (item.id === request.id ? { ...item, status: nextStatus } : item)),
    );
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

    const { error: deleteError } = await supabase.from("bespoke_requests").delete().eq("id", request.id);

    setBusyId(null);

    if (deleteError) {
      console.error("Could not delete request:", deleteError);
      setError("Could not delete this request. Please try again.");
      return;
    }

    // The database queues the request's photos for removal from storage automatically.
    setRequests((current) => current.filter((item) => item.id !== request.id));
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
        <button type="button" className={styles.btn} onClick={loadRequests}>
          Refresh
        </button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.tabs} role="tablist" aria-label="Request status">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`${styles.tab} ${tab === item.key ? styles.tabActive : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label} ({counts[item.key] ?? 0})
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search by name, phone or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search requests"
        />
      </div>

      {loading ? (
        <div className={styles.empty} role="status">Loading requests...</div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          {search || tab !== "all" ? "No requests match this view." : "No bespoke requests yet."}
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((request) => {
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
    </>
  );
}
