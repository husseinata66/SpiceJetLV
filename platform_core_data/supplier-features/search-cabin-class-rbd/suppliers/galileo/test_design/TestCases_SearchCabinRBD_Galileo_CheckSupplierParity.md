# Manual Test Suite — Search – Cabin Class & RBD / Galileo — Check Supplier Request/Response Parity

| Field | Value |
|---|---|
| Module | `search-cabin-class-rbd/galileo` |
| Produced by run | `search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity` |
| Revision | 1 (2026-10-11 — companion suite; the TC-GSRCH suite is not changed) |
| Run Scope Type / Run Type | Feature / Custom Scope — Check Supplier Request/Response Parity, Integration vs Direct, search only |
| Project Context | `supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md` (rev 3, Approved) |
| Companion of | `TestCases_SearchCabinRBD_Galileo.md` — every case here traces to one TC-GSRCH case and reuses its Test Data unchanged |
| Total Test Cases | 18 |
| Generated | 2026-10-11 |
| Status | Approved |
| Approved by | Ahmed Ayman — 2026-10-11, all 18 cases (Stage 3, run-002) |

**How to read every case.** "Integration" = browser session A, branch `NDC1_Ahmed Ayman (BRN287)`, supplier `NDCGal`, credential `NdcGalileoSTG EGY`. "Direct" = browser session B, a separate browser, branch `ahmed ayman (BRN632)`, supplier `Galileo`, credential `GalileoLiveSTAGING`. Both use user `ahmed ayman`. Page: **Booking-Mid Office → Flight Search**. Every case uses **Check Supplier only — never Search** (CSP-01). No booking, hold, payment or ancillary.

**What each check captures.** The `POST /Booking2/check-supplier-search` response per branch: `supplierRequest`, `supplierResponse`, `supplierConfig`, `errorMessage` (BND-01). Evidence is saved **redacted** (CMP-13) with a redaction count per file.

**Boundaries — read before judging any result (BND-02, BND-03, BND-04).**
- Integration shows platform → **Integration Layer** (uAPI v52, no SOAP envelope). Direct shows platform → **Travelport uAPI** (v44, SOAP envelope). They are **different boundaries**.
- **What the Integration Layer sends to Galileo is not observable.** No case claims the requests reaching Galileo are the same or different. An assertion that would need that boundary is **Inconclusive — not observable**.
- Both payloads are what the platform back end reports, not a network capture.

**Two kinds of case.**

| Case type | Cases | What it checks |
|---|---|---|
| **Setup / Configuration** | TC-GCSP-001 | Branch, supplier and credential in each session. No check is sent. It must pass before any parity case is judged. |
| **Check Supplier Request/Response Parity** | TC-GCSP-002 … 021 (17 cases) | The supplier request and response of both branches for one scenario. |

**Assertion groups — judged and reported separately (CSP-04).** Every parity case has three groups: **[Setup/Boundary]** A1–A2 · **[RQ] Request parity** A3–A11 · **[RS] Response parity** A12–A20. Each group gets its own outcome. A request match never hides a response mismatch, and the reverse.

**Every difference gets exactly one outcome.** These are test-design rules for this run, accepted by Ahmed Ayman on 2026-10-11. The Project Context is not changed.

| Outcome | Definition | Effect |
|---|---|---|
| **Confirmed Functional Mismatch** | An observed difference that **contradicts approved Test Data or an approved requirement**. | Fails the assertion that checks it. |
| **Pending Parity Clarification** | A **genuine business difference whose expected behaviour is not established** by the Test Data or any approved requirement. | Does not fail the assertion. It is recorded with both actual values, its evidence and the open business question. |
| **Representation Only** | A structural or wording difference with **equivalent business meaning** (CMP-09). | Listed separately and never counted as a mismatch. |

**What the approved Test Data and requirements establish.** A difference that contradicts any of these is **Confirmed**. It can never be Pending.

| Established by | Expected behaviour |
|---|---|
| Test Data, SRCH-02, CSP-02 | Each request carries the trip type, legs, airports, dates, passenger types and counts, Cabin Class and RBD entered (A3–A8). |
| SRCH-07, SRCH-08, SRCH-09 | A **matched** fare option (same flight, same RBD sequence per passenger type) has the same Cabin Class and the same baggage allowance per passenger type and segment on both branches (A16, A17). |
| SRCH-04 … SRCH-06 | A **matched** flight has the same carriers, flight numbers, times, segments and stops (A14). |
| SRCH-10, SRCH-11, CMP-05 | In a cabin or RBD case, every returned segment is in the requested Cabin Class or RBD (A18). |
| SRCH-03, CSP-03 | The same flights and fare options on both branches. A flight or fare option on one side only is **Confirmed** when no business mechanism explaining it has been identified (A13, A15). |

**When a difference is Pending.** A difference is Pending when it follows from an identified business mechanism whose correct behaviour no approved requirement or decision establishes. Three mechanisms are known from run-001 and the probe. Others may be found during execution.

| Known mechanism | Condition | Open business question | Related |
|---|---|---|---|
| **P-UPSELL** | Extra fare options appear only on the side whose request had `ReturnUpsellFare="true"` (or that returned `UpsellBrand` elements). Their flight is matched, and their segments are within the requested Cabin Class and RBD. | Should the Integration path return upsell fare options that the Direct path does not request? | OBS-01, DEF-03 |
| **P-AIRPORT** | Flights appear only on the side whose request had `PreferCity="true"`, and they use another airport of the same city. | Should city-level airport preference apply on the Integration path? | OBS-02, DEF-04 |
| **P-CEILING** | Flights appear only on one side, and the other side returned exactly 200 pricing solutions. 200 does not prove truncation. | Is a 200-solution limit expected, and is the missing availability acceptable? | DEF-04 |

- **A new Pending item** (not one of the three) must state:
  - the mechanism observed and the open business question;
  - why no approved requirement establishes the expected behaviour;
  - both actual values and the evidence path.

  It is flagged for the reviewer in the QA Report. Nothing is moved to Pending without this.
- **A difference with no identified mechanism** that contradicts the table above is **Confirmed**. One that contradicts nothing approved, and has equivalent meaning, is **Representation Only**.
- A known mechanism explains a difference; it is **not** a confirmed root cause (OBS-01).
- **An undocumented difference in upselling behaviour alone never fails a case.**
- **The approved assertions are never relaxed after execution** to change an outcome.

**Request differences (CMP-08 class → outcome).**
- Functional mismatch and Incorrect mapping → **Confirmed**.
- Missing / extra field → **Confirmed** when the field carries Test Data. Otherwise **Pending** when it changes search behaviour in a way no requirement establishes, or **Representation Only** when it has no business effect.
- Different default or search modifier → **Pending**, unless it contradicts the Test Data or a requirement (**Confirmed**).
- Representation only → **Representation Only**.
- Search modifiers are compared and documented in A10, including `ReturnUpsellFare`, `PreferCity`, `AllowDirectAccess`, `CurrencyType`, `SolutionResult`, providers, permitted carriers, pricing modifiers, leg modifiers, and any other modifier found. **A modifier difference is never classified as a functional defect just because it differs.**

**How group and case outcomes are derived.**
- **Group** (RQ, RS): Failed if any assertion in the group fails. Otherwise **Inconclusive — Pending Parity Clarification** if the group lists any Pending item. Otherwise Passed.
- **Case:** Failed if either group failed. Otherwise Inconclusive if either group is Inconclusive, or any assertion could not be observed (BND-03, CMP-12). Otherwise Passed.
- A case is never forced to Passed or Failed.

**How these outcomes are recorded in 4M.** This was checked against the Run Manager on 2026-10-11.
- **Case row:** the status is `Inconclusive`, and the Reason starts with `Pending Parity Clarification:` followed by the PC IDs. The Run Manager keeps a recorded Inconclusive as Inconclusive, even when every assertion verifies, and raises no conflict.
- **Group outcomes:** a separate table records Test Case ID, Group, Group Outcome, Confirmed Items, Pending Items and Representation Items. It is not read as a results or assertion table, so it does not change the case status.
- **Pending clarifications:** each gets an ID (PC-01, PC-02, …) in the QA Report, with both values, evidence and the open question.
- **After a business decision:** a later cycle (rerun) records the new outcome. A recorded result is never edited.

**Response comparison (CMP-11).**
- Normalize both responses to one model of business values.
- Flights are matched by identity: carrier + flight number, origin–destination, departure and arrival date-time, in order.
- Fare options are matched by flight + RBD sequence per passenger type, not by position or brand.
- Cabin Class, RBD and baggage are compared as normalized values; baggage is compared by allowance.
- Fare Basis is supporting information only. Prices are ignored.
- Unmatched flights and fare options are always listed with both sides' values.

**Observations — not confirmed causes (OBS-01..05).** `ReturnUpsellFare` (true vs false) is a **potential explanation** for extra fare options, not a root cause. `PreferCity`, `AllowDirectAccess` and `CurrencyType` are compared and documented in A10 of every parity case.

**Multi-check cases** (TC-GCSP-010, 011, 012, 018): steps 2–6 run once per value. An assertion passes only if it passes in every check, and the evidence records each check separately.

## Case Index

| Test Case ID | Title | Tier | Priority | Tags | Review | Automation |
|---|---|---|---|---|---|---|
| TC-GCSP-001 | Setup — branch, supplier and credential read back in each session | Atomic | P1 | Atomic, Smoke, Setup, Configuration, CheckSupplier | Approved | Pending |
| TC-GCSP-002 | Request/Response parity — one-way, Economy, CAI→DXB | Scenario | P1 | Scenario, Smoke, Parity, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-003 | Request/Response parity — round-trip, Economy, CAI⇄DXB | Scenario | P1 | Scenario, Parity, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-004 | Request/Response parity — mixed passengers (Adult, Child, Infant) | Scenario | P2 | Scenario, Parity, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-005 | Request/Response parity — Business, CAI→DXB | Scenario | P1 | Scenario, Parity, CabinClass, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-006 | Request/Response parity — Premium Economy, CAI→DXB | Scenario | P1 | Scenario, Parity, CabinClass, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-007 | Request/Response parity — First Class, CAI→DXB | Scenario | P1 | Scenario, Parity, CabinClass, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-010 | Request/Response parity — Cabin Class sent and returned per selected cabin | Atomic | P1 | Atomic, Filter, CabinClass, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-011 | Request/Response parity — RBD — Economy (Q, K, Y) | Atomic | P1 | Atomic, Filter, RBD, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-012 | Request/Response parity — RBD — Business (J, C) | Atomic | P1 | Atomic, Filter, RBD, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-013 | Request/Response parity — Cabin Class and RBD that do not match | Atomic | P4 | Atomic, Parity, Negative-InvalidInputs, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-015 | Request/Response parity — one-way, Economy, CAI→JED | Scenario | P2 | Scenario, Parity, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-016 | Request/Response parity — Multi-City, Economy | Scenario | P1 | Scenario, Parity, MultiCity, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-017 | Request/Response parity — Multi-City, different Cabin per leg | Scenario | P2 | Scenario, Parity, MultiCity, CabinClass, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-018 | Request/Response parity — RBD — First Class (F, A) | Atomic | P1 | Atomic, Filter, RBD, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-019 | Request/Response parity — RBD — Premium Economy (J) | Atomic | P2 | Atomic, Filter, RBD, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-020 | Request/Response parity — RBD — several RBDs together (Q + K) | Atomic | P3 | Atomic, Filter, RBD, CheckSupplier, RequestResponseParity | Approved | Pending |
| TC-GCSP-021 | Request/Response parity — RBD on one Multi-City leg only | Atomic | P2 | Atomic, Filter, RBD, MultiCity, CheckSupplier, RequestResponseParity | Approved | Pending |

**Tier breakdown:** 9 Atomic · 9 Scenario

**Lifecycle breakdown:** Review — 0 Pending · 18 Approved · 0 Rejected · Automation — 18 Pending · 0 Approved · 0 Rejected

## Test Cases

### TC-GCSP-001 — Setup — branch, supplier and credential read back in each session

**Objective:** **Setup / Configuration test** (not a parity test). Verify that each session uses its own branch and reaches the expected Check Supplier path, supplier and credential, before any parity check.

**Traces to:** TC-GSRCH-001

**Preconditions:** Session A and session B are open in separate browsers and logged in as `ahmed ayman`. Both are on Booking-Mid Office → Flight Search.

**Test Data:** (unchanged from TC-GSRCH-001)

| Field | Value |
|---|---|
| Session A branch | `NDC1_Ahmed Ayman (BRN287)` |
| Session B branch | `ahmed ayman (BRN632)` |

**Steps:**

1. In session A, select branch `NDC1_Ahmed Ayman (BRN287)`.
2. In session B, select branch `ahmed ayman (BRN632)`.
3. In session A, click **Check Supplier**, open the **Supplier** list, select `NDCGal`, then open the **Credential** list.
4. In session B, click **Check Supplier**, open the **Supplier** list, select `Galileo`, then open the **Credential** list.
5. Close both dialogs without clicking **Check**.

**Expected Result:** Session A lists supplier `NDCGal` with credential `NdcGalileoSTG EGY`. Session B lists supplier `Galileo` with credential `GalileoLiveSTAGING`. Selecting a branch in one session does not change the other.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Session A branch is `NDC1_Ahmed Ayman (BRN287)` | Expected Result | equals | CSP-01 |
| A2 | Session B branch is `ahmed ayman (BRN632)` | Expected Result | equals | CSP-01 |
| A3 | Session A supplier list is `NDCGal` | Expected Result | equals | CSP-01 |
| A4 | Session B supplier list is `Galileo` | Expected Result | equals | CSP-01 |
| A5 | Session A credential is `NdcGalileoSTG EGY` | Expected Result | equals | CSP-01 |
| A6 | Session B credential is `GalileoLiveSTAGING` | Expected Result | equals | CSP-01 |
| A7 | Branch selection in one session does not change the other | Expected Result | present | CSP-01 |

**Priority:** P1

**Tags:** Atomic, Smoke, Setup, Configuration, CheckSupplier

**Notes:** If any assertion fails, stop. No parity result can be trusted until both paths are confirmed and isolated. No check is sent in this case.

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-002 — Request/Response parity — one-way, Economy, CAI→DXB

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-002.

**Traces to:** TC-GSRCH-002

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-002)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every returned segment is Economy. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every returned segment is Economy | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Scenario, Smoke, Parity, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-003 — Request/Response parity — round-trip, Economy, CAI⇄DXB

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-003.

**Traces to:** TC-GSRCH-003

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-003)

| Field | Value |
|---|---|
| Trip Type | Round-trip |
| From → To | `CAI` → `DXB` |
| Departure / Return | 18/11/2026 / 25/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every returned segment is Economy. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: Round-trip, 2 legs | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` · leg 2 `DXB`→`CAI` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 · leg 2 2026-11-25 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class both legs Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every returned segment is Economy | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Scenario, Parity, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-004 — Request/Response parity — mixed passengers (Adult, Child, Infant)

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-004.

**Traces to:** TC-GSRCH-004

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-004)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 2 Adults, 1 Child, 1 Infant |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every matched fare option is priced for the same passenger types and counts (2 Adult, 1 Child, 1 Infant). Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 2 Adult, 1 Child, 1 Infant | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every matched fare option is priced for the same passenger types and counts (2 Adult, 1 Child, 1 Infant) | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P2

**Tags:** Scenario, Parity, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-005 — Request/Response parity — Business, CAI→DXB

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-005.

**Traces to:** TC-GSRCH-005

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-005)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Business |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every returned segment is Business. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Business | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every returned segment is Business | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Scenario, Parity, CabinClass, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-006 — Request/Response parity — Premium Economy, CAI→DXB

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-006.

**Traces to:** TC-GSRCH-006

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-006)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Premium Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every returned segment is Premium Economy. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Premium Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every returned segment is Premium Economy | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Scenario, Parity, CabinClass, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03). A7 shows at the request boundary whether the selected cabin is sent (DEF-01 / DEF-02).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-007 — Request/Response parity — First Class, CAI→DXB

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-007.

**Traces to:** TC-GSRCH-007

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-007)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | First Class |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every returned segment is First. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 First | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every returned segment is First | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Scenario, Parity, CabinClass, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03). A7 shows at the request boundary whether the selected cabin is sent (DEF-01 / DEF-02).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-010 — Request/Response parity — Cabin Class sent and returned per selected cabin

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-010.

**Traces to:** TC-GSRCH-010

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-010)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class (one search each) | Economy · Premium Economy · Business · First Class |
| RBD | none |

**Steps:** (repeat steps 2–6 once per Cabin Class: `Economy` · `Premium Economy` · `Business` · `First Class`)

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. In each check, on both, the response is not empty and every returned segment is in the selected cabin. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 = the selected cabin in each check (Economy · Premium Economy · Business · First) | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] In each check, on both, the response is not empty and every returned segment is in the selected cabin | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Atomic, Filter, CabinClass, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03). A7 shows at the request boundary whether the selected cabin is sent (DEF-01 / DEF-02).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-011 — Request/Response parity — RBD — Economy (Q, K, Y)

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-011.

**Traces to:** TC-GSRCH-011

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-011)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD (one search each) | `Q` · `K` · `Y` |

**Steps:** (repeat steps 2–6 once per RBD: `Q` · `K` · `Y`)

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. In each check, on both, the response is not empty and every returned segment is Economy with the selected RBD. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD leg 1 = the selected RBD in each check (`Q` · `K` · `Y`) | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] In each check, on both, the response is not empty and every returned segment is Economy with the selected RBD | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Atomic, Filter, RBD, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-012 — Request/Response parity — RBD — Business (J, C)

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-012.

**Traces to:** TC-GSRCH-012

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-012)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Business |
| RBD (one search each) | `J` · `C` |

**Steps:** (repeat steps 2–6 once per RBD: `J` · `C`)

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. In each check, on both, the response is not empty and every returned segment is Business with the selected RBD. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Business | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD leg 1 = the selected RBD in each check (`J` · `C`) | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] In each check, on both, the response is not empty and every returned segment is Business with the selected RBD | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Atomic, Filter, RBD, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-013 — Request/Response parity — Cabin Class and RBD that do not match

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-013.

**Traces to:** TC-GSRCH-013

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-013)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | `J` |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. Both responses give the same outcome: the same error or empty result, or the same fare options with the same Cabin Class and RBD. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD leg 1 `J` | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] Both responses give the same outcome: the same error or empty result, or the same fare options with the same Cabin Class and RBD | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P4

**Tags:** Atomic, Parity, Negative-InvalidInputs, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-015 — Request/Response parity — one-way, Economy, CAI→JED

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-015.

**Traces to:** TC-GSRCH-015

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-015)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `JED` |
| Departure | 20/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every returned segment is Economy. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`JED` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-20 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every returned segment is Economy | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P2

**Tags:** Scenario, Parity, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-016 — Request/Response parity — Multi-City, Economy

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-016.

**Traces to:** TC-GSRCH-016

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-016)

| Field | Value |
|---|---|
| Trip Type | Multi-city |
| Leg 1 | `CAI` → `DXB`, 18/11/2026, Economy, RBD none |
| Leg 2 | `DXB` → `JED`, 22/11/2026, Economy, RBD none |
| Passengers | 1 Adult |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every returned segment of both legs is Economy. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: Multi-city, 2 legs | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` · leg 2 `DXB`→`JED` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 · leg 2 2026-11-22 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy · leg 2 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either leg | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every returned segment of both legs is Economy | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Scenario, Parity, MultiCity, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-017 — Request/Response parity — Multi-City, different Cabin per leg

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-017.

**Traces to:** TC-GSRCH-017

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-017)

| Field | Value |
|---|---|
| Trip Type | Multi-city |
| Leg 1 | `CAI` → `DXB`, 18/11/2026, **Economy**, RBD none |
| Leg 2 | `DXB` → `JED`, 22/11/2026, **Business**, RBD none |
| Passengers | 1 Adult |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, every leg 1 segment is Economy and every leg 2 segment is Business. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: Multi-city, 2 legs | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` · leg 2 `DXB`→`JED` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 · leg 2 2026-11-22 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy · leg 2 Business | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD none requested on either leg | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, every leg 1 segment is Economy and every leg 2 segment is Business | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P2

**Tags:** Scenario, Parity, MultiCity, CabinClass, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03). TC-GSRCH-017 is Flaky in run-001 (Direct returned ET600 as Business/D in 2 of 5 searches); record each check's leg 1 ET600 cabin and RBD on both.

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-018 — Request/Response parity — RBD — First Class (F, A)

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-018.

**Traces to:** TC-GSRCH-018

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-018)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | First Class |
| RBD (one search each) | `F` · `A` |

**Steps:** (repeat steps 2–6 once per RBD: `F` · `A`)

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. In each check, on both, the response is not empty and every returned segment is First with the selected RBD. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 First | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD leg 1 = the selected RBD in each check (`F` · `A`) | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] In each check, on both, the response is not empty and every returned segment is First with the selected RBD | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P1

**Tags:** Atomic, Filter, RBD, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03). A7 shows at the request boundary whether the selected cabin is sent (DEF-01 / DEF-02).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-019 — Request/Response parity — RBD — Premium Economy (J)

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-019.

**Traces to:** TC-GSRCH-019

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-019)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Premium Economy |
| RBD | `J` |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, the response is not empty and every returned segment is Premium Economy with RBD `J`. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Premium Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD leg 1 `J` | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, the response is not empty and every returned segment is Premium Economy with RBD `J` | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P2

**Tags:** Atomic, Filter, RBD, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03). A7 shows at the request boundary whether the selected cabin is sent (DEF-01 / DEF-02).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-020 — Request/Response parity — RBD — several RBDs together (Q + K)

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-020.

**Traces to:** TC-GSRCH-020

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-020)

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | `Q` and `K` (both selected) |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, the response is not empty and every returned segment has RBD Q or K. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: One-way, 1 leg | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD leg 1 `Q` and `K` (both) | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, the response is not empty and every returned segment has RBD Q or K | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P3

**Tags:** Atomic, Filter, RBD, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03).

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GCSP-021 — Request/Response parity — RBD on one Multi-City leg only

**Objective:** **Check Supplier Request/Response Parity test.** Verify that both branches send supplier requests with the same business meaning and get back responses that agree, for the Search Criteria of TC-GSRCH-021.

**Traces to:** TC-GSRCH-021

**Preconditions:** TC-GCSP-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:** (unchanged from TC-GSRCH-021)

| Field | Value |
|---|---|
| Trip Type | Multi-city |
| Leg 1 | `CAI` → `DXB`, 18/11/2026, Economy, RBD `Q` |
| Leg 2 | `DXB` → `JED`, 22/11/2026, Economy, RBD none |
| Passengers | 1 Adult |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. In both sessions, click **Check Supplier**. Select supplier `NDCGal` / credential `NdcGalileoSTG EGY` in session A, and `Galileo` / `GalileoLiveSTAGING` in session B. Read both back.
4. Click **Check** in both sessions at the same time.
5. Save each branch's `check-supplier-search` response, redacted (CMP-13).
6. Normalize both requests and compare them (A3–A11). Then normalize both responses and compare them (A12–A20). Give every difference one outcome (Confirmed Functional Mismatch · Pending Parity Clarification · Representation Only) and record both actual values and the evidence path.

**Expected Result:** **Request:** both requests carry the trip, legs, airports, dates, passengers, Cabin Class and RBD of the Test Data. No request difference is a Confirmed Functional Mismatch. Every search-modifier difference is documented with both values and an outcome. **Response:** both are successful. No flight, segment, fare option, Cabin Class, RBD or baggage difference is a Confirmed Functional Mismatch. On both, the response is not empty, every leg 1 segment has RBD `Q`, and leg 2 is not limited to `Q`. Every Pending Parity Clarification is listed with its mechanism, open question and evidence. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | [Setup] Read back before the check: A = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; B = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING` | CSP-01 | equals | CSP-01 |
| A2 | [Boundary] Integration request goes to host `ndc-integration-stg-ne-3.azurewebsites.net` (uAPI v52); Direct request goes to host `emea.universal-api.pp.travelport.com` (uAPI v44) | BND-02 | equals | BND-02 |
| A3 | [RQ] Both requests: Multi-city, 2 legs | Test Data | equals | CSP-02 |
| A4 | [RQ] Both requests: leg 1 `CAI`→`DXB` · leg 2 `DXB`→`JED` | Test Data | equals | CSP-02 |
| A5 | [RQ] Both requests: departure date leg 1 2026-11-18 · leg 2 2026-11-22 | Test Data | equals | CSP-02 |
| A6 | [RQ] Both requests: passengers 1 Adult | Test Data | equals | CSP-02 |
| A7 | [RQ] Both requests: Cabin Class leg 1 Economy · leg 2 Economy | Test Data | equals | CSP-02 |
| A8 | [RQ] Both requests: RBD leg 1 `Q` · leg 2 none | Test Data | equals | CSP-02 |
| A9 | [RQ] 0 request differences with outcome Confirmed Functional Mismatch (Functional mismatch, Incorrect mapping, or a Missing / extra field that carries Test Data) | CMP-08 | equals | CMP-08, CSP-02 |
| A10 | [RQ] Search modifiers and supplier parameters (ReturnUpsellFare, PreferCity, AllowDirectAccess, CurrencyType, SolutionResult, providers, permitted carriers, pricing and leg modifiers, any other found) are compared, each with its Integration value, Direct value, outcome and evidence path | CSP-02 | present | CSP-02, CMP-08, OBS-01..04 |
| A11 | [RQ] Representation-only differences are listed separately and not counted as mismatches | CMP-09 | present | CMP-09 |
| A12 | [RS] Both responses: HTTP 200, `errorMessage` empty, `LowFareSearchRsp` present and parsable | CSP-03 | equals | CSP-03, CMP-12 |
| A13 | [RS] 0 flights present on one side only with outcome Confirmed Functional Mismatch (flights matched by identity) | Expected Result | equals | CSP-03, CMP-11 |
| A14 | [RS] Each matched flight has the same segments, connections and stops | Expected Result | equals | CSP-03 |
| A15 | [RS] 0 fare options present on one side only with outcome Confirmed Functional Mismatch (matched by flight + RBD sequence per passenger type) | Expected Result | equals | CSP-03, CMP-11 |
| A16 | [RS] Each matched fare option has the same normalized Cabin Class per passenger type and segment | Expected Result | equals | CSP-03 |
| A17 | [RS] Each matched fare option has the same baggage allowance per passenger type and segment | Expected Result | equals | CSP-03 |
| A18 | [RS] On both, the response is not empty, every leg 1 segment has RBD `Q`, and leg 2 is not limited to `Q` | Expected Result | equals | CSP-03 |
| A19 | [RS] Every unmatched flight and fare option is listed with its RBD sequence, brand, the values from both sides, outcome and evidence path | CMP-11 | present | CMP-11 |
| A20 | [RS] Every Pending Parity Clarification is listed with its mechanism (P-UPSELL, P-AIRPORT, P-CEILING or a new one), its open business question, both actual values and evidence; none is counted as a functional mismatch | Expected Result | present | CSP-03, OBS-01, OBS-02 |

**Priority:** P2

**Tags:** Atomic, Filter, RBD, MultiCity, CheckSupplier, RequestResponseParity

**Notes:** RQ (A3–A11) and RS (A12–A20) each get their own outcome (CSP-04). Nothing here is judged about the Integration Layer's request to Galileo (BND-03). In run-001, Search with a partial Multi-City RBD was silently not submitted on both branches (DEF-08). If Check Supplier produces no request, capture what it does return (the API response, or its absence) and a screenshot, record A2–A20 as `Not checked — no request produced` and the case as **Inconclusive**, and infer no request or response value.

**Review:** Approved

**Automation:** Pending

**Requires:** None
