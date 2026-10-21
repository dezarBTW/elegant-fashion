'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CART_KEY, CART_CHANGED, addCartItem, readCart, updateCheckoutItem, writeCart } from '@/lib/checkout.mjs';
import { availableSizes } from '@/lib/products.mjs';
import { animateToCart } from '@/lib/cartAnimation';
import CartContents from '@/components/CartContents';
import styles from './CartContext.module.css';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const current = useRef([]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const returnFocus = useRef(null);
  useEffect(() => {
    const sync = () => { current.current = readCart(); setItems(current.current); };
    const storage = event => { if (event.key === CART_KEY || event.key === null) sync(); };
    sync();
    window.addEventListener(CART_CHANGED, sync);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(CART_CHANGED, sync); window.removeEventListener('storage', storage); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    const onKey = event => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); returnFocus.current?.focus(); };
  }, [open]);
  const save = next => {
    // The ref makes consecutive clicks atomic even before React renders again.
    writeCart(next); current.current = next; setItems(next);
  };
  const addItem = (product, quantity, size, source) => {
    if (!availableSizes(product).includes(size)) { setNotice('Choose an available size before adding this product.'); return false; }
    try {
      const already=current.current.find(item=>item.id===product.id&&item.size===size)?.quantity||0;
      if (!product.purchase_limits || already+quantity>(product.purchase_limits[size]||0)) throw new Error('The selected quantity is no longer available. Update your cart or choose another size.');
      save(addCartItem(current.current, product.id, quantity, size));
      setNotice(`${product.name} added to your cart. Size ${size}, quantity ${quantity}.`);
      animateToCart(source);
      return true;
    } catch (error) { setNotice(error.message); return false; }
  };
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return <CartContext.Provider value={{ items, count, addItem, updateItem: (index, changes) => save(updateCheckoutItem(current.current, index, changes)), openCart: () => setOpen(true) }}>
    {children}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {open && <div className={styles.overlay} onClick={() => setOpen(false)}>
      <aside ref={dialog} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-title" onClick={event => event.stopPropagation()}>
        <header><h2 id="cart-title">Your cart <small>({count} units)</small></h2><button type="button" aria-label="Close cart" onClick={() => setOpen(false)}>×</button></header>
        <CartContents onNavigate={() => setOpen(false)} />
      </aside>
    </div>}
  </CartContext.Provider>;
}
