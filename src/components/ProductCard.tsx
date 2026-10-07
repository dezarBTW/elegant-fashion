// Product Card Component
// Displays a single product with image, price, and stock badge

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatNGN } from '@/lib/formatCurrency';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: {
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
  };
  stockState?: 'in_stock' | 'low' | 'out';
  variantCount?: number;
}

export default function ProductCard({
  product,
  stockState = 'in_stock',
  variantCount = 0,
}: ProductCardProps) {
  // Get the primary image (lowest position number)
  const primaryImage = product.product_images?.find((img) => img.position === 0);
  const fallbackImage = product.product_images?.[0];

  const imageUrl = primaryImage?.url || fallbackImage?.url || '/images/placeholder.jpg';
  const imageAlt = primaryImage?.alt_text || product.name;

  // Calculate display price
  const displayPrice = product.sale_price || product.price;
  const hasDiscount = product.sale_price !== null && product.sale_price < product.price;

  // Stock badge color and text
  const stockConfig = {
    in_stock: { color: '#22c55e', text: 'In Stock' },
    low: { color: '#f59e0b', text: 'Low Stock' },
    out: { color: '#ef4444', text: 'Out of Stock' },
  };

  const stock = stockConfig[stockState];

  return (
    <Link href={`/ready-to-wear/product/${product.slug}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={styles.image}
            priority={false}
          />
        )}
        
        {/* Stock Badge */}
        {stockState !== 'in_stock' && (
          <span
            className={styles.stockBadge}
            style={{ backgroundColor: stock.color }}
          >
            {stock.text}
          </span>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <span className={styles.discountBadge}>
            {Math.round(((product.price - product.sale_price!) / product.price) * 100)}%
          </span>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{product.name}</h3>
        
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatNGN(displayPrice)}</span>
          {hasDiscount && (
            <span className={styles.originalPrice}>
              {formatNGN(product.price)}
            </span>
          )}
        </div>

        {/* Rating (if available) */}
        {product.rating && (
          <div className={styles.rating}>
            {'★'.repeat(Math.round(product.rating))}
            {'☆'.repeat(5 - Math.round(product.rating))}
            <span className={styles.reviewCount}>
              ({product.reviews || 0})
            </span>
          </div>
        )}

        {/* Variant count */}
        {variantCount > 1 && (
          <span className={styles.variantCount}>
            {variantCount} options available
          </span>
        )}
      </div>
    </Link>
  );
}