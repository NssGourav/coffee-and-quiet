# Coffee and Quiet deployment and reviewer guide

Repository: https://github.com/NssGourav/coffee-and-quiet

**Deployment status:** the complete application runs locally. There is no hosted application URL in this submission. Payments and outbound messages are deliberately simulated; AI uses the real local Qwen3 4B model through Ollama. No paid API account is required.

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

Each clean installation creates its own password. Display the generated login details locally:

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
4. Open Enquiry inbox and the supplied wedding, villa or offsite sample. Choose **Classify & draft with AI**. The category, extracted text and actual model-written reply are saved. Correct routing if needed; the original guest text remains visible.
5. For a room enquiry, expand **Check an accommodation quote**, enter full dates and occupancy, then append the rate-table result. Inspect and approve the reply before **Approve & simulate send**. No email or WhatsApp is sent.
6. Open the complaint and GM & unsorted lane. To inspect failure handling, stop Terminal A, analyse an unsent enquiry and wait for the manual-review outcome. Restart AI and retry. Requests have bounded timeouts; local model speed depends on hardware.

## 6. Environment variable names

Only names are listed here. Setup writes the local values automatically.

| Name | Purpose |
| --- | --- |
| DATABASE_URL | Application database connection using the restricted resort_app role |
| NEXT_PUBLIC_SUPABASE_URL | Supabase Auth endpoint |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public Auth client key; never a service-role credential |
| APP_ORIGIN | Exact application origin accepted for state-changing requests |
| TEST_DATABASE_URL | Local test connection name; existing DB tests use .local/database.json |
| SUPABASE_SERVICE_ROLE_KEY | Reserved provisioning name; local setup reads CLI status in an ignored file instead |
| OLLAMA_HOST | Set by the AI launcher for loopback-only model serving |
| OLLAMA_MODELS | Set by the AI launcher to the project's ignored model directory |
| OLLAMA_NO_CLOUD | Set by the AI launcher to disable cloud functionality |

The model name and loopback endpoint are fixed in the current application. No hosted-model API key is used. Files containing credentials (`.env.local`, `.local/database.json`, `.local/supabase-status.json` and reviewer-account files) are ignored and created with restricted file permissions.

## 7. Checks

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

## 9. Public hosting boundary

The GitHub repository is public; the application is local. A public deployment would require a hosted Auth/database service, migrations under an owner account, a separate restricted runtime database role, correctly configured SSL and origins, and reachable model inference. The fixed local Ollama URL cannot serve a remotely hosted Next.js app. No Vercel deployment, cloud database migration or hosted-model result is claimed.

Sources for prerequisite setup: [Supabase local development](https://supabase.com/docs/guides/local-development), [Ollama installation](https://ollama.com/download). The exact application commands above are defined in this repository.
