# Supplier Checklist — {{SUPPLIER_NAME}}

<!-- Renders to: platform_core_data/supplier-features/{{FEATURE_SLUG}}/suppliers/{{SUPPLIER_SLUG}}/context/SupplierChecklist.md -->
<!-- This is an INTAKE document, not a completeness gate. Unknown fields are recorded as Unknown /
     To Be Discovered / Blocked / Pending Developer Confirmation — they do not block Supplier scope
     creation or run start. Discovery is where most Unknown/To Be Discovered items get resolved.

     This document is NOT a frozen one-time snapshot. It is created at intake and refined in place
     across Discovery as information becomes verified. Every update is recorded in the Revision
     History table below — what changed, why, and on what evidence — so no earlier assumption is
     silently overwritten.

     THIS TEMPLATE IS GENERIC AND FEATURE-AGNOSTIC. It must remain reusable, unmodified, across every
     Supplier Feature — whatever integration layer that Feature declares, or none at all. The
     hierarchy it represents is Supplier Features -> Feature -> Supplier. There is no Service tier,
     and `integrationLayer` is Feature METADATA, never an organizational parent
     (module_architecture.md §11.1, §11.2).
     Feature-specific rows are never hardcoded here — they are injected at render time from that
     Feature's FeatureChecklistProfile.md (platform_core/templates/supplier_feature_intake/FeatureChecklistProfile.md
     is the generic Profile template; each Feature has its own populated instance at
     supplier-features/{{FEATURE_SLUG}}/context/FeatureChecklistProfile.md). Sections/rows
     marked "GENERIC — cross-Feature" belong in this file. Sections/rows marked "INJECTED FROM FEATURE
     PROFILE" are populated by the renderer, never authored directly into this template.

     Injection points: §5b (Test Data), §5c (Feature Capability Matrix — CONDITIONAL, see below),
     §7b (Behavior), §8b (Errors), and §12 (Feature-level Open Questions). §5b, §7b, §8b and §12
     ALWAYS render — as an explicit gap when the Feature has no Profile yet. §5c is the sole
     conditional one: it renders only when the Feature has a Capability Model on disk, and is omitted
     entirely otherwise.

     {{INTEGRATION_LAYER}} is filled from the Feature's registered `integrationLayer` value —
     e.g. `ndc-core-service`, another integration, or `null`. Render a null/absent value as
     `Unknown / not declared`, never as a guess and never omitted. It is recorded as metadata only;
     nothing in this checklist may treat it as the Feature's owner or parent. -->

**Scope family:** Supplier Features → Feature → Supplier
**Feature:** {{FEATURE_NAME}} ({{FEATURE_SLUG}})
**Integration Layer:** {{INTEGRATION_LAYER}} <!-- Feature metadata: ndc-core-service / another integration / Unknown — not an owner -->
**Supplier:** {{SUPPLIER_NAME}} ({{SUPPLIER_SLUG}})
**Status:** {{STATUS}} <!-- Draft / Proposed / Approved -->
**Revision:** {{REVISION_COUNT}}
**Last Updated:** {{LAST_UPDATED}}
**Produced by run:** {{RUN_FOLDER}}
**Rendered from Feature Profile:** {{FEATURE_CHECKLIST_PROFILE_PATH}} (revision {{FEATURE_CHECKLIST_PROFILE_REVISION}})

### Revision History

| Rev | Date | Changed By | What Changed | Why / Evidence |
|---|---|---|---|---|
| 1 | | | Initial intake | |

---

> A Supplier scope is the **complete QA ownership boundary** for this Feature + Supplier
> implementation:
>
> ```
> Application UI
>     ↓
> Application
>     ↓
> Integration Layer  ({{INTEGRATION_LAYER}} — omit this tier when the Feature declares none)
>     ↓
> Supplier
> ```
>
> The middle tier is whatever this Feature actually declares as its `integrationLayer`. It is not
> assumed to exist, and it is not assumed to be NDC Core Service. A Feature with
> `integrationLayer: null` has a three-tier path, and that is a complete, valid scope — not a gap.
> A Feature may also span more than one application (e.g. an Admin application for configuration and
> a Portal application for the business flow); record each application's own access details
> separately rather than collapsing them into one row.
>
> It is not an API-only or contract-only scope by default. Unless a specific run is explicitly
> narrowed by the human, a Supplier run is **Full Feature QA** — UI, API, Contract, Integration,
> E2E, Regression, DB, Security, and Performance, wherever each is technically and functionally
> applicable (see §2b Testing Layer Scope).
>
> This checklist captures only **supplier-specific** information: applicability, supplier-specific
> behavior, mappings, test data/evidence, deviations, blockers, execution capability, and
> testing-layer applicability. Shared Feature business requirements are owned by, and not duplicated
> from, this Feature's approved shared context(s) — see this Feature's `FeatureChecklistProfile.md`
> for the exact source path(s) and revision(s) used to populate the injected rows below.
> Supplier-specific Test Cases must trace back to the relevant shared requirement IDs.
>
> This template is reusable across every Supplier Feature and every Supplier. It never
> assumes one Feature's UI, mappings, or business flow apply to another. The same Supplier name under
> two different Features is two completely independent Supplier scopes (e.g. `NDCGal / Refund` ≠
> `NDCGal / Import Booked PNR`).

<!-- Every field below carries a Status value:
     Confirmed | Provided | Unknown | To Be Discovered | Blocked | Pending Developer Confirmation | N/A
     plus Evidence/Source and Notes. A field with no evidence yet is still recorded — never omitted,
     and never invented. -->

## 1. Supplier Identity — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Supplier name | | | | |
| Provider ID / code | | | | |
| Integration type (if known) | | | | |
| Airline/GDS scope (if applicable) | | | | |

## 2. Supplier Scope — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Feature capability being implemented | | | | |
| Supported booking/use cases | | | | |
| Known exclusions | | | | |
| Known supplier limitations | | | | |
| UI scope included? | Yes / No / Unknown | | | |
| API scope included? | Yes / No / Unknown | | | |
| Contract scope included? | Yes / No / Unknown | | | |
| Integration scope included? | Yes / No / Unknown | | | |
| E2E scope included? | Yes / No / Unknown | | | |
| Regression against previous integration required? | Yes / No / Unknown | | | |
| DB validation applicable? | Yes / No / Unknown | | | |
| Security testing applicable? | Yes / No / Unknown | | | |
| Performance testing applicable? | Yes / No / Unknown | | | |

## 2c. Supplier Capabilities — GENERIC

<!-- WHAT THIS IS. Which of the six optional actions this Supplier can perform. Booking itself is
     NOT listed: every Supplier books, so the question would gate nothing. Suppliers differ:
     flynas has no Hold and no Pay after Hold. A test case that needs a capability the Supplier lacks
     is EXCLUDED before execution, never run and failed (`ndc_execution_rules.md` §A15).

     ASKED AT INTAKE, always, one question per row (`new_us_intake.md` §12.2 step 3). It is never
     inferred from the Supplier's name, from another Supplier, or from what the UI happens to show.

     `Unknown` is treated as Not Supported by the capability gate — nothing is guessed. Answer it
     properly before a run rather than leaving it to that default.

     THE RECORDED VALUE IS supplier.json, NOT THIS TABLE. Write it with
     `module_manager/cli.js supplier-feature supplier capabilities <feature> <supplier> --hold no ... --by "<who>"`,
     which appends to `capabilityHistory`. This table mirrors it for a human reader. Never hand-edit
     either one. -->

| Capability | Supported / Not Supported / Unknown | Source | Notes |
|---|---|---|---|
| Hold | Unknown | Intake — {{WHO}}, {{DATE}} | Can a booking be held without paying? |
| Pay after Hold | Unknown | Intake — {{WHO}}, {{DATE}} | Can a held booking be paid later? Depends on Hold — Not Supported whenever Hold is, and not asked at intake in that case |
| Meal | Unknown | Intake — {{WHO}}, {{DATE}} | Are meals sold? |
| Baggage | Unknown | Intake — {{WHO}}, {{DATE}} | Is extra baggage sold? |
| Seat | Unknown | Intake — {{WHO}}, {{DATE}} | Is seat selection offered? |
| Bundle | Unknown | Intake — {{WHO}}, {{DATE}} | Are fare bundles/packages offered? |

## 2b. Testing Layer Scope — GENERIC

<!-- Default: every layer is In Scope unless the human explicitly restricts a specific run — a
     restriction is a deliberate, stated decision, never an assumption. "In Scope" means the layer
     belongs to this Supplier's QA scope and must be considered during Discovery and Test Design; it
     does NOT mean every possible test in that layer executes immediately. If a layer can't currently
     be executed (missing access/environment/test data/tooling), prefer "Deferred + reason" over
     silently downgrading it to "Out of Scope" — Out of Scope is a scope decision, Deferred is a
     capability gap. A reason is mandatory for anything not fully In Scope. A single test case may
     later carry more than one layer tag (e.g. "UI + E2E + Regression", "API + Contract + Integration"). -->

| Layer | In Scope / Out of Scope / Deferred | Reason (mandatory if not In Scope) | Notes |
|---|---|---|---|
| UI | In Scope | | |
| API | In Scope | | |
| Contract | In Scope | | |
| Integration | In Scope | | |
| E2E | In Scope | | |
| Regression | In Scope | | |
| DB | In Scope | | |
| Security | In Scope | | |
| Performance | In Scope | | |

## 3. Environment & Access — GENERIC

### 3a. UI

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Application URL/environment | | | | |
| Required role/user | | | | |
| Navigation/menu availability | | | | |
| Supplier configuration visibility | | | | |
| Branch/Agency/PCC setup | | | | |
| Required permissions | | | | |
| Test account availability | | | | |

### 3b. API / Integration

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Integration layer base URL (per the Feature's declared `integrationLayer`; N/A when it declares none) | | | | |
| Endpoint(s) | | | | |
| Authentication mechanism | | | | |
| Supplier credential | | | | |
| Provider ID | | | | |
| Environment availability | | | | |
| Logs/observability access | | | | |
| Swagger/OpenAPI/Postman availability | | | | |
| Direct API access availability | | | | |

### 3c. Source / Target Environment Model (if applicable)

<!-- A generic CAPABILITY, not a rule that every Supplier Feature must use two environments. Some Feature
     flows need a separate preparation environment to produce input test data before the Feature under
     test can be exercised (e.g. Import Booked PNR — see its FeatureChecklistProfile.md /
     ExecutionFlow_*.md for whether and why); others don't. Mark "Dual-environment execution required?"
     N/A and leave the rest blank when this Feature has no such requirement — do not invent a Source
     environment where the Feature's own execution knowledge doesn't call for one. -->

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Dual-environment execution required? | Yes / No / N/A | | | |
| Source Environment (preparation/offline environment, if required) | | | | |
| Target Environment (the environment under test) | | | | |
| Feature-level Execution Flow reference (path, if one exists for this Feature) | | | | |

## 4. UI / User Flow — GENERIC

<!-- Capture the CURRENT flow for THIS Feature only — never assume one Feature's UI applies to
     another. Field labels are generic; values are always supplier/Feature-specific and filled in
     per Supplier, never pre-filled here. -->

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Screen/page name | | | | |
| Entry/navigation path | | | | |
| Required fields | | | | |
| Supplier selection | | | | |
| Supplier credential selection | | | | |
| Branch/Agency/Agent fields (where applicable) | | | | |
| Search/action buttons | | | | |
| Expected successful flow | | | | |
| Expected failure behavior/messages | | | | |
| Loading/progress behavior | | | | |
| Data displayed after retrieval | | | | |
| UI validations | | | | |
| Role/permission differences | | | | |
| Known UI limitations | | | | |
| UI evidence/screenshots/designs available | | | | |

## 5. Test Data

<!-- Mark items N/A when not relevant to the selected Feature. Missing test data is never automatic
     grounds to block scope/run creation — record it as a Discovery blocker or open item instead. -->

### 5a. Generic Test Data — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| UI account/user | | | | |
| Valid organization/branch | | | | |
| Valid happy-path test data | | | | |
| Invalid/negative test data | | | | |
| Multi-passenger data (if applicable) | | | | |
| Multi-segment data (if applicable) | | | | |
| Supplier-specific test data | | | | |

### 5b. Feature-Specific Test Data — INJECTED FROM FEATURE PROFILE

<!-- Rows injected from this Feature's FeatureChecklistProfile.md §A. Do not author Feature-specific
     rows directly in this file — edit the Feature's Profile instead, then re-render. -->

| Test Data Item | Why (Requirement ID) | Notes |
|---|---|---|
| *(injected at render time)* | | |

### 5c. Feature Capability Matrix — INJECTED FROM FEATURE PROFILE (CONDITIONAL)

<!-- CONDITIONAL SECTION. It renders ONLY when this Feature has a Capability Model — that is, when
     supplier-features/{{FEATURE_SLUG}}/context/CapabilityModel.md exists. When it does not exist,
     the renderer OMITS this section entirely: no heading, no empty table, no "not yet available" gap
     line. Many Features have no capability-driven Supplier variation, and an empty matrix on those
     would read as an unanswered obligation that does not exist.

     This differs deliberately from §5b/§7b/§8b, which always render (as a gap when the Feature has
     no Profile yet) because every Feature has test data, behaviors, and errors. Not every Feature
     has capabilities that vary per Supplier.

     The section stays FEATURE-AGNOSTIC. Its dimensions, allowed values, and status vocabulary come
     from the Feature's own CapabilityModel.md — never hardcoded here. Ancillaries has one (Baggage /
     Meal / Seat / Bundle, with per-capability application levels); a Feature such as Refund or
     Seatmap gets one only if and when its own capability variation is defined and approved.

     RENDERING RULES:
     1. One row per capability in the Feature's capability register, per the Feature's dimensions.
     2. Values the human supplied at Supplier intake render with Source Status = `Provided`. They are
        NEVER reset to `To Be Discovered` — that value is the ABSENCE default only.
     3. Capability Result and Source Status are two INDEPENDENT axes and are never merged into one
        column. Each dimension carries its own Source Status.
     4. Source Status is carried through UNCHANGED. Rendering never promotes `Provided` to `Verified`
        or `Discovered` — the same rule that stops §7b rendering from promoting `Open` to
        `Confirmed`.
     5. A dimension with no supplied value renders `To Be Discovered` with Source Status `—`.
     6. Discovery updates this table in place, and records a contradiction using the Feature's
        discrepancy record (Provided Value / Discovery Finding / Final Verified Value / Evidence /
        Change Reason) — never by overwriting the Provided value.
     7. This is a LIVING table: opened at Supplier intake, refined during Discovery, and read by Test
        Design, which applies the Feature Capability Model's own Test Design gate. -->

| Capability | Capability Result | Source Status | Application Level | Source Status | Other dimensions (per the Feature's Capability Model) | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| *(injected at render time from the Feature's Capability Model, plus any values provided at intake)* | | | | | | | |

**Discrepancy records for this Supplier** — one block per contradicted value, appended, never
overwriting:

| Capability | Dimension | Provided Value | Discovery Finding | Final Verified Value | Evidence | Change Reason |
|---|---|---|---|---|---|---|
| *(appended during Discovery; empty until a contradiction is found)* | | | | | | |

## 6. Contract / Mapping — GENERIC

<!-- Do NOT invent mandatory fields, nullability, exact status/error codes, array representation,
     min/max lengths, provider casing rules, supplier limitations, or field formats without evidence. -->

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Request shape | | | | |
| Response shape | | | | |
| Provider-specific fields | | | | |
| Original ticketing date/time mapping (if applicable to this Feature) | | | | |
| Booking status mapping | | | | |
| Supplier status → platform status mapping | | | | |
| Supplier identifier / provider routing | | | | |
| Passenger mapping | | | | |
| Passenger type mapping | | | | |
| Segment mapping | | | | |
| Fare/tax/currency mapping | | | | |
| Ticket/coupon mapping | | | | |
| Passenger ↔ ticket relationship | | | | |
| Segment ↔ coupon relationship | | | | |
| Baggage mapping | | | | |
| Ancillary/service mapping | | | | |
| Known nullable/optional fields | | | | |
| Fields required by the UI/business layer | | | | |
| Differences from the old integration-layer mapping (if applicable) | | | | |

## 7. Business / E2E Flow

<!-- Do NOT duplicate shared Feature requirements as new supplier requirements. Reference the
     approved shared Feature Context and record only this supplier's applicability/execution status
     against each shared behavior. The base template defines the table structure only — the Behavior
     rows are injected from this Feature's FeatureChecklistProfile.md §B. -->

### 7a. Table Structure — GENERIC

| Behavior | Inherited Requirement ID | Supplier Applicability | Test Data Available? | Execution Layer | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| *(rows injected at render time from FeatureChecklistProfile.md §B — see 7b)* | | | | | | |

### 7b. Behavior Rows — INJECTED FROM FEATURE PROFILE

<!-- Populated 1:1 from FeatureChecklistProfile.md §B "Behavior" and "Inherited Requirement ID"
     columns. This Supplier's "Supplier Applicability", "Test Data Available?", "Execution Layer" and
     "Status" columns are filled in per Supplier during Discovery — the Profile never fills them,
     since applicability is a per-Supplier judgment. -->

*(injected at render time)*

<!-- Execution Layer values: UI / API / Contract / Integration / E2E / Regression / DB.
     A behavior marked Open/Provisional/Pending Confirmation in the Profile keeps that status here —
     rendering never promotes it to Confirmed. -->

### 7c. Supplier-Specific Rules — GENERIC

<!-- Feature-level business rules apply to EVERY Supplier of this Feature. This table holds only the
     rules that belong to THIS Supplier — an extra restriction, an exception, or a stricter version of
     a Feature rule (e.g. ladies-only seats on one airline).

     Collected at intake, BEFORE the first run on this Supplier: ask the human running the pipeline
     "Does this Supplier have rules of its own, beyond the Feature's rules?" (ndc_execution_rules.md
     §A2). Record each answer here with its source. "None" is a valid, recorded answer — never left
     blank. A rule found later in live behavior is added here as Pending Confirmation until the human
     confirms it; it is never promoted to the Feature's rules from one Supplier alone. -->

| Rule | Slug | Relation to Feature rules | Applies to | Expected behavior | Source | Status |
|---|---|---|---|---|---|---|
| {{SUPPLIER_RULE}} | {{rule-slug}} | Adds / Replaces / Stricter than `<Feature rule>` | | | Intake — {{WHO}}, {{DATE}} | Confirmed / Pending Confirmation |

<!-- `Slug` is what a test case's `Supplier Rule` column names (e.g. `ladies-only-seats`), so the
     capability gate can tell which rule-specific cases belong to this Supplier. Record the CONFIRMED
     slugs with `... supplier rules <feature> <supplier> --value "slug,slug"|none --by "<who>"`; a rule
     still Pending Confirmation is not recorded there, so its cases stay excluded until it is confirmed. -->

## 8. Error Handling

<!-- Distinguish where possible: Supplier behavior → integration-layer behavior → application
     behavior → UI behavior. Do not assume a supplier error is exposed to the UI unchanged.
     The "Integration Layer Behavior" column is N/A for a Feature that declares no integration
     layer — leave it N/A rather than inventing a tier that does not exist for that Feature. -->

### 8a. Generic Cross-Feature Error Categories — GENERIC

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| Invalid request | | | | | | |
| Supplier timeout | | | | | | |
| Supplier unavailable | | | | | | |
| Authentication failure | | | | | | |
| Malformed response | | | | | | |
| Partial response | | | | | | |
| Unexpected supplier response | | | | | | |
| Integration-layer normalized error (N/A where the Feature declares no integration layer) | | | | | | |

### 8b. Feature-Specific Error Rows — INJECTED FROM FEATURE PROFILE

<!-- Rows injected from this Feature's FeatureChecklistProfile.md §C. -->

| Error Case | Supplier Behavior | Integration Layer Behavior | Application Behavior | UI Behavior (toaster/message/page/retry) | Status | Evidence/Notes |
|---|---|---|---|---|---|---|
| *(injected at render time)* | | | | | | |

## 9. Historical / Comparison Evidence — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Old integration-layer implementation available for this supplier? | | | | |
| Same booking retrievable through both old and new paths? | | | | |
| Old UI behavior | | | | |
| Old API payload | | | | |
| Existing supplier payload examples | | | | |
| Existing Postman/Swagger/API documentation | | | | |
| Existing test cases | | | | |
| Existing Azure test cases (if available) | | | | |
| Existing logs/screenshots/test evidence | | | | |
| Existing production/UAT evidence | | | | |
| Known accepted differences | | | | |
| Known migration differences | | | | |
| Historical supplier limitations | | | | |

<!-- Do not automatically treat every old behavior as correct if a current requirement explicitly
     changed it — record the old behavior as evidence, not as the target. -->

## 10. Automation Feasibility — GENERIC

<!-- Feasibility only — a positive assessment here is not authorization to start automation.
     Automation still follows the platform's normal approval/workflow rules. -->

### 10a. UI Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Framework available | | | | |
| Stable locators | | | | |
| Test-user availability | | | | |
| Environment stability | | | | |
| Test-data repeatability | | | | |
| Destructive-action risk | | | | |
| Cleanup/reset capability | | | | |

### 10b. API Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Endpoint callable directly | | | | |
| Authentication automatable | | | | |
| Test data reusable | | | | |
| Request generation possible | | | | |
| Response assertions possible | | | | |
| Mocking/stubbing available | | | | |
| Supplier dependency controllable | | | | |

### 10c. E2E Automation

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Can supplier calls be executed safely? | | | | |
| Can real supplier responses be used? | | | | |
| Can wallet effects be verified? | | | | |
| Can database effects be verified? | | | | |
| Can booking persistence be verified? | | | | |
| Can cleanup/reset be performed? | | | | |
| Can tests run repeatedly? | | | | |
| Parallel/concurrency feasibility | | | | |
| External supplier limitations | | | | |

## 11. Discovery Contacts / Ownership — GENERIC

| Field | Value | Status | Evidence/Source | Notes |
|---|---|---|---|---|
| Developer/contact responsible for supplier integration | | | | |
| Person who can confirm API contract/mapping | | | | |
| Person who can confirm business behavior | | | | |
| Person who can confirm UI behavior | | | | |
| Person who can provide supplier test data | | | | |
| Person who can provide environment/access | | | | |
| Other relevant owner/contact | | | | |

## 12. Open Questions — GENERIC + INJECTED

<!-- Every meaningful Unknown / To Be Discovered / Blocked / Pending Developer Confirmation item
     above should trace to a row here. Nothing unresolved is dropped silently. This section also
     carries forward the "Open Questions carried from the shared context" list from this Feature's
     FeatureChecklistProfile.md, so a Supplier's own open items sit alongside the Feature-level ones
     that affect it. -->

| # | Open Question | Category | Status | Owner | Evidence/Source | Notes |
|---|---|---|---|---|---|---|
| | | Unknown contract behavior / Missing access / Missing test data / Unconfirmed supplier behavior / UI behavior / Mapping decision / Business decision required / Environment issue / Automation limitation / Historical behavior requiring confirmation | | | | |
| *(Feature-level Open Questions injected here from FeatureChecklistProfile.md)* | | | | | | |

## 13. Intake Decision — GENERIC

> **The Intake Decision does not gate Supplier scope or run creation.** "Blocked from Discovery"
> means the Supplier scope/run may still exist — it means meaningful Discovery cannot proceed until
> the recorded blocker(s) below are resolved. Blockers are tracked here and in §12, not used to
> refuse creating the scope.

| Field | Value |
|---|---|
| Decision | Ready for Discovery / Ready with known blockers / Blocked from Discovery |
| Reason | |
| Blocking items (if any) | |
| Recorded by | |
| Date | |
