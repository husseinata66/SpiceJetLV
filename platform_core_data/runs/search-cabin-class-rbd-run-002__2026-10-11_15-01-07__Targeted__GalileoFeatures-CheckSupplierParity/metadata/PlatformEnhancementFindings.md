# Platform Enhancement Findings — search-cabin-class-rbd-run-002

| Field | Value |
|---|---|
| Status | Open — recorded only, not implemented |
| Recorded | 2026-10-11, at the request of Ahmed Ayman |
| Found while | Applying Project Context rev 3 (shared file) for run-002 |

## PE-01 — Historical Run Verification Against Versioned Artifacts

**Problem.** A shared artifact (here the Supplier Feature's `ProjectContext.md`) has one file, edited in place. When it is updated and approved for a newer run, an older, already-approved run can no longer pass verification:

- run-001 approved Stage 1 against Project Context rev 2 (sha256 `350d3c17…2999`).
- run-002 approved rev 3 (sha256 `098b2ff9…30ab`) in the same file.
- `state verify 1` on run-001 now reports *NOT verified — modified after approval*. Nothing about run-001 changed, and its approved rev 2 is still kept, byte for byte, in `run-001/metadata/approved/350d3c17….md`.

So a run that was correctly approved looks invalid only because a later run moved the shared file forward. The only way to clear it today would be to re-approve or modify run-001, and both would rewrite history.

**Expected behaviour.** A previously approved run is verifiable against the **exact revision and hash approved for that run**:

1. Verify the run's approved snapshot (`metadata/approved/<sha>.md`) against its recorded hash.
2. When the live file differs, report the run as **Verified against its approved revision (historical)**, not as invalid. Name the newer revision and the run that approved it (an approved change request bound to the new hash).
3. Report **stale** only when no approved snapshot exists for the run, or the snapshot itself fails its hash.
4. Keep "the live file has moved on" as information a reader can see. A new run still uses the current revision.

**Scope.** Run Manager verification (`state verify`, `state plan` revalidation) for every shared artifact: Project Context, Test Design suite, Traceability Matrix and Coverage Report.

**Not done now.** Per Ahmed Ayman's instruction, this is recorded only; nothing was implemented, and run-001 was not changed to clear its status.

**Related (PE-01).** In this session, run-002's change request CR-1 was bound to the rev 2 hash. Rev 2 was on disk when CR-1 was recorded, so CR-2 was recorded for the rev 3 content. A tool that showed which content hash an impact decision binds to, before recording it, would have prevented this.

---

# Platform Tooling Bugs

## PTB-01 — `test_suite_export/cli.js --help` runs a full export

| Field | Value |
|---|---|
| Status | Open — recorded only, not fixed (per Ahmed Ayman, 2026-10-11) |
| Component | `platform_core/tools/test_suite_export/cli.js` |
| Severity | Medium — a help request writes files |

**What happens.** `parseArgs` accepts any `--flag` and does not reject unknown ones. `--help` is not a recognised option, so it is ignored and the CLI runs its default action: it exports every active module and rewrites each module's `TestCases_*.xlsx`.

**Seen.** On 2026-10-11 at 12:13:46Z (15:13:46 local), running `cli.js --help` rewrote `modules/agency/test_design/TestCases_Agency.xlsx` and `modules/branch/test_design/TestCases_Branch.xlsx`.
- The data cells were the same as HEAD. The current exporter added three header cells (Requires, Supplier Rule, Assertions).
- Both files were restored from HEAD the same day. A copy of the rewritten files is kept in the session scratchpad.

**Why it matters.** A reviewer's lifecycle decisions made in a workbook and not yet imported (`--import-lifecycle`) would be lost without warning.

**Expected.** `--help` / `-h` prints usage and exits 0, writing nothing. An unknown flag is an error (exit 2) and writes nothing. The run_manager CLI has the same pattern: its bare `--help` printed a generated folder name instead of usage. Its `new` verb also ignored `--dry-run` and created a run.

---

# Platform Enhancements (continued)

## PE-02 — Structured "Pending Parity Clarification" outcome

| Field | Value |
|---|---|
| Status | Open — recorded only, not implemented (per Ahmed Ayman, 2026-10-11) |
| Component | Run Manager (`testStatus.js`, `executionHistory.js`), Manual QA Report model |

**Today.** A case with no failed assertion but unresolved parity differences is recorded as `Inconclusive`. Its reason starts with `Pending Parity Clarification: PC-…`, and the PC register lives in the QA Report. A scratchpad check on 2026-10-11 showed the Run Manager keeps that Inconclusive, with no conflict, even when every assertion verifies. This is accepted as sufficient for run-002.

**Gap.** "Inconclusive — pending clarification" cannot be told apart, by the platform itself, from "Inconclusive — not observable" or "Inconclusive — missing evidence". Only the free-text reason separates them. There is also no structured link from a case to its PC items, and no record of when a clarification is resolved.

**Expected.**
- A structured reason category for Inconclusive (for example `pending-clarification`, `not-observable`, `missing-evidence`), reported apart in counts and health.
- PC items as records with ID, case, group (RQ or RS), mechanism, both values, evidence, open question and resolution.
- Per-group (RQ/RS) outcomes read from the results file.

## PE-03 — The Stage 3 gate treats every suite in a scope as every run's Stage 3

| Field | Value |
|---|---|
| Status | Open — recorded only, not implemented |
| Component | `run_manager/stageGate.js` (`upstreamArtifacts`, case '3') |

**What happens.** The 4M entry gate takes **every** `TestCases_*.md` in the scope's `test_design/` as required Stage 3 input. run-002 executes only its approved companion suite, `TestCases_SearchCabinRBD_Galileo_CheckSupplierParity.md`. Its 4M gate is still blocked because run-001's suite, `TestCases_SearchCabinRBD_Galileo.md`, reads Pending Review (rev 3, TC-GSRCH-001 change). That holds even with `--scope-items` naming only run-002's 18 cases, which the gate proved independent.

**Expected.** A run's Stage 4M/4A gate requires the suites that run's Stage 3 recorded as checkpoints, or the suites containing its scope items. It should not require every suite in the folder. Another run's pending suite would then be reported, not blocking.
