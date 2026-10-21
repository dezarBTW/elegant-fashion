import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as crypto from 'node:crypto';
import { PRODUCT_SIZES, PRODUCT_GENDERS, availableSizes, matchesGender, recommendProducts } from '../src/lib/products.mjs';
import { addCartItem, normalizeCart, previewCheckoutCart, updateCheckoutItem, priceCart, setCartQuantity, subtractPurchasedItems } from '../src/lib/checkout.mjs';
import { productRequestEmail, productRequestSchema } from '../src/lib/productRequests.mjs';
import { buildOrderEmails, buildFulfillmentEmail, sendServiceEmail } from '../src/lib/orderEmails.mjs';
import { readAccountBody } from '../src/lib/accountServer.js';
import { OrderRequestError } from '../src/lib/orderManagement.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const product = { id, name: 'Linen midi skirt', description: 'Soft linen skirt', slug: 'linen-midi-skirt', category: 'Skirts', price: '15000', is_active: true, available_sizes: ['S', 'M', 'XL'] };
const input = { id: requestId, productId: id, name: 'Test Customer', email: 'customer@example.invalid', phone: '08012345678', size: 'XXL', colour: 'Navy blue', details: 'Longer hem', website: '' };

test('only the five approved sizes are offered in the canonical order', () => {
  assert.deepEqual(PRODUCT_SIZES.map(x => x.value), ['S', 'M', 'L', 'XL', 'XXL']);
  assert.deepEqual(availableSizes({ available_sizes: ['XL', 'S', 'S', 'invalid'] }), ['S', 'XL']);
});

test('gender filters include unisex in both fashion groups and keep unclassified products in All', () => {
  assert.deepEqual(PRODUCT_GENDERS.map(option => option.value), ['male', 'female', 'unisex']);
  const candidates = [{ id: 'm', gender: 'male' }, { id: 'f', gender: 'female' }, { id: 'u', gender: 'unisex' }, { id: 'legacy', gender: null }];
  assert.deepEqual(candidates.filter(product => matchesGender(product, 'male')).map(product => product.id), ['m', 'u']);
  assert.deepEqual(candidates.filter(product => matchesGender(product, 'female')).map(product => product.id), ['f', 'u']);
  assert.equal(candidates.filter(product => matchesGender(product, 'all')).length, 4);
});
test('same product and size merges; different sizes keep their own quantities and prices', () => {
  let cart = addCartItem([], id, 3, 'M');
  cart = addCartItem(cart, id, 2, 'M');
  cart = addCartItem(cart, id, 1, 'S');
  assert.deepEqual(cart.map(x => [x.size, x.quantity]), [['M', 5], ['S', 1]]);
  assert.equal(normalizeCart([...cart, { id, size: 'M', quantity: 2 }])[0].quantity, 7);
  assert.equal(setCartQuantity(cart, id, 0, 'M')[0].size, 'S');
  const priced = priceCart(cart.map(({ id: productId, ...line }) => ({ productId, ...line })), [product]);
  assert.equal(priced.lines.length, 2);
  assert.equal(priced.subtotalMinor, 9000000);
  assert.deepEqual(priced.lines.map(x => x.size), ['M', 'S']);
  assert.deepEqual(subtractPurchasedItems(cart, [{ productId: id, size: 'M', quantity: 3 }]).map(x => [x.size, x.quantity]), [['M', 2], ['S', 1]]);
});
test('checkout rejects removed sizes, missing selections and forged sizes', () => {
  for (const size of ['L', 'XXL', '', 'FAKE']) assert.throws(() => priceCart([{ productId: id, quantity: 1, size }], [product]), /size/i);
  assert.throws(() => priceCart([{ productId: id, quantity: 1, size: 'M' }], [{ ...product, available_sizes: [] }]), /size/i);
  assert.throws(() => addCartItem([{ id, size: 'M', quantity: 10 }], id, 1, 'M'), /10/);
});

test('checkout previews pending sizes, requires available choices, and keeps quantities and totals in sync', () => {
  let cart = addCartItem([], id, 2);
  let preview = previewCheckoutCart(cart, [product]);
  assert.equal(preview.ready, false);
  assert.equal(preview.subtotalMinor, 3000000);
  assert.deepEqual(preview.lines[0].availableSizes, ['S', 'M', 'XL']);
  cart = updateCheckoutItem(cart, 0, { size: 'M', quantity: 5 });
  preview = previewCheckoutCart(cart, [product]);
  assert.equal(preview.ready, true);
  assert.equal(preview.subtotalMinor, 7500000);
  assert.equal(priceCart(cart.map(({ id: productId, ...item }) => ({ productId, ...item })), [product]).subtotalMinor, preview.subtotalMinor);
  assert.equal(previewCheckoutCart(cart, [{ ...product, available_sizes: ['S'] }]).lines[0].size, '');
  assert.equal(previewCheckoutCart(cart, [{ ...product, is_active: false }]).ready, false);
  assert.equal(previewCheckoutCart(cart, []).ready, false);
  assert.equal(previewCheckoutCart([], [product]).ready, false);
  assert.deepEqual(updateCheckoutItem(cart, 0, { quantity: 0 }), []);
});

test('editing checkout sizes merges matching lines without silently dropping quantities', () => {
  const cart = [{ id, quantity: 3 }, { id, size: 'M', quantity: 4 }];
  assert.deepEqual(updateCheckoutItem(cart, 0, { size: 'M' }), [{ id, size: 'M', quantity: 7 }]);
  assert.throws(() => updateCheckoutItem([{ id, quantity: 7 }, { id, size: 'M', quantity: 4 }], 0, { size: 'M' }), /exceeds 10/);
  for (const changes of [{ quantity: 11 }, { quantity: -1 }, { quantity: 1.5 }, { size: 'FAKE' }, { id: 'other' }]) assert.throws(() => updateCheckoutItem(cart, 0, changes));
  assert.throws(() => updateCheckoutItem(cart, 20, { size: 'M' }), /no longer available/);
});
test('recommendations stay in category, exclude current/inactive/unavailable and duplicates, cap at six', () => {
  const candidates = Array.from({ length: 9 }, (_, i) => ({ ...product, id: String(i), name: i === 8 ? 'Linen midi skirt matching edit' : 'Cotton skirt' }));
  const list = recommendProducts(product, [...candidates, candidates[0], product, { ...product, id: 'wrong', category: 'Tops' }, { ...product, id: 'inactive', is_active: false }, { ...product, id: 'unavailable', available_sizes: [] }], 100);
  assert.equal(list.length, 6);
  assert.equal(list[0].id, '8');
  assert.equal(new Set(list.map(x => x.id)).size, 6);
  assert.ok(list.every(x => x.category === 'Skirts' && x.id !== id && x.is_active && x.available_sizes.length));
  assert.deepEqual(recommendProducts({ ...product, category: '' }, candidates), []);
  assert.deepEqual(recommendProducts(product, candidates, 0), []);
});
test('custom requests validate contact details and require a different size or colour', () => {
  assert.ok(productRequestSchema.safeParse(input).success);
  assert.ok(productRequestSchema.safeParse({ ...input, size: '', colour: 'Navy' }).success);
  assert.ok(productRequestSchema.safeParse({ ...input, size: 'Custom measurements', colour: '' }).success);
  for (const bad of [{ size: '', colour: '' }, { email: 'invalid' }, { website: 'spam' }, { details: 'x'.repeat(1501) }, { admin: true }]) assert.equal(productRequestSchema.safeParse({ ...input, ...bad }).success, false);
});
test('custom request emails escape input and use the only approved recipient and a stable key', () => {
  const email = productRequestEmail({ id: requestId, product_name: '<script>', customer_name: '<img>', customer_email: input.email, customer_phone: input.phone, requested_size: 'XXL', requested_colour: 'Navy', details: '<b>Test</b>', created_at: '2026-10-21' });
  assert.equal(email.to, 'elegantyoufashion18@gmail.com');
  assert.equal(email.reply_to, input.email);
  assert.equal(email.idempotencyKey, `product-request/${requestId}/admin`);
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.html.includes('&lt;script&gt;'));
  assert.ok(email.text.includes('XXL'));
});
test('order emails include the selected size in both receipt and shipping messages', () => {
  const order = { id, customer_name: 'Customer', customer_email: input.email, customer_phone: input.phone, items: [{ name: 'Skirt', size: 'XL', quantity: 5, unitAmountMinor: 1500000, lineAmountMinor: 7500000 }], subtotal_minor: 7500000, shipping_minor: 0, total_minor: 7500000, delivery: { method: 'pickup' } };
  const messages = [...buildOrderEmails(order, 'elegantyoufashion18@gmail.com'), buildFulfillmentEmail(order, 'a'.repeat(64))];
  assert.ok(messages.every(message => message.html.includes('Size XL') && message.text.includes('Size XL')));
});
test('temporary email errors retry the identical message; permanent errors do not retry', async () => {
  const calls = [];
  const message = { to: input.email, subject: 'Registration', html: '<p>Registered</p>', text: 'Registered', idempotencyKey: 'registration/test' };
  const env = { RESEND_API_KEY: 'test-only', RESEND_FROM_EMAIL: 'test@example.invalid' };
  assert.equal(await sendServiceEmail(message, { env, sleep: async () => {}, fetchImpl: async (_, options) => { calls.push(options); return { ok: calls.length === 3, status: 503 }; } }), true);
  assert.equal(calls.length, 3);
  assert.equal(new Set(calls.map(x => x.body)).size, 1);
  assert.equal(new Set(calls.map(x => x.headers['Idempotency-Key'])).size, 1);
  let denied = 0;
  assert.equal(await sendServiceEmail(message, { env, sleep: async () => {}, logger: { error() {} }, fetchImpl: async () => { denied++; return { ok: false, status: 403 }; } }), false);
  assert.equal(denied, 1);
});

async function requestRoute({ allow = true, active = true } = {}) {
  const rows = [], mail = [], afters = [];
  const db = { rpc: async () => ({ data: allow }), from(table) {
    let value, patch; const filters = [];
    const execute = () => {
      if (value) {
        if (rows.some(row => row.id === value.id)) return { error: { code: '23505' } };
        const row = { ...value, created_at: '2026-10-21', email_sent_at: null }; rows.push(row); return { data: row };
      }
      const row = table === 'products' ? (active ? product : null) : rows.find(row => filters.every(([key, value]) => row[key] === value));
      if (row && patch) Object.assign(row, patch);
      return { data: row || null };
    };
    const query = { select() { return this; }, eq(key, val) { filters.push([key, val]); return this; }, insert(row) { value = row; return this; }, update(row) { patch = row; return this; }, maybeSingle: async () => execute(), single: async () => execute(), then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); } };
    return query;
  } };
  const context = vm.createContext({ URL, process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'test-only' } }, console });
  const modules = {
    'next/server': { after: callback => afters.push(callback), NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
    'node:crypto': crypto,
    '@/lib/checkoutServer': { checkoutDatabase: () => db },
    '@/lib/accountServer': { readAccountBody },
    '@/lib/orderManagement.mjs': { OrderRequestError },
    '@/lib/productRequests.mjs': { productRequestEmail, productRequestSchema },
    '@/lib/orderEmails.mjs': { sendServiceEmail: async message => { mail.push(message); return true; } },
  };
  const source = await readFile(new URL('../src/app/api/product-requests/route.js', import.meta.url), 'utf8');
  const routeModule = new vm.SourceTextModule(source, { context });
  await routeModule.link(specifier => {
    const exports = modules[specifier];
    assert.ok(exports, specifier);
    return new vm.SyntheticModule(Object.keys(exports), function() { for (const [name, value] of Object.entries(exports)) this.setExport(name, value); }, { context });
  });
  await routeModule.evaluate();
  return { rows, mail, afters, post: (body = input, origin = 'http://localhost') => routeModule.namespace.POST(new Request('http://localhost/api/product-requests', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })) };
}
test('a saved guest product request notifies once; repeated submissions are idempotent', async () => {
  const api = await requestRoute();
  assert.equal((await api.post()).status, 201);
  assert.equal(api.rows.length, 1);
  assert.equal(api.mail.length, 0);
  await Promise.all(api.afters.map(callback => callback()));
  assert.equal(api.mail.length, 1);
  assert.equal(api.mail[0].to, 'elegantyoufashion18@gmail.com');
  assert.ok(api.rows[0].email_sent_at);
  assert.equal((await api.post()).status, 200);
  assert.equal(api.afters.length, 1);
  assert.equal((await api.post({ ...input, colour: 'Red' })).status, 409);
  assert.equal(api.rows.length, 1);
});
test('product request route rejects cross-origin, invalid input, unavailable products and rate-limited clients', async () => {
  const api = await requestRoute();
  assert.equal((await api.post(input, 'https://foreign.invalid')).status, 403);
  assert.equal((await api.post({ ...input, size: '', colour: '' })).status, 400);
  assert.equal((await (await requestRoute({ active: false })).post()).status, 404);
  assert.equal((await (await requestRoute({ allow: false })).post()).status, 429);
  assert.equal(api.rows.length, 0);
  assert.equal(api.afters.length, 0);
});
