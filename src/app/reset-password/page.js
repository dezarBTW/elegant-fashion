"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./reset-password.css";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    // Extract tokens from URL hash
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (type === "recovery" && accessToken) {
      // Set the session with the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        if (error) {
          setError("Invalid or expired reset link. Please request a new password reset.");
        } else {
          setSessionRestored(true);
        }
      });
    } else {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message || "Error updating password");
      } else {
        setMessage("Password updated successfully! Redirecting to sign in...");
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (error && !sessionRestored) {
    return (
      <div className="reset-page">
        <div className="reset-container">
          <h2>Password Reset Error</h2>
          <p className="error-message">{error}</p>
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
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        <form onSubmit={handleResetPassword} className="reset-form">
          <div className="form-group">
            <input
              className="input"
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <input
              className="input"
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <button className="reset-btn" type="submit" disabled={loading}>
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
