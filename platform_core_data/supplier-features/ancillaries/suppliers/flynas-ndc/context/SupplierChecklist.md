# Supplier Checklist — Flynas NDC

**Scope family:** Supplier Features → Feature → Supplier
**Feature:** Ancillaries (ancillaries)
**Integration Layer:** Unknown / not declared
**Supplier:** Flynas NDC (flynas-ndc)
**Status:** Draft
**Revision:** 1
**Last Updated:** 2026-09-26
**Produced by run:** ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-FlynasNDCSeatMap
**Rendered from Feature Profile:** platform_core_data/supplier-features/ancillaries/context/FeatureChecklistProfile.md (revision 1)
**Capability Model used for §5c:** platform_core_data/supplier-features/ancillaries/context/CapabilityModel.md (revision 1)

### Revision History

| Rev | Date | Changed By | What Changed | Why / Evidence |
|---|---|---|---|---|
| 1 | 2026-09-26 | Rendering agent (Claude), for Mohanad Dawood | Initial intake. Rendered from the generic template and the Ancillaries Feature Checklist Profile rev 1, with §5c from the Capability Model rev 1 | Supplier Flynas NDC approved 2026-09-26 by Mohanad Dawood. Supplier values were supplied at intake for run-006 |
| 2 | 2026-09-26 | Claude, for Mohanad Dawood | §5c: all four capabilities Supported + Provided. SUP-OQ-07/08/09 answered for run-006 (both apps; seat map in scope; capability gate) | Human decision, Mohanad Dawood, 2026-09-26 (run-006) |
| 3 | 2026-09-27 | Claude, for Mohanad Dawood | Added §7c Supplier-Specific Rules (new template section): ladies-only seats Confirmed as Flynas-only; party-wide exit-row block recorded Pending Confirmation. Rule 62 now has a test case (`TC-SM-PAX-008`) | Human decision, Mohanad Dawood, 2026-09-27: seat rules apply to every Supplier except ladies-only seats |

---

> A Supplier scope is the **complete QA ownership boundary** for this Feature + Supplier
> implementation:
>
> ```
> Application UI
>     ↓
> Application
>     ↓
> Supplier
> ```
>
> Ancillaries declares no `integrationLayer` (`null`), so the path has three tiers. The
> integration-layer tier is omitted. That is a complete, valid scope, not a gap. The Feature can span
> more than one application: Admin for configuration and Portal for the business flow. Each
> application's access details are recorded separately.
>
> By default a Supplier run is **Full Feature QA** across every applicable layer. **run-006 is
> explicitly narrowed** by a human scope restriction. See §2b.
>
> This checklist holds only **supplier-specific** information. Shared Feature business requirements
> belong to the Feature's approved shared context,
> `shared/ancillaries-baseline/context/ProjectContext.md` rev 1, through the Feature Checklist Profile
> named above. They are not duplicated here. Supplier-specific Test Cases must trace back to the
> shared `ANC-xx` requirement IDs.
>
> Flynas NDC under Ancillaries is its own Supplier scope. It is independent of any Supplier with the
> same name under another Feature.

Every field below carries a Status: Confirmed · Provided · Unknown · To Be Discovered · Blocked ·
Pending Confirmation · N/A.

## 1. Supplier Identity — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Supplier name | Flynas NDC | Provided | `supplier.json` (approved 2026-09-26 by Mohanad Dawood) | |
| Provider ID / code | Unknown | Unknown | — | No Provider ID was supplied at intake |
| Integration type (if known) | Unknown | Unknown | — | Neither the name nor the credential label settles the integration type |
| Airline/GDS scope (if applicable) | flynas (airline). Known flights: XY568 / XY566 | Provided | Intake, run-006 | Airline scope beyond the known route: To Be Discovered |

## 2. Supplier Scope — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Feature capability being implemented | Ancillaries: Seat Map / seat selection (run-006 target) | Provided | run-006 `run.json` target "Ancillaries - Flynas NDC Seat Map" | The Seat capability result itself is not recorded yet. See §5c. Seat/Seatmap boundary: OQ-ANC-09, §12 |
| Supported booking/use cases | Pending Confirmation | Pending Confirmation | — | Supplied suite: TESTCASES-SEATMAP-v7-simple.xlsx, 101 cases (§9) |
| Known exclusions | Rule 62 (seat sets) was not covered by the supplied suite; `TC-SM-PAX-008` added and run 2026-09-27 — not blocked in the seat map, accepted as enforced by the airline at booking (not verified by a booking) | Provided | Intake, run-006; human instruction 2026-09-27 | Coverage gap, not a Supplier exclusion. §12 SUP-OQ-05 |
| Known supplier limitations | Staging feed misreports cabin labels. Exit-row availability depends on each flight's inventory; exit-row and seat-set eligibility are enforced by the airline at booking, not in the seat map | Provided | Intake. BUSINESS_DOMAIN OQ-21 / OQ-25 | §12 SUP-OQ-03, SUP-OQ-04 |
| UI scope included? | Yes | Provided | run-006 `testingLayerScope` | |
| API scope included? | No | Provided | run-006 `testingLayerScope` | Out of Scope for run-006. Human scope restriction 2026-09-26 |
| Contract scope included? | No | Provided | run-006 `testingLayerScope` | Out of Scope for run-006 |
| Integration scope included? | No | Provided | run-006 `testingLayerScope` | Out of Scope for run-006 |
| E2E scope included? | Yes | Provided | run-006 `testingLayerScope` | |
| Regression against previous integration required? | Unknown | Unknown | — | The Regression layer is In Scope. No "previous integration" baseline was identified |
| DB validation applicable? | No | Provided | run-006 `testingLayerScope` | Out of Scope for run-006 |
| Security testing applicable? | No | Provided | run-006 `testingLayerScope` | Out of Scope for run-006 |
| Performance testing applicable? | No | Provided | run-006 `testingLayerScope` | Out of Scope for run-006 |

## 2c. Supplier Capabilities — GENERIC

Recorded at intake (`ndc_execution_rules.md` §A15). The authoritative values are in `supplier.json`,
written with `cli.js supplier-feature supplier capabilities` — this table mirrors them. `Unknown` is
treated as Not Supported when a run is planned.

| Capability | Supported / Not Supported / Unknown | Source | Notes |
|---|---|---|---|
| Hold | **Not Supported** | Human decision, Mohanad Dawood, 2026-09-27 | The Portal shows "Hold is not available for this flight" on flynas |
| Pay after Hold | **Not Supported** | Human decision, Mohanad Dawood, 2026-09-27 | Follows from Hold |
| Meal | **Supported** | Human decision, Mohanad Dawood, 2026-09-27 | Verified in run-006 |
| Baggage | **Supported** | Human decision, Mohanad Dawood, 2026-09-27 | Verified in run-006 |
| Seat | **Supported** | Human decision, Mohanad Dawood, 2026-09-27 | Verified in run-006 — the Feature under test |
| Bundle | **Supported** | Human decision, Mohanad Dawood, 2026-09-27 | Verified in run-006 — Plus, Light Super Flex, Value, Value Flex |

## 2b. Testing Layer Scope — GENERIC

Frozen on run-006 (`ndc_execution_rules.md` §A4). The only way to change it is
`run_manager/cli.js scope-change`.

| Layer | In Scope / Out of Scope / Deferred | Reason (mandatory if not In Scope) | Notes |
|---|---|---|---|
| UI | In Scope | | |
| API | Out of Scope | Human scope restriction 2026-09-26 (Mohanad Dawood): functional only | |
| Contract | Out of Scope | Human scope restriction 2026-09-26 (Mohanad Dawood): functional only | |
| Integration | Out of Scope | Human scope restriction 2026-09-26 (Mohanad Dawood): functional only | |
| E2E | In Scope | | |
| Regression | In Scope | | |
| DB | Out of Scope | Human scope restriction 2026-09-26 (Mohanad Dawood): functional only | |
| Security | Out of Scope | Human scope restriction 2026-09-26 (Mohanad Dawood): functional only | |
| Performance | Out of Scope | Human scope restriction 2026-09-26 (Mohanad Dawood): functional only | |

## 3. Environment & Access — GENERIC

### 3a. UI

The Feature Execution Flow keeps Admin and Portal details apart while OQ-ANC-08 is open. Each is
recorded on its own row here.

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Application URL/environment — Admin | http://192.168.1.70 (Admin panel) | Provided | Intake, run-006 | run-006 target environment. The booking wizard runs here. §12 SUP-OQ-07 |
| Application URL/environment — Portal | `/odeysysportal/v2/` on the same host | Provided | Intake: used for the 2026-09-19 completed bookings | run-006 executes on both Admin and Portal — human decision 2026-09-26 (SUP-OQ-07) |
| Required role/user | Agent Mohanad Dawood | Provided | Intake | Role name: To Be Discovered (Profile §A, ANC-14) |
| Navigation/menu availability | Booking-Mid Office → Flight Search | Provided | Intake | |
| Supplier configuration visibility | To Be Discovered | To Be Discovered | — | ExecutionFlow §2, ANC-15 |
| Branch/Agency/PCC setup | Branch BRN298 "Uplift2_Mohanad Dawood". Agency AGN9809. PCC: To Be Discovered | Provided (Branch, Agency). To Be Discovered (PCC) | Intake | Whether Flynas NDC is assigned and active on BRN298: To Be Discovered (ANC-15) |
| Required permissions | Unknown | Unknown | — | |
| Test account availability | Agent account Mohanad Dawood | Provided | Intake | Credentials are held outside this repository and are never recorded here |

### 3b. API / Integration

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Integration layer base URL (per the Feature's declared `integrationLayer`; N/A when it declares none) | N/A | N/A | `module.json`: `integrationLayer: null` | The Feature declares no integration layer |
| Endpoint(s) | Application API base http://192.168.1.70:8080/odeysysadmin/v2/ | Provided | Intake | This is the application's own API, not an integration layer. The API layer is Out of Scope for run-006 |
| Authentication mechanism | Unknown | Unknown | — | |
| Supplier credential | "Fly Nas NDC EGY Staging" | Provided | Intake | Staging feed that misreports cabin labels (OQ-21 / OQ-25). A second credential, "Fly Nas KSA PRODUCTION (WARNING)", appeared in results. **Not used.** Must never be selected on this run (ANC-17) |
| Provider ID | Unknown | Unknown | — | |
| Environment availability | Unknown | Unknown | — | |
| Logs/observability access | Unknown | Unknown | — | |
| Swagger/OpenAPI/Postman availability | Unknown | Unknown | — | |
| Direct API access availability | Unknown | Unknown | — | API layer Out of Scope for run-006 |
| PCC / market | PCC: To Be Discovered. Market: EGY | To Be Discovered (PCC). Pending Confirmation (market) | Market is implied only by the credential name | §12 SUP-OQ-02 |

### 3c. Source / Target Environment Model (if applicable)

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Dual-environment execution required? | N/A | N/A | ExecutionFlow_HappyPath.md §1 rule 1 and §14. Profile §D | Ancillaries creates its booking inside its own flow. `ndc_execution_rules.md` §C1 does not apply |
| Source Environment (preparation/offline environment, if required) | N/A | N/A | Same as above | The Feature's execution flow requires no Source environment |
| Target Environment (the environment under test) | Admin panel http://192.168.1.70 → Booking-Mid Office → Flight Search (booking wizard). API base http://192.168.1.70:8080/odeysysadmin/v2/ | Provided | Intake, run-006 | |
| Feature-level Execution Flow reference (path, if one exists for this Feature) | `platform_core_data/supplier-features/ancillaries/context/ExecutionFlow_HappyPath.md` (rev 1) | Provided | Referenced, not duplicated (`ndc_execution_rules.md` §A1) | That flow puts the booking in the Portal. run-006 books in Admin. Recorded as a Supplier deviation (§4, SUP-OQ-07) |

## 4. UI / User Flow — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Screen/page name | Booking wizard (Flight Search) | Provided | Intake | |
| Entry/navigation path | Admin panel → Booking-Mid Office → Flight Search | Provided | Intake | Deviates from ExecutionFlow §3 (Portal Flight Search). SUP-OQ-07 |
| Required fields | To Be Discovered | To Be Discovered | — | |
| Supplier selection | To Be Discovered | To Be Discovered | — | Flight attribution to Flynas NDC needs evidence (ANC-20) |
| Supplier credential selection | "Fly Nas NDC EGY Staging" | Provided | Intake | Never "Fly Nas KSA PRODUCTION (WARNING)" |
| Branch/Agency/Agent fields (where applicable) | Branch BRN298. Agency AGN9809. Agent Mohanad Dawood | Provided | Intake | |
| Search/action buttons | To Be Discovered | To Be Discovered | — | |
| Expected successful flow | Per ExecutionFlow_HappyPath.md, executed on both Admin and Portal for run-006 | Provided | ExecutionFlow rev 1; human decision 2026-09-26 | SUP-OQ-07 |
| Expected failure behavior/messages | Duplicate-passenger guard: HTTP 409 when passenger names or document numbers are reused | Provided | Intake | Other failure messages: To Be Discovered |
| Loading/progress behavior | To Be Discovered | To Be Discovered | — | |
| Data displayed after retrieval | To Be Discovered | To Be Discovered | — | |
| UI validations | To Be Discovered | To Be Discovered | — | |
| Role/permission differences | Unknown | Unknown | — | |
| Known UI limitations | Cabin labels are misreported on staging. Multi-cabin labelling cannot be verified (TC-SM-CAB-007 environment-blocked) | Provided | Intake. OQ-21 / OQ-25 | |
| UI evidence/screenshots/designs available | Reference booking PNR S6GUFL (2026-09-19). Background: `context/ANCILLARIES-SEATMAP.md` | Provided | Intake. Feature-level background document | Background observations come from staging and predate intake. They are not Verified for this Supplier scope |

## 5. Test Data

### 5a. Generic Test Data — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| UI account/user | Agent Mohanad Dawood | Provided | Intake | No credentials are recorded here |
| Valid organization/branch | Branch BRN298 "Uplift2_Mohanad Dawood". Agency AGN9809 | Provided | Intake | |
| Valid happy-path test data | Route CAI→JED, flynas XY568 / XY566 (A320NEO). A future travel date | Provided | Intake. The travel date is kept in `C:/Users/Mohanad Dawood/Desktop/SeatMap/criteria.md` | The date must be in the future at execution time |
| Invalid/negative test data | To Be Discovered | To Be Discovered | — | |
| Multi-passenger data (if applicable) | Default mix: 1 adult + 1 child + 1 infant | Provided | Intake | Fresh passenger names and document numbers are needed on every booking run (HTTP 409 duplicate-passenger guard). Rule 62 needs 2 adults each holding an infant: not covered (SUP-OQ-05) |
| Multi-segment data (if applicable) | To Be Discovered | To Be Discovered | — | CAI→JED is single-segment, so it cannot tell segment-level from journey-level behavior (Profile §A). SUP-OQ-10 |
| Supplier-specific test data | Reference booking PNR S6GUFL (2026-09-19) | Provided | Intake | |

### 5b. Feature-Specific Test Data — INJECTED FROM FEATURE PROFILE

| Test Data Item | Why (Requirement ID) | Notes |
|---|---|---|
| Branch configured with the Supplier under test, active/available | ANC-14, ANC-15 | Precondition. Without it the execution is Blocked, not Failed |
| Supplier Credential / PCC / Market assigned to that Branch | ANC-16, ANC-17 | Record exactly which credential is used — never chosen arbitrarily |
| Admin user able to configure a Branch and assign a Supplier | ANC-14 | Actual role name To Be Discovered per Supplier |
| Portal user able to search, book, and select ancillaries | ANC-19, ANC-21 | May or may not be the same account as the Admin user — OQ-ANC-08 |
| A valid search route and date returning results from the Supplier under test | ANC-19, ANC-20 | Availability may depend on route / cabin / fare family — ANC-39, per-Supplier |
| A multi-segment journey (e.g. CAI to DXB to BKK) | ANC-10, ANC-11, ANC-12, ANC-13 | Required to tell Segment-level from Journey-level behavior. A single-segment route cannot distinguish them |
| Valid passenger data for the required passenger mix | ANC-21 | Passenger-type eligibility rules unknown at Feature level — OQ-ANC-06 |
| A fare/cabin on which ancillaries are actually offered | ANC-39 | Which fares expose ancillaries is a per-Supplier Discovery obligation, never assumed |
| Baggage-eligible booking `[gated: Baggage]` | ANC-23, ANC-29, ANC-37 | Only where Baggage is Supported for this Supplier |
| Meal-eligible booking `[gated: Meal]` | ANC-23, ANC-29, ANC-37 | Only where Meal is Supported for this Supplier |
| Seat-eligible booking `[gated: Seat]` | ANC-23, ANC-29, ANC-37 | Only where Seat is Supported. Exposing Seat claims no Seatmap scope — OQ-ANC-09 |
| Bundle-eligible booking `[gated: Bundle]` | ANC-23, ANC-29, ANC-37 | Only where Bundle is Supported. Exposing Bundle claims no Upselling scope — OQ-ANC-10 |
| A capability confirmed **Unsupported** for this Supplier | ANC-05 | Test data for the optional unsupported-capability confirmation case. Never a defect |
| Quantity/limit boundary data per supported capability | ANC-41 | Maximum baggage quantity, seat eligibility, bundle restrictions — values are per-Supplier, recorded from evidence, never invented |

### 5c. Feature Capability Matrix — INJECTED FROM FEATURE PROFILE (CONDITIONAL)

This section renders because `context/CapabilityModel.md` exists for Ancillaries. The dimensions and
vocabulary come from Capability Model rev 1, §2 and §3. **Capability Result for all four
capabilities was provided by human decision** (Human decision, Mohanad Dawood, 2026-09-26 (run-006)): `Supported`, Source Status `Provided` — not yet
Verified. Per Capability Model §8, cases may run, and each carries a **verification dependency** until
run-006 execution confirms or refutes the capability. Application Level and the other dimensions were
not provided and keep the absence default. Stage 2 Discovery was skipped by human authorization.

"Other dimensions" means UI visible · API data available · Price available · Currency returned ·
Passenger association · Flight association · Pricing basis · Availability timing · Restrictions.

| Capability | Capability Result | Source Status | Application Level | Source Status | Other dimensions (per the Feature's Capability Model) | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| Baggage | Supported | Provided | To Be Discovered | — | All To Be Discovered | To Be Discovered | Extra baggage cases in the supplied suite. Verification dependency until run-006 confirms |
| Meal | Supported | Provided | To Be Discovered | — | All To Be Discovered | To Be Discovered | Meal cases in the supplied suite. Verification dependency until run-006 confirms |
| Seat | Supported | Provided | To Be Discovered | — | All To Be Discovered | To Be Discovered | run-006 target. Seat map is in scope for run-006 by human decision (SUP-OQ-08); OQ-ANC-09 stays open at Feature level. Verification dependency until run-006 confirms |
| Bundle | Supported | Provided | To Be Discovered | — | All To Be Discovered | To Be Discovered | Bundle-gating cases in the supplied suite. Bundle/Upselling boundary: OQ-ANC-10. Verification dependency until run-006 confirms |

**Discrepancy records for this Supplier** — one block per contradicted value, appended, never
overwriting:

| Capability | Dimension | Provided Value | Discovery Finding | Final Verified Value | Evidence | Change Reason |
|---|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | N/A | No contradictions recorded. Nothing has been Provided or Discovered yet |

## 6. Contract / Mapping — GENERIC

The Contract, API, Integration and DB layers are Out of Scope for run-006 (§2b). The rows stay open
at Supplier level.

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Request shape | To Be Discovered | To Be Discovered | — | |
| Response shape | To Be Discovered | To Be Discovered | — | |
| Provider-specific fields | To Be Discovered | To Be Discovered | — | |
| Original ticketing date/time mapping (if applicable to this Feature) | N/A | N/A | — | Import-Booked-PNR concern (tier §C). Does not apply to Ancillaries |
| Booking status mapping | To Be Discovered | To Be Discovered | — | |
| Supplier status → platform status mapping | To Be Discovered | To Be Discovered | — | |
| Supplier identifier / provider routing | Unknown | Unknown | — | Provider ID is Unknown |
| Passenger mapping | To Be Discovered | To Be Discovered | — | |
| Passenger type mapping | To Be Discovered | To Be Discovered | — | |
| Segment mapping | To Be Discovered | To Be Discovered | — | |
| Fare/tax/currency mapping | To Be Discovered | To Be Discovered | — | OQ-ANC-01, OQ-ANC-05 |
| Ticket/coupon mapping | To Be Discovered | To Be Discovered | — | |
| Passenger ↔ ticket relationship | To Be Discovered | To Be Discovered | — | |
| Segment ↔ coupon relationship | To Be Discovered | To Be Discovered | — | |
| Baggage mapping | To Be Discovered | To Be Discovered | — | Gated on §5c Baggage |
| Ancillary/service mapping | To Be Discovered | To Be Discovered | — | |
| Known nullable/optional fields | To Be Discovered | To Be Discovered | — | |
| Fields required by the UI/business layer | To Be Discovered | To Be Discovered | — | |
| Differences from the old integration-layer mapping (if applicable) | N/A | N/A | `integrationLayer: null` | The Feature declares no integration layer |

## 7. Business / E2E Flow

### 7a. Table Structure — GENERIC

Behavior rows follow in §7b. Columns: Behavior · Inherited Requirement ID · Source Status (carried
unchanged from the Profile) · Supplier Applicability · Test Data Available? · Execution Layer ·
Status · Evidence/Notes. The four per-Supplier columns are filled during Discovery. Stage 2 was
skipped for run-006, so they read `To Be Discovered`.

### 7b. Behavior Rows — INJECTED FROM FEATURE PROFILE

| Behavior | Inherited Requirement ID | Source Status | Supplier Applicability | Test Data Available? | Execution Layer | Status | Evidence/Notes |
|---|---|---|---|---|---|---|---|
| Admin: Branch selected and Supplier assigned before execution | ANC-14, ANC-15 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Branch BRN298 supplied. Supplier assignment not yet evidenced |
| Admin: correct Supplier Credential / PCC / Market assigned and available | ANC-16 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Credential "Fly Nas NDC EGY Staging". PCC To Be Discovered. Market Pending Confirmation |
| Admin: the credential used is recorded exactly, never chosen arbitrarily | ANC-17 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | "Fly Nas KSA PRODUCTION (WARNING)" is visible and must not be used |
| Full execution context recorded (Supplier, Credential, PCC, Market, Branch, Agency, Environment, User) | ANC-18 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Admin and Portal access details recorded **independently** | ANC-26 | Confirmed as a rule; whether they share one environment is Open — OQ-ANC-08 | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Recorded apart in §3a |
| Portal: valid flight search performed | ANC-19 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | For run-006 the search runs in both Admin and Portal. SUP-OQ-07 |
| Portal: selected flight is from the Supplier under test, with attribution evidence | ANC-20 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Portal: PAX Details entered with valid passenger information | ANC-21 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Fresh names and document numbers per run (HTTP 409) |
| Ancillaries section opens, and intake-recorded capability information is **verified** there rather than re-determined | ANC-22 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | No capability values were recorded at intake (§5c) |
| A live-behavior difference from a Provided value produces a discrepancy record, never a silent overwrite | ANC-08, ANC-22 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Only Supported capabilities are exercised | ANC-23 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | All four capabilities Supported + Provided (not Verified) for run-006. SUP-OQ-09 |
| Available ancillary options recorded **before** selection | ANC-27 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Baggage selection behaves at this Supplier's recorded application level `[gated: Baggage]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Gated on §5c Baggage |
| Meal selection behaves at this Supplier's recorded application level `[gated: Meal]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Gated on §5c Meal |
| Seat selection behaves at this Supplier's recorded application level `[gated: Seat]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Gated on §5c Seat. run-006 target |
| Bundle selection behaves at this Supplier's recorded application level `[gated: Bundle]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Gated on §5c Bundle |
| Different capabilities may use different application levels within one Supplier | ANC-12 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| A capability confirmed Unsupported is a recorded fact, not a product defect | ANC-05 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Booking flow completes after ancillary selection | ANC-24 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Completing a booking debits the agency wallet. Group Q needs per-run sign-off (SUP-OQ-06) |
| Selected ancillary data preserved through booking | ANC-25 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Reference booking S6GUFL (2026-09-19) |
| Selected ancillary data reflected in downstream booking details | ANC-25 | **Open** — the "where applicable" set is undefined (OQ-ANC-04). Do not assert an expected result for an unlisted screen | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Validation across all six checkpoints (Selection UI, Fare Breakdown, Booking Request, Supplier Confirmation, Persisted Booking, Itinerary) | ANC-31 | Confirmed where the checkpoint is observable | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | The Booking Request and Supplier Confirmation checkpoints sit on API/Integration layers, which are Out of Scope for run-006 |
| Each selected ancillary classified per checkpoint using the five-value model | ANC-32 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Per-checkpoint checks: passenger, segment/journey, type, quantity, price, currency, total, persisted status | ANC-33 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Ancillary pricing captured separately from base flight price, at all three points | ANC-34, ANC-35 | Confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Final booking amount validated against the confirmed pricing contract | ANC-36 | **Open** — the pricing contract is undefined (OQ-ANC-01). Do not assert an expected total, and do not defect an arithmetic mismatch on the simple formula alone | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Wallet or payment validation on ancillary selection | — | **Open** — OQ-ANC-02. Not known to exist. Its absence is not a defect | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Intake says completed bookings debit the agency wallet. That is a debit at booking, not evidence of validation at selection. OQ-ANC-02 stays Open |
| Change or removal of a selected ancillary, before or after booking | — | **Open** — OQ-ANC-03. No coverage designed until confirmed | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Currency handling when credential market currency differs from booking currency | ANC-28, ANC-33 | **Open** — OQ-ANC-05 | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Credential market (EGY) is Pending Confirmation |
| Bundle interaction with individually selected capabilities `[gated: Bundle]` | — | **Open** — OQ-ANC-07. Whether a Bundle includes, excludes, or coexists with separate selections is undefined | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Gated on §5c Bundle |

The Profile deliberately has no universal happy-path row. Every capability row is gated (ANC-01).
Flynas NDC's composite outcome is built from its own Supported capabilities once §5c is resolved.

### 7c. Supplier-Specific Rules — GENERIC

Feature-level rules (exit rows, infants, children, seat sets, cabin × bundle coverage) apply to every
Supplier. Only the rules below belong to Flynas NDC.

| Rule | Relation to Feature rules | Applies to | Expected behavior | Source | Status |
|---|---|---|---|---|---|
| Female-designated (ladies-only) seats (`BUSINESS_DOMAIN.md` rules 40, 50) | Adds — not a Feature rule | Male adults and male children (Title `Mr`) | Seat not offered to them; offered to female travellers (`Ms`/`Mrs`) | Human decision, Mohanad Dawood, 2026-09-27; observed in run-006 (TC-SM-GEN-001/002/002b/004) | Confirmed |

## 8. Error Handling

The Feature declares no integration layer, so the "Integration Layer Behavior" column is N/A
throughout.

### 8a. Generic Cross-Feature Error Categories — GENERIC

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Invalid request | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | A duplicate passenger returns HTTP 409 (intake). Whether the Supplier or the application raises it: To Be Discovered |
| Supplier timeout | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | |
| Supplier unavailable | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | |
| Authentication failure | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | |
| Malformed response | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | |
| Partial response | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | |
| Unexpected supplier response | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | The staging feed misreports cabin labels (OQ-21 / OQ-25). Treat these as staging artifacts, not defects |
| Integration-layer normalized error (N/A where the Feature declares no integration layer) | N/A | N/A | N/A | N/A | N/A | `integrationLayer: null` |

### 8b. Feature-Specific Error Rows — INJECTED FROM FEATURE PROFILE

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Supplier not assigned to the Branch | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-15. Execution is **Blocked**, not Failed — a configuration gap is not an Ancillaries defect |
| Required Supplier Credential / PCC / Market missing for the Branch | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-16. Blocked, same reasoning |
| Search returns no results from the Supplier under test | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-19, ANC-20. Cannot proceed; the run did not test the Supplier in scope |
| A flight from a different Supplier was selected | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-20. **Invalidates the execution.** Not a defect and not a partial pass — discard and repeat with correct attribution |
| Ancillaries section does not open, or exposes nothing | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-22. Record against the capability matrix. Where every capability is `Unsupported`, this is expected behavior, not an error |
| A capability recorded as Supported is not exposed live | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-08, ANC-22. Produces a discrepancy record; whether it is a defect depends on whether the Provided value was authoritative |
| A capability recorded as Unsupported **is** exposed live | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-08, ANC-22. Discrepancy record. Not a defect — the recorded value was incomplete |
| Selection rejected by a Supplier restriction (quantity, eligibility, passenger type, route, fare family) | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-41. Expected behavior where the restriction is confirmed. Restrictions are recorded from evidence, never invented, so an unconfirmed rejection is an observation first |
| Selected ancillary missing after booking | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-25, ANC-32. Classified as `Missing` at the failing checkpoint |
| Price or currency mismatch across checkpoints | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | ANC-33, ANC-36. Record as an observation against OQ-ANC-01 until the pricing contract is confirmed |
| Supplier error or timeout during ancillary retrieval or booking | To Be Discovered | N/A | To Be Discovered | To Be Discovered | To Be Discovered | Requirement ID: —. Flagged: no requirement defines an expected error contract for this Feature. Record the Supplier behavior as observed during Discovery. Do not assume a normalized error shape |

## 9. Historical / Comparison Evidence — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Old integration-layer implementation available for this supplier? | N/A | N/A | `integrationLayer: null` | |
| Same booking retrievable through both old and new paths? | N/A | N/A | — | There is no old/new path pair for this Feature |
| Old UI behavior | Unknown | Unknown | — | |
| Old API payload | N/A | N/A | — | API layer Out of Scope for run-006 |
| Existing supplier payload examples | Unknown | Unknown | — | |
| Existing Postman/Swagger/API documentation | Unknown | Unknown | — | |
| Existing test cases | `C:/Users/Mohanad Dawood/Desktop/SeatMap/TESTCASES-SEATMAP-v7-simple.xlsx`, 101 cases | Provided | Intake, run-006 | Supplied directly. Stages 2 and 3 were skipped by human authorization |
| Existing Azure test cases (if available) | Unknown | Unknown | — | |
| Existing logs/screenshots/test evidence | Reference booking PNR S6GUFL (2026-09-19, Portal) | Provided | Intake | |
| Existing production/UAT evidence | Unknown | Unknown | — | Only staging evidence is known |
| Known accepted differences | Unknown | Unknown | — | |
| Known migration differences | N/A | N/A | — | No integration-layer migration applies |
| Historical supplier limitations | The staging feed misreports cabin labels | Provided | BUSINESS_DOMAIN OQ-21 / OQ-25 | |

## 10. Automation Feasibility — GENERIC

run-006 is Stage 4M manual execution. This section assesses feasibility only. It does not authorize
automation.

### 10a. UI Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Framework available | Unknown | Unknown | — | |
| Stable locators | To Be Discovered | To Be Discovered | — | |
| Test-user availability | Agent Mohanad Dawood | Provided | Intake | |
| Environment stability | Unknown | Unknown | — | |
| Test-data repeatability | Limited: fresh passenger names and document numbers on every booking run. The future travel date must be maintained | Provided | Intake. HTTP 409 duplicate-passenger guard | |
| Destructive-action risk | High: group Q cases complete real bookings and debit the agency wallet | Provided | Intake. `execution_safety_policy.json` | Each group Q case needs per-run sign-off. SUP-OQ-06 |
| Cleanup/reset capability | Unknown | Unknown | — | |

### 10b. API Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Endpoint callable directly | N/A | N/A | — | API layer Out of Scope for run-006 |
| Authentication automatable | N/A | N/A | — | API layer Out of Scope for run-006 |
| Test data reusable | N/A | N/A | — | API layer Out of Scope for run-006 |
| Request generation possible | N/A | N/A | — | API layer Out of Scope for run-006 |
| Response assertions possible | N/A | N/A | — | API layer Out of Scope for run-006 |
| Mocking/stubbing available | N/A | N/A | — | API layer Out of Scope for run-006 |
| Supplier dependency controllable | N/A | N/A | — | API layer Out of Scope for run-006 |

### 10c. E2E Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Can supplier calls be executed safely? | Pending Confirmation | Pending Confirmation | — | Search and quote only. A completed booking debits the wallet |
| Can real supplier responses be used? | Yes, from the staging feed | Provided | Intake | Staging labels are unreliable (OQ-21 / OQ-25) |
| Can wallet effects be verified? | Unknown | Unknown | — | |
| Can database effects be verified? | N/A | N/A | — | DB layer Out of Scope for run-006 |
| Can booking persistence be verified? | To Be Discovered | To Be Discovered | — | |
| Can cleanup/reset be performed? | Unknown | Unknown | — | |
| Can tests run repeatedly? | Only with fresh passenger data and a current future date | Provided | Intake | |
| Parallel/concurrency feasibility | Unknown | Unknown | — | |
| External supplier limitations | Exit-row availability depends on each flight's inventory. Cabin labels are misreported on staging | Provided | Intake | |

## 11. Discovery Contacts / Ownership — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Developer/contact responsible for supplier integration | Unknown | Unknown | — | |
| Person who can confirm API contract/mapping | Unknown | Unknown | — | |
| Person who can confirm business behavior | Unknown | Unknown | — | |
| Person who can confirm UI behavior | Unknown | Unknown | — | |
| Person who can provide supplier test data | Unknown | Unknown | — | |
| Person who can provide environment/access | Unknown | Unknown | — | |
| Other relevant owner/contact | Mohanad Dawood: Supplier scope approver and run-006 creator | Provided | `supplier.json`, run-006 `run.json` | |

## 12. Open Questions — GENERIC + INJECTED

**Supplier-level (Flynas NDC):**

| # | Open Question | Category | Status | Owner | Evidence/Source | Notes |
|---|---|---|---|---|---|---|
| SUP-OQ-01 | What is the Provider ID for Flynas NDC? | Missing access | Unknown | Unknown | Intake | §1, §3b |
| SUP-OQ-02 | Which PCC and market does "Fly Nas NDC EGY Staging" use? The EGY market is implied only by the name | Environment issue | Pending Confirmation | Unknown | Intake | §3b. ANC-16, ANC-17 |
| SUP-OQ-03 | Exit-row rules (children, infant-holders) cannot be verified: exit rows are blocked for every passenger on current inventory | Environment issue | Blocked | Unknown | Intake | Rules 36 and 37 |
| SUP-OQ-04 | Multi-cabin labelling cannot be verified on staging (TC-SM-CAB-007 environment-blocked) | Environment issue | Blocked | Unknown | Intake. BUSINESS_DOMAIN OQ-21 / OQ-25 | |
| SUP-OQ-05 | Rule 62 (seat sets) is not covered by the supplied suite. Should coverage be added? It needs 2 adults each holding an infant. Answered 2026-09-27: `TC-SM-PAX-008` added and run; the seat map does not block it, and the airline enforcing it at booking is accepted (human decision) — not yet confirmed with a real booking | Missing test data | Confirmed | Unknown | Intake | §2, §5a |
| SUP-OQ-06 | Group Q cases complete real bookings and debit the agency wallet. Each needs per-run sign-off under `execution_safety_policy.json` | Business decision required | Pending Confirmation | Mohanad Dawood | Intake | Not blanket-authorized. Sign-off is recorded per run |
| SUP-OQ-07 | run-006 books through the Admin panel (Booking-Mid Office → Flight Search). The Feature Execution Flow puts the booking in the Portal, and the 2026-09-19 bookings used the Portal. Which application is authoritative for this Supplier? | UI behavior | Answered (run-006) | Mohanad Dawood | Intake. ExecutionFlow_HappyPath.md §1 | Answered for run-006: execute on **both** Admin and Portal (Human decision, Mohanad Dawood, 2026-09-26 (run-006)). Admin precheck (ExecutionFlow §2) still runs first. Feature-level OQ-ANC-08 stays open |
| SUP-OQ-08 | run-006 targets Seat Map under Ancillaries, while the Seat/Seatmap boundary (OQ-ANC-09) is deferred by decision | Business decision required | Answered (run-006) | Mohanad Dawood | run-006 `run.json`. CapabilityModel §10 | Answered for run-006: the seat map is in scope (Human decision, Mohanad Dawood, 2026-09-26 (run-006)). Run decision only; OQ-ANC-09 stays open at Feature level |
| SUP-OQ-09 | Every §5c capability is To Be Discovered, and Stage 2 was skipped. Capability Model §8 keeps coverage blocked or pending for To Be Discovered capabilities, yet the supplied suite runs under human authorization | Business decision required | Answered (run-006) | Mohanad Dawood | CapabilityModel §8. run-006 | Answered for run-006: all four capabilities recorded Supported + Provided (Human decision, Mohanad Dawood, 2026-09-26 (run-006)); cases carry a verification dependency |
| SUP-OQ-10 | Multi-segment test data for Flynas NDC | Missing test data | To Be Discovered | Unknown | Profile §A | CAI→JED cannot tell segment-level from journey-level behavior |
| SUP-OQ-11 | Admin role name and required permissions | Missing access | To Be Discovered | Unknown | Profile §A, ANC-14 | |
| SUP-OQ-12 | API, Contract, Integration, DB, Security and Performance details (auth, logs, Swagger, mappings) | Unknown contract behavior | N/A | Unknown | run-006 `testingLayerScope` | Out of Scope for run-006. Open at Supplier level for a future run |

**Feature-level (injected from the Profile's "Open Questions carried from the shared context"):**

| # | Open Question | Category | Status | Owner | Evidence/Source | Notes |
|---|---|---|---|---|---|---|
| OQ-ANC-01 | What is the confirmed ancillary pricing contract? Which of taxes, fees, markup, commission, discount, bundle pricing sit between ancillary amounts and the final total? | Business decision required | Open | Unknown | ProjectContext §8, OQ-ANC-01 | Affects: §B pricing rows, §C price-mismatch row |
| OQ-ANC-02 | Does ancillary selection trigger wallet or payment validation? | Unconfirmed supplier behavior | Open | Unknown | ProjectContext §8, OQ-ANC-02 | Affects: §B wallet row |
| OQ-ANC-03 | Can a selected ancillary be changed or removed, before or after booking? | Business decision required | Open | Unknown | ProjectContext §8, OQ-ANC-03 | Affects: §B change/removal row |
| OQ-ANC-04 | Which downstream representations must reflect ancillaries? | Business decision required | Open | Unknown | ProjectContext §8, OQ-ANC-04 | Affects: §B downstream row, ANC-25 completion criteria |
| OQ-ANC-05 | Currency handling when credential market currency differs from booking currency | Mapping decision | Open | Unknown | ProjectContext §8, OQ-ANC-05 | Affects: §B currency row |
| OQ-ANC-06 | Are passenger-type eligibility rules global, or purely per-Supplier? | Business decision required | Open | Unknown | ProjectContext §8, OQ-ANC-06 | Affects: §A passenger data row, §C restriction row |
| OQ-ANC-07 | Do Bundle and individual capabilities conflict? | Business decision required | Open | Unknown | ProjectContext §8, OQ-ANC-07 | Affects: §B Bundle interaction row |
| OQ-ANC-08 | Are Admin and Portal the same environment and tenant? Same login? | Environment issue | Open | Unknown | ProjectContext §8, OQ-ANC-08 | Affects: §A user rows, §B independent-recording row, §D URL row. See SUP-OQ-07 |
| OQ-ANC-09 | Seat / Seatmap boundary — deferred by decision | Business decision required | Open — deferred by decision | Unknown | ProjectContext §8, OQ-ANC-09. CapabilityModel §10 | Affects: §A and §B Seat rows. See SUP-OQ-08 |
| OQ-ANC-10 | Bundle / Upselling boundary — deferred by decision | Business decision required | Open — deferred by decision | Unknown | ProjectContext §8, OQ-ANC-10. CapabilityModel §10 | Affects: §A and §B Bundle rows |
| OQ-ANC-11 | Which integration/backend path does Ancillaries use? `integrationLayer` stays `null` | Unknown contract behavior | Open | Unknown | ProjectContext §8, OQ-ANC-11 | Keeps `ndc_execution_rules.md` §B inactive for this Feature |

Feature-level UI notes that sit alongside these questions are in the Feature Checklist Profile §D.
They are referenced here, not copied.

## 13. Intake Decision — GENERIC

> **The Intake Decision does not gate Supplier scope or run creation.** "Blocked from Discovery"
> means the Supplier scope/run may still exist — it means meaningful Discovery cannot proceed until
> the recorded blocker(s) below are resolved. Blockers are tracked here and in §12, not used to
> refuse creating the scope.

| Field | Value |
|---|---|
| Decision | Ready with known blockers |
| Reason | Target environment, credential, Branch/Agency, route and passenger mix were supplied. Stages 2 and 3 were skipped by human authorization for run-006, so every §5c capability is still To Be Discovered |
| Blocking items (if any) | SUP-OQ-03 exit-row rules (Blocked). SUP-OQ-04 multi-cabin labelling, TC-SM-CAB-007 (Blocked). SUP-OQ-05 rule 62 answered 2026-09-27 (`TC-SM-PAX-008`). SUP-OQ-06 group Q wallet-debiting bookings need per-run sign-off (Pending Confirmation) |
| Recorded by | Rendering agent (Claude), for Mohanad Dawood. Human review Pending Confirmation |
| Date | 2026-09-26 |
