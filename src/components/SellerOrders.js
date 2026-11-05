"use client";
import styles from './marketplace.module.css';
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/clientApi";
function actions(item,mode){
 if(item.confirmed_at)return [];
 if(mode==='admin'&&item.seller_kind==='vendor')return item.fulfilment==='sent_to_shop'?['at_shop']:item.fulfilment==='at_shop'?[item.order.delivery.method==='pickup'?'ready':'shipped']:[];
 if(item.fulfilment==='new')return ['processing'];
 if(item.fulfilment==='processing')return mode==='vendor'&&item.order.needsShop?['sent_to_shop']:[item.order.delivery.method==='pickup'?'ready':'shipped'];
 return [];
}
export default function SellerOrders({ mode }) {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState({});
  async function load() {
    const result = await authenticatedFetch(
      `/api/account/seller-orders?mode=${mode}`,
    );
    setItems(result.items);
  }
  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(`/api/account/seller-orders?mode=${mode}`, {
      signal: controller.signal,
    })
      .then((result) => setItems(result.items))
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [mode]);
  async function action(item, action) {
    setBusy(true);
    setError("");
    try {
      const result = await authenticatedFetch("/api/account/seller-orders", {
        method: "POST",
        body: JSON.stringify({
          itemId: item.id,
          action,
          note: notes[item.id] || "",
        }),
      });
      if (result.emailSent === false)
        setError(
          "Progress saved, but notification email failed. Contact the administrator.",
        );
      await load();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <p role="status">{error}</p>
      {!items.length && <p>No paid order items found.</p>}
      {items.map((item) => (
        <article key={item.id}>
          <h2>{item.product_name}</h2>
          <p>
            Order {item.order_id} · Size {item.size} · Quantity {item.quantity}
          </p>
          <p>Progress: {item.fulfilment}</p>
          {item.confirmed_at && (
            <p>
              Delivery confirmed {new Date(item.confirmed_at).toLocaleString()}.
              Return/refund requests close{" "}
              {new Date(
                Date.parse(item.confirmed_at) + 259200000,
              ).toLocaleString()}
              .
            </p>
          )}
          {mode !== "customer" && (
            <>
              <p>
                Seller: {item.seller_kind} · {item.seller_id}
              </p>
              <p>
                {item.order.needsShop&&mode==='vendor'?'Send to the shop. ':''}Customer: {item.order.customer_name} ·{" "}
                {item.order.customer_email} · {item.order.customer_phone}
              </p>
              <p>
                Delivery: {Object.values(item.order.delivery || {}).join(" · ")}
              </p>
              <p>
                Payment:{" "}
                {item.payment_received_at
                  ? "Receipt confirmed"
                  : item.payment_marked_at
                    ? "Marked fulfilled"
                    : "Not paid to vendor"}
              </p>
              <p>Sale amount: ₦{(Number(item.line_amount_minor)/100).toLocaleString('en-NG')}</p>
              {item.paymentHold&&<p>Payment on hold: a return/refund or complaint requires resolution.</p>}
              {actions(item,mode).map((value) => (
                <button
                  disabled={busy || item.confirmed_at != null}
                  key={value}
                  onClick={() => action(item, value)}
                >
                  {value.replaceAll("_", " ")}
                </button>
              ))}
            </>
          )}
          {mode === "customer" &&
            !item.confirmed_at &&
            ["shipped", "ready"].includes(item.fulfilment) && (
              <button disabled={busy} onClick={() => action(item, "confirm")}>
                I have received this product
              </button>
            )}
          {mode === "admin" && (
            <>
              <label>
                Manual delivery verification evidence
                <textarea
                  value={notes[item.id] || ""}
                  onChange={(event) =>
                    setNotes((previous) => ({
                      ...previous,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                disabled={busy || Boolean(item.confirmed_at)}
                onClick={() => action(item, "verify_delivery")}
              >
                Verify delivery completed
              </button>
              {item.seller_kind === "vendor" && (
                <button
                  disabled={busy || Boolean(item.payment_marked_at)}
                  onClick={() => action(item, "payment_fulfilled")}
                >
                  Payment fulfilled
                </button>
              )}
            </>
          )}
          {mode === "vendor" &&
            item.payment_marked_at &&
            !item.payment_received_at && (
              <button
                disabled={busy}
                onClick={() => action(item, "payment_received")}
              >
                Payment received
              </button>
            )}
        </article>
      ))}
    </section>
  );
}
