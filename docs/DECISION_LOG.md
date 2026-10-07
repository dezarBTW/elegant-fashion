# E-Commerce Decision Log

**Date:** 2026-10-07  
**Project:** Elegant Style Fashion  
**Status:** Phase 1 ready to begin

---

## 10 Open Questions - Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Customer region? | Nigeria primarily, Africa expansion later | eu-west-1 acceptable for M1 (~150-200ms cart latency) |
| 2 | Peak traffic? | <1,000 daily, designing for M1 (5k concurrent) | Conservative scaling plan |
| 3 | Currency? | Single - Naira (NGN) | No multi-currency column needed |
| 4 | Redis provider? | Upstash eu-west-1 | ✅ Approved |
| 5 | Cart lifetime? | 30 days (sliding) | Keep as designed |
| 6 | Launch features? | Simple: no sales, no multi-warehouse, no brand taxonomy | Lean launch, add complexity at M2+ |
| 7 | Who writes products/images? | Admin UI only (.jpg, .png) | Keep strict storage policies |
| 8 | Price unit? | Major (12000.00 = ₦12,000) | Use existing `price numeric` column |
| 9 | Separate project? | Keep shared project until M2 | Migrate if noisy-neighbor issues |
| 10 | Student-passports? | Fix to private bucket with signed URLs | Security best practice |

---

## Implementation Decisions

### What's In Scope for Phase 1
- ✅ Product catalog with category filtering
- ✅ Full-text search (Postgres FTS)
- ✅ Real-time stock availability (in_stock, low, out)
- ✅ Image optimization (AVIF/WebP)
- ✅ Admin product/image management
- ❌ Sale start/end windows (M2+)
- ❌ Multi-warehouse inventory (M2+)
- ❌ Brand/collection taxonomy (M2+)
- ❌ Multi-currency (M3+)

### Technology Stack Confirmed
| Component | Stack |
|-----------|-------|
| Frontend | Next.js 16 + React 19 + Vercel |
| Database | Supabase PostgreSQL (eu-west-1) |
| Cache | Upstash Redis (eu-west-1) |
| Images | Next.js Image + AVIF/WebP |
| Auth | Supabase Auth |
| Search | PostgreSQL full-text search |

---

## Price Unit Clarification

**Decision:** Store prices in **major units** as decimal numbers.

**Example:**
- ₦1,200.00 → Store as `1200.00`
- ₦50,000.00 → Store as `50000.00`

**Display formatting (client-side):**
```typescript
// src/lib/formatPrice.ts
export function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Usage
formatNGN(1200.00) // "₦1,200.00"
formatNGN(50000.00) // "₦50,000.00"
```

**Why:** The existing `price numeric` column is perfect for this. No schema changes needed.

---

## Launch Features - Keep It Simple

**At launch, we need only:**
1. **Browse** products by category
2. **Search** products by name/description
3. **View** product details with variants
4. **See** stock availability (in_stock, low, out)
5. **Admin** can add/edit products and images

**What's out of scope:**
- Flash sales/scheduled discounts
- Multiple warehouse locations
- Brand or collection pages
- Multi-currency support
- Cart (this is Phase 2)

**Why simple?** Get products selling first. Add advanced features after you have traffic and feedback.

---

## Architecture Decision: Shared Project Until M2

**Current setup:** Storefront + Student portal share `yrzvqvdrahfmmoprgukd`

**Decision:** Keep this setup for M1. reasons:
- Easier to manage (single project)
- No data migration complexity
- Student portal traffic is low (<1k DAU)
- Storefront starts with <1k DAU too

**M2 trigger:** If you see:
- Database CPU consistently > 70%
- Connection pool exhaustion
- Slower response times during student portal peak
- Need different scaling for store vs portal

Then spin up a new Supabase project for the storefront and migrate.

---

## Student-passports Bucket - Fix Plan

**Problem:** Public bucket with public read policy means anyone with URL can see student photos.

**Fix:**
```sql
-- 1. Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'student-passports';

-- 2. Drop public read policy
DROP POLICY IF EXISTS "Public can view student passports" ON storage.objects;

-- 3. Add authenticated read (user can only read their own photo)
CREATE POLICY "Users can view own passport" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    auth.uid()::text = (storage.foldername(name))[1] 
    AND bucket_id = 'student-passports'
  );
```

**App change needed:** Student portal should generate signed URLs for photo display:
```typescript
// Student app
const { data } = await supabase.storage
  .from('student-passports')
  .createSignedUrl(`user-id/passport.jpg`, 3600); // 1 hour
```

---

## Next Steps

### Immediate (This Week)
1. [ ] Set up Upstash Redis (eu-west-1)
2. [ ] Enable Vercel Analytics
3. [ ] Set up Supabase reports/alerts
4. [ ] Measure current traffic baseline
5. [ ] Document price unit in project README

### Phase 1 (Weeks 2-3)
1. [ ] Refactor `src/app/ready-to-wear/page.js` with new schema
2. [ ] Create `/api/stock` endpoint
3. [ ] Create `/api/search` endpoint
4. [ ] Configure image optimization (AVIF/WebP)
5. [ ] Build product detail pages

### M1 Ready Checklist
- [ ] 5k concurrent users load test passes
- [ ] CDN cache hit ratio ≥95%
- [ ] No RLS bypasses
- [ ] Admin can edit products
- [ ] Stock availability shows correctly

---

## Files Created

```
docs/
├── ecommerce-scale-plan-v2.md     ← Master plan (65 pages)
├── DECISION_LOG.md                ← This file
└── PHASE1_PLAN.md                 ← Implementation guide

supabase/migrations/
├── 000_security_hardening.sql     ← Security fixes (APPLIED)
├── 001_catalog_and_cart.sql       ← Schema (APPLIED)
├── 002_backfill_and_constraints.sql ← Constraints (APPLIED)
└── README.md                      ← Migration guide

IMPLEMENTATION_STATUS.md           ← Current status
MIGRATION_COMPLETE.md              ← Migration results
EXECUTE_NOW.md                     ← Quick migration guide
```

---

**Status:** 📝 Decisions documented, ready to implement Phase 1  
**Next action:** Set up Upstash Redis and start building catalog pages
