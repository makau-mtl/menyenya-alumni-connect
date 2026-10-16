-- "Our people" page (product owner, 16 Oct 2026): leadership and secretariat positions managed by
-- administrators, shown publicly; term dates visible to members only; alerts when terms end.

create table public.public_positions (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('leadership', 'secretariat')),
  title text not null check (length(trim(title)) between 2 and 120),
  sort_order int not null default 0,
  person_id uuid references public.persons (id),          -- a member holding the position
  display_name text check (display_name is null or length(trim(display_name)) between 2 and 120), -- someone who isn't a member
  capacity_note text check (capacity_note is null or length(capacity_note) <= 200), -- e.g. "In his official capacity as Principal"
  summary text check (summary is null or length(summary) <= 400),                  -- for non-members (members' comes from their profile)
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://([a-z]+\.)?linkedin\.com/'),
  photo_path text,                                          -- for non-members, in the public site-media bucket
  has_tenure boolean not null default false,
  term_starts date,
  term_ends date,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (person_id is not null or display_name is not null),
  check (not has_tenure or term_ends is null or term_starts is null or term_ends >= term_starts)
);
create index public_positions_person_idx on public.public_positions (person_id);
create index public_positions_section_idx on public.public_positions (section, sort_order);
create trigger public_positions_updated_at before update on public.public_positions for each row execute function public.set_updated_at();
create trigger public_positions_audit after insert or update or delete on public.public_positions for each row execute function public.audit_row();

alter table public.public_positions enable row level security;
-- Only administrators read the table directly (it holds term dates); everyone else uses the functions below.
create policy "positions admin read" on public.public_positions for select to authenticated using (public.is_admin());
create policy "positions admin insert" on public.public_positions for insert to authenticated with check (public.is_admin());
create policy "positions admin update" on public.public_positions for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Positions as the public sees them: no term dates.
create or replace function public.people_positions()
returns table (id uuid, section text, title text, sort_order int, person_id uuid, name text, capacity_note text,
               summary text, linkedin_url text, photo_path text, photo_is_member boolean, category text, year_left int,
               has_tenure boolean)
language sql stable security definer set search_path = ''
as $$
  select pp.id, pp.section, pp.title, pp.sort_order, pp.person_id,
         coalesce(p.full_name, pp.display_name),
         pp.capacity_note,
         coalesce(mp.headline, pp.summary),
         coalesce(mp.linkedin_url, pp.linkedin_url),
         coalesce(mp.photo_path, pp.photo_path),
         mp.photo_path is not null,
         mc.key, mp.year_left, pp.has_tenure
  from public.public_positions pp
  left join public.persons p on p.id = pp.person_id and p.status = 'active'
  left join public.member_profiles mp on mp.person_id = pp.person_id and mp.membership_status <> 'terminated'
  left join public.member_categories mc on mc.id = mp.category_id
  where pp.status = 'published' and (pp.person_id is null or p.id is not null)
  order by pp.section, pp.sort_order, pp.title;
$$;
grant execute on function public.people_positions() to anon, authenticated;

-- Term dates, for signed-in members only.
create or replace function public.people_terms()
returns table (id uuid, term_starts date, term_ends date)
language sql stable security definer set search_path = ''
as $$
  select pp.id, pp.term_starts, pp.term_ends
  from public.public_positions pp
  where pp.status = 'published' and pp.has_tenure and (public.is_member() or public.is_admin());
$$;
revoke execute on function public.people_terms() from public, anon;
grant execute on function public.people_terms() to authenticated;

-- The public Members section: members with a public profile, plus members holding a published position.
create or replace function public.public_members(p_query text default null, p_year int default null,
                                                 p_limit int default 24, p_offset int default 0)
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, headline text,
               linkedin_url text, photo_path text, total bigint)
language sql stable security definer set search_path = ''
as $$
  with shown as (
    select p.id, p.full_name, mc.key as category, mp.year_left, mp.relationship_to_school, mp.headline,
           mp.linkedin_url, mp.photo_path, mp.profession
    from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    join public.member_categories mc on mc.id = mp.category_id
    where mp.membership_status <> 'terminated'
      and (public.has_consent(p.id, 'public_profile')
           or exists (select 1 from public.public_positions pp where pp.person_id = p.id and pp.status = 'published'))
  )
  select s.id, s.full_name, s.category, s.year_left, s.relationship_to_school, s.headline, s.linkedin_url,
         s.photo_path, count(*) over ()
  from shown s
  where (p_year is null or s.year_left = p_year)
    and (nullif(trim(p_query), '') is null
         or strpos(lower(s.full_name), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(s.headline, '')), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(s.profession, '')), lower(trim(p_query))) > 0)
  order by s.full_name
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;
grant execute on function public.public_members(text, int, int, int) to anon, authenticated;

-- Photos of position holders are public too (holding office implies being shown).
create or replace function public.member_photo_public(p_folder text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.member_profiles mp
    where mp.person_id::text = p_folder and mp.membership_status <> 'terminated'
      and (public.has_consent(mp.person_id, 'public_profile')
           or exists (select 1 from public.public_positions pp where pp.person_id = mp.person_id and pp.status = 'published')));
$$;

-- Terms ending within 30 days, or already ended, for the administrators' alert.
create or replace function public.position_alerts()
returns table (id uuid, title text, name text, term_ends date, ended boolean)
language sql stable security definer set search_path = ''
as $$
  select pp.id, pp.title, coalesce(p.full_name, pp.display_name), pp.term_ends, pp.term_ends < current_date
  from public.public_positions pp
  left join public.persons p on p.id = pp.person_id
  where public.is_admin() and pp.status = 'published' and pp.has_tenure and pp.term_ends is not null
    and pp.term_ends <= current_date + 30
  order by pp.term_ends;
$$;
revoke execute on function public.position_alerts() from public, anon;
grant execute on function public.position_alerts() to authenticated;
