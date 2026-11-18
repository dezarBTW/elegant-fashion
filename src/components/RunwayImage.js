"use client";
import Image from 'next/image';
import styles from './HomeRunwayLookbook.module.css';

export default function RunwayImage({ src, alt }) {
  return <Image src={src} alt={alt} fill
      sizes="(max-width: 700px) 50vw, (max-width: 1200px) 32vw, 400px"
      loading="eager" draggable={false} className={styles.runwayImage} />;
}
