# Ready-to-Wear E-Commerce Scale Plan
## Scalable Architecture for 1M Concurrent Users

**Last Updated:** 2026-10-07  
**Scope:** Products → Cart (stop before checkout/payment)  
**Current Stack:** Next.js 16.2.1 + React 19 + Supabase (yrzvqvdrahfmmoprgukd)

---

## Executive Summary

This plan outlines a production-ready e-commerce architecture capable of handling 1M concurrent users for your ready-to-wear fashion store. The system prioritizes read scalability (product browsing, search, filtering), cart operations with both guest and authenticated users, and graceful degradation under peak load.

**Key Targets for 1M Users:**
- P95 API response: <100ms for product reads
- P99 API response: <250ms for product reads
- Cart write latency: <50ms
- Availability: 99.9% (uptime)
- Image delivery: <500ms LCP

---

## 1. Database Architecture

### 1.1 Core Tables (Supabase PostgreSQL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE SCHEMA OVERVIEW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  products (1000-5000 SKUs initially, scale to 50,000+)                       │
│     ↓                                                                        │
│  product_variants (sizes, colors per product)                                │
│     ↓                                                                        │
│  product_inventory (per-variant stock levels)                                │
│                                                                              │
│  carts (one per session/user)                                                │
│     ↓                                                                        │
│  cart_items (product references in cart)                                     │
│                                                                              │
│  categories (hierarchical)                                                   │
│                                                                              │
│  product_images (CDN-optimized URLs)                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Table Definitions

#### `products` (EXISTING - Needs Enhancement)
```sql
-- Existing columns preserved, add scalability columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);

-- Indexes for scalability
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_price ON products(base_price);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, is_active) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(search_vector);
```

#### `categories`
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_sort ON categories(sort_order, is_active);
```

#### `product_variants`
```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL, -- e.g., "M / Red", "L / Blue"
    size TEXT,
    color TEXT,
    color_hex TEXT, -- e.g., "#FF5733" for color swatches
    price_modifier NUMERIC(10,2) DEFAULT 0, -- Add/subtract from base price
    weight_grams INTEGER, -- For shipping calculations
    dimensions JSONB, -- {length, width, height} in cm
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id) WHERE is_active = true;
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_size_color ON product_variants(product_id, size, color);
```

#### `product_inventory`
```sql
CREATE TABLE product_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0, -- Pending checkout
    reorder_threshold INTEGER DEFAULT 10,
    warehouse_location TEXT, -- For multi-warehouse support
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_variant ON product_inventory(variant_id);
CREATE INDEX idx_inventory_low_stock ON product_inventory(quantity_available, reorder_threshold);
```

#### `carts`
```sql
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL, -- Guest cart identifier
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for guest carts
    status TEXT DEFAULT 'active', -- active, abandoned, converted
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_user ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_status ON carts(status, expires_at) WHERE status = 'active';
CREATE INDEX idx_carts_cleanup ON carts(expires_at) WHERE status = 'active';
```

#### `cart_items`
```sql
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL, -- Snapshot at add time
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, variant_id) -- Merge duplicate additions
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);
```

#### `product_images`
```sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    url TEXT NOT NULL, -- Supabase Storage or CDN URL
    alt_text TEXT,
    position INTEGER DEFAULT 0, -- Display order
    image_type TEXT DEFAULT 'standard', -- standard, thumbnail, hover, detail
    width INTEGER,
    height INTEGER,
    file_size_bytes BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_product ON product_images(product_id, position);
CREATE INDEX idx_images_variant ON product_images(variant_id) WHERE variant_id IS NOT NULL;
```

### 1.3 Connection Pooling Strategy

```sql
-- Enable PgBouncer for connection pooling (via Supabase Dashboard)
-- Target: 100 max connections with 1000+ queue capacity
-- Pool mode: transaction (for read), statement (for write)
```

**Supabase Dashboard Settings:**
- Pooler Mode: Transaction
- Max Connections: 100
- Default Pool Size: 20
- Max Client Connection: 1000

### 1.4 Read Replica Strategy

For 1M users, the primary database needs read replicas:

```
Primary DB (yrzvqvdrahfmmoprgukd) → 3 Read Replicas in different regions
```

**Read/Write Split:**
- Writes (cart updates, orders): Primary
- Reads (products, categories, images): Replicas (round-robin)
- Replication lag monitoring: <100ms acceptable

---

## 2. Caching Strategy

### 2.1 Redis Caching Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHING TIERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L1: Browser Cache (static assets, 1 year)                      │
│      ↓                                                          │
│  L2: CDN Cache (images, 7 days)                                 │
│      ↓                                                          │
│  L3: Vercel Edge Cache (API responses, 1 hour)                  │
│      ↓                                                          │
│  L4: Redis (cart, session, hot data, 30 min)                    │
│      ↓                                                          │
│  L5: PostgreSQL (source of truth)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Cache Keys

```redis
# Product Catalog
product:{id}              → 1 hour TTL
products:list:{filters}   → 15 min TTL
products:featured         → 5 min TTL
products:search:{query}   → 10 min TTL

# Categories
categories:tree           → 1 hour TTL
category:{id}:products    → 30 min TTL

# Cart (critical for 1M users)
cart:{session_id}         → 30 days TTL
cart:{user_id}:merge_queue → 7 days TTL

# Inventory (near-real-time)
inventory:{variant_id}    → 5 min TTL
```

### 2.3 Invalidation Strategy

```javascript
// Product update → invalidate all related caches
invalidateProduct(productId) {
  await redis.del(`product:${productId}`);
  await redis.del(`products:list:*`); // Pattern delete
  await purgeCDN(`/api/products/${productId}`);
}
```

---

## 3. API Architecture

### 3.1 Route Structure

```
/api/v1/
├── products/
│   ├── GET                    # List with filtering, pagination
│   ├── GET /featured          # Featured products
│   ├── GET /search            # Full-text search
│   ├── GET /:id               # Single product
│   └── GET /:id/variants      # Product variants
│
├── categories/
│   ├── GET                    # Full tree
│   └── GET /:id               # Single category
│
├── cart/
│   ├── GET                    # Get current cart
│   ├── POST                   # Create/update cart item
│   ├── PUT /:itemId           # Update quantity
│   └── DELETE /:itemId        # Remove item
│
└── inventory/
    └── GET /:variantId        # Stock levels
```

### 3.2 Rate Limiting (Upstash Redis or Supabase)

```typescript
// Rate limiting configuration
const rateLimitConfig = {
  products: { limit: 100, window: '1 minute' },
  cart: { limit: 50, window: '1 minute' },
  search: { limit: 20, window: '1 minute' },
  default: { limit: 100, window: '1 minute' }
};
```

### 3.3 Response Compression

```
Compression: Brotli (preferred) → Gzip fallback
Min size to compress: 1KB
CDN: Vercel Edge Network with Brotli pre-compression
```

---

## 4. Frontend Architecture

### 4.1 Next.js App Router Structure

```
src/app/
├── ready-to-wear/
│   ├── page.js                 # Main product grid
│   ├── product/
│   │   └── [slug]/
│   │       └── page.js         # Product detail
│   └── layout.js               # E-commerce layout wrapper
│
└── api/                        # Route handlers
```

### 4.2 Optimized Data Fetching

```typescript
// Use React Server Components for initial product load
// Streaming SSR for progressive product rendering
// React Query or SWR for client-side updates

// Example: Product grid with streaming
async function ProductGrid({ category }) {
  const products = await getProducts(category);
  
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductGridInner products={products} />
    </Suspense>
  );
}
```

### 4.3 Image Optimization

```javascript
// next.config.mjs
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [{
      protocol: 'https',
      hostname: '**.supabase.co',
    }],
  },
};
```

### 4.4 Cart State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    CART STATE LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Optimistic UI (React state)                             │
│     → Instant feedback, < 16ms                               │
│     → Revert on API failure                                  │
│                                                              │
│  2. Redis Cache (session cart)                              │
│     → Persistent across sessions                             │
│     → 30-day TTL                                             │
│                                                              │
│  3. PostgreSQL (authoritative cart)                         │
│     → Merge guest→user on login                              │
│     → Background sync                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Scalability Features

### 5.1 Horizontal Scaling

```
Production Architecture (1M Users):

┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL EDGE NETWORK                          │
│    (CDN + Edge Functions + Image Optimization + Brotli)         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │  Next.js │    │  Next.js │    │  Next.js │
   │  (US)   │    │  (EU)   │    │  (APAC) │
   └────┬────┘    └────┬────┘    └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │  Redis  │    │  Redis  │    │  Redis  │
   │ (Cache) │    │ (Cache) │    │ (Cache) │
   └─────────┘    └─────────┘    └─────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │Postgres │◄──►│Postgres │◄──►│Postgres │
   │ Primary │    │Replica 1│    │Replica 2│
   └─────────┘    └─────────┘    └─────────┘
```

### 5.2 Load Testing Targets

```typescript
// Target metrics for 1M concurrent users:
// - Products API: 50,000 requests/second
// - Cart API: 10,000 requests/second
// - P95 latency: < 100ms
// - Error rate: < 0.1%
```

### 5.3 Auto-Scaling Triggers

```
Vercel/Platform auto-scaling based on:
- CPU utilization: > 70% → scale up
- Request queue: > 100 pending → scale up
- Memory: > 80% → scale up
- Cold starts: < 5% of requests
```

---

## 6. Security

### 6.1 Row Level Security (RLS)

```sql
-- Products: Public read, authenticated update (admin only)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public products read" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins update products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Carts: User-scoped access
CREATE POLICY "Users manage own carts" ON carts
  FOR ALL USING (
    auth.uid() = user_id OR 
    session_id = current_setting('app.cart_session', true)
  );

CREATE POLICY "Users manage own cart items" ON cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE id = cart_id AND (
        user_id = auth.uid() OR
        session_id = current_setting('app.cart_session', true)
      )
    )
  );
```

### 6.2 API Security

```typescript
// Rate limiting already defined
// Add:
- Input validation (Zod)
- SQL injection prevention (via Supabase client)
- XSS protection (React default)
- CORS configuration for API routes
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Run Supabase migrations for new tables
- [ ] Set up Redis caching (Upstash or Supabase)
- [ ] Enhance products table with new columns
- [ ] Create product_variants and product_inventory
- [ ] Implement Redis cart layer
- [ ] Basic RLS policies

### Phase 2: Core Features (Week 2)
- [ ] Refactor ready-to-wear page to use DB cart
- [ ] Implement product search with PostgreSQL full-text
- [ ] Add category hierarchy
- [ ] Image optimization via Next.js Image
- [ ] Rate limiting on API routes
- [ ] Cart session management

### Phase 3: Optimization (Week 3)
- [ ] CDN configuration for product images
- [ ] Read replica setup (Supabase Dashboard)
- [ ] Query optimization (indexes, EXPLAIN ANALYZE)
- [ ] Cache warming for featured products
- [ ] Load testing configuration
- [ ] Monitoring dashboards

### Phase 4: Scale (Week 4)
- [ ] Auto-scaling configuration
- [ ] Geographic load balancing
- [ ] Failover testing
- [ ] Performance tuning based on metrics
- [ ] Documentation

---

## 8. Database Migrations to Apply

Execute the following in Supabase SQL Editor (yrzvqvdrahfmmoprgukd):

```sql
-- Run all migrations in this block in Supabase SQL Editor

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    size TEXT,
    color TEXT,
    color_hex TEXT,
    price_modifier NUMERIC(10,2) DEFAULT 0,
    weight_grams INTEGER,
    dimensions JSONB,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create product_inventory table
CREATE TABLE IF NOT EXISTS product_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER DEFAULT 10,
    warehouse_location TEXT,
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create carts table (supports guest + authenticated)
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, variant_id)
);

-- 6. Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    alt_text TEXT,
    position INTEGER DEFAULT 0,
    image_type TEXT DEFAULT 'standard',
    width INTEGER,
    height INTEGER,
    file_size_bytes BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add new columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);

-- 8. Create indexes for scalability
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_price ON products(base_price);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, is_active) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_size_color ON product_variants(product_id, size, color);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON product_inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON product_inventory(quantity_available, reorder_threshold);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, position);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, is_active);

-- 9. RLS Policies for new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories, variants, inventory (read-only), images
CREATE POLICY "Public categories read" ON categories FOR SELECT USING (true);
CREATE POLICY "Public variants read" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Public inventory read" ON product_inventory FOR SELECT USING (true);
CREATE POLICY "Public images read" ON product_images FOR SELECT USING (true);

-- Cart policies (user-scoped + guest via session)
CREATE POLICY "Users manage own carts" ON carts FOR ALL USING (
    auth.uid() = user_id OR session_id = current_setting('app.cart_session', true)
);

CREATE POLICY "Users manage own cart items" ON cart_items FOR ALL USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE id = cart_id AND (
        user_id = auth.uid() OR
        session_id = current_setting('app.cart_session', true)
      )
    )
);

-- 10. Insert sample categories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('All', 'all', 0),
  ('Dresses', 'dresses', 1),
  ('Skirts', 'skirts', 2),
  ('Trousers', 'trousers', 3),
  ('Tops', 'tops', 4),
  ('Jackets', 'jackets', 5),
  ('Accessories', 'accessories', 6)
ON CONFLICT (slug) DO NOTHING;

-- Done
SELECT 'Schema ready for 1M users!';
```

---

## 9. Approval Checklist

Before I proceed with implementation, please review and approve:

- [ ] **Database Schema**: 7 new/enhanced tables with indexes and RLS
- [ ] **Technology Stack**: Next.js + Supabase + Redis (Upstash recommended)
- [ ] **Caching Strategy**: 5-tier caching with TTLs defined
- [ ] **Cart Implementation**: DB-backed with guest support and session merging
- [ ] **Scalability**: Read replicas and connection pooling
- [ ] **Security**: RLS policies for all tables
- [ ] **Implementation Phases**: 4-week phased approach

**Comments/Changes:**

---

## 10. What Happens Next

Once you approve:
1. I'll execute the Supabase SQL migrations above
2. Build the cart API routes (add, update, remove, merge)
3. Refactor ready-to-wear page with DB-backed cart
4. Add Redis caching layer
5. Implement search and filtering
6. Set up monitoring

**Questions to Confirm:**
- Preferred Redis provider (Upstash, Supabase Edge Functions, or other)?
- Target cart session duration (currently 30 days)?
- Need multi-warehouse inventory initially?