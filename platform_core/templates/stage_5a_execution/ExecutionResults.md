<!--
TEMPLATE — Execution Results (Stage 5A — Automation branch)
Renders to: platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md
Authority:  .claude/skills/automation-execution-skill/SKILL.md §18 (Standard Output Contract — these
            10 sections, this order), §17 (Result Classification), §22 (Metrics),
            §25 (Failure Handling — classify and hand off, NEVER repair), §25.2 (three health figures), §9

Section order is mandatory: the Reporting skill must never have to interpret free-form prose. This is
a SINGLE-FILE input for Stage 6A by design (reporting-skill §4).

WHAT IS EXECUTED depends on the run's module scope (pipeline.md §4 Stage 5A, module_architecture.md §9.1):
  - single / multi — each named module's own STANDALONE PROJECT,
                     modules/{{MODULE_SLUG}}/automation/tests_{{FRAMEWORK}}/
  - full-project   — the ASSEMBLED BASELINE, as one system:
                     automation_baseline/{{FRAMEWORK_LOWER}}/tests_{{FRAMEWORK}}/
A module-scoped execution happens strictly BEFORE that module's assembly into the baseline.

RESULTS ARE PER RUN, NEVER PER MODULE. A multi-module execution writes ONE results file here, with
every result citing the module it belongs to — splitting them per module would break the run's single
record of what happened (pipeline.md §7).

A Stage 5H post-repair rerun is appended as a SIBLING file, ExecutionResults.rerun-N.md, with its own
artifacts_rerun-N/ folder. THIS FILE IS NEVER EDITED by a rerun: it is cycle 1's record, and run
immutability depends on it staying that way (module_architecture.md §8.2).
-->

# Execution Results — {{RUN_FOLDER}}

## 1. Execution Metadata

<!-- §18 #1 — the run-identity header. Execution Mode, Concurrency Mode, and Retry Policy are
     mandatory here alongside the other identity fields (§9). -->

| Field | Value |
|---|---|
| Execution ID | {{EXECUTION_ID}} |
| Run Folder | `{{RUN_FOLDER}}` |
| Execution cycle | {{CYCLE}} <!-- 1 for this file; a Stage 5H rerun is cycle 2+ in ExecutionResults.rerun-N.md --> |
| Modules executed | {{MODULES}} <!-- the slugs, from run.json → modules[] --> |
| Module scope | {{MODULE_SCOPE}} <!-- single / multi / full-project --> |
| Run Scope Type / Run Type | {{RUN_SCOPE_TYPE}} / {{RUN_TYPE}} <!-- §13 --> |
| Environment | {{ENVIRONMENT}} <!-- §14 --> |
| Target URL | {{APP_URL}} |
| Framework | {{FRAMEWORK}} |
| Suite executed | {{SUITE_PATH}} <!-- the module project(s), or the assembled baseline for a full-project run --> |
| Execution Mode | {{EXECUTION_MODE}} <!-- Headless / Headed / Debug — §5.1 --> |
| Concurrency Mode | {{CONCURRENCY_MODE}} |
| Retry Policy | {{RETRY_POLICY}} <!-- §5.4 --> |
| Started | {{START_TIMESTAMP}} |
| Ended | {{END_TIMESTAMP}} |

## 2. Execution Summary

<!-- §18 #2 — ONE PARAGRAPH: what was executed, the overall outcome, and headline pass/fail figures. -->

{{EXECUTION_SUMMARY_NARRATIVE}}

## 3. Execution Results

<!-- §18 #3 — per-test detail. EXACTLY ONE classification per test (§17) — never zero, never more
     than one:

       Passed                 every assertion succeeded
       Failed                 executed, at least one assertion did not succeed — a genuine,
                              reproducible discrepancy in APPLICATION BEHAVIOUR
       Skipped                deliberately not run (e.g. not authorized for this environment)
       Blocked                a precondition was not met (prior test in a chain, test data,
                              environment state) — distinct from Skipped and Failed
       Not Executed           in scope, but the run ended before reaching it
       Inconclusive           ran, but cannot be confidently classified Passed or Failed (e.g. an
                              assertion that itself errored rather than evaluated false)
       Flaky                  outcome not consistent across attempts within this same execution
                              (§5.4) — reported distinctly from a clean Passed
       Infrastructure Failure test runner crash, OOM, CI runner failure — not the app or environment
       Environment Failure    target environment unreachable/degraded, not attributable to the app
       Automation Failure     the generated automation itself is broken (stale selector, removed page
                              object) — a signal back to the Automation skill (§20)
       Application Failure    the app genuinely behaved incorrectly, and automation/environment/
                              infrastructure are CONFIRMED not at fault
       Configuration Failure  wrong environment URL, missing credential, invalid mode/framework config

     `Failed` is RESERVED for genuine application-behaviour discrepancies. Where the cause is actually
     Infrastructure / Environment / Automation / Configuration, the MORE SPECIFIC classification is
     used — so a reviewer never mistakes an environment hiccup for a real defect, or vice versa.
     Where the cause is genuinely ambiguous even after failure detail is captured, `Inconclusive` is
     the honest answer — never force-fit into `Failed` for a cleaner-looking report. -->

| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |
|---|---|---|---|---|---|---|
| {{TEST_CASE_ID}} | {{SCRIPT_ID}} | {{STATUS}} | {{EXECUTION_TIME}} | {{ATTEMPTS}} | {{FAILURE_DETAIL}} | {{EVIDENCE_REFS}} |

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
       Evidence         — optional file under `execution/artifacts/` (must exist inside this run folder); the Actual value
                          is itself the evidence of a UI/text assertion
     Consequences: no rows → the case counts Unverified; a ❌, a "Not checked", or a Result the Expected
     and Actual contradict → Inconclusive, with a conflict; a missing or unsourced Expected, an unknown
     Check, a quoted literal of the Expected Result that no row checks, or a cited file that does not
     exist → Unverified. A screenshot, log or captured value alone is never proof of a pass. -->

| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |
|---|---|---|---|---|---|---|---|---|
| {{TEST_CASE_ID}} | {{ASSERTION_ID}} | {{ASSERTION}} | {{EXPECTED}} | {{EXPECTED_SOURCE}} | {{ACTUAL}} | {{CHECK}} | {{RESULT}} | {{EVIDENCE_REF}} |

## 4. Evidence Inventory

<!-- §18 #4 — the consolidated list per §16: every evidence type captured, PER TEST, with paths, and
     EVERY GAP WITH A REASON. A missing evidence item is named, never silently omitted. -->

| Test Case ID | Evidence Type | Path | Captured? | Gap Reason |
|---|---|---|---|---|
| {{TEST_CASE_ID}} | {{EVIDENCE_TYPE}} <!-- screenshot / trace / log / HAR / framework report / video --> | `execution/artifacts/{{FILE}}` | {{CAPTURED}} | {{GAP_REASON}} |

**Evidence root:** `platform_core_data/runs/{{RUN_FOLDER}}/execution/artifacts/`

## 5. Execution Statistics

<!-- §18 #5 — the Metrics from §22. Every rate states its DENOMINATOR explicitly. -->

| Metric | Value | Definition / Basis |
|---|---|---|
| Execution Duration | {{DURATION}} | Total wall-clock, start to finish |
| Pass Rate | {{PASS_RATE}}% | Passed ÷ total executed — Skipped/Blocked/Not Executed EXCLUDED from the denominator: {{PASS_RATE_BASIS}} |
| Failure Rate | {{FAILURE_RATE}}% | (Failed + Application Failure) ÷ total executed — genuine application-behaviour failures, kept distinct from infrastructure-caused non-passes |
| Skip Rate | {{SKIP_RATE}}% | Skipped ÷ total in scope |
| Retry Count | {{RETRY_COUNT}} | Total retry attempts across the run (§5.4) |
| Evidence Count | {{EVIDENCE_COUNT}} | Total evidence items captured (§16) |
| Framework | {{FRAMEWORK}} | From the Automation Summary (§15) |
| Execution Mode | {{EXECUTION_MODE}} | §5.1 |
| Environment | {{ENVIRONMENT}} | §14 |
| Coverage Summary | {{COVERAGE_POINTER}} | A restated POINTER to the Automation Coverage Report's figures — this stage does not recompute coverage, only cites it |
| Flaky Test Count | {{FLAKY_COUNT}} | Results classified `Flaky` (§17) |
| Execution Stability | {{STABILITY}} | Flaky Count ÷ total executed — a stated ratio, not a subjective judgment |

## 6. Health Summary

<!-- §18 #6 / §25.2 — THREE SEPARATE FIGURES. NEVER ONE MERGED "Failed" COUNTER.
     Folding these together misrepresents which system is actually at fault. -->

### Application Health

<!-- Counted ONLY from `Application Failure` classifications plus genuine Passed results. This is the
     ONLY figure that speaks to whether the application under test is actually working. -->

| Metric | Value |
|---|---|
| Passed | {{APP_PASSED}} |
| Application Failure | {{APP_FAILED}} |
| Application Health | {{APP_HEALTH}} |

### Automation Health

<!-- `Automation Failure` counted separately. (`Automation Repaired` never appears in THIS document:
     a repaired result is Stage 5H's outcome, recorded in self_healing/BeforeAfterComparison.md.)
     Speaks to the quality/maintenance state of the generated suite, NOT the application. -->

| Metric | Value |
|---|---|
| Automation Failure | {{AUTOMATION_FAILED}} |
| Automation Repaired | {{AUTOMATION_REPAIRED}} |
| Automation Health | {{AUTOMATION_HEALTH}} |

### Environment Health

<!-- `Environment Failure` / `Infrastructure Failure` / `Configuration Failure` counted separately.
     Speaks to the target environment and execution infrastructure, not either of the above. -->

| Metric | Value |
|---|---|
| Environment Failure | {{ENV_FAILED}} |
| Infrastructure Failure | {{INFRA_FAILED}} |
| Configuration Failure | {{CONFIG_FAILED}} |
| Environment Health | {{ENV_HEALTH}} |

### Inconclusive / Flaky

<!-- Reported as THEIR OWN LINE — folded into NEITHER of the three health figures, in either
     direction. -->

| Status | Count |
|---|---|
| Inconclusive | {{INCONCLUSIVE_COUNT}} |
| Flaky | {{FLAKY_COUNT}} |

## 7. Self-Healing Availability

<!-- §18 #7 / §25.3 — include ONLY when at least one `Automation Failure` occurred.
     THIS STAGE NEVER REPAIRS. This section states AVAILABILITY ONLY — the count of Automation
     Failures and the literal /self-healing-skill commands. Any actual repair, and its Before/After
     comparison, is Stage 5H's artifact in self_healing/, never recorded here.
     Naming the option is not invoking it and is not a recommendation to invoke it (pipeline.md §3.6).
     ORIGINAL NOTE FOLLOWS — an `Automation Failure`
     occurred this run. OMITTED ENTIRELY — not left as an empty section — when none occurred. -->

**Repair Summary (§25.1):** {{REPAIR_SUMMARY}}

**Human decision (§25.2):** {{HUMAN_DECISION}}
<!-- The human's answer to the repair gate. Repair is never applied without it. -->

**Before / After comparison (§25.4)** — include only if repair was APPROVED:

| Field | Value |
|---|---|
| Fixed (`Automation Repaired`) | {{FIXED}} |
| Remaining failures | {{REMAINING_FAILURES}} |
| New failures | {{NEW_FAILURES}} |
| Root cause | {{ROOT_CAUSE}} |
| Confidence | {{CONFIDENCE}} |

## 8. Known Limitations

<!-- §18 #8 — anything this execution could not fully verify (e.g. a test marked Blocked, a Skipped
     mutating action) AND WHY. -->

| Limitation | Affected Test(s) | Why |
|---|---|---|
| {{LIMITATION}} | {{TEST_CASE_IDS}} | {{REASON}} |

## 9. Execution Recommendations

<!-- §18 #9 — the corrective actions recommended per §20 for any blocked/failed item: retry, resume,
     switch mode, validate environment, re-run subset, or flag for Automation regeneration.
     Recommendations requiring follow-up — never a claim that a fix has been applied. -->

| ID | Recommendation | Applies To | Rationale |
|---|---|---|---|
| {{REC_ID}} | {{RECOMMENDATION}} | {{APPLIES_TO}} | {{RATIONALE}} |

## 10. Inputs for Reporting skill

<!-- §18 #10 — the explicit handoff package (§21): confirmation that every input
     .claude/skills/reporting-skill/SKILL.md §4 declares it needs is present. -->

| Required Input (Reporting §4) | Present? | Location / Note |
|---|---|---|
| {{REQUIRED_INPUT}} | {{PRESENT}} | {{LOCATION}} |

**Handoff confirmation:** {{HANDOFF_CONFIRMATION}}
