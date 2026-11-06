BEGIN;
-- Online vendor terms acceptance was retired in favour of offline approval.
DROP FUNCTION IF EXISTS public.record_vendor_terms();
DROP TABLE IF EXISTS public.vendor_terms_acceptances;
NOTIFY pgrst, 'reload schema';
COMMIT;
