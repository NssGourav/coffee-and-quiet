# Coffee & Quiet — Quick Project Guide

**Updated: 9 November 2026.** Short notes about what is actually implemented; proposed improvements are listed separately.

## 1. What are we building?

- A resort booking website with an AI enquiry inbox.
- **Guests:** browse rooms, check dates/prices, book with simulated payment and submit enquiries.
- **Staff:** manage daily rates/allotment, correct enquiry routing and approve replies.
- **GM:** General Manager; a staff account with manager visibility for complaints and unsorted work.
- **Allotment:** the rooms this website is allowed to sell each night.

## 2. Tech stack — what each part is for

| Technology | Purpose in our project |
| --- | --- |
| **Next.js 16.4.5** | Full-stack framework: pages, routing, server rendering, API endpoints and builds. |
| **React 19.2** | UI components: room cards, booking forms and staff editors. |
| **Three.js** | Draws the sign-in page’s interactive hills, coffee plants and estate house in the browser. Loads only on sign-in/signup; supports reduced motion and an illustrated fallback. |
| **TypeScript 5.9** | Checks data types while developing; helps catch coding mistakes. |
| **Node.js 22** | Runs JavaScript on the server, plus setup scripts and tests. |
| **CSS** | Custom colours, typography, spacing, responsive layouts and keyboard focus styles. |
| **PostgreSQL 17 + SQL** | Stores application data and enforces inventory, booking and permission rules. |
| **pg** | Node.js database driver; sends parameterized SQL using pooled connections. |
| **Supabase Auth** | Password sign-in, email-code verification and sessions; self-signups become guests. |
| **Supabase SSR/client libraries** | Connect Auth to server-rendered pages and session cookies. |
| **Nodemailer + Gmail SMTP** | Sends booking confirmations to verified guests; Supabase sends signup codes through the same SMTP account. |
| **Mailpit** | Captures local emails without sending them externally. |
| **Zod 4** | Validates actual request values and structured AI responses at runtime. |
| **Ollama** | Runs the local AI service; our launcher disables cloud functionality. |
| **Gemini 3.5 Flash-Lite** | Runs real AI for the hosted app through a server-only API key on a free-tier project. |
| **Vercel Hobby** | Hosts the public Next.js application. |
| **Qwen3 4B** | The model that classifies, extracts fields and drafts replies. |
| **Docker + Colima + Supabase CLI** | Containers, their Mac runtime and tools for running local Supabase. |
| **Node test runner + tsx** | Run unit/database tests written in TypeScript. |
| **Playwright** | Automates browser journeys and responsive/keyboard checks. |
| **npm / Git / Prettier** | Dependencies and commands / commit history / code formatting. |

- **TypeScript:** checks code types. **Zod:** checks incoming values.
- **Ollama:** the model runner. **Qwen3:** the model it runs.
- **Authentication:** who are you? **Authorization:** what can you do?

## 3. How the parts connect

- Browser → Next.js pages/API → verified identity + validated input → PostgreSQL.
- For AI: Next.js → Gemini (hosted) or Ollama (local) → validated result → saved enquiry → staff review.
- For email: verified signup → guest profile; confirmed booking → saved email job → Gmail SMTP → guest inbox.
- Frontend and backend live in **one Next.js application**.
- **Hosted:** one Supabase project contains Auth and application data. **Local:** native PostgreSQL stores application data and a separate Supabase database supplies Auth.
- Local Next.js and Ollama are separate programs, launched in two terminals. The hosted app runs without your laptop or either terminal.

| Address | Service |
| --- | --- |
| `127.0.0.1:3000` | Website and application API |
| `127.0.0.1:11434` | Ollama |
| `127.0.0.1:55439` | Application PostgreSQL |
| `127.0.0.1:54321` | Supabase API/Auth |

## 4. Booking flow and important concepts

1. Guest chooses dates, room and guest count; server calculates availability and taxes.
2. Guest signs in and requests a **10-minute hold** — a documented demo assumption.
3. Database locks every occupied night's inventory and rechecks stock and rate versions.
4. One transaction saves the entire hold and nightly prices, or rolls everything back.
5. Successful simulated payment confirms a valid hold; failure/expiry releases availability.
6. Guest can reopen the saved confirmation; one email is queued after confirmation. Failures do not undo the booking.

- **Invariant:** confirmed bookings + unexpired holds ≤ website allotment, for every room type/night.
- **Example:** 14–16 November uses the nights of 14 and 15; checkout day is excluded.
- **Transaction:** related changes succeed together or roll back together.
- **Row lock:** competing requests take turns before changing the same inventory.
- **Idempotency:** request/event keys prevent retries causing duplicate bookings/payments.
- **Price snapshot:** accepted prices survive later staff rate edits.
- **Money:** integer paise; ₹100 = 10,000 paise. Tax calculations are deterministic.
- Staff edits use the same locks and cannot reduce allotment below commitments.
- Each booking contains one unit. Agency stock is not synchronized.

## 5. AI enquiry flow today

1. Signed-in guest submits a message; the original is saved first.
2. Staff click **Classify & draft with AI**.
3. First call classifies: room, wedding, offsite, complaint or unsorted.
4. Room/event enquiries get another call extracting dates, guests and budget.
5. Zod validates structure; source matching rejects extracted text absent from the message.
6. Application rules assign a team; a separate call drafts from the validated category.
7. Staff review/edit and approve a **simulated** send; the saved sent record becomes read-only.

- Typical room/event processing uses **three model calls**.
- Drafting currently receives the category, not a full resort-fact bundle.
- Staff separately calculate an authoritative room quote and append it to the reply.
- AI cannot calculate authoritative prices, book, take payment or send messages.
- Ambiguous dates remain as written; missing years are not invented.
- Uncertain/invalid results and model failures go to manual review/retry.
- Explicit complaints stay flagged; detected complaints also alert the GM in-app.
- **Version check:** rejects an old AI result after staff save a correction.
- Confidence and matching source text do not guarantee correct understanding.

## 6. Data and code map

| Database tables | Store |
| --- | --- |
| `profiles`, `room_types` | Permissions and room categories |
| `inventory` | Daily rate, allotment and edit version |
| `bookings`, `booking_nights` | Booking state and accepted nightly price/tax snapshots |
| `payment_events`, `inventory_audit` | Payment deduplication and staff change history |
| `enquiries`, `enquiry_audit` | Original/working messages, suggestions, routing, replies and actions |

| Location | Responsibility |
| --- | --- |
| `src/app/` | Pages (`page.tsx`) and API handlers (`route.ts`) |
| `src/components/` | Interactive forms and reusable UI |
| `src/lib/domain.ts` | Dates, money and input rules |
| `src/lib/db.ts`, `queries.ts` | Database transactions and reads |
| `src/lib/supabase.ts`, `http.ts`, `src/proxy.ts` | Identity, request checks and session refresh |
| `src/lib/enquiry-ai.ts` | Model calls, prompts and validation |
| `db/migrations/`, `db/seed.sql` | Versioned database changes and synthetic starting data |
| `scripts/`, `tests/`, `docs/` | Setup/evaluation, verification and explanations |

## 7. Security basics

- Server routes and database functions enforce permissions.
- **RLS:** row-level security controls which records each user can read.
- Restricted application DB credentials cannot directly edit protected tables; checked functions perform writes.
- Parameterized SQL keeps user values separate from executable queries.
- Requests have origin, content-type, size and input checks.
- Secrets stay in ignored local files; the browser never receives the database password.
- Use synthetic data; payments and enquiry replies are simulated; verified-account booking emails are real and passports are not collected.

## 8. Startup commands

**Terminal 1 — supporting services and website:**

```bash
cd coffee-and-quiet
nvm use
colima start
npm run setup:local
npm run dev
```

**Terminal 2 — AI:**

```bash
cd coffee-and-quiet
nvm use
npm run ai:start
```

- Open **http://127.0.0.1:3000** and keep both terminals running.
- This Mac already has dependencies/model. Fresh setup also needs `npm ci` and [AI setup](ai-local.md).
- Generated demo logins: `.local/reviewer-accounts.md`.
- Production preview: `npm run build`, then `npm run start` instead of `npm run dev`.
- Stop foreground programs with **Ctrl+C**; supporting services with `npx supabase stop` and `npm run db:stop`.

## 9. Tests and evidence

- `npm test` — deterministic rules and model failure handling.
- `npm run typecheck` / `npm run build` — types and production compilation.
- `npm run test:db` — real database permissions, booking races and enquiry revisions; needs PostgreSQL.
- `npm run test:http` / `npm run test:enquiries` — API workflows; need running app/Auth/database.
- `npm run test:browser` / `npm run test:browser-review` — browser journeys/layout; also need Playwright Chromium.
- `npm run test:ai` / `npm run test:browser-ai` — real local AI; browser check also needs app/services.
- **9 November rerun:** 12 unit tests, type checking and build passed.
- **8 November records:** 22 DB tests, seven live-model cases, HTTP/browser checks passed; not all rerun on 9 November.
- Small synthetic evaluations do not prove general AI accuracy. Details: [evidence.md](evidence.md).

## 10. What remains

- **Architecture:** personalized fact-grounded drafting, detailed per-stage records and send-time quote rechecking.
- **Retries:** intake has no deduplication key; duplicate sends are rejected rather than returning the prior success.
- **Optional:** promo codes, richer rates, exports, event forms and simulated email/WhatsApp intake.
- **Required delivery:** public GitHub repository, final TDD PDF/Word, and ZIP containing exactly TDD + `deployment.md`.
- **Production:** account recovery, stronger abuse controls, broader accessibility/performance checks. Live hosting is delivered at https://coffee-and-quiet.vercel.app on free plans.
- **Deadline:** 9 November 2026, 11:59 pm IST. Local/free only; paid API use needs approval.

## 11. Remember for your interview

- PostgreSQL protects inventory and accepted prices.
- AI suggests; application rules route; staff approve communication.
- A quote gives information; a hold reserves inventory.
- Explain implemented features, assumptions and proposals separately.

## Final search-form improvement

- Changing check-in updates the allowed checkout dates and visible guidance immediately.
- The calendar allows stays of 1–14 nights; the server checks the same rule even if browser validation is bypassed.
- Mobile shows the guidance above the full-width search button. Oversized groups get a clear one-room explanation.
- Final verification: 14 unit tests, TypeScript, production build and desktop/mobile search checks passed.
