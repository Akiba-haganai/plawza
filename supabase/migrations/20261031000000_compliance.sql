-- =====================================================================
-- Migration: 20261031000000_compliance.sql
-- Compliance hardening: verification notes, anon owner_id, copyright
-- report reason, and self-service account deletion.
-- =====================================================================

-- 1. Verification notes (what exactly was checked / why it was revoked) --
alter table public.verifications
  add column if not exists note text,
  add column if not exists revoked_note text;

-- Applies to new grants only (NOT VALID skips existing rows). Revoking an
-- older note-less row stays possible because revoked_at is then set.
alter table public.verifications
  add constraint verifications_note_required
  check (
    revoked_at is not null
    or (note is not null and char_length(trim(note)) between 5 and 500)
  ) not valid;

alter table public.verifications
  add constraint verifications_revoked_note_len
  check (revoked_note is null or char_length(revoked_note) <= 500);

-- 2. Anonymous visitors no longer read owner_id ------------------------
-- (Signed-in users keep it; enquiry owner_id is set by prepare_enquiry().)
revoke select (owner_id) on public.accommodation_listings from anon;
revoke select (owner_id) on public.businesses from anon;

-- 3. Copyright / stolen photos report reason ---------------------------
alter table public.listing_reports
  drop constraint if exists listing_reports_reason_check;
alter table public.listing_reports
  add constraint listing_reports_reason_check
  check (reason in ('scam','misleading','unavailable','inappropriate','wrong_info','copyright','other'));

-- 4. Account deletion: keep audit rows, drop the personal link ---------
alter table public.moderation_actions alter column actor_id drop not null;
alter table public.moderation_actions drop constraint if exists moderation_actions_actor_id_fkey;
alter table public.moderation_actions
  add constraint moderation_actions_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.verifications alter column checked_by drop not null;
alter table public.verifications drop constraint if exists verifications_checked_by_fkey;
alter table public.verifications
  add constraint verifications_checked_by_fkey
  foreign key (checked_by) references public.profiles(id) on delete set null;

-- Deletes the caller's auth user; profile and owned content cascade.
-- Storage files are removed by the client before this call.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
