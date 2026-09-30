# FINDING-R05 — The reissue change fee is written into the unrelated `serviceCharges` field on confirmation

- **Finding ID:** FINDING-R05
- **Title:** `changeFee` disappears at `/bookingConfirm` and its value reappears in `serviceCharges`, a different field that was 0.00 throughout search and review
- **Category:** Defect candidate (Data model / Financial attribution / Labelling)
- **Severity (proposed):** **Medium.** The total is correct, but the agency change fee is recorded under a field that means something else. Reporting that sums `serviceCharges` silently conflates change fees with genuine service charges, and a booking carrying both has nowhere to put them separately
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Portal → Reissue → step 3 Confirmation and E-Ticket; API `/v2/bookingConfirm/{orderId}`
- **Found by:** run-007 scenario 1, exchange of `NDCEG-BR-F26092704TCQE` (GDS PNR `OWXGIW`), 2026-09-27. Raised on user challenge 2026-09-28 after being under-reported inside FINDING-R03

## Observed

`changeFee` and `serviceCharge` are **two distinct fields that coexist** in the reissue payloads.
Through search and review both are present and they carry different values:

| Payload | `changeFee` | `serviceChargeAmount` / `serviceCharges` |
|---|---|---|
| `POST /v2/reissue/{ref}/search` | **300** (offer level), **100** per passenger-type group | **0** (`priceDetails.serviceChargeAmount`) |
| `GET /v2/reissue/{ref}/review` | **300**, and **100** per type | **0** |
| `GET /v2/bookingConfirm/{orderId}` | **absent — field gone** | **300** |

The screen follows the payload:

| Screen | Label | Value |
|---|---|---|
| Review & Pay (step 2) | **Change fee** | 300.00 |
| Confirmation (step 3) | **Service Charges (+)** | 300.00 |

So this is not a presentation-layer rename. The value is **moved into a different field** — one that
the same booking reports as 0.00 at every earlier step — and the field that correctly described it
is dropped from the response.

## Why it matters

- `serviceChargeAmount` is the generic booking service-charge concept, carried on
  `priceDetails` and on every `passengerFareBreakdowns` entry, independent of reissue. It is 0.00
  for this booking.
- `changeFee` is the reissue agency fee, defined per passenger (D-7: Agency 50, Branch 100).
- After confirmation the two are indistinguishable. Any report, invoice, or reconciliation that
  sums `serviceCharges` across bookings now includes agency change fees.
- **Untested collision:** a booking that carries a real service charge *and* is then reissued has
  two different amounts contending for one field. Not reproduced here — this booking's service
  charge was 0.00 — so the behaviour is unknown. Worth a targeted case.

## Relationship to FINDING-R03

Same payload, same root (the confirmation response is assembled differently from `/review`), but a
separate defect and separately fixable:

- **R03** — the supplier penalty is **merged into `totalTax`**; attribution is wrong.
- **R05** — the change fee is **relocated into `serviceCharges`**; the field is wrong.

Between them, `/bookingConfirm` preserves only the *total*. Of the three components Review & Pay
states correctly (taxes 678.80 · supplier fee 12,974.00 · change fee 300.00), the confirmation
misattributes two.

## Steps to reproduce

1. Portal `http://192.168.1.60:9500`, log in as agency **AGN9780**.
2. **My Bookings** → open a ticketed, reissuable order → **Reissue** → Continue to reissue.
3. Search, select an offer, reach **Review & Pay**. The fee line reads **Change fee**.
4. DevTools → Network → `GET …/v2/reissue/{bookingRef}/review`. Confirm both fields are present:
   `changeFee` = 300, `serviceChargeAmount` = 0.
5. Confirm and pay.
6. On **Confirmation** → *Fare Details*, the same amount is now labelled **Service Charges (+)**.
7. DevTools → `GET …/v2/bookingConfirm/{orderId}`: `serviceCharges` = 300 and **there is no
   `changeFee` field**.

## Expected

The confirmation payload keeps `changeFee` as its own field with its own value, and
`serviceCharges` continues to report the booking's actual service charge (0.00 here). The
Confirmation page and e-ticket label the line **Change fee**, matching Review & Pay.

## Actual

`changeFee` is dropped; `serviceCharges` carries 300.00; the screen relabels the line
**Service Charges**.

## Evidence

- `discovery/evidence/s1-portal-search-CAI-RUH.json` — `reissuePricing.changeFee 300`, `priceDetails.serviceChargeAmount 0`
- `discovery/evidence/s1-portal-review.json` — `changeFee 300` / `100` per type, `serviceChargeAmount 0`
- `discovery/evidence/s1-portal-bookingConfirm.json` — `serviceCharges 300`, no `changeFee`
- `discovery/evidence/s1-review-and-pay.png` — "Change fee 300.00"
- `discovery/evidence/s1-confirmation.png` — "Service Charges (+) 300"
- `discovery/evidence/CoreService_vs_Screen_s1_run-007.md` §6.5
