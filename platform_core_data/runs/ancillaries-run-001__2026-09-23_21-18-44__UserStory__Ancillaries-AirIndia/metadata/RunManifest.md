# Run Manifest — ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Run Folder | `ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Run Scope Type / Run Type | UserStory / UserStory |
| Workflow | unversioned |
| Status | In Progress |
| Created | 2026-09-23T18:18:44.284Z |
| Last updated | 2026-09-28 (Stage 4M begun) |

## 1. Code-State Anchor

<!-- run_manager.md §5.8 — which state of the application under test this run is about. `null` is a
     legitimate value and is stated with its reason: an unversioned target is not an unchanged one. -->

| Field | Value |
|---|---|
| `targetRef` | `bc564a4c8364560b2664de5c4e64ad21c8b70925` |
| Scoped to | repo-wide |
| Captured at | 2026-09-23T18:18:44.284Z |
| Note | git repository at C:/Users/HUSSIENY/Desktop/Ancillaries Airandia |

## 2. Stage Ledger

<!-- One row per stage this run has reached. A stage never reached has NO row — absence means "not
     reached", which is why no row is pre-created as "Not started". -->

| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |
|---|---|---|---|---|---|---|---|
| 3 — Test Design | `TestCases_Ancillaries_AirIndia.md` | 2026-09-28 | Approved (rev 7; 26 Approved / 1 Pending) | Ahmed Alhussieny | 7 | test-design-skill | — |
| 4M — Manual Execution | _(in progress; no terminal deliverable yet)_ | 2026-09-28 | In Progress | Ahmed Alhussieny | — | manual-execution-skill | TC-ANC-002 booking confirmed (PNR `Z33F4Z`); 4 checkpoints + 25 other Approved cases remain — see `PROJECT_STATE.md` §13 |

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
| 1 | 2026-09-23T18:18:44.284Z | — | Run created (`Preparing`) | Ahmed Alhussieny | ad hoc run |
| 2 | 2026-09-28 | 3 | Test Design Approved (rev 7) | Ahmed Alhussieny | 26 of 27 cases Approved; TC-ANC-026 held Pending on FINDING-012 |
| 3 | 2026-09-28 | 4M | Manual Execution begun | Ahmed Alhussieny | HD-SAFETY-006 policy relaxation authorized first (see §6); TC-ANC-002 in progress |

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
| Policy ID / version | `ndc-admin-portal-stg` / 2 (HD-SAFETY-006 relaxation, 2026-09-28) |
| Policy hash | `sha256:28fd9c73b561997058e000dcd32079d5` |
| Preflight | `metadata/SafetyPreflight.md` (38 planned operations; 0 Forbidden; 0 outstanding Approval Required) |
| Scoped authorizations | `metadata/SafetyAuthorizations.json`/`.md` — BOOK, PAYMENT, UPDATE, WALLET_CHARGE, all `SelfCreated`, `Allowed` |
| Policy blocks | _(none — all four actions resolve to Allowed for SelfCreated after HD-SAFETY-006)_ |

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
