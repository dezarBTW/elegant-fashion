'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createPurchaseLimitStore } from '@/lib/purchaseLimitStore.mjs';

const store = createPurchaseLimitStore({
  async fetchLimits(ids) {
    const { data, error } = await supabase.rpc('get_size_purchase_limits', { p_product_ids: ids }).abortSignal(AbortSignal.timeout(10000));
    if (error) throw error;
    return Object.fromEntries((data || []).map(row => [row.product_id, row.purchase_limits]));
  },
  isVisible: () => typeof document !== 'undefined' && !document.hidden,
  listen(callback) {
    window.addEventListener('focus', callback);
    document.addEventListener('visibilitychange', callback);
    return () => { window.removeEventListener('focus', callback); document.removeEventListener('visibilitychange', callback); };
  },
});

export function usePurchaseLimits(ids) {
  const [state, setState] = useState({ ids: '', limits: {}, error: '', loaded: false });
  useEffect(() => store.subscribe(ids ? ids.split(',') : [], snapshot => setState({ ids, ...snapshot })), [ids]);
  const refresh = useCallback(() => store.refresh(ids ? ids.split(',') : []), [ids]);
  return { limits: state.ids === ids ? state.limits : {}, error: state.ids === ids ? state.error : '', loaded: state.ids === ids && state.loaded, refresh };
}
