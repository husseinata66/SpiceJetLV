# Manual QA Report — run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

**Status:** Pending Review · **Branch:** Manual Execution (terminal)

## 1. Run Identification

| Field | Value |
|---|---|
| Run Folder | `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Execution ID | STAGE4M-ANCILLARIES-AIRINDIA-RUN007 |
| Run Scope Type / Run Type | Feature / User Story |
| Modules in scope | `ancillaries/air-india` (Supplier Feature: Ancillaries, Supplier: Air India) |
| Target environment | Staging — Admin `http://192.168.1.213` / Portal `http://192.168.1.213:9500` |
| Execution window | 2026-09-28 19:00 UTC → 2026-10-03 03:10 UTC |
| Browser mode | Headed (normal for this stage, §11.1) |
| Executed by | Ahmed Alhussieny (Claude Code, Playwright MCP) |

## 2. Executive Summary

This run manually tested how AirIndia's flight bookings handle ancillary add-ons (meals, extra
baggage, and bundles) across both of Air India's booking channels — the agent Portal and the Admin
back-office tool. It covers the full lifecycle: selecting ancillaries, paying, and then checking the
charge is reflected correctly everywhere downstream — the booking confirmation, the agency's own
booking lookup, the cost breakdown, the wallet, and the financial reports.

**Bottom line: the feature works correctly for real customers.** Six real bookings were made across
every combination of route, trip type, and channel the business asked for, and in every one of them
the amount a passenger actually pays matches exactly what they see on screen, in their booking
details, and in every financial report checked. A further check, added mid-delivery, called the
airline's own backend directly (bypassing the app entirely) and confirmed the meal and baggage options
customers see — and their prices — are retrieved correctly, with nothing lost or altered on the way to
the screen. Of 28 designed checks, 27 were allowed to run this pass (one — the Statement report — is
being held back until a known defect in it is fixed, see below) and 25 passed cleanly.

**One real but contained defect was found and needs a fix:** the airline's own backend sometimes
under-reports how a single passenger's meal/baggage charge breaks down when that same item was
charged more than once (for example, a meal selected on two flight legs). The amount the passenger is
actually billed is always correct — this only affects an internal, passenger-level breakdown used for
reconciliation, not what the customer sees or pays. **One item needs a decision, not a fix:** whether
a report's column labeling (Debit vs. Credit) is intentional — the figures themselves are correct.

**What needs a decision from you:** (1) prioritize fixing the backend itemization defect above; (2)
confirm whether the report-labeling question above is a UX fix or expected; (3) once the Statement
report defect (already known, tracked separately as FINDING-012) is fixed, this run's one remaining
untested case can be executed.

## 3. Outcome Figures

| Status | Count | % of scope |
|---|---|---|
| Passed | 25 | 92.6% |
| Failed | 1 | 3.7% |
| Blocked | 0 | 0% |
| Skipped | 0 | 0% |
| Not Executed | 0 | 0% |
| Inconclusive | 1 | 3.7% |
| **Executable scope** (`Review = Approved`) | **27** | **100%** |

Not authorized to run this pass — reported, not dropped:

| Excluded | Count | % of suite |
|---|---|---|
| Pending Review | 1 | 3.6% |
| Rejected at Review | 0 | 0% |
| **Suite total** | **28** | **100%** |

**Authorized Coverage:** 96.4% of the designed suite (27 of 28) was approved for execution in this pass.

## 4. Requirement Coverage

<!-- Computed from TraceabilityMatrix.md §2 (Requirement → Test Case Roll-Up), re-resolved against
     this run's actual executed Status per case — never the Matrix's own pre-execution "Coverage
     Status" column, which predates execution. Out-of-Scope requirement groups (process/governance/
     infrastructure facts the Matrix itself excludes from functional testing) are listed for
     completeness but excluded from the Requirements-verified denominator below. -->

| Requirement ID | Requirement | Covering test cases | Verification state | Note |
|---|---|---|---|---|
| ANC-01…09 | Capability governance (process/metadata rules) | — | Out-of-Scope | Process/governance rules, not user-facing behavior a manual test case executes |
| ANC-10…13 | Application model (level recorded per capability) | TC-ANC-002, TC-ANC-004 | Verified | Both covering cases Passed |
| ANC-14…18 | Admin precondition (Branch/Supplier/Credential) | TC-ANC-001 | Verified | — |
| ANC-19…21 | Portal/Admin search, selection, PAX Details | TC-ANC-002, 003, 004, 005, 034, 035 | Verified | All six E2E cases Passed |
| ANC-22, 23 | Ancillaries verification against intake | TC-ANC-006, TC-ANC-008, TC-ANC-036 | Verified | All Passed; TC-ANC-036 additionally confirms the raw supplier ancillary catalog matches the UI exactly |
| ANC-24 | Select applicable ancillaries, continue booking | TC-ANC-002, 003, 004, 005 | Verified | All Passed |
| ANC-25 | Ancillary info preserved through booking and downstream | TC-ANC-020, TC-ANC-021, TC-ANC-022 | Partially verified | TC-ANC-020/021 Passed (Confirmation, Itinerary); TC-ANC-022 **Failed** — the supplier retrieve endpoint does not preserve a repeated ancillary code's full itemization per passenger (Defect A) |
| ANC-26 | Two-application execution, independent environments | — | Out-of-Scope | Infrastructure fact, already confirmed at Discovery |
| ANC-27…30 | Evidence capture fields | TC-ANC-006, TC-ANC-008, TC-ANC-014 | Verified | All Passed |
| ANC-31…33 | Six-checkpoint validation model | TC-ANC-002, 003, 004, 005, 020, 021, 022, 034, 035 | Partially verified | Every checkpoint Passed except the supplier-retrieve checkpoint specifically (TC-ANC-022 Failed, Defect A) |
| ANC-34…36 | Pricing capture (base, ancillary, total) | TC-ANC-010, TC-ANC-012 | Verified | Both Passed |
| ANC-37…41 | Discovery obligations | — | Out-of-Scope | Discovery-process rules, not Test Design targets |
| ANC-42 | ROE currency conversion | TC-ANC-010, TC-ANC-036 | Verified | Both Passed; TC-ANC-036 reconciles ROE 0.5 exactly across 45 distinct ancillary codes |
| ANC-43 | Taxes/fees per offer | TC-ANC-012 | Verified | Passed |
| ANC-44 | Rule engine — markup/discount/service-fee | TC-ANC-002, 003, 004, 005, 011, 012, 035 | Verified | All Passed |
| ANC-45 | Ancillary/Bundle amounts added to total | TC-ANC-012, TC-ANC-014 | Verified | Both Passed |
| ANC-46 | Wallet/payment timing | TC-ANC-015, TC-ANC-016 | Verified | Both Passed |
| ANC-47 | Before-booking change/removal, per passenger | TC-ANC-018 | Verified | Passed |
| ANC-48 | Application Level defaults (Meal/Segment, Baggage/Journey) | TC-ANC-002, 003, 004, 005, 035 | Verified | All Passed; round-trip Baggage scoping question resolved (once per direction) |
| ANC-49 | Eligibility default (Adult/Child only) | TC-ANC-002, 003, 004, 005, 006, 007, 008, 009, 034, 036 | Verified | All Passed; TC-ANC-036 additionally confirms Infant exclusion at the raw supplier API layer, not only the UI |
| ANC-50 | Bundle coexistence | TC-ANC-014 | Verified | Passed |
| ANC-51 | Environment architecture | — | Out-of-Scope | Infrastructure fact |
| ANC-52 | Post-booking immutability | TC-ANC-002, 003, 004, 005, 019, 034, 035 | Verified | All Passed |
| ANC-53 | Downstream reflection (confirmation, itinerary, reports) | TC-ANC-002, 003, 004, 005, 020, 021, 024, 025, 026, 034, 035 | Partially verified | All executed cases Passed; TC-ANC-026 (Statement report facet) **Excluded**, not verified this pass |
| ANC-54 | Admin's own booking cycle | TC-ANC-004, 005, 007, 034 | Verified | All Passed |
| ANC-55 | Shared rule engine; Markup folds into Base Fare | TC-ANC-004, 005, 011 | Verified | All Passed |
| ANC-56 | Admin's three-component wallet | TC-ANC-016 | Verified | Passed |
| ANC-57 | Admin's own Reports set | TC-ANC-004, 005, 025, 026, 027, 034 | Partially verified | TC-ANC-004/005/025/034 Passed; TC-ANC-026 Excluded (Statement); TC-ANC-027 Inconclusive (Wallet History labeling decision deferred) |
| ANC-58 | Admin's Agency/Agent selection supplies the wallet | TC-ANC-004, 005 | Verified | Both Passed |
| — | Multi-city not supported for AirIndia | — | Not verified | No test case in Ancillaries scope — recommend a general-booking Feature pick this up |

**Requirements verified:** 21 / 26 (80.8%) — of the 26 testable-in-scope requirement groups (Out-of-Scope
groups excluded from this denominator, consistent with `CoverageReport.md`'s own methodology). TC-ANC-036
added evidence depth to three already-Verified/Partially-verified groups (ANC-22/23, ANC-42, ANC-49)
without flipping any group's category, so this figure is unchanged.

## 5. Defect Register

| Test Case | Defect summary | Severity | Priority | Category | Layer | Reproducibility | Full write-up |
|---|---|---|---|---|---|---|---|
| TC-ANC-022 | Supplier retrieve-endpoint itemization undercounts a repeated ancillary code per passenger (aggregate total stays correct) | Medium | P2 | Data Integrity | Integration | Always | [details](./ManualExecutionResults.md#tc-anc-022--supplier-retrieve-endpoint-itemization-undercounts-a-repeated-ancillary-code) |
| TC-ANC-027 | Wallet History Debit/Credit column labeling reads inverted from standard accounting convention — awaiting a product decision on whether this is intentional | Not applicable (no defect confirmed) | Not applicable | Not applicable | Not applicable | Always (observation) | [details](./ManualExecutionResults.md#tc-anc-027--wallet-history-debitcredit-labeling-product-decision-deferred) |

**Defects by severity:** Critical 0 · High 0 · Medium 1 · Low 0 (TC-ANC-002's Bundle-label bracket
glitch is Low severity but, since TC-ANC-002 itself is Passed, it is reported in Results §3.1 and in
Known Limitations below, not in this Register, which is scoped to Failed/Inconclusive cases only)

## 6. Assumptions & Risks Resolved

| Assumption / Risk | Source test case | Resolution | Evidence |
|---|---|---|---|
| Application Level defaults (Meal/Segment, Baggage/Journey) are a platform-wide expectation, not a substitute for per-Supplier verification (ANC-13-carry) | TC-ANC-002, TC-ANC-004 | Confirmed | Both cases Passed, directly observing Meal-per-leg and Baggage-per-journey on live AirIndia bookings |
| Adult/Child-only ancillary eligibility is a platform-wide default, still verified per Supplier (ANC-41-carry) | TC-ANC-006, TC-ANC-007 | Confirmed | Both cases Passed, directly observing Infant exclusion on live AirIndia bookings (Portal and Admin) |
| Round-trip Baggage scoping (once for the whole trip vs. once per direction) — an open question never exercised in Discovery | TC-ANC-003, TC-ANC-005 | Confirmed (once per direction) | Both cases Passed; Baggage offered as 2 independent slots (Onward, Return) on every round-trip booking checked |
| Baggage (a Per-Journey capability) can be selected onward-only/asymmetrically on a round trip | TC-ANC-035 | Confirmed (yes) | Case Passed; the system accepted and correctly priced an onward-only selection with zero carry-over to the return leg |

## 7. Known Limitations

| Limitation | Affected test cases | Why | Consequence for confidence |
|---|---|---|---|
| Statement report cannot be verified | TC-ANC-026 | A confirmed defect (FINDING-012) makes the report return zero rows on both channels; held back from execution per explicit instruction rather than tested against a known-broken report | None for Ancillaries pricing/charging correctness — this is a reporting-only gap, already tracked separately |
| Supplier retrieve-endpoint itemization is unreliable for a passenger charged a repeated ancillary code | TC-ANC-022 (confirmed defect); carried as an observation on TC-ANC-002, 003, 005, 035 | Confirmed, reproducible defect (Defect A) — see Defect Register | None for what the customer is charged (the booking-level total is always correct); reduces confidence only in per-passenger breakdowns pulled from this specific endpoint |
| A product decision on Wallet History's column labeling was not obtained | TC-ANC-027 | The reviewer was asked directly and explicitly chose to defer | None for the figures themselves, which are correct in every case checked; only the labeling's intent is unresolved |
| A cosmetic label glitch on the Bundle Services field (`[Xtra Pack`) | TC-ANC-002 (observed once) | Low-severity, display-only; reproducibility unconfirmed (one observation) | None — no data or amount is affected |
| A direct live re-read of the post-booking Portal wallet balance widget was not captured for one case | TC-ANC-015 | A transient network dropout interrupted a second attempt; an equivalent, exact-match figure was obtained from the Total Due to NDC report instead | Minimal — the exact-total-deduction pattern has held with zero exceptions on every other wallet check this run |

## 8. Recommendations

| Item | Recommendation | Owner suggestion |
|---|---|---|
| Defect A (TC-ANC-022) | Fix the NDC integration service's Retrieve mapping so a repeated ancillary code itemizes correctly per occurrence, then re-execute TC-ANC-022 | NDC integration service owner |
| TC-ANC-027 | Obtain the deferred product decision on Wallet History's Debit/Credit labeling, then re-execute to a definite outcome | Product/business owner |
| TC-ANC-026 | Fix FINDING-012 (Statement report returns zero rows on both channels), move its `Review` to `Approved`, then execute | Reporting service owner |
| Bundle label glitch | Low priority — fix the stray `[` in the Bundle Services label rendering | Portal frontend owner |

---

## Delivery Completeness

| Requirement | Status |
|---|---|
| Every test case in scope has a recorded outcome | Yes |
| Every Failed/Inconclusive case meets the Defect Documentation Standard in full (§10.1) | Yes |
| Every result's evidence captured, or its absence stated with a reason | Yes |
| CSV has one row per test case in scope, statuses unabbreviated | Yes |
| Coverage computed from the Traceability Matrix, uncovered requirements shown as *not verified* | Yes |
| **All three renderings agree on every test case's status** | Yes |
| No script of any kind was produced as an artifact (§2.1) | Yes |
