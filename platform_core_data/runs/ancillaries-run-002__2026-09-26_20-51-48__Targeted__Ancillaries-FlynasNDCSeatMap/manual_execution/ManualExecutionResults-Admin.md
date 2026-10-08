# Manual Execution Results — run-006 (Admin panel, comparative spot-check)

> **Scope decision (human, 2026-09-27):** rather than re-executing all 99 in-scope cases on the
> Admin panel end to end, this session ran a **comparative spot-check** — the core flow once,
> thoroughly, then a structural comparison against the Portal pass (`ManualExecutionResults.md`).
> `TC-SM-NEG-004` and `TC-SM-EXR-007` are Excluded on both passes and are not touched here.
> **This is not a case-by-case re-run** — no per-case Pass/Fail verdicts are recorded below, only
> parity findings. If a full case-by-case Admin pass is wanted later, continue from here.

## 1. Setup

- Environment: Admin, `http://192.168.1.70`, Booking-Mid Office → Flight Search.
- Branch / Agency / Agent: Uplift2_Mohanad Dawood (BRN298) / (AGN9809) / Mohanad Dawood — chosen to
  match the Portal pass's agency exactly.
- Flight: CAI→JED, XY-584, A320NEO, 15/10/2026, 1 Adult + 1 Child + 1 Infant, Economy, Value bundle
  — the same baseline the Portal pass used for its NAV/RND/GEN/PRC groups.
- Booking session: headed, no `Book` pressed.

## 2. Structural difference from the Portal (not a defect)

**The Admin's Booking-Mid Office requires selecting Branch, Agency and Agent before Flight Search is
usable.** The Portal skips straight to Flight Search, already scoped to one agency. This is a
difference in how the two apps present the same flow, not a functional defect — once selected, the
rest of the flow (search, bundle selection, passenger details, ancillaries) is the same wizard.

## 3. Confirmed parity with the Portal

- **Flight search**: same CAI→JED results for the date, same 4 bundles offered (Plus, Light Super
  Flex, Value, Value Flex), same Price Update dialog on accepting a fare (5,750 → 7,318 EGP here,
  same mechanism as the Portal's `TC-SM-CNF-001`-type behaviour).
- **Passenger model**: same 3-tab accordion (Adult / Child / Infant), same auto-advance, same
  Gender-from-Title auto-fill, same infant "Assigned to" adult picker.
- **Seat map**: 174 seats on the same aircraft/flight, decoded `data-seat-id` confirms:
  - 6 female-designated seats (13A–13F) — same as the Portal's rule-40/50 finding.
  - 12 exit-row seats blocked (rows 11–12) — same as the Portal's exit-row finding.
  - 36 chargeable seats — same figure as `TC-SM-PRC-002`'s affected-seat count.
  - Seat 5A: "Chargeable seat, Window seat, available for EGP 422.91" — the exact same seat and
    price as the Portal's `TC-SM-PAX-008`.
  - "Book 5A for Ahmed" assigns the seat and auto-advances to the next passenger — same mechanic as
    the Portal.
- **Meals panel** present in the Ancillaries step, same structure.
- **Fare breakdown**: Base fare / Tax & Fees per passenger type, Bundle Fare and Ancillaries & SSR
  lines, Total Amount — same layout and same arithmetic pattern as the Portal.

## 4. One discrepancy found, not chased further under this scope decision

**The seat-state bucket totals differ from the Portal's recorded baseline**, though every other seat
map figure (female/exit-row/chargeable counts, total seats) matches exactly:

| | Blocked | AvailablePaid | AvailableFree | Total |
|---|---|---|---|---|
| Portal (`TC-SM-RND-001/002`, `ManualExecutionResults.md` §3.1) | 18 | 60 | 96 | 174 |
| Admin (this session) | 23 | 56 | 95 | 174 |

Both add to 174, and the composition breakdown that matters most (female/exit-row/chargeable) is
identical, so this is not obviously the same defect surface as any of the 5 confirmed Portal bugs.
It could be a genuinely different overall-state (`parts[2]`) vs. per-passenger-state (`parts[3]`)
reading between the two sessions, a different passenger mix's effect on the shared bucket, or a real
Admin/Portal difference — **not established this session**. Flagged for a future targeted check
(decode both apps' full `data-seat-id` arrays side by side for the identical booking) rather than
guessed at here.

## 5. Not covered this session

Booking-lifecycle cases (Group Q), exit-row cross-check against production, negative/error/timing
cases, bundle-change/BND-002 mechanics, and the rest of the 99-case suite were not re-executed on the
Admin panel. If a full Admin pass is wanted, it should follow the same group order as
`ManualExecutionResults.md`, reusing this session's Branch/Agency/Agent selection and its confirmed
CAI→JED/XY-584/15-10-2026/Value baseline.

## 6. Known Admin-only quirks found this session

- Typed dates in `Date of Birth` / `Document Expiry` must be followed by **Tab**, not any other key —
  pressing Escape leaves the field showing the typed value but not registered, and the form reports
  it "Required" when Next is pressed. Worth flagging to anyone automating this screen.
- A "Hold is not available for this flight. Please refer to/review Airline configuration" notice
  appears on the passenger-details screen that did not appear on the Portal for the same flight/date.
  Not chased further — could be Admin-specific messaging, not necessarily a defect.
