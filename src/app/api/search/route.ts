// Search API Endpoint
// Returns products matching search query with optional filters
// Uses Postgres full-text search with websearch_to_tsquery

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/search?q=dress&category=dresses&minPrice=10000
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  const query = searchParams.get('q')?.trim();
  const category = searchParams.get('category');
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Validate query
  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    // Build the query
    let supabaseQuery = supabase
      .from('products')
      .select(
        `
        id, name, slug, description, price, sale_price, is_active, is_featured,
        rating, reviews, created_at,
        product_images(url, position, alt_text),
        product_categories!inner(categories!inner(id, name, slug))
      `
      )
      .eq('is_active', true)
      .textSearch('search_vector', query, {
        type: 'websearch',
        config: 'english',
      })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (category && category !== 'all') {
      supabaseQuery = supabaseQuery.eq('product_categories.categories.slug', category);
    }

    if (minPrice !== undefined) {
      supabaseQuery = supabaseQuery.gte('price', minPrice);
    }

    if (maxPrice !== undefined) {
      supabaseQuery = supabaseQuery.lte('price', maxPrice);
    }

    // Order by relevance (fts_rank) then by date
    supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

    const { data, error, count } = await supabaseQuery;

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Failed to search products' },
        { status: 500 }
      );
    }

    // Calculate pagination
    const totalPages = count ? Math.ceil(count / limit) : 1;
    const hasMore = page < totalPages;

    return NextResponse.json(
      {
        query,
        products: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasMore,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}