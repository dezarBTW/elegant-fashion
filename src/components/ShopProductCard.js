'use client';
import Image from 'next/image';
import { imagePath } from '@/lib/imagePath.mjs';
import Link from 'next/link';
import { productHref, productPrice } from '@/lib/products.mjs';
import styles from '@/app/ready-to-wear/readytowear.module.css';

export default function ShopProductCard({ product, index = 0, priority = false }) {
  return <Link href={productHref(product)} aria-label={`View ${product.name}`} data-product className={styles.productCard} style={{ '--item-index': index }}>
    <div className={styles.productImage}>
      {product.image ? <Image data-product-image src={imagePath(product.image)} alt={product.name} fill priority={priority} sizes="(max-width: 680px) 50vw, (max-width: 1100px) 33vw, 25vw" className={styles.image} /> : <div className={styles.imageFallback}>E</div>}
      {product.sale_price != null && Number(product.sale_price) < Number(product.price) && <span className={styles.productBadge}>Special price</span>}
    </div>
    <div className={styles.productInfo}>
      <span className={styles.productCategory}>{product.category || 'Ready to wear'}</span>
      <h3 className={styles.productName}>{product.name}</h3>
      <div className={styles.productMeta}><span className={styles.productPrice}>₦{productPrice(product).toLocaleString('en-NG')}</span>{product.sale_price != null && Number(product.sale_price) < Number(product.price) && <del className={styles.oldPrice}>₦{Number(product.price).toLocaleString('en-NG')}</del>}</div>
    </div>
  </Link>;
}
