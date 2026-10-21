import Link from 'next/link';
import styles from './product.module.css';
export default function NotFound() { return <main className={styles.page}><h1>Product unavailable</h1><p>This product may have been removed from the collection.</p><Link href="/ready-to-wear">Back to the shop</Link></main>; }
