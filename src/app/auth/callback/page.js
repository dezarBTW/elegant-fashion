"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAuthLinkError, authReturnPath } from "@/lib/authLinks.mjs";
import "./callback.css";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const finishSignIn = async () => {
      const linkError = getAuthLinkError(window.location.href);
      if (linkError) {
        setError(linkError);
        return;
      }
      try {
        // getSession waits for the client's automatic URL token exchange.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError || !data.session) {
          setError(
            "We couldn't confirm your sign-in. The email link may have expired or already been used.",
          );
          return;
        }
        router.replace(authReturnPath(window.location.search));
        router.refresh();
      } catch {
        if (mounted)
          setError("We couldn't complete sign-in. Please try again.");
      }
    };
    finishSignIn();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="auth-callback-page">
      {error ? (
        <>
          <h1>Unable to finish sign-in</h1>
          <p role="alert">{error}</p>
          <Link href="/sign-in">Back to sign in</Link>
          <p>
            For a new confirmation email, sign in with your email and password,
            then choose Resend confirmation email.
          </p>
        </>
      ) : (
        <>
          <div className="spinner" aria-hidden="true" />
          <p role="status">Finishing sign-in...</p>
        </>
      )}
    </main>
  );
}
