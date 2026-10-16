-- Every member is in the directory (product owner, 16 Oct 2026): being visible to fellow members is part
-- of membership. Members choose who sees their phone and email: only the association (default),
-- their class, or all members. Public profiles stay opt-in.

alter table public.member_profiles
  add column contact_visibility text not null default 'hidden'
    check (contact_visibility in ('hidden', 'cohort', 'members'));

-- Directory: all current members, to signed-in members.
create or replace function public.directory_search(
  p_query text default null, p_year int default null, p_region text default null,
  p_category text default null, p_mentoring text default null, p_limit int default 48, p_offset int default 0)
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, region text,
               headline text, profession text, skills text[], mentoring_offer public.mentoring_offer,
               photo_path text, total bigint)
language sql stable security definer set search_path = ''
as $$
  with listed as (
    select p.id, p.full_name, mc.key as category, mp.year_left, mp.relationship_to_school, cl.name as region,
           mp.headline, mp.profession, mp.skills, mp.mentoring_offer, mp.photo_path, mp.employer_or_business
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
    and (nullif(trim(p_query), '') is null
         or strpos(lower(l.full_name), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.headline, '')), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.profession, '')), lower(trim(p_query))) > 0
         or strpos(lower(coalesce(l.employer_or_business, '')), lower(trim(p_query))) > 0
         or exists (select 1 from unnest(l.skills) s where strpos(lower(s), lower(trim(p_query))) > 0))
  order by l.full_name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- Can the signed-in person see this member's phone and email?
create or replace function public.can_see_contacts(p_person uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_person = public.current_person_id()
      or public.is_admin()
      or exists (
        select 1 from public.member_profiles target
        where target.person_id = p_person and target.membership_status <> 'terminated'
          and public.is_member()
          and (target.contact_visibility = 'members'
               or (target.contact_visibility = 'cohort' and target.cohort_id is not null and exists (
                     select 1 from public.member_profiles me
                     where me.person_id = public.current_person_id() and me.cohort_id = target.cohort_id))));
$$;

-- Member card, with phone and email only when the member allows it.
drop function public.directory_member(uuid);
create function public.directory_member(p_person uuid)
returns table (person_id uuid, full_name text, category text, year_left int, relationship text, region text,
               level text, headline text, profession text, employer text, products_services text, skills text[],
               mentoring_offer public.mentoring_offer, willing_to_volunteer boolean, linkedin_url text,
               profile_link text, social_links jsonb, photo_path text, phone text, phone_whatsapp boolean,
               email text, contact_visibility text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, mc.key, mp.year_left, mp.relationship_to_school, cl.name, ml.name, mp.headline,
         mp.profession, mp.employer_or_business, mp.products_services, mp.skills, mp.mentoring_offer,
         mp.willing_to_volunteer, mp.linkedin_url, mp.profile_link, mp.social_links, mp.photo_path,
         case when public.can_see_contacts(p.id) then ph.value end,
         case when public.can_see_contacts(p.id) then ph.is_whatsapp end,
         case when public.can_see_contacts(p.id) then em.value end,
         mp.contact_visibility
  from public.member_profiles mp
  join public.persons p on p.id = mp.person_id and p.status = 'active'
  join public.member_categories mc on mc.id = mp.category_id
  left join public.clusters cl on cl.id = mp.cluster_id
  left join public.membership_levels ml on ml.id = mp.level_id
  left join lateral (select c.value, c.is_whatsapp from public.person_contacts c
                     where c.person_id = p.id and c.kind = 'phone' order by c.is_primary desc, c.created_at limit 1) ph on true
  left join lateral (select c.value from public.person_contacts c
                     where c.person_id = p.id and c.kind = 'email' order by c.is_primary desc, c.created_at limit 1) em on true
  where mp.person_id = p_person
    and mp.membership_status <> 'terminated'
    and (public.is_member() or public.is_admin());
$$;
revoke execute on function public.directory_member(uuid) from public, anon;
grant execute on function public.directory_member(uuid) to authenticated;

-- Photos: visible to all current members (and to anyone when the owner has a public profile).
create or replace function public.member_photo_visible(p_folder text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_folder = public.current_person_id()::text
      or public.is_admin()
      or public.member_photo_public(p_folder)
      or (public.is_member() and exists (
            select 1 from public.member_profiles mp
            where mp.person_id::text = p_folder and mp.membership_status <> 'terminated'));
$$;
