# Agentic AI Testing Platform — working rules

Spec-driven agentic QA pipeline. Eight Skills across two pipelines, defined in
[`workflows_and_pipelines/pipeline/pipeline.md`](workflows_and_pipelines/pipeline/pipeline.md).

## New User Story intake — routing comes first

**Trigger: any supplied User Story.** Pasted text, a Markdown file, a work-item reference, or a
description in prose. If a message contains something a reasonable reader would call a User Story,
this fires.

**Do not create a module, a run, a Feature, an active pointer, or a Project Context before intake is
answered and the proposed structure is confirmed.**

### Question 1 — always asked

> Is this User Story for a standalone Feature or part of a module CRUD scope?
>
> 1. `Feature`
> 2. `CRUD`

**Never infer this from the story title.** "Bulk Export Agencies" reads like a Feature and may be an
Update-Agency acceptance criterion. "[Admin] Update Agency" reads like CRUD and may be a standalone
capability. The title is evidence of nothing.

### If `Feature`

1. Collect the complete User Story and Acceptance Criteria if not already supplied.
2. Scope is `Run Scope Type: Feature` · `Run Type: User Story`. **The Feature defines the scope** —
   never widen it into the parent module's full CRUD scope.
3. Identify and **confirm** the parent module.
4. Run the scope sweep (below).
5. Propose `platform_core_data/modules/<module>/features/<feature>/` — creating the parent module
   first if it does not exist — and **wait for confirmation**.

### If `CRUD`

1. Ask: **one User Story, or multiple CRUD User Stories?**
2. If multiple, ask which areas: **Add/Create · Update · Search · Approve · Reject**. Never assume an
   area exists because another one was supplied.
3. Request the User Story and Acceptance Criteria for every selected area not yet provided.
4. Run the scope sweep, propose **one consolidated module** — `platform_core_data/modules/<module>/`,
   **no feature folder per CRUD area** — and **wait for confirmation**.

### The boundary

A capability supplied **as part of a CRUD package** stays in the consolidated module and gets **no
Feature folder**, however feature-shaped it sounds. A capability the human presents **as an
independent Feature/User Story** gets one. The test is *how it was supplied*, not whether it could be
described as a feature.

**If the classification is unclear, ask. Never decide silently.**

### The scope sweep — before anything is created

```bash
node platform_core/tools/module_manager/cli.js inspect-scope --user-story "US-1234" --name "..." --json
```

Reports registered modules, registered Features, User Story mappings, module and Feature contexts,
current stage states, and the active pointers. Exit `2` means overlap candidates.

**Overlap is a candidate, never a verdict.** Do not identify overlap from the User Story number
alone — compare the business scope and Acceptance Criteria. The same number can mean different scope;
a different number can mean the same scope.

**When scope already exists,** explain what exists and ask which is wanted: a new independent run
against it · extend the module with a new Feature · add missing CRUD coverage · refresh because the
requirements changed. **Never overwrite, continue, or modify a previous run unless explicitly asked.**

### Before writing, show

Proposed parent module · proposed feature name · proposed paths · whether an overlapping module or
Feature exists · the proposed run scope · what is deliberately *not* being created. Then wait.

`cli.js feature scaffold <module> <feature> --dry-run` prints the exact directory and file list and
creates nothing — so the proposal is the real plan.

**Keep intake questions short and explicit.** Two options, plainly worded, no preamble.

**Full rule, and the enforcement that does not depend on this file:**
[`workflows_and_pipelines/pipeline/new_us_intake.md`](workflows_and_pipelines/pipeline/new_us_intake.md).

## Supplier Features intake routing

A third, independent hierarchy for Supplier-driven Features: `Supplier Features → Feature (Import
Booked PNR, and any other registered Feature) → Supplier (Travelport NDC, Sabre NDC, ...) or Shared
scope`. This is a SIBLING of the module/Feature routing above, never a variant of it — a Supplier is
never registered as a "feature", and its registry
(`platform_core_data/supplier-features/modules.json`) is completely separate from
`modules/modules.json`. Full spec:
[`workflows_and_pipelines/pipeline/module_architecture.md`](workflows_and_pipelines/pipeline/module_architecture.md)
§11 and
[`workflows_and_pipelines/pipeline/new_us_intake.md`](workflows_and_pipelines/pipeline/new_us_intake.md)
§12.

**There is no Service tier.** A Feature declares its technical backend as metadata —
`integrationLayer: "ndc-core-service"`, or another integration, or `null` — never as a folder above
it, and never inferred from the Feature's name. NDC Core Service is a valid integration layer, not an
owner: a Supplier-driven Feature (Ancillaries, Upselling) is never forced through it.

**Trigger: "new supplier"**, or a new Supplier named for a Supplier Feature. When it fires:

1. Ask: **"Which Supplier Feature is this supplier for?"** — never inferred, never assumed from a
   prior run. Read the current options live from
   `cli.js supplier-feature feature list --json`; never offer a hardcoded list.
2. Ask **which supplier credential** the run uses — named by the human, never carried over.
3. Ask the **capability checklist**, one question each: **Hold · Pay after Hold · Meal · Baggage ·
   Seat · Bundle**, `Supported` / `Not Supported` / `Unknown`. Booking is never asked — every
   Supplier books. Suppliers differ — flynas has no Hold
   or Pay after Hold — and this is **never inferred** from the Supplier's name or another Supplier.
4. Ask for the supplier checklist / scope description, and whether the Supplier has rules of its own.
5. Create the Supplier scope
   (`cli.js supplier-feature supplier propose/approve/scaffold <feature> ...`), record the answers
   (`... supplier capabilities ...` and `... supplier rules ...` — never hand-edit `supplier.json`),
   then a run bound to Feature + Supplier, and run the normal pipeline stages against it.

**Only part of a suite runs against a given Supplier.** A test case declares what it needs in its
`Requires` column (and `Supplier Rule` for a Supplier-specific rule like ladies-only seats). Before
execution, `capability_gate/cli.js plan --run <run>` writes `metadata/CapabilityPlan.md`: cases needing
a capability the Supplier lacks are **Excluded — Not supported by supplier**, never run and failed, and
stay out of executable scope and pass rate. `Unknown` counts as Not Supported. Full rule:
[`ndc_execution_rules.md`](workflows_and_pipelines/pipeline/ndc_execution_rules.md) §A15.

**A Supplier under one Feature is independent from the same Supplier name under a different
Feature.** "Travelport NDC" under Import Booked PNR and "Travelport NDC" under Ancillaries are two
unrelated entities — separate folder, separate `supplier.json`, separate stage tracking, never merged
or cross-referenced.

**Import Booked PNR is the only registered Feature today.** Refund, Reissue, Seatmap, Ancillaries,
and Upselling are candidate names only — not registered, not on disk. Each is proposed and approved
individually when a real request for it arrives, exactly like every other entity here.

A run addresses this scope with `scopeFamily`/`feature`/`supplier`/`sharedScope` on `run.json`, not
`modules[]`. `scopeFamily` is the discriminator (`"supplier-feature"`, or `null` for a classic run) —
deliberately not named after the Feature, which `feature` already holds. It must pick exactly one of
`supplier` or `sharedScope` — never both, never neither — enforced mechanically by `createRun.js`'s
`validateRunScopeFamily()`.

**Supplier/Shared-scope runs also carry an execution/governance rule set** — inheritance, run-intake
fields, QA-layer defaults, run-scope freeze, requirement precedence, Discovery/Automation gates,
evidence, test-data isolation, prior-run reuse, environment model, completion reporting. It is
**tiered**, and the tier decides when a rule fires: **§A** applies to any Supplier Feature, **§B**
only when that Feature's `integrationLayer === "ndc-core-service"`, **§C** only to Import Booked PNR.
Never inferred from a folder, a Supplier name, or the word "NDC" in a User Story. It never changes
Agency/Branch/classic-module behavior. Full rules (kept in one place, not duplicated):
[`workflows_and_pipelines/pipeline/ndc_execution_rules.md`](workflows_and_pipelines/pipeline/ndc_execution_rules.md).

A Supplier-Feature run's scope is **frozen** once confirmed. The only supported way to change
`feature`/`supplier`/`sharedScope`/`testingLayerScope` afterwards is
`run_manager/cli.js scope-change --approved-by "..." --reason "..."`, which appends to `scopeHistory`
and never overwrites. `scopeFamily` itself is never changeable.

## Scope pointers

| | |
|---|---|
| `cli.js use <module>` | Consolidated module/CRUD scope. **Clears `activeFeature`.** |
| `cli.js use-feature <module> <feature>` | Feature scope. Sets both pointers. |
| `activeFeature: null` | Module/CRUD scope. Resolve `{{MODULE_SLUG}}` only. |
| `activeFeature` set | Feature scope. Resolve **both** `{{MODULE_SLUG}}` and `{{FEATURE_SLUG}}`. |

**An invalid or stale Feature pointer is an error, never a fallback to module scope.** Stop and ask
for correction — silently dropping to module scope writes Feature output into its parent's folders.

## Standing rules

- **Never overwrite, continue, or modify a previous run** unless explicitly asked.
- **Existing modules are not migrated.** Modules created before the Features layer are valid as they
  are. Do not move or normalize `branch`, `agency`, or any existing artifact to match a new convention.
- **A module is never created silently.** Stage 1 proposes; a human approves; the Module Manager
  records (`module_architecture.md` §6.4). The same applies to a Feature.
- **Never hand-edit `modules.json`, `module.json`, or `feature.json`** — every write goes through
  `platform_core/tools/module_manager/cli.js`.
- **Never hand-format a slug or a run folder name.** The tooling generates both.
- **Runs are numbered per Feature/module** — `reissue-run-003`, `agency-run-004`, `agency+branch-run-001`.
  Pass the owner when creating a run (`run_manager/cli.js new … --feature F --supplier S`, or
  `--modules m`); a run without one is a bare global `run-NNN`. Existing runs move onto the convention
  only through `run_manager/cli.js rename-runs`, which plans first and needs `--approved-by` to apply
  ([`run_manager.md`](workflows_and_pipelines/pipeline/run_manager.md) §5.1.1).
- **Scope is not authorization.** A module being in scope is not permission to mutate its records;
  that is decided per action against `execution_safety_policy.json` (`pipeline.md` §14).
- **Ask before every execution whether it runs Headed or Headless.** Never inferred, never carried
  over from the previous run.
- **Screenshots only for Findings and defects** (Failed/Blocked/Inconclusive). Never for a Passed
  case, a navigation step, or a screen visited along the way — a Passed case is evidenced by its
  observed values in text. Save to `artifacts/` and cite by path; don't open the image back into
  context unless a visual-only defect needs it
  ([`pipeline.md`](workflows_and_pipelines/pipeline/pipeline.md) §11.4).

## Ancillaries runs — read the global file first

**Ancillaries only.** Before executing any Ancillaries Supplier run (Portal or Admin), read
[`ExecutionFlow_HappyPath.md`](platform_core_data/supplier-features/ancillaries/context/ExecutionFlow_HappyPath.md)
§11, §15 and §16, and build the booking with
[`SetupBooking_Script.md`](platform_core_data/supplier-features/ancillaries/context/SetupBooking_Script.md).
They hold the speed rules, the passenger age limits, the failure-screenshot rule and the scoped login
exception. Every Ancillaries Supplier inherits them whether or not its `SupplierChecklist.md` exists
yet. They change nothing for any other Feature or module.

**An automated Setup Group runs with one command, not case by case** (§16.0):
`node platform_core/tools/supplier_feature_runner/cli.js run --run <run> --group <NN> --headed|--headless`.
It reads the run's Capability Plan, waits for the human to log in, and never presses Book itself.
Groups 14–16 are **assisted** (headed only): the runner builds the booking up to Book, stops with a
red banner, **the human presses Book**, and the runner then does the read-only checks. Group 17
(hold, then pay) stays **manual** and the runner refuses it.

## Reports

**Every pipeline report is published in one shared HTML design**, generated by
`platform_core/tools/report_builder` — Discovery, Coverage, Automation Coverage/Decision, Manual QA,
Execution Results, Repair Summary, Final QA Report. Canonical rule:
[`pipeline.md`](workflows_and_pipelines/pipeline/pipeline.md) §17. Model reference:
[`report_builder/README.md`](platform_core/tools/report_builder/README.md).

```bash
node platform_core/tools/report_builder/cli.js validate --model <artifact>.report.json
node platform_core/tools/report_builder/cli.js build    --model <artifact>.report.json
```

- **The HTML is additional, never a replacement.** The Markdown stays the authoritative artifact —
  approved, diffed, and traced. The HTML is never approved, never versioned, and never read as input.
- **Never hand-write a report's HTML, and never hand-edit a generated `.html`.** Edit the model and
  rebuild. **Never invent a second design or a per-stage variant.**
- **Rebuild after every in-place edit to the Markdown**, or the two disagree.
- **Redact secrets with the model's `"redacted": true`**, never a hand-typed placeholder. Captured
  application output goes through `text`, never `html`.

## Tests

```bash
npm test                  # node --test across platform_core/tools/**/__tests__ and tests/contracts (real-world API contracts)
npm run verify:boundary   # branch-boundary check
```
