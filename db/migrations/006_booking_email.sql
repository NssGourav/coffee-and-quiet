-- Durable booking email outbox. Authenticated identity is supplied by the trusted server.
create table resort.booking_emails (
  booking_id uuid primary key references resort.bookings(id) on delete cascade,
  guest_id uuid not null references resort.profiles(id),
  recipient text not null check(length(recipient) between 3 and 254),
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','skipped')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  attempt_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_id text
);
alter table resort.booking_emails enable row level security;
create policy booking_email_read on resort.booking_emails for select to resort_app
using(guest_id=resort.actor_id() or resort.is_staff());
grant select on resort.booking_emails to resort_app;

create function resort.queue_booking_email(p_booking uuid,p_email text,p_skip boolean default false)
returns void language plpgsql security definer set search_path=pg_catalog,resort as $$
declare b resort.bookings%rowtype;
begin
  select * into b from resort.bookings where id=p_booking;
  if not found or b.guest_id is distinct from resort.actor_id() then raise exception 'Booking not found' using errcode='42501'; end if;
  if b.status<>'confirmed' then raise exception 'Only confirmed bookings can be emailed' using errcode='22023'; end if;
  if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email address' using errcode='22023'; end if;
  insert into resort.booking_emails(booking_id,guest_id,recipient,status)
  values(b.id,b.guest_id,p_email,case when p_skip then 'skipped' else 'pending' end)
  on conflict(booking_id) do nothing;
end $$;

create function resort.claim_booking_email(p_booking uuid)
returns setof resort.booking_emails language plpgsql security definer set search_path=pg_catalog,resort as $$
declare job resort.booking_emails%rowtype; attempt_total integer;
begin
  if resort.actor_id() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('booking-email:'||resort.actor_id()::text,0));
  select * into job from resort.booking_emails where booking_id=p_booking for update;
  if not found or job.guest_id<>resort.actor_id() then raise exception 'Booking not found' using errcode='42501'; end if;
  -- Never auto-reclaim an ambiguous send: it may already have reached the provider.
  if job.status not in ('pending','failed') or job.attempts>=3 then return; end if;
  if job.last_attempt_at>clock_timestamp()-interval '60 seconds' then return; end if;
  select coalesce(sum(attempts),0) into attempt_total from resort.booking_emails
    where guest_id=resort.actor_id() and last_attempt_at>clock_timestamp()-interval '1 hour';
  if attempt_total>=10 then return; end if;
  return query update resort.booking_emails set status='sending',attempts=attempts+1,
    attempt_id=gen_random_uuid(),last_attempt_at=clock_timestamp()
    where booking_id=p_booking returning *;
end $$;

create function resort.finish_booking_email(p_booking uuid,p_attempt uuid,p_status text,p_provider text default null)
returns void language plpgsql security definer set search_path=pg_catalog,resort as $$
begin
  if p_status not in ('sent','failed') then raise exception 'Invalid email status' using errcode='22023'; end if;
  update resort.booking_emails set status=p_status,provider_id=left(p_provider,200),
    sent_at=case when p_status='sent' then clock_timestamp() else null end
    where booking_id=p_booking and guest_id=resort.actor_id() and status='sending' and attempt_id=p_attempt;
  if not found then raise exception 'Email attempt is no longer current' using errcode='40001'; end if;
end $$;
revoke all on function resort.queue_booking_email(uuid,text,boolean),resort.claim_booking_email(uuid),resort.finish_booking_email(uuid,uuid,text,text) from public;
grant execute on function resort.queue_booking_email(uuid,text,boolean),resort.claim_booking_email(uuid),resort.finish_booking_email(uuid,uuid,text,text) to resort_app;
