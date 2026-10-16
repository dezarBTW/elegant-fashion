import { pageMetadata } from "@/lib/seo.mjs";

export const metadata = pageMetadata("/course");

export default function Layout({ children }) {
  return children;
}
