import { pageMetadata } from "@/lib/seo.mjs";

export const metadata = pageMetadata("/terms");

export default function Layout({ children }) {
  return children;
}
