<!--
TEMPLATE — Run Manifest (per-run orchestrator state, all stages)
Renders to: platform_core_data/runs/{{RUN_FOLDER}}/metadata/RunManifest.md
Authority:  workflows_and_pipelines/pipeline/pipeline.md §7 (fields, Cross-run reuse),
            §5.3.1 #7 (Invocation Path), run_manager.md §6 (metadata/ is always created)

**This is the pipeline orchestrator's own source of truth for "where are we right now."** A human or
orchestration tool consults it before invoking the next stage.

Created at run creation (Step 1 of every workflow), then appended to as each stage completes and each
checkpoint resolves. Unlike a stage artifact it is *expected* to change many times during a run — it
records the sequence, while git holds the history of each change.

Three notes on why fields exist:
- **Revision count replaced version suffixes.** Artifacts are one file edited in place — no `.vN`,
  no duplicate "final" copy (§7). The count is how many times the reviewer's file was revised.
- **Invocation Path** distinguishes a stage reached through the pipeline from one called directly, and
  a direct call that ran degraded (declared missing inputs) from one that had everything.
- **Source Run** is the structural slot for §7's "Cross-run reuse" requirement — that a run reusing an
  earlier run's artifact "records the source run in its own Run Manifest." Before this template that
  obligation had no field to live in.
-->

# Run Manifest — {{RUN_FOLDER}}

| Field | Value |
|---|---|
| Run Folder | `{{RUN_FOLDER}}` |
| Run Scope Type / Run Type | {{RUN_SCOPE_TYPE}} / {{RUN_TYPE}} |
| Workflow | {{WORKFLOW}} <!-- first_run / user_story_run / bug_fix_run / unversioned (ad hoc) --> |
| Status | {{STATUS}} <!-- Execution Status enum, run_manager.md §8 --> |
| Created | {{CREATED_TIMESTAMP}} |
| Last updated | {{UPDATED_TIMESTAMP}} |

## 1. Code-State Anchor

<!-- run_manager.md §5.8 — which state of the application under test this run's conclusions are about.
     Carried from run.json; restated here because this is the file a reviewer opens to ask "can I still
     trust this run?". `null` is a legitimate value and is stated as such, never left blank: an
     unversioned target is not the same as an unchanged one. -->

| Field | Value |
|---|---|
| `targetRef` | {{TARGET_REF}} |
| Scoped to | {{TARGET_REF_SCOPE}} <!-- in-scope paths; empty = repo-wide --> |
| Captured at | {{TARGET_REF_CAPTURED_AT}} |
| Note | {{TARGET_REF_REASON}} <!-- why it is what it is, including why null --> |

## 2. Stage Ledger

<!-- One row per stage this run has reached. A stage that was never reached has no row — absence means
     "not reached", which is why no row is ever pre-created as "Not started".

     Checkpoint status: Pending Review / Pending Automation Approval / Approved / Rejected (§7)
     Invocation Path:   Pipeline / Direct / Direct (degraded)   (§5.3.1 #7) -->

| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |
|---|---|---|---|---|---|---|---|
| {{STAGE}} | [{{ARTIFACT_NAME}}]({{ARTIFACT_PATH}}) | {{TIMESTAMP}} | {{CHECKPOINT_STATUS}} | {{REVIEWER}} | {{REVISION_COUNT}} | {{INVOCATION_PATH}} | {{INSTRUCTION}} |

## 3. Cross-Run Reuse / Source Runs

<!-- §7 "Cross-run reuse" — a run that reuses an earlier run's approved artifact references it BY PATH
     and records the source run HERE. It does not copy the file in.

     `Mode` distinguishes the two cases §7 defines:
       Referenced — read in place from the prior run; nothing was copied
       Copied     — a stage needed to EVOLVE the artifact, so it was copied into this run ONCE, at that
                    point, and this row records that the copy's origin was the prior run

     For a refinement run (run_manager.md §5.9) this section restates what metadata/lineage.json holds
     structurally; lineage.json is authoritative, this is the human-readable view.

     Omit this section entirely on a run that reuses nothing. -->

| Artifact | Source Run | Mode | Approved in source? | Drift since source |
|---|---|---|---|---|
| {{ARTIFACT}} | `{{PRIOR_RUN_FOLDER}}` | {{MODE}} | {{SOURCE_APPROVED}} | {{DRIFT_STATUS}} <!-- unchanged / moved / unknown-* per §5.8 --> |

**Lineage:** {{LINEAGE_SUMMARY}}
<!-- e.g. "inheritsFrom / supersedes run-002__… — see metadata/lineage.json" — or "None; this run
     inherits nothing." Never leave blank. -->

**Drift implication:** {{DRIFT_IMPLICATION}}
<!-- MANDATORY when any Drift column is `moved` or `unknown-*`: state which inherited findings or test
     cases are consequently unverified against current code (§5.9 Rule 4). An inherited conclusion is
     never presented as current when drift contradicts it. -->

## 4. Checkpoint History

<!-- Append-only. Every checkpoint transition, in order — this is the audit trail of who decided what
     and when. A Rejected entry keeps its feedback: the revision that followed is what the reviewer
     asked for, and losing the reason makes the revision unreviewable. -->

| # | Timestamp | Stage | Transition | Decided By | Feedback / Reason |
|---|---|---|---|---|---|
| {{N}} | {{TIMESTAMP}} | {{STAGE}} | {{FROM}} → {{TO}} | {{DECIDED_BY}} | {{FEEDBACK}} |
<!-- run-state-events-applied: {{APPLIED_SEQ}} -->

<!-- The marker above is written by the Run Manager only (run_manager.md §8.1): the number of run-state
     events from run.json this table already shows, so a missed update is replayed exactly once. -->


## 5. Declared Gaps

<!-- Anything this run knowingly proceeded without — a degraded direct invocation's missing inputs, a
     skipped stage, an unreachable in-scope area. A gap recorded here is a gap the Final QA Report must
     also carry (reporting §12); the two must not disagree.

     Omit only when the run declared none. -->

| Gap | Stage Affected | Why | Consequence Stated In |
|---|---|---|---|
| {{GAP}} | {{STAGE}} | {{REASON}} | {{WHERE_REPORTED}} |

## 6. Execution Safety

<!-- Added 2026-08-07. `pipeline.md` §14 — which policy this run was evaluated under, and what it was
     authorized to do. Written by the executing stage (`4M` / `5A`) at preflight time.

     A run that never reached an execution stage has nothing to record here, and says so explicitly
     rather than leaving the table blank: "not yet evaluated" and "unknown" are different claims.

     THIS SECTION POINTS; IT DOES NOT DUPLICATE. The full records sit beside this file —
       metadata/SafetyPreflight.md        the run's mutation footprint, captured BEFORE execution
       metadata/SafetyAuthorizations.md   the scoped approvals granted for THIS run only
     and the project policy itself stays in knowledge_base/execution_safety_policy.json. Copying the
     policy in here would give a run a second, drifting copy of a document it does not own.

     The hash is what makes "this run executed under policy v1" a checkable claim rather than an
     assurance: the same input against the same hash always produces the same decision. -->

| Field | Value |
|---|---|
| Policy ID / version | `{{POLICY_ID}}` v{{POLICY_VERSION}} |
| Policy hash | `{{POLICY_HASH}}` |
| Environment evaluated | {{ENVIRONMENT}} |
| Preflight | [`SafetyPreflight.md`](SafetyPreflight.md) — {{MUTATING_COUNT}} mutating operations planned |
| Scoped authorizations | {{AUTH_COUNT}} — [`SafetyAuthorizations.md`](SafetyAuthorizations.md) |
| Policy blocks | {{BLOCKED_COUNT}} operations, {{BLOCKED_CASES}} test cases recorded `Skipped` / reason `Execution Safety Policy` |
| Cleanup-required actions | {{CLEANUP_REQUIRED}} planned · {{CLEANUP_COMPLETED}} completed |

<!-- One row per scoped authorization granted for this run. Omit the table entirely when none were.
     A policy BLOCK is not listed here — a block is not an authorization, and mixing the two would
     make the audit trail read as though something had been permitted. -->

| Authorization | Action | Ownership | Module | Approved by | Approved at |
|---|---|---|---|---|---|
| `{{AUTH_ID}}` | {{ACTION}} | {{OWNERSHIP}} | {{MODULE}} | {{APPROVED_BY}} | {{APPROVED_AT}} |

**No run-scoped authorization carries beyond this run**, and none of them lifts a `Forbidden`
(`pipeline.md` §14.5). A future run asks fresh.

## 7. Observability

<!-- Added 2026-08-07. `pipeline.md` §15 — the run's telemetry, and how complete it is.

     THIS SECTION POINTS; IT DOES NOT RESTATE A METRIC. The numbers live beside this file and are
     derived from the event stream, regenerable at any time:
       metadata/observability/ObservabilityEvents.jsonl     append-only evidence
       metadata/observability/ObservabilityMetrics.json     derived, machine-readable
       metadata/observability/ObservabilityReport.md        human-readable
       metadata/observability/ObservabilityDashboard.html   self-contained, offline
     Copying a metric in here would give the run a second copy that drifts the moment the stream
     grows — and a metric typed by hand has no evidence behind it at all.

     Instrumentation is one of: Fully Instrumented / Partially Instrumented / Not Instrumented.
     `Partially Instrumented` is not a lesser version of complete — it means some telemetry is
     missing and the metrics are therefore not a full picture. Say which, rather than implying it.

     A run created before 2026-08-07 has no telemetry at all and is `Not Instrumented`; no event is
     fabricated for it (HD-OBS-003). Its Historical Derived Metrics, if any, are obtained with
     `observability historical --run <run>` and are never presented as telemetry. -->

| Field | Value |
|---|---|
| Telemetry schema | v{{OBSERVABILITY_SCHEMA_VERSION}} |
| Instrumentation | {{INSTRUMENTATION_STATUS}} |
| Events recorded | {{EVENT_COUNT}} ({{TOOL_EVENTS}} platform-tool · {{SKILL_EVENTS}} skill) |
| Unclosed spans | {{UNCLOSED_SPANS}} <!-- each reported Incomplete; none receives a duration --> |
| Report / Dashboard | [`ObservabilityReport.md`](observability/ObservabilityReport.md) · [`ObservabilityDashboard.html`](observability/ObservabilityDashboard.html) |

**Platform-tool and Skill events are different reliability classes** and are counted separately above.
A platform-tool event is emitted by code as a side effect of the work and cannot be forgotten; a Skill
event is emitted because a specification requires it, so its presence is reliable but **its absence
proves nothing** (`pipeline.md` §15.4).

**Token usage and cost are `Unavailable`** on every run, for the reason recorded in the Observability
Report — never `0`, and never estimated.

## 8. Module Artifacts Consumed

<!-- Which revision of each module / Feature / Supplier artifact this run consumed, at which stage —
     from run.json `moduleArtifactRefs[]`, written by the Run Manager at each stage start (pipeline.md §7).
     A run stays reproducible after the module moves on only because this records what it read. -->

| Stage | Artifact | Upstream stage | Header | Integrity | Fingerprint | Consumed at |
|---|---|---|---|---|---|---|
| {{STAGE}} | `{{ARTIFACT}}` | {{UPSTREAM_STAGE}} | {{HEADER}} | {{INTEGRITY}} | `{{SHA256_12}}` | {{TIMESTAMP}} |
