# Discovery Timeline — ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Scope | Supplier Feature: `ancillaries` / Supplier: `air-india` |
| Produced by run | `ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Revision | 2 |
| Run Started | 2026-09-25 |
| Run Ended | 2026-09-27 |

## Log

```
2026-09-25  Stage 2 (Discovery) started. Project Context (rev 2, Approved) reviewed.
2026-09-25  Discovery Mode selected: User-guided exploration (Mode #4). Browser automation
            unavailable this run — no credentials.json exists (human-created only, not yet set
            up), and the Portal login flow has no supported schema in profile.json today. Admin
            confirmed to be the same application as the existing profile.json target, on a
            different environment (192.168.1.213 vs the profile's 192.168.1.70) — live automation
            deferred to a future task per the user's decision.
2026-09-25  Begin exploring Admin precondition (ANC-14..18). Asked operator to open Admin, go to
            Branch config, and report Supplier/Credential assignment for the test Branch.
2026-09-25  Operator reported: test Branch confirmed, AirIndia assigned, Credential configured.
            Branch name: "NDC2_Ahmed Alhussieny". Screenshot supplied: Admin > Product Access
            Details > Flight tab.
2026-09-25  Screenshot shows Supplier Name "IndiaAirLine" (active), Credential Name
            "IndiaAirLineStg", Product "Flight", Description "GG" — not "AirIndia" as registered
            in the platform.
2026-09-25  FINDING-001 created (Category: Requirement Gap) — Supplier name mismatch between the
            platform's "AirIndia" and the application's "IndiaAirLine". Status: Needs Human
            Review. Asked operator to confirm whether these are the same entity.
2026-09-25  Operator confirmed: "IndiaAirLine"/"IndiaAirLineStg" is AirIndia's application-internal
            identifier — same entity. FINDING-001 updated to Status: Rejected (resolved
            non-issue), Confidence 92%.
2026-09-25  Begin Portal exploration (ANC-19..21). Operator performed a flight search: DEL -> DXB,
            15/10/2026, passenger mix 1 ADT + 1 CHD + 1 INF (Infant included — a useful boundary
            case against ANC-49's Adult/Child-only eligibility default once Ancillaries is
            reached).
2026-09-25  Search returned results (ANC-19 confirmed). Operator selected a flight labeled
            "IndiaAirLine ndc test" (ANC-20 confirmed — clear Supplier attribution evidence).
            Route: DEL -> IXE -> DXB, 1 stop, 2 segments (IX-1782, IX-813), Air India Express,
            price EGP 12,122. Multi-segment journey — usable to distinguish Segment vs Journey
            level ancillary behavior (ANC-10..13). Proceeding to PAX Details.
2026-09-25  PAX Details screenshot reviewed. No separate "Ancillaries" screen exists — Meal
            Preference and Extra Baggage appear directly per passenger card. Meal Preference shown
            per leg (Leg 1 DEL->IXE, Leg 2 IXE->DXB) = Per Segment. Extra Baggage shown once for
            DEL->DXB = Per Journey. Both match ANC-48 default. FINDING-002 created (Observation,
            confirmed behavior).
2026-09-25  Fare Breakdown panel reviewed: Base fare (per pax type), Ancillaries & SSR (Meal
            +1,100 EGP, Extra Baggage +1,750 EGP), Tax & Fees (per pax type), Total 14,972 EGP.
            Arithmetic is a plain sum with no separate Markup/Discount/Service Fee line items
            visible, though ANC-44 describes such a rule engine. FINDING-003 created (Requirement
            Gap, Needs Human Review).
2026-09-25  Extra Baggage line item under Passenger 1 reads "Special equipment Handling Fee 1 Pc"
            rather than a standard baggage label. FINDING-004 created (Observation, unclear item,
            annotated evidence not capturable under User-guided exploration per §5.11.3).
2026-09-25  Asked operator: (a) does the Infant passenger (Passenger 3) show any ancillary
            options, confirming/refuting the ANC-49 Adult/Child-only eligibility default; (b)
            where does Bundle appear, since it wasn't visible on this screen; (c) confirm Seat
            does not appear anywhere in this flow.
2026-09-26  Operator confirmed: (a) Infant has no ancillaries anywhere; (b) Bundle is a separate
            screen shown before Ancillaries; (c) Seat is not supported by this Supplier, matching
            expectation.
2026-09-26  Screenshot reviewed: booking wizard is 01 Passenger Info -> 02 Bundles -> 03
            Ancillaries ("Meals and baggage"). FINDING-002 corrected — an Ancillaries step does
            exist, it just excludes Bundle terminologically. Bundle step shows one "Select Bundle"
            control for the whole DEL->DXB journey (Value Pack / Xtra Pack, Adult 350 EGP, Child
            350 EGP, Infant 0 EGP) -> Application Level = Per Journey. FINDING-005 created
            (resolves the open Bundle-Application-Level item via Discovery).
2026-09-26  FINDING-006 created — Infant confirmed excluded from Baggage, Meal, and Bundle,
            verifying ANC-49's platform-wide default for AirIndia.
2026-09-26  Operator completed Payment Details (Wallet: 1,221,562.9 EGP unchanged, Net Payable
            23,822 EGP) and confirmed the booking. FINDING-007 created — wallet balance dropped
            to 1,197,740.900 EGP only after confirmation, by exactly the Total Amount, verifying
            ANC-46.
2026-09-26  Booking Confirmation ("Order Details") reviewed: Airline PNR YSTPMB, Booking
            Reference NDCEG-BR-F260926SxPS22, Status Confirmed. Segments, Passenger Details table,
            Extra Baggage section (Adult/Child only, Infant excluded), Bundle Details (Xtra Pack),
            and aggregate Fare Details (Meal +500, Baggage +10,500, Bundle +700, Total 23,822 EGP)
            all reviewed. FINDING-008 created — Baggage/Bundle clearly reflected; Meal's
            per-passenger column placement is ambiguous from the screenshot, flagged as Unclear
            Item Q1 (annotation not capturable under User-guided exploration).
2026-09-26  Asked operator to: (a) clarify the Meal column ambiguity (Q1); (b) confirm whether
            this Order Details page is also reachable later via "My Bookings" (satisfying the
            itinerary/booked-flight-search re-check requirement, ANC-53); (c) attempt to
            change/remove a selected ancillary now that the booking is confirmed, to test ANC-52
            (expected: blocked).
2026-09-26  Operator supplied a zoomed screenshot: the "Meal" column is distinct from "Ticket
            Number" and correctly shows the selected meal per leg for Adult/Child, blank for
            Infant. Q1 resolved. FINDING-008 updated to Confidence 88%, title/description revised
            to reflect full confirmation of ANC-53 for Meal, Baggage, and Bundle.
2026-09-26  Operator navigated to My Bookings and opened the itinerary detail: a "Segment
            Ancillaries (Meals, Baggage, Seats)" section shows Extra Baggage and per-segment Meal
            Preference for each passenger, with prices. FINDING-009 created — second, independent
            confirmation of ANC-53 (itinerary/reports reflection).
2026-09-26  Operator attempted to change/remove a selected ancillary on the confirmed booking;
            reported it is blocked, matching ANC-52. No screenshot supplied for this specific
            attempt. FINDING-010 created at reduced Confidence (65%) reflecting the weaker,
            uncorroborated evidence.
2026-09-26  Declared in-scope surface (Project Context §2, 9 areas) fully covered. Stage 2
            Discovery session concluding — proceeding to synthesize the QA Assessment Report.
2026-09-26  QA Assessment Report published (Pending Review). User requested to resolve remaining
            Open Questions before approving.
2026-09-26  Operator resolved: (OQ-D-001) "Special equipment Handling Fee" is one of several
            selectable baggage options in a "Choose a baggage" dropdown (also "+5Kgs Xtra-Carry-On")
            — FINDING-004 updated to Status Rejected (false read). (OQ-D-002) Markup folds into
            Base Fare by design; Service Charge/Discount should show separately but are not yet
            configured for this Branch/Credential — FINDING-003 recategorized to Test Gap.
            (OQ-D-003) DB/Security/Performance layers: "not for now" — deferred, not in scope
            currently. (OQ-D-005) Post-booking: no ancillary control exists at all (not merely
            disabled) — FINDING-010 updated to Confidence 78%. (OQ-D-004) Operator did not
            understand the destructive-action-policy question as originally phrased — rephrased
            in plain language for a follow-up answer.
2026-09-26  Operator answered OQ-D-004 (rephrased): irreversible actions (e.g. completing a real
            booking) are permitted for testing only when the credential/environment is confirmed
            Staging — ask first if not already established. This run's credential name
            ("IndiaAirLineStg") already confirms Staging, so this run's booking action was
            compliant. All 5 Open Questions raised this run are now resolved.
2026-09-26  Operator corrected the above: a credential/environment NAME is not sufficient proof of
            Staging (a "Stg"-named credential could still be Production, or vice versa). Policy
            corrected: always explicitly ask the user to confirm staging before any irreversible
            action, every time — never infer it from naming. QA_Assessment_Report.md OQ-D-004/
            REC-006 updated accordingly.
2026-09-26  Discovery Mode upgraded: live browser automation now available. Operator set up
            reachability to 192.168.1.213 and created `credentials.json` (human-created, never
            written by this skill). Browser Profile (`profile.json`) extended with an `apps` map
            and Browser Driver (`driver.js`/`api.js`) extended with an optional `app` parameter to
            support Portal's structurally different 3-field login (Agency Code + Email + Password)
            alongside Admin's 2-field login — additive, backward-compatible change.
2026-09-26  Authenticated to Admin (`http://192.168.1.213`) via
            `BrowserDriver.authenticate({ env: 'ANCILLARIES_STG' })` — Direct Observation mode
            begins for this run. Landed on Dashboard as Ahmed Alhussieny, Branch
            "NDC2_Ahmed Alhussieny" (matches the Branch used throughout this Discovery session).
2026-09-26  Live-navigated Admin: Master -> Supplier -> Supplier Credentials -> searched "India"
            (Status: Both). Result: Credential name "IndiaAirLineStg", Supplier "IndiaAirLine",
            Status Active — independently reproduces the Product Access Details screenshot's
            mapping on a second, distinct screen. FINDING-001 upgraded: Evidence Category now
            includes Direct Observation, Confidence raised to 99%, corroborating screenshot
            `supplier_credentials_search_direct_observation.png` added to its Evidence Package.
2026-09-27  Authenticated to Portal (`http://192.168.1.213:9500`) via
            `BrowserDriver.authenticate({ env: 'STG_PORTAL', app: 'portal' })` after extending the
            Browser Profile/Driver with a second login flow (Agency Code + Email + Password).
            Landed on the Portal Dashboard as Ahmed Alhussieny. Fixed an incorrect
            `successSelector` in `profile.json` (`text=Book Flight` matched a hidden sidebar
            duplicate; changed to `text=TOTAL FLIGHTS`, a unique always-visible element).
2026-09-27  User confirmed proceeding into the booking wizard (Passenger Info -> Bundles ->
            Ancillaries) was acceptable as read-only, with an explicit stop before any
            payment/confirmation step, per the standing staging-confirmation rule.
2026-09-27  Live flight search DEL -> DXB, 15/10/2026, 1 ADT + 1 CHD + 1 INF — reproduced the exact
            same flight from the original Discovery session (IX-1782/IX-813 via IXE, EGP 12,122,
            "IndiaAirLine ndc test", Air India Express), confirming ANC-19/ANC-20 live.
2026-09-27  Completed Passenger Info for all three passengers (Test Adult/Child/Infant, Nationality
            India, Infant "Assigned to" Test Adult) via live automation — reached Bundles step
            (Passenger Info marked "Completed").
2026-09-27  Bundles step: selected "Value Pack" ("Xtra Pack") — Adult 350 EGP, Child 350 EGP,
            Infant 0 EGP, matching FINDING-005 exactly. Fare Breakdown updated to "(+) Ancillaries
            & SSR 700 EGP" / "Bundle Fare +700 EGP" (350+350, Infant excluded), Total 12,822 EGP.
            FINDING-005 upgraded to Direct Observation / Confirmed (97%).
2026-09-27  Ancillaries step reached (Bundles marked "Completed"). Test Adult and Test Child each
            show Meal Preference per leg (DEL->IXE, IXE->DXB) and Extra Baggage once for DEL->DXB —
            matching FINDING-002 exactly. FINDING-002 upgraded to Direct Observation / Confirmed
            (98%).
2026-09-27  Expanded all passenger rows and ran a DOM query for passenger names on the Ancillaries
            step: only ["Test Adult", "Test Child"] found — no Infant passenger row exists at all
            (stronger than the original report of "no ancillary options shown"). FINDING-006
            upgraded to Direct Observation / Confirmed (99%), Occurrence Count 2.
2026-09-27  Reached the "Book" button (irreversible booking-confirmation boundary). Per the
            standing rule (always ask before any irreversible action, never infer staging from
            naming), stopped here without clicking it — persisted all Direct Observation evidence
            gathered so far into the Discovery artifacts instead of proceeding to payment.
2026-09-27  User explicitly authorized proceeding ("now you can book a flight"). Per the standing
            rule, asked again to confirm ANCILLARIES_STG/STG_PORTAL are Staging, not Production —
            user confirmed yes. Proceeded.
2026-09-27  Selected Meal (Quinoa Salad, 200 EGP/leg) and Extra Baggage (Special equipment Handling
            Fee 3 Pc, 5,250 EGP) for both Test Adult and Test Child. Fare Breakdown updated:
            Bundle +700, Meal +800, Baggage +10,500 EGP, Total 24,122 EGP — closely mirroring the
            original session's figures. Wallet balance confirmed unchanged (1,197,740.9 EGP) at
            this point, consistent with FINDING-007.
2026-09-27  Checked Terms & Conditions and clicked "Book". A confirmation modal ("Are you sure you
            want to book this flight?") appeared; clicked its "Book" button. Booking succeeded:
            Airline PNR **Y1ZVFF**, Booking Reference **NDCEG-BR-F260926mlLT19**, Trip ID
            **AGN9808NDCNDCORD260926HEXJFS**, Status Confirmed, Total 24,122 EGP. Order Details page
            reproduced FINDING-008's exact structure (Passenger Details table, Extra Baggage,
            Bundle Details, Fare Details) — FINDING-008 upgraded to Direct Observation / Confirmed
            (99%), Occurrence Count 2.
2026-09-27  Re-checked wallet balance via a fresh Payment Details screen: 1,173,618.9 EGP — exactly
            24,122.0 EGP less than the pre-booking balance, matching the booking Total to the EGP.
            FINDING-007 upgraded to Direct Observation / Confirmed (99%).
2026-09-27  Navigated to My Bookings (via the sidebar, a route independent of the booking flow) and
            opened this booking's itinerary detail. Expanded "Segment Ancillaries (Meals, Baggage,
            Seats)" for Test Adult: Extra Baggage once for DEL->DXB, Meal Preference per leg —
            reproducing FINDING-009 exactly. No "Test Infant" section present, consistent with
            FINDING-006. FINDING-009 upgraded to Direct Observation / Confirmed (98%), Occurrence
            Count 2.
2026-09-27  On the same booking-details page, ran a full DOM scan for any change/cancel/remove/
            modify/edit control: zero matches found anywhere on the page. FINDING-010 upgraded to
            Direct Observation / Confirmed (98%), Occurrence Count 2 — stronger evidence than the
            original operator statement (no screenshot), since this is now a comprehensive
            programmatic scan of a real booking.
2026-09-27  All 10 Findings from this run have now been evidenced: 2 Rejected (resolved non-issues),
            7 Confirmed via Direct Observation (live browser automation on real live sessions and
            one real test booking), 1 remaining at Needs Human Review (FINDING-003, a test-data
            configuration gap unrelated to live-automation reachability). Persisted all evidence to
            Discovery artifacts.
2026-09-27  User flagged, ahead of Stage 3, that Portal Reports (Total Due, Total Sales, Statement)
            needed checking after an ancillaries booking — pointed out that `ProjectContext.md` §2
            already declares "booking confirmation, itinerary, and reports" in scope (ANC-53), but
            `Coverage_Summary.md` rev 1 never actually visited Reports despite claiming 100%
            coverage. Treated as a Discovery follow-up closing this gap under run-007, not new scope
            or a new run. User supplied the Reports side-menu's exact XPath
            (`li[5]/a`, `href="/reports"`). Confirmed Headed mode with the user before starting.
2026-09-27  Re-authenticated to Portal (`STG_PORTAL`, headed). The Reports link is a real but
            visually hidden DOM node (same class of issue as the earlier "Book Flight" sidebar
            duplicate) — a Playwright-gated click times out; a native JS `.click()` on the anchor
            works. Landed on `/reports`: four report cards — Total Due to NDC, Sales, Bookings
            (not asked for), Statement.
2026-09-27  Total Due to NDC (`/reports/total-ndc`): the Invoice From/To Date fields are read-only
            `p-calendar` inputs — `page.fill()` does not register with the Angular form control
            (search kept reporting "Required"); calendar day cells had to be clicked instead. Also
            found the "Invoice To Date" calendar disables any day after today (no future invoice
            dates) — first attempt (day 30) silently failed for this reason; day 27 (today) worked.
            Searched Invoice Date 01/09/2026-27/09/2026 + Booking Reference
            `NDCEG-BR-F260926mlLT19` -> exactly 1 row: Amount Payable To Ndc **24122 EGP**, matching
            the booking Total exactly. FINDING-011 created (Category: Observation, Status:
            Confirmed, Direct Observation, 98%).
2026-09-27  Sales (`/reports/sales`): same date range, no other filter -> 2 rows, including the same
            booking (Payable To Ndc 24,122.00, Sales Amount 24,122.00, Total Markup 0.00). Page-level
            "Total Sales Amount: 47944" correctly equals the sum of both rows (24,122 + 23,822).
            Folded into FINDING-011 as a second, independent confirmation point.
2026-09-27  Statement (`/reports/statement`): same date range, both unfiltered and with Passenger
            Name "Test Adult" -> "No data has been found!". To rule out a UI/filter artifact, called
            the exact backend endpoint the UI uses
            (`POST http://192.168.1.213:8080/odeysysportal/v2/reports/statement-report`) directly
            from the authenticated browser session with a fully unfiltered wide range
            (2026-08-01 to 2026-09-27) -> HTTP 200, `{"payload":[],"total":0}` — this account/branch
            has zero Statement rows for any period tested, not just a mismatch on this one booking.
            FINDING-012 created (Category: Test Gap, Status: Needs Human Review, Direct Observation,
            90%) — Total Payable/Wallet Balance cannot be verified until a business/config decision
            is made on why Statement has no data, mirroring FINDING-003's pattern. User agreed to
            classify as Needs Human Review rather than investigate further live.
2026-09-27  Persisted FINDING-011/FINDING-012 evidence to Discovery artifacts; updated
            `Coverage_Summary.md` to rev 2 (12/12 declared areas, Reports now actually visited) and
            `Findings_Summary.md` (12 total Findings: 2 Rejected, 8 Confirmed, 2 Needs Human Review).
2026-09-27  User reviewed the Statement report directly and confirmed: "that is issue in report
            itself" — resolving FINDING-012's open business/config question. Not a test-data gap like
            FINDING-003/GAP-004; a confirmed defect in the Statement report's own data path.
            FINDING-012 reclassified: Category Test Gap -> **Bug**, Severity N/A -> **Medium**
            (business rule inconsistency — Severity Matrix §5.4), Status Needs Human Review ->
            **Confirmed** (96%, Direct Observation now corroborated by the user's direct confirmation
            removing the remaining ambiguity). GAP-006 resolved on this same basis.
2026-09-27  User instructed: for Stage 3 (Test Design), write Statement report test cases now (same
            six-checkpoint/downstream-reflection model as FINDING-011's Total Due/Sales cases), but
            hold their execution Pending/Blocked until the Statement defect is fixed — do not attempt
            to execute against the currently-broken report. Recorded in FINDING-012's Recommendation
            and in `QA_Assessment_Report.md` §12/§13 as an explicit Test Design handoff instruction.
2026-09-27  Updated `Findings_Summary.md` (Category/Severity/Status breakdowns) and
            `QA_Assessment_Report.md` to rev 7 reflecting the reclassification.
2026-09-27  User explored Admin's booking flow directly (preferring to supply screenshots/narration
            over live browser automation, since the flow is structurally similar to Portal) and
            corrected an earlier assumption: the rule engine is **shared** between Admin and Portal,
            not Admin-exclusive as first assumed; only the **wallet** genuinely differs (three
            components on Admin vs. Portal's one). Markup/Send Quotation/Save Quote and Banque Misr
            confirmed out of scope / merely optional.
2026-09-27  User supplied a full walkthrough with screenshots: Admin's **Booking-Mid Office** cycle
            (Branch/Agency/Agent selection -> search -> flight selection, showing a visible
            Original/Saving/Trip Price/Svc charge breakdown -> PAX Details -> Bundle -> Ancillaries
            -> Payment (Wallet or Banque Misr, three-part wallet) -> Order Details confirmation), then
            its **Search Booking** retrieval screen (found the booking by Airline/GDS PNR `A12IVP`),
            then **Costing & Payment** detail (fully reconciling: per-passenger base sums to the
            search-result price; SSR total 12,025 = Meal 825 + Baggage 10,500 + Bundle 700; Total
            Booking Amount 24,072; Total Profit -75 EGP from the Discount/Service-Charge combination).
2026-09-27  User supplied Admin's Reports: Total Due to NDC, Agency Wallet, Sales, AR Ledger, and
            Wallet History all correctly reflect the same real booking (24,072 EGP / wallet
            7,877,972.19 -> 7,853,900.19, consistent everywhere). Wallet History's Credit/Debit
            column labeling noted as inverted from standard convention (figures still correct).
            Statement report reproduced the same "No data has been found!" defect already confirmed
            on Portal (FINDING-012) — user confirmed this is the same underlying defect, to be
            designed as pending/blocked test cases in Stage 3, not investigated further now. Daily
            Sales Report was never evidenced and the user then explicitly marked it out of scope. A
            "Void/Cancel" link noticed on the booking detail page (visually different from Portal's
            confirmed zero post-booking controls, FINDING-010) was also explicitly ruled out of scope
            by the user.
2026-09-27  Formalized all of the above into Discovery artifacts at the user's request
            ("formalize what we have into Discovery Findings"): created **FINDING-013** (booking
            cycle pricing reconciliation), **FINDING-014** (Service Charge/Discount itemized on
            Admin, contrasting FINDING-003), **FINDING-015** (three-component wallet), **FINDING-016**
            (five reports confirmed correct), **FINDING-017** (Wallet History labeling, UX Issue,
            Low). All five are Category Observation/UX Issue, Status **Needs Human Review** — per the
            Confidence Model (§18), Human Observation + Static Artifact evidence (user-supplied
            screenshots, no live automation by this session) can never reach `Confirmed`, regardless
            of how exactly the figures reconcile. Also corroborated FINDING-006 (Infant exclusion,
            Occurrence Count -> 3) and FINDING-012 (Statement defect now confirmed on both Portal and
            Admin, Occurrence Count -> 2) with this same Admin evidence. Updated `Findings_Summary.md`
            (17 total Findings) and `QA_Assessment_Report.md` to **rev 8**, adding a new §14 "Admin
            Scope (Provisional)" section that explicitly caveats these Findings as pending a formal
            Project Context revision (not yet done) before Stage 3 should weight them equally to
            §1-13's already-Confirmed Findings.
```
