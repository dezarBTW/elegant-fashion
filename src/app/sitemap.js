import { SITE_URL, publicPages } from "@/lib/seo.mjs";

export default function sitemap() {
  return Object.keys(publicPages).map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
