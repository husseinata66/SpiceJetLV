<!--
TEMPLATE — Manual Test Suite, per module (Stage 3 — shared, divergence point)
Renders to: platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{{MODULE}}.md
Authority:  .claude/skills/test-design-skill/SKILL.md §9 Outputs #1–#2, §6 (Test Case Schema),
            §9.1 (Excel Rendering), §12

Each test case block follows `TestCase_entry.md` in this folder — that file is the authoritative
per-case field list. Do not restate or extend the field list here.

THIS MARKDOWN FILE IS THE AUTHORED ARTIFACT. THE .xlsx IS GENERATED FROM IT — NEVER WRITTEN BY HAND:

    node platform_core/tools/test_suite_export/cli.js

§9 requires the Markdown and Excel suites to be "two renderings of one test case set — they must
never diverge in content." Deriving the workbook from this file is what actually GUARANTEES that;
authoring both by hand makes it a matter of discipline, and when they drift, Stage 4M silently
executes against whichever one the tester happened to open. Nothing downstream can detect that.

So: edit THIS file, then re-run the export. Never hand-edit a generated .xlsx — the next export
discards the edit silently. The column contract the exporter produces is in
`platform_core/tools/test_suite_export/README.md`; it is §6.1's field list, in §6.1's order.

Only the platform's own canonical artifacts are produced. No output is shaped around, named after, or
structured to match any external ALM, issue-tracking, or test-management system.
-->

<!-- One file per artifact, edited in place — no `.vN` copies. Git is the version history
     (templates/README.md §6, pipeline.md §7). A superseded TestCases_{{MODULE}}.vN.md left beside
     this file is skipped by the exporter rather than rendered into a shadow workbook Stage 4M could
     execute by accident. -->

# Manual Test Suite — {{MODULE}}

| Field | Value |
|---|---|
| Module | `{{MODULE_SLUG}}` |
| Produced by run | `{{RUN_FOLDER}}` |
| Revision | {{REVISION_COUNT}} <!-- in-place edits since creation; this artifact belongs to the module, not the run --> |
| Run Scope Type / Run Type | {{RUN_SCOPE_TYPE}} / {{RUN_TYPE}} |
| Project Context | `modules/{{MODULE_SLUG}}/context/ProjectContext.md` |
| Total Test Cases | {{TOTAL_CASES}} |
| Generated | {{TIMESTAMP}} |
| Status | {{STATUS}} <!-- Pending Review / Approved --> |

## Shared Definitions

<!-- OPTIONAL (test-design-skill §6.1b). Delete this whole section when no setup or comparison logic is
     shared by several cases. Write each shared item ONCE here and cite it by ID from the cases.

       ### SETUP-n — Title          numbered steps reaching a ready state; cited from Preconditions
       ### VR-n — Title             a validation rule; MUST have a **Source:** line (requirement,
                                    contract or confirmed business rule — never an observation), then
                                    the procedure and one sub-check per line (VR-n.1, VR-n.2 …)

     Example:
       ### VR-01 — Error body contract
       **Source:** FR-7, API contract GET /users/{id} 404
       - VR-01.1 Status code equals the contract status.
       - VR-01.2 `$.error.code` equals the contract error code.

     Editing a definition re-opens review for every case that cites it (it is part of their
     fingerprint). Exported as the workbook's "Shared Definitions" sheet. `cli.js --check` reports
     undefined, unused or source-less definitions. -->

### {{DEFINITION_ID}} — {{DEFINITION_TITLE}}

{{DEFINITION_BODY}}

## Case Index

<!-- At-a-glance index for this module. Traceability (Requirement Reference, Risk, Discovery
     Reference) is deliberately NOT here — it lives in TraceabilityMatrix.md keyed by Test Case ID,
     keeping this execution-facing document lean (§6, §6.2). -->

| Test Case ID | Title | Tier | Priority | Tags | Review | Automation |
|---|---|---|---|---|---|---|
| {{TEST_CASE_ID}} | {{TITLE}} | {{TIER}} <!-- Atomic / Scenario / E2E --> | {{PRIORITY}} | {{TAGS}} | {{REVIEW}} <!-- Pending / Approved / Rejected --> | {{AUTOMATION}} <!-- Pending / Approved / Rejected --> |

**Tier breakdown:** {{ATOMIC_COUNT}} Atomic · {{SCENARIO_COUNT}} Scenario · {{E2E_COUNT}} E2E

**Lifecycle breakdown:** Review — {{REVIEW_PENDING}} Pending · {{REVIEW_APPROVED}} Approved · {{REVIEW_REJECTED}} Rejected · Automation — {{AUTO_PENDING}} Pending · {{AUTO_APPROVED}} Approved · {{AUTO_REJECTED}} Rejected

<!-- The two lifecycle columns appear in this index as well as on each case block, because their
     whole purpose is at-a-glance triage: a reviewer needs to see which cases still await a decision
     without opening 50 case blocks. They are still recorded once per case in the block below — the
     index is a view of them, never a second place to edit them. -->


## Test Cases

<!-- One block per case, rendered per TestCase_entry.md. Repeat for every case in the index above —
     the index and the case blocks must always agree in count and IDs. -->

{{TEST_CASE_BLOCKS}}
