# Engineering decisions and explanation

## One application and a real database

Next.js serves pages and HTTP routes. Supabase Auth verifies identity; the server uses `getUser()` for a fresh Auth check and the proxy refreshes sessions using the documented SSR cookie pattern. Permission decisions also occur inside the route and mutation function. The browser never chooses the database actor ID or holds a database password.

The current local environment has a dedicated native PostgreSQL 17 cluster for application data and an isolated `resort_test` database. Local Supabase supplies its real Auth service in Docker. Keeping the native database separate makes real multi-client tests easy to reproduce without resetting Auth. Both are PostgreSQL; no additional application backend is introduced. A future hosted Supabase database is an option, not an actual deployment.

## The invariant

For every room type and occupied night:

`confirmed bookings + held bookings whose expires_at > database time <= website allotment`

Every booking in this version is quantity one. A multi-room extension must replace counts with quantities throughout the functions and tests, not merely add an input field.

`inventory` has a primary key `(room_type, night)`. `create_hold` locks every requested inventory row with `FOR UPDATE`, sorted by date. It checks that all nights exist, then checks commitments and prices in subsequent statements before writing any booking rows. The insert, nightly snapshots and commit occur inside **one PostgreSQL transaction**. Failure on any night rolls back the whole hold.

## Why READ COMMITTED is sufficient here

Without locks, two guests could both read “one room left” and both insert a booking. A transaction alone would not stop that race at READ COMMITTED.

Here, all operations that can change commitments or allotment contend for the same inventory rows. Guest A locks 14 and 15 November. Guest B waits. After A commits, B acquires the locks, and its next count statement sees A's committed hold under READ COMMITTED. B is rejected if any night is full. Nonoverlapping stays can proceed independently.

The count must occur **after** the lock wait, with a fresh statement snapshot. `clock_timestamp()` is captured after acquiring inventory locks; transaction-start `now()` would become stale while waiting. Stable date ordering prevents a 14/15 versus 15/14 lock cycle. An advisory lock serializes duplicate create-hold request keys before a booking exists.

This proof depends on every writer following the protocol. The runtime `resort_app` role has SELECT and function-execution grants, **no direct table mutations**. The database owner is used only by local migration/seed/test scripts. A future privileged script that edits bookings or stock without locks could break the invariant; schema checks alone cannot enforce this cross-row rule.

## Payment and expiry

`simulate_payment` is a clearly labelled test operation. It accepts no card details and does not claim payment-provider authenticity. A real provider would require server-side amount verification, signed callbacks and provider event IDs before reuse of these transitions.

The payment operation serializes its event ID, locks the booking, then locks occupied inventory rows in date order. It checks expiry **after** any lock wait. Only an unexpired `held` booking can become `confirmed`. Failure marks a live hold `failed`; a stale failure cannot change an already confirmed booking. Late success records `expired` and never reacquires released inventory.

Availability excludes expired holds even if their stored status still says `held`; the UI shows their effective status as expired. No cron is required for correctness. A later cleanup task may normalize old status labels without changing availability.

Both `(guest_id, idempotency_key)` and `payment_events.event_id` are unique. Repeated keys return the previous result. Reusing a key with different details is rejected. The client retains a key while retrying a request; the database is the authoritative deduplication layer. Refreshing the details form starts a new attempt; My bookings lets a guest find an accepted request if its response was lost.

## Rate changes and snapshots

Prices are integer paise, computed from authoritative nightly rates. Guests send the total and ordered nightly version vector they saw, and the hold checks both against the locked inventory rows. Checking only the total would miss two nightly changes that cancel each other out. A mismatch asks them to review the latest breakdown. Each accepted booking stores nightly base price, rate version, GST rate, tax amount, rule identifier, rate-plan label and policy text. Later rate edits never rewrite those values. Inventory version changes also conservatively require a refreshed quote when only allotment changed.

Staff changes lock the same inventory row and reject allotment below live commitments or above that room type's physical key count. A version counter rejects stale staff edits; each successful edit records actor, time, old/new rate and old/new allotment. Setting zero allotment closes a night only when commitments permit it.

## Identity and permissions

The private `resort` schema is not exposed through Supabase's public Data API. Next.js uses a restricted SQL connection and sets `app.user_id` transaction-locally from the **verified** Supabase user. The runtime rejects a database connection configured with an owner/superuser/bypass-RLS role. Pool connections reset identity at transaction end.

RLS permits booking and nightly-snapshot reads only to the owning guest or staff. Mutations check identity and role inside security-definer functions with a fixed search path. Functions have no PUBLIC execute grants. RLS depends on this trusted server identity boundary: possession of the backend database password would allow identity impersonation, so it must remain server-only.

HTTP mutations validate an exact configured Origin, bounded JSON bodies and Zod input schemas. Invalid request and database errors return bounded messages. Synthetic passwords and keys stay in ignored files, not Git or logs. Supabase's local ports use a Docker network with loopback-only host binding. The Next.js server and native database also bind to loopback.

## Next core piece: AI enquiries

Not implemented in this milestone. The agreed boundary is: persist original text, treat it as untrusted, call a real model with no booking/payment tools, validate a structured result and source snippets, preserve unknown/ambiguous dates, then route by configured rules. Prices must be inserted by the server from real quotations, never invented by the model.

An explicit complaint flag must survive every model result and immediately alert the GM. Detected or manually flagged complaints also alert the GM. Low confidence, bad schema, refusal and timeout go to an unsorted/manual lane visible to the GM. Staff can correct routing; drafts never send automatically. Free/local access is authorised, but no model is configured and no live-model evaluation has run. This remains a core requirement, not an optional enhancement.

## Documentation checked

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), plus the installed 16.4.5 documentation for route handlers, proxy, cookies, errors and Image.
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) and [local development](https://supabase.com/docs/guides/local-development).
- [Tax-source notes](tax-sources.md).

The originating chat's diagrams are a proposal for the whole core. This milestone narrows the data model to one unit and one rate plan and has not yet created the enquiry entities shown there. No diagram should be described as evidence of a working feature.
