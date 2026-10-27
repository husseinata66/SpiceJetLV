# Approved Scope — IndiaAirLine Seat Map (Admin)

| | |
|---|---|
| Run | `ancillaries-run-009__2026-10-26_13-44-28__Targeted__IndiaAirLine-Seatmap-Admin` |
| Feature / Supplier | Ancillaries / AirIndia (`air-india`), credential `IndiaAirLineStg` |
| Platform | NDC Admin |
| Checklist | `platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/test_design/TestCases_AncillariesSeatMap.xlsx` — unchanged |
| Approved by | Mohanad Dawood, 2026-10-26 |

## Excluded — Not supported by supplier: multi-city trip type

The supplier does not support the multi-city trip type (human decision, 2026-10-26). These cases are never run
and stay out of executable scope and pass rate:

| Case | Group |
|---|---|
| TC-SM-MCT-003 | 10 |
| TC-SM-MCT-006 | 10 |
| TC-SM-MCT-007 | 10 |
| TC-SM-MCT-004 | 15 |
| TC-SM-MCT-005 | 15 |

Groups 10 and 15 are therefore not run. Return-trip cases (TC-SM-RTP-*) are unaffected.

## Execution

Headless, groups 01–13 except 10. Groups 14–17 are assisted (headed only) and are not part of this run.

## Price-change pop-up cases: an AirIndia-specific exception (human decisions, 2026-10-27)

TC-SM-FRC-001, 002, 003 and 005 sit in Setup Group 01 (a one-way search) in the sheet. For this supplier only, the
"Price Update" pop-up appears on a **round trip with an infant** in the search (not on the one-way search), so for AirIndia
these four cases run inside the round-trip group (09). This is a setting for this supplier alone; the sheet and every other
supplier are unchanged. On a run where the airline did not change the fare there is no pop-up and the cases are Not
Applicable. (They were briefly excluded on the understanding that the pop-up was flynas-only; that is withdrawn.)

## Not applicable: fare package cases (fare packages differ per supplier, human note 2026-10-26)

Fare packages differ from one supplier to another. This supplier's two packages ("DEL" and "Value Pack") carry no meal,
baggage or seat data, so TC-SM-PRC-001, TC-SM-BND-002, TC-SM-BND-005 and TC-ML-004 stay Not Applicable.

## Excluded: manual accessibility cases (human decision 2026-10-26)

These two cases need a person (a smaller screen, a screen reader) and cannot be judged by the runner. They are excluded
from this run and stay out of executable scope and pass rate:

| Case | Why |
|---|---|
| TC-SM-A11Y-001 | Needs a person on a smaller screen |
| TC-SM-A11Y-002 | Needs a screen-reader pass |
