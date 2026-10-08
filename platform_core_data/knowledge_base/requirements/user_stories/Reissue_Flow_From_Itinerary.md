# [Admin/Portal] Reissue an online-booked flight from the Itinerary

**Source:** Plain Text (pasted) — supplied by the user (Mohamed Soliman) on 2026-09-23 and transcribed here verbatim in structure and wording.
**Work item ID:** none supplied
**Type:** User Story
**Recorded:** 2026-09-23
**Amended:** 2026-09-27 — the **Acceptance Criteria** and **Edge Cases & Expected Handling** sections were supplied by the user (Mohamed Soliman) and added; they were missing from the 2026-09-23 transcription. The Description, Business Requirement and Clarifications sections are unchanged.
**Amended:** 2026-10-04 — **`AC-37` and `§4.9 Terms & Conditions` added** on the user's instruction, after the End-to-End Workflow documents (`specifications/Reissue_Feature_EndToEnd_Workflow.md`) described a **T&C acceptance gate before `Confirm & Charge`** that this story never mentioned, and the user confirmed the control exists on screen (2026-10-04). **This is the first content added to this story that was not supplied as part of the original requirement** — it is marked as such everywhere it appears, and the Overall AC count moves 36 → 37. Recorded as `DS-7` on the `reissue-flow` Project Context.
**Status:** Requirements input — consumed by Stage 1 (Project Context Rev 2, approved 2026-09-26) **without** the Acceptance Criteria below. Stage 1 must be revised against them before Stage 3.
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

## Acceptance Criteria

**Source:** Plain Text (pasted) — supplied by the user (Mohamed Soliman) on **2026-09-27** and
transcribed here verbatim in structure and wording. This section was **missing** from the original
2026-09-23 transcription and is added here as a later supply, not as an interpretation.

### How to Initiate

1. The user opens the Itinerary page.
2. The system checks the Branch and Agency Reissue configuration.
3. If Auto Reissue is enabled, the Auto Reissue option/component is displayed.
4. The user selects the flight that requires reissue.
5. The system starts the Eligibility phase.
6. The system checks whether Auto Reissue is applicable for the selected flight.
7. If eligible, the user continues to the Reissue Search/Re-shop flow.

---

### 1. Prerequisites

#### 1.1 Business Flow

Before the Reissue feature can be initiated, the system must validate the required configuration.

Two prerequisites are defined:

- Reissue feature checkbox on Branch and Agency CRUD.
- Exchange Fees Rule Engine CRUD configuration.

The Auto Reissue option displayed in the Itinerary depends on the Reissue configuration flag.

#### 1.2 Screen / Field Details

**Branch CRUD — Reissue Feature Checkbox**

| Property | Requirement |
|---|---|
| Control | Reissue checkbox |
| Purpose | Enable/disable Reissue capability for the Branch |
| Default | According to existing CRUD behavior |
| Validation | The configured value must be respected when initiating Reissue |

**Agency CRUD — Reissue Feature Checkbox**

| Property | Requirement |
|---|---|
| Control | Reissue checkbox |
| Purpose | Enable/disable Reissue capability for the Agency |
| Default | According to existing CRUD behavior |
| Validation | The configured value must be respected when initiating Reissue |

**Exchange Fees Rule Engine CRUD**

The Exchange Fees configuration is used to determine the WT Change Fees applied in the Reissue
breakdown.

Rule:

- If the Exchange Fees Rule Engine is configured, the configured fee is applied.
- If it is not configured, the fee is ignored in the Reissue breakdown.

#### 1.3 Acceptance Criteria

- **AC-1:** The system must validate the Reissue checkbox configuration on Branch.
- **AC-2:** The system must validate the Reissue checkbox configuration on Agency.
- **AC-3:** Auto Reissue must be displayed in the Itinerary based on the applicable Reissue flag.
- **AC-4:** Configured Exchange Fees must be applied to the Reissue breakdown.
- **AC-5:** If Exchange Fees are not configured, they must not be applied to the Reissue breakdown.

#### 1.4 Validation Rules

- The Reissue flow must respect the configured Branch and Agency flags.
- The user must not be allowed to initiate the feature when the required configuration does not permit it.
- Exchange Fees must only be included when configured.

---

### 2. Eligibility

#### 2.1 Business Flow

The Eligibility phase starts when the user selects a flight from the Itinerary.

The system must:

1. Identify the flight selected for Reissue.
2. Check whether Auto Reissue is applicable to the selected flight.
3. Check whether the user can select multiple journeys or all required journeys.
4. Check whether the user can select multiple passengers or all required passengers.
5. Apply the default passenger selection rule.
6. Validate that the selected offer was booked online.

The Eligibility requirements are explicitly defined in the workflow document.

#### 2.2 Screen / Field Details

**Selected Flight**

| Field / Control | Behavior |
|---|---|
| Flight | Selected by the user from Itinerary |
| Purpose | Determines the flight/offer to be reissued |
| Validation | Must satisfy Reissue eligibility |

**Auto Reissue Applicability**

The system must check whether Auto Reissue is applicable to the selected flight.

| Control | Behavior |
|---|---|
| Auto Reissue | Available only when applicable |

**Journey Selection**

The system must determine whether the user can:

- Select multiple journeys, or
- Select all required journeys.

*Important:* Journey selection must follow the eligibility result.

**Passenger Selection**

The system must determine whether the user can:

- Select multiple passengers, or
- Select all required passengers.

**Default Passenger Selection**

All required passengers must be selected by default in this phase.

The workflow explicitly states:

> Default in this phase all required — "Not split".

This default rule applies to passenger selection and must not be interpreted as automatically
selecting all journeys.

**Online Booking Validation**

Only online-booked offers are eligible for Reissue.

#### 2.3 Acceptance Criteria

- **AC-1:** The user can initiate Eligibility by selecting a flight from Itinerary.
- **AC-2:** The system checks whether Auto Reissue is applicable to the selected flight.
- **AC-3:** The system determines the permitted journey selection behavior.
- **AC-4:** The system determines the permitted passenger selection behavior.
- **AC-5:** All required passengers are selected by default.
- **AC-6:** The default passenger selection is Not Split.
- **AC-7:** Only online-booked offers can proceed with Reissue.
- **AC-8:** An offline-booked offer must not proceed through the Reissue flow.

#### 2.4 Field-Level Validation

**Selected Flight**
- A flight must be selected before Eligibility processing can continue.
- The selected flight must be eligible for Auto Reissue.

**Journey Selection**
- Selection must follow the eligibility response.
- The system must not allow journey selection that is not permitted by the eligibility result.

**Passenger Selection**
- Required passengers must be selected according to eligibility.
- Required passengers must be selected by default.
- Default state must be Not Split.
- Passenger selection must follow the eligibility response.

**Booking Type**
- The offer must be an online-booked offer.
- Offline-booked offers must not proceed.

---

### 3. Search / Re-shop

#### 3.1 Business Flow

After Eligibility, the user enters the Search/Re-shop phase.

The system opens the flight widget and loads the selected journey.

The user can edit the selected journey's search criteria, including:

- Date
- Origin
- Destination
- Cabin Class

The system then performs the Re-shop search and returns available flight results.

#### 3.2 Search Criteria Fields

**Date** — The user can edit the flight date. *Validation:* the old date cannot be selected.

**Origin** — The user can edit the origin according to the flight widget behavior.

**Destination** — The user can edit the destination according to the flight widget behavior.

**Cabin Class** — The user can edit the cabin class according to the flight widget behavior.

**Selected Journey** — The selected journey returned from Eligibility is loaded into the flight
widget. The user can edit its search criteria.

#### 3.3 Search Rules

**Round Trip** — If the selected flight is Round Trip, it cannot be changed into Multi-City.

**Old Date** — The system must not allow the user to select the old date.

#### 3.4 Flight Results

The system must display the available flight results using the normal flight-search information with
the agreed Reissue pricing behavior.

**Fare Price** — The displayed price must represent the fare price difference that the user will pay.

The system must not return a result with a negative price.

#### 3.5 Result Fields

The flight result must display the normal flight-search details, with the Reissue-specific pricing
changes.

The workflow specifies that all other flight details are displayed as normal flight search details,
with some changes.

**Reissue-Specific Pricing** — The result must display:

- Fare price difference
- Applicable fare breakdown

#### 3.6 Fare Breakdown Fields

The fare breakdown must display the difference amount per passenger type.

The defined components are:

| Fare Component | Behavior |
|---|---|
| Base Fare | Display difference |
| Taxes | Display difference |
| Supplier Penalty | Display applicable difference/amount |
| WT Change Fees | Apply from Exchange Fees CRUD when configured |

The breakdown is calculated/displayed per passenger type.

#### 3.7 Acceptance Criteria

- **AC-1:** The selected journey must open in the flight widget.
- **AC-2:** Date, Origin, Destination, and Cabin Class can be edited according to the search behavior.
- **AC-3:** The old flight date cannot be selected.
- **AC-4:** A selected Round Trip cannot be changed into Multi-City.
- **AC-5:** Search results must display the fare price difference payable by the user.
- **AC-6:** Negative prices must not be returned.
- **AC-7:** Fare breakdown must display the difference amount per passenger type.
- **AC-8:** Fare breakdown must include Base Fare, Taxes, Supplier Penalty, and applicable WT Change Fees.
- **AC-9:** WT Change Fees must be ignored when no Exchange Fees configuration exists.
- **AC-10:** Other flight details must follow the normal flight-search result behavior.

#### 3.8 Field-Level Validations

**Date** — Old date must not be selectable.

**Origin / Destination** — Values must be valid search criteria. Search must be based on the selected
journey.

**Cabin Class** — Value must be valid for the selected search.

**Flight Result Price** — Price must represent the applicable difference. Negative prices must not be
returned.

**Fare Breakdown** — Values must be displayed per passenger type. Applicable configured WT Change Fees
must be included. Unconfigured WT Change Fees must not be included.

---

### 4. Review & Pay

#### 4.1 Business Flow

After selecting a Re-shop result, the user proceeds to the Review Page.

The Review Page must display the new flight information, old flight price, payable fare difference,
wallet information, payment method, and fare breakdown.

The system must also check whether the current wallet balance can cover the new selected
flight/payment amount.

#### 4.2 New Flight Data

The Review Page must display all data related to the newly selected flight.

The new flight information must be presented as the selected Reissue flight.

#### 4.3 Old Price

The Review Page must display the old price for the flight being reissued.

This allows the user to compare the existing flight price with the new selected flight/reissue amount.

#### 4.4 Fare Price Difference

The fare price difference must be displayed prominently in the right-top area of the Review Page.

This represents the amount the user will pay for the Reissue.

#### 4.5 Wallet Information

The Review Page must display: **Current Wallet Balance**

The system must check whether the available amount can cover the new selected flight/reissue payment
amount.

#### 4.6 Payment Method

The user can select the payment method:

- Wallet
- Banque Misr

The selected payment method must be used for the payment process.

#### 4.7 Fare Breakdown

The fare breakdown must display the difference amount per passenger type.

The breakdown must preserve the Reissue pricing concept and must not incorrectly display the complete
flight amount as the payable Reissue amount.

#### 4.8 Price-Change Popup

If the price difference changes from the supplier side:

- The system must display the agreed Price Changed popup.
- This applies when the selected offer supports Reprice.

The user must be informed that the selected offer price has changed before continuing.

#### 4.9 Terms & Conditions

> **Added 2026-10-04, not part of the 2026-09-27 supply.** Source: the End-to-End Workflow documents
> (`specifications/Reissue_Feature_EndToEnd_Workflow.md`), both diagram forms of which show
> `… → Accept T&C → Confirm & Charge`; the user confirmed on 2026-10-04 that the control exists on
> screen. Everything above this subsection is the requirement as supplied; this subsection is not.

Terms & Conditions must be presented on the Review & Pay screen before the payment action.

- The user must **accept** the Terms & Conditions before `Confirm & Charge` can proceed.
- The control must **not** be pre-accepted; acceptance is a deliberate user action.
- Acceptance applies to the offer and amount on screen when it was given, and must not carry over to a
  different offer or a changed price.
- The Terms & Conditions content must be reachable and readable from the control.

Terms & Conditions are also displayed on the Booking Confirmation, as information on a completed
transaction rather than as an acceptance control.

#### 4.10 Acceptance Criteria

- **AC-1:** Review Page displays all new flight data.
- **AC-2:** Review Page displays the old price.
- **AC-3:** Review Page displays the payable fare price difference in the right-top area.
- **AC-4:** Current wallet balance is displayed.
- **AC-5:** System checks whether the available wallet amount can cover the payment.
- **AC-6:** User can select Wallet as a payment method.
- **AC-7:** User can select Banque Masr as a payment method.
- **AC-8:** Fare breakdown is displayed per passenger type.
- **AC-9:** If supplier-side price difference changes and the offer supports Reprice, the Price Changed popup is displayed.
- **AC-10:** *(added 2026-10-04 — see §4.9)* Terms & Conditions are displayed on Review & Pay and **must be accepted before `Confirm & Charge` can proceed**.

#### 4.11 Field / Control Validations

**Old Price** — Must represent the price of the flight being reissued.

**Fare Difference** — Must represent the payable Reissue difference. Must remain consistent with the
selected Re-shop result/reprice response.

**Wallet Balance** — Current balance must be displayed. System must validate whether the available
amount covers the applicable payment.

**Payment Method** — User must select one of the supported payment methods. Supported methods: Wallet,
Banque Masr.

**Fare Breakdown** — Must be displayed per passenger type. Must reflect the applicable difference
amounts.

**Price Change** — Supplier-side price changes must trigger the Price Changed popup when Reprice is
supported.

**Terms & Conditions** *(added 2026-10-04)* — Must be displayed before the payment action and must
not be pre-accepted. `Confirm & Charge` must be refused or unavailable until acceptance is given.
Acceptance must not persist across a different offer or a changed amount.
---

### 5. Exchange

#### 5.1 Business Flow

The Exchange process follows the same general cycle as the Booking Pay & Book cycle:

```
Init Persist → Call Supplier → Update with Supplier Status
```

The system must persist the Reissue transaction before calling the supplier, then update the
transaction based on the supplier response/status.

#### 5.2 Exchange Request / Processing

The Exchange process must use the selected Reissue offer and the information collected throughout the
Reissue flow.

The exchange operation must:

1. Initialize and persist the Reissue transaction.
2. Call the supplier.
3. Receive the supplier response/status.
4. Update the Reissue transaction according to the supplier status.

#### 5.3 New Booking Reference

The reissued offer must have:

- New Booking Reference
- New Order ID

These identify the newly created Reissue offer.

#### 5.4 Reissue Offer Status

The reissued offer can have the following statuses:

- Not Booked
- Booking Fail
- Booked

The system must persist and display the applicable status based on the exchange result.

#### 5.5 Database Behavior

**Reissue Offer Price** — The Reissue offer in DB must store **prices with differences**, and not
total actual flight prices. This is important to preserve the Reissue pricing model.

**Reissue History** — The Reissue History table must maintain the relationship between the Reissue
offer and the original booking.

**Sync Action** — The Reissue offer must not support Sync action during this phase.

**Original Offer Status** — After the applicable successful Reissue flow, the original offer status
must become **Reissued**.

**IS_AUTO_REISSUE** — A new DB column must be added: `IS_AUTO_REISSUE` in `TT_FLIGHT_BOOK`. The column
identifies whether the offer is a Reissue offer.

**Change Fee** — The Reissue change fee must be stored in DB as **Service Charge**.

#### 5.6 Acceptance Criteria

- **AC-1:** Exchange follows Init/Persist → Supplier Call → Supplier Status Update.
- **AC-2:** Successful Reissue creates a new Booking Reference.
- **AC-3:** Successful Reissue creates a new Order ID.
- **AC-4:** Reissue offer supports Not Booked, Booking Fail, and Booked statuses.
- **AC-5:** Reissue prices are stored as differences rather than total actual flight prices.
- **AC-6:** Reissue History maintains the relation with the original booking.
- **AC-7:** Reissue offer cannot perform Sync action in this phase.
- **AC-8:** Original offer status becomes Reissued after the applicable successful process.
- **AC-9:** `TT_FLIGHT_BOOK` contains `IS_AUTO_REISSUE` to identify Reissue offers.
- **AC-10:** Reissue change fee is stored as Service Charge.

#### 5.7 Validation Rules

- Supplier status must be persisted against the Reissue transaction.
- New Booking Reference and Order ID must be associated with the Reissue offer.
- Reissue pricing stored in DB must follow the difference-based pricing model.
- Original booking/Reissue relationship must be persisted.
- Sync must not be available for Reissue offers.

---

### 6. Booking Confirmation & E-ticket

#### 6.1 Business Flow

After the Exchange process, the Booking Confirmation & E-ticket page must display the Reissue offer.

The page must use the current Booking Confirmation concept but with the agreed Reissue-specific UI.

The workflow specifies:

> Display reissue offer data like current booking confirmation but with different UI.

#### 6.2 Displayed Fields / Data

The confirmation must display the Reissue offer data according to the current Booking Confirmation
information, presented through the Reissue-specific UI.

The displayed information must represent the newly reissued offer.

#### 6.3 UI Behavior

- Reissue offer data must be displayed.
- UI must follow the agreed Reissue-specific design.
- The confirmation must represent the result of the Exchange operation.

#### 6.4 Acceptance Criteria

- **AC-1:** Reissue offer data is displayed after the Exchange process.
- **AC-2:** Booking Confirmation follows the existing confirmation information with the Reissue-specific UI.
- **AC-3:** The confirmation represents the new Reissue offer.

#### 6.5 Validation Rules

- Confirmation data must belong to the new Reissue offer.
- The displayed booking/ticket information must correspond to the Exchange response.

---

### 7. Itinerary

#### 7.1 Business Flow

The Itinerary page is an affected area of the Reissue feature.

A new component must be added to display: **All Auto Reissue History for the Current Flight**

#### 7.2 Auto Reissue History Component

The new component must display the Auto Reissue history associated with the current flight.

The component must allow the user to understand the Reissue history associated with the current
flight.

#### 7.3 Actions / Statuses

The Itinerary must reflect the Reissue status and relationship with the original/reissued offer
according to the Reissue lifecycle.

The original offer becomes Reissued after the applicable successful Reissue process.

#### 7.4 Acceptance Criteria

- **AC-1:** A new Auto Reissue History component is available in Itinerary.
- **AC-2:** The component displays the Auto Reissue history for the current flight.
- **AC-3:** The history reflects the relationship between the original and reissued offer.
- **AC-4:** Original offer status is displayed as Reissued after successful Reissue.

#### 7.5 Validation Rules

- History must belong to the current flight.
- Only relevant Auto Reissue history must be displayed.

---

### 8. PNR Query

#### 8.1 Business Flow

The PNR Query is affected by the Reissue feature.

The ticketed Reissue must be displayed in the History section added to the PNR Query Action page.

#### 8.2 History Section

The PNR Query Action page must contain the Reissue history.

The history must display the ticketed Reissue relationship with the original booking.

#### 8.3 Original / Reissued Booking Relationship

The Reissue History must preserve the relationship between: **Original Booking → Reissued Booking**

The ticketed Reissue must appear in the History section.

#### 8.4 Actions / Statuses

The Reissue history must reflect the applicable Reissue booking status.

The workflow specifically states that there is no change in Reports and PNR Query behavior beyond the
specified history addition.

Therefore, existing PNR Query behavior must remain unchanged except for displaying the ticketed
Reissue in the newly added History section.

#### 8.5 Acceptance Criteria

- **AC-1:** PNR Query contains the Reissue History section.
- **AC-2:** Ticketed Reissue is displayed in the History section.
- **AC-3:** The history maintains the relationship with the original booking.
- **AC-4:** Existing PNR Query behavior remains unchanged except for the agreed Reissue History addition.

#### 8.6 Validation Rules

- Only ticketed Reissue records should be displayed in the specified history section.
- The displayed Reissue must be associated with its original booking.

---

### 9. Affected Areas

The Reissue feature impacts the following areas defined in the workflow:

**9.1 Itinerary Page** — Auto Reissue availability · Eligibility initiation · Auto Reissue History
component.

**9.2 PNR Query** — Reissue History section · Ticketed Reissue display.

**9.3 Wallet Report** — The Reissue payment/transaction must be considered in the Wallet Report impact.

**9.4 Finance Report** — The Reissue financial transaction and applicable Service Charge must be
considered in Finance Report.

**9.5 All Reports Related** — All reports related to the affected booking/payment/financial flows must
be reviewed for the Reissue impact.

The document explicitly identifies the affected areas as Itinerary, PNR Query, Wallet Report, Finance
Report, and all related reports.

---

### Overall Acceptance Criteria

- **AC-01:** Reissue configuration is controlled through Branch and Agency CRUD.
- **AC-02:** Auto Reissue is displayed in Itinerary based on the configured flag.
- **AC-03:** Exchange Fees are applied only when configured.
- **AC-04:** User can select the applicable flight from Itinerary.
- **AC-05:** System validates Auto Reissue applicability.
- **AC-06:** Journey selection follows eligibility.
- **AC-07:** Passenger selection follows eligibility.
- **AC-08:** All required passengers are selected by default with Not Split behavior.
- **AC-09:** Only online-booked offers can be reissued.
- **AC-10:** Selected journey can be edited through the flight widget.
- **AC-11:** Date, Origin, Destination, and Cabin Class can be handled through the Re-shop search criteria.
- **AC-12:** Old flight date cannot be selected.
- **AC-13:** Round Trip cannot be changed into Multi-City.
- **AC-14:** Search results display the fare difference payable by the user.
- **AC-15:** Negative prices are not returned.
- **AC-16:** Fare breakdown is displayed per passenger type.
- **AC-17:** Fare breakdown contains Base Fare, Taxes, Supplier Penalty, and configured WT Change Fees.
- **AC-18:** Review Page displays new flight data and old flight price.
- **AC-19:** Payable fare difference is displayed in the right-top area.
- **AC-20:** Current wallet balance is displayed and checked against the required amount.
- **AC-21:** Wallet and Banque Masr are available as payment methods.
- **AC-22:** Supplier-side price changes trigger the Price Changed popup when the selected offer supports Reprice.
- **AC-23:** Exchange follows Init/Persist → Call Supplier → Update Supplier Status.
- **AC-24:** Reissue creates a new Booking Reference and Order ID.
- **AC-25:** Reissue supports Not Booked, Booking Fail, and Booked statuses.
- **AC-26:** Reissue prices are stored as differences rather than actual total flight prices.
- **AC-27:** Reissue History maintains the relationship between the Reissue and original booking.
- **AC-28:** Reissue offers cannot perform Sync action in this phase.
- **AC-29:** Original offer status becomes Reissued.
- **AC-30:** `TT_FLIGHT_BOOK` contains `IS_AUTO_REISSUE`.
- **AC-31:** Reissue change fee is stored as Service Charge.
- **AC-32:** Booking Confirmation displays the Reissue offer using the Reissue-specific UI.
- **AC-33:** Itinerary displays Auto Reissue History for the current flight.
- **AC-34:** PNR Query displays the ticketed Reissue in the History section.
- **AC-35:** Wallet Report, Finance Report, and all related reports are included in the affected-area review.
- **AC-36:** Existing Reports and PNR Query behavior remains unchanged except for the explicitly defined Reissue additions.
- **AC-37:** *(added 2026-10-04, not part of the 2026-09-27 supply — see §4.9)* Terms & Conditions are displayed on Review & Pay and **must be accepted before `Confirm & Charge` can proceed**; they are displayed again on the Booking Confirmation as information.

---

## Edge Cases & Expected Handling

**Source:** supplied with the Acceptance Criteria by the user (Mohamed Soliman) on 2026-09-27,
transcribed verbatim.

### 1. Prerequisites — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Branch Reissue configuration is disabled | The system must not allow Reissue initiation for users/agents belonging to the disabled Branch. Auto Reissue must not be displayed in the Itinerary. |
| 2 | Agency Reissue configuration is disabled | The system must not allow Reissue initiation for the Agency. Auto Reissue must not be displayed/available for the affected booking. |
| 3 | Branch is enabled but Agency is disabled | The system must treat the Reissue feature as unavailable for that Agency and prevent initiation. |
| 4 | Branch and Agency are enabled | The system should make Auto Reissue available, subject to the remaining eligibility checks. |
| 5 | Exchange Fees are configured | The configured WT Change Fees must be retrieved and included in the Reissue calculation/breakdown. |
| 6 | Exchange Fees are not configured | The system must continue the Reissue flow without WT Change Fees and must not block the user because the fee configuration is missing. |
| 7 | Exchange Fees configuration is invalid/incomplete | The system should not apply an incorrect fee. The Reissue calculation must be prevented or the missing/invalid configuration should be handled according to the Rule Engine validation mechanism. |
| 8 | Configuration changes while a user is already in the Reissue flow | The system should validate the applicable configuration again before the final Reissue/Exchange operation to prevent processing a transaction that is no longer permitted. |

### 2. Eligibility — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Selected flight is not eligible for Auto Reissue | The system must stop the Reissue flow and clearly inform the user that the selected flight cannot be reissued. No Reissue transaction should be created. |
| 2 | Selected booking was created offline | The system must prevent Reissue because only online-booked offers are eligible. The user must remain on the current booking/Itinerary context. |
| 3 | Booking contains multiple journeys | The system must evaluate journey eligibility independently and allow only the journey selection permitted by the eligibility response. |
| 4 | Eligibility requires all journeys | The system must automatically select/require all applicable journeys and prevent the user from removing a required journey. |
| 5 | Eligibility allows multiple journeys | The user should be able to select the applicable eligible journeys according to the eligibility response. |
| 6 | Booking contains multiple passengers | The system must evaluate passenger eligibility according to the eligibility response. |
| 7 | All required passengers must be selected | All required passengers must be selected by default. The default selection applies to passengers only and must not automatically select all journeys. |
| 8 | Passenger selection is Not Split | The system must maintain the Not Split state and prevent a passenger combination that violates the eligibility result. |
| 9 | User attempts to remove a required passenger | The system must prevent removal of the required passenger or display a validation message explaining that the passenger is required for the Reissue operation. |
| 10 | Some passengers are eligible and others are not | Only eligible passengers should be available for selection. Ineligible passengers must not be included in the Reissue operation. |
| 11 | Required passenger eligibility cannot be determined | The system must not continue to Search/Re-shop until eligibility is successfully determined. |
| 12 | Eligibility service fails or times out | The system must stop the flow, display an appropriate error, and allow the user to retry without creating a partial Reissue transaction. |
| 13 | Eligibility response becomes outdated before Search | The system should revalidate the relevant eligibility information before continuing to prevent processing based on stale eligibility data. |
| 14 | No eligible journey/passenger exists | The system must prevent continuation and inform the user that there is no eligible selection available for Reissue. |

### 3. Search / Re-shop — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | User attempts to select the old flight date | The old date must be disabled/unavailable in the date selector. The system must prevent the search using the old date. |
| 2 | User selects a valid new date | The system should allow the search and return available flights for the selected date. |
| 3 | User attempts to change Round Trip to Multi-City | The system must prevent this conversion and keep the trip type as Round Trip. |
| 4 | No flights are available for the selected criteria | The system should display a clear No Flights Available message and allow the user to modify the search criteria. |
| 5 | Search service fails | The system must display an appropriate error and allow the user to retry the search without losing the selected Reissue context. |
| 6 | Search request times out | The system should stop the current search attempt, notify the user, and provide a retry option. |
| 7 | Supplier returns a negative fare difference | The system must not display or allow selection of the negative-price result. |
| 8 | Supplier returns zero fare difference | The system should display the result as a zero fare difference if supported by the business rules, without converting it into a negative or incorrect amount. |
| 9 | Supplier returns an incomplete price breakdown | The result should not be selectable until the required pricing information is available and validated. |
| 10 | Multiple passenger types exist | The system must calculate and display the difference separately for each passenger type. |
| 11 | Supplier penalty exists | The Supplier Penalty must be included in the applicable Reissue breakdown. |
| 12 | Exchange Fees are configured | WT Change Fees must be included in the difference calculation/breakdown. |
| 13 | Exchange Fees are not configured | WT Change Fees must be excluded from the calculation and the search should continue normally. |
| 14 | Fare changes between search and result selection | The system must revalidate/reprice the selected offer before payment when the offer supports Reprice. |
| 15 | Selected offer becomes unavailable | The system must prevent continuation with the unavailable offer and require the user to select another available result. |
| 16 | User changes search criteria after receiving results | Previous results should no longer be treated as the active selection. The system should require a new search before proceeding. |
| 17 | User changes Origin/Destination to an invalid combination | The system must validate the search criteria and prevent submission until valid criteria are provided. |
| 18 | User changes Cabin Class to a value unavailable for the selected journey | The system should prevent the invalid selection or return only valid supplier results. |

### 4. Review & Pay — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Wallet balance is sufficient | The system should allow Wallet payment and allow the user to continue to Exchange. |
| 2 | Wallet balance is insufficient | The system must prevent payment through Wallet and clearly display that the available balance is insufficient. The user may select another supported payment method if available. |
| 3 | User selects Wallet | The system must validate the wallet balance again immediately before payment to avoid processing against an outdated balance. |
| 4 | User selects Banque Masr | The system must initiate the supported Banque Masr payment flow and continue only after successful payment confirmation. |
| 5 | No payment method is selected | The system must prevent continuation and require the user to select a supported payment method. |
| 6 | Fare difference changes after opening Review & Pay | The system must refresh/revalidate the pricing before payment. The user must not be charged using stale pricing. |
| 7 | Supplier changes the price and Reprice is supported | The system must display the Price Changed popup and require the user to acknowledge the updated amount before continuing. |
| 8 | Supplier changes the price and Reprice is not supported | The system must handle the offer according to the supplier capability and must not silently use an outdated price. |
| 9 | User rejects the new price | The system must stop the payment/exchange operation and return the user to the appropriate previous step without charging the user. |
| 10 | Wallet balance changes while the user is on Review & Pay | The system must perform a final balance validation before deduction. If insufficient, payment must be blocked. |
| 11 | Payment fails | The system must not mark the Reissue as successfully exchanged. The transaction status must reflect the payment failure according to the payment flow. |
| 12 | Payment succeeds but Exchange fails | The system must preserve the transaction for reconciliation and must not mark the Reissue as successfully completed until the Exchange result is confirmed. |
| 13 | Fare breakdown does not match the selected result | The system must prevent payment and require the pricing data to be recalculated/retrieved. |
| 14 | Difference amount is negative | The system must not allow payment using a negative Reissue amount. |
| 15 | Difference amount becomes zero | The system should handle the zero-difference scenario according to the supported payment/exchange flow and must not request an incorrect positive payment amount. |

### 5. Exchange — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Exchange initialization succeeds | The system must persist the Reissue transaction before calling the supplier. |
| 2 | Exchange initialization fails | The system must not call the supplier and must return an appropriate error to the user. |
| 3 | Supplier returns Booked | The system must update the Reissue offer to Booked, create the new Booking Reference/Order ID, maintain Reissue History, and update the original offer to Reissued. |
| 4 | Supplier returns Not Booked | The Reissue offer must remain Not Booked. The original booking must not be incorrectly marked as successfully Reissued. |
| 5 | Supplier returns Booking Fail | The Reissue offer must be marked Booking Fail and the original booking must remain available according to its existing status. |
| 6 | Supplier call fails | The system must persist the failure/error information and must not mark the Reissue as Booked without confirmed supplier success. |
| 7 | Supplier response times out | The system must not assume failure or success without the applicable status/reconciliation mechanism. The transaction should remain traceable for investigation. |
| 8 | Supplier response is received after transaction persistence | The system must update the existing persisted Reissue transaction rather than creating a duplicate transaction. |
| 9 | Duplicate Exchange request is submitted | The system must prevent duplicate processing for the same Reissue transaction/offer. |
| 10 | Change Fee exists | The fee must be stored as Service Charge. |
| 11 | Change Fee does not exist | No incorrect Service Charge should be created. |
| 12 | Sync action is requested for a Reissue offer | The Sync action must not be available for Reissue offers. |
| 13 | Exchange is retried after a Booking Fail | The system must prevent duplicate booking attempts unless the business flow explicitly permits a retry and the previous transaction is safely handled. |

### 6. Booking Confirmation & E-ticket — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Reissue is successfully Booked | The system must display the new Reissue booking information and applicable E-ticket information. |
| 2 | Reissue is Not Booked | The system must not display the transaction as a successful ticketed Reissue. |
| 3 | Reissue is Booking Fail | The system must display the appropriate failed status and must not represent the flight as successfully reissued. |
| 4 | Booking Reference is available but E-ticket is not yet available | The system should display the booking status and avoid presenting incomplete ticket information as final. |
| 5 | E-ticket retrieval fails | The system should preserve the successful booking status and allow the ticket information to be retrieved/retried according to the existing booking behavior. |
| 6 | Confirmation data does not match the new Booking Reference | The system must not display mismatched booking information. The data must be refreshed/retrieved from the correct Reissue offer. |
| 7 | User refreshes the confirmation page | The system must retrieve the existing Reissue transaction rather than creating a new Reissue. |
| 8 | User opens the old booking from confirmation/history | The old booking must retain its Reissued relationship/status and must not be treated as a new active Reissue transaction. |

### 7. Itinerary — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Current flight has no Reissue history | The Auto Reissue History component should display an appropriate empty state rather than an error. |
| 2 | Current flight has one Reissue | The corresponding Reissue record must be displayed in the history. |
| 3 | Current flight has multiple Reissue records | The system must display all applicable Auto Reissue history records in the agreed history component. |
| 4 | Reissue is successfully completed | The original flight/offer must show the Reissued status and the new Reissue booking must be traceable. |
| 5 | Reissue failed | The original booking must not be incorrectly marked Reissued if the Reissue did not successfully complete. |
| 6 | Reissue is Not Booked | The system should retain the Reissue transaction/history according to its status but must not present it as a completed Reissue. |
| 7 | User attempts to initiate another Reissue from the original Reissued offer | The system should prevent inappropriate duplicate Reissue initiation from the old/reissued source according to the Reissue lifecycle. |
| 8 | Reissue History cannot be loaded | The main Itinerary should remain usable where possible, while the history component should show an appropriate loading/error state and provide retry behavior. |
| 9 | Original and Reissued bookings are displayed together | The system must clearly preserve the relationship so the user can distinguish the original booking from the new Reissue booking. |

### 8. PNR Query — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Booking has no Reissue History | The History section should display an appropriate empty state. |
| 2 | Booking has a ticketed Reissue | The ticketed Reissue must be displayed in the History section. |
| 3 | Booking has multiple Reissues | All applicable Reissue history records should be displayed according to the history relationship. |
| 4 | Reissue is not ticketed | It must not be incorrectly displayed as a ticketed Reissue. |
| 5 | Original booking is queried | The system must show the original booking with its Reissued status/relationship and must not treat it as the current new booking. |
| 6 | New Reissue booking is queried | The system must display the new booking information and its relationship to the original booking. |
| 7 | Reissue History relationship is missing | The system must not silently display unrelated bookings as Reissue history. The relationship must be validated/persisted correctly. |
| 8 | PNR Query is opened immediately after Exchange | The system should retrieve the latest Reissue status/history so that stale booking information is not displayed. |
| 9 | Existing PNR Query action is used on a Reissue booking | Existing PNR Query behavior must remain unchanged unless explicitly affected by the Reissue requirements. |

### 9. Reports — Edge Cases

| # | Edge Case | Expected Behavior / Handling |
|---|---|---|
| 1 | Reissue transaction is paid from Wallet | The corresponding Wallet transaction must be represented correctly in Wallet Report. |
| 2 | Reissue transaction uses Banque Masr | The payment must be reflected according to the existing payment/reporting behavior. |
| 3 | Reissue Change Fee is applied | The Change Fee must be represented as Service Charge in the applicable financial/reporting data. |
| 4 | Reissue is Booking Fail | The reports must not represent the failed Reissue as a completed successful booking. |
| 5 | Reissue is Not Booked | The transaction must retain its actual status and must not be reported as a successful ticketed Reissue. |
| 6 | Original booking is marked Reissued | Reports that use booking status must reflect the updated original booking status according to the Reissue lifecycle. |
| 7 | Reissue price is difference-based | Reports/data consumers must not interpret the stored Reissue difference as the total flight selling price. |
| 8 | Reissue History is queried in reports | The original/reissued relationship must remain traceable using the available booking/order identifiers. |
| 9 | Reissue transaction is missing from a report | The system must provide traceability through the underlying booking/payment/financial records and prevent silent loss of the transaction. |

---

## Clarifications supplied later

| # | Source | Clarification |
|---|---|---|
| CL-1 | User, 2026-09-24 (during run-006 Stage 2) | Clicking **Reissue** on a booking whose credential is **not** among the organization's selected *Auto Reissue Credentials* refuses **the reissue** (making the booking itself is never affected) with **"No credential for this booking is assigned to your organisation"**. The Branch/Agency checkbox only controls whether the `Reissue` button is shown. |
| CL-2 | User, 2026-09-24 | A supplier supports reissue only if it is a GDS **and** on the application's hard-coded list: `NDCsbr`, `Sabre`, `TravelportNdc`, `Galileo`. Amadeus and every LCC do not. |
| CL-3 | User, 2026-09-24 | The eligibility status is **`Booked`**. The "Ticketed Document" bar label is not the condition. Reissue actions appear only while the booking is **locked** by the current user — a precondition. |

## Open Questions

None recorded at transcription. Stage 1 records any it finds in the shared-scope Project Context.
