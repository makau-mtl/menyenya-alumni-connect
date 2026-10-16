-- Content officials edit from the admin area (M2): cause photos, site photos, site settings
-- such as the Chairman's video, and news and events. Photos live in the public "site-media"
-- storage bucket; the tables hold their paths and captions.
-- Who edits: administrators edit everything; the Secretary also writes news.

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.news_kind as enum ('news', 'event');

-- Can the signed-in person write news?
create or replace function public.can_edit_news()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.has_role('admin') or public.has_role('secretary'); $$;

-- Photos for a cause's gallery. The first published photo is its cover.
create table public.cause_photos (
  id uuid primary key default gen_random_uuid(),
  cause_id uuid not null references public.causes (id),
  path text not null unique,             -- in the site-media bucket, without the size suffix
  caption text not null default '',
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  uploaded_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cause_photos_cause_idx on public.cause_photos (cause_id, sort_order);
create index cause_photos_uploaded_by_idx on public.cause_photos (uploaded_by);

-- One photo per named space on the website (for example the home page's main photo).
create table public.site_photos (
  id uuid primary key default gen_random_uuid(),
  slot text not null unique check (slot ~ '^[a-z0-9.-]+$'),
  path text not null,
  caption text not null default '',
  status public.content_status not null default 'published',
  uploaded_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_photos_uploaded_by_idx on public.site_photos (uploaded_by);

-- Simple settings shown on the public site, such as the Chairman's video.
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}',
  updated_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_settings_updated_by_idx on public.site_settings (updated_by);

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind public.news_kind not null default 'news',
  title text not null check (length(trim(title)) > 0),
  summary text not null check (length(trim(summary)) > 0),
  body jsonb not null default '[]',      -- paragraphs
  happens_on date not null,              -- the event date, or the date of the news
  photo_path text,
  photo_caption text not null default '',
  status public.content_status not null default 'draft',
  created_by uuid references public.persons (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_posts_listing_idx on public.news_posts (status, happens_on desc);
create index news_posts_created_by_idx on public.news_posts (created_by);

do $$
declare t text;
begin
  foreach t in array array['cause_photos', 'site_photos', 'site_settings', 'news_posts'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  -- Every change to public content is recorded (causes already are).
  foreach t in array array['cause_photos', 'site_photos', 'site_settings', 'news_posts'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t, t);
  end loop;
end;
$$;

-- Stamp who made the change, so the site never trusts a value sent from the browser.
create or replace function public.stamp_content_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'news_posts' then
    if tg_op = 'INSERT' then new.created_by := public.current_person_id(); end if;
    if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  elsif tg_table_name = 'site_settings' then
    new.updated_by := public.current_person_id();
  elsif tg_op = 'INSERT' or new.path is distinct from old.path then
    new.uploaded_by := public.current_person_id();
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_content_author() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['cause_photos', 'site_photos', 'site_settings', 'news_posts'] loop
    execute format('create trigger %I_author before insert or update on public.%I for each row execute function public.stamp_content_author()', t, t);
  end loop;
end;
$$;

-- Access rules ---------------------------------------------------------------------------------
alter table public.cause_photos enable row level security;
alter table public.site_photos enable row level security;
alter table public.site_settings enable row level security;
alter table public.news_posts enable row level security;

-- Visitors see published photos of causes they can see (the causes rule applies inside).
create policy "cause photos readable" on public.cause_photos for select to anon, authenticated
  using ((status = 'published' and exists (select 1 from public.causes c where c.id = cause_id)) or public.is_admin());
create policy "cause photos admin insert" on public.cause_photos for insert to authenticated with check (public.is_admin());
create policy "cause photos admin update" on public.cause_photos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "site photos readable" on public.site_photos for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy "site photos admin insert" on public.site_photos for insert to authenticated with check (public.is_admin());
create policy "site photos admin update" on public.site_photos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "site settings readable" on public.site_settings for select to anon, authenticated using (true);
create policy "site settings admin insert" on public.site_settings for insert to authenticated with check (public.is_admin());
create policy "site settings admin update" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "news readable" on public.news_posts for select to anon, authenticated
  using (status = 'published' or public.can_edit_news());
create policy "news editors insert" on public.news_posts for insert to authenticated with check (public.can_edit_news());
create policy "news editors update" on public.news_posts for update to authenticated
  using (public.can_edit_news()) with check (public.can_edit_news());

-- Storage: one public bucket for website photos. Anyone can view; only editors upload,
-- and the Secretary only into the news folder. Files are never deleted from the website.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "site media editors upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and (public.is_admin() or (split_part(name, '/', 1) = 'news' and public.can_edit_news()))
  );

-- Starting content: the news items that were written into the website, and the video setting.
insert into public.site_settings (key, value) values
  ('chair_video', '{"youtubeId": null}');

insert into public.news_posts (slug, kind, title, summary, happens_on, status, published_at) values
  ('technical-committee-29-october', 'event', 'Technical Committee meeting',
   'The committee reviews proposals to strengthen the association ahead of the tuition block campaign. Online, 8:00 pm.',
   '2026-10-29', 'published', now()),
  ('officials-meeting-15-october', 'news', 'Officials welcome plans to strengthen the association',
   'Officials reviewed proposals on registration, a small secretariat, member consultation and this platform.',
   '2026-10-15', 'published', now()),
  ('plenary-20-september', 'news', 'Plenary agrees a KES 100 million tuition block',
   'Members agreed to raise KES 100 million over three years, and 18 members pledged KES 3.41 million on the day.',
   '2026-09-20', 'published', now());
