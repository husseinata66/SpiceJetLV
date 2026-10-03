# PROJECT_STATE.md

**Purpose of this file:** a snapshot a fresh Claude Code session can read cold, with no chat
history, and know exactly what happened, what's true right now, and what to do next. Update this
file at the end of every significant session on this task; don't append a running log — overwrite
the relevant sections so this always reflects *current* truth.

**Last updated:** 2026-09-28, late night — mid Stage 4M (Manual Execution) live run against
TC-ANC-002; work is being saved to resume from a **different computer** tomorrow. **See §13 for the
current, authoritative state — it supersedes anything below that conflicts (§9 in particular is
stale: Stage 3 is now `Approved` and Stage 4M execution is actively underway).**

---

## 1. What this task is

Onboarding **AirIndia** as the first Supplier under the **Ancillaries** Supplier Feature in the
"Agentic AI Testing Platform" (spec-driven QA pipeline), on branch `NDC_Core_Service_Test`, following
`workflows_and_pipelines/pipeline/new_us_intake.md` §12. Pipeline chosen: **manual execution only**
(Stage 1 → Stage 2 → Stage 3 → Stage 4M — no automation branch).

- Run: `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia`
  (`platform_core_data/runs/run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia/`)
  Scope: `scopeFamily: "supplier-feature"`, `feature: "ancillaries"`, `supplier: "air-india"`.
- Stage 1 (Project Context): **done, Approved.** Shared baseline rev 4, AirIndia's own rev 3 — both
  Approved 2026-09-28, adding ANC-54…ANC-58 (Admin's Booking-Mid Office scope, see §3 below).
- Stage 2 (Discovery): **done, Approved** (rev 8, 2026-09-28, by Ahmed Alhussieny, recorded via the
  CLI) — 17 Findings total (12 original + FINDING-013…017 for Admin). Rev 6 added FINDING-011/012, closing
  the ANC-53 "reports" clause that rev 1-5's "100% coverage" claim had never actually visited. Rev 7
  reclassified FINDING-012 (Statement report) from `Test Gap`/`Needs Human Review` to
  **`Bug`/`Confirmed`/Medium** after the user confirmed it's a defect in the report itself — with an
  explicit instruction for Stage 3: write Statement report test cases now, held Pending/Blocked until
  fixed. **Rev 8 (this session) added a new §14 "Admin Scope (Provisional)"** with FINDING-013
  through FINDING-017 (17 Findings total now) from user-supplied evidence of Admin's Booking-Mid
  Office cycle — all capped at `Needs Human Review` (Human Observation/Static Artifact evidence tier,
  per §18, regardless of how consistent the figures are) and explicitly **not yet backed by a
  Project Context revision** — see §3 below before treating them as equal-weight to the rest.
- Stage 3 (Test Design): **done, Approved** (Approved by Ahmed Alhussieny, 2026-09-28). 27 test cases at
  `platform_core_data/supplier-features/ancillaries/suppliers/air-india/test_design/`
  (`TestCases_Ancillaries_AirIndia.md` + `.xlsx`, `TraceabilityMatrix.md`, `CoverageReport.md`).
  Originally 33 cases (rev 1); on 2026-09-28 the user identified 8 as out of Ancillaries scope
  (belongs to general booking scope, not Ancillaries-specific) and had them removed: TC-ANC-013
  (Service Charge/Discount display), TC-ANC-017 (Agency/Agent wallet routing), TC-ANC-028/029/030
  (search/PAX-details negative, boundary, Unicode validation), TC-ANC-031 (Multi-city confirmation),
  TC-ANC-032 (Admin six-checkpoint E2E — booking-cycle parity, no ancillary-rule content),
  TC-ANC-033 (cross-channel offer-price parity). FINDING-003 and FINDING-014 were re-dispositioned
  from Exploratory test to Documented Exception (same out-of-scope reasoning) — no Finding is left
  uncovered. Requirement coverage recomputed to 52% (22/42 testable-in-scope ANC-xx requirements
  Covered; ANC-19…21 dropped from Covered to Partially Covered since its negative/boundary/Unicode
  coverage left with TC-028/029/030). REC-TD-007 recommends a future general-booking Feature test
  design pick up the removed 8 cases if the business wants them tested. Two execution-time blockers
  remain (not design blockers): the Postman collection's location/format (blocks TC-ANC-022), and
  FINDING-012's Statement defect (blocks TC-ANC-026, held Pending/Blocked). Awaiting the user's
  approval before Stage 4M.
  **Restructuring done (2026-09-28, revision 3):** TC-ANC-002/003/004/005 rewritten in place
  (Option 2, chosen for lowest token cost) from route/stop-sweep Scenario cases into 4 of the user's
  6 named single-combo E2E scenarios (one-way non-stop Admin; round-trip with-stop Admin; one-way
  with-stop Portal; round-trip non-stop Portal), each now walking the user-specified six-checkpoint
  chain: ancillary-selection rule verification (no Infant ancillaries, Meal-per-leg/Baggage-per-journey
  per FINDING-002/ANC-48) → Confirmation page → supplier retrieve-endpoint match → Search Booking
  Ancillaries section → Search Booking Costing → channel-appropriate Reports (Admin's 5 reports or
  Portal's Total Due to NDC/Sales). Two new cases added for the missing combos: TC-ANC-034 (one-way,
  no ancillaries selected for any passenger, Admin) and TC-ANC-035 (round-trip, ancillaries onward-leg
  only — channel not specified by the user, assigned to Portal to keep a 3-Admin/3-Portal split).
  TC-ANC-035 also surfaces a new open question (never before exercised in Discovery): whether
  round-trip Baggage can be scoped onward-only at all, given it's a Per-Journey capability (ANC-48).
  Suite is now 27 test cases (18 Atomic, 3 Scenario, 6 E2E); coverage percentage unchanged at 52%
  (no requirement flipped category, only evidence depth increased).
  **Execution-efficiency notes added (2026-09-28, revision 4):** answered the user's question "will
  atomic cases be checked in E2E scenarios or separate?" — answer: **both**. Every test case (Atomic
  or E2E) keeps its own ID and its own Pass/Fail/Blocked row in the Results/CSV/QA Report (platform
  rule, Execution Rule 21 of manual-execution-skill — never merged). But 12 Atomic cases now carry a
  **Notes** line pointing to which E2E case's evidence can be reused instead of a fresh booking
  attempt: TC-ANC-006/007/008/012/014/020/021/022/024/025 (identical assertion, record straight from
  E2E evidence) and TC-ANC-011/015/016/018/019 (different assertion, but same live session can be
  reused — e.g. read wallet balance before/after within an E2E booking rather than starting a new
  one). TC-ANC-009/023/026/027 remain untouched — genuinely separate, no overlap with the E2E steps.
  **Route/passenger corrections (2026-09-28):** user corrected the non-stop route from DEL-BOM to
  BOM-COK (applies to TC-ANC-003, TC-ANC-004 — both now genuinely unevidenced/new) and confirmed the
  transit/stop route as DEL-DXB (applies to TC-ANC-002, TC-ANC-005, TC-ANC-034, TC-ANC-035 — DEL-DXB
  already matches Discovery's own evidenced route on both channels). User also reported the supplier
  could not return search results for 2 Adult+2 Child+2 Infant on these routes during a prior
  execution attempt — all six E2E cases now instruct a fallback to 1 Adult+1 Child+1 Infant if the
  full mix returns no results, with a flagged consequence: a 1/1/1 fallback booking cannot satisfy
  the 2-Infant boundary checks (TC-ANC-009, and the "distinct Adult" assignment check embedded in
  each E2E case's own ancillary-selection step).
  **Approved 2026-09-28** — Status: Approved on both `TestCases_Ancillaries_AirIndia.md` and
  `CoverageReport.md`, recorded via Module Manager.
  **Review column bulk-approved 2026-09-28, then corrected same day:** all 27 cases were initially
  bulk-set to `Review: Approved`, but the user caught that TC-ANC-026 should not have been included
  (it's explicitly held Blocked pending FINDING-012's fix) — corrected back to `Review: Pending`.
  Final state: **26 Approved, 1 Pending (TC-ANC-026), 0 Rejected**. `Automation` intentionally left
  `Pending` on all 27 — manual-execution-only pipeline, Stage 4M never reads that column.
  **Statement report (FINDING-012) confirmed still open 2026-09-28** by the user — TC-ANC-026 stays
  Pending/Blocked, not yet executable.
  **Postman request location resolved 2026-09-28:** user shared the retrieve-endpoint request's
  Postman workspace link (`My-Workspace`, request ID `42582452-f99943c7-432e-4c6f-8985-1886fe136368`),
  now recorded in TC-ANC-022's Preconditions. This unblocks the "where is it" question; actually
  calling it at execution time still needs either live workspace access or the exported request JSON.
  26 of 27 cases are now in Stage 4M's executable scope; only TC-ANC-026 remains blocked.
  **Markup/ROE retrieve-endpoint clarification (2026-09-28):** user flagged that the supplier's
  retrieve-endpoint response reflects the raw supplier fare *before* Markup — Markup is a
  platform-side rule-engine addition (ANC-55) the supplier is never told about, so it never appears
  in retrieve-endpoint data. Updated TC-ANC-022 and the retrieve-endpoint step of all six E2E cases
  (TC-ANC-002/003/004/005/034/035): passenger/ancillary data compare directly against the retrieve
  response, but fare amounts only match once ROE conversion (ANC-42) AND per-passenger Markup are
  both added on top of the retrieve-endpoint figure — a raw equality is expected to fail and is not
  itself a defect. Added as REC-TD-009 in CoverageReport.md so Stage 4M doesn't misread this expected
  gap as a new Finding.
- Stage 4M (Manual Execution): **not started.**

## 2. What we accomplished this session

This session's arc: took Discovery from "10 Findings, all evidence-capped at Human
Observation/Static Artifact (per the Explorer skill's Confidence Model, §18)" to "8 of 10 Findings
upgraded to Direct Observation / `Confirmed`, via real live browser automation against both Admin and
Portal — including completing one real, live test booking."

1. **Extended the Browser Driver to support a second login flow** (Admin's 2-field
   username/password vs. Portal's 3-field Agency Code + Email + Password) — additive, backward
   compatible, existing callers unaffected.
2. **Diagnosed and fixed three real bugs** hit while building this out (see §6 — all fixed, not
   latent):
   - Wrong target: an Admin credential without an explicit `baseUrl` fell back to the profile's
     unrelated default (`192.168.1.70`, used by other modules) instead of `192.168.1.213`.
   - A stale `successSelector` (`text=Book Flight`) matched a hidden sidebar duplicate and never
     detected login as complete, even though login had actually succeeded.
   - The native Terms & Conditions checkbox was visually hidden behind a styled label and outside
     the Playwright-clickable viewport; fixed via a JS `checked=true` + `dispatchEvent`.
3. **Authenticated live to both Admin and Portal** and drove full flows: Admin Branch/Supplier
   config lookup; Portal flight search → passenger info → bundles → ancillaries → **a completed real
   booking** → wallet-balance re-check → My Bookings/itinerary lookup → a full-page scan for any
   post-booking change control.
4. **Upgraded 8 of the 10 Discovery Findings from this run to `Confirmed` via Direct Observation**
   (FINDING-001, 002, 005, 006, 007, 008, 009, 010) — see §7 for the exact evidence. The other 2 stay
   as they were: FINDING-004 is `Rejected` (a resolved false read) and FINDING-003 stays `Needs Human
   Review` (a test-data/configuration gap, not something live automation can resolve).
5. Followed the standing safety rule twice: paused and explicitly asked the user to confirm the
   credential/environment was Staging (not inferred from the "STG" name) before (a) entering the
   booking wizard, and again before (b) actually clicking "Book". User confirmed both times.
6. Synced the Module Manager registry (`platform_core_data/supplier-features/modules.json`) so its
   Discovery `revisionCount`/`lastUpdated` for `ancillaries/air-india` match the QA Assessment
   Report's actual current revision (was stale — see §6).

**Follow-up session, same day (2026-09-27), before Stage 3 was invoked:** the user flagged that
Portal Reports (Total Due, Total Sales, Statement) needed checking after an ancillaries booking.
Traced this to an existing gap: `ProjectContext.md` §2 already declared "reports" in scope (ANC-53),
but `Coverage_Summary.md` rev 1 never actually visited Reports despite claiming 100% coverage. Treated
as a Discovery follow-up under run-007 (not new scope, not a new run), Headed mode confirmed with the
user first.

7. Authenticated live to Portal again and navigated to Reports (`/reports`, side-menu `li[5]/a` —
   real but visually hidden DOM node, same class of issue as the earlier "Book Flight" sidebar
   duplicate; a native JS `.click()` works where a Playwright-gated click times out).
8. **Total Due to NDC** and **Sales** reports both confirmed correct: searched by Invoice Date range
   bracketing the real booking (`NDCEG-BR-F260926mlLT19`) and found `Amount Payable To Ndc` /
   `Payable To Ndc` / `Sales Amount` all exactly **24,122.00 EGP**, matching the booking Total.
   FINDING-011 created (Confirmed, Direct Observation, 98%).
9. **Statement report returns zero data** for this Branch/Agency — confirmed not a UI/filter
   artifact by calling the backend endpoint directly
   (`POST http://192.168.1.213:8080/odeysysportal/v2/reports/statement-report`) with a fully
   unfiltered wide date range: HTTP 200, `{"payload":[],"total":0}`. FINDING-012 created (Test Gap,
   Needs Human Review, Direct Observation, 90%) — `Total Payable`/`Wallet Balance` cannot be verified
   until a business/config decision is made (same pattern as FINDING-003/GAP-004). User confirmed
   this classification rather than asking for further live investigation.
10. Updated `Coverage_Summary.md` to rev 2 (12/12 declared areas, Reports now actually visited),
    `Findings_Summary.md` (12 total Findings), `Timeline.md`, and `QA_Assessment_Report.md` to
    **rev 6** (new GAP-006, REC-008, updated §6/§10/§13). Re-synced the Module Manager registry via
    the CLI again (discovery stage, status "Pending Review", artifact = rev 6 report).

## 3. Current architecture / state (as of now)

### Supplier Features registry state
- `platform_core_data/supplier-features/modules.json`: `activeFeature: "ancillaries"`. Feature
  `ancillaries` has `integrationLayer: "ndc-core-service"`. Its shared baseline
  (`ancillaries-baseline`) context stage: `Approved`, revisionCount 3. Supplier `air-india` registered
  under it, `status: "Active"`; stages: `context` = `Approved` (rev 2), `discovery` = `Pending Review`
  (rev 4 in the registry's own counter — just re-synced this session), `test_design`/`automation`/
  `healing` = `Not Started`.
- No `activeSupplier` pointer field exists in this registry shape at the feature level (verified —
  don't go looking for one). Supplier scoping for a run comes from the run's own `run.json`
  (`scopeFamily`/`feature`/`supplier`), not a global "active supplier" pointer.
- `platform_core_data/runs/current_active_run.json` still points at run-007 (`setBy: "Ahmed
  Alhussieny"`). Don't create a new run for continuing this work — resume against run-007.

### Live application endpoints (real, reachable — intermittently, see §6)
- **Admin**: `http://192.168.1.213` — login `#id-Username` / `#id-Password`, submit
  `button:has-text("Login")`, success `text=Dashboard`. Branch under test: `NDC2_Ahmed Alhussieny`.
  AirIndia's app-internal identity: Supplier Name **"IndiaAirLine"**, Credential Name
  **"IndiaAirLineStg"** (confirmed live, twice, via two independent Admin screens).
- **Portal**: `http://192.168.1.213:9500` — login `#id-AgencyCode` / `#id-Email` / `#id-Password`,
  submit `button:has-text("Login")`, success **`text=TOTAL FLIGHTS`** (fixed this session — do NOT
  revert to `text=Book Flight`, see §6). Agency code `AGN9808`.
- Test flight used throughout: **DEL → IXE → DXB**, 15/10/2026, IX-1782 + IX-813, Air India Express,
  labeled "IndiaAirLine ndc test" in search results, base one-way price EGP 12,122 (before
  ancillaries).
- **A real booking now exists** from this session: Airline PNR **`Y1ZVFF`**, Booking Reference
  **`NDCEG-BR-F260926mlLT19`**, Trip ID / Order Number **`AGN9808NDCNDCORD260926HEXJFS`**, Total
  **24,122.00 EGP**, passengers "Test Adult" / "Test Child" / "Test Infant". This booking is real and
  irreversible — don't try to "undo" it; it's evidence, not scratch state. A second, earlier
  human-driven booking also exists from a prior session: Booking Reference
  `NDCEG-BR-F260926SxPS22`, Airline PNR `YSTPMB`.

### Browser Driver / credentials shape (do not regress)
- `platform_core_data/knowledge_base/browser/profile.json`: root-level `login`/`defaultBaseUrl`
  unchanged (still point at `192.168.1.70`, used by *other* modules — never repoint this to `.213`).
  New `apps.portal` block added with its own `login`/`baseUrl`. `apps.portal.login.successSelector`
  is `text=TOTAL FLIGHTS` (was `text=Book Flight`, changed this session — see §6 for why).
- `platform_core/tools/browser_driver/driver.js` / `api.js`: `authenticate({ env, app? })` — omit
  `app` for the original Admin-only behavior (used by every other existing module); pass
  `{ app: 'portal' }` for Portal. Diagnostic screenshot-on-failure was added around both the
  username-field wait and the success-selector wait (writes to the OS temp dir on failure, logs the
  path in the thrown error) — this is a permanent, useful debugging aid, not a one-off hack; keep it.
- `platform_core_data/knowledge_base/credentials/credentials.json` — **exists on this machine, is
  git-ignored, and I (the agent) have never read or written it.** It was created and filled in by the
  user only, per the platform's own rule (`credentials.json` README: "created locally by a human —
  never by the agent"). It currently contains (at least) two environment blocks:
  - `ANCILLARIES_STG` — Admin credentials, with `"baseUrl": "http://192.168.1.213"` explicitly set
    (**this explicit `baseUrl` is required** — without it, the Admin login falls back to the profile's
    unrelated default `.70` and silently authenticates against the wrong app; this bit us once this
    session, see §6).
  - `STG_PORTAL` — Portal credentials, with `agencyCode` set (required, since Portal's login has an
    `agencyCodeSelector`) and no separate `baseUrl` override needed (`apps.portal.baseUrl` in
    `profile.json` already points at the right host).
  - **Never read, print, or write this file yourself in a future session either** — if you need a new
    environment key added, describe the exact JSON block needed and ask the user to add it, exactly
    as this session did.

### Discovery artifacts (all under
`platform_core_data/supplier-features/ancillaries/suppliers/air-india/discovery/`)
- `QA_Assessment_Report.md` — **rev 8**, `Status: Pending Review` (not yet re-approved by the user
  after this session's upgrades — approval is the next real gate). Rev 6 added FINDING-011/012,
  GAP-006, REC-008, and updated §6/§10/§13 for the Reports coverage closure; rev 7 reclassified
  FINDING-012 to `Bug`/`Confirmed`/Medium and made explicit the Test Design instruction (write
  Statement test cases now, hold Pending); rev 8 added a new §14 "Admin Scope (Provisional)" section
  with FINDING-013 through FINDING-017 — **explicitly caveated as pending a Project Context
  revision**, don't read §14 as equal-weight to §1-13.
- `Timeline.md` — **rev 2** header field, but has far more than 2 revisions' worth of entries; the
  header's `Revision` field tracks major re-approval cycles, not every edit. Fully up to date through
  the booking + post-booking verification + the Reports follow-up.
- `Coverage_Summary.md` — **rev 2**, 100% (**12/12** declared in-scope areas — Reports, previously
  declared in-scope via ANC-53 but never actually visited, are now covered: Total Due to NDC, Sales,
  Statement).
- `findings/Findings_Summary.md` — index of all **12** Findings, fully in sync with the individual
  `metadata.md` files (see §7 for exact status/confidence of each).
- Each `findings/FINDING-0XX_*/metadata.md` plus its evidence screenshots (several new
  `live_*_direct_observation.png` files added this session, see §7), plus two new folders:
  `FINDING-011_ReportsReflectBookingConfirmed/` and `FINDING-012_StatementReportEmptyNeedsReview/`.

## 4. Files changed this session (relative to the branch tip, `bc564a4`)

Tracked files modified (all intentional, all reviewed):
```
package.json                                                   (playwright devDependency 1.61.1 -> 1.63.0, see §6)
package-lock.json                                               (follows from the above)
platform_core/tools/browser_driver/README.md                    (documented apps map, agencyCodeSelector, app param)
platform_core/tools/browser_driver/api.js                        (authenticate() passes app through)
platform_core/tools/browser_driver/driver.js                     (apps map resolution, diagnostic screenshots)
platform_core_data/knowledge_base/browser/profile.json           (apps.portal block, successSelector fix)
platform_core_data/knowledge_base/credentials/README.md          (documented agencyCode/baseUrl/app)
platform_core_data/knowledge_base/credentials/credentials.template.json  (added STG_PORTAL example)
platform_core_data/runs/current_active_run.json                  (from earlier in the overall task, unchanged this session)
platform_core_data/supplier-features/ancillaries/context/CapabilityModel.md      (from earlier, unchanged this session)
platform_core_data/supplier-features/ancillaries/context/FeatureChecklistProfile.md (from earlier, unchanged this session)
platform_core_data/supplier-features/ancillaries/module.json     (from earlier, unchanged this session)
platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/context/ProjectContext.md (from earlier)
platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/feature.json (from earlier)
platform_core_data/supplier-features/modules.json                 (discovery stage revisionCount/lastUpdated re-synced
                                                                     this session via the CLI, see §2.6)
```

Untracked (new) files/directories relevant to this task — everything under
`platform_core_data/supplier-features/ancillaries/suppliers/air-india/` and
`platform_core_data/runs/run-006.../` + `run-007.../`. Full new-file list for the Discovery evidence
added *this session* specifically:
```
findings/FINDING-001_SupplierNameMismatch/supplier_credentials_search_direct_observation.png
findings/FINDING-002_ApplicationLevelConfirmed/live_ancillaries_meal_baggage_direct_observation.png
findings/FINDING-005_BundleStepAndLevel/live_bundle_pricing_direct_observation.png
findings/FINDING-006_InfantEligibilityConfirmed/live_ancillaries_no_infant_row_direct_observation.png
findings/FINDING-006_InfantEligibilityConfirmed/live_ancillaries_no_infant_row_direct_observation_2.png
findings/FINDING-007_WalletDeductionConfirmed/live_wallet_before_booking_direct_observation.png
findings/FINDING-007_WalletDeductionConfirmed/live_wallet_after_booking_direct_observation.png
findings/FINDING-008_ConfirmationReflectsAncillaries/live_order_confirmation_direct_observation.png
findings/FINDING-009_ItineraryReflectsAncillaries/live_itinerary_segment_ancillaries_direct_observation.png
findings/FINDING-010_PostBookingChangeBlocked/live_change_control_scan_direct_observation.png
```
(Everything else under `suppliers/air-india/` predates this session — created across the earlier
onboarding + first Discovery pass.)

**Unrelated, ignore:** `"NDC2 - Elite NDC2-Sprint 59 Taskboard - Boards.html"` and its `_files/`
sibling directory at the repo root are a saved-from-browser Azure DevOps page, not something this
task created — don't delete it without checking with the user first (it might be theirs, unrelated to
this work), but also don't treat it as part of this task's deliverable.

**Not committed.** Nothing from this task has been `git commit`-ed. All of the above is working-tree
state only. If the user asks to commit, group it logically (browser driver/profile changes as one
commit; Discovery artifact revisions as another) rather than one giant commit — but wait to be asked.

## 5. Important decisions and assumptions made this session

- **Adult passenger test data used:** Title Mr, DOB 01/01/1990, Document Number `P1234567`, Expiry
  01/01/2032, Nationality India. **Child:** same pattern, DOB 01/01/2018, Document `P1234568`.
  **Infant:** DOB 01/01/2025, Document `P1234569`, `Assigned to` = Test Adult. All fabricated test
  data, not real PII — fine to reuse verbatim in a follow-up session for consistency, or vary if the
  test needs different ages/nationalities.
- **Meal selected:** "Quinoa Salad" (code `VQSB`, 200 EGP) for both legs, both Adult and Child.
  **Baggage:** first available option in the "Choose a baggage" dropdown for the DEL→DXB leg
  ("Special equipment Handling Fee 3 Pc", 5,250 EGP) for both Adult and Child. **Bundle:** "Value
  Pack" (Bundle Service "Xtra Pack"). These were chosen for parity with the original human-observed
  session's Findings, not because they're the "right" test data — Stage 3 Test Design should treat
  these as one example dataset, not a fixed contract.
- **Booking was completed with explicit, twice-confirmed user authorization** ("now you can book a
  flight", then a direct yes/no confirmation that the environment was Staging). Do not take this as
  blanket permission for future sessions — the standing rule (see `feedback_confirm_staging_before_
  irreversible_actions.md` in the memory system) requires asking again, every time, before any future
  irreversible action, regardless of what happened in this session.
- **Evidence Category / Confidence discipline preserved throughout:** every upgrade to `Confirmed`
  went through Direct Observation specifically (live browser automation), per the Explorer skill's
  Confidence Model (§18) — Human Observation and Static Artifact evidence can never reach `Confirmed`
  on their own, no matter how clear. Don't casually mark future Findings `Confirmed` without that same
  discipline.
- **FINDING-001 stays `Rejected`, not `Confirmed`-and-then-something-else** — it was correctly
  classified as a resolved non-issue (naming convention, not a defect) in an earlier session; this
  session only strengthened its evidence tier, not its Category/Status classification logic.

## 6. Issues hit and fixed this session (all resolved — kept here so they aren't re-debugged from scratch)

1. **Admin login silently authenticated against the wrong host.** `ANCILLARIES_STG`'s credential
   block initially had no `baseUrl`, so `driver.js`'s fallback chain (`creds.baseUrl || appBaseUrl ||
   profile.defaultBaseUrl`) landed on the profile's unrelated default (`192.168.1.70`). Fixed by
   having the user add an explicit `"baseUrl": "http://192.168.1.213"` to that credential block.
   **If this resurfaces:** check the credential block has `baseUrl` set before assuming the driver is
   broken.
2. **Portal login appeared to hang/fail even though it had actually succeeded.**
   `apps.portal.login.successSelector` was `text=Book Flight`, which matched 2 DOM nodes (a hidden
   collapsed-sidebar link plus the real visible dashboard button); Playwright's visibility wait
   resolved to the invisible one and timed out every time. Diagnosed via the diagnostic
   screenshot-on-failure (shows the fully-loaded Portal Dashboard). Fixed by changing the selector to
   `text=TOTAL FLIGHTS`, a unique, always-visible dashboard element. **Already fixed in
   `profile.json` — don't revert.**
3. **Intermittent `net::ERR_CONNECTION_TIMED_OUT` to `192.168.1.213` (both apps), several times
   during the session, self-resolving after the user re-enabled some reachability mechanism on their
   end (never fully explained — described only as restoring access).** This is an environment/network
   condition outside this codebase, not a driver bug. **If it recurs:** run
   `curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 8 http://192.168.1.213/auth/login` (and
   the `:9500` Portal equivalent) to check reachability before assuming a code regression, then ask
   the user to restore access rather than debugging the driver.
4. **The Terms & Conditions checkbox (`#termsAndConditions`) couldn't be clicked** — it's a real
   `<input type="checkbox">` but visually hidden behind a styled label, and outside the viewport even
   with `{ force: true }`. Fixed via `page.evaluate()` setting `.checked = true` and dispatching
   `change`/`click` events manually. **If a future flow needs to check a similarly-hidden native
   checkbox, reuse this pattern rather than `.click({ force: true })`, which does not work here.**
5. **PrimeNG `p-dropdown` selection ambiguity, hit repeatedly:** once a value is already selected
   somewhere on the page (e.g., Adult's Title = "Mr", Adult's Nationality = "India"), a later
   `page.click('text=Mr')`/`text=India'` for a *different* passenger's dropdown can match the
   *already-filled* text elsewhere on the page instead of the newly-opened dropdown panel. Fixed by
   scoping the click to `.p-dropdown-panel` specifically (`page.locator('.p-dropdown-panel').last()
   .getByText(...)`). **Apply this pattern to any future multi-passenger form-filling automation on
   this Portal.**
6. **`npm i -D playwright` bumped the pinned devDependency from `^1.61.1` to `^1.63.0`** as a
   side-effect of installing (not a deliberate upgrade). Left as-is since it installed and ran cleanly
   (`npx playwright --version` → 1.63.0), but flagging in case a future session wants to pin it back
   or verify nothing else in the repo assumed 1.61.x specifically.
7. **Module Manager registry (`modules.json`) was stale** relative to the QA Assessment Report's
   real revision — its `discovery.revisionCount`/`lastUpdated` for `ancillaries/air-india` hadn't been
   bumped since an earlier session. Fixed this session via:
   `node platform_core/tools/module_manager/cli.js supplier-feature supplier stage ancillaries air-india discovery --status "Pending Review" --artifact "platform_core_data/supplier-features/ancillaries/suppliers/air-india/discovery/QA_Assessment_Report.md" --run "run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia"`
   **Remember to run the equivalent command again** any time the Discovery (or any stage) markdown is
   substantively revised — it is not automatic, and CLAUDE.md's standing rule is "never hand-edit
   `modules.json`... every write goes through the CLI."

## 7. Findings — exact final state (all 10)

| ID | Category | Status | Confidence | Evidence tier |
|---|---|---|---|---|
| FINDING-001 | Requirement Gap | Rejected (resolved non-issue) | 99% | Direct Observation |
| FINDING-002 | Observation | **Confirmed** | 98% | Direct Observation |
| FINDING-003 | Test Gap | Needs Human Review | 85% | Human Observation + Static Artifact (unchanged — a test-data/config gap, not something live automation resolves) |
| FINDING-004 | Observation | Rejected (false read) | 90% | Human Observation + Static Artifact (unchanged) |
| FINDING-005 | Observation | **Confirmed** | 97% | Direct Observation |
| FINDING-006 | Observation | **Confirmed** | 99% | Direct Observation |
| FINDING-007 | Observation | **Confirmed** | 99% | Direct Observation |
| FINDING-008 | Observation | **Confirmed** | 99% | Direct Observation |
| FINDING-009 | Observation | **Confirmed** | 98% | Direct Observation |
| FINDING-010 | Observation | **Confirmed** | 98% | Direct Observation |
| FINDING-011 | Observation | **Confirmed** | 98% | Direct Observation |
| FINDING-012 | **Bug** (Severity Medium) | **Confirmed** | 96% | Direct Observation + Human Observation (user confirmation) |

Net: **7 Confirmed** in the first part of this session (002, 005, 006, 007, 008, 009, 010) +
FINDING-001 already `Rejected` but with its evidence tier upgraded too, **plus FINDING-011/012 added**
in the Reports follow-up. FINDING-012 started as `Test Gap`/`Needs Human Review` (GAP-006 open) and
was then reclassified, same session, to `Bug`/`Confirmed`/Medium once the user confirmed it's a real
defect. Only FINDING-003 and FINDING-004 are unchanged in both status and evidence tier from before
this session (both correctly so — see table).

## 8. Unresolved issues / open items (genuinely open, not just "not done yet")

- **GAP-004** (from the QA Assessment Report §11): Service Charge/Discount pricing components are
  not yet configured for this Branch/Credential, so FINDING-003 can't be pushed past `Needs Human
  Review` by live automation alone — this needs a business/config decision (configure it, or have
  Test Design design around the gap), not more automation.
- **GAP-006 is resolved** (FINDING-012): the Statement report (`/reports/statement`) returns zero
  rows for this Branch/Agency under any filter — confirmed at the API level
  (`POST http://192.168.1.213:8080/odeysysportal/v2/reports/statement-report`) with a fully
  unfiltered wide date range: `{"payload":[],"total":0}`. The user reviewed it directly and
  confirmed **this is a defect in the report itself**, not a test-data/config gap. FINDING-012 is now
  `Bug`/`Confirmed`/Medium. **Explicit instruction for Stage 3:** write Statement report test cases
  now (same model as FINDING-011's Total Due/Sales cases), but hold their execution
  **Pending/Blocked** until the defect is fixed — do not execute against the currently-broken report.
  Also corroborated on Admin this session (Occurrence Count now 2) — one defect, both channels. See
  REC-008 and §12/§13 of `QA_Assessment_Report.md` rev 8.
- **The intermittent network dropout to `192.168.1.213`** (see §6.3) was never explained — it's not
  a code bug, but if a future session hits it immediately, don't assume it's a regression in the
  Browser Driver; check reachability first.
- **The QA Assessment Report (rev 5) has not yet been re-approved by the user** after this session's
  upgrades. That approval is the actual next gate before Stage 3 can start (see §9).
- Bundle's itinerary-level (not just booking-confirmation-level) reflection was **not** independently
  re-verified this session (noted already in FINDING-009's own Investigation Notes from an earlier
  session) — if that matters to Test Design, it's a small follow-up, not a blocker.

### Admin scope raised this session — formalized as Discovery Findings AND now grounded in an
Approved Project Context revision (both done)

**Discovery:** FINDING-013 through FINDING-017 exist — see
`discovery/findings/FINDING-013_AdminBookingCyclePricingReconciled/` through
`FINDING-017_WalletHistoryLabelingInverted/`, `Findings_Summary.md` (17 total), and
`QA_Assessment_Report.md` rev 8 §14.

**Project Context — done 2026-09-28:** the shared `ancillaries-baseline/context/ProjectContext.md`
is now **rev 4, Approved** (by Ahmed Alhussieny, 2026-09-28), adding **ANC-54** (Admin's
Booking-Mid Office mirrors Portal's cycle), **ANC-55** (rule engine is shared, not per-channel;
Markup folds into Base Fare on both channels — user-confirmed 2026-09-28, matching FINDING-003's
original Portal observation), **ANC-56** (three-component wallet), **ANC-57** (Admin's own 6
reports for price verification, Daily Sales excluded), **ANC-58** (Agency/Agent selection supplies
the wallet). §3 Out of Scope now names: Markup/Send Quotation/Save Quote controls, the Void/Cancel
link, Daily Sales Report, Banque Misr. AirIndia's own `context/ProjectContext.md` is now **rev 3,
Approved** (same date), referencing ANC-54…58 in its own §2/§3. Both recorded via the CLI
(`supplier-feature shared stage` / `supplier-feature supplier stage ... context --status Approved`).

**What's left, not a blocker but worth doing:** FINDING-013 through FINDING-017 now have valid
Requirement References (ANC-54…58) instead of "not yet defined" — their Expected Behavior fields
were updated to cite them — but their **Status stays `Needs Human Review`** regardless, since that's
capped by Evidence Category (Human Observation/Static Artifact, §18 of the Explorer skill), not by
Project Context grounding. Re-verifying them live (or via the agreed retrieve-endpoint approach) is
what would move them to `Confirmed`.

- **Admin has its own booking cycle**, called **Booking-Mid Office**, not just Branch/Supplier/
  Credential assignment as `ProjectContext.md` §2 currently describes it — same conceptual cycle as
  Portal (search -> PAX details -> bundle -> ancillaries -> costing/payment -> confirmation ->
  itinerary), plus its own retrieval screen (**Search Booking**, parallel to Portal's My Bookings).
  User confirmed this is **platform-wide** (belongs in the shared `ancillaries-baseline` Project
  Context, not just AirIndia's own), so **do not treat this as an AirIndia-only addition**.
  **Correction after further discussion (user, same session): the rule engine is shared between
  Portal and Admin — NOT "different" as first assumed.** What genuinely differs is the **wallet**:
  Admin's payment step shows three figures (Your Balance, Credit Balance, Top Up Balance) versus
  Portal's single balance figure, and Admin also offers an optional second payment method (Banque
  Misr) alongside Wallet. **Also out of scope, per the user:** the Markup / Send Quotation / Save
  Quote controls visible on Admin's search-results screen — do not pursue these as test-worthy items.
  Booking-Mid Office also lets the user pick **Agency + Agent** at search time (Portal is always tied
  to its own logged-in agency) — whichever Agency is picked supplies the wallet for that booking.
- **Admin has 6 report types in scope for price verification** (Daily Sales Report was explicitly
  removed from scope by the user 2026-09-27 — never evidenced, not to be pursued): Total Due to NDC,
  Agency Wallet Reports, Sales, Statement Reports, AR Ledger Report, Wallet History Report.
  User confirmed Admin's Statement report shares the **same underlying defect** as FINDING-012
  (Portal's Statement report — confirmed Bug, empty at the API level) — reproduced live via
  user-supplied screenshots this session (Admin's Statement report also returned "No data has been
  found!" for the same real booking every other report correctly reflects).
- **Admin exploration evidence gathered this session (all via user-supplied screenshots — Human
  Observation + Static Artifact, not live browser automation by this session; NOW formalized as
  FINDING-013 through FINDING-017, see above).** Test
  booking used throughout: Branch `NDC2_Ahmed Alhussieny (BRN297)`, Airline PNR `A12IVP`, Booking
  Reference `NDCEG-BR-F2609273dNAKZ`, Order Id `BRN297NDCORD260927O9XJH1`, Total **24,072.00 EGP**,
  same flight as the Portal booking (DEL->IXE->DXB, 15/10/2026, IX-1782+IX-813), 1 Adult (Ahmed
  Elhussieny) + 1 Child (asid adel) + 1 Infant (mady samy). Pre-booking wallet balance
  7,877,972.19 EGP; post-booking 7,853,900.19 EGP (exact -24,072 match everywhere it's checked).
  - **Search results show a rule-engine breakdown not seen on Portal**: Original EGP 12,122 (struck
    through — exact match to Portal's own pre-ancillary baseline for this same flight, confirming
    supplier-offer parity across channels) -> Saving EGP 150 -> Trip Price EGP 11,972 -> + Svc.
    charge EGP 75 -> bookable EGP 12,047.
  - **Potentially resolves/reopens FINDING-003 (Test Gap, Portal's Fare Breakdown never showed
    Service Charge/Discount line items, attributed to "not configured yet"):** Admin's final Fare
    Details panel explicitly itemizes **Service Charges (+): 75 EGP** and **Discount (-): 150 EGP**
    as their own rows (Base 4,505 + Tax 7,617 + Svc Charge 75 + Meal 825 + Baggage 10,500 + Bundle
    700 − Discount 150 = 24,072 EGP exactly). Since the rule engine is shared (see correction above),
    this suggests Service Charge/Discount **do work and do display**, at least via this channel/
    scenario — worth revisiting FINDING-003/GAP-004 rather than leaving them as "unconfigured."
  - **Costing & Payment page fully reconciles**: per-passenger Total (EGP) column sums to 12,047
    (matches search-result price exactly); Total SSR Amount 12,025 (Meal 825 + Baggage 10,500 +
    Bundle 700, exact); Total Booking Amount 24,072 (= 12,047 + 12,025, exact); **Total Profit:
    -75 EGP** (Total Sales 24,072 − Total Net 24,147) — this booking sold at a slight loss, exactly
    equal to the Service Charge, because of the 150 EGP discount. Not a defect, but a real scenario
    Test Design could use for a "negative margin" case.
  - **Reports (6 in scope — Daily Sales excluded, see above): 5 confirmed correct, 1 confirmed
    broken.** Total Due to NDC, Agency Wallet (Top-up Balance/Net Amount), Sales (Sales Amount/
    Payable To Ndc), AR Ledger (Credit/Running Balance), and Wallet History (credit/debit) all show
    24,072 / 7,853,900.19 consistently and correctly. Wallet History has a **labeling quirk** worth
    noting (not a numeric defect): Start/End Balance rows appear under the "Debit" column while the
    actual money-out transaction appears under "Credit" — inverted from normal accounting
    convention. **Statement report confirmed broken on Admin too** — same "No data has been found!"
    as Portal/FINDING-012, for the same real booking every other report correctly reflects. Per the
    user: still to be designed as pending/blocked test cases in Stage 3, not investigated further now.
  - **Resolved — out of scope (user, 2026-09-27):** a **"Void/Cancel"** link appears on Admin's
    booking detail page (Search Booking -> booking -> per-passenger ancillaries view), which visually
    differs from Portal's confirmed zero post-booking controls (FINDING-010) — but the user has
    explicitly ruled it **out of scope**. Do not pursue it as a test-worthy item or Finding; noted
    here only so a future session doesn't rediscover it and reopen the question.
- **Agreed path (not yet started):** revise the shared `ancillaries-baseline` Project Context (and
  then AirIndia's own, referencing it) to formally declare this Admin scope, **then** run a live
  Discovery pass on Admin (mirroring the rigor already applied to Portal) before Stage 3 — per the
  user's own choice over the alternative (skip Discovery, hand Test Design a flagged gap).
- **Testing approach decided for AirIndia** (after discussion, replacing an initial "full parallel
  Postman search+match, then book, then retrieve" proposal modeled on other Suppliers): **do the
  entire booking cycle from the system (Admin/Portal UI) normally, then verify only via the
  supplier's retrieve endpoint** (Postman) that the booked/persisted data (prices, SSR/ancillary
  amounts) is correct — no pre-booking parallel search/offer-matching step. Trade-off flagged and
  accepted implicitly by proceeding: this approach cannot independently verify rule-engine/ROE math
  against a raw pre-booking baseline, and cannot verify that the full ancillary *availability* set
  shown pre-selection is accurate (only that what was *selected* persisted correctly). Apply to
  **both Admin and Portal** (their separate rule engines/wallets each need their own retrieve-based
  verification). User confirmed they **do have** a Postman collection/API access for AirIndia's NDC
  connection (this resolves `SupplierChecklist.md` §3b's "Swagger/OpenAPI/Postman availability: To Be
  Discovered" / "Direct API access availability: To Be Discovered" rows — **not yet updated in that
  file**, and the collection's actual location was never established before the conversation moved on
  — ask again next session if needed).
- **Live-tested this approach against the real Y1ZVFF booking** using a retrieve-endpoint JSON the
  user pasted directly (not fetched by this session). Result, **kept as a note only, per the user's
  explicit instruction — NOT formalized as a Finding, no FINDING-013 created:**
  - Strong confirmation: grand total 48,244 INR × 0.5 ROE = 24,122 EGP exactly; Base fare and Tax
    both reconcile exactly between the sum of all 3 passengers' individual amounts and the aggregate
    totals; Infant has no `passengerAncillaries` field at all, independently confirming FINDING-006
    at the supplier-data level (not just UI).
  - **Unexplained, assumption-free 800 INR gap**: summing the three passengers' individual
    `paxTotalAmount` gives 47,444 INR, but `priceDetails.totalAmount` states 48,244 INR. The same
    800 INR gap appears in the ancillary aggregate specifically (summed per-passenger ancillaries =
    23,200 INR vs. `priceDetails.totalAncillariesAmount` = 24,000 INR). This 800 INR is present in
    the aggregate/grand-total fields but isn't attributable to any individual passenger's breakdown —
    a candidate real defect in how this booking's ancillary/grand total is computed or persisted at
    the supplier side (unrelated to FINDING-012's Statement report — this is the booking retrieve
    endpoint). A working hypothesis (unconfirmed) is that it's Meal (VQSB)-related, possibly one
    leg's charge not being captured per passenger, since Meal's Application Level is Per Segment
    (2 legs) — but this was not verified before the user said to leave it as a note. **If a future
    session revisits this booking's pricing, re-derive the math in this section before trusting the
    hypothesis.**

## 9. Exact next steps

**Both gates Stage 3 needs are now clear**: Project Context (shared baseline rev 4 + AirIndia rev 3)
and Discovery (rev 8, 17 Findings) are both `Approved` as of 2026-09-28. Stage 3 (`test-design-skill`)
was invoked and is actively in progress — see below, this is mid-flight, not a fresh start.

1. **Test Design is in progress.** Invoked with: mixed passenger scenarios (2 ADT + 2 CHD + 2 INF
   where applicable — recall FINDING-006, Infant excluded from Baggage/Meal/Bundle), both STOP and
   NON-STOP flights, One-way + Round-trip only (multi-city explicitly not supported for AirIndia),
   routes DEL-BOM (new) and DEL-DXB (already used throughout Discovery). Testing approach: book
   normally through the system UI (both Admin and Portal), verify via the supplier's retrieve
   endpoint only (Postman) — user confirmed they have Postman/API access, but **its exact
   location/format was never established** — ask before Test Design/Execution needs to actually call
   it. Statement report (FINDING-012, confirmed Bug on both channels): write test cases now, hold
   Pending/Blocked, don't execute against the currently-broken report.
2. Stage 3 should have everything it needs already present per the QA Assessment Report's own
   Handoff Confirmation (§12/§14 of that report) — don't re-derive Discovery output, just consume it.
3. Eventually Stage 4M (Manual Execution) — per the user's original choice, no automation branch.

## 10. What must NOT be changed without explicit reason + user awareness

- `profile.json`'s root-level `defaultBaseUrl`/`login` (still `.70`, used by other modules — Agency,
  Branch, Import Booked PNR). Never repoint this to `.213`.
- `apps.portal.login.successSelector` — must stay `text=TOTAL FLIGHTS`, not `text=Book Flight` (see
  §6.2).
- `credentials.json` — never create, read, or write it as the agent. Only the human does.
- The real booking created this session (PNR `Y1ZVFF` / `NDCEG-BR-F260926mlLT19`) and the earlier one
  (`YSTPMB` / `NDCEG-BR-F260926SxPS22`) — these are real records in a live system, not local state to
  clean up.
- `run-006__2026-09-23_21-17-04__.../` — an earlier misfired run (wrong `scopeFamily`), left in place
  deliberately per the platform's "run folders are immutable" convention. Don't delete it, don't use
  it — `run-007` is the correct/active one.
- The standing safety rule: **always explicitly ask the user to confirm Staging (never infer from a
  name) before any irreversible action** (booking, payment, cancellation, etc.), every single time,
  regardless of what was confirmed in a previous session or even earlier in the same session.

## 11. Tests run this session and their results

No `npm test` / automated test-suite run was part of this session's work (this was live
browser-automation exploration + a real booking, not code with unit tests). If touching
`platform_core/tools/browser_driver/` or `platform_core_data/knowledge_base/browser/profile.json`
again, run the existing suite first to confirm nothing regressed:
```
npm test                  # node --test across platform_core/tools/**/__tests__
npm run verify:boundary   # branch-boundary check
```
(These were **not** run this session — the only test-adjacent activity was live manual verification
against the real Admin/Portal applications, documented in full above.)

## 12. Commands needed to continue

```bash
# Confirm current branch / run
git status
node platform_core/tools/run_manager/cli.js active

# Reachability check before any live-automation attempt
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 8 http://192.168.1.213/auth/login
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 8 http://192.168.1.213:9500/auth/login

# Re-authenticate live (requires the user's credentials.json to already exist and be reachable)
# Admin:
#   BrowserDriver.authenticate({ env: 'ANCILLARIES_STG' })
# Portal:
#   BrowserDriver.authenticate({ env: 'STG_PORTAL', app: 'portal' })
# (These are JS API calls, not CLI commands — invoke from a Node script the way this session's
# scratchpad scripts did; see the scratchpad directory pattern in project conventions.)

# Inspect current Supplier Feature registry state
node platform_core/tools/module_manager/cli.js supplier-feature supplier stage ancillaries air-india discovery --status <S> ...   # to record any future stage change
node platform_core/tools/module_manager/cli.js supplier-feature inspect-scope --name "AirIndia" --json   # sanity-check scope

# Run the platform's own test suite before/after touching browser_driver or profile.json
npm test
npm run verify:boundary
```

## 13. Session update — 2026-09-28 late night: Stage 4M (Manual Execution) live, resuming on a different computer

**This section is current truth; it supersedes §9 above where they conflict.** Stage 3 (Test Design)
is `Approved` — `TestCases_Ancillaries_AirIndia.md` revision 7, 27 test cases, 26 `Approved` /
1 `Pending` (TC-ANC-026, held pending the Statement-report defect, FINDING-012 — do not execute it).
Traceability Matrix rev 5, Coverage Report rev 6, both `Approved`. Stage 4M (Manual Execution) was
started this session and is **in progress**, not finished — this branch's work is being pushed to a
new branch, `ancillaries-airindia-run007`, specifically so it can be pulled and continued from a
different machine tomorrow. `NDC_Core_Service_Test` itself was left untouched.

### 13.1 Execution Safety is already resolved — don't redo it

The project's only `execution_safety_policy.json` was written for an unrelated earlier NDC Admin
Portal effort and forbade `BOOK`/`PAYMENT`/`WALLET_CHARGE`/`UPDATE` outright. The user explicitly
authorized a narrow, additive relaxation this session (**HD-SAFETY-006**, 2026-09-28): `policyVersion`
bumped 1→2, a `SelfCreated`-only `Approval Required` carve-out added to `booking`/`financial`
categories and the four actions above (the pre-existing `"*"` `Forbidden, absolute` rules for every
other ownership class are untouched). `environmentAliases` extended to include `STG_PORTAL` and
`ANCILLARIES_STG`. This is recorded in `execution_safety_policy.json`/`.md` (already committed) and
satisfied by a run-scoped authorization file already written:
`platform_core_data/runs/run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia/metadata/SafetyAuthorizations.json`
(+ `.md` companion) — 4 records (`BOOK`, `PAYMENT`, `UPDATE`, `WALLET_CHARGE`, all `SelfCreated`,
`Allowed`, approved by Ahmed Alhussieny, `revoked: false`). `SafetyPreflight.md` in the same
`metadata/` folder documents the full preflight (38 planned operations, 0 Forbidden, 0 outstanding
Approval Required). **None of this needs to be redone** — just confirm on the new machine that
`execution_safety_policy.json`'s `policyHash` still reads `sha256:28fd9c73b561997058e000dcd32079d5`
(i.e. nobody hand-edited it in between).

### 13.2 Environment facts the new computer needs

- **Admin**: `env: 'ANCILLARIES_STG'` → `http://192.168.1.213/auth/login`.
- **Portal**: `env: 'STG_PORTAL'` → `http://192.168.1.213:9500/auth/login`.
- `credentials.json`'s `activeEnvironment: "STG"` is a **dangling pointer** — no `"STG"` key exists
  under `environments` any more. Always pass `env` explicitly; never rely on the default.
- `credentials.json` itself is gitignored and was **never committed** (confirmed via
  `git check-ignore -v` — two independent ignore rules cover it). It will not be on the new machine
  after a `git pull`. **You must copy it there separately, by hand, through a secure channel** — do
  not paste its contents into chat or a tracked file.
- `.mcp.json`'s Playwright server is now **headed** (`--headless` removed) — this change is committed,
  so the new machine gets it automatically; just run `/mcp` there to (re)connect.

### 13.3 TC-ANC-002 — exact execution state (Portal, one-way with stop, DEL→DXB, 2 Adult/2 Child/2 Infant)

**Booking completed and confirmed.** Airline PNR `Z33F4Z` · Booking Reference
`NDCEG-BR-F260928ABwtpA` · Trip ID `AGN9808NDCNDCORD2609281VJKYT` · Status `Confirmed` · booked
28 Sep 2026 19:37 · Total `45,692 EGP` (Base 6,610 + Taxes 15,082 + Meal 1,000 + Baggage 21,000 +
Bundle 2,000 — matches the on-screen fare breakdown exactly). Evidence screenshots saved to
`platform_core_data/runs/run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia/manual_execution/artifacts/TC-ANC-002/`
(`01_passenger_details_filled.png` through `05_booking_confirmation.png`).

**Confirmed against the test case's expected behavior:**
- Both Infants correctly **excluded** from Meal/Baggage/Bundle selection at every layer checked: the
  ancillaries-step UI only rendered cards for the 4 non-infant passengers, and the confirmation page's
  Passenger Details table shows `-` for Meal/Seat/Bundle for both Infants while all 4 Adults/Children
  show `Shondesh Tiramisu (VSDB)` per leg.
- Meal selection is correctly **per-leg** (2 dropdowns per passenger, one per flight segment) and
  Baggage is correctly **per-journey** (1 dropdown per passenger for the whole DEL→DXB trip) —
  matches the rule the test case expects.

**One genuine finding, not yet dispositioned — flag for follow-up:** the Bundle-selection dropdown
during booking offers/selects **"Value Pack"**, but the booking confirmation page's own "Bundle
Details" section labels the same 2,000 EGP bundle **"Xtra Pack"**. The price is consistent (2,000 EGP
both places), only the name differs between the selection UI and the confirmation document. This
needs a disposition decision (defect vs. accepted labeling quirk) before TC-ANC-002 can be marked
`Passed` outright.

**Dispositioned 2026-09-29 by the user: not an issue, but keep it traced.** Not a defect and not a
Finding — it does not block TC-ANC-002 from `Passed`. Record it in TC-ANC-002's `Notes` field in
`manual_execution/ManualExecutionResults.md` (and the matching CSV row) as a traced observation:
"Bundle name differs between selection UI ('Value Pack') and Booking Confirmation 'Bundle Details'
('Xtra Pack'); price consistent at 2,000 EGP; dispositioned by user 2026-09-29 as not an issue —
traced only." Check the other E2E cases (TC-ANC-003/004/005/035) for the same label difference and
note it the same way wherever it recurs; do not raise it as a defect.

**Checkpoint 1 (supplier Retrieve) — done 2026-09-29.** Called via the exported collection
(`air-india/NDC-INT-ANC… Copy.postman_collection.json`, locally git-excluded because it holds live
API keys; `CI_RetreiveBooking` now uses `{{baseUrl}}` =
`https://ndc-integration-stg-ne-3.azurewebsites.net/`; body `supplier: AirIndia`,
`CredentialsSelector: EGY`, `pnr` = airline PNR, `gdsPNR`/`bookingToken` empty, `SurName: x`).
Full reconciliation in `manual_execution/artifacts/TC-ANC-002/06_supplier_retrieve_reconciliation.md`.
Taxes, baggage and bundle match exactly at ROE 0.5; base/grand total differ by 600 EGP, consistent
with Markup (confirm in Search Booking Costing). Four observations awaiting user disposition there:
A) second-leg Meal missing from the supplier's itemization while included in its totals (same
pattern as the Y1ZVFF 800 INR gap); B) check-in baggage 30 kg on confirmation vs 40/30 kg in
Retrieve; C) Retrieve `bookingStatus: UnKnown` vs Portal `Confirmed`; D) bundle naming (traced only).

**Observation A verified as a defect 2026-09-29 (TC-ANC-023 executed).** Retrieved YSTPMB, Y1ZVFF and
Z33F4Z live: in all three the gap between itemized and aggregate ancillary totals equals exactly the
per-passenger meal lines (500 / 800 / 1,000 INR), and the Portal charged both legs every time, matching
the aggregate. Meal is itemized once per passenger instead of per segment. Details and defect draft:
`manual_execution/artifacts/TC-ANC-023/TC-ANC-023_investigation.md`. Carry into
ManualExecutionResults as a defect against the Retrieve mapping; TC-ANC-022 and the six E2E cases'
retrieve checkpoints should compare meals against the aggregate, not the itemization, until fixed.

**Still open — the remaining checkpoints from TC-ANC-002's own Steps:**
1. Supplier retrieve-endpoint call (via the Postman collection the user shared) — compare passenger/
   ancillary data directly, but remember the fare comparison is **not** raw equality: apply
   `(retrieve fare × ROE) + Markup` before comparing, per the clarification recorded in the test suite
   itself (TC-ANC-022 and all six E2E cases' retrieve-endpoint steps).
2. Search Booking Ancillaries (Admin) — verify ancillaries recorded correctly against this PNR.
3. Search Booking Costing (Admin) — verify costing recorded correctly against this PNR.
4. Portal Reports — verify this booking's amount surfaces correctly (same pattern as FINDING-011 from
   the earlier Discovery session, §2 #8 above).

**Update 2026-09-29 (afternoon): steps 6–8 executed, all Pass on their own checks.** Done via
Playwright MCP (headed) with a `BrowserDriver`-generated storage-state (see §13.5 update below).
Details: `manual_execution/artifacts/TC-ANC-002/07_steps6-8_checkpoints.md`. The 600 EGP residual is
resolved as a uniform +100 EGP/passenger on base fare, infants included (not yet checked against the Admin
markup config). Total Due to NDC and Sales both show 45,692. New observations awaiting user disposition
there: **E** (flight/booking times shifted by the browser timezone, +3h in Cairo), **G** (My Bookings list
Total 21,692 leaves out the 24,000 SSR, a candidate defect), **F** (`[Xtra Pack` label glitch), **H**
(Booked / Ticketed Document / Confirmed / UnKnown status wording).
**Dispositioned by the user 2026-09-29:** G = system behavior, not a bug (the full amount shows in the booking
details). B = real but outside Ancillaries scope, a Note. E = outside scope, kept as an observation. C/H = a Note.
F = **Low-severity UI defect** (draft in `07_steps6-8_checkpoints.md`). **Proposed TC-ANC-002 status: Passed**,
with Notes D/G/B/E/C/H and defect F. Nothing on TC-ANC-002 is still open.

**TC-ANC-003 attempted 2026-09-29 ~14:18–14:43 UTC — proposed Blocked at step 2, no booking made.**
The Portal booking flow **no longer shows the "03 Ancillaries (Meals and baggage)" step** that existed on
28 Sep. It stops at 01 Passenger Info → 02 Bundles and then goes to Payment, with no meal/SSR request at all.
Reproduced on 6 offers: BOM↔COK round trip (EC/BT/SM), BOM→COK one way, DEL→DXB one way, and **the same
IX-1782/IX-813 flight as TC-ANC-002**. This blocks every remaining E2E case and every Meal/Baggage atomic case.
2A/2C/2I got no BOM↔COK offers; 1A/1C/1I did. Full log:
`manual_execution/artifacts/TC-ANC-003/00_execution_log.md`. **Next: user/dev to find out why the
Ancillaries step disappeared (deploy? Admin config? supplier SSR?) before any further E2E execution.**
**Update 2026-09-30:** the missing step was a wrong deployment (user). Attempt 2 (29 Sep) got stuck "In Progress"
(order `…260929ULRTYZ`, no PNR, not charged) and was abandoned. **Attempt 3 is the attempt of record: Confirmed, PNR
`P6MVJA`**, Trip `AGN9808NDCNDCORD260930KLWHYX`, 35,854 EGP. All 8 steps Pass → **proposed TC-ANC-003 Passed**. Round-trip
Baggage is offered **once per direction**. Retrieve totals match exactly at ROE 0.5 (no markup today). **Defect A extended:**
the Retrieve itemization lists each ancillary code once per passenger, so a round trip's return-direction baggage, bundle
and meal are all missing from the itemization (the totals include them). Full log: `TC-ANC-003/00_execution_log.md`.
Speed: the booking page has a hard **20-minute** session, so fill forms with batched `browser_run_code_unsafe` and keep
Book Flight / Book / Confirm-Book as separate visible clicks. Supplier Retrieve: scratchpad `retrieve.js <PNR> <dir> <prefix>`
(reads the keys from the local collection in-process and redacts them in the saved request). Next: TC-ANC-004 (Admin,
one-way non-stop BOM-COK).
**TC-ANC-004 (Admin) executed 2026-09-30 — proposed Passed.** PNR **USCWVR**, `BRN297NDCORD260930QJBKMA`, 18,176 EGP,
Branch BRN297 (no Agency). All 9 steps reconcile, including the Retrieve with ROE 0.5 + Markup 100/pax + Service Charge 150
− Discount 300, Costing (Net = supplier total, Profit 450), and all five reports with the wallet delta 7,849,943.19 → 7,831,767.19.
Attempt 1 hit the duplicate-passenger guard (409, same names as P6MVJA), which the **UI did not surface**. Use **unique
passenger names per booking** from now on. Admin notes: Sales "Total Markup 0.00" vs Profit 450; AR Ledger/Wallet History
show the deduction under Credit; Agency Wallet "Last Transaction Date" stale. Log: `TC-ANC-004/00_execution_log.md`.
Admin navigation: top tabs (Booking-Mid Office, Reports); sub-pages sit in the collapsible left `.side-menu`. Report Branch
filters are `p-multiselect`; Agency Wallet needs Currency "Egyptian Pound". Next: TC-ANC-005 (Admin, round-trip with stop, DEL-DXB).
Technique update: `pressSequentially` into `p-calendar` date fields works (no calendar clicking needed).
MCP session refresh: rerun `save_session.js`, then `browser_close` and navigate — no `/mcp` reconnect needed.

**§13.5 update — resolved: MCP with storage-state.** Scratchpad `save_session.js` calls
`BrowserDriver.authenticate()` for `STG_PORTAL` and `ANCILLARIES_STG` and writes a merged
`mcp_storage_state.json` into the session scratchpad. `.mcp.json`'s playwright args gain
`--storage-state <that path>` (a **local-only edit — do not commit it**; the path is per machine and per
session). When tokens expire, rerun the script and `/mcp` reconnect.

### 13.4 Reusable technique notes (PrimeNG quirks) — don't re-derive these from scratch

These were hard-won this session driving the live Portal UI via one-shot Node scripts
(`BrowserDriver.authenticate({ env, app: 'portal', stage: 'manual_execution' })`), **not** via the
persistent Playwright MCP browser tools — see §13.5 for why that distinction matters for tomorrow.

- **`p-calendar` (DOB / Document Expiry) date fields**: `.fill()` looks like it works (a screenshot
  taken immediately after shows the value) but does **not** persist through Angular's reactive-forms
  validation — a subsequent Tab/blur reverts it to empty ("Required"), because raw DOM value
  assignment never updates the bound FormControl. The only reliable method is real click-based
  navigation: click the calendar-trigger icon → click `.p-datepicker-year` (opens decade view) →
  compute `steps = round((decadeStart - targetDecadeStart) / 10)` and click `.p-datepicker-prev`
  (or `-next` if negative) that many times → click the year cell → click the month abbreviation
  (`Jan`..`Dec`) → click the day cell (`td:not(.p-datepicker-other-month) >> text="${day}"`). **Scope
  every one of these lookups to the specific open `.p-datepicker` panel**
  (`page.locator('.p-datepicker').first()`), never the whole page — an unscoped substring search for
  "May" once matched a hidden chat-widget byline ("How may I help you today?") elsewhere on the page.
  Use plain substring `hasText` matches with `.last()`, not anchored regex (`/^1990$/` mysteriously
  failed even when the text was visibly present).
- **`p-dropdown` fields**: some have their own visible `id` on the host element itself (e.g.
  `gender_0`); others have a hidden/zero-size inner `<input id="title_0">` whose clickable wrapper is
  an ancestor `p-dropdown`/`.p-dropdown` element — check `isVisible()` on the `#id` element first,
  fall back to `ancestor::p-dropdown | ancestor::*[contains(@class,"p-dropdown")]` if not. Some select
  immediately on click with no separate option panel.
- **Portal Passenger Details field-ID pattern** (consistent across all 6 rows, index 0–5): `title_N`,
  `firstName_N`, `lastName_N`, `dob_N`, `gender_N`, `email_N`, `phone_N`, `document_N`, `docExpiry_N`,
  `nationality_N`, `assigned-to_N` (Infants only, indices 4/5), `frequentFlyer_N`, `flyerNumber_N`.
  Row order: 0,1 = Adults; 2,3 = Children; 4,5 = Infants. Title options are only `Mr`/`Mrs`/`Ms` — the
  app has no `Master`/`Miss`/`Infant` title.
- **Bundle/Meal/Baggage dropdowns detach mid-click**: this booking page renders a live "Time left:
  MM:SS" countdown that ticks every second; Angular appears to re-render the dropdown's `<li>` options
  on that tick, so a mouse `.click()` on the option intermittently throws "element was detached from
  the DOM, retrying" even though the locator resolves to the right element every time. **Fix: open the
  dropdown, then select via keyboard** (`page.keyboard.press('V')` for typeahead, or
  `ArrowDown` + `Enter`) instead of clicking the option text directly — keyboard selection doesn't
  depend on a specific DOM node surviving until the click completes.
- **Meal/Baggage dropdown "index drift"**: don't loop `text=Choose a meal`'s `.nth(i)` over a fixed
  count — each selection replaces that dropdown's own "Choose a meal" text, so the *n*th match shifts
  under you after each selection and a later index times out waiting for a slot that no longer exists.
  Instead loop on `.first()` and recount after every selection until none remain.
- **"Book" is two clicks, not one**: the page's own `Book` button opens a **"Confirm Booking"** modal
  ("Are you sure you want to book this flight?") with its *own* `Book` button inside it — the real
  mutation only happens on the second click.
- **Known transient flakiness, not a script bug**: occasional failed/blank first navigation and one
  observed case of the login form being correctly filled but never submitting/redirecting — both
  resolved simply by retrying the whole script once. Not worth chasing further.

### 13.5 Open question carried to tomorrow (raised by the user this session)

Execution so far drives the browser via one-shot Node scripts through
`BrowserDriver.authenticate()` — each script run is its own OS process with its own fresh browser, so
**any** unhandled failure (a bug in the script, not just page flakiness) kills the whole process and
forces a full restart: fresh login, re-search, refill all 6 passengers, replay every step just to
reach the one line that needed fixing. The user asked directly why this keeps happening. The honest
answer: the `.mcp.json` Playwright MCP server (already configured headed, `/mcp` to connect) holds one
**persistent** browser session across many individual tool calls
(`browser_click`/`browser_snapshot`/`browser_type`/etc.) instead of spinning up and tearing down a
browser per script — a failed step could be fixed and retried right where it failed, without replaying
everything before it. Worth deciding at the start of tomorrow's session whether to switch to
MCP-tool-driven execution for the remaining checkpoints/test cases, trading more individual tool calls
for much cheaper recovery from mid-flow failures.

### 13.6 Exact next steps, in order (updated 2026-10-01)

**Status: all 6 of 6 E2E scenarios done.** TC-ANC-002 (Portal, one-way w/ stop, DEL-DXB), TC-ANC-003
(Portal, round-trip non-stop, BOM-COK), TC-ANC-004 (Admin, one-way non-stop, BOM-COK), TC-ANC-005
(Admin, round-trip w/ stop, DEL-DXB), TC-ANC-034 (Admin, one-way, no ancillaries, boundary case,
DEL-DXB), and TC-ANC-035 (Portal, round-trip, ancillaries onward-leg-only, boundary case, DEL-DXB) are
all **proposed Passed**, fully reconciled through all of their own checkpoints. Remaining:

1. Execute the remaining Atomic/Scenario cases (12 of which carry Notes pointing to which E2E case's
   evidence they can reuse instead of a fresh booking — see the test suite itself).
2. TC-ANC-026 stays `Excluded`/unexecuted until FINDING-012 (Statement report) is actually fixed.
3. Only once every `Approved` case has a recorded result: produce the terminal Stage 4M deliverables
   — `manual_execution/ManualExecutionResults.md`, `ManualExecutionSummary.md`,
   `ManualTestResults.csv`, `ManualQAReport.md` (+ `.report.json` + generated `.html`) — none of these
   exist yet; they are a single finished-state write per the skill spec, not something to checkpoint
   partway through.

**TC-ANC-035 (Portal) executed 2026-10-01 — proposed Passed.** PNR **S13GWS**,
`AGN9808NDCNDCORD2610018SZQCK`, 35,281 EGP, round-trip DEL-DXB (1 stop each way), 1A/1C/1I (2A/2C/2I
returned no offers). Meal+Baggage selected **onward only**; every checkpoint confirms zero
carry-over to the return leg — confirmation shows ancillaries tied only to the onward flight numbers,
My Bookings' Segment Ancillaries explicitly labels the return journey **"No Ancillaries"**, Costing
shows Total SSR exactly 7,600 EGP (Meal 800 + Baggage 6,800), reports match. **Answers the test case's
own open question**: Baggage (Per-Journey, ANC-48/FINDING-002) CAN be selected onward-only/
asymmetrically on a round trip — confirmed independent per direction, not whole-journey-forced.
**Defect A generalizes again**: supplier retrieve itemization undercounts a repeated ancillary code
even when the repeats are two legs of the *same* direction (not only onward-vs-return) — and this
time the undercount also corrupted the per-passenger `paxTotalAncillaryAmount` field, not just the
itemized list; the booking-level aggregate stayed correct. No Markup on Base fare (Portal booking,
consistent with TC-ANC-003). Log: `TC-ANC-035/00_execution_log.md`.

**Update 2026-10-03: all 20 remaining Approved Atomic/Scenario cases executed.** 16 were desk-review
reuses of already-captured E2E evidence (TC-ANC-001, 006, 007, 008, 010, 011, 012, 014, 016, 019, 020,
021, 022, 023, 024, 025 — all proposed Passed; TC-ANC-023's prior investigation formalized with an
explicit disposition). The remaining 4 needed one new live Portal booking (one-way DEL-DXB, 2 Adult +
2 Infant, PNR **S61IHQ**, Booking Ref `NDCEG-BR-F261002w2b5LM`, 18,422 EGP):
- **TC-ANC-009** (Passed): deliberately attempted assigning a second Infant to an already-assigned
  Adult — the UI does **not** pre-filter the "Assigned to" dropdown, but blocks the save with an
  inline **"This adult already assigned!"** error, confirming real enforcement (not just convention).
- **TC-ANC-018** (Passed): changed Passenger 1's Meal (125→200 EGP) and removed Passenger 2's Baggage
  (−900 EGP) mid-flow before booking; each edit updated the Net Payable by exactly its own delta with
  zero cross-passenger effect.
- **TC-ANC-015** (Passed): wallet balance confirmed unchanged throughout selection (1,056,791.9 EGP,
  read repeatedly); post-booking deduction confirmed exactly 18,422 EGP via the Total Due to NDC
  report (a direct re-read of the post-booking balance widget itself was skipped after a second
  attempt hit the known transient `192.168.1.213` network dropout — not worth a third live booking).
- **TC-ANC-027** (Inconclusive, by explicit user choice): the Wallet History Debit/Credit labeling
  observation is solid (3/3 Admin bookings) but the required product/business decision was deferred
  — re-open once that call is made.

**Status: 26 of 27 cases now have a recorded result — only TC-ANC-026 remains Excluded/Pending**
(Statement report defect, FINDING-012, still open).

**Update 2026-10-03: Stage 4M terminal deliverables produced — this branch's work is complete
pending reviewer approval.** All four required artifacts written under
`manual_execution/`: `ManualExecutionResults.md`, `ManualExecutionSummary.md`, `ManualTestResults.csv`,
`ManualQAReport.md` (+ `.report.json` + `.html`, built via `report_builder`, validated clean — 27 test
cases, 6 categories, 3 sections).

**Terminal classification reconciliation (important — read before trusting any single test case's
earlier "Proposed Passed" note in isolation):** each live execution session proposed a per-booking
status reflecting that booking's own system-side consistency. At this terminal synthesis stage, Defect
A's full cross-run pattern (the supplier retrieve endpoint's itemization undercounts any ancillary code
repeated for a passenger, confirmed on 5 independent bookings: Z33F4Z, P6MVJA, MSK5XB, S13GWS, plus
TC-ANC-023's own 3-PNR investigation) was applied strictly against the Result Classification rules
(manual-execution-skill §8): **TC-ANC-022** — whose sole purpose is exactly this retrieve-endpoint
comparison — is reclassified **Failed** (it was never formally dispositioned case-by-case before now).
TC-ANC-002/003/005/035 remain **Passed** (their own primary six-checkpoint business-flow assertion held
in full; Defect A is carried as a documented, cross-referenced defect in their own entries, consistent
with how the independently-observed Bundle-label bracket glitch was already handled under TC-ANC-002
during execution). TC-ANC-004/034 are unaffected (no repeated ancillary code in either booking, so
Defect A never manifests — clean control cases).

**Final suite result: 24 Passed · 1 Failed (TC-ANC-022, Defect A, Medium/P2) · 1 Inconclusive
(TC-ANC-027, Wallet History labeling — product decision explicitly deferred by the user) · 1 Excluded
(TC-ANC-026, Pending Review) · 0 Blocked/Skipped/Not Executed.** Pass rate 24/26 = 92.3% of executable
scope; authorized coverage 26/27 = 96.3% of the suite. Full defect write-ups (15-section Defect
Documentation Standard) for Defect A and the Wallet History observation are in
`ManualExecutionResults.md` §3.1.

**Recommendations carried into the QA Report:** (1) fix Defect A's NDC integration service mapping,
then re-execute TC-ANC-022; (2) obtain the deferred Wallet History labeling decision, then re-execute
TC-ANC-027; (3) fix FINDING-012, move TC-ANC-026's `Review` to `Approved`, then execute it; (4) low
priority — fix the Bundle Services label's stray `[` bracket.

**Next step belongs to the human reviewer**, per this skill's own closing-message convention: approve
the delivery as-is, request a re-run of the Failed/Inconclusive cases once their underlying items are
resolved, or send feedback back to Test Design. This stage has no downstream skill — it is the Manual
pipeline's terminal stage (`pipeline.md` §3.3).

**TC-ANC-034 (Admin) executed 2026-10-01 — proposed Passed.** PNR **H9ZK7E**,
`BRN297NDCORD261001JQUISB`, 24,742 EGP, one-way DEL-DXB (1 stop), 2A/2C/2I returned 200 offers
*directly* (no fallback needed, unlike TC-ANC-005's round-trip on the same route). Zero ancillaries
selected for any passenger — Bundle is itself a required field but offers a free "DEL" option (0 EGP)
distinct from the paid "Value Pack"; Meal/Baggage carry no asterisk and were left fully unset. All 9
checkpoints reconcile: confirmation shows Meal/Seat/Bundle "-" for all 6 passengers; supplier retrieve
shows `passengersSelectedAncillaries: {}` and `totalAncillariesAmount: 0`; **ANC-55 confirmed** — Base
fare Markup gap (600 EGP = 100/pax × 6) is present identically with zero ancillaries, proving Markup is
unconditional; Search Booking's Booking Details page **omits the Segment Ancillaries section entirely**
when there's nothing to show (not a defect, just documented absence-of-content behavior); Costing Net
24,292 = supplier total exactly, Profit 450 = Markup(600)+Service(150)-Discount(300); all five reports
reconcile with wallet delta 7,780,111.19 → 7,755,369.19. No new defect. Log:
`TC-ANC-034/00_execution_log.md`. Next: TC-ANC-035 (Portal, round-trip, ancillaries onward-leg-only).

**Defect A has grown in scope** (§13.3/TC-ANC-023): the supplier retrieve endpoint's itemized
`passengerAncillaries` list undercounts any ancillary code that repeats across multiple
segments/directions — originally found for Meal only, now also confirmed for Baggage and Bundle on
TC-ANC-005's round-trip. Carry this as one defect against the Retrieve mapping, not several.

**MCP session refresh procedure, confirmed working**: when the Admin/Portal session genuinely expires
(not just a load-race), rerun `save_session.js` (may need 1-2 retries — known transient login
flakiness), then `browser_close` + `navigate` — no `/mcp` reconnect needed, since the storage-state
*file* is what gets re-read, and the arg path doesn't change.
