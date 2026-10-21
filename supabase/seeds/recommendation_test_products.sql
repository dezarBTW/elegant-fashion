-- Recommendation demo data. Safe to rerun: each of the 100 slugs is inserted once.
-- The batch marker identifies these listings without touching other products.
with numbered as (
  select n, ((n - 1) % 6 + 1)::int as category_index,
    ((n - 1) / 6)::int as variant
  from generate_series(1, 100) as n
), details as (
  select *,
    (array['Dresses','Skirts','Trousers','Tops','Jackets','Accessories'])[category_index] as category,
    (array['Linen','Cotton','Crepe','Twill','Satin'])[variant % 5 + 1] as fabric,
    (array['Navy','Ivory','Burgundy','Olive'])[(variant / 5) % 4 + 1] as colour,
    case category_index
      when 1 then (array['Wrap Dress','Midi Dress','Shirt Dress'])[variant % 3 + 1]
      when 2 then (array['Midi Skirt','A-Line Skirt','Pleated Skirt'])[variant % 3 + 1]
      when 3 then (array['Straight-Leg Trousers','Wide-Leg Trousers','Tailored Trousers'])[variant % 3 + 1]
      when 4 then (array['Relaxed Shirt','Peplum Top','Button-Up Shirt'])[variant % 3 + 1]
      when 5 then (array['Tailored Jacket','Lightweight Blazer','Cropped Jacket'])[variant % 3 + 1]
      else (array['Fabric Tote','Neck Scarf','Pocket Square'])[variant % 3 + 1]
    end as garment,
    case when category_index in (1,2) then 'female'
      when category_index = 6 then 'unisex'
      else (array['male','female','unisex'])[variant % 3 + 1]
    end as gender,
    (array[35000,18000,25000,16000,45000,8000])[category_index] + variant * 1250 as price,
    case variant % 4
      when 0 then array['S','M','L']
      when 1 then array['M','L','XL']
      when 2 then array['L','XL','XXL']
      else array['S','M','L','XL','XXL']
    end as available_sizes,
    'test-recommendations-20261021-' || lpad(n::text,3,'0') as slug
  from numbered
), inserted as (
  insert into public.products
    (name,slug,category,description,price,sale_price,image,available_sizes,gender,is_active,is_featured,specifications)
  select
    'TEST - ' || colour || ' ' || fabric || ' ' || garment || ' ' || lpad(n::text,3,'0'),
    slug, category,
    'TEST LISTING ONLY — not a real item for fulfilment. ' || colour || ' ' || lower(fabric) || ' ' || lower(garment) ||
      ' with a comfortable fit and an everyday silhouette. Demonstration photography is used. Added for testing similar-product suggestions, sizes and gender filters.',
    price, case when n % 7 = 0 then round(price * 0.9,2) else null end,
    case when gender = 'male' then '/images/Hero/male-agbada-cream-stripes_v2.jpg'
      when gender = 'unisex' then '/images/bespoke-CUbywJn6.jpg'
      else (array['/images/Hero/female-ankara-peplum-gown_v2.jpg','/images/Hero/female-ankara-burgundy-midi_v2.jpg','/images/Hero/image%20%2820%29.jpg','/images/Hero/image%20%2821%29.jpg','/images/Hero/image%20%2822%29.jpg','/images/Hero/image%20%2823%29.jpg'])[variant % 6 + 1]
    end,
    available_sizes, gender, true, n % 9 = 0,
    jsonb_build_object('is_test',true,'test_batch','recommendations-2026-10-21','test_number',n,'fabric',fabric,'colour',colour)
  from details d
  where not exists (select 1 from public.products p where p.slug = d.slug)
  returning id
)
select count(*) as inserted_count from inserted;
