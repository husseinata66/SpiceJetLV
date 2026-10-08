---
name: explorer-skill
description: Stage 2 (shared by both pipelines) in the Agentic AI Testing Platform. Evidence-Driven QA Explorer — validates the approved Project Context against the live application (or the best available fallback Discovery Mode), producing evidence-backed Findings, Timeline, Coverage Summary, and a QA Assessment Report. Output is deliberately BEHAVIOURAL: it never harvests selectors or locator catalogues for automation reuse, which keeps Discovery fast and its artifacts clean. Use when running discovery/exploratory testing against a target application for an approved Project Context.
inputs:
  - name: project_context
    type: file_path
    required: true
    description: Approved Project Context at `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md`.
  - name: discovery_source
    type: environment_var
    required: true
    description: "The best available source of the running application's actual behavior. Live browser automation (target URL + credentials) is preferred; falls back in priority order to existing screenshots, recordings, user-guided exploration, documentation, APIs, or other static artifacts (§8.1) when unavailable."
outputs:
  - name: discovery_snapshots
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/discovery/*.md"
    description: One structural/accessibility snapshot per distinct in-scope screen or UI state.
  - name: timeline
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/discovery/Timeline.md"
    description: Chronological, timestamped log of actions/events for the run.
  - name: coverage_summary
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/discovery/Coverage_Summary.md"
    description: Visited/Skipped/Blocked/Unreachable areas and computed coverage percentage.
  - name: qa_assessment_report
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md"
    description: Synthesized discovery report structured per the Standard Output Contract (§19).
  - name: qa_assessment_report_html
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.html"
    description: HTML companion of the QA Assessment Report, in the platform's shared report design (§12A, pipeline.md §17) — generated from QA_Assessment_Report.report.json by report_builder. A rendering for stakeholders, never the approved artifact.
  - name: findings_summary
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/Findings_Summary.md"
    description: Index of every finalized Finding raised during the run.
  - name: evidence_packages
    type: file_path
    location: "platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/FINDING-{ID}_{ShortName}/"
    description: Per-Finding `metadata.md` plus captured evidence files.
dependencies:
  - project-context-skill (upstream skill)
  - Browser automation tool (e.g. Playwright MCP) when live Discovery Mode is available; file/Read tools only otherwise
---

> **Pipeline position:** Stage 2 — **shared by both pipelines**. Consumes the Project Context, produces Discovery Artifacts consumed unchanged by Stage 3 and, through it, by both the Manual (`4M`) and Automation (`4A`) branches.
> **Traceability:** `Project Context → Discovery → Findings`.
> **Scope boundary:** behavioural output only — **no selector or DOM catalogue for automation reuse** (§5.15, `workflows_and_pipelines/pipeline/pipeline.md` §3.5).
> **Revision history:** see `docs/CHANGELOG.md`.
>
> **Revision note (2026-07-27, user-mandated):** each artifact is **one file, edited in place**: no `.vN` suffixes, and **no duplicate "final" copy is ever written on approval**. Refinement edits the same file the reviewer read. Git is the version history. See `workflows_and_pipelines/pipeline/pipeline.md` §7.
>
> **Revision note (2026-07-29, user-mandated):** this stage's output moves to the **module workspace** — `platform_core_data/modules/{module}/discovery/` — and is **durable**: a later run exploring the same module refines these files in place rather than producing a second discovery record in a new run folder. Its input resolves the same way, from `modules/{module}/context/ProjectContext.md` at its current revision. A multi-module invocation explores and writes **once per module**, never one merged discovery document. Nothing about Discovery Modes, evidence rules, the selector-free boundary (§5.15), or the Stage 2 gate changes. See [`module_architecture.md`](../../../workflows_and_pipelines/pipeline/module_architecture.md) and `pipeline.md` §4 (Stage 2), §7.

# 1. Skill Name

**Explorer skill** (Evidence-Driven QA Explorer) — v4

# 2. Purpose

The Explorer skill performs hands-on exploratory testing of the running target application, strictly within the boundaries set by the Project Context, and produces an evidence-based record of what the application actually does. Its output — the Discovery Artifacts — feeds the Test Design skill as validation and enrichment material, not as a competing source of requirements.

**Discovery is this skill's responsibility; browser automation is only its preferred mechanism for it, not a precondition for its existence.** When live browser automation is unavailable, this skill does not stop — it falls back to the best available alternative Discovery Mode (§8.1–§8.3) and proceeds, disclosing which mode it used and what that implies for achievable Confidence.

**As of v2, the Explorer skill's responsibility is no longer only discovering the application.** It investigates, validates, collects evidence, assesses risk in both business and technical terms, and produces reusable knowledge for every downstream skill — not just a list of screens and a list of defects. Discovery (screens, workflows, structure) remains part of its job, but it is now the floor, not the ceiling, of what this skill produces.

**The Project Context is this skill's source of truth for what the application is supposed to do.** The Explorer skill's job is to hold the running application up against that expectation, note where reality matches, where it diverges, and where it reveals more than the Project Context documented — never to define or redefine what the requirements should be. It does not write test cases or automation code; its job is disciplined, well-documented, in-scope discovery and investigation.

**This skill must never assume that unexpected behavior is a bug**, and it must never finalize a Finding from a single, unvalidated symptom. Every observation that surprises, concerns, or falls outside what the Project Context describes — whether noticed narratively or captured automatically via Event-Driven Capture (§5.2) — is treated as a *candidate* that must pass through the full Investigation Workflow (§5.1): validated, subjected to bounded recovery attempts (§5.7), investigated for related boundary conditions, and checked for duplicates, before it becomes a classified, evidence-backed **Finding** that may require human validation. The Explorer skill proposes well-investigated candidates for human attention; it does not adjudicate them.

# 3. Responsibilities

1. **Validate the application against the Project Context** — for each in-scope module, confirm whether the live application behaves as the Project Context describes (screens exist, workflows function, business rules and constraints hold as documented).
2. **Discover additional UI information** — capture structural (accessibility-tree) detail of each distinct in-scope screen or UI state, including elements, components, and behaviors the Project Context did not call out at that level of detail.
3. **Identify gaps between the application and the documented requirements** — explicitly record any place where observed behavior contradicts, extends, or is simply absent from the Project Context, without deciding which one is "correct." A gap is reported, not resolved, by this skill.
4. **Automatically capture evidence the instant a defined failure signal occurs** (§5.2, Event-Driven Capture) — this skill does not wait to narratively notice an HTTP 500, a console exception, a broken image, or any other listed trigger; capture happens immediately, and the candidate enters the Investigation Workflow (§5.1) from that capture.
5. **Run every candidate Finding through the full Investigation Workflow** (§5.1) — explore/capture, validate, attempt bounded recovery (§5.7), collect evidence, investigate surrounding boundary conditions (§5.8), classify, check for duplicates (§5.9), form a disclosed root-cause hypothesis (§5.13) where one is warranted, and only then generate artifacts. Never publish a Finding straight from a first, unvalidated symptom, and never publish a Finding without first attempting the recovery steps applicable to its failure category.
6. **Collect the full Evidence Package for every Finding** (§5.10–§5.12), tailored to its category via Smart Evidence Collection (§5.11), using the full evidence inventory (§5.10) wherever technically possible.
7. **Assess both Business Risk and Technical Risk for every Finding** — two distinct framings of impact (§5.14): what this means for the business/user, and what this means for the system/architecture — never conflated into a single "severity" number alone.
8. **Form a Root Cause Hypothesis where the evidence supports one** (§5.13) — explicitly labeled as a hypothesis, with its own confidence, supporting evidence, and stated unknowns. Never presented, worded, or classified as an established fact.
9. **Detect and merge duplicate Findings** — before creating a new Finding, search the current Findings Summary for an equivalent one already raised in this run, and append an occurrence instead of creating a new entry (§5.9).
10. **Maintain a running Timeline for the entire run** (§6) — a chronological log of significant actions and events, timestamped, sufficient for a human to reconstruct what happened and when without replaying the session.
11. **Maintain running Coverage tracking for the entire run** (§7) — visited screens/components, skipped/blocked/unreachable areas, and a computed coverage percentage against the Project Context's in-scope surface.
12. **Never stop exploring because a Finding was created.** Finding a bug, security concern, or any other classified issue is never, by itself, a reason to end exploration early — exploration continues through the full in-scope surface regardless of what has already been found, unless the Project Context's Environment Constraints or scope boundaries dictate otherwise.
13. **Produce Discovery Artifacts** — synthesize all of the above into raw screen snapshots, a structured QA Assessment Report, a Findings Summary, a Timeline, a Coverage Summary, and a per-Finding Evidence Package.
14. **Select and disclose the Discovery Mode used** (§8.1–§8.3) — attempt Discovery Modes in priority order, fall back automatically when a higher-priority mode is unavailable rather than halting the run, and state explicitly, per discovery snapshot/Finding/Coverage entry, which mode produced it.
15. **Adapt exploration strategy to the run's Run Scope Type** (§16) — an Entire Project sweep, a single User Story's targeted verification, and a Bug's reproduction-first approach are not the same activity at the same depth; this skill selects the matching strategy rather than applying one default approach regardless of scope.
16. **Classify every Finding's supporting evidence by Evidence Category** (§17), independent of which Discovery Mode produced it, and let evidence quality — not tool choice — govern achievable Confidence (§18).
17. **Produce output conforming to the Standard Output Contract** (§19) — every required section, in the required structure, so the Test Design skill never has to parse free-form prose to extract what it needs.
18. **Recognize named Stop Conditions** (§20) and respond with the specified action for each — including, where a per-area block occurs mid-run, recommending a fallback Discovery Mode for that specific area (§21) before giving up on it.
19. **Verify handoff completeness before concluding a run** (§22) — confirm every input the Test Design skill's own specification declares it needs is actually present and unambiguous in this run's Discovery Artifacts, not merely assume it is.

Supporting detail for responsibilities 1–3, for in-scope modules only:
- Log into the target application using the credentials specified in the Project Context.
- Visit only the modules listed as "In Scope" in the Project Context — modules explicitly marked "Out of Scope" must not be explored in this run.
- Identify and document: sitemap/route structure, business modules and their purpose, reusable UI components shared across modules, end-to-end user workflows, business rules and validation behavior observable without triggering data mutations, data-quality issues in sample data, and security-relevant behavior (auth redirects, step-up authentication, error-message enumeration, session handling).
- Pay specific attention to every "Carried-Forward Assumption & Risk" listed in the Project Context, and record direct observations that confirm, refute, or leave each one unresolved.
- Clearly separate confirmed observations from inferred behavior — flag anything not directly witnessed as an assumption, open question, or (where applicable) a labeled Root Cause Hypothesis (§5.13), never as fact.
- Never perform destructive, irreversible, or persistent data-mutating actions unless the Project Context's Environment Constraints explicitly authorize it. This includes investigation probes (§5.8) and recovery attempts (§5.7): a probe or recovery step that would require an authorized-only action is skipped and the omission is noted in Investigation Notes, never performed anyway.

**The Explorer skill must NOT redefine business requirements.** If the running application appears to contradict the Project Context, this skill records this as a gap/discrepancy — and, per §5, as a Finding — for stakeholders and the Project Context skill to resolve in a future revision. It never treats its own observation of the live app as a silent correction to what the requirement "really" is, and it never treats a deviation as a confirmed defect on its own authority.

# 4. Core Philosophy

The Evidence-Driven QA Explorer operates on eight non-negotiable principles:

1. **Unexpected is not the same as wrong.** Behavior that differs from what this skill anticipated, or that the Project Context does not mention, is *interesting*, not automatically *defective*. This skill's job is to observe and document precisely, not to render a verdict.
2. **A symptom is a lead, not a conclusion.** This skill never finalizes a Finding from the first thing it notices. It validates the observation, attempts bounded recovery where the failure class calls for it, and investigates related boundary conditions before deciding the observation is worth reporting as-is.
3. **Every claim is a Finding, and every Finding needs evidence.** This skill does not make assertions in prose that aren't backed by a captured, inspectable artifact (screenshot, log, recording, DOM/accessibility snapshot, etc.). If evidence cannot be captured, the Finding is recorded as incomplete and flagged accordingly rather than asserted as fact.
4. **Ambiguity resolves to human judgment, not to automated judgment.** If the Project Context does not clearly define expected behavior for what was observed, this skill must not guess which interpretation is correct. It records the observation with status `Needs Human Review` (§5.6) and moves on.
5. **The Project Context remains the single source of truth.** This skill never invents, infers, or backfills an "expected behavior" that the Project Context does not actually state. Where the Project Context is silent, "the Project Context does not define this" is itself the correct, and only, expected-behavior statement.
6. **Evidence first, conclusion second — always in that order.** No conclusion (a classification, a severity, a root-cause hypothesis, a recommendation) is formed before the evidence that supports it exists and is captured. Where evidence collection genuinely cannot precede a fleeting state (e.g., a dialog that must be dismissed to continue), this skill captures the earliest possible evidence and explicitly notes the sequencing gap rather than skipping evidence collection entirely.
7. **A Finding is never a stopping point.** Discovering a bug, security concern, or any other issue is not, by itself, a reason to end exploration. This skill keeps exploring the full in-scope surface regardless of what has already been found, unless the Project Context's own scope or environment constraints say otherwise.
8. **An unavailable discovery mechanism is never a stopping point either.** The absence of browser automation (or any other single Discovery Mode) is not a reason to halt the run — this skill falls back through the priority list in §8.1 and proceeds. What changes is disclosure and ceiling, not whether exploration happens: every artifact states which mode produced it (§8.3), and modes that cannot perform live reproduction cap what Status a Finding may reach, but they never block the run itself.

# 5. Finding Framework

A **Finding** is the atomic unit of everything this skill reports beyond raw structural snapshots. A Finding is an observation that may require human validation — it is never presented as a settled conclusion, and it is never finalized until it has passed through the full Investigation Workflow below.

## 5.1 Investigation Workflow

Every potential Finding must pass through this lifecycle, in order, before it is published. No step may be skipped:

1. **Explore or Capture** — encounter a candidate observation during normal in-scope exploration, **or** have one automatically raised by Event-Driven Capture (§5.2). Automatically-captured candidates enter this workflow at this same first step; they are not treated differently from narratively-noticed ones from this point on.
2. **Validate** — attempt to reproduce the observation before treating it as anything more than a one-off. An observation that cannot be reproduced and has no other supporting evidence is not escalated to a Finding; note it as an Open Question in the QA Assessment Report instead.
3. **Attempt Recovery per the Investigation & Recovery Engine** (§5.7) — if the failure to validate, or the observation itself, falls into one of the Engine's failure categories, apply the matching recovery behavior (retry, refresh, re-open page, repeat action, or retry in a clean browser state) before drawing any conclusion. **A Finding may only be marked `Confirmed` after applicable recovery attempts have been made and have failed to resolve the condition.**
4. **Collect Evidence** — capture the Smart Evidence Collection set (§5.11) appropriate to the candidate's likely Category, from the full evidence inventory (§5.10), wherever technically possible.
5. **Investigate the surrounding behavior** (§5.8) — for Validation, Navigation, and Authorization-related candidates in particular, probe the relevant boundary conditions before concluding. Do not stop at the first symptom.
6. **Classify the Finding** — assign exactly one Category (§5.3), a Severity with a Severity Reason (§5.4), a Confidence Score (§5.5), and a Status (§5.6).
7. **Form a Root Cause Hypothesis, if warranted** (§5.13) — only when the evidence supports a plausible explanation; explicitly labeled as a hypothesis, never as fact.
8. **Detect duplicates** (§5.9) — search the current Findings Summary for an equivalent Finding already raised in this run. If one exists, append an occurrence to it instead of creating a new Finding.
9. **Generate artifacts** — write the Finding's Evidence Package (§5.12) and `metadata.md` (§5.14), or append the new occurrence's data to an existing package.

A Finding is only "finalized" once step 9 completes. Nothing produced by steps 1–2 is reported as a Finding on its own. **Completing this workflow, including a Finding, is never a reason to stop exploring the rest of the in-scope surface (§4, Principle 7).**

## 5.2 Event-Driven Capture

This skill must automatically collect evidence the moment any of the following occurs during in-scope exploration, without waiting to notice it narratively:

- HTTP 500 (server error)
- HTTP 403 (forbidden)
- HTTP 404 (not found)
- Timeout (navigation, request, or action)
- Console error
- JavaScript exception
- Broken image (failed image resource load)
- Accessibility violation (a structural/semantic issue detectable via the accessibility tree)
- Unexpected dialog (a browser-native dialog — alert/confirm/prompt/beforeunload — that was not the deliberate target of the current action)
- Application crash (the page/tab becomes unresponsive or the process terminates)
- Unhandled promise rejection
- Unexpected navigation (the page navigates to a URL other than the one the current action targeted)

When any of the above is detected:

1. Capture the fullest evidence set technically possible at that instant (screenshot, console state, network state, current URL, DOM snapshot) — even before determining whether the trigger is significant. Evidence captured at trigger-time may exceed what Smart Evidence Collection (§5.11) later requires for the Finding's eventual Category; excess evidence is kept, not discarded.
2. Feed the captured trigger into the Investigation Workflow (§5.1) at step 1, exactly as if this skill had narratively noticed it.
3. Continue exploration — an Event-Driven Capture trigger firing is not, by itself, a reason to halt or divert from the current in-scope task, beyond the time needed to capture evidence and log the trigger in the Timeline (§6).

A trigger that fires repeatedly for the same underlying condition is subject to Duplicate Detection (§5.9) exactly as any other candidate.

## 5.3 Classification (Category)

Every Finding must be classified as **exactly one** of the following Categories. This skill must pick the single best-fitting Category — never zero, never more than one:

| Category | Use when... |
|---|---|
| **Bug** | Observed behavior contradicts a clearly documented Project Context requirement, with no plausible alternative explanation, and evidence directly demonstrates the failure. |
| **Security Concern** | Observed behavior with potential security implications (authentication, authorization, data exposure, input handling, session management), whether or not it can be confirmed as a defect in this session. |
| **Performance** | Observed latency, slowness, unresponsiveness, or resource behavior that may affect usability, whether or not the Project Context specifies a performance requirement. |
| **Accessibility** | Observed structural, semantic, or interaction behavior that may create a barrier for assistive technology or accessibility standards. |
| **UI Issue** | A visual/rendering defect (layout breakage, broken image, clipped/overlapping content, styling inconsistency) independent of whether it affects usability enough to also warrant a UX Issue. |
| **UX Issue** | Behavior is technically functional but confusing, inconsistent, or inconvenient for the user, independent of whether it matches the Project Context. |
| **Requirement Gap** | The Project Context does not address a screen, workflow, or behavior this skill encountered — a gap in documentation coverage, not necessarily in the application. (Supersedes v1's "Missing Requirement" — same meaning, renamed for consistency with this Category set.) |
| **Test Gap** | This skill identifies in-scope surface that exploration could not adequately cover (e.g., a workflow blocked by an environment constraint, a state requiring data the demo lacks) — a gap in this run's own coverage, to be handed to the Test Design skill or a future run, not a claim about the application itself. |
| **Observation** | Something noteworthy was seen that isn't clearly a defect, question, or any other category — a neutral factual note for the record. |
| **Recommendation** | This skill has a suggestion for improvement that is not itself a defect claim (e.g., "consider adding a visible password-strength meter") — distinct from the `Recommendation` *field* every Finding metadata carries (§5.14): a Finding of Category `Recommendation` is a suggestion-shaped observation with no underlying defect; the `Recommendation` field on any Finding (of any Category) is the suggested next step for a human reviewer of that specific Finding. |

`Question` and `Unknown Behavior` (present in v1's Finding Type enum) are retired in v2: a candidate that would previously have been `Question` or `Unknown Behavior` is classified as `Observation` with Status `Needs Human Review` (§5.6) and its open question recorded in Investigation Notes — the ambiguity is preserved via Status and Confidence, not via a separate Category.

## 5.4 Severity Matrix

Severity is assigned by matching the observed condition against fixed rules — never by intuition. Severity is a separate axis from Category, Confidence, and Status: it estimates *impact if the Finding does turn out to be a real defect*.

| Severity | Criteria |
|---|---|
| **Critical** | Application unavailable · Login impossible · Data loss · Security breach |
| **High** | Core workflow blocked · Required functionality unavailable |
| **Medium** | Validation issues · Business rule inconsistencies |
| **Low** | UI/cosmetic issues · Minor usability friction |
| **N/A** | Applies automatically to Categories `Observation`, `Requirement Gap`, `Test Gap`, and `Recommendation` — these don't assert a defect, so they carry no impact-if-defect rating |

Rules:
- Match the observed condition against the Critical/High/Medium/Low criteria in order from most to least severe; the first row it satisfies is the severity.
- `Observation`, `Requirement Gap`, `Test Gap`, and `Recommendation` Categories are always `N/A`, regardless of how the underlying condition might otherwise read — they are not defect claims.
- If a Finding does not clearly match any Critical/High/Medium/Low criterion and its Category is not one of the automatic-`N/A` Categories, default to `Low`.
- **Every Finding must include a Severity Reason** — one to two sentences stating which criterion was matched and why, or, for a `Low` default applied due to ambiguity, stating explicitly that no clearer criterion was matched and describing the ambiguity. A Severity value with no accompanying reason is incomplete and must not be published.

## 5.5 Confidence Engine

Every Finding must include a **confidence score from 0% to 100%**, representing how certain this skill is that the Finding accurately reflects reality (i.e., that what it says was observed really was observed, and the classification fits) — **not** how certain this skill is that the underlying behavior is intentional, acceptable, or a defect. Confidence about "what happened" and judgment about "whether it's a problem" are kept separate: the latter is exactly what `Needs Human Review` status (§5.6) exists for.

Bands:

| Confidence | Label | Guidance |
|---|---|---|
| **90–100%** | *(maps toward)* Confirmed | Directly observed, repeatable, unambiguous evidence, with applicable recovery attempts (§5.7) exhausted and the condition still present (e.g., a screenshot showing an uncaught error dialog after a documented action, reproduced after a refresh). |
| **75–89%** | Likely | Observed clearly, reproduced at least once, but with some residual ambiguity in cause, scope, or whether every applicable recovery attempt was exhausted. |
| **50–74%** | Needs Investigation | Observed, but reproduction is partial, inconsistent, or recovery attempts were only partially applicable/exhausted. |
| **Below 50%** | Needs Investigation (weak) | Inferred, suspected, or observed under conditions that leave real doubt (e.g., a single slow page load that might be an environment fluke). |

**Governing rule: low-confidence Findings must never be marked `Confirmed`.** A Finding below 90% confidence must carry a Status of `Needs Human Review` (or, where genuinely resolved as a non-issue, `Rejected`) — never `Confirmed`. `Confirmed` requires both high confidence (≥90%, per the band above) *and* satisfying `Confirmed`'s own criteria in §5.6 — the two gates are independent and both must pass.

**Confidence is governed by Evidence Category (§17–§18), not by Discovery Mode directly.** Discovery Mode (§8.1) determines what evidence is *achievable*; Evidence Category (§17) is what actually caps Confidence and Status, because two different Discovery Modes can produce the same category of evidence (e.g., Browser automation and an authorized API call can both yield a Direct Observation), while the same mode can sometimes yield weaker evidence than expected (e.g., a browser session that could only capture a Human Observation because this skill had to ask a bystander what happened on a screen that reloaded too fast to capture). Evidence Categories other than Direct Observation and (reproducible) System Response cannot satisfy `Confirmed`'s recovery-attempt criteria — see §18 for the full rule. This is a consequence of the existing gate, not a separate or looser one.

## 5.6 Status

Every Finding must include exactly one status:

| Status | Meaning |
|---|---|
| **Confirmed** | Directly observed with clear evidence, unambiguous against a clearly documented Project Context requirement, applicable recovery attempts (§5.7) exhausted without resolving the condition, and Confidence ≥90% (§5.5) — reserved for cases with no reasonable doubt about what happened. |
| **Needs Human Review** | Default status whenever the Project Context does not clearly define the expected behavior, whenever there is any reasonable doubt about interpretation, or whenever Confidence is below 90% regardless of how clear-cut the requirement contradiction appears. |
| **Duplicate** | Materially the same underlying condition as a Finding already recorded, discovered to be equivalent only after the fact (e.g., during report synthesis). This is a fallback for retroactive discovery — the primary duplicate-avoidance mechanism is the proactive search in §5.9, which prevents most duplicates from being created at all. |
| **Rejected** | Investigated further within the same session and determined to be a false read (e.g., a one-off environment glitch reproduced-and-explained away, or resolved entirely by a recovery attempt in §5.7) — not a status this skill applies to shut down inconvenient results, only to genuinely resolved non-issues. |

**Governing rule:** If the Project Context does not clearly define the expected behavior for what was observed, **or** if Confidence is below 90%, this skill MUST assign `Needs Human Review`. It must never default to `Confirmed` (as a `Bug` or otherwise) by assuming what the requirement "probably" meant, and never as a shortcut around the confidence gate. When in doubt, the doubt itself is reported — not silently resolved.

## 5.7 Investigation & Recovery Engine

Some failures are worth attempting to recover from before they're trusted as real; others are deterministic and recovery adds nothing. This skill applies this configurable strategy during the Validate/Recovery steps of the Investigation Workflow (§5.1, steps 2–3). **A Finding may only be marked `Confirmed` after the recovery attempt(s) applicable to its failure category have been made and the condition still persists.**

| Failure Category | Recovery Behavior |
|---|---|
| **Navigation failure** | Retry up to 3 times. If it still fails on the 3rd attempt, treat it as validated and proceed. |
| **Timeout** | Retry once. If the timeout recurs, collect performance evidence (timing data, HAR) and proceed, treating it as a Performance candidate. |
| **Validation failure** (e.g., a form correctly rejects bad input) | No retry — validation behavior is deterministic; retrying adds no new information. |
| **Network failure** | Retry up to a configurable limit (default: 2 attempts) and collect a HAR of the failing request(s) regardless of whether the retry succeeds. |
| **Unexpected UI rendering** | Refresh the page once before reporting. If the rendering issue persists after the refresh, proceed to Finding creation. |
| **Suspected transient/environment state** (e.g., a flaky first load, a stale session artifact) | Re-open the page (fresh navigation, not just a refresh) once. If the condition persists, proceed. |
| **Suspected session/state contamination** (e.g., behavior that might be an artifact of prior actions in this same session) | Retry once in a clean browser state (new context/session, no prior cookies/local storage from this run) where technically feasible and authorized by the Project Context's Environment Constraints. If not feasible/authorized, skip and record why. |

Notes:
- These retry/recovery counts are defaults, configurable per project (e.g., a known-flaky staging environment may justify raising the navigation retry count) — but recovery attempts are always bounded. Never retry indefinitely, and never silently exceed the configured limit.
- Every recovery attempt — whether the Engine applied, which recovery behavior(s) were tried, how many attempts were made, and the final outcome (resolved on recovery / persisted after max attempts / not applicable, no category matched) — is recorded in the Finding's `Investigation/Recovery Result` metadata field (§5.14).
- A failure category not listed above defaults to "No retry" — validate once, record the result, and move on to Investigation Mode (§5.8) rather than inventing a recovery behavior that isn't specified here.
- Recovery attempts are themselves subject to the same authorization constraints as any other action (§3): a recovery step requiring an unauthorized action is skipped, and the omission is recorded, never performed anyway.

## 5.8 Investigation Mode

This skill must never stop at the first symptom. For candidates that touch Validation, Navigation, or Authorization behavior in particular, it investigates related boundary conditions before finalizing the Finding — a single passing or failing case rarely tells the whole story.

| Category | Boundary conditions to probe |
|---|---|
| **Validation** | Empty value · Spaces-only value · Unicode · Emoji · Long input · SQL injection payload (input-handling/error-message probe only — never to exploit a database) · Special characters |
| **Navigation** | Browser refresh · Back · Forward · Direct URL entry |
| **Authorization** | Different user role · Session expiration · Deep links |

Rules:
- When a candidate Finding relates to one of these categories, probe at least the listed boundary conditions for that category, to the extent technically feasible and permitted by the Project Context's Environment Constraints, before finalizing.
- A payload-style probe (e.g., a SQL injection string) is used strictly to observe input handling and error behavior — never as an attempt to actually breach, mutate, or exfiltrate data. If exercising a boundary condition would require an action the Environment Constraints don't authorize (e.g., a destructive follow-through), skip it and record why in Investigation Notes rather than performing it anyway.
- Record what was probed and what each probe revealed in the Finding's `Investigation Notes` metadata field (§5.14) — including boundary conditions that were skipped and why.
- Only after this investigation step completes does the Finding proceed to classification (§5.1 step 6).

## 5.9 Duplicate Detection

Before creating a new Finding, search the current Findings Summary (the running index maintained throughout this exploration run — see §9) for an equivalent Finding: same module, same underlying condition/root cause, same workflow — even if the specific reproduction path, or the specific Event-Driven Capture trigger, differs slightly.

- **If an equivalent Finding already exists:** do not create a new Finding or a new evidence package. Append a new occurrence to the existing Finding instead — increment its `Occurrence Count` (§5.14) and add a short note to its `Investigation Notes` describing this occurrence (when/where it recurred, anything new worth recording). Only add a new evidence file to the existing package if it contributes material new information; don't duplicate identical evidence, and never overwrite an existing evidence file (§11).
- **If no equivalent Finding exists:** proceed to create a new Finding with `Occurrence Count = 1`.
- This proactive, search-before-create check is the primary duplicate-avoidance mechanism. The `Duplicate` status (§5.6) exists only as a fallback for the rarer case where equivalence is discovered retroactively (e.g., while writing the QA Assessment Report) after two Findings were already created independently.

The Explorer skill must never generate duplicate Findings for the same underlying condition.

## 5.10 Evidence Collection (Full Inventory)

The complete set of evidence types available to this skill. Which subset is required for a given Finding's Category is governed by Smart Evidence Collection (§5.11); anything beyond the required subset should still be captured when technically possible:

- Full-page screenshot
- Focused screenshot (the specific element/region relevant to the Finding)
- **Annotated screenshot** — a copy of a screenshot carrying a high-contrast rectangle around each element the run could not understand, each rectangle labelled (`Q1`, `Q2`, or the Open Question / Finding ID) and mapped to a written question. **Mandatory for unclear-item Findings** (§5.11.1). The original is always preserved alongside it; the annotated copy never replaces it.
- Screenshot before the triggering action
- Screenshot after the triggering action
- Screenshot at the failure state (where applicable)
- Complete video recording of the workflow that produced the Finding
- Browser console logs
- Network requests
- Network responses
- HTTP headers
- Cookies (if accessible without violating access constraints)
- DOM snapshot (serialized DOM/HTML at the relevant moment)
- Accessibility snapshot (the accessibility-tree capture at the relevant moment — distinct from the per-screen discovery snapshot; this is the Finding-scoped capture)
- Request/Response summary (a concise, human-readable summary of the specific request(s)/response(s) implicated in the Finding — method, URL, status, key headers, and a truncated body excerpt where relevant — distinct from the raw network log)
- Current URL
- Browser (name/version, as reported by the automation tool)
- Environment (from the Project Context's Environment Constraints)
- Timestamp
- Logged-in user (the role/account active at the time of observation)

If a specific evidence item cannot be captured (tool limitation, environment restriction, transient state that has already passed, **or the limits of the selected Discovery Mode itself — e.g., no console log is obtainable from a static screenshot, §8.1–§8.3**), this skill records which item is missing and why in the Finding's metadata rather than omitting it silently or fabricating a substitute.

## 5.11 Smart Evidence Collection (Per-Category Requirements)

Rather than always collecting the full inventory, this skill tailors the minimum required evidence to the Finding's Category. This is the required floor — collecting more from §5.10 is always encouraged wherever technically possible:

| Category | Minimum Required Evidence |
|---|---|
| **Bug** | Screenshots (before/after/failure) · Console logs · DOM snapshot |
| **Security Concern** | Screenshots · Console logs · Network (requests + responses) · Headers · Cookies (if accessible) · Request/Response summary |
| **Performance** | Screenshots · Network/HAR · Timing data |
| **Accessibility** | Accessibility snapshot · Screenshots |
| **UI Issue** | Screenshots (full-page + focused) |
| **UX Issue** | Screenshots |
| **Requirement Gap** | Screenshots · Accessibility snapshot |
| **Test Gap** | Screenshots (of the blocking condition, where one exists) — evidence floor is lower for this Category since it documents a coverage limitation, not application behavior |
| **Observation** | Full-page and focused screenshots |
| **Recommendation** | Full-page and focused screenshots |

Any candidate touching Navigation (per §5.8) additionally requires video recording where technically feasible, regardless of Category.

## 5.11.1 The unclear-item floor — annotated evidence *(added 2026-08-17, user-mandated)*

**This floor overrides the Category row above whenever it applies, and it always raises it, never lowers it.**

**The problem it fixes.** An unclear item lands in `Observation` by default (Execution Rule 9), and `Observation` has one of the *lowest* evidence floors in the table. So the least-understood Findings were carrying the weakest evidence: a full-page screenshot of a 45-field form, and a sentence saying something on it was unclear. The reviewer then has to guess which element — and a guess is precisely what raising the Finding was meant to avoid.

**When it applies.** Whenever this stage:

- raises an **Open Question**;
- records an **ambiguous UI observation**;
- **cannot determine the purpose** of a field or control;
- finds **unclear wording, validation, status, icon, table column, or section behaviour**;
- needs a **product-owner decision based on a visual element**;
- records a **mismatch it cannot yet classify** as defect / outdated requirement / intended behaviour / misunderstanding.

**What is required.** Both files, always:

| | |
|---|---|
| **Original** | the unmodified screenshot |
| **Annotated** | a copy with a **high-contrast rectangle** around **only** the unclear element or area |

Rules for the rectangle:

- **A rectangle, not an arrow, circle, or freehand mark** — wherever a rectangle can identify the area precisely, it is the required form.
- **Surround only the relevant element or area.** Never highlight the whole page when one control is unclear.
- **Never obscure** the element's text, value, icon, or surrounding context — the annotation is an outline over a transparent fill, never a filled or dimmed box.
- **Keep enough surrounding UI visible** that a reviewer can tell where on the screen the element sits.
- **Label every rectangle** — `Q1`, `Q2`, or the related Finding / Open Question ID.
- **Several unclear items on one screen get several separately numbered rectangles**, never one box around all of them.
- **Every rectangle maps to a written question** in the Finding or the QA Assessment Report. A rectangle with no question, or a question with no rectangle, is an incomplete Finding.

**A screenshot without a precise visual highlight is not sufficient evidence for an unclear-item Finding.**

This supplements written evidence and live observation; it never replaces either.

### 5.11.2 The mechanism

`platform_core/tools/browser_driver/api.js` → **`annotatedScreenshot(name, rects, opts)`**, which captures the original, injects a transient overlay, captures the annotated copy, and removes the overlay in a `finally`.

**Order is part of the contract:** the original is written to disk *before* any node is injected, so a failure during annotation still leaves pristine evidence. Cleanup is guaranteed and idempotent, and swallows its own errors so it can never mask the real capture failure. See `platform_core/tools/mcp/README.md` §1.4 for why a view-only overlay is permitted under the read-mostly rule.

A rectangle whose selector matched nothing comes back in the call's `missing` list. **That is a missing question, not a cosmetic gap** — resolve it (better selector, or record it under §5.11.3) before publishing the Finding.

### 5.11.3 When annotation is technically unavailable

Discovery Modes with **no live page** — supplied screenshots, recordings, documents, other static artifacts (§8.1 #2, #3, #5, #7) — cannot produce a precise rectangle, and there is no honest way to draw one on someone else's image without guessing at coordinates.

In that case, and **only** in that case:

- **Do not fabricate an annotation.** Do not draw an estimated or approximate rectangle.
- **Preserve the original evidence** unchanged.
- Record, verbatim: **`Annotated evidence not capturable — Discovery Mode: <mode>`**
- **Describe the unclear item's location as precisely as the available evidence allows** — section heading, row and column, field label, neighbouring text.
- **The written Open Question and its impact remain mandatory.** The exception removes the rectangle, never the question.

**This exception must never be used to skip annotation during live-browser Discovery.** Where a live page exists and the element can be located reliably, the rectangle is required.

## 5.12 Evidence Package

Every Finding must generate its own dedicated evidence package, stored under a per-Finding directory:

```
platform_core_data/modules/{{MODULE_SLUG}}/discovery/
  findings/
    FINDING-001_Login/
      metadata.md
      before.png
      after.png
      failure.png
      failure.annotated.png        # unclear-item Findings only (§5.11.1) — NEVER replaces the original
      recording.webm
      console.log
      network.har
      request_response_summary.md
      dom_snapshot.html
      accessibility_snapshot.yml
```

- The directory name is `FINDING-{3-digit sequence, zero-padded}_{ShortDescriptiveName}`, sequence assigned in the order Findings are created within the run.
- Only the evidence files actually captured for that Finding are included, per the Smart Evidence Collection requirement for its Category (§5.11) plus whatever else was feasible; `metadata.md` is always present and lists (via its `Evidence Links` field, §5.14) what was and wasn't captured.
- File names above are the standard names when that evidence type applies; a Finding that only warrants one screenshot (e.g., a static Observation) omits the files that don't apply rather than producing empty placeholders.
- A recurring Finding (§5.9) does not get a new directory for each occurrence — new evidence, if material, is added into the existing Finding's directory, and the occurrence is tracked in its metadata.
- **Existing evidence files are never overwritten** (§11) — if a later occurrence or recovery attempt produces evidence with the same conceptual role (e.g., another "failure" screenshot), it is saved under a distinguishing name (e.g., `failure_2.png`) rather than replacing the original, and both are listed in `Evidence Links`.
- **An annotated copy is named `{original}.annotated.png`** and sits beside the file it was taken from, so the pair is derivable in both directions and neither can be mistaken for the other. **Both are always kept** — the annotated copy supplements the original, never substitutes for it, because a reviewer disputing the annotation needs the unmarked image to check it against. The never-overwrite rule applies to both halves.

## 5.13 Root Cause Hypothesis

Where the collected evidence supports a plausible explanation for *why* a Finding's condition occurs, this skill may record a Root Cause Hypothesis. This is an investigation aid for whoever picks up the Finding next — **it must never be presented as fact**, never used to justify a higher Confidence Score or a `Confirmed` status on its own, and never substituted for the Finding's own Actual Behavior/evidence.

Every Root Cause Hypothesis, when present, must include:

- **Possible Root Cause** — the hypothesized explanation, stated tentatively ("may be caused by...", "consistent with...", never "is caused by...")
- **Confidence** — 0–100%, on the hypothesis itself (kept separate from, and typically lower than, the Finding's own Confidence Score, which is about the observation, not its explanation)
- **Supporting Evidence** — which specific captured evidence items support this hypothesis, and how
- **Unknowns** — what would need to be known (e.g., server-side logs, source code, infrastructure configuration) to move this from hypothesis toward confirmation — stated explicitly so a developer knows what to check

A Finding with no plausible hypothesis simply omits this section rather than forcing a guess.

## 5.14 Finding Metadata (`metadata.md` Schema)

Every `metadata.md` must contain the following fields, in this order:

- **Finding ID** — matches the evidence package directory, e.g. `FINDING-001`
- **Title** — a short, specific, human-scannable summary (e.g., "Emoji in Username field triggers generic server error")
- **Category** — exactly one value from §5.3
- **Severity** — assigned via the Severity Matrix (§5.4): Critical / High / Medium / Low / N/A
- **Severity Reason** — per §5.4, the criterion matched (or the stated ambiguity if defaulted to Low)
- **Confidence Score** — 0–100%, per §5.5
- **Evidence Category** — exactly one value from §17 (Direct Observation / System Response / Documentation / Human Observation / Static Artifact / Assumption), or the strongest of several where more than one corroborates this Finding (§17) — states what *kind* of evidence this Finding rests on, independent of which Discovery Mode (§8.1) produced it
- **Status** — one value from §5.6
- **Business Risk** — impact framed in business/user terms (e.g., "a real user cannot recover a lost password, generating support burden and potential lockout") — stated even when Severity is N/A, if there is a business-relevant angle worth naming; otherwise "None identified"
- **Technical Risk** — impact framed in system/architecture/security terms (e.g., "server-side exception path is exposed to unauthenticated input, and its generic error message could mask more severe underlying failures") — same "None identified" fallback rule as Business Risk
- **Module** — the in-scope module this Finding belongs to
- **Workflow** — the workflow/user journey the Finding was encountered within
- **Description** — a plain-language statement of what was observed
- **Expected Behavior** — exactly what the Project Context states (quoted or closely paraphrased with a citation to the relevant Project Context section), or explicitly "Not defined in Project Context" if it is silent — never a behavior this skill inferred on its own
- **Actual Behavior** — exactly what was observed, described factually
- **Steps to Reproduce** — the precise action sequence, from a known starting state, that produces the observed behavior
- **Investigation/Recovery Result** — whether the Investigation & Recovery Engine (§5.7) applied, which recovery behavior(s) were attempted, how many attempts were made, and the outcome (resolved on recovery / persisted after max attempts / not applicable)
- **Investigation Notes** — what boundary conditions or surrounding behaviors were probed per Investigation Mode (§5.8), what each probe revealed, and any probe or recovery step skipped due to Environment Constraints
- **Root Cause Hypothesis** — per §5.13, if one is warranted; omitted otherwise
- **Occurrence Count** — how many times this exact underlying condition was encountered during the run (§5.9), starting at 1
- **Unclear Items** — **required whenever §5.11.1 applies**, omitted entirely otherwise. One row per rectangle, and every rectangle in the annotated screenshot must appear here exactly once:

  | Rect | What was observed | What exactly is unclear | The question | Why the answer matters | Original | Annotated |
  |---|---|---|---|---|---|---|
  | `Q1` | factual, no interpretation | the specific ambiguity | the question needing an answer | which of scope / expected behaviour / severity / test design it changes | path | path |

  *"Why the answer matters"* is not narrative padding — it is what tells the reviewer whether this blocks Stage 3 or can wait. A row that cannot state an impact is usually an observation, not an Open Question. Under §5.11.3 the `Annotated` cell carries `Annotated evidence not capturable — Discovery Mode: <mode>` and the location is described in words instead; **every other column stays mandatory**.
- **Evidence Links** — every evidence file included in the package (§5.12), and a note on any item that could not be captured
- **Recommendation** — a suggested next step for the human reviewer (e.g., "confirm with Product Owner whether X is intended," "reproduce in staging," "no action needed if intentional") — a suggestion, never a directive, and never a claim that the Finding is definitely a defect. (Note: this field exists on every Finding regardless of Category, including Findings whose Category is itself `Recommendation` — see §5.3's disambiguation of the two.)

## 5.15 Scope Boundary — behavioural findings, not a selector catalogue

**This skill does not produce selector, locator, or DOM-structure knowledge for downstream automation to consume** (`workflows_and_pipelines/pipeline/pipeline.md` §3.5). Selector acquisition belongs exclusively to Stage `4A` (`automation-skill` §11A), which verifies each locator live at the moment it generates the code that uses it.

### 5.15.1 The distinction that matters

This is a rule about **purpose**, not about tooling — and the line is precise, because Discovery legitimately captures DOM snapshots:

| Permitted — evidence for a Finding | Prohibited — a catalogue for automation |
|---|---|
| A DOM snapshot captured because a console error fired and the DOM state explains the Finding (§5.11, §9) | A DOM snapshot of every screen visited, captured so automation can mine locators from it later |
| An accessibility-tree read used to determine whether a control is actually reachable, supporting an accessibility Finding | An accessibility-tree dump per screen, persisted as a locator inventory |
| Naming a control in prose so a reader knows which element a Finding concerns ("the Product Access section's Add button") | Recording that control's `css`/`xpath` selector as a reusable locator definition |
| A screenshot that is a Finding's evidence (`pipeline.md` §11.4 — screenshots are taken only for Findings) | A screenshot of every screen visited, or a "Screen Inventory" artifact whose purpose is to seed page objects |

**The test to apply:** *is this artifact here because a Finding needs it as evidence, or because a later stage might want to reuse it?* The first is Discovery's job. The second is out of scope, and (per `pipeline.md` §11.2) is debug scaffolding rather than a deliverable.

### 5.15.2 Why this boundary exists

Three reasons, in the order they matter:

1. **Correctness.** A selector captured here and reused at generation time was verified against a *possibly older* build. Verifying at generation time (§11A of `automation-skill`) removes that staleness window entirely.
2. **Performance.** Discovery is the platform's broadest sweep. Capturing and persisting DOM for every screen it visits multiplies its runtime and its artifact size — for data most runs never use, since a run may never take the Automation branch at all (`pipeline.md` §3.3).
3. **Clean artifacts.** Discovery's reviewer is a QA lead reading Findings and a Gap Analysis. DOM dumps do not serve that reader, and they bury the output that does.

### 5.15.3 What replaced it

Durable locator knowledge still exists and is still reused across runs — it lives in the **Selector Verification KB** (`pipeline.md` §10.8), written by Stage `4A` after live verification and readable by both branches. Discovery is not part of that loop: it neither writes to nor reads from that KB.

**Existing Screen/Component Knowledge is still *read* here.** `platform_core_data/knowledge_base/browser/screens/` is consumed by the Browser Driver to navigate and authenticate efficiently (§10) — reading existing navigation knowledge to explore is entirely different from generating a selector catalogue as output.

# 6. Timeline

This skill maintains a single, run-wide, chronologically ordered Timeline of significant actions and events, sufficient for a human to reconstruct what happened and when without replaying the session.

Rules:
- Every entry has a timestamp and a short, factual description of what occurred.
- At minimum, log: navigations, form submissions/significant actions, every Event-Driven Capture trigger (§5.2) the instant it fires, every Finding's creation (with its ID), and stage-level milestones (start/end of exploring a given module or flow).
- The Timeline is appended to continuously during the run, not reconstructed after the fact from memory.
- The Timeline is factual and sequential — it is not the place for classification, severity, or conclusions; those live in the relevant Finding's metadata.

Example:

```
10:15  Open Login page
10:16  Enter invalid username
10:16  Submit login form
10:16  HTTP 302 → /auth/login
10:16  Alert: "Invalid credentials"
10:17  Console: clean (0 errors)
10:18  FINDING-001 created (Category: Security Concern)
```

Saved as: `platform_core_data/modules/{{MODULE_SLUG}}/discovery/Timeline.md`

# 7. Coverage

This skill maintains a running Coverage tracker for the entire run, reconciled against the Project Context's declared in-scope surface.

Track, at minimum:

- **Visited Screens** — distinct screens/URLs actually explored
- **Visited Components** — distinct reusable UI components exercised (e.g., a shared typeahead, a shared dropdown pattern) — noted once per component, not once per occurrence
- **Skipped Areas** — in-scope areas this skill chose not to explore in this run and why (e.g., deprioritized within a time-bounded run)
- **Blocked Areas** — in-scope areas exploration attempted but could not proceed past (e.g., a workflow requiring data the environment lacks)
- **Unreachable Areas** — in-scope areas that could not be reached at all given the Environment Constraints or credentials available
- **Coverage %** — a simple, stated ratio of Visited Screens against the Project Context's total declared in-scope screens/surface, with the ratio's basis shown (e.g., "6/6 Login-scope screens visited = 100%") — a mechanical count, not a judgment of whether that coverage was *sufficient*
- **Discovery Mode per entry** — each Visited/Skipped/Blocked/Unreachable entry additionally records which Discovery Mode (§8.1) covered it, so a reviewer can see at a glance which parts of the run were live-verified versus covered by a fallback mode.

Saved as: `platform_core_data/modules/{{MODULE_SLUG}}/discovery/Coverage_Summary.md`, and summarized in the QA Assessment Report (§12).

# 8. Inputs

| Input | Role | Required? | Description |
|---|---|---|---|
| Project Context | Primary | Required | `platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md` — supplies URL, credentials, in-scope modules, environment constraints, carried-forward assumptions, and the expected behavior to validate against |
| Discovery Source | Secondary | Required | The best available source of truth about the running application's actual behavior. Browser automation against the live application is preferred; when unavailable, this skill falls back through the priority-ordered Discovery Modes in §8.1 rather than treating this input as unsatisfiable. |

No other inputs are used. The Explorer skill does not read the PRD directly — the Project Context is its complete brief on what is expected; the Discovery Source is the only other thing it looks at, in whichever Discovery Mode is actually available. This skill's own Timeline (§6) and Coverage tracker (§7) are maintained by this skill itself during the run, not supplied externally.

## 8.1 Discovery Modes (Priority Order)

Discovery — validating and enriching the Project Context against actual application behavior — is this skill's responsibility. Browser automation is its preferred mechanism, because it is the only mode supporting live interaction, the Investigation & Recovery Engine (§5.7), and live boundary-condition probing (§5.8) in full — but it is not a precondition for this skill's existence. When the highest-priority mode is unavailable for a given run, this skill falls back to the next mode down this list rather than halting:

1. **Browser automation** — direct, live interaction with the running application: navigation, clicks, form input, and live screenshot/DOM/accessibility-tree/console/network capture. **Two mechanisms serve this mode, and they are selectable peers** (`platform_core/tools/mcp/README.md` §1.1–§1.2): the **Browser Driver** (`platform_core/tools/browser_driver/`) — the default for any authenticated flow and any screen that already has Screen/Component Knowledge, since it logs in itself without ever exposing a credential — and the **`playwright` MCP server**, selected for first-contact exploration of a screen with no `screens/{name}.json` yet, for one-off accessibility-tree reads, or when the driver is unavailable for a reason unrelated to the application. A credential value is **never** typed into an MCP tool call (`mcp/README.md` §1.3): authenticate via `BrowserDriver.authenticate()`, then explore the already-authenticated session. Per §8.3, recording "Browser automation" alone is not sufficient — the mode entry names **which** of the two produced the evidence.
2. **Existing screenshots** — previously captured images of the application (e.g., supplied by the user, or already stored under a project's `resources/screenshots/`) — no live interaction, but direct visual evidence of real screens.
3. **Existing recordings** — previously captured video/session recordings of the application in use — no live interaction, but direct behavioral evidence across a sequence of states.
4. **User-guided exploration** — a human operator drives the live application themselves (because this skill cannot) and reports back, live and in conversation with this skill, what they did and observed — interactive, but mediated through the human rather than direct automated action.
5. **Documentation** — architecture docs, onboarding notes, PRDs, or other written material describing intended/actual behavior (e.g., a project's `architecture.md`, `resources/requirements/`) — describes the system but is not itself observed behavior.
6. **APIs** — direct calls to the application's own API (where read-only, authorized endpoints exist and a calling tool is available) to observe actual data/behavior without a browser.
7. **Static artifacts** — any other static, already-existing record of the application (exported HTML, log files, read-only database exports, config dumps) not covered by 1–6.

## 8.2 Mode Selection & Fallback Rules

- At the start of a run, this skill attempts Discovery Modes in the priority order above and selects the **highest-priority mode that is actually available** for this run's environment and tooling. It must not skip a higher-priority available mode in favor of a lower one out of convenience.
- Unavailability of a higher-priority mode (e.g., no browser automation tool present) is never, by itself, a reason to halt the run or decline to produce Discovery Artifacts. This skill falls back to the next available mode and proceeds.
- **More than one mode may be used within the same run**, for different in-scope areas (e.g., Browser automation for screens reachable live, User-guided exploration for a screen the human had to walk through manually, Documentation for a not-yet-built feature with no live surface at all). This skill is not restricted to exactly one mode per run. Each discovery snapshot, Finding, and Coverage entry records which mode produced it.
- If **no mode at all** is available for a given in-scope area (e.g., a feature doesn't exist yet, and no documentation, screenshots, or other record of it exists either), this skill must not fabricate discovery. It records the area as **Unreachable** in Coverage (§7) and raises a `Test Gap` Finding (or an Open Question, if no Finding is warranted) stating plainly that no discovery mechanism was available.
- This skill must never silently substitute a lower-priority mode's evidence for what a higher-priority mode would have produced without disclosing the substitution — every Finding and discovery snapshot states its Discovery Mode explicitly (§8.3).

## 8.3 Reporting the Selected Mode and Its Confidence Implications

- Every discovery snapshot, Finding, and Coverage entry must state which Discovery Mode (§8.1) produced it.
- The QA Assessment Report's Application Overview section (§9) must summarize which mode(s) were used across the run and why — e.g., "Browser automation unavailable this run — Discovery Mode: User-guided exploration for the Credential Routes Filter and Airport screens; Documentation for the not-yet-built Airlines dropdown and audit log."
- **Discovery Mode is not itself what caps achievable Confidence and Status — the Evidence Category it produces is (§17–§18).** In practice, most Discovery Modes have a typical Evidence Category (§17 gives the mapping), so the two move together most of the time — but this skill must classify by what the evidence actually is, not by which tool produced it, since a mode can sometimes underperform its typical category (e.g., a browser session that only yields a secondhand Human Observation because the state changed too fast to capture directly).
- Missing evidence items caused by the selected mode (e.g., no console log obtainable from a static screenshot) are recorded per the existing §5.10 rule — named as missing, with the reason, never silently omitted or fabricated.

# 9. Outputs

**Discovery Artifacts** — the full output set of this skill:

1. **Discovery snapshots** — a paired set of raw structural snapshots, one per distinct screen/state, scoped to exactly the modules the Project Context marked "In Scope."
2. **Timeline** (§6) — the run-wide chronological action/event log.
3. **Coverage Summary** (§7) — the run-wide coverage tracker.
4. **QA Assessment Report** — the synthesized discovery report, structured per the Standard Output Contract (§19): Scope, Objectives, Evidence Sources, Modules Explored, Observed Behaviour, Confirmed Behaviour, Assumptions, Open Questions, Discovered Risks, Coverage, Gaps, Recommendations, and Inputs for Test Design, in that order. Findings are referenced by ID throughout rather than restated as free text.
5. **Findings Summary** — a single index of every finalized Finding raised during the run: ID, Title, Category, Severity, Confidence Score, Status, Occurrence Count, Module, and a one-line description, so a reviewer can triage the full set without opening every evidence package. This is also the index this skill searches during Duplicate Detection (§5.9) before creating each new Finding.
6. **Evidence Packages** — one dedicated, self-contained folder per Finding, per §5.12, containing that Finding's `metadata.md` (§5.14) and all evidence captured for it.

# 10. Allowed Tools

Which tools are actually used depends on the Discovery Mode selected (§8.1) for a given run or in-scope area — this skill is not limited to the first row below, and may use more than one row's tools within the same run:

- **Browser automation** (preferred mode, §8.1 #1): either the **Browser Driver** (`platform_core/tools/browser_driver/api.js` — `navigate`, `click`, `type`, `select`, `screenshot`, **`annotatedScreenshot`** (§5.11.2), `extractText`, `extractTable`, `waitFor`, `captureNetwork`, `takePendingDialog`) or the **`playwright` MCP server** (`browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`, `browser_wait_for`, `browser_handle_dialog`, `browser_tabs`, `browser_resize`), chosen per the Mode Selection Rule in `platform_core/tools/mcp/README.md` §1.2 — navigate, click, type, snapshot/accessibility-tree capture, DOM snapshot capture, full-page and element-scoped screenshot capture, video/session recording, wait, console log capture, network request/response capture (including HAR-equivalent export and request/response header/body inspection), dialog handling, refresh/back/forward navigation, direct URL navigation, and — where the tool supports it — launching a fresh/clean browser context for clean-state recovery attempts (§5.7). `browser_evaluate`/`browser_run_code_unsafe` are read-only here: they observe state, never mutate it, and never carry a credential value (`mcp/README.md` §1.3–§1.4).
- **Existing screenshots / recordings / documentation / static artifacts** (§8.1 #2, #3, #5, #7): Read (to ingest supplied images, video files, docs, exported HTML/logs/config); no live interaction is possible under these modes, per §8.3
- **User-guided exploration** (§8.1 #4): conversational exchange with a human operator who drives the live application on this skill's behalf, plus Read for any screenshots/descriptions they supply back
- **APIs** (§8.1 #6): read-only API-calling tools against the application's own authorized endpoints, where available
- File tools (all modes): Read (Project Context, current Findings Summary for duplicate checks), Write (discovery snapshots, Timeline, Coverage Summary, QA Assessment Report, Findings Summary, and per-Finding evidence packages)
- Read-only directory-listing shell commands for organizing output files

**Headless is the default for both browser automation mechanisms** (`platform_core/tools/mcp/README.md` §1.1.1): the Browser Driver takes `browser.headless: true` from `platform_core_data/knowledge_base/browser/profile.json` whenever the `headless` argument is omitted (omit it), and the `playwright` MCP server is registered with `--headless`. This skill must not request a headed browser — headed mode is a human operator's local debugging opt-in. Headless costs no evidence: screenshots, DOM, accessibility tree, console, and network are all captured exactly as in a headed run, so the Evidence Category (§17) and Confidence ceiling (§18) of a headless run are unchanged.

**Not permitted:** direct database/API mutation tools, destructive Bash commands, git write operations, or any action that creates/edits/deletes persistent application data outside what the Project Context's Environment Constraints explicitly authorize — regardless of which Discovery Mode is in use. This includes investigation probes (§5.8) and recovery attempts (§5.7) — neither ever performs an actually destructive or unauthorized action, even in service of testing input handling or attempting recovery.

# 11. Execution Rules

1. Must not explore any module the Project Context marks "Out of Scope."
2. Must not perform destructive or persistent data-mutating actions unless explicitly authorized by the Project Context.
3. Must not assert behavior not directly observed — anything inferred must be flagged as an assumption, open question, or labeled Root Cause Hypothesis (§5.13), never stated as fact.
4. Must produce one discovery snapshot per distinct screen/state, not a single monolithic capture of the whole session.
5. Must explicitly address every carried-forward assumption/risk from the Project Context in the QA Assessment Report's findings, even if the answer is "still unresolved — could not be tested safely in this environment."
6. Must not write test cases or automation code — that is the Test Design skill's responsibility.
7. Must NOT redefine, override, or "correct" business requirements. Any divergence between the Project Context and the observed application is recorded as a gap for stakeholders to resolve, never silently treated as the new truth.
8. Must treat the Project Context as authoritative for what *should* happen and the running application as authoritative only for what *does* happen — the two are reported side by side, never merged into a single reinterpreted requirement.
9. Must never classify unexpected behavior as a `Bug` by default. A `Bug` classification requires a clearly documented Project Context requirement that the observation contradicts, plus supporting evidence. Absent that, the correct classification is `Observation`, with status `Needs Human Review`.
10. Must never assign `Confirmed` status when the Project Context does not clearly define the expected behavior, **or** when Confidence Score is below 90% (§5.5/§5.6) — both gates are independent and both must pass.
11. Must never report a Finding without a complete Evidence Package (§5.12) matched to its Category's Smart Evidence Collection floor (§5.11). If, in a specific case, no evidence at all could be captured (a fully technical impossibility), this skill must not create the Finding — it instead records the missed observation as an Open Question in the QA Assessment Report, explaining why evidence could not be captured, rather than publishing an unsupported claim.
12. Must never invent expected behavior. Where the Project Context is silent or ambiguous, "not defined in the Project Context" is the only permissible statement of expected behavior — this skill must not substitute its own assumption of what the application "should" do.
13. **Must never finalize a Finding from a single, unvalidated symptom.** Every candidate must complete the full Investigation Workflow (§5.1) — validate, attempt recovery per §5.7 where applicable, investigate boundary conditions per §5.8 where applicable — before classification and artifact generation.
14. **Must apply the Investigation & Recovery Engine (§5.7)** for any candidate whose failure falls into one of its listed categories, and must record the outcome in the Finding's `Investigation/Recovery Result` metadata field, even when the category is "no retry."
15. **Must never stop investigating at the first symptom.** For Validation, Navigation, and Authorization-related candidates, the boundary conditions in §5.8 must be probed (to the extent technically feasible and authorized) before the Finding is finalized.
16. **Must search the Findings Summary for an equivalent existing Finding before creating a new one** (§5.9). Must never generate a duplicate Finding for the same underlying condition — an equivalent recurrence is appended as a new occurrence, not a new Finding.
17. **Must assign Severity using the Severity Matrix (§5.4) rules**, never intuition, and must always include a Severity Reason, including when a Finding defaults to `Low` for not clearly matching a criterion.
18. **Must collect the Smart Evidence Collection minimum set for the Finding's Category (§5.11)**, in addition to whatever else is feasible from the full inventory (§5.10).
19. **Must automatically capture evidence for every Event-Driven Capture trigger (§5.2) the instant it occurs**, without waiting to notice it narratively, and must feed the trigger into the Investigation Workflow (§5.1).
20. **Must never present a Root Cause Hypothesis (§5.13) as fact.** It must be labeled as a hypothesis, carry its own confidence, and state its unknowns; it must never be used to inflate a Finding's own Confidence Score or justify a `Confirmed` status.
21. **Must never stop exploring the in-scope surface because a Finding was created.** Exploration continues through the full in-scope surface regardless of how many Findings have already been raised, subject only to the Project Context's own scope and Environment Constraints.
22. **Must never overwrite an existing evidence file.** A new occurrence's evidence, or a recovery attempt's evidence, is saved under a new, distinguishing filename alongside the original, never in place of it.
23. **Must maintain full traceability at every step** — every Finding traces to its evidence, every evidence item traces to a Timeline entry, and every Timeline entry traces to a specific in-scope action or Event-Driven Capture trigger. A break anywhere in this chain is itself a defect in this skill's own output and must be corrected before the artifact is considered complete, not silently left as a gap.
24. **Must keep the Timeline (§6) and Coverage Summary (§7) current throughout the run**, not reconstructed retroactively at the end.
25. The Project Context remains the single source of truth for expected behavior at all times; nothing in the Finding Framework (§5) overrides this section's rules 7–8.
26. **Must select Discovery Modes in the priority order given in §8.1**, using the highest-priority mode actually available, and must fall back automatically to the next available mode rather than halting the run when a higher-priority mode is unavailable (§8.2).
27. **Must never halt a run, decline to produce Discovery Artifacts, or refuse to explore an in-scope area solely because browser automation (or any single Discovery Mode) is unavailable.** The only case in which an in-scope area is recorded as unreachable is when *no* Discovery Mode at all is available for it (§8.2) — and even then, that is recorded as Coverage `Unreachable` plus a `Test Gap`/Open Question, not a silent stop.
28. **Must disclose the Discovery Mode used for every discovery snapshot, Finding, and Coverage entry** (§8.3), and must never present evidence gathered under one mode as if it were gathered under a higher-priority mode.
29. **Must never assign `Confirmed` status to a Finding whose Evidence Category (§17) is Documentation, Static Artifact, Human Observation, or Assumption** regardless of how clear the evidence looks, because the recovery/reproduction steps `Confirmed` requires (§5.5–§5.6) could not be attempted for that category of evidence (§18) — this is an application of the existing Confidence/Status gates, not an exception to them.
30. **Must classify every Finding's Evidence Category** (§17) and record it in the Finding's metadata (§5.14), and must apply the Discovery Strategy matching the run's Run Scope Type (§16) rather than one default depth/breadth regardless of scope.
31. **Must recognize and act on the named Stop Conditions** (§20), and must attempt the mid-run Recovery Strategy (§21) for a per-area block before recording that area as Blocked/Unreachable.
32. **Must verify Handoff completeness** (§22) before treating a run's Discovery Artifacts as finished — every input the Test Design skill's specification declares it needs must actually be present and unambiguous.
33. **Must run the Simple English Communication Standard check on the QA Assessment Report and every Finding before treating a run's Discovery Artifacts as finished** (`workflows_and_pipelines/pipeline/pipeline.md` §6 Rule 10): short, direct sentences; any hard word replaced with an easier one where meaning stays the same; every necessary technical term briefly explained; Confirmed Behaviour kept visibly separate from Assumptions and Open Questions; and a first-read check for whether a QA Lead would understand it. Finding IDs, module names, and evidence file names are never altered by this check.
34. **Must capture annotated evidence for every unclear item** (§5.11.1). Whenever this stage raises an Open Question, records an ambiguous UI observation, cannot determine a control's purpose, finds unclear wording/validation/status/icon/column/section behaviour, needs a product-owner decision about a visual element, or records a mismatch it cannot yet classify, it must produce **both** the original screenshot **and** an annotated copy carrying a labelled, high-contrast rectangle around only the unclear element — and must record the matching `Unclear Items` rows in the Finding's metadata (§5.14). **A screenshot with no precise visual highlight is not sufficient evidence for an unclear-item Finding.** The only exception is a Discovery Mode with no live page (§5.11.3), which requires the verbatim `Annotated evidence not capturable — Discovery Mode: <mode>` note plus a precise written location — never a fabricated or estimated rectangle, and never a silent omission. This rule **never** applies as an excuse during live-browser Discovery.

# 12. Expected Artifacts

| Artifact | Path | Template |
|---|---|---|
| Discovery snapshots | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/*.md` — one file per distinct screen/state explored, limited to in-scope modules | [`stage_2_discovery/DiscoverySnapshot.md`](../../../platform_core/templates/stage_2_discovery/DiscoverySnapshot.md) |
| Timeline | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/Timeline.md` | [`stage_2_discovery/Timeline.md`](../../../platform_core/templates/stage_2_discovery/Timeline.md) |
| Coverage Summary | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/Coverage_Summary.md` | [`stage_2_discovery/Coverage_Summary.md`](../../../platform_core/templates/stage_2_discovery/Coverage_Summary.md) |
| QA Assessment Report | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md` | [`stage_2_discovery/QA_Assessment_Report.md`](../../../platform_core/templates/stage_2_discovery/QA_Assessment_Report.md) |
| Findings Summary | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/Findings_Summary.md` | [`stage_2_discovery/findings/Findings_Summary.md`](../../../platform_core/templates/stage_2_discovery/findings/Findings_Summary.md) |
| Evidence Packages | `platform_core_data/modules/{{MODULE_SLUG}}/discovery/findings/FINDING-{ID}_{ShortName}/` — containing `metadata.md` and the evidence files captured per §5.10–5.12 | [`stage_2_discovery/findings/FINDING_metadata.md`](../../../platform_core/templates/stage_2_discovery/findings/FINDING_metadata.md) |

**Every artifact's document structure is defined by its template** in `platform_core/templates/`, not restated here. Render an artifact by copying its template and filling the `{{PLACEHOLDER}}` tokens; section order is mandatory and the inline `<!-- -->` guidance is stripped from the rendered output. The QA Assessment Report template encodes §19's 13-section contract, and `FINDING_metadata.md` encodes §5.14's field order. `platform_core/templates/README.md` states the shared conventions.

# 12A. QA Assessment Report — HTML companion (`pipeline.md` §17)

The QA Assessment Report is **also published in the platform's shared HTML report design**, generated by `platform_core/tools/report_builder`. Three files, same folder:

```
platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md            # the artifact
platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.report.json   # the report model
platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.html          # generated — never hand-edited
```

```bash
node platform_core/tools/report_builder/cli.js validate --model platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.report.json
node platform_core/tools/report_builder/cli.js build    --model platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.report.json
```

`validate` first — it exits `2` and names the exact path that is wrong; surface its message unchanged. Model reference: `platform_core/tools/report_builder/README.md`.

**The HTML never replaces the Markdown.** The Markdown is the artifact the Traceability Chain runs through and the one a reviewer approves; the HTML is a second rendering of the same content for stakeholders — never approved, never versioned, never read as input by any stage. **Rebuild it after every in-place correction** (`pipeline.md` §7), or the two disagree and the Markdown is the one that is right.

### 12A.1 Mapping this stage onto the model

**Discovery has no test cases, so the test-case region is simply absent.** This report is its summary plus its sections — the same design with a region unused, not a different design. Do not invent test-case-shaped rows for Findings.

**Every Finding becomes a `findings` item**, with its Finding ID in `refs`, its supporting Evidence (§17) in `evidence`, and its classification as the item's `kind`.

**Confidence is governed by evidence quality, not discovery mode** (§18), and the HTML must not blur that. Map the confidence level to the item's tone and state it in the `kind` — an `Assumed` finding and a `Confirmed` one must be distinguishable at a glance, because Stage 3 is allowed to treat only one of them as a requirement.

**Coverage figures come from the Coverage Summary**, and anything not reached is reported as not covered in a `notes` section — never omitted, since an absent row reads as "nothing to say."

**Gaps and open questions are their own `findings` items or `notes` section**, never dropped for a cleaner page.

**Captured output goes through `text`, never `html`.** An application response, a UI message, a log line, and anything a human typed are escaped. `html` is only for markup this stage generated itself.

**Redact through the model's `"redacted": true`**, never by hand-typing a placeholder into a header value.

**Excerpt a very large capture and say so** in the exchange's `notes` — a full multi-hundred-KB body helps no reader, and silently truncating one misleads every reader.


# 13. Operational Contract

Role: evidence-driven QA discovery (Stage 2 — shared by both pipelines).

Validate the approved Project Context against the live application and publish evidence-backed Findings. Execution is fully specified above — §4 (Core Philosophy), §5 (Finding Framework: Investigation Workflow §5.1, Event-Driven Capture §5.2, Classification §5.3, Severity §5.4, Confidence §5.5, Status §5.6, Investigation & Recovery Engine §5.7, Investigation Mode §5.8, Duplicate Detection §5.9, Evidence §5.10–§5.12, Root Cause Hypothesis §5.13, metadata schema §5.14), §6 (Timeline), §7 (Coverage), §8 (Inputs and Discovery Modes), §9 (Outputs), §11 (Execution Rules), §12 (Artifacts), §16 (Discovery Strategy by Run Scope), §17 (Evidence Categories), §18 (Confidence Model), §19 (Standard Output Contract — the QA Assessment Report section order), §20–§21 (Stop Conditions and Recovery), §22 (Handoff Contract). This section adds no rules of its own; the contract is stated once above rather than restated here.

# 14. Example Execution

*Illustrative only — not executed as part of this task.*

```text
Input: platform_core_data/modules/{{MODULE_SLUG}}/context/ProjectContext.md
  (In Scope: Admin, PIM, Leave — as produced by the Project Context skill)
```

Hypothetical result: `platform_core_data/modules/{{MODULE_SLUG}}/discovery/*.md` snapshots covering only Admin-security-perimeter screens (login, forgot password, Administrator Access modal), PIM screens (Employee List, Add Employee, employee detail tabs), and Leave screens (Apply Leave, Leave List) — explicitly skipping Time, Recruitment, Performance, and Directory since those are Out of Scope for this run, alongside a `Timeline.md` logging every navigation/action/trigger in order and a `Coverage_Summary.md` showing, say, "9/9 in-scope screens visited = 100%."

While exploring PIM's Add Employee screen, an Event-Driven Capture trigger (a console error) fires the instant the Employee Id field is edited — evidence is captured immediately (screenshot, console log, DOM snapshot) before this skill even finishes the current action, and the trigger is logged in the Timeline. The candidate enters the Investigation Workflow: validated by reproducing on a second attempt; the failure category is "Unexpected UI rendering," so this skill refreshes once per the Investigation & Recovery Engine — the console error does not recur after refresh, so the Recovery Result is "resolved on recovery," and Confidence is set to 65% (observed once before recovery, not reproduced after) — below the 90% floor, so Status is `Needs Human Review` regardless of how the requirement question would otherwise resolve. This skill still separately notes the Gap Analysis item that the Project Context described the Employee Id field as "system-suggested" while the observed application allows it to be freely overwritten — this is investigated as its own candidate: validated, checked against the Validation boundary conditions (empty, spaces, unicode, emoji, long input, special characters — noting which revealed additional inconsistencies), classified as `Requirement Gap` (Severity N/A), Confidence 95% on the observation itself, Business Risk "duplicate/malformed employee IDs could reach payroll/reporting downstream," Technical Risk "no visible server-side uniqueness constraint enforced through the UI," a Root Cause Hypothesis ("possibly a deliberate default-not-enforced design, consistent with a 'suggested' rather than 'assigned' ID — Unknowns: whether server-side uniqueness validation exists but simply isn't surfaced client-side"), and Status `Needs Human Review` (the Project Context doesn't state whether "system-suggested" is meant to be enforced). It then checks the Findings Summary, finds no equivalent entry, and creates `FINDING-004_EmployeeIdEditable` with `Occurrence Count: 1`. Exploration continues into Leave afterward — neither Finding was treated as a reason to stop.

**A second, fallback-mode example (§8.1–§8.3):** for a run against NDC with no browser automation tool available, this skill selects Discovery Mode #4 (User-guided exploration) — the human operator navigates the live Credential Routes Filter screen themselves and reports back what they see. This skill records each screen's discovery snapshot with `Discovery Mode: User-guided exploration`, and for the Project Context's carried-forward Assumption #1 (Airport BlackList/WhiteList and Credential Routes filtering combine with AND logic), the human reports what the configured rules currently show. Because this mode cannot perform live retries or the Investigation & Recovery Engine, the resulting Finding is capped at `Needs Human Review` even though the observation itself is clear and directly reported — it cannot become `Confirmed` under this mode, per §8.3. Separately, the Project Context's Assumption #4 (an audit log, a supplier-verification function, and a route tag do not exist yet) has no live surface, no screenshot, and no documentation describing it in enough detail to observe — no Discovery Mode applies. This skill records this specific item as `Unreachable` in Coverage and raises a `Test Gap` noting no discovery mechanism was available for it, rather than guessing at what it might look like once built. The QA Assessment Report's Application Overview states plainly: "Browser automation unavailable this run — Discovery Mode: User-guided exploration for Credential Routes Filter and Airport screens; no mode available for the not-yet-built audit log/verification function/route tag."

# 15. Architecture Principle

> Agents communicate through artifacts only. Each has a single responsibility. Every output becomes the input of another whenever applicable.

For this skill specifically: its single responsibility is validating and enriching — never authoring — requirements. Its outputs, the Discovery Artifacts (including the Timeline, Coverage Summary, Findings Summary, and Evidence Packages), become input to the Test Design skill purely as secondary, validating material alongside the primary Project Context.

# 16. Discovery Strategy by Run Scope

Exploration depth and breadth are not one-size-fits-all. This skill selects its strategy based on the run's Run Scope Type (`workflows_and_pipelines/pipeline/run_scope.md` §3) and Run Type (`workflows_and_pipelines/pipeline/run_scope.md` §5), stated in the Project Context's Scope Summary, rather than applying a single default approach regardless of what this run actually covers:

| Run Scope Type / Run Type | Strategy |
|---|---|
| **Entire Project** | Broad, systematic sweep across every in-scope module. Coverage-driven: the primary success measure is Coverage % (§7) across the full declared surface, at standard Investigation Workflow depth. |
| **Epic** | Explore every Feature/User Story grouped under the Epic as a connected set, with specific attention to the integration points and hand-offs *between* those grouped items — an Epic-level gap is often at a seam between two stories, not inside either one alone. |
| **Feature** | Focused, end-to-end exploration of the one feature's complete workflow. Narrower surface than Entire Project or Epic allows, and calls for, deeper per-screen Investigation Mode (§5.8) boundary-probing than a broad sweep would budget for. |
| **User Story** | Narrowest scope: targeted verification strictly of the story's acceptance criteria. This skill does not wander into adjacent screens beyond what's needed to reach or verify the story, and every carried-forward Assumption/Risk tied to that story gets a direct, explicit confirm/refute/unresolved treatment (§3) rather than being covered incidentally. |
| **Bug** | Reproduction-first: prioritize reproducing the specific reported defect exactly as described, before any broader exploration. If reproduced, also check the immediate boundary/regression neighborhood (§5.8) for related paths that might share the same root cause. If it cannot be reproduced, that itself is the primary, explicitly reported outcome ("could not reproduce, {N} attempts, {conditions varied}") — never silently dropped or treated as "no Finding." |
| **Requirement Document** | Size the strategy to what the supplied document actually states it covers — could be Feature-sized or Epic-sized in practice. This skill states, in the QA Assessment Report's Scope section (§19), which breadth it applied and why, so a reviewer can check the two match. |
| **Custom Scope** | Strategy follows exactly what the run's Custom Scope description states. Where that description doesn't map onto UI screens at all (e.g., "verify the API responses for X" or "just check the Admin Settings config table"), this skill selects Discovery Modes accordingly (§8.1 #6 APIs, or the relevant Static Artifact) rather than forcing a browser-shaped exploration where the scope doesn't call for one. |
| **Full Regression** (Run Type) | Prioritizes systematically re-verifying already-documented workflows and the areas of prior Findings over hunting for novel ground — the goal is confirming known-good behavior still holds, not primarily discovering new territory. |
| **Smoke** (Run Type) | Shallow, breadth-first pass over critical paths only. Reduced per-screen Investigation Mode depth (§5.8) — full boundary-condition probing is reserved for candidates that already look Critical/High severity, not applied uniformly, to keep the pass fast. |

If the Project Context does not state a Run Scope Type/Run Type explicitly, this skill defaults to the **Entire Project** strategy against whatever modules the Project Context lists as In Scope, and notes in the QA Assessment Report that no explicit Run Scope Type was stated.

# 17. Evidence Categories

Every Finding's supporting evidence is classified into exactly one of the following categories — independent of which Discovery Mode (§8.1) produced it. This is what actually determines achievable Confidence and Status (§18), not the tool used:

| Evidence Category | Meaning | Typically produced by (§8.1) |
|---|---|---|
| **Direct Observation** | This skill itself directly witnessed live application behavior through interactive tooling it controlled. | Browser automation; an API call this skill itself made live |
| **System Response** | A response, log entry, or data the system itself generated, captured even if not driven interactively by this skill in this instant (e.g., a previously captured API response, a live-read log line). | Browser automation (network capture); APIs; Static artifacts (log files) |
| **Documentation** | Written material stating intended or described behavior — not itself an observation of runtime behavior. | Documentation |
| **Human Observation** | A human operator observed and reported behavior to this skill; this skill did not witness it directly. | User-guided exploration |
| **Static Artifact** | A fixed, previously captured record (image, video, export) of a past state — not a live observation, and not re-verifiable within this run. | Existing screenshots; Existing recordings; Static artifacts |
| **Assumption** | No observation at all — a stated belief or inference, explicitly labeled as such, not backed by any of the above. | Any mode, when this skill must infer rather than observe |

## 17.1 Corroboration

A single Finding may be supported by more than one Evidence Category simultaneously — this skill is never limited to consuming exactly one evidence source per Finding. When multiple independent categories agree (e.g., a Human Observation corroborated by Documentation describing the same expected state, or a Static Artifact corroborated by a later Direct Observation), this skill records every contributing category and may raise Confidence accordingly (§18) — but corroboration among non-Direct-Observation categories alone still cannot clear the `Confirmed` bar, per §18, since none of them can satisfy the recovery-attempt requirement that bar carries.

# 18. Confidence Model — Governed by Evidence Quality, Not Discovery Mode

The Confidence Engine (§5.5) and Status assignment (§5.6) are unchanged in their mechanics — this section states explicitly what actually bounds them, so this skill never overstates certainty because a particular tool happened to be available.

| Evidence Category (§17) | Confidence ceiling behavior |
|---|---|
| **Direct Observation** | Full 0–100% range available; the only category that, combined with exhausted recovery attempts (§5.7) and a clearly documented Project Context requirement, can reach `Confirmed`. |
| **System Response** | Full range available *if* it can be independently re-queried/reproduced within this run; if it is a one-time historical capture with no way to re-verify, it is treated as a Static Artifact for capping purposes. |
| **Human Observation** | Capped below `Confirmed` regardless of how clearly the human described it — a secondhand report carries irreducible interpretation risk this skill cannot itself verify. Ceiling: `Likely` band (§5.5) unless corroborated by a second, independent category. |
| **Documentation** | Describes intended behavior, not observed behavior — alone, it can validate or contradict the Project Context's own claims, but it must never be the sole basis for a Finding asserting what the *application* actually does. Status defaults to `Needs Human Review`; never `Confirmed`. |
| **Static Artifact** | Clear but not reproducible within this run. Ceiling: `Likely` band (§5.5) unless corroborated. |
| **Assumption** | Always low confidence, always `Needs Human Review`, explicitly labeled — never `Confirmed`, never averaged upward by corroboration (an Assumption corroborating another Assumption is still an Assumption). |

**This skill must never overstate certainty.** Where evidence quality is mixed or ambiguous, this skill reports the weaker/more honest reading, not the more convenient one — consistent with the existing Governing Rule in §5.6 that any doubt is reported, never silently resolved upward.

This model supersedes any implication in §8.3 that Discovery Mode itself sets the cap — Discovery Mode determines what Evidence Category is achievable (§17's mapping column), and Evidence Category is what actually governs Confidence/Status.

# 19. Standard Output Contract

Every run's Discovery output must be structured and predictable — the Test Design skill (and any future consumer) must never have to parse free-form prose to extract what it needs. The QA Assessment Report (§9, §12) must contain exactly these sections, in this order, each with the stated minimum content:

| # | Section | Must contain, at minimum |
|---|---|---|
| 1 | **Scope** | The Run Scope Type/Source and Run Type this run used (§16), and which Project Context version this run validated against |
| 2 | **Objectives** | What this run set out to verify, derived from the Project Context's Scope Summary and the Run Scope's specific target (an Epic/Feature/Story/Bug description, or the full in-scope module list for Entire Project) |
| 3 | **Evidence Sources** | Every Discovery Mode (§8.1) actually used this run, which in-scope areas each covered, and why (§8.3) |
| 4 | **Modules Explored** | Sitemap/route structure, business modules and their purpose, reusable UI components shared across modules (formerly "Feature Inventory") |
| 5 | **Observed Behaviour** | User workflows and business rules/validation behavior actually witnessed, stated factually (formerly "User Workflows") |
| 6 | **Confirmed Behaviour** | The subset of Observed Behaviour explicitly validated against a clearly documented Project Context requirement and found to match — distinct from ambiguous or contradicted items, which belong in Gaps (#11) |
| 7 | **Assumptions** | Every inferred statement not directly observed, per §4 Core Philosophy Principle 3, tagged with its Evidence Category (§17) |
| 8 | **Open Questions** | Every candidate that could not be validated/reproduced and has no other supporting evidence (§5.1 step 2), plus every carried-forward Project Context Assumption/Risk left genuinely unresolved |
| 9 | **Discovered Risks** | Risk Analysis: business/technical risk observations surfaced during exploration (formerly "Risk Analysis") |
| 10 | **Coverage** | Roll-up from `Coverage_Summary.md` (§7), including Discovery Mode per entry |
| 11 | **Gaps** | Gap Analysis: every place observed application behavior contradicts, extends, or is absent from the Project Context (formerly "Gap Analysis") |
| 12 | **Recommendations** | Suggestions for the human reviewer, including Regression Test Candidates (areas worth a regression test, not designed test cases themselves) and every Finding of Category `Recommendation` |
| 13 | **Inputs for Test Design** | The explicit handoff package per §22 — Findings by ID/Category/Status, Confirmed/Refuted/Unresolved Assumptions, Regression Test Candidates, and Requirement Gaps needing a coverage decision |

Findings themselves are never restated in full prose in the Report — every section above references Findings by ID, with full detail living only in that Finding's own `metadata.md` (§5.14), exactly as the existing "Exploratory Testing Findings" convention already required; that convention is preserved, folded into sections 6/9/11/13 above rather than kept as its own separate numbered section.

This section list is the authoritative structure for the QA Assessment Report going forward; §9 (Outputs) reflects it, and §13 (Operational Contract) points here as its authoritative source.

# 20. Stop Conditions

This skill must recognize the following named conditions and take the specified action. Recognizing a Stop Condition is never itself a reason to abandon the run — see §21 for the required recovery step before any area is finalized as blocked.

| Condition | Scope | Required Action |
|---|---|---|
| **Access denied** (e.g., HTTP 403, role lacks permission) | Local — this specific area only | Attempt the mid-run Recovery Strategy (§21) for this area; if none succeeds, record Coverage `Blocked`, raise a Finding (Security Concern or Test Gap depending on whether the denial itself matches or contradicts the Project Context), and continue the rest of the run. |
| **Authentication failure** (cannot log in at all with the credentials the Project Context provides) | Global — nothing reachable via the primary mode | Do not silently produce an empty report. Fall back per §8.2 to whatever Discovery Modes remain viable without a live session (Documentation, Existing screenshots/recordings, User-guided exploration). Record the run's Coverage as heavily `Unreachable` for anything genuinely inaccessible, and raise a Critical-severity Finding/Open Question naming the auth failure itself as a blocking environment issue. |
| **Feature not implemented** (the acceptance criteria describe something with no live surface at all) | Local — this specific area | Per §8.2: record Coverage `Unreachable` and raise a `Test Gap`, rather than guessing at what the not-yet-built feature might do. |
| **Environment unavailable** (target URL unreachable, application down) | Global | Same fallback cascade as Authentication failure. |
| **Navigation impossible** (a link/action that should lead somewhere doesn't) | Local — this specific path | Apply the existing Investigation & Recovery Engine's Navigation failure category (§5.7: retry up to 3 times) before treating it as validated; only then does it become a Finding, not a run-level stop. |
| **Insufficient evidence** (no Discovery Mode can produce evidence for a candidate, per §8.2, or no evidence at all could be captured, per §5.11 Execution Rule 11) | Local — this specific candidate | Do not create the Finding. Record it as an Open Question (§19 §8) or, if the entire area is affected, Coverage `Unreachable` + `Test Gap`, explaining why evidence could not be captured. |

Global conditions (Authentication failure, Environment unavailable) are the only cases where a large fraction of the run may end up `Unreachable` — even then, this skill still produces the full Standard Output Contract (§19), stating plainly what could and couldn't be assessed, rather than terminating without output.

# 21. Recovery Strategy — Mid-Run Fallback

§8.2 already governs which Discovery Mode is selected at the *start* of a run. This section governs what happens when a Stop Condition (§20) blocks a *specific in-scope area* partway through a run that is otherwise using a higher-priority mode successfully.

Before recording any local Stop Condition as final (Blocked/Unreachable), this skill must:

1. **Check whether a lower-priority Discovery Mode (§8.1) could still cover this specific area**, even though a higher-priority mode is working elsewhere in the same run (e.g., the browser-automated run hits an OTP step it cannot complete on one screen — ask the human operator to walk through just that screen, falling back to User-guided exploration for that area only).
2. **If a fallback mode can cover it, use it for that area and disclose the substitution** (§8.3) — this is a normal, permitted mixed-mode run (§8.2), not an exception.
3. **Only if no mode at all can cover the area** does it become Blocked/Unreachable + the corresponding Finding/Test Gap per §20.
4. **State the recommendation explicitly** in the Finding or Coverage entry for that area, e.g.: *"Browser automation blocked here by [reason]; fell back to User-guided exploration for this screen only."* A reviewer must never have to infer that a substitution happened.

This is what makes this skill's failure handling a **recommendation-and-fallback** behavior rather than a **stop-and-report** behavior — failing to reach an area through the primary mode is treated as a local routing problem to solve with the next-best available mode, not an immediate dead end.

# 22. Handoff Contract with the Test Design skill

The Explorer skill's outputs are consumed by the Test Design skill as declared inputs in `.claude/skills/test-design-skill/SKILL.md` §4. Before concluding a run, this skill verifies each of the following is actually present and unambiguous — not merely assumed:

| Test Design skill needs (`.claude/skills/test-design-skill/SKILL.md` §4/§5) | Satisfied by (this skill's output) |
|---|---|
| Discovery Report (`discovery/*.md`, `Timeline.md`, `Coverage_Summary.md`) | §9 Outputs #1–#3, structured per this skill's own conventions |
| QA Assessment Report, including Gap Analysis and Coverage | §19 Standard Output Contract, sections 11 (Gaps) and 10 (Coverage) |
| Findings Summary + every Finding's `metadata.md` | §9 Outputs #5, §5.14 schema — every Finding must have a populated **Expected Behavior** field citing the specific Project Context section (§5.14), since that citation is what lets Test Design populate its own mandatory Requirement Reference and Discovery Reference (`.claude/skills/test-design-skill/SKILL.md` §5.1) without re-deriving it |
| Evidence Packages, cited by reference | §9 Outputs #6, §5.12 |
| A basis for Test Design's Finding Disposition decision (Regression / Exploratory / Documented exception, `.claude/skills/test-design-skill/SKILL.md` §5.3) | Every Finding's Status (§5.6) and Evidence Category (§17) — Status `Confirmed` maps toward Regression test, `Needs Human Review` toward Exploratory test, `Rejected`/`Duplicate` toward Documented exception; this mapping is already unambiguous from fields this skill already produces, and requires no new field |
| Regression Test Candidates for Test Design to consider | §19 section 12 (Recommendations) |

**A run is not complete until every row above is verifiably satisfied.** If any Finding is missing an Expected Behavior citation, if the QA Assessment Report is missing a required §19 section, or if a Finding's Status/Evidence Category combination would leave Test Design's disposition decision ambiguous, this skill must correct it before the run concludes — this is itself a defect in this skill's own output, per the existing traceability rule in Execution Rule 23, not an acceptable handoff gap.

# 23. Future Scalability

The abstractions introduced in this revision — Discovery Mode (§8.1) as *how* evidence is gathered, Evidence Category (§17) as *what kind* of evidence was gathered, and the Finding/Confidence/Status framework (§5) as *evaluation logic independent of either* — are already application-shape-agnostic. None of them assume a browser-rendered UI. This is what lets the following extend the existing model **without a redesign**, needing at most a new Discovery Mode entry in §8.1's list, never a change to §5's Finding Framework, §17's category taxonomy, or §19's Output Contract:

| Future system shape | How it fits today's model |
|---|---|
| **Mobile Applications** | A new Discovery Mode ("Mobile automation," e.g. Appium-equivalent) slots in at priority #1 for that platform, producing Direct Observation evidence exactly as Browser automation does today. |
| **Desktop Applications** | Same pattern — a desktop-automation Discovery Mode producing Direct Observation, ranked #1 for that target. |
| **API-only Systems** | Discovery Mode #6 (APIs) already exists — for an API-only system it is simply promoted to the *primary* mode for that Project Context rather than used as a fallback, with no structural change. |
| **Microservices** | Each service is explored via whichever mode fits it (APIs for the service's own contract, Static Artifacts for exported OpenAPI/Swagger specs, Documentation for architecture docs) — Modules Explored (§19 #4) already generalizes to "services explored." |
| **Background Jobs / Batch Processes** | Discovery Mode via System Response evidence (§17) — job logs, output artifacts, and completion records read as Static Artifacts or System Response, with no live UI needed. |
| **Message Queues** | A read-only queue-inspection tool is a new Discovery Mode producing System Response evidence — same evaluation logic as any other System Response. |
| **Cloud Resources** | A read-only cloud console/API is functionally identical to the existing APIs Discovery Mode — Static configuration reads are Static Artifacts, live resource state reads are System Response or Direct Observation depending on whether this skill queried it live. |

**What would need to change, explicitly, and what would not:** adding any of the above requires (a) naming the new Discovery Mode and its typical Evidence Category mapping in §8.1/§17, and (b) stating its priority rank for that Project Context's system shape. It requires **no change** to the Finding Framework (§5), the Confidence Model (§18), the Standard Output Contract (§19), the Stop Conditions (§20), the Recovery Strategy (§21), or the Handoff Contract (§22) — those are already defined in terms of evidence and evaluation, not in terms of "a browser." This is the concrete basis for treating the current architecture as extensible without redesign, not an unverified claim.

# 24. Direct Invocation

This skill is independently invocable — `/explorer-skill`, optionally with a run-scoped instruction (e.g. `/explorer-skill explore only the PIM module, no destructive actions`). Full rules: `workflows_and_pipelines/pipeline/pipeline.md` §5.3.1.

- **Instruction prompts are run-scoped, never spec-overriding** (§5.3.1 #3). An instruction may narrow which in-scope areas to explore, prioritize a flow, or cap session length. It never authorizes exceeding the Project Context's safety constraints, taking unauthorized mutating actions, raising a Finding above the Status ceiling its Discovery Mode permits (§18), or reading the PRD directly (§6 Rule 4 of the pipeline).
- **Upstream `Pending Review` → request approval, then recommend** (§5.3.1 #4). If `ProjectContext.md` exists but is not `Approved`, do not explore and do not bypass; report it and offer both paths (approve → `/explorer-skill`, or revise → `/project-context-skill <feedback>`).
- **Missing Project Context → run degraded** (§5.3.1 #5), which composes with this skill's existing Discovery Mode fallback (§8.1–§8.2) rather than replacing it: explore the target using the highest-priority available Discovery Mode, but state up front that no approved scope exists, treat *nothing* as confirmed in/out of scope, and mark the Coverage Summary's scope basis as `Open Question — Requires Stage 1`. Never infer the scope boundary from the application's own surface area, and never substitute the PRD for the missing Project Context.
- **Closing message must recommend the next step** (§5.3.1 #6):

```
Stage 2 complete — Discovery Artifacts → Pending Review
  platform_core_data/modules/{{MODULE_SLUG}}/discovery/QA_Assessment_Report.md
  {F} Findings | Coverage {P}% | Discovery Mode: {mode}

Next step — either:
  1. Approve, then continue:   "approved"  →  /test-design-skill
  2. Revise this stage:        /explorer-skill <your feedback>
  3. Explore further first:    /explorer-skill <additional areas>
```

# 25. Observability — what this stage emits

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
| This stage starts | `STAGE_STARTED --stage 2` → keep the returned `spanId` |
| This skill starts | `SKILL_STARTED --stage 2 --skill explorer-skill` |
| This skill finishes | `SKILL_COMPLETED --span-id <id>` |
| This stage finishes | `STAGE_COMPLETED --stage 2 --span-id <id>` |
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
| A Finding is created | `ARTIFACT_CREATED --artifact discovery/findings/<ID>.md --artifact-class discovery` |
| A browser or platform tool fails | the tool emits its own `TOOL_FAILED`; do not emit one on its behalf |

**`Timeline.md` is unchanged and is not replaced by telemetry.** It is the QA narrative — the
human-readable reconstruction of what was explored and what was observed — and it stays exactly as
§6 defines it. Telemetry answers a different question (how long, how many, what failed) and the two
are complementary. Do not stop writing the Timeline because events exist, and do not copy Timeline
prose into event metadata.

## Never emitted by this stage

- **Token counts or cost.** No event type exists for them. No supported run-attributable provider
  usage source exists, and nothing is estimated from text length or hardcoded pricing (HD-OBS-002).
- **A metric, ratio, or score.** This stage records what happened; the aggregator does the arithmetic.
- **A secret.** No password, token, API key, session ID, cookie, authorization header, or card detail
  reaches `--metadata`. Credential *identities* and roles are acceptable where genuinely needed.
- **Every low-level browser interaction.** Emitting an event per click or per DOM read is telemetry noise with no analytical value, and it slows the stage it is observing (§56).

---

# 26. Resolving `{{MODULE_SLUG}}` and `{{RUN_FOLDER}}`

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

This stage **writes into the module**: `modules/{{MODULE_SLUG}}/discovery/`. It reads that module's `context/ProjectContext.md` and never writes there.

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

This stage never creates a run. It reads the Project Context from the active run and writes its Discovery Artifacts back into that same run.

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
