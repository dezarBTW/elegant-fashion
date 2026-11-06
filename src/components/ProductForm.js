"use client";
import Image from "next/image";
import { PRODUCT_SIZES, PRODUCT_GENDERS } from "@/lib/products.mjs";
import styles from "./ProductForm.module.css";

export default function ProductForm({
  formData,
  editMode,
  saving,
  handleSubmit,
  handleChange,
  handleImageUpload,
  onQuantityChange,
  resetForm,
  onCancel,
  vendor = false,
}) {
  return (
    <div className={styles["form-section"]}>
      <h2>{editMode ? "Edit Product" : "Add New Product"}</h2>
      <form
        aria-busy={saving}
        onSubmit={handleSubmit}
        className={styles["product-form"]}
      >
        <fieldset className={styles.fields} disabled={saving}>
          <div className={styles["form-group"]}>
            <label htmlFor="product-name-input">Product Name *</label>
            <input
              id="product-name-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={200}
              placeholder="Enter product name"
            />
          </div>

          <div className={styles["form-group"]}>
            <label htmlFor="product-price-input">Price (₦) *</label>
            <input
              id="product-price-input"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              placeholder="Enter price"
              min="0.01"
              max="999999999"
              step="0.01"
            />
          </div>

          <div className={styles["form-group"]}>
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

          <div className={styles["form-group"]}>
            <label htmlFor="product-image-input">Product Image</label>
            <input
              id="product-image-input"
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              disabled={saving}
              onChange={handleImageUpload}
            />
            {formData.image && (
              <div className={styles["image-preview"]}>
                <Image
                  src={formData.image}
                  alt="Preview"
                  width={100}
                  height={100}
                  className={styles["preview-image"]}
                />
              </div>
            )}
          </div>

          <div className={styles["form-group"]}>
            <label htmlFor="product-gender">Gender *</label>
            <select
              id="product-gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select gender</option>
              {PRODUCT_GENDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p>
              Unisex products appear in both Male fashion and Female fashion.
            </p>
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="product-description">
              Brief product description
            </label>
            <textarea
              id="product-description"
              name="description"
              rows={4}
              maxLength={2000}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the fabric, fit and key details."
              required
            />
          </div>
          <fieldset className={styles["available-sizes"]} disabled={saving}>
            <legend>Stock quantity for each size</legend>
            <p>
              Enter units currently in stock for each size. Use 0 for
              unavailable sizes. Stock includes units reserved for pending
              payments.
            </p>
            <div>
              {PRODUCT_SIZES.map((option) => (
                <label key={option.value}>
                  {option.label}
                  <input
                    type="number"
                    aria-label={`Stock for ${option.label}`}
                    min="0"
                    max="999999"
                    step="1"
                    required
                    value={formData.quantities[option.value]}
                    onChange={(event) =>
                      onQuantityChange(option.value, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {vendor && (
            <p>
              Check your price carefully: you are responsible for the price a
              customer successfully pays.
            </p>
          )}
          <div className={styles["form-actions"]}>
            <button
              type="submit"
              className={styles["submit-btn"]}
              disabled={saving}
            >
              {editMode ? "Update Product" : "Add Product"}
            </button>
            {(editMode || onCancel) && (
              <button
                type="button"
                onClick={onCancel || resetForm}
                className={styles["cancel-btn"]}
              >
                Cancel
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </div>
  );
}
