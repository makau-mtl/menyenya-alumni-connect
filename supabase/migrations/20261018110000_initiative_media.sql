-- Initiative media (product owner, 18 Oct 2026): one short video per initiative with a caption,
-- photos grouped (the design, today, progress, impact), and a launch kit that a NEW initiative must have
-- before it goes public: a cover photo, a video and at least three photos. The three existing
-- initiatives are exempt (guide only). Managed by administrators.

alter table public.causes
  add column video_url text check (video_url is null or video_url ~* '^https://youtu\.be/[A-Za-z0-9_-]{6,}$'),
  add column video_title text check (video_title is null or length(trim(video_title)) between 3 and 80),     -- e.g. "Message from the lead architect"
  add column video_speaker text check (video_speaker is null or length(trim(video_speaker)) between 2 and 100), -- e.g. "Peter Ondieki, Class of 2012"
  add column launch_kit_required boolean not null default true;

update public.causes set launch_kit_required = false where slug in ('tuition-block', 'alumni-fund', 'bursary-fund');

alter table public.cause_photos
  add column purpose text not null default 'general' check (purpose in ('design', 'today', 'progress', 'impact', 'general'));

-- A new initiative can't go public until its launch kit is complete.
create or replace function public.causes_launch_kit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_photos int;
begin
  if not new.launch_kit_required or new.lifecycle not in ('preparation', 'live', 'construction') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.lifecycle in ('preparation', 'live', 'construction') then
    return new;  -- already public
  end if;
  select count(*) into v_photos from public.cause_photos where cause_id = new.id and status = 'published';
  if new.video_url is null or new.video_title is null or v_photos < 3 then
    raise exception 'Before going public, add a video with its caption and at least three photos (the first is the cover)'
      using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger causes_launch_kit before insert or update of lifecycle on public.causes
  for each row execute function public.causes_launch_kit();
