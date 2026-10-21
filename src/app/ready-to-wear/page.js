"use client";
import React, { useState, useEffect } from "react";
import styles from "./readytowear.module.css";
import ShopProductCard from "@/components/ShopProductCard";
import { SHOP_PAGE_SIZE } from "@/lib/products.mjs";
import { loadShopPage } from "@/lib/catalogPages.mjs";
import { supabase } from "@/lib/supabaseClient";
import { ShopSkeleton } from "./ShopSkeleton";

export default function ReadyToWear() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [total, setTotal] = useState(null);
  const itemsPerPage = SHOP_PAGE_SIZE;

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await loadShopPage(supabase, { page: currentPage, search: searchQuery, category: selectedCategory, price: priceRange, gender }, controller.signal);
        if (controller.signal.aborted) return;
        setProducts(data.products);
        setTotal(data.total);
        if (data.page !== currentPage) setCurrentPage(data.page);
      } catch { if (!controller.signal.aborted) { setProducts([]); setError("Unable to load the collection. Please refresh the page."); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    const timer = setTimeout(fetchProducts, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [currentPage, searchQuery, selectedCategory, priceRange, gender]);

  const categories = ["All", "Dresses", "Skirts", "Trousers", "Tops", "Jackets", "Accessories"];

  const totalPages = Math.max(1, Math.ceil((total || 0) / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (loading && total === null) return <ShopSkeleton count={itemsPerPage} />;

  return (
    <div className={styles.container}>
      <main className={styles.shop}>
        <section className={styles.collection} id="collection" aria-label="Shop the collection">
          <div className={styles.collectionHeading}>
            <div>
              <h2>Find your next favourite</h2>
            </div>
            <div className={styles.searchPanel}>
              <label className={styles.searchField}>
                <span className={styles.srOnly}>Search products by name, category, or details</span>
                <input
                  type="search"
                  maxLength={200}
                  placeholder="Name, category or details"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.clearSearch}
                    aria-label="Clear product search"
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  >
                    Clear <span aria-hidden="true">×</span>
                  </button>
                )}
              </label>
            </div>
          </div>

          <nav className={styles.categoryRail} aria-label="Product categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.categoryButton} ${selectedCategory === category ? styles.categoryActive : ''}`}
                aria-pressed={selectedCategory === category}
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
              >
                {category}
              </button>
            ))}
          </nav>

          <div className={styles.resultsBar}>
            <div className={styles.resultControls}>
              <label>
                <span className={styles.srOnly}>Filter by price</span>
                <select value={priceRange} onChange={(event) => { setPriceRange(event.target.value); setCurrentPage(1); }}>
                  <option value="all">All prices</option>
                  <option value="low">Under ₦40,000</option>
                  <option value="medium">₦40,000–₦60,000</option>
                  <option value="high">Over ₦60,000</option>
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Gender</span>
                <select value={gender} onChange={(event) => { setGender(event.target.value); setCurrentPage(1); }}>
                  <option value="" disabled hidden>Gender</option>
                  <option value="all">All</option>
                  <option value="male">Male Fashion</option>
                  <option value="female">Female Fashion</option>
                </select>
              </label>
            </div>
          </div>

          {error && <p role="alert">{error}</p>}
          {loading ? <p role="status">Loading products…</p> : !error && products.length ? (
            <div className={styles.products}>
              {products.map((product, index) => (
                <ShopProductCard key={product.id} product={product} index={index} priority={index === 0} />
              ))}
            </div>
          ) : !error && (
            <div className={styles.emptyState}>
              <p className={styles.eyebrow}>NOTHING IN THIS EDIT</p>
              <h3>No pieces found</h3>
              <p>Try another category or clear your search.</p>
              <button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setPriceRange('all'); setGender(''); setCurrentPage(1); }}>Clear filters</button>
            </div>
          )}

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Product pages">
              <button type="button" onClick={() => handlePageChange(activePage - 1)} disabled={loading || activePage === 1}>Previous</button>
              <span aria-live="polite">Page {activePage} of {totalPages}</span>
              <button type="button" onClick={() => handlePageChange(activePage + 1)} disabled={loading || activePage === totalPages}>Next</button>
            </nav>
          )}
        </section>
      </main>

    </div>
  );
}
