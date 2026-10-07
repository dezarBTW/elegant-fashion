-- 001_catalog_and_cart.sql
-- Additive and re-runnable. RUN ON A SUPABASE BRANCH / STAGING FIRST.
--
-- Checked against the live project on 2026-10-07:
--   * public.products already has RLS on, id is uuid, 0 rows; admin writes already go
--     through policies using public.is_admin_user() (public.users.is_admin).
--   * APPLY 000_security_hardening.sql FIRST. Until the public.users UPDATE hole is
--     closed, the admin policies below can be obtained by any signed-in user.
--   * This file replaces the two "USING (true)" public read policies on products with an
--     is_active check. Existing admin policies are left untouched.

begin;

-- 0. Guard: FK types below assume products.id is uuid ------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    raise exception 'public.products.id is not uuid - adjust FK column types in this migration before running';
  end if;
end $$;

-- 1. Helpers -----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 2. Categories --------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories(id) on delete restrict,
  name        text not null,
  slug        text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  image_url   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Unique slug per parent (root categories share the nil-uuid bucket)
create unique index if not exists uq_categories_parent_slug
  on public.categories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index if not exists idx_categories_parent
  on public.categories (parent_id, sort_order) where is_active;

-- 3. Products (existing table): additive columns -----------------------------
alter table public.products add column if not exists slug           text;
alter table public.products add column if not exists description    text;
alter table public.products add column if not exists specifications jsonb   not null default '{}'::jsonb;
alter table public.products add column if not exists is_active      boolean not null default true;
alter table public.products add column if not exists is_featured    boolean not null default false;
-- Live table already has: id uuid, name, price numeric, category text, image text,
-- rating, reviews, created_at. `price` IS the base price (no base_price column).
-- `category` and `image` stay as legacy columns so the existing app/admin UI keeps working.
alter table public.products add column if not exists sale_price     numeric(10,2);

alter table public.products drop constraint if exists chk_products_prices;
alter table public.products add constraint chk_products_prices check (
  price >= 0
  and coalesce(sale_price, 0) >= 0
  and (sale_price is null or sale_price <= price)
);

-- Auto-generate slug when the existing admin UI inserts a product without one
create or replace function public.products_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := coalesce(
      nullif(trim(both '-' from lower(regexp_replace(coalesce(new.name, ''), '[^a-zA-Z0-9]+', '-', 'g'))), ''),
      'product'
    ) || '-' || left(new.id::text, 6);
  end if;
  return new;
end $$;

drop trigger if exists trg_products_set_slug on public.products;
create trigger trg_products_set_slug
  before insert on public.products
  for each row execute function public.products_set_slug();

-- 4. Product <-> category (many-to-many, one primary) ------------------------
create table if not exists public.product_categories (
  product_id  uuid not null references public.products(id)   on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary  boolean not null default false,
  primary key (product_id, category_id)
);
create index if not exists idx_product_categories_category
  on public.product_categories (category_id, product_id);
create unique index if not exists uq_product_primary_category
  on public.product_categories (product_id) where is_primary;

-- 5. Variants ----------------------------------------------------------------
create table if not exists public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  sku            text not null unique,          -- unique constraint already indexes sku
  size           text,
  color          text,
  color_hex      text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price_modifier numeric(10,2) not null default 0,
  weight_grams   integer check (weight_grams is null or weight_grams >= 0),
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_variants_product
  on public.product_variants (product_id, sort_order) where is_active;

-- 6. Inventory (never exposed to clients; sellable = available - reserved) ---
create table if not exists public.product_inventory (
  variant_id         uuid primary key references public.product_variants(id) on delete cascade,
  quantity_available integer not null default 0 check (quantity_available >= 0),
  quantity_reserved  integer not null default 0 check (quantity_reserved >= 0),
  reorder_threshold  integer not null default 10 check (reorder_threshold >= 0),
  last_restocked_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint chk_reserved_le_available check (quantity_reserved <= quantity_available)
);

-- 7. Images ------------------------------------------------------------------
create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  url        text not null,
  alt_text   text,
  position   integer not null default 0,
  width      integer,
  height     integer,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_images_product on public.product_images (product_id, position);
create index if not exists idx_images_variant on public.product_images (variant_id) where variant_id is not null;

-- 8. Batched view counts (replaces products.view_count hot row) --------------
create table if not exists public.product_view_daily (
  product_id uuid   not null references public.products(id) on delete cascade,
  day        date   not null,
  views      bigint not null default 0,
  primary key (product_id, day)
);

-- 9. Carts: AUTHENTICATED USERS ONLY (guest carts live in Redis) -------------
create table if not exists public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_carts_one_active_per_user
  on public.carts (user_id) where status = 'active';
create index if not exists idx_carts_expiry
  on public.carts (expires_at) where status = 'active';

create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity   integer not null check (quantity between 1 and 10),
  unit_price numeric(10,2) not null check (unit_price >= 0),  -- server-set snapshot
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)                                -- also serves cart_id lookups
);
create index if not exists idx_cart_items_variant on public.cart_items (variant_id);

-- 10. updated_at triggers ----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categories', 'product_variants', 'product_inventory', 'carts', 'cart_items']
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- 11. Row Level Security -----------------------------------------------------
alter table public.products           enable row level security;
alter table public.categories         enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_variants   enable row level security;
alter table public.product_inventory  enable row level security;
alter table public.product_images     enable row level security;
alter table public.product_view_daily enable row level security;
alter table public.carts              enable row level security;
alter table public.cart_items         enable row level security;

-- Public catalog reads (active only).
-- The live table has two permissive SELECT policies with USING (true); permissive policies
-- are OR-ed, so they must be dropped or inactive products stay publicly readable.
drop policy if exists "Public can read products" on public.products;
drop policy if exists "Public can view products" on public.products;
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to anon, authenticated
  using (is_active);

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated
  using (is_active);

drop policy if exists "product_categories_public_read" on public.product_categories;
create policy "product_categories_public_read" on public.product_categories
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_categories.product_id and p.is_active
  ));

drop policy if exists "variants_public_read" on public.product_variants;
create policy "variants_public_read" on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id and p.is_active
  ));

drop policy if exists "images_public_read" on public.product_images;
create policy "images_public_read" on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_images.product_id and p.is_active
  ));

-- Carts: owner can READ. All writes go through the RPCs below.
drop policy if exists "carts_owner_read" on public.carts;
create policy "carts_owner_read" on public.carts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "cart_items_owner_read" on public.cart_items;
create policy "cart_items_owner_read" on public.cart_items
  for select to authenticated
  using (exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id and c.user_id = (select auth.uid())
  ));

-- Admin access to the new catalog tables follows the project's existing pattern:
-- public.is_admin_user() (reads public.users.is_admin). Requires 000 to be applied first.
-- Non-admins get no policy on product_inventory, so they see no rows at all.
do $$
declare t text;
begin
  foreach t in array array['categories', 'product_categories', 'product_variants',
                           'product_images', 'product_inventory']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select public.is_admin_user()))
         with check ((select public.is_admin_user()))',
      t || '_admin_all', t);
  end loop;
end $$;

-- Defense in depth on grants
revoke all on public.product_inventory  from anon;                  -- never public
revoke all on public.product_view_daily from anon, authenticated;   -- service role only
revoke all on public.carts, public.cart_items from anon;
revoke insert, update, delete, truncate on public.carts, public.cart_items from authenticated;
revoke insert, update, delete, truncate
  on public.categories, public.product_categories, public.product_variants, public.product_images
  from anon;
revoke truncate on public.categories, public.product_categories, public.product_variants,
  public.product_images, public.product_inventory from authenticated;

-- 12. RPCs -------------------------------------------------------------------

-- 12a. Coarse, batched stock state (never exposes counts)
create or replace function public.get_stock_states(p_variant_ids uuid[])
returns table (variant_id uuid, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id,
         case
           when coalesce(i.quantity_available - i.quantity_reserved, 0) <= 0 then 'out'
           when i.quantity_available - i.quantity_reserved <= 5            then 'low'   -- tune threshold
           else 'in_stock'
         end
    from public.product_variants v
    join public.products p on p.id = v.product_id
    left join public.product_inventory i on i.variant_id = v.id
   where v.id = any (p_variant_ids[1:200])
     and v.is_active
     and p.is_active;
$$;

revoke all on function public.get_stock_states(uuid[]) from public;
grant execute on function public.get_stock_states(uuid[]) to anon, authenticated;

-- 12b. Set the quantity of one line in the caller's cart (0 removes).
--      Idempotent. Price and stock are computed here, never by the client.
create or replace function public.cart_set_item(p_variant_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_cart  uuid;
  v_price numeric(10,2);
  v_free  integer;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 10 then
    raise exception 'quantity must be between 0 and 10' using errcode = '22023';
  end if;

  select c.id into v_cart
    from public.carts c
   where c.user_id = v_user and c.status = 'active';

  if p_quantity = 0 then
    if v_cart is not null then
      delete from public.cart_items
       where cart_id = v_cart and variant_id = p_variant_id;
    end if;
    return;
  end if;

  select coalesce(p.sale_price, p.price) + v.price_modifier,
         coalesce(i.quantity_available - i.quantity_reserved, 0)
    into v_price, v_free
    from public.product_variants v
    join public.products p on p.id = v.product_id
    left join public.product_inventory i on i.variant_id = v.id
   where v.id = p_variant_id and v.is_active and p.is_active;

  if not found then
    raise exception 'variant_unavailable';
  end if;
  if v_price is null or v_price < 0 then
    raise exception 'price_unavailable';
  end if;
  if p_quantity > v_free then
    raise exception 'insufficient_stock';
  end if;

  if v_cart is null then
    insert into public.carts (user_id) values (v_user)
    on conflict (user_id) where status = 'active' do nothing
    returning id into v_cart;

    if v_cart is null then  -- lost a race with another request
      select c.id into v_cart
        from public.carts c
       where c.user_id = v_user and c.status = 'active';
    end if;
  end if;

  insert into public.cart_items (cart_id, variant_id, quantity, unit_price)
  values (v_cart, p_variant_id, p_quantity, v_price)
  on conflict (cart_id, variant_id)
  do update set quantity = excluded.quantity, unit_price = excluded.unit_price;

  -- Sliding expiry, written at most hourly to limit write churn
  update public.carts
     set expires_at = now() + interval '30 days'
   where id = v_cart and updated_at < now() - interval '1 hour';
end $$;

revoke all on function public.cart_set_item(uuid, integer) from public, anon;
grant execute on function public.cart_set_item(uuid, integer) to authenticated;

-- 12c. Merge a guest cart on login. Idempotent: per line, max(existing, guest), capped at 10.
--      p_items = [{"variant_id": "<uuid>", "quantity": 2}, ...]  (max 50 lines)
--      Returns {"skipped": [<variant_id>, ...]} for lines that failed validation.
create or replace function public.cart_merge_guest(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_line     record;
  v_existing integer;
  v_skipped  jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid items' using errcode = '22023';
  end if;

  for v_line in
    select (e.item ->> 'variant_id')::uuid                              as variant_id,
           least(greatest((e.item ->> 'quantity')::integer, 1), 10)     as quantity
      from jsonb_array_elements(p_items) as e(item)
  loop
    begin
      select ci.quantity into v_existing
        from public.cart_items ci
        join public.carts c on c.id = ci.cart_id
       where c.user_id = v_user and c.status = 'active'
         and ci.variant_id = v_line.variant_id;

      perform public.cart_set_item(
        v_line.variant_id,
        greatest(coalesce(v_existing, 0), v_line.quantity)
      );
    exception when others then
      v_skipped := v_skipped || to_jsonb(v_line.variant_id);
    end;
  end loop;

  return jsonb_build_object('skipped', v_skipped);
end $$;

revoke all on function public.cart_merge_guest(jsonb) from public, anon;
grant execute on function public.cart_merge_guest(jsonb) to authenticated;

-- 12d. Batched cleanup of expired carts (service role / pg_cron only)
create or replace function public.cleanup_expired_carts(p_batch integer default 5000)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with doomed as (
    select id from public.carts
     where status = 'active' and expires_at < now()
     order by expires_at
     limit p_batch
     for update skip locked
  )
  delete from public.carts c using doomed d where c.id = d.id;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.cleanup_expired_carts(integer) from public, anon, authenticated;

-- Schedule (pg_cron is available but NOT installed on this project: create extension if not exists pg_cron;):
--   select cron.schedule('cleanup-expired-carts', '*/15 * * * *',
--                        'select public.cleanup_expired_carts(5000)');

-- 13. Seed top-level categories (no "All" row; that is a UI concept) ---------
insert into public.categories (name, slug, sort_order) values
  ('Dresses',     'dresses',     1),
  ('Skirts',      'skirts',      2),
  ('Trousers',    'trousers',    3),
  ('Tops',        'tops',        4),
  ('Jackets',     'jackets',     5),
  ('Accessories', 'accessories', 6)
on conflict do nothing;

commit;
