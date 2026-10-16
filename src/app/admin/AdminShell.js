"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./adminShell.module.css";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/students", label: "Student applications" },
  { href: "/admin/bespoke", label: "Bespoke requests" },
];

// Everything under /admin goes through this layout. Non-admins only ever see the
// "Access denied" message: no admin navigation and no admin page is rendered for them.
// The database enforces the same rule with row-level security, so this is a second lock.
export default function AdminLayout({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className={styles.centerBox} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className={styles.centerBox}>
        <h1 className={styles.pageTitle}>Access denied</h1>
        <p className={styles.pageSub}>You need an administrator account to open this page.</p>
        <Link href="/" className={`${styles.btn} ${styles.btnPrimary}`}>
          Go to home
        </Link>
      </div>
    );
  }

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <nav className={styles.sidebar} aria-label="Admin sections">
          <span className={styles.sideTitle}>Admin</span>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.sideLink} ${isActive(item) ? styles.sideLinkActive : ""}`}
              aria-current={isActive(item) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <div className={styles.sideDivider} />
          <Link href="/" className={styles.sideLink}>
            Back to website
          </Link>
        </nav>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
