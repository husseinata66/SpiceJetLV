'use strict';
// Ancillaries — Setup Group 11: a second flight on a DIFFERENT aircraft. Uses `settings.multiCityAircraft` (a
// route the human knows mixes aircraft types; falls back to Group 10's `multiCity`) — its flights are the
// "flight A" and "flight B" — and compares their seat maps. Search and step 2 only; never books.
//
//   TC-SM-RND-007  two different flights give two different maps, each matching its own aircraft
//
// Which aircraft flies a route is the airline's choice, so the case cannot always be arranged: when every
// flight on the route is the same type the result is Inconclusive, never a pass. Proven live 2026-10-19:
// XY 578 and XY 221 were 320NEO (174 seats, 3-3) and XY 4 was 320NE1 (172 seats, Business · Economy, 2-2
// first section) — the aircraft is read off the map's own aircraft card, e.g. "XY4 · 320NE1  SEATS 172".

const { reachStep2 } = require('./multicity');

const PAX = { adults: 1, children: 1, infants: 1 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 100}`); };
const TITLE_RE = /Seat Map · ([A-Z]{3}) → ([A-Z]{3}) · (Trip \d+(?: · Leg \d+)?)/;
const CARD_RE = /([A-Z0-9]{2}\d{1,4}) · (\S+)/; // "XY4 · 320NE1" — flight numbers can be one digit

const steps = [
  {
    name: 'Multi-city search, book, a package per journey, reach step 2',
    always: true,
    critical: true,
    cases: [],
    async run(c) { await reachStep2(c, PAX, freshDocs, c.settings.multiCityAircraft ? 'multiCityAircraft' : 'multiCity'); },
  },
  {
    name: 'Compare the seat maps of flights on different aircraft',
    cases: ['TC-SM-RND-007'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const flights = (await U.openerTexts(p)).length;
      const maps = [];
      for (let i = 0; i < flights; i += 1) {
        await U.openMapAt(p, i);
        const mt = await U.mapText(p);
        const title = (mt.match(TITLE_RE) || [])[0] || `flight ${i + 1}`;
        const card = mt.match(CARD_RE) || [];
        const seats = await U.readSeats(p);
        const heads = await U.sectionHeaders(p);
        const layout = Object.values(heads).map((h) => h.layout.join('-')).join(' / ');
        const rows = new Set(seats.map((x) => x.row)).size;
        maps.push({ title, flight: card[1] || '?', aircraft: card[2] || '?', total: seats.length, rows, layout, labels: new Set(seats.map((x) => x.label.split(', ').slice(0, 4).join(','))) });
        await U.continueWithoutSeats(p);
      }
      const desc = (m) => `${m.flight} ${m.title.replace('Seat Map · ', '')}: ${m.aircraft}, ${m.total} seats, ${m.rows} rows, layout ${m.layout || '?'}`;
      const types = [...new Set(maps.map((m) => m.aircraft))];
      if (types.length < 2 || types.includes('?')) {
        await c.inconclusive('TC-SM-RND-007', `${maps.map(desc).join(' | ')}. ${types.includes('?') ? 'An aircraft type could not be read off a map.' : `Every flight on this route is the same aircraft (${types[0]}) — the case needs a flight on a different one, which only the airline decides.`}`);
        return;
      }
      const a = maps[0];
      const b = maps.find((m) => m.aircraft !== a.aircraft);
      const differ = a.total !== b.total || a.layout !== b.layout || a.rows !== b.rows;
      const copy = a.labels.size === b.labels.size && [...a.labels].every((l) => b.labels.has(l));
      await c.check('TC-SM-RND-007', differ && !copy,
        `${maps.map(desc).join(' | ')}. ${differ && !copy ? `The maps for ${a.aircraft} and ${b.aircraft} differ in seat total, rows or layout — neither is a copy of the other.` : `Flights on different aircraft (${a.aircraft} vs ${b.aircraft}) show the same map.`}`);
    },
  },
];

module.exports = { id: '11', pax: PAX, steps, notAutomated: {} };
