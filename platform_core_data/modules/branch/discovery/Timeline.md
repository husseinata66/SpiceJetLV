# Discovery Timeline — run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch` |
| Revision | 1 |
| Run Started | 2026-08-03 |
| Run Ended | 2026-08-03 |

## Log

```
T+00:00  Confirm STG (http://192.168.1.70) reachability via HTTP request — 200 OK
T+00:01  Discover playwright npm package not installed; Browser Driver unusable (infrastructure gap unrelated to the application)
T+00:02  npm install run to install devDependency `playwright` — resolves the gap
T+00:03  Stage 2 start — Explore module: branch
T+00:04  BrowserDriver.authenticate({env: 'STG'}) — login succeeded, landed on /dashboard as Super Admin
T+00:04  Screenshot: post-login state (evidence/01-post-login.png)
T+00:05  Inspect Dashboard nav text — confirms top-level tabs (Dashboard, Admin, Master, Rule Engine, Settings, User Management, Booking-Mid Office, Profile, Reports, PNR Query, Transfer PNR)
T+00:06  Click "Admin" text — landed back on /dashboard (wrong element: matched profile-menu "odeysysadmin" substring, not the Admin tab)
T+00:07  Investigate: 2 elements match text=Admin; index 1 (span.p-tabview-title) is the real Admin tab
T+00:08  Click span.p-tabview-title:has-text("Admin") — navigated to /admin/operating-country; left nav reveals Company / Branch / Agency / Staff
T+00:09  Click "Branch" in left nav — navigated to /admin/branch (Search Branch grid)
T+00:09  Screenshot: Search Branch grid (evidence/03-search-branch-grid.png)
T+00:10  Click "Add branch" — navigated to /admin/branch/add (Create Branch form)
T+00:10  Screenshot: Create Branch full page, initial state (evidence/04-create-branch-fullpage.png)
T+00:11  Extract field labels via DOM — confirms Branch Details / Branch Email Config Info / Branch Contact Info / Branch Sales Configuration / Product Access Details / Import PNR sections
T+00:12  DOM check: "Department" text absent from page body — candidate raised
T+00:12  DOM check: "PAN" text absent from page body — candidate raised
T+00:13  DOM check: Import PNR checkbox `checked` property = false — candidate raised
T+00:13  DOM check: Flight checkbox `checked=true, disabled=false` — candidate raised
T+00:14  Zoomed screenshot of Payment Option row — reveals ~25 non-payment-method checkboxes (person names, "m"/"f") mixed with Cash/Wallet/Credit Card/BANQUE MISR/Fawry — candidate raised
T+00:15  Probe: Post Office Box filled with 12-char alphanumeric value — accepted, no maxlength attribute, no error
T+00:15  Probe: Credit Limit filled with "abc123xyz789" — accepted in raw input; blur reveals inline error "Please enter a numeric value (with 2 decimal places allowed)."
T+00:16  Probe: Reaching Percentage filled with "150.1234" — blur reveals inline error "Reaching Percentage should not be greater than 100%" (AC's 100% cap confirmed enforced)
T+00:16  Probe: Warning Prompt(Days) filled with 14-digit value — accepted, no maxlength attribute, no error
T+00:17  Screenshot: Create Branch full page after boundary probes, with visible inline errors under Credit Limit and Reaching Percentage (evidence/05-create-branch-after-probes.png)
T+00:18  Fresh navigation #2 to /admin/branch/add (recovery attempt for Payment Option/Import PNR/Flight candidates per §5.7 "Unexpected UI rendering") — all three conditions persisted
T+00:18  DOM check: "Search Supplier Credentials PCC" and "Ticketing Supplier Credential PCC" text both absent from page body — confirms AC (PCC fields correctly removed from UI)
T+00:19  Probe: Credit Limit filled with 16-digit numeric value ("1234567890123456") — accepted in full, no maxlength attribute, no error
T+00:19  Click Credit Card checkbox (recovery attempt #2 for Payment Gateway candidate, per §5.7) — no "Payment Gateway" text appears before or after, on this second independent attempt
T+00:20  FINDING-001 created (Category: Bug) — Payment Option checkbox pollution
T+00:20  FINDING-002 created (Category: Bug) — Post Office Box max-length
T+00:20  FINDING-003 created (Category: Bug) — Credit Limit max-length
T+00:20  FINDING-004 created (Category: Bug) — Warning Prompt max-length
T+00:20  FINDING-005 created (Category: Bug) — Import PNR default unchecked
T+00:20  FINDING-006 created (Category: Requirement Gap) — Flight checkbox editable
T+00:20  FINDING-007 created (Category: Bug) — no Payment Gateway on Credit Card
T+00:20  FINDING-008 created (Category: Requirement Gap) — PAN Number absent
T+00:20  FINDING-009 created (Category: Requirement Gap) — Department absent
T+00:20  FINDING-010 created (Category: Requirement Gap) — undocumented Outstanding Threshold
T+00:20  FINDING-011 created (Category: Bug) — Submit button label mismatch
T+00:21  Stage 2 end — Explore module: branch (User Story-scoped strategy; Create Branch screen only)
```

---

## run-003 — US 8599 Search & Actions Branch + US 8606 Update Branch (2026-08-04)

Discovery Mode: Browser automation — **Browser Driver** (headless, Stage 2 default).
Role: Super Admin (`odeysysadmin`), standing in for both actors per the 2026-08-04 directive.

```
T+00:00  Stage 2 start — module: branch, User Story-scoped strategy (two stories)
T+00:00  Resolved pointers: module `branch` (single), run-003 active, drift `unchanged` @42de80a
T+00:00  Confirmed upstream gate: ProjectContext.md Status=Approved, Revision 8
T+00:01  BrowserDriver.authenticate(STG) -> OK (20.2s); post-login URL /dashboard
T+00:01  ENVIRONMENT REACHABILITY CONFIRMED — resolves the standing open item carried since 2026-07-29
T+00:01  Navigate /admin/branch -> 200, title "NDC - Branch"
T+00:02  Captured grid headers (6) + first-row action icons + count text
T+00:02  CANDIDATE raised: search form appears to lack Country/State/City/Status filters
T+00:03  Widget-aware re-probe of the filter region (PrimeNG p-dropdown/p-multiselect/p-radiobutton)
T+00:03  CANDIDATE REJECTED — all six specified controls present; first probe's selectors under-reported
T+00:04  Status filter counts: Active=491, Inactive=125, Both=616 (Both = Active + Inactive exactly)
T+00:04  Empty-result probe (code ZZZZQQ9) -> "No data has been found!" — exact XC-11 string match
T+00:05  Branch code input: CSS text-transform uppercase, underlying value unchanged
T+00:05  Branch name search input accepted <script>@#$%^&*() unmodified
T+00:06  Cascade probe FAILED — #id-Country not clickable (inside .p-hidden-accessible)
T+00:06  RECOVERY: retried via visible .p-dropdown trigger -> succeeded
T+00:07  Cascade CONFIRMED: State disabled until Country chosen (Egypt -> 33 states); City until State
T+00:08  Grid header re-enumeration incl. hidden check -> 6 headers, none hidden, no "State"
T+00:08  FINDING-012 created (Category: Bug, Severity: Medium) — State column absent from grid
T+00:08  FINDING-014 created (Category: Requirement Gap) — Active/Inactive status filterable, never displayed
T+00:09  FINDING-015 created (Category: Requirement Gap) — City filter is multi-select, not dropdown
T+00:10  Opened /admin/branch/edit/BRN2 via edit pen — READ ONLY (pre-existing record, no typing/submit)
T+00:11  Captured 61 labelled fields, 6 section headings, 7 action buttons
T+00:11  RISK-BR-5 probe: PAN absent, Department absent, PaymentGateway absent (Credit Card saved-checked)
T+00:12  CANDIDATE raised: Update form appears not to pre-fill State/City/Name/PostOfficeBox/CreditLimit
T+00:13  RECOVERY per 5.7: polled pre-fill across 2 fresh navigations + 1 hard reload
T+00:14  CANDIDATE REJECTED — 10/10 fields populated at t=500ms, stable; earlier read sampled mid-render
T+00:14  Email Password confirmed populated on all 3 attempts (value never captured or logged)
T+00:15  FINDING-013 created (Category: Security Concern, Severity: High) — stored email password returned to client
T+00:16  Navigation timeout on login (30s) — Event-Driven Capture trigger
T+00:16  RECOVERY: raw HTTP probes x5 -> 200 in 50-850ms; environment healthy
T+00:16  Verified 23 chrome processes are the USER'S personal browser, not leaked Playwright — nothing killed
T+00:17  CANDIDATE REJECTED — timeout was local tooling, not an application condition
T+00:18  Paginated 12 pages on Status=Both; 120 distinct codes, no repeats
T+00:19  Filter persistence across paging CONFIRMED (Status=Both still checked on page 3)
T+00:19  Approval status distribution: Approved 110, Pending for approval 6, Rejected 4
T+00:20  RISK-BR-6a RESOLVED read-only — action icons are state-dependent:
T+00:20    Approved -> pencil + thumbs-down | Pending -> pencil + thumbs-up + thumbs-down | Rejected -> pencil + thumbs-up
T+00:21  Occurrence 2 appended to FINDING-001, 007, 008, 009, 011 (same conditions, Update screen)
T+00:22  Artifacts written: 2 discovery snapshots, 4 new evidence packages, summaries updated
T+00:23  Stage 2 end — no mutating action was performed at any point this run
```

---

## run-006 — Auto Reissue checkbox, Branch half (2026-09-23 / 2026-09-24, times **UTC**; local is UTC+3)

Run `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch`. Discovery Mode: Browser Driver, headed, `http://192.168.1.60`.

> **How this log was built.** It was assembled when the stage ended from timestamps recorded at the time: the scripts' own `HH:MM:SS` lines and each step's tool-return time. Those sources are kept verbatim in `runs/run-006…/discovery/evidence/44-session-output-extract.txt` and `33-branchbooking-cycle-results.json`. It wasn't appended line by line during the session (§6), and that is disclosed here.

```
2026-09-23
21:22  Browser Driver login on http://192.168.1.60 -> /dashboard                                      [00]
21:24  Navigate /admin/branch/add (unsaved): "Auto Reissue" beside Import PNR, unchecked                 [01-branch-add-form]
21:25  Tick (unsaved): "Auto Reissue Credentials" picker; no network call; "No results found"           [02,03]
21:26  Read-only GET /Master2/Branch/BRN265/details: NDCsbr, credential 313, autoReissueAllowed true;
       Auto Reissue on, reissueCredentials [313]
21:34  User designates BRN265 for all steps ("if you need a new branch ask me")
21:35  Grants: BRANCH UPDATE/SUBMIT/APPROVE DedicatedTestData (BRN265 only); BRANCH-CREATE revoked. Baseline saved [05]
2026-09-24
10:10  User supplies Branch booking NDCEG-BR-F260916ENYOeQ
10:12  Read-only: order BRN265NDCORD2609169XJ1LC, branch BRN265, agency null, locked by odeysysadmin     [27]
10:12  Itinerary (BRN265 on): Sabre, ticketPccId 315, Booked, canAutoReissue true; Reissue shown       [28,29,45]
10:14  BRN265 untick + Remarks -> PUT /Master2/Branch/10950 204 -> Pending -> PATCH approveOrReject 200 [30]
10:15  Details GET: autoReissueEnabled false, [313] kept (S-7)
10:16  Diff vs baseline: supplier Sabre (315 checked, 297 unchecked) now present -> PAUSE, ask the user
10:24  User: yes, Sabre was added by them manually. Baseline annotated (laterChangeOutsideRun006)
10:24  Itinerary: canAutoReissue true while BRN265 believed off                                         [31]
10:25  Re-read: BRN265 is ON [313] Approved -- changed by hand in another session -> OFF check INCONCLUSIVE [32]
10:26  User: check the flag and the button in the same session
10:27:00  PUT Branch/10950 autoReissueEnabled false, [] -> 204
10:27:11  Grid: Pending for approval · 10:27:24 Approved
10:27:29  Flag read: form false, api false, [313], approval 1
10:27:37  Itinerary: canAutoReissue false, Reissue HIDDEN, Manual Reissue shown, locked 1               [33-…-OFF]
10:27:42  Flag re-read: unchanged
10:27:51  Re-tick: picker pre-filled "NDCSabre staging" (S-7); PUT [313] -> 204
10:28:02  Grid: Pending · 10:28:17 Approved
10:28:24  Flag read: true, [313]
10:28:30  Itinerary: canAutoReissue true, Reissue SHOWN                                                  [33-…-ON]
10:28:36  Flag re-read: unchanged. BRN265 left at its restore target (on, [313], Approved)
10:41  Unsaved Add Branch: LCC AirArabiaEgypt ticked, row credential chosen -> picker empty             [39-…AirArabiaEgypt]
10:49  PCC tab control identified as a multi-select
10:51  Unsaved: Galileo tab "GalileoLive" -> picker ["GalileoLive"]; Amadeus tab "Amadeus Live" -> empty [39-…Galileo,39-…Amadeus,40]
11:45  User: PO-21 corrected (hard-coded list; Amadeus unsupported) -> Amadeus result is expected
14:01  FINDING-017 created · 14:10 Stage 2 artifacts written (+ HTML) -> Pending Review
```

Numbers in brackets are files in `runs/run-006…/discovery/evidence/`. **Never done:** creating a Branch, booking, or clicking Reissue / Release PNR / Void-Cancel.
