'use client';
import { useId } from 'react';
import { PRODUCT_SIZES } from '@/lib/products.mjs';
import styles from './ProductOptions.module.css';

export default function ProductOptions({ name, sizes, size, quantity, onSizeChange, onQuantityChange, disabled = false }) {
  const group = useId();
  return <div className={styles.options}>
    <fieldset disabled={disabled} className={styles.sizes}>
      <legend>Available sizes <span className={styles.srOnly}>for {name}</span></legend>
      {PRODUCT_SIZES.map(option => <label key={option.value} title={`${option.label}${sizes.includes(option.value) ? '' : ' — unavailable'}`}>
        <input type="radio" name={group} value={option.value} aria-label={`${option.label} for ${name}`} checked={size === option.value} disabled={!sizes.includes(option.value)} onChange={() => onSizeChange(option.value)} required />
        <span>{option.value}</span>
      </label>)}
    </fieldset>
    <label className={styles.quantity}>Quantity<select aria-label={`Quantity for ${name}`} value={quantity} disabled={disabled || !sizes.length} onChange={event => onQuantityChange(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
  </div>;
}
