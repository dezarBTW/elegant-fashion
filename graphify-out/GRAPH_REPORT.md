# Graph Report - ElegantstylesWebsite  (2026-11-10)

## Corpus Check
- 121 files · ~110,809 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1292 nodes · 2877 edges · 146 communities (75 shown, 71 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- orderEmails.mjs
- public.shop_orders
- Public Site Pages
- requireOrderAdmin
- sign-up/page.js
- Catalog Database Structure
- Testing And Media Cleanup
- Security Audit Utilities
- Package Module
- accountServer.js
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
- package.json
- next
- Order Management Test
- OrderRequestError
- pageMetadata
- Size Stock Reservations
- Account Orders Pages
- Account Registration Support
- Admin Customer Requests Api
- Product Card
- Catalog Module
- customer-requests/route.js
- Vendor Status Foundation
- ProductCard.tsx
- remaining-performance.test.mjs
- Bespoke Upload Url Api
- Storage Cleanup
- Seller Order Fulfilment
- Package Module
- Vendor Browser Fixture
- Admin Orders Api
- checkout/page.js
- CheckoutSkeleton.js
- Bespoke Request Pages
- Vendor Settlement
- Admin Media Api
- Dependabot Module
- Package Module
- Google Deactivation Codes
- 20261105161023_vendor_notification_queue.sql
- request/page.js
- security-api.test.mjs
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
- Index Module
- App Auth Pages
- App Checkout Pages
- Course Accepted Students Pages
- Course Registration Pages
- App Forgot Password Pages
- App Reset Password Pages
- App Sign In Pages
- App Sign Up Pages
- Bespoke Request Security
- Security Hardening
- Catalog Pagination Performance
- Media Deletion
- Passport Upload Fix
- Remove Username
- Enforce Delivery Rates
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
- Vendor Marketplace Database
- Apple Icon
- Icon Module
- Customer Order Receipt
- Product Gender
- Consolidate Remaining Rls Policies
- Fix Passport Upload Policy
- Allow Passport Upload Preflight
- Revoke Unused Profile Writes
- Recommendation Test Products
- Stock Test Products
- TikTok social icon with cyan and magenta offset
- WhatsApp social icon
- X social icon
- Tailor sewing fabric
- Elegant Style gold logo
- Fashion model in blue sculptural gown
- Fashion model in blue dress and headwrap
- Fashion model in gold dress and headwrap
- Fashion model in green dress and headwrap
- Fashion model in blue gown social image
- Next.js wordmark
- Vercel triangle mark
- Browser window pictogram
- Elegant Style gold Apple icon
- Elegant Style gold site icon

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

### Community 0 - "orderEmails.mjs"
Cohesion: 0.07
Nodes (46): checkRequestOrigin(), user, application, request, items, POST(), runtime, accountActionSchema (+38 more)

### Community 1 - "public.shop_orders"
Cohesion: 0.06
Nodes (23): public.is_vendor(), public.seller_item_action(), public.seller_save_product(), public.vendor_remove_product(), guard_bespoke_status_transition, order_email_order_idx, public.commit_order_size_stock(), public.order_email_deliveries (+15 more)

### Community 2 - "Public Site Pages"
Cohesion: 0.06
Nodes (19): files, outDir, db, results, snapshot, agent, db, emails (+11 more)

### Community 3 - "requireOrderAdmin"
Cohesion: 0.15
Nodes (24): PATCH(), maxDuration, POST(), GET(), failure(), GET(), json(), POST() (+16 more)

### Community 4 - "sign-up/page.js"
Cohesion: 0.16
Nodes (18): AuthCallback(), ForgotPassword(), ResetPassword(), SignIn(), SignInForm(), SignUp(), SignUpForm(), authReturnPath() (+10 more)

### Community 5 - "Catalog Database Structure"
Cohesion: 0.10
Nodes (12): receiptContext, GET(), runtime, createAuthRequestGate(), BESPOKE_TRANSITIONS, bespokeReviewSchema, status, createReceiptConfirmation() (+4 more)

### Community 6 - "Testing And Media Cleanup"
Cohesion: 0.15
Nodes (9): react, sections, confirmationMethods, AccountRequests(), AdminCustomerRequests(), ProductRequestsAdmin(), Vendors(), SupportRequests() (+1 more)

### Community 7 - "Security Audit Utilities"
Cohesion: 0.10
Nodes (14): partners, pillars, values, Contact(), benefits, CoursesIcon(), Curriculum(), sixMonthModules (+6 more)

### Community 8 - "Package Module"
Cohesion: 0.12
Nodes (13): AccountShell(), AccountLayout(), metadata, Loading(), Account(), AdminLayout(), NAV_ITEMS, metadata (+5 more)

### Community 9 - "accountServer.js"
Cohesion: 0.15
Nodes (19): errorResponse(), GET(), noStore, POST(), runtime, POST(), POST(), GET() (+11 more)

### Community 10 - "Performance Routes Test"
Cohesion: 0.17
Nodes (18): AccountOrders(), repurchase(), money(), money(), OrderStatus(), removePurchasedItems(), CartContext, animateToCart() (+10 more)

### Community 11 - "Order Management"
Cohesion: 0.16
Nodes (20): idx_cart_items_variant, idx_carts_expiry, idx_categories_parent, idx_product_categories_category, idx_variants_product, public.cart_items, public.cart_merge_guest(), public.cart_set_item() (+12 more)

### Community 12 - "Checkout Server"
Cohesion: 0.18
Nodes (6): @electric-sql/pglite, ids, ids, policies, sizes, passportUploadError()

### Community 13 - "App Course Pages"
Cohesion: 0.13
Nodes (15): setup(), brandHighlights, heroSlides, Home(), servicePillars, fade(), HomeRunwayLookbook(), mix() (+7 more)

### Community 14 - "Package Module"
Cohesion: 0.16
Nodes (15): VendorProducts(), BASE_CATEGORIES, ProductsAdmin(), ProductForm(), blank(), sizes, VendorProductManager(), field() (+7 more)

### Community 15 - "Checkout Module"
Cohesion: 0.27
Nodes (10): ProductDetails(), CartContents(), ProductOptions(), ShopProductCard(), useCart(), store, usePurchaseLimits(), imagePath() (+2 more)

### Community 16 - "Order Management"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 17 - "Admin Students Pages"
Cohesion: 0.16
Nodes (13): on_bespoke_requests_updated, public.bespoke_requests, cleanup_student_passport, public.review_student_application(), public.submit_student_application(), bespoke_requests_page_idx, bespoke_requests_status_page_idx, products_similar_category_idx (+5 more)

### Community 18 - "App Sign Up Pages"
Cohesion: 0.21
Nodes (12): commit_paid_size_stock, public.admin_save_stock_product(), public.commit_order_size_stock(), public.get_size_purchase_limits(), public.product_size_stock, public.protect_reserved_product(), public.reserve_order_size_stock(), public.shop_stock_reservations (+4 more)

### Community 19 - "Tsconfig Module"
Cohesion: 0.26
Nodes (14): BESPOKE_STATUSES, formatDate(), formatDateTime(), getProgrammePrice(), getStudentStatus(), toWhatsAppUrl(), badgeClass(), BespokeRequests() (+6 more)

### Community 20 - "Remaining Query Optimizations"
Cohesion: 0.18
Nodes (12): africanCountries, africanStates, Course(), FieldError(), initialFormData, requiredFields, validateField(), getCachedValue() (+4 more)

### Community 21 - "Catalog Pagination Rls Performance"
Cohesion: 0.16
Nodes (12): public.product_view_daily, idx_products_price, idx_products_search, uq_products_slug, protect_pending_product, products_active_category_page_idx, products_active_page_idx, products_admin_page_idx (+4 more)

### Community 22 - "Dependency Audit"
Cohesion: 0.12
Nodes (15): runs-on, steps, jobs, audit, name, on, pull_request, push (+7 more)

### Community 23 - "package.json"
Cohesion: 0.16
Nodes (15): devDependencies, babel-plugin-react-compiler@1.0.0, @electric-sql/pglite@0.5.15, prettier@3.9.9, @supabase/cli@^1.0.0, @types/react@19.3.0, engines, node (+7 more)

### Community 25 - "Order Management Test"
Cohesion: 0.20
Nodes (11): body, setup(), tokenFor(), CHECKOUT_SIGN_IN, bachsBaseUrl(), paymentMatchesOrder(), validCheckoutUrl(), verifyBachsSignature() (+3 more)

### Community 26 - "OrderRequestError"
Cohesion: 0.28
Nodes (10): route(), POST(), runtime, POST(), POST(), runtime, checkRequestOrigin(), optimizeProductImage() (+2 more)

### Community 27 - "pageMetadata"
Cohesion: 0.12
Nodes (6): metadata, metadata, metadata, metadata, metadata, pageMetadata()

### Community 28 - "Size Stock Reservations"
Cohesion: 0.17
Nodes (12): idx_images_product, idx_images_variant, public.product_images, cleanup_bespoke_images, cleanup_category_image, cleanup_product_image, cleanup_product_images_url, public.storage_cleanup_queue (+4 more)

### Community 29 - "Account Orders Pages"
Cohesion: 0.21
Nodes (12): Auth hydration identity race, Delivery confirmation record granularity, Elegant Style state-machine inventory, Unreleased stock holds, Time-driven eligibility state, Administrator payment email retry, Guarded bespoke review transitions, Identity-bound profile hydration (+4 more)

### Community 30 - "Account Registration Support"
Cohesion: 0.30
Nodes (11): zod, GET(), POST(), DELETE(), fail(), GET(), POST(), reply() (+3 more)

### Community 31 - "Admin Customer Requests Api"
Cohesion: 0.13
Nodes (3): checkRequestOrigin(), readAccountBody(), requireOrderAdmin()

### Community 32 - "Product Card"
Cohesion: 0.23
Nodes (9): input, product, requestRoute(), productRequestSchema, availableSizes(), matchesGender(), PRODUCT_GENDERS, PRODUCT_SIZES (+1 more)

### Community 33 - "Catalog Module"
Cohesion: 0.24
Nodes (7): Page(), adminHeaders(), deliveryLabel(), money(), Orders(), OrderItemImage(), VendorSales()

### Community 34 - "customer-requests/route.js"
Cohesion: 0.26
Nodes (12): failure(), GET(), json(), POST(), runtime, failure(), GET(), json() (+4 more)

### Community 35 - "Vendor Status Foundation"
Cohesion: 0.21
Nodes (7): Loading(), ReadyToWear(), Loading(), bone(), ProductDetailSkeleton(), ShopSkeleton(), SHOP_PAGE_SIZE

### Community 36 - "ProductCard.tsx"
Cohesion: 0.20
Nodes (7): ProductCard(), ProductCardProps, Product, ProductGrid(), ProductGridProps, formatNGN(), formatNGNCompact()

### Community 37 - "remaining-performance.test.mjs"
Cohesion: 0.22
Nodes (5): verifyBespokeImages(), hasImageSignature(), JPEG, PNG, startsWith()

### Community 38 - "Bespoke Upload Url Api"
Cohesion: 0.23
Nodes (7): CookieConsent(), CONSENT_EVENT, CONSENT_KEY, getCookieConsent(), OPEN_SETTINGS_EVENT, openCookieSettings(), saveCookieConsent()

### Community 39 - "Storage Cleanup"
Cohesion: 0.28
Nodes (11): AboutIcon(), AdminIcon(), AuthControls(), CollectionIcon(), HomeIcon(), LoginIcon(), LogoutIcon(), NavbarContent() (+3 more)

### Community 40 - "Seller Order Fulfilment"
Cohesion: 0.15
Nodes (6): Category, Product, ProductCategory, ProductImage, ProductVariant, StockState

### Community 41 - "Package Module"
Cohesion: 0.27
Nodes (10): public.account_order_claims, enforce_refund_deadline, public.enforce_refund_deadline(), public.seller_order_events, public.seller_order_items, public.snapshot_order_sellers(), seller_items_seller_idx, snapshot_order_sellers (+2 more)

### Community 42 - "Vendor Browser Fixture"
Cohesion: 0.29
Nodes (10): guard_product_complaint, guard_refund_request, product_complaints_account_idx, public.account_action_limits, public.consume_account_action_limit(), public.guard_customer_request(), public.product_complaints, public.refund_requests (+2 more)

### Community 43 - "Admin Orders Api"
Cohesion: 0.17
Nodes (12): dependencies, @bachs/sdk@1.0.0, bootstrap@^5.3.8, next@16.4.2, react@19.2.4, react-dom@19.2.4, sharp@0.35.5, zod@4.6.7 (+4 more)

### Community 44 - "checkout/page.js"
Cohesion: 0.29
Nodes (10): POST(), reply(), runtime, schema, Checkout(), formatMoney(), deliveryFeeMinor(), previewCheckoutCart() (+2 more)

### Community 45 - "CheckoutSkeleton.js"
Cohesion: 0.27
Nodes (5): bone(), CheckoutSkeleton(), OrderSummarySkeleton(), PaymentStatusSkeleton(), TransferPage()

### Community 46 - "Bespoke Request Pages"
Cohesion: 0.31
Nodes (9): failure(), GET(), json(), PATCH(), querySchema, runtime, FULFILLMENT_STATUSES, ORDER_COLUMNS (+1 more)

### Community 47 - "Vendor Settlement"
Cohesion: 0.25
Nodes (10): fileSchema, getClientIp(), getSupabaseAdmin(), inMemoryRateLimit, isRateLimited(), legacyRequestSchema, MIME_BY_EXTENSION, POST() (+2 more)

### Community 48 - "Admin Media Api"
Cohesion: 0.24
Nodes (7): public.is_active_account(), public.is_active_account_admin(), public.link_legacy_account_orders(), public.is_vendor(), public.vendor_accounts, public.seller_item_action(), public.seller_item_action()

### Community 49 - "Dependabot Module"
Cohesion: 0.22
Nodes (7): public.checkout_rate_limits, public.shop_orders, shop_orders_created_at_idx, shop_orders_account_idx, shop_orders_unclaimed_email_idx, public.validate_shop_order_delivery_rate(), shop_order_delivery_rate

### Community 50 - "Package Module"
Cohesion: 0.24
Nodes (7): product_owners_user_idx, public.product_owners, public.seller_save_product(), public.queue_seller_item_notification(), public.snapshot_order_sellers(), queue_seller_item_notification, public.seller_save_product()

### Community 51 - "Google Deactivation Codes"
Cohesion: 0.33
Nodes (9): escapeHtml(), getClientIp(), getSupabaseAdmin(), getWhatsAppLink(), maxDuration, POST(), runtime, sendNotificationEmail() (+1 more)

### Community 52 - "20261105161023_vendor_notification_queue.sql"
Cohesion: 0.27
Nodes (8): public.queue_vendor_notification(), public.record_vendor_terms(), public.vendor_notifications, public.vendor_terms_acceptances, record_vendor_terms, vendor_invitation_queue, vendor_paid_queue, vendor_notifications_pending_idx

### Community 53 - "request/page.js"
Cohesion: 0.28
Nodes (6): heic2any@^0.0.4, heic2any, ACCEPTED_EXTENSIONS, BespokeRequestPage(), compressImage(), hasAcceptedImageType()

### Community 54 - "security-api.test.mjs"
Cohesion: 0.31
Nodes (3): RegistrationDetails(), PassportPhoto(), passportPath()

### Community 56 - "Package Module"
Cohesion: 0.39
Nodes (3): businessStructuredData, publicPages, SITE_URL

### Community 57 - "Redis Module"
Cohesion: 0.44
Nodes (7): DELETE(), failure(), json(), POST(), runtime, schema, removeQueuedMedia()

### Community 58 - "Next Config"
Cohesion: 0.44
Nodes (7): dynamic, generateMetadata(), ProductPage(), productHref(), catalogDatabase(), getPublicProduct, getRecommendations()

### Community 59 - "Product Skeleton"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 60 - "Product Sizes And Custom Requests"
Cohesion: 0.25
Nodes (5): @supabase/supabase-js@^2.101.1, @supabase/supabase-js, created, db, productId

### Community 61 - "Decision Log"
Cohesion: 0.46
Nodes (6): deadline(), DELIVERY_DEADLINE_MS, deliveryDeadline(), RETURN_WINDOW_MS, returnDeadline(), returnRequestAllowed()

### Community 63 - "Remaining Performance Fixes"
Cohesion: 0.43
Nodes (5): metadata, RootLayout(), Navbar(), AuthProvider(), CartProvider()

### Community 64 - "Security Audit"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.2, eslint, eslint-config-next

### Community 66 - "Size Stock"
Cohesion: 0.60
Nodes (5): Administrator verified delivery confirmation, Offline seller payments and shipping, Admin Shop orders fulfilment, Three-day return and refund deadline, Read-only vendor sales history

### Community 67 - "Jsconfig Module"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 68 - "Readme Module"
Cohesion: 0.60
Nodes (3): metadata, OrderReceived(), ReceiptConfirmation()

### Community 69 - "Index Module"
Cohesion: 0.40
Nodes (3): cartRedis, counterRedis, redis

### Community 72 - "Course Accepted Students Pages"
Cohesion: 0.67
Nodes (3): asRole(), consume(), hash

### Community 74 - "App Forgot Password Pages"
Cohesion: 0.83
Nodes (3): product_requests_created_idx, product_requests_product_idx, public.product_requests

### Community 75 - "App Reset Password Pages"
Cohesion: 0.67
Nodes (3): E-commerce architecture decisions, Naira pricing, Supabase shared project

### Community 76 - "App Sign In Pages"
Cohesion: 0.67
Nodes (3): Admin notifications, Product shopping flow, Product sizes

### Community 77 - "App Sign Up Pages"
Cohesion: 0.67
Nodes (3): Legacy order account linking, Paginated administration, Stock observers

### Community 78 - "Bespoke Request Security"
Cohesion: 0.67
Nodes (3): Checkout security audit, Session revocation checks, Signed payment webhook

### Community 79 - "Security Hardening"
Cohesion: 0.67
Nodes (3): Content security policy, Security trust boundaries, Server-side authorization

### Community 80 - "Catalog Pagination Performance"
Cohesion: 0.67
Nodes (3): Atomic payment stock deduction, Payment reconciliation, Size stock reservations

### Community 82 - "Passport Upload Fix"
Cohesion: 0.67
Nodes (3): Bachs signed payment webhook, Email confirmation rollout, Supabase environment variables

## Knowledge Gaps
- **46 isolated node(s):** `Elegant Style gold site icon`, `Naira pricing`, `Supabase shared project`, `Admin notifications`, `Product sizes` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 439 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `orderEmails.mjs`, `requireOrderAdmin`, `sign-up/page.js`, `Catalog Database Structure`, `Testing And Media Cleanup`, `Security Audit Utilities`, `Package Module`, `accountServer.js`, `Performance Routes Test`, `App Course Pages`, `Package Module`, `Checkout Module`, `Remaining Query Optimizations`, `package.json`, `OrderRequestError`, `Account Registration Support`, `Product Card`, `Catalog Module`, `customer-requests/route.js`, `Vendor Status Foundation`, `ProductCard.tsx`, `Bespoke Upload Url Api`, `Storage Cleanup`, `Admin Orders Api`, `checkout/page.js`, `CheckoutSkeleton.js`, `Bespoke Request Pages`, `Vendor Settlement`, `Google Deactivation Codes`, `request/page.js`, `Redis Module`, `Next Config`, `Product Shopping`, `Readme Module`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **What connects `Elegant Style gold site icon`, `Naira pricing`, `Supabase shared project` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `orderEmails.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.0676056338028169 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Testing And Media Cleanup` to `orderEmails.mjs`, `sign-up/page.js`, `Security Audit Utilities`, `Package Module`, `Performance Routes Test`, `App Course Pages`, `Package Module`, `Checkout Module`, `Tsconfig Module`, `Remaining Query Optimizations`, `package.json`, `Catalog Module`, `ProductCard.tsx`, `Bespoke Upload Url Api`, `Storage Cleanup`, `Admin Orders Api`, `checkout/page.js`, `CheckoutSkeleton.js`, `request/page.js`, `security-api.test.mjs`, `Next Config`, `Product Shopping`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `public.shop_orders` be split into smaller, more focused modules?**
  _Cohesion score 0.06033182503770739 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Account Registration Support` to `orderEmails.mjs`, `Public Site Pages`, `requireOrderAdmin`, `Catalog Database Structure`, `accountServer.js`, `Admin Orders Api`, `checkout/page.js`, `Bespoke Request Pages`, `Vendor Settlement`, `Google Deactivation Codes`, `security-api.test.mjs`, `package.json`, `Order Management Test`, `OrderRequestError`, `Redis Module`, `Admin Customer Requests Api`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Public Site Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05689900426742532 - nodes in this community are weakly interconnected._