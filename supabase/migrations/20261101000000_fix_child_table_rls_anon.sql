-- =====================================================================
-- Migration: 20261101000000_fix_child_table_rls_anon.sql
-- Fix RLS policies for anon role:
-- When owner_id was revoked from anon on accommodation_listings and
-- businesses, RLS policies on child tables (accommodation_images,
-- catalogue_items) and parent tables that evaluated owner_id in their
-- policy expressions caused PostgreSQL 42501 "permission denied for table
-- accommodation_listings/businesses" errors for anonymous visitors.
--
-- Solution: Split SELECT policies into anon (evaluates status = 'active'
-- only, never referencing owner_id) and authenticated (evaluates status,
-- ownership, and staff override).
-- =====================================================================

-- 1. Accommodation listings --------------------------------------------
drop policy if exists listings_select on public.accommodation_listings;
drop policy if exists listings_select_anon on public.accommodation_listings;
drop policy if exists listings_select_auth on public.accommodation_listings;

create policy listings_select_anon on public.accommodation_listings
  for select to anon
  using (status = 'active');

create policy listings_select_auth on public.accommodation_listings
  for select to authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or public.is_staff());

-- 2. Accommodation images ----------------------------------------------
drop policy if exists images_select on public.accommodation_images;
drop policy if exists images_select_anon on public.accommodation_images;
drop policy if exists images_select_auth on public.accommodation_images;

create policy images_select_anon on public.accommodation_images
  for select to anon
  using (exists (
    select 1 from public.accommodation_listings l
    where l.id = listing_id and l.status = 'active'
  ));

create policy images_select_auth on public.accommodation_images
  for select to authenticated
  using (exists (
    select 1 from public.accommodation_listings l
    where l.id = listing_id
      and (l.status = 'active' or l.owner_id = (select auth.uid()) or public.is_staff())
  ));

-- 3. Businesses --------------------------------------------------------
drop policy if exists biz_select on public.businesses;
drop policy if exists biz_select_anon on public.businesses;
drop policy if exists biz_select_auth on public.businesses;

create policy biz_select_anon on public.businesses
  for select to anon
  using (status = 'active');

create policy biz_select_auth on public.businesses
  for select to authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or public.is_staff());

-- 4. Catalogue items ---------------------------------------------------
drop policy if exists catalogue_select on public.catalogue_items;
drop policy if exists catalogue_select_anon on public.catalogue_items;
drop policy if exists catalogue_select_auth on public.catalogue_items;

create policy catalogue_select_anon on public.catalogue_items
  for select to anon
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.status = 'active'
  ));

create policy catalogue_select_auth on public.catalogue_items
  for select to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id
      and (b.status = 'active' or b.owner_id = (select auth.uid()) or public.is_staff())
  ));

-- 5. Roommate profiles -------------------------------------------------
drop policy if exists roommates_select on public.roommate_profiles;
drop policy if exists roommates_select_anon on public.roommate_profiles;
drop policy if exists roommates_select_auth on public.roommate_profiles;

create policy roommates_select_anon on public.roommate_profiles
  for select to anon
  using (status = 'active');

create policy roommates_select_auth on public.roommate_profiles
  for select to authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or public.is_staff());
