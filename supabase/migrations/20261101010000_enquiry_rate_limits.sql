-- =====================================================================
-- Migration: 20261101010000_enquiry_rate_limits.sql
-- Enforce anti-spam rate limiting on accommodation enquiries:
-- 1. Prevents duplicate enquiries to the same listing within 10 minutes.
-- 2. Caps total viewing enquiries at 5 per 10 minutes per user.
-- Runs inside prepare_enquiry() trigger (security definer).
-- =====================================================================

create or replace function public.prepare_enquiry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_status public.content_status;
  v_recent_same integer;
  v_recent_total integer;
begin
  -- 1. Validate listing exists and is active
  select owner_id, status into v_owner, v_status
  from public.accommodation_listings where id = new.listing_id;

  if v_owner is null or v_status <> 'active' then
    raise exception 'This listing is not accepting enquiries' using errcode = 'P0002';
  end if;

  -- 2. Prevent landlord from enquiring on their own listing
  if v_owner = new.requester_id then
    raise exception 'You cannot send an enquiry to your own listing' using errcode = '42501';
  end if;

  -- 3. Anti-spam: max 1 enquiry to the same property per 10 minutes
  select count(*) into v_recent_same
  from public.accommodation_enquiries
  where requester_id = new.requester_id
    and listing_id = new.listing_id
    and created_at > now() - interval '10 minutes';

  if v_recent_same > 0 then
    raise exception 'You have already sent an enquiry for this listing recently. Please wait before sending another.' using errcode = '54000';
  end if;

  -- 4. Anti-spam: max 5 viewing enquiries in any 10-minute window
  select count(*) into v_recent_total
  from public.accommodation_enquiries
  where requester_id = new.requester_id
    and created_at > now() - interval '10 minutes';

  if v_recent_total >= 5 then
    raise exception 'Viewing enquiry limit reached. Please wait a few minutes before submitting more requests.' using errcode = '54000';
  end if;

  -- 5. Stamp owner and initial status
  new.owner_id := v_owner;
  new.status := 'new';
  return new;
end $$;
