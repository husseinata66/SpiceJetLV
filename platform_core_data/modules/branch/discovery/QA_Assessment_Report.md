# QA Assessment Report — run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch` |
| Revision | 2 |
| Project Context validated against | `modules/branch/context/ProjectContext.md` (revision 2) |
| Discovery Mode(s) used | Browser automation — Browser Driver |
| Generated | 2026-08-03 |
| Status | Pending Review |

## 1. Scope

Run Scope Type: **User Story** (US 8605 — [Admin] Create Branch). Run Type: **User Story**. This run validated the live NDC Admin application against `modules/branch/context/ProjectContext.md` revision 2 (the revision that closed the credential/mutation-authorization run-configuration gaps). Per the Explorer skill's User Story strategy (§16), exploration was narrowed strictly to what's needed to reach and verify the Create Branch screen's acceptance criteria — no broad sweep of the wider Branch or Admin module was attempted.

## 2. Objectives

Verify the live Create Branch screen (`/admin/branch/add`) against every acceptance criterion in US 8605, with specific, explicit attention to the six carried-forward Assumptions/Risks in `ProjectContext.md` §6: unstated validation messages (ASM-BR-1), unverified free-text character rules (ASM-BR-2), Post Office Box/Credit Limit boundary lengths (RISK-BR-1), the Warning Prompt < Credit Terms and Reaching Percentage ≤ 100% cross-field rules (RISK-BR-2), and the PCC-fields-removed-from-UI claim (RISK-BR-3).

## 3. Evidence Sources

| Discovery Mode | In-Scope Areas Covered | Why This Mode |
|---|---|---|
| Browser automation — Browser Driver | Dashboard→Admin navigation, Search Branch waypoint, full Create Branch screen (all 7 field groups) | Per Explorer skill §8.1/§1.2 of `mcp/README.md`: the Browser Driver is the default mode for any authenticated flow, and it authenticates automatically without ever exposing the Super Admin credential to a tool call. Playwright MCP was not needed — the Browser Driver, once `playwright` was installed (see §11 Gaps), handled both first-contact exploration and boundary-condition probing in one session type, so no fallback to MCP or any lower-priority mode was required this run. |

## 4. Modules Explored

| Module | Route(s) | Purpose | Discovery Mode |
|---|---|---|---|
| branch | `/admin/branch`, `/admin/branch/add` | Branch creation and (unexplored this run) Branch search | Browser automation — Browser Driver |

**Shared UI components:** top `p-tabview` tab navigation; left collapsible Admin nav (Company/Branch/Agency/Staff); country-code phone input; masked password input with show/hide toggle.

## 5. Observed Behaviour

| Module | Workflow / Rule | What Was Observed | Evidence Category | Finding ID(s) |
|---|---|---|---|---|
| branch | Post Office Box length | Accepts 12 alphanumeric characters with no truncation/error, vs. AC's 8-char max | Direct Observation | FINDING-002 |
| branch | Credit Limit numeric-only rule | Correctly rejects alphanumeric input with an inline error message on blur | Direct Observation | (confirms AC — see §6) |
| branch | Credit Limit length | Accepts 16 numeric digits with no truncation/error, vs. AC's 15-char max | Direct Observation | FINDING-003 |
| branch | Reaching Percentage ≤100% rule | Correctly rejects 150.1234% with an inline error message on blur | Direct Observation | (confirms AC — see §6) |
| branch | Warning Prompt(Days) length | Accepts 14 digits with no truncation/error, vs. AC's 11-digit max | Direct Observation | FINDING-004 |
| branch | Payment Option checkbox contents | Contains ~25 entries unrelated to payment methods alongside the 5 expected ones | Direct Observation | FINDING-001 |
| branch | Credit Card → Payment Gateway conditional field | Dropdown never appears after checking Credit Card | Direct Observation | FINDING-007 |
| branch | Import PNR default state | Renders unchecked on a fresh form | Direct Observation | FINDING-005 |
| branch | Flight product-access control | Checked by default but enabled (not disabled) | Direct Observation | FINDING-006 |
| branch | Search Supplier Credentials PCC / Ticketing Supplier Credential PCC UI presence | Both confirmed absent from the rendered page | Direct Observation | (confirms AC — see §6) |
| branch | PAN Number field presence | Absent from the rendered page | Direct Observation | FINDING-008 |
| branch | Department control presence | Absent from the rendered page | Direct Observation | FINDING-009 |
| branch | Outstanding Threshold field | An undocumented Mandatory field, default "5", present | Direct Observation | FINDING-010 |
| branch | Submit button label | Reads "Send For Approval" | Direct Observation | FINDING-011 |

## 6. Confirmed Behaviour

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| §2 Branch Details — "system shall automatically set the brand as NDC (backend configuration, no dropdown on UI)" | No Brand field/dropdown appears anywhere on the Create Branch form | Direct Observation | None (matches AC) |
| §2 Product Access Details — "Search Supplier Credentials PCC & Ticketing Supplier Credential PCC shall be removed from UI" | Confirmed absent via full-page text search | Direct Observation | None — resolves RISK-BR-3 (Confirmed, refutes the risk) |
| §2 Branch Sales Configuration — "Reaching Percentage ... must not be greater than 100%" | Confirmed enforced: entering 150.1234 triggers "Reaching Percentage should not be greater than 100%" on blur | Direct Observation | None — resolves half of RISK-BR-2 (Confirmed for the percentage cap) |
| §2 Branch Sales Configuration — "Warning Prompt (Days) ... should be less than Credit Terms (Days)" | **Added 2026-08-03 (module owner review):** Confirmed enforced — Credit Terms(Days)=10000 with Warning Prompt(Days)=151515 triggers "Warning prompt days should not be greater than credit terms days" on blur (boundary is strictly-greater-than; equal values are not rejected) | Human Observation (module-owner-supplied screenshot) | None — resolves the other half of RISK-BR-2 (Confirmed for the cross-field rule); closes OQ-BR-2 |
| §2 Branch Sales Configuration — "Credit Limit (numeric input only)" | Confirmed enforced: alphanumeric input triggers an inline numeric-validation error on blur | Direct Observation | None — the numeric-only rule itself holds; only its length cap does not (FINDING-003) |
| §2 Country field — "auto-filled based on selected Operating Country" | Country field renders read-only/greyed, consistent with an auto-fill design (cascade itself not exercised — no Operating Country was selected this run) | Direct Observation | None (partial — see §8 Open Questions) |

**Added 2026-08-03 after module-owner review** — these were originally raised as candidate Bugs/Gaps in §11 Gaps but are now Confirmed Behaviour per human clarification (see each Finding's Human Review Update):

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| Payment Option checkbox contents | Confirmed intended: the list reflects the Payment Gateway module's Active records live, by design (same pattern as the Supplier Credentials cascade) | Direct Observation + Human Observation | FINDING-001 |
| Import PNR default state | Confirmed intended: unchecked-by-default is current, correct behavior; US 8605's "always checked" wording is outdated | Direct Observation + Human Observation | FINDING-005 |
| Flight product-access control editability | Confirmed as an Outdated Requirement disposition (US 8605 predates current behavior), not a defect | Direct Observation + Human Observation | FINDING-006 |
| Credit Card → Payment Gateway conditional field | Confirmed as an Outdated Requirement disposition (US 8605 predates current behavior), not a defect | Direct Observation + Human Observation | FINDING-007 |

**Added 2026-08-03, second review pass:**

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| Outstanding Threshold field (PRD_UserStories.md User Story 6 / US 51489 §2 Branch Module) | Confirmed match: the module owner established "Outstanding Threshold" (live label) = "Child Agencies Threshold Amount" (US 51489 §2) as the same feature. Disposition: **Expected Implementation / Requirement Traceability** — this field is now fully traced to its authoritative requirement and is not an application defect. | Direct Observation + Human Observation | FINDING-010 |

## 7. Assumptions

| ID | Assumption | Why Inferred (not observed) | Evidence Category |
|---|---|---|---|
| ASM-BR-1 (carried forward) | Exact validation-message wording for fields not explicitly quoted in US 8605 (e.g. Post Office Box, Warning Prompt) may differ from what a future build shows, since the AC never states literal message text | Only the messages actually observed this run (Credit Limit's numeric message, Reaching Percentage's cap message) can be cited as fact; message text for untested fields remains unobserved | Assumption |
| ASM-BR-2 (carried forward) | Address 1/Address 2 "free text, all character input" is assumed to mean no character-set restriction, but this run did not type unicode/emoji/special characters into those fields to confirm | Not directly tested this run — deprioritized within the User Story-scoped strategy in favor of the numeric/length boundary checks that produced FINDING-002 through FINDING-004 | Assumption |
| ASM-BR-3 (new) | The "2 decimal places allowed" wording in Credit Limit's validation message may be an undocumented, real business rule rather than a bug, since US 8605 is silent on decimal precision for that field | Inferred from the message text alone; not confirmed with Product/Business | Assumption |

## 8. Open Questions

| ID | Open Question | What Would Resolve It | Project Context Ref |
|---|---|---|---|
| OQ-BR-1 | Does the Operating Country → Country/State/City cascade actually populate correctly, and does Country truly auto-fill from a real Operating Country selection? | A follow-up pass selecting a real Operating Country value and observing the resulting Country/State/City behavior | ProjectContext.md §2, §3.1 |
| OQ-BR-2 | ~~Is Warning Prompt(Days) actually validated as "less than Credit Terms (Days)" once both fields are populated?~~ — **Resolved 2026-08-03.** Module-owner-supplied screenshot (Credit Terms=10000, Warning Prompt=151515) confirms the cross-field rule fires with message "Warning prompt days should not be greater than credit terms days." | Resolved — see §6 Confirmed Behaviour addendum | ProjectContext.md §6 RISK-BR-2; FINDING-004 |
| OQ-BR-3 | Is Import PNR forced on server-side regardless of the checkbox's visually unchecked default, or is the checkbox genuinely the only control and it is truly off by default? | Submitting a Branch with Import PNR left unchecked and inspecting the resulting record (requires this run's Branch-record mutation authorization) | FINDING-005 |
| OQ-BR-4 | Does a real, mouse-driven click on Credit Card (as opposed to this run's dispatched DOM click) surface the Payment Gateway dropdown? | Re-test with `page.click()` / an MCP `browser_click`-equivalent on the actual checkbox element | FINDING-007 |
| OQ-BR-5 | What does the GDS-conditional Supplier Credentials sub-grid actually look like, and does it match the AC (Generic Supplier Credentials PCC multi-select, Manager Name, Supplier Credentials Description)? | Check a GDS-type supplier row in the Product Access grid and observe the resulting sub-grid | Coverage_Summary.md §5 Blocked Areas |
| OQ-BR-6 | What does Submit for Approval actually do server-side (validation errors surfaced, record state created)? | A dedicated Test Design case exercising the full happy-path submission, under this run's Branch-mutation authorization | FINDING-011; run_configuration.md mutation override |

## 9. Discovered Risks

| ID | Risk | Business Risk | Technical Risk | Finding ID(s) |
|---|---|---|---|---|
| RISK-BR-DISC-1 | Multiple Mandatory numeric fields (Post Office Box, Credit Limit, Warning Prompt) have no client-side max-length enforcement | Branch records could be created with data far outside documented business bounds, risking downstream inconsistency in credit-risk calculations and correspondence formatting | If server-side validation mirrors the client gap, oversized values could reach the database with unknown effect on dependent calculations/reports | FINDING-002, FINDING-003, FINDING-004 |

**Superseded 2026-08-03 (module-owner review, two passes):** RISK-BR-DISC-2 (Payment Option data source) and RISK-BR-DISC-3 (PAN Number/Department absence) were reclassified as, respectively, confirmed-intended cross-module behavior and explicitly-ignored gaps — see FINDING-001, FINDING-008, FINDING-009 Human Review Updates. RISK-BR-DISC-4 (Outstanding Threshold field-identity match) is now **resolved, not a standing risk** — the module owner confirmed the match on the second review pass; see FINDING-010 and RISK-BR-4 in `ProjectContext.md` §6. All four are retained here as a record of what this run originally flagged, not as standing risks.

## 10. Coverage

| Area / Module | Coverage Status | Discovery Mode | Notes |
|---|---|---|---|
| Branch Details | Covered | Browser automation | Cascade behavior (Operating Country → State/City) not exercised — see OQ-BR-1 |
| Branch Email Configuration | Covered | Browser automation | Presence confirmed; 15-char password max length not boundary-tested |
| Branch Contact Info | Covered | Browser automation | Department control absent (FINDING-009); multi-contact Add not exercised |
| Branch Sales Configuration | Covered | Browser automation | Full boundary-testing on Credit Limit, Reaching Percentage, Warning Prompt, Post Office Box (n/a — different section but same pass) |
| Product Access Details | Partial | Browser automation | Top-level checkboxes covered; GDS-conditional sub-grid blocked (no GDS supplier selected) |
| Import PNR | Covered | Browser automation | Default-state discrepancy found (FINDING-005) |
| Submit for Approval / Cancel | Partial | Browser automation | Labels read; neither button was clicked this run |

**Roll-up:** 5 Covered · 2 Partial · 0 Blocked · 0 Unreachable

## 11. Gaps

| ID | Gap Type | Description | Project Context Ref | Finding ID(s) |
|---|---|---|---|---|
| GAP-BR-7 | Contradicts | Post Office Box, Credit Limit, and Warning Prompt(Days) are documented with explicit max-length caps; none is enforced client-side | ProjectContext.md §2 | FINDING-002, FINDING-003, FINDING-004 |

**This run's only remaining open Gap is GAP-BR-7.** Every other Gap originally raised is now closed:

| Former ID | Disposition | Finding ID(s) |
|---|---|---|
| GAP-BR-1 (PAN Number absent) | Ignored per explicit module-owner direction | FINDING-008 |
| GAP-BR-2 (Department absent) | Ignored per explicit module-owner direction | FINDING-009 |
| GAP-BR-3 (Outstanding Threshold, undocumented) | **Resolved 2026-08-03 (second review pass):** traced to US 51489 §2 Branch Module ("Child Agencies Threshold Amount") as its authoritative requirement — Expected Implementation / Requirement Traceability, not a Gap | FINDING-010 |
| GAP-BR-4 (Flight editable) | Outdated Requirement, not a Gap needing resolution | FINDING-006 |
| GAP-BR-5 (Import PNR unchecked) | Confirmed intended feature, not a Gap | FINDING-005 |
| GAP-BR-6 (no Payment Gateway dropdown) | Outdated Requirement, not a Gap needing resolution | FINDING-007 |

## 12. Recommendations

| ID | Recommendation | Rationale | Finding ID(s) |
|---|---|---|---|
| REC-BR-1 | Add client-side `maxlength`/pattern validators (and confirm matching server-side limits) for Post Office Box, Credit Limit, and Warning Prompt(Days) | Closes a consistent class of unenforced-length defects found across three separate fields in one pass — the only Findings from this run still needing a development fix | FINDING-002, FINDING-003, FINDING-004 |
| REC-BR-5 (2026-08-03) | Update US 8605's wording for Payment Option (drop the implied fixed 5-value list), Import PNR (drop "always checked"), Flight/Product Access, and Credit Card→Payment Gateway to match confirmed current behavior; revise Branch Details/Contact Info to drop PAN Number and Department per module-owner direction | Prevents this same set of "Findings" from being re-raised on a future Discovery pass against an AC that no one intends to hold the application to anymore | FINDING-001, FINDING-005, FINDING-006, FINDING-007, FINDING-008, FINDING-009 |
| REC-BR-6 (2026-08-03, resolved) | ~~Confirm whether the live "Outstanding Threshold" field is US 51489's "Child Agencies Threshold Amount"~~ — **done.** Module owner confirmed the match; Test Design should write cases against US 51489 §2 and §4 (the confirmation-popup flow, not yet explored by Discovery) using US 51489 as the authoritative requirement | Closes what was this run's one remaining open Requirement Gap | FINDING-010 |

**Regression Test Candidates:** Post Office Box / Credit Limit / Warning Prompt length-boundary checks are the only Findings from this run still worth a regression test — the length caps remain unenforced defects pending a fix. FINDING-001/005/006/007 are now confirmed-intended behavior and belong in a standard functional regression suite (not a "bug regression" suite) once Test Design designs cases for them at all.

## 13. Inputs for Test Design

**Findings by ID** (updated 2026-08-03 after module-owner review — see each Finding's Human Review Update):

| Finding ID | Category | Status | Severity | Module |
|---|---|---|---|---|
| FINDING-001 | Observation | Rejected | N/A | branch |
| FINDING-002 | Bug | Confirmed | Medium | branch |
| FINDING-003 | Bug | Confirmed | Medium | branch |
| FINDING-004 | Bug | Confirmed | Medium | branch |
| FINDING-005 | Requirement Gap | Rejected | N/A | branch |
| FINDING-006 | Requirement Gap | Rejected | N/A | branch |
| FINDING-007 | Requirement Gap | Rejected | N/A | branch |
| FINDING-008 | Requirement Gap | Rejected | N/A | branch |
| FINDING-009 | Requirement Gap | Rejected | N/A | branch |
| FINDING-010 | Observation | Rejected | N/A | branch |
| FINDING-011 | Bug | Confirmed | Low | branch |

**Only FINDING-002, FINDING-003, FINDING-004, and FINDING-011 remain live defect candidates for Test Design.** Every other Finding — including FINDING-010, now fully resolved as Expected Implementation / Requirement Traceability to US 51489 §2 — is `Rejected`, a resolved non-issue for this run's purposes, per explicit module-owner review. None remain `Needs Human Review`. Rejected Findings are retained in the record for traceability, not as active input to test-case design — except FINDING-010, which Test Design should still use as the pointer to US 51489 §2/§4 as the authoritative source for the Outstanding Threshold field and its confirmation-popup flow.

**Assumption disposition:**

| Assumption ID | Disposition | Basis |
|---|---|---|
| ASM-BR-1 | Unresolved | Only two of several unstated validation messages were actually observed this run (Credit Limit numeric, Reaching Percentage cap); others remain unobserved |
| ASM-BR-2 | Unresolved | Address 1/2 character-set behavior not tested this run |
| ASM-BR-3 | Unresolved | Credit Limit's "2 decimal places allowed" message wording not independently confirmed as an intended business rule |
| RISK-BR-1 | Confirmed (as a real defect) | Post Office Box boundary directly tested and found unenforced — see FINDING-002; Credit Limit boundary also tested and found unenforced — see FINDING-003 |
| RISK-BR-2 | **Confirmed 2026-08-03 (both halves)** | Reaching Percentage ≤100% rule Confirmed enforced; Warning Prompt-not-greater-than-Credit Terms cross-field rule now also Confirmed enforced via module-owner-supplied evidence (message: "Warning prompt days should not be greater than credit terms days") — refutes the risk in full |
| RISK-BR-3 | Refuted (risk did not materialize) | PCC fields confirmed absent from UI, exactly as the AC states |
| RISK-BR-4 | **Resolved 2026-08-03 (second review pass)** | Module owner confirmed "Outstanding Threshold" = US 51489's "Child Agencies Threshold Amount" — see FINDING-010 |

**Requirement Gaps needing a coverage decision:** none remaining — every Gap this run raised is now closed (see §11). US 51489 §2 (the field) and §4 (the Branch Threshold Update confirmation-popup flow, not yet explored by Discovery) are ready for Test Design to trace directly, with FINDING-010 as the pointer.

**Closed, no longer needing a Test Design coverage decision (module-owner review, 2026-08-03):** GAP-BR-1 (PAN Number, ignored), GAP-BR-2 (Department, ignored), GAP-BR-3 (Outstanding Threshold, traced to US 51489 §2), GAP-BR-4 (Flight editability, outdated requirement), GAP-BR-5 (Import PNR default, confirmed feature), GAP-BR-6 (no Payment Gateway dropdown, outdated requirement) — see §11.

**Handoff confirmation:** Every input `test-design-skill/SKILL.md` §4 declares as needed is present: this Discovery Report (this file + `Timeline.md` + `Coverage_Summary.md`), the Findings Summary and every Finding's populated `metadata.md` (each with an Expected Behavior field citing a specific `PRD_UserStories.md` US 5/US 6 section or `ProjectContext.md` section), the Evidence Packages referenced above, and Regression Test Candidates (§12). No Finding in this run's set is missing an Expected Behavior citation, and each Finding's Status/Evidence Category combination is unambiguous for Test Design's disposition mapping (Confirmed → Regression candidate; Needs Human Review → pending-clarification candidate; Rejected → Documented exception, not carried into test-case design).

---

# QA Assessment Report — run-003 (US 8599 Search & Actions Branch + US 8606 Update Branch)

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-003__2026-08-04_11-24-38__UserStory__US-8599-SearchActions_US-8606-UpdateBranch` |
| Generated | 2026-08-04 |
| Status | Pending Review |

## 1. Scope

**Run Scope Type:** User Story · **Run Type:** User Story · **Run Scope Source:** Pasted text (`PRD_UserStories.md` User Story 7 and User Story 8, appended 2026-08-04).

Validated against **`ProjectContext.md` Revision 8, Status Approved**. Two stories in one run: US 8599 (Search & Actions Branch) and US 8606 (Update Branch), the latter supplied expressly so US 8599's edit-pen criterion resolves against a real requirement.

**Strategy applied (§16, User Story):** targeted verification of the two stories' acceptance criteria, with every carried-forward Assumption/Risk given an explicit confirm/refute/unresolved treatment (see §8 and `Coverage_Summary.md` §8). No wandering into adjacent screens — the Create Branch screen was not re-explored, since run-002 already covers it.

## 2. Objectives

1. Confirm environment reachability, unverified since the 2026-07-29 platform migration.
2. Explore the **Search Branch** screen substantively — run-002 visited it as a single waypoint and deliberately went no further.
3. Reach the **Update Branch** screen, never previously observed, and answer **RISK-BR-5**: do the module owner's 2026-08-03 Create-screen dispositions extend to it?
4. Resolve **RISK-BR-8** (Status vs Approval Status), **RISK-BR-9** (is pagination testable without seeding?), **RISK-BR-7** (Branch Name search character set), and **RISK-BR-6a** (state-dependent action availability).

## 3. Evidence Sources

| Discovery Mode | Areas covered | Why |
|---|---|---|
| Browser automation — **Browser Driver** | Every in-scope area | Both target screens sit behind login. The Playwright MCP server runs `--isolated` and cannot inherit the Driver's authenticated session, and a credential value may never be typed into an MCP call (`mcp/README.md` §1.3) — so despite both being first-contact screens, the Driver was the only viable mechanism. |

**Evidence Category for every Finding: Direct Observation.** Nothing in this run rests on Documentation, Human Observation, Static Artifact, or Assumption.

## 4. Modules Explored

Route structure confirmed for the Branch module:

```
/admin/branch                    Search Branch — filter form + results grid + pager
/admin/branch/add                Create Branch (covered by run-002)
/admin/branch/edit/{BranchCode}  Update Branch — a branch is addressable directly by its code
```

Reusable components exercised: PrimeNG `p-dropdown`, `p-multiselect`, `p-radiobutton`, results grid + pager, `textarea`, masked password input. These recur across the Admin application, so behaviour observed here likely generalises — but that generalisation is **not** asserted, only noted.

## 5. Observed Behaviour

- **Search form** carries all six controls US 8599 specifies. `Active` is pre-selected on load, matching the AC's stated default.
- **Cascade** behaves exactly as the Business Rule requires: State disabled until a Country is chosen (Egypt yields 33 states), City disabled until a State is chosen.
- **Status filter partitions the record set arithmetically**: Active 491 + Inactive 125 = Both 616.
- **Empty result** renders `No data has been found!` — an exact match to the platform-wide contractual string.
- **Pagination** preserves the active filter across page changes; 120 distinct codes were read across 12 pages with no repetition.
- **Row action availability is state-dependent** — `Approved` gives edit + reject; `Pending for approval` gives edit + approve + reject; `Rejected` gives edit + approve. A record only offers transitions to a state it is not already in.
- **Update Branch pre-fills completely**, including both cascading dropdowns, within 500ms.
- **Update Branch renders `Approve` and `Reject` buttons even on an already-Approved record** — differing from the grid, which hides thumbs-up on such a row.
- The Branch code search input applies CSS `text-transform: uppercase` for display only; the submitted value is unchanged.
- The result count reads cumulatively through the current page (`Showing 30 results of 616 results` on page 3 at size 10).

## 6. Confirmed Behaviour

Validated against a clearly documented requirement and found to **match**:

| Behaviour | Requirement | Evidence |
|---|---|---|
| Status default is `Active` | US 8599 Business Rules | `id-Status-Active` checked on load |
| State depends on Country; City depends on State | US 8599 Business Rules | Cascade probe, `DiscoverySnapshot_SearchBranch.md` §3.1 |
| Status filter returns only matching records | PRD.md XC-09 | 491 + 125 = 616, an exact partition |
| Empty-state message | PRD.md XC-11 / §9.2 | Literal `No data has been found!` |
| `Pending for approval` state label | PRD.md XC-01 / §9.2 | Observed verbatim in the grid |
| Pagination preserves the active filter | PRD.md XC-13 | `Status=Both` still checked on page 3 |
| Edit pen navigates to Update Branch with details pre-filled | US 8599 Actions; US 8606 | `/admin/branch/edit/BRN2`, 10/10 fields populated |
| Branch Code, Branch Name, Country Name, City, Approval Status, Actions columns | US 8599 Search Result Grid | 6 of the 7 specified columns render — see §11 for the 7th |
| Remarks field present and marked mandatory on Update | US 8606 Buttons & Actions | `Remarks *` textarea |
| Approve / Reject / Cancel buttons present on Update | US 8606 Buttons & Actions | Observed |

## 7. Assumptions

| Assumption | Evidence Category |
|---|---|
| The Branch code search matches case-insensitively — the CSS uppercase transform is display-only, so a lowercase value is what gets submitted. **Not tested**; inferred from the value/display divergence. | Assumption |
| Component behaviour observed here (PrimeNG cascade, pager) generalises to other Admin grids. **Not tested** outside Branch. | Assumption |

## 8. Open Questions

| # | Question | Why unresolved |
|---|---|---|
| OQ-A | Does clicking grid thumbs-up/thumbs-down capture Remarks, as PRD.md XC-03 requires platform-wide? | Requires *performing* an approve/reject, permitted only on a self-created record. Deferred to `4M`. |
| OQ-B | Are the `Approve`/`Reject` buttons on the Update **form** enforced server-side for an already-Approved record, or merely always rendered? The grid and the form disagree about availability. | Requires attempting the action. |
| OQ-C | Does "Approving or rejecting a branch updates its status accordingly" (US 8599) mean Approval Status, or the Active/Inactive Status? | The Active/Inactive axis is displayed nowhere in the grid (FINDING-014), so no UI surface could evidence such a change. Needs a Product answer. |
| OQ-D | Does selecting multiple cities in the City multi-select return the union of their records? | A behavioural question better answered by a designed case than an exploratory probe (FINDING-015). |
| OQ-E | Is the Branch Email Password stored reversibly, and must the edit endpoint return it at all? | Not determinable from the UI. Capturing the raw response would write a live credential into this run's evidence, which the platform's rules forbid — the omission is disclosed, not performed (FINDING-013). |
| OQ-F | Is `Import PNR`'s checked state on an existing record consistent with the Create default being unchecked? | A stored value and a form default are different things; the comparison does not transfer. Recorded rather than forced into an answer. |

## 9. Discovered Risks

**Business:** the highest-impact item this run is **FINDING-013** — a stored Branch Email account password recoverable by any operator who can open a routine edit screen, on a plain-HTTP environment. It outranks every functional finding here and is the one item worth escalating ahead of the rest.

**Technical:** FINDING-013 implies the Branch Email Password is held **reversibly** rather than hashed, and that the edit endpoint serialises the record without field-level redaction — an architectural property no front-end change fixes, and one likely to affect sibling entities handled the same way.

**Process:** two candidates this run would have been published as defects had they been taken from their first symptom — one of them high-severity. Both were killed by the Investigation Workflow's validate-and-recover step. Recorded because it is a live demonstration that fixed-delay sampling produces false reads against this application.

## 10. Coverage

**11/13 in-scope areas visited = 85%.** Full detail, including the two Blocked areas and their recovery analysis, is in `Coverage_Summary.md` (run-003 section). No area was Unreachable, and no `Test Gap` Finding was required on Discovery-mechanism grounds.

## 11. Gaps

| Gap | Finding |
|---|---|
| `State` column enumerated by US 8599 does not render in the grid | **FINDING-012** (Bug, Medium, Confirmed) |
| Active/Inactive status is filterable but never displayed — non-conforming to PRD.md XC-07 | **FINDING-014** (Requirement Gap, Needs Human Review) |
| City filter is a multi-select where the AC says dropdown | **FINDING-015** (Requirement Gap, Needs Human Review) |
| Submit button reads `Send For Approval` on Update as well as Create | FINDING-011, occurrence 2 |
| PAN Number / Department absent on Update, as on Create | FINDING-008 / FINDING-009, occurrence 2 |
| No Payment Gateway control despite Credit Card being saved-checked | FINDING-007, occurrence 2 |
| Stored email password returned to the client | **FINDING-013** (Security Concern, High, Confirmed) |
| `Remarks *` label's `for` attribute points at an id no element carries — label not programmatically associated | Minor a11y defect, recorded in `DiscoverySnapshot_UpdateBranch.md` §5; not raised as a separate Finding |

## 12. Recommendations

**Regression Test Candidates** — areas worth durable coverage, not designed cases:

1. Status filter partition (Active + Inactive = Both) — a cheap, high-signal invariant.
2. Cascade enable/disable chain on the search form.
3. Empty-state contractual string.
4. Pagination filter-persistence across page changes.
5. State-dependent action-icon availability across all three approval states.
6. Update pre-fill fidelity, gated on a readiness signal rather than a delay.

**Findings of Category `Recommendation`:** none raised this run.

**Escalate first:** FINDING-013, to whoever owns platform security, ahead of the functional findings.

## 13. Inputs for Test Design

**Findings by disposition** (Status maps to disposition per `test-design-skill` §5.3):

| Status | Findings | Suggested disposition |
|---|---|---|
| Confirmed | FINDING-012, FINDING-013 (plus carried 002, 003, 004, 011) | Regression test |
| Needs Human Review | FINDING-014, FINDING-015 | Exploratory test, pending Product's answer |
| Rejected | FINDING-001, 005, 006, 007, 008, 009, 010 | Documented exception |

**Assumptions resolved this run:** RISK-BR-5 (3 of 4 extend; 1 not comparable) · RISK-BR-6a (resolved) · RISK-BR-7 (search field resolved) · RISK-BR-8 (resolved structurally) · RISK-BR-9 (resolved — no seeding needed) · environment reachability (confirmed).

**Assumptions still open:** RISK-BR-6b (role-differentiated behaviour — not observable in a single-account run) plus OQ-A through OQ-F above.

**Requirement Gaps needing a coverage decision:** FINDING-012, FINDING-014, FINDING-015 — each needs Product to say whether the story or the build is authoritative before a case can assert an expected result.

**Two hard constraints Test Design must design around:**

1. **Approve/Reject, Remarks enforcement, XC-06 self-approval, and Update field validation all require a self-created Branch record.** This run's authorization permits acting only on records the run itself creates, and Discovery created none. Every such case must begin by creating its own branch and capturing its run-tagged identifier **before** acting on it — that provenance capture is what makes an authorized action provable afterwards.
2. **The Update screen must be gated on a readiness signal, never a fixed delay.** A fixed-delay read produced a false "form is empty" result twice in this run. Poll for a known field to become non-empty. This is the single most important execution note this run produces.

**Pagination is free.** 616 live records across 62 pages — pagination cases need no seeded data, and the Stage 1 cost concern (RISK-BR-9) is closed.

---

# QA Assessment Report — run-006 (Auto Reissue checkbox — Branch half)

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 3 (this section added in place; the run-002 and run-003 sections above are unchanged) |
| Project Context validated against | `modules/branch/context/ProjectContext.md` — revision **9**, **Approved** 2026-09-24 (Mohamed Soliman). **It was then edited during this stage:** `PO-21` … `PO-26` and the `.60` target. Those edits were **Approved 2026-09-24 by Mohamed Soliman** at the Stage 2 review |
| Discovery Mode(s) used | Browser automation — **Browser Driver, headed**, Admin `http://192.168.1.60`. Human Observation (the user's statements) |
| Generated | 2026-09-24 |
| Status | **Approved** — Mohamed Soliman, Stage 2 Human Review gate, 2026-09-24 |

## Headline

**The Branch's Auto Reissue checkbox works as specified, and the Branch can own a booking itself.** A Branch-owned booking's `Reissue` button followed **BRN265's** checkbox, off then on, in one session with the flag read right before each check. So `ASM-BR-6` ("bookings are created by an Agency, not a Branch") is **refuted**. The Branch-created Itinerary case that §3 excluded "unless Stage 2 shows Branch-level booking exists" is now reachable (`GAP-BR-R6-02`). One Finding (FINDING-017) was confirmed as intended by the user (`PO-22`). The Agency half, including the Portal, is in `modules/agency/discovery/QA_Assessment_Report.md` Revision 4.

## 1. Scope

**Run Scope Type:** User Story · **Run Type:** User Story (`user_story_run`) · **Source:** `knowledge_base/requirements/user_stories/Auto_Reissue_Checkbox_Branch_Agency.md` plus the specification `…/specifications/Auto_Reissue_Checkbox_Documentation.md`. Validated against branch ProjectContext Revision 9: §1.2 `PO-15` … `PO-26`, the §2 *REV 9* rows, §3, and §6 `ASM-BR-4` … `ASM-BR-6`, `RISK-BR-10` … `RISK-BR-12`. The US 8605/8606/8599 surfaces were **not** re-explored (User Story strategy, §16).

**Test records:** Branch **BRN265** "NDC2_Mohamed Soliman" (id 10950), designated by the user (*"you can use BRN265 all over the steps"*). No Branch was created, and `AUTH-BRANCH-CREATE-SelfCreated` was revoked. Booking **`NDCEG-BR-F260916ENYOeQ`** (order `BRN265NDCORD2609169XJ1LC`) was made by the user under BRN265.

## 2. Objectives

From §8.1: observe the checkbox and picker on Create and Update Branch (ASM-BR-4); capture the save, details and approve endpoints, including Remarks (ASM-BR-5, RISK-BR-10); list credentials with `autoReissueAllowed`, read-only (RISK-BR-11); establish whether a Branch-level booking exists (ASM-BR-6, **never by booking**). Added during the stage: check a Branch-owned booking's Itinerary against BRN265's checkbox, and check the picker's source rule (`PO-21`).

## 3. Evidence Sources

| Discovery Mode | In-Scope Areas Covered | Why This Mode |
|---|---|---|
| Browser automation — **Browser Driver**, headed | Add Branch (unsaved), Edit BRN265, the Branch grid and approve, `GET /Master2/Branch/BRN265/details`, Search Booking and the Itinerary | The default mode for Admin. Headed at the user's request |
| Human Observation | `PO-21` (GDS and hard-coded list), `PO-22`, `PO-26` | The user's statements during the stage |

## 4. Modules Explored

| Module | Route(s) | Purpose | Discovery Mode |
|---|---|---|---|
| `branch` | `/admin/branch/add` (never saved), `/admin/branch/edit/…` (BRN265), `/admin/branch` grid | Checkbox, picker, GDS PCC tabs, save, Remarks, approve | Browser Driver |
| `branch` → Itinerary (the checkbox's effect) | `/booking/search-booking` → Flight → booking details for `BRN265NDCORD2609169XJ1LC` | `Reissue` and `canAutoReissue` for a Branch-owned booking | Browser Driver |

**Endpoints seen in the app's traffic (ASM-BR-5):** `PUT /odeysysadmin/Master2/Branch/10950` (204; body carries `autoReissueEnabled`, `reissueCredentials`, and the Remarks) · `PATCH /odeysysadmin/Master2/Branch/approveOrReject` `{remarks, approvalStatus, code}` (200) · `GET /odeysysadmin/Master2/Branch/BRN265/details`. The top-level keys include `productAccessDetails`, `autoReissueEnabled` and `reissueCredentials`, and each credential carries `autoReissueAllowed`.

**Shared UI components:** the same as `agency`: the *Auto Reissue Credentials* multi-select, and each GDS supplier's PCC-tab multi-select under *Airline Supplier credential (PCC)*.

## 5. Observed Behaviour

| Module | Workflow / Rule | What Was Observed | Evidence Category | Finding ID(s) |
|---|---|---|---|---|
| branch | Checkbox presence and default | **"Auto Reissue"** beside Import PNR on Add Branch, **unchecked**. Ticking it shows *Auto Reissue Credentials*, with no server call. With no supplier ticked, the picker reads "No results found" (`01-branch-add-form`, `02-…`, `03-…`) | Direct Observation | — |
| branch | Picker source (`PO-21`), unsaved Add Branch | LCC **AirArabiaEgypt**, credential chosen in its row → picker **empty**. **Galileo** tab → "GalileoLive" → picker **["GalileoLive"]**. **Amadeus** tab → "Amadeus Live" → picker **empty**. The PCC-tab control is a multi-select (`39-*`, `40`) | Direct Observation | — |
| branch | BRN265 stored state | Auto Reissue **on**, `reissueCredentials [313]` ("NDCSabre staging", NDCsbr, `autoReissueAllowed true`) at the baseline (`05`). During the run the user added supplier **Sabre** (315 checked, 297 unchecked) by hand (confirmed 10:24) | System Response | — |
| branch | Save → approve (off) | `PUT …/Branch/10950` 204 with `autoReissueEnabled false`, `reissueCredentials []`. Grid "Pending for approval", then approve (Remarks), then "Approved". Details GET: `false`, **`[313]` kept** (S-7) | System Response | (agency FINDING-014 for the pending state) |
| branch | Save → approve (on, S-7 pre-fill) | Re-ticking pre-filled the picker with "NDCSabre staging" (10:27:51). `PUT` 204 with `[313]`, then approved. GET `true`, `[313]` | System Response | — |
| branch | Branch-owned booking exists | `NDCEG-BR-F260916ENYOeQ`: `agentOrder.branchId BRN265`, `agencyId null`, Sabre, `ticketPccId 315`, Status Booked (`45`) | System Response | — |
| branch | Itinerary vs BRN265 (one session) | 10:27:29 flag false → 10:27:37 `canAutoReissue false`, **no Reissue**. 10:28:24 flag true → 10:28:30 `canAutoReissue true`, **Reissue shown**. Manual Reissue shown both times. Lock held (`33-*`) | Direct Observation / System Response | FINDING-017 |
| branch | Credential selection and the button | The booking is on 315, which isn't in BRN265's selection `[313]`, and it still showed Reissue while on | Direct Observation | FINDING-017 |
| branch | First OFF check (10:24–10:25) | `canAutoReissue true` while BRN265 was believed to be off. **Discarded:** BRN265 had been switched back on by hand in another session. Repeated in one session (above) | System Response | FINDING-017 (investigation notes) |

## 6. Confirmed Behaviour

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| §2 REV 9 *checkbox on Create/Update Branch, default unchecked*; `PO-15` | Present, unchecked, toggles on Create (unsaved) and on Update (BRN265) | Direct Observation | — |
| §2 REV 9 *saved value retrieved on edit and GET* | The form and the details GET both match the save | System Response | — |
| §2 REV 9 *credential selection (UI)*; ASM-BR-4; `PO-21` | Candidates are the Branch's assigned GDS credentials on the supported list. LCC and Amadeus are excluded | Direct Observation | — |
| §2 REV 9 *off keeps saved credentials* (S-7) | `[313]` kept while off, and pre-filled when turned back on | System Response | — |
| §2 REV 9 *independence from Agencies*; `PO-16` | BRN265 on while AGN9780 off, and each org's booking followed its own flag | Direct Observation | — |
| §2 REV 9 *maker–checker with Remarks* | Remarks → Send For Approval → Pending → approve → Approved | Direct Observation | — |
| spec §5 (organization that owns the booking); `PO-26` | The Branch-owned booking follows BRN265's checkbox | Direct Observation / System Response | FINDING-017 |

## 7. Assumptions

| ID | Assumption | Why Inferred (not observed) | Evidence Category |
|---|---|---|---|
| A-BR-R6-1 | Remarks are **mandatory** on a Branch update (RISK-BR-10) | Remarks were typed on every save. Saving **without** them wasn't tried | Assumption |
| A-BR-R6-2 | A Branch sees its Agencies' bookings and can book on their behalf, and such bookings follow the Agency (`PO-26`) | The user's statement. Not observed | Human Observation |
| A-BR-R6-3 | TravelportNdc credentials appear in the picker like Galileo (`PO-21`) | No Travelport credential was tried | Human Observation |

## 8. Open Questions

| ID | Open Question | Rect | Why the Answer Matters | What Would Resolve It | Original | Annotated | Project Context Ref |
|---|---|---|---|---|---|---|---|
| OQ-BR-R6-1 | **RISK-BR-11 — partly unresolved.** No inactive credential, and none that became invalid after being selected, exists on `.60`. So `S-5` (inactive) and read-time clean-up can't be reached on BRN265 without changing supplier data | — | Two specification rules would have no Branch test | A decision to defer, or a granted supplier change | — | — | RISK-BR-11 |
| OQ-BR-R6-2 | `S-3` … `S-6` were **not** sent against the **Branch** API (they were sent against the Agency API only) | — | The Branch save is a different endpoint (`/Master2/Branch`) | Stage 3 API cases on BRN265 | — | — | §2 REV 9 *backend rules* |

## 9. Discovered Risks

| ID | Risk | Business Risk | Technical Risk | Finding ID(s) |
|---|---|---|---|---|
| R-BR-R6-1 | BRN265 was changed by hand during the run (the Sabre supplier, the flag) | Results can be credited to the wrong change | Every check must read the state in the same session | FINDING-017 |
| R-BR-R6-2 | BRN265 is the user's real Branch, not a disposable record | A failed test can leave it Pending or changed | Every case must record and restore BRN265's state | — |

## 10. Coverage

| Area / Module | Coverage Status | Discovery Mode | Notes |
|---|---|---|---|
| Checkbox on Create/Update Branch | Covered | Browser Driver | Create unsaved only |
| Saved value retrieved | Covered | Browser Driver | |
| Credential selection (UI) | Covered | Browser Driver | TravelportNdc not seen |
| Backend rules via Branch API | Skipped | — | Done against the Agency API only (OQ-BR-R6-2) |
| S-7 / read-time clean-up | Partial | Browser Driver | S-7 covered. Clean-up blocked (OQ-BR-R6-1) |
| Independence from Agencies | Covered | Browser Driver | |
| Maker–checker with Remarks | Covered | Browser Driver | Remarks-missing case not tried |
| Regression smoke | Skipped | — | Stage 3 (RISK-BR-12) |
| Branch-owned booking Itinerary (was §3, conditional) | Covered | Browser Driver | ASM-BR-6 refuted |

**Roll-up:** 6 Covered · 1 Partial · 0 Blocked · 0 Unreachable (2 Skipped). **7/9 areas visited = 78%.**

## 11. Gaps

| ID | Gap Type | Description | Project Context Ref | Finding ID(s) |
|---|---|---|---|---|
| GAP-BR-R6-01 | Extends | `PO-19` and §4/§5 say run-006 changes only a Branch **it creates**. The run instead changed the user's **designated** BRN265 (`AUTH-BRANCH-*-DedicatedTestData`), with Branch creation revoked. This isn't in the Project Context | `PO-19`; §4; §5 | — |
| GAP-BR-R6-02 | Contradicts | §3 excludes the Admin Itinerary for **Branch-created** bookings unless Stage 2 shows Branch-level booking exists. It does (`agencyId null`), so ASM-BR-6 is refuted and this row should move to §2 | §3; ASM-BR-6 | FINDING-017 |
| GAP-BR-R6-03 | Extends | `PO-21` … `PO-26` and the `.60` target were written into the approved context during Stage 2. They need approval. The `PO-26` row in §1.2 also has one more cell than the two-column table | §1.2; header | — |
| GAP-BR-R6-04 | Contradicts | §8.1 still says *"Verify `odeysysadmin` login on `http://192.168.1.70`"*. The login was verified on `.60` | §8.1 | — |
| GAP-BR-R6-05 | Contradicts (resolved) | §3 REV 9 "Portal impact … Admin only (`PO-20`)" is superseded by `PO-25` | §3; `PO-25` | — |

## 12. Recommendations

| ID | Recommendation | Rationale | Finding ID(s) |
|---|---|---|---|
| REC-BR-R6-1 | Approve or amend `PO-21` … `PO-26`. Record BRN265 as designated test data in `PO-19`/§5. Move the Branch-created Itinerary row from §3 to §2, and set ASM-BR-6 to refuted. Fix `.70` → `.60` in §8.1, and fix the `PO-26` row | Closes GAP-BR-R6-01 … -05 at Stage 1 | — |
| REC-BR-R6-2 | Design Branch API cases for `S-3` … `S-6` on BRN265, restoring its state after each | OQ-BR-R6-2 | — |

**Regression Test Candidates:** the Branch-owned booking's button following BRN265 (on/off); S-7 pre-fill on the Branch; the picker excluding LCC and Amadeus; independence from AGN9780.

## 13. Inputs for Test Design

| Finding ID | Category | Status | Severity | Module |
|---|---|---|---|---|
| FINDING-017 | Observation | Rejected — Confirmed Intended (`PO-22`) | N/A | branch |

| Assumption ID | Disposition | Basis |
|---|---|---|
| ASM-BR-4 | Confirmed | The candidates are the Branch's assigned GDS credentials, filtered by `PO-21` |
| ASM-BR-5 | Confirmed | Endpoints in §4. Remarks carried in the approve body |
| ASM-BR-6 | **Refuted** | A Branch-owned booking exists (`agencyId null`) |
| RISK-BR-10 | Unresolved (partly) | A-BR-R6-1 |
| RISK-BR-11 | Partly unresolved | OQ-BR-R6-1 |
| RISK-BR-12 | Carried to Stage 3 | — |

| Gap ID | Requirement | Decision Needed From Test Design |
|---|---|---|
| GAP-BR-R6-02 | Branch-owned booking Itinerary | Add to the designed scope (it's reachable) |
| OQ-BR-R6-2 | `S-3` … `S-6` on the Branch API | Design as API cases |
| OQ-BR-R6-1 | `S-5` inactive, clean-up | Defer or design with a precondition |
| — | TravelportNdc | Design (needs a Travelport credential) |

**Handoff confirmation:** present: this section, the Timeline (run-006 section), the Coverage Summary (run-006 section), the Findings Summary (FINDING-017 row), FINDING-017's evidence package, and the snapshot `DiscoverySnapshot_BranchAutoReissue_run-006.md`. Stage 3 should start after the §11 context items are approved.
