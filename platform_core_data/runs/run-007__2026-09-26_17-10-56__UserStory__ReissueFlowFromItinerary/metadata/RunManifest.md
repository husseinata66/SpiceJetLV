# Run Manifest — run-007__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary

| Field | Value |
|---|---|
| Run Folder | `run-007__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary` |
| Run Scope Type / Run Type | UserStory / UserStory |
| Workflow | user_story_run |
| Status | Preparing |
| Created | 2026-09-26T14:10:56.501Z |
| Last updated | 2026-09-30T12:40:18.116Z |

## 1. Code-State Anchor

<!-- run_manager.md §5.8 — which state of the application under test this run is about. `null` is a
     legitimate value and is stated with its reason: an unversioned target is not an unchanged one. -->

| Field | Value |
|---|---|
| `targetRef` | `bc564a4c8364560b2664de5c4e64ad21c8b70925` |
| Scoped to | repo-wide |
| Captured at | 2026-09-26T14:10:56.501Z |
| Note | git repository at C:/Users/Mohamed/Desktop/New folder (2)/Ai/agentic-ai-testing-platform |

## 2. Stage Ledger

<!-- One row per stage this run has reached. A stage never reached has NO row — absence means "not
     reached", which is why no row is pre-created as "Not started". -->

| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |
|---|---|---|---|---|---|---|---|
| Stage 1 — Project Context | — | 2026-09-26T14:49:20.519Z | Approved | Mohamed Soliman | 0 | — | — |
| Stage 2 - Explorer | — | 2026-09-30T12:25:07.239Z | Pending Review | — | 0 | — | — |
| Stage 3 - Test Design | — | 2026-09-30T12:40:18.116Z | Pending Review | — | 0 | — | — |

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
| 1 | 2026-09-26T14:10:56.501Z | — | Run created (`Preparing`) | Run Manager | via user_story_run |
| 2 | 2026-09-26T14:17:05.481Z | Stage 1 — Project Context | Pending Review | Run Manager | — |
| 3 | 2026-09-26T14:49:20.519Z | Stage 1 — Project Context | Pending Review → Approved | Mohamed Soliman | — |
| 4 | 2026-09-30T12:25:07.239Z | Stage 2 - Explorer | Pending Review | Run Manager | — |
| 5 | 2026-09-30T12:40:18.116Z | Stage 3 - Test Design | Pending Review | Run Manager | — |

## 5. Declared Gaps

<!-- Anything this run knowingly proceeded without. A gap here must also appear in the Final QA
     Report (reporting §12) — the two must not disagree. -->

| Gap | Stage Affected | Why | Consequence Stated In |
|---|---|---|---|
| B9 negative/refund differences never exercised | all | No booking exists whose re-shop is cheaper than the original ticket (OQ-M4). Highest-risk unmapped path in the reissue-mapping scope. | — |
| logs/detail.log never accessible | all | Blocks the CAUSE of FINDING-R06, R07, R11, R13 and R18 - five findings recorded with cause not established. | — |
| Scenarios 1,2,5,6,8b not verified per-passenger at the supplier | all | The R13 post-exchange fulfilment check did not exist until scenario 9. Five getBooking calls outstanding; the defect may sit undetected in a completed exchange. | — |

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
