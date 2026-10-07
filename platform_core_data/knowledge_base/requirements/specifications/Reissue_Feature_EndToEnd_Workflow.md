# Reissue Feature — End-to-End Workflow

| Field | Value |
|---|---|
| Supplied by | Mohamed Soliman, 2026-10-04 |
| Source files | `Reissue_Feature_EndToEnd_Workflow.docx` · `Reissue_Feature_EndToEnd_Workflow_Diagram.docx` · `Reissue_Feature_EndToEnd_Workflow_Diagram.pdf` — all three kept beside this file |
| Describes | The same feature as `user_stories/Reissue_Flow_From_Itinerary.md` |
| Standing | **Reference, not authority.** See §0 |
| Scope it informs | `supplier-features/reissue/shared/reissue-flow` (business feature) and `reissue-mapping` |

## 0. What this document is, and what it is not

**It is a workflow description of a feature that already has a User Story, a Project Context and a
139-case test suite.** It was supplied after all three existed. It carries **no Acceptance Criteria,
no edge cases and no "As a … I want …"** — so it is not a User Story, it did not trigger New User
Story intake, and no module, Feature, run or Project Context was created from it.

**The User Story remains the authority on expected behaviour.** Where this document and the story
disagree, the story wins and the disagreement is raised as a discrepancy, not silently resolved. This
file exists so the flow is readable in one place and so the three items in §6 — which the story does
**not** contain — are not lost.

**The three source files are one document in three forms.** The `.docx` is prose; the diagram `.docx`
is the same flow drawn in ASCII; the `.pdf` is that flowchart rendered as a single tall image (it
carries no extractable text — it was read as an image). **They agree with each other.** §6 lists what
only the two diagram forms carry.

## 1. Overall end-to-end flow

```
Prerequisites
  → Reissue enabled for Branch / Agency
  → Auto Reissue available from Itinerary
  → 1. Eligibility
  → 2. Search / Re-shop
  → 3. Review & Pay
  → 4. Exchange
  → 5. Booking Confirmation & E-ticket
  → 6. Itinerary — Auto Reissue History
  → 7. PNR Query — Reissue History
  → Affected areas: Itinerary · PNR Query · Wallet Report · Finance Report · related reports
```

## 2. Detailed workflow

### Prerequisites

- Validate the Reissue checkbox/flag on **Branch and Agency CRUD**.
- Based on the flag, Auto Reissue is displayed/opened in the Itinerary.
- **Exchange Fees Rule Engine CRUD** controls the WT change/exchange fee.
- If an exchange-fee rule is configured, it is applied in the reissue breakdown.
- **If no rule is configured, the exchange fee is ignored.**

### 1. Eligibility

- Start by selecting the flight to be reissued from the Itinerary, on **Admin or Portal**.
- Check whether Auto Reissue is applicable to the selected flight.
- Validate whether the user can select **multiple journeys**.
- **Journey selection is a separate validation; all journeys are *not* selected by default.**
- Validate passenger eligibility. **All required passengers are selected by default — this default
  applies to passengers only.**
- **Only online-booked offers are eligible.**
- If the booking/flight is not eligible, the user cannot proceed.

### 2. Search / Re-shop

- Open the flight widget with the journey selected during Eligibility, criteria prefilled.
- Editable criteria: **Date, Origin, Destination, Cabin Class**.
- A **Round Trip cannot be changed to Multi-City**.
- **An old/past date cannot be selected.**
- Search returns replacement flights.
- **Display the fare price difference the user will pay** — the diagram names this field **"Due Now"**.
- **No result with a negative price difference is returned.**
- Fare breakdown is **per passenger type** and includes **Base Fare, Taxes, Supplier Penalty and WT
  Change Fees** from Exchange Fees CRUD.
- Other flight details display as normal flight-search details, with reissue-specific pricing.

### 3. Review & Pay

- Display all new flight data, and the **old/current price** of the flight being reissued.
- Display the **fare price difference to be paid in the top-right area** (**"Due Now"**).
- Display the **current wallet balance** and validate it covers the amount.
  - **The diagram adds an `Insufficient → Top up wallet → re-check balance` loop.**
- Payment method: **Wallet or Banque Misr** *(the story's ACs spell this "Banque Masr" — see §6)*.
- Fare breakdown by passenger type, on the **difference** amount.
- If the offer supports **Reprice** and the supplier price changes, show the **Price Changed popup**;
  the user reviews the updated amount and continues.
- **Accept Terms & Conditions, then Confirm & Charge.** *(Diagram only — see §6.)*

### 4. Exchange

- Same pattern as the booking **Pay & Book** cycle: **Initialize / Persist → Call Supplier → Update**
  the persisted reissue with the supplier status.
- Create a **new Booking Reference** and a **new Order ID** for the reissued offer.
- Reissued-offer status: **Not Booked · Booking Failed · Booked**.
- **Store reissue-offer prices as difference amounts, not the total flight price.**
- Maintain the **relationship between the reissue and the original booking** in reissue history.
- **The reissue offer cannot perform the Sync action in this phase.**
- **Update the original offer status to `Reissued`.**
- Use **`TT_FLIGHT_BOOK.IS_AUTO_REISSUE`** to flag an Auto Reissue offer.
- **Store the change fee as a Service Charge.**
- No change to existing Reports and PNR Query behaviour beyond the reissue-history handling.

### 5. Booking Confirmation & E-ticket

- Display the reissue booking confirmation using the **reissue-specific UI**.
- New booking/order information, new booking reference, PNR / segment / passenger details, fare details.
- **Terms & Conditions are displayed here too.** *(Diagram only.)*
- **E-ticket / Print / Search and booking actions.** *(Diagram only.)*

### 6. Itinerary

- Refresh the Itinerary for the current flight.
- Display a new **Auto Reissue History** component.
- Maintain the original ↔ reissued relationship; the original stays identifiable with `Reissued` status.

### 7. PNR Query

- Open the PNR Query action/history area.
- Display the **ticketed reissue** in the History section, with the original/reissue relationship.

### 8. Affected areas

Itinerary page · PNR Query · Wallet Report · Finance Report · all reports related to the
reissue/booking flow.

## 3. Core reissue pricing flow

```
Existing ticket / booking price
  → Re-shop replacement flight
  → Calculate fare difference
  → Add applicable supplier penalty
  → Add applicable WT change/exchange fee (Exchange Fees CRUD)
  → Display payable difference only  ("Due Now" = Supplier + WT + Difference)
  → Review & Pay
  → Supplier Reprice when supported
  → If price changes → Price Changed popup
  → Confirm & Charge
```

## 4. Exchange data / status flow

```
Init / Persist Reissue → Call Supplier → Supplier Response
  ├ BOOKED        → New Booking Reference + New Order ID
  ├ NOT BOOKED    → Store supplier status
  └ BOOKING FAILED→ Store supplier status
  → (successful) Original Offer Status = REISSUED
  → Store Original ↔ Reissue relationship
  → Store Change Fee as Service Charge
  → IS_AUTO_REISSUE = true
```

## 5. Screen-level summary

| Screen | Main purpose | Key data / controls | Main validation |
|---|---|---|---|
| Eligibility | Determine whether the flight can be reissued | Journeys, passengers, eligibility, online-booked offer | Applicable flight; journey eligibility; passenger eligibility; all required passengers by default |
| Search / Re-shop | Find a replacement flight | Date, origin, destination, cabin, results, difference | No old date; RT cannot become MC; no negative difference |
| Review & Pay | Validate the replacement and collect payment | New/old flight, difference, fare breakdown, wallet, payment method, **T&C** | Wallet coverage; difference validation; supplier reprice handling |
| Exchange | Execute the reissue | Persisted reissue, supplier response, booking/order IDs, status | Supplier status handling; original/reissue relationship; no Sync |
| Confirmation / E-ticket | Present the completed reissue | New booking, order, PNR/ticket/segment/passenger data | Reissue-specific confirmation UI |
| Itinerary | Show reissue history | Auto Reissue History component | Original/reissue relationship |
| PNR Query | Show the ticketed reissue | Reissue history | Ticketed reissue visible in History |

## 6. What this document carries that the User Story does not

**Three items, all verified absent from `Reissue_Flow_From_Itinerary.md`.** They are recorded here and
raised as `DS-7` on the `reissue-flow` Project Context. **None has been turned into a test case** — a
workflow document is not authority over the story, and each needs confirmation that the control
actually exists before a case asserts it.

| # | Item | Where it appears | Status in the test suite |
|---|---|---|---|
| 1 | **Terms & Conditions must be accepted before Confirm & Charge** on Review & Pay, and T&C are displayed again on the Confirmation screen | Both diagram forms, explicitly: `… → Accept T&C → Confirm & Charge`. Also listed among Review & Pay's controls in the prose document's screen table | **No coverage.** "T&C" does not appear in the story or in any of the 139 cases |
| 2 | **"Due Now"** is the name of the payable-difference field, on both the results screen and Review & Pay | Diagram forms (`Display Due Now`, `Sum Total Fees → Supplier+WT+Diff`) | **Partial.** TC-RFLOW-053 asserts the difference appears in the top-right area but never asserts the label |
| 3 | **An insufficient wallet offers a top-up and returns to the flow** — `Insufficient → Top up wallet → re-check balance` | Diagram forms only | **Partial.** TC-RFLOW-056 asserts that an insufficient balance blocks Wallet payment and says so; nothing covers a top-up returning the user to a payable state |

**One wording difference, already tracked.** This document says **"Banque Misr"**; the story's
Acceptance Criteria say **"Banque Masr"**, and the story itself uses both spellings. That is `DS-4` on
the `reissue-flow` Project Context, resolved by writing expected results against the application's own
on-screen label. This document is a third data point and does not settle it.

## 7. Where it agrees — checked, not assumed

The prerequisites, eligibility rules, the re-shop constraints (no past date, RT cannot become MC, no
negative difference), the fare-breakdown components, the whole exchange cycle, `IS_AUTO_REISSUE`, the
change fee as a Service Charge, the Itinerary history component, PNR Query, and the affected report
areas all match the User Story and the existing suite.

Two items that looked new on a first read are **already covered**:

- *"Journey selection is a separate validation; all journeys are not selected by default"* — the
  story's Eligibility edge case 7 says the same, and `TC-RFLOW-025` asserts it.
- *"If no rule is configured, the exchange fee is ignored"* — `TC-RFLOW-006`.
