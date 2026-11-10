import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

function catalogDatabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const getPublicProduct = cache(async slug => {
  if (!/^[a-z0-9-]{1,260}$/.test(slug)) return null;
  const id = slug.match(/(?:^|-)([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/)?.[1];
  const column = id ? 'id' : 'slug';
  const { data, error } = await catalogDatabase().from('products').select('*').eq(column, id || slug).eq('is_active', true).maybeSingle();
  if (error) throw new Error('Unable to load this product. Please try again.');
  return data;
});

export async function getRecommendations(product) {
  if (!product.category) return [];
  const { data, error } = await catalogDatabase().rpc('get_similar_products', { p_product_id: product.id });
  if (error) { console.error('Product recommendations unavailable', error.code); return []; }
  return data || [];
}
