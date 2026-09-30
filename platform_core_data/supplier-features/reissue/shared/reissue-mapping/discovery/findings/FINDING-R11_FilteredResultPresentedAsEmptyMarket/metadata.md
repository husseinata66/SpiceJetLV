# FINDING-R11 — A filtered-out result is presented to the agent as an empty market

- **Finding ID:** FINDING-R11
- **Title:** The new negative-base-fare filter suppresses **every** offer on some routes, and the screen reports the result as *"the market is just empty on those exact criteria"* — which is false
- **Category:** Defect candidate (Misleading error presentation) · plus an open design question on the filter predicate
- **Severity (proposed):** **Medium**, reduced from High once the cause was confirmed as an intentional filter rather than lost supplier data. What remains a defect is the presentation: a filtered result is reported to the agent as an absent market, and the remedy the screen offers fails too
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** hop B (core service → Sabre), surfacing on Admin → Reissue → step 1 *Choose Replacement Flights*
- **Found by:** run-007 scenario 8, booking `NDCEG-BR-F260929u1ptMk` (GDS PNR `QZTJRV`), 2026-09-29

## Observed

Round-trip booking, six passengers, held itinerary:

| Journey | Flights |
|---|---|
| 1 | CAI→JED 17 Dec 2026, Saudia 300 |
| 2 | JED→RUH 06 Jan 2027 Saudia 1022, **then** RUH→CAI Saudia 417 |

Searching a replacement of **CAI→RUH 20 Dec 2026 / RUH→CAI 10 Jan 2027**:

```
POST /api/v1/reissue/reshop
  422  { "errorCode": "NO_EXCHANGE_OPTIONS_AVAILABLE",
         "errorMessage": "No alternative flights are available for the requested change.
                          Try a different date, route or cabin." }
```

The same criteria sent straight to Sabre **in the same minute** return **50 offers**, cheapest 9,150.80 EGP.

The screen renders it as:

> **Nothing on these routes and dates**
> The search ran fine — the market is just empty on those exact criteria.
> **MOST LIKELY TO WORK** · Shift every flight one day later

The market is not empty. And the remedy it suggests — shifting both legs one day — **also returns 422**.


## CAUSE — CONFIRMED. A new negative-value filter, deployed mid-session.

**Confirmed by the user, 2026-09-29:** a new implementation discards offers carrying negative values
for base fare, tax and totals. That is the whole explanation, and it fits every observation:

| Search | Sabre offers | with negative `baseFare` | Core returned |
|---|---|---|---|
| CAI→RUH · 13:18, **before** the change | 50 | 48 | **50** |
| CAI→RUH · 13:38, **after** | 50 | **50 of 50** | **422, zero** |
| CAI→JED | 50 | 0 | **50** |
| CAI→DMM | 50 | 0 | **50** |
| CAI→KWI | — | — | **50** |
| CAI→MED · CAI→DXB · CAI→JED (Feb/Mar) | 50 each | 0 | not called |

Where every offer carries a negative base fare the response is empty and the service reports
`NO_EXCHANGE_OPTIONS_AVAILABLE`; where none do, everything passes through. **The deploy window is
2026-09-29 between 13:18:43Z and 13:35:28Z**, which is exactly why the identical call succeeded and
then stopped — the state change that had no other explanation.

**The earlier hypothesis in this finding was wrong.** RUH being a connection point inside the held
ticket is a coincidence of this booking: RUH is simply the only tested destination where every
replacement is cheaper than what is held, so every offer has a negative fare difference. That
paragraph is retained below only as a record of the reasoning, and must not be read as a cause.

### The open design question — which field should the filter test?

Every suppressed offer on this booking was **sellable at a positive price**:

```
baseFare  -5,186.00  +  totalTax  1,318.80  =  subtotal  -3,867.20
subtotal  -3,867.20  +  penalty  13,018.00  =  grandTotal   9,150.80   <- what the customer pays
```

Across all 50: **`grandTotal` positive on every one** (9,150.80 – 14,630.80 EGP), `totalTax` never
negative, `totalFee` never negative. The base fare is negative only because the new flights are
cheaper, and the change penalty more than covers the difference. **No offer here refunds anything**,
yet all 50 were dropped — fifty exchanges at roughly 9,150 EGP each replaced by a "no options" screen.

Of the three values named in the rule — base fare, tax, totals — **only base fare is ever negative
here, and it alone decides the outcome.** If the intent is to suppress offers that *refund* the
customer, the predicate belongs on the payable total, not the fare component, and this is a defect.
If the intent really is "any negative base fare", it is working as designed.

**Not raised as a defect pending that decision.** Flagged because the revenue impact is large and the
distinction is invisible from outside.

### Not established: whether the filter is per offer or per response

Every case observed is all-or-nothing — 0 % or 100 % of offers negative — so it could not be shown
that a mixed response yields a partial result rather than a blanket 422. Five further RUH attempts
all returned 422, and no criteria tried produce a mix. **Whether a customer with one viable option
among fifty sees that option or a blank page is therefore unknown**, and worth a targeted test.

## How it was narrowed, before the cause was known

> Kept because the measurements are sound and still useful. The conclusion drawn at the time —
> "it is RUH specifically" — is true but incidental: RUH is the only destination tested where every
> replacement is cheaper, so every offer trips the filter.

Each row is Sabre and core called back to back, same booking, same dates:

| Criteria | Meaning | Sabre | Core |
|---|---|---|---|
| CAI→JED / JED→CAI | the booked route, new dates | 50 | **50** ✓ |
| CAI→DMM / DMM→CAI | a *different* changed destination | 42 | **42** ✓ |
| CAI→KWI / KWI→CAI | another changed destination | — | **50** ✓ |
| **CAI→RUH / RUH→CAI** | **the failing one** | **50** | **0 · 422** ✗ |

And RUH fails from **either** journey on its own:

| Probe | Core |
|---|---|
| J1 CAI→**RUH** + J2 JED→CAI (RUH outbound only) | **422** |
| J1 CAI→JED + J2 **RUH**→CAI (RUH return only) | **422** |

So a route change is handled correctly in general. Two unrelated new destinations pass straight through. Only RUH is refused.

## SUPERSEDED — the structural hypothesis, kept as a record of the reasoning

> The section below was written before the cause was confirmed. It is wrong. Retained only to show
> what was considered and why it looked plausible.

**RUH is the only airport in these tests that appears as a *connection point inside the held ticket*.** Journey 2 is JED→RUH→CAI, so RUH is a transit stop on a coupon the passenger already holds. JED appears too, but as a journey *endpoint*, and it works. DMM and KWI do not appear in the ticket at all, and they work.

That is the only structural difference found, and it is consistent with every observation but one (below). It is **not proven** — it cannot be, from outside. Core makes its own Sabre call; that call is not visible from the client, so whether core asks Sabre something different, or asks correctly and discards the answer, cannot be determined here. **`logs/detail.log` would very likely settle it in one read.** It has never been accessible in this run, and this is the second finding it blocks (see FINDING-R07).

## SUPERSEDED — the fact that did not fit (now explained by the deploy window)

**At 13:18:43Z the same core call, same criteria, same booking, returned HTTP 200 with 50 offers** — captured, kept, and verified to contain genuine CAI→RUH and RUH→CAI itineraries:

```
offer[0]  J1: CAI->RUH  SV310   2026-12-20
          J2: RUH->JED  SV1039  2027-01-10  |  JED->CAI SV389 2027-01-10
```

Seventeen minutes later the identical call began returning 422, and has done so **nine consecutive times** across fourteen minutes. So RUH is not statically rejected — something is state-dependent, and the connection-point hypothesis does not by itself explain a behaviour that changed mid-session. A cache was considered and does not fit either: a *different* date pair (21 Dec / 11 Jan), never searched from the UI, fails the same way.

The two Sabre responses either side of the change were compared and are **structurally identical** — same carrier, same offer type, same three fare groups per offer, same airports, differing only in which flight combinations came back, which Sabre varies per call by design. Nothing there suggests a payload core would newly choke on.

**Cause: not established.**

## What has been ruled out

| Hypothesis | Test | Result |
|---|---|---|
| Transient blip | Nine attempts over 14 minutes | Fails every time |
| Cabin class parameter | With and without `cabinClass: 1` | Fails both ways |
| Stale `responseId` | Fresh eligibility immediately before each call | Still fails |
| Core unhealthy for this booking | CAI→JED, CAI→DMM, CAI→KWI same window | All return offers |
| The dates are the problem | Both legs shifted one day | Still fails |
| Supplier genuinely has nothing | Sabre direct, same criteria, same minute | 50 offers |
| Route change unsupported | CAI→DMM and CAI→KWI are route changes too | Both fine |
| Malformed supplier payload | Diffed the two Sabre responses | Structurally identical |

## Two defects, not one

**1 · Core drops offers the supplier is returning.** Fifty sellable exchanges are unreachable. This is the revenue-affecting half.

**2 · The screen presents a backend failure as a fact about the world.** *"The search ran fine — the market is just empty on those exact criteria"* is the single reading the evidence excludes: the search did not run fine, and the market is not empty. A 422 from core is not knowledge about airline inventory, and the interface should not translate it into a claim of one. The screen then recommends a remedy that also fails, so an agent who follows it twice concludes the route is dead.

This second half stands on its own regardless of what causes the first. Even once core is fixed, a 422 should never be rendered as an empty market — the screen should say the search could not be completed, and give the agent a reference to quote.

## Steps to reproduce

1. Admin `http://192.168.1.60`, open booking `NDCEG-BR-F260929u1ptMk`, take the lock, click **Reissue** → **Continue to reissue**.
2. Set journey 1 to **CAI→RUH 20 Dec 2026** and journey 2 to **RUH→CAI 10 Jan 2027**. Search.
3. The screen reports *"Nothing on these routes and dates."* `POST …/v2/reissue/{ref}/search` returns 200 with `{"offers":{}}` and every other field `null`.
4. Call Sabre CERT `POST /v1/offers/flightReshop` directly with the same two journeys and the six ticket numbers — **50 offers**.
5. Change only the destination to **DMM** or **KWI** and repeat step 2 — offers appear normally.

## Expected

Either the fifty offers Sabre is returning reach the screen, or — if core has a legitimate reason to reject them — the agent is told what that reason is and given something to quote to support. A destination that is a connection point on the held ticket is an ordinary thing for a customer to ask for.

## Actual

422, zero offers, and a screen stating as fact that the airline has nothing on a route it is actively selling.

## Consequence for this scenario

Scenario 8 exists to test how **markup, discount and service charge behave through an exchange**. That remains **untested** — the exchange cannot be reached on these criteria. What was verified before the blockage:

- **Supplier → core is clean.** 48 of 48 aligned offers: the per-passenger breakdown sums exactly to Sabre's subtotal, tax and fee.
- **The rule engine is correct on the original ticket.** Total Sales 412,873.20 − Total Net 412,423.20 = **450.00 AED**, being markup 600 (100 × 6) − discount 300 (50 × 6) + service charge 150 (25 × 6), applied to base fare.
- **All six ticket numbers are present** at both Sabre and the application — no FINDING-R06 occurrence on this booking.
- **FINDING-R08 cannot arise here** — Sabre returns exactly one fare group per passenger type.

The scenario can be completed on **CAI→JED with changed dates**, which core serves reliably.

## Related

- **FINDING-R07** — the opaque 409 on booking. Its *Related* section recorded this same `NO_EXCHANGE_OPTIONS_AVAILABLE` as an unreproducible one-off. It now reproduces on demand, with a paired supplier call proving the offers exist. The two are not yet shown to share a cause, but both are the same chain failing without explanation, and both are blocked on the same missing log.

## Evidence

- `discovery/evidence/s8-core-refuses-RUH-reproduction.json` — full timeline, paired matrix, ruled-out list
- `discovery/evidence/s8-core-reshop-QZTJRV.json` — the 13:18 success, 50 offers, genuine CAI→RUH itineraries
- `discovery/evidence/s8-sabre-reshop-QZTJRV.json` — paired supplier capture, 13:18
- `discovery/evidence/s8-sabre-reshop-recheck.json` — supplier at 13:38, 50 offers, while core refused
- `discovery/evidence/s8-core-reshop-recheck-nocabinClass.json` / `-cabinClass1.json` — the 422 bodies
- `discovery/evidence/s8-admin-search-QZTJRV.json` — the Admin response: `{"offers":{}}`, everything else null
- `discovery/evidence/s8-admin-eligibility.json` — `offerReissuable: true`, all six passengers reissuable
