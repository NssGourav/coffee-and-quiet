# Coffee & Quiet — resort assessment

A local implementation of **Problem 1: Hill resort’s direct-booking website with AI enquiry routing** for the Isocode Labs assessment. The selected brief and assessment instructions are authoritative. This is a fictional resort with synthetic data.

**Current milestone:** booking, rates/allotment and the AI enquiry inbox are implemented locally. AI runs through a free local Ollama model. See the dated evidence log for actual verification and remaining limits. No public repository, deployment or final submission ZIP has been produced.

## Run locally

Prerequisites: Node.js 22, npm, PostgreSQL 17 command-line tools (`initdb`, `pg_ctl`, `postgres`) on PATH, and a running Docker-compatible engine. On this machine, the existing Colima installation supplies Docker. No cloud account or paid API is needed for the current milestone.

```sh
nvm use
npm ci
npm run setup:local
npm run dev
```

Open **http://127.0.0.1:3000**. Use that exact host; the mutation origin check is configured for it. Setup creates `.env.local` automatically; do not replace it with the empty example. Setup is designed for the local development environment, not a production deployment.

Local synthetic reviewer logins are written to **`.local/reviewer-accounts.md`** with restricted file permissions. Two guest accounts, one reservations account and one staff account with GM permission are created. No account has access to real data. Passwords and API keys are excluded from Git and are never printed by the setup scripts.

## Try the milestone

1. Search dates and choose a room. Each stay shows the sum of its nightly base rates and GST.
2. Sign in with a generated guest account, enter a synthetic guest name, and create a hold.
3. Review the accepted price snapshot and choose simulated payment success or failure. No card details are requested. Confirmation is saved in PostgreSQL and can be revisited from My bookings.
4. Sign out, then use the reservations account to edit a daily rate or allotment. A reduction below active holds and confirmed bookings is rejected. Changed rates do not change existing holds.

The three booking steps are choose stay, details/sign-in, review/test payment. Confirmation is the result. Auth uses local Supabase; the application uses one separate, dedicated native PostgreSQL cluster to keep database tests fast and independent of the Auth stack.

## Verification

```sh
npm run typecheck
npm test
npm run test:db
npm run build
# While npm run dev is running in another terminal:
npm run test:http
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

These commands preserve the assessment’s database files. If you started Colima only for this task, `colima stop` stops its VM, but check that no other projects are using it first. No service was deployed, no remote Git repository was created, and no money was spent for this milestone.

## Review and delivery

The [remaining-work list](docs/remaining-work.md) tracks delivery and production limits. Start AI using [the local model guide](docs/ai-local.md). Read [Important Decisions Explained Simply](docs/important-decisions.md) for the interview walkthrough. Manual enquiry fallback is always labelled; it is never presented as successful AI.

Final submission is one ZIP at most 25 MB containing **exactly** a TDD (PDF or Word) and `deployment.md`. This repository itself is not the submission ZIP. The TDD needs an actual public GitHub URL at the top once publication is authorised. The user makes the portal selection and final submission.
