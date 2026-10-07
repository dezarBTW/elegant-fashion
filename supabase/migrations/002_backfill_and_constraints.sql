-- 002_backfill_and_constraints.sql
-- Run AFTER 000 and 001. Re-runnable.
--
-- Live state (2026-10-07): public.products has 0 rows, so the backfills below are
-- no-ops today. They are kept so the file is safe if products are added before it runs.
-- `price` (numeric) is the base price. Decide and document the unit: major units
-- (e.g. 12000.00) vs minor units; the cart RPC and UI assume ONE consistent unit.

begin;

-- 1. Slug backfill for any rows created before 001 (the 001 trigger covers new rows)
update public.products
   set slug = coalesce(
                nullif(trim(both '-' from lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', '-', 'g'))), ''),
                'product'
              ) || '-' || left(id::text, 6)
 where slug is null;

-- 2. Constraints and indexes now that every row has a slug
alter table public.products alter column slug set not null;
create unique index if not exists uq_products_slug on public.products (slug);
create index if not exists idx_products_price on public.products (price) where is_active;
-- (products_category_idx on the legacy text column already exists)

-- 3. Map the legacy text `category` onto product_categories (matches root category slugs)
insert into public.product_categories (product_id, category_id, is_primary)
select p.id, c.id, true
  from public.products p
  join public.categories c
    on c.parent_id is null
   and c.slug = lower(regexp_replace(trim(p.category), '\s+', '-', 'g'))
on conflict do nothing;

-- 4. Full-text search (generated column; change 'simple' if the catalog is single-language)
alter table public.products
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored;

create index if not exists idx_products_search on public.products using gin (search_vector);
-- Query with: ... where search_vector @@ websearch_to_tsquery('simple', $1)
-- Typo tolerance: pg_trgm and unaccent are available (not installed) if you need them later.

-- 5. Sanity checks
select count(*) as products_total from public.products;
select slug, count(*) from public.products group by slug having count(*) > 1;  -- expect no rows

commit;
