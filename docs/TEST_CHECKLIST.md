# PLAWZA manual end-to-end checklist

Use a DEV Supabase project and `npm run build; npm run preview` (the service worker only exists in a production build). Test on a real low-cost Android phone if possible, plus Chrome DevTools device mode.

Tick each box only after you personally did it.

## 0. Accounts
- [ ] Register user A (owner), user B (requester), user C (stranger) with email+password.
- [ ] In the SQL editor, add one `staff_roles` row (`role = 'admin'`) for a fourth account, S.
- [ ] Log out / in works; refresh keeps the session; wrong password shows an error.

## 1. Route protection
- [ ] Signed out: `/dashboard/*` redirects to `/login`; `/admin` redirects to `/login`.
- [ ] User A opens `/admin`: sees the 403 page. S opens `/admin`: sees the queue.
- [ ] Unknown URL shows Not Found; deep link refresh (e.g. `/shops/x`) works on the deployed site.

## 2. Accommodation
- [ ] A creates a listing with photos; uploaded files are compressed (check size in Storage <= ~300 KB).
- [ ] Listing is NOT visible to a signed-out browser while draft/pending.
- [ ] A submits for review; S approves in `/admin`; it appears publicly and shows "Reviewed by a moderator".
- [ ] A edits the approved listing or adds a photo: it returns to pending and disappears publicly.
- [ ] S rejects with a reason: A sees the reason. S suspends: it vanishes publicly and the badge is revoked.
- [ ] Filters (town, campus, type, rent, amenities, availability), sort, reset, load more, URL params survive reload.
- [ ] Detail page shows area only (never an exact address), deposit, "last confirmed N days ago".
- [ ] B sends a viewing request; A sees it in `/dashboard/enquiries` and sets contacted/closed.
- [ ] "Show contact" requires sign-in; C cannot read A's phone from the network tab except via the reveal.
- [ ] Report button works, including reason "unavailable".

## 3. Roommates
- [ ] Two accounts create profiles; `/roommates` lists active ones without gender or owner id.
- [ ] "Best matches" shows score, "based on N criteria", reasons, and the "guide only" wording.
- [ ] Contact is revealed only when `contact_shared` is on.

## 4. Shops
- [ ] Owner creates a business (slug auto-generated; duplicate name handled), adds items, toggles stock status, uploads images.
- [ ] After approval: visitor sees In stock / Low stock / Out of stock as text+icon, "stock updated N days ago", "Open now" when hours exist.
- [ ] WhatsApp and Call buttons open correct `+260` numbers.

## 5. Admin
- [ ] Queue is oldest-first; approve / reject (reason required) / suspend only through the UI.
- [ ] Own content cannot be approved (error shown nicely).
- [ ] `/admin/reports`: resolve / dismiss; history visible.
- [ ] Granting `phone_checked` / `ownership_checked` requires a note; revoke works; badge appears/disappears publicly.

## 6. Phase 7 features
- [ ] Listing unconfirmed 14+ days: owner banner. 30+ days: public "Not recently confirmed" badge. Default sort puts recently confirmed first.
- [ ] Rent split estimate changes with people/utilities and is labelled an estimate.
- [ ] Share buttons open `wa.me/?text=` with title and link (listing, shop, roommate).
- [ ] Owner dashboard shows median response time only after at least one enquiry changed status; nothing public.
- [ ] Save filter, reload page, apply it; clear it. Nothing stored server-side.

## 7. Layout (360, 375, 390, 414, desktop)
- [ ] No horizontal scroll on any route; bottom nav usable; nothing hidden behind it.
- [ ] Touch targets feel >= 44px; dark mode readable.

## 8. Keyboard and screen reader
- [ ] Tab through login, register, listing form, filters: visible focus ring, logical order.
- [ ] Every field is announced with a name (TalkBack / NVDA).
- [ ] Modals: note that focus trap / Escape are NOT implemented yet.

## 9. Slow network
- [ ] DevTools "Slow 3G": pages show loading states, images lazy-load, Low-data mode hides images until tapped; `saveData` default honoured.

## 10. PWA (production build via preview or deployed)
- [ ] Install prompt / "Add to Home screen" works; app opens standalone with the right icon.
- [ ] Reload works. Go offline: app shell loads, OfflineBanner shows, data screens show an error state, not a blank page.
- [ ] Deploy a new build: the "update available" prompt appears and Reload applies it.
- [ ] DevTools > Application > Cache Storage: no `/auth/`, `/rest/`, `/rpc/` responses. (Only precache, and `supabase-storage-images` public photos are expected.)

## 11. Database
- [ ] Run `supabase/tests/rls.sql` in the SQL editor: every row PASS.
