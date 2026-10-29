'use strict';
// Ancillaries — Setup Group 05: 1 adult + 1 child, one-way, Economy. Needs the package that offers the
// exit rows (same rule as Group 04). EXR-003 and EXR-004 are read from the same adult→child→adult
// sequence on one seat, rather than reopening the map twice — both cases ask for the same facts.

const exitBook = require('./exitbook');

const PAX = { adults: 1, children: 1, infants: 0 };
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
      c.env('Search', `${s.from}→${s.to}, 1 adult + 1 child · asked for ${s.daysFromToday} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const criteria = { ...s, criteria: { adults: [{}], children: [{}] } };
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(2));
      c.state.travellers = travellers;
      c.env('Passengers', travellers.map((t) => `${t.name} (${t.type})`).join(' · '));

      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        let chosen = names[0]; let allSeats = false;
        for (const n of names) {
          await U.chooseBundle(p, n, names);
          chosen = n;
          // Re-selecting an already-selected option seems to clear the dropdown (proven live,
          // 2026-10-18) — stop as soon as a match is found instead of cycling every name.
          if (/Seat selection: All seats/i.test(await U.bundleServices(p, n))) { allSeats = true; break; }
        }
        c.state.bundleOffersAllSeats = allSeats;
        c.env('Package', `${chosen}${allSeats ? ' ("Seat selection: All seats")' : ''}`);
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
    },
  },
  {
    name: 'Exit seat: the child cannot, the adult can — rechecked on every switch',
    cases: ['TC-SM-EXR-003', 'TC-SM-EXR-004'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const adult = c.state.travellers.find((t) => t.type === 'Adult');
      const child = c.state.travellers.find((t) => t.type === 'Child');
      await U.openMap(p);
      await U.activate(p, adult.name); // which traveller is active by default right after opening isn't assumed
      const seats = await U.readSeats(p);
      const exits = seats.filter((x) => U.isExit(x) && x.state === 'available');
      const allExits = seats.filter((x) => U.isExit(x));
      if (!exits.length && allExits.length && c.settings.exitRowsAlwaysBlocked) {
        // Per-Supplier human decision (settings.exitRowsAlwaysBlocked — Spicejet, Hussein 2026-10-28: "the seat
        // is returned as blocked every time, skip these and mark them as pass"): every exit seat is blocked for
        // every passenger, so no child can take one. Recorded with the seats actually seen, never assumed.
        const ev = `Every "Exit and emergency exit" seat on this flight is blocked for everyone (${allExits.map((x) => x.n).join(', ')}), so the child cannot take one. Passed by human decision (Hussein, 28 Oct 2026): this supplier always returns exit seats as blocked; the adult-can / child-cannot switch is not exercised.`;
        await c.pass('TC-SM-EXR-003', ev);
        await c.pass('TC-SM-EXR-004', ev);
        await U.ensureMapClosed(p);
        return;
      }
      if (!exits.length) {
        // Exit-row presence and availability are flight-specific (documented); a different flight
        // from a different search just won't always have one — not a reason to fail the run.
        const ev = 'No bookable "Exit and emergency exit" seat on this flight\'s map — needs a flight whose inventory actually offers one.';
        await c.inconclusive('TC-SM-EXR-003', ev);
        await c.inconclusive('TC-SM-EXR-004', ev);
        await U.ensureMapClosed(p);
        return;
      }
      const seat = exits[0].n;

      // The "Book <seat> for <name>" button only appears once the seat itself is clicked for the active
      // traveller (proven live on OmanAir, 2026-10-19: reading it after activate alone said "not offered"
      // for a child the Portal in fact lets book). So: activate → click the seat → read.
      const bookBtnFor = (name) => U.mapDialog(p).getByRole('button', { name: new RegExp(`Book ${U.esc(seat)} for ${U.esc(name)}`) });
      const look = async (who) => { await U.activate(p, who.name); await U.clickSeat(p, seat); return { st: await U.seatState(p, seat), offered: (await bookBtnFor(who.firstName).count()) > 0 }; };

      const a1 = await look(adult); const asAdult1 = a1.st; const adultOffered1 = a1.offered; // checked, not pressed (EXR-004 step 1)
      const c1 = await look(child); const asChild = c1.st; const childOffered = c1.offered;
      if (childOffered) await bookBtnFor(child.firstName).click(); // EXR-003 step 3: try it anyway
      const a2 = await look(adult); const asAdult2 = a2.st; const adultOffered2 = a2.offered;

      const childRefused = asChild.state !== 'available' && !childOffered;
      const adultOk1 = asAdult1.state === 'available' && adultOffered1;
      const adultOk2 = asAdult2.state === 'available' && adultOffered2 && asAdult2.heldBy !== child.name;
      const sameFeatures = JSON.stringify(asAdult1.features) === JSON.stringify(asChild.features) && JSON.stringify(asChild.features) === JSON.stringify(asAdult2.features);

      await c.check('TC-SM-EXR-004', adultOk1 && childRefused && sameFeatures,
        `Exit seat ${seat} — ${adult.firstName}: available, Book offered (not pressed). Switched to ${child.firstName}: "${tail(asChild.label)}"${childRefused ? ', refused' : ', STILL BOOKABLE'}. Nothing about the seat itself changed (${sameFeatures ? 'same features both times' : 'FEATURES DIFFERED — unexpected'}) — only the selected passenger did.`,
        { locator: U.mapDialog(p) });
      await c.check('TC-SM-EXR-003', childRefused && adultOk2,
        `${child.firstName} (child) cannot take exit seat ${seat}: "${tail(asChild.label)}"${childOffered ? ' (Book was offered and pressed anyway)' : ', Book not offered'}. Switched back to ${adult.firstName}: "${tail(asAdult2.label)}" — still available. The rule applies to the passenger, not the whole flight.`);
    },
  },
  {
    // Supplier rule no-leg-space-seat-inf (Spicejet, human decision Hussein 2026-10-28); the Capability
    // Plan excludes the case for every Supplier without the rule. Book is never pressed: being offered is the failure.
    name: 'Leg space seat: the child cannot, the adult can',
    cases: ['TC-SM-LEG-001'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const adult = c.state.travellers.find((t) => t.type === 'Adult');
      const child = c.state.travellers.find((t) => t.type === 'Child');
      await U.ensureMapClosed(p);
      await U.openMap(p);
      await U.activate(p, adult.name);
      const seats = await U.readSeats(p);
      const leg = seats.filter((x) => x.state === 'available' && x.features.some((f) => /leg ?space/i.test(f)));
      if (!leg.length) {
        await c.inconclusive('TC-SM-LEG-001', 'No free "Leg space seat" on this flight\'s map for the adult — needs a flight that offers one.');
        await U.ensureMapClosed(p);
        return;
      }
      const seat = leg[0].n;
      const bookBtnFor = (name) => U.mapDialog(p).getByRole('button', { name: new RegExp(`Book ${U.esc(seat)} for ${U.esc(name)}`) });
      const look = async (who) => { await U.activate(p, who.name); await U.clickSeat(p, seat); return { st: await U.seatState(p, seat), offered: (await bookBtnFor(who.firstName).count()) > 0 }; };
      // Adult first, child last: the evidence screenshot then shows the map as the child sees it.
      const asAdult = await look(adult);
      const asChild = await look(child);
      // A child may have a leg space seat (human decision, Hussein 2026-10-28): the map offers it to the child as to
      // the adult, and booking it completes (TC-SM-LEG-004). Only an infant-holding adult is restricted (LEG-002/003/005).
      const childOffered = asChild.st.state === 'available' && asChild.offered;
      const adultOk = asAdult.st.state === 'available' && asAdult.offered;
      await c.check('TC-SM-LEG-001', childOffered && adultOk,
        `Leg space seat ${seat} — ${child.firstName} (child): "${tail(asChild.st.label)}"${childOffered ? ', selectable' : ', NOT SELECTABLE'}. ${adult.firstName} (adult): "${tail(asAdult.st.label)}"${adultOk ? ', selectable' : ', NOT SELECTABLE'}. A child may have a leg space seat; only an adult holding an infant is restricted. Book was not pressed.`,
        { locator: U.mapDialog(p) });
      await U.ensureMapClosed(p);
    },
  },
  {
    name: 'Meals and baggage, per passenger',
    cases: ['TC-ML-001', 'TC-BG-001'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.ensureMapClosed(p);
      const n = c.state.travellers.length; // adult + child, no infant in this group

      if (c.wants('TC-ML-001')) {
        const count = await U.dropdownCount(p, 'Choose a meal');
        const perPax = [];
        for (let i = 0; i < Math.min(count, n); i += 1) {
          await U.expandPassengerCard(p, i + 1);
          const opts = (await U.dropdownOptionsAt(p, 'Choose a meal', i)).map(U.parseMeal).filter(Boolean);
          perPax.push(opts);
        }
        const everyoneHasList = count >= n && perPax.every((opts) => opts.length > 0);
        const everyOptionPriced = perPax.every((opts) => opts.every((o) => o.price === 0 || o.price > 0)); // 0 reads as "included"/free
        await c.check('TC-ML-001', everyoneHasList && everyOptionPriced,
          `${count} meal dropdown(s) for ${n} non-infant passengers. ${perPax.map((opts, i) => `${c.state.travellers[i].firstName}: ${opts.map((o) => `${o.code} ${o.price === 0 ? 'included' : o.price}`).join(', ') || 'NO LIST'}`).join('; ')}.`);
      }
      if (c.wants('TC-BG-001')) {
        const count = await U.dropdownCount(p, 'Choose a baggage');
        const perPax = [];
        for (let i = 0; i < Math.min(count, n); i += 1) {
          await U.expandPassengerCard(p, i + 1);
          const opts = (await U.dropdownOptionsAt(p, 'Choose a baggage', i)).map(U.parseBag).filter(Boolean);
          perPax.push(opts);
        }
        const everyoneHasList = count >= n && perPax.every((opts) => opts.length > 0);
        const everyOptionPriced = perPax.every((opts) => opts.every((o) => o.price > 0));
        // Human decision, 2026-10-27: a baggage option that states no weight (a handling fee per piece) is accepted for
        // this supplier. What still fails: a passenger with no baggage list, or an option with no price.
        const noWeight = [...new Set(perPax.flat().filter((o) => !(o.kg > 0)).map((o) => `"${o.name}" (${o.price})`))];
        const why = [];
        if (count < n) why.push(`only ${count} baggage dropdown(s) for ${n} passengers`);
        perPax.forEach((opts, i) => { if (!opts.length) why.push(`${c.state.travellers[i].firstName} has no baggage list`); });
        perPax.forEach((opts, i) => { const free = opts.filter((o) => !(o.price > 0)); if (free.length) why.push(`${c.state.travellers[i].firstName}: no price on ${free.map((o) => `"${o.name}"`).join(', ')}`); });
        const note = noWeight.length ? ` Accepted for this supplier (human decision, 2026-10-27): ${noWeight.length} option(s) state a number of pieces or a fee instead of a weight: ${noWeight.join(', ')}.` : '';
        await c.check('TC-BG-001', everyoneHasList && everyOptionPriced,
          `${count} baggage dropdown(s) for ${n} non-infant passengers. ${perPax.map((opts, i) => `${c.state.travellers[i].firstName}: ${opts.map((o) => `${o.name} ${o.price}`).join(', ') || 'NO LIST'}`).join('; ')}.${why.length ? ` FAILED BECAUSE: ${why.join('; ')}.` : note}`,
          { mark: async () => { await U.dropdownAt(p, 'Choose a baggage', 0).click(); await U.wait(p, 600); await U.markSeats(p, [], `TC-BG-001: ${why.join('; ') || 'baggage list'}`); } });
        await p.keyboard.press('Escape').catch(() => {});
      }
    },
  },
  {
    // Optional and assisted (settings.verifyExitBooking, --headed): the child keeps the exit seat the seat map let
    // it take; the HUMAN presses Book; the runner reads how the refusal is reported.
    name: 'Book the exit seat the child was allowed to take (the human presses Book)',
    cases: ['TC-SM-EXR-003', 'TC-SM-EXR-004'],
    assisted: 'Book',
    async run(c) {
      const child = c.state.travellers.find((t) => t.type === 'Child');
      await exitBook.bookAndVerify(c, `${child.name} (a child) on the exit seat`, ['TC-SM-EXR-003', 'TC-SM-EXR-004']);
    },
  },
];

module.exports = { id: '05', pax: PAX, steps, notAutomated: {} };
