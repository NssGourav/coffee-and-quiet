# Engineering decisions and explanation

## One application and a real database

Next.js serves pages and HTTP routes. Supabase Auth verifies identity; the server uses `getUser()` for a fresh Auth check and the proxy refreshes sessions using the documented SSR cookie pattern. Permission decisions also occur inside the route and mutation function. The browser never chooses the database actor ID or holds a database password.

The current local environment has a dedicated native PostgreSQL 17 cluster for application data and an isolated `resort_test` database. Local Supabase supplies its real Auth service in Docker. Keeping the native database separate makes real multi-client tests easy to reproduce without resetting Auth. Both are PostgreSQL; no additional application backend is introduced. The live review deployment uses a single free Supabase project for Auth and application data, with the same private schema and SQL rules.

## The invariant

For every room type and occupied night:

`confirmed bookings + held bookings whose expires_at > database time <= website allotment`

Every booking in this version is quantity one. A multi-room extension must replace counts with quantities throughout the functions and tests, not merely add an input field.

`inventory` has a primary key `(room_type, night)`. `create_hold` locks every requested inventory row with `FOR UPDATE`, sorted by date. It checks that all nights exist, then checks commitments and prices in subsequent statements before writing any booking rows. The insert, nightly snapshots and commit occur inside **one PostgreSQL transaction**. Failure on any night rolls back the whole hold.

## Why READ COMMITTED is sufficient here

Without locks, two guests could both read “one room left” and both insert a booking. A transaction alone would not stop that race at READ COMMITTED.

Here, all operations that can change commitments or allotment contend for the same inventory rows. Guest A locks 14 and 15 November. Guest B waits. After A commits, B acquires the locks, and its next count statement sees A's committed hold under READ COMMITTED. B is rejected if any night is full. Nonoverlapping stays can proceed independently.

The count must occur **after** the lock wait, with a fresh statement snapshot. `clock_timestamp()` is captured after acquiring inventory locks; transaction-start `now()` would become stale while waiting. Stable date ordering prevents a 14/15 versus 15/14 lock cycle. An advisory lock serializes duplicate create-hold request keys before a booking exists.

This proof depends on every writer following the protocol. The runtime `resort_app` role has SELECT and function-execution grants, **no direct table mutations**. The database owner is used only by migration/seed/test and explicit hosted-provisioning scripts. A future privileged script that edits bookings or stock without locks could break the invariant; schema checks alone cannot enforce this cross-row rule.

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

## AI enquiries: implemented workflow

The original enquiry is saved before AI processing. Staff explicitly trigger processing. The selected model (local Ollama or hosted Gemini) separately classifies the message, extracts exact source phrases and drafts a reply. A strict schema, source matching, uncertainty threshold and suspicious-instruction check protect the boundary. Confidence is not calibrated and source matching does not prove semantic understanding. Invalid results and service failures are clearly marked for manual review.

Classification maps through application rules to team queues. Staff corrections persist across subsequent AI suggestions. Explicit or detected complaints alert the GM and cannot be cleared by a later model response. The GM can see all staff lanes, including unsorted.

Every enquiry has a version. Saving an AI result requires the original version, so concurrent staff edits invalidate late answers. Database tests exercise competing edits and AI writes. Sending is an explicit staff action that stores the approved draft and audit entry; duplicate sends fail and sent records become read-only. Enquiry creation is bounded per authenticated account.

AI has no booking, payment or sending tools. Drafting receives a validated category rather than the raw guest message. For accommodation prices, staff confirm the dates and occupancy in a separate quote form; existing rate calculations produce the nightly tax breakdown. Quotes are timestamped, indicative and do not hold inventory. Event package prices are not invented.

The exact local setup and model selection are documented in ai-local.md. Real-model evaluations are separate from deterministic test stubs. Payments and messages remain simulated. The live app is https://coffee-and-quiet.vercel.app.

## Documentation checked

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), plus the installed 16.4.5 documentation for route handlers, proxy, cookies, errors and Image.
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) and [local development](https://supabase.com/docs/guides/local-development).
- [Tax-source notes](tax-sources.md).

The originating chat's diagrams are proposals, not verification evidence. The implemented app uses one unit per booking, one room-only rate plan, saved enquiries and an enquiry activity log. Consult the dated evidence log for observed results.

## Hosted review deployment — 9 November

Vercel Hobby hosts the application. A free Supabase project holds both Auth and application data; the server connects as `resort_app` through the transaction pooler with certificate-verified TLS and a one-connection pool. Transaction-local identity is compatible with transaction pooling. Public signup is disabled and the private schema is excluded from the Data API. Owner and service-role credentials remain provisioning-only.

`AI_PROVIDER` selects Ollama by default or Gemini explicitly. Hosted calls use a fixed Gemini 3.5 Flash-Lite endpoint and server-side key, with a 25-second limit per call and 90-second route budget. There is no automatic provider fallback. The user confirmed free tier with billing disabled. Real provider errors were observed during evaluation; saved enquiries and manual review remain available. Shared synthetic accounts and free-service availability are assessment limits, not production operating assumptions.
