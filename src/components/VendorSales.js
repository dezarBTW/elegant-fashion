"use client";
import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/clientApi';
import DashboardSkeleton from './DashboardSkeleton';
import styles from './marketplace.module.css';

export default function VendorSales() {
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    authenticatedFetch('/api/account/seller-orders?mode=vendor',{signal:controller.signal})
      .then(result=>{if(!controller.signal.aborted)setItems(result.items);})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[]);
  if(loading)return <DashboardSkeleton variant="orders"/>;
  return <section className={styles.panel}>
    {error?<p role="alert">{error}</p>:!items.length?<p>No paid sales found.</p>:items.map(item=><article key={item.id}>
      <h2>{item.product_name}</h2><p>Order {item.order_id} · Size {item.size} · Quantity {item.quantity}</p>
      <p>Sale amount: ₦{(Number(item.line_amount_minor)/100).toLocaleString('en-NG')}</p>
      <p>Customer payment confirmed {new Date(item.paid_at).toLocaleString()}.</p>
    </article>)}
  </section>;
}
