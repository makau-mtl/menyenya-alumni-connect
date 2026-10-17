-- "My Menyenya" (product owner, 18 Oct 2026): the stream a member was in and the dormitories they slept
-- in. Both optional. Pick lists kept by administrators so names are spelt the same way, for the directory
-- filter and for reporting (groups under 5 are hidden).

create table public.school_streams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 60),
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.school_dorms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 60),
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger school_streams_updated_at before update on public.school_streams for each row execute function public.set_updated_at();
create trigger school_dorms_updated_at before update on public.school_dorms for each row execute function public.set_updated_at();
create trigger school_streams_audit after insert or update or delete on public.school_streams for each row execute function public.audit_row();
create trigger school_dorms_audit after insert or update or delete on public.school_dorms for each row execute function public.audit_row();

alter table public.school_streams enable row level security;
alter table public.school_dorms enable row level security;
create policy "streams read" on public.school_streams for select to authenticated using (status = 'published' or public.is_admin());
create policy "streams admin insert" on public.school_streams for insert to authenticated with check (public.is_admin());
create policy "streams admin update" on public.school_streams for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "dorms read" on public.school_dorms for select to authenticated using (status = 'published' or public.is_admin());
create policy "dorms admin insert" on public.school_dorms for insert to authenticated with check (public.is_admin());
create policy "dorms admin update" on public.school_dorms for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.member_profiles
  add column stream_id uuid references public.school_streams (id),
  add column dorm_ids uuid[] not null default '{}' check (cardinality(dorm_ids) <= 6);
create index member_profiles_stream_idx on public.member_profiles (stream_id);
create index member_profiles_dorms_idx on public.member_profiles using gin (dorm_ids);

-- Every dormitory chosen must be on the list.
create or replace function public.member_dorms_valid()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if cardinality(new.dorm_ids) > 0
     and (select count(*) from public.school_dorms d where d.id = any (new.dorm_ids)) <> cardinality(array(select distinct unnest(new.dorm_ids))) then
    raise exception 'Choose dormitories from the list' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger member_profiles_dorms_valid before insert or update of dorm_ids on public.member_profiles
  for each row execute function public.member_dorms_valid();

-- Members by stream and by dormitory, for "Members in numbers" (groups under 5 shown as "fewer than 5").
create or replace function public.school_life_breakdown()
returns jsonb language sql stable security definer set search_path = ''
as $$
  with m as (
    select mp.stream_id, mp.dorm_ids
    from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    where mp.membership_status <> 'terminated'
  )
  select case when public.is_member() or public.is_admin() then jsonb_build_object(
    'streams', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'count', case when x.n >= 5 then x.n end) order by s.sort_order, s.name)
                         from public.school_streams s
                         join (select stream_id, count(*) as n from m where stream_id is not null group by stream_id) x on x.stream_id = s.id), '[]'),
    'dorms', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'count', case when x.n >= 5 then x.n end) order by d.sort_order, d.name)
                       from public.school_dorms d
                       join (select unnest(dorm_ids) as dorm_id, count(*) as n from m group by 1) x on x.dorm_id = d.id), '[]')
  ) end;
$$;
revoke execute on function public.school_life_breakdown() from public, anon;
grant execute on function public.school_life_breakdown() to authenticated;

-- Directory: filter by stream and dormitory.
drop function public.directory_search(text, int, text, text, text, int, int);
create function public.directory_search(
  p_query text default null, p_year int default null, p_region text default null,
  p_category text default null, p_mentoring text default null, p_limit int default 48, p_offset int default 0,
  p_stream uuid default null, p_dorm uuid default null)
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, region text,
               headline text, profession text, skills text[], mentoring_offer public.mentoring_offer,
               photo_path text, total bigint)
language sql stable security definer set search_path = ''
as $$
  with listed as (
    select p.id, p.full_name, mc.key as category, mp.year_left, mp.relationship_to_school, cl.name as region,
           mp.headline, mp.profession, mp.skills, mp.mentoring_offer, mp.photo_path, mp.employer_or_business,
           mp.stream_id, mp.dorm_ids
    from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    join public.member_categories mc on mc.id = mp.category_id
    left join public.clusters cl on cl.id = mp.cluster_id
    where (public.is_member() or public.is_admin())
      and mp.membership_status <> 'terminated'
  )
  select l.id, l.full_name, l.category, l.year_left, l.relationship_to_school, l.region, l.headline,
         l.profession, l.skills, l.mentoring_offer, l.photo_path, count(*) over ()
  from listed l
  where (p_year is null or l.year_left = p_year)
    and (nullif(p_region, '') is null or l.region = p_region)
    and (nullif(p_category, '') is null or l.category = p_category)
    and (nullif(p_mentoring, '') is null or l.mentoring_offer::text = p_mentoring)
    and (p_stream is null or l.stream_id = p_stream)
    and (p_dorm is null or p_dorm = any (l.dorm_ids))
    and (nullif(trim(p_query), '') is null
         or strpos(lower(l.full_name), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.headline, '')), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.profession, '')), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.employer_or_business, '')), lower(trim(p_query))) > 0
         or exists (select 1 from unnest(l.skills) s where strpos(lower(s), lower(trim(p_query))) > 0))
  order by l.full_name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;
revoke execute on function public.directory_search(text, int, text, text, text, int, int, uuid, uuid) from public, anon;
grant execute on function public.directory_search(text, int, text, text, text, int, int, uuid, uuid) to authenticated;

-- A member's stream and dormitories, for their card.
create or replace function public.member_school_life(p_person uuid)
returns table (stream text, dorms text[])
language sql stable security definer set search_path = ''
as $$
  select s.name, coalesce(array(select d.name from public.school_dorms d where d.id = any (mp.dorm_ids) order by d.sort_order, d.name), '{}')
  from public.member_profiles mp
  left join public.school_streams s on s.id = mp.stream_id
  where mp.person_id = p_person and mp.membership_status <> 'terminated' and (public.is_member() or public.is_admin());
$$;
revoke execute on function public.member_school_life(uuid) from public, anon;
grant execute on function public.member_school_life(uuid) to authenticated;
