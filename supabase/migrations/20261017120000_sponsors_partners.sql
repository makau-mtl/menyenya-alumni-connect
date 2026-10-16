-- Ways to support (product owner, 17 Oct 2026): corporate sponsorships and strategic partnerships.
-- Administrators manage the sponsors and partners shown on the website, the sponsorship packages,
-- and read enquiries sent from the two pages. The platform records interest; it never holds money.

create type public.supporter_kind as enum ('sponsor', 'partner');
create type public.enquiry_status as enum ('new', 'in_progress', 'closed');

-- Packages (sponsorships) and areas (partnerships) offered on each page.
create table public.support_packages (
  id uuid primary key default gen_random_uuid(),
  kind public.supporter_kind not null,
  name text not null check (length(trim(name)) between 2 and 80),
  audience text check (audience is null or length(audience) <= 160),     -- "For businesses that want to…"
  description text not null default '' check (length(description) <= 600),
  benefits text[] not null default '{}' check (cardinality(benefits) <= 12),
  amount_kes numeric(14, 0) check (amount_kes is null or amount_kes > 0), -- left blank until leadership approves
  amount_period text check (amount_period is null or amount_period in ('one_off', 'annual')),
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_packages_kind_idx on public.support_packages (kind, sort_order);

-- Sponsors and partners shown on the website (institutions, not people).
create table public.supporters (
  id uuid primary key default gen_random_uuid(),
  kind public.supporter_kind not null,
  name text not null check (length(trim(name)) between 2 and 120),
  website_url text check (website_url is null or website_url ~* '^https://[^\s]+$'),
  logo_path text,                                   -- in the public site-media bucket
  blurb text check (blurb is null or length(blurb) <= 300),
  package_id uuid references public.support_packages (id),
  since_year int check (since_year is null or since_year between 1970 and 2100),
  featured boolean not null default false,          -- also on the home page
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index supporters_kind_idx on public.supporters (kind, sort_order);
create index supporters_package_idx on public.supporters (package_id);

-- Enquiries from organisations. Personal data: administrators only; never deleted.
create table public.support_enquiries (
  id uuid primary key default gen_random_uuid(),
  kind public.supporter_kind not null,
  organisation text not null,
  contact_name text not null,
  email text not null,
  phone text,
  package_id uuid references public.support_packages (id),
  message text not null default '',
  status public.enquiry_status not null default 'new',
  notes text not null default '',
  handled_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_enquiries_status_idx on public.support_enquiries (status, created_at desc);
create index support_enquiries_package_idx on public.support_enquiries (package_id);
create index support_enquiries_handled_by_idx on public.support_enquiries (handled_by);

create trigger support_packages_updated_at before update on public.support_packages for each row execute function public.set_updated_at();
create trigger supporters_updated_at before update on public.supporters for each row execute function public.set_updated_at();
create trigger support_enquiries_updated_at before update on public.support_enquiries for each row execute function public.set_updated_at();
create trigger support_packages_audit after insert or update or delete on public.support_packages for each row execute function public.audit_row();
create trigger supporters_audit after insert or update or delete on public.supporters for each row execute function public.audit_row();
create trigger support_enquiries_audit after insert or update or delete on public.support_enquiries for each row execute function public.audit_row();

alter table public.support_packages enable row level security;
alter table public.supporters enable row level security;
alter table public.support_enquiries enable row level security;

create policy "packages readable" on public.support_packages for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy "packages admin insert" on public.support_packages for insert to authenticated with check (public.is_admin());
create policy "packages admin update" on public.support_packages for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "supporters readable" on public.supporters for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy "supporters admin insert" on public.supporters for insert to authenticated with check (public.is_admin());
create policy "supporters admin update" on public.supporters for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Enquiries arrive only through submit_support_enquiry(); administrators read and update them.
create policy "enquiries admin read" on public.support_enquiries for select to authenticated using (public.is_admin());
create policy "enquiries admin update" on public.support_enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- The public enquiry form. Checks the details and limits repeated sending from one address.
create or replace function public.submit_support_enquiry(
  p_kind public.supporter_kind, p_organisation text, p_contact_name text, p_email text,
  p_phone text default null, p_package_id uuid default null, p_message text default '')
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if length(trim(coalesce(p_organisation, ''))) not between 2 and 160 then raise exception 'organisation required'; end if;
  if length(trim(coalesce(p_contact_name, ''))) not between 2 and 120 then raise exception 'name required'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then raise exception 'valid email required'; end if;
  if length(coalesce(p_phone, '')) > 30 or length(coalesce(p_message, '')) > 3000 then raise exception 'too long'; end if;
  if p_package_id is not null and not exists (
       select 1 from public.support_packages where id = p_package_id and kind = p_kind and status = 'published') then
    raise exception 'unknown package';
  end if;
  if (select count(*) from public.support_enquiries
      where email = v_email and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too many enquiries';
  end if;
  insert into public.support_enquiries (kind, organisation, contact_name, email, phone, package_id, message)
  values (p_kind, trim(p_organisation), trim(p_contact_name), v_email, nullif(trim(coalesce(p_phone, '')), ''),
          p_package_id, trim(coalesce(p_message, '')))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.submit_support_enquiry(public.supporter_kind, text, text, text, text, uuid, text) from public;
grant execute on function public.submit_support_enquiry(public.supporter_kind, text, text, text, text, uuid, text) to anon, authenticated;
