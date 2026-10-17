"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import styles from "../admin/adminShell.module.css";

const sections = [{ href: "/account", label: "Profile & account" }, { href: "/account/orders", label: "My orders" }, { href: "/account/requests", label: "Refunds & complaints" }];

export default function AccountShell({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/sign-in"); }, [user, loading, router]);
  if (loading || !user) return <div className={styles.centerBox} role="status">{loading ? "Loading your account…" : "Redirecting to sign in…"}</div>;
  return <div className={styles.shell}><div className={styles.inner}>
    <nav className={styles.sidebar} aria-label="Account sections">
      <span className={styles.sideTitle}>My account</span>
      {sections.map((section) => <Link key={section.href} href={section.href} className={`${styles.sideLink} ${pathname === section.href ? styles.sideLinkActive : ""}`} aria-current={pathname === section.href ? "page" : undefined}>{section.label}</Link>)}
      {isAdmin && <><div className={styles.sideDivider} /><Link className={styles.sideLink} href="/admin">Admin dashboard</Link></>}
      <div className={styles.sideDivider} /><Link className={styles.sideLink} href="/ready-to-wear">Continue shopping</Link>
    </nav>
    <main className={styles.content}>{children}</main>
  </div></div>;
}
