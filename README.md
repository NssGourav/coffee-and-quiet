# Coffee & Quiet — resort assessment

## Try the live demo

**Live app:** https://coffee-and-quiet.vercel.app

**Sign in:** https://coffee-and-quiet.vercel.app/sign-in

**Shared demo password for all four accounts:** `Review-JpYjal26MnjTS1cf!`

| Email | Role | What to try |
| --- | --- | --- |
| `guest.a@resort.example` | Guest A | Search rooms, book a stay, simulate payment and submit an enquiry |
| `guest.b@resort.example` | Guest B | Make a separate booking and check guest-data isolation |
| `reservations@resort.example` | Reservations staff | Edit rates/allotment, review bookings, classify enquiries with AI and approve simulated replies |
| `gm@resort.example` | General manager (staff) | Review complaint/unsorted lanes and access the staff desk |

These are intentionally public demo accounts sharing a synthetic dataset. Use fictional details only. Payments and enquiry replies are simulated; AI inference is real. Booking emails are sent only for verified guest accounts; sample demo addresses are skipped. They grant no database-owner, hosting or model-provider access.

For a quick review: book as Guest A, sign out, then sign in as reservations staff and try the enquiry inbox. Local installations generate their own different passwords; see [deployment.md](deployment.md).

**New guest signup:** https://coffee-and-quiet.vercel.app/sign-up. Verify the six-digit email code, then book using fictional guest details. A confirmed booking queues a branded email to the verified address. Gmail delivery is subject to sender limits; the saved confirmation remains available if mail fails.

Public source: https://github.com/NssGourav/coffee-and-quiet

An end-to-end implementation of **Problem 1: Hill resort’s direct-booking website with AI enquiry routing** for the Isocode Labs assessment. The selected brief and assessment instructions are authoritative. This is a fictional resort with synthetic data.

**Live app:** https://coffee-and-quiet.vercel.app

Booking, rates/allotment and the AI enquiry inbox are implemented. The live review deployment uses free Vercel/Supabase services and Gemini 3.5 Flash-Lite; local setup retains Ollama/Qwen3 4B. Use fictional data only. Follow [deployment.md](deployment.md) for complete reviewer setup, AI startup, login details and troubleshooting. See the dated evidence log for actual verification and limits.

## Run locally

Prerequisites: Node.js 22, npm, PostgreSQL 17 command-line tools (`initdb`, `pg_ctl`, `postgres`) on PATH, and a running Docker-compatible engine. On this machine, the existing Colima installation supplies Docker. No cloud account or paid API is needed for the current milestone.

```sh
nvm use
npm ci
npm run setup:local
npm run dev
```

Open **http://127.0.0.1:3000**. Use that exact host; the mutation origin check is configured for it. Setup creates `.env.local` automatically; do not replace it with the empty example. Setup is designed for the local development environment, not a production deployment.

Local synthetic reviewer logins are written to **`.local/reviewer-accounts.md`** with restricted file permissions. Two guest accounts, one reservations account and one staff account with GM permission are created. No account has access to real data. Locally generated passwords and operational API keys are excluded from Git and are never printed by the setup scripts. Only the intentionally public hosted demo login is documented above.

## Try the milestone

1. Search dates and choose a room. Each stay shows the sum of its nightly base rates and GST.
2. Sign in with a generated guest account, enter a synthetic guest name, and create a hold.
3. Review the accepted price snapshot and choose **Confirm booking** or **Release this hold**. These use the simulated payment success/failure paths. No card details are requested. Confirmation is saved in PostgreSQL and can be revisited from My bookings.
4. Sign out, then use the reservations account to edit a daily rate or allotment. A reduction below active holds and confirmed bookings is rejected. Changed rates do not change existing holds.

For local signup, open the email capture inbox at http://127.0.0.1:54324 to read the verification code and booking confirmation. Local mail is captured, never sent externally.

The three booking steps are choose stay, details/sign-in, review/test payment. Confirmation is the result. The hosted app uses one Supabase project for Auth and application data. Local setup uses Supabase Auth and a separate native PostgreSQL cluster for isolated database tests.

## Verification

```sh
npm run typecheck
npm test
npm run test:db
npm run build
# While npm run dev is running in another terminal:
npm run test:http
npm run test:signup
```

Database tests use the isolated `resort_test` database and refuse to truncate any other database. HTTP tests use only locally generated synthetic accounts and delete only the test bookings they create. Staff-save audit records from HTTP checks remain as truthful history. Read [the evidence log](docs/evidence.md) for actual outcomes and unverified checks.

## Structure

| Location         | Purpose                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `src/app`        | Guest pages, staff pages and authenticated HTTP routes                           |
| `src/lib`        | Validation, money/date helpers, database transactions and Supabase server client |
| `src/components` | Shared presentation and interactive forms                                        |
| `db/migrations`  | Tables, RLS, restricted application role and transactional stock functions       |
| `db/seed.sql`    | Synthetic room types, daily rates and website allotment                          |
| `tests`          | Unit, real PostgreSQL concurrency and real HTTP access checks                    |
| `scripts`        | Local setup, migrations and deliberately limited reviewer-account provisioning   |
| `docs`           | Assumptions, decisions, tax sources, verification and remaining scope            |

Read [the transaction explanation](docs/decisions.md) to understand why each occupied night is protected and why several separate API writes would not be equivalent.

## Stop local services

Stop the Next.js terminal with Ctrl-C, then:

```sh
npx supabase stop
npm run db:stop
```

These commands preserve the assessment’s database files. If you started Colima only for this task, `colima stop` stops its VM, but check that no other projects are using it first. These commands stop only local services. The live review app uses separate free cloud services; no paid service was enabled.

## Review and delivery

The [remaining-work list](docs/remaining-work.md) tracks delivery and production limits. Start AI using [the local model guide](docs/ai-local.md). Read [Important Decisions Explained Simply](docs/important-decisions.md) for the interview walkthrough. Manual enquiry fallback is always labelled; it is never presented as successful AI.

Final submission is one ZIP at most 25 MB containing **exactly** a TDD (PDF or Word) and `deployment.md`. This repository itself is not the submission ZIP. The [TDD PDF](output/pdf/Coffee-and-Quiet-TDD.pdf) includes the public GitHub URL at the top; its editable source is [technical-design.md](docs/technical-design.md). The user makes the portal selection and final submission.
