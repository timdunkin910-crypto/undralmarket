-- undralmarket.mn — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db reset` with this as a migration), then run seed.sql.

create extension if not exists pgcrypto;

-- ───────────────────────── Settings (single row) ─────────────────────────
create table public.settings (
  id               int primary key default 1 check (id = 1),
  building_name    text not null default 'Манай байр',
  district         text not null default 'Улаанбаатар',
  entrances        int  not null default 4  check (entrances between 1 and 20),
  floors           int  not null default 16 check (floors between 1 and 60),
  apts_per_floor   int  not null default 4  check (apts_per_floor between 1 and 30),
  open_time        time not null default '08:00',
  close_time       time not null default '23:00',
  min_order        int  not null default 5000 check (min_order >= 0),
  delivery_enabled boolean not null default true,
  invite_code      text not null default ('UNDRAL-' || upper(substr(md5(random()::text), 1, 6))),
  shop_phone       text not null default '9997-7961',
  bank_name        text not null default 'Хаан банк',
  bank_account     text not null default '5302289287',
  bank_holder      text not null default 'О.Цолмонбаяр',
  updated_at       timestamptz not null default now()
);

-- ───────────────────────── Catalog ─────────────────────────
create table public.categories (
  id    serial primary key,
  slug  text not null unique,
  name  text not null,
  emoji text not null default '🛒',
  sort  int  not null default 0
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  int references public.categories(id) on delete set null,
  name         text not null check (length(name) between 1 and 120),
  unit         text not null default '1ш',
  price        int  not null check (price >= 0),
  old_price    int  check (old_price is null or old_price > price),
  image_url    text,
  is_mongolian boolean not null default false,
  is_deal      boolean not null default false,   -- "Өнөөдрийн хямдрал" (ends at closing time)
  fresh_today  boolean not null default false,   -- "Өнөөдөр шинээр ирсэн", set each morning
  sold_out     boolean not null default false,
  active       boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);
create index products_category_idx on public.products(category_id) where active;

-- ───────────────────────── Residents ─────────────────────────
create table public.apartments (
  id          uuid primary key default gen_random_uuid(),
  entrance    int not null check (entrance > 0),
  floor       int not null check (floor > 0),
  number      int not null check (number > 0),         -- тоот
  tab_enabled boolean not null default false,           -- Дэвтэр allowed
  tab_limit   int not null default 200000,
  created_at  timestamptz not null default now(),
  unique (number)
);

create type public.resident_status as enum ('pending', 'approved', 'blocked');
create type public.user_role as enum ('resident', 'staff', 'owner');

create table public.residents (
  id           uuid primary key references auth.users(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete set null,
  name         text not null check (length(name) between 1 and 60),
  phone        text not null unique check (phone ~ '^[0-9]{8}$'),
  status       public.resident_status not null default 'pending',
  role         public.user_role not null default 'resident',
  notify_push  boolean not null default true,
  created_at   timestamptz not null default now()
);
create index residents_apartment_idx on public.residents(apartment_id);

-- ───────────────────────── Orders ─────────────────────────
create type public.order_status as enum ('received', 'preparing', 'delivering', 'delivered', 'cancelled');
create type public.fulfilment as enum ('delivery', 'pickup');
create type public.payment_method as enum ('qpay', 'socialpay', 'transfer', 'cash_card', 'tab');

create table public.orders (
  id             bigint generated always as identity primary key,
  apartment_id   uuid not null references public.apartments(id),
  resident_id    uuid references public.residents(id) on delete set null,
  status         public.order_status not null default 'received',
  fulfilment     public.fulfilment not null default 'delivery',
  scheduled_for  timestamptz,                       -- null = "Яг одоо"
  payment        public.payment_method not null,
  paid           boolean not null default false,
  payment_ref    text,                              -- QPay invoice id
  note          text check (length(note) <= 300),
  bottle_return  int not null default 0 check (bottle_return between 0 and 10),
  total          int not null check (total >= 0),
  staff_name     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index orders_apartment_idx on public.orders(apartment_id, created_at desc);
create index orders_open_idx on public.orders(status, created_at) where status not in ('delivered', 'cancelled');

create table public.order_items (
  id         bigint generated always as identity primary key,
  order_id   bigint not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,
  unit       text not null,
  price      int not null,
  qty        int not null check (qty between 1 and 99)
);
create index order_items_order_idx on public.order_items(order_id);

-- Дэвтэр: positive amount = purchase on tab, negative = payment received
create table public.tab_entries (
  id           bigint generated always as identity primary key,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  order_id     bigint references public.orders(id) on delete set null,
  amount       int not null check (amount <> 0),
  note         text,
  created_by   uuid references public.residents(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index tab_entries_apartment_idx on public.tab_entries(apartment_id);

create table public.push_subscriptions (
  endpoint    text primary key,
  resident_id uuid not null references public.residents(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── Helpers ─────────────────────────
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from residents where id = auth.uid() and role in ('staff', 'owner') and status = 'approved');
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from residents where id = auth.uid() and role = 'owner' and status = 'approved');
$$;

create or replace function public.my_apartment() returns uuid
language sql stable security definer set search_path = public as $$
  select apartment_id from residents where id = auth.uid() and status = 'approved';
$$;

create or replace view public.apartment_balances with (security_invoker = true) as
  select a.id as apartment_id, coalesce(sum(t.amount), 0)::int as balance
  from apartments a left join tab_entries t on t.apartment_id = a.id
  group by a.id;

-- Shop open right now? (Ulaanbaatar time)
create or replace function public.shop_is_open() returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when s.open_time < s.close_time then (now() at time zone 'Asia/Ulaanbaatar')::time between s.open_time and s.close_time
    else (now() at time zone 'Asia/Ulaanbaatar')::time >= s.open_time or (now() at time zone 'Asia/Ulaanbaatar')::time <= s.close_time
  end
  from settings s where s.id = 1;
$$;

-- Hide the invite code from everyone except the owner
create or replace view public.public_settings as
  select building_name, district, entrances, floors, apts_per_floor, open_time, close_time,
         min_order, delivery_enabled, shop_phone, bank_name, bank_account, bank_holder
  from settings where id = 1;

-- Staff (not only the owner) may pause delivery when they are busy
create or replace function public.set_delivery_enabled(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  update settings set delivery_enabled = p_on where id = 1;
end $$;

-- ───────────────────────── Sign-up (invite code) ─────────────────────────
create or replace function public.check_invite_code(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select upper(trim(p_code)) = upper(invite_code) from settings where id = 1;
$$;

create or replace function public.regenerate_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare code text := 'UNDRAL-' || upper(substr(md5(random()::text), 1, 6));
begin
  if not is_owner() then raise exception 'FORBIDDEN'; end if;
  update settings set invite_code = code where id = 1;
  return code;
end $$;

create or replace function public.register_resident(
  p_name text, p_phone text, p_entrance int, p_floor int, p_number int, p_code text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  apt uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into s from settings where id = 1;
  if upper(trim(p_code)) <> upper(s.invite_code) then raise exception 'BAD_INVITE_CODE'; end if;
  if p_entrance not between 1 and s.entrances or p_floor not between 1 and s.floors then
    raise exception 'BAD_ADDRESS';
  end if;

  insert into apartments (entrance, floor, number) values (p_entrance, p_floor, p_number)
  on conflict (number) do nothing;
  select id into apt from apartments where number = p_number;
  -- Same тоот registered with a different entrance/floor → let the owner sort it out
  if not exists (select 1 from apartments where id = apt and entrance = p_entrance and floor = p_floor) then
    raise exception 'ADDRESS_MISMATCH';
  end if;

  insert into residents (id, apartment_id, name, phone)
  values (auth.uid(), apt, trim(p_name), p_phone)
  on conflict (id) do update set name = excluded.name, apartment_id = excluded.apartment_id
    where residents.status = 'pending';
end $$;

-- ───────────────────────── Place order (prices from DB only) ─────────────────────────
-- p_items: [{"product_id": "...", "qty": 2}, ...]
create or replace function public.place_order(
  p_items jsonb, p_fulfilment public.fulfilment, p_scheduled_for timestamptz,
  p_payment public.payment_method, p_note text, p_bottle_return int default 0
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  r residents;
  apt apartments;
  v_total int := 0;
  v_order bigint;
  item record;
  v_balance int;
begin
  select * into r from residents where id = auth.uid();
  if r is null or r.status <> 'approved' then raise exception 'NOT_APPROVED'; end if;
  select * into apt from apartments where id = r.apartment_id;
  select * into s from settings where id = 1;

  if not shop_is_open() then raise exception 'SHOP_CLOSED'; end if;
  if p_fulfilment = 'delivery' and not s.delivery_enabled then raise exception 'DELIVERY_OFF'; end if;
  if p_scheduled_for is not null and (
       p_scheduled_for < now() - interval '5 minutes'
       or (p_scheduled_for at time zone 'Asia/Ulaanbaatar')::date <> (now() at time zone 'Asia/Ulaanbaatar')::date
       or (p_scheduled_for at time zone 'Asia/Ulaanbaatar')::time > s.close_time) then
    raise exception 'BAD_TIME';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;

  for item in
    select p.id, p.name, p.unit, p.price, p.sold_out, p.active, x.qty
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
    left join products p on p.id = x.product_id
  loop
    if item.id is null or not item.active then raise exception 'PRODUCT_GONE'; end if;
    if item.sold_out then raise exception 'SOLD_OUT:%', item.name; end if;
    if item.qty is null or item.qty not between 1 and 99 then raise exception 'BAD_QTY'; end if;
    v_total := v_total + item.price * item.qty;
  end loop;

  if v_total < s.min_order then raise exception 'BELOW_MINIMUM'; end if;

  if p_payment = 'tab' then
    if not apt.tab_enabled then raise exception 'TAB_DISABLED'; end if;
    select balance into v_balance from apartment_balances where apartment_id = apt.id;
    if v_balance + v_total > apt.tab_limit then raise exception 'TAB_LIMIT'; end if;
  end if;

  insert into orders (apartment_id, resident_id, fulfilment, scheduled_for, payment, note, bottle_return, total, paid)
  values (apt.id, r.id, p_fulfilment, p_scheduled_for, p_payment, nullif(trim(p_note), ''),
          greatest(0, least(coalesce(p_bottle_return, 0), 10)), v_total, p_payment = 'tab')
  returning id into v_order;

  insert into order_items (order_id, product_id, name, unit, price, qty)
  select v_order, p.id, p.name, p.unit, p.price, x.qty
  from jsonb_to_recordset(p_items) as x(product_id uuid, qty int)
  join products p on p.id = x.product_id;

  if p_payment = 'tab' then
    insert into tab_entries (apartment_id, order_id, amount, note, created_by)
    values (apt.id, v_order, v_total, 'Захиалга #' || v_order, r.id);
  end if;

  return v_order;
end $$;

-- Resident may cancel only while the shop hasn't started preparing
create or replace function public.cancel_order(p_order bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'cancelled', updated_at = now()
  where id = p_order and apartment_id = my_apartment() and status = 'received';
  if not found then raise exception 'CANNOT_CANCEL'; end if;
  delete from tab_entries where order_id = p_order;
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- Staff cancelling an order also removes its Дэвтэр charge
create or replace function public.on_order_cancelled() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    delete from tab_entries where order_id = new.id;
  end if;
  return new;
end $$;
create trigger orders_cancelled after update of status on public.orders for each row execute function public.on_order_cancelled();

-- Owner/staff-only daily summary (Ulaanbaatar day)
create or replace function public.daily_summary(p_day date default (now() at time zone 'Asia/Ulaanbaatar')::date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  with day_orders as (
    select * from orders
    where (created_at at time zone 'Asia/Ulaanbaatar')::date = p_day and status <> 'cancelled'
  )
  select jsonb_build_object(
    'orders',  (select count(*) from day_orders),
    'revenue', (select coalesce(sum(total), 0) from day_orders),
    'by_payment', (select coalesce(jsonb_object_agg(payment, s), '{}') from (select payment, sum(total) s from day_orders group by payment) x),
    'top_items', (select coalesce(jsonb_agg(t), '[]') from (
        select oi.name, sum(oi.qty)::int qty, sum(oi.qty * oi.price)::int amount
        from order_items oi join day_orders d on d.id = oi.order_id
        group by oi.name order by qty desc limit 10) t),
    'unpaid_tab', (select coalesce(sum(balance), 0) from apartment_balances where balance > 0)
  ) into result;
  return result;
end $$;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.settings           enable row level security;
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.apartments         enable row level security;
alter table public.residents          enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.tab_entries        enable row level security;
alter table public.push_subscriptions enable row level security;

-- settings: only staff read the raw row (it contains the invite code); everyone reads public_settings
create policy settings_staff_read on public.settings for select using (is_staff());
create policy settings_owner_write on public.settings for update using (is_owner()) with check (is_owner());
grant select on public.public_settings to anon, authenticated;

-- catalog: public read, staff write
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (is_staff()) with check (is_staff());
create policy products_read on public.products for select using (active or is_staff());
create policy products_write on public.products for all using (is_staff()) with check (is_staff());

-- apartments: own apartment or staff
create policy apartments_read on public.apartments for select using (id = my_apartment() or is_staff());
create policy apartments_write on public.apartments for update using (is_owner()) with check (is_owner());

-- residents: self, family members of the same apartment, or staff
create policy residents_read on public.residents for select
  using (id = auth.uid() or (apartment_id is not null and apartment_id = my_apartment()) or is_staff());
create policy residents_staff_update on public.residents for update using (is_staff()) with check (is_staff());

-- Staff may approve/block residents, but only the owner can change roles or touch another owner
create or replace function public.residents_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- service role / SQL editor
  if (new.role is distinct from old.role or old.role = 'owner') and not is_owner() then
    raise exception 'FORBIDDEN';
  end if;
  if new.id is distinct from old.id or new.phone is distinct from old.phone then
    raise exception 'FORBIDDEN';
  end if;
  return new;
end $$;
create trigger residents_guard before update on public.residents for each row execute function public.residents_guard();

-- Residents may only change their own notification flag; everything else is owner-controlled
create or replace function public.set_notify_push(p_on boolean) returns void
language sql security definer set search_path = public as $$
  update residents set notify_push = p_on where id = auth.uid();
$$;

-- orders: own apartment or staff. Inserts only through place_order().
create policy orders_read on public.orders for select using (apartment_id = my_apartment() or is_staff());
create policy orders_staff_update on public.orders for update using (is_staff()) with check (is_staff());
create policy order_items_read on public.order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.apartment_id = my_apartment() or is_staff())));

-- Дэвтэр
create policy tab_read on public.tab_entries for select using (apartment_id = my_apartment() or is_staff());
create policy tab_staff_insert on public.tab_entries for insert with check (is_staff());

-- push subscriptions: own only
create policy push_own on public.push_subscriptions for all
  using (resident_id = auth.uid()) with check (resident_id = auth.uid());

grant select on public.apartment_balances to authenticated;
revoke execute on function public.daily_summary(date) from anon;
revoke execute on function public.place_order(jsonb, public.fulfilment, timestamptz, public.payment_method, text, int) from anon;
revoke execute on function public.register_resident(text, text, int, int, int, text) from anon;
revoke execute on function public.cancel_order(bigint) from anon;

-- ───────────────────────── Realtime ─────────────────────────
alter publication supabase_realtime add table public.orders;
alter table public.orders replica identity full;

-- ───────────────────────── Storage (product photos) ─────────────────────────
insert into storage.buckets (id, name, public) values ('products', 'products', true)
on conflict (id) do nothing;
create policy "product photos public read" on storage.objects for select using (bucket_id = 'products');
create policy "product photos staff write" on storage.objects for insert with check (bucket_id = 'products' and public.is_staff());
create policy "product photos staff update" on storage.objects for update using (bucket_id = 'products' and public.is_staff());
create policy "product photos staff delete" on storage.objects for delete using (bucket_id = 'products' and public.is_staff());
