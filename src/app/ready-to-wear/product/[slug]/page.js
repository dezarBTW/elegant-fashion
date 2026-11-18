import AdminProductDetails from "./AdminProductDetails";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ready-to-wear | Elegant Style", robots: { index: false, follow: false } };
export default async function ProductPage({ params }) {
  const { slug } = await params;
  return <AdminProductDetails slug={slug} />;
}
