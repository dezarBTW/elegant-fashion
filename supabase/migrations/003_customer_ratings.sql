-- 003_customer_ratings.sql
-- New products remain unrated until customer reviews are implemented.
-- Existing product rows and any stored ratings are left unchanged.

begin;

alter table public.products
  alter column rating drop default;

comment on column public.products.rating is
  'Customer-submitted average rating; null until verified customer reviews exist.';

commit;
