-- Check the full quoted nightly version vector, not only its total.
-- Null is intentional for historic snapshots whose original version was not captured.
alter table resort.booking_nights add column rate_version integer;
drop function resort.create_hold(text,date,date,integer,integer,text,uuid,integer);
create function resort.create_hold(p_room text, p_in date, p_out date, p_adults integer, p_children integer,
  p_name text, p_key uuid, p_expected_total integer, p_expected_versions integer[]) returns uuid
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
     or p_expected_total is null or p_expected_versions is null or cardinality(p_expected_versions) <> p_out-p_in then
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
       or v_previous.total_paise<>p_expected_total
       or (select array_agg(rate_version order by night) from resort.booking_nights where booking_id=v_previous.id) is distinct from p_expected_versions then
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
  if (select array_agg(version order by night) from resort.inventory where room_type=p_room and night>=p_in and night<p_out) is distinct from p_expected_versions then
    raise exception 'The price changed. Review the latest nightly breakdown before booking.' using errcode='P0001';
  end if;
  if v_total<>p_expected_total then raise exception 'The price changed. Review the latest quote before booking.' using errcode='P0001'; end if;
  insert into resort.bookings(guest_id,room_type,check_in,check_out,adults,children,guest_name,idempotency_key,total_paise,expires_at)
    values(v_actor,p_room,p_in,p_out,p_adults,p_children,trim(p_name),p_key,v_total,v_now+interval '10 minutes') returning id into v_id;
  insert into resort.booking_nights(booking_id,night,base_paise,gst_bps,tax_paise,rate_version)
    select v_id,night,rate_paise,resort.gst_bps(rate_paise),resort.tax_paise(rate_paise),version
    from resort.inventory where room_type=p_room and night>=p_in and night<p_out;
  return v_id;
end $$;

revoke all on function resort.create_hold(text,date,date,integer,integer,text,uuid,integer,integer[]) from public;
grant execute on function resort.create_hold(text,date,date,integer,integer,text,uuid,integer,integer[]) to resort_app;
