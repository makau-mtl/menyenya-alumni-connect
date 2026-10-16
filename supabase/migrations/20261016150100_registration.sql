-- Registration (M3), as revised with the product owner on 16 Oct 2026. SPEC §5.1, §5.2, §6.2.
-- Signing in never creates a member: everything is written in one go by complete_registration()
-- when the last step is submitted.

-- Regions: Kenya's former provinces plus Diaspora ------------------------------------------------
update public.clusters set active = false
where name in ('Kisii', 'Nyamira', 'Nakuru', 'Eldoret', 'Kisumu', 'Mombasa');

insert into public.clusters (name, description, sort_order) values
  ('Nairobi', 'Nairobi County', 1),
  ('Central', 'Kiambu, Kirinyaga, Murang''a, Nyandarua and Nyeri', 2),
  ('Coast', 'Kilifi, Kwale, Lamu, Mombasa, Taita-Taveta and Tana River', 3),
  ('Eastern', 'Embu, Isiolo, Kitui, Machakos, Makueni, Marsabit, Meru and Tharaka-Nithi', 4),
  ('North Eastern', 'Garissa, Mandera and Wajir', 5),
  ('Nyanza', 'Homa Bay, Kisii, Kisumu, Migori, Nyamira and Siaya', 6),
  ('Rift Valley', 'Baringo, Bomet, Elgeyo-Marakwet, Kajiado, Kericho, Laikipia, Nakuru, Nandi, Narok, Samburu, Trans Nzoia, Turkana, Uasin Gishu and West Pokot', 7),
  ('Western', 'Bungoma, Busia, Kakamega and Vihiga', 8),
  ('Diaspora', 'Members living outside Kenya', 9)
on conflict (name) do update set description = excluded.description, sort_order = excluded.sort_order, active = true;

alter table public.counties add column cluster_id uuid references public.clusters (id);
create index counties_cluster_idx on public.counties (cluster_id);

update public.counties c set cluster_id = cl.id
from (values
  ('Nairobi', 'Nairobi'),
  ('Kiambu', 'Central'), ('Kirinyaga', 'Central'), ('Murang''a', 'Central'), ('Nyandarua', 'Central'), ('Nyeri', 'Central'),
  ('Kilifi', 'Coast'), ('Kwale', 'Coast'), ('Lamu', 'Coast'), ('Mombasa', 'Coast'), ('Taita-Taveta', 'Coast'), ('Tana River', 'Coast'),
  ('Embu', 'Eastern'), ('Isiolo', 'Eastern'), ('Kitui', 'Eastern'), ('Machakos', 'Eastern'), ('Makueni', 'Eastern'),
  ('Marsabit', 'Eastern'), ('Meru', 'Eastern'), ('Tharaka-Nithi', 'Eastern'),
  ('Garissa', 'North Eastern'), ('Mandera', 'North Eastern'), ('Wajir', 'North Eastern'),
  ('Homa Bay', 'Nyanza'), ('Kisii', 'Nyanza'), ('Kisumu', 'Nyanza'), ('Migori', 'Nyanza'), ('Nyamira', 'Nyanza'), ('Siaya', 'Nyanza'),
  ('Baringo', 'Rift Valley'), ('Bomet', 'Rift Valley'), ('Elgeyo-Marakwet', 'Rift Valley'), ('Kajiado', 'Rift Valley'),
  ('Kericho', 'Rift Valley'), ('Laikipia', 'Rift Valley'), ('Nakuru', 'Rift Valley'), ('Nandi', 'Rift Valley'),
  ('Narok', 'Rift Valley'), ('Samburu', 'Rift Valley'), ('Trans Nzoia', 'Rift Valley'), ('Turkana', 'Rift Valley'),
  ('Uasin Gishu', 'Rift Valley'), ('West Pokot', 'Rift Valley'),
  ('Bungoma', 'Western'), ('Busia', 'Western'), ('Kakamega', 'Western'), ('Vihiga', 'Western'),
  ('Outside Kenya', 'Diaspora')
) as m(county, region)
join public.clusters cl on cl.name = m.region
where c.name = m.county;

-- People and profiles: new fields ------------------------------------------------------------------
alter table public.person_contacts add column country text check (country ~ '^[A-Z]{2}$');

alter table public.member_profiles
  add column linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://([a-z]+\.)?linkedin\.com/'),
  add column social_links jsonb not null default '[]',
  add column headline text check (headline is null or length(headline) <= 160),
  add column photo_path text,
  add column registered_at timestamptz;

-- Friends have no level; any fee for them sits on the category.
alter table public.member_categories
  add column fee_amount numeric(14, 2) not null default 0 check (fee_amount >= 0),
  add column fee_type public.fee_type not null default 'none';
update public.member_categories set required_fields = '["year_left"]' where key = 'alumnus';

-- Switches the association turns on when ready (SPEC §5.9) ------------------------------------------
create table public.module_settings (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  enabled boolean not null default false,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.module_settings (module_key, enabled) values
  ('registration', false),      -- open to the public; administrators can always complete it for testing
  ('membership_fees', false),
  ('welfare', false),
  ('whatsapp', false);

-- Fees owed after registration, only when a fee applies and fees are switched on.
create sequence public.dues_ref_seq;
create table public.membership_dues (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id),
  amount numeric(14, 2) not null check (amount > 0),
  fee_type public.fee_type not null,
  reference text not null unique,
  status public.dues_status not null default 'pending',
  due_for text not null,                 -- e.g. "Joining fee" or "2027"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index membership_dues_person_idx on public.membership_dues (person_id);

-- Class invite links ("Class of 1998"): pre-fill the class and record who invited.
create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  label text not null,
  cohort_id uuid references public.cohorts (id),
  inviter_person_id uuid references public.persons (id),
  active boolean not null default true,
  created_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invite_links_cohort_idx on public.invite_links (cohort_id);
create index invite_links_inviter_idx on public.invite_links (inviter_person_id);
create index invite_links_created_by_idx on public.invite_links (created_by);

-- Outgoing messages. Queued here and sent separately, so a failed email never fails the action.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.persons (id),
  to_address text not null,
  channel public.notification_channel not null default 'email',
  template_key text not null,
  payload jsonb not null default '{}',
  status public.notification_status not null default 'queued',
  provider_message_id text,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_person_idx on public.notifications (person_id);
create index notifications_status_idx on public.notifications (status, created_at);

do $$
declare t text;
begin
  foreach t in array array['module_settings', 'membership_dues', 'invite_links', 'notifications'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['module_settings', 'membership_dues', 'invite_links'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t, t);
  end loop;
end;
$$;

alter table public.module_settings enable row level security;
alter table public.membership_dues enable row level security;
alter table public.invite_links enable row level security;
alter table public.notifications enable row level security;

create policy "modules readable" on public.module_settings for select to anon, authenticated using (true);
create policy "modules admin update" on public.module_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "dues read" on public.membership_dues for select to authenticated
  using (person_id = public.current_person_id() or public.is_finance());
create policy "dues finance update" on public.membership_dues for update to authenticated
  using (public.is_finance()) with check (public.is_finance());

create policy "invites admin read" on public.invite_links for select to authenticated using (public.is_admin());
create policy "invites admin insert" on public.invite_links for insert to authenticated with check (public.is_admin());
create policy "invites admin update" on public.invite_links for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "notifications admin read" on public.notifications for select to authenticated using (public.is_admin());

-- Signing in links to an existing record, but never creates one ------------------------------------
-- (Before: a confirmed login created a person. Now only finishing registration does.)
create or replace function public.on_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := public.normalize_email(new.email);
  v_person uuid;
begin
  if new.email_confirmed_at is null or not (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    return new;
  end if;
  if exists (select 1 from public.persons where user_id = new.id) then
    return new;
  end if;
  -- Someone who gave or pledged with this (now verified) email gets their record back.
  select pc.person_id into v_person
  from public.person_contacts pc
  join public.persons p on p.id = pc.person_id
  where pc.kind = 'email' and pc.value = v_email and p.user_id is null and p.status = 'active'
  order by pc.created_at
  limit 1;
  if v_person is not null then
    update public.persons set user_id = new.id where id = v_person;
    update public.person_contacts set verified_at = coalesce(verified_at, now())
    where person_id = v_person and kind = 'email' and value = v_email;
  end if;
  return new;
end;
$$;

-- Guard rails on self-service edits ---------------------------------------------------------------
-- Members may edit their own details, but not their status, verification or links to others.
-- Runs with the caller's own rights on purpose, so it can tell a member's edit from the
-- registration function (which runs as the database owner).
create or replace function public.guard_self_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Database owner (migrations, registration function) and administrators are not limited here.
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_table_name = 'persons' then
    if (new.status, new.merged_into_id, new.user_id) is distinct from (old.status, old.merged_into_id, old.user_id) then
      raise exception 'Only an administrator can change this' using errcode = '42501';
    end if;
  elsif tg_table_name = 'member_profiles' then
    if public.can_manage_person(new.person_id) and new.person_id <> coalesce(public.current_person_id(), new.person_id) then
      -- reps and verifiers may verify others
      if (new.person_id, new.category_id, new.registration_source, new.invited_by_person_id, new.registered_at)
         is distinct from (old.person_id, old.category_id, old.registration_source, old.invited_by_person_id, old.registered_at) then
        raise exception 'Only an administrator can change this' using errcode = '42501';
      end if;
    elsif (new.person_id, new.category_id, new.membership_status, new.verified_by, new.verified_at,
           new.registration_source, new.invited_by_person_id, new.registered_at)
        is distinct from (old.person_id, old.category_id, old.membership_status, old.verified_by, old.verified_at,
                          old.registration_source, old.invited_by_person_id, old.registered_at) then
      raise exception 'Only an administrator or verifier can change this' using errcode = '42501';
    end if;
  elsif tg_table_name = 'person_contacts' then
    if (new.person_id, new.verified_at) is distinct from (old.person_id, old.verified_at) then
      raise exception 'Only an administrator can change this' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_self_edit() from public, anon, authenticated;

create trigger persons_guard before update on public.persons
  for each row execute function public.guard_self_edit();
create trigger member_profiles_guard before update on public.member_profiles
  for each row execute function public.guard_self_edit();
create trigger person_contacts_guard before update on public.person_contacts
  for each row execute function public.guard_self_edit();

-- Profiles are created only by complete_registration() (or by administrators).
drop policy "profiles insert own" on public.member_profiles;
create policy "profiles admin insert" on public.member_profiles for insert to authenticated with check (public.is_admin());

-- Next of kin: the member and the Welfare Coordinator only; others never read the table directly ----
drop policy "next of kin read" on public.next_of_kin;
drop policy "next of kin insert" on public.next_of_kin;
drop policy "next of kin update" on public.next_of_kin;
create policy "next of kin own read" on public.next_of_kin for select to authenticated
  using (person_id = public.current_person_id());
create policy "next of kin own insert" on public.next_of_kin for insert to authenticated
  with check (person_id = public.current_person_id());
create policy "next of kin own update" on public.next_of_kin for update to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

-- The only way for anyone else to see a member's next of kin. Checks the role and logs the view.
-- (Class reps during an open welfare case are added when the welfare module is built.)
create or replace function public.view_next_of_kin(p_person uuid, p_reason text)
returns table (name text, relationship text, phone text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('welfare_coordinator') then
    raise exception 'Only the Welfare Coordinator can view next of kin' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Say why you need to see this' using errcode = '22023';
  end if;
  insert into public.sensitive_access_log (viewer_person_id, subject_person_id, data_kind, reason)
  values (public.current_person_id(), p_person, 'next_of_kin', trim(p_reason));
  return query select k.name, k.relationship, k.phone from public.next_of_kin k where k.person_id = p_person;
end;
$$;
revoke execute on function public.view_next_of_kin(uuid, text) from public, anon;
grant execute on function public.view_next_of_kin(uuid, text) to authenticated;

-- Member photos: private bucket. Members upload into their own folder; signed-in members can view.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.member_profiles where person_id = public.current_person_id()); $$;

create policy "member photos own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos' and split_part(name, '/', 1) = public.current_person_id()::text);
-- A photo is visible to its owner, administrators, and other members only if the owner agreed to
-- be listed in the directory (their latest choice counts).
create or replace function public.member_photo_visible(p_folder text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_folder = public.current_person_id()::text
      or public.is_admin()
      or (public.is_member() and coalesce((
            select c.granted from public.consents c
            where c.person_id::text = p_folder and c.purpose = 'directory_listing'
            order by c.created_at desc limit 1), false));
$$;

create policy "member photos view" on storage.objects for select to authenticated
  using (bucket_id = 'member-photos' and public.member_photo_visible(split_part(name, '/', 1)));

-- Looking up a class invite link (visitors only learn the label and class) --------------------------
create or replace function public.invite_info(p_token text)
returns table (label text, year_left int)
language sql
stable
security definer
set search_path = ''
as $$
  select i.label, c.year_left
  from public.invite_links i
  left join public.cohorts c on c.id = i.cohort_id
  where i.token = p_token and i.active;
$$;
grant execute on function public.invite_info(text) to anon, authenticated;

-- Finishing registration ----------------------------------------------------------------------------
-- One call, one transaction: either everything is saved or nothing is.
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
  if not coalesce((select enabled from public.module_settings where module_key = 'registration'), false)
     and not public.is_admin() then
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
    invited_by_person_id, registration_source, registered_at, directory_visibility
  ) values (
    v_person, v_category.id, v_level.id, v_cohort, v_admission, v_year_left,
    nullif(left(trim(coalesce(p ->> 'class_or_stream', '')), 60), ''),
    v_relationship, v_county, v_cluster, v_occupation, 'registered',
    v_invite.inviter_person_id, case when v_invite.id is not null then 'invite' else 'web' end, now(),
    '{"photo": "members", "headline": "members", "profession": "members", "cohort": "members", "region": "members"}'
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

-- Giving an official a role, until the roles screen arrives (M9). Run from the Supabase SQL editor:
--   select public.give_role('secretary@example.com', 'secretary', 'Jane Wanjiku');
-- Creates their record if they have only signed in. Not callable from the website.
create or replace function public.give_role(p_email text, p_role text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_person uuid;
  v_role uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No login found for %. Ask them to sign in once, or add them in Authentication first.', p_email;
  end if;
  select id into v_role from public.roles where key = p_role;
  if v_role is null then
    raise exception 'Unknown role %', p_role;
  end if;
  v_person := public.link_user_to_person(v_user, p_email, p_name);
  if not exists (select 1 from public.role_assignments where person_id = v_person and role_id = v_role
                 and scope_type = 'association' and (ends_on is null or ends_on >= current_date)) then
    insert into public.role_assignments (person_id, role_id, notes) values (v_person, v_role, 'given with give_role()');
  end if;
  return v_person;
end;
$$;
revoke execute on function public.give_role(text, text, text) from public, anon, authenticated;
