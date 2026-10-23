"use client";
import PassportPhoto from "@/components/PassportPhoto";
import MediaCleanupNotice from '@/components/MediaCleanupNotice';
import { useEffect, useState } from "react";
import { useAdminList } from '@/hooks/useAdminList';
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage } from "@/lib/sanitizeInput";
import { formatDate, formatDateTime, getProgrammePrice, getStudentStatus, toWhatsAppUrl } from "../adminUtils";
import styles from "../adminShell.module.css";
import { authenticatedFetch } from "@/lib/clientApi";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "all", label: "All" },
];

const badgeClass = (status) =>
  `${styles.badge} ${
    status === "accepted" ? styles.badgeAccepted : status === "declined" ? styles.badgeDeclined : styles.badgePending
  }`;

const fullName = (student) =>
  [student.surname, student.first_name, student.middle_name].filter(Boolean).join(" ") || student.name || "Unnamed applicant";

// Fashion academy applications: review, accept or decline. Only admins can read or change
// the students table (enforced by row-level security in the database).
export default function StudentApplications() {
  const { user, isAdmin } = useAuth();
  const [error, setError] = useState("");
  const [cleanupWarning, setCleanupWarning] = useState('');
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const { rows: students, loading, counts, total, error: loadError } = useAdminList('students', isAdmin, { page, status: tab, search, version, onPage: setPage });

  // Old links like /course/accepted-students send people here with ?tab=accepted.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((item) => item.key === requested)) {
      const frame = requestAnimationFrame(() => { setTab(requested); setPage(1); });
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const updateStatus = async (student, nextStatus) => {
    if (!user || busyId) return;

    if (nextStatus === "declined" && !window.confirm(`Decline the application from ${fullName(student)}?`)) {
      return;
    }

    const rateLimit = consumeRateLimit(`admin-student-write:${user.id}`, 60, 60 * 1000);
    if (!rateLimit.allowed) {
      setError(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setBusyId(student.id);
    setError("");

    try {
      const result = await authenticatedFetch("/api/admin/students", { method: "PATCH", body: JSON.stringify({ id: student.id, status: nextStatus }) });
      setVersion(current => current + 1);
      setSelected((current) => current?.id === student.id ? result.student : current);
    } catch (error) { setError(error.message || "Could not update this application."); }
    finally { setBusyId(null); }
  };

  const deleteStudent = async student => {
    if (!user || busyId || !window.confirm(`Permanently delete the registration from ${fullName(student)} and its passport photo? This cannot be undone.`)) return;
    setBusyId(student.id); setError('');
    try {
      const result = await authenticatedFetch('/api/admin/media', { method: 'DELETE', body: JSON.stringify({ kind: 'student', id: student.id }) });
      setCleanupWarning(result.warning || '');
      setSelected(null); setVersion(current => current + 1);
    } catch (error) { setError(error.message); }
    finally { setBusyId(null); }
  };

  const renderActions = (student) => {
    const status = getStudentStatus(student);
    const busy = busyId === student.id;
    return (
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busyId !== null} onClick={() => deleteStudent(student)}>Delete registration</button>
        {status !== "accepted" && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={busy}
            onClick={() => updateStatus(student, "accepted")}
          >
            {busy ? "Saving..." : "Accept"}
          </button>
        )}
        {status !== "declined" && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={busy}
            onClick={() => updateStatus(student, "declined")}
          >
            Decline
          </button>
        )}
        {status !== "pending" && (
          <button type="button" className={styles.btn} disabled={busy} onClick={() => updateStatus(student, "pending")}>
            Move to pending
          </button>
        )}
      </div>
    );
  };

  const retryNotification = async (student) => {
    if (busyId) return;
    setBusyId(student.id); setError("");
    try {
      const result = await authenticatedFetch("/api/admin/students", { method: "POST", body: JSON.stringify({ id: student.id }) });
      setVersion(current => current + 1);
      setSelected(current => current?.id === student.id ? result.student : current);
    } catch (error) { setError(error.message); }
    finally { setBusyId(null); }
  };

  if (!isAdmin) return null;

  const selectedStatus = selected ? getStudentStatus(selected) : "pending";
  const selectedWhatsApp = selected ? toWhatsAppUrl(selected.telephone) : null;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Student applications</h1>
          <p className={styles.pageSub}>Review fashion academy applications and accept or decline them.</p>
        </div>
      </div>

      {(error || loadError) && <div className={styles.error} role="alert">{error || loadError}</div>}
      <MediaCleanupNotice message={cleanupWarning} onClear={() => setCleanupWarning('')} />

      <div className={styles.tabs} role="tablist" aria-label="Application status">
        {TABS.map((item) => (
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
          placeholder="Search by name, email or phone"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          aria-label="Search applications"
        />
      </div>

      {loading ? (
        <div className={styles.empty} role="status">Loading applications...</div>
      ) : loadError ? null : students.length === 0 ? (
        <div className={styles.empty}>
          {search ? "No applications match your search." : "No applications in this list."}
        </div>
      ) : (
        <div className={styles.list}>
          {students.map((student) => {
            const status = getStudentStatus(student);
            return (
              <article key={student.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>{fullName(student)}</h2>
                    <p className={styles.meta}>
                      {student.email}
                      {student.telephone ? ` · ${student.telephone}` : ""}
                    </p>
                    <p className={styles.meta}>
                      {student.chosen_programme}
                      {getProgrammePrice(student.chosen_programme) ? ` (${getProgrammePrice(student.chosen_programme)})` : ""}
                      {student.created_at ? ` · Applied ${formatDate(student.created_at)}` : ""}
                    </p>
                  </div>
                  <span className={badgeClass(status)}>{status}</span>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.btn} onClick={() => setSelected(student)}>
                    View details
                  </button>
                </div>
                {renderActions(student)}
              </article>
            );
          })}
        </div>
      )}

      {total > 25 && <nav className={styles.actions} aria-label="Student pages">
        <button className={styles.btn} disabled={loading || page === 1} onClick={() => { setPage(page - 1); window.scrollTo({top:0,behavior:'auto'}); }}>Previous</button>
        <span>Page {page} of {Math.ceil(total / 25)}</span>
        <button className={styles.btn} disabled={loading || page * 25 >= total} onClick={() => { setPage(page + 1); window.scrollTo({top:0,behavior:'auto'}); }}>Next</button>
      </nav>}

      {selected && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setSelected(null)}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <div>
                <h2 id="student-detail-title" className={styles.modalTitle}>{fullName(selected)}</h2>
                <p className={styles.meta}>
                  <span className={badgeClass(selectedStatus)}>{selectedStatus}</span>
                  {selected.created_at ? ` Applied ${formatDateTime(selected.created_at)}` : ""}
                </p>
              </div>
              <button type="button" className={styles.btn} onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className={styles.detailLayout}>
              {selected.passport_photo ? (
                <PassportPhoto value={selected.passport_photo} alt={`Passport photo of ${fullName(selected)}`} className={styles.passport} />
              ) : (
                <div className={styles.noPassport}>No passport photo</div>
              )}

              <dl className={styles.detailGrid}>
                {[
                  ["Gender", selected.gender],
                  ["Date of birth", formatDate(selected.date_of_birth)],
                  ["Age", selected.age ? `${selected.age} years` : ""],
                  ["Nationality", selected.nationality],
                  ["State of origin", selected.state_of_origin],
                  ["Marital status", selected.marital_status],
                  ["Telephone", selected.telephone],
                  ["Email", selected.email],
                  ["Address", selected.address],
                  ["Sponsorship", selected.sponsorship || "Not recorded"],
                  ["Sponsor organization", selected.sponsor_organization || "Not applicable"],
                  [
                    "Programme",
                    `${selected.chosen_programme || ""}${
                      getProgrammePrice(selected.chosen_programme) ? ` (${getProgrammePrice(selected.chosen_programme)})` : ""
                    }`,
                  ],
                ].map(([label, text]) => (
                  <div key={label}>
                    <dt className={styles.detailLabel}>{label}</dt>
                    <dd className={styles.detailValue}>{text || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={styles.actions} style={{ marginTop: "1.25rem" }}>
              {selected.telephone && (
                <a className={styles.btn} href={`tel:${selected.telephone}`}>
                  Call
                </a>
              )}
              {selectedWhatsApp && (
                <a className={styles.btn} href={selectedWhatsApp} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              )}
            </div>
            <div style={{ marginTop: "0.75rem" }}>{renderActions(selected)}</div>
            <p className={styles.meta}>{selected.registration_email_sent_at ? "Admin registration notification accepted by the email service." : "No admin notification delivery confirmation is recorded."}</p>
            {!selected.registration_email_sent_at && <button type="button" className={styles.btn} disabled={busyId !== null} onClick={() => retryNotification(selected)}>{busyId === selected.id ? "Sending…" : "Retry admin email notification"}</button>}
          </section>
        </div>
      )}
    </>
  );
}
