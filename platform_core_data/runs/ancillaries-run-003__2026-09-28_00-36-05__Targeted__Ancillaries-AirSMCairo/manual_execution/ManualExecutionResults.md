# Manual Execution Results — run-007 (Air Cairo, Portal)

> **In progress.** First session, 2026-09-28. Supplier `air-sm-cairo` (Air Cairo, IATA `SM`),
> Feature `ancillaries`, Portal `http://192.168.1.237:9500`, headed, no booking pressed.
> Scope is the 102 cases the capability gate selected (`metadata/CapabilityPlan.md`); the other 18
> are Excluded — Not supported by supplier.

## 1. Supplier baseline — Air Cairo's own data

Recorded because every literal value differs from flynas, and a future run should compare against
**this**, not against run-006's numbers.

| | flynas (run-006) | Air Cairo (this run) |
|---|---|---|
| Airline / code | flynas, `XY` | Air Cairo, `SM` |
| Credential | FLYNAS STG | `aircairo ndc test` |
| Flight used | XY-584 | SM-475 |
| Aircraft | Airbus 320NEO | Airbus 320 |
| Seats on the map | 174 | **170** |
| Fare bundles | Plus / Light Super Flex / Value / Value Flex | **none — no bundle step at all** |
| Fare families instead | — | PROMO · SPECIAL · ECONOMY · ECO FLEX (by RBD) |
| Seat price tiers | 642 / 1,097.91 / free under some bundles | **236 / 614 / 1,180 EGP** |
| Payment methods | Wallet | Wallet · **BANQUE MISR** |

## 2. Results so far

### TC-SM-BND-006 — a supplier with no fare packages shows no package step — **Passed**

Air Cairo is recorded `Bundle: Not Supported`, and the UI matches exactly:

- Step 1 is titled **"Passenger Info"**, not flynas's "Passenger Info and Bundles".
- There is **no "Fare Bundles & Services" section** anywhere on step 1.
- No `Bundle Fare` line appears in the fare breakdown.
- The booking proceeds to Ancillaries normally without one.

Corroborating detail: the **Included Baggage** panel shows concrete values here — "Carry on baggage:
1 HANDBAG 7Kg", "Check in baggage: CheckedBag x1 30 Kilogram" — where flynas showed "Depends on
bundle choice." With no bundle to depend on, the allowance is fixed to the fare instead.

### TC-SM-RND-001 — the seat total matches the seats you can see — **Passed**

The rail reads `SEATS 170`; exactly **170** elements carry `data-seat-id`. The relationship holds.
(170 is Air Cairo's A320 layout, not a value carried over from flynas's 174.)

### TC-SM-RND-002 — every seat has one clear state and one seat number — **Passed**

170 rendered, **170 unique seat numbers, 0 duplicates**, and every seat resolves to exactly one
state. No unlabelled seat.

### TC-SM-PRC-002 — a seat marked "Chargeable seat" must always have a price — **Passed**

All 170 seats are marked `Chargeable Seat` and **all 170 carry a price**. None renders free.
**flynas's defect does not reproduce here** — and it plausibly cannot: that defect was specific to the
`Plus` bundle, and this supplier has no bundles at all.

### TC-SM-PRC-003b — one aircraft can have several seat prices at once — **Passed**

Three distinct tiers on the same aircraft: **EGP 236 · 614 · 1,180**. The rail's "from EGP 236"
agrees with the cheapest.

### TC-SM-SEL-001 — one click only shows the seat, it does not book it — **Passed**

Clicking seat 1B opened its detail ("Seat 1B, row 1, Left side, cabin1, Chargeable Seat, Leg space
seat, available for EGP 1,180") while **"Seats assigned" stayed 0 / 1**. The click reveals; it does not
assign.

### TC-SM-SEL-002 — a seat is only taken when you press the button in the box — **Passed**

The detail panel offers **"Book 1B for Sara"**. Only after pressing it does the seat attach to the
passenger. The wording follows the same "Book <seat> for <passenger>" pattern flynas used.

### TC-SM-SEL-009 — confirming saves the seat and closes the map — **Passed**

**"Confirm seat"** closed the seat map (the traveller picker is gone) and the seat persisted into the
fare breakdown.

### TC-SM-PRC-003 — a paid seat is added as its own line — **Passed**

The seat appears as its **own line**, nested under the ancillaries subtotal rather than folded into
the fare:

```
Base fare: (1 Adult)        5,600 EGP
(+) Ancillaries & SSR       1,180 EGP
    Seat Selection        + 1,180 EGP
Tax & Fees: (1 Adult)       3,387.8 EGP
Total Amount:              10,168 EGP
```

### TC-SM-PRC-004 — the price breakdown adds up — **Passed**

`5,600 + 1,180 + 3,387.8 = 10,167.8`, displayed as **10,168** — rounded up, the same ceiling rule
confirmed on flynas in run-006. The total before the seat was 8,987.8, so the movement is exactly the
seat's 1,180.

### Hold is offered here — the capability is real

The payment step shows a **"Hold"** button beside **"Book"**. flynas showed "Hold is not available for
this flight" instead. Air Cairo's recorded `Hold: Supported` is borne out by the UI, which is what
lets this run execute the four hold/pay-after-hold cases that flynas could not.

### TC-HLD-005 — seats, meals and bags are kept on the held booking — **Passed**

**A real held booking was created on Air Cairo staging**, with the human operator's approval and after
the `aircairo ndc test` credential was confirmed staging (Mohanad Dawood, 2026-09-28).

| | |
|---|---|
| Airline PNR | **8ANO44** |
| Order / Trip ID | `AGN9809UPLUPLORD260928ZYPK89` |
| Booking reference | `NDCEG-BR-F260928cP8aXw` |
| Status | **Hold** |
| Ticketing deadline | 29-09-2026 12:00:00 AM |

**Every ancillary chosen before holding survived onto the held booking:**

| | Recorded on the hold |
|---|---|
| Seat | `SM 475 - AvailablePaid - (Chargeable Seat, Leg space seat) (1B)` |
| Meal | `SM 475 - Hot Chicken Meal (R1?SRV13)` |
| Extra Baggage | `One Kilogram Baggage EGP 95.0` |
| Bundle | `-` — correctly empty, this supplier has none |

Fare reconciles exactly: `5,600 + 3,387.8 + 520 + 1,180 + 95 = **10,782.8**`, matching the total shown.

**The wallet was not charged.** 567,631.400 EGP before the hold and 567,631.400 after — holding creates
the booking without taking money, which is the whole point of a hold.

### Two notes from the held booking

**The displayed total ceilings, the recorded total does not.** The booking page showed **10,783**; the
confirmation shows **10,782.8**. Consistent with the ceiling rule confirmed on flynas — the rounded
figure is what is displayed for payment, the exact sum is what is recorded. Not a discrepancy.

**The seat's rendering on the confirmation — `AvailablePaid - (Chargeable Seat, Leg space seat)` — is
accepted, not a defect** (Mohanad Dawood, 2026-09-28). It shows the seat map's internal state name on a
page where availability no longer applies, but nothing is mispriced, misassigned or lost, and the seat
number and characteristics are both present. run-006 recorded the same rendering on flynas as a session
observation rather than a defect, so both passes now agree. **Not to be re-raised on a future run.**

### TC-PAH-003 — a price change between hold and payment is shown before paying — **Passed**

Opening the held booking showed **Net Payable Amount: 10,782.8 EGP** — identical to the amount held.
No price had changed, so no change dialog was due, and **the held price was the price charged**. That
is the "if it did not change, the held price is charged" branch of the expected result.

### TC-PAH-002 — paying takes exactly the booking amount from the wallet — **Passed**

| | |
|---|---|
| Wallet before | 567,631.400 EGP |
| Wallet after | **556,848.600 EGP** |
| Difference | **10,782.800** |
| Booking total | **10,782.8** |

**Exact to the millieme.** No gap.

**This corroborates run-006's root-cause analysis of `TC-SM-CNF-010`.** On flynas the wallet dropped
**1.22–1.64 EGP less** than the recorded debit on 3 of 3 bookings, which run-006 attributed to an
SAR→EGP conversion at ROE 9. Air Cairo prices natively in EGP with no conversion — and the debit is
exact. A currency-conversion rounding gap is precisely what would appear on one supplier and not the
other, so the flynas finding gains support from this supplier behaving perfectly.

### TC-PAH-004 — after payment the e-ticket is issued and matches the booking — **Passed**

Status moved **Hold → Confirmed**, with "Your ticket has been successfully Confirmed", and a ticket
number was issued: **3812407236413**.

Everything on the e-ticket matches what was held:

| | |
|---|---|
| Passenger | Ms Sara TestAirCairo — Adult |
| Flight | SM 475 |
| Ticket | 3812407236413 |
| Meal | Hot Chicken Meal (R1?SRV13) |
| Seat | (Chargeable Seat, Leg space seat) (1B) |
| Extra Baggage | One Kilogram Baggage EGP 95.0 |
| Bundle | `-` (none, correct for this supplier) |

Fare unchanged through payment: `5,600 + 3,387.8 + 520 + 1,180 + 95 = **10,782.8**`.

### Method note — the sidebar wallet figure is stale after payment

The wallet in the left sidebar still read **567,631.400** on My Bookings after the payment had gone
through; the Dashboard showed the true **556,848.600**. I twice mistook this for "no money was taken".
**Read the wallet from the Dashboard, not the sidebar, when verifying a debit.** Not raised as a
defect — the figure refreshes on navigation — but it will mislead anyone checking in place.

## Multi-passenger booking — 2 adults + 1 child + 1 infant, flight SM477

Passenger details were filled by the human operator. Second aircraft of the run: **SM477, 163 seats**
(SM475 had 170) — so two flights on the same supplier give two different maps.

### TC-SM-PAX-001 — infants get no seat and no extras; children get both — **Passed**

Only **three** of the four passengers get ancillary sections: both adults and the child each have Meal
Preference and Extra Baggage. **The infant has none at all** — no meal, no baggage, no seat. The seat
map's traveller picker opens at **"0 / 3"**, listing the two adults and the child only.

### TC-SM-PAX-006 — each passenger type is priced separately — **Passed**

```
Base fare: (2 Adult)   13,300 EGP      Tax & Fees: (2 Adult)   6,775.6 EGP
Base fare: (1 Child)    4,988 EGP      Tax & Fees: (1 Child)   3,387.8 EGP
Base fare: (1 Infant)     665 EGP      Tax & Fees: (1 Infant)  2,771.8 EGP
Total Amount:          31,889 EGP
```

Each type has its own base and tax line. `13,300 + 4,988 + 665 + 6,775.6 + 3,387.8 + 2,771.8 =
31,888.2`, displayed **31,889** — the ceiling rule again (**TC-SM-PRC-004** holds on a 4-passenger
booking too). Note the infant is charged here (665 base + 2,771.8 tax), not carried free.

### TC-SM-RND-001 — the seat total matches the seats you can see — **Passed (second flight)**

Rail reads `SEATS 163`; exactly **163** seats render. Confirms the relationship on a second aircraft,
with a different number from SM475's 170 — which is the point: the case asserts agreement, not a
constant.

### TC-SM-PAX-004 — the map moves on to the next passenger automatically — **Passed**

After assigning 1E to Mohanad, the picker advanced by itself: Mohanad → `1E · EGP 1,180 · ASSIGNED`,
**Sara → ACTIVE, "Choose a seat below"**, Ahamd → `Ready to choose`. Counter moved to `1 / 3`.

### TC-SM-MPX-002 — the seat goes to the passenger who is selected — **Passed**

With Mohanad active, the seat's button read **"Book 1E for Mohanad"** — named, not ambiguous — and the
seat attached to him alone.

### TC-SM-SEL-012 — a seat held by another passenger in your booking is marked — **Passed**

Seat 1E now reads **"selected for Mohanad Dawood"** and carries the CSS class `seat--selected-other`.
It is visibly distinct from both an available seat and one the active traveller holds.

### TC-SM-MPX-004 — two passengers cannot have the same seat — **Passed**

With **Sara** active, clicking Mohanad's seat 1E offered **no Book button at all**. The detail panel
showed "selected for Mohanad Dawood" and the counter stayed `1 / 3`. The seat cannot be taken twice.

### TC-SM-RND-003 — every seat has a full description — **Passed**

All 163 labels carry seat number, row, side and cabin. **Zero** incomplete descriptions.
Example: `Seat 1E, row 1, Right side, cabin1, Chargeable Seat, Leg space seat, available for EGP 1,180`.

### TC-SM-STA-004 — seat features use known wording — **Passed**

Only three feature words appear across the whole map: **Chargeable Seat · Leg space seat · Window
seat**. No unrecognised or raw wording. (Air Cairo's data marks no aisle seats at all, and no exit
rows on SM477 — see the note below.)

### TC-SM-STA-005 — window and aisle labels match where the seat really is — **Passed**

Every seat in columns **A** and **F** is marked `Window seat`, and **no** seat outside those columns
claims to be one. Zero mismatches either way on 163 seats.

### TC-SM-RND-005 / TC-SM-RND-006 — cabin info agrees, and the map is the flight chosen — **Passed**

The rail reads `SM477 · 320`, `DEPARTS Thu, Oct 15, 2026 03:55`, `ARRIVES 06:05`, `SEATS 163`,
`CABINS Economy`, `DECK Main deck`, `from EGP 236` — matching the flight selected, and matching the map
(all economy, all chargeable, cheapest tier 236).

### TC-SM-SEL-006 — the bottom button changes as seats are chosen — **Passed**

`Confirm 1 of 3 seats` → `Confirm 2 of 3 seats` as assignments were made.

### TC-SM-MPX-007 — some passengers can have seats and others none — **Passed**

Confirmed with **2 of 3** seated: both adults had seats, the child had none, and the booking proceeded
without complaint. The seat charge counted only the two that existed.

### TC-SM-SEL-007 — moving a passenger to another seat frees the first — **Passed**

Sara was moved **2A → 3B**:

| | before | after |
|---|---|---|
| 2A | `selected for Sara Mohamad` | **`available for EGP 614`** — released |
| 3B | `available for EGP 236` | `selected for Sara Mohamad` |
| Her card | `2A · EGP 614` | `3B · EGP 236` — price followed the move |

Counter stayed `2 / 3` throughout: no phantom second seat.

### TC-SM-PRC-003 / TC-SM-PRC-004 — seat lines and totals, multi-passenger — **Passed**

With two seats held: `Seat Selection + 1,416 EGP` = `1,180 (1E) + 236 (3B)`, exact. Total
`13,300 + 4,988 + 665 + 1,416 + 6,775.6 + 3,387.8 + 2,771.8 = 33,304.2`, displayed **33,305** — the
ceiling rule holding on a four-passenger booking.

### TC-SM-SEL-010 — reopening the map keeps your choice — **Passed**

This build's control reads **"Seat 1 more"** rather than "Change Seats", and the ancillaries page shows
a per-traveller summary (`Mohanad Dawood · 1E · EGP 1,180`, `Sara Mohamad · 3B · EGP 236`). Reopening
restored both assignments and the `2 / 3` counter intact.

### TC-SM-SEL-008 — "Clear all seats" also removes the seat charge — **Passed**

After clearing: both seats returned to `available`, counter `0 / 3`, and in the fare the **`Seat
Selection` line and the `Ancillaries & SSR` subtotal disappeared entirely**. Total returned to
**31,889** — precisely the pre-seat figure. No orphaned charge.

## Meals and baggage — the cases approved on 2026-09-28

### TC-ML-001 / TC-BG-001 — offered per passenger — **Passed**

On the 4-passenger booking: **3 Meal Preference sections and 3 Extra Baggage sections**, one each for
both adults and the child, each with its own dropdown and its own journey heading (`CAI → JED Onward`).

### TC-ML-002 / TC-BG-002 — an infant is offered neither — **Passed**

The infant has **no meal section and no baggage section at all** — not an empty one, not a disabled
one. Only 3 passenger cards appear in the ancillaries step for a 4-passenger booking.

### TC-ML-003 — choosing and removing a meal changes the price correctly — **Passed**

| | Total |
|---|---|
| Before | **31,889** |
| After adding `Hot Chicken Meal` (520.00 EGP) | **32,409** — exactly +520, as its own `Meal Preference + 520 EGP` line |
| After removing it | **31,889** — line and `Ancillaries & SSR` subtotal both gone |

Back to precisely the starting figure. No residue.

### TC-BG-003 — changing the bag replaces it, it does not add a second — **Passed**

Air Cairo has no weight tiers, so the case was exercised on the equivalent: **changing the selected
item**.

| | |
|---|---|
| Chose `One Kilogram Baggage - (95 EGP)` | `Extra Baggage + 95 EGP`, total **31,984** |
| Changed to `Golf Equipment - (3,776 EGP)` | `Extra Baggage + 3,776 EGP`, total **35,665** |

**One** `Extra Baggage` line after the change, not two. The subtotal is **3,776**, not `95 + 3,776 =
3,871`, and the total is `31,889 + 3,776` exactly. The first item was replaced, not stacked.

*(Test-design note: this case's wording assumes weight tiers. It was executed against the same
intent — swapping one selection for another — which is what the case exists to protect. The wording
should be generalised so it reads correctly for a supplier that sells items rather than weights.)*

### Finding — `calcBaggagePrice` throws a null dereference on every baggage change

Changing the selected baggage item throws, twice, into the browser console:

```
ERROR TypeError: Cannot read properties of null (reading 'baggageMetaData')
    at gd (914.bd6bda631ca3b549.js:1:396868)
    at i.calcBaggagePrice (914.bd6bda631ca3b549.js:1:397154)
```

**It reproduces run-006's flynas observation.** That run recorded a `calcBaggagePrice` console error
under `TC-SM-PER-002` on flynas, on the `.70` environment. It now appears on **Air Cairo**, on the
`.237` environment, with a completely different baggage data model (items rather than weight tiers).
Two suppliers, two data shapes, two environments — so this belongs to the **Feature**, not to either
supplier, and it is not environment-specific.

**The outcome is still correct**: the price computed to 3,776 exactly and the total reconciled. The
error is caught by Angular's handler rather than surfacing to the user. So this is not a visible
failure — it is a latent null dereference in a **pricing** code path, triggered by an ordinary action.

**Not scored against a case** — no case asserts console health, and `TC-BG-003` passed on its own
terms. Raised as a finding because it is reproducible, cross-supplier, and sits in the code that
calculates what a customer is charged.

**Severity**: Low as observed (no wrong price seen), but worth a developer's eye — a null where
metadata is expected suggests the code has a shape it does not expect, and the next such shape may
not compute correctly.

## Round trip — CAI→JED 15 Oct, JED→CAI 22 Oct, 1 adult

### TC-SM-GEN-003 — gender comes from the title and cannot be edited — **Passed**

The Gender field is **disabled** on every passenger, and it fills from Title: `Mr → Male`,
`Ms → Female` (observed across both bookings). It cannot be set independently of the title.

### TC-SM-RTP-001 — a return trip gives one seat map per journey — **Passed**

The ancillaries step renders **two of everything**, each labelled with its journey:

| | |
|---|---|
| Meals | `CAI → JED Onward` · `JED → CAI Return` |
| Baggage | `CAI → JED Onward` · `JED → CAI Return` |
| Seat Selection | **two** `Select Seat` buttons, one per journey |
| Included Baggage | `Cairo → Jeddah` and `Jeddah → Cairo` panels |

### TC-SM-RTP-004 / TC-SM-MPX-006 — seat maps are completely separate per journey — **Passed**

| | Onward | Return |
|---|---|---|
| Map header | `CAI → JED · Onward` | `JED → CAI · Return` |
| Flight | **SM475**, 15 Oct 10:30 | **SM478**, 22 Oct 07:05 |
| Seats on the map | **169** | **179** |
| Counter after seating onward | `1 / 1` | **`0 / 1`** — untouched |
| Seat **1C** | `selected for Rania RoundTrip` | **`available for EGP 1,180`** |

The last row is the decisive one: **the same seat number is simultaneously held on one leg and free on
the other.** Assigning a seat on the onward flight left the return map completely unaffected, and the
return leg's control still read `Select Seat` while the onward one changed to `Change Seats`.

### Seats bought on a real booking are genuinely withdrawn from inventory

Flight SM475 showed **170** seats when first opened. On this later search of the same flight it shows
**169**, and **seat 1B is absent from the map entirely** — 1B is the seat bought on the confirmed,
ticketed booking earlier in this run (PNR `8ANO44`).

A seat that was paid for is no longer offered to the next agent. Worth recording because the suite's
rule 46 says selection alone does **not** hold a seat — this shows that *purchase* does.

### TC-SM-PRC-004 — totals, round trip — **Passed**

`6,500 (base) + 1,180 (seat) + 6,983.8 (tax) = 14,663.8`, displayed **14,664**. Ceiling rule holds on a
round trip as it did one-way and multi-passenger.

### TC-SM-A11Y-002 — seat states can be read by screen readers — **Passed**

Every one of the 179 seats is a real `<button>` carrying a label that conveys **all** of: seat number,
row, side, cabin, features, **state** and **price** —

`Seat 1A, row 1, Left side, cabin1, Chargeable Seat, Leg space seat, Window seat, available for EGP 1,180`

179 / 179 have a label, convey state, and convey price. Nothing relies on colour alone. The seat map
itself is a correct `role="dialog"` with `aria-modal="true"` and a labelled title.

### TC-SM-A11Y-001 — the seat map works on a smaller screen — **Passed**

At **390 × 844** (phone width): **no horizontal page scroll** (`scrollWidth 390 = clientWidth 390`) and
all **179** seats still render. The layout reflows rather than overflowing.

### TC-SM-PER-001 — seats survive going back a step — **Passed**

From ancillaries with seat 1C held: **Prev** to step 1, then **Next** back to ancillaries.

| | Before | After |
|---|---|---|
| Seat summary | `Rania RoundTrip · 1C · EGP 1,180` | **identical** |
| Total | 14,664 | **14,664** |

Byte-identical. **This is where flynas fails.** run-006's `TC-SM-CNF-018` found that returning to step
1 and correcting a passenger name silently discarded every seat, meal and bag on flynas — a confirmed
High/P1 defect there. Air Cairo keeps them. *(The stronger version of this check — go back and actually **edit** a name — was then run, and it
**fails**. See the defect below. `TC-SM-PER-001` stands as Passed on its own terms: navigating without
editing preserves everything.)*

## DEFECT — editing a passenger name silently discards the seat (`TC-SM-CNF-018` reproduces here)

1. **Test Case ID**: TC-SM-CNF-018
2. **Execution Status**: **Failed**
3. **Execution Time**: 2026-09-28, ~02:10 UTC
4. **Preconditions**: Round trip CAI→JED 15 Oct / JED→CAI 22 Oct, 1 adult (Rania RoundTrip), onward
   seat **1C** held at EGP 1,180, total **14,664**.
5. **Test Data**: First Name changed `Rania` → `Raniaa` — a one-character correction, the kind an agent
   makes constantly.
6. **Steps Performed**: From Ancillaries, **Prev** → edit First Name → **Next**.
7. **Expected Result**: The seat survives a passenger-detail correction, or the agent is warned before
   it is dropped.
8. **Actual Result**: **The seat was silently discarded.**

   | | Before the edit | After the edit |
   |---|---|---|
   | Seat summary | `Rania RoundTrip · 1C · EGP 1,180` | *(gone — control back to `Select Seat`)* |
   | `Seat Selection` fare line | `+ 1,180 EGP` | *(absent)* |
   | `Ancillaries & SSR` subtotal | `1,180 EGP` | *(absent)* |
   | Total | **14,664** | **13,484** |

   `14,664 − 1,180 = 13,484` — exactly the seat's price removed. **No warning, toast, dialog or alert
   was shown** (`[role="alert"]` and all toast containers were empty). The agent is given no indication
   the seat is gone.
9. **Impact**: An agent correcting a typo loses the customer's seat without being told. They may
   complete the booking believing the seat is still attached; the customer then travels without it, or
   the agent must notice and redo the selection. On a multi-passenger booking the loss would be larger.
10. **Classification**
    - **Category**: Workflow / Data Loss
    - **Layer**: Frontend — step 2 is rebuilt after the passenger is re-submitted, without re-applying
      prior ancillary selections
    - **Reproducibility**: Always, on both suppliers tested
    - **Regression**: No — pre-existing; run-006 confirmed it on flynas
    - **Confidence**: High
11. **Root Cause Analysis**: *Likely* the same as run-006's analysis: pressing Next with changed
    passenger data re-creates the passenger, and the ancillaries step is rebuilt from a fresh quote
    without re-applying the earlier choices. Not independently verified here.
12. **Conclusion**: Editing any passenger name after choosing ancillaries silently discards them.
13. **Severity**: High. Silent loss of a paid customer choice during a routine correction.
14. **Priority**: P1
15. **Evidence**: totals and seat-summary text before and after, quoted above; empty alert/toast
    containers recorded at the moment of loss.

### Why this one matters more than a single supplier's bug

run-006 found this on **flynas** (`.70`, SAR-priced, bundle-based) and classified it High/P1. It now
reproduces exactly on **Air Cairo** (`.237`, EGP-priced, no bundles, different aircraft, different
ancillary model).

Two suppliers, two environments, two data models, identical behaviour — this is a **Feature-level
defect in the booking wizard**, not a supplier integration problem. That materially raises its
priority: fixing it once fixes it for every supplier, and no supplier-specific workaround will help.

### TC-SM-NEG-006 — opening the booking page with a broken or missing link — **Passed**

Both `?flight-token=BROKEN_TOKEN_XYZ` and no token at all produce the same clean result:

```
No Data Found
One or more parameters are invalid or missing.
[Go Back]  [Go Home]
```

No crash page, no stack trace, no leaked internals, and two recovery routes offered. The app stays
signed in and usable.

### Economy vs Business (group L) — **Not Executed**, this supplier has no Business cabin

A Business search was run (the summary confirms `BUSINESS` was applied, so the filter reached the
supplier). It returned the **same five fares as the Economy search** — SM-475 W 8,988 · SM-477 S
10,038 · SM-475 G 11,088 · SM-477 Q 15,988 · SM-477 B 21,588 — each card labelled `Economy` and
carrying an explicit **"No Business"** note.

**This is correct behaviour, not a defect.** The app is not ignoring the cabin filter; it is reporting
that Air Cairo sells no Business cabin on this route and falling back to what exists, labelled
honestly. The four cabins offered in the dropdown (Economy · Premium Economy · Business · First Class)
are the app's generic list, not a claim about this supplier.

**Consequence:** `TC-SM-CAB-001`, `CAB-003`, `CAB-004` and `CAB-007` cannot be executed on Air Cairo —
there is no second cabin to compare against. They are **Not Executed — no Business cabin on this
supplier/route**, not failures. (`CAB-002` and `CAB-005` were already Excluded by the capability gate
for needing Bundle.)

This is the mirror of flynas, where the same group was blocked for the opposite reason: flynas *had* a
Business cabin but staging mislabelled it.

### Bundle — how Air Cairo differs, and why it stays `Not Supported`

Air Cairo **does** sell fare packages. They are chosen at the **search step**, not in the wizard:
`PROMO` · `SPECIAL` · `ECONOMY` · `ECO FLEX`, each a different price for the same flight (SM-475 at
8,988 and 11,088; SM-477 at 10,038, 15,988 and 21,588), and each carrying its own inclusions forward —
the PROMO offer arrived with `CheckedBag x1 30 Kilogram` and `1 HANDBAG 7Kg` already attached.

*"It's like the trips come bundled from outside, from the search step"* — Mohanad Dawood, 2026-09-28.

So the wizard has **no bundle step at all** (`Select Bundle` / `Fare Bundles & Services` are absent),
because the choice was already made one screen earlier.

**Decision (Mohanad Dawood, 2026-09-28): `Bundle` stays `Not Supported`, and no bundle case runs on
this supplier.** The capability means *an in-wizard bundle step*, which is what every BND case is
written against. Pre-bundled offers are a different thing and are not covered by those cases.

Recorded here so this is not re-opened on a future run: the absence of a bundle step on Air Cairo is
**expected**, and the 9 excluded bundle cases are correctly excluded.

Also checked while establishing this: the cabin dropdown offers Economy · Premium Economy · Business ·
First Class, but **all four return the same Economy fares** for this supplier — Business searches are
labelled "No Business" on every card. The dropdown is the app's generic list, not a claim about
Air Cairo's inventory.

### Each flight is offered at several price classes — confirmed

Checked at Mohanad Dawood's request (2026-09-28). Expanding every `More Options` on the results:

| Flight | Price classes offered |
|---|---|
| **SM-475** | `PROMO` (RBD W, 8,988) · `SPECIAL` (RBD G, 11,088) |
| **SM-477** | `PROMO` (S, 10,038) · `SPECIAL` (G) · `ECONOMY` (Q, 15,988) · `ECO FLEX` (B, 21,588) |

Same aircraft and same departure time, several classes, prices rising with the class. Each family also
carries **its own RBD** (W / G / Q / B), and SPECIAL is RBD `G` on both flights — so the class maps to a
real booking class, it is not a cosmetic label.

The extra classes are hidden behind the card's **`More Options +N`** control; only the cheapest shows by
default.

### TC-SM-NAV-001 — you can only pick seats on step 2 — **Passed**

Step 1 (Passenger Info) exposes **no** `Select Seat` control and no Seat Selection section at all. Seats
appear only after advancing to Ancillaries.

### TC-SM-NAV-002b — missing passenger details are reported — **Passed**

Pressing **Next** on an empty passenger form did **not** advance, and surfaced **8 `Required` markers**
against the unfilled fields. The step stayed on Passenger Info.

### Finding — the four price classes offer identical ancillaries and fare rules

Checked at Mohanad Dawood's request (2026-09-28): the ancillaries step was opened under all four price
classes on SM-475/SM-477, same route, same day.

| | PROMO (8,988) | SPECIAL (11,088) | ECONOMY (15,988) | ECO FLEX (21,588) |
|---|---|---|---|---|
| Included baggage | 7Kg + 30Kg | identical | identical | identical |
| Cancel / Change | N/A / N/A | identical | identical | identical |
| Meal list | 22 options, same prices | — | — | **22 options, same prices** |
| Baggage list | 9 options, same prices | — | — | **9 options, same prices** |
| Seat price tiers | 236 / 614 / 1,180 | — | — | **236 / 614 / 1,180** |
| Free seats | 0 | — | — | **0** |

**PROMO and ECO FLEX were compared in full** (meals, baggage, seats) and are **identical** in every
ancillary offered and every price charged for it. SPECIAL and ECONOMY were confirmed identical on the
fare summary (baggage, Cancel, Change) but not re-opened at the ancillaries step, since PROMO vs
ECO FLEX — the cheapest and most expensive class — already brackets the comparison.

**A customer paying 21,588 for ECO FLEX gets exactly the same shop, at exactly the same prices, as one
paying 8,988 for PROMO** — no extra included baggage, no free seat, no flexible cancel/change to
justify "FLEX" in the name. Not scored against a case (no case in the suite asserts this relationship
directly), but raised as a finding: either the fare classes are not yet differentiated on this
environment, or "ECO FLEX" promises something the product does not currently deliver.

### Price-change group (N) — Not Executed on Air Cairo, could not reproduce the trigger

`TC-SM-FRC-001/002/003/005` need the airline to return a changed price at the "Accept" step (the
`fareMismatch: true` case flynas reliably reproduced in run-006). Four separate searches were tried on
Air Cairo — different dates, different flights, different fare classes — and every resulting
`flight-token` decoded to `"fareMismatch": false`.

**Not a defect.** The mechanism is supplier/data-driven — flynas's staging feed evidently simulates a
fare bump on most quotes; Air Cairo's does not, at least not on the routes/dates tried here.
**Recorded as Not Executed**, not Blocked and not a false Pass: the precondition (a mismatched quote)
could not be constructed on this supplier in this session. A future run should retry with a wider
spread of dates/flights, or note that this group may simply need a different supplier to exercise.

### Multi-city group (S) — Not Executed on Air Cairo, no natural connection found

`TC-SM-RTP-003/RTP-005/MCT-003/MCT-004/MCT-005/MCT-006/MCT-007` need a genuine multi-city itinerary
(the equivalent of flynas's CAI→JED→RUH→DMM chain in run-006). Two attempts were made on Air Cairo:

- **CAI→JED→RUH→DMM** (3 legs, matching flynas's exact chain) — `No Flights Found`
- **CAI→JED→RUH** (2 legs) — `No Flights Found`

Both destinations (RUH, DMM) exist in the airport picker and are individually reachable, but Air Cairo
returned no connecting itinerary through them from this search on this date.

**Not a defect.** This reflects the supplier's actual network/schedule, not an application fault — the
airport existing in the picker does not mean every route between two airports is flown. **Recorded as
Not Executed.** A future run should try Air Cairo's own known connecting hubs (not assumed from
flynas's network) before concluding this group cannot be exercised on this supplier at all.

### TC-SM-PER-002 — seats, meals and bags all work together — **Passed**

One passenger (Omar SelTest), all three ancillaries added in one booking:

```
Base fare            5,600
Seat Selection       + 1,180
Meal Preference      +   520   (Cold Roast Beef Meal)
Extra Baggage        +    55   (Excess Fees)
Tax & Fees           3,387.8
Total Amount        10,743     (10,742.8 → ceil)
```

All three lines coexist correctly — none overwrote another, and the arithmetic is exact.

### TC-SM-PER-007 — the seat appears on the payment summary — **Passed**

`Net Payable Amount: 10,742.8 EGP` on the payment panel matches the fare breakdown's unrounded total
exactly, with all three ancillaries (including the seat) reflected in it.

### TC-SM-SEL-003 — the seat information box is correct — **Passed**

Clicked seat 1D's detail panel text is **byte-identical** to its own map `aria-label`:
`Seat 1D, row 1, Right side, cabin1, Chargeable Seat, Leg space seat, available for EGP 1,180`. No
discrepancy between what the map claims and what the click-through panel shows.

### TC-SM-STA-002 — a taken seat can be looked at but not booked — **could not be tested as written**

No seat on this map ever renders in a genuinely "taken by someone else, still viewable" state. Air
Cairo's behaviour differs from what the case assumes: when a seat is actually sold (confirmed earlier
in this run — seat 1B vanished from SM475's map entirely, from 170 seats down to 169), it is **removed
from the map**, not shown disabled. The only "taken but viewable" state this build has is
`seat--selected-other` — a seat held by **another passenger in the same booking** — which is already
covered by `TC-SM-SEL-012` (Passed) and `TC-SM-MPX-004` (Passed).

**Not scored as a defect.** This is a different, internally consistent design choice (remove sold
inventory rather than grey it out), not a broken feature. Recorded as **Not Executed as written** —
the precondition the case assumes (a seat sold to a different PNR, still rendered) does not occur on
this supplier's data model.

## Confirmation-integrity group (Q) — verified against the existing paid booking, no new spend

Order `AGN9809UPLUPLORD260928ZYPK89` (PNR `8ANO44`, ticket `3812407236413`, paid under `TC-PAH-002`)
was already Confirmed and Ticketed. Rather than book again, its Order Details page was opened to check
the confirmation-integrity group directly — no additional money spent.

### TC-SM-CNF-001 / TC-SM-CNF-002 — the confirmation total equals the quote, every price line survives — **Passed**

Order Costing tab: `Net 5,600.00 | Net (Tax) 3,387.80 | Total 8,987.80` for the fare, plus
`Meal 520.00 · Baggage 95.00 · Seat 1,180.00` = `Total SSR Amount 1,795.00`. `Total Booking Amount:
10,782.80 EGP` — matching the quoted price at the moment of Hold/Pay exactly, to the same figure
recorded at booking time (`TC-PAH-002`).

### TC-SM-CNF-003 — every ancillary reaches the confirmation with its own price — **Passed**

The order's **Segment Ancillaries** tab lists each item separately, matching what was chosen:

| | Order page |
|---|---|
| Meal | `R1?SRV13 · 520 EGP · Hot Chicken Meal` |
| Baggage | `One Kilogram Baggage EGP 95.0` |
| Seat | `1B · 1,180 EGP` |

### TC-SM-CNF-004 — seats carry through to the right passenger with the right price — **Passed**

Seat `1B` is listed under **Sara TestAirCairo**'s own ancillary block, at `1,180 EGP` — the same
passenger, same seat, same price as at booking.

### TC-SM-CNF-007 — infants appear as passengers but carry no seat or ancillaries — **N/A on this order**

This booking has no infant (1 adult only), so the counting behaviour cannot be checked here. Already
covered on the 4-passenger booking earlier in this run, where the infant correctly had **zero**
ancillary sections (`TC-SM-PAX-001`).

### TC-SM-CNF-008 — the e-ticket and the confirmation page agree exactly — **Passed**

| | Confirmation (at booking) | Order Details (now) |
|---|---|---|
| PNR | 8ANO44 | 8ANO44 |
| Ticket | 3812407236413 | 3812407236413 |
| Status | Confirmed | Ticketed |
| Total | 10,782.8 | 10,782.80 |

Identical across both surfaces.

### TC-SM-CNF-011 — the Costing tab adds up and is the figure to trust — **Passed**

`5,600.00 + 3,387.80 = 8,987.80` (fare) `+ 1,795.00` (SSR: `520 + 95 + 1,180`) `= 10,782.80`. **Total
Sales Amount**, **Total Net Amount** and **Total Booking Amount** all independently show **10,782.80
EGP** — three separately-labelled figures agreeing with each other and with the arithmetic.

### TC-SM-CNF-012 — the order page itemises every ancillary and reconciles — **Passed**

The Costing tab breaks out `Total SSR Amount` into its three components (Meal/Baggage/Seat) before
rolling up to the booking total — a full itemisation, not a single opaque figure. *(Note carried from
run-006: on the Portal build the equivalent breakdown lived on the confirmation page rather than the
order-details page; on this build it is the order's own Costing tab that itemises it.)*

### TC-SM-NAV-002 — cannot reach seats without a fare package — **N/A on this supplier**

The case assumes an in-wizard bundle step gating access to seats. Air Cairo has no bundle step at all
(the package is chosen at search, per the earlier §"how Air Cairo differs" note) — there is nothing
for this case to gate on. Consistent with the Bundle capability being `Not Supported`; not scored as
a failure.

### TC-SM-NAV-003 — 'Select Seat' opens the seat map — **Passed**

**0** seat elements present before the click; **169** after clicking `Select Seat`, with the
`Choose a traveller` panel open. The control does exactly what it says.

### TC-SM-NAV-005 — you can skip seats completely — **Passed**

`Continue without seats` closed the map with no seat assigned. Total stayed at **8,988** (the base
fare, unchanged), and `Book` remained enabled. Skipping seats does not block the booking.

### TC-SM-NEG-003 — clicking quickly does not book two seats — **Passed**

A rapid double-click on an available seat resulted in exactly **one** `Book <seat> for Nav` control,
never two. Assigning it gave `1 / 1, All assigned`, one seat (`1F`), **no errors** in any toast/alert
container. No race condition, no duplicate assignment.

### TC-SM-CNF-015 — walking away before 'Book' creates nothing (THE SAFE TEST) — **Passed**

The "Nav Test" passenger's seat (1F, EGP 1,180) was confirmed on the ancillaries step, then the
session was navigated away to My Bookings **without pressing Book**. Searched My Bookings directly
afterward: **"Nav Test" appears in none of the results.** No order, no PNR, no charge — walking away
before the final Book action creates nothing, exactly as the case requires.

### TC-SM-RND-007 / TC-SM-RND-010 — different flights give different maps — **Passed**

Already established across this run's own searches, on the same supplier:

| Flight | Seat count |
|---|---|
| SM475 (first search) | 170 |
| SM475 (later search, after a real sale) | 169 |
| SM477 (round trip) | 163 |
| SM478 (round trip return) | 179 |

Four different maps from the same supplier across two aircraft/flight numbers — each with its own
seat count, matching its own rail (`SEATS 170`/`169`/`163`/`179`), never the same map served twice for
different flights.

### Ladies-only seats — correctly out of scope, and confirmed so

**Zero** seats carry a female-designation marker. The 6 ladies-only cases were excluded by the
capability gate because Air Cairo has no such rule recorded, and the seat map bears that out. The
exclusion was right.

### TC-SM-STA-006 — emergency exit seats are marked — **Passed**, and a stronger finding underneath

**12 exit-row seats** (rows 12–13 on this later search of SM475), all available on a single-adult
booking with no infant, each carrying the label wording **"Exit or emergency exit seat"** — the
Feature's known vocabulary, not a raw/unrecognised string.

**Every one of the 12 also carries its own explicit label: "Seat not allowed for infant."** This is a
**per-seat, machine-readable flag** for the infant-holder exit-row restriction — not merely an
absence of blocking, and not something inferred from row position. It exists in the seat data whether
or not an infant is in the current booking.

This sharpens the 2026-09-27 correction rather than just supporting it: the restriction **is** encoded
in the seat's own metadata (`aria-label`), but the booking wizard does not act on it for a booking with
no infant present — the flag sits there, unread by the UI's own blocking logic, until an infant-holder
tries to take the seat, at which point (per the correction) the airline rejects it at booking rather
than the UI withdrawing it in advance.

*(Method note: an earlier pass over a different search of this same flight used the pattern
`/Exit and emergency exit/` and found 0 matches — the real wording is "Exit **or** emergency exit
seat." The seats were never missing; the regex was wrong. Corrected here.)*

## 2a. Environment note — the Statement report returned no data

While verifying `TC-PAH-002`'s wallet movement, the Statement report returned **"No data has been
found!"** for `01/09/2026` – `28/09/2026`, a range containing a payment that definitely happened
(wallet 567,631.400 → 556,848.600, ticket `3812407236413` issued).

**This is an environment issue, not a product defect** (Mohanad Dawood, 2026-09-28). **Not raised, not
counted against any case, and not to be re-raised on a future run.** It is recorded only so the next
reader knows why the Statement could not be used as wallet evidence here, as run-006 used it on flynas
— the wallet had to be read from the Dashboard instead.

## 2b. Coverage gap — the reports are not tested at all

The suite has **no cases for any of the four reports** (Total Due to NDC, Sales, Bookings, Statement).
Searching the 120 cases for "report" or "statement" returns only cases that use those words in
ordinary sentences ("must be reported as failed"), never a case that opens a report.

The gap is worth closing regardless of what the Statement did here: run-006 read that report as
*evidence* while verifying flynas's wallet, but nothing in the suite ever asserts that a report
itself works. A report that silently returns nothing is indistinguishable from a quiet period unless
something checks it.

Report cases were drafted on 2026-09-28 (group `X. Reports`) — `Review = Pending` until approved.

## 3. Observations to raise — not yet scored

### Meal codes beside meal names — NOT a defect (confirmed 2026-09-28)

Every meal option renders its service code before the price and name:

```
R1?SRV8   567.00 EGP  Hindu Meal
R1?SRV13  520.00 EGP  Hot Chicken Meal
```

**This is normal and happens with every supplier** (Mohanad Dawood, 2026-09-28). The codes belong
beside the names. The names themselves read poorly here, but that is **staging data**, not the
application. Not raised as a defect, and not to be re-raised on a future run.

### The baggage list carries more than baggage — NOT a defect (confirmed 2026-09-28)

Air Cairo returns per-kilogram and special-equipment items where flynas returned weight tiers:

`One Kilogram Baggage (95 EGP)` · `Excess Fees (55 EGP)` · `Golf / Ski / Bicycle / Scuba / Windsurf
Equipment (3,068–3,776 EGP)` · `Pet In Cabin (3,776 EGP)` · `Request To Transport Fragile Baggage
(0 EGP)`

**Some suppliers return "others" inside the baggage dropdown** (Mohanad Dawood, 2026-09-28) — this is
legitimate supplier behaviour, not a fault, and differing from flynas is expected. Items such as
"One Kilogram Baggage" are **dummy staging data** and would not appear in production.

**What this does affect:** `TC-BG-003` ("changing the bag weight replaces the bag, it does not add a
second one") is written around weight tiers. Against a per-kilogram or equipment list it has no
"weight" to change. Flagged for test design to reword per supplier — not a failure of the
application.

### WITHDRAWN — my two meal-price observations were a parsing error

I first reported that declining a meal cost **20.00 EGP**, and that **no free meal existed**. Both were
wrong; the application is correct on both counts.

The dropdown renders code, price and name as three separate elements. `innerText` concatenates them with
no delimiter, giving `R1?SRV420.00 EGPMeal On Board Not Required`, which I split as `SRV4` + `20.00 EGP`.
The screenshot supplied on 2026-09-28 shows the truth:

```
R1?SRV42     0.00 EGP     Meal On Board Not Required
```

**`SRV42` at `0.00 EGP`.** Declining a meal is free, and a free option does exist — **the same as
flynas's FALD free meal** (Mohanad Dawood, 2026-09-28). So the rule "a free meal is always offered"
holds on this supplier too; only my reading of it was broken.

**Method note for this suite:** read a dropdown option's child elements separately. Never split the
concatenated `innerText` of an option row — the code/price boundary is genuinely ambiguous there, and a
wrong split invents a defect that does not exist.

### Seat IDs use a different encoding

flynas's `data-seat-id` was base64 of a `#`-delimited string. Air Cairo's is a different format
(`PRICE&` prefix, msgpack-like payload) and does not base64-decode the same way. The `aria-label` is
rich and readable here, so it was used instead — worth knowing for anyone automating this.

### New Supplier Rule confirmed — Document Number must be `A` + 8 digits

Mohanad Dawood (2026-09-28): on Air Cairo, a passenger's Document Number must start with a capital
`A` followed by 8 digits, or the booking fails validation. This is a supplier-specific format rule,
not a generic ID-format check — recorded as a confirmed Supplier Rule:

```
node platform_core/tools/module_manager/cli.js supplier-feature supplier rules ancillaries air-sm-cairo \
  --value "document-number-format-a-prefix" --by "Mohanad Dawood"
```

No test case in the suite currently tags this rule (the sheet has no dedicated document-number-format
case to tag); noted here so a future Supplier Rule-tagged case can cite it directly rather than
re-discovering it.

### TC-SM-EXR-001 / 002 / 004 / 005 — **Blocked / Not Executed on this flight** (no exit rows mapped)

Booking: SM477, CAI→JED, 15 Oct 2026, Airbus 320, 151 seats, one Economy cabin, rows 1–11 and 14–30
(12–13 skipped). Every seat's `aria-label` was read directly from the DOM across the whole map
(162 unique labels). Result: **zero** seats labelled "Exit or emergency exit seat", and **zero** seats
carrying an infant restriction note. Exactly **one** seat is marked "Leg space seat" (1E), with no
exit/infant wording either.

This is a materially different seat map from the one exit rows were confirmed on earlier in this run
(different flight/booking). Rather than force these four cases against a seat map that has no exit
row to test, they are recorded **Blocked / Not Executed — no exit-row seats exist on this specific
flight's map**, not a Pass, Fail, or defect. A future run against a flight whose map does carry exit
rows should retry these four directly.

### TC-SM-PAX-008 — two infant-holding adults CAN sit in the same 3-seat set — **Not blocked by the UI**

Booking (in progress, quote only — no Hold/Book yet): 2 Adults + 1 Child + 2 Infants, each infant
assigned to a different adult via the mandatory "Assigned to" field (Passenger Info step accepted
both assignments with no complaint). Seat map, row 4: Mohanad Dawood (carrying an infant) confirmed
into **4B**, Sara Mohamad (carrying the other infant) confirmed into **4C** — the same 3-seat set,
directly adjacent. Layla ExrTest (Child, no infant) confirmed into 5A separately.

No warning, no block, no different price, no disabled state appeared anywhere in the flow for placing
two infant-holding adults side by side in one seat set. This is **the same outcome already established
for flynas in run-006**: the rule (if it exists at all) is not enforced in the seat-map UI on either
supplier — consistent with the standing "supplier-enforced-at-booking, not UI-blocked" pattern already
recorded for rule 62 and the ladies-only-seat/baggage clash. Recorded as **Passed** against the
expected result "the UI does not silently prevent this — whatever the supplier does with it happens at
booking, not here", since that is exactly what was observed. Not yet confirmed whether the *booking*
step itself would reject this combination — that would need this quote actually taken to Hold or Book,
which has not happened.

**TC-SM-PAX-003** (infant must be linked to an adult) — **Passed**: the "Assigned to *" field is marked
required on both Infant panels and the Next button will not advance to Ancillaries until it is set
(observed directly during Passenger Info entry for this same booking).

### First Book attempt on the 2-infants-same-seat-set booking — Failed, but with a confound

Mohanad Dawood (2026-09-28) expected the two-infant-holding-adults-in-one-seat-set combination to be
rejected at Book (not at seat selection), matching the standing "supplier-enforced-at-booking, not
UI-blocked" pattern. The Book attempt (Mohanad 4B, Sara 4C, Layla 5A; total 36,789 EGP) was submitted
and did fail: **"Invalid request. Please check the request parameters and try again."** — GDS PNR `-`,
Airline PNR `-`, Status `Failed`, Booking Reference `NDCEG-BR-F260928qz2pEF`. Wallet balance was
unchanged afterwards (556,848.600 EGP) — a failed Book does not charge, consistent with the same
finding already recorded for flynas.

**This result is confounded and cannot be attributed to the seat rule alone.** Layla ExrTest's
Document Number was `E3333333m` — this does **not** match the Air Cairo Supplier Rule confirmed
earlier in this session (`document-number-format-a-prefix`: must be capital `A` + 8 digits). Sara
Mohamad's saved profile (`P9988776`) does not match it either. An invalid document number would
independently produce the same generic "Invalid request" failure, and the error message is too
generic to say which cause (or both) actually fired. **Not scored as a Pass or a Fail for
TC-SM-PAX-008 on this attempt** — see the retry below with the confound removed.

### TC-SM-PAX-008 — retry with the confound removed — **Passed: correctly rejected at Book**

Fresh quote, same route/date/flight (CAI→JED, SM477, 15 Oct 2026, PROMO, 35,325 EGP published fare),
same 2 Adults + 1 Child + 2 Infants, same seat assignment (Mohanad Dawood 4B, Sara Mohamad 4C — same
3-seat set — Layla ExrTest 5A). This time every passenger's Document Number was set to a known-valid
`A` + 8-digit value (`A10000001` through `A10000005`) before Book was submitted, removing the
document-number confound entirely.

**Result: Book failed again**, same generic message — *"Invalid request. Please check the request
parameters and try again."* — Status `Failed`, GDS/Airline PNR both `-`, Booking Reference
`NDCEG-BR-F260928WF91Ae`. Wallet balance unchanged afterwards (556,848.600 EGP) — no charge for a
failed Book, same as every other failed-Book case recorded on both suppliers in this project.

**With the only known-invalid field corrected, this isolates the failure to the seat assignment
itself.** Mohanad Dawood (2026-09-28) expected exactly this: the two-infant-holding-adults-in-one-
seat-set combination is rejected by the supplier at Book, not blocked in the seat-map UI. Scored
**Passed** against that expectation — the application does enforce the rule, just at the booking
step rather than at seat selection, consistent with the same "supplier-enforced-at-booking"
architecture already established for rule 62 and the ladies-only-seat/baggage clash. The only
caveat: the error text itself is generic and does not name the seat-set rule explicitly, so this
finding rests on isolating the variable rather than on a specific error message — worth a UX
improvement note (a specific validation message would make this failure self-explanatory) but not a
functional defect.

**Confirmed a second way: Hold rejects it too.** A third fresh quote — same route/flight/fare, same
2 Adults + 1 Child + 2 Infants, same seat assignment (4B/4C same seat set, 5A for the child), fresh
document numbers on every passenger (not reused from the prior attempt, to rule out a
duplicate-document-number confound) — was submitted via **Hold** instead of Book. Result: **Hold
failed** with the identical message — *"Invalid request. Please check the request parameters and try
again."* — Status `Failed`, Booking Reference `NDCEG-BR-F260928U4FeBo`. Wallet balance unchanged
(556,848.600 EGP), consistent with the standing finding that a failed order (Hold or Book) never
charges. This shows the seat-set rule is enforced at order-submission validation generally, not only
at the final-payment step — Hold and Book both go through the same rejection.

### TC-SM-EXR-002 / 003 / 004 / 005 — retried on SM475 (which does carry exit rows) — **all four Failed**

The earlier "Blocked / Not Executed" note above concerned **SM477**, whose map has no exit-row seats
at all. **SM475** (same CAI→JED route, different departure time, confirmed earlier in this run at
§TC-SM-STA-006) does carry 12 exit-row seats at rows 12–13, each labelled `Exit or emergency exit
seat` and `Seat not allowed for infant`. A fresh booking was built specifically to retry these four
cases against that flight: 2 Adults (Mohanad Dawood, Sara Mohamad) + 1 Child (Layla ExrTest) +
1 Infant (initially assigned to Mohanad), quote only, no Hold/Book submitted.

**Seat 12A was checked as every relevant passenger, one at a time, without booking it:**

| Selected passenger | Seat 12A state shown |
|---|---|
| Mohanad Dawood (Adult, holding the infant) | `available for EGP 1,180` — "Book 12A for Mohanad" fully enabled |
| Layla ExrTest (Child) | `available for EGP 1,180` — "Book 12A for Layla" fully enabled |
| Sara Mohamad (Adult, not holding an infant) | `available for EGP 1,180` — "Book 12A for Sara" fully enabled |
| Sara Mohamad, after the infant's "Assigned to" was changed from Mohanad to Sara | `available for EGP 1,180` — unchanged |

The seat's own `aria-label` — `Seat 12A, row 12, Left side, cabin2, Seat not allowed for infant,
Chargeable Seat, Exit or emergency exit seat, Window seat, available for EGP 1,180` — is **identical
byte-for-byte regardless of which passenger is selected**. This is the key finding: seat availability
here is a **static property of the seat**, not a per-passenger computation. The right-hand panel does
re-render with the correct passenger's name in "Book 12A for `<name>`", so passenger *selection* is
wired up correctly — but nothing downstream of that ever asks "is this passenger allowed in this
seat?" before offering the Book button.

**Initial UI-only reading** (superseded below for EXR-002 and EXR-003 by real Book/Hold attempts, per
Mohanad Dawood's 2026-09-28 direction not to rely on the seat map alone): the seat map showed the same
"available" state for the infant-holding adult, the child, and the unrestricted adult alike, and
switching the infant's "Assigned to" between the two adults changed nothing. Taken at face value that
would read as EXR-002/003/004/005 all Failed — but that only describes what the seat map *offers*,
not what the supplier *accepts*. See the real-Hold retests immediately below.

### TC-SM-EXR-002 — retried by real Hold (not just UI observation) — **Passed: rejected, with a specific message**

Mohanad Dawood (2026-09-28) directed that the exit-row rule be tested by an actual Book/Hold attempt,
not inferred from the seat map UI alone — the UI-only observations above show what the seat map
*offers*, not what the supplier ultimately *accepts*.

A fresh Hold was submitted with Mohanad Dawood (holding the infant) seated in exit seat **12A**, Sara
Mohamad in 5A, Layla ExrTest in 5B. Result: **Hold failed**, with a banner "Booking Has been failed!"
and, notably, a **specific** error this time rather than the usual generic one — *"Supplier Error -
SPECIFIC SEAT REQUESTED NOT AVAILABLE - RESTRICTED & ACCEPTED"* — Status `Failed`, Booking Reference
`NDCEG-BR-F260928tBGWAT`. Wallet unchanged (556,848.600 EGP).

**This corrects the UI-only finding above: the rule is real and is enforced, just not in the seat
map.** The seat map will let an infant-holder select and "confirm" an exit-row seat with no warning
at all, but the supplier rejects the actual Hold/Book with a message that specifically names the
seat as the reason ("SPECIFIC SEAT REQUESTED NOT AVAILABLE - RESTRICTED"). Scored **Passed** against
the expectation that the adult ultimately cannot take the seat — but the seat-map-side silence
remains worth raising as a UX gap: an agent gets no warning until after submitting Hold, by which
point they believe the booking is going through.

### TC-SM-EXR-003 — a child in an exit seat, retried by real Hold — **Passed: rejected, identically**

A second fresh booking (1 Adult + 1 Child only, to isolate the child from the infant case): Layla
ExrTest (Child) seated in exit seat **12A** on the same SM475 flight, Mohanad Dawood in 5A. Hold was
submitted. Result: **identical failure** — *"Supplier Error - SPECIFIC SEAT REQUESTED NOT AVAILABLE -
RESTRICTED & ACCEPTED"*, Status `Failed`, Booking Reference `NDCEG-BR-F2609281dP46p`. Wallet
unchanged (556,848.600 EGP).

**Scored Passed** — the child is genuinely prevented from ending up in an exit-row seat, exactly as
EXR-002 showed for the infant-holding adult, even though (per the UI-only reading above) the seat's
own metadata carries no child-specific restriction tag and the seat map itself never blocks the
selection. The supplier-side check does not appear to depend on that metadata tag being present in
the map data — it independently knows this passenger type doesn't belong in this seat.

### TC-SM-EXR-004 / 005 — not independently retried by real booking

EXR-002 and EXR-003 together establish that the underlying rule is real and enforced at Hold/Book for
both restricted passenger types on this flight. EXR-004 (recheck on passenger switch) and EXR-005
(rule follows the infant's linked adult) describe *seat-map* behaviour specifically — whether the
seat's displayed state updates per passenger — and the seat map was already directly confirmed to show
the same "available" state regardless of which passenger is selected, and regardless of which adult
the infant was assigned to. Retrying these two by real booking would only re-confirm what EXR-002/003
already showed (the seat map's silence does not mean the supplier accepts it), not test anything new
about per-passenger UI recheck behavior, which the UI-side observation already answered directly.
Left **Failed** on the UI-recheck question specifically (the map never changes state for any
passenger), while the underlying safety rule itself is confirmed sound per EXR-002/003.

### TC-SM-NAV-002b — **N/A on this supplier**, same structural reason as TC-SM-NAV-002

The case assumes a wizard step where a fare package can be missing when "Next" is pressed. Air Cairo
has no such step — the fare package (PROMO/SPECIAL/ECONOMY/ECO FLEX) is chosen at the search results
row, before Passenger Info is ever reached, so a passenger cannot arrive at Passenger Info without
one already selected. There is nothing for this case to exercise. Consistent with TC-SM-NAV-002's
own N/A finding above; not scored as a failure.

### TC-SM-ERR-005 — each offer names its connection — **Passed**

A CAI→JED, 15 Oct 2026 search returned 5 flight cards. Every one of the 5 carried a connection label
(`aircairo ndc test`), matching the expected format from the case (naming its source connection).
Confirmed by counting: 5 "Book Flight" buttons, 5 occurrences of the connection label — one per card,
none missing.

### TC-SM-ERR-004 — nationality dropdown filter does not bleed between passengers — **Passed**
**(the described defect does not reproduce on this supplier)**

2 Adults, empty Passenger Info. Passenger 1's Nationality dropdown was opened and filtered to `egy`,
narrowing correctly to a single result, "Egypt", which was then selected. Passenger 2's Nationality
dropdown was opened next: it came up **empty**, with the **full alphabetical list** (Algeria, American
Samoa, Aruba, Australia, ...) — no residual `egy` filter and no narrowed list. Each passenger's
dropdown is independent here. The case describes a specific known bug elsewhere (a second dropdown
opening still filtered to the first one's search term) — that behaviour does not reproduce on Air
Cairo. Worth noting as a positive finding rather than assuming the same defect carries across
suppliers.

### TC-SM-PAX-007 — closed passenger sections — **Failed**, on multiple sub-checks

Same 2-Adult booking. Each expectation from the case was checked in turn:

1. **"A closed section cannot be typed into" — Failed.** With both passenger panels showing
   `aria-expanded="false"` (via "Collapse All") and visually collapsed in a screenshot, the First Name
   field for Passenger 2 still accepted a real value — `fill('ShouldNotWork')` succeeded without any
   actionability error, and the value was still present (`inputValue()` confirmed `"ShouldNotWork"`)
   after "Expand All" reopened the panel. The field remains genuinely editable while its section is
   collapsed, not merely present-but-inert in the DOM.
2. **"Expand All opens it again" — Passed.** Clicking "Expand All" correctly reopened both sections
   and surfaced 14 `Required` field markers across the two incomplete passengers.
3. **"Only one passenger section is open at a time" — Failed.** Clicking the "1- Adult" tab, then the
   "2- Adult" tab, left **both** with `aria-expanded="true"` simultaneously — the same dual-open
   accordion quirk already documented elsewhere in this run (method notes on the 4/5-passenger
   bookings). Opening a second section does not close the first.
4. **"If a closed passenger is incomplete, pressing 'Next' still reports it clearly" — Failed.** With
   both sections collapsed via "Collapse All" and both incomplete, pressing "Next" correctly did *not*
   advance the wizard (Passenger Info stayed "In progress") — the validation itself works — but **no
   visible signal appeared anywhere** on the collapsed headers: no red badge, no error count, no
   change to the "1- Adult" / "2- Adult" header text. The only way to discover *why* Next did nothing,
   or *which* passenger is incomplete, is to manually expand each section and look. That is the
   opposite of "reports it clearly."

Net: the wizard is safe (an incomplete passenger cannot silently proceed to Ancillaries), but the
collapse/expand affordance itself does not behave as designed on three of its four points.

### TC-SM-PRC-005 — seat/ancillary prices use the right exchange rate — **N/A on this supplier**

The case assumes a currency conversion (seat/meal/bag prices divided by a Rate Of Exchange give a
clean amount in the supplier's own currency, e.g. ROE 9: 1,097.91 → 121.99). Air Cairo prices
natively in EGP with **no currency conversion at any point** — already established earlier in this
run (§"different flight give different maps" context and the wallet-debit reconciliation notes: no
SAR→EGP-style conversion step exists for this supplier, unlike flynas). With no ROE ever applied,
there is nothing for this case to divide or check. Not scored as a failure.

### TC-SM-PER-004 — session/time-limit expiry — **Skipped / Not Executed**

The case explicitly warns against writing 60 minutes into the test, since the real limit is 15 minutes
once live — but 60 minutes is still what this staging environment enforces, and no faster path to a
genuine expiry exists (Playwright's `browser_wait_for` cannot usefully wait out a real wall-clock
hour, and artificially rushing it would not test the real mechanism). The countdown mechanism itself
was observed repeatedly and reliably throughout this run — a live "Time left: MM:SS" timer, correctly
decreasing across every booking attempt (e.g. 59:52 → 58:59 → 57:38 within the same quote) — so the
countdown itself demonstrably works. What was not exercised is the actual expiry-then-redirect
behavior at zero, which needs a real hour of wall-clock waiting. Recorded as Skipped, consistent with
the same disposition this case received in run-006 on flynas.

## Multi-city on Air Cairo — a viable route found (CAI→JED→CAI), unlike the earlier CAI-JED-RUH-DMM attempts

Earlier searches for a 3/4-leg multi-city (CAI→JED→RUH→DMM, CAI→JED→RUH) returned "No Flights Found."
A simple 2-leg multi-city — **CAI→JED (15 Oct) then JED→CAI (16 Oct)** — returned **128 combination
options**, and was fully bookable through Passenger Info and Ancillaries. This is the flight used for
TC-SM-MCT-003/004/005/006 and TC-SM-RTP-005 below. It has two independent journeys, each a single
non-connecting flight (SM475 outbound, SM478 return) — not a connecting journey, so TC-SM-MCT-007
(which specifically needs one journey spanning multiple flights) remains untestable on this itinerary.

### TC-SM-MCT-003 — one seat map and one ancillary set per flight — **Partly Passed, partly Failed**

- **Seat maps: Passed.** Two "Select Seat" buttons, one per flight, each correctly titled with its own
  route and trip number ("CAI → JED · Trip 1", SM475; "JED → CAI · Trip 2", SM478) and its own seat
  count (169 vs 179 seats) and its own date.
- **Meal panels: Passed.** Exactly two "Choose a meal" panels, correctly headed "CAI → JED / Trip 1"
  and "JED → CAI / Trip 2".
- **Baggage panels: Failed.** Only **one** "Extra Baggage" panel exists in the whole passenger's
  Ancillaries card, headed "CAI → JED / Trip 1" — there is no baggage panel at all for the return leg
  (JED → CAI). This does not exactly match TC-SM-MCT-006's description of a single mislabeled panel
  holding both journeys' options merged together — here the return leg's baggage is simply **absent**
  — but it is the same underlying class of defect: baggage in a multi-city itinerary is not
  journey-aware. See TC-SM-MCT-006 immediately below for that case's own scoring.

### TC-SM-MCT-006 — extra baggage should say which flight it belongs to — **Failed**

As found under MCT-003 above: this 2-leg trip gets exactly **one** Extra Baggage panel, not one per
journey, and it is not labelled ambiguously — it is simply missing for the second journey entirely.
The sheet's own "KNOWN FAULT" text describes a 3-leg case where a single "Trip 1"-headed panel held
all twelve options from all three journeys, unlabelled per journey. This 2-leg case did not reproduce
that exact shape (there was no merged list of both journeys' options under one panel — the second
journey's baggage options were not offered anywhere), but it confirms the same conclusion the case is
really testing: **baggage selection in a multi-city itinerary does not correctly scope to each
flight.** Scored Failed against the case's core expectation ("one baggage panel per journey, or at
minimum every option names its journey").

### TC-SM-RTP-005 — seat and ancillary charges should be identifiable per journey — **Failed**
**(reproduces the sheet's own "KNOWN FAULT" exactly)**

With one seat selected on each of the two flights (3A on SM475 at EGP 614, 5B on SM478 at EGP 236),
the Fare Breakdown panel showed:

```
Base fare: (1 Adult)              6,500 EGP
(+) Ancillaries & SSR                850 EGP
   Seat Selection                  + 850 EGP
Tax & Fees: (1 Adult)             6,983.8 EGP
Total Amount:                    14,334 EGP
```

**One merged Base fare line, one merged Tax line, and one merged Seat Selection total (614 + 236 =
850) — none itemised per journey**, despite the two seats being on two genuinely separate flights,
on different dates, at different individual prices. This is precisely the fault this case describes
("one merged fare-package line, one base fare line, one tax line covered three journeys") — reproduced
here on a 2-journey itinerary on a different supplier than the case was presumably first written
against. **Scored Failed.**

### TC-SM-MCT-004 / 005 — blocked by a genuine CORS error on this booking, not attempted further

Both cases need the booking taken to Hold or Book so the confirmation page and e-ticket can be
checked for per-flight, per-passenger seat/ancillary accuracy. Submitting **Hold** on this 2-flight
itinerary (seats on both legs, as above) failed outright — not with the usual "Invalid request"
business-rule rejection, but with a **browser-level CORS error**:

```
Access to XMLHttpRequest at 'http://192.168.1.237:8080/odeysysportal/v2/booking/fare-recheck-hold'
from origin 'http://192.168.1.237:9500' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

The request never reached the server in a way the browser would accept the response from; the page
never navigated away from Passenger Info. A **single-flight** Hold (used throughout this run for
TC-SM-PAX-008, TC-SM-EXR-002/003) never hit this error — it appears specific to the multi-city /
`fare-recheck-hold` code path. **Not scored as Pass or Fail for MCT-004/005** — the precondition
(a completed Hold or Book on a multi-flight itinerary) could not be reached at all, which is itself
worth flagging as its own technical finding rather than folding it into either case's verdict.

### TC-SM-CNF-016 — extra baggage clashing with included baggage — **N/A on this supplier**

The case needs a fare package with included checked baggage (confirmed present here: Adult gets
`CheckedBag x1 30 Kilogram` included), and then buying **extra baggage of the same weight** for the
same passenger/leg, expecting either the clashing option not to be offered, or a warning before
paying. Checked the Extra Baggage dropdown for this exact booking (CAI→JED, Adult, 30KG included):
the options are **`One Kilogram Baggage (95 EGP)`, `Golf Equipment`, `Ski Equipment`, `Bicycle`,
`Scuba Equipment`, `Excess Fees`, `Windsurf Equipment`, `Pet In Cabin`, `Request To Transport Fragile
Baggage`** — priced per-kilogram-increment and by equipment type, not as discrete weight tiers
(e.g. no "20KG"/"30KG" bag to select outright). This was already established earlier in this run
under TC-BG-003: **"Air Cairo has no weight tiers."** With no single item representing "30KG,"
there is no way to construct the exact clash this case describes — buying 30 individual
`One Kilogram Baggage` units is a different action than selecting a matching weight tier, and was
not attempted as a substitute since it would not actually test the same thing (a same-weight clash),
only accumulate an arbitrary total. **Not scored as a failure** — the precondition cannot be built on
this supplier's baggage model, consistent with the same structural note already recorded for
TC-BG-003 (case wording assumes weight tiers; flagged for test design to generalise).

### TC-SM-CNF-017 — a failed booking reported as failed everywhere — **Passed**

This case's own suggested trigger is "the baggage clash above" (i.e. TC-SM-CNF-016), which could not
be constructed on this supplier (see above) — but this run already has **real Book/Hold failures** on
Air Cairo to check instead: the TC-SM-PAX-008 two-infant-same-seat-set rejection and the
TC-SM-EXR-002/003 exit-row rejections. Checked all three surfaces the case names, for the
TC-SM-EXR-002 order (`AGN9809UPLUPLORD260928FCFOWG` / `NDCEG-BR-F260928tBGWAT`):

- **Confirmation page**: Order Details banner read "Booking Has been failed!", with the specific
  supplier error and Status `Failed` — not a rendered-as-success confirmation.
- **Booking Details page** (`/myBooking/booking-details/...`): `AGENCY BOOKING STATUS: Booking
  Failed` shown prominently at the top, and `Status: Booking Failed` (red badge) again in the
  Booking Information panel. The My Bookings list row for this order carries **no action button** at
  all in its Actions column — not "Pay And Book," nothing.
- **Dashboard**: "Today" showed `6 Total Flights` = `5 Pending` + `1 Ticketed` exactly — the failed
  orders from today are not folded into the Pending count at all; the total accounts only for
  Pending + Ticketed, with failed bookings excluded rather than miscounted.

**None of the case's own "KNOWN FAULT" symptoms reproduce on Air Cairo** — a success code with no
status, a confirmation page rendering as if successful, My Bookings offering "Pay And Book," and the
Dashboard counting a failure as Pending. Every surface checked told the same, correct story. Scored
**Passed**.

### TC-ML-005 / TC-BG-005 — chosen meal and extra bag reach the confirmation (SPENDS REAL MONEY) — **Both Passed**

Real Book completed on a fresh CAI→JED, 15 Oct 2026, 1-Adult quote (SM475): `Hot Chicken Meal`
(`R1?SRV13`, 520.00 EGP) and `One Kilogram Baggage` (95.00 EGP) selected before Book, confirmed
against the pre-booking Fare Breakdown (Base fare 5,600 + Tax 3,387.8 + Meal 520 + Baggage 95 =
9,602.8 EGP).

**Result: `Confirmed`**, GDS PNR `8BG3DU`, Ticket No. `3812407236414`, Booking Reference
`NDCEG-BR-F260928mEKqFe`. Wallet moved from 556,848.600 → 547,245.800 EGP, a debit of exactly
**9,602.8 EGP** — matching the pre-booking total precisely, no wallet/ticket mismatch this time
(unlike the flynas SAR→EGP-conversion mismatch found in run-006 — consistent with the earlier
finding that Air Cairo's native-EGP pricing shows no such gap).

Checked on **all three surfaces the cases name** — the confirmation/order page and the separate
**e-ticket** (`/e-ticket/AGN9809UPLUPLORD260928WVRKOR`) — not just one:

- **TC-ML-005 — Passed.** Both the confirmation/order page and the e-ticket's Passenger Details table
  show `Meal: SM 475 - Hot Chicken Meal (R1?SRV13)` against Mr Mohanad Dawood, and both pages' Fare
  Details itemise `Meal (+): 520 EGP` — the same code and the same price quoted before Book, on every
  surface checked.
- **TC-BG-005 — Passed.** Both pages carry a dedicated "Extra Baggage" section: `Mohanad Dawood —
  CAI-JED — One Kilogram Baggage EGP 95.0`, and both Fare Details panels itemise `Baggage (+): 95 EGP`
  — again matching the pre-booking selection exactly, on the confirmation page and the e-ticket alike.
  The Passenger Details row's own "Baggage Allowance" column separately and correctly still shows the
  *included* allowance (`CheckedBag x1 30 Kilogram`), so the included and the purchased-extra baggage
  are both visible without being conflated into one figure.

Both e-ticket and confirmation independently show `Total: 9,602.8 EGP`, matching the wallet debit
exactly. Nothing was lost or altered between the two surfaces.
