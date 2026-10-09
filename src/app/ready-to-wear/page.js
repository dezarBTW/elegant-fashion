"use client";
import React, { useState, useEffect } from "react";
import styles from "./readytowear.module.css";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export default function ReadyToWear() {
  const { loading: authLoading } = useAuth();
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("featured");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const itemsPerPage = 10;

  // Products are public (see "Public can view products" RLS policy), so
  // every visitor should see them regardless of admin status — this page
  // was previously gated behind `isAdmin`, which hid all products from
  // ordinary customers.
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!cartNotice) return undefined;
    const timeout = window.setTimeout(() => setCartNotice(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [cartNotice]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

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
    return categoryMatch && priceMatch && searchMatch;
  });

  const sortedProducts = [...filteredProducts].sort((first, second) => {
    if (sortOrder === "price-ascending") return first.price - second.price;
    if (sortOrder === "price-descending") return second.price - first.price;
    if (sortOrder === "newest") return new Date(second.created_at) - new Date(first.created_at);
    return 0;
  });

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  const addToCart = (product) => {
    setCart((currentCart) => [...currentCart, product]);
    setCartNotice(`${product.name} added to your bag`);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((total, item) => total + Number(item.sale_price || item.price), 0);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Loading shop...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonPage}>
          <div className={styles.skeletonBanner} />
          <div className={styles.skeletonLayout}>
            <aside className={styles.skeletonSidebar}>
              <div className={`${styles.skeleton} ${styles.skeletonSidebarTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarLine}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarLine}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarLine}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarLine}`} />
            </aside>
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
                  <div className={styles.skeletonInfo}>
                    <div className={`${styles.skeleton} ${styles.skeletonCategory}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonPrice}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonButton}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <span className={styles.srOnly}>Sort products</span>
                <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setCurrentPage(1); }}>
                  <option value="featured">Featured</option>
                  <option value="newest">New arrivals</option>
                  <option value="price-ascending">Price: low to high</option>
                  <option value="price-descending">Price: high to low</option>
                </select>
              </label>
            </div>
          </div>

          {currentProducts.length ? (
            <div className={styles.products}>
              {currentProducts.map((product, index) => (
                <article key={product.id} className={styles.productCard} style={{ '--item-index': index }}>
                  <div className={styles.productImage}>
                    {product.image ? (
                      <Image src={product.image} alt={product.name} fill priority={index === 0} sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw" className={styles.image} />
                    ) : (
                      <div className={styles.imageFallback} aria-label="Product image coming soon">E</div>
                    )}
                    {product.sale_price && product.sale_price < product.price && <span className={styles.productBadge}>Special price</span>}
                    <button className={styles.quickAdd} type="button" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to cart`}>
                      Quick add <span aria-hidden="true">+</span>
                    </button>
                  </div>
                  <div className={styles.productInfo}>
                    <span className={styles.productCategory}>{product.category || 'Ready to wear'}</span>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <div className={styles.productMeta}>
                      <span className={styles.productPrice}>₦{Number(product.sale_price || product.price).toLocaleString('en-NG')}</span>
                      {product.sale_price && product.sale_price < product.price && <del className={styles.oldPrice}>₦{Number(product.price).toLocaleString('en-NG')}</del>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.eyebrow}>NOTHING IN THIS EDIT</p>
              <h3>No pieces found</h3>
              <p>Try another category or clear your search.</p>
              <button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setPriceRange('all'); }}>Clear filters</button>
            </div>
          )}

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Product pages">
              <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
              <span>{currentPage} <span aria-hidden="true">/</span> {totalPages}</span>
              <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
            </nav>
          )}
        </section>
      </main>

      <button className={styles.cartToggle} type="button" onClick={() => setIsCartOpen(true)} aria-label={`Open cart, ${cart.length} items`}>
        Cart <span>{cart.length}</span>
      </button>
      {cartNotice && <p className={styles.cartNotice} role="status" aria-live="polite">{cartNotice}</p>}

      {isCartOpen && (
        <div className={styles.cartOverlay} role="presentation" onClick={() => setIsCartOpen(false)}>
          <aside className={styles.cartDrawer} role="dialog" aria-modal="true" aria-labelledby="cart-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.cartHeader}>
              <div><p className={styles.eyebrow}>CART DETAILS</p><h2 id="cart-title">Your cart <span>({cart.length})</span></h2></div>
              <button type="button" className={styles.closeCart} aria-label="Close cart" onClick={() => setIsCartOpen(false)}>×</button>
            </div>
            <div className={styles.cartItems}>
              {cart.length ? cart.map((item, index) => (
                <article key={`${item.id}-${index}`} className={styles.cartItem}>
                  {item.image && <Image src={item.image} alt="" width={76} height={96} />}
                  <div className={styles.cartItemInfo}><h3>{item.name}</h3><p>₦{Number(item.sale_price || item.price).toLocaleString('en-NG')}</p></div>
                  <button type="button" className={styles.removeCartItem} onClick={() => removeFromCart(index)}>Remove</button>
                </article>
              )) : <p className={styles.emptyCart}>Your cart is empty.</p>}
            </div>
            {cart.length > 0 && <div className={styles.cartFooter}><p><span>Subtotal</span><strong>₦{cartTotal.toLocaleString('en-NG')}</strong></p><span>Shipping and taxes calculated at checkout.</span><button type="button" disabled>Continue to checkout</button></div>}
          </aside>
        </div>
      )}
    </div>
  );
}