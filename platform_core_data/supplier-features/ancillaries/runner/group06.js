'use strict';
// Ancillaries — Setup Group 06: 1 adult + 1 infant (linked on step 1), one-way, Economy. Needs the
// package that offers the exit rows (same rule as Groups 04-05).
//
// TC-SM-EXR-007 is excluded from this group: "Commented out 27 Sep 2026 (Mohanad Dawood): not to be
// executed", Review = Rejected — the Capability Plan's Review gate already keeps it out of any run.

const exitBook = require('./exitbook');

const PAX = { adults: 1, children: 0, infants: 1 };
const { freshDocs } = require('./docs'); // random A + 8 digits, fresh per passenger per run
const tail = (label) => String(label).split(', ').slice(-2).join(', ');

const steps = [
  {
    name: 'Search, book, and reach the seat map',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      await exitBook.baseline(c); // wallet / My Bookings, only when verifyExitBooking is on
      const srch = await U.search(p, c.baseUrl, s, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 240000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      c.env('Search', `${s.from}→${s.to}, 1 adult + 1 infant (linked) · asked for ${s.daysFromToday} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const criteria = { ...s, criteria: { adults: [{}], infants: [{}] } };
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(2));
      c.state.travellers = travellers;
      c.env('Passengers', travellers.map((t) => `${t.name} (${t.type})`).join(' · '));

      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        let chosen = names[0]; let allSeats = false;
        for (const n of names) {
          await U.chooseBundle(p, n, names);
          chosen = n;
          if (/Seat selection: All seats/i.test(await U.bundleServices(p, n))) { allSeats = true; break; }
        }
        c.env('Package', `${chosen}${allSeats ? ' ("Seat selection: All seats")' : ''}`);
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
    },
  },
  {
    name: 'Exit seat: the infant-holding adult cannot',
    cases: ['TC-SM-EXR-002'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const adult = c.state.travellers.find((t) => t.type === 'Adult');
      await U.openMap(p);
      await U.activate(p, adult.name);
      const seats = await U.readSeats(p);
      const exits = seats.filter((x) => U.isExit(x));
      if (!exits.length) {
        await c.inconclusive('TC-SM-EXR-002', 'No "Exit and emergency exit" seat on this flight\'s map — needs a flight whose inventory actually offers one.');
        await U.ensureMapClosed(p);
        return;
      }
      const seat = exits[0].n;
      const before = await U.seatState(p, seat);
      await U.clickSeat(p, seat);
      const bookBtn = U.mapDialog(p).getByRole('button', { name: new RegExp(`Book ${U.esc(seat)} for ${U.esc(adult.firstName)}`) });
      const offered = (await bookBtn.count()) > 0;
      if (offered) await bookBtn.click();
      await U.wait(p, 400);
      const after = await U.seatState(p, seat);
      const refused = after.state !== 'available' && after.heldBy !== adult.name;
      const bareBlocked = /, Blocked$/.test(before.label) && !/\bblocked for\b|\bnot offered for\b/i.test(before.label);
      await c.check('TC-SM-EXR-002', refused,
        `Exit seat ${seat} with ${adult.firstName} holding an infant: before "${tail(before.label)}"; Book ${offered ? 'offered and pressed anyway' : 'not offered'}; after "${tail(after.label)}" — ${refused ? 'refused, correctly' : 'BOOKED — should have been refused'}.${bareBlocked ? ' Observation: the box reads a bare "Blocked" with no stated reason — worth reporting even though the refusal itself is correct.' : ''}`,
        { locator: U.mapDialog(p) });
    },
  },
  {
    // Supplier rule no-leg-space-seat-inf (Spicejet, human decision Hussein 2026-10-28); the Capability
    // Plan excludes the case for every Supplier without the rule. Book is never pressed: being offered is the failure.
    name: 'Leg space seat: the infant-holding adult cannot',
    cases: ['TC-SM-LEG-002'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const adult = c.state.travellers.find((t) => t.type === 'Adult');
      await U.ensureMapClosed(p);
      await U.openMap(p);
      await U.activate(p, adult.name);
      const seats = await U.readSeats(p);
      const leg = seats.filter((x) => x.features.some((f) => /leg ?space/i.test(f)));
      if (!leg.length) {
        await c.inconclusive('TC-SM-LEG-002', 'No "Leg space seat" on this flight\'s map — needs a flight that offers one.');
        await U.ensureMapClosed(p);
        return;
      }
      // Every leg space seat, not a sample: a row blocked for everyone (Spicejet row 1) proves nothing about
      // the rule, so a pass needs seats an adult alone could take (e.g. 2C, offered to the adult in Group 05).
      const looked = [];
      for (const x of leg) {
        await U.clickSeat(p, x.n);
        const st = await U.seatState(p, x.n);
        const offered = (await U.mapDialog(p).getByRole('button', { name: new RegExp(`Book ${U.esc(x.n)} for ${U.esc(adult.firstName)}`) }).count()) > 0;
        looked.push({ n: x.n, label: tail(st.label), offered: offered || st.state === 'available' });
      }
      const wrong = looked.filter((l) => l.offered);
      if (wrong.length) await U.clickSeat(p, wrong[0].n); // the screenshot shows the first seat wrongly offered
      const byLabel = {};
      for (const l of looked) (byLabel[l.label] = byLabel[l.label] || []).push(l.n);
      // The seat map lets the infant-holding adult select one (human decision, Hussein 2026-10-28): the rule is
      // enforced when the booking is submitted (Portal: In Progress, Admin: Failed — Groups 20 and 22), not on the map.
      await c.check('TC-SM-LEG-002', wrong.length > 0,
        `${leg.length} leg space seat(s) checked with ${adult.firstName} holding an infant: ${Object.entries(byLabel).map(([lab, ns]) => `"${lab}" on ${ns.join(', ')}`).join(' | ')} — ${wrong.length ? `selectable on ${wrong.map((l) => l.n).join(', ')}, as the rule says (the refusal comes at Book/Hold, TC-SM-LEG-003/005)` : 'NONE selectable — the rule says the map allows them'}. Book was not pressed.`,
        { locator: U.mapDialog(p) });
      await U.ensureMapClosed(p);
    },
  },
  {
    name: 'The infant gets no meal and no extra baggage',
    cases: ['TC-ML-002', 'TC-BG-002'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.ensureMapClosed(p);
      const adult = c.state.travellers.find((t) => t.type === 'Adult');
      const infant = c.state.travellers.find((t) => t.type === 'Infant');
      const t = await U.text(p);
      const infantMentioned = new RegExp(U.esc(infant.name)).test(t);

      if (c.wants('TC-ML-002')) {
        const count = await U.dropdownCount(p, 'Choose a meal');
        // Meals are chosen per flight, so a connecting trip has one dropdown per flight for the one non-infant passenger:
        // what matters is that the adult has a meal choice and the infant has none.
        await c.check('TC-ML-002', count >= 1 && !infantMentioned,
          `${count} meal dropdown(s) for 1 non-infant passenger (${adult.firstName}; one per flight on a connecting trip); ${infant.firstName} (infant) ${infantMentioned ? 'IS MENTIONED on step 2' : 'appears nowhere on step 2'} — no meal choice for the infant.${count < 1 ? ' FAILED BECAUSE: the adult has no meal dropdown.' : ''}${infantMentioned ? ` FAILED BECAUSE: the infant's name appears on step 2.` : ''}`);
      }
      if (c.wants('TC-BG-002')) {
        const count = await U.dropdownCount(p, 'Choose a baggage');
        await c.check('TC-BG-002', count === 1 && !infantMentioned,
          `${count} baggage dropdown(s) for 1 non-infant passenger (${adult.firstName}); ${infant.firstName} (infant) ${infantMentioned ? 'IS MENTIONED on step 2' : 'appears nowhere on step 2'} — no extra baggage choice for the infant.`);
      }
    },
  },
  {
    // Optional and assisted (settings.verifyExitBooking, --headed): the adult holding the infant keeps the exit
    // seat the seat map let through; the HUMAN presses Book; the runner reads how the refusal is reported.
    name: 'Book the exit seat the seat map let through (the human presses Book)',
    cases: ['TC-SM-EXR-002'],
    assisted: 'Book',
    async run(c) {
      const adult = c.state.travellers.find((t) => t.type === 'Adult');
      await exitBook.bookAndVerify(c, `${adult.name} holding an infant, on the exit seat`, ['TC-SM-EXR-002']);
    },
  },
];

module.exports = {
  id: '06',
  pax: PAX,
  steps,
  notAutomated: { 'TC-SM-EXR-007': 'Rejected by the business, 27 Sep 2026 — "not to be executed." Excluded from every run by the Capability Plan\'s Review gate.' },
};
