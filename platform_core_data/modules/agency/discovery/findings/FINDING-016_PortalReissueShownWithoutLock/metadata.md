# FINDING-016 — On the Portal, the Reissue button shows without a lock; in Admin it was only seen with the lock held

> **Human Review Update (2026-09-24, Mohamed Soliman):** *"yes there is no need of lock on the portal"*. **Intended.** The lock is an Admin (mid-office) precondition only. Status changed from `Needs Human Review` to `Rejected — Confirmed Intended Behaviour`. The observation and evidence below are unchanged.

| Field | Value |
|---|---|
| **Finding ID** | FINDING-016 |
| **Title** | Portal shows `Reissue` on an unlocked booking (`lockedStatus 0`); Admin shows it only after the user takes the lock |
| **Category** | Observation |
| **Severity** | N/A |
| **Severity Reason** | Confirmed intended by the user (2026-09-24). No Severity Matrix criterion applies to confirmed intended behaviour. |
| **Confidence Score** | 90% |
| **Evidence Category** | Direct Observation |
| **Status** | **Rejected — Confirmed Intended Behaviour** (user, 2026-09-24: no lock is needed on the Portal) |
| **Discovery Mode** | Portal: Playwright direct login (headed), read-only. Admin: Browser Driver (headed), read-only apart from taking the lock |
| **Business Risk** | If the lock is meant to stop two users acting on one booking at once, the Portal skips that protection for Reissue. If it's meant only for Admin (mid-office), there's no risk. The answer changes what Stage 3 writes as the Portal precondition. |
| **Technical Risk** | The Itinerary API returned `canAutoReissue: true` in Admin while the booking was unlocked (`lockedStatus 0`, 09:56:53 UTC). So the flag doesn't include the lock, and the Admin lock rule lives in the UI only. Not verified beyond this one booking. |
| **Module** | `agency` |
| **Workflow** | Portal `/myBooking` → Search → Order Id link → `/myBooking/booking-details/AGN9780NDCNDCORD260924GKP8CP`, compared with Admin `/booking/booking-details/AGN9780NDCNDCORD260924GKP8CP` |

## Description

With AGN9780's Auto Reissue **on** (read back in Admin at 13:11:56 UTC), the Portal Itinerary for booking `NDCEG-BR-F260924EAzzYT` showed **Reissue** at 13:12:47 UTC. It returned `lockedStatus: 0`, and the Created By card had **no lock control**. In Admin, the user described the lock as a precondition (CL-3), and the action buttons were captured only after the lock was taken. The unlocked Admin view (`18-on-itinerary.png`) has the passenger panel collapsed and no actions visible.

## Expected Behavior

Not defined in the Project Context for the Portal. The nearest statement is `Reissue_Flow_From_Itinerary.md` CL-3 (user, 2026-09-24): *"Reissue actions appear only while the booking is **locked** by the current user — a precondition"*, which was given while working in Admin. Agency ProjectContext `PO-25` records the Portal difference as observed but doesn't say whether it is intended.

## Actual Behavior

| View | Lock | `canAutoReissue` (API) | `Reissue` button |
|---|---|---|---|
| Admin, before the lock (09:56:53) | `lockedStatus 0`, open-lock icon | `true` | not visible (panel collapsed; `18-on-itinerary.png`) |
| Admin, lock held by Mohamed Soliman (10:00:02) | `lockedStatus 1` | `true` | **shown** |
| Portal, AGN9780 ON (13:12:47) | `lockedStatus 0`, no lock control | `true` | **shown** |
| Portal, AGN9780 OFF (13:11:14, 13:13:52) | `lockedStatus 0` | `false` | hidden |

## Steps to Reproduce

1. In Admin, set AGN9780's Auto Reissue on (edit form → **Approve**).
2. Log in to the Portal (`:9500`) as AGN9780. Go to `/myBooking` → **Search** → click the **Order Id** link of `NDCEG-BR-F260924EAzzYT` → **View Passenger Details**.
3. See **Reissue** under the passenger table. The Created By card has no lock control. **Do not click Reissue.**

## Investigation/Recovery Result

Not applicable. No failure category matched. The Portal result held in all three captures, in order (OFF/ON/OFF), within one cycle.

## Investigation Notes

- **Not isolated in Admin:** whether the **lock** or simply **opening the passenger panel** is what reveals the Admin buttons. Every Admin capture with the panel open had the lock held. Isolating it would mean releasing the lock and reopening the panel, which Stage 3 can do as a read-only step.
- The Portal offers no Manual Reissue (`canManualReissue: false`), while Admin does (`true`). That is recorded in `PO-25` and isn't part of this question.
- **Never clicked:** Reissue, Release PNR and Void/Cancel, on either side.

## Occurrence Count

1

## Unclear Items

| Rect | What was observed | What exactly is unclear | The question | Why the answer matters | Original | Annotated |
|---|---|---|---|---|---|---|
| `Q1a Reissue shown, booking not locked` | `Reissue` rendered on the Portal with `lockedStatus 0` | Whether the Admin lock precondition (CL-3) is meant to apply on the Portal too | Is it intended that the Portal shows Reissue with no lock, or should the Portal also need a lock? | Decides the Portal precondition in every Portal Reissue case, and whether this becomes a Bug | `42-portal-1-AGN9780-ON-itinerary.png` | `42-portal-1-AGN9780-ON-itinerary.annotated.png` |
| `Q1b no lock control on Created By` | The Portal's Created By card has no lock icon (Admin's has one) | Whether the Portal has any lock concept at all | (same question as Q1a) | Same as Q1a | `42-portal-1-AGN9780-ON-itinerary.png` | `42-portal-1-AGN9780-ON-itinerary.annotated.png` |

**How the rectangles were drawn:** the Portal page wasn't reopened for this. The two rectangles were drawn on the **captured** screenshot, at pixel bounds measured from that image, using the Browser Driver's own overlay (`annotate.js`, same colour and labels). The unmarked original is kept beside it for checking.

## Evidence Links

| File | What it shows |
|---|---|
| `42-portal-1-AGN9780-ON-itinerary.png` / `.annotated.png` | Portal, AGN9780 ON: Reissue shown, no lock |
| `22-on-itinerary-reissue-button.png` / `.annotated.png` | Admin with the lock held: Reissue shown |
| `18-on-itinerary.png` | Admin before the lock: open-lock icon, panel collapsed |
| `43-portal-cycle-results.json` | The Portal OFF/ON/OFF results, with `lockedStatus`, flags and button lists |

## Recommendation

**Answered 2026-09-24: intended.** Portal cases have **no lock step**, and Admin cases keep the lock precondition (CL-3).
