-- Giving and money. SPEC §5.4, §5.5.
-- The platform records money; it never holds it. Each fund pays into a named institutional account.

create type public.account_holder as enum ('school_bom', 'association');
create type public.cause_kind as enum ('campaign', 'ongoing_fund', 'general', 'appeal');
create type public.cause_lifecycle as enum ('draft', 'in_review', 'approved', 'preparation', 'live', 'construction', 'closed');
create type public.cause_visibility as enum ('public', 'members');
create type public.pledge_list_visibility as enum ('public', 'members', 'hidden_totals', 'hidden');
create type public.donor_name_display as enum ('full', 'first_initial', 'anonymous');
create type public.gift_frequency as enum ('once', 'monthly', 'quarterly', 'annually');
create type public.donation_status as enum ('initiated', 'paid', 'failed', 'cancelled', 'refunded');
create type public.recurring_status as enum ('active', 'paused', 'cancelled');
create type public.pledge_type as enum ('one_time', 'monthly', 'quarterly', 'annual', 'in_kind');
create type public.pledge_status as enum ('active', 'fulfilled', 'cancelled');
create type public.pledge_source as enum ('web', 'admin_entry', 'import');
create type public.payment_provider as enum ('mpesa_stk', 'mpesa_c2b', 'card', 'bank', 'cash', 'other');
create type public.payment_status as enum ('pending', 'completed', 'failed', 'reversed');
create type public.entry_method as enum ('webhook', 'manual', 'import');
create type public.allocation_target as enum ('pledge', 'donation', 'membership_fee', 'event_ticket', 'order', 'unallocated');

-- Where money goes ---------------------------------------------------------------------

create table public.payment_channels (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  holder public.account_holder not null,
  account_display_name text not null,
  paybill_number text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  daraja_credentials_ref text,              -- name of the secret holding the keys, never the keys
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.funds (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  channel_id uuid not null references public.payment_channels (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funds_channel_idx on public.funds (channel_id);

create table public.causes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text not null,
  story jsonb not null default '[]',         -- paragraphs
  components jsonb not null default '[]',    -- [{name, purpose}]
  readiness jsonb not null default '[]',     -- [{label, done}]
  kind public.cause_kind not null,
  fund_id uuid not null references public.funds (id),
  target_amount numeric(14, 2),
  official_start_date date,
  end_date date,
  lifecycle public.cause_lifecycle not null default 'draft',
  visibility public.cause_visibility not null default 'public',
  pledges_enabled boolean not null default false,
  pledge_list_visibility public.pledge_list_visibility not null default 'hidden_totals',
  donor_name_display public.donor_name_display not null default 'first_initial',
  preset_amounts numeric(14, 2)[] not null default '{}',
  recurring_periods public.gift_frequency[] not null default '{}',
  suggested_pledges jsonb not null default '[]',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index causes_fund_idx on public.causes (fund_id);

-- Pledges made before online giving (e.g. at the plenary), until they are imported one by one.
create table public.cause_offline_pledges (
  id uuid primary key default gen_random_uuid(),
  cause_id uuid not null references public.causes (id),
  pledged_total numeric(14, 2) not null check (pledged_total >= 0),
  pledge_count int not null check (pledge_count >= 0),
  recorded_on date not null,
  note text,
  created_at timestamptz not null default now()
);
create index cause_offline_pledges_cause_idx on public.cause_offline_pledges (cause_id);

-- Gifts and pledges -------------------------------------------------------------------------

create sequence public.pledge_ref_seq;
create sequence public.donation_ref_seq;

create table public.recurring_gifts (
  id uuid primary key default gen_random_uuid(),
  donor_person_id uuid not null references public.persons (id),
  cause_id uuid not null references public.causes (id),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'KES',
  period public.gift_frequency not null check (period <> 'once'),
  next_due_on date not null,
  status public.recurring_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_gifts_donor_idx on public.recurring_gifts (donor_person_id);
create index recurring_gifts_cause_idx on public.recurring_gifts (cause_id);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  receipt_token uuid not null default gen_random_uuid(),
  cause_id uuid not null references public.causes (id),
  donor_person_id uuid not null references public.persons (id),
  donor_org_id uuid references public.organizations (id),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'KES',
  cover_fees_amount numeric(14, 2) not null default 0,
  frequency public.gift_frequency not null default 'once',
  dedication text,
  comment text,
  is_anonymous boolean not null default false,
  impact_updates_opt_in boolean not null default false,
  recurring_gift_id uuid references public.recurring_gifts (id),
  status public.donation_status not null default 'initiated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index donations_cause_idx on public.donations (cause_id);
create index donations_donor_idx on public.donations (donor_person_id);
create index donations_org_idx on public.donations (donor_org_id);
create index donations_recurring_idx on public.donations (recurring_gift_id);

create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  receipt_token uuid not null default gen_random_uuid(),
  cause_id uuid not null references public.causes (id),
  pledger_person_id uuid not null references public.persons (id),
  pledger_org_id uuid references public.organizations (id),
  pledge_type public.pledge_type not null,
  amount_per_period numeric(14, 2) check (amount_per_period > 0),
  number_of_periods int check (number_of_periods between 1 and 120),
  total_amount numeric(14, 2) check (total_amount >= 0),
  in_kind_description text,
  in_kind_estimated_value numeric(14, 2),
  start_date date not null default current_date,
  is_founding boolean not null default false,
  is_anonymous boolean not null default false,
  impact_updates_opt_in boolean not null default false,
  source public.pledge_source not null default 'web',
  status public.pledge_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (pledge_type = 'in_kind' and in_kind_description is not null)
    or (pledge_type <> 'in_kind' and amount_per_period is not null and number_of_periods is not null
        and total_amount = amount_per_period * number_of_periods)
  )
);
create index pledges_cause_idx on public.pledges (cause_id);
create index pledges_person_idx on public.pledges (pledger_person_id);
create index pledges_org_idx on public.pledges (pledger_org_id);

create table public.pledge_schedules (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid not null references public.pledges (id),
  due_on date not null,
  amount_due numeric(14, 2) not null check (amount_due > 0),
  created_at timestamptz not null default now()
);
create index pledge_schedules_pledge_idx on public.pledge_schedules (pledge_id, due_on);

-- Money received (append-only) -----------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  provider_reference text not null,
  account_reference_entered text,
  channel_id uuid references public.payment_channels (id),
  payer_person_id uuid references public.persons (id),
  payer_phone text,
  payer_name text,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'KES',
  received_at timestamptz not null,
  status public.payment_status not null default 'completed',
  entry_method public.entry_method not null,
  entered_by uuid references public.persons (id),
  evidence_path text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)       -- a repeated callback can never record a payment twice
);
create index payments_channel_idx on public.payments (channel_id);
create index payments_payer_idx on public.payments (payer_person_id);
create index payments_entered_by_idx on public.payments (entered_by);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id),
  target_type public.allocation_target not null,
  target_id uuid,
  fund_id uuid references public.funds (id),
  amount numeric(14, 2) not null check (amount > 0),
  created_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  check ((target_type = 'unallocated') = (target_id is null))
);
create index payment_allocations_payment_idx on public.payment_allocations (payment_id);
create index payment_allocations_target_idx on public.payment_allocations (target_type, target_id);
create index payment_allocations_fund_idx on public.payment_allocations (fund_id);
create index payment_allocations_created_by_idx on public.payment_allocations (created_by);

-- Payments: only the status may change after recording; nothing is ever deleted.
create or replace function public.payments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payments cannot be deleted; reverse them instead' using errcode = '42501';
  end if;
  if (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'only a payment''s status can change after it is recorded' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger payments_guard before update or delete on public.payments
  for each row execute function public.payments_guard();
create trigger payment_allocations_append_only before update or delete on public.payment_allocations
  for each row execute function public.forbid_change();
create trigger cause_offline_pledges_append_only before update or delete on public.cause_offline_pledges
  for each row execute function public.forbid_change();

-- The amounts allocated from one payment can never exceed the payment.
create or replace function public.allocation_within_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_total numeric;
  v_paid numeric;
begin
  select amount into v_paid from public.payments where id = new.payment_id;
  select coalesce(sum(amount), 0) into v_total from public.payment_allocations where payment_id = new.payment_id;
  if v_total + new.amount > v_paid then
    raise exception 'allocations would exceed the payment amount' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger payment_allocations_within before insert on public.payment_allocations
  for each row execute function public.allocation_within_payment();

do $$
declare t text;
begin
  foreach t in array array['payment_channels', 'funds', 'causes', 'recurring_gifts', 'donations', 'pledges', 'payments']
  loop
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t
    );
  end loop;
  foreach t in array array['payment_channels', 'funds', 'causes', 'donations', 'pledges', 'recurring_gifts', 'payments', 'payment_allocations', 'cause_offline_pledges']
  loop
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t, t
    );
  end loop;
end;
$$;

-- Giving from the public website ---------------------------------------------------------------
-- Visitors never write to tables directly. These functions validate input, match or create
-- the person, and return a reference plus a private receipt token for the thank-you page.

create or replace function public.find_or_create_person(p_full_name text, p_email text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := public.normalize_email(p_email);
  v_phone text := public.normalize_phone(p_phone);
  v_by_email uuid;
  v_by_phone uuid;
  v_person uuid;
begin
  if v_email is not null then
    select pc.person_id into v_by_email from public.person_contacts pc
    join public.persons p on p.id = pc.person_id and p.status = 'active'
    where pc.kind = 'email' and pc.value = v_email order by pc.created_at limit 1;
  end if;
  if v_phone is not null then
    select pc.person_id into v_by_phone from public.person_contacts pc
    join public.persons p on p.id = pc.person_id and p.status = 'active'
    where pc.kind = 'phone' and pc.value = v_phone order by pc.created_at limit 1;
  end if;

  v_person := coalesce(v_by_email, v_by_phone);
  if v_person is null then
    insert into public.persons (full_name) values (trim(p_full_name)) returning id into v_person;
  end if;

  if v_email is not null then
    insert into public.person_contacts (person_id, kind, value, is_primary)
    values (v_person, 'email', v_email, not exists (
      select 1 from public.person_contacts where person_id = v_person and kind = 'email' and is_primary))
    on conflict (person_id, kind, value) do nothing;
  end if;
  if v_phone is not null then
    insert into public.person_contacts (person_id, kind, value, is_primary)
    values (v_person, 'phone', v_phone, not exists (
      select 1 from public.person_contacts where person_id = v_person and kind = 'phone' and is_primary))
    on conflict (person_id, kind, value) do nothing;
  end if;

  -- Email and phone point at two different people: flag for a human to check, never merge.
  if v_by_email is not null and v_by_phone is not null and v_by_email <> v_by_phone then
    insert into public.duplicate_flags (person_a_id, person_b_id, reason)
    values (v_by_email, v_by_phone, 'same_phone')
    on conflict do nothing;
  end if;
  return v_person;
end;
$$;

create or replace function public.give(
  p_cause_slug text,
  p_amount numeric,
  p_frequency public.gift_frequency,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_organisation text default null,
  p_anonymous boolean default false,
  p_impact_updates boolean default false,
  p_dedication text default null
)
returns table (reference text, receipt_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cause public.causes;
  v_person uuid;
  v_org uuid;
  v_recurring uuid;
  v_ref text;
  v_token uuid;
begin
  select * into v_cause from public.causes c
  where c.slug = p_cause_slug and c.visibility = 'public' and c.lifecycle in ('preparation', 'live', 'construction');
  if v_cause.id is null then
    raise exception 'This cause is not open for gifts' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 50 or p_amount > 100000000 then
    raise exception 'Amount must be between KES 50 and KES 100,000,000' using errcode = '22023';
  end if;
  if p_frequency <> 'once' and not (p_frequency = any (v_cause.recurring_periods)) then
    raise exception 'That giving frequency is not available for this cause' using errcode = '22023';
  end if;
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;
  if public.normalize_email(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;
  if public.normalize_phone(p_phone) is null then
    raise exception 'A valid phone number is required' using errcode = '22023';
  end if;

  v_person := public.find_or_create_person(trim(p_first_name) || ' ' || trim(p_last_name), p_email, p_phone);
  if nullif(trim(p_organisation), '') is not null then
    insert into public.organizations (name, contact_person_id) values (trim(p_organisation), v_person) returning id into v_org;
  end if;
  if p_impact_updates then
    insert into public.consents (person_id, purpose, granted) values (v_person, 'impact_updates', true);
  end if;
  if p_frequency <> 'once' then
    insert into public.recurring_gifts (donor_person_id, cause_id, amount, period, next_due_on)
    values (
      v_person, v_cause.id, p_amount, p_frequency,
      current_date + case p_frequency when 'monthly' then 30 when 'quarterly' then 91 else 365 end
    )
    returning id into v_recurring;
  end if;

  v_ref := 'MSA-D-' || extract(year from now())::int || '-' || lpad(nextval('public.donation_ref_seq')::text, 6, '0');
  insert into public.donations (
    reference, cause_id, donor_person_id, donor_org_id, amount, frequency, dedication,
    is_anonymous, impact_updates_opt_in, recurring_gift_id
  ) values (
    v_ref, v_cause.id, v_person, v_org, p_amount, p_frequency, nullif(trim(p_dedication), ''),
    coalesce(p_anonymous, false), coalesce(p_impact_updates, false), v_recurring
  ) returning donations.receipt_token into v_token;

  return query select v_ref, v_token;
end;
$$;

create or replace function public.make_pledge(
  p_cause_slug text,
  p_pledge_type public.pledge_type,
  p_amount_per_period numeric,
  p_number_of_periods int,
  p_in_kind_description text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_organisation text default null,
  p_anonymous boolean default false,
  p_impact_updates boolean default false
)
returns table (reference text, receipt_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cause public.causes;
  v_person uuid;
  v_org uuid;
  v_periods int;
  v_ref text;
  v_token uuid;
begin
  select * into v_cause from public.causes c
  where c.slug = p_cause_slug and c.visibility = 'public' and c.pledges_enabled
    and c.lifecycle in ('preparation', 'live', 'construction');
  if v_cause.id is null then
    raise exception 'This cause is not taking pledges' using errcode = '22023';
  end if;
  if p_pledge_type = 'in_kind' then
    if coalesce(trim(p_in_kind_description), '') = '' then
      raise exception 'Describe what you will give' using errcode = '22023';
    end if;
  else
    v_periods := case when p_pledge_type = 'one_time' then 1 else p_number_of_periods end;
    if p_amount_per_period is null or p_amount_per_period < 50 then
      raise exception 'Amount must be at least KES 50' using errcode = '22023';
    end if;
    if v_periods is null or v_periods < 1 or v_periods > 120 then
      raise exception 'Choose how many times you will give' using errcode = '22023';
    end if;
  end if;
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;
  if public.normalize_email(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;
  if public.normalize_phone(p_phone) is null then
    raise exception 'A valid phone number is required' using errcode = '22023';
  end if;

  v_person := public.find_or_create_person(trim(p_first_name) || ' ' || trim(p_last_name), p_email, p_phone);
  if nullif(trim(p_organisation), '') is not null then
    insert into public.organizations (name, contact_person_id) values (trim(p_organisation), v_person) returning id into v_org;
  end if;
  if p_impact_updates then
    insert into public.consents (person_id, purpose, granted) values (v_person, 'impact_updates', true);
  end if;

  v_ref := 'MSA-' || extract(year from now())::int || '-' || lpad(nextval('public.pledge_ref_seq')::text, 6, '0');
  insert into public.pledges (
    reference, cause_id, pledger_person_id, pledger_org_id, pledge_type, amount_per_period,
    number_of_periods, total_amount, in_kind_description, is_founding, is_anonymous, impact_updates_opt_in
  ) values (
    v_ref, v_cause.id, v_person, v_org, p_pledge_type,
    case when p_pledge_type = 'in_kind' then null else p_amount_per_period end,
    v_periods,
    case when p_pledge_type = 'in_kind' then null else p_amount_per_period * v_periods end,
    case when p_pledge_type = 'in_kind' then trim(p_in_kind_description) end,
    v_cause.lifecycle = 'preparation',
    coalesce(p_anonymous, false), coalesce(p_impact_updates, false)
  ) returning pledges.receipt_token into v_token;

  return query select v_ref, v_token;
end;
$$;

-- What the thank-you page shows. Needs the private token, so references cannot be guessed.
create or replace function public.get_receipt(p_reference text, p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object(
        'kind', 'donation', 'reference', d.reference, 'cause_slug', c.slug, 'cause_title', c.title,
        'first_name', split_part(p.full_name, ' ', 1),
        'email', (select value from public.person_contacts where person_id = p.id and kind = 'email' and is_primary limit 1),
        'amount', d.amount, 'frequency', d.frequency, 'created_at', d.created_at)
     from public.donations d
     join public.causes c on c.id = d.cause_id
     join public.persons p on p.id = d.donor_person_id
     where d.reference = p_reference and d.receipt_token = p_token),
    (select jsonb_build_object(
        'kind', 'pledge', 'reference', pl.reference, 'cause_slug', c.slug, 'cause_title', c.title,
        'first_name', split_part(p.full_name, ' ', 1),
        'email', (select value from public.person_contacts where person_id = p.id and kind = 'email' and is_primary limit 1),
        'pledge_type', pl.pledge_type, 'amount_per_period', pl.amount_per_period,
        'number_of_periods', pl.number_of_periods, 'total_amount', pl.total_amount,
        'in_kind_description', pl.in_kind_description, 'is_founding', pl.is_founding, 'created_at', pl.created_at)
     from public.pledges pl
     join public.causes c on c.id = pl.cause_id
     join public.persons p on p.id = pl.pledger_person_id
     where pl.reference = p_reference and pl.receipt_token = p_token)
  );
$$;

-- Public progress figures, always computed from records (never stored).
create or replace function public.cause_progress(p_slug text)
returns table (pledged numeric, received numeric, pledge_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select id from public.causes where slug = p_slug and visibility = 'public')
  select
    coalesce((select sum(total_amount) from public.pledges where cause_id = (select id from c) and status <> 'cancelled'), 0)
      + coalesce((select sum(pledged_total) from public.cause_offline_pledges where cause_id = (select id from c)), 0),
    coalesce((
      select sum(pa.amount) from public.payment_allocations pa
      join public.payments pm on pm.id = pa.payment_id and pm.status = 'completed'
      where (pa.target_type = 'pledge' and pa.target_id in (select id from public.pledges where cause_id = (select id from c)))
         or (pa.target_type = 'donation' and pa.target_id in (select id from public.donations where cause_id = (select id from c)))
    ), 0),
    (select count(*) from public.pledges where cause_id = (select id from c) and status <> 'cancelled')
      + coalesce((select sum(pledge_count) from public.cause_offline_pledges where cause_id = (select id from c)), 0);
$$;

revoke execute on function public.find_or_create_person(text, text, text) from public, anon, authenticated;
revoke execute on function public.payments_guard() from public, anon, authenticated;
revoke execute on function public.allocation_within_payment() from public, anon, authenticated;
grant execute on function public.give(text, numeric, public.gift_frequency, text, text, text, text, text, boolean, boolean, text) to anon, authenticated;
grant execute on function public.make_pledge(text, public.pledge_type, numeric, int, text, text, text, text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.get_receipt(text, uuid) to anon, authenticated;
grant execute on function public.cause_progress(text) to anon, authenticated;
