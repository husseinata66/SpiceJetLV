# Ancillaries & Seat Map — domain reference

**What this file is.** A plain-language explanation of how bundles, meals, extra baggage and seat
selection behave as a *business domain* in this system: what each concept means, what governs it, what
the rules are, and where behaviour is confirmed versus still open.

**What this file is not.** It contains no selectors, no markup, no API detail and no automation
instructions. Those mechanics live in `ANCILLARIES-SEATMAP-REFERENCE-2026-09-26.md`. Numbered business
rules and open questions are owned by `BUSINESS_DOMAIN.md` (§2.7) and are only referenced here.

**Where the knowledge comes from.** Live walkthroughs of the booking wizard, captured 2026-09-09,
re-verified 2026-09-15, and extended by the 2026-09-17 business answers, the 2026-09-19 booking runs and
the 2026-09-26 review. The worked example throughout is flynas `XY568`, CAI → JED, 1 adult + 1 child +
1 infant, Economy — because flynas is the Supplier currently under test. **The rules are Feature-level
and apply to every Supplier**, except where a rule is marked Supplier-specific (today: only the
female-designated seats, §6).

> **Staging caveat** (open questions OQ-21, OQ-25): every seat-map, cabin and ancillary-price
> observation here comes from a staging supplier feed that is known to misreport some data. Treat
> anything below as staging behaviour until a production-credential run confirms it.

> **Money caveat**: completing a booking debits the agency wallet for real. Nothing in this document
> should be exercised past the payment step outside a sanctioned booking window.

---

## 1. Where ancillaries sit in the booking journey

After a flight is chosen from the search results, the agent enters a two-step booking wizard:

| Step | What it covers |
|---|---|
| **1 — Passenger Info and Bundles** | passenger identities and the fare bundle chosen for each journey |
| **2 — Ancillaries** | meal preference, extra baggage and seat selection — the final step before payment |

The ordering is deliberate and is itself a business rule: **a bundle must be committed before any
ancillary can be chosen**, because the bundle decides what the passenger is already entitled to and
therefore what is left to sell. Attempting to advance without a bundle is refused.

Two consequences of this sequencing matter for anyone designing tests or training agents:

- **Going back to step 1 discards every ancillary.** Meals, bags and seats are all cleared and must be
  re-chosen; the bundle itself survives. In one observed run the net payable fell from 62,038 to 43,700
  (base + tax + bundles only) purely from stepping back.
- **Passenger edits are destructive to linkage.** Renaming an adult silently clears the infant's
  "assigned to" adult link, which is only caught later at validation. Passenger details should be
  finalised *before* ancillaries are selected, not after.

### Passenger data that drives seat eligibility

Three pieces of passenger data decide what a traveller may be offered:

- **Title** — this is the system's only lever for gender. `Mr` yields Male; **`Ms` and `Mrs` both yield
  Female**. Gender itself is read-only and derived; it cannot be set directly. The same title list is
  offered for adults and children, which is intended.
- **Passenger type** — adult, child or infant. Type governs exclusion from seating entirely (infants)
  and from exit rows (children).
- **The infant-to-adult assignment** — every infant **must** be attached to a specific adult; the choice is
  mandatory and offers adults only, never another child. That link decides
  which adult counts as an infant-holder, which in turn governs exit-row eligibility (rule 36) and the
  seat-set restriction (rule 62).

---

## 2. Bundles — the entitlement layer

A **bundle** is a packaged fare upgrade sold per journey. It is not an ancillary in itself; it is the
entitlement baseline against which ancillaries are sold. Bundle names observed include `Value`,
`Value Flex`, `Plus`, `Light`, `Light Flex`, `Light Super Flex` and `Premium`.

A bundle typically packages together:

- a **checked-baggage allowance** (e.g. 30 KG or 40 KG, carried as an airline baggage service code),
- sometimes a **carry-on allowance** and a **meal**,
- a **seat-selection entitlement** — the decisive field, expressed as `All seats`, `Standard` or
  `Premium`, which determines which seats the traveller is offered and at what price,
- **change and cancellation terms** (free change, a fixed change fee, cancellation barred, or a
  cancellation fee),
- a **price per passenger type**, where infants are typically charged zero.

### What is true about bundles at the domain level

- **Bundles are sold per journey, not per segment.** A journey that connects through an intermediate
  stop still buys one bundle, and every segment of that journey inherits it. A round trip buys two; a
  three-leg multi-city buys three. **Mixing different bundles across journeys is permitted**, and that
  is the situation that produces the most interesting seat-pricing behaviour (see §5.6).
- **The catalogue is per journey and can differ in size.** On one multi-city booking, two journeys
  offered four bundles while the middle journey offered six. There is no fixed bundle list.
- **Bundle choice materially moves the price.** Switching from the baseline to `Plus` on one observed
  booking moved net payable from 3,440 to 6,092 EGP.
- **The offer is signed and time-limited.** Internally a chosen bundle carries a bundle code, an expiry
  and a signature. Ancillaries are bound to that signed offer, so an expired or replaced offer
  invalidates what was built on top of it.
- **Bundle charges are merged in the fare breakdown** (defect V6-10): three journeys with three
  different bundles are presented as a single combined bundle-fare line, not one line per journey. The
  total is correct; the attribution is not visible.

Historical note: a run on 2026-09-09 showed a blank bundle name and a duplicated `Value` entry. Neither
reproduces since 2026-09-15 — if either returns, it is a regression.

---

## 3. The three ancillary types

Step 2 presents three independent ancillary types, grouped per passenger and per direction.

| Ancillary | What it is | Observed range |
|---|---|---|
| **Meal preference** | one meal per eligible passenger per segment | seafood, `PRML`, `BB Meal` at 273 EGP each; a free meal option at 0 EGP |
| **Extra baggage** | additional checked weight over the bundle allowance | 10 KG / 20 KG / 25 KG / 30 KG, roughly 1,914–8,065 EGP, presented unsorted |
| **Seat selection** | a specific seat on a specific segment | opens the seat map (§5) |

Airline service codes seen carried through the offer include `SPEQ`, `SFML`, `PRML`, `FALD`, `BIKE`,
`BBML`, `XBAG`, `PDBG`, `FRAG` and `CBBG`.

### Infants are excluded entirely

An infant receives **no ancillary block at all** — not an empty one. On a booking of 1 adult + 1 child +
1 infant, only two ancillary groups appear and the seat counter reads "0 of 2". This is rules 30 and 58,
and it is confirmed behaviour.

### A segment has three seating conditions

Seat selection on any one segment is in one of three states: **nobody seated**, **partly seated** (some
but not all eligible travellers have a seat), or **fully seated**. The partly-seated condition is real
and reachable, because seats are optional and a traveller can deliberately be left without one. Any
count of "segments needing seats" that only recognises the empty and complete conditions will
under-count.

Once seats are confirmed, the step shows a per-traveller summary of seat and price.

---

## 4. Units — journey versus segment

This is the single most commonly mis-modelled part of the domain. The controls do not all operate at
the same granularity:

| Concept | Unit | On a 3-journey trip whose middle journey connects (4 segments total) |
|---|---|---|
| Bundle | **journey** | 3 |
| Seat map | **segment** | 4 |
| Included-baggage display | **segment** | 4 |
| Meal preference | **segment × eligible passenger** | 8 (4 segments × 2 passengers) |
| Extra baggage | **one control for the whole trip** | 1 |

A journey is a directional trip (outbound, return, or one leg of a multi-city). A segment is a single
flight. **A connecting journey produces more seat maps than bundles** — one observed booking had 3
bundles and 4 seat maps. Seat maps are labelled by trip and, where a journey connects, by leg.

Any assumption of "one seat map per journey" breaks as soon as a journey connects. This is confirmed by
rules 14, 15 and 55.

---

## 5. The seat map

### 5.1 What it represents

The seat map is the airline's live seat inventory **for one specific flight**, filtered through the
fare and bundle that was purchased, and then filtered again through the identity of the traveller
currently being seated. All three filters matter, and confusing them is the main source of false
defect reports.

One seat map exists **per segment**, and every seat-eligible traveller on that segment is seated inside
that same map by switching between them.

### 5.2 The map is flight-specific and nothing about it is invariant

> Aircraft type, seat count, row count, columns per row (`2-2`, `3-3`, `3-4-3` …), cabin mix, number of
> decks, zone naming, and the distribution of blocked, chargeable, exit-row and female-designated seats
> **all vary per flight**. No row number, seat number, seat total or zone identifier is a property of
> the system; each is a property of the flight that was chosen.

This is business rule 25 and it is binding on test design: expectations must be derived from the map
that was actually returned, never asserted against a remembered layout.

One observed example, offered as an illustration and not a specification: flynas `XY568` on an A320NEO
carried 29 rows of 6 seats in an `A B C | D E F` arrangement, 174 seats, all Economy, on a single main
deck, divided into four zones — rows 1–7, 8–15, 16–22 and 23–29.

### 5.3 Seat states

Every seat is in exactly one availability state, and separately may carry attributes.

| State | Meaning |
|---|---|
| **Available free** | bookable by the active traveller at no charge |
| **Available paid** | bookable by the active traveller for a stated price |
| **Blocked** | not bookable by anyone — crew, operational or inventory hold |
| **Not offered** | not bookable *by this particular traveller*, though possibly bookable by another |
| **Held by another traveller** | already assigned to someone else on the same booking |

The distinction between **Blocked** and **Not offered** is the important one. *Blocked* is a property of
the seat; *not offered* is a property of the pairing of seat and traveller. The same seat can be "not
offered" to one passenger on the booking and freely available to another a moment later.

"Not offered" also appears at **zone** level, where it carries a different meaning entirely (rule 48):
at zone level it means **the cabin is outside the purchased fare**, not that the traveller is
ineligible. The two must be distinguished by where the statement appears, not by its wording.

When a seat is held by another traveller on the same booking, the system names that traveller. Business
originally answered that this case should read simply "blocked" (rule 49), but the named behaviour is
both what the system does and the better behaviour — it is treated as expected, and a bare "blocked"
with no holder named would be a regression.

### 5.4 Eligibility is computed per passenger, not per seat

The most important structural fact about the seat map: for every seat, the system holds **an overall
state and a separate state for each passenger on the booking**. A seat can be overall "available paid"
while simultaneously being barred for one passenger and open to another.

Two consequences follow:

- **Seat counts depend on whose view you are counting from.** On the 2026-09-15 run of 174 seats, the
  traveller-independent view showed 96 free / 60 paid / 18 blocked; the same map viewed as the male
  adult showed 96 free / 54 paid / 24 unavailable, because six female-designated seats moved buckets.
  Both sum to 174. Mixing the two views double-counts those six seats.
- **The invariant worth testing is the identity, not the number**: the seat total the map states equals
  the number of seats it presents, which equals the sum of the state buckets — counted consistently from
  one point of view.

A disagreement between the state the system has computed for a passenger and the state the map actually
presents to that passenger is itself a defect.

### 5.5 Seat pricing

Seat pricing is a per-flight, per-bundle property, and a single aircraft routinely carries **several
price tiers at once**. The 2026-09-15 run showed four simultaneously: 96 free seats, 36 at 422.91 EGP,
18 at 1,097.91 EGP, and row 13's female-designated seats at 197.91 EGP.

- **Zones advertise a price range, not a price** — "from EGP 422.91", "Free – EGP 422.91", "all seats
  free". The band is a property of the zone, not of any row inside it (rule 44b), and free and paid
  seats mix freely within one zone. Price belongs to the individual seat.
- **A seat marked as chargeable must always carry a price** (rule 44, ruled by business on 2026-09-17).
  A seat tagged chargeable that presents as free is a **defect**, not a promotion. This was observed on
  the `Plus` bundle on 2026-09-09: the seat read chargeable and free, no seat charge was reported, and
  net payable did not move.
- **The chargeable attribute belongs to the flight, not the bundle** (rule 44a). It was absent from the
  entire 2026-09-15 map and present on 2026-09-17 under the same bundle. Any statement about seat
  pricing must name the bundle it was observed under.
- **Seats bill separately from bundles.** A confirmed seat charge lands in its own line in the fare
  breakdown and is never folded into the bundle fare.

### 5.6 Cabin and bundle change availability drastically

The same flight, the same aircraft and the same 174 seats produced radically different maps under
different fares:

| | Economy fare, `Plus` bundle | Business fare, `Premium` bundle |
|---|---|---|
| Seats available | 161 | **4** (the front row only) |
| Seats unavailable | 7 | 164 |
| Zones | all free | front zone free; the three rear zones **not offered** |
| Row 1 | entirely blocked | the only bookable row — and its two middle seats (`1B`, `1E`) are blocked, leaving a deliberate 2×2 Business arrangement |
| Bundles offered | 4 | 1 |
| Meals offered | three paid options plus a free one | the free option only |

**Four bookable seats out of 174 can be entirely correct.** A Business fare is entitled to the front
zone only; the zones behind it hold Economy seats that the fare does not buy (rule 51). This must never
be raised as an availability defect without first checking the cabin entitlement.

Separately: both runs above labelled everything as Economy, including on the Business fare. That is a
**staging-data artifact** (OQ-25), not a system defect, and should not be raised from this environment.
The two-cabin *structure* is observable; only the *label* is wrong.

Because bundles are per journey, **one booking can carry several seat-pricing profiles at once**. A
2026-09-19 multi-city booking produced four in a single order:

| Segment | Bundle | Seats | Profile |
|---|---|---|---|
| CAI → JED | `Value` | 174 | 21 blocked, 17 at 1,668, 35 at 642, 95 free, 6 female-designated |
| JED → DMM | `Plus` | 180 | 25 blocked, 155 free — no paid tier, no female-designated seats |
| DMM → RUH | `Plus` | 172 | 17 blocked, 149 free, 6 female-designated and free |
| RUH → CAI | `Light Super Flex` | 174 | 18 blocked, 18 at 1,668, 36 at 642, 96 at 232 — **no free seats at all** |

`Light Super Flex` is the only bundle observed where no seat is free. A free tier cannot be assumed to
exist.

Seat state does **not** leak between segments. After a seat was confirmed on leg 1, leg 2 opened with
nothing selected, on a different aircraft with a different seat count, and the same seat number was
freely available there.

### 5.7 Seat attributes

Independently of availability, a seat may carry descriptive attributes that a traveller chooses on:

**Window**, **aisle**, **middle**, **leg space**, **exit and emergency exit**, **chargeable**, and
**female-designated**. Seats also state their row, their side of the aircraft and their zone.

Attributes are flight-specific like everything else. One observed distribution: row 1 leg-space seats
blocked; rows 5–10 chargeable; rows 11–12 exit and leg space; row 13 female-designated; columns A and F
window, C and D aisle, B and E middle with no attribute.

One caution: the descriptive text the system emits labels every seat as being in the centre block,
including window seats. It therefore **does not identify which block of seats a seat belongs to** —
which matters for the seat-set rule in §6.

### 5.8 Choosing a seat is deliberate, in two stages

Selecting a seat is **not** a single action, and this is a business behaviour rather than an interface
quirk:

1. **Inspecting** a seat opens its detail view — status, price, cabin and deck, where it sits relative
   to nose and tail, its block and side, its attributes, and its position within its zone. Inspecting
   assigns nothing.
2. **Assigning** the inspected seat to the named active traveller is a separate, explicit confirmation.
3. **Committing** the map closes it and writes the selections back to the booking.

On assignment, the seat counter advances, the traveller's card shows the seat and its price, and the
map automatically moves on to the next traveller who still needs a seat. The commit action reflects
progress — nothing assigned, some assigned, or all assigned — and a "clear all seats" action is
available throughout. **Seats are optional**: the step can be completed with none assigned.

**A blocked seat can still be inspected.** Its detail view opens and states plainly that the seat is
blocked; the assign action is present but disabled and relabelled as unavailable. No error is raised,
and any existing assignment for that traveller is retained.

**Seats are not held at the moment of selection** (rule 46). Two agents can both confirm the same seat;
the contention is only resolved at payment, where one succeeds and the other fails with a
seat-already-taken message. This is only testable inside a sanctioned booking window.

---

## 6. Passenger eligibility rules

Seat eligibility is decided per passenger from passenger type, title-derived gender, the infant-to-adult
link, and — for the seat-set rule — the seats already taken on that segment. Business meaning is owned
by `BUSINESS_DOMAIN.md` rules 30–37, 40, 50, 58 and 62.

**Scope (human decision, Mohanad Dawood, 2026-09-27):** these rules apply to **every Supplier** that
offers seat selection, not only flynas. The one exception is **female-designated (ladies-only) seats**,
which are Supplier-specific: test them only where that Supplier's seat map actually offers them. flynas
appears throughout this document only because it is the Supplier currently under test.

| Rule | Scope | Who it applies to | Expected behaviour | Status |
|---|---|---|---|---|
| Infants excluded (30, 58) | All Suppliers | infants | no seat, no meal, no baggage block; excluded from the seat-count denominator | ✅ confirmed |
| Female-designated seats (40, 50) | **Supplier-specific** (flynas today) | male adults and male children | seat is not offered to them; open to female travellers | ✅ confirmed |
| No exit row for children (37, 50) | All Suppliers | children | not blocked in the seat map; the airline rejects the booking if a child takes an open exit seat | Accepted as supplier-enforced at booking (human decision 2026-09-27); not verified by a completed booking |
| No exit row for infant-holders (36) | All Suppliers | adults with an infant assigned | not blocked in the seat map; the airline rejects the booking if an infant-holder takes an open exit seat | Accepted as supplier-enforced at booking (human decision 2026-09-27); not verified by a completed booking — see note below |
| Seat sets (62) | All Suppliers | two or more adults each holding an infant | must sit in different seat sets | Not blocked in the seat map — accepted as supplier-enforced at booking (human decision 2026-09-27); not verified by a completed booking (`TC-SM-PAX-008`, flynas KSA) |

**Note on rules 36/37, from run-006 (2026-09-27, human decision, Mohanad Dawood, 2026-09-27):** the seat map does not apply these
rules per passenger. Whether exit seats show open or blocked depends on **the flight's inventory** — live
flynas.com blocked rows 11–12 for an adult with no infant as well. When an exit seat is open and an
infant-holder or a child takes it, the airline rejects the booking. (An earlier reading of this as a
"party-wide" rule was wrong and is withdrawn.)

### Female-designated seating

The clearest confirmed demonstration of per-passenger eligibility. On the same six seats, with only the
active traveller changed: the male adult was told the seats were female-designated and not offered to
him; the female child was offered the same seats at 197.91 EGP. Re-confirmed on 2026-09-19 at a
different price, and on a `Plus` segment the same row was free rather than paid.

**Title is the test-data lever** — `Ms` or `Mrs` qualifies a traveller as female, `Mr` does not.

### Exit rows cannot currently be verified

On 2026-09-19 the exit rows were barred for **every** passenger, which makes a child-specific or
infant-holder-specific bar indistinguishable from a general block. A 2026-09-09 run with a lone adult
who held no infant saw the same rows freely available, which is the permitted control case. The
per-passenger mechanism demonstrably works — row 13 proves it — so once inventory opens the exit rows,
the expectation is that **only** the child's and the infant-holder's eligibility is withdrawn.
*(Superseded 2026-09-27: the UI does not withdraw it at all — the airline rejects the booking instead. See
the note on rules 36/37 above.)*

### Rule 62 — infant-holding adults cannot share a seat set

A **seat set** is the group of three adjacent seats in one row between an aisle and the cabin wall. A
`3-3` row therefore holds two sets. When two or more adults each hold an infant, **each must sit in a
different set**, so that two infants are never in the same block of three.

- Permitted: two infant-holders in `5A` and `5D` (different sets), or in `5A` and `6A` — a set never
  spans rows.
- Barred: `5A` and `5C`, which are in the same set.
- Adults without an infant, and children, are not restricted by this rule.

The rule is **relative to seats already chosen**: seating the first infant-holder should immediately
withdraw the remaining seats of that set from the second infant-holder, and leave every other seat
unchanged. Eligibility that is not re-evaluated after an assignment would be a defect.

**Observed 2026-09-27 (`TC-SM-PAX-008`, run-006 §3.11): the seat map does not enforce it.** On a `3-3`
row (5A/5B/5C, 5D/5E/5F), seating the first infant-holder at `5A` left `5B` and `5C` still `available`
for the second infant-holder. `5B` was assigned with no warning, and "Confirm N seats" reached the payment
step. **Accepted as supplier-enforced at booking** (human decision, Mohanad Dawood, 2026-09-27) — the
same as the exit rows: the Portal does not block it, the airline rejects the booking. **Not verified by
a completed booking** — Book was not pressed on this run.

Still open:

- how sets are defined on layouts that are not three-per-block, such as `2-2` or `3-4-3`;
- the airline's rejection at booking, which a future run should confirm with a real booking.

---

## 6a. Known Feature-level defect — editing a passenger name discards the ancillaries

**Confirmed on two suppliers (Mohanad Dawood, 2026-09-28): this is generic, not supplier-specific.**

Returning to the passenger step, **editing any passenger's name**, and continuing forward silently
discards the seats, meals and bags already chosen. The fare lines and the ancillaries subtotal go with
them. **No warning is shown** — no toast, dialog or alert.

| | flynas (run-006) | Air Cairo (run-007) |
|---|---|---|
| Environment | `.70` | `.237` |
| Pricing | SAR → EGP at ROE 9 | EGP natively |
| Bundles | four | **none** |
| Result | seats, meals and bags wiped (61,257 → 43,700) | seat wiped (14,664 → 13,484) |

Two suppliers, two environments, two ancillary models, identical behaviour — the fault is in the
**booking wizard**, not in either integration. Recorded here so no future run re-derives it as a
supplier problem, and so a single fix is understood to cover every supplier.

Navigating back and forward **without** editing a field preserves everything (`TC-SM-PER-001` passes on
both suppliers). The trigger is specifically the edit.

## 7. How ancillaries appear in the money

Each ancillary type becomes its own line beneath an **Ancillaries & SSR** subtotal in the fare
breakdown, and the total recalculates as selections are made. A representative single-adult breakdown:

| Line | Amount |
|---|---|
| Base fare | 772 EGP |
| Ancillaries & SSR | 2,925 EGP |
| — bundle fare | 2,652 EGP |
| — meal preference | 273 EGP |
| Tax & fees | 2,668 EGP |
| **Total** | **6,365 EGP** |

Domain points:

- **Seats bill into their own line**, separate from the bundle, and that line equals the sum of the
  individual seat prices.
- **When bundle, meals, bags and seats are all zero, no ancillaries subtotal appears at all.** The line
  is not shown as zero; it is absent.
- **Multi-journey bundle charges are merged into one line** (defect V6-10) — the sum is correct, the
  per-journey attribution is not shown.

---

## 8. Two traps in extra baggage

**Multi-journey baggage is undifferentiated (defect V6-11).** On a trip of three or more journeys, the
single baggage control lists every journey's options concatenated — twelve entries on a three-leg trip —
with identical weight labels at different prices (20 KG appearing at 2,718, 1,061.91 and 3,125.70 EGP).
The booking **is** attributed to the correct journey internally; the agent simply cannot see which entry
belongs to which leg. This is a display defect, not a booking defect. It stems from the underlying data
model being able to express only an outbound and a return journey for baggage, while meals carry full
per-journey identification.

**Never duplicate the bundle's own baggage allowance (rule 61, defect V6-13).** Both `Value` and `Plus`
include a 30 KG checked allowance carried as the `PDBG` service code. The 30 KG *extra* bag maps to the
same code, and the airline permits it only once per passenger per leg. The combination is selectable,
priced and passes quoting — and then the booking **fails at the supplier after payment is attempted**.
The correct action is to read the bundle's contents and choose a different weight; 25 KG books cleanly.
The clash is bundle-dependent: `Light Super Flex` uses a different code and does not collide.

---

## 9. Ancillaries after the booking completes

From the sanctioned booking runs of 2026-09-19 (reference booking `S6GUFL`):

- **Selections survive the booking.** Meal, baggage, seat and bundle each reach the confirmation page
  and the e-ticket with their own price, attributed to the right passenger and the right segment. The
  infant carries none of them, as expected.
- The order's fare details itemise meal, seat, baggage and bundle separately — on `S6GUFL`, 3,920 /
  6,672 / 6,965 / 10,730 respectively.
- The seat column prints an internal enumeration rather than a clean seat label. This was reviewed and
  accepted (V6-04 closed).
- The bundle column reads as empty by design, because bundles are carried as service requests rather
  than as a named product (V6-05 closed).
- **The booking overview counts the seatless infant** — reporting three booked seats where two were
  sold. This is open defect **V6-06**.
- A bundle-versus-extra-baggage service clash is only reported **after** payment is attempted, as a
  failed order (V6-13, §8).

---

## 10. What to be careful about when reasoning from this document

1. **Nothing about a seat map is a system constant.** Rows, seats, totals, zones and attribute
   distribution belong to the flight, and change with it (rule 25).
2. **Three filters stack on availability** — the flight's inventory, the fare and bundle entitlement,
   and the individual traveller's eligibility. A seat that appears unavailable may be failing any one of
   them, and the three are not interchangeable.
3. **Journey and segment are not the same unit**, and the controls do not agree on which they use (§4).
4. **Title determines gender and therefore female-seat eligibility**; the infant-to-adult link
   determines exit-row and seat-set eligibility. Both are set in step 1 and both can be silently lost.
5. **Ancillaries are bound to a signed, expiring offer.** They are not free-standing products, and the
   offer they hang from can go stale.
6. **Some observations here are staging artifacts, not defects** — notably the Economy cabin labelling
   on a Business fare (OQ-25) and any supplier-sourced price anomaly (OQ-21).
7. **Several eligibility rules remain unverified** because current inventory does not expose them —
   exit rows for children and infant-holders, and the seat-set rule in full (OQ-37).
