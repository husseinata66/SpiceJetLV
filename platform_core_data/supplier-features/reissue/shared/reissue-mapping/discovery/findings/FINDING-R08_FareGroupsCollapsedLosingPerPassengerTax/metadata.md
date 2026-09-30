# FINDING-R08 — Two fare groups of the same passenger type are collapsed, and one group's tax is applied to both passengers

- **Finding ID:** FINDING-R08
- **Title:** When Sabre returns two Adult fare groups with different taxes, the core service merges them by passenger-type code and multiplies the **first** group's per-passenger tax by the full quantity — the per-passenger breakdown then understates the total by the difference
- **Category:** Defect candidate (Mapping / Per-passenger price breakdown)
- **Severity (proposed):** **Medium.** The **amount charged is correct** — the offer-level total still comes straight from Sabre. What is wrong is the **per-passenger breakdown shown to the agent and the customer**, which does not add up to the total beside it
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** hop B (Sabre → core service), surfacing on Review and Pay → *Additional to pay* → per-passenger-type lines
- **Found by:** run-007 scenario 4, booking `NDCEG-BR-F260928v8EC7m` (GDS PNR `PUAUTI`), CAI→JED 08 Jan 2027 + JED→RUH 12 Jan 2027, 2026-09-28

## Observed

Sabre returns **two separate Adult fare groups with different taxes**:

| Sabre fare group | `priceDifference.totalTax` |
|---|---|
| ADT ×1 | **729.00** |
| ADT ×1 | **850.80** |
| CNN ×2 | 806.80 |
| INF ×2 | 528.80 |

Sabre's own sum: `729.00 + 850.80 + (806.80 × 2) + (528.80 × 2)` = **4,251.00**, matching its
offer-level `totalPriceDifference.totalTax` of `"4251.00"` exactly.

The core service collapses the two Adult groups into one:

```
modifyPrice.passengerFareBreakdown[0]
  passengerTypeCode: "ADT"
  passengerQuantity: 2          <- both adults in one entry
  paxTotalTaxAmount: 729        <- the FIRST group's figure only
```

so the per-type figures become:

| Type | core / Portal shows | Should be |
|---|---|---|
| ADT ×2 | **1,458.00** (= 729.00 × 2) | **1,579.80** (= 729.00 + 850.80) |
| CHD ×2 | 1,613.60 | 1,613.60 ✓ |
| INF ×2 | 1,057.60 | 1,057.60 ✓ |
| **Sum** | **4,129.20** | **4,251.00** |

**The breakdown is short by 121.80**, which is exactly `850.80 − 729.00`. Child and Infant are
correct because each has only **one** fare group — the defect appears only where a passenger type
has **more than one**.

## The total is right; only the breakdown is wrong

`modifyPrice.taxDifference` is **4,251.00** — correct, taken from Sabre's offer level. So the
customer is charged the right amount. The screen then prints per-passenger lines beside that total
which do not sum to it.

**Affected on every offer in the response: 50 of 50.**

## Where it is introduced

**The core service.** The Portal faithfully republishes what core gives it:

| Layer | ADT tax |
|---|---|
| Sabre | two groups: 729.00 and 850.80 |
| **core `modifyPrice.passengerFareBreakdown`** | **ADT ×2 @ 729.00** ← collapsed here |
| Portal `reissuePricing.passengerFareBreakdowns` | ADT ×2 → 1,458.00 |
| Screen — *Additional taxes · 2 Adult* | **1,458.00** |

## It contradicts the field map's own rule

The core-service field map states, for the per-fare-group derivation:

> **Summed per fare group, not the highest applied to everyone.**

Core is doing neither: it applies the **first** group's value to everyone. The rule as written is
correct; the implementation does not follow it.

The same document also warns that ATPCO tax lists differ per passenger type and that consumers must
not assume alignment — this is the same class of problem one level up, at the fare group.

## Why earlier scenarios did not catch it

Scenarios 1, 2, 3 and 3b all had exactly **one fare group per passenger type**, so collapsing was a
no-op and the per-type lines summed correctly every time:

| Scenario | Per-type sum vs offer total |
|---|---|
| 1 — one way | 243.60 + 243.60 + 191.60 = 678.80 ✓ |
| 2 — round trip | −24.40 + −24.40 + 439.60 = 390.80 ✓ |
| 3 — multi city | 243.60 × 3 = 730.80 ✓ |
| 3b — multi city, route change | 6,789.60 + 6,789.60 + 1,473.60 = 15,052.80 ✓ |
| **4 — multi city, date change** | **4,129.20 ≠ 4,251.00** ✗ |

The trigger is **two passengers of the same type priced into different fare groups**, which happens
when they do not receive the same fare — here the two adults differ by 121.80 in tax.

## Steps to reproduce

1. Sabre CERT `POST /v1/offers/flightReshop` for PNR `PUAUTI`, journeys CAI→JED 2027-01-08 and
   JED→RUH 2027-01-12, all six ticket numbers. In any offer, read
   `items[].fares[]` — there are **two** `ADT` entries with `priceDifference.totalTax` of
   `729.00` and `850.80`.
2. Core `POST /api/v1/reissue/reshop` with the same criteria. Read
   `offers[0].modifyPrice.passengerFareBreakdown[0]` — one `ADT` entry, `passengerQuantity: 2`,
   `paxTotalTaxAmount: 729`.
3. Portal → Reissue on `NDCEG-BR-F260928v8EC7m`, same criteria, select any offer.
4. On **Review and Pay**, add the three *Additional taxes* lines: 1,458.00 + 1,613.60 + 1,057.60 =
   **4,129.20**, while the sidebar *Additional taxes* reads **4,251.00**.

## Expected

The per-passenger-type breakdown sums to the offer total. Either the two Adult groups are kept
separate, or their taxes are summed per group (729.00 + 850.80 = 1,579.80) rather than one group's
figure being multiplied by the count.

## Actual

ADT ×2 shows 1,458.00. The breakdown is 121.80 short of the total printed next to it.

## Evidence

- `discovery/evidence/s4-sabre-reshop-PUAUTI.json` — two ADT fare groups, 729.00 and 850.80
- `discovery/evidence/s4-core-reshop-PUAUTI.json` — collapsed to one entry at 729.00, 50/50 offers
- `discovery/evidence/s4-portal-search-PUAUTI.json` — Portal republishes 1,458.00
- `discovery/evidence/s4-portal-review.json`
- `discovery/evidence/s4-chain-offer0.md` — offer-level values all verified correct against Sabre
