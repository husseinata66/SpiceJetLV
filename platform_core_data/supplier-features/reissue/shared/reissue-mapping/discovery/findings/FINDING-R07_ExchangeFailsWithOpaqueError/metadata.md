# FINDING-R07 — An exchange fails with no diagnosable reason

- **Finding ID:** FINDING-R07
- **Title:** `POST /v2/reissue/{ref}/book` returns 409 with *"the request could not be completed"* — no error code, no cause, and the agent is left with a Failed order and no next step
- **Category:** Defect candidate (Error handling / Diagnosability)
- **Severity (proposed):** **Medium.** Nothing was charged and the supplier was untouched, so the failure is *safe*. But an agent who has just tried to spend 45,326.80 EGP on a customer's behalf is told only that "the request could not be completed", with no reason, no reference to quote, and no indication whether retrying would help
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Portal → Reissue → step 3 Confirmation; API `POST /v2/reissue/{bookingRef}/book`
- **Found by:** run-007 scenario 3b, booking `NDCEG-BR-F260928CMve29` (GDS PNR `PRUOOC`), 2026-09-28

## Observed

A human clicked **Confirm & charge EGP 45,326.80**. The book call returned **409 Conflict**:

```json
{ "message": "the request could not be completed",
  "orderId": "AGN9780NDCNDCORD26092854OOW5",
  "bookingRef": "NDCEG-BR-F260928oCvhaD" }
```

The Confirmation screen shows **Status: Failed**, GDS PNR `-`, Airline PNR `-`, ticket number `—`,
and *"This order was not reissued. The original tickets remain as they were."*

### What went right — worth stating plainly

| Check | Result |
|---|---|
| Money taken | **None.** Wallet 8,556,080.400 before and after |
| Supplier state | **Untouched.** All 6 tickets still `Issued/TE`, no `Exchanged` coupons, **no EMDs issued** |
| Flights at Sabre | Still SV300 16 Dec + SV1096 17 Dec — the original |
| Supplier total | Still 28,542.80 |
| App status vs reality | **Agree** — the app says Failed, and nothing was exchanged |

The exchange failed **atomically**. There is no partial state to reconcile, which is the most
important property and it held.

### What went wrong

The message carries no diagnosable content. Immediately before the failure the app had confirmed
the fare was still good:

```
GET …/reissue/{ref}/fare-confirmation
  { "oldPrice": 45326.8, "currentPrice": 45326.8, "fareStatus": 2 }
```

So it was **not** a price change and **not** an expired hold. The book request itself was minimal —
`{paymentMethod: Wallet, sendBookingConfirmationEmail: false, passengers: null}`.

## The app can produce a good message — it did so minutes earlier

On the **same booking**, an earlier attempt against a different offer returned a **409 with a clear,
actionable message**:

```json
{ "message": "One or more passengers already have a booking with the same details. Please contact Admin for booking." }
```

That offer was the same flights the passengers already held (the "Lowest fare" option was the
booking's own SV-300 / SV-1096), so a duplicate guard fired correctly and said so.

**The same status code therefore carries both a precise business reason and a blank one.** A caller
cannot distinguish them programmatically, and an agent cannot act on the second.

## Reproduced on a second booking

`NDCEG-BR-F260928v8EC7m` (GDS PNR `PUAUTI`), 2026-09-28 16:26, a **pure date change** on the
original route (CAI→JED 08 Jan 2027, JED→RUH 12 Jan 2027, SV 386 + SV 1018, 48,623.00 EGP).
Identical outcome: 409, *"the request could not be completed"*, Status **Failed**, new failed order
`NDCEG-BR-F260928QhBHd7`.

Safety properties held again — **wallet unchanged, supplier untouched**: 6 tickets still
`Issued/TE`, **0 Exchanged coupons, 0 EMDs**, still SV300 01 Jan + SV1096 02 Jan, total 30,096.80.

This rules out two of the three original candidates: it is **not** specific to a route change (this
was a date change on the same route), and **not** specific to that one itinerary.

## Cause — NOT established. The leading candidate was tested and ruled out.

Three candidates, none confirmed from the client side:

1. ~~**The missing ticket number**~~ — **RULED OUT as a sufficient cause, 2026-09-29.** Scenario 6
   (`PUBPBJ`, One Way, missing ticket `…133`) **exchanged successfully**, and Sabre shows that very
   ticket among the six exchanged coupons. The exchange therefore resolves documents from the PNR at
   the supplier, not from the application's own list, so a gap in that list is not what breaks it.

   The full picture across six bookings:

   | # | GDS PNR | All six tickets held | Trip type | Exchange |
   |---|---|---|---|---|
   | 1 | `OWXGIW` | Yes | One Way | **Succeeded** |
   | 2 | `QIKISQ` | Yes | Round Trip | **Succeeded** |
   | 3 | `PRUOOC` | No | Multi City | **Failed** |
   | 4 | `PUAUTI` | No | Multi City | **Failed** |
   | 5 | `PTFEBY` | Yes | Multi City | **Succeeded** |
   | 6 | `PUBPBJ` | No | One Way | **Succeeded** |

   What survives is a weak **interaction** hypothesis — both failures were Multi City **and** missing
   a ticket, while either condition alone exchanges fine. Two supporting cases, none contradicting.
   **Not enough to call a cause.**

2. ~~Supplier-side rejection of that particular itinerary~~ — **ruled out.** The second failure was
   a plain date change on the original route with entirely different flights.
3. Something else in the core service or the app.

**`logs/detail.log` would very likely distinguish these.** It has never been accessible in this run
(see the run's outstanding items) and this is the first case where its absence has blocked a
diagnosis rather than merely left an obligation unmet.

## Steps to reproduce

1. Portal `http://192.168.1.60:9500`, agency **AGN9780**, open `NDCEG-BR-F260928CMve29`.
2. **Reissue** → Continue to reissue → set journey 1 to **CAI→RUH 20 Dec 2026** and journey 2 to
   **RUH→JED 24 Dec 2026** → Search.
3. Select the lowest fare (SV 304 + SV 1050 out, SV 321 + SV 386 back, 45,326.80 EGP).
4. Accept the Terms & Conditions and click **Confirm & charge**.
5. DevTools → Network → `POST …/v2/reissue/{ref}/book` returns **409** with
   `"the request could not be completed"`.

> Reproduction is **not guaranteed** — the cause is unknown, so it may be specific to this
> booking's missing ticket number, to this itinerary, or transient.

## Expected

Either a specific reason the agent can act on — as the duplicate-booking guard gives — or, when the
cause genuinely cannot be surfaced, a reference identifier the agent can quote to support. The
screen should say whether retrying is worthwhile.

## Actual

`"the request could not be completed"`, a Failed order record, and no way forward.

## Related

- **FINDING-R06** — the missing ticket number on this same booking; candidate cause, unproven.
- The core service's transient `NO_EXCHANGE_OPTIONS_AVAILABLE` observed the same afternoon (core
  returned 422 while an independent Sabre call in the same window returned 50 offers) shows this
  chain does produce transient failures that surface without explanation.

## Evidence

- `discovery/evidence/s3b-confirmation-FAILED.png` — the Failed confirmation screen
- `discovery/evidence/s3b-portal-bookingConfirm-FAILED.json`
- `discovery/evidence/s3-sabre-getBooking-PRUOOC-after-failure.json` — supplier untouched, 6 tickets intact
- `discovery/evidence/s3b-review-and-pay.png` — the amount presented before the click
- `discovery/evidence/s3b-chain-offer0.md` — the offer verified clean against Sabre at every layer
- `discovery/evidence/s4-sabre-getBooking-PUAUTI-after-failure.json` — second failure, supplier untouched
- `discovery/evidence/s4-review-and-pay.png` — the amount presented before the second click
- `discovery/evidence/s5-sabre-getBooking-PTFEBY-after.json` — the control run that succeeded
- `discovery/evidence/s5-chain-offer0.md`
- `discovery/evidence/s6c-sabre-getBooking-PUBPBJ-after.json` — missing ticket, exchange succeeded
