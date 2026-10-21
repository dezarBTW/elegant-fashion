"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { passportPath } from '@/lib/passport.mjs';

export default function PassportPhoto({ value, alt = 'Passport photograph', ...props }) {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let mounted = true;
    const path = passportPath(value, process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (path) supabase.storage.from('student-passports').createSignedUrl(path, 300)
      .then(({ data }) => { if (mounted) setPhoto({ value, url: data?.signedUrl }); })
      .catch(() => { if (mounted) setPhoto({ value, url: null }); });
    return () => { mounted = false; };
  }, [value]);
  if (!photo?.url || photo.value !== value) return <span>Photograph unavailable or loading.</span>;
  // Signed, short-lived private image; do not route through a public image cache.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={photo.url} alt={alt} />;
}
