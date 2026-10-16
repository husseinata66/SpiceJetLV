> **Position:** Outside the eight-stage, two-pipeline Skill architecture defined in [`workflows_and_pipelines/pipeline/pipeline.md`](pipeline.md) and [`.claude/skills/`](../../.claude/skills/). Run Scope is a **configuration concept, not a Skill and not a pipeline stage** — it does not add a stage to `workflows_and_pipelines/pipeline/pipeline.md`'s Pipeline Overview, and this document does not alter that stage order, that count (still eight, across two branches), or any Skill's Inputs/Allowed-Tools/Execution-Rules tables.
> **Relationship to existing concepts:** `.claude/skills/project-context-skill/SKILL.md` §4 already lists "Run configuration" as an input to Stage 1 (optional since 2026-10-08 — missing values become declared Open Questions, resolved by the stage that needs them; `pipeline.md` §4 Stage 1), described there as "modules in scope for this run, target environment URL, credentials/roles available, environment safety constraints." Run Scope is the formal name and structure for the *scope* portion of that existing input — it does not add a new input the Project Context Skill didn't already declare, and it does not change that Skill's Purpose, Responsibilities, Execution Rules, or Expected Artifacts. This document also does not alter `workflows_and_pipelines/pipeline/pipeline.md` §8's traceability chain; §6 below presents an extended, more granular view of the same Stage 1→3 handoff that document already describes, for use alongside it.
> **Scope of this revision:** This document defines the Run Scope concept only. No existing agent file, `workflows_and_pipelines/pipeline/pipeline.md`, or any project artifact has been modified or generated as part of authoring it.
> **Revision note (2026-07-29, user-mandated):** Run Scope gains the concrete referent it previously lacked. "What subset of the product does this run cover?" now resolves to a **set of modules** — an explicit, inspectable list in `platform_core_data/modules/modules.json`, not a prose narrowing worked out per run ([`module_architecture.md`](module_architecture.md) §9.1). §3 gains a Module Scope column, §7 gains the registry as a recording location, and §8's chain gains the module layer. **No Type is added or removed, no Source changes, and Run Type still composes independently.**

# 1. Concept Name

**Run Scope**

# 2. Purpose

Run Scope defines **exactly what a given pipeline run is allowed to validate** — the boundary the Project Context Skill narrows the approved Project Knowledge down to when producing that run's Project Context.

Without a named Run Scope concept, "what does this run cover" is answered ad hoc, differently, every time (as it once was in each Project Context's free-text "Scope Summary" section, worked out in prose per run). Run Scope exists so that the platform can support running against something narrower than "the entire project" — a single Epic, Feature, User Story, Bug, or an ad hoc requirement document — **without changing the pipeline, without adding an agent, and without changing how many stages exist.** The pipeline already treats "what's in scope" as data it consumes (via the Project Context); Run Scope gives that data a name, a fixed set of Types, and a documented set of Sources.

**A Run Scope resolves to a set of modules.** Whatever Type and Source a run uses, the *answer* is the same shape: which of the approved modules in `platform_core_data/modules/modules.json` this run touches. That is what makes the scope mechanically actionable rather than only descriptive — a stage reads the active module list and knows exactly which folders it reads and writes:

| Resolved as | `activeModules` | `activeScope` | What a stage does |
|---|---|---|---|
| One module | `["login"]` | `single` | Reads and writes only that module's workspace; Stage `5A` runs that module's standalone project |
| Several modules | `["login","booking"]` | `multi` | Once per named module — not concatenated into one document |
| The whole project | every approved slug | `full-project` | Once per module for Stages 1–3; Stage `5A` runs the **assembled baseline** as one system, which is how cross-module interaction is exercised at all |

```bash
node platform_core/tools/module_manager/cli.js use login              # a single-module run
node platform_core/tools/module_manager/cli.js use login,booking      # a multi-module run
node platform_core/tools/module_manager/cli.js use --all              # a full-project run
node platform_core/tools/module_manager/cli.js active --json          # what is active, and the scope
```

**The Type→module mapping is a human decision at Stage 1's gate, never an inference.** A User Story scope covering "cabin class filtering" maps to the `flight-search` module because a reviewer says so — the platform never guesses which modules a work item touches, and it never creates a module to hold one (`module_architecture.md` §6.4).

# 3. Run Scope Types

A Run Scope is always exactly one of the following Types:

| Type | Meaning | Typically resolves to |
|---|---|---|
| **Entire Project** | No narrowing — the run validates against the full approved Project Knowledge scope. | `full-project` — every approved module |
| **Epic** | The run validates everything under a named Epic (a grouping of Features/User Stories). | `multi` — the modules the Epic spans |
| **Feature** | The run validates a single Feature and its constituent behavior. | `single` — and, when the Feature is registered as a **standalone Feature**, it further resolves to `modules/{module}/features/{feature}/` with its own `activeFeature` pointer ([`module_architecture.md`](module_architecture.md) §5.5). May be `multi` where a Feature genuinely crosses a module boundary |
| **User Story** | The run validates a single User Story's acceptance criteria. | `single` — usually one module |
| **Bug** | The run validates a specific reported defect — reproduction, and (once fixed) regression confirmation. | `single` — the module the defect is in |
| **Requirement Document** | The run validates whatever a specific supplied document defines — broader than one story, not necessarily the whole project (e.g., a short spec for a small change). | `single` or `multi`, per the document |
| **Custom Scope** | Any scope that doesn't cleanly fit the above — described directly in the run configuration rather than pointing at a tracked work item. | Any of the three — stated explicitly in the run configuration |

The third column is a **typical** mapping, not a rule. A Bug that turns out to span two modules is a `multi` run, and saying so is more useful than forcing it into `single` to match a table.

## 3.1 Feature vs. User Story — resolved by asking, never by inference

*(Added 2026-08-17. Full rule: [`new_us_intake.md`](new_us_intake.md).)*

`Feature` and `User Story` are both Types above, and a supplied story can legitimately be either. **The
choice is a routing question put to the human before any scope is recorded**, never read off the story's
title:

> Is this User Story for a standalone Feature or part of a module CRUD scope?

| Answer | Run Scope Type | Run Type | Resolves to |
|---|---|---|---|
| **`Feature`** | `Feature` | `User Story` | `modules/{module}/features/{feature}/` — the Feature defines the scope, never widened into its parent's CRUD scope |
| **`CRUD`** | `User Story` | `User Story` | `modules/{module}/` — **one consolidated module** covering every supplied CRUD area, with traceability to each individual story |

A CRUD area (Add/Create, Update, Search, Approve, Reject for one entity) is **not** a Feature and gets
no feature folder, however feature-shaped the capability sounds. This mirrors §2's existing rule that
the Type→module mapping is a human decision at Stage 1's gate and never an inference.

# 4. Run Scope Sources

A Run Scope Source is **how the content of a given Type is actually delivered** to the Project Context Skill. Sources and Types are independent axes — e.g., a **User Story** Type can be sourced from pasted text today, or from an Azure DevOps User Story ID once that integration exists.

## 4.1 Available now

| Source | How it works | Typical Types it feeds |
|---|---|---|
| **Entire Project** | No specific item supplied; the Project Context Skill scopes to the full approved Project Knowledge. | Entire Project |
| **Pasted text** | The Epic/Feature/Story/Bug description is pasted directly into the run configuration or the prompt given to the Project Context Skill. | Epic, Feature, User Story, Bug, Custom Scope |
| **Markdown file** | A `.md` file — e.g. under `platform_core_data/knowledge_base/requirements/` (in the Type-specific subfolder: `epics/`, `features/`, `user_stories/`, `bugs/`, `specifications/` — see that folder's own README) or `resources/notes/` — is referenced as the scope definition. The file's own `Source:` metadata line (not its folder) records that its Source was Markdown file — see §4.3 below. | Feature, User Story, Bug, Requirement Document, Custom Scope |
| **Uploaded document** | A non-Markdown file (Word, PDF, etc.) is supplied out of band and referenced by path or attachment. | Requirement Document, Feature, Epic |
| **Requirement document reference** | A pointer to an existing document already in the project's knowledge (e.g., a specific section of the PRD, or a file under `resources/requirements/specifications/`), rather than a newly pasted/uploaded one. | Requirement Document |
| **Custom scope description** | A free-form scope statement that doesn't reference any tracked item or document at all. | Custom Scope |

## 4.2 Future (integration-dependent — not implemented)

| Source | Status |
|---|---|
| **Azure DevOps User Story ID** | Future. Would resolve a work item ID via an Azure DevOps integration into a Run Scope of Type User Story. |
| **Azure DevOps Feature / Epic / Bug ID** | Future. Same integration, other work item types. |
| **Jira Story ID** | Future. Would resolve a Jira issue key via a Jira integration into a Run Scope of Type User Story. |
| **Jira Epic / Bug ID** | Future. Same integration, other issue types. |

These are documented as supported future input sources only. No Azure DevOps or Jira connectivity exists in this platform today, and none is implemented by this document.

## 4.3 Source Is Recorded as Metadata, Not Folder Structure

`platform_core_data/knowledge_base/requirements/` is organized by **Type only** (`epics/`, `features/`, `user_stories/`, `bugs/`, `specifications/`), mirroring the Types in §3. **Source** is deliberately not a subfolder — a User Story delivered via pasted text, a Markdown file, or (once integrated) Azure DevOps all live in the same `user_stories/` folder. Each requirement file instead carries its own Source as a metadata line near its top, e.g. `**Type:** User Story · **Source:** Plain Text (pasted)`.

This is because Type is stable (the five subfolders above are not expected to grow often) while Source keeps expanding as new integrations are added (Azure DevOps, Jira, Confluence, GitHub, PDF, Word, Markdown, Plain Text, Figma, Email, TestRail, Xray, and others) — encoding Source into the directory tree would mean creating a new subfolder every time a new intake channel is supported. Recording it as in-file metadata instead keeps the folder layout stable regardless of where a requirement came from.

An earlier version of this layout nested `user_stories/` by Source (`pasted/`, `markdown/`, `azure_devops/`); that was flattened back to Type-only on 2026-07-10 in favor of the metadata approach described here.

# 5. Run Types

A **Run Type** is distinct from a Run Scope Type: it describes the *testing intent/depth* of the run, not *what subset of the product* it targets. The two are chosen independently, though some pairings are typical:

| Run Type | Meaning | Typical Run Scope pairing |
|---|---|---|
| **Full Regression** | Exercise everything currently in scope, at full depth. | Entire Project |
| **Smoke** | Exercise only critical paths, for a fast confidence check. | Entire Project (shallow) or a single Feature |
| **Feature** | Validate one Feature end to end. | Feature |
| **User Story** | Validate one User Story's acceptance criteria. | User Story |
| **Bug** | Reproduce a defect and/or confirm a fix via regression. | Bug |
| **Epic** | Validate everything under an Epic. | Epic |
| **Custom** | Whatever the accompanying Custom Scope defines. | Custom Scope |

Example: a **Smoke** run type can still be paired with an **Entire Project** Run Scope (shallow pass over everything) or a **Feature** Run Scope (shallow pass over one feature only) — Run Type and Run Scope Type compose rather than duplicate each other.

# 6. Relationship to Project Knowledge and Project Context

Per [`platform_core_data/README.md`](../../platform_core_data/README.md), `platform_core_data/` is the **canonical, standing knowledge base** for a project — `onboarding.md`, `architecture.md`, `glossary.md`, `run_configuration.md`, and `resources/`. This does not change: Project Knowledge remains the durable source of what the project *is*, independent of any single run.

What changes conceptually is how the **Project Context** — the artifact `.claude/skills/project-context-skill/SKILL.md` produces at `platform_core_data/modules/{module}/context/ProjectContext.md` — is described:

```
Project Context (per module)  =  Project Knowledge  +  Run Scope
```

- **Project Knowledge** (`platform_core_data/knowledge_base/`) supplies the durable facts: what the application is, its architecture, its glossary, its available credentials/environments, and — via `run_configuration.md` — which Run Scope Sources are set up for this project at all.
- **Run Scope** (this document) supplies the narrowing: *which* Epic/Feature/Story/Bug/Requirement Document/Custom Scope, or the Entire Project, this particular run is validating — resolved to a set of modules (§2).
- **Project Context** (`platform_core_data/modules/{module}/context/`) is what the Project Context Skill produces by applying a specific Run Scope to the standing Project Knowledge — **one file per module in scope**. Its "Scope Summary," "Modules In Scope," and "Modules Out of Scope" sections (per `.claude/skills/project-context-skill/SKILL.md` §8) are precisely where a resolved Run Scope materializes.

This reframing does not change the Project Context Skill's Inputs table (§4 of its spec already names "Run configuration" as required) — it clarifies that the scope portion of that input is a structured Run Scope (Type + Source) rather than free text, that it resolves to a module set, and that Project Knowledge is the other half of what the Skill reconciles.

**The approved Project Context remains the operational source of truth** — per `workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 5, every downstream stage reads only the approved Project Context, never the PRD or Project Knowledge directly.

**A new Run Scope does not fork the Project Context.** This is the one substantive change the 2026-07-29 revision makes to this section. A Project Context belongs to its *module*, not to the run that produced it: a later run scoped to Login reads and, where the PRD has moved, **refines `modules/login/context/ProjectContext.md` in place** — it does not produce a second copy in its own folder. What the run records is which revision it consumed (`run.json` → `moduleArtifactRefs[]`), so the run stays reproducible after the module's context moves on. A prior run's *conclusions* are unchanged and its record of what it consumed is exact; what no longer happens is a proliferation of context copies with no rule saying which is current.

# 7. Where Run Scope Is Recorded

| What | Where | Persists across runs? |
|---|---|---|
| Which Run Scope Sources are available/set up for this project (e.g., "ADO not yet integrated," "requirement docs are pasted-text based") | `platform_core_data/knowledge_base/run_configuration.md` | Yes — durable, project-wide |
| **Which modules a Run Scope resolves to, and what that activation means** | `platform_core_data/modules/modules.json` → `activeModules[]`, `activeScope`, `switchedAt`, `setBy` | **Sticky** — it survives until explicitly changed, so a multi-session run does not silently lose its scope. `previousActiveModules` makes a mis-switch one command to undo |
| **Which modules a *given run* executed against** | That run's `metadata/run.json` → `modules[]`, `moduleScope`, `moduleArtifactRefs[]` (`run_manager.md` §7) | Frozen — immutable run history, and the reason a run stays reproducible after its modules evolve |
| The narrowing itself (Type + Source + resolved content), as prose a human reads | Each in-scope module's Project Context, `platform_core_data/modules/{module}/context/ProjectContext.md` (its Scope Summary / Modules In Scope sections) | Yes — durable per module, refined in place rather than re-forked per run |
| A quick-reference history of past runs' scope choices | `platform_core_data/knowledge_base/run_configuration.md` → "History of scope choices" table | Yes — an append-only log |

**The registry and `run.json` answer different questions and are both needed.** `modules.json` answers "what is the pipeline working on *now*?"; a run's `run.json` answers "what did *that* run work on?" Collapsing them would mean either losing the current pointer or rewriting history, and §5.7 of `run_manager.md` already establishes why neither is acceptable.

# 8. Extended Traceability Model

`workflows_and_pipelines/pipeline/pipeline.md` §8 already defines the traceability chain from PRD through to the Final QA Report. With Run Scope named explicitly, and Discovery's Findings shown as their own link (already an Explorer Skill output — see `.claude/skills/explorer-skill/SKILL.md` §5.11 and `workflows_and_pipelines/pipeline/run_manager.md` §6's `findings/` workspace folder, just not previously drawn as a distinct node in the pipeline-level diagram), the fuller chain reads:

```
Project (Project Knowledge + PRD)
   └─▶ Module decomposition            modules/modules.json          (Stage 1, human-approved)
         └─▶ Run Scope                  → activeModules[] + activeScope
               └─▶ Project Context     modules/{module}/context/     ─┐
                     └─▶ Discovery     modules/{module}/discovery/    │ durable,
                           └─▶ Findings                              │ per module
                                 └─▶ Manual Test Cases               │
                                       modules/{module}/test_design/  ─┘
                                       ├─▶ Manual Execution    runs/…/manual_execution/  ─┐
                                       └─▶ Automation         modules/{module}/automation/ │
                                             └─▶ Execution     runs/…/execution/         │ per run,
                                                   └─▶ Reporting runs/…/reporting/       │ immutable
                                                                                          ─┘
```

**Run Scope sits between the decomposition and the context, and that ordering is load-bearing.** The module list is derived from the PRD once and approved once; a Run Scope then *selects* from it. A scope that names a module the registry does not hold is an error to report, never a prompt to create one (`module_architecture.md` §6.5).

This is a more granular *view* of the same chain `workflows_and_pipelines/pipeline/pipeline.md` §8 already documents — it does not replace that section, add an artifact type that doesn't already exist, or change any stage's Input/Output contract. "Project" here stands in for the PRD + Project Knowledge that already feeds Stage 1; "Run Scope" is the narrowing step described in §6 above; "Findings" names the Explorer Skill's existing per-observation evidence packages explicitly rather than leaving them implicit inside "Discovery Artifacts."

Note that Manual Execution and Automation are **siblings, not sequential** — the two branches are fully isolated after Test Design, and neither consumes the other's output (`pipeline.md` §3.3). An earlier version of this diagram chained them through an Automation Candidate Package; that artifact was removed from the platform along with the coupling it existed to carry.

# 9. Future Integrations

The following are **documented as future integration targets only** — none are implemented, connected, or executed by this platform today:

| System | Role once integrated |
|---|---|
| **Azure DevOps** | Resolve a User Story / Feature / Epic / Bug work item ID into a Run Scope, per §4.2. |
| **Jira** | Resolve a Story / Epic / Bug issue key into a Run Scope, per §4.2. |
| **Xray** | Test management traceability sync — would let Manual Test Cases / Execution Results generated by this pipeline be reflected back into Xray against the originating Jira issue. |
| **TestRail** | Test management traceability sync — would let Manual Test Cases / Execution Results be reflected back into TestRail. |

Adding any of these integrations in the future is expected to extend §4.2 (new Sources) and this section, without requiring a new pipeline stage, a new Skill, or a change to the eight existing Skills' Inputs/Outputs — a resolved Run Scope, regardless of where it came from, is still just data flowing into the same Stage 1 input the Project Context Skill already declares.

# 10. Non-Goals

To keep this concept's boundary unambiguous, Run Scope explicitly does **not**:

- Add a pipeline stage. The two pipelines' stage sets are unchanged, per `workflows_and_pipelines/pipeline/pipeline.md` §3.
- Add a new Skill. Resolving a Run Scope into a Project Context remains the Project Context Skill's job, per its existing spec.
- Change any agent's Inputs, Allowed Tools, Execution Rules, or Expected Artifacts tables.
- Implement Azure DevOps, Jira, Xray, or TestRail connectivity — §9 is documentation of future intent only.
- Change how an already-approved Project Context is treated — `workflows_and_pipelines/pipeline/pipeline.md` §7's artifact rules (one file per artifact, edited in place; approval flips `status:` and is recorded in the Run Manifest) apply unchanged.
- **Authorize anything** *(added 2026-08-07)*. Run Scope says which requirements and modules a run covers. It never says which **actions** that run may perform against them — that is Execution Safety (`pipeline.md` §14), decided per action against the environment's policy. A module being *in scope* is not permission to mutate its records: scope defines the subject, authorization defines the verb, and a run can legitimately have a module fully in scope while every mutating operation on it resolves `Approval Required` or `Forbidden`.

# 11. Example

*Illustrative only — not executed as part of this task.*

```text
Run Type:     User Story
Run Scope:
  Type:       User Story
  Source:     Pasted text
  Content:    "As an Admin, I want to filter the Agency list by
               Status so that I can quickly find suspended
               agencies."
```

Hypothetical result: the Project Context Skill reconciles this Run Scope against the standing Project Knowledge (`platform_core_data/`) and the existing approved PRD, producing that run's own `ProjectContext.md` scoped narrowly to the Agency list's Status filter behavior — rather than the broader Agency create/search/update scope of a prior run's Project Context. No such run has actually occurred; this is shown only to make the Type/Source/Content shape concrete.

Note that no `Project:` line appears above: the platform hosts one project at a time (`pipeline.md` §1), so a run identifies its scope, never which project it belongs to.
