# Accommodation GST implementation boundary

Checked on **4 November 2026**. The prototype sells only room accommodation, with synthetic tax-exclusive tariffs. It displays combined GST of **5% for a unit/night up to and including ₹7,500**, and **18% above ₹7,500**. It uses the actual nightly base amount, not the stay average. Unit tests cover exactly ₹7,500, one paise above it and rounding.

Sources reviewed:

1. [Ministry of Finance FAQ, 16 September 2025, questions 6–7](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2167151&lang=2&reg=48) confirms the lower accommodation band and 5% rate.
2. [GST Council 53rd meeting materials](https://gstcouncil.gov.in/node/5061) document the above-₹7,500 accommodation band at 18%; the lower band in those older materials was later amended.
3. [Notification 06/2026–Central Tax (Rate), 27 October 2026](https://gst.karnataka.gov.in/Documents/NOTIFICATIONS/CTR0631126.pdf), published by Karnataka's Commercial Taxes Department, changes input-credit conditions effective 1 November 2026. Its accommodation illustration uses 2.5% central tax for ₹7,000 and 9% central tax for ₹10,000. It does not replace the accommodation rate column.
4. [Corresponding Karnataka notification](https://gst.karnataka.gov.in/Documents/NOTIFICATIONS/SRTN0631126.pdf) and the [official notification register](https://gst.karnataka.gov.in/KStateTaxRate.aspx?lang=EN) were opened during the check.

The implication used here is that the guest-facing combined accommodation bands remain 5% / 18%. **Do not repeat the older blanket “5% without any ITC” wording as current law:** the November 2026 amendment changes the supplier's credit conditions. ITC accounting is outside this prototype.

The code snapshots a rate-rule identifier (`IN-HOTEL-2025-09-22`) and the applied rate on each accepted night. That identifier names the implemented tariff schedule; it is not a claim that no later tax-law amendments exist.

Limitations: no GST invoice issuance, supplier registration verification, place-of-supply engine, tax returns, meal/banquet bundles, input-credit ledger, promotional discount tax handling, or long-stay exemption logic. Amounts are calculated per night in integer paise with rounding of combined GST. A real property's accountant must verify applicability and invoice rounding before any real-money deployment. This is not a legal-compliance certification.
