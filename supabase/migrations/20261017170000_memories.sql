-- Memories feed, Part C (product owner, 17 Oct 2026): members share photos (comrades, a visit to the school,
-- old class photos) that other members see in a feed. Photos appear straight away; anyone can report one,
-- and administrators hide reported photos. Members only, never public. Nothing is deleted.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id),
  photo_path text not null,                     -- in the private memories bucket, without the size suffix
  caption text not null default '' check (length(caption) <= 500),
  place text check (place is null or length(place) <= 80),
  taken_year int check (taken_year is null or taken_year between 1960 and 2100),
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),  -- hidden: by an administrator; removed: by the owner
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memories_feed_idx on public.memories (status, created_at desc);
create index memories_person_idx on public.memories (person_id);

create table public.memory_reactions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id),
  person_id uuid not null references public.persons (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (memory_id, person_id)
);
create index memory_reactions_person_idx on public.memory_reactions (person_id);

create table public.memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id),
  person_id uuid not null references public.persons (id),
  body text not null check (length(trim(body)) between 1 and 500),
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memory_comments_memory_idx on public.memory_comments (memory_id, created_at);
create index memory_comments_person_idx on public.memory_comments (person_id);

create table public.memory_reports (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id),
  person_id uuid not null references public.persons (id),
  reason text not null default '' check (length(reason) <= 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  unique (memory_id, person_id)
);
create index memory_reports_person_idx on public.memory_reports (person_id);
create index memory_reports_open_idx on public.memory_reports (status, memory_id);

create trigger memories_updated_at before update on public.memories for each row execute function public.set_updated_at();
create trigger memory_reactions_updated_at before update on public.memory_reactions for each row execute function public.set_updated_at();
create trigger memory_comments_updated_at before update on public.memory_comments for each row execute function public.set_updated_at();
create trigger memories_audit after insert or update or delete on public.memories for each row execute function public.audit_row();
create trigger memory_comments_audit after insert or update or delete on public.memory_comments for each row execute function public.audit_row();
create trigger memory_reports_audit after insert or update or delete on public.memory_reports for each row execute function public.audit_row();

-- Owners may edit the caption or remove their own memory, but cannot bring back one an administrator hid.
create or replace function public.memories_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if (new.person_id, new.photo_path, new.created_at) is distinct from (old.person_id, old.photo_path, old.created_at) then
    raise exception 'This cannot be changed';
  end if;
  if old.status = 'hidden' and new.status <> 'hidden' then
    raise exception 'An administrator has hidden this memory';
  end if;
  if new.status = 'hidden' then
    raise exception 'Only administrators can hide a memory';
  end if;
  return new;
end;
$$;
create trigger memories_guard before update on public.memories for each row execute function public.memories_guard();

alter table public.memories enable row level security;
alter table public.memory_reactions enable row level security;
alter table public.memory_comments enable row level security;
alter table public.memory_reports enable row level security;

create policy "memories members read" on public.memories for select to authenticated
  using ((status = 'published' and public.is_member()) or person_id = public.current_person_id() or public.is_admin());
create policy "memories own insert" on public.memories for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member() and split_part(photo_path, '/', 1) = person_id::text);
create policy "memories own or admin update" on public.memories for update to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

create policy "reactions members read" on public.memory_reactions for select to authenticated using (public.is_member());
create policy "reactions own insert" on public.memory_reactions for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member());
create policy "reactions own update" on public.memory_reactions for update to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

create policy "comments members read" on public.memory_comments for select to authenticated
  using ((status = 'published' and public.is_member()) or person_id = public.current_person_id() or public.is_admin());
create policy "comments own insert" on public.memory_comments for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member()
              and exists (select 1 from public.memories m where m.id = memory_id and m.status = 'published'));
create policy "comments own or admin update" on public.memory_comments for update to authenticated
  using (person_id = public.current_person_id() or public.is_admin())
  with check (person_id = public.current_person_id() or public.is_admin());

create policy "reports own insert" on public.memory_reports for insert to authenticated
  with check (person_id = public.current_person_id() and public.is_member());
create policy "reports admin read" on public.memory_reports for select to authenticated
  using (public.is_admin() or person_id = public.current_person_id());
create policy "reports admin update" on public.memory_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Photos: a member uploads into their own folder; members see them through short-lived links.
create policy "memories upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'memories' and split_part(name, '/', 1) = public.current_person_id()::text and public.is_member());
create policy "memories members view" on storage.objects for select to authenticated
  using (bucket_id = 'memories' and (public.is_member() or public.is_admin()));

-- The feed, newest first. Report counts only for administrators.
create or replace function public.memory_feed(p_limit int default 24, p_before timestamptz default null, p_reported_only boolean default false)
returns table (id uuid, person_id uuid, full_name text, year_left int, photo_path text, caption text, place text, taken_year int,
               status text, created_at timestamptz, hearts bigint, i_hearted boolean, comments bigint, mine boolean, reports bigint)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.person_id, p.full_name, mp.year_left, m.photo_path, m.caption, m.place, m.taken_year, m.status, m.created_at,
         (select count(*) from public.memory_reactions r where r.memory_id = m.id and r.active),
         exists (select 1 from public.memory_reactions r where r.memory_id = m.id and r.active and r.person_id = public.current_person_id()),
         (select count(*) from public.memory_comments c where c.memory_id = m.id and c.status = 'published'),
         m.person_id = public.current_person_id(),
         case when public.is_admin() then (select count(*) from public.memory_reports r where r.memory_id = m.id and r.status = 'open') end
  from public.memories m
  join public.persons p on p.id = m.person_id
  left join public.member_profiles mp on mp.person_id = m.person_id
  where (public.is_member() or public.is_admin())
    and (m.status = 'published' or (public.is_admin() and m.status = 'hidden'))
    and (p_before is null or m.created_at < p_before)
    and (not p_reported_only or (public.is_admin() and exists (select 1 from public.memory_reports r where r.memory_id = m.id and r.status = 'open')))
  order by m.created_at desc
  limit least(greatest(p_limit, 1), 60);
$$;
revoke execute on function public.memory_feed(int, timestamptz, boolean) from public, anon;
grant execute on function public.memory_feed(int, timestamptz, boolean) to authenticated;

create or replace function public.memory_comment_list(p_memory uuid)
returns table (id uuid, full_name text, body text, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = ''
as $$
  select c.id, p.full_name, c.body, c.created_at, c.person_id = public.current_person_id()
  from public.memory_comments c join public.persons p on p.id = c.person_id
  where c.memory_id = p_memory and c.status = 'published' and (public.is_member() or public.is_admin())
  order by c.created_at
  limit 200;
$$;
revoke execute on function public.memory_comment_list(uuid) from public, anon;
grant execute on function public.memory_comment_list(uuid) to authenticated;
