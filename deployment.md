# Local setup — interim document

**Status: local booking milestone only. No production deployment and no public GitHub URL yet. AI enquiry routing is unfinished. This is not the final submission document.**

## Prerequisites

- Node.js 22 (the checked environment uses 22.23.1) and npm.
- PostgreSQL 17 tools `initdb`, `pg_ctl` and `postgres` on PATH.
- Running Docker-compatible container engine. Existing Colima was used on the development Mac.
- Free disk space for dependencies and local Supabase images. Initial package/image downloads need internet access.

## Reproduce

```sh
nvm use
npm ci
npm run setup:local
npm run dev
```

Use `http://127.0.0.1:3000`, not a different hostname unless `APP_ORIGIN` is changed to match. Setup generates `.env.local` and local credentials. Do not commit these files or copy their values into this document.

Setup creates a dedicated native PostgreSQL cluster at `.local/postgres`, listening on loopback port 55439, with `resort_dev` and `resort_test`. It applies SQL migrations with a local owner role, then configures the app to use a separate restricted role. The seed opens 121 days of synthetic website availability. Existing inventory values are preserved on repeated seeds.

Local Supabase supplies real Auth, using the project identifier in `supabase/config.toml`. Its Docker network uses loopback host binding. API port is 54321; its own Auth database uses 54322 and the local mail capture uses 54324. Auth email capture is local, not outbound email. This CLI setup is not a production Supabase installation.

## Environment variable names

Current app runtime:

- `DATABASE_URL` — restricted application-role PostgreSQL connection.
- `NEXT_PUBLIC_SUPABASE_URL` — Auth endpoint.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public Auth client key.
- `APP_ORIGIN` — exact permitted origin for mutations.

Local testing/provisioning:

- `TEST_DATABASE_URL` — reserved test connection name; current DB tests read the isolated local config created by setup.
- `SUPABASE_SERVICE_ROLE_KEY` — reserved provisioning name; local setup reads the local CLI status in an ignored file, not from the browser or app runtime.

Reserved for the next milestone (currently unused):

- `MODEL_API_KEY`
- `MODEL_NAME`

Variable values are intentionally absent. `.local/database.json`, `.local/supabase-status.json`, `.env.local` and reviewer-account files are ignored and restricted to the local user.

## Synthetic reviewer accounts

`npm run setup:local` deliberately creates `guest.a@resort.example`, `guest.b@resort.example`, `reservations@resort.example` and `gm@resort.example`. Their generated local password is in `.local/reviewer-accounts.md`. The guests are isolated; reservations has staff permission; GM is staff plus an explicit GM flag for the future inbox. There is no real personal data or access to external reservation/payment systems.

For final publication, create separate limited-permission reviewer credentials in the actual synthetic deployment and place only those demo credentials here. Do not copy database passwords, service-role keys or personal credentials.

## Verification and stop commands

```sh
npm run typecheck
npm test
npm run test:db
npm run build
# In a second terminal while the app is running:
npm run test:http
```

See `docs/evidence.md` for recorded outcomes and limitations. `test:db` truncates only the named isolated test database. HTTP tests create local synthetic bookings, verify permissions and transitions, then remove the bookings they created. A staff audit entry remains for each successful inventory save in that test.

Stop Next.js with Ctrl-C, then `npx supabase stop` and `npm run db:stop`. These stop commands preserve database state. Restart with `npm run setup:local` and `npm run dev`.

## Not yet deployed or verified

No hosted database, real model calls, real payment processing, public website, public source repository or final ZIP has been created. Windows/Linux clean-checkout setup, complete successful browser booking/staff flows, broader mobile/keyboard QA and production hardening remain pending. Initial guest-page visual checks are recorded in `docs/evidence.md`. See `docs/remaining-work.md`.
