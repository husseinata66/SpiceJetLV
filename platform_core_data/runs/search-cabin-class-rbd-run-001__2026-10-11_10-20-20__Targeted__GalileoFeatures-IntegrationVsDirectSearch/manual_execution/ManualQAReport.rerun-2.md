# Manual QA Report — rerun-2 final reconciliation — Galileo Features (Integration vs Direct)

| Field | Value |
|---|---|
| Status | Pending Review |
| Run | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Cycles | 1 = `ManualExecutionResults.md` · 2 = `.rerun-1.md` · 3 = `.rerun-2.md` — all kept as recorded |
| Environment / mode | Staging (classified by Ahmed Ayman) · Headed · two separate browsers, branch read back before every search |
| Safety Preflights | SP-1 (cycle 1), SP-2 (rerun-1), SP-3 (rerun-2) — search only, 0 mutating operations |

## 1. Final case-level results (Run Manager, latest cycle per case)

| Final status | Count | Cases | Deciding cycle |
|---|---|---|---|
| Passed | 4 | TC-GSRCH-011, 012, 013, 020 | rerun-1 (verified) |
| Flaky | 1 | TC-GSRCH-017 | cycle 1 Failed, rerun-1 Passed |
| Failed | 12 | TC-GSRCH-002, 003, 004, 005, 006, 007, 010, 015, 016, 018, 019 | rerun-2 |
| | | TC-GSRCH-021 | rerun-1 |
| Inconclusive | 1 | TC-GSRCH-001 | cycle 1 (not re-executed; see §4) |
| Blocked / Skipped / Not Executed / Excluded | 0 | — | — |
| **Executable scope / Suite total** | **18 / 18** | | |

Run Manager verification: **verified 5 · unverified 0 · contradiction 0**.

## 2. Assertion-level results

| Cycle | Records | Passed | Failed | Not checked | CONFLICT (vs approved Expected/Check) | Self-contradiction |
|---|---|---|---|---|---|---|
| rerun-1 (6 cases) | 31 | 28 | 1 | 2 | 0 | 0 |
| rerun-2 (11 cases) | 73 | 35 | 32 | 6 | 0 | 0 |
| cycle 1 (18 cases) | — | — | — | — | 24 CONFLICT lines | — |

- **Cycle-1 CONFLICTs remain, by design.** That cycle is kept as recorded. 17 of its 18 cases have since been re-executed with valid records (rerun-1 or rerun-2), and the Run Manager's final status uses those. **TC-GSRCH-001 is the only case whose final status still rests on a cycle with conflicting records.**
- **The 6 "Not checked" rows in rerun-2** are TC-006 and TC-007, A5–A7. They compare Cabin/RBD/baggage on fare options found on both branches, and there are none: Integration returned Economy (for Premium) and Business (for First) fares, so no option matched.
- **The 2 "Not checked" rows in rerun-1** are TC-021 A2 and A4. No results came back, so there was nothing to inspect.

**Why the 32 failed assertions in rerun-2 failed** (per row in `ManualExecutionResults.rerun-2.md` §3.1):

| Reason | Rows |
|---|---|
| Fare option sets differ (Integration has more options per flight) | 8 |
| Flight counts or flight sets differ | 13 |
| Integration ignores Premium Economy / First Class, or returns no results for Premium/First RBDs | 8 |
| Business search returns a First-cabin product (both) / cabin name `FirstClass` vs `First` | 1 + 1 |
| Baggage wording only (allowance equal — not a functional mismatch) | 2 — counted as failed only because the approved Check is a strict `equals` on the wording |

## 3. Classification (unchanged policy, updated evidence)

| ID | Classification | Evidence this cycle |
|---|---|---|
| DEF-01 Integration ignores Premium Economy | **Confirmed defect — High** | Reproduced again in rerun-2 (TC-006, 010, 019) |
| DEF-02 Integration ignores First Class | **Confirmed defect — High** | Reproduced again in rerun-2 (TC-007, 010, 018) |
| DEF-08 Multi-City partial RBD blocks Search | **Confirmed defect — Medium** | 4 attempts per branch across cycles 1 and rerun-1 |
| DEF-03 More fare options on Integration | **Pending clarification** (parity difference) | Seen again on every route; Direct = Integration's lowest-priced option per flight |
| DEF-04 Combinations differ / 200-offer limit | **Pending clarification** (parity difference + probable limit) | Round-trip and Multi-City still differ; Integration exactly 200 again |
| DEF-05 Cabin name FirstClass vs First | Observation | — |
| DEF-06 Business search returns a First product | Needs clarification | Seen again (both branches) |
| DEF-07 ET600 as Business/D on Direct | **Intermittent on Direct** — see §5 | 2 of 5 identical searches |
| Baggage wording | Observation | — |
| CAI→JED flight set | Observation — availability moves | cycle 1: 41/41; rerun-2: Integration 41, Direct 49 (8 flights only on Direct) |

## 4. TC-GSRCH-001

- Change CR-1 / IA-576ed7379024 was approved by Ahmed Ayman and applied as suite **rev 3**. It touches TC-GSRCH-001 only: the reload step and the branch-persistence sentence are removed.
- TC-GSRCH-001's **Review was reset to Pending**, the suite header is **Pending Review**, and Stage 3 is **Waiting For Approval**. The other 17 cases are unchanged and keep Review = Approved.
- TC-GSRCH-001 was **not** re-executed and **not** marked Passed. Its cycle-1 result (Inconclusive) is kept as recorded. Running it under rev 3 needs your approval of the revised case first.

## 5. TC-GSRCH-017 (stays Flaky)

The same Multi-City search (CAI→DXB Economy + DXB→JED Business) was run 5 times in total:

| When (UTC) | Cycle | Direct: ET600 (leg 1) | Integration: ET600 |
|---|---|---|---|
| 08:5x | cycle 1 | **Business / D** | Economy / V |
| 09:3x | rerun-1 | Economy / V | Economy / V |
| 10:06:35 | rerun-2 investigation 1 | Economy / V | Economy / V |
| 10:07:15 | rerun-2 investigation 2 | **Business / D** | Economy / V |
| 10:07:53 | rerun-2 investigation 3 | Economy / V | Economy / V |

**What is shown:** the Direct path intermittently returns leg-1 segment ET600 (ADD→DXB) as Business / RBD D for the itinerary ET453+ET600 / ET601+ET462. That is 2 of 5 identical searches. Integration was Economy / V every time.

**What is not known:** the cause. It may be supplier content changing between calls, or a segment-mapping issue on the Direct path. ET600 and ET601 are the same route pair in opposite directions, and the leg-2 cabin is Business. This is a hypothesis, not a finding.

TC-017 therefore stays **Flaky**. It would normally be raised as a defect once the cause is confirmed.

## 6. Unresolved

1. **Stage 3 rev 3** — waiting for your approval of TC-GSRCH-001. After that, it can be executed in a new cycle.
2. **TC-GSRCH-001's final status** still rests on cycle 1, which has conflicting records.
3. **TC-GSRCH-017** — Flaky; the cause of the intermittent Direct result is not established.
4. **DEF-03, DEF-04, DEF-06** — business or Integration-team clarification needed.
