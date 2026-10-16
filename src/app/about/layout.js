import { pageMetadata } from "@/lib/seo.mjs";

export const metadata = pageMetadata("/about");

export default function Layout({ children }) {
  return children;
}
