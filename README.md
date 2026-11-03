# PLAWZA

Mobile-first PWA for Zambia: student accommodation, roommate finding and local shop catalogues. Works for any Zambian town or campus: towns, campuses and shop categories are data in the database, not code. Currency ZMW, phones are `+260` numbers.

**Budget: $0.** Supabase Free + Cloudflare Pages Free. No paid services.

## Stack
React 19, TypeScript (strict), Vite, Tailwind CSS v4 (`@tailwindcss/vite`), React Router, Supabase (Auth email+password, Postgres + RLS, Storage), Zustand, Sonner, lucide-react, vite-plugin-pwa.

## Environment variables
Copy `.env.example` to `.env` and fill in:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key |

Only these two are read by the app. Never add the service-role key or DB password to the frontend or git. `.env` is git-ignored.

## Setup (PowerShell)
Use a **dev** Supabase project, never the pilot one. Docker is not required or used.

```powershell
npm install
Copy-Item .env.example .env      # then edit .env
```

Database setup (login, link, push, lint, generate types) is in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Migrations live in `supabase/migrations/` (`20261030000000_mvp_core.sql` through `20261103000000_bugfixes_and_public_profile_rpc.sql`). Make a staff user by inserting a row into `staff_roles` with the SQL editor (roles are never set from the browser).

## Scripts
```powershell
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm test             # vitest (phone + differentiator calculations)
npm run build        # tsc && vite build -> dist/
npm run preview      # serve dist/ locally (use this to test the PWA)
```
`npm run lint` does not exist yet: ESLint is not installed (see "Known gaps").

> On Windows PowerShell with a restricted execution policy, use `npm.cmd` / `npx.cmd`.

## Deploy
See [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md) (Wrangler CLI). SPA routing relies on `wrangler.jsonc` (`not_found_handling: "single-page-application"`), and `worker/index.ts` intercepts `/accommodation/:id` and `/shops/:slug` on the edge to inject dynamic OpenGraph and Twitter preview tags for WhatsApp link previews.

## Security model (short)
- Authorisation is enforced by Postgres RLS and security-definer RPCs, not by route guards. `/admin` additionally checks `staff_roles` for the signed-in user.
- Private phone numbers live in `private_contacts` and are returned only by the `reveal_contact` RPC.
- Anonymous reads of `accommodation_listings`, `businesses`, `roommate_profiles` use explicit column lists (anon has column-level SELECT only). Public member profiles (`/u/:id`) and "Listed By" cards use the `get_public_member_profile` and `get_host_summary` security-definer RPCs, which never expose phone numbers.
- "Reviewed / phone checked / ownership checked" badges render only from non-revoked `verifications` rows.
- The service worker never caches Supabase `auth`/`rest`/`rpc` traffic (`NetworkOnly`). It does cache **public Storage images** (30 days, stale-while-revalidate): see "Known gaps".

## Free-tier limits (honest)
- Supabase Free pauses after ~7 days of inactivity and has small DB/storage/egress quotas; `.github/workflows/supabase-keepalive.yml` pings the REST API every 3 days to keep the project active, and images are compressed client-side (~1280px, WebP, <=300 KB) to stay inside storage quotas.
- Cloudflare Workers & Pages Free: 100,000 Worker requests/day; commercial use allowed.

## Testing
Manual end-to-end checklist and an honest record of what was and was not tested: [docs/TEST_CHECKLIST.md](docs/TEST_CHECKLIST.md).

## Known gaps
- No linter configured (needs an approved dev dependency: ESLint + typescript-eslint).
- Public Storage images stay in the service-worker cache for up to 30 days, so a photo of a suspended listing can remain visible on a device that already loaded it (the listing itself disappears because data is never cached).
- RLS tests (`supabase/tests/rls.sql`) run in the Supabase SQL editor, not in CI.
