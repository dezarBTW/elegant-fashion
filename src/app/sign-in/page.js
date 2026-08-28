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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
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