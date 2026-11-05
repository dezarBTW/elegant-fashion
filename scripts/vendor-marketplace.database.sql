-- All test changes are rolled back, including queued notifications.
BEGIN;
DO $$
DECLARE admin_id uuid; vendor_id uuid; other_id uuid; product_id uuid:=gen_random_uuid(); test_order_id uuid:=gen_random_uuid(); item_id uuid; actual uuid;
BEGIN
 SELECT u.id INTO admin_id FROM public.users u JOIN auth.users a ON a.id=u.id WHERE u.is_admin AND u.is_active ORDER BY u.id LIMIT 1;
 SELECT u.id INTO vendor_id FROM public.users u JOIN auth.users a ON a.id=u.id WHERE NOT u.is_admin AND u.is_active ORDER BY u.id LIMIT 1;
 SELECT u.id INTO other_id FROM public.users u JOIN auth.users a ON a.id=u.id WHERE NOT u.is_admin AND u.is_active AND u.id<>vendor_id ORDER BY u.id LIMIT 1;
 IF admin_id IS NULL OR vendor_id IS NULL OR other_id IS NULL THEN RAISE EXCEPTION 'Test accounts unavailable'; END IF;
 INSERT INTO public.vendor_accounts(user_id,status,accepted_at,accepted_terms_version)VALUES(vendor_id,'active',now(),'2026-11-05')
 ON CONFLICT(user_id)DO UPDATE SET status='active',accepted_at=now(),accepted_terms_version='2026-11-05';
 INSERT INTO public.vendor_accounts(user_id,status,accepted_at,accepted_terms_version)VALUES(other_id,'active',now(),'2026-11-05')
 ON CONFLICT(user_id)DO UPDATE SET status='active',accepted_at=now(),accepted_terms_version='2026-11-05';
 actual:=public.seller_save_product(vendor_id,product_id,'{"name":"Rollback-only vendor test","price":100,"category":"Dresses","gender":"female","description":"Transaction test","image":null}', '{"S":5,"M":0,"L":0,"XL":0,"XXL":0}',null,'2026-11-05');
 IF actual<>product_id OR NOT EXISTS(SELECT 1 FROM public.product_owners WHERE product_owners.product_id=actual AND user_id=vendor_id AND seller_kind='vendor')THEN RAISE EXCEPTION 'Ownership failed';END IF;
 BEGIN
  PERFORM public.seller_save_product(vendor_id,product_id,'{"name":"Conflict test","price":100,"category":"Dresses","gender":"female","description":"Conflict test","image":null}','{"S":5,"M":0,"L":0,"XL":0,"XXL":0}',999,'2026-11-05');
  RAISE EXCEPTION 'Revision conflict was not rejected';
 EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL;END;
 BEGIN
  PERFORM public.seller_save_product(other_id,product_id,'{}','{}',null,'2026-11-05');
  RAISE EXCEPTION 'Unauthorized product write succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 INSERT INTO public.shop_orders(id,user_id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,receipt_hash,request_fingerprint)
 VALUES(test_order_id,other_id,'Rollback-only customer','rollback-only@example.invalid','08000000000','{"method":"pickup"}',jsonb_build_array(jsonb_build_object('productId',product_id,'name','Rollback-only vendor test','size','S','quantity',1,'unitAmountMinor',10000,'lineAmountMinor',10000)),10000,0,10000,repeat('a',64),repeat('b',64));
 UPDATE public.shop_orders SET payment_status='paid',paid_at=now()-interval '8 days',payment_id=gen_random_uuid()::text,paid_event_id=gen_random_uuid()::text WHERE id=test_order_id;
 SELECT id INTO item_id FROM public.seller_order_items WHERE seller_order_items.order_id=test_order_id;
 IF item_id IS NULL THEN RAISE EXCEPTION 'Seller snapshot missing'; END IF;
 PERFORM public.seller_item_action(vendor_id,item_id,'processing');
 PERFORM public.seller_item_action(vendor_id,item_id,'sent_to_shop');
 PERFORM public.seller_item_action(admin_id,item_id,'at_shop');
 PERFORM public.seller_item_action(admin_id,item_id,'ready');
 PERFORM public.seller_item_action(other_id,item_id,'confirm');
 BEGIN
  PERFORM public.seller_item_action(admin_id,item_id,'payment_fulfilled');
  RAISE EXCEPTION 'Early payment succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 INSERT INTO public.refund_requests(id,user_id,order_id,product_id,product_name,description)
 VALUES(gen_random_uuid(),other_id,test_order_id,product_id,'Rollback-only vendor test','Rollback-only return request');
 UPDATE public.seller_order_items SET confirmed_at=now()-interval '4 days' WHERE id=item_id;
 BEGIN
  PERFORM public.seller_item_action(admin_id,item_id,'payment_fulfilled');
  RAISE EXCEPTION 'Open return did not hold payment';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 UPDATE public.refund_requests SET status='rejected' WHERE refund_requests.order_id=test_order_id;
 PERFORM public.seller_item_action(admin_id,item_id,'payment_fulfilled');
 PERFORM public.seller_item_action(vendor_id,item_id,'payment_received');
 IF NOT EXISTS(SELECT 1 FROM public.seller_order_items WHERE id=item_id AND payment_received_at IS NOT NULL)THEN RAISE EXCEPTION 'Receipt confirmation failed';END IF;
END $$;
DO $$
DECLARE a uuid;v1 uuid;v2 uuid;p1 uuid;p2 uuid:=gen_random_uuid();o uuid:=gen_random_uuid();i1 uuid;i2 uuid;
BEGIN
 SELECT u.id INTO a FROM public.users u JOIN auth.users x ON x.id=u.id WHERE u.is_admin AND u.is_active ORDER BY u.id LIMIT 1;
 SELECT user_id,product_id INTO v1,p1 FROM public.product_owners WHERE product_id IN(SELECT id FROM public.products WHERE name='Rollback-only vendor test') LIMIT 1;
 SELECT user_id INTO v2 FROM public.vendor_accounts WHERE status='active' AND user_id<>v1 ORDER BY user_id LIMIT 1;
 PERFORM public.seller_save_product(v2,p2,'{"name":"Rollback-only second vendor","price":100,"category":"Dresses","gender":"female","description":"Test","image":null}','{"S":5,"M":0,"L":0,"XL":0,"XXL":0}',null,'2026-11-05');
 INSERT INTO public.shop_orders(id,user_id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,receipt_hash,request_fingerprint)
 VALUES(o,a,'Rollback-only combined order','rollback-only@example.invalid','08000000000','{"method":"pickup"}',jsonb_build_array(jsonb_build_object('productId',p1,'name','First','size','S','quantity',1,'unitAmountMinor',10000,'lineAmountMinor',10000),jsonb_build_object('productId',p2,'name','Second','size','S','quantity',1,'unitAmountMinor',10000,'lineAmountMinor',10000)),20000,0,20000,repeat('c',64),repeat('d',64));
 UPDATE public.shop_orders SET payment_status='paid',paid_at=now(),payment_id=gen_random_uuid()::text,paid_event_id=gen_random_uuid()::text WHERE id=o;
 SELECT id INTO i1 FROM public.seller_order_items WHERE order_id=o AND product_id=p1;
 SELECT id INTO i2 FROM public.seller_order_items WHERE order_id=o AND product_id=p2;
 PERFORM public.seller_item_action(v1,i1,'processing');PERFORM public.seller_item_action(v1,i1,'sent_to_shop');PERFORM public.seller_item_action(a,i1,'at_shop');
 BEGIN PERFORM public.seller_item_action(a,i1,'ready');RAISE EXCEPTION 'Partial combined dispatch succeeded';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM public.seller_item_action(v2,i2,'processing');PERFORM public.seller_item_action(v2,i2,'sent_to_shop');PERFORM public.seller_item_action(a,i2,'at_shop');
 PERFORM public.seller_item_action(a,i1,'ready');
 IF (SELECT count(*) FROM public.seller_order_items WHERE order_id=o AND fulfilment='ready')<>2 THEN RAISE EXCEPTION 'Combined dispatch failed';END IF;
END $$;
ROLLBACK;
