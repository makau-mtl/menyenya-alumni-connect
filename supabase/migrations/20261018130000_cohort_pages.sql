-- Cohort pages (product owner, 18 Oct 2026): every year group ("Class of 2004 cohort") has a members-only
-- page. Cohort reps are elected leaders: an administrator gives the role after the election, with the
-- term. The rep (or an administrator) writes the welcome note and sets the WhatsApp link.

update public.roles
set name = 'Cohort rep', description = 'Elected representative of a cohort (year group): welcomes and confirms members of the cohort, keeps its page and WhatsApp group'
where key = 'cohort_rep';

alter table public.class_groups
  add column welcome text not null default '' check (length(welcome) <= 800);

-- Everything on a cohort page, for signed-in members. The WhatsApp link only for the cohort itself.
create or replace function public.cohort_page(p_year int)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_cohort public.cohorts%rowtype;
  v_me uuid := public.current_person_id();
  v_mine boolean;
  v_result jsonb;
begin
  if not (public.is_member() or public.is_admin()) then
    return null;
  end if;
  select * into v_cohort from public.cohorts where year_left = p_year;
  if v_cohort.id is null then
    return null;
  end if;
  v_mine := exists (select 1 from public.member_profiles where person_id = v_me and cohort_id = v_cohort.id);

  with m as (
    select mp.person_id, mp.year_left from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    join public.member_categories mc on mc.id = mp.category_id and mc.key = 'alumnus'
    where mp.membership_status <> 'terminated' and mp.year_left is not null
  ),
  ranks as (select year_left, count(*) as n, rank() over (order by count(*) desc) as r from m group by year_left)
  select jsonb_build_object(
    'year', v_cohort.year_left,
    'mine', v_mine,
    'can_edit', public.is_admin() or public.has_role('cohort_rep', 'cohort', v_cohort.id),
    'members', coalesce((select n from ranks where year_left = p_year), 0),
    'rank', (select r from ranks where year_left = p_year),
    'cohorts_ranked', (select count(*) from ranks),
    'welcome', coalesce((select welcome from public.class_groups where cohort_id = v_cohort.id), ''),
    'whatsapp_url', case when v_mine or public.is_admin() then (select whatsapp_url from public.class_groups where cohort_id = v_cohort.id) end,
    'reps', coalesce((
      select jsonb_agg(jsonb_build_object('person_id', p.id, 'name', p.full_name, 'photo_path', mp.photo_path,
                                          'starts_on', ra.starts_on, 'ends_on', ra.ends_on) order by ra.starts_on)
      from public.role_assignments ra
      join public.roles r on r.id = ra.role_id and r.key = 'cohort_rep'
      join public.persons p on p.id = ra.person_id and p.status = 'active'
      left join public.member_profiles mp on mp.person_id = p.id
      where ra.scope_type = 'cohort' and ra.scope_id = v_cohort.id
        and ra.starts_on <= current_date and (ra.ends_on is null or ra.ends_on >= current_date)), '[]'),
    'meetups', coalesce((
      select jsonb_agg(jsonb_build_object('id', mt.id, 'title', mt.title, 'place', mt.place, 'happens_on', mt.happens_on,
                                          'time_note', mt.time_note, 'organiser', p.full_name,
                                          'going', (select count(*) from public.meetup_responses r where r.meetup_id = mt.id and r.going)) order by mt.happens_on)
      from public.meetups mt join public.persons p on p.id = mt.organiser_id
      where mt.status = 'open' and mt.happens_on >= current_date and mt.audience = 'class' and mt.cohort_id = v_cohort.id
        and (v_mine or public.is_admin())), '[]')
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.cohort_page(int) from public, anon;
grant execute on function public.cohort_page(int) to authenticated;

create or replace function public.set_cohort_welcome(p_year int, p_text text)
returns void language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_cohort uuid;
begin
  select id into v_cohort from public.cohorts where year_left = p_year;
  if v_cohort is null then
    raise exception 'Unknown cohort';
  end if;
  if not (public.is_admin() or public.has_role('cohort_rep', 'cohort', v_cohort)) then
    raise exception 'Only the cohort rep or an administrator can change this' using errcode = '42501';
  end if;
  insert into public.class_groups (cohort_id, welcome, updated_by)
  values (v_cohort, left(trim(coalesce(p_text, '')), 800), public.current_person_id())
  on conflict (cohort_id) do update set welcome = excluded.welcome, updated_by = excluded.updated_by;
end;
$$;
revoke execute on function public.set_cohort_welcome(int, text) from public, anon;
grant execute on function public.set_cohort_welcome(int, text) to authenticated;
