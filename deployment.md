# Local setup and reviewer instructions

**Status: local application with booking, staff administration and an AI enquiry inbox. No production deployment or public GitHub URL. See the evidence log for current verification. Final submission packaging remains separate.**

## Prerequisites

- Node.js 22 (the checked environment uses 22.23.1) and npm.
- PostgreSQL 17 tools `initdb`, `pg_ctl` and `postgres` on PATH.
- Running Docker-compatible container engine. Existing Colima was used on the development Mac.
- Free disk space for dependencies, local Supabase images and the Qwen3 4B model (about a 2.5 GB model download). Initial downloads need internet access.
- Free Ollama runtime for AI. See the Local AI inbox section; inference runs entirely on this computer.

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

AI uses a fixed loopback endpoint and local model; no API key or cloud AI environment variable is required.

Variable values are intentionally absent. `.local/database.json`, `.local/supabase-status.json`, `.env.local` and reviewer-account files are ignored and restricted to the local user.

## Synthetic reviewer accounts

`npm run setup:local` deliberately creates `guest.a@resort.example`, `guest.b@resort.example`, `reservations@resort.example` and `gm@resort.example`. Their generated local password is in `.local/reviewer-accounts.md`. The guests are isolated; reservations has staff permission; GM is staff plus an explicit GM flag for manager review. There is no real personal data or access to external reservation/payment systems.

For local review, setup generates the demo account credentials in `.local/reviewer-accounts.md`; open that local file after setup. If a hosted demo is later authorized, create separate limited-permission synthetic reviewer credentials for it. Never copy database passwords, service-role keys or personal credentials into this document.

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

No hosted database, real payment processing, public website, public source repository or final ZIP has been created. Complete local browser booking and staff flows have passed. Windows/Linux fresh-machine setup, a full screen-reader audit and production hardening remain unverified. See `docs/evidence.md` and `docs/remaining-work.md`.

## Local AI inbox (8 November update)

The enquiry inbox is now implemented. See `docs/ai-local.md` for local model setup and `docs/important-decisions.md` for the plain-English walkthrough. No paid API key is used. `npm run ai:start` launches the local model service; download the model specified in that guide before using AI. The web app stays usable for manual enquiry review if the model is stopped.

Additional checks:

```sh
npm run test:enquiries
npm run test:ai
npx playwright install chromium
npm run test:browser
```

The browser checks create synthetic bookings and enquiries in the local demo, and leave that activity visible. Browser screenshots are written to ignored `artifacts/browser`. AI model weights, runtimes, dependencies and screenshots are not part of the two-document submission ZIP.

For the additional responsive/keyboard checks, run `npm run test:browser-review`. With the selected model installed and the local service running, `npm run test:browser-ai` verifies real AI processing and the staff approval gate in the browser. It leaves the supplied wedding enquiry as a reviewable draft. The saved model evaluation results are in `docs/ai-evaluation.json`.

To review the production build locally, use `npm run build` followed by `npm run start` instead of the development server. Do not run both on port 3000 at the same time. This is still local execution, not a deployment.
