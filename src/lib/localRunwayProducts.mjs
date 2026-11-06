import { SHOP_PAGE_SIZE } from './products.mjs';

export const localRunwayEnabled = process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_LOCAL_RUNWAY_TEST === '1';

const looks = [
  ['sapphire-ankara', 'Sapphire Ankara Gown', 54000],
  ['powder-blue-lace', 'Powder Blue Lace Set', 46000],
  ['champagne-beaded', 'Champagne Beaded Gown', 72000],
  ['emerald-lace', 'Emerald Lace Gown', 58000],
  ['ruby-brocade', 'Ruby Brocade Ensemble', 65000],
  ['ivory-indigo', 'Ivory and Indigo Occasion Set', 39000],
];

export const localRunwayProducts = localRunwayEnabled ? looks.map(([key, name, price]) => ({
  id: `local-runway-${key}`,
  slug: `local-runway-${key}`,
  name,
  price,
  category: 'Dresses',
  gender: 'female',
  image: `/images/local-runway/${key}.png`,
  available_sizes: [],
  description: 'Local test product with a generated occasionwear photograph.',
  localFixture: true,
})) : [];

export function shuffleLocalRunway() {
  const products = [...localRunwayProducts];
  for (let i = products.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [products[i], products[j]] = [products[j], products[i]];
  }
  return products;
}

export function localShopPage({ page, search, category, price, gender }) {
  const term = search.trim().toLowerCase();
  const products = localRunwayProducts.filter(product =>
    (category === 'All' || product.category === category) &&
    (!gender || gender === 'all' || product.gender === gender) &&
    `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(term) &&
    (price === 'all' || (price === 'low' && product.price <= 40000) ||
      (price === 'medium' && product.price > 40000 && product.price <= 60000) ||
      (price === 'high' && product.price > 60000)));
  const current = Math.min(page, Math.max(1, Math.ceil(products.length / SHOP_PAGE_SIZE)));
  return {
    page: current,
    total: products.length,
    products: products.slice((current - 1) * SHOP_PAGE_SIZE, current * SHOP_PAGE_SIZE),
  };
}
