// Product Grid Component
// Displays a responsive grid of products with filtering and pagination

'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import styles from './ProductGrid.module.css';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  rating: number | null;
  reviews: number | null;
  product_images?: Array<{
    url: string;
    position: number;
    alt_text: string | null;
  }>;
  product_variants?: Array<{
    id: string;
    size: string | null;
    color: string | null;
  }>;
}

interface ProductGridProps {
  initialProducts: Product[];
  categories: Array<{ id: string; name: string; slug: string }>;
  currentCategory?: string;
}

export default function ProductGrid({
  initialProducts,
  categories,
  currentCategory = 'all',
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [stockStates, setStockStates] = useState<Map<string, 'in_stock' | 'low' | 'out'>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);

  // Fetch stock states after initial render
  useEffect(() => {
    async function fetchStockStates() {
      const variantIds = products.flatMap((p) =>
        p.product_variants?.map((v) => v.id) || []
      );

      if (variantIds.length === 0) return;

      try {
        const params = new URLSearchParams();
        variantIds.forEach((id) => params.append('id', id));

        const res = await fetch(`/api/stock?${params}`);
        const data = await res.json();

        if (data.states) {
          const newStockMap = new Map<string, 'in_stock' | 'low' | 'out'>();
          data.states.forEach((s: { variant_id: string; state: 'in_stock' | 'low' | 'out' }) => {
            newStockMap.set(s.variant_id, s.state);
          });
          setStockStates(newStockMap);
        }
      } catch (error) {
        console.error('Failed to fetch stock states:', error);
      }
    }

    fetchStockStates();
  }, [products]);

  // Get stock state for a product (based on its variants)
  const getProductStockState = (product: Product): 'in_stock' | 'low' | 'out' => {
    const variants = product.product_variants;
    if (!variants || variants.length === 0) return 'out';

    // Check all variants - if any is in stock, product is in stock
    for (const variant of variants) {
      const state = stockStates.get(variant.id);
      if (state === 'in_stock') return 'in_stock';
      if (state === 'low') return 'low';
    }
    return 'out';
  };

  // Get variant count for a product
  const getVariantCount = (product: Product): number => {
    return product.product_variants?.length || 0;
  };

  return (
    <div>
      {/* Category Filters */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${currentCategory === 'all' ? styles.active : ''}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.filterBtn} ${currentCategory === cat.slug ? styles.active : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className={styles.empty}>
          <p>No products found</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              stockState={getProductStockState(product)}
              variantCount={getVariantCount(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}