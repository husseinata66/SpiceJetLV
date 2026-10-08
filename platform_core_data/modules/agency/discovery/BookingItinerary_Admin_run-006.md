# Discovery Snapshot — Admin booking details (Itinerary): the Reissue button

| Field | Value |
|---|---|
| Module | `agency` (also cited by `branch` for its Branch-owned booking) |
| Produced by run | `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 1 |
| Screen / State | Booking details, unlocked and locked, with the owning org's Auto Reissue on and off |
| URL / Route | `/booking/booking-details/AGN9780NDCNDCORD260924GKP8CP` (Agency booking `NDCEG-BR-F260924EAzzYT`) · booking details for `BRN265NDCORD2609169XJ1LC` (Branch booking `NDCEG-BR-F260916ENYOeQ`) |
| Discovery Mode | Browser automation — Browser Driver, headed. Read-only, apart from taking the booking lock |
| Evidence Category | Direct Observation / System Response |
| Captured | 2026-09-24 09:56 – 10:28 UTC |
| Role / Credential used | Super Admin (`odeysysadmin` role) |

## 1. Purpose

Shows a booking's details and its mid-office actions. `Reissue` appears when `actionsDetails.canAutoReissue` is true (spec §5).

## 2. Entry Points

| From | Action | Result |
|---|---|---|
| `/booking/search-booking` | Flight tab → Booking Reference → Search → open the row | Booking details |
| Booking details | Created By lock icon | The lock is taken by the current user; actions become available |
| Booking details | View Passenger Details | The passenger table and action buttons open |

## 3. Structure

| Region / Section | Type | Notes |
|---|---|---|
| Status bar | Label | "BOOKING STATUS: Ticketed Document" (FINDING-015) |
| Booking Information | Key/value | Status **Booked**, Booking Type Online |
| Created By card | Card + lock icon | Lock holder shown when locked |
| Passenger panel | Table + buttons | Void / Cancel · Manual Reissue · **Reissue** · Sync PNR · Release PNR |

## 4. Interactive Elements

| Element | Type | Label / Accessible Name | Locator | Required? | Notes |
|---|---|---|---|---|---|
| Lock | Icon button | Created By lock | — (§5.15) | — | Precondition for the actions (CL-3) |
| Reissue | Button | "Reissue" | — | — | **Never clicked** in this run |
| Manual Reissue | Button | "Manual Reissue" | — | — | Shown whatever the checkbox; out of this story's scope |

## 5. Observed Validation & Business Rules

| Field / Action | Observed Behaviour | Trigger | Finding ID (if raised) |
|---|---|---|---|
| Agency booking, AGN9780 on | `canAutoReissue true`; Reissue shown (locked) | Open, lock, panel | — |
| Agency booking, AGN9780 off (BRN265 on) | `canAutoReissue false`; Reissue hidden | Same | — |
| Branch booking, BRN265 off / on | `false` hidden / `true` shown | Same | FINDING-017 |
| Branch booking credential 315, not in BRN265's `[313]` | Reissue still shown while on | Same | FINDING-017 |

## 6. States Observed

| State | How Reached | What Differs |
|---|---|---|
| Unlocked | Open | Open-lock icon; passenger panel collapsed; API `lockedStatus 0` with `canAutoReissue true` |
| Locked by the current user | Lock icon | `lockedStatus 1`; the actions listed above appear in the panel |

## 7. System Responses

| Type | Observation |
|---|---|
| Network | `GET /odeysysadmin/v2/bookingDetails2/itinerary/{orderId}`: `actionsDetails` (`canAutoReissue`, `canManualReissue`, `canReleaseLock` …), `flightBookingDetails` (`bookingStatus 2`, `supplierName Sabre`, `ticketPccId 315`, `lockedStatus`), `agentOrder` (`branchId`, `agencyId`) |

## 8. Evidence Captured

| Evidence | Path |
|---|---|
| Screenshots | `runs/run-006…/discovery/evidence/17`–`23` (incl. `22-…annotated.png`), `26`–`33` |
| Data | `33-branchbooking-cycle-results.json`, `44-session-output-extract.txt`, `45-itinerary-credential-fields.txt` |

## 9. Not Captured

| Missing Item | Reason |
|---|---|
| The Admin panel opened **without** the lock | Not isolated: every open-panel capture had the lock held (FINDING-016 notes) |
| Anything after clicking Reissue | Out of scope, and forbidden this run |

## 10. Findings Raised From This Screen

| Finding ID | Category | Severity |
|---|---|---|
| FINDING-015 | Observation | N/A |
| FINDING-017 (branch) | Observation | N/A |
