-- =====================================================================
-- RLS & Security Verification Test Script for PLAWZA
-- Run in Supabase SQL Editor.
-- Output: A single table with test_name, status (PASS/FAIL), and details.
-- =====================================================================

create temp table if not exists rls_test_results (
  id serial primary key,
  test_name text not null,
  status text not null,
  detail text
);
truncate table rls_test_results;

do $$
declare
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_user_c uuid := '33333333-3333-3333-3333-333333333333';
  v_admin  uuid := '99999999-9999-9999-9999-999999999999';
  v_town_id uuid;
  v_listing_id uuid;
  v_listing_active_id uuid;
  v_enquiry_id uuid;
  v_count integer;
  v_owner_count integer;
  v_stranger_count integer;
  v_c integer;
  v_status public.content_status;
  v_phone text;
  v_wa text;
  v_caught boolean;
  v_msg text;
begin
  -- 0. Seed test fixtures in auth.users first (satisfies profiles_id_fkey)
  insert into auth.users (id, aud, role, email)
  values
    (v_user_a, 'authenticated', 'authenticated', 'test_user_a@plawza.test'),
    (v_user_b, 'authenticated', 'authenticated', 'test_user_b@plawza.test'),
    (v_user_c, 'authenticated', 'authenticated', 'test_user_c@plawza.test'),
    (v_admin,  'authenticated', 'authenticated', 'test_admin@plawza.test')
  on conflict (id) do nothing;

  -- Ensure town fixture exists
  select id into v_town_id from public.towns where name = 'Kitwe' limit 1;
  if v_town_id is null then
    insert into public.towns (name, province) values ('Kitwe', 'Copperbelt') returning id into v_town_id;
  end if;

  -- Ensure profile rows exist with phone numbers
  insert into public.profiles (id, full_name, phone)
  values
    (v_user_a, 'User A (Owner)', '+260971111111'),
    (v_user_b, 'User B (Requester)', '+260972222222'),
    (v_user_c, 'User C (Stranger)', '+260973333333'),
    (v_admin,  'Staff Admin', '+260979999999')
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone;

  -- Give admin staff role
  insert into public.staff_roles (user_id, role)
  values (v_admin, 'admin')
  on conflict (user_id) do nothing;

  -- Create a draft listing owned by User A
  insert into public.accommodation_listings
    (owner_id, title, description, listing_type, rent_zmw, town_id, area, status, contact_shared)
  values
    (v_user_a, 'Draft Listing Riverside', 'Comfortable room close to CBU campus Riverside', 'room', 1500, v_town_id, 'Riverside', 'draft', false)
  returning id into v_listing_id;

  -- Create an active listing owned by User A
  insert into public.accommodation_listings
    (owner_id, title, description, listing_type, rent_zmw, town_id, area, status, contact_shared)
  values
    (v_user_a, 'Active Listing Riverside', 'Spacious bedsitter near CBU campus Riverside', 'bedsitter', 2500, v_town_id, 'Riverside', 'active', false)
  returning id into v_listing_active_id;

  -- Add private contact for the active listing
  insert into public.private_contacts (owner_id, listing_id, phone, whatsapp_phone)
  values (v_user_a, v_listing_active_id, '+260971111111', '+260971111111');

  -- -------------------------------------------------------------------
  -- Test 1: Anon cannot read draft/pending rows
  -- -------------------------------------------------------------------
  execute 'set local role anon';
  execute 'select count(*) from public.accommodation_listings where id = $1'
    into v_count using v_listing_id;
  reset role;

  if v_count = 0 then
    insert into rls_test_results (test_name, status, detail)
    values ('1. Anon cannot read draft/pending rows', 'PASS', 'Count returned is 0 for draft listing');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('1. Anon cannot read draft/pending rows', 'FAIL', format('Draft listing was visible (count=%s)', v_count));
  end if;

  -- -------------------------------------------------------------------
  -- Test 2: Anon cannot read private_contacts
  -- -------------------------------------------------------------------
  execute 'set local role anon';
  execute 'select count(*) from public.private_contacts where listing_id = $1'
    into v_count using v_listing_active_id;
  reset role;

  if v_count = 0 then
    insert into rls_test_results (test_name, status, detail)
    values ('2. Anon cannot read private_contacts', 'PASS', 'Private contacts count returned is 0');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('2. Anon cannot read private_contacts', 'FAIL', format('Private contacts leaked (count=%s)', v_count));
  end if;

  -- -------------------------------------------------------------------
  -- Test 3: Anon cannot select reviewed_by / rejection_reason
  -- -------------------------------------------------------------------
  v_caught := false;
  begin
    execute 'set local role anon';
    execute 'select reviewed_by, rejection_reason from public.accommodation_listings limit 1';
    reset role;
  exception when others then
    reset role;
    v_caught := true;
    v_msg := sqlerrm;
  end;

  if v_caught then
    insert into rls_test_results (test_name, status, detail)
    values ('3. Anon cannot select reviewed_by/rejection_reason', 'PASS', format('Denied with: %s', v_msg));
  else
    insert into rls_test_results (test_name, status, detail)
    values ('3. Anon cannot select reviewed_by/rejection_reason', 'FAIL', 'Anon was able to query internal moderation columns');
  end if;

  -- -------------------------------------------------------------------
  -- Test 4: A user cannot update another user''s listing
  -- -------------------------------------------------------------------
  v_count := 0;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_b), true);
  execute 'update public.accommodation_listings set title = ''Hacked Title'' where id = $1'
    using v_listing_id;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  select count(*) into v_count from public.accommodation_listings where id = v_listing_id and title = 'Hacked Title';
  if v_count = 0 then
    insert into rls_test_results (test_name, status, detail)
    values ('4. User cannot update another user''s listing', 'PASS', 'Foreign listing update blocked/ignored by RLS');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('4. User cannot update another user''s listing', 'FAIL', 'Foreign listing was modified');
  end if;

  -- -------------------------------------------------------------------
  -- Test 5: A user cannot set status=''active'' on their own listing
  -- -------------------------------------------------------------------
  v_caught := false;
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_a), true);
    execute 'update public.accommodation_listings set status = ''active'' where id = $1'
      using v_listing_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    v_caught := true;
    v_msg := sqlerrm;
  end;

  if v_caught and v_msg ~* 'Owners cannot set status' then
    insert into rls_test_results (test_name, status, detail)
    values ('5. User cannot set status=''active'' on own listing', 'PASS', format('Blocked: %s', v_msg));
  else
    insert into rls_test_results (test_name, status, detail)
    values ('5. User cannot set status=''active'' on own listing', 'FAIL', 'Owner was able to self-activate listing without review');
  end if;

  -- -------------------------------------------------------------------
  -- Test 6: Editing an active listing returns it to pending
  -- -------------------------------------------------------------------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_a), true);
  execute 'update public.accommodation_listings set rent_zmw = 2600 where id = $1'
    using v_listing_active_id;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  select status into v_status from public.accommodation_listings where id = v_listing_active_id;
  if v_status = 'pending' then
    insert into rls_test_results (test_name, status, detail)
    values ('6. Editing active listing returns it to pending', 'PASS', 'Status successfully changed from active to pending');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('6. Editing active listing returns it to pending', 'FAIL', format('Status is %s, expected pending', v_status));
  end if;

  -- Reset listing back to active for Test 7 (via bypass)
  update public.accommodation_listings set status = 'active' where id = v_listing_active_id;

  -- -------------------------------------------------------------------
  -- Test 7: Adding an image to an active listing returns it to pending
  -- -------------------------------------------------------------------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_a), true);
  execute 'insert into public.accommodation_images (listing_id, storage_path, alt_text) values ($1, $2, $3)'
    using v_listing_active_id, format('%s/%s/photo1.jpg', v_user_a, v_listing_active_id), 'Room photo';
  reset role;
  perform set_config('request.jwt.claims', '', true);

  select status into v_status from public.accommodation_listings where id = v_listing_active_id;
  if v_status = 'pending' then
    insert into rls_test_results (test_name, status, detail)
    values ('7. Adding image to active listing returns it to pending', 'PASS', 'trg_images_review kicked status back to pending');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('7. Adding image to active listing returns it to pending', 'FAIL', format('Status is %s, expected pending', v_status));
  end if;

  -- Reset back to active and consent shared for remaining tests
  update public.accommodation_listings set status = 'active', contact_shared = false where id = v_listing_active_id;

  -- -------------------------------------------------------------------
  -- Test 8: A user cannot insert into staff_roles
  -- -------------------------------------------------------------------
  v_caught := false;
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_b), true);
    execute 'insert into public.staff_roles (user_id, role) values ($1, ''admin'')' using v_user_b;
    reset role;
    perform set_config('request.jwt.claims', '', true);
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    v_caught := true;
    v_msg := sqlerrm;
  end;

  if v_caught then
    insert into rls_test_results (test_name, status, detail)
    values ('8. User cannot insert into staff_roles', 'PASS', format('Blocked with: %s', v_msg));
  else
    insert into rls_test_results (test_name, status, detail)
    values ('8. User cannot insert into staff_roles', 'FAIL', 'Authenticated user self-promoted to staff');
  end if;

  -- -------------------------------------------------------------------
  -- Test 9: A user cannot attach a private_contact to someone else''s listing
  -- -------------------------------------------------------------------
  v_caught := false;
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_b), true);
    execute 'insert into public.private_contacts (owner_id, listing_id, phone) values ($1, $2, ''+260972222222'')'
      using v_user_b, v_listing_active_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    v_caught := true;
    v_msg := sqlerrm;
  end;

  if v_caught then
    insert into rls_test_results (test_name, status, detail)
    values ('9. User cannot attach contact to foreign listing', 'PASS', format('Blocked with: %s', v_msg));
  else
    insert into rls_test_results (test_name, status, detail)
    values ('9. User cannot attach contact to foreign listing', 'FAIL', 'Foreign listing contact takeover permitted');
  end if;

  -- -------------------------------------------------------------------
  -- Test 10: reveal_contact fails signed-out and when contact_shared=false
  -- -------------------------------------------------------------------
  v_caught := false;
  -- Sub-test 10a: Signed out
  begin
    execute 'set local role anon';
    execute 'select phone from public.reveal_contact(''listing'', $1)' using v_listing_active_id;
    reset role;
  exception when others then
    reset role;
    v_caught := true;
    v_msg := sqlerrm;
  end;

  -- Sub-test 10b: Signed in but contact_shared is false
  v_count := 0;
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_b), true);
    execute 'select phone from public.reveal_contact(''listing'', $1)' using v_listing_active_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    if sqlerrm ~* 'not available' then
      v_count := 1;
    end if;
  end;

  if v_caught and v_count = 1 then
    insert into rls_test_results (test_name, status, detail)
    values ('10. reveal_contact fails signed-out & unconsented', 'PASS', 'Properly rejected on anon and contact_shared=false');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('10. reveal_contact fails signed-out & unconsented', 'FAIL', 'Contact leaked without sign-in or owner consent');
  end if;

  -- -------------------------------------------------------------------
  -- Test 11: moderate_content rejects non-staff, own content, wrong status
  -- -------------------------------------------------------------------
  v_caught := false;
  -- Sub-test 11a: Non-staff
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_b), true);
    execute 'select public.moderate_content(''listing'', $1, ''approve'')' using v_listing_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    if sqlerrm ~* 'Moderator access required' then
      v_caught := true;
    end if;
  end;

  -- Sub-test 11b: Staff moderating own content
  v_count := 0;
  begin
    insert into public.staff_roles (user_id, role) values (v_user_a, 'admin');
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_a), true);
    execute 'select public.moderate_content(''listing'', $1, ''approve'')' using v_listing_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    delete from public.staff_roles where user_id = v_user_a;
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    delete from public.staff_roles where user_id = v_user_a;
    if sqlerrm ~* 'cannot moderate your own' then
      v_count := 1;
    end if;
  end;

  -- Sub-test 11c: Wrong status (approving a draft instead of pending)
  v_c := 0;
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_admin), true);
    execute 'select public.moderate_content(''listing'', $1, ''approve'')' using v_listing_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    if sqlerrm ~* 'Cannot approve content that is currently draft' then
      v_c := 1;
    end if;
  end;

  if v_caught and v_count = 1 and v_c = 1 then
    insert into rls_test_results (test_name, status, detail)
    values ('11. moderate_content guards non-staff, self & status', 'PASS', 'Enforced staff requirement, own-content ban, and valid transitions');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('11. moderate_content guards non-staff, self & status', 'FAIL', format('Guards failed (non_staff=%s, self=%s, wrong_status=%s)', v_caught, v_count, v_c));
  end if;

  -- -------------------------------------------------------------------
  -- Test 12: Enquiries visible only to requester and owner
  -- -------------------------------------------------------------------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_b), true);
  insert into public.accommodation_enquiries (listing_id, requester_id, requester_name, requester_phone, message)
  values (v_listing_active_id, v_user_b, 'User B', '+260972222222', 'Can I view tomorrow at 14:00?')
  returning id into v_enquiry_id;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- Check Requester (User B) visibility
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_b), true);
  execute 'select count(*) from public.accommodation_enquiries where id = $1' into v_count using v_enquiry_id;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- Check Owner (User A) visibility
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_a), true);
  execute 'select count(*) from public.accommodation_enquiries where id = $1' into v_owner_count using v_enquiry_id;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- Check Stranger (User C) visibility
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', v_user_c), true);
  execute 'select count(*) from public.accommodation_enquiries where id = $1' into v_stranger_count using v_enquiry_id;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  if v_count = 1 and v_owner_count = 1 and v_stranger_count = 0 then
    insert into rls_test_results (test_name, status, detail)
    values ('12. Enquiries visible only to requester & owner', 'PASS', 'Requester: 1, Owner: 1, Stranger: 0');
  else
    insert into rls_test_results (test_name, status, detail)
    values ('12. Enquiries visible only to requester & owner', 'FAIL', format('Leak detected (requester=%s, owner=%s, stranger=%s)', v_count, v_owner_count, v_stranger_count));
  end if;

  -- -------------------------------------------------------------------
  -- Cleanup test records (strictly respect foreign key constraints)
  -- -------------------------------------------------------------------
  delete from public.moderation_actions where actor_id in (v_user_a, v_user_b, v_user_c, v_admin);
  delete from public.verifications where checked_by in (v_user_a, v_user_b, v_user_c, v_admin);
  delete from public.accommodation_listings where owner_id in (v_user_a, v_user_b, v_user_c, v_admin);
  delete from public.staff_roles where user_id in (v_user_a, v_admin);
  delete from auth.users where id in (v_user_a, v_user_b, v_user_c, v_admin);

end $$;

-- Return all test results
select test_name, status, detail from rls_test_results order by id;
