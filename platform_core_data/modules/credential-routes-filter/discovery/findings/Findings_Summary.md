# Findings Summary — credential-routes-filter-run-001

| Field | Value |
|---|---|
| Run Folder | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |
| Total Findings | 4 |
| Generated | 2026-10-17 |

## Index

| ID | Title | Category | Severity | Confidence | Status | Occurrences | Module | Description (one line) |
|---|---|---|---|---|---|---|---|---|
| FINDING-001 | Supplier names in the app do not match the story/intake names | Observation | N/A | 95% | Rejected (intended — env naming) | 1 | credential-routes-filter | No "Sabre ATPCO"/"Sabre NDC"/"Amadeus NDC" by name; app has Sabre, NDCsbr, AmadeusNDC, AmdNDC — all GDS-type |
| FINDING-002 | Origin/Destination offer "All Airports" | Observation | N/A | 95% | Rejected (intended — stored as id -1/-11) | 1 | credential-routes-filter | Wildcard option, not in the Project Context |
| FINDING-003 | Cancel on Add goes to the Dashboard | UX Issue | Low | 85% | Rejected (explained — Cancel = back to previous page) | 2 | credential-routes-filter | Dashboard only when /add was opened by URL from the Dashboard |
| FINDING-004 | Route-limit boundary and AC 2 not observable | Test Gap | N/A | 100% | Needs Human Review | 1 | credential-routes-filter | Not deployed; boundary needs 50+ draft routes on a shared env |

## Breakdown

**By Severity:** 0 Critical · 0 High · 0 Medium · 1 Low · 3 N/A
**By Category:** Observation 2 · UX Issue 1 · Test Gap 1
**By Status:** Needs Human Review 1 · Rejected 3
**By Module:** credential-routes-filter 4

## Evidence Packages

| Finding ID | Evidence Package | Evidence Files |
|---|---|---|
| FINDING-001 | `findings/FINDING-001_GdsSupplierNamesDifferFromStory/` | 4 + metadata |
| FINDING-002 | `findings/FINDING-002_AllAirportsWildcardOption/` | 2 + metadata |
| FINDING-003 | `findings/FINDING-003_CancelGoesToDashboard/` | 1 + metadata |
| FINDING-004 | `findings/FINDING-004_LimitAndAc2NotObservable/` | metadata only (Test Gap floor) |
