-- Run this once in the Supabase SQL Editor to speed up the app's existing
-- student lookups and common product queries. Primary-key indexes are already
-- created by Supabase and do not need to be duplicated here.

CREATE INDEX IF NOT EXISTS students_user_id_idx
  ON public.students (user_id);

CREATE INDEX IF NOT EXISTS students_accepted_created_at_idx
  ON public.students (accepted, created_at DESC);

CREATE INDEX IF NOT EXISTS products_category_idx
  ON public.products (category);
