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
