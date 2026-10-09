# E-Commerce Database Migrations

**Project:** Elegant styles (yrzvqvdrahfmmoprgukd)  
**Region:** eu-west-1  
**Created:** 2026-10-07

## ⚠️ CRITICAL: Execution Order

These migrations **must** be run in order. Do not skip or reorder them.

```
000_security_hardening.sql  → FIRST (closes privilege escalation)
001_catalog_and_cart.sql    → SECOND (creates schema)
002_backfill_and_constraints.sql → THIRD (finalizes constraints)
003_customer_ratings.sql   → FOURTH (removes the default 4.5 rating)
004_remove_username.sql    → FIFTH (removes username from profiles and signup)
```

The bespoke request flow uses a separate pair of migrations:

```
20250101_bespoke_requests.sql → creates the bespoke request table
20261008_bespoke_request_security.sql → configures private uploads and rate limits
```

Run both in that order. The second migration removes any legacy public insert
policy, makes the image bucket private, and adds the server-only 5-per-hour
rate limiter.

---

## Step-by-Step Execution

### Prerequisites

1. **Backup:** Ensure PITR is enabled in your Supabase project (it should be by default)
2. **Testing:** Consider creating a Supabase branch to test first (may incur cost)
3. **Access:** You need project owner or admin access to run migrations
4. **Time:** Set aside 15-20 minutes for execution and verification

---

### Migration 1: Security Hardening (000)

**File:** `000_security_hardening.sql`  
**Risk:** Low (only fixes policies)  
**Impact:** Closes critical security holes immediately

**What it fixes:**
- ✅ Prevents users from self-promoting to admin
- ✅ Removes permissive product-image upload policy
- ✅ Hardens `handle_new_user()` function
- ✅ Revokes dangerous grants

**How to run:**

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy the entire contents of `000_security_hardening.sql`
3. Paste and click **Run**
4. Wait for "Success. No rows returned" message

**Verify:**
```sql
-- Should show 2 policies: users_insert_own_not_admin, users_update_own_not_admin
SELECT policyname FROM pg_policies WHERE tablename = 'users';

-- Should show 0 rows (policy was dropped)
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname = 'Authenticated users can upload product images';
```

**Test:**
1. Sign up a new test user → should work ✓
2. Try editing profile (not is_admin) → should work ✓
3. Try setting `is_admin = true` via API → should fail ✓

---

### Migration 2: Catalog & Cart Schema (001)

**File:** `001_catalog_and_cart.sql`  
**Risk:** Low (additive only)  
**Impact:** Creates all e-commerce tables and functions

**What it creates:**
- ✅ 7 new tables (categories, variants, inventory, cart, etc.)
- ✅ 4 RPCs (stock states, cart operations, merge, cleanup)
- ✅ RLS policies on all tables
- ✅ Indexes for performance

**How to run:**

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy the entire contents of `001_catalog_and_cart.sql`
3. Paste and click **Run**
4. Wait for "Success" (may take 10-15 seconds)

**Verify:**
```sql
-- Should show 7 new tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'categories', 'product_categories', 'product_variants', 
    'product_inventory', 'product_images', 'carts', 'cart_items'
  )
ORDER BY table_name;

-- Should show 6 categories
SELECT name, slug FROM categories ORDER BY sort_order;

-- Should show 4 functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_stock_states', 'cart_set_item', 
    'cart_merge_guest', 'cleanup_expired_carts'
  );
```

**Test:**
1. Run `SELECT * FROM categories;` → should show 6 rows ✓
2. Check RLS: `SELECT * FROM product_inventory;` as non-admin → should return 0 rows ✓
3. Admin can still edit products via existing admin UI ✓

---

### Migration 3: Backfill & Constraints (002)

**File:** `002_backfill_and_constraints.sql`  
**Risk:** Low (products table is currently empty)  
**Impact:** Adds final constraints and full-text search

**What it does:**
- ✅ Backfills slugs for any existing products (no-op, table is empty)
- ✅ Makes slug NOT NULL and UNIQUE
- ✅ Adds full-text search vector
- ✅ Maps legacy `category` text to `product_categories`

**How to run:**

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy the entire contents of `002_backfill_and_constraints.sql`
3. Paste and click **Run**
4. Wait for "Success"

**Verify:**
```sql
-- Should show slug constraint exists
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'products' 
  AND constraint_type = 'UNIQUE' 
  AND constraint_name LIKE '%slug%';

-- Should show search_vector column exists
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'search_vector';

-- Should show 0 duplicate slugs
SELECT slug, count(*) FROM products GROUP BY slug HAVING count(*) > 1;
```

---

### Migration 4: Customer Ratings (003)

**File:** `003_customer_ratings.sql`  
**Impact:** New products no longer receive an assumed 4.5 rating. Existing ratings are unchanged.

---

### Migration 5: Remove Usernames (004)

**File:** `004_remove_username.sql`  
**Impact:** Removes username metadata and the profile column, updates the Auth signup trigger to create email-only profiles, and removes username-only RPCs.

**Verify:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username';
-- Expect no rows
```

---

## Post-Migration Checklist

After running all applicable migrations:

- [ ] All migrations ran without errors
- [ ] `SELECT * FROM categories;` returns 6 rows
- [ ] Can sign up a new user
- [ ] Cannot self-promote to admin
- [ ] Admin can create/edit products
- [ ] Non-admin cannot write to `carts` or `cart_items` directly
- [ ] `SELECT public.get_stock_states(ARRAY[]::uuid[]);` works

---

## Rollback

If you need to undo these migrations:

### Rollback 002
```sql
DROP INDEX IF EXISTS idx_products_search;
ALTER TABLE products DROP COLUMN IF EXISTS search_vector;
DROP INDEX IF EXISTS uq_products_slug;
ALTER TABLE products ALTER COLUMN slug DROP NOT NULL;
```

### Rollback 001
```sql
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS product_view_daily CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS product_inventory CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP FUNCTION IF EXISTS get_stock_states(uuid[]);
DROP FUNCTION IF EXISTS cart_set_item(uuid, integer);
DROP FUNCTION IF EXISTS cart_merge_guest(jsonb);
DROP FUNCTION IF EXISTS cleanup_expired_carts(integer);
```

### Rollback 000
**⚠️ WARNING:** Rollback 000 reopens security holes. Only do this in an emergency.

```sql
-- Re-create permissive policies (NOT RECOMMENDED)
-- Contact support instead
```

---

## Next Steps

After migrations are complete:

1. ✅ Review the full plan: `docs/ecommerce-scale-plan-v2.md`
2. ✅ Answer the 10 open questions in section 13
3. ✅ Set up Redis (Upstash recommended for eu-west-1)
4. ✅ Create observability dashboards
5. ✅ Start Phase 1: Catalog pages with caching

---

## Troubleshooting

### Error: "policy already exists"
- **Cause:** Migration partially ran
- **Fix:** Drop the policy manually, then re-run

### Error: "relation already exists"
- **Cause:** Table was created in a previous attempt
- **Fix:** Verify with `\dt`, then skip that CREATE TABLE or use DROP ... CASCADE carefully

### Error: "permission denied"
- **Cause:** Insufficient privileges
- **Fix:** Run as project owner or request admin access

### Error: "function does not exist"
- **Cause:** `public.is_admin_user()` missing
- **Fix:** Check that 000 ran successfully first

---

## Support

For questions or issues:
1. Check `docs/ecommerce-scale-plan-v2.md` section 0.1 (live database alignment)
2. Review the v2 plan's rollback guidance (section 12)
3. Test on a Supabase branch first if available
