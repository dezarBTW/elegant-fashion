"use client";
import ProductForm from "./ProductForm";
import styles from './marketplace.module.css';
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/clientApi";
import { supabase } from "@/lib/supabaseClient";
import { validateProductImage } from '@/lib/productImage.mjs';
const sizes = ["S", "M", "L", "XL", "XXL"];
const blank = () => ({
  id: crypto.randomUUID(),
  revision: null,
  quantities: Object.fromEntries(sizes.map((size) => [size, 0])),
  product: {
    name: "",
    price: "",
    category: "",
    gender: "",
    description: "",
    image: "",
  },
});
export default function VendorProductManager() {
  const [products, setProducts] = useState([]),
    [form, setForm] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const result = await authenticatedFetch("/api/vendor/products");
      setProducts(result.products);
    } catch (error) {
      setMessage(error.message);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch("/api/vendor/products", { signal: controller.signal })
      .then((result) => setProducts(result.products))
      .catch((error) => {
        if (!controller.signal.aborted) setMessage(error.message);
      });
    return () => controller.abort();
  }, []);
  async function save(event) {
    event.preventDefault();
    if (!products.some(product=>product.id===form.id) && !Object.values(form.quantities).some(value=>Number(value)>0)) {
      setMessage("Enter stock for at least one size for this new product.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await authenticatedFetch("/api/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          product: {
            ...form.product,
            price: Number(form.product.price),
            image: form.product.image || null,
          },
        }),
      });
      setForm(null);
      setMessage("Product saved.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  function field(name, value) {
    setForm((previous) => ({
      ...previous,
      product: { ...previous.product, [name]: value },
    }));
  }
  async function upload(file) {
    if (!file) return;
    const validation = validateProductImage(file);
    if (!validation.valid) { setMessage(validation.message); return; }
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("image", file);
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/vendor/images", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      field("image", result.url);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className={styles.panel}>
      <h2>Your products</h2>
      <p role="status">{message}</p>
      <button onClick={() => setForm(blank())} disabled={busy}>
        Add product
      </button>
      </div>
      {form && (
        <ProductForm formData={{...form.product,quantities:form.quantities}}
          editMode={products.some(product=>product.id===form.id)} saving={busy} vendor
          handleSubmit={save} handleChange={event=>field(event.target.name,event.target.value)}
          handleImageUpload={event=>upload(event.target.files[0])}
          onQuantityChange={(size,value)=>setForm(previous=>({...previous,quantities:{...previous.quantities,[size]:Number(value)}}))}
          onCancel={()=>setForm(null)} />
      )}
      <div className={styles.panel}>
      {products.map((product) => (
        <article key={product.id}>
          <h3>{product.name}</h3>
          <p>₦{Number(product.price).toLocaleString("en-NG")}</p>
          <p>
            {sizes
              .map(
                (size) => `${size}: ${product.stock?.quantities?.[size] || 0}`,
              )
              .join(" · ")}
          </p>
          <button
            disabled={busy}
            onClick={() =>
              setForm({
                id: product.id,
                revision: product.stock?.revision ?? null,
                quantities:
                  product.stock?.quantities ||
                  Object.fromEntries(sizes.map((size) => [size, 0])),
                product: Object.fromEntries(
                  [
                    "name",
                    "price",
                    "category",
                    "gender",
                    "description",
                    "image",
                  ].map((key) => [key, product[key]]),
                ),
              })
            }
          >
            Edit / restock
          </button>
          <button disabled={busy || !product.is_active} onClick={async () => {
            setBusy(true);
            try { await authenticatedFetch('/api/vendor/products', { method: 'DELETE', body: JSON.stringify({ id: product.id }) }); await load(); }
            catch (error) { setMessage(error.message); }
            finally { setBusy(false); }
          }}>Remove product</button>
        </article>
      ))}
      </div>
    </section>
  );
}
