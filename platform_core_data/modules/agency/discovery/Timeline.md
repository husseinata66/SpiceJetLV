# Discovery Timeline — `agency`

---

## run-006 — 2026-09-23 / 2026-09-24 (times **UTC**; local is UTC+3)

Run `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch`. Discovery Mode: Browser Driver, headed (Admin, `http://192.168.1.60`) and Playwright direct login, headed (Portal, `:9500`).

> **How this log was built.** It wasn't typed line by line during the session. It was **assembled when the stage ended** from timestamps recorded at the time: each script's own `HH:MM:SS` log lines, and the tool-return time of every step. Those sources are kept verbatim in `runs/run-006…/discovery/evidence/44-session-output-extract.txt` and `43-portal-cycle-results.json`. §6 asks for a continuously appended log, so this is disclosed rather than presented as one.

```
2026-09-23
21:15  STAGE 2 start (headed, at the user's request). Target first probed on .70: no response
21:18  User: environment is .60, shared, same mutation rules
21:21  Safety policy check: raw URL classifies as Unknown -> Forbidden; grants are recorded against "Staging"
21:22  Browser Driver login on http://192.168.1.60 -> /dashboard (odeysysadmin role verified)          [00]
21:24  Navigate /admin/agency/add (unsaved): "Auto Reissue" checkbox found, unchecked                  [01-agency-add-form]
21:25  Tick Auto Reissue (unsaved): "Auto Reissue Credentials" picker appears; no network call         [02-agency-add-…]
21:34  User designates BRN265 ("you can use BRN265 all over the steps"); 21:35 BRANCH DedicatedTestData grants recorded
21:37  Read-only: the 3 agencies under BRN265, all Auto Reissue off. User picks AGN9780 (id 10961); AGENCY DedicatedTestData grants recorded; baseline saved [06]
21:38  Edit AGN9780: tick Auto Reissue, picker offers Sabre Staging (315) + NDCSabre staging (313); pick 315 [07,08]
21:39  Send For Approval -> PUT /Admin2/agency/10961 204 -> Inactive + Pending for approval             [10,11]
21:41  Approve (Remarks dialog) -> PATCH approveOrReject 200 -> Active + Approved                         [12,13]
21:41  Read back: form ticked, picker "Sabre Staging"; GET autoReissueEnabled true, [315]                [14]
2026-09-24
08:12  User: booking NDCEG-BR-F260924EAzzYT made under AGN9780, Sabre Staging, BOOKED
08:14  Dashboard search: counts under "Ticketed Document"; the tile path isn't an Itinerary route       [15,16]
08:20  STOP at the user's request (read-only up to here)
09:56  User-guided path: /booking/search-booking -> Flight -> ref -> Search -> open booking             [17,18]
09:56  Itinerary GET: bookingStatus 2, lockedStatus 0, canAutoReissue true, canManualReissue true
09:58  Lock taken (Created By lock icon); lock holder Mohamed Soliman                                   [19,20]
10:00  Passenger panel: Void/Cancel · Manual Reissue · Reissue · Sync PNR · Release PNR. None clicked   [21,22,23]
10:04  AGN9780 untick -> PUT 204 (reissueCredentials []) -> Pending -> PATCH 200 -> Approved             [24]
10:05  Read back: autoReissueEnabled false, [315] kept (S-7)                                             [25]
10:05  Itinerary: canAutoReissue false, Reissue hidden; Manual Reissue still shown (BRN265 on)           [26]
10:30  S-2 (UI): on + empty picker -> "Required", no request sent                                        [34-rule-S-2]
10:30  S-4: PUT body [{}] -> 400 "Every auto-reissue credential must have an ID"                         [34-rule-S-4]
10:31  S-5: [999999] -> 400 "Every auto-reissue credential must exist and be active"                     [34-rule-S-5]
10:31  S-6: [315,315] -> 400 "Auto-reissue credentials must not contain duplicates"                      [34-rule-S-6]
10:31  S-8: [277] -> 400 "Each auto-reissue credential must be mapped to this organization"; nothing saved [34-rule-S-8]
10:32  S-5 re-run: message briefly shown on screen after the 400                                         [35]
10:34  Supplier credentials (page 1 of 10): autoReissueAllowed true 3, false 7; no field on the edit screen [36,37]
10:39  Unsaved AGN9780: Sabre tab "Sabre Staging" -> picker ["Sabre Staging"]; left without saving       [38]
11:45  User corrects PO-21 (hard-coded list NDCsbr/Sabre/TravelportNdc/Galileo; Amadeus unsupported)
12:03  User: PO-22 (checkbox shows button only; credential checked on Reissue), PO-23, PO-24
13:02  Portal in scope (PO-25). Portal login stored in git-ignored credentials.json (PORTAL_60)
13:10  Portal login AGN9780 -> /dashboard
13:11  Portal OFF: booking details via Order Id link; lockedStatus 0; canAutoReissue false; no Reissue     [41-0,42-0]
13:11  Admin edit AGN9780: picker now offers only GalileoLive (277; manual change by the user); tick
13:11  Edit-form Approve -> single PUT /Admin2/agency/10961; read back true, [277], approvalStatus 1
13:12  Portal ON: canAutoReissue true; Reissue SHOWN; lockedStatus 0; no Manual Reissue                  [41-1,42-1]
13:13  Admin untick -> edit-form Approve -> single PUT; read back false, [277], approvalStatus 1
13:13  Portal OFF: canAutoReissue false; Reissue hidden                                                  [41-2,42-2]
13:43  User: PO-26 (visibility hierarchy); 13:46 on-behalf bookings follow the Agency
13:52  Write-up started
14:00  FINDING-013 … FINDING-016 created; 42-portal-1 annotated copy drawn (Q1a, Q1b)
14:10  QA Assessment Report Rev 4 (+ HTML), Coverage, Findings Summary, 3 snapshots written. STAGE 2 artifacts -> Pending Review
14:16  User answers OQ-AG-R6-1: no lock is needed on the Portal. FINDING-016 -> Rejected (confirmed intended); PO-25 updated
```

Numbers in brackets are files in `runs/run-006…/discovery/evidence/`. **Never done:** booking, clicking Reissue / Release PNR / Void-Cancel, or changing any record other than AGN9780 and BRN265.

---

## run-004 — 2026-08-18 (times local, UTC+3; the raw session log is `evidence/run-004/phase_a_timeline.txt`)

Discovery Mode for every entry: Browser automation — Browser Driver, headed.

```
09:52  Raw HTTP probe of http://192.168.1.70/            -> 200 (branch reuse R-4: probe before declaring a blocker)
09:52  Raw HTTP probe of /auth/login                     -> 200
09:53  STAGE_STARTED (stage 2) and SKILL_STARTED recorded
09:54  Authenticated as odeysysadmin (headed) — credentials re-verified, Project Context §4 item closed
09:54  Navigate /admin/agency — list rendered, grid columns and first rows read
09:56  Navigate /admin/agency/edit/949
09:56  Pre-fill polled at 250 ms intervals -> 61/78 inputs populated by 1000 ms (branch reuse R-2)
09:56  Full-page screenshot captured; 81 controls, 11 PrimeNG widgets, 1 table inventoried
09:56  OBSERVED: "Airline Supplier credential (PCC)" section PRESENT — contradicts run-001 FINDING-002
09:56  OBSERVED: Branch control disabled + readOnly, showing "Test (BRN2)" — PO-10
09:56  OBSERVED: Product Access table columns STATUS/SUPPLIER NAME/CREDENTIAL NAME/PRODUCT NAME/DESCRIPTION — PO-8
09:56  OBSERVED: stored document and stored logo both present on load — PO-7
09:58  Validation probing on the update form: blur alone renders no message
09:59  Navigate /admin/agency/add — empty create form captured
09:59  Clicked "Send For Approval" on the EMPTY create form
09:59  Non-GET requests during the attempt: NONE — no record could be created
09:59  Captured 23 x "Required" + 1 x "Please select at least one supplier."
10:00  Field-to-message map extracted (PO-12 satisfied)
10:02  Navigate /admin/agency/edit/949 — format and max-length probes, all by real keystrokes (branch reuse R-1)
10:02  "Agency *" cleared           -> "Required"
10:02  "Email ID *" <- not-an-email -> "Please enter a valid email"  (PRD XC-18 verbatim)
10:02  "Credit limit *" <- abcdef   -> value reverted to 1000000, NO message   [FINDING-010 candidate]
10:02  "Post office box *" <- 12 ch -> 8 kept (max length enforced)
10:02  "Credit Terms (Days) *" <- 15 ch -> 11 kept
10:02  "Phone No *" <- abcdefgh     -> field emptied, then "Required"
10:02  "Company URL" <- "not a url at all" -> accepted, NO message           [FINDING-010 candidate]
10:03  All probed fields restored in-form; nothing saved
10:04  PCC dependency probe: supplier row DESELECTED -> PCC section disappears entirely
10:04  Screenshot of the PCC-absent state captured
10:04  Form reloaded (no save) -> PCC section and values return                [FINDING-008]
10:04  Cancel probe: Company URL changed asdas -> run004-cancel-probe, then Cancel clicked
10:04  Cancel navigated to /admin/agency; record reopened shows "asdas" — nothing persisted — PO-6
10:06  Annotated evidence, pass 1: Q1/Q4/Q5 drawn, Q2/Q3 MISSING (malformed element ids broke the selectors)
10:06  Missing rectangles treated as missing questions, not cosmetic: selectors rebuilt id-free
10:06  Annotated evidence, pass 2: Q1 Q2 Q3 Q4 Q5 all drawn, none missing
10:07  Tight annotation captured for Q1 (Manager Name only, #id-ManagerName)
10:09  Q5/Q6 annotation captured with Company URL holding the invalid value; value restored afterwards
10:12  FINDING-008 created (Requirement Gap)
10:13  FINDING-009 created (Observation)
10:14  FINDING-010 created (Bug, Medium)
10:15  FINDING-011 created (Observation)
10:16  FINDING-012 created (Requirement Gap)
10:18  ReCheck_run-004.md written — run-001's seven Findings re-checked, none of their packages edited
10:22  Discovery Artifacts completed -> Pending Review
```

**Session safety record.** Across all six browser sessions the only non-GET requests were `…/Master2/state/search` and `…/Admin2/agency/search`, both read operations. No Agency record was created, updated, approved, or rejected. Every in-form edit was reverted or discarded by reload, and the one submit attempt was made against an empty create form that produced no server traffic at all.

```
11:41  Human answer: Agency suppliers are inherited from the parent Branch (check/uncheck only) -> BR-006 recorded
11:42  Read-only lookup: Branch NDC1_Ahmed Ayman = BRN287, Agency NDC1_Ahmed Ayman = AGN9799 (/admin/agency/edit/11006)
11:43  BRN287 read: 63 supplier rows, only NDCGal ticked
11:45  In-form probe (never saved): ticked Amadeus/AmadeusNDC/Galileo/Sabre -> one PCC tab appeared per supplier
11:45  Reloaded BRN287 -> back to NDCGal only; nothing persisted
11:46  Read Galileo tab's PCC options: Galileo Live UAE, Live EGY PCC, Robot Test, KSA Galileoo, GalileoLiveSTAGING
11:52  Human answer: Manager Name comes from the Supplier CRUD -> searched Supplier Credentials + Credential Field: NOT found there
11:55  SAFETY: Supplier Credentials record exposed live API credentials in evidence -> screenshot deleted, values scrubbed from JSON
12:01  Human supplied the exact route -> /master/supplier/supplier/edit/119: Manager Name * present, mandatory, EDITABLE -> BR-007
12:05  Checked execution_safety_policy.json before acting on the Branch:
         mutation/Shared  = Approval Required  (grantable)
         approval/Shared  = Forbidden (ABSOLUTE, no grant lifts it)
       => this run could submit a Branch change but never approve it. Declined to act; asked the human to make the change.
12:14  Human made and approved the Branch change (Amadeus + Sabre added to BRN287)
12:14  READ-ONLY verification: BRN287 now carries Amadeus, NDCGal, Sabre
12:14  Agency AGN9799 shows all three suppliers, all ticked, WITHOUT any action on the agency -> cascade confirmed
12:15  Agency PCC section now has three tabs (Amadeus | Sabre | NDCGal), each with the SAME three controls
12:15  Page-text search across all tabs: Search Supplier Credential PCC = absent, Ticketing Supplier Credentials PCC = absent
12:16  OQ-1 answered by experiment; OQ-2 answered and closed; FINDING-008 and FINDING-009 updated
```

**Second safety record (2026-08-18 afternoon).** Everything above was a read or an in-form edit discarded by reload. **No Branch, Agency, Supplier, or Supplier Credential record was created, updated, approved, or rejected by this run.** The one change to Branch `BRN287` was made and approved by the human; this stage only observed its effect.

---

## run-001 — 2026-07-31 (retained, unchanged)

# Discovery Timeline — `run-001__2026-07-31_11-56-38__UserStory__US-4222UpdateAgency`

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-001__2026-07-31_11-56-38__UserStory__US-4222UpdateAgency` |
| Revision | 1 |
| Run Started | 2026-07-31 13:57 (local) |
| Run Ended | 2026-07-31 14:20 (local) |

## Log

```
13:52  Stage 2 start. Active module resolved from modules.json: agency [single]
13:52  Read modules/agency/context/ProjectContext.md — status: Approved, revision 1
13:53  Resolved browser mechanism: Browser Driver (default for authenticated flows,
       platform_core/tools/mcp/README.md §1.2). Playwright MCP not selected — the whole
       Agency update flow is behind login and a credential must never be typed into an
       MCP tool call (§1.3)
13:53  Read browser/profile.json — headless: true, login selectors present,
       defaultBaseUrl http://192.168.1.70
13:54  Environment reachability check: HTTP 200, connect 0.021s (curl, no auth)
13:59  Authenticated headless as odeysysadmin — landed http://192.168.1.70/dashboard
13:59  Title: "NDC - Dashboard". Console: clean (0 errors)
13:59  Top-level nav read: Dashboard, Admin, Master, Rule Engine, Settings,
       User Management, Booking-Mid Office, Profile, Reports, PNR Query, Transfer PNR
13:59  Screenshot: 01_after_login
13:59  Expanded Admin menu — children: Company, Branch, Agency, Staff
14:00  Clicked "Agency" text; landed /admin/operating-country instead — mis-click on a
       collapsed submenu, not an application fault. Route reading substituted for
       label clicking from here on
14:00  Screenshot: 99_failure_02 (recorded; not a Finding)
14:01  Read Admin submenu hrefs: only /admin/branch and /admin/staff are leaf links —
       Company and Agency are expandable groups
14:01  Expanded Agency group — children: /admin/agency, /admin/login-details,
       /admin/registration-requests, /admin/category-management,
       /admin/agency-categorization
14:01  Navigated /admin/agency — "NDC - Agency". Grid present, 903 agencies,
       columns: Code, Agency Name, Country Name, City, Status, Approval Status,
       Branch Name, Actions
14:01  Screenshot: 07_agency_list
14:02  Row action affordance found: pencil icon (PrimeNG). Clicked row 1
14:02  Landed http://192.168.1.70/admin/agency/edit/949 — the UPDATE form
14:02  Screenshot: 09_agency_edit_form
14:03  Counted controls: 74 fields, 2 file inputs, 35 checkboxes, 4 radios,
       0 <table>, 0 <select> — dropdowns are custom components
14:03  Screenshot: 10_edit_full (full page, ~4000px)
14:04  Label-for/wrapper heuristics returned "(unlabelled)" for every control.
       Switched approach: read the page's rendered visible text instead — the same
       view a manual tester reads, and what a behavioural inventory needs
14:05  Full section list obtained: Agency Master, Agency Owner Details, Upload Document,
       Agency Logo, Wonder Travel Sales Contact, Bank Account Details, Payment settings,
       Product Access Details, Agency Features, Remarks
14:05  Observed: attached document is "screen-1-logo-black-and-white.png" (a PNG)
14:05  Observed: Payment option row renders 28 entries; 23 read as given names / letters
14:06  Observed: no Airline Supplier Credential / PCC section anywhere on the form
14:07  Navigated /admin/agency → clicked "Add agency" → /admin/agency/add (CREATE form)
14:07  Screenshot: 20_create_full
14:07  Term comparison CREATE vs UPDATE: PCC section absent from BOTH; Designation
       absent from BOTH; Remarks present on UPDATE only
14:08  Confirmed Country field is readOnly on the UPDATE form (AC-1 satisfied)
14:09  Screenshot: 30_payment_options
14:09  Payment option membership confirmed by text-slice between section headings: 28 entries
14:11  Validation probe, non-persisting (clear → blur → read → restore):
       Agency          → "Required"
       Post office box → "Required"
       Contact person  → "Required"
       Credit limit    → "Required"
       Bank name       → (no message; optional in AC-6)
14:11  Read app-marked mandatory fields: 23 fields carry "*"
14:12  Navigated away to /admin/agency WITHOUT saving. No dialog raised.
       Send For Approval / Approve / Reject never clicked
14:14  Evidence capture pass: per-Finding packages written under discovery/findings/,
       shared screen evidence under discovery/evidence/
14:14  Session totals: 136 network events, 0 responses >= 400, 0 console messages
14:15  FINDING-001 created (Category: Requirement Gap) — validation message mismatch
14:15  FINDING-002 created (Category: Requirement Gap) — PCC section absent
14:16  FINDING-003 created (Category: Observation) — Payment option data pollution
14:16  FINDING-004 created (Category: Observation) — no document type restriction
14:17  FINDING-005 created (Category: Requirement Gap) — undocumented mandatory fields
14:17  FINDING-006 created (Category: Requirement Gap) — Designation absent
14:18  FINDING-007 created (Category: Test Gap) — segregation of duties unassessable
14:20  Stage 2 end. No Event-Driven Capture trigger (§5.2) fired at any point in the run:
       no HTTP 4xx/5xx, no timeout, no console error, no JS exception, no broken image,
       no unexpected dialog, no crash, no unexpected navigation
```

**Note on the mis-click at 14:00.** It is logged because the Timeline must let a reader reconstruct the session, and a screenshot named `99_failure_02` exists on disk that would otherwise look unexplained. It was this skill navigating by label where the label belonged to a collapsed menu group — corrected by reading route hrefs instead. No application defect, and no Finding.
