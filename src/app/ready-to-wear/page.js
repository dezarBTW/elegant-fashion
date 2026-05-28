"use client";
import React, { useState, useEffect } from "react";
import styles from "./readytowear.module.css";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export default function ReadyToWear() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin]);

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
    const searchMatch = searchQuery === "" || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && priceMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((total, item) => total + item.price, 0);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <Navbar />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <Navbar />
        <div className={styles.unavailableContainer}>
          <div className={styles.unavailableContent}>
            <div className={styles.unavailableIcon}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 className={styles.unavailableTitle}>Coming Soon</h2>
            <p className={styles.unavailableMessage}>Ready to wear products are still unavailable at this moment.</p>
            <Link href="/" className={styles.backButton}>
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <Navbar />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navbar />

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
          <h2 className={styles.promoTitle}>Summer Sale - Up to 30% Off</h2>
          <p className={styles.promoSubtitle}>Limited time offer on selected items</p>
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
                ₦40,000 - ₦60,000
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
                    <span className={styles.stars}>{"★".repeat(Math.floor(product.rating))}</span>
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
        <aside className={`${styles.cartSidebar} ${cart.length > 0 ? styles.open : ''}`}>
          <div className={styles.cartHeader}>
            <h3 className={styles.cartTitle}>Shopping Cart ({cart.length})</h3>
            <button className={styles.closeCart} onClick={() => setCart([])}>×</button>
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
        <button className={styles.cartToggle} onClick={() => setCart([])}>
          🛒 {cart.length}
        </button>
      )}
    </div>
  );
}