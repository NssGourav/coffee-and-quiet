create table resort.enquiries (
 id uuid primary key default gen_random_uuid(), guest_id uuid not null references resort.profiles(id),
 message text not null check(length(message) between 8 and 3000),
 original_message text not null, manual_route boolean not null default false,
 category text not null default 'unsorted' check(category in ('room','wedding','offsite','complaint','unsorted')),
 owner text not null default 'GM · review', gm_alert boolean not null default false,
 extraction jsonb not null default '{}', draft text not null default '',
 status text not null default 'new' check(status in ('new','review','sent','manual')),
 note text not null default '', version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table resort.enquiry_audit (
 id bigint generated always as identity primary key, enquiry_id uuid not null references resort.enquiries(id),
 actor_id uuid not null, action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table resort.enquiries enable row level security;
alter table resort.enquiry_audit enable row level security;
create policy enquiry_read on resort.enquiries for select to resort_app using(guest_id=resort.actor_id() or resort.is_staff());
create policy enquiry_audit_read on resort.enquiry_audit for select to resort_app using(resort.is_staff());
grant select on resort.enquiries,resort.enquiry_audit to resort_app;
create function resort.create_enquiry(p_message text,p_complaint boolean) returns uuid language plpgsql security definer set search_path=pg_catalog,resort as $$
declare eid uuid;
begin
 if resort.actor_id() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(resort.actor_id()::text,21));
 if (select count(*) from resort.enquiries where guest_id=resort.actor_id() and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before creating more enquiries'; end if;
 insert into resort.enquiries(guest_id,message,original_message,gm_alert,category,owner) values(resort.actor_id(),trim(p_message),trim(p_message),p_complaint,case when p_complaint then 'complaint' else 'unsorted' end,case when p_complaint then 'GM' else 'GM · review' end) returning id into eid;
 insert into resort.enquiry_audit(enquiry_id,actor_id,action) values(eid,resort.actor_id(),'created');
 return eid;
end $$;
create function resort.change_enquiry(p_id uuid,p_version integer,p_action text,p_data jsonb) returns void language plpgsql security definer set search_path=pg_catalog,resort as $$
declare e resort.enquiries; cat text; alert boolean;
begin
 if not resort.is_staff() then raise exception 'Staff access required' using errcode='42501'; end if;
 select * into e from resort.enquiries where id=p_id for update;
 if e.id is null then raise exception 'Enquiry not found'; end if;
 if e.version<>p_version then raise exception 'This enquiry changed. Reload before continuing.'; end if;
 if e.status='sent' then raise exception 'This enquiry was already sent. Its record is read-only.'; end if;
 cat:=coalesce(p_data->>'category',e.category);
 alert:=e.gm_alert or cat='complaint' or coalesce((p_data->>'complaint')::boolean,false);
 if alert then cat:='complaint'; end if;
 if p_action='save' then
 update resort.enquiries set manual_route=true,message=p_data->>'message',category=cat,gm_alert=alert,extraction='{}',draft='',status='new',note='Staff corrected the enquiry. Generate a fresh draft.' where id=p_id;
 elsif p_action='ai' then
 update resort.enquiries set category=cat,gm_alert=alert,extraction=p_data->'extraction',draft=p_data->>'draft',status='review',note=p_data->>'note' where id=p_id;
 elsif p_action='failure' then
 update resort.enquiries set category=case when alert then 'complaint' when e.manual_route then e.category else 'unsorted' end,gm_alert=alert,draft='',status='manual',note='AI unavailable or its answer failed validation. Review manually or retry.' where id=p_id;
 elsif p_action='send' then
 if length(trim(coalesce(p_data->>'draft','')))<10 or length(p_data->>'draft')>5000 then raise exception 'Review the reply before sending'; end if;
 update resort.enquiries set draft=p_data->>'draft',status='sent',note='Staff-approved simulated send. No external message was sent.' where id=p_id;
 else raise exception 'Unknown enquiry action'; end if;
 update resort.enquiries set owner=case category when 'room' then 'Reservations' when 'wedding' then 'Event sales' when 'offsite' then 'Event sales' when 'complaint' then 'GM' else 'GM · review' end,version=version+1,updated_at=now() where id=p_id;
 insert into resort.enquiry_audit(enquiry_id,actor_id,action,detail) values(p_id,resort.actor_id(),p_action,jsonb_build_object('previous_version',p_version,'previous_message',e.message,'previous_category',e.category,'draft',case when p_action='send' then p_data->>'draft' else null end));
end $$;

revoke all on function resort.create_enquiry(text,boolean),resort.change_enquiry(uuid,integer,text,jsonb) from public;
grant execute on function resort.create_enquiry(text,boolean),resort.change_enquiry(uuid,integer,text,jsonb) to resort_app;
