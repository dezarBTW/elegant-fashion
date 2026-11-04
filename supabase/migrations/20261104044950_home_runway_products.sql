-- Public runway selections follow the same active-product RLS as the shop.
create function public.get_home_runway_products()
returns table (id uuid, slug text, name text, image text)
language sql volatile security invoker set search_path = ''
as $$
  select p.id, p.slug, p.name, p.image
  from public.products p
  where p.is_active and p.image is not null and btrim(p.image) <> ''
  order by random()
  limit 6;
$$;

revoke all on function public.get_home_runway_products() from public, anon, authenticated;
grant execute on function public.get_home_runway_products() to anon, authenticated, service_role;
notify pgrst, 'reload schema';
