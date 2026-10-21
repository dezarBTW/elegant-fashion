'use client';
import Link from 'next/link';
import styles from './product.module.css';
export default function ProductError({ reset }) { return <main className={styles.page}><h1>Unable to load this product</h1><p>Please try again in a moment.</p><button className={styles.add} type="button" onClick={reset}>Try again</button><p><Link href="/ready-to-wear">Back to the shop</Link></p></main>; }
