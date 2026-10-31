-- =====================================================================
-- Migration: 20261030000000_mvp_core.sql
-- PLAWZA MVP core schema: accommodation, roommates, shops, moderation
-- =====================================================================

-- ---------- 1. Enums ------------------------------------------------
create type public.app_role        as enum ('moderator', 'admin');
create type public.content_status  as enum ('draft','pending','active','rejected','archived','suspended');
create type public.availability    as enum ('available','pending','occupied');
create type public.enquiry_status  as enum ('new','contacted','closed');
create type public.report_status   as enum ('open','reviewing','resolved','dismissed');

-- ---------- 2. Generic helpers -------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- 3. Reference data --------------------------------------
create table public.towns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null check (province in (
    'Central','Copperbelt','Eastern','Luapula','Lusaka',
    'Muchinga','Northern','North-Western','Southern','Western')),
  unique (name, province)
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text,
  town_id uuid not null references public.towns(id) on delete restrict
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0
);

-- ---------- 4. Profiles and staff roles ----------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 100),
  phone text check (phone is null or phone ~ '^\+260[0-9]{9}$'),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = (select auth.uid()) and role in ('moderator','admin'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(new.raw_user_meta_data ->> 'full_name', 100), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill existing users if any
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- 5. Accommodation ---------------------------------------
create table public.accommodation_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 8 and 100),
  description text not null check (char_length(description) between 20 and 3000),
  listing_type text not null check (listing_type in
    ('room','shared_room','bedsitter','flat','house','hostel')),
  rent_zmw numeric(10,2) not null check (rent_zmw >= 0),
  deposit_zmw numeric(10,2) check (deposit_zmw is null or deposit_zmw >= 0),
  town_id uuid not null references public.towns(id),
  area text not null check (char_length(area) between 2 and 80),
  campus_id uuid references public.campuses(id) on delete set null,
  distance_note text check (distance_note is null or char_length(distance_note) <= 120),
  bedrooms smallint check (bedrooms is null or bedrooms between 0 and 20),
  bathrooms smallint check (bathrooms is null or bathrooms between 0 and 20),
  furnished boolean not null default false,
  utilities_included text[] not null default '{}'
    check (cardinality(utilities_included) <= 10
           and utilities_included <@ array['water','electricity','wifi','security','refuse']::text[]),
  amenities text[] not null default '{}'
    check (cardinality(amenities) <= 30
           and amenities <@ array[
             'wifi','water_tank','borehole','prepaid_electricity','solar_backup','generator',
             'security_guard','walled_fenced','parking','kitchen','private_bathroom',
             'shared_bathroom','tiled_floor','study_area','near_transport','laundry_area']::text[]),
  available_from date,
  availability public.availability not null default 'available',
  contact_shared boolean not null default false,
  status public.content_status not null default 'draft',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    to_tsvector('simple',
      coalesce(title,'') || ' ' || coalesce(area,'') || ' ' || coalesce(description,''))
  ) stored
);

create index idx_listings_public on public.accommodation_listings (town_id, rent_zmw)
  where status = 'active';
create index idx_listings_campus on public.accommodation_listings (campus_id)
  where status = 'active';
create index idx_listings_owner on public.accommodation_listings (owner_id);
create index idx_listings_status on public.accommodation_listings (status, created_at desc);
create index idx_listings_amenities on public.accommodation_listings using gin (amenities);
create index idx_listings_search on public.accommodation_listings using gin (search_tsv);

create table public.accommodation_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.accommodation_listings(id) on delete cascade,
  storage_path text not null,
  alt_text text check (alt_text is null or char_length(alt_text) <= 150),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index idx_images_listing on public.accommodation_images (listing_id, sort_order);

create table public.private_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.accommodation_listings(id) on delete cascade,
  roommate_id uuid,
  phone text not null check (phone ~ '^\+260[0-9]{9}$'),
  whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^\+260[0-9]{9}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(listing_id, roommate_id) = 1)
);
create unique index uq_contact_listing on public.private_contacts (listing_id) where listing_id is not null;
create unique index uq_contact_roommate on public.private_contacts (roommate_id) where roommate_id is not null;

-- ---------- 6. Roommates -------------------------------------------
create table public.roommate_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_path text,
  gender text check (gender in ('female','male','prefer_not_to_say')),
  gender_pref text not null default 'any' check (gender_pref in ('any','same')),
  campus_id uuid references public.campuses(id) on delete set null,
  preferred_areas text[] not null default '{}' check (cardinality(preferred_areas) <= 10),
  budget_min_zmw numeric(10,2) check (budget_min_zmw is null or budget_min_zmw >= 0),
  budget_max_zmw numeric(10,2) check (budget_max_zmw is null or budget_max_zmw >= 0),
  move_in_date date,
  room_sharing text check (room_sharing in ('own_room','share_room','either')),
  noise_level text check (noise_level in ('quiet','moderate','lively')),
  study_routine text check (study_routine in ('early','night','flexible')),
  tidiness text check (tidiness in ('relaxed','average','very_tidy')),
  guests text check (guests in ('rarely','sometimes','often')),
  contact_shared boolean not null default false,
  status public.content_status not null default 'active',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min_zmw is null or budget_max_zmw is null or budget_max_zmw >= budget_min_zmw)
);
create index idx_roommates_active on public.roommate_profiles (campus_id) where status = 'active';

alter table public.private_contacts
  add constraint fk_contact_roommate
  foreign key (roommate_id) references public.roommate_profiles(id) on delete cascade;

-- ---------- 7. Businesses and catalogues ---------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  description text check (description is null or char_length(description) <= 1500),
  category_id uuid references public.categories(id) on delete set null,
  town_id uuid not null references public.towns(id),
  area text not null check (char_length(area) between 2 and 80),
  opening_hours jsonb check (opening_hours is null or jsonb_typeof(opening_hours) = 'object'),
  phone text check (phone is null or phone ~ '^\+260[0-9]{9}$'),
  whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^\+260[0-9]{9}$'),
  logo_path text,
  cover_path text,
  status public.content_status not null default 'draft',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(area,'') || ' ' || coalesce(description,''))
  ) stored
);
create index idx_biz_public on public.businesses (town_id, category_id) where status = 'active';
create index idx_biz_owner on public.businesses (owner_id);
create index idx_biz_search on public.businesses using gin (search_tsv);

create table public.catalogue_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text check (description is null or char_length(description) <= 800),
  item_category text check (item_category is null or char_length(item_category) <= 50),
  price_zmw numeric(10,2) check (price_zmw is null or price_zmw >= 0),
  image_path text,
  stock_status text not null default 'in_stock'
    check (stock_status in ('in_stock','low_stock','out_of_stock')),
  stock_updated_at timestamptz not null default now(),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_catalogue_business on public.catalogue_items (business_id, sort_order);

create or replace function public.touch_stock_updated()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.stock_status is distinct from old.stock_status then
    new.stock_updated_at := now();
  end if;
  return new;
end $$;
create trigger trg_catalogue_stock before update on public.catalogue_items
  for each row execute function public.touch_stock_updated();

-- ---------- 8. Enquiries, favourites, reports ----------------------
create table public.accommodation_enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.accommodation_listings(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null check (char_length(requester_name) between 2 and 80),
  requester_phone text check (requester_phone is null or requester_phone ~ '^\+260[0-9]{9}$'),
  message text check (message is null or char_length(message) <= 600),
  preferred_viewing_at timestamptz,
  status public.enquiry_status not null default 'new',
  owner_note text check (owner_note is null or char_length(owner_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_enq_owner on public.accommodation_enquiries (owner_id, status, created_at desc);
create index idx_enq_requester on public.accommodation_enquiries (requester_id);
create unique index uq_enq_open on public.accommodation_enquiries (listing_id, requester_id)
  where status <> 'closed';

create table public.favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.accommodation_listings(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(listing_id, business_id) = 1)
);
create unique index uq_fav_listing on public.favourites (user_id, listing_id) where listing_id is not null;
create unique index uq_fav_business on public.favourites (user_id, business_id) where business_id is not null;

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.accommodation_listings(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  roommate_id uuid references public.roommate_profiles(id) on delete cascade,
  reason text not null check (reason in
    ('scam','misleading','unavailable','inappropriate','wrong_info','other')),
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(listing_id, business_id, roommate_id) = 1)
);
create index idx_reports_status on public.listing_reports (status, created_at desc);

-- ---------- 9. Moderation and honest verification ------------------
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  entity_kind text not null check (entity_kind in ('listing','business','roommate','report')),
  entity_id uuid not null,
  action text not null check (action in
    ('approve','reject','suspend','reinstate','resolve_report','dismiss_report')),
  reason text,
  created_at timestamptz not null default now()
);
create index idx_modactions_entity on public.moderation_actions (entity_kind, entity_id);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.accommodation_listings(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  check_type text not null check (check_type in
    ('moderator_reviewed','phone_checked','ownership_checked','identity_checked')),
  checked_by uuid not null references public.profiles(id) on delete restrict,
  checked_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (num_nonnulls(profile_id, listing_id, business_id) = 1)
);
create unique index uq_verif_listing  on public.verifications (listing_id, check_type)  where listing_id is not null and revoked_at is null;
create unique index uq_verif_business on public.verifications (business_id, check_type) where business_id is not null and revoked_at is null;
create unique index uq_verif_profile  on public.verifications (profile_id, check_type)  where profile_id is not null and revoked_at is null;

create table public.contact_reveals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_kind text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now()
);
create index idx_reveals_user on public.contact_reveals (user_id, created_at desc);

-- ---------- 10. updated_at triggers --------------------------------
create trigger trg_listings_updated   before update on public.accommodation_listings for each row execute function public.set_updated_at();
create trigger trg_roommates_updated  before update on public.roommate_profiles      for each row execute function public.set_updated_at();
create trigger trg_biz_updated        before update on public.businesses             for each row execute function public.set_updated_at();
create trigger trg_catalogue_updated  before update on public.catalogue_items        for each row execute function public.set_updated_at();
create trigger trg_enq_updated        before update on public.accommodation_enquiries for each row execute function public.set_updated_at();
create trigger trg_contacts_updated   before update on public.private_contacts       for each row execute function public.set_updated_at();

-- ---------- 11. Guards: owners cannot approve themselves -----------
create or replace function public.guard_content_update()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_premod boolean := coalesce(tg_argv[0], 'pre') = 'pre';
  v_ignore text[] := array['updated_at','availability','last_confirmed_at','contact_shared','search_tsv'];
begin
  if auth.uid() is null then
    return new;
  end if;

  new.owner_id := old.owner_id;

  if public.is_staff() and old.owner_id <> auth.uid() then
    if new.status is distinct from old.status then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'suspended' then
      raise exception 'This content is suspended. Contact a moderator.' using errcode = '42501';
    end if;
    if v_premod and new.status not in ('draft','pending','archived') then
      raise exception 'Owners cannot set status to %', new.status using errcode = '42501';
    end if;
    if not v_premod and new.status not in ('draft','active','archived') then
      raise exception 'Owners cannot set status to %', new.status using errcode = '42501';
    end if;
    if not v_premod and new.status = 'active' and old.status = 'rejected' then
      raise exception 'Rejected content must be reviewed by a moderator' using errcode = '42501';
    end if;
  end if;

  new.rejection_reason := old.rejection_reason;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;

  if v_premod and old.status = 'active' and new.status = 'active'
     and (to_jsonb(new) - v_ignore) is distinct from (to_jsonb(old) - v_ignore) then
    new.status := 'pending';
  end if;
  return new;
end $$;

create trigger trg_listings_guard  before update on public.accommodation_listings
  for each row execute function public.guard_content_update('pre');
create trigger trg_biz_guard       before update on public.businesses
  for each row execute function public.guard_content_update('pre');
create trigger trg_roommates_guard before update on public.roommate_profiles
  for each row execute function public.guard_content_update('post');

create or replace function public.guard_content_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;
  new.rejection_reason := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end $$;
create trigger trg_listings_guard_ins  before insert on public.accommodation_listings
  for each row execute function public.guard_content_insert();
create trigger trg_biz_guard_ins       before insert on public.businesses
  for each row execute function public.guard_content_insert();
create trigger trg_roommates_guard_ins before insert on public.roommate_profiles
  for each row execute function public.guard_content_insert();

create or replace function public.clamp_last_confirmed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and new.last_confirmed_at is distinct from old.last_confirmed_at then
    new.last_confirmed_at := now();
  end if;
  return new;
end $$;
create trigger trg_listings_confirm before update on public.accommodation_listings
  for each row execute function public.clamp_last_confirmed();

create or replace function public.images_trigger_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_listing uuid := coalesce(new.listing_id, old.listing_id);
begin
  if auth.uid() is null or public.is_staff() then
    return null;
  end if;
  update public.accommodation_listings
     set status = 'pending'
   where id = v_listing and status = 'active' and owner_id = auth.uid();
  return null;
end $$;
create trigger trg_images_review
  after insert or delete or update of storage_path on public.accommodation_images
  for each row execute function public.images_trigger_review();

-- ---------- 12. Anti-spam limits -----------------------------------
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_max integer := tg_argv[0]::integer;
  v_hours integer := tg_argv[1]::integer;
  v_col text := tg_argv[2];
  v_count integer;
begin
  if auth.uid() is null or public.is_staff() then return new; end if;
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - make_interval(hours => $2)',
    tg_table_schema, tg_table_name, v_col)
    into v_count using (to_jsonb(new) ->> v_col)::uuid, v_hours;
  if v_count >= v_max then
    raise exception 'Limit reached. Please try again later.' using errcode = '54000';
  end if;
  return new;
end $$;

create trigger trg_listings_limit before insert on public.accommodation_listings
  for each row execute function public.enforce_rate_limit(10, 24, 'owner_id');
create trigger trg_biz_limit before insert on public.businesses
  for each row execute function public.enforce_rate_limit(5, 24, 'owner_id');
create trigger trg_enq_limit before insert on public.accommodation_enquiries
  for each row execute function public.enforce_rate_limit(10, 24, 'requester_id');
create trigger trg_reports_limit before insert on public.listing_reports
  for each row execute function public.enforce_rate_limit(10, 24, 'reporter_id');

create or replace function public.limit_images_per_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.accommodation_images where listing_id = new.listing_id) >= 10 then
    raise exception 'A listing can have at most 10 images' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger trg_images_limit before insert on public.accommodation_images
  for each row execute function public.limit_images_per_listing();

create or replace function public.prepare_enquiry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_status public.content_status;
begin
  select owner_id, status into v_owner, v_status
  from public.accommodation_listings where id = new.listing_id;
  if v_owner is null or v_status <> 'active' then
    raise exception 'This listing is not accepting enquiries' using errcode = 'P0002';
  end if;
  if v_owner = new.requester_id then
    raise exception 'You cannot send an enquiry to your own listing' using errcode = '42501';
  end if;
  new.owner_id := v_owner;
  new.status := 'new';
  return new;
end $$;
create trigger trg_enq_prepare before insert on public.accommodation_enquiries
  for each row execute function public.prepare_enquiry();

-- ---------- 13. Row Level Security ---------------------------------
alter table public.towns                  enable row level security;
alter table public.campuses               enable row level security;
alter table public.categories             enable row level security;
alter table public.profiles               enable row level security;
alter table public.staff_roles            enable row level security;
alter table public.accommodation_listings enable row level security;
alter table public.accommodation_images   enable row level security;
alter table public.private_contacts       enable row level security;
alter table public.roommate_profiles      enable row level security;
alter table public.businesses             enable row level security;
alter table public.catalogue_items        enable row level security;
alter table public.accommodation_enquiries enable row level security;
alter table public.favourites             enable row level security;
alter table public.listing_reports        enable row level security;
alter table public.moderation_actions     enable row level security;
alter table public.verifications          enable row level security;
alter table public.contact_reveals        enable row level security;

revoke insert, update, delete on all tables in schema public from anon;
alter default privileges in schema public revoke insert, update, delete on tables from anon;

revoke select on public.accommodation_listings from anon;
grant select (id, owner_id, title, description, listing_type, rent_zmw, deposit_zmw, town_id, area,
              campus_id, distance_note, bedrooms, bathrooms, furnished, utilities_included, amenities,
              available_from, availability, contact_shared, status, last_confirmed_at,
              created_at, updated_at, search_tsv)
  on public.accommodation_listings to anon;

revoke select on public.businesses from anon;
grant select (id, owner_id, name, slug, description, category_id, town_id, area, opening_hours,
              phone, whatsapp_phone, logo_path, cover_path, status, created_at, updated_at, search_tsv)
  on public.businesses to anon;

revoke select on public.roommate_profiles from anon;
grant select (id, display_name, bio, avatar_path, campus_id, preferred_areas, budget_min_zmw,
              budget_max_zmw, move_in_date, room_sharing, noise_level, study_routine, tidiness,
              guests, contact_shared, status, created_at, updated_at)
  on public.roommate_profiles to anon;

create policy ref_towns_read      on public.towns      for select to anon, authenticated using (true);
create policy ref_campuses_read   on public.campuses   for select to anon, authenticated using (true);
create policy ref_categories_read on public.categories for select to anon, authenticated using (true);
create policy ref_towns_admin     on public.towns      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ref_campuses_admin  on public.campuses   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ref_categories_admin on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy staff_roles_self on public.staff_roles for select to authenticated
  using (user_id = (select auth.uid()));

create policy listings_select on public.accommodation_listings for select to anon, authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or public.is_staff());
create policy listings_insert on public.accommodation_listings for insert to authenticated
  with check (owner_id = (select auth.uid()) and status in ('draft','pending'));
create policy listings_update on public.accommodation_listings for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff())
  with check (owner_id = (select auth.uid()) or public.is_staff());
create policy listings_delete on public.accommodation_listings for delete to authenticated
  using (owner_id = (select auth.uid()) and status in ('draft','rejected','archived'));

create policy images_select on public.accommodation_images for select to anon, authenticated
  using (exists (select 1 from public.accommodation_listings l
                 where l.id = listing_id
                   and (l.status = 'active' or l.owner_id = (select auth.uid()) or public.is_staff())));
create policy images_write on public.accommodation_images for all to authenticated
  using (exists (select 1 from public.accommodation_listings l
                 where l.id = listing_id and (l.owner_id = (select auth.uid()) or public.is_staff())))
  with check (exists (select 1 from public.accommodation_listings l
                 where l.id = listing_id and (l.owner_id = (select auth.uid()) or public.is_staff())));

create policy contacts_owner on public.private_contacts for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (
      (listing_id is not null and exists (
         select 1 from public.accommodation_listings l
         where l.id = listing_id and l.owner_id = (select auth.uid())))
      or
      (roommate_id is not null and exists (
         select 1 from public.roommate_profiles r
         where r.id = roommate_id and r.owner_id = (select auth.uid())))
    ));

create policy roommates_select on public.roommate_profiles for select to anon, authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or public.is_staff());
create policy roommates_insert on public.roommate_profiles for insert to authenticated
  with check (owner_id = (select auth.uid()) and status in ('draft','active'));
create policy roommates_update on public.roommate_profiles for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff())
  with check (owner_id = (select auth.uid()) or public.is_staff());
create policy roommates_delete on public.roommate_profiles for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy biz_select on public.businesses for select to anon, authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or public.is_staff());
create policy biz_insert on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()) and status in ('draft','pending'));
create policy biz_update on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff())
  with check (owner_id = (select auth.uid()) or public.is_staff());
create policy biz_delete on public.businesses for delete to authenticated
  using (owner_id = (select auth.uid()) and status in ('draft','rejected','archived'));

create policy catalogue_select on public.catalogue_items for select to anon, authenticated
  using (exists (select 1 from public.businesses b
                 where b.id = business_id
                   and (b.status = 'active' or b.owner_id = (select auth.uid()) or public.is_staff())));
create policy catalogue_write on public.catalogue_items for all to authenticated
  using (exists (select 1 from public.businesses b
                 where b.id = business_id and (b.owner_id = (select auth.uid()) or public.is_staff())))
  with check (exists (select 1 from public.businesses b
                 where b.id = business_id and (b.owner_id = (select auth.uid()) or public.is_staff())));

create policy enq_insert on public.accommodation_enquiries for insert to authenticated
  with check (requester_id = (select auth.uid()));
create policy enq_select on public.accommodation_enquiries for select to authenticated
  using (requester_id = (select auth.uid()) or owner_id = (select auth.uid()) or public.is_staff());
create policy enq_update on public.accommodation_enquiries for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke update on public.accommodation_enquiries from authenticated;
grant update (status, owner_note) on public.accommodation_enquiries to authenticated;

create policy fav_own on public.favourites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy reports_insert on public.listing_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_select on public.listing_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_staff());

create policy modactions_select on public.moderation_actions for select to authenticated
  using (public.is_staff());

create policy verif_select on public.verifications for select to anon, authenticated
  using (revoked_at is null or public.is_staff());
create policy verif_staff_write on public.verifications for all to authenticated
  using (public.is_staff()) with check (public.is_staff() and checked_by = (select auth.uid()));

-- ---------- 14. RPC functions --------------------------------------
create or replace function public.reveal_contact(p_kind text, p_id uuid)
returns table (phone text, whatsapp_phone text)
language plpgsql security definer set search_path = '' as $$
declare v_phone text; v_wa text; v_recent integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view contact details' using errcode = '28000';
  end if;
  select count(*) into v_recent from public.contact_reveals
   where user_id = auth.uid() and created_at > now() - interval '1 hour';
  if v_recent >= 40 then
    raise exception 'Too many contact requests. Try again later.' using errcode = '54000';
  end if;

  if p_kind = 'listing' then
    select pc.phone, pc.whatsapp_phone into v_phone, v_wa
    from public.private_contacts pc
    join public.accommodation_listings l on l.id = pc.listing_id
    where l.id = p_id and l.status = 'active' and l.contact_shared;
  elsif p_kind = 'roommate' then
    select pc.phone, pc.whatsapp_phone into v_phone, v_wa
    from public.private_contacts pc
    join public.roommate_profiles r on r.id = pc.roommate_id
    where r.id = p_id and r.status = 'active' and r.contact_shared;
  else
    raise exception 'Unknown contact type' using errcode = '22023';
  end if;

  if v_phone is null then
    raise exception 'Contact details are not available' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.contact_reveals
    where user_id = auth.uid() and entity_kind = p_kind and entity_id = p_id
      and created_at > now() - interval '1 day') then
    insert into public.contact_reveals (user_id, entity_kind, entity_id) values (auth.uid(), p_kind, p_id);
  end if;
  return query select v_phone, v_wa;
end $$;

create or replace function public.moderate_content(
  p_kind text, p_id uuid, p_action text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_table text;
  v_owner uuid;
  v_old text;
  v_new public.content_status;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_action in ('reject','suspend') and (v_reason is null or char_length(v_reason) < 5) then
    raise exception 'A reason of at least 5 characters is required' using errcode = '22023';
  end if;

  v_table := case p_kind
    when 'listing'  then 'accommodation_listings'
    when 'business' then 'businesses'
    when 'roommate' then 'roommate_profiles' end;
  v_new := (case p_action
    when 'approve'   then 'active'
    when 'reinstate' then 'active'
    when 'reject'    then 'rejected'
    when 'suspend'   then 'suspended' end)::public.content_status;
  if v_table is null or v_new is null then
    raise exception 'Invalid moderation request' using errcode = '22023';
  end if;

  execute format('select owner_id, status::text from public.%I where id = $1', v_table)
    into v_owner, v_old using p_id;
  if v_owner is null then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;
  if v_owner = auth.uid() then
    raise exception 'You cannot moderate your own content' using errcode = '42501';
  end if;
  if (p_action = 'approve'   and v_old <> 'pending')
  or (p_action = 'reject'    and v_old <> 'pending')
  or (p_action = 'suspend'   and v_old not in ('active','pending'))
  or (p_action = 'reinstate' and v_old <> 'suspended') then
    raise exception 'Cannot % content that is currently %', p_action, v_old using errcode = '22023';
  end if;

  execute format(
    'update public.%I set status = $1, rejection_reason = $2, reviewed_by = auth.uid(), reviewed_at = now() where id = $3',
    v_table)
    using v_new, case when p_action in ('reject','suspend') then v_reason else null end, p_id;

  insert into public.moderation_actions (actor_id, entity_kind, entity_id, action, reason)
  values (auth.uid(), p_kind, p_id, p_action, v_reason);

  if p_kind in ('listing','business') then
    if v_new = 'active' then
      if p_kind = 'listing' then
        insert into public.verifications (listing_id, check_type, checked_by)
        values (p_id, 'moderator_reviewed', auth.uid()) on conflict do nothing;
      else
        insert into public.verifications (business_id, check_type, checked_by)
        values (p_id, 'moderator_reviewed', auth.uid()) on conflict do nothing;
      end if;
    else
      update public.verifications set revoked_at = now()
       where check_type = 'moderator_reviewed' and revoked_at is null
         and ((p_kind = 'listing' and listing_id = p_id) or (p_kind = 'business' and business_id = p_id));
    end if;
  end if;
end $$;

create or replace function public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_status not in ('reviewing','resolved','dismissed') then
    raise exception 'Invalid report status' using errcode = '22023';
  end if;
  update public.listing_reports
     set status = p_status, handled_by = auth.uid(), handled_at = now(),
         resolution_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_report_id;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  insert into public.moderation_actions (actor_id, entity_kind, entity_id, action, reason)
  values (auth.uid(), 'report', p_report_id,
          case when p_status = 'dismissed' then 'dismiss_report' else 'resolve_report' end,
          nullif(trim(coalesce(p_note, '')), ''));
end $$;

create or replace function public.match_roommates(p_limit integer default 50)
returns table (
  profile_id uuid, display_name text, avatar_path text, bio text,
  campus_id uuid, budget_min_zmw numeric, budget_max_zmw numeric,
  score integer, criteria_compared integer, reasons text[])
language sql stable security invoker set search_path = '' as $$
  select c.id, c.display_name, c.avatar_path, c.bio, c.campus_id,
         c.budget_min_zmw, c.budget_max_zmw,
         coalesce(round(100.0 * s.earned / nullif(s.possible, 0)), 0)::integer,
         s.compared::integer,
         coalesce(s.reasons, '{}')
  from public.roommate_profiles m
  join public.roommate_profiles c
    on c.status = 'active' and c.owner_id <> m.owner_id
   and (m.gender_pref = 'any' or (m.gender is not null and c.gender = m.gender))
   and (c.gender_pref = 'any' or (c.gender is not null and m.gender = c.gender))
  cross join lateral (
    select
      sum(k.possible) filter (where k.earned is not null) as possible,
      sum(k.earned)   filter (where k.earned is not null) as earned,
      count(*)        filter (where k.earned is not null) as compared,
      array_agg(k.reason) filter (where k.earned > 0)     as reasons
    from (values
      (20, case when m.campus_id is not null and c.campus_id is not null
                then case when m.campus_id = c.campus_id then 20 else 0 end end,
           'Same preferred campus'),
      (10, case when cardinality(m.preferred_areas) > 0 and cardinality(c.preferred_areas) > 0
                then case when m.preferred_areas && c.preferred_areas then 10 else 0 end end,
           'Overlapping preferred areas'),
      (25, case when m.budget_max_zmw is not null and c.budget_max_zmw is not null
                then case when coalesce(m.budget_min_zmw, 0) <= c.budget_max_zmw
                           and coalesce(c.budget_min_zmw, 0) <= m.budget_max_zmw then 25 else 0 end end,
           'Budget ranges overlap'),
      (15, case when m.move_in_date is not null and c.move_in_date is not null
                then case when abs(m.move_in_date - c.move_in_date) <= 30 then 15 else 0 end end,
           'Move-in dates within a month of each other'),
      (10, case when m.room_sharing is not null and c.room_sharing is not null
                then case when m.room_sharing = c.room_sharing
                            or m.room_sharing = 'either' or c.room_sharing = 'either' then 10 else 0 end end,
           'Compatible room-sharing preference'),
      (5,  case when m.noise_level is not null and c.noise_level is not null
                then case when m.noise_level = c.noise_level then 5 else 0 end end,
           'Similar noise preference'),
      (5,  case when m.study_routine is not null and c.study_routine is not null
                then case when m.study_routine = c.study_routine then 5 else 0 end end,
           'Similar study routine'),
      (5,  case when m.tidiness is not null and c.tidiness is not null
                then case when m.tidiness = c.tidiness then 5 else 0 end end,
           'Similar tidiness preference'),
      (5,  case when m.guests is not null and c.guests is not null
                then case when m.guests = c.guests then 5 else 0 end end,
           'Similar approach to guests')
    ) as k(possible, earned, reason)
  ) s
  where m.owner_id = auth.uid() and m.status = 'active'
  order by 8 desc, 9 desc, c.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke execute on function public.reveal_contact(text, uuid)            from public, anon;
revoke execute on function public.moderate_content(text, uuid, text, text) from public, anon;
revoke execute on function public.resolve_report(uuid, public.report_status, text) from public, anon;
revoke execute on function public.match_roommates(integer)              from public, anon;
grant  execute on function public.reveal_contact(text, uuid)            to authenticated;
grant  execute on function public.moderate_content(text, uuid, text, text) to authenticated;
grant  execute on function public.resolve_report(uuid, public.report_status, text) to authenticated;
grant  execute on function public.match_roommates(integer)              to authenticated;

-- ---------- 15. Storage --------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-images',  'listing-images',  true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('business-images', 'business-images', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('avatars',         'avatars',         true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy storage_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('listing-images','business-images','avatars')
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_owner_select on storage.objects for select to authenticated
  using (bucket_id in ('listing-images','business-images','avatars')
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));
create policy storage_owner_update on storage.objects for update to authenticated
  using (bucket_id in ('listing-images','business-images','avatars')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_owner_delete on storage.objects for delete to authenticated
  using (bucket_id in ('listing-images','business-images','avatars')
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

-- ---------- 16. Reference seed data --------------------------------
insert into public.towns (name, province) values
  ('Kitwe','Copperbelt'), ('Ndola','Copperbelt'), ('Chingola','Copperbelt'), ('Mufulira','Copperbelt'),
  ('Lusaka','Lusaka'), ('Kabwe','Central'), ('Livingstone','Southern'),
  ('Kasama','Northern'), ('Chipata','Eastern')
on conflict (name, province) do nothing;

insert into public.campuses (name, short_name, town_id)
select v.name, v.short_name, t.id
from (values
  ('Copperbelt University','CBU','Kitwe'),
  ('Mukuba University','Mukuba','Kitwe'),
  ('University of Zambia','UNZA','Lusaka'),
  ('Mulungushi University','MU','Kabwe')
) as v(name, short_name, town)
join public.towns t on t.name = v.town
on conflict (name) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Food & Drinks','food-drinks',1), ('Groceries & Provisions','groceries',2),
  ('Fashion & Clothing','fashion',3), ('Beauty & Salons','beauty',4),
  ('Phones & Electronics','electronics',5), ('Printing & Stationery','printing-stationery',6),
  ('Laundry & Cleaning','laundry-cleaning',7), ('Repairs & Services','repairs-services',8),
  ('Health & Pharmacy','health',9), ('Transport & Delivery','transport',10),
  ('Tutoring & Education','tutoring',11), ('Other','other',99)
on conflict (slug) do nothing;
