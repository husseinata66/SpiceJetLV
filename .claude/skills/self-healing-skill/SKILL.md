---
name: self-healing-skill
description: Stage 5H of the Agentic AI Testing Platform's Automation Pipeline — OPTIONAL and opt-in only. Applies evidence-grounded reasoning to Automation Failures from an execution run, proposes repair strategies with derived confidence, applies human-approved repairs to the automation suite, reruns only the affected tests, and records confirmed repairs to the shared Repair Knowledge Base. Works from Stage 5A Execution Results, or — when the human generated and ran the automation themselves in an IDE — from the suite's own last three execution reports (Allure/TestNG/JUnit/Playwright), repairing only failures in the new or changed tests and never the baseline. Use when an automation execution produced Automation Failures and a human explicitly asks to enhance/repair the suite for named modules or scope.
inputs:
  - name: execution_results
    type: file_path
    required: false
    description: Stage 5A Execution Results containing at least one `Automation Failure`, with its full Result Classification and Evidence Inventory. Required unless `external_execution_reports` is used instead (§4.2) — exactly one of the two must be present.
  - name: external_execution_reports
    type: file_path
    required: false
    description: "Fallback evidence source when Stage 4A/5A never ran for this suite because a human generated and ran the automation themselves in an IDE (§4.2). The framework's own report output — Allure results/report, TestNG/JUnit XML, Playwright JSON/HTML. The three most recent runs are read, never only the newest. Failures derived this way are `Derived` classifications, not Stage 5A classifications, and are healed only where they belong to new or changed tests rather than to the baseline (§4.3)."
  - name: automation_suite
    type: file_path
    required: true
    description: The module's standalone automation project at `platform_core_data/modules/{{MODULE_SLUG}}/automation/tests_{Framework}/`, whose failing tests are to be repaired. Repairs are applied here in place, with git as the before/after record.
  - name: project_context
    type: file_path
    required: true
    description: Target environment, credentials, and safety constraints governing any rerun.
  - name: repair_kb
    type: file_path
    required: false
    description: Shared Repair Knowledge Base (pipeline.md §10.8) — Platform repair/diagnosis/reasoning patterns plus prior runs' Repair Summaries. Consulted before deriving any new strategy.
  - name: selector_verification_kb
    type: file_path
    required: false
    description: Shared Selector Verification KB (pipeline.md §10.8) — verified locators per screen/component, used to repair a broken locator against known-good evidence rather than by guessing.
  - name: healing_scope
    type: string
    required: false
    description: Optional module/test-ID scope for this healing pass (e.g. "Login, Agency" or "TC-LOGIN-004..009"). Absent means every Automation Failure in the Execution Results. A multi-module scope produces one healing folder per module.
outputs:
  - name: repair_summary
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.md"
    description: Per-failure diagnosis, strategies considered, strategy selected, Repair Confidence Report, and outcome.
  - name: repair_summary_html
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.html"
    description: HTML companion of the Repair Summary, in the platform's shared report design (§18A, pipeline.md §17) — generated from RepairSummary.report.json by report_builder. A rendering for stakeholders, never the approved artifact.
  - name: before_after_comparison
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/healing/BeforeAfterComparison.md"
    description: Fixed / Remaining / New-failure classification after the targeted rerun.
  - name: quarantine_register
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/healing/QuarantineRegister.md"
    description: Tests withdrawn from healing after repeated failed repair attempts, with full attempt history.
  - name: repaired_automation_suite
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/automation/tests_{Framework}/"
    description: The module's automation project with approved repairs applied IN PLACE — there is no separate healed copy; git is the before/after record. Requires fresh Automation Approval before it assembles into the baseline.
  - name: rerun_execution_results
    type: file_path
    location: "platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.rerun-{N}.md"
    description: The post-repair rerun's results, APPENDED to the triggering run's execution folder as an additional cycle. The original ExecutionResults.md is never edited. This is the only write this skill makes outside the module.
dependencies:
  - automation-execution-skill (upstream skill — supplies classified Execution Results)
  - automation-skill (owns the suite being repaired, and the Selector Verification KB this skill reads)
  - Playwright MCP server (headless) for diagnosis evidence and targeted reruns
---

> **Pipeline position:** Stage `5H` of the **Automation Pipeline** — sits between Stage `5A` (Automation Execution) and Stage `6A` (Reporting). **Optional and opt-in only** (`workflows_and_pipelines/pipeline/pipeline.md` §3.6).
> **Traceability:** `Execution Result (Automation Failure) → Diagnosis → Repair Strategy → Repair Confidence Report → Applied Repair → Targeted Rerun → Automation Repaired | Remaining | Quarantined`.
> **Branch:** Automation only. This skill never touches a Manual Execution artifact (§3.3), and the Manual branch never invokes it.
>
> **Origin note:** this skill absorbs the **Automation Repair Loop, Repair Strategy Decision Engine, Repair Confidence Engine, and Automation Repair Knowledge Base** that were previously §25–§28 of `automation-execution-skill/SKILL.md`. Those sections are removed there and live here, and nowhere else — there is exactly one repair engine in the platform, so there is no boundary to police between a "tactical" and a "strategic" repairer. Stage `5A` reverted to a pure mechanical runner as a result.
>
> **Revision note (2026-07-29, user-mandated):** **output locations only — every behavioural rule in this skill is unchanged.** It is still optional, still opt-in only, still never triggered by a failing execution, still governed by the §5.6 Batch Repair Approval gate, and still forbidden from healing an Application Failure. What changed is where each kind of output lands, and the split follows one rule — durable design output to the module, execution evidence to the run:
>
> | Output | Goes to | Because |
> |---|---|---|
> | Repair Summary, Confidence Reports, Before/After Comparison, Quarantine Register | `modules/{module}/healing/` | It describes **that module's suite**, which is durable |
> | Repair **code** | in place in the module's **resolved root** — `modules/{module}/automation/tests_{Framework}/` while Draft, or the module's owned paths inside `automation_baseline/{framework}/tests_{Framework}/` once Promoted (`pipeline.md` §12.9) | The resolved root *is* the suite being healed; git is the before/after record. Resolve with `cli.js resolve-root`, never by building a path |
> | The **rerun's results** | `runs/{{RUN_FOLDER}}/execution/ExecutionResults.rerun-N.md` | A rerun is an execution, and belongs with the execution it is a cycle of |
>
> Three consequences worth stating outright: **there is no separate healed copy** of the suite (§13); **the original `ExecutionResults.md` is never edited**, so run immutability holds and "12 failed, then 10 passed after repair and 2 quarantined" reads as one story in one folder; and a **multi-module invocation produces one healing folder per module**, never a combined cross-module repair document, because a repair is always to one module's suite. See [`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) §8.

# 1. Skill Name

**Self-Healing skill** — v1

# 2. Purpose

The Self-Healing skill exists to answer one question, with evidence: **when generated automation fails, is the automation wrong — and if so, what is the smallest correct change that makes it right?**

It applies reasoning to `Automation Failure` results from Stage `5A`, proposes repair strategies grounded in cited evidence and prior confirmed repairs, applies only human-approved repairs, reruns only the affected tests, and records what actually worked so the platform does not rediscover the same fix by failing again.

**Its value is reasoning quality, not throughput.** A repair applied on a guess is worse than no repair: it consumes an approval, mutates reviewed code, and — if it happens to make a test pass for the wrong reason — destroys the signal the test existed to provide. This skill is therefore built to *decline* to repair more readily than to attempt one (§7, §8).

## 2.1 What this skill must never do

Three prohibitions define this skill more sharply than its capabilities do:

1. **Never heal an application defect.** A test failing because the application is genuinely broken must never be modified to stop failing (§8). This is the single failure mode that would turn the platform from a defect-detection system into a defect-concealment system.
2. **Never run automatically.** No failing execution, and no orchestrator, may invoke this skill (§6). A human asks, or it does not run.
3. **Never repair on low confidence.** Below a High root-cause confidence, the only permitted action is *diagnosis* — gathering evidence, changing nothing (§7.1). *Root-cause* confidence (§7.1) is the gate on proposing at all — `state heal propose` refuses Medium or Low (`DIAGNOSIS_ONLY`), and refuses High unless the observed root cause is cited (Phase 9.3). The *repair*-confidence band (§9.2: High 90–100 · Medium 70–89 · Low < 70) is a separate, later measure: a Medium or Low band repair still needs its own named approval before apply.

# 3. Responsibilities

- **Fall back to the framework's own reports when Stage `4A`/`5A` never ran** (§4.2) — read the last three runs, derive and label each classification as `Derived`, and repair only what belongs to new or changed code, never the baseline (§4.3).
- **Accept only `Automation Failure` as repair scope** (§5) — and refuse `Application Failure` categorically, `Environment`/`Infrastructure`/`Configuration Failure` as out of scope, and `Inconclusive` unless a human explicitly admits it to a diagnosis pass.
- **Consult the shared Repair KB and Selector Verification KB before deriving anything new** (§10, `pipeline.md` §10.8) — a confirmed prior repair is a candidate strategy citing its Rule ID, never re-derived from scratch.
- **Establish Root Cause Confidence before proposing any repair** (§7.1) — and propose diagnosis rather than repair at Medium or Low.
- **Enumerate 2–4 named strategies per failure, never one** (§7.2) — each with pros, regression risk, and an evidence-derived confidence percentage.
- **Produce a Repair Confidence Report per selected strategy** (§9) — every percentage built additively from cited evidence factors, never a round number that felt right.
- **Ask exactly once, for the whole batch** (§6.2, `pipeline.md` §5.6) — never once per test case.
- **Apply only approved repairs, to automation code only** (§11) — never to test cases, Project Context, Discovery artifacts, or the application.
- **Rerun only the affected tests** (§12) — never the full suite unless every test in it was repaired.
- **Produce a Before/After Comparison** (§13) distinguishing Fixed, Remaining, and New failures — a repair that introduced a regression is reported as such, never buried.
- **Label a repaired pass `Automation Repaired`, never `Passed`** (§13) — so no reader mistakes a fixed test for a clean first attempt.
- **Quarantine rather than repair indefinitely** (§14) — at most **three** repair attempts per test; the third unsuccessful attempt quarantines it with its history, and a fourth is refused.
- **Write confirmed repairs only** (§10.2) — a repair that did not work contributes nothing to the KB, however plausible its reasoning was.
- **Re-enter the Automation Approval gate before any re-merge** (§15) — Stage `4A`'s approval does not cover code this skill changed.
- **Be scoped by the invocation** (§4.1) — a healing pass named for `Login` touches nothing outside `Login`.

# 4. Inputs

| Input | Role | Required? | Description |
|---|---|---|---|
| Execution Results | **Primary** | Required *(unless §4.2 applies)* | `platform_core_data/runs/{{RUN_FOLDER}}/execution/ExecutionResults.md` — with full Result Classification and Evidence Inventory. At least one `Automation Failure` must be present, or there is nothing to heal (§16). |
| External Execution Reports | **Primary fallback** | Required *only* when there are no Stage `5A` Execution Results (§4.2) | The framework's own reports from a human-run execution — Allure, TestNG/JUnit XML, Playwright JSON/HTML. The **three most recent runs** are read. Produces `Derived` classifications, never Stage `5A` ones. |
| Automation Suite | **Primary** | Required | The module's **resolved root** (`cli.js resolve-root --module {{MODULE_SLUG}}`): the module working copy while the module is `Draft` — never the baseline directly (`pipeline.md` §12.3) — or, once the module is `Promoted`, its owned paths **inside** the baseline, which is then the only copy that exists (§12.9). Under §4.2 this may instead be the human's own automation project, at the path they name. |
| Project Context | Governing | Required, must be `Approved` | Target environment, credentials, safety constraints governing the rerun. |
| Repair KB | Secondary | Optional (read) | Platform `repair_patterns/`, `diagnosis_patterns/`, `reasoning/` + prior runs' Repair Summaries (`pipeline.md` §10.8). Absent means no prior art — reasoning proceeds from evidence alone, and every strategy's confidence is capped accordingly (§9.2). |
| Selector Verification KB | Secondary | Optional (read) | `knowledge_base/browser/screens/`, `.../components/` — verified locators with their code-state anchors (`pipeline.md` §10.8). |
| Healing Scope | Governing | Optional | The modules/test IDs this pass covers. Absent = every `Automation Failure` in the Execution Results. |

**This skill must never read the PRD** (`pipeline.md` §6 Rule 4). A test whose *expected result* appears wrong is a Test Design discrepancy to disclose (§8.3), never a reason to consult requirements directly.

**It never reads a Manual Execution artifact.** Branch isolation (`pipeline.md` §3.3) is not relaxed for repair: a manual pass or failure is not evidence about automation correctness.

## 4.1 Scope discipline

A healing pass is bounded by its invocation and reports its own bounds:

- **Scoped invocation** (`/self-healing-skill Login, Agency`) — only failures in those modules are analysed. Failures outside are listed, untouched, under *Out of Scope for This Pass*, so an unscoped failure is never mistaken for a resolved one.
- **Unscoped invocation** (`/self-healing-skill`) — every `Automation Failure` in the Execution Results is analysed.
- **Scope never widens mid-pass.** Discovering that a `Login` repair would also fix an `Agency` test does not authorize touching `Agency`; it is recorded as a recommendation for a later pass.

## 4.2 External Execution Evidence — healing a human-run suite

Stage `4A` and Stage `5A` are the normal path, but they are not the only way automation reaches a failing state. A human may write or extend the suite in their own IDE and run it there. When such a human then asks for `5H`, the failures are real and the suite is real — only the platform's paperwork is missing. This skill does not refuse that pass. It falls back to the framework's own execution reports.

**When this mode is entered.** All three must hold:

1. The invocation asks for `5H` on a named module or suite, and
2. no `runs/{{RUN_FOLDER}}/execution/ExecutionResults.md` exists for it — or the human states outright that they generated and ran the automation themselves, and
3. at least one machine-readable execution report exists for that suite.

If (3) fails, the pass halts per §16. This mode is never used to *replace* Execution Results that do exist: a present Stage `5A` artifact always wins, and a human-run report is then only supporting evidence.

**Where the reports are found.** The suite's own output folders, by framework:

| Framework | Read | Run identity comes from |
|---|---|---|
| SHAFT / TestNG / JUnit (Java) | `allure-results/`, `allure-report/`, `target/surefire-reports/`, `test-output/` | Allure `*-result.json` `start`/`stop` fields; XML `timestamp` |
| Playwright | `playwright-report/`, `test-results/`, `results.json` | Report `startTime` |
| Any | Whatever the human names in the invocation | The report's own timestamps |

**Read the last three runs, not the last one.** A single report says which tests are red now. Three consecutive reports say *when each one turned red* — and that is the evidence this mode depends on to tell a new break from an old one (§4.3). If fewer than three exist, work with what exists and state the count; confidence is capped accordingly (§9.2). Reports are read **read-only**; this skill never deletes, regenerates, or overwrites a human's report folder, and no raw report dump is copied into the project tree (`pipeline.md` §11).

**What is derived, and how it is labelled.** With no Stage `5A` pass, no Result Classification exists, so this skill derives one per failure from the report evidence — stack trace, failure message, screenshot, attached DOM, retry history. Every such classification is written as **`Derived — {class}`**, never as a plain classification, and every derived classification carries its evidence citation. The rules that follow are unchanged by derivation:

- **A `Derived — Application Failure` is still never healed** (§8). Deriving the class does not soften the prohibition — it makes it more important, because no Stage `5A` reviewer saw it first.
- **A derived classification is a *proposal to the human*, not a fact.** It is shown at the §6.2 gate as derived, and the gate's approval covers the classification as well as the repair.
- **Derivation is capped at Medium Root Cause Confidence when the report is the only evidence.** To reach High, the failure must be reproduced live through the Playwright MCP server, exactly as any other failure must (§7.1). A report alone is a record of someone else's run, not an observation of this one.

## 4.3 New code versus baseline — the boundary of an external pass

In this mode the pass repairs **only failures that belong to new or changed tests**. A test that was already failing before the human's change is a pre-existing baseline failure: it is reported, and it is left alone.

**Why the boundary exists.** The human asked for help with what they just built. A baseline failure predates that work, may be a known issue, may be an application defect nobody has triaged, and may be owned by someone else entirely. Silently repairing it spends an approval on unrequested work and hides a signal the team may be deliberately carrying.

**How a failure is placed on one side of it.** Two independent sources, and they must agree:

1. **Code evidence** — `git diff` / `git log` on the suite: which test files, methods, page objects, and data files are new or modified relative to the baseline commit (`pipeline.md` §12.3). A failing test that touches only untouched code is baseline-side.
2. **Report evidence** — the three reports (§4.2): a test red in all three, including runs that predate the change, is baseline-side. A test that passed in an earlier report and is red in the newest is change-side.

**When the two disagree, the failure is not classified — it is asked about.** It is listed at the gate as *Ambiguous — needs your call*, with both sources shown. This skill never resolves the disagreement by preferring the answer that gives it more to repair.

**Reporting the boundary is mandatory.** The Repair Summary lists, separately and by ID:

- **In scope — change-side failures**, with the evidence placing each there,
- **Out of scope — pre-existing baseline failures**, untouched, so nobody reads the pass as having cleared them,
- **Ambiguous**, with the human's decision recorded against each.

If a repair to a change-side test would also require editing baseline code, that is not an automatic widening: it is presented as a named strategy with its blast radius, and the human decides at the gate (§7.2).

# 5. Eligibility — what may be healed

Stage `5A` classifies every result by *cause*. That classification is this skill's gate, and it is applied before any reasoning begins:

| Stage `5A` Classification | Eligible? | Why |
|---|---|---|
| **Automation Failure** | **Yes** — the only eligible class | The automation itself is at fault: a stale locator, a missing wait, a bad setup assumption. Fixing it is this skill's entire purpose. |
| **Application Failure** | **Never** (§8) | The application is genuinely broken. The test is correctly reporting a defect. "Healing" it would suppress a real finding. |
| **Environment Failure** | No | A target environment problem. The fix is to the environment, not the code. Reported, not healed. |
| **Infrastructure Failure** | No | The execution infrastructure failed (runner, container, network). Not an automation defect. |
| **Configuration Failure** | No | Misconfiguration (credentials, base URL, profile). Corrected in configuration, not by patching tests. |
| **Inconclusive** | **Diagnosis only, by explicit human choice** | The cause is not yet known to be automation-side. It may be admitted to a *diagnosis* pass to establish cause; it is never admitted to a *repair* pass by default. |
| **Flaky** | Diagnosis first, then repair if automation-side | Non-determinism is often a genuine automation defect (a race, a missing wait), but the root cause must be established before a repair — a "fix" that merely lowers failure frequency is not a fix (§14.1). |

**Under §4.2 this table is applied to `Derived` classifications in exactly the same way** — a `Derived — Application Failure` is refused as categorically as a Stage `5A` one, and a `Derived — Automation Failure` still has to clear the §4.3 change-side boundary before it is eligible.

**A misclassification discovered mid-pass is corrected, not worked around.** If reasoning establishes that a failure labelled `Automation Failure` is in fact any other class, this skill stops work on that test, records the reclassification with its evidence, and reports it — even where the batch containing it was already approved (§8.2).

# 6. Invocation — opt-in, never automatic

## 6.1 The trigger is a human, always

This skill has **no auto-trigger**. Specifically:

- A Stage `5A` execution producing `Automation Failure` results does **not** invoke it.
- No orchestrator may chain into it, and "the previous stage finished with failures" is never authorization (`pipeline.md` §4.1 note, §3.6).
- A prior healing pass does not schedule the next one.

It runs when a human issues `/self-healing-skill`, optionally with scope. That is the only entry point.

**Why it is opt-in.** Healing costs a human approval and mutates reviewed code. Many failing runs should not be healed at all — the right response to a red suite is often to fix the application, fix the environment, or accept the finding. A stage that ran automatically would apply repair pressure to every failure regardless of which of those was true, and the most common outcome of automatic healing is a green suite that no longer tests anything.

## 6.2 The gate — asked once per pass

Per `pipeline.md` §5.6.2, after presenting every analysed failure together:

```
Self-Healing — {N} Automation Failures analysed, {R} repairs proposed, {D} need diagnosis first
Scope: {modules or "all failures"}

  {module}  {TC-ID}  {root cause, one line}   confidence {NN}%  risk {Low|Med|High}
  ...

  Out of scope for this pass:  {IDs, if any}
  Not eligible:                {IDs + classification, per §5}

Proceed?
  1. Apply proposed repairs and rerun only affected tests
  2. Diagnose only — gather evidence, change no code
  3. Mark as Known Automation Issue (no change, recorded)
  4. Skip — leave results exactly as Stage 5A reported them
```

**When the evidence came from external reports (§4.2), the gate carries three extra blocks, above the options** — because the human is approving a classification and a boundary, not only a repair:

```
Evidence source: external reports (no Stage 5A run)
  Reports read:   {N} runs — {report paths + their timestamps}
  Baseline ref:   {commit / tag the change is measured against}

Derived classifications — your confirmation needed:
  {TC-ID}  Derived — {class}   from {evidence cited}

In scope (change-side):        {IDs} — {code evidence + report evidence}
Out of scope (pre-existing):   {IDs} — red since {report/date}, untouched
Ambiguous — needs your call:   {IDs} — code says {X}, reports say {Y}
```

- **One question per pass, never per test case.** A 14-failure suite produces one question. Per-case prompting reliably trains a reviewer to approve without reading, which is worse than not asking.
- **Silence is not approval.** No code changes until this is answered.
- **Approval covers the listed batch only.** A repair discovered mid-pass that was not presented requires returning to this gate.
- The Repair Strategy selection question (§7.3) may be asked in the same exchange, but is a distinct decision and is never inferred from this one.

# 7. Repair Reasoning Engine

## 7.1 Root Cause Confidence gate — diagnosis is not repair

**Before enumerating any strategy**, classify Root Cause Confidence for that specific failure, and always state which state it is in — so a human always knows whether this skill is trying to *understand* the problem or *fix* it:

| Confidence | Meaning | Permitted action |
|---|---|---|
| **High** | The evidence directly and unambiguously explains the failure. No material open question about *why*. | Proceed to Repair Strategies (§7.2). |
| **Medium** | Part of the picture is confirmed, but a real open question remains. A repair now would be a guess with unclear odds. | **Diagnosis Strategy first.** Do not modify automation on a Medium-confidence guess. |
| **Low** | The evidence does not meaningfully explain the failure. | **Diagnosis only. Never propose or apply a repair.** |

**Diagnosis and Repair strategies are never ranked in the same list.** They answer different questions and use different criteria — a diagnosis step has no "regression risk" and no "fixes the test" outcome. Present them as two clearly separated categories:

- **Diagnosis Strategies** (evidence-gathering; no code or state change): capture DOM snapshot, console log, network log, page source, screenshot at failure point, re-run once with tracing enabled to observe timing.
- **Repair Strategies** (an actual code change): update a locator, add or correct synchronization, correct a setup/precondition step, replace a brittle selector, refactor a Page Object method, correct navigation.

**Diagnosis needs no approval gate** (`pipeline.md` §5.6.3) — it changes no code and no application state. When diagnosis raises confidence to High, this skill loops back to §7.2 automatically and the *resulting repair* passes the §6.2 gate normally.

## 7.2 Strategy enumeration — never a single option

For each eligible failure, list **2–4 named strategies**:

```
Option {A|B|C}
{Strategy name}

Pros
{brief}

Risk
{Low | Medium | High} — the regression risk this specific strategy introduces

Confidence
{percentage — derived per §9.2, never invented}

Basis
{cited evidence, and/or Repair KB Rule ID + confirmation count, and/or
 Selector Verification KB record}
```

- **A matching confirmed Repair KB rule is always included as an option**, citing its Rule ID and confirmation count. It does not automatically win, and it is never silently omitted.
- **A Selector Verification KB record is preferred over a freshly-guessed locator** — a locator already confirmed against this application is stronger evidence than a plausible-looking new one. Where its code-state anchor shows drift, it is re-verified live before being proposed (`pipeline.md` §10.8 rule 3).
- **"No repairable strategy exists" is a valid, reportable outcome.** A failure with no sound strategy, or where every candidate is low-confidence, is reported in full — never silently dropped, and never given a weak repair to avoid an empty result.

## 7.3 Strategy selection

After every failure's options are listed, ask once, for the whole batch:

```
Which repair strategy should be used?
  1. Highest confidence
  2. Lowest regression risk
  3. Fastest to apply
  4. Custom (specify per failure)
  5. Let the platform recommend
```

- Options 1–3 apply mechanically per failure — no further per-case back-and-forth.
- **Custom:** the human names the option, possibly differing per failure; follow-up questions only where their instruction is genuinely ambiguous for a specific failure.
- **Let the platform recommend:** this skill selects per failure and states, in one line, why (e.g. "Option A — highest confidence and lowest risk; no tradeoff to weigh").

# 8. The Application-Defect Prohibition

**This is the most important rule in this skill.** A test that fails because the application is genuinely broken must never be modified to stop failing.

## 8.1 What is never a valid repair

Regardless of confidence, approval, or how green it would make the suite:

- **Weakening an assertion** — loosening an expected value, comparing a substring instead of the value, asserting "not empty" instead of the actual expected content.
- **Removing an assertion** or the step that produces it.
- **Adding a conditional skip, try/catch swallow, or tolerance** so a genuinely failing behaviour passes or is not evaluated.
- **Widening an expected value** to include the observed-but-wrong value.
- **Increasing a timeout so an operation that never completes correctly appears to.** (Adding a *correct* wait for an operation that does complete is a legitimate synchronization repair — the distinction is whether the awaited state is the correct one.)
- **Marking a failing test skipped/pending** to remove it from the failure count. A test withdrawn from healing is *quarantined and recorded* (§14), never silently disabled.

**The line, stated once:** a repair may change **how the test interacts with the application** — locators, waits, setup, navigation, data preparation. It may never change **what the test asserts to be correct**. The first is automation mechanics; the second is the requirement, which belongs to Stage 3 and the approved Project Context.

## 8.2 On discovering a genuine application defect mid-pass

When reasoning establishes that an `Automation Failure` is in fact an `Application Failure`:

1. **Stop work on that test immediately** — even if a repair would make it pass, and even if the batch containing it was already approved. Batch approval covers repairing automation defects, never suppressing application defects.
2. **Reclassify it** to `Application Failure`, with the evidence that established the reclassification.
3. **Report it as a defect finding**, so it reaches the Stage `6A` Final QA Report as a real result rather than disappearing into a repair record.
4. **Record the reclassification in the Repair Summary**, including that a repair was considered and deliberately not applied. A reader must be able to see the decision was made, not merely that nothing happened.

## 8.3 On a genuine disagreement with the test case

Where a repair would require changing an assertion's *expected value* to match observed behaviour, the automation and the approved Manual Test Suite disagree about what is correct. That is neither an automation defect nor necessarily an application defect — it is a **documentation discrepancy**, and this skill:

- Does **not** edit the automation's assertion to match the application.
- Does **not** edit the Manual Test Suite (it has no write access to Stage 3 artifacts, §17).
- **Discloses the discrepancy** in the Repair Summary, naming both sides and the evidence, for a human to resolve at Stage 3.

# 9. Repair Confidence Engine

Every proposed repair, once its strategy is selected, is presented as a structured report — never a bare "fixed" or "probably fixed."

## 9.1 Report format

```
Repair Confidence Report

Test Case:            {Test Case ID}
Automation Script:    {Script ID / path}
Classification:       {Automation Failure | Inconclusive (pre-repair, diagnosis-admitted)}
Root Cause Confidence:{High | Medium | Low}   (§7.1)

Root Cause:
{one line, evidence-backed}

Proposed Repair:
{one line describing the code change}

Confidence:
{percentage}

Reasoning:
- {evidence-based factor, with its citation}
- {...}

Regression Risk:
{Low | Medium | High} — brief reason

Evidence:
{before-state reference} / {after-state reference, or "pending rerun"}
```

## 9.2 Deriving confidence — additive, cited, never invented

Confidence is built additively from **only** these observed-evidence factors, and every contributing factor must appear in Reasoning:

| Factor | Contribution | Requires |
|---|---|---|
| Root cause directly observed (log timestamp, stack trace, screenshot, DOM snapshot) rather than inferred | Base 40–60% | The specific evidence artifact is cited |
| The repair directly targets that observed root cause (not an adjacent or speculative one) | +10–15% | The causal link is stated, not assumed |
| The failure reproduced more than once with the same signature | +10% | Cite the occurrences |
| A confirmed Repair KB rule matches this exact pattern | +15%, scaling with the rule's confirmation count | Cite Rule ID + confirmation count |
| A Selector Verification KB record supplies the replacement locator, re-verified live | +10% | Cite the record and its verification timestamp |
| The fix is statically verified (compiles / lints clean) before rerun | +5% | Cite the check performed |
| Novel pattern, no prior confirmation anywhere | **Capped at 60%** regardless of other factors | — |

- **No report is issued above 95% before the repair is actually rerun and confirmed.** The pre-rerun number is a *proposed* confidence; the Evidence field distinguishes it from the confirmed outcome (§13).
- **A percentage with no cited factors is not a confidence value.** If the factors above cannot be evidenced, the honest output is a low number with its reason, or a Diagnosis Strategy instead (§7.1).

# 10. Shared Repair Knowledge Base

Per `pipeline.md` §10.8, the Repair KB is **shared across both pipelines** — Stage `4A` reads it to pre-empt known failure modes at generation time, Stage `4M` reads it to recognize a known quirk during manual execution, and **this skill is its sole writer**.

- **This run's record (always written):** the Repair Summary in `platform_core_data/modules/{{MODULE_SLUG}}/healing/` — the full per-pass narrative of what failed, what was considered, what was applied, and what happened.
- **Platform Knowledge (read always; written only via Promotion):** `platform_core/knowledge/patterns/repair_patterns/REPAIR-{NNN}.md`, `.../diagnosis_patterns/`, `.../reasoning/REASON-{NNN}.md`.

## 10.1 Read rule — consult before deriving

Before proposing any strategy: check Platform `repair_patterns/`, `diagnosis_patterns/`, and `reasoning/`, then this project's prior-run Repair Summaries under `platform_core_data/runs/*/self_healing/` (and, for runs predating this stage, `runs/*/execution/`). A match is included as a candidate option citing its ID (§7.2).

## 10.2 Write rule — confirmed repairs only

**A rule is written at exactly one point: after the targeted rerun, for a test in the Fixed column (§13).** Never for a proposed-but-unapplied repair, never for one that stayed in Remaining Failures, never for one that introduced a New Failure.

**"Do not learn from failed repairs" is absolute.** A repair that looked high-confidence and still did not work contributes nothing, however plausible its reasoning was. Recording it would poison the KB with a pattern that reads as confirmed.

## 10.3 Recording, and Promotion to Platform Knowledge

Each confirmed repair is recorded in this run's Repair Summary:

```
Implements Platform Pattern:  {REPAIR-{NNN} / REASON-{NNN}, or "none yet"}
Execution Context:            {Execution ID(s), suite, Test Case ID(s)}
What Happened:                {the failure pattern addressed and the fix that worked}
```

Then, when the pattern is genuinely reusable beyond this application (a synchronization strategy, a locator-recovery technique, a framework-level hazard — never an app-specific behaviour), propose Promotion per `pipeline.md` §10.5, asking exactly once:

> "This lesson looks application-independent. Promote it to Platform Knowledge?"

**Promotion is the only mechanism for cross-run repair memory** at the Platform layer, so the judgment is real: a genuinely reusable pattern left unpromoted will be rediscovered the hard way. If approved:

```
ID:                    REPAIR-{NNN}  (or REASON-{NNN} for a reasoning/process pattern)
Problem:               {failure pattern, generalized beyond this project/test case}
Strategy:              {the fix that worked, generalized}
Applicable Conditions: {what kind of test/flow/framework this generalizes to}
Confidence:            Confirmed by {N} execution(s), across {M} project(s)
Confirmed In:          {run folder(s) + Execution ID(s) backing this}
```

A later run confirming the same pattern **increments its count and appends its run reference** — it never creates a duplicate Platform document, and the per-execution narrative stays in that run's Repair Summary.

## 10.4 Explainability

Every recorded repair and Platform rule must be independently reviewable: a human reading one entry, with no other context, can tell what problem it solves, what fix worked, where it generalizes, and which real executions back it. A Platform-layer rule must be reviewable *without* opening the run it came from. A rule that cannot be explained this plainly is not ready to be written.

# 11. Repair Scope — what may be modified

If the human approves repairs:

1. **Modify only the automation suite's own files** — the specific Page Objects, locators, wait logic, setup helpers, or assertion *mechanics* responsible for the diagnosed issue — in the module's **resolved root**. For a `Draft` module that is the working copy (`platform_core_data/modules/{{MODULE_SLUG}}/automation/`) and never the baseline directly (`pipeline.md` §12.3). For a `Promoted` module it is the baseline, and two extra constraints bind: every file touched must classify as `owned` (or declared `shared`) under `.baseline_ownership.json` — **a `foreign` path is a hard stop, never another module's code repaired by accident** — and the targeted rerun uses the module-scoped suite. Verify with `cli.js check-ownership --module {{MODULE_SLUG}}` before proposing the repair.
2. **Never modify approved Manual Test Cases.** A corrected value inside the automation is not an amendment to the test case document; where they disagree, disclose it (§8.3).
3. **Never modify Discovery artifacts.** A repair may *reveal* something Discovery should re-verify — that is a recommendation in the Before/After report, never an in-place edit.
4. **Never modify the Project Context, PRD, Traceability Matrix, Coverage Report, or any Stage 1–3 artifact.**
5. **Never modify the application under test**, its configuration, or its data beyond what an approved test's own steps legitimately do.
6. **Never modify a Manual branch artifact** (`pipeline.md` §3.3).
7. **Stay inside the healing scope** (§4.1).

# 12. Targeted Rerun

- **Rerun only the repaired tests** — never the full suite, unless every test in it was repaired. A full-suite rerun after a two-test repair wastes environment time and obscures which change caused which outcome.
- **Rerun from the module's resolved root** (`cli.js resolve-root --module {{MODULE_SLUG}}`) — the repaired code, in place. For a `Draft` module that is `modules/{{MODULE_SLUG}}/automation/tests_{{FRAMEWORK}}/`, which is precisely what that project being standalone (`automation-skill` §11D.1) buys. For a `Promoted` module it is the baseline, run through the **module-scoped suite** (`testng-{{MODULE_SLUG}}.xml`) — the same isolation, achieved by suite scoping instead of by directory separation (`pipeline.md` §12.9).
- **Confirm the target environment against the Project Context before rerunning anything** — the same environment-match discipline every execution-capable stage applies.
- **Confirm Headed or Headless with the human immediately before the rerun starts** (`pipeline.md` §6 Rule 11), and record it — with the environment, target and operations — in the Stage `5H` Safety Preflight (`state preflight 5H …`, `pipeline.md` §14). The Run Manager refuses to start 5H without it (Phase 9.2). This binds every rerun, including a two-test verification rerun. Never infer the mode, never carry it over from the Stage `5A` execution that produced the failures, and never treat approval of the repair plan as approval of the mode. Record the answer in the rerun's results.
- **Never execute a mutating action against an environment the Project Context has not marked safe for it.**
- **Capture the same evidence classes Stage `5A` captures**, so a before/after comparison is genuinely comparable rather than comparing rich evidence against thin evidence.

## 12.1 Where the rerun's results go — into the triggering run

**The rerun's results are written to the run whose failures prompted this pass**, as an additional, clearly-marked cycle:

```
platform_core_data/runs/{{RUN_FOLDER}}/execution/
  ExecutionResults.md              # cycle 1 — the failures that prompted healing (NEVER edited)
  ExecutionResults.rerun-1.md      # cycle 2 — post-repair, scoped to the affected tests
  artifacts/ · artifacts_rerun-1/  # evidence, per cycle
```

Three rules govern this, and each one closes a specific way the record could be corrupted:

1. **The original results file is never touched.** `ExecutionResults.md` is cycle 1's record and stays exactly as Stage `5A` wrote it. Editing it to "update" a result would destroy the evidence that the failure ever happened — which is the evidence justifying this healing pass in the first place. Run immutability holds because this is an **append of a new file**, never a rewrite.
2. **A rerun is an execution, so it belongs with the execution it is a cycle of.** This is the one place a Stage `5H` write lands outside the module (`module_architecture.md` §8.2). Keeping both cycles in one run folder is what makes "12 failed, then 10 passed after repair and 2 were quarantined" readable as one story rather than two disconnected records in two locations.
3. **A multi-module healing pass writes one rerun file, not one per module.** The reruns were one execution; each result cites its module. The *reasoning* splits per module (§19); the *evidence* does not.

`N` increments per healing pass against the same run — a second pass appends `ExecutionResults.rerun-2.md` beside the first, and never overwrites it.

# 13. Before/After Comparison

After the targeted rerun, produce a comparison covering every repaired test:

| Column | Meaning |
|---|---|
| **Fixed** | Repaired and now passing. Labelled **`Automation Repaired`**, never `Passed` — so a reviewer and the Stage `6A` report can always see this result required a fix. |
| **Remaining Failures** | Repaired but still failing — the fix did not resolve it, or surfaced a different issue. |
| **New Failures** | Passed before the repair, fails after it — a regression introduced by the repair itself. |
| **Reclassified** | Established mid-pass as a non-automation failure (§8.2) — repair deliberately not applied. |
| **Quarantined** | Withdrawn from further healing per §14. |

Each row carries its Root Cause and Confidence from §9, **updated with the actual rerun outcome** rather than left at the proposed value.

**A New Failure is never presented as a net win.** "8 fixed, 1 newly broken" is reported as exactly that, with the regression's detail in full — never summarized as "8 tests fixed."

For every test in **Fixed**, write the confirmed repair per §10.2–§10.3. Nothing in Remaining, New, Reclassified, or Quarantined is written to the KB.

# 14. Quarantine — bounded healing attempts

**A test is not repaired indefinitely.** Each test carries a repair-attempt count across **that module's whole history** — every healing pass ever run against it, not just this one. When a test has had **three unsuccessful repair attempts** (the approved budget, enforced by `state heal`; a fourth proposal is refused with `REPAIR_ATTEMPT_LIMIT`), it is moved to the Quarantine Register instead of being repaired again. *(Reconciled in Phase 9.3: earlier wording here — "default 2 prior attempts", "not patched a third time" — contradicted the approved and enforced limit of three.)*

**The count is cumulative because the register is per module and edited in place** (`modules/{{MODULE_SLUG}}/healing/QuarantineRegister.md`). A test that failed repair once in `run-004` and twice in `run-011` has **three** attempts. Resetting the count per run — which a per-run register would do implicitly — would let a test be patched indefinitely without ever reaching the limit this section exists to enforce.

The Quarantine Register records, per test: Test Case ID, Automation Script ID, every attempt's strategy/confidence/outcome, the current classification, and a recommendation (redesign the test, re-verify with Discovery, investigate application stability, or accept as Known Automation Issue).

**Quarantine is not deletion and not a skip.** The test remains in the suite and remains reported; it is withdrawn from *automated repair*, with its history intact, and referred to a human. A test needing perpetual healing is evidence about the test's design or the application's stability that another patch will not address — continuing to patch it manufactures a green suite and hides that evidence.

## 14.1 Flakiness is diagnosed, not smoothed

A `Flaky` result is a genuine automation defect more often than not (a race, a missing wait, order dependence, shared state). It is diagnosed to root cause before any repair. **Reducing failure frequency is not a repair** — adding a retry or lengthening a timeout so a race loses less often leaves the defect in place and removes the signal that it exists. Where the root cause cannot be established, the honest outcome is a diagnosis record and, on repetition, quarantine.

# 15. Re-approval Before Re-merge

**Stage `4A`'s Automation Approval does not cover code this skill changed** (`pipeline.md` §5.2). Once repairs are applied:

1. The repaired suite is marked `Pending Automation Approval`.
2. It is reviewed against the §5.2 `5H` criteria: each repair matches its approved strategy; no `Application Failure` was healed into silence (§8); the Before/After comparison including any New Failure; quarantined tests recorded rather than deleted.
3. **Only after that approval** may it merge to the Workspace Automation Baseline (`pipeline.md` §12.4) or project into the Target Project (§13.3).
4. **For a `Promoted` module there is no merge** — the repair was applied in place, in the baseline (§11). The same approval then gates the *recording* step instead: the change is reviewed, run module-scoped, regression-checked to the extent its blast radius demands, and only then recorded with `automation_lifecycle/cli.js plan-baseline-update` → `record-baseline-update --approved-by "<name>"` (Phase 9.4; `pipeline.md` §5.2 final paragraph, §12.9). Until that approval, the in-place change is unapproved code and is reported as such. Before the first repair edit, this skill checks the touched paths are clean and writes the pre-change commit (the restore point) into the Repair Summary (`pipeline.md` §12.9 "Recoverable history"). An unsuccessful or rejected repair is therefore always recoverable, and is recorded, never erased.

Treating the original approval as still covering repaired code is the most likely path by which unreviewed code reaches a real environment.

# 16. Stop Conditions

| Condition | Scope | Required Action |
|---|---|---|
| **No Execution Results** | Global | Do **not** halt yet — first look for external execution reports (§4.2). Halt only if none exist, and then recommend running Stage `5A` first. |
| **No Execution Results *and* no readable external report** | Global | Halt — there is nothing to analyse. Say which report locations were checked, so the human can point at the right folder instead of guessing. |
| **External reports exist but every failure is baseline-side** (§4.3) | Global | Halt healing and report it plainly: nothing in the new work is failing. List the pre-existing failures as findings, repair none of them. |
| **Code evidence and report evidence disagree on new-vs-baseline** | Local — that failure only | Ask at the gate as *Ambiguous* (§4.3). Never resolve it unilaterally. Continue with other failures. |
| **No `Automation Failure` in the results** | Global | Halt, and report it as a *success*, not a gap: there is nothing to heal. Never manufacture work by widening into other classifications (§5). |
| **Every candidate failure is `Application Failure`** | Global | Halt healing and report the defects (§8.2). This is the correct outcome, not a failed pass. |
| **Automation Suite missing** | Global | Halt — there is no code to repair. Recommend confirming Stage `4A` output exists. |
| **Environment unavailable for the rerun** | Global | Apply no repair. A repair that cannot be verified by rerun is not confirmed, and must not be presented as such. Report and recommend retrying when the environment is available. |
| **Root Cause Confidence Low** | Local — that failure only | Diagnosis only (§7.1). Continue with other failures. |
| **Repair attempt limit reached** | Local — that test only | Quarantine (§14). Continue with other failures. |
| **A repair would require changing an assertion's expected value** | Local — that test only | Disclose as a documentation discrepancy (§8.3); apply nothing. Continue with other failures. |

**Local conditions never halt the whole pass** — every unaffected failure continues to be analysed, consistent with every other execution-capable stage in this pipeline.

# 17. Allowed Tools

- **Playwright MCP server** (headless by registration; any live run or rerun still confirms Headed/Headless with the human first, §12 and `pipeline.md` §6 Rule 11) — for diagnosis evidence (DOM snapshots, console/network capture, screenshots) and targeted reruns. A credential value is **never** typed into an MCP tool call; authenticate per the platform's credential contract, then act against that session.
- **`git` (read-only: `diff`, `log`, `show`, `status`)** — to establish which tests are new or changed against the baseline under §4.3. Never `checkout`, `reset`, `commit`, or any history-altering command.
- **File tools:** Read (Execution Results, external execution reports per §4.2, Automation Suite, Project Context, both KBs, prior Repair Summaries), Write (Repair Summary, Before/After Comparison, Quarantine Register, repaired automation files at the module's resolved root per §11, Repair KB entries per §10.2).

**Not permitted:** deleting, regenerating, or overwriting a human's report folder read under §4.2 · editing any Stage 1–3 artifact (Project Context, PRD, Discovery, Test Suite, Traceability Matrix, Coverage Report) · editing any Manual branch artifact · editing the Workspace Automation Baseline for a `Draft` module (its repairs go to the module project), or, for a `Promoted` module, any baseline path that is not `owned` (or declared `shared`) by that module under `.baseline_ownership.json` (§11) · writing to the Selector Verification KB (Stage `4A` is its sole writer, `pipeline.md` §10.8 rule 1) · merging to the baseline or projecting into the Target Project before fresh Automation Approval (§15) · running the full suite when only a subset was repaired (§12) · modifying the application under test.

# 18. Expected Artifacts

| Artifact | Path | Template |
|---|---|---|
| Repair Summary | `platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.md` | [`stage_5h_self_healing/RepairSummary.md`](../../../platform_core/templates/stage_5h_self_healing/RepairSummary.md) |
| Repair Confidence Report *(block, embedded per failure)* | within the Repair Summary | [`stage_5h_self_healing/RepairConfidenceReport.md`](../../../platform_core/templates/stage_5h_self_healing/RepairConfidenceReport.md) |
| Before/After Comparison | `platform_core_data/modules/{{MODULE_SLUG}}/healing/BeforeAfterComparison.md` | [`stage_5h_self_healing/BeforeAfterComparison.md`](../../../platform_core/templates/stage_5h_self_healing/BeforeAfterComparison.md) |
| Quarantine Register | `platform_core_data/modules/{{MODULE_SLUG}}/healing/QuarantineRegister.md` | [`stage_5h_self_healing/QuarantineRegister.md`](../../../platform_core/templates/stage_5h_self_healing/QuarantineRegister.md) |
| Repaired automation suite | `platform_core_data/modules/{{MODULE_SLUG}}/automation/tests_{Framework}/` | — (code, not a document) |

**Every artifact's document structure is defined by its template**; render by copying the template and filling `{{PLACEHOLDER}}` tokens. Section order is mandatory and inline `<!-- -->` guidance is stripped from rendered output.

# 18A. Repair Summary — HTML companion (`pipeline.md` §17)

The Repair Summary is **also published in the platform's shared HTML report design**, generated by `platform_core/tools/report_builder`. Three files, same folder:

```
platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.md            # the artifact
platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.report.json   # the report model
platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.html          # generated — never hand-edited
```

```bash
node platform_core/tools/report_builder/cli.js validate --model platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.report.json
node platform_core/tools/report_builder/cli.js build    --model platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.report.json
```

`validate` first — it exits `2` and names the exact path that is wrong; surface its message unchanged. Model reference: `platform_core/tools/report_builder/README.md`.

**The HTML never replaces the Markdown.** The Markdown is the artifact the Traceability Chain runs through and the one a reviewer approves; the HTML is a second rendering of the same content for stakeholders — never approved, never versioned, never read as input by any stage. **Rebuild it after every in-place correction** (`pipeline.md` §7), or the two disagree and the Markdown is the one that is right.

### 18A.1 Mapping this stage onto the model

**A repaired test is never rendered as a clean pass.** Declare repair outcomes as their own statuses — `Repaired` (tone `warning`), `Repair Failed` (tone `fail`), `Quarantined` (tone `blocked`), `Not Attempted` (tone `neutral`) — so Stage `6A` and any human reader can see that coverage needed a fix (`reporting-skill` §7 Rule 9). A status that is not declared is a validation error, so `Repaired` cannot quietly become `Passed`.

**The Application-Defect Prohibition (§8) governs the HTML exactly as it governs the Markdown.** No item may present an application defect as a repairable automation problem, and no repair may be described as having fixed application behaviour.

**Every repair's confidence is the derived figure (§9), never an invented one.** Put it in the item's rows with the evidence it was derived from, so a reader can check the derivation rather than trust the number.

**Enumerate the strategies that were considered, not only the one applied** — a single-option write-up hides the judgment the confidence figure is supposed to expose.

**Quarantined tests (§14) appear as coverage that is not currently verified**, never omitted and never counted as passing.

**The targeted rerun's before/after evidence (§12, §13) goes in `evidence` and `exchanges`** — the failing output and the passing output, so the repair is shown rather than asserted.

**Captured output goes through `text`, never `html`.** An application response, a UI message, a log line, and anything a human typed are escaped. `html` is only for markup this stage generated itself.

**Redact through the model's `"redacted": true`**, never by hand-typing a placeholder into a header value.

**Excerpt a very large capture and say so** in the exchange's `notes` — a full multi-hundred-KB body helps no reader, and silently truncating one misleads every reader.


# 19. Standard Output Contract

The Repair Summary must contain exactly these sections, so Stage `6A` never has to interpret prose:

| # | Section | Must contain, at minimum |
|---|---|---|
| 1 | **Healing Metadata** | Healing Pass ID, Run Folder, source Execution ID(s), scope (§4.1), environment, timestamps, invocation path and any run-scoped instruction. **Plus, under §4.2:** evidence source (`Stage 5A` or `External reports`), every report path read with its timestamp, how many runs were available, and the baseline reference used for §4.3 |
| 2 | **Eligibility Summary** | Per §5: how many failures of each classification were present, which were eligible, which were excluded and why, which were out of scope for this pass. **Under §4.2:** every classification marked `Derived` with its cited evidence, and the §4.3 split — In scope (change-side) / Out of scope (pre-existing baseline) / Ambiguous with the human's decision on each |
| 3 | **Per-Failure Analysis** | Per eligible failure: Root Cause Confidence (§7.1), Diagnosis and/or Repair strategies enumerated (§7.2), strategy selected and by which rule (§7.3), full Repair Confidence Report (§9.1) |
| 4 | **Applied Repairs** | Exactly which files changed, per test, and the nature of each change — reviewable without reading a diff |
| 5 | **Rerun Outcome** | The Before/After Comparison's figures, cross-referenced to the standalone artifact (§13) |
| 6 | **Reclassifications** | Every failure established as non-automation (§8.2), with evidence, and the explicit note that a repair was considered and not applied |
| 7 | **Disclosed Discrepancies** | Every automation-vs-test-case disagreement (§8.3), naming both sides |
| 8 | **Quarantine** | Tests withdrawn this pass and why, cross-referenced to the Register (§14) |
| 9 | **Knowledge Recorded** | Confirmed repairs written (§10.2–§10.3), and every Promotion proposed with its outcome |
| 10 | **Health Impact** | Automation Health before vs. after. **Application Health must be reported as unchanged by healing** — if it moved, a repair suppressed a real defect and that is a §8 violation to investigate, not a result to report |
| 11 | **Recommendations** | Smallest corrective action per Remaining/New/Quarantined item |
| 12 | **Approval Status** | That the repaired suite is `Pending Automation Approval` and may not merge until it clears (§15) |

# 20. Execution Rules

1. **Must never run automatically** — human invocation only (§6.1).
2. **Must accept only `Automation Failure` as repair scope** (§5), and never repair an `Application Failure` (§8).
3. **Must stop, reclassify, and report** on discovering a genuine application defect mid-pass — even inside an approved batch (§8.2).
4. **Must never weaken, remove, widen, or skip an assertion** to make a failing behaviour pass (§8.1).
5. **Must establish Root Cause Confidence before proposing a repair**, and propose diagnosis only at Medium or Low (§7.1).
6. **Must enumerate 2–4 strategies per failure, never one** (§7.2).
7. **Must consult the Repair KB and Selector Verification KB before deriving a new strategy** (§10.1).
8. **Must derive every confidence percentage additively from cited evidence** (§9.2) — never an invented number.
9. **Must ask once per batch, never per test case** (§6.2), and must not proceed on silence.
10. **Must treat approval as covering the presented batch only** (§6.2).
11. **Must modify automation code only, at the module's resolved root** (§11) — the module project for a `Draft` module; only that module's `owned` (or declared `shared`) baseline paths for a `Promoted` module, after Batch Repair Approval, and recorded only after fresh Automation Approval (§15, `pipeline.md` §5.2). Never a Stage 1–3 artifact, a Manual branch artifact, another module's baseline code, or the application.
12. **Must rerun only the affected tests** (§12).
13. **Must label a repaired pass `Automation Repaired`, never `Passed`** (§13).
14. **Must report New Failures explicitly**, never nett them off against fixes (§13).
15. **Must quarantine at the attempt limit rather than repair again** (§14), and must never silently skip or disable a test.
16. **Must diagnose flakiness to root cause** rather than reduce its frequency (§14.1).
17. **Must write only confirmed repairs to the KB** (§10.2).
18. **Must obtain fresh Automation Approval before any re-merge** (§15).
19. **Must stay within the invoked healing scope** (§4.1).
19a. **Must fall back to external execution reports before halting for missing Execution Results** (§4.2), read the **last three** runs rather than only the newest, and label every classification it derives as `Derived` with its evidence.
19b. **Must repair only change-side failures in an external pass** (§4.3) — a pre-existing baseline failure is reported and left untouched, and a code-vs-report disagreement is asked about, never decided alone.
19c. **Must never treat a `Derived` classification as licence to relax §8** — a derived Application Failure is refused exactly as a Stage `5A` one is, and a report on its own never reaches High Root Cause Confidence without live reproduction (§7.1).
20. **Must never read the PRD** (`pipeline.md` §6 Rule 4) or any Manual Execution artifact (§3.3).
21. **Must report "nothing to heal" as a success**, never widen scope to manufacture work (§16).
22. **Must continue on Local stop conditions** rather than halting the whole pass (§16).
23. **Must run the Simple English Communication Standard check on the Repair Summary, Repair Confidence Report, and Before/After Comparison before presenting the Batch Repair Approval gate** (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 10): short, direct sentences; any hard word replaced with an easier one where meaning stays the same; every necessary technical term briefly explained; a confirmed root cause kept visibly separate from a still-uncertain one; and a first-read check for whether an Automation Lead could approve or reject the batch without asking this skill to re-explain it. Test Case IDs, root-cause names tied to code, and KB rule IDs are never altered by this check.

# 21. Operational Contract

Role: evidence-grounded repair reasoning over automation failures, and the platform's sole owner of repair knowledge (Stage `5H`, optional).

Analyse `Automation Failure` results, propose strategies with derived confidence, apply only human-approved repairs to automation code, rerun only what changed, and record only what actually worked. Execution is fully specified above — §4 (Inputs), §5 (Eligibility), §6 (Opt-in invocation and the batch gate), §7 (Reasoning Engine), §8 (Application-Defect Prohibition), §9 (Confidence Engine), §10 (Shared Repair KB), §11 (Repair Scope), §12 (Targeted Rerun), §13 (Before/After), §14 (Quarantine), §15 (Re-approval), §16 (Stop Conditions), §17 (Tools), §18–§19 (Artifacts and Output Contract), §20 (Execution Rules). This section adds no rules of its own.

# 22. Architecture Principle

> Agents communicate through artifacts only. Each has a single responsibility. Every output becomes the input of another whenever applicable.

For this skill: its single responsibility is **reasoning about why automation failed and what fix is actually justified** — never running the suite for the first time (Stage `5A`), never generating it (Stage `4A`), never executing manual test cases (Stage `4M`), and never deciding what the application should do (Stage 1). Its outputs feed Stage `6A`'s report and the shared Repair KB, which both branches then read.

# 23. Example Execution

*Illustrative only — not executed as part of this task.*

```text
Invocation:  /self-healing-skill Login
Input:       runs/{{RUN_FOLDER}}/execution/ExecutionResults.md
             modules/{{MODULE_SLUG}}/automation/tests_Playwright/
```

Hypothetical pass: the Execution Results carry 6 failures — 4 `Automation Failure`, 1 `Application Failure`, 1 `Environment Failure`. Scope `Login` covers 3 of the 4 automation failures; the fourth (`Agency`) is listed Out of Scope, untouched.

`TC-LOGIN-004`: the submit button's locator no longer resolves. The Selector Verification KB holds a confirmed locator for that control from an earlier run; its code-state anchor shows drift, so it is re-verified live and confirms. Root cause directly observed → confidence 85%, risk Low. `TC-LOGIN-007`: a race between navigation and assertion, reproduced twice with the same signature, and Repair KB rule `REPAIR-003` matches → confidence 88%. `TC-LOGIN-009`: evidence shows only a generic timeout with no identifiable cause → Root Cause Confidence **Low**, so **diagnosis only** is proposed, no repair.

The human approves option 1 with "highest confidence." The two repairs are applied and only those two tests rerun: `TC-LOGIN-004` passes (labelled `Automation Repaired`), `TC-LOGIN-007` still fails and stays in Remaining Failures. Only `TC-LOGIN-004`'s repair is written to the KB; `REPAIR-003`'s confirmation count is *not* incremented, because the repair citing it did not work.

The `Application Failure` is reported as a defect and never healed (§8). Application Health is unchanged by the pass; Automation Health improves by one test. The repaired suite is marked `Pending Automation Approval` and cannot merge until it clears (§15).

# 24. Direct Invocation

This skill is **only** ever directly invoked — it has no pipeline-driven entry point (§6.1). Full rules: `pipeline.md` §5.3.1.

- **Forms:** `/self-healing-skill` (every eligible failure) · `/self-healing-skill Login, Agency` (module scope) · `/self-healing-skill TC-LOGIN-004..009` (test-ID scope) · `/self-healing-skill diagnose only` (evidence gathering, no repair proposal) · `/self-healing-skill {path to my suite}` — the external-evidence form (§4.2), used when the human wrote and ran the automation in their own IDE and there is no Stage `5A` artifact.
- **Instruction prompts are run-scoped, never spec-overriding** (§5.3.1 #3). An instruction may narrow scope, prefer a strategy axis, or restrict to diagnosis. It never authorizes repairing an `Application Failure` (§8), weakening an assertion (§8.1), skipping the batch gate (§6.2), repairing at Low confidence (§7.1), exceeding the attempt limit (§14), re-merging without approval (§15), or reading the PRD.
- **Upstream `Pending Review` → request approval, then recommend** (§5.3.1 #4).
- **Missing upstream → run degraded, declare the gap** (§5.3.1 #5):
  - *No Execution Results:* halt — nothing to analyse (§16).
  - *No Automation Suite:* halt — no code to repair.
  - *No Project Context:* diagnosis only, and no rerun, unless the environment and credentials are supplied in the invocation. Record the basis as `Open Question — Requires Stage 1`.
  - *No Repair KB / Selector Verification KB:* proceed from evidence alone; cap every novel-pattern confidence at 60% (§9.2) and state that no prior art was available.
- **Closing message must recommend the next step** (§5.3.1 #6):

```
Stage 5H complete — Repair Summary → repaired suite Pending Automation Approval
  platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.md
  {F} Repaired | {R} Remaining | {N} New failures | {Q} Quarantined | {D} Diagnosis only
  Application Health: unchanged   Automation Health: {before} → {after}

Next step — either:
  1. Approve the repaired suite:   "approved"  →  merge to baseline, then /reporting-skill
  2. Heal another module:          /self-healing-skill {module}
  3. Report as-is:                 /reporting-skill   (repairs remain unmerged)

  If a Final QA Report already exists for this run, /reporting-skill writes a new revision
  (Final_QA_Report.rev-N.md) from the latest verified results; the original stays as written
  (reporting-skill §7A).
```

# 25. Metrics

| Metric | Definition |
|---|---|
| **Healing Yield** | Fixed ÷ repairs attempted — how often an approved repair actually worked. |
| **Diagnosis Rate** | Failures routed to diagnosis ÷ eligible failures — how often evidence was insufficient to repair. A high rate is a signal about evidence capture in Stage `5A`, not a failure of this stage. |
| **Regression Rate** | New Failures ÷ repairs applied. **The metric to watch**: a rising value means repairs are causing damage. |
| **Confidence Calibration** | Mean proposed confidence of Fixed repairs vs. of Remaining ones. A well-calibrated engine separates them clearly; if it does not, §9.2's factors need review. |
| **KB Reuse Rate** | Repairs where a KB rule supplied the winning strategy ÷ total repairs — how much the platform is learning rather than rediscovering. |
| **Quarantine Rate** | Tests quarantined ÷ tests healed across the run's history. |
| **Reclassification Count** | Failures found to be non-automation (§8.2) — each one is a defect Stage `5A` mislabelled, worth feeding back into classification quality. |

# 26. Future Scalability

The reasoning model here is defined over *a classified failure with evidence*, not over "a browser," so it extends without structural change:

| Direction | How it fits |
|---|---|
| **API / Mobile / Desktop suites** | Strategy categories change (an API repair adjusts a payload or auth header; a mobile repair adjusts a gesture or an accessibility ID) but §7's confidence gate, §9's derivation, §8's prohibition, and §14's quarantine are unchanged. |
| **Performance suites** | A threshold breach is an `Application Failure` (genuinely slow) or an `Infrastructure Failure` (load generator) — §5 already routes both away from healing, which is the correct default. |
| **Larger suites / distributed runs** | Batch gating (§6.2) already scales: one question per pass regardless of failure count. Quarantine (§14) is what keeps a large suite from accumulating perpetually-healed tests. |
| **Cross-run trend reasoning** | Already supported by reading prior runs' Repair Summaries (§10.1) and the per-test attempt count (§14); richer trend analysis extends §25's metrics without changing any gate. |

**What would need to change, explicitly:** a new failure class in Stage `5A`'s classification would need an eligibility row in §5. Nothing else — §7–§15 are defined in terms of evidence and confidence, not technology.

# 27. Observability — what this stage emits

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
| This stage starts | `STAGE_STARTED --stage 5H` → keep the returned `spanId` |
| This skill starts | `SKILL_STARTED --stage 5H --skill self-healing-skill` |
| This skill finishes | `SKILL_COMPLETED --span-id <id>` |
| This stage finishes | `STAGE_COMPLETED --stage 5H --span-id <id>` |
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
| A repair cycle begins | `REPAIR_STARTED` → keep the `spanId` |
| That cycle ends | `REPAIR_COMPLETED --span-id <id> --status <Passed\|Failed> --count <tests repaired>` |
| A test is modified to fix it | `ARTIFACT_UPDATED --artifact-class automation` |
| A rerun produces results | `TEST_EXECUTION_RESULT … --attempt <n> --cycle <n>` with the real cycle number |

**Root-cause classes are reported only where this stage already classified them.** `--error-type`
carries the classification the Repair Summary assigns (Automation / Application / Environment /
Infrastructure / Configuration Failure). Observability never infers a root cause from failure text —
that is this stage's judgement, made with evidence, and telemetry only carries the conclusion.

## Never emitted by this stage

- **Token counts or cost.** No event type exists for them. No supported run-attributable provider
  usage source exists, and nothing is estimated from text length or hardcoded pricing (HD-OBS-002).
- **A metric, ratio, or score.** This stage records what happened; the aggregator does the arithmetic.
- **A secret.** No password, token, API key, session ID, cookie, authorization header, or card detail
  reaches `--metadata`. Credential *identities* and roles are acceptable where genuinely needed.
- **A rework score.** Rework is reported as explicit counters — repair cycles, artifacts revised, validation failures. There is deliberately no single composite number (§29).
- **A confidence percentage as telemetry.** Repair confidence belongs in the Repair Confidence Report, where its evidence sits beside it.

---

# 28. Resolving `{{MODULE_SLUG}}` and `{{RUN_FOLDER}}`

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

This stage **writes into the module** (`modules/{{MODULE_SLUG}}/healing/`, plus the repair code in place in `modules/{{MODULE_SLUG}}/automation/`) and appends **one rerun file** to the triggering run's `execution/` folder. That append is its only write outside the module.

**Staleness is reported, never silently resolved.** When an upstream module artifact has been revised
since this stage last consumed it, say so — in this stage's own output and in the closing message. Re-
running an upstream stage is a human decision at that stage's gate (`module_architecture.md` §10.4).

## The run: `{{RUN_FOLDER}}`

Every path containing `{{RUN_FOLDER}}` resolves to the **active run**, recorded at
`platform_core_data/runs/current_active_run.json` (`workflows_and_pipelines/pipeline/run_manager.md` §5.7).

```bash
node platform_core/tools/run_manager/cli.js active   # -> the run folder to write into
node platform_core/tools/run_manager/cli.js list     # every run, newest first, active marked *
```

- **Never hand-pick, guess, or infer a run folder.** Resolve it from the pointer.
- **No active run → ask, never assume.** Never fall back to "the newest run" and never create one.
- **A pointer naming a missing folder → report it and stop.**
- **The pointer is sticky**, so a multi-stage session keeps writing into one run.
- **Switching runs is the human's call** (`cli.js use <run>`). This stage never rewrites the pointer.

This stage never creates a run. It heals the suite at the module's resolved root, writes its repair records to `modules/{module}/healing/`, and writes rerun results into the active run as new `ExecutionResults.rerun-N.md` files — never over the original results.

## Inherited artifacts and code drift

A run may be a **refinement** of an earlier one (`run_manager.md` §5.9), carrying `metadata/lineage.json`.

```bash
node platform_core/tools/run_manager/cli.js drift          # what moved in the app since this run was anchored
node platform_core/tools/run_manager/cli.js drift --json    # exit 2 when not "unchanged"
```

**Drift matters more to this skill than to most**, because a repair's correctness depends on the application's current state:

- **A Selector Verification KB record whose anchor predates a `moved` drift is unverified** — re-verify it live before proposing it as a replacement locator, never trust it as-is (`pipeline.md` §10.8 rule 3).
- **A prior run's confirmed repair may no longer apply** where drift touches the same paths. Cite it as a candidate, state that it is unverified against current code, and let the live evidence decide.
- **`unknown-*` is not `unchanged`.** No anchor, no git, or an unresolvable ref all mean drift could not be computed — treat inherited repair knowledge as unverified rather than confirmed.
- **A repair-attempt count is inherited across lineage** (§14), so a test repeatedly healed across refinements reaches quarantine rather than resetting its budget each run.

# Repair Governance — the mechanical record (Phase 6, added 2026-10-09)

The rules above are enforced by the Run Manager (`repairGovernance.js`). Each step of a pass is recorded with `cli.js state heal …` in this run's `run.json` (`stages['5H'].repairOperations`), and a step that breaks a rule is **refused** — so a repair cannot reach "fixed" by skipping one. The record survives an interrupted session: after `state recover 5H` and a fresh `state start 5H --invocation Direct --by "<name>"`, the open operation and every attempt count are exactly where they were.

| Step | Command | Refused when |
|---|---|---|
| Invoke | `state start 5H --invocation Direct --by "<name>"` | no named human; `--invocation Pipeline` (§6.1). The Workflow Planner never proposes 5H. |
| Open | `state heal open --tests TC-…,TC-… --environment <env> --reason "…" --by "<name>"` | no named tests ("all failures" is never implied); a test with no failed result in the recorded outcome |
| Classify | `state heal classify --test TC-… --class automation\|application\|environment\|infrastructure\|test-data\|unknown --evidence "…" --by "<name>"` | no evidence; a recorded **Application / Environment / Infrastructure Failure** re-labelled `automation` — never done here (§5, §8.2); a human corrects a wrong class in the execution record |
| Propose | `state heal propose --test TC-… --strategy "…" --reason "…" --patch <runs/…/attempt-N.diff> --root-cause-confidence High --factors "<factor>:<value>:<citation>;…" [--novel] --by "<name>"` | Root Cause Confidence missing, Medium or Low, or High without a cited `observed-root-cause` factor (`DIAGNOSIS_ONLY`, §7.1 — Phase 9.3); not a **confirmed automation** defect (unknown, test-data and the rest are not eligible); a **4th attempt** in the operation (`REPAIR_ATTEMPT_LIMIT` → quarantine, §14); a patch touching a **protected** path — approved test cases / expected results / structured assertions (`test_design/`), requirements (`context/`, `discovery/`, `knowledge_base/`), Supplier business rules, approved 4A artifacts, Module Manager records, production configuration, run evidence, or anything outside this run's module automation and the Workspace Automation Baseline (application source) — `PROTECTED_BOUNDARY`; a patch that **weakens verification** — removes an assertion, adds a skip or a swallowed error, swaps an exact matcher for a weaker one, changes an asserted value, or removes an approved expected value — `ASSERTION_WEAKENING` (§8.1); a confidence factor without a citation, or citing a file that is not in the run folder |
| Approve | `state heal batch-approve --by "<name>"`, and for **Medium or Low** confidence also `state heal approve --test TC-… --attempt N --by "<name>"` | — |
| Apply | `state heal apply --test TC-… --attempt N [--restore-point <commit>] --by "<name>"` | not covered by a batch approval (High confidence included — it never skips the gate); Medium/Low without its own approval |
| Validate | `state heal validate --test TC-… --attempt N --rerun <ExecutionResults.rerun-N.md> [--regression TC-…@<rerun>,…] [--mutating] --by "<name>"` | whether the rerun **mutates** is decided by the Execution Safety policy through the Stage 5H Safety Preflight's operations (`--mutating` can only make it stricter; with no confirmed 5H preflight it counts as mutating) — Phase 9.3; the rerun is not a registered 5H rerun (a Repair Summary is never proof); the original failure evidence changed; a change to a **shared** component (`shared/`, `common/`, `base/`, `utils/`, `helpers/`, `components/`, `fixtures/`, `support/`) without regression results beyond the repaired test; on Production (or an unrecognized environment), no read-only access approval, or a mutating rerun |
| Production | `state heal prod-access --scope "…" --read-only --by "<name>"` | not read-only — production writes are never approved |
| Knowledge | `state heal promote --test TC-… --attempt N --title "…" --body "…" --by "<name>"` | the attempt is not **validated as fixed** — unverified suggestions never become knowledge. The entry is sanitized (credentials, tokens, cookies, e-mail, phone, card numbers) and carries its provenance (run, operation, attempt, patch fingerprint, validating rerun). Written to the project layer `knowledge/patterns/repair/REPAIR-NNN.md`; Platform promotion (§10.3) stays a separate human decision |
| Fresh budget | `state heal grant-budget --test TC-… --basis changed-failure\|new-run --reason "…" --by "<name>"` | no named human or reason; the failure is the same one (changed-failure); a counted attempt was in this run (new-run) |
| Close / report | `state heal close --by "<name>"` · `state heal report [--json]` | an attempt still open |

**Only a governed repair is a repair (Phase 9.3).** The execution history labels a test `Automation Repaired` only when a repair attempt for it was validated as fixed with that exact rerun. A test that merely passes in a registered 5H rerun — code changed outside `state heal`, or not changed at all — reads `Flaky` with a `repair-not-governed` conflict, and the outcome is never a clean pass.

**Validation outcomes:** `fixed` (the repaired test passes, verified by its assertion records, in the rerun, and every regression test passes), `remaining` (still failing — another attempt is allowed, up to three), `regression-failed` (the repair broke another test — rejected). The execution history independently labels a fixed test `Automation Repaired`, never `Passed`; an Application Failure stays one, and Application and Automation Health stay separate.

**Repair confidence bands** (the derived percentage of §9.2): **High 90–100 · Medium 70–89 · Low below 70**. No observed root cause means no base contribution; a novel pattern is capped at 60; nothing exceeds 95 before a rerun. Root Cause Confidence (§7.1) is a separate, earlier judgment.

**Attempt limits and quarantine (Phase 6.1).** At most **three repair attempts per test**, counted across **every repair operation of this run and of every earlier run of the same module or Supplier scope** — opening another operation, recovering an interrupted stage or starting a new run never resets the count. The **third unsuccessful attempt quarantines the test** (recorded on the run, `stages['5H'].repairQuarantine`, with every attempt), and no further repair is proposed for it (`QUARANTINED`). Quarantine is never removed. A fresh budget is **only** a named human's recorded grant — `state heal grant-budget --test TC-… --basis changed-failure|new-run --reason "…" --by "<name>"` — and its basis is checked: `changed-failure` only when the failure now (recorded status + reason) differs from the one the counted attempts addressed; `new-run` only when every counted attempt was in an earlier run. The grant opens a new window after the record; it erases nothing.

**Applied-patch verification (Phase 6.1).** `propose` refuses a patch that does not apply cleanly to the files on disk, keeps each file's original under `runs/{{RUN_FOLDER}}/self_healing/originals/`, and fingerprints every file of the automation scope it touches. `apply` checks the files on disk against the exact expected result: refused when the patch is not applied (`PATCH_NOT_APPLIED`), only partly applied (`PATCH_PARTIAL`), different from it (`PATCH_MISMATCH`), or when any other file in that scope changed (`UNEXPECTED_CHANGES`). It records each file's before/after fingerprint. `validate` refuses an attempt whose application was not verified, or whose files changed since (`PATCH_CHANGED_AFTER_APPLY`). The platform never applies a patch itself.

**Evidence, environment, ownership (Phase 6.1).** A classification cites at least one evidence **file** inside this run (a trace, log, DOM snapshot); free text alone, or a missing file, is refused (`EVIDENCE_REQUIRED`); the recorded class is kept beside the new one, with the evidence files' fingerprints; only supported reclassifications are recorded (an Application Failure stays one; Environment/Infrastructure never become automation or application defects here). The declared environment is checked against the Run Configuration (`knowledge_base/execution_safety_policy.json`), any environment the run records, and an environment class named in the Project Context (a URL is not evidence); `unverified` or `inconsistent` is **restricted** exactly like Production — read-only reruns with a named approval, never a write. Shared components come from the Workspace Automation Baseline's `.baseline_ownership.json` where it covers the path (a `foreign` path — another module's code — is refused), folder names otherwise; a shared change is validated only with regression results for **every** test that passed before the repair.

# Controlled mutations (Phase 9.4)

- **Promoted module repairs** are recorded with `automation_lifecycle/cli.js plan-baseline-update` → `record-baseline-update --approved-by "<name>"`: only this module's owned paths, from its recorded restore point, exactly the committed content (a shared file needs an approved shared-asset change).
- **Platform Knowledge promotion** (§10.3) is `knowledge_promotion/cli.js propose --run <run> --entry REPAIR-NNN --by "<name>"` → `review --proposal KP-n --decision approve|reject --by "<name>" --reason "…"` → `apply --proposal KP-n --run <run>`. Only an entry written by `state heal promote` from a repair validated as fixed, byte-for-byte unchanged, with no secret-shaped content, is proposed; a new Platform Knowledge file is written, never an existing one overwritten; `verify` reports any edited or unapproved file.
- **Reruns in a browser** use the 5H Safety Preflight already recorded for `state start 5H`; pass `preflight: { runsDir, run, stage: '5H', id: 'SP-n' }` and the same mode to the driver or `runSuite`.

# Run State Integration (pipeline.md §5.3.2 — added 2026-10-08)

This stage (`5H`) records its lifecycle in the run state model. These commands are mechanical. They never replace a reviewer's decision and never skip a gate. The full rule, and every stage's row, is `pipeline.md` §5.3.2.

0. **Safety Preflight — before entry:** record it with `node platform_core/tools/run_manager/cli.js state preflight 5H --environment <env> --target-url <url> --execution-type <browser|api|database|batch|other> [--execution-mode Headed|Headless] --operations <ops.json> --confirmed-by "<name>"` **before** `state start 5H` — the Run Manager writes `metadata/SafetyPreflight.md` itself and its entry gate refuses to start 5H without a confirmed, current preflight (Phase 9.2/9.3; never hand-write that file). Ask Headed or Headless for it then; if the human chooses a different mode for a later rerun, record a new `state preflight 5H` before that rerun (the latest confirmed preflight is the one that binds).
1. **Entry — before any work:** `node platform_core/tools/run_manager/cli.js state start 5H --invocation <Pipeline|Direct|Direct (degraded)> [--instruction "..."]`. This runs the entry gate. **Exit code 2 means blocked:** do not start. Show the human the reasons, request what is missing (`pipeline.md` §5.3.1 #4), and name the next command. Never start with `--invocation Pipeline` — the gate refuses it (`pipeline.md` §3.6); this stage starts only on a human's explicit invocation. Without Stage `5A` results, `--invocation "Direct (degraded)" --external-reports` (§4.2). The Batch Repair Approval (§6) is a separate, in-stage decision and is not recorded by these commands.
2. **Artifacts:** `node platform_core/tools/run_manager/cli.js state artifact 5H --artifacts <path[,path]> [--kind checkpoint|output|evidence]` for what this stage writes.
3. **Exit — this stage has a checkpoint:** `node platform_core/tools/run_manager/cli.js state request-approval 5H --artifacts <checkpoint artifact>`. Its checkpoint artifact is `platform_core_data/modules/{{MODULE_SLUG}}/healing/RepairSummary.md` (its `**Status:**` line) — for the re-merge Automation Approval (§15). Finishing the work never marks the stage Completed.
4. **Approval:** only after the named reviewer approves and the artifact's own Status header reads `Approved`: `node platform_core/tools/run_manager/cli.js state approve 5H --approved-by "<reviewer>"`. It is refused if the header says anything else, or if the artifact is missing. A rejection: `state reject 5H --rejected-by "<reviewer>" --feedback "..."`.
5. **Blocked or failed:** `state block 5H --reason "..."` or `state fail 5H --reason "..."`, so the run records what it is waiting on.

**Recording the rerun (`pipeline.md` §17.5).** Register each rerun file with `node platform_core/tools/run_manager/cli.js state artifact 5H --artifacts <runs/…/execution/ExecutionResults.rerun-N.md>` — that registration is what marks it as a repair rerun — then `state outcome 5H --from-results`. A test reads `Automation Repaired` only where a rerun result shows `Passed` after an `Automation Failure`; the Repair Summary is never proof of a pass. An `Application Failure` that later passes is reported as a conflict for review, never as repaired.
