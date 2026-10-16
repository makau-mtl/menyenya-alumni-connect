-- M6 member area (SPEC §6.3, §6.3a, §6.4): directory, public profiles, configurable confirmation,
-- duplicate merging with undo, terminating membership with a rejoin window.

-- The member's latest choice for a consent purpose.
create or replace function public.has_consent(p_person uuid, p_purpose public.consent_purpose)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select c.granted from public.consents c
    where c.person_id = p_person and c.purpose = p_purpose
    order by c.created_at desc limit 1), false);
$$;

-- Terminated members no longer count as members.
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.member_profiles
                 where person_id = public.current_person_id() and membership_status <> 'terminated');
$$;

-- New profile fields ---------------------------------------------------------------------------------
alter table public.member_profiles
  add column confirmation_note text,
  add column terminated_at timestamptz,
  add column termination_reason text check (termination_reason is null or length(termination_reason) <= 500),
  add column rejoin_until timestamptz,
  add column deletion_requested_at timestamptz,
  add column status_before_termination public.membership_status,
  add column consents_before_termination jsonb;

insert into public.module_settings (module_key, enabled, config) values
  ('verification', false, '{"alumnus": ["cohort_rep", "verifier", "admin"], "friend": ["verifier", "admin"]}'),
  ('membership_exit', true, '{"rejoin_days": 30}')
on conflict (module_key) do nothing;

-- Directory ------------------------------------------------------------------------------------------
-- Signed-in members see members who agreed to be listed. Never phone or email.
create or replace function public.directory_search(
  p_query text default null, p_year int default null, p_region text default null,
  p_category text default null, p_mentoring text default null, p_limit int default 48, p_offset int default 0)
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, region text,
               headline text, profession text, skills text[], mentoring_offer public.mentoring_offer,
               photo_path text, total bigint)
language sql stable security definer set search_path = ''
as $$
  with listed as (
    select p.id, p.full_name, mc.key as category, mp.year_left, mp.relationship_to_school, cl.name as region,
           mp.headline, mp.profession, mp.skills, mp.mentoring_offer, mp.photo_path, mp.employer_or_business
    from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    join public.member_categories mc on mc.id = mp.category_id
    left join public.clusters cl on cl.id = mp.cluster_id
    where (public.is_member() or public.is_admin())
      and mp.membership_status <> 'terminated'
      and public.has_consent(p.id, 'directory_listing')
  )
  select l.id, l.full_name, l.category, l.year_left, l.relationship_to_school, l.region, l.headline,
         l.profession, l.skills, l.mentoring_offer, l.photo_path, count(*) over ()
  from listed l
  where (p_year is null or l.year_left = p_year)
    and (nullif(p_region, '') is null or l.region = p_region)
    and (nullif(p_category, '') is null or l.category = p_category)
    and (nullif(p_mentoring, '') is null or l.mentoring_offer::text = p_mentoring)
    and (nullif(trim(p_query), '') is null
         or strpos(lower(l.full_name), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.headline, '')), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.profession, '')), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.employer_or_business, '')), lower(trim(p_query))) > 0
         or exists (select 1 from unnest(l.skills) s where strpos(lower(s), lower(trim(p_query))) > 0))
  order by l.full_name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;
revoke execute on function public.directory_search(text, int, text, text, text, int, int) from public, anon;
grant execute on function public.directory_search(text, int, text, text, text, int, int) to authenticated;

-- One member's card in the directory (same rule: listed members only).
create or replace function public.directory_member(p_person uuid)
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, region text,
               level text, headline text, profession text, employer text, products_services text, skills text[],
               mentoring_offer public.mentoring_offer, willing_to_volunteer boolean, linkedin_url text,
               profile_link text, social_links jsonb, photo_path text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, mc.key, mp.year_left, mp.relationship_to_school, cl.name, ml.name, mp.headline,
         mp.profession, mp.employer_or_business, mp.products_services, mp.skills, mp.mentoring_offer,
         mp.willing_to_volunteer, mp.linkedin_url, mp.profile_link, mp.social_links, mp.photo_path
  from public.member_profiles mp
  join public.persons p on p.id = mp.person_id and p.status = 'active'
  join public.member_categories mc on mc.id = mp.category_id
  left join public.clusters cl on cl.id = mp.cluster_id
  left join public.membership_levels ml on ml.id = mp.level_id
  where mp.person_id = p_person
    and mp.membership_status <> 'terminated'
    and (public.is_member() or public.is_admin())
    and (public.has_consent(p.id, 'directory_listing') or p.id = public.current_person_id() or public.is_admin());
$$;
revoke execute on function public.directory_member(uuid) from public, anon;
grant execute on function public.directory_member(uuid) to authenticated;

-- Public profile: only members who switched it on. Name, class, summary, links and photo; nothing else.
create or replace function public.public_profile(p_person uuid)
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, headline text,
               profession text, linkedin_url text, profile_link text, social_links jsonb, photo_path text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, mc.key, mp.year_left, mp.relationship_to_school, mp.headline, mp.profession,
         mp.linkedin_url, mp.profile_link, mp.social_links, mp.photo_path
  from public.member_profiles mp
  join public.persons p on p.id = mp.person_id and p.status = 'active'
  join public.member_categories mc on mc.id = mp.category_id
  where mp.person_id = p_person
    and mp.membership_status <> 'terminated'
    and public.has_consent(p.id, 'public_profile');
$$;
grant execute on function public.public_profile(uuid) to anon, authenticated;

-- Photos: also visible to anyone when the owner has a public profile.
create or replace function public.member_photo_public(p_folder text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.member_profiles mp
    where mp.person_id::text = p_folder and mp.membership_status <> 'terminated'
      and public.has_consent(mp.person_id, 'public_profile'));
$$;

create or replace function public.member_photo_visible(p_folder text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_folder = public.current_person_id()::text
      or public.is_admin()
      or public.member_photo_public(p_folder)
      or (public.is_member() and exists (
            select 1 from public.member_profiles mp
            where mp.person_id::text = p_folder and mp.membership_status <> 'terminated'
              and public.has_consent(mp.person_id, 'directory_listing')));
$$;

create policy "member photos public view" on storage.objects for select to anon
  using (bucket_id = 'member-photos' and public.member_photo_public(split_part(name, '/', 1)));

-- Confirmation (verification), switchable, with configurable confirming roles ------------------------
create or replace function public.can_confirm(p_person uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  v_settings public.module_settings%rowtype;
  v_profile public.member_profiles%rowtype;
  v_category text;
  v_roles jsonb;
begin
  select * into v_settings from public.module_settings where module_key = 'verification';
  if not coalesce(v_settings.enabled, false) or p_person = public.current_person_id() then
    return false;
  end if;
  select * into v_profile from public.member_profiles where person_id = p_person;
  if v_profile.id is null then
    return false;
  end if;
  select key into v_category from public.member_categories where id = v_profile.category_id;
  v_roles := coalesce(v_settings.config -> v_category, '[]');
  return (v_roles ? 'admin' and public.is_admin())
      or (v_roles ? 'verifier' and public.has_role('verifier'))
      or (v_roles ? 'cohort_rep' and v_profile.cohort_id is not null and public.has_role('cohort_rep', 'cohort', v_profile.cohort_id))
      or (v_roles ? 'cluster_rep' and v_profile.cluster_id is not null and public.has_role('cluster_rep', 'cluster', v_profile.cluster_id));
end;
$$;

create or replace function public.confirmations_waiting()
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, region text,
               class_or_stream text, registered_at timestamptz, confirmation_note text, open_duplicates int)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, mc.key, mp.year_left, mp.relationship_to_school, cl.name, mp.class_or_stream,
         mp.registered_at, mp.confirmation_note,
         (select count(*)::int from public.duplicate_flags d
          where d.status = 'open' and (d.person_a_id = p.id or d.person_b_id = p.id))
  from public.member_profiles mp
  join public.persons p on p.id = mp.person_id and p.status = 'active'
  join public.member_categories mc on mc.id = mp.category_id
  left join public.clusters cl on cl.id = mp.cluster_id
  where mp.membership_status = 'registered' and public.can_confirm(p.id)
  order by mp.registered_at;
$$;
grant execute on function public.confirmations_waiting() to authenticated;

create or replace function public.confirm_member(p_person uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_confirm(p_person) then
    raise exception 'You can''t confirm this member' using errcode = '42501';
  end if;
  if p_decision = 'confirm' then
    update public.member_profiles
    set membership_status = 'verified', verified_by = public.current_person_id(), verified_at = now(),
        confirmation_note = nullif(trim(coalesce(p_note, '')), '')
    where person_id = p_person and membership_status = 'registered';
  elsif p_decision = 'flag' then
    if length(trim(coalesce(p_note, ''))) < 5 then
      raise exception 'Say what needs checking' using errcode = '22023';
    end if;
    update public.member_profiles set confirmation_note = trim(p_note) where person_id = p_person;
  else
    raise exception 'Unknown decision' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.confirm_member(uuid, text, text) from public, anon;
grant execute on function public.confirm_member(uuid, text, text) to authenticated;

-- Merging duplicate records, with undo -----------------------------------------------------------------
create table public.person_merges (
  id uuid primary key default gen_random_uuid(),
  survivor_id uuid not null references public.persons (id),
  merged_id uuid not null references public.persons (id),
  moved jsonb not null,
  note text,
  merged_by uuid references public.persons (id),
  undone_at timestamptz,
  undone_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index person_merges_survivor_idx on public.person_merges (survivor_id);
create index person_merges_merged_idx on public.person_merges (merged_id);
create index person_merges_merged_by_idx on public.person_merges (merged_by);
create index person_merges_undone_by_idx on public.person_merges (undone_by);
create trigger person_merges_updated_at before update on public.person_merges for each row execute function public.set_updated_at();
create trigger person_merges_audit after insert or update on public.person_merges for each row execute function public.audit_row();
alter table public.person_merges enable row level security;
create policy "merges read" on public.person_merges for select to authenticated
  using (public.is_admin() or public.has_role('verifier'));

-- A payment's payer may change only while records are being merged (or the merge undone).
create or replace function public.payments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payments cannot be deleted; reverse them instead' using errcode = '42501';
  end if;
  if coalesce(current_setting('app.merging', true), '') = 'on' then
    if (to_jsonb(new) - 'payer_person_id' - 'updated_at') <> (to_jsonb(old) - 'payer_person_id' - 'updated_at') then
      raise exception 'only the payer can change during a merge' using errcode = '42501';
    end if;
    return new;
  end if;
  if (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'only a payment''s status can change after it is recorded' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.merge_persons(p_survivor uuid, p_merged uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  s public.persons%rowtype;
  m public.persons%rowtype;
  v_moved jsonb := '{}';
  v_ids uuid[];
  v_merge uuid;
begin
  if not (public.is_admin() or public.has_role('verifier')) then
    raise exception 'Only administrators and verifiers can merge records' using errcode = '42501';
  end if;
  select * into s from public.persons where id = p_survivor and status = 'active';
  select * into m from public.persons where id = p_merged and status = 'active';
  if s.id is null or m.id is null or s.id = m.id then
    raise exception 'Choose two different, current records' using errcode = '22023';
  end if;
  if s.user_id is not null and m.user_id is not null then
    raise exception 'Both records have their own login. Ask the person which account they use, then merge again later.' using errcode = '22023';
  end if;
  perform set_config('app.merging', 'on', true);

  with u as (update public.donations set donor_person_id = s.id where donor_person_id = m.id returning id)
  select coalesce(array_agg(id), '{}') into v_ids from u;
  v_moved := v_moved || jsonb_build_object('donations', v_ids);
  with u as (update public.pledges set pledger_person_id = s.id where pledger_person_id = m.id returning id)
  select coalesce(array_agg(id), '{}') into v_ids from u;
  v_moved := v_moved || jsonb_build_object('pledges', v_ids);
  with u as (update public.recurring_gifts set donor_person_id = s.id where donor_person_id = m.id returning id)
  select coalesce(array_agg(id), '{}') into v_ids from u;
  v_moved := v_moved || jsonb_build_object('recurring_gifts', v_ids);
  with u as (update public.payments set payer_person_id = s.id where payer_person_id = m.id returning id)
  select coalesce(array_agg(id), '{}') into v_ids from u;
  v_moved := v_moved || jsonb_build_object('payments', v_ids);

  -- The membership profile moves only if the surviving record has none.
  if not exists (select 1 from public.member_profiles where person_id = s.id) then
    with u as (update public.member_profiles set person_id = s.id where person_id = m.id returning id)
    select coalesce(array_agg(id), '{}') into v_ids from u;
    v_moved := v_moved || jsonb_build_object('profile', v_ids);
  end if;

  -- Contacts are copied to the surviving record (the originals stay on the merged record).
  with ins as (
    insert into public.person_contacts (person_id, kind, value, is_primary, is_whatsapp, country, verified_at)
    select s.id, c.kind, c.value, false, c.is_whatsapp, c.country, c.verified_at
    from public.person_contacts c where c.person_id = m.id
    on conflict (person_id, kind, value) do nothing
    returning id)
  select coalesce(array_agg(id), '{}') into v_ids from ins;
  v_moved := v_moved || jsonb_build_object('contacts_added', v_ids);

  if m.user_id is not null then
    update public.persons set user_id = null where id = m.id;
    update public.persons set user_id = m.user_id where id = s.id;
    v_moved := v_moved || jsonb_build_object('user_id', m.user_id);
  end if;

  update public.persons set status = 'merged', merged_into_id = s.id where id = m.id;
  update public.duplicate_flags set status = 'merged', resolved_by = public.current_person_id(), resolved_at = now()
  where status = 'open' and least(person_a_id, person_b_id) = least(s.id, m.id)
    and greatest(person_a_id, person_b_id) = greatest(s.id, m.id);

  insert into public.person_merges (survivor_id, merged_id, moved, note, merged_by)
  values (s.id, m.id, v_moved, nullif(trim(coalesce(p_note, '')), ''), public.current_person_id())
  returning id into v_merge;
  perform set_config('app.merging', 'off', true);
  return v_merge;
end;
$$;
revoke execute on function public.merge_persons(uuid, uuid, text) from public, anon;
grant execute on function public.merge_persons(uuid, uuid, text) to authenticated;

create or replace function public.undo_merge(p_merge uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  r public.person_merges%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can undo a merge' using errcode = '42501';
  end if;
  select * into r from public.person_merges where id = p_merge and undone_at is null;
  if r.id is null then
    raise exception 'That merge was not found or is already undone' using errcode = '22023';
  end if;
  perform set_config('app.merging', 'on', true);
  update public.donations set donor_person_id = r.merged_id
  where id = any (array(select jsonb_array_elements_text(r.moved -> 'donations')::uuid));
  update public.pledges set pledger_person_id = r.merged_id
  where id = any (array(select jsonb_array_elements_text(r.moved -> 'pledges')::uuid));
  update public.recurring_gifts set donor_person_id = r.merged_id
  where id = any (array(select jsonb_array_elements_text(r.moved -> 'recurring_gifts')::uuid));
  update public.payments set payer_person_id = r.merged_id
  where id = any (array(select jsonb_array_elements_text(r.moved -> 'payments')::uuid));
  if r.moved ? 'profile' then
    update public.member_profiles set person_id = r.merged_id
    where id = any (array(select jsonb_array_elements_text(r.moved -> 'profile')::uuid));
  end if;
  if r.moved ? 'user_id' then
    update public.persons set user_id = null where id = r.survivor_id;
    update public.persons set user_id = (r.moved ->> 'user_id')::uuid where id = r.merged_id;
  end if;
  update public.persons set status = 'active', merged_into_id = null where id = r.merged_id;
  -- The pair goes back on the list of possible duplicates.
  update public.duplicate_flags set status = 'open', resolved_by = null, resolved_at = null
  where status = 'merged' and least(person_a_id, person_b_id) = least(r.survivor_id, r.merged_id)
    and greatest(person_a_id, person_b_id) = greatest(r.survivor_id, r.merged_id);
  update public.person_merges set undone_at = now(), undone_by = public.current_person_id() where id = r.id;
  perform set_config('app.merging', 'off', true);
end;
$$;
revoke execute on function public.undo_merge(uuid) from public, anon;
grant execute on function public.undo_merge(uuid) to authenticated;

create or replace function public.dismiss_duplicate(p_flag uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or public.has_role('verifier')) then
    raise exception 'Only administrators and verifiers can resolve duplicates' using errcode = '42501';
  end if;
  update public.duplicate_flags set status = 'not_duplicate', resolved_by = public.current_person_id(), resolved_at = now()
  where id = p_flag and status = 'open';
end;
$$;
revoke execute on function public.dismiss_duplicate(uuid) from public, anon;
grant execute on function public.dismiss_duplicate(uuid) to authenticated;

-- Terminating membership and rejoining (SPEC §6.3a) --------------------------------------------------
create or replace function public.terminate_membership(p_reason text, p_delete_data boolean, p_acknowledged boolean)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare
  v_person uuid := public.current_person_id();
  v_profile public.member_profiles%rowtype;
  v_days int;
  v_until timestamptz;
  v_snapshot jsonb := '{}';
  v_purpose text;
  v_email text;
begin
  if not coalesce(p_acknowledged, false) then
    raise exception 'Please confirm you have read what terminating means' using errcode = '22023';
  end if;
  select * into v_profile from public.member_profiles where person_id = v_person;
  if v_profile.id is null or v_profile.membership_status = 'terminated' then
    raise exception 'There is no active membership to terminate' using errcode = '22023';
  end if;
  select coalesce((config ->> 'rejoin_days')::int, 30) into v_days from public.module_settings where module_key = 'membership_exit';
  v_until := now() + make_interval(days => coalesce(v_days, 30));

  foreach v_purpose in array array['directory_listing', 'public_profile', 'email_updates', 'whatsapp_updates'] loop
    v_snapshot := v_snapshot || jsonb_build_object(v_purpose, public.has_consent(v_person, v_purpose::public.consent_purpose));
    insert into public.consents (person_id, purpose, granted, wording_version)
    values (v_person, v_purpose::public.consent_purpose, false, 'termination');
  end loop;

  update public.member_profiles
  set status_before_termination = membership_status, membership_status = 'terminated', terminated_at = now(),
      termination_reason = nullif(left(trim(coalesce(p_reason, '')), 500), ''), rejoin_until = v_until,
      deletion_requested_at = case when p_delete_data then now() end, consents_before_termination = v_snapshot
  where id = v_profile.id;

  select value into v_email from public.person_contacts where person_id = v_person and kind = 'email' order by is_primary desc limit 1;
  if v_email is not null then
    insert into public.notifications (person_id, to_address, template_key, payload)
    values (v_person, v_email, 'membership_terminated',
            jsonb_build_object('rejoin_until', v_until, 'deletion_requested', coalesce(p_delete_data, false)));
  end if;
  return v_until;
end;
$$;
revoke execute on function public.terminate_membership(text, boolean, boolean) from public, anon;
grant execute on function public.terminate_membership(text, boolean, boolean) to authenticated;

create or replace function public.rejoin_membership()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_person uuid := public.current_person_id();
  v_profile public.member_profiles%rowtype;
  v_purpose text;
begin
  select * into v_profile from public.member_profiles where person_id = v_person;
  if v_profile.id is null or v_profile.membership_status <> 'terminated' then
    raise exception 'Your membership is not terminated' using errcode = '22023';
  end if;
  if v_profile.rejoin_until < now() then
    raise exception 'The rejoin window has closed. Please register again.' using errcode = '22023';
  end if;
  for v_purpose in select jsonb_object_keys(coalesce(v_profile.consents_before_termination, '{}')) loop
    insert into public.consents (person_id, purpose, granted, wording_version)
    values (v_person, v_purpose::public.consent_purpose,
            (v_profile.consents_before_termination ->> v_purpose)::boolean, 'rejoin');
  end loop;
  update public.member_profiles
  set membership_status = coalesce(status_before_termination, 'registered'), status_before_termination = null,
      terminated_at = null, termination_reason = null, rejoin_until = null, deletion_requested_at = null,
      consents_before_termination = null
  where id = v_profile.id;
end;
$$;
revoke execute on function public.rejoin_membership() from public, anon;
grant execute on function public.rejoin_membership() to authenticated;
