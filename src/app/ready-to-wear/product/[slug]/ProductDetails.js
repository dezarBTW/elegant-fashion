'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { imagePath } from '@/lib/imagePath.mjs';
import Link from 'next/link';
import { availableSizes, productPrice } from '@/lib/products.mjs';
import { useCart } from '@/contexts/CartContext';
import ShopProductCard from '@/components/ShopProductCard';
import ProductOptions from '@/components/ProductOptions';
import shop from '../../readytowear.module.css';
import styles from './product.module.css';

export default function ProductDetails({ product, recommendations }) {
  const { addItem } = useCart();
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [request, setRequest] = useState({ name: '', email: '', phone: '', size: '', colour: '', details: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const requestBody = useRef(null);
  const sizes = availableSizes(product);
  const changeRequest = event => { setRequest({ ...request, [event.target.name]: event.target.value }); setMessage(''); };
  const submitRequest = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    const snapshot = JSON.stringify(request);
    if (requestBody.current !== snapshot) { requestId.current = crypto.randomUUID(); requestBody.current = snapshot; }
    try {
      const response = await fetch('/api/product-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request, id: requestId.current, productId: product.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send your request.');
      setMessage(`Your request has been received. The team will contact you to confirm availability and pricing. Reference: ${result.id}`);
    } catch (error) { setError(error.message || 'Unable to send your request. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className={shop.container}><main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/ready-to-wear">Ready-to-wear</Link><span aria-hidden="true">/</span><span>{product.name}</span></nav>
    <section className={styles.details} data-product aria-labelledby="product-name">
      <div className={styles.image}>{product.image ? <Image data-product-image src={imagePath(product.image)} alt={product.name} fill priority sizes="(max-width: 768px) 100vw, 50vw" /> : <span>Image unavailable</span>}</div>
      <div className={styles.info}>
        <p className={styles.category}>{product.category || 'Ready to wear'}</p><h1 id="product-name">{product.name}</h1>
        <p className={styles.price}>₦{productPrice(product).toLocaleString('en-NG')}{product.sale_price != null && Number(product.sale_price) < Number(product.price) && <del>₦{Number(product.price).toLocaleString('en-NG')}</del>}</p>
        <p className={styles.description}>{product.description || `Discover ${product.name} from our ${product.category?.toLowerCase() || 'ready-to-wear'} collection. Contact us if you need more details before ordering.`}</p>
        <form onSubmit={event => { event.preventDefault(); addItem(product, quantity, size, event.currentTarget); }}>
          <ProductOptions name={product.name} sizes={sizes} size={size} quantity={quantity} onSizeChange={setSize} onQuantityChange={setQuantity} />
          <p className={styles.hint}>{sizes.length ? 'Choose your size and quantity. Unavailable sizes are disabled.' : 'No sizes are currently available. You can request this product below.'}</p>
          <button type="submit" className={styles.add} disabled={!sizes.includes(size)}>Add to cart</button>
        </form>
      </div>
    </section>
    <section className={styles.request} aria-labelledby="request-heading">
      <h2 id="request-heading">Request this product in a different colour or size</h2><p>Tell us what you have in mind. We will contact you to confirm availability and pricing before you pay.</p>
      <form className={styles.requestForm} onSubmit={submitRequest}>
        <fieldset disabled={busy}><legend className={shop.srOnly}>Your product request</legend>
          <label>Your name<input name="name" autoComplete="name" value={request.name} onChange={changeRequest} required minLength={2} maxLength={100} /></label>
          <label>Email<input name="email" type="email" autoComplete="email" value={request.email} onChange={changeRequest} required maxLength={254} /></label>
          <label>Phone number<input name="phone" type="tel" autoComplete="tel" value={request.phone} onChange={changeRequest} required minLength={7} maxLength={30} /></label>
          <label>Requested size<input name="size" value={request.size} onChange={changeRequest} maxLength={100} placeholder="e.g. XXL or your measurements" /></label>
          <label>Requested colour<input name="colour" value={request.colour} onChange={changeRequest} maxLength={100} placeholder="e.g. navy blue" /></label>
          <label className={styles.full}>Additional details<textarea name="details" rows={3} maxLength={1500} value={request.details} onChange={changeRequest} /></label>
          <label className={styles.honeypot} aria-hidden="true">Website<input name="website" value={request.website} onChange={changeRequest} tabIndex={-1} autoComplete="off" /></label>
        </fieldset>
        <p className={styles.hint}>Enter at least one requested size or colour. By submitting, you agree to our <Link href="/privacy">privacy policy</Link>.</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status">{message}</p>}
        <button className={styles.add} type="submit" disabled={busy || Boolean(message)}>{busy ? 'Sending request…' : 'Send request'}</button>
      </form>
    </section>
    {recommendations.length > 0 && <section className={styles.recommendations} aria-labelledby="recommendations-heading"><h2 id="recommendations-heading">Recommended products</h2><p>More pieces from our {product.category?.toLowerCase()} collection.</p><div className={shop.products}>{recommendations.map((item, index) => <ShopProductCard key={item.id} product={item} index={index} />)}</div></section>}
  </main></div>;
}
