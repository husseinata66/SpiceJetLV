# [Admin/Portal] Reissue an online-booked flight from the Itinerary

**Source:** Plain Text (pasted) — supplied by the user (Mohamed Soliman) on 2026-09-23 and transcribed here verbatim in structure and wording.
**Work item ID:** none supplied
**Type:** User Story
**Recorded:** 2026-09-23
**Status:** Requirements input — not yet consumed by Stage 1.
**Scope binding:** Supplier Feature `reissue` · shared scope `reissue-flow` (`platform_core_data/supplier-features/reissue/shared/reissue-flow/`)
**Prerequisite story:** [`Auto_Reissue_Checkbox_Branch_Agency.md`](Auto_Reissue_Checkbox_Branch_Agency.md)

> **Transcription note.** This file is the *requirement as supplied*, not an interpretation of it. Wording
> and ordering are reproduced exactly as pasted. Resolving anything unclear is Stage 1's job
> (`pipeline.md` §6 Rule 4).

---

## Description

As an authorized Admin/Portal user,
I want to reissue an eligible online-booked flight from the Itinerary,
so that I can select the applicable journey(s) and passenger(s), search for alternative flights through the Re-shop flow, review the fare difference and applicable change fees, complete payment, and exchange the selected flight while maintaining the relationship between the reissued offer and the original booking.

The Reissue feature must support the complete flow:

Prerequisite → Eligibility → Search/Re-shop → Flight Results → Review & Pay → Exchange → Booking Confirmation & E-ticket → Itinerary → PNR Query

## Business Requirement

The system shall allow an eligible flight to be reissued only when the required Reissue configuration is enabled and the flight satisfies the eligibility rules.

The Reissue flow must:

- Be controlled through the Reissue checkbox configured on Branch and Agency CRUD.
- Display Auto Reissue in the Itinerary based on the configured flag.
- Apply Exchange Fees Rule Engine CRUD configuration when configured.
- Allow the user to select the applicable journey(s) and passenger(s) according to eligibility.
- Support only online-booked offers for reissue.
- Allow the user to edit the selected journey's search criteria through the flight widget.
- Display the fare price difference that the user will pay, rather than the total flight price, in the Re-shop results and reissue breakdown.
- Prevent results with negative fare prices/differences.
- Show the fare breakdown per passenger type.
- Allow the user to review the new flight, old flight price, fare difference, wallet balance, payment method, and applicable fare breakdown.
- Handle supplier-side price changes through the agreed price-change popup when the selected offer supports Reprice.
- Process the exchange using the same general cycle as Booking Pay & Book:
  Init/Persist → Call Supplier → Update with Supplier Status.
- Create a new booking reference and Order ID for the reissued offer.
- Maintain the relationship between the reissued offer and the original booking.
- Mark the original offer as Reissued.
- Store the reissue change fee as a Service Charge.
- Preserve the agreed existing behavior of Reports and PNR Query.

## Clarifications supplied later

| # | Source | Clarification |
|---|---|---|
| CL-1 | User, 2026-09-24 (during run-006 Stage 2) | Clicking **Reissue** on a booking whose credential is **not** among the organization's selected *Auto Reissue Credentials* refuses **the reissue** (making the booking itself is never affected) with **"No credential for this booking is assigned to your organisation"**. The Branch/Agency checkbox only controls whether the `Reissue` button is shown. |
| CL-2 | User, 2026-09-24 | A supplier supports reissue only if it is a GDS **and** on the application's hard-coded list: `NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo`. Amadeus and every LCC do not. |
| CL-3 | User, 2026-09-24 | The eligibility status is **`Booked`**. The "Ticketed Document" bar label is not the condition. Reissue actions appear only while the booking is **locked** by the current user — a precondition. |

## Open Questions

None recorded at transcription. Stage 1 records any it finds in the shared-scope Project Context.
