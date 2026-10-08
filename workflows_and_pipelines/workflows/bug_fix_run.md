> **Position:** A reusable workflow specification, layered on top of [`pipeline/pipeline.md`](../pipeline/pipeline.md), [`pipeline/run_manager.md`](../pipeline/run_manager.md), and [`pipeline/run_scope.md`](../pipeline/run_scope.md). It does not modify any of those documents, does not modify any Skill specification under [`.claude/skills/`](../../.claude/skills/), and does not change the platform's two-pipeline, eight-stage architecture — it defines one specific, narrow-scoped *invocation* of the Automation branch (Stage `5A`, called twice, around a conditional Stage `4A`, then Stage `6A`) against an already-existing regression test case for a reported bug.
> **Status:** Current. This document defines the workflow; authoring it produced no run or project artifact.

# 1. Workflow Name

**Bug Fix Run**

# 2. Purpose

This workflow reproduces a reported bug against the application's **current** state, gets the corresponding regression automation into a state that correctly asserts the fix, re-executes to confirm, and reports the outcome — **without re-running Stage 1 (Project Context), Stage 2 (Explorer), or Stage 3 (Test Design)**.

It is deliberately narrow: it assumes the bug is **already a known Finding with a dispositioned regression test case** (`.claude/skills/test-design-skill/SKILL.md` §5.3, "Regression test" disposition) sitting in an already-Approved Manual Test Suite — i.e., Stage 3 has already done the work of deciding this defect gets a test case and writing its Expected Result to reflect the *corrected*, not the buggy, behavior. This workflow's job is purely to run that test case now, react to what it finds, and close the loop.

**This is distinct from Self-Healing** (Stage `5H`, [`.claude/skills/self-healing-skill/SKILL.md`](../../.claude/skills/self-healing-skill/SKILL.md)), which repairs a *broken automation script* (selector drift, stale reference) when the application itself is not at fault. Stage `5H` is **optional and never automatic** — no failing execution triggers it and no orchestrator may chain into it; a human invokes it explicitly (`pipeline.md` §3.6). This workflow instead covers the case where the **application's behavior itself** is what's being validated across time — before a fix (bug confirmed) and after one (regression confirmed) — which is why it spans two separate Stage `5A` invocations around one conditional Stage `4A` invocation, rather than a repair pass over the existing script.

# 3. Precondition (checked, never assumed)

This workflow requires, already `Approved`, from a prior run:

- A Project Context covering the affected module.
- A Manual Test Suite / Traceability Matrix / Coverage Report containing the regression test case tied to this bug's Finding (`.claude/skills/test-design-skill/SKILL.md` §5.3).
- An Automation Package that has a Reuse/Generate decision recorded for that test case (it may be `Manual Only` or `Partially Automatable` from a prior run — see §4 Step 2 for what happens then). That decision was taken by Stage `4A` from the approved Stage 3 suite and its own live verification — **not** from any Manual Execution outcome, and not from an Automation Candidate Package, which is removed from the platform (`pipeline.md` §3.3 #4). This precondition therefore assumes only that Stage `4A` already ran for this test case in a prior pass; whether Stage `4M` ever ran is irrelevant here, and this workflow re-invokes neither.

**If no such test case exists yet** (this is a genuinely new bug report with no prior Test Design pass), this workflow does not apply. Step 1's Stage-State Check will surface that gap and ask how to proceed — e.g., routing to a Bug-scoped Stage 3 invocation first — rather than this workflow silently fabricating a test case (the Test Design Skill's own exclusive responsibility, never the Automation, Manual Execution, or Automation Execution Skill's).

# 4. Execution Flow

```
 1. Run Manager
      │
      ├─ Stage-State Check          (pipeline/pipeline.md §5.4, applied here —
      │                               confirms the precondition in §3 above)
      │
      └─ [if precondition satisfied] Launch Stage 5A (reproduction)
              │
              ▼
 2. Automation Execution Skill — Reproduction   [= Pipeline Stage 5A, 1st invocation]
      │  runs the EXISTING automation for this bug's regression test case
      │  (mechanical — gated by the ORIGINAL Automation Approval already granted)
              │
              ▼
      ┌───────┴───────────────────────────────────────────┐
      │ Result of Step 2 determines what happens next:      │
      │  • Application Failure (bug still present)           │
      │      → confirms the bug; fix is a developer action,  │
      │        outside this workflow; STOP here and report   │
      │  • Automation Failure (script broken, app unaffected) │
      │      → out of this workflow's scope. Stage 5A        │
      │        classifies it and stops there; repairing it     │
      │        is Stage 5H, which a human must invoke          │
      │  • Passed, but no automation existed yet               │
      │      (test case was Manual Only / Partially Automatable)│
      │      → proceed to Step 3                              │
      │  • Passed, automation already covers it fully           │
      │      → proceed directly to Step 5 (nothing to automate) │
      └───────┬───────────────────────────────────────────┘
              ▼
 3. Automation Skill (conditional)    [= Pipeline Stage 4A]
      │  ⛔ Automation Approval Required ⛔
              │ (approved)
              ▼
 4. Automation Execution Skill — Verification    [= Pipeline Stage 5A, 2nd invocation]
      │  (mechanical — gated by Step 3's fresh Automation Approval)
              ▼
 5. Reporting Skill                   [= Pipeline Stage 6A]
              │
              ▼
      Stop Workflow
```

## Step 1 — Run Manager & Stage-State Check

Per the same mechanism as `workflows_and_pipelines/workflows/user_story_run.md` §4 Step 1 (`pipeline/pipeline.md` §5.4, extended to this workflow's entry point):

1. Inspect the Run Manifest and confirm, plainly: Stage 1 Approved, Stage 3 Approved with this bug's regression test case present and traceable to its Finding ID, and an existing Automation Package with a recorded decision for that test case.
2. If any of these is missing: **stop and ask** — never assume a test case exists, never invent one, never silently fall back to running Stage 3 without being asked to.
3. Once confirmed, **create the run** (`run_manager.md` §5.10): `cli.js new --scope Targeted --target "<bug>" --workflow bug_fix_run --scope-paths <paths>`, plus the owner flags for the bug's module or Feature (`--modules <m>`, or `--feature <F> --supplier <S>`; §5.1.1) — which names it, anchors it to the application's current code state (§5.8), writes its Run Manifest (§5.11), and activates it (§5.7). Where this bug's regression test came from an earlier run, use `cli.js refine <prior-run>` instead so the inheritance and its drift are recorded (§5.9).
4. **Check drift before trusting the existing automation.** This workflow repairs automation against the application's *current* state, so run `cli.js drift --run <prior-run>` (§5.8) for the run that produced the failing script. A `moved` result names the changed paths — which is precisely the evidence distinguishing "the automation is stale" (selector drift, an `Automation Failure`) from "the application regressed" (an `Application Failure`), the judgment this workflow exists to make.
5. Then proceed to Step 2.

## Step 2 — Automation Execution Skill, Reproduction *(Pipeline Stage 5A, 1st invocation)*

**Spec:** `.claude/skills/automation-execution-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Existing Approved Automation Package (specifically the script for this bug's regression test case) · existing Approved Project Context |
| **Contract keys consumed** | `automation_suite`, `automation_summary`, `project_context`, `execution_mode` (must still be explicitly resolved, never defaulted) |
| **Execution scope** | Selective Re-run — only the test case(s) tied to this bug's Finding, per `.claude/skills/automation-execution-skill/SKILL.md` §13 ("Bug Validation" Run Scope Type: "the specific reproduction and regression test case(s) tied to the Finding first") |
| **Output** | Execution Results, classified per the skill's own full Result Classification (§17) |
| **Contract keys produced** | `execution_results`, `execution_artifacts` |
| **Checkpoint** | *None — mechanical, gated by the Automation Approval already granted when this package was first generated* |

The result's classification determines the branch taken next — see the diagram in §4. Stage `5A` **classifies and hands off, never repairs** (`.claude/skills/automation-execution-skill/SKILL.md` §25). An `Automation Failure` here is therefore not fixed inside this step and does not invoke this workflow's Step 3: repairing it is Stage `5H`'s exclusive responsibility, and Stage `5H` runs only if a human explicitly invokes it (`pipeline.md` §3.6).

## Step 3 — Automation Skill, Conditional *(Pipeline Stage 4A)*

**Spec:** `.claude/skills/automation-skill/SKILL.md` — unmodified.

Invoked **only** when Step 2 shows the application now passing but the regression test case was not previously fully automated (its recorded decision was `Manual Only` or `Partially Automatable`). If the test case already had full automation and Step 2 already confirms the fix, this step is skipped and the workflow proceeds directly to Step 5 — there is nothing for the Automation Skill to generate.

| | |
|---|---|
| **Input** | The same Approved Manual Test Suite / Traceability Matrix / Coverage Report from the prior Stage 3 run (unchanged — this workflow does not re-invoke Test Design) · existing Approved Project Context · the existing Automation Package |
| **Contract keys consumed** | `manual_test_suite`, `traceability_matrix`, `coverage_report`, `project_context`, `existing_automation_package` |
| **Output** | Updated Automation Package with this test case now fully automated |
| **Contract keys produced** | `automation_package`, `automation_decision_report`, `automation_summary` (and siblings, unchanged in shape) |
| **Checkpoint** | **Automation Approval Required** (Automation Lead / Release Manager, per `pipeline/pipeline.md` §5.2) |

Per `.claude/skills/automation-skill/SKILL.md`'s own rules: this step never modifies the Manual Test Case itself (its Expected Result was already written by Stage 3 to reflect the corrected behavior) and never invents business logic — it only generates the automation code the test case's Expected Result already specifies.

## Step 4 — Automation Execution Skill, Verification *(Pipeline Stage 5A, 2nd invocation)*

**Spec:** `.claude/skills/automation-execution-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Step 3's newly Approved Automation Package · existing Approved Project Context |
| **Contract keys consumed** | `automation_suite`, `automation_summary`, `project_context` |
| **Execution scope** | Selective Re-run — the same test case(s) as Step 2 |
| **Output** | Execution Results confirming the fix |
| **Contract keys produced** | `execution_results`, `execution_artifacts` |
| **Checkpoint** | *None — mechanical, gated by Step 3's fresh Automation Approval* |

This step is skipped only in the branch where Step 3 itself was skipped (automation already existed and Step 2 already confirmed the fix) — in that case Step 2's own Execution Results are what Step 5 reports against; no redundant re-run is performed.

## Step 5 — Reporting Skill *(Pipeline Stage 6A — terminal)*

**Spec:** `.claude/skills/reporting-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Whichever Execution Results are final (Step 2's or Step 4's, per the branch taken) · existing Approved Manual Test Suite + Traceability Matrix · existing Approved Project Context |
| **Contract keys consumed** | `execution_results`, `manual_test_suites`, `traceability_matrix`, `project_context` |
| **Output** | Final QA Report, scoped to this bug — states plainly whether the bug was confirmed present, confirmed fixed, or (if Step 2 alone was terminal) still open |
| **Contract key produced** | `final_qa_report` |
| **Checkpoint** | *None — terminal stage* |

# 5. Generated Artifacts

| Artifact | Path | Produced By |
|---|---|---|
| Execution Results (reproduction) | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults_{Execution ID}.md` | Automation Execution Skill (Step 2) |
| Updated Automation Package (if Step 3 ran) | `platform_core_data/modules/{{MODULE_SLUG}}/automation/tests_{Framework}/` | Automation Skill |
| Execution Results (verification, if Step 4 ran) | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults_{Execution ID}.md` | Automation Execution Skill (Step 4) |
| Final QA Report | `platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md` | Reporting Skill |
| Run Summary | `platform_core_data/runs/{{RUN_FOLDER}}/metadata/run_summary.md` | Run Manager |

`{{RUN_FOLDER}}` resolves to this run's own folder name, per `workflows_and_pipelines/pipeline/run_manager.md` §5.1 (e.g. `run-012__2026-07-27_13-05-44__Targeted__BUG-118_SeatMapCrash`) — see `platform_core_data/knowledge_base/onboarding.md`.

# 6. Success Criteria

- [ ] Step 1 confirms the precondition (§3) before any stage launches — never assumed.
- [ ] Step 2 produces a definitive Result Classification for the reproduction attempt (never left `Inconclusive` without being reported as such).
- [ ] If Step 3 ran, Automation Approval is granted before Step 4 executes anything.
- [ ] The Final QA Report states plainly whether this run confirms the bug fixed, confirms it still present, or leaves it open, and why.

# 7. Failure Criteria

- The precondition (§3) is not satisfied and the workflow proceeds anyway.
- Step 3 modifies the Manual Test Case's Expected Result instead of only generating automation against the existing, already-correct expectation (a violation of `.claude/skills/automation-skill/SKILL.md`'s own rules).
- Automation Approval is bypassed before Step 4.

# 8. Rules

1. **This workflow never re-runs Stages 1–3.** It consumes their existing Approved outputs unchanged; if any is missing, Step 1 stops and asks (§3).
2. **The Stage-State Check (§4 Step 1) always runs first**, per the same rule as `workflows_and_pipelines/workflows/user_story_run.md` §9 Rule 2.
3. **Step 3 (Automation Skill) is conditional, not automatic** — it runs only when Step 2's result requires new or extended automation; it is never invoked merely because this workflow was started.
4. **This workflow never substitutes for Self-Healing** (Stage `5H`, `.claude/skills/self-healing-skill/SKILL.md`) — a broken-script `Automation Failure` is repaired only by Stage `5H`, on explicit human invocation, never by this workflow's Step 3 and never automatically inside Stage `5A`.
5. **All applicable checkpoints still apply in full** — Automation Approval before Step 4, whenever Step 3 runs.

# 9. Relationship to the Platform Architecture

This workflow does not introduce a new pipeline, stage, or skill. It is a **reusable, scoped invocation** of the Automation branch — Stage `5A` (twice, around a conditional Stage `4A`) plus the terminal Stage `6A` — conditioned on Stages 1–3 and a prior Stage `4A` pass already being satisfied for this specific bug. A full pipeline run, or `workflows_and_pipelines/workflows/user_story_run.md`, remain the paths for a genuinely new requirement; Bug Fix Run exists alongside them for validating a defect already captured as a Finding with a designed regression test case.

# 10. Example

*Illustrative only — not executed as part of this task.*

```text
Workflow: Bug Fix Run
Bug: FINDING-003 — "Forgot Password must not time out for a valid,
     existing username" (regression test case TC-LOGIN-004, disposition:
     Regression test, per a prior Test Design run)
```

Hypothetical result: Step 1 confirms `ProjectContext.md`, the Login Manual Test Suite (with `TC-LOGIN-004`), and an existing Playwright automation package are all Approved; Step 2 re-runs `TC-LOGIN-004`'s existing script and it now Passes (the corrected, non-timing-out behavior is observed) — automation for this case already existed in full, so Step 3 is skipped; Step 5 (Reporting) produces a Final QA Report stating FINDING-003's regression test case now passes, confirming the fix, with no further automation work required.
