# Ready-to-Wear E-Commerce Scale Plan (v2)

**Last updated:** 2026-10-07
**Scope:** Products → Cart (stops before checkout/payment)
**Stack:** Next.js 16 + React 19 + Supabase (Postgres 17, Auth, Storage) + Upstash Redis + Vercel
**Database checked:** project "Elegant styles" (`eu-west-1`), read-only inspection on 2026-10-07
**Companion files (apply in order):** `000_security_hardening.sql`, `001_catalog_and_cart.sql`, `002_backfill_and_constraints.sql`

---

## 0. What changed from v1

| v1 problem | v2 fix |
|---|---|
| Guest-cart RLS relied on `current_setting('app.cart_session')`, which can't be set through PostgREST/pooled connections | Guest carts live in Redis behind an HttpOnly cookie token, server-side only. Postgres carts are for signed-in users only |
| Client could write `unit_price` | No direct writes to `carts`/`cart_items`. All writes go through `SECURITY DEFINER` RPCs that price on the server and validate stock |
| Postgres and Redis both "authoritative" for carts | One owner per cart type: Redis = guest, Postgres = authenticated, with an idempotent merge on login |
| Public read of raw inventory, inactive categories and images | Inventory table is closed to clients. Stock is exposed as `in_stock / low / out` through a batched RPC. All public policies check `is_active` |
| Migration drifted from the plan (no `search_vector`, no `products` RLS, duplicate policies, nullable slug) | Two re-runnable migrations. Slug backfill happens before `NOT NULL` + unique. Policies use `drop if exists` |
| `view_count` on the product row | Removed. Counted in Redis and flushed to `product_view_daily` |
| Redundant indexes, no constraints | Redundant indexes dropped. CHECKs added (stock ≥ 0, quantity 1–10, one active cart per user) |
| `UNIQUE(name)` on categories, single category per product | Unique `(parent_id, slug)`, plus a `product_categories` join table |
| Redis read path for a small static catalog | Catalog served from Next.js cache + CDN. Redis is only for carts, counters and rate limits |
| Wrong pooling mode, fictional autoscaling triggers, multi-region compute with one primary | Realistic pooling guidance, a limits checklist, compute co-located with the DB |
| No degradation design, cost model, staging or rollback; monitoring last | Sections 9–12 |
| `module.exports` in `.mjs`, Suspense after `await` | Fixed (section 7) |

---

## 0.1 Alignment with the live database

What the project actually contains today, and what the plan does about it:

| Live finding | Impact | Action |
|---|---|---|
| `products` exists with 0 rows: `id uuid`, `name`, `price numeric`, `category text`, `image text`, `rating`, `reviews`, `created_at` (no time zone) | v1's `base_price` would duplicate `price`. No data migration risk | `price` **is** the base price; add only `sale_price`. Keep `category`/`image` as legacy columns until the app moves to `product_categories`/`product_images`. A trigger auto-fills `slug` so the current admin UI keeps inserting |
| RLS already on for `products`, `users`, `students` | v1's "enable RLS" step is a no-op | Dropped from the plan |
| Two `SELECT ... USING (true)` policies on `products` | `is_active` would be ignored, because permissive policies are OR-ed | `001` drops both and adds an `is_active` policy |
| Admin = `public.users.is_admin` via `is_admin_user()` | A working pattern to reuse | New catalog tables use the same `is_admin_user()` policies, so no separate admin mechanism is needed |
| **`users`: the policy "Users can update own row" has no `WITH CHECK`** | By policy logic, any signed-in user can set `is_admin = true` on their own row, which would unlock the admin policies, product writes and the students' passport admin access. **I read the policies; I did not test the exploit** | `000` replaces the update/insert policies. Apply before anything else, and test on a branch |
| Storage: "Authenticated users can upload product images" checks only the bucket | Any signed-in user can upload anything to the public `product-images` bucket | `000` drops it. The stricter admin policy remains (jpg/png, 5 MB). Extend it if you need .jpeg/.webp |
| `student-passports` bucket is **public**, with a public read policy | Student passport photos are readable by anyone with the URL. Unrelated to the storefront, but in the same project | Flagged in `000` (not applied). Needs a private bucket and signed URLs in the student app |
| The storefront shares one project with the students/passports app | Noisy-neighbor risk: a store spike competes with the student portal for the same DB and connections | See section 2 |
| Region `eu-west-1`, Postgres 17.6, `pg_stat_statements` installed, `pg_cron` available but not installed | Region decision is made | Compute and Redis go in the same region (section 2). `001` notes the one-line `pg_cron` install |
| No branches exist yet | Nowhere safe to test | Create one before applying anything (branches may incur cost; check first) |
| `handle_new_user` is `SECURITY DEFINER` with no fixed `search_path` | Standard hardening gap | Fixed in `000` |
| `check_email_exists` and similar `SECURITY DEFINER` RPCs | Possible account enumeration if anon can execute them | Review grants and rate-limit (noted in `000`) |

The other Supabase project in your account ("Lifestyle", `eu-central-1`) was not inspected.

---

## 1. Targets and assumptions

"1M concurrent" is a destination, not a starting point. Design for **10× your measured peak**, and move through milestones only when load tests pass.

| | M1 | M2 | M3 | M4 |
|---|---|---|---|---|
| Concurrent users | 5k | 50k | 250k | 1M |
| Edge page/API requests/s (≈0.05 per user) | 250 | 2.5k | 12.5k | 50k |
| Origin requests/s (misses + cart + stock + search), ≤10% of edge | 25 | 250 | 1.25k | 5k |
| Cart writes/s (assume 2–5% of requests) | 5–13 | 50–125 | 250–625 | 1k–2.5k |

The 0.05 requests/s/user and 2–5% cart-write ratio are **assumptions**. Validate them against real analytics in Phase 0. (v1 assumed 10k cart writes/s at M4, which is roughly 4–10× higher.)

**SLOs**

| Metric | Target |
|---|---|
| Cached product/category read (CDN) | p95 < 100 ms |
| Uncached origin read | p95 < 300 ms |
| Guest cart write (Redis, same region as compute) | p95 < 75 ms |
| Authenticated cart write (Postgres RPC) | p95 < 150 ms |
| LCP, mobile, field data | p75 ≤ 2.5 s |
| Error rate | < 0.1% |
| Availability | 99.9% (≈43 min/month). Single-primary Postgres is the limiting factor, so confirm provider SLAs and failover behavior |
| CDN cache hit ratio (catalog) | ≥ 95% |

**Cost model (required before approving M3/M4).** Estimate per milestone:

| Driver | What to estimate |
|---|---|
| Vercel | Function invocations and active CPU time, bandwidth, image transformations |
| Supabase | Compute tier, storage egress, read replicas (paid add-on), PITR |
| Upstash | Commands/day ≈ sessions × cart ops × commands per op, plus rate-limit checks |
| Edge/WAF | Firewall and bot-protection plan |

Image egress is likely the largest line item for a fashion catalog.

---

## 2. Architecture

```
Browser
  │
Vercel CDN + Firewall (WAF, bot rules, coarse rate limits)
  │   └─ Catalog pages and product images served from cache (target ≥95% of requests)
  │
Next.js functions  (region = same region as the Postgres primary)
  ├─ /api/cart/*   → Upstash Redis (guest carts)        [same region]
  │                → Supabase RPC (authenticated carts)
  ├─ /api/stock    → rpc get_stock_states (batched, short cache)
  └─ /api/search   → Postgres full-text search
  │
Supabase Postgres primary
  (+ read replicas only if load tests show the primary is read-bound)
```

Regions: the primary is already in **`eu-west-1` (Ireland)**. Run Vercel functions in the matching region (`dub1`) and create the Upstash database in `eu-west-1`. CDN and static output are global. Cart writes still travel to Ireland, so if most customers are far from it, expect that latency on cart writes and uncached reads (open question Q1). Don't add multi-region compute unless writes can stay local.

**Shared project:** the student portal lives in the same project. Up to M1 that's acceptable. Before M2, move the storefront to its **own Supabase project** (own compute, connections and blast radius), or at least load-test the two together. The schema is portable because it's all additive.

---

## 3. Data model

Full DDL is in `001_catalog_and_cart.sql`. Key decisions:

- **products** (existing, empty): keep `id`, `name`, `price` (the base price), `category` (legacy), `image` (legacy), `rating`, `reviews`. Add `slug` (auto-filled by trigger), `description`, `specifications`, `is_active`, `is_featured`, `sale_price`. Note that `rating`/`reviews` are denormalized, so update them in batches, never per request.
- **categories**: adjacency tree, unique on `(parent_id, slug)` so "Accessories" can exist under both Women and Men. "All" is a UI concept, not a row.
- **product_categories**: many-to-many with one `is_primary`.
- **product_variants**: size/color/SKU and `price_modifier`. Final price = `coalesce(sale_price, price) + price_modifier`, computed server-side only.
- **product_inventory**: one row per variant (PK = `variant_id`). Sellable = `quantity_available − quantity_reserved`. **Adding to cart does not reserve stock**; reservation is a checkout concern.
- **product_images**: URL plus width/height (to avoid layout shift).
- **product_view_daily**: batched view counts.
- **carts / cart_items**: authenticated users only; one active cart per user.

Not included yet (decide later): multi-warehouse inventory, sale start/end windows, currency column, brand/collection/season taxonomy.

---

## 4. Read path and caching

1. **Product detail and category pages**: statically generated or cached with tag-based revalidation (ISR or `use cache` + cache tags; confirm the exact `revalidateTag`/`updateTag` signatures in your Next 16 version). Tags: `product:{id}`, `category:{id}`, `catalog`.
2. **Invalidation**: admin tooling (service role, server-only) updates the DB, then revalidates affected tags. No `DEL pattern`, and no Redis involvement for catalog.
3. **Filters/facets**: whitelist filter parameters (category, size, color, price bucket, sort) and cap combinations so the cache can't be polluted by arbitrary query strings. Use **cursor (keyset) pagination**, not offsets.
4. **Stock** is the only fast-changing catalog data. Fetch it client-side from `/api/stock?ids=…` (batched, max 200 ids), cached at the edge for ~15–30 s with stale-while-revalidate. Return states only, never counts.
5. **Search**: Postgres FTS (`websearch_to_tsquery`, query length cap, normalized lowercase). If typo tolerance or merchandising matters at M3+, evaluate a dedicated search service.
6. **Redis is not a catalog cache.** It is used for guest carts, view counters and app-level rate limits.
7. **Images**: generate fixed widths (AVIF/WebP) at upload time and serve with immutable, hash-named URLs behind a CDN, so you aren't paying per-request image transformation at scale. If you keep Next.js image optimization, set a long `minimumCacheTTL` and budget for transformation costs.

---

## 5. Cart

### 5.1 Ownership

| Cart | Store | Key / identity |
|---|---|---|
| Guest | Redis hash `cart:g:{token}` (`variant_id → quantity`) | 32-byte random token in an `__Host-cart` cookie: `HttpOnly; Secure; SameSite=Lax; Path=/` |
| Signed-in | Postgres `carts` + `cart_items` | `auth.uid()` |

Guest lines store only `variant_id` and quantity. Prices are computed on read from the cached catalog, so they are never stale. Limits: 50 lines per cart, quantity 1–10 per line, 30-day sliding TTL.

Rejected alternative: Supabase anonymous sign-ins so guests also get Postgres carts. It puts every visitor's cart writes on the primary.

### 5.2 API

| Route | Behavior |
|---|---|
| `GET /api/cart` | Lines with live price and stock state |
| `PUT /api/cart/items/:variantId` `{ quantity }` | **Set** semantics (idempotent, safe to retry). `0` removes the line |
| `POST /api/cart/merge` | On login: reads the guest cart, calls `rpc('cart_merge_guest')`, deletes the Redis key |

- Guest writes validate the variant and stock state against the cached catalog and write to Redis. No Postgres hit.
- Signed-in writes call `rpc('cart_set_item')`, which re-prices, checks stock and active flags, and upserts.
- **Merge rule:** per line, `max(existing, guest)` capped at 10. This is idempotent, so a retry after a failed Redis delete can't double quantities. Lines that fail validation are returned in `skipped` for the UI to show.
- **Checkout (out of scope, but design for it):** reprice and re-validate stock at checkout. `unit_price` in `cart_items` is a snapshot only for "price changed" messaging.
- **Cart creation is lazy:** only on the first add, never on page view. This stops bots from filling the store.

### 5.3 Loss tolerance

Guest carts in Redis can be lost in a provider incident. Accepted: it degrades UX but loses no orders. Signed-in carts are in Postgres with PITR.

---

## 6. API surface

Server components call the data layer directly (`lib/catalog`), with no internal `/api/v1` hop. Route handlers exist only for what the browser must call: cart, stock, search, merge.

---

## 7. Frontend

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '<project-ref>.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
```

```tsx
// Suspense must sit ABOVE the component that awaits, or nothing streams.
export default function CategoryPage() {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductGrid category="dresses" />
    </Suspense>
  );
}

async function ProductGrid({ category }: { category: string }) {
  const products = await getProducts(category); // cached
  return <ProductGridInner products={products} />;
}
```

Cart UI is optimistic (revert on failure). Stock state loads client-side after first paint.

---

## 8. Security

- **RLS** on every table. Public read policies check `is_active`. `product_inventory` has no client access. Cart tables are read-only to their owner. All writes go through RPCs or the service role.
- **Admin model:** keep the existing `public.users.is_admin` + `is_admin_user()` pattern for admin sessions, **but only after `000` closes the self-promotion hole** (section 0.1). Server-only jobs (cache revalidation, view-count flush, cart cleanup) use the service-role key, which is never in a `NEXT_PUBLIC_*` variable or client bundle. If you later need JWT admin claims, use `app_metadata` (not user-editable).
- **Storage:** `product-images` is public. Uploads are admin-only with type and size limits. Generated image sizes are written server-side with the service role.
- **Cookies/CSRF:** `SameSite=Lax`, `Origin` header check and JSON content-type required on all mutating routes.
- **Validation:** Zod on every handler. Cap search query length and use `websearch_to_tsquery`.
- **Abuse:** WAF and bot rules at the Vercel firewall first. App-level limits (Upstash sliding window) only for cart mutations, keyed by cart token + IP, because per-IP limits misfire on shared mobile/NAT addresses.
- **Headers:** CSP, HSTS, and Referrer-Policy.
- **Privacy:** the cart cookie is strictly necessary. Confirm cookie-consent obligations for analytics separately.
- **Audit log** for admin catalog changes (later).

---

## 9. Resilience and degradation

Define these before M2 and exercise them in game days:

| Level | Trigger | Behavior |
|---|---|---|
| 0 | Normal | Everything on |
| 1 | Origin p95 or DB CPU high | Serve stale catalog (SWR), extend stock cache TTL |
| 2 | Sustained pressure | Disable search/facets (category browse only) via feature flag |
| 3 | Cart/DB at limit | Cart becomes read-only with a friendly message, and non-critical endpoints return 503 + `Retry-After` |
| 4 | Event spike (drops, campaigns) | Waiting room/queue in front of the app |

Feature flags (Vercel Edge Config/Flags or equivalent) control levels 2–4 without a deploy.

**Backups/DR:** confirm PITR is enabled, set RPO/RTO targets, and run one restore drill before M3.

---

## 10. Observability and load testing

**Phase 0 (not Phase 3):**
- Vercel Observability/Speed Insights, Supabase reports and `pg_stat_statements`, Upstash metrics, error tracking, synthetic uptime checks.
- Dashboards and alerts: p95 latency per route, error rate, CDN hit ratio, DB CPU/connections/slow queries, Redis memory/commands, function concurrency, and replication lag if replicas exist.

**Load testing:**
- Tool: k6 (or Artillery), against a staging project seeded with ~50k SKUs and realistic images.
- Scenarios: browse-heavy, add-to-cart-heavy, and a flash-drop spike (10× in 60 s).
- Run from multiple regions. Run at each milestone. Record the first bottleneck each time.
- Check each provider's policy on load testing before running M3/M4 tests.

**Limits checklist** (replaces "auto-scaling triggers", which mostly don't exist on Vercel): function concurrency limits, Supabase compute tier and max connections, pooler pool size, Upstash plan limits and per-command cost, image transformation quotas, and bandwidth.

**Connections:** direct-Postgres clients from serverless use the pooler in **transaction mode** with prepared statements disabled. supabase-js (PostgREST) manages its own pooling. Size pools to the compute tier. "Statement mode" is not offered, and 100 connections will not carry M4 without a large cache-hit ratio and short queries.

---

## 11. Delivery phases

Realistic scope is **~8 weeks to M2 readiness**. M3/M4 dates depend on load-test findings and budget; don't commit to a date for 1M.

### Phase 0: Baseline and guardrails (Week 1)
- [x] Introspect existing schema (done 2026-10-07: see section 0.1)
- [ ] Create a branch, apply `000`, and test sign-up, profile edit, admin product edit and image upload
- [ ] Decide price unit (major units recommended, matching the numeric `price` column)
- [ ] Create a Supabase branch/staging project and seed ~50k SKUs
- [ ] Observability and alerts (section 10)
- [ ] Measure current traffic. Validate the section 1 assumptions. Approve the target milestone and cost estimate
- [ ] Load-test harness skeleton
- **Exit:** baseline numbers recorded, M-target and budget approved, open questions answered

### Phase 1: Schema and catalog (Weeks 2–3)
- [ ] Run `001` and `002` on the branch, verify, then promote
- [ ] Re-run the slug check once real products exist (table is empty now)
- [ ] Cached catalog pages, tag revalidation from admin tooling
- [ ] Image pipeline, `get_stock_states`, `/api/stock`
- **Exit:** M1 load test passes with ≥95% hit ratio on catalog

### Phase 2: Cart (Weeks 3–5)
- [ ] Redis guest cart, `cart_set_item`/`cart_merge_guest`, merge flow
- [ ] CSRF/Origin checks, rate limits, WAF/bot rules, lazy cart creation
- [ ] pg_cron cart cleanup
- **Exit:** cart SLOs met at M1, security checklist reviewed, merge tested for retries and stock/price changes

### Phase 3: Search, degradation, M2 (Weeks 5–7)
- [ ] FTS search and facets with cursor pagination
- [ ] Feature flags and degradation levels 1–3
- [ ] M2 load test, fix first bottleneck, repeat
- **Exit:** M2 SLOs met, degradation levels exercised in a game day

### Phase 4: Scale beyond M2, only if justified (Week 8+)
- [ ] Read replicas (only if reads are the bottleneck), waiting room, DR drill
- [ ] M3, then M4, load tests with cost sign-off at each step

---

## 12. Rollout and rollback

- Migrations are additive and re-runnable. Keep a down script per migration. Test on a Supabase branch first.
- **Order matters:** `000` first (it removes the privilege-escalation path), then `001`, then `002`. `000` drops the broad product-image upload policy, so confirm your admin uploads are .jpg/.png (or extend the admin policy) before promoting.
- Ship the new cart behind a feature flag. Keep the existing cart path until the new one passes M1, then cut over by percentage.
- Rollback = flip the flag. Schema stays (additive).

---

## 13. Open questions and approval checklist

**Open questions**
1. Where are your customers (country/region mix)? The primary is already in `eu-west-1`, so this now decides whether cart-write latency is acceptable or a new project in another region is worth it.
2. What is real peak traffic today, and what event are you designing for (campaign, drop, seasonal peak)?
3. Currency: single or multiple? (Needs a column and display rules.)
4. Redis provider: Upstash recommended. OK?
5. Cart lifetime: keep 30 days (sliding)?
6. Do you need sale start/end windows, multi-warehouse inventory, or brand/collection taxonomy at launch?
7. Does anything besides the admin UI write to `products` or upload images (and in which file types)?
8. Price unit: the table is empty, so choose now. Major units (e.g. 12000.00) are recommended.
9. Should the storefront move to its own Supabase project before M2?
10. Should I fix the public `student-passports` bucket (needs a student-app change to signed URLs)?

**Approval checklist**
- [ ] Targets and milestones (section 1), including cost estimate
- [ ] Schema and RLS (`001`, `002`), reviewed on a branch
- [ ] Cart ownership model (Redis guest / Postgres authenticated) and merge rule
- [ ] Catalog served from cache/CDN, with Redis limited to carts/counters/rate limits
- [ ] Degradation levels and feature flags
- [ ] Phased plan with exit criteria and rollback
