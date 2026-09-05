"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import "./callback.css";

export default function AuthCallback() {
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [showManualLink, setShowManualLink] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Mirrors exactly what the email/password sign-in page does: talk to
    // Supabase directly and act on the result the instant it's available,
    // rather than waiting on AuthContext's own (debounced, multi-step)
    // state to catch up. That indirection is what was adding delay here
    // even after the header/navbar had already updated.
    const goHome = () => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      router.replace("/");
      router.refresh();
    };

    // Fast path: catch the session the moment Supabase's client finishes
    // parsing the OAuth tokens from the URL and fires its auth event.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        goHome();
      }
    });

    // Poll directly as a safety net, in case the event above fires before
    // this listener finishes subscribing (a real race we hit before).
    // Polling can't miss a session that already landed, it just asks
    // again shortly after. No arbitrary short timeout that could bail
    // out to an error state before a legitimately slower exchange
    // finishes \u2014 we just keep checking until it shows up.
    let pollTimeoutId;
    const poll = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted || redirectedRef.current) return;
        if (data.session) {
          goHome();
          return;
        }
        pollTimeoutId = setTimeout(poll, 250);
      });
    };
    poll();

    // Pure safety net, doesn't force navigation — if this is taking a
    // genuinely long time (or truly failed, e.g. access was denied), just
    // surface a manual way out instead of guessing and bouncing the user
    // somewhere wrong while a slow-but-real sign-in might still complete.
    const manualLinkTimeoutId = setTimeout(() => {
      if (mounted && !redirectedRef.current) {
        setShowManualLink(true);
      }
    }, 20000);

    return () => {
      mounted = false;
      clearTimeout(pollTimeoutId);
      clearTimeout(manualLinkTimeoutId);
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="auth-callback-page">
      <div className="spinner" aria-hidden="true" />
      <p>Finishing sign-in...</p>
      {showManualLink && (
        <p>
          Taking longer than expected.{" "}
          <a href="/sign-in">Click here</a> if you're not redirected shortly.
        </p>
      )}
    </main>
  );
}
