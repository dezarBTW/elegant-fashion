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

  const handleGoogleSignIn = async () => {
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message || "Unable to sign in with Google. Please try again.");
        setLoading(false);
      }
      // On success the browser navigates to Google, so no further action here.
    } catch (error) {
      console.error("Google sign-in error:", error);
      setMessage("Unable to sign in with Google. Please try again.");
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

        <div className="divider">or</div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.93c1.71-1.58 2.69-3.91 2.69-6.64z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.19l-2.93-2.27c-.81.55-1.85.87-3.03.87-2.33 0-4.31-1.58-5.02-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z" />
            <path fill="#FBBC05" d="M3.98 10.71c-.18-.55-.28-1.13-.28-1.71s.1-1.16.28-1.71V4.95H.96A8.99 8.99 0 000 9c0 1.45.35 2.83.96 4.05l3.02-2.34z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.6-2.6C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.02 2.34C4.69 5.16 6.67 3.58 9 3.58z" />
          </svg>
          {loading ? "Please wait..." : "Continue with Google"}
        </button>

        <p className="sign-up-prompt">
          New to Elegant Fashion? <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  );
}