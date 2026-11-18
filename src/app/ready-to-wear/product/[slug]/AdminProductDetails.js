"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import ShopClosed from "@/components/ShopClosed";
import ProductDetails from "./ProductDetails";
import styles from "./product.module.css";

export default function AdminProductDetails({ slug }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (authLoading || !isAdmin) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!/^[a-z0-9-]{1,260}$/.test(slug)) throw new Error("This product is unavailable.");
        const id = slug.match(/(?:^|-)([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/)?.[1];
        const { data, error: productError } = await supabase.from("products").select("*")
          .eq(id ? "id" : "slug", id || slug).eq("is_active", true).maybeSingle();
        if (productError) throw productError;
        if (!data) throw new Error("This product is unavailable.");
        const { data: similar } = await supabase.rpc("get_similar_products", { p_product_id: data.id });
        if (!cancelled) { setProduct(data); setRecommendations(similar || []); }
      } catch (cause) {
        if (!cancelled) setError(cause.message || "Unable to load this product.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [authLoading, isAdmin, slug, retry]);

  if (authLoading && user) return <main className={styles.page}><p role="status">Checking shop access…</p></main>;
  if (!isAdmin) return <ShopClosed />;
  if (loading) return <main className={styles.page}><p role="status">Loading product…</p></main>;
  if (error) return <main className={styles.page}><h1>Product unavailable</h1><p role="alert">{error}</p><button type="button" className={styles.add} onClick={() => setRetry((value) => value + 1)}>Try again</button><p><Link href="/ready-to-wear">Back to the shop</Link></p></main>;
  return <ProductDetails product={product} recommendations={recommendations} />;
}
