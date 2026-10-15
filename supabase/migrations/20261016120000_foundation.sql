-- Foundation: shared helpers, audit trail, sensitive-access log.
-- SPEC §1 (non-negotiables), §5.9 (audit_log, sensitive_access_log).

-- Keep updated_at current on every row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Append-only audit trail. Written by triggers and by server code through log_audit().
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_person_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Who viewed restricted data (next of kin, welfare, beneficiaries), when and why.
create table public.sensitive_access_log (
  id bigint generated always as identity primary key,
  viewer_person_id uuid,
  subject_person_id uuid,
  data_kind text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Neither log can be changed or removed once written.
create or replace function public.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function public.forbid_change();
create trigger sensitive_access_log_append_only before update or delete on public.sensitive_access_log
  for each row execute function public.forbid_change();
