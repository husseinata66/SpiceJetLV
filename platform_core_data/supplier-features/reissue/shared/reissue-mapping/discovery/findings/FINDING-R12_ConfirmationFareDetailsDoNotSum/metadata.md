# FINDING-R12 — The confirmation's Fare Details block does not add up: the supplier penalty is missing from it

- **Finding ID:** FINDING-R12
- **Title:** On the Reissue Confirmation screen, *Base fare + Taxes + Service Charges* comes to **38,958.80** while **Total Amount** reads **51,932.801**. The missing **12,974.00 EGP** is the supplier change penalty, which every layer returns and this screen does not print
- **Category:** Defect (Value dropped by the API / Self-inconsistent invoice record)
- **Severity (proposed):** **High.** The customer-facing and agent-facing record of what was charged contradicts itself by 12,974.00 EGP — 25 % of the total. It is the document an agent quotes to a customer and an accountant reconciles against. A total that exceeds its own itemisation with no line to explain it is not defensible to either. **Confirmed to originate in the backend `/v2/bookingConfirm` response, not the UI**
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Portal → Reissue → step 3 Confirmation → **Fare Details**
- **Found by:** **The user**, 2026-09-29, on `http://192.168.1.60:9500/booking/reissue/confirmation/AGN9780NDCNDCORD260928YWRYVE`
- **Booking:** `NDCEG-BR-F2609284Y8YIZ` → new ref `NDCEG-BR-F260928qf1UA2` · GDS PNR `PTFEBY` · multi city CAI→JED 15 Dec 2026, JED→DXB 20 Dec 2026 · 2 Adults, 2 Children, 2 Infants · agency AGN9780 · EGP

## Observed

The Fare Details block as printed:

| Line | Amount |
|---|---|
| Base fare | 31,098.00 EGP |
| Taxes (+) | 7,560.80 EGP |
| Service Charges (+) | 300.00 EGP |
| **Sum of the lines** | **38,958.80 EGP** |
| **Total Amount** | **51,932.801 EGP** |
| **Unexplained difference** | **12,974.00 EGP** |

**12,974.00 is the supplier change penalty, to the piastre.** It is not missing from the *total* — the
total is correct. It is missing from the *itemisation*.

The full, correct arithmetic, every component verified against Sabre in the scenario-5 chain check:

```
base 31,098.00 + taxes 7,560.80 + penalty 12,974.00 = 51,632.80   (core amount payable)
                                    + change fee 300.00 = 51,932.80   (what was charged)
```

## The same screen presents the penalty two different ways

This is the part that makes it a defect rather than a design choice — **two bookings, one screen,
two incompatible presentations**:

| | Scenario 1 · PNR `OWXGIW` · one way | Scenario 5 · PNR `PTFEBY` · multi city |
|---|---|---|
| Base fare | −3,732.00 | 31,098.00 |
| Taxes (+) | **13,652.80** | **7,560.80** |
| Service Charges (+) | 300.00 | 300.00 |
| Lines sum to | **10,220.80** | **38,958.80** |
| Total Amount | **10,220.80** | **51,932.801** |
| Verdict | **sums** | **12,974.00 short** |

Scenario 1's Taxes line of 13,652.80 is *pure taxes 678.80 + penalty 12,974.00 merged together*. So
on that booking the penalty is present, silently folded into a line named "Taxes" — which is
**FINDING-R03**, misnaming but arithmetically whole. On scenario 5 the same line carries **taxes
only**, and the penalty is dropped altogether.

Both bookings carry an identical penalty of 12,974.00. One shows it under the wrong name; the other
does not show it at all.

## It is exactly the stated defect rule

The oracle for this scope (§2.0, set by the user 2026-09-28) is: **the backend returns a value and
the screen does not display it → Flag.** This is that case without qualification. The penalty is
present and correct at every layer — confirmed in `s5-chain-offer0.md`, which recorded it passing
Sabre → core → Portal unchanged at 12,974.00 — and the Confirmation screen does not print it.

## Secondary: the total is rendered to three decimal places

**`51,932.801`**. The true total is **51,932.80**. The trailing `1` is floating-point noise reaching
the screen unrounded on a currency amount. Scenario 1's total (`10,220.8`) is clean, so this is not
universal.

Related, in the confirmation payloads of three other scenarios, the same charge is stored two
different wrong ways in one object — `totalAmt` rounded **up** and `agencyInvoiceAmt` truncated
**down**, ~1.00 apart, neither equal to the amount taken:

| Scenario | Charged | `totalAmt` | `agencyInvoiceAmt` |
|---|---|---|---|
| 6c | 124,195.20 | 124,196 | 124,195 |
| 7 | 89,761.20 | 89,762 | 89,761 |
| 8b | 170,275.20 | 170,276 | 170,275 |

## ROOT CAUSE — CONFIRMED. The backend drops the penalty; the screen is faithful.

Payload captured 2026-09-29 from `GET /odeysysportal/v2/bookingConfirm/AGN9780NDCNDCORD260928YWRYVE`:

```json
"invoiceInfo": {
  "currency":         "EGP",
  "totalFare":        31098,
  "totalTax":         7560.8,      <- pure taxes. The penalty is NOT merged in.
  "serviceCharges":   300,
  "discountPrice":    0,
  "agencyInvoiceAmt": 51932.8,
  "totalAmt":         51932.801,   <- includes the penalty
  "feeNTaxes":        7560.8
}
```

**The payload contradicts itself.** `totalFare + totalTax + serviceCharges` = **38,958.80**, while
`totalAmt` = **51,932.801**. Short by exactly **12,974.00** — the penalty.

**The value 12,974 does not appear anywhere in the entire payload.** Not in `totalTax`, not in a
penalty field, not anywhere. It is not mislabelled or misfiled — it is genuinely absent, surviving
only inside the two aggregate totals.

**The screen renders the payload faithfully**, field for field: Taxes 7,560.80 on screen is
`totalTax` 7,560.80 in the payload. **The UI is not at fault.** The defect is entirely in
`/v2/bookingConfirm`.

### This booking is the only one that fails this way

| Confirmation | `totalFare` | `totalTax` | `svc` | lines sum | `totalAmt` | gap |
|---|---|---|---|---|---|---|
| s1 · `OWXGIW` one way | −3,732 | 13,652.80 | 300 | 10,220.80 | 10,220.8 | **0** |
| s2 · `QIKISQ` round trip | −2,280 | 13,364.80 | 600 | 11,684.80 | 11,684.8 | **0** |
| **s5 · `PTFEBY` multi city** | **31,098** | **7,560.80** | **300** | **38,958.80** | **51,932.801** | **12,974.00** |
| s6c · `PUBPBJ` one way | 162 | 123,883.20 | 150 | 124,195.20 | 124,196 | 0.80 |
| s7 · `QTZVXU` one way | −33,624 | 123,271.20 | 114 | 89,761.20 | 89,762 | 0.80 |
| s8b · `QZTJRV` round trip | 0 | 170,161.21 | 114 | 170,275.21 | 170,276 | 0.79 |

Everywhere else `totalTax` carries the penalty folded in and the block reconciles; the 0.79–0.80 gaps
are the separate rounding defect below. **Only scenario 5 loses a whole component.**

### SUPERSEDED — leading candidate for the trigger (disproven 2026-09-30, see correction below)

**Scenario 5 is the only multi-city booking among the six captured confirmations.** That is the one
structural property separating it from every case that reconciles. With a single observation it is a
hypothesis, not a cause — the two other multi-city bookings (`PRUOOC`, `PUAUTI`) both failed to
exchange, so no confirmation exists for them and the pattern has never been tested twice.

**To confirm or kill it:** run one successful multi-city exchange and read its `invoiceInfo`. If
`totalTax` again excludes the penalty, the trigger is multi-city and the fix is well targeted.

### The three-decimal total is also backend-origin

`totalAmt` is **51,932.801** in the payload, while `agencyInvoiceAmt` in the same object is
**51,932.8**. Two fields for one amount, differing by 0.001, both emitted by the backend. The screen
prints `totalAmt` verbatim, decimals and all.


## CORRECTION, 2026-09-30 — the multi-city hypothesis is DISPROVEN

The section above proposed that multi-city is the trigger, on the grounds that scenario 5 was the
only multi-city confirmation available. **A multi-city exchange has now been run and it reconciles
perfectly.**

Scenario 9 — `NDCEG-BR-F2609294YODAr` → `NDCEG-BR-F260929i2znhr`, GDS PNR `RPTIYO`, **multi city**
CAI→RUH / RUH→DMM, 6 passengers, AED:

```
totalFare       280,206.00    base
totalTax        130,435.20    taxes 13,273.20 + supplier penalty 117,162.00, merged
serviceCharges      114.00    change fee
                 ──────────
components sum  410,755.20    = amount charged, exactly
```

The penalty is present, folded into `totalTax` in the normal way. **Trip type is not the trigger.**

Updated picture across every captured confirmation:

| Confirmation | Trip type | Penalty in the itemisation? |
|---|---|---|
| s1 `OWXGIW` | One way | Yes, merged into `totalTax` |
| s2 `QIKISQ` | Round trip | Yes, merged |
| **s5 `PTFEBY`** | **Multi city** | **NO — dropped entirely** |
| s6c `PUBPBJ` | One way | Yes, merged |
| s7 `QTZVXU` | One way | Yes, merged |
| s8b `QZTJRV` | Round trip | Yes, merged |
| **s9 `RPTIYO`** | **Multi city** | **Yes, merged** |

Two multi-city cases, one broken and one correct. **Scenario 5 remains a single unexplained
occurrence with no known trigger.** No structural property has been found that separates it from the
six confirmations that reconcile.

**What that means for the fix:** this cannot be targeted at a trip type. Until the cause is known,
the defensible control is the one FINDING-R13 also calls for — the application should verify that a
confirmation's components sum to its own stated total, and refuse to present an invoice that does
not. That catches this defect whatever causes it.

**How the wrong hypothesis arose:** it was drawn from one observation, on the only multi-city
confirmation then available, and stated as the leading candidate. It was recorded as a hypothesis
rather than a cause, and testing it was listed as the way to confirm or kill it — that test has now
killed it. The reasoning is retained above rather than deleted, so the next reader can see what was
tried.

## Why this was not reported when scenario 5 ran

Scenario 5 was run on 2026-09-28 as a **control** — its only purpose was to show that an exchange
*could* succeed, against the two multi-city failures in FINDING-R07. A screenshot was taken and the
run recorded as "Succeeded". **No `bookingConfirm` payload was captured and the Fare Details block
was never checked** — the one scenario of eight where that step was skipped. The penalty figure of
12,974.00 was sitting in my own chain-comparison table for that scenario the whole time; it was never
compared against the confirmation's own total.

**Process correction:** every scenario must capture the `bookingConfirm` payload, and the confirmation
screen's itemisation must be summed against its own stated total. This is now a required step, not an
optional one. It is added to the chain checks in §2.3 of the mapping Project Context.

## Steps to reproduce

1. Portal `http://192.168.1.60:9500`, sign in as agency **AGN9780**.
2. Open `http://192.168.1.60:9500/booking/reissue/confirmation/AGN9780NDCNDCORD260928YWRYVE`.
3. Scroll to **Fare Details**.
4. Add the three lines: 31,098.00 + 7,560.80 + 300.00 = **38,958.80**.
5. Read **Total Amount**: **51,932.801**. The difference is 12,974.00, and no line accounts for it.

## Expected

The itemisation sums to the total. The supplier penalty appears as its own line, named for what it is
— a change penalty, not a tax and not a service charge — and the total is rendered to two decimals.

## Actual

Three lines summing to 38,958.80 above a total of 51,932.801, with the 12,974.00 penalty absent.

## Related

- **FINDING-R03** — the penalty presented as tax. Scenario 1 is that defect; scenario 5 is its
  opposite failure mode on the same screen. Whatever fixes one must cover both.
- **FINDING-R05** — the 300.00 shown as *Service Charges* is the **change fee**. Present on this screen
  too, so this booking exhibits R03's sibling, R05, and R12 in one block.
- **FINDING-R02** — rounding of a displayed total; the three-decimal render and the two-directional
  payload rounding above are the same family.

## Evidence

- `discovery/evidence/s5-confirmation-SUCCESS.png` — the Fare Details block as printed
- `discovery/evidence/s1-confirmation.png` — the same screen, penalty merged into Taxes, block sums
- `discovery/evidence/s5-chain-offer0.md` — penalty 12,974.00 verified at Sabre, core and Portal
- `discovery/evidence/s5-core-reshop-PTFEBY.json` · `s5-sabre-reshop-PTFEBY.json`
- `discovery/evidence/s5-sabre-getBooking-PTFEBY-after.json` — exchange confirmed at the supplier
- `discovery/evidence/s5-portal-bookingConfirm.json` — **the proof**: components sum 38,958.80, `totalAmt` 51,932.801, penalty absent from the whole payload
