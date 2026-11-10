# Navigation performance — 10 November 2026

Live code revision: `2260ccd`. Production deployment: `dpl_DfViBcCDX5V73LqAvvmwHMUqGM8G`.

## Diagnosis and changes

The original server responses reported `bom1::iad1`: requests entered in Mumbai, but the application functions ran in Washington, DC while Supabase was in Mumbai. Each database transaction made several serial network round trips. `vercel.json` now sets one function region, `bom1`, alongside the database. The deployed function inspection and response headers confirm `bom1` execution.

Identity verification and profile queries now use React `cache` to deduplicate work **within one server render**. `getUser()` verification, database role checks, transaction-local identity, row-level security and private/no-store responses remain in place. There is no shared user cache and no caching of room availability or booking data.

The global page-replacement loading screen was removed. Links retain the current page during a transition and show a thin progress bar after 180 ms if necessary. The indicator respects reduced-motion settings. On the home page, a targeted Suspense boundary lets the hero and search form render before availability; room placeholders alone are replaced by the results. Inventory is still fetched fresh.

## Hosted measurements

Three sequential full HTML GET requests per route, from the same computer to the canonical production URL, before and after deployment. Authenticated samples use existing guest/staff reviewer accounts. Below are median times to finish receiving HTML, **not** browser paint times or an SLA. Image/JavaScript transfers, connection conditions and cold starts can change the experience. The runs are a small diagnostic sample, not a load test.

| Route / identity | Before | After |
| --- | ---: | ---: |
| anonymous sign in — `/sign-in` | 399 ms | 383 ms |
| anonymous enquiry — `/enquire` | 302 ms | 312 ms |
| anonymous home — `/` | 1,498 ms | 118 ms |
| guest — `/enquire` | 2,251 ms | 181 ms |
| guest — `/bookings` | 3,840 ms | 192 ms |
| staff — `/staff/inventory` | 4,079 ms | 159 ms |
| staff — `/staff/enquiries` | 3,993 ms | 141 ms |

Browser spot checks measured 584 ms from click to the bookings heading, 453 ms to enquiry, 550 ms to signup, and 205 ms back to sign-in after sign-out. The previous page remained visible during pending navigation. One sign-in navigation encountered a transient RSC fetch failure and recovered through Next.js's full-page navigation fallback; a repeated sign-in/sign-out/navigation sequence succeeded. These measurements do not establish that every navigation will be instant.

## Validation

- All 19 unit tests passed with `node --import tsx --test tests/unit/*.test.ts`.
- `npm run typecheck` and `npm run build` passed; Vercel's production build also passed.
- Nine access/error checks passed locally and on the live deployment: anonymous booking redirect; own booking access; other guest's booking hidden; anonymous API denied; guest staff access denied; staff inventory access; guest isolation after a staff request; invalid search error state; unexpected-origin rejection.
- Browser checks covered guest login, bookings, enquiry, sign-out, sign-in and signup; a narrow viewport had no page-level horizontal overflow on the bookings screen.
- The original `submission-2026-11-09` tag and submitted ZIP were preserved. This is a post-submission performance improvement.
