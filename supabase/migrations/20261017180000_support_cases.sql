-- Cases for support, Part D (product owner, 17 Oct 2026). Any member can raise a case — a member in need,
-- a needy student, a project or idea, or anything else — and each is reviewed and answered privately.
-- Who handles which kind: administrators and the Chairman see all; the Welfare Coordinator handles members
-- in need; the school liaison handles needy students; the Secretary handles projects, ideas and other cases.
-- Opening a case is logged. Nothing is deleted.

create type public.case_kind as enum ('member_in_need', 'needy_student', 'project_idea', 'other');
create type public.case_status as enum ('submitted', 'under_review', 'responded', 'closed');

create or replace function public.can_handle_case(p_kind public.case_kind)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or public.has_role('chair')
      or (p_kind = 'member_in_need' and public.has_role('welfare_coordinator'))
      or (p_kind = 'needy_student' and public.has_role('school_liaison'))
      or (p_kind in ('project_idea', 'other') and public.has_role('secretary'));
$$;
grant execute on function public.can_handle_case(public.case_kind) to authenticated;

create or replace function public.can_handle_cases()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or public.has_role('chair') or public.has_role('welfare_coordinator')
      or public.has_role('school_liaison') or public.has_role('secretary');
$$;
grant execute on function public.can_handle_cases() to anon, authenticated;

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('CASE-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))),
  person_id uuid not null references public.persons (id),           -- who raised it
  kind public.case_kind not null,
  title text not null check (length(trim(title)) between 3 and 120),
  details text not null check (length(trim(details)) between 10 and 4000),
  help_needed text not null default '' check (length(help_needed) <= 1000),
  may_share boolean not null default false,                          -- the handlers may share it to rally support
  status public.case_status not null default 'submitted',
  handled_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_cases_person_idx on public.support_cases (person_id, created_at desc);
create index support_cases_status_idx on public.support_cases (status, kind, created_at desc);
create index support_cases_handled_by_idx on public.support_cases (handled_by);

create table public.case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases (id),
  author_id uuid not null references public.persons (id),
  body text not null check (length(trim(body)) between 1 and 4000),
  visible_to_raiser boolean not null default true,                   -- false: an internal note between handlers
  created_at timestamptz not null default now()
);
create index case_updates_case_idx on public.case_updates (case_id, created_at);
create index case_updates_author_idx on public.case_updates (author_id);

create trigger support_cases_updated_at before update on public.support_cases for each row execute function public.set_updated_at();
create trigger support_cases_audit after insert or update or delete on public.support_cases for each row execute function public.audit_row();
create trigger case_updates_audit after insert or update or delete on public.case_updates for each row execute function public.audit_row();
create trigger case_updates_no_change before update or delete on public.case_updates for each row execute function public.forbid_change();

-- Handlers change only the status and who handles it; what was raised stays as written.
create or replace function public.support_cases_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (new.reference, new.person_id, new.kind, new.title, new.details, new.help_needed, new.may_share, new.created_at)
     is distinct from (old.reference, old.person_id, old.kind, old.title, old.details, old.help_needed, old.may_share, old.created_at) then
    raise exception 'A case cannot be rewritten once raised; add an update instead';
  end if;
  return new;
end;
$$;
create trigger support_cases_guard before update on public.support_cases for each row execute function public.support_cases_guard();

alter table public.support_cases enable row level security;
alter table public.case_updates enable row level security;

create policy "cases own or handler read" on public.support_cases for select to authenticated
  using (person_id = public.current_person_id() or public.can_handle_case(kind));
create policy "cases members raise" on public.support_cases for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member() and status = 'submitted' and handled_by is null);
create policy "cases handler update" on public.support_cases for update to authenticated
  using (public.can_handle_case(kind)) with check (public.can_handle_case(kind));

create policy "case updates read" on public.case_updates for select to authenticated
  using (exists (select 1 from public.support_cases c where c.id = case_id
                 and (public.can_handle_case(c.kind) or (c.person_id = public.current_person_id() and visible_to_raiser))));
create policy "case updates write" on public.case_updates for insert to authenticated
  with check (author_id = public.current_person_id() and exists (
    select 1 from public.support_cases c where c.id = case_id
      and (public.can_handle_case(c.kind) or (c.person_id = public.current_person_id() and visible_to_raiser and c.status <> 'closed'))));

-- Opening a case records who looked and when.
create or replace function public.log_case_view(p_case uuid)
returns void language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_case public.support_cases%rowtype;
begin
  select * into v_case from public.support_cases where id = p_case;
  if v_case.id is null or not public.can_handle_case(v_case.kind) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.sensitive_access_log (viewer_person_id, subject_person_id, data_kind, reason)
  values (public.current_person_id(), v_case.person_id, 'support_case', v_case.reference);
end;
$$;
revoke execute on function public.log_case_view(uuid) from public, anon;
grant execute on function public.log_case_view(uuid) to authenticated;

-- A case with the names of the people involved, for handlers (and the raiser, for their own).
create or replace function public.case_thread(p_case uuid)
returns table (id uuid, author_name text, mine boolean, from_handler boolean, body text, visible_to_raiser boolean, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select u.id, p.full_name, u.author_id = public.current_person_id(), u.author_id <> c.person_id, u.body, u.visible_to_raiser, u.created_at
  from public.case_updates u
  join public.support_cases c on c.id = u.case_id
  join public.persons p on p.id = u.author_id
  where u.case_id = p_case
    and (public.can_handle_case(c.kind) or (c.person_id = public.current_person_id() and u.visible_to_raiser))
  order by u.created_at;
$$;
revoke execute on function public.case_thread(uuid) from public, anon;
grant execute on function public.case_thread(uuid) to authenticated;

-- The list for handlers, with who raised each case.
create or replace function public.cases_for_handler(p_status text default null)
returns table (id uuid, reference text, kind public.case_kind, title text, status public.case_status, raised_by text, year_left int,
               created_at timestamptz, updated_at timestamptz, updates bigint)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.reference, c.kind, c.title, c.status, p.full_name, mp.year_left, c.created_at, c.updated_at,
         (select count(*) from public.case_updates u where u.case_id = c.id)
  from public.support_cases c
  join public.persons p on p.id = c.person_id
  left join public.member_profiles mp on mp.person_id = c.person_id
  where public.can_handle_case(c.kind) and (p_status is null or c.status::text = p_status
        or (p_status = 'open' and c.status <> 'closed'))
  order by (c.status = 'submitted') desc, c.updated_at desc
  limit 300;
$$;
revoke execute on function public.cases_for_handler(text) from public, anon;
grant execute on function public.cases_for_handler(text) to authenticated;
