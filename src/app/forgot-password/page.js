'use client';

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PASSWORD_RESET_REDIRECT } from "@/lib/authLinks.mjs";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail } from "@/lib/sanitizeInput";
import "../auth-atelier.css";
import "../auth-extras.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const safeEmail = sanitizeEmail(email);

    if (!safeEmail) {
      setMessage("Please enter your email address");
      return;
    }

    const rateLimit = consumeRateLimit(`reset:${safeEmail}`, 3, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      setMessage(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(safeEmail, {
        redirectTo: PASSWORD_RESET_REDIRECT,
      });

      // Keep the success message neutral while reporting delivery failures.
      if (error && (error.status === 429 || /rate limit/i.test(error.message || ""))) {
        setMessage("Too many reset emails were requested. Please wait a few minutes and try again.");
      } else if (error) {
        setMessage("We couldn't send a reset email. Please try again shortly.");
      } else {
        setSentTo(safeEmail);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-media" aria-hidden="true">
        <Image
          src="/images/Hero/image%20%2823%29.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
        />
        <div className="auth-media-veil" />
        <div className="auth-media-copy">
          <p>Elegant Style</p>
          <h2>Back in, in a moment.</h2>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="forgot-heading">
        <div className="auth-panel-inner">
          {sentTo ? (
            <>
              <div className="auth-check" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3.5 7 8.5 6 8.5-6" />
                </svg>
              </div>
              <h1 id="forgot-heading">Check your email</h1>
              <p className="auth-lede">
                If an account exists for{" "}
                <span className="auth-email-strong">{sentTo}</span>, we&apos;ve sent a
                link to choose a new password. It can take a minute to arrive.
              </p>
              <p className="auth-aside">
                Nothing yet? Check your spam folder, or{" "}
                <button type="button" className="auth-link-button" onClick={() => setSentTo("")}>
                  try again
                </button>
                .
              </p>
              <p className="auth-switch"><Link href="/sign-in">Back to sign in</Link></p>
            </>
          ) : (
            <>
              <h1 id="forgot-heading">Forgot password?</h1>
              <p className="auth-lede">
                Enter the email you signed up with and we&apos;ll send you a link to
                choose a new password.
              </p>

              {message && (
                <div className="error-message" role="alert">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(sanitizeEmail(event.target.value))}
                    required
                  />
                </div>

                <button className="auth-submit" type="submit" disabled={loading || !sanitizeEmail(email)}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="auth-switch">
                Remembered it? <Link href="/sign-in">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
