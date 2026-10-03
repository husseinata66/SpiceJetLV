# Manual Execution Summary — run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Execution ID | STAGE4M-ANCILLARIES-AIRINDIA-RUN007 |
| Run Folder | `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Results artifact | `manual_execution/ManualExecutionResults.md` |
| Generated | 2026-10-03 |
| Status | Pending Review |

## 2. Execution Summary

This run executed the approved 27-case Manual Test Suite for Ancillaries/AirIndia (18 Atomic, 3
Scenario, 6 E2E) against Staging, on both the Admin (`ANCILLARIES_STG`) and Portal (`STG_PORTAL`)
channels, headed, between 2026-09-28 and 2026-10-03. All 6 E2E cases produced real, confirmed
bookings (PNRs Z33F4Z, P6MVJA, USCWVR, MSK5XB, H9ZK7E, S13GWS) and every atomic/scenario case either
exercised the live application directly or was recorded from evidence already captured by one of
those bookings, per the test suite's own Notes field on reuse. Of the 27 cases in the suite, 26 were
authorized to execute (`Review = Approved`); one, TC-ANC-026 (Statement report), remains `Excluded`
with reason `Pending Review` — held back since Stage 3, pending the fix of FINDING-012 (a confirmed
Statement-report defect on both channels), per explicit instruction not to execute against a
known-broken report.

Of the 26 executed cases, 24 Passed, 1 Failed (TC-ANC-022 — the supplier retrieve endpoint's
per-passenger ancillary itemization undercounts any ancillary code repeated for a passenger, a
confirmed, reproducible defect carried as "Defect A" and reconfirmed across five independent
bookings), and 1 is Inconclusive (TC-ANC-027 — a real, reproducible Wallet History
labeling observation whose required product decision was explicitly deferred by the reviewer). No
case was Blocked, Skipped, or Not Executed.

**Headline figures:** 24 Passed · 1 Failed · 0 Blocked · 0 Skipped · 0 Not Executed · 1 Inconclusive · 1 Excluded

**Scope:** 26 of 27 cases were authorized to execute (`Review = Approved`). Every figure above is
against that executable scope; the excluded remainder (TC-ANC-026) is broken down in the QA Report.

## 5. Delivery Artifacts

| Artifact | Path | Present? |
|---|---|---|
| Manual Execution Results (authoritative) | `manual_execution/ManualExecutionResults.md` | Yes |
| Manual Test Results CSV | `manual_execution/ManualTestResults.csv` | Yes |
| Manual QA Report (stakeholder deliverable) | `manual_execution/ManualQAReport.md` | Yes |
| Evidence | `manual_execution/artifacts/` | Yes |

**All three renderings agree on every status:** Yes — the Results (§3), the CSV, and the QA Report's
Outcome Figures (§3) were derived from the same 27-row result set in this one pass; no status was
corrected after any of the three was written.

**Scripts produced:** none. Every form fill and navigation this run performed used the Playwright MCP
server's own tool calls directly; no Playwright spec, page object, fixture, or driver script was
written or retained as an artifact. Scratchpad scripts used during execution (e.g. the supplier
retrieve-endpoint caller, the storage-state session refresher) are session-local debug scaffolding
under the agent's temp scratchpad directory, never committed to this run's artifacts.

## 6. Known Limitations

| Limitation | Affected Test Case(s) | Why |
|---|---|---|
| Statement report cannot be verified | TC-ANC-026 | FINDING-012: the Statement report returns zero rows for this Branch/Agency on both channels, confirmed at the API level — a confirmed defect, not a test-data gap. Held `Excluded` until fixed, per Stage 3's explicit instruction. |
| A product decision on Wallet History's column labeling was not obtained | TC-ANC-027 | The reviewer was asked directly and chose to defer the decision; the underlying observation (Debit/Credit columns read inverted from standard accounting convention) is solid and reproducible (2/2 Admin bookings) but the case's own Expected Result requires a decision that was not made this run. |
| Supplier retrieve-endpoint itemization is unreliable for any passenger charged a repeated ancillary code | TC-ANC-022 (and, as a carried observation, TC-ANC-002/003/005/035) | Confirmed defect (Defect A) — see Results §3.1. The booking-level aggregate remains correct in every case, so this limitation affects only per-passenger breakdown consumers, not the customer-facing total. |
| A direct live re-read of the post-booking Portal wallet balance widget was not captured for TC-ANC-015 | TC-ANC-015 | A second attempt to reach it was interrupted by a transient `net::ERR_NETWORK_CHANGED`/`ERR_CONNECTION_TIMED_OUT` dropout to `192.168.1.213` (self-resolved after ~15s — an environment condition documented since an earlier session, not a code regression). The Total Due to NDC report's exact-match figure is cited as equivalent evidence rather than attempting a third live booking solely to re-read a balance. |
| Admin's FINDING-013/015/016/017 (Admin-channel observations from an earlier Discovery pass) remain capped at Human Observation/Static Artifact evidence tier | TC-ANC-004, TC-ANC-005, TC-ANC-007, TC-ANC-025, TC-ANC-027 | This is an evidence-tier cap from Discovery, not a doubt raised by this run's own live execution — this run's live bookings independently reconfirmed the same figures via Direct Observation, which is noted in each case's own result. |

## 7. Recommendations

| ID | Recommendation | Applies To | Rationale |
|---|---|---|---|
| REC-4M-001 | Fix the NDC integration service's Retrieve response mapping so `passengerAncillaries` itemizes one line per occurrence of a repeated ancillary code (or one line at the correct per-passenger total), then re-execute TC-ANC-022 | TC-ANC-022 | Defect A is confirmed, reproducible, and currently the only Failed case in this run; the fix is narrowly scoped to one mapping step |
| REC-4M-002 | Obtain the deferred product decision on Wallet History's Debit/Credit column labeling, then re-execute TC-ANC-027 to a definite Passed/Failed outcome | TC-ANC-027 | The observation itself needs no further verification; only the decision is outstanding |
| REC-4M-003 | Fix FINDING-012 (Statement report returns zero rows on both channels), then move TC-ANC-026's `Review` to `Approved` and execute it | TC-ANC-026 | This is the only case never authorized to run this pass; it is the direct reason this run's authorized coverage is 96.3% rather than 100% |
| REC-4M-004 | Re-verify FINDING-013/015/016/017 (Admin wallet/pricing/reports observations) via Direct Observation evidence specifically, closing the Discovery evidence-tier cap | TC-ANC-004, TC-ANC-005, TC-ANC-007, TC-ANC-025, TC-ANC-027 | Not blocking — this run's own live execution already reconfirmed the same figures directly; this closes a Discovery bookkeeping gap, not an open functional question |

## 8. Delivery Completeness

<!-- §10 #8 — this stage hands off to nobody (pipeline.md §3.3); the §20 checklist replaces an
     outbound handoff contract. -->

| Delivery requirement | Verified by |
|---|---|
| Every test case in scope has a recorded outcome | Yes — all 27 cases have a row in Results §3 and the CSV, including the one Excluded case |
| Every Failed/Inconclusive case meets the Defect Documentation Standard in full | Yes — TC-ANC-022 and TC-ANC-027 both carry the full 15-section write-up in Results §3.1 |
| Every result's evidence is captured, or its absence stated with a reason | Yes — Results §4 names every gap and its reason (video unsupported by this MCP setup; a wallet-balance re-read interrupted by a transient network dropout) |
| The CSV has one row per test case in scope, statuses unabbreviated | Yes — 27 rows, the full seven-state vocabulary, including TC-ANC-026's `Excluded` row |
| The QA Report's coverage is computed from the Traceability Matrix, with uncovered requirements shown as *not verified* | Yes — see `ManualQAReport.md` §4 |
| **All three renderings agree on every test case's status** | Yes |
| No script of any kind was produced as an artifact | Yes — confirmed in §5 above |
