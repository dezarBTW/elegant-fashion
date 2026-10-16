This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
"# nesta" 
"# nesthub" 

## Supabase environment variables

The browser client may use only the public Supabase URL and anon key:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Keep the service-role key server-side only. It must not use the `NEXT_PUBLIC_`
prefix, be imported by client components, or be committed to the repository:

```text
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

The bespoke request form also needs Resend configured with a verified sender
domain. The recipient is kept server-side:

```text
RESEND_API_KEY=your-resend-api-key
BESPOKE_NOTIFY_EMAIL=your-notification-email@example.com
RESEND_FROM_EMAIL=Elegant Style <requests@your-verified-domain.com>
```

Apply `supabase/migrations/20250101_bespoke_requests.sql` and then
`supabase/migrations/20261008_bespoke_request_security.sql` to create the
requests table, private image bucket, and server-side rate limiter.

## Email confirmation and password recovery rollout

Deploy the authentication pages before enabling confirmation in the hosted
Supabase project. Email links always return to `https://elegantstyle.com.ng`.

1. Under Authentication → URL Configuration, set Site URL to
   `https://elegantstyle.com.ng` and allow these exact Redirect URLs:
   - `https://elegantstyle.com.ng/auth/callback`
   - `https://elegantstyle.com.ng/reset-password`
2. Keep the confirmation and recovery email templates linked to
   `{{ .ConfirmationURL }}` so Supabase verifies the token before redirecting.
   Configure a working SMTP sender for production delivery.
3. After deployment, under Authentication → Sign In / Providers → Email,
   enable **Confirm email**. This is the server-side setting that blocks
   unconfirmed email/password sign-ins; deploying the UI alone does not enable it.
4. Test with a fresh email: signup shows “Check your email”; sign-in before
   confirmation is rejected and offers resend; the email link returns to the
   production site and completes sign-in. Also test Forgot password, mismatched
   passwords, a successful reset, and expired/used links. Confirm the old password
   fails and the new password works.

Run `node --test scripts/auth-links.test.mjs` for redirect and link-error checks.
See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
and [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Google Search setup

Deploy the SEO changes before submitting URLs to Google. Verify that these return
HTTP 200 on the public domain:

- https://elegantstyle.com.ng/robots.txt
- https://elegantstyle.com.ng/sitemap.xml

1. Open https://search.google.com/search-console and sign in with the Google
   account that should own the site's search reporting.
2. Add a **Domain** property for `elegantstyle.com.ng`. Google supplies a TXT
   record; add that exact record at the domain's DNS provider, then verify it.
   Alternatively, add the URL-prefix property `https://elegantstyle.com.ng/`,
   choose HTML tag verification, set `GOOGLE_SITE_VERIFICATION` in the deployment
   environment to the tag's `content` value, redeploy, and click Verify.
3. In **Sitemaps**, submit `https://elegantstyle.com.ng/sitemap.xml`.
4. In **URL inspection**, inspect `https://elegantstyle.com.ng/`, run **Test live
   URL**, and choose **Request indexing**. Repeat for `/ready-to-wear`, `/course`
   and `/contact` if needed.
5. Check indexing and search performance in Search Console. Google controls
   indexing and ranking; submission does not guarantee either or a deadline.

For local discovery, create or update the business's Google Business Profile
with the website, phone, and address shown on the Contact page. Use the same
business name and website on its official social profiles.

## Ready-to-wear checkout with Bachs

The shop cart is saved in browser storage. Checkout supports guests, free shop
pickup, free delivery within Yenagoa, and ₦2,000 delivery outside Yenagoa in
Nigeria. The delivery charge is included in the payment amount. Product prices
and active status are checked on the server; browser-supplied prices are ignored.
The current shop sells product-level items; variant selection and inventory
reservation are not part of this checkout.

Database migration: `supabase/migrations/20261016070952_bachs_checkout_orders.sql`.
It creates private `shop_orders`, a server-only rate limiter, and administrator
policies. It has already been executed against the linked hosted project with
`supabase db query --linked --file ...`; do not execute it a second time.
Existing products, registrations, and customer accounts were not changed.

### Bachs account setup

1. Create your account at https://bachs.io and obtain a **sandbox** secret API key
   from its Developer Portal. Enable NGN payment methods for your account.
2. In Vercel project environment variables, set `BACHS_API_KEY` to that sandbox
   key. Keep it server-only: never use a `NEXT_PUBLIC_` prefix or commit secrets.
3. Register this Bachs webhook destination:
   `https://elegantstyle.com.ng/api/bachs/webhook`.
   Subscribe to `collection.succeeded`. Copy the endpoint signing secret into
   Vercel as `BACHS_WEBHOOK_SECRET`, then redeploy.
4. Complete a sandbox checkout and verify the order appears as **paid** under
   `/admin/orders`. Confirm its exact amount and NGN currency; test cancellation,
   payment delay and an unsuccessful payment too. Test pickup and both delivery
   options. A sample webhook without a real charge ID does not mark an order paid.
5. After sandbox verification and Bachs account activation, replace the API key
   and webhook secret with the matching **live** values, configure the live
   webhook destination and redeploy. Confirm the first live payment manually in
   both Bachs and the admin orders page before fulfilling it.

Bachs success redirects use the public `elegantstyle.com.ng` domain even for
sandbox payments, as Bachs refuses localhost/private callback URLs. Sandbox
end-to-end testing therefore needs a deployed build on this domain configured
with sandbox credentials. An API key prefix selects the matching API environment.

Only a signed `collection.succeeded` event with status `SUCCEEDED`, the exact
expected amount, and currency `NGN` marks an order paid. Overpayments,
underpayments and other mismatches are held for manual review. Browser redirects
and `checkout.completed` events never mark an order paid. Repeated event delivery
is safe: the order transition is conditional, and event/charge IDs are unique.
The status page is restricted to the browser that placed the order by an
HttpOnly receipt cookie. Administrators can read orders and update fulfilment
status only after payment. Payment credentials never enter this application's UI.

If Bachs session creation has an uncertain result, the application holds the
order for reconciliation rather than automatically creating another session.
Use the order reference to check Bachs before retrying. Refunds and disputes
remain managed through the Bachs dashboard; contact the customer before making
manual changes to a payment under review.

Run `node --test scripts/checkout.test.mjs` for money, delivery, pricing and
webhook signature tests. Provider docs:
https://docs.bachs.io/guides/checkout/checkout-sessions and
https://docs.bachs.io/guides/webhooks/overview.
