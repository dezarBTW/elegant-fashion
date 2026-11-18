"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { GUARDIAN_CONSENT_BUCKET } from "@/lib/guardianConsent.mjs";

export default function GuardianConsentLink({ path }) {
  const [signed, setSigned] = useState(null);
  useEffect(() => {
    let active = true;
    if (!path) return;
    supabase.storage.from(GUARDIAN_CONSENT_BUCKET).createSignedUrl(path, 300)
      .then(({ data }) => { if (active) setSigned({ path, url: data?.signedUrl || "" }); })
      .catch(() => { if (active) setSigned({ path, url: "" }); });
    return () => { active = false; };
  }, [path]);
  if (!path) return <span>No guardian consent form recorded.</span>;
  return signed?.path === path && signed.url ? <a href={signed.url} target="_blank" rel="noopener noreferrer">View signed guardian consent form</a>
    : <span>Signed guardian consent form unavailable.</span>;
}
