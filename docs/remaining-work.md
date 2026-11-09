# Remaining Work and Delivery Boundaries

## Current Core
Booking and test payment, rate/allotment administration, sign-in and server-enforced roles, enquiry submission, staff inbox, real AI classification/extraction/drafting, correction, GM alerts, rate-table quote calculation and approved simulated send are implemented locally and in the hosted review app. Consult evidence.md for observed results rather than inferring verification from this feature list.

## Final Assessment Package - 9 November 2026
- Public source is published at https://github.com/NssGourav/coffee-and-quiet with the original commit history.
- The TDD is exported and visually checked: `output/pdf/Coffee-and-Quiet-TDD.pdf`. It includes repository/live links, architecture/flow diagrams, desktop/mobile screenshots, assumptions, test results and limits.
- Reviewer setup was verified from a separate public clone on this Mac with fresh application/Auth data and generated synthetic accounts. Windows/Linux and a fresh machine remain unverified.
- The final submission ZIP was checked to contain exactly the TDD PDF and `deployment.md`, with valid checksums and total size below 25 MB. Source, model weights and dependencies are not included in the ZIP.
- The user owns portal choices and final upload. Deadline: 9 November 2026, 11:59 pm IST. No portal submission has been performed.

## Hosted Review App
https://coffee-and-quiet.vercel.app is live on Vercel Hobby with one free Supabase project and Gemini 3.5 Flash-Lite on a user-confirmed free-tier project with billing disabled. Booking, permissions, staff inventory and AI through approved simulated send were verified against the live URL. Shared synthetic reviewer logins are intentionally public at the top of README.md and in deployment.md. Free quota and inactivity limits apply. No paid API use is authorised.

## Optional Depth Deferred
Promo codes, richer rate plans, daily exports, email/WhatsApp intake simulation, a structured event form and bulk inventory editing remain optional. Staff-triggered AI on a saved web enquiry is the implemented core. No channel-manager replacement, loyalty or restaurant booking.

## Limits Before Public Production Use
No real payments or outbound messages. Production abuse prevention, account registration/recovery, privacy operations, operational monitoring and comprehensive accessibility/network-performance testing require separate work. No achieved business KPI or general AI accuracy claim is supported by synthetic samples.
