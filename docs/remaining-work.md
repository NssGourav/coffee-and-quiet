# Remaining work before submission

This is a checkpoint after the first booking milestone, not a claim of completion.

## Required core

- Build the enquiry inbox, web enquiry form and labelled simulated forwarded-email/WhatsApp intake.
- Implement real model classification, extraction with source evidence, structured validation and draft generation. Choose a free/local model path or obtain explicit approval for any paid use. No provider/model/account was selected or funded in this milestone.
- Preserve ambiguous years/dates, reject unsupported extracted values, insert authoritative quotes only for confirmed dates, and handle sold-out dates.
- Deterministic owner configuration, one-action staff rerouting, GM-visible unsorted lane, and complaint alerts that explicit/manual flags cannot lose to a model response.
- Explicit staff draft review and simulated send audit; never auto-send.
- Seed supplied ENQ-4410/4411/4412 plus labelled synthetic complaints, ambiguity, unavailable dates, failures and injection attempts.
- Run live-model evaluations separately from deterministic test stubs; report both honestly.
- Complete successful browser E2E, staff editing, broader mobile viewport, keyboard, focus and screen-reader checks. Initial desktop/mobile and keyboard sign-in error checks passed after the screenshot connection recovered; see `evidence.md` for the exact limits.
- Add deployment-appropriate rate limiting, auth recovery/registration decisions, security headers and secret/role checks. Reverify permissions in the selected deployment environment.

## Delivery work

- Decide the GitHub repository destination and publishing visibility with the user; the current repository is local only. User broadly permitted using GitHub resources; no third-party app code has been copied.
- Choose hosting under the local/free constraint; do not claim a live URL without deploying and testing it.
- Provide a production-compatible migration/provisioning path; the current setup scripts deliberately target local databases only.
- Retest a clean checkout on the intended reviewer platform. Current setup was rerun successfully on this macOS machine; it has not been verified on Windows/Linux.
- Complete the TDD in PDF/Word, with the actual public GitHub URL first and a live URL only if deployed. Include screenshots after visual verification.
- Finalise `deployment.md` with actual deployment details and deliberately created limited-permission synthetic reviewer accounts, not production keys.
- Produce one ZIP, at most 25 MB, with exactly those two documents. User selects the portal problem and submits.

## Scope stop

No optional feature after 7 November or while core quality/buffer is at risk. Promo codes, richer event forms, CSV export, multiple rate plans and bulk editing remain optional. PMS/channel-manager replacement, restaurant booking and loyalty remain out of scope.

Planning targets remain: 5 November booking correctness; 6 November admin/live AI inbox; 7 November permissions/failures/polish; 8 November reproducibility/documentation; 9 November defects and submission buffer. Daily hours are unconfirmed; revise these targets based on actual progress.
