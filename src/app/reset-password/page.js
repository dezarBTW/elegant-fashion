"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAuthLinkError } from "@/lib/authLinks.mjs";
import "./reset-password.css";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // "checking" while we wait for Supabase to read the link, then "ready" or "invalid".
  const [linkState, setLinkState] = useState("checking");

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (getAuthLinkError(window.location.href)) {
        setLinkState("invalid");
        return;
      }
      try {
        // Wait for Supabase to finish consuming the recovery link before
        // deciding whether a session exists, including on slow connections.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (mounted)
          setLinkState(!sessionError && data.session ? "ready" : "invalid");
      } catch {
        if (mounted) setLinkState("invalid");
      }
    };
    check();

    return () => {
      mounted = false;
    };
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (linkState !== "ready" || loading || message) return;
    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || "Error updating password");
      } else {
        setMessage("Password updated! Taking you to the site...");
        setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 1500);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (linkState === "checking") {
    return (
      <div className="reset-page">
        <div className="reset-container">
          <h2>Checking your link...</h2>
          <p className="subtitle">One moment please.</p>
        </div>
      </div>
    );
  }

  if (linkState === "invalid") {
    return (
      <div className="reset-page">
        <div className="reset-container">
          <h2>Link expired</h2>
          <p className="error-message">
            This reset link is invalid or has expired. Reset links only work
            once and for a limited time.
          </p>
          <button
            className="reset-btn"
            style={{ width: "100%" }}
            onClick={() => router.push("/forgot-password")}
          >
            Request a new link
          </button>
          <button className="back-btn" onClick={() => router.push("/sign-in")}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-page">
      <div className="reset-container">
        <h2>Reset Your Password</h2>
        <p className="subtitle">Enter your new password below</p>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="success-message" role="status">
            {message}
          </div>
        )}
        <form onSubmit={handleResetPassword} className="reset-form">
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              className="input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              className="input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show passwords
          </label>
          <button
            className="reset-btn"
            type="submit"
            disabled={loading || !!message}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
        <button className="back-btn" onClick={() => router.push("/sign-in")}>
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
