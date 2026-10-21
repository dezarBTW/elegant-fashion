import "./globals.css";
import Navbar from "@/components/Navbar";
import CookieConsent from "@/components/CookieConsent";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { SITE_URL, pageMetadata } from "@/lib/seo.mjs";

export const metadata = {
  ...pageMetadata("/"),
  metadataBase: new URL(SITE_URL),
  title: { default: pageMetadata("/").title, template: "%s | Elegant Style" },
  robots: { index: true, follow: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >

      <body>
        <AuthProvider>
          <CartProvider>
          <Navbar />
          {children}
          </CartProvider>
        </AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
