// Stock API Endpoint
// Returns real-time stock availability for product variants
// Cached at edge for 30s with stale-while-revalidate

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/stock?id=variant1&id=variant2&id=variant3
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.getAll('id');

  // Validate input
  if (!ids.length) {
    return NextResponse.json(
      { error: 'Provide at least one variant ID' },
      { status: 400 }
    );
  }

  if (ids.length > 200) {
    return NextResponse.json(
      { error: 'Maximum 200 variant IDs per request' },
      { status: 400 }
    );
  }

  try {
    // Call the database RPC function
    const { data, error } = await supabase.rpc('get_stock_states', {
      p_variant_ids: ids,
    });

    if (error) {
      console.error('Stock RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stock states' },
        { status: 500 }
      );
    }

    // Create a map for faster lookup
    const stockMap = new Map<string, 'in_stock' | 'low' | 'out'>();
    (data as { variant_id: string; state: 'in_stock' | 'low' | 'out' }[]).forEach(
      (item) => {
        stockMap.set(item.variant_id, item.state);
      }
    );

    // Ensure all requested IDs are in the response (even if not found)
    const response = ids.map((id) => ({
      variant_id: id,
      state: stockMap.get(id) || ('out' as const),
    }));

    return NextResponse.json(
      { states: response },
      {
        headers: {
          // Cache at edge for 30s, allow stale data for 60s
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          // Allow Vercel to cache this
          'X-Vercel-Cache': 'STALE',
        },
      }
    );
  } catch (err) {
    console.error('Stock API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Utility function to get stock states (used by other components)
export async function getStockStates(
  variantIds: string[]
): Promise<Map<string, 'in_stock' | 'low' | 'out'>> {
  if (!variantIds.length) {
    return new Map();
  }

  const { data, error } = await supabase.rpc('get_stock_states', {
    p_variant_ids: variantIds,
  });

  if (error) {
    console.error('getStockStates error:', error);
    return new Map();
  }

  const stockMap = new Map<string, 'in_stock' | 'low' | 'out'>();
  (data as { variant_id: string; state: 'in_stock' | 'low' | 'out' }[]).forEach(
    (item) => {
      stockMap.set(item.variant_id, item.state);
    }
  );

  return stockMap;
}