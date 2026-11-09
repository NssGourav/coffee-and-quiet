# Coffee and Quiet deployment and reviewer guide

Repository: https://github.com/NssGourav/coffee-and-quiet

**Live app:** https://coffee-and-quiet.vercel.app

The public review deployment uses Vercel Hobby, one free Supabase project (Auth plus the private application schema), and Gemini 3.5 Flash-Lite on a free-tier project with billing disabled. Payments and outbound messages are simulated. Local setup remains available with real Qwen3 4B through Ollama; no paid API account is required.

## 1. Prerequisites

The verified platform is macOS with Node.js 22.23.1, PostgreSQL 17, a Docker-compatible engine, Supabase CLI 3.0.0 and Ollama. Linux and Windows have not been independently verified. Clean-checkout verification on the development Mac does not constitute fresh-machine or cross-platform certification.

Install:

- Git and Node.js 22. The repository's `.nvmrc` selects 22.23.1 if you use nvm.
- PostgreSQL 17 command-line tools: `initdb`, `pg_ctl` and `postgres` must be on PATH. Do not start a separate global PostgreSQL service for this project.
- A running Docker-compatible engine, such as Docker Desktop or Colima. For an existing Colima installation, run `colima start` before setup.
- [Ollama](https://ollama.com/download), with its `ollama` command on PATH. Quit its desktop background service before using the project launcher, which owns port 11434.

Allow several GB of disk space and enough memory for Docker, the app and the model. Qwen3 4B is approximately a 2.5 GB download. Dependencies, container images and the model require internet for their initial downloads; inference runs locally afterwards.

On macOS with Homebrew, PostgreSQL tools can be installed and added to the current terminal's PATH with:

```sh
brew install postgresql@17
export PATH="$(brew --prefix postgresql@17)/bin:$PATH"
```

## 2. Clone and set up

```sh
git clone https://github.com/NssGourav/coffee-and-quiet.git
cd coffee-and-quiet
nvm install
nvm use
npm ci
npm run setup:local
```

If you do not use nvm, install Node.js 22.23.1 yourself and omit the two nvm commands. Run all following commands from the cloned repository root. Do not copy `.env.example` over the generated `.env.local`.

Setup creates a dedicated application PostgreSQL cluster in ignored `.local/postgres`, applies migrations 001-005, seeds three room types and 121 days of availability, starts local Supabase Auth and creates four synthetic users plus five example enquiries. Repeating setup preserves inventory and staff-edited enquiries. All database credentials are generated locally; they are not present in Git.

Default addresses:

| Service | Local address |
| --- | --- |
| Next.js application | http://127.0.0.1:3000 |
| Application PostgreSQL | 127.0.0.1:55439 |
| Supabase Auth API | http://127.0.0.1:54321 |
| Supabase's own PostgreSQL | 127.0.0.1:54322 |
| Local mail capture | http://127.0.0.1:54324 |
| Ollama | http://127.0.0.1:11434 |

Use `127.0.0.1`, not `localhost`, for the app URL. Server-side origin validation expects the exact configured origin. The Supabase Docker network binds its host ports to loopback.

## 3. Start the real AI and application

Terminal A, kept running:

```sh
npm run ai:start
```

Terminal B, in the same repository:

```sh
ollama pull qwen3:4b
ollama list
npm run dev
```

The pull command downloads the model once into the project launcher's model store. If using the optional project-local Ollama executable instead of a PATH installation, replace `ollama` in the pull/list commands with `.local/ollama/ollama`. That executable and the weights are intentionally excluded from Git; a fresh clone uses the installed Ollama runtime.

Open http://127.0.0.1:3000. Keep Terminal A and Terminal B running. PostgreSQL and the Supabase containers run in the background after setup.

For a production build on the same local machine, stop `npm run dev` with Ctrl-C and run:

```sh
npm run build
npm run start
```

Do not run dev and start simultaneously on port 3000. A local production build is not a public deployment.

## 4. Reviewer login details

Hosted reviewer sign-in: https://coffee-and-quiet.vercel.app/sign-in

Shared demo password for all four accounts below: `Review-JpYjal26MnjTS1cf!`

These are intentionally public demo accounts, also listed at the top of README.md. They access only a shared synthetic assessment dataset and grant no database-owner, hosting or model-provider access. Use fictional data only.

Each local installation creates its own different password. Display local login details with:

```sh
cat .local/reviewer-accounts.md
```

| Email | Access |
| --- | --- |
| guest.a@resort.example | Guest A: this guest's bookings and enquiries |
| guest.b@resort.example | Guest B: independent guest data for isolation checks |
| reservations@resort.example | Reservations staff: inventory, all bookings and enquiry review |
| gm@resort.example | Staff with GM flag: complaint and unsorted review |

The generated password is shared by these deliberately limited local sample accounts. It is not a database password, service-role key or personal credential. There is no public sign-up screen. Do not commit the generated account file or use these users with real guest data.

## 5. Reviewer walkthrough

1. As Guest A, search a two-night stay within the next 121 days, choose a room, sign in and enter a fictional guest name. Review the nightly GST breakdown, create the ten-minute hold and simulate a successful payment. Reopen the persisted confirmation through My bookings.
2. As Guest B, verify that Guest A's booking is absent from My bookings. Trying to open another guest's booking directly is denied.
3. As reservations staff, open Staff desk, choose a room and week, edit a future rate/allotment and save. Existing holds retain their accepted prices. An allotment reduction below live commitments is rejected.
4. Open Enquiry inbox and an unsent villa or offsite sample, or create a fictional enquiry as a guest. Choose **Classify & draft with AI**. The category, extracted text and actual model-written reply are saved. Correct routing if needed; the original guest text remains visible. The hosted wedding example already shows a completed, read-only simulated send from verification.
5. For a room enquiry, expand **Check an accommodation quote**, enter full dates and occupancy, then append the rate-table result. Inspect and approve the reply before **Approve & simulate send**. No email or WhatsApp is sent.
6. Open the complaint and GM & unsorted lane. To inspect failure handling in the local setup, stop Terminal A, analyse an unsent enquiry and wait for the manual-review outcome. Restart AI and retry. Requests have bounded timeouts; local model speed depends on hardware.

## 6. Environment variable names

Only names are listed here. Setup writes the local values automatically.

| Name | Purpose |
| --- | --- |
| DATABASE_URL | Application database connection using the restricted resort_app role |
| NEXT_PUBLIC_SUPABASE_URL | Supabase Auth endpoint |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public Auth client key; never a service-role credential |
| APP_ORIGIN | Exact application origin accepted for state-changing requests |
| TEST_DATABASE_URL | Local test connection name; existing DB tests use .local/database.json |
| SUPABASE_SERVICE_ROLE_KEY | Provisioning only; never set in the hosted application runtime |
| AI_PROVIDER | Explicit model selection; omitted locally to use Ollama, configured for Gemini in hosting |
| GEMINI_API_KEY | Server-only credential for the confirmed free Gemini project |
| DATABASE_SSL_CA | Supabase CA certificate for verified TLS connections |
| OLLAMA_HOST | Set by the AI launcher for loopback-only model serving |
| OLLAMA_MODELS | Set by the AI launcher to the project's ignored model directory |
| OLLAMA_NO_CLOUD | Set by the AI launcher to disable cloud functionality |

The local model endpoint is fixed to loopback. The hosted model endpoint is fixed to Google Gemini 3.5 Flash-Lite; keys are sent only in request headers. No user-supplied model URL is accepted. Files containing credentials (`.env.local`, `.local/database.json`, `.local/supabase-status.json` and reviewer-account files) are ignored and created with restricted file permissions.

## 7. Checks

The final search update includes live checkout-date guidance, calendar bounds, and clearer empty/error states. Fourteen unit tests, TypeScript, the production build, and desktop/mobile search checks passed. Check-in changes update the allowed checkout range; direct requests still enforce the same limits on the server.

With setup complete:

```sh
npm run typecheck
npm test
npm run test:db
npm run build
```

With the app running in another terminal:

```sh
npm run test:http
npm run test:enquiries
```

With Ollama and the selected model running:

```sh
npm run test:ai
```

Optional repeatable browser checks require Chromium:

```sh
npx playwright install chromium
npm run test:browser
npm run test:browser-review
npm run test:browser-ai
```

`test:db` clears only the named isolated `resort_test` database. HTTP checks create and remove their own sample records; inventory audit entries remain. Browser checks leave synthetic activity visible. Use only this local sample environment for these tests. See `docs/evidence.md` for dated results and limits.

## 8. Troubleshooting and stopping

- Missing `initdb`/`pg_ctl`: add PostgreSQL 17's bin directory to PATH, then rerun setup.
- Docker unavailable: start Docker Desktop or Colima, then rerun setup. First-run image downloads can take time.
- Port occupied: stop the conflicting instance you own; do not reset someone else's database. Run one default local copy at a time.
- AI unavailable: check Terminal A, confirm `qwen3:4b` appears in `ollama list`, then retry. Manual review remains available.
- Sign-in fails: rerun setup and use the generated account file from that exact checkout.
- No dates available: use a stay within the seeded range, or run `npm run db:seed` to extend availability. Existing seeded nights are preserved.
- Setup diagnostics are in `.local/supabase-start.log`; inspect locally because they may contain credentials. Never upload that file.

Stop the app and Ollama terminals with Ctrl-C. Then:

```sh
npx supabase stop
npm run db:stop
```

These commands preserve database state. To resume, run setup, start AI and start the app again. Do not run Docker volume deletion or a Supabase reset against the working copy.

## 9. Hosted deployment and reproduction

The live app is deployed from this repository using the Vercel CLI. Auth and application data are in one dedicated free Supabase project; application tables remain in the private `resort` schema, outside the Data API. The app connects through the transaction pooler as `resort_app`, with certificate verification and one connection per Vercel function instance. Public signup and anonymous signup are disabled; database SSL enforcement is enabled.

To create another deployment under accounts you control:

1. Create a **free** Supabase project, select a nearby region, and keep its database owner credentials private. Obtain the session-pooler connection string and the project's CA certificate from the Dashboard. Use the owner connection only for provisioning.
2. Install the locked dependencies. Export provisioning variables locally: `HOSTED_OWNER_DATABASE_URL`, `HOSTED_APP_PASSWORD`, `HOSTED_REVIEWER_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_SSL_CA`. `HOSTED_APP_PASSWORD` must be a generated 32-byte hexadecimal password. Run `ALLOW_HOSTED_SETUP=1 node scripts/setup-hosted.mjs` only for your intended fresh synthetic project. This applies migrations once, seeds inventory/enquiries and creates four confirmed reviewer users. Repeating it preserves existing seed rows, but resets the synthetic account passwords and application-role password to the supplied values.
3. Sign in to Vercel and create a Hobby project. Configure only the runtime variables `DATABASE_URL`, `DATABASE_SSL_CA`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_ORIGIN`, `AI_PROVIDER`, `GEMINI_API_KEY`. Use the restricted role with the project-qualified pooler username and transaction-mode port. Do not use an owner, service-role or management token as the runtime database credential. Keep SSL parameters out of the URL when supplying `DATABASE_SSL_CA`, so the driver does not override verification.
4. Confirm the Gemini key belongs to a free-tier project with billing disabled. Select the hosted Gemini provider explicitly. The adapter uses the fixed `gemini-3.5-flash-lite` endpoint; provider errors and quota exhaustion retain manual review. No paid-provider fallback is configured. Without hosted model access, run the fully working local setup instead.
5. Update the public URL in `deploy/supabase/config.toml` to your new application origin. Use Supabase CLI `config diff --workdir deploy --remote=<your-project-ref>` to inspect changes, then `config push` for that same project. Only the explicitly declared Auth URLs/signup limits, exposed schemas and SSL enforcement are managed.
6. Use a current Vercel CLI (the old installed 41.6.0 was rejected), link your project and run `vercel deploy --prod`. The tested deployment used CLI 65.12.1. The `.vercelignore` file excludes credentials, local state, model weights, screenshots and document output from uploaded source.
7. Confirm the canonical production URL is publicly reachable without Vercel sign-in. Verify guest/staff login, booking/confirmation, inventory editing and real AI through that URL. The application origin check is exact: use the configured canonical domain, not an arbitrary preview URL.

The seven synthetic hosted AI cases initially produced six passes and one provider error; the failed case passed on retry. The local model passed all seven. This is small-sample verification, not a general accuracy or uptime guarantee. Free Supabase projects can pause after inactivity; free AI quotas can cause temporary failures. Keep the services available through the review period. Public registration, real payments/messages, production privacy operations and full performance/accessibility audits are outside the current slice.

Sources: [Supabase local development](https://supabase.com/docs/guides/local-development), [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [Ollama installation](https://ollama.com/download), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Vercel function limits](https://vercel.com/docs/functions/limitations).
