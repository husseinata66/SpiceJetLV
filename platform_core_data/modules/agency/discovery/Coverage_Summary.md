# Coverage Summary — `agency`

## run-006 — 2026-09-24 (current)

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 3 |
| In-scope surface (from Project Context) | The 12 Revision 5 rows of ProjectContext §2 (Auto Reissue), plus the Portal row that `PO-25` added = **13 areas** |
| Generated | 2026-09-24 |

### Coverage percentage

**85%** — basis: 11/13 declared areas visited (9 Covered + 2 Partial). Blocked: 1. Skipped: 1. This is a count, not a judgment about depth.

### Visited screens

| Screen / URL | Module | Discovery Mode | Snapshot Artifact |
|---|---|---|---|
| Add Agency `/admin/agency/add` (never saved) | agency | Browser Driver, headed | `discovery/AgencyUpdateForm_AutoReissue_run-006.md` (the create state is recorded there) |
| Edit Agency `/admin/agency/edit/10961` (AGN9780) | agency | Browser Driver, headed | `discovery/AgencyUpdateForm_AutoReissue_run-006.md` |
| Agency grid `/admin/agency` (status Both) + approve dialog | agency | Browser Driver, headed | waypoint; evidence `11`, `12`, `13` |
| Search Booking `/booking/search-booking` → Flight | agency (the checkbox's effect) | Browser Driver, headed | waypoint; evidence `17` |
| Admin booking details `/booking/booking-details/AGN9780NDCNDCORD260924GKP8CP` | agency (the checkbox's effect) | Browser Driver, headed | `discovery/BookingItinerary_Admin_run-006.md` |
| Portal `/myBooking` → `/myBooking/booking-details/AGN9780NDCNDCORD260924GKP8CP` | agency (the checkbox's effect) | Playwright direct, headed | `discovery/BookingItinerary_Portal_run-006.md` |
| Supplier credentials `/master/supplier/supplier-credentials` (+ edit 277), read only | master-supplier (boundary) | Browser Driver, headed | waypoint; evidence `36`, `37` |

### Visited components

| Component | Where Exercised | Discovery Mode |
|---|---|---|
| Auto Reissue checkbox + *Auto Reissue Credentials* multi-select | Add/Edit Agency | Browser Driver |
| GDS PCC-tab multi-select (*Airline Supplier credential (PCC)*) | Edit Agency (Sabre tab) | Browser Driver |
| Maker-checker Remarks dialog | Agency grid approve | Browser Driver |
| Itinerary passenger panel + action buttons; Created By lock | Admin and Portal booking details | Browser Driver / Playwright direct |

### Skipped areas

| Area | Module | Why Skipped | Discovery Mode Available |
|---|---|---|---|
| Regression smoke (Create/Update unaffected) | agency | A Stage 3 test, not a Discovery question (RSK-014) | Browser Driver |
| `S-3` (off + credentials on update) | agency | Not run before the write-up. It's a success case that would take AGN9780 through another cycle | Browser Driver (in-flight body) |

### Blocked areas

| Area | Module | What Blocked It | Recovery Attempted (§21) | Discovery Mode |
|---|---|---|---|---|
| Read-time clean-up (spec §4) and `S-5` inactive variant | agency | Needs a credential that is inactive, or became invalid after selection. None was found on page 1 of the credentials list, and changing supplier data isn't granted (RSK-012) | Read the credential list read-only (page 1). The paginator didn't advance | Browser Driver |

### Unreachable areas

None.

### Roll-up

| Status | Count |
|---|---|
| Visited Screens | 7 |
| Visited Components | 4 |
| Skipped | 2 (1 area + `S-3` within a Partial area) |
| Blocked | 1 |
| Unreachable | 0 |

**By Discovery Mode:** Browser Driver: 6 screens · Playwright direct (Portal): 1 screen · Human Observation: `PO-21` … `PO-26` statements.

---

## run-004 — 2026-08-18 (retained, unchanged)

| Field | Value |
|---|---|
| Produced by run | `run-004__2026-08-17_14-35-25__UserStory__US-4222-UpdateAgency` |
| In-scope surface (Project Context revision 3 §2) | US-4222's ten AC groups plus its four Expected Outcome actions, on the Admin → Agency update flow. Agency search and Create Agency are in scope **as means only** |
| Discovery Mode for every entry below | Browser automation — **Browser Driver**, headed |
| Generated | 2026-08-18 |

### Coverage percentage

**100%** — basis: **4/4** in-scope screens visited (dashboard/login check, Agency list, Agency update form, Agency create form).

### Visited screens

| Screen | Route | Discovery Mode | What was done |
|---|---|---|---|
| Login → dashboard | `/dashboard` | Browser Driver, headed | Credentials re-verified — the open item in Project Context §4 |
| Agency list | `/admin/agency` | Browser Driver, headed | Grid columns and first rows read; used to reach the record |
| **Agency update form** | `/admin/agency/edit/949` | Browser Driver, headed | Full structural read, pre-fill polling, validation and max-length probes, Cancel check, PCC dependency probe, annotated evidence |
| Agency create form | `/admin/agency/add` | Browser Driver, headed | Empty-submit validation capture only |
| Branch `BRN287` (`NDC1_Ahmed Ayman`) | `/admin/branch/edit/BRN287` | Browser Driver, headed | **Read-only, plus in-form probes discarded without saving.** Visited to answer AC-9's inheritance question, not to assess the `branch` module |
| Agency `AGN9799` (`NDC1_Ahmed Ayman`) | `/admin/agency/edit/11006` | Browser Driver, headed | Read-only observation of the supplier cascade before and after the human's approved Branch change |
| Supplier master | `/master/supplier/supplier/edit/119` | Browser Driver, headed | **Targeted corroboration read only** — to locate the source of `Manager Name`. The `master-supplier` module was not assessed and stays out of scope |

### Visited components

PrimeNG dropdown · PrimeNG multiselect · PrimeNG calendar · repeatable-row `Add` pattern · phone control with country selector · checkbox group · in-cell editable table. Each noted once, not once per occurrence.

### Per-criterion depth

| AC group | Section present? | Discovery outcome this run |
|---|---|---|
| AC-1 Agency Master | yes | Every field inventoried with type, required, read-only and max length. `Country` read-only confirmed; **Branch confirmed non-editable** (`PO-10`); `Fax No` extra; `Company URL` accepts non-URLs (FINDING-010) |
| AC-2 Agency Owner Details | yes | Three fields, all mandatory. Email format message captured verbatim |
| AC-3 Upload Document | yes | Still no `accept` restriction; existing `.png` persists on load (`PO-7`). **Upload / replace / remove not executed** |
| AC-4 Agency Logo | yes | `accept="image/*"`; stored logo renders as a preview (`PO-7`). **2 MB limit not executed** |
| AC-5 Sales Contact | yes | `Designation` still absent. **Multi-row `Add` not executed** |
| AC-6 Bank Account Details | yes | Three optional fields, all empty on this record |
| AC-7 Payment Settings | yes | All eleven fields plus `Outstanding Threshold *` inventoried; 29 payment options (FINDING-011); max-length caps measured by real keystrokes |
| AC-8 Product Access Details | yes | **Table layout confirmed exactly as `PO-8` describes**, with its five columns and one supplier row |
| AC-9 Airline Supplier Credential (PCC) | **yes** | Fully observed after the 2026-08-18 experiment: one tab per supplier inherited from the parent Branch, each with three controls. The story's "filters" are the tabs. `Search Supplier Credential PCC` and `Ticketing Supplier Credentials PCC` confirmed absent across five tabs on two Branches and two Agencies (FINDING-008) |
| AC-10 Import PNR toggle | yes | Present and ticked. **Downstream effect not executed** — that is `import-pnr`'s module and needs a booking-side action |
| Expected Outcome — Cancel | yes | **Executed and verified** — discards without persisting (`PO-6`) |
| Expected Outcome — Submit for Approval | yes, as `Send For Approval` | Button present on both forms; label difference re-confirmed |
| Expected Outcome — Approve | yes | Button present on the update form. **Not executed** |
| Expected Outcome — Reject | yes | Button present on the update form. **Not executed** |

### Skipped areas

| Area | Why |
|---|---|
| Approve / Reject execution | Requires a **self-created** record; `APPROVE Shared` and `REJECT Shared` are `Forbidden (absolute)` and no grant lifts them. Belongs to Stage 5A, which creates its own record under the run-004 grant |
| Document upload, logo upload, and their limits | Executing them changes a shared record. Belongs to Stage 5A against a self-created record |
| Unicode / emoji / payload-shaped input probes | Chosen against on a shared record. Every probe this run performed is reversible in-form without saving; these add risk without adding to what XC-17–XC-20 already settle |
| Adding a second supplier row or a second document / bank / sales-contact row | Would require saving Product Access changes on a shared record |
| Role authorization, maker–checker separation, self-approval | **Decided out of scope** by `PO-1`, `PO-6`, `PO-9`. Owned by the future Role CRUD module |
| `Save as Draft` | **Decided out of scope** by `PO-5`; kept on record as a future coverage item |
| `Transfer Pnr Option` · `Blue Command Screen` · `Enable Search Limit` | **Decided out of scope 2026-08-18** by the product owner — to be discussed when the User Story for their own feature arrives. Evidence kept in FINDING-012 so that story starts from an observation rather than a blank page |
| All five Reflection areas | **Decided out of scope** by `PO-11` — impact-awareness boundaries only |

### Blocked areas

*(none)* — nothing this run attempted was blocked. Every skip above is a decision or a safety boundary, not an obstruction, and the distinction is deliberate.

### Unreachable areas

*(none)* — every in-scope screen was reachable live with the credentials provided.

### Fixture precondition carried to Stage 3 and Stage 5A

AC-9 is reachable only on an Agency whose parent Branch carries at least one supplier with a credential selected (`BR-006`, `BR-008`). The answer of 2026-08-18 is that the suite **builds its own Branch first**, selects its supplier and supplier credential, then creates its Agencies under it — keeping every record `SelfCreated`, which is the only ownership class where the approve step is grantable at all.

**This needs a Stage 1 grant that does not exist yet.** Project Context §5 forbids this run from creating or editing a Branch. Until that is revised, the fixture design is recorded, not authorized.

### Coverage honesty note

**Screen coverage is 100%; criterion coverage is not**, and the gap is entirely made of actions that mutate. Discovery reads; Stage 5A executes. Nine of the fourteen rows above are fully observed, four are observed-but-not-executed, and AC-9 is partial because part of it is absent from the application. No area was left uncovered for lack of time or lack of a tool.

---

## run-001 — 2026-07-31 (retained, unchanged)


| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-001__2026-07-31_11-56-38__UserStory__US-4222UpdateAgency` |
| Revision | 1 |
| In-scope surface (from Project Context) | US-4222's **ten AC groups** plus its four Expected Outcome actions, on the Admin → Agency update flow. Agency search is in scope **as a means only** (reaching the record under test), not as a test target. `modules/agency/context/ProjectContext.md` §2. |
| Generated | 2026-07-31 14:20 |

## 1. Coverage Percentage

**100%** — basis: 3/3 in-scope screens visited (Agency list, Agency update form, Agency create form).

**Screen coverage is not criterion coverage, and the difference matters here.** Every screen the story touches was reached and read, which is what this ratio measures. Assessed against US-4222's *acceptance criteria* the picture is different, because Discovery reads and observes while Stage 4M executes:

| AC group | Section present? | Discovery outcome |
|---|---|---|
| AC-1 Agency Master | yes | Inventoried; `Country` confirmed read-only; `Fax No` extra; field order differs (FINDING-005) |
| AC-2 Agency Owner Details | yes | Inventoried; all three fields present and mandatory |
| AC-3 Upload Document | yes | Inventoried; no type restriction, PNG attached (FINDING-004). Upload/remove/replace behaviour **not executed** |
| AC-4 Agency Logo | yes | Present, `accept="image/*"`. The 2 MB limit **not executed** |
| AC-5 Sales Contact | yes | `Designation` absent (FINDING-006); multi-row `Add` **not executed** |
| AC-6 Bank Account Details | yes | Inventoried; all three optional, as the story states |
| AC-7 Payment Settings | yes | Inventoried; `Outstanding Threshold *` extra (FINDING-005); option list polluted (FINDING-003) |
| AC-8 Product Access Details | yes | Grid inventoried; no mandatory markers, unlike the story |
| AC-9 Airline Supplier Credential (PCC) | **no** | **Absent from both forms** (FINDING-002) |
| AC-10 Import PNR toggle | yes | Present in Agency Features; toggle behaviour **not executed** |
| Expected Outcome — Cancel | yes | Button present; discard behaviour **not executed** |
| Expected Outcome — Submit for Approval | yes (as `Send For Approval`) | Button present; label differs (FINDING-007) |
| Expected Outcome — Approve / Reject | yes | Buttons present but **unassessable** with one identity (FINDING-007) |

## 2. Visited Screens

| Screen / URL | Module | Discovery Mode | Snapshot Artifact |
|---|---|---|---|
| Agency list — `/admin/agency` | `agency` | Browser automation (Browser Driver) | `discovery/AgencyList.md` |
| Agency update form — `/admin/agency/edit/949` | `agency` | Browser automation (Browser Driver) | `discovery/AgencyUpdateForm.md` |
| Agency create form — `/admin/agency/add` | `agency` | Browser automation (Browser Driver) | `discovery/AgencyCreateForm.md` |

**Incidentally traversed, not in scope and not snapshotted:** the Dashboard (`/dashboard`, the post-login landing page) and Operating Country (`/admin/operating-country`, reached by the mis-click logged at 14:00 in the Timeline). Neither is part of US-4222's surface; both are recorded here so the session is reconstructable.

## 3. Visited Components

| Component | Where Exercised | Discovery Mode |
|---|---|---|
| Global left/top navigation (Admin → Company/Branch/Agency/Staff, expandable groups) | Dashboard, all Agency screens | Browser automation (Browser Driver) |
| Search-and-grid pattern (criteria fields + paginated results grid + row action icons) | Agency list | Browser automation (Browser Driver) |
| Custom dropdown (PrimeNG-style; renders as a div, not `<select>`) | Branch, State, City, Account Type, Invoice generation, Month, Year | Browser automation (Browser Driver) |
| International phone input (country flag + dial code) | Phone No, Owner Phone Number, Sales Phone Number | Browser automation (Browser Driver) |
| Checkbox group | Payment option, Select Product, Agency Features | Browser automation (Browser Driver) |
| Radio group | IATA Agency (yes/No), Agency Business Type (B2B/Freelancer) | Browser automation (Browser Driver) |
| File upload row (`Browse`/`Upload` + `Add` for extra rows) | Upload Document, Agency Logo | Browser automation (Browser Driver) |
| Inline field validation (red border + message beneath) | Agency, Post office box, Contact person, Credit limit | Browser automation (Browser Driver) |

## 4. Skipped Areas

| Area | Module | Why Skipped | Discovery Mode Available |
|---|---|---|---|
| `/admin/category-management` · `/admin/agency-categorization` | `agency` | Both appear in the Agency submenu and neither is named by US-4222. Exploring them would widen scope beyond the story, which §5.3.1 #3 makes a Human Decision rather than this stage's call. | Browser automation, if scope is widened |
| `/admin/login-details` · `/admin/registration-requests` | `agency` | Same reason; the Project Context §3 puts both out of scope for this run (they belong to the module but to a different story). | Browser automation, if scope is widened |
| Semantics of `Agency Business Type`, `Transfer Pnr Option`, `Blue Command Screen`, `Enable Search Limit` | `agency` | Undocumented switches on live commercial configuration (FINDING-005). Toggling them on shared staging has no defined expected result and no requirement to check against. | Browser automation, once a requirement exists |
| The five Reflection areas (Rule Engine, Search & Booking, NDC Portal, Reports, Top Up) | others | Project Context §3 records these as impact-awareness pending story Open Question #8. Verifying them needs bookings/payments, which this environment's constraints forbid outright. | Browser automation for read-only views only |

## 5. Blocked Areas

| Area | Module | What Blocked It | Recovery Attempted (§21) | Discovery Mode |
|---|---|---|---|---|
| Maker-vs-checker separation on the update flow | `agency` | Only one credential exists on this install (`odeysysadmin`, Super Admin per PRD §2), so the maker and the checker are necessarily the same identity. | Yes — considered and none available. No lower-priority Discovery Mode can supply a second credential; a mode substitution cannot observe an identity into existence. Recorded as FINDING-007 rather than resolved. | Browser automation (single identity only) |

## 6. Unreachable Areas

| Area | Module | Why Unreachable | Finding / Open Question ID |
|---|---|---|---|
| AC-9 — Airline Supplier Credential (PCC): the section and its five fields | `agency` | The section does not render on either the update or the create form, so there is no surface to explore. Confirmed on both forms rather than assumed from one. | FINDING-002 |
| AC-5 — `Designation` dropdown | `agency` | Field absent from both forms. | FINDING-006 |

## 7. Roll-Up

| Status | Count |
|---|---|
| Visited Screens | 3 |
| Visited Components | 8 |
| Skipped | 4 |
| Blocked | 1 |
| Unreachable | 2 |

**By Discovery Mode:** Browser automation (Browser Driver): 3 screens, 8 components, all 7 Findings. No other Discovery Mode was used, and none was needed — the highest-priority mode (§8.1 #1) was available for the entire in-scope surface, so nothing in this run rests on a fallback mode or on a substituted, weaker Evidence Category.

**Why the Browser Driver and not Playwright MCP.** Both are selectable peers for browser automation (`platform_core/tools/mcp/README.md` §1.1). The Driver was chosen because the entire Agency update flow sits behind a login, and a credential value must never be typed into an MCP tool call — MCP arguments are conversation-visible (§1.3). `BrowserDriver.authenticate()` fills the login form in-process and never exposes the value. The Driver ran headless throughout, which is the platform default and costs no evidence: screenshots, network and console are captured identically either way, so the Evidence Category and Confidence ceiling of this run are unaffected (§18).
