# TC-ANC-010 — Execution log (desk review, ROE arithmetic isolated from TC-ANC-035)

**Executed:** 2026-10-03 · Desk review, no new booking — per this case's own Notes field ("the explicit
ROE multiplication should still be performed and recorded as its own check").

**Evidence source:** TC-ANC-035 (Portal, round-trip, onward-only), PNR `S13GWS` — chosen because Portal
bookings carry **no per-passenger Markup** (confirmed first on TC-ANC-003, reconfirmed on TC-ANC-035),
so its figures isolate the ROE 0.5 conversion alone, with no Markup component to separate out first.

From `TC-ANC-035/06_supplier_retrieve_reconciliation.md`:

| Component | Supplier (INR) | × ROE 0.5 | System shows (EGP) | Match |
|---|---|---|---|---|
| Base fare | 24,182 | 12,091 | 12,091 | exact |
| Taxes | 31,180 | 15,590 | 15,590 | exact |
| `totalAncillariesAmount` | 15,200 | 7,600 | 7,600 (Meal 800 + Baggage 6,800) | exact |

## Disposition

`booking price = Supplier price × ROE` holds exactly for every fare component on a booking with zero
Markup to separate out first (Portal). On an Admin booking (e.g. TC-ANC-004), the same relationship
holds for Taxes (5,336 × 0.5 = 2,668 ✓) and the ancillary aggregate (19,600 × 0.5 = 9,800 ✓) — fields
Markup never touches — while Base Fare additionally carries +100 EGP/passenger Markup on top of the
ROE-converted figure (ANC-55), which is why Base Fare alone is not used as the isolation case here.

**Proposed TC-ANC-010 status: Passed.**
