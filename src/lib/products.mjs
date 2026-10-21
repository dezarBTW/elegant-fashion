export const PRODUCT_SIZES = [
  { value: "S", label: "Small (S)" },
  { value: "M", label: "Medium (M)" },
  { value: "L", label: "Large (L)" },
  { value: "XL", label: "Extra Large (XL)" },
  { value: "XXL", label: "Extra Extra Large (XXL)" },
];
export const SIZE_VALUES = PRODUCT_SIZES.map(({ value }) => value);
// Complete rows at the shop's two-, three- and four-column breakpoints.
export const SHOP_PAGE_SIZE = 12;
export const PRODUCT_GENDERS = [
  { value: 'male', label: 'Male fashion' },
  { value: 'female', label: 'Female fashion' },
  { value: 'unisex', label: 'Unisex (both)' },
];
export const matchesGender = (product, gender) => gender === 'all' || product.gender === gender || product.gender === 'unisex';
export const productHref = (product) => `/ready-to-wear/product/${encodeURIComponent(product.slug || product.id)}`;
export const productPrice = (product) => Number(product.sale_price ?? product.price);
export const availableSizes = (product) => SIZE_VALUES.filter(size => product.available_sizes?.includes(size));

// Category is the strongest similarity signal; wording and price rank that category.
export function recommendProducts(product, candidates, limit = 6) {
  const category = product.category?.trim().toLowerCase();
  if (!category) return [];
  const tokens = value => new Set(String(value || "").toLowerCase().match(/[a-z]{3,}/g) || []);
  const sourceWords = tokens(`${product.name} ${product.description || ""}`);
  const price = productPrice(product);
  const unique = new Map();
  for (const candidate of candidates) {
    if (candidate.id === product.id || candidate.is_active !== true || !availableSizes(candidate).length || candidate.category?.trim().toLowerCase() !== category) continue;
    unique.set(candidate.id, candidate);
  }
  return [...unique.values()].map(candidate => {
    const words = tokens(`${candidate.name} ${candidate.description || ""}`);
    const overlap = [...words].filter(word => sourceWords.has(word)).length;
    const proximity = 1 - Math.min(1, Math.abs(productPrice(candidate) - price) / Math.max(price, 1));
    return { candidate, score: overlap * 3 + proximity + (candidate.is_featured ? 0.25 : 0) };
  }).sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id))
    .slice(0, Math.max(0, Math.min(6, Math.floor(limit) || 0))).map(({ candidate }) => candidate);
}
