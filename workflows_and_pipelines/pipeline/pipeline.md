# Agentic AI Testing Platform — Pipeline Specification

**Type:** Reusable pipeline orchestration specification
**Status:** Current, and exercised. This document is a specification, not a run record; the process it defines has been executed against the hosted project — see `platform_core_data/runs/` for the run folders and `platform_core_data/modules/` for the module artifacts they produced. Revisions to this document are never made as a side effect of a run.
**Governs:** The eight skills defined in [`.claude/skills/`](../../.claude/skills/) — `project-context-skill`, `explorer-skill`, `test-design-skill`, `manual-execution-skill`, `automation-skill`, `automation-execution-skill`, `self-healing-skill`, `reporting-skill`.

**Two pipelines, one shared foundation.** This document defines **two independent delivery pipelines** that share their first three stages and then diverge completely (§3):

| Pipeline | Stages | Produces | Generates scripts? |
|---|---|---|---|
| **Manual Execution Pipeline** | 1 → 2 → 3 → **4M** | Manual execution results, defect reports, CSV results, evidence | **Never** |
| **Automation Pipeline** | 1 → 2 → 3 → **4A** → **5A** → *(optional)* **5H** → **6A** | Automation suite, execution results, self-healed suite, Final QA Report | Yes |

The two branches are **fully isolated after Stage 3**: neither consumes any artifact the other produces, and either may run without the other ever having run (§3.3).

**Two artifact locations, one rule.** The stages that establish *what a module is and what should be tested in it* — 1, 2, 3, `4A`, `5H` — write into a durable **Module Workspace**, `platform_core_data/modules/{module}/`. The stages that record *what happened when we executed* — `4M`, `5A`, `6A` — write into the **Run Folder**, `platform_core_data/runs/{{RUN_FOLDER}}/`, which stays immutable once written. §7 states the rule that decides between them; [`module_architecture.md`](module_architecture.md) specifies the Module Workspace, the module registry, and the module automation lifecycle in full.

---

## 1. Purpose

This document defines the **execution workflow** of the Agentic AI Testing Platform: the fixed order in which agents run, the artifacts that flow between them, and the human checkpoints that gate progression. The Skills layer (`.claude/skills/`) specifies *what each skill does in isolation*, via each skill's own YAML contract header (`inputs`/`outputs`/`dependencies`); this Pipeline Specification defines *how those skills are wired together into one governed, repeatable process*.

**The platform tests exactly one Target Project at a time.** Every *process artifact* the platform produces — Project Context, Discovery Artifacts, Manual Test Suite, execution results, reports, run history, knowledge base — lives under a single root, `platform_core_data/`, resolved relative to the Tool Root (§1.1). There is no project-name path segment, no project selector, and no second project's artifacts to disambiguate against.

The **Target Project** is the application repository under test. It is a distinct root, `{{TARGET_ROOT}}` (§1.1), and it has exactly one role in this pipeline: it is where the *generated automation code* lives, and it is the authority on its own technology stack and coding conventions. It is never a source of requirements or business rules — those come exclusively from the approved Project Context (§6 Rule 5). §13 defines precisely what the platform may read from it, what it may write to it, and what it must never touch.

The stage order, checkpoints, and rules below remain reusable process logic. Retargeting the platform at a different application means running `agentic-testing init` against that repository — which replaces `platform_core_data/`'s *contents* (PRD, run configuration, resources, knowledge base), clears `modules/`, `runs/`, and `automation_baseline/`, and re-resolves `{{TARGET_ROOT}}` — never editing this specification. Platform Knowledge is untouched by a retarget because it does not live under the data root at all — it sits in `platform_core/knowledge/patterns/`, ships with the tool, and is reinstalled rather than preserved (§10.6).

### 1.1 Root resolution

Two roots exist, and **both are resolved by `platform_core/tools/platform_paths/paths.js` and by nothing else**:

| Root | What it is | How it is resolved |
|---|---|---|
| **Tool Root** | the platform's own folder — `platform_core/`, `platform_core_data/`, `workflows_and_pipelines/`, `platform.config.json` | marker walk-up from the tool's own location |
| **Target Project Root** (`{{TARGET_ROOT}}`) | the application repository under test | `targetRoot` in `platform.config.json`, or the `AGENTIC_TESTING_TARGET_ROOT` environment variable — **never inferred** |

An agent that needs an absolute root runs `node platform_core/tools/platform_paths/cli.js roots --json`. **An agent must never infer either root** from `process.cwd()`, from `__dirname`, or by searching for `.git`: installed inside a host project, each of those resolves to the host's repository rather than the tool folder, which is how generated artifacts end up in the wrong place and how a commit ends up in the wrong history.

When the platform is *self-hosted* (`mode: "self-hosted"`, the two roots being the same directory) it is testing its own repository. That is a degenerate case of the same model, not a second one.

Every path written in this specification and in the eight skills — `platform_core_data/knowledge_base/PRD.md`, `platform_core_data/modules/…`, `platform_core_data/runs/…`, `platform_core_data/automation_baseline/…` — is **relative to the Tool Root**. Those paths are correct as written whether the platform is self-hosted or installed as a folder inside a host project; only the resolved prefix differs.

## 2. Architecture Principle

> Agents communicate through artifacts only.
>
> Each agent has a single responsibility.
>
> Every output produced by an agent becomes the input of another agent whenever applicable.

The pipeline exists to enforce this principle mechanically: no stage may reach into another stage's internal reasoning, only into its published artifact.

## 3. Pipeline Overview

### 3.1 The shared foundation and the two branches

Stages 1–3 are **shared**: they establish *what the product should do* (Context), *what it actually does* (Discovery), and *what must be verified* (Test Design). Nothing in them is specific to how the verification is later performed, which is exactly why both pipelines consume them unchanged.

After Stage 3's checkpoint clears, the run takes **one or both** branches. They are independent deliveries, not two halves of one process.

```
                    ┌──────────────── SHARED FOUNDATION (Stages 1–3) ────────────────┐
                         writes to  modules/{module}/…  (durable, per module — §3.7)

    PRD ──────────────▶┌───────────────┐──▶ Project Context, per module
    Supporting Docs ──▶│  STAGE 1      │──▶ proposed module decomposition
    Run Configuration ▶│ Project Context│    → modules/{module}/context/
                       └───────────────┘
                               │  ⛔ CHECKPOINT — Human Review ⛔
                               │     (context AND the module list)
                               ▼
    Project Context ──▶┌───────────────┐──▶ Findings + Evidence
    Running App ──────▶│  STAGE 2      │──▶ QA Assessment Report
                       │  Explorer      │──▶ Coverage Summary · Timeline
                       └───────────────┘    → modules/{module}/discovery/
                               │            (behavioural only — NO selectors/DOM, §3.5)
                               │  ⛔ CHECKPOINT — Human Review ⛔
                               ▼
    Project Context ──▶┌───────────────┐──▶ Manual Test Suites (MD + Excel)
    Discovery ────────▶│  STAGE 3      │──▶ Requirement Traceability Matrix
                       │  Test Design   │──▶ Coverage Report
                       └───────────────┘    → modules/{module}/test_design/
                               │  ⛔ CHECKPOINT — Human Review ⛔
                               │ (approved)
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
 ═══ MANUAL EXECUTION PIPELINE ═══   ═══════════ AUTOMATION PIPELINE ═══════════

 ┌─────────────────────────┐         ┌──────────────────────────────────────┐
 │  STAGE 4M               │         │  STAGE 4A                            │
 │  Manual Execution       │         │  Automation                          │
 │                         │         │                                      │
 │  · executes test cases  │         │  · scope from Stage 3 test cases     │
 │    by hand, headed      │         │  · headless Playwright MCP:          │
 │  · records evidence     │         │    live selector/DOM verification    │
 │  · classifies results   │         │  · consults Verification KB + Repair │
 │  · writes defect reports│         │    KB (shared, §10.8) — mandatory    │
 │  · SELF-REPORTS:        │         │  · brownfield/greenfield detection   │
 │      MD report + CSV    │         │  · bounded self-review iterations    │
 │                         │         │                                      │
 │  NEVER generates a      │         │  ──▶ Automation Suite + Write Plan    │
 │  script of any kind     │         │  → modules/{module}/automation/       │
 │                         │         │    (a STANDALONE project — §7.1)      │
 └─────────────────────────┘         └──────────────────────────────────────┘
   → runs/{{RUN_FOLDER}}/                        │
     manual_execution/                           │
              │                                  │
   ⛔ CHECKPOINT — Human Review ⛔      ⛔ CHECKPOINT — Automation Approval ⛔
              │                                       │ (approved, per module)
              ▼                                       ▼
      Delivered to                       ┌──────────────────────────────────┐
      stakeholders                       │  STAGE 5A                        │
      (terminal — §3.3)                  │  Automation Execution            │
                                         │  pure mechanical runner (§3.4)   │
                                         │  → runs/{{RUN_FOLDER}}/execution/│
                                         └──────────────────────────────────┘
                                                      │  (no gate — mechanical)
                                                      ▼
                                         ┌──────────────────────────────────┐
                                         │  STAGE 5H — SELF-HEALING         │
                                         │  ★ OPTIONAL · OPT-IN ONLY ★      │
                                         │                                  │
                                         │  · reasons over failed tests     │
                                         │  · diagnose → strategy →         │
                                         │    confidence → patch → rerun    │
                                         │  · scoped to named modules       │
                                         │  · batch-approved, never auto    │
                                         │                                  │
                                         │  never runs unless invoked (§3.6)│
                                         │  → modules/{module}/healing/     │
                                         │    rerun → the triggering run's  │
                                         │            execution/ folder     │
                                         └──────────────────────────────────┘
                                                      │
                                  ⛔ CHECKPOINT — Automation Approval (re-merge) ⛔
                                                      │ (approved)
                                                      ├──▶ automation_baseline/  (greenfield)
                                                      │    {{TARGET_ROOT}}/…     (brownfield, §13.3)
                                                      ▼
                                         ┌──────────────────────────────────┐
                                         │  STAGE 6A — Reporting            │
                                         │  → runs/{{RUN_FOLDER}}/reporting/│
                                         └──────────────────────────────────┘
                                                      ▼
                                         Delivered to stakeholders
                                              (terminal node)
```

### 3.2 Stage identity and numbering

Stage numbers carry a **branch suffix** so no artifact, manifest entry, or review conversation is ever ambiguous about which pipeline it belongs to:

| ID | Stage | Branch | Skill |
|---|---|---|---|
| **1** | Project Context | shared | `project-context-skill` |
| **2** | Discovery / Explorer | shared | `explorer-skill` |
| **3** | Test Design | shared | `test-design-skill` |
| **4M** | Manual Execution *(terminal)* | Manual | `manual-execution-skill` |
| **4A** | Automation | Automation | `automation-skill` |
| **5A** | Automation Execution | Automation | `automation-execution-skill` |
| **5H** | Self-Healing *(optional)* | Automation | `self-healing-skill` |
| **6A** | Reporting *(terminal)* | Automation | `reporting-skill` |

`M` = Manual branch, `A` = Automation branch, `H` = the optional healing stage that sits between `5A` and `6A` without renumbering either. **A bare "Stage 4" is never valid** in a new artifact — it must always be `4M` or `4A`.

> **Renumbering note (this revision):** the pipeline was previously a single 7-stage chain in which Manual Execution was Stage 4 and fed Automation (Stage 5) via an Automation Candidate Package. That coupling is removed (§3.3). Old Stage 5→7 map to new `4A`, `5A`, `6A`. Historical run folders and artifacts created under the old numbering keep it; they are read with the mapping above and are never retroactively edited (§7).

### 3.3 Branch isolation — the load-bearing rule

**Neither branch consumes any artifact the other produces.** Specifically:

1. **The Automation branch never reads a Manual Execution artifact.** Stage `4A` derives its scope directly from the approved Stage 3 Manual Test Suite plus the run's scope filter — never from a manual execution result, a pass/fail outcome, or a candidate list.
2. **The Manual branch never reads an Automation artifact.** It produces no script, consumes no script, and never triggers a suite.
3. **Either branch may run alone**, in either order, or concurrently. Running the Manual pipeline is not a prerequisite for the Automation pipeline, and vice versa.
4. **The Automation Candidate Package is removed** from the platform entirely. It existed solely to carry scope from Manual Execution into Automation; with that dependency gone, the artifact has no reader. A test case's eligibility for automation is now decided inside Stage `4A` by its own Automation Decision Engine, grounded in live verification (§3.5) rather than in a prior manual outcome.

**Why the coupling was removed.** Requiring a full manual pass before any automation could be generated made automation the *slowest* possible deliverable and made the two activities serial when they are naturally parallel. The guarantee the old coupling bought — "never automate a test that hasn't been proven to hold" — is now provided more directly and more cheaply by Stage `4A`'s own live selector/DOM verification (§3.5): the automation confirms the flow against the running application at generation time, which is stronger evidence than a human's earlier pass on a possibly-changed build.

**What is genuinely lost, stated plainly:** a human's subjective judgment that a test case is *worth* automating no longer gates generation. That judgment now happens at the Stage `4A` Automation Approval gate (§5.2) — reviewing a proposed suite — rather than by pre-filtering the input. Reviewers should expect a broader candidate set than the old package produced.

### 3.4 Where each branch does its verification

The two branches solve the same problem — "is this behaviour correct?" — with opposite tooling, and each is authoritative for its own evidence:

| | Manual branch (`4M`) | Automation branch (`4A` → `5A`) |
|---|---|---|
| **Browser mode** | **Headed** (visible) — a human watches each interaction live | **Headless** — speed and repeatability |
| **Driver** | Playwright MCP server, headed | Playwright MCP server, headless |
| **Purpose of browser use** | *Execute* the test case and judge the result | *Verify* selectors/DOM, then *run* generated code |
| **Output** | Results, defects, CSV, MD report, evidence | Scripts, execution results, reports |
| **Scripts produced** | **None, ever** | Yes — the deliverable |

### 3.5 Discovery stays selector-free

**Stage 2 (Explorer) does not capture selectors, DOM structure, or locator candidates.** Its output is deliberately *behavioural*: findings, coverage, timeline, gap analysis, and evidence. Selector and DOM acquisition happens **only** in Stage `4A`, at the moment automation is generated, against the application as it exists then.

This is a performance and correctness decision, in that order:

- **Performance.** Discovery is the broadest sweep the platform makes. Capturing and persisting DOM/selector data for every screen it visits multiplies its runtime and its artifact size for data most runs never use.
- **Correctness.** A selector captured during Discovery and used during Automation is a selector verified against a *possibly older* build. Verifying at generation time removes the staleness window entirely — the locator is confirmed against the same build the suite will run on.
- **Clean artifacts.** Discovery's readers (a QA lead reviewing findings) are not served by DOM dumps, which §11.2 already classifies as debug scaffolding rather than deliverables.

Durable locator knowledge still exists and is still reused — it lives in the **Selector Verification Knowledge Base** (§10.8), written by Stage `4A` and readable by both branches, not in Discovery's output.

### 3.6 Self-Healing is optional and never automatic

Stage `5H` is the only stage in either pipeline that **never runs on its own**. It has no auto-trigger: a failing execution does not invoke it, and no orchestrator may chain into it. It runs when, and only when, a human invokes it (`/self-healing-skill`), optionally scoped to named modules. §5.6 defines its gate; `self-healing-skill/SKILL.md` defines its reasoning.

### 3.7 The module is the unit of design; the run is the unit of execution

Every stage in both branches operates on **modules**. A module is a coherent area of the application under test — `login`, `agency-management`, `flight-search` — derived from the PRD by Stage 1 and approved by a human at Stage 1's existing gate (§4, Stage 1). The module list is a fact on disk, in `platform_core_data/modules/modules.json`, and no stage ever invents one.

That gives the pipeline two axes, and each artifact belongs to exactly one of them:

| Axis | Location | Answers | Lifetime |
|---|---|---|---|
| **Module** | `platform_core_data/modules/{module}/` | *What is this module, and what should be tested in it?* | Durable; refined in place by later runs |
| **Run** | `platform_core_data/runs/{{RUN_FOLDER}}/` | *What happened when we executed against it, on this date, at this code state?* | Per run; immutable once written |

**The rule that decides which, stated once:** if re-running the pipeline tomorrow would want to *start from* the artifact, it belongs to the module. If it is the *evidence of one execution*, it belongs to the run. §7 restates this as an artifact convention; `module_architecture.md` §2 gives its full derivation.

A run's **scope** selects which modules it executes against — one, several, or every approved module as one system (`run_scope.md`; `module_architecture.md` §9.1). The active module(s) are resolved from `modules.json`, never inferred from conversation:

```bash
node platform_core/tools/module_manager/cli.js active --json   # which modules, and the scope
node platform_core/tools/module_manager/cli.js use login       # activate one (sticky)
```

**When `activeModules` is empty, a stage asks — it never guesses and never creates a module as a fallback.** This is the same discipline the Active Run pointer already enforces for runs (`run_manager.md` §5.7).

## 4. Stage Definitions

### Stage 1 — Project Context Skill *(shared)*

**Spec:** [`.claude/skills/project-context-skill/SKILL.md`](../../.claude/skills/project-context-skill/SKILL.md)

| | |
|---|---|
| **Input** | PRD · Supporting Documents · Run Configuration |
| **Output** | Project Context, **one file per module** · **proposed module decomposition** |
| **Checkpoint** | **Human Review Required** *(covers the context **and** the module list)* |
| **Artifact path** | `platform_core_data/modules/{module}/context/ProjectContext.md` — one per module in scope · `platform_core_data/modules/modules.json` (registry, written by the Module Manager) |

Notes:
- "Supporting Documents" (optional) covers any material that informs scope but is not itself the PRD — e.g., prior audit/QA reports, compliance policies, org-specific testing standards. These are folded into the Project Context alongside the PRD; they are never treated as a substitute source of requirements.
- This is the **only** stage in either pipeline permitted to read the PRD. Once its output is approved, the PRD is not re-consulted by any later stage.
- **This is the only stage that may propose a module.** It reads the PRD and proposes a decomposition — a list of modules, each with a name, a one-line scope statement, and the PRD sections it derives from. Because the decomposition is *derived from the PRD*, it is Stage 1's output and nobody else's (§6 Rule 4). A Stage 2 or Stage 3 observation that a module should be split is reported as a gap for the next Stage 1 pass; it is never acted on.
- **A proposed module is never scaffolded.** It is recorded with `status: Proposed` and becomes a folder on disk only once a human approves it at this stage's existing gate. A module is never created silently (`module_architecture.md` §6.4).
- **Its output is one context file per module, whatever the invocation's scope.** A full-project or multi-module invocation writes a separate `ProjectContext.md` under each module in scope; a single-module invocation writes exactly that module's. There is no project-wide context document — the union of the per-module files *is* the project context, and `modules/README.md` indexes them.
- Its output feeds **both** branches unchanged.

### Stage 2 — Explorer Skill *(shared)*

**Spec:** [`.claude/skills/explorer-skill/SKILL.md`](../../.claude/skills/explorer-skill/SKILL.md)

| | |
|---|---|
| **Input** | Project Context · Running Application |
| **Output** | Discovery Artifacts (Findings · Evidence · QA Assessment Report · Coverage Summary · Timeline) |
| **Checkpoint** | **Human Review Required** |
| **Artifact path** | `platform_core_data/modules/{module}/discovery/` — `DiscoverySnapshot.md`, `QA_Assessment_Report.md`, `Coverage_Summary.md`, `Timeline.md`, `findings/`, `evidence/` |

Notes:
- "Running Application" is the live target system, reached through browser automation — it is data to be observed, not a source of requirements.
- **It resolves its input from the module workspace**, not from a run folder: `modules/{module}/context/ProjectContext.md` at its current revision, whose `status:` must read `Approved`. It records the revision it consumed in its own `upstream` header (`module_architecture.md` §10.1) and never copies the context into its own folder.
- Output includes the Gap Analysis (documented vs. observed) required by the Explorer Skill specification.
- **Behavioural output only — no selectors, no DOM captures, no locator candidates** (§3.5). Selector acquisition belongs to Stage `4A`. A screenshot that is a Finding's evidence remains permanent; a DOM dump does not (§11.2). Screenshots are taken only for Findings and defects (§11.4).
- Its output feeds **both** branches unchanged.

### Stage 3 — Test Design Skill *(shared)*

**Spec:** [`.claude/skills/test-design-skill/SKILL.md`](../../.claude/skills/test-design-skill/SKILL.md)

| | |
|---|---|
| **Input** | Project Context (primary) · Discovery Artifacts (secondary) |
| **Output** | Manual Test Suites (Markdown) · Manual Test Suites (Excel) · Requirement Traceability Matrix · Coverage Report |
| **Checkpoint** | **Human Review Required** |
| **Artifact path** | `platform_core_data/modules/{module}/test_design/TestCases_{Module}.md`, `...{Module}.xlsx`, `.../test_design/TraceabilityMatrix.md`, `.../test_design/CoverageReport.md` |

Notes:
- Project Context governs *what* is tested; Discovery Artifacts only validate, enrich, and surface gaps — per the reversed primary/secondary relationship established in the Skills layer.
- **Both inputs resolve from the same module's workspace** — `modules/{module}/context/` and `modules/{module}/discovery/` — at their current revisions, each recorded in this stage's `upstream` header. Where an input has been revised since this suite was last produced, the suite is flagged **stale** and the staleness is reported; it is never silently regenerated (`module_architecture.md` §10.4).
- The Markdown and Excel test suites must never diverge — they are two renderings of one underlying test case set. The Markdown is authored; the `.xlsx` is **generated from it** by `platform_core/tools/test_suite_export/cli.js` (`test-design-skill/SKILL.md` §9.1), which is what makes non-divergence structural rather than a matter of discipline. Re-run the export after any edit to a suite document, and never hand-edit a workbook.
- **This is the divergence point.** Its approved output is the sole scope-determining input for *both* Stage `4M` and Stage `4A`. Test cases are authored branch-agnostically — a test case is not marked "manual" or "automated" here.
- **Every test case carries two lifecycle columns — `Review` and `Automation`** (`test-design-skill` §6.3, added 2026-08-01). Both are `Pending` | `Approved` | `Rejected` and both default to **`Pending`**; this stage always writes `Pending` and **no stage may ever change either value** — only a human reviewer may. Stage `4M` consumes a case only when `Review = Approved`; Stage `4A` only when `Review = Approved AND Automation = Approved` — `Review` gates **both** branches, `Automation` only the Automation branch *(revised 2026-08-01)*. The advisory **Automation Candidates** hint this bullet previously described is **retired**: a non-binding hint sitting beside a binding column can disagree with it, leaving no way to tell which governs.

### Stage 4M — Manual Execution Skill *(Manual branch · terminal)*

**Spec:** [`.claude/skills/manual-execution-skill/SKILL.md`](../../.claude/skills/manual-execution-skill/SKILL.md)

| | |
|---|---|
| **Input** | Approved Manual Test Suites · Requirement Traceability Matrix · Coverage Report · Project Context |
| **Output** | Manual Execution Results · **Manual Test Results CSV** · **Manual QA Report (MD)** · Evidence |
| **Checkpoint** | **Human Review Required** *(terminal — reviewed, then delivered)* |
| **Artifact path** | `platform_core_data/runs/{{RUN_FOLDER}}/manual_execution/ManualExecutionResults.md`, `.../ManualTestResults.csv`, `.../ManualQAReport.md`, `.../manual_execution/artifacts/` |

Notes:
- The word "Approved" in the Input is load-bearing: this stage may only consume the Stage 3 artifacts *after* they have cleared the Stage 3 checkpoint, never a draft or in-progress test suite. It reads that `status:` from the artifact's own header in `modules/{module}/test_design/`, never from a registry cache (`module_architecture.md` §10.5).
- **Its inputs are per module; its outputs are per run.** A run scoped to several modules reads each module's suite and writes **one** consolidated result set into its own run folder — results are evidence of one execution, and splitting them per module would break the run's single record of what happened. Every result cites the module it belongs to.
- **This stage is a complete, standalone delivery** — it is the Manual pipeline's terminal stage. It self-reports: it produces its own stakeholder-facing Markdown report and machine-readable CSV, and does not hand off to the Reporting stage (`6A`), which serves the Automation branch.
- **It never produces a script of any kind** — no Playwright file, no helper, no fixture, no throwaway driver script persisted as an artifact. It drives the browser **headed** through the Playwright MCP server so a human can watch each interaction live.
- **Failed and Inconclusive results are documented to the full Defect Documentation Standard** — a paste-ready defect record with evidence, classification, severity, and hedged root-cause analysis, not a one-line diff of expected vs. actual.
- **Scope is the approved suite narrowed by the `Review` gate** *(added 2026-08-01)*: a case is executed only when `Review = Approved` (`manual-execution-skill` §4.1). A `Pending` or `Rejected` case is recorded `Excluded` — reported in the Results, the CSV, and the QA Report totals, never silently dropped — so the pass rate is never quoted against a denominator the reader cannot see. The `Automation` column is **not** read by this stage: `Automation = Rejected` is the reason a case must be run manually, not a reason to skip it. Zero approved cases is a **halt**, not a run reporting "0 executed, 0 failures".
- **It produces no Automation Candidate Package** (§3.3 #4) and has no downstream agent. Its reviewer is its consumer.

### Stage 4A — Automation Skill *(Automation branch)*

**Spec:** [`.claude/skills/automation-skill/SKILL.md`](../../.claude/skills/automation-skill/SKILL.md)

| | |
|---|---|
| **Input** | Approved Manual Test Suites (scope **and** content) · Traceability Matrix · Coverage Report · Project Context · Discovery Artifacts · Selector Verification KB · Repair KB |
| **Output** | Automation Suite · Automation Plan/Manifest/Decision Report/Coverage Report/Summary · Target Write Plan · Selector Verification records |
| **Checkpoint** | **Automation Approval Required** *(per module)* |
| **Artifact path** | `platform_core_data/modules/{module}/automation/` — a **standalone, independently runnable project** (§12.1) → `platform_core_data/automation_baseline/` (assembled whole-project suite, on approval, §12.4). **For an already-promoted module the module path does not exist**: generation happens directly in the baseline, scoped by ownership (§12.9) |

Notes:
- **Scope comes directly from the approved Stage 3 Manual Test Suite**, narrowed by the run's own scope/module filter **and by the Review/Automation lifecycle gate** — never from a manual execution outcome (§3.3 #1). A case is in scope only when `Review = Approved AND Automation = Approved` (`test-design-skill` §6.3.2, `automation-skill` revision note 2026-08-01). `Automation = Rejected` means the case stays manual by decision and is **not** reported as an automation coverage gap; `Pending` on either column means no decision has been made yet and the case is skipped. Generating nothing because no case is dual-approved is a correct, reportable outcome.
- **It generates a standalone project per module**, under `modules/{module}/automation/tests_{Framework}/`, with its own config and dependency manifest. "Standalone" is a requirement, not a description: Stage `5A` must be able to execute one module before the others exist, Stage `5H` must be able to heal and re-run one module in isolation, and a reviewer must be able to run it themselves before approving — an approval gate on code nobody can execute is a formality (`module_architecture.md` §7.2).
- **Genuinely shared assets are generated once**, into `platform_core_data/automation_baseline/{framework}/shared/`, and referenced by each module project through a relative path recorded in that project's config. This is the one direction in which a module project reads outside itself. A module project that needs a change to a shared asset **proposes it in its `AutomationDecisionReport.md`** rather than editing it — shared code is whole-project surface and clears the whole-project gate, not one module's (`module_architecture.md` §7.3).
- **Approval is per module.** Approving Login's suite says nothing about Booking's. Only an `Approved` module project is eligible for assembly into the baseline (§12.4).
- **Brownfield generates to match the detected layout from the start**, so assembly is a merge into the team's existing structure and never an imposition of the platform's own (§13.2 #3).
- **Live selector/DOM verification is mandatory, and runs headless** through the Playwright MCP server. Before a locator is emitted, it is confirmed to resolve against the running application, and the flow is confirmed reachable. An unverifiable selector is reported as such and never emitted as though confirmed.
- **Both shared knowledge bases are consulted before generation, not after failure** (§10.8): the Selector Verification KB supplies already-confirmed locators for screens seen before, and the Repair KB supplies known failure modes to pre-empt in the first draft rather than rediscover by failing in Stage `5A`.
- **Self-review is a bounded, iterative loop with an explicit budget** — a named iteration cap and time budget, both recorded. It never loops indefinitely toward an unreachable ideal, and it never silently stops early without saying which checks remained unsatisfied.
- **Brownfield/greenfield handling is detected automatically; writing is approved explicitly.** Stack, test-directory layout, naming, and framework conventions are detected with no human prompt. The *write* decision — extend the existing suite or scaffold new, and exactly which files are touched — is presented as a **Target Write Plan** at this stage's Automation Approval gate (§5.2, §13.3).
- "Automation Approval Required" is deliberately named differently from "Human Review Required" (§5) because it gates the point at which generated code is authorized to later execute against a real environment.

### Stage 5A — Automation Execution Skill *(Automation branch)*

**Spec:** [`.claude/skills/automation-execution-skill/SKILL.md`](../../.claude/skills/automation-execution-skill/SKILL.md)

| | |
|---|---|
| **Input** | Approved Automation Suite · Project Context (standing reference) |
| **Output** | Execution Results · Screenshots · Logs · Traces · Execution Metadata · Health Summary |
| **Checkpoint** | *None — mechanical run, gated only by the Stage `4A` Automation Approval that already occurred* |
| **Artifact path** | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md`, `.../execution/artifacts/` |

Notes:
- **What it executes depends on the run's module scope** (`module_architecture.md` §9.1): a single- or multi-module run executes each named module's own standalone project under `modules/{module}/automation/` — or, for a **promoted** module, the baseline's module-scoped suite `testng-{module}.xml` (§12.9), since its working copy no longer exists; a **full-project** run executes the assembled baseline as one system, which is the point of assembly and the only way cross-module interaction is exercised at all. The root is always resolved through `automation_lifecycle/automationRoot.js`, never assumed.
- **This stage is a pure mechanical runner.** It runs the approved suite, classifies each result by cause (Application / Automation / Environment / Infrastructure / Configuration Failure, Passed, Inconclusive, Flaky), captures evidence, and reports the three separated health figures — Application Health, Automation Health, Environment Health. **It never modifies automation code.**
- **All repair reasoning has moved out of this stage** into Stage `5H` (`self-healing-skill`). This stage's job ends at an accurate, well-evidenced classification. Diagnosing *why* automation failed and changing code to fix it is `5H`'s responsibility, and only on explicit human invocation (§3.6).
- Project Context remains a standing reference (target environment, credentials, safety constraints) — this stage confirms the target environment against it before running anything.
- Execution Metadata includes, at minimum, the Executed Test Case ID and Automation Script ID for every result, plus Execution Time.
- No human checkpoint follows: once automation is approved (`4A` gate), running it is deterministic, not a judgment call. Judgment on the *results* happens in `5H` (if invoked) and `6A`.
- **It never executes manually-designed test cases** — that is exclusively Stage `4M`'s responsibility, in the other branch. The two never overlap.

### Stage 5H — Self-Healing Skill *(Automation branch · OPTIONAL, opt-in only)*

**Spec:** [`.claude/skills/self-healing-skill/SKILL.md`](../../.claude/skills/self-healing-skill/SKILL.md)

| | |
|---|---|
| **Input** | Execution Results (with ≥1 Automation Failure) **or**, where Stages `4A`/`5A` never ran, the suite's own last three execution reports (`SKILL.md` §4.2) · Automation Suite · Project Context · Repair KB · Selector Verification KB · prior runs' Repair Summaries |
| **Output** | Repair Summary · Repair Confidence Reports · repaired Automation Suite · Before/After Comparison · Quarantine Register · KB promotion proposals |
| **Checkpoint** | **Batch Repair Approval** (§5.6) before any code change · **Automation Approval** (§5.2) before a repaired suite re-merges to the baseline |
| **Artifact path** | `platform_core_data/modules/{module}/healing/RepairSummary.md`, `.../healing/RepairConfidenceReport.md`, `.../healing/BeforeAfterComparison.md`, `.../healing/QuarantineRegister.md` · repair **code** applied in place to `modules/{module}/automation/tests_{Framework}/` — or, for a **promoted** module, to its owned paths inside `automation_baseline/{framework}/tests_{Framework}/` (§12.9), never to a recreated working copy · rerun results appended to `runs/{{RUN_FOLDER}}/execution/ExecutionResults.rerun-N.md` |

Notes:
- **Never runs automatically** (§3.6). No failing execution triggers it; no orchestrator chains into it. It runs only on explicit human invocation, optionally scoped to named modules (`/self-healing-skill Login, Agency`).
- **Repair reasoning goes to the module; rerun evidence goes to the run.** The Repair Summary describes *that module's suite*, which is durable; the rerun is an execution, so it belongs with the execution it is a cycle of. A multi-module invocation produces **one healing folder per module**, each holding only that module's repairs — there is no combined cross-module repair document, because a repair is always to one module's suite.
- **Rerun results are appended to the triggering run, never written over it.** `ExecutionResults.md` (cycle 1, the failures that prompted healing) is never edited; the post-repair cycle lands beside it as `ExecutionResults.rerun-N.md` with its own `artifacts_rerun-N/`. Run immutability is preserved, and "12 failed, then 10 passed after repair and 2 were quarantined" reads as one story in one folder (`module_architecture.md` §8.2).
- **Repair code is applied in place, with git as the before/after record.** There is no separate healed copy — the module project *is* the suite being healed. `BeforeAfterComparison.md` documents the change in reviewable prose; it is not the mechanism by which the change is recoverable.
- **It is the single owner of all repair reasoning in the platform.** The Automation Repair Loop, Repair Strategy Decision Engine, Repair Confidence Engine, and Repair Knowledge Base — previously §25–§28 of `automation-execution-skill` — live here now, and nowhere else. There is exactly one repair engine, so there is no boundary to police between a "tactical" and a "strategic" one.
- **Only `Automation Failure` is in scope.** An `Application Failure` is a real defect and is never "healed" — healing it would mean editing a test until it stops reporting a genuine bug, which is the single most dangerous thing this stage could do. `Environment`/`Infrastructure`/`Configuration Failure` are likewise out of scope. An `Inconclusive` result may be admitted to a diagnosis pass only by explicit human choice, never to a repair pass by default.
- **Diagnosis and repair are separate decisions.** Below a High root-cause confidence, this stage gathers evidence rather than changing code — it never repairs on a guess.
- **A human-written suite may be healed without Stages `4A`/`5A` having run** (`SKILL.md` §4.2–§4.3). Where a human generated and ran the automation in their own IDE, this stage reads the framework's **last three** execution reports (Allure, TestNG/JUnit XML, Playwright), derives each classification from that evidence and labels it `Derived`, and repairs **only failures belonging to new or changed tests** — a pre-existing baseline failure is reported and left untouched. A report on its own never reaches High root-cause confidence without live reproduction, and a `Derived — Application Failure` is refused exactly as a Stage `5A` one is. This is a fallback, not a substitute: where Execution Results exist, they always win.
- **A repaired suite re-enters the normal gate.** Because Stage `4A`'s approval covered the code as it was then, changed code requires a fresh Automation Approval before it merges to the baseline (§12.4) or projects into the Target Project (§13.3).

### Stage 6A — Reporting Skill *(Automation branch · terminal)*

**Spec:** [`.claude/skills/reporting-skill/SKILL.md`](../../.claude/skills/reporting-skill/SKILL.md)

| | |
|---|---|
| **Input** | Execution Results · Traceability Matrix · Project Context · Repair Summary (if `5H` ran) |
| **Output** | Final QA Report |
| **Checkpoint** | *None — terminal stage, delivered to human stakeholders outside the pipeline* |
| **Artifact path** | `platform_core_data/runs/{{RUN_FOLDER}}/reporting/Final_QA_Report.md` |

Notes:
- The Traceability Matrix is consulted here specifically to compute Requirement Coverage and Automation Coverage, and to carry forward every Manual Test Suite "Assumption-based test" tag into a resolved (confirmed/refuted/unverified) status. It is read from `modules/{module}/test_design/TraceabilityMatrix.md` for every module the run executed, and the report states which module each coverage figure belongs to.
- **This stage serves the Automation branch only.** The Manual branch self-reports at `4M` and never reaches here (§3.3). A run that took only the Manual branch has no Final QA Report, and that is correct, not a gap.
- **Where Stage `5H` ran, the report distinguishes a first-attempt pass from a repaired pass** — an `Automation Repaired` result is never presented as a clean `Passed`, so a reader can always see which coverage required a fix.
- This is the last stage of the Automation branch. Its output is consumed by people, not by another agent — there is nothing downstream to gate.

## 4.1 Explicit Skill I/O Chaining (Contract-Level)

Each skill under `.claude/skills/` now declares a strict `inputs`/`outputs`/`dependencies` contract in its own frontmatter (see any `SKILL.md`). This table makes explicit, at the contract level, which upstream output artifact satisfies which downstream input — the same handoff §3's diagram and §4's per-stage tables already describe, restated here in terms of each skill's own declared contract keys so an orchestrator can wire the chain mechanically rather than by re-reading prose:

**Shared foundation (Stages 1–3) — feeds both branches:**

| Upstream skill | Output key(s) (contract) | → | Downstream skill | Input key(s) (contract) satisfied |
|---|---|---|---|---|
| *(none — first stage)* | — | → | `project-context-skill` | `prd`, `run_configuration` (supplied at invocation) |
| `project-context-skill` | `project_context` | → | `explorer-skill` | `project_context` |
| `explorer-skill` | `qa_assessment_report`, `findings_summary`, `evidence_packages`, `discovery_snapshots` | → | `test-design-skill` | `discovery_artifacts` (`project_context` is re-supplied from Stage 1's output, not re-derived) |

**Manual branch (`4M`) — terminal, no downstream consumer:**

| Upstream skill | Output key(s) (contract) | → | Downstream skill | Input key(s) (contract) satisfied |
|---|---|---|---|---|
| `test-design-skill` | `manual_test_suite_md`, `manual_test_suite_xlsx`, `traceability_matrix`, `coverage_report` | → | `manual-execution-skill` | `manual_test_suite`, `traceability_matrix`, `coverage_report` |
| `manual-execution-skill` | `manual_execution_results`, `manual_test_results_csv`, `manual_qa_report`, `manual_execution_artifacts` | → | *(none — terminal, §3.3)* | Consumed by human stakeholders directly. **No downstream skill.** |

**Automation branch (`4A` → `5A` → optional `5H` → `6A`):**

| Upstream skill | Output key(s) (contract) | → | Downstream skill | Input key(s) (contract) satisfied |
|---|---|---|---|---|
| `test-design-skill` | `manual_test_suite_md`/`.xlsx`, `traceability_matrix`, `coverage_report` | → | `automation-skill` | `manual_test_suite` — **scope *and* content source** (§3.3 #1); `traceability_matrix`, `coverage_report` |
| `explorer-skill` (pass-through) | `findings_summary`, `qa_assessment_report` | → | `automation-skill` | `discovery_artifacts` — behavioural context only; **contains no selectors** (§3.5) |
| *shared KBs* (§10.8) | `selector_verification_kb`, `repair_kb` | → | `automation-skill` | `selector_verification_kb`, `repair_kb` — consulted **before** generation, mandatory |
| `automation-skill` | `automation_package`, `automation_summary`, `target_write_plan`, `selector_verification_records` | → | `automation-execution-skill` | `automation_suite`, `automation_summary` |
| `automation-skill` | `selector_verification_records` | → | *shared KB* (§10.8) | `selector_verification_kb` — written back for reuse by **both** branches |
| `automation-execution-skill` | `execution_results` | → | `self-healing-skill` *(optional, §3.6)* | `execution_results` — **only** when a human invokes `5H`; never auto-chained |
| `automation-execution-skill` | `execution_results` | → | `reporting-skill` | `execution_results` |
| `self-healing-skill` | `repaired_automation_suite`, `repair_summary`, `before_after_comparison` | → | `automation-execution-skill` (targeted rerun) | `automation_suite` — the repaired subset only, never the full suite |
| `self-healing-skill` | `repair_summary` | → | `reporting-skill` | `repair_summary` — so a repaired pass is never reported as a clean pass |
| `self-healing-skill` | confirmed repair rules | → | *shared KB* (§10.8) | `repair_kb` — confirmed repairs only, via the §10.5 Promotion gate |
| `test-design-skill` (pass-through) | `traceability_matrix`, `manual_test_suite_md`/`.xlsx` | → | `reporting-skill` | `traceability_matrix`, `manual_test_suites` |

**Standing input to every stage in both branches:**

| Upstream skill | Output key(s) (contract) | → | Downstream skill | Input key(s) (contract) satisfied |
|---|---|---|---|---|
| `project-context-skill` (pass-through) | `project_context` | → | *every stage in both branches* | `project_context` — re-supplied unchanged at each stage, per §6 Rule 5 (Single Source of Truth), never re-derived |

Notes:
- A downstream skill's input key name does not need to match the upstream skill's output key name verbatim (each contract is written independently, like a function's own parameter names) — this table is what reconciles them for orchestration purposes.
- "Pass-through" rows mean the artifact is produced once (Stage 1 or Stage 3) and re-supplied, unchanged, to a later stage that also declares it as an input — it is not regenerated at each stage.
- **There is deliberately no row wiring `manual-execution-skill` into `automation-skill`.** That row existed in the previous single-chain design (carrying `automation_candidate_package`) and its removal is the mechanical expression of §3.3. An orchestrator that re-adds it has reintroduced the coupling this revision removed.
- **The `5H` row is conditional, not sequential.** Every other row in the Automation branch fires when its upstream stage completes; the `self-healing-skill` row fires only on explicit human invocation (§3.6). An orchestrator must never treat "`5A` produced an Automation Failure" as authorization to run `5H`.
- **Every row above is resolved per module.** An input key is satisfied by the *active module's* copy of that artifact (`modules/{module}/{stage}/`, §3.7), and a multi-module invocation satisfies it once per module rather than by concatenating them into one document. The wiring is unchanged; only the number of instances varies with scope.
- **A downstream stage records the revision it consumed.** Because a module artifact is edited in place, "which version did this consume?" is answered by the consumer's own `upstream` header, never inferred from the file's current state (`module_architecture.md` §10.1–§10.2). This is what makes the chain from PRD to test case to script mechanically traceable rather than reconstructable by convention.
- This section restates §3/§4 in contract terms; it does not change any stage's Input/Output table, checkpoint, or artifact path. If this section and a skill's own `SKILL.md` contract ever disagree, the `SKILL.md` contract is authoritative — update this table to match, not the other way around.

## 5. Checkpoint & Approval Gates

The pipeline defines exactly three gate types. All three **stop the pipeline** until a named human explicitly approves — no agent may infer approval, time out into approval, or proceed on silence.

| Gate | Applies to | What approving it authorizes |
|---|---|---|
| **Human Review Required** (§5.1) | Stages 1, 2, 3, `4M` | A document/result set is accepted as correct. |
| **Automation Approval Required** (§5.2) | Stage `4A`, and any `5H` re-merge | Generated or modified code is authorized to execute against a real environment. |
| **Batch Repair Approval** (§5.6) | Stage `5H` only | Reasoning may modify already-approved automation code. |

### 5.1 Human Review Required (Stages 1, 2, 3, `4M`)

| Stage | Branch | Suggested Reviewer Role | Reviews For |
|---|---|---|---|
| 1 — Project Context **and the proposed module decomposition** | shared | Business Analyst / Product Owner | Scope accuracy, correct in-scope/out-of-scope split, correct carried-forward assumptions, **and that the proposed module list is the right decomposition of the PRD** — the right number of modules, the right boundaries between them, and no module proposed for a PRD area that does not warrant one |
| 2 — Discovery Artifacts | shared | QA Lead | Exploration completeness within scope, correctness of the Gap Analysis, no unauthorized mutating actions taken, **and that no selector/DOM capture leaked into the output** (§3.5) |
| 3 — Manual Test Suites | shared | QA Architect / Test Lead | Test case correctness, traceability completeness, appropriate use of Discovery for enrichment (not as an unauthorized requirements source) |
| `4M` — Manual Execution Results, CSV, and QA Report | Manual | QA Lead / Test Lead | Execution correctness against the live application, completeness of the Evidence Inventory, no unauthorized mutating actions taken, that every `Failed`/`Inconclusive` result meets the Defect Documentation Standard in full, and that the CSV and Markdown report agree with the raw per-test results |

**Stage `4M` is a terminal gate.** Approving it releases the manual deliverable to stakeholders; it does not authorize any downstream stage, because the Manual branch has none (§3.3).

### 5.2 Automation Approval Required (Stage `4A`, and `5H` re-merge)

| Stage | Suggested Reviewer Role | Reviews For |
|---|---|---|
| `4A` — Automation Suite *(one gate per module)* | Automation Lead / Release Manager | Selector robustness **and the Selector Verification record backing each one** (§3.5), correct skip/not-automatable reporting, environment safety (no unauthorized destructive actions scripted), no invented business logic, the **Target Write Plan** (every file to be created/modified in the Target Project, §13.3), **that the module project actually runs standalone** (§4, Stage `4A`), **any proposed change to a shared asset** (§12.1), and that the self-review loop's unsatisfied checks were disclosed rather than silently dropped |
| `5H` — Repaired Automation Suite *(re-merge only)* | Automation Lead / Release Manager | That each applied repair matches its approved strategy, that no `Application Failure` was "healed" into silence (§5.6), the Before/After comparison including any newly-introduced failure, and that quarantined tests are recorded rather than deleted |

This gate is named distinctly from "Human Review Required" because approving it authorizes code that will execute against a real environment in Stage `5A` — a materially different risk than approving a document. Treat it as at least as strict as a production deployment approval, not as a lighter-weight variant of Stage 1–3 review.

**Approval is per module, and it authorizes assembly.** This gate approves *this module's* suite; approving Login's automation says nothing about Booking's. An approved module project moves to `Approved` in its `.module_automation_state.json` and becomes eligible for assembly into the whole-project baseline (§12.4) — approval and assembly are two steps, and the second never happens without the first.

**A `5H` repair does not inherit `4A`'s approval.** Stage `4A`'s Automation Approval covered the code *as it was at that moment*. Once Stage `5H` changes that code, the changed suite requires a fresh Automation Approval before it merges into the baseline (§12.4) or projects into the Target Project (§13.3). Treating the original approval as still covering repaired code is the single most likely way for unreviewed code to reach a real environment.

**Promotion does not weaken this gate — it changes only what the gate protects.** For a `Promoted` module (§12.9) there is no merge to hold back, because the approved code is already in the only copy that exists. The approval therefore moves to the *recording* step: an in-place baseline change is reviewed, run module-scoped, regression-checked to the extent its blast radius demands, and only then recorded with `recordBaselineUpdate()`. An unapproved in-place edit is the post-promotion equivalent of an unapproved merge, and is treated as one.

### 5.3 Gate Mechanics

1. On completing its output, an agent stops and marks its artifact `Pending Review` (or `Pending Automation Approval` for Stage `4A` / a Stage `5H` re-merge). It does not hand off to the next stage itself.
2. A human with the appropriate role (§5.1/§5.2) reviews the artifact against the criteria above.
3. **Approved:** the reviewer marks the artifact `Approved` (see §7 for the recommended mechanism) and the next stage's agent may now be invoked with that artifact as input.
4. **Rejected:** the pipeline halts at the current stage. The rejecting reviewer's feedback is attached to the artifact. The *same* agent that produced the rejected artifact re-runs, incorporating that feedback, against its original inputs — a rejection does not cascade back further up the pipeline unless the reviewer explicitly determines the fault lies in an upstream artifact (e.g., a flawed Project Context surfaced only once Test Design tried to use it), in which case the reviewer escalates to that earlier stage's checkpoint instead.
5. **A stage is not blocked from being *invoked* by its predecessor's open checkpoint — it is blocked from *silently consuming un-approved input*.** A human may invoke any skill directly, at any time, in any order (§5.3.1). What an open (`Pending`) predecessor checkpoint forbids is the *pipeline* advancing on its own: no stage may auto-chain into the next, and no orchestrator may treat "the previous stage finished" as authorization to continue. When a directly-invoked stage finds its required upstream artifact `Pending Review` / `Pending Automation Approval`, it stops and requests that approval per §5.3.1 — it does not refuse the invocation outright, and it does not proceed on the un-approved draft.

### 5.3.1 Direct Skill Invocation (added 2026-07-26, user-mandated)

**Added because approval was the only way to move between stages: finishing Stage *N* left the user able to say "approved" and nothing else. There was no way to call a specific skill on demand, or to call one with extra instructions.** Every skill in `.claude/skills/` is independently invocable by name, as a first-class entry point — not only as the pipeline's next link.

**1. Invocation forms.** All three are equally valid ways to start a skill:

| Form | Example | Meaning |
|---|---|---|
| Bare | `/test-design-skill` | Run the skill per its own specification, on its declared inputs. |
| With instructions | `/test-design-skill cover only the Login module, negative cases only` | Same, plus a run-scoped instruction that narrows or focuses the work. |
| Approval-driven (pre-existing) | "approved" | Unchanged: approve the open checkpoint, then the recommended next stage may be invoked. |

**2. A direct invocation is authorization to run *that skill*, and nothing else.** It never implies authorization to run, resume, or skip any *other* stage — §5.4's Automation Start Decision Gate and §6 Rule 3 are untouched. Calling `/automation-skill` authorizes the Automation skill to begin its own work; it does not authorize a silent Stages 1–3 catch-up pass. It likewise never authorizes crossing the branch boundary: invoking an Automation-branch skill is never authorization to run Stage `4M`, and invoking `/manual-execution-skill` is never authorization to generate automation (§3.3).

**3. Instruction prompts are run-scoped, never spec-overriding.** An instruction passed with a direct call may narrow scope, set focus, or prioritize (a module, a requirement ID, a subset of test cases, an output emphasis). It must never be read as permission to violate the invoked skill's own Execution Rules, this document's General Pipeline Rules (§6), the PRD-access restriction (§6 Rule 4), or a Human Decision gate (§5.5). Where an instruction conflicts with a rule, the rule wins and the skill says so plainly, then proceeds with the compliant remainder of the instruction. An instruction that *widens* scope beyond the run's business objective is a Human Decision (§5.5), not a free-form override.

**4. Un-approved upstream artifact → request approval, then recommend.** When a directly-invoked skill's required upstream artifact exists but is `Pending Review` / `Pending Automation Approval`, the skill does not run and does not bypass the gate. It reports what is awaiting approval, requests that approval, and — in the *same* message — names the next step concretely, including the literal command to issue. Format:

```
Cannot start Stage 3 yet — an upstream checkpoint is open.

  Stage 2 — Discovery Artifacts ....... Pending Review
    platform_core_data/runs/run-004__2026-07-27_14-30-05__Smoke__Login/discovery/QA_Assessment_Report.md

Next step — either:
  1. Approve it, then run this stage:   "approved"  →  /test-design-skill
  2. Revise Stage 2 first:              /explorer-skill <your feedback>
```

The point of the recommendation is that approval is no longer the *only* move the user can make — the message must always show the direct command as an explicit, available alternative path.

**5. Missing upstream artifact → run degraded, declare the gap.** When a required upstream artifact does not exist at all, a directly-invoked skill runs on whatever inputs *are* present rather than halting. It must, before producing anything: state which required inputs are absent; state what it is falling back to; and mark every affected output section as a declared gap (`Test Gap` / `Open Question` / `Requires Upstream Stage`, per the invoked skill's own gap vocabulary) rather than inventing the missing content. This is the same discipline `.claude/skills/explorer-skill/SKILL.md` §8.2 already applies to unavailable Discovery Modes, generalized to upstream artifacts. It never licenses reading the PRD out of turn (§6 Rule 4) or fabricating requirements — a gap is disclosed, never filled by guessing.

**6. Every skill ends by recommending the next step, with commands.** On completing its work, a skill's closing message states its own checkpoint status *and* the concrete next actions available — the approval that opens the normal path, and the direct commands the user may issue instead. A bare "Pending Review, awaiting approval" is no longer a complete closing message.

**7. Traceability records the invocation path.** The Run Manifest (§7) records, per stage, how that stage was entered: `Pipeline` (invoked after its predecessor's approval), `Direct` (invoked by name), or `Direct (degraded)` (invoked by name with one or more required inputs absent, per #5). Any artifact produced under `Direct (degraded)` carries the same note in its own header, so a later reader can never mistake a gap-laden run for a fully-fed one.

### 5.4 Automation Start Decision Gate (pre-flight — added 2026-07-12, user-mandated)

**Added after the orchestrator, during a real run, unilaterally decided to run Stages 1–4 in a single pass on a bare request to "run automation" — a judgment call it had no authority to make alone.** This gate runs *before* any stage is invoked or resumed, whenever a human asks for automation (Stage `4A`) or any other single downstream stage in either branch:

1. **Inspect, don't assume.** The orchestrator reads that project's Run Manifest (§7) and determines, per stage: does an Approved artifact exist? A Pending one? Nothing at all? It must not proceed on an assumption about what "probably" exists.
2. **Report the actual state plainly**, e.g.:
   ```
   Current project state
   ✓ Stage 1 — Approved
   ✓ Stage 2 — Approved
   ✓ Stage 3 — Approved
   ✓ Stage 4M — Approved
   ✗ Stage 4A — Not started
   ```
   or, for a project/scope with nothing yet: "No previous automation exists."
3. **Ask how to proceed** — present at minimum these options, and let the human choose (or specify something else via "Other"):
   1. Continue from the latest approved pipeline stage.
   2. Run the full pipeline from Stage 1.
   3. Generate automation directly (skip missing stages) — an explicit, human-authorized exception to §6 Rule 3's default "no skip" rule, never the orchestrator inventing scope or shortcuts on its own.
   4. Other.
4. **The orchestrator must never choose one of these on the human's behalf** — not even under a standing "minimize unnecessary decisions" or "drive forward automatically" directive elsewhere in this project's operating instructions. This is precisely the category of judgment call those directives are meant to exclude, not fold into "routine progress."

This does not weaken §6 Rule 3 in the normal, non-Spike case — it only makes explicit that a human-authorized partial or skip-ahead run is a distinct, deliberately chosen path each time, never an inferred default.

### 5.5 Human Decisions vs. Engineering Decisions (added 2026-07-12, user-mandated — applies to every stage in both branches, not only Stage `4A`)

**Not every judgment call an agent makes is a Human Decision.** §5.4 and `.claude/skills/automation-skill/SKILL.md` §31–§33 added several legitimate human-in-the-loop gates; this section exists so those gates don't over-fire into ordinary engineering work that no stage's own spec requires a human to approve mid-flight (the Checkpoint & Approval Gates in §5.1–§5.2 already provide the real review point — this section is about what happens *before* that checkpoint, while an agent is still doing its own work).

**Human Decisions — always ask, never infer:**
- Which automation framework to use (§31)
- Extend the existing project for a framework, start a project for a framework with none yet, or (rare, explicit) reset one from scratch (§31, §33) — never a coexisting second package for a framework that already has a project (`.claude/skills/automation-skill/SKILL.md` §31.5)
- **Automation merge destination and repository structure** (added 2026-07-24) — which project a run's automation is merged into, and any other repository-structure question the Automation Asset Lifecycle (§12) surfaces; governed by the explicit gather → analyze → recommend → wait procedure in `.claude/skills/automation-skill/SKILL.md` §31.6
- Which project/repository to target — including whether to generate inside the platform, export a compatible package, or modify an external Reference Automation Project directly (§32)
- Environment selection, when more than one is genuinely available for a run
- Executing any destructive or irreversible operation
- Business ambiguity — anything that would change the run's actual business objective or scope in a way a stakeholder would care about

**Engineering Decisions — make the call, document it, keep moving; never pause to ask:**
- Adding security-relevant test cases (e.g. anti-enumeration checks), boundary cases, empty-field variants, invalid-credential cases, validation-rule checks — ordinary Test Design Skill (Stage 3) work
- Marking a scenario Deferred / Requires Dedicated Environment because the current environment can't safely execute it (state why; never silently drop it, and never ask permission to defer it — see the "can't safely execute" rule below)
- Risk annotations, traceability updates, coverage-gap documentation
- Whether an adjacent, unrequested feature stays out of the current run's scope (e.g. Logout when only Login was asked for) — document it as "Out of Current Scope / potential future module" in the relevant artifact and continue; never pause execution to ask whether to fold an adjacent feature into scope unless doing so would change the run's business objective (a Human Decision, above)

**The "can't safely execute" rule:** when Discovery or Test Design identifies a scenario that cannot safely run against the current environment (e.g. a lockout/brute-force risk on shared staging), the agent does not ask what to do — it automatically creates the test case, marks it `Deferred` / `Requires Dedicated Environment`, states the reason, and continues with everything else. This extends the existing Coverage Gap / Stop Condition disclosure rules already present in `.claude/skills/explorer-skill/SKILL.md` and `.claude/skills/test-design-skill/SKILL.md` — it does not relax them, it clarifies that disclosure, not a question, is the correct response.

**Why:** the same day these gates were introduced, the user drew this line explicitly: "The platform should stop interrupting the workflow for engineering decisions. Reserve questions only for real human decisions." Confirmed concretely against an anti-enumeration test-case addition and an adjacent-scope (Logout) question — both are Engineering Decisions and should never have been asked about.

**Feature-vs-CRUD is a Human Decision** *(added 2026-08-17)*. When a new User Story arrives, whether it is a standalone Feature or part of a module's CRUD scope is decided by the human, not inferred from the story's title — see §5.7. It sits in the Human Decision column for the same reason a framework choice does: cheap to ask once, expensive to undo after artifacts exist under the wrong shape. This is **not** an exception to the anti-interruption rule above; it is one short question asked once at intake, before any work begins.

### 5.6 Batch Repair Approval (Stage `5H` — Self-Healing)

**This gate exists because Stage `5H` is the only stage that modifies code a human already approved.** Every other stage either produces a new artifact or reads existing ones; `5H` rewrites the output of Stage `4A` after that output cleared the §5.2 gate. That asymmetry is what makes a dedicated gate necessary rather than reusing §5.2 alone.

**The gate is a batch gate, asked exactly once per healing pass — never once per test case.** A suite with 14 automation failures produces one question, not fourteen. Asking per test case turns a 20-minute healing pass into an hour of prompts and reliably trains a reviewer to approve without reading, which is worse than not asking.

#### 5.6.1 Preconditions — what must be true before the gate is even presented

1. **A human invoked `5H` explicitly** (§3.6). This gate never opens on its own.
2. **Every candidate failure is classified `Automation Failure`.** `Application Failure` is categorically out of scope (§5.6.4). `Environment`/`Infrastructure`/`Configuration Failure` are out of scope — they are not automation defects. An `Inconclusive` result appears only if the human explicitly admitted it, and then only to a diagnosis pass.
3. **Each proposed repair carries a Repair Confidence Report** with an evidence-derived confidence percentage, a named root cause, a stated regression risk, and its cited evidence. A proposal without one is not presentable.
4. **Root-cause confidence is High for anything proposed as a repair.** At Medium or Low, the only thing `5H` may propose is *diagnosis* — evidence gathering with no code change (§5.6.3).
5. **Where the evidence came from external reports** (`SKILL.md` §4.2), the gate additionally shows the reports read with their timestamps, every `Derived` classification with its cited evidence for the human to confirm, and the new-vs-baseline split — in scope, pre-existing, and ambiguous. Approval then covers the classification and the boundary as well as the repair.

#### 5.6.2 The question, asked once

```
Self-Healing — {N} Automation Failures analysed, {R} repairs proposed, {D} need diagnosis first

  {module}  {TC-ID}  {root cause, one line}   confidence {NN}%  risk {Low|Med|High}
  ...

Proceed?
  1. Apply proposed repairs and rerun only affected tests
  2. Diagnose only — gather evidence, change no code
  3. Mark as Known Automation Issue (no change, recorded)
  4. Skip — leave results exactly as Stage 5A reported them
```

- The pipeline does **not** proceed to any code change until this is answered. Silence is not option 1.
- **Option 1 authorizes the proposed repairs as listed, and nothing more.** A repair the reasoning discovers mid-pass that was not in the presented list requires coming back and asking again — approval covers the batch that was shown, not the category of work.
- **A rerun after repair is always scoped to the affected tests**, never the full suite, unless every test in the suite was repaired.

#### 5.6.3 Diagnosis is not repair, and never needs this gate

Gathering evidence — a DOM snapshot, a console log, a network capture, a screenshot — changes no code and no application state, so it does not require Batch Repair Approval. Only a code change does. When diagnosis resolves the open question and raises root-cause confidence to High, `5H` returns to §5.6.2 with a real repair proposal; that loop-back is expected and automatic, but the *resulting repair* still passes this gate.

#### 5.6.4 The prohibition that matters most — never heal an application defect

**A test that fails because the application is genuinely broken must never be modified to stop failing.** This is the one failure mode that would make the entire platform actively harmful: a self-healing stage that "fixes" tests until the suite is green has converted a defect-detection system into a defect-concealment system.

Mechanically:
- Only `Automation Failure` is eligible (§5.6.1 #2).
- If a repair pass reveals that a failure classified `Automation Failure` is in fact an `Application Failure`, `5H` **stops work on that test**, reclassifies it, and reports it as a defect — it does not proceed with the repair, even if a repair would make the test pass, and even if the human already approved the batch it was in.
- Weakening an assertion, widening an expected value, removing a check, or adding a conditional skip so that a genuinely failing behaviour passes is **never** a valid repair strategy. Repairs address *how the test interacts with the application* (locators, waits, setup, navigation), never *what the test asserts to be correct*.
- Where a repair would require changing an assertion's expected value, that is a disagreement between the automation and the approved Manual Test Suite. It is disclosed as such, for a human to resolve at Stage 3 — never silently reconciled by editing either side.

#### 5.6.5 After the gate

| Outcome | What happens |
|---|---|
| **Repairs applied and rerun** | Before/After Comparison produced (Fixed / Remaining / New failures). A fixed test is labelled `Automation Repaired`, never `Passed` (§4, Stage `6A`). Confirmed repairs may be proposed for KB promotion (§10.5). The repaired suite requires fresh §5.2 approval to re-merge. |
| **Diagnosis only** | Evidence recorded in the Repair Summary; classifications unchanged; no code touched. |
| **Known Automation Issue** | Classification stays `Automation Failure`, additionally tagged `Known Automation Issue` with the diagnosis attached, so a later run does not re-diagnose from scratch. |
| **Skip** | Stage `5A`'s original results stand unchanged as final. |

**Repeated failure is quarantined, not repaired indefinitely.** A test that has been repaired and has failed again across a defined number of healing passes is moved to the **Quarantine Register** with its full history, rather than being repaired a third time. A test that needs perpetual healing is telling you something about the test's design or the application's stability that another patch will not fix.

### 5.7 New User Story Intake Routing (pre-Stage-1 — added 2026-08-17, user-mandated)

**Full rule: [`new_us_intake.md`](new_us_intake.md).** Summarized here because it is a gate, and every gate belongs in §5.

**Trigger:** any supplied User Story — pasted text, a Markdown file, a work-item reference, or prose a reasonable reader would call a User Story.

**Nothing is created until it is answered.** No module, no run, no Feature, no active pointer, no Project Context.

| Step | |
|---|---|
| 1 | **Ask:** *"Is this User Story for a standalone Feature or part of a module CRUD scope?"* — options `Feature` / `CRUD`. **Never inferred from the title.** |
| 2 | **`Feature`** → collect the story and AC · confirm the parent module · inspect existing scope · propose `modules/<module>/features/<feature>/` (creating the parent module first if absent) |
| 2 | **`CRUD`** → ask one story or several · identify which of Add/Create · Update · Search · Approve · Reject are included · collect each story and AC · propose **one consolidated module**, no feature folder per area |
| 3 | **Inspect existing scope** — `cli.js inspect-scope`. Overlap is a **candidate**, never a verdict; never concluded from a story number alone |
| 4 | **Show the proposal and wait** — parent module, feature name, exact paths, overlap, run scope, and what is deliberately not being created |

**Where it binds.** `CLAUDE.md` fires the conversation, but the rule does not depend on it: **`.claude/skills/project-context-skill/SKILL.md` §3.2 and Execution Rule 14** make the answered routing a precondition of Stage 1, so a **directly invoked** skill (§5.3.1) still has to comply. That is the case the harness cannot cover, and therefore the case the rule exists for.

**Ambiguity is asked about, never resolved silently.** A capability supplied inside a CRUD package stays in the consolidated module however feature-shaped it sounds; a capability presented as its own Feature/User Story gets a Feature folder. The test is how it was supplied.

## 6. General Pipeline Rules

1. **Agents execute sequentially.** Stage *N+1* never starts before Stage *N* completes and, where applicable, clears its checkpoint. This governs *pipeline-driven* progression — the pipeline never advances itself past an open checkpoint. It does not restrict a human from invoking a skill directly and out of order (§5.3.1), which is a separate, explicitly-authorized entry point with its own disclosure requirements.
2. **Every stage consumes artifacts from the previous stage(s).** No stage invents its own inputs or reaches past its declared Input list.
3. **No agent may skip a stage within the branch it is running.** Every stage of the chosen branch runs, in order, on a full pipeline execution — even when a stage's output is small (e.g., zero defects), it still runs and produces its artifact. "No agent may skip" binds the *agents and the orchestrator*, not the human: a human invoking a single skill directly (§5.3.1) is choosing a deliberate partial run each time, and the invoked skill must declare the resulting gaps (§5.3.1 #5) rather than pretend the skipped stages ran.

    **Two branch-specific clarifications:**

    **(a) Choosing a branch is not skipping.** Running the Manual pipeline (1→2→3→`4M`) and never running `4A`/`5A`/`6A` is a complete execution of that pipeline, not a partial run with four skipped stages — and the same is true in reverse. A run's Manifest records which branch(es) it took; a branch not taken is recorded as *not applicable to this run*, never as a gap. Only a stage skipped *within* a branch the run actually took is a gap requiring disclosure.

    **(b) Stage `5H` is exempt entirely.** Self-Healing is optional by design (§3.6). Not running it is the normal case and is never a gap, never disclosed as a skipped stage, and never requires justification.
4. **No downstream agent may read the PRD directly.** Only Stage 1 has the PRD in its Input list. This is enforced structurally, not just by convention: no other stage's Input table in §4 contains the PRD.
5. **Project Context is the Single Source of Truth.** From Stage 1 onward, every agent's understanding of "what the product should do" is scoped by the Project Context artifact — in **both** branches, including Stages `4M`, `5A`, `5H`, and `6A`, which reference it for environment/safety and risk-resolution purposes even where it is not the headline input of that stage.
6. **Human approval gates must stop the pipeline until approval is granted.** See §5.3 — no silent timeouts, no auto-approval, no proceeding on an assumed "looks fine." A direct skill invocation (§5.3.1) is not an approval and never satisfies this rule: a directly-invoked stage whose upstream artifact is `Pending` still stops and requests that approval (§5.3.1 #4).
7. **All artifacts must be versionable.** See §7 — every artifact carries a version identifier and prior versions are retained, never overwritten in place.
8. **Every output must maintain traceability.** See §8 — every artifact from Stage 3 onward can be traced back, ID for ID, to the Project Context requirement (and, transitively, the PRD) that generated it.
9. **Two Roots, One Project.** Exactly two roots exist (§1.1), and every read and write an agent performs resolves inside one of them:

    **(a) The Tool Root** — `platform_core_data/` holds every process artifact and every source of *requirements and business rules*; `platform_core/` and `workflows_and_pipelines/` hold Platform Knowledge (§10). This is the **only** source of what the product should do.

    **(b) The Target Project Root** (`{{TARGET_ROOT}}`) — readable for **technical facts only**: technology stack, dependency versions, test-directory layout, coding and naming conventions, existing automation code to extend or reuse. Writable in **exactly one** location: the configured automation target directory (`target.automationRoot` in `platform.config.json`), and only by Stage `4A`, Stage `5A`, and Stage `5H` — the Automation branch only — and only within the configured write allowlist (§13). **Stage `4M` never writes to the Target Project at all**, since it produces no code (§3.3).

    **Requirements, business rules, acceptance criteria, and test cases are never sourced from the Target Project.** A source file, a comment, an existing test's assertions, or a commit message found in the Target Project is evidence of *what the code currently does* — never evidence of what it *should* do. A discrepancy between the Target Project's code and the approved Project Context is a **Finding to report**, never a requirement to adopt. This is the same discipline §32 already applies to a Reference Automation Project, generalized: read for structure and style, never for intent.

    Nothing outside these two roots may be read or written, with one registered exception: a **Reference Automation Project** (`platform_core_data/knowledge_base/reference_automation_project.md`) — a read-only structural reference for automation *style*, never a source of functional requirements, business rules, test cases, or domain knowledge, and never modified except via the explicit gate at `.claude/skills/automation-skill/SKILL.md` §32.3.
10. **Simple English Communication Standard applies to every stage, in both branches, with no opt-out.** This governs *all* user-facing text any agent, skill, or the orchestrator itself produces — a report, a summary, a checkpoint question, a recommendation, a defect record, an artifact's prose, a closing message — from Stage 1 through `6A`. It is not a Stage `4A`/Automation-only convention; it binds Discovery findings, Manual QA Reports, Repair Summaries, and everything else equally. Full statement:

    - Use common, familiar words and short sentences. Explain one idea at a time and prefer direct wording.
    - Avoid complex, academic, legal, or overly technical language. Do not reach for an advanced term when a simpler one carries the same meaning.
    - If a technical term is genuinely necessary, explain it briefly the first time it appears.
    - **Never rename or simplify identifiers**: test IDs, code names, class names, method names, file names, and official system terms are copied verbatim, exactly as they appear in the artifact or system they come from.
    - In any report or summary, clearly separate: what happened, why it happened, what was changed, what is still not fixed, and what should happen next.
    - Never state a finding more confidently than the evidence supports — this rule narrows *wording*, it never loosens the evidence, hedging, or Defect Documentation Standard requirements a stage's own spec already imposes.
    - Keep the result professional and readable by testers, developers, product owners, and managers alike, without cutting evidence that matters just to shorten the text.
11. **Headed or Headless is confirmed with the human before *every* execution, with no exceptions and no inference** (added 2026-08-17, user-mandated). This binds **every** run of anything against a live application: Stage `4M` manual execution, Stage `5A` automation execution, Stage `5H` self-healing reruns, verification runs, regression runs, post-promotion live proofs, and one-off diagnostic runs.

    - **Ask immediately before the run starts**, not at the start of the session and not bundled into an earlier planning question. The answer must still be true when the browser opens.
    - **Never infer the mode** from the previous execution, from the run folder, from a config default, from a properties file, or from what the last session used. A mode that was right yesterday is not evidence about today: the human may be watching this one, sharing a screen, on a machine with no display, or deliberately checking behaviour that only shows headed.
    - **Never treat silence, an unrelated approval, or "go ahead" as the answer.** The question is answered explicitly or the run does not start.
    - Record the selected mode in the execution artifact, so a later reader knows how the evidence was produced.

    This is deliberately stricter than the surrounding approval model: most gates ask once per artifact, this one asks once per execution, because it is the one setting that changes what the human can see while their application is being driven.
    - Before finishing any user-facing output, check it: Can a tester understand it on first read? Can any hard word be replaced with an easier one? Are long sentences split into shorter ones? Are technical terms explained where needed? Is it still accurate and backed by evidence?

    This rule constrains *wording only* — it never changes what an artifact must contain, what evidence it must cite, or which template or section structure a skill's own spec requires. Where a stage's own spec mandates specific terminology (a Result Classification value, a column header, a status like `Pending Automation Approval`), that literal term is kept unchanged; only the surrounding prose explaining it is written in simple English. No skill may bypass or relax this rule for its own output — it is the shared floor every stage writes to, alongside Rules 1–9.

## 7. Artifact & Versioning Conventions

> **Revision note (2026-07-27, user-mandated):** this section previously (a) rooted every artifact at `platform_core_data/workspace/` and (b) mandated version-suffixed files plus an unsuffixed "current approved" copy. Both are replaced below. Real runs showed the two rules producing redundant copies of the same Markdown: a `.v1` file, an unsuffixed approved duplicate of it, and a fresh `.v2` whenever the reviewer asked for a refinement rather than an edit of the file they had just reviewed. **`platform_core_data/workspace/` is removed** and **each artifact is now a single file, edited in place**, with git as the version history.
>
> **Revision note (2026-07-29, user-mandated):** the 2026-07-27 revision put *every* artifact in a Run Folder. That made a run the unit of everything — identity, scope, location, and lifetime — which broke down as soon as a project was worked module by module across many sessions: a module's design ended up scattered across the runs that touched it, and `runs/`' immutability (correct for *what happened*) fought against a module's design, which legitimately accumulates. **Design output now lives in a durable per-module workspace; the Run Folder keeps execution output only.** [`module_architecture.md`](module_architecture.md) specifies the split in full. Everything below about in-place editing, one-file-per-artifact, and approval-changes-status is **unchanged** — it now simply applies in two locations instead of one.

**Every artifact produced by this pipeline lives in exactly one of two locations, and §3.7's rule decides which:**

```
platform_core_data/modules/{module}/{stage}/       # design  — durable, evolves in place
platform_core_data/runs/{{RUN_FOLDER}}/{stage}/    # execution — per run, immutable once written
```

| Location | `{stage}` folders | Written by |
|---|---|---|
| `modules/{module}/` | `context/`, `discovery/`, `test_design/`, `automation/`, `healing/` | Stages 1, 2, 3, `4A`, `5H` |
| `runs/{{RUN_FOLDER}}/` | `metadata/`, `manual_execution/`, `execution/`, `reporting/` | Stages `4M`, `5A`, `6A`, plus the Run Manager's own bookkeeping |

`{{RUN_FOLDER}}` is generated by `platform_core/tools/run_manager` (`run_manager.md` §5); `{module}` is a slug generated by `platform_core/tools/module_manager` (`module_architecture.md` §5.2). Neither is ever hand-formatted. **There is no third location and no mirroring:** a stage writes its artifact once, in the location its own row above names, and never copies it elsewhere.

`context/`, `discovery/`, `test_design/`, `automation/`, and `self_healing/` are **no longer created inside a run folder.** A run *references* the module artifacts it consumed, by path and revision, and records them in its Run Manifest.

**A folder's absence is a record, in both locations.**

- **Per module:** `test_design/` absent means Stage 3 has not run for that module; `automation/` absent means Stage `4A` has not; `healing/` exists only where a human actually invoked Stage `5H`. Only `context/` and `discovery/` are created when a module is scaffolded, because Stages 1 and 2 follow immediately (`module_architecture.md` §5.1).
- **Per run:** a Manual-only run has `metadata/` and `manual_execution/` on disk — `execution/` and `reporting/` are never created for it, and their absence is the record that the run took the Manual branch (§6 Rule 3a).

To satisfy Rule 7 (versionable artifacts) and Rule 6 (gates that truly stop the pipeline):

- **One file per artifact, edited in place.** An artifact has exactly one path for its whole life — `ProjectContext.md`, not `ProjectContext.v1.md`. No version suffix is ever appended, and no copy is ever made. For a module artifact that life is the *module's*, not one run's: a later run refining Login's Test Design edits `modules/login/test_design/TestCases_Login.md` rather than producing a second copy of it somewhere else.
- **Approval changes status, never location.** Approving an artifact updates the `status:` field in its own header (`Draft` → `Pending Review` → `Approved`) and records the approval in the Run Manifest. **A stage must never, on approval, write a "final" copy of its Markdown outputs** — the file the reviewer read *is* the approved artifact. For a module artifact, `module.json` and `modules.json` cache that status for fast listing; **the artifact's own header is authoritative and a stage requiring approved input reads the header, never a cache** (`module_architecture.md` §10.5).
- **Refinement edits the reviewed file.** When a reviewer requests changes — whether the artifact is `Pending Review`, `Approved`, or was rejected — the producing stage re-opens that same file and edits it in place. It must never create a `.v2`, `_final`, `_revised`, or otherwise-suffixed sibling.
- **Git is the version history.** Prior states of every artifact are recoverable from version control, which is why an in-place edit loses nothing. Each stage's write and each approval is a commit-worthy change; the Run Manifest records the sequence.
- **A rejected artifact is preserved only when the reviewer asks for it.** The default is an in-place revision. If a reviewer explicitly wants the rejected text kept alongside the revision for audit, it is written once to `{artifact}.rejected-{N}.md` in the same folder and never touched again.
- **Run Manifest:** a single tracking artifact, `platform_core_data/runs/{{RUN_FOLDER}}/metadata/RunManifest.md`, records for every stage: timestamp, checkpoint status (`Pending Review` / `Pending Automation Approval` / `Approved` / `Rejected`), the approving reviewer, the revision count (how many times the artifact has been edited in place — replacing the old version number), the **Invocation Path** (`Pipeline` / `Direct` / `Direct (degraded)`, per §5.3.1 #7) together with any run-scoped instruction given at invocation, and a direct link to the artifact file. This manifest is the pipeline orchestrator's own source of truth for "where are we right now" and is what a human or orchestration tool consults before invoking the next stage.

**Reusing design output across runs needs no mechanism.** A later run that needs Login's approved Project Context reads `modules/login/context/ProjectContext.md` — the current one, in the only place it has ever lived. There is nothing to inherit, nothing to copy, and nothing to declare superseded, because the module workspace holds one current copy by construction. This is what the split replaced: the copy-forward machinery existed purely to answer "which of these copies is current," and that question no longer arises.

What a run *does* record is **which revision of each module artifact it consumed** — `moduleArtifactRefs[]` in its own `metadata/run.json`, plus the Run Manifest's **Module Artifacts Consumed** section. A module's design evolves in place; a run's record of the state it consumed must not, or the run stops being reproducible after the module moves on. This is the module-layer analogue of `targetRef` (`run_manager.md` §5.8) and exists for the identical reason.

**Cross-run reuse of execution artifacts** is unchanged and still uses lineage. A run that supersedes an earlier execution's conclusions references it by path — `platform_core_data/runs/{{PRIOR_RUN_FOLDER}}/execution/ExecutionResults.md` — and records the relationship in its own `metadata/lineage.json`. `{{PRIOR_RUN_FOLDER}}` is **resolved, not filled in by hand**: `resolvePriorRunFolder()` reads it from that file (`run_manager.md` §5.9). The Run Manifest's **Cross-Run Reuse / Source Runs** section ([`platform_core/templates/metadata/RunManifest.md`](../../platform_core/templates/metadata/RunManifest.md)) records one row per reused artifact — the source run, whether it was `Referenced` or `Copied`, and the **drift** between that run's code-state anchor and now (`run_manager.md` §5.8). Where drift reports `moved` or any `unknown-*`, the reused artifact's conclusions are *unverified against current code* and the consuming stage says so rather than presenting them as current.

**Drift is also computed per module.** Each module records `targetRefAtWrite` per stage, so `computeDrift()` answers "has the code under *this module* changed since we designed it?" — a strictly more useful question than the run-level equivalent, because one run may span modules that have drifted very differently:

```bash
node platform_core/tools/module_manager/cli.js drift [<slug>] [--json]
```

**Staleness is surfaced, never silently resolved.** Because every artifact records the revision of every input it consumed, a stage can compare what it consumed against what is there now. An artifact whose upstream has been revised since is flagged **stale** in the module's `README.md` and in `modules.json`. Re-running the stage is a human decision at that stage's own gate — a Test Design suite is never silently regenerated because Discovery was refined. The pipeline's job is to make the staleness impossible to miss, not to act on it unasked.

## 8. Traceability Chain

Every artifact must be traceable, end to end, back through the chain that produced it. The chain is **shared through the Traceability Matrix, then forks with the pipeline** (§3.3):

```
PRD                                                    knowledge_base/PRD.md
 └─▶ Module decomposition                              modules/modules.json
       └─▶ Project Context, per module                 modules/{module}/context/
             ├─▶ Discovery Artifacts                   modules/{module}/discovery/
             │     (validates/enriches only; no selectors — §3.5)
             └─▶ Manual Test Suites (MD + Excel)       modules/{module}/test_design/
                   └─▶ Requirement Traceability Matrix
                         │
       ┌─────────────────┴──────────────────────────────────┐
       │ MANUAL BRANCH                                      │ AUTOMATION BRANCH
       ▼                                                    ▼
  Manual Execution Results                           Automation Suite
  runs/…/manual_execution/                           modules/{module}/automation/
       ├─▶ Manual Test Results CSV                         │  (+ Selector Verification records)
       ├─▶ Defect Records                                  └─▶ Execution Results
       └─▶ Manual QA Report                                      runs/…/execution/
            (terminal — delivered)                                │  (+ Screenshots, Logs, Traces)
                                                                  ├─▶ Repair Summary  (only if 5H ran)
                                                                  │     modules/{module}/healing/
                                                                  │     ├─▶ Before/After Comparison
                                                                  │     ├─▶ Quarantine Register
                                                                  │     └─▶ rerun → runs/…/execution/
                                                                  │            ExecutionResults.rerun-N.md
                                                                  └─▶ Final QA Report
                                                                        runs/…/reporting/
                                                                        (terminal — delivered)
```

Concretely, this means:

**Shared chain (both branches):**
- **Every module cites the PRD sections it derives from** (`modules.json` → `derivedFromSections`), so the decomposition itself is traceable and not an unexplained partition.
- Every Manual Test Suite test case cites the Project Context requirement ID it covers (§4, Stage 3) — and, because both live in the same module workspace, the module the requirement belongs to is the folder they are both in.
- **Every module artifact cites the exact revision of every artifact it consumed**, in its own `upstream` header (`module_architecture.md` §10.1). This is the link that makes the chain mechanically walkable in both directions rather than reconstructable by naming convention.

**Manual branch:**
- Every Manual Execution Result cites the Test Case ID it executed.
- Every row of the Manual Test Results CSV cites the same Test Case ID as its Markdown counterpart — the CSV and the Markdown are two renderings of one result set and must never disagree.
- Every Defect Record cites the Manual Execution Result that observed it, and the evidence files supporting it.
- The Manual QA Report's coverage figures are computed from the Traceability Matrix, back to Project Context requirements.

**Automation branch:**
- Every Automation Script cites the Test Case ID it automates, **and the module whose suite it belongs to**.
- Every module's `.module_automation_state.json` cites the runs that executed it (`sourceRuns[]`) and the `shared/` commit it was generated against (`baselineRef`), so a script in the assembled baseline traces back to the module project and the executions that validated it.
- **Every emitted locator cites its Selector Verification record** — the evidence that it was confirmed to resolve against the running application at generation time (§3.5). A locator with no verification record, or one recorded as unverifiable, is disclosed as such and never presented as confirmed.
- Every Execution Result cites the Test Case ID *and* the Automation Script ID that produced it.
- Every Repair Summary entry cites the Execution Result it repaired, the strategy applied, and the confidence report backing it; every `Automation Repaired` result cites both its pre-repair and post-repair execution.
- The Final QA Report's Requirement Coverage and Automation Coverage sections walk this entire chain in reverse — from Execution Result back to Project Context requirement — to compute what was actually verified versus merely documented, **and distinguish first-attempt passes from repaired ones**.

**The two branch chains never cross.** A Manual Execution Result never cites an Automation artifact, and no Automation artifact cites a Manual Execution Result (§3.3). Both legitimately cite the same shared upstream artifacts — the Traceability Matrix, the Test Suite, the Project Context — which is what allows a reader to compare manual and automated coverage of the same requirement without either branch depending on the other.

A gap anywhere in either chain (an artifact that cannot cite its predecessor) is itself a pipeline defect and must be surfaced at the next available checkpoint, not silently patched over.

## 9. Roles Summary

| Role | Branch | Responsible For |
|---|---|---|
| Business Analyst / Product Owner | shared | Stage 1 checkpoint |
| QA Lead | shared | Stage 2 checkpoint |
| QA Architect / Test Lead | shared | Stage 3 checkpoint |
| QA Lead / Test Lead | Manual | Stage `4M` checkpoint — the Manual branch's terminal review |
| Automation Lead / Release Manager | Automation | Stage `4A` Automation Approval, and any Stage `5H` re-merge approval (§5.2) |
| Automation Lead / Release Manager *(or delegate)* | Automation | Stage `5H` Batch Repair Approval (§5.6) — authorizing modification of already-approved code |
| Pipeline Orchestrator (tooling, not a person) | both | Invoking each agent in order **within a branch**, enforcing §5.3 gate mechanics, maintaining the Run Manifest. **Never invokes Stage `5H`** (§3.6) and never chains from one branch into the other (§3.3). |
| All stakeholders | Manual | Consumers of the Stage `4M` Manual QA Report + CSV — no approval role beyond the `4M` checkpoint |
| All stakeholders | Automation | Consumers of the Stage `6A` Final QA Report — no approval role, as this is the terminal artifact |

## 10. Knowledge Architecture (added 2026-07-12, user-mandated — the canonical definition every agent references)

**The platform hosts one project at a time (§1), but knowledge still splits into two layers — and that split survives the restructure for a reason.** Knowledge that is *about this application* (a screen's quirk, a business rule, a redirect behavior) is disposable the moment the platform is retargeted; knowledge that is *about testing engineering* (a locator recovery strategy, a retry pattern, a framework convention) must outlive it. Keeping the two apart is what lets `platform_core_data/` be cleared and repopulated for a new application without throwing away everything the platform has learned about doing its job. This section is the single source of truth for that model; every agent spec references it by number rather than restating it.

Note (2026-07-25): this section previously justified the split by cross-project isolation — dozens of concurrent projects each needing a sealed knowledge base. That justification no longer applies; the durability one above does, and it is now the operative rationale.

### 10.1 Two layers

| Layer | Location | Contains | Never contains |
|---|---|---|---|
| **Platform Knowledge** | `platform_core/knowledge/patterns/` | Reusable, application-agnostic engineering knowledge: automation strategies, repair strategies, diagnosis strategies, proven exceptions to Execution Engine defaults (not the engine's core retry/concurrency/stop-condition mechanics — fixed capability logic in `.claude/skills/automation-execution-skill/SKILL.md` §5, §19–§20), framework best practices, synchronization patterns, locator recovery strategies, reporting conventions, AI reasoning patterns, pipeline decision patterns, shared engineering lessons | Anything application-specific (a named screen, a specific business rule, a specific app's redirect behavior); anything that is Capability rather than Knowledge (agent skill definitions, orchestration/engine mechanics, runtime configuration) — those belong in `.claude/skills/` or `workflows_and_pipelines/`, never here |
| **Project Knowledge** | `platform_core_data/knowledge_base/` | Knowledge discovered from the hosted application only: business rules, UI observations, application findings, known behaviors, module relationships, navigation knowledge, screen inventory, discovery artifacts, execution history, automation history, repair history, known workarounds, application-specific locator rules, lessons learned | Anything that would still be true after the platform is retargeted at a different application — that belongs in Platform Knowledge instead, via Promotion (§10.5) |

### 10.2 Knowledge Resolution

Whenever any agent needs knowledge to do its job, it resolves in this fixed order and merges every applicable layer into its working context — never one layer alone:

1. **Platform Knowledge** (`platform_core/knowledge/patterns/`) — application-agnostic, promotion-only
2. **Project Knowledge** (`platform_core_data/knowledge_base/`) — this application, all modules
3. **Module output** (`platform_core_data/modules/{module}/`) — this module specifically

Each layer *extends* the one above it; none overrides or contradicts one silently — a project-specific finding that appears to contradict a Platform pattern, or a module observation that appears to contradict Project Knowledge, is disclosed as a discrepancy, not silently substituted.

**A Module Workspace is not a third knowledge layer.** It is per-module *engineering output* — neither hand-authored project knowledge nor promoted platform knowledge. It appears in the resolution order because a stage working on Login legitimately reads what earlier stages established about Login, not because the two-layer model gained a layer. A pattern learned while working one module reaches `patterns/` only through the §10.5 Promotion gate, and is never left to accumulate in a module as though it were general (`module_architecture.md` §10.6).

### 10.3 Structure — small versioned documents, not one giant file

Both layers are organized as small, individually-versioned documents, one concern per file — never a single growing markdown file. Each document carries a stable ID (e.g. `REPAIR-001` at the Platform layer, `REP-001` within a project's `repair/`) so it can be cited from other artifacts without re-stating its content.

Platform Knowledge subfolders: `automation_patterns/`, `diagnosis_patterns/`, `repair_patterns/`, `execution_patterns/`, `framework_patterns/`, `reasoning/`, `reporting/`, `pipeline_decision_patterns/`.

**Revision (2026-07-27):** the separate `diagnosis/` folder is removed. It was relocated into this layer empty on 2026-07-26 and then sat alongside `diagnosis_patterns/` — two folders for one category, with no rule distinguishing them and nothing in either. `diagnosis_patterns/` is the surviving name, consistent with every other `*_patterns/` sibling.

`pipeline_decision_patterns/` (renamed from `pipeline/`, 2026-07-21 governance review — the old name collided with this file's own layer, `workflows_and_pipelines/pipeline/`) is held deliberately empty: no agent or workflow is yet named as a reader in §10.7, and no Project Knowledge subfolder exists to promote a pattern from. Do not write into it until both exist.

There is no `skills/` subfolder here (removed, 2026-07-21 governance review). Cross-cutting agent capability is not Knowledge — it lives in `.claude/skills/`, a separate platform layer.

There is no `confidence_patterns/` subfolder here (removed, 2026-07-21). The Repair Confidence Engine's scoring rubric (§9 of the Self-Healing Skill spec) is fixed Capability logic, not a promotable Knowledge category — the rubric has never needed a calibration-adjustment layer in practice, and keeping an empty category open for one invited exactly the scope ambiguity flagged in that review.

Project Knowledge subfolders (the fixed shape §10.4 scaffolds): `business_rules/` and `lessons_learned/`.

**Revision (2026-07-27, user-mandated): seven categories were removed** — `application/`, `automation/`, `execution/`, `findings/`, `repair/`, `ui/`, and the supporting `notes/`. Every one had stood empty since the platform's inception. The reason they stayed empty is structural, not accidental: each named a kind of output the platform **already holds in full elsewhere** — discovery findings live in `modules/{module}/discovery/findings/`, execution history in `runs/{{RUN_FOLDER}}/execution/`, repair records in `modules/{module}/healing/`, generated automation in the module project and the baseline. Writing a second copy into a knowledge folder duplicated the owning record and created a place for knowledge to go and be forgotten.

The two survivors are the categories neither a module nor a run can carry:

| Folder | Why it survives |
|---|---|
| `business_rules/` | A rule the application enforces is true across every module and every run, and is never promoted to the Platform layer (it is application-specific by definition). No single module or run owns it. |
| `lessons_learned/` | A cross-module, cross-run observation about working with *this* application — by construction not scoped to the module or run that noticed it. |

**Where the removed categories' writes go now:** into the owning module or run per §7's table, and — when the lesson generalizes beyond this application — into `patterns/` via the §10.5 Promotion gate. Promotion is therefore the *only* mechanism for carrying application-agnostic engineering knowledge out of a module; see `.claude/skills/automation-execution-skill/SKILL.md` §28 for the consequence that has for repair records specifically.

**`knowledge_base/` also holds everything else that is shared across runs** (revision 2026-07-27, user-mandated). Beyond the knowledge categories above, this folder is the single home for every document and asset that is true of the *project* rather than of one execution:

| Group | Contents | Written by |
|---|---|---|
| Stage 1 inputs | `PRD.md`, `PRD_UserStories.md`, `run_configuration.md` | Humans |
| Project reference | `architecture.md`, `glossary.md`, `onboarding.md`, `automation_framework.md`, `reference_automation_project.md` | Humans |
| Detected stack | `stack.md` | Stage `4A` (§34.4 of `automation-skill`), correctable by humans |
| Supporting material | `requirements/{epics,features,user_stories,bugs,specifications}/`, `api/{swagger,postman}/`, `diagrams/` | Humans |
| Browser Driver assets | `browser/profile.json`, `browser/screens/`, `browser/components/` | Stage 2 tooling + humans |
| Credentials | `credentials/credentials.template.json` (committed), `credentials/credentials.json` (git-ignored) | Humans only |
| Baseline screenshots | `ui/screenshots/` — created on demand by the Browser Driver, not scaffolded | Browser Driver |

**The rule that decides the location:** if a document would still be correct at the start of the *next* run, it belongs in `knowledge_base/`; if it records what happened during one run, it belongs in that run's folder (§7). `stack.md` and its per-run companion `StackDocumentationContext_{Framework}.md` are the clearest illustration — the stack is durable, the record of which queries were made about it is not.

A previous layout scattered these across `platform_core_data/` root (the input documents), `platform_core_data/resources/` (supporting material), `platform_core_data/browser/`, `platform_core_data/credentials/`, and `platform_core_data/ui/`. Consolidating them removed the ambiguity of two plausible homes for the same kind of file, and left `platform_core_data/` with three top-level members whose distinction is real: `knowledge_base/` (shared, durable), `runs/` (per-run, immutable), and `automation_baseline/` (long-lived automation source code, §12).

Each top-level knowledge directory carries an `INDEX.md` (ID · Category · Title · Status · Producer · Consumers · Path) so an agent can locate relevant knowledge without scanning every file's full content.

### 10.4 Automatic Scaffolding

`platform_core_data/knowledge_base/` always carries §10.3's full subfolder list, each with its own `INDEX.md` — including folders currently holding nothing. An empty, indexed folder tells an agent "this category exists and has no entries yet"; a missing folder tells it nothing, and invites each agent to invent its own place to write. Whenever the platform is retargeted at a new application, that tree is scaffolded as part of setup — no manual step, no exceptions, the same shape every time.

**The scaffold is code, not prose.** `platform_core/tools/init/plan.js` holds the authoritative list as `DATA_DIRS` (folders) and `DATA_TEMPLATES` (the documents from §10.3's table, written blank from `templates.js`). This specification and that array must agree; when they disagree, the array is what actually runs, and the mismatch is a defect in whichever was updated without the other. `init` creates missing folders on re-install but **never overwrites an existing document** — the team's filled-in `PRD.md` survives every upgrade, `--force` included.

### 10.5 Promotion Workflow — explicit human approval only

Not every lesson learned becomes Platform Knowledge. Whichever Skill writes a new piece of knowledge (e.g. the Self-Healing Skill writing a confirmed repair rule, per `.claude/skills/self-healing-skill/SKILL.md` §10) writes it **only into `platform_core_data/knowledge_base/`** by default. When that Skill recognizes the lesson as one that would still hold against a *different* application (generic locator recovery, a retry strategy, a synchronization strategy, a framework pattern, a diagnosis pattern — not an app-specific behavior like "the dashboard redirects after login"), it proposes promotion and asks exactly once:

> "This lesson looks application-independent. Promote it to Platform Knowledge?"

- **Approved:** the agent authors a new (or updates an existing) Platform Knowledge document in the matching `platform_core/knowledge/patterns/` subfolder, generalized beyond this application, and the project-level document is updated to reference it (§10.2's merge, made explicit) rather than duplicating its content.
- **Declined:** the knowledge stays exactly where it is, project-scoped, and is never silently re-proposed on every subsequent run of the same pattern. It may be re-proposed only on genuinely new evidence of generality — most obviously, the same pattern recurring after the platform has been retargeted at a different application.

This is a Human Decision (`§5.5`), never inferred, never defaulted to "yes" because a pattern merely looks generic.

### 10.6 Layer separation guarantee

Application-specific knowledge must never end up in `platform_core/knowledge/patterns/` — this extends §6 Rule 9 (Two Roots, One Project) to the knowledge layer explicitly. An agent writes to Platform Knowledge only by passing the §10.5 Promotion Workflow's explicit human gate; it never writes there directly, and never "generalizes on the way in" to justify skipping the gate. The failure this prevents: a Platform layer quietly accumulating this application's screens and business rules, so that retargeting the platform carries the old application's assumptions along with it.

Note (2026-07-26): the Platform layer now sits **nested inside** the Project layer — Platform Knowledge at `platform_core/knowledge/patterns/`, Project Knowledge in the folders surrounding it (`knowledge_base/business_rules/` and `lessons_learned/`, after the 2026-07-27 removal of the seven empty categories — see §10.3). It reached this location in two steps, from `platform_core/knowledge/` via `platform_core_data/patterns/`. **The nesting is structural only and confers nothing semantically:** `patterns/` is not a category of Project Knowledge and does not inherit its application scope. Two consequences follow, and both are unchanged in force:

- **§10.2 resolution order is unaffected.** `platform_core/knowledge/patterns/` still resolves *first*, then the project-scoped folders under `knowledge_base/`. Since 2026-08-07 the two layers are also physically separate, so an agent walking `knowledge_base/` can no longer mistake Platform Knowledge for one more project category at the same precedence — the separation is now structural rather than a rule to remember.
- **This §10.6 rule binds regardless of parent folder.** `patterns/` is application-agnostic and Promotion-only wherever it lives. Because it now sits inside the folder that gets emptied on retarget, the isolation guarantee is *more* dependent on convention than before, not less — see `README.md` §16 step 4/5, where `patterns/` is the one subtree inside `knowledge_base/` that is deliberately **not** cleared.

The duplicate `diagnosis/` folder this move created alongside `diagnosis_patterns/` was removed on 2026-07-27 (§10.3) — the category has one folder, `diagnosis_patterns/`.

### 10.7 Skill read/write map

| Skill | Branch | Reads | Writes |
|---|---|---|---|
| Project Context Skill (Stage 1) | shared | Platform Knowledge + Project Knowledge + **the PRD** (sole reader) | `modules/{module}/context/` — one Project Context per module; the module registry via the Module Manager. Project Knowledge (`business_rules/`) as it establishes scope |
| Explorer Skill (Stage 2) | shared | Platform Knowledge + Project Knowledge + `modules/{module}/context/` | `modules/{module}/discovery/` (`findings/`, `evidence/`, behavioural observations). **Never writes selector/DOM data** (§3.5). Project Knowledge only for a `business_rules/` or `lessons_learned/` entry |
| Test Design Skill (Stage 3) | shared | Platform Knowledge + Project Knowledge + `modules/{module}/context/` + `.../discovery/` | `modules/{module}/test_design/`. Project Knowledge (`lessons_learned/`) where a design decision surfaces one |
| Manual Execution Skill (Stage `4M`) | Manual | Platform Knowledge + Project Knowledge + `modules/{module}/test_design/` (approved) + **Selector Verification KB** (read-only, §10.8) + **Repair KB** (read-only, for known application/environment quirks) | This run's `manual_execution/` folder (Results, CSV, QA Report, evidence). Project Knowledge (`lessons_learned/`) where an execution surfaces one. **Writes nothing under `modules/`** |
| Automation Skill (Stage `4A`) | Automation | Platform Knowledge (`automation_patterns/`, `framework_patterns/`, `repair_patterns/`) + `knowledge_base/stack.md` + `modules/{module}/test_design/` (approved) + `.../discovery/` + **Selector Verification KB** + **Repair KB** — both **mandatory reads before generation** (§10.8) | `modules/{module}/automation/` — a standalone module project; `automation_baseline/{framework}/shared/` for genuinely shared assets; **Selector Verification KB** (§10.8) — the only writer of verified locator records |
| Automation Execution Skill (Stage `5A`) | Automation | Platform Knowledge (`execution_patterns/`) + Project Context + the suite it runs (`modules/{module}/automation/` for a Draft module, the baseline for a Promoted one — resolved via `automationRoot.js`, §12.9) | This run's `execution/` folder (Execution Results, evidence, Health Summary); `.module_automation_state.json` → `Executed`. **Writes no automation code and no repair knowledge** — it no longer diagnoses or repairs (§4, Stage `5A`) |
| Self-Healing Skill (Stage `5H`) | Automation | Platform Knowledge (`repair_patterns/`, `diagnosis_patterns/`, `reasoning/`) + prior modules' Repair Summaries + **Repair KB** + **Selector Verification KB** | `modules/{module}/healing/` (Repair Summary, Confidence Report, Before/After Comparison, Quarantine Register); the repaired code in place in `modules/{module}/automation/` (Draft) or the module's owned paths in the baseline (Promoted, §12.9); **one appended rerun file** in the triggering run's `execution/`; **Repair KB** — confirmed repairs only, and `patterns/` only via the §10.5 Promotion gate |
| Reporting Skill (Stage `6A`) | Automation | Platform Knowledge (`reporting/`) + Project Knowledge | — (terminal stage) |
| Pipeline Orchestrator (tooling) | both | *(none — no read dependency on `pipeline_decision_patterns/` is defined yet)* | — |

### 10.8 Shared Execution Knowledge Bases — written once, used by both branches

**Two knowledge bases are explicitly shared across the branch boundary.** They are the *only* things both pipelines read in common beyond the Stage 1–3 artifacts, and they are shared deliberately: both describe how *this application behaves under test*, which is equally true whether a human or a script is driving.

This sharing does **not** violate branch isolation (§3.3). Isolation forbids one branch consuming the other's *deliverables* — a manual result must never bound automation scope, and a script must never depend on a manual pass. A knowledge base is not a deliverable; it is accumulated engineering knowledge about the application, and denying either branch access to it would mean rediscovering the same locator and the same failure mode twice.

| KB | Location | Written by | Read by | Holds |
|---|---|---|---|---|
| **Selector Verification KB** | `platform_core_data/knowledge_base/browser/screens/`, `.../browser/components/` | Stage `4A` (sole writer) | Stage `4A`, Stage `4M`, Stage `5H` | Per screen/component: the locator confirmed to resolve, the strategy used, its fallback chain, the verification timestamp, and the code-state anchor it was verified against |
| **Repair KB** | `platform_core/knowledge/patterns/repair_patterns/`, `.../patterns/diagnosis_patterns/`, `.../patterns/reasoning/` (Platform layer) + prior runs' Repair Summaries | Stage `5H` (sole writer; `patterns/` only via §10.5 Promotion) | Stage `4A`, Stage `4M`, Stage `5H` | Failure pattern → what fix worked, under what conditions, backed by which real executions |

**How each branch benefits:**

- **Stage `4A`** reads both *before* generating: the Selector Verification KB supplies already-confirmed locators for screens seen in an earlier run (skipping re-verification where the code-state anchor shows no drift), and the Repair KB supplies known failure modes to pre-empt in the first draft rather than discover by failing in `5A`.
- **Stage `4M`** reads both to execute more reliably: a verified locator tells a manual executor exactly which control the test case means when a screen has several plausible candidates, and a Repair KB entry warns of a known timing or environment quirk before it is mistaken for an application defect.
- **Stage `5H`** reads both to avoid re-deriving a fix the platform already knows, and is the only writer of the Repair KB.

**Rules:**

1. **Single writer per KB.** Stage `4A` is the only writer of the Selector Verification KB; Stage `5H` is the only writer of the Repair KB. A shared store with several writers becomes a store no reader can trust.
2. **Stage `4M` is a reader only.** Manual execution never writes to either KB — a human's observation during a manual pass is recorded in that run's `manual_execution/` artifacts and, where durable, in `lessons_learned/`.
3. **A KB entry is evidence, not authority.** A verified locator is evidence it resolved *at a recorded point in the application's history*. Where the code-state anchor shows drift (`run_manager.md` §5.8), the entry is treated as unverified and re-confirmed rather than trusted (§3.5's staleness argument applies to the KB exactly as it applies to Discovery).
4. **Application-specific by nature.** The Selector Verification KB is inherently about *this* application, so it lives in the Project layer and is cleared on retarget. Only the generalized *reasoning* in the Repair KB reaches the Platform layer, and only through the §10.5 Promotion gate (§10.6).
5. **Never a requirements source.** Neither KB ever tells a stage what the application *should* do — that remains exclusively the approved Project Context's role (§6 Rule 5).

## 11. Debug Mode & Temporary Execution Artifacts (added 2026-07-12, user-mandated)

Stages that drive a live browser or write throwaway scripts to accomplish their work (chiefly Stage 2 Explorer, Stage `4M` Manual Execution, Stage `4A` Automation's selector verification, Stage `5A` Automation Execution, and Stage `5H` Self-Healing's diagnosis passes) must not let that internal tooling leak into a project's permanent artifact tree. This applies with particular force to Stage `4M`, which **must never leave a script behind as an artifact** (§3.3) — a throwaway driver script it wrote to reach a screen is debug scaffolding by definition, deleted after use. Only the **outputs** those stages are actually specified to produce (§4's Expected Artifacts per agent — Discovery snapshots/Findings/Coverage/QA Assessment Report, Automation packages, Execution Results/Evidence, Reports) belong under `platform_core_data/modules/` or `platform_core_data/runs/{{RUN_FOLDER}}/`, in whichever of the two §7's table assigns them.

### 11.1 Debug Mode flag

A project- or run-level flag, **default `Off`**, recorded in that run's Project Context or `run_configuration.md` if ever turned on:

- **Debug Mode: Off (default).** Any script written purely to drive browser automation, probe a screen's structure, or otherwise accomplish a stage's work (e.g., a one-off Node/Playwright script) must be written to a temporary location outside the project tree (the platform's scratchpad, or an OS temp directory) and **deleted immediately after the run extracts what it needs from it**. Raw tool-output dumps (full-page JSON captures, unfiltered element enumerations) are never written into `platform_core_data/` — only the synthesized, human-readable artifact the stage is actually specified to produce.
- **Debug Mode: On.** Explicitly enabled by the user for active troubleshooting of the tooling itself (not of the application under test). When on, intermediate scripts and raw result dumps may be persisted, but only under a clearly separated `_debug/` subfolder within that run's own folder (`platform_core_data/runs/{{RUN_FOLDER}}/_debug/`) — never mixed into a run's `execution/` or a module's `discovery/`, `test_design/`, or `automation/` — and the run's manifest entry must note Debug Mode was on, so a reviewer isn't confused about why extra files exist. **Debug output never lands under `modules/`**, whatever the mode: a Module Workspace is durable and shared, and scratch content there would outlive every reason it was written.

### 11.2 What counts as a permanent artifact vs. debug scaffolding

- **Permanent:** a Discovery snapshot, a Finding and its Evidence Package, the QA Assessment Report, Timeline, Coverage Summary, Test Design outputs, an Automation package, Execution Results/evidence, the Final QA Report — i.e., anything §4/Expected-Artifacts tables across the agent specs actually name. A screenshot that is a Finding's or a defect's evidence (§11.4) is permanent.
- **Debug scaffolding, never persisted by default:** the Node/Playwright (or other) script used to drive the browser to get that screenshot; raw, pre-synthesis JSON dumps of every element on a page; one-off reconnaissance screenshots taken only to verify navigation/tooling before the real discovery pass, not to document an application screen.
- When in doubt whether a given file is a deliverable or scaffolding, ask: "Does an agent spec's Expected Artifacts table name this?" If not, it does not belong anywhere under `platform_core_data/`.

### 11.3 Retroactive scope

This rule governs all runs from 2026-07-12 onward. Pre-existing debug scripts/raw dumps left in earlier runs' artifact folders (e.g., `_login_discovery.js` and its `_results.json` under RUN-20260712-001) are not automatically deleted by this section — cleaning up a prior, already-approved run's artifacts is a separate decision to confirm with the user, not an automatic side effect of adopting this rule.

This must remain a permanent platform capability, not a habit built around the currently-hosted application — whatever `platform_core_data/` is retargeted at next loads Platform Knowledge plus its own Project Knowledge, with no architectural change required.

### 11.4 Screenshots only for Findings and defects

**User-mandated (2026-10-08).** Every stage that drives a browser (Stage 2, `4M`, `5A`, `5H`) takes a
screenshot **only** when it is evidence for:

- a **Finding** (Stage 2, any Category — including the annotated screenshot an unclear item requires), or
- a **defect** — a test case that is `Failed`, `Blocked`, or `Inconclusive`, or an execution-time
  observation that becomes a defect or an Open Question.

**Never** for a `Passed` case, a navigation step, a "key step", a screen visited along the way, or to
prove that a screen exists.

**Screenshots are one evidence type among several, and only a UI one.** Evidence follows the test
type — a screenshot is never the default, and never a substitute for the type's own evidence:

| Test type | Evidence for every case (incl. `Passed`) | Added for a defect |
|---|---|---|
| UI | Observed values quoted in text next to the Expected Result — labels, amounts, totals, statuses, messages | Screenshot of the failure state; console log; DOM/accessibility excerpt of the affected element |
| API | Request (method, endpoint, key headers, body) and response (status, body or the asserted fields) | Full request/response pair, correlation/trace ID, timing |
| DB / persistence | The query (or record lookup) and the returned rows/fields that were asserted | Full result set for the affected records; before/after state where the case mutates data |
| Integration / NDC | The compared values from each side, with the `ndc_execution_rules.md` §A9 classification | Both payloads, the integration layer's response, network calls |
| Non-UI (logs, files, jobs) | The log line, file content, or job status that was asserted | The surrounding log window, the full file, job history |

Every captured secret (tokens, credentials, API keys) is redacted before it is written, whatever the
type. A UI case that also asserts an API or DB effect carries both types' evidence.

**A `Passed` result must show that each assertion was validated, not just that values were captured.**
For every assertion in the case's Expected Result, record one row:

| Assertion | Expected | Actual (observed) | Check | Result |
|---|---|---|---|---|
| Seat summary shows the selected seat and price | `1C · EGP 1,180` | `Rania · 1C · EGP 1,180` | contains | ✅ |
| Total = base fare + seat price | `20,736.18` | `20,736.18` | equals (2 dp) | ✅ |
| `GET /booking/{pnr}` returns the seat | `seat = 1C` | `seat = "1C"` | equals | ✅ |

- **Expected** is taken from the test case's Expected Result (or the contract it cites), not from what
  was observed.
- **Check** names how the two were compared — `equals`, `contains`, `matches <pattern>`, `≥`, `within
  ±N`, `present`/`absent`, `classification = Exact Match` (§A9). A normalization or tolerance is stated,
  never implied.
- **Every assertion gets a row.** An assertion that could not be checked makes the case `Inconclusive`,
  never `Passed`; a list of observed values with no expected value beside it is not evidence of a pass.

**Why:** screenshots are the largest avoidable cost of a browser stage — each one is a file, and each one
viewed is image tokens in the agent's context, repeated on every later turn of that session. A suite of
mostly-passing cases was producing dozens of screenshots nobody reads.

Two rules that follow from it:

1. **Save, don't view.** A screenshot is written to the run's `artifacts/` folder and cited by path. The
   agent judges the screen from the page's text/accessibility snapshot, and opens the image itself only
   when a visual-only defect (layout, overlap, colour, truncation) cannot be judged any other way.
2. **The evidence floors elsewhere still apply to what IS captured.** A Finding still gets its
   Category's evidence set (`explorer-skill` §5.11), and a defect still gets the full Defect
   Documentation Standard (`manual-execution-skill` §10.1). This rule removes screenshots from passing
   work; it never thins the evidence for a real problem.

An automation framework (Stage `5A`) is configured the same way: screenshot **on failure only**.

## 12. Automation Asset Lifecycle (added 2026-07-24, user-mandated)

> **Path revision (2026-07-27):** the baseline moved from `platform_core_data/workspace/automation/{framework}/` to `platform_core_data/automation_baseline/{framework}/` when §7 removed `workspace/`. Only the path changed. The baseline is deliberately *not* inside a Run Folder: it is long-lived automation *source code* under a three-way-merge lifecycle that must outlive any single run, which is the opposite of the per-run, single-file-in-place discipline §7 applies to Markdown artifacts.
>
> **Source revision (2026-07-29, user-mandated):** the *middle* location changed. Generation no longer happens in a temporary per-run working copy; it happens in a **durable, standalone Module Automation Project** under `modules/{module}/automation/` (§12.1). **The merge mechanism is entirely unchanged** — the same hard pre-check, three-way classification, lock guard, untracked-file classification, and Merge Summary. Only what feeds the merge changed: an *approved module project* rather than an approved run working copy. `module_architecture.md` §7 gives the derivation and §7.6 the section-by-section disposition.
>
> **Terminal-promotion revision (2026-08-17, user-mandated):** the module project is **no longer durable**. It is a *pre-promotion* workspace. On the first successful promotion — merge, then byte-identity verification, then a passing live run — it is **permanently deleted**, and the Workspace Automation Baseline becomes that module's single source of truth for everything afterwards: generation, execution, repair, self-healing. §12.9 defines how a module is located and edited inside the shared baseline, and §12.10 lists the safety rules. What the 2026-07-29 revision achieved physically — one module's work cannot reach another's — is now achieved by declared ownership plus scoped suites, because after promotion every module's code shares one tree.

**Generated automation needs a home between "just written" and "part of the whole-project suite."** Before this revision it had only two: a temporary run working copy, and the whole-project baseline. That left no place for a module's suite to be developed, executed, healed, and approved as a coherent unit — so the process kept reaching for the wrong one, either hand-editing a run folder across several later runs (defeating run immutability) or editing the baseline directly (defeating the merge protection). `platform_core_data/automation_baseline/{Framework}/` remains the **Workspace Automation Baseline** — the single authoritative, persistent copy of the project's automation code — and it is now assembled from approved module projects rather than merged from a temporary copy.

### 12.1 Three locations

| Location | Path | Role |
|---|---|---|
| **Module Automation Project** *(pre-promotion only)* | `platform_core_data/modules/{module}/automation/tests_{Framework}/` | Where Stage `4A` generates, Stage `5A` executes from, and Stage `5H` heals — **until the module is promoted**. A **standalone, independently runnable project** with its own config and dependency manifest. **Permanently deleted at promotion** (§12.5); a module has this home exactly once in its life. |
| **Workspace Automation Baseline** | `platform_core_data/automation_baseline/{framework}/tests_{Framework}/` | The authoritative, persistent, whole-project suite. Before a module's promotion it is written **only** by the Workspace Merge (§12.4). After that module's promotion it is that module's **single source of truth**, edited in place and scoped by ownership (§12.9). |
| **Shared assets** | `platform_core_data/automation_baseline/{framework}/shared/` | Base page objects, auth fixtures, common utilities, test-data factories — generated **once** and referenced by each module project through a relative path. The one direction in which a module project reads outside itself. |
| **Target Project** | `{{TARGET_ROOT}}/<automationRoot>/` | Unchanged: the projection of an approved baseline, per §13.3. |

The framework subfolder appears in the baseline path but not the module path, and that asymmetry is deliberate: the baseline holds every framework's package side by side and needs them separated, while a module works on exactly one package (resolved by §33.1's gate) and has nothing to separate it from.

**The Run Automation Working Copy is removed.** Its entire purpose was to give generation a scratch location that was not the baseline. The Module Automation Project serves that purpose strictly better, because it persists, is scoped to one module, and can be executed and healed as a unit.

**Shared assets are proposed, never edited by a module.** A module project needing a change to `shared/` records the proposal in its `AutomationDecisionReport.md`; the change is applied at assembly time (§12.4). Shared code is whole-project surface, so it clears the whole-project gate rather than one module's — and duplicating an auth fixture five ways guarantees five drifts.

This composes with, and does not replace, `.claude/skills/automation-skill/SKILL.md` §30–§33.1's existing consolidated Decision Gate — that gate decides *which* package (Target/Framework/Strategy) is worked on; this section governs what happens to that package's *files* before, during, and after.

### 12.2 The four steps

**Before the first promotion — four steps, then a fifth that ends the module's life in the workspace:**

1. **Module Project Creation** (§12.3) — right after §33.1's gate resolves the package identity, before any generation. **Skipped entirely for an already-promoted module**, which has no working copy and must not be given one (§12.10).
2. **Automation Review** — the *existing*, unmodified §5.2 Automation Approval Required gate, **per module**. Only `Approved` triggers step 3.
3. **Workspace Merge / Assembly** (§12.4) — only after Approved.
4. **Cleanup** (§12.5) — build/IDE output only.
5. **Verification and Retirement** (§12.5) — byte-identity proof, a passing live run of the module-scoped suite from the baseline, then permanent deletion of the module project. The module becomes `Promoted`.

**After promotion there are no steps, because there is no second copy to move.** Every later change is an in-place baseline update under §12.9, recorded rather than merged.

```
  Workspace Automation Baseline                     Module Automation Project
  (authoritative, whole-project)                    (durable, per module, standalone)
 ┌───────────────────────────┐  Step 1: shared/     ┌───────────────────────────┐
 │  tests_{FW}/  +  shared/   │ ───── reference ───▶ │  tests_{FW}/               │
 │                            │                      │  (Stage 4A generates here, │
 │                            │                      │   5A executes, 5H heals)   │
 └───────────────────────────┘                      └─────────────┬─────────────┘
              ▲                                                    │
              │                                       Step 2: Automation Review
              │                                        (pipeline.md §5.2, per module)
              │                                                    │
              │                                           Approved │  Rejected/Needs Changes
              │  Step 3: Workspace Merge / Assembly                │  (loop back to Stage 4A,
              └───────  (after Approved) ◀───────────────────────  ┘   same module project)
                         │
                         ▼
               Step 4: Cleanup — build/IDE output only (§12.5)
                         │
                         ▼
               Step 5: Verify byte-identity  ──▶ live module-scoped run passes
                         │                                    │
                         │                              ▼ fails: module project
                         ▼                                 is KEPT, nothing deleted
               RETIRE modules/{m}/automation/tests_{FW}/
               state := Promoted, sourceOfTruth := baseline
                         │
                         ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  From here the baseline IS the module (§12.9). Later work — 4A, 5A,  │
   │  5H — happens in automation_baseline/, scoped by .baseline_          │
   │  ownership.json and run with testng-{module}.xml. No copy back.      │
   └─────────────────────────────────────────────────────────────────────┘
```

### 12.3 Step 1 — Module Project Creation

Once §33.1's consolidated gate has resolved which package this module targets:

- **The module project is created if absent, and reused in place if present.** A second Stage `4A` pass on the same module extends the project it already has — it does not start a fresh copy. This is §7's in-place-edit discipline applied to code, with git as the history.
- **Shared assets are referenced, not copied.** Record the `shared/` folder's path-scoped git commit hash at generation time (`git log -1 --format=%H -- <shared-path>`, never a bare repo `HEAD`, since this is a monorepo and an unrelated commit elsewhere must never look like a change) as `baselineRef` in `.module_automation_state.json`. This is what Step 3's conflict check compares against later — the same anchor `.lifecycle_snapshot.json` previously held, in the file that now tracks the module project's lifecycle.
- If no `shared/` exists yet (a brand-new package), the module project starts self-contained, and its first assembly establishes `shared/`.
- **Generation happens only inside the module project.** The Automation Skill must never edit the Workspace Automation Baseline directly (see the corresponding Execution Rule in `.claude/skills/automation-skill/SKILL.md` §18).
- Implemented by `platform_core/tools/automation_lifecycle/baselineCopy.js` (`copyBaselineIntoModule`) — no agent or script hand-rolls this step, the same discipline already established for run folder naming (`run_manager.md` §5.5).

#### 12.3.1 The module automation lifecycle

`.module_automation_state.json`, in the module's `automation/` folder, tracks it through exactly five states:

| State | Meaning | Set by |
|---|---|---|
| `Generated` | Stage `4A` wrote it; not yet executed | Stage `4A` |
| `Executed` | Stage `5A` ran it; results are in a run folder, referenced here | Stage `5A` |
| `Healed` | Stage `5H` applied approved repairs and re-ran the affected tests | Stage `5H` |
| `Approved` | Cleared the §5.2 gate; eligible for assembly into the baseline | The gate, recorded by the Module Manager |
| `Promoted` | Assembled, verified, live-proven, and retired from the workspace. **Terminal.** | `automation_lifecycle/cli.js retire-module`, never by hand |

It also carries `sourceRuns[]` (every run that executed this project), `baselineRef`, `assembledAt`, and — from the terminal-promotion revision — **`sourceOfTruth`** (`module` or `baseline`), `ownedPaths[]`, `retiredPath`, `promotedAt` / `promotedBy`, `promotionVerification`, and `baselineUpdates[]`.

**`Approved` is a prerequisite for assembly and is never inferred** — a state file cannot approve itself. **`Promoted` is likewise never declared**: `setAutomationState` refuses it outright, because it is the *outcome* of a verified promotion rather than an assertion a caller can make. And `Promoted` is **terminal in both directions** — no transition leads out of it, since every other state implies a working copy that no longer exists. Post-promotion work is recorded with `recordBaselineUpdate()` (§12.9).

**`sourceOfTruth` is the field every path resolver reads**, never the state name. One field, one question, one answer — `automation_lifecycle/automationRoot.js` is the only implementation of it.

### 12.4 Step 3 — Workspace Merge / Assembly

Only triggered once Automation Review (§5.2) marks **that module's** automation `Approved`. The source is the approved Module Automation Project; **every step below is unchanged from the run-working-copy version of this section.**

The two project types differ in destination, and only in destination:

**Greenfield** — the baseline is the deliverable, assembled from every approved module:

```
modules/login/automation/tests_PW/     ─┐
modules/booking/automation/tests_PW/    ├─▶  automation_baseline/playwright/tests_PW/
modules/agency/automation/tests_PW/    ─┘         (one project, all approved modules)
                                                          │
                                                          ▼  §13.3, after the gate
                                                  {{TARGET_ROOT}}/tests/
```

**Brownfield** — the team's existing suite is the deliverable, and its structure governs:

```
modules/login/automation/tests_PW/  ──▶  automation_baseline/  ──▶  merged into the team's
   (generated to match the                  (lifecycle-managed,       existing structure at
    detected layout — §13.2)                 reproducible source)     {{TARGET_ROOT}}, per §13.3
```

In brownfield the module project is generated to match the **detected** layout, naming, and page-object pattern from the start (§13.2 #3), so assembly is a merge into an existing structure and never an imposition of the platform's own. The baseline still sits in between, and §13.7's ordering rule is unchanged: **generate → approve → merge to baseline → then project into the Target Project.** The baseline is always the reproducible source.

1. **Hard pre-check:** the baseline must have zero uncommitted changes (`git status --porcelain`). A dirty baseline — e.g. a human hand-edited a file directly, outside the pipeline — blocks the merge and is reported; it is never silently overwritten.
2. **Conflict check:** compare the baseline's current path-scoped commit hash to the `baselineRef` recorded at Step 1.
   - **Unchanged** — nothing else has assembled into this baseline since this module project was generated. A plain two-way diff (module project vs. baseline) is valid: every difference is this module's own intentional change. Fast-forward merge.
   - **Changed** — a *different module's* assembly landed in this same baseline while this one was in flight. A naive two-way diff is unsound here: it cannot tell "the other module added this, we never saw it" apart from "we deleted this," and would silently delete the other module's already-assembled work. Instead, a proper **three-way classification** is used — base (baseline content at the recorded ref, reconstructed via `git show`), theirs (baseline now), ours (module project now) — the same base/theirs/ours model every real merge tool uses. Only a path genuinely changed on *both* sides since the ref is a real conflict, held for explicit human approval before merging just those files; everything else merges normally.
   - **This case is now the common one, not the exceptional one.** Assembling five modules into one baseline means four of them meet a baseline that has moved. The three-way classification is what makes per-module assembly safe at all, and it is why the mechanism was kept rather than simplified.
3. **Lock guard:** an exclusive lock file (`.automation_lifecycle.lock`, created via an atomic `wx`-flag write) in the baseline directory prevents two assemblies from racing on the same baseline.
4. **Write the merge:** new/modified content is copied over the baseline and `git add`-ed; deletions are `git rm`-ed; unambiguous, unmodified renames are `git mv`-ed (a renamed-and-modified file is not auto-detected as a rename — it merges as a separate delete+add; this is a stated, acceptable limitation, not a data-loss risk, since the content is still fully accounted for). The commit message records the **source module** and the run that approved it, plus Added/Modified/Deleted/Renamed counts.
5. **Untracked/ignored files are classified separately, never silently dropped or silently merged.** A generated package commonly contains build/IDE output its own nested `.gitignore` excludes (confirmed real example: `tests_SHAFT/` has 299 files on disk but only 65 tracked — `target/`, `allure-results/`, `execution-summary/`, `generatedReport*.zip` are all git-ignored) — these are evaluated via `git check-ignore --no-index` (which works even on a not-yet-committed project) and reported on their own explicit "Discarded Untracked" line in the Merge Summary.
6. **Any approved change to a shared asset is applied to `shared/` at this point** (§12.1), never earlier, and appears in the Merge Summary on its own line so a reviewer can see that a whole-project asset moved as part of one module's assembly.
7. Produces a **Merge Summary**: Added / Modified / Deleted / Renamed / Conflicts (and resolution) / Discarded Untracked / Shared Assets Changed — the source data for `automation_promotion.md` (§12.6).

Implemented by `platform_core/tools/automation_lifecycle/mergePlan.js` (plan computation, side-effect-free) and `mergeApply.js` (the actual writes, gated behind an explicit `apply` flag — dry-run by default, mirroring `run_manager/migrate.js`'s own `--apply` convention).

### 12.5 Step 4 — Cleanup, and Step 5 — Verification and Retirement

**Cleanup** applies only to **build and IDE output already classified as Discarded Untracked** by the Merge Summary — `target/`, `allure-results/`, `execution-summary/`, `generatedReport*.zip`, and their equivalents. Anything still held back for an unresolved conflict stays where it is until a follow-up merge resolves it.

- **Never touches source.** Test files, page objects, fixtures, helpers, config, and dependency manifests survive cleanup: until retirement the project must stay runnable, and after retirement there is nothing to clean.
- **Never touches anything outside the package directory** — every one of the following is permanent history and is never deleted by this step *or by retirement*: the Automation Plan/Manifest/Decision Report/Coverage Report/Suite Manifest/Summary (`.claude/skills/automation-skill/SKILL.md` §19), Automation Review notes, Stage `5A` execution results and all evidence (screenshots/videos/logs/traces/network captures), Stage `5H` healing reports, and `automation_promotion.md` itself.
- **Never targets the baseline.** `cleanupPackage()` refuses any path inside `automation_baseline/` outright (§12.10 rule 1).
- Implemented by `platform_core/tools/automation_lifecycle/cleanup.js` — deletion is always driven by the Merge Summary's own accounted-for file list, never a blind recursive directory delete.

#### 12.5.1 Step 5 — Verification and Retirement (added 2026-08-17, user-mandated)

Retirement is a **different act from cleanup**, with a different precondition, and it is deliberately not expressed as a cleanup scope: a caller must not be able to reach "delete the entire module suite" with the same argument shape that empties a `target/` directory. It has its own function, `retireModulePackage()`, and its own required proof.

**The required order. Every step gates the next, and nothing is deleted until all of them have passed:**

| # | Step | Gate |
|---|---|---|
| 1 | Lifecycle and ownership protection in place | Unit tests green |
| 2 | **Byte-identity verification** — every non-ignored module file exists in the baseline with an identical SHA-256 | `promoteVerify.js` reports `passed: true`. No threshold, no "close enough": one missing test class is one test that silently stops running |
| 3 | **The baseline compiles independently** at its own path | `mvn test-compile`, 0 errors |
| 4 | **The module-scoped suite runs live from the baseline**, in the execution mode the human selects (§6 Rule 11) | Results reviewed and accepted |
| 5 | Results confirmed valid against the approved acceptance criteria | Human confirmation |
| 6 | **Retire** `modules/{module}/automation/tests_{Framework}/` | All of the above |
| 7 | Record retirement, baseline commit, evidence, and any accepted failures | `automation_promotion.md`, `AutomationPackages.md`, `.module_automation_state.json` |
| 8 | Confirm the retired directory was not recreated | `cli.js check-retired` |
| 9 | Final broken-reference and ownership checks | `cli.js check-ownership`, doc reference sweep |

**A failed live run means nothing is deleted.** The module project stays exactly where it is, and the promotion is simply not finished. Retirement is the reward for a proven baseline, never a step that runs on schedule.

**What retirement removes, and what it must not.** Only `automation/tests_{Framework}/`. Everything else under `modules/{module}/` is permanent module history and evidence and stays: `automation/*.md`, `.module_automation_state.json`, `healing/`, `discovery/`, `test_design/`, `README.md`. `retireModulePackage()` enforces this by checking the *shape* of the path it was handed — a `tests_*` directory whose parent is `automation/` — and refusing anything else, because pointed one level up it would take the governance artifacts with it.

### 12.9 Working on a Promoted module (added 2026-08-17, user-mandated)

Once a module is `Promoted`, the Workspace Automation Baseline is where its code is generated, executed, repaired, and healed. There is no copy-out and no copy-back.

**Locating the module inside a shared tree.** `{baseline}/.baseline_ownership.json` records, per module, the paths it owns and the module-scoped suite file that runs it. Every path a stage intends to write is classified against it:

| Classification | Meaning | What happens |
|---|---|---|
| `owned` | This module's own code | Proceed |
| `shared` | Whole-project surface — `pom.xml`, base page objects, auth fixtures, common utilities | Proceed **and declare** in the run's Decision Report. §12.1's existing rule is unchanged: shared code clears the whole-project gate, not one module's |
| `foreign` | Owned by a **different** module | **Hard stop.** Never a warning, never a silent write |
| `unowned` | Not claimed by anyone | Proceed — a genuinely new file has no owner yet, and treating "new" as "someone else's" would make it impossible to add anything |

Two modules may never claim the same path: `registerModuleOwnership()` refuses an overlapping claim rather than merging it, because with two owners the foreign guard answers "owned" for both and stops protecting anything.

**Execution is module-scoped by default.** `mvn test -DsuiteXmlFile=testng-{module}.xml` runs just that module; plain `mvn test` runs the whole-project regression. Both are expected — the scoped suite for iteration, the full one before a promotion-equivalent change is recorded.

**Approval, verification, and recording — the §5.2 gate does not weaken.** An in-place change to a promoted module still needs an Automation Approval before it is recorded, still runs the module-scoped suite plus whatever regression the change's blast radius calls for, and is then recorded with `recordBaselineUpdate()`: changed files, verification results, approver, run, and baseline commit. `automation_promotion.md` and `AutomationPackages.md` are updated the same way. What does **not** happen is a second module-to-baseline copy — there is no second copy to move, and treating an in-place edit as a merge would invent a source that does not exist.

**What is lost, stated plainly.** Before promotion the three-way merge protected one module's code from another's. An in-place edit has no merge, so that protection is now the ownership check plus review. This is the cost of the single-source-of-truth model and is the reason `check-ownership` runs after every post-promotion change rather than occasionally.

### 12.10 Safety rules for promoted modules (added 2026-08-17, user-mandated)

1. **The baseline is never deleted by cleanup or retirement.** Both entry points refuse any path inside `automation_baseline/`, checked on the resolved path so a relative walk cannot slip past. After promotion the baseline is the only copy that exists.
2. **The module working copy is never modified after promotion**, because it must no longer exist. `copyBaselineIntoModule()` refuses a `Promoted` module outright rather than re-seeding one.
3. **If the module directory is recreated, stop and report it — never use it.** `resolveAutomationRoot()` throws `MODULE_DIR_RESURRECTED` rather than quietly preferring the baseline, because a resurrected directory looks authoritative while being a dead end: nothing executes from it, so work done there is lost silently. `cli.js check-retired` is the standalone form of this assertion.
4. **Draft or Promoted is read from state before any edit**, never guessed from what happens to be on disk. `Draft` → module workspace. `Promoted` → baseline. One resolver, one answer.
5. **Changes stay scoped** to the requested module and its genuinely shared dependencies. Unrelated modules in the baseline are never overwritten.

### 12.6 `automation_promotion.md`

Written permanently into the module (never deleted by Cleanup) at `modules/{module}/automation/automation_promotion.md`, recording: Promotion Status, Merge Date, Approved By, **Source Module**, Approving Run, Workspace Destination, Files Added, Files Modified, Files Deleted, Files Renamed, Discarded Untracked Files, Shared Assets Changed, Conflicts Detected, Conflicts Resolved, Merge Result, Notes. Rendered by `platform_core/tools/automation_lifecycle/promotionRecord.js`.

A **Bootstrap Migration** — lifting pre-existing, not-yet-lifecycle-managed automation into a Workspace Automation Baseline for the first time — is **unchanged**: recorded with `Promotion Status: Bootstrap Migration` and `Approved By: N/A — Bootstrap Migration`, never a fabricated Automation Approval record for code that hasn't actually been reviewed against §5.2's real criteria. The originating module's own Automation Approval checkpoint is left exactly as it was — a bootstrap migration and a real Automation Approval are two distinct events, never conflated.

### 12.7 Registry cross-reference

`AutomationPackages.md` (`.claude/skills/automation-skill/SKILL.md` §19/§31) is extended with a **Module**, Baseline Ref, and Last Assembled columns per package, so the next Stage `4A` invocation's registry summary (§31.1) can state not just which packages exist, but which modules have been assembled into the baseline and which are still pending approval.

### 12.8 Where each §12 rule now lives

For readers holding the pre-revision version of this section, the disposition is explicit:

| Pre-revision | Status |
|---|---|
| §12.1 Two locations | **Superseded** by §12.1's three (plus `shared/`) |
| §12.2 The four steps | **Amended**: Step 1 becomes Module Project Creation; Steps 2–4 unchanged in mechanism |
| §12.3 Working Copy Creation | **Superseded** by §12.3. `.lifecycle_snapshot.json`'s role is served by `.module_automation_state.json`'s `baselineRef` |
| §12.4 Workspace Merge | **Unchanged in mechanism.** Triggered by module approval instead of run approval |
| §12.5 Cleanup | **Narrowed** to build/IDE output; the module project is kept |
| §12.6 `automation_promotion.md` | **Unchanged**, written to the module instead of a run folder. Bootstrap Migration unchanged |
| §12.7 Registry cross-reference | **Extended** with per-module columns |

And for readers holding the 2026-07-29 version, the terminal-promotion revision's disposition:

| 2026-07-29 rule | Status after 2026-08-17 |
|---|---|
| §12.1 Module project is the module's **durable** home | **Superseded.** It is a pre-promotion workspace, deleted at promotion |
| §12.2 Four steps | **Extended** to five: Verification and Retirement is added as Step 5 |
| §12.3 Module Project Creation | **Unchanged for a Draft module; skipped entirely for a Promoted one** |
| §12.3.1 Four lifecycle states | **Extended** to five, with `Promoted` terminal and `sourceOfTruth` added |
| §12.4 Workspace Merge | **Unchanged, and now first-promotion-only.** A promoted module updates in place (§12.9) instead of merging |
| §12.5 Cleanup keeps the module project | **Superseded** by §12.5.1: cleanup still keeps it, retirement then removes it once proven |
| §12.6 / §12.7 records | **Unchanged in shape**, extended with promotion and in-place-update fields |

## 13. Target Project Integration (added 2026-07-26, user-mandated)

**The platform is installed into the repository it tests.** The tool folder sits inside the Target Project, and the generated automation this pipeline produces belongs in the Target Project's own test directories — not in a parallel universe under `platform_core_data/`. A suite the host team cannot run with their own `npm test` / `mvn verify` is not a deliverable. This section defines the contract that makes that safe.

### 13.1 The two roots

| Root | Resolved from | Contains | Platform access |
|---|---|---|---|
| **Tool Root** | marker walk-up (§1.1) | `platform_core/`, `platform_core_data/`, `workflows_and_pipelines/`, `platform.config.json` | Read + write, unrestricted |
| **Target Project Root** (`{{TARGET_ROOT}}`) | `platform.config.json` → `targetRoot` | the application under test | Read per §13.2, write per §13.3, never per §13.4 |

Both are resolved by `platform_core/tools/platform_paths/paths.js` and by nothing else. An agent that needs an absolute root runs `node platform_core/tools/platform_paths/cli.js roots --json`. An agent must never infer either root from `process.cwd()`, from `__dirname`, or by searching for `.git`.

### 13.2 What may be READ from the Target Project

Permitted, for **technical fact-finding only**:

1. **Dependency manifests and lockfiles** — via `detectStack` (`platform_core/tools/mcp/stack_docs/detectStack.js`). Establishes framework and version so Stage 5 generates against the real API surface (§34).
2. **Test-framework configuration** — `playwright.config.*`, `pom.xml`, `pytest.ini`, `testng.xml`, etc. Establishes where tests live and how they run.
3. **Test directories and their contents** — via `detectTestDirs` (`platform_core/tools/mcp/stack_docs/detectTestDirs.js`). Establishes layout, file naming, page-object pattern, fixture strategy, language, and formatting, so generated code is indistinguishable in style from what the team already writes.
4. **Existing automation code** — read to *extend and reuse* rather than duplicate. This is §11's Automation Knowledge Base rule and §32.5's reuse rule, applied to the Target Project.
5. **Build/test scripts** — `package.json#scripts`, Maven/Gradle test tasks — so Stage 5A invokes the suite the way the team does.

**Not permitted as a source of intent, under any circumstances:** application source code, database schemas, API implementations, comments, commit history, issue trackers, or existing tests' assertions, used to derive requirements, business rules, acceptance criteria, or expected behavior. Reading application source to *understand a selector or a route* is permitted and is a technical fact. Reading it to decide *what the correct output should be* is a §6 Rule 9 violation. When the two are hard to separate, the agent stops and asks (§26 Stop Conditions) rather than deciding.

**A read denylist is enforced mechanically**, not by convention: `target.readDenylist` in `platform.config.json`, merged with a non-overridable built-in list (`.env*`, `**/credentials*.json`, `**/secrets*`, `**/*.pem`, `**/*.key`, `**/.aws/**`, `**/id_rsa*`). Secrets reach the platform only through `platform_core_data/knowledge_base/credentials/credentials.json` (the Browser Driver contract), never by reading the Target Project.

### 13.3 What may be WRITTEN to the Target Project

Writes are **fail-closed**: if `target.writeAllowlist` is absent or empty, the platform writes nothing to the Target Project and Stage 5 falls back to generating inside `platform_core_data/` (the §32.3 Option 1 behavior).

Permitted, when allowlisted:

1. **Generated automation source** under `target.automationRoot` — test files, page objects, fixtures, helpers, test data. This is the deliverable.
2. **Test-framework configuration**, only when the resolved framework has none and the human approved scaffolding at init (greenfield test infra, §13.6).
3. **Test-script wiring** — a single added `scripts` entry or Maven/Gradle test-task stanza — only with explicit per-run human approval, and only additive: an existing script value is never modified.

Every write obeys these rules:

- **Filesystem writes only. The platform never runs `git add`, `git commit`, `git mv`, `git rm`, or any other history-modifying git command against the Target Project.** Generated automation is left in the working tree for the host team to review and commit with their own conventions, hooks, and review process. Enforced by `assertSameRepo` in `platform_core/tools/automation_lifecycle/gitUtils.js` — the lifecycle only ever holds the repository handle governing `platform_core_data/`, so a Target Project path passed to any git write raises `RepoBoundaryError`.
- **Every write is preceded by a Target Write Plan** — the full list of files to be created, modified, or deleted, with a one-line reason each — presented at the Automation Approval gate (§5.2). No file is written to the Target Project before that gate clears.
- **An existing Target Project file is never modified without being named in the Write Plan and individually approved.** Creating a new file in an allowlisted directory is covered by the gate's blanket approval; modifying a file the team already owns is not.
- **No deletions**, other than a file this platform itself created in a prior run and recorded in `platform_core_data/automation_baseline/TargetWriteLedger.md`.
- **Every write is recorded in the Target Write Ledger** (`platform_core_data/automation_baseline/TargetWriteLedger.md`): path, run folder, operation, sha256 after writing. This is the platform's record of what it owns inside someone else's repository, and it is what makes uninstall and drift-detection possible.

### 13.4 What must NEVER be touched

Application source outside the allowlist · CI/CD configuration (`.github/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`) · `.git/` and every git hook · dependency lockfiles · `.env` and every secret file · the host's `.gitignore` and `.mcp.json` and `.claude/` **outside** the additive fragments written once at install time (§13.5) · infrastructure-as-code · database migrations · any file matching `readDenylist`.

### 13.5 Install-time fragments are not pipeline writes

The additive `.gitignore` marker block, the additive `.mcp.json` server keys, and the `.claude/skills/` directories are written **once, by `agentic-testing init`, with human confirmation** — never by a pipeline stage. No stage may modify them. They are recorded in `.install_manifest.json` and are the only platform-authored content in the Target Project outside `target.automationRoot`.

### 13.6 Greenfield: test infrastructure only

When no stack is detected, the platform scaffolds **test infrastructure only** — the test directory, the framework's config file, one example smoke test, and (with approval) the test-script wiring. **It never scaffolds the application**: no source files, no build config, no framework skeleton, no dependency manifest beyond a test-scoped devDependency the human approved. A greenfield install produces a repository ready to *receive* tests, and nothing else.

### 13.7 Relationship to §12 and to §32.3

§12's Automation Asset Lifecycle is unchanged and continues to govern the **baseline** under `platform_core_data/automation_baseline/{framework}/`, which remains the platform's authoritative, lifecycle-managed, three-way-merge-protected copy. §13 governs the **projection** of an approved baseline into the Target Project's test directories.

Ordering is fixed and **unchanged by the module revision**: generate in the module project (§12.3) → Automation Approval for that module (§5.2) → assemble into the baseline (§12.4) → **then** project into the Target Project (§13.3). The Target Project is never written before the baseline is updated, so the baseline is always the reproducible source and the Target Project's copy is always reconstructible from it.

**Healing does not shortcut this ordering.** An approved repair sets the module to `Healed`, then re-enters the same sequence from the approval step — an approved repair is not an approved assembly (§5.2).

This adds a fourth option to `.claude/skills/automation-skill/SKILL.md` §32.3's Automation Target Decision Gate:

```
4. Write into the Target Project's own test directories ({{TARGET_ROOT}}/<automationRoot>) —
   the installed-platform default. Generates in the module's standalone automation project,
   assembles into the baseline on that module's approval, then projects into the Target
   Project per pipeline.md §13.3.
```

When `platform.config.json` declares `mode: "installed"` with a non-empty `writeAllowlist`, Option 4 is the **presented default** — still asked, never assumed (§31.2's "Ask, never infer" is unchanged).

### 13.8 Bootstrap Migration for an existing suite

A brownfield Target Project that already has automation in `target.automationRoot` is lifted into a Workspace Automation Baseline using §12.6's existing **Bootstrap Migration** promotion status — `Promotion Status: Bootstrap Migration`, `Approved By: N/A — Bootstrap Migration`, never a fabricated Automation Approval for code this platform has not reviewed against §5.2. This runs once, at init or at the first Stage 5, and it is what makes "extend the existing suite" (§33 Strategy 1) mean the *team's real suite* rather than an empty baseline.

### 13.9 Degraded git modes

`git.mode` in `platform.config.json` decides which repository the lifecycle's own git operations act on:

| Mode | Meaning |
|---|---|
| `tool-repo` (default) | the tool folder is its own nested git repository, so baseline three-way-merge protection always works and no commit ever lands in the host's history |
| `host-repo` | process artifacts are committed into the Target Project's repository, restricted to paths under `dataRoot` |
| `off` | no git; the lifecycle runs filesystem-only |

When git is unavailable — no repository, or the host gitignores the tool folder — the Merge Plan carries `degradedMode: 'no-git'` and a warning reproduced verbatim in the Merge Summary and in `automation_promotion.md`. **The absence of protection is always reported, never implied**: a merge that could not be verified is never presented as a verified one. If a run's Step-1 snapshot recorded that git *was* available and it is not at merge time, that is a hard block, not a downgrade.

---

## 14. Execution Safety & Mutation Policy (added 2026-08-07, user-mandated)

### 14.1 The third governance concern

The platform already governs two things about a test case. This adds a third, about an *action*:

```text
Review            Is the Test Case accepted?              §4 Stage 3 · test-design-skill §6.3
Automation        Should it be automated?                 §4 Stage 3 · test-design-skill §6.3.2
Execution Safety  May this action execute here and now?   this section
```

**All three are independent, and none substitutes for another.**

```text
Review = Approved  AND  Automation = Approved     does NOT mean     Execution Safety = Allowed
```

A test case can be correct, accepted, and worth automating while still containing an operation that must not execute on the current environment. Equally, no safety decision can make an unreviewed case executable — safety runs **after** eligibility and only ever narrows it.

**Governing principle: capability does not imply authorization.** That the UI exposes Delete, that the credential can Approve, and that the automation exists to run are facts about capability. None is a permission.

### 14.2 Canonical decisions

```text
Allowed            execute
Approval Required  stop, ask a human, execute only within the approved scope
Forbidden          do not execute — and no run authorization changes that
```

These are **policy decisions, not test results**. A run that cannot proceed because of one is recorded with the existing execution taxonomy — `Skipped` / `Blocked`, reason `Execution Safety Policy` (§4 Stage `4M`, Stage `5A`). **A policy block is never an Application Failure, an Automation Failure, or an Environment Failure**: none of those occurred, and misfiling it would corrupt the health separation that Stage `5A` §25.2 exists to protect. No new result status is introduced.

### 14.3 Ownership

```text
platform_core/tools/execution_safety/                    the evaluator — reusable, project-agnostic, NO project rules
platform_core_data/knowledge_base/
    execution_safety_policy.json                         the project's policy — authoritative for evaluation
    execution_safety_policy.md                           the same policy, explained, with provenance per rule
platform_core_data/runs/{{RUN_FOLDER}}/metadata/
    SafetyAuthorizations.json / .md                      run-scoped human approvals
    SafetyPreflight.md                                   the run's mutation footprint, captured before execution
```

This is the same `platform_core` / `platform_core_data` split §1.1 already draws. The evaluator knows that `PAYMENT` is a financial action; it does not know whether payments are permitted anywhere. **No project rule may be hardcoded into the evaluator, and no evaluation logic may live in the policy.**

**No stage implements its own interpretation of the rules.** A Skill calls the evaluator and uses what it returns. Two Skills reading the same prose constraint is precisely how two stages reach different conclusions about the same action.

### 14.4 Where it is evaluated

| Stage | Enforcement grain | Detail |
|---|---|---|
| `4M` Manual Execution | **Per operation** | The skill drives each step itself, so it evaluates before every mutating action (`manual-execution-skill` §6.1) |
| `4A` Automation | **Not evaluated** — generation is not execution | An asset may be generated for an operation that is currently `Forbidden`; the restriction is disclosed, never converted into a permanent coverage gap (`automation-skill` §27A) |
| `5A` Automation Execution | **Suite preflight + per test** | The runner is an opaque external process with no interception point inside it. A test whose declared operations resolve `Forbidden` is deselected before invocation. **Per-operation enforcement is not available at this stage and must not be claimed** (`automation-execution-skill` §14A.1) |
| `6A` Reporting | Reports, never decides | `Blocked by Execution Safety Policy` as its own category (`reporting-skill` §3) |

Both executing stages run a **non-mutating Safety Preflight** before anything starts, so a run's mutation footprint and its authorization questions are known up front rather than discovered by attempting a prohibited action.

### 14.5 Human authorization

A scoped authorization is a **Human Decision** in the §5.5 sense — it belongs to the same category as *"executing any destructive or irreversible operation"*, which that section already names.

It is **class-scoped** per `(environment, module, action, ownership)` for **one run**. Twelve test cases sharing one scope cost one question, not twelve. It never carries to another run, environment, module, action, or ownership class, and **it never lifts a `Forbidden`** — it only ever satisfies an `Approval Required`.

**A run approval never becomes project policy.** It is written into the run folder and nowhere else.

### 14.6 Prospective only

The mechanism takes effect **2026-08-07** and governs runs created on or after that date. `run-001`, `run-002`, and `run-003` executed under the prose grants recorded in `knowledge_base/run_configuration.md`, were never evaluated by it, and **no artifact of theirs has been rewritten to suggest otherwise**. Run immutability (§7) is unaffected.

### 14.7 The browser boundary

```text
Execution Skill → Execution Safety → authorized operation → Browser Provider
```

`browser_provider` and `browser_driver` are **actuators**. Business authorization is decided above them and passed down; it is never decided inside a driver. Technical interception may be added as defence in depth, never as the primary control.

---

## 15. Run Observability (added 2026-08-07, user-mandated)

**Canonical technical documentation:** `platform_core/tools/observability/README.md`. This section
states the architectural position; it deliberately does not restate the schema, which has one owner.

### 15.1 A fourth concern, and the only one that decides nothing

| Concern | Question | Decides? |
|---|---|---|
| **Review** | Is this test case accepted? | Yes |
| **Automation** | Should it be automated? | Yes |
| **Execution Safety** (§14) | May this operation execute here and now? | Yes |
| **Observability** | What actually happened, and how efficiently? | **No** |

Observability never authorizes an operation, rejects a test case, overrides a Human Decision (§5.5),
changes a Safety decision, routes a pipeline, or alters a test outcome. It observes.

### 15.2 The chain

```text
Facts → Telemetry → Deterministic Metrics → Transparent Reporting
```

Events are evidence, appended one per line and never rewritten. Metrics are **derived** from them by
a pure function — no model interprets a duration, a count, or a ratio. The Markdown report and the
HTML dashboard are renderings of those metrics, and neither is authoritative over them.

### 15.3 Measure what can be proven

> **Measure what can be proven. Mark what cannot be measured as unavailable.**

`0` and `Unavailable` are different claims, and the platform never lets one decay into the other.
`Repair Cycles: 0` asserts the run needed none; `Repair Cycles: Unavailable` admits it does not know.
Every unavailable metric carries the reason it could not be measured.

### 15.4 Two reliability classes, reported apart

The platform has no orchestrating process — a stage is a Skill following a specification, and nothing
wraps it. So every event declares its provenance:

- `platform-tool` — emitted by platform code as a side effect of the work. Cannot be forgotten.
- `skill` — emitted because a Skill's specification requires it. Its presence is reliable; **its
  absence proves nothing.**

The two are counted separately in every report and are never presented as one reliability class
(HD-OBS-001). An opened span with no matching completion is reported `Incomplete` and receives
**no duration** — never an elapsed-time estimate.

### 15.5 Token and cost telemetry are unavailable

No supported run-attributable provider usage source exists: the platform carries zero runtime
dependencies and no provider SDK, and its tools run as child processes with no model context.
Claude Code session transcripts are deliberately not read — they are session-scoped rather than
run-scoped, and are not an official stable contract (HD-OBS-002).

Reported as `Unavailable` with the reason stated, never as `0` and never estimated. The metrics
schema is shaped so a future official source populates tokens and cost without a redesign.

### 15.6 Run ownership

```text
runs/{RUN_FOLDER}/metadata/observability/
├── ObservabilityEvents.jsonl     append-only evidence
├── ObservabilityMetrics.json     derived, regenerable
├── ObservabilityReport.md        human-readable
└── ObservabilityDashboard.html   self-contained, offline, presentation only
```

Telemetry belongs to the run, like every other piece of run evidence (§7). Cross-run isolation is
structural: the stream lives inside the run folder, and every event re-checks its own `runId` on
load, so a copied file contributes nothing.

### 15.7 Prospective only

Observability applies to runs created **after 2026-08-07**. No event is fabricated for `run-001`,
`run-002` or `run-003`; they report **Not Instrumented** for every event-based metric. What their
immutable artifacts genuinely prove is available separately as **Historical Derived Metrics**, kept
apart from instrumented metrics so the difference in coverage stays visible (HD-OBS-003).

### 15.8 What each stage emits

Skills emit **facts**; the aggregator computes **metrics**. No Skill implements a formula.

| Stage | Emits |
|---|---|
| All | `STAGE_STARTED` / `STAGE_COMPLETED`, `SKILL_STARTED` / `SKILL_COMPLETED`, `HUMAN_DECISION_REQUESTED` / `_RESOLVED`, `ARTIFACT_CREATED` / `_UPDATED` |
| `3` Test Design | `TEST_CASES_GENERATED` (count). **Not** Review or Automation values — those live on the test case and are derived from the Case Index (§15.9) |
| `4M` Manual Execution | `TEST_EXECUTION_RESULT` per case, `SAFETY_PREFLIGHT_COMPLETED`, `SAFETY_BLOCKED` |
| `4A` Automation | `AUTOMATION_GENERATED` (Selected / Generated / Reused / Modified), `AUTOMATION_BUILD_RESULT` |
| `5A` Automation Execution | `SAFETY_PREFLIGHT_COMPLETED`, `TEST_EXECUTION_RESULT` with `attempt` and `cycle`, `SAFETY_BLOCKED` |
| `5H` Self-Healing | `REPAIR_STARTED` / `REPAIR_COMPLETED` |
| `6A` Reporting | Consumes metrics; emits its own stage span only |
| Platform tools | `TOOL_STARTED` / `TOOL_COMPLETED` / `TOOL_FAILED`, `RETRY_OCCURRED`, `VALIDATION_PASSED` / `VALIDATION_FAILED` |

`attempt` is load-bearing: **First-Pass Automation Success is computed only from `attempt: 1`
evidence** and is never reconstructed from final results after repair, because the final state cannot
distinguish "passed first time" from "passed eventually".

### 15.9 What observability does not measure

- **Token usage and cost** — no supported source (§15.5)
- **Per-operation automation telemetry** — Stage `5A` invokes an opaque external runner; the platform
  observes suite and per-test outcomes only, exactly as §14.4 already states for Safety
- **Human corrections** — a git diff proves a change, not its author
- **Review and Automation as events** — they are fields on the test case, derived from the Case
  Index. A second lifecycle record would be a second source of truth, which §5.4 forbids.

---

## 16. Supplier Features — Stage Gates (scope-gated)

**This section applies only when the resolved run has `scopeFamily === "supplier-feature"`.** It adds
no new pipeline stage, Skill, or branch — it constrains what Stage 3 (Test Design) and Stage 4A
(Automation) may accept for a Supplier-Feature run, on top of every rule that already applies to
them. A classic run (Agency, Branch, any module) is entirely unaffected by this section.

The gates below are `ndc_execution_rules.md` §A7 and §A8 — **Supplier-Feature-wide**, so they apply
whatever a Feature's integration layer is. The integration-layer-specific (§B) and
Import-Booked-PNR-specific (§C) rules are not stage gates and are not restated here.

Full governance rule set this section gates: `ndc_execution_rules.md`. Routing: `new_us_intake.md`
§13. Schema/mechanics for the run-scope freeze referenced below: `module_architecture.md` §11.5.1.

### 16.1 Discovery → Test Design gate

| Discovery finding classification | May Test Design record it as a confirmed expected result? |
|---|---|
| `Confirmed` | Yes |
| `Historical Requirement` | Yes, unless the current User Story explicitly changes it — then it is regression evidence, not the requirement |
| `Supplier-Specific Confirmed` | Yes |
| `Open Question` | **No** — classify the test as `Discovery`, `Blocked`, or `Pending Confirmation` |
| `Assumption` | **No** |
| `Blocked` | **No** |
| `Provisional` | **No** |
| `Not Applicable` | N/A — no test case results from it |

### 16.2 Test Design → Automation gate

Do not start Stage 4A automation for a Supplier-Feature test case when any of the following holds:

| Condition | Gate |
|---|---|
| Expected result unresolved | Blocked from automation |
| Required environment/Supplier test data unavailable | Blocked from automation |
| Supplier contract still under Discovery | Blocked from automation |
| Test case marked `Blocked` | Blocked from automation |
| Execution would violate `execution_safety_policy.json` (§14) | Blocked from automation |
| Destructive cleanup/reset behavior unknown | Blocked from automation |

When multiple test cases are eligible, Stage 4A prioritizes: (1) stable confirmed P1 flows, (2)
API/contract/mapping validation, (3) high-value regression, (4) stable E2E flows.

### 16.3 Run scope freeze enforcement point

A Supplier-Feature run's `feature`/`supplier`/`sharedScope`/`testingLayerScope` are frozen once
confirmed (`ndc_execution_rules.md` §A4). No stage in this pipeline may write those fields directly —
the only supported mutation path is `changeSupplierFeatureRunScope()` / `cli.js scope-change`
(`module_architecture.md` §11.5.1), which requires explicit human approval and a reason, and appends
rather than overwrites. A stage that needs a scope change stops and asks, exactly as any other
Human Decision point does (§5.5).

## 17. Report Presentation Standard (added 2026-09-06, user-mandated)

**Every report this pipeline produces is published in one shared HTML design**, generated by
`platform_core/tools/report_builder`. Reports had drifted into one look per stage — some a wall of
Markdown, some a table, one a hand-written HTML page — so a reader had to relearn the layout at
every stage. There is now one layout, one colour system, and one interaction model.

**Canonical technical documentation:** `platform_core/tools/report_builder/README.md`. This section
states the architectural position and the rules; it deliberately does not restate the model schema,
which has one owner.

### 17.1 The HTML is additional, never a replacement

| | Markdown | HTML |
|---|---|---|
| Status | **Authoritative artifact** | Rendering of it |
| Approval (§7) | Approved here — `status:` in its own header | Never approved; carries no status |
| Version history | Git diff | Regenerated, not diffed |
| Traceability (§8) | Chain runs through it | Not part of the chain |
| Audience | The pipeline, the reviewer, the next stage | Stakeholders |

**§7 is unchanged.** One Markdown file per artifact, edited in place, approval changes status and
never location. The HTML is a *second rendering of the same content* written beside it — it is not a
second artifact, it is not versioned, it is not approved, and no stage ever reads one as input.

If the two ever disagree, **the Markdown is right and the HTML is stale** — rebuild it.

### 17.2 Which reports

| Stage | Markdown artifact | HTML companion |
|---|---|---|
| `2` Discovery | `QA_Assessment_Report.md` | Required |
| `3` Test Design | `CoverageReport.md` | Required |
| `4A` Automation | `AutomationCoverageReport_{FRAMEWORK}.md` | Required |
| `4A` Automation | `AutomationDecisionReport_{FRAMEWORK}.md` | Required |
| `4M` Manual Execution | `ManualQAReport.md` | Required |
| `5A` Automation Execution | `ExecutionResults.md` | Required |
| `5H` Self-Healing | `RepairSummary.md` | Required |
| `6A` Reporting | `Final_QA_Report.md` | Required |

Working notes, matrices, checklists, and the Run Manifest are **not** reports and get no HTML
companion. The Observability dashboard (§15) is a separate rendering of metrics, not a stage report,
and is out of scope here.

### 17.3 How a stage produces it

Three files, one folder — the folder §7 already assigns that stage:

```
{stage folder}/ManualQAReport.md            # the artifact
{stage folder}/ManualQAReport.report.json   # the report model
{stage folder}/ManualQAReport.html          # generated, never hand-edited
```

```bash
node platform_core/tools/report_builder/cli.js validate --model <artifact>.report.json
node platform_core/tools/report_builder/cli.js build    --model <artifact>.report.json
```

`validate` first — it exits `2` and names the exact path that is wrong. Surface its message as-is.
`build` defaults its output beside the model, so `--out` is only needed to override that.

**Rules:**

- **Never hand-write the HTML**, and never hand-edit a generated `.html`. Edit the model and rebuild.
  One fix to the shared design must reach every stage, which it cannot do around a hand-written page.
- **Never invent a second design**, a second stylesheet, or a per-stage variant. A stage that needs
  something the model cannot express raises it as a change to the builder.
- **Rebuild whenever the Markdown changes** — including an in-place refinement after review (§7). A
  stale HTML companion is worse than none.
- **Redact secrets through the model's `"redacted": true`**, never by typing a placeholder into a
  header value. §14's read denylist governs what may be captured at all; this governs how what *is*
  captured reaches the page.
- **Captured output goes through `text`, never `html`.** The `html` value is for markup the stage
  generated itself. Application output, a captured response, and anything a tester typed are escaped.
- **Excerpt a very large capture and say so** in the exchange's `notes`. A full multi-hundred-KB body
  helps no reader; silently truncating one misleads every reader.

### 17.4 What the design guarantees the reader

Every report opens the same way, so a reader who has read one has read them all: run metadata card →
executive summary with the outcome ring and stat cards → the results themselves, searchable and
filterable → findings → follow-up. Results are grouped by category and collapsed by default, each
one expandable to its evidence and its captured request/response, with the full test case one click
further in. One self-contained file — no server, no external asset, works from a mail attachment —
in the reader's own light or dark theme.

Where a stage's report is not test-case-shaped (Discovery, an Automation Decision Report, a Repair
Confidence Report), the test-case region is simply absent and the report is its summary plus its
sections. This is the same design with a region unused, not a different design.

### 17.5 Status vocabulary is declared, never assumed

A report declares its own statuses and maps each to a **tone** (`pass`, `fail`, `blocked`, `warning`,
`accent`, `neutral`). A Manual Execution report's `PASS`/`FAIL`/`BLOCKED` and a Stage `5A` report's
`PASSED`/`ERROR`/`SKIPPED` therefore colour and filter correctly without either stage inventing CSS.

A result whose status is not declared is a **validation error**, not a silently uncoloured card —
`4M`'s Result Classification and `5A`'s Application/Automation/Environment separation must survive
into the report intact, and a typo that quietly merges two of them would defeat that.

---

---

*This document defines the reusable pipeline only. It does not itself invoke any agent, and no stage described above has been run as part of producing this specification.*
