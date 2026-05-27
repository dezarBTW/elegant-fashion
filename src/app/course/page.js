"use client";
import styles from "./fashionschool.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function Course() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  const [formData, setFormData] = useState({
    surname: "",
    first_name: "",
    middle_name: "",
    gender: "",
    date_of_birth: "",
    age: "",
    nationality: "",
    marital_status: "",
    state_of_origin: "",
    address: "",
    telephone: "",
    email: "",
    chosen_programme: "",
    passport_photo: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);

  useEffect(() => {
    if (user) {
      checkExistingRegistration();
    } else if (!loading) {
      setCheckingRegistration(false);
    }
  }, [user, loading]);

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePassportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPG, JPEG, or PNG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/passport.${fileExt}`;   // ← Fixed: Critical for RLS

      const { error: uploadError } = await supabase.storage
        .from('student-passports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Error uploading passport. Please try again.");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('student-passports')
        .getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        passport_photo: publicUrl,
      }));

      alert("Passport photo uploaded successfully!");
    } catch (error) {
      console.error("Passport upload error:", error);
      alert("Error uploading passport. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.passport_photo) {
      alert("Please upload your passport photograph before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("students")
        .insert([
          {
            surname: formData.surname,
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            gender: formData.gender,
            date_of_birth: formData.date_of_birth,
            age: parseInt(formData.age),
            nationality: formData.nationality,
            marital_status: formData.marital_status,
            state_of_origin: formData.state_of_origin,
            address: formData.address,
            telephone: formData.telephone,
            email: formData.email,
            chosen_programme: formData.chosen_programme,
            passport_photo: formData.passport_photo,
            user_id: user.id,
          },
        ])
        .select();

      if (error) {
        console.error("Submission error:", error);
        alert("Error submitting application. Please try again.");
      } else {
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

  if (loading || checkingRegistration) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
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
      <h1 className="header">STUDENT REGISTRATION FORM</h1>
      <div className="form-container">
        <div className="form-header">
          <h1>Personal Information</h1>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
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
              required
            />
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
              required
            />
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
                  required
                />
                Female
              </label>
            </div>
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
              required
            />
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
              required
            />
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
              required
            />
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
                  required
                />
                Married
              </label>
            </div>
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
              required
            />
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
              required
            />
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
              required
            />
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
              required
            />
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
                  required
                />
                6 Months Programme <span style={{color: 'black'}}>(₦250,000)</span>
              </label>
            </div>
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
          </div>

          <div className="declaration">
            <div className="declaration-text">
              I hereby apply for training at <strong>ELEGANTSTYLE FASHION AND DESIGN</strong> and have completed this form to the best of my knowledge.
            </div>
            <label className="agree-checkbox">
              <input type="checkbox" id="agree" required />
              <span>I agree</span>
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>

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
    </div>
  );
}