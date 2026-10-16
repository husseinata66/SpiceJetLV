---
name: automation-execution-skill
description: "Stage 5A of the Agentic AI Testing Platform's Automation Pipeline. A pure mechanical runner — executes an approved automation suite against a target environment and records raw, structured Execution Results (pass/fail/evidence, full cause-based Result Classification, and separated Application/Automation/Environment Health figures). It never diagnoses, repairs, or modifies automation code: that is the optional Stage 5H self-healing-skill's exclusive responsibility. Use when running an approved automation package against an environment."
inputs:
  - name: automation_suite
    type: file_path
    required: true
    description: Approved Automation Package at `platform_core_data/modules/{{MODULE_SLUG}}/automation/tests_{Framework}/`.
  - name: automation_summary
    type: file_path
    required: true
    description: Framework Used, Execution Instructions, Coverage, Known Limitations.
  - name: project_context
    type: file_path
    required: true
    description: Target environment, credentials, safety constraints.
  - name: execution_mode
    type: environment_var
    required: false
    description: "Headless | Headed | Debug. CONFIRMED WITH THE HUMAN IMMEDIATELY BEFORE EVERY EXECUTION (pipeline.md §6 Rule 11) — never defaulted, never inferred, never carried over from a previous run. A value in the Run Configuration is a proposal to confirm, not an authorization."
  - name: execution_scope
    type: environment_var
    required: false
    description: Which subset of the suite to run — full suite by default, or a Selective/Failed Test Re-run scope.
outputs:
  - name: execution_results
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md"
    description: "Structured per-test results, Evidence Inventory, Metrics, and separated Application/Automation/Environment Health figures."
  - name: execution_results_html
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.html"
    description: HTML companion of the Execution Results, in the platform's shared report design (§9A, pipeline.md §17) — generated from ExecutionResults.report.json by report_builder. A rendering only; ExecutionResults.md remains the single document Stage 6A reads.
  - name: execution_artifacts
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/execution/artifacts/"
    description: Captured screenshots, traces, logs, HAR files, framework reports.
dependencies:
  - automation-skill (upstream skill)
  - The test runner/framework CLI named in the Automation Summary's Execution Instructions
  - "platform_core/knowledge/patterns/execution_patterns/ (Platform Knowledge — execution/runner patterns only; repair_patterns/ and diagnosis_patterns/ moved to self-healing-skill with the repair engine)"
  - "self-healing-skill (OPTIONAL downstream skill, Stage 5H — human-invoked only, never auto-chained)"
---

> **Pipeline position:** Stage `5A` of the **Automation Pipeline** — consumes the approved Automation Suite, produces raw Execution Results. Followed by the **optional** Stage `5H` (`self-healing-skill`, human-invoked only) and then Stage `6A` (Reporting).
> **Traceability:** `Automation Script → Execution Result`.
> **Branch:** Automation only. It never executes a manually-designed test case — that is Stage `4M`'s responsibility, in the other branch (`workflows_and_pipelines/pipeline/pipeline.md` §3.3).
> **Revision history:** see `docs/CHANGELOG.md`.
>
> **Revision note (this revision, user-mandated):** this stage is now a **pure mechanical runner**. The Automation Repair Loop and its engines (previously §25–§29) moved to the new Stage `5H` [`self-healing-skill`](../self-healing-skill/SKILL.md) — see §25 for what remains here and why.

> **Revision note (2026-07-27, user-mandated):** this stage's artifacts live in this run's own Run Folder (`platform_core_data/runs/{{RUN_FOLDER}}/execution/`), and the persistent Workspace Automation Baseline lives at `platform_core_data/automation_baseline/{framework}/`. Each Markdown artifact is **one file, edited in place**: no `.vN` suffixes, and **no duplicate "final" copy is ever written on approval**. Refinement edits the same file the reviewer read. Git is the version history. See `workflows_and_pipelines/pipeline/pipeline.md` §7 and §12.
>
> **Revision note (2026-07-29, user-mandated):** **what this stage executes now depends on the run's module scope; where it writes does not change.**
>
> | Module scope | What is executed |
> |---|---|
> | `single` / `multi` | each named module's resolved root — the **standalone project** `platform_core_data/modules/{module}/automation/tests_{Framework}/` while it is `Draft`, or the **baseline's module-scoped suite** (`testng-{module}.xml`) once it is `Promoted` (§12.9). Resolve with `cli.js resolve-root`; never assume |
> | `full-project` | the **assembled baseline**, `platform_core_data/automation_baseline/{framework}/tests_{Framework}/`, as one system |
>
> Full-project execution running the assembled baseline is the *point* of assembly: it is the only way cross-module interaction is exercised at all. A module-scoped execution runs the module project directly, which is why that project is required to be standalone (`automation-skill` §11D.1).
>
> Results stay **per run and immutable** — `runs/{{RUN_FOLDER}}/execution/` — and a multi-module run writes **one** consolidated results file, with every result citing its module. This stage's only write under `modules/` is advancing that module project's `.module_automation_state.json` to `Executed` and recording this run in its `sourceRuns[]`. **It still never modifies automation code.** See [`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §9.1 and `pipeline.md` §4 (Stage 5A).

# 1. Skill Name

**Automation Execution skill** — v3

# 2. Purpose

The Automation Execution skill runs the automated test suite produced by Stage `4A` against a specified environment and produces a raw, unedited, structured record of what happened — pass/fail/skip status, durations, failure messages, cause-based classification, and captured artifacts (screenshots, traces, logs). It does not interpret, summarize narratively, or draw conclusions; that synthesis is the Reporting skill's job. Its only job is **faithful execution, faithful classification, and faithful recording**.

**It is deliberately a mechanical stage.** It has no checkpoint of its own because running an already-approved suite is deterministic rather than a judgment call — which is exactly why it must not also hold the authority to *change* that suite. Two things follow, and they are absolute:

- **It never modifies automation code**, for any reason, including an obvious one-line fix.
- **It never repairs, re-runs-after-fixing, or proposes a repair.** Diagnosing and fixing a failure belongs to the optional Stage `5H` (§25), on explicit human invocation only.

**Its most consequential output is an honest cause classification** (§17), because that classification is what decides whether a failure is even eligible for healing later — and it is what protects a genuine application defect from ever being "repaired" into silence (§25.2).

**As of v2, execution may not begin at all until an explicit Execution Mode is known.** This is a precondition alongside the existing environment-match check (§7 Rule 1) — this skill confirms both *where* it is about to run (target environment) and *how* (Headless/Headed/Debug) before invoking the test runner, and refuses to proceed on an assumed value for either.

# 3. Responsibilities

- Read the Automation Suite and confirm its structure before running anything.
- Read the Project Context to confirm the target environment, credentials, and which actions are safe to perform against it.
- Verify that the target environment for this run matches what the Project Context expects; halt and report a mismatch rather than proceeding blindly.
- **Confirm the Execution Mode with the human before running anything** (§5.1), every single time — including reruns, verification runs and regression runs. Never assume Headless, Headed or Debug, and never reuse the previous run's mode.
- Execute the automated test suite (in full, or a specified scope) using its configured test runner, invoked with whichever Execution Mode was determined above.
- Record, for every test executed, at minimum:
  - **Executed Test Case ID** — the manual Test Case ID this run traces back to (from the Traceability Matrix)
  - **Automation Script ID** — the specific automation script/file (and test name) that was run
  - **Status** — Passed / Failed / Skipped / Error
  - **Execution Time** — start time, end time, and duration
  - **Screenshots** — path/reference to any captured screenshot, especially on failure
  - **Logs** — path/reference to console/network/framework logs captured during the run
  - **Failure message / stack trace** (if applicable)
- Record the **Execution Mode** used for the run once, as a run-level Execution Metadata field (§5.2) — not per-test, since the mode applies uniformly to the whole execution.
- Never modify test code to force a pass, suppress a failure, or otherwise alter outcomes.
- Never run a test case against an environment the Project Context has not explicitly marked safe for that test's mutating actions.
- Produce a single, timestamped Execution Results artifact per run — reruns must be clearly labeled, never silently overwritten without a run identifier.
- **Adapt execution strategy to the run's Run Scope and Run Type** (§13) — an Entire Project run, a Bug's single-reproduction validation, and a Selective Re-run of only previously-failed tests are different activities, not one default "run everything" behavior.
- **Invoke the test runner in a framework-agnostic way** (§15) — determine how to invoke the suite from the Automation Summary's own Execution Instructions (`.claude/skills/automation-skill/SKILL.md` §25), never by assuming Playwright or hardcoding one framework's flags.
- **Classify every result using the full Result Classification set** (§17) — Passed/Failed alone is insufficient; this skill distinguishes Skipped, Blocked, Not Executed, Inconclusive, Flaky, and the four failure-cause categories (Infrastructure/Environment/Automation/Application/Configuration Failure).
- **Produce a structured Evidence Inventory** (§16) covering every evidence type actually captured (and naming what wasn't, and why), not only screenshots and logs.
- **Produce output conforming to the Standard Output Contract** (§18) so the Reporting skill never has to interpret free-form prose.
- **Recognize named Stop Conditions** (§19) and, rather than failing outright, recommend the smallest corrective action (§20) — retry, resume, switch mode, validate environment, re-run only the affected subset, or recommend Automation skill regeneration where the fault is in the generated automation itself, not the environment.
- **Verify handoff completeness in both directions** (§21) — confirm every input the Automation skill's output actually provides is used correctly, and confirm every input the Reporting skill's own specification declares it needs is present in the Execution Results.
- **Track and report execution Metrics** (§22) — duration, pass/fail/skip rates, retry count, evidence count, flaky test count, and execution stability — as part of the Standard Output Contract, not as an afterthought.
- **Execute reliably and deterministically** (§23) — stable test ordering, idempotent reruns, isolated failures that don't cascade into unrelated tests reporting false failures.

# 4. Inputs

| Input | Required? | Description |
|---|---|---|
| Automation Suite | Required | `platform_core_data/modules/{{MODULE_SLUG}}/automation/tests/` — the generated/reused project itself |
| **Automation Summary** (renamed from "Automation Coverage Summary" — see §21's Confirmed Contract Mismatch) | Required | `platform_core_data/modules/{{MODULE_SLUG}}/automation/AutomationSummary.md` — the consolidated handoff document per `.claude/skills/automation-skill/SKILL.md` §25: Framework Used, Coverage, Automation Decisions, Known Limitations, and — critically for this skill — **Execution Instructions**, which is what makes framework-agnostic invocation (§15) possible without this skill assuming a framework itself |
| Run Scope | Required (embedded) | Not a separate file — the Type/Source recorded in the Project Context's own Scope Summary (`workflows_and_pipelines/pipeline/run_scope.md` §3–§4), plus the Run Type (Full Regression/Smoke/etc., §5 there). Drives §13's strategy selection. |
| Project Context | Required | `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` — environment, credentials, safety constraints |
| Execution Configuration | Required, composite | Not a single file — the set of run-time execution parameters this skill must resolve before running anything: Execution Mode (§5.1), Concurrency Mode (§5.3), Retry Policy (§5.4), and Resume state (§5.5). Named explicitly here so none of these is a silent default — each has its own determination rule below. |
| Execution Mode | Required, and **never pre-supplied** — see §5.1 | Obtained by asking the human immediately before execution begins, every time. A Run Configuration value is stated back for confirmation, never used unconfirmed. One of: `Headless`, `Headed`, `Debug` — no other value is valid. |
| Framework Configuration | Required, not assumed | Not this skill's decision — sourced from the Automation Summary's Framework Used / Execution Instructions sections (§15). This skill never independently selects or assumes a framework; it only reads what Stage 4A already decided and justified. |
| Environment Configuration | Required (embedded) | The named environment (§14) this run targets, drawn from the Project Context's Environment Constraints — not a hidden default, and never inferred from where this skill itself happens to be running. |
| Execution scope / Execution Parameters | Optional | Which subset of the suite to run (defaults to the full suite); for a Selective Re-run or Failed Test Re-run (§13), this is the specific test case ID list or "previously Failed" filter. |
| Evidence Locations | Required (fixed convention) | `platform_core_data/runs/{{RUN_FOLDER}}/execution/artifacts/` — not configurable per run; named explicitly here so it's a stated input/convention rather than an implicit assumption. |
| Execution History | Optional — required only for Resume/Selective Re-run/Failed Test Re-run (§5.5, §13) | Prior Execution Results artifact(s) for this run (`ExecutionResults.md` and any `ExecutionResults.rerun-N.md`), consulted only to determine what to resume or re-run — never edited, never treated as this run's own result. |

# 5. Execution Mode

## 5.1 Determining the Mode

Before invoking the test runner on any test, this skill must determine exactly one Execution Mode:

> **Revision (2026-08-17, user-mandated) — the mode is confirmed with the human before EVERY execution.** Step 1 below previously let an Execution Mode configured in the Run Configuration stand as pre-authorization. It no longer does. `pipeline.md` §6 Rule 11 now binds every run against a live application — first execution, rerun, verification run, regression run, self-healing rerun, post-promotion live proof, one-off diagnostic — with no exception and no inference.

1. **Ask the human, immediately before the run starts.** Present the supported modes and wait for an explicit answer. Not at the start of the session, not bundled into an earlier planning question, and not carried over from a previous execution in this same session.
2. **Never infer or reuse the mode.** Not from the Run Configuration, not from a properties file, not from the environment ("CI implies Headless"), not from what the last run used, not from a config default. A configured value is a *proposal to confirm*, never an authorization: state it and ask, e.g. *"The Run Configuration says Headless — confirm Headless, or choose Headed/Debug?"*
3. **Silence is not an answer, and neither is an unrelated approval.** "Go ahead", an approved Run Configuration, or an approved repair plan do not answer this question. The run does not start until the mode is stated explicitly.
4. Once answered, proceed using that mode and record it per §5.2, so a later reader knows how the evidence was produced.

**Why this one gate is stricter than the rest.** Most gates ask once per artifact. This asks once per execution, because it is the single setting that decides what the human can see while their application is being driven — whether they are watching, sharing a screen, on a machine with no display, or checking behaviour that only appears headed.

**Supported Execution Modes** and what each means, independent of framework:

| Mode | Meaning |
|---|---|
| **Headless** | No visible browser/app UI; the fastest, most CI-like mode. |
| **Headed** | A visible, on-screen UI for every test. |
| **Debug** | Interactive step-through execution, for diagnosing a specific failure rather than a full unattended run. |

**How each mode maps to an actual invocation is never assumed by this skill — it is read from the Automation Summary's Execution Instructions** (`.claude/skills/automation-skill/SKILL.md` §25, and see §15 below), which state the concrete command/flag for whichever framework Stage 4A selected. This table previously hardcoded Playwright-specific flags (`--headed`, `PWDEBUG=1`); that was itself a framework assumption this revision removes — see §15 for the corrected, framework-agnostic mechanism.

## 5.2 Recording the Mode

The determined Execution Mode is recorded as a distinct, run-level field in the Execution Metadata (§8) — e.g., `"Execution Mode": "Headless"` — once per Execution Results artifact, not repeated per individual test result. A future rerun using a different mode is a distinct execution (its own Execution ID, per §8 Rule 9) and records its own mode value independently; modes are never merged or averaged across reruns.

## 5.3 Concurrency Mode — Parallel / Sequential

A separate axis from Execution Mode (§5.1) — concurrency determines *how many* tests run at once, not *how visibly*.

- **Sequential** — one test at a time. Default when the Run Configuration/Automation Summary does not specify otherwise, since it is the safest choice against a shared, non-isolated environment (per the Environment Constraints already carried in every Project Context this platform has produced to date).
- **Parallel** — multiple tests run concurrently, worker count sourced from the Run Configuration if stated. **Must not be assumed available or safe** — a shared staging environment's Environment Constraints (§14) may prohibit concurrent mutating actions; this skill checks this before enabling Parallel, and falls back to Sequential with a stated reason if Parallel is requested but not safe for this environment.
- Recorded in Execution Metadata alongside Execution Mode, e.g., `"Concurrency Mode": "Sequential"` or `"Concurrency Mode": "Parallel (4 workers)"`.

## 5.4 Retry Policy

- Sourced from the Run Configuration if it defines one (e.g., "retry failed tests up to 2 times"); if absent, defaults to **no automatic retry** — a Failed result is reported as Failed, not silently retried into a false Passed.
- Where a retry is configured and used, every attempt is recorded (per §22's Retry Count metric), and the final recorded Status reflects the last attempt — **but if any attempt failed, the Result Classification (§17) records this as `Flaky` rather than a clean `Passed`** if a later attempt succeeded, so a reviewer never mistakes "passed on retry" for "passed cleanly."
- Never conflated with the Investigation & Recovery Engine's retry logic (`.claude/skills/explorer-skill/SKILL.md` §5.7) — that is Explorer's exploration-time recovery; this is Execution's run-time retry of an already-generated, already-approved automated test.

## 5.5 Resume Capability

- Where a prior execution was interrupted (environment failure, timeout, manual stop) before completing the full suite/scope, this skill may **Resume** rather than restart from zero — reading Execution History (§4) to determine which tests already have a recorded outcome and running only the remainder.
- A Resume is still a distinct Execution ID (§8 Rule 9) whose Execution Metadata states `"Resumed From": "{prior Execution ID}"` and whose final Execution Results for the full logical run is the union of the prior recorded outcomes plus this session's — never a silent merge that loses which outcomes came from which execution.
- **Every Resume, Selective Re-run and Failed Test Re-run writes a new file** *(added 2026-10-08, `pipeline.md` §6 Rule 7b)*: `ExecutionResults.rerun-N.md` with its own `artifacts_rerun-N/`, beside the originals — the same convention Stage `5H` reruns already use (`pipeline.md` §4, Stage `5H`). `ExecutionResults.md` and every earlier `rerun-N` file are never edited or deleted. A union view is presented in the new file, with every outcome citing the Execution ID that produced it.
- Resume is only valid within the same Run — it never carries results forward across a new Run Scope or a new Automation Package version (§21).

## 5.6 Dry Run (future capability — not yet implemented)

A **Dry Run** mode — validating that the suite *would* execute (environment reachable, framework initializes, selectors resolve) without performing any mutating action or recording pass/fail outcomes — is a documented future capability, not implemented by this revision. Naming it here means adding it later requires only a new Execution Mode value and a corresponding Result Classification (§17) state, not a redesign of this section.

# 6. Outputs

**Execution Results** — a raw, structured record of a single test run, structured per the Standard Output Contract (§18): Execution Metadata, Execution Summary, per-test Execution Results, Evidence Inventory (§16), Execution Statistics/Metrics (§22), Failure Summary, Known Limitations, Execution Recommendations, and Inputs for Reporting skill. Every recorded result explicitly references: the Executed Test Case ID, the Automation Script ID, Status (per the full Result Classification, §17), Execution Time, and its Evidence Inventory entries — plus failure detail and an environment/run-identity header that includes the Execution Mode, Concurrency Mode, and Retry Policy used. No narrative interpretation. This remains a single artifact (§9) — the Standard Output Contract defines required internal sections, not new files.

# 7. Allowed Tools

- Shell/Bash (to install dependencies and invoke the test runner using whatever command the Automation Summary's Execution Instructions state, per §15 — never a hardcoded assumption of a specific framework's CLI)
- File tools: Read (automation suite, Automation Summary, Project Context), Write (execution results, logs)
- The test framework's own automation layer (browser, API client, mobile driver, or other, per whichever framework Stage 4A selected), as invoked by the test runner itself — not ad hoc manual interaction
- A direct means of asking the user a question and waiting for their answer — used for the Execution Mode confirmation in §5.1 before every execution (a Run Configuration value is stated back as a proposal, never used unconfirmed), and for the approvals §14A requires. Not used to ask about anything else within this skill's scope
- **`context7` MCP server** — **not used by this stage.** It was previously permitted here only inside the Automation Repair Loop; with the repair engine moved to Stage `5H` (§25), diagnosis-time documentation lookup moved with it. A pure runner has no question to ask a documentation server: it runs the suite as the Automation Summary's Execution Instructions specify, and records what happened.

**Not permitted:** editing test scripts to change their logic or expected assertions, editing the PRD/Project Context/test cases, or running any test the Project Context has not authorized for the target environment.

# 8. Execution Rules

1. Must confirm the target environment matches the Project Context before running anything; halt and report on mismatch.
2. **Must confirm an explicit Execution Mode with the human before running anything** (§5.1) — Headless, Headed, or Debug, asked immediately before each execution and never inferred or reused (`pipeline.md` §6 Rule 11).
3. **Must never assume a default Execution Mode.** Whether or not the Run Configuration names one, this skill halts and asks the human (§5.1), and does not proceed until an explicit answer is given. A configured value is only stated back as a proposal to confirm. If the chosen mode cannot be provided, it stops and asks again — it never switches mode silently (`pipeline.md` §6 Rule 11).
4. **Must record the determined Execution Mode in the Execution Metadata** (§5.2, §9) on every Execution Results artifact — an artifact missing this field is incomplete, per the same standard already applied to the other required fields in Rule 8 below.
5. Must not modify automation scripts to force a pass or hide a failure.
6. **Must evaluate every declared operation against the Execution Safety policy before invoking the runner** (§14A), through `platform_core/tools/execution_safety/` — never by interpreting constraint prose itself. A test whose operations resolve `Forbidden`, or whose `Approval Required` was refused, is **deselected from the invocation** and recorded `Skipped` with reason `Execution Safety Policy`.
6a. **Must record the Safety Preflight before executing anything** (§14A.2) with `state preflight 5A … --confirmed-by "<name>"` — the Run Manager writes it to the run's `metadata/`, never this Skill — and resolve every required authorization up front — one scoped question per policy scope, never one per test.
6b. **Must state the actual enforcement strength in Known Limitations on every run** (§14A.1) — suite-preflight and per-test, **not** per-operation, because the runner is an opaque external process. Claiming operation-level enforcement this stage does not have is a specification violation of the same category as assuming a framework's invocation syntax (Rule 11).
6c. **Must never record a policy block as an Application, Automation, Environment, Infrastructure, or Configuration Failure** (§14A.3, §25.2) — none of those occurred, and doing so corrupts the health separation Rule 20 exists to protect.
6d. **Must never treat `Automation = Approved` as authorization for the business mutations the suite performs** (§14A) — generation permission and execution permission are decided by different mechanisms.
7. Must record every test's outcome — no silent skips. A test that cannot run must be logged with an explicit reason.
8. Must not interpret, summarize, or draw narrative conclusions from the results — report raw outcomes only, verbatim.
9. Must timestamp and uniquely identify each run so results are never ambiguous about which execution they came from.
10. Must include, for every executed test, its Test Case ID, Automation Script ID, Screenshots, Logs, and Execution Time as distinct fields — a result missing any of these (where applicable/captured) is incomplete and must be flagged as such rather than submitted silently.
11. **Must never assume, hardcode, or default to a specific framework's invocation syntax.** The test runner command and flags come from the Automation Summary's Execution Instructions (§15) — a framework-specific assumption here (e.g., Playwright flags) is a specification violation, the same category of defect §8 of `.claude/skills/automation-skill/SKILL.md` names for generating unwrapped Selenium under SHAFT.
12. **Must select the Execution Strategy matching this run's Run Scope and Run Type** (§13) — never apply one default "run everything" behavior regardless of scope.
13. **Must classify every result using the full Result Classification set** (§17) — never collapse Blocked/Not Executed/Inconclusive/Flaky/the four failure-cause categories into a bare Passed/Failed/Skipped/Error.
14. **Must produce a structured Evidence Inventory** (§16) naming every evidence type captured and every one that could not be, with a reason for the latter — never silently omitted.
15. **Must recognize the named Stop Conditions** (§19) and, for any condition with a Local scope, continue executing every other unaffected test rather than halting the whole run — and must recommend the smallest corrective action for every blocked/failed item (§20), never a bare failure with no next step.
16. **Must verify Handoff completeness in both directions** (§21) before treating a run's Execution Results as finished — confirm the Automation Summary's Execution Instructions were actually followed, and confirm every input `.claude/skills/reporting-skill/SKILL.md` §4 declares it needs is present in the Execution Results.
17. **Must record execution Metrics** (§22) — duration, pass/fail/skip rates, retry count, evidence count, flaky count, execution stability — as part of every Execution Results artifact.
18. **Must execute deterministically and idempotently** (§23) — a rerun of the same suite against the same environment state must not itself be a source of divergent results; where non-determinism is observed, it is reported as `Flaky` (§17), never silently re-run until it passes.
19. **Must never diagnose, repair, or modify automation code** (§25) — for any reason, including an obvious one-line fix. Where at least one result classifies as `Automation Failure`, it **states that Stage `5H` self-healing is available and stops** (§25.3); it never invokes it, never proposes a repair, and never reruns after a fix.
20. **Must always report Application Health, Automation Health, and Environment Health as three separate figures** (§25.2) — never a single merged "Failed" count that would let a genuine application defect hide behind (or be mistaken for) an automation-authoring gap, or vice versa.
20a. **Must classify `Inconclusive` rather than guess `Automation Failure`** when the evidence does not clearly separate an automation fault from an application fault (§25.2) — a misclassification here is what could later expose a genuine application defect to a repair pass.
20b. **Must capture failure evidence rich enough to reason from** (§16, §25.1) — an exit code alone forces a Stage `5H` diagnosis pass that adequate evidence would have made unnecessary.
21. **Must run the Simple English Communication Standard check on the Execution Results and the Health summary before treating a run as finished** (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 10): short, direct sentences; any hard word replaced with an easier one where meaning stays the same; every necessary technical term briefly explained; a raw outcome kept visibly separate from any inference about its cause; and a first-read check for whether an Automation Lead could read the Health figures without needing this skill to explain them further. Test Case IDs, Automation Script IDs, and Result Classification values are never altered by this check.

# 9. Expected Artifacts

| Artifact | Path | Template |
|---|---|---|
| Execution Results | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md` | [`stage_5a_execution/ExecutionResults.md`](../../../platform_core/templates/stage_5a_execution/ExecutionResults.md) |
| Captured screenshots / traces / logs / HAR / framework reports | `platform_core_data/runs/{{RUN_FOLDER}}/execution/artifacts/` | — (evidence files, not a document) |

**The Execution Results document structure is defined by its template**, not restated here. Render it by copying the template and filling the `{{PLACEHOLDER}}` tokens; section order is mandatory and the inline `<!-- -->` guidance is stripped from the rendered output. The template encodes §18's 10-section contract, §17's 12 result classifications, §22's Metrics, and §25.2's three separated health figures. `platform_core/templates/README.md` states the shared conventions.

No new artifact paths are introduced by this revision — the Standard Output Contract (§18) defines required sections *within* the existing `ExecutionResults.md` file, preserving the Reporting skill's existing single-file input expectation (`.claude/skills/reporting-skill/SKILL.md` §4) without requiring any change on that skill's side.

The Execution Results document's run-identity header must include the Execution Mode, Concurrency Mode, and Retry Policy used, alongside the existing run-identity fields (Execution ID, environment, timestamps).

**Relationship to the Automation Asset Lifecycle (`workflows_and_pipelines/pipeline/pipeline.md` §12):** the Automation Suite this skill executes (§4) is **whatever `automation_lifecycle/cli.js resolve-root --module {{MODULE_SLUG}}` returns** — the module project for a `Draft` module, and the Workspace Automation Baseline for a `Promoted` one (§12.9). This skill never builds either path itself.

**Before promotion** it executes the module working copy and never touches the baseline, exactly as before. **After promotion** the baseline IS the module's suite, so executing it is not a violation of that rule but the direct consequence of it: there is no other copy. Two things still hold in the promoted case — this skill runs the **module-scoped suite** (`testng-{module}.xml` or the framework equivalent) unless a whole-project regression is explicitly asked for, and it **still writes no automation code**, so nothing it does can alter the baseline's source. If the resolver reports a retired module directory has reappeared, this skill halts and reports rather than running anything from it (§12.10 rule 3). Execution happens strictly *before* the Workspace Merge (§12.4), which only ever runs after Automation Approval; everything this skill produces — Execution Results and evidence — is exactly what Cleanup (§12.5) preserves forever once the run's source code is later removed, since none of it lives inside the merged package directory.

# 9A. Execution Results — HTML companion (`pipeline.md` §17)

The Execution Results are **also published in the platform's shared HTML report design**, generated by `platform_core/tools/report_builder`. Three files, same folder:

```
platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md            # the artifact
platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.report.json   # the report model
platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.html          # generated — never hand-edited
```

```bash
node platform_core/tools/report_builder/cli.js validate --model platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.report.json
node platform_core/tools/report_builder/cli.js build    --model platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.report.json
```

`validate` first — it exits `2` and names the exact path that is wrong; surface its message unchanged. Model reference: `platform_core/tools/report_builder/README.md`.

**The HTML never replaces the Markdown.** The Markdown is the artifact the Traceability Chain runs through and the one a reviewer approves; the HTML is a second rendering of the same content for stakeholders — never approved, never versioned, never read as input by any stage. **Rebuild it after every in-place correction** (`pipeline.md` §7), or the two disagree and the Markdown is the one that is right.

This introduces no new artifact path in the sense §9 means: `ExecutionResults.md` remains the single document the Reporting skill reads (§4 of `reporting-skill`). The HTML is a rendering beside it and is never an input to any stage.

### 9A.1 Mapping this stage onto the model

**Declare all twelve §17 classifications — never the four-state or binary collapse §17 exists to replace:**

```jsonc
"statuses": [
  { "key": "Passed",                 "tone": "pass"    },
  { "key": "Failed",                 "tone": "fail"    },
  { "key": "Application Failure",    "tone": "fail"    },
  { "key": "Automation Failure",     "tone": "blocked" },
  { "key": "Environment Failure",    "tone": "blocked" },
  { "key": "Infrastructure Failure", "tone": "blocked" },
  { "key": "Configuration Failure",  "tone": "blocked" },
  { "key": "Flaky",                  "tone": "warning" },
  { "key": "Skipped",                "tone": "warning" },
  { "key": "Blocked",                "tone": "warning" },
  { "key": "Not Executed",           "tone": "neutral" },
  { "key": "Inconclusive",           "tone": "accent"  }
]
```

The tones are deliberate: an **Application Failure is the only red alongside `Failed`**. Automation, Environment, Infrastructure, and Configuration failures are *not* the application's fault, and colouring them as application defects would produce exactly the misreading §17's rules forbid. A result whose status is not declared is a validation error, so a classification cannot be silently merged into a neighbouring one.

**The three health figures stay three separate figures** (§25.2) — Application Health, Automation Health, Environment Health, each its own stat card or `notes` entry. **Never one merged "failed" count.**

**A policy-blocked test is `Skipped`/`Blocked` with reason `Execution Safety Policy`** (§14A.3), carried in a row — never any kind of Failure, and never a status invented for the purpose.

**Every result carries its Executed Test Case ID, Automation Script ID, Execution Time, and Evidence Inventory references** (§6) in its rows, and its evidence paths in `evidence`. Retries and a `Flaky` outcome (§5.4) are one `exchange` per attempt, labelled `"Attempt 1 of 2"`.

**The run-identity header — Execution Mode, Concurrency Mode, Retry Policy, environment, timestamps** — goes in `meta.runFields` (§9).

**No narrative interpretation** (§6). The HTML renders the recorded facts; the synthesis is Stage `6A`'s job.

**Captured output goes through `text`, never `html`.** An application response, a UI message, a log line, and anything a human typed are escaped. `html` is only for markup this stage generated itself.

**Redact through the model's `"redacted": true`**, never by hand-typing a placeholder into a header value.

**Excerpt a very large capture and say so** in the exchange's `notes` — a full multi-hundred-KB body helps no reader, and silently truncating one misleads every reader.


# 10. Operational Contract

Role: automation suite execution and result recording (Stage `5A` of the Automation Pipeline) — a pure mechanical runner.

Execute the approved Automation Package against the target environment and record raw, structured Execution Results. Execution is fully specified above — §4 (Inputs), §5 (Execution Mode, incl. concurrency §5.3, retry policy §5.4, resume §5.5), §6 (Outputs), §8 (Execution Rules), §9 (Artifacts), §13 (Execution Strategy by Run Scope and Run Type), §14 (Environment Awareness), §15 (Framework-Agnostic Execution), §16 (Evidence Collection), §17 (Result Classification), §18 (Standard Output Contract), §19–§20 (Stop Conditions and Recovery), §21 (Handoff Contracts), §22 (Metrics), §23 (Execution Reliability), and §25 (Failure Handling — classify and hand off, never repair). This section adds no rules of its own; the contract is stated once above rather than restated here.

# 11. Example Execution

*Illustrative only — not executed as part of this task.*

```text
Input:
  platform_core_data/modules/{{MODULE_SLUG}}/automation/tests/
  platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md
  APP_URL          = https://opensource-demo.orangehrmlive.com/
  TEST_SCOPE       = all
  EXECUTION_MODE   = (not defined in Run Configuration)
```

Hypothetical result: this skill confirms the target environment matches the Project Context, then halts and asks the human for the Execution Mode before running anything — whether or not the Run Configuration names one: *"Which Execution Mode for this run: Headless, Headed, or Debug? (The Run Configuration proposes Headless.)"* Only after the user answers, say, "Headed," does this skill proceed to run `npx playwright test --headed`, and the resulting `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md` records `"Execution Mode": "Headed"` in its run-identity header alongside the usual per-test outcomes — e.g., "36 tests executed — 31 Passed, 3 Failed (TC-PIM-013 → `pim.spec.ts::AddEmployee_MissingName`, TC-PIM-014, TC-LEA-013 — validation messages not shown as expected), 2 Skipped (destructive Maintenance actions not authorized against the shared demo)," with each row showing its Test Case ID, Automation Script ID, Execution Time, and linked Screenshots/Logs under `platform_core_data/runs/{{RUN_FOLDER}}/execution/artifacts/`.

# 12. Architecture Principle

> Agents communicate through artifacts only. Each has a single responsibility. Every output becomes the input of another whenever applicable.

For this skill specifically: its single responsibility is faithful execution, faithful classification, and faithful recording — never interpretation, never repair (§25), and never silently deciding *how* to run on the user's behalf when that decision (Execution Mode) was left unspecified. Its output, the Execution Results, is the Reporting skill's (`6A`) primary input, and — only where a human explicitly invokes it — Stage `5H`'s input as well.

# 13. Execution Strategy by Run Scope and Run Type

Execution scope and priority follow the run's Run Scope Type and Run Type (`workflows_and_pipelines/pipeline/run_scope.md` §3, §5), named explicitly in this skill's Run Scope input (§4) — not one default "run everything" behavior regardless of what this run covers:

| Run Scope Type / Run Type | Strategy |
|---|---|
| **Entire Project** | Execute the full Automation Suite, every test case the Automation skill produced a Reuse/Generate decision for. |
| **Epic** | Execute the suites covering the Epic's constituent Features/Stories, plus any integration test cases designed at their seams (`.claude/skills/test-design-skill/SKILL.md` §16). |
| **Feature** | Execute only the one feature's suite. |
| **User Story** | Execute only the test cases traceable to that story's acceptance criteria — never opportunistically run adjacent, unrelated suite content just because it shares a file. |
| **Bug Validation** | Execute the specific reproduction and regression test case(s) tied to the Finding first; broader suite execution, if any, is a separate, explicitly scoped decision, not an automatic bundle. |
| **Full Regression** (Run Type) | Execute the entire suite, prioritizing already-covered/previously-passing areas to confirm continued correctness — this is the canonical "run everything" case. |
| **Smoke** (Run Type) | Execute only P1/critical-path test cases; everything else is deliberately not run this pass. |
| **Partial Suite** | Execute an explicitly named subset (module, tag, or suite) per the Execution scope input (§4) — the subset boundary is stated in Execution Metadata, never left implicit. |
| **Selective Re-run** | Execute only the specific test case IDs named in the Execution scope/Execution Parameters (§4) — e.g., re-running just the cases touched by a recent Automation Package change. |
| **Failed Test Re-run** | Execute only the test cases whose most recent recorded Status (per Execution History, §4) was Failed/Error/Flaky — never silently re-runs a Passed test as if it were new information. |
| **API** | Same strategy rules apply; "test" here may be a request/response cycle rather than a UI flow — the Result Classification (§17) and Evidence Inventory (§16) both already accommodate this without change. |
| **UI** | Baseline behavior, unchanged from the rest of this specification. |
| **Mixed** (UI + API in the same suite) | Execute the suite as authored — a single test case combining UI and API steps runs as one unit; its Status reflects the whole case, not a per-step average. |

If the Project Context/Run Scope does not state an explicit Type, this skill defaults to executing the full Automation Suite (Entire Project behavior) and states that default explicitly in the Execution Metadata.

# 14. Environment Awareness

This skill must never assume a specific environment — every run states, in its Execution Metadata, exactly which named environment it targeted, drawn from the Project Context's Environment Constraints:

| Environment | Meaning | Execution implication |
|---|---|---|
| **Local** | A developer's own machine. | Typically Headed/Debug-friendly; no shared-environment safety constraint applies unless stated. |
| **Development** | A shared dev environment, likely unstable/frequently changing. | Failures here may be Environment Failure (§17) rather than Application Failure — treat instability as expected, not automatically a defect. |
| **QA / Testing** | A dedicated test environment. | The most common target for Full Regression/Smoke runs. |
| **Staging / Pre-Production** | A production-like environment, often shared across teams. | Concurrency Mode (§5.3) defaults to Sequential here unless explicitly confirmed safe, per the existing shared-environment caution already carried in every Project Context this platform has produced. |
| **Production Validation (read-only)** | The live production system, with execution strictly limited to non-mutating verification. | This skill must confirm the Project Context explicitly authorizes read-only production validation before running anything here — absent that explicit authorization, Production is never a valid execution target, full stop (this is a stricter, non-negotiable case of Rule 6's existing "not explicitly marked safe" check). |
| **CI/CD** | An automated pipeline runner, not a human-attended session. | Concurrency/Retry Policy is typically sourced from CI-specific Run Configuration; Debug mode is not meaningful here and should not be selected. |
| **Container** | A containerized instance of the application/environment. | No different execution behavior from any other environment — named here so "container" is a recognized Environment Constraint value, not an unhandled case. |
| **Cloud** | A cloud-hosted target (dev/staging/prod, per the categories above). | Same as Container — the deployment substrate doesn't change execution behavior; only the named environment tier (Dev/QA/Staging/Production) does. |

**This skill must never infer the environment from where it itself happens to be running** (e.g., "I am running inside CI, therefore the target must be a CI-appropriate environment") — the target environment is always what the Project Context states, confirmed via Rule 1's existing environment-match check, regardless of this skill's own execution context.

# 14A. Execution Safety — what this stage may actually run

*(Added 2026-08-07, user-mandated.)*

The Automation skill decided what to **generate**. This stage decides nothing about that, and the Execution Safety policy decides whether what was generated may **run** here.

```text
Review = Approved AND Automation = Approved   → the asset exists          (automation-skill §27A)
Execution Safety                              → whether it may execute    ← this section
```

`Automation = Approved` never authorizes the underlying business mutations. A generated `DELETE` is an asset; permission to run it is a separate, later, environment-specific decision.

## 14A.1 Enforcement strength — stated honestly

**This stage enforces at SUITE PREFLIGHT, and at TEST SELECTION. It does not and cannot enforce per operation.**

That is a limitation of the architecture, not a choice, and overstating it would be worse than the limitation itself:

| Grain | Enforceable here? | Why |
|---|---|---|
| **Suite preflight** | ✅ Yes | Before invoking the runner, the full planned-operation set is evaluated and any `Forbidden` group is known |
| **Per test** | ✅ Yes | A test whose declared operations include a `Forbidden` action is **deselected from the invocation** and recorded `Skipped` — it is never handed to the runner at all |
| **Per operation** | ❌ **No** | This stage invokes an **opaque external runner** (§15 — Maven/SHAFT, `npx playwright test`, whatever the Automation Summary names). Once that process starts, this skill has no interception point inside it. Neither `browser_provider` nor `browser_driver` sits in that path, because the runner drives its own browser |
| **Per operation, inside the runner** | ⚠️ Only if the framework itself provides it | A framework-level hook could enforce per operation. **This platform does not currently generate one, and this stage must not claim it does.** |

**The practical consequence, and it must be stated in Known Limitations on every run:** safety enforcement at Stage `5A` is *pre-execution*. If a generated test performs an operation its declared set did not mention, no mechanism here stops it mid-flight. That is why the Automation skill's declaration of what each test does (§13, §27A) is load-bearing rather than documentation.

**Defence in depth, where it is genuinely available:** where a framework *does* expose a pre-action hook and the generated suite uses it, per-operation enforcement may be added — but only claimed on a run where it actually ran.

## 14A.2 The sequence

```text
1. Eligibility        the suite handed over is already Review+Automation approved     (unchanged)
2. Safety Preflight   evaluate every declared operation; write runs/{{RUN_FOLDER}}/metadata/SafetyPreflight.md
3. Resolve approvals  one scoped question per (environment, module, action, ownership) — never per test
4. Deselect           tests whose operations resolve Forbidden, or whose Approval Required was refused,
                      are removed from the invocation and recorded Skipped
5. Execute            the remaining suite, through the runner named in the Automation Summary (§15)
```

**Step 2 happens before step 5, always.** Discovering a prohibition by executing it is exactly the failure this stage exists to prevent.

## 14A.3 Recording a block

| Safety decision | Recorded as |
|---|---|
| `Allowed` | executes normally |
| `Approval Required`, granted | executes normally; the authorization ID is recorded in Execution Metadata |
| `Approval Required`, refused | `Skipped` (§17), reason **`Execution Safety Policy`** |
| `Forbidden` | `Skipped` (§17), reason **`Execution Safety Policy`**, matched rule named |

**A policy block is never an Application Failure, an Automation Failure, or an Environment Failure** (§17, §25.2). The application did not misbehave, the automation is not broken, and the environment is fine — the platform declined to act. Recording it under any of those three would corrupt the very health separation §25.2 exists to protect. `Skipped` already means *"deliberately not run — a decision, not a failure"*, and it is reused rather than extended.

Every deselected test still appears in every total, so a run can never report a clean pass rate against a suite that was quietly shortened by policy.

# 15. Framework-Agnostic Execution

**This skill must never assume Playwright, or any other single framework.** Prior versions of §5.1's Execution Mode table hardcoded Playwright-specific flags (`--headed`, `PWDEBUG=1`); that was itself a framework assumption, corrected by this revision.

## 15.1 How Invocation Is Actually Determined

1. Read the Automation Summary's **Framework Used** section (`.claude/skills/automation-skill/SKILL.md` §25) to know which framework was selected and why.
2. Read the Automation Summary's **Execution Instructions** section (same artifact) for the concrete command(s), required environment variables, and prerequisite setup — this is authored by the Automation skill specifically so this skill never has to guess.
3. Map the determined Execution Mode/Concurrency Mode/Retry Policy (§5) onto whatever flags/configuration the Execution Instructions state for those concepts in the selected framework — never onto a hardcoded, framework-specific flag this skill invented itself.

## 15.2 Framework Examples (illustrative only, never assumed)

| Framework | Example invocation shape (from Execution Instructions, not assumed here) |
|---|---|
| Playwright | `npx playwright test`, `--headed`, `PWDEBUG=1` |
| SHAFT Engine | TestNG suite XML invocation, Allure report generation as a post-step |
| Selenium (raw) | Whatever test runner wraps it (JUnit/TestNG/pytest), per the Execution Instructions |
| Cypress | `npx cypress run`, `--headed` |
| Appium | Framework-specific mobile test runner invocation, per the Execution Instructions |
| REST Assured / Postman | A build-tool invocation (e.g., Maven/Gradle) or `newman run`, respectively — no browser mode concept applies; Execution Mode may be `N/A` for these |

This table is illustrative, not authoritative — the authoritative source is always the Automation Summary's Execution Instructions for the specific project and run.

# 16. Evidence Collection

**Evidence Inventory** — the full set of evidence types this skill may capture during execution, structured and traceable per test result. Not every type applies to every framework/test; this skill records what was captured and explicitly names what wasn't, with a reason (mirroring the Explorer skill's own evidence-gap discipline, `.claude/skills/explorer-skill/SKILL.md` §5.10):

| Evidence Type | When applicable |
|---|---|
| Screenshots | UI-based frameworks; captured **on failure only** (`pipeline.md` §11.4) — never on passing tests or intermediate steps. A passing test with no screenshot is not a gap |
| Videos | UI-based frameworks where the runner supports session recording |
| Execution Traces | Frameworks with a trace/replay capability (e.g., Playwright Trace Viewer) |
| Console Logs | UI-based frameworks with browser console access |
| Network Logs / HAR Files | Any framework capturing request/response traffic |
| Execution Logs | All frameworks — the test runner's own stdout/stderr/log output |
| Framework Reports | Framework-native report formats (e.g., Allure for SHAFT/TestNG, Playwright HTML report) |
| Attachments | Any other framework-specific artifact (e.g., a downloaded file a test verified) |
| Failure Artifacts | Anything captured specifically because a test failed — stack trace, failure screenshot, failure-state DOM/response |

**Evidence Inventory as a required Execution Results section** (§18) lists, per test, exactly which of the above were captured, their file paths under `platform_core_data/runs/{{RUN_FOLDER}}/execution/artifacts/`, and — for anything not captured — the reason (e.g., "Videos: not supported by REST Assured for this API-only suite," not silently absent).

# 17. Result Classification

A binary Passed/Failed (or even the existing four-state Passed/Failed/Skipped/Error) understates what actually happens during execution. Every test result is classified as exactly one of the following:

| Status | Meaning |
|---|---|
| **Passed** | The test executed and every assertion succeeded. |
| **Failed** | The test executed and at least one assertion did not succeed — a genuine, reproducible discrepancy between expected and actual behavior. |
| **Skipped** | The test was deliberately not run (e.g., not authorized for this environment, per Rule 6) — a decision, not a failure. |
| **Blocked** | The test could not run because a precondition (a prior test in a dependent chain, required test data, an environment state) was not met — distinct from Skipped, which is a deliberate decision, and from Failed, which means it ran and didn't pass. |
| **Not Executed** | The test was in scope but the run ended (time limit, environment failure, manual stop) before reaching it — distinct from Blocked (a specific precondition failure) and Skipped (a deliberate decision). |
| **Inconclusive** | The test ran but produced a result this skill cannot confidently classify as Passed or Failed (e.g., an assertion that itself errored rather than evaluated false) — reported as such, never forced into Passed or Failed. |
| **Flaky** | The test's outcome was not consistent across attempts within this same execution (e.g., failed then passed on retry, per §5.4) — reported distinctly from a clean Passed so a reviewer knows reliability is in question even though the final attempt succeeded. |
| **Infrastructure Failure** | The test could not run due to a failure in the execution infrastructure itself (test runner crash, out-of-memory, CI runner failure) — not the application or the environment under test. |
| **Environment Failure** | The target environment was unreachable, degraded, or in an unexpected state not attributable to the application under test's own defects (e.g., a shared staging instance down for unrelated maintenance). |
| **Automation Failure** | The generated automation itself is broken (a stale selector, a script referencing a removed page object) — distinct from Application Failure; the application may be working fine, but the automation asset needs fixing (a signal back to the Automation skill, §20). |
| **Application Failure** | The application under test genuinely behaved incorrectly, and the automation/environment/infrastructure are confirmed not at fault — the closest match to a traditional "Failed" caused by a real defect. |
| **Configuration Failure** | Execution could not proceed correctly due to a configuration problem (wrong environment URL, missing credential, invalid Execution Mode/framework config) — distinct from Environment Failure, which is about the target system's own state. |

**Rules:**
- Every result gets exactly one classification — never zero, never more than one.
- `Failed` is reserved for genuine application-behavior discrepancies; where the cause is actually Infrastructure/Environment/Automation/Configuration, the more specific classification is used instead, so a reviewer doesn't mistake an environment hiccup for a real defect (or vice versa).
- Where the cause is genuinely ambiguous even after the failure detail is captured, `Inconclusive` is the honest classification — never force-fit into `Failed` for the sake of a cleaner-looking report.

# 18. Standard Output Contract

The Execution Results artifact (§9 — same file, no new artifact path) must contain exactly these sections, in this order, so the Reporting skill never has to interpret free-form prose to extract what it needs:

| # | Section | Must contain, at minimum |
|---|---|---|
| 1 | **Execution Metadata** | Execution ID, Run Scope/Run Type (§13), environment (§14), framework used, Execution Mode, Concurrency Mode, Retry Policy, timestamps |
| 2 | **Execution Summary** | One-paragraph narrative: what was executed, overall outcome, headline pass/fail figures |
| 3 | **Execution Results** | Per-test detail: Test Case ID, Automation Script ID, Status (§17), Execution Time, Evidence Inventory references, failure detail where applicable — and **§3.1 Assertion Records** for every `Passed` case: one row per assertion the case's Expected Result makes (Expected from the approved test case, never from the run's output; Actual; Check; Result; optional evidence file inside the run folder), taken from the framework's own assertion results. A `Passed` with no verified rows counts as `Unverified`; a failed or contradicted assertion makes it `Inconclusive` (`pipeline.md` §11.4, Phase 5.6B). A screenshot, trace or log is evidence, never the proof of a pass. Expected values are checked against the suite version Stage 4A was built on (Phase 5.7). Each record carries the case's **Assertion ID** (A1, A2 …) from its **Assertions:** table; every required assertion is recorded exactly once, with the approved Expected and Check — the generated test asserts exactly those (Phase 5.8). |
| 4 | **Evidence Inventory** | The consolidated list per §16 — every evidence type captured, per test, with paths, and every gap with a reason |
| 5 | **Execution Statistics** | The Metrics from §22 — duration, pass/fail/skip rates, retry count, evidence count, flaky count, stability |
| 6 | **Health Summary (§25.2)** | **Application Health, Automation Health, and Environment Health reported as three separate figures — never one merged "Failed" counter.** `Inconclusive`/`Flaky` reported as their own line, folded into neither. |
| 7 | **Self-Healing Availability (§25.3, when any `Automation Failure` occurred)** | The count of `Automation Failure` results and the literal `/self-healing-skill` commands available — a statement of availability only. **This stage never records a repair outcome**: any repair, and its Before/After comparison, is Stage `5H`'s artifact in `self_healing/`. Omitted entirely (not left empty) when no `Automation Failure` occurred. |
| 8 | **Known Limitations** | Anything this execution could not fully verify (e.g., a test marked Blocked, a Skipped mutating action) and why |
| 9 | **Execution Recommendations** | The corrective actions recommended per §20 for any blocked/failed item — retry, resume, switch mode, validate environment, re-run subset, or flag for Automation regeneration |
| 10 | **Inputs for Reporting skill** | The explicit handoff package per §21 — confirmation that every input `.claude/skills/reporting-skill/SKILL.md` §4 declares it needs is present |

# 19. Stop Conditions

This skill recognizes the following named conditions. Recognizing one is never, by itself, a reason to halt the entire run — see §20 for the required corrective-action recommendation before any blocked item is left unresolved.

| Condition | Scope | Required Action |
|---|---|---|
| **Missing Automation Package** | Global | Halt — there is nothing to execute. Report the gap; recommend confirming Stage 4A completed and its output is `Approved`. |
| **Missing Framework** (the Automation Summary doesn't state one, and none can be inferred) | Global | Halt — per §15, this skill never selects a framework itself. Recommend re-running the Automation skill to produce a complete Automation Summary. |
| **Missing Execution Configuration** (no explicit Execution Mode answer from the human for this execution) | Global | Per Rule 3: halt and ask the user directly — never default, and never take a Run Configuration value as the answer. |
| **Invalid Run Configuration** (e.g., an Execution Mode value other than Headless/Headed/Debug, or a Retry Policy that doesn't parse) | Global | Halt and report the specific invalid value — never silently coerce it to a nearest-guess valid value. |
| **Environment Unavailable** (target URL unreachable, application down) | Global | Halt; recommend validating the environment (§20) before retrying — never repeatedly retry against a genuinely down target as if that were a flaky-test problem. |
| **Authentication Failure** (the Project Context's credentials don't work) | Global | Halt; this is a credential/environment problem, not a test defect — classify any in-flight test as Environment Failure (§17), not Application Failure. |
| **Framework Initialization Failure** (the test runner itself fails to start — missing dependency, bad config) | Global | Halt; recommend the smallest fix (e.g., "run the install step from the Execution Instructions") rather than a bare crash report. |
| **Execution Dependency Failure** (a specific test's precondition — seed data, a prior test in a required chain — isn't met) | Local — that test only | Classify as `Blocked` (§17); continue executing every other test whose preconditions are met. |

# 20. Recovery Strategy — Smallest Corrective Action

Like the Test Design and Automation skills (`.claude/skills/test-design-skill/SKILL.md` §20, `.claude/skills/automation-skill/SKILL.md` §27), this skill's recovery behavior is: **never simply fail — recommend the smallest corrective action, and never let one blocked test stop the whole run.**

1. For a Local Stop Condition (§19, e.g., Execution Dependency Failure), continue executing every other unaffected test — a single blocked test is never a reason to produce zero output for the run.
2. For every failure/block, recommend the smallest corrective action from this list, matched to the Result Classification (§17) that caused it:
   - **Retry execution** — for a suspected transient Infrastructure/Environment Failure, within the configured Retry Policy (§5.4).
   - **Resume execution** — for a run interrupted mid-suite (§5.5), rather than restarting from zero.
   - **Switch execution mode** — e.g., recommend Debug mode specifically for re-diagnosing a single persistent Failed test, rather than re-running the whole suite Headless again.
   - **Validate environment** — for an Environment Failure or Authentication Failure, before any retry is attempted.
   - **Re-run affected subset only** — a Selective Re-run (§13) of just the failed/blocked test IDs, once the underlying cause is believed fixed.
   - **Recommend Automation Package regeneration** — where the classification is `Automation Failure` (a broken selector/reference, not an application defect) — this skill cannot fix the automation itself; it flags the specific test case(s) for the Automation skill to regenerate, per §21's upstream escalation path.
3. Every recommendation is recorded in the Execution Results' Execution Recommendations section (§18) — never only in a narrative aside a reviewer could miss.

# 21. Handoff Contracts

## 21.1 Automation skill → Automation Execution skill

| This skill needs (§4) | Satisfied by (`.claude/skills/automation-skill/SKILL.md` §16/§25) |
|---|---|
| Automation Suite | Automation Package (§16 #2) |
| Automation Summary (Framework Used, Execution Instructions, Coverage, Known Limitations) | Automation Summary (§16 #7, §25) |
| Project Context | Unchanged pass-through from Stage 1 |

**Confirmed Contract Mismatch (identified during the Automation skill's own v3 review, closed from this side):** this skill's §4 previously named the required input "Automation Coverage Summary" at path `AutomationSummary.md` — a filename that Automation skill v2's actual six-artifact split never produced (verified against the real `platform_core_data/runs/RUN-20260706-002/Automation/` output). Automation skill v3 closed this by adding an actual `AutomationSummary` artifact at exactly that path (`.claude/skills/automation-skill/SKILL.md` §16 #7, §25). This skill's §4 row is now renamed "Automation Summary" and its description corrected to match what that artifact actually contains — the mismatch is resolved on both ends as of this pair of revisions. `workflows_and_pipelines/pipeline/pipeline.md` §4 Stage 4A's artifact path list still references the same pre-v2 filename in its own prose; that file is out of scope for both this revision and the Automation skill's ("do not modify the pipeline"), so it remains a known, harmless label lag (the actual filename it names now happens to be correct again, by coincidence of the v3 fix, even though the document itself was never updated).

## 21.2 Automation Execution skill → Reporting skill

| Reporting skill needs (`.claude/skills/reporting-skill/SKILL.md` §4) | Satisfied by (this skill's output) |
|---|---|
| Execution Results (`ExecutionResults.md`) | §9 — unchanged path, now internally structured per the Standard Output Contract (§18) |
| Manual Test Suites | Not produced by this skill — unchanged pass-through from Stage 3 |
| Traceability Matrix | Not produced by this skill — unchanged pass-through from Stage 3 |
| Project Context | Unchanged pass-through from Stage 1 |

**No contract mismatch found on this side.** Reporting skill's own spec expects exactly one Execution Results file (not a separate Evidence Inventory/Metrics file) — this revision deliberately keeps the Standard Output Contract's nine sections (§18) *inside* that single existing artifact rather than splitting them into new files, specifically to avoid creating a second instance of the same category of drift just closed in §21.1. Reporting skill's existing per-test read of "Test Case ID, Automation Script ID, Execution Time, Screenshots/Logs references" (its own §4/§9) remains satisfied by this skill's Execution Results section (§18 #3) and Evidence Inventory (§18 #4) — no change required on Reporting's side, and none is made here.

# 22. Metrics

Every Execution Results artifact reports the following, consolidated in its Execution Statistics section (§18 #5):

| Metric | Definition |
|---|---|
| **Execution Duration** | Total wall-clock time for this execution, start to finish. |
| **Pass Rate** | Passed ÷ total executed (excludes Skipped/Blocked/Not Executed from the denominator, stated explicitly). |
| **Failure Rate** | (Failed + Application Failure) ÷ total executed — genuine application-behavior failures, kept distinct from infrastructure-caused non-passes. |
| **Skip Rate** | Skipped ÷ total in scope. |
| **Retry Count** | Total retry attempts made across the run, per §5.4. |
| **Evidence Count** | Total evidence items captured, per §16. |
| **Framework** | The framework actually used (from the Automation Summary, §15). |
| **Execution Mode** | Headless/Headed/Debug, per §5.1. |
| **Environment** | The named environment, per §14. |
| **Coverage Summary** | A restated pointer to the Automation Coverage Report's figures (`.claude/skills/automation-skill/SKILL.md` §16 #5) — this skill does not recompute coverage, only cites it for a reader who wants the figure alongside execution results. |
| **Flaky Test Count** | Count of results classified `Flaky` (§17). |
| **Execution Stability** | Flaky Test Count ÷ total executed — a simple, stated ratio, not a subjective judgment of "how stable" the suite is. |

# 23. Execution Reliability

- **Deterministic execution** — given the same Automation Suite, environment state, and configuration, a rerun produces the same classifications for the same tests; where it doesn't, the divergence is itself reported as `Flaky` (§17), never silently absorbed by re-running until a clean pass appears.
- **Stable ordering** — tests execute in a consistent, recorded order run-to-run (per the suite's own configured order, per `.claude/skills/automation-skill/SKILL.md` §10) unless Parallel execution (§5.3) is explicitly in effect, in which case the non-deterministic ordering itself is noted in Execution Metadata.
- **Repeatability** — a Selective Re-run or Failed Test Re-run (§13) of the same test IDs against an unchanged environment/automation version is expected to reproduce the same outcome; a case that doesn't is flagged `Flaky`.
- **Retry policies** — per §5.4, bounded and recorded, never silent or unbounded.
- **Failure isolation** — one test's failure must not cause unrelated tests to report false failures (e.g., leaked session state, uncleaned test data) — where the Automation skill's own idempotency rule (`.claude/skills/automation-skill/SKILL.md` §14, Execution Rule 20) was followed, this should not occur; where it is observed anyway, it is itself an `Automation Failure` classification (§17), not an application defect.
- **Partial reruns** — Selective Re-run/Resume (§13, §5.5) never silently discard or overwrite the prior execution's recorded outcomes for tests not included in the partial rerun — the full logical picture is always the union, clearly attributed by Execution ID.
- **Idempotent execution** — running the same test twice without an intervening state change produces the same result; where the application itself is not idempotent-safe for a given mutating test, that is a `Skipped`/environment-constraint case (Rule 6), not something this skill works around by suppressing the second run's evidence.

# 24. Future Scalability

The abstractions this revision relies on — framework-agnostic invocation (§15), a Result Classification (§17) already defined in terms of cause rather than "browser passed/failed," and an Evidence Inventory (§16) already itemized by evidence *type* rather than "screenshot" specifically — extend to non-web-UI systems and new testing disciplines with, at most, a new framework entry and new evidence-type rows, never a change to the Traceability fields, Standard Output Contract (§18), or Handoff Contracts (§21):

| Future capability | How it fits today's model |
|---|---|
| **Web** (current) | Baseline. |
| **API** | REST Assured/Postman (already listed, §15.2) as framework; Evidence Inventory's Network Logs/HAR rows already cover request/response capture; no browser-mode concept applies (Execution Mode may be `N/A`). |
| **Mobile** | Appium (already listed) as framework; Evidence Inventory extends with device logs/screen recordings under the existing Videos/Console Logs rows. |
| **Desktop** | A desktop-automation framework slots into §15's extensible framework list the same way SHAFT/Appium already do. |
| **Microservices** | Execution Strategy (§13) already treats a workflow spanning services as one suite, matching the Automation skill's own Suite Planning; Result Classification's Infrastructure/Environment Failure rows already distinguish a downstream service outage from an application defect. |
| **Batch Jobs** | A "test" becomes a job-trigger-and-verify cycle; Evidence Inventory's Execution Logs/Attachments rows already cover job output artifacts. |
| **Queues** | Same pattern — Evidence Inventory covers published/consumed message payloads as Attachments. |
| **Cloud Resources** | Environment Awareness (§14) already names Cloud as a deployment substrate; Framework Detection extends to a cloud provider's SDK/CLI. |
| **Performance Testing** | A new Result Classification consideration (a performance test "fails" on a threshold breach, not a boolean assertion) — fits under Application Failure (threshold genuinely breached) versus Infrastructure Failure (the load-generation infrastructure itself failed), without a new Status value. Metrics (§22) would extend with latency/throughput figures alongside the existing set. |
| **Security Testing** | Fits the existing model directly — a security assertion is still a Passed/Failed/Application Failure classification; Evidence Inventory's Network Logs/HAR rows are often the primary evidence type for this discipline already. |
| **Accessibility Testing** | An accessibility-scan result is still a test with a Status; Evidence Inventory extends with an "Accessibility Report" row alongside Framework Reports. |
| **Distributed Execution** | Concurrency Mode (§5.3) already models "more than one worker"; distributed execution across multiple machines/runners is the same concept at larger scale — Execution Metadata records however many distributed workers/nodes were used, the same way it records a local Parallel worker count. |

**What would need to change, explicitly, and what would not:** supporting any of the above requires naming a new framework (§15) and/or a new Evidence Inventory row (§16) — it requires **no change** to the Result Classification's cause-based structure (§17), the Standard Output Contract (§18), the Stop Conditions/Recovery Strategy (§19–§20), or either Handoff Contract (§21). Those are already defined in terms of test outcomes and evidence, not in terms of "a browser."

# 25. Failure Handling — classify and hand off, never repair

**This stage does not diagnose, repair, or modify automation code.** Its responsibility ends at an accurate, well-evidenced classification of every result (§17) and the three separated health figures (§25.2).

> **Revision note (this revision, user-mandated):** the **Automation Repair Loop, Repair Strategy Decision Engine, Repair Confidence Engine, and Automation Repair Knowledge Base** — previously §25–§28 of this document, plus §29's explainability rules — have **moved out of this skill entirely** into the new Stage `5H` [`self-healing-skill`](../self-healing-skill/SKILL.md). This stage reverted to a **pure mechanical runner**.
>
> **Why the split.** Repair reasoning and suite execution are different jobs with different risk profiles: running an approved suite is deterministic and needs no gate, while modifying already-approved code is a judgment call that needs one (`pipeline.md` §5.6). Keeping both in one skill meant every execution carried the authority to rewrite the code it was executing. There is now exactly **one** repair engine in the platform, so no boundary needs policing between a "tactical" and a "strategic" repairer.

## 25.1 What this stage does with a failure

1. **Classify it by cause** (§17) — Application / Automation / Environment / Infrastructure / Configuration Failure, or Inconclusive / Flaky.
2. **Capture its evidence** (§16) — screenshot, trace, log, HAR, framework report, as applicable. **The quality of this evidence directly determines whether Stage `5H` can reason about the failure at all**: a failure captured with only an exit code forces a diagnosis pass that richer evidence would have made unnecessary.
3. **Report it** in the Execution Results, with its cause and evidence.
4. **Stop there.** No code change, no rerun-after-fix, no repair proposal, no strategy enumeration.

## 25.2 Application / Automation / Environment Health — always separated

The Execution Results never report one merged "Failed" count. Three distinct headline figures:

- **Application Health** — computed only from `Application Failure` classifications plus genuine `Passed` results. **This is the only figure that speaks to whether the application under test actually works.**
- **Automation Health** — `Automation Failure` counted separately. This speaks to the quality/maintenance state of the suite, not the application.
- **Environment Health** — `Environment` / `Infrastructure` / `Configuration Failure` counted separately. This speaks to the target environment and execution infrastructure, not either of the above.

`Inconclusive` and `Flaky` are reported on their own line, never folded into any of the three — folding them either way would misrepresent which system is at fault.

**This separation is what makes Stage `5H` safe.** Healing is restricted to `Automation Failure` (`pipeline.md` §5.6.1), so an honest classification here is the mechanism that stops a genuine application defect from ever being "repaired" into silence. **A misclassified `Application Failure` is therefore the most consequential error this stage can make** — when the evidence does not clearly distinguish an automation fault from an application fault, classify it `Inconclusive` rather than guessing `Automation Failure`.

## 25.3 Handing off to Stage `5H` (optional, human-invoked only)

Where at least one `Automation Failure` exists, this stage **states that self-healing is available** and stops. It never invokes it (`pipeline.md` §3.6):

```
  {N} Automation Failures recorded. Self-healing is available but never automatic:
      /self-healing-skill            analyse every Automation Failure
      /self-healing-skill {module}   scope the pass to named modules
```

**Naming the option is not invoking it, and is not a recommendation to invoke it.** Many failing runs should not be healed — the right response is often to fix the application, fix the environment, or accept the finding.

# 30. Direct Invocation

This skill is independently invocable — `/automation-execution-skill`, optionally with a run-scoped instruction (e.g. `/automation-execution-skill run the Login spec only, headed`). Full rules: `workflows_and_pipelines/pipeline/pipeline.md` §5.3.1.

- **Instruction prompts are run-scoped, never spec-overriding** (§5.3.1 #3). An instruction may set the Execution Scope (a subset, a failed-test re-run) and may supply the Execution Mode explicitly — a mode the human types in the invocation that starts this execution is a valid answer to Rule 3's question for that one execution only (`pipeline.md` §6 Rule 11), and is recorded in the run-identity header. It never carries over to a later rerun. An instruction never authorizes assuming a *default* mode when none is given (Rule 3's halt stands), proceeding against an environment that mismatches the Project Context (Rule 1), running destructive actions the Project Context does not authorize, executing any root other than the one `automation_lifecycle/cli.js resolve-root` returns (§9), or repairing anything at all — repair is Stage `5H`'s exclusive responsibility (§25), and no instruction to this skill authorizes it. `/automation-execution-skill repair ...` is not a valid invocation; the correct command is `/self-healing-skill`.
- **Upstream `Pending Automation Approval` → request approval, then recommend** (§5.3.1 #4). This is the strictest gate in the pipeline (§5.2): approving it authorizes code to run against a real environment. A direct invocation never substitutes for it. Report it and offer both paths (approve → `/automation-execution-skill`, or revise → `/automation-skill <feedback>`).
- **Missing upstream → run degraded** (§5.3.1 #5):
  - *No Automation Package:* nothing to execute — existing §19 Stop Condition stands. This skill never generates what it would then run.
  - *No Automation Summary:* if the framework and execution command can be determined from the package itself, execute and mark the Results' framework basis as `Inferred from package — Requires Upstream Stage`. If the framework cannot be determined, the existing Missing Framework halt applies (§15 — this skill never selects one).
  - *No Project Context:* execute only if the target environment is supplied in the invocation; record the environment/safety basis as `Open Question — Requires Stage 1`, and treat every destructive action not authorized by default as prohibited.
- **A repair request is redirected, never honoured** (§25). An instruction asking this skill to fix, repair, or "make the failing tests pass" is answered by naming the correct stage and command (`/self-healing-skill`) — this skill does not do it, and does not treat the request as authorization.
- **Closing message must recommend the next step** (§5.3.1 #6):

```
Stage 5A complete — Execution Results
  platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md
  {P} Passed | {F} Failed | {S} Skipped | {B} Blocked | {I} Inconclusive | {X} Flaky

  Application Health:   {a} failures  <- the only figure about the application itself
  Automation Health:    {b} failures
  Environment Health:   {c} failures
  Execution Mode: {mode}

  No code was modified. This stage never repairs.

Next step — either:
  1. Produce the final report:   /reporting-skill
  2. Heal automation failures:   /self-healing-skill            (optional, Stage 5H)
                                 /self-healing-skill {module}   (scoped to named modules)
  3. Re-run as-is, no changes:   /automation-execution-skill re-run failed   (writes ExecutionResults.rerun-N.md; this file stays as recorded)
```

# 31. Observability — what this stage emits

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
| This stage starts | `STAGE_STARTED --stage 5A` → keep the returned `spanId` |
| This skill starts | `SKILL_STARTED --stage 5A --skill automation-execution-skill` |
| This skill finishes | `SKILL_COMPLETED --span-id <id>` |
| This stage finishes | `STAGE_COMPLETED --stage 5A --span-id <id>` |
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
| The suite preflight completes (§14A) | `SAFETY_PREFLIGHT_COMPLETED --metadata '{…totals…}'` |
| A test is deselected before invocation by policy | `SAFETY_BLOCKED --count <n> --test-case-id <ID>` |
| Each test's result is read from the runner report | `TEST_EXECUTION_RESULT --test-case-id <ID> --status <…> --attempt <n> --cycle <n> --error-type <classification>` |
| The runner itself fails to start | `TOOL_FAILED --tool <runner> --error-type <type>` |

**Cycle 1 is the first attempt.** Record `--attempt 1 --cycle 1` on the first execution, and increment
on each rerun. Getting this wrong does not produce a slightly-off metric — it silently converts
First-Pass Success into a post-repair success rate, which flatters the run.

**Per-operation telemetry is not available and must not be claimed.** §14A.1 already establishes that
the external runner is opaque: the platform observes suite and per-test outcomes only. Emitting an
event per browser action inside the runner is not possible, and asserting that granularity anywhere
in a report is a specification violation for the same reason it is under §14A.

## Never emitted by this stage

- **Token counts or cost.** No event type exists for them. No supported run-attributable provider
  usage source exists, and nothing is estimated from text length or hardcoded pricing (HD-OBS-002).
- **A metric, ratio, or score.** This stage records what happened; the aggregator does the arithmetic.
- **A secret.** No password, token, API key, session ID, cookie, authorization header, or card detail
  reaches `--metadata`. Credential *identities* and roles are acceptable where genuinely needed.
- **Timing invented for a test the runner did not report.** Read durations from the runner\'s own report (Surefire/Allure). A test the runner never reached has no duration, not a zero one.

---

# 32. Resolving `{{MODULE_SLUG}}` and `{{RUN_FOLDER}}`

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

This stage **writes only into the run** (`runs/{{RUN_FOLDER}}/execution/`). Its one write under `modules/` is the module project's `.module_automation_state.json`, advanced to `Executed`. It never modifies automation code.

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

This stage never creates a run. It executes the suite at the module's resolved root (§9: the module project for a `Draft` module; the baseline's module-scoped suite for a `Promoted` module; the assembled baseline for a `full-project` run) and writes Execution Results into the active run. It never modifies code at either location.

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

# Browser launch (Phase 9.4)

The stage's Safety Preflight (`state preflight 5A`) also authorizes the browser itself: pass `headless` (the human's answer) and `preflight: { runsDir, run, stage: '5A', id: 'SP-n' }` to `BrowserDriver.authenticate()` / the Browser Provider or `runSuite({ …, mode, preflight, environment, baseUrl })`. A launch without it, for a stage that is not Running, in a different mode, or with credentials for another environment or a base URL on another host than the preflight confirmed, is refused (`PREFLIGHT_REQUIRED` / `STAGE_NOT_RUNNING` / `MODE_MISMATCH` / `ENVIRONMENT_MISMATCH` / `TARGET_MISMATCH`).

# Run State Integration (pipeline.md §5.3.2 — added 2026-10-08)

This stage (`5A`) records its lifecycle in the run state model. These commands are mechanical. They never replace a reviewer's decision and never skip a gate. The full rule, and every stage's row, is `pipeline.md` §5.3.2.

0. **Safety Preflight — before entry:** record it with `node platform_core/tools/run_manager/cli.js state preflight 5A --environment <env> --target-url <url> --execution-type <browser|api|database|batch|other> [--execution-mode Headed|Headless] --operations <ops.json> --confirmed-by "<name>"` **before** `state start 5A` — the Run Manager writes `metadata/SafetyPreflight.md` itself and its entry gate refuses to start 5A without a confirmed, current preflight (Phase 9.2/9.3; never hand-write that file).
1. **Entry — before any work:** `node platform_core/tools/run_manager/cli.js state start 5A --invocation <Pipeline|Direct|Direct (degraded)> [--instruction "..."]`. This runs the entry gate. **Exit code 2 means blocked:** do not start. Show the human the reasons, request what is missing (`pipeline.md` §5.3.1 #4), and name the next command. No approved automation (Stage `4A`) blocks — there is nothing to run. Without a Project Context, start with `--invocation "Direct (degraded)" --environment-supplied` only when the environment was given in the invocation.
2. **Artifacts:** `node platform_core/tools/run_manager/cli.js state artifact 5A --artifacts <path[,path]> [--kind checkpoint|output|evidence]` for what this stage writes — at minimum `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md`.
3. **Exit — this stage has no checkpoint:** register the output, then `node platform_core/tools/run_manager/cli.js state complete 5A`. It is refused unless a registered output exists on disk.
4. **Blocked or failed:** `state block 5A --reason "..."` or `state fail 5A --reason "..."`, so the run records what it is waiting on.

**Capability gate, then the outcome (`pipeline.md` §17.5, `ndc_execution_rules.md` §A15).** On a Supplier run, before execution: `node platform_core/tools/capability_gate/cli.js plan --run <run>` — it writes `metadata/CapabilityPlan.md`, and the entry gate refuses to start Stage 5A without it. Cases it excludes are not executed; they are reported `Excluded` (not supported by supplier), outside the pass-rate denominator, never as failures. After the run: `node platform_core/tools/run_manager/cli.js state outcome 5A --from-results`. A failed-only re-run writes `ExecutionResults.rerun-N.md` and registers it with `state artifact 5A`; `ExecutionResults.md` is never edited. A pass after a failure with no repair reads `Flaky`.
