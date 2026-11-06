"use client";
import { useState } from 'react';
import Image from 'next/image';
import styles from './HomeRunwayLookbook.module.css';

export default function RunwayImage({ src, alt }) {
  const [status, setStatus] = useState('loading');
  return <>
    {status === 'loading' && <span className={styles.imageSkeleton} aria-hidden="true" />}
    <Image src={src} alt={alt} fill
      sizes="(max-width: 700px) 50vw, (max-width: 1200px) 32vw, 400px"
      loading="lazy" draggable={false} className={styles.runwayImage}
      style={{ opacity: status === 'loaded' ? 1 : 0 }}
      onLoad={() => setStatus('loaded')} onError={() => setStatus('failed')} />
  </>;
}
