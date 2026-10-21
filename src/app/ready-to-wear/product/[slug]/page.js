import { notFound } from 'next/navigation';
import { getPublicProduct, getRecommendations } from '@/lib/productServer';
import { productHref } from '@/lib/products.mjs';
import { SITE_URL } from '@/lib/seo.mjs';
import ProductDetails from './ProductDetails';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) return { title: 'Product unavailable', robots: { index: false, follow: false } };
  const description = product.description?.slice(0, 160) || `Explore ${product.name} from Elegant Style. Select your available size or request a different size or colour.`;
  return { title: { absolute: `${product.name} | Elegant Style` }, description, alternates: { canonical: productHref(product) }, openGraph: { title: `${product.name} | Elegant Style`, description, url: `${SITE_URL}${productHref(product)}`, images: product.image ? [{ url: product.image, alt: product.name }] : [] } };
}
export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();
  return <ProductDetails key={product.id} product={product} recommendations={await getRecommendations(product)} />;
}
