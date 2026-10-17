-- Opportunities (product owner, 18 Oct 2026), members only:
--   Jobs: members (and the association) post jobs, internships and attachments; they appear straight away,
--         can be reported, and disappear after the closing date.
--   Business: an alumni business directory (owners may also list publicly: "Buy from alumni") and a board
--         of business opportunities (tenders, partners, investors, distributors, offers).
--   Volunteer: administrators and the Secretary post ways to help; members sign up.
-- Nothing is deleted: posts are hidden (by an administrator) or removed (by the person who posted).

create or replace function public.can_post_volunteer()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.has_role('secretary'); $$;
revoke execute on function public.can_post_volunteer() from public, anon;
grant execute on function public.can_post_volunteer() to authenticated;

-- At most ten posts a day from one member, across jobs, businesses and business opportunities.
create or replace function public.opportunity_rate_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if (select count(*) from public.job_posts where posted_by = new.posted_by and created_at > now() - interval '1 day')
   + (select count(*) from public.businesses where posted_by = new.posted_by and created_at > now() - interval '1 day')
   + (select count(*) from public.business_opportunities where posted_by = new.posted_by and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have posted ten times today. Please try again tomorrow.' using errcode = '22023';
  end if;
  new.status := 'published';
  return new;
end;
$$;

-- Jobs ---------------------------------------------------------------------------------------------
create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.persons (id) default public.current_person_id(),
  from_association boolean not null default false,
  title text not null check (length(trim(title)) between 3 and 120),
  organisation text not null check (length(trim(organisation)) between 2 and 120),
  location text not null check (length(trim(location)) between 2 and 100),
  work_type text not null check (work_type in ('full_time', 'part_time', 'contract', 'internship', 'attachment', 'remote')),
  field text not null default '' check (length(field) <= 60),
  description text not null default '' check (length(description) <= 3000),
  apply_url text check (apply_url is null or apply_url ~* '^https://'),
  apply_email text check (apply_email is null or apply_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  closes_on date not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (apply_url is not null or apply_email is not null)
);
create index job_posts_open_idx on public.job_posts (status, closes_on);
create index job_posts_posted_by_idx on public.job_posts (posted_by);

-- Businesses ----------------------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.persons (id) default public.current_person_id(),
  name text not null check (length(trim(name)) between 2 and 100),
  description text not null check (length(trim(description)) between 10 and 800),
  sector text not null check (length(trim(sector)) between 2 and 60),
  county text not null default '' check (length(county) <= 60),
  area text not null default '' check (length(area) <= 100),
  phone text check (phone is null or length(phone) <= 30),
  whatsapp boolean not null default false,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website text check (website is null or website ~* '^https://'),
  member_offer text not null default '' check (length(member_offer) <= 200),   -- e.g. "10% off for alumni"
  public_listing boolean not null default false,                                -- also on the public "Buy from alumni" page
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_status_idx on public.businesses (status, sector);
create index businesses_posted_by_idx on public.businesses (posted_by);

create table public.business_opportunities (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.persons (id) default public.current_person_id(),
  kind text not null check (kind in ('tender', 'partner', 'investor', 'distributor', 'offer', 'other')),
  title text not null check (length(trim(title)) between 3 and 120),
  details text not null check (length(trim(details)) between 10 and 2000),
  sector text not null default '' check (length(sector) <= 60),
  location text not null default '' check (length(location) <= 100),
  contact text not null check (length(trim(contact)) between 3 and 200),
  closes_on date,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_opportunities_status_idx on public.business_opportunities (status, created_at desc);
create index business_opportunities_posted_by_idx on public.business_opportunities (posted_by);

create trigger job_posts_rate before insert on public.job_posts for each row execute function public.opportunity_rate_limit();
create trigger businesses_rate before insert on public.businesses for each row execute function public.opportunity_rate_limit();
create trigger business_opportunities_rate before insert on public.business_opportunities for each row execute function public.opportunity_rate_limit();

-- Owners may edit or remove their own post, but cannot bring back one an administrator hid.
create or replace function public.opportunity_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.posted_by is distinct from old.posted_by or new.created_at is distinct from old.created_at then
    raise exception 'This cannot be changed';
  end if;
  if old.status = 'hidden' and new.status <> 'hidden' then
    raise exception 'An administrator has hidden this post';
  end if;
  if new.status = 'hidden' then
    raise exception 'Only administrators can hide a post';
  end if;
  if tg_table_name = 'job_posts' and new.from_association and not old.from_association and not public.can_post_volunteer() then
    raise exception 'Only officials can post for the association';
  end if;
  return new;
end;
$$;
create trigger job_posts_guard before update on public.job_posts for each row execute function public.opportunity_guard();
create trigger businesses_guard before update on public.businesses for each row execute function public.opportunity_guard();
create trigger business_opportunities_guard before update on public.business_opportunities for each row execute function public.opportunity_guard();

-- Posting for the association is for officials only.
create or replace function public.job_posts_association_check()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.from_association and not public.can_post_volunteer() then
    raise exception 'Only officials can post for the association';
  end if;
  return new;
end;
$$;
create trigger job_posts_association before insert on public.job_posts for each row execute function public.job_posts_association_check();

-- Volunteer ------------------------------------------------------------------------------------------
create table public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.persons (id) default public.current_person_id(),
  title text not null check (length(trim(title)) between 3 and 120),
  details text not null default '' check (length(details) <= 2000),
  place text not null default '' check (length(place) <= 100),
  happens_on date,
  time_note text not null default '' check (length(time_note) <= 60),
  people_needed int check (people_needed is null or people_needed between 1 and 500),
  skills text[] not null default '{}' check (cardinality(skills) <= 10),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index volunteer_roles_status_idx on public.volunteer_roles (status, happens_on);
create index volunteer_roles_posted_by_idx on public.volunteer_roles (posted_by);

create table public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.volunteer_roles (id),
  person_id uuid not null references public.persons (id),
  note text not null default '' check (length(note) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, person_id)
);
create index volunteer_signups_person_idx on public.volunteer_signups (person_id);

-- Reports -------------------------------------------------------------------------------------------
create table public.opportunity_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('job', 'business', 'business_opportunity')),
  target_id uuid not null,
  person_id uuid not null references public.persons (id) default public.current_person_id(),
  reason text not null default '' check (length(reason) <= 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, person_id)
);
create index opportunity_reports_open_idx on public.opportunity_reports (status, target_type);
create index opportunity_reports_person_idx on public.opportunity_reports (person_id);

do $$
declare t text;
begin
  foreach t in array array['job_posts', 'businesses', 'business_opportunities', 'volunteer_roles', 'volunteer_signups'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
  foreach t in array array['job_posts', 'businesses', 'business_opportunities', 'volunteer_roles', 'volunteer_signups', 'opportunity_reports'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Members read published posts; the poster and administrators also see their hidden/removed ones.
create policy "jobs read" on public.job_posts for select to authenticated
  using ((status = 'published' and public.is_member()) or posted_by = public.current_person_id() or public.is_admin());
create policy "jobs insert" on public.job_posts for insert to authenticated
  with check (posted_by = public.current_person_id() and public.is_member());
create policy "jobs update" on public.job_posts for update to authenticated
  using (posted_by = public.current_person_id() or public.is_admin()) with check (posted_by = public.current_person_id() or public.is_admin());

create policy "businesses read" on public.businesses for select to authenticated
  using ((status = 'published' and public.is_member()) or posted_by = public.current_person_id() or public.is_admin());
create policy "businesses insert" on public.businesses for insert to authenticated
  with check (posted_by = public.current_person_id() and public.is_member());
create policy "businesses update" on public.businesses for update to authenticated
  using (posted_by = public.current_person_id() or public.is_admin()) with check (posted_by = public.current_person_id() or public.is_admin());

create policy "business opps read" on public.business_opportunities for select to authenticated
  using ((status = 'published' and public.is_member()) or posted_by = public.current_person_id() or public.is_admin());
create policy "business opps insert" on public.business_opportunities for insert to authenticated
  with check (posted_by = public.current_person_id() and public.is_member());
create policy "business opps update" on public.business_opportunities for update to authenticated
  using (posted_by = public.current_person_id() or public.is_admin()) with check (posted_by = public.current_person_id() or public.is_admin());

create policy "volunteer read" on public.volunteer_roles for select to authenticated
  using (public.is_member() or public.can_post_volunteer());
create policy "volunteer insert" on public.volunteer_roles for insert to authenticated with check (public.can_post_volunteer());
create policy "volunteer update" on public.volunteer_roles for update to authenticated
  using (public.can_post_volunteer()) with check (public.can_post_volunteer());

-- A member sees their own sign-ups; officials see everyone's (to organise).
create policy "signups read" on public.volunteer_signups for select to authenticated
  using (person_id = public.current_person_id() or public.can_post_volunteer());
create policy "signups own insert" on public.volunteer_signups for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member()
              and exists (select 1 from public.volunteer_roles r where r.id = role_id and r.status = 'open'));
create policy "signups own update" on public.volunteer_signups for update to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

create policy "reports own insert" on public.opportunity_reports for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member());
create policy "reports read" on public.opportunity_reports for select to authenticated
  using (person_id = public.current_person_id() or public.is_admin());
create policy "reports admin update" on public.opportunity_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Lists with the poster's name and class (members only), and open report counts for administrators.
create or replace function public.open_jobs()
returns table (id uuid, title text, organisation text, location text, work_type text, field text, description text,
               apply_url text, apply_email text, closes_on date, from_association boolean, created_at timestamptz,
               poster text, poster_year int, mine boolean, reports bigint)
language sql stable security definer set search_path = ''
as $$
  select j.id, j.title, j.organisation, j.location, j.work_type, j.field, j.description, j.apply_url, j.apply_email,
         j.closes_on, j.from_association, j.created_at, p.full_name, mp.year_left, j.posted_by = public.current_person_id(),
         case when public.is_admin() then (select count(*) from public.opportunity_reports r where r.target_type = 'job' and r.target_id = j.id and r.status = 'open') end
  from public.job_posts j
  join public.persons p on p.id = j.posted_by
  left join public.member_profiles mp on mp.person_id = j.posted_by
  where (public.is_member() or public.is_admin()) and j.status = 'published' and j.closes_on >= current_date
  order by j.created_at desc
  limit 200;
$$;
revoke execute on function public.open_jobs() from public, anon;
grant execute on function public.open_jobs() to authenticated;

create or replace function public.business_directory()
returns table (id uuid, name text, description text, sector text, county text, area text, phone text, whatsapp boolean,
               email text, website text, member_offer text, public_listing boolean, owner_id uuid, owner text, owner_year int,
               mine boolean, reports bigint)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.name, b.description, b.sector, b.county, b.area, b.phone, b.whatsapp, b.email, b.website, b.member_offer,
         b.public_listing, b.posted_by, p.full_name, mp.year_left, b.posted_by = public.current_person_id(),
         case when public.is_admin() then (select count(*) from public.opportunity_reports r where r.target_type = 'business' and r.target_id = b.id and r.status = 'open') end
  from public.businesses b
  join public.persons p on p.id = b.posted_by and p.status = 'active'
  left join public.member_profiles mp on mp.person_id = b.posted_by
  where (public.is_member() or public.is_admin()) and b.status = 'published'
  order by b.name;
$$;
revoke execute on function public.business_directory() from public, anon;
grant execute on function public.business_directory() to authenticated;

create or replace function public.open_business_opportunities()
returns table (id uuid, kind text, title text, details text, sector text, location text, contact text, closes_on date,
               created_at timestamptz, poster text, poster_year int, mine boolean, reports bigint)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.kind, o.title, o.details, o.sector, o.location, o.contact, o.closes_on, o.created_at, p.full_name, mp.year_left,
         o.posted_by = public.current_person_id(),
         case when public.is_admin() then (select count(*) from public.opportunity_reports r where r.target_type = 'business_opportunity' and r.target_id = o.id and r.status = 'open') end
  from public.business_opportunities o
  join public.persons p on p.id = o.posted_by
  left join public.member_profiles mp on mp.person_id = o.posted_by
  where (public.is_member() or public.is_admin()) and o.status = 'published' and (o.closes_on is null or o.closes_on >= current_date)
  order by o.created_at desc
  limit 200;
$$;
revoke execute on function public.open_business_opportunities() from public, anon;
grant execute on function public.open_business_opportunities() to authenticated;

create or replace function public.volunteer_board()
returns table (id uuid, title text, details text, place text, happens_on date, time_note text, people_needed int, skills text[],
               status text, signed_up bigint, i_signed_up boolean, my_note text)
language sql stable security definer set search_path = ''
as $$
  select v.id, v.title, v.details, v.place, v.happens_on, v.time_note, v.people_needed, v.skills, v.status,
         (select count(*) from public.volunteer_signups s where s.role_id = v.id and s.active),
         exists (select 1 from public.volunteer_signups s where s.role_id = v.id and s.active and s.person_id = public.current_person_id()),
         (select s.note from public.volunteer_signups s where s.role_id = v.id and s.person_id = public.current_person_id())
  from public.volunteer_roles v
  where (public.is_member() or public.can_post_volunteer())
    and (v.status = 'open' or public.can_post_volunteer())
    and (v.happens_on is null or v.happens_on >= current_date or public.can_post_volunteer())
  order by v.status = 'open' desc, v.happens_on nulls last, v.created_at desc;
$$;
revoke execute on function public.volunteer_board() from public, anon;
grant execute on function public.volunteer_board() to authenticated;

-- For officials organising volunteers: who signed up, with a phone number.
create or replace function public.volunteer_signup_list(p_role uuid)
returns table (person_id uuid, full_name text, year_left int, phone text, note text, signed_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, mp.year_left,
         (select c.value from public.person_contacts c where c.person_id = p.id and c.kind = 'phone' order by c.is_primary desc, c.created_at limit 1),
         s.note, s.created_at
  from public.volunteer_signups s
  join public.persons p on p.id = s.person_id
  left join public.member_profiles mp on mp.person_id = p.id
  where s.role_id = p_role and s.active and public.can_post_volunteer()
  order by s.created_at;
$$;
revoke execute on function public.volunteer_signup_list(uuid) from public, anon;
grant execute on function public.volunteer_signup_list(uuid) to authenticated;

-- "Buy from alumni": businesses whose owners chose a public listing. No phone numbers of individuals
-- beyond what the owner entered for the business.
create or replace function public.public_businesses()
returns table (id uuid, name text, description text, sector text, county text, area text, phone text, whatsapp boolean,
               email text, website text, owner_year int)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.name, b.description, b.sector, b.county, b.area, b.phone, b.whatsapp, b.email, b.website, mp.year_left
  from public.businesses b
  join public.persons p on p.id = b.posted_by and p.status = 'active'
  join public.member_profiles mp on mp.person_id = b.posted_by and mp.membership_status <> 'terminated'
  where b.status = 'published' and b.public_listing
  order by b.sector, b.name;
$$;
grant execute on function public.public_businesses() to anon, authenticated;
