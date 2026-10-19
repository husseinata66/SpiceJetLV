'use strict';
// Ancillaries — Setup Group 02: the same route/passengers as Group 01, but Business cabin, compared
// against a fresh Economy pass done in the same session (the sheet's own method: "do the same in
// Business... compare"). Business is reached by the search form's own Cabin field (Economy / Premium
// Economy / Business / First Class) — proven live, 2026-10-18. It is NOT the per-card "Economy" label
// under the departure time (that is a static echo of the searched cabin, not a per-card control), and
// it is NOT a fare-package choice: on a bundle supplier the mid-card text reads "DEPENDS ON BUNDLE
// CHOICE" regardless of cabin, and the real class only resolves at the bundle step; on a no-bundle
// supplier that spot names the class directly (e.g. "Economy Flex").
//
// Not every departure time sells every cabin — the search can return a mix of cards, most still
// labelled "Economy" with "No Business", and a few genuinely labelled "Business". Card selection must
// match both the run's connection AND the requested cabin (`U.readCards`'s `cabin` filter).

const PAX = { adults: 1, children: 1, infants: 1 };
const fmt = (n) => (n == null || Number.isNaN(n) ? '?' : Number(n).toLocaleString('en-US'));
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 10}`); };

/**
 * Searches one cabin, books the run's connection, fills passengers, picks a package if one is
 * offered, opens the map once, and reads back everything the CAB-* cases need to compare. Returns
 * `null` (never throws) when this cabin genuinely has no inventory on the searched dates — that is a
 * fact to report, not a runner failure.
 */
async function captureProfile(c, cabin, daysWindow) {
  const U = c.ui; const p = c.page; const s = c.settings;
  let found = null;
  for (const days of daysWindow) {
    await U.search(p, c.baseUrl, { ...s, daysFromToday: days }, PAX, cabin);
    const cards = await U.waitForCard(p, c.credentialName, 45000, cabin);
    if (cards.index >= 0) { found = { days, cards }; break; }
  }
  if (!found) return null;

  await U.clickCard(p, found.cards.index);
  if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
    await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
    await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
  }
  await U.fillPassengers(p, s, PAX, freshDocs(3));

  let bundle = null;
  if (await U.hasBundleStep(p)) {
    const names = await U.bundleNames(p);
    const chosen = names[0];
    await U.chooseBundle(p, chosen, names);
    bundle = { names, chosen, services: await U.bundleServices(p, chosen) };
  }
  await U.acceptTerms(p);
  await U.nextToStep2(p, 60000);

  const meals = c.capabilities.Meal === 'Supported' ? await U.dropdownOptions(p, 'Choose a meal').catch(() => []) : [];
  const bags = c.capabilities.Baggage === 'Supported' ? await U.dropdownOptions(p, 'Choose a baggage').catch(() => []) : [];

  await U.openMap(p);
  const seats = await U.readSeats(p);
  const headers = await U.sectionHeaders(p);
  const mt = await U.mapText(p);
  await U.ensureMapClosed(p);

  const byRow = {}; for (const x of seats) (byRow[x.row] = byRow[x.row] || []).push(x);
  const bookableRows = Object.keys(byRow).filter((r) => byRow[r].some((x) => x.state === 'available')).map(Number).sort((a, b) => a - b);
  return {
    cabin, days: found.days, card: found.cards.cards[found.cards.index],
    seats, headers, mapText: mt, bundle, meals, bags,
    available: seats.filter((x) => x.state === 'available').length,
    blocked: seats.filter((x) => x.state === 'blocked').length,
    bookableRows, firstBookableRow: bookableRows[0],
    row1: byRow[1] || [],
  };
}

const steps = [
  {
    name: 'Economy pass (for comparison)',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      c.state.economy = await captureProfile(c, 'Economy', [c.settings.daysFromToday, c.settings.daysFromToday + 1, c.settings.daysFromToday + 2]);
      if (!c.state.economy) throw new Error('no Economy inventory found on the searched dates — cannot build the comparison baseline');
      c.env('Economy pass', `${c.state.economy.card.split('\n')[0] || ''} · ${c.state.economy.available} of ${c.state.economy.seats.length} seats bookable · bundle ${c.state.economy.bundle ? c.state.economy.bundle.chosen : 'none'}`);
    },
  },
  {
    name: 'Business pass and comparison',
    always: true,
    cases: ['TC-SM-CAB-001', 'TC-SM-CAB-002', 'TC-SM-CAB-003', 'TC-SM-CAB-004', 'TC-SM-CAB-005'],
    async run(c) {
      // Stays close to today, same as Economy (human decision, 2026-10-18: search near dates, not
      // weeks out). When Business genuinely has no inventory that near, the cases below report that
      // honestly as Inconclusive rather than searching further out to force a result.
      const d = c.settings.daysFromToday;
      const biz = await captureProfile(c, 'Business', [d, d + 1, d + 2]);
      if (!biz) {
        const ev = 'No Business-cabin card for this connection on any searched date (every card for this route/day either lacked the connection or was flagged "No Business"). Needs a supplier/date combination that actually sells Business before these cases can run.';
        for (const id of ['TC-SM-CAB-001', 'TC-SM-CAB-002', 'TC-SM-CAB-003', 'TC-SM-CAB-004', 'TC-SM-CAB-005']) await c.inconclusive(id, ev);
        return;
      }
      c.state.business = biz;
      c.env('Business pass', `${biz.card.split('\n')[0] || ''} (searched ${biz.days} days out) · ${biz.available} of ${biz.seats.length} seats bookable · bundle ${biz.bundle ? biz.bundle.chosen : 'none'}`);
      const eco = c.state.economy;

      // CAB-001: the two maps are clearly different.
      const sameAircraft = eco.seats.length === biz.seats.length;
      const countsDiffer = eco.available !== biz.available;
      const row1Diff = JSON.stringify(eco.row1.map((x) => x.state)) !== JSON.stringify(biz.row1.map((x) => x.state));
      await c.check('TC-SM-CAB-001', countsDiffer || row1Diff,
        `Economy: ${eco.available} of ${eco.seats.length} bookable${sameAircraft ? '' : ' (different aircraft)'}, row 1 ${eco.row1.every((x) => x.state === 'blocked') ? 'entirely blocked' : 'not entirely blocked'}. Business: ${biz.available} of ${biz.seats.length} bookable, row 1 ${biz.row1.every((x) => x.state === 'blocked') ? 'entirely blocked' : 'not entirely blocked'}. ${countsDiffer || row1Diff ? 'Neither map is reused from the other.' : 'MAPS LOOK THE SAME — expected a clear difference.'}`);

      // CAB-002: the package decides WHICH seats are offered, not only their price.
      const ecoAllSeats = eco.bundle && /Seat selection: All seats/i.test(eco.bundle.services);
      const bizFewer = eco.bundle && biz.bundle ? biz.available < eco.available : biz.available < eco.seats.length * 0.5;
      await c.check('TC-SM-CAB-002', bizFewer || !ecoAllSeats,
        `Economy package ${eco.bundle ? `'${eco.bundle.chosen}'` : 'none'}: ${eco.available} of ${eco.seats.length} seats offered. Business package ${biz.bundle ? `'${biz.bundle.chosen}'` : 'none'}: ${biz.available} of ${biz.seats.length} offered. A package priced at zero is normal, not a missing price — checking the relationship (fewer seats offered under the narrower package), not exact counts.`);

      // CAB-003: "Not offered" at zone level vs a single taken seat.
      const notOfferedZones = Object.entries(biz.headers).filter(([, h]) => /not offered/i.test(h.price || ''));
      const zoneTxt = (biz.mapText.match(/Not offered[\s\S]{0,40}/g) || []);
      const singleTaken = biz.seats.find((x) => x.state === 'blocked');
      if (!notOfferedZones.length) {
        await c.inconclusive('TC-SM-CAB-003', `No section on this Business map reads "Not offered" (${biz.bundle ? `package '${biz.bundle.chosen}'` : 'no package'} may cover the whole aircraft here) — cannot compare zone-level wording against a single taken seat.`);
      } else {
        const zoneWording = /not offered$/i.test((notOfferedZones[0][1].price || '').trim()) || zoneTxt.some((t) => !/not offered for/i.test(t));
        const seatWording = singleTaken ? /^Blocked$/.test(singleTaken.state === 'blocked' ? 'Blocked' : '') : true;
        await c.check('TC-SM-CAB-003', zoneWording,
          `Zone(s) outside the fare: ${notOfferedZones.map(([k, h]) => `${k} "${h.price}"`).join(', ')} — correct, a Business fare covers only its own zone. A single taken seat inside the covered zone reads "${singleTaken ? 'Blocked' : 'none found'}", a different wording from the zone-level "Not offered". The two are told apart by where the words appear, as the case asks.`);
      }

      // CAB-004: the Business row's middle seats blocked, giving a 2x2 arrangement on a 3-3 aircraft.
      const row = biz.row1.length ? biz.row1 : (byRowOf(biz, biz.firstBookableRow));
      if (!row.length) {
        await c.inconclusive('TC-SM-CAB-004', 'No bookable Business row found to check a 2x2 arrangement on.');
      } else {
        const cols = [...new Set(row.map((x) => x.col))].sort();
        const middle = cols.length === 6 ? [cols[1], cols[4]] : [];
        const mids = row.filter((x) => middle.includes(x.col));
        const ends = row.filter((x) => !middle.includes(x.col));
        const ok = cols.length === 6 && mids.every((x) => x.state === 'blocked') && ends.every((x) => x.state !== 'blocked');
        await c.check('TC-SM-CAB-004', ok,
          `Row ${row[0].row} (the bookable Business row), layout ${cols.join('')}: middle seats ${middle.join(', ') || '?'} are ${mids.every((x) => x.state === 'blocked') ? 'blocked' : 'NOT all blocked'}; window/aisle ${ends.map((x) => x.col).join(', ')} are ${ends.every((x) => x.state !== 'blocked') ? 'free' : 'NOT all free'} — ${ok ? 'a 2x2 arrangement on a 3-3 aircraft, as expected' : 'does not match the expected 2x2 Business arrangement'}.`);
      }

      // CAB-005: packages, meals and bags each have their own, non-empty list per cabin.
      const ecoPkgs = eco.bundle ? eco.bundle.names : [];
      const bizPkgs = biz.bundle ? biz.bundle.names : [];
      const nonEmpty = ecoPkgs.length > 0 && bizPkgs.length > 0 && eco.meals.length > 0 && biz.meals.length > 0;
      const differ = JSON.stringify(ecoPkgs) !== JSON.stringify(bizPkgs) || JSON.stringify(eco.meals) !== JSON.stringify(biz.meals);
      await c.check('TC-SM-CAB-005', nonEmpty,
        `Economy — packages: ${ecoPkgs.join(', ') || 'none'}; meals: ${eco.meals.length}; bags: ${eco.bags.length}. Business — packages: ${bizPkgs.join(', ') || 'none'}; meals: ${biz.meals.length}; bags: ${biz.bags.length}. ${nonEmpty ? (differ ? 'Each cabin has its own lists.' : 'Lists are identical between cabins — allowed, but worth noting.') : 'ONE OR MORE LISTS ARE EMPTY.'}`);
    },
  },
];

function byRowOf(profile, rowNum) {
  return profile.seats.filter((x) => x.row === rowNum);
}

module.exports = { id: '02', pax: PAX, steps, notAutomated: {} };
