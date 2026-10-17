-- Member dashboard, Part B (product owner, 17 Oct 2026): personal invite links, the class WhatsApp group,
-- and "Who's around?" meet-ups by town or area (no live location).

-- A member's own invite link (one per member, for their class). Registrations through it record who invited.
create or replace function public.my_invite_link()
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_me uuid := public.current_person_id();
  v_cohort uuid;
  v_token text;
begin
  if v_me is null or not public.is_member() then
    raise exception 'Members only' using errcode = '42501';
  end if;
  select token into v_token from public.invite_links where inviter_person_id = v_me and created_by = v_me and active limit 1;
  if v_token is not null then
    return v_token;
  end if;
  select cohort_id into v_cohort from public.member_profiles where person_id = v_me;
  insert into public.invite_links (label, cohort_id, inviter_person_id, created_by)
  values ('Personal invite', v_cohort, v_me, v_me)
  returning token into v_token;
  return v_token;
end;
$$;
revoke execute on function public.my_invite_link() from public, anon;
grant execute on function public.my_invite_link() to authenticated;

-- How many people joined through this member's invitations.
create or replace function public.my_invites_joined()
returns int language sql stable security definer set search_path = ''
as $$ select count(*)::int from public.member_profiles where invited_by_person_id = public.current_person_id(); $$;
revoke execute on function public.my_invites_joined() from public, anon;
grant execute on function public.my_invites_joined() to authenticated;

-- Class WhatsApp groups: one link per class, set by that class's rep or an administrator,
-- and shown only to members of that class.
create table public.class_groups (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null unique references public.cohorts (id),
  whatsapp_url text check (whatsapp_url is null or whatsapp_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$'),
  updated_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index class_groups_updated_by_idx on public.class_groups (updated_by);
create trigger class_groups_updated_at before update on public.class_groups for each row execute function public.set_updated_at();
create trigger class_groups_audit after insert or update or delete on public.class_groups for each row execute function public.audit_row();
alter table public.class_groups enable row level security;
create policy "class groups admin read" on public.class_groups for select to authenticated using (public.is_admin());
-- Everyone else goes through the functions below.

create or replace function public.my_class_group()
returns table (year_left int, whatsapp_url text, can_edit boolean)
language sql stable security definer set search_path = ''
as $$
  select c.year_left, g.whatsapp_url, (public.is_admin() or public.has_role('cohort_rep', 'cohort', c.id))
  from public.member_profiles mp
  join public.cohorts c on c.id = mp.cohort_id
  left join public.class_groups g on g.cohort_id = c.id
  where mp.person_id = public.current_person_id() and mp.membership_status <> 'terminated';
$$;
revoke execute on function public.my_class_group() from public, anon;
grant execute on function public.my_class_group() to authenticated;

create or replace function public.set_class_group(p_year int, p_url text)
returns void language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_cohort uuid;
  v_url text := nullif(trim(coalesce(p_url, '')), '');
begin
  select id into v_cohort from public.cohorts where year_left = p_year;
  if v_cohort is null then
    raise exception 'Unknown class';
  end if;
  if not (public.is_admin() or public.has_role('cohort_rep', 'cohort', v_cohort)) then
    raise exception 'Only the class rep or an administrator can change this' using errcode = '42501';
  end if;
  insert into public.class_groups (cohort_id, whatsapp_url, updated_by)
  values (v_cohort, v_url, public.current_person_id())
  on conflict (cohort_id) do update set whatsapp_url = excluded.whatsapp_url, updated_by = excluded.updated_by;
end;
$$;
revoke execute on function public.set_class_group(int, text) from public, anon;
grant execute on function public.set_class_group(int, text) to authenticated;

-- "Who's around?" meet-ups ------------------------------------------------------------------------------
create type public.meetup_audience as enum ('everyone', 'class', 'region');

create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references public.persons (id),
  title text not null check (length(trim(title)) between 3 and 100),
  place text not null check (length(trim(place)) between 2 and 100),   -- a town or area, never a live location
  happens_on date not null,
  time_note text not null default '' check (length(time_note) <= 60),   -- e.g. "from 2 pm" or "Saturday afternoon"
  note text not null default '' check (length(note) <= 500),
  audience public.meetup_audience not null default 'everyone',
  cohort_id uuid references public.cohorts (id),
  cluster_id uuid references public.clusters (id),
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meetups_upcoming_idx on public.meetups (status, happens_on);
create index meetups_organiser_idx on public.meetups (organiser_id);
create index meetups_cohort_idx on public.meetups (cohort_id);
create index meetups_cluster_idx on public.meetups (cluster_id);

create table public.meetup_responses (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetups (id),
  person_id uuid not null references public.persons (id),
  going boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meetup_id, person_id)
);
create index meetup_responses_person_idx on public.meetup_responses (person_id);

create trigger meetups_updated_at before update on public.meetups for each row execute function public.set_updated_at();
create trigger meetup_responses_updated_at before update on public.meetup_responses for each row execute function public.set_updated_at();
create trigger meetups_audit after insert or update or delete on public.meetups for each row execute function public.audit_row();

-- The class and region come from the organiser's own profile, never from the form.
create or replace function public.meetups_fill()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  select cohort_id, cluster_id into new.cohort_id, new.cluster_id from public.member_profiles where person_id = new.organiser_id;
  if tg_op = 'UPDATE' and new.organiser_id <> old.organiser_id then
    raise exception 'The organiser cannot change';
  end if;
  return new;
end;
$$;
create trigger meetups_fill before insert or update on public.meetups for each row execute function public.meetups_fill();

-- Can the signed-in member see this meet-up?
create or replace function public.can_see_meetup(p_meetup uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.meetups m
    left join public.member_profiles mine on mine.person_id = public.current_person_id()
    where m.id = p_meetup and mine.id is not null and mine.membership_status <> 'terminated'
      and (m.organiser_id = mine.person_id
           or (m.status = 'open' and (m.audience = 'everyone'
               or (m.audience = 'class' and m.cohort_id = mine.cohort_id)
               or (m.audience = 'region' and m.cluster_id = mine.cluster_id)))));
$$;
grant execute on function public.can_see_meetup(uuid) to authenticated;

alter table public.meetups enable row level security;
alter table public.meetup_responses enable row level security;

create policy "meetups visible" on public.meetups for select to authenticated
  using (organiser_id = public.current_person_id() or public.can_see_meetup(id) or public.is_admin());
create policy "meetups organise" on public.meetups for insert to authenticated
  with check (organiser_id = public.current_person_id() and public.is_member() and happens_on >= current_date);
create policy "meetups organiser update" on public.meetups for update to authenticated
  using (organiser_id = public.current_person_id() or public.is_admin())
  with check (organiser_id = public.current_person_id() or public.is_admin());

create policy "responses visible" on public.meetup_responses for select to authenticated
  using (person_id = public.current_person_id() or public.can_see_meetup(meetup_id));
create policy "responses own insert" on public.meetup_responses for insert to authenticated
  with check (person_id = public.current_person_id() and public.can_see_meetup(meetup_id));
create policy "responses own update" on public.meetup_responses for update to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

-- Upcoming meet-ups the member can see, with who is going.
create or replace function public.upcoming_meetups(p_limit int default 30)
returns table (id uuid, title text, place text, happens_on date, time_note text, note text, audience public.meetup_audience,
               organiser_id uuid, organiser_name text, organiser_class int, mine boolean, going_count bigint, i_am_going boolean, going_names text[])
language sql stable security definer set search_path = ''
as $$
  select m.id, m.title, m.place, m.happens_on, m.time_note, m.note, m.audience,
         m.organiser_id, p.full_name, op.year_left, m.organiser_id = public.current_person_id(),
         (select count(*) from public.meetup_responses r where r.meetup_id = m.id and r.going),
         exists (select 1 from public.meetup_responses r where r.meetup_id = m.id and r.going and r.person_id = public.current_person_id()),
         array(select pp.full_name from public.meetup_responses r join public.persons pp on pp.id = r.person_id
               where r.meetup_id = m.id and r.going order by r.created_at limit 8)
  from public.meetups m
  join public.persons p on p.id = m.organiser_id
  left join public.member_profiles op on op.person_id = m.organiser_id
  where m.status = 'open' and m.happens_on >= (now() at time zone 'Africa/Nairobi')::date and public.can_see_meetup(m.id)
  order by m.happens_on, m.created_at
  limit least(greatest(p_limit, 1), 100);
$$;
revoke execute on function public.upcoming_meetups(int) from public, anon;
grant execute on function public.upcoming_meetups(int) to authenticated;
