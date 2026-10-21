'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { imagePath } from '@/lib/imagePath.mjs';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePurchaseLimits } from '@/hooks/usePurchaseLimits';
import { CHECKOUT_SIGN_IN } from '@/lib/authLinks.mjs';
import { supabase } from '@/lib/supabaseClient';
import { availableSizes, productHref, productPrice } from '@/lib/products.mjs';
import ProductOptions from './ProductOptions';
import styles from '@/contexts/CartContext.module.css';

export default function CartContents({ onNavigate }) {
  const { items, updateItem } = useCart();
  const router=useRouter();
  const { user, loading: authLoading } = useAuth();
  const checkoutHref = authLoading || (user && !user.is_anonymous) ? '/checkout' : CHECKOUT_SIGN_IN;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ids = [...new Set(items.map(item => item.id))].sort().join(',');
  const availability=usePurchaseLimits(ids);
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
  const ready = availability.loaded && !availability.error && lines.length > 0 && lines.every(item => item.product && availableSizes(item.product).includes(item.size) && item.quantity <= (availability.limits[item.id]?.[item.size]||0));
  const continueCheckout=async event=>{event.preventDefault();setError('');try{const limits=await availability.refresh();if(!lines.every(item=>item.product&&availableSizes(item.product).includes(item.size)&&item.quantity<=(limits[item.id]?.[item.size]||0)))throw new Error('Availability changed. Update the selected size or quantity before checkout.');onNavigate?.();router.push(checkoutHref);}catch(error){setError(error.message);}};
  const total = lines.reduce((sum, item) => sum + (item.product ? productPrice(item.product) * item.quantity : 0), 0);
  return <>
    <div className={styles.items}>
      {(error||availability.error) && <p className={styles.error} role="alert">{error||availability.error}</p>}
      {loading ? <p role="status">Loading your cart…</p> : !lines.length ? <p>Your cart is empty. <Link href="/ready-to-wear" onClick={onNavigate}>Browse products</Link>.</p> : lines.map((item, index) => {
        const sizes = item.product ? availableSizes(item.product).filter(size=>(availability.limits[item.id]?.[size]||0)>0) : [];
        const maxQuantity=availability.limits[item.id]?.[item.size]||0;
        return <article className={styles.item} key={`${item.id}:${index}`}>
          <div>{item.product?.image && <Link href={productHref(item.product)} onClick={onNavigate}><Image src={imagePath(item.product.image)} alt={item.product.name} width={72} height={96} /></Link>}</div>
          <div><h3>{item.product ? <Link href={productHref(item.product)} onClick={onNavigate}>{item.product.name}</Link> : 'Unavailable product'}</h3>
            {item.product && <>
              <p>₦{productPrice(item.product).toLocaleString('en-NG')} each</p>
              <ProductOptions name={item.product.name} sizes={sizes} size={sizes.includes(item.size) ? item.size : ''} quantity={item.quantity} maxQuantity={maxQuantity} onSizeChange={size => change(index, { size,quantity:Math.min(item.quantity,availability.limits[item.id]?.[size]||1) })} onQuantityChange={quantity => change(index, { quantity })} />
              <p>₦{(productPrice(item.product) * item.quantity).toLocaleString('en-NG')}</p>
            </>}
            {item.quantity>maxQuantity && sizes.includes(item.size) && <p className={styles.error}>This quantity is no longer available. Choose a lower quantity.</p>}
            {!sizes.length && <p className={styles.error}>This product is currently unavailable. Remove it to continue.</p>}
            {sizes.length > 0 && !sizes.includes(item.size) && <p className={styles.error}>Choose an available size before checkout.</p>}
            <button className={styles.remove} type="button" aria-label={`Remove ${item.product?.name || 'unavailable product'}`} onClick={() => change(index, { quantity: 0 })}>Remove</button>
          </div>
        </article>;
      })}
    </div>
    {!!lines.length && !loading && <footer><p>Subtotal <strong>₦{total.toLocaleString('en-NG')}</strong></p><small>Free pickup or delivery within Yenagoa. ₦2,000 outside Yenagoa.</small>
      {ready ? <Link href={checkoutHref} onClick={continueCheckout}>Continue to checkout</Link> : <p className={styles.error} role="status">Select an available size and quantity for every item before checkout.</p>}
    </footer>}
  </>;
}
