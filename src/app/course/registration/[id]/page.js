"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./registration.module.css";
import Image from "next/image";

export default function RegistrationDetails() {
  const params = useParams();
  const router = useRouter();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrationDetails();
  }, [params.id]);

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
        setRegistration(data);
      }
    } catch (error) {
      console.error("Error fetching registration:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgrammePrice = (programme) => {
    if (programme === "3 Months Programme") {
      return "₦150,000";
    } else if (programme === "6 Months Programme") {
      return "₦250,000";
    }
    return "";
  };

  const getAdmissionMessage = (accepted) => {
    if (accepted) {
      return "You have successfully been admitted into Elegant Fashion Academy";
    }
    return null;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
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
            <Image
              src={registration.passport_photo}
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
          </div>
        </div>

        {/* Pricing Section (only show if not accepted) */}
        {!registration.accepted && (
          <div className={styles.pricingCard}>
            <h2>Training Cost</h2>
            <p className={styles.price}>{getProgrammePrice(registration.chosen_programme)}</p>
            <p className={styles.priceNote}>
              Payment details will be provided during orientation
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button onClick={() => window.print()} className={styles.printBtn}>
            Print Details
          </button>
        </div>
      </div>
    </div>
  );
}
