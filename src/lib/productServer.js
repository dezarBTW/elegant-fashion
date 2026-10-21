import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { recommendProducts } from './products.mjs';

function catalogDatabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const getPublicProduct = cache(async slug => {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  const column = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(slug) ? 'id' : 'slug';
  const { data, error } = await catalogDatabase().from('products').select('*').eq(column, slug).eq('is_active', true).maybeSingle();
  if (error) throw new Error('Unable to load this product. Please try again.');
  return data;
});

export async function getRecommendations(product) {
  if (!product.category) return [];
  const { data, error } = await catalogDatabase().from('products').select('*').eq('is_active', true).eq('category', product.category).neq('id', product.id).order('created_at', { ascending: false }).limit(100);
  if (error) { console.error('Product recommendations unavailable', error.code); return []; }
  return recommendProducts(product, data || []);
}
