-- =====================================================================
-- Migration: 20261103000000_bugfixes_and_public_profile_rpc.sql
-- Fixes:
-- 1. moderate_content() supplies a valid note for verifications_note_required
--    and notifies the owner of moderation status updates.
-- 2. Public-safe RPCs get_public_member_profile() and get_host_summary()
--    so /u/:id and "Listed By" cards work for anonymous and signed-in users
--    without exposing phone numbers or requiring anon SELECT on owner_id.
-- 3. Two-way enquiry notification trigger when landlord updates enquiry
--    status to 'contacted' or 'closed'.
-- =====================================================================

-- 1. Fix moderate_content() to supply a verification note & notify owner
create or replace function public.moderate_content(
  p_kind text, p_id uuid, p_action text, p_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_table text; v_owner uuid; v_old text; v_new public.content_status;
  v_reason text := nullif(trim(p_reason), '');
  v_verif_note text := coalesce(nullif(trim(p_reason), ''), 'Approved by staff moderator review');
  v_link text;
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
        insert into public.verifications (listing_id, check_type, checked_by, note)
        values (p_id, 'moderator_reviewed', auth.uid(), left(v_verif_note, 500))
        on conflict do nothing;
      else
        insert into public.verifications (business_id, check_type, checked_by, note)
        values (p_id, 'moderator_reviewed', auth.uid(), left(v_verif_note, 500))
        on conflict do nothing;
      end if;
    else
      update public.verifications
         set revoked_at = now(),
             revoked_note = left(coalesce(v_reason, 'Content status changed by moderator'), 500)
       where check_type = 'moderator_reviewed' and revoked_at is null
         and ((p_kind = 'listing' and listing_id = p_id) or (p_kind = 'business' and business_id = p_id));
    end if;
  end if;

  -- Notify owner in-app
  v_link := case p_kind
    when 'listing'  then '/dashboard/accommodation'
    when 'business' then '/dashboard/businesses'
    when 'roommate' then '/dashboard/roommates'
    else '/dashboard' end;

  insert into public.notifications (user_id, title, message, type, link_url)
  values (
    v_owner,
    case
      when v_new = 'active' then 'Your ' || p_kind || ' is now live!'
      when v_new = 'rejected' then 'Update needed on your ' || p_kind
      else 'Moderation update on your ' || p_kind
    end,
    case
      when v_new = 'active' then 'A moderator approved your ' || p_kind || ' and it is now visible on Plawza.'
      else 'Status changed to ' || v_new::text || coalesce(': ' || left(v_reason, 200), '.')
    end,
    'moderation',
    v_link
  );
end $$;

-- 2. Two-way enquiry notification when landlord updates status ----------
create or replace function public.notify_on_enquiry_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_listing_title text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status not in ('contacted', 'closed') then
    return new;
  end if;

  select title into v_listing_title
  from public.accommodation_listings
  where id = new.listing_id;

  insert into public.notifications (
    user_id,
    title,
    message,
    type,
    link_url
  ) values (
    new.requester_id,
    case
      when new.status = 'contacted' then 'Landlord Responded to Your Enquiry'
      else 'Viewing Enquiry Closed'
    end,
    case
      when new.status = 'contacted' then 'The landlord for "' || coalesce(left(v_listing_title, 40), 'the property') || '" marked your viewing enquiry as contacted.'
      else 'Your viewing enquiry for "' || coalesce(left(v_listing_title, 40), 'the property') || '" was marked as closed.'
    end,
    'enquiry',
    '/dashboard/enquiries?tab=sent'
  );

  return new;
end $$;

drop trigger if exists trg_notify_on_enquiry_status_change on public.accommodation_enquiries;
create trigger trg_notify_on_enquiry_status_change
  after update of status on public.accommodation_enquiries
  for each row execute function public.notify_on_enquiry_status_change();

-- 3. Public-safe Member Profile RPC (/u/:id) ----------------------------
-- Never exposes phone numbers or private fields; works for anon and auth.
create or replace function public.get_public_member_profile(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile record;
  v_is_verified boolean;
  v_listings jsonb;
  v_businesses jsonb;
begin
  if p_user_id is null then
    return null;
  end if;

  select id, full_name, bio, avatar_path, avatar_url, created_at
    into v_profile
    from public.profiles
   where id = p_user_id;

  if v_profile.id is null then
    return null;
  end if;

  select exists (
    select 1 from public.verifications v
     where v.revoked_at is null
       and (
         v.profile_id = p_user_id
         or exists (select 1 from public.accommodation_listings l where l.id = v.listing_id and l.owner_id = p_user_id and l.status = 'active')
         or exists (select 1 from public.businesses b where b.id = v.business_id and b.owner_id = p_user_id and b.status = 'active')
       )
  ) into v_is_verified;

  select coalesce(jsonb_agg(row_to_json(l_row)::jsonb), '[]'::jsonb)
    into v_listings
    from (
      select
        l.id,
        l.title,
        l.rent_zmw,
        l.listing_type,
        l.area,
        l.availability,
        l.created_at,
        (select row_to_json(t) from (select name, province from public.towns where id = l.town_id) t) as town,
        (select row_to_json(c) from (select name, short_name from public.campuses where id = l.campus_id) c) as campus,
        coalesce(
          (select jsonb_agg(row_to_json(img))
             from (
               select storage_path, sort_order
                 from public.accommodation_images
                where listing_id = l.id
                order by sort_order asc
             ) img),
          '[]'::jsonb
        ) as accommodation_images
      from public.accommodation_listings l
      where l.owner_id = p_user_id
        and l.status = 'active'
      order by l.last_confirmed_at desc nulls last, l.created_at desc
    ) l_row;

  select coalesce(jsonb_agg(row_to_json(b_row)::jsonb), '[]'::jsonb)
    into v_businesses
    from (
      select
        b.id,
        b.name,
        b.slug,
        b.description,
        b.area,
        b.logo_path,
        b.cover_path,
        b.created_at,
        (select row_to_json(t) from (select name, province from public.towns where id = b.town_id) t) as town,
        (select row_to_json(cat) from (select name, slug from public.categories where id = b.category_id) cat) as category
      from public.businesses b
      where b.owner_id = p_user_id
        and b.status = 'active'
      order by b.created_at desc
    ) b_row;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'full_name', v_profile.full_name,
      'bio', v_profile.bio,
      'avatar_path', v_profile.avatar_path,
      'avatar_url', v_profile.avatar_url,
      'created_at', v_profile.created_at,
      'is_verified', v_is_verified
    ),
    'listings', v_listings,
    'businesses', v_businesses
  );
end $$;

revoke all on function public.get_public_member_profile(uuid) from public;
grant execute on function public.get_public_member_profile(uuid) to anon, authenticated;

-- 4. Public-safe Host Summary RPC for AccommodationDetail & ShopDetail --
create or replace function public.get_host_summary(
  p_listing_id uuid default null,
  p_business_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_owner_id uuid;
  v_profile record;
  v_is_verified boolean;
begin
  if p_listing_id is not null then
    select owner_id into v_owner_id
      from public.accommodation_listings
     where id = p_listing_id and status = 'active';
  elsif p_business_id is not null then
    select owner_id into v_owner_id
      from public.businesses
     where id = p_business_id and status = 'active';
  end if;

  if v_owner_id is null then
    return null;
  end if;

  select id, full_name, bio, avatar_path, avatar_url, created_at
    into v_profile
    from public.profiles
   where id = v_owner_id;

  if v_profile.id is null then
    return null;
  end if;

  select exists (
    select 1 from public.verifications v
     where v.revoked_at is null
       and (
         v.profile_id = v_owner_id
         or (p_listing_id is not null and v.listing_id = p_listing_id)
         or (p_business_id is not null and v.business_id = p_business_id)
       )
  ) into v_is_verified;

  return jsonb_build_object(
    'id', v_profile.id,
    'full_name', v_profile.full_name,
    'bio', v_profile.bio,
    'avatar_path', v_profile.avatar_path,
    'avatar_url', v_profile.avatar_url,
    'created_at', v_profile.created_at,
    'is_verified', v_is_verified
  );
end $$;

revoke all on function public.get_host_summary(uuid, uuid) from public;
grant execute on function public.get_host_summary(uuid, uuid) to anon, authenticated;
