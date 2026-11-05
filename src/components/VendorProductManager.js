"use client";
import styles from './marketplace.module.css';
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/clientApi";
import { supabase } from "@/lib/supabaseClient";
const sizes = ["S", "M", "L", "XL", "XXL"];
const blank = () => ({
  id: crypto.randomUUID(),
  revision: null,
  quantities: Object.fromEntries(sizes.map((size) => [size, 0])),
  product: {
    name: "",
    price: "",
    category: "Dresses",
    gender: "female",
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
    <section className={styles.panel}>
      <h2>Your products</h2>
      <p role="status">{message}</p>
      <button onClick={() => setForm(blank())} disabled={busy}>
        Add product
      </button>
      {form && (
        <form onSubmit={save}>
          <fieldset disabled={busy}>
            <legend>Product details</legend>
            <label>Upload product photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => upload(event.target.files[0])}/></label>
            {["name", "category", "description", "image"].map((key) => (
              <label key={key}>
                {key}
                <input
                  required={key !== "image"}
                  type={key === "image" ? "url" : "text"}
                  maxLength={
                    key === "name" ? 200 : key === "category" ? 100 : 2000
                  }
                  value={form.product[key] || ""}
                  onChange={(event) => field(key, event.target.value)}
                />
              </label>
            ))}
            <label>
              Price (₦)
              <input
                required
                type="number"
                min="0.01"
                max="999999999"
                step="0.01"
                value={form.product.price}
                onChange={(event) => field("price", event.target.value)}
              />
            </label>
            <label>
              Gender
              <select
                value={form.product.gender}
                onChange={(event) => field("gender", event.target.value)}
              >
                {["female", "male", "unisex"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {sizes.map((size) => (
              <label key={size}>
                Size {size} quantity
                <input
                  type="number"
                  min="0"
                  max="999999"
                  required
                  value={form.quantities[size]}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      quantities: {
                        ...previous.quantities,
                        [size]: Number(event.target.value),
                      },
                    }))
                  }
                />
              </label>
            ))}
            <p>
              Check your price carefully: you are responsible for the price a
              customer successfully pays.
            </p>
            <button>Save product</button>
            <button type="button" onClick={() => setForm(null)}>
              Cancel
            </button>
          </fieldset>
        </form>
      )}
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
    </section>
  );
}
