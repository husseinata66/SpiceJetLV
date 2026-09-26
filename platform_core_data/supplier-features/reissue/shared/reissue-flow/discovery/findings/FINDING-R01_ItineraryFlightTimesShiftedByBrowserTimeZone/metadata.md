# FINDING-R01 — Itinerary flight times are shifted by the viewer's time zone

- **Finding ID:** FINDING-R01
- **Title:** The Itinerary shows departure/arrival times shifted by the browser's time-zone offset (+2 h on a Cairo PC)
- **Category:** Defect candidate (Data display / Time-zone handling)
- **Severity (proposed):** High. Passengers and agents read the wrong departure time; the shift depends on who is looking
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Booking Mid Office → Booking details (Itinerary), Admin. Portal Itinerary to be checked
- **Found by:** run-007 Stage 2, comparing Sabre `getBooking` → core service → Admin API → screen (2026-09-26)

## Observed

| Booking | Sabre PNR (getBooking) | Core / Re-shop | Itinerary API text `deptTime` | Itinerary API epoch `departureDate` | Itinerary screen |
|---|---|---|---|---|---|
| `NDCEG-BR-F260924EAzzYT` (GDS PNR RGGMXP), SV-382 CAI→JED 01-12-2026 | 06:05 (schedule since changed) | 06:10 | `06:10:00` | `1796105400000` = 2026-12-01**T06:10:00Z** | **08:10:00** (arr 11:20) |
| `NDCEG-BR-F260926PwYMR2` (GDS PNR OOTKQP), SV-300 CAI→JED 01-12-2026 | 11:45 | 11:45 | `11:45:00` | `1796125500000` = 2026-12-01**T11:45:00Z** | **13:45:00** (arr 16:55) |

Test PC time zone: `Africa/Cairo`. The screen value equals the epoch converted to the browser's local time.

## Root cause (probable)

The Itinerary API stores the **airport-local** time as an epoch labelled **UTC** (`departureDate`, `arrivalDate`), and the Itinerary page formats that epoch in the **browser's** time zone. The text fields `deptTime` / `arrTime` in the same response are correct.

## Steps to reproduce

1. Log in to Admin `http://192.168.1.60` on a PC whose time zone is **not UTC** (e.g. Africa/Cairo).
2. Go to `/booking/search-booking`, choose the **Flight** tab, enter Booking Reference **`NDCEG-BR-F260926PwYMR2`**, click **Search**, and open the order `BRN265NDCORD2609169C3COS`.
3. In **Journey Details**, read **Departure Date-Time**. It shows **01-12-2026 13:45:00**.
4. Compare with the source of truth:
   - Sabre `getBooking` for PNR **OOTKQP**: SV-300 departs **11:45**.
   - Or on the same booking: Reissue → Continue to reissue → Search flights. The results list SV-300 at **11:45**.
5. Open DevTools → Network, reload, open the `GET …/v2/bookingDetails2/itinerary/BRN265NDCORD2609269C3COS` response. Under the flight segment:
   - `deptTime` = `"11:45:00"` (correct);
   - `departureDate` = `1796125500000` → `2026-12-01T11:45:00Z`.
6. **Confirm the time-zone dependency.** Change the PC/browser time zone (e.g. to UTC, or Asia/Dubai), reload the Itinerary, and read Departure Date-Time again.
   - UTC: expected **11:45**.
   - Asia/Dubai: expected **15:45**.
   - The same flight changes time with the viewer.
7. Repeat with **`NDCEG-BR-F260924EAzzYT`** (SV-382): the Itinerary shows **08:10**, while the API's `deptTime` and the Re-shop results show **06:10**.

## Expected

The Itinerary shows the flight's **local airport** time as the supplier returns it (SV-300 **11:45**, SV-382 **06:10**/current schedule). It is the same for every viewer, whatever their time zone, and consistent with the Re-shop results and Review & Pay.

## Actual

The Itinerary shows local time + the viewer's UTC offset (+2 h here). The Re-shop results and Review & Pay show the correct time, so the same flight appears with two different departure times inside one Reissue journey.

## Related (secondary, separate)

- **Schedule change not reflected.** Sabre's PNR now has SV-382 at **06:05** (the booking was made at 06:10); the app still holds 06:10. This is a sync question (Sync PNR is out of this story's scope). Recorded, not part of this defect.

## Evidence

- `discovery/evidence/tz-itinerary-api.json`: Itinerary API responses plus on-screen times, 2026-09-26 20:21 UTC.
- `discovery/evidence/tz-itinerary-agency.png`, `tz-itinerary-branch2.png`
- `discovery/evidence/sabre-getBooking-RGGMXP.json`, `sabre-getBooking-OOTKQP.json`
- `discovery/evidence/core-reshop-*.json`, `d2b-*-widget-and-results.json`
- `discovery/evidence/CoreService_vs_Screen_run-007.md` (C-2, C-6)
