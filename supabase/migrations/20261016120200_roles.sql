-- Roles, scoped role assignments, the has_role() check, login linking and audit triggers. SPEC §4, §5.3.

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  allowed_scope_types text[] not null default '{association}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.committees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  purpose text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A role held by a person, for a scope (association, one cohort, one cluster…), for a term.
create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id),
  role_id uuid not null references public.roles (id),
  scope_type text not null default 'association'
    check (scope_type in ('association', 'cohort', 'cluster', 'committee', 'cause', 'school')),
  scope_id uuid,
  starts_on date not null default current_date,
  ends_on date,
  assigned_by uuid references public.persons (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on),
  check ((scope_type = 'association') = (scope_id is null))
);
create index role_assignments_person_idx on public.role_assignments (person_id);
create index role_assignments_role_idx on public.role_assignments (role_id);
create index role_assignments_assigned_by_idx on public.role_assignments (assigned_by);

create trigger roles_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger committees_updated_at before update on public.committees
  for each row execute function public.set_updated_at();
create trigger role_assignments_updated_at before update on public.role_assignments
  for each row execute function public.set_updated_at();

-- The signed-in person -----------------------------------------------------------

create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.persons p where p.user_id = auth.uid() and p.status = 'active' limit 1;
$$;

-- The single permission check used by access rules and server code.
-- has_role('treasurer')                      any active treasurer assignment
-- has_role('cohort_rep', 'cohort', <id>)     cohort rep for that cohort
create or replace function public.has_role(role_key text, scope text default null, scope_ref uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.person_id = public.current_person_id()
      and r.key = role_key
      and ra.starts_on <= current_date
      and (ra.ends_on is null or ra.ends_on >= current_date)
      and (scope is null or ra.scope_type = scope)
      and (scope_ref is null or ra.scope_id = scope_ref)
  );
$$;

-- Audit ----------------------------------------------------------------------------

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_person_id, action, entity_type, entity_id, before, after)
  values (
    public.current_person_id(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['persons', 'person_contacts', 'member_profiles', 'next_of_kin', 'role_assignments', 'duplicate_flags']
  loop
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row()',
      t, t
    );
  end loop;
end;
$$;

-- For server code that needs to record an action explicitly.
create or replace function public.log_audit(p_action text, p_entity_type text, p_entity_id uuid, p_after jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_person_id, action, entity_type, entity_id, after)
  values (public.current_person_id(), p_action, p_entity_type, p_entity_id, p_after);
$$;

-- Linking logins to people -------------------------------------------------------------
-- When a login's email is confirmed, link it to the person who already has that email
-- (for example someone who gave before registering); otherwise create a new person.

create or replace function public.link_user_to_person(p_user_id uuid, p_email text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := public.normalize_email(p_email);
  v_person uuid;
begin
  select id into v_person from public.persons where user_id = p_user_id;
  if v_person is not null then
    return v_person;
  end if;

  select pc.person_id into v_person
  from public.person_contacts pc
  join public.persons p on p.id = pc.person_id
  where pc.kind = 'email' and pc.value = v_email and p.user_id is null and p.status = 'active'
  order by pc.created_at
  limit 1;

  if v_person is null then
    insert into public.persons (full_name, user_id)
    values (coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)), p_user_id)
    returning id into v_person;
    insert into public.person_contacts (person_id, kind, value, is_primary, verified_at)
    values (v_person, 'email', v_email, true, now());
  else
    update public.persons set user_id = p_user_id where id = v_person;
    update public.person_contacts set verified_at = coalesce(verified_at, now())
    where person_id = v_person and kind = 'email' and value = v_email;
  end if;
  return v_person;
end;
$$;

create or replace function public.on_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform public.link_user_to_person(
      new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_change
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.on_auth_user_change();

-- Makes the first administrator. Run once from the Supabase SQL editor:
--   select public.bootstrap_admin('you@example.com');
-- Not callable from the website.
create or replace function public.bootstrap_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_person uuid;
  v_role uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No login found for %. Create the user in Authentication first.', p_email;
  end if;
  v_person := public.link_user_to_person(v_user, p_email, null);
  select id into v_role from public.roles where key = 'admin';
  if not exists (
    select 1 from public.role_assignments
    where person_id = v_person and role_id = v_role and (ends_on is null or ends_on >= current_date)
  ) then
    insert into public.role_assignments (person_id, role_id, notes) values (v_person, v_role, 'bootstrap');
  end if;
  return v_person;
end;
$$;

-- Supabase grants new functions to anon and authenticated by default; take these back.
revoke execute on function public.link_user_to_person(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.on_auth_user_change() from public, anon, authenticated;
revoke execute on function public.bootstrap_admin(text) from public, anon, authenticated;
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.log_audit(text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;
