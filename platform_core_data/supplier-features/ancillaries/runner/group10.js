'use strict';
// Ancillaries — Setup Group 10: multi-city, 3 journeys, one connecting, default passengers (1 adult +
// 1 child + 1 infant), Economy. Search and step 2 only — never books.
//
//   TC-SM-MCT-003  one seat map per FLIGHT, each titled with its own route
//   TC-SM-MCT-007  seat maps and meals follow FLIGHTS, fare packages follow JOURNEYS; both flights of a
//                  connecting journey inherit that journey's single package
//   TC-SM-MCT-006  extra baggage is one panel per JOURNEY, each labelled with its journey
//
// Rules proven live 2026-10-19 (human): baggage is per journey, seat maps are per flight, meal boxes are
// one per flight per passenger who can have one; the case wording "4 baggage tabs" is wrong. The route
// and credential come from `settings.multiCity` (git-ignored settings.local.json) — a route that has
// inventory for every leg is the human's to supply; the runner never invents one.
//
// A package can be refused at step 2 (`ssr-quote` 400, e.g. "SSR 'KRNM-0' not available on CAI-RUH" for a
// connecting journey's package) and Next then silently does nothing — so when step 2 does not open the
// runner tries the next package on that journey and records which ones were refused.

const { reachStep2 } = require('./multicity');

const PAX = { adults: 1, children: 1, infants: 1 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 90}`); };
const TITLE_RE = /Seat Map · ([A-Z]{3}) → ([A-Z]{3}) · (Trip \d+)(?: · (Leg \d+))?/;
const priceSet = (seats) => [...new Set(seats.filter((x) => x.state === 'available').map((x) => x.price))].sort().join(' | ');

const steps = [
  {
    name: 'Multi-city search, book, a package per journey, reach step 2',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      await reachStep2(c, PAX, freshDocs);
    },
  },
  {
    name: 'Seat maps, meals and baggage: per flight and per journey',
    cases: ['TC-SM-MCT-003', 'TC-SM-MCT-007', 'TC-SM-MCT-006'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const eligible = PAX.adults + PAX.children; // the infant has no meal, bag or seat
      const openers = await U.openerTexts(p);
      const flights = openers.length;
      const mealBoxes = await U.dropdownCount(p, 'Choose a meal');
      const bagBoxes = await U.dropdownCount(p, 'Choose a baggage');
      const pageText = await U.text(p);
      const bagLabels = [...pageText.matchAll(/([A-Z]{3}) ([A-Z]{3}) (Trip \d+(?: · Leg \d+)?) Choose a baggage/g)].map((m) => `${m[1]}→${m[2]} ${m[3]}`);

      const maps = [];
      for (let i = 0; i < flights; i += 1) {
        await U.openMapAt(p, i);
        const mt = await U.mapText(p);
        const t = mt.match(TITLE_RE) || [];
        const seats = await U.readSeats(p);
        maps.push({ title: t[0] || null, from: t[1], to: t[2], trip: t[3], leg: t[4] || null, seats, prices: priceSet(seats) });
        await U.continueWithoutSeats(p);
      }
      c.state.maps = maps;
      const trips = [...new Set(maps.map((m) => m.trip).filter(Boolean))];
      const journeys = trips.length;
      const titled = maps.every((m) => m.title);
      const ev = `${flights} seat map(s) over ${journeys} journey(s): ${maps.map((m) => `"${m.title || 'untitled'}"`).join(', ')}.`;

      await c.check('TC-SM-MCT-003', flights >= 3 && titled && new Set(maps.map((m) => m.title)).size === flights,
        `${ev} Each map has its own route title.`);

      // 007: packages follow journeys, maps and meals follow flights.
      const connecting = trips.filter((t) => maps.filter((m) => m.trip === t).length > 1);
      const problems = [];
      if (!connecting.length) problems.push('no journey on this booking connects, so there is nothing to compare');
      if (c.state.packageBoxes && c.state.packageBoxes !== journeys) problems.push(`${c.state.packageBoxes} package box(es) for ${journeys} journey(s)`);
      if (flights <= journeys) problems.push(`${flights} seat map(s) is not more than ${journeys} journey(s)`);
      if (c.capabilities.Meal === 'Supported' && mealBoxes !== flights * eligible) problems.push(`${mealBoxes} meal box(es), expected ${flights * eligible} (${flights} flights × ${eligible} passengers)`);
      const inherit = connecting.map((t) => {
        const legs = maps.filter((m) => m.trip === t);
        const same = legs.every((m) => m.prices === legs[0].prices);
        if (!same) problems.push(`${t}: its legs show different seat prices (${legs.map((m) => m.prices).join(' vs ')})`);
        return `${t} (${legs.length} flights) ${same ? 'same seat prices on every leg' : 'DIFFERENT prices'}: ${legs[0].prices || 'none selectable'}`;
      });
      const pkgText = c.state.packages.length ? `Packages ${c.state.packages.map((n, i) => `journey ${i + 1} '${n}'`).join(', ')}. ` : '';
      const ev7 = `${pkgText}${c.state.packageBoxes || 0} package box(es) vs ${flights} seat map(s); ${mealBoxes} meal box(es)${c.capabilities.Meal === 'Supported' ? ` (= ${flights} flights × ${eligible} passengers)` : ''}. Connecting: ${inherit.join('; ') || 'none'}.`;
      await c.check('TC-SM-MCT-007', problems.length === 0, problems.length ? `${ev7} ${problems.join('; ')}.` : `${ev7} Both flights of a connecting journey share that journey's single package.`);

      // 006: baggage is one panel per journey, each labelled with its journey (no fixed number).
      const distinct = [...new Set(bagLabels)];
      const perJourney = bagBoxes === journeys * eligible && distinct.length === journeys && distinct.every((l) => !/Leg/.test(l));
      await c.check('TC-SM-MCT-006', perJourney,
        `${bagBoxes} baggage box(es) for ${journeys} journey(s) × ${eligible} passengers; labels: ${distinct.join(', ') || 'none'}. ${perJourney ? 'One baggage panel per journey, each labelled with its journey.' : 'Baggage is not one labelled panel per journey.'}`,
        { locator: p.locator('body') });
    },
  },
];

module.exports = { id: '10', pax: PAX, steps, notAutomated: {} };
