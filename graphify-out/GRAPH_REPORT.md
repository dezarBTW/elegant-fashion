# Graph Report - ElegantstylesWebsite  (2026-11-05)

## Corpus Check
- 283 files · ~101,467 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 44 file(s) not represented in the graph (top: .css 37, (none) 2, .example 1)

## Summary
- 1156 nodes · 2727 edges · 112 communities (64 shown, 48 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Transactional Email Services
- Shopping And Product Pages
- Public Site Pages
- Checkout And Authentication
- Navigation And Consent
- Catalog Database Structure
- Testing And Media Cleanup
- Security Audit Utilities
- Package Module
- Auth Context
- Performance Routes Test
- Order Management
- Checkout Server
- App Course Pages
- Package Module
- Checkout Module
- Order Management
- Admin Students Pages
- App Sign Up Pages
- Tsconfig Module
- Remaining Query Optimizations
- Catalog Pagination Rls Performance
- Dependency Audit
- Account Deactivation Test
- Api Checkout Api
- Order Management Test
- Support Requests
- Product Flow Test
- Size Stock Reservations
- Account Orders Pages
- Account Registration Support
- Admin Customer Requests Api
- Product Card
- Catalog Module
- Bachs Checkout Orders
- Vendor Status Foundation
- Security Api Test
- Seller Orders
- Bespoke Upload Url Api
- Storage Cleanup
- Seller Order Fulfilment
- Package Module
- Vendor Browser Fixture
- Admin Orders Api
- Bespoke Submit Api
- Seller Workflow Hardening
- Bespoke Request Pages
- Vendor Settlement
- Admin Media Api
- Dependabot Module
- Package Module
- Google Deactivation Codes
- Remaining Performance Test
- Vendor Product Ownership
- Account Seller Orders Api
- Security Audit Hardening
- Package Module
- Redis Module
- Next Config
- Product Skeleton
- Product Sizes And Custom Requests
- Decision Log
- Product Shopping
- Remaining Performance Fixes
- Security Audit
- Security Review
- Size Stock
- Jsconfig Module
- Readme Module
- App Auth Pages
- App Checkout Pages
- Course Accepted Students Pages
- Course Registration Pages
- App Forgot Password Pages
- App Reset Password Pages
- App Sign In Pages
- App Sign Up Pages
- Bespoke Request Security
- Catalog Pagination Performance
- Media Deletion
- Passport Upload Fix
- Readme Module
- Agents Module
- License Module
- Readme Module
- Bespoke Cubyw Jn
- Elegant Style Logo
- Image Module
- Image Module
- Image Module
- Image Module
- Og Hero
- Apple Icon
- Icon Module

## God Nodes (most connected - your core abstractions)
1. `next` - 66 edges
2. `OrderRequestError` - 59 edges
3. `react` - 48 edges
4. `authenticatedFetch()` - 42 edges
5. `checkoutDatabase()` - 35 edges
6. `readAccountBody()` - 33 edges
7. `requireActiveAccount()` - 28 edges
8. `supabase` - 28 edges
9. `useAuth()` - 25 edges
10. `requireOrderAdmin()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `checkRequestOrigin()` --calls--> `OrderRequestError`  [EXTRACTED]
  scripts/account-deactivation.test.mjs → src/lib/orderManagement.mjs
- `route()` --indirect_call--> `sendsReceiptLink()`  [INFERRED]
  scripts/order-management.test.mjs → src/lib/orderEmails.mjs
- `checkRequestOrigin()` --calls--> `OrderRequestError`  [EXTRACTED]
  scripts/performance-routes.test.mjs → src/lib/orderManagement.mjs
- `readAccountBody()` --calls--> `OrderRequestError`  [EXTRACTED]
  scripts/performance-routes.test.mjs → src/lib/orderManagement.mjs
- `requireOrderAdmin()` --calls--> `OrderRequestError`  [EXTRACTED]
  scripts/performance-routes.test.mjs → src/lib/orderManagement.mjs

## Import Cycles
- 2-file cycle: `src/components/CartContents.js -> src/contexts/CartContext.js -> src/components/CartContents.js`

## Communities (112 total, 48 thin omitted)

### Community 0 - "Transactional Email Services"
Cohesion: 0.05
Nodes (50): application, request, requestRoute(), metadata, maxDuration, POST(), runtime, maxDuration (+42 more)

### Community 1 - "Shopping And Product Pages"
Cohesion: 0.07
Nodes (41): bone(), CheckoutSkeleton(), OrderSummarySkeleton(), PaymentStatusSkeleton(), Loading(), ReadyToWear(), Loading(), dynamic (+33 more)

### Community 2 - "Public Site Pages"
Cohesion: 0.08
Nodes (25): setup(), About(), partners, pillars, values, Contact(), benefits, CoursesIcon() (+17 more)

### Community 3 - "Checkout And Authentication"
Cohesion: 0.11
Nodes (11): next, AuthCallback(), Checkout(), formatMoney(), ResetPassword(), store, authReturnPath(), CONFIRMATION_REDIRECT (+3 more)

### Community 4 - "Navigation And Consent"
Cohesion: 0.11
Nodes (22): metadata, RootLayout(), CookieConsent(), AboutIcon(), AdminIcon(), AuthControls(), CollectionIcon(), HomeIcon() (+14 more)

### Community 5 - "Catalog Database Structure"
Cohesion: 0.13
Nodes (24): idx_cart_items_variant, idx_carts_expiry, idx_categories_parent, idx_images_product, idx_images_variant, idx_product_categories_category, idx_variants_product, public.cart_items (+16 more)

### Community 6 - "Testing And Media Cleanup"
Cohesion: 0.12
Nodes (8): asRole(), consume(), hash, ids, ids, policies, db, sizes

### Community 7 - "Security Audit Utilities"
Cohesion: 0.08
Nodes (14): db, results, snapshot, agent, db, emails, from(), identities (+6 more)

### Community 8 - "Package Module"
Cohesion: 0.14
Nodes (21): react, Account(), changePassword(), deactivate(), requestDeactivationCode(), VendorProducts(), decide(), load() (+13 more)

### Community 9 - "Auth Context"
Cohesion: 0.12
Nodes (17): AccountShell(), sections, AccountLayout(), metadata, AdminLayout(), NAV_ITEMS, metadata, adminHeaders() (+9 more)

### Community 10 - "Performance Routes Test"
Cohesion: 0.11
Nodes (11): checkRequestOrigin(), readAccountBody(), requireOrderAdmin(), POST(), runtime, POST(), verifyBespokeImages(), hasImageSignature() (+3 more)

### Community 11 - "Order Management"
Cohesion: 0.20
Nodes (19): errorResponse(), GET(), noStore, POST(), runtime, POST(), GET(), runtime (+11 more)

### Community 12 - "Checkout Server"
Cohesion: 0.23
Nodes (18): GET(), failure(), GET(), json(), POST(), count, POST(), schema (+10 more)

### Community 13 - "App Course Pages"
Cohesion: 0.17
Nodes (17): BASE_CATEGORIES, ProductsAdmin(), africanCountries, africanStates, Course(), FieldError(), initialFormData, requiredFields (+9 more)

### Community 14 - "Package Module"
Cohesion: 0.13
Nodes (19): eslintConfig, devDependencies, babel-plugin-react-compiler@1.0.0, eslint@^9, eslint-config-next@16.4.2, prettier@3.9.9, @supabase/cli@^1.0.0, @types/react@19.3.0 (+11 more)

### Community 15 - "Checkout Module"
Cohesion: 0.26
Nodes (15): CartContext, paymentMatchesOrder(), verifyBachsSignature(), animateToCart(), addCartItem(), CART_CHANGED, CART_KEY, cartLineKey() (+7 more)

### Community 16 - "Order Management"
Cohesion: 0.23
Nodes (13): zod, GET(), reply(), schema, DELETE(), fail(), GET(), POST() (+5 more)

### Community 17 - "Admin Students Pages"
Cohesion: 0.27
Nodes (14): BESPOKE_STATUSES, formatDate(), formatDateTime(), getProgrammePrice(), getStudentStatus(), toWhatsAppUrl(), badgeClass(), BespokeRequests() (+6 more)

### Community 18 - "App Sign Up Pages"
Cohesion: 0.27
Nodes (11): ForgotPassword(), SignIn(), SignInForm(), SignUp(), SignUpForm(), withAuthReturn(), DOMAIN_CORRECTIONS, suggestEmailAddress() (+3 more)

### Community 19 - "Tsconfig Module"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "Remaining Query Optimizations"
Cohesion: 0.16
Nodes (13): on_bespoke_requests_updated, public.bespoke_requests, public.storage_path_in_use(), public.review_student_application(), public.submit_student_application(), bespoke_requests_page_idx, bespoke_requests_status_page_idx, products_similar_category_idx (+5 more)

### Community 21 - "Catalog Pagination Rls Performance"
Cohesion: 0.16
Nodes (12): public.product_view_daily, idx_products_price, idx_products_search, uq_products_slug, protect_pending_product, products_active_category_page_idx, products_active_page_idx, products_admin_page_idx (+4 more)

### Community 22 - "Dependency Audit"
Cohesion: 0.12
Nodes (15): runs-on, steps, jobs, audit, name, on, pull_request, push (+7 more)

### Community 23 - "Account Deactivation Test"
Cohesion: 0.20
Nodes (10): checkRequestOrigin(), user, POST(), runtime, accountActionSchema, DEACTIVATION_CODE_MINUTES, deactivationEmail(), hashDeactivationCode() (+2 more)

### Community 24 - "Api Checkout Api"
Cohesion: 0.23
Nodes (12): GET(), runtime, POST(), runtime, schema, bachsBaseUrl(), validCheckoutUrl(), bachsClient() (+4 more)

### Community 25 - "Order Management Test"
Cohesion: 0.17
Nodes (8): receiptContext, route(), bodySchema, json(), POST(), runtime, createReceiptConfirmation(), receiptHash()

### Community 26 - "Support Requests"
Cohesion: 0.17
Nodes (8): AccountRequests(), AdminCustomerRequests(), metadata, OrderReceived(), ReceiptConfirmation(), SupportRequests(), update(), REQUEST_STATUSES

### Community 27 - "Product Flow Test"
Cohesion: 0.20
Nodes (10): body, setup(), tokenFor(), input, product, matchesGender(), PRODUCT_GENDERS, PRODUCT_SIZES (+2 more)

### Community 28 - "Size Stock Reservations"
Cohesion: 0.26
Nodes (10): public.admin_save_stock_product(), public.commit_order_size_stock(), public.get_size_purchase_limits(), public.product_size_stock, public.protect_reserved_product(), public.reserve_order_size_stock(), public.shop_stock_reservations, shop_stock_reservations_held_idx (+2 more)

### Community 29 - "Account Orders Pages"
Cohesion: 0.29
Nodes (12): AccountOrders(), repurchase(), submitRequest(), money(), money(), OrderStatus(), removePurchasedItems(), CartProvider() (+4 more)

### Community 30 - "Account Registration Support"
Cohesion: 0.24
Nodes (11): guard_product_complaint, guard_refund_request, product_complaints_account_idx, public.account_action_limits, public.consume_account_action_limit(), public.guard_customer_request(), public.product_complaints, public.refund_requests (+3 more)

### Community 31 - "Admin Customer Requests Api"
Cohesion: 0.26
Nodes (11): runtime, failure(), GET(), json(), PATCH(), runtime, REQUEST_TABLES, REQUEST_TYPES (+3 more)

### Community 32 - "Product Card"
Cohesion: 0.20
Nodes (7): ProductCard(), ProductCardProps, Product, ProductGrid(), ProductGridProps, formatNGN(), formatNGNCompact()

### Community 33 - "Catalog Module"
Cohesion: 0.15
Nodes (6): Category, Product, ProductCategory, ProductImage, ProductVariant, StockState

### Community 34 - "Bachs Checkout Orders"
Cohesion: 0.18
Nodes (9): public.checkout_rate_limits, public.shop_orders, shop_orders_created_at_idx, shop_orders_account_idx, shop_orders_unclaimed_email_idx, commit_paid_size_stock, reserve_checkout_size_stock, public.validate_shop_order_delivery_rate() (+1 more)

### Community 35 - "Vendor Status Foundation"
Cohesion: 0.24
Nodes (9): public.is_vendor(), public.vendor_accounts, public.queue_vendor_notification(), public.record_vendor_terms(), public.vendor_notifications, record_vendor_terms, vendor_invitation_queue, vendor_paid_queue (+1 more)

### Community 36 - "Security Api Test"
Cohesion: 0.27
Nodes (3): RegistrationDetails(), PassportPhoto(), passportPath()

### Community 37 - "Seller Orders"
Cohesion: 0.33
Nodes (7): Page(), Page(), Page(), actions(), SellerOrders(), action(), load()

### Community 38 - "Bespoke Upload Url Api"
Cohesion: 0.25
Nodes (10): fileSchema, getClientIp(), getSupabaseAdmin(), inMemoryRateLimit, isRateLimited(), legacyRequestSchema, MIME_BY_EXTENSION, POST() (+2 more)

### Community 39 - "Storage Cleanup"
Cohesion: 0.27
Nodes (8): cleanup_bespoke_images, cleanup_category_image, cleanup_product_image, cleanup_product_images_url, cleanup_student_passport, public.storage_cleanup_queue, public.trg_cleanup_bespoke_images(), public.trg_cleanup_single_image()

### Community 40 - "Seller Order Fulfilment"
Cohesion: 0.33
Nodes (9): enforce_refund_deadline, public.enforce_refund_deadline(), public.seller_order_events, public.seller_order_items, public.snapshot_order_sellers(), seller_items_seller_idx, snapshot_order_sellers, aggregate_seller_order_progress (+1 more)

### Community 41 - "Package Module"
Cohesion: 0.20
Nodes (10): dependencies, @bachs/sdk@1.0.0, bootstrap@^5.3.8, next@16.4.2, react@19.2.4, react-dom@19.2.4, zod@4.6.7, @bachs/sdk (+2 more)

### Community 42 - "Vendor Browser Fixture"
Cohesion: 0.22
Nodes (5): files, outDir, db, manifestPath, statePath

### Community 43 - "Admin Orders Api"
Cohesion: 0.33
Nodes (9): failure(), GET(), json(), PATCH(), querySchema, runtime, updateSchema, sendsReceiptLink() (+1 more)

### Community 44 - "Bespoke Submit Api"
Cohesion: 0.33
Nodes (9): escapeHtml(), getClientIp(), getSupabaseAdmin(), getWhatsAppLink(), maxDuration, POST(), runtime, sendNotificationEmail() (+1 more)

### Community 45 - "Seller Workflow Hardening"
Cohesion: 0.24
Nodes (7): public.is_active_account(), public.is_active_account_admin(), public.link_legacy_account_orders(), public.queue_seller_item_notification(), public.seller_item_action(), public.snapshot_order_sellers(), queue_seller_item_notification

### Community 46 - "Bespoke Request Pages"
Cohesion: 0.28
Nodes (6): heic2any@^0.0.4, heic2any, ACCEPTED_EXTENSIONS, BespokeRequestPage(), compressImage(), hasAcceptedImageType()

### Community 47 - "Vendor Settlement"
Cohesion: 0.44
Nodes (7): deadline(), DELIVERY_DEADLINE_MS, deliveryDeadline(), RETURN_WINDOW_MS, returnDeadline(), returnRequestAllowed(), vendorPaymentEligible()

### Community 48 - "Admin Media Api"
Cohesion: 0.44
Nodes (7): DELETE(), failure(), json(), POST(), runtime, schema, removeQueuedMedia()

### Community 49 - "Dependabot Module"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 50 - "Package Module"
Cohesion: 0.25
Nodes (5): @supabase/supabase-js@^2.101.1, @supabase/supabase-js, created, db, productId

### Community 51 - "Google Deactivation Codes"
Cohesion: 0.29
Nodes (4): public.account_order_claims, public.account_deactivation_codes, public.consume_account_deactivation_code(), public.vendor_terms_acceptances

### Community 53 - "Vendor Product Ownership"
Cohesion: 0.38
Nodes (4): product_owners_user_idx, public.product_owners, public.seller_save_product(), public.seller_save_product()

### Community 54 - "Account Seller Orders Api"
Cohesion: 0.67
Nodes (5): failure(), GET(), json(), POST(), schema

### Community 56 - "Package Module"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 57 - "Redis Module"
Cohesion: 0.40
Nodes (3): cartRedis, counterRedis, redis

### Community 60 - "Product Sizes And Custom Requests"
Cohesion: 0.83
Nodes (3): product_requests_created_idx, product_requests_product_idx, public.product_requests

### Community 61 - "Decision Log"
Cohesion: 0.67
Nodes (3): E-commerce architecture decisions, Naira pricing, Supabase shared project

### Community 62 - "Product Shopping"
Cohesion: 0.67
Nodes (3): Admin notifications, Product shopping flow, Product sizes

### Community 63 - "Remaining Performance Fixes"
Cohesion: 0.67
Nodes (3): Legacy order account linking, Paginated administration, Stock observers

### Community 64 - "Security Audit"
Cohesion: 0.67
Nodes (3): Checkout security audit, Session revocation checks, Signed payment webhook

### Community 65 - "Security Review"
Cohesion: 0.67
Nodes (3): Content security policy, Security trust boundaries, Server-side authorization

### Community 66 - "Size Stock"
Cohesion: 0.67
Nodes (3): Atomic payment stock deduction, Payment reconciliation, Size stock reservations

### Community 68 - "Readme Module"
Cohesion: 0.67
Nodes (3): Bachs signed payment webhook, Email confirmation rollout, Supabase environment variables

## Knowledge Gaps
- **34 isolated node(s):** `Next.js local documentation requirement`, `Bachs signed payment webhook`, `Email confirmation rollout`, `Supabase shared project`, `Naira pricing` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 381 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Checkout And Authentication` to `Transactional Email Services`, `Shopping And Product Pages`, `Public Site Pages`, `Navigation And Consent`, `Auth Context`, `Performance Routes Test`, `Order Management`, `Checkout Server`, `App Course Pages`, `Package Module`, `Order Management`, `App Sign Up Pages`, `Account Deactivation Test`, `Api Checkout Api`, `Order Management Test`, `Support Requests`, `Account Orders Pages`, `Admin Customer Requests Api`, `Product Card`, `Security Api Test`, `Bespoke Upload Url Api`, `Package Module`, `Admin Orders Api`, `Bespoke Submit Api`, `Bespoke Request Pages`, `Admin Media Api`, `Account Seller Orders Api`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **What connects `Next.js local documentation requirement`, `Bachs signed payment webhook`, `Email confirmation rollout` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Transactional Email Services` be split into smaller, more focused modules?**
  _Cohesion score 0.05421686746987952 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Package Module` to `Product Card`, `Shopping And Product Pages`, `Public Site Pages`, `Checkout And Authentication`, `Security Api Test`, `Navigation And Consent`, `Seller Orders`, `Package Module`, `Auth Context`, `App Course Pages`, `Package Module`, `Bespoke Request Pages`, `Checkout Module`, `Admin Students Pages`, `App Sign Up Pages`, `Support Requests`, `Account Orders Pages`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `Shopping And Product Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06564364876385337 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Order Management` to `Transactional Email Services`, `Security Api Test`, `Bespoke Upload Url Api`, `Security Audit Utilities`, `Package Module`, `Performance Routes Test`, `Admin Orders Api`, `Checkout Server`, `Bespoke Submit Api`, `Package Module`, `Admin Media Api`, `Account Seller Orders Api`, `Api Checkout Api`, `Order Management Test`, `Product Flow Test`, `Admin Customer Requests Api`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `Public Site Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07560975609756097 - nodes in this community are weakly interconnected._

## Coverage and integrity notes

Ten SVG images were not semantically inspected. Semantic token accounting from the host agent is incomplete; tracked token values are not total session usage. This graph includes local fixture code and is written to the untracked graphify-out/ directory.

Graph health warnings: 69 dangling-endpoint edges; 1 self-loop edges; 87 same-endpoint edges collapse in the undirected graph. Use the JSON with these extraction limits in mind.
