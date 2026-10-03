# Coverage Report — Agency

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-004__2026-08-17_14-35-25__UserStory__US-4222-UpdateAgency` |
| Revision | 5 |
| Project Context | `modules/agency/context/ProjectContext.md` (revision 4, Approved 2026-08-18) |
| Discovery | `modules/agency/discovery/` (revision 4, Approved 2026-08-18) |
| Total Test Cases | 97 (60 + 37 run-006) |
| Generated | 2026-08-18 |
| Status | **Approved** — Revision 4 (run-006) approved by Mohamed Soliman, 2026-09-25; Revision 3 below keeps its approval. **Revision 5 (2026-10-01, `PO-30`): Pending Review** |
| Approved | 2026-08-18 — Ahmed Ayman, alongside the suite and Traceability Matrix |
| Revision 5 | 2026-10-01 — `PO-30`, the `Reissue` button's six display conditions (Project Context §1.3). 10 Itinerary cases restated and reset to `Pending`; TC-AGENCY-095 … 097 added for the three conditions that had no case. Updated in place in the Revision 4 section below |
| Revision 1–2 | run-001, 2026-08-01 — 53 cases. Approved 2026-08-02. |

# Revision 4 — run-006, Auto Reissue (current)

| Field | Value |
|---|---|
| Produced by run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Project Context | Revision 5 (Approved 2026-09-24) + Stage 2 additions `PO-21` … `PO-26` (approved 2026-09-24) |
| Discovery | `modules/agency/discovery/` QA Report Revision 4 — **Approved** 2026-09-24 |
| New test cases | 33 — TC-AGENCY-061 … 093 (suite total 93; 088 … 093 added 2026-09-25 at the user's request) |
| Pipeline branch | **Manual (4M)**, chosen by the user 2026-09-24 |
| Status | **Approved** — Mohamed Soliman, Stage 3 Human Review gate, 2026-09-25 (drafted before Stage 2 approval at the user's instruction; Stage 2 approved 2026-09-24) |

## 1. Run Scope

**Run Scope Type:** User Story · **Run Type:** User Story · **Story:** *Auto Reissue checkbox — Branch & Agency CRUD*, Agency half, plus the Itinerary effect on Admin and the Portal (`PO-25`). **Strategy (§16, User Story):** at least one case per acceptance criterion and specification save rule, each carried-forward assumption/risk as its own assumption-based case, and no wandering into the Reissue flow itself (`reissue-flow`) or US-4222's field matrix. Designed against agency ProjectContext Revision 5 and the run-006 Discovery.

## 2. Requirements Covered

`PO-15` · `PO-16` · `PO-21` (via `branch`) · `PO-22` (superseded) · `PO-28` (consolidated into `PO-30`) · **`PO-30`** · `PO-29` · `PO-23` · `PO-24` (first sentence superseded by `PO-30`) · `PO-25` · `PO-26` · `PO-27` · spec `S-1`, `S-2`, `S-3`, `S-4`, `S-6`, `S-7`, `S-8`, `S-9` (via `branch`), `S-10`, §4, §5 · XC-01/XC-04 · ASM-021 · ASM-022 · RSK-013 · RSK-014 · Story AC groups *Agency CRUD*, *Admin Impact*, *Portal Impact*, *Permission Precedence*, *Regression & Validation*.

**Requirement coverage: 22 / 22 in-scope requirement rows Covered = 100%** (basis: `TraceabilityMatrix.md` §5.2). 2 Out-of-Scope, 0 Partially Covered, 0 Uncovered, 0 Unknown. **Covered is not the same as runnable:** 6 rows depend on the user (bookings — including the three `PO-30` bookings not yet supplied — and the go-ahead to make a supplier or credential inactive).

## 3. Coverage Matrix

The full matrix is in `TraceabilityMatrix.md` §5.1 (one row per case) and §5.2 (roll-up). At a glance:

| Area | Test Cases |
|---|---|
| Checkbox and picker on the form | 061, 062, 087, 088 |
| Save, approve, read back | 063, 064, 073, 086, 089, 090 |
| Save rules — UI | 065 |
| Save rules — API | 066, 067, 068, 069, 070, 071, 072 |
| Credential boundary / supplier ceiling / clean-up | 074, 075, 091, 092, 093 |
| Admin Itinerary | 076, 077, 078, 082, 083, 084, 085, 095, 096, 097 |
| Portal | 079, 080, 081, 094 |

## 4. Business Rules

The Project Context has no `BR-` IDs; its business rules are the `PO-n` decisions and the specification rules.

| Rule | Test Cases |
|---|---|
| `PO-16` Agency and Branch independent; Agency limited to its Branch's credentials | TC-AGENCY-072, 074, 078 |
| `PO-27` The Branch is the Agency's supplier ceiling | TC-AGENCY-091 (reverse: TC-BR-109) |
| spec §4 An inactive credential is dropped on read; the checkbox stays on | TC-AGENCY-075, 092 (093 exploratory, supplier-level) |
| ~~`PO-28` Button needs the checkbox **and** a matching credential~~ — consolidated into `PO-30` | see `PO-30` |
| **`PO-30`** Button shown only when all six hold: checkbox on (1), PNR credential selected (2), Status Booked **and** "Ticketed Document" bar (3), booked online (4), locked by the current user on Admin (5; no lock on the Portal), reissue-capable GDS (6) *(2026-10-01; Pending Review)* | Shown: TC-AGENCY-076, 079, 081, 096 (after lock). Hidden: (1) 077, 078, 080, 083 · (2) 082 · (3) 084, 094 · (4) 095 · (5) 096 · (6) 097 |
| `PO-23` "Required" on screen, API message on the API | TC-AGENCY-065, 066 |
| `PO-24` Inactive while pending; edit-form Approve *(its "Booked, not the bar" sentence is superseded by `PO-30` (3))* | TC-AGENCY-064 |
| `PO-25` Portal in scope, no lock, no Manual Reissue | TC-AGENCY-079, 080, 081 |
| `PO-26` On-behalf bookings follow the Agency | TC-AGENCY-083 |
| spec §5 (the three Itinerary conditions) | TC-AGENCY-076, 077 |
| `PO-29` Manual Reissue is out of scope for this story | — (asserted by no case, by decision) |

## 5. Test Scenarios

**37 cases:** 30 Atomic · 7 Scenario · 0 E2E. **Priority:** 11 P1 · 18 P2 · 8 P3. 5 assumption-based; 2 exploratory (085, 093).

**Negative Test Generation (§7):**

| Category | Result |
|---|---|
| Empty Values | TC-AGENCY-065, 066 |
| Invalid Inputs | TC-AGENCY-068, 069, 070, 071, 072 |
| Boundary Values | Not Applicable — no length or count limit is stated for the credential list |
| Unicode · Special Characters · Security Inputs | Not Applicable — the feature has no free-text input: a checkbox and a pick-list of existing credential IDs |
| Timeouts | Not Applicable — no timeout behaviour is stated |

**Required Dimensions (§17):**

| Dimension | Result |
|---|---|
| Positive | 061, 062, 063, 073, 076, 079, 088, 089 |
| Validation Rules | 065 – 072 |
| Business Rules | §4 above |
| Error Handling | Each API case asserts the exact message (066, 068 – 072) |
| Permissions | Org-level permission: 076 – 080. Role-level: Not Applicable — one Super Admin account (PC §3) |
| Configuration | The checkbox is the configuration: on (076, 079) and off (077, 080) |
| Regression Impact | 086, 090 (Agency update unaffected, with Auto Reissue off or on). Manual Reissue unaffected: asserted in 077 |
| Integration Behaviour | 074, 078, 083, 091 (Agency ↔ Branch); 092, 093 (Supplier master ↔ Agency) |
| Risk-based Prioritization | Every High-risk row is P1 or P2 (`TraceabilityMatrix.md` §5.4) |
| Exploratory | 085 (pending vs approved value), 093 (inactive supplier) |

## 6. Manual Test Cases

`modules/agency/test_design/TestCases_Agency.md` (+ `.xlsx`, generated). **97 cases** in the suite = 60 (US-4222, unchanged) + 37 (run-006, incl. 095 … 097 added 2026-10-01). Counts agree across the suite header, the Case Index and `TraceabilityMatrix.md` (60 rows in §1 + 37 in §5.1).

## 7. Assumptions

| Test Case | Assumption / Risk | What makes it resolvable |
|---|---|---|
| TC-AGENCY-070 | S-5 inactive credential (RSK-012) | TC-AGENCY-092's inactive credential (the user's go-ahead) |
| TC-AGENCY-075 | Read-time clean-up (RSK-012) | TC-AGENCY-092's inactive credential (the user's go-ahead) |
| TC-AGENCY-083 | `PO-26` on-behalf (user statement) | Booking `NDCEG-BR-F2609242aZ6EJ`, supplied 2026-09-25 |
| TC-AGENCY-084 | ASM-022 | On-hold booking `NDCEG-BR-F251014N1oohh`, supplied 2026-09-25 (Portal side: TC-AGENCY-094) |
| TC-AGENCY-085 | RSK-013 | Running the case and a reviewer decision |
| TC-AGENCY-084 (second half) | `PO-30` (3): Booked but not "Ticketed Document" | A booking `{BOOKED_UNTICKETED_REF}` from the user — **not yet supplied** |
| TC-AGENCY-095 | `PO-30` (4): imported / offline booking | A booking `{OFFLINE_REF}` from the user — **not yet supplied** |
| TC-AGENCY-097 | `PO-30` (6): non-reissue supplier; cannot be isolated from (2) | A booking `{NONREISSUE_SUPPLIER_REF}` from the user — **not yet supplied** |

## 8. Coverage Gaps

| Item | Status | Reason | Smallest thing that unblocks it |
|---|---|---|---|
| spec `S-5` inactive, spec §4 clean-up | Covered, needs setup | Making a credential or supplier inactive changes shared staging data (TC-AGENCY-092/093 set it up) | The user's go-ahead, and a credential/supplier that only the test records use |
| The Reissue flow after the button | Out-of-Scope | Shared scope `reissue-flow` | Its own Stage 1 |
| Role authorization | Out-of-Scope | Single account | A second role's login |
| `PO-30` condition (5) on the Portal | **Closed 2026-10-01** | The user confirmed the lock exists only on Admin; the Portal has no lock (`PO-25`). TC-AGENCY-079 / 081 expect "shown" | — |

**Finding coverage: 5 / 5 dispositioned = 100%** (all documented exceptions: FINDING-013, 014, 015, 016 and FINDING-017 from `branch`). **0 Uncovered Findings.**

## 9. Risks

**High:** TC-AGENCY-072, 076, 077, 078, 079, 080, 083, 091 — the permission effect, precedence and supplier ceiling. **Also High: 092, 093** — they make a supplier or credential inactive on shared staging. **Medium:** real saves on AGN9780 (063, 064, 067, 073, 086), a permanent new record (087), preconditions set up by 092 (070, 075), user bookings needed (083, 084, 095, 097), the Admin lock condition (096), and the unstated pending rule (085). Full register: `TraceabilityMatrix.md` §5.4.

## 10. Recommendations

1. **Run order:** 061 – 062 → 063 → 073 → 076/077 → 096 → 078 → 079/080/081 → 082 → API cases (capture `{AGENCY_SAVE_REQUEST}` during 063) → 064 → 085 → 086 → 088 → 089 → 090 → 091 → (with the user's go-ahead) 092, running 070 and 075 inside its inactive window → 093. It keeps AGN9780's state predictable and ends with AGN9780 off.
2. **Bookings supplied 2026-09-25:** `NDCEG-BR-F2609242aZ6EJ` (on behalf, 083) and `NDCEG-BR-F251014N1oohh` (on hold, 084 and 094).
3. **Decide TC-AGENCY-087 and 088** (each creates a permanent Agency) before execution, or reject them at review.
4. **Exploratory charters:** TC-AGENCY-085 and 093. Record what is seen, and let the reviewer decide.
5. **Decide TC-AGENCY-092/093** (make a supplier or credential inactive on shared staging) before execution.
6. **`PO-30` (2026-10-01):** review the 10 restated cases and the 3 new ones; ask the user for `{OFFLINE_REF}`, `{NONREISSUE_SUPPLIER_REF}` and (optional) `{BOOKED_UNTICKETED_REF}`; and confirm whether the lock condition applies to the Portal.

## 11. Review & Automation

| Column | Pending | Approved | Rejected |
|---|---|---|---|
| Review (37 run-006) | 13 | 24 | 0 |
| Automation (37 run-006) | 37 | 0 | 0 |

**Eligible for Stage 4M now:** 24 run-006 cases (`Review = Approved`); the 13 touched by `PO-30` (076 … 079, 081 … 085, 094, 095 … 097) wait for review. **Eligible for 4A:** none. **Inconsistent pairs among new cases:** none. The 60 earlier cases keep their decisions (suite Case Index lifecycle roll-up).

## 12. Inputs for Both Branches

Present: the suite (Markdown + generated Excel), `TraceabilityMatrix.md` §5 (every new case has Requirement, Discovery, Acceptance Criteria and Run Scope references; Finding and Evidence are N/A with the stated reason), this report, the fixtures and API method (suite §0.3), and the Discovery artifacts they cite. **All satisfied** for Stage 4M: the 33 new cases are `Review = Approved` (2026-09-25).

---

# Revision 3 — run-004 (retained, unchanged)

## 1. Run Scope

| Field | Value |
|---|---|
| Run Scope Type | **User Story** |
| Run Type | **User Story** |
| Source | `knowledge_base/requirements/user_stories/US-4222_Admin_Update_Agency.md` |
| Pipeline branch | **Automation Pipeline** (1 → 2 → 3 → `4A` → `5A` → optional `5H` → `6A`) — changed at Project Context revision 3; run-001 took the Manual branch |
| Designed against | Project Context **revision 4**, Approved 2026-08-18, and Discovery **revision 4**, Approved 2026-08-18 |
| Target environment | `http://192.168.1.70` — STG, shared staging |
| Target ref | `b0a6eb1` |

**Strategy applied (§16 — User Story).** The narrowest and most literal reading: at minimum one case per
enumerated acceptance criterion, and **no wandering into adjacent Agency behaviour the story did not ask
for**. Agency search and Create Agency are exercised only as a means of reaching or building the record
under test; neither has a case of its own. Every carried-forward Assumption and Risk tied to US-4222 is
dispositioned in §7 rather than folded silently into another case.

**Code-state drift, stated rather than implied.** `run_manager drift` reports `moved` — four commits
since this run was anchored. **Every changed path is platform tooling, specification, or this module's
own artifacts; none is the application under test**, which is an external deployment at
`http://192.168.1.70` and is not versioned by this repository. No inherited conclusion is invalidated by
the drift. The application's own state is unversioned, which is why `targetRefAtWrite` is `null` on the
module's stage records — an unversioned target is not an unchanged one, and run-004 therefore
re-observed the form directly rather than trusting run-001's snapshots.

## 2. Requirements Covered

**14 of 14 in-scope requirement groups have at least one test case.** Requirement Coverage is measured
against US-4222's ten acceptance criteria plus its four Expected Outcome actions.

| Requirement ID | Covered by |
|---|---|
| AC-1 — Agency Master, 11 fields | TC-AGENCY-001 … 011, 053, 059 |
| AC-2 — Agency Owner Details | TC-AGENCY-012 … 015 |
| AC-3 — Upload Document | TC-AGENCY-016 … 021, 051 |
| AC-4 — Agency Logo | TC-AGENCY-022, 023, 024, 051 |
| AC-5 — Wonder Travel Sales Contact | TC-AGENCY-025, 026, 027, 028 |
| AC-6 — Bank Account Details | TC-AGENCY-029 … 032 |
| AC-7 — Payment Settings | TC-AGENCY-033 … 039, 058 |
| AC-8 — Product Access Details | TC-AGENCY-040, 041, 042 |
| AC-9 — Airline Supplier credential (PCC) | TC-AGENCY-043, 054, 055, 056, 057, 060 |
| AC-10 — Import PNR Option | TC-AGENCY-044 |
| Expected Outcome — Submit for Approval | TC-AGENCY-045, 046 |
| Expected Outcome — Cancel | TC-AGENCY-047 |
| Expected Outcome — Approve | TC-AGENCY-048, 050 |
| Expected Outcome — Reject | TC-AGENCY-049 |

**Coverage by §8.3's full category set — computed against `Covered` only:**

| Category | Count | Which |
|---|---|---|
| **Covered** | 12 | AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-10, and all four Expected Outcome actions |
| **Partially Covered** | 2 | AC-5 (`Designation` has no surface), AC-9 (two of five fields exist nowhere) |
| **Out-of-Scope** | 6 | `PO-13`'s three controls · Branch-change (`PO-10`) · Role authorization (`PO-1`/`PO-6`/`PO-9`) · Reflection areas (`PO-11`) · Save as Draft (`PO-5`) · adjacent agency flows |
| **Unknown / Unassessed** | 0 | — |
| **Uncovered** | 0 | — |

> **Requirement Coverage: 12/14 = 86% Covered**, with 2 Partially Covered. Out-of-Scope items are not in
> the denominator: the Project Context excludes them by decision, so their absence is not a gap.

**Two figures moved since revision 1, both upward, and both for the same reason** — run-004 replaced
inference with observation:

| | Revision 1 | Revision 3 |
|---|---|---|
| Covered | 10/14 = 71% | **12/14 = 86%** |
| Partially Covered | 3 (AC-5, AC-7, Approve/Reject) | **2** (AC-5, AC-9) |
| Unknown / Unassessed | 1 (AC-9) | **0** |
| Uncovered | 1 (`PO-13`'s three controls) | **0** — now a decided exclusion, not an omission |

## 3. Coverage Matrix

Consolidated from `TraceabilityMatrix.md` §2, presented here for at-a-glance review.

| Requirement | Test Cases | Positive | Negative | Boundary | Inheritance / Integration | Status |
|---|---|---|---|---|---|---|
| AC-1 | 001–011, 053, 059 | 001, 010, 011, 053 | 002, 004, 005, 007, 008, 009, 015 | 004, 006 | 003, 059 | Covered |
| AC-2 | 012–015 | 012 | 013, 014, 015 | — | — | Covered |
| AC-3 | 016–021, 051 | 016, 017, 018, 051 | 019, 020, 021 | — | — | Covered |
| AC-4 | 022, 023, 024, 051 | 022, 051 | 024 | 023 | — | Covered |
| AC-5 | 025, 026, 027, 028 | 025, 026 | 027 | — | 028 | **Partially Covered** |
| AC-6 | 029–032 | 029, 030, 031 | 032 | — | — | Covered |
| AC-7 | 033–039, 058 | 033, 036, 038, 039 | 034, 035, 037, 058 | — | — | Covered |
| AC-8 | 040, 041, 042 | 041 | — | — | 040, 042 | Covered |
| AC-9 | 043, 054, 055, 056, 057, 060 | 043, 057 | 056 | — | 054, 055, 060 | **Partially Covered** |
| AC-10 | 044 | 044 | — | — | — | Covered |
| Submit for Approval | 045, 046 | 045 | 046 | — | — | Covered |
| Cancel | 047 | 047 | — | — | — | Covered |
| Approve | 048, 050 | 048, 050 | — | — | 050 | Covered |
| Reject | 049 | 049 | — | — | — | Covered |

## 4. Business Rules

The Project Context carries no `BR-`prefixed requirement identifiers — it enumerates its scope as
US-4222 acceptance-criteria groups (see `TraceabilityMatrix.md`'s convention note). The business rules
this suite exercises therefore arrive as **PRD cross-cutting requirements** and as **durable
cross-module knowledge items**, and are audited here on their own rather than folded into §2.

| Rule | Source | Statement | Test Cases |
|---|---|---|---|
| XC-01, XC-04 `[V]` | PRD §6 | Creating or updating a governed record does not publish it; the maker submits and the record enters `Pending for approval`. **XC-04 is the one PRD requirement confirming an update path exists at all** | TC-AGENCY-045, 050 |
| XC-02 `[V]` | PRD §6 | A checker Approves or Rejects the pending record | TC-AGENCY-048, 049, 050 |
| XC-03 `[V]` | PRD §6 | Approval and rejection accept a free-text Remarks entry, captured as the audit reason | TC-AGENCY-046, 048, 049 |
| XC-17 `[V]` | PRD §6 | A missing mandatory field reads `Required` | TC-AGENCY-002, 013, 021, 027, 034, 046, 056 |
| XC-18 `[V]` | PRD §6 | Email errors read `Please enter a valid email` | TC-AGENCY-014 |
| XC-19 `[V]` | PRD §6 | Phone errors read `Please enter valid phone number` | TC-AGENCY-008 |
| **XC-20 `[V]`** | PRD §6 | Numeric-only fields state a format message on non-numeric input | **TC-AGENCY-058** — designed to this rule, expected to fail (FINDING-010) |
| GEO-09, SUP-10 `[V]` | PRD §7.3, §7.5 | An update can be cancelled without persisting — a platform-wide pattern, neither instance about Agency | TC-AGENCY-047 |
| ORG-05, ORG-06, ORG-07 `[V]` | PRD §7.2 | The Agency form's sections, its Payment Settings fields, and PCC assignment inherited from Supplier & Branch | TC-AGENCY-001, 033, 043 |
| ORG-08 `[V]` | PRD §7.2 | Agencies are searchable | *(means only — no case, by scope)* |
| SUP-05 `[V]` | PRD §7.5 | A credential configured at supplier level must be visible and assignable at Branch and Agency level | TC-AGENCY-040, 060 |
| PAY-03 `[V]` | PRD §7.6 | Supported instruments are Cash, Wallet, Credit Card, Bank Transfer, plus Banque Misr and Fawry | TC-AGENCY-036 |
| IPN-05 `[V]` | PRD §7.9 | Import PNR must be explicitly enabled for the organisation | TC-AGENCY-044 *(the toggle's persistence only; the refusal belongs to `import-pnr`)* |
| **`BR-006`** | `knowledge/INDEX.md` | The Agency PCC section renders only where the parent Branch carries a supplier with a credential — extends `BR-002` (Branch Supplier Routing is inherited by child Agencies) | TC-AGENCY-054, 060; and the fixture definition itself |
| **`APP-002`** | `knowledge/INDEX.md` | The Payment Option list reflects Master → Payment Gateway → Payment Method; its size is intended cross-module reflection, not agency state | TC-AGENCY-036, 037 — **select by label, never assert a count** |
| **`R-1`, `R-2`** | `branch` module reuse | Probe max length with real keystrokes; read a pre-filled form by polling, never by one fixed-delay sample | TC-AGENCY-004, 006, 035, 058 (keystrokes); every case that reads a populated form (polling) |

## 5. Test Scenarios

**60 cases in one module.** By tier: 55 Atomic · 4 Scenario · 1 E2E.

| Dimension | Cases | Notes |
|---|---|---|
| **Positive scenarios** | 24 | One per acceptance-criteria group, plus per-field persistence cases |
| **Validation rules** | 8 | TC-AGENCY-002, 013, 021, 027, 034, 037, 046, 056 |
| **Business rules** | 16 | §4's table — the maker–checker rules and the inheritance rules |
| **Error handling** | 3 | TC-AGENCY-014 (exact string), 058 (a required message that is absent), 037 |
| **Permissions** | 0 | **Not Applicable — removed as a test target by `PO-1`, `PO-6` and `PO-9`.** Role authorization belongs to the future Role CRUD module. This is a decided exclusion, recorded so the gap stays visible rather than reading as coverage |
| **Configuration** | 1 | TC-AGENCY-044 — the Import PNR switch. `PO-13`'s three switches are out of scope |
| **Regression impact** | 6 | TC-AGENCY-002, 019, 020, 023, 053, 058 — proactive impact assessment, distinct from Finding-derived regression |
| **Integration behaviour** | 5 | TC-AGENCY-028, 040, 054, 055, 060 — the Branch → Agency and Supplier → Agency cascades, where undocumented coupling surfaces |
| **Risk-based prioritization** | — | 15 × P1 · 20 × P2 · 24 × P3 · 0 × P4. Every High-risk item in `TraceabilityMatrix.md` §4 carries P1 or P2; no High-risk requirement is left with only a low-priority case |
| **Exploratory recommendations** | 5 charters | §10 — not fabricated fixed-outcome cases |

**Negative Test Generation Engine (§7) — every category evaluated, none silently skipped:**

| Category | Cases | Or the reason it does not apply |
|---|---|---|
| **Invalid Inputs** | 004, 005, 008, 009, 014, 015, 032, 035, 058 | — |
| **Boundary Values** | 004, 006, 023 | — |
| **Empty Values** | 002, 013, 021, 027, 034, 037, 046, 056 | — |
| **Unicode** | 005 (`وكالة`) | Covered as one value in the character-set case rather than as a separate case, because the field's allowed set is one rule |
| **Special Characters** | 005, 007, 053 | `053` covers the space, which the reported rule excludes but existing data requires |
| **Security Inputs** | 007, 020 | **Now executable as designed.** run-004 deliberately deferred payload probes rather than typing them into shared record 949; the self-created fixture is the record they belong on |
| **Timeouts** | 0 | **Not Applicable — no timeout condition can be induced** from a browser session against a shared environment, and no requirement states timeout behaviour. Unchanged from revision 1 |

## 6. Manual Test Cases

Full case content lives in the suite documents, never restated here.

| Artifact | Path | Cases |
|---|---|---|
| Manual Test Suite — Markdown | `modules/agency/test_design/TestCases_Agency.md` | 60 |
| Manual Test Suite — Excel | `modules/agency/test_design/TestCases_Agency.xlsx` | 60 |

**Count reconciliation (§9.1 #6) — three sources, counted from the files:**

| Source | Count |
|---|---|
| Suite document's own Total Test Cases | 60 |
| `TraceabilityMatrix.md` §1 rows | 60 |
| `test_suite_export --check` per-module count | 60 |

✅ **All three agree.** The workbook was generated from the Markdown by
`node platform_core/tools/test_suite_export/cli.js` after the final edit — never hand-written and never
hand-edited. `--check` reports 60 cases with **no missing-field and no duplicate-ID warnings**; its only
warnings are the eight inconsistent lifecycle pairs in §11, which are human decisions to resolve, not
defects in the Markdown.

**No file in this module groups several requirement groups**, so no `--sheet-name` override is used; the
single workbook's tab is named for the module.

## 7. Assumptions

Assumption-based cases carried forward from the Project Context, plus the disposition of every Project
Context assumption not converted into a case. **Nine dispositions changed at revision 3**, each marked.

| Project Context ID | Statement | Disposition in this suite |
|---|---|---|
| ASM-009 | PDF-only and 2 MB constraints are story-sourced and never verified | **Cases** — TC-AGENCY-019, 020, 023, 024. Unchanged |
| ASM-012 | Must documents/logo be re-uploaded on every update? | **Answered by `PO-7` and verified by run-004.** TC-AGENCY-051's `Assumption-based` tag is **removed** — a stored document and logo were both present on form load. What the case still establishes is that a *submission* succeeds without re-upload |
| ASM-013 | AC-9 table shape ambiguity | **Answered by observation, not inference.** `PO-8` converted it into a Stage 2 task; run-004 recorded the exact layout. Product Access is a five-column table (TC-AGENCY-040) and the PCC section is three controls per supplier tab (TC-AGENCY-043, 060). **Was "moot — the section is absent"** |
| ASM-016 | Does changing Branch overwrite inherited values? | **Retired by `PO-10`** — Branch is not editable from this form. TC-AGENCY-052 is retired; TC-AGENCY-059 confirms the read-only property instead. **Was a Deferred case** |
| ASM-018 | Are the story's message strings literal? | **Superseded by `PO-12` and satisfied with literals.** run-004 measured 23 `Required` instances plus `Please select at least one supplier.` and `Please enter a valid email`. Cases assert those exact strings. **Was "resolved as framed"** |
| ASM-014 | Authoritative Payment Option set unknown | **Answered by `APP-002`** — the list reflects Payment Method master data and its size is intended reflection. TC-AGENCY-036 selects by label and asserts no count. The master's own correctness is `payment-gateway`'s |
| ASM-011 | `Cancel` "role update process" wording | **Answered by `PO-6` and verified.** TC-AGENCY-047 tests the agency behaviour; the wording is a reference to role authorization, not a qualifier on Cancel |
| ASM-017 | Are the Reflection areas in scope? | **Answered by `PO-11`** — impact-awareness boundaries only. No case. **Was "pending DOQ-11"** |
| ASM-004, ASM-015 | Is self-approval prohibited? Which role may approve? | **Deferred to Role CRUD by `PO-9`.** TC-AGENCY-048, 049, 050 are **unblocked** but narrowed: they assert workflow behaviour and resulting state, never role authorization. **Was "Blocked pending a second credential"** |
| ASM-008 | Draft-save discrepancy | **Decided out of scope by `PO-5`**, not merely refuted. Kept on record as a future coverage item |
| ASM-006 | Complete approval matrix unknown | **Still open, and now explicitly not this module's** — deferred to Role CRUD. TC-AGENCY-048/049 establish the *workflow*, not the matrix |
| ASM-003 | PCC inherited from Supplier & Branch | **Confirmed end to end by experiment.** TC-AGENCY-060 asserts it; `BR-006` records it as durable knowledge. **Was "unresolvable — the section does not exist"** |
| ASM-005 | Credit enforcement behaviour unspecified | **No case** — verifying enforcement requires bookings or payments, `Forbidden (absolute)` on this environment. PRD `OQ-7` remains open |
| ASM-001, ASM-002, ASM-007, ASM-010 | PRD is reverse-engineered; no PRD requirement for the update flow; no prior field-validation coverage; test data is environment-specific | **Standing context, not testable.** ASM-010's consequence changed: cases no longer name a shared record but a **self-created fixture** (§0.1 of the suite), which is a stronger answer to environment-specific test data than naming a borrowed record was |

## 8. Coverage Gaps

**Uncovered Requirements: 0. Uncovered Findings: 0.**

| Item | Category | Reason | Minimal prerequisite to close (§20) |
|---|---|---|---|
| **AC-9 — `Search Supplier Credential PCC` (Mandatory) and `Ticketing Supplier Credentials PCC`** | **Partially Covered** | Both fields exist **nowhere on the form**. run-004 searched for them by page text across five supplier tabs on two Branches and two Agencies and found neither; the hypothesis that they surface only for a GDS supplier with a PCC selected was directly refuted. The PRD names the *section* (ORG-05 `[V]`) but not these fields, which is disposition row 2 — but designing to observed behaviour here would mean asserting that a **Mandatory** story field was legitimately removed, which nothing establishes | **Confirm with the product owner whether `Search Supplier Credential PCC` was deliberately removed or never built.** Until then the two fields are held as blocked, neither designed against nor dropped |
| AC-5 — `Designation` field | **Partially Covered** | No surface exists to test; absent from the first row on both forms in both runs (FINDING-006) | Confirm whether `Designation` is expected. TC-AGENCY-026 step 3 closes the one remaining condition — does it appear on an added row? — at no extra cost |
| AC-7 — the authoritative Payment Option set | **Partially Covered within a Covered requirement** | 24 of 29 rendered options are person names and single letters, and the count moved 28 → 29 between runs with no action by either. Pre-disposed by `APP-002` as intended cross-module reflection | Master-data cleanup on STG, or confirmation of the authoritative list. Owned by `payment-gateway`, not by this module |
| `Transfer Pnr Option` · `Blue Command Screen` · `Enable Search Limit` | **Out-of-Scope** | **Decided by `PO-13`**, 2026-08-18 — not an omission. All three exist on the form and in no requirement; `Blue Command Screen` is additionally disabled with the hint *"This option requires the Galileo supplier to be enabled"*. The Stage 2 evidence is kept so the story that owns them starts from an observation. **Was Uncovered at revision 1** | The User Story for their own feature. Nothing is needed from this run |
| Contract End Date must follow Contract Start Date | **Uncovered — deliberately, with reason** | A natural boundary rule that **no source states** for this form. PRD RPT-08 carries a date-order rule, but for Statement reports, not agency contracts. Designing it would mean inventing a requirement | Confirm whether the rule applies here; then one boundary case. Charter DREC-T08 covers the investigation |
| `Reaching Percentage` upper bound | **Uncovered — deliberately, with reason** | Numeric with no stated range in any source. Whether values above 100 are accepted is unknown | Charter DREC-T09, then one boundary case |
| Credit enforcement behaviour | **Out-of-Scope** | Verifying it requires bookings or payments, which are `Forbidden (absolute)` on this environment. PRD `OQ-7` is open | An environment and authorization for commercial operations — neither of which this run has, or asks for |
| Role authorization / maker–checker identity separation | **Out-of-Scope** | Removed as a test target by `PO-1`, `PO-6`, `PO-9`. Recorded so the gap stays visible rather than reading as coverage. **Was a High risk and three Blocked cases at revision 1** | A `Role CRUD` module with a requirement behind it. Stage 1 recommends *not* proposing one yet |
| Timeout behaviour (§7) | **Not Applicable** | No timeout condition can be induced from a browser session against a shared environment, and no requirement states timeout behaviour | — |

## 9. Risks

Aggregated from `TraceabilityMatrix.md` §4. **Four High-risk items**, called out explicitly — down from
six at revision 1, and one of them is new.

| Risk | Cases | Why it is High |
|---|---|---|
| **A platform-wide `[V]` validation message does not appear** *(new at revision 3)* | TC-AGENCY-058 | PRD XC-20 `[V]` states both the rejection and the message for non-numeric input, and no source supersedes it. `Credit limit *` discards the keystrokes and shows nothing. If equivalent server-side validation is also missing, a non-numeric value from another client would not be caught — **unverified; no API-level probe was run**. This is the run's one `Bug`-category Finding |
| **Contract documents may be storable in any format** | TC-AGENCY-019, 020 | The document input declares no accepted type while the logo input on the same form declares `accept="image/*"`, and a `.png` is attached to a live agency. Re-confirmed by run-004 |
| **~20 acceptance criteria specify messages the application does not render** | TC-AGENCY-002, 013, 034 | Resolved for execution — cases assert `Required`. The residual risk is that the story stays uncorrected and misleads a later reader into re-deriving this analysis |
| **A literal reading of the character rule makes existing agencies un-updatable** | TC-AGENCY-053 | The reported allowed set excludes the space, yet stored agency names contain one (`Test Egypt`). If rejection is real, no agency whose name has a space can be resubmitted without renaming |

**Medium: 12 items · Low: the remainder.**

**The standing shared-environment risk is retired for the 41 repointed cases.** At revision 1 every
mutating case carried it, and restoration after each case was mandatory. Those cases now act on a
record the run created, so there is nothing of anyone else's to restore or to be changed underneath
them. The twelve read-only cases save nothing and may run against any agency. `TraceabilityMatrix.md`
§4 records all four retired risks with the reason each no longer applies.

## 10. Recommendations

| ID | Recommendation | Rationale |
|---|---|---|
| **DREC-T11** | **Confirm whether `Search Supplier Credential PCC` was deliberately removed or never built** | The single largest remaining coverage gap, and the only one blocking a **Mandatory** story field. The answer decides whether two AC-9 fields are logged as an accepted gap or escalated as a removed feature. It no longer blocks the rest of AC-9 |
| **DREC-T12** | **Confirm whether XC-20's numeric message should appear on the Agency form** | Decides TC-AGENCY-058's fate. If silent masking is the intended platform design, the case is withdrawn and XC-20 is corrected; if not, execution reports a genuine Medium defect. The two outcomes are mutually exclusive, which is why the case is designed to the requirement and split from TC-AGENCY-035 |
| **DREC-T13** | **Ask separately whether `Company URL` should validate format at all** | Decides whether TC-AGENCY-009 stays exploratory or becomes a negative case designed to AC-1's `"Please enter a valid URL."`. Kept separate from DREC-T12 because the PRD corroborates one half of FINDING-010 and is silent on the other |
| **DREC-T14** | **Settle where the upload fixtures live** — the one Stage 1 item still open (§8.4 #1) | `PO-4` decided they are synthetic and committed; it did not say where, and `agency` has no automation package yet. Stage 1 recommends `platform_core_data/automation_baseline/shaft/tests_SHAFT/src/test/resources/testDataFiles/agency/uploads/`. **Stage `4A` needs this settled before it writes the upload steps** |
| **DREC-T15** | **Build `{BRANCH_UNDER_TEST}` with two or more suppliers, not one** | TC-AGENCY-060 verifies the tab set tracks the Branch's supplier set; a single-supplier Branch neither confirms nor refutes that and the case would be recorded `Blocked`. Two suppliers costs the fixture build almost nothing and unlocks the one integration case that would catch undocumented coupling |
| DREC-T05 | Get `Outstanding Threshold`'s valid range and business meaning | Its existence is settled (disposition row 4); its semantics are not. The observed value is `5` against a credit limit of `1000000`, so it is plainly not a currency amount. A guessed value gives a test that passes while asserting nothing |
| DREC-T10 | Correct US-4222 once the outstanding questions are answered | The message column, `Submit for Approval` vs `Send For Approval` (confirmed twice), the "role update process" wording, the seven undocumented fields, and AC-9's five fields versus the live three. Otherwise the next reader repeats this run's analysis |
| DREC-T16 | **Consider whether `Manager Name` should keep its mandatory marker** | Cosmetic and low priority, deliberately not asserted by TC-AGENCY-055. A field nobody can fill carries a `*`, which will keep prompting the question on every review |
| **Exploratory charters** — scoped for a human tester rather than forced into fixed assertions | | |
| DREC-T06 | Charter — `Agency Business Type`, and (if `PO-13` is ever lifted) the three excluded switches | A time-boxed session to establish what each does, rather than cases that would encode invented expectations |
| DREC-T07 | Charter — Payment Option data quality | Establish whether the 24 non-payment entries exist outside STG. Decides whether this is staging hygiene or a production data-integrity defect |
| DREC-T08 | Charter — contract date relationships | Start/end ordering, past dates, overlapping document periods. No source states these rules |
| DREC-T09 | Charter — `Reaching Percentage` bounds | Numeric with no stated range; worth knowing before writing a boundary case |
| DREC-T17 | Charter — the PCC section's behaviour across multiple suppliers | Whether per-tab values are independent, and what happens when a supplier is removed at Branch level while the Agency holds a description against it. `BR-006` establishes the render rule; it does not cover teardown |

**Closed since revision 1:** DREC-T01 (second credential — retired by `PO-9`, no longer needed),
DREC-T02 (DOQ-02 — answered by FINDING-008's experiment), DREC-T03 (baseline capture of record 949 —
moot, the record is no longer under test), DREC-T04 (export tool path resolution — resolved 2026-08-01).

## 11. Review & Automation

A roll-up of **decisions already recorded on the cases**, counted by parsing the Case Index with
`test_suite_export`'s own parser. It is never a recommendation, and this stage advanced nothing.

**Review is complete.** All 60 cases were reviewed by Ahmed Ayman on 2026-08-18, recorded in the
workbook and moved into the Markdown with
`test_suite_export/cli.js --import-lifecycle` (72 decisions imported), after which the workbook was
regenerated from the Markdown so the two cannot disagree. Content flows Markdown → Excel; decisions
flow Excel → Markdown.

| Column | Pending | Approved | Rejected | Total |
|---|---|---|---|---|
| **Review** | **0** | 33 | 27 | 60 |
| **Automation** | 1 | 18 | 41 | 60 |

**Eligibility, derived from the pair every time (§6.3.2):**

| Branch | Gate | Eligible now |
|---|---|---|
| Stage `4M` — Manual Execution | `Review = Approved` | **33** |
| Stage `4A` — Automation | `Review = Approved` **and** `Automation = Approved` | **18** — TC-AGENCY-001, 002, 011, 012, 016, 020, 021, 022, 023, 037, 044, 047, 048, 049, 050, 053, 055, 059 |

**Zero inconsistent pairs.** All eight that revision 3 produced were resolved by the reviewer in the
same pass — no pair now carries `Automation = Approved` against a `Review` other than `Approved`.
`--check` reports no warnings of any kind. Nothing was reconciled by this stage; the contradictions
were answered by the human whose decisions created them.

**Nothing is dropped for being out of scope.** Stage `4M` records a non-approved case as `Excluded`
with reason `Rejected at Review` and still reports it, so a run can never show "33 of 33 passed" while
27 cases went unexamined.

### 11.1 The 27 cases rejected at Review

TC-AGENCY-004, 005, 006, 007, 009, 010, 015, 017, 018, 019, 025, 026, 027, 028, 029, 030, 031, 032,
033, 034, 035, 038, 040, 041, 043, 052, 054.

`Rejected` means reviewed and not accepted as written. **None is deleted** — the record of the
rejection is the point, and each case stays in the suite for Stage `4M` to report as `Excluded`.

Four of them are worth naming, because their rejection changes what this run can claim:

| Case | What it covered | Consequence of the rejection |
|---|---|---|
| **TC-AGENCY-043** | AC-9's PCC section and its three controls | The case run-004's Discovery worked hardest to unblock is not accepted. AC-9's coverage now rests on TC-AGENCY-055, 056, 057 and 060, which **are** approved — so the section is still covered, but its top-level presence assertion is not |
| **TC-AGENCY-054** | The PCC section's conditional rendering | The `BR-006` dependency is no longer asserted by any approved case. It remains a **fixture precondition** either way: a Branch without a supplier still yields no PCC section, and TC-AGENCY-060 would report `Blocked` rather than a false absence |
| **TC-AGENCY-040** | Product Access populated from the parent Branch | AC-8's inheritance assertion drops out. AC-8 keeps TC-AGENCY-041 and 042, both approved, so the section is exercised but its inheritance is not verified in this run |
| **TC-AGENCY-019** | Non-PDF document rejected (FINDING-004, designed to the requirement) | The stronger half of the FINDING-004 pair is out. **TC-AGENCY-020 is approved and remains**, so a content check can still be established — but with TC-AGENCY-019 excluded, a pass on TC-AGENCY-020 cannot show whether validation is extension-only. That limitation must be recorded in the result, as the case's own Notes already say |

**TC-AGENCY-027 and TC-AGENCY-034 moved `Approved` → `Rejected`.** These are two of the twelve cases
revision 3 did not rewrite, so they carried their 2026-08-02 approval forward. The reviewer has now
withdrawn it. Both are mandatory-field cases asserting `Required`, so AC-5's and AC-7's empty-value
coverage is reduced; the equivalent cases for AC-1, AC-2 and AC-3 (TC-AGENCY-002, 013, 021) stay
approved.

**TC-AGENCY-052 resolved to `Rejected` / `Rejected`**, which is the outcome revision 3 recommended for a
retired case — an approval of steps reading "Not applicable" could not stand, and automating them was
not possible.

### 11.2 The one remaining Pending value

**TC-AGENCY-007** — `Review: Rejected`, `Automation: Pending`. This is not an inconsistency: §6.3.2's
gate excludes the case on `Review` alone, so the undecided `Automation` value changes nothing about
scope. It is left exactly as recorded rather than tidied to `Rejected`, because "no decision yet" is
what an absent decision means and this stage may not make one.

## 12. Inputs for Both Branches

**Both branches consume this stage's approved output independently, in either order.** This section
confirms the handoff for each (§21).

| Input | Satisfied by | Status |
|---|---|---|
| Project Context (governing) | `modules/agency/context/ProjectContext.md` rev 4, `Approved` — read directly, unmodified by this stage | ✅ |
| Manual Test Suite (primary) | `TestCases_Agency.md` + `.xlsx`, 60 cases, parsed clean, counts reconciled across three sources | ✅ |
| Requirement Traceability Matrix (secondary) | `TraceabilityMatrix.md` — 60 rows, all six reference dimensions populated per §5.1/§5.4 | ✅ |
| Coverage Report (secondary) | This document — §8 states what neither branch should attempt; §11 states what each may consume | ✅ |
| Discovery Artifacts (secondary) | Not produced here. Every Discovery Reference cites a **specific artifact and section** — e.g. `AgencyUpdateForm_run-004.md` §4.7 — never "see Discovery" | ✅ |
| Findings (secondary) | Not produced here. All 12 dispositioned in `TraceabilityMatrix.md` §3 — 8 regression, 0 exploratory, 4 documented exception. **Zero Uncovered** | ✅ |
| Evidence Packages (secondary) | Not produced here. Every Evidence Reference cites specific file(s), never a Finding as a whole | ✅ |

**What both branches must know before starting:**

1. **The record under test is built, not borrowed.** `{BRANCH_UNDER_TEST}` → approve → `{AGENCY_UNDER_TEST}`, per the suite's §0.1. Agency 949 is not a valid target for any case. The run-scoped grants are `AUTH-BRANCH-CREATE` / `UPDATE` / `SUBMIT` / `APPROVE-SelfCreated` in the run's `metadata/SafetyAuthorizations.json`, and **none of them carries beyond this run**.
2. **Build the Branch with two or more suppliers** (DREC-T15), or TC-AGENCY-060 is `Blocked` by construction.
3. **Two cases are expected to fail, by design.** TC-AGENCY-019 (PDF-only, FINDING-004) and TC-AGENCY-058 (XC-20's numeric message, FINDING-010) assert requirements the application appears not to meet. Those failures are the intended outcome and the run's strongest defect candidates — they must not be "corrected" into passes.
4. **Expected results follow observed behaviour** wherever the disposition says the story is outdated. A cleared mandatory field must render `Required`; a per-field message appearing instead is a finding to report, not a pass.
5. **Select payment options by label, never by index or count** (`APP-002`). The option count is demonstrably volatile.
6. **Type — never assign values in script** for TC-AGENCY-004, 006, 035, 058. A scripted assignment bypasses the keystroke filter these cases exist to characterize (`R-1`).
7. **Read a pre-filled form by polling, not by one fixed-delay sample** (`R-2`). 61 of 78 inputs populate within 1000 ms; a single early sample reads the form as empty and produces a false "does not pre-fill" failure — as it already did once on the `branch` module.

**Specific to Stage `4A`:** it takes both scope and content from the cases themselves, never from this
section. Right now that is **18 cases** — TC-AGENCY-001, 002, 011, 012, 016, 020, 021, 022, 023, 037,
044, 047, 048, 049, 050, 053, 055, 059. The other 42 are `Rejected` at Review or not selected for
automation, and excluding them is a recorded decision rather than a shortfall. **Selector detail is not in this
document by design**: run-004 recorded control labels, types and states but deliberately no locator
values, because `pipeline.md` §3.5 places selector acquisition in Stage `4A`, which verifies each
locator live at the moment it generates the code using it. `evidence/run-004/phase_b_update_form_structure.json`
is the full control inventory to work from.

**Specific to Stage `4M`:** it gates on `Review` alone and does not read the `Automation` column at all.
That is **33 cases** eligible. **A fixture build is now required**: most of them mutate the record under
test, so `{BRANCH_UNDER_TEST}` and `{AGENCY_UNDER_TEST}` must exist before a manual pass starts. Only
TC-AGENCY-002, 003, 008, 013, 014, 021, 024, 042, 047 and 059 — ten cases — are read-only and could
run against any agency.

**Handoff confirmation:** every input both skills' §4 declares is present and specific. **Two items are
declared rather than assumed:** the two absent AC-9 fields are held blocked on DREC-T11 rather than
carrying a fabricated assertion, and the upload fixtures' committed path is still open (DREC-T14) and
must be settled before Stage `4A` writes the upload steps.
