# Platform Changelog

This document is the platform's single revision history — every user-mandated change, platform
defect fix, and structural decision, from the earliest commit onward. It began as the revision
history extracted from the top of each `agents/*.md` file (each agent spec now retains only its
`Pipeline position` and `Traceability` lines — current-state metadata, not history), and has since
grown to cover the whole repository.

**Every notable commit gets an entry here, in the same session it lands in.** "Notable" means: a new
capability, a governance/policy change, a structural migration, a platform defect fix, or a
cross-cutting tooling change — not a routine run's day-to-day artifact sync (discovery findings, test
suite updates, execution results) unless it also changed how the platform behaves. When in doubt,
record it; a redundant entry costs nothing, a silent gap defeats the point of this file. Newest first.

---

## 2026-10-17 — Ancillaries: failure screenshots saved in each run's own folder

User-mandated. Run-006's screenshots landed in the repo root because they were saved with bare file
names, which Playwright MCP resolves against the workspace root.

- **Each failure screenshot goes to**
  `platform_core_data/runs/<run folder>/manual_execution/artifacts/failures/<Test Case ID>.png`,
  passed as the full path. The folder is created by the run's first failure screenshot.
  `supplier-features/ancillaries/context/ExecutionFlow_HappyPath.md` §11, rev 4.
- **`.gitignore` ignores `/*.png`, `/*.jpeg`, `/*.webp`** at the repo root, so a stray screenshot
  can never be committed again.

---

## 2026-10-17 — Ancillaries: screenshots only for results that did not pass

User-mandated, **Ancillaries Feature only**. The Flynas NDC SeatMap run (run-006) screenshotted
every `Passed` case and also saved working shots taken only to check where the browser was.

- **Taken for `Failed`, `Blocked`, `Inconclusive`**, showing the state that proves the result.
- **Never for `Passed`.** The case's Notes record what was observed; no screenshot is not a gap.
- **No working screenshots.** Browser state is checked with `browser_snapshot`, not a saved image.
- `supplier-features/ancillaries/context/ExecutionFlow_HappyPath.md` §11, rev 3, so every
  Ancillaries Supplier run picks it up. `manual-execution-skill` §7 is unchanged for every other
  Feature and module. Existing run evidence is untouched.

---

## 2026-10-11 — PE-03: run-bound Stage 3 suites and per-suite Traceability Matrix

Platform defect fix, approved by Ahmed Ayman. It was found when run-002 of `search-cabin-class-rbd/galileo` was blocked at its 4M
gate by run-001's pending suite in the same folder.

- **New `run_manager/suiteBinding.js`.**
  - `runBoundSuites`: a run whose **own Stage 3 is Completed and Approved** is bound to exactly the suites that approval recorded (`approval.headerEvidence`). Any other run's suites in the folder are listed as `not-bound`; they are never consumed and never counted as passed.
  - A run without an approved Stage 3 of its own keeps the **folder-wide** rule. The gate says so with a `folder-fallback` check line.
- **The same binding is used everywhere a run reads its suites:**
  - the 4M/4A/5A entry gate's Stage 3 checks and requirement-conflict check;
  - `executableScope` (which now also records `suiteBinding`);
  - partial-scope `scopeIndex`;
  - `executionHistory.suiteIndex` (exposed as `identity.binding`);
  - the Safety Preflight's `scopeFacts`, which hashes the bound suites, their matrices and the run's own Stage 3 Markdown;
  - `traceGraph.buildTraceGraph`.
- **Matrix per suite (`resolveSuiteMatrix`).** Each suite is read with the `TraceabilityMatrix*.md` that a run's Stage 3 recorded with it, and the selected run's own record wins.
  - **Ambiguous:** several matrices with nothing to decide between them. No matrix is used, so dependencies are unknown rather than borrowed. This is reported as a `traceability-matrix-ambiguous` trace gap and a gate warning.
  - **Legacy:** `TraceabilityMatrix.md` is used only when it is the folder's only matrix.
  - Applies to `scopeApproval.buildScopeItems` (including `approve-scope`) and `traceGraph.rootGraph`.
  - Impact analysis still reads every suite in the folder, each with its own matrix.
- **Unchanged:** no approval, fingerprint, preflight, capability or contract check was relaxed.
- **Tests:** `__tests__/runBoundSuites.test.js` adds 11 tests, covering T1–T9, ambiguous matrices and legacy fallback. 8 of them fail on the previous code.

---

## 2026-10-11 — Test case design quality (Phases 1–3)

User-mandated, platform-wide (all test types, not one project). **Applies to new or materially changed
cases only — no existing suite was edited and no Review status was reset.**

- **Phase 1 — writing standard (`test-design-skill` §6, `TestCase_entry.md`).** Expected Result is a
  numbered list, one measurable point per line, tagged with its Assertion ID. Assertions: Expected is a
  value, not a description; Expected Source names a requirement, contract, `Test Data` or artifact
  (`Expected Result` still accepted); no redundant rows, never merged independent points; same check,
  same shape across sibling cases. One case per data set while execution records one result per
  `(Test Case ID, Assertion ID)` — the matrix-style allowance is withdrawn. Notes never carry
  traceability. A Steps / Test Data / Expected Result vocabulary table per test type (UI, API,
  Integration, Batch/queue, E2E). The orphaned §6.0 bullets were moved back under §6.0.
- **Phase 2 — Shared Definitions (`test-design-skill` §6.1b, `test_suite_export/sharedDefinitions.js`).**
  Optional `## Shared Definitions` section per suite: `SETUP-n` setup and `VR-n` validation rules
  (mandatory `**Source:**`, sub-checks `VR-n.m`), cited by ID from cases and from an optional Assertions
  `Rule` column. The cited text is attached to each citing case's parsed record (`sharedDefinitions`), so
  it is part of the material fingerprint — editing a rule re-opens review for exactly the citing cases.
  Exported as a second workbook sheet; sheet 1 and `--import-lifecycle` unchanged; a suite without the
  section exports byte-identically. `--check` warns on undefined/unused/source-less definitions.
  `api_contract` impact scans cited definitions for endpoint mentions. One line each in
  `manual-execution-skill` and `automation-skill`. Verified: all 8 existing suites (583 cases) parse with
  identical warnings and fingerprints.
- **Phase 3 — grounding checks, warnings only (`run_manager`).** `assertionContract.designGate` returns
  `advisories` for new or changed cases whose Expected Source is `Expected Result`; `state approve 3` /
  `approve-scope` print them as `advisory:` on stderr and never refuse for them. `state trace` gains the
  gap `assertion-requirement-not-traced` (an assertion's Requirement ID absent from the case's Matrix
  row). `scopeApproval.dependenciesFromTraceRow` adds a `covers` field that expands Matrix ranges
  (`SRCH-02…09`) for this check only — `dependsOn` reads exactly as before. On current data the check
  finds 5 real gaps in the Galileo Search suite (reported, not fixed) and none elsewhere.

---

## 2026-10-08 — Screenshots only for Findings and defects

User-mandated, to cut token consumption. Browser stages were capturing a screenshot per case and per
"key step" — `ancillaries-run-002` alone holds 77, almost all for Passed cases — and every one viewed
costs image tokens on each later turn of the session. New `pipeline.md` §11.4: a screenshot is taken
**only** as evidence for a Finding or a defect (Failed/Blocked/Inconclusive); a Passed case is evidenced
by its observed values quoted in text; screenshots are saved and cited by path, not opened back into
context unless a visual-only defect needs it. Applied in `manual-execution-skill` §7 (was "ideally also
on key steps"), `automation-execution-skill` §16 (on failure only), `explorer-skill` §5.15.1 (no per-screen
screenshots), `ndc_execution_rules.md` §A9, and `CLAUDE.md`. Evidence floors for real problems are
unchanged.

---

## 2026-10-08 — `reissue`, `ancillaries-airindia-run007`, and `SeatMap` merged into `platform-enhancments`

User-mandated. The three branches forked from the same commit and each minted run-006…run-011 on
their own. After merging them (SeatMap first, for its platform code):

- **Runs renamed** with `cli.js rename-runs` (approved by Ahmed Ayman): 6 Ancillaries runs →
  `ancillaries-run-001…006`, 3 Reissue runs → `reissue-run-001…003`, and the 3 AutoReissueCheckbox runs
  (no module recorded; owner assigned by a human) → `agency+branch-run-001…003`. References were
  rewritten, the affected HTML reports rebuilt from their models, and every old name still resolves
  through `.run_folder_index.json`. `run-001…005` and the unscoped `run-006…Ancillaries-AirIndia` stay as
  they are.
- **Ancillaries registry** carries all four Suppliers (flynas-ndc, air-sm-cairo, oman-air, air-india).
  `integrationLayer` set to `NDC-INT` (human decision) — so `ndc_execution_rules.md` §B, which fires only on
  `ndc-core-service`, does not apply to Ancillaries.
- **`FeatureChecklistProfile.md`** rev 3 merges the approved rev 2 with SeatMap's new rows, so it is back
  to Draft pending re-approval.
- **Active run pointer cleared** (human decision); the Supplier Feature pointer stays on
  `ancillaries`/`air-sm-cairo`.
- **Removed** the 389-file saved ADO taskboard page from the repo root.
- **Platform defect fixed** in `renameRuns.js`: `.jsonl` event logs were not rewritten, and a repeated
  rewrite pass could overwrite `renamedFrom` history. Both covered by tests.

---

## 2026-10-08 — Runs are numbered per Feature/module

User-mandated. Runs shared one global `run-NNN` counter, so the parallel `reissue`,
`ancillaries-airindia-run007`, and `SeatMap` branches each minted their own `run-006`…`run-011` and
collided on merge. A run's folder name now carries its owner and that owner's own counter:
`reissue-run-003`, `ancillaries-run-002`, `agency+branch-run-001`, `agency.bulk-export-run-001`. A run
with no recorded scope stays a bare `run-NNN`.

- `runFolderName.js` — `deriveRunOwner()` reads the owner from `run.json`'s scope fields (never the
  target text); `nextRunIndex()`/`formatRunIndex()`/`parseRunFolderName()` are owner-aware.
- `createRun.js` writes `runOwner`; new optional `moduleFeature` for classic Feature runs.
- `cli.js new` and the naming verb take `--feature/--supplier/--shared-scope` or
  `--modules/--module-feature`; `cli.js list` orders by start time, since indexes no longer compare
  across owners; refinement runs stay in their prior run's sequence.
- New `renameRuns.js` + `cli.js rename-runs` move existing runs onto the convention: plan by default,
  `--apply` needs `--approved-by` and `--reason`, rewrites references in the data root, moves the
  Active Run pointer, records `renamedFrom` in `run.json`, and keeps old names resolvable through
  `.run_folder_index.json`. Runs with no recorded scope are only renamed when a human assigns an owner.
- Spec: `run_manager.md` §5.1.1.

---

## 2026-09-27 — Supplier capabilities decide which test cases run

User-mandated. Suppliers differ in what they can do — flynas has no Hold and no Pay after Hold — so a
test case needing a capability the Supplier lacks is now **excluded before execution** instead of run
and failed. Six capabilities: `Hold`, `Pay after Hold`, `Meal`, `Baggage`, `Seat`, `Bundle`, each
`Supported` / `Not Supported` / `Unknown`, where **`Unknown` is treated as Not Supported** (nothing is
guessed).

- **Asked at intake**, one question per capability, plus which supplier credential the run uses
  (`new_us_intake.md` §12.2 steps 2–3; `ndc_execution_rules.md` §A2, new §A15). Never inferred from a
  Supplier's name, from another Supplier, or from what one flight's screen happens to show.
- **Recorded in `supplier.json`** via two new commands — `supplier-feature supplier capabilities` and
  `supplier rules` — which append to `capabilityHistory`; `SupplierChecklist.md` §2c mirrors them for a
  reader, and §7c gains a `Slug` column so rule-specific cases can be matched to a Supplier. Neither
  file is hand-edited. **`Pay after Hold` depends on `Hold`** — it acts on a held booking, so turning
  Hold off takes it down too (recorded, never silent), asking for both at once is refused, and intake
  skips the question entirely when Hold is not Supported.
- **Test cases declare what they need**: new `Requires` and `Supplier Rule` columns, appended after the
  lifecycle pair so no existing column moves (`test-design-skill` §6.1, new §6.2a). `Requires` takes
  `None`, a `+`-joined list, or a negation (`Not Hold`) for cases that test a Supplier *without* a
  capability.
- **New tool `platform_core/tools/capability_gate/`** computes the plan and writes
  `runs/<run>/metadata/CapabilityPlan.md` **before execution starts**, the same discipline as the
  Safety Preflight. It is the first of three gates (`manual-execution-skill` new §4.2): *can this
  Supplier do it* → *is this case approved* → *is this action allowed*. Excluded cases keep their row
  with reason `Not supported by supplier` and stay out of executable scope and pass rate.
- **Platform defect fixed**: `test_suite_export/readWorkbook.js` mis-parsed self-closing `<c/>` and
  `<row/>` elements, so a styled-but-empty cell took the next cell's value — silently shifting columns
  on any workbook written with blank formatted cells. Regression test added.

---

## 2026-09-03 — NDC Core Service runs gain an execution/governance rule set

User-mandated. Adds `workflows_and_pipelines/pipeline/ndc_execution_rules.md`, a rule set that
activates only when a run's `service === "ndc-core-service"` and never changes Agency/Branch/classic-module
behaviour. Covers inheritance, run-intake fields, QA-layer defaults, run-scope freeze, requirement
precedence, Discovery/Automation gates, evidence, test-data isolation, prior-run reuse, the
Source/Target environment model, and completion reporting for Supplier and Shared-scope runs.

`createRun.js` and `cli.js` now wire in `validateNdcRunScope()` enforcement so an NDC run must bind
to exactly one of `supplier` / `sharedScope` on `run.json` — never both, never neither — mechanically,
not just by convention. `CLAUDE.md` and the pipeline docs cross-reference the new file.

---

## 2026-09-02 — Generic Supplier Checklist + Feature Checklist Profile templates; Import Booked PNR instantiated

Adds the reusable NDC Core Service Supplier-intake artifacts: a Feature-agnostic
`SupplierChecklist.md` base template plus a `FeatureChecklistProfile.md` template that injects
Feature-specific rows into it at render time, so no Feature's business content is hardcoded into the
shared base. Populates Import Booked PNR's own `FeatureChecklistProfile.md` (sourced from the
approved shared `new-layer-contract` `ProjectContext.md` / `TraceabilityMatrix.md`, with verified
`HIST-xx` requirement IDs) and an `ExecutionFlow_HappyPath.md` capturing the Happy Path's operational
execution knowledge across the Source/Target environment model. The render flow is documented in
`new_us_intake.md` and `module_architecture.md`.

---

## 2026-09-02 — `NDC_Core_Service` hierarchy introduced; Import Booked PNR migrated

User-mandated. Introduces `NDC_Core_Service` as a new, explicit hierarchy layer —
`Service → Feature → Supplier | Shared scope` — sibling to, never a variant of, the existing
module/Feature registry. **A Supplier is never registered or addressed as a "feature"**, and its
registry (`platform_core_data/services/services.json`) is completely separate from `modules/modules.json`.

Adds run-scope validation so a run must bind to exactly one of `supplier` / `sharedScope` on `run.json`,
never both — the mechanism `createRun.js`'s `validateNdcRunScope()` later enforces mechanically
(2026-09-03, above). Migrates the existing `import-booked-pnr` `new-layer-contract` work (shared,
cross-supplier contract scope) into the new layout **with full history preserved via `git mv`**, and
marks the old module entry `Superseded` and unselectable rather than deleting it.

Full spec: `module_architecture.md` §11 and `new_us_intake.md` §12.

---

## 2026-09-01 — Import Booked PNR intake: `new-layer-contract` Feature (Stages 1-3)

Registers the `import-booked-pnr` module and `new-layer-contract` Feature for the `NDC_Core_service`
integration-contract investigation, `run-005`. Project Context deliberately separates the existing
Import Booked PNR **business** behaviour (historical documentation plus Meeting 1 slides) from the
genuinely **new** NDC_Core_service contract and the migration/regression coverage the NDC-INT swap
requires — the two are not the same investigation.

Test Design produces 61 API-contract and regression test cases classified by evidence level
(`Confirmed` / `Regression` / `Discovery` / `Blocked`), none executable yet pending a live endpoint.

Also removes the stray legacy credentials folder at `platform_core_data/credentials/`, superseded by
`knowledge_base/credentials/`.

---

## 2026-08-24 — Agency automation assembled, executed, and promoted into the Workspace Automation Baseline

The Agency module's SHAFT automation package is merged into the baseline (`6beee4f`, +23/~2/-0, 0
conflicts), verified byte-identical (63/63 files), compiled standalone, and live-run from the
baseline — 15/15 Passed, Headless — before the module working copy at
`modules/agency/automation/tests_SHAFT/` is permanently deleted. The baseline is now Agency's sole
source of truth, scoped by `.baseline_ownership.json` and run via `testng-agency.xml`.

Two operational notes carried into `automation_promotion.md`: `generate_allure_report.bat` and the
three `properties/default/*` files were excluded from the merge as machine-specific noise (SHAFT
Engine rewrites them with the running machine's own values on every execution); and retirement
completed via an unusual path after a Windows file lock (IntelliJ's JPS build daemon) blocked the
directory delete — the two remaining bookkeeping calls were made by invoking the tool's own functions
directly with the real, already-passing verification data, rather than skipped.

`testng.xml`, the whole-project regression suite, is updated to include Agency alongside Branch, and
renamed `BranchAutomationSuite` → `NDCAdminPortalAutomationSuite`.

**Stage 5A execution — 4 cycles, one divergence investigated and closed.** Cycle 1 (Headed): 14
Passed, `TC-AGENCY-002` `Inconclusive` — raw TestNG `Failed`, but evidence did not clearly separate a
locator issue from a genuine behaviour difference, so it was not confirmed as an Application or
Automation Failure. Cycles 2 (Headless), 3 (Headed, selective re-run), and 4 (Headed, full suite) all
ran 15/15 Passed, including `TC-AGENCY-002` three times running. Each cycle is its own file
(`ExecutionResults.md` + `.rerun-1/2/3.md`) per the run-immutability rule — none overwrites another.

**`TC-AGENCY-055` rejected; Stage 4A coverage figures corrected.** No `@Test` method was ever
generated for it despite it being counted among the 18 dual-approved cases and the "16 fully
automated" figure — discovered during this Stage 5A execution. Rejected by operator decision
(`Review` + `Automation`), and every Stage 4A artifact that cited the stale 18/16 figures now carries
a dated correction note rather than a silent number change.

---

## 2026-08-23 — CI and install-E2E brought back in line with the platform; Agency SHAFT suite repaired

Same pair of platform defects fixed in parallel on `tool-development-Project-agnostic-agentic-workflow`
and ported here, since both branches share `ci.yml` and both browser drivers:

- **CI trigger.** `ci.yml` still triggered on the retired `tool-development` name instead of
  `tool-development-Project-agnostic-agentic-workflow`.
- **`browser_provider/providers/playwright_node/{driver,session}.js`** had never actually been
  committed — left behind in a stash while `index.js` requiring them shipped, failing four tests with
  `MODULE_NOT_FOUND`. Restored, and their `playwright` import made lazy so requiring the module never
  throws on a machine without Playwright; a launch without it now fails with `PLAYWRIGHT_NOT_INSTALLED`
  naming what to install instead of at `require` time.
- **Install E2E** asserted "7 skills" while the platform ships 8 (why `ci.yml` had left `test:e2e`
  deliberately unwired). The skill set is now read from the repo under test and compared by name;
  `$WORK`/`$REPO` are made absolute; and both shell scripts resolve paths through an `abspath` helper
  that emits `pwd -W` on MSYS, so the clone route works from Git Bash too. `test:e2e` now runs in the
  `package` CI job, gated on `.toolonly` — it stays skipped on this branch, since packaging a data root
  holding a real PRD is exactly what `verifyPackable` refuses to do.

`npm test`: 943 tests, 0 failures on both fixes. `verifyBranchBoundary` passes.

Separately, the Agency SHAFT automation suite is repaired: Page classes split into dedicated Locator
classes, `PrimeNgHelper` and `JsonDataReader` added, stale test-data/fixture/provisioner helpers
removed, with the self-healing repair summary and run-004 Safety/Observability metadata synced
alongside it.

---

## 2026-08-20 — Agency run-004 artifacts synced; two Agency cases ruled

`run-004` (Agency, Automation branch) gains Discovery findings 008–012 with evidence, an updated test
design/coverage/traceability, its automation package, self-healing evidence and repair records, and
`SafetyAuthorizations`. Separately, `TC-AGENCY-020` and `TC-AGENCY-049` are marked `Rejected` by
operator ruling (2026-08-20): both are confirmed system behaviour, not defects. Markdown `Review`/
`Automation` status and the summary table are synced to the Excel edit; `Expected Result` text is left
unchanged.

---

## 2026-08-18 — Stages gain an Application Context to read and close

Stage 1 refreshes `modules/ApplicationContext.md` to `Draft` at run start and owns only the module
map, the dependency graph, and the application-wide posture — sections a later run established are
left as that run wrote them. Test Design and Automation read it as a secondary input, for the fixture
build order and upstream dependencies a single module's context cannot state; a dependency named
there becomes a **precondition**, never a new test target. The terminal stages — `4M` Manual Execution
and `6A` Reporting — append what the run proved about relationships between modules and set it to
`Pending Review`. **No stage ever approves it.** Recorded in `module_architecture.md` §6.7.

---

## 2026-08-17 — New User Story intake: routed as Feature or CRUD before anything is created

User-mandated. A supplied User Story previously became a module by whoever read it first, differently
each time, with no record of the choice. Adds the routing question (`CLAUDE.md`'s "New User Story
intake" section is this rule, restated for the assistant), the structure each answer produces, and
tooling that refuses to be bypassed.

**Routing.** New US → ask *standalone Feature or part of a module CRUD scope?*, never inferred from
the title. `Feature` → collect story + AC, confirm the parent module, sweep existing scope, propose
`modules/<m>/features/<f>/`, wait. `CRUD` → ask one story or several, identify which of
Add/Update/Search/Approve/Reject are included, collect each, propose **one** consolidated module,
wait. A capability supplied inside a CRUD package stays in the module and gets no Feature folder,
however feature-shaped it sounds — the test is *how it was supplied*. Ambiguity is asked about, never
resolved silently.

Enforcement is layered, because `CLAUDE.md` alone is advice a direct skill invocation skips:
`project-context-skill` §3.2 + Execution Rule 14 make answered routing a precondition of Stage 1, and
the tooling refuses mechanically.

**Standalone Features.** New `modules/<module>/features/<feature>/`, its own `feature.json`, its own
stages map. `features/` is created only when an approved Feature is scaffolded — a CRUD-only module
never grows an empty one, since an empty `features/` folder reads as "this module has Features."
Feature stages are independent; neither level rolls up into the other. `features[]` is an
**optional** registry key and `schemaVersion` stays `1` — an absent key means "no standalone
Features," exactly what every pre-existing registry already means, so nothing migrates.
`activeFeature` is nullable alongside `activeModules[]`; `use <module>` clears it and says so; **an
invalid or stale pointer throws and asks for correction rather than degrading to module scope**, which
would write Feature output into its parent's folders.

New verbs: `inspect-scope` (exit `2` = overlap candidates), `feature propose|approve|scaffold|list|
show|stage`, `use-feature`. Overlap is a candidate for a human to judge, never a verdict, and never
concluded from a story number alone.

**Tests.** +49 tests, all passing: 915 total, 911 pass (4 pre-existing, unrelated `browser_provider`
failures on a missing `playwright_node/driver.js`). Both routes covered end to end, including the two
negatives that matter: a CRUD capability must not create a Feature folder, and an invalid Feature
pointer must fail rather than fall back. Branch and Agency are untouched — no `features/` folder
exists anywhere, and no existing module or run was moved or normalized to match the new convention.

---

## 2026-08-17 — Discovery requires annotated evidence for unclear UI findings

An unclear item lands in `Observation` by default (Explorer Execution Rule 9), which had one of the
**lowest** evidence floors in the table — so the least-understood findings carried the weakest
evidence: a full-page screenshot of a 45-field form and a sentence saying something on it was
unclear, leaving the reviewer to guess which element. That guess is exactly what raising the finding
was meant to avoid.

Whenever Discovery raises an Open Question, records an ambiguous UI observation, cannot determine a
control's purpose, finds unclear wording/validation/status/icon/column/section behaviour, needs a
product-owner decision about a visual element, or records a mismatch it cannot yet classify, it must
now produce **both** the original screenshot **and** an annotated copy with a labelled high-contrast
rectangle around only the unclear element.

**Mechanism.** `browser_driver/api.js` gains `annotatedScreenshot(name, rects, opts)`, extending the
existing screenshot utility. A transient in-page overlay, not image post-processing — the package
keeps zero runtime dependencies, and the overlay gets exact element bounds for free. The pristine
original is written to disk **before** any node is injected, so a failure during annotation still
leaves usable evidence; cleanup runs in a `finally`, is idempotent, and swallows its own errors so it
can never mask the real failure. Rectangles are outline-only over a transparent fill so text/value/icon
stay readable; every node carries `pointer-events:none`; every rect must carry a label mapping to a
written question. MCP §1.4 gains one narrow, six-condition exception permitting this transient,
self-removing, view-only overlay — anything that writes to the application stays forbidden exactly as
before.

**Static Discovery modes** (no live page) cannot produce a precise rectangle and record the verbatim
`Annotated evidence not capturable — Discovery Mode: <mode>` instead, never a fabricated rectangle.

**Tests.** +28 tests, all passing: 943 total, 939 pass (same 4 pre-existing, unrelated failures).

---

## 2026-08-17 — Promotion becomes terminal: the Workspace Automation Baseline is the single source of truth

User-mandated. Until now a module's automation project was **durable** — it survived assembly and
stayed the place Stage 5A executed and 5H healed. It is now a **pre-promotion workspace**: on the
first successful promotion (merge, byte-identity proof, and a passing live run) it is **permanently
deleted**, and the Workspace Automation Baseline owns that module for the rest of its life.

Stated plainly, what that costs: module isolation was physical (separate directories) and is now
declared (an ownership manifest + scoped suites), and an in-place baseline edit has no three-way merge
protecting it.

**New tooling.** `automationRoot.js` — the one path resolver, `Draft` → module workspace, `Promoted`
→ baseline; throws `MODULE_DIR_RESURRECTED` if a retired directory reappears rather than quietly
preferring the baseline. `baselineOwnership.js` — `.baseline_ownership.json` + `classifyPath`:
`owned`/`shared`/`foreign`/`unowned`; `foreign` is a hard stop, so two modules can never claim the
same path. `promoteVerify.js` — re-reads both trees and compares SHA-256 per file, which is what
separates a promotion from a deletion.

**Changed.** `automationState.js` gains a fifth, terminal state `Promoted` (no transition out), plus
`sourceOfTruth`, `ownedPaths`, `promotionVerification`, `baselineUpdates[]`; `recordPromotion` demands
a passing verification, a prior assembly, owned paths, and an approver. `cleanup.js` gains
`retireModulePackage()`, deliberately separate from ordinary cleanup so a caller cannot reach "delete
the whole suite" via the argument shape that empties `target/`; both entry points now refuse anything
inside `automation_baseline/` outright. `baselineCopy.js` refuses to re-seed a `Promoted` module. New
CLI verbs: `resolve-root`, `verify-promotion`, `retire-module`, `check-retired`, `check-ownership`.

Also, user-mandated: Headed or Headless is confirmed with the human immediately before **every**
execution — reruns, verification, regression, self-healing, and post-promotion proofs included, never
inferred or carried over from the previous run. Propagated to Stages `5A`, `5H`, and `4M`.

**46 new unit tests, all passing.**

### The Branch module completes this lifecycle the same day

`platform_core_data/modules/branch/automation/tests_SHAFT/` is permanently deleted;
`automation_baseline/shaft/tests_SHAFT/` becomes its single source of truth after byte-identity (38
files, 0 differing), a clean standalone compile, and a live proof (31/31 Headed, BUILD SUCCESS). A
first post-promotion Headless run failed `TC-BR-045`/`TC-BR-055` on signatures already documented in
`BranchFailureAnalysis_2026-08-14.md`; an A/B on byte-identical trees, mode held constant, showed the
module copy failing both and the baseline passing both — the promotion is recorded as causing
nothing, and *why* identical bytes differed is deliberately left unasserted rather than guessed at.

A follow-up healing pass, the first against a Promoted module, fixes the Update Branch readiness wait
(`REPAIR-BR-013`): the wait was keyed on a label no longer reading `"loading..."`, but an *empty*
label already satisfies that, releasing before the dependent PrimeNG dropdown's fetch had even
started — an ordering defect, not a slow-load one. Fixed by waiting on the `p-placeholder` class per
field instead. Changed **when** the test reads, never **what** it asserts. A fresh Automation Approval
is recorded against the specific changed file, since Stage 4A's approval covered the suite as it was
before the repair. The generalizable technique is promoted as `REPAIR-014` into the shared Platform
Knowledge base, alongside `REPAIR-005` through `REPAIR-013` from the four Branch self-healing passes
between 2026-08-05 and 2026-08-15 — and `INDEX.md`, found listing only `REPAIR-001..004` against 13
files on disk, is corrected to list all fourteen.

Two small platform-hygiene fixes land alongside this: `BrowserSession.java`, left untracked since the
2026-08-05 Workspace Merge because `.git/info/exclude` ignored `platform_core_data/`, is committed;
and `baselineOwnership.js`'s `matchesPattern()` is changed from a raw-NUL-byte sentinel (which made
git classify the whole file as binary — no line diff, no blame — on a guard that exists specifically
to stop one module overwriting another's code) to a named, printable one with identical semantics.

### Also this day

- **`run-004` started** for US-4222 `[Admin] Update Agency` on the Automation branch, independent of
  `run-001`'s Manual-branch coverage of the same story. The requirement was re-verified against fresh
  acceptance criteria (no drift). `execution_safety_policy.json` now governs this run (created after
  2026-08-07), making `APPROVE`/`REJECT` on a shared Agency record `Forbidden` and pulling Create
  Agency into scope as the only means of testing them against a self-created record. Branch-module
  methodology is reused under a recorded boundary — no Branch test data, selectors, findings, or
  artifacts crossed over. Stage 1 approved by Ahmed Ayman the same day.
- **`ONBOARDING.md`** added — a zero-to-productive map of the repo: what the platform is, how it's
  laid out, the two pipelines and their stages, the governance rules that explain most design
  decisions, and where to go next.
- **Stage `5H` gains an external-evidence fallback** for a human who wrote and ran automation in their
  own IDE: it can now derive Result Classifications from the suite's own last three execution reports
  (Allure, TestNG/JUnit XML, Playwright) — never only the newest, since three runs are what
  distinguish a new break from an old one — labelled `Derived — {class}` and shown at the batch gate
  for human confirmation. Report-only evidence caps root-cause confidence at `Medium`; `High` still
  requires live reproduction. Repairs only failures whose placement git evidence and report evidence
  agree on; a disagreement is raised as `Ambiguous`, never resolved unilaterally. Never replaces
  Execution Results that already exist.

---

## 2026-08-15 — Branch module: BranchActions_TC recovered, full suite executed, nine repair patterns promoted

**Recovery and execution.** `BranchActions_TC` — declared in `testng.xml` for weeks with no class
behind it — is recovered from `origin/platform-testing`, its duplicated approval strings replaced with
the `ApprovalStatus` enum, and stale `"run-003"` remarks wording dropped. `SearchBranch_Page` gains a
remarks-capture flow that verifies the textarea actually holds the remark and requires the dialog to
close as proof of acceptance, rather than trusting a delivery event this screen reports even when it
does nothing. `BranchProvisioner` ports `REPAIR-BR-014`'s bounded re-search, so it can no longer read
row 1 of a filtered grid and hand back an unrelated record.

Two full-suite executions follow: rerun-27 (Headless, 28/28 Passed, first time Create/Search/Update ran
together end to end) and rerun-28 (operator-run, 24 Passed — `TC-BR-056`, the first approve-from-grid
test ever to execute in this module, passed; `TC-BR-057`/`TC-BR-058` were skipped, Not Executed, when
the login screen stopped rendering). A follow-up run (rerun-29, Headed) closes both: `TC-BR-057`
(reject from the grid) and `TC-BR-058` (approve + remarks capture) both Passed, bringing automation
coverage to 31 of 32 cases (96.9%). **The preflight caught a missing authorization** here: only
`CREATE`/`UPDATE`/`SUBMIT`/`APPROVE` were granted, none covering `REJECT` — `Automation = Approved`
made `TC-BR-057` an approved asset, but never authorized the business change it makes on a live
environment. `TC-BR-058` ran on existing grants; `TC-BR-057` waited for a new grant scoped to
self-created records, since rejecting a pre-existing branch (another team's record, same Staging grid)
stayed forbidden.

Two changes are flagged as **not repairs, needing review**: `TC-BR-026`'s assertion was loosened so it
can no longer fail, silently dropping coverage of the 11-digit rule (`FINDING-004`) it exists to guard;
and `TC-BR-052`'s test method was deleted while its javadoc was left orphaned above an unrelated
helper — the exact outcome an earlier healing pass had explicitly refused to produce by weakening the
test instead, since deleting it "records an open disagreement as settled." Neither appears in any
healing record; both are committed for reproducibility, not because they're agreed
(`Final_QA_Report` `DEF-REP-01`/`DEF-REP-02`).

A tooling hazard is recorded for future runs: SHAFT clears `allure-results/` at the start of every
run, so launching one test destroys a prior test's still-needed evidence unless it's copied out first.

**Nine repair patterns promoted** into the shared Platform Knowledge base (`REPAIR-005` through
`REPAIR-013`) from the four Branch self-healing passes between 2026-08-05 and 2026-08-15 — each
carrying its provenance and confidence stated honestly as "1 execution, 1 project," since these
generalise by technique, not by proven cross-project use.

---

## 2026-08-10 — Branch module artifacts carried forward after self-healing follow-up

Carries the branch module forward across the four stages touched by the 2026-08-09 self-healing pass:
a new `BranchActions_TC` suite; hardened `AddBranch`/`SearchBranch` page objects and `Branch_Common`;
Discovery gains `FINDING-016` (credit-terms cap conflicts with the warning-prompt spec) with refreshed
metadata on four related findings; Test Design extends `TestCases_Branch` and its coverage report; and
`PRD_UserStories` is reconciled with the new finding.

---

## 2026-08-09 — Branch module: five automation defects repaired via self-healing

`REPAIR-BR-009` through `REPAIR-BR-012`, all evidence-confirmed via timestamped instrumentation and
live DOM/API checks against Staging: `clickSearch()` resolved on a transient empty-state flash instead
of the real result set (debounced the check); pagination and row-action icon clicks silently failed to
register on this app's PrimeNG components (replicated the JS-dispatched-click pattern already proven
elsewhere in the module); `UpdateBranch_Page`'s City/State dropdowns populate on their own async
timeline independent of the field the page's readiness wait was keyed on (waited for them explicitly);
and `hasNextPage()` checked for a disabled state the paginator's Next button never carries, even on the
true last page (switched to comparing current vs. highest offered page number).

Confirmed via targeted reruns: `TC-BR-043`/`055`/`060`/`061`/`065` now pass. `TC-BR-054`'s remaining
failure is left open as a confirmed scan-bound question (51 real "Rejected" records verified via the
Branch search API), not a data gap or automation defect.

Full evidence: `platform_core_data/modules/branch/healing/RepairSummary.md` (Pass
`HEAL-BR-20260809-01`) and `BeforeAfterComparison.md`.

---

## 2026-08-07 — Repository split into `tool-development` and `platform-testing`

User-mandated. Two long-lived branches with **intentionally different tracked contents**, so developing the reusable Tool is cleanly separated from dogfooding it against real project data. Canonical documentation: [`docs/BRANCH_MODEL.md`](BRANCH_MODEL.md).

```text
Tool Development  =  Reusable Product
Platform Testing  =  Reusable Product + Dogfooding Environment + Project Data + Execution Evidence
```

| Branch | `platform_core_data` | Declares |
|---|---|---|
| `tool-development` | **zero tracked files** (hard invariant) | `.toolonly` |
| `platform-testing` | tracked, deliberately | `.platformdata` |

**This is tracked-tree separation, not a `.gitignore` trick.** 921 paths were untracked with `git rm --cached`, so nothing was deleted — the files stay on disk in a dual-purpose working copy and remain fully tracked on `platform-testing`. No versioned ignore rule was added: a branch-specific `.gitignore` would diverge between the branches, and if a `platform_core_data/` rule ever reached `platform-testing` it would silently ignore **new** data on the branch whose purpose is to track it. Local noise belongs in `.git/info/exclude`, which cannot merge anywhere.

**The one-time baseline merge.** `tool-development` was created from the current state by *deleting* `platform_core_data`, so a plain `git merge tool-development` into `platform-testing` would faithfully replay that deletion and wipe every run, module and piece of execution evidence. This was proven **before it could happen**, read-only:

```bash
git merge-tree --write-tree platform-testing tool-development
#   -> platform_core_data files in the resulting tree: 0
```

The fix is one deliberate merge that resolves the conflict by keeping `platform_core_data` and rejecting `.toolonly`. That merge commit records the decision once, becomes the merge base for every future promotion, and makes `git merge tool-development` routine and safe from then on.

**Guards, in both directions.** `scripts/verifyBranchBoundary.js` (`npm run verify:boundary`, also wired into `prepack`) fails on **contamination** (a Tool tree that gained project data) *and* on **data loss** (a Platform Testing tree that lost it). The second matters more, because it happens on the *normal* promotion path. Enforcement keys off committed declaration files, never branch names: a name check misses every `feature/*` branch cut from either side and disables itself on a detached HEAD. A tree carrying both declarations is a contradiction and fails.

**Normal workflow:**

```text
feature/*  ->  tool-development  ->  git merge into platform-testing  ->  real validation
```

Tool source flows down; project evidence never flows back. A Tool fix made while on `platform-testing` is promoted by cherry-picking the Tool-owned files — never by merging that branch backward.

**`Tool_latest_Update` is superseded** by this model. It was an earlier attempt at the same separation (*"strip run output and remove projects/ — tooling snapshot"*) but retains 66 tracked `platform_core_data` files, so it never reached the invariant and has no enforcement. It is **left untouched, not renamed and not deleted** — it holds one commit not in the current line. No existing branch was retired: `execution_round_1` and every `feature/*` are unchanged, and the tag `pre-branch-split-2026-08-07` marks the pre-split state.

---

## 2026-08-07 — Platform Knowledge relocated to `platform_core/knowledge/patterns/`

User-mandated (HD-BRANCH-002), as a prerequisite for separating the reusable Tool from the dogfooding data. **Moved via `git mv`, all 13 files with full history and provenance intact.** No pattern's content changed.

```text
platform_core_data/knowledge_base/patterns/   →   platform_core/knowledge/patterns/
```

**Why.** Platform Knowledge is reusable *product* — it ships with the tool, and `scripts/verifyPackable.js` requires it. `platform_core_data/` is project-owned data the tool must be distributable **without**. Keeping the reusable layer physically inside the data root made the two inseparable: the tool could not be packaged without shipping a directory whose entire purpose is to hold one project's data. The ownership rule is now structural rather than a convention: `platform_core/` is product, `platform_core_data/` is project.

**The two-layer Knowledge Architecture is unchanged.** Only the physical location of the reusable layer moved. `pipeline.md` §10.2 resolution order still puts Platform Knowledge first; the separation is simply no longer a rule an agent has to remember while walking `knowledge_base/`.

**A latent install bug is fixed as a side effect.** `init` copies `TOOL_PAYLOAD_DIRS = ['platform_core', 'workflows_and_pipelines']`, and `platform_core_data/knowledge_base/patterns/` was in neither — so the git-clone install route never copied Platform Knowledge at all. It now travels with `platform_core/`.

**Updated:** `package.json` `files[]` (the explicit entry is now redundant and was removed — `platform_core/` covers it), `scripts/verifyPackable.js`, `scripts/e2e/verify-install.sh`, `pipeline.md` §10 and its retarget note, `module_architecture.md`, `README.md`, `docs/USER_GUIDE.md`, `platform_core/README.md`, `platform_core_data/README.md`, and five Skill specifications.

**Deliberately not rewritten:** `docs/PROMPT_HISTORY.md`, `docs/BRANCH_COMPARISON.md`, the earlier entries in this file, and `modules/branch/healing/RepairSummary.md`. Each records where Platform Knowledge *was* at the time of writing, and the RepairSummary is immutable run evidence. Rewriting them would falsify the history they exist to hold.

---

## 2026-08-07 — Run Observability introduced

User-mandated, and deliberately **additive**: no pipeline stage was added, renumbered, or redesigned; no Skill was added or removed; `Review`, `Automation`, and Execution Safety semantics are untouched; no test outcome, artifact ownership rule, or run immutability rule changed. Observability is the fourth concern and the only one with no authority — it observes and decides nothing.

**The chain.** `Facts → Telemetry → Deterministic Metrics → Transparent Reporting`. Events are evidence, metrics are derived by a pure function, and the report and dashboard are renderings. No model interprets a duration, a count, or a ratio.

**Telemetry schema v1.** 24 event types, five span kinds (`RUN` → `STAGE` → `SKILL` → `TOOL`, plus `REPAIR`) with explicit parent-child links, UTC ISO-8601 timestamps, and IDs derived from sequence plus content hash rather than from timestamp uniqueness. Append-only JSONL, matching the platform's existing immutable-evidence convention.

**Run telemetry ownership.** `runs/{RUN}/metadata/observability/` — `ObservabilityEvents.jsonl` (evidence), `ObservabilityMetrics.json`, `ObservabilityReport.md`, `ObservabilityDashboard.html` (all derived and regenerable). Cross-run isolation is defended twice: placement inside the run folder, plus a `runId` on every event re-checked on load, so a copied stream contributes nothing.

**Instrumentation coverage.** Run, stage, skill, tool, validation, retry, human decision, artifact, test design, automation build, execution result (with `attempt` and `cycle`), repair, and Execution Safety outcomes. Safety metrics are **consumed** from existing Safety evidence, never re-evaluated.

**Provenance is preserved and never merged** (HD-OBS-001). `platform-tool` events are emitted by platform code and cannot be forgotten; `skill` events are emitted because a specification requires it, so their absence proves nothing. The two counts are reported separately everywhere. An opened span with no matching completion is `Incomplete` and receives **no duration**.

**CLI.** `observability record | summary | validate | metrics | report | dashboard | historical | compare`, plus a capability section in `agentic-testing doctor` that reports what the installation *could* measure and never a usage figure. Exit codes: `0` ok, `1` error, `2` under-instrumented.

**Reporting.** A per-run Markdown report with a Formula Registry, an explicit Unavailable Metrics section, and a stated Measurement Limitations section. A self-contained HTML dashboard renders the same metrics: no script tag, no external stylesheet, no font, no network request — charts are HTML/CSS bars and one inline SVG donut. Zero new dependencies. OpenTelemetry was evaluated and declined: it needs an SDK, an exporter, and a collector for a file-centric platform with no service to export to.

**Token and cost telemetry are `Unavailable`** (HD-OBS-002), with the reason recorded on every run. No supported run-attributable provider usage source exists; Claude Code session transcripts are deliberately not read, being session-scoped rather than run-scoped and not an official stable contract. Nothing is estimated from text length, and no pricing is hardcoded. The schema is shaped so a future official source populates tokens and cost without a redesign.

**`0` and `Unavailable` are different claims** and survive as different values into the JSON, the Markdown, and the HTML. Every unavailable metric carries the reason it could not be measured.

**Prospective only** (HD-OBS-003). Applies to runs created after 2026-08-07. `run-001`, `run-002`, and `run-003` report **Not Instrumented**; no event was fabricated for them and no artifact of theirs was touched. What their immutable artifacts genuinely prove is available separately as **Historical Derived Metrics**, bannered and never merged into instrumented metrics.

**Tests.** 166 new tests across schema, recorder, aggregator, formulas, missing-data semantics, historical derivation, dashboard, CLI, and an end-to-end instrumented fixture run — including cross-run contamination, secret sanitization at every output surface, deterministic rendering, and assertions that observability changes no `Review`, `Automation`, Safety, or test-outcome value it reads.

---

## 2026-08-07 — Execution Safety & Mutation Policy introduced

User-mandated. A new governance capability, deliberately **additive**: no pipeline stage was added, renumbered, or redesigned; no Skill was added or removed; `Review` and `Automation` semantics are untouched; no artifact ownership, approval semantics, or run immutability rule changed.

### The third governance concern

The platform already governed two things about a *test case*. This governs an *action*:

```text
Review            Is the Test Case accepted?              unchanged
Automation        Should it be automated?                 unchanged
Execution Safety  May this action execute here and now?   new
```

All three are independent. `Review = Approved AND Automation = Approved` authorizes **generation**, never **mutation** — a case can be correct, accepted, and worth automating while still containing an operation that must not run on the current environment. Equally, no safety decision can make an unreviewed case executable: safety runs *after* eligibility and only ever narrows it.

Governing principle throughout: **capability does not imply authorization.**

### Canonical decisions

```text
Allowed            execute
Approval Required  stop, ask a human, execute only within the approved scope
Forbidden          do not execute — and no run authorization changes that
```

These are **policy decisions, not test results**. A blocked operation is recorded with the *existing* execution taxonomy — `Skipped` / `Blocked`, reason `Execution Safety Policy`. **No new result status was introduced**, and a policy block is never an Application, Automation, Environment, Infrastructure, or Configuration Failure.

### Deterministic evaluator — `platform_core/tools/execution_safety/`

Reusable, project-agnostic, zero runtime dependencies, and holding **no project rule whatsoever**. Same input plus same policy version always yields the same decision; no model is consulted once an operation is structurally classified.

- **23 action classifications**, grouped into `read` · `mutation` · `approval` · `notification` · `booking` · `financial` · `privileged`. Deliberately not reduced to CRUD: `UPDATE Agency Name` and `PAYMENT` are both state-changing and must be governable differently, and `BOOK` / `CANCEL_BOOKING` / `VOID` are distinct business effects, never three flavours of `UPDATE`.
- **5 data-ownership classes** — `SelfCreated` · `DedicatedTestData` · `Shared` · `ProductionLike` · `Unknown`. **`Unknown` never becomes `SelfCreated`**, and an invariant test asserts no installed policy is ever more permissive on `Unknown` than on `SelfCreated`, for any action.
- **8 environments**, resolved from run configuration only — **never inferred from the URL**. A policy governs exactly one named environment and refuses to decide for any other.
- **Explainable by contract** — every decision returns `decision`, `matchedRule`, `reason`, `scope`, plus `absolute`, `cleanupRequired`, and any warnings. Never a bare boolean.
- **Precedence, documented and tested:** absolute prohibition → a prohibition is never overridden by a *vaguer* permission → narrowest scope → highest specificity → most restrictive on a tie. The second rule is what stops *"mutation is allowed in Agency"* from silently meaning *"deleting other people's Agency records is allowed in Agency"*.
- **Fail-safe on missing policy** — a mutating action with no rule resolves `Forbidden`; a read resolves `Approval Required`. `No rule found → Allowed` appears nowhere. A malformed policy throws with every problem listed and is never partially applied.

### Policy ownership

```text
platform_core/tools/execution_safety/                 the evaluator — no project rules
platform_core_data/knowledge_base/
    execution_safety_policy.json                      the project's policy (authoritative for evaluation)
    execution_safety_policy.md                        the same policy, explained, provenance per rule
platform_core_data/runs/{RUN}/metadata/
    SafetyAuthorizations.json / .md                   run-scoped approvals
    SafetyPreflight.md                                the mutation footprint, captured before execution
```

The initial project policy was built **only** from verified evidence plus explicitly flagged conservative defaults. Every rule carries a `source`, and a test fails the build if any rule lacks one. `run_configuration.md` now **references** the canonical policy rather than duplicating its rules, while remaining the authoritative record of the prose grants that predate the mechanism.

**No module or entity overrides are defined.** The evaluator supports both; no current project document establishes a per-module rule, and inventing one to look complete would be exactly the invented permission the policy must not contain.

### Run-scoped authorization

Class-scoped per `(environment, module, action, ownership)`, for **one run**. Twelve test cases sharing a scope cost one question, not twelve — while every executed action still records the exact record it touched, so the approval is class-wide and the audit trail is per-record.

**No authorization ever lifts a `Forbidden`**; it only satisfies an `Approval Required`, and one that tries is ignored and reported. **No run approval ever becomes project policy.** Cross-run leakage is prevented twice over — the store lives inside the run folder, *and* every record's `runId` is re-checked on load and again in the evaluator, so even a copied file authorizes nothing. Both mechanisms are tested.

No credential, token, session identifier, or card value is written into a policy, an authorization, a preflight, or run metadata; `createAuthorization()` drops any field outside its fixed schema.

### Stage integration

| Stage | Change |
|---|---|
| `4M` Manual Execution | New **§6.1** — the Execution Safety gate, distinct from §4.1's `Review` gate. Enforces **per operation**. Rules 4, 4a–4c added |
| `4A` Automation | New **§27A** — generation permission is not execution permission. **Its eligibility gate is unchanged.** A currently-unrunnable operation is disclosed in Known Limitations, never converted into a permanent coverage gap and never mislabelled `Manual Only`. Rules 36a–36c added |
| `5A` Automation Execution | New **§14A** — enforcement at **suite preflight and per test**, and explicitly **not** per operation, because the runner is an opaque external process with no interception point. Overclaiming this is now a named specification violation. Rules 6, 6a–6d added |
| `6A` Reporting | `Blocked by Execution Safety Policy` as its own category; safety metrics reported as facts about authorization, never as a quality score. Rules 4b–4d added |
| `browser_provider` / `browser_driver` | Documented as **actuators, never authorizers**. No business authorization rule may live there |

### CLI and diagnostics

`agentic-testing doctor` gained an **Execution Safety** section — environment, policy state, schema validity, version, hash, and the standing decisions. A missing policy is *reported*, not treated as an error, and never described as "safe".

A read-only tool CLI provides `evaluate`, `validate`, `summary`, and `preflight`, with exit codes that let a caller branch on the decision without parsing prose: `0` Allowed/valid · `1` error · `2` Approval Required · `3` Forbidden. Every subcommand is read-only; only `preflight --out` writes, and only that run's own preflight record.

### Prospective only

The mechanism takes effect **2026-08-07** and governs runs created on or after that date. `run-001`, `run-002`, and `run-003` executed under the prose grants in `run_configuration.md`, were never evaluated by it, and **no artifact of theirs was rewritten** to suggest otherwise.

### Tests

**+104 tests, all passing** — `evaluator` (42), `cli` (15), `preflight` (14), `authorizations` (11), `installedPolicy` (11), `integration` (11). Covering the full action × ownership matrix, environment/module/entity overrides, precedence and conflicting rules, schema errors, unknown action/ownership/environment, missing policy, run-scoped approval, cross-run leakage, determinism, explanation shape, secret exclusion, and the composition of all three gates. `installedPolicy` asserts **invariants** rather than expected values, so no project permission is hardcoded into `platform_core/`.

---

## 2026-08-07 — `Review` and `Automation` governance formalized platform-wide

User-mandated. **No new field, no new gate, no behavioural change to either gate** — this pass makes the two existing decision fields' meaning, ownership, defaults, consumers, derived eligibility, and section naming identical everywhere, and adds detection for the one contradictory state the model admits.

### The canonical model, restated once

The platform has exactly **two** authoritative test case decision fields, and they answer different questions:

| Field | Question | Values | Default | Owner |
|---|---|---|---|---|
| **`Review`** | Has this test case been reviewed and accepted? | `Pending` · `Approved` · `Rejected` | `Pending` | **Human only** |
| **`Automation`** | Should this accepted case be automated? | `Pending` · `Approved` · `Rejected` | `Pending` | **Human only** |

They are **never merged into one lifecycle status**, and `Review = Approved` with `Automation = Rejected` is a legitimate, common state — an accepted case that stays manual on purpose, which is *not* an automation coverage gap. The gates are unchanged: Stage `4M` reads `Review` alone; Stage `4A` requires `Review = Approved AND Automation = Approved`.

### Eligibility is derived, never stored

Added `isManualEligible()`, `isAutomationEligible()`, and `lifecycleInconsistency()` to `parseTestCases.js`, so every consumer derives the same answer from the same place rather than re-implementing the rule. **No third field records the consequence** — a persisted `Automation Eligible` / `Ready for Automation` / `Lifecycle Status` would be a second source of truth that can disagree with the pair it came from, which is the cost the retired `AutomationCandidate` tag already demonstrated.

### New: contradictory pairs are detected, reported, and never reconciled

`Automation = Approved` with `Review ≠ Approved` is contradictory — two human decisions that disagree. Both the export path (`parseTestCases`, `--check` exits `2`) and the import path (`importLifecycle`, including a contradiction formed by combining a workbook value with one already in the Markdown) now emit an `INCONSISTENT lifecycle` warning.

**Neither value is ever auto-corrected.** Resetting `Automation` would destroy one reviewer's recorded intent; promoting `Review` would manufacture an approval nobody gave — the single thing the review gate exists to prevent. The `4A` gate already excludes such a case on its own, so reporting is sufficient; resolution is a Human Decision (`test-design-skill` §6.3.4, new).

**One live instance found and left untouched for human resolution:** `TC-AGENCY-019` (`Review: Rejected`, `Automation: Approved`), now disclosed in that module's Coverage Report.

### Canonical section naming — `Review & Automation`

A section covering **both** fields is titled **`Review & Automation`**. `Automation Candidates` (retired advisory list), `Automation Status` (only one field), and `Lifecycle Status` (implies one combined state) are all dropped as umbrella headings. Where a section genuinely covers one field, `Review` or `Automation` may stand alone. Applied to `test-design-skill` §18 #11, the Coverage Report template, and both live Coverage Reports.

### AutomationCandidate — confirmed fully retired

Repository-wide search found **no producer, no consumer, and no live test case carrying it**; the exporter, parser, and reporting logic never referenced it. The remaining mentions are either explicit "this is retired" statements or historical records, both correct as written. Five stale references that still described the advisory hint as *current* were repointed (`manual-execution-skill` ×2, two Stage `4A` templates, one live Coverage Report). No unrelated tag (`Atomic`, `Scenario`, `E2E`, `Regression`, `Smoke`, `Negative`, `Boundary`, `Blocked`, `Deferred`) was touched.

### Reporting — three concepts kept apart

`reporting-skill` now states explicitly that the **Review decision**, the **Automation selection decision**, and the **automation execution result** are three separate facts. `Automation = Approved` means *selected for automation*, never *passed*: `Review = Approved` + `Automation = Approved` + `Execution Result = Failed` is valid and important. Cases at `Automation = Rejected` are reported as deliberately manual, never as a coverage shortfall.

### Live artifacts

No migration was needed — all 134 cases across both suites already carried both fields with explicit human decisions. **No approval or rejection decision was inferred for any case.** The branch module's Coverage Report roll-up was stale (it described 39 cases all `Pending`; the suite is 81 cases with review complete) and was **recomputed from the authoritative Markdown** — a derived count, not a decision.

### Tests

Added a full decision-matrix suite: all nine `Review` × `Automation` combinations asserted for both manual and automation eligibility, plus `Automation` never influencing manual scope, `Automation = Approved` never bypassing `Review`, verbatim preservation of inconsistent pairs, and three import-path inconsistency cases.

---

## 2026-08-01 — `Review` gates BOTH branches, and lifecycle decisions can be made in Excel

User-mandated, in two parts that arrived together and belong together.

### Part 1 — Stage `4M` now gates on `Review = Approved`

The lifecycle columns were introduced earlier the same day with `Review` gating automation only; `manual-execution-skill` said explicitly that Stage `4M` did not consume them. The reviewer's objection settles it: *some of the test cases are wrong and I am still reviewing them.* Executing those spends a real tester's time and, on a shared environment, real data — and when one fails, the result cannot distinguish **the application is wrong** from **the test case is wrong**, which is the only thing an execution result exists to establish. `Review = Approved` is precisely the statement "if this fails, the application is at fault."

| Branch | Gate |
|---|---|
| Stage `4M` — Manual Execution | `Review = Approved` |
| Stage `4A` — Automation | `Review = Approved` **AND** `Automation = Approved` |

- **`Automation` is still never read by `4M`.** `Automation = Rejected` is the *reason* a case must be exercised by hand, not a reason to skip it. Letting an automation decision narrow manual coverage would be exactly backwards.
- **New seventh Result Classification: `Excluded`** (`manual-execution-skill` §8), reason mandatory and exactly one of `Pending Review` / `Rejected at Review`. It is deliberately **not** `Skipped`: `Skipped` was authorized and this stage chose not to run it; `Excluded` was never in the executable set. Collapsing them makes *how much of the approved suite did we finish?* uncomputable, because the denominator would mix "you told me not to" with "I decided not to."
- **Two denominators, always reported separately** — `Executable scope` (`Review = Approved`), which the pass rate is computed against, and `Suite total`. This is the whole point of the status: without it a run reads "3 of 3 passed" while 48 cases went unexamined. New **Authorized Coverage** metric = executable scope ÷ suite total.
- **Zero approved cases is a halt**, not a run reporting "0 executed, 0 failures" — at a glance that is indistinguishable from a clean run.
- **The gate does not replace the Stage 3 checkpoint.** They act at different grains: the artifact's `status:` header answers "may this suite be used at all?", `Review` answers "is *this case* correct?"

### Part 2 — `cli.js --import-lifecycle`: decisions may be recorded in the workbook

A reviewer marks 52 rows in the spreadsheet, because that is where reviewing happens. Before this, that had two outcomes and both were bad: the next export **silently discarded** the decisions (the exact failure §9.1 exists to prevent, aimed at the reviewer instead of the author), or the reviewer was told to hand-edit 52 Markdown blocks and the review effectively did not happen. So the direction of derivation is preserved and made explicit rather than relaxed:

```
content    Markdown ──► Excel      (export — every column)
decisions  Markdown ◄── Excel      (import — Review and Automation ONLY)
```

- **Narrow on purpose.** A `Title`, `Steps`, or `Expected Result` edited in the workbook is **not** imported and is still discarded on the next export — those are derived content, and editing them there is the mistake §9.1 prevents. A lifecycle decision is not derived content, which is what makes it the sole exception.
- **New `readWorkbook.js`** — a dependency-free `.xlsx` reader (`platform_core/` must run on a clean install). It handles both what we write (STORED entries, `t="inlineStr"`) and what a spreadsheet application writes after a human saves (DEFLATE, `xl/sharedStrings.xml`, `t="s"`, **empty cells omitted entirely**). Cell references are honoured rather than assuming dense ordered cells — a positional read would slide `Review` into `Notes` the moment a reviewer left one cell blank, silently and with plausible values.
- **Safe by construction:** an unrecognised value warns and changes nothing rather than being coerced; casing is normalised; a workbook row with no matching Markdown case warns rather than inventing a test case; a workbook **older** than its Markdown is flagged, since the review may predate the current case text; and the document is preserved line-for-line, so the diff shows only the decisions that moved. Re-rendering parsed cases instead would have reformatted the reviewer's whole document — turning a two-value change into an unreviewable diff.
- **Disagreement is a halt, not a guess.** While the workbook holds decisions the Markdown does not, Stage `4M` stops and recommends the import (`manual-execution-skill` §18) — guessing which file the reviewer meant is how a rejected case gets executed.

### Part 3 — the Case Index is derived, and a rewrite resets `Review`

Two consequences surfaced immediately once real decisions existed, and both were contradictions rather than gaps.

**`cli.js --sync-index`.** The suite document opens with a Case Index repeating each case's Title, Tier, Priority, Tags, Review, and Automation — a *second* record of what the case bodies already state. It drifted within minutes: the reviewer's decisions and a rewritten title were in the bodies while the index still showed the superseded values, so the document disagreed with itself about which cases were approved. Same argument as §9.1, one level down — the case body is authoritative, the index is rendered from it, and so are `Total Test Cases`, `Tier breakdown`, and the lifecycle roll-up. It runs automatically after `--import-lifecycle`, since an import leaving the index stale would recreate the contradiction it removes. An index row whose case body no longer exists is **warned about, not deleted** — deleting it could silently drop a case someone meant to restore.

**A material rewrite resets `Review` to `Pending`** (`test-design-skill` §6.3.1) — mandatory, in both directions, and the only lifecycle transition a skill may ever perform:

```
Approved  ──rewrite──►  Pending          (mandatory)
Rejected  ──rewrite──►  Pending          (mandatory)
anything  ──────────►  Approved          NEVER, under any circumstance
```

Every permitted move goes *toward* `Pending`: it only ever **removes** authorization, never grants it, which is what makes it safe to automate. Without it the column means two contradictory things — leaving `Approved` on a rewritten case launders a human's acceptance of *superseded text* onto text they never read (and both branches would then execute it), while leaving `Rejected` on a case rewritten *in response to that rejection* makes the gate a one-way trapdoor where fixing a case cannot unblock it. This mirrors the artifact-level rejection flow (`pipeline.md` §5 step 4) at test-case granularity. The prior verdict must be recorded in Notes and reported per case.

**Files changed:** `manual-execution-skill/SKILL.md` (new §4.1, §8's seventh status, §9.2, §12 rules 6/21–24, §18's two new Stop Conditions, §20.1, §21) · `test-design-skill/SKILL.md` (§6.3.1 rewrite transition, §6.3.2 rewritten, §6.2, §18 #11) · `pipeline.md` (§4 Stage 3 bullet, Stage `4M` scope rule) · `templates/stage_3_test_design/TestCase_entry.md` · all three `templates/stage_4m_manual_execution/` report templates · `tools/test_suite_export/{cli.js,README.md}` + new `readWorkbook.js`, `importLifecycle.js`, `syncCaseIndex.js` · `docs/USER_GUIDE.md`.

**Verified:** `test_suite_export` **74/74 pass** — 26 new. The reader is covered against both ZIP encodings and both string encodings plus the omitted-empty-cell column shift; the import against the narrow contract (an Excel-edited Title must *not* come back), line-for-line preservation, field insertion when absent, and the invalid-value and stale-workbook warnings; the index sync against body-wins precedence, tier derivation, recomputed totals, pipe escaping, and the missing-body warning. Round-trip confirmed live on the Agency suite: real decisions imported, index re-rendered, re-exported, and a second `--check` reported **0 changes**.

---

## 2026-08-01 — The Test Suite exporter's default target is the module, not the run (DREC-T04)

Platform defect, found while regenerating the Agency workbook. The 2026-07-29 module-workspace migration moved Stage 3's output from `runs/{run}/test_design/` to `modules/{module}/test_design/`, but `tools/test_suite_export/cli.js` still resolved the **active run**. The documented normal call — no arguments — therefore could not find any module suite, and every export needed an explicit `--dir`. Worse than inconvenient: on a project that still had a pre-migration run folder, the default would silently render a *stale* copy while the current suite sat unexported.

**Why the module is the right default, not just the other path.** The suite is **durable and owned by its module** — refined in place across runs, at a rising revision (`module_architecture.md` §10.5). A run only records which revision it executed. Resolution now follows what the artifact *is* rather than where some run happened to sit.

Precedence, highest first — `--dir` (literal) → `--run` (historic) → `--module` (named) → the Active Module pointer:

| | Resolves to | Missing suite is |
|---|---|---|
| `--dir <path>` | that literal folder | an error |
| `--run <run-folder>` | `runs/{run}/test_design/` — **retained for historic layouts only**, never the default | an error that names the module path instead |
| `--module <slug>` | `modules/{slug}/test_design/` — slug, display name, or unambiguous prefix | an error listing what is registered |
| *(default)* | `modules/{slug}/test_design/` for **every** active module | **skipped**, per module |

- **Neither pointer is guessed.** Modules come from the Active Module pointer via `module_manager` (`module_architecture.md` §6.5 #1), runs from the Active Run pointer via `run_manager`. With nothing active the tool reports how to set it rather than falling back to "the only module" or "the newest" — the fallback that scatters one module's artifacts across unrelated folders.
- **A multi-module selection exports one workbook per module, never a merged one**, and a module that has not reached Stage 3 is *skipped and reported* rather than aborting its siblings. That asymmetry is deliberate: under a `multi` or `full-project` pointer (§9.1) an empty module is an expected state, while a human naming one target that isn't there is an error.
- **The reported source is the resolved selection, not the registry's recorded scope** — an `AGENTIC_TESTING_MODULE` override changes what this process exports without touching the file, so the stored scope can disagree with what actually ran.

**Files changed:** `tools/test_suite_export/{cli.js,README.md}` · new `__tests__/cli.test.js` · `test-design-skill/SKILL.md` §9.1 · `docs/USER_GUIDE.md`.

**Verified:** `test_suite_export` **48/48 pass** (8 new tests pinning the default to the module, the multi-module fan-out, `--module` prefix resolution, both "ask, don't guess" errors, and `--run`'s retained historic behaviour). The Agency workbook was regenerated by the plain no-argument call: `active module: agency`, 52 cases, exit 0.

---

## 2026-08-01 — Test Case lifecycle: the Review and Automation columns

User-mandated. The Manual Test Suite recorded what to test but not **what a human had decided about each case** — whether it had been reviewed, and whether it should be automated. Automation intent existed only as an advisory `AutomationCandidate` tag plus a Coverage Report list, neither binding, and both able to disagree with whatever Stage `4A` concluded. Two columns replace that.

**Additive, not a replacement.** Columns A–J of the workbook are unchanged in content, name, and order. The two new columns are appended as K and L, because they record decisions made *after* a case is written.

| Column | Records | Values | Default |
|---|---|---|---|
| **Review** | Human review status of the case after Stage 3 | `Pending` · `Approved` · `Rejected` | `Pending` |
| **Automation** | Whether the approved case should be automated | `Pending` · `Approved` · `Rejected` | `Pending` |

**The two rules that carry the weight:**

1. **No skill may change `Review`.** Stage 3 always writes `Pending`; only a human reviewer, or a review process a human explicitly requested, may advance it. A skill that advanced its own review status would have reviewed its own work — the same reasoning that forbids a stage inferring its own checkpoint approval (`pipeline.md` §5.3, §6 Rule 6), applied per test case.
2. **Stage `4A` gates on both:** `Review = Approved AND Automation = Approved`. Every other combination is out of scope — including `Review: Pending` with `Automation: Approved`, which is not a shortcut, because automating an unreviewed case encodes an unaccepted expectation into executable code. `Automation: Rejected` means the case stays manual by decision and is **never** reported as an automation coverage gap.

**Absence vs. an undefined value — a deliberate asymmetry.** An omitted field exports as `Pending` silently, since "no decision yet" is exactly what absence already means and warning on it would fire against every pre-existing suite. An *unrecognised* value (`Review: Maybe`) exports as written **and warns**, because someone recorded a decision the lifecycle does not define. Casing is normalised. Neither column is a `REQUIRED_FIELD`: an unreviewed case is not an unexecutable one.

**Retired:** the advisory `AutomationCandidate` tag and the Coverage Report's Automation Candidates section. §18 #11 becomes **Automation Status** — a roll-up of the binding column rather than a separate recommendation. The engineering judgment behind the old candidate list is preserved as *guidance for the reviewer setting the column*, not as a decision.

**Not changed, deliberately:** traceability. Requirement/Discovery/Finding/Evidence references, Risk, and Category stay in `TraceabilityMatrix.md` keyed by Test Case ID (§6.2). A `Related Requirements` column was considered and rejected — it would duplicate the Matrix into the sheet and give the suite a second copy to drift. The lifecycle columns are workflow *state*, not traceability, which is why they belong on the sheet and a requirements column does not.

**Files changed:** `test-design-skill/SKILL.md` (§6.1 field list, new §6.3, §9.1, §18 #11, Execution Rule 25) · `automation-skill/SKILL.md` (the gate) · `pipeline.md` (§4 Stage 3 and Stage `4A` scope rules) · `templates/stage_3_test_design/{TestCase_entry,TestCases_Module}.md` · `tools/test_suite_export/{parseTestCases.js,README.md}` and its three test files · `docs/USER_GUIDE.md`.

**Verified:** `test_suite_export` **40/40 pass** (4 new tests covering defaulting, casing normalisation, the invalid-value warning, and non-requiredness). Repo-wide sweep confirms zero live `AutomationCandidate` references outside this changelog and the deliberate "why it was retired" notes. The one live suite (`modules/agency`, 52 cases) was migrated: both columns added to every case at `Pending`, the retired tag removed from all 46 occurrences, and the workbook regenerated — 12 columns confirmed present with values populated.

*(The 4 failing tests in `platform_core/tools/browser_provider` are pre-existing and unrelated: that tool is untracked, never committed, and its `providers/playwright_node/driver.js` does not exist.)*

---

## 2026-07-29 — Two pipelines: the Manual and Automation branches diverge after Stage 3, and Self-Healing becomes its own stage

User-mandated restructure. The platform was a single 7-stage chain in which Manual Execution (Stage 4) produced an Automation Candidate Package that determined Stage 5's scope — so no automation could be generated until a full manual pass had run and been approved. That coupling is removed. The platform now defines **two independent pipelines** sharing Stages 1–3, and the repair engine moves out of the execution stage into a new, optional stage of its own.

**The new shape** (`pipeline.md` §3):

| Pipeline | Stages | Delivers | Scripts? |
|---|---|---|---|
| **Manual Execution** | 1 → 2 → 3 → `4M` | Results, defect records, Test Results CSV, Manual QA Report, evidence | **never** |
| **Automation** | 1 → 2 → 3 → `4A` → `5A` → *(optional)* `5H` → `6A` | Suite, execution results, repairs, Final QA Report | yes |

Old Stage 5→7 map to `4A`, `5A`, `6A`; Manual Execution becomes `4M`; `5H` is new. Historical run folders keep their original numbering and are never retroactively edited.

- **Branch isolation is the load-bearing rule** (§3.3). Neither branch reads any artifact the other produces, and either may run alone, in either order, or both. **The Automation Candidate Package is deleted from the platform** — template, qualifying-criteria engine (`manual-execution-skill` §9), and every reference — because with the dependency gone it had no reader. Stage `4A` now takes both scope *and* content directly from the approved Stage 3 Manual Test Suite.
- **Why the coupling was removed, and what replaced the guarantee it bought.** Requiring a manual pass first made automation the slowest possible deliverable and serialized two activities that are naturally parallel. The guarantee — "never automate a test that hasn't been proven to hold" — is now provided more directly by Stage `4A`'s own **live selector/DOM verification** (`automation-skill` §11A): every locator is confirmed to resolve against the running application, headless, at generation time. That is *stronger* evidence than a human's earlier pass on a possibly different build, because it verifies against the build the suite will actually run on. Stated plainly in §3.3: what is genuinely lost is the human judgment that a case is *worth* automating, which now happens at the `4A` approval gate reviewing a proposed suite rather than by pre-filtering its input.
- **Stage `4M` became a terminal, self-reporting stage.** It no longer hands off to anything: it produces `ManualExecutionResults.md`, a machine-readable **`ManualTestResults.csv`**, and a stakeholder-facing **`ManualQAReport.md`** — three renderings of one result set, required to agree on every test case's status (the failure mode in practice is a status corrected in the Results without regenerating the CSV). It drives the browser **headed** and **never produces a script of any kind**. A Manual-only run has no Final QA Report, and that is correct rather than a gap.
- **Discovery is now explicitly selector-free** (`pipeline.md` §3.5, `explorer-skill` §5.15). Stage 2 captures behavioural findings, not a locator catalogue — the rule is about *purpose*, not tooling, since a DOM snapshot backing a specific Finding is still legitimate evidence while a per-screen DOM dump for later automation reuse is not. Three reasons, in order: **correctness** (a selector captured at Discovery time and used at generation time was verified against an older build — verifying at generation reduces that window to zero), **performance** (Discovery is the broadest sweep the platform makes, and most runs never use the data), and **clean artifacts** (its reviewer reads Findings, not DOM).
- **Added `.claude/skills/self-healing-skill/SKILL.md` (Stage `5H`) — optional and opt-in only.** It absorbs the Automation Repair Loop, Repair Strategy Decision Engine, Repair Confidence Engine, and Repair Knowledge Base, previously §25–§28 of `automation-execution-skill`. There is now exactly one repair engine in the platform, so no boundary needs policing between a "tactical" and a "strategic" repairer. **It never runs automatically** (§3.6): no failing execution triggers it, and no orchestrator may chain into it — a human invokes it, optionally scoped to named modules (`/self-healing-skill Login, Agency`).
- **The prohibition that defines it:** an `Application Failure` is **never** healed (`self-healing-skill` §8). Weakening an assertion, widening an expected value, removing a check, or adding a conditional skip so a genuinely failing behaviour passes is never a valid repair — repairs change *how a test interacts* with the application (locators, waits, setup, navigation), never *what it asserts to be correct*. A failure discovered mid-pass to be an application defect stops work on that test, is reclassified, and is reported — even inside an already-approved batch. This is the one failure mode that would turn a defect-detection system into a defect-concealment system.
- **New gate: Batch Repair Approval** (`pipeline.md` §5.6), the third gate type. It exists because `5H` is the only stage that modifies code a human already approved, and it is asked **once per healing pass, never per test case** — per-case prompting reliably trains a reviewer to approve without reading. Diagnosis (evidence gathering, no code change) needs no gate; repair does. Below **High** root-cause confidence the only permitted action is diagnosis, so a repair is never attempted on a guess. A repaired suite requires a *fresh* Automation Approval before it re-merges: `4A`'s approval covered the code as it was then.
- **Bounded rather than open-ended.** `5H` **quarantines** a test that has been repaired and failed again past the attempt limit (default: the 3rd failure) rather than patching it a third time — with its full attempt history, referred to a human, still in the suite and still reported. Flakiness is diagnosed to root cause, never smoothed: adding a retry so a race loses less often leaves the defect in place and removes the signal that it exists. Confirmed repairs only are written to the KB — a plausible repair that did not work is not knowledge.
- **Stage `5A` reverted to a pure mechanical runner.** It classifies by cause, captures evidence, and reports **Application / Automation / Environment Health as three separate figures** — never one merged "Failed" count. That separation is what makes healing safe, since only `Automation Failure` is ever eligible; a misclassified `Application Failure` is therefore the most consequential error the stage can make, and `Inconclusive` is the correct answer when the evidence does not distinguish the two. It never modifies automation code for any reason.
- **Two shared knowledge bases, read by both branches** (`pipeline.md` §10.8) — the only thing the pipelines share beyond Stages 1–3. The **Selector Verification KB** (`browser/screens/`, `.../components/`; sole writer `4A`) holds confirmed locators with their fallback chains and **code-state anchors**, so a later run reuses a locator only when drift shows the anchor still valid, and re-verifies otherwise. The **Repair KB** (`patterns/repair_patterns/` etc.; sole writer `5H`) holds confirmed failure→fix patterns. Both are **mandatory reads before generation**, so a known failure mode is pre-empted in the first draft rather than rediscovered by failing in `5A` and repaired in `5H`. Sharing them does not violate branch isolation: isolation forbids consuming the other branch's *deliverables*, and a knowledge base is accumulated engineering knowledge, not a deliverable.
- **Stage `4A` gained three reasoning capabilities and a budget.** §11A live selector/DOM verification (headless, with `Unverified` disclosed and downgraded to `Partially Automatable`/`Manual Only` rather than emitting a guess); §11B mandatory KB consultation before generating; §11C automatic brownfield/greenfield detection where **nothing is prompted that can be detected**, with the write decision approved once as a **Target Write Plan** at the existing §5.2 gate; and §15A a **bounded self-review loop** (default 3 iterations, a time budget, early exit on convergence, an oscillation guard) that **discloses every unsatisfied check** — a silently truncated review reads to a reviewer as a clean one.
- **Templates:** renamed `stage_4_manual_execution`→`stage_4m_manual_execution`, `stage_5_automation`→`stage_4a_automation`, `stage_6_execution`→`stage_5a_execution`, `stage_7_reporting`→`stage_6a_reporting`; **deleted** `AutomationCandidatePackage.md`; **added** `stage_4m_manual_execution/ManualQAReport.md` and `stage_5h_self_healing/{RepairSummary,RepairConfidenceReport,BeforeAfterComparison,QuarantineRegister}.md`. `ManualTestResults.csv` deliberately has no template — its schema is fixed by `manual-execution-skill` §9.2, since a generated artifact gets no template (templates/README convention #7).
- **Run folders:** added `self_healing/`, created only when a human actually invokes `5H`. Which folders exist now records **which branch a run took** (`run_manager.md` §6): an absent `automation/` means the run delivered the Manual pipeline in full, not that four stages were skipped (§6 Rule 3a). `activeRun.js`'s `STAGE_FOLDERS` updated to match.
- **Registered** `self-healing-skill` in `platform_core/tools/init/plan.js` (so `init` installs eight skills) and in `pathConvention.test.js`'s `SKILL_NAMES`, so the new skill is held to the same no-hardcoded-target-path guarantees as the other seven. That test immediately caught a literal `tests/e2e/` in the §11C.4 Write Plan example, which is now placeholder-based — the layout is detected, never assumed.
- **Verified:** `npm test` passes **394/394**. All 318 relative markdown links resolve (the two remaining reported breaks are pre-existing: a `{{ARTIFACT_PATH}}` placeholder token and a historical CHANGELOG link). A repo-wide sweep confirms zero `AutomationCandidatePackage` references outside this changelog and the deliberate "why it was removed" notes, and consistent branch-suffixed stage numbering across every skill, template, workflow, and README. Historical records (`LESSONS_LEARNED`, `PROMPT_HISTORY`, `SESSION_HANDOFF`, `PLATFORM_VALIDATION_REPORT`, `BRANCH_COMPARISON`, `MIGRATION_REPORT`) deliberately keep their original numbering.

## 2026-07-29 — Stage 3's Excel test suites are generated again, by a new dependency-free tool

Restores a behaviour an earlier Stage 3 run had — Markdown **and** Excel Manual Test Suites per module — which was lost when that run's output templates were extracted (the workbooks had been produced by a run-scoped throwaway script, so nothing permanent carried the capability forward). The behaviour returns as platform tooling rather than as a script beside the artifacts, and with the authoring model inverted.

- **Added [`platform_core/tools/test_suite_export/`](../platform_core/tools/test_suite_export/)** — renders each authored `TestCases_{Module}.md` into the matching `.xlsx`. CLI resolves the run folder from the Active Run pointer (`test-design-skill/SKILL.md` §24), never by guessing; `--run`, `--dir`, `--file`, `--sheet-name`, `--check`, `--json`. Exit `2` on parse warnings, so a workflow step can gate on "did every case parse cleanly?" instead of shipping a workbook with blank cells nobody notices until Stage 4.
- **The workbook is now *derived*, not authored.** §9 has always required the two formats to "never diverge"; authored separately — as the prior run did — that is a matter of discipline, and once they drift, Stage 4 executes against whichever file the tester opened, a difference nothing downstream can detect. The Markdown is the authored artifact and the `.xlsx` is generated from it, which makes the failure mode unreachable rather than merely discouraged. This is the one substantive departure from the behaviour being restored.
- **Zero runtime dependencies, deliberately.** The prior run installed the npm `xlsx` package mid-pipeline (the same class of mid-run install `PLATFORM_VALIDATION_REPORT.md` §40 already flags for `exceljs`). `platform_core/` must run on a clean install, so `xlsxWriter.js` emits the `.xlsx` directly — an xlsx is a ZIP of XML parts, written with STORED entries, so no compression or spreadsheet library is needed. The writer's scope is deliberately narrow (one sheet, header row, text cells, column widths) and is documented as not to grow into a general-purpose spreadsheet library.
- **Output is byte-reproducible** — ZIP entries carry the fixed 1980 ZIP epoch rather than wall-clock time, so regenerating an unchanged suite is a no-op in git instead of a timestamp diff on every re-run.
- **`SKILL.md` §9.1 added** (*Excel Rendering — Generated, Never Authored*): the derivation rationale and six rules — author-then-export, never hand-edit a workbook, never add a spreadsheet dependency, treat a parse warning as a Markdown defect, run `--check` before requesting review, and reconcile per-module case counts across the suite documents, Traceability Matrix, and Coverage Report. §10 Allowed Tools now names this tool as the *only* permitted way to produce the Excel output (replacing the open-ended "spreadsheet-writing script or library" allowance); Execution Rule 13, §12, §18 #6, and the frontmatter `dependencies`/`outputs` updated to match.
- **Templates:** `TestCases_Module.md` and `TestCase_entry.md` now state that the case block is **parsed, not only read** — the `**Label:**` field markers are a machine contract, and a renamed marker silently lands its content in the previous field. Both accepted heading shapes (`## TC-x` + `**Title:**`, and `### TC-x — Title`) are documented as supported. `CoverageReport.md` §6 gains a per-module **Case Count** column: the reference run shipped this report claiming 45 test cases when the files held 47, and the miscount propagated into the Stage 4 and Stage 5 artifacts before being caught — the column makes that reconciliation an explicit step rather than an assumed one.
- **Steps keep their numbering.** Rendered into one cell as `1. … | 2. …`, renumbered canonically. Stage 4 records a result per step and a defect cites "failed at step 3", so a joined cell that dropped its numbers makes that citation unresolvable; renumbering also normalizes a suite authored as an all-`1.` Markdown list.
- **Registered** in `platform_core/README.md` (Shared Tools list, folder tree, Related Layers), `platform_core/templates/README.md` (new convention #7 — a template describes an *authored* artifact, so a generated rendering gets no second template), `docs/USER_GUIDE.md` §12 (CLI reference + Related Documents), `pipeline.md` Stage 3, `workflows/user_story_run.md`, and `package.json` `exports` as `./test-suite-export`.
- **Verified:** the generated workbooks are **cell-for-cell identical** to the prior run's reference `.xlsx` files — 47 test cases across 5 modules, all 10 columns — and round-trip readable by the npm `xlsx` package. `npm test` passes 394/394 (36 new: parser shapes, ZIP/XML structure, export behaviour); `verifyPackable` and `doctor` both OK; an end-to-end export through a real Active Run pointer confirmed, and the missing-field/duplicate-ID warning path confirmed to exit `2`.

## 2026-07-27 — Documentation set: User Guide, Prompt History, Branch Comparison; README pass across every layer

User-mandated documentation work. No behavioral, path, or specification change — three new documents plus corrections to READMEs that the branch's own refactors had left stale.

- **Added [`docs/USER_GUIDE.md`](USER_GUIDE.md)** — the task-oriented companion to the root `README.md`, which is a reference document rather than a walkthrough. Twelve sections: install (both routes), what `init` changes in a host repo, preparing inputs, browser/MCP setup, running the pipeline, **calling a single skill directly**, where artifacts land, named workflows, approvals and gates, retargeting, troubleshooting, and a full CLI reference. The troubleshooting table is keyed by symptom, and deliberately explains *why* the fail-closed behaviors (empty `writeAllowlist`, non-inferred `targetRoot`, `configVersion` mismatch, read denylist) are working as designed rather than presenting them as faults.
- **Added [`docs/PROMPT_HISTORY.md`](PROMPT_HISTORY.md)** — all 17 prompts across the branch's 8 chat sessions, all 12 clarifying question sets (21 individual questions), every answer, and the concrete impact of each. Recorded because a diff shows *what* changed but not which alternatives were rejected; several decisions here (keeping `-agent` strings in past run artifacts, refusing to template the 176 path literals, rejecting `auto` git mode, the approve-and-recommend bypass rule) are only intelligible alongside the option that was declined. Four cases where an answer overrode the recommendation are called out explicitly, as are the two corrections (P4, P14) that reset the scope of the branch's largest changes.
- **Added [`docs/BRANCH_COMPARISON.md`](BRANCH_COMPARISON.md)** — `main` → `Project_owns_package`, section by section: the host→guest architectural inversion, the two-root contract, the skills rename, the twice-relocated knowledge layer, the new tooling layer, MCP integration, browser defaults, the invocation model, the data purge, and a side-by-side matrix. Includes migration steps for anyone who used the old `projects/<name>/` model, and a **Known Open Items** section recording the one deliberately-deferred item (see below).
- **Root `README.md`:** §7 retitled *Agent Architecture* → **Skill Architecture**, with all seven rows renamed to skill form and tagged with their stage number — the Session 2 rename had updated the skill files and their links but left this table describing "the Explorer Agent". Anchor `#7-agent-architecture` → `#7-skill-architecture` in the TOC, the badge, and Quick Navigation. Badges corrected: `version-1.0` → `2.0`, `Single Project Focused` → `Installable into your repo` (the badge still linked to the single-project model this branch replaced). Added a "New here?" pointer to the User Guide, a note in §7 that skills are directly invokable, and four rows to §18's Documentation Map (the three new documents plus `platform_paths/README.md`, which had no entry despite being the two-root contract's specification).
- **`docs/README.md`:** prefaced with an **archived-overview banner**. It describes the pre-2.0 `projects/`-hosted model throughout, and was previously marked only as "an earlier platform overview" in the root README's documentation map — nothing inside the file itself warned a reader landing on it directly that its architecture no longer exists. Retained rather than deleted for its narrative detail, per its existing disposition.
- **`platform_core_data/README.md`:** removed the stale line "The application currently hosted here is **NDC**" — that content was purged from this branch on 2026-07-26, so the folder now documents its own emptiness and points at `BRANCH_COMPARISON.md` for what was removed and what survived. Added the Tool Root framing (`agentic-testing-tool/platform_core_data/` once installed) and the `init`-never-overwrites guarantee. Fixed a **broken relative link**: `[patterns/](patterns/)` still pointed at the pre-nesting location and now resolves to `knowledge_base/patterns/`.
- **Layer READMEs** (`platform_core/`, `.claude/`, `workflows_and_pipelines/`, `platform_core_data/`): each gained a Related-Layers entry pointing at the User Guide sections that operate what it specifies. `platform_core/README.md` additionally now surfaces `tools/platform_paths/README.md` as the entry point for the two-root resolver every other tool depends on. `.claude/README.md`'s "agent behavior" phrasing corrected to "skill behavior" where it described this branch's own layout.
- **Known open item, recorded not resolved:** `platform_core_data/NDC_Previous_used_helper_docs_tobe_delete/` still holds 8 NDC input documents. Deleting it would leave `platform_core_data/` with no `PRD.md` or `run_configuration.md`, which Stage 1 declares as required inputs; the recommendation was to delete and add blank scaffolds, and the explicit decision was to defer. Documented in `BRANCH_COMPARISON.md` § Known Open Items with both closure options, so it is a tracked decision rather than an oversight. Installed usage is unaffected — `init` scaffolds blank inputs into the target project independently.
- **Verified:** `npm test` passes 260/260. No source file, path literal, or specification section was modified by this change.

## 2026-07-26 — Knowledge layers nested: `patterns/` → `knowledge_base/patterns/`, and `diagnosis/` → `patterns/diagnosis/`

User-mandated follow-on to the relocation below, same day. The Platform Knowledge layer now sits **inside** the Project Knowledge Base, and the project-scoped `diagnosis/` category moves into it. No pattern document's content, ID, or promotion status changed; both moved folders were empty of documents apart from the two populated pattern categories carried along unchanged.

- **Moved** (via `git mv`, history preserved) `platform_core_data/patterns/` → `platform_core_data/knowledge_base/patterns/`, all eleven files intact. Then `platform_core_data/knowledge_base/diagnosis/` → `platform_core_data/knowledge_base/patterns/diagnosis/`. Per the user's explicit choice, `diagnosis/` lands as its own folder rather than merging into the existing `diagnosis_patterns/`, so the Platform layer now holds both.
- **Updated 36 path references** across 12 files: root `README.md`, `platform_core/README.md`, `platform_core_data/README.md`, `.claude/README.md`, `workflows_and_pipelines/README.md`, `pipeline.md`, the three pipeline Skill specs that cite Platform Knowledge subfolders, and the three `knowledge_base/repair/REP-00*.md` cross-links.
- **`diagnosis/` is no longer a Project Knowledge category.** `pipeline.md` §10.4's fixed-shape list drops it (now eight folders: `automation/`, `repair/`, `execution/`, `application/`, `ui/`, `findings/`, `business_rules/`, `lessons_learned/`), and §10.7's read/write map no longer routes Stage 6's writes there. Application-specific diagnosis notes now belong in the `repair/` record that consumed the diagnosis, or in `findings/`. `patterns/diagnosis/` itself is **held empty**: like `pipeline_decision_patterns/`, it has no named reader in §10.7 and no project-level counterpart left to promote from, so it cannot legally receive a document under §10.5 yet.
- **The nesting is documented as structural, not semantic** — stated in `pipeline.md` §10.6, both READMEs of the moved folder, `knowledge_base/INDEX.md`, and root `README.md` §11. `patterns/` is not a Project Knowledge category: it still resolves *first* per §10.2, still admits nothing application-specific per §10.6, and still accepts documents only through the §10.5 human gate. An agent walking `knowledge_base/` must not merge `patterns/` in at the same precedence as its siblings.
- **Retargeting procedure hardened (root `README.md` §16 steps 4–5).** This move creates a real hazard: the layer that must survive retargeting now lives inside the folder that gets emptied. Step 4 now enumerates the eight Project subfolders to clear individually instead of saying "empty `knowledge_base/`", and step 5 carries an explicit warning that `rm -rf knowledge_base/*` would destroy Platform Knowledge.
- **Index scope made explicit in both directions:** `knowledge_base/INDEX.md` states it catalogs Project Knowledge only and does not cover `patterns/`; `knowledge_base/patterns/INDEX.md` states the converse and notes its parent is a separate layer.
- **Left unchanged:** the entry below keeps `platform_core_data/patterns/` throughout — it records the state after that move, which this entry supersedes. `npm test` still passes 95/95; no code references either path.

## 2026-07-26 — Knowledge layer relocated: `platform_core/knowledge/` → `platform_core_data/patterns/`

User-mandated move. The pattern categories that made up the Platform Knowledge layer now live under `platform_core_data/`, in a single `patterns/` folder; `platform_core/knowledge/` no longer exists. No pattern document's content, ID, category, or promotion status changed.

- **Moved** (via `git mv`, preserving history) `platform_core/knowledge/` → `platform_core_data/patterns/`, carrying all nine members intact: `INDEX.md`, `README.md`, the two populated categories (`reasoning/REASON-001.md`, `repair_patterns/REPAIR-001.md` + `REPAIR-002.md`), and the six categories held empty by `.gitkeep` (`automation_patterns/`, `diagnosis_patterns/`, `execution_patterns/`, `framework_patterns/`, `pipeline_decision_patterns/`, `reporting/`).
- **`platform_core/` is now `README.md` + `tools/` only.** Its remaining member is the Shared Tools layer.
- **Updated every live path reference** (38 across 10 files): root `README.md`, `platform_core/README.md`, `platform_core_data/README.md`, `workflows_and_pipelines/README.md`, `workflows_and_pipelines/pipeline/pipeline.md`, `.claude/README.md`, and the `dependencies`/Knowledge-resolution lines of `automation-execution-skill`, `automation-skill`, and `reporting-skill`. The three `platform_core_data/knowledge_base/repair/REP-00{1,2,3}.md` cross-links also had a stale `platform/knowledge/` prefix (missing the `_core` segment) and were corrected to the new path in the same pass.
- **Prose fixed where the move made a sentence wrong, not just its path.** `.claude/README.md`'s ownership paragraph contrasted the knowledge layer against `platform_core_data/` as two separate folders; it now reads "`platform_core_data/patterns/`" versus "the rest of `platform_core_data/`". ASCII dependency trees in `.claude/README.md` were re-aligned for the longer path.
- **Left deliberately unchanged:** this changelog's earlier dated entries and `.claude/README.md`'s account of the 2026-07-21 governance review keep `platform_core/knowledge/` — they are records of what was true when written, per the convention in the 2026-07-26 Skill-conversion entry below. The moved folder's own `README.md`/`INDEX.md` needed no edit: every internal reference is relative (`repair_patterns/`, `knowledge_base/`) and still resolves.
- **Note on the two-layer split:** the resolution order and Promotion Workflow of `pipeline.md` §10 are unchanged and still describe two distinct layers — Platform Knowledge (`platform_core_data/patterns/`, read-only outside Promotion) resolved first, then the project's `platform_core_data/knowledge_base/`. Both now sit inside `platform_core_data/`, so the folder boundary that used to make "application-agnostic vs. application-specific" self-evident is now carried by the `patterns/` vs. `knowledge_base/` distinction alone rather than by the `platform_core/` vs. `platform_core_data/` split. §10's isolation rule — application-specific knowledge must never land in the Platform layer — is unchanged and now rests entirely on that convention.

## 2026-07-26 — MCP Tools Layer: `playwright` as a second browser mode, `context7` for stack-accurate docs

User-mandated addition. The platform had no MCP configuration at all, while three Skill specs already referred to "Playwright MCP" as though it were wired up. Both gaps are now closed by a new `platform_core/tools/` member.

- **Registered both servers** in a new repo-root `.mcp.json` — `playwright` (`@playwright/mcp`, `--isolated`) and `context7` (`@upstash/context7-mcp`, optional `CONTEXT7_API_KEY` read from the environment, never committed). Project-scoped, so each machine approves them once via `/mcp`.
- **New `platform_core/tools/mcp/`** — the registration point and usage contract. Holds no server code (both are fetched by `npx`) and no project data, consistent with the layer's Zero Project-Specific Data principle.
- **Playwright MCP is a second, *selectable* mode — not a replacement for the Browser Driver.** `mcp/README.md` §1.1–§1.2 define the split and the selection rule: the Browser Driver stays the default for authenticated flows and any screen with existing Screen/Component Knowledge; Playwright MCP is for first-contact exploration of an unknown screen, one-off accessibility-tree/selector checks, or when the driver is unavailable for a non-application reason. §1.3 adds a hard rule the driver's own credential policy implied but never stated: **a credential value is never typed into, passed to, or echoed by an MCP tool call**, because tool arguments are transcript-visible — authenticate via `BrowserDriver.authenticate()` and hand MCP only an already-authenticated session. Wired into `explorer-skill` §8.1/§10, `manual-execution-skill` §11, and `automation-skill` §17; per §8.3, "Browser automation" alone is no longer a sufficient Discovery Mode label — the entry names which of the two produced the evidence.
- **Context7 is driven by the project's own extracted stack.** New `automation-skill` §34 (Stack Documentation Step): after the Framework Decision Gate resolves the framework and before any code generation, Stage 5 extracts the stack from the project's **source** (manifests/lockfiles/framework config) and its **documentation** (Project Context Technology Stack, `architecture.md`, `automation_framework.md`), then queries `context7` per material library for version-accurate documentation used as a generation guideline. **The lockfile wins on version** — a manifest range is a constraint, the resolved version is the fact, and an unpinned dependency is recorded as a range rather than presented as resolved. Output: `StackDocumentationContext_{Framework}.md` (new frontmatter output + §19 artifact row), recording detected stack, dependency table, queries performed, guidelines extracted, conflicts, and documentation gaps.
- **New shared extractor `platform_core/tools/mcp/stack_docs/`** — `detectStack.js` walks a given root for `package.json`/lockfiles, `pom.xml` (resolving `${property}` versions), Gradle, `requirements.txt`/`pyproject.toml`/`poetry.lock`/`Pipfile.lock`, `*.csproj`, `Gemfile.lock`, `go.mod`, `composer.lock`, plus framework config files, skipping vendored/build trees and filtering to test-facing dependencies; `planQueries.js` turns that into one-concept-per-call Context7 questions, deduplicated where sibling packages resolve to the same docs (`playwright`/`playwright-core`). CLI + 19 tests, wired into `npm test` (95 pass).
- **Two invariants preserved explicitly, not by omission.** `automation-skill` §6's v4 rule stands: that Discovery used Playwright MCP carries **zero weight** in the Framework Decision Gate. And §34.5 states the parallel rule for documentation — fetched docs are a guideline, never an authority over `platform_core_data/automation_framework.md`; where they conflict the approved framework governs, the conflict is surfaced for human resolution, and fetched docs never enter the traceability chain or justify a coverage decision.
- **Stage 6 gets a narrow allowance only** — `automation-execution-skill` §7 permits `context7` *only* inside the Automation Repair Loop, for framework/dependency API questions, reusing Stage 5's artifact before re-querying.
- **Docs updated:** `platform_core/README.md` (Shared Tools bullet + folder tree, which had also omitted `run_manager/` and `automation_lifecycle/`), root `README.md` (repo structure, capabilities matrix, documentation map, Getting Started step 3).

## 2026-07-26 — Skill conversion: `*-agent/` → `*-skill/`, and spec de-duplication

User-mandated. The seven pipeline-stage specs are Skills, not Agents, and are now named and written that way. No stage's behavior, contract, or section numbering changed.

- **Renamed** all seven skill folders and their frontmatter `name:` — `.claude/skills/{project-context,explorer,test-design,manual-execution,automation,automation-execution,reporting}-agent/` → `…-skill/`. Invocation identity changes accordingly (`/explorer-agent` → `/explorer-skill`). Every live cross-reference was updated across `.claude/`, `workflows_and_pipelines/`, `platform_core/`, `docs/`, and `platform_core_data/` (excluding run history, below).
- **Removed the `Operational Prompt` section** from every spec (−1,189 lines, ~27%). Each was a fenced block restating the numbered sections above it in prose. A vocabulary diff of each block against its own file body confirmed no rule existed only there; each is now a short `Operational Contract` naming the role and citing the sections (`§N`) that specify execution. Section **numbers are unchanged** — roughly thirty files cite them by number.
- **Purged agent framing from spec prose** — self-references became "this skill"; stage proper nouns became "the Automation skill (Stage 5)" and so on. Sibling references still name the producing stage, so handoff contracts remain unambiguous about who produces what.
- **Preserved deliberately:** the platform axiom "Agents communicate through artifacts only…" is quoted from `workflows_and_pipelines/pipeline/pipeline.md` §1 and stays verbatim in each spec's Architecture Principle section; run artifacts under `platform_core_data/runs/` keep their original `*-agent` references, being records of what past runs actually invoked; and this changelog's own dated entries keep the paths that were current when written — only the per-file `##` headers track the current filename.
- **Pre-existing drift left as-is** (predates this pass, unrelated to it): `docs/CHANGELOG.md` cites `automation-skill §10.7` and `docs/PLATFORM_VALIDATION_REPORT.md` cites `reporting-skill §12`; neither section exists in either spec at any point in this repo's history.

---

## 2026-07-25 — Single-Project Restructure (`projects/{PROJECT}/` → `platform_core_data/`)

Repository-wide, user-mandated. The platform now hosts **exactly one project at a time**.

**What changed**

- `projects/NDC/` → **`platform_core_data/`**. There is no project-name path segment anywhere: `platform_core_data/workspace/{stage}/` is the current-approved state, `platform_core_data/runs/{{RUN_FOLDER}}/` the immutable run history. The older `artifacts/` folder name (used by the non-NDC projects) is gone with them.
- `projects/NDC_INT/`, `projects/OrangeHRM/`, `projects/templates/project_template/`, and `projects/README.md` were **deleted** — recoverable from git history, but no longer part of the working tree. The `projects/` directory no longer exists.
- **Artifact filenames dropped the project prefix**: `NDC_ProjectContext_Agency.md` → `ProjectContext_Agency.md`, `NDC_tests_SHAFT/` → `tests_SHAFT/`, and so on. The SHAFT `pom.xml`'s `artifactId` (`NDC_SHAFT_Automation`) is deliberately *not* renamed — it is a Maven coordinate, not an artifact filename.
- **Tooling de-parameterized.** `run_manager/migrate.js` lost its `--project` flag (`migrateProject` → `migrateRuns`); `browser_driver`'s `launchAuthenticated`/`BrowserDriver.authenticate`/`loadProfile`/`loadCredentials` lost their `project` argument and resolve `platform_core_data/` directly. Passing `--project` is now an explicit error rather than a silently ignored flag.
- **`run.json` lost its `project` key** (`run_manager.md` §7). Existing run folders keep theirs — they are immutable history.
- `pipeline.md` §6 Rule 9 was rewritten from **Project Isolation** to **Single Project Root**, and §10's two-layer Knowledge Architecture was re-justified: the split is retained not for cross-project isolation (no longer applicable) but so that retargeting the platform discards the application's specifics without discarding accumulated engineering knowledge.

**What did not change**

The seven stages, their order, every checkpoint and approval gate, the Automation Asset Lifecycle (§12), the Run Scope model, and every agent's Inputs/Outputs contract are untouched. This was a relocation and a de-parameterization, not a redesign.

**Historical documents left as-is**

`SESSION_HANDOFF.md`, `PLATFORM_VALIDATION_REPORT.md`, `MIGRATION_REPORT_2026-07-17.md`, and `LESSONS_LEARNED.md` still reference `projects/OrangeHRM/…` paths, as do the artifacts inside pre-existing `runs/` folders. These are dated records of what was true when written; rewriting them would falsify the record. Read them against the layout of their own date, not today's.

---

## .claude/skills/project-context-skill/SKILL.md

> **Relationship to legacy prompts:** Replaces the data-flow direction of `prompts/knowledge/knowledge_agent.md`. The old Knowledge Agent *produced* a PRD from discovery. In this architecture the PRD is an upstream input (already approved/provided), and the Project Context Agent *consumes* it to produce the operating brief for every agent downstream.

*(`prompts/knowledge/knowledge_agent.md` no longer exists in this repository — the legacy `prompts/` pipeline was removed. This note is preserved as historical lineage only.)*

---

## .claude/skills/explorer-skill/SKILL.md

> **Relationship to legacy prompts:** Evolves `prompts/exploration/explorer_agent.md`. The core exploration methodology is unchanged; the difference is that scope, credentials, and environment constraints now come from a single upstream **Project Context** artifact rather than being passed as loose parameters.

> **Revision note (v2):** This is an architectural upgrade from **v1 (Investigation-Driven Evidence Explorer)** to **v2 (Evidence-Driven QA Explorer)**. The agent's position, inputs, and outputs in the pipeline are unchanged. What changes is scope of responsibility: v1 discovered the application and investigated candidates it happened to notice; v2 additionally (a) automatically captures evidence the instant a defined set of failure signals occurs, rather than waiting to notice them narratively, (b) attempts bounded recovery before any Finding may be marked `Confirmed`, (c) produces a materially richer Evidence Package and Finding Metadata schema (including a disclosed-as-hypothesis Root Cause section, and separate Business/Technical Risk framing), (d) maintains a run-wide Timeline and Coverage tracker as first-class outputs, and (e) never treats finding a defect as a reason to stop exploring. Nothing in this revision authorizes the agent to define, redefine, or infer requirements; §11 (formerly §9) still governs, unchanged in spirit. This document is a specification update only — v2 has not been executed, and no project artifact has been generated as part of authoring it.

> **Revision note (v3):** This is a tool-agnosticism upgrade. Prior versions implicitly required a browser automation tool to perform Stage 2 at all. v3 reframes "discovery" as the agent's actual responsibility and browser automation as its preferred, but not sole, mechanism for achieving it — see the new §8.1–§8.3 (Discovery Modes). When browser automation is unavailable, the agent falls back down a documented priority list (existing screenshots → existing recordings → user-guided exploration → documentation → APIs → static artifacts) rather than blocking the run. This does not change the agent's position in the pipeline, its Inputs/Outputs contract at the pipeline level, the number of pipeline stages, or any approval gate — it changes only how this agent may satisfy its existing "Running Application" input and what it must disclose about how it did so. Confidence/Status gates (§5.5–§5.6) are unchanged; §8.3 only clarifies why non-interactive modes cannot clear the existing `Confirmed` bar. This document is a specification update only — v3 has not been executed, and no project artifact has been generated as part of authoring it.

> **Revision note (v4):** This is an internal architecture-review hardening pass, performed before v3 was ever executed against a real run. It does not add a pipeline stage, does not change any approval gate, and does not touch any other agent. It adds: (a) explicit Discovery Strategy variation by Run Scope Type (§16), (b) an Evidence Category taxonomy separate from Discovery Mode (§17), so confidence is driven by evidence quality rather than by which tool happened to produce it (§18), (c) a canonical, field-level Standard Output Contract so Test Design never depends on free-form prose (§19), (d) named Stop Conditions with required actions (§20), (e) a mid-run per-area Recovery Strategy that recommends a fallback Discovery Mode instead of just marking an area unreachable (§21), (f) an explicit Handoff completeness checklist against the Test Design Agent's actual declared Inputs (§22), and (g) a Future Scalability note showing the same abstractions extend to non-browser-shaped systems without redesign (§23). §8.1–§8.3's Discovery Mode mechanics from v3 are retained and now anchored to §17/§18 rather than duplicating their own confidence logic. This document is a specification update only — v4 has not been executed, and no project artifact has been generated as part of authoring it.

---

## .claude/skills/test-design-skill/SKILL.md

> **Relationship to legacy prompts:** Evolves `prompts/testing/test_design_agent.md`. **Architectural change (v1):** the primary/secondary source relationship was reversed from the initial version of this agent — test cases are derived primarily from the approved **Project Context**, with Discovery Artifacts consulted only to validate, enrich, and detect gaps.

> **Revision note (v2):** This is an architectural upgrade from **v1 (manual test case generator)** to **v2 (Requirement-Driven Test Engineering Agent)**. The agent's position in the pipeline and its Project-Context-primary/Discovery-secondary relationship are unchanged. What changes is the depth and rigor of what it produces: v1 wrote test cases with a single combined "Traceability" note; v2 (a) consumes the Explorer Agent v2's full output set — Findings and Evidence Packages, not just the QA Assessment Report — as additional secondary inputs, (b) requires four explicit, separately-tracked traceability dimensions (Requirement, Discovery, Finding, Evidence) on every test case, (c) systematically generates negative tests across seven defined categories rather than "one negative case where applicable," (d) tracks and reports Coverage (of both requirements and Findings) as a first-class output, and (e) requires every Finding to be explicitly dispositioned — as a regression test, an exploratory test, or a documented exception — never silently dropped.

> **Platform-neutrality note:** This agent is part of the platform core and must remain completely platform-agnostic. An earlier draft of v2 briefly specified an Azure DevOps-specific CSV export; that has been removed entirely. The platform core generates only its own canonical artifacts (§9); it contains no references to any external ALM, issue-tracking, or test-management system. Integrations with such systems, if ever built, live outside the core architecture, in a separate integration layer that consumes these canonical artifacts — they are not this agent's responsibility.

> **Revision note (v3):** This is an internal architecture-review hardening pass, mirroring the same review already applied to the Explorer Agent (`.claude/skills/explorer-agent/SKILL.md` v4). It does not add a pipeline stage, change any approval gate, or touch any other agent. It adds: (a) explicit Test Design Strategy variation by Run Scope Type (§16), (b) a systematic Required Dimensions methodology covering Business Rules, Error Handling, Permissions, Configuration, Regression Impact, Integration Behaviour, Risk-based prioritization, and Exploratory Recommendations (§17), (c) two new traceability dimensions — Acceptance Criteria and Run Scope — alongside the existing four (§5.4), (d) extended Coverage categories — Partially Covered, Out-of-Scope, Unknown/Unassessed — alongside the existing Covered/Uncovered (§8.3), (e) a canonical Standard Output Contract for the Coverage Report so the Automation Agent never parses free-form prose (§18), (f) named Stop Conditions (§19) and a minimal-missing-prerequisite Recovery Strategy (§20) instead of an undifferentiated halt, (g) an explicit Handoff Contract checklist against the Automation Agent's actual declared Inputs (§21), and (h) a Future Scalability note (§22). None of §1–§15's existing numbering changed — every existing external citation (`.claude/skills/automation-agent/SKILL.md`, `docs/PLATFORM_VALIDATION_REPORT.md`, `docs/LESSONS_LEARNED.md`, and generated OrangeHRM artifacts already cite this agent's §4, §5.1, §5.3, §7, §8, §9) remains valid. This document is a specification update only — v3 has not been executed, and no project artifact has been generated as part of authoring it.

> **Revision note (v4):** User-mandated architectural separation, 2026-07-24 — a new **Manual Execution Agent** is inserted as Stage 4, immediately downstream of this agent (still Stage 3, unchanged). §21's Handoff Contract is retargeted from "the Automation Agent" to "the Manual Execution Agent" — this agent's outputs (Manual Test Suite, Traceability Matrix, Coverage Report) are now consumed first by Manual Execution, not directly by Automation. §18's Standard Output Contract section 12 is renamed "Inputs for Manual Execution Agent" accordingly. This agent's own advisory, non-binding Automation Candidates hint (§18 §11) is now a prioritization signal for the Manual Execution Agent (§9.2 of its own spec) rather than a hint read directly by Automation — the binding Automation Decision remains, as before, exclusively the Automation Agent's authority, just reached one hop further downstream. No change to this agent's own Traceability Model (§5), Test Case Schema (§6), Negative Test Generation Engine (§7), or Coverage Model (§8).

> **Revision note (v5):** User-mandated Canonical Test Case Writing Standard, 2026-07-25 — the Test Case Schema (§6, now §6.1) is replaced with a lean, execution-focused field set (Test Case ID, Title, Objective, Preconditions, Test Data, Steps, Expected Result, Priority, Tags, optional Notes), plus explicit Step/Expected-Result/Title/Objective writing rules and a Success Criteria bar ("executable by a new team member in under two minutes"). Risk, Requirement/Discovery/Finding/Evidence/Acceptance-Criteria/Run-Scope References, and Category/Test-Type/Automation-Candidate detail are **not dropped** — they relocate to the Requirement Traceability Matrix (a new §6.2, and a new per-Test-Case-ID "Test Case Reference" appendix on the Matrix itself) and the Coverage Report, so the execution-facing test case document stays lean while the pipeline's traceability guarantee (§5.2) is fully preserved. §5's intro, and Execution Rules 7/9/12/14/19, are reworded accordingly (Matrix-recorded, not inline-field-recorded); §18 Standard Output Contract row 9 (Risks) now sources from the Matrix instead of a test-case field. Applied retroactively to the already-approved NDC Agency Test Suite (66 cases) and its Traceability Matrix/Coverage Report the same day, per explicit user instruction — see `platform_core_data/workspace/test_design/Agency/`.
>
> **Revision note (v6):** Same-day follow-on, 2026-07-25 — two further refinements to v5's standard, both retrofitted onto the NDC Agency suite immediately. (a) **Lean Test Case Philosophy** (new §6.0): one business behavior per test case (chained unrelated actions must be split; a single behavior parameterized across data points, e.g. a mandatory-field matrix, is still one behavior), a 30-second comprehension bar alongside the existing two-minute execution bar, a five-question Readability Check, and the Golden Rule ("if removing a sentence does not change how the test is executed, remove it"). (b) **Test Case Granularity** (new §6.0.1): every test case is now exactly one of **Atomic** (a single business rule), **Scenario** (one complete workflow composed of related rules), or **End-to-End** (a journey spanning multiple screens/modules) — recorded as a mandatory Tag. E2E is additive (never replaces Atomic/Scenario coverage of the same ground) and must state in its Objective that it's a workflow test. Applied to the Agency suite: 63 Atomic + 3 Scenario (`CREATE-001`, `UPDATE-002`, `ACTIONS-009`, each reframed/tagged to read as one stated behavior) + 0 E2E — the one journey that would qualify (Agency Creation → Approval → Booking availability) crosses into the out-of-scope Search & Booking module, logged as a Coverage Gap rather than fabricated.

---

## .claude/skills/automation-skill/SKILL.md

> **Relationship to legacy prompts:** Evolves `prompts/automation/automation_agent.md`. **Architectural change (v1):** inputs were formally limited to two governance sources — the Approved Manual Test Suites (primary) and the Project Context (secondary) — reinforcing that this agent never goes back to the PRD or reinterprets business logic on its own.

> **Revision note (v2):** This is an architectural upgrade from **v1 (manual-test-case-to-script converter)** to **v2 (Automation Engineering Agent)**. The agent's core non-negotiables from v1 are unchanged and still govern: it automates only what was approved, it never invents business logic, and it never executes what it generates. What changes is scope and rigor: v2 (a) consumes the full approved artifact set from Stages 1–3 (Project Context, Manual Test Suite, Traceability Matrix, Coverage Report, Discovery Artifacts, Findings, Evidence Packages), (b) produces a mandatory Automation Plan before any code generation begins, (c) detects and justifies its target framework rather than assuming one, with SHAFT Engine treated as a first-class framework alongside Playwright/Selenium/Cypress/Appium/REST Assured and others, (d) inspects and reuses any existing automation project as a knowledge base before generating anything new, (e) organizes automation into business-workflow-based suites rather than per-page scripts, (f) assigns every manual test case exactly one of four Automation Decisions with explicit justification, (g) performs a Self Review pass before declaring generation complete, and (h) is responsible for a coherent, production-quality automation *project*, not a bag of isolated scripts. This document is a specification update only — v2 has not been executed, and no project artifact has been generated as part of authoring it.

> **Revision note (v3):** This is an internal architecture-review hardening pass, mirroring the same review already applied to the Explorer Agent (`.claude/skills/explorer-agent/SKILL.md` v4) and the Test Design Agent (`.claude/skills/test-design-agent/SKILL.md` v3). It does not add a pipeline stage, change any approval gate, or touch any other agent. It adds: (a) explicit Automation Strategy variation by Run Scope Type (§23), (b) a named Locator Strategy with fallback/prioritization/recovery (§24) — previously only implied by one Code Generation Standards bullet, (c) an expanded Code Generation Standards (§14) naming Component Objects, Reusable Actions/Assertions, Test Data Separation, Configuration Management, Environment Awareness, Parameterization, and Naming Conventions as generation-time standards, not just post-hoc Self Review checks, (d) an expanded Self Review (§15) explicitly checking Architecture, Compilation Readiness, Framework Compliance, and Traceability alongside its existing checks, (e) a **new required output, the Automation Summary** (§16, §25) — which also closes a real, pre-existing drift: `.claude/skills/execution-agent/SKILL.md` §4 and `workflows_and_pipelines/pipeline/pipeline.md` §4 Stage 4 both still expect a `AutomationSummary.md` artifact from a pre-v2 naming scheme that v2's six-artifact split never actually produced (confirmed against the real `projects/OrangeHRM/artifacts/runs/RUN-20260706-002/Automation/` output, which has no such file); this revision makes that filename real without editing either of those other two files, (f) named Stop Conditions (§26) and a minimal-missing-prerequisite Recovery Strategy (§27), and (g) an explicit Handoff Contract checklist against the Execution Agent's actual declared Inputs (§28), and a Future Scalability note (§29). None of §1–§22's existing numbering changed — every existing external citation (`.claude/skills/test-design-agent/SKILL.md`, `docs/PLATFORM_VALIDATION_REPORT.md`, generated OrangeHRM artifacts already cite this agent's §11, §12, §13, §14, §15) remains valid. This document is a specification update only — v3 has not been executed, and no project artifact has been generated as part of authoring it.

> **Revision note (v4):** User-mandated correction, 2026-07-12, after this agent (in practice, during an NDC Login automation run) both (a) autonomously decided to run Stages 1–4 in one pass without asking, and (b) autonomously selected Playwright as the implementation technology for a project whose Framework Configuration names SHAFT — inferring the framework choice from the fact that Playwright happened to be the tool already used for Stage 2 Browser Automation. Both were judgment calls this agent has no authority to make alone. This revision adds two mandatory, human-in-the-loop gates: **§30 Automation Start Decision Gate** (governs whether/how this agent's invocation triggers prior stages — moved to `workflows_and_pipelines/pipeline/pipeline.md` §5.4 since it is an orchestration-level gate, not specific to this agent, but cross-referenced here) and **§31 Framework Decision Gate**, which replaces §7 Rule 3's "select transparently" language with a mandatory human question — criteria-based selection may inform a *recommendation*, but never stands in for asking. It also hardens §6 with an explicit statement that Discovery Mode tooling (e.g., Playwright used for Stage 2 Browser Automation) must never be treated as evidence for the Stage 4 framework choice — discovery technology and automation technology are independent decisions. No other section's numbering changed.

> **Revision note (v5):** Immediate follow-on correction, same day, once v4's Framework Decision Gate was first actually exercised: the user clarified that a framework decision is scoped to **one Automation Package**, never the whole project. A project may accumulate several independent Automation Packages over time (e.g., a SHAFT package and a Playwright package for the same project, generated in different runs) — "the repository stores Automation Packages; it does not have a single project-wide framework" (§31.5). This revision changes §4's input row to plural "Existing Automation Package(s)," §7 Rule 2 and §9 to a registry model (inspect *every* package, never assume one), §19's artifact paths to be `{Framework}`-qualified per package plus a new project-level `AutomationPackages.md` registry artifact, and §31.1–§31.2 to summarize the full registry and ask "continue an existing package (which one) or create a new package (which framework)" — every Stage 4 run, not just the first. No prior section's numbering changed.

> **Revision note (v6):** User-mandated architectural refactor, 2026-07-12 — the platform now supports many simultaneous projects with isolated knowledge, per the new canonical `workflows_and_pipelines/pipeline/pipeline.md` §10 (Knowledge Architecture). §11's cross-reference to the Automation Repair Knowledge Base is updated: that store is no longer one global file, but a two-layer model (project-scoped `platform_core_data/knowledge_base/repair/` by default, promoted to `platform_core/knowledge/repair_patterns/`/`reasoning/` only via explicit human approval, `.claude/skills/execution-agent/SKILL.md` §28). This agent's own §11 "Automation Knowledge Base" (reusable code assets within one project's package) is unaffected in mechanics — only the cross-reference's target path changed. No other section's numbering changed.

> **Revision note (v7):** Correction from the 2026-07-21 Platform Knowledge governance review — the `dependencies` frontmatter's Platform Knowledge line was missing `framework_patterns/`, contradicting `workflows_and_pipelines/pipeline/pipeline.md` §10.7's read/write map, which had always listed it as a source this agent reads. No section numbering changed; frontmatter only.

> **Revision note (v8):** User-mandated architectural separation, 2026-07-24 — a new **Manual Execution Agent** (`.claude/skills/manual-execution-agent/SKILL.md`) is inserted as Stage 4, between Test Design (Stage 3) and this agent (now Stage 5, previously Stage 4). §4's Inputs are rewired: the primary, scope-determining input is now the Manual Execution Agent's **Automation Candidate Package** (only test cases it confirmed successful and stable) plus its Manual Execution Summary; the Manual Test Suite is still read directly, but only as a content source for exactly the test case IDs the Candidate Package names — this agent no longer determines automation scope from the raw Manual Test Suite. Every downstream reference to "the Execution Agent" is renamed to "the **Automation Execution Agent**" throughout this spec (see that agent's own v9 note below for why). No change to the Automation Decision Engine's mechanics (§13), the Standard Output Contract (§25), or any Decision Gate's mechanics (§30–§33) — only the upstream scope source and the downstream agent's name changed.

---

## .claude/skills/manual-execution-skill/SKILL.md

> **New in this architecture, 2026-07-24:** No predecessor in `prompts/` or any prior revision — this agent did not exist before this revision. It is introduced to formally separate "validating a manually-designed test case actually holds against the live application" from "generating automation for it" (Automation Agent) and "running already-generated automation" (Automation Execution Agent). Inserted as **Stage 4**, between Test Design (Stage 3) and Automation (now Stage 5). It executes the approved Manual Test Suite against the target environment, classifies every result (Passed/Failed/Blocked/Skipped/Not Executed/Inconclusive), and identifies only successfully, stably executed test cases as an **Automation Candidate Package** — the Automation Agent's new primary, scope-determining input. It never writes or executes automation code, and it never makes the binding Automation Decision (Reuse/Generate/Partially Automatable/Manual Only) — that remains exclusively the Automation Agent's authority, now exercised only over the candidates this agent hands it.

> **Revision note (v1):** User-mandated Defect Documentation Standard, 2026-07-25, given immediately after this agent's first real execution run (NDC Agency module) — a new **§10.1 Defect Documentation Standard** requires every `Failed`/`Inconclusive` test case's Per-Test Results entry (§10 #3) to carry a full, Jira/Azure-DevOps-ready write-up: Test Case ID, Execution Status, Execution Time, Preconditions, Test Data, Steps Performed, Expected Result, Actual Result, Impact, a fixed six-field **Classification** block (Category/Layer/Reproducibility/Regression/Suspected Component/Confidence — each honestly "Unknown"/"N/A" rather than omitted when uncertain), hedged Root Cause Analysis (*Likely*/*Appears to*/*Based on the observed behavior*, never presented as fact), Conclusion, Severity+justification, Priority, and Evidence. A one-line "expected: X, actual: Y" note is no longer sufficient for any non-Passed result. No change to §8's Result Classification states, §9's Automation Candidate criteria, or this agent's Allowed Tools/Execution Rules — this is a documentation-quality addition only, applied the same day to the NDC Agency run's own Results (`platform_core_data/runs/RUN-20260725-001/manual_execution/`).

---

## .claude/skills/automation-execution-skill/SKILL.md (renamed from `execution-agent`, 2026-07-24)

> **New in this architecture:** No predecessor in `prompts/` — this agent did not exist in the standalone-prompt version of the project. It is introduced to formally separate "running the tests" from "writing the tests" (Automation Agent) and "interpreting the results" (Reporting Agent).

> **Update (v1):** no change to this agent's core mandate — the refinement is that Execution Results must now explicitly capture Executed Test Case IDs, Automation Script IDs, Screenshots, Logs, and Execution Time as distinct, traceable fields on every recorded result, not just an informal "artifact reference."

> **Revision note (v2):** This agent must now determine an explicit **Execution Mode** (Headless / Headed / Debug) before running anything, sourced only from the approved Run Configuration. It must never assume a default mode. If the Run Configuration does not define one, the agent halts and requests it from the user interactively before starting execution — this is a new, hard precondition on top of the existing environment-match check (§7 Rule 1), not a replacement for it. The selected mode is recorded as a distinct field in the Execution Metadata on every run. This document is a specification update only — it does not itself execute anything.

> **Revision note (v3):** This is an internal architecture-review hardening pass, mirroring the same review already applied to the Explorer, Test Design, and Automation Agents. It does not add a pipeline stage, change any approval gate, or touch any other agent. It adds: (a) Execution Strategy variation by Run Scope and Run Type, including Regression/Smoke/Partial Suite/Selective Re-run/Failed-Test-Re-run (§13), (b) named environments and a read-only Production Validation mode (§14), (c) framework-agnostic execution — the previous Execution Mode table's Playwright-specific flag mapping is now sourced from the Automation Summary's own Execution Instructions rather than hardcoded here (§15), (d) a structured Evidence Inventory covering videos/traces/network logs/HAR/framework reports, not only screenshots and logs (§16), (e) a richer Result Classification — 12 states instead of 4 (§17), (f) a Standard Output Contract for the existing single `ExecutionResults.md` artifact — new required sections, same file, no new artifact path (§18), (g) named Stop Conditions (§19) and a Recovery Strategy recommending the smallest corrective action rather than simply failing (§20), (h) explicit Handoff Contracts in both directions — Automation → Execution and Execution → Reporting (§21), which is also where a **confirmed, pre-existing contract mismatch** with the Automation Agent is documented (identified during the Automation Agent's own v3 review) and now closed from this side, (i) named Metrics (§22), (j) Execution Reliability practices — determinism, stable ordering, idempotency, failure isolation (§23), and (k) a Future Scalability note (§24). None of §1–§12's existing numbering changed. **Pre-existing drift noted, not caused by this revision:** `docs/LESSONS_LEARNED.md` and `docs/PLATFORM_VALIDATION_REPORT.md` already cite this agent's Execution Rules as "§7" — that was accurate for v1, but v2 (before this revision) already shifted Execution Rules to §8 by inserting §5 Execution Mode. Those two meta-documents were never updated for that v1→v2 shift; this revision does not touch them either (out of scope — they are not agent specs), but the drift is real and pre-dates this pass. This document is a specification update only — v3 has not been executed, and no project artifact has been generated as part of authoring it.

> **Revision note (v4):** User-mandated addition, 2026-07-12, made actionable immediately after this agent's Result Classification (§17) was first exercised for real and produced several Automation Failures. Adds **§25 Automation Repair Loop** — after classifying failures, every `Automation Failure` (never `Application Failure`, `Environment Failure`, or the other classifications) is inspected for automatic repairability (missing waits, stale locators, outdated assertions, timing/synchronization issues, obsolete Page Object logic), and a Repair Summary (Reason / Proposed Fix / Confidence, per test case) is presented. The human is asked **once**: repair-and-rerun-affected-tests-only, mark as Known Automation Issue, or skip repair — never repaired automatically without that question, and never re-asked per test case. If approved, only the generated Automation Package is modified (never Discovery artifacts, never Project Context/other documentation, never Test Cases unless explicitly requested separately) and only the previously-failed tests are re-run — not the full suite. A Before/After comparison report is produced, and a test that now passes after repair is labeled `Automation Repaired`, distinct from a clean first-attempt `Passed`. The final Execution Results additionally separates **Application Health / Automation Health / Environment Health** as distinct headline figures — never merged into one "Failed" counter. This Repair Loop is now a standing part of every future execution, not a one-off. No prior section's numbering changed.

> **Revision note (v5):** User-mandated addition, 2026-07-12, made immediately after §25 was first exercised for real (4 of 5 proposed repairs confirmed, 1 did not resolve). Evolves the Repair Loop from a single-proposal mechanism into a self-improving, explainable one, adding three capabilities: **§26 Repair Strategy Decision Engine** (identify 2–4 reasonable repair strategies per failure *before* touching code, each with Pros/Regression Risk/Confidence, and ask once how to select among them — highest confidence, lowest regression risk, fastest, custom, or platform-recommended), **§27 Repair Confidence Engine** (a structured Repair Confidence Report — Test Case, Classification, Root Cause, Proposed Repair, Confidence *percentage*, Reasoning, Regression Risk, Evidence — replacing §25.1's simpler High/Medium/Low format; confidence must be derived from cited observed evidence, never invented), and **§28 Automation Repair Knowledge Base** (a permanent, cross-run store of *execution-confirmed-only* repair rules — never a failed repair — consulted before proposing a new repair, and by the Automation Agent before generating new automation). This is a distinct concept from `.claude/skills/automation-agent/SKILL.md` §11's "Automation Knowledge Base" (that one is reusable *code assets* — page objects, utilities — within one project's package; this one is reusable *repair patterns*, platform-wide, at `knowledge_base/AUTOMATION_REPAIR_KB.md`). §29 restates the platform's explainability requirements as an explicit checklist. §25 itself is restructured to call into §26/§27/§28 at the right points rather than proposing one fix per failure directly. No prior section's numbering changed.

> **Revision note (v6):** User-mandated architectural refactor, 2026-07-12 — the platform now supports many simultaneous projects with isolated knowledge, per the new canonical `workflows_and_pipelines/pipeline/pipeline.md` §10 (Knowledge Architecture). §28 is rewritten: the single global `knowledge_base/AUTOMATION_REPAIR_KB.md` (v5's location, now retired) is replaced by a two-layer model — this project's confirmed repairs write to `platform_core_data/knowledge_base/repair/`, and only a pattern explicitly approved via the Promotion Workflow (`workflows_and_pipelines/pipeline/pipeline.md` §10.5) is generalized into `platform_core/knowledge/repair_patterns/` or `platform_core/knowledge/reasoning/`. The three rules v5 produced during NDC's first real repair pass were migrated: the generalized patterns now live at `platform_core/knowledge/repair_patterns/REPAIR-001.md`, `REPAIR-002.md`, and `platform_core/knowledge/reasoning/REASON-001.md`, each citing the NDC-specific execution record that confirmed it (`platform_core_data/knowledge_base/repair/REP-001.md` through `REP-003.md`). No change to §25–§27's mechanics or numbering — only §28's storage model and read/write rules.

> **Revision note (v7):** Correction from the 2026-07-21 Platform Knowledge governance review — the `dependencies` frontmatter's Platform Knowledge line was missing `execution_patterns/`, which `workflows_and_pipelines/pipeline/pipeline.md` §10.7's read/write map has always listed as a source this agent reads alongside `repair_patterns/`, `diagnosis_patterns/`. The same review also narrowed §5/§19–§20's retry/concurrency/stop-condition mechanics to be explicitly Capability logic owned by this spec — `platform_core/knowledge/execution_patterns/` may only ever hold proven exceptions layered on top, never a restatement of the mechanics themselves. No section numbering changed.

> **Revision note (v8):** User-mandated removal, 2026-07-21 (same-day follow-on to v7) — `platform_core/knowledge/confidence_patterns/` is removed from the Platform Knowledge layer entirely. §27.2's Confidence Engine rubric remains, unchanged, this spec's own fixed Capability logic; the category never held a document, had no defined calibration-adjustment content distinct from that rubric, and its `dependencies` line reference to it is removed accordingly. No section numbering changed.

> **Revision note (v9):** User-mandated architectural separation, 2026-07-24 — this agent is **renamed from "Execution Agent" to "Automation Execution Agent"** (folder `.claude/skills/execution-agent/` → `.claude/skills/automation-execution-agent/`, frontmatter `name: execution-agent` → `name: automation-execution-agent`) to make explicit that it only ever executes *automated* test suites — it never executes manually-designed test cases directly. That responsibility now belongs to the new **Manual Execution Agent** (Stage 4). This agent's own pipeline position shifts from Stage 5 to **Stage 6** (Manual Execution Agent's insertion at Stage 4 pushes Automation Agent to Stage 5 and this agent to Stage 6). No change to this agent's own mechanics — Execution Mode determination (§5), Result Classification (§17), the Automation Repair Loop (§25–§28), or any Stop Condition/Recovery Strategy — only its name, folder, and stage number.

---

## .claude/skills/reporting-skill/SKILL.md

> **New in this architecture:** No predecessor in `prompts/` — this agent did not exist in the standalone-prompt version of the project. It closes the loop by turning raw execution data into a stakeholder-facing report, distinct from the exploration-stage `QA_Assessment_Report.md` produced by the Explorer Agent.

> **Update:** the report structure is now explicitly: Executive Summary, Detailed Execution Report, Passed/Failed Statistics, Defect Summary, Requirement Coverage, Automation Coverage, Risks, and Recommendations — splitting the previous combined "Coverage Analysis" into distinct Requirement Coverage and Automation Coverage sections, and elevating execution detail and pass/fail statistics into their own sections.

---

## 2026-07-17 — Repository structural refactor

- Removed the legacy `prompts/` folder entirely (superseded by `agents/` + `pipeline/`; no functional references remained — see verification in this refactor's migration report).
- Moved `README.md`, `LESSONS_LEARNED.md`, `PLATFORM_VALIDATION_REPORT.md`, `SESSION_HANDOFF.md` into `docs/`. A short stub `README.md` remains at repo root pointing to `docs/README.md` so GitHub's automatic landing-page rendering still works.
- Extracted this changelog out of the six `agents/*.md` files' embedded revision-history blockquotes.
- Resolved unresolved git merge-conflict markers (`<<<<<<< HEAD` / `=======` / `>>>>>>> main`) discovered in `README.md` during the move — a prior merge commit ("resolve README conflict with main") had not actually completed the resolution.
- Cleaned `.gitignore` of pasted conversation text that had been accidentally merged into it.
- Renamed `platform_core_data/workspace/` to `platform_core_data/workspace/` and moved `runs/` up to be a sibling (`platform_core_data/runs/`) instead of nested — NDC-specific; the platform-wide `platform_core_data/workspace/` convention used by every other project is unchanged.

---

## 2026-07-21 — Platform Knowledge governance review

Findings and full rationale: architecture review conducted this session (not archived as a standalone document — see conversation record). Summary of changes applied:

- **Renamed** `platform_core/knowledge/pipeline/` → `platform_core/knowledge/pipeline_decision_patterns/`. The old name collided with `workflows_and_pipelines/pipeline/`, a different platform layer (the orchestration engine's own spec, not a knowledge category). The folder is held deliberately empty: no agent/workflow is yet named as a reader in `pipeline.md` §10.7, and no Project Knowledge subfolder exists to promote a pattern from — per §10.5, a category cannot legally receive a document without both.
- **Removed** `platform_core/knowledge/skills/` entirely. It had no producer, no consumer, no Project Knowledge counterpart, and its name collided with `.claude/skills/` — the platform's actual Capability layer. "Skills" is Capability, not Knowledge, by the platform's own definition; keeping a same-named folder in the Knowledge layer risked capability logic being written into it by mistake.
- **Tightened the scope** of `execution_patterns/` in `pipeline.md` §10.1 and `knowledge/README.md`: it now explicitly holds only proven, cross-project exceptions to Execution Engine defaults — never the core retry/concurrency/stop-condition mechanics (§5, §19–§20), which remain fixed Capability logic in `execution-agent/SKILL.md`.
- **Corrected** `automation-agent/SKILL.md` and `execution-agent/SKILL.md`'s `dependencies` frontmatter to match `pipeline.md` §10.7's read/write map, which had already listed `framework_patterns/` and `execution_patterns/` respectively as read sources neither agent spec actually declared (see each agent's v7 note above).
- **Removed** `platform_core/knowledge/confidence_patterns/` entirely (same-day follow-on decision, v8 note above) — the category never accumulated a document distinct from §27.2's fixed rubric, so it was cut rather than left open pending future calibration content.
- **Added a document metadata standard** to `knowledge/README.md` (`tags`, `producer`, `consumers`, `promoted_from`, `confidence`, `related_knowledge`, `created`, `last_updated`, `version` frontmatter fields) and retrofitted it onto the three existing documents (`REPAIR-001`, `REPAIR-002`, `REASON-001`) so future AI retrieval and governance auditing don't have to infer producer/consumer/promotion lineage from prose.
- **Extended `knowledge/INDEX.md`'s columns** to include Producer and Consumers alongside the existing ID/Category/Title/Status/Path.

No project-level (`platform_core_data/knowledge_base/`) folders were touched — this review was scoped entirely to `platform_core/knowledge/` and its direct consumers.

## 2026-07-17 — Post-refactor cleanup pass (architecture frozen as baseline)

- Removed `platform_core_data/config/` — it was created empty during the structural refactor above and never given content; the project's real configuration (`run_configuration.md`) already lived at `platform_core_data/` root with working references throughout the repo. Populating `config/` would have meant moving that file, which was out of scope for a non-restructuring cleanup pass. Removing the empty folder was the option that didn't require any rename/move.
- Documented all four of NDC's screenshot locations (`resources/screenshots/`, `ui/screenshots/`, `workspace/discovery/UI Baseline/`, `runs/RUN-*/discovery/*.png`) in `platform_core_data/resources/README.md` — each has a distinct owner and purpose; none overlap.
- This is the architecture baseline going forward — further work should add capabilities, not restructure.

## 2026-07-24 — Automation Asset Lifecycle (Workspace becomes the authoritative automation baseline)

**Reverses NDC's 2026-07-17 structural-refactor decision, deliberately, by explicit user instruction.** That decision made `workspace/automation/{shaft,playwright}/` hold only pointer documentation, on the stated basis that "generated automation code is never duplicated out of the run that produced it" — the *run* was authoritative. As of this revision, the opposite is true platform-wide: `workspace/automation/` (NDC) or `artifacts/automation/` (every other project) is the **Workspace Automation Baseline**, the single authoritative, persistent copy of a project's automation code; every Run works from a temporary working copy of it (new `pipeline.md` §12, Automation Asset Lifecycle).

Why this isn't purely a reversal: `projects/README.md`'s own folder-structure diagram already documented `artifacts/automation/` as "the current-approved Automation Package" for every project *other* than NDC — that promotion mechanism was simply never built (confirmed: OrangeHRM's `artifacts/automation/` was empty while its real generated package sat only inside its one run snapshot). For every project except NDC, this change completes an already-intended, never-implemented mechanism. NDC alone had gone the other direction, explicitly and in writing — that is the one genuine reversal here.

Changes:
- Added `pipeline.md` §12 (Automation Asset Lifecycle): Working Copy Creation, Automation Review (the existing §5.2 gate, unmodified), Workspace Merge (a git-backed three-way merge with baseline-drift conflict detection — never a naive two-way diff, which was found during design review to risk silently deleting a concurrent run's already-merged work), and Cleanup (deletes only files the Merge Summary actually accounted for, never a blind directory delete — real generated packages ship untracked/ignored build output, e.g. `tests_SHAFT/`'s `target/`, `allure-results/`, `generatedReport*.zip`, that must be visibly discarded, not silently vanished).
- Added `platform_core/tools/automation_lifecycle/` (mirroring `platform_core/tools/run_manager/`'s own conventions: CommonJS, dry-run-by-default with an explicit `--apply` flag, `execFileSync('git', [...])` for every git mutation, `node --test`, zero new npm dependencies) implementing the lifecycle mechanically.
- Updated `.claude/skills/automation-agent/SKILL.md` (v7): new §33.2 Working Copy Creation, Execution Rule 35 (never generate directly into the baseline), reframed §9's "existing Automation Package" and the `existing_automation_package` input to mean the baseline copied in at run start, and extended §19's registry description with Baseline Ref / Last Merged Run. This composes with — does not replace — the existing §30–§33.1 Decision Gates.
- Light-touch update to `.claude/skills/automation-execution-agent/SKILL.md` §9: Stage 6 always executes a run's own working copy, never the baseline.
- Updated `run_manager.md` §6 to name `automation_promotion.md` as a new permanent per-run artifact.
- Rewrote `platform_core_data/workspace/automation/shaft/README.md` and `.../playwright/README.md`, which previously stated the now-reversed decision verbatim.
- NDC's two pre-existing "Pending Automation Approval" packages (`tests_SHAFT`, `tests_SHAFT_Agency`) were bootstrap-migrated into the new baseline — recorded as `Promotion Status: Bootstrap Migration`, `Approved By: N/A`, never a fabricated Automation Approval for code not yet reviewed against §5.2's real criteria; their originating runs' Pending status is untouched. See each run's new `automation_promotion.md` and the updated `AutomationPackages.md`.

## 2026-07-24 — One authoritative automation project per framework (reverses this same day's own "v5 multi-package" principle)

**Same-day follow-on to the Automation Asset Lifecycle entry above.** That entry kept the platform's pre-existing "v5" principle (`automation-agent/SKILL.md` §7 Rule 2, §31.5) that a project may hold multiple independent Automation Packages side by side *within the same framework* — which is exactly what produced two separate SHAFT baselines for NDC (`tests_SHAFT`, `tests_SHAFT_Agency`) a few hours earlier the same day. By explicit user instruction, this is now reversed: **a project holds exactly one authoritative Automation Package per framework** — different frameworks may still coexist (a SHAFT project and a Playwright project, say), but never two competing packages within one framework. The user also formalized a **Human Decision Principle** for this class of decision: automation-repository-structure decisions (package/framework selection, new-package creation, merge destination, repository structure) must always follow gather → analyze → recommend → wait for explicit approval, never a default or inferred choice — added as `automation-agent/SKILL.md` §31.6 and cross-referenced from `pipeline.md` §5.5's Human Decisions list.

Changes:
- `.claude/skills/automation-agent/SKILL.md` → v8: rewrote §4's "Existing Automation Package(s)" input row, §7 Rule 2, §9's opening sentence, §19's heading note, §31.1/§31.2/§31.5, and §33's gate wording from "continue an existing package (which one) / create a new package" to "extend the existing project / start a project for a framework with none yet / reset a framework's project from scratch (rare, explicit)." Added §31.6 (Human Decision Principle) and Execution Rule 36. `pipeline.md` §12 (Automation Asset Lifecycle) needed no changes — it was already written in framework-singular-compatible language throughout.
- **Physically consolidated NDC's two SHAFT baselines into one** (`platform_core_data/workspace/automation/shaft/tests_SHAFT/`; `tests_SHAFT_Agency/` deleted). This was not a pure rename — a full file diff (Page Objects, test classes, scaffold files, test data) found the newer package's split Agency test classes were *not* a strict superset of the older combined `Agency_TC.java`: they silently dropped a regression assertion tied to a confirmed business rule (BR-001, Arabic-script-stripped/Latin-CJK-preserved). Per explicit human decision (gathered/analyzed/recommended per §31.6): that assertion pair was ported forward into `Agency_Create_TC.createAgency011_SalesContactArabicScriptReVerification`; a second, lower-value gap (an assertion-free diagnostic scenario, TC-AGENCY-004) was accepted as dropped. Page Objects, by contrast, were confirmed pure supersets — no regressions there. `pom.xml`'s `artifactId` was renamed `NDC_Login_Automation_Export` → `NDC_SHAFT_Automation` (cosmetic — the project now covers the whole framework, not just Login). Full accounting in `AutomationPackages.md`'s Notes and a superseded-pointer addendum in `RUN-20260718-001/automation/automation_promotion.md`.
- No changes needed to `platform_core/tools/automation_lifecycle/` — `copyBaselineIntoRun`/`computeMergePlan`/`applyMerge`/`cleanupRunPackage` already operate on plain baseline/working-copy path arguments with no assumption about how many packages exist per framework; this was purely a specification and instance-data change.

## 2026-07-24 — Manual/Automation Execution separation (pipeline: 6 stages → 7 stages)

User-mandated architectural refactor: split "executing a test" into two distinct responsibilities that the prior single Execution Agent conflated in name only (it always executed automation exclusively; the platform had no stage that executed manually-designed test cases at all).

- **Renamed** `.claude/skills/execution-agent/` → `.claude/skills/automation-execution-agent/` (folder, frontmatter `name`, and every cross-reference across `.claude/skills/`, `workflows_and_pipelines/`, `platform_core/knowledge/`, `README.md`, and project docs). Its responsibility is unchanged: execute already-generated automation, classify results, run the Automation Repair Loop. Its pipeline position shifts from Stage 5 to **Stage 6**.
- **Introduced** `.claude/skills/manual-execution-agent/` as a new **Stage 4**, immediately after Test Design (Stage 3) and before Automation (now Stage 5). It executes the approved Manual Test Suite against the live application, records raw results with full Result Classification and Evidence, and identifies only successfully, stably executed test cases as an **Automation Candidate Package** — never deciding what gets automated, never executing automation code.
- **Rewired** the Automation Agent's primary input: it now consumes the Manual Execution Agent's Automation Candidate Package (which test case IDs are in scope) plus the Manual Test Suite (their full content) — no longer reading the raw Manual Test Suite as its own scope-determining source. Its pipeline position shifts from Stage 4 to **Stage 5**. Gets its own new Human Review Required checkpoint at Stage 4 (Manual Execution), distinct from the existing Automation Approval Required checkpoint, now at Stage 5.
- **Updated** every pipeline-level document (`workflows_and_pipelines/pipeline/pipeline.md`, `run_manager.md`, `run_scope.md`, `README.md`, and the three named workflows) to reflect the new 7-stage order, the new `manual_execution/` artifact folder and Run Workspace subfolder, and the renamed downstream agent.
- **No change** to any stage's core mechanics beyond the above — Discovery, Test Design's own traceability/coverage model, the Automation Decision Engine, the Result Classification set, the Automation Repair Loop, and Reporting's coverage computation are all unchanged.
