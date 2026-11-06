"use client";
import { useEffect,useState } from 'react';
import { authenticatedFetch } from '@/lib/clientApi';
import VendorProductManager from '@/components/VendorProductManager';
export default function VendorProducts(){
 const [vendor,setVendor]=useState(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();authenticatedFetch('/api/account/vendor',{signal:controller.signal}).then(result=>setVendor(result.vendor)).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return()=>controller.abort();},[]);
 return <div><h1>Product management</h1>{error?<p role="alert">{error}</p>:!vendor?<p>Loading vendor access…</p>:vendor.is_vendor?<VendorProductManager/>:<p>Vendor access must be enabled by Elegant Style.</p>}</div>;
}
