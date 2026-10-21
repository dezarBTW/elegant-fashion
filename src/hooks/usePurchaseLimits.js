'use client';
import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
export function usePurchaseLimits(ids){
 const [state,setState]=useState({ids:'',limits:{},error:''});
 const refresh=useCallback(async()=>{
  try{
   const keys=ids?ids.split(','):[];const limits={};
   for(let i=0;i<keys.length;i+=50){const {data,error}=await supabase.rpc('get_size_purchase_limits',{p_product_ids:keys.slice(i,i+50)});if(error)throw error;for(const row of data||[])limits[row.product_id]=row.purchase_limits;}
   setState({ids,limits,error:''});return limits;
  }catch{setState({ids,limits:{},error:'Unable to check availability. Please try again.'});throw new Error('Unable to check availability. Please try again.');}
 },[ids]);
 useEffect(()=>{const update=()=>refresh().catch(()=>{});update();const timer=setInterval(update,15000);window.addEventListener('focus',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);};},[refresh]);
 return {limits:state.ids===ids?state.limits:{},error:state.ids===ids?state.error:'',loaded:state.ids===ids,refresh};
}
