"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import "./callback.css";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    let redirectTimeoutId;

    const goHome = () => {
      router.replace("/");
      router.refresh();
    };

    const goToSignInWithError = () => {
      if (!mounted) return;
      setMessage("We couldn't complete Google sign-in. Please try again.");
      redirectTimeoutId = setTimeout(() => {
        if (mounted) router.replace("/sign-in");
      }, 2500);
    };

    // The Supabase client auto-detects the OAuth code in the URL
    // (detectSessionInUrl defaults to true) and exchanges it for a
    // session in the background. That exchange is async, so instead of
    // checking once, we listen for the session to actually land.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        goHome();
      }
    });

    // Also check immediately in case the session was already established
    // by the time this component mounted.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        goToSignInWithError();
        return;
      }
      if (data.session) {
        goHome();
      }
    });

    // Safety net: if no session shows up within a few seconds (e.g. the
    // user denied access, or an error came back from Google), stop
    // waiting and send them back to sign-in with a message.
    const failSafeId = setTimeout(() => {
      goToSignInWithError();
    }, 6000);

    return () => {
      mounted = false;
      clearTimeout(redirectTimeoutId);
      clearTimeout(failSafeId);
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="auth-callback-page">
      <div className="spinner" aria-hidden="true" />
      <p>{message || "Finishing sign-in..."}</p>
    </main>
  );
}
