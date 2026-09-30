# Run Manifest — run-008__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule

| Field | Value |
|---|---|
| Run Folder | `run-008__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule` |
| Run Scope Type / Run Type | UserStory / UserStory |
| Workflow | unversioned |
| Status | Preparing |
| Created | 2026-09-27T09:13:13.878Z |
| Last updated | 2026-09-27T11:30:39.136Z |

## 1. Code-State Anchor

<!-- run_manager.md §5.8 — which state of the application under test this run is about. `null` is a
     legitimate value and is stated with its reason: an unversioned target is not an unchanged one. -->

| Field | Value |
|---|---|
| `targetRef` | `0000c1e9f51c4c17774a1a842608cd25d9ec2222` |
| Scoped to | repo-wide |
| Captured at | 2026-09-27T09:13:13.878Z |
| Note | git repository at C:/Users/user/Desktop/ReissueAi/agentic-ai-testing-platform |

## 2. Stage Ledger

<!-- One row per stage this run has reached. A stage never reached has NO row — absence means "not
     reached", which is why no row is pre-created as "Not started". -->

| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |
|---|---|---|---|---|---|---|---|
| Test Design | — | 2026-09-27T09:13:20.614Z | Approved | Mohamed Soliman | 2 | — | — |
| Manual Execution | — | 2026-09-27T11:30:39.136Z | Pending Review | — | 0 | — | — |

## 3. Cross-Run Reuse / Source Runs

<!-- pipeline.md §7 "Cross-run reuse" — one row per reused artifact. `Referenced` = read in place
     from the prior run; `Copied` = a stage needed to evolve it, so it was copied in once. -->

| Artifact | Source Run | Mode | Approved in source? | Drift since source |
|---|---|---|---|---|
| manual_execution/ (8 file(s)) | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` | Referenced | NOT approved | moved |

**Lineage:** inheritsFrom / supersedes `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` — see `metadata/lineage.json` (run_manager.md §5.9)


**Drift implication:** `moved` — conclusions inherited from `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` that cover changed paths are **unverified against current code** and must be re-checked before reuse (run_manager.md §5.9 Rule 4).
## 4. Checkpoint History

<!-- Append-only. Every checkpoint transition, in order. A Rejected entry keeps its feedback: the
     revision that followed is what the reviewer asked for. -->

| # | Timestamp | Stage | Transition | Decided By | Feedback / Reason |
|---|---|---|---|---|---|
| 1 | 2026-09-27T09:13:13.878Z | — | Run created (`Preparing`) | Run Manager (refine) | ad hoc run |
| 2 | 2026-09-27T09:13:20.614Z | Test Design | Approved | Mohamed Soliman | — |
| 3 | 2026-09-27T11:30:39.136Z | Manual Execution | Pending Review | Run Manager | — |

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
