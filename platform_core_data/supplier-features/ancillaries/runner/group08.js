'use strict';
// Ancillaries — Setup Group 08: 2 adults + 2 infants, each infant linked to a different adult on step
// 1 (the initial fill — not an edit after visiting step 2, so the CNF-018 family of faults does not
// apply). TC-SM-PAX-008: two infant-holding adults may not share one seat set (e.g. ABC on a 3-3 row).
//
// Business ruling recorded on the case (27 Sep 2026, run-006): "Pass by decision — like the exit rows,
// the airline enforces this at booking. Not verified with a completed booking." So a map that does not
// block the set is recorded as Passed with that ruling stated, the same way Group 01 records BND-002;
// a map that does block it simply passes.

const PAX = { adults: 2, children: 0, infants: 2 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 70}`); };
const tail = (label) => String(label).split(', ').slice(-2).join(', ');

/** The seat set (block between aisle and wall) a seat belongs to, from its section's own layout. */
function setOf(seat, seats, heads) {
  const h = heads[seat.section];
  if (!h) return null;
  const cols = [...new Set(seats.filter((x) => x.section === seat.section).map((x) => x.col))].sort();
  if (cols.length !== h.layout.reduce((a, b) => a + b, 0)) return null;
  let i = 0;
  for (const size of h.layout) {
    const block = cols.slice(i, i + size);
    if (block.includes(seat.col)) return block;
    i += size;
  }
  return null;
}

const steps = [
  {
    name: 'Search, book, and reach step 2',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const srch = await U.search(p, c.baseUrl, s, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 240000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      c.env('Search', `${s.from}→${s.to}, 2 adults + 2 infants · asked for ${s.daysFromToday} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const criteria = { ...s, criteria: { adults: [{}, {}], infants: [{}, {}] } };
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(4));
      const adults = travellers.filter((t) => t.type === 'Adult');
      // Initial fill, still on step 1: link infant 1 → adult A, infant 2 → adult B.
      await U.setAssignedTo(p, '1- Infant', adults[0].firstName);
      await U.setAssignedTo(p, '2- Infant', adults[1].firstName);
      c.state.adultA = adults[0];
      c.state.adultB = adults[1];
      const infants = travellers.filter((t) => t.type === 'Infant');
      c.env('Passengers', `${adults[0].name} (A, holds ${infants[0].name}) · ${adults[1].name} (B, holds ${infants[1].name})`);

      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        let chosen = names[0];
        for (const n of names) { await U.chooseBundle(p, n, names); chosen = n; if (/Seat selection: All seats/i.test(await U.bundleServices(p, n))) break; }
        c.env('Package', chosen);
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
    },
  },
  {
    name: 'Two infant-holding adults cannot share one seat set',
    cases: ['TC-SM-PAX-008'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const { adultA, adultB } = c.state;
      await U.openMap(p);
      await U.activate(p, adultA.name);
      const seats = await U.readSeats(p);
      const heads = await U.sectionHeaders(p);
      // A plain seat for A in a row that holds more than one set (3-3, 3-4-3 …), with free set-mates.
      const candidate = seats.find((x) => {
        if (x.state !== 'available' || x.features.some((f) => /Exit|Female/.test(f))) return false;
        const h = heads[x.section];
        if (!h || h.layout.length < 2) return false;
        const set = setOf(x, seats, heads);
        return set && seats.filter((y) => y.row === x.row && set.includes(y.col) && y.n !== x.n).every((y) => y.state === 'available');
      });
      if (!candidate) {
        await c.inconclusive('TC-SM-PAX-008', 'No row on this map with more than one seat set and a free seat whose set-mates are all free — cannot set the case up.');
        await U.ensureMapClosed(p);
        return;
      }
      const set = setOf(candidate, seats, heads);
      await U.bookSeat(p, candidate.n, adultA.firstName);
      await U.confirmSeats(p);

      await U.openMap(p);
      await U.activate(p, adultB.name);
      const mates = set.filter((col) => col !== candidate.col).map((col) => `${candidate.row}${col}`);
      const mateStates = [];
      for (const n of mates) mateStates.push(await U.seatState(p, n));
      const allCols = [...new Set(seats.filter((x) => x.section === candidate.section).map((x) => x.col))].sort();
      const otherCol = allCols.find((col) => !set.includes(col));
      const other = otherCol ? await U.seatState(p, `${candidate.row}${otherCol}`) : null;

      const matesBlocked = mateStates.every((m) => m.state !== 'available');
      const otherFree = other ? other.state === 'available' : false;
      const matesText = mateStates.map((m) => `${m.n} "${tail(m.label)}"`).join(', ');
      if (matesBlocked && otherFree) {
        await c.pass('TC-SM-PAX-008', `${adultA.firstName} (holds an infant) took ${candidate.n}. For ${adultB.firstName} (also holds an infant): set-mates ${matesText} — blocked, as the rule asks; ${other.n} in the other set "${tail(other.label)}" — still free. The map enforces the seat-set rule.`);
      } else if (!matesBlocked && otherFree) {
        await c.pass('TC-SM-PAX-008', `${adultA.firstName} (holds an infant) took ${candidate.n}. For ${adultB.firstName} (also holds an infant): set-mates ${matesText} — NOT blocked by the map; ${other.n} in the other set "${tail(other.label)}" — free. Passed by the recorded business ruling (27 Sep 2026: the airline enforces this at booking, not the seat map). Not verified with a completed booking.`);
      } else {
        await c.fail('TC-SM-PAX-008', `${adultA.firstName} took ${candidate.n}. For ${adultB.firstName}: set-mates ${matesText}; other-set seat ${other ? `${other.n} "${tail(other.label)}"` : 'none found'} — ${otherFree ? '' : 'a seat in a DIFFERENT set is not available to B either, which the rule does not call for.'}`, { locator: U.mapDialog(p) });
      }
      await U.ensureMapClosed(p);
    },
  },
];

module.exports = { id: '08', pax: PAX, steps, notAutomated: {} };
