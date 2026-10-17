-- Member dashboard, Part A (product owner, 17 Oct 2026): community figures, the school today,
-- the school's priorities with members' views, optional gender, and whether someone is a confirmer.

-- Gender: optional, given by the member. Only overall figures are ever shown (sensitive under the Kenya DPA).
alter table public.member_profiles
  add column gender text check (gender is null or gender in ('female', 'male', 'prefer_not_to_say'));

-- Is the signed-in person set up to confirm members? (The Confirm menu shows only for them.)
create or replace function public.is_confirmer()
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  v_settings public.module_settings%rowtype;
  v_roles jsonb := '[]';
  v_cat text;
begin
  select * into v_settings from public.module_settings where module_key = 'verification';
  if not coalesce(v_settings.enabled, false) then
    return false;
  end if;
  for v_cat in select jsonb_object_keys(coalesce(v_settings.config, '{}')) loop
    v_roles := v_roles || coalesce(v_settings.config -> v_cat, '[]');
  end loop;
  return (v_roles ? 'admin' and public.is_admin())
      or (v_roles ? 'verifier' and public.has_role('verifier'))
      or (v_roles ? 'cohort_rep' and public.has_role('cohort_rep'))
      or (v_roles ? 'cluster_rep' and public.has_role('cluster_rep'));
end;
$$;
revoke execute on function public.is_confirmer() from public, anon;
grant execute on function public.is_confirmer() to authenticated;

-- Who may update the school's figures and priorities: administrators and the school liaison.
create or replace function public.can_edit_school()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.has_role('school_liaison'); $$;
grant execute on function public.can_edit_school() to anon, authenticated;

-- The school today. Each update is a new row (history kept); the latest is shown.
create table public.school_stats (
  id uuid primary key default gen_random_uuid(),
  as_of date not null,
  students int not null check (students >= 0),
  needy_students int check (needy_students is null or needy_students >= 0),
  supported_by_alumni int check (supported_by_alumni is null or supported_by_alumni >= 0),
  teachers int check (teachers is null or teachers >= 0),
  note text not null default '' check (length(note) <= 500),
  recorded_by uuid references public.persons (id),
  created_at timestamptz not null default now()
);
create index school_stats_as_of_idx on public.school_stats (as_of desc, created_at desc);
create index school_stats_recorded_by_idx on public.school_stats (recorded_by);

-- Academic performance, one row per year (e.g. KCSE mean score).
create table public.academic_results (
  id uuid primary key default gen_random_uuid(),
  year int not null unique check (year between 1970 and 2100),
  measure text not null default 'KCSE mean score' check (length(measure) between 2 and 60),
  value numeric(6, 3) not null,
  grade text check (grade is null or length(grade) <= 4),
  candidates int check (candidates is null or candidates >= 0),
  note text not null default '' check (length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The school's current priorities, in order. Members may say how important each is and comment.
create table public.school_priorities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 120),
  description text not null default '' check (length(description) <= 600),
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index school_priorities_order_idx on public.school_priorities (status, sort_order);

create table public.priority_views (
  id uuid primary key default gen_random_uuid(),
  priority_id uuid not null references public.school_priorities (id),
  person_id uuid not null references public.persons (id),
  importance int not null check (importance between 1 and 5),  -- 1 not important … 5 very important
  comment text not null default '' check (length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (priority_id, person_id)
);
create index priority_views_person_idx on public.priority_views (person_id);

create trigger academic_results_updated_at before update on public.academic_results for each row execute function public.set_updated_at();
create trigger school_priorities_updated_at before update on public.school_priorities for each row execute function public.set_updated_at();
create trigger priority_views_updated_at before update on public.priority_views for each row execute function public.set_updated_at();
create trigger school_stats_audit after insert or update or delete on public.school_stats for each row execute function public.audit_row();
create trigger academic_results_audit after insert or update or delete on public.academic_results for each row execute function public.audit_row();
create trigger school_priorities_audit after insert or update or delete on public.school_priorities for each row execute function public.audit_row();
create trigger priority_views_audit after insert or update or delete on public.priority_views for each row execute function public.audit_row();

alter table public.school_stats enable row level security;
alter table public.academic_results enable row level security;
alter table public.school_priorities enable row level security;
alter table public.priority_views enable row level security;

-- School figures are for members (and the people who keep them up to date).
create policy "school stats members read" on public.school_stats for select to authenticated
  using (public.is_member() or public.can_edit_school());
create policy "school stats editors insert" on public.school_stats for insert to authenticated with check (public.can_edit_school());

create policy "results members read" on public.academic_results for select to authenticated
  using (public.is_member() or public.can_edit_school());
create policy "results editors insert" on public.academic_results for insert to authenticated with check (public.can_edit_school());
create policy "results editors update" on public.academic_results for update to authenticated
  using (public.can_edit_school()) with check (public.can_edit_school());

create policy "priorities members read" on public.school_priorities for select to authenticated
  using ((status = 'published' and public.is_member()) or public.can_edit_school());
create policy "priorities editors insert" on public.school_priorities for insert to authenticated with check (public.can_edit_school());
create policy "priorities editors update" on public.school_priorities for update to authenticated
  using (public.can_edit_school()) with check (public.can_edit_school());

-- A member sees and changes only their own view; editors read all views.
create policy "views own or editors read" on public.priority_views for select to authenticated
  using (person_id = public.current_person_id() or public.can_edit_school());
create policy "views own insert" on public.priority_views for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member());
create policy "views own update" on public.priority_views for update to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

-- Priorities with overall support, for members (no names, no comments).
create or replace function public.priority_summary()
returns table (id uuid, title text, description text, sort_order int, responses bigint, average numeric, my_importance int, my_comment text)
language sql stable security definer set search_path = ''
as $$
  select sp.id, sp.title, sp.description, sp.sort_order,
         count(pv.id), round(avg(pv.importance), 1),
         max(case when pv.person_id = public.current_person_id() then pv.importance end),
         max(case when pv.person_id = public.current_person_id() then pv.comment end)
  from public.school_priorities sp
  left join public.priority_views pv on pv.priority_id = sp.id
  where sp.status = 'published' and (public.is_member() or public.can_edit_school())
  group by sp.id
  order by sp.sort_order, sp.title;
$$;
revoke execute on function public.priority_summary() from public, anon;
grant execute on function public.priority_summary() to authenticated;

-- Community figures for the dashboard. Groups smaller than 5 are reported as null ("fewer than 5").
create or replace function public.dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_me uuid := public.current_person_id();
  v_mine public.member_profiles%rowtype;
  v_result jsonb;
begin
  if not public.is_member() then
    return null;
  end if;
  select * into v_mine from public.member_profiles where person_id = v_me;

  with m as (
    select mp.*, mc.key as category, cl.name as region
    from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    join public.member_categories mc on mc.id = mp.category_id
    left join public.clusters cl on cl.id = mp.cluster_id
    where mp.membership_status <> 'terminated'
  ),
  classes as (
    select year_left, count(*) as n, rank() over (order by count(*) desc) as r
    from m where category = 'alumnus' and year_left is not null group by year_left
  ),
  g as (select gender, count(*) as n from m where gender in ('female', 'male') group by gender)
  select jsonb_build_object(
    'total', (select count(*) from m),
    'alumni', (select count(*) from m where category = 'alumnus'),
    'friends', (select count(*) from m where category = 'friend'),
    'classes_represented', (select count(*) from classes),
    'my_class', v_mine.year_left,
    'my_class_count', (select n from classes where year_left = v_mine.year_left),
    'my_class_rank', (select r from classes where year_left = v_mine.year_left),
    'my_region', (select name from public.clusters where id = v_mine.cluster_id),
    'my_region_count', (select count(*) from m where cluster_id = v_mine.cluster_id),
    'regions', coalesce((select jsonb_agg(jsonb_build_object('name', region, 'count', case when n >= 5 then n end) order by n desc)
                         from (select region, count(*) as n from m where region is not null group by region) x), '[]'),
    'top_classes', coalesce((select jsonb_agg(jsonb_build_object('year', year_left, 'count', n) order by n desc, year_left)
                             from (select * from classes order by n desc, year_left limit 5) x), '[]'),
    'female', (select case when n >= 5 then n end from g where gender = 'female'),
    'male', (select case when n >= 5 then n end from g where gender = 'male'),
    'gender_answered', (select coalesce(sum(n), 0) from g),
    'sponsors', (select count(*) from public.supporters where kind = 'sponsor' and status = 'published'),
    'partners', (select count(*) from public.supporters where kind = 'partner' and status = 'published'),
    'live_causes', (select count(*) from public.causes where lifecycle in ('live', 'construction', 'preparation'))
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
