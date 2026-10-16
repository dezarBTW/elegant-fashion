export const SITE_URL = "https://elegantstyle.com.ng";

export const publicPages = {
  "/": {
    title: "Elegant Style | Fashion, Bespoke Tailoring & Academy in Yenagoa",
    description: "Elegant Style in Yenagoa, Bayelsa: shop ready-to-wear fashion, book bespoke tailoring, or join our fashion academy at Km 4 Isaac Boro Express Way.",
  },
  "/ready-to-wear": {
    title: "Ready-to-Wear Fashion",
    description: "Shop the Elegant Style ready-to-wear collection: thoughtfully made clothing and occasionwear from our fashion house in Yenagoa, Bayelsa.",
  },
  "/course": {
    title: "Fashion Academy in Yenagoa",
    description: "Apply to Elegant Style Fashion Academy in Yenagoa, Bayelsa. Choose 3-month, 6-month or 1-year fashion design training.",
  },
  "/curriculum": {
    title: "Fashion Design Training Curriculum",
    description: "Explore Elegant Style Fashion Academy programmes, covering sewing, pattern making, garment construction and fashion business skills in Yenagoa.",
  },
  "/bespoke/request": {
    title: "Bespoke Tailoring & Fittings",
    description: "Request a bespoke outfit or book a fitting with Elegant Style in Yenagoa, Bayelsa. Clothing made around your measurements and personal style.",
  },
  "/about": {
    title: "About Our Fashion House",
    description: "Meet Elegant Style, the Bayelsa fashion house founded by Esther Patrick, offering ready-to-wear, bespoke tailoring and fashion design training.",
  },
  "/contact": {
    title: "Contact & Visit Us in Yenagoa",
    description: "Visit Elegant Style at Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State. Contact our fashion shop, tailoring studio and academy.",
  },
  "/privacy": {
    title: "Privacy Policy",
    description: "How Elegant Style handles your personal information, cookies, orders and fashion academy applications.",
  },
  "/terms": {
    title: "Terms of Service",
    description: "Read the terms for Elegant Style ready-to-wear shopping, bespoke tailoring and fashion academy services.",
  },
};

export function pageMetadata(path) {
  const { title, description } = publicPages[path];
  const socialTitle = path === "/" ? title : `${title} | Elegant Style`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_NG",
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      siteName: "Elegant Style",
      title: socialTitle,
      description,
      images: [{ url: `${SITE_URL}/images/elegant-style-navbar.png`, width: 1900, height: 636, alt: "Elegant Style" }],
    },
    twitter: { card: "summary", title: socialTitle, description, images: [`${SITE_URL}/images/elegant-style-navbar.png`] },
  };
}

export const businessStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Elegant Style",
      alternateName: "Elegant Style Fashion Academy",
      publisher: { "@id": `${SITE_URL}/#business` },
    },
    {
      "@type": "ClothingStore",
      "@id": `${SITE_URL}/#business`,
      name: "Elegant Style",
      url: SITE_URL,
      logo: `${SITE_URL}/images/elegant-style-navbar.png`,
      image: `${SITE_URL}/images/elegant-style-navbar.png`,
      description: publicPages["/"].description,
      telephone: "+2348166361710",
      email: "patrickesther26@gmail.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Km 4 Isaac Boro Express Way",
        addressLocality: "Yenagoa",
        addressRegion: "Bayelsa State",
        addressCountry: "NG",
      },
      sameAs: ["https://www.facebook.com/elegantstylefashionacademy"],
    },
  ],
};
