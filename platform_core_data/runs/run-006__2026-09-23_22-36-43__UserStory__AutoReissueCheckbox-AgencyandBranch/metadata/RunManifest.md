# Run Manifest — run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch

| Field | Value |
|---|---|
| Run Folder | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Run Scope Type / Run Type | UserStory / UserStory |
| Workflow | user_story_run |
| Status | Preparing |
| Created | 2026-09-23T19:36:43.470Z |
| Last updated | 2026-09-25T16:28:13.521Z |

## 1. Code-State Anchor

<!-- run_manager.md §5.8 — which state of the application under test this run is about. `null` is a
     legitimate value and is stated with its reason: an unversioned target is not an unchanged one. -->

| Field | Value |
|---|---|
| `targetRef` | `bc564a4c8364560b2664de5c4e64ad21c8b70925` |
| Scoped to | repo-wide |
| Captured at | 2026-09-23T19:36:43.470Z |
| Note | git repository at C:/Users/Mohamed/Desktop/New folder (2)/Ai/agentic-ai-testing-platform |

## 2. Stage Ledger

<!-- One row per stage this run has reached. A stage never reached has NO row — absence means "not
     reached", which is why no row is pre-created as "Not started". -->

| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |
|---|---|---|---|---|---|---|---|
| Project Context | — | 2026-09-23T21:14:37.190Z | Approved | Mohamed Soliman | 0 | — | — |
| Discovery | — | 2026-09-24T20:40:27.511Z | Approved | Mohamed Soliman | 0 | — | — |
| Test Design | — | 2026-09-25T13:25:50.644Z | Approved | Mohamed Soliman | 0 | — | — |
| Manual Execution | — | 2026-09-25T16:28:13.521Z | Pending Review | — | 0 | — | — |

## 3. Cross-Run Reuse / Source Runs

<!-- pipeline.md §7 "Cross-run reuse" — one row per reused artifact. `Referenced` = read in place
     from the prior run; `Copied` = a stage needed to evolve it, so it was copied in once. -->

| Artifact | Source Run | Mode | Approved in source? | Drift since source |
|---|---|---|---|---|
| _(this run reuses nothing)_ | | | | |

**Lineage:** None; this run inherits nothing.

## 4. Checkpoint History

<!-- Append-only. Every checkpoint transition, in order. A Rejected entry keeps its feedback: the
     revision that followed is what the reviewer asked for. -->

| # | Timestamp | Stage | Transition | Decided By | Feedback / Reason |
|---|---|---|---|---|---|
| 1 | 2026-09-23T19:36:43.470Z | — | Run created (`Preparing`) | Run Manager | via user_story_run |
| 2 | 2026-09-23T20:36:01.860Z | Project Context | Pending Review | Run Manager | — |
| 3 | 2026-09-23T21:14:37.190Z | Project Context | Pending Review → Approved | Mohamed Soliman | — |
| 4 | 2026-09-24T14:10:40.759Z | Discovery | Pending Review | Run Manager | — |
| 5 | 2026-09-24T14:58:19.311Z | Test Design | Pending Review | Run Manager | — |
| 6 | 2026-09-24T20:40:27.511Z | Discovery | Pending Review → Approved | Mohamed Soliman | — |
| 7 | 2026-09-25T13:25:50.644Z | Test Design | Pending Review → Approved | Mohamed Soliman | — |
| 8 | 2026-09-25T16:28:13.521Z | Manual Execution | Pending Review | Run Manager | — |

## 5. Declared Gaps

<!-- Anything this run knowingly proceeded without. A gap here must also appear in the Final QA
     Report (reporting §12) — the two must not disagree. -->

| Gap | Stage Affected | Why | Consequence Stated In |
|---|---|---|---|
| _(none declared)_ | | | |

## 6. Execution Safety

<!-- pipeline.md §14. Which policy this run was evaluated under, and what it was authorized to do.
     Filled in by the executing stage (4M / 5A) at preflight — a run that has not reached an
     execution stage legitimately has nothing here, and that absence is stated rather than implied.

     The full records live beside this file:
       metadata/SafetyPreflight.md         the run's mutation footprint, captured before execution
       metadata/SafetyAuthorizations.md    the scoped approvals granted for THIS run only
     This section points at them; it does not duplicate the project policy. -->

| Field | Value |
|---|---|
| Policy ID / version | _(not yet evaluated)_ |
| Policy hash | _(not yet evaluated)_ |
| Preflight | _(not yet run)_ |
| Scoped authorizations | _(none granted)_ |
| Policy blocks | _(none)_ |

**No run-scoped authorization carries beyond this run**, and none of them lifts a `Forbidden`.

## 7. Observability

<!-- pipeline.md §15. This section POINTS at the run's telemetry; it never restates a metric.
     Duplicating a number here would give the run a second, drifting copy of a value that is
     derived from evidence and regenerable at any time.

       metadata/observability/ObservabilityEvents.jsonl   append-only evidence
       metadata/observability/ObservabilityMetrics.json   derived, regenerable
       metadata/observability/ObservabilityReport.md      human-readable
       metadata/observability/ObservabilityDashboard.html self-contained, offline -->

| Field | Value |
|---|---|
| Telemetry schema | v1 |
| Instrumentation | _(no event recorded yet)_ |
| Events | 0 |
| Report / Dashboard | _(not yet generated)_ |

Run `node platform_core/tools/observability/cli.js summary` for the current metrics, and
`… validate` to check the stream is complete. **A metric is never recorded here by hand** — every
number is derived from the event stream, and one typed in would have no evidence behind it.
