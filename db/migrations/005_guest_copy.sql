-- Future snapshots use guest-facing labels. Existing booking records stay intact.
alter table resort.bookings alter column rate_plan set default 'Room only';
alter table resort.bookings alter column policy_snapshot set default 'No money is charged. No cancellation/refund integration.';
