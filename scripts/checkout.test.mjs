import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { addCartItem, normalizeCart, setCartQuantity, subtractPurchasedItems, decimalAmount, deliveryFeeMinor, moneyToMinor, priceCart } from "../src/lib/checkout.mjs";
import { bachsBaseUrl, paymentMatchesOrder, validCheckoutUrl, verifyBachsSignature } from "../src/lib/bachs.mjs";

test("legacy repeated products become one quantity and checkout charges for every unit", () => {
  const cart = normalizeCart([{ id: "dress" }, { id: "dress" }, { id: "dress", quantity: 3 }, { id: "top", quantity: 2 }]);
  assert.deepEqual(cart, [{ id: "dress", quantity: 5 }, { id: "top", quantity: 2 }]);
  const products = [{ id: "dress", name: "Dress", price: "500.00", is_active: true }, { id: "top", name: "Top", price: "300.00", is_active: true }];
  const priced = priceCart(cart.map(({ id: productId, quantity }) => ({ productId, quantity })), products);
  assert.equal(priced.lines.length, 2);
  assert.equal(priced.lines[0].quantity, 5);
  assert.equal(priced.subtotalMinor, 310000);
  assert.deepEqual(addCartItem(cart, "dress", 2), [{ id: "dress", quantity: 7 }, { id: "top", quantity: 2 }]);
  assert.deepEqual(setCartQuantity(cart, "dress", 0), [{ id: "top", quantity: 2 }]);
  assert.throws(() => addCartItem(cart, "dress", 6), /10/);
  assert.throws(() => setCartQuantity(cart, "dress", 1.5));
  assert.throws(() => addCartItem(cart, "dress", 0));
  assert.deepEqual(normalizeCart([null, { id: "bad", quantity: -2 }, { id: "bad", quantity: "3" }]), []);
});

test("paid cart cleanup subtracts purchased quantities and preserves later additions", () => {
  assert.deepEqual(subtractPurchasedItems([{ id: "dress", quantity: 7 }, { id: "top", quantity: 2 }], [{ productId: "dress", quantity: 5 }]), [{ id: "dress", quantity: 2 }, { id: "top", quantity: 2 }]);
  assert.deepEqual(subtractPurchasedItems([{ id: "dress" }, { id: "dress" }], [{ productId: "dress", quantity: 2 }]), []);
});

test("delivery follows the shop's exact rates and is added to the total", () => {
  assert.equal(deliveryFeeMinor("pickup"), 0);
  assert.equal(deliveryFeeMinor("yenagoa"), 0);
  assert.equal(deliveryFeeMinor("outside_yenagoa"), 200000);
  assert.throws(() => deliveryFeeMinor("unknown"));
  assert.equal(decimalAmount(moneyToMinor("50000.00") + deliveryFeeMinor("outside_yenagoa")), "52000.00");
});

test("server prices override supplied prices, count quantities and use discounts", () => {
  const products = [{ id: "dress", name: "Dress", is_active: true, price: "50000.00", sale_price: "45000.50" }];
  const result = priceCart([{ productId: "dress", quantity: 2, price: 1 }], products);
  assert.equal(result.subtotalMinor, 9000100);
  assert.equal(decimalAmount(result.subtotalMinor), "90001.00");
  assert.throws(() => priceCart([{ productId: "dress", quantity: 11 }], products));
  assert.throws(() => priceCart([{ productId: "dress", quantity: 6 }, { productId: "dress", quantity: 5 }], products));
  assert.throws(() => priceCart([{ productId: "dress", quantity: 1 }], [{ ...products[0], is_active: false }]));
  assert.throws(() => priceCart([{ productId: "missing", quantity: 1 }], products));
  assert.throws(() => moneyToMinor("1.005"));
  assert.throws(() => moneyToMinor("-1"));
});

test("webhooks require an authentic, fresh raw-body signature, including rotated secrets", () => {
  const secret = "test-only-secret";
  const timestamp = "1800000000";
  const body = '{"type":"collection.succeeded"}';
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const headers = new Headers({ "x-bachs-signature-v2": `t=${timestamp},v1=${"0".repeat(64)},v1=${signature}` });
  assert.ok(verifyBachsSignature(body, headers, secret, Number(timestamp) * 1000));
  assert.equal(verifyBachsSignature(body + " ", headers, secret, Number(timestamp) * 1000), false);
  assert.equal(verifyBachsSignature(body, headers, secret, (Number(timestamp) + 301) * 1000), false);
  assert.equal(verifyBachsSignature(body, new Headers(), secret), false);
  assert.equal(verifyBachsSignature(body, new Headers({ "x-bachs-signature-v2": `t=${timestamp},v1=bad` }), secret, Number(timestamp) * 1000), false);
  assert.ok(verifyBachsSignature(body, new Headers({ "x-bachs-timestamp": timestamp, "x-bachs-signature": signature }), secret, Number(timestamp) * 1000));
});

test("only a successful payment in NGN for the exact order total is accepted", () => {
  const data = { status: "SUCCEEDED", currency: "NGN", amount: "52000.00" };
  assert.ok(paymentMatchesOrder(data, 5200000));
  for (const change of [{ amount: "50000.00" }, { amount: "52001.00" }, { currency: "USD" }, { status: "ACCEPTED" }, { status: "FAILED" }, { amount: "NaN" }]) {
    assert.equal(paymentMatchesOrder({ ...data, ...change }, 5200000), false);
  }
});

test("Bachs secrets select the environment and redirects stay on Bachs", () => {
  assert.equal(bachsBaseUrl("sk_sandbox_test"), "https://sandbox-api.bachs.io");
  assert.equal(bachsBaseUrl("sk_live_test"), "https://api.bachs.io");
  assert.throws(() => bachsBaseUrl("missing"));
  assert.ok(validCheckoutUrl("https://checkout.bachs.io/c/example", "sk_live_test"));
  for (const url of ["https://checkout.bachs.io.evil.test/c/x", "http://checkout.bachs.io/c/x", "https://user:pass@checkout.bachs.io/c/x", "https://sandbox-checkout.bachs.io/c/x"]) {
    assert.equal(validCheckoutUrl(url, "sk_live_test"), false);
  }
});
