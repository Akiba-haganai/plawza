# PLAWZA project rules (always apply)

Product: PLAWZA, a mobile-first PWA for Zambia: student accommodation, roommate finding, local shop catalogues, with light landlord/shop management. Pilot: one campus area (Copperbelt University / Kitwe). Currency ZMW. Phones are +260 numbers.

Hard constraint: **$0 budget.** Free tiers only (Supabase Free, Cloudflare Pages). No paid services, no new paid dependencies. Document free-tier limits honestly.

Stack: React + TypeScript (strict, no `any`), Vite, Tailwind CSS v4 via @tailwindcss/vite (no v3 config, no @apply), Supabase (Auth email+password, Postgres, Storage), React Router, Zustand (only if needed), Sonner, lucide-react, vite-plugin-pwa.

Environment: Windows, PowerShell. Docker is NOT installed. Use a throwaway CLOUD Supabase dev project. `supabase db reset` and `supabase start` are unavailable; use `supabase db push --linked`, `supabase gen types --linked`, and the SQL editor. The agent never holds the DB password, access token or service-role key; the user runs login/link/push commands when asked.

## Process rules
1. Inspect before editing. Reuse existing clients, providers, routes, styles. One Supabase client, one auth listener, one service worker.
2. Work only on the phase I give you (docs/PHASES.md). When its done-when list passes, STOP and report. Do not start the next phase.
3. Keep plans under 15 lines. Then implement.
4. Small diffs. No refactors, new dependencies or renames unless the phase needs them. Ask before adding a dependency.
5. After each phase run: typecheck, lint, tests, build. Report real output. If something cannot be run, say so; never claim you tested something you did not.
6. Cloud dashboards change often. In docs, describe settings by NAME and give CLI commands, never "click the button in the top-right".

## Data and security rules
7. No fake listings, users, counts, testimonials or badges. Empty database = honest empty state.
8. Never put secrets or the service-role key in frontend code or git. Public URL + anon/publishable key only.
9. Authorisation lives in RLS and database functions, not in React route guards alone. Never trust a role from the browser.
10. Private phone numbers are fetched only through the `reveal_contact` RPC. Exact addresses are never shown publicly.
11. A "verified" or "reviewed" badge renders only from a non-revoked row in `verifications`. Wording must say exactly what was checked.
12. Validate on client AND database. Zambian numbers are stored as +260XXXXXXXXX.
13. Anonymous reads of `accommodation_listings`, `businesses`, `roommate_profiles` must use explicit column lists (anon has column-level SELECT only). Never `select('*')` there for anon.

## UX rules
14. Design for 360px wide, low-cost Android, slow data. Touch targets >= 44px. Lazy-load images, paginate, compress uploads before sending (max ~1280px, JPEG/WebP, target <= 300 KB; hard cap 2 MB).
15. Every state exists: loading, empty, error, offline, validation.
16. Never cache Supabase API/auth responses in the service worker. Cache only the app shell and static assets. Updates must not leave users stuck on an old version.
17. Colours: blue primary (#1D4ED8), deep navy (#0B1F3A), orange action (#C2410C) used sparingly, green (#15803D) for success. Never show status by colour alone. White text only on the darker orange.
18. Low-data mode must exist (see Phase 2): text-first, no images until tapped, respects `navigator.connection.saveData`.
