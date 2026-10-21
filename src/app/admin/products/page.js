"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { authenticatedFetch } from '@/lib/clientApi';
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage, sanitizeText, validateImageFile } from "@/lib/sanitizeInput";
import { invalidateCachedValue } from "@/lib/browserCache";
import shellStyles from "../adminShell.module.css";
// The product cards use the same styles as the Ready-to-wear shop page.
import shopStyles from "../../ready-to-wear/readytowear.module.css";
import { PRODUCT_SIZES, PRODUCT_GENDERS, availableSizes } from "@/lib/products.mjs";
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
    gender: "",
    description: "",
    available_sizes: [],
    quantities:{S:0,M:0,L:0,XL:0,XXL:0},stock_revision:null,
    image: ""
  });
  const [stocks,setStocks]=useState({});
  const [saving,setSaving]=useState(false);
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
    window.scrollTo({ top: 0, behavior: "auto" });
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

    const {data:stockRows,error:stockError}=await supabase.from('product_size_stock').select('*');
    if(stockError){alert('Unable to load stock. Please refresh before editing.');return;}
    setStocks(Object.fromEntries((stockRows||[]).map(row=>[row.product_id,row])));
    setProducts(all);
  };

  useEffect(() => {
    if (!isAdmin) return;
    const frame = requestAnimationFrame(() => fetchProducts());
    return () => cancelAnimationFrame(frame);
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
      gender: formData.gender,
      description: sanitizeText(formData.description),
      available_sizes: availableSizes(formData),
      image: formData.image || null
    };

    if (!PRODUCT_GENDERS.some(option => option.value === productData.gender)) {
      alert("Select Male fashion, Female fashion or Unisex for this product.");
      return;
    }
    if (!editMode && !Object.values(formData.quantities).some(value=>Number(value)>0)) {
      alert("Enter stock for at least one size for this new product.");
      return;
    }

    if(saving)return;setSaving(true);
    try {
      const {available_sizes,...details}=productData;
      await authenticatedFetch('/api/admin/products',{method:'POST',body:JSON.stringify({id:editMode?editId:crypto.randomUUID(),revision:formData.stock_revision,product:details,quantities:Object.fromEntries(PRODUCT_SIZES.map(({value})=>[value,Number(formData.quantities[value])]))})});
      invalidateCachedValue(PRODUCTS_CACHE_KEY);alert(editMode?'Product updated successfully':'Product inserted successfully');resetForm();setSubmitted(true);
    }catch(error){alert(error.message);}finally{setSaving(false);}
  };

  const handleEdit = (product) => {
    setEditMode(true);
    setEditId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category,
      gender: product.gender || "",
      description: product.description || "",
      available_sizes: availableSizes(product),
      quantities:stocks[product.id]?.quantities||{S:0,M:0,L:0,XL:0,XXL:0},stock_revision:stocks[product.id]?.revision??null,
      image: product.image
    });
    window.scrollTo({ top: 0, behavior: "auto" });
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
      alert(error.code==='23514'?'This product has a pending payment reservation. Resolve that payment before deleting it.':'Error deleting product');
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
      gender: "",
      description: "",
      available_sizes: [],
    quantities:{S:0,M:0,L:0,XL:0,XXL:0},stock_revision:null,
      image: ""
    });
  };

  const handleChange = (e) => {
    const value = e.target.value;
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

      setFormData(current => ({
        ...current,
        image: publicUrl
      }));
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
              <label htmlFor="product-name-input">Product Name *</label>
              <input
                id="product-name-input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-price-input">Price (₦) *</label>
              <input
                id="product-price-input"
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
              <label htmlFor="product-category-input">Category *</label>
              <select
                id="product-category-input"
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
              <label htmlFor="product-image-input">Product Image</label>
              <input
                id="product-image-input"
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

            <div className="form-group">
              <label htmlFor="product-gender">Gender *</label>
              <select id="product-gender" name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="">Select gender</option>
                {PRODUCT_GENDERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p>Unisex products appear in both Male fashion and Female fashion.</p>
            </div>
            <div className="form-group">
              <label htmlFor="product-description">Brief product description</label>
              <textarea id="product-description" name="description" rows={4} maxLength={2000} value={formData.description} onChange={handleChange} placeholder="Describe the fabric, fit and key details." required />
            </div>
            <fieldset className="available-sizes" disabled={saving}>
              <legend>Stock quantity for each size</legend>
              <p>Enter units currently in stock for each size. Use 0 for unavailable sizes. Stock includes units reserved for pending payments.</p>
              <div>{PRODUCT_SIZES.map(option=><label key={option.value}>{option.label}<input type="number" aria-label={`Stock for ${option.label}`} min="0" max="999999" step="1" required value={formData.quantities[option.value]} onChange={event=>setFormData(current=>({...current,quantities:{...current.quantities,[option.value]:event.target.value}}))} /></label>)}</div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={saving}>
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
                    <p className={shopStyles.productCategory}>{PRODUCT_GENDERS.find(option => option.value === product.gender)?.label || 'Gender not set — edit to choose'}</p>
                    <p className={shopStyles.productCategory}>Stock: {PRODUCT_SIZES.map(({value})=>`${value}: ${stocks[product.id]?.quantities[value]||0}`).join(' · ')}</p>
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
