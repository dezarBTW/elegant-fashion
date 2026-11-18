"use client";
import PassportPhoto from "@/components/PassportPhoto";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/clientApi";
import { validateImageFile } from "@/lib/sanitizeInput";
import { passportUploadError } from "@/lib/passportUpload.mjs";
import styles from "./registration.module.css";
import { CORRECTION_FIELD_OPTIONS, PROGRAMMES, REGISTRATION_COMPLETE_MESSAGE, SPONSORSHIP_OPTIONS } from "@/lib/registration.mjs";

const fieldOptions = Object.fromEntries(CORRECTION_FIELD_OPTIONS);
const selectOptions = { chosen_programme: PROGRAMMES, sponsorship: SPONSORSHIP_OPTIONS };

function CorrectionField({ name, value, onChange }) {
  const label = fieldOptions[name];
  const required = name !== "middle_name" && name !== "sponsor_organization";
  const id = `correction-${name}`;
  return (
    <div className={styles.correctionField}>
      <label htmlFor={id}>{label}</label>
      {selectOptions[name] ? (
        <select id={id} name={name} value={value ?? ""} required={required} onChange={onChange}>
          <option value="">Select an option</option>
          {selectOptions[name].map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : name === "address" ? (
        <textarea id={id} name={name} value={value ?? ""} required={required} maxLength={500} rows={3} onChange={onChange} />
      ) : (
        <input id={id} name={name} value={value ?? ""} required={required}
          type={name === "date_of_birth" ? "date" : name === "age" ? "number" : name === "email" ? "email" : name === "telephone" ? "tel" : "text"}
          min={name === "age" ? 1 : undefined} max={name === "age" ? 100 : undefined}
          maxLength={name === "telephone" ? 40 : name === "sponsor_organization" ? 160 : 100}
          onChange={onChange} />
      )}
    </div>
  );
}

export default function RegistrationDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});
  const [newPhoto, setNewPhoto] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchRegistrationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("Error fetching registration:", error);
      } else {
        if (mounted) {
          setRegistration(data);
          setDraft(Object.fromEntries(CORRECTION_FIELD_OPTIONS.map(([key]) => [key, data[key] ?? ""])));
        }
      }
    } catch (error) {
      console.error("Error fetching registration:", error);
    } finally {
      if (mounted) setLoading(false);
    }
    };
    fetchRegistrationDetails();
    return () => { mounted = false; };
  }, [params.id]);

  const handleNewPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const validation = validateImageFile(file);
    if (!validation.valid) { setFormError(validation.message); return; }
    setUploading(true); setFormError(""); setNewPhoto("");
    try {
      const path = `${user.id}/passport-${registration.decline_revision}`;
      const { error } = await supabase.storage.from("student-passports").upload(path, file, {
        contentType: file.type, cacheControl: "3600", upsert: true,
      });
      if (error) throw error;
      setNewPhoto(supabase.storage.from("student-passports").getPublicUrl(path).data.publicUrl);
      setPhotoName(file.name);
    } catch (error) { setFormError(passportUploadError(error)); }
    finally { setUploading(false); }
  };

  const submitCorrection = async (event) => {
    event.preventDefault();
    if (!newPhoto) { setFormError("Upload a new passport photograph before resubmitting."); return; }
    const fields = registration.correction_fields || [];
    const editable = fields.includes("sponsorship") && draft.sponsorship === "Scholarship"
      ? [...new Set([...fields, "sponsor_organization"])] : fields;
    const changes = Object.fromEntries(editable.map((key) => [key, draft[key]]));
    setSubmitting(true); setFormError(""); setFormNotice("");
    try {
      const result = await authenticatedFetch("/api/registrations/correct", {
        method: "POST", body: JSON.stringify({ id: registration.id, changes, passport_photo: newPhoto }),
      });
      setRegistration(result.registration);
      setFormNotice("Your corrected application has been sent for review.");
      setNewPhoto(""); setPhotoName("");
    } catch (error) { setFormError(error.message || "Could not resubmit your application."); }
    finally { setSubmitting(false); }
  };

  const getProgrammePrice = (programme) => {
    if (programme === "3 Months Programme") {
      return "₦150,000";
    } else if (programme === "6 Months Programme") {
      return "₦200,000";
    } else if (programme === "1 Year Programme") {
      return "₦300,000";
    }
    return "";
  };

  const getAdmissionMessage = (accepted) => {
    if (accepted) {
      return "You have successfully been admitted into Elegant Style Academy";
    }
    return null;
  };

  const correctionOpen = registration?.status === "declined" && Boolean(registration.correction_opened_at)
    && user?.id === registration.user_id;
  const correctionFields = (registration?.correction_fields || []).filter((key) =>
    key !== "sponsor_organization" || draft.sponsorship === "Scholarship");
  if (correctionFields.includes("sponsorship") && draft.sponsorship === "Scholarship" && !correctionFields.includes("sponsor_organization")) {
    correctionFields.push("sponsor_organization");
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Registration Not Found</h2>
          <p>The registration details could not be found.</p>
          <button onClick={() => router.push("/course")} className={styles.backBtn}>
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Registration Details</h1>
        <p>Application submitted on {new Date(registration.created_at).toLocaleDateString()}</p>
      </div>

      <div className={styles.content}>
        {registration.status === "declined" && (
          <section className={styles.correctionCard} aria-labelledby="correction-title">
            <p className={styles.eyebrow}>ADMISSIONS UPDATE</p>
            <h2 id="correction-title">Your application was declined</h2>
            <p className={styles.correctionIntro}>You can correct the details listed below and send your application back for review. Your other details are saved as they were.</p>
            <div className={styles.correctionReason}><strong>Reason from admissions</strong><p>{registration.decline_reason || "Please contact the academy for the reason."}</p></div>
            {!correctionOpen ? (
              <p role="status">{registration.decline_reason
                ? "We are finishing removal of your previous passport photograph. Please check back shortly before making corrections."
                : "Please contact the academy for correction instructions."}</p>
            ) : (
              <form onSubmit={submitCorrection} className={styles.correctionForm}>
                {correctionFields.length > 0 && <div className={styles.correctionGrid}>
                  {correctionFields.map((name) => <CorrectionField key={name} name={name} value={draft[name]}
                    onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))} />)}
                </div>}
                <div className={styles.correctionField}>
                  <label htmlFor="replacement-passport">New passport photograph</label>
                  <p>Your previous photo has been removed. Choose a clear JPG or PNG image under 5 MB.</p>
                  <input id="replacement-passport" type="file" accept="image/jpeg,image/png" required
                    onChange={handleNewPhoto} disabled={uploading || submitting} />
                  {uploading && <span role="status">Uploading photograph…</span>}
                  {photoName && !uploading && <span role="status">New photograph uploaded: {photoName}</span>}
                </div>
                {formError && <p className={styles.correctionError} role="alert">{formError}</p>}
                <button type="submit" className={styles.correctionSubmit} disabled={uploading || submitting}>
                  {submitting ? "Sending application…" : "Send corrected application"}
                </button>
              </form>
            )}
          </section>
        )}
        {formNotice && <p className={styles.correctionSuccess} role="status">{formNotice}</p>}
        {/* Admission Message (if accepted) */}
        {registration.accepted && (
          <div className={styles.admissionCard}>
            <div className={styles.admissionIcon}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Congratulations!</h2>
            <p>{getAdmissionMessage(registration.accepted)}</p>
          </div>
        )}

        {/* Passport Photo Section */}
        <div className={styles.passportSection}>
          {registration.passport_photo ? (
            <PassportPhoto value={registration.passport_photo}
              alt="Passport Photograph"
              width={200}
              height={200}
              className={styles.passportImage}
            />
          ) : (
            <div className={styles.noPassport}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p>No passport photo uploaded</p>
            </div>
          )}
        </div>

        {/* Personal Information Card */}
        <div className={styles.card}>
          <h2>Personal Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Full Name</label>
              <p>{registration.surname} {registration.first_name} {registration.middle_name || ""}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Gender</label>
              <p>{registration.gender}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Date of Birth</label>
              <p>{new Date(registration.date_of_birth).toLocaleDateString()}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Age</label>
              <p>{registration.age} years</p>
            </div>
            <div className={styles.infoItem}>
              <label>Nationality</label>
              <p>{registration.nationality}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Marital Status</label>
              <p>{registration.marital_status}</p>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className={styles.card}>
          <h2>Contact Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>State of Origin</label>
              <p>{registration.state_of_origin}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Address</label>
              <p>{registration.address}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Telephone</label>
              <p>{registration.telephone}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Email</label>
              <p>{registration.email}</p>
            </div>
          </div>
        </div>

        {/* Programme Information Card */}
        <div className={styles.card}>
          <h2>Programme Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Chosen Programme</label>
              <p>{registration.chosen_programme}</p>
            </div>
            <div className={styles.infoItem}><label>Sponsorship</label><p>{registration.sponsorship || "Not recorded"}</p></div>
            {registration.sponsor_organization && <div className={styles.infoItem}><label>Sponsor organization</label><p>{registration.sponsor_organization}</p></div>}
          </div>
        </div>

        {/* Pricing details are shown while the application is under review. */}
        {registration.status === "pending" && (
          <div className={styles.pricingCard}>
            <h2>Training Cost</h2>
            <p className={styles.price}>{getProgrammePrice(registration.chosen_programme)}</p>
            <p className={styles.priceNote} style={{ whiteSpace: "pre-line" }}>
              {REGISTRATION_COMPLETE_MESSAGE}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {registration.accepted && <p className={styles.priceNote} style={{ whiteSpace: "pre-line" }}>{REGISTRATION_COMPLETE_MESSAGE}</p>}
        <div className={styles.actions}>
          {registration.accepted && (
            <button onClick={() => window.print()} className={styles.printBtn}>
              Print Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
