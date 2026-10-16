-- Runs entirely in a transaction: no test orders or limit counters are retained.
BEGIN;
INSERT INTO public.shop_orders (
  id, customer_name, customer_email, customer_phone, delivery, items,
  subtotal_minor, shipping_minor, total_minor, receipt_hash, request_fingerprint
) VALUES (
  '11111111-1111-4111-8111-111111111111', 'Checkout test', 'checkout-test@example.invalid', '08000000000',
  '{"method":"outside_yenagoa","address":"Test only","city":"Test city","state":"Test state"}',
  '[{"productId":"test","name":"Test only","quantity":1,"unitAmountMinor":5000000,"lineAmountMinor":5000000}]',
  5000000, 200000, 5200000, repeat('a',64), repeat('b',64)
);

DO $$
BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.shop_orders'::regclass), 'Orders must have RLS';
  ASSERT NOT has_table_privilege('anon','public.shop_orders','SELECT'), 'Guest orders must be private';
  ASSERT NOT has_table_privilege('authenticated','public.shop_orders','INSERT'), 'Customers cannot choose order prices';
  ASSERT NOT has_column_privilege('authenticated','public.shop_orders','payment_status','UPDATE'), 'Browsers cannot mark orders paid';
  ASSERT NOT has_function_privilege('authenticated','public.consume_checkout_rate_limit(text)','EXECUTE'), 'Rate limiter must be server-only';
  BEGIN
    UPDATE public.shop_orders SET payment_status = 'paid' WHERE id = '11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'Paid status without payment identifiers was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.shop_orders SET shipping_minor = 0, total_minor = 5000000 WHERE id = '11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'Outside-Yenagoa delivery without its fee was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.shop_orders WHERE id = '11111111-1111-4111-8111-111111111111') = 0, 'A non-admin can see another customer order';
END;
$$;
RESET ROLE;
ROLLBACK;
SELECT 'checkout database security checks passed; test data rolled back' AS result;
