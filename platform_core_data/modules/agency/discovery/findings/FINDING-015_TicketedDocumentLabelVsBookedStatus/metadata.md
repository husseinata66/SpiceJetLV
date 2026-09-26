# FINDING-015 — Top bar says "Ticketed Document" while the booking Status says "Booked"

| Field | Value |
|---|---|
| **Finding ID** | FINDING-015 |
| **Title** | The Itinerary's status bar reads "Ticketed Document", while Booking Information and every passenger read Booked |
| **Category** | Observation |
| **Severity** | N/A |
| **Severity Reason** | The user confirmed that the Reissue condition is Status `Booked` and the bar label is not the condition (`PO-24`). Two labels for different things is not a defect. |
| **Confidence Score** | 95% |
| **Evidence Category** | Direct Observation |
| **Status** | **Rejected — Confirmed Intended Behaviour** (user, 2026-09-24, `PO-24`) |
| **Discovery Mode** | Browser automation — **Browser Driver**, headed (Admin), and Playwright direct login (Portal), both read-only |
| **Business Risk** | A tester reading only the top bar could decide that a Booked booking is ticketed and not eligible, and design the wrong precondition. |
| **Technical Risk** | None identified. |
| **Module** | `agency` |
| **Workflow** | Admin `/booking/booking-details/AGN9780NDCNDCORD260924GKP8CP`, and Portal `/myBooking/booking-details/AGN9780NDCNDCORD260924GKP8CP` |

## Description

On booking `NDCEG-BR-F260924EAzzYT` (the user's manual booking under AGN9780, supplier Sabre), the bar reads **"BOOKING STATUS: Ticketed Document"** in Admin and **"AGENCY BOOKING STATUS: Ticketed Document"** on the Portal. In the same view, **Booking Information → Status** reads **Booked** (`bookingStatus: 2`), and each passenger row reads **BOOKED**, each with a ticket number.

## Expected Behavior

- Agency ProjectContext ASM-022: *"`BOOKED` in spec §5 is assumed to be the Itinerary's displayed booking status."* The view shows two different statuses, so the assumption was ambiguous.
- Settled at `PO-24`: *"The Itinerary condition is Status `Booked` (Booking Information and passenger rows), not the 'Ticketed Document' label in the top status bar."*

## Actual Behavior

As described. `canAutoReissue` followed AGN9780's checkbox while the bar read "Ticketed Document" (see agency QA report §5).

## Steps to Reproduce

1. Admin: `/booking/search-booking` → Flight tab → Booking Reference `NDCEG-BR-F260924EAzzYT` → Search → open the booking.
2. Read the status bar, then Booking Information → Status, then the passenger panel.

## Investigation/Recovery Result

Not applicable. No failure category matched.

## Investigation Notes

The label was the same in Admin and on the Portal. The Dashboard search also counted this booking under "Ticketed Document: 1" (session 2026-09-24 08:14). The Dashboard is not in this module's scope and wasn't explored further.

## Occurrence Count

2 (Admin, Portal)

## Evidence Links

| File | What it shows |
|---|---|
| `18-on-itinerary.png` | Admin: the bar reads Ticketed Document; Status reads Booked |
| `23-on-passenger-panel-open.png` | Admin: passengers BOOKED, with ticket numbers |
| `42-portal-1-AGN9780-ON-itinerary.png` | Portal: the same two labels |

## Recommendation

No action is needed. Stage 3 should state the precondition as *"Status Booked (Booking Information)"*, never as the bar label.
