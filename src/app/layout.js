import "./globals.css";
import Navbar from "@/components/Navbar";
import CookieConsent from "@/components/CookieConsent";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata = {
  title: "Elegant Style",
  description: "Ready-to-wear, bespoke tailoring, and fashion design training.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >

      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
