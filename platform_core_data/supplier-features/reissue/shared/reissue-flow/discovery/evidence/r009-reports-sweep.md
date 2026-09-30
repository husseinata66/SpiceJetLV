# Reports — observed structure and Reissue impact (run-009, Stage 2, 2026-09-30)

Admin, headed, logged in as Mohamed Soliman. Story §9 — AC-35, AC-36, AC-31. D-8 put **all** reports
in Regression scope; this is the first time any of them was opened.

## 1. All fourteen — filters as implemented

`*` marks a required filter.

| # | Report | Route | Filters |
|---|---|---|---|
| 1 | Total Due | `/reports/total-ndc` | Branch Name\* · Agency Name · Invoice From/To Date\* · Invoice Number · Customer Name · **Booking Reference** |
| 2 | Agency Wallet | `/reports/agency-wallet` | Branch Name\* · Agency Name · Currency\* · Show Outstanding Only |
| 3 | Sales | `/reports/sales` | Branch Name\* · Agency Name · Invoice From/To Date\* · Invoice Number · Customer Name · Payment Date · Transaction ID |
| 4 | Sync. PNR | `/reports/sync` | Sync PNR From/To Date\* · Order ID · FB booking ref no. |
| 5 | Booking | `/reports/booking` | Branch name\* · Agency Name · Email · From/To Booking Date\* · Client Name · Phone Number |
| 6 | Quotation | `/reports/quotation` | Branch Name\* · Agency Name · Name · Email ID · Quotes No. · Quote Status · Date (Creation/Travel) · Duration (Today/Current week/Date range) |
| 7 | Finance | `/reports/financial` | Branch Name\* · Agency Name · Email · From/To Date\* · Client Name · Mobile Number · **radio: Booking Date \| Refund Date** |
| 8 | Statement | `/reports/statement` | Branch Name\* · Agency Name · Invoice From/To Date\* |
| 9 | Released PNR | `/reports/release` | Released PNR From/To Date\* · Order ID · FB Booking Ref. No. |
| 10 | AR Ledger | `/reports/ar-ledger` | Branch Name\* · Agency Name · Invoice From/To Date\* |
| 11 | Wallet History | `/reports/wallet-history` | Branch Name\* · Agency Name · Invoice From/To Date\* |
| 12 | Daily Sales | `/reports/daily-sales` | Branch Name\* · Agency Name · Invoice From/To Date\* |
| 13 | Import PNR | `/reports/pnr` | Branch Name\* · Agency Name · Invoice From/To Date\* |
| 14 | Transfer PNR | `/reports/transfer-pnr` | Branch Name\* · Agency Name\* · Report From/To Date\* |

All fourteen loaded without error. **AC-36's "existing behaviour unchanged" now has a captured
baseline** — this table is it.

## 2. RPT-1 — No report can identify a reissue

**Not one of the fourteen has a Reissue filter, a Reissue flag, a Reissue column, or any way to
distinguish a reissued booking from an ordinary one.** A reissue enters every financial report as a
plain new booking at its full new value.

Consequences that follow directly:

- **AC-35 ("Wallet, Finance and all related reports reviewed for Reissue impact") has no positive
  expected result to assert today.** The reissue *appears*, but as an indistinguishable sale.
- Finance Report's date selector offers **Booking Date** or **Refund Date** and nothing else. A
  reissue is neither. There is no way to report on exchanges as a class.
- Only **Total Due** can be filtered by Booking Reference. On the other thirteen, tying a row to a
  specific reissued booking means going via the invoice number.

This is a design-level gap rather than a code defect, and it is raised as an **open question for the
product owner**, not as a defect, because no AC states a reissue must be separately identifiable —
AC-35 only requires the reports be *reviewed* for impact. **This is the review.**

## 3. RPT-2 — Sales Report counts a reissue as a second full sale

Sales Report, Branch `NDC2_Mohamed SolimanEmirates (BRN503)`, invoice dates 29–30/09/2026.

**Columns:** Sr. No. · Branch Name · Agency Name · Customer Name · Payment Date · TXN Id ·
Invoice Number · Supplier · Agent Name · Payable To Ndc · Total Markup · Sales Amount

Six rows returned. Two of them are the scenario-9 pair:

| Row | Invoice | What it is | Sales Amount |
|---|---|---|---|
| 1 | `INVNDC260929eybvlK` | **the reissue** | 410,755.19 |
| 2 | `INVNDC260929SL117l` | **the original** | 348,235.19 |

They are adjacent, identical in every column but amount and invoice number, and **nothing marks row 1
as an exchange of row 2**. The report totals both: **758,990.38 of recorded sales for one journey
that was sold once and changed once.** The economic event was a 62,520 fare increase plus a 114
change fee.

Whether that is intended is a **business question, not a defect call** — some operators do count
gross ticketed value. It is raised as an open question because the story's AC-35 requires exactly
this review and nobody has made the ruling.

**`Agency Name` is empty on all six rows** although both bookings sit on an agency. Recorded as a
secondary observation.

## 4. RPT-3 — The same charge carries three different values across three screens

For the scenario-9 reissue, one charge, read in three places on the same day:

| Where | Value |
|---|---|
| Sales Report, `Sales Amount` | **410,755.19** |
| PNR Query, Reissue History `Amount` | **410,755.20** |
| PNR Query, Payment Info `Amount Received` | **410,756** |

The original booking shows the same spread: 348,235.19 · 348,235.20 · 348,236.

Three representations of one number: truncated down to `.19`, exact at `.20`, rounded up to a whole
unit. `FINDING-R18` already establishes that **the wallet is debited the rounded-up figure**, so the
one the agency actually pays is the largest of the three. This sweep adds that the reporting layer
carries a *fourth* behaviour — truncation — which no finding has covered.

**This is a cross-screen consistency defect on top of the known rounding defect**, and it is newly
observed here. It belongs to `reissue-flow` (screens disagreeing) with a mapping-scope component
(which field each screen binds).

## 5. What was not done, and why

- **Only Sales Report was executed against data.** The other thirteen were opened and their filters
  captured, but not run with the test bookings. Running all fourteen against two bookings is Stage 4
  execution work, not discovery; the structure is what Stage 3 needs to write the cases.
- **Sync. PNR Report and Released PNR Report were not queried for the reissue orders.** Both accept
  an Order ID. An empty result would be weak evidence for AC-28 in any case — absence in a report
  does not prove a control is disabled — so AC-28 stays on the Itinerary screen where the action
  itself lives.
