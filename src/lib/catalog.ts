// Catalog Data Layer
// Query functions for products, categories, variants, and inventory
// Uses Supabase client with the new schema

import { supabase } from './supabaseClient';

// Types for the new schema
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  rating: number | null;
  reviews: number | null;
  created_at: string;
  // Related data
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  product_categories?: ProductCategory[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  alt_text: string | null;
  position: number;
  width: number | null;
  height: number | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  price_modifier: number;
  is_active: boolean;
}

export interface ProductCategory {
  categories: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export interface StockState {
  variant_id: string;
  state: 'in_stock' | 'low' | 'out';
}

// Get all active products with pagination
export async function getProducts(options: {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  cursor?: string;
  limit?: number;
} = {}) {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    featured = false,
    cursor,
    limit = 20,
  } = options;

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, description, price, sale_price, is_active, is_featured,
      rating, reviews, created_at,
      product_images(url, position, alt_text),
      product_variants(id, size, color, color_hex, sku, price_modifier),
      product_categories!inner(categories!inner(id, name, slug))
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to detect if there's a next page

  // Apply filters
  if (category && category !== 'all') {
    query = query.eq('product_categories.categories.slug', category);
  }

  if (featured) {
    query = query.eq('is_featured', true);
  }

  if (minPrice !== undefined) {
    query = query.gte('price', minPrice);
  }

  if (maxPrice !== undefined) {
    query = query.lte('price', maxPrice);
  }

  if (search && search.trim()) {
    query = query.textSearch('search_vector', search, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (cursor) {
    // For cursor pagination, use created_at as cursor
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }

  // Determine if there's a next page
  const hasNextPage = data.length > limit;
  const products = hasNextPage ? data.slice(0, limit) : data;
  const nextCursor = hasNextPage ? products[products.length - 1].created_at : null;

  return {
    products,
    nextCursor,
    hasNextPage,
  };
}

// Get single product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, price, sale_price, is_active, is_featured,
      rating, reviews, created_at,
      product_images(url, position, alt_text, width, height),
      product_variants(id, sku, size, color, color_hex, price_modifier, is_active),
      product_categories!inner(categories!inner(id, name, slug))
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Product not found
    }
    console.error('Error fetching product:', error);
    throw error;
  }

  return data;
}

// Get product variants with stock information
export async function getProductVariantsWithStock(
  productId: string
): Promise<(ProductVariant & { stock_state: StockState['state'] })[]> {
  // First get variants
  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id, product_id, sku, size, color, color_hex, price_modifier, is_active')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order');

  if (variantsError) {
    console.error('Error fetching variants:', variantsError);
    throw variantsError;
  }

  if (!variants || variants.length === 0) {
    return [];
  }

  // Get stock states for all variants
  const variantIds = variants.map((v) => v.id);
  const { data: stockData, error: stockError } = await supabase.rpc('get_stock_states', {
    p_variant_ids: variantIds,
  });

  if (stockError) {
    console.error('Error fetching stock states:', stockError);
    throw stockError;
  }

  // Map stock states to variants
  const stockMap = new Map<StockState['variant_id'], StockState['state']>();
  (stockData as StockState[]).forEach((s) => {
    stockMap.set(s.variant_id, s.state);
  });

  // Combine variant data with stock state
  return variants.map((v) => ({
    ...v,
    stock_state: stockMap.get(v.id) || 'out',
  }));
}

// Get all categories (tree structure)
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data || [];
}

// Get featured products
export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, price, sale_price, is_active, is_featured,
      rating, reviews, created_at,
      product_images(url, position, alt_text)
    `)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured products:', error);
    throw error;
  }

  return data || [];
}

// Search products with facets
export async function searchProducts(options: {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  const { query, category, minPrice, maxPrice, limit = 20 } = options;

  let supabaseQuery = supabase
    .from('products')
    .select(
      `
      id, name, slug, description, price, sale_price, is_active, is_featured,
      rating, reviews, created_at,
      product_images(url, position, alt_text),
      product_categories!inner(categories!inner(id, name, slug))
    `,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    })
    .limit(limit);

  if (category && category !== 'all') {
    supabaseQuery = supabaseQuery.eq('product_categories.categories.slug', category);
  }

  if (minPrice !== undefined) {
    supabaseQuery = supabaseQuery.gte('price', minPrice);
  }

  if (maxPrice !== undefined) {
    supabaseQuery = supabaseQuery.lte('price', maxPrice);
  }

  const { data, error, count } = await supabaseQuery;

  if (error) {
    console.error('Error searching products:', error);
    throw error;
  }

  return {
    products: data || [],
    totalCount: count || 0,
  };
}