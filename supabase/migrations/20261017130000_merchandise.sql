-- Alumni merchandise (product owner, 17 Oct 2026): a catalogue and order requests. Anyone may order.
-- The secretariat confirms each order; the buyer pays through the official Paybill and the order is
-- marked paid. The platform records orders; it never holds money. The full shop (cart, checkout,
-- stock) remains Phase 4.

create type public.merch_order_status as enum ('new', 'confirmed', 'paid', 'ready', 'collected', 'cancelled');

-- Administrators, the Secretary and the Treasurer run the merchandise orders.
create or replace function public.can_manage_shop()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.has_role('secretary') or public.has_role('treasurer'); $$;
grant execute on function public.can_manage_shop() to anon, authenticated;  -- used in the public read rule; false for visitors

create table public.merch_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  description text not null default '' check (length(description) <= 600),
  price_kes numeric(10, 0) not null check (price_kes > 0),
  options text[] not null default '{}' check (cardinality(options) <= 20),  -- sizes or colours; empty = one option
  option_label text not null default 'Size' check (length(option_label) between 1 and 20),
  photo_path text,                                                          -- in the public site-media bucket
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index merch_items_order_idx on public.merch_items (status, sort_order);

create table public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,                 -- e.g. MER-7K2QXP, used as the Paybill account
  person_id uuid references public.persons (id),  -- when a signed-in member orders
  buyer_name text not null,
  phone text not null,
  email text,
  collection text not null,                       -- where they would like to collect it
  buyer_notes text not null default '',
  total_kes numeric(12, 0) not null check (total_kes > 0),  -- at the prices when ordered
  status public.merch_order_status not null default 'new',
  staff_notes text not null default '',
  handled_by uuid references public.persons (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index merch_orders_status_idx on public.merch_orders (status, created_at desc);
create index merch_orders_person_idx on public.merch_orders (person_id);
create index merch_orders_handled_by_idx on public.merch_orders (handled_by);

-- Lines are written once, with the item's name and price at the time.
create table public.merch_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.merch_orders (id),
  item_id uuid not null references public.merch_items (id),
  item_name text not null,
  option text,
  quantity int not null check (quantity between 1 and 50),
  unit_price_kes numeric(10, 0) not null check (unit_price_kes > 0),
  created_at timestamptz not null default now()
);
create index merch_order_items_order_idx on public.merch_order_items (order_id);
create index merch_order_items_item_idx on public.merch_order_items (item_id);

create trigger merch_items_updated_at before update on public.merch_items for each row execute function public.set_updated_at();
create trigger merch_orders_updated_at before update on public.merch_orders for each row execute function public.set_updated_at();
create trigger merch_items_audit after insert or update or delete on public.merch_items for each row execute function public.audit_row();
create trigger merch_orders_audit after insert or update or delete on public.merch_orders for each row execute function public.audit_row();
create trigger merch_order_items_audit after insert or update or delete on public.merch_order_items for each row execute function public.audit_row();

alter table public.merch_items enable row level security;
alter table public.merch_orders enable row level security;
alter table public.merch_order_items enable row level security;

create policy "merch items readable" on public.merch_items for select to anon, authenticated
  using (status = 'published' or public.can_manage_shop());
create policy "merch items insert" on public.merch_items for insert to authenticated with check (public.can_manage_shop());
create policy "merch items update" on public.merch_items for update to authenticated
  using (public.can_manage_shop()) with check (public.can_manage_shop());

-- Orders arrive only through submit_merch_order(). Staff read them and move them along;
-- the buyer's details and the lines themselves are never changed afterwards.
create policy "merch orders staff read" on public.merch_orders for select to authenticated using (public.can_manage_shop());
create policy "merch orders staff update" on public.merch_orders for update to authenticated
  using (public.can_manage_shop()) with check (public.can_manage_shop());
create policy "merch order items staff read" on public.merch_order_items for select to authenticated using (public.can_manage_shop());

create or replace function public.merch_orders_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (new.reference, new.person_id, new.buyer_name, new.phone, new.email, new.collection, new.buyer_notes, new.total_kes, new.created_at)
     is distinct from
     (old.reference, old.person_id, old.buyer_name, old.phone, old.email, old.collection, old.buyer_notes, old.total_kes, old.created_at) then
    raise exception 'Only the status and staff notes of an order can change';
  end if;
  return new;
end;
$$;
create trigger merch_orders_guard before update on public.merch_orders for each row execute function public.merch_orders_guard();

-- The public order form. p_items: [{"item_id": "...", "option": "M", "quantity": 2}, ...]
create or replace function public.submit_merch_order(
  p_name text, p_phone text, p_email text, p_collection text, p_notes text, p_items jsonb)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_ref text;
  v_order uuid;
  v_total numeric := 0;
  v_line jsonb;
  v_item public.merch_items;
  v_qty int;
  v_option text;
begin
  if length(trim(coalesce(p_name, ''))) not between 2 and 120 then raise exception 'name required'; end if;
  if length(v_phone) not between 9 and 16 then raise exception 'valid phone required'; end if;
  if v_email is not null and (v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254) then raise exception 'valid email required'; end if;
  if length(trim(coalesce(p_collection, ''))) not between 2 and 200 then raise exception 'collection point required'; end if;
  if length(coalesce(p_notes, '')) > 1000 then raise exception 'too long'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'choose at least one item'; end if;
  if (select count(*) from public.merch_orders where phone = v_phone and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too many orders';
  end if;

  -- Check every line and work out the total first, at today's prices.
  for v_line in select * from jsonb_array_elements(p_items) loop
    select * into v_item from public.merch_items where id = (v_line ->> 'item_id')::uuid and status = 'published';
    if not found then raise exception 'item not available'; end if;
    v_qty := coalesce((v_line ->> 'quantity')::int, 0);
    if v_qty not between 1 and 50 then raise exception 'quantity must be 1 to 50'; end if;
    v_option := nullif(trim(coalesce(v_line ->> 'option', '')), '');
    if cardinality(v_item.options) > 0 and (v_option is null or not v_option = any (v_item.options)) then
      raise exception 'choose a % for %', lower(v_item.option_label), v_item.name;
    end if;
    v_total := v_total + v_qty * v_item.price_kes;
  end loop;

  loop
    v_ref := 'MER-' || upper(substr(translate(md5(random()::text || clock_timestamp()::text), '01lo', ''), 1, 6));
    exit when not exists (select 1 from public.merch_orders where reference = v_ref);
  end loop;

  insert into public.merch_orders (reference, person_id, buyer_name, phone, email, collection, buyer_notes, total_kes)
  values (v_ref, public.current_person_id(), trim(p_name), v_phone, v_email, trim(p_collection), trim(coalesce(p_notes, '')), v_total)
  returning id into v_order;

  for v_line in select * from jsonb_array_elements(p_items) loop
    select * into v_item from public.merch_items where id = (v_line ->> 'item_id')::uuid;
    v_option := case when cardinality(v_item.options) > 0 then trim(v_line ->> 'option') end;
    insert into public.merch_order_items (order_id, item_id, item_name, option, quantity, unit_price_kes)
    values (v_order, v_item.id, v_item.name, v_option, (v_line ->> 'quantity')::int, v_item.price_kes);
  end loop;

  return v_ref;
end;
$$;
revoke execute on function public.submit_merch_order(text, text, text, text, text, jsonb) from public;
grant execute on function public.submit_merch_order(text, text, text, text, text, jsonb) to anon, authenticated;
