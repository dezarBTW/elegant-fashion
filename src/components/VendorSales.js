"use client";
import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/clientApi';
import DashboardSkeleton from './DashboardSkeleton';
import OrderItemImage from './OrderItemImage';
import styles from './marketplace.module.css';

export default function VendorSales() {
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(''),[notice,setNotice]=useState('');
  async function advance(item){const next=item.fulfilment==='new'?'ready':'shipped';setSaving(item.id);setError('');try{const result=await authenticatedFetch('/api/account/seller-orders',{method:'POST',body:JSON.stringify({itemId:item.id,expected:item.fulfilment,next})});setItems(current=>current.map(row=>row.id===item.id?{...row,fulfilment:result.item.fulfilment,shipped_at:result.item.shipped_at}:row));setNotice(next==='shipped'?(result.emailSent?'Customer notified to confirm receipt.':'Item shipped, but the customer email needs retry.'):'Item marked ready to ship.');}catch(error){setError(error.message);}finally{setSaving('');}}
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
    {notice&&<p role="status">{notice}</p>}{error?<p role="alert">{error}</p>:!items.length?<p>No paid sales found.</p>:items.map(item=><article key={item.id}>
      <div className={styles.orderItemHeading}><OrderItemImage image={item.image} name={item.product_name} /><h2>{item.product_name}</h2></div><p>Order {item.order_id} · Size {item.size} · Quantity {item.quantity}</p>
      <p>Sale amount: ₦{(Number(item.line_amount_minor)/100).toLocaleString('en-NG')}</p>
      <p>Customer payment confirmed {new Date(item.paid_at).toLocaleString()}.</p>
      <p>Progress: {item.fulfilment==='new'?'New':item.fulfilment==='ready'?'Ready to ship':item.fulfilment==='shipped'?'Shipped':item.fulfilment==='completed'?'Delivered':item.fulfilment.replaceAll('_',' ')}.</p>
      {item.direct_ship ? item.fulfilment==='new'||item.fulfilment==='ready' ? <button type="button" disabled={Boolean(saving)} onClick={()=>advance(item)}>{saving===item.id?'Saving…':item.fulfilment==='new'?'Mark ready to ship':'Mark shipped'}</button> : null : <p>Send this item to the shop. The administrator records shop receipt and dispatch.</p>}
    </article>)}
  </section>;
}
