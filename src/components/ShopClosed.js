import Link from "next/link";
import styles from "@/app/ready-to-wear/readytowear.module.css";
import { SHOP_CLOSED_MESSAGE } from "@/lib/shopAvailability.mjs";

export default function ShopClosed() {
  return (
    <div className={styles.container}>
      <main className={styles.unavailableContainer}>
        <section className={styles.unavailableContent} aria-labelledby="shop-closed-title">
          <p className={styles.eyebrow}>READY TO WEAR</p>
          <h1 className={styles.unavailableTitle} id="shop-closed-title">The collection is being prepared</h1>
          <p className={styles.unavailableMessage}>{SHOP_CLOSED_MESSAGE}</p>
          <Link className={styles.backButton} href="/">Back to home</Link>
        </section>
      </main>
    </div>
  );
}
