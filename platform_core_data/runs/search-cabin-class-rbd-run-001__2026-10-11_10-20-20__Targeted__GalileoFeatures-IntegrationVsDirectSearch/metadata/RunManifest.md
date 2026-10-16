# Run Manifest — search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch

| Field | Value |
|---|---|
| Run Folder | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Run Scope Type / Run Type | Targeted / Targeted |
| Workflow | unversioned |
| Status | Waiting For Approval |
| Created | 2026-10-11T07:20:20.494Z |
| Last updated | 2026-10-11T10:10:22.186Z |

## 1. Code-State Anchor

<!-- run_manager.md §5.8 — which state of the application under test this run is about. `null` is a
     legitimate value and is stated with its reason: an unversioned target is not an unchanged one. -->

| Field | Value |
|---|---|
| `targetRef` | `7d272cdcd21a5e8844a0c31b24a450ca13f6f3e0` |
| Scoped to | repo-wide |
| Captured at | 2026-10-11T07:20:20.494Z |
| Note | git repository at E:/Projects/agentic-ai-testing-platform |

## 2. Stage Ledger

<!-- One row per stage this run has reached. A stage never reached has NO row — absence means "not
     reached", which is why no row is pre-created as "Not started". -->

| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |
|---|---|---|---|---|---|---|---|
| Stage 1 — Project Context | [ProjectContext.md](platform_core_data/supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md) | 2026-10-11T10:10:22.186Z | Approved | Ahmed Ayman | 0 | Direct | Context distilled from human intake scope (no PRD) |
| Stage 3 — Test Design | [TestCases_SearchCabinRBD_Galileo.md](platform_core_data/supplier-features/search-cabin-class-rbd/suppliers/galileo/test_design/TestCases_SearchCabinRBD_Galileo.md) | 2026-10-11T10:10:22.186Z | Pending Review | — | 1 | Direct (degraded) | Discovery skipped by human decision |
| Stage 4M — Manual Execution | [ManualExecutionSummary.md](platform_core_data/runs/search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch/manual_execution/ManualExecutionSummary.md) | 2026-10-11T10:10:22.186Z | Pending Review | — | 0 | Pipeline | 18 approved cases, Headed, two isolated sessions, search only |

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
| 1 | 2026-10-11T07:20:20.494Z | — | Run created (`Preparing`) | Run Manager | ad hoc run |
| 2 | 2026-10-11T07:22:39.652Z | Stage 1 — Project Context | Stage 1: Not Started → Running (Direct); run Preparing → Running | Run Manager | — |
| 3 | 2026-10-11T07:22:39.844Z | Stage 1 — Project Context | Stage 1: Running → Waiting For Approval (Pending Review); run Running → Waiting For Approval | Run Manager | — |
| 4 | 2026-10-11T07:23:47.873Z | Stage 3 — Test Design | Stage 3: Not Started → Blocked | Run Manager | Stage 1 is Waiting For Approval in this run · search-cabin-class-rbd/galileo: Stage 1 supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md — the artifact header reads Pending Review — approval is needed first |
| 5 | 2026-10-11T07:24:01.838Z | Stage 1 — Project Context | Stage 1: Waiting For Approval → Completed (Approved); run Waiting For Approval → Blocked | Ahmed Ayman | — |
| 6 | 2026-10-11T07:24:01.951Z | Stage 3 — Test Design | Stage 3: Blocked → Running (Direct (degraded), degraded); run Blocked → Running | Run Manager | — |
| 7 | 2026-10-11T07:27:41.333Z | Stage 3 — Test Design | Stage 3: Running → Waiting For Approval (Pending Review); run Running → Waiting For Approval | Run Manager | — |
| 8 | 2026-10-11T08:43:52.911Z | Stage 3 — Test Design | Stage 3: Waiting For Approval → Completed (Approved); run Waiting For Approval → Running | Ahmed Ayman | — |
| 9 | 2026-10-11T08:44:24.226Z | — | Stage 4M: Safety Preflight SP-1 confirmed (Staging, browser Headed) | Ahmed Ayman | — |
| 10 | 2026-10-11T08:44:28.333Z | Stage 4M — Manual Execution | Stage 4M: Not Started → Running (Pipeline) | Run Manager | — |
| 11 | 2026-10-11T09:14:04.954Z | Stage 4M — Manual Execution | Stage 4M: test outcome recorded from 1 result cycle(s) (failures; first attempt failures) | Run Manager | — |
| 12 | 2026-10-11T09:15:56.398Z | Stage 4M — Manual Execution | Stage 4M: Running → Waiting For Approval (Pending Review); run Running → Waiting For Approval | Run Manager | — |
| 13 | 2026-10-11T09:30:56.850Z | — | Stage 4M: Safety Preflight SP-2 confirmed (Staging, browser Headed) | Ahmed Ayman (environment classified Staging by Ahmed Ayman, 2026-10-11) | — |
| 14 | 2026-10-11T09:42:36.985Z | Stage 4M — Manual Execution | Stage 4M: test outcome recorded from 2 result cycle(s) (failures; first attempt failures) | Run Manager | — |
| 15 | 2026-10-11T09:54:26.392Z | — | impact CR-1 approved for supplier-features/search-cabin-class-rbd/suppliers/galileo/test_design/TestCases_SearchCabinRBD_Galileo.md (blocking) | Ahmed Ayman | Remove TC-GSRCH-001 step 5 (reload) and the unsupported branch-persistence sentence; no requirement covers persistence (SRCH-01). Approved 2026-10-11 on condition of no unrelated changes. |
| 16 | 2026-10-11T09:56:41.991Z | — | Stage 4M: Safety Preflight SP-3 confirmed (Staging, browser Headed) | Ahmed Ayman (environment classified Staging by Ahmed Ayman, 2026-10-11) | — |
| 17 | 2026-10-11T10:08:35.337Z | Stage 4M — Manual Execution | Stage 4M: test outcome recorded from 3 result cycle(s) (failures; first attempt failures) | Run Manager | — |
| 18 | 2026-10-11T10:09:30.084Z | Stage 3 — Test Design | Stage 3: Completed → Running (reopened); run Waiting For Approval → Running | Ahmed Ayman | Change CR-1 / IA-576ed7379024 approved by Ahmed Ayman 2026-10-11: TC-GSRCH-001 reload step and persistence expectation removed (rev 3); normal Stage 3 review |
| 19 | 2026-10-11T10:09:30.203Z | Stage 3 — Test Design | Stage 3: Running → Waiting For Approval (Pending Review); run Running → Waiting For Approval | Run Manager | — |
<!-- run-state-events-applied: 18 -->

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

## 8. Module Artifacts Consumed

<!-- Which revision of each module / Feature / Supplier artifact this run consumed, at which stage —
     from run.json `moduleArtifactRefs[]`, written by the Run Manager at each stage start. -->

| Stage | Artifact | Upstream stage | Header | Integrity | Fingerprint | Consumed at |
|---|---|---|---|---|---|---|
| 3 | `supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md` | 1 | Approved | verified | `350d3c17c0b9` | 2026-10-11T07:24:01.951Z |
| 4M | `supplier-features/search-cabin-class-rbd/suppliers/galileo/test_design/TestCases_SearchCabinRBD_Galileo.md` | 3 | Approved | verified | `f2ded84b3856` | 2026-10-11T08:44:28.333Z |
