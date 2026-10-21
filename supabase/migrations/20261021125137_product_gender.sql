-- Keep existing listings unclassified until an admin chooses their audience.
alter table public.products
  add column gender text
  constraint products_gender_check check (gender in ('male', 'female', 'unisex'));

comment on column public.products.gender is
  'Admin-selected audience: male, female, or unisex (included in both gender filters). NULL means not yet classified.';
