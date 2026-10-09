"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./adminShell.module.css";

async function countRows(table, applyFilter) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (applyFilter) query = applyFilter(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// Landing page of the admin area: a quick count of what needs attention.
export default function AdminOverview() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    const loadStats = async () => {
      try {
        const [products, pendingStudents, acceptedStudents, newBespoke, totalBespoke] = await Promise.all([
          countRows("products"),
          countRows("students", (query) => query.eq("status", "pending")),
          countRows("students", (query) => query.eq("status", "accepted")),
          countRows("bespoke_requests", (query) => query.eq("status", "new")),
          countRows("bespoke_requests"),
        ]);

        if (active) {
          setStats({ products, pendingStudents, acceptedStudents, newBespoke, totalBespoke });
        }
      } catch (err) {
        console.error("Could not load admin overview:", err);
        if (active) setError("Could not load the dashboard numbers. Please refresh the page.");
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  const value = (key) => (stats ? stats[key] : "–");

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Admin overview</h1>
          <p className={styles.pageSub}>Everything you manage on the site, in one place.</p>
        </div>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.statGrid}>
        <Link href="/admin/bespoke" className={styles.statCard}>
          <span className={styles.statLabel}>New bespoke requests</span>
          <span className={styles.statValue}>{value("newBespoke")}</span>
          <span className={styles.statHint}>
            {stats ? `${stats.totalBespoke} requests in total` : "Open requests"}
          </span>
        </Link>

        <Link href="/admin/students" className={styles.statCard}>
          <span className={styles.statLabel}>Pending applications</span>
          <span className={styles.statValue}>{value("pendingStudents")}</span>
          <span className={styles.statHint}>
            {stats ? `${stats.acceptedStudents} students accepted` : "Fashion academy"}
          </span>
        </Link>

        <Link href="/admin/products" className={styles.statCard}>
          <span className={styles.statLabel}>Products</span>
          <span className={styles.statValue}>{value("products")}</span>
          <span className={styles.statHint}>Add, edit or remove items</span>
        </Link>
      </div>
    </>
  );
}
