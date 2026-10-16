# Run Manifest — search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity

| Field | Value |
|---|---|
| Run Folder | `search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity` |
| Run Scope Type / Run Type | Targeted / Targeted |
| Workflow | unversioned |
| Status | Waiting For Approval |
| Created | 2026-10-11T12:01:07.492Z |
| Last updated | 2026-10-11T13:13:39.761Z |

## 1. Code-State Anchor

<!-- run_manager.md §5.8 — which state of the application under test this run is about. `null` is a
     legitimate value and is stated with its reason: an unversioned target is not an unchanged one. -->

| Field | Value |
|---|---|
| `targetRef` | `7d272cdcd21a5e8844a0c31b24a450ca13f6f3e0` |
| Scoped to | repo-wide |
| Captured at | 2026-10-11T12:01:07.492Z |
| Note | git repository at E:/Projects/agentic-ai-testing-platform |

## 2. Stage Ledger

<!-- One row per stage this run has reached. A stage never reached has NO row — absence means "not
     reached", which is why no row is pre-created as "Not started". -->

| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |
|---|---|---|---|---|---|---|---|
| Stage 1 — Project Context | [ProjectContext.md](platform_core_data/supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md) | 2026-10-11T13:13:39.761Z | Approved | Ahmed Ayman | 0 | Direct | Context rev 3: Check Supplier Request/Response Parity scope (IA-83965c75d868) |
| Stage 3 — Test Design | [TestCases_SearchCabinRBD_Galileo_CheckSupplierParity.md](platform_core_data/supplier-features/search-cabin-class-rbd/suppliers/galileo/test_design/TestCases_SearchCabinRBD_Galileo_CheckSupplierParity.md) | 2026-10-11T13:13:39.761Z | Approved | Ahmed Ayman | 0 | Direct (degraded) | Companion suite: Check Supplier Request/Response Parity (TC-GCSP-001..021); Stage 2 not run by agreement (search-only parity scope) |
| Stage 4M — Manual Execution | [ManualExecutionSummary.md](platform_core_data/runs/search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity/manual_execution/ManualExecutionSummary.md) | 2026-10-11T13:13:39.761Z | Pending Review | — | 0 | Direct | Check Supplier Request/Response Parity — 18 TC-GCSP cases, Headed, two isolated sessions |

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
| 1 | 2026-10-11T12:01:07.492Z | — | Run created (`Preparing`) | Run Manager | ad hoc run |
| 2 | 2026-10-11T12:01:25.043Z | — | impact CR-1 approved for supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md (blocking) | Ahmed Ayman | Context rev 3: Check Supplier Request/Response Parity scope (additions only); approved by Ahmed Ayman 2026-10-11 |
| 3 | 2026-10-11T12:04:02.621Z | Stage 1 — Project Context | Stage 1: Not Started → Running (Direct); run Preparing → Running | Ahmed Ayman | — |
| 4 | 2026-10-11T12:04:02.825Z | Stage 1 — Project Context | Stage 1: Running → Waiting For Approval (Pending Review); run Running → Waiting For Approval | Run Manager | — |
| 5 | 2026-10-11T12:04:30.565Z | — | impact CR-2 approved for supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md (blocking) | Ahmed Ayman | Context rev 3 as approved by Ahmed Ayman 2026-10-11 (same change as IA-83965c75d868). Re-recorded because CR-1 was bound to the rev 2 content by mistake. |
| 6 | 2026-10-11T12:04:30.854Z | Stage 1 — Project Context | Stage 1: Waiting For Approval → Completed (Approved); run Waiting For Approval → Running | Ahmed Ayman | — |
| 7 | 2026-10-11T12:12:34.879Z | Stage 3 — Test Design | Stage 3: Not Started → Running (Direct (degraded), degraded) | Ahmed Ayman | — |
| 8 | 2026-10-11T12:16:36.120Z | Stage 3 — Test Design | Stage 3: Running → Waiting For Approval (Pending Review); run Running → Waiting For Approval | Run Manager | — |
| 9 | 2026-10-11T12:28:54.280Z | Stage 3 — Test Design | Stage 3: Waiting For Approval → Completed (Approved); run Waiting For Approval → Running | Ahmed Ayman | — |
| 10 | 2026-10-11T12:48:23.034Z | — | Stage 4M: Safety Preflight SP-1 confirmed (Staging, browser Headed) | Ahmed Ayman (Headed confirmed 2026-10-11; environment classified Staging by Ahmed Ayman) | — |
| 11 | 2026-10-11T12:48:33.567Z | Stage 4M — Manual Execution | Stage 4M: Not Started → Running (Direct) | Ahmed Ayman | — |
| 12 | 2026-10-11T13:13:16.576Z | Stage 4M — Manual Execution | Stage 4M: test outcome recorded from 1 result cycle(s) (failures; first attempt failures) | Run Manager | — |
| 13 | 2026-10-11T13:13:39.761Z | Stage 4M — Manual Execution | Stage 4M: Running → Waiting For Approval (Pending Review); run Running → Waiting For Approval | Run Manager | — |
<!-- run-state-events-applied: 12 -->

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
| 3 | `supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md` | 1 | Approved | verified | `098b2ff91c12` | 2026-10-11T12:12:34.879Z |
| 4M | `supplier-features/search-cabin-class-rbd/suppliers/galileo/test_design/TestCases_SearchCabinRBD_Galileo_CheckSupplierParity.md` | 3 | Approved | verified | `80b850ce2579` | 2026-10-11T12:48:33.567Z |
