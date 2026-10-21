'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { CHECKOUT_SIGN_IN } from '@/lib/authLinks.mjs';
import { supabase } from '@/lib/supabaseClient';
import { availableSizes, productHref, productPrice } from '@/lib/products.mjs';
import ProductOptions from './ProductOptions';
import styles from '@/contexts/CartContext.module.css';

export default function CartContents({ onNavigate }) {
  const { items, updateItem } = useCart();
  const { user, loading: authLoading } = useAuth();
  const checkoutHref = authLoading || (user && !user.is_anonymous) ? '/checkout' : CHECKOUT_SIGN_IN;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ids = [...new Set(items.map(item => item.id))].sort().join(',');
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const result = ids ? await supabase.from('products').select('*').in('id', ids.split(',')).eq('is_active', true) : { data: [] };
        if (result.error) throw result.error;
        if (mounted) setProducts(result.data || []);
      } catch { if (mounted) setError('Unable to load your cart. Please refresh and try again.'); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [ids]);
  const change = (index, changes) => {
    setError('');
    try { updateItem(index, changes); }
    catch (error) { setError(error.message); }
  };
  const lines = items.map(item => ({ ...item, product: products.find(product => product.id === item.id) }));
  const ready = lines.length > 0 && lines.every(item => item.product && availableSizes(item.product).includes(item.size));
  const total = lines.reduce((sum, item) => sum + (item.product ? productPrice(item.product) * item.quantity : 0), 0);
  return <>
    <div className={styles.items}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? <p role="status">Loading your cart…</p> : !lines.length ? <p>Your cart is empty. <Link href="/ready-to-wear" onClick={onNavigate}>Browse products</Link>.</p> : lines.map((item, index) => {
        const sizes = item.product ? availableSizes(item.product) : [];
        return <article className={styles.item} key={`${item.id}:${index}`}>
          <div>{item.product?.image && <Link href={productHref(item.product)} onClick={onNavigate}><Image src={item.product.image} alt={item.product.name} width={72} height={96} /></Link>}</div>
          <div><h3>{item.product ? <Link href={productHref(item.product)} onClick={onNavigate}>{item.product.name}</Link> : 'Unavailable product'}</h3>
            {item.product && <>
              <p>₦{productPrice(item.product).toLocaleString('en-NG')} each</p>
              <ProductOptions name={item.product.name} sizes={sizes} size={sizes.includes(item.size) ? item.size : ''} quantity={item.quantity} onSizeChange={size => change(index, { size })} onQuantityChange={quantity => change(index, { quantity })} />
              <p>₦{(productPrice(item.product) * item.quantity).toLocaleString('en-NG')}</p>
            </>}
            {!sizes.length && <p className={styles.error}>This product is currently unavailable. Remove it to continue.</p>}
            {sizes.length > 0 && !sizes.includes(item.size) && <p className={styles.error}>Choose an available size before checkout.</p>}
            <button className={styles.remove} type="button" aria-label={`Remove ${item.product?.name || 'unavailable product'}`} onClick={() => change(index, { quantity: 0 })}>Remove</button>
          </div>
        </article>;
      })}
    </div>
    {!!lines.length && !loading && <footer><p>Subtotal <strong>₦{total.toLocaleString('en-NG')}</strong></p><small>Free pickup or delivery within Yenagoa. ₦2,000 outside Yenagoa.</small>
      {ready ? <Link href={checkoutHref} onClick={onNavigate}>Continue to checkout</Link> : <p className={styles.error} role="status">Select an available size for every item before checkout.</p>}
    </footer>}
  </>;
}
