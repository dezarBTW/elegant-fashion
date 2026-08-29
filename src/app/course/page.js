"use client";
import styles from "./fashionschool.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail, sanitizeText, validateImageFile } from "@/lib/sanitizeInput";
import { getCachedValue, invalidateCachedValue, setCachedValue } from "@/lib/browserCache";
import BackToTopButton from "@/components/BackToTopButton";

const REGISTRATION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const requiredFields = [
  "surname", "first_name", "gender", "date_of_birth", "age", "nationality",
  "marital_status", "state_of_origin", "address", "telephone", "email",
  "chosen_programme", "passport_photo", "agreed",
];

const initialFormData = {
  surname: "", first_name: "", middle_name: "", gender: "", date_of_birth: "",
  age: "", nationality: "", marital_status: "", state_of_origin: "", address: "",
  telephone: "", email: "", chosen_programme: "", passport_photo: "", agreed: false,
};

function validateField(name, value) {
  if (name === "agreed") return value ? "" : "You must agree before submitting.";
  if (name === "passport_photo") return value ? "" : "Please upload your passport photograph.";
  if (!String(value || "").trim()) return "This field is required.";
  if (name === "email" && !/^\S+@\S+\.\S+$/.test(value)) return "Enter a valid email address.";
  if (name === "age" && (Number(value) < 1 || Number(value) > 100)) return "Enter an age between 1 and 100.";
  if (name === "telephone" && String(value).replace(/\D/g, "").length < 7) return "Enter a valid telephone number.";
  return "";
}

function FieldError({ message }) {
  return message ? <p className="field-error" role="alert">{message}</p> : null;
}

export default function Course() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [acceptingStudent, setAcceptingStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);

  useEffect(() => {
    if (user) {
      checkExistingRegistration();
      if (isAdmin) {
        fetchPendingStudents();
      }
    } else if (!loading) {
      setCheckingRegistration(false);
    }
  }, [user, loading, isAdmin]);

  useEffect(() => {
    if (!user) return;
    const draft = getCachedValue(`registration-draft:${user.id}`);
    if (draft) setFormData((current) => ({ ...current, ...draft }));
    setDraftLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user || !draftLoaded) return;
    const { passport_photo, ...draft } = formData;
    setCachedValue(`registration-draft:${user.id}`, draft, REGISTRATION_DRAFT_TTL_MS);
  }, [formData, user, draftLoaded]);

  const fetchPendingStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("accepted", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching pending students:", error);
      } else {
        setPendingStudents(data || []);
      }
    } catch (error) {
      console.error("Error fetching pending students:", error);
    }
  };

  const handleAcceptStudent = async (studentId) => {
    setAcceptingStudent(studentId);
    try {
      const { error } = await supabase
        .from("students")
        .update({ accepted: true })
        .eq("id", studentId);

      if (error) {
        console.error("Error accepting student:", error);
        alert("Error accepting student. Please try again.");
      } else {
        // Remove from pending list
        setPendingStudents((prev) => prev.filter((s) => s.id !== studentId));
      }
    } catch (error) {
      console.error("Error accepting student:", error);
      alert("Error accepting student. Please try again.");
    } finally {
      setAcceptingStudent(null);
    }
  };

  const filteredStudents = pendingStudents.filter((student) => {
    const fullName = `${student.first_name} ${student.surname} ${student.middle_name || ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const checkExistingRegistration = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        router.push(`/course/registration/${data.id}`);
      } else {
        setCheckingRegistration(false);
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setCheckingRegistration(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const safeValue = name === "email" ? sanitizeEmail(value) : sanitizeText(value);
    setFormData((prev) => ({
      ...prev,
      [name]: safeValue,
    }));
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, safeValue) }));
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleAgreementChange = (e) => {
    const agreed = e.target.checked;
    setFormData((prev) => ({ ...prev, agreed }));
    setTouchedFields((prev) => ({ ...prev, agreed: true }));
    setFieldErrors((prev) => ({ ...prev, agreed: validateField("agreed", agreed) }));
  };

  const handlePassportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.message);
      e.target.value = "";
      return;
    }

    try {
      const filePath = `${user.id}/passport.${validation.extension}`;

      const { error: uploadError } = await supabase.storage
        .from('student-passports')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert(`Error uploading passport: ${uploadError.message || "Please try again."}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('student-passports')
        .getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        passport_photo: publicUrl,
      }));
      setTouchedFields((prev) => ({ ...prev, passport_photo: true }));
      setFieldErrors((prev) => ({ ...prev, passport_photo: "" }));

      alert("Passport photo uploaded successfully!");
    } catch (error) {
      console.error("Passport upload error:", error);
      alert(`Error uploading passport: ${error?.message || "Please try again."}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = Object.fromEntries(
      requiredFields.map((name) => [name, validateField(name, formData[name])]).filter(([, error]) => error)
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouchedFields(Object.fromEntries(requiredFields.map((name) => [name, true])));
      return;
    }

    const rateLimit = consumeRateLimit(`registration:${user.id}`, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      alert(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("students")
        .insert([
          {
            surname: sanitizeText(formData.surname),
            first_name: sanitizeText(formData.first_name),
            middle_name: sanitizeText(formData.middle_name),
            gender: sanitizeText(formData.gender),
            date_of_birth: sanitizeText(formData.date_of_birth),
            age: parseInt(formData.age),
            nationality: sanitizeText(formData.nationality),
            marital_status: sanitizeText(formData.marital_status),
            state_of_origin: sanitizeText(formData.state_of_origin),
            address: sanitizeText(formData.address),
            telephone: sanitizeText(formData.telephone),
            email: sanitizeEmail(formData.email),
            chosen_programme: sanitizeText(formData.chosen_programme),
            passport_photo: formData.passport_photo,
            user_id: user.id,
          },
        ])
        .select();

      if (error) {
        console.error("Submission error:", error);
        alert("Error submitting application. Please try again.");
      } else {
        invalidateCachedValue(`registration-draft:${user.id}`);
        setRegistrationId(data[0].id);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Error submitting application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    if (registrationId) {
      router.push(`/course/registration/${registrationId}`);
    }
  };

  const completedFields = requiredFields.filter(
    (name) => !validateField(name, formData[name])
  ).length;
  const progress = Math.round((completedFields / requiredFields.length) * 100);

  if (loading || checkingRegistration) {
    return (
      <div className="loading-container">
        <div className="spinner" aria-hidden="true" />
        <p>Loading fashion school...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-modal-overlay">
        <div className="auth-modal">
          <h2>Sign In Required</h2>
          <p>You need to sign in to access the student registration form.</p>
          <div className="auth-buttons">
            <Link href="/sign-in" className="auth-btn primary">
              Sign In
            </Link>
            <Link href="/sign-up" className="auth-btn secondary">
              Sign Up
            </Link>
          </div>
          <button className="close-btn" onClick={() => router.push("/")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="body">
      {isAdmin ? (
        <div className="admin-panel">
          <div className="admin-header">
            <h2>Admin Panel</h2>
            <Link href="/course/accepted-students" className="admin-link-btn">
              View Accepted Students
            </Link>
          </div>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="enter student name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredStudents.length > 0 ? (
            <div className="pending-students">
              <h3>Pending Students ({filteredStudents.length})</h3>
              <div className="students-list">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="student-card">
                    <div className="student-info">
                      <h4>{student.first_name} {student.surname}</h4>
                      <p>{student.email}</p>
                      <p>{student.chosen_programme}</p>
                    </div>
                    <button
                      onClick={() => handleAcceptStudent(student.id)}
                      className="accept-btn"
                      disabled={acceptingStudent === student.id}
                    >
                      {acceptingStudent === student.id ? "Accepting..." : "Accept"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-pending">
              <p>{searchQuery ? "No students found matching your search." : "No pending students to review."}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <h1 className="header">STUDENT REGISTRATION FORM</h1>
          <Link href="/curriculum" className="curriculum-card">
            <h2>View Our Curriculum</h2>
            <p>
              Haven&apos;t viewed our curriculum yet? Click here to get acquainted
              with the programme, what you&apos;ll learn, and your options before
              registering.
            </p>
            <span aria-hidden="true">Explore the curriculum &rarr;</span>
          </Link>
          <div className="form-container">
            <div className="form-header">
              <h1>Personal Information</h1>
              <div className="registration-progress" aria-label={`${progress}% of registration completed`}>
                <div className="registration-progress-copy">
                  <span>Registration progress</span>
                  <strong>{completedFields} of {requiredFields.length} completed</strong>
                </div>
                <div className="registration-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

        <form onSubmit={handleSubmit} className="form-body" noValidate>
          {/* Surname */}
          <div className="question">
            <div className="question-number">1. Surname/Last Name <span className="required">*</span></div>
            <div className="question-label">Your surname is your family name</div>
            <input
              type="text"
              name="surname"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.surname}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.surname && <FieldError message={fieldErrors.surname} />}
          </div>

          {/* First Name */}
          <div className="question">
            <div className="question-number">2. First Name <span className="required">*</span></div>
            <div className="question-label">The name you are commonly known by</div>
            <input
              type="text"
              name="first_name"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.first_name}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.first_name && <FieldError message={fieldErrors.first_name} />}
          </div>

          {/* Middle Name */}
          <div className="question">
            <div className="question-number">3. Middle Name</div>
            <div className="question-label">An additional name (if you have one)</div>
            <input
              type="text"
              name="middle_name"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.middle_name}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
            />
          </div>

          {/* Gender */}
          <div className="question">
            <div className="question-number">4. Gender <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === "Male"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Male
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === "Female"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Female
              </label>
            </div>
            {touchedFields.gender && <FieldError message={fieldErrors.gender} />}
          </div>

          {/* Date of Birth */}
          <div className="question">
            <div className="question-number">5. Date of Birth <span className="required">*</span></div>
            <input
              type="date"
              name="date_of_birth"
              className="input-field"
              value={formData.date_of_birth}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.date_of_birth && <FieldError message={fieldErrors.date_of_birth} />}
          </div>

          {/* Age */}
          <div className="question">
            <div className="question-number">6. Age <span className="required">*</span></div>
            <input
              type="number"
              name="age"
              className="input-field"
              placeholder="The value must be a number"
              min="1"
              max="100"
              value={formData.age}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.age && <FieldError message={fieldErrors.age} />}
          </div>

          {/* Nationality */}
          <div className="question">
            <div className="question-number">7. Nationality <span className="required">*</span></div>
            <input
              type="text"
              name="nationality"
              className="input-field"
              placeholder="Enter your nationality"
              value={formData.nationality}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.nationality && <FieldError message={fieldErrors.nationality} />}
          </div>

          {/* Marital Status */}
          <div className="question">
            <div className="question-number">8. Marital Status <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="marital_status"
                  value="Single"
                  checked={formData.marital_status === "Single"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Single
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="marital_status"
                  value="Married"
                  checked={formData.marital_status === "Married"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Married
              </label>
            </div>
            {touchedFields.marital_status && <FieldError message={fieldErrors.marital_status} />}
          </div>

          {/* State of Origin */}
          <div className="question">
            <div className="question-number">9. State of Origin <span className="required">*</span></div>
            <input
              type="text"
              name="state_of_origin"
              className="input-field"
              placeholder="Enter your state of origin"
              value={formData.state_of_origin}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.state_of_origin && <FieldError message={fieldErrors.state_of_origin} />}
          </div>

          {/* Address */}
          <div className="question">
            <div className="question-number">10. Address <span className="required">*</span></div>
            <textarea
              name="address"
              className="textarea"
              placeholder="Enter your full address"
              value={formData.address}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.address && <FieldError message={fieldErrors.address} />}
          </div>

          {/* Telephone */}
          <div className="question">
            <div className="question-number">11. Telephone <span className="required">*</span></div>
            <input
              type="tel"
              name="telephone"
              className="input-field"
              placeholder="Enter your phone number"
              value={formData.telephone}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.telephone && <FieldError message={fieldErrors.telephone} />}
          </div>

          {/* Email */}
          <div className="question">
            <div className="question-number">12. Email Address <span className="required">*</span></div>
            <input
              type="email"
              name="email"
              className="input-field"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.email && <FieldError message={fieldErrors.email} />}
          </div>

          {/* Chosen Programme */}
          <div className="question">
            <div className="question-number">13. Chosen Programme <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="chosen_programme"
                  value="3 Months Programme"
                  checked={formData.chosen_programme === "3 Months Programme"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                3 Months Programme <span style={{color: 'black'}}>(₦150,000)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="chosen_programme"
                  value="6 Months Programme"
                  checked={formData.chosen_programme === "6 Months Programme"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                6 Months Programme <span style={{color: 'black'}}>(₦250,000)</span>
              </label>
            </div>
            {touchedFields.chosen_programme && <FieldError message={fieldErrors.chosen_programme} />}
          </div>

          {/* Passport Photograph */}
          <div className="question">
            <div className="question-number">14. Passport Photograph <span className="required">*</span></div>
            <div className="question-label">Upload a clear passport photo (JPG, JPEG, or PNG, max 5MB)</div>
            <input
              type="file"
              className="input-field"
              accept=".jpg,.jpeg,.png"
              onChange={handlePassportUpload}
              required
            />
            {formData.passport_photo && (
              <div className="passport-preview">
                <img
                  src={formData.passport_photo}
                  alt="Passport Preview"
                  className="passport-image"
                />
              </div>
            )}
            {touchedFields.passport_photo && <FieldError message={fieldErrors.passport_photo} />}
          </div>

          <div className="declaration">
            <div className="declaration-text">
              I hereby apply for training at <strong>ELEGANTSTYLE FASHION AND DESIGN</strong> and have completed this form to the best of my knowledge.
            </div>
            <label className="agree-checkbox">
              <input type="checkbox" id="agree" checked={formData.agreed} onChange={handleAgreementChange} required />
              <span>I agree</span>
            </label>
            {touchedFields.agreed && <FieldError message={fieldErrors.agreed} />}
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
        </>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-icon">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Registration Successful!</h2>
            <p>You have successfully registered!</p>
            <button className="success-modal-btn" onClick={handleCloseModal}>
              View Registration Details
            </button>
          </div>
        </div>
      )}
      <BackToTopButton />
    </div>
  );
}
