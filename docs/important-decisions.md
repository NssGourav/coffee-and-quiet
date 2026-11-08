# Important Decisions Explained Simply

## What We Are Building
A resort website where a guest can book a stay and staff can manage prices, website room allowances and enquiries. We are completing the assessment core, using synthetic data.

## Why Every Night Must Be Checked
A 14–16 November stay occupies the nights of 14 and 15 November. Checkout day does not count. Having a room on only one night is not enough. The database locks all the requested nights and either reserves the entire stay or none of it.

## Why Two Guests Cannot Take the Last Room
Both requests must pass through the same database locks. One finishes first; the other then sees the updated stock. We test this with several simultaneous requests, rather than relying on a disabled button.

## Website Allotment Is Only Our Sales Allowance
The resort may keep rooms for other booking channels. Our website sells only the allowance staff set for each room type and night. We do not replace or synchronise the resort's main reservation system.

## A Temporary Hold Protects Checkout
A guest gets a ten-minute hold, an explicitly labelled demo assumption. Successful simulated payment confirms that hold. Expired or failed holds release availability. Duplicate payment requests cannot create duplicate reservations.

## AI Runs Locally and Costs No API Credits
Ollama runs an open model on this computer. The application calls only its loopback address. The model download needs internet; processing guest enquiries does not require a cloud AI service. Model files are ignored by Git and excluded from delivery documents.

## AI Suggests; The Application Routes
The model classifies the message and extracts exact phrases for dates, guests and budget. The application validates the response and applies an explicit category-to-team mapping: room to Reservations, wedding/offsite to Event sales, complaint to GM, uncertain to GM review. These are team queues, not invented individual employees.

## Why We Preserve Missing Dates
“February 2027” does not tell us which days. “January” does not tell us the year. The app keeps those phrases exactly as written and asks for clarification. It must never silently choose dates.

## Why Saved Messages Come Before AI
The enquiry is saved first. If the model is slow, unavailable or wrong, staff still have the original message. A version number prevents an older AI result overwriting a staff correction. Staff can retry or write a reply manually.

## Complaints Stay Visible
The guest or staff can flag a complaint explicitly. Once flagged, a later model response cannot remove the alert. AI-detected complaints also alert the GM. This is an in-app alert, not an actual WhatsApp notification.

## Why AI Does Not Invent Quotes
AI has no booking or payment tools. Drafting receives the validated category rather than instructions from the original message. Initial drafts request missing information. Accommodation prices must come from the existing daily rate calculation, including taxes. Event packages have no supplied price list, so staff must clarify requirements instead of inventing an event price.

## Human Approval Comes Before Sending
Staff read and can edit a draft, then explicitly approve a simulated send. The saved record includes the approved text and who acted. No real email or WhatsApp is sent. A sent enquiry is read-only to preserve that record.

## Sign-in and Permissions Are Enforced Behind the Screen
A guest cannot gain staff access by guessing a URL. Both server routes and database functions check identity and permissions. Demo accounts contain synthetic data only. There is no online passport collection.

## What Is An Assumption
The fictional brand, room split, capacities, sample rates, ten-minute holds and team routing are implementation choices, not facts supplied by the client. See assumptions.md for the detailed list. Business improvements are targets; we have not measured real conversion or revenue.

## What I Should Explain In An Interview
Walk through a two-night booking, show how the second night can block it, explain competing last-room requests, then show the wedding enquiry and correct an AI mistake. Explain the boundary between AI suggestions, application rules and staff approval in your own words.

## What We Have Actually Verified
See evidence.md for dated checks. Planned tests are not passed tests. Local success is not proof of deployment, a production security audit or achieved business results.

## Staff Quotes Use The Rate Table
Staff can enter guest-confirmed dates, room type and guest counts in the enquiry screen. The app calculates a nightly breakdown and total with taxes. Staff can append this result to the draft. The result includes when it was checked and clearly says it is not a reservation; availability and rates are checked again at booking. The model never receives authority to calculate or change that quote.

## Why We Tested More Than One Local Model
The smallest downloaded model made errors on the actual sample enquiries. We kept the validation checks and evaluated a larger free local model. This is a quality-versus-memory trade-off: it needs a larger download and more memory, but must earn its place through observed results. Passing a small synthetic evaluation does not mean every future enquiry will be correct.

## Original Message and Corrections Are Separate
The first submitted message is preserved separately. Staff can correct the working enquiry without rewriting what the guest originally said. The activity log records actions, actors and prior revisions. A version conflict means someone changed the enquiry while another action was in progress; reload and review before continuing.
