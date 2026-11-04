-- The backend is the identity trust boundary. This schema is not exposed via PostgREST.
-- resort_app can read under RLS and call checked functions; it cannot mutate tables.
create schema if not exists resort;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'resort_app') then
    create role resort_app nologin nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;
revoke all on schema resort from public;
grant usage on schema resort to resort_app;

create table resort.profiles (
  id uuid primary key,
  display_name text not null check (length(display_name) between 1 and 80),
  role text not null default 'guest' check (role in ('guest','staff')),
  is_gm boolean not null default false,
  check (not is_gm or role = 'staff')
);
create table resort.room_types (
  id text primary key,
  name text not null,
  description text not null,
  capacity integer not null check (capacity between 1 and 10),
  physical_keys integer not null check (physical_keys > 0),
  image_path text not null
);
create table resort.inventory (
  room_type text not null references resort.room_types(id),
  night date not null,
  allotment integer not null check (allotment >= 0),
  rate_paise integer not null check (rate_paise between 100 and 10000000),
  version integer not null default 1,
  primary key (room_type, night)
);
create table resort.bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references resort.profiles(id),
  room_type text not null references resort.room_types(id),
  check_in date not null,
  check_out date not null,
  adults integer not null check (adults between 1 and 10),
  children integer not null check (children between 0 and 9),
  guest_name text not null check (length(guest_name) between 1 and 80),
  status text not null default 'held' check (status in ('held','confirmed','expired','failed')),
  idempotency_key uuid not null,
  expires_at timestamptz not null default (clock_timestamp() + interval '10 minutes'),
  created_at timestamptz not null default clock_timestamp(),
  confirmed_at timestamptz,
  rate_plan text not null default 'Room only · flexible demo rate',
  policy_snapshot text not null default 'Synthetic assessment booking. No money is charged. No cancellation/refund integration.',
  total_paise integer not null check (total_paise >= 0),
  unique (guest_id, idempotency_key),
  check (check_out > check_in and check_out - check_in <= 14)
);
create table resort.booking_nights (
  booking_id uuid not null references resort.bookings(id),
  night date not null,
  base_paise integer not null,
  gst_bps integer not null check (gst_bps in (500,1800)),
  tax_paise integer not null,
  tax_rule text not null default 'IN-HOTEL-2025-09-22',
  primary key (booking_id, night)
);
create index booking_commitments on resort.bookings(room_type, check_in, check_out, status);
create table resort.payment_events (
  event_id uuid primary key,
  booking_id uuid not null references resort.bookings(id),
  outcome text not null check (outcome in ('success','failure')),
  result_status text not null,
  created_at timestamptz not null default clock_timestamp()
);
create table resort.inventory_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references resort.profiles(id),
  room_type text not null,
  night date not null,
  old_allotment integer not null,
  new_allotment integer not null,
  old_rate_paise integer not null,
  new_rate_paise integer not null,
  changed_at timestamptz not null default clock_timestamp()
);

create function resort.actor_id() returns uuid language sql stable
set search_path = pg_catalog, resort
as $$ select nullif(current_setting('app.user_id', true),'')::uuid $$;
create function resort.is_staff() returns boolean language sql stable security definer
set search_path = pg_catalog, resort
as $$ select exists(select 1 from resort.profiles where id=resort.actor_id() and role='staff') $$;

alter table resort.profiles enable row level security;
alter table resort.bookings enable row level security;
alter table resort.booking_nights enable row level security;
alter table resort.payment_events enable row level security;
alter table resort.inventory_audit enable row level security;
create policy profile_read on resort.profiles for select to resort_app using(id=resort.actor_id() or resort.is_staff());
create policy booking_read on resort.bookings for select to resort_app using(guest_id=resort.actor_id() or resort.is_staff());
create policy nights_read on resort.booking_nights for select to resort_app using(exists(select 1 from resort.bookings b where b.id=booking_id));
create policy event_read on resort.payment_events for select to resort_app using(exists(select 1 from resort.bookings b where b.id=booking_id));
create policy audit_read on resort.inventory_audit for select to resort_app using(resort.is_staff());
grant select on all tables in schema resort to resort_app;

create function resort.ensure_guest(p_name text) returns void language plpgsql security definer
set search_path = pg_catalog, resort as $$
begin
  if resort.actor_id() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  insert into resort.profiles(id,display_name) values(resort.actor_id(),left(trim(p_name),80)) on conflict(id) do nothing;
end $$;

-- Rates are integer paise. This first slice sells only accommodation, one unit.
create function resort.gst_bps(p_rate integer) returns integer language sql immutable
set search_path = pg_catalog, resort
as $$ select case when p_rate <= 750000 then 500 else 1800 end $$;
create function resort.tax_paise(p_rate integer) returns integer language sql immutable
set search_path = pg_catalog, resort
as $$ select round(p_rate::numeric * resort.gst_bps(p_rate) / 10000)::integer $$;

-- One captured instant per availability query. Expired holds do not need cleanup.
create function resort.availability(p_in date, p_out date)
returns table(room_type text, night date, available integer, rate_paise integer, gst_bps integer, tax_paise integer, version integer)
language plpgsql security definer set search_path = pg_catalog, resort as $$
declare v_now timestamptz := clock_timestamp();
begin
  if p_in is null or p_out is null or p_out <= p_in or p_out-p_in > 14 then
    raise exception 'Choose a stay of 1–14 nights' using errcode='22023';
  end if;
  return query select i.room_type,i.night,
    greatest(0,i.allotment - (select count(*)::integer from resort.bookings b
      where b.room_type=i.room_type and i.night>=b.check_in and i.night<b.check_out
      and (b.status='confirmed' or (b.status='held' and b.expires_at>v_now)))),
    i.rate_paise,resort.gst_bps(i.rate_paise),resort.tax_paise(i.rate_paise),i.version
  from resort.inventory i where i.night>=p_in and i.night<p_out order by i.room_type,i.night;
end $$;

create function resort.create_hold(p_room text, p_in date, p_out date, p_adults integer, p_children integer,
  p_name text, p_key uuid, p_expected_total integer) returns uuid
language plpgsql security definer set search_path = pg_catalog, resort as $$
declare
  v_actor uuid := resort.actor_id(); v_previous resort.bookings%rowtype;
  v_id uuid; v_count integer; v_capacity integer; v_total integer; v_now timestamptz;
begin
  if v_actor is null or not exists(select 1 from resort.profiles where id=v_actor) then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  if p_in is null or p_out is null or p_out<=p_in or p_out-p_in>14
     or p_in<(clock_timestamp() at time zone 'Asia/Kolkata')::date
     or p_in>(clock_timestamp() at time zone 'Asia/Kolkata')::date+365
     or p_key is null or p_name is null or length(trim(p_name)) not between 1 and 80
     or p_adults is null or p_adults<1 or p_children is null or p_children<0
     or p_expected_total is null then
    raise exception 'Check dates and guest details' using errcode='22023';
  end if;
  select capacity into v_capacity from resort.room_types where id=p_room;
  if v_capacity is null or p_adults+p_children>v_capacity then
    raise exception 'Guest count exceeds room capacity' using errcode='22023';
  end if;
  -- Same actor/key retries serialize even when the first request has not inserted yet.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || p_key::text,0));
  select * into v_previous from resort.bookings where guest_id=v_actor and idempotency_key=p_key;
  if found then
    if v_previous.room_type<>p_room or v_previous.check_in<>p_in or v_previous.check_out<>p_out
       or v_previous.adults<>p_adults or v_previous.children<>p_children or v_previous.guest_name<>trim(p_name)
       or v_previous.total_paise<>p_expected_total then
      raise exception 'Request key was already used for different details' using errcode='22023';
    end if;
    return v_previous.id;
  end if;
  -- Lock every occupied night in a stable order. Every stock-changing writer uses this order.
  perform 1 from resort.inventory where room_type=p_room and night>=p_in and night<p_out order by night for update;
  get diagnostics v_count = row_count;
  if v_count <> p_out-p_in then raise exception 'Rates are not open for all dates' using errcode='P0001'; end if;
  v_now := clock_timestamp();
  if exists(select 1 from resort.inventory i where i.room_type=p_room and i.night>=p_in and i.night<p_out
    and i.allotment <= (select count(*) from resort.bookings b where b.room_type=p_room
      and i.night>=b.check_in and i.night<b.check_out
      and (b.status='confirmed' or (b.status='held' and b.expires_at>v_now)))) then
    raise exception 'This stay just sold out. Choose another date or room.' using errcode='P0001';
  end if;
  select sum(rate_paise+resort.tax_paise(rate_paise))::integer into v_total
    from resort.inventory where room_type=p_room and night>=p_in and night<p_out;
  if v_total<>p_expected_total then raise exception 'The price changed. Review the latest quote before booking.' using errcode='P0001'; end if;
  insert into resort.bookings(guest_id,room_type,check_in,check_out,adults,children,guest_name,idempotency_key,total_paise,expires_at)
    values(v_actor,p_room,p_in,p_out,p_adults,p_children,trim(p_name),p_key,v_total,v_now+interval '10 minutes') returning id into v_id;
  insert into resort.booking_nights(booking_id,night,base_paise,gst_bps,tax_paise)
    select v_id,night,rate_paise,resort.gst_bps(rate_paise),resort.tax_paise(rate_paise)
    from resort.inventory where room_type=p_room and night>=p_in and night<p_out;
  return v_id;
end $$;

-- Explicit simulation only; NOT a payment-provider webhook or a real-money integration.
create function resort.simulate_payment(p_booking uuid, p_event uuid, p_outcome text) returns text
language plpgsql security definer set search_path = pg_catalog, resort as $$
declare v_b resort.bookings%rowtype; v_event resort.payment_events%rowtype; v_status text;
begin
  if resort.actor_id() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_event is null or p_outcome is null or p_outcome not in ('success','failure') then
    raise exception 'Invalid simulation event' using errcode='22023';
  end if;
  -- Serializes an event key even if accidentally reused across bookings.
  perform pg_advisory_xact_lock(hashtextextended('payment:'||p_event::text,0));
  select * into v_b from resort.bookings where id=p_booking for update;
  if not found or v_b.guest_id<>resort.actor_id() then
    raise exception 'Booking not found' using errcode='42501';
  end if;
  select * into v_event from resort.payment_events where event_id=p_event;
  if found then
    if v_event.booking_id<>p_booking or v_event.outcome<>p_outcome then
      raise exception 'Payment event key conflict' using errcode='22023';
    end if;
    return v_event.result_status;
  end if;
  perform 1 from resort.inventory where room_type=v_b.room_type and night>=v_b.check_in and night<v_b.check_out order by night for update;
  v_status := v_b.status;
  if v_status='held' then
    -- Use the clock AFTER waiting for locks. A late success can never reacquire stock.
    if v_b.expires_at<=clock_timestamp() then v_status:='expired';
    elsif p_outcome='failure' then v_status:='failed';
    else v_status:='confirmed'; end if;
    update resort.bookings set status=v_status, confirmed_at=case when v_status='confirmed' then clock_timestamp() else null end where id=p_booking;
  end if;
  insert into resort.payment_events(event_id,booking_id,outcome,result_status) values(p_event,p_booking,p_outcome,v_status);
  return v_status;
end $$;

create function resort.update_inventory(p_room text, p_night date, p_allotment integer, p_rate integer, p_version integer) returns void
language plpgsql security definer set search_path = pg_catalog, resort as $$
declare v_old resort.inventory%rowtype; v_committed integer; v_keys integer;
begin
  if not resort.is_staff() then raise exception 'Staff access required' using errcode='42501'; end if;
  select physical_keys into v_keys from resort.room_types where id=p_room;
  if p_allotment is null or p_allotment<0 or p_allotment>v_keys or p_rate is null or p_rate not between 100 and 10000000 then
    raise exception 'Invalid allotment or rate' using errcode='22023';
  end if;
  select * into v_old from resort.inventory where room_type=p_room and night=p_night for update;
  if not found then raise exception 'Date is not open' using errcode='22023'; end if;
  if p_version is null or v_old.version<>p_version then raise exception 'Another staff member updated this date. Reload before saving.' using errcode='P0001'; end if;
  select count(*)::integer into v_committed from resort.bookings b where b.room_type=p_room and p_night>=b.check_in and p_night<b.check_out
    and (b.status='confirmed' or (b.status='held' and b.expires_at>clock_timestamp()));
  if p_allotment<v_committed then raise exception 'Allotment cannot be lower than confirmed bookings and active holds' using errcode='P0001'; end if;
  update resort.inventory set allotment=p_allotment,rate_paise=p_rate,version=version+1 where room_type=p_room and night=p_night;
  insert into resort.inventory_audit(actor_id,room_type,night,old_allotment,new_allotment,old_rate_paise,new_rate_paise)
    values(resort.actor_id(),p_room,p_night,v_old.allotment,p_allotment,v_old.rate_paise,p_rate);
end $$;

revoke all on all functions in schema resort from public;
grant execute on all functions in schema resort to resort_app;
alter default privileges in schema resort revoke execute on functions from public;
