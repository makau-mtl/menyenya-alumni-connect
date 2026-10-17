-- Alumni stories (product owner, 17 Oct 2026): members share their own story or suggest someone
-- else's. Administrators, the Secretary and the Chairman review each one. A story appears on the
-- public website only once it is approved AND the person it is about has agreed. Nothing is deleted:
-- stories are declined or hidden (archived). Photos stay private until the story is published.

create or replace function public.can_edit_stories()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.has_role('secretary') or public.has_role('chair'); $$;
revoke execute on function public.can_edit_stories() from public, anon;
grant execute on function public.can_edit_stories() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-photos', 'story-photos', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create table public.alumni_stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique,                                   -- set when first published
  kind text not null check (kind in ('own', 'nomination')),
  submitted_by uuid not null references public.persons (id),
  subject_person_id uuid references public.persons (id),        -- the member the story is about, when known
  subject_name text not null check (length(trim(subject_name)) between 2 and 120),
  subject_year_left int check (subject_year_left is null or subject_year_left between 1960 and 2100),
  subject_contact text check (subject_contact is null or length(subject_contact) <= 120),  -- nominations: how to reach them
  title text not null check (length(trim(title)) between 5 and 120),
  summary text not null default '' check (length(summary) <= 280),
  body text not null check (length(trim(body)) between 50 and 8000),
  photo_path text,                                    -- in the private story-photos bucket, without the size suffix
  photo_caption text check (photo_caption is null or length(photo_caption) <= 200),
  consent_given boolean not null default false,       -- the person the story is about agreed to it being public
  consent_note text not null default '' check (length(consent_note) <= 300),  -- how consent was obtained
  status text not null default 'submitted' check (status in ('submitted', 'published', 'declined', 'archived')),
  featured boolean not null default false,            -- shown on the home page
  editor_note text not null default '' check (length(editor_note) <= 1000),   -- internal, or the reason for declining
  reviewed_by uuid references public.persons (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or consent_given)
);
create index alumni_stories_status_idx on public.alumni_stories (status, published_at desc);
create index alumni_stories_submitted_by_idx on public.alumni_stories (submitted_by);
create index alumni_stories_subject_idx on public.alumni_stories (subject_person_id);
create index alumni_stories_reviewed_by_idx on public.alumni_stories (reviewed_by);
create trigger alumni_stories_updated_at before update on public.alumni_stories for each row execute function public.set_updated_at();
create trigger alumni_stories_audit after insert or update or delete on public.alumni_stories for each row execute function public.audit_row();

-- New stories: a member's own story counts as their consent; a nomination waits for the person's consent.
-- At most five stories a day from one member.
create or replace function public.alumni_stories_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.status := 'submitted';
  new.featured := false;
  new.slug := null;
  new.published_at := null;
  new.reviewed_by := null;
  new.editor_note := '';
  if new.kind = 'own' then
    new.subject_person_id := new.submitted_by;
    new.consent_given := true;
    new.consent_note := 'Shared by the member themselves';
    new.subject_contact := null;
  else
    new.consent_given := false;
    new.consent_note := '';
  end if;
  if (select count(*) from public.alumni_stories where submitted_by = new.submitted_by and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have shared five stories today. Please try again tomorrow.';
  end if;
  return new;
end;
$$;
create trigger alumni_stories_before_insert before insert on public.alumni_stories for each row execute function public.alumni_stories_before_insert();

-- Reviewing: only officials change a story; the slug and first publication date are set once.
create or replace function public.alumni_stories_before_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_base text;
begin
  if not public.can_edit_stories() then
    raise exception 'Only the officials reviewing stories can change them';
  end if;
  if (new.submitted_by, new.kind, new.created_at) is distinct from (old.submitted_by, old.kind, old.created_at) then
    raise exception 'This cannot be changed';
  end if;
  if old.kind = 'own' and not new.consent_given then
    new.consent_given := true;  -- the member's own story stays consented
  end if;
  if new.status = 'published' and old.status <> 'published' then
    new.reviewed_by := public.current_person_id();
    new.published_at := coalesce(old.published_at, now());
  elsif new.status = 'declined' and old.status <> 'declined' then
    new.reviewed_by := public.current_person_id();
  end if;
  if new.status = 'published' and new.slug is null then
    v_base := trim(both '-' from lower(regexp_replace(new.title, '[^a-zA-Z0-9]+', '-', 'g')));
    new.slug := left(v_base, 60) || '-' || left(replace(new.id::text, '-', ''), 5);
  elsif old.slug is not null then
    new.slug := old.slug;
  end if;
  if new.status <> 'published' then
    new.featured := false;
  end if;
  return new;
end;
$$;
create trigger alumni_stories_before_update before update on public.alumni_stories for each row execute function public.alumni_stories_before_update();

alter table public.alumni_stories enable row level security;

create policy "stories own or editors read" on public.alumni_stories for select to authenticated
  using (submitted_by = public.current_person_id() or public.can_edit_stories());
create policy "stories members submit" on public.alumni_stories for insert to authenticated
  with check (submitted_by = public.current_person_id() and public.is_member());
create policy "stories editors update" on public.alumni_stories for update to authenticated
  using (public.can_edit_stories()) with check (public.can_edit_stories());

-- Photos: a member uploads into their own folder; officials and the uploader see them; everyone
-- sees a photo once the story it belongs to is published.
create or replace function public.story_photo_public(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.alumni_stories s
                 where s.status = 'published' and s.photo_path is not null and p_name like s.photo_path || '-%');
$$;
grant execute on function public.story_photo_public(text) to anon, authenticated;

create policy "story photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'story-photos' and split_part(name, '/', 1) = public.current_person_id()::text and public.is_member());
create policy "story photos view" on storage.objects for select to authenticated
  using (bucket_id = 'story-photos' and (split_part(name, '/', 1) = public.current_person_id()::text
                                         or public.can_edit_stories() or public.story_photo_public(name)));
create policy "story photos public view" on storage.objects for select to anon
  using (bucket_id = 'story-photos' and public.story_photo_public(name));

-- Published stories for the website. No contact details, notes or who submitted it.
create or replace function public.public_stories(p_limit int default 24, p_featured_only boolean default false)
returns table (slug text, title text, summary text, subject_name text, subject_year_left int, photo_path text,
               photo_caption text, featured boolean, published_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select s.slug, s.title, s.summary, s.subject_name, s.subject_year_left, s.photo_path, s.photo_caption, s.featured, s.published_at
  from public.alumni_stories s
  where s.status = 'published' and (not p_featured_only or s.featured)
  order by s.featured desc, s.published_at desc
  limit least(greatest(p_limit, 1), 60);
$$;
grant execute on function public.public_stories(int, boolean) to anon, authenticated;

create or replace function public.public_story(p_slug text)
returns table (slug text, title text, summary text, body text, subject_name text, subject_year_left int, photo_path text,
               photo_caption text, published_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select s.slug, s.title, s.summary, s.body, s.subject_name, s.subject_year_left, s.photo_path, s.photo_caption, s.published_at
  from public.alumni_stories s
  where s.status = 'published' and s.slug = p_slug;
$$;
grant execute on function public.public_story(text) to anon, authenticated;

-- For the officials reviewing stories: every story with the name of the member who sent it.
create or replace function public.stories_for_review()
returns table (id uuid, slug text, kind text, submitted_by_name text, subject_name text, subject_year_left int,
               subject_contact text, title text, summary text, body text, photo_path text, photo_caption text,
               consent_given boolean, consent_note text, status text, featured boolean, editor_note text,
               published_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.slug, s.kind, p.full_name, s.subject_name, s.subject_year_left, s.subject_contact, s.title, s.summary,
         s.body, s.photo_path, s.photo_caption, s.consent_given, s.consent_note, s.status, s.featured, s.editor_note,
         s.published_at, s.created_at
  from public.alumni_stories s
  join public.persons p on p.id = s.submitted_by
  where public.can_edit_stories()
  order by s.created_at desc;
$$;
revoke execute on function public.stories_for_review() from public, anon;
grant execute on function public.stories_for_review() to authenticated;
