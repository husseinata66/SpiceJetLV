---
name: reporting-skill
description: "Stage 6A (terminal stage) of the Agentic AI Testing Platform's Automation Pipeline. Synthesizes automation Execution Results, the Traceability Matrix, the Project Context, and any Stage 5H Repair Summary into a stakeholder-facing Final QA Report — Requirement Coverage, Automation Coverage, defects, and resolved assumptions/risks. Serves the Automation branch only: the Manual branch self-reports at Stage 4M. Use when producing the final QA report after an automation execution run."
inputs:
  - name: execution_results
    type: file_path
    required: true
    description: "`platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md` — first-attempt outcomes. Together with any `ExecutionResults.rerun-N.md`, the sole source of pass/fail/skip outcomes."
  - name: manual_test_suites
    type: file_path
    required: true
    description: "`platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_*.md`."
  - name: traceability_matrix
    type: file_path
    required: true
    description: "`platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md`."
  - name: project_context
    type: file_path
    required: true
    description: "`platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` — for resolving carried-forward assumptions/risks."
  - name: rerun_execution_results
    type: file_path
    required: false
    description: "`platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.rerun-N.md` — post-repair reruns written by Stage 5H. Present only where 5H ran; read for the latest verified outcome of each rerun test (§7A)."
  - name: repair_summary
    type: file_path
    required: false
    description: "`platform_core_data/modules/{{MODULE_SLUG}}/healing/` — Repair Summary, Before/After Comparison, Quarantine Register. Present only where 5H ran; used to label results Automation Repaired / Quarantined (§7 Rules 9–10)."
outputs:
  - name: final_qa_report
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md"
    description: "Stakeholder-facing report — Executive Summary, Requirement Coverage, Automation Coverage, Defect Summary, Risks, Recommendations."
  - name: final_qa_report_html
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.html"
    description: HTML companion of the Final QA Report, in the platform's shared report design (§8A, pipeline.md §17) — generated from Final_QA_Report.report.json by report_builder. A rendering for stakeholders, never the approved artifact.
  - name: final_qa_report_revision
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.rev-N.md"
    description: "A new revision of the Final QA Report, written only when Stage 5H ran after a Final QA Report already existed (§7A). Built from the latest verified results, with its own .rev-N.report.json and .rev-N.html. The original report and every earlier revision are never edited."
dependencies:
  - automation-execution-skill, test-design-skill, project-context-skill (upstream skills)
  - self-healing-skill (OPTIONAL upstream, Stage 5H — read only where a human ran it)
  - "platform_core/knowledge/patterns/reporting/ (Platform Knowledge patterns, if any promoted)"
---

> **Pipeline position:** Stage `6A` — the **Automation Pipeline's** terminal stage. Consumes automation Execution Results, produces the Final QA Report.
> **Branch:** Automation only. **The Manual branch never reaches this stage** — Stage `4M` self-reports its own Manual QA Report and Test Results CSV (`workflows_and_pipelines/pipeline/pipeline.md` §3.3). A run that took only the Manual branch has no Final QA Report, and that is correct rather than a gap.
> **Repaired results are reported as repaired:** where Stage `5H` ran, an `Automation Repaired` result is never presented as a clean `Passed` (§7).
> **Traceability:** `Execution → Reports`.
> **Revision history:** see `docs/CHANGELOG.md`.

> **Revision note (2026-07-27, user-mandated):** this stage's artifact lives in this run's own Run Folder (`platform_core_data/runs/{{RUN_FOLDER}}/reporting/`), and the persistent Workspace Automation Baseline lives at `platform_core_data/automation_baseline/{framework}/`. Each Markdown artifact is **one file, edited in place**: no `.vN` suffixes, and **no duplicate "final" copy is ever written on approval**. Refinement edits the same file the reviewer read. Git is the version history. See `workflows_and_pipelines/pipeline/pipeline.md` §7 and §12.
>
> **Revision note (2026-07-29, user-mandated):** **input paths only — this stage's output is unchanged**, still `runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md`. Three of its inputs now resolve from the module workspace: the **Traceability Matrix** (`modules/{module}/test_design/`), the **Project Context** (`modules/{module}/context/`), and the **Repair Summary** where Stage `5H` ran (`modules/{module}/healing/`). Execution Results stay in the run.
>
> Two reporting consequences follow, and both are about not overstating what was verified:
>
> 1. **Coverage is attributed per module.** A run that executed three modules reports each module's requirement and automation coverage as its own figure, and any project-level roll-up states which modules it covers. A single figure averaged over three modules hides which one is thin.
> 2. **A module in the project but not in this run's scope is reported as `Not In Scope For This Run`** — never as 0% coverage and never omitted. Those are three different facts, and only the first is true.
>
> Where a module-scoped execution ran, the report also states that **cross-module interaction was not exercised** — only a full-project execution runs the assembled baseline as one system (`module_architecture.md` §9.1). Presenting a single-module pass as whole-system verification is the specific overstatement this note exists to prevent.

# 1. Skill Name

**Reporting skill**

# 2. Purpose

The Reporting skill is the final stage of the pipeline. It synthesizes the raw Execution Results into a clear, accurate, stakeholder-facing QA report — computing requirement and automation coverage against the Manual Test Suites' Traceability Matrix, resolving the status of every carried-forward assumption/risk from the Project Context, and surfacing defects and recommendations. It reports what happened; it does not re-run tests, re-interpret code, or diagnose root cause.

# 3. Responsibilities

- Read the Execution Results (`ExecutionResults.md`, plus any `ExecutionResults.rerun-N.md` from Stage `5H`, §7A) as the sole source of pass/fail/skip/error outcomes — never fabricate or estimate a result not present there.
- Read the Manual Test Suites and Traceability Matrix to compute two distinct coverage measures:
  - **Requirement Coverage** — what fraction of Project Context requirements have at least one traced, executed test case
  - **Automation Coverage** — what fraction of designed manual test cases were successfully automated and executed. **Three distinct things must never be conflated here** (`test-design-skill` §6.3): the **Review decision** (was the case accepted?), the **Automation selection decision** (`Automation = Approved` — was it chosen for automation?), and the **execution result** (did the automated test pass?). `Automation = Approved` means *selected*, never *passed*: `Review = Approved`, `Automation = Approved`, `Execution Result = Failed` is a perfectly valid and important state. A case at `Automation = Rejected` is manual **by decision** and is **not** an automation coverage gap — report it as deliberately out of automation scope, separately from cases that were selected but could not be automated
- Report **Execution Safety** outcomes as a distinct category *(added 2026-08-07)*. A test not run because the Execution Safety policy `Forbade` it — or because a required scoped authorization was refused — is **`Blocked by Execution Safety Policy`**, and is reported: (a) never as an Application Failure, an Automation Failure, or an Environment Failure, because none of those occurred; (b) never omitted, so the denominator stays honest; (c) with the matched policy rule named, so a reader can see *which* rule and act on it. Where the run's `metadata/SafetyPreflight.md` exists, its factual counts may be reported (mutating operations planned, allowed, human-authorized, forbidden, cleanup-required, cleanup-completed) — as **facts about authorization, not judgments about quality**. A high `Forbidden` count means the run was correctly constrained; it is not a defect, a coverage failure, or a score.
- Read the Project Context to cross-reference every carried-forward assumption/risk and state whether execution confirmed it, refuted it, or left it still unverified.
- Group defects/failures by module and assign a severity, based strictly on the failure evidence in the Execution Results.
- Explicitly call out anything designed but never automated, and anything automated but never executed — gaps are reported, not hidden.
- Produce recommendations and next steps, clearly framed as suggestions requiring follow-up (e.g., developer investigation), never as an implied code fix already applied.
- Never alter execution results, test cases, or the Project Context to make outcomes look better than they were.

# 4. Inputs

| Input | Role | Required? | Description |
|---|---|---|---|
| Execution Results | Primary | Required | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md` — the first-attempt results |
| Rerun Execution Results | Primary, where present | Optional | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.rerun-N.md` — Stage `5H` post-repair reruns (§7A) |
| Repair Summary, Before/After Comparison, Quarantine Register | Secondary, where present | Optional | `platform_core_data/modules/{{MODULE_SLUG}}/healing/` — only where Stage `5H` ran (§7 Rules 9–10) |
| Manual Test Suites | Required | Required | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_*.md` (Markdown and/or Excel) |
| Traceability Matrix | Required | Required | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md` |
| Project Context | Required | Required | `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` |


## 4.1 The Application Context — this stage closes its cycle

*(Added 2026-08-18, user-mandated.)*

`platform_core_data/modules/ApplicationContext.md` is refreshed to `Draft` by Stage 1 when a run begins, and appended to by any stage that **proves** a cross-module dependency, records a new cross-module rule, or changes an end-to-end journey's coverage ([`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §6.7).

**This stage is the branch's terminal stage, so it is where that cycle closes.** Before this stage reports itself complete it must:

1. **Append what this run changed about the relationships between modules** — a dependency proven rather than assumed, an E2E journey whose coverage moved, a cross-module rule now recorded in `knowledge/INDEX.md`. Nothing that belongs to one module goes in; that is its governing rule.
2. **Present the diff for approval** — what changed since the last `Approved` revision, and what did not.
3. **Set its status to `Pending Review`.**

**This stage never sets it to `Approved`.** That is a human's decision, exactly like every other gate (`pipeline.md` §5). Until a human approves it, the file is not final — and the next run reopens it as `Draft` regardless.

**If nothing cross-module changed, say so and leave it alone.** A run that taught the application map nothing is a normal outcome; an edit invented to look productive is worse than no edit, because the next reader cannot tell which lines were learned and which were filler.


# 5. Outputs

**Final QA Report** — the stakeholder-facing synthesis of the entire pipeline run: what was tested, what passed/failed, how much of the Project Context is covered, how much of the manual suite is automated, what remains unverified, and what should happen next.

# 6. Allowed Tools

- File tools: Read (execution results, test suites, traceability matrix, Project Context), Write (final report)
- Directory-listing shell commands (read-only)

**Not permitted:** browser automation tools, code execution tools, or any tool that could re-run tests or mutate application data. This skill only reads and synthesizes.

# 7. Execution Rules

1. Must base every statistic and outcome strictly on the Execution Results — no invented, estimated, or "typical" results.
2. Must explicitly report test cases that were designed but not automated, and automated but not executed — gaps are visible, never silently dropped.
3. Must preserve and resolve every "Assumption-based test" flag: state whether it was confirmed, refuted, or remains unverified based on the execution outcome.
4. Must compute Requirement Coverage and Automation Coverage as two separate, clearly labeled figures — never conflate "we tested it" with "we automated it."
4a. Must keep the **Review decision**, the **Automation selection decision**, and the **automation execution result** as three separate reported facts, and must never present `Automation = Approved` as evidence that a test passed (§6.1). Cases excluded from automation because a human set `Automation = Rejected` are reported as *deliberately manual*, never as an automation gap or a coverage shortfall.
4b. **Must report a policy-blocked test using the existing execution taxonomy with an explicit reason — `Skipped` / `Blocked`, reason `Execution Safety Policy`** (`automation-execution-skill` §14A.3, `manual-execution-skill` §6.1) — never as any kind of Failure, and never as a new result status invented for the purpose. A safety block **must not damage Application Health**: the application under test did nothing wrong, and a stakeholder reading a degraded health figure would be reading a governance decision misfiled as a defect.
4c. **Must never treat safety metrics as a quality judgment** (§3). *Mutating cases planned / allowed / human-approved / forbidden / blocked / cleanup-required / cleanup-completed* are factual counts about what the run was authorized to do. They are not a score, and a run with many `Forbidden` operations is a correctly-governed run, not a failing one.
4d. **Must keep Execution Safety separate from the two Test Case decisions** (`test-design-skill` §6.3, §6.1 above). `Review`, `Automation`, and Execution Safety are three independent facts, and a report that merges any two of them makes it impossible to tell "nobody accepted this case" from "nobody chose to automate it" from "we were not allowed to run it here."
5. Must not recommend a specific code fix as if already applied — findings are reported as needing developer investigation.
6. Must not re-run any test or modify upstream artifacts (Execution Results, test cases, Project Context, PRD).
7. Must group defects by module and assign severity based only on evidence present in the Execution Results.
8. **Must report the health dimensions separately** — the three execution figures (Application Health, Automation Health, Environment Health) and, from Run Health (`pipeline.md` §15.1a), Coverage, Contract and Workflow Health. None is ever merged into another or into an overall figure. The three execution figures are reported exactly as the Execution Results record them (`automation-execution-skill` §25.2). **Never merge them into one "failed" count**: an automation-authoring gap and a genuine application defect are different facts about different systems, and a stakeholder acting on a merged figure is acting on a number that describes neither.
9. **Must never present an `Automation Repaired` result as a clean `Passed`** (`pipeline.md` §4, Stage `6A`). Where Stage `5H` ran, the report distinguishes first-attempt passes from repaired ones, cites the Repair Summary, and states how many tests required a fix — coverage achieved only after repair is real coverage, but a reader must be able to see that it needed repair.
10. **Must report quarantined tests** (`self-healing-skill` §14), where a Quarantine Register exists, as coverage that is *not currently verified* — never omitted, and never counted as passing.
11. **Must report Automation coverage only, and never substitute Manual Execution results for it** (`pipeline.md` §3.3). Manual coverage is reported by Stage `4M`'s own QA Report. Where both branches ran the same scope, comparing them is a human's synthesis across two independent deliveries — this report never claims manual coverage as its own.
12. **Must run the Simple English Communication Standard check on the Final QA Report before delivering it** (`pipeline.md` §6 Rule 10): short, direct sentences; any hard word replaced with an easier one where meaning stays the same; every necessary technical term briefly explained; a figure taken directly from Execution Results kept visibly separate from a resolved assumption or risk judgment; and a first-read check for whether a manager or product owner, not just a QA specialist, could understand the report's headline outcome. Test Case IDs, Requirement IDs, and Result Classification values are never altered by this check.

# 7A. Report revisions after Self-Healing (added 2026-10-08, user-mandated)

**When a human runs Stage `5H` after this stage has already produced a Final QA Report for the run, the original report is kept and a new revision is written.** A report is evidence of what was known when it was written (`pipeline.md` §6 Rule 7b), so a later repair never rewrites it.

1. **Trigger.** A Final QA Report already exists for this run, and Stage `5H` has since written at least one `ExecutionResults.rerun-N.md` that the latest report does not cite. Producing the revision is never automatic — it happens when a human invokes `/reporting-skill` (Stage `5H`'s closing message recommends it). If Stage `5H` ran *before* any Final QA Report existed, there is nothing to revise: the first report reads the reruns directly, under the same rules.
2. **The original is never touched.** `Final_QA_Report.md`, its `.report.json` and `.html`, and every earlier revision stay exactly as written. The new revision is `Final_QA_Report.rev-N.md` (N = the next free number, starting at 1), with its own `Final_QA_Report.rev-N.report.json` and `Final_QA_Report.rev-N.html` built by `report_builder` (§8A).
3. **Built from the latest verified results.** For each test case, the outcome is taken from the most recent execution that actually ran it: the highest-numbered `ExecutionResults.rerun-N.md` that includes it, otherwise `ExecutionResults.md`. Only an execution result counts as verified — a Repair Summary's claim that something was fixed is never an outcome by itself. A test that passed only after repair is `Automation Repaired`, never `Passed` (Rule 9). A quarantined test is not currently verified (Rule 10).
4. **It states its basis and what changed.** The revision's header names: its revision number; the report it supersedes (and that the original is preserved, with its path); every results file it read, with each one's Execution ID; the Repair Summaries it read; and the reason for the revision. It includes a short change table: each test whose outcome changed, first-attempt outcome → latest verified outcome, citing the Execution ID of each.
5. **Application Health is never improved by a repair.** Repairs address automation only (`self-healing-skill` §8). If Application Failures were reported in the original, they stay in the revision unless a later execution actually ran that test and recorded a different outcome. Even then, the change is shown in the change table, never silently.
6. **No checkpoint, same as the original.** A revision is delivered to stakeholders like the original report (`pipeline.md` §4, Stage `6A`). The original stays the record of the first-attempt result; the newest revision is the current picture.

# 8. Expected Artifacts

| Artifact | Path | Template |
|---|---|---|
| Final QA Report | `platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md` | [`platform_core/templates/stage_6a_reporting/Final_QA_Report.md`](../../../platform_core/templates/stage_6a_reporting/Final_QA_Report.md) |
| Final QA Report — revision (§7A) | `platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.rev-N.md` — only where Stage `5H` ran after a report existed | Same template, plus the §7A revision header and change table |

**Document structure is defined by the template, not restated here.** Render the report by copying the
template and filling its `{{PLACEHOLDER}}` tokens; its section order is mandatory and its inline
`<!-- -->` guidance is stripped from the rendered output. The template also encodes this stage's
degraded-run markings (§12), so an absent input renders as a named gap rather than a favourable
result. `platform_core/templates/README.md` states the conventions every template follows.

# 8A. Final QA Report — HTML companion (`pipeline.md` §17)

The Final QA Report is **also published in the platform's shared HTML report design**, generated by `platform_core/tools/report_builder`. Three files, same folder:

```
platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md            # the artifact
platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.report.json   # the report model
platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.html          # generated — never hand-edited
```

```bash
node platform_core/tools/report_builder/cli.js validate --model platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.report.json
node platform_core/tools/report_builder/cli.js build    --model platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.report.json
```

`validate` first — it exits `2` and names the exact path that is wrong; surface its message unchanged. Model reference: `platform_core/tools/report_builder/README.md`.

**The HTML never replaces the Markdown.** The Markdown is the artifact the Traceability Chain runs through and the one a reviewer approves; the HTML is a second rendering of the same content for stakeholders — never approved, never versioned, never read as input by any stage. **Rebuild it after every in-place correction** (`pipeline.md` §7), or the two disagree and the Markdown is the one that is right.

### 8A.1 Mapping this stage onto the model

**Every separation this stage exists to preserve must survive into the HTML.** The model makes each of them a distinct, visible element — none may be merged for a tidier page:

- **The health figures stay separate figures** (§7 Rule 8). Coverage, Contract and Workflow Health, read from Run Health, also each get their own entry. Application Health, Automation Health, and Environment Health each get their own stat card or their own `notes` block. **Never one merged "failed" count** — the executive summary donut is computed over result statuses, and the health figures are reported beside it, not folded into it.
- **`Review`, `Automation`, and Execution Safety stay three independent facts** (§7 Rules 4a, 4d). A case excluded because a human set `Automation = Rejected` is reported as *deliberately manual*, with its own status key — never as a coverage gap.
- **A policy-blocked test uses `Skipped`/`Blocked` with reason `Execution Safety Policy`** (§7 Rule 4b), declared with tone `warning` or `neutral` — **never `fail`**. A governance decision coloured as a defect is exactly the misreading Rule 4b forbids.
- **An `Automation Repaired` result is its own declared status** (§7 Rule 9), never folded into `Passed`. Quarantined tests (§7 Rule 10) are their own status too, reported as coverage that is *not currently verified*.
- **Requirement Coverage and Automation Coverage are two separately labelled figures** (§7 Rule 4), never one number.
- **Automation coverage only** (§7 Rule 11). The HTML makes no claim about manual coverage; Stage `4M`'s own report carries that.

**Statuses are declared, mapped to tones, and never collapsed.** A result whose status is not declared is a validation error — which is the point: a typo that quietly merged a safety block into a failure would defeat Rules 4b and 8.

**Defects grouped by module become `findings` items**, with severity assigned only from evidence present in the Execution Results (§7 Rule 7), and no recommended code fix presented as already applied (§7 Rule 5).

**Designed-but-not-automated and automated-but-not-executed gaps are visible** (§7 Rule 2) — as their own statuses or a `notes` section, never dropped. Assumption-based tests are carried to a resolved state (§7 Rule 3) in a `notes` section.

**The Simple English check (§7 Rule 12) applies to the model's text too** — the HTML is what most stakeholders will actually read.

**Captured output goes through `text`, never `html`.** An application response, a UI message, a log line, and anything a human typed are escaped. `html` is only for markup this stage generated itself.

**Redact through the model's `"redacted": true`**, never by hand-typing a placeholder into a header value.

**Excerpt a very large capture and say so** in the exchange's `notes` — a full multi-hundred-KB body helps no reader, and silently truncating one misleads every reader.


# 9. Operational Contract

Role: execution-to-stakeholder-report synthesis (Stage `6A`, the Automation Pipeline's terminal stage).

Synthesize raw execution results into a clear, accurate, stakeholder-facing QA report based only on the Execution Results, the Manual Test Suites / Traceability Matrix, and the Project Context. Execution is fully specified above — §3 (Responsibilities, incl. the two distinct coverage measures), §4 (Inputs), §5 (Outputs), §7 (Execution Rules), §8 (Artifacts and the eight required report sections). This section adds no rules of its own; the contract is stated once above rather than restated here.

# 10. Example Execution

*Illustrative only — not executed as part of this task.*

```text
Input:
  platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_Admin.md
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_PIM.md
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_Leave.md
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md
  platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md
```

Hypothetical result: `platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md` stating, e.g., an Executive Summary of overall run health; a Detailed Execution Report listing each of the 36 executed tests with its Test Case ID and Automation Script ID; Passed/Failed Statistics showing 31 passed / 3 failed / 2 skipped; a Defect Summary describing TC-PIM-013, TC-PIM-014, and TC-LEA-013; Requirement Coverage showing, e.g., 47 of 52 traced Project Context requirements have an executed test; Automation Coverage showing 36 of 56 manual test cases were automated; and a Risks section noting that SR-5 (brute-force protection) remains unverified because the corresponding test was never authorized to run against the shared demo environment.

# 11. Architecture Principle

> Agents communicate through artifacts only. Each has a single responsibility. Every output becomes the input of another whenever applicable.

For this skill specifically: its single responsibility is synthesis and reporting — never re-testing or code diagnosis. It is the terminal node of the pipeline; its output is consumed by human stakeholders, not by another skill.

# 12. Direct Invocation

This skill is independently invocable — `/reporting-skill`, optionally with a run-scoped instruction (e.g. `/reporting-skill executive summary only`). Full rules: `workflows_and_pipelines/pipeline/pipeline.md` §5.3.1.

- **Instruction prompts are run-scoped, never spec-overriding** (§5.3.1 #3). An instruction may set report emphasis, audience, or section depth. It never authorizes re-testing, code diagnosis, inferring an outcome not present in the Execution Results (§7), or reading the PRD directly — this skill reports what the artifacts say, nothing more.
- **Upstream `Pending Review` → request approval, then recommend** (§5.3.1 #4). Report which input is open, then offer both paths (approve → `/reporting-skill`, or revise → the producing skill's command).
- **Missing upstream → run degraded** (§5.3.1 #5). This is the terminal stage and the most common legitimate direct-invocation target — a report on a partial run is often exactly what is wanted. Report on whatever exists, and state the basis explicitly:
  - *No Execution Results:* report coverage and design status only. Mark every outcome-dependent section (`Defect Summary`, pass/fail figures, Automation Coverage) as `Not Executed — Requires Stage 5A`, never as zero defects or as passing.
  - *No Repair Summary:* the normal case — Stage `5H` is optional and usually does not run (`pipeline.md` §3.6). Report results as executed, with no repair section at all. Its absence is never a gap to disclose.
  - *Manual Execution Results present, no automation results:* **do not substitute them.** This stage reports automation coverage; manual coverage is reported by Stage `4M`'s own QA Report (`pipeline.md` §3.3). Report the automation gap plainly and point the reader to the manual delivery.
  - *No Traceability Matrix:* omit the Requirement Coverage table and state why, rather than computing coverage from an incomplete basis.
  - *No Project Context:* carry no assumption/risk resolution section; mark it `Requires Stage 1`.
  - **A gap is always reported as a gap, never as a favourable result.** An absent input must never render as 0 defects, 100% pass, or full coverage.
- **Closing message must state the report's basis** (§5.3.1 #6):

```
Stage 6A complete — Final QA Report (Automation branch)
  platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md
  Requirement coverage {R}% | Automation coverage {A}%
  {P} passed | {H} automation-repaired | {F} failed    <- repaired is never counted as passed
  Basis: {inputs present} | Declared gaps: {inputs absent}

Next step — either:
  1. Regenerate with different emphasis:  /reporting-skill <your focus>
  2. Fill a declared gap first:           /automation-execution-skill   (then re-report)
  3. Heal remaining failures:             /self-healing-skill           (then /reporting-skill → a new
                                                                         Final_QA_Report.rev-N.md; this
                                                                         report stays as written, §7A)
```

# 13. Observability — what this stage emits

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
| This stage starts | `STAGE_STARTED --stage 6A` → keep the returned `spanId` |
| This skill starts | `SKILL_STARTED --stage 6A --skill reporting-skill` |
| This skill finishes | `SKILL_COMPLETED --span-id <id>` |
| This stage finishes | `STAGE_COMPLETED --stage 6A --span-id <id>` |
| A Human Decision is raised (`pipeline.md` §5.5) | `HUMAN_DECISION_REQUESTED --decision-id <id> --category <Requirement\|Architecture\|Safety\|Review\|Automation\|Execution\|Other>` |
| That decision is answered | `HUMAN_DECISION_RESOLVED --decision-id <id> --status <answer>` |
| An artifact is first written | `ARTIFACT_CREATED --artifact <path> --artifact-class <class>` |
| An existing artifact is revised | `ARTIFACT_UPDATED --artifact <path> --artifact-class <class>` |

**Close every span you open.** An unclosed span is reported `Incomplete` and receives no duration —
never an elapsed-time estimate. **Declare the decision category explicitly**; it is never inferred
from the text of the question.

## Specific to this stage

This stage **consumes** observability rather than producing much of it.

```bash
node platform_core/tools/observability/cli.js metrics   --run {{RUN_FOLDER}} --out
node platform_core/tools/observability/cli.js report    --run {{RUN_FOLDER}} --out
node platform_core/tools/observability/cli.js dashboard --run {{RUN_FOLDER}} --out
```

Include a **concise** Run Observability section in the Final QA Report — duration, human decisions,
tool calls, retries, test case and automation counts, safety blocks, and the explicit
`Token Usage: Unavailable` / `Cost: Unavailable` lines. Link to `ObservabilityReport.md` and
`ObservabilityDashboard.html` for the detail; do not inline the full telemetry, which would bury the
QA findings the report exists to deliver (§48).

**Take the numbers from `ObservabilityMetrics.json`. Do not recount artifacts.** A second count is a
second source of truth, and the two will eventually disagree about the same run.

**Carry `Unavailable` through verbatim.** Never render an unavailable metric as `0`, `—`, or `N/A`;
each one has a stated reason and the reason is the useful part.

**Report an under-instrumented run as under-instrumented.** If the metrics say
`Partially Instrumented`, the Final QA Report says so too. Presenting partial telemetry as a complete
picture is the reporting equivalent of a fabricated metric.

## Never emitted by this stage

- **Token counts or cost.** No event type exists for them. No supported run-attributable provider
  usage source exists, and nothing is estimated from text length or hardcoded pricing (HD-OBS-002).
- **A metric, ratio, or score.** This stage records what happened; the aggregator does the arithmetic.
- **A secret.** No password, token, API key, session ID, cookie, authorization header, or card detail
  reaches `--metadata`. Credential *identities* and roles are acceptable where genuinely needed.
- **A composite quality, productivity, or value score**, and **no financial ROI** without a human-provided baseline. Report the evidence and the transparent ratios (§63, §65).

---

# 14. Resolving `{{MODULE_SLUG}}` and `{{RUN_FOLDER}}`

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

This stage **writes only into the run** (`runs/{{RUN_FOLDER}}/reporting/`). It reads each executed module's `test_design/TraceabilityMatrix.md` to compute coverage, and writes nothing under `modules/`.

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

This stage never creates a run. It reports on the active run, and is the most common target of a deliberate switch back to an older run ("re-report on run-002").

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

# Run State Integration (pipeline.md §5.3.2 — added 2026-10-08)

This stage (`6A`) records its lifecycle in the run state model. These commands are mechanical. They never replace a reviewer's decision and never skip a gate. The full rule, and every stage's row, is `pipeline.md` §5.3.2.

1. **Entry — before any work:** `node platform_core/tools/run_manager/cli.js state start 6A --invocation <Pipeline|Direct|Direct (degraded)> [--instruction "..."]`. This runs the entry gate. **Exit code 2 means blocked:** do not start. Show the human the reasons, request what is missing (`pipeline.md` §5.3.1 #4), and name the next command. Any absent input: start with `--invocation "Direct (degraded)"` and report each one as a declared gap (§12), never as a favourable result.
2. **Artifacts:** `node platform_core/tools/run_manager/cli.js state artifact 6A --artifacts <path[,path]> [--kind checkpoint|output|evidence]` for what this stage writes — at minimum `platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md` (or the `.rev-N.md` revision, §7A).
3. **Exit — this stage has no checkpoint:** run `node platform_core/tools/run_manager/cli.js state report-check --model <Final_QA_Report.report.json> --md <Final_QA_Report.md> --html <Final_QA_Report.html>` (exit 2 = the renderings disagree with each other, with the recorded outcome, or the HTML is not exactly what the model renders — rebuild, never hand-edit), register the output, then `node platform_core/tools/run_manager/cli.js state complete 6A`, which runs the same check strictly. It is refused unless a registered output exists on disk.
4. **Blocked or failed:** `state block 6A --reason "..."` or `state fail 6A --reason "..."`, so the run records what it is waiting on.

**Reading the history and writing the report (`pipeline.md` §17.5, §7A).** Read outcomes from `node platform_core/tools/run_manager/cli.js state history 5A` and `state history 5H` (every cycle, final and first-attempt status, blocked dependencies, Quarantine and Before/After sources) and the recorded `state status`; never from a single results file. Get the report path from `state report-path` — it is `Final_QA_Report.md` the first time and `Final_QA_Report.rev-N.md` after, and never an existing file. Set the model's `outcomeVerdict` to the recorded verdict; a green `statusPillTone` is refused unless it is `all-passed`. Copy each passing case's assertion records into its `assertions` list (`report_builder/README.md`) — never write them for the report; a model claiming `all-passed` is refused while a passing case shows none. Give each its `id` (A1, A2 …) when the case states its assertions, and list a required assertion with no execution record as `result: "missing"` — shown apart from a failed one; read them from `state history` (Phase 5.8). Report Application, Automation, Environment and Coverage health separately. Before completing, `state report-check --model <…report.json> --md <…md> --html <…html>` must pass.

**Run Health (Phase 8, `pipeline.md` §15.1a).** Before writing the Final QA Report, read `node platform_core/tools/observability/cli.js health --run {{RUN_FOLDER}}`. Use its figures, never a recount:

- the verdict, the canonical status counts, the six health dimensions, the repairs and the contract position;
- Automation Repaired stays apart from Passed;
- a dimension that is Unavailable is stated as Unavailable;
- there is no overall health figure.

The Final QA Report's "API contract position" must match the contract tool now: `state report-check` refuses a mismatch, and a green report while a contract blocker is open.

**API contract position (Phase 7, `pipeline.md` §8.2).** When any scope of the run has an API contract registry (`<scope>/discovery/api_contracts/registry.json`), add the section from `api_contract/report.js` `finalReportSection([...])` (built from `api_contract/cli.js status --scope … --json`) to the Final QA Report model. It lists unresolved contract blockers and warnings.

- **It is status, not a result.** Never count contract drift as a pass or a failure.
- **Mock-only conformance is not real validation.** Say so wherever mock evidence is cited.
- **The per-analysis drift report is not this report.** It is `api_contract/cli.js report`, written in the scope's `discovery/api_contracts/reports/`.
