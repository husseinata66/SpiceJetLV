> **Position:** A reusable workflow specification, layered on top of [`workflows_and_pipelines/pipeline/pipeline.md`](../pipeline/pipeline.md) and [`workflows_and_pipelines/pipeline/run_manager.md`](../pipeline/run_manager.md). It does not modify either document, does not modify any Skill specification under [`.claude/skills/`](../../.claude/skills/), and does not change the platform's two-pipeline, eight-stage architecture — it defines one specific, narrow-scoped *invocation* of the three shared stages that both pipelines begin with.
> **Status:** Current. This document defines the workflow; authoring it produced no run or project artifact.

# 1. Workflow Name

**First Run**

# 2. Purpose

This workflow validates that the platform is **operational** — that the Run Manager, Project Context Skill, Explorer Skill, and Test Design Skill can each execute correctly, in order, and hand off a usable artifact to the next stage.

**Its objective is NOT full software testing.** It is a narrow, fast, end-to-end smoke check of the pipeline machinery itself: can a run be initialized, can requirements be captured, can the application be explored with evidence, and can test cases be designed from the result — not "is this application free of defects." A clean pass proves the platform works; it does not constitute a QA sign-off on the application.

# 3. Scope

| | |
|---|---|
| **Module** | Login |
| **Module scope** | `single` — exactly one module active |

Only the Login module is included. No other module may be explored, tested, or referenced as in-scope by any stage of this workflow.

The constraint is enforced in two places that agree with each other:

1. **Mechanically — the active-module pointer.** `activeModules: ["login"]` with `activeScope: single` in `platform_core_data/modules/modules.json`. Every stage resolves the module it works in from that pointer, so "Login only" is a fact on disk rather than an instruction a stage has to remember (`module_architecture.md` §6).
2. **Descriptively — the Run Configuration.** Stage 1 is told to declare Login's own in-scope areas, and to record what belongs to *other* modules in its Out of Scope section, naming the owning module (`project-context-skill` §3.1). The Project Context Skill's specification is unmodified; this workflow only supplies the input it already declares.

Every downstream stage respects that boundary as documented in its own specification (e.g. `.claude/skills/explorer-skill/SKILL.md` §9 Execution Rule 1: "Must not explore any module the Project Context marks 'Out of Scope.'").

**On a fresh install, `login` does not exist yet.** Stage 1 proposes it — along with every other module the PRD implies — and a human approves it at Stage 1's gate before it is scaffolded. This workflow's Step 1 covers activating it once it exists; Step 2 covers the first-time case.

# 4. Execution Flow

This workflow runs exactly three Skill stages, orchestrated by the Run Manager, and then stops deliberately. Workflow step numbers below are local to this document; the corresponding Pipeline Stage number from `workflows_and_pipelines/pipeline/pipeline.md` §4 is noted for cross-reference.

```
 1. Run Manager
      │
      ├─ Prepare Workspace         (workflows_and_pipelines/pipeline/run_manager.md §6)
      │
      ├─ Generate Run Metadata     (run.json — workflows_and_pipelines/pipeline/run_manager.md §7)
      │
      ├─ Create Run Manifest       (workflows_and_pipelines/pipeline/pipeline.md §7)
      │
      └─ Launch Stage 1
              │
              ▼
 2. Project Context Skill            [= Pipeline Stage 1]
      │  ⛔ Human Review Required ⛔
              │ (approved)
              ▼
 3. Explorer Skill                   [= Pipeline Stage 2]
      │  ⛔ Human Review Required ⛔
              │ (approved)
              ▼
 4. Test Design Skill                [= Pipeline Stage 3]
      │  ⛔ Human Review Required ⛔
              │ (approved)
              ▼
      Stop Workflow
      (the Manual Execution, Automation, Automation Execution, Self-Healing,
       and Reporting Skills are intentionally excluded from this workflow)
```

## Step 1 — Run Manager and Module selection

Before any Agent runs, two pointers must resolve: **which module** and **which run**.

1. **Create the run** — one command does the whole of what used to be four manual steps (`run_manager.md` §5.10):

   ```bash
   node platform_core/tools/run_manager/cli.js new \
     --scope UserStory --target Login --workflow first_run --scope-paths <in-scope paths> \
     --modules login
   ```

   `--modules` names the run's module, so the run is numbered within it (`login-run-001`); use
   `--feature <F> (--supplier <S> | --shared-scope <SS>)` for a Supplier Feature run (`run_manager.md` §5.1.1).

   It generates the folder name (§5.5 — never hand-formatted), creates the Run Workspace (§6), writes `run.json` **with the Target Project code-state anchor** (`targetRef`, §5.8), creates `metadata/RunManifest.md` from its template (§5.11), and **activates the run** (§5.7). Where the anchor cannot be captured, that is recorded as a declared gap rather than left silent.

2. **Activate the module** — if `login` already exists:

   ```bash
   node platform_core/tools/module_manager/cli.js active --json   # what is active now?
   node platform_core/tools/module_manager/cli.js use login       # activate it (sticky)
   ```

   **If it does not exist, do not create it here.** Proceed to Step 2 with nothing active: Stage 1 proposes the decomposition, the reviewer approves it at Stage 1's existing gate, and only then is `login` scaffolded and activated. The Run Manager is explicitly forbidden from creating a module (`run_manager.md` §3, §10 Rule 7), and so is this workflow — a module nobody approved would be a module nobody agreed should be tested.

3. **Launch Stage 1** — hand off to the Project Context Skill, having set run Status to `Running`. As each stage completes or a checkpoint resolves, record it in **both** ledgers:

   ```bash
   node platform_core/tools/run_manager/cli.js stage "<Stage>" --status <status> --reviewer <who>
   node platform_core/tools/module_manager/cli.js stage login <context|discovery|test_design> \
     --status <status> --artifact <path> --run <run-folder>
   ```

   The two records answer different questions and are both needed: the Run Manifest answers *where is this run right now?*, and the module registry answers *where does Login stand, across every run?*

The Run Manager takes no further action of its own until a stage signals completion, error, or a checkpoint is reached (`run_manager.md` §8) — it does not analyze, and does not influence, what any Skill produces. It also never writes under `modules/`: that is the Module Manager's mandate.

## Step 2 — Project Context Skill *(Pipeline Stage 1)*

**Spec:** `.claude/skills/project-context-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | PRD · Supporting Documents · Run Configuration (declaring Login as the sole In Scope module, per §3 above) |
| **Contract keys consumed** | `prd`, `run_configuration` (per the skill's own `inputs` contract) |
| **Output** | Project Context — `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` |
| **Contract key produced** | `project_context` |
| **Checkpoint** | **Human Review Required** (Business Analyst / Product Owner, per `workflows_and_pipelines/pipeline/pipeline.md` §5.1) |

The workflow does not proceed to Step 3 until this checkpoint is explicitly approved.

## Step 3 — Explorer Skill *(Pipeline Stage 2)*

**Spec:** `.claude/skills/explorer-skill/SKILL.md` — unmodified. See §5 below for the First-Run-specific objectives this workflow asks the (unchanged) Explorer Skill to apply.

| | |
|---|---|
| **Input** | Project Context · Running Application |
| **Contract keys consumed** | `project_context` (Step 2's `project_context` output, re-supplied unchanged), `discovery_source` |
| **Output** | Discovery Report (`platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md`) · Findings Summary (`platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/Findings_Summary.md`) · Evidence Packages (`platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/FINDING-{ID}_{ShortName}/`) |
| **Contract keys produced** | `qa_assessment_report`, `findings_summary`, `evidence_packages`, `discovery_snapshots`, `timeline`, `coverage_summary` |
| **Checkpoint** | **Human Review Required** (QA Lead, per `workflows_and_pipelines/pipeline/pipeline.md` §5.1) |

Note: `.claude/skills/explorer-skill/SKILL.md` also always produces per-screen discovery snapshots (`platform_core_data/modules/{{MODULE_SLUG}}/discovery/*.md`) as a standing, non-optional part of its output (its own §9 Execution Rule 4) — that continues to happen as part of this step even though this workflow's artifact list in §6 groups them together with the Discovery Report rather than naming them separately.

The workflow does not proceed to Step 4 until this checkpoint is explicitly approved.

## Step 4 — Test Design Skill *(Pipeline Stage 3)*

**Spec:** `.claude/skills/test-design-skill/SKILL.md` — unmodified.

| | |
|---|---|
| **Input** | Project Context (primary) · Discovery Report / Discovery Artifacts (secondary) |
| **Contract keys consumed** | `project_context` (Step 2's output, re-supplied unchanged), `discovery_artifacts` (satisfied by Step 3's `qa_assessment_report`/`findings_summary`/`evidence_packages`) |
| **Output** | Manual Test Suite (Markdown) · Manual Test Suite (Excel) · Requirement Traceability Matrix |
| **Contract keys produced** | `manual_test_suite_md`, `manual_test_suite_xlsx`, `traceability_matrix`, `coverage_report` |
| **Checkpoint** | **Human Review Required** (QA Architect / Test Lead, per `workflows_and_pipelines/pipeline/pipeline.md` §5.1) |

## Stop Workflow

Once Step 4's checkpoint is approved, this workflow ends. The following stages are **intentionally excluded** from First Run and must not be launched under this workflow:

- Manual Execution Skill (Stage `4M` — Manual branch)
- Automation Skill (Stage `4A` — Automation branch)
- Automation Execution Skill (Stage `5A` — Automation branch)
- Self-Healing Skill (Stage `5H` — Automation branch, optional)
- Reporting Skill (Stage `6A` — Automation branch)

Excluding these stages from *this workflow* does not remove them from the platform's architecture — a full run of either pipeline (per `workflows_and_pipelines/pipeline/pipeline.md`) still includes every stage of the branch it takes. First Run stops at the end of the **shared foundation** (Stages 1–3), which is exactly the divergence point: from its output, either branch may then be run, in any order, or both (`pipeline.md` §3.3).

# 5. Explorer Objectives (First-Run-Specific Direction)

These are instructions this workflow gives to the unmodified Explorer Skill for its Step 3 invocation — they invoke existing Explorer Skill capabilities (`.claude/skills/explorer-skill/SKILL.md`) with a narrowed scope, not new behavior:

1. **Explore only the Login module.** No other module may be visited, per §3.
2. **Capture screenshots whenever applicable**, per the Explorer Skill's existing Evidence Collection and Smart Evidence Collection rules (`.claude/skills/explorer-skill/SKILL.md` §5.9–§5.10).
3. **Capture video whenever supported**, per the same evidence rules.
4. **Collect console logs whenever supported**, per the same evidence rules.
5. **Collect network logs whenever supported**, per the same evidence rules.
6. **Apply the Retry Policy** exactly as specified in `.claude/skills/explorer-skill/SKILL.md` §5.6 — no first-run-specific override of retry counts or categories.
7. **Apply Investigation Mode** exactly as specified in `.claude/skills/explorer-skill/SKILL.md` §5.7 — boundary conditions for any Validation, Navigation, or Authorization candidate encountered within the Login module (e.g., empty/invalid credentials, session expiration on the login screen, direct URL access to a post-login route while unauthenticated).
8. **Generate Findings only when supported by evidence.** Per `.claude/skills/explorer-skill/SKILL.md` §9 Execution Rule 11 and its Core Philosophy (§4): no Finding is published without a complete evidence package; an observation that cannot be backed by evidence is logged as an Open Question in the Discovery Report instead.

This workflow does not loosen, tighten, or otherwise alter any Explorer Skill rule — it only narrows *where* it looks (Login only) while leaving *how* it investigates and reports entirely governed by the Explorer Skill's own specification.

# 6. Generated Artifacts

| Artifact | Path | Produced By |
|---|---|---|
| Project Context | `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` | Project Context Skill |
| Discovery Report | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md` | Explorer Skill |
| Findings Summary | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/Findings_Summary.md` | Explorer Skill |
| Evidence Packages | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/FINDING-{ID}_{ShortName}/` | Explorer Skill |
| Manual Test Suites (Markdown) | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_Login.md` | Test Design Skill |
| Manual Test Suites (Excel) | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_Login.xlsx` | Test Design Skill |
| Requirement Traceability Matrix | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md` | Test Design Skill |
| Run Summary | `platform_core_data/runs/{{RUN_FOLDER}}/metadata/run_summary.md` | Run Manager |

# 7. Success Criteria

The workflow is successful only if **all** of the following hold:

- [ ] Run Manager completes successfully (Run Workspace created, `run.json` maintained throughout, no initialization error).
- [ ] Project Context is generated and clears its Human Review checkpoint.
- [ ] Explorer completes without interruption (no crash, no unhandled error) within the Login-only scope.
- [ ] Evidence is collected for every Finding the Explorer Skill raises (per its own §9 Execution Rule 11 — no Finding without an evidence package).
- [ ] Discovery Report is generated and clears its Human Review checkpoint.
- [ ] Manual Test Suites are generated in **both** Markdown and Excel form.
- [ ] Requirement Traceability Matrix is generated.
- [ ] Run Summary is generated with Overall Status `Completed`.

# 8. Failure Criteria

The workflow fails if **any** of the following occur:

- Run initialization fails (Run Manager cannot allocate a Run ID or create the Run Workspace).
- Project Context cannot be generated.
- Explorer crashes (an unhandled error stops exploration before the Login module is covered).
- Evidence cannot be collected for a Finding that is nonetheless reported (a violation of the Explorer Skill's own no-Finding-without-evidence rule) — the correct behavior in that situation is to log an Open Question instead, per §5 item 8; failing to do so is itself a workflow failure.
- Any of the required artifacts listed in §6 is missing at the point the workflow stops.

On failure, the Run Manager records Status `Failed` in `run.json` and `run_summary.md` reflects that Overall Status — per `workflows_and_pipelines/pipeline/run_manager.md` §8, the Run Manager only records this mechanically; it does not diagnose *why* the failure occurred.

# 9. Rules

1. **The workflow must stop immediately whenever a Human Review checkpoint is reached.** No stage proceeds past its own checkpoint on its own initiative — see `workflows_and_pipelines/pipeline/pipeline.md` §5.3, unmodified and fully in effect here.
2. **The next stage may execute only after approval.** An open (`Pending`) checkpoint blocks the next stage exactly as `workflows_and_pipelines/pipeline/pipeline.md` §5.3 Rule 5 requires.
3. **The workflow never skips a stage.** Steps 2, 3, and 4 (§4) each run in full, in order, every time this workflow executes.
4. **The workflow never executes excluded stages.** The Manual Execution, Automation, Automation Execution, Self-Healing, and Reporting Skills (§4, "Stop Workflow") must not be launched under this workflow under any circumstance, including on retry after a failure — retrying First Run means re-running Steps 1–4, not extending into the excluded stages.

# 10. Relationship to the Platform Architecture

This workflow does not introduce a new pipeline, a new stage, or a new Skill. It is a **reusable, scoped invocation** of the **shared** first three stages defined in `workflows_and_pipelines/pipeline/pipeline.md`, orchestrated by the existing Run Manager defined in `workflows_and_pipelines/pipeline/run_manager.md`. A full run of either pipeline remains the platform's standard execution mode; First Run exists alongside it as a fast operational check, not a replacement — and because it ends precisely at the divergence point, its output is directly usable by whichever branch is chosen next.

# 11. Example

*Illustrative only — not executed as part of this task.*

```text
Workflow: First Run
Module: Login
```

Hypothetical result: Run Manager generates the folder name `run-001__2026-07-06_09-30-00__UserStory__Login` and creates its workspace under `platform_core_data/runs/run-001__2026-07-06_09-30-00__UserStory__Login/`; the Project Context Skill produces `ProjectContext.md` scoped to Login only (In Scope: Login; Out of Scope: everything else) and it clears Human Review; the Explorer Skill explores only the Login screen and its immediate boundary conditions (invalid credentials, empty fields, session expiration, direct URL access while unauthenticated), producing `QA_Assessment_Report.md`, a `Findings_Summary.md` with, say, two Findings (e.g., a `Security Concern` around missing lockout behavior, status `Needs Human Review`, and a `UX Issue` around an unclear error message, status `Needs Human Review`), each with a complete evidence package, and clears its own Human Review checkpoint; the Test Design Skill produces `TestCases_Login.md` / `.xlsx` and `TraceabilityMatrix.md` and clears its checkpoint; the workflow then stops, Automation/Execution/Reporting are never invoked, and the Run Manager publishes `run_summary.md` with Overall Status `Completed`.
