<!--
TEMPLATE — Manual Execution Results (Stage 4M — Manual branch, terminal)
Renders to: platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionResults.md
Authority:  .claude/skills/manual-execution-skill/SKILL.md §10 (Standard Output Contract — the
            Results-side sections #1, #3, #4), §8 (Result Classification), §10.1, §13

This artifact carries the RAW, per-test record. The narrative, candidate list, limitations, and
recommendations live in its sibling ManualExecutionSummary.md — the two together satisfy the full
Standard Output Contract.

Every `Failed` / `Inconclusive` case is documented IN FULL per Defect_entry.md in this folder — never
a one-line summary.
-->

# Manual Execution Results — {{RUN_FOLDER}}

## 1. Execution Metadata

<!-- §10 #1 -->

| Field | Value |
|---|---|
| Execution ID | {{EXECUTION_ID}} |
| Run Folder | `{{RUN_FOLDER}}` |
| Run Scope Type / Run Type | {{RUN_SCOPE_TYPE}} / {{RUN_TYPE}} <!-- §17 --> |
| Environment | {{ENVIRONMENT}} |
| Target URL | {{APP_URL}} |
| Role(s) used | {{ROLES}} <!-- role names only — never a credential value --> |
| Started | {{START_TIMESTAMP}} |
| Ended | {{END_TIMESTAMP}} |
| Test Suites executed | {{SUITE_FILES}} |

## 2. Result Totals

<!-- The mechanical count behind the Summary's narrative. Every classification from §8 gets its own
     line — a non-Passed result is never folded into another bucket. -->

| Status | Count |
|---|---|
| Passed | {{PASSED_COUNT}} |
| Failed | {{FAILED_COUNT}} |
| Blocked | {{BLOCKED_COUNT}} |
| Skipped | {{SKIPPED_COUNT}} |
| Not Executed | {{NOT_EXECUTED_COUNT}} |
| Inconclusive | {{INCONCLUSIVE_COUNT}} |
| **Executable scope** (`Review = Approved`) | **{{EXECUTABLE_SCOPE_COUNT}}** |
| Excluded — Pending Review | {{EXCLUDED_PENDING_COUNT}} |
| Excluded — Rejected at Review | {{EXCLUDED_REJECTED_COUNT}} |
| **Suite total** | **{{TOTAL_COUNT}}** |

<!-- TWO DENOMINATORS, BOTH REQUIRED (manual-execution-skill §4.1, §8 — added 2026-08-01).
     Executable scope = cases this run was AUTHORIZED to execute (Review = Approved).
     Suite total      = every case in the module suite.
     The pass rate is computed against the EXECUTABLE SCOPE, and the figure is never quoted
     without saying so. Reporting only the suite total hides that most cases never ran;
     reporting only the executable scope hides how much of the suite is still unreviewed. -->

## 3. Per-Test Results

<!-- §10 #3 — one row per executed test case. Exactly one Status per case (§8):
       Passed        — executed, Expected Result observed exactly as stated
       Failed        — executed, observed result did not match — a genuine, reproducible discrepancy
       Blocked       — a stated Precondition could not be established (distinct from Skipped/Failed)
       Skipped       — deliberately not executed (e.g. mutating action unauthorized for this env)
       Not Executed  — in scope, but the run ended before reaching it
       Inconclusive  — executed but cannot be confidently classified Passed or Failed; reported as
                       such, NEVER forced into Passed or Failed
       Excluded      — NEVER AUTHORIZED TO RUN: Review is not Approved (§4.1). Reason is
                       mandatory and is exactly `Pending Review` or `Rejected at Review`.
                       NOT the same as Skipped: Skipped was authorized and this stage chose not
                       to run it; Excluded was never in the executable set. Collapsing the two
                       makes "how much of the approved suite did we finish?" uncomputable.

     EVERY non-Passed result carries its reason here — never left unstated. -->

| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |
|---|---|---|---|---|---|
| {{TEST_CASE_ID}} | {{MODULE}} | {{STATUS}} | {{EXECUTION_TIME}} | {{REASON}} | {{EVIDENCE_REFS}} |

### 3.1 Assertion Records — every Passed case (`pipeline.md` §11.4)

<!-- A Passed result shows that EACH assertion in the case's Expected Result was validated. One row per
     assertion; the platform reads this table (run_manager executionHistory.js / assertionEvidence.js):
       Test Case ID     — the case (`module:TC-…` when the run spans several modules)
       Assertion ID     — the case's own assertion ID (A1, A2 …) from its **Assertions:** table. When the case
                          states its assertions, EVERY one of them gets exactly one row here: a missing one
                          keeps the case from a verified Passed, an ID it does not define is reported as extra.
                          Expected and Check are the approved ones, unchanged. (A legacy case with no table:
                          leave it — —, and its rows are checked against the Expected Result text.)
       Assertion        — what is checked, in the case's words
       Expected         — taken from the approved test case (or the contract it cites) — NEVER from what
                          was observed
       Expected Source  — optional when Expected is quoted from the test case; otherwise name the
                          platform artifact it comes from by path ("modules/<m>/context/ProjectContext.md §3").
                          Either is verified against the version this stage CONSUMED (snapshotted when it
                          started). An external contract or a calculation cannot be version-verified, so its
                          row reads Unverified; "observed" is refused.
       Actual           — the value observed, exactly
       Check            — equals · contains · matches <pattern> · within ±N · ≥ / ≤ / > / < · present · absent
                          · not equals · classification = … (§A9). A normalization or tolerance is stated.
       Result           — ✅ / ❌ / Not checked
       Evidence         — optional file under `manual_execution/artifacts/` (must exist inside this run folder); the Actual value
                          is itself the evidence of a UI/text assertion
     Consequences: no rows → the case counts Unverified; a ❌, a "Not checked", or a Result the Expected
     and Actual contradict → Inconclusive, with a conflict; a missing or unsourced Expected, an unknown
     Check, a quoted literal of the Expected Result that no row checks, or a cited file that does not
     exist → Unverified. A screenshot, log or captured value alone is never proof of a pass. -->

| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |
|---|---|---|---|---|---|---|---|---|
| {{TEST_CASE_ID}} | {{ASSERTION_ID}} | {{ASSERTION}} | {{EXPECTED}} | {{EXPECTED_SOURCE}} | {{ACTUAL}} | {{CHECK}} | {{RESULT}} | {{EVIDENCE_REF}} |

### 3.2 Defect Detail — Failed / Inconclusive cases

<!-- One full block per Failed/Inconclusive case, rendered per Defect_entry.md (§10.1).
     Omit this subsection entirely only when there are zero Failed/Inconclusive results. -->

{{DEFECT_ENTRY_BLOCKS}}

## 4. Evidence Inventory

<!-- §10 #4 — every evidence type captured (§7), PER TEST CASE, with paths, and EVERY GAP WITH A
     REASON. A missing evidence item is named with its reason, never silently omitted. -->

| Test Case ID | Evidence Type | Path | Captured? | Gap Reason |
|---|---|---|---|---|
| {{TEST_CASE_ID}} | {{EVIDENCE_TYPE}} | `manual_execution/artifacts/{{FILE}}` | {{CAPTURED}} | {{GAP_REASON}} |

**Evidence root:** `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/artifacts/`
