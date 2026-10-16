# Manual Execution Summary — search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity

| Field | Value |
|---|---|
| Status | Pending Review |
| Stage | 4M — Manual Execution (terminal) |
| Execution mode | Headed |

## 1. Execution Summary

18 approved TC-GCSP cases were executed on 2026-10-11 against http://192.168.1.210/ using **Check Supplier only**, comparing the Galileo Integration branch (`NDC1_Ahmed Ayman`, NDCGal) with the Direct branch (`ahmed ayman`, Galileo).

| Passed | Failed | Blocked | Skipped | Not Executed | Inconclusive | Excluded |
|---|---|---|---|---|---|---|
| 1 | 8 | 3 | 0 | 0 | 6 | 0 |

**What the request/response view adds to run-001:**
- **DEF-01 and DEF-02 are located at the request boundary.** For the same UI criteria, the platform's own request is identical on both branches (`cabinClass` 2 for Premium Economy, 4 for First). But the request sent to the Integration Layer carries `Economy` for Premium Economy and `Business` for First, while the Direct request carries the selected cabin. The wrong cabin is therefore already in the NDCGal request, as the platform back end reports it (BND-04). What the Integration Layer then sends to Galileo is not observable (BND-03).
- **Extra fare options on Integration (DEF-03) follow the upsell request.** The Integration request always sends `ReturnUpsellFare="true"` although the platform request says `isUpSelling: false`, and its responses carry `UpsellBrand` elements. Every extra Integration option on a matched flight is within the requested Cabin/RBD, so it is recorded as **PC-05 (P-UPSELL)** — a potential explanation, not a confirmed root cause.
- **TC-GCSP-017** (Multi-City, Economy + Business) matched exactly: 61 flights and 61 fare options on both sides. The ET600 Business/D anomaly seen on Direct in run-001 did not recur.
- **3 cases are Blocked by an execution error**, not a mismatch: the Integration path returned `Non-Specified Internal Communication Error` (HTTP 500 from Travelport PP, relayed by the Integration Layer) in C012_C (Business, RBD C), C016 (Multi-City) and C021 (Multi-City, RBD Q on leg 1). Direct answered normally at the same time. Their requests were still captured and judged. A rerun is recommended.

## 2. Delivery Artifacts

| Artifact | Path |
|---|---|
| Manual Execution Results | `manual_execution/ManualExecutionResults.md` (source) |
| Test Results CSV | `manual_execution/ManualTestResults.csv` |
| Manual QA Report | `manual_execution/ManualQAReport.md` (+ `.html`) |
| Evidence | `manual_execution/artifacts/<check>/` — redacted request/response per branch, capture, normalized model, comparison |

## 3. Known Limitations

- Integration Layer → Galileo boundary not observable (BND-03); back-end reported payloads (BND-04).
- Throwaway Playwright control script instead of MCP/BrowserDriver.

## 4. Delivery Completeness

| Check | Result |
|---|---|
| Every approved case has an outcome | Yes — 18/18 |
| RQ and RS outcomes recorded separately | Yes — Results §3.2 |
| Every non-Passed case has a reason with Confirmed IDs or PC references | Yes |
| Evidence redacted and leak-scanned | Yes — 0 leaks |
| Application Context | Not changed — no cross-module dependency proven |
