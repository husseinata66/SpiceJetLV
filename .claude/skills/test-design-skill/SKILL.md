---
name: test-design-skill
description: Stage 3 (shared by both pipelines, and the divergence point) in the Agentic AI Testing Platform (Requirement-Driven Test Engineering skill). Transforms the approved Project Context plus Discovery Artifacts/Findings/Evidence into a fully-traceable Manual Test Suite (Markdown + Excel), Requirement Traceability Matrix, and Coverage Report. Its approved output is the sole scope-determining input for BOTH the Manual Execution branch (4M) and the Automation branch (4A). Use when designing manual test cases for a project after Discovery is approved.
inputs:
  - name: project_context
    type: file_path
    required: true
    description: Approved Project Context — primary source of testable requirements.
  - name: discovery_artifacts
    type: file_path
    required: true
    description: Approved Discovery Report, QA Assessment Report, Findings Summary, and per-Finding Evidence Packages at `platform_core_data/modules/{{MODULE_SLUG}}/discovery/` — secondary inputs used only to validate, enrich, and surface gaps against the Project Context.
outputs:
  - name: manual_test_suite_md
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.md"
    description: Human-readable manual test cases, grouped by module.
  - name: manual_test_suite_xlsx
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.xlsx"
    description: Identical test case set, spreadsheet form. GENERATED from the Markdown suite by platform_core/tools/test_suite_export (§9.1) — never authored or hand-edited, which is what makes it provably non-divergent.
  - name: traceability_matrix
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md"
    description: "Project Context requirement ID → Test Case ID mapping, annotated with Discovery/Finding/Evidence references."
  - name: coverage_report
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.md"
    description: Requirement Coverage and Finding Coverage accounting, structured per the Standard Output Contract (§18).
  - name: coverage_report_html
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.html"
    description: HTML companion of the Coverage Report, in the platform's shared report design (§12A, pipeline.md §17) — generated from CoverageReport.report.json by report_builder. A rendering for stakeholders, never the approved artifact.
dependencies:
  - project-context-skill (upstream skill)
  - explorer-skill (upstream skill)
  - platform_core/tools/test_suite_export (renders the authored Markdown suites to Excel — §9.1)
---

> **Pipeline position:** Stage 3 — **shared by both pipelines, and the point at which they diverge.** Consumes the Project Context (primary) and Discovery Artifacts, Findings, Evidence Packages, and the QA Assessment Report (secondary); produces Manual Test Suites.
> **Both branches consume this stage's approved output directly and independently** — Stage `4M` executes these test cases by hand, Stage `4A` generates automation from them. Neither depends on the other (`workflows_and_pipelines/pipeline/pipeline.md` §3.3).
> **Test cases are authored branch-agnostically:** a test case is never marked "manual" or "automated" here. How it is later verified is the branch's decision, not this stage's.
> **Traceability:** `Project Context → Test Cases`, informed and validated by `Discovery → Test Cases` and, where applicable, `Finding/Evidence → Test Cases`.
> **Revision history:** see `docs/CHANGELOG.md`.
>
> **Revision note (2026-07-27, user-mandated):** each artifact is **one file, edited in place**: no `.vN` suffixes, and **no duplicate "final" copy is ever written on approval**. Refinement edits the same file the reviewer read. Git is the version history. See `workflows_and_pipelines/pipeline/pipeline.md` §7.
>
> **Revision note (2026-07-29, user-mandated):** this stage's output moves to the **module workspace** — `platform_core_data/modules/{module}/test_design/` — and is **durable**: a suite refined six runs later is the *same file*, at a higher revision, not a fresh copy in a new run folder. Three consequences follow, and they are the reason the move matters here more than anywhere else:
>
> 1. **Both branches read one suite per module, at its current revision.** Stage `4M` and Stage `4A` resolve `modules/{module}/test_design/` and read the artifact's own `status:` header to confirm approval — never a cached status (`module_architecture.md` §10.5).
> 2. **A refinement does not invalidate an earlier execution.** The run that executed revision 2 recorded that it did (`run.json` → `moduleArtifactRefs[]`), so its results stay interpretable after this suite reaches revision 5.
> 3. **Staleness is reported, never auto-resolved.** When a module's Discovery is refined after this suite was written, the suite is flagged stale — but it is **never silently regenerated**. Re-running this stage is a human decision at this stage's own gate (`module_architecture.md` §10.4).
>
> A multi-module invocation writes one suite (plus matrix and coverage report) **per module**, never one merged suite. Nothing about the Test Case Schema, the four traceability dimensions, Excel generation (§9.1), or the Stage 3 gate changes.

# 1. Skill Name

**Test Design skill** (Requirement-Driven Test Engineering skill) — v3

# 2. Purpose

The Test Design skill transforms validated project knowledge — the approved Project Context, Discovery Report, Findings, Evidence Packages, and QA Assessment Report — into a complete, structured set of manual test assets with full, explicit, four-dimension traceability. It is the quality gate between "what the business requires and what was actually observed" (Stages 1–2) and everything that verifies it — and it is where the pipeline forks: its approved output feeds **both** the Manual Execution branch (Stage `4M`) and the Automation branch (Stage `4A`), independently and in either order (`pipeline.md` §3.3).

**One suite, two consumers, no per-branch authoring.** This skill writes each test case once, branch-agnostically. It never splits its output into "manual test cases" and "automation test cases", and never marks a case as belonging to one branch — that would pre-empt a decision neither branch has made yet, and would make the same requirement's manual and automated coverage incomparable.

**The Project Context is this skill's primary source of truth.** Discovery Artifacts, Findings, and Evidence Packages — everything the Explorer skill produced — are secondary inputs used to validate that requirements hold in the live application, enrich test scenarios with real UI detail and observed evidence, detect undocumented behavior, and ensure every Finding is deliberately accounted for in the test suite. None of these secondary sources is ever treated as more authoritative than the Project Context; where they disagree, the disagreement is recorded as a discrepancy, not silently resolved in favor of whichever source this skill happens to read first.

**As of v2, this skill's responsibility extends beyond writing test cases.** It is now accountable for: full traceability (§5) on every test case; systematic, category-complete negative-test generation (§7); measured, reported test coverage against both requirements and Findings (§8); and the platform's own canonical, multi-format output (§9). This skill designs and tracks tests; it does not execute them, write automation code, touch a live environment, or produce output shaped around any external tool.

**This skill must never read the PRD directly.** Per `workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 4, only the Project Context skill (Stage 1) may read the PRD. This skill's complete brief on requirements is the Project Context; it does not independently re-consult the PRD to "double check" or fill in a gap, even where the Project Context is silent — silence is itself the correct signal (§4, §6).

**This skill is part of the platform core and must remain platform-agnostic.** It never shapes its output, schema, or terminology around any specific external ALM, issue-tracking, or test-management system. It produces the platform's own canonical artifacts (§9) and nothing else; any future integration that maps those canonical artifacts into a third-party tool's format is a separate, external concern, outside this skill's — and the core architecture's — scope.

# 3. Responsibilities

- Read the Project Context in full as the primary and authoritative source of testable requirements (scope, roles, business rules, validation rules, security requirements, environment constraints, carried-forward assumptions/risks).
- Read the Discovery Report, Findings, Evidence Packages, and QA Assessment Report as secondary inputs, used only to:
  - **Validate requirements** — confirm that what the Project Context describes actually holds true in the observed application
  - **Enrich scenarios** — add real UI detail (exact field labels, error text, component behavior) and cite specific observed evidence that makes a test case concrete, executable, and evidence-grounded
  - **Detect undocumented behavior** — surface behavior the application exhibits that the Project Context never mentioned
  - **Identify gaps** — flag any place Discovery, a Finding, or Evidence contradicts or extends beyond the Project Context
- Derive test cases primarily from the Project Context's requirements; use Discovery/Findings/Evidence to sharpen, validate, and evidence those test cases — never to introduce requirements the Project Context does not contain.
- Where a secondary source reveals a gap or contradiction, generate the test case against the Project Context's stated requirement, and separately log the discrepancy for the Project Context skill / stakeholders to resolve — do not silently defer to whichever source seems more "real."
- Only consume secondary-input artifacts that have themselves cleared their own pipeline checkpoint (§4) — never draft test cases against a Discovery Report, Findings set, Evidence Package, or QA Assessment Report that is still `Pending Review`.
- For every testable requirement, design (at minimum, where applicable):
  - One positive / happy-path test case
  - Negative test cases across every applicable category in the Negative Test Generation Engine (§7) — not just one generic "invalid input" case
  - One boundary / edge-case test case
  - One security or access-control test case, where the requirement carries security implications
- **Ensure every Finding produced by the Explorer skill is explicitly dispositioned** (§5.3) as exactly one of: a regression test case, an exploratory test case, or a documented exception with stated reasoning — never silently omitted from the test suite.
- Carry forward every `> Assumption` and Risk entry from the Project Context into the corresponding test case, marked as an assumption-based test that must be verified before execution.
- Produce a full Requirement Traceability Matrix mapping Project Context requirements to test case IDs, annotated with the Discovery/Finding/Evidence references that validated, enriched, or contradicted each one, plus a Coverage Report (§8) quantifying requirement and Finding coverage.
- Produce the Manual Test Suite in the platform's own canonical formats only — Markdown and Excel (§9) — with no tool-specific export of any kind.
- Never invent functionality, workflows, requirements, or business rules not documented in the Project Context.
- **Adapt test design strategy to the run's Run Scope Type** (§16) — an Entire Project pass, a single User Story's acceptance-criteria-driven cases, and a Bug's reproduction-plus-regression cases are different activities at different depths, not one default approach applied uniformly.
- **Systematically evaluate every Required Dimension** (§17) — Business Rules, Error Handling, Permissions, Configuration, Regression Impact, Integration Behaviour, Risk-based prioritization, and Exploratory Recommendations — for each testable requirement, alongside the existing Negative Test Generation categories (§7), recording "Not Applicable — {reason}" rather than silently skipping any of them.
- **Report Coverage using the full category set** (§8.3) — Covered, Partially Covered, Out-of-Scope, and Unknown/Unassessed — not only a binary Covered/Uncovered split.
- **Produce output conforming to the Standard Output Contract** (§18) so the Automation skill never has to interpret free-form prose to find what it needs.
- **Recognize named Stop Conditions** (§19) and, rather than halting the entire run over one blocked item, recommend the smallest missing prerequisite needed to unblock it (§20) while continuing to design every other requirement that isn't blocked.
- **Verify handoff completeness before concluding a run** (§21) — confirm every input the Automation skill's own specification declares it needs is actually present, specific, and unambiguous, not merely assumed.

# 4. Inputs

| Input | Role | Required? | Description |
|---|---|---|---|
| Project Context | **Primary** | Required, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` — the sole source of requirements, scope, roles, and business rules for test design |
| Run Scope | Primary (embedded) | Required | Not a separate file — the Type/Source recorded in the Project Context's own Scope Summary (`workflows_and_pipelines/pipeline/run_scope.md` §3–§4). Called out here explicitly, not left an implicit read of prose, because it is what §16's strategy selection keys off of. |
| **Application Context** | Secondary | Optional — read when it exists | `platform_core_data/modules/ApplicationContext.md` ([`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §6.7) — the **relationships between** modules: dependency graph, cross-module rule index, end-to-end journeys, and the **fixture build order**. Read for what a single module's context cannot state: which records must exist upstream before this module's scope is exercisable at all. It carries no module's scope and never overrides the Project Context. |
| Discovery Report | Secondary | Required, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/*.md` (including `Timeline.md` and `Coverage_Summary.md` where the Explorer skill version in use produces them) — raw structural/behavioral observation, used only to validate, enrich, and identify gaps against the Project Context |
| QA Assessment Report | Secondary | Required, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md` — the Explorer skill's synthesized report (Application Overview, Workflows, Risk Analysis, Gap Analysis, Coverage) |
| Findings | Secondary | Required if any exist for this run, must be `Approved` | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/Findings_Summary.md` plus each individual `FINDING-{ID}_{ShortName}/metadata.md` — every Finding must be read and dispositioned (§5.3), not merely skimmed |
| Evidence Packages | Secondary | Required wherever a Finding or negative test cites specific evidence, must be `Approved` alongside its parent Finding | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/FINDING-{ID}_{ShortName}/` — the captured evidence files backing each Finding, cited by reference (§5.1), never copied wholesale into a test case |

**Reading the Application Context is not a licence to widen scope.** It answers *what must exist before this module can be tested* — the fixture build order and the upstream dependencies — and nothing else. A dependency named there becomes a **precondition or a setup step** in a test case, never a new test target: another module's behaviour stays that module's to verify. Where the two disagree about this module, **the Project Context wins**.

**This skill must never read the PRD directly** (`platform_core_data/knowledge_base/PRD.md` or equivalent) — only Stage 1 (Project Context skill) is permitted to do so, per `workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 4. Any requirement question this skill cannot resolve from the Project Context is a gap to log, not a reason to open the PRD.

**This skill must never read `platform_core_data/` (Project Knowledge) directly, either** — `onboarding.md`, `architecture.md`, `glossary.md`, `run_configuration.md`, and `resources/` are Stage 1's inputs to reconcile into the Project Context; by the time Stage 3 runs, whatever from Project Knowledge is relevant has already been folded in. Re-reading Project Knowledge directly would let this skill silently reintroduce detail the Project Context skill deliberately scoped out — the same failure mode the PRD prohibition exists to prevent, applied to the other upstream source.

**Hidden-assumption check: Acceptance Criteria are not a separate input — they must arrive embedded in the Project Context's requirement statements.** Nothing upstream of this skill guarantees a User Story's acceptance-criteria-level granularity survives being distilled into the Project Context; if a requirement's Project Context entry is summarized down to a level where individual acceptance criteria can no longer be identified, that is an "Incomplete acceptance criteria" Stop Condition (§19), not something this skill infers or reconstructs on its own.

**Every input above must be in an `Approved` checkpoint state before this skill consumes it.** If any required input is still `Pending Review`, `Pending Automation Approval`, or `Rejected`, this skill must halt and report the blocking artifact rather than proceeding against a draft.

# 5. Traceability Model

Every generated Test Case must trace back to, and explicitly cite, up to four sources. This traceability must be **explicit** — present as named columns in the Requirement Traceability Matrix, keyed by Test Case ID (§6.2; the test case document itself stays lean per the Test Case Writing Standard, §6.1) — never left implicit or inferable only from context.

## 5.1 The Four Dimensions

| Dimension | Field Name | Mandatory? | Populated From |
|---|---|---|---|
| Requirement | Requirement Reference | **Always mandatory** | The specific Project Context requirement ID/section (e.g., `FR-12`, `BR-1`, `SR-3`) this test case verifies |
| Discovery | Discovery Reference | **Always mandatory** | The specific discovery snapshot, Timeline entry, or QA Assessment Report section that validated or enriched this test case, or `"Not independently verified in Discovery"` if the requirement was never specifically exercised during exploration |
| Finding | Finding Reference | Mandatory when applicable; otherwise `N/A` | The specific Finding ID (e.g., `FINDING-003`) this test case exists to regress-test, exploratorily re-test, or otherwise addresses |
| Evidence | Evidence Reference | Mandatory when a Finding Reference is populated; otherwise `N/A` | The specific evidence file(s) within that Finding's Evidence Package (e.g., `FINDING-003/failure.png`) that ground this test case's Test Data or Expected Result |

A test case with a populated Finding Reference but an `N/A` Evidence Reference is incomplete and must not be published — if a Finding is being tested, its evidence is what makes the test case concrete (e.g., using the exact reproduction steps and expected failure/success state the Evidence Package documented).

## 5.2 No Test Case Without Traceability

**No test case may be created without at least a Requirement Reference and a Discovery Reference.** A test case with neither is, by definition, untraceable to this pipeline's sources of truth and must not be generated — if this skill finds itself wanting to write a test case with no traceable source, that is itself a signal to log a gap (a `Requirement Gap`/`Test Gap`-shaped note in the Coverage Report, §8) rather than to invent a requirement to justify the test case.

## 5.3 Finding Disposition — Every Finding Becomes Exactly One Outcome

Every Finding in the approved Findings Summary must be explicitly dispositioned as **exactly one** of the following. This disposition is recorded in the Coverage Report (§8) and, where applicable, in the resulting test case(s):

| Disposition | When to use | Resulting Artifact |
|---|---|---|
| **Regression test** | The Finding's Status is `Confirmed`, or it otherwise represents a defect the team intends to fix — a test case is needed to catch its reintroduction. | A test case with this Finding as its Finding Reference, Category-appropriate negative/edge framing (§7), and Expected Result reflecting the *correct* (post-fix) behavior, not the buggy behavior observed. |
| **Exploratory test** | The Finding's Status is `Needs Human Review` and the underlying ambiguity is a judgment call best re-examined by a human tester rather than automated as a fixed pass/fail — e.g., a security/enumeration concern whose acceptability depends on a policy decision not yet made. | A test case (or a clearly-scoped exploratory charter within one) whose Expected Result is framed as "confirm with reviewer whether X is acceptable," not a fixed pass/fail assertion this skill itself cannot responsibly assert. |
| **Documented exception** | The Finding's Status is `Rejected` (already resolved as a non-issue) or `Duplicate`, or the Finding falls outside this run's testable scope for a stated reason (e.g., requires an environment/credential this project doesn't have). | No test case generated; instead, one row in the Coverage Report (§8) naming the Finding, its disposition, and the one-line reason — this still counts as "covered" for coverage-percentage purposes, since it reflects a deliberate decision, not an oversight. |

**A Finding with no disposition at all is an "Uncovered Finding"** (§8) and is a defect in this skill's own output, not an acceptable outcome — the Coverage Report must show zero Uncovered Findings for a complete run; any nonzero count must be explained, not silently shipped.

## 5.4 Extended Traceability Dimensions

Alongside the four mandatory dimensions in §5.1 (unchanged — Requirement, Discovery, Finding, Evidence), every test case additionally carries two further traceability fields wherever they apply:

| Dimension | Field Name | Mandatory? | Populated From |
|---|---|---|---|
| Acceptance Criteria | Acceptance Criteria Reference | Mandatory when the governing requirement is a User Story with enumerated acceptance criteria; otherwise `N/A` | The specific acceptance-criterion statement (quoted or closely paraphrased) this test case verifies — more granular than the Requirement Reference alone, so a reviewer can see exactly which bullet of a User Story this case covers |
| Run Scope | Run Scope Reference | **Always mandatory** | The Run Scope Type/Source (§4's "Run Scope" input) this test case was generated under — lets a reviewer immediately see whether a case came from an Entire Project pass, a specific User Story, a Bug reproduction, etc., without cross-referencing the Project Context separately |

A **Business Rule Reference** is not a seventh dimension on every test case — it is carried as part of the existing Requirement Reference wherever the Project Context states the requirement as a business rule (e.g., `BR-4`) rather than a functional requirement (`FR-12`); the Project Context's requirement IDs already distinguish FR/BR/SR by prefix (as used throughout this document's own examples), so no new field is needed — only the explicit statement, here, that a `BR-` prefixed Requirement Reference *is* the Business Rule traceability this review area asked for.

These two additional fields extend, and never substitute for, the four mandatory dimensions in §5.1 — a test case still cannot exist without a populated Requirement Reference and Discovery Reference regardless of whether Acceptance Criteria/Run Scope apply.

# 6. Test Case Schema

**Canonical Test Case Writing Standard, per explicit user instruction (2026-07-25):** every test case must prioritize clarity, simplicity, and executability over exhaustive detail. The goal is that any QA engineer, regardless of project familiarity, can read a test case once and execute it correctly without additional explanation — **the test case is for execution, not analysis.** Traceability, Risk, and categorization detail (§6.2) still exist and are still mandatory for the pipeline's traceability guarantee (§5.2) — they are simply recorded in the Requirement Traceability Matrix (keyed by Test Case ID) and Coverage Report, not written as inline fields on the test case document itself, so the execution-facing document stays lean.

### 6.0 Lean Test Case Philosophy (Canonical)

**The purpose of a test case is to verify one business behavior — not to document the entire application workflow.**

- **One business behavior per test case.** A test case that chains multiple unrelated actions ("Create Agency, verify validation, approve Agency, edit Agency, reject Agency, search Agency") must be split into independent test cases, each verifying exactly one thing. Whenever a case is legitimately broader than one atomic rule, its Granularity Tier (§6.0.1) must be explicitly Scenario or End-to-End, stated on the case itself — never an unexplained bundle left to read as if it were Atomic.
- **One verdict per data set.** Execution records one result per `(Test Case ID, Assertion ID)`, so a case cannot yet carry a separate result for each of several data sets. When the same behavior must be checked with several data sets that each need their own pass/fail and evidence (e.g. each Mandatory field left empty, each Cabin Class), write **one case per data set**, each kept short by citing shared setup and rules (§6.1b). A single case with one combined verdict over a list of values is allowed only when the requirement itself is about the list as a whole (e.g. "the dropdown offers exactly these five options"). *(Parameterized cases with a result per data set are a planned, not yet supported, extension.)*
- **A tester should understand the test within 30 seconds**, and be able to execute it without reading additional documentation outside the suite file. This is a tighter, comprehension-focused bar than the Success Criteria's two-minute *execution* bar below — both apply.
- **Write like a human** — as if giving instructions to another QA engineer, not documenting requirements. Avoid long paragraphs, requirement-style wording, explaining obvious actions, or describing internal implementation.
- **Steps carry actions; Expected Result carries verification — never mix them.** "Click Save and verify the validation message appears" is two things in one step; write "Click Save." as the step and put the validation message in Expected Result.
- **Don't repeat shared setup in Steps.** Setup that only prepares the case goes in Preconditions as a state ("User is on Flight Search as Admin."), not as numbered steps repeated in every case. Setup or comparison logic shared by several cases is written once as a Shared Definition (§6.1b) and cited by ID.
- **Test Data uses only the minimum values required** to execute the case — don't overload the reader with values the steps never reference.
- **Notes are for genuinely helpful execution context only** — never move essential execution information (a step, a value, the actual expected outcome) into Notes to keep Steps short; that's hiding required content, not simplifying. **Notes never carry traceability** — no Requirement, Discovery, Finding, or Evidence references; those belong in the Traceability Matrix (§6.2).

### 6.0.1 Test Case Granularity (Canonical)

Before creating or modifying a test case, determine its intended scope. Every test case is **exactly one** of the following tiers, recorded as a Tag (§6.1):

| Tier | Verifies | Examples |
|---|---|---|
| **Atomic** | A single business rule or validation. | "Create Agency without Product Access," "Reject Active Agency," "Search by Agency Name." |
| **Scenario** | One complete user workflow composed of several related business rules. | "Successfully create a new Agency," "Complete Agency approval workflow," "Update Agency information." |
| **End-to-End (E2E)** | An entire business journey spanning multiple screens or modules. | "Agency Creation → Approval → Availability for Booking." |

**End-to-End test cases must:**
- Clearly state, in the Objective, that they are workflow tests spanning multiple screens/modules.
- Never replace the Atomic or Scenario test cases that cover the same ground in isolation — E2E is additive, confirming composition, not a substitute for per-rule coverage.
- Be tagged `E2E` (§6.1) — Atomic and Scenario tiers are likewise always tagged (`Atomic` or `Scenario`) so the tier is never left implicit.
- Focus on verifying the overall journey rather than re-asserting every individual validation already covered at the Atomic/Scenario tier.

**Never mix unrelated business behaviors simply to reduce the number of test cases** — a Scenario or E2E tier is earned by genuinely composing related rules into one real workflow, not used as cover for bundling.

**Readability Check — apply before finalizing every test case:**
1. Can a new QA engineer execute it without help?
2. Can it be understood in under 30 seconds?
3. Is every step necessary?
4. Is there any redundant wording?
5. Does it verify only one business rule?
6. Does every expected point name a measurable value and come from a stated source (§6.1a)?

If any answer is "No" (or "Yes" to question 4), rewrite the test case.

**Golden Rule: if removing a sentence does not change how the test is executed, remove it.** Every sentence must help the tester execute or verify the test — nothing else earns its place in the document.

## 6.1 Test Case Fields (Manual Test Suite document)

Every Test Case in the Manual Test Suite (Markdown/Excel) contains exactly these fields, in this order — no more:

- **Test Case ID** — a stable, unique identifier (e.g., `TC-LOGIN-001`), scoped per module
- **Title** — a short, specific, human-scannable summary (see Title Rules below)
- **Objective** — one sentence stating what this test case verifies (see Objective Rules below)
- **Preconditions** — only what's required immediately before execution (e.g., "User is logged in as Admin.")
- **Test Data** — the specific input values used, kept simple (e.g., `Agency Name: QA_AGENCY_001`), including, for negative tests, the exact boundary/invalid value being exercised (§7); omit this field entirely when a case has no test data
- **Steps** — a numbered list, one user action per step (see Step Writing Rules below)
- **Expected Result** — the specific, observable outcome that constitutes a pass, as a numbered list with one verification point per line (see Expected Result Rules below) — for a regression test derived from a Finding (§5.3), this is the *corrected* behavior, never a restatement of the bug
- **Priority** — execution priority (P1–P4), reflecting how urgently this case should run relative to others
- **Tags** — short labels only, always including the Granularity Tier (`Atomic`/`Scenario`/`E2E`, §6.0.1, mandatory on every case), plus e.g. `Smoke`, `Regression`, `Negative-InvalidInputs` — the compact, at-a-glance categorization that replaces what used to be separate Category/Test Type fields on the test case itself; never a paragraph. **The `AutomationCandidate` tag is retired** (2026-08-01) — the `Automation` column below is now the single authoritative automation decision, so a tag that could disagree with it no longer exists
- **Notes** *(optional)* — anywhere additional explanation is genuinely needed, so Steps/Expected Result never grow long carrying it instead (see "If additional explanation is needed" below)
- **Review** — the human review status of this case after Stage 3. `Pending` | `Approved` | `Rejected`, default **`Pending`** (§6.3)
- **Automation** — whether this approved case should be automated. `Pending` | `Approved` | `Rejected`, default **`Pending`** (§6.3)
- **Requires** — the Supplier capabilities this case cannot run without. `None` | one or more of `Hold`, `Pay after Hold`, `Meal`, `Baggage`, `Seat`, `Bundle` joined with `+` | `Not <capability>`, default **`None`** (§6.2a)
- **Supplier Rule** — the Supplier-specific rule this case tests, as its slug (e.g. `ladies-only-seats`); empty for a case that applies to every Supplier (§6.2a)
- **Assertions** — the case's structured assertions: one row per verification point of its Expected Result, `Assertion ID · Expected · Expected Source · Check · Requirement`. **Required on every new or materially updated case** (§6.1a); an unchanged legacy case keeps its existing form

### Step Writing Rules

- One user action per step. One verification per expected result.
- Short, direct sentences — no unnecessary technical jargon, no long paragraphs.
- Good: "1. Open the Agency page. 2. Click **Create Agency**. 3. Enter a valid Agency Name. 4. Leave the Product Access section empty. 5. Click **Save**."
- Bad: "Navigate to the Agency management module, ensuring all required prerequisites are satisfied before attempting to initiate the creation workflow…"

### Expected Result Rules

Write only what the tester should verify — complete but minimal, never a hedge or a value judgment.

- **A numbered list, one verification point per line.** No paragraphs. A single-point result may stay one line.
- **Tag each point with its Assertion ID** — `1. [A1] …` — so the reader sees which assertion records each point. Every point has exactly one row in the Assertions table (§6.1a), and every row has a point.
- **Measurable.** Name the exact value, message, status, count, or state. Quote UI text and values in `backticks`.
- **From a source, never from observation** — every point comes from a requirement, an API contract, or a confirmed business rule (§6.1a). What the system was seen doing in Discovery may sharpen the wording, but is never the reason a value is expected.

Good:
```
1. [A1] Status code is `404`.
2. [A2] `$.error.code` is `USER_NOT_FOUND`.
```
Bad: "The application should ideally validate according to the business rules and prevent the user from proceeding."

### Steps, Test Data and Expected Result by test type

The schema is the same for every test type; only the vocabulary changes.

| Test type | Steps are | Test Data is | Expected Result checks |
|---|---|---|---|
| UI | user actions on named screens/controls | field values | messages, field/screen state, displayed values |
| API | requests: method, endpoint, headers/auth, body | path/query/body values | status code, body fields by JSON path, headers |
| Integration / parity | trigger the flow on each side, capture both outputs | the shared input | source vs. target values, field by field |
| Batch / queue | load input, run the job or publish the message | input data set / message | output data, side effects, consumer state |
| E2E | one step per screen/service hand-off | the journey's data | the journey's end state (per-rule checks stay in Atomic cases) |

### Title Rules

Keep titles short and specific, describing the behavior under test: "Create Agency successfully," "Create Agency without Product Access," "Reject Pending Agency," "Search Agency by Name," "Update Agency Status."

- Good: "Create Agency without Product Access"
- Bad: "Verify that the Agency creation process correctly validates mandatory Product Access configuration before allowing successful submission"

### Verify One Thing

Each test case validates a single behavior — split anything that doesn't.

- Good: "Create Agency without Product Access"
- Bad: "Create Agency, verify validation, approve Agency, edit Agency, reject Agency, search Agency" — split into independent test cases instead.

### Objective Rules

One sentence only. Example: "Verify that an Agency cannot be created without Product Access."

### Avoid, in the test case itself

Do not explain why every step exists. Do not include implementation details. Do not speculate. Do not describe internal logic. Do not write requirement documentation inside the test case — that belongs in the Traceability Matrix/Coverage Report (§6.2), or in Notes if it's a genuinely necessary execution caveat, never inline in Steps or Expected Result.

### Success Criteria

Every test case should be executable by a new team member in under two minutes of reading. If a step feels difficult to understand, rewrite it using simpler language. The reader should immediately know: what to do, what to expect, and whether the test passed or failed.

## 6.2 Traceability, Risk, and Categorization — recorded in the Traceability Matrix and Coverage Report, not on the test case

The following are still mandatory pipeline outputs — nothing here is dropped, only relocated out of the execution-facing test case document:

- **Requirement Reference, Discovery Reference, Finding Reference, Evidence Reference, Acceptance Criteria Reference, Run Scope Reference** (§5.1, §5.4) — recorded in the Requirement Traceability Matrix, one row per Test Case ID, per the same mandatory/`N/A` rules as before. §5.2's "No Test Case Without Traceability" rule is unchanged: a test case with no corresponding Requirement Reference and Discovery Reference row in the Matrix must not be generated.
- **Risk** (Level + one-line statement, derived from a populated Finding's own Business/Technical Risk where applicable) — recorded in the Traceability Matrix's Risk column, aggregated in the Coverage Report's Risks section (§18 #9).
- **Category** (Positive/Negative-{subtype}/Exploratory/etc., §7) and **Test Type** (Smoke/Regression) — recorded as compact Tags on the test case (§6.1) *and* rolled up in the Coverage Report's Test Scenarios section (§18 #5) for at-a-glance breakdown.
- **Automation decision** — **no longer recorded here.** *(Revised 2026-08-01.)* It is now the `Automation` column on the test case itself (§6.3), a **binding** decision rather than the advisory `AutomationCandidate` tag and Coverage Report listing it replaces. Stage `4A` consumes a case only when `Review = Approved AND Automation = Approved` (§6.3.2). The `Automation` column alone is never read by Stage `4M` — but `Review` is, by both branches (§6.3.2).

## 6.1a Structured Assertions — the assertion contract (Phase 5.8)

**Every new or materially updated case states its assertions**, written directly after its Expected Result (`TestCase_entry.md`):

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Sign-in is refused | Expected Result | present | AC-1 |
| A2 | `Account locked` | Expected Result | equals | AC-1 |

- **One row per verification point** the Expected Result makes — nothing it does not make. A row is never invented to fill a table; a verification point that cannot be stated as a checkable expectation is rewritten in the Expected Result first.
- **No redundant rows.** Two rows that would always pass or fail together are one row. But never merge two points that can fail independently — each keeps its own row, result, and evidence.
- **Assertion IDs are stable.** `A1`, `A2`, … within the case; never renumbered, and a removed assertion's ID is not reused. Stages 4M and 5A record each result against `(Test Case ID, Assertion ID)`.
- **Expected** is the value or condition itself (`404`, `count(A) = count(B)`, `` `Account locked` ``) — never a description of what is being looked at ("number of flights").
- **Expected Source names where the value comes from**, never an observation. Use one of: a requirement ID (`AC-3`, `FR-12`, `BR-4`), an API contract (below), `Test Data` (the value is the input echoed back), or a platform artifact by path. `Expected Result` points back at the case itself; it is still accepted, but new cases name the real source.
- **Check** names the comparison (`equals`, `contains`, `matches …`, `within ±N`, `≥`/`≤`, `present`, `absent`, …); **Requirement** names what it verifies. Every Requirement ID here must appear in the case's Traceability Matrix row (§6.2).
- **Same check, same shape.** Sibling cases that verify the same thing (e.g. the same comparison for different inputs) use the same rows in the same order, so results can be compared across cases.
- **Approval is gated.** `cli.js state approve 3` (and `approve-scope` for the cases it approves) is refused — `ASSERTIONS_REQUIRED` — while a case that is new or materially changed since the suite was last approved (anything but its Review / Automation decision) has no valid table. **Unchanged legacy cases are never required to gain one, and are never rewritten automatically.** Test Case IDs never change.
- **Non-blocking checks.** At approval, a new or changed case whose Expected Source is `Expected Result` gets an `advisory:` line (never a refusal; unchanged cases get none). `run_manager/cli.js state trace` reports `assertion-requirement-not-traced` when an assertion's Requirement ID is missing from the case's Traceability Matrix row (Matrix ranges such as `SRCH-02…09` count). The Matrix stays the single source of traceability; fix the gap there.
- The table is exported to the workbook as the last column, `Assertions` (§9.1), so the two renderings stay identical.

**Assertions that come from an API contract (Phase 7, `pipeline.md` §8.2).** Write the **Expected Source** as `API contract <METHOD> <path> [<status>] [<$.json.path>]`, or `API contract <operationId> [<status>] [<$.json.path>]`, e.g. `API contract GET /users/{id} 200 $.status`. The Expected value still comes from the approved contract or the requirement, never from an observed response.

- **The JSON path is authoritative.** A change to `$.category.name` reaches `$.category` and `$.category.name`, never `$.tags[].name`.
- **Name a field whenever there is one.** An assertion that names only the endpoint is reported as ambiguous potential impact, for a human to resolve.

- **Why it matters:** contract impact analysis (`api_contract`) can then mark exactly this assertion as **confirmed** when that field, status code or enum value changes.
- **A case that mentions an endpoint only in its Steps** is reported as **potential** impact.
- **When an accepted contract change reaches an approved case,** a named human records one decision for it: `api_contract/cli.js impact-decision … --decision no-change-needed|update-required|updated|retire`.
- **This Skill never updates a case because a contract changed.** The update is made here, as a normal change to approved work (impact analysis, then re-approval). `updated` can be recorded only after the case really changed and is Approved again.
- **Assertion IDs are never renumbered for it.**

## 6.1b Shared Definitions — setup and validation rules written once

When several cases share the same setup or the same comparison logic, write it **once** in an optional `## Shared Definitions` section at the top of the suite (before the Case Index) and cite it by ID. Each case still names everything it needs; it just names it instead of copying it.

| Definition | Heading | Body | Cited from |
|---|---|---|---|
| **Setup** | `### SETUP-n — Title` | numbered steps that reach a ready state | Preconditions: `SETUP-1.` |
| **Validation Rule** | `### VR-n — Title` | `**Source:**` line (mandatory), then the procedure, one sub-check per line (`VR-n.1`, `VR-n.2` …), what is ignored, and when the result is Inconclusive | Steps: `Apply VR-01.` · Assertions `Rule` column: `VR-01.2` |

- **A Validation Rule's Source is a requirement, contract, or confirmed business rule** — never an observation (§6.1a).
- **A case that cites a rule still has its own Expected Result and Assertions rows**, one per sub-check it relies on, with the sub-check in an optional `Rule` column. Execution still records each `(Test Case ID, Assertion ID)` separately.
- **Only extract what is genuinely shared.** A step used by one case stays in that case. Do not create definitions to look tidy.
- **Changing a definition changes every case that cites it.** The cited text is part of each citing case's fingerprint, so those cases — and only those — count as materially changed: their Assertions are re-checked at approval, and an approved citing case follows the §6.3.1 rewrite rule.
- **Mechanically checked by `test_suite_export`** (`--check`): every cited ID exists, every cited sub-check is defined, every definition is used, every rule has a Source. The section is exported as its own `Shared Definitions` sheet after the cases sheet, so Excel readers see it too.
- **Legacy suites need nothing.** A suite without the section parses, exports, and fingerprints exactly as before.

## 6.2a The Supplier Columns — Requires and Supplier Rule

*(Added 2026-09-27, user-mandated. Additive: no existing field was removed, renamed, or reordered —
both columns are appended after `Automation`.)*

Suppliers differ in what they can do. A case that needs a capability the Supplier lacks can only fail,
so it is excluded before execution (`manual-execution-skill` §4.2). For that to be decidable, **the
case has to say what it needs** — and it says it here, not in prose a tool cannot read.

| Column | Records | Allowed values | Default |
|---|---|---|---|
| `Requires` | The Supplier capabilities this case cannot run without | `None` · one or more of `Hold`, `Pay after Hold`, `Meal`, `Baggage`, `Seat`, `Bundle`, joined with `+` · a negation, `Not <capability>` | `None` |
| `Supplier Rule` | The Supplier-specific rule this case tests, as its slug | a slug from that Supplier's `SupplierChecklist.md` §7c (e.g. `ladies-only-seats`) · empty | empty |

**`Requires` names what the case needs, never what it happens to use.** A seat-map rendering case
requires `Seat`; a case checking a paid booking's meal requires `Meal`. **Booking is never a
requirement** — every Supplier books, so naming it would gate nothing. When in doubt, ask: *if this Supplier could not do X, would this case still have a
meaningful expected result?* If yes, X is not required.

**`Not <capability>` is for cases that test the absence.** `Not Hold` reads "this case runs only for a
Supplier that cannot hold" — the case that asserts no Hold button is offered. It is not a negation of
the test; it is the case's audience.

**`Supplier Rule` is for a rule only some Suppliers have**, such as flynas's ladies-only seats. Leave
it empty for everything else. **Feature-level rules are not Supplier rules**: exit rows, infants,
children and seat sets apply to every Supplier and carry no slug here. Filling it in defensively is
worse than leaving it blank — it silently withholds a generic case from every other Supplier.

**Neither column is a lifecycle decision, and neither is read by the Review or Automation gates.**
They describe the case; `Review` and `Automation` record what a human decided about it (§6.3).

## 6.3 The Lifecycle Columns — Review and Automation

*(Added 2026-08-01, user-mandated. Additive: no existing field was removed, renamed, or reordered.)*

Two columns record decisions made **after** the test case is written, which is why they sit last in §6.1's order and last in the workbook. They are part of the platform lifecycle and **must exist for every test case**.

| Column | Records | Allowed values | Default |
|---|---|---|---|
| **Review** | The human review status of the case after Stage 3 | `Pending` · `Approved` · `Rejected` | `Pending` |
| **Automation** | Whether the approved case should be automated | `Pending` · `Approved` · `Rejected` | `Pending` |

### 6.3.1 Review — written by humans, never by a skill

**This skill always generates a new test case with `Review: Pending`.** It never writes any other value, at any time, for any reason.

**No skill may change this value.** Only a human reviewer — or a review process a human explicitly requested — may move it to `Approved` or `Rejected`. This is the one rule in this section that is not merely a convention: a skill that advances its own review status has reviewed its own work, which is precisely what the column exists to prevent. It is the same reasoning that forbids a stage from inferring its own checkpoint approval (`pipeline.md` §5.3, §6 Rule 6), applied at test-case granularity.

`Rejected` means the case was reviewed and is not accepted as written. It is not deleted — the record of the rejection is the point.

**The one transition a skill may perform: a material rewrite resets `Review` to `Pending`.** *(Added 2026-08-01.)*

```
Approved  ──rewrite──►  Pending          (mandatory)
Rejected  ──rewrite──►  Pending          (mandatory)
anything  ──────────►  Approved          NEVER, under any circumstance
```

**Why this is not a skill approving its own work.** Every permitted move goes *toward* `Pending` — it only ever **removes** authorization, never grants it. That is what makes the rule safe to automate: a skill cannot use it to advance a case, only to withdraw a stale verdict on text that no longer exists.

**Why it is mandatory rather than allowed.** Without it the column means two different things at once:

- Leaving `Approved` on a rewritten case would carry a human's acceptance of *superseded text* forward onto text they never read — the exact laundering the column exists to prevent, and the more dangerous of the two, since Stage `4M` and `4A` would both execute on it.
- Leaving `Rejected` on a case that was rewritten *in response to that rejection* makes the gate a one-way trapdoor: the case is fixed, and permanently excluded anyway. The reviewer's feedback would be impossible to act on.

**What counts as a material rewrite:** any change to Objective, Preconditions, Test Data, Steps, or Expected Result — i.e. anything that changes what is executed or what constitutes a pass. Fixing a typo in Notes is not one. When in doubt, reset: an unnecessary re-review costs a reading, an inherited approval costs the gate.

**Two obligations come with it, and neither is optional:**

1. **Record it in the case's Notes** — that it was rejected or approved, on what date, the reason if one was given, and that it has been rewritten. Resetting the column silently destroys the audit trail the rejection was there to create.
2. **Report it in the closing message**, per case. A reviewer must never discover from a re-export that a case they approved is back at `Pending`.

This mirrors the artifact-level rejection flow exactly (`pipeline.md` §5 step 4): a rejected artifact is not left `Rejected` forever — the producing stage re-runs against the feedback and the result returns to `Pending Review`. This is that same rule at test-case granularity.

### 6.3.2 The gates the two columns create

*(Revised 2026-08-01, user-mandated: `Review` now gates **both** branches, not automation alone.)*

`Pending` means no automation decision has been made yet. `Approved` authorizes the case for automation. `Rejected` means the case stays manual, deliberately.

**`Review` is the universal gate. `Automation` is the Automation branch's additional one:**

| Branch | A case is in scope only when |
|---|---|
| Stage `4M` — Manual Execution | `Review = Approved` |
| Stage `4A` — Automation | `Review = Approved` **AND** `Automation = Approved` |

**Why `Review` gates manual execution too.** An unreviewed case costs a real tester's time and, on a shared environment, real data — to verify an expectation nobody has accepted. And when it fails, the result cannot distinguish *the application is wrong* from *the test case is wrong*, which is the one thing an execution result exists to establish. `Review = Approved` is precisely the statement "if this fails, the application is at fault."

**`Automation` never affects manual scope.** `Automation = Rejected` does not remove a case from Stage `4M` — it is the *reason* that case must be exercised by hand. Letting an automation decision narrow manual coverage would be exactly backwards.

**Nothing is dropped for being out of scope.** Stage `4M` records a non-approved case as `Excluded`, with reason `Pending Review` or `Rejected at Review`, and still reports it (`manual-execution-skill` §4.1, §8) — so a run can never show "3 of 3 passed" while 48 cases went unexamined. Stage `4A` likewise reports generating nothing as a correct, reportable outcome rather than a silent no-op.

Every other combination is out of scope for automation — including `Review: Pending` with `Automation: Approved`, which is not a shortcut: an unreviewed case is not automatable however its Automation column is marked, because automating a case nobody has accepted encodes an unreviewed expectation into executable code.

**This column supersedes the retired `AutomationCandidate` tag** and the Coverage Report's former Automation Candidates section (§18 #11). Both were *advisory* hints for prioritization; this is a *binding* decision. Keeping an advisory flag alongside a binding one invites the two to disagree, and leaves a reader no way to tell which governs — so the advisory one is gone rather than demoted.

### 6.3.3 How absence and bad values are treated

- **An omitted field is `Pending`.** The exporter defaults it silently (`test_suite_export/parseTestCases.js`), because "no decision yet" is exactly what an absent value already says. Warning on it would fire against every suite authored before this contract existed while telling a reader nothing.
- **An unrecognised value is reported.** Anything outside the three allowed values is exported as written and raises a parse warning — it means someone recorded a decision the lifecycle does not define, and silently rewriting it would erase their intent.

### 6.3.4 Inconsistent pairs — reported, never reconciled

*(Added 2026-08-07, user-mandated.)*

Because the two columns are independent, one pair of combinations is **contradictory**:

| `Review` | `Automation` | Why it contradicts |
|---|---|---|
| `Pending` | `Approved` | automation was selected before the case itself was reviewed |
| `Rejected` | `Approved` | a rejected case cannot be selected for automation — `Review` takes precedence |

Both values in such a pair are **human decisions**, and they disagree. The platform's response is fixed:

1. **Detect it.** `parseTestCases.js` emits an `INCONSISTENT lifecycle` warning on export (`cli.js --check` exits `2`), and `importLifecycle.js` emits the same warning on the resulting pair when decisions are imported from the workbook.
2. **Keep it out of automation.** No action is needed for this — §6.3.2's gate already excludes it, because `Review = Approved` is required independently.
3. **Preserve both values exactly.** Neither column is auto-corrected in either direction.
4. **Escalate.** Resolving it is a **Human Decision** (`pipeline.md` §5.5) — gather, analyse, recommend, then wait.

**Why nothing is auto-corrected.** Resetting `Automation` to `Pending` would destroy one reviewer's recorded intent; promoting `Review` to `Approved` would manufacture an approval nobody gave, which is the single thing the review gate exists to prevent (§6.3.1). Either "fix" replaces a visible contradiction with an invisible one. A contradiction that is reported on every export is strictly safer than a silent reconciliation, so the platform preserves the evidence and asks.

**No third field records this.** Eligibility and consistency are **derived** from the pair, every time, by `isManualEligible()` / `isAutomationEligible()` / `lifecycleInconsistency()` in `parseTestCases.js`. Persisting a derived verdict — `Automation Eligible`, `Ready for Automation`, `Lifecycle Status` — would create exactly the second source of truth the retired `AutomationCandidate` tag already demonstrated the cost of (§6.3.2).
- **Casing is normalised**, so `approved` and `Approved` are the same decision.
- **Neither column is a required field.** A case with no review decision is *unreviewed*, not *unexecutable* — and `REQUIRED_FIELDS` is reserved for content Stage `4M` cannot run without.

# 7. Negative Test Generation Engine

This skill does not wait to be asked for a negative case — it automatically evaluates every applicable testable requirement/workflow against each of the following categories and either generates the corresponding negative test case or explicitly records "Not Applicable — {one-line reason}" against that category. A category is never silently skipped without a recorded reason.

| Category | What it exercises | Example Test Data |
|---|---|---|
| **Invalid Inputs** | Malformed, wrong-type, or semantically invalid input the field should reject | A text string in a numeric-only field; a malformed date |
| **Boundary Values** | Values at, just inside, and just outside a stated limit | Max-length string, max-length + 1, minimum allowed value − 1 |
| **Empty Values** | Required fields submitted blank, or optional fields left blank where behavior differs | Empty string, whitespace-only string |
| **Unicode** | Non-ASCII characters, including multi-script and supplementary-plane (emoji) input | Accented Latin, CJK, Cyrillic, emoji |
| **Special Characters** | Characters with syntactic significance in HTML, shell, or markup contexts | `<script>`, `&`, `%`, quotes, backslashes |
| **Security Inputs** | Payload-shaped input used strictly as an input-handling/error-message probe, never to actually exploit anything | SQL-injection-style strings, path traversal strings, header-injection strings |
| **Timeouts** | Behavior under slow, hung, or unresponsive conditions | Simulated slow network/backend response, where the automation/execution environment can induce it |

This category set is deliberately aligned with the Explorer skill v2's Investigation Mode boundary conditions (`.claude/skills/explorer-skill/SKILL.md` §5.8) and Event-Driven Capture triggers (§5.2) — a boundary condition the Explorer skill already probed and evidenced during discovery is exactly the kind of negative test this skill should be generating and citing (via Discovery/Finding/Evidence References, §5) rather than re-deriving from first principles.

# 8. Test Coverage Tracking

This skill tracks and reports coverage across two axes:

## 8.1 Requirement Coverage

- **Covered Requirements** — every Project Context requirement ID with at least one test case whose Requirement Reference cites it
- **Uncovered Requirements** — every Project Context requirement ID with zero test cases citing it, each with a one-line reason (e.g., "out of scope for this run's in-scope modules," "requires a role/credential not available," "genuinely not yet designed — gap to close before Stage 3 sign-off")
- **Coverage Percentage** — Covered Requirements ÷ total testable requirements in scope, shown with its basis (e.g., "18/20 in-scope requirements covered = 90%")

## 8.2 Finding Coverage

- **Covered Findings** — every Finding with a recorded disposition per §5.3 (regression test, exploratory test, or documented exception)
- **Uncovered Findings** — every Finding with no recorded disposition; per §5.3, this must be zero for a complete run, and any nonzero count is flagged as an incomplete run, not accepted as-is
- **Coverage Percentage** — Covered Findings ÷ total Findings for this run

Both sub-reports are consolidated into the Coverage Report, which is one of this skill's required canonical outputs (§9), not an optional appendix.

## 8.3 Extended Coverage Categories

A binary Covered/Uncovered split (§8.1) understates real coverage nuance. The Coverage Report must additionally report, per in-scope requirement:

| Category | Meaning |
|---|---|
| **Covered** | At least one test case's Requirement Reference cites this requirement (unchanged from §8.1). |
| **Partially Covered** | At least one test case exists, but the Required Dimensions evaluation (§17) or Negative Test Generation Engine (§7) left one or more applicable categories un-generated for a reason other than "Not Applicable" (e.g., blocked pending a missing prerequisite, §20) — the requirement has *some* coverage, not full coverage. |
| **Out-of-Scope** | The requirement exists in Project Knowledge but the Project Context explicitly marked its module Out of Scope for this run — expected to have zero test cases, and that absence is not a gap. |
| **Unknown / Unassessed** | This skill cannot determine coverage status at all — e.g., the requirement's Discovery Reference is entirely absent and no Discovery Mode (per the Explorer skill's §8.1) was ever attempted against it, so there is no basis for even a Partially Covered judgment. |

**Uncovered** (§8.1) is reserved for requirements that are In Scope, assessable, and simply have zero test cases with no stated reason — the one category that always represents a defect in this skill's own output, distinct from the three above, none of which are defects by themselves as long as they are named and explained.

The Coverage Percentage (§8.1) is computed against **Covered** only; Partially Covered, Out-of-Scope, and Unknown/Unassessed are reported alongside it, not folded into the same percentage, so a reviewer cannot mistake a high percentage for full assurance when partial/unknown items exist.

# 9. Outputs

The Test Design skill generates **only the platform's own canonical artifacts.** No output is shaped around, named after, or structured to match any external ALM, issue-tracking, or test-management system:

1. **Manual Test Suite (Markdown)** — human-readable, version-control-friendly test case documents, grouped by module
2. **Manual Test Suite (Excel)** — the same test cases in spreadsheet form, for stakeholders and tools that consume tabular test data
3. **Requirement Traceability Matrix** — Project Context requirement ID → Test Case ID, annotated with Discovery/Finding/Evidence references and validation status
4. **Coverage Report** — the consolidated Requirement Coverage (§8.1, §8.3) and Finding Coverage (§8.2) accounting, structured per the Standard Output Contract (§18): Run Scope, Requirements Covered, Coverage Matrix, Business Rules, Test Scenarios, Manual Test Cases (by reference), Assumptions, Coverage Gaps, Risks, Recommendations, Automation Status, and Inputs for Manual Execution skill

The Markdown and Excel test suites are two renderings of one underlying test case set — they must never diverge in content. A field added, corrected, or removed in one format is added, corrected, or removed in the other in the same pass.

Any future integration that maps these canonical artifacts into a third-party ALM/test-management/issue-tracking system's import format is out of scope for this skill and for the platform core generally — such integrations, if built, live in a separate layer that consumes these artifacts as input, not inside this specification.

## 9.1 Excel Rendering — Generated, Never Authored

**The Markdown suite is the authored artifact; the `.xlsx` is generated from it.** Every module's workbook is produced by the platform's Test Suite Export tool, never written by hand and never hand-edited afterwards:

```bash
node platform_core/tools/test_suite_export/cli.js             # every suite in the active module
node platform_core/tools/test_suite_export/cli.js --check     # parse + report only; writes nothing
```

**Why derivation rather than two authored formats.** §9's "must never diverge" is only *guaranteed* if one format is derived from the other; authored twice, non-divergence is a matter of discipline, and the moment they drift, Stage 4M executes against whichever file the tester happened to open — a difference nothing downstream can detect. Deriving the workbook makes that failure mode unreachable rather than merely discouraged.

**The rules this creates:**

1. **Author Markdown, then export.** Run the export after *any* edit to a suite document — including a one-word correction during review. An `.xlsx` older than its `.md` is a stale artifact, not a minor lag.
2. **Never hand-edit a generated workbook.** The next export discards the edit silently, and until it does, the two formats disagree — exactly what §9 prohibits.
3. **Never hand-write an `.xlsx`, and never add a spreadsheet dependency to do it.** The tool is dependency-free by design (`platform_core/` must run on a clean install); a run-scoped script pulling in a spreadsheet library is how this behaviour was prototyped, not how it ships.
4. **Treat a parse warning as a defect in the Markdown, never in the workbook.** `--check` exits non-zero when a case is missing Title, Objective, Steps, Expected Result, Priority, or Tags, or when a Test Case ID is duplicated. A case reaching Stage 4M with a blank Expected Result is unexecutable — fix the suite document, then re-export.
5. **Run `--check` before requesting review.** Publishing a suite whose own cases do not parse means the reviewer is reading something Stage 4M cannot execute.
6. **Reconcile the counts before publishing.** Each module's case count must agree across three places: the suite document's own Total Test Cases, that module's row count in `TraceabilityMatrix.md`, and the Coverage Report's Manual Test Cases table (§18 #6). The export's per-module count is the figure to check them against — count from the files, never carry a total over from a draft. A miscount here propagates into the Stage 4 and Stage 5 summaries, where it is far harder to notice.

**The workbook's column contract is §6.1's field list, in §6.1's order, and nothing else** — one sheet per module workbook, tab named for the module. Traceability, Risk, and the Requirement/Discovery/Finding/Evidence references are deliberately absent from it, exactly as they are absent from the Markdown case block (§6.2): they live in `TraceabilityMatrix.md`, keyed by Test Case ID. Adding a traceability column to the workbook is the same spec violation as adding the field to the case block.

**The two lifecycle columns are part of that contract and are not an exception to it** (added 2026-08-01, §6.3). `Review` and `Automation` are the last two columns, and they are workflow state rather than traceability — they record *what a human decided about this case*, not *what requirement it covers*. That distinction is why they belong on the sheet while a Related Requirements column still does not: the Matrix remains the single source of truth for traceability, and duplicating it into the workbook would give the suite a second copy to drift.

Steps render into a single cell joined with ` | ` and renumbered canonically (`1. … | 2. …`). The numbering carries weight downstream: Stage 4M records a result per step and a defect cites "failed at step 3", so one action per authored line (§6.1) is what keeps that citation resolvable.

Where a module's workbook should carry a sheet name different from the file's module — a file deliberately grouping several requirement groups, e.g. NAV + NFR + BR in `TestCases_Navigation.md` — pass `--sheet-name`, and state the grouping decision in the Coverage Report's Manual Test Cases section (§18 #6) rather than leaving a reader to notice the file name and the module list disagree.

The tool's full behaviour — accepted heading shapes, field markers, warning taxonomy, exit codes — is specified in [`platform_core/tools/test_suite_export/README.md`](../../../platform_core/tools/test_suite_export/README.md) and is not restated here.

# 10. Allowed Tools

- File tools: Read (Project Context, Discovery Report, QA Assessment Report, Findings Summary, individual Finding metadata and Evidence Packages), Write (Markdown test case, traceability, and coverage documents)
- **The Test Suite Export tool** (`node platform_core/tools/test_suite_export/cli.js`) to render the authored Markdown suites into their `.xlsx` counterparts (§9.1). This is the only permitted way to produce the Excel output: writing a workbook by hand, or authoring a one-off spreadsheet script alongside the artifacts, is not permitted — it reintroduces the divergence §9.1 exists to prevent, and adds a dependency `platform_core/` deliberately does not carry. Not for running tests or touching a live environment.
- Directory-listing shell commands (read-only)

**Not permitted:** browser automation tools, code execution/editing tools that touch application code, or any tool that runs tests against a live environment.

# 11. Execution Rules

1. Must derive test cases primarily from the Project Context — Discovery Report, Findings, Evidence Packages, and the QA Assessment Report inform and validate, they do not originate requirements.
2. Must not treat any secondary input as authoritative over the Project Context. Where they conflict, the Project Context's stated requirement governs the test case, and the conflict is logged as a discrepancy, not silently resolved by this skill.
3. **Must never read the PRD directly.** Only Stage 1 may do so (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 4). A requirement question unanswerable from the Project Context is a gap to log, never a reason to open the PRD.
4. **Must never consume an input artifact that is not itself `Approved`** at its own pipeline checkpoint — must halt and report the blocking artifact rather than drafting against a `Pending Review`, `Pending Automation Approval`, or `Rejected` source (§4).
5. **Must never invent requirements.** Every testable requirement a test case covers must be traceable to an explicit Project Context statement (§5.1).
6. **Must never invent business rules.** A business rule not stated in the Project Context is not assumed, extrapolated, or "filled in" for the sake of a more complete-looking test case.
7. **Must never create a test case without traceability** (§5.2) — at minimum a Requirement Reference and Discovery Reference row in the Traceability Matrix (§6.2); a Finding Reference and Evidence Reference wherever the test case exists because of a specific Finding. The test case document itself stays lean (§6.1) — traceability lives in the Matrix, but it must exist there for every test case, with no exceptions.
8. **Must ensure every Finding is dispositioned** as a regression test, an exploratory test, or a documented exception (§5.3) — an Uncovered Finding is a defect in this skill's own output.
9. Must carry forward every assumption/risk flag from the Project Context into a correspondingly tagged test case (§3) — never silently resolve an open question.
10. **Must systematically evaluate every applicable Negative Test Generation category** (§7) for each testable requirement/workflow, generating the test case or recording an explicit "Not Applicable" reason (in the Coverage Report, §18 #5/#8) — never silently skipping a category.
11. Must cover, at minimum, one positive case and the applicable negative categories (§7) for every testable requirement; boundary and security cases wherever applicable.
12. Every test case must include all fields in §6.1 (the lean, execution-facing schema) — no partial schema, no field silently omitted. Every test case must additionally have a corresponding, complete Traceability Matrix row per §6.2 — use `N/A` explicitly where a Matrix field genuinely does not apply, per §5.1's rule for Finding/Evidence References.
13. **Must produce both canonical test suite formats — Markdown and Excel — from the same underlying test case set.** The two must never diverge in content. Concretely (§9.1): author the Markdown, then generate the workbook from it with `platform_core/tools/test_suite_export/cli.js`. Never hand-write or hand-edit an `.xlsx`, and never leave one un-regenerated after editing its Markdown source.
14. **Must produce a Requirement Traceability Matrix covering 100% of the test cases it generates** — no orphan test case without a traced Project Context requirement row in the Matrix (§6.2).
15. **Must produce a Coverage Report** (§8–§9) quantifying Requirement Coverage and Finding Coverage, with an explicit accounting (not a silent omission) of every Uncovered Requirement and every Uncovered Finding.
16. Must not write or suggest automation code, and must not execute any test.
17. **Must never shape any output, schema, field, or terminology around a specific external ALM, issue-tracking, or test-management system.** This skill produces only the platform's own canonical artifacts (§9); any third-party import/export format is strictly out of scope for the core architecture.
18. **Must never read `platform_core_data/` (Project Knowledge) directly.** Only the Project Context, already reconciled by Stage 1, is read — re-reading Project Knowledge risks reintroducing detail the Project Context skill deliberately scoped out.
19. **Must select the Test Design Strategy matching this run's Run Scope Type** (§16), and must populate every test case's Run Scope Reference (§5.4) in the Traceability Matrix (§6.2) accordingly — never apply one default depth/breadth regardless of scope.
20. **Must systematically evaluate every Required Dimension** (§17) for each testable requirement, alongside the Negative Test Generation categories (§7), recording "Not Applicable — {reason}" rather than silently skipping any of them.
21. **Must report Coverage using the full category set** (§8.3) — Covered, Partially Covered, Out-of-Scope, Unknown/Unassessed — never collapsing them into a single Covered/Uncovered figure.
22. **Must structure the Coverage Report per the Standard Output Contract** (§18) — all twelve required sections, in order — never substituting free-form prose for any of them.
23. **Must recognize the named Stop Conditions** (§19) and, for any Local condition, continue designing every other unblocked requirement rather than halting the run — and must state the smallest missing prerequisite for every blocked item (§20), never a bare "cannot proceed."
24. **Must verify Handoff completeness** (§21) before treating a run's Test Design outputs as finished — every input `.claude/skills/manual-execution-skill/SKILL.md` §4 declares it needs must be present, and every Discovery/Finding/Evidence Reference must be specific, not merely non-empty.
25. **Must generate every new test case with `Review: Pending` and `Automation: Pending`** (§6.3), and **must never change either value.** Only a human reviewer, or a review process a human explicitly requested, may advance them. A skill that advances its own review status has reviewed its own work — the same reasoning that forbids a stage inferring its own checkpoint approval (`pipeline.md` §5.3, §6 Rule 6), applied per test case. This rule replaces the former advisory-flag rule: the retired `AutomationCandidate` tag no longer exists, and the `Automation` column is binding, not a hint (§6.3.2).
26. **Must author every test case branch-agnostically** (§2) — never marked "manual only" or "automation only", and never split into per-branch suites. A case genuinely unsuitable for automation is described by its *characteristics* (subjective judgment required, no assertable state), leaving each branch to draw its own conclusion.
27. **Must run the Simple English Communication Standard check on every test case, the Coverage Report, and the Traceability Matrix's prose fields before treating a suite as finished** (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 10): short, direct sentences; any hard word replaced with an easier one where meaning stays the same; every necessary technical term briefly explained; a stated requirement kept visibly separate from an inferred one; and a first-read check for whether a tester unfamiliar with the feature could execute the case correctly. Test Case IDs, requirement IDs, and field names are never altered by this check.

# 12. Expected Artifacts

| Artifact | Path | Template |
|---|---|---|
| Manual Test Suite — Markdown (per module) | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.md` | [`stage_3_test_design/TestCases_Module.md`](../../../platform_core/templates/stage_3_test_design/TestCases_Module.md) (per-case block: [`TestCase_entry.md`](../../../platform_core/templates/stage_3_test_design/TestCase_entry.md)) |
| Manual Test Suite — Excel (per module) | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.xlsx` | **generated, not authored** — rendered from the Markdown suite by [`test_suite_export`](../../../platform_core/tools/test_suite_export/) per §9.1; columns are §6.1's field list, in §6.1's order |
| Requirement Traceability Matrix | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TraceabilityMatrix.md` | [`stage_3_test_design/TraceabilityMatrix.md`](../../../platform_core/templates/stage_3_test_design/TraceabilityMatrix.md) |
| Coverage Report | `platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.md` | [`stage_3_test_design/CoverageReport.md`](../../../platform_core/templates/stage_3_test_design/CoverageReport.md) |

**Every artifact's document structure is defined by its template** in `platform_core/templates/`, not restated here. Render an artifact by copying its template and filling the `{{PLACEHOLDER}}` tokens; section order is mandatory and the inline `<!-- -->` guidance is stripped from the rendered output. `TestCase_entry.md` encodes §6.1's exact field list ("no more") and §6.0/§6.0.1's lean-case rules; `CoverageReport.md` encodes §18's 12-section contract. `platform_core/templates/README.md` states the shared conventions.

# 12A. Coverage Report — HTML companion (`pipeline.md` §17)

The Coverage Report is **also published in the platform's shared HTML report design**, generated by `platform_core/tools/report_builder`. Three files, same folder:

```
platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.md            # the artifact
platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.report.json   # the report model
platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.html          # generated — never hand-edited
```

```bash
node platform_core/tools/report_builder/cli.js validate --model platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.report.json
node platform_core/tools/report_builder/cli.js build    --model platform_core_data/modules/{{MODULE_SLUG}}/test_design/CoverageReport.report.json
```

`validate` first — it exits `2` and names the exact path that is wrong; surface its message unchanged. Model reference: `platform_core/tools/report_builder/README.md`.

**The HTML never replaces the Markdown.** The Markdown is the artifact the Traceability Chain runs through and the one a reviewer approves; the HTML is a second rendering of the same content for stakeholders — never approved, never versioned, never read as input by any stage. **Rebuild it after every in-place correction** (`pipeline.md` §7), or the two disagree and the Markdown is the one that is right.

### 12A.1 Mapping this stage onto the model

**Nothing has been executed yet, so this report's statuses describe coverage, not results.** Declare them accordingly and never reuse execution vocabulary — a `Covered` requirement has not passed anything:

```jsonc
"statuses": [
  { "key": "Covered",         "label": "Covered",         "tone": "pass"    },
  { "key": "Partial",         "label": "Partially Covered","tone": "warning"},
  { "key": "Uncovered",       "label": "Uncovered",       "tone": "fail"    },
  { "key": "Excluded",        "label": "Excluded",        "tone": "neutral" },
  { "key": "Assumption-based","label": "Assumption-based","tone": "accent"  }
]
```

**Every requirement appears, including every `Uncovered` one** — an omitted requirement silently shrinks the denominator and overstates coverage, which is the one thing this report exists to prevent.

**`Assumption-based test` tags stay visible** as their own status, so Stage `4M`/`5A` can carry each to a resolved state rather than discovering them late.

**Coverage is computed from the Traceability Matrix, never asserted.** The stat cards and donut are that computation rendered; they never carry a figure the Matrix does not support.

**Exclusions carry their reason** in a row — a requirement excluded without a stated reason is indistinguishable from one that was missed.

**Captured output goes through `text`, never `html`.** An application response, a UI message, a log line, and anything a human typed are escaped. `html` is only for markup this stage generated itself.

**Redact through the model's `"redacted": true`**, never by hand-typing a placeholder into a header value.

**Excerpt a very large capture and say so** in the exchange's `notes` — a full multi-hundred-KB body helps no reader, and silently truncating one misleads every reader.


# 13. Operational Contract

Role: requirement-driven test case design (Stage 3 — shared by both pipelines, and the divergence point).

Transform validated project knowledge into a complete, structured, fully traceable set of manual test assets. Design and track tests; do not execute them, write automation code, read the PRD, or shape output around any external ALM, issue-tracking, or test-management system — produce only the platform's own canonical artifacts. Execution is fully specified above — §4 (Inputs), §5 (Traceability Model, incl. Finding disposition §5.3 and Run Scope Reference §5.4), §6 (Test Case Schema), §7 (Negative Test Generation Engine), §8 (Coverage Tracking), §9 (Outputs, incl. Excel rendering §9.1), §11 (Execution Rules), §12 (Artifacts), §16 (Strategy by Run Scope), §17 (Required Dimensions), §18 (Standard Output Contract), §19–§20 (Stop Conditions and Recovery), §21 (Handoff Contract). This section adds no rules of its own; the contract is stated once above rather than restated here.

# 14. Example Execution

*Illustrative only — not executed as part of this task.*

```text
Input:
  platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md        (primary; scope: Login / Authentication & Access)
  platform_core_data/modules/{{MODULE_SLUG}}/discovery/*.md                              (secondary)
  platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md             (secondary)
  platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/Findings_Summary.md                (secondary)
  platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/FINDING-001.../metadata.md ... FINDING-004.../metadata.md  (secondary)
```

Hypothetical result: `TestCases_Login.md` / `.xlsx`, `TraceabilityMatrix.md`, and `CoverageReport.md` under `platform_core_data/modules/{{MODULE_SLUG}}/test_design/`. `TC-LOGIN-004`'s own entry in the Manual Test Suite is lean — Title ("Forgot Password does not time out for a valid, existing username"), Objective, Preconditions, Steps, Expected Result stating the *corrected* behavior ("A generic success message is returned within a reasonable time"), Priority, and Tags (`Regression`) — while the Traceability Matrix carries its Requirement Reference `PRD FR-3 / SR-3`, Discovery Reference `discovery/forgot_password_flow.md`, Finding Reference `FINDING-003`, Evidence Reference `FINDING-003/failure.png, FINDING-003/console.log`, and Risk `High — inherited from FINDING-003's Technical Risk` — dispositioned as a **regression test** per §5.3. `FINDING-004` (the enumeration-via-timeout Security Concern, Status `Needs Human Review`) is instead dispositioned as an **exploratory test**, its Expected Result asking the reviewer to confirm whether response-time parity is in-scope for the anti-enumeration requirement — a policy call this skill does not make unilaterally. The Coverage Report shows `4/4 Findings covered (2 regression, 1 exploratory, 1 documented exception)` and `6/6 in-scope Login requirements covered = 100%`.

# 15. Architecture Principle

> Agents communicate through artifacts only. Each has a single responsibility. Every output becomes the input of another whenever applicable.

For this skill specifically: its single responsibility is designing and tracking tests against the Project Context, not adjudicating between conflicting sources, not executing anything, and not shaping its output around any external system. Its outputs — the Markdown and Excel Manual Test Suites, the Traceability Matrix, and the Coverage Report — become the Automation skill's primary input in the next stage. The platform core, of which this skill is a part, remains completely platform-agnostic; any external-tool integration is a separate, later concern built outside this architecture, consuming these canonical artifacts rather than replacing them.

# 16. Test Design Strategy by Run Scope

Test design depth and breadth follow the run's Run Scope Type (`workflows_and_pipelines/pipeline/run_scope.md` §3) and Run Type (§5), stated in the Project Context's Scope Summary and carried onto every test case via the Run Scope Reference (§5.4) — not one default approach regardless of what this run covers:

| Run Scope Type / Run Type | Strategy |
|---|---|
| **Entire Project** | Full breadth across every in-scope requirement: one positive case, the applicable Negative Test Generation categories (§7), and the applicable Required Dimensions (§17) for each. Coverage Percentage (§8) against the full in-scope surface is the primary success measure. |
| **Epic** | Design test suites per constituent Feature/User Story, plus explicit **integration test cases at the seams between them** — an Epic-level defect is often in the hand-off between two stories, not inside either one alone (mirrors the Explorer skill's own Epic strategy, `.claude/skills/explorer-skill/SKILL.md` §16). |
| **Feature** | Full end-to-end suite for the one feature. The narrower surface calls for, and gets, deeper Negative/Required-Dimension coverage per requirement than an Entire Project pass would budget for. |
| **User Story** | Narrowest and most literal: at minimum one test case per enumerated acceptance criterion (Acceptance Criteria Reference, §5.4), and no broader wandering into adjacent feature coverage the story didn't ask for. Every carried-forward Assumption/Risk tied to that story gets its own explicitly tagged assumption-based test case (§3), never folded silently into another case. |
| **Bug** | Reproduction-first: the first test case reproduces the reported defect exactly as described. Once a fix is assumed, a **regression test case** is designed asserting the corrected behavior (never the buggy behavior, per §5.3's existing rule for Finding-derived cases) — plus boundary cases covering the immediate neighborhood of the same defect class, mirroring the Explorer skill's own boundary-probing on the same Bug scope. |
| **Requirement Document** | Size the suite to what the document actually states it covers — could be Feature-sized or Epic-sized in practice. State which breadth was applied, and why, in the Coverage Report's Run Scope section (§18). |
| **Custom Scope** | Follow exactly what the run's Custom Scope description states — including, where the scope doesn't map onto UI workflows at all (e.g., "design tests for the API responses" or "just the Admin Settings config table"), designing test cases whose Steps are API calls or configuration-state assertions rather than UI actions (see also §22, Future Scalability). |
| **Full Regression** (Run Type) | Prioritizes test cases re-verifying already-documented workflows and prior Findings' regression tests over generating wide net-new coverage — the goal is confirming known-good behavior still holds. |
| **Smoke** (Run Type) | Only P1/critical-path positive cases; the full Negative Test Generation sweep (§7) and Required Dimensions (§17) are reserved for categories already flagged Critical/High risk, not applied uniformly, to keep the suite fast to execute. |

If the Project Context does not state an explicit Run Scope Type, this skill defaults to the **Entire Project** strategy against its declared In Scope modules, and states that default explicitly in the Coverage Report (§18) rather than leaving it unstated.

# 17. Test Design Methodology — Required Dimensions

Beyond the existing Negative Test Generation Engine (§7 — Invalid Inputs, Boundary Values, Empty Values, Unicode, Special Characters, Security Inputs, Timeouts), this skill systematically evaluates every testable requirement against the following dimensions, generating the corresponding test case or explicitly recording **"Not Applicable — {one-line reason}"** — a dimension is never silently skipped, exactly as §7 already requires for its own categories:

| Dimension | What it verifies |
|---|---|
| **Positive Scenarios** | The documented happy path succeeds as the Project Context states (already required by §3's minimum-coverage rule; listed here for completeness of the dimension set). |
| **Boundary Testing** | Values at, just inside, and just outside a stated limit (overlaps with §7's Boundary Values category — evaluated once, not duplicated). |
| **Validation Rules** | Field-level and form-level validation stated in the Project Context behaves as documented (e.g., required-field enforcement, format constraints). |
| **Business Rules** | Rules carried via a `BR-`prefixed Requirement Reference (§5.4) are exercised directly, not merely incidentally covered by a positive-path case. |
| **Error Handling** | Error states surface the correct, documented message/behavior — distinct from merely triggering the error (which the Negative categories already do); this dimension asserts the *response* to the error is itself correct. |
| **Permissions** | Role-based access behaves as the Project Context's Roles & Credentials section states — every documented role boundary gets its own access-control test case, not only "a security test case where applicable" as a general aside. |
| **Configuration** | Where the Project Context documents a feature flag/config toggle affecting behavior (e.g., an `OTP_STATUS`/`CAPTCHA_STATUS`-shaped setting), design test cases for the behavior under each documented configuration state the Project Context describes — never invent untested toggle values it doesn't mention. |
| **Regression Impact** | For a Feature/User Story/Bug-scoped run, explicitly assess and state which *other*, previously-tested requirements this change plausibly affects, and whether a regression case for any of them is warranted — distinct from Finding-derived regression tests (§5.3), which react to a specific observed defect rather than a proactive impact assessment. |
| **Integration Behaviour** | Where the Project Context documents an interaction between two modules/rules (e.g., two filtering mechanisms that must compose via AND logic, or two settings documented as independent), design a test case for the *interaction itself* — not just each side independently — since this is exactly where the Explorer skill's own Investigation Mode (`.claude/skills/explorer-skill/SKILL.md` §5.8) and Gap Analysis most often surface undocumented coupling. |
| **Risk-based Prioritization** | Every test case's Priority (§6) reflects the Project Context's stated risk level for that area — a High/Critical-risk requirement is never left with only a single P4 case; where Risk (§6) is High/Critical, at minimum the Priority is correspondingly elevated, not set independently of it. |
| **Exploratory Recommendations** | Where a requirement is genuinely too ambiguous or judgment-dependent for a fixed pass/fail test case (distinct from an Exploratory-test Finding disposition, §5.3, which reacts to something the Explorer skill already found), this skill may recommend a scoped exploratory charter for a human tester instead of forcing a brittle fixed assertion — recorded in the Coverage Report's Recommendations section (§18), never as a fabricated fixed-outcome test case. |

This evaluation runs once per testable requirement, alongside — not instead of — the Negative Test Generation Engine (§7); the two engines' categories do not duplicate each other's evidence, and a dimension already fully covered by a §7 category is cross-referenced rather than re-generated.

# 18. Standard Output Contract

The Coverage Report (§9 Outputs #4) must contain exactly these sections, in this order, so the Automation skill (and any future consumer) never has to interpret free-form prose to extract what it needs. This does not add a new artifact or change the Coverage Report's file path (§12) — it is the required internal structure of the artifact that already exists:

| # | Section | Must contain, at minimum |
|---|---|---|
| 1 | **Run Scope** | The Run Scope Type/Source and Run Type this run used (§16), and which Project Context version this run designed against |
| 2 | **Requirements Covered** | The Covered list from §8.1/§8.3, with each requirement's ID |
| 3 | **Coverage Matrix** | A cross-reference view — Requirement ID × Test Case ID(s) — consolidating what the Requirement Traceability Matrix (§9 Outputs #3) already states, presented here for at-a-glance review alongside the rest of this contract |
| 4 | **Business Rules** | Every `BR-`prefixed requirement (§5.4) and its test case(s), listed separately from general Requirements Covered so business-rule coverage is auditable on its own |
| 5 | **Test Scenarios** | A count/breakdown of designed scenarios by module and by dimension (§7, §17) |
| 6 | **Manual Test Cases** | Reference to the Markdown/Excel Manual Test Suite files (§9 Outputs #1–#2) — full case content lives there, never restated here — **plus each module's case count**, reconciled against the suite documents and the Traceability Matrix per §9.1 #6, and a note wherever one file deliberately groups several requirement groups |
| 7 | **Assumptions** | Every assumption-based test case (§3) carried forward from the Project Context's Assumptions/Risks |
| 8 | **Coverage Gaps** | Uncovered Requirements (§8.1), Uncovered Findings (§8.2), and Partially Covered / Unknown-Unassessed items (§8.3), each with its stated reason |
| 9 | **Risks** | Every test case's Risk entry from the Traceability Matrix (§6.2) aggregated, with High/Critical items called out explicitly |
| 10 | **Recommendations** | Exploratory Recommendations (§17) and any other non-fixed-case suggestion for the human reviewer |
| 11 | **Review & Automation** | *(Renamed 2026-08-07 to the canonical umbrella heading — was "Automation Status", and before that "Automation Candidates".)* A **roll-up of BOTH lifecycle columns** across this module's cases: how many are `Pending`, `Approved`, `Rejected` on each, and which are which. **`Review & Automation` is the canonical heading whenever a section covers both fields.** Where a section genuinely covers only one, `Review` or `Automation` may stand alone — but neither name is used as the umbrella for both, and "Lifecycle Status" is not used at all, because the two decisions must not read as one combined state (§6.3). The roll-up is a **count of decisions already recorded on the cases, never a separate recommendation** — the advisory candidate list it replaces is retired (§6.3.2), because an advisory hint sitting beside a binding column can disagree with it. Report at minimum: the per-column tally, the cases eligible for Stage `4M` (`Review = Approved`), the cases eligible for Stage `4A` (`Review = Approved AND Automation = Approved`), and any **inconsistent pair** (`Automation = Approved` with `Review ≠ Approved`) — flagged for human resolution, never reconciled here (§6.3.4). Stage `4A` reads the cases themselves and never takes scope from this section; Stage `4M` gates on `Review` alone and does not read the `Automation` column at all (§6.3.2) |
| 12 | **Inputs for Both Branches** | The explicit handoff package per §21 — confirmation that every input Stage `4M` (`manual-execution-skill` §4) **and** Stage `4A` (`automation-skill` §4) declares it needs from this stage is present and specific. One section, both consumers |

# 19. Stop Conditions

This skill recognizes the following named conditions. Recognizing one is never, by itself, a reason to halt the entire run — see §20 for the required minimal-prerequisite recommendation before any blocked item is left unresolved.

| Condition | Scope | Required Action |
|---|---|---|
| **Missing approved Project Context** | Global | Halt entirely — there is no primary source of requirements without it (already governed by Execution Rule 1/4; named here for completeness of the Stop Condition taxonomy). |
| **Missing Discovery** (Discovery Report/QA Assessment Report/Findings not yet `Approved`, where required) | Global | Halt and report the specific blocking artifact (Execution Rule 4) — never draft against a `Pending Review` secondary input. |
| **Conflicting requirements** (the Project Context contradicts itself between two sections, as opposed to a secondary source conflicting with it, which §3/Execution Rule 2 already governs) | Local — the specific conflicting requirements | Design the test case against neither side unilaterally; log the internal contradiction as a discrepancy for the Project Context skill to resolve (a re-run of Stage 1 editing the same `ProjectContext.md` in place), and mark the affected requirement's coverage as Unknown/Unassessed (§8.3) until resolved. |
| **Insufficient evidence** (Discovery genuinely never exercised this requirement) | Local | Populate Discovery Reference as `"Not independently verified in Discovery"` (§5.1's existing rule) — this is not a halt, it is a documented, permitted gap. |
| **Incomplete acceptance criteria** (a User Story's Project Context entry doesn't preserve individual, testable acceptance criteria) | Local — that requirement only | Do not reconstruct or guess the missing criteria. Design what can be tested from what *is* stated, mark the requirement Partially Covered (§8.3), and recommend the minimal fix (§20) — re-running Stage 1 with the full acceptance criteria preserved. |
| **Ambiguous business rules** (a `BR-` requirement's stated behavior admits more than one reasonable reading) | Local — that requirement only | Do not pick an interpretation unilaterally. Design the test case(s) that hold under either reading where possible; where they cannot both be satisfied, log the ambiguity as a Coverage Gap (§18) and recommend the minimal clarification needed (§20). |

# 20. Recovery Strategy — Minimal Prerequisite Recommendation

Where the Explorer skill falls back to an alternate Discovery Mode (`.claude/skills/explorer-skill/SKILL.md` §21), this skill has no equivalent alternate mechanism — it is a document-synthesis skill, not an exploration skill. Its recovery behavior is instead: **never let one blocked requirement stop the whole run, and always name the smallest thing that would unblock it.**

1. When a Local Stop Condition (§19) blocks a specific requirement, this skill continues designing test cases for every *other*, unblocked requirement in scope — a single blocked item is never a reason to produce zero output for the run.
2. For the blocked requirement, this skill states the **smallest missing prerequisite** that would resolve it — never a vague "cannot proceed." Examples: *"Re-run Stage 1 with T3087's DBA-approved max-airline-count constraint recorded"*, not *"requirements incomplete"*; *"Confirm which of the two readings of BR-7 is intended"*, not *"business rule ambiguous."*
3. For a Global Stop Condition (§19), this skill still states the minimal prerequisite (e.g., *"Awaiting Project Context skill re-run — Discovery Report for RUN-20260710-001 is still Pending Review"*) rather than a bare halt message, so a reviewer knows exactly what single action unblocks the run.
4. The recommended prerequisite is recorded in the Coverage Report's Recommendations section (§18) and, where it blocks a specific requirement, alongside that requirement's Coverage Gap entry (§8.3) — never only in a narrative aside a reviewer could miss.

# 21. Handoff Contract with the Manual Execution skill

The Test Design skill's outputs are consumed next by **both branches, independently**: Stage `4M` (`.claude/skills/manual-execution-skill/SKILL.md` §4) and Stage `4A` (`.claude/skills/automation-skill/SKILL.md` §4), which takes both its scope and its content from here (`pipeline.md` §3.3). Before concluding a run, this skill verifies each of the following is actually present and specific — not merely assumed:

| Manual Execution skill needs (`.claude/skills/manual-execution-skill/SKILL.md` §4) | Satisfied by (this skill's output) |
|---|---|
| Project Context (Governing) | Unchanged pass-through — this skill does not modify it; Manual Execution reads the same Approved version directly |
| Manual Test Suite (Primary) | §9 Outputs #1–#2 |
| Requirement Traceability Matrix (Secondary) | §9 Outputs #3, carrying Requirement/Discovery/Finding/Evidence References (§5.1) plus Acceptance Criteria/Run Scope References (§5.4) |
| Coverage Report (Secondary — "so Manual Execution doesn't attempt what Stage 3 already excluded") | §9 Outputs #4, structured per §18, specifically sections 8 (Coverage Gaps) and 11 (Automation Status) |
| Discovery Artifacts (Secondary — passed through to Automation later "to resolve UI/selector detail") | Not produced by this skill — but every Discovery Reference (§5.1) this skill writes must cite a *specific* snapshot/Timeline entry/Report section, never a bare "see Discovery" |
| Findings (Secondary) | Not produced by this skill — but every Finding Reference/disposition (§5.3) this skill writes must be unambiguous about which of the three outcomes applies, so Manual Execution and, later, Automation know whether a regression script, an exploratory script, or no script at all is expected |
| Evidence Packages (Secondary) | Not produced by this skill — but every Evidence Reference (§5.1) this skill writes must cite specific evidence file(s), never the Finding as a whole |

**A run is not complete until every row above is verifiably satisfied.** A Discovery/Finding/Evidence Reference that is present but vague (e.g., "see discovery folder" instead of a specific file) is itself a handoff defect under this section, not an acceptable shorthand — consistent with §5.2's existing "no test case without traceability" rule, extended here to mean traceability must be *specific*, not merely non-empty.

# 22. Future Scalability

The dimensions this revision adds — Run-Scope-adaptive strategy (§16), Required Dimensions (§17) evaluated independently of any particular UI, and a Test Case Schema (§6) whose Preconditions/Steps/Expected Result fields are already content-agnostic — extend to non-web-UI systems with, at most, a change in what "Steps" and "Test Data" contain, never a change to the schema, traceability model, or Coverage/Output Contract:

| Future system shape | How it fits today's model |
|---|---|
| **Web** (current) | Steps are UI actions; unchanged baseline. |
| **Mobile** | Steps become mobile-gesture actions; Requirement/Discovery/Finding/Evidence References work identically, citing whatever Discovery Mode (`.claude/skills/explorer-skill/SKILL.md` §8.1) the Explorer skill used for that platform. |
| **Desktop** | Same pattern as Mobile — only the Steps' action vocabulary changes. |
| **API** | Steps become request/response definitions (endpoint, method, payload, expected status/body) instead of UI actions; the **Permissions** dimension (§17) already covers auth-header/token/role testing directly; **Configuration** (§17) already covers environment/feature-flag-driven API behavior. |
| **Microservices** | The **Integration Behaviour** dimension (§17) is designed for exactly this — test cases verifying a specific service-to-service contract/interaction, not just each service independently. |
| **Batch Jobs** | Preconditions become "input data set / trigger condition"; Steps become "invoke the job"; Expected Result becomes "output data set / side effect state" — same schema, different content. |
| **Queues** | Same pattern — Steps become "publish a message of shape X"; Expected Result becomes "consumer observes/processes it as Y." |
| **Cloud Services** | Steps become API/console calls against the provider; Configuration (§17) covers infrastructure-as-code/feature-flag-driven behavior differences. |

**What would need to change, explicitly, and what would not:** supporting any of the above requires only naming the new Steps/Test Data vocabulary for that system shape in the relevant test cases — it requires **no change** to the Traceability Model (§5), the Test Case Schema's field list (§6), the Negative Test Generation categories (§7), the Required Dimensions (§17), the Coverage Model (§8), the Standard Output Contract (§18), or the Handoff Contract (§21). Those are already defined in terms of requirements and evidence, not in terms of "a web page."

# 23. Direct Invocation

This skill is independently invocable — `/test-design-skill`, optionally with a run-scoped instruction (e.g. `/test-design-skill Login module only, negative cases only`). Full rules: `workflows_and_pipelines/pipeline/pipeline.md` §5.3.1.

- **Instruction prompts are run-scoped, never spec-overriding** (§5.3.1 #3). An instruction may restrict which requirements/modules to design for, emphasize a test dimension (§17), or set a depth. It never authorizes skipping traceability (§5), dropping a Required Dimension for a requirement that is in scope, reading the PRD directly (§4, §6 Rule 4), or treating Discovery as a requirements source.
- **Upstream `Pending Review` → request approval, then recommend** (§5.3.1 #4). Applies to either input: an un-approved Project Context or un-approved Discovery Artifacts. Report exactly which one is open, then offer both paths (approve → `/test-design-skill`, or revise → the producing skill's command).
- **Missing upstream → run degraded** (§5.3.1 #5), per input:
  - *No Project Context:* halt-equivalent for requirement traceability — there is no requirement set to trace to, so design nothing and report it as the blocking gap. This is the one input this skill cannot degrade around, because every test case's Traceability field would be unfillable.
  - *No Discovery Artifacts:* design from the Project Context alone. Mark every test case that would ordinarily carry a Discovery/Finding/Evidence reference as `Requires Upstream Stage — Stage 2 not run`, record the absence in the Coverage Report's Finding Coverage section as an explicit gap, and never invent selectors, UI labels, or observed behavior to fill it.
- **Closing message must recommend the next step** (§5.3.1 #6):

```
Stage 3 complete — Manual Test Suite → Pending Review
  platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.md (+ .xlsx)
  {T} test cases | Requirement coverage {P}%

This is the divergence point — once approved, either branch may run, in any order,
or both. Neither depends on the other.

Next step — approve, then choose a branch (or both):
  1. Approve:                  "approved"

  Then, independently:
     Manual delivery:          /manual-execution-skill
                               executes by hand (headed recommended; mode confirmed before the run)
                               → results, defects, CSV, QA report
     Automation delivery:      /automation-skill
                               live-verifies selectors (headless recommended; mode confirmed)
                               → suite → /automation-execution-skill

  Or revise this stage:        /test-design-skill <your feedback>
```

# 24. Observability — what this stage emits

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
| This stage starts | `STAGE_STARTED --stage 3` → keep the returned `spanId` |
| This skill starts | `SKILL_STARTED --stage 3 --skill test-design-skill` |
| This skill finishes | `SKILL_COMPLETED --span-id <id>` |
| This stage finishes | `STAGE_COMPLETED --stage 3 --span-id <id>` |
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
| Test cases are authored | `TEST_CASES_GENERATED --count <n> --module <slug>` |
| The suite Markdown is written or revised | `ARTIFACT_CREATED` / `ARTIFACT_UPDATED --artifact-class test-design` |
| `test_suite_export` runs | that tool emits its own `TOOL_*` and `VALIDATION_*` events |

**Do not emit an event for a `Review` or `Automation` decision.** Those are fields on the test case,
and the platform derives every Review/Automation total by parsing the Case Index with
`test_suite_export`'s own parser. An event carrying the same decision would be a second lifecycle
record of it — exactly what §5.4 of this document forbids — and the two would eventually disagree.

## Never emitted by this stage

- **Token counts or cost.** No event type exists for them. No supported run-attributable provider
  usage source exists, and nothing is estimated from text length or hardcoded pricing (HD-OBS-002).
- **A metric, ratio, or score.** This stage records what happened; the aggregator does the arithmetic.
- **A secret.** No password, token, API key, session ID, cookie, authorization header, or card detail
  reaches `--metadata`. Credential *identities* and roles are acceptable where genuinely needed.
- **An acceptance rate.** Test Case Acceptance Rate is a registered formula computed from the Case Index. This stage emits the count it generated and nothing more.

---

# 25. Resolving `{{MODULE_SLUG}}` and `{{RUN_FOLDER}}`

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

This stage **writes into the module**: `modules/{{MODULE_SLUG}}/test_design/`. It reads that module's `context/` and `discovery/` and never writes to either.

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

This stage never creates a run. Its inputs (Project Context, Discovery Artifacts) and its outputs all belong to the active run.

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

This stage (`3`) records its lifecycle in the run state model. These commands are mechanical. They never replace a reviewer's decision and never skip a gate. The full rule, and every stage's row, is `pipeline.md` §5.3.2.

1. **Entry — before any work:** `node platform_core/tools/run_manager/cli.js state start 3 --invocation <Pipeline|Direct|Direct (degraded)> [--instruction "..."]`. This runs the entry gate. **Exit code 2 means blocked:** do not start. Show the human the reasons, request what is missing (`pipeline.md` §5.3.1 #4), and name the next command. Without Discovery, start with `--invocation "Direct (degraded)"`. Without an approved Project Context the gate blocks — this Skill cannot degrade around it.
2. **Artifacts:** `node platform_core/tools/run_manager/cli.js state artifact 3 --artifacts <path[,path]> [--kind checkpoint|output|evidence]` for what this stage writes.
3. **Exit — this stage has a checkpoint:** `node platform_core/tools/run_manager/cli.js state request-approval 3 --artifacts <checkpoint artifact>`. Its checkpoint artifact is `platform_core_data/modules/{{MODULE_SLUG}}/test_design/TestCases_{Module}.md`. Finishing the work never marks the stage Completed.
4. **Approval:** only after the named reviewer approves and the artifact's own Status header reads `Approved`: `node platform_core/tools/run_manager/cli.js state approve 3 --approved-by "<reviewer>"`. It is refused if the header says anything else, or if the artifact is missing. A rejection: `state reject 3 --rejected-by "<reviewer>" --feedback "..."`.
5. **Blocked or failed:** `state block 3 --reason "..."` or `state fail 3 --reason "..."`, so the run records what it is waiting on.

**Changing approved work (`pipeline.md` §8.1).** Before modifying an approved test suite, run `node platform_core/tools/run_manager/cli.js state impact --artifact <path> --base <git revision>` (or `--changed <ids>`) and show the result to a human. The impact lists every dependent finding, case, automation, execution and report, and whether the change is blocking. The human records the decision with `--record --decision approved|rejected --by "<name>" --reason "..."`. A change reaching several modules or Suppliers is approved only by naming each one. Re-approving the changed artifact is refused without that decision. Never regenerate a suite: plan the change with `state duplicates --suite <TestCases_X.md> --proposed <draft.md>`, which keeps every existing Test Case ID, gives new cases the next free ID, and lists any case the draft omits for a human — a case is never deleted silently. `state trace` lists traceability gaps; `state conflicts` lists approved cases still citing superseded requirements, which block execution until a human decides.
