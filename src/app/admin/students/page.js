"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Old links like /course/accepted-students send people here with ?tab=accepted.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((item) => item.key === requested)) {
      const frame = requestAnimationFrame(() => setTab(requested));
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Could not load students:", fetchError);
      setError("Could not load student applications. Please refresh the page.");
    } else {
      setStudents(data || []);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadStudents();
  }, [isAdmin, loadStudents]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const counts = useMemo(() => {
    const result = { all: students.length, pending: 0, accepted: 0, declined: 0 };
    students.forEach((student) => {
      const status = getStudentStatus(student);
      if (result[status] !== undefined) result[status] += 1;
    });
    return result;
  }, [students]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      if (tab !== "all" && getStudentStatus(student) !== tab) return false;
      if (!term) return true;
      const haystack = `${fullName(student)} ${student.email || ""} ${student.telephone || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [students, tab, search]);

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
      setStudents((current) => current.map((item) => item.id === student.id ? result.student : item));
      setSelected((current) => current?.id === student.id ? result.student : current);
    } catch (error) { setError(error.message || "Could not update this application."); }
    finally { setBusyId(null); }
  };

  const renderActions = (student) => {
    const status = getStudentStatus(student);
    const busy = busyId === student.id;
    return (
      <div className={styles.actions}>
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
      setStudents(current => current.map(item => item.id === student.id ? result.student : item));
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

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.tabs} role="tablist" aria-label="Application status">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`${styles.tab} ${tab === item.key ? styles.tabActive : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label} ({counts[item.key]})
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search by name, email or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search applications"
        />
      </div>

      {loading ? (
        <div className={styles.empty} role="status">Loading applications...</div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          {search ? "No applications match your search." : "No applications in this list."}
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((student) => {
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.passport_photo} alt={`Passport photo of ${fullName(selected)}`} className={styles.passport} />
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
