# Security review — 30 October 2026

## Scope and trust boundaries

The public browser calls Next.js API routes and Supabase Auth, PostgREST, and Storage. Next.js uses a server-only Supabase service key for privileged operations. Bachs sends signed payment webhooks to the server. Resend is called from the server for transactional email. These boundaries are the main attack paths reviewed; this review is not a penetration-test certificate.

## Controls checked or changed

| Topics from the request | Current control and evidence |
| --- | --- |
| 1 SQL injection, 8 mass assignment, 12 input validation | Database access uses Supabase query builders/RPC parameters. API bodies use bounded JSON and explicit schemas/fields; checkout does not accept a client price. |
| 2 XSS, 10 CSP | React escapes rendered values. The site now sends a CSP with limited sources and `object-src 'none'`. Production still allows inline scripts for statically generated Next.js pages, so CSP is defense in depth, not a complete XSS barrier. |
| 3 CSRF, 4 CORS | Sensitive write routes require the exact request origin and a verified bearer session where applicable. CORS is not treated as authorization; API responses do not grant arbitrary cross-origin access. |
| 5 SSRF, 7 path traversal | Server fetches use fixed provider hosts. Upload object names and owner prefixes are validated before storage access. No endpoint accepts an arbitrary server-fetch URL or filesystem path. |
| 6 IDOR, 13 server authorization, 14 RLS, 15 least privilege, 16 RBAC | Customer and admin APIs check the authenticated, live account on the server. All 23 public tables have RLS enabled. Private storage buckets have owner/admin rules. The database migration revokes unused browser-role profile updates/deletes. Service-only tables have no browser policies. |
| 9 clickjacking, 11 headers, 35 TLS expiry, 36 HSTS | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies are sent. Production redirects HTTP to HTTPS and already sends HSTS. TLS is managed by the host and was valid at review time. |
| 17 secrets, 18 `.env` ignore, 19 rotation, 20 secret scanning | Credentials are in deployment environment variables; local `.env*` files are ignored. The service-role and email API keys were removed from preview environments. GitHub's public-repository secret scanning and weekly dependency updates are available, but alert settings and a rotation schedule require account-owner review. No key was rotated because no leak was identified. |
| 21–23 password hashing and salting | Supabase Auth owns password storage and hashing; the application never stores raw passwords. New/reset password forms and local Supabase config now require eight characters. The hosted minimum must be verified separately. |
| 24 JWT expiry, 25 refresh tokens, 28 session fixation | Supabase Auth issues and refreshes tokens. Sensitive APIs verify the user and confirm the session still exists, including after logout. Local config specifies a one-hour JWT and refresh-token rotation; hosted values were not independently verified. |
| 26 OAuth, 27 OpenID Connect | Google sign-in uses Supabase Auth's OAuth provider and callback. Provider configuration and identity verification are managed by Supabase. |
| 29 MFA, 30 brute force, 31 enumeration | App checkout and upload routes have server-side rate limits. Login/signup/reset also rely on Supabase Auth rate limits; browser-only throttling is not a security boundary. Signup, sign-in, and resend messages no longer reveal account existence. Local Supabase MFA is disabled; production MFA and Auth limits require dashboard review. |
| 32 timing attacks, 34 webhooks | Payment signatures are checked by the Bachs SDK; local signature comparison uses constant-time comparison. Invalid signatures are rejected before writes. |
| 33 uploads | Private buckets enforce 5 MB limits and MIME allowlists. On submission, the server checks ownership, exact object name, stored size, downloaded size, and file signature before storing a request. |
| 37 encryption at rest | Supabase and Vercel provide managed storage and secret encryption. The application has no custom encryption layer; provider settings and backups need periodic owner review. |
| 38 dependency flaws, 39 supply chain | Zod was updated to 4.6.7. `npm audit` reported zero known findings. GitHub now runs a lockfile audit on pushes and pull requests, and Dependabot proposes weekly npm updates. Action dependencies are pinned to commit hashes. |
| 40 threat modeling | This document records the browser, API, database, storage, payment-webhook, and third-party trust boundaries and remaining operational checks. |

## Remaining owner checks

1. Verify hosted Supabase Auth settings: minimum password length, JWT lifetime, refresh-token rotation, login rate limits, and MFA. The Supabase security advisor reports leaked-password protection disabled; confirm whether the account plan supports enabling it.
2. Establish and record a rotation schedule for the Supabase service key, Bachs secrets, and Resend key. Rotate immediately if a leak is found and update production environment variables before revoking old keys.
3. Review GitHub secret-scanning alerts and dependency PRs regularly. The new workflow detects known package advisories but does not by itself block Vercel's Git deployment.
4. Revisit nonce-based CSP if the site moves away from fully static pages. The current inline-script allowance limits how much CSP can contain an injected script.
