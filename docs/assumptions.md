# Facts, decisions and assumptions

Recorded 4 November 2026, Asia/Kolkata. Deadline: 9 November 2026 at 11:59 pm IST.

## Client facts

The supplied resort is in Chikkamagaluru, Karnataka, on a coffee estate, with **64 rooms and 12 villas (76 keys)**, and lawns for weddings/offsites. The core is room pages with availability and prices, booking with test payment, daily rate/allotment administration and an AI enquiry inbox. Guest and reservations staff are the core roles. Low-confidence enquiries must be visible to the GM; complaints always alert the GM. The website sells an administrator-set allotment, not synchronised OTA stock.

## User decisions and constraints

- Selected the resort brief and authorised local implementation and honest version control.
- Prefers one Next.js/TypeScript application, PostgreSQL and Supabase Auth.
- Current access constraint: **local/free only; ask before paid API use**.
- No employer code, assets, private data or credentials.
- No subagents used. The assessment says work alone; AI assistance does not replace the user's ownership of the work.
- User said “whatever it requires”; this is not a confirmed daily-hours schedule. The planning dates are targets, not a promise of availability or completion.
- The separate originating chat supplied proposed architecture/workflow diagrams. They describe intended scope, not verified implementation.

## Implementation assumptions proposed by the assistant

| Assumption                                                          | Reason / boundary                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Coffee & Quiet is a fictional brand                                 | The brief supplies no brand, logo or property photography.                                             |
| 40 Estate Rooms, 24 Terrace Rooms, 12 Garden Villas                 | A demonstration split preserving the supplied 64 + 12 keys; not a client fact.                         |
| Capacities of 3, 3 and 4 total guests                               | Bounded sample occupancy; adults plus children must fit. No age-tier or extra-bed pricing.             |
| One accommodation unit per booking                                  | Small core with a clear invariant. Multiple-room/group bookings are not implemented.                   |
| Stays of 1–14 nights, check-in within one year                      | Bounds inputs and transaction work. Seeds initially open 121 nights. Missing dates are unavailable.    |
| Ten-minute holds                                                    | Proposed checkout window, never a supplied policy. Expiry uses the database clock.                     |
| Room-only rate plan                                            | Avoids inventing meal/package tax treatment. No real refund or cancellation promise.                   |
| Base nightly rates ₹7,000 / ₹9,500 / ₹14,500                        | Synthetic tariffs. Friday and Saturday add ₹1,000.                                                     |
| Initial website allotments 8 / 5 / 3                                | Independent synthetic website stock, bounded by physical keys. No channel-manager synchronisation.     |
| Check-in inclusive; checkout exclusive                              | A 14–16 November stay occupies 14 and 15 only.                                                         |
| Integer paise, tax rounded per nightly unit                         | Avoids floating-point drift; full statutory invoicing and input-credit accounting are not implemented. |
| Generated reviewer accounts, no self-service registration UI yet    | Real Supabase password authentication with only synthetic demo accounts.                               |
| GM is a staff account with `is_gm`                                  | Shared staff access to the implemented inbox, including complaint/unsorted lanes; no GM-only boundary.                                |
| Rate version counter and audit log plus immutable booking snapshots | One rate plan does not need a separate rate-plan/rate-version entity yet.                              |
| Locally hosted, licensed reference photos                           | They show other locations and are explicitly illustrative. No fake reviews or awards.                  |

The UI must not collect passports online. No real guest data has been seeded. Keep this prototype synthetic until deployment, privacy and operational controls are separately reviewed.

## Business arithmetic, not achieved results

Using unrounded source inputs: `76 × 365 × 0.62 = 17,198.8` occupied nights. OTA nights are `× 0.68 = 11,695.184`. Moving 15% of those nights direct at ₹9,500 and 20% commission saves **₹33,33,127.44/year**. Adding the scenario's ₹72 lakh event contribution gives **₹1,05,33,127.44/year**, approximately **₹105.3313 lakh**.

Moving 15% of OTA nights adds `68% × 15% = 10.2` percentage points to direct share, taking 12% to **22.2%** at unchanged occupancy. That scenario differs from the stated **20%** target. No business KPI result, performance benchmark or user-study result has been measured for the prototype. The fictional ₹8 lakh and seven-week engagement are not the assessment's actual funding or development window.

## 8 November enquiry decisions

- Team owners are Reservations, Event sales and GM, assigned by explicit application rules; named employee assignment is not implemented.
- AI is staff-triggered on saved web enquiries. Simulated forwarded email/WhatsApp intake is optional and deferred.
- Guest enquiries require a synthetic account. Creation is limited to 20 per account per hour in the database; production abuse controls are outside this local demonstration.
- An uncalibrated 0.8 confidence threshold is one conservative routing check, used with structural/source validation and a suspicious-instruction guard. It is not an accuracy guarantee.
- Dates, guest counts and budgets remain original text. Staff must confirm full dates before using the accommodation quote calculator. Events have no authoritative package tariff in the supplied brief.
- An explicit complaint alert is sticky. A sent enquiry is read-only. Model failures retain the original and allow staff to reply manually.
- Model calls use only the local loopback service and a fixed model name. No paid API, cloud inference or automated outbound message is used.
