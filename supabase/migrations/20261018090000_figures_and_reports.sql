-- Figures on the public website, and the Reports and accountability page (product owner, 18 Oct 2026).
-- Money paid out (to the school, contractors) is reported in the financial statements, not tracked live
-- on the platform. Gifts coming in are still recorded when confirmed, for receipts and transparency.

-- Our community in numbers: totals only, for everyone. Nothing about any one person.
create or replace function public.public_figures()
returns jsonb language sql stable security definer set search_path = ''
as $$
  with m as (
    select mp.year_left, mp.cluster_id, mc.key as category
    from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    join public.member_categories mc on mc.id = mp.category_id
    where mp.membership_status <> 'terminated'
  ),
  s as (select * from public.school_stats order by as_of desc, created_at desc limit 1)
  select jsonb_build_object(
    'members', (select count(*) from m),
    'alumni', (select count(*) from m where category = 'alumnus'),
    'friends', (select count(*) from m where category = 'friend'),
    'classes', (select count(distinct year_left) from m where category = 'alumnus' and year_left is not null),
    'regions', (select count(distinct cluster_id) from m where cluster_id is not null),
    'students', (select students from s),
    'needy_students', (select needy_students from s),
    'supported_by_alumni', (select supported_by_alumni from s),
    'school_as_of', (select as_of from s)
  );
$$;
grant execute on function public.public_figures() to anon, authenticated;

-- Who publishes reports: the Treasurer (financial), the Chairman (moral report), administrators (any).
create or replace function public.can_publish_report(p_kind text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or (p_kind = 'financial' and public.has_role('treasurer'))
      or (p_kind = 'moral' and public.has_role('chair'));
$$;
revoke execute on function public.can_publish_report(text) from public, anon;
grant execute on function public.can_publish_report(text) to authenticated;

create or replace function public.can_manage_reports()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.has_role('treasurer') or public.has_role('chair'); $$;
grant execute on function public.can_manage_reports() to anon, authenticated;  -- used in the public read rule; false for visitors

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 15728640, array['application/pdf'])
on conflict (id) do nothing;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('financial', 'moral', 'other')),
  year int not null check (year between 2020 and 2100),       -- the year the report covers
  title text not null check (length(trim(title)) between 3 and 140),
  summary text not null default '' check (length(summary) <= 1200),
  file_path text not null,                                     -- PDF in the private reports bucket
  file_size int check (file_size is null or file_size > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'replaced', 'archived')),
  replaces_id uuid references public.reports (id),             -- an earlier version this one replaces
  uploaded_by uuid references public.persons (id) default public.current_person_id(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, year desc);
create index reports_replaces_idx on public.reports (replaces_id);
create index reports_uploaded_by_idx on public.reports (uploaded_by);
create trigger reports_updated_at before update on public.reports for each row execute function public.set_updated_at();
create trigger reports_audit after insert or update or delete on public.reports for each row execute function public.audit_row();

-- The file and kind never change once uploaded (a new version is a new row). Publishing a new version
-- marks the one it replaces as "replaced"; both are kept.
create or replace function public.reports_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_publish_report(coalesce(new.kind, old.kind)) then
    raise exception 'Only the Treasurer (financial reports), the Chairman (moral report) or an administrator can do this';
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.published_at := null;
    new.uploaded_by := public.current_person_id();
    if new.replaces_id is not null and not exists (select 1 from public.reports r where r.id = new.replaces_id and r.kind = new.kind) then
      raise exception 'A new version must be of the same kind of report';
    end if;
    return new;
  end if;
  if (new.kind, new.file_path, new.created_at, new.replaces_id) is distinct from (old.kind, old.file_path, old.created_at, old.replaces_id) then
    raise exception 'Upload a new version instead of changing the file';
  end if;
  if new.status = 'published' and old.status <> 'published' then
    new.published_at := coalesce(old.published_at, now());
    if new.replaces_id is not null then
      update public.reports set status = 'replaced' where id = new.replaces_id and status = 'published';
    end if;
  end if;
  return new;
end;
$$;
create trigger reports_guard before insert or update on public.reports for each row execute function public.reports_guard();

alter table public.reports enable row level security;
create policy "reports public read published" on public.reports for select to anon, authenticated
  using (status in ('published', 'replaced') or public.can_manage_reports());
create policy "reports publishers insert" on public.reports for insert to authenticated
  with check (public.can_publish_report(kind));
create policy "reports publishers update" on public.reports for update to authenticated
  using (public.can_publish_report(kind)) with check (public.can_publish_report(kind));

-- Files: publishers upload; everyone can read a file once its report is published.
create or replace function public.report_file_public(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.reports r where r.file_path = p_name and r.status in ('published', 'replaced')); $$;
grant execute on function public.report_file_public(text) to anon, authenticated;

create policy "report files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and public.can_manage_reports());
create policy "report files read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'reports' and (public.report_file_public(name) or public.can_manage_reports()));
