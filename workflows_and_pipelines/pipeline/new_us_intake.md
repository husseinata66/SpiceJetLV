> **Position:** A routing rule that runs **before** Stage 1, not a pipeline stage. It does not add a
> stage, does not add a Skill, and does not change the two-pipeline, eight-stage architecture defined
> in [`pipeline.md`](pipeline.md). It decides *what shape of scope* a supplied User Story becomes, so
> that Stage 1 has an answer to work from instead of an inference.
> **Relationship to Run Scope:** [`run_scope.md`](run_scope.md) §3 already defines `Feature` and
> `User Story` as Run Scope Types. This document adds the *routing question* that resolves which one
> applies, and the *structure* each answer produces.
> **Status:** Current. Authored 2026-08-17 on user mandate.

# 1. Concept Name

**New User Story Intake Routing**

# 2. Purpose

When a User Story arrives, two things must be decided before anything is written: **is it a standalone
Feature or part of a module's CRUD scope**, and **does the scope already exist**. Both are human
decisions. Neither is inferable from a story's title.

Before this rule existed, both were answered implicitly — by whoever read the story first, differently
each time, with no record of the choice. The failure that produces is not dramatic; it is quiet. A
Feature gets absorbed into a module's CRUD suite and stops being separately trackable, or a CRUD area
gets its own folder and the entity's coverage fragments across five places that no longer add up.

**The rule is therefore: ask, then confirm, then create.** Nothing — no run, no module, no Feature, no
pointer, no Project Context — is created before both answers are in and the proposed structure has been
confirmed.

## 2.1 What this does NOT do

- **It does not classify.** The tool reports what exists and what looks similar; the human decides.
- **It does not authorize.** Scope says what a run covers, never what it may do to it — that stays
  Execution Safety's job (`pipeline.md` §14), exactly as `run_scope.md` §10 already states.
- **It does not create a module to hold a work item.** Modules partition the application, not the
  backlog (`module_architecture.md` §6.4). A Feature is a *child of* a module, never a peer.

# 3. The routing question

## 3.0 Trigger

Any supplied User Story: pasted text, a Markdown file, a work-item reference, or a description in
prose. If a message contains something a reasonable reader would call a User Story, this rule fires.

**Ask first. Do not create a module, a run, a Feature, or a Project Context before it is answered.**

> Is this User Story for a standalone Feature or part of a module CRUD scope?
>
> 1. `Feature`
> 2. `CRUD`

**Never infer the answer from the story title alone.** "Bulk Export Agencies" reads like a Feature and
may be an Update-Agency acceptance criterion; "[Admin] Update Agency" reads like CRUD and may be a
standalone capability. The title is evidence of nothing.

## 3.1 If the answer is `Feature`

1. **Collect the complete User Story and its Acceptance Criteria** if not already supplied.
2. **Scope is fixed as:**
   ```text
   Run Scope Type: Feature
   Run Type:       User Story
   ```
   **The Feature defines the scope.** It is never automatically widened into the parent module's full
   CRUD scope — that would silently commit the run to work nobody asked for.
3. **Identify the parent module** — the business area the capability belongs to. This is confirmed with
   the human, not assumed.
4. **Run the existing-scope inspection** (§5).
5. **Propose the structure** (§6) and **wait for confirmation.**

### 3.1.1 Parent module already exists

The Feature is registered **inside that module**:

```text
platform_core_data/modules/<module-name>/features/<feature-name>/
```

**No duplicate parent module is created.** Feature artifacts — context, discovery, findings, test
design, automation mapping, and feature-specific documentation — stay traceable to that Feature.

### 3.1.2 Parent module does not exist

**The module is created first, then the Feature inside it.** These are two approvals, not one:

```text
platform_core_data/modules/<module-name>/
└── features/
    └── <feature-name>/
```

The parent module represents the **business area**. The Feature folder represents the **specific
capability** the supplied story covers.

A Feature never brings its own parent into existence as a side effect. `featureRegistry.proposeFeature()`
refuses a nonexistent module and says so, rather than helpfully creating one.

## 3.2 If the answer is `CRUD`

1. **Ask what the supplied scope contains:**

   > Does this scope contain one User Story only, or multiple CRUD User Stories?
   >
   > 1. One User Story only
   > 2. Multiple CRUD User Stories

2. **If multiple, ask which areas are included:**

   > Which CRUD areas are included?
   >
   > - Add/Create
   > - Update
   > - Search
   > - Actions — Approve
   > - Actions — Reject

   **Never assume every CRUD area exists because one was supplied.** A module with only Add and Update
   stories has only Add and Update in scope, and the absent areas are recorded as not-covered rather
   than quietly designed for.

3. **Request the User Story and Acceptance Criteria for every selected area** not already provided.
4. **Run the existing-scope inspection** (§5), **propose** (§6), **wait for confirmation.**

# 4. CRUD consolidation

CRUD User Stories for the same business entity are **one consolidated module capability** — the shape
the `branch` module already established.

```text
platform_core_data/modules/<module-name>/
```

- The Project Context **accounts for every supplied CRUD area** and keeps traceability to each
  individual User Story.
- **No separate Feature folder per CRUD area.** Add, Update, Search, Approve and Reject for one entity
  are parts of one module, not five things.
- Artifacts may still be **separated by lifecycle area inside** the module where that helps — separate
  discovery snapshots per screen, for instance — but they remain parts of the consolidated module.

## 4.1 The boundary — a Feature supplied alongside CRUD

**This is the rule most likely to be got wrong, so it is stated as a discriminator rather than a
principle.**

| Situation | Result |
|---|---|
| The capability is **explicitly included as part of the module's CRUD requirements** | It stays **inside the consolidated module scope**. **No Feature folder** — however feature-shaped the capability sounds. |
| The human presents the capability as an **independent Feature / User Story**, not as part of the entity's CRUD package | It gets a **dedicated Feature folder**. |

**"Could be described as a feature" is not the test.** Almost any capability could. The test is **how it
was supplied**: as part of a CRUD package, or on its own.

**If the classification is unclear, ask. Never decide silently.** An ambiguous case resolved by guessing
is exactly the failure this document exists to prevent, and asking costs one question.

# 5. Existing-scope inspection

**Runs before anything is created, every time.** One command:

```bash
node platform_core/tools/module_manager/cli.js inspect-scope \
  --user-story "US-4222" --name "Update Agency" [--json]
```

It reports, in one call:

| Inspected | Why |
|---|---|
| Registered modules | A parent may already exist — or the whole scope may. |
| Registered Features | The capability may already be tracked under another module. |
| User Story mappings | Each Feature records its `sourceUserStory`. |
| Module and Feature contexts | Whether Stage 1 has already run for this scope. |
| Current stage states | Both module CRUD stages and each Feature's own stages. |
| Previous and active runs | Whether a run already covered it. |

**Exit codes:** `0` nothing similar · `2` overlap candidates to ask about · `1` error. Overlap is
signalled distinctly from success *and* from failure, so a caller can branch without parsing prose.

## 5.1 Overlap is a candidate, never a verdict

**Never identify overlap from the User Story number alone.** The tool matches on story reference *and*
on name/slug, and reports both as **candidates** — because:

- **The same number can mean different scope.** A story may have been rewritten since it was first run.
- **A different number can mean the same scope.** A renumbered or re-raised story describes work that
  is already covered, and matching on the number would miss it entirely.

**The business scope and Acceptance Criteria must be compared** before concluding anything. That
comparison is a human's.

## 5.2 When scope already exists

Explain what exists, then ask which of these is wanted:

1. **Start a new independent run** against the existing scope.
2. **Extend the existing module** with a new Feature.
3. **Add missing CRUD coverage** to the existing module.
4. **Refresh an existing scope** because the requirements changed.

**Never overwrite, continue, or modify a previous run unless the human explicitly requests it.**

# 6. The confirmation payload

Before writing anything, show:

| Field | |
|---|---|
| **Proposed parent module** | name and slug |
| **Proposed feature name** | name and slug — *Feature route only* |
| **Proposed paths** | the exact paths that would be created |
| **Overlap** | whether an overlapping module or Feature already exists, and which |
| **Proposed run scope** | Run Scope Type + Run Type |
| **What is NOT being created** | e.g. "no feature folder — this is CRUD scope" |

Then **wait**. `--dry-run` on `feature scaffold` prints the exact directory and file list, creating
nothing, so the proposal is the real plan rather than a description of one.

# 7. Required question flow

```text
New US
→ Ask: Feature or CRUD?
→ Feature:
   → Collect the Feature US and AC
   → Identify or confirm the parent module
   → inspect-scope: does the module/feature already exist?
   → Propose modules/<module>/features/<feature-name>/
   → Confirm before creating
→ CRUD:
   → Ask: One US or multiple CRUD User Stories?
   → Identify Add / Update / Search / Approve / Reject coverage
   → Collect the relevant USs and ACs
   → inspect-scope: does the module already exist?
   → Propose ONE consolidated module scope
   → Confirm before creating or starting a run
```

**Keep every intake question short and explicit.** Two options, plainly worded, no preamble. The human
is answering a classification question, not reading an essay about why it matters.

# 8. Enforcement — where this is binding

**`CLAUDE.md` triggers the conversation. It is not the authority, and the rule does not depend on it.**
A skill invoked directly — bypassing the conversation entirely — still has to comply:

| Layer | Enforces |
|---|---|
| `CLAUDE.md` | Fires the intake conversation when a story is supplied. Convenience, not enforcement. |
| **`.claude/skills/project-context-skill/SKILL.md` §3.2, Execution Rule 14** | **The binding precondition.** Stage 1 must not propose a module, scaffold a Feature, create a run, or write a Project Context for a newly supplied User Story until intake is answered and confirmed. |
| `featureRegistry.js` / `featureScaffold.js` | Refuse mechanically: no Feature under a nonexistent module, no scaffold of a Proposed Feature, no `features/` folder created eagerly. |
| `activeModule.js` | An invalid Feature pointer throws; it never degrades to module scope. |

The layering is deliberate. A rule that lives only in a prompt file is advice; a rule the tooling
refuses to violate is a rule.

# 9. Structural rules

1. **A Feature is always a child of a module**, never a peer. Every Feature operation names its module.
2. **`features/` is created only when an approved standalone Feature is scaffolded.** A CRUD-only module
   never grows an empty one — an empty `features/` folder reads as "this module has Features".
3. **Feature artifacts stay inside the Feature boundary; module CRUD artifacts stay inside the parent
   module boundary.** Neither writes into the other.
4. **Feature stages are independent** (`module_architecture.md` §5.5). A Feature stage never advances
   the parent module's CRUD stage, and vice versa.
5. **Existing structures are preserved.** Modules created before this rule are valid and are **not
   migrated, moved, or normalized**. `branch` and `agency` stay exactly as they are.
6. **A skill at Feature scope resolves both `{{MODULE_SLUG}}` and `{{FEATURE_SLUG}}`. A skill at
   module/CRUD scope resolves only `{{MODULE_SLUG}}` and confirms `activeFeature` is null.**

# 10. Tooling

```bash
# The sweep — before anything is created
cli.js inspect-scope [--user-story US-1234] [--name "..."] [--json]

# Standalone Features
cli.js feature list [<module>] [--json]
cli.js feature propose  <module> --name "..." [--user-story US-1234] [--ac-ref <path>]
cli.js feature approve  <module> [<feature>...] --by "Reviewer"
cli.js feature scaffold <module> <feature> [--dry-run]
cli.js feature show     <module> <feature> [--json]
cli.js feature stage    <module> <feature> <stage> --status <Approved|...>

# Scope pointers
cli.js use-feature <module> <feature>   # Feature scope
cli.js use <module>                     # consolidated module/CRUD scope (clears activeFeature)
```

# 11. Non-Goals

This rule does **not**:

- Add a pipeline stage, a Skill, or a branch.
- Change any Skill's Inputs, Allowed Tools, or Expected Artifacts tables beyond the path-resolution
  addition in each Skill's `{{MODULE_SLUG}}` section.
- Migrate, move, or normalize any existing module, Feature, artifact, or run.
- Authorize any action against any environment (`run_scope.md` §10).
- Decide any classification on the human's behalf.

# 12. Supplier Features intake routing — an ADDITION, alongside §3-§9

This section adds a THIRD routing path, for **Supplier-driven Features**. It does not change §3-§9 in
any way — every non-Supplier-Feature User Story is routed exactly as written above.

## 12.1 The hierarchy

```
Supplier Features                              (platform_core_data/supplier-features/)
  → Feature (Import Booked PNR, Refund, Reissue, Seatmap, Ancillaries, Upselling, ...)
    → integrationLayer — Feature METADATA naming the technical/backend path (e.g.
                          "ndc-core-service"), or null. NEVER a folder tier, never inferred
    → context/FeatureChecklistProfile.md — Feature-level, sourced from the Feature's approved
                                            shared context(s); see §12.2a
    → Supplier (Travelport NDC, Sabre NDC, ...) — an independent entity, never called a "feature"
    → Shared scope (e.g. "new-layer-contract") — cross-supplier work, not yet supplier-specific
```

A Supplier under one Feature is **independent** from the same Supplier name under a different
Feature — "Travelport NDC" under Import Booked PNR and "Travelport NDC" under Ancillaries are two
unrelated entities with their own stage tracking, their own folder, their own `supplier.json`.

**Import Booked PNR is the only Feature with live work today.** Refund, Reissue, Seatmap,
Ancillaries, and Upselling are named here as known candidates only — they are **not registered and
not on disk**, and each is proposed and approved individually when a real request for it arrives.
Nothing may treat a Feature as pre-existing because it is named in this list.

## 12.2 Trigger: "new supplier"

When a human says **"new supplier"** (or names a new Supplier for a Supplier Feature):

1. Ask: **"Which Supplier Feature is this supplier for?"** — never inferred from context, never
   assumed from a prior run. Offer the CURRENT registered Features, read live from the registry:
   ```bash
   cli.js supplier-feature feature list --json
   ```
   The list is generated from the registry, never hardcoded here, so a Feature registered later
   appears automatically with no edit to this document. If the named Feature is not registered yet,
   that is a separate propose→approve step the human decides on — not something the Supplier request
   creates as a side effect.
2. Ask **which supplier credential** this Supplier is tested with — named by the human, never carried
   over from a previous run.
3. Ask the **capability checklist**, one question per capability, `Supported` / `Not Supported` /
   `Unknown` (`ndc_execution_rules.md` §A15):

   > **Hold** · **Pay after Hold** · **Meal** · **Baggage** · **Seat** · **Bundle**

   Booking itself is never asked — every Supplier books.

   Never inferred from the Supplier's name or from another Supplier — flynas has no Hold and no Pay
   after Hold, another Supplier may sell no meals. `Unknown` is treated as Not Supported when the run
   is planned, so it is worth answering properly now.

   **Skip `Pay after Hold` when `Hold` is not Supported** — paying later is an action on a held
   booking, so with no Hold the answer is already Not Supported. Asking anyway invites a contradictory
   pair the registry would only refuse (`ndc_execution_rules.md` §A15).
4. Ask for the supplier checklist / scope description for that Supplier, **and ask whether the
   Supplier has rules of its own** beyond the Feature's rules (e.g. ladies-only seats on one airline).
   The answers go into that Supplier's `SupplierChecklist.md` §7c — "None" is recorded too
   (`ndc_execution_rules.md` §A2).
5. Run the scope sweep: `cli.js supplier-feature inspect-scope --name "<Supplier name>" [--user-story ...] --json`.
   Overlap is a candidate, never a verdict — identical reasoning to §5.1.
6. Propose the Supplier under the named Feature and **wait for confirmation** before creating
   anything:
   ```bash
   cli.js supplier-feature supplier propose  <feature> --name "<Supplier name>"
   cli.js supplier-feature supplier approve  <feature> <supplier> --by "<Reviewer>"
   cli.js supplier-feature supplier scaffold <feature> <supplier> [--dry-run]
   ```
   `scaffoldSupplier()` only creates the folder skeleton and `supplier.json` — it does not render any
   Markdown (identical to `scaffoldFeature()`'s behavior for Features). Rendering the Supplier
   Checklist itself is a separate, agent-performed step — §12.2a.
7. **Record the answers from steps 3 and 4** against the now-registered Supplier. Both write
   `supplier.json`; neither file is ever hand-edited:
   ```bash
   cli.js supplier-feature supplier capabilities <feature> <supplier> --by "<who>" \
       --hold no --pay-after-hold no --meal yes --baggage yes --seat yes --bundle yes
   cli.js supplier-feature supplier rules <feature> <supplier> --value "ladies-only-seats"|none --by "<who>"
   ```
   Only **Confirmed** rules are recorded — a rule still Pending Confirmation leaves its cases excluded
   until it is confirmed.
8. Render the Supplier Checklist into the freshly-scaffolded `context/` folder — §12.2a. Its §2c and
   §7c mirror what step 7 recorded.
9. Create a run bound to the Feature + Supplier (never the Feature alone, and never both Supplier and
   shared scope — `run_manager.md`'s run-ownership validation enforces this mechanically via
   `scopeFamily`), then run the normal pipeline stages against that Supplier's scope:
   ```bash
   node platform_core/tools/run_manager/cli.js new --scope <Scope> --target <Target> \
     --feature <feature> (--supplier <supplier> | --shared-scope <shared-scope>)
   ```
   The run is numbered within its Feature — `<feature>-run-NNN` (`run_manager.md` §5.1.1).
10. **Before execution, plan the run against those capabilities** — what will run is known and recorded
    first, exactly as the Safety Preflight is:
    ```bash
    node platform_core/tools/capability_gate/cli.js plan --suite <TestCases_X.md> \
        --feature <feature> --supplier <supplier> --run <run-folder>
    ```
    It writes `runs/<run>/metadata/CapabilityPlan.md`: which cases run, and which are excluded because
    this Supplier cannot support them.

NDC Core Service is **not** a parent choice in this flow, and is never asked about. A Feature's
integration layer is recorded on the Feature (§11.2) and read from there when it matters.

## 12.2a Rendering the Supplier Checklist

A Supplier Checklist is never authored from scratch and never carries one Feature's business content
hardcoded into another Feature's Supplier. It is always produced by merging two documents:

```
platform_core/templates/supplier_feature_intake/SupplierChecklist.md   (generic, Feature-agnostic)
                              +
supplier-features/<feature>/context/FeatureChecklistProfile.md   (this Feature's own rows)
                              ↓
supplier-features/<feature>/suppliers/<supplier>/context/SupplierChecklist.md
```

This follows the same convention `platform_core/templates/README.md` already documents for every
other pipeline artifact: rendering is a Skill/agent responsibility (copy the template, fill
`{{TOKEN}}` placeholders, strip HTML-comment guidance), not a `module_manager` tool function — no
code performs this merge. Concretely, the rendering agent:

1. Reads the generic base template. Sections/rows marked `GENERIC` render as-is (with their
   `{{TOKEN}}`s filled for this Supplier). Sections/rows marked `INJECTED FROM FEATURE PROFILE`
   (§5b Feature-Specific Test Data, §5c Feature Capability Matrix — conditional, see §12.2b, §7b
   Behavior Rows, §8b Feature-Specific Error Rows, plus the Feature-level Open Questions carried
   into §12) are placeholders only — never authored directly in the base template.
2. Resolves this Feature's `FeatureChecklistProfile.md` from the **Feature root**
   (`supplier-features/<feature>/context/FeatureChecklistProfile.md`) — never from inside a specific
   shared scope's folder, since a Feature may accumulate more than one approved shared scope over
   time and the Profile is not rebuilt per scope.
3. Injects §A (Test Data), §B (Behavior + Requirement ID + Source Status), §C (Error Rows), and the
   Profile's "Open Questions carried from the shared context" table into the matching injection
   points.
4. A row's `Source Status` (Confirmed / Open / Provisional / Pending Confirmation) is carried through
   unchanged — rendering never promotes an Open or Provisional item to Confirmed just because it now
   appears in a Supplier's own document.
5. Fills the header's `Rendered from Feature Profile` field with the Profile's path and revision, so
   a reader can always trace a rendered row back to its source without re-deriving it.
6. Fills `{{INTEGRATION_LAYER}}` from the Feature's **registered** `integrationLayer` value — never
   from the Feature's name, a sibling Feature's value, or the words "NDC"/"supplier"/"API" appearing
   anywhere. A `null` or absent value renders as `Unknown / not declared`; it is never guessed and
   never omitted. The rendered value is **metadata only** — the template's own hierarchy line reads
   `Supplier Features → Feature → Supplier`, and nothing in a rendered Checklist may present an
   integration layer as the Feature's owner or parent (`module_architecture.md` §11.2). The
   integration-layer tier in §2's scope diagram, the §3b integration base-URL row, and the
   "Integration Layer Behavior" column in §8a/§8b are all **N/A** for a Feature that declares none —
   left N/A rather than filled with an invented tier.

If a Feature has no `FeatureChecklistProfile.md` yet (e.g. a brand-new Feature with no approved
shared context), the injection points render as an explicit gap (`Feature Checklist Profile not yet
available — see <Feature>'s shared context status`), never as silently empty sections and never by
inventing rows to fill them.

A Feature may also carry **operational execution knowledge** — Feature-level, not Supplier-specific,
living beside `FeatureChecklistProfile.md` in the same `context/` folder (e.g. Import Booked PNR's
`ExecutionFlow_HappyPath.md`). This is HOW to execute a scenario across environments, distinct from
WHAT a Test Case's business-level steps say. When present, the rendering agent records a pointer to
it in the Supplier Checklist's §3c ("Feature-level Execution Flow reference") rather than duplicating
the procedure into every Supplier's own context. `SupplierChecklist.md` §3c's Source/Target
Environment fields are a generic **capability** — not every Feature requires two environments; a
Feature with no such requirement marks it `N/A` rather than a Supplier inventing a Source environment
that doesn't apply. The Source/Target ticketing flow itself is Import-Booked-PNR-specific
(`module_architecture.md` §11.7 tier C) and is never assumed for another Feature.

## 12.2b Rendering a Feature Capability Matrix — conditional §5c

Some Features vary per Supplier not only in *values* but in *which capabilities exist at all*.
Ancillaries is the first: one Supplier may support Baggage + Meal + Seat + Bundle while another
supports only Baggage + Meal, and they may apply an ancillary per segment, per journey, per
passenger, or booking-wide. A Feature with that shape carries a third Feature-level artifact beside
`FeatureChecklistProfile.md`:

```
supplier-features/<feature>/context/CapabilityModel.md
```

It defines the **model** — capability register, dimensions, allowed values, status vocabulary,
interpretation rules, evidence rules, the discrepancy process, and the Test Design gate. It contains
**no Supplier answers**, and is never edited to record one.

**The injection is conditional, and the condition is the file's existence.** When
`context/CapabilityModel.md` is present, the renderer injects `SupplierChecklist.md` §5c. When it is
absent, §5c is **omitted entirely** — no heading, no empty table, no "not yet available" gap line.
This deliberately differs from §5b/§7b/§8b, which always render (as an explicit gap when a Feature
has no Profile yet): every Feature has test data, behaviors, and errors, but not every Feature has
capabilities that vary per Supplier. Presence-on-disk as the activation condition follows the
convention already used for stage folders (`moduleScaffold.js` — an absent folder means that stage
did not run), so no registry or schema field is needed.

### The capability information flow

```
CapabilityModel.md          Feature-level: dimensions, allowed values, rules. NO answers
        ↓ render (§5c)
SupplierChecklist.md §5c    Supplier-level instance, one row per capability
        ↓ Supplier intake
Provided values             human-supplied at intake → Source Status = `Provided`
        ↓ Discovery
verify · resolve · evidence · record discrepancies
        ↓
Verified Supplier Capability Matrix   (in the Supplier Checklist — not a separate file)
        ↓
Test Design                 applies the Feature Capability Model's own gate
```

**Discovery is not the first source of capability answers.** Intake is, whenever the human supplies
information. Against an already-populated row, Discovery's job is to **verify**, not to re-determine
from scratch. Six rules bind the renderer and every later writer:

1. **Two independent axes, never merged.** `Capability Result` (Supported · Unsupported · To Be
   Discovered · Blocked · N/A) says what is true. `Source Status` (Provided · Discovered · Verified ·
   Pending Verification · Conflicting Evidence) says how well it is known and where it came from.
   Each dimension carries its own Source Status.
2. **A Provided value is never reset to `To Be Discovered`.** That value is the *absence* default
   only.
3. **Source Status is carried through unchanged.** Rendering never promotes `Provided` to `Verified`
   — the same rule that already stops rendering from promoting `Open` to `Confirmed` in §7b.
4. **A contradiction appends, never overwrites.** Provided Value · Discovery Finding · Final Verified
   Value · Evidence · Change Reason. The Provided value stays readable forever.
5. **The Checklist is a living document** — opened at intake, refined through Discovery, read by Test
   Design.
6. **Unsupported is not a defect.** A capability confirmed absent for a Supplier is a recorded
   capability fact.

The generic template stays Feature-agnostic: §5c's dimensions and vocabulary come from the Feature's
own Capability Model, never hardcoded into `SupplierChecklist.md`. **Ancillaries is the only Feature
with a Capability Model today.** No other Feature gains §5c by being named here, and a Feature such
as Refund or Seatmap gets one only if and when its own capability variation is defined and approved.

## 12.3 Tooling

```bash
cli.js supplier-feature feature list [--json]
cli.js supplier-feature feature propose --name "Ancillaries" [--integration-layer "<integration>"]
cli.js supplier-feature feature approve <feature> --by "Reviewer"
cli.js supplier-feature feature scaffold <feature> [--dry-run]
cli.js supplier-feature feature set-integration-layer <feature> --value "<integration>"
                                          # the ONLY sanctioned way to correct integrationLayer
                                          # after approval; touches that one field and nothing else

cli.js supplier-feature shared propose  <feature> --name "New Layer Contract" [--user-story ...]
cli.js supplier-feature shared approve  <feature> <scope> --by "Reviewer"
cli.js supplier-feature shared scaffold <feature> <scope> [--dry-run]
cli.js supplier-feature shared stage    <feature> <scope> <stage> --status <Approved|...>

cli.js supplier-feature supplier propose  <feature> --name "Travelport NDC"
cli.js supplier-feature supplier approve  <feature> <supplier> --by "Reviewer"
cli.js supplier-feature supplier scaffold <feature> <supplier> [--dry-run]
cli.js supplier-feature supplier stage    <feature> <supplier> <stage> --status <Approved|...>
cli.js supplier-feature supplier list     <feature> [--json]

cli.js supplier-feature use-feature  <feature>
cli.js supplier-feature use-supplier <feature> <supplier>
cli.js supplier-feature inspect-scope --user-story "..." --name "..." [--json]
```

## 12.4 What this does NOT do

- Does not reuse `modules/modules.json`, `moduleRegistry.js`'s module registry file, or
  `activeModule.js`'s pointer space. `supplier-features/modules.json` and
  `activeSupplierFeature.js` are a SEPARATE, independent addressing system — the two must never be
  confused.
- Does not register a Supplier as a "feature", or store it under a `features/` folder.
- Does not create any Feature — Refund, Reissue, Seatmap, Ancillaries, Upselling, or otherwise —
  until a real request for that Feature is proposed and approved.
- Does not create any Supplier scope as a side effect of intake.
- Does not migrate the existing `modules/` layer. `agency` and `branch` are untouched.

Full architecture: `module_architecture.md`, Supplier Features section.

# 13. Supplier Features — execution/governance rules (pointer only)

Once a Supplier or shared-scope run is intake-routed via §12, it also carries a dedicated
execution/governance rule set — Supplier inheritance, run-intake fields, QA-layer defaults, run-scope
freeze (mechanically enforced — `changeSupplierFeatureRunScope()`, module_architecture.md §11.5.1),
requirement precedence, Discovery→Test-Design and Test-Design→Automation gates, execution evidence,
test-data isolation, prior-run reuse, the Import Booked PNR environment model, and completion
reporting.

That rule set is **tiered**, and the tier decides when a rule activates:

- **§A Supplier-Feature-wide** — any Feature under `supplier-features/`, whatever its integration
  layer.
- **§B NDC-Core-Service-specific** — only when the Feature's `integrationLayer ===
  "ndc-core-service"`. Never inferred from a folder location, a Supplier name, or the words "NDC",
  "supplier", "API", or "booking" appearing in a User Story.
- **§C Import-Booked-PNR-specific** — that one Feature only.

None of it changes §3-§9's routing or any classic module/Feature workflow's behavior.

Full rule set (kept in one place, not duplicated here): `ndc_execution_rules.md`. Stage-gate
mechanics for the same rule set: `pipeline.md` §16.
