"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage, sanitizeText, validateImageFile } from "@/lib/sanitizeInput";
import { invalidateCachedValue } from "@/lib/browserCache";
import shellStyles from "../adminShell.module.css";
// The product cards use the same styles as the Ready-to-wear shop page.
import shopStyles from "../../ready-to-wear/readytowear.module.css";
import "../admin.css";

const PRODUCTS_CACHE_KEY = "products:v1";
const PAGE_SIZE = 24;
const BASE_CATEGORIES = ["Dresses", "Skirts", "Trousers", "Tops", "Jackets", "Accessories"];

// Product management. It used to live at /admin; the admin layout now provides the sidebar
// and the access check, and the database only lets admins change products.
export default function ProductsAdmin() {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    image: ""
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [page, setPage] = useState(1);

  const categoryOptions = useMemo(
    () => ["All", ...new Set([...BASE_CATEGORIES, ...products.map((product) => product.category).filter(Boolean)])],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryFilter !== "All" && product.category !== categoryFilter) return false;
      if (!term) return true;
      const haystack = [product.name, product.category, product.description].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [products, search, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Supabase returns at most 1000 rows per request, so keep asking until every product is loaded.
  const fetchProducts = async () => {
    const batchSize = 1000;
    const all = [];

    for (let from = 0; ; from += batchSize) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error("Error fetching products:", error);
        return;
      }

      all.push(...(data || []));
      if (!data || data.length < batchSize) break;
    }

    setProducts(all);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [submitted, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(false);

    if (!user) {
      alert("Authentication error. Please sign in again.");
      return;
    }

    const rateLimit = consumeRateLimit(`admin-product-write:${user.id}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      alert(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    const productData = {
      name: sanitizeText(formData.name),
      price: parseFloat(formData.price),
      category: sanitizeText(formData.category),
      image: formData.image || "/images/placeholder.jpg"
    };

    if (editMode && editId) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editId);

      if (error) {
        console.error("Error updating product:", error);
        alert("Error updating product");
      } else {
        invalidateCachedValue(PRODUCTS_CACHE_KEY);
        alert("Product updated successfully");
        resetForm();
        setSubmitted(true);
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) {
        console.error("Error inserting product:", error);
        alert("Error inserting product");
      } else {
        invalidateCachedValue(PRODUCTS_CACHE_KEY);
        alert("Product inserted successfully");
        resetForm();
        setSubmitted(true);
      }
    }
  };

  const handleEdit = (product) => {
    setEditMode(true);
    setEditId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    if (!user) {
      alert("Authentication error. Please sign in again.");
      return;
    }

    const rateLimit = consumeRateLimit(`admin-product-delete:${user.id}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      alert(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setSubmitted(false);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product");
    } else {
      invalidateCachedValue(PRODUCTS_CACHE_KEY);
      alert("Product deleted successfully");
      setProducts((current) => current.filter((product) => product.id !== productId));
    }
  };

  const resetForm = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({
      name: "",
      price: "",
      category: "",
      image: ""
    });
  };

  const handleChange = (e) => {
    const value = ["name", "category"].includes(e.target.name)
      ? sanitizeText(e.target.value)
      : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.message);
      e.target.value = "";
      return;
    }

    try {
      const fileName = `${Date.now()}.${validation.extension}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        alert("Error uploading image. Please try again.");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({
        ...formData,
        image: publicUrl
      });
    } catch (error) {
      console.error("Error handling image upload:", error);
      alert("Error uploading image. Please try again.");
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={shellStyles.productsWrap}>
      <div className={shellStyles.pageHeader}>
        <div>
          <h1 className={shellStyles.pageTitle}>Products</h1>
          <p className={shellStyles.pageSub}>
            Manage the pieces sold in the Ready-to-wear shop. Add a new product with its photo, price and
            category, edit the details of an existing one, or delete products you no longer sell. Changes
            appear on the shop page straight away.
          </p>
        </div>
      </div>

      <div className="admin-products-container">

        {/* Form Section */}
        <div className="form-section">
          <h2>{editMode ? "Edit Product" : "Add New Product"}</h2>
          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label>Price (₦) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                placeholder="Enter price"
                min="0"
                step="100"
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select category</option>
                <option value="Dresses">Dresses</option>
                <option value="Skirts">Skirts</option>
                <option value="Trousers">Trousers</option>
                <option value="Tops">Tops</option>
                <option value="Jackets">Jackets</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            <div className="form-group">
              <label>Product Image</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {formData.image && (
                <div className="image-preview">
                  <Image
                    src={formData.image}
                    alt="Preview"
                    width={100}
                    height={100}
                    className="preview-image"
                  />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editMode ? "Update Product" : "Add Product"}
              </button>
              {editMode && (
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Products List */}
        <div className="products-list-section">
          <h2>
            Products ({filteredProducts.length}
            {filteredProducts.length !== products.length ? ` of ${products.length}` : ""})
          </h2>

          <div className={shellStyles.toolbar}>
            <input
              type="search"
              className={shellStyles.search}
              placeholder="Search products by name, category or description"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Search products"
            />
            <select
              className={shellStyles.selectField}
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All categories" : category}
                </option>
              ))}
            </select>
          </div>

          {pageProducts.length === 0 ? (
            <div className={shellStyles.empty}>
              {products.length === 0 ? "No products yet. Add your first one above." : "No products match your search."}
            </div>
          ) : (
            <div className={shopStyles.products}>
              {pageProducts.map((product, index) => (
                <article
                  key={product.id}
                  className={shopStyles.productCard}
                  style={{ "--item-index": index % 8 }}
                >
                  <div className={shopStyles.productImage}>
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 680px) 50vw, (max-width: 1200px) 25vw, 18vw"
                        className={shopStyles.image}
                      />
                    ) : (
                      <div className={shopStyles.imageFallback} aria-label="No product image">E</div>
                    )}
                    {product.sale_price && product.sale_price < product.price && (
                      <span className={shopStyles.productBadge}>Special price</span>
                    )}
                  </div>
                  <div className={shopStyles.productInfo}>
                    <span className={shopStyles.productCategory}>{product.category || "Uncategorised"}</span>
                    <h3 className={shopStyles.productName}>{product.name}</h3>
                    <div className={shopStyles.productMeta}>
                      <span className={shopStyles.productPrice}>
                        ₦{Number(product.sale_price || product.price).toLocaleString("en-NG")}
                      </span>
                      {product.sale_price && product.sale_price < product.price && (
                        <del className={shopStyles.oldPrice}>₦{Number(product.price).toLocaleString("en-NG")}</del>
                      )}
                    </div>
                    <div className={shellStyles.productAdminActions}>
                      <button
                        type="button"
                        className={`${shellStyles.btn} ${shellStyles.btnSmall}`}
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${shellStyles.btn} ${shellStyles.btnSmall} ${shellStyles.btnDanger}`}
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className={shopStyles.pagination} aria-label="Product pages">
              <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                Previous
              </button>
              <span>
                {currentPage} <span aria-hidden="true">/</span> {totalPages}
              </span>
              <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
