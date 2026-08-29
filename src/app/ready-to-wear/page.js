"use client";
import React, { useState, useEffect } from "react";
import styles from "./readytowear.module.css";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { getCachedValue, setCachedValue } from "@/lib/browserCache";

const PRODUCTS_CACHE_KEY = "products:v1";
const PRODUCTS_CACHE_TTL_MS = 10 * 60 * 1000;
const CART_CACHE_KEY = "shopping-cart:v1";
const CART_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function ProductSkeleton() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
      <div className={styles.skeletonInfo}>
        <div className={`${styles.skeleton} ${styles.skeletonCategory}`} />
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonPrice}`} />
        <div className={`${styles.skeleton} ${styles.skeletonButton}`} />
      </div>
    </div>
  );
}

export default function ReadyToWear() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [cart, setCart] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  // Products are public (see "Public can view products" RLS policy), so
  // every visitor should see them regardless of admin status — this page
  // was previously gated behind `isAdmin`, which hid all products from
  // ordinary customers.
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      const cachedProducts = getCachedValue(PRODUCTS_CACHE_KEY);
      if (cachedProducts) {
        if (isMounted) {
          setProducts(cachedProducts);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.from("products").select("*");
      if (!isMounted) return;

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        const productList = data || [];
        setProducts(productList);
        setCachedValue(PRODUCTS_CACHE_KEY, productList, PRODUCTS_CACHE_TTL_MS);
      }
      setLoading(false);
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedCart = getCachedValue(CART_CACHE_KEY);
      if (Array.isArray(savedCart)) setCart(savedCart);
      setCartLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (cartLoaded) setCachedValue(CART_CACHE_KEY, cart, CART_CACHE_TTL_MS);
  }, [cart, cartLoaded]);

  const categories = ["All", "Dresses", "Skirts", "Trousers", "Tops", "Jackets", "Accessories"];

  const filteredProducts = products.filter(product => {
    const categoryMatch = selectedCategory === "All" || product.category === selectedCategory;
    const priceMatch = priceRange === "all" || 
                      (priceRange === "low" && product.price <= 40000) ||
                      (priceRange === "medium" && product.price > 40000 && product.price <= 60000) ||
                      (priceRange === "high" && product.price > 60000);
    const searchMatch = searchQuery === "" || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && priceMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const addToCart = (product) => {
    setCart((currentCart) => [...currentCart, product]);
    setIsCartOpen(true);
  };

  const removeFromCart = (index) => {
    setCart((currentCart) => currentCart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((total, item) => total + item.price, 0);

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
        <div className={styles.skeletonPage} aria-label="Loading products" aria-busy="true">
          <div className={`${styles.skeleton} ${styles.skeletonBanner}`} />
          <div className={styles.skeletonLayout}>
            <div className={styles.skeletonSidebar}>
              <div className={`${styles.skeleton} ${styles.skeletonSidebarTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarLine}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarLine}`} />
              <div className={`${styles.skeleton} ${styles.skeletonSidebarLine}`} />
            </div>
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 6 }, (_, index) => <ProductSkeleton key={index} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Admin Toolbar - only visible to admins */}
      {isAdmin && (
        <section className={styles.adminToolbar}>
          <Link href="/admin" className={styles.manageProductsButton}>
            Product Management
          </Link>
        </section>
      )}

      {/* Search Bar Section */}
      <section className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search for products..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className={styles.searchButton}>Search</button>
        </div>
      </section>

      {/* Promotional Banner */}
      <section className={styles.promoBanner}>
        <div className={styles.promoContent}>
          <p className={styles.promoEyebrow}>Ready-to-wear</p>
          <h2 className={styles.promoTitle}>The Current Edit</h2>
          <p className={styles.promoSubtitle}>Considered pieces, released in limited quantities.</p>
        </div>
      </section>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Sidebar Filters */}
        <aside className={styles.sidebar}>
          <div className={styles.filterSection}>
            <h3 className={styles.filterTitle}>Categories</h3>
            <div className={styles.categoryList}>
              {categories.map(category => (
                <button
                  key={category}
                  className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentPage(1);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <h3 className={styles.filterTitle}>Price Range</h3>
            <div className={styles.priceOptions}>
              <label className={styles.priceOption}>
                <input
                  type="radio"
                  name="price"
                  value="all"
                  checked={priceRange === "all"}
                  onChange={(e) => {
                    setPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                All Prices
              </label>
              <label className={styles.priceOption}>
                <input
                  type="radio"
                  name="price"
                  value="low"
                  checked={priceRange === "low"}
                  onChange={(e) => {
                    setPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                Under ₦40,000
              </label>
              <label className={styles.priceOption}>
                <input
                  type="radio"
                  name="price"
                  value="medium"
                  checked={priceRange === "medium"}
                  onChange={(e) => {
                    setPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                ₦40,000 – ₦60,000
              </label>
              <label className={styles.priceOption}>
                <input
                  type="radio"
                  name="price"
                  value="high"
                  checked={priceRange === "high"}
                  onChange={(e) => {
                    setPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                Over ₦60,000
              </label>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className={styles.productGrid}>
          <div className={styles.gridHeader}>
            <h2 className={styles.gridTitle}>{filteredProducts.length} Products</h2>
            <select className={styles.sortSelect}>
              <option>Sort by: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest</option>
              <option>Top Rated</option>
            </select>
          </div>

          <div className={styles.products}>
            {currentProducts.map(product => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImage}>
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={300}
                    height={400}
                    className={styles.image}
                  />
                  <div className={styles.productBadge}>New</div>
                  <div className={styles.productOverlay}>
                    <button
                      className={styles.quickViewButton}
                      onClick={() => addToCart(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
                <div className={styles.productInfo}>
                  <span className={styles.productCategory}>{product.category}</span>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productRating}>
                    <span className={styles.stars}>{"★".repeat(Math.floor(product.rating || 0))}</span>
                    <span className={styles.reviews}>({product.reviews})</span>
                  </div>
                  <p className={styles.productPrice}>₦{product.price.toLocaleString()}</p>
                  <button
                    className={styles.addToCartButton}
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </main>

        {/* Shopping Cart Sidebar */}
        <aside className={`${styles.cartSidebar} ${isCartOpen && cart.length > 0 ? styles.open : ''}`}>
          <div className={styles.cartHeader}>
            <h3 className={styles.cartTitle}>Shopping Cart ({cart.length})</h3>
            <button className={styles.closeCart} onClick={() => setIsCartOpen(false)} aria-label="Close cart">×</button>
          </div>
          <div className={styles.cartItems}>
            {cart.map((item, index) => (
              <div key={index} className={styles.cartItem}>
                <div className={styles.cartItemImage}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={60}
                    height={80}
                  />
                </div>
                <div className={styles.cartItemInfo}>
                  <h4 className={styles.cartItemName}>{item.name}</h4>
                  <p className={styles.cartItemPrice}>₦{item.price.toLocaleString()}</p>
                </div>
                <button
                  className={styles.removeCartItem}
                  onClick={() => removeFromCart(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className={styles.cartFooter}>
            <div className={styles.cartTotal}>
              <span>Total:</span>
              <span>₦{cartTotal.toLocaleString()}</span>
            </div>
            <button className={styles.checkoutButton}>Proceed to Checkout</button>
          </div>
        </aside>
      </div>

      {/* Cart Toggle Button */}
      {cart.length > 0 && (
        <button className={styles.cartToggle} onClick={() => setIsCartOpen((open) => !open)}>
          Cart ({cart.length})
        </button>
      )}
    </div>
  );
}
