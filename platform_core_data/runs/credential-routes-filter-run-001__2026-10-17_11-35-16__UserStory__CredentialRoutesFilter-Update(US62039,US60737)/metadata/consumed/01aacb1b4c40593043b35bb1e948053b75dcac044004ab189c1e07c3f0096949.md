# QA Assessment Report — credential-routes-filter-run-001

| Field | Value |
|---|---|
| Module | `credential-routes-filter` |
| Produced by run | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |
| Project Context | `modules/credential-routes-filter/context/ProjectContext.md` — **Revision 3**, Approved (Rev 3 added the user's answers `PO-CRF-12` … `PO-CRF-15`) |
| Environment | `http://192.168.1.70` (UAT, shared) — account `odeysysadmin` |
| Discovery Mode | Browser automation — Browser Driver, **Headless** (user answer). Safety Preflights `SP-4` and, for the revision, `SP-7` (both read-only) |
| Revision | 2 (in place) — Rev 2 follows the reviewer's revision request of 2026-10-17: re-checked Cancel, read the screen's front-end code for the limit rules, recorded the user's answers |
| Generated | 2026-10-17 |
| Status | **Approved** — Ahmed Ayman (ahmed.ayman@tildetech.ae), 2026-10-17, at the Stage 2 gate. Open items carried to Stage 3 as exploratory: OQ-D6 (part), `ASM-CRF-4` |

## 1. Scope

- **Run Scope Type:** User Story. **Run Type:** User Story (enhancement, CRUD area Update). Strategy: §16 "User Story" — targeted, AC-focused.
- **Stories:** US 62039 (AC 1, LCC limit 50 → 150) and US 60737 (AC 2, airline in the supplier request — **all GDS suppliers, Admin and Portal**, per `PO-CRF-12`/`PO-CRF-13`).
- The change is **not deployed** on this environment. This run records the **current baseline**. It cannot confirm AC 1 or AC 2 themselves.
- **Read-only.** Nothing was saved, edited or deleted.

## 2. Objectives

1. Record how the Credential Routes Filter screen works today.
2. Record today's route limit per supplier type (the AC 1 starting point) and what happens at the limit.
3. Record where the Airlines field appears today (the base AC 2 builds on).
4. Settle the Project Context assumptions from evidence where possible.

## 3. Evidence Sources

| Discovery Mode | In-Scope Areas Covered | Why This Mode |
|---|---|---|
| Browser automation — Browser Driver (Headless) | List, View popup, Add form, Edit form (GDS and LCC states), Cancel navigation | Highest-priority mode |
| Browser automation — reading the JavaScript the app serves | Limit rules, validation messages, supplier types, "All" value, Save/Cancel behaviour | Live probe of the limit was refused (shared-data risk). The code is the next-best source that needs no data change |
| User answers (Human Observation) | AC 2 scope, multi-airline, no approval, "All" counting, 150 rationale | Reviewer's answers at this gate |
| — (none available) | AC 2 request content; post-response filter after AC 2 | Not deployed; server-side, not visible to the browser |

## 4. Modules Explored

| Module | Route(s) | Purpose | Discovery Mode |
|---|---|---|---|
| `credential-routes-filter` | `/master/supplier/credential-routes-filter`, `/add`, `/edit/{id}` | Route White/Black list rules per supplier credential, with optional airlines for GDS suppliers | Browser automation |

**Shared UI components:** searchable dropdowns; server-side airport search (3+ characters, active airports); Airlines multi-select with select-all; grid row actions (view / edit / delete); confirm dialogs.

## 5. Observed Behaviour

| Module | Workflow / Rule | What Was Observed | Evidence Category | Finding ID(s) |
|---|---|---|---|---|
| credential-routes-filter | Rule = one supplier + one credential | List columns: Supplier, Credential Name, Actions. No Status/Approval column | Direct Observation | — |
| credential-routes-filter | **Route limit, GDS-type** | Counter "n / **150**" — Galileo, Amadeus, Sabre, NDCGal, TravelportNdc, AmadeusNDC, AmdNDC, NDCsbr | Direct Observation | — |
| credential-routes-filter | **Route limit, LCC-type** | Counter "n / **50**" — AirArbia, FlyDubai, TravelFusion, EmiratesNdc | Direct Observation | — |
| credential-routes-filter | **Airlines field** | Shown for every GDS-type supplier checked; absent for every LCC-type supplier checked | Direct Observation | — |
| credential-routes-filter | Limit rule in code | `maxRoutes = GDS ? 150 : 50`. Types: LCC 0, GDS 1, **Both 2** | System Response | — |
| credential-routes-filter | **Supplier types (API `supplier-with-cred`)** | 74 suppliers: **55 type 0 (LCC)**, **10 type 1 (GDS)**: Galileo, Amadeus, Sabre, NDCsbr, NDCGal, TravelportNdc, E, AmdNDCaaaa, AmdNDC, AmadeusNDC; **9 type 2 (Both)**: ShuraTech, FlyEgypt, FlyEgyptUAE, ShuraTechGLC, MIK, FlyAdealNDC, ShoraNDC, Spicejet, USBanglaUAE | System Response | — |
| credential-routes-filter | **Both-type on the form** | ShuraTech, FlyEgypt, Spicejet, FlyAdealNDC → "/ 50", no Airlines field (same as LCC) | Direct Observation | — |
| credential-routes-filter | At the limit | Add blocked: **"Maximum {max} routes reached."**; over the limit → Save disabled, "Maximum routes for this supplier is {max}" | System Response | FINDING-004 |
| credential-routes-filter | Supplier change GDS → LCC | Dialog "Supplier Change": limit 150 → 50, routes over 50 removed | System Response | — |
| credential-routes-filter | Airlines | Max **50** airlines selectable. Add loads active GDS airlines; Edit also loads inactive ones | System Response | — |
| credential-routes-filter | Route checks | Same origin/destination refused; duplicate refused; "All → All" refused; route covered by an "All" route refused; adding an "All" route removes the routes it covers | System Response | — |
| credential-routes-filter | "All Airports" | Value `-11`; counts as 1 route (user) | System Response + Human Observation | FINDING-002 |
| credential-routes-filter | Save / Cancel | Save: "Configuration saved/updated successfully", then back to the previous page. Cancel: back to the previous page | System Response + Direct Observation | FINDING-003 |
| credential-routes-filter | Edit | Supplier and credential locked (disabled) | Direct Observation | — |
| credential-routes-filter | Existing data | Galileo/GalileoLive: WHITELIST, CAI→JED, airline EY Etihad. AirArbia/AirArabia Live: WHITELIST, CAI→JED, no airlines | Direct Observation | — |

## 6. Confirmed Behaviour

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| §6 `ASM-CRF-2` — GDS limit is the reference | GDS-type rules allow **150** routes today | Direct Observation + System Response | — |
| §1, US 9 AC 1 — LCC limit "from 50" | LCC-type rules allow **50** routes today | Direct Observation + System Response | — |
| §0 `PO-CRF-10` — LCC = every non-GDS supplier | Code: anything not GDS gets 50. All samples matched | Direct Observation + System Response | — |
| §6 `ASM-CRF-6` — Travelport NDC is GDS | `TravelportNdc` → 150 + Airlines | Direct Observation | — |
| §0 `PO-CRF-15` — no approval step | No approval column; Save goes straight to "saved successfully" in code | Direct Observation + System Response | — |
| §2 regression guard (T3087) — Airlines for GDS only | Matches | Direct Observation | — |

## 7. Assumptions

| ID | Assumption | Why Inferred (not observed) | Evidence Category |
|---|---|---|---|
| D-ASM-2 | The limit counts **routes per rule** (one supplier + credential) | The counter is per form; code counts `routes.length` of one rule | System Response (not live-tested across rules) |
| D-ASM-3 | After deployment the LCC max becomes 150 by changing the `GDS ? 150 : 50` rule | Only today's code was read | Assumption |
| D-ASM-4 | ~~Assumption~~ **Confirmed:** "Both" (type 2) suppliers behave like LCC today (50, no Airlines) | 4 of 9 Both suppliers checked on the form | Direct Observation |
| D-ASM-5 | **After AC 1, "Both" suppliers also go to 150 and keep no Airlines field** | `PO-CRF-10` says every non-GDS supplier is LCC, so Both counts as LCC | Assumption (derived from `PO-CRF-10`) |

## 8. Open Questions

| ID | Question | Why it matters | Original | Annotated (rect) |
|---|---|---|---|---|
| OQ-D6 (part) | Does AC 2 add the airline for "All Airports" routes? (user: not known) | AC 2 expected result for "All" routes | `findings/FINDING-002_…/origin_all_airports.png` | `origin_all_airports.annotated.png` (Q1) |
| OQ-D7 | ~~Which suppliers are "Both"?~~ **Answered from the API: 9 suppliers.** They act as LCC today. Per `PO-CRF-10` they count as LCC, so AC 1 should give them 150 (D-ASM-5). Confirm only if "Both" should be treated differently | Decides whether Both suppliers get AC 1 test cases | — | — |
| OQ-D8 | ~~Will the "Supplier Change" dialog be removed after AC 1?~~ **Answered: yes, it should be removed** (user → Project Context `PO-CRF-16`) | It becomes wrong once LCC is also 150 | — | — |
| `ASM-CRF-4` | Does the post-response airline filter (T3087) stay after AC 2? How is a Blacklist airline sent? (user: "try it / see yourself" — **not possible before deployment**; server-side) | AC 2 expected results | — | — |

## 9. Discovered Risks

| Risk | Business | Technical |
|---|---|---|
| "Supplier Change" dialog still says 150 → 50 after AC 1 (OQ-D8) | Misleading message; routes over 50 could be removed for no reason | Code must change in the same release |
| "Both" suppliers (9) | If the developer changes only the LCC branch, Both may stay at 50 after AC 1 | Rule today is `GDS ? 150 : 50`, which covers Both through the "else" branch |
| Boundary needs 150+ routes on a shared env | Long setup and cleanup | Needs `PO-CRF-7` |
| AC 2 is invisible in the UI | Can only show filtered results, not the request | Needs `PO-CRF-9` |

## 10. Coverage

75% — 3 of 4 in-scope surfaces reached (the form: live, plus the served front-end code for the at-limit rules). AC 2 unreachable (not deployed). Detail: `Coverage_Summary.md`.

## 11. Gaps

| Gap | Project Context says | App shows | Finding |
|---|---|---|---|
| Supplier names | Story/intake names | Different names on this environment — **intended** (user) | FINDING-001 (Rejected) |
| "All Airports" | Not mentioned in the stories | Offered, value -11, counts as 1 route — **intended** (user) | FINDING-002 (Rejected) |
| "Both" supplier type | Only GDS and LCC (`PO-CRF-10`) | A third type "Both" (9 suppliers) behaves as LCC | OQ-D7 (answered) |
| Supplier Change dialog | AC 1 makes LCC = 150 | Dialog hard-codes 150 → 50 | OQ-D8 |

## 12. Recommendations

**Regression Test Candidates** (for Stage 3 to consider — not test cases):
- GDS limit stays 150; Airlines field still hidden for LCC.
- Route checks: same O/D, duplicate, All → All, covered-by-All, All removes covered routes.
- Save disabled over the limit; "Maximum {max} routes reached." at the limit.
- Edit keeps supplier and credential locked; Cancel/Save return to the previous page.
- Airlines max 50; inactive saved airline still shown on Edit.
- Rules with no airline behave as before.

Decide `PO-CRF-7` and `PO-CRF-9` before execution.

## 13. Inputs for Test Design

| Input | Content |
|---|---|
| Findings | FINDING-001 (Rejected — intended naming; mapping Sabre ATPCO→`Sabre`, Sabre NDC→`NDCsbr`, Amadeus NDC→`AmadeusNDC`, Travelport NDC→`TravelportNdc`) · FINDING-002 (Rejected — intended; "All" = -11, counts as 1) · FINDING-003 (Rejected — explained; Cancel = previous page) · FINDING-004 (Test Gap, NHR) |
| Confirmed | `ASM-CRF-1`, `ASM-CRF-2`, `ASM-CRF-6`; `PO-CRF-12` … `PO-CRF-15` (user); baseline LCC = 50, GDS = 150 |
| Refuted | `ASM-CRF-9` (AC 2 now applies to all GDS) |
| Unresolved | `ASM-CRF-4`, OQ-D6 (part); `ASM-CRF-5` Likely; D-ASM-5 (Both → 150, derived) |
| Requirement Gaps needing a coverage decision | "Both" suppliers — cover as LCC per `PO-CRF-10` (D-ASM-5); Supplier Change dialog — must be removed after AC 1 (`PO-CRF-16`) |
| Exact messages for expected results | §5 and `CredentialRoutesFilter_AddEdit.md` §5.1 |
| Baseline values | LCC counter "/ 50" (before) → "/ 150" (after, per AC 1); GDS "/ 150" unchanged |
| Supplier test data (this env) | GDS: Galileo, Amadeus, Sabre, NDCGal, TravelportNdc, AmadeusNDC, NDCsbr. LCC: AirArbia, FlyDubai, TravelFusion, EmiratesNdc. Both: ShuraTech, FlyEgypt, Spicejet, FlyAdealNDC |
