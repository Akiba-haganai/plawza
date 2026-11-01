-- =====================================================================
-- Migration: 20261101020000_notifications_and_personalization.sql
-- Personalization, Avatar storage access, In-app Notifications,
-- Web Push Subscriptions, and Notification Preferences.
-- =====================================================================

-- 1. Extend profiles with personalization columns ---------------------
alter table public.profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 250),
  add column if not exists town_id uuid references public.towns(id) on delete set null,
  add column if not exists campus_id uuid references public.campuses(id) on delete set null,
  add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 1000),
  add column if not exists preferred_contact_method text check (preferred_contact_method in ('whatsapp','call','sms')) default 'whatsapp',
  add column if not exists contact_visibility text check (contact_visibility in ('public','verified_only','on_request')) default 'public';

-- 2. Avatars public read storage policy --------------------------------
-- Ensure anyone (anonymous or authenticated) can view avatar images
drop policy if exists avatars_public_select on storage.objects;
create policy avatars_public_select on storage.objects
  for select
  using (bucket_id = 'avatars');

-- 3. Notification Preferences Table -----------------------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enquiries boolean not null default true,
  email_confirmations boolean not null default true,
  email_marketing boolean not null default false,
  push_enquiries boolean not null default true,
  push_reminders boolean not null default true,
  push_announcements boolean not null default true,
  in_app_sound boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy notif_pref_own on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Automatically create default notification preferences for existing users
insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- 4. In-App Notifications Table ---------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  message text not null check (char_length(message) between 1 and 500),
  type text not null check (type in ('enquiry', 'system', 'reminder', 'verification', 'moderation')),
  link_url text check (link_url is null or char_length(link_url) <= 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists idx_notifications_user_all
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_own_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_own_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_own_delete on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Enable Realtime replication on public.notifications
alter publication supabase_realtime add table public.notifications;

-- 5. Automatic Notification on New Enquiry ----------------------------
create or replace function public.notify_on_new_enquiry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_listing_title text;
  v_requester_name text;
begin
  select title into v_listing_title
  from public.accommodation_listings
  where id = new.listing_id;

  select coalesce(full_name, 'A student') into v_requester_name
  from public.profiles
  where id = new.requester_id;

  insert into public.notifications (
    user_id,
    title,
    message,
    type,
    link_url
  ) values (
    new.owner_id,
    'New Enquiry Received',
    coalesce(v_requester_name, 'A user') || ' enquired about "' || coalesce(left(v_listing_title, 40), 'your property') || '".',
    'enquiry',
    '/dashboard/enquiries'
  );

  return new;
end $$;

drop trigger if exists trg_notify_on_new_enquiry on public.accommodation_enquiries;
create trigger trg_notify_on_new_enquiry
  after insert on public.accommodation_enquiries
  for each row execute function public.notify_on_new_enquiry();

-- 6. Web Push Subscriptions Table --------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subs_own on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 7. Stale Listings Reminder Generator --------------------------------
create or replace function public.generate_expiry_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select l.id, l.title, l.owner_id
    from public.accommodation_listings l
    where l.status = 'active'
      and l.last_confirmed_at < now() - interval '25 days'
      and not exists (
        select 1 from public.notifications n
        where n.user_id = l.owner_id
          and n.type = 'reminder'
          and n.link_url = '/dashboard/accommodation'
          and n.created_at > now() - interval '7 days'
      )
  loop
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      link_url
    ) values (
      r.owner_id,
      'Listing Confirmation Needed',
      'Please confirm "' || left(r.title, 35) || '" is still available to maintain active search ranking.',
      'reminder',
      '/dashboard/accommodation'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;
