# Manual Execution Summary — search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch

| Field | Value |
|---|---|
| Status | Pending Review |
| Stage | 4M — Manual Execution (terminal) |
| Execution mode | Headed |

## 1. Execution Summary

18 approved test cases were executed on 2026-10-11 against http://192.168.1.210/ (Flight Search, search only). The run compared the Galileo **Integration** branch (`NDC1_Ahmed Ayman`, supplier NDCGal) with the **Direct** branch (`ahmed ayman`, supplier Galileo).

**Final results** (Run Manager, 3 cycles — cycle 1 + rerun-1 + rerun-2; executable scope 18, suite total 18):

| Passed | Flaky | Failed | Blocked | Skipped | Not Executed | Inconclusive | Excluded |
|---|---|---|---|---|---|---|---|
| 4 | 1 | 12 | 0 | 0 | 0 | 1 | 0 |

Verification: **verified 5 · unverified 0 · contradiction 0**. Cycle 1 is unchanged (its 24 CONFLICT lines are kept as history). rerun-1 (TC-GSRCH-011, 012, 013, 017, 020, 021) is in `ManualExecutionResults.rerun-1.md`; rerun-2 (TC-GSRCH-002, 003, 004, 005, 006, 007, 010, 015, 016, 018, 019) is in `ManualExecutionResults.rerun-2.md`. Neither rerun has a CONFLICT. TC-GSRCH-001 is the only case whose final status (Inconclusive) rests on cycle 1; its rev 3 is waiting for Stage 3 approval.

**Confirmed defects:** DEF-01, DEF-02 (High), DEF-08 (Medium). **Pending clarification:** DEF-03, DEF-04 (probable 200-offer limit), DEF-06. **Observations:** DEF-05, baggage wording. **TC-GSRCH-017 stays Flaky:** Direct returned ET600 as Business/D in 2 of 5 identical searches; the cause is unknown. Details: `ManualQAReport.rerun-2.md`.

## 2. Delivery Artifacts

| Artifact | Path | Agrees on every status |
|---|---|---|
| Manual Execution Results | `manual_execution/ManualExecutionResults.md` | Yes (source) |
| Test Results CSV | `manual_execution/ManualTestResults.csv` | Yes — generated from the same result set |
| Manual QA Report | `manual_execution/ManualQAReport.md` (+ `.html`) | Yes |
| rerun-1 Results / CSV / QA Report | `manual_execution/*.rerun-1.*` | Yes — derived from the rerun-1 result set |
| rerun-2 Results / CSV / QA Report (final reconciliation) | `manual_execution/*.rerun-2.*` | Yes — derived from the rerun-2 result set |
| Evidence | `manual_execution/artifacts/` — normalized results per branch, a comparison per search, screenshots for failed searches | — |

## 3. Known Limitations

See ManualQAReport.md §8:
- the environment was classified Staging by Ahmed Ayman (2026-10-11), not by configuration;
- a throwaway Playwright script was used instead of MCP/BrowserDriver;
- Integration probably limits results to 200 offers (not confirmed);
- DEF-07 was seen once and not reproduced in rerun-1;
- TC-GSRCH-001's Expected Result needs a wording fix.

## 4. Recommendations

See ManualQAReport.md §9. **First action:** fix the Integration cabin mapping (DEF-01, DEF-02). Then re-run the affected cases with `/manual-execution-skill re-run TC-GSRCH-006,007,010,018,019`.

## 5. Delivery Completeness

| Check | Result |
|---|---|
| Every approved case has an outcome | Yes — 18/18 |
| Every Failed/Inconclusive case has a write-up | Yes — §3.2 per case, §3.3 per defect |
| Evidence captured or gap stated | Yes — Results §4 |
| CSV has one row per suite case | Yes — 18 rows |
| Coverage from the Traceability Matrix | Yes — QA Report §4 |
| Application Context | Not changed — this run proved no cross-module dependency |
