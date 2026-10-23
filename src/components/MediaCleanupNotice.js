"use client";
import { useState } from 'react';
import { authenticatedFetch } from '@/lib/clientApi';

export default function MediaCleanupNotice({ message, onClear }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!message) return null;
  const retry = async () => {
    setBusy(true); setError('');
    try { await authenticatedFetch('/api/admin/media', { method: 'POST' }); onClear(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  return <div role="alert"><p>{error || message}</p><button type="button" disabled={busy} onClick={retry}>{busy ? 'Removing images…' : 'Retry image cleanup'}</button></div>;
}
