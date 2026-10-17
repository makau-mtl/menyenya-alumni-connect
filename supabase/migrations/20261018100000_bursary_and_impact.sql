-- Menyenya Alumni Bursary Fund and impact (product owner, 18 Oct 2026).
-- "Keep a child in school" becomes the Menyenya Alumni Bursary Fund (need-based), paid into its own
-- association account. Awards are paid by the association straight to the school's fees account and
-- reported in the financial statements (not tracked here). Impact figures and impact stories (with an
-- optional short YouTube video) are tied to each initiative.

-- 1. The fund, its own account, and the cause -----------------------------------------------------
insert into public.payment_channels (key, name, holder, account_display_name)
values ('association-bursary', 'Bursary Fund account', 'association', 'Menyenya Alumni Bursary Fund account (association)')
on conflict (key) do nothing;

update public.funds
set name = 'Menyenya Alumni Bursary Fund',
    channel_id = (select id from public.payment_channels where key = 'association-bursary')
where key = 'needy-students-fund';

update public.causes
set slug = 'bursary-fund',
    title = 'Menyenya Alumni Bursary Fund',
    summary = 'Bursaries that keep bright students from struggling families in class. Paid straight to the school, for students vetted by alumni.',
    story = '["Every year Menyenya admits students whose families cannot keep up with school fees. Some miss weeks of lessons; some never finish. Talent is everywhere, but opportunity is not.",
              "The Menyenya Alumni Bursary Fund removes that barrier. Each bursary pays a student''s fees for the full year, straight to the school, so they can stay in class and focus on learning.",
              "Removing barriers to education gives these students hope, and gives Menyenya the chance to do what it does best: shape young people who go on to lift their families and communities."]'
where slug = 'keep-a-child-in-school';

-- 2. School fees and the yearly need, kept with the school figures (history kept) ------------------
alter table public.school_stats
  add column fees_year int check (fees_year is null or fees_year between 2020 and 2100),
  add column term_fee_kes numeric(10, 0) check (term_fee_kes is null or term_fee_kes > 0),
  add column annual_fee_kes numeric(10, 0) check (annual_fee_kes is null or annual_fee_kes > 0),
  add column needy_admitted_per_year int check (needy_admitted_per_year is null or needy_admitted_per_year >= 0);

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
  s as (select * from public.school_stats order by as_of desc, created_at desc limit 1),
  f as (select * from public.school_stats where annual_fee_kes is not null or term_fee_kes is not null order by as_of desc, created_at desc limit 1),
  n as (select * from public.school_stats where needy_admitted_per_year is not null order by as_of desc, created_at desc limit 1)
  select jsonb_build_object(
    'members', (select count(*) from m),
    'alumni', (select count(*) from m where category = 'alumnus'),
    'friends', (select count(*) from m where category = 'friend'),
    'classes', (select count(distinct year_left) from m where category = 'alumnus' and year_left is not null),
    'regions', (select count(distinct cluster_id) from m where cluster_id is not null),
    'students', (select students from s),
    'needy_students', (select needy_students from s),
    'supported_by_alumni', (select supported_by_alumni from s),
    'school_as_of', (select as_of from s),
    'fees_year', (select fees_year from f),
    'term_fee_kes', (select term_fee_kes from f),
    'annual_fee_kes', (select annual_fee_kes from f),
    'needy_admitted_per_year', (select needy_admitted_per_year from n)
  );
$$;

-- 3. Impact figures per initiative, typed by officials with an "as at" date (never computed) --------
create or replace function public.can_edit_impact()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.has_role('chair') or public.has_role('secretary') or public.has_role('treasurer'); $$;
grant execute on function public.can_edit_impact() to anon, authenticated;  -- used in the public read rule; false for visitors

create table public.impact_figures (
  id uuid primary key default gen_random_uuid(),
  cause_id uuid not null references public.causes (id),
  value text not null check (length(trim(value)) between 1 and 24),     -- e.g. "12", "KES 384,000"
  label text not null check (length(trim(label)) between 3 and 80),     -- e.g. "students on bursaries in 2027"
  as_of date not null,
  note text not null default '' check (length(note) <= 200),
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_by uuid references public.persons (id) default public.current_person_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index impact_figures_cause_idx on public.impact_figures (cause_id, status, sort_order);
create index impact_figures_created_by_idx on public.impact_figures (created_by);
create trigger impact_figures_updated_at before update on public.impact_figures for each row execute function public.set_updated_at();
create trigger impact_figures_audit after insert or update or delete on public.impact_figures for each row execute function public.audit_row();

alter table public.impact_figures enable row level security;
create policy "impact figures public read" on public.impact_figures for select to anon, authenticated
  using (status = 'published' or public.can_edit_impact());
create policy "impact figures officials insert" on public.impact_figures for insert to authenticated with check (public.can_edit_impact());
create policy "impact figures officials update" on public.impact_figures for update to authenticated
  using (public.can_edit_impact()) with check (public.can_edit_impact());

-- 4. Impact stories: written by the officials who review stories, tied to an initiative -------------
alter table public.alumni_stories drop constraint alumni_stories_kind_check;
alter table public.alumni_stories
  add constraint alumni_stories_kind_check check (kind in ('own', 'nomination', 'impact')),
  add column cause_id uuid references public.causes (id),
  add column video_url text check (video_url is null or video_url ~* '^https://(www\.)?(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[A-Za-z0-9_-]{6,}');
create index alumni_stories_cause_idx on public.alumni_stories (cause_id);

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
  if new.kind = 'impact' then
    if not public.can_edit_stories() then
      raise exception 'Only the officials who review stories can write impact stories';
    end if;
    new.subject_person_id := null;
    new.consent_given := false;   -- recorded before publishing (for a student: parent or guardian, and the school)
    new.consent_note := '';
    return new;
  end if;
  new.cause_id := null;
  new.video_url := null;
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

-- Officials may add a photo to an impact story even when they aren't members themselves.
drop policy "story photos upload own" on storage.objects;
create policy "story photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'story-photos' and split_part(name, '/', 1) = public.current_person_id()::text
              and (public.is_member() or public.can_edit_stories()));

-- Public lists, now with the kind of story, the initiative and the video.
drop function public.public_stories(int, boolean);
create function public.public_stories(p_limit int default 24, p_featured_only boolean default false,
                                      p_kind text default null, p_cause_slug text default null)
returns table (slug text, title text, summary text, subject_name text, subject_year_left int, photo_path text,
               photo_caption text, featured boolean, published_at timestamptz, is_impact boolean, has_video boolean,
               cause_slug text, cause_title text)
language sql stable security definer set search_path = ''
as $$
  select s.slug, s.title, s.summary, s.subject_name, s.subject_year_left, s.photo_path, s.photo_caption, s.featured,
         s.published_at, s.kind = 'impact', s.video_url is not null, c.slug, c.title
  from public.alumni_stories s
  left join public.causes c on c.id = s.cause_id
  where s.status = 'published' and (not p_featured_only or s.featured)
    and (p_kind is null or (p_kind = 'impact') = (s.kind = 'impact'))
    and (p_cause_slug is null or c.slug = p_cause_slug)
  order by s.featured desc, s.published_at desc
  limit least(greatest(p_limit, 1), 60);
$$;
grant execute on function public.public_stories(int, boolean, text, text) to anon, authenticated;

drop function public.public_story(text);
create function public.public_story(p_slug text)
returns table (slug text, title text, summary text, body text, subject_name text, subject_year_left int, photo_path text,
               photo_caption text, published_at timestamptz, is_impact boolean, video_url text, cause_slug text, cause_title text)
language sql stable security definer set search_path = ''
as $$
  select s.slug, s.title, s.summary, s.body, s.subject_name, s.subject_year_left, s.photo_path, s.photo_caption, s.published_at,
         s.kind = 'impact', s.video_url, c.slug, c.title
  from public.alumni_stories s
  left join public.causes c on c.id = s.cause_id
  where s.status = 'published' and s.slug = p_slug;
$$;
grant execute on function public.public_story(text) to anon, authenticated;

drop function public.stories_for_review();
create function public.stories_for_review()
returns table (id uuid, slug text, kind text, submitted_by_name text, subject_name text, subject_year_left int,
               subject_contact text, title text, summary text, body text, photo_path text, photo_caption text,
               consent_given boolean, consent_note text, status text, featured boolean, editor_note text,
               published_at timestamptz, created_at timestamptz, cause_id uuid, video_url text)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.slug, s.kind, p.full_name, s.subject_name, s.subject_year_left, s.subject_contact, s.title, s.summary,
         s.body, s.photo_path, s.photo_caption, s.consent_given, s.consent_note, s.status, s.featured, s.editor_note,
         s.published_at, s.created_at, s.cause_id, s.video_url
  from public.alumni_stories s
  join public.persons p on p.id = s.submitted_by
  where public.can_edit_stories()
  order by s.created_at desc;
$$;
revoke execute on function public.stories_for_review() from public, anon;
grant execute on function public.stories_for_review() to authenticated;
