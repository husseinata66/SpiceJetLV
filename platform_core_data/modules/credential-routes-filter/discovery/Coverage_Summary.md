# Coverage Summary — credential-routes-filter-run-001

| Field | Value |
|---|---|
| Module | `credential-routes-filter` |
| Produced by run | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |

## 1. Coverage

**75%** — basis: 3 of the 4 in-scope surfaces in Project Context §2 reached = 75%.
The four: (1) LCC route limit on the form, (2) GDS route limit on the form, (3) Airlines field / Update form,
(4) AC 2 search request. (1)–(3) live; the at-limit behaviour of (1)–(2) from the served front-end code (System Response).
(4) is unreachable: not deployed. A count, not a judgment of sufficiency.

## 2. Visited Screens

| Screen / URL | Module | Discovery Mode | Snapshot Artifact |
|---|---|---|---|
| List + View popup `/master/supplier/credential-routes-filter` | credential-routes-filter | Browser automation (Browser Driver, Headless) | `discovery/CredentialRoutesFilter_List.md` |
| Add `/…/add` and Edit `/…/edit/{id}` — GDS and LCC states | credential-routes-filter | Browser automation (Browser Driver, Headless) | `discovery/CredentialRoutesFilter_AddEdit.md` |

## 3. Visited Components

| Component | Where Exercised | Discovery Mode |
|---|---|---|
| Side menu (Master → Supplier) | Navigation | Browser automation |
| Searchable dropdown (supplier, credential) | List search, Add/Edit | Browser automation |
| Airport search dropdown (server search, 3+ chars) | Add/Edit routes | Browser automation |
| Airlines multi-select with select-all | Add/Edit (GDS only) | Browser automation |
| Grid row actions (eye / pencil / trash) | List | Browser automation (trash not clicked) |

## 4. Skipped Areas

| Area | Module | Why Skipped | Discovery Mode Available |
|---|---|---|---|
| Save Configuration, Delete | credential-routes-filter | Mutating; no grant (`PO-CRF-7`) | Browser automation |
| Flight search results (AND logic with Airport list / Restricted Airlines) | search-and-booking | Out of scope here; the AC 2 change is not deployed, so today's search shows the old behaviour | Browser automation |
| Supplier `AmdNDCaaaa` type | credential-routes-filter | Looks like test data; time-boxed | Browser automation |

## 5. Blocked Areas

| Area | Module | What Blocked It | Recovery Attempted (§21) | Discovery Mode |
|---|---|---|---|---|
| Route-limit boundary — **live** (50th/51st LCC route) | credential-routes-filter | Filling 50+ draft routes on a shared env refused by the session permission check | **Fell back to reading the served front-end code** for this area (§21) — rules and messages recorded in `CredentialRoutesFilter_AddEdit.md` §5.1 | Browser automation (code read) |

## 6. Unreachable Areas

| Area | Module | Why Unreachable | Finding / Open Question ID |
|---|---|---|---|
| AC 1 new limit (LCC 150) | credential-routes-filter | Not deployed | FINDING-004 |
| AC 2 airline in supplier request | credential-routes-filter | Not deployed; not visible in UI | FINDING-004 |

## 7. Roll-Up

| Status | Count |
|---|---|
| Visited Screens | 2 (4 states) |
| Visited Components | 5 |
| Skipped | 3 |
| Blocked | 1 |
| Unreachable | 2 |

**By Discovery Mode:** Browser automation (Browser Driver, Headless) — all visited entries.
