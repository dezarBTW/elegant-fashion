'use client';

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail } from "@/lib/sanitizeInput";
import "./signin.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDeactivated, setIsDeactivated] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const safeEmail = sanitizeEmail(email);

    if (!safeEmail || !password) {
      setMessage("Please enter your email and password");
      return;
    }

    const rateLimit = consumeRateLimit(`login:${safeEmail}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      setMessage(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: safeEmail,
        password,
      });

      if (error) {
        setMessage(error.message || "Unable to sign in. Please try again.");
        setLoading(false);
        return;
      }

      if (!signInData.session) {
        setMessage("Sign-in succeeded, but your session could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      // Verify the account is still active before completing sign-in.
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("is_active")
        .eq("id", signInData.user.id)
        .single();

      if (!profileError && profile && profile.is_active === false) {
        await supabase.auth.signOut({ scope: "local" });
        setLoading(false);
        setIsDeactivated(true);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Sign-in redirect error:", error);
      setMessage("Unable to complete sign-in. Please try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="sign-in-page sign-in-loading-page">
        <div className="spinner" aria-hidden="true" />
        <p>Signing you in...</p>
      </main>
    );
  }

    return (
    <main className="sign-in-page">
      {isDeactivated && (
        <div className="deactivated-overlay" role="presentation">
          <section className="deactivated-modal" role="alertdialog" aria-modal="true" aria-labelledby="deactivated-title">
            <h2 id="deactivated-title">Account deactivated</h2>
            <p>
              Your account is no longer active and you cannot access it. Contact
              Elegant Style to resolve this issue.
            </p>
            <button
              type="button"
              className="deactivated-button"
              onClick={() => setIsDeactivated(false)}
            >
              Okay
            </button>
          </section>
        </div>
      )}

      <section className="sign-in-panel" aria-labelledby="sign-in-heading">
        <p className="eyebrow">Welcome back</p>
        <h1 id="sign-in-heading">Sign In</h1>


        {message && (
          <div className="error-message" role="alert">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                className="input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button className="sign-in-button" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="sign-up-prompt">
          New to Elegant Fashion? <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  );
}