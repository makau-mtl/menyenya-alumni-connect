-- People, membership and pick lists. SPEC §5.1, §5.2.

create type public.person_status as enum ('active', 'merged', 'deleted_on_request');
create type public.contact_kind as enum ('phone', 'email');
create type public.org_type as enum ('company', 'church', 'sacco', 'foundation', 'ngo', 'school', 'other');
create type public.occupation_status as enum ('employed', 'business', 'self_employed', 'studying', 'seeking', 'other');
create type public.mentoring_offer as enum ('none', 'can_mentor', 'wants_mentor');
create type public.membership_status as enum ('registered', 'verified', 'active', 'lapsed', 'exited');
create type public.consent_purpose as enum (
  'membership_data', 'email_updates', 'whatsapp_updates', 'directory_listing', 'impact_updates', 'media_use'
);
create type public.duplicate_status as enum ('open', 'merged', 'not_duplicate');
create type public.fee_type as enum ('none', 'one_off', 'annual');

-- Pick lists (admin-editable) ------------------------------------------------

create table public.member_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  required_fields jsonb not null default '[]',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.membership_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  offers text,
  fee_amount numeric(14, 2) not null default 0,
  fee_type public.fee_type not null default 'none',
  can_mentor boolean not null default false,
  can_request_mentor boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.counties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  year_left int not null unique check (year_left between 1950 and 2100),
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- People -----------------------------------------------------------------------

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  display_name text,
  status public.person_status not null default 'active',
  merged_into_id uuid references public.persons (id),
  user_id uuid unique,                       -- auth.users.id once the person has a login
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'merged' or merged_into_id is not null)
);
create index persons_merged_into_idx on public.persons (merged_into_id);

create table public.person_contacts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id),
  kind public.contact_kind not null,
  value text not null,                       -- phones in E.164 (+2547…), emails lower-case
  is_primary boolean not null default false,
  is_whatsapp boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, kind, value)
);
create index person_contacts_person_idx on public.person_contacts (person_id);
create index person_contacts_lookup_idx on public.person_contacts (kind, value);
create unique index person_contacts_one_primary on public.person_contacts (person_id, kind) where is_primary;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type public.org_type not null default 'other',
  contact_person_id uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizations_contact_idx on public.organizations (contact_person_id);

create table public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.persons (id),
  category_id uuid not null references public.member_categories (id),
  level_id uuid references public.membership_levels (id),
  cohort_id uuid references public.cohorts (id),
  admission_year int,
  year_left int,
  class_or_stream text,
  relationship_to_school text,
  home_county text,
  cluster_id uuid references public.clusters (id),
  occupation_status public.occupation_status,
  profession text,
  employer_or_business text,
  profile_link text,
  products_services text,
  skills text[] not null default '{}',
  willing_to_volunteer boolean not null default false,
  mentoring_offer public.mentoring_offer not null default 'none',
  membership_status public.membership_status not null default 'registered',
  verified_by uuid references public.persons (id),
  verified_at timestamptz,
  invited_by_person_id uuid references public.persons (id),
  registration_source text not null default 'web',
  directory_visibility jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index member_profiles_category_idx on public.member_profiles (category_id);
create index member_profiles_level_idx on public.member_profiles (level_id);
create index member_profiles_cohort_idx on public.member_profiles (cohort_id);
create index member_profiles_cluster_idx on public.member_profiles (cluster_id);
create index member_profiles_verified_by_idx on public.member_profiles (verified_by);
create index member_profiles_invited_by_idx on public.member_profiles (invited_by_person_id);

-- Restricted: visible only to the member, admin and welfare coordinator (see RLS).
create table public.next_of_kin (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id),
  name text not null,
  relationship text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index next_of_kin_person_idx on public.next_of_kin (person_id);

-- History is kept: a new row for every grant or withdrawal.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id),
  purpose public.consent_purpose not null,
  granted boolean not null,
  wording_version text not null default 'v1',
  created_at timestamptz not null default now()
);
create index consents_person_idx on public.consents (person_id, purpose, created_at desc);

create table public.duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  person_a_id uuid not null references public.persons (id),
  person_b_id uuid not null references public.persons (id),
  reason text not null,
  status public.duplicate_status not null default 'open',
  resolved_by uuid references public.persons (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (person_a_id <> person_b_id)
);
create index duplicate_flags_a_idx on public.duplicate_flags (person_a_id);
create index duplicate_flags_b_idx on public.duplicate_flags (person_b_id);
create index duplicate_flags_resolved_by_idx on public.duplicate_flags (resolved_by);
create unique index duplicate_flags_pair_open on public.duplicate_flags
  (least(person_a_id, person_b_id), greatest(person_a_id, person_b_id), reason) where status = 'open';

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'member_categories', 'membership_levels', 'clusters', 'counties', 'cohorts', 'persons',
    'person_contacts', 'organizations', 'member_profiles', 'next_of_kin', 'duplicate_flags'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- Helpers ----------------------------------------------------------------------

-- Phones are stored in E.164. Kenyan numbers typed as 07…, 01…, 2547… or +2547… become +2547….
create or replace function public.normalize_phone(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p ~ '^\+\d{8,15}$' then p
    when p ~ '^0[17]\d{8}$' then '+254' || substr(p, 2)
    when p ~ '^254[17]\d{8}$' then '+' || p
    when p ~ '^[17]\d{8}$' then '+254' || p
    else null
  end
  from (select regexp_replace(coalesce(raw, ''), '[\s\-().]', '', 'g') as p) s;
$$;

create or replace function public.normalize_email(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(lower(trim(raw)), '');
$$;
