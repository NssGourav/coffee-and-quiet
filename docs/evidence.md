# UI verification — 9 November 2026

- Later spacing pass: reduced general page/header spacing and staff navigation, headings, filters and inventory-row gaps. Moved inventory guidance into native keyboard-accessible details/summary help. Inventory has no document overflow at 360, 768 and 1280 CSS pixels; mobile fields and save buttons retain 46px height. Inbox and bookings were checked at 360px. A clipped, absolutely positioned table label caused document overflow; positioning the table wrapper now contains it while preserving horizontal scrolling inside the table. Keyboard help expansion/collapse and the final production build passed. Screenshot: `artifacts/browser/staff-inventory-compact.jpg`. No rates, allotments or business rules were changed in this pass.
- Added a lazy-loaded Three.js sign-in landscape with a separate, immediately rendered form, illustrated fallback, reduced-motion support, pause control, capped rendering resolution and resource cleanup. No model/texture downloads or paid services are involved.
- Removed the assessment banner and presentation labels from the interface. Payment simulation disclosure and the factual website/photography explanation remain. The redundant confirmation badge was removed; the main heading states the confirmed outcome. Desktop top padding decreased from 65px to 16px.
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

# Submission Verification - 9 November 2026

This update supersedes earlier publication and verification limits where explicitly stated.

- Public source: https://github.com/NssGourav/coffee-and-quiet, default branch `main`. Original milestone history was preserved. The final UI/reviewer-setup revision was anonymously cloned from GitHub at `5990250`.
- The separate clean clone used `npm ci`, a newly initialized native PostgreSQL cluster, a separately initialized Supabase Auth stack and freshly generated reviewer accounts. No working `.env.local` or `.local` data was copied. Temporary port/project-name changes isolated it from the working copy. This is a clean-checkout check on the development Mac, with existing Docker layers and the existing local Ollama service, not a fresh-machine or cross-platform result.
- Fresh-clone results: 12 unit tests passed, 22 PostgreSQL tests passed, production compilation and TypeScript checks passed, all seven authenticated booking HTTP groups passed, and both enquiry HTTP groups passed.
- Seven real Qwen3 4B evaluation cases passed again. Exact outputs are saved in `docs/ai-evaluation-final.json`. This is the supplied sample set plus four edge cases, not a general accuracy benchmark.
- The fresh production build was inspected through the browser: home, Three.js sign-in, newly generated reservations login, inventory and enquiry editor. The supplied wedding example was processed through the actual AI button and saved as Wedding / Event sales, with `Feb 2027` and `250 guests` copied from the original. Sending remained disabled without approval.
- Fresh staff inventory at 390px had document width equal to viewport width. Desktop screenshots and the mobile inventory screenshot were inspected. This does not replace a full accessibility or weak-network audit.
- The final PDF uses these fresh browser captures. It records architecture, booking/AI flows, actual access boundaries, assumptions, cuts and deployment limitations.
- Publication screening found no known local credential values or common token/private-key patterns in the checked working source and 102 historical Git blobs. No sensitive file path was tracked. `npm audit --omit=dev --audit-level=moderate` reported zero vulnerabilities. These focused checks are not a security certification.

Optional hosting was authorised, and Vercel login was verified. Hosted Supabase and model access are still being established; no working public application URL is claimed at this checkpoint. No paid APIs or real guest data were used.

# Hosted Verification — 9 November 2026

This update supersedes the preceding hosting-pending checkpoint. Live URL: https://coffee-and-quiet.vercel.app. Deployment uses Vercel Hobby, a dedicated free Supabase project and real Gemini 3.5 Flash-Lite. The user confirmed the model project is free tier with billing disabled. No paid API use or real guest data was introduced.

- Hosted migrations 001–005 and synthetic seeds completed. A direct runtime check confirmed `resort_app` is neither superuser nor bypass-RLS. Certificate-verified TLS, database SSL enforcement, disabled public signup and private-schema exclusion from the Data API were verified. Owner/service-role credentials are absent from Vercel's runtime configuration.
- The additional hosted transport test passed; the complete unit suite now has 13 passing tests. Type checking, a local production build using hosted configuration, and Vercel production compilation passed. Business migrations and transactional rules were unchanged from the 22-test PostgreSQL verification above.
- Anonymous HTTPS access to the canonical homepage returned 200 without Vercel login. Real Supabase sign-in worked for both guest accounts and reservations staff. Live HTTP checks passed: anonymous hold rejected, cross-origin mutation rejected, hold retry returned the same booking, another guest could not read it, simulated success and duplicate payment event were handled, saved status was confirmed, guest inventory edit rejected, staff inventory save accepted, seeded enquiries available.
- In the live browser, reservations sign-in, inventory and inbox loaded. The actual AI button classified the supplied wedding enquiry as Wedding / Event sales, extracted `Feb 2027` and `250 guests`, and saved the real generated draft. Sending was disabled until the review checkbox was selected. Approve & simulate send saved the reply and made the record read-only; the activity log contained both AI and send entries. No external message was sent.
- Seven real hosted evaluation cases initially returned six passes and one provider failure. Retrying that single unclear greeting passed. Exact results are in `ai-evaluation-hosted.json`; this is not perfect first-run reliability or a general accuracy claim. The earlier Gemini 2.5 Flash-Lite probe was unavailable to this new project, so the adapter uses the currently available 3.5 Flash-Lite model.
- Live home, AI draft and saved-reply screenshots were inspected and saved under ignored `artifacts/submission`. The TDD combines current hosted evidence with the already-verified local sign-in/mobile captures.
- Free quotas, cold starts and project inactivity can interrupt service. The local reviewer path remains documented. No cross-platform certification, comprehensive accessibility/security audit or achieved business KPI is claimed.

# Final Search UI Update — 9 November 2026

The previously uncommitted search changes are now included in source revision `9a8ff08`: client-side check-in state, live checkout guidance, calendar bounds, compact responsive guidance and clearer availability/guest-count messages. A guard rejects far-future check-in dates before calculating checkout guidance.

- All 14 unit tests passed, including direct schema checks that bypass browser validation: valid 1/14-night stays, invalid reversed/same-day/15-night stays, malformed dates and a far-future boundary.
- Type checking and an isolated production build passed with hosted configuration. No database migration or AI behavior changed.
- Browser verification against that build passed: keyboard check-in changes update guidance and limits; a 31 December–2 January search returns room cards; same-day checkout is blocked; a group of four adults plus three children shows the new empty-state message.
- At 390px, the document width equals the viewport and the guidance appears above the full-width search button. Desktop/mobile captures were inspected and included in the updated TDD. These focused checks do not replace a complete accessibility audit.

Commit identity correction: the user requested Gourav <gourav341111@gmail.com> for all commits. Author/committer metadata is corrected while preserving each commit’s content, message, dates and order. Older commit IDs cited in dated evidence refer to the revisions before this metadata correction.

The final deployed search UI was verified at the canonical live URL: keyboard check-in changes update checkout bounds and guidance. The user then requested full demo logins at the start of README.md. Those limited synthetic account credentials are intentionally public; database passwords, Auth administration keys, hosting tokens and the model key remain private.


## 9 November - verified signup and booking email extension

- Added strict email/password signup, six-digit verification and guest-only profile creation. No client role/GM input is accepted. Safe return paths reject external destinations.
- Added migration 006: one durable email job per confirmed booking, atomic claims, immutable verified recipient, 60-second retry cooldown, three-attempt cap and per-account hourly cap. Ambiguous SMTP acceptance is held for reconciliation, not automatically retried.
- 19 unit checks, 26 PostgreSQL checks and TypeScript passed. The production build passed. New checks cover role injection, email escaping/totals, ownership, duplicate jobs/claims, stale attempt completion, cooldown and attempt limits.
- Full local HTTP journey passed against real Supabase Auth, PostgreSQL and Mailpit: invalid role/origin rejection, unverified sign-in refusal, invalid code rejection, successful code verification, guest-only role, forbidden staff action, booking confirmation, captured SMTP email and no duplicate after payment/email retries. Test-created users/bookings were removed; captured synthetic mail remains in the local inbox.
- Desktop and 390px mobile signup were visually checked; no horizontal overflow. The form uses the existing Three.js scene and static fallback.
- Gmail SMTP authentication and STARTTLS were verified. Credentials were saved privately; only environment-variable names enter the repository. Hosted migration 006 was applied without changing existing bookings.
- Local verification initially caught a template bind-mount problem from the temporary checkout outside Colima's shared home folder. Running Auth from a shared home folder corrected it. The original local PostgreSQL image was retained after a newer downloaded image reported an I/O error. This is environment evidence, not a fresh-machine pass.
- Hosted verification passed on the canonical URL: signup accepted by Supabase/Gmail, invalid role/origin rejected, unverified sign-in denied. The temporary signup test account was removed after the check. A separate provisioned test guest with an owner-controlled Gmail alias completed booking/payment; Gmail accepted the actual confirmation and the outbox recorded sent with one attempt. Replaying payment and email requests retained one attempt. This verifies SMTP acceptance, not inbox placement.
- The hosted signup page and the actual captured HTML email were visually checked. The email fits a 390px viewport and includes no unsupported meal/amenity promises.

## Final presentation update — 9 November 2026

- Added a direct Sign up button beside Sign in; verified it opens guest registration on desktop and at a 390px viewport.
- Removed assessment/demo labels from application copy and verification/booking templates. Payment notices still state that no money is charged; staff reply approval is labelled Approve & save reply. Reviewer credentials and integration limitations remain in submission documentation.
- Reused the existing leaf mark for SVG, multi-size browser favicon and Apple touch icon.
- All 19 unit checks and the production build passed after the copy update; the final icon build also passed. Updated verification email content was applied to the existing Supabase project.
