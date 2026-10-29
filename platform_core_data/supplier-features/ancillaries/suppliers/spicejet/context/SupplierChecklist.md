# Supplier Checklist — Spicejet

**Scope family:** Supplier Features → Feature → Supplier
**Feature:** Ancillaries (ancillaries)
**Integration Layer:** NDC-INT <!-- Feature metadata (module.json `integrationLayer`), not an owner -->
**Supplier:** Spicejet (spicejet)
**Status:** Draft
**Revision:** 11
**Last Updated:** 2026-10-28
**Produced by run:** ancillaries-run-015__2026-10-28_10-02-05__Targeted__Spicejet-Seatmap-Admin and ancillaries-run-016__2026-10-28_10-02-05__Targeted__Spicejet-Seatmap-Portal (staging, full Ancillaries suite `TestCases_AncillariesSeatMap.xlsx`, Headed)
**Rendered from Feature Profile:** platform_core_data/supplier-features/ancillaries/context/FeatureChecklistProfile.md (revision 3)
**Capability Model used for §5c:** platform_core_data/supplier-features/ancillaries/context/CapabilityModel.md (revision 1)

### Revision History

| Rev | Date | Changed By | What Changed | Why / Evidence |
|---|---|---|---|---|
| 1 | 2026-10-28 | Rendering agent (Claude), for Hussein | Initial intake. Rendered from the generic template and the Ancillaries Feature Checklist Profile rev 3, with §5c from the Capability Model rev 1. Supplier values from the supplier integration checklist (Sup001–Sup018) supplied by Hussein | Supplier Spicejet approved 2026-10-28 by Hussein. Capabilities and rules recorded through `cli.js supplier-feature supplier capabilities/rules` the same day |
| 2 | 2026-10-28 | Claude, for Hussein | Run credential changed from "spicejet EGY" to "SpiceJetxxxx" (runs 015/016 `run.json` too) | Human decision, Hussein, 2026-10-28, before the first group ran. The earlier staging result (API_KEY "tt…") belonged to "spicejet EGY" and is not carried over |
| 3 | 2026-10-28 | Claude, for Hussein | Seat feature word "Overwing seat(s)" (seats 13–17 A/F on DEL→BLR) accepted as Spicejet-specific (`settings.local.json` → `suppliers.spicejet.knownSeatFeatures`) | Human decision, Hussein, 2026-10-28, after TC-SM-STA-004 failed on it in run-016 Group 01 |
| 4 | 2026-10-28 | Claude, for Hussein | §7c: Supplier rule `no-leg-space-seat-inf-chd` — no "Leg space seat" for ADT + INF or CHD | Human decision, Hussein, 2026-10-28 |
| 5 | 2026-10-28 | Claude, for Hussein | §2 limitation: after Book, a Spicejet booking stays "In Progress" (no airline/GDS PNR shown) instead of Booked/Confirmed — expected, not a defect. Runner accepts it (`settings.local.json` → `suppliers.spicejet.acceptedBookStatus`) | Human decision, Hussein, 2026-10-28, after Groups 14/15 stopped on it twice |
| 6 | 2026-10-28 | Claude, for Hussein | **Corrects rev 5.** "In Progress" is not a general Spicejet status: it is how rule `no-leg-space-seat-inf-chd` is enforced at Book and Pay after Hold (wallet unchanged); compliant bookings reach Confirmed/Booked and charge the wallet; Hold is unaffected. `acceptedBookStatus` removed; the runner's plain-seat choice now avoids leg space seats | Human decision, Hussein, 2026-10-28. Run-016 Groups 14/15 had put the infant-holding adult on leg space seat 2C → In Progress, wallet unchanged |
| 7 | 2026-10-28 | Claude, for Hussein | §7c: the rule applies at **Hold** too (Hold with a leg space seat for ADT + INF or CHD → In Progress, wallet unchanged); TC-SM-LEG-005 rewritten from "Hold works, Pay goes In Progress" to "Hold goes In Progress" | Human decision, Hussein, 2026-10-28, after run-016 Group 22 (order …PJLMDH) went In Progress at Hold |
| 8 | 2026-10-28 | Claude, for Hussein | §2 limitation: Spicejet returns every exit-row seat as blocked. TC-SM-EXR-003/004 pass when all exit seats are blocked (`settings.local.json` → `suppliers.spicejet.exitRowsAlwaysBlocked`); the adult-can / child-cannot switch is not exercised | Human decision, Hussein, 2026-10-28, after the cases were Inconclusive twice on DEL→BLR |
| 9 | 2026-10-28 | Claude, for Hussein | §7c final: the seat map lets ADT + INF / CHD select a leg space seat (TC-SM-LEG-001/002 now expect it selectable); Book / Hold / Pay after Hold with it → Portal "In Progress", Admin "Failed", wallet unchanged (TC-SM-LEG-003…005 per application). Exit seats blocked for ADT + INF and CHD on both applications — TC-SM-EXR-005 joins EXR-003/004 under `exitRowsAlwaysBlocked` | Human decision, Hussein, 2026-10-28, after the first Admin booking groups |
| 10 | 2026-10-28 | Claude, for Hussein | §7c: a **child may have a leg space seat** — the rule now covers an infant-holding adult only and is renamed `no-leg-space-seat-inf`. TC-SM-LEG-004 now passes when a child booked on a leg space seat is Confirmed and the wallet charged; TC-SM-LEG-001 reworded | Human decision, Hussein, 2026-10-28, after Admin Group 21 confirmed a child on a leg space seat twice (PNR AYWP5D, T6IH5F) |
| 11 | 2026-10-29 | Claude, for Hussein | §2 limitation: seat 5F refused for an infant-holding adult at booking (was misread as "every Admin infant booking fails"); Admin Book with the infant-holder on leg space seat 2A was Confirmed and charged (TC-SM-LEG-003 Failed, PNR T52R8Y) — defect | Admin run-015 Groups 14, 15, 20, 2026-10-28/29; airline reason supplied by Hussein |

---

> A Supplier scope is the **complete QA ownership boundary** for this Feature + Supplier
> implementation:
>
> ```
> Application UI
>     ↓
> Application
>     ↓
> Integration Layer  (NDC-INT)
>     ↓
> Supplier
> ```
>
> The integration layer is Feature metadata, not the Feature's owner. The Feature spans two
> applications: Admin for configuration and Portal for the business flow. Each application's access
> details are recorded separately.
>
> This checklist holds only **supplier-specific** information. Shared Feature business requirements
> belong to the Feature's approved shared context,
> `shared/ancillaries-baseline/context/ProjectContext.md`, through the Feature Checklist Profile named
> above. They are not duplicated here. Supplier-specific Test Cases must trace back to the shared
> `ANC-xx` requirement IDs.
>
> Spicejet under Ancillaries is its own Supplier scope. It is independent of any Supplier with the
> same name under another Feature.
>
> **Secrets:** the supplier integration checklist supplied at intake contains the staging and
> production API keys (Sup001, Sup002). They are **not recorded here** and must never be written into
> any run file, report or commit. Fields that hold them read "Provided (redacted)".

Every field below carries a Status: Confirmed · Provided · Unknown · To Be Discovered · Blocked ·
Pending Confirmation · N/A.

## 1. Supplier Identity — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Supplier name | Spicejet (supplier checklist Sup003: "SpiceJet") | Provided | `supplier.json` (approved 2026-10-28 by Hussein); Sup003 | |
| Provider ID / code | Unknown | Unknown | — | Not in the supplier checklist |
| Integration type (if known) | NDC, through the supplier integration service (NDC-INT) | Provided | Sup001, Sup002 (integration URLs); Feature `integrationLayer` | |
| Airline/GDS scope (if applicable) | SpiceJet (airline). Routes DEL, BOM, BLR, DXB, LHR | Provided | Sup006, Sup007 | Same route set on staging and production |

## 2. Supplier Scope — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Feature capability being implemented | Ancillaries — Seat, Meal, Baggage; Hold and Pay after Hold | Provided | Intake 2026-10-28 (Hussein); Sup008 | Bundle Not Supported (§2c) |
| Supported booking/use cases | Search, FareConfirm, Book/Hold, BookAfterHold, FareConfirmAfterHold, Retrieve, GetAncillary, SeatMap | Provided | Sup008 | |
| Known exclusions | Bundle | Provided | Intake 2026-10-28 (Hussein) | Not a defect — ANC-05 |
| Known supplier limitations | Exit-row seats are always returned as blocked (TC-SM-EXR-003/004 pass on that basis, human decision 2026-10-28). Seat **5F** (SG 612) is offered to an adult holding an infant on the seat map but refused by the airline at booking ("seat group eligibility … anchor unit Y/5F") → Failed; the same booking on 5D is Confirmed (PNR VBLU2T, 2026-10-29) — recorded as a defect, runner avoids 5F for infant-holders. "In Progress" after Book / Pay after Hold is the enforcement of rule `no-leg-space-seat-inf-chd` (§7c), not a general Spicejet status | Confirmed | Human decision, Hussein, 2026-10-28 (corrects revision 5) | |
| UI scope included? | Pending Confirmation | Pending Confirmation | — | Set when the run scope is confirmed (§2b) |
| API scope included? | Pending Confirmation | Pending Confirmation | — | Same |
| Contract scope included? | Pending Confirmation | Pending Confirmation | — | Same |
| Integration scope included? | Pending Confirmation | Pending Confirmation | — | Same |
| E2E scope included? | Pending Confirmation | Pending Confirmation | — | Same |
| Regression against previous integration required? | Unknown | Unknown | — | |
| DB validation applicable? | Pending Confirmation | Pending Confirmation | — | |
| Security testing applicable? | Pending Confirmation | Pending Confirmation | — | |
| Performance testing applicable? | Pending Confirmation | Pending Confirmation | — | |

## 2c. Supplier Capabilities — GENERIC

Recorded at intake (`ndc_execution_rules.md` §A15). The authoritative values are in `supplier.json`,
written with `cli.js supplier-feature supplier capabilities` — this table mirrors them. `Unknown` is
treated as Not Supported when a run is planned.

| Capability | Supported / Not Supported / Unknown | Source | Notes |
|---|---|---|---|
| Hold | **Supported** | Human decision, Hussein, 2026-10-28 | Sup008 lists Book/Hold |
| Pay after Hold | **Supported** | Human decision, Hussein, 2026-10-28 | Sup008 lists BookAfterHold, FareConfirmAfterHold |
| Meal | **Supported** | Human decision, Hussein, 2026-10-28 | Sup008 lists GetAncillary |
| Baggage | **Supported** | Human decision, Hussein, 2026-10-28 | Sup008 lists GetAncillary |
| Seat | **Supported** | Human decision, Hussein, 2026-10-28 | Sup008 lists SeatMap |
| Bundle | **Not Supported** | Human decision, Hussein, 2026-10-28 | Bundle cases are Excluded — Not supported by supplier, never run and failed |

## 2b. Testing Layer Scope — GENERIC

Not yet frozen: no run exists. Filled when the run's scope is confirmed; after that it changes only
through `run_manager/cli.js scope-change`.

| Layer | In Scope / Out of Scope / Deferred | Reason (mandatory if not In Scope) | Notes |
|---|---|---|---|
| UI | Pending Confirmation | | |
| API | Pending Confirmation | | |
| Contract | Pending Confirmation | | |
| Integration | Pending Confirmation | | |
| E2E | Pending Confirmation | | |
| Regression | Pending Confirmation | | |
| DB | Pending Confirmation | | |
| Security | Pending Confirmation | | |
| Performance | Pending Confirmation | | |

## 3. Environment & Access — GENERIC

### 3a. UI

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Application URL/environment — Admin | http://192.168.1.90/auth/login (Admin panel) | Provided | Hussein, 2026-10-28 | Where the "SpiceJetxxxx" credential's `API_KEY` is checked before the first group |
| Application URL/environment — Portal | http://192.168.1.90:9500/auth/login (Portal) | Provided | Hussein, 2026-10-28 | Same host as Admin, port 9500 |
| Required role/user | To Be Discovered | To Be Discovered | — | Profile §A, ANC-14 |
| Navigation/menu availability | To Be Discovered | To Be Discovered | — | |
| Supplier configuration visibility | To Be Discovered | To Be Discovered | — | ExecutionFlow §2, ANC-15 |
| Branch/Agency/PCC setup | To Be Discovered | To Be Discovered | — | Whether Spicejet is assigned and active on the test Branch: ANC-15 |
| Required permissions | Unknown | Unknown | — | |
| Test account availability | To Be Discovered | To Be Discovered | — | Credentials are held outside this repository and are never recorded here |

### 3b. API / Integration

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Integration layer base URL — staging | https://ndc-supplier-integration.azurewebsites.net/ | Provided | Sup001 | |
| Integration layer base URL — production | https://ndc-prd-ne-integration.proudtree-71b8270c.northeurope.azurecontainerapps.io/ | Provided | Sup002 | |
| Endpoint(s) | Search, FareConfirm, Book/Hold, BookAfterHold, FareConfirmAfterHold, Retrieve, GetAncillary, SeatMap | Provided | Sup008 | Operation names; exact paths To Be Discovered |
| Authentication mechanism | API key (staging and production keys supplied) | Provided (redacted) | Sup001, Sup002 | Keys never recorded. Sup004 (API Key) was left blank in the checklist |
| Supplier credential | "SpiceJetxxxx" | Provided | Intake 2026-10-28 (Hussein); Sup009, Sup013, Sup017, Sup018 | EGY is the only credential listed, and the one listed as working (Sup017). Production vs staging for a run is decided from this credential's `API_KEY` in NDC Admin, never from this checklist (`CLAUDE.md`, Ancillaries runs) |
| Provider ID | Unknown | Unknown | — | |
| Environment availability | Staging and production both listed | Provided | Sup001, Sup002 | |
| Logs/observability access | Unknown | Unknown | — | |
| Swagger/OpenAPI/Postman availability | Not supplied | Provided | Sup010 left blank | |
| Direct API access availability | Unknown | Unknown | — | |
| PCC / market | Credential selector / country: EGY. Country of contract: EGY | Provided | Sup013, Sup016, Sup018 | PCC: To Be Discovered |
| Currency | Staging: INR. Production: AED | Provided | Sup005 | Booking price = Supplier price × ROE (ANC-42) |
| SUPPORT_TICKET_NO provided | No | Provided | Sup011 | |
| SOTO enabled | No | Provided | Sup012 | |
| Business alias | None | Provided | Sup014 | |
| BSP_SIGN | No | Provided | Sup015 | |

### 3c. Source / Target Environment Model (if applicable)

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Dual-environment execution required? | N/A | N/A | Profile §D; ExecutionFlow_HappyPath.md | Ancillaries creates its booking inside its own flow. `ndc_execution_rules.md` §C1 does not apply |
| Source Environment (preparation/offline environment, if required) | N/A | N/A | Same as above | |
| Target Environment (the environment under test) | Admin + Portal; production or staging decided per run from the credential's `API_KEY` | Pending Confirmation | `CLAUDE.md`, Ancillaries runs | |
| Feature-level Execution Flow reference (path, if one exists for this Feature) | `platform_core_data/supplier-features/ancillaries/context/ExecutionFlow_HappyPath.md` (rev 7); booking script `context/SetupBooking_Script.md` (rev 1) | Provided | Referenced, not duplicated (`ndc_execution_rules.md` §A1) | Read §11, §15, §16 before every run |

## 4. UI / User Flow — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Screen/page name | To Be Discovered | To Be Discovered | — | |
| Entry/navigation path | Per ExecutionFlow_HappyPath.md | Provided | Feature Execution Flow | |
| Required fields | To Be Discovered | To Be Discovered | — | |
| Supplier selection | To Be Discovered | To Be Discovered | — | Flight attribution to Spicejet needs evidence (ANC-20) |
| Supplier credential selection | "SpiceJetxxxx" | Provided | Intake 2026-10-28 | |
| Branch/Agency/Agent fields (where applicable) | To Be Discovered | To Be Discovered | — | |
| Search/action buttons | To Be Discovered | To Be Discovered | — | |
| Expected successful flow | Per ExecutionFlow_HappyPath.md | Provided | Feature Execution Flow rev 7 | |
| Expected failure behavior/messages | To Be Discovered | To Be Discovered | — | |
| Loading/progress behavior | To Be Discovered | To Be Discovered | — | |
| Data displayed after retrieval | To Be Discovered | To Be Discovered | — | |
| UI validations | To Be Discovered | To Be Discovered | — | |
| Role/permission differences | Unknown | Unknown | — | |
| Known UI limitations | To Be Discovered | To Be Discovered | — | |
| UI evidence/screenshots/designs available | None supplied | Provided | — | |

## 5. Test Data

### 5a. Generic Test Data — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| UI account/user | To Be Discovered | To Be Discovered | — | No credentials are recorded here |
| Valid organization/branch | To Be Discovered | To Be Discovered | — | |
| Valid happy-path test data | Routes among DEL, BOM, BLR, DXB, LHR; a future travel date | Provided (routes). To Be Discovered (flights, dates) | Sup006, Sup007 | |
| Invalid/negative test data | To Be Discovered | To Be Discovered | — | |
| Multi-passenger data (if applicable) | Per ExecutionFlow_HappyPath.md passenger age limits | Provided | Feature Execution Flow | |
| Multi-segment data (if applicable) | To Be Discovered | To Be Discovered | — | Needed to tell segment-level from journey-level behavior (Profile §A). SUP-OQ-04 |
| Supplier-specific test data | To Be Discovered | To Be Discovered | — | |

### 5b. Feature-Specific Test Data — INJECTED FROM FEATURE PROFILE

| Test Data Item | Why (Requirement ID) | Notes |
|---|---|---|
| Branch configured with the Supplier under test, active/available | ANC-14, ANC-15 | Precondition. Without it the execution is Blocked, not Failed |
| Supplier Credential / PCC / Market assigned to that Branch | ANC-16, ANC-17 | Record exactly which credential is used — never chosen arbitrarily. Spicejet: "SpiceJetxxxx" |
| Admin user able to configure a Branch and assign a Supplier | ANC-14 | Actual role name To Be Discovered per Supplier |
| Portal user able to search, book, and select ancillaries | ANC-19, ANC-21 | May or may not be the same account as the Admin user — OQ-ANC-08 |
| A valid search route and date returning results from the Supplier under test | ANC-19, ANC-20 | Availability may depend on route / cabin / fare family — ANC-39, per-Supplier |
| A multi-segment journey (e.g. CAI to DXB to BKK) | ANC-10, ANC-11, ANC-12, ANC-13 | Required to tell Segment-level from Journey-level behavior. A single-segment route cannot distinguish them |
| Valid passenger data for the required passenger mix | ANC-21 | Passenger-type eligibility rules are Feature-level (OQ-ANC-06 answered 2026-09-27); Supplier-only rules are in §7c |
| A fare/cabin on which ancillaries are actually offered | ANC-39 | Which fares expose ancillaries is a per-Supplier Discovery obligation, never assumed |
| At least one flight **per cabin class** the Supplier returns, and the live bundle list for each cabin `[gated: Bundle]` | ANC-39; human decision 2026-09-27 | **N/A for Spicejet** — Bundle Not Supported |
| Baggage-eligible booking `[gated: Baggage]` | ANC-23, ANC-29, ANC-37 | **Active for Spicejet** — Baggage Supported |
| Meal-eligible booking `[gated: Meal]` | ANC-23, ANC-29, ANC-37 | **Active for Spicejet** — Meal Supported |
| Seat-eligible booking `[gated: Seat]` | ANC-23, ANC-29, ANC-37 | **Active for Spicejet** — Seat Supported. Exposing Seat claims no Seatmap scope — OQ-ANC-09 |
| Bundle-eligible booking `[gated: Bundle]` | ANC-23, ANC-29, ANC-37 | **N/A for Spicejet** — Bundle Not Supported |
| A capability confirmed **Unsupported** for this Supplier | ANC-05 | Bundle — optional unsupported-capability confirmation case. Never a defect |
| Quantity/limit boundary data per supported capability | ANC-41 | Baggage, Meal, Seat — values are per-Supplier, recorded from evidence, never invented |

### 5c. Feature Capability Matrix — INJECTED FROM FEATURE PROFILE (CONDITIONAL)

This section renders because `context/CapabilityModel.md` exists for Ancillaries. Capability Result
was provided by human decision (Hussein, 2026-10-28): Source Status `Provided` — not yet Verified.
Per Capability Model §8, cases may run, and each carries a **verification dependency** until
execution confirms or refutes the capability. Application Level and the other dimensions were not
provided and keep the absence default.

"Other dimensions" means UI visible · API data available · Price available · Currency returned ·
Passenger association · Flight association · Pricing basis · Availability timing · Restrictions.

| Capability | Capability Result | Source Status | Application Level | Source Status | Other dimensions (per the Feature's Capability Model) | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| Baggage | Supported | Provided | To Be Discovered | — | All To Be Discovered | Intake 2026-10-28; Sup008 GetAncillary | Verification dependency until a run confirms |
| Meal | Supported | Provided | To Be Discovered | — | All To Be Discovered | Intake 2026-10-28; Sup008 GetAncillary | Verification dependency until a run confirms |
| Seat | Supported | Provided | To Be Discovered | — | All To Be Discovered | Intake 2026-10-28; Sup008 SeatMap | Seat/Seatmap boundary OQ-ANC-09 stays open at Feature level. Verification dependency until a run confirms |
| Bundle | Unsupported | Provided | N/A | — | N/A | Intake 2026-10-28 | Not a defect — ANC-05 |

**Discrepancy records for this Supplier** — one block per contradicted value, appended, never
overwriting:

| Capability | Dimension | Provided Value | Discovery Finding | Final Verified Value | Evidence | Change Reason |
|---|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | N/A | No contradictions recorded yet |

## 6. Contract / Mapping — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Request shape | To Be Discovered | To Be Discovered | — | |
| Response shape | To Be Discovered | To Be Discovered | — | |
| Provider-specific fields | To Be Discovered | To Be Discovered | — | |
| Original ticketing date/time mapping (if applicable to this Feature) | N/A | N/A | — | Import-Booked-PNR concern (tier §C) |
| Booking status mapping | To Be Discovered | To Be Discovered | — | |
| Supplier status → platform status mapping | To Be Discovered | To Be Discovered | — | |
| Supplier identifier / provider routing | Unknown | Unknown | — | Provider ID Unknown |
| Passenger mapping | To Be Discovered | To Be Discovered | — | |
| Passenger type mapping | To Be Discovered | To Be Discovered | — | |
| Segment mapping | To Be Discovered | To Be Discovered | — | |
| Fare/tax/currency mapping | Supplier price × ROE (ANC-42); Supplier currency INR on staging, AED on production | Provided | Sup005; shared baseline | |
| Ticket/coupon mapping | To Be Discovered | To Be Discovered | — | |
| Passenger ↔ ticket relationship | To Be Discovered | To Be Discovered | — | |
| Segment ↔ coupon relationship | To Be Discovered | To Be Discovered | — | |
| Baggage mapping | To Be Discovered | To Be Discovered | — | Gated on §5c Baggage |
| Ancillary/service mapping | To Be Discovered | To Be Discovered | — | |
| Known nullable/optional fields | To Be Discovered | To Be Discovered | — | |
| Fields required by the UI/business layer | To Be Discovered | To Be Discovered | — | |
| Differences from the old integration-layer mapping (if applicable) | Unknown | Unknown | — | |

## 7. Business / E2E Flow

### 7a. Table Structure — GENERIC

Behavior rows follow in §7b. Columns: Behavior · Inherited Requirement ID · Source Status (carried
unchanged from the Profile) · Supplier Applicability · Test Data Available? · Execution Layer ·
Status · Evidence/Notes. The per-Supplier columns are filled during Discovery or execution.

### 7b. Behavior Rows — INJECTED FROM FEATURE PROFILE

| Behavior | Inherited Requirement ID | Source Status | Supplier Applicability | Test Data Available? | Execution Layer | Status | Evidence/Notes |
|---|---|---|---|---|---|---|---|
| Admin: Branch selected and Supplier assigned before execution | ANC-14, ANC-15 | Confirmed | Applicable | To Be Discovered | UI | To Be Discovered | |
| Admin: correct Supplier Credential / PCC / Market assigned and available | ANC-16 | Confirmed | Applicable | Yes — "SpiceJetxxxx" | UI | To Be Discovered | |
| Admin: the credential used is recorded exactly, never chosen arbitrarily | ANC-17 | Confirmed | Applicable | Yes | UI | To Be Discovered | |
| Full execution context recorded (Supplier, Credential, PCC, Market, Branch, Agency, Environment, User) | ANC-18 | Confirmed | Applicable | To Be Discovered | UI | To Be Discovered | |
| Admin and Portal access details recorded **independently** | ANC-26 | Confirmed as a rule; whether they share one environment is Open — OQ-ANC-08 | Applicable | To Be Discovered | UI | To Be Discovered | |
| Portal: valid flight search performed | ANC-19 | Confirmed | Applicable | Routes known (Sup006/007) | UI | To Be Discovered | |
| Portal: selected flight is from the Supplier under test, with attribution evidence | ANC-20 | Confirmed | Applicable | To Be Discovered | UI | To Be Discovered | |
| Portal: PAX Details entered with valid passenger information | ANC-21 | Confirmed | Applicable | To Be Discovered | UI | To Be Discovered | |
| Ancillaries section opens, and intake-recorded capability information is **verified** there rather than re-determined | ANC-22 | Confirmed | Applicable | — | UI | To Be Discovered | Verify Baggage/Meal/Seat Supported, Bundle Unsupported |
| A live-behavior difference from a Provided value produces a discrepancy record, never a silent overwrite | ANC-08, ANC-22 | Confirmed | Applicable | — | UI | To Be Discovered | |
| Only Supported capabilities are exercised | ANC-23 | Confirmed | Applicable — Baggage, Meal, Seat | — | UI | To Be Discovered | Bundle excluded |
| Available ancillary options recorded **before** selection | ANC-27 | Confirmed | Applicable | To Be Discovered | UI | To Be Discovered | |
| Baggage selection behaves at this Supplier's recorded application level `[gated: Baggage]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | Applicable — level To Be Discovered | To Be Discovered | UI | To Be Discovered | |
| Meal selection behaves at this Supplier's recorded application level `[gated: Meal]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | Applicable — level To Be Discovered | To Be Discovered | UI | To Be Discovered | |
| Seat selection behaves at this Supplier's recorded application level `[gated: Seat]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | Applicable — level To Be Discovered | To Be Discovered | UI | To Be Discovered | |
| Bundle selection behaves at this Supplier's recorded application level `[gated: Bundle]` | ANC-10, ANC-12, ANC-24 | Confirmed as a rule; the level itself is per-Supplier | **N/A** — Bundle Not Supported | — | — | N/A | |
| Different capabilities may use different application levels within one Supplier | ANC-12 | Confirmed | Applicable | — | — | To Be Discovered | |
| A capability confirmed Unsupported is a recorded fact, not a product defect | ANC-05 | Confirmed | Applicable — Bundle | — | — | Confirmed | |
| Booking flow completes after ancillary selection | ANC-24 | Confirmed | Applicable | To Be Discovered | UI | To Be Discovered | Book/Hold/Pay are pressed by the human only (assisted groups 14–17) |
| Selected ancillary data preserved through booking | ANC-25 | Confirmed | Applicable | To Be Discovered | UI, E2E | To Be Discovered | |
| Selected ancillary data reflected in downstream booking details | ANC-25 | **Open** — the "where applicable" set is undefined (OQ-ANC-04). Do not assert an expected result for an unlisted screen | Applicable | To Be Discovered | UI, E2E | To Be Discovered | |
| Validation across all six checkpoints (Selection UI, Fare Breakdown, Booking Request, Supplier Confirmation, Persisted Booking, Itinerary) | ANC-31 | Confirmed where the checkpoint is observable | Applicable | To Be Discovered | UI, API, E2E | To Be Discovered | |
| Each selected ancillary classified per checkpoint using the five-value model | ANC-32 | Confirmed | Applicable | To Be Discovered | UI, API, E2E | To Be Discovered | |
| Per-checkpoint checks: passenger, segment/journey, type, quantity, price, currency, total, persisted status | ANC-33 | Confirmed | Applicable | To Be Discovered | UI, API, E2E | To Be Discovered | |
| Ancillary pricing captured separately from base flight price, at all three points | ANC-34, ANC-35 | Confirmed | Applicable | To Be Discovered | UI, API | To Be Discovered | |
| Final booking amount validated against the confirmed pricing contract | ANC-36, ANC-42, ANC-43, ANC-44, ANC-45 | **Confirmed** — resolved 2026-09-23. Pricing contract: Supplier price × ROE, taxes/fees per offer, rule-engine markup/discount/service fee, ancillary+bundle added to total | Applicable | To Be Discovered | UI, API | To Be Discovered | |
| Wallet or payment validation on ancillary selection | ANC-46 | **Confirmed** — resolved 2026-09-23. No deduction at selection; full deduction (incl. ancillaries/bundle) at booking confirmation | Applicable | To Be Discovered | UI, API | To Be Discovered | |
| Change or removal of a selected ancillary, before or after booking | ANC-47, ANC-52 | **Confirmed** — resolved 2026-09-23/2026-09-25. Permitted before booking, per passenger, not mandatory for every passenger. **Not permitted after booking** | Applicable | To Be Discovered | UI | To Be Discovered | |
| Currency handling when credential market currency differs from booking currency | ANC-28, ANC-33, ANC-42 | **Confirmed** — resolved 2026-09-23. ROE-based conversion: booking price = Supplier price × ROE | Applicable — Supplier currency INR (staging) / AED (production) | To Be Discovered | UI, API | To Be Discovered | Sup005 |
| Bundle interaction with individually selected capabilities `[gated: Bundle]` | ANC-50 | **Confirmed** — resolved 2026-09-23 | **N/A** — Bundle Not Supported | — | — | N/A | |
| Every bundle is exercised in every cabin class the Supplier returns — one fresh offer per cabin × bundle, same check set on each `[gated: Bundle]` | ANC-39; human decision 2026-09-27 | Confirmed (human decision) | **N/A** — Bundle Not Supported | — | — | N/A | |
| Seat eligibility rules (infants, children, exit rows, seat sets) apply to every Supplier; only Supplier-specific rules differ `[gated: Seat]` | ANC-21; human decision 2026-09-27 | Confirmed (human decision) | Applicable | To Be Discovered | UI | To Be Discovered | No Spicejet-only rules (§7c) |

The Profile deliberately has no universal happy-path row. Every capability row is gated (ANC-01).
Spicejet's composite outcome is built from its own Supported capabilities: Baggage, Meal, Seat.

### 7c. Supplier-Specific Rules — GENERIC

Feature-level rules (exit rows, infants, children, seat sets) apply to every Supplier. Only the rules
below belong to Spicejet.

| Rule | Relation to Feature rules | Applies to | Expected behavior | Source | Status |
|---|---|---|---|---|---|
| No "Leg space seat" for an adult holding an infant (`no-leg-space-seat-inf`; was `no-leg-space-seat-inf-chd` until rev 10) | Adds — like the Feature's exit-row rule, but for Spicejet's "Leg space seat" feature | Adult travelling with an infant (ADT + INF) only — a child (CHD) **may** have a leg space seat | The seat map **lets** them select a leg space seat (Admin and Portal). The rule is enforced when the booking is submitted: **Book**, **Hold** or **Pay after Hold** with a leg space seat for ADT + INF → **Portal: In Progress**, **Admin: Failed**, wallet **unchanged** on both. With compliant seats → **Confirmed** (Book) / **On Hold** then **Booked** after Pay, wallet **decreases** by the total. An adult without an infant, and a child, may take a leg space seat: the booking is **Confirmed** and the wallet charged | Human decision, Hussein, 2026-10-28 (recorded with `cli.js supplier-feature supplier rules … --value no-leg-space-seat-inf-chd`, replacing the earlier "None") | Confirmed |

## 8. Error Handling

### 8a. Generic Cross-Feature Error Categories — GENERIC

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Invalid request | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Supplier timeout | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Supplier unavailable | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Authentication failure | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Malformed response | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Partial response | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Unexpected supplier response | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | |
| Integration-layer normalized error | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | NDC-INT error contract To Be Discovered |

### 8b. Feature-Specific Error Rows — INJECTED FROM FEATURE PROFILE

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Supplier not assigned to the Branch | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-15. Execution is **Blocked**, not Failed — a configuration gap is not an Ancillaries defect |
| Required Supplier Credential / PCC / Market missing for the Branch | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-16. Blocked, same reasoning |
| Search returns no results from the Supplier under test | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-19, ANC-20. Cannot proceed; the run did not test the Supplier in scope |
| A flight from a different Supplier was selected | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-20. **Invalidates the execution.** Not a defect and not a partial pass — discard and repeat with correct attribution |
| Ancillaries section does not open, or exposes nothing | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-22. Record against the capability matrix |
| A capability recorded as Supported is not exposed live | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-08, ANC-22. Applies to Baggage/Meal/Seat. Produces a discrepancy record |
| A capability recorded as Unsupported **is** exposed live | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-08, ANC-22. Applies to Bundle. Discrepancy record, not a defect |
| Selection rejected by a Supplier restriction (quantity, eligibility, passenger type, route, fare family) | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-41. Restrictions are recorded from evidence, never invented |
| Selected ancillary missing after booking | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-25, ANC-32. Classified as `Missing` at the failing checkpoint |
| Price or currency mismatch across checkpoints | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | ANC-33, ANC-36, ANC-42. Pricing contract is confirmed — a mismatch against it is a defect candidate |
| Supplier error or timeout during ancillary retrieval or booking | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | To Be Discovered | Requirement ID: —. No requirement defines an expected error contract. Record as observed |

## 9. Historical / Comparison Evidence — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Old integration-layer implementation available for this supplier? | Unknown | Unknown | — | |
| Same booking retrievable through both old and new paths? | Unknown | Unknown | — | |
| Old UI behavior | Unknown | Unknown | — | |
| Old API payload | Unknown | Unknown | — | |
| Existing supplier payload examples | Unknown | Unknown | — | |
| Existing Postman/Swagger/API documentation | Not supplied | Provided | Sup010 left blank | |
| Existing test cases | Shared Ancillaries baseline suite and runner groups | Provided | `shared/ancillaries-baseline/test_design/`; `runner/` | Applicability is decided by the Capability Plan |
| Existing Azure test cases (if available) | Unknown | Unknown | — | |
| Existing logs/screenshots/test evidence | None | Provided | — | First Spicejet scope |
| Existing production/UAT evidence | Unknown | Unknown | — | |
| Known accepted differences | Unknown | Unknown | — | |
| Known migration differences | Unknown | Unknown | — | |
| Historical supplier limitations | Unknown | Unknown | — | |

## 10. Automation Feasibility — GENERIC

Ancillaries staging runs execute through the runner CLI (`supplier_feature_runner/cli.js`), one
command per Setup Group; production runs execute manually (`CLAUDE.md`, Ancillaries runs). This section
assesses feasibility only. It does not authorize automation.

### 10a. UI Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Framework available | Ancillaries runner (`supplier_feature_runner`) | Provided | `CLAUDE.md` | |
| Stable locators | To Be Discovered | To Be Discovered | — | Proven per Supplier on first live run |
| Test-user availability | To Be Discovered | To Be Discovered | — | |
| Environment stability | Unknown | Unknown | — | |
| Test-data repeatability | Fresh passenger names and document numbers on every booking run; future travel date | Provided | Feature Execution Flow | |
| Destructive-action risk | High: Book, Hold and Pay complete real bookings and debit the agency wallet | Provided | `execution_safety_policy.json`; ANC-46 | The runner never presses Book/Hold/Pay; the human does (groups 14–17) |
| Cleanup/reset capability | Unknown | Unknown | — | |

### 10b. API Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Endpoint callable directly | Unknown | Unknown | — | Integration URLs known (§3b); keys redacted |
| Authentication automatable | Unknown | Unknown | — | |
| Test data reusable | Unknown | Unknown | — | |
| Request generation possible | Unknown | Unknown | — | No Postman collection supplied (Sup010) |
| Response assertions possible | Unknown | Unknown | — | |
| Mocking/stubbing available | Unknown | Unknown | — | |
| Supplier dependency controllable | Unknown | Unknown | — | |

### 10c. E2E Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Can supplier calls be executed safely? | Search and quote only; booking needs human action | Provided | `CLAUDE.md` | |
| Can real supplier responses be used? | To Be Discovered | To Be Discovered | — | |
| Can wallet effects be verified? | Unknown | Unknown | — | |
| Can database effects be verified? | Unknown | Unknown | — | |
| Can booking persistence be verified? | To Be Discovered | To Be Discovered | — | Retrieve supported (Sup008) |
| Can cleanup/reset be performed? | Unknown | Unknown | — | |
| Can tests run repeatedly? | Only with fresh passenger data and a current future date | Provided | Feature Execution Flow | |
| Parallel/concurrency feasibility | Unknown | Unknown | — | |
| External supplier limitations | To Be Discovered | To Be Discovered | — | |

## 11. Discovery Contacts / Ownership — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Developer/contact responsible for supplier integration | Unknown | Unknown | — | |
| Person who can confirm API contract/mapping | Unknown | Unknown | — | |
| Person who can confirm business behavior | Unknown | Unknown | — | |
| Person who can confirm UI behavior | Unknown | Unknown | — | |
| Person who can provide supplier test data | Unknown | Unknown | — | |
| Person who can provide environment/access | Unknown | Unknown | — | |
| Other relevant owner/contact | Hussein: Supplier scope approver; supplied the supplier integration checklist | Provided | `supplier.json` | |

## 12. Open Questions — GENERIC + INJECTED

**Supplier-level (Spicejet):**

| # | Open Question | Category | Status | Owner | Evidence/Source | Notes |
|---|---|---|---|---|---|---|
| SUP-OQ-01 | What is the Provider ID for Spicejet? | Missing access | Unknown | Unknown | Intake | §1, §3b |
| SUP-OQ-02 | Which PCC does "SpiceJetxxxx" use? | Environment issue | To Be Discovered | Unknown | Intake | §3b. ANC-16, ANC-17 |
| SUP-OQ-03 | Run scope: full Ancillaries suite or a seat-map-only run? Which testing layers are in scope? | Business decision required | Pending Confirmation | Hussein | Intake | Decides §2 and §2b |
| SUP-OQ-04 | Multi-segment test data for Spicejet among DEL, BOM, BLR, DXB, LHR | Missing test data | To Be Discovered | Unknown | Profile §A | |
| SUP-OQ-05 | Test Branch/Agency and accounts for Spicejet runs (Admin and Portal URLs supplied 2026-10-28) | Missing access | To Be Discovered | Unknown | Profile §A, ANC-14 | |
| SUP-OQ-06 | Sup004 (API Key) is blank while Sup001/Sup002 carry keys — is a separate key expected? | Missing access | Open | Unknown | Supplier checklist | Keys are never recorded here |

**Feature-level (injected from the Profile's "Open Questions carried from the shared context"):**

| # | Open Question | Category | Status | Owner | Evidence/Source | Notes |
|---|---|---|---|---|---|---|
| OQ-ANC-09 | Seat / Seatmap boundary — deferred by decision | Business decision required | Open — deferred by decision | Unknown | ProjectContext §8, OQ-ANC-09. CapabilityModel §10 | Affects §A and §B Seat rows — Seat is Supported for Spicejet |
| OQ-ANC-10 | Bundle / Upselling boundary — deferred by decision | Business decision required | Open — deferred by decision | Unknown | ProjectContext §8, OQ-ANC-10. CapabilityModel §10 | Moot for Spicejet — Bundle Not Supported |

Feature-level UI notes that sit alongside these questions are in the Feature Checklist Profile §D.
They are referenced here, not copied.

## 13. Intake Decision — GENERIC

> **The Intake Decision does not gate Supplier scope or run creation.** "Blocked from Discovery"
> means the Supplier scope/run may still exist — it means meaningful Discovery cannot proceed until
> the recorded blocker(s) below are resolved.

| Field | Value |
|---|---|
| Decision | Ready with known blockers |
| Reason | Supplier identity, credential, capabilities, rules, routes, currency and integration endpoints were supplied. Application access and run scope are not yet recorded |
| Blocking items (if any) | SUP-OQ-03 run scope (Pending Confirmation). SUP-OQ-05 Admin/Portal access (To Be Discovered) |
| Recorded by | Rendering agent (Claude), for Hussein. Human review Pending Confirmation |
| Date | 2026-10-28 |
