# Coverage Summary — run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch` |
| Revision | 1 |
| In-scope surface (from Project Context) | 7 field groups named in `ProjectContext.md` §2: Branch Details, Branch Email Configuration, Branch Contact Info, Branch Sales Configuration, Product Access Details, Import PNR, Submit for Approval/Cancel |
| Generated | 2026-08-03 |

## 1. Coverage Percentage

**7/7 in-scope field groups visited = 100%** — basis: every field group named in `ProjectContext.md` §2 was reached and inspected on the live Create Branch screen. This is a visitation count, not a depth judgment: two areas were visited but not exercised to full depth — the GDS-conditional Supplier Credentials sub-grid never appeared because no supplier row was checked, and the Submit for Approval/Cancel buttons were read (label only) but not clicked. Both are recorded under §5 Blocked Areas / §8 Open Questions rather than counted as full coverage.

## 2. Visited Screens

| Screen / URL | Module | Discovery Mode | Snapshot Artifact |
|---|---|---|---|
| Dashboard (`/dashboard`) | branch (waypoint only — Dashboard itself is out of scope per Project Context §3) | Browser automation — Browser Driver | `discovery/evidence/02-dashboard.png` (no dedicated snapshot file — out-of-scope waypoint) |
| Search Branch grid (`/admin/branch`) | branch (waypoint only — Search Branch is out of scope per Project Context §3, Reflection item) | Browser automation — Browser Driver | `discovery/evidence/03-search-branch-grid.png` (no dedicated snapshot file — out-of-scope waypoint) |
| Create Branch (`/admin/branch/add`) | branch | Browser automation — Browser Driver | `discovery/DiscoverySnapshot_CreateBranch.md` |

## 3. Visited Components

| Component | Where Exercised | Discovery Mode |
|---|---|---|
| Top tab navigation (`p-tabview`) | Dashboard → Admin | Browser automation — Browser Driver |
| Left collapsible nav (Company/Branch/Agency/Staff) | Admin section | Browser automation — Browser Driver |
| Country-code + numeric phone input | Create Branch (Branch Phone Number, Contact Phone Number) | Browser automation — Browser Driver (presence only; not boundary-tested) |
| Masked password input with show/hide toggle | Create Branch (Email Password) | Browser automation — Browser Driver (presence only; not boundary-tested) |

## 4. Skipped Areas

| Area | Module | Why Skipped | Discovery Mode Available |
|---|---|---|---|
| Search Branch (full grid behaviour: filters, pagination, status column) | branch | Out of scope for this User Story run — named only as a Reflection item in US 8605, not an acceptance criterion (Project Context §3) | Browser automation — available, deliberately not used beyond the single waypoint screenshot |
| Operating Country → Country/State/City cascade | branch | In scope per AC, but exercising it meaningfully requires selecting a real Operating Country value from live master data, which this User Story-scoped pass deprioritized in favor of the form's own field-level rules (§16 strategy: targeted verification, not broad sweep) | Browser automation — available, not yet used for this specific check |
| Multi-contact "Add" and multi-target "Add +" flows | branch | In scope per AC (both Optional), deprioritized within this run's time-bounded scope | Browser automation — available |

## 5. Blocked Areas

| Area | Module | What Blocked It | Recovery Attempted (§21) | Discovery Mode |
|---|---|---|---|---|
| GDS-conditional Supplier Credentials sub-grid (Generic Supplier Credentials PCC, Manager Name, Supplier Credentials Description) | branch | No supplier row in the Product Access grid was checked, so the AC's "If a GDS is selected..." condition was never triggered | Not applicable — this is an untriggered conditional state, not a failure; checking a real supplier row was deferred rather than forced, since doing so edges toward a real, harder-to-reverse form state within this exploratory pass | Browser automation — available; would require checking a specific GDS-type supplier row in a follow-up pass |

## 6. Unreachable Areas

None. Every in-scope area was either visited, deliberately skipped (§4), or blocked pending a specific trigger action (§5) — none was unreachable given the credentials and environment available this run.

## 7. Roll-Up

| Status | Count |
|---|---|
| Visited Screens | 3 (1 primary + 2 out-of-scope waypoints) |
| Visited Components | 4 |
| Skipped | 3 |
| Blocked | 1 |
| Unreachable | 0 |

**By Discovery Mode:** Browser automation (Browser Driver): 3 screens visited, 4 components, all skipped/blocked areas were also assessed via this same mode (i.e., no fallback mode was needed this run — reachability was confirmed and the Browser Driver worked end to end once `playwright` was installed).

---

# Coverage Summary — run-003 (US 8599 Search & Actions Branch + US 8606 Update Branch)

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-003__2026-08-04_11-24-38__UserStory__US-8599-SearchActions_US-8606-UpdateBranch` |
| Revision | 1 (this run's section; the run-002 section above is unchanged) |
| In-scope surface (from Project Context §2, Rev 8) | 13 areas added at Rev 6 for the two new stories: search/filter form · results grid · empty-result state · pagination · Edit action · Approve/Reject actions · cascade dependency · default status filter · Update all-five-field-groups · Update mandatory Remarks · Update four action buttons · Update pre-fill fidelity · state-dependent action availability |
| Generated | 2026-08-04 |

## 1. Coverage Percentage

**11/13 in-scope areas visited = 85%.**

Basis: every area named for US 8599 and US 8606 in `ProjectContext.md` §2 was reached and inspected, **except** the two that require performing a mutating action on a record this run created. This is a visitation count, not a depth judgment.

Not counted as visited:
- **Approve / Reject actions** — the icons and their state-dependent availability were fully observed (see §5), but no approve or reject was *performed*, so the resulting state transition and any Remarks capture are unverified.
- **Update mandatory Remarks enforcement** — the `Remarks *` textarea was confirmed present; that an action is *blocked* without it was not tested, since testing it means attempting an action.

## 2. Visited Screens

| Screen / URL | Module | Discovery Mode | Snapshot Artifact |
|---|---|---|---|
| Search Branch (`/admin/branch`) | branch — **now in scope** (Rev 6 moved it from Out of Scope) | Browser automation — **Browser Driver** | `discovery/DiscoverySnapshot_SearchBranch.md` |
| Update Branch (`/admin/branch/edit/{code}`) | branch — **new this run**, never previously observed | Browser automation — **Browser Driver** | `discovery/DiscoverySnapshot_UpdateBranch.md` |
| Dashboard (`/dashboard`) | branch (waypoint only) | Browser automation — Browser Driver | no dedicated snapshot — out-of-scope waypoint |

## 3. Visited Components

| Component | Where Exercised | Discovery Mode |
|---|---|---|
| `p-dropdown` (single-select) | Search Branch — Country, State; Update Branch — State, City | Browser Driver — opened, enumerated options, selected |
| `p-multiselect` | Search Branch — City filter | Browser Driver — presence + enabled-state only; multi-selection not exercised (FINDING-015) |
| `p-radiobutton` group | Search Branch — Status (Inactive/Active/Both) | Browser Driver — all three selected and searched |
| Results grid + pager | Search Branch | Browser Driver — 12 pages traversed, 120 rows read |
| Row action icons (`pi-pencil`/`pi-thumbs-up`/`pi-thumbs-down`) | Search Branch grid | Browser Driver — **observed only**; pencil clicked (read-only navigation), thumbs never clicked |
| `textarea` (Remarks) | Update Branch | Browser Driver — presence only |
| Masked password input | Update Branch — Email Password | Browser Driver — presence + populated-state only; **value never captured** (FINDING-013) |

## 4. Skipped Areas

| Area | Why skipped |
|---|---|
| Create Branch screen | Already covered in depth by run-002; not re-explored. Its snapshot remains current. |
| `Change Threshold` popup (US 51489 §4) | Present on the Update screen, but exercising it would risk mutating a pre-existing branch's threshold. |
| Multi-city selection behaviour | A behavioural question better answered by a designed test case than an exploratory probe (see FINDING-015). |

## 5. Blocked Areas

| Area | Blocking condition | Recovery attempted (§21) |
|---|---|---|
| Performing Approve / Reject | Authorization permits acting only on records **this run created**; every record on the environment is pre-existing. | No fallback Discovery Mode can observe a state transition that was never performed. Correctly deferred to Stage `4M`, which will create its own record. **Not recorded as Unreachable** — the surface was reached and read; only the action was withheld. |
| Remarks mandatory-enforcement on Update | Same — requires attempting an action. | Same. |
| XC-06 self-approval | Requires creating a record then approving it from the same account. | Same — a Stage `4M` activity. Now testable (ProjectContext §4, Rev 8). |
| Field-level validation on the Update form (max lengths, Warning-Prompt-vs-Credit-Terms) | Requires typing into a pre-existing record's form. | Deferred to `4M` against a self-created record. |

## 6. Unreachable Areas

**None.** Every in-scope area had a viable Discovery Mode. No `Test Gap` Finding was required on Discovery-mechanism grounds.

## 7. Discovery Mode summary

**One mode used throughout: Browser automation — Browser Driver.**

The Playwright MCP server was deliberately **not** used, despite Search Branch and Update Branch both being first-contact screens with no `screens/*.json` (which would ordinarily select it per `mcp/README.md` §1.2). Both screens sit behind login, the MCP server runs `--isolated` and so cannot inherit the Driver's authenticated session, and a credential value may never be typed into an MCP tool call (§1.3). The Driver was therefore the only mechanism that could reach these screens at all. `driver.page` provided the read-only structural access that first-contact exploration needed.

**Evidence Category for every entry above: Direct Observation.** No Finding in this run rests on Documentation, Human Observation, Static Artifact or Assumption.

## 8. Carried-forward risk disposition (ProjectContext §6)

| Risk | Outcome this run |
|---|---|
| **RISK-BR-5** — do the Create-screen dispositions extend to Update? | **Resolved for 3 of 4.** PAN Number, Department, Payment-Gateway-on-Credit-Card all confirmed to extend on direct evidence. Import PNR **does not transfer** — Update shows a stored value, not a default; recorded as not-comparable rather than answered. |
| **RISK-BR-6** — permission model / action availability | **(a) state-dependent availability: RESOLVED** read-only, clean three-state pattern (§5 of the Search snapshot). **(b) role-differentiated availability: NOT OBSERVABLE** — single privileged account, as declared at Stage 1. |
| **RISK-BR-7** — Branch Name character set | **Resolved for the search field** — accepts specials unmodified, consistent with US 8599's "Alphabetic & Special Char". The create-field contradiction (TC-BR-003) is unchanged and out of this run's scope. |
| **RISK-BR-8** — Status vs Approval Status | **Resolved structurally.** The grid exposes **one** column (`Approval Status`); the Active/Inactive axis is filterable but never displayed (FINDING-014). What "approving updates its status accordingly" means for the Active/Inactive axis therefore cannot be evidenced from this UI — a question for Product, now backed by evidence. |
| **RISK-BR-9** — is pagination testable without seeding? | **Resolved: YES, comfortably.** 616 records across 62 pages at the default size of 10. **No seeding required** — the cost concern raised at Stage 1 is closed. |
| Environment reachability (open since 2026-07-29) | **Resolved — CONFIRMED reachable.** Login succeeded; 5/5 raw HTTP probes returned 200 in 50–850ms. |

---

# Coverage Summary — run-006 (Auto Reissue checkbox — Branch half)

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 1 (this run's section; the run-002 and run-003 sections above are unchanged) |
| In-scope surface (from Project Context) | The 8 *REV 9* rows of ProjectContext §2, plus the §3 row *Admin Itinerary for Branch-created bookings*, which was conditional on Stage 2 finding such bookings (it did) = **9 areas** |
| Generated | 2026-09-24 |

## 1. Coverage Percentage

**78%** — basis: 7/9 areas visited (6 Covered + 1 Partial). Skipped: 2.

## 2. Visited Screens

| Screen / URL | Module | Discovery Mode | Snapshot Artifact |
|---|---|---|---|
| Add Branch `/admin/branch/add` (never saved) | branch | Browser Driver, headed | `discovery/DiscoverySnapshot_BranchAutoReissue_run-006.md` |
| Edit Branch (BRN265) + Remarks | branch | Browser Driver, headed | `discovery/DiscoverySnapshot_BranchAutoReissue_run-006.md` |
| Branch grid + approve | branch | Browser Driver, headed | waypoint |
| Admin booking details for order `BRN265NDCORD2609169XJ1LC` | branch (the checkbox's effect) | Browser Driver, headed | `agency/discovery/BookingItinerary_Admin_run-006.md` (the same screen; the Branch-owned state is recorded there) |

## 3. Visited Components

| Component | Where Exercised | Discovery Mode |
|---|---|---|
| Auto Reissue checkbox + *Auto Reissue Credentials* multi-select | Add/Edit Branch | Browser Driver |
| GDS PCC-tab multi-select (Galileo, Amadeus) and an LCC Product Access row (AirArabiaEgypt) | Add Branch (unsaved) | Browser Driver |
| Remarks + maker-checker approve | Edit Branch, grid | Browser Driver |

## 4. Skipped Areas

| Area | Module | Why Skipped | Discovery Mode Available |
|---|---|---|---|
| Backend rules `S-3` … `S-6` against `/Master2/Branch` | branch | Probed against the Agency API only in this run | Browser Driver (in-flight body) |
| Regression smoke | branch | A Stage 3 test (RISK-BR-12) | Browser Driver |

## 5. Blocked Areas

| Area | Module | What Blocked It | Recovery Attempted (§21) | Discovery Mode |
|---|---|---|---|---|
| Read-time clean-up (part of the S-7 row) | branch | Needs a credential that became invalid after selection. Supplier changes aren't granted (RISK-BR-11) | Read-only credential list (see agency) | Browser Driver |

## 6. Unreachable Areas

None.

## 7. Roll-Up

| Status | Count |
|---|---|
| Visited Screens | 4 |
| Visited Components | 3 |
| Skipped | 2 |
| Blocked | 1 (inside a Partial row) |
| Unreachable | 0 |

**By Discovery Mode:** Browser Driver: 4 screens · Human Observation: `PO-21`, `PO-22`, `PO-26`.
