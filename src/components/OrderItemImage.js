import Image from 'next/image';
import { imagePath } from '@/lib/imagePath.mjs';
import styles from './OrderItemImage.module.css';

export default function OrderItemImage({ image, name }) {
  return image ? <Image className={styles.image} src={imagePath(image)} alt={name} width={64} height={80} sizes="64px" /> : <span className={styles.fallback} aria-hidden="true">E</span>;
}
