# PLAWZA phase prompts

How to use: put `AGENTS.md` in the repo root (copy it to Antigravity's workspace rules location if your version needs that). Paste ONE phase below per fresh task. `git commit` after each phase passes its gate. Planning mode for phases 0, 1, 6. Set terminal commands to "request review".

Order: P0 Recon, P1 Database, P2 Shell, P3 Accommodation, P4 Roommates, P5 Shops, P6 Admin, P7 Differentiators, P8 Hardening and deploy.

---

## Phase 0: Recon (read-only)

```md
PHASE 0, RECON. Do NOT edit or create any files.
Read AGENTS.md first. Inspect C:\Projects\web\plawza and report in under 40 lines:
- package.json (Tailwind major, vite-plugin-pwa, supabase-js, router) or "no project yet"
- folder structure, routes, auth flow, Supabase client, stores/providers
- supabase/migrations and tables, supabase/reference/0001_mvp_core.sql
- PWA config, design tokens, brand assets
- tool versions: node, npm, git (run `node -v`, `npm -v`, `git --version`)
- which gates pass today: typecheck, lint, test, build (real output)
- conflicts you foresee with AGENTS.md
Finish with a recommended order of work. STOP.
```

## Phase 1: Database (no Docker; cloud dev project)

```md
PHASE 1, DATABASE. Read AGENTS.md.

Reference: supabase/reference/0001_mvp_core.sql. It is a DESIGN REFERENCE. Produce ONE migration in supabase/migrations/ (timestamped name via `npx supabase migration new mvp_core`) that reaches the same end state. If a `profiles` table already exists, extend it instead of duplicating.

Non-negotiables to preserve (all marked [PATCH] or described in the file header): roles only in staff_roles; guard triggers (owners cannot approve; edits and image changes on active listings return them to pending); private_contacts with the ownership check; reveal_contact, moderate_content (status-aware), resolve_report, match_roommates RPCs; verifications drive badges; anon column-level SELECT; stock_status on catalogue_items; roommate profiles publicly readable (active only).

No Docker here. Steps:
1. Write the migration, supabase/tests/rls.sql, and docs/SUPABASE_SETUP.md (exact PowerShell commands).
2. Ask ME to run: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`. (DEV project only, never the pilot project.)
3. After I confirm, run `npx supabase db lint --linked` and `npx supabase gen types typescript --linked > src/types/database.ts`.
4. rls.sql must prove, each as a labelled PASS/FAIL row: anon cannot read draft/pending rows; anon cannot read private_contacts; anon cannot select reviewed_by/rejection_reason; a user cannot update another user's listing; a user cannot set status='active' on their own listing; editing an active listing returns it to pending; adding an image to an active listing returns it to pending; a user cannot insert into staff_roles; a user cannot attach a private_contact to someone else's listing; reveal_contact fails signed-out and when contact_shared=false; moderate_content rejects non-staff and own content and wrong-status actions; enquiries visible only to requester and owner.
   Tests simulate users with `set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<uuid>"}', true);` inside transactions that roll back. I run it in the SQL editor and paste the results to you.

Done when: migration applies, types generated, every RLS test shows PASS in output I paste back. STOP.
```

## Phase 2: Shell, auth, PWA, low-data mode

```md
PHASE 2, SHELL. Read AGENTS.md.

Build: Tailwind v4 theme tokens (light+dark) from AGENTS.md colours; layout with bottom nav on mobile (Home, Stays, Roommates, Shops, Account); lazy routes + NotFound; Supabase email+password register/login/logout; ONE auth source of truth with session-loading state; protected routes (/dashboard/*, /admin/*) where /admin also checks staff status via a database query (select from staff_roles for own id); SafetyNotice component; reusable Loading/Empty/ErrorState/OfflineBanner; `src/lib/phone.ts` with tests.

Routes: / /accommodation /accommodation/:id /roommates /shops /shops/:slug /login /register /dashboard /dashboard/accommodation /dashboard/roommates /dashboard/businesses /dashboard/enquiries /admin /admin/reports

phone.ts must export:
```ts
export function toZambianE164(input: string): string | null {
  const raw = input.replace(/\D/g, "").replace(/^00/, "");
  const n = raw.startsWith("260") ? raw
    : raw.startsWith("0") ? `260${raw.slice(1)}`
    : raw.length === 9 ? `260${raw}` : "";
  return /^260[1-9]\d{8}$/.test(n) ? `+${n}` : null;
}
export function whatsAppUrl(phone: string, message: string): string | null {
  const e164 = toZambianE164(phone);
  return e164 ? `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(message)}` : null;
}
```
Tests: 0971234567, 971234567, +260971234567, "260 97 123 4567", 00260971234567, too short, too long, letters, empty, foreign numbers.

Low-data mode: a Zustand store persisted to localStorage. Default ON when `navigator.connection?.saveData` is true. A visible toggle in the header or Account page. When ON: list cards show text only with a "Show photo" tap target; no image prefetch; no web fonts; smaller page size. Provide a `<LazyImage>` that honours it.

PWA: vite-plugin-pwa registerType "prompt" with an "Update available, reload" toast; manifest + icons + theme colour; NetworkOnly for *.supabase.co (auth, rest, rpc); StaleWhileRevalidate with expiry limits for public storage images; offline fallback page. Add public/_redirects containing `/* /index.html 200` for Cloudflare SPA routing.

Env: .env.example already lists VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Reuse those names.

Done when: register/login/logout work against the dev project; protected routes redirect; typecheck/lint/test/build pass; Lighthouse PWA installability result noted. STOP.
```

## Phase 3: Accommodation

```md
PHASE 3, ACCOMMODATION. Read AGENTS.md.

Public: /accommodation list with search (search_tsv, textSearch config 'simple'), filters (town, campus, type, rent range, availability, amenities incl. solar_backup / borehole / prepaid_electricity), sort (newest, rent asc/desc), reset, load-more pagination, filters in URL query params. Explicit column lists for anon (AGENTS rule 13).
Detail page: images, rent/deposit ZMW, area only (never exact address), "availability last confirmed N days ago" (flag as "not recently confirmed" after 30 days), safety notice, "Reviewed by a moderator" badge only from verifications, Report button (incl. reason "unavailable"), Favourite, viewing-request form, "Show contact" via reveal_contact (sign-in required; hidden if owner has not consented).

Owner: /dashboard/accommodation list + create/edit form (validation matching DB constraints; amenity/utility pickers use the DB vocabularies; owner phone saved to private_contacts), image upload with client-side compression to {uid}/{listingId}/{file}, reorder/remove, submit for review, mark available/pending/occupied, "Confirm still available" button (sets last_confirmed_at), archive, show rejection reason. /dashboard/enquiries: list and set new/contacted/closed.
Warn the owner in the form that editing photos or details of an approved listing sends it back to review.

Done when: owner creates and submits a listing; an admin (set manually via SQL) approves it; it appears publicly; a second user sends a viewing request; owner sees it. List the manual steps you ran. STOP.
```

## Phase 4: Roommates

```md
PHASE 4, ROOMMATES. Read AGENTS.md.

/roommates is PUBLIC (active profiles, anon column list: no gender, no owner_id). /dashboard/roommates: create/edit own profile (display name, bio, avatar, campus, areas, budget, move-in, sharing, noise, study, tidiness, guests, gender + gender preference optional, contact_shared toggle with plain-language explanation, active/inactive; phone saved to private_contacts). Warn the user that bio, photo, campus and budget are visible to everyone.
"Best matches" tab (signed-in, requires own active profile) calls match_roommates: show score, "based on N criteria", each reason. Copy must say the score is a guide only. Contact via reveal_contact only when consented. Report button. No AI wording anywhere.

Done when: two test accounts see each other's matches with correct reasons, and neither can read the other's phone unless contact_shared is true. STOP.
```

## Phase 5: Shops

```md
PHASE 5, SHOPS. Read AGENTS.md.

/shops: list active businesses with category, town, search. /shops/:slug: business page with logo/cover, opening hours ("Open now" computed from hours when present), catalogue items with price (optional) and a stock badge: In stock / Low stock / Out of stock (text + icon, not colour alone) and "stock updated N days ago". WhatsApp and call buttons using published business numbers (phone.ts). Owner form states clearly that business phone numbers are public.

/dashboard/businesses: create/edit business (auto slug, uniqueness handled), submit for review, manage catalogue (add, edit, reorder, quick stock-status toggle, image upload with compression). Includes a localStorage single-shop WhatsApp order basket ("prices are as listed; Plawza is not part of the sale"), with no on-platform checkout or payments.

Done when: owner publishes a shop after admin approval; visitor browses, sees stock status, and WhatsApps it. STOP.
```

## Phase 6: Admin and moderation

```md
PHASE 6, ADMIN. Read AGENTS.md.

/admin: queue of pending listings and businesses (oldest first) with approve / reject (reason required) / suspend via moderate_content only. /admin/reports: open reports with reason, link to item, resolve/dismiss via resolve_report. Moderation history per item. Show RPC errors nicely (own content, wrong status). Non-staff get a 403 page. Also let staff add/revoke `phone_checked`, `ownership_checked` verifications ONLY with a note on exactly what was checked (UI wording states what each badge means).

Done when: approval changes public visibility; rejection reason shows to owner; suspension removes the item publicly and revokes the reviewed badge. STOP.
```

## Phase 7: Differentiators (all $0, client-side or existing tables)

```md
PHASE 7, DIFFERENTIATORS. Read AGENTS.md. Build only these, no more:
1. "Still available?" nudge: owner dashboard banner for listings not confirmed in 14 days; public cards show a "Not recently confirmed" text badge after 30 days and sort confirmed-recently first by default.
2. Rent split calculator on listing detail: rent + optional utilities / number of people; clearly marked as an estimate.
3. WhatsApp share for listings, shops and roommates (uses whatsAppUrl-style wa.me/?text=; link only).
4. Landlord reliability on dashboard (private to the owner): median time to first enquiry status change, computed from real enquiries; no public score.
5. Saved filters stored locally (localStorage), no server table.
Done when each works with real data and has unit tests for its calculations. STOP.
```

## Phase 8: Hardening and deploy (Cloudflare Pages)

```md
PHASE 8, HARDENING. Read AGENTS.md and docs/DEPLOY_CLOUDFLARE.md.
Run and fix: typecheck, lint, tests, build. Check layouts at 360, 375, 390, 414 and desktop. Keyboard/screen-reader pass on forms. Throttle to slow 3G and note behaviour. PWA: install, reload, offline fallback, update flow; confirm no Supabase responses in the service-worker cache. Grep the repo for `service_role`, hardcoded keys, `any`, TODO, console.log, fake data.
Write README (env vars, setup, build) and a manual end-to-end test checklist. State plainly what was tested and what was not. STOP.
```
