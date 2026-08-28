"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import styles from "./admin.css";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage, sanitizeText, validateImageFile } from "@/lib/sanitizeInput";

export default function ProductsAdmin() {
  const { user, userData, loading, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    rating: "4.5",
    reviews: "0"
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [submitted, isAdmin]);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(false);

    const rateLimit = consumeRateLimit(`admin-product-write:${user.id}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      alert(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    const productData = {
      name: sanitizeText(formData.name),
      price: parseFloat(formData.price),
      category: sanitizeText(formData.category),
      image: formData.image || "/images/placeholder.jpg",
      rating: parseFloat(formData.rating),
      reviews: parseInt(formData.reviews)
    };

    if (editMode && editId) {
      // Update existing product
      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editId);
      
      if (error) {
        console.error("Error updating product:", error);
        alert("Error updating product");
      } else {
        console.log("Product updated successfully:", data);
        alert("Product updated successfully");
        resetForm();
        setSubmitted(true);
      }
    } else {
      // Insert new product
      const { data, error } = await supabase
        .from("products")
        .insert([productData]);
      
      if (error) {
        console.error("Error inserting product:", error);
        alert("Error inserting product");
      } else {
        console.log("Product inserted successfully:", data);
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
      image: product.image,
      rating: product.rating,
      reviews: product.reviews
    });
  };

  const handleDelete = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    const rateLimit = consumeRateLimit(`admin-product-delete:${user.id}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      alert(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setSubmitted(false);
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    
    if (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product");
    } else {
      console.log("Product deleted successfully:", data);
      alert("Product deleted successfully");
      setSubmitted(true);
    }
  };

  const resetForm = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({
      name: "",
      price: "",
      category: "",
      image: "",
      rating: "4.5",
      reviews: "0"
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
      // Upload to Supabase storage
      const fileName = `${Date.now()}.${validation.extension}`;
      const filePath = `products/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
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

      // Get public URL
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

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-container">
          <div className="spinner" aria-hidden="true" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <h1>Access Denied</h1>
        <p>You need admin privileges to access this page.</p>
        <Link href="/">Go to Home</Link>
      </div>
    );
  }

  return (
    <div className="admin-products-container">
      <div className="admin-header">
        <h1>Product Management</h1>
      </div>

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

          <div className="form-row">
            <div className="form-group">
              <label>Rating (1-5)</label>
              <input
                type="number"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                min="1"
                max="5"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label>Reviews Count</label>
              <input
                type="number"
                name="reviews"
                value={formData.reviews}
                onChange={handleChange}
                min="0"
              />
            </div>
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
        <h2>Products ({products.length})</h2>
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <Image
                  src={product.image || "/images/placeholder.jpg"}
                  alt={product.name}
                  width={200}
                  height={250}
                  className="product-image"
                />
              </div>
              <div className="product-details">
                <h3>{product.name}</h3>
                <p className="product-category">{product.category}</p>
                <p className="product-price">₦{product.price?.toLocaleString()}</p>
                <p className="product-rating">
                  ★ {product.rating} ({product.reviews} reviews)
                </p>
              </div>
              <div className="product-actions">
                <button
                  onClick={() => handleEdit(product)}
                  className="edit-btn"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
