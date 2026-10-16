-- Row-Level Security on every table, default deny. SPEC §4.3, §12.
-- Visitors (anon) can read only public reference data; they give through give()/make_pledge().
-- No table has a delete policy: records change status instead of being deleted.

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Small helpers that keep the rules readable.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.has_role('admin'); $$;

create or replace function public.is_finance()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.has_role('admin') or public.has_role('treasurer') or public.has_role('chair'); $$;

-- Can the signed-in person manage this person (as admin, verifier, or their cohort/cluster rep)?
create or replace function public.can_manage_person(p_person uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.has_role('admin')
      or public.has_role('verifier')
      or exists (
        select 1 from public.member_profiles mp
        where mp.person_id = p_person
          and (
            (mp.cohort_id is not null and public.has_role('cohort_rep', 'cohort', mp.cohort_id))
            or (mp.cluster_id is not null and public.has_role('cluster_rep', 'cluster', mp.cluster_id))
          )
      );
$$;

-- Reference data: readable by everyone, changed only by admins ------------------------------

do $$
declare t text;
begin
  foreach t in array array['member_categories', 'membership_levels', 'clusters', 'counties', 'cohorts', 'roles',
                           'committees', 'payment_channels', 'funds']
  loop
    execute format('create policy "%s readable" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('create policy "%s admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t, t);
    execute format('create policy "%s admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end;
$$;

create policy "causes readable" on public.causes for select to anon, authenticated
  using (
    (visibility = 'public' and lifecycle in ('preparation', 'live', 'construction', 'closed'))
    or (visibility = 'members' and public.current_person_id() is not null)
    or public.is_admin()
  );
create policy "causes admin insert" on public.causes for insert to authenticated with check (public.is_admin());
create policy "causes admin update" on public.causes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "offline pledges readable" on public.cause_offline_pledges for select to anon, authenticated using (true);
create policy "offline pledges finance insert" on public.cause_offline_pledges for insert to authenticated
  with check (public.is_finance());

-- People ----------------------------------------------------------------------------------

create policy "persons read" on public.persons for select to authenticated
  using (id = public.current_person_id() or public.can_manage_person(id) or public.is_finance());
create policy "persons update own" on public.persons for update to authenticated
  using (id = public.current_person_id() or public.is_admin())
  with check (id = public.current_person_id() or public.is_admin());
create policy "persons admin insert" on public.persons for insert to authenticated with check (public.is_admin());

create policy "contacts read" on public.person_contacts for select to authenticated
  using (person_id = public.current_person_id() or public.can_manage_person(person_id) or public.is_finance());
create policy "contacts insert" on public.person_contacts for insert to authenticated
  with check (person_id = public.current_person_id() or public.is_admin());
create policy "contacts update" on public.person_contacts for update to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

create policy "organizations read" on public.organizations for select to authenticated
  using (contact_person_id = public.current_person_id() or public.is_finance());
create policy "organizations admin write" on public.organizations for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "profiles read" on public.member_profiles for select to authenticated
  using (person_id = public.current_person_id() or public.can_manage_person(person_id));
create policy "profiles insert own" on public.member_profiles for insert to authenticated
  with check (person_id = public.current_person_id() or public.is_admin());
create policy "profiles update" on public.member_profiles for update to authenticated
  using (person_id = public.current_person_id() or public.can_manage_person(person_id))
  with check (person_id = public.current_person_id() or public.can_manage_person(person_id));

-- Next of kin: the member, admin and welfare coordinator only. Never reps, never the directory.
create policy "next of kin read" on public.next_of_kin for select to authenticated
  using (person_id = public.current_person_id() or public.is_admin() or public.has_role('welfare_coordinator'));
create policy "next of kin insert" on public.next_of_kin for insert to authenticated
  with check (person_id = public.current_person_id() or public.is_admin());
create policy "next of kin update" on public.next_of_kin for update to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

create policy "consents read" on public.consents for select to authenticated
  using (person_id = public.current_person_id() or public.is_admin());
create policy "consents insert own" on public.consents for insert to authenticated
  with check (person_id = public.current_person_id());

create policy "duplicates read" on public.duplicate_flags for select to authenticated
  using (public.is_admin() or public.has_role('verifier'));
create policy "duplicates resolve" on public.duplicate_flags for update to authenticated
  using (public.is_admin() or public.has_role('verifier'))
  with check (public.is_admin() or public.has_role('verifier'));

-- Roles: only admins assign; people see their own; chair sees all.
create policy "assignments read" on public.role_assignments for select to authenticated
  using (person_id = public.current_person_id() or public.is_admin() or public.has_role('chair'));
create policy "assignments admin insert" on public.role_assignments for insert to authenticated
  with check (public.is_admin() and person_id <> public.current_person_id());
create policy "assignments admin update" on public.role_assignments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Giving and money ----------------------------------------------------------------------------

create policy "donations read" on public.donations for select to authenticated
  using (donor_person_id = public.current_person_id() or public.is_finance());
create policy "donations finance update" on public.donations for update to authenticated
  using (public.is_finance()) with check (public.is_finance());

create policy "recurring read" on public.recurring_gifts for select to authenticated
  using (donor_person_id = public.current_person_id() or public.is_finance());
create policy "recurring update" on public.recurring_gifts for update to authenticated
  using (donor_person_id = public.current_person_id() or public.is_finance())
  with check (donor_person_id = public.current_person_id() or public.is_finance());

create policy "pledges read" on public.pledges for select to authenticated
  using (pledger_person_id = public.current_person_id() or public.is_finance());
create policy "pledges finance insert" on public.pledges for insert to authenticated
  with check (public.is_finance());
create policy "pledges finance update" on public.pledges for update to authenticated
  using (public.is_finance()) with check (public.is_finance());

create policy "schedules read" on public.pledge_schedules for select to authenticated
  using (public.is_finance() or exists (
    select 1 from public.pledges p where p.id = pledge_id and p.pledger_person_id = public.current_person_id()));

create policy "payments read" on public.payments for select to authenticated
  using (public.is_finance() or payer_person_id = public.current_person_id());
create policy "payments treasurer insert" on public.payments for insert to authenticated
  with check ((public.has_role('treasurer') or public.is_admin()) and entry_method = 'manual'
              and entered_by = public.current_person_id());
create policy "payments treasurer status" on public.payments for update to authenticated
  using (public.has_role('treasurer') or public.is_admin())
  with check (public.has_role('treasurer') or public.is_admin());

create policy "allocations read" on public.payment_allocations for select to authenticated
  using (public.is_finance());
create policy "allocations treasurer insert" on public.payment_allocations for insert to authenticated
  with check ((public.has_role('treasurer') or public.is_admin()) and created_by = public.current_person_id());

-- Logs: admins read; nobody writes directly (triggers and log_audit() do).
create policy "audit read" on public.audit_log for select to authenticated using (public.is_admin());
create policy "sensitive log read" on public.sensitive_access_log for select to authenticated using (public.is_admin());

-- Sequences used by give()/make_pledge() run as the function owner; no direct access needed.
revoke all on sequence public.pledge_ref_seq, public.donation_ref_seq from anon, authenticated;
