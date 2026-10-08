# Discovery Snapshot — Portal booking details: the Reissue button

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 1 |
| Screen / State | Portal booking details for AGN9780's booking, with AGN9780 Auto Reissue OFF → ON → OFF |
| URL / Route | `http://192.168.1.60:9500/myBooking` → `/myBooking/booking-details/AGN9780NDCNDCORD260924GKP8CP` |
| Discovery Mode | Browser automation — Playwright direct login, headed, read-only (no non-GET request) |
| Evidence Category | Direct Observation / System Response |
| Captured | 2026-09-24 13:10 – 13:13 UTC |
| Role / Credential used | Agency user of AGN9780 (Portal) |

## 1. Purpose

The agency's own view of a booking. `Reissue` appears here too, following the Agency's checkbox (`PO-25`).

## 2. Entry Points

| From | Action | Result |
|---|---|---|
| Portal login (agency code, email, password) | Login | `/dashboard` |
| `/myBooking` | Search → click the **Order Id** link (not the booking reference text) | Booking details |
| Booking details | View Passenger Details | Passenger table and actions |

## 3. Structure

| Region / Section | Type | Notes |
|---|---|---|
| Status bar | Label | "AGENCY BOOKING STATUS: Ticketed Document" |
| Created By card | Card | **No lock control** |
| Passenger panel | Table + button | Only **Reissue** (when on). No Manual Reissue, Void or Release |

## 4. Interactive Elements

| Element | Type | Label / Accessible Name | Locator | Required? | Notes |
|---|---|---|---|---|---|
| Order Id link | Link | the order number | — (§5.15) | — | Opens the details |
| Reissue | Button | "Reissue" | — | — | **Never clicked** |

## 5. Observed Validation & Business Rules

| Field / Action | Observed Behaviour | Trigger | Finding ID (if raised) |
|---|---|---|---|
| AGN9780 off | `canAutoReissue false`; no Reissue | Open details | — |
| AGN9780 on | `canAutoReissue true`; Reissue shown with `lockedStatus 0` | Open details | FINDING-016 |
| Manual Reissue | `canManualReissue false` in every state | — | — |

## 6. States Observed

| State | How Reached | What Differs |
|---|---|---|
| OFF (13:11:14, 13:13:52) | Admin untick → edit-form Approve | No Reissue |
| ON (13:12:47) | Admin tick → edit-form Approve | Reissue shown |

## 7. System Responses

| Type | Observation |
|---|---|
| Network | Only GET requests from the Portal session. The itinerary response carries `canAutoReissue`, `canManualReissue`, `bookingStatus 2`, `lockedStatus 0` |

## 8. Evidence Captured

| Evidence | Path |
|---|---|
| Screenshots | `runs/run-006…/discovery/evidence/41-portal-*-mybooking.png`, `42-portal-*-itinerary.png`, `42-portal-1-AGN9780-ON-itinerary.annotated.png` |
| Data | `43-portal-cycle-results.json` |

## 9. Not Captured

| Missing Item | Reason |
|---|---|
| Branch-created booking on the Portal | The Portal can't see parent-Branch bookings (`PO-26`, the user's statement; not tried) |
| Console log | Not collected |

## 10. Findings Raised From This Screen

| Finding ID | Category | Severity |
|---|---|---|
| FINDING-016 | Observation | N/A |
| FINDING-015 | Observation | N/A |
