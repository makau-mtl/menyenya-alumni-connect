-- "Members in numbers" in detail (product owner, 17 Oct 2026): every class and region, alumni and friends,
-- and how membership has grown month by month. Women and men stay hidden below 5, as on the dashboard.
create or replace function public.community_breakdown()
returns jsonb language sql stable security definer set search_path = ''
as $$
  with m as (
    select mp.*, mc.key as category, cl.name as region
    from public.member_profiles mp
    join public.persons p on p.id = mp.person_id and p.status = 'active'
    join public.member_categories mc on mc.id = mp.category_id
    left join public.clusters cl on cl.id = mp.cluster_id
    where mp.membership_status <> 'terminated'
  )
  select case when public.is_member() or public.is_admin() then jsonb_build_object(
    'classes', coalesce((select jsonb_agg(jsonb_build_object('year', year_left, 'count', n) order by year_left desc)
                         from (select year_left, count(*) as n from m where category = 'alumnus' and year_left is not null group by year_left) x), '[]'),
    'regions', coalesce((select jsonb_agg(jsonb_build_object('name', region, 'count', n) order by n desc)
                         from (select region, count(*) as n from m where region is not null group by region) x), '[]'),
    'decades', coalesce((select jsonb_agg(jsonb_build_object('decade', d, 'count', n) order by d)
                         from (select (year_left / 10) * 10 as d, count(*) as n from m where category = 'alumnus' and year_left is not null group by 1) x), '[]'),
    'joined_by_month', coalesce((select jsonb_agg(jsonb_build_object('month', to_char(mo, 'YYYY-MM'), 'count', n) order by mo)
                                 from (select date_trunc('month', registered_at) as mo, count(*) as n from m where registered_at is not null
                                       group by 1 order by 1 desc limit 12) x), '[]'),
    'female', (select case when count(*) >= 5 then count(*) end from m where gender = 'female'),
    'male', (select case when count(*) >= 5 then count(*) end from m where gender = 'male'),
    'gender_answered', (select count(*) from m where gender in ('female', 'male')),
    'alumni', (select count(*) from m where category = 'alumnus'),
    'friends', (select count(*) from m where category = 'friend'),
    'total', (select count(*) from m)
  ) end;
$$;
revoke execute on function public.community_breakdown() from public, anon;
grant execute on function public.community_breakdown() to authenticated;
