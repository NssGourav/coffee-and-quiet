# UI verification — 9 November 2026

- Later spacing pass: reduced general page/header spacing and staff navigation, headings, filters and inventory-row gaps. Moved inventory guidance into native keyboard-accessible details/summary help. Inventory has no document overflow at 360, 768 and 1280 CSS pixels; mobile fields and save buttons retain 46px height. Inbox and bookings were checked at 360px. A clipped, absolutely positioned table label caused document overflow; positioning the table wrapper now contains it while preserving horizontal scrolling inside the table. Keyboard help expansion/collapse and the final production build passed. Screenshot: `artifacts/browser/staff-inventory-compact.jpg`. No rates, allotments or business rules were changed in this pass.
- Added a lazy-loaded Three.js sign-in landscape with a separate, immediately rendered form, illustrated fallback, reduced-motion support, pause control, capped rendering resolution and resource cleanup. No model/texture downloads or paid services are involved.
- Removed the assessment banner and presentation labels from the interface. Payment simulation disclosure and the factual website/photography explanation remain. Confirmation badge now reads “Confirmed”; desktop top padding decreased from 65px to 16px.
- Historical booking rate/policy snapshots remain stored unchanged; their old presentation prefixes are omitted from the UI. Migration 005 changes defaults for new bookings and was applied to development and the isolated test database.
- `npm run typecheck` and the final `npm run build` passed. `npm run test:db`: **22 passed, 0 failed**.
- Browser checks against the running local app verified the rendered Three.js landscape, real rejected and successful guest sign-in, sign-out, an existing saved confirmation, removed labels, and no horizontal document overflow at narrow mobile and desktop sizes. The browser's existing reduced-motion setting was enabled and the static scene rendered with its animation control hidden. Active animation/pause behavior and forced WebGL failure were not exercised through this browser.
- Screenshots were captured under ignored `artifacts/browser/signin-three-desktop.jpg`, `signin-three-mobile.jpg` and `confirmation-compact-desktop.jpg`. These checks do not establish public deployment or a performance benchmark.

# Verification evidence — 4 November 2026

This records observed results, not planned tests. Commands ran from the repository root on macOS with Node.js 22.23.1 on PATH, Next.js 16.4.5, PostgreSQL 17.10 and local Supabase CLI 3.0.0. No paid model or cloud environment was used.

## Automated checks

| Command | Observed result |
| --- | --- |
| `npm run setup:local` | Passed after starting the existing Colima Docker engine. Repeated setup preserved inventory and provisioned the four synthetic accounts. Database migrations 001–003 applied to development and the isolated test database. |
| `npm test` | **6 passed, 0 failed**. Calendar night enumeration, invalid dates/range, booking-date limits, exact tax boundary/rounding, expiry boundary and input validation. |
| `npm run test:db` | **18 passed, 0 failed** against real PostgreSQL using concurrent connections and the restricted application role. |
| `npm run typecheck` | Passed (`tsc --noEmit`). |
| `npm run build` | Production compilation, TypeScript and Next.js route generation passed. This verifies a build, not a deployed service. |
| `npm run test:http` | All **7 printed scenario groups passed** against the running local server, real Supabase Auth and PostgreSQL. See details below. |
| `npm audit --omit=dev --audit-level=moderate` | 0 reported vulnerabilities at the check. This is a dependency advisory check, not a security audit. |

The shell commands used the installed Node 22 path when the user's default shell selected Node 20. Equivalent setup is `nvm use` before the listed commands. Test timestamps and durations are not performance benchmarks.

## Database acceptance criteria verified

- Twelve competing clients for the same last unit: exactly one hold succeeded; every other client received the sold-out error.
- A missing inventory night or zero allotment on any occupied night leaves no partial booking.
- Overlapping stays conflict; checkout-exclusive adjacent stays can coexist.
- Different overlapping date ranges submitted concurrently protect their shared night.
- Eight concurrent identical create-hold keys return one booking. A changed payload with the same key fails.
- SQL tax boundaries and rounding agree with the expected nightly arithmetic.
- Duplicate payment events confirm once; stale failure cannot undo confirmation; conflicting event reuse fails.
- Failed and expired holds release stock. Later success cannot resurrect them.
- Payment waits behind an inventory lock until after expiry, then fails confirmation because it rechecks the current database clock.
- Allotment reductions below commitments fail. A last-unit hold racing a reduction cannot make both requests succeed.
- Rate changes preserve accepted snapshots and demand a refreshed quote.
- Two opposite nightly price changes that leave the stay total unchanged still require fresh guest consent; accepted snapshots capture the new nightly versions.
- Stale staff versions fail and successful changes produce audit records.
- Another guest cannot read booking or night rows under RLS or pay that booking. Staff can read. Direct application-role updates are denied.
- Anonymous holds and excessive occupancy fail inside PostgreSQL, independent of the UI.

## HTTP scenario groups verified

1. Real Supabase password sign-in for two synthetic guests and reservations staff.
2. Rejection of anonymous, wrong-origin and invalid-date hold requests.
3. Hold idempotency, cross-guest read/payment isolation and staff booking read.
4. Simulated payment success, duplicate event, persisted two-night snapshot and confirmation-page response.
5. Guest denied staff mutation, staff save accepted, stale version rejected.
6. Late simulated success recorded as expired through the actual endpoint.
7. Simulated payment failure through the actual endpoint.

These are HTTP workflow tests; they are not a substitute for a complete browser-driven successful guest booking.

## Browser checks performed

- Local homepage opened with live prices and all three room types.
- Desktop screenshot inspected at the browser's default 1280-pixel width.
- Mobile screenshots inspected at 390 × 844 for the homepage, room detail and checkout sign-in error state.
- Homepage and checkout document width equalled the 390-pixel viewport: no horizontal document overflow in those checks.
- All four images reported loaded on the homepage.
- Navigated from discovery to Estate Room to checkout; dates, room, guest counts and nightly tax breakdown were retained. Sign-in was within step two.
- Submitted an intentionally invalid synthetic login using keyboard Tab/Return; an accessible error appeared and form input remained present.
- A mobile hero-caption overlap was found, fixed and visually rechecked. The browser viewport override was reset afterwards.

The browser screenshot transport initially failed, then recovered after reconnection. Screenshots were inspected in the tool, but no durable screenshot artifacts have yet been added to the repository.

## Failures corrected during development

- Dedicated PostgreSQL startup failed on a workspace path containing spaces. Disabling Unix-domain socket creation in that dedicated cluster removed the incorrectly split socket-path argument; TCP remains loopback-only.
- An early race-test assertion included other room types in its expected availability array. Filtering the assertion to the tested room type fixed the test; the race already produced one successful hold.
- The first dependency audit flagged an older Zod version. The installed/locked version was updated to 4.6.7; the subsequent audit reported zero vulnerabilities.
- A final review identified that total-only quote checking could silently accept an altered nightly breakdown. Migration 003, client version vectors and a regression test close that gap.
- Setup reports a clear instruction when the Docker engine is stopped; starting the existing engine and rerunning setup succeeded.

## Still unverified / incomplete

- Complete successful guest booking through browser controls; staff editing through browser controls; full keyboard-only traversal, screen-reader testing, multiple mobile sizes and weak-network measurements.
- Live-model correctness and failure evaluations, enquiry correction, GM complaint escalation and simulated sending: **not implemented yet**.
- Production authentication, hosting, TLS, security headers, abuse controls, cloud permissions and deployment migration path.
- Fresh-machine reproduction on a second platform. Setup was repeated on the development Mac, not on a new machine.
- No business KPI, load-test, performance benchmark or user-feedback claim is supported by this milestone.

# Verification Update — 8 November 2026

This section supersedes the earlier incomplete-status notes where stated. Work stayed local, used synthetic data and made no paid API calls or deployment. The browser connection tool was unavailable, so repeatable Playwright checks ran against localhost instead.

## Automated Results

- Unit checks: **12 passed** (booking dates/taxes/input validation plus enquiry source matching, uncertainty, suspicious instructions and malformed/unavailable/oversized model transport responses).
- Real PostgreSQL checks: **22 passed**, including the previous 18 booking/inventory tests and four enquiry tests for cross-guest isolation, competing AI/edit revisions, durable complaint flags and duplicate-send races. The unreleased enquiry migration was consolidated and all migrations replayed successfully from a clean isolated `resort_test` schema; development data was preserved.
- Existing authenticated booking HTTP checks: all seven printed groups passed after resuming services.
- Enquiry HTTP checks: both printed groups passed, covering guest/staff restrictions, persistence, GM visibility, manual correction, stale writes, immutable simulated sending, audit entries and the staff-only authoritative quote endpoint.
- Type checking and production compilation passed after the final application changes. The built application served locally through `npm run start`.

## Real Local AI Results

**Seven of seven synthetic evaluation cases passed** with Qwen3 4B: the three supplied enquiries, a room enquiry with a stated budget, a complaint, an unclear greeting and an instruction-manipulation attempt. Assertions cover classification plus the supplied dates/guest details and the explicit budget. Exact validated results and actual drafts are in `ai-evaluation.json`. No year was invented for the sample November or January enquiries.

The initially tested Qwen2.5 1.5B model failed some sample classifications/extractions. Qwen3 4B produced better extraction, but a draft-schema regex caused an internal-marker formatting issue; removing that provider-side regex while retaining application-side number/currency validation resolved it. The final evaluation above used the resulting real model calls. These seven examples are not a general accuracy benchmark or a claim of perfect prompt-injection resistance.

## Browser Results and Visual Review

- Complete 390px guest flow: real sign-in, room selection, guest details, hold, successful simulated payment, saved confirmation and confirmation reload passed.
- Guest enquiry submission, staff routing correction, explicit approval, simulated send and read-only saved reply passed.
- Staff inventory save passed through browser controls.
- Inbox, enquiry editor and inventory had no horizontal document overflow at 360, 390, 768 and 1280px. Keyboard skip-link navigation was verified after waiting for the page to finish loading; the main focus target was also made explicitly focusable.
- Original guest messages are preserved separately from staff corrections. Mobile inventory controls were changed to labelled, larger inputs and full-width save buttons.
- A real missing-model request was tested through the browser before the model download completed. The enquiry stayed saved, showed a manual-review notice and offered retry; this was not counted as successful AI.
- Local screenshots in ignored `artifacts/browser` were inspected for homepage, inbox, staff reply, mobile inventory and failure states. They contain synthetic data only.

## Remaining Limits

No public source repository, hosted application, real payment/message integration, final TDD export or final ZIP. No Windows/Linux fresh-machine reproduction, comprehensive screen-reader audit, weak-network benchmark, user study or measured business KPI. Local auth setup was successfully rerun after restoring the missing launcher with the locked dependency install. Staff explicitly trigger AI on a saved enquiry; no background queue or automatic email/WhatsApp intake is implemented.

## Final AI Browser Check

`npm run test:browser-ai` passed against the final local production build: the real local model classified the supplied wedding enquiry, saved the extracted February 2027 text and reply draft, and left sending disabled until staff approval. Desktop and mobile screenshots were inspected. The browser test also exposed a saved-textarea label problem; explicit accessible labels now keep the guest-message and reply controls stable after loading saved text. No outside message was sent.
