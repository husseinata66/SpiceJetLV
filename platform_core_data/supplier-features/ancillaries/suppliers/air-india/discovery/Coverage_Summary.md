# Coverage Summary — ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Scope | Supplier Feature: `ancillaries` / Supplier: `air-india` |
| Produced by run | `ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Revision | 2 (revised 2026-09-27 — Reports (Total Due to NDC, Sales, Statement) added; declared in-scope via ANC-53's "reports" clause but not actually visited in rev 1 despite the earlier 100% claim) |
| In-scope surface (from Project Context §2) | Admin: Branch/Supplier/Credential config. Portal: Flight Search, flight selection, PAX Details, Ancillaries (Baggage/Meal/Bundle), booking, six-checkpoint validation, pricing/currency, post-booking change/removal, downstream reflection (confirmation/itinerary/reports) |
| Generated | 2026-09-26 (revised 2026-09-27) |

## 1. Coverage Percentage

**100%** — basis: 12/12 declared in-scope screens/flows visited (Admin Branch config, Admin Supplier/Credential assignment, Portal Flight Search, Portal Passenger Details/Ancillaries step, Portal Bundles step, Portal Payment Details, Portal Booking Confirmation, Portal Itinerary/My Bookings re-check, post-booking change/removal attempt, Portal Reports — Total Due to NDC, Sales, Statement). Rev 1's "100% (9/9)" understated the declared surface — ANC-53's "reports" clause was in scope but not yet visited; this revision closes that gap.

## 2. Visited Screens

| Screen / URL | Module | Discovery Mode | Snapshot Artifact |
|---|---|---|---|
| Admin — Branch config (Branch: NDC2_Ahmed Alhussieny) | Ancillaries / AirIndia | User-guided exploration | `findings/FINDING-001_SupplierNameMismatch/product_access_details.png` |
| Admin — Product Access Details (Flight tab, Supplier/Credential assignment) | Ancillaries / AirIndia | User-guided exploration | `findings/FINDING-001_SupplierNameMismatch/product_access_details.png` |
| Portal — Flight Search results (DEL->DXB, 15/10/2026, 1 ADT+1 CHD+1 INF) | Ancillaries / AirIndia | User-guided exploration | `flight_search_results.png` |
| Portal — Passenger Details (Meal Preference, Extra Baggage, Fare Breakdown) | Ancillaries / AirIndia | User-guided exploration | `findings/FINDING-002_ApplicationLevelConfirmed/pax_details_fare_breakdown.png` |
| Portal — Bundles step (Select Bundle, Bundle Services pricing) | Ancillaries / AirIndia | User-guided exploration | `findings/FINDING-005_BundleStepAndLevel/bundle_step.png` |
| Portal — Payment Details (Wallet payment) | Ancillaries / AirIndia | User-guided exploration | `findings/FINDING-007_WalletDeductionConfirmed/payment_details.png` |
| Portal — Booking Confirmation / Order Details | Ancillaries / AirIndia | User-guided exploration | `findings/FINDING-008_ConfirmationReflectsAncillaries/order_confirmed.png` |
| Portal — My Bookings / itinerary detail (Segment Ancillaries) | Ancillaries / AirIndia | User-guided exploration | `findings/FINDING-009_ItineraryReflectsAncillaries/itinerary_segment_ancillaries_pax1.png` |
| Portal — post-booking ancillary change/removal attempt | Ancillaries / AirIndia | User-guided exploration | *(no screenshot — operator statement only, see FINDING-010)* |
| Portal — Reports: Total Due to NDC (`/reports/total-ndc`) | Ancillaries / AirIndia | Direct Observation | `findings/FINDING-011_ReportsReflectBookingConfirmed/live_total_due_report_direct_observation.png` |
| Portal — Reports: Sales (`/reports/sales`) | Ancillaries / AirIndia | Direct Observation | `findings/FINDING-011_ReportsReflectBookingConfirmed/live_sales_report_direct_observation.png` |
| Portal — Reports: Statement (`/reports/statement`) | Ancillaries / AirIndia | Direct Observation | `findings/FINDING-012_StatementReportEmptyNeedsReview/live_statement_report_no_data_direct_observation.png` |

## 3. Visited Components

| Component | Where Exercised | Discovery Mode |
|---|---|---|
| *(none yet)* | | |

## 4. Skipped Areas

| Area | Module | Why Skipped | Discovery Mode Available |
|---|---|---|---|
| *(none yet)* | | | |

## 5. Blocked Areas

| Area | Module | What Blocked It | Recovery Attempted (§21) | Discovery Mode |
|---|---|---|---|---|
| *(none yet)* | | | | |

## 6. Unreachable Areas

| Area | Module | Why Unreachable | Finding / Open Question ID |
|---|---|---|---|
| *(none yet)* | | | |

## 7. Roll-Up

| Status | Count |
|---|---|
| Visited Screens | 12 |
| Visited Components | 0 |
| Skipped | 0 |
| Blocked | 0 |
| Unreachable | 0 |

**By Discovery Mode:** User-guided exploration: 9/9 original declared areas; Direct Observation (rev 2, 2026-09-27): 3/3 Reports areas (Total Due to NDC, Sales, Statement) — 12/12 declared areas total, session complete
