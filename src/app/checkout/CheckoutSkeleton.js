import Link from "next/link";
import page from "./checkout.module.css";
import s from "../ready-to-wear/shopSkeleton.module.css";
import styles from "./checkoutSkeleton.module.css";

const bone = (...names) => [s.bone, ...names].join(" ");

function OrderSummarySkeleton() {
  return (
    <div className={page.summary}>
      <h2><span className={bone(styles.summaryTitle)} /></h2>
      {Array.from({ length: 3 }, (_, index) => (
        <p key={index} className={page.line}>
          <span className={bone(styles.item)} />
          <span className={bone(styles.amount)} />
        </p>
      ))}
      <p className={`${page.line} ${page.total}`}>
        <span className={bone(styles.item)} />
        <span className={bone(styles.amount)} />
      </p>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <main className={page.page} aria-busy="true">
      <Link className={page.back} href="/ready-to-wear">← Back to shop</Link>
      <h1>Checkout</h1>
      <p className={page.lede}>Your pieces, your details, and a secure payment.</p>
      <span className={s.srOnly} role="status">Loading your cart</span>
      <div className={`${page.grid} ${s.visual}`} aria-hidden="true">
        <div className={page.form}>
          <fieldset>
            <legend><span className={bone(styles.label)} /></legend>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={styles.field}>
                <span className={bone(styles.label)} />
                <div className={bone(styles.input)} />
              </div>
            ))}
          </fieldset>
          <fieldset>
            <legend><span className={bone(styles.label)} /></legend>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={styles.delivery}>
                <span className={bone(styles.radio)} />
                <span className={bone(styles.deliveryText)} />
              </div>
            ))}
            <span className={bone(styles.line)} />
          </fieldset>
          <div className={bone(styles.line)} />
          <div className={bone(styles.button)} />
        </div>
        <OrderSummarySkeleton />
      </div>
    </main>
  );
}

export function PaymentStatusSkeleton() {
  return (
    <main className={`${page.page} ${page.receipt}`} aria-busy="true">
      <Link className={page.back} href="/ready-to-wear">← Back to the shop</Link>
      <h1>Checking your payment</h1>
      <span className={s.srOnly} role="status">Checking your order</span>
      <div className={`${styles.receipt} ${s.visual}`} aria-hidden="true">
        <div className={styles.message}>
          <div className={bone(styles.line)} />
          <div className={bone(styles.line)} />
          <div className={bone(styles.shortLine)} />
        </div>
        <div className={bone(styles.reference)} />
        <OrderSummarySkeleton />
        <div className={bone(styles.line)} />
      </div>
    </main>
  );
}
