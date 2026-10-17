-- Committee testing round (product owner, 18 Oct 2026). Only the Technical Committee tests for now.
--  * A testers' invite link lets people register while registration is closed to the public.
--  * People who register through it are marked as testers; at launch their accounts and content are
--    cleared (anonymised and archived; never hard-deleted).
--  * A feedback button for testers and officials; feedback is seen by administrators only.

alter table public.invite_links add column tester boolean not null default false;
alter table public.member_profiles add column is_tester boolean not null default false;

drop function public.invite_info(text);
create function public.invite_info(p_token text)
returns table (label text, year_left int, tester boolean)
language sql stable security definer set search_path = ''
as $$
  select i.label, c.year_left, i.tester
  from public.invite_links i
  left join public.cohorts c on c.id = i.cohort_id
  where i.token = p_token and i.active;
$$;
grant execute on function public.invite_info(text) to anon, authenticated;

create or replace function public.complete_registration(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_person uuid;
  v_name text := trim(regexp_replace(coalesce(p ->> 'full_name', ''), '\s+', ' ', 'g'));
  v_phone text := regexp_replace(coalesce(p ->> 'phone', ''), '[\s\-().]', '', 'g');
  v_country text := upper(coalesce(nullif(p ->> 'phone_country', ''), 'KE'));
  v_whatsapp boolean := coalesce((p ->> 'phone_whatsapp')::boolean, true);
  v_category public.member_categories%rowtype;
  v_level public.membership_levels%rowtype;
  v_cohort uuid;
  v_year_left int;
  v_admission int;
  v_county text := p ->> 'county';
  v_cluster uuid;
  v_relationship text := nullif(trim(coalesce(p ->> 'relationship', '')), '');
  v_occupation public.occupation_status;
  v_invite public.invite_links%rowtype;
  v_profile uuid;
  v_fee numeric(14, 2) := 0;
  v_fee_type public.fee_type := 'none';
  v_dues_ref text;
  v_purpose text;
  v_consents jsonb := coalesce(p -> 'consents', '{}');
  v_other uuid;
begin
  if v_uid is null then
    raise exception 'Please sign in first' using errcode = '42501';
  end if;
  -- Closed to the public, except for administrators and people using an active testers' link.
  if not coalesce((select enabled from public.module_settings where module_key = 'registration'), false)
     and not public.is_admin()
     and not exists (select 1 from public.invite_links where token = nullif(p ->> 'invite', '') and active and tester) then
    raise exception 'Registration is not open yet' using errcode = '22023';
  end if;
  select public.normalize_email(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then
    raise exception 'Your email address is not confirmed yet' using errcode = '22023';
  end if;

  -- Validate everything before writing anything.
  if length(v_name) < 3 or length(v_name) > 120 or v_name !~ '\s' then
    raise exception 'Enter your full name (first and last name)' using errcode = '22023';
  end if;
  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'Choose the country of your phone number' using errcode = '22023';
  end if;
  if v_country = 'KE' then
    v_phone := public.normalize_phone(v_phone);
    if v_phone is null or v_phone !~ '^\+254[17]\d{8}$' then
      raise exception 'Enter a valid Kenyan phone number, for example 0712 345 678' using errcode = '22023';
    end if;
  elsif v_phone !~ '^\+[1-9]\d{7,14}$' then
    raise exception 'Enter a valid phone number with its country code' using errcode = '22023';
  end if;

  select * into v_category from public.member_categories where key = p ->> 'category' and active;
  if v_category.id is null then
    raise exception 'Choose alumnus or friend of the alumni' using errcode = '22023';
  end if;

  if v_category.key = 'alumnus' then
    v_year_left := nullif(p ->> 'year_left', '')::int;
    select id into v_cohort from public.cohorts where year_left = v_year_left;
    if v_cohort is null then
      raise exception 'Choose the year you left Menyenya' using errcode = '22023';
    end if;
    v_admission := nullif(p ->> 'admission_year', '')::int;
    if v_admission is not null and (v_admission > v_year_left or v_admission < v_year_left - 8) then
      raise exception 'Check the year you joined Menyenya' using errcode = '22023';
    end if;
    select * into v_level from public.membership_levels where name = p ->> 'level' and active;
    if v_level.id is null then
      raise exception 'Choose a membership level' using errcode = '22023';
    end if;
    begin
      v_occupation := (p ->> 'occupation_status')::public.occupation_status;
    exception when others then
      raise exception 'Say what you do now' using errcode = '22023';
    end;
    if v_occupation is null then
      raise exception 'Say what you do now' using errcode = '22023';
    end if;
  else
    if v_relationship is null or length(v_relationship) > 80 then
      raise exception 'Say how you are connected to the school' using errcode = '22023';
    end if;
  end if;

  if not exists (select 1 from public.counties where name = v_county and active) then
    raise exception 'Choose your county' using errcode = '22023';
  end if;
  select id into v_cluster from public.clusters where name = p ->> 'region' and active;
  if v_cluster is null then
    raise exception 'Choose your region' using errcode = '22023';
  end if;

  if coalesce((v_consents ->> 'membership_data')::boolean, false) is not true then
    raise exception 'Please agree to the association keeping your membership details' using errcode = '22023';
  end if;

  if nullif(p ->> 'invite', '') is not null then
    select * into v_invite from public.invite_links where token = p ->> 'invite' and active;
  end if;

  -- The person: already linked, or the record with this verified email (e.g. a donor), or new.
  select id into v_person from public.persons where user_id = v_uid;
  if v_person is null then
    select pc.person_id into v_person
    from public.person_contacts pc join public.persons pp on pp.id = pc.person_id
    where pc.kind = 'email' and pc.value = v_email and pp.user_id is null and pp.status = 'active'
    order by pc.created_at limit 1;
    if v_person is not null then
      update public.persons set user_id = v_uid where id = v_person;
    end if;
  end if;
  if v_person is not null and exists (select 1 from public.member_profiles where person_id = v_person) then
    raise exception 'You are already registered' using errcode = '22023';
  end if;
  if v_person is null then
    insert into public.persons (full_name, user_id) values (v_name, v_uid) returning id into v_person;
  else
    update public.persons set full_name = v_name where id = v_person;
  end if;

  -- Contacts. A phone or email that belongs to someone else is flagged for a person to check.
  insert into public.person_contacts (person_id, kind, value, is_primary, verified_at)
  values (v_person, 'email', v_email,
          not exists (select 1 from public.person_contacts where person_id = v_person and kind = 'email' and is_primary), now())
  on conflict (person_id, kind, value) do update set verified_at = coalesce(public.person_contacts.verified_at, now());

  insert into public.person_contacts (person_id, kind, value, is_primary, is_whatsapp, country)
  values (v_person, 'phone', v_phone,
          not exists (select 1 from public.person_contacts where person_id = v_person and kind = 'phone' and is_primary),
          v_whatsapp, v_country)
  on conflict (person_id, kind, value) do update set is_whatsapp = excluded.is_whatsapp, country = excluded.country;

  for v_other in
    select distinct pc.person_id from public.person_contacts pc
    where pc.person_id <> v_person and ((pc.kind = 'phone' and pc.value = v_phone) or (pc.kind = 'email' and pc.value = v_email))
  loop
    insert into public.duplicate_flags (person_a_id, person_b_id, reason)
    select v_person, v_other, case when exists (
      select 1 from public.person_contacts where person_id = v_other and kind = 'phone' and value = v_phone)
      then 'same_phone' else 'same_email' end
    on conflict do nothing;
  end loop;

  if v_cohort is not null then
    for v_other in
      select mp.person_id from public.member_profiles mp join public.persons pp on pp.id = mp.person_id
      where mp.cohort_id = v_cohort and lower(pp.full_name) = lower(v_name) and mp.person_id <> v_person
    loop
      insert into public.duplicate_flags (person_a_id, person_b_id, reason)
      values (v_person, v_other, 'same_name_cohort') on conflict do nothing;
    end loop;
  end if;

  insert into public.member_profiles (
    person_id, category_id, level_id, cohort_id, admission_year, year_left, class_or_stream,
    relationship_to_school, home_county, cluster_id, occupation_status, membership_status,
    invited_by_person_id, registration_source, registered_at, directory_visibility, is_tester
  ) values (
    v_person, v_category.id, v_level.id, v_cohort, v_admission, v_year_left,
    nullif(left(trim(coalesce(p ->> 'class_or_stream', '')), 60), ''),
    v_relationship, v_county, v_cluster, v_occupation, 'registered',
    v_invite.inviter_person_id, case when v_invite.id is not null then 'invite' else 'web' end, now(),
    '{"photo": "members", "headline": "members", "profession": "members", "cohort": "members", "region": "members"}',
    coalesce(v_invite.tester, false)
  ) returning id into v_profile;

  foreach v_purpose in array array['membership_data', 'email_updates', 'whatsapp_updates', 'directory_listing', 'public_profile'] loop
    insert into public.consents (person_id, purpose, granted, wording_version)
    values (v_person, v_purpose::public.consent_purpose, coalesce((v_consents ->> v_purpose)::boolean, false), 'v1');
  end loop;

  -- A fee, if one applies and fees are switched on.
  if coalesce((select enabled from public.module_settings where module_key = 'membership_fees'), false) then
    if v_level.id is not null then
      v_fee := v_level.fee_amount; v_fee_type := v_level.fee_type;
    else
      v_fee := v_category.fee_amount; v_fee_type := v_category.fee_type;
    end if;
    if v_fee > 0 and v_fee_type <> 'none' then
      v_dues_ref := 'MSA-M-' || extract(year from now())::int || '-' || lpad(nextval('public.dues_ref_seq')::text, 6, '0');
      insert into public.membership_dues (person_id, amount, fee_type, reference, due_for)
      values (v_person, v_fee, v_fee_type, v_dues_ref,
              case when v_fee_type = 'annual' then extract(year from now())::text else 'Joining fee' end);
    end if;
  end if;

  insert into public.notifications (person_id, to_address, template_key, payload)
  values (v_person, v_email, 'registration_welcome',
          jsonb_build_object('first_name', split_part(v_name, ' ', 1), 'dues_reference', v_dues_ref, 'dues_amount', nullif(v_fee, 0)));

  return jsonb_build_object(
    'person_id', v_person,
    'dues_reference', v_dues_ref,
    'dues_amount', case when v_dues_ref is null then null else v_fee end,
    'dues_type', case when v_dues_ref is null then null else v_fee_type end
  );
end;
$$;
revoke execute on function public.complete_registration(jsonb) from public, anon;
grant execute on function public.complete_registration(jsonb) to authenticated;

-- The tester flag can't be changed by the member.
create or replace function public.member_profiles_tester_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.is_tester is distinct from old.is_tester and not public.is_admin() and current_user in ('authenticated', 'anon') then
    raise exception 'Only an administrator can change this' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger member_profiles_tester_guard before update of is_tester on public.member_profiles
  for each row execute function public.member_profiles_tester_guard();

-- Feedback ------------------------------------------------------------------------------------------
create or replace function public.can_give_feedback()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or exists (select 1 from public.member_profiles mp where mp.person_id = public.current_person_id() and mp.is_tester)
      or exists (select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id and r.key <> 'member'
                 where ra.person_id = public.current_person_id() and ra.starts_on <= current_date
                   and (ra.ends_on is null or ra.ends_on >= current_date));
$$;
revoke execute on function public.can_give_feedback() from public, anon;
grant execute on function public.can_give_feedback() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id) default public.current_person_id(),
  page text not null default '' check (length(page) <= 300),
  what_happened text not null check (length(trim(what_happened)) between 3 and 3000),
  expected text not null default '' check (length(expected) <= 2000),
  severity text not null check (severity in ('blocks', 'annoying', 'idea')),
  device text not null default '' check (length(device) <= 300),
  screenshot_path text,
  status text not null default 'new' check (status in ('new', 'agreed', 'fixed', 'wont_do')),
  admin_note text not null default '' check (length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedback_status_idx on public.feedback (status, created_at desc);
create index feedback_person_idx on public.feedback (person_id);
create trigger feedback_updated_at before update on public.feedback for each row execute function public.set_updated_at();
create trigger feedback_audit after insert or update or delete on public.feedback for each row execute function public.audit_row();
alter table public.feedback enable row level security;

create policy "feedback give" on public.feedback for insert to authenticated
  with check (person_id = public.current_person_id() and public.can_give_feedback());
create policy "feedback own or admin read" on public.feedback for select to authenticated
  using (person_id = public.current_person_id() or public.is_admin());
create policy "feedback admin update" on public.feedback for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "feedback screenshots upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and split_part(name, '/', 1) = public.current_person_id()::text and public.can_give_feedback());
create policy "feedback screenshots read" on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and (public.is_admin() or split_part(name, '/', 1) = public.current_person_id()::text));
