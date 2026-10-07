// Product Skeleton Loader
// Displays while products are loading

import styles from './ProductSkeleton.module.css';

interface ProductSkeletonProps {
  count?: number;
}

export default function ProductSkeleton({ count = 1 }: ProductSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.imagePlaceholder} />
          <div className={styles.content}>
            <div className={styles.title} />
            <div className={styles.price} />
            <div className={styles.rating} />
          </div>
        </div>
      ))}
    </>
  );
}