'use strict';
// Ancillaries — Setup Group 09: a return trip, default passengers (1 adult + 1 child + 1 infant),
// Economy. Journey 1 gets the package that includes every seat, journey 2 one that charges for
// seats — so one booking answers both "each journey has its own map" and "each journey's package
// prices its own seats" (TC-SM-BND-003 / RTP-003).
//
// Round-trip mechanics proven live 2026-10-19 (see portal.js searchRoundTrip / chooseBundleForNextLeg /
// openMapAt): one "Select Bundle" and one seat opener per journey, journeys in order.

const PAX = { adults: 1, children: 1, infants: 1 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 80}`); };
const tail = (label) => String(label).split(', ').slice(-2).join(', ');
const isZero = (price) => /^(Free|[A-Z]{3} 0(\.0+)?)$/.test(String(price));

async function readMap(c, index) {
  const U = c.ui; const p = c.page;
  await U.openMapAt(p, index);
  const mt = await U.mapText(p);
  const title = mt.match(/Seat Map · ([A-Z]{3}) → ([A-Z]{3}) · (\w+)/) || [];
  const card = mt.match(/([A-Z0-9]{2}\d{1,4}) · (\S+)/) || [];
  const seats = await U.readSeats(p);
  const avail = seats.filter((x) => x.state === 'available');
  return {
    title: title[0] || null, from: title[1], to: title[2], dir: title[3],
    flight: card[1] || null, aircraft: card[2] || null,
    total: seats.length, available: avail.length,
    free: avail.filter((x) => isZero(x.price)).length, paid: avail.filter((x) => !isZero(x.price)).length,
    seats, assigned: await U.assigned(p),
  };
}

const steps = [
  {
    name: 'Return-trip search, book, a package per journey, reach step 2',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      // Close dates, one day apart (human decision, 2026-10-19: e.g. out the 20th, back the 21st) —
      // the same "search near today" rule as every other group, never weeks out.
      let cards = { index: -1, count: 0 };
      let used = null;
      for (const [out, back] of [[1, 2], [2, 3], [3, 4]]) {
        const srch = await U.searchRoundTrip(p, c.baseUrl, { ...s, daysFromToday: out }, PAX, back);
        cards = await U.waitForCard(p, c.credentialName, 90000);
        srch.stop();
        if (cards.index >= 0) { used = [out, back]; break; }
      }
      if (cards.index < 0) throw new Error(`no return-trip card from "${c.credentialName}" for out/back 1/2, 2/3 or 3/4 days from today`);
      c.env('Search', `${s.from}↔${s.to} return trip, 1 adult + 1 child + 1 infant · out ${used[0]} day(s), back ${used[1]} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const criteria = { ...s, criteria: { adults: [{}], children: [{}], infants: [{}] } };
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(3));
      c.state.travellers = travellers;
      c.env('Passengers', travellers.map((t) => `${t.name} (${t.type})`).join(' · '));

      // Journey 1: the package whose own wording says "Seat selection: All seats"; journey 2: one
      // that does not. Chosen by wording, never by a supplier's package name.
      const allSeatsText = (n) => U.bundleServices(p, n).then((t) => /Seat selection: All seats/i.test(t));
      const bundleAt = (names, i) => p.locator('p-dropdown').filter({ hasText: new RegExp(['Choose a bundle', ...names].map(U.esc).join('|')) }).nth(i);
      const pickOn = async (i, name, names) => {
        await U.expandJourneys(p);
        await bundleAt(names, i).click();
        await U.wait(p, 300);
        await p.getByRole('option', { name, exact: true }).filter({ visible: true }).first().click();
        await U.wait(p, 600);
      };
      const j1 = await U.chooseBundleForNextLeg(p); // journey 1 gets the first package
      const names = j1.names;
      const known = {};
      let pk1 = j1.chosen;
      known[pk1] = await allSeatsText(pk1);
      for (const n of names) {
        if (known[pk1]) break;
        if (n === pk1) continue; // never re-pick the selected option — that clears it
        await pickOn(0, n, names);
        pk1 = n;
        known[n] = await allSeatsText(n);
      }
      let pk2 = null;
      if (await U.bundlesRemaining(p)) {
        const order = names.filter((n) => n !== pk1).sort((a, b) => (known[a] === false ? -1 : 0) - (known[b] === false ? -1 : 0));
        pk2 = (await U.chooseBundleForNextLeg(p, order[0])).chosen;
        for (const n of order.slice(1)) {
          if (!(await allSeatsText(pk2))) break; // journey 1 holds a different name, so this reads journey 2's
          await pickOn(1, n, names);
          pk2 = n;
        }
      }
      c.state.packages = [pk1, pk2];
      c.env('Packages', `journey 1: '${pk1}'${known[pk1] ? ' ("Seat selection: All seats")' : ' (no package says "All seats")'} · journey 2: ${pk2 ? `'${pk2}'` : 'NONE OFFERED'}`);

      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      c.state.openers = await U.openerTexts(p);
      c.env('Step 2', `${c.state.openers.length} seat opener(s): ${c.state.openers.join(' / ')}`);
    },
  },
  {
    name: 'One seat map per journey, each its own',
    cases: ['TC-SM-RTP-001', 'TC-SM-RND-010', 'TC-SM-BND-003', 'TC-SM-RTP-003'],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const n = c.state.openers.length;
      const maps = [];
      for (let i = 0; i < n; i += 1) {
        const m = await readMap(c, i);
        maps.push(m);
        await U.continueWithoutSeats(p);
      }
      c.state.maps = maps;
      const [m1, m2] = maps;
      const directions = maps.map((m) => `"${m.title || 'no title'}"`).join(', ');
      const ownRoutes = m1 && m2 && m1.from === s.from && m1.to === s.to && m2.from === s.to && m2.to === s.from;
      const ownDirs = m1 && m2 && m1.dir !== m2.dir;
      const ev = `${n} seat map(s): ${directions}; aircraft ${maps.map((m) => `${m.flight || '?'} · ${m.aircraft || '?'} (${m.total} seats)`).join(' and ')}.`;
      await c.check('TC-SM-RTP-001', n === 2 && ownRoutes && ownDirs, ev);
      await c.check('TC-SM-RND-010', n === 2 && ownRoutes && ownDirs && m1.flight !== m2.flight, `${ev} Each titled with its own route and direction, each on its own flight.`);

      if (!m2) {
        for (const id of ['TC-SM-BND-003', 'TC-SM-RTP-003']) await c.inconclusive(id, 'Only one journey\'s seat map was reachable.');
        return;
      }
      const [pk1, pk2] = c.state.packages;
      const ev2 = `Journey 1 under '${pk1}': ${m1.available} selectable — ${m1.free} free, ${m1.paid} paid. Journey 2 under '${pk2}': ${m2.available} selectable — ${m2.free} free, ${m2.paid} paid.`;
      const independent = m1.paid === 0 && m2.paid > 0;
      await c.check('TC-SM-BND-003', independent, `${ev2} ${independent ? 'Each journey is priced by its own package.' : 'The two journeys are NOT priced independently by their own packages.'}`);
      await c.check('TC-SM-RTP-003', independent, `${ev2} ${independent ? "Journey 2's paid tier does not leak into journey 1's all-free map." : 'Prices did not follow each journey\'s own package.'}`);
    },
  },
  {
    name: 'Seats on one journey never touch the other',
    cases: ['TC-SM-RTP-004', 'TC-SM-MPX-006', 'TC-SM-RTP-005'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const seatTravellers = c.state.travellers.filter((t) => t.type !== 'Infant');
      if (c.state.openers.length < 2) {
        for (const id of ['TC-SM-RTP-004', 'TC-SM-MPX-006', 'TC-SM-RTP-005']) await c.inconclusive(id, 'Only one journey on this booking.');
        return;
      }
      // Journey 1: a seat for every traveller who can have one, then confirm.
      await U.openMapAt(p, 0);
      const chosen1 = [];
      for (const t of seatTravellers) {
        await U.activate(p, t.name);
        const [n] = U.plainSeats(await U.readSeats(p), 1, { exclude: chosen1 });
        if (!n) break;
        await U.bookSeat(p, n, t.firstName);
        chosen1.push(n);
      }
      await U.confirmSeats(p);
      const openersAfter1 = await U.openerTexts(p);

      // Journey 2: must open empty, on its own aircraft, with journey 1's seat number still offered.
      await U.openMapAt(p, 1);
      const a2 = await U.assigned(p);
      const sameNumber = await U.seatState(p, chosen1[0]).catch(() => null);
      const mt2 = await U.mapText(p);
      const flight2 = (mt2.match(/([A-Z0-9]{2}\d{2,4}) · (\S+)/) || [])[0] || '?';
      await c.check('TC-SM-RTP-004', a2 && a2.done === 0 && /^(Change Seats|Seat \d+ more)/.test(openersAfter1[0] || '') && /^Select Seat/.test(openersAfter1[1] || '') && (!sameNumber || sameNumber.state === 'available'),
        `After confirming ${chosen1.join(', ')} on journey 1, its button reads "${openersAfter1[0]}" and journey 2's "${openersAfter1[1]}". Journey 2's map (${flight2}) opened with ${a2 ? `${a2.done}/${a2.of}` : '?'} chosen; seat ${chosen1[0]} there ${sameNumber ? `reads "${tail(sameNumber.label)}"` : 'does not exist on this aircraft'}.`);

      // Choose a seat on journey 2 and check journey 1 is untouched.
      const first = seatTravellers[0];
      await U.activate(p, first.name);
      const [n2] = U.plainSeats(await U.readSeats(p), 1, { paid: null });
      if (n2) await U.bookSeat(p, n2, first.firstName);
      await U.confirmSeats(p);
      const t = await U.text(p);
      const summaries = (t.match(/Selected seats \d+ travell(?:er|ers)/g) || []);
      await U.openMapAt(p, 0);
      const back1 = [];
      for (const n of chosen1) back1.push(await U.seatState(p, n));
      await U.ensureMapClosed(p); // seats are held here, so this confirms them again — no change
      const kept = back1.every((x) => seatTravellers.some((tr) => x.heldBy === tr.name));
      await c.check('TC-SM-MPX-006', kept && summaries.length === 2,
        `Journey 2 seat ${n2 || 'none available'} chosen for ${first.firstName}; journey 1 still holds ${back1.map((x) => `${x.n} → ${x.heldBy || 'NOBODY'}`).join(', ')}. Step 2 shows ${summaries.length} separate "Selected seats" summary block(s): ${summaries.join(' | ')}.`);

      // RTP-005: can each journey's charges be told apart in the price breakdown?
      const bd = await U.breakdown(p);
      const breakdownText = (t.match(/Fare Breakdown[\s\S]*?Total Amount:? [\d,.]+/) || [''])[0];
      const perJourney = /(CAI|JED)\s*→\s*(CAI|JED)/.test(breakdownText) || /Onward|Return|Trip 1|Trip 2/.test(breakdownText);
      const ev5 = `Price breakdown lines: ${Object.entries(bd.lines).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}; base fare ${bd.base.length} line(s), tax ${bd.tax.length} line(s), total ${bd.total}. ${perJourney ? 'Charges are labelled per journey.' : 'No line names its journey — one merged package line, one base line and one tax line cover both journeys.'}`;
      if (perJourney) await c.pass('TC-SM-RTP-005', ev5);
      else await c.fail('TC-SM-RTP-005', `Known fault reproduced (the case's own note: "the grand total is CORRECT; only the breakdown is too coarse"). ${ev5}`, { fullPage: true });
    },
  },
];

module.exports = { id: '09', pax: PAX, steps, notAutomated: {} };
