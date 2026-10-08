# Supplier Checklist — AirIndia

**Scope family:** Supplier Features → Feature → Supplier
**Feature:** Ancillaries (`ancillaries`)
**Integration Layer:** ndc-core-service <!-- Feature metadata, set 2026-09-23 on AirIndia onboarding evidence — not an owner -->
**Supplier:** AirIndia (`air-india`)
**Status:** Draft
**Revision:** 2
**Last Updated:** 2026-09-25
**Produced by run:** `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia`
**Rendered from Feature Profile:** `platform_core_data/supplier-features/ancillaries/context/FeatureChecklistProfile.md` (revision 2, Approved)

### Revision History

| Rev | Date | Changed By | What Changed | Why / Evidence |
|---|---|---|---|---|
| 1 | 2026-09-23 | Ahmed Alhussieny (via intake conversation) | Initial intake | Supplier onboarding for AirIndia under the Ancillaries Feature |
| 2 | 2026-09-25 | Ahmed Alhussieny (via Stage 1 revision conversation) | Added Bundle as a Supported capability; resolved after-booking change/removal (now confirmed Not Permitted) and downstream-representation open items via shared baseline ANC-52/ANC-53 | Correction supplied while revising the Stage 1 Project Context before approval |

---

> A Supplier scope is the **complete QA ownership boundary** for this Feature + Supplier
> implementation:
>
> ```
> Application UI
>     ↓
> Application
>     ↓
> Integration Layer  (ndc-core-service)
>     ↓
> Supplier
> ```
>
> This checklist captures only **supplier-specific** information. Shared Feature business
> requirements are owned by `shared/ancillaries-baseline/context/ProjectContext.md` (rev 2, Approved
> 2026-09-23) — Supplier-specific Test Cases must trace back to the relevant `ANC-xx` requirement IDs.

## 1. Supplier Identity — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Supplier name | AirIndia | Confirmed | Intake, 2026-09-23 | |
| Provider ID / code | To Be Discovered | To Be Discovered | — | Not supplied at intake |
| Integration type (if known) | NDC — connected as a source through the platform's `ndc-core-service` integration layer | Provided | Ahmed Alhussieny, intake 2026-09-23 | Resolved the Feature-level OQ-ANC-11; `integrationLayer` set to `ndc-core-service` on this evidence |
| Airline/GDS scope (if applicable) | Air India (airline), NDC direct/source connection | Provided | Ahmed Alhussieny, intake 2026-09-23 | GDS routing detail not further specified |

## 2. Supplier Scope — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Feature capability being implemented | Ancillaries — Baggage, Meal, and Bundle | Provided | Ahmed Alhussieny, 2026-09-23 (Baggage/Meal) and 2026-09-25 (Bundle) | Seat recorded as Unsupported for this Supplier at this time — see §5c |
| Supported booking/use cases | To Be Discovered | To Be Discovered | — | |
| Known exclusions | Seat (not supported at this time) | Provided | Ahmed Alhussieny, intake 2026-09-23 | Not a defect — ANC-05 |
| Known supplier limitations | To Be Discovered | To Be Discovered | — | |
| UI scope included? | Yes | Provided | Intake 2026-09-23 | |
| API scope included? | Yes | Provided | Intake 2026-09-23 | |
| Contract scope included? | Yes | Provided | Intake 2026-09-23 | |
| Integration scope included? | Yes | Provided | Intake 2026-09-23 | |
| E2E scope included? | Yes | Provided | Intake 2026-09-23 | |
| Regression against previous integration required? | Yes | Provided | Intake 2026-09-23 | |
| DB validation applicable? | Deferred | Provided | Intake 2026-09-23 | Not named among the six layers given at intake; not confirmed as a deliberate exclusion — see §2b |
| Security testing applicable? | Deferred | Provided | Intake 2026-09-23 | Same as above |
| Performance testing applicable? | Deferred | Provided | Intake 2026-09-23 | Same as above |

## 2b. Testing Layer Scope — GENERIC

| Layer | In Scope / Out of Scope / Deferred | Reason (mandatory if not In Scope) | Notes |
|---|---|---|---|
| UI | In Scope | | Manual execution pipeline (Stage 4M) |
| API | In Scope | | |
| Contract | In Scope | | |
| Integration | In Scope | | |
| E2E | In Scope | | |
| Regression | In Scope | | |
| DB | Deferred | Not named among the layers given at AirIndia intake (2026-09-23); capability gap pending clarification, not a deliberate exclusion | Confirm at Discovery whether DB validation applies |
| Security | Deferred | Same reason | Confirm at Discovery |
| Performance | Deferred | Same reason | Confirm at Discovery |

## 3. Environment & Access — GENERIC

### 3a. UI

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Application URL/environment | **Redacted from version control** — provided directly by Ahmed Alhussieny during intake (2026-09-23) | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | Obtain from reviewer or the project's secrets store when executing. Two applications: Admin and Portal, each with its own URL — ANC-51 |
| Required role/user | Admin: Ahmed Alhussieny's Admin account. Portal: Agency-linked user (Agency code redacted) | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | Actual role name To Be Discovered |
| Navigation/menu availability | To Be Discovered | To Be Discovered | — | |
| Supplier configuration visibility | To Be Discovered | To Be Discovered | — | |
| Branch/Agency/PCC setup | Agency code provided, redacted from version control | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | Obtain from reviewer when executing |
| Required permissions | To Be Discovered | To Be Discovered | — | |
| Test account availability | Confirmed available | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | Admin and Portal accounts both provided, credentials redacted |

### 3b. API / Integration

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Integration layer base URL | To Be Discovered | To Be Discovered | — | `ndc-core-service` base URL not yet supplied |
| Endpoint(s) | To Be Discovered | To Be Discovered | — | |
| Authentication mechanism | To Be Discovered | To Be Discovered | — | |
| Supplier credential | Redacted from version control | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | Same Portal credential set noted in §3a |
| Provider ID | To Be Discovered | To Be Discovered | — | Same as §1 Provider ID/code |
| Environment availability | Confirmed reachable (internal test environment) | Provided | Ahmed Alhussieny, intake 2026-09-23 | |
| Logs/observability access | To Be Discovered | To Be Discovered | — | |
| Swagger/OpenAPI/Postman availability | To Be Discovered | To Be Discovered | — | |
| Direct API access availability | To Be Discovered | To Be Discovered | — | |

### 3c. Source / Target Environment Model (if applicable)

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Dual-environment execution required? | N/A | Confirmed | ANC-51, ProjectContext §4 | Ancillaries does not inherit Import Booked PNR's Source/Target model |
| Source Environment (preparation/offline environment, if required) | N/A | N/A | — | |
| Target Environment (the environment under test) | Admin + Portal, same environment/tenant, two URLs — see §3a | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | |
| Feature-level Execution Flow reference (path, if one exists for this Feature) | `platform_core_data/supplier-features/ancillaries/context/ExecutionFlow_HappyPath.md` | Confirmed | FeatureChecklistProfile.md Sources | |

## 4. UI / User Flow — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Screen/page name | To Be Discovered | To Be Discovered | — | Discovery to confirm against live Admin/Portal |
| Entry/navigation path | To Be Discovered | To Be Discovered | — | |
| Required fields | To Be Discovered | To Be Discovered | — | |
| Supplier selection | To Be Discovered | To Be Discovered | — | |
| Supplier credential selection | To Be Discovered | To Be Discovered | — | |
| Branch/Agency/Agent fields (where applicable) | Agency code provided, redacted | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | |
| Search/action buttons | To Be Discovered | To Be Discovered | — | |
| Expected successful flow | To Be Discovered | To Be Discovered | — | |
| Expected failure behavior/messages | To Be Discovered | To Be Discovered | — | |
| Loading/progress behavior | To Be Discovered | To Be Discovered | — | |
| Data displayed after retrieval | To Be Discovered | To Be Discovered | — | |
| UI validations | To Be Discovered | To Be Discovered | — | |
| Role/permission differences | To Be Discovered | To Be Discovered | — | |
| Known UI limitations | To Be Discovered | To Be Discovered | — | |
| UI evidence/screenshots/designs available | To Be Discovered | To Be Discovered | — | |

## 5. Test Data

### 5a. Generic Test Data — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| UI account/user | Provided, redacted (§3a) | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | |
| Valid organization/branch | Agency code provided, redacted | Provided (redacted) | Ahmed Alhussieny, intake 2026-09-23 | |
| Valid happy-path test data | To Be Discovered | To Be Discovered | — | |
| Invalid/negative test data | To Be Discovered | To Be Discovered | — | |
| Multi-passenger data (if applicable) | To Be Discovered | To Be Discovered | — | |
| Multi-segment data (if applicable) | To Be Discovered | To Be Discovered | — | Required to distinguish Segment- vs Journey-level behavior (ANC-10…13) |
| Supplier-specific test data | To Be Discovered | To Be Discovered | — | |

### 5b. Feature-Specific Test Data — INJECTED FROM FEATURE PROFILE

| Test Data Item | Why (Requirement ID) | Notes |
|---|---|---|
| Branch configured with AirIndia under test, active/available | ANC-14, ANC-15 | Precondition. Without it the execution is Blocked, not Failed |
| Supplier Credential / PCC / Market assigned to that Branch | ANC-16, ANC-17 | Credential provided, redacted — see §3a/§3b |
| Admin user able to configure a Branch and assign AirIndia | ANC-14 | Actual role name To Be Discovered |
| Portal user able to search, book, and select ancillaries | ANC-19, ANC-21 | Agency-linked Portal user provided, redacted |
| A valid search route and date returning results from AirIndia | ANC-19, ANC-20 | To Be Discovered |
| A multi-segment journey (e.g. CAI to DXB to BKK) | ANC-10, ANC-11, ANC-12, ANC-13 | To Be Discovered |
| Valid passenger data for the required passenger mix | ANC-21 | Adult/Child only per platform-wide default ANC-49 — Infant eligibility not applicable |
| A fare/cabin on which ancillaries are actually offered | ANC-39 | To Be Discovered |
| Baggage-eligible booking `[gated: Baggage]` | ANC-23, ANC-29, ANC-37 | **Active for AirIndia** — Baggage is Supported |
| Meal-eligible booking `[gated: Meal]` | ANC-23, ANC-29, ANC-37 | **Active for AirIndia** — Meal is Supported |
| Seat-eligible booking `[gated: Seat]` | ANC-23, ANC-29, ANC-37 | **N/A for AirIndia** — Seat is Unsupported |
| Bundle-eligible booking `[gated: Bundle]` | ANC-23, ANC-29, ANC-37 | **Active for AirIndia** — Bundle is Supported (added 2026-09-25) |
| A capability confirmed **Unsupported** for this Supplier | ANC-05 | Seat — optional unsupported-capability confirmation case available |
| Quantity/limit boundary data per supported capability | ANC-41 | To Be Discovered — Baggage, Meal, and Bundle |

### 5c. Feature Capability Matrix — INJECTED FROM FEATURE PROFILE (CONDITIONAL)

| Capability | Capability Result | Source Status | Application Level | Source Status | Other dimensions | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| Baggage | Supported | Provided | Per Journey | Provided (inherited from platform default ANC-48) | UI visible: To Be Discovered · API data available: To Be Discovered · Price available: To Be Discovered · Currency returned: To Be Discovered · Passenger association: To Be Discovered (eligibility default ADT/CHD only, ANC-49) · Flight association: Journey · Pricing basis: To Be Discovered · Availability timing: To Be Discovered · Restrictions: To Be Discovered | Ahmed Alhussieny, intake 2026-09-23 | Application Level is the platform default; Discovery still verifies AirIndia's actual behavior per ANC-13 |
| Meal | Supported | Provided | Per Segment | Provided (inherited from platform default ANC-48) | UI visible: To Be Discovered · API data available: To Be Discovered · Price available: To Be Discovered · Currency returned: To Be Discovered · Passenger association: To Be Discovered (eligibility default ADT/CHD only, ANC-49) · Flight association: Segment · Pricing basis: To Be Discovered · Availability timing: To Be Discovered · Restrictions: To Be Discovered | Ahmed Alhussieny, intake 2026-09-23 | Application Level is the platform default; Discovery still verifies AirIndia's actual behavior per ANC-13 |
| Seat | Unsupported | Provided | N/A | — | N/A | Ahmed Alhussieny, intake 2026-09-23 ("baggage and meal only for now") | Not a defect — ANC-05. May change in future |
| Bundle | Supported | Provided | To Be Discovered | — | UI visible: To Be Discovered · API data available: To Be Discovered · Price available: To Be Discovered · Currency returned: To Be Discovered · Passenger association: To Be Discovered (eligibility default ADT/CHD only, ANC-49) · Flight association: To Be Discovered · Pricing basis: To Be Discovered · Availability timing: To Be Discovered · Restrictions: To Be Discovered | Ahmed Alhussieny, 2026-09-25 | Added 2026-09-25 (correction to the initial "baggage and meal only" intake). No platform-wide Application Level default exists for Bundle (ANC-48 covers only Baggage/Meal) — Discovery must establish it for AirIndia, not assume one. Coexists with individually selected capabilities per ANC-50 |

**Discrepancy records for this Supplier** — one block per contradicted value, appended, never
overwriting:

| Capability | Dimension | Provided Value | Discovery Finding | Final Verified Value | Evidence | Change Reason |
|---|---|---|---|---|---|---|
| *(appended during Discovery; empty until a contradiction is found)* | | | | | | |

## 6. Contract / Mapping — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Request shape | To Be Discovered | To Be Discovered | — | |
| Response shape | To Be Discovered | To Be Discovered | — | |
| Provider-specific fields | To Be Discovered | To Be Discovered | — | |
| Original ticketing date/time mapping (if applicable to this Feature) | N/A | N/A | — | Not applicable to Ancillaries |
| Booking status mapping | To Be Discovered | To Be Discovered | — | |
| Supplier status → platform status mapping | To Be Discovered | To Be Discovered | — | |
| Supplier identifier / provider routing | To Be Discovered | To Be Discovered | — | |
| Passenger mapping | To Be Discovered | To Be Discovered | — | |
| Passenger type mapping | Adult/Child only, per platform default (ANC-49) | Provided | Ahmed Alhussieny, intake 2026-09-23 | Subject to Discovery verification |
| Segment mapping | To Be Discovered | To Be Discovered | — | |
| Fare/tax/currency mapping | ROE-based conversion, Supplier price × ROE (ANC-42); taxes/fees per offer from Supplier (ANC-43) | Provided | Ahmed Alhussieny, intake 2026-09-23 | Platform-wide rule, see shared baseline §6.8 |
| Ticket/coupon mapping | To Be Discovered | To Be Discovered | — | |
| Passenger ↔ ticket relationship | To Be Discovered | To Be Discovered | — | |
| Segment ↔ coupon relationship | To Be Discovered | To Be Discovered | — | |
| Baggage mapping | Applied per Journey (platform default, ANC-48) | Provided | Ahmed Alhussieny, intake 2026-09-23 | Subject to Discovery verification |
| Ancillary/service mapping | Meal applied per Segment (platform default, ANC-48) | Provided | Ahmed Alhussieny, intake 2026-09-23 | Subject to Discovery verification |
| Known nullable/optional fields | To Be Discovered | To Be Discovered | — | |
| Fields required by the UI/business layer | To Be Discovered | To Be Discovered | — | |
| Differences from the old integration-layer mapping (if applicable) | To Be Discovered | To Be Discovered | — | |

## 7. Business / E2E Flow

### 7a. Table Structure — GENERIC

*(see 7b for injected rows)*

### 7b. Behavior Rows — INJECTED FROM FEATURE PROFILE

| Behavior | Inherited Requirement ID | Supplier Applicability | Test Data Available? | Execution Layer | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Admin: Branch selected and Supplier assigned before execution | ANC-14, ANC-15 | Applicable | To Be Discovered | UI | Confirmed | |
| Admin: correct Supplier Credential / PCC / Market assigned and available | ANC-16 | Applicable | Yes (redacted) | UI | Confirmed | |
| Admin: the credential used is recorded exactly, never chosen arbitrarily | ANC-17 | Applicable | Yes (redacted) | UI | Confirmed | |
| Full execution context recorded (Supplier, Credential, PCC, Market, Branch, Agency, Environment, User) | ANC-18 | Applicable | Yes (redacted) | UI | Confirmed | |
| Admin and Portal access details recorded independently | ANC-26 | Applicable — confirmed same environment, two URLs/credential sets (ANC-51) | Yes (redacted) | UI | Confirmed | |
| Portal: valid flight search performed | ANC-19 | Applicable | To Be Discovered | UI | Confirmed | |
| Portal: selected flight is from AirIndia, with attribution evidence | ANC-20 | Applicable | To Be Discovered | UI | Confirmed | |
| Portal: PAX Details entered with valid passenger information | ANC-21 | Applicable — Adult/Child only | To Be Discovered | UI | Confirmed | |
| Ancillaries section opens, and intake-recorded capability information is verified there | ANC-22 | Applicable | To Be Discovered | UI | Confirmed | Verify Baggage/Meal Supported, Seat/Bundle Unsupported |
| A live-behavior difference from a Provided value produces a discrepancy record | ANC-08, ANC-22 | Applicable | — | UI | Confirmed | |
| Only Supported capabilities are exercised | ANC-23 | Applicable — Baggage, Meal only | — | UI | Confirmed | Seat, Bundle excluded from positive coverage |
| Available ancillary options recorded before selection | ANC-27 | Applicable | To Be Discovered | UI | Confirmed | |
| Baggage selection behaves at AirIndia's recorded application level `[gated: Baggage]` | ANC-10, ANC-12, ANC-24 | Applicable — Per Journey (platform default) | To Be Discovered | UI | Confirmed as a rule | |
| Meal selection behaves at AirIndia's recorded application level `[gated: Meal]` | ANC-10, ANC-12, ANC-24 | Applicable — Per Segment (platform default) | To Be Discovered | UI | Confirmed as a rule | |
| Seat selection behaves at AirIndia's recorded application level `[gated: Seat]` | ANC-10, ANC-12, ANC-24 | **N/A** — Seat Unsupported | — | — | N/A | |
| Bundle selection behaves at AirIndia's recorded application level `[gated: Bundle]` | ANC-10, ANC-12, ANC-24 | Applicable — Application Level To Be Discovered (no platform default exists for Bundle) | To Be Discovered | UI | Confirmed as a rule; level itself To Be Discovered | Added 2026-09-25 |
| Different capabilities may use different application levels within one Supplier | ANC-12 | Applicable — Baggage=Journey, Meal=Segment, Bundle=To Be Discovered | — | — | Confirmed | |
| A capability confirmed Unsupported is a recorded fact, not a product defect | ANC-05 | Applicable — Seat | — | — | Confirmed | |
| Booking flow completes after ancillary selection | ANC-24 | Applicable | To Be Discovered | UI | Confirmed | |
| Selected ancillary data preserved through booking | ANC-25 | Applicable | To Be Discovered | UI, E2E | Confirmed | |
| Selected ancillary data reflected in downstream booking details | ANC-25, ANC-53 | Applicable — booking confirmation, itinerary, and reports | To Be Discovered | UI, E2E | Confirmed — resolved 2026-09-25 | |
| Validation across all six checkpoints | ANC-31 | Applicable | To Be Discovered | UI, API, E2E | Confirmed where observable | |
| Each selected ancillary classified per checkpoint using the five-value model | ANC-32 | Applicable | To Be Discovered | UI, API, E2E | Confirmed | |
| Per-checkpoint checks: passenger, segment/journey, type, quantity, price, currency, total, persisted status | ANC-33 | Applicable | To Be Discovered | UI, API, E2E | Confirmed | |
| Ancillary pricing captured separately from base flight price, at all three points | ANC-34, ANC-35 | Applicable | To Be Discovered | UI, API | Confirmed | |
| Final booking amount validated against the confirmed pricing contract | ANC-36 | Applicable — pricing contract now confirmed (ANC-42…ANC-45) | To Be Discovered | UI, API | Confirmed — pricing contract resolved 2026-09-23 | See shared baseline §6.8 |
| Wallet or payment validation on ancillary selection | ANC-46 | Applicable — no deduction on selection, full deduction at booking | To Be Discovered | UI, API | Confirmed — resolved 2026-09-23 | |
| Change or removal of a selected ancillary, before or after booking | ANC-47, ANC-52 | Applicable — permitted before booking, per passenger, not mandatory for all passengers. **Not permitted after booking** | To Be Discovered | UI | Confirmed — resolved 2026-09-25 | |
| Currency handling when credential market currency differs from booking currency | ANC-28, ANC-33, ANC-42 | Applicable — ROE-based conversion | To Be Discovered | UI, API | Confirmed — resolved 2026-09-23 | AirIndia priced in INR, platform in EGP, per confirmed ROE |
| Bundle interaction with individually selected capabilities `[gated: Bundle]` | ANC-50 | **Applicable** — Bundle is Supported for AirIndia (added 2026-09-25). Coexists with individually selected capabilities, no conflict; priced separately in the fare breakdown, then included in the total | To Be Discovered | UI, API | Confirmed | |

## 8. Error Handling

### 8a. Generic Cross-Feature Error Categories — GENERIC

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Invalid request | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | |
| Supplier timeout | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | |
| Supplier unavailable | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | |
| Authentication failure | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | |
| Malformed response | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | |
| Partial response | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | |
| Unexpected supplier response | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | |
| Integration-layer normalized error | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | `ndc-core-service` now active for this Feature — error contract to be confirmed in Discovery |

### 8b. Feature-Specific Error Rows — INJECTED FROM FEATURE PROFILE

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Supplier not assigned to the Branch | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-15 — Blocked, not Failed |
| Required Supplier Credential / PCC / Market missing for the Branch | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-16 — Blocked, same reasoning |
| Search returns no results from AirIndia | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-19, ANC-20 |
| A flight from a different Supplier was selected | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-20 — invalidates execution, not a defect |
| Ancillaries section does not open, or exposes nothing | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-22 — expected for Seat/Bundle given Unsupported |
| A capability recorded as Supported is not exposed live | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-08, ANC-22 — applies to Baggage/Meal |
| A capability recorded as Unsupported **is** exposed live | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-08, ANC-22 — applies to Seat/Bundle |
| Selection rejected by a Supplier restriction (quantity, eligibility, passenger type, route, fare family) | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-41 — Adult/Child eligibility default applies (ANC-49) |
| Selected ancillary missing after booking | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-25, ANC-32 |
| Price or currency mismatch across checkpoints | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | ANC-33, ANC-36 — pricing contract now confirmed, ROE-based |
| Supplier error or timeout during ancillary retrieval or booking | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Open | No normalized error contract confirmed yet |

## 9. Historical / Comparison Evidence — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Old integration-layer implementation available for this supplier? | To Be Discovered | To Be Discovered | — | |
| Same booking retrievable through both old and new paths? | To Be Discovered | To Be Discovered | — | |
| Old UI behavior | To Be Discovered | To Be Discovered | — | |
| Old API payload | To Be Discovered | To Be Discovered | — | |
| Existing supplier payload examples | To Be Discovered | To Be Discovered | — | |
| Existing Postman/Swagger/API documentation | To Be Discovered | To Be Discovered | — | |
| Existing test cases | To Be Discovered | To Be Discovered | — | |
| Existing Azure test cases (if available) | To Be Discovered | To Be Discovered | — | |
| Existing logs/screenshots/test evidence | To Be Discovered | To Be Discovered | — | |
| Existing production/UAT evidence | To Be Discovered | To Be Discovered | — | |
| Known accepted differences | To Be Discovered | To Be Discovered | — | |
| Known migration differences | To Be Discovered | To Be Discovered | — | |
| Historical supplier limitations | To Be Discovered | To Be Discovered | — | |

## 10. Automation Feasibility — GENERIC

<!-- The user selected the manual-execution pipeline for this task (Stage 4M). Automation feasibility
     is not assessed for this run — recorded as N/A rather than left blank, since a positive/negative
     assessment was never attempted. -->

### 10a. UI Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Framework available | N/A | N/A | — | Manual execution pipeline chosen for this run |
| Stable locators | N/A | N/A | — | |
| Test-user availability | N/A | N/A | — | |
| Environment stability | N/A | N/A | — | |
| Test-data repeatability | N/A | N/A | — | |
| Destructive-action risk | N/A | N/A | — | |
| Cleanup/reset capability | N/A | N/A | — | |

### 10b. API Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Endpoint callable directly | N/A | N/A | — | Manual execution pipeline chosen for this run |
| Authentication automatable | N/A | N/A | — | |
| Test data reusable | N/A | N/A | — | |
| Request generation possible | N/A | N/A | — | |
| Response assertions possible | N/A | N/A | — | |
| Mocking/stubbing available | N/A | N/A | — | |
| Supplier dependency controllable | N/A | N/A | — | |

### 10c. E2E Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Can supplier calls be executed safely? | N/A | N/A | — | Manual execution pipeline chosen for this run |
| Can real supplier responses be used? | N/A | N/A | — | |
| Can wallet effects be verified? | N/A | N/A | — | |
| Can database effects be verified? | N/A | N/A | — | |
| Can booking persistence be verified? | N/A | N/A | — | |
| Can cleanup/reset be performed? | N/A | N/A | — | |
| Can tests run repeatedly? | N/A | N/A | — | |
| Parallel/concurrency feasibility | N/A | N/A | — | |
| External supplier limitations | N/A | N/A | — | |

## 11. Discovery Contacts / Ownership — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Developer/contact responsible for supplier integration | Ahmed Alhussieny | Confirmed | Intake, 2026-09-23 | |
| Person who can confirm API contract/mapping | Ahmed Alhussieny | Confirmed | Intake, 2026-09-23 | |
| Person who can confirm business behavior | Ahmed Alhussieny | Confirmed | Intake, 2026-09-23 | |
| Person who can confirm UI behavior | Ahmed Alhussieny | Confirmed | Intake, 2026-09-23 | |
| Person who can provide supplier test data | Ahmed Alhussieny | Confirmed | Intake, 2026-09-23 | |
| Person who can provide environment/access | Ahmed Alhussieny | Confirmed | Intake, 2026-09-23 | |
| Other relevant owner/contact | None named | Confirmed | Intake, 2026-09-23 | |

## 12. Open Questions — GENERIC + INJECTED

| # | Open Question | Category | Status | Owner | Evidence/Source | Notes |
|---|---|---|---|---|---|---|
| 1 | AirIndia's Provider ID/code | Missing access / Business decision required | Open | Unassigned | — | Needed for §1, §3b |
| 2 | Whether DB/Security/Performance testing layers apply to AirIndia | Environment issue / Business decision required | Open | Unassigned | §2b | Deferred, not excluded, pending clarification |
| 3 | Bundle's Application Level for AirIndia (no platform default exists, unlike Baggage/Meal) | Unconfirmed supplier behavior | Open | Unassigned | §5c | To be established during Discovery |

**Resolved 2026-09-25:** after-booking change/removal (was item 2) → Not permitted, see ANC-52.
Downstream screens/reports (was item 3) → booking confirmation, itinerary, and reports, see ANC-53.

**Feature-level Open Questions carried from FeatureChecklistProfile.md:**

| Source | Question | Affects |
|---|---|---|
| ProjectContext §8, OQ-ANC-09 | Seat / Seatmap boundary — deferred by decision | Seat rows above (currently moot for AirIndia — Seat is Unsupported) |
| ProjectContext §8, OQ-ANC-10 | Bundle / Upselling boundary — deferred by decision | Bundle rows above (currently moot for AirIndia — Bundle is Unsupported) |

## 13. Intake Decision — GENERIC

| Field | Value |
|---|---|
| Decision | Ready for Discovery |
| Reason | Core business rules (pricing, currency, lifecycle, post-booking change/removal, downstream representation, application-level defaults, eligibility, integration layer) and AirIndia's supported-capability set (Baggage, Meal, Bundle) are confirmed. Remaining gaps (Provider ID, Bundle's Application Level, exact endpoints, UI flow detail, error contract) are normal Discovery obligations (ANC-37…ANC-41), not blockers |
| Blocking items (if any) | None. DB/Security/Performance layer applicability (§2b) should be clarified during Discovery |
| Recorded by | Ahmed Alhussieny |
| Date | 2026-09-23 (revised 2026-09-25) |
