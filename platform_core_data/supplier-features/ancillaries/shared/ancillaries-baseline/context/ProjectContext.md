# Project Context — Ancillaries (Shared Feature Baseline)

<!-- Shared scope: ancillaries-baseline. This is the single approved source of the shared Ancillaries
     business model and of the ANC-xx requirement ID series. It holds ONLY what the business supplied
     and confirmed. Nothing here is inferred from Import Booked PNR, from a Supplier name, from the
     word "NDC", or from how a travel system usually behaves. Anything not supplied is an Open
     Question in §8 or a per-Supplier To Be Discovered value in the Capability Model — never a
     requirement written here. -->

**Feature:** Ancillaries (`ancillaries`)
**Integration layer:** `ndc-core-service` — set 2026-09-23 on confirmed evidence from AirIndia's
onboarding (OQ-ANC-11), via `cli.js supplier-feature feature set-integration-layer`
(`module_architecture.md` §11.2, §11.4). This is Feature metadata, not an organizational parent —
see §12.2a of `new_us_intake.md` for why it is never presented as owning the Feature.
**Shared scope:** `ancillaries-baseline`
**Canonical location:** `platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/context/ProjectContext.md`
**Status:** Approved
**Approved by:** Ahmed Alhussieny
**Approved on:** 2026-09-28 (rev 4)
**Revision:** 4 (2026-09-28 — adds ANC-54…ANC-58, Admin's own booking cycle)
**Last Updated:** 2026-09-28
**Source:** Business-supplied Ancillaries Feature definition and its two rounds of corrections,
recorded 2026-09-04, a third round resolving OQ-ANC-01 through OQ-ANC-08, supplied by
Ahmed Alhussieny and recorded 2026-09-23, plus a fourth round resolving OQ-ANC-03b and the
remainder of OQ-ANC-04, supplied by Ahmed Alhussieny and recorded 2026-09-25 during AirIndia's
Stage 1 Project Context revision. **A fifth round (2026-09-27/28), approved 2026-09-28**, supplied by
Ahmed Alhussieny during AirIndia's Stage 2/3 sessions via direct narration and screenshots of the live
Admin application, established that Admin provides its own parallel booking cycle, recorded as
ANC-54…ANC-58.

## 1. Scope Summary

Ancillaries is a Supplier-driven Feature. Customers select additional services — Baggage, Meal, Seat,
Bundle, and possibly other types found later — during the booking flow. Those selections must be
priced, carried through booking, and persisted correctly.

The Feature is **not implemented identically across Suppliers**. Different Suppliers support
different combinations of ancillary types, and they differ in how an ancillary is applied (per
segment, per journey, per passenger, booking-wide, or a mix). This variability is the defining
property of the Feature, not an edge case.

So this shared baseline defines the **workflow and the capability model**. It deliberately defines no
fixed capability set. What a given Supplier actually supports is recorded in that Supplier's own
scope, against the model in
`platform_core_data/supplier-features/ancillaries/context/CapabilityModel.md`.

## 2. In Scope for This Shared Baseline

- The shared navigation and execution flow, across two applications (§4).
- The Admin configuration precondition that every Ancillaries execution depends on.
- The capability model: dimensions, allowed values, and the rules that govern them.
- The Segment / Journey / Passenger / Booking-wide application concept.
- The shared evidence, comparison, and pricing-capture model.
- The capability information flow, from intake through Discovery to Test Design.

## 3. Out of Scope for This Shared Baseline

- Any Supplier's actual supported capability set.
- Any Supplier's actual application level, credentials, PCC, market, routes, or test data.
- Any Supplier's API mapping, pricing behavior, restrictions, UI deviations, or error catalogue.
- Test Cases of any kind. This baseline issues requirement IDs; it designs no coverage.

**Added 2026-09-27/28, on Admin's own booking cycle (§6.12):** the following Admin-side controls are
explicitly Out of Scope for Ancillaries verification, per direct business decision — not because they
were overlooked, but because they were named and deliberately excluded:
- Admin's **Markup / Send Quotation / Save Quote** search-results controls (mid-office quoting tools).
- Admin's **"Void/Cancel"** control on a booking's detail page. Its mere presence does not reopen
  ANC-52 (post-booking immutability, confirmed via Portal) — that requirement stands; this control is
  simply not exercised or asserted against by this Feature.
- **Daily Sales Report** (one of Admin's report cards) — never evidenced, explicitly excluded.
- **Banque Misr** as a payment method — noted as existing alongside Wallet, but not itself in scope.

### 3.1 Feature boundaries — open by decision

Ancillaries may expose **Seat** and **Bundle** as Supplier capabilities. Exposing them does **not**
mean Ancillaries owns the complete Seatmap or Upselling business scope. Those boundaries are defined
when those Features are introduced — OQ-ANC-09, OQ-ANC-10. Neither Feature is registered today.

## 4. Application Responsibility Split

Two applications are involved. This split is confirmed business information.

| Application | Owns |
|---|---|
| **Admin** | Configure/select the Branch · ensure the Supplier is assigned · ensure the correct Supplier Credential / PCC / Market is available · **also provides its own parallel booking cycle (Booking-Mid Office) — see §6.12, ANC-54…ANC-58 (confirmed 2026-09-27/28)** |
| **Portal** | Search flights · select a flight returned by the Supplier under test · continue to PAX Details · open and use Ancillaries per the Supplier's supported capabilities · continue booking · validate persistence and pricing |

Import Booked PNR's Source/Target dual-**environment** preparation model
(`ndc_execution_rules.md` §C1) is **not inherited** — Ancillaries creates its booking inside its own
flow and needs no separately prepared offline booking. It is equally **not assumed** that Admin and
Portal share one environment. Their environment, URL, access, and account details are recorded
independently until OQ-ANC-08 is verified. See ANC-26.

## 5. Roles & Credentials Required

| Item | Status |
|---|---|
| Admin user able to configure a Branch and assign a Supplier + Credential | Required — actual role name To Be Discovered |
| Portal user able to search, book, and select ancillaries | Required — actual role name To Be Discovered |
| Whether the two are the same account | **Open** — OQ-ANC-08 |
| Supplier Credential / PCC / Market to be used | Chosen deliberately per Supplier and recorded exactly — ANC-17 |

## 6. Requirements — ANC-xx

Type: **BUS** business model · **EXE** execution flow · **GOV** capability governance ·
**DSC** Discovery obligation.

Every row below traces to supplied business information. Platform-wide rules are **not** restated
here as requirements — the full-QA-layer default (`ndc_execution_rules.md` §A3), Supplier inheritance
by reference (§A1), run-scope freeze (§A4), and Supplier-XOR-shared-scope (§A5) apply by reference.
Duplicating them would create a second copy that drifts.

### 6.1 Capability governance

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-01 | GOV | Ancillaries is Supplier-driven. Capability support is not identical across Suppliers, and no fixed capability set is defined at Feature level | Confirmed |
| ANC-02 | GOV | Four capability types are known today — Baggage, Meal, Seat, Bundle. The register is extensible; a type found later is added by approval, never silently | Confirmed |
| ANC-03 | GOV | Each capability carries its own independent Capability Result: Supported / Unsupported / To Be Discovered / Blocked / N/A | Confirmed |
| ANC-04 | GOV | Each capability carries its own independent Source Status: Provided / Discovered / Verified / Pending Verification / Conflicting Evidence. Source Status and Capability Result are never merged into one value | Confirmed |
| ANC-05 | GOV | A capability confirmed Unsupported for a Supplier is a recorded capability fact, never a product defect | Confirmed |
| ANC-06 | GOV | One Supplier's capability support is never inferred from another Supplier's | Confirmed |
| ANC-07 | GOV | Capability information enters at Supplier intake as `Provided` when the human supplies it. A Provided value is never reset to `To Be Discovered` | Confirmed |
| ANC-08 | GOV | A Discovery finding that contradicts a Provided value never overwrites it. The record keeps Provided Value, Discovery Finding, Final Verified Value, Evidence, and Change Reason | Confirmed |
| ANC-09 | GOV | The Supplier Checklist is a living document — opened at Supplier intake, refined through Discovery, consumed by Test Design | Confirmed |

### 6.2 Application model

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-10 | BUS | Application level is recorded per capability, never as one global value per Supplier | Confirmed |
| ANC-11 | BUS | Allowed application levels: Per Passenger, Per Segment, Per Journey, Booking-wide, Mixed, To Be Discovered | Confirmed |
| ANC-12 | BUS | Different capabilities within one Supplier may use different application levels. That is a legal recorded state, e.g. Baggage = Journey while Meal = Segment | Confirmed |
| ANC-13 | BUS | Segment-level and Journey-level behavior are both real models. Neither is assumed for a Supplier that has not stated or demonstrated it | Confirmed |

### 6.3 Admin precondition — Admin responsibility

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-14 | EXE | Before any Ancillaries execution, the Supplier configuration is prepared in the Admin application: login, then Branch, then select the Branch used for testing | Confirmed |
| ANC-15 | EXE | The Supplier under test is assigned to that Branch and verified active/available for it | Confirmed |
| ANC-16 | EXE | The required Supplier Credential / PCC / Market configuration is assigned to the Branch and verified available | Confirmed |
| ANC-17 | EXE | Where several credentials exist, the credential used is chosen deliberately and recorded exactly. Never chosen arbitrarily | Confirmed |
| ANC-18 | EXE | The execution context records: Supplier, Supplier Credential, PCC, Market/Country, Branch, Agency (if applicable), Environment, Executing user | Confirmed |

### 6.4 Happy path — Portal responsibility

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-19 | EXE | In the Portal, perform a valid flight search | Confirmed |
| ANC-20 | EXE | Select a flight returned by the Supplier under test. Evidence must prove which Supplier returned the selected flight; a flight from another Supplier invalidates the execution | Confirmed |
| ANC-21 | EXE | Continue to PAX Details and enter the required valid passenger information | Confirmed |
| ANC-22 | EXE | Open the Ancillaries section and **verify the Supplier capability information already recorded at intake** against live behavior. Where a value is Unknown or To Be Discovered, determine it. Where live behavior differs from a Provided value, apply the Capability Model discrepancy process (ANC-08) — never a silent overwrite, and never a fresh determination that discards what intake recorded | Confirmed |
| ANC-23 | EXE | Interact only with capabilities supported by that Supplier | Confirmed |
| ANC-24 | EXE | Select applicable ancillaries according to the Supplier's actual behavior, then continue the remaining booking flow | Confirmed |
| ANC-25 | EXE | Selected ancillary information is preserved correctly through booking and into downstream booking details where applicable | Confirmed as a requirement. The "where applicable" set is undefined — OQ-ANC-04 |
| ANC-26 | EXE | Execution spans two applications, Admin and Portal (§4). Import Booked PNR's Source/Target dual-environment preparation model is **not inherited**. It is also **not assumed** that Admin and Portal share one environment: Admin and Portal environment, URL, access, and account details are recorded **independently** until OQ-ANC-08 is verified | Confirmed |

### 6.5 Evidence and validation

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-27 | EXE | The available ancillary option is recorded before selection, not only after | Confirmed |
| ANC-28 | EXE | Per selected ancillary, capture where exposed: type, code, description, Supplier, currency, price; passenger name/reference and passenger type; journey, segment, origin, destination, flight number | Confirmed |
| ANC-29 | EXE | Capability-specific capture where exposed — Baggage: pieces, weight, unit, price. Meal: code, description, price. Seat: number, characteristics, price. Bundle: name, included services, price, restrictions | Confirmed |
| ANC-30 | EXE | A field the Supplier does not expose is recorded as not exposed. It is never required and never fabricated | Confirmed |
| ANC-31 | BUS | Post-selection validation runs across: Ancillary Selection UI, Fare Breakdown / Price Summary, Booking Request, Supplier Confirmation, Persisted Booking, Itinerary / Booking Details | Confirmed |
| ANC-32 | BUS | Each selected ancillary is classified at each checkpoint as Exact Match, Expected Normalization, Missing, Unexpected Difference, or Not Exposed / Not Verifiable | Confirmed |
| ANC-33 | BUS | Validation covers correct passenger, correct segment/journey, correct ancillary type, quantity, price, currency, total booking price, and persisted ancillary status | Confirmed |

### 6.6 Pricing

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-34 | BUS | Ancillary pricing is captured separately from the base flight price | Confirmed |
| ANC-35 | BUS | Three capture points are mandatory: flight/base total before selection, individual ancillary price(s), updated booking total after selection | Confirmed |
| ANC-36 | BUS | The expected final amount is validated against the confirmed pricing contract. Plain `base + ancillaries = total` arithmetic is never assumed | Confirmed as a rule. The contract itself is undefined — OQ-ANC-01 |

### 6.7 Discovery obligations, per Supplier

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-37 | DSC | Per capability, establish: Supported? UI visible? API data available? Price available? Passenger association? Segment/Journey association? | Confirmed |
| ANC-38 | DSC | Per capability, establish the application level (ANC-11 values). One global value is not acceptable when capabilities differ | Confirmed |
| ANC-39 | DSC | Establish availability timing — when ancillaries become available (after flight selection, only in PAX Details, after passenger data, only for certain fares, only for certain cabins/routes). Never assumed | Confirmed |
| ANC-40 | DSC | Per supported capability, establish pricing behavior: price returned? currency returned? per passenger / per segment / per journey? varies by quantity or type? | Confirmed |
| ANC-41 | DSC | Establish selection restrictions: maximum baggage quantity, meal availability, seat eligibility, bundle restrictions, passenger-type, route, fare-family. Restrictions are recorded from evidence, never invented | Confirmed |

### 6.8 Pricing, currency, and ancillary lifecycle — confirmed 2026-09-23

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-42 | BUS | Booking price conversion uses a configured Rate of Exchange (ROE): `booking price = Supplier price × ROE`, converting the Supplier's currency into the platform's currency | Confirmed |
| ANC-43 | BUS | Taxes and fees are calculated from the Supplier, per offer | Confirmed |
| ANC-44 | BUS | A rule engine applies markup, discount, and service-fee adjustments per passenger. The specific amounts (e.g. Markup, Discount, Service Fee) are configuration-driven, not fixed platform constants — the values observed 2026-09-23 are an example configuration, not a hardcoded rule | Confirmed as a mechanism. Exact configured values are per-environment, not restated here |
| ANC-45 | BUS | Ancillary and Bundle amounts are added to the booking total price | Confirmed |
| ANC-46 | BUS | No amount is held or deducted for ancillary/Bundle selection alone. The full price, including ancillaries and Bundle, is deducted only at booking confirmation | Confirmed |
| ANC-47 | BUS | A selected ancillary can be changed or removed before booking, on a per-passenger basis — it is not mandatory to apply a change/removal to every passenger on the booking | Confirmed for the before-booking case. Whether an ancillary can be changed or removed **after** booking remains unconfirmed — carried forward as OQ-ANC-03b |
| ANC-50 | BUS | A Bundle coexists with individually selected capabilities without conflict. Bundle pricing is shown separately in the fare breakdown, then included in the total price | Confirmed |

### 6.9 Application level and eligibility defaults — confirmed 2026-09-23, platform-wide

<!-- These are recorded as PLATFORM-WIDE DEFAULTS per explicit business direction (2026-09-23).
     ANC-13 still governs: a default is an expectation, not a substitute for per-Supplier
     verification. Discovery still confirms each Supplier's actual behavior against this default
     and records any deviation via the Capability Model's discrepancy process (CapabilityModel.md
     §6) rather than assuming every Supplier matches it silently. -->

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-48 | BUS | Platform-wide default application level: Meal and Seat ancillaries apply at the Segment level; Baggage applies at the Journey level (across the whole journey). All contribute to the total price. A Supplier's actual behavior is still verified per Supplier during Discovery (ANC-13) — this default does not replace that verification, and a confirmed deviation is recorded as a discrepancy, not silently overridden | Confirmed as platform default |
| ANC-49 | BUS | Platform-wide default eligibility: ancillaries are eligible for Adult and Child passenger types only, not Infant. A Supplier's actual eligibility rules are still verified per Supplier during Discovery (ANC-41) | Confirmed as platform default |

### 6.10 Environment architecture — confirmed 2026-09-23

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-51 | EXE | Admin and Portal target the same environment/tenant, but use two different URLs and two independent credential sets. Per ANC-26, their access details are still recorded independently, never merged. The actual URL and credential values for a given run are recorded in that run's own Environment & Access record (Supplier Checklist §3), never in this shared baseline | Confirmed |

### 6.11 Post-booking lifecycle and downstream representation — confirmed 2026-09-25

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-52 | BUS | A selected ancillary cannot be changed or removed **after** booking. Change/removal is permitted only **before** booking, per the per-passenger rule in ANC-47 | Confirmed |
| ANC-53 | BUS | Booking confirmation reflects the selected ancillaries and their prices. When a booked flight is searched or retrieved, ancillaries are reflected in the itinerary and in reports | Confirmed |

### 6.12 Admin's own booking cycle — confirmed 2026-09-27/28, platform-wide

<!-- Source: Ahmed Alhussieny, supplied directly during AirIndia's Stage 2/3 sessions this run, via
     narrated steps and screenshots of the live Admin application (Booking-Mid Office). Recorded here,
     not only in AirIndia's own Supplier scope, because the user confirmed this is a platform-wide
     Admin capability, not an AirIndia-specific one — consistent with §6.9's existing pattern for
     platform-wide defaults. Per ANC-13's own ethos, this is still a default/baseline description:
     Discovery still verifies actual behavior per Supplier, and a confirmed deviation is a recorded
     discrepancy, never a silent override. -->

| ID | Type | Requirement | Status |
|---|---|---|---|
| ANC-54 | EXE | Admin provides its own booking cycle (**Booking-Mid Office**), functionally mirroring Portal's: flight search -> flight selection -> PAX Details -> Bundle -> Ancillaries -> Payment -> booking confirmation. The two channels are exercised and verified independently — the same "not assumed to share" ethos ANC-26 already applies to Admin/Portal environment details, extended here to booking capability | Confirmed |
| ANC-55 | BUS | The rule engine applying markup/discount/service-fee adjustments (ANC-44) is **shared** between Admin and Portal — it is not a separate engine per channel. **Markup specifically** is applied per passenger and folds directly into **Base Fare** on both channels — it is never shown as its own line item in the Fare Breakdown/Fare Details panel, consistent with the original Portal observation (FINDING-003). Service Charge and Discount, by contrast, were observed as their own separate line items on Admin (FINDING-014) — whether Portal's UI can also show them separately under the right configuration remains open (see FINDING-014's recommendation) | Confirmed |
| ANC-56 | BUS | Admin's wallet is structured as three components — **Your Balance**, **Credit Balance**, **Top Up Balance** (Your Balance = Credit Balance + Top Up Balance) — distinct from Portal's single-balance model (ANC-46 still governs deduction timing: no deduction until booking confirmation, then the exact total; in the observed case, deduction reduced Top Up Balance specifically) | Confirmed |
| ANC-57 | BUS | Admin exposes its own Reports for price verification, distinct from Portal's, in service of ANC-53's downstream-reflection requirement: **Total Due to NDC**, **Agency Wallet**, **Sales**, **AR Ledger Report**, **Wallet History Report**, and **Statement**. (Daily Sales Report exists on Admin but is Out of Scope — §3.) | Confirmed |
| ANC-58 | EXE | Admin's Booking-Mid Office additionally allows selecting a specific **Agency and Agent** at search time, distinct from Portal (always booking under its own logged-in agency); whichever Agency is selected supplies the wallet (ANC-56) for that booking | Confirmed |

## 7. Traceability Anchor

`ANC-01` … `ANC-58` is the canonical ID series for this Feature. Supplier Test Cases trace against
these IDs. A Supplier-specific behavior that no ANC-xx covers is recorded in that Supplier's own
scope; it does not silently become a shared requirement. Extending this series requires a revision of
this document, approved in the normal way.

No Traceability Matrix exists yet — no Test Design has run for this Feature, and none may run until a
Supplier scope exists with a verified capability matrix (`ndc_execution_rules.md` §A7).

## 8. Open Questions — require business confirmation

| ID | Question | Status | Blocks | Owner |
|---|---|---|---|---|
| OQ-ANC-01 | What is the confirmed ancillary pricing contract? Which of taxes, fees, markup, commission, discount, and bundle pricing sit between the ancillary amounts and the final booking total? | **Resolved 2026-09-23** — see ANC-42, ANC-43, ANC-44, ANC-45 | — | Ahmed Alhussieny |
| OQ-ANC-02 | Does ancillary selection trigger wallet or payment validation, and is any amount held or deducted at selection time? | **Resolved 2026-09-23** — see ANC-46 | — | Ahmed Alhussieny |
| OQ-ANC-03 | Can a selected ancillary be changed or removed before booking? After booking? | **Partially resolved 2026-09-23** — before-booking case confirmed, see ANC-47 | ANC-47 covers before-booking only | Ahmed Alhussieny |
| OQ-ANC-03b | Can a selected ancillary be changed or removed **after** booking? | **Resolved 2026-09-25** — see ANC-52. Not permitted after booking | — | Ahmed Alhussieny |
| OQ-ANC-04 | Which downstream representations must reflect ancillaries — itinerary, fare breakdown, booking details, reports? | **Resolved 2026-09-25** — see ANC-53. Booking confirmation, itinerary, and reports all reflect selected ancillaries and their prices | — | Ahmed Alhussieny |
| OQ-ANC-05 | How is currency handled when the credential's market currency differs from the booking currency? | **Resolved 2026-09-23** — see ANC-42 | — | Ahmed Alhussieny |
| OQ-ANC-06 | Are passenger-type eligibility rules (ADT/CHD/INF) global business rules, or purely per-Supplier? | **Resolved 2026-09-23** as a platform-wide default — see ANC-49 | — | Ahmed Alhussieny |
| OQ-ANC-07 | Do Bundle and individual capabilities conflict? Does a Bundle include, exclude, or coexist with separately selected Baggage/Meal/Seat? | **Resolved 2026-09-23** — see ANC-50 | — | Ahmed Alhussieny |
| OQ-ANC-08 | Are Admin and Portal the same environment and tenant? Same login or two accounts? Two URLs? | **Resolved 2026-09-23** — see ANC-51. Actual URL/credential values recorded per-run in each Supplier's own Environment & Access record, not here | — | Ahmed Alhussieny |
| OQ-ANC-09 | **Deferred by decision.** Ancillaries may expose Seat as a Supplier capability. That does not mean Ancillaries owns the Seatmap business scope. Resolved when Seatmap is introduced | Open — deferred, to be asked when Seatmap is introduced | Nothing today. Prevents duplicate ownership later | Deferred |
| OQ-ANC-10 | **Deferred by decision.** Ancillaries may expose Bundle as a Supplier capability. That does not mean Ancillaries owns the Upselling business scope. Resolved when Upselling is introduced | Open — deferred, to be asked when Upselling is introduced | Nothing today | Deferred |
| OQ-ANC-11 | Which integration/backend path does Ancillaries actually use? | **Resolved 2026-09-23** — AirIndia's onboarding confirmed the `ndc-core-service` integration layer (the same layer Import Booked PNR uses). Set via `cli.js supplier-feature feature set-integration-layer ancillaries --value "ndc-core-service"` | Activates `ndc_execution_rules.md` §B (NDC-Core-Service-specific rules) for this Feature | Ahmed Alhussieny |

Eight of the original eleven open questions were resolved 2026-09-23 on business direction from
Ahmed Alhussieny (recorded above as ANC-42…ANC-51). OQ-ANC-03b is a new open item split out from the
unresolved half of OQ-ANC-03. OQ-ANC-09, -10, and -11 remain decided-to-defer, not gaps — the business
has not been asked yet, by decision.

## 9. Discrepancies Between Sources

None. One source exists for this Feature — the business-supplied definition of 2026-09-04. This
section stays, unfilled, so a second source added later has a defined place to be reconciled in.

## 10. Related Feature-level artifacts

| Artifact | Owns |
|---|---|
| `../../../context/CapabilityModel.md` | Capability dimensions, allowed values, status model, discrepancy process, Test Design gate |
| `../../../context/ExecutionFlow_HappyPath.md` | How to execute the shared flow across Admin and Portal |
| `../../../context/FeatureChecklistProfile.md` | The rows injected into each Supplier's rendered Checklist |
