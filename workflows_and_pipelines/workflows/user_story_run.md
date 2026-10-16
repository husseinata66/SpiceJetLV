> **Position:** A reusable workflow specification, layered on top of [`pipeline/pipeline.md`](../pipeline/pipeline.md), [`pipeline/run_manager.md`](../pipeline/run_manager.md), and [`pipeline/run_scope.md`](../pipeline/run_scope.md). It does not modify any of those documents, does not modify any Skill specification under [`.claude/skills/`](../../.claude/skills/), and does not change the platform's two-pipeline, eight-stage architecture — it defines one specific, narrow-scoped *invocation* of Stage 3 and **both** of the branches that diverge from it (`4M`; `4A` → `5A` → `6A`) against an already-existing Project Context and Discovery baseline.
> **Status:** Current. This document defines the workflow; authoring it produced no run or project artifact. The workflow itself has been used by at least one real run (see `platform_core_data/runs/` for run folders whose Manifest names `user_story_run`).

# 1. Workflow Name

**User Story Run**

# 2. Purpose

This workflow takes a single, already-scoped User Story from requirement to a stakeholder-facing report — design, automate, execute, report — **without re-running Stage 1 (Project Context) or Stage 2 (Explorer)**, when an Approved Project Context and Approved Discovery Artifacts already exist and remain current for the module(s) the story touches.

It exists for the common case where a project has already been onboarded and explored at least once (e.g., via a prior Entire Project or First Run pass), and a new User Story arrives against that same, still-valid application surface — re-discovering the whole application for one story would be wasted, redundant work.

**This workflow does not decide, by itself, that Stages 1–2 don't need to run.** That determination is made by the existing Workflow Selection & Start Decision Gate (`pipeline/pipeline.md` §5.4; formerly the Automation Start Decision Gate), applied here at Stage 3's entry point rather than Stage `4A`'s — see §4 Step 1.

# 3. Scope

| | |
|---|---|
| **Run Scope Type** | `User Story` (per `pipeline/run_scope.md` §3) |
| **Run Scope Source** | Whatever this story is supplied as — pasted text, a Markdown file under `platform_core_data/knowledge_base/requirements/user_stories/`, or (once integrated) a tracked work item ID (`pipeline/run_scope.md` §4) |
| **Module(s)** | Whatever module(s) the story's acceptance criteria touch — named explicitly in the story content, not assumed |

Only this story's acceptance criteria are in scope for Stage 3's test design (`.claude/skills/test-design-skill/SKILL.md` §16, "User Story" strategy: "narrowest and most literal... no broader wandering into adjacent feature coverage the story didn't ask for"). This workflow does not widen that scope.

# 4. Execution Flow

```
 1. Run Manager
      │
      ├─ Stage-State Check          (pipeline/pipeline.md §5.4, applied at this
      │                               workflow's entry point — Stage 3)
      │
      └─ [if Stages 1–2 Approved and current] Launch Stage 3
              │
              ▼
 2. Test Design Skill                [= Pipeline Stage 3]
      │  reuses existing project_context + discovery_artifacts (§5 below)
      │  ⛔ Human Review Required ⛔
              │ (approved — THE DIVERGENCE POINT)
              │
      ┌───────┴────────────────────────────────┐
      │                                        │
      ▼                                        ▼
 ═══ MANUAL BRANCH ═══           ═══════ AUTOMATION BRANCH ═══════

 3M. Manual Execution Skill        3A. Automation Skill
     [= Pipeline Stage 4M]             [= Pipeline Stage 4A]
      │  ⛔ Human Review ⛔               │  ⛔ Automation Approval ⛔
      │ (approved)                       │ (approved)
      ▼                                  ▼
   Manual QA deliverables          4. Automation Execution Skill
   delivered to stakeholders          [= Pipeline Stage 5A]
   (TERMINAL — pipeline.md §3.3)       │  (mechanical — no separate gate)
                                       │
                                       │  ┌─ Self-Healing Skill ──────┐
                                       ├─▶│  [= Pipeline Stage 5H]     │
                                       │  │  OPTIONAL · human-invoked  │
                                       │  │  only (pipeline.md §3.6)   │
                                       │  └───────────┬────────────────┘
                                       ▼              ▼
                                 5. Reporting Skill  [= Pipeline Stage 6A]
                                       │
                                       ▼
                                 Stop Workflow
```

**The two branches are siblings, not a sequence.** Step 3M does not gate Step 3A: Stage `4A` takes its scope directly from the approved Stage 3 suite, never from a manual execution outcome (`pipeline.md` §3.3). This workflow invokes both because a User Story generally wants both deliverables — but either may be run alone, in either order, or concurrently, and skipping one is a branch not taken, never a gap (`pipeline.md` §6 Rule 3a).

## Step 0 — New User Story Intake Routing *(added 2026-08-17, user-mandated)*

**Runs before the Stage-State Check.** This workflow's §3 says the module(s) are "whatever module(s)
the story's acceptance criteria touch — named explicitly in the story content, not assumed." Step 0 is
how that naming actually happens; before it existed, the workflow assumed the module was already known.

**Spec:** [`../pipeline/new_us_intake.md`](../pipeline/new_us_intake.md).

1. **Ask:** *"Is this User Story for a standalone Feature or part of a module CRUD scope?"* — `Feature`
   or `CRUD`. **Never inferred from the story title.**
2. **`Feature`** → confirm the parent module; scope is `Run Scope Type: Feature` / `Run Type: User
   Story`, and is **not** widened into the parent's CRUD scope. Target is
   `modules/<module>/features/<feature>/`.
   **`CRUD`** → ask one story or several; identify which of Add/Create · Update · Search · Approve ·
   Reject are included; collect each story and its AC. Target is **one consolidated module**.
3. **Inspect existing scope** — `cli.js inspect-scope [--user-story …] [--name …]`. Overlap is a
   candidate for a human to judge, never a verdict, and never concluded from a story number alone.
4. **Show the proposal and wait for confirmation** before anything is created.

**Nothing in Step 1 runs until Step 0 is answered** — including run creation. A refinement created
against the wrong scope shape is not fixed by re-running Step 1; it has to be discarded.

## Step 1 — Run Manager & Stage-State Check

Before Stage 3 is invoked, the Run Manager performs the Workflow Selection & Start Decision Gate check (`pipeline/pipeline.md` §5.4) — which applies to any downstream entry point, not only Stage `4A` — because this workflow is itself a request to begin at a stage other than Stage 1:

1. Inspect the actual stage state and report it plainly for Stages 1–2 (Approved / Pending / not started). Per §5.4 step 1, Stage 1–3 state is read from each artifact's own `status:` header in the module workspace, not from a new run's Run Manifest.
2. If Stage 1 and Stage 2 both show `Approved`: confirm with whoever invoked this workflow that the existing Project Context and Discovery Artifacts are still expected to be current for the module(s) this story touches. **Bring the computed answer to that conversation, not just the question** — `cli.js drift --run <prior-run>` (`run_manager.md` §5.8) reports whether the application actually moved in those paths since that run was anchored, so "are these still current?" is answered with evidence where an anchor exists, and explicitly as *unknown* where it does not.
3. If either stage is missing or not `Approved`: **do not proceed and do not assume.** Ask explicitly — per §5.4's options (Full Manual, Full Automation, Specific Stage with its input check and confirmation, or Other; with "continue from the first stage that is not Approved" vs "re-run from Stage 1" where some stages are already approved) — this workflow never silently substitutes a full pipeline run for its own narrower scope, and never silently proceeds against a missing/unapproved Project Context or Discovery baseline.
4. Once confirmed, **create the run as a refinement of the run whose artifacts it reuses** — a single command (`run_manager.md` §5.9, §5.10):

   ```bash
   node platform_core/tools/run_manager/cli.js refine <prior-run> \
     --scope UserStory --target "<story>" --reason "<what this story adds>" --scope-paths <paths>
   ```

   This creates a **new** run (never editing the prior one), records `inheritsFrom`/`supersedes` and every inherited artifact in `metadata/lineage.json` **and** in the Run Manifest's Cross-Run Reuse section (§5.11, discharging `pipeline.md` §7's "records the source run" obligation), anchors the new run to the application's **current** code state (§5.8), writes its Run Manifest, and activates it. `--dry-run` first shows what would be inherited and the drift, creating nothing.
5. **Act on the drift the refinement reports.** Where it says the application moved in the paths this story touches, the inherited Discovery findings covering those paths are *unverified against current code* — Step 2 treats them as such rather than as current (§5.9 Rule 4). The Manifest carries that implication in writing, so it is not left to memory.

## Step 2 — Test Design Skill *(Pipeline Stage 3 — shared, the divergence point)*

**Spec:** `.claude/skills/test-design-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Existing Approved Project Context (primary) · Existing Approved Discovery Artifacts (secondary) · this User Story's content (Run Scope) |
| **Contract keys consumed** | `project_context`, `discovery_artifacts` — both satisfied by the *existing, already-Approved* artifacts identified in Step 1, not freshly generated |
| **Output** | Manual Test Suite (Markdown + Excel) · Requirement Traceability Matrix · Coverage Report — all scoped to this story only |
| **Contract keys produced** | `manual_test_suite_md`, `manual_test_suite_xlsx`, `traceability_matrix`, `coverage_report` |
| **Checkpoint** | **Human Review Required** (QA Architect / Test Lead, per `pipeline/pipeline.md` §5.1) |

Per `.claude/skills/test-design-skill/SKILL.md` §16 ("User Story" strategy): at minimum one test case per enumerated acceptance criterion, and every carried-forward Assumption/Risk tied to this story gets its own explicitly tagged assumption-based test case. If the story's specific area was never independently exercised by the existing Discovery Artifacts, the agent's own existing rule applies — it records `"Not independently verified in Discovery"` (§5.1) rather than treating that as a blocker.

## Step 3M — Manual Execution Skill *(Pipeline Stage 4M — Manual branch, terminal)*

**Spec:** `.claude/skills/manual-execution-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Approved Manual Test Suite / Traceability Matrix / Coverage Report from Step 2 · existing Approved Project Context |
| **Contract keys consumed** | `manual_test_suite`, `traceability_matrix`, `coverage_report`, `project_context` |
| **Output** | Manual Execution Results · Manual Execution Summary · Manual Test Results CSV · Manual QA Report · Evidence, scoped to this story's test cases only |
| **Contract keys produced** | `manual_execution_results`, `manual_execution_summary`, `manual_test_results_csv`, `manual_qa_report`, `manual_execution_artifacts` |
| **Checkpoint** | **Human Review Required** (QA Lead / Test Lead, per `pipeline/pipeline.md` §5.1) — **terminal: approving releases the delivery and authorizes nothing downstream** |

Per `.claude/skills/manual-execution-skill/SKILL.md` §17 ("User Story" Run Scope): execute only the test cases traceable to this story's acceptance criteria — no opportunistic execution of unrelated suite content. Scope is narrowed further by the per-case `Review` gate: a case runs only at `Review = Approved`, and a `Pending`/`Rejected` case is recorded `Excluded` rather than silently dropped (§4.1 there).

**This branch self-reports and ends here.** It produces no script, no Automation Candidate Package (that artifact is removed from the platform, `pipeline.md` §3.3 #4), and no input to Step 3A.

## Step 3A — Automation Skill *(Pipeline Stage 4A — Automation branch)*

**Spec:** `.claude/skills/automation-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Approved Manual Test Suite from Step 2 (**scope *and* content source**) / Traceability Matrix / Coverage Report · existing Approved Project Context · existing Approved Discovery Artifacts (behavioural context only) · the Selector Verification KB and Repair KB (mandatory reads before generation, `pipeline.md` §10.8) · any existing Automation Package for this project |
| **Contract keys consumed** | `manual_test_suite`, `traceability_matrix`, `coverage_report`, `project_context`, `discovery_artifacts`, `selector_verification_kb`, `repair_kb`, `existing_automation_package` (optional) |
| **Output** | Automation Package (new assets for this story's in-scope cases, or reused/extended existing assets per the skill's own reuse-before-generate rule) · Target Write Plan · Selector Verification records |
| **Contract keys produced** | `automation_plan`, `automation_package`, `automation_manifest`, `automation_decision_report`, `automation_coverage_report`, `automation_suite_manifest`, `automation_summary`, `target_write_plan`, `selector_verification_records` |
| **Checkpoint** | **Automation Approval Required** (Automation Lead / Release Manager, per `pipeline/pipeline.md` §5.2) |

The Framework Decision Gate (`.claude/skills/automation-skill/SKILL.md` §31) still applies in full — this workflow does not pre-select a framework on the human's behalf.

**Scope comes from the approved Stage 3 suite, never from Step 3M.** A case is in scope only when `Review = Approved AND Automation = Approved` (`test-design-skill` §6.3.2). `Automation = Rejected` means the case stays manual by decision and is **not** reported as an automation coverage gap; `Pending` on either column means no decision has been made and the case is skipped. Generating nothing because no case is dual-approved is a correct, reportable outcome. A case whose Step 3M execution failed is **not** thereby excluded here — the two branches do not read each other's results (`pipeline.md` §3.3 #1).

## Step 4 — Automation Execution Skill *(Pipeline Stage 5A — Automation branch)*

**Spec:** `.claude/skills/automation-execution-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Approved Automation Package + Automation Summary from Step 3A · existing Approved Project Context |
| **Contract keys consumed** | `automation_suite`, `automation_summary`, `project_context`, `execution_mode` (must still be explicitly resolved per the skill's own §5.1 — never defaulted by this workflow) |
| **Execution scope** | Selective — only this story's newly generated/extended test cases, per `.claude/skills/automation-execution-skill/SKILL.md` §13 ("User Story" Run Scope Type: "execute only the test cases traceable to that story's acceptance criteria") |
| **Output** | Execution Results + evidence |
| **Contract keys produced** | `execution_results`, `execution_artifacts` |
| **Checkpoint** | *None — mechanical, gated only by Step 3A's Automation Approval* |

## Step 5 — Reporting Skill *(Pipeline Stage 6A — Automation branch, terminal)*

**Spec:** `.claude/skills/reporting-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Step 4's Execution Results · Step 2's Manual Test Suite + Traceability Matrix · existing Approved Project Context · Repair Summary, if Stage `5H` was invoked · existing Approved Project Context |
| **Contract keys consumed** | `execution_results`, `manual_test_suites`, `traceability_matrix`, `project_context` |
| **Output** | Final QA Report, scoped to this story — **Automation branch only**; the Manual branch self-reported at Step 3M and never reaches here (`pipeline.md` §3.3) |
| **Contract key produced** | `final_qa_report` |
| **Checkpoint** | *None — terminal stage* |

# 5. Reused (Not Regenerated) Artifacts

| Artifact | Path | Source |
|---|---|---|
| Project Context | `platform_core_data/modules/{module}/context/ProjectContext.md` | The Approved artifact in the module's own workspace — read at its current revision, not copied in |
| Discovery Artifacts | `platform_core_data/modules/{module}/discovery/` (QA Assessment Report, Findings Summary, Evidence) | The Approved artifacts in the module's own workspace — read at their current revision, not copied in |

These are **module** artifacts, not run artifacts: a module's design is durable and evolves in place, so this workflow resolves them from the Module Workspace at their current revision rather than reaching into whichever prior run last touched them (`module_architecture.md` §9.2 — run lineage now relates *executions* to each other; design artifacts resolve from the module registry).

Per `workflows_and_pipelines/pipeline/pipeline.md` §7, this workflow **references** each artifact by its own path and records the exact revision it consumed in this run's `moduleArtifactRefs[]` and Run Manifest (`platform_core_data/runs/{{RUN_FOLDER}}/metadata/RunManifest.md`) — it never copies a module artifact into the run folder, because the copy would immediately begin to diverge from the original. Neither artifact is regenerated by this workflow. If either does not exist or is not `Approved`, Step 1's Stage-State Check stops the workflow and asks how to proceed — it does not fabricate a substitute.

# 6. Generated Artifacts

| Artifact | Path | Produced By |
|---|---|---|
| Manual Test Suite (Markdown) | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.md` | Test Design Skill |
| Manual Test Suite (Excel) | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.xlsx` | Test Design Skill — generated from the Markdown by `platform_core/tools/test_suite_export/cli.js` (`test-design-skill/SKILL.md` §9.1), never authored separately |
| Requirement Traceability Matrix | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md` | Test Design Skill |
| Coverage Report | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.md` | Test Design Skill |
| Manual Execution Results | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionResults.md` | Manual Execution Skill |
| Manual Execution Summary | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionSummary.md` | Manual Execution Skill |
| Manual Test Results CSV | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualTestResults.csv` | Manual Execution Skill |
| Manual QA Report | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualQAReport.md` | Manual Execution Skill — the Manual branch self-reports (`pipeline.md` §3.3) |
| Automation Package + supporting reports | `platform_core_data/modules/{{MODULE_SLUG}}/automation/tests_{Framework}/` and siblings | Automation Skill |
| Execution Results | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md` | Automation Execution Skill |
| Final QA Report | `platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md` | Reporting Skill |
| Run Summary | `platform_core_data/runs/{{RUN_FOLDER}}/metadata/run_summary.md` | Run Manager |

`{{RUN_FOLDER}}` resolves to this run's own folder name, per `workflows_and_pipelines/pipeline/run_manager.md` §5.1 (e.g. `run-007__2026-07-27_11-20-33__UserStory__US-245_AddCabinClassFilter`) — see `platform_core_data/knowledge_base/onboarding.md`.

# 7. Success Criteria

- [ ] Step 1's Stage-State Check confirms Stages 1–2 are `Approved` before Stage 3 launches (or the human explicitly chose an alternative path).
- [ ] Test Design output covers every acceptance criterion in the story, each with a populated `Acceptance Criteria Reference` (`.claude/skills/test-design-skill/SKILL.md` §5.4).
- [ ] Manual Execution Results cover exactly this story's test cases, with every `Pending`/`Rejected` case reported `Excluded` rather than dropped, before Human Review approval.
- [ ] An Automation Decision is recorded for every test case in scope at Stage `4A` (`Review = Approved AND Automation = Approved`); Automation Approval is granted.
- [ ] Execution Results cover exactly this story's test cases — no unrelated suite content opportunistically included.
- [ ] Final QA Report is produced and clearly scoped to this story.

# 8. Failure Criteria

- Stage 1 or Stage 2 artifacts are missing/not `Approved` and the workflow proceeds anyway (a rule violation — see §9).
- Test Design widens scope beyond this story's acceptance criteria without it being a deliberate, disclosed Human Decision.
- Any required checkpoint is bypassed.

# 9. Rules

1. **This workflow never re-runs Stage 1 or Stage 2** — it consumes their existing Approved outputs unchanged. If they don't exist or aren't current, Step 1 stops and asks; it does not run them itself (that would make this workflow indistinguishable from a full pipeline run, which already exists).
2. **Intake routing (Step 0) always runs first**, before the Stage-State Check and before any run is created. Feature-vs-CRUD is a Human Decision (`pipeline/pipeline.md` §5.5, §5.7) and is never inferred from the story title.
2b. **The Stage-State Check (§4 Step 1) always runs first** — never assumed, never skipped, per `pipeline/pipeline.md` §5.4's existing "never choose on the human's behalf" rule.
3. **All applicable checkpoints from `pipeline/pipeline.md` §5 still apply in full** — Human Review at Stage 3 and Stage `4M`, Automation Approval at Stage `4A`.
5. **The branches never cross.** Step 3M's results never bound Step 3A's scope, and Step 3A never reads a Manual branch artifact (`pipeline/pipeline.md` §3.3). Running only one branch is a complete execution of that pipeline, not a partial run.
4. **Scope never widens beyond this story's acceptance criteria** without an explicit, disclosed Human Decision (`pipeline/pipeline.md` §5.5) — an adjacent feature staying out of scope is documented, not silently folded in.

# 10. Relationship to the Platform Architecture

This workflow does not introduce a new pipeline, stage, or skill. It is a **reusable, scoped invocation** of Stage 3 plus both branches that diverge from it (`4M`; `4A` → `5A` → optional `5H` → `6A`) within the existing eight-stage, two-pipeline architecture, conditioned on Stages 1–2 already being satisfied. A full pipeline run remains the platform's standard execution mode for a new project or a genuinely new exploration pass; User Story Run exists alongside it for the common case of adding one story to an already-explored application.

# 11. Example

*Illustrative only — not executed as part of this task.*

```text
Workflow: User Story Run
Run Scope: User Story — "As an Admin, I want to filter the Employee List by
           Sub Unit so that I can quickly find employees in a given department."
```

Hypothetical result: the Stage-State Check finds Stage 1 (`ProjectContext.md`, rev 2) and Stage 2 Approved and current; the Test Design Skill produces `TestCases_PIM.md`/`.xlsx` scoped to this one filter behavior, each case citing its Acceptance Criteria Reference, and clears Human Review; a reviewer marks the cases `Review: Approved` and `Automation: Approved` in the workbook and runs `--import-lifecycle`. The two branches then proceed independently: the Manual Execution Skill executes the approved cases headed against the live application, self-reports its Results, CSV, and Manual QA Report, and clears its terminal Human Review; separately, the Automation Skill takes the same approved cases as its scope, verifies each locator live and headless, extends the existing `tests_Playwright/` package, and clears Automation Approval; the Automation Execution Skill runs only those new cases; the Reporting Skill produces a Final QA Report covering the Automation branch, scoped to this story alone.
