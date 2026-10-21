"use client";
import React, { useState, useEffect } from "react";
import styles from "./readytowear.module.css";
import ShopProductCard from "@/components/ShopProductCard";
import { matchesGender, SHOP_PAGE_SIZE } from "@/lib/products.mjs";
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
  const itemsPerPage = SHOP_PAGE_SIZE;

  // Products are public (see "Public can view products" RLS policy), so
  // every visitor should see them regardless of admin status — this page
  // was previously gated behind `isAdmin`, which hid all products from
  // ordinary customers.
  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).order("id", { ascending: true });
        if (!mounted) return;
        if (error) {
          console.error("Error fetching products:", error);
          setError("Unable to load the collection. Please refresh the page.");
        } else {
          setProducts(data || []);

        }
      } catch (error) { console.error("Error fetching products:", error); if (mounted) setError("Unable to load the collection. Please refresh the page."); }
      finally { if (mounted) setLoading(false); }
    };
    fetchProducts();
    return () => { mounted = false; };
  }, []);

  const categories = ["All", "Dresses", "Skirts", "Trousers", "Tops", "Jackets", "Accessories"];

  const filteredProducts = products.filter(product => {
    const categoryMatch = selectedCategory === "All" || product.category === selectedCategory;
    const priceMatch = priceRange === "all" || 
                      (priceRange === "low" && product.price <= 40000) ||
                      (priceRange === "medium" && product.price > 40000 && product.price <= 60000) ||
                      (priceRange === "high" && product.price > 60000);
    const searchContent = [
      product.name,
      product.category,
      product.description,
      JSON.stringify(product.specifications || {}),
    ].filter(Boolean).join(" ").toLowerCase();
    const searchMatch = searchQuery === "" || searchContent.includes(searchQuery.trim().toLowerCase());
    return categoryMatch && priceMatch && searchMatch && matchesGender(product, gender || "all");
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (loading) return <ShopSkeleton count={itemsPerPage} />;

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
          {currentProducts.length ? (
            <div className={styles.products}>
              {currentProducts.map((product, index) => (
                <ShopProductCard key={product.id} product={product} index={index} priority={index === 0} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.eyebrow}>NOTHING IN THIS EDIT</p>
              <h3>No pieces found</h3>
              <p>Try another category or clear your search.</p>
              <button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setPriceRange('all'); setGender(''); setCurrentPage(1); }}>Clear filters</button>
            </div>
          )}

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Product pages">
              <button type="button" onClick={() => handlePageChange(activePage - 1)} disabled={activePage === 1}>Previous</button>
              <span aria-live="polite">Page {activePage} of {totalPages}</span>
              <button type="button" onClick={() => handlePageChange(activePage + 1)} disabled={activePage === totalPages}>Next</button>
            </nav>
          )}
        </section>
      </main>

    </div>
  );
}
