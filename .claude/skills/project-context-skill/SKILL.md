---
name: project-context-skill
description: Stage 1 (shared by both pipelines) in the Agentic AI Testing Platform. Reads an approved PRD and a run configuration, proposes the project's module decomposition for human approval, and distills the PRD into one Project Context artifact per module — the source of truth every downstream stage (Explorer, Test Design, Manual Execution, Automation, Automation Execution, Reporting) consumes. Use when starting a new pipeline run, onboarding a new project, or a PRD/run configuration needs to be reconciled into an approved Project Context.
inputs:
  - name: prd
    type: file_path
    required: true
    description: Approved Product Requirements Document at `platform_core_data/knowledge_base/PRD.md`. This is the only skill in the pipeline permitted to read it directly.
  - name: run_configuration
    type: markdown
    required: false
    description: "Optional. Modules in scope for this run, target environment URL, environment constraints, and available credentials/roles. When absent or partial, every missing value is recorded as `Open Question — Requires Run Configuration` and resolved by the stage that needs it before that stage proceeds (pipeline.md §4 Stage 1, §5.4) — never guessed."
outputs:
  - name: project_context
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md"
    description: "Source-of-truth artifact (Scope Summary, In/Out of Scope, Module Boundaries, Roles & Credentials, Environment Constraints, Carried-Forward Assumptions & Risks, Traceability Anchor) every downstream skill consumes. ONE FILE PER MODULE in scope — a full-project or multi-module invocation writes several."
  - name: module_decomposition
    type: file_path
    location: "platform_core_data/modules/modules.json"
    description: "The proposed list of modules derived from the PRD, each with a name, a one-line scope statement, and the PRD sections it derives from. Written via the Module Manager with `status: Proposed`; scaffolded only after a human approves it at this stage's gate."
dependencies:
  - Read, Write, Glob (file tools only — no browser automation, no code execution)
  - Bash, restricted to `platform_core/tools/module_manager/cli.js` and `platform_core/tools/run_manager/cli.js` (resolving and recording module/run state — never application code)
  - none upstream (first stage in the pipeline)
---

> **Pipeline position:** Stage 1 — first stage, shared by both pipelines, consumes the PRD.
> **Traceability:** `PRD → Project Context`. This is the only stage permitted to read the PRD directly.
> **Revision history:** see `docs/CHANGELOG.md`.
>
> **Revision note (2026-07-27, user-mandated):** each artifact is **one file, edited in place**: no `.vN` suffixes, and **no duplicate "final" copy is ever written on approval**. Refinement edits the same file the reviewer read. Git is the version history. See `workflows_and_pipelines/pipeline/pipeline.md` §7.
>
> **Revision note (2026-07-29, user-mandated):** two changes, both in this stage. (1) **This stage now proposes the project's module decomposition** — the list of modules the whole pipeline works in terms of — reviewed at this stage's *existing* gate alongside the context itself (§3.1). No new gate. (2) **Its output is one Project Context per module**, written to `platform_core_data/modules/{module}/context/ProjectContext.md` and refined in place by later runs rather than re-forked per run. There is no project-wide context document. See [`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §6.4 and `pipeline.md` §4 (Stage 1).

# 1. Skill Name

**Project Context skill**

# 2. Purpose

The Project Context skill is the entry point of the pipeline. It reads an already-approved Product Requirements Document (PRD) and a run configuration, and produces two things: **the module decomposition** the whole pipeline is organized around, and **one compact Project Context artifact per module**.

**Both come from the PRD, and that is why they are this stage's job and nobody else's.** This is the only stage permitted to read the PRD (`pipeline.md` §6 Rule 4), so anything *derived* from the PRD — including the answer to "what are this project's modules?" — is necessarily produced here. A later stage that decided a module should be split would be reinterpreting the PRD without reading it.

**The Project Context is the single source of truth (SSOT) for every downstream skill in this pipeline.** Once published, it — not the PRD — is the authoritative reference that the Explorer, Test Design, Manual Execution, Automation, Automation Execution, and Reporting skills read. No downstream skill independently re-reads or reinterprets the original PRD; every one of them consumes the same, already-reconciled Project Context.

Without this skill, each downstream skill would need to re-derive scope, credentials, environment constraints, and risk posture from the PRD on its own — inviting drift and inconsistent interpretation across a multi-stage run. The Project Context skill exists so that scope and requirements are interpreted exactly once, in exactly one place, and every other skill inherits that single interpretation.

# 3. Responsibilities

- Read the target PRD in full.
- Read the run configuration (which modules are in scope for this pipeline execution, target environment URL, credentials/roles available, environment safety constraints).
- **Propose the module decomposition** (§3.1) and present it for approval alongside the context.
- For **each module in scope**, extract and structure:
  - A concise scope summary of what this module covers
  - The explicit in-scope areas, and — equally important — what is out of scope, distinguishing "owned by another module" from "not tested at all"
  - The module's boundaries: where its behaviour depends on, or is depended on by, another module
  - Roles and credentials required, drawn from the PRD's User Roles section
  - Environment constraints (e.g., "shared public demo — no destructive actions" vs "isolated test environment — full CRUD permitted")
  - Every `> Assumption` and Risk entry in the PRD relevant to this module, carried forward so later skills don't have to re-discover them
- Never introduce scope, features, constraints, or **modules** not present in the PRD or the run configuration.
- Halt and clearly report any conflict or gap (e.g., PRD missing, run configuration referencing a module the PRD never mentions) rather than guessing.

## 3.1 The module decomposition

The pipeline works in terms of **modules** — coherent areas of the application under test, each with its own durable workspace at `platform_core_data/modules/{module}/` ([`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §6.4). This stage proposes that list; a human approves it; the Module Manager records it.

**The sequence, and why each step is separate:**

1. **Read the registry first.** `node platform_core/tools/module_manager/cli.js list` — an established project already has its modules, and re-proposing them wholesale would be noise. Only genuinely new PRD areas are proposed.
2. **Propose, with provenance.** Each proposed module carries a human-readable name, a one-line scope statement, and **the PRD sections it derives from**. That last field is what makes the decomposition itself traceable rather than an unexplained partition of the application (`pipeline.md` §8).
3. **Present it at this stage's existing gate.** The reviewer is already reviewing scope; the module list *is* scope, at a coarser grain. **No new gate is introduced** — §5.1 of `pipeline.md` extends the Stage 1 criteria rather than adding a checkpoint.
4. **A proposed module is recorded, never scaffolded.** It lands in `modules.json` with `status: Proposed` and gets no folder on disk until approved, because **a folder reads as "this module exists."** After approval, the Module Manager scaffolds it and this stage writes its context.
5. **Never hand-format a slug, and never hand-edit `modules.json`.** Both go through the Module Manager — the same discipline that forbids hand-formatting a run folder name (`run_manager.md` §5.5).

**What this stage must not do:**

- **Never create or activate a module silently.** A module the human has not approved does not exist, and an invocation that finds no active module **asks** rather than picking one.
- **Never propose a module to hold a work item.** A User Story about cabin-class filtering belongs *in* `flight-search`; it is not a module of its own. Modules partition the application, not the backlog.
- **Never reset an existing module's recorded progress.** Re-proposing an already-active module updates its description; it never returns its Test Design status to `Not Started`.
- **Never rename a module.** Other artifacts cite its folder path. A module that must be re-identified is superseded via `module.json`'s `supersededBy`, and both stay readable.

**Report a decomposition gap; do not act on it.** If the PRD's structure genuinely resists decomposition — overlapping areas, or one area large enough that a reviewer would likely want it split — say so in the proposal, with the options, and let the reviewer decide. Guessing at a boundary that later has to be undone is more expensive than asking.

## 3.2 New User Story intake routing — a precondition of §3.1

**A newly supplied User Story is routed before this stage proposes anything.** The full rule is
[`new_us_intake.md`](../../../workflows_and_pipelines/pipeline/new_us_intake.md); this section states
what it means *for this stage*, and it is binding here rather than in any prompt file.

Two answers must exist before §3.1's proposal is made, before a run is created, and before a single
Project Context is written:

1. **Feature or CRUD** — *"Is this User Story for a standalone Feature or part of a module CRUD
   scope?"* Never inferred from the story title.
2. **Does the scope already exist** — the sweep at
   `cli.js inspect-scope [--user-story …] [--name …]`, whose result is reported to the human.

Then the proposed structure is shown (parent module, feature name, exact paths, overlap, run scope)
and **confirmed** before anything is created.

| Route | This stage writes |
|---|---|
| **`Feature`** | `modules/{{MODULE_SLUG}}/features/{{FEATURE_SLUG}}/context/ProjectContext.md`, scoped to that Feature only. Run Scope Type `Feature`, Run Type `User Story`. The parent module is created first when it does not exist — a separate approval, never a side effect. |
| **`CRUD`** | `modules/{{MODULE_SLUG}}/context/ProjectContext.md`, **one consolidated context accounting for every supplied CRUD area**, with traceability to each individual User Story. **No feature folder per CRUD area.** |

**Why this stage and not only the harness.** A skill can be invoked directly at any time
(`pipeline.md` §5.3.1), which means the intake conversation can be bypassed entirely. If the rule
lived only in `CLAUDE.md` it would be advice that a direct invocation silently skips — so the
precondition is Execution Rule 14 below, and it is checked here.

**What this stage must not do:**

- **Never classify Feature-vs-CRUD itself.** It is a Human Decision under `pipeline.md` §5.5, of the
  same kind as a framework choice: cheap to ask, expensive to undo.
- **Never widen a `Feature` scope into its parent module's CRUD scope.** The Feature defines the scope.
- **Never create a feature folder for a CRUD area** — Add/Create, Update, Search, Approve and Reject
  for one entity are one consolidated module, however feature-shaped the capability sounds.
- **Never conclude scope overlap from a User Story number.** The same number can describe changed
  scope; a different number can describe the same scope. Compare the business scope and Acceptance
  Criteria, and let the human decide.
- **Never migrate an existing module** to the Features layout. Modules created before it are valid.

## 3.3 Refreshing the Application Context at run start

*(Added 2026-08-18, user-mandated.)*

`modules/ApplicationContext.md` (§5, [`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §6.7) is **refreshed by this stage whenever a run begins**, before any module context is written.

What this stage refreshes, and nothing beyond it:

| Section | Refreshed against |
|---|---|
| §1 Module map | the live registry — which modules are `Active`, which `Proposed`, which stages exist on disk |
| §2 Dependency graph | any dependency a completed run has since **proven**, promoted from "asserted by the PRD" to observed |
| §6 Application-wide posture | the current safety policy, actors, environment and retention rules — **by reference, never restated** |
| The header | `Status: Draft — refreshed for {run}`, and what this refresh changed |

**This stage never marks it `Approved`.** It sets it to `Draft` and records the refresh. Approval happens after the branch's terminal stage (`6A` Reporting, or `4M` Manual Execution), at a human's decision — because most of what a run learns about *relationships between* modules is discovered while the run executes, not at Stage 1.

**Refreshing is not rewriting.** Sections this stage does not own — §3 cross-module rules, §4 E2E journeys, §5 fixture build order — are left exactly as the runs that established them wrote them. A Stage 1 refresh that silently rewrote a dependency proven by a later stage would be discarding evidence in favour of a document.

# 4. Inputs

| Input | Required? | Description |
|---|---|---|
| Product Requirements Document | Required | `platform_core_data/knowledge_base/PRD.md` |
| Run configuration | Optional | Modules in scope for this run, target environment URL, environment constraints, available credentials/roles. Missing values are declared as Open Questions, never guessed (Direct Invocation, "Missing run configuration → run degraded") |

Run configuration keys, supplied alongside the invocation: `{{MODULES_IN_SCOPE}}`, `{{APP_URL}}`, `{{ENVIRONMENT_NOTES}}`, and credentials `{{ROLE}}` / `{{USERNAME}}` / `{{PASSWORD}}`.

There is no `PROJECT_NAME` key: the platform tests one Target Project at a time, and its process artifacts are rooted at `platform_core_data/` relative to the Tool Root (`workflows_and_pipelines/pipeline/pipeline.md` §1, §1.1), so a run configuration describes *scope and environment*, never which project it applies to. The Target Project's own location is tool configuration (`platform.config.json` → `targetRoot`), not run configuration.

# 5. Outputs

**One Project Context document per module in scope**, plus the module decomposition recorded in the registry. Each context becomes the sole source of truth about its module for every downstream skill — the Explorer skill, Test Design skill, Manual Execution skill, Automation skill, Automation Execution skill, and Reporting skill. It is not a new PRD, not a rewrite of it, but a distilled, module-scoped lens onto it. None of the downstream skills read the PRD file directly; they read these artifacts instead.

**Scope determines how many are written, not whether they are combined:**

| Invocation scope | Written |
|---|---|
| One module | exactly that module's `context/ProjectContext.md` |
| Several modules | one file under **each** named module |
| Full project | one file under **every** approved module |

**There is no project-wide Project Context document, and there is one application-level document that is not one.** *(Amended 2026-08-18, user-mandated.)*

The union of the per-module files *is* the project context, and `platform_core_data/modules/README.md` indexes them. **A combined document that summarized them would immediately begin to disagree with the files it summarizes, and nothing would then say which is authoritative — so none is written.** That reasoning stands unchanged.

What does exist is `platform_core_data/modules/ApplicationContext.md` ([`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §6.7): the **relationships between** modules — dependency graph, cross-module rules index, end-to-end journeys, fixture build order, application-wide posture. It summarizes no module. Its governing rule is that a statement belonging to one module belongs in that module's context, so it can only say what is true of two or more modules at once — which is precisely why it cannot drift against them.

**This stage refreshes it at the start of every run** (§3.3), and it is **final only after a human approves it following the branch's terminal stage** — never at this gate.

**These files belong to their modules, not to the run.** A later invocation that refines a module's context re-opens that module's existing file and edits it in place (`pipeline.md` §7) — it never writes a second copy into a run folder or anywhere else.

# 6. Allowed Tools

- Read (PRD, run configuration, the module registry)
- Write (Project Context documents — one per module)
- Glob (to locate the PRD and any run-configuration files)
- Bash, **restricted to** `platform_core/tools/module_manager/cli.js` and `platform_core/tools/run_manager/cli.js` — resolving the active module(s), proposing a decomposition, and recording this stage's progress

**Not permitted:** browser automation tools, code execution tools against application code, or any tool that mutates application data. This skill only reads and structures documents, and invokes the two platform CLIs above.

**`modules.json` is never written with Write.** Every registry change goes through the Module Manager CLI, which is the only sanctioned writer (`module_architecture.md` §6.5 Rule 3). Hand-writing the file would bypass its schema check, its atomic write, and the `module.json` refresh that keeps the authoritative copy and the display cache in agreement.

# 7. Execution Rules

1. Must not proceed if the PRD file is missing or unreadable — halt and report the gap.
2. Must not invent scope beyond what is stated in the PRD or explicit run configuration.
3. Must explicitly separate "In Scope" from "Out of Scope" modules — silence on a module is not sufficient; it must be listed in one category or the other.
4. Must carry forward every PRD `> Assumption` and Risk entry relevant to in-scope modules verbatim in meaning, not diluted or reworded away from its original caveat.
5. Must cite the PRD section number each extracted item was drawn from, preserving traceability back to the source document.
6. Must not alter, contradict, or "correct" the PRD — this skill summarizes and structures; it does not edit the source document.
7. Once this skill publishes the Project Context, it becomes the single source of truth for the remainder of the pipeline. No downstream skill (Explorer, Test Design, Manual Execution, Automation, Automation Execution, Reporting) may read the PRD directly or independently reinterpret it — any requirement change must flow through a new Project Context skill run, not through a downstream skill going back to the PRD on its own.
8. **Must resolve the module(s) to write, never guess them.** Read the active-module pointer (`cli.js active --json`). With nothing active and no decomposition to propose, **stop and ask** — listing what exists — rather than picking a module or creating one.
9. **Must write one file per module, never a combined document** (§5). A multi-module invocation produces several artifacts, each complete on its own.
10. **Must edit an existing module's context in place.** Never write a `.v2`, never fork a copy into a run folder, and never leave two files claiming to be the same module's context (`pipeline.md` §7).
11. **Must record its progress through the Module Manager**, never by hand-editing `modules.json`: `cli.js` records the stage's status, artifact path, revision count, and the run that produced it (`module_architecture.md` §6.5 Rule 3).
12. **Must not scaffold a module that has not been approved.** A `Proposed` module has no folder, and creating one would assert an approval no human gave.
13. **Must run the Simple English Communication Standard check on the Project Context before treating it as finished** (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 10): short, direct sentences; any hard word replaced with an easier one where meaning stays the same; every necessary technical term briefly explained; confirmed PRD statements kept visibly separate from carried-forward assumptions; and a first-read check for whether a Business Analyst or Product Owner, not just this skill, would understand it. Requirement IDs, module names, and PRD section references are never altered by this check.
14. **Must not propose a module, scaffold a Feature, create a run, activate a pointer, or write a Project Context for a newly supplied User Story until intake routing is answered and the proposed structure is confirmed** (§3.2, [`new_us_intake.md`](../../../workflows_and_pipelines/pipeline/new_us_intake.md)). The two answers required are *Feature or CRUD* and *does the scope already exist*. **This rule binds a direct invocation exactly as it binds an orchestrated one** — a skill called straight from the command line is the case the harness cannot cover, and therefore the case this rule exists for. An invocation that arrives with a story and no routing answer **asks**; it does not proceed on the most likely reading.

# 8. Expected Artifacts

| Artifact | Path | Template |
|---|---|---|
| **Application Context** *(refreshed at run start, §3.3)* | `platform_core_data/modules/ApplicationContext.md` | *— no template; edited in place, never regenerated* |
| Project Context document *(one per module in scope)* | `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` | [`platform_core/templates/stage_1_context/ProjectContext.md`](../../../platform_core/templates/stage_1_context/ProjectContext.md) |
| Module registry entry *(per proposed/approved module)* | `platform_core_data/modules/modules.json` | *— generated by the Module Manager; no template (`platform_core/templates/README.md`)* |
| Module summary | `platform_core_data/modules/{{MODULE_SLUG}}/README.md` | *— regenerated by `cli.js summary <slug>`; never hand-authored* |

**Document structure is defined by the template, not restated here.** Render the artifact by copying the template and filling its `{{PLACEHOLDER}}` tokens; its section order is mandatory and its inline `<!-- -->` guidance is stripped from the rendered output. `platform_core/templates/README.md` states the conventions every template follows.

# 9. Operational Contract

Role: requirements-to-Project-Context distillation (Stage 1 — shared).

Convert an approved PRD into a single, structured Project Context that every downstream stage uses as its scope-of-truth. Execution is fully specified above — §3 (what to extract), §4 (inputs and run-configuration keys), §7 (rules and halt conditions), §8 (output structure and path). This section adds no rules of its own; the contract is stated once above rather than restated here.

# 10. Example Execution

*Illustrative only — not executed as part of this task.*

```text
Run configuration:
  MODULES_IN_SCOPE   = Agency, Branch, Staff
  APP_URL            = (per platform_core_data/knowledge_base/run_configuration.md — STG)
  ENVIRONMENT_NOTES  = "Shared environment — no destructive or persistent
                        data-mutating actions without explicit authorization"
  ROLE               = Admin  (credentials resolved at runtime from
                       platform_core_data/knowledge_base/credentials/, never written here)
```

Hypothetical result — **three** artifacts, one per module, plus the registry entries backing them:

```text
platform_core_data/modules/
  modules.json                          # agency, branch, staff — Active; every other PRD area — Proposed
  agency/context/ProjectContext.md      # Agency's scope, boundaries, roles, carried-forward assumptions
  branch/context/ProjectContext.md      # Branch's — noting its dependency on agency (§3.1 Module Boundaries)
  staff/context/ProjectContext.md       # Staff's
```

Each file carries forward only *its own module's* open items from the PRD — Agency's unverified RBAC, Staff's unconfirmed uniqueness rules — so the Explorer skill probing Agency reads Agency's assumptions and is not handed Staff's. Every other PRD area is recorded `Proposed` and gets no folder until a reviewer approves it.

# 11. Architecture Principle

> Agents communicate through artifacts only. Each has a single responsibility. Every output becomes the input of another whenever applicable.

For this skill specifically: it is the sole reader of the PRD in the entire pipeline, and its sole output — the Project Context — is what every other skill's "single responsibility" is scoped against.

# 12. Direct Invocation

This skill is independently invocable — `/project-context-skill`, optionally with a run-scoped instruction (e.g. `/project-context-skill scope this run to the Leave module only`). Full rules: `workflows_and_pipelines/pipeline/pipeline.md` §5.3.1.

- **Instruction prompts are run-scoped, never spec-overriding** (§5.3.1 #3). An instruction may narrow scope, focus on named modules, or set emphasis. It never authorizes violating §7's rules — most importantly, it never authorizes proceeding past a missing/unreadable PRD (Rule 1), never authorizes inventing scope the PRD and run configuration don't support, and **never authorizes creating a module without approval** (Rule 12). `/project-context-skill add a Payments module` is a request to *propose* one, reviewed at the gate like any other.
- **No upstream gate applies.** This is Stage 1; there is no predecessor checkpoint to wait on, so a direct call always runs immediately.
- **Missing run configuration → run degraded** (§5.3.1 #5): produce the Project Context from the PRD alone, list every absent run-configuration key explicitly, and mark the affected sections (Environment Constraints, Roles & Credentials) as `Open Question — Requires Run Configuration` rather than guessing values. A missing *PRD* remains a halt (Rule 1) — it is this stage's only genuinely required input.
- **Closing message must recommend the next step** (§5.3.1 #6), and must name every module it wrote plus every module it proposed:

```
Stage 1 complete — Project Context → Pending Review  (3 modules)
  platform_core_data/modules/agency/context/ProjectContext.md      rev 1
  platform_core_data/modules/branch/context/ProjectContext.md      rev 1
  platform_core_data/modules/staff/context/ProjectContext.md       rev 3  (refined in place)

Proposed — awaiting your approval before any folder is created:
  payments    "Payment methods, gateways, and refunds"   PRD §7.1–7.4

Next step — either:
  1. Approve, then continue:   "approved"  →  /explorer-skill
  2. Approve some modules:     "approve agency, branch"
  3. Revise this stage:        /project-context-skill <your feedback>
  4. Jump to another stage:    /test-design-skill   (will declare Discovery gaps)
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
| This stage starts | `STAGE_STARTED --stage 1` → keep the returned `spanId` |
| This skill starts | `SKILL_STARTED --stage 1 --skill project-context-skill` |
| This skill finishes | `SKILL_COMPLETED --span-id <id>` |
| This stage finishes | `STAGE_COMPLETED --stage 1 --span-id <id>` |
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
| A proposed module decomposition is written | `ARTIFACT_CREATED --artifact-class context` per module |

## Never emitted by this stage

- **Token counts or cost.** No event type exists for them. No supported run-attributable provider
  usage source exists, and nothing is estimated from text length or hardcoded pricing (HD-OBS-002).
- **A metric, ratio, or score.** This stage records what happened; the aggregator does the arithmetic.
- **A secret.** No password, token, API key, session ID, cookie, authorization header, or card detail
  reaches `--metadata`. Credential *identities* and roles are acceptable where genuinely needed.
- **Requirement counts as a metric.** Emit the artifact events; how many requirements a Project Context covers is read from the artifact, not from a number this stage asserts.

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

This stage **writes into the module**: `modules/{{MODULE_SLUG}}/context/`. It is also the only stage that may *propose* a module (§3.1) — proposing is not creating, and approval is a human's.

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

This is Stage 1, and the stage most often invoked when a **new** run is wanted — but **this stage does
not create or activate runs.** Run creation and pointer writes belong to the Run Manager
(`run_manager.md` §4 Responsibility 6a, §5.7 Rule 3); a stage that minted its own run would be doing
Run Manager work, which `run_manager.md` §3 forbids. With no active run, stop and ask — then the run
is created via the Run Manager (`cli.js refine <prior-run>` for a refinement, or the workflow's own
Step 1 for a fresh run) and this stage writes into it. When the pointer already names a run, write
into **that** run: a re-invocation to revise a Project Context edits the existing artifact in place
(`pipeline.md` §7), it never forks a second run.

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

This stage (`1`) records its lifecycle in the run state model. These commands are mechanical. They never replace a reviewer's decision and never skip a gate. The full rule, and every stage's row, is `pipeline.md` §5.3.2.

1. **Entry — before any work:** `node platform_core/tools/run_manager/cli.js state start 1 --invocation <Pipeline|Direct|Direct (degraded)> [--instruction "..."]`. This runs the entry gate. **Exit code 2 means blocked:** do not start. Show the human the reasons, request what is missing (`pipeline.md` §5.3.1 #4), and name the next command. Stage 1 has no upstream stage, so the gate always proceeds; a missing PRD remains this Skill's own halt (Execution Rule 1).
2. **Artifacts:** `node platform_core/tools/run_manager/cli.js state artifact 1 --artifacts <path[,path]> [--kind checkpoint|output|evidence]` for what this stage writes.
3. **Exit — this stage has a checkpoint:** `node platform_core/tools/run_manager/cli.js state request-approval 1 --artifacts <checkpoint artifact>`. Its checkpoint artifact is `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` (one per module). Finishing the work never marks the stage Completed.
4. **Approval:** only after the named reviewer approves and the artifact's own Status header reads `Approved`: `node platform_core/tools/run_manager/cli.js state approve 1 --approved-by "<reviewer>"`. It is refused if the header says anything else, or if the artifact is missing. A rejection: `state reject 1 --rejected-by "<reviewer>" --feedback "..."`.
5. **Blocked or failed:** `state block 1 --reason "..."` or `state fail 1 --reason "..."`, so the run records what it is waiting on.

**Partial approval (optional, `pipeline.md` §5.3.2).** When the reviewer approves only part of the Project Context, the reviewer — never this Skill — adds the template's optional `## Approval Scope` table (Item · Status · Depends On · Affects) and records it with `node platform_core/tools/run_manager/cli.js state approve-scope --artifact <path> --approved-by "<reviewer>"`. This Skill writes the Status header and the content as before; it never fills in the table, never sets an item's status, and never treats a partly approved artifact as approved. Existing artifacts without the table are unchanged and keep their whole-artifact approval rules.

**Changing approved work (`pipeline.md` §8.1).** Before modifying an approved Project Context, run `node platform_core/tools/run_manager/cli.js state impact --artifact <path> --base <git revision>` (or `--changed <ids>`) and show the result to a human. The impact lists every dependent finding, case, automation, execution and report, and whether the change is blocking. The human records the decision with `--record --decision approved|rejected --by "<name>" --reason "..."`. A change reaching several modules or Suppliers is approved only by naming each one. Re-approving the changed artifact is refused without that decision. Reuse an approved Project Context that `node platform_core/tools/run_manager/cli.js state reuse` reports reusable. Compare a new User Story with existing ones (`state duplicates --story <file>`) alongside the Module Manager's `inspect-scope` — similarity is a candidate for a human, never a verdict.
