'use strict';
// Ancillaries — Setup Group 04: one adult travelling alone, one-way, Economy. Proves exit seats are
// bookable at all — "run this first" (the sheet's own words): the refusals checked in Groups 05-08
// only mean something once this passes. Needs the package that actually offers the exit rows
// ('Plus'/"Seat selection: All seats"), not one that blocks them out of its fare.

const PAX = { adults: 1, children: 0, infants: 0 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 30}`); };

const steps = [
  {
    name: 'An adult alone can take an exit seat',
    always: true,
    cases: ['TC-SM-EXR-001'],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const srch = await U.search(p, c.baseUrl, s, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 240000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      c.env('Search', `${s.from}→${s.to}, 1 adult, no infant · asked for ${s.daysFromToday} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const criteria = { ...s, criteria: { adults: [{}] } }; // gender doesn't matter here
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(1));
      const adult = travellers[0];
      c.env('Passenger', `${adult.name} (${adult.title})`);

      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        let chosen = names[0]; let allSeats = false;
        for (const n of names) {
          await U.chooseBundle(p, n, names);
          chosen = n;
          // Re-selecting an already-selected option seems to clear the dropdown (proven live,
          // 2026-10-18) — stop as soon as a match is found instead of cycling every name and
          // re-clicking the winner afterwards.
          if (/Seat selection: All seats/i.test(await U.bundleServices(p, n))) { allSeats = true; break; }
        }
        c.env('Package', `${chosen}${allSeats ? ' ("Seat selection: All seats")' : ' (no "All seats" wording — a refusal later would not necessarily be meaningful)'}`);
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      await U.openMap(p);
      const seats = await U.readSeats(p);
      const exits = seats.filter((x) => x.features.includes('Exit and emergency exit') && x.state === 'available');
      if (!exits.length) {
        // Exit-row presence and availability are flight-specific (documented); a different flight
        // from a different search just won't always have one — not a reason to fail the run.
        await c.inconclusive('TC-SM-EXR-001', 'No bookable "Exit and emergency exit" seat on this flight\'s map — needs a flight whose inventory actually offers one.');
        await U.ensureMapClosed(p);
        return;
      }
      const seat = exits[0].n;
      await U.activate(p, adult.name);
      const before = await U.seatState(p, seat);
      await U.clickSeat(p, seat);
      const bookBtn = U.mapDialog(p).getByRole('button', { name: new RegExp(`Book ${U.esc(seat)} for ${U.esc(adult.firstName)}`) });
      const offered = (await bookBtn.count()) > 0;
      if (offered) await bookBtn.click();
      await U.wait(p, 400);
      const after = await U.seatState(p, seat);
      await c.check('TC-SM-EXR-001', before.state === 'available' && offered && after.heldBy === adult.name,
        `Exit seat ${seat}: before "${before.label.split(', ').slice(-2).join(', ')}"; Book button ${offered ? 'worked, pressed' : 'NOT OFFERED'}; after "${after.label.split(', ').slice(-2).join(', ')}" — ${after.heldBy === adult.name ? 'booked' : 'NOT BOOKED'} for ${adult.firstName}, travelling alone.`,
        { locator: U.mapDialog(p) });
    },
  },
];

module.exports = { id: '04', pax: PAX, steps, notAutomated: {} };
