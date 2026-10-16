# Project Context — Search – Cabin Class & RBD / Galileo

| Field | Value |
|---|---|
| Module (Supplier Feature) | `search-cabin-class-rbd` |
| Supplier | `galileo` (Galileo) — an independent entity, not a "Feature" (`new_us_intake.md` §12.1) |
| Integration Layer | `null` — this scope compares two paths (Integration and Direct), so it is not tied to one layer |
| Run Scope Type | Feature (Supplier Feature — `new_us_intake.md` §12) |
| Run Type | Custom Scope — parity comparison, Integration vs Direct, search only. Two scopes: (1) UI Search result parity (run-001); (2) **Check Supplier Request/Response Parity** (§2.2–§2.5, planned run-002) |
| Task name | Galileo Features |
| Source | Human-supplied scope in the intake conversation, 2026-10-11 (no PRD, no User Story ID) |
| Target Environment | `http://192.168.1.210/` — one environment, two branches (§4) |
| Produced by run | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Revision | 3 (2026-10-11 — adds the Check Supplier Request/Response Parity scope, §2.2–§2.5; rev 2 content unchanged) |
| Target ref at write | `7d272cd` |
| Generated | 2026-10-11 |
| Status | Approved |
| Approved by | Rev 2: Ahmed Ayman, 2026-10-11. Rev 3: Ahmed Ayman, 2026-10-11 |
| Approved on | Rev 2: 2026-10-11. Rev 3: 2026-10-11 |

## 1. Scope Summary

Galileo flight search is reachable through two branches of the same application:

- **Integration path** — branch `NDC1_Ahmed Ayman`: Galileo is reached through the integration layer.
- **Direct path** — branch `ahmed ayman`: Galileo is reached directly.

The goal is to show that **the same search returns the same flights on both paths**, across
different **Cabin Classes** and **RBDs** (Reservation Booking Designator — the one-letter booking
class, e.g. `Y`, `J`). Prices may differ and are not compared.

**Search only.** Nothing is held, booked, or paid.

**Second scope (rev 3) — Check Supplier Request/Response Parity.** The same search scenarios are
sent through **Check Supplier** instead of **Search**. Check Supplier returns, per branch, the
supplier request the platform sent and the supplier response it received. The two branches'
requests and responses are compared on business-equivalent fields (§2.2–§2.5). This scope does not
replace the UI Search scope; it is executed in a separate run.

## 2. In Scope

| ID | Requirement | Source |
|---|---|---|
| SRCH-01 | A flight search can be run on each branch with the selected branch explicitly confirmed before the search. | Intake §1 |
| SRCH-02 | Both paths use **exactly the same Search Criteria** for a given case: Origin, Destination, Departure date, Return date (if any), Trip Type, Passenger types and counts, Cabin Class, RBD selection. | Intake §4 |
| SRCH-03 | For identical criteria, both paths return the **same flight availability and the same number of returned flights**. | Intake §4 |
| SRCH-04 | For each matched flight, both paths show the same **airline(s) and flight number(s)**. | Intake §4 |
| SRCH-05 | For each matched flight, both paths show the same **departure and arrival times** (and dates). | Intake §4 |
| SRCH-06 | For each matched flight, both paths show the same **segments, connections, and number of stops**. | Intake §4 |
| SRCH-07 | For each matched flight, both paths show the same **Cabin Class**. | Intake §4 |
| SRCH-08 | For each matched flight, both paths show the same **RBD at Fare Option / Segment level** wherever the UI exposes it. One flight can carry several fare options and each segment can carry its own RBD; RBD is never assumed to be one value per flight. | Intake §4; refinement 2026-10-11 #4 |
| SRCH-09 | For each matched flight, both paths show the same **baggage information**. | Intake §4 |
| SRCH-10 | **Cabin Class filter:** searching with a specific Cabin Class returns only results in that Cabin Class, on each path. Proven only by a **non-empty** result set. | Intake §4; refinement 2026-10-11 #2 |
| SRCH-11 | **RBD filter:** searching with a specific RBD returns only fare options / segments in that RBD, on each path. Proven only by a **non-empty** result set. | Intake §4; refinement 2026-10-11 #2 |

### 2.1 Comparison rules

| ID | Rule | Source |
|---|---|---|
| CMP-01 | **Prices, taxes, and every monetary value are ignored.** A price difference is never a mismatch. | Intake §4 |
| CMP-02 | **Fare Basis is supporting information only** — captured where it helps tell fare options apart, never used as a strict equality condition. | Intake §4 |
| CMP-03 | **Flights are matched by identity** — flight number(s), date(s), segments, and times — **never by the order** they appear in the results list. | Intake §4 |
| CMP-04 | **Every difference is documented** in the comparison report with evidence from **both** branches. | Intake §4 |
| CMP-05 | **Parity and filter validation are separate checks.** "No results" on both paths satisfies **parity** (SRCH-03…09), but it **cannot prove a filter works** (SRCH-10/11): a filter case with zero results on both paths is **Inconclusive**, not Passed. "No results" on one path only is a parity difference. | Refinement 2026-10-11 #2 |
| CMP-06 | **Compare every returned result.** No silent cap. If a full comparison cannot be done (results do not load fully, the list cannot be read in full), the case is **Inconclusive** with the limitation stated. | Refinement 2026-10-11 #3 |
| CMP-07 | **No Passed without evidence.** A case is Passed only when the observed values from both paths are recorded for every assertion. Missing evidence → Inconclusive. | Refinement 2026-10-11 #5 |

### 2.2 Check Supplier Request/Response Parity — requirements (rev 3)

| ID | Requirement | Source |
|---|---|---|
| CSP-01 | Each scenario is sent through **Check Supplier** (never **Search**) on both branches, with the same Search Criteria as its original SRCH test case. Before each check, the branch, supplier and credential are read back: Integration = `NDC1_Ahmed Ayman (BRN287)` / `NDCGal` / `NdcGalileoSTG EGY`; Direct = `ahmed ayman (BRN632)` / `Galileo` / `GalileoLiveSTAGING`. | Reviewer scope 2026-10-11 §1–§2 |
| CSP-02 | **Request parity:** both branches' supplier requests carry the same business meaning for: trip type and legs, origin and destination, departure and return dates, passenger types and counts, Cabin Class per leg, RBD selection (single, multiple, per leg), and search modifiers / supplier parameters. | Reviewer scope §3 |
| CSP-03 | **Response parity:** after normalizing both responses to one model, both branches agree on: response status and errors, flight availability, flight and itinerary counts, airlines and flight numbers, departure and arrival date-times, segments, connections and stops, Cabin Class per segment, RBD per segment and fare option, fare option counts and identities, baggage allowance per passenger type and segment, and Multi-City leg behaviour. | Reviewer scope §4 |
| CSP-04 | **Request parity and response parity are judged separately.** A matching request never hides a response mismatch, and the reverse. | Reviewer scope §5 |

### 2.3 Capture boundaries (rev 3) — what Check Supplier can and cannot show

Confirmed by the live probe of 2026-10-11 (CAI→DXB, Economy, 1 ADT; search only; both branches HTTP 200, no error).

| ID | Statement |
|---|---|
| BND-01 | Check Supplier calls `POST /Booking2/check-supplier-search`. The response carries `supplierRequest`, `supplierResponse` (raw text, full length in the API response — the screen only truncates the display), `supplierConfig` and `errorMessage`. |
| BND-02 | **The two branches expose different system boundaries.** Integration: the request from the platform **to the Integration Layer** (host `ndc-integration-stg-ne-3.azurewebsites.net`) and the Integration Layer's response — Travelport uAPI `LowFareSearchReq/Rsp`, schema v52, no SOAP envelope. Direct: the request from the platform **to Travelport uAPI** (`emea.universal-api.pp.travelport.com`) and its response — uAPI `LowFareSearchReq/Rsp`, schema v44, in a SOAP envelope. |
| BND-03 | **The Integration Layer's outgoing request to Galileo, and Galileo's raw response to it, are not observable** through Check Supplier. No conclusion is drawn about whether the requests that actually reach Galileo are identical or different. Any assertion that needs that boundary is **Inconclusive — not observable**. |
| BND-04 | Both payloads are **what the platform back end reports** it sent and received. They are not a network capture. |

### 2.4 Comparison rules for this scope (rev 3)

| ID | Rule |
|---|---|
| CMP-08 | **Business-equivalent fields are compared, not raw text.** Each request difference is classified as exactly one of: **Functional mismatch** (different business meaning, e.g. a different cabin or date) · **Missing / extra field** · **Incorrect mapping** · **Different default or search modifier** · **Representation only**. |
| CMP-09 | **Representation-only differences are recorded separately and are never functional mismatches:** XML schema version (v52 vs v44), SOAP envelope, namespaces and prefixes, text encoding, element order, and passenger identity form (e.g. `Age` vs `BookingTravelerRef`). |
| CMP-10 | Authentication and tracing values (TargetBranch, AuthorizedBy, tokens, session IDs, TraceId, TransactionId, credential URLs) are **excluded from parity**, recorded only when they help explain a mismatch, and **redacted** where sensitive (CMP-13). |
| CMP-11 | Responses are normalized to one model before comparison. Flights are matched by identity (CMP-03). Fare options are matched by flight + RBD sequence per passenger type — not by position and not by brand label. Fare Basis is supporting information (CMP-02). Prices are ignored (CMP-01). Text that means the same thing is not a functional mismatch. Missing, extra or unmatched fare options are always listed, never ignored. |
| CMP-12 | Where a payload is null, truncated, unparsable, or outside the observable boundary (BND-03), the affected assertion is **Inconclusive** and the exact capture boundary is stated. No value is inferred or invented. |
| CMP-13 | **Redaction before saving evidence:** `TargetBranch`, `AuthorizedBy`, `BookingTravelerRef`, any password, user name, token or security header, and the credential URL path (host kept). A redaction count is recorded per file. |

### 2.5 Observations carried forward for investigation (rev 3) — not confirmed findings

From the 2026-10-11 probe (one scenario: CAI→DXB, Economy, 1 ADT). Each must be re-observed in the planned run before it is used as evidence.

| ID | Observation | Status |
|---|---|---|
| OBS-01 | `ReturnUpsellFare="true"` in the Integration request, `"false"` in the Direct request. Integration's response held 64 pricing solutions and 19 `UpsellBrand` elements; Direct's held 34 and 0. | **Potential explanation** for the extra fare options on Integration (DEF-03). **Not a confirmed root cause.** |
| OBS-02 | `PreferCity="true"` on origin and destination in the Integration request only. | To investigate — possible effect on which airports and combinations are returned (DEF-04). |
| OBS-03 | `AllowDirectAccess="true"` in the Integration request's leg modifiers only. | To investigate. |
| OBS-04 | `CurrencyType="EGP"` in the Direct request's pricing modifiers only. | To investigate (affects pricing currency; prices are not compared). |
| OBS-05 | Passenger sent as `ADT` + `Age="35"` (Integration) vs `ADT` + `BookingTravelerRef` (Direct). | Representation (CMP-09), unless a scenario shows a business effect. |
| OBS-06 | Same 59 segments and 34 flights on both; all 34 Direct fare options exist on Integration with equal Cabin, RBD, baggage allowance and Fare Basis. | Probe result for one scenario only. |

## 3. Out of Scope

| Area | Why |
|---|---|
| Hold, Pay after Hold, Booking, Payment | Search only (Intake §2) |
| Meals, Seats, Bundles, any ancillary selection | Search only (Intake §2) |
| Price, tax, and fare-amount equality | Ignored by rule CMP-01 |
| Any other Feature, module, or `search-and-booking` | Intake §5 |
| The **Search** action, in the Check Supplier scope | Reviewer scope 2026-10-11 §2 — Check Supplier only |
| The Integration Layer's own request to Galileo | Not observable (BND-03) |

Baggage **information shown on a search result** (SRCH-09) is in scope. Baggage as a purchasable
ancillary is not. No test case declares `Requires: Baggage`.

## 4. Environment, Roles & Credentials

| Item | Value |
|---|---|
| URL | `http://192.168.1.210/` |
| User | `ahmed ayman` — the same account for both paths |
| Password | held outside the repository (scratchpad only); never written to any artifact |
| Branch — Integration | `NDC1_Ahmed Ayman` |
| Branch — Direct | `ahmed ayman` |
| Sessions | **Two separate browser sessions** (two browsers, or one normal + one Incognito/isolated context), one per branch, to avoid session conflicts |
| Execution mode | Headed (confirmed 2026-10-11; reconfirmed right before execution) |

The branch is selected on the Search page. It must be confirmed as correct **before every search**.

| Item (Check Supplier scope, rev 3) | Value |
|---|---|
| Supplier / credential — Integration | `NDCGal` / `NdcGalileoSTG EGY` (the only options offered on this branch, 2026-10-11) |
| Supplier / credential — Direct | `Galileo` / `GalileoLiveSTAGING` (the only options offered on this branch, 2026-10-11) |
| Environment classification | Staging — classified by Ahmed Ayman, 2026-10-11 |

## 5. Supplier Capabilities & Rules

| Item | Value |
|---|---|
| Hold · Pay after Hold · Meal · Baggage · Seat · Bundle | `Unknown` — out of scope for this search-only Feature; they do not affect test design or execution |
| Galileo-specific Cabin Class / RBD rules | **Unknown** — none confirmed. No restriction is assumed or invented. |

## 6. Test Data

**Every test case states its exact Search Criteria before execution** (refinement 2026-10-11 #1). The
same criteria are entered on both branches. Dates are 4–8 weeks after the run date (2026-10-11) so
that availability exists. If a chosen route returns no Galileo content on both paths, the tester
records that; a replacement route is a test-case revision, never an ad-hoc change during execution.

Cabin Class values used: Economy, Premium Economy, Business, First — only those the Search page
actually offers. A value the page does not offer is recorded, not substituted.

**Check Supplier scope (rev 3):** the original 18 search scenarios and their Test Data are reused
**unchanged**. Each Check Supplier case traces to its original SRCH test case and uses its Search
Criteria verbatim.

## 7. Assumptions & Risks

> **Assumption A-01:** The Search page offers Cabin Class and RBD as search criteria on both branches. To be confirmed at the first search; if one branch lacks a control, that is recorded as a difference.

> **Assumption A-02:** Availability is live. A seat count or availability change between the two searches can cause a small, time-based difference. Searches for one case are run back to back to keep this small; any difference is still recorded, with timestamps.

| Risk | Note |
|---|---|
| R-01 — Shared environment | Search only; no data is created. Low risk. |
| R-02 — Large result sets | Every result is compared (CMP-06). Where that is not possible, the case is Inconclusive with the limitation stated — never a silent cap. |
| R-03 — Sensitive values in supplier payloads (rev 3) | The Direct request carries `TargetBranch`; the Integration request carries `TargetBranch` and `AuthorizedBy`; the config carries credential URLs. Redacted per CMP-13 before any evidence is saved. |
| R-04 — Different boundaries (rev 3) | Request parity compares what each branch sends to its **next hop** (Integration Layer vs Travelport uAPI), not what reaches Galileo (BND-02, BND-03). |

> **Assumption A-03 (rev 3):** Check Supplier queries the same supplier path as Search on each branch. Supported by the probe — the pricing-solution counts (64 / 34) equal the UI "options" counts from the Search run — for one scenario only.

## 8. Upstream stages

| Stage | Status |
|---|---|
| Stage 2 — Discovery | **Not run, by human decision (2026-10-11).** Stage 3 runs degraded and declares the gap. |
