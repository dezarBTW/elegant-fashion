# Graph Report - ElegantstylesWebsite  (2026-11-10)

## Corpus Check
- 121 files · ~110,809 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1292 nodes · 2877 edges · 146 communities (75 shown, 71 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 98
- Community 99
- Community 100
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 130
- Community 131

## God Nodes (most connected - your core abstractions)
1. `next` - 79 edges
2. `OrderRequestError` - 68 edges
3. `react` - 49 edges
4. `requireOrderAdmin()` - 34 edges
5. `readAccountBody()` - 33 edges
6. `checkoutDatabase()` - 28 edges
7. `supabase` - 28 edges
8. `checkRequestOrigin()` - 28 edges
9. `zod` - 25 edges
10. `useAuth()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `requestRoute()` --indirect_call--> `readAccountBody()`  [INFERRED]
  scripts/product-flow.test.mjs → src/lib/accountServer.js
- `checkRequestOrigin()` --calls--> `OrderRequestError`  [EXTRACTED]
  scripts/account-deactivation.test.mjs → src/lib/orderManagement.mjs
- `route()` --indirect_call--> `readAccountBody()`  [INFERRED]
  scripts/order-management.test.mjs → src/lib/accountServer.js
- `checkRequestOrigin()` --calls--> `OrderRequestError`  [EXTRACTED]
  scripts/performance-routes.test.mjs → src/lib/orderManagement.mjs
- `readAccountBody()` --calls--> `OrderRequestError`  [EXTRACTED]
  scripts/performance-routes.test.mjs → src/lib/orderManagement.mjs

## Import Cycles
- 2-file cycle: `src/components/CartContents.js -> src/contexts/CartContext.js -> src/components/CartContents.js`

## Communities (146 total, 71 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (46): checkRequestOrigin(), user, application, request, items, POST(), runtime, accountActionSchema (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (23): public.is_vendor(), public.seller_item_action(), public.seller_save_product(), public.vendor_remove_product(), guard_bespoke_status_transition, order_email_order_idx, public.commit_order_size_stock(), public.order_email_deliveries (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (19): files, outDir, db, results, snapshot, agent, db, emails (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (24): PATCH(), maxDuration, POST(), GET(), failure(), GET(), json(), POST() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (18): AuthCallback(), ForgotPassword(), ResetPassword(), SignIn(), SignInForm(), SignUp(), SignUpForm(), authReturnPath() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (12): receiptContext, GET(), runtime, createAuthRequestGate(), BESPOKE_TRANSITIONS, bespokeReviewSchema, status, createReceiptConfirmation() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (9): react, sections, confirmationMethods, AccountRequests(), AdminCustomerRequests(), ProductRequestsAdmin(), Vendors(), SupportRequests() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (14): partners, pillars, values, Contact(), benefits, CoursesIcon(), Curriculum(), sixMonthModules (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (13): AccountShell(), AccountLayout(), metadata, Loading(), Account(), AdminLayout(), NAV_ITEMS, metadata (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (19): errorResponse(), GET(), noStore, POST(), runtime, POST(), POST(), GET() (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (18): AccountOrders(), repurchase(), money(), money(), OrderStatus(), removePurchasedItems(), CartContext, animateToCart() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (20): idx_cart_items_variant, idx_carts_expiry, idx_categories_parent, idx_product_categories_category, idx_variants_product, public.cart_items, public.cart_merge_guest(), public.cart_set_item() (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (6): @electric-sql/pglite, ids, ids, policies, sizes, passportUploadError()

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (15): setup(), brandHighlights, heroSlides, Home(), servicePillars, fade(), HomeRunwayLookbook(), mix() (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (15): VendorProducts(), BASE_CATEGORIES, ProductsAdmin(), ProductForm(), blank(), sizes, VendorProductManager(), field() (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (10): ProductDetails(), CartContents(), ProductOptions(), ShopProductCard(), useCart(), store, usePurchaseLimits(), imagePath() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (13): on_bespoke_requests_updated, public.bespoke_requests, cleanup_student_passport, public.review_student_application(), public.submit_student_application(), bespoke_requests_page_idx, bespoke_requests_status_page_idx, products_similar_category_idx (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (12): commit_paid_size_stock, public.admin_save_stock_product(), public.commit_order_size_stock(), public.get_size_purchase_limits(), public.product_size_stock, public.protect_reserved_product(), public.reserve_order_size_stock(), public.shop_stock_reservations (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.26
Nodes (14): BESPOKE_STATUSES, formatDate(), formatDateTime(), getProgrammePrice(), getStudentStatus(), toWhatsAppUrl(), badgeClass(), BespokeRequests() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (12): africanCountries, africanStates, Course(), FieldError(), initialFormData, requiredFields, validateField(), getCachedValue() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (12): public.product_view_daily, idx_products_price, idx_products_search, uq_products_slug, protect_pending_product, products_active_category_page_idx, products_active_page_idx, products_admin_page_idx (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (15): runs-on, steps, jobs, audit, name, on, pull_request, push (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (15): devDependencies, babel-plugin-react-compiler@1.0.0, @electric-sql/pglite@0.5.15, prettier@3.9.9, @supabase/cli@^1.0.0, @types/react@19.3.0, engines, node (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (11): body, setup(), tokenFor(), CHECKOUT_SIGN_IN, bachsBaseUrl(), paymentMatchesOrder(), validCheckoutUrl(), verifyBachsSignature() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.28
Nodes (10): route(), POST(), runtime, POST(), POST(), runtime, checkRequestOrigin(), optimizeProductImage() (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (6): metadata, metadata, metadata, metadata, metadata, pageMetadata()

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (12): idx_images_product, idx_images_variant, public.product_images, cleanup_bespoke_images, cleanup_category_image, cleanup_product_image, cleanup_product_images_url, public.storage_cleanup_queue (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.21
Nodes (12): Auth hydration identity race, Delivery confirmation record granularity, Elegant Style state-machine inventory, Unreleased stock holds, Time-driven eligibility state, Administrator payment email retry, Guarded bespoke review transitions, Identity-bound profile hydration (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.30
Nodes (11): zod, GET(), POST(), DELETE(), fail(), GET(), POST(), reply() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (3): checkRequestOrigin(), readAccountBody(), requireOrderAdmin()

### Community 32 - "Community 32"
Cohesion: 0.23
Nodes (9): input, product, requestRoute(), productRequestSchema, availableSizes(), matchesGender(), PRODUCT_GENDERS, PRODUCT_SIZES (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.24
Nodes (7): Page(), adminHeaders(), deliveryLabel(), money(), Orders(), OrderItemImage(), VendorSales()

### Community 34 - "Community 34"
Cohesion: 0.26
Nodes (12): failure(), GET(), json(), POST(), runtime, failure(), GET(), json() (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.21
Nodes (7): Loading(), ReadyToWear(), Loading(), bone(), ProductDetailSkeleton(), ShopSkeleton(), SHOP_PAGE_SIZE

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (7): ProductCard(), ProductCardProps, Product, ProductGrid(), ProductGridProps, formatNGN(), formatNGNCompact()

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (5): verifyBespokeImages(), hasImageSignature(), JPEG, PNG, startsWith()

### Community 38 - "Community 38"
Cohesion: 0.23
Nodes (7): CookieConsent(), CONSENT_EVENT, CONSENT_KEY, getCookieConsent(), OPEN_SETTINGS_EVENT, openCookieSettings(), saveCookieConsent()

### Community 39 - "Community 39"
Cohesion: 0.28
Nodes (11): AboutIcon(), AdminIcon(), AuthControls(), CollectionIcon(), HomeIcon(), LoginIcon(), LogoutIcon(), NavbarContent() (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (6): Category, Product, ProductCategory, ProductImage, ProductVariant, StockState

### Community 41 - "Community 41"
Cohesion: 0.27
Nodes (10): public.account_order_claims, enforce_refund_deadline, public.enforce_refund_deadline(), public.seller_order_events, public.seller_order_items, public.snapshot_order_sellers(), seller_items_seller_idx, snapshot_order_sellers (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (10): guard_product_complaint, guard_refund_request, product_complaints_account_idx, public.account_action_limits, public.consume_account_action_limit(), public.guard_customer_request(), public.product_complaints, public.refund_requests (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (12): dependencies, @bachs/sdk@1.0.0, bootstrap@^5.3.8, next@16.4.2, react@19.2.4, react-dom@19.2.4, sharp@0.35.5, zod@4.6.7 (+4 more)

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (10): POST(), reply(), runtime, schema, Checkout(), formatMoney(), deliveryFeeMinor(), previewCheckoutCart() (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.27
Nodes (5): bone(), CheckoutSkeleton(), OrderSummarySkeleton(), PaymentStatusSkeleton(), TransferPage()

### Community 46 - "Community 46"
Cohesion: 0.31
Nodes (9): failure(), GET(), json(), PATCH(), querySchema, runtime, FULFILLMENT_STATUSES, ORDER_COLUMNS (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (10): fileSchema, getClientIp(), getSupabaseAdmin(), inMemoryRateLimit, isRateLimited(), legacyRequestSchema, MIME_BY_EXTENSION, POST() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (7): public.is_active_account(), public.is_active_account_admin(), public.link_legacy_account_orders(), public.is_vendor(), public.vendor_accounts, public.seller_item_action(), public.seller_item_action()

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (7): public.checkout_rate_limits, public.shop_orders, shop_orders_created_at_idx, shop_orders_account_idx, shop_orders_unclaimed_email_idx, public.validate_shop_order_delivery_rate(), shop_order_delivery_rate

### Community 50 - "Community 50"
Cohesion: 0.24
Nodes (7): product_owners_user_idx, public.product_owners, public.seller_save_product(), public.queue_seller_item_notification(), public.snapshot_order_sellers(), queue_seller_item_notification, public.seller_save_product()

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (9): escapeHtml(), getClientIp(), getSupabaseAdmin(), getWhatsAppLink(), maxDuration, POST(), runtime, sendNotificationEmail() (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.27
Nodes (8): public.queue_vendor_notification(), public.record_vendor_terms(), public.vendor_notifications, public.vendor_terms_acceptances, record_vendor_terms, vendor_invitation_queue, vendor_paid_queue, vendor_notifications_pending_idx

### Community 53 - "Community 53"
Cohesion: 0.28
Nodes (6): heic2any@^0.0.4, heic2any, ACCEPTED_EXTENSIONS, BespokeRequestPage(), compressImage(), hasAcceptedImageType()

### Community 54 - "Community 54"
Cohesion: 0.31
Nodes (3): RegistrationDetails(), PassportPhoto(), passportPath()

### Community 56 - "Community 56"
Cohesion: 0.39
Nodes (3): businessStructuredData, publicPages, SITE_URL

### Community 57 - "Community 57"
Cohesion: 0.44
Nodes (7): DELETE(), failure(), json(), POST(), runtime, schema, removeQueuedMedia()

### Community 58 - "Community 58"
Cohesion: 0.44
Nodes (7): dynamic, generateMetadata(), ProductPage(), productHref(), catalogDatabase(), getPublicProduct, getRecommendations()

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (5): @supabase/supabase-js@^2.101.1, @supabase/supabase-js, created, db, productId

### Community 61 - "Community 61"
Cohesion: 0.46
Nodes (6): deadline(), DELIVERY_DEADLINE_MS, deliveryDeadline(), RETURN_WINDOW_MS, returnDeadline(), returnRequestAllowed()

### Community 63 - "Community 63"
Cohesion: 0.43
Nodes (5): metadata, RootLayout(), Navbar(), AuthProvider(), CartProvider()

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.2, eslint, eslint-config-next

### Community 66 - "Community 66"
Cohesion: 0.60
Nodes (5): Administrator verified delivery confirmation, Offline seller payments and shipping, Admin Shop orders fulfilment, Three-day return and refund deadline, Read-only vendor sales history

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 68 - "Community 68"
Cohesion: 0.60
Nodes (3): metadata, OrderReceived(), ReceiptConfirmation()

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (3): cartRedis, counterRedis, redis

### Community 72 - "Community 72"
Cohesion: 0.67
Nodes (3): asRole(), consume(), hash

### Community 74 - "Community 74"
Cohesion: 0.83
Nodes (3): product_requests_created_idx, product_requests_product_idx, public.product_requests

### Community 75 - "Community 75"
Cohesion: 0.67
Nodes (3): E-commerce architecture decisions, Naira pricing, Supabase shared project

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (3): Admin notifications, Product shopping flow, Product sizes

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (3): Legacy order account linking, Paginated administration, Stock observers

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (3): Checkout security audit, Session revocation checks, Signed payment webhook

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (3): Content security policy, Security trust boundaries, Server-side authorization

### Community 80 - "Community 80"
Cohesion: 0.67
Nodes (3): Atomic payment stock deduction, Payment reconciliation, Size stock reservations

### Community 82 - "Community 82"
Cohesion: 0.67
Nodes (3): Bachs signed payment webhook, Email confirmation rollout, Supabase environment variables

## Knowledge Gaps
- **46 isolated node(s):** `Elegant Style gold site icon`, `Naira pricing`, `Supabase shared project`, `Admin notifications`, `Product sizes` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 439 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Community 24` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 14`, `Community 15`, `Community 20`, `Community 23`, `Community 26`, `Community 30`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 51`, `Community 53`, `Community 57`, `Community 58`, `Community 62`, `Community 68`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **What connects `Elegant Style gold site icon`, `Naira pricing`, `Supabase shared project` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0676056338028169 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 6` to `Community 0`, `Community 4`, `Community 7`, `Community 8`, `Community 10`, `Community 13`, `Community 14`, `Community 15`, `Community 19`, `Community 20`, `Community 23`, `Community 33`, `Community 36`, `Community 38`, `Community 39`, `Community 43`, `Community 44`, `Community 45`, `Community 53`, `Community 54`, `Community 58`, `Community 62`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06033182503770739 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Community 30` to `Community 0`, `Community 2`, `Community 3`, `Community 5`, `Community 9`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 51`, `Community 54`, `Community 23`, `Community 25`, `Community 26`, `Community 57`, `Community 31`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05689900426742532 - nodes in this community are weakly interconnected._