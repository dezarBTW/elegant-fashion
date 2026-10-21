'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useAdminList(kind, enabled, { page, status, search, version, onPage }) {
  const [state, setState] = useState({ rows: [], counts: {}, total: 0, loading: true, error: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const load = async () => {
      setState(current => ({ ...current, loading: true, error: '' }));
      try {
        const { data, error } = await supabase.rpc('get_admin_list_page', { p_kind: kind, p_page: page, p_status: status, p_search: search.trim() }).abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error || !data || !Array.isArray(data.rows) || !data.counts || !Number.isSafeInteger(data.total) || !Number.isSafeInteger(data.page) || data.page < 1 || data.pageSize !== (kind === 'students' ? 25 : 15)) throw error || new Error('Invalid list response');
        setState({ rows: data.rows, counts: data.counts, total: data.total, loading: false, error: '' });
        if (data.page !== page) onPage(data.page);
      } catch {
        if (!controller.signal.aborted) setState({ rows: [], counts: {}, total: 0, loading: false, error: 'Unable to load this list. Please refresh and try again.' });
      }
    };
    const timer = setTimeout(load, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, enabled, page, status, search, version, onPage]);
  return state;
}
