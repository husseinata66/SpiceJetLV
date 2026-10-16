---
name: manual-execution-skill
description: Stage 4M of the Agentic AI Testing Platform's Manual Execution Pipeline — the branch's terminal stage. Executes the approved Manual Test Suite against a target environment, records structured Manual Execution Results with full Result Classification, paste-ready defect records, and Evidence, then self-reports a stakeholder-facing Markdown QA Report and a machine-readable Test Results CSV. Never generates or runs a script of any kind. Use when validating manually-designed test cases against a live application as a complete, standalone delivery.
inputs:
  - name: manual_test_suite
    type: file_path
    required: true
    description: Approved Manual Test Suite (Markdown + Excel) from the Test Design skill — the test cases to execute.
  - name: traceability_matrix
    type: file_path
    required: true
    description: Approved Requirement Traceability Matrix — carried through unmodified onto Manual Execution Results, and the basis for the Manual QA Report's Requirement Coverage.
  - name: coverage_report
    type: file_path
    required: true
    description: Approved Coverage Report — informs which test cases Test Design already excluded/dispositioned, so this skill doesn't attempt to execute what Stage 3 already marked out of scope.
  - name: selector_verification_kb
    type: file_path
    required: false
    description: Shared Selector Verification KB (pipeline.md §10.8), read-only — verified locators that disambiguate which control a test step means when a screen has several plausible candidates.
  - name: repair_kb
    type: file_path
    required: false
    description: Shared Repair KB (pipeline.md §10.8), read-only — known application/environment quirks, so a documented timing quirk is not mistaken for a new application defect.
  - name: project_context
    type: file_path
    required: true
    description: Target environment, credentials, and safety constraints.
outputs:
  - name: manual_execution_results
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionResults.md"
    description: Structured per-test-case results, Evidence Inventory, and full Result Classification.
  - name: manual_execution_summary
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionSummary.md"
    description: Consolidated run-level summary — what was executed, headline outcome figures, Known Limitations.
  - name: manual_test_results_csv
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualTestResults.csv"
    description: Machine-readable per-test-case results — one row per executed test case, for import into a test-management tool or spreadsheet.
  - name: manual_qa_report
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualQAReport.md"
    description: Stakeholder-facing Markdown QA report for this manual run — requirement coverage, outcome figures, defect register, and resolved assumptions. This stage's terminal deliverable.
  - name: manual_qa_report_html
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualQAReport.html"
    description: HTML companion of the Manual QA Report, in the platform's shared report design (§9.4, pipeline.md §17) — generated from ManualQAReport.report.json by report_builder. A rendering for stakeholders, never the approved artifact.
  - name: manual_execution_artifacts
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/artifacts/"
    description: Captured screenshots, videos, notes, and logs.
dependencies:
  - test-design-skill (upstream skill — supplies the approved test cases, traceability, and coverage)
  - Playwright MCP server (headed), for executing UI steps against the live environment
  - "NO downstream skill: this is the Manual branch's terminal stage (pipeline.md §3.3)"
---

> **Pipeline position:** Stage `4M` of the **Manual Execution Pipeline** — the branch's **terminal stage**. Consumes the approved Manual Test Suite, Requirement Traceability Matrix, and Coverage Report; produces Manual Execution Results, a Test Results CSV, and a stakeholder-facing Manual QA Report.
> **Traceability:** `Manual Test Case → Manual Execution Result → {CSV row, Defect Record, QA Report coverage figure}`.
> **Branch:** Manual only. **No downstream skill** — its reviewer is its consumer (`workflows_and_pipelines/pipeline/pipeline.md` §3.3). It never produces a script and never hands anything to the Automation branch.
>
> **Revision note (this revision, user-mandated):** the Manual and Automation pipelines now diverge completely after Stage 3. This stage is no longer Stage 4 of a single 7-stage chain feeding Automation: the **Automation Candidate Package is removed** along with its qualifying-criteria engine, because Automation (`4A`) now takes scope directly from the approved Stage 3 test cases and grounds its correctness in its own live selector verification (`pipeline.md` §3.3, §3.5). In exchange, this stage gained its own reporting: it **self-reports** a Manual QA Report and a Test Results CSV rather than handing off to the Reporting stage.
> **Revision history:** see `docs/CHANGELOG.md`.
>
> **Revision note (2026-07-27, user-mandated):** each artifact is **one file, edited in place**: no `.vN` suffixes, and **no duplicate "final" copy is ever written on approval**. Refinement edits the same file the reviewer read. Git is the version history. See `workflows_and_pipelines/pipeline/pipeline.md` §7.
>
> **Revision note (2026-10-08, user-mandated):** **editing in place never overwrites a recorded result** (`pipeline.md` §6 Rule 7b). A reviewer may have this stage correct an artifact's wording in place during its own review, but a recorded outcome (a result row, its status, its timestamps) and its evidence are never changed or deleted. **A re-run of cases** (e.g. `/manual-execution-skill re-run {IDs}`) **writes new files beside the originals** — `ManualExecutionResults.rerun-N.md`, `ManualTestResults.rerun-N.csv`, `ManualQAReport.rerun-N.md`, and `artifacts_rerun-N/` — following the existing `ExecutionResults.rerun-N.md` convention (`pipeline.md` §4, Stage `5H`). The first cycle stays exactly as recorded.
>
> **Revision note (2026-07-29, user-mandated):** **input paths only — this stage's outputs are unchanged.** Its test suites now resolve from the module workspace (`platform_core_data/modules/{module}/test_design/`) rather than a run folder, and its results continue to land in `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/`, immutable once written. That asymmetry is the point: a test suite is something the next run starts from, and a result is evidence of one execution (`pipeline.md` §7). **A multi-module run reads each module's suite and writes one consolidated result set**, with every result citing its module — splitting results per module would break the run's single record of what happened. This stage writes nothing under `modules/`.

# 1. Skill Name

**Manual Execution skill** — v1

# 2. Purpose

The Manual Execution skill runs the approved Manual Test Suite — exactly as the Test Design skill authored it — against a target environment, and produces a raw, unedited, structured record of what actually happened: pass/fail/blocked status, evidence, and failure detail, per test case. It exists to answer one question before any automation effort is spent: *does this manually-designed test case actually hold true against the live application, reliably?*

**Its second responsibility is to close out the delivery itself.** Because this is the Manual branch's terminal stage, it does not hand raw results to a reporting agent — it **self-reports**: a stakeholder-facing Manual QA Report (§9) and a machine-readable Test Results CSV (§9.2), both derived from the same per-test result set so they can never disagree.

## 2.1 What this skill never does

Three prohibitions define this stage's boundary:

1. **It never produces a script of any kind.** No Playwright spec, no page object, no fixture, no helper, no persisted driver script. A throwaway script written only to reach a screen is debug scaffolding, deleted after use, never an artifact (`pipeline.md` §11). If a deliverable would be a script, it belongs to Stage `4A` in the other branch.
2. **It never automates, and never decides what gets automated.** Automation scope is Stage `4A`'s own decision, taken from the approved Stage 3 test cases and its own live verification (`pipeline.md` §3.3). This stage produces **no Automation Candidate Package** — that artifact is removed from the platform.
3. **It never executes an automation suite.** Running generated code is Stage `5A`'s responsibility, in the other branch. The two never overlap: this stage executes manually-designed test cases by hand; `5A` executes automation code.

# 3. Responsibilities

- **Execute manual test cases generated by the Test Design skill** — exactly as authored (Steps, Test Data, Expected Result, per `.claude/skills/test-design-skill/SKILL.md` §6) — never inventing, skipping, or reinterpreting a step to make it easier to pass.
- **Validate preconditions before execution** (§5) — confirm the test case's stated Preconditions (login state, data state, role) actually hold before running its Steps; a test case whose preconditions cannot be met is `Blocked`, never force-run against an unmet precondition.
- **Execute tests on the target environment** named in the Project Context, driving the live application through the **Playwright MCP server, headed, not headless** (§11.1), so a human can watch each interaction happen live — confirming the target environment matches what the Project Context expects before running anything.
- **Record execution results** for every test case: Status, Execution Time, and, on failure/block, the specific step and observed-vs-expected discrepancy.
- **Capture execution evidence** (§7) — observed values for every case; screenshots only for defects (`pipeline.md` §11.4); videos, notes, and logs where applicable — and name explicitly what wasn't captured and why, never a silent gap. A `Passed` case with no screenshot is not a gap.
- **Classify every result** using exactly the Result Classification set (§8): Passed, Failed, Blocked, Skipped, Not Executed, Inconclusive.
- **Generate a Manual Execution Summary** — a run-level narrative and headline figures, distinct from the raw per-test Manual Execution Results.
- **Self-report the delivery** (§9) — produce a stakeholder-facing **Manual QA Report** (requirement coverage, outcome figures, defect register, resolved assumptions) and a **Manual Test Results CSV**, both derived from the same per-test result set.
- **Consult the shared Selector Verification KB and Repair KB, read-only** (§9.3, `pipeline.md` §10.8) — to disambiguate which control a step means, and to recognize a documented quirk rather than report it as a new defect.
- Never modify the approved Manual Test Suite, Traceability Matrix, or Coverage Report — a test case that appears wrong or outdated is escalated as a discrepancy for Stage 3 to address, never silently corrected here.
- **Never write to either shared Knowledge Base** — this stage is a reader only (`pipeline.md` §10.8 rule 2).
- **Never read, produce, or reference an Automation-branch artifact** (`pipeline.md` §3.3).
- Never execute a test case's mutating actions against an environment the Project Context has not explicitly marked safe for them.
- **Adapt execution strategy to the run's Run Scope and Run Type** (§17), consistent with the same Run Scope model every other stage uses.
- **Produce output conforming to the Standard Output Contract** (§10) so the Automation skill never has to interpret free-form prose to find what it needs.
- **Recognize named Stop Conditions** (§18) and, rather than halting the entire run over one blocked test case, recommend the smallest corrective action (§19) while continuing to execute every other unaffected test case.
- **Verify input completeness and delivery completeness** (§20) — confirm every input the Test Design skill's output provides is used correctly, and that every artifact this terminal stage owes its stakeholders is present and internally consistent.

# 4. Inputs

| Input | Role | Required? | Description |
|---|---|---|---|
| Manual Test Suite | **Primary** | Required, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_*.md` and `.xlsx` — the exact test cases to execute; this skill never adds, removes, or reinterprets a case. **Its scope is narrowed per case by the `Review` lifecycle gate (§4.1).** |
| Requirement Traceability Matrix | Secondary | Required, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md` — carried unmodified onto every Manual Execution Result, and the basis for the QA Report's Requirement Coverage (§9.1) |
| Coverage Report | Secondary | Required, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.md` — read for its Coverage Gaps (§18 of `.claude/skills/test-design-skill/SKILL.md`), so this stage does not attempt to execute what Stage 3 already dispositioned out of scope. Its *Review & Automation* roll-up (§18 #11 there) is **not** consumed here either — this stage reads each case's own `Review` column (§4.1), never a report's summary of it |
| Project Context | Governing | Required, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` — target environment, credentials, and safety constraints that govern which test cases' mutating actions may actually be executed |
| Run Scope | Governing (embedded) | Required | Not a separate file — the Type/Source recorded in the Project Context's own Scope Summary (`workflows_and_pipelines/pipeline/run_scope.md` §3–§4). Drives §17's strategy selection. |
| Selector Verification KB | Secondary (read-only) | Optional | `platform_core_data/knowledge_base/browser/screens/`, `.../components/` — verified locators (`pipeline.md` §10.8). Used only to identify *which control* a step refers to when a screen offers several plausible candidates; never to change what a step does. Where its code-state anchor shows drift, it is treated as a hint, not a fact. |
| Repair KB | Secondary (read-only) | Optional | `platform_core/knowledge/patterns/` + prior runs' Repair Summaries (`pipeline.md` §10.8). Used to recognize a **documented** application/environment quirk so it is not written up as a newly-discovered defect. A KB entry never suppresses a genuine finding — it is cited alongside it. |

**No Automation-branch artifact is an input.** This stage never reads an Automation Suite, Execution Result, or Repair Summary as a basis for its own execution (`pipeline.md` §3.3).

**Every input above must be in an `Approved` checkpoint state before this skill consumes it.** If any required input is still `Pending Review`, `Pending Automation Approval`, or `Rejected`, this skill halts and reports the blocking artifact rather than executing against a draft.

**This skill must never read the PRD directly** — only Stage 1 (Project Context skill) is permitted to, per `workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 4. A test case whose expected result appears wrong is a discrepancy to log against Test Design, never a reason to independently consult the PRD.

## 4.1 The `Review` Gate — which cases this stage may execute

*(Added 2026-08-01, user-mandated. Supersedes the earlier statement that Stage `4M` did not consume the lifecycle columns.)*

**This stage executes a test case only when its `Review` column reads `Approved`** (`test-design-skill` §6.3). Both branches now gate on `Review`; only the Automation branch additionally gates on `Automation`:

| Branch | Gate |
|---|---|
| Stage `4M` — Manual Execution | `Review = Approved` |
| Stage `4A` — Automation | `Review = Approved` **AND** `Automation = Approved` |

**Why the gate belongs here too.** Executing an unreviewed case spends a real tester's time, and real data on a shared environment, verifying an expectation nobody has accepted. Worse, when it fails, the result is ambiguous in the most expensive way: nobody can tell whether the application is wrong or the test case is. The reviewer's own words for the case that motivated this rule — *some of the test cases are wrong and I am still reviewing them* — describe exactly that ambiguity. `Review = Approved` is the statement "if this fails, the application is at fault", and without it a `Failed` result carries no information.

**`Automation` is never read by this stage.** `Automation = Approved` says a case *should also* be automated; it says nothing about whether it should be executed by hand, and `Automation = Rejected` does not remove a case from manual scope — it is the *reason* the case must be exercised manually. Reading it here would make an automation decision silently change manual coverage.

**The three values, and what each means for this stage:**

| `Review` | This stage |
|---|---|
| `Approved` | **Executes** the case normally |
| `Pending` | Does **not** execute it — records `Excluded` (§8) with reason `Pending Review` |
| `Rejected` | Does **not** execute it — records `Excluded` (§8) with reason `Rejected at Review` |

**An excluded case is still reported, never dropped.** It gets its row in the Results, in the CSV, and in the QA Report's totals (§9.2 #1). Silently narrowing the suite to the approved subset would let a run report "3 of 3 passed" while 48 cases went unexamined — a pass rate computed against a denominator the reader cannot see. `Excluded` exists as its own status precisely so "how much of the suite was authorized to run?" and "how much of what was authorized actually ran?" stay two separate, answerable questions.

**This gate is not a substitute for the Stage 3 checkpoint, and neither replaces the other.** They act at different grains: the artifact's `status:` header answers "may this suite be used at all?", while `Review` answers "is *this case* correct?" A suite whose header is `Pending Review` is not consumed regardless of how its columns read (§4's approval rule stands).

**The decision is read from the Markdown suite, which is authoritative** — not from the workbook. A reviewer who marked their decisions in the `.xlsx` must first move them into the Markdown with `cli.js --import-lifecycle` (`tools/test_suite_export/README.md`); until that runs, the workbook holds decisions the Markdown does not, and the next export would discard them. This stage never edits either file (§12 #8) — a scope that looks wrong is reported, not corrected here.


## 4.2 The Capability Gate — which cases this Supplier can run at all

*(Added 2026-09-27, user-mandated. `ndc_execution_rules.md` §A15.)*

**Suppliers differ in what they can do.** flynas has no Hold and no Pay after Hold; another Supplier
may sell no meals. Executing a Hold case against a Supplier that cannot hold produces a failure that
means only "this Supplier was never going to do this" — noise that buries the real findings and, worse,
makes a Supplier look worse than one whose suite happened to avoid its gaps.

**So this gate runs first, before the `Review` gate.** Three questions, in order, each answering
something the others cannot:

```text
Can this Supplier do it?   → §4.2   no  → Excluded — Not supported by supplier
Is this case approved?     → §4.1   no  → Excluded — Pending / Rejected at Review
Is this action allowed?    → §6.1   no  → Skipped — Execution Safety Policy
```

**The decision is computed, not interpreted.** This stage calls
`platform_core/tools/capability_gate/cli.js plan --run {{RUN_FOLDER}}` **before executing anything**,
which writes `runs/{{RUN_FOLDER}}/metadata/CapabilityPlan.md` — the same discipline as the Safety
Preflight (§6.1). What will run is known and recorded up front, not discovered case by case.

It reads two things, neither of which this stage may edit:

| | |
|---|---|
| What the Supplier can do | `supplier.json` → `capabilities` — `Hold`, `Pay after Hold`, `Meal`, `Baggage`, `Seat`, `Bundle`, each `Supported` / `Not Supported` / `Unknown`, recorded at intake (`new_us_intake.md` §12.2) |
| What the case needs | the case's own `Requires` and `Supplier Rule` columns (`test-design-skill` §6.1) |

**`Unknown` is treated as `Not Supported`.** Nothing is guessed from a Supplier's name, from another
Supplier, or from what a screen happens to show on one flight. A capability left `Unknown` silently
narrows the run, which is why intake asks for it explicitly.

**An excluded case is reported, never dropped** — the same rule §4.1 already applies. It keeps its row
in the Results, the CSV and the QA Report with status `Excluded` and reason `Not supported by
supplier`, and it stays **out of executable scope and out of the pass rate**. A Supplier that cannot
hold is not penalised for Hold cases it could never run, and a reader can still see exactly which
cases those were and why.

**This gate never reclassifies a result.** It decides what runs; it does not turn a genuine `Failed`
into an exclusion. A case that ran and failed stays `Failed` whatever its `Requires` says.

**On a classic (non-Supplier) run this gate does not apply** — there is no Supplier, so every case
passes it. It is keyed on the run's `scopeFamily === "supplier-feature"`, exactly as §A of
`ndc_execution_rules.md` is, and never on a folder name or the word "supplier" in a User Story.

## 4.1 The Application Context — this stage closes its cycle

*(Added 2026-08-18, user-mandated.)*

`platform_core_data/modules/ApplicationContext.md` is refreshed to `Draft` by Stage 1 when a run begins, and appended to by any stage that **proves** a cross-module dependency, records a new cross-module rule, or changes an end-to-end journey's coverage ([`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §6.7).

**This stage is the branch's terminal stage, so it is where that cycle closes.** Before this stage reports itself complete it must:

1. **Append what this run changed about the relationships between modules** — a dependency proven rather than assumed, an E2E journey whose coverage moved, a cross-module rule now recorded in `knowledge/INDEX.md`. Nothing that belongs to one module goes in; that is its governing rule.
2. **Present the diff for approval** — what changed since the last `Approved` revision, and what did not.
3. **Set its status to `Pending Review`.**

**This stage never sets it to `Approved`.** That is a human's decision, exactly like every other gate (`pipeline.md` §5). Until a human approves it, the file is not final — and the next run reopens it as `Draft` regardless.

**If nothing cross-module changed, say so and leave it alone.** A run that taught the application map nothing is a normal outcome; an edit invented to look productive is worse than no edit, because the next reader cannot tell which lines were learned and which were filler.


# 5. Precondition Validation

Before executing a test case's Steps, this skill confirms its stated Preconditions (§6 of `.claude/skills/test-design-skill/SKILL.md` — login state, data state, role) actually hold in the target environment:

- If a precondition can be established directly (e.g., logging in as the stated role) as part of ordinary setup, this skill does so and proceeds.
- If a precondition cannot be established — required seed data is absent, a prior test case in a dependent chain hasn't run, the stated role/credential doesn't exist in this environment — the test case is classified `Blocked` (§8), never force-run against an unmet precondition and never silently marked `Skipped` instead (Blocked and Skipped are distinct, per §8).

# 6. Environment Awareness

This skill confirms the target environment matches what the Project Context expects before executing anything — the same environment-match discipline every execution-capable stage in this pipeline applies (`.claude/skills/automation-execution-skill/SKILL.md` §14). It never executes a test case's mutating actions against an environment not authorized for them; an unauthorized mutating action is `Skipped`, with the reason named.

**Which actions are authorized is no longer this skill's judgment to make** (revised 2026-08-07). It is decided by the Execution Safety policy, evaluated deterministically — see §6.1.

## 6.1 The Execution Safety Gate — which *actions* this stage may perform

*(Added 2026-08-07, user-mandated.)*

§4.1's `Review` gate decides which **test cases** this stage may execute. This section decides which **actions** it may perform once it starts executing one. They are different questions and neither substitutes for the other.

```text
Review = Approved
        ↓
Test case is eligible                    ← §4.1
        ↓
next step
        ↓
Read-only?
   Yes → execute
   No  → Execution Safety evaluation     ← this section
        ↓
Allowed            → execute
Approval Required  → PAUSE BEFORE THE MUTATION, ask, execute only within the approved scope
Forbidden          → do not execute
```

**Capability does not imply authorization.** That the UI exposes Delete, and that the run's credential can Approve, are facts about capability. Neither is a permission. `Review = Approved` says the *test case* is correct; it says nothing about whether its operations may run against this environment today.

**The decision is not interpreted from prose.** This skill calls `platform_core/tools/execution_safety/` and uses what it returns. It does not read `run_configuration.md`'s Environment Constraints and decide for itself what "marked safe" means — two skills reading the same sentence is how two stages reach different conclusions about the same action.

**Before executing anything, this skill runs the Safety Preflight** — record it with `node platform_core/tools/run_manager/cli.js state preflight 4M --environment <env> --target-url <url> --execution-type <browser|api|database|batch|other> [--execution-mode Headed|Headless] --operations <ops.json> --confirmed-by "<name>"` **before** `state start 4M` — the Run Manager writes `metadata/SafetyPreflight.md` itself and its entry gate refuses to start 4M without a confirmed, current preflight (Phase 9.2/9.3; never hand-write that file) — and resolves every required authorization **first**. Discovering that step 7 of case 12 is `Forbidden` when step 7 of case 12 is attempted is too late to be useful to anyone.

**Approvals are batched by scope, never asked per test case.** Twelve cases that all perform `UPDATE` on `Shared` `agency` records are **one** question (`execution_safety` README §7). Asking twelve times trains a reviewer to stop reading them.

**Each authorization is scoped to this run** — environment, module, action, ownership class. It carries to no other run, and it never lifts a `Forbidden`.

**Every executed mutating action records the record it touched.** The approval is class-wide; the audit trail is per-record. Without a captured identifier, a later action cannot prove it acted within the approved scope.

**A blocked action is recorded, never silently dropped:**

| Safety decision | This stage records |
|---|---|
| `Allowed` | executes normally |
| `Approval Required`, authorization granted | executes normally; the authorization ID is recorded with the result |
| `Approval Required`, authorization refused | `Skipped` (§8), reason **`Execution Safety Policy`** |
| `Forbidden` | `Skipped` (§8), reason **`Execution Safety Policy`**, with the matched rule named |

**A safety block is never an Application Failure.** Nothing in the application misbehaved; the platform declined to act. Reporting it as `Failed` would manufacture a defect out of a governance decision. `Skipped` is the existing status for "a decision, not a failure" (§8), and it is reused rather than extended.

**`Skipped` for safety is distinct from `Excluded` for review** — and the distinction is the same load-bearing one §8 already draws. `Excluded` means the case was never authorized to run. `Skipped` means it was authorized, and this stage declined to perform an operation inside it. Both appear in every total.

**Where the policy itself is missing or malformed, this skill halts** (§18) rather than proceeding. An absent policy authorizes nothing; it does not mean everything is permitted.

# 7. Evidence Collection

For every executed test case, this skill captures, wherever applicable, and names explicitly what wasn't captured and why:

| Evidence Type | When applicable |
|---|---|
| Screenshots | **Only for a defect** — a `Failed`, `Blocked`, or `Inconclusive` case, or an observation that becomes a defect or an Open Question (`pipeline.md` §11.4). **Never for a `Passed` case, a navigation step, or a "key step."** Saved to `artifacts/` and cited by path — not opened back into context unless a visual-only defect (layout, overlap, truncation) cannot be judged from the page text |
| Observed results (text), by test type | **Every case — and all a `Passed` case needs.** Follows the test type (`pipeline.md` §11.4): UI — the values the page showed (labels, amounts, totals, statuses, messages); API — request and response (status, asserted fields); DB — the query and the asserted rows/fields; integration — the compared values from each side. Secrets redacted. **Recorded per assertion, as proof it was validated** (`pipeline.md` §11.4): Assertion · Expected (from the test case, not from what was seen) · Actual · Check (`equals`, `contains`, `within ±N`, …) · Result. Every assertion gets a row; one that could not be checked makes the case `Inconclusive`, never `Passed` |
| Videos | Where the environment/tooling supports session recording |
| Notes | Free-text observations a screenshot alone doesn't capture — e.g., a subjective UI judgment, timing behavior, or an ambiguity worth flagging to Test Design |
| Logs | Console/network logs, where the target application and tooling expose them |

Evidence is stored under `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/artifacts/` and referenced by path from the Manual Execution Results' Evidence Inventory (§10).

# 8. Result Classification

Every test case executed gets exactly one classification:

| Status | Meaning |
|---|---|
| **Passed** | The test case executed and its Expected Result was observed exactly as stated — **every** assertion recorded with its Expected, Actual, Check, and Result (§7, `pipeline.md` §11.4). A case with any assertion left unchecked is `Inconclusive`. The rows go in the results file's **§3.1 Assertion Records** table; the Run Manager counts a `Passed` without verified rows as `Unverified` (Phase 5.6B). Expected values are checked against the suite version this stage consumed; quote them from the test case, or cite a consumed artifact by path — an external source cannot be version-verified (Phase 5.7). When the case states its assertions (its **Assertions:** table), record **every** assertion once against its **Assertion ID**, with the approved Expected and Check unchanged, the observed Actual, and the Result — a case is `Passed` only when all of them pass; a missing one is reported as missing, never as passed (Phase 5.8). A case that cites a Shared Definition (`SETUP-n`, `VR-n` — test-design-skill §6.1b) is executed with the cited text from the same suite file; the definition adds steps, never assertions — results are still recorded per Assertion ID. |
| **Failed** | The test case executed and the observed result did not match the Expected Result — a genuine, reproducible discrepancy. |
| **Blocked** | A stated Precondition (§5) could not be established — distinct from Skipped (a deliberate decision) and from Failed (it ran and didn't pass). |
| **Skipped** | The test case was deliberately not executed (e.g., its mutating action is not authorized for this environment, per §6) — a decision, not a failure. |
| **Not Executed** | The test case was in scope but the run ended (time limit, environment failure, manual stop) before reaching it. |
| **Inconclusive** | The test case was executed but produced a result this skill cannot confidently classify as Passed or Failed (e.g., a genuinely ambiguous UI state) — reported as such, never forced into Passed or Failed. |
| **Excluded** | *(Added 2026-08-01; extended 2026-09-27.)* The test case was **never in the executable set**. The reason is mandatory and is exactly one of `Pending Review`, `Rejected at Review` (§4.1), or `Not supported by supplier` (§4.2). |

**`Excluded` is deliberately not `Skipped`, and the distinction is load-bearing.** `Skipped` means a case that *was* authorized and that this stage decided, at execution time, not to run — an unauthorized mutating action on a shared environment, say. `Excluded` means the case was never in the executable set to begin with. Collapsing them makes the one question a reviewer most needs answered — *how much of the approved suite did we actually get through?* — impossible to compute, because the denominator would silently mix "you told me not to run this" with "I chose not to run this."

**Every non-Passed result carries its reason** in the Manual Execution Results (§10) and in its CSV row (§9.2) — a status is never recorded without the reason that produced it.

**Two denominators, always reported separately** (§9.1, §9.2, §21):

```
Suite total      = every case in the module's suite
Executable scope = cases with Review = Approved      ← the pass rate's denominator
Excluded         = Suite total − Executable scope
```

A pass rate quoted against the suite total understates the run; quoted against the suite total *without saying so* it overstates coverage. Both figures appear, always.

# 9. Self-Reporting — the Manual branch's terminal deliverables

**Because this stage is terminal (`pipeline.md` §3.3), it reports its own results.** There is no Reporting stage downstream: the Reporting skill (`6A`) serves the Automation branch and consumes automation Execution Results, not manual ones. A run that took only the Manual branch therefore has no Final QA Report, and that is correct rather than a gap.

Three artifacts are produced from **one** underlying per-test result set:

| Artifact | Audience | Purpose |
|---|---|---|
| **Manual Execution Results** (§10) | QA reviewer at the `4M` checkpoint | The raw, complete, per-test record — every status, evidence reference, and full defect write-up |
| **Manual Test Results CSV** (§9.2) | Tooling / test-management import / spreadsheet | One row per executed test case, machine-readable |
| **Manual QA Report** (§9.1) | Stakeholders | The readable delivery: coverage against requirements, outcome figures, defect register, limitations |

**One result set, three renderings — they must never disagree.** The Results document is authored first and is authoritative; the CSV and QA Report are derived from it. A status corrected in the Results is corrected in all three, in the same pass. A figure in the QA Report that cannot be recomputed from the Results is a defect in this stage's output, not a rounding difference.

## 9.1 Manual QA Report

The stakeholder-facing Markdown report contains, at minimum:

| # | Section | Must contain |
|---|---|---|
| 1 | **Run Identification** | Run folder, Run Scope/Run Type (§17), target environment, execution window, who/what executed it |
| 2 | **Executive Summary** | What was validated and the headline outcome, in plain language a non-QA stakeholder can act on |
| 3 | **Outcome Figures** | Counts and rates for all seven statuses (§8) — never a bare pass/fail split — against BOTH denominators: executable scope and suite total (§4.1) |
| 4 | **Requirement Coverage** | Per requirement from the Traceability Matrix: which test cases covered it, and its resolved verification state (verified / failed / not verified, with the reason) |
| 5 | **Defect Register** | Every `Failed`/`Inconclusive` case as a table row — ID, title, severity, priority, category — each linking to its full §10.1 write-up in the Results |
| 6 | **Assumptions & Risks Resolved** | Every Test Design "Assumption-based test" tag carried to a resolved state (confirmed / refuted / unverified) |
| 7 | **Known Limitations** | What this run could not verify and why — Blocked preconditions, Skipped mutating actions, a human-chosen headless run (§11.1) |
| 8 | **Recommendations** | The smallest corrective action per blocked/failed item (§19) |

**Coverage is computed from the Traceability Matrix, never asserted.** A requirement with no executed test case is reported as *not verified*, never omitted — an absent row reads as "nothing to say," which is the opposite of the truth.

**It reports manual coverage only.** It never states or implies anything about automation coverage, even where the Automation branch also ran for the same scope — cross-branch comparison is a human's synthesis across two independent deliveries, not a claim either branch makes about the other.

## 9.2 Manual Test Results CSV

One row per executed test case, written to `ManualTestResults.csv`. The column set is fixed so an import mapping written once keeps working:

```
Test Case ID, Module, Title, Requirement ID(s), Run Scope, Status, Execution Time,
Executed At, Environment, Failed Step, Severity, Priority, Defect Category,
Reproducibility, Evidence Paths, Notes
```

Rules:

1. **One row per test case in the SUITE** — including every `Blocked`, `Skipped`, `Not Executed`, and `Excluded` case. Emitting only executed rows silently shrinks the denominator and overstates the pass rate. An `Excluded` case is emitted for the same reason: a reader filtering the CSV must be able to see that 48 cases were never authorized, not infer it from a missing row.
2. **`Status` uses exactly the seven §8 values**, unabbreviated — never a collapsed pass/fail. `Excluded` rows carry their `Pending Review` / `Rejected at Review` reason in `Notes` and leave every execution column (`Execution Time`, `Failed Step`, evidence) empty, since nothing ran.
3. **Defect columns are populated only for `Failed`/`Inconclusive`** rows, and empty (not `N/A`, not `0`) elsewhere, so a spreadsheet filter behaves predictably.
4. **`Evidence Paths` is a semicolon-separated list of run-relative paths**, resolvable from the run folder without editing.
5. **Standard CSV quoting** — UTF-8, fields containing a comma/quote/newline are double-quoted with internal quotes doubled. A defect summary containing a comma is a routine case, not an edge case.
6. **The CSV is generated, never hand-maintained.** Re-derive it after any correction to the Results rather than editing the row.

## 9.3 Using the shared Knowledge Bases (read-only)

Per `pipeline.md` §10.8, this stage **reads** both shared KBs and **writes to neither**:

- **Selector Verification KB** — where a step says "click Submit" and the screen has several plausible submit controls, a verified locator record identifies which control the automation branch confirmed, so both branches exercise the same control. It never changes what a step does or what it expects.
- **Repair KB** — where a documented quirk exists (a known redirect delay, a known environment timing behaviour), it is recognized and **cited alongside** the observation rather than mistaken for a newly-discovered application defect.

**A KB entry never suppresses a finding.** If observed behaviour is wrong, it is reported as wrong even when a KB entry explains why it happens. The entry adds context to the write-up; it never converts a defect into a non-event. Where a KB record's code-state anchor shows drift (`run_manager.md` §5.8), it is treated as an unverified hint.

## 9.4 Manual QA Report — HTML companion (`pipeline.md` §17)

The Markdown QA Report (§9.1) is **also published in the platform's shared HTML report design**, generated by `platform_core/tools/report_builder`. Three files, same folder:

```
{{RUN_FOLDER}}/manual_execution/ManualQAReport.md            # the artifact — authoritative, approved, traced
{{RUN_FOLDER}}/manual_execution/ManualQAReport.report.json   # the report model
{{RUN_FOLDER}}/manual_execution/ManualQAReport.html          # generated — never hand-edited
```

```bash
node platform_core/tools/report_builder/cli.js validate --model {{RUN_FOLDER}}/manual_execution/ManualQAReport.report.json
node platform_core/tools/report_builder/cli.js build    --model {{RUN_FOLDER}}/manual_execution/ManualQAReport.report.json
```

`validate` first; it exits `2` and names the exact path that is wrong. Surface its message unchanged. Model reference: `platform_core/tools/report_builder/README.md`.

**The HTML never replaces the Markdown.** The Markdown is the approved artifact, the one the Traceability Chain runs through, and the one a reviewer approves. The HTML is a second rendering of the same content for stakeholders — never approved, never versioned, never read as input by any stage. **Rebuild it after every in-place correction to the Results or the Report** (`pipeline.md` §7), or the two disagree and the Markdown is the one that is right.

### 9.4.1 Mapping this stage onto the model

**Statuses — declare all seven of §8, never a collapsed pass/fail:**

```jsonc
"statuses": [
  { "key": "Passed",       "label": "Passed",       "tone": "pass"    },
  { "key": "Failed",       "label": "Failed",       "tone": "fail"    },
  { "key": "Blocked",      "label": "Blocked",      "tone": "blocked" },
  { "key": "Skipped",      "label": "Skipped",      "tone": "warning" },
  { "key": "Not Executed", "label": "Not Executed", "tone": "neutral" },
  { "key": "Inconclusive", "label": "Inconclusive", "tone": "accent"  },
  { "key": "Excluded",     "label": "Excluded",     "tone": "neutral" }
]
```

A result whose status is not declared is a validation error, which is the point — §8's classification must survive into the report intact, and a typo that quietly merged `Skipped` into `Excluded` would destroy the distinction §8 calls load-bearing.

**Both denominators (§8) must be visible, exactly as in the Markdown.** The donut and the stat cards are computed over the executable scope; set `summary.total` to the **suite total** and say which is which in the labels, so the page cannot be read as claiming a pass rate against the full suite:

```jsonc
"summary": {
  "total": 60, "totalLabel": "Suite Total",
  "donut": { "focus": "Passed", "label": "pass rate (executable scope)" }
}
```

**Every result appears — including `Blocked`, `Skipped`, `Not Executed`, and `Excluded`**, for the §9.2 reason: an omitted case silently shrinks the denominator. An `Excluded` case carries its mandatory `Pending Review` / `Rejected at Review` reason in a row and leaves its execution rows empty.

**Every non-Passed case carries its reason in a row**, never a bare status.

**Each `Failed`/`Inconclusive` case gets a `findings` item** carrying its §10.1 defect write-up — the paste-ready record, not a one-line summary. The Defect Register (§9.1 section 5) is that findings section; its badge counts are the register's counts.

**Evidence (§7) goes in each case's `evidence`**, with the run-relative paths from the Evidence Inventory, and a stated reason wherever a gap exists.

**Known Limitations and Recommendations (§9.1 sections 7–8) become `notes` sections**, and requirement coverage that resolved to *not verified* is reported there rather than omitted.

**Redaction:** any captured header holding a credential or token is emitted with `"redacted": true`, never with a hand-typed placeholder. §6.1's Execution Safety Gate governs what may be captured at all; this governs how what *was* captured reaches a page that leaves the repository.

**Captured application output goes through `text`, never `html`** — a response body, a UI message, and anything a tester typed are escaped. `html` is only for markup this stage generated itself.

# 10. Standard Output Contract

The Manual Execution Results, Manual Execution Summary, and Manual QA Report must together contain exactly these sections, so a reviewer and a stakeholder each find what they need without reading the other's artifact:

| # | Section | Artifact | Must contain, at minimum |
|---|---|---|---|
| 1 | **Execution Metadata** | Results | Execution ID, Run Scope/Run Type (§17), environment, timestamps |
| 2 | **Execution Summary** | Summary | One-paragraph narrative: what was executed, overall outcome, and headline figures across all seven statuses (§8), stating the executable scope the figures are against (§4.1) |
| 3 | **Per-Test Results** | Results | Test Case ID, Status (§8), Execution Time, Evidence Inventory references, failure/block detail where applicable — every `Failed`/`Inconclusive` case follows the Defect Documentation Standard (§10.1) in full, not a one-line summary |
| 4 | **Evidence Inventory** | Results | Every evidence type captured (§7), per test case, with paths, and every gap with a reason |
| 5 | **Delivery Artifacts** | Summary | Confirmation that the CSV (§9.2), the Manual QA Report (§9.1), and its HTML companion (§9.4) were produced, and that all four renderings agree on every test case's status |
| 6 | **Known Limitations** | Summary | Anything this execution could not fully verify (e.g., a Blocked precondition, a Skipped mutating action) and why |
| 7 | **Recommendations** | Summary | The corrective actions recommended per §19 for any blocked/failed item |
| 8 | **Delivery Completeness** | Summary | The §20 checklist: every input consumed correctly, and every terminal deliverable present and internally consistent. **No handoff section** — this stage hands off to nobody (`pipeline.md` §3.3) |

## 10.1 Defect Documentation Standard (Failed / Inconclusive test cases)

**Per explicit user instruction (2026-07-25):** every `Failed` or `Inconclusive` test case's entry in the Per-Test Results (§10 #3) must be written to this standard — professional, complete-sentence, ready to paste directly into Jira/Azure DevOps without further editing. A one-line "expected: X, actual: Y" note is never sufficient for a non-Passed result.

**Required sections, in this order, for every Failed/Inconclusive test case:**

1. **Test Case ID**
2. **Execution Status** (§8's classification)
3. **Execution Time**
4. **Preconditions** (if relevant to how the defect manifested)
5. **Test Data**
6. **Steps Performed** (brief — the actual sequence executed, not the Test Design steps restated verbatim)
7. **Expected Result** — a complete, professional statement naming the requirement/business rule that should have governed the outcome, not a fragment. ("Blocked" alone is insufficient — state *why* it should be blocked.)
8. **Actual Result** — a complete, professional statement of what was actually observed, including the specific condition that let the actual behavior occur.
9. **Impact** — the concrete user/business consequence (see Business Impact below).
10. **Classification** (see Classification below) — Category, Layer, Reproducibility, Regression, Suspected Component, Confidence.
11. **Root Cause Analysis** (when it can be reasonably inferred from what was observed) — a plausible implementation explanation, always hedged (see Root Cause below). Omit this section entirely, rather than guessing, when no reasonable inference is possible from what was observed.
12. **Conclusion** — a concise statement of the actual defect, not a repetition of the execution result.
13. **Severity** (Critical/High/Medium/Low) with a one-line justification.
14. **Priority** (P0/P1/P2/P3).
15. **Evidence** — file references per §7/§10 #4.

**Defect writing guidelines — do not simply state what happened. Explain:**
1. What business rule or requirement is being violated.
2. Why the observed behavior is incorrect.
3. Under which conditions the issue occurs (if the defect is conditional, state the conditions explicitly — never imply it's unconditional when it isn't).
4. The user/business impact.
5. Whether the issue is a UI problem, validation problem, business logic issue, workflow issue, security issue, data integrity issue, or documentation mismatch — classify it explicitly.

**Expected vs. Actual — write as complete professional statements, not fragments.**

Bad: `Expected: blocked. Actual: submitted.`

Good:
> **Expected Result:** The system should prevent submission because the Product Access section contains mandatory fields, and at least one Product Access configuration is required before creating an Agency.
>
> **Actual Result:** The Agency was successfully created even though no Product Access entry was added. Validation was not triggered because the entire Product Access section was skipped.

**Classification — a fixed six-field block, always present, even when a field's honest answer is "Unknown" or "Not applicable."** Never omit a field to avoid an uncertain answer — an honest "Unknown" is correct output, a missing field is not.

| Field | Values | Guidance |
|---|---|---|
| **Category** | Validation / UI / Workflow / Authorization / Business Rule / Data Integrity / Performance / Security | The technical nature of the defect. Prefer the most mechanically precise category over the broadest applicable one — e.g. a missing "at least one required" check is `Validation` even though the underlying rule is a business rule; a decision-reversal path that shouldn't exist is `Workflow`, not `Validation`. |
| **Layer** | Frontend / Backend / API / Database / Integration / Unknown | Where the defect is suspected to live, based only on what was actually observed (e.g., a client-side condition that never fired vs. a value that round-tripped to the backend and was persisted). Use `Unknown` rather than guessing when the evidence doesn't distinguish layers. |
| **Reproducibility** | Always / Intermittent / Unable to confirm | Based strictly on how many times this run actually observed the behavior — `Always` requires at least two independent observations agreeing; a single observation is `Unable to confirm`, not `Always`. |
| **Regression** | Yes / No / Unknown | Whether this behavior is newly broken vs. a prior confirmed-working state. Default to `Unknown` unless a prior run's Discovery/execution evidence directly establishes the behavior once worked differently — never infer regression status from absence of prior testing. |
| **Suspected Component** | Free text, or "N/A" | Name the specific screen/form/control/service suspected, when inferable from what was observed (e.g., "Add/Update Agency form's Product Access FormArray validator"). Use "N/A" when no component can be responsibly named — never invent a component name to fill the field. |
| **Confidence** | High / Medium / Low | Confidence in the *defect's existence* as observed (not in the Root Cause guess, which is separately hedged) — `High` when multiple independent observations agree and the observed behavior itself is unambiguous; `Low` when the finding rests on a single observation, an inference from a different test case, or a test-execution limitation muddied the result (as with an Inconclusive case). |

For an **Inconclusive** case where no defect was actually confirmed, most Classification fields should honestly read "Not applicable" / "Unable to confirm" / "Unknown" / "N/A" rather than being framed as if a defect were confirmed — see `TC-AGENCY-CREATE-032` in `runs/RUN-20260725-001/manual_execution/ManualExecutionResults_Agency.md` §2.2 for a worked example.

**Root Cause Analysis — infer the likely implementation issue whenever possible, but never present an assumption as a fact.** Use hedging language explicitly: *Likely*, *Appears to*, *Based on the observed behavior*. Example: "Likely validation is executed only after a Product Access row is created, while no validation exists for an entirely empty Product Access collection."

**Impact — always explain why the issue matters**, e.g.: users can create invalid Agency configurations; required business rules are bypassed; invalid data may reach downstream workflows; the approval workflow becomes inconsistent; security restrictions can be bypassed.

**Severity — recommend a severity with a short justification**, e.g.: "Severity: High. Reason: Mandatory validation can be bypassed, allowing invalid Agency configurations to be persisted."

**Conclusion — end every Failed/Inconclusive entry with a concise statement of the actual defect**, distinct from and beyond a restatement of the execution result.

**General writing rules:** clear professional English, complete sentences, no vague wording, no repeated information across sections, facts clearly separated from assumptions (via the hedging language above), and application defects explicitly distinguished from documentation gaps and test-data issues — a Test Design AC that turns out to be wrong is a documentation gap, not an application defect, and must be labeled as such rather than folded into the same defect narrative.

# 11. Allowed Tools

- **The `playwright` MCP server, run headed** (§11.1) — the execution mechanism for this stage. It drives the live application through Test Design's authored Steps so a human can watch each interaction happen. A credential value is **never** typed into an MCP tool call (`platform_core/tools/mcp/README.md` §1.3): authenticate through the platform's credential contract, then execute the remaining Steps against that authenticated session. Every executed test case records which mechanism produced its evidence.
- File tools: Read (Manual Test Suite, Traceability Matrix, Coverage Report, Project Context, both shared KBs read-only), Write (Manual Execution Results, Manual Execution Summary, Manual Test Results CSV, Manual QA Report, evidence files).

**Not permitted:**
- **Writing or editing automation code, or a script of any kind** (§2.1) — including a persisted "helper" or driver script. A throwaway script used to reach a screen is deleted after use and never becomes an artifact (`pipeline.md` §11).
- **Executing an already-generated Automation Package** — that is Stage `5A`'s responsibility, in the other branch.
- **Writing to the Selector Verification KB or Repair KB** — this stage is a reader only (`pipeline.md` §10.8 rule 2).
- Editing the Manual Test Suite / Traceability Matrix / Coverage Report / Project Context / PRD.
- Executing any test case's mutating actions against an environment not explicitly marked safe for them.

## 11.1 Headed Browser — Required for This Skill

> **Revision (2026-08-17, user-mandated):** headed remains this skill's *expected* answer, but it is no longer assumed. `pipeline.md` §6 Rule 11 requires the mode to be **confirmed with the human immediately before every execution**, including this one. Ask, state that headed is the norm here and why, and wait for the explicit answer. The one case that used to be handled silently — headed unavailable, so proceed headless — is now surfaced in the same question rather than discovered mid-run.

**This skill runs the browser headed (visible), not headless.** It is the deliberate exception to the platform-wide headless default, and the one place the two branches differ in tooling posture (`pipeline.md` §3.4): the Automation branch runs headless for speed and repeatability, while this stage runs headed because a human watching *is* the point. This stage exists so a person can watch authored Steps execute against the live application and judge, in real time, whether observed behaviour matches the Expected Result — including timing, transient, and visual-state behaviour (§7's "Notes" evidence type) that a post-hoc screenshot does not preserve. A headless run would produce the same files while removing the live observation the stage is designed around.

**How to run headed, per mechanism:**

| Mechanism | How to run headed |
|---|---|
| **`playwright` MCP server** | The server must be started **without** the `--headless` flag for this stage. Where the repo-root `.mcp.json` hard-codes `--headless`, a tool call cannot override it at runtime — a headed run requires a human operator to remove that flag and restart the server. **This skill must never edit `.mcp.json` itself** (outside its write scope, §11). |
| **`playwright` MCP server** (fallback only, per §11) | The server is registered in the repo-root `.mcp.json` with a hard-coded `--headless` flag, which a tool call cannot override at runtime. A headed MCP run therefore requires a human operator to remove `--headless` from `.mcp.json` and restart the MCP server. This skill must not edit `.mcp.json` itself — that file is outside this skill's write scope (§11 "Not permitted"). |

**When headed is genuinely unavailable** — no display/session is attached (a CI runner, a headless container), or the operator has not removed `--headless` — this skill never switches to headless on its own *(revised 2026-10-08, `pipeline.md` §6 Rule 11)*. It says headed is unavailable and why, inside the Headed/Headless question, and runs headless only if the human explicitly chooses it. If headed was already chosen and turns out to be unavailable when the browser opens, it stops and asks again. When the human chooses headless, record it in the Execution Metadata (§10 #1) and in Known Limitations (§10 #6), naming why. Evidence capture is unaffected either way (screenshots, DOM, console, and network are captured identically), so a headless run changes no result's Status (§8) — the only thing lost is live human observation, which is exactly what the Known Limitations entry must say.

# 12. Execution Rules

1. Must execute test cases exactly as the Test Design skill authored them — no invented, skipped, or reinterpreted steps.
2. **Must validate every stated Precondition before executing a test case's Steps** (§5) — an unmet precondition is `Blocked`, never force-run.
3. Must confirm the target environment matches the Project Context before executing anything; halt and report on mismatch.
4. **Must evaluate every mutating action against the Execution Safety policy before performing it** (§6.1), through `platform_core/tools/execution_safety/` — never by interpreting the constraint prose itself. `Forbidden` is not executed; `Approval Required` pauses **before** the mutation and waits for a scoped human authorization. A blocked action is `Skipped` with reason `Execution Safety Policy` and the matched rule named — never `Failed`, and never an Application/Automation/Environment Failure.
4a. **Must record the Safety Preflight before executing anything** (§6.1) with `state preflight 4M … --confirmed-by "<name>"` — never by writing a file — and resolve every required authorization up front — never discover a `Forbidden` by attempting it.
4b. **Must record the exact record touched by every mutating action** (§6.1). The authorization is class-scoped; the evidence is per-record, and without it a later action cannot prove it stayed inside the approved scope.
4c. **Must never treat a test case's `Review`/`Automation` values as an execution authorization, or a safety `Allowed` as test-case eligibility** (§4.1, §6.1). Three independent gates; none substitutes for another.
5. Must record every test case's outcome — no silent omissions. A test case that cannot run must be logged with an explicit reason.
6. **Must classify every result using the full seven-state Result Classification** (§8) — never collapse Blocked/Skipped/Not Executed/Inconclusive/Excluded into a bare Pass/Fail.
7. **Must produce a structured Evidence Inventory** (§7, §10) naming every evidence type captured and every one that could not be, with a reason.
8. Must never modify the Manual Test Suite, Traceability Matrix, or Coverage Report — a test case that appears wrong is escalated as a discrepancy for Stage 3, never silently corrected here.
9. **Must self-report the delivery in full** (§9) — the Manual Execution Results, the Manual Test Results CSV, and the Manual QA Report, all three derived from one result set and agreeing on every test case's status.
10. **Must never produce a script, an Automation Candidate Package, or any Automation-branch artifact** (§2.1, `pipeline.md` §3.3), and must never write to either shared Knowledge Base (§9.3).
11. Must timestamp and uniquely identify each run so results are never ambiguous about which execution they came from.
12. **Must select the Execution Strategy matching this run's Run Scope and Run Type** (§17) — never apply one default "execute everything" behavior regardless of scope.
13. **Must produce output conforming to the Standard Output Contract** (§10).
14. **Must recognize the named Stop Conditions** (§18) and, for any condition with a Local scope, continue executing every other unaffected test case rather than halting the whole run — and must recommend the smallest corrective action for every blocked/failed item (§19).
15. **Must verify Handoff completeness in both directions** (§20) before treating a run's outputs as finished.
16. Must never execute an automated test suite or write automation code — that is exclusively the Automation skill's (generation) and Automation Execution skill's (running) responsibility.
17. **Must never read the PRD directly.** Only Stage 1 may do so (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 4).
18. **Must never consume an input artifact that is not itself `Approved`** at its own pipeline checkpoint (§4).
19. **Must recommend headed, so each interaction is visible live, and must confirm the mode with the human before every execution** (§11.1, `pipeline.md` §6 Rule 11). Where headed is genuinely unavailable (no display attached, or `--headless` not removed by an operator), say so in the question and run headless only on the human's explicit choice — never as a silent fallback — then state it in Execution Metadata (§10 #1) and Known Limitations (§10 #6).
20. **Must compute the QA Report's coverage from the Traceability Matrix**, reporting an uncovered requirement as *not verified* rather than omitting it (§9.1).
21. **Must emit one CSV row per test case in the suite**, including Blocked/Skipped/Not Executed/Excluded, so the pass rate is never computed against a silently shrunken denominator (§9.2).
22. **Must execute only test cases whose `Review` column reads `Approved`** (§4.1). A `Pending` or `Rejected` case is recorded `Excluded` with its reason and is never executed "just to see" — an unreviewed case's failure cannot distinguish an application defect from a defective test case. The `Automation` column is never read by this stage.
23. **Must report the two denominators separately** (§8, §9.1, §21) — suite total and executable scope. A pass rate stated without naming which denominator produced it is not a valid figure.
24. **Must read the lifecycle decision from the Markdown suite, never the workbook** (§4.1). Where the two disagree, halt and report it (§18): the workbook holds decisions not yet imported, and guessing which file the reviewer meant is how a rejected case gets executed.
25. **Must run the Simple English Communication Standard check on the Manual Execution Results, the Manual QA Report, and every defect record before self-reporting the delivery** (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 10): short, direct sentences; any hard word replaced with an easier one where meaning stays the same; every necessary technical term briefly explained; observed fact kept visibly separate from hedged root-cause analysis (§10.1); and a first-read check for whether a QA Lead or a developer picking up the defect could act on it immediately. Test Case IDs, Result Classification values, and CSV column names are never altered by this check.

# 13. Expected Artifacts

| Artifact | Path | Template |
|---|---|---|
| Manual Execution Results | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionResults.md` | [`stage_4m_manual_execution/ManualExecutionResults.md`](../../../platform_core/templates/stage_4m_manual_execution/ManualExecutionResults.md) (defect block: [`Defect_entry.md`](../../../platform_core/templates/stage_4m_manual_execution/Defect_entry.md)) |
| Manual Execution Summary | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionSummary.md` | [`stage_4m_manual_execution/ManualExecutionSummary.md`](../../../platform_core/templates/stage_4m_manual_execution/ManualExecutionSummary.md) |
| **Manual Test Results CSV** | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualTestResults.csv` | Schema fixed by §9.2 (not a Markdown template) |
| **Manual QA Report** | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualQAReport.md` | [`stage_4m_manual_execution/ManualQAReport.md`](../../../platform_core/templates/stage_4m_manual_execution/ManualQAReport.md) |
| Captured screenshots / videos / notes / logs | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/artifacts/` | — (evidence files, not a document) |

**Every artifact's document structure is defined by its template** in `platform_core/templates/`, not restated here. Render an artifact by copying its template and filling the `{{PLACEHOLDER}}` tokens; section order is mandatory and the inline `<!-- -->` guidance is stripped from the rendered output. The Results and Summary templates together carry §10's 8-section contract, and `Defect_entry.md` encodes §10.1's 15-section Defect Documentation Standard. `platform_core/templates/README.md` states the shared conventions.

# 14. Operational Contract

Role: manual test case execution, result recording, defect documentation, and self-reported delivery (Stage `4M` — the Manual pipeline's terminal stage).

Execute the approved Manual Test Suite exactly as authored, record a raw unedited result per test case, document every defect to the full standard, and self-report the delivery. Execution is fully specified above — §2.1 (What this skill never does), §4 (Inputs, all of which must be Approved), §5 (Precondition Validation), §6 (Environment Awareness), §7 (Evidence Collection), §8 (Result Classification), §9 (Self-Reporting — QA Report, CSV, shared KB reads), §10 (Standard Output Contract, incl. the Defect Documentation Standard §10.1), §11.1 (Headed Browser — required), §12 (Execution Rules), §13 (Artifacts), §17 (Execution Strategy by Run Scope), §18–§19 (Stop Conditions and Recovery), §20 (Delivery Completeness). This section adds no rules of its own; the contract is stated once above rather than restated here.

# 15. Example Execution

*Illustrative only — not executed as part of this task.*

```text
Input:
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_Login.md / .xlsx
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.md
  platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md
```

Hypothetical result: this skill confirms the target environment matches the Project Context, launches the browser **headed**, and executes all 12 Login test cases while a human watches.

`TC-LOGIN-001` (valid login) and `TC-LOGIN-002` (invalid password) Pass. `TC-LOGIN-004` (the Forgot Password regression case tied to `FINDING-003`) **Fails** — the response still times out — and is written up to the full Defect Documentation Standard (§10.1): expected vs. actual as complete statements, Category `Workflow`, Layer `Backend`, Reproducibility `Always` (observed twice), Severity High with justification, screenshot and console log cited. `TC-LOGIN-009` is `Blocked` — the required seed account does not exist in this environment — and is never force-run (§5). `TC-LOGIN-011`'s mutating action is not authorized for this shared environment, so it is `Skipped` with the constraint named (§6).

The Repair KB carries a documented 2-second post-login redirect delay for this application; the executor recognizes it and **cites it alongside** the observation rather than raising it as a new defect (§9.3) — while still reporting the genuine `TC-LOGIN-004` failure in full.

Three deliverables result: `ManualExecutionResults.md` (12 per-test records, 1 full defect write-up), `ManualTestResults.csv` (12 rows — including the Blocked and Skipped ones, so the pass rate is computed against 12, not 10), and `ManualQAReport.md` (requirement coverage from the Traceability Matrix, with the requirement behind `TC-LOGIN-004` shown as *not verified*). **No script is produced, and no Automation Candidate Package exists** — automation scope, if this scope is ever automated, comes from Stage 3 in the other branch (§2.1).

# 16. Architecture Principle

> Agents communicate through artifacts only. Each has a single responsibility. Every output becomes the input of another whenever applicable.

For this skill specifically: its single responsibility is faithfully executing manually-designed test cases and reporting what actually happened, with evidence — never generating a script, never deciding what gets automated, and never executing automation code.

**This stage is where the "every output becomes another agent's input" clause legitimately terminates.** Its outputs — the Manual Execution Results, Manual Execution Summary, Test Results CSV, and Manual QA Report — are consumed by people, not by another agent (`pipeline.md` §3.3). That is why it self-reports rather than handing off: a terminal stage that produced only raw results would leave its delivery unfinished, waiting for a reporting stage that serves the other branch and does not read manual results.

# 17. Execution Strategy by Run Scope and Run Type

| Run Scope Type / Run Type | Strategy |
|---|---|
| **Entire Project** | Execute every test case in the approved Manual Test Suite. |
| **Epic / Feature / User Story** | Execute only the test cases traceable to that scope's requirements/acceptance criteria, per the same Run Scope Reference (`.claude/skills/test-design-skill/SKILL.md` §5.4) every test case already carries. |
| **Bug Validation** | Execute the specific reproduction and regression test case(s) tied to the Finding first. |
| **Full Regression** (Run Type) | Execute the entire suite. |
| **Smoke** (Run Type) | Execute only P1/critical-path test cases. |
| **Selective Re-run** | Execute only the specific test case IDs named for this run — e.g., re-validating cases whose Manual Test Suite entry changed. |

If the Project Context/Run Scope states no explicit Type, this skill defaults to executing the full Manual Test Suite and states that default explicitly in the Execution Metadata.

# 18. Stop Conditions

| Condition | Scope | Required Action |
|---|---|---|
| **Missing approved Manual Test Suite** | Global | Halt — there is nothing to execute. Recommend confirming Stage 3 completed and its output is `Approved`. |
| **Environment Unavailable** (target URL unreachable, application down) | Global | Halt; recommend validating the environment before retrying. |
| **Authentication Failure** (the Project Context's credentials don't work) | Global | Halt; this is a credential/environment problem, not a test defect. |
| **Precondition Not Met** (§5) | Local — that test case only | Classify `Blocked`; continue executing every other test case whose preconditions are met. |
| **No test case is `Review = Approved`** (§4.1) | Global | Halt **before** executing or writing results. Report the suite total, that zero cases are approved, and the `Pending`/`Rejected` split. Producing a report reading "0 executed, 0 failures" is worse than halting — at a glance it is indistinguishable from a clean run. Recommend reviewing the suite, then re-running. |
| **Markdown and workbook disagree on a lifecycle value** (§4.1) | Global | Halt. Recommend `cli.js --import-lifecycle` to move the reviewer's decisions into the Markdown, then re-run. Executing while they disagree risks running a case the reviewer rejected. |

# 19. Recovery Strategy — Smallest Corrective Action

Consistent with every other execution-capable stage in either pipeline: never simply fail — recommend the smallest corrective action, and never let one blocked test case stop the whole run.

1. For a Local Stop Condition (§18), continue executing every other unaffected test case.
2. For every block/failure, recommend the smallest corrective action: validate environment, re-run the affected subset once the underlying cause is believed fixed, or flag the specific test case for Test Design if the block reveals the test case itself (not the environment) is the problem.
3. Every recommendation is recorded in the Manual Execution Summary's Recommendations section (§10).

# 20. Handoff Contracts

## 20.1 Test Design skill → Manual Execution skill (inbound)

| This skill needs (§4) | Satisfied by (`.claude/skills/test-design-skill/SKILL.md` §9/§21) |
|---|---|
| Manual Test Suite | §9 Outputs #1–#2 |
| Per-case `Review` decision on every case (§4.1) | §6.3 — the `Review` lifecycle column, `Pending` unless a human changed it |
| Requirement Traceability Matrix | §9 Outputs #3 |
| Coverage Report (Coverage Gaps only — its *Review & Automation* roll-up is a summary, not this stage's gate; the gate is each case's own `Review` column, §4.1) | §9 Outputs #4 |
| Project Context | Unchanged pass-through from Stage 1 |

## 20.2 Outbound — there is none

**This stage has no downstream skill** (`pipeline.md` §3.3). It is the Manual branch's terminal stage: its outputs are consumed by the `4M` reviewer and by stakeholders, not by another agent.

In place of a handoff contract, a run is not complete until every one of these holds:

| Delivery requirement | Verified by |
|---|---|
| Every test case in scope has a recorded outcome | §12 Rule 5 — no silent omissions |
| Every `Failed`/`Inconclusive` case meets the Defect Documentation Standard in full | §10.1 |
| Every result's evidence is captured, or its absence stated with a reason | §7, §10 #4 |
| The CSV has one row per test case in scope, statuses unabbreviated | §9.2 |
| The QA Report's coverage is computed from the Traceability Matrix, with uncovered requirements shown as *not verified* | §9.1 |
| **All three renderings agree on every test case's status** | §9 |

**The last row is the one that actually fails in practice.** A status corrected in the Results after the CSV was written, without regenerating the CSV, produces a delivery that contradicts itself — and the contradiction is normally found by the stakeholder, not the reviewer.

# 21. Metrics

| Metric | Definition |
|---|---|
| **Execution Duration** | Total wall-clock time for this execution, start to finish. |
| **Pass Rate** | Passed ÷ total executed. Always stated together with the executable scope it was computed against (§8), never alone. |
| **Authorized Coverage** | Executable scope (`Review = Approved`) ÷ suite total — how much of the designed suite this run was permitted to exercise at all. |
| **Requirement Verification Rate** | Requirements with at least one Passed covering test case ÷ requirements in scope — the figure the QA Report leads with. |
| **Defect Density** | Failed + Inconclusive ÷ total executed. |
| **Block/Skip Rate** | (Blocked + Skipped) ÷ executable scope — `Excluded` cases are not in this denominator, since they were never authorized to run. |
| **Evidence Count** | Total evidence items captured, per §7. |

# 22. Future Scalability

The Result Classification (§8) and the Defect Documentation Standard (§10.1) are defined in terms of outcome and evidence rather than "a web page" — they extend to Mobile, Desktop, and API-shaped manual test cases (where "Steps" become device gestures or request/response definitions, per `.claude/skills/test-design-skill/SKILL.md` §22) with no change to this skill's Standard Output Contract (§10), its CSV schema (§9.2), or its QA Report structure (§9.1). Only the execution mechanism (§11) changes.

# 23. Direct Invocation

This skill is independently invocable — `/manual-execution-skill`, optionally with a run-scoped instruction (e.g. `/manual-execution-skill run TC-LOGIN-001..008 only`). Full rules: `workflows_and_pipelines/pipeline/pipeline.md` §5.3.1.

- **Instruction prompts are run-scoped, never spec-overriding** (§5.3.1 #3). An instruction may select which test case IDs to execute, set an execution order, or limit the session. It never authorizes force-running a test whose Preconditions are unmet (§5 — that is `Blocked`), taking unauthorized destructive actions, relaxing Evidence capture, reading the PRD directly (§17), producing a script or any Automation-branch artifact (§2.1), or omitting one of the three terminal deliverables (§9).
- **Upstream `Pending Review` → request approval, then recommend** (§5.3.1 #4). Report which of the Manual Test Suite / Traceability Matrix / Coverage Report / Project Context is open, then offer both paths (approve → `/manual-execution-skill`, or revise → `/test-design-skill <feedback>`).
- **Missing upstream → run degraded** (§5.3.1 #5):
  - *No Manual Test Suite:* there is nothing to execute — report it as the blocking gap (existing §18 Stop Condition stands). This skill executes designed test cases; it never authors them to fill the gap.
  - *No Project Context:* execute only if the target environment and credentials are supplied in the invocation itself; otherwise report the gap. Record the environment/safety basis as `Open Question — Requires Stage 1` and treat every ambiguous action as non-destructive-only.
  - *No Traceability Matrix / Coverage Report:* execute anyway, carry through whatever traceability the test cases themselves state, and mark the Results' traceability section as `Requires Upstream Stage`.
- **Closing message must recommend the next step** (§5.3.1 #6):

```
Stage 4M complete — Manual Execution delivery → Pending Review
  platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionResults.md
  platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualTestResults.csv
  platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualQAReport.md

  {P} Passed | {F} Failed | {B} Blocked | {S} Skipped | {N} Not Executed | {I} Inconclusive
  {D} defects documented | Requirement verification {V}/{T}

This is the Manual pipeline's terminal stage — approving it releases the delivery.

Next step — either:
  1. Approve and deliver:      "approved"
  2. Re-run failed cases:      /manual-execution-skill re-run {IDs}   (new .rerun-N files; this run's results stay as recorded)
  3. Revise the test cases:    /test-design-skill <your feedback>
  4. Also automate this scope: /automation-skill   (independent branch — takes its
                               scope from Stage 3, not from this stage's results)
```

# 24. Observability — what this stage emits

**This stage emits facts. It does not compute metrics.** Durations, counts and ratios are derived by
`platform_core/tools/observability` from the events below; no formula belongs in this specification
(`pipeline.md` §15).

Every event this stage records carries `--source skill`, which is a claim about reliability, not a
label: a Skill event is emitted because this document says to, so its presence is trustworthy and
**its absence proves nothing**. Platform tools emit their own `platform-tool` events from code, and
the two are never counted as one class. Recording honestly matters more than recording flatteringly —
a missing `STAGE_COMPLETED` makes the run `Partially Instrumented`, which is the correct outcome.

```bash
node platform_core/tools/observability/cli.js record --source skill --type <TYPE> [flags]
```

## Always

| When | Event |
|---|---|
| This stage starts | `STAGE_STARTED --stage 4M` → keep the returned `spanId` |
| This skill starts | `SKILL_STARTED --stage 4M --skill manual-execution-skill` |
| This skill finishes | `SKILL_COMPLETED --span-id <id>` |
| This stage finishes | `STAGE_COMPLETED --stage 4M --span-id <id>` |
| A Human Decision is raised (`pipeline.md` §5.5) | `HUMAN_DECISION_REQUESTED --decision-id <id> --category <Requirement\|Architecture\|Safety\|Review\|Automation\|Execution\|Other>` |
| That decision is answered | `HUMAN_DECISION_RESOLVED --decision-id <id> --status <answer>` |
| An artifact is first written | `ARTIFACT_CREATED --artifact <path> --artifact-class <class>` |
| An existing artifact is revised | `ARTIFACT_UPDATED --artifact <path> --artifact-class <class>` |

**Close every span you open.** An unclosed span is reported `Incomplete` and receives no duration —
never an elapsed-time estimate. **Declare the decision category explicitly**; it is never inferred
from the text of the question.

## Specific to this stage

| When | Event |
|---|---|
| The Execution Safety preflight completes (§6.1) | `SAFETY_PREFLIGHT_COMPLETED --metadata '{"policyId":…,"policyVersion":…,"policyHash":…,"environment":…,"totals":{…},"cleanupCompleted":n}'` |
| An operation is blocked by policy | `SAFETY_BLOCKED --count <n> --test-case-id <ID>` |
| A test case reaches an outcome | `TEST_EXECUTION_RESULT --test-case-id <ID> --status <Passed\|Failed\|Skipped\|Blocked\|Inconclusive> --attempt <n> --cycle <n>` |
| A defect report is written | `ARTIFACT_CREATED --artifact-class execution` |

**Pass the structured `totals` object from `preflight()`, not a summary of it.** The platform reads
Safety totals from this event rather than parsing `SafetyPreflight.md`, because scraping numbers back
out of prose the platform itself formatted is the failure mode observability exists to close.

**`--attempt` is load-bearing.** First-Pass Success is computed only from `attempt: 1` evidence and
is never reconstructed from a final result.

**A Safety block is `Skipped`, never `Failed`.** §6.1 already governs the recorded status; telemetry
mirrors it exactly and never reclassifies an outcome on the way past.

## Never emitted by this stage

- **Token counts or cost.** No event type exists for them. No supported run-attributable provider
  usage source exists, and nothing is estimated from text length or hardcoded pricing (HD-OBS-002).
- **A metric, ratio, or score.** This stage records what happened; the aggregator does the arithmetic.
- **A secret.** No password, token, API key, session ID, cookie, authorization header, or card detail
  reaches `--metadata`. Credential *identities* and roles are acceptable where genuinely needed.
- **A pass rate or a health verdict.** This stage records per-case outcomes; the aggregator computes rates, and §12 of this document already owns the QA judgement.

---

# 25. Resolving `{{MODULE_SLUG}}` and `{{RUN_FOLDER}}`

## The module: `{{MODULE_SLUG}}`

Every path containing `{{MODULE_SLUG}}` resolves to a module in the **module registry**,
`platform_core_data/modules/modules.json`, which is also the pointer recording which module(s) the
pipeline is currently working on (`workflows_and_pipelines/pipeline/module_architecture.md` §6).

```bash
node platform_core/tools/module_manager/cli.js active --json   # -> the slug(s), and the scope
node platform_core/tools/module_manager/cli.js list            # every module, status, active marked *
node platform_core/tools/module_manager/cli.js show <slug>     # one module's full state
```

- **Never hand-format, guess, or infer a module slug.** Resolve it from the pointer. A slug written by
  hand is a folder that may not exist, and a stage writing into it creates a module nothing can find.

**Feature scope — resolving `{{FEATURE_SLUG}}`.** A module may hold standalone **Features** at
`modules/{module}/features/{feature}/`, each with its own independent stage tracking
([`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §5.5,
[`new_us_intake.md`](../../../workflows_and_pipelines/pipeline/new_us_intake.md)). Resolve the pair,
never one half of it:

```bash
node platform_core/tools/module_manager/cli.js active --json     # -> activeModules[] + activeFeature
node platform_core/tools/module_manager/cli.js feature list [<module>]
```

| `activeFeature` | Scope | This stage resolves |
|---|---|---|
| `null` | consolidated module / CRUD | `{{MODULE_SLUG}}` only — and confirms the Feature pointer really is null |
| set | that standalone Feature | **both** `{{MODULE_SLUG}}` and `{{FEATURE_SLUG}}`; artifacts go under `modules/{module}/features/{feature}/` |

- **An invalid or stale Feature pointer is an error, not a fallback.** A Feature naming a module it
  does not belong to, or one that no longer exists, means the tooling no longer knows what scope the
  human intended. **Stop and ask for correction** — never quietly continue at module scope, which
  would write Feature output into its parent's folders.
- **Feature artifacts stay inside the Feature boundary; module CRUD artifacts stay inside the parent
  module.** Neither writes into the other.
- **A Feature stage never advances the parent module's stage**, and the reverse holds too. Record
  Feature progress with `cli.js feature stage <module> <feature> <stage>`, module progress with
  `cli.js stage <module> <stage>`.
- **A module with no `features/` folder is normal**, not incomplete: it is CRUD-only scope.
- **No active module → ask, never assume.** Stop and ask which module to work in, listing what exists.
  Never fall back to "the only module," "the newest," or the first alphabetically.
- **A pointer naming a module folder that does not exist → report it and stop.** A stale pointer means
  the module was never scaffolded or was removed; writing elsewhere would corrupt both records.
- **Never create a module.** Only Stage 1 may *propose* one, and only a human may approve it
  (`module_architecture.md` §6.4). A missing module is a question, never a thing to fix by creating it.
- **The pointer is sticky, and switching it is the human's call.** It stays on the same module(s)
  across invocations. This stage never rewrites it to redirect its own output.
- **Multi-module scope means once per module, never one merged artifact.** When `activeScope` is
  `multi` or `full-project`, produce this stage's output separately under each module in scope. The one
  exception is an *execution* result, which is per run by definition (`pipeline.md` §7).
- **Record progress through the Module Manager, never by hand-editing `modules.json`.** It is the only
  sanctioned writer of the registry (`module_architecture.md` §6.5 Rule 3).

This stage **reads from the module** (`modules/{{MODULE_SLUG}}/test_design/`, approved) and **writes only into the run** (`runs/{{RUN_FOLDER}}/manual_execution/`). It writes nothing under `modules/` — a result is evidence of one execution.

**Staleness is reported, never silently resolved.** When an upstream module artifact has been revised
since this stage last consumed it, say so — in this stage's own output and in the closing message. Re-
running an upstream stage is a human decision at that stage's gate (`module_architecture.md` §10.4).

## The run: `{{RUN_FOLDER}}`

Every path in this specification containing `{{RUN_FOLDER}}` resolves to the **active run**, recorded
at `platform_core_data/runs/current_active_run.json` — the single fact that says which of a project's
many runs the pipeline is currently working in (`workflows_and_pipelines/pipeline/run_manager.md` §5.7).

```bash
node platform_core/tools/run_manager/cli.js active   # -> the run folder name to write into
node platform_core/tools/run_manager/cli.js list     # every run, newest first, active marked *
```

- **Never hand-pick, guess, or infer a run folder.** Resolve it from the pointer (`resolveActiveRunFolder()` in JS, or the `active` verb). A stage that writes into a run it guessed at is exactly how one logical run's artifacts end up scattered across several folders.
- **No active run → ask, never assume.** If the pointer is absent, stop and ask which run to use, listing what exists. Never fall back to "the newest run" or create one silently.
- **A pointer naming a missing folder → report it and stop.** A stale pointer means the run was deleted or renamed; redirecting this stage's output into some other run would corrupt both.
- **The pointer is sticky.** It stays on the same run across invocations until someone switches it, so a multi-stage session keeps writing into one run without restating which.
- **Switching runs is the human's call.** This stage never rewrites the pointer to redirect its own output. Working on a different run means the switch happens first, as an explicit step (`cli.js use <run>`).

This stage never creates a run. It executes the active run's approved Manual Test Suite and writes its results back into that same run.

## Inherited artifacts and code drift

A run may be a **refinement** of an earlier one (`run_manager.md` §5.9). Such a run carries
`metadata/lineage.json` recording `inheritsFrom` / `supersedes`, and its inherited artifacts live in
the prior run and are **referenced by path, never copied** (`pipeline.md` §7 "Cross-run reuse").

```bash
node platform_core/tools/run_manager/cli.js drift          # what moved in the app since this run was anchored
node platform_core/tools/run_manager/cli.js drift --json    # machine-readable, exit 2 when not "unchanged"
```

- **Resolve `{{PRIOR_RUN_FOLDER}}` from the lineage record**, via `resolvePriorRunFolder()` — never by
  picking a plausible-looking earlier run. A run with no lineage record inherits nothing.
- **An inherited artifact is an input, not a conclusion this run has re-established.** Cite it by its
  prior-run path so a reader can see it was inherited rather than produced here.
- **Drift decides what may be reused as-is.** When `drift` reports `moved`, every inherited finding,
  test case, or locator touching a changed path is **unverified against current code** until this run
  re-checks it. Say so explicitly rather than presenting it as still current.
- **`unknown-*` is not `unchanged`.** No anchor, no git, or an unresolvable ref all mean drift could
  not be computed — treat inherited conclusions as unverified, never as confirmed.
- **A refinement targets today's project state.** The prior run described the app at its own
  `targetRef`; this run describes it now. Never carry forward a conclusion that drift contradicts.

# Browser launch (Phase 9.4)

The stage's Safety Preflight (`state preflight 4M`) also authorizes the browser itself: pass `headless` (the human's answer) and `preflight: { runsDir, run, stage: '4M', id: 'SP-n' }` to `BrowserDriver.authenticate()` / the Browser Provider. A launch without it, for a stage that is not Running, in a different mode, or with credentials for another environment or a base URL on another host than the preflight confirmed, is refused (`PREFLIGHT_REQUIRED` / `STAGE_NOT_RUNNING` / `MODE_MISMATCH` / `ENVIRONMENT_MISMATCH` / `TARGET_MISMATCH`).

# Run State Integration (pipeline.md §5.3.2 — added 2026-10-08)

This stage (`4M`) records its lifecycle in the run state model. These commands are mechanical. They never replace a reviewer's decision and never skip a gate. The full rule, and every stage's row, is `pipeline.md` §5.3.2.

0. **Safety Preflight — before entry:** record it with `node platform_core/tools/run_manager/cli.js state preflight 4M --environment <env> --target-url <url> --execution-type <browser|api|database|batch|other> [--execution-mode Headed|Headless] --operations <ops.json> --confirmed-by "<name>"` **before** `state start 4M` — the Run Manager writes `metadata/SafetyPreflight.md` itself and its entry gate refuses to start 4M without a confirmed, current preflight (Phase 9.2/9.3; never hand-write that file).
1. **Entry — before any work:** `node platform_core/tools/run_manager/cli.js state start 4M --invocation <Pipeline|Direct|Direct (degraded)> [--instruction "..."]`. This runs the entry gate. **Exit code 2 means blocked:** do not start. Show the human the reasons, request what is missing (`pipeline.md` §5.3.1 #4), and name the next command. No approved Manual Test Suite blocks. Without a Project Context, start with `--invocation "Direct (degraded)" --environment-supplied` only when the environment and credentials were given in the invocation.
2. **Artifacts:** `node platform_core/tools/run_manager/cli.js state artifact 4M --artifacts <path[,path]> [--kind checkpoint|output|evidence]` for what this stage writes.
3. **Exit — this stage has a checkpoint:** `node platform_core/tools/run_manager/cli.js state request-approval 4M --artifacts <checkpoint artifact>`. Its checkpoint artifact is `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionSummary.md` (its `| Status |` row). Finishing the work never marks the stage Completed.
4. **Approval:** only after the named reviewer approves and the artifact's own Status header reads `Approved`: `node platform_core/tools/run_manager/cli.js state approve 4M --approved-by "<reviewer>"`. It is refused if the header says anything else, or if the artifact is missing. A rejection: `state reject 4M --rejected-by "<reviewer>" --feedback "..."`.
5. **Blocked or failed:** `state block 4M --reason "..."` or `state fail 4M --reason "..."`, so the run records what it is waiting on.

**Recording the outcome (`pipeline.md` §17.5).** After the results are written, record them from the files — `node platform_core/tools/run_manager/cli.js state outcome 4M --from-results`. Never type the counts. A re-run of cases writes `ManualExecutionResults.rerun-N.md` (with its CSV and report) beside the original and registers it with `state artifact 4M`; the first cycle is never edited, and a recording refuses (`RESULTS_MODIFIED`) if it was. A `Blocked` result names what it depended on in its Reason ("Blocked — depends on TC-…") so it is never counted as an independent failure. A `Passed` row cites its evidence; one that does not reads `Unverified`, not `Passed`.
