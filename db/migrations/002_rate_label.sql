-- Do not imply a cancellation/refund policy that this simulation does not implement.
-- Existing accepted policy/rate-plan snapshots are intentionally preserved.
alter table resort.bookings alter column rate_plan set default 'Room only · demo rate';
