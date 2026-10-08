# Findings Summary — ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Run Folder | `ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Total Findings | 17 |
| Generated | 2026-09-26 |
| Revised | 2026-09-27 (live browser automation upgraded FINDING-001, 002, 005, 006 to Direct Observation / Confirmed; a real test booking then upgraded FINDING-007, 008, 009, 010 the same way; FINDING-011/012 added closing the ANC-53 "reports" coverage gap — Total Due/Sales Confirmed; Statement (FINDING-012) reclassified same day from Test Gap/Needs Human Review to Bug/Confirmed after the user confirmed it's a defect in the report itself, not a test-data gap; FINDING-013 through FINDING-017 added from user-supplied evidence of Admin's Booking-Mid Office cycle — new scope, not yet reflected in Project Context, all capped at Needs Human Review per the Human Observation/Static Artifact evidence-tier rule (§18) regardless of how consistent the figures are; FINDING-006 and FINDING-012 additionally corroborated via this same Admin evidence) |

## Index

| ID | Title | Category | Severity | Confidence | Status | Occurrences | Module | Description (one line) |
|---|---|---|---|---|---|---|---|---|
| FINDING-001 | Admin shows Supplier as "IndiaAirLine" / "IndiaAirLineStg", not "AirIndia" | Requirement Gap | N/A | 99% | Rejected | 1 | Ancillaries / AirIndia | App-internal Supplier name confirmed same entity as "AirIndia" via Direct Observation (live Supplier Credentials search) — resolved, record mapping in SupplierChecklist §1 |
| FINDING-002 | AirIndia's live Application Level confirmed — Meal Per Segment, Extra Baggage Per Journey | Observation | N/A | 98% | Confirmed | 1 | Ancillaries / AirIndia | Live behavior matches the ANC-48 platform default exactly, reproduced via Direct Observation |
| FINDING-003 | Rule-engine adjustments resolved — Markup folds into Base Fare; Service Charge/Discount not yet configured | Test Gap | N/A | 85% | Needs Human Review | 1 | Ancillaries / AirIndia | Test-data gap, not a UI limitation — configure Service Charge/Discount to complete verification |
| FINDING-004 | "Special equipment Handling Fee" is one of several selectable Extra Baggage options — resolved | Observation | N/A | 90% | Rejected | 1 | Ancillaries / AirIndia | False read — full "Choose a baggage" dropdown has 4 options, not one mislabeled item |
| FINDING-005 | Bundle is a distinct wizard step, Application Level discovered as Per Journey | Observation | N/A | 97% | Confirmed | 1 | Ancillaries / AirIndia | Resolves the open Bundle-Application-Level item, reproduced via Direct Observation |
| FINDING-006 | Infant confirmed excluded from Baggage, Meal, and Bundle | Observation | N/A | 99% | Confirmed | 3 | Ancillaries / AirIndia | Verifies the ANC-49 platform-wide eligibility default for AirIndia — Direct Observation shows Infant has no passenger row at all on Ancillaries; corroborated again via Admin |
| FINDING-007 | Wallet deduction confirmed to occur only at booking confirmation | Observation | N/A | 99% | Confirmed | 1 | Ancillaries / AirIndia | Verifies ANC-46 for AirIndia — exact arithmetic match reproduced via Direct Observation |
| FINDING-008 | Confirmation reflects Baggage, Bundle, and Meal, per passenger where applicable | Observation | N/A | 99% | Confirmed | 2 | Ancillaries / AirIndia | ANC-53 fully confirmed, reproduced via Direct Observation on a second real booking |
| FINDING-009 | Itinerary (My Bookings) confirmed to reflect ancillaries per passenger, per segment | Observation | N/A | 98% | Confirmed | 2 | Ancillaries / AirIndia | Second, independent confirmation point for ANC-53, reproduced via Direct Observation |
| FINDING-010 | Post-booking ancillary change/removal confirmed blocked — no control exists at all | Observation | N/A | 98% | Confirmed | 2 | Ancillaries / AirIndia | Matches ANC-52; a full DOM scan found zero change/cancel/remove controls |
| FINDING-011 | Portal Reports (Total Due to NDC, Sales) confirmed to reflect the real booking correctly | Observation | N/A | 98% | Confirmed | 1 | Ancillaries / AirIndia | Both reports show the exact 24,122.00 EGP booking total via live search — closes part of the ANC-53 "reports" coverage gap |
| FINDING-012 | Statement report returns zero records for this Branch/Agency — confirmed a defect in the report itself | Bug | Medium | 96% | Confirmed | 2 | Ancillaries / AirIndia | Empty at the API level with a fully unfiltered wide date range; user confirmed 2026-09-27 this is a defect, not a test-data/config gap; corroborated on Admin too — Test Design to write Statement test cases now (both channels), held Pending until fixed |
| FINDING-013 | Admin's Booking-Mid Office cycle produces correct, internally-consistent pricing | Observation | N/A | 90% | Needs Human Review | 1 | Ancillaries / AirIndia | New Admin scope; user-supplied evidence reconciles exactly across search/payment/confirmation/costing, but capped below Confirmed (Human Observation/Static Artifact only) |
| FINDING-014 | Admin's Fare Details itemizes Service Charge and Discount — contrasts FINDING-003's Portal observation | Observation | N/A | 85% | Needs Human Review | 1 | Ancillaries / AirIndia | Raises a real question about whether FINDING-003's "not configured" conclusion still holds, since the rule engine is shared between channels |
| FINDING-015 | Admin's wallet has three balance components (Your/Credit/Top Up), unlike Portal's single figure | Observation | N/A | 88% | Needs Human Review | 1 | Ancillaries / AirIndia | Genuine architectural difference; deduction still reduces Top Up Balance by the exact booking total |
| FINDING-016 | Admin's Total Due, Agency Wallet, Sales, AR Ledger, and Wallet History reports all reflect the real booking correctly | Observation | N/A | 92% | Needs Human Review | 1 | Ancillaries / AirIndia | Five independent reports mutually corroborate; closes part of the same ANC-53 "reports" gap for Admin (Daily Sales excluded from scope) |
| FINDING-017 | Wallet History Report's Credit/Debit column labeling is inverted from standard convention | UX Issue | Low | 82% | Needs Human Review | 1 | Ancillaries / AirIndia | Numerically correct (see FINDING-016) but confusing; a product/labeling decision, not a data defect |

## Breakdown

**By Severity:** 0 Critical · 0 High · 1 Medium · 1 Low · 15 N/A

**By Category:** 1 Requirement Gap · 1 Test Gap · 1 Bug · 1 UX Issue · 13 Observation

**By Status:** 2 Rejected · 9 Confirmed · 6 Needs Human Review

**By Module:** 17 Ancillaries / AirIndia

## Evidence Packages

| Finding ID | Evidence Package | Evidence Files |
|---|---|---|
| FINDING-001 | `findings/FINDING-001_SupplierNameMismatch/` | 2 (product_access_details.png, supplier_credentials_search_direct_observation.png) |
| FINDING-002 | `findings/FINDING-002_ApplicationLevelConfirmed/` | 2 (pax_details_fare_breakdown.png, live_ancillaries_meal_baggage_direct_observation.png) |
| FINDING-003 | `findings/FINDING-003_RuleEngineNotVisible/` | 1 (pax_details_fare_breakdown.png) |
| FINDING-004 | `findings/FINDING-004_BaggageLabelUnclear/` | 1 (pax_details_fare_breakdown.png, original only) |
| FINDING-005 | `findings/FINDING-005_BundleStepAndLevel/` | 2 (bundle_step.png, live_bundle_pricing_direct_observation.png) |
| FINDING-006 | `findings/FINDING-006_InfantEligibilityConfirmed/` | 4 (bundle_step.png, live_ancillaries_no_infant_row_direct_observation.png, live_ancillaries_no_infant_row_direct_observation_2.png, admin_passenger_table_infant_no_ancillaries.png) |
| FINDING-007 | `findings/FINDING-007_WalletDeductionConfirmed/` | 4 (payment_details.png, order_confirmed.png, live_wallet_before_booking_direct_observation.png, live_wallet_after_booking_direct_observation.png) |
| FINDING-008 | `findings/FINDING-008_ConfirmationReflectsAncillaries/` | 5 (order_confirmed.png, passenger_details_table.png, passenger_details_table_zoomed.png, extra_baggage_bundle_fare_details.png, live_order_confirmation_direct_observation.png) |
| FINDING-009 | `findings/FINDING-009_ItineraryReflectsAncillaries/` | 3 (itinerary_segment_ancillaries_pax1.png, itinerary_segment_ancillaries_pax2.png, live_itinerary_segment_ancillaries_direct_observation.png) |
| FINDING-010 | `findings/FINDING-010_PostBookingChangeBlocked/` | 1 (live_change_control_scan_direct_observation.png) |
| FINDING-011 | `findings/FINDING-011_ReportsReflectBookingConfirmed/` | 2 (live_total_due_report_direct_observation.png, live_sales_report_direct_observation.png) |
| FINDING-012 | `findings/FINDING-012_StatementReportEmptyNeedsReview/` | 2 (live_statement_report_no_data_direct_observation.png, admin_statement_report_no_data.png) |
| FINDING-013 | `findings/FINDING-013_AdminBookingCyclePricingReconciled/` | 3 (admin_search_result_price_breakdown.png, admin_order_confirmation_and_passengers.png, admin_costing_and_payment_reconciled.png) |
| FINDING-014 | `findings/FINDING-014_AdminItemizesServiceChargeDiscount/` | 1 (admin_fare_details_service_charge_discount.png) |
| FINDING-015 | `findings/FINDING-015_AdminWalletThreeComponentStructure/` | 1 (admin_payment_details_wallet_three_components.png) |
| FINDING-016 | `findings/FINDING-016_AdminReportsReflectBookingConfirmed/` | 5 (admin_total_due_to_ndc_report.png, admin_agency_wallet_report.png, admin_sales_report.png, admin_ar_ledger_report.png, admin_wallet_history_report.png) |
| FINDING-017 | `findings/FINDING-017_WalletHistoryLabelingInverted/` | 1 (admin_wallet_history_report_labeling.png) |
