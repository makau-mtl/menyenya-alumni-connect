-- Membership standing (product owner, 17 Oct 2026).
--   Active   = paid up for the current calendar year (Jan–Dec). Only active members vote and take part in decisions.
--   Inactive = not paid up.
--   Grace: last year's paid-up members stay active until 31 March, with reminders to renew.
--   No arrears: a member pays only for the year they want to be active, and may skip years.
--   While membership fees are switched off, every current member is active.
-- Paid years are recorded once each (append-only). M4 records them automatically from payments;
-- until then only the Treasurer or an administrator can record one.

create table public.membership_years (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id),
  year int not null check (year between 2020 and 2100),
  payment_id uuid references public.payments (id),
  recorded_by uuid references public.persons (id),
  note text not null default '' check (length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (person_id, year)
);
create index membership_years_payment_idx on public.membership_years (payment_id);
create index membership_years_recorded_by_idx on public.membership_years (recorded_by);
create trigger membership_years_audit after insert or update or delete on public.membership_years for each row execute function public.audit_row();

alter table public.membership_years enable row level security;
create policy "membership years own or finance read" on public.membership_years for select to authenticated
  using (person_id = public.current_person_id() or public.is_finance() or public.is_admin());
create policy "membership years finance insert" on public.membership_years for insert to authenticated
  with check (public.has_role('treasurer') or public.is_admin());
-- No update or delete: a paid year, once recorded, stays recorded.

-- Today in Kenya.
create or replace function public.nairobi_today()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Africa/Nairobi')::date; $$;

-- The rule itself. Internal: callers below decide who may see whose standing.
-- Returns 'active', 'inactive', or null for someone who is not a current member.
create or replace function public.standing_of(p_person uuid, p_on date default null)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  v_on date := coalesce(p_on, public.nairobi_today());
  v_year int := extract(year from v_on)::int;
begin
  if not exists (select 1 from public.member_profiles mp join public.persons p on p.id = mp.person_id
                 where mp.person_id = p_person and mp.membership_status <> 'terminated' and p.status = 'active') then
    return null;
  end if;
  if not coalesce((select enabled from public.module_settings where module_key = 'membership_fees'), false) then
    return 'active';
  end if;
  if exists (select 1 from public.membership_years where person_id = p_person and year = v_year) then
    return 'active';
  end if;
  if v_on <= make_date(v_year, 3, 31)
     and exists (select 1 from public.membership_years where person_id = p_person and year = v_year - 1) then
    return 'active';
  end if;
  return 'inactive';
end;
$$;
revoke execute on function public.standing_of(uuid, date) from public, anon, authenticated;

-- May this person vote and take part in decisions? For the elections and decisions modules.
create or replace function public.is_voting_member(p_person uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select public.standing_of(p_person) = 'active'; $$;
revoke execute on function public.is_voting_member(uuid) from public, anon, authenticated;

-- The signed-in member's own standing, for their home page.
create or replace function public.my_standing()
returns table (standing text, fees_on boolean, this_year int, paid_this_year boolean, paid_last_year boolean, in_grace boolean, grace_ends date)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.current_person_id() as pid, public.nairobi_today() as today),
  y as (select pid, today, extract(year from today)::int as yr from me)
  select public.standing_of(y.pid, y.today),
         coalesce((select enabled from public.module_settings where module_key = 'membership_fees'), false),
         y.yr,
         exists (select 1 from public.membership_years where person_id = y.pid and year = y.yr),
         exists (select 1 from public.membership_years where person_id = y.pid and year = y.yr - 1),
         y.today <= make_date(y.yr, 3, 31)
           and not exists (select 1 from public.membership_years where person_id = y.pid and year = y.yr)
           and exists (select 1 from public.membership_years where person_id = y.pid and year = y.yr - 1),
         make_date(y.yr, 3, 31)
  from y where y.pid is not null;
$$;
revoke execute on function public.my_standing() from public, anon;
grant execute on function public.my_standing() to authenticated;

-- Everyone's standing, for administrators and the finance team (members list, voting lists).
create or replace function public.member_standings()
returns table (person_id uuid, standing text)
language sql stable security definer set search_path = ''
as $$
  select mp.person_id, public.standing_of(mp.person_id)
  from public.member_profiles mp
  where (public.is_admin() or public.is_finance()) and mp.membership_status <> 'terminated';
$$;
revoke execute on function public.member_standings() from public, anon;
grant execute on function public.member_standings() to authenticated;
