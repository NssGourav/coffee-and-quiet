-- All finer room types, rates, capacities and allotments are synthetic assumptions.
insert into resort.room_types(id,name,description,capacity,physical_keys,image_path) values
 ('estate-room','Estate Room','A quiet room with space to slow down, looking out towards the green of the estate.',3,40,'/images/estate-room.webp'),
 ('terrace-room','Terrace Room','An airy room and a private terrace for unhurried mornings in the hills.',3,24,'/images/terrace-room.webp'),
 ('garden-villa','Garden Villa','More room to settle in, with a separate living area and a garden-facing sit-out.',4,12,'/images/garden-villa.webp')
on conflict(id) do nothing;
insert into resort.inventory(room_type,night,allotment,rate_paise)
select r.id, d::date,
 case r.id when 'estate-room' then 8 when 'terrace-room' then 5 else 3 end,
 (case r.id when 'estate-room' then 700000 when 'terrace-room' then 950000 else 1450000 end)
 + case when extract(isodow from d) in (5,6) then 100000 else 0 end
from resort.room_types r cross join generate_series(
 (clock_timestamp() at time zone 'Asia/Kolkata')::date,
 (clock_timestamp() at time zone 'Asia/Kolkata')::date+120, interval '1 day') d
on conflict(room_type,night) do nothing;
