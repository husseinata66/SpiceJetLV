# Seat Map Run — What the Runner Does, Step by Step

Generic for **any Ancillaries supplier** and for both **Admin** and **Portal**. Nothing here is specific to one supplier or run. Where suppliers differ, the difference comes from three places, never from the runner's code paths:

- the supplier's **capabilities** (Hold, Pay after Hold, Meal, Baggage, Seat, Bundle), which the capability gate turns into Excluded cases;
- the supplier's overlay in `runner/settings.local.json` (route, credential label, accepted seat features, exit-seat words, case moves);
- **human decisions** recorded in the run's `ApprovedScope.md`.

Every group is one command:
`node platform_core/tools/supplier_feature_runner/cli.js run --run <run> --group <NN> --headless|--headed --app Admin|Portal`

Sources: the group scripts in `runner/group01.js` … `group17.js` and the test sheet `TestCases_AncillariesSeatMap.xlsx`.

---

## Part A — Getting to the booking (every group)

1. **Open the saved session.** The human logs in once and the session is reused for the whole run. An expired session stops the group with "Not logged in", and its cases are not judged.
2. **Admin only: choose who is booking.** Branch → Agency → Agent, from the settings.
3. **Search for flights.** Route, date and trip type come from the settings. The **cabin is Economy**. Passengers come from the group's setup (for example 1 adult + 1 child + 1 infant, or the mix an exit-seat group needs).
4. **Wait for the result cards.** The runner looks for a card from the run's credential. If the search fails or returns nothing, it retries up to 3 times. With still no card, the group stops and its cases are **Blocked** with the reason.
5. **Open the card.** If a *Price Update* pop-up appears, it is accepted (the pop-up itself is checked in B2).
6. **Passenger step.** The script types fake passenger data (names, dates of birth by age rule, document numbers, nationality) in one section per passenger: Adult, Child, Infant.
7. **Fare package step, if the supplier shows one.** The runner reads the package names and selects one.
8. **Accept terms and press Next** to open the ancillaries page (step 2).

---

## Part B — Before the ancillaries page

| # | Step | What it does and checks |
|---|---|---|
| B1 | **Search and pick the connection** | Reads every result card and picks the run's connection. Checks the error cases (ERR-001, ERR-005). |
| B2 | **Price Update pop-up** | When the price changed, reads the previous and new price and that Cancel and Accept are there. Cancel returns to results (FRC-003). Accept shows the new price everywhere (FRC-002). When this pop-up appears is supplier-specific. |
| B3 | **Step 1 before anything is filled** | The step indicator and the unavailable seat button (NAV-001). |
| B4 | **Passengers from saved profiles** | Only adults can be picked from profiles, not child or infant (PAX-003). |
| B5 | **Next without a fare package** | Presses Next with no package chosen. Checks the message and that step 2 is not reached (NAV-002, NAV-002b). Not applicable when the supplier shows no package step. |
| B6 | **Passenger fields** | Title → gender mapping and the locked gender (GEN-003, GEN-005), dropdown filtering (ERR-004), Collapse All / Expand All (PAX-007). |

---

## Part C — Fare packages (when the supplier offers them)

1. **List the packages.** "Select Bundle" is shown only when packages exist (BND-006).
2. **Select each package in turn** and read what it includes (seats, meals, baggage). Each must have its own name and output (BND-004).
3. **Open step 2 with each package** and check that each opens a working seat map (BND-004).
4. **Package-dependent cases** (every seat free, a meal included, "No meal" versus a meal: BND-002, BND-003, BND-005, ML-004, PRC-001) need a premise that differs per supplier. When the supplier's packages do not carry that premise, the case is **Not applicable**, not Failed.
5. **A package never decides whether the seat button, the meal dropdown or the baggage dropdown appears.** It only changes the price.

---

## Part D — Ancillaries page: the seat map

### D0. Capability cases on step 2 (NAV-006, ML-006, BG-006)

- On opening step 2, the runner looks for the seat button and a "Seat Selection" price line (NAV-006), the "Choose a meal" dropdown and a "Meal Preference" line (ML-006), and the "Choose a baggage" dropdown and an "Extra Baggage" line (BG-006).
- Each case says: *a supplier recorded as **Not Supported** for that capability shows none of these.* The sheet marks them `Requires: Not Seat / Not Meal / Not Baggage`.
- They are supplier-capability cases, not fare-package cases. For a supplier that **does** sell seats, the seat button **always appears** on step 2, whatever package was chosen. The same holds for meals and baggage.
- When the supplier supports the capability, the capability gate **excludes** the case.

Press **Seat selection** for the first passenger to open the map.

### D1. What the map shows (RND, STA, NAV-003, PRC-002)

- Counts the seats drawn against the SEATS figure in the left panel (RND-001).
- Reads every seat: number, state (Available, Occupied, Blocked, Selected), features and price.
- Checks that every seat has a state and that every selectable seat shows a price (PRC-002). A "Chargeable seat" tag is not required if the price is shown.
- Checks the layout matches the aircraft (STA-005).
- Reads every feature word. Words in the supplier's accepted list pass. An unknown word is reported (STA-004).
- Finds the exit seats, using the supplier's exit-seat words, and checks the holder rule is shown (STA-006).
- Connecting trips: **one seat map per leg**, so four legs mean four maps (NAV-003).

### D2. Taken seats, women-only seats, the information box (STA-002, STA-007, SEL-001, SEL-003)

- A taken seat must say Blocked, be disabled, and not change the counter (STA-002).
- Women-only seats: checks the male and female passenger behaviour. When the flight has none, the cases are **Excluded** (group 03).
- Opens the information box and checks it matches the seat (SEL-003).
- Confirming with no seat chosen shows "Continue without seats" (SEL-001).

### D3. Choosing, moving and clearing seats (SEL-002, SEL-006 to SEL-008, PAX-004, MPX, NAV-005)

1. Picks a seat for passenger 1. The button reads "Book <seat> for <name>", the counter goes to 1 and the card shows the seat.
2. Moves to passenger 2 and picks another seat.
3. Moves a passenger to a different seat. The old seat becomes free again.
4. Clears the seats. The counters and the price line return to the start.
5. Closes the map without confirming. Nothing is kept (NAV-005).

### D4. Confirming seats (SEL-009, SEL-010, PAX-001, PER-007)

1. Confirms the seats and checks the passenger card, the "Change Seats" button and the "Seat N more" text. **"Change Seats" only appears when every passenger has a seat.**
2. Checks the infant gets no seat of its own.
3. Checks the price breakdown equals the page total.

### D5. Paid seats: prices, rapid clicks, breakdown (PRC-003, PRC-004, NEG-003, PER-002)

- Picks a priced seat. The Seat Selection line equals the seat price and the total rises by that amount.
- Several seats: the line equals the sum of their prices.
- Rapid clicks on one seat: it is held exactly once.
- Going back and forward keeps the seat and the price.

---

## Part E — Ancillaries page: meals and baggage

### E1. Meals

1. Counts the "Choose a meal" dropdowns: one per passenger who can have a meal.
2. Opens each passenger's dropdown and reads each option as a code and a price (0 means included) (ML-001).
3. **Add and remove:** picks a paid meal, checks the total rises by its price and the Meal line shows it, removes it, and checks both return (ML-003). Not applicable when no paid meal is offered.
4. **Infant:** has no meal dropdown (ML-002).

### E2. Baggage

1. Counts the "Choose a baggage" dropdowns and reads each passenger's options. Both price formats are read ("Name - ( 120 EGP )" and "+ 5 kg Xcess Baggage 1,875 EGP").
2. Checks every passenger has a list and every option has a price (BG-001). Options with no stated weight are listed as a note.
3. **Change the weight:** picks a lighter and a heavier bag and checks the total and the Extra Baggage line follow (BG-003). Not applicable when fewer than two weighed bags are offered.
4. **Infant:** has no extra baggage (BG-002).

---

## Part F — Moving around the booking

| Step | What it does |
|---|---|
| Back a step without editing | Goes to step 1 and back. Seats, price lines and total are unchanged, and the button reads "Change Seats" (PER-001). |
| Back a step and edit a passenger | Edits a passenger, returns, and checks what is kept (CNF-018). |
| Changing the fare package | Needs one package with every seat included and one without. Otherwise not applicable (BND-002). |
| The accepted price everywhere | After accepting a new price, the old price appears nowhere (FRC-005). |

---

## Part G — The groups

| Group | What it covers |
|---|---|
| **01** | Default: one-way, 1 adult + 1 child + 1 infant, Economy. Parts B–F. |
| **03** | Women-only seats. Needs a flight that has them; otherwise Excluded. |
| **04** | An adult alone can take an exit seat (EXR-001). |
| **05** | Adult + child. Exit seat as the adult, then the child, then the adult again (EXR-003, EXR-004), then meals and baggage per passenger. |
| **06** | Adult holding an infant cannot take an exit seat (EXR-002). The infant gets no meal and no extra baggage (ML-002, BG-002). |
| **07** | The exit-row refusal follows the infant's linked adult (EXR-005). |
| **08** | Two infant-holding adults cannot share one seat set (PAX-008). |
| **09** | Round trip: a package per journey, **one seat map per leg**, seats on one journey never touch the other (RTP, RND-010, MPX-006), and the Price Update pop-up when the supplier shows it. |
| **10, 11** | Multi-city. Skipped when the supplier has no multi-city trip type. |
| **12** | A credential in a non-EGP currency, every price checked against the ROE. Needs the settings. |
| **13** | Wallet and My Bookings: a baseline, then a broken booking link (NEG-006), and that leaving before Book creates nothing (CNF-015). |
| **14–17** | Assisted, headed only. The runner builds the booking up to Book, Hold or Pay and stops with a red banner. **The human presses the button.** The runner then does the read-only checks. |

The runner never presses Book, Hold or Pay itself.

**Exit seats** are never judged from the seat map alone. The rule is enforced at booking, so a case that depends on it is **Inconclusive** until an assisted booking attempt settles it.

---

## Part H — After each group

1. **Classify every case:** Passed, Failed, Blocked, Inconclusive, Not applicable or Excluded. A failure gets a screenshot with the problem outlined in red and a reason listing the seat numbers or values.
2. **Write the group log** to `automation_execution/GroupResults_Group<NN>_….md`.
3. **At the end,** the report model is built from the latest valid log of each group and the HTML report is generated with `report_builder`.
