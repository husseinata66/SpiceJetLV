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

/**
 * The price-change checks, run on the round trip (AirIndia-specific: the sheet puts them in the one-way group, but for this
 * supplier the pop-up appears only on a round trip with an infant). Same checks as the sheet's cases.
 */
async function priceUpdateChecks(c, cardIndex) {
  const U = c.ui; const p = c.page;
  const pu = await U.readPriceUpdate(p);
  const has = (w) => pu.buttons.includes(w);
  await c.check('TC-SM-FRC-001', !!(pu.previous && pu.next && has('Cancel') && has('Accept')),
    `"Price Update" before the booking screen: Previous ${pu.previous} → New ${pu.next}; buttons ${pu.buttons.join(' / ')}.`,
    { locator: U.priceDialog(p) });
  c.state.oldPrice = pu.previous;
  c.state.newPrice = pu.next;
  c.env('Price change', `Previous ${pu.previous} → New ${pu.next}, accepted`);

  await U.priceDialog(p).getByRole('button', { name: 'Cancel', exact: true }).click();
  await U.wait(p, 1500);
  const back = await U.readCards(p, c.credentialName).catch(() => ({ count: 0, index: -1 }));
  const onPax = await U.region(p, '1- Adult').isVisible().catch(() => false);
  const open = await U.priceDialog(p).isVisible().catch(() => false);
  await c.check('TC-SM-FRC-003', back.count > 0 && !onPax && !open,
    `Cancel: back on the results list (${back.count} cards), passenger screen ${onPax ? 'REACHED' : 'not reached'}, pop-up ${open ? 'STILL OPEN' : 'closed'}.`);

  await U.clickCard(p, back.index >= 0 ? back.index : cardIndex);
  if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
    await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
  }
  await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
  const pub = await U.published(p);
  const oldShown = (await U.text(p)).includes(pu.previous);
  await c.check('TC-SM-FRC-002', !!pub && pub.amount === U.num(pu.next) && !oldShown,
    `Accept opened Passenger Details; amount to pay ${pub ? pub.raw : '?'} ${pub && pub.amount === U.num(pu.next) ? '=' : '≠'} the new price ${pu.next}; old price ${pu.previous} ${oldShown ? 'STILL SHOWN' : 'shown nowhere'}.`);
}

const steps = [
  {
    name: 'Return-trip search, book, a package per journey, reach step 2',
    always: true,
    critical: true,
    // The price-change cases are listed here for a supplier whose settings move them to this group (AirIndia: the pop-up
    // appears only on a round trip with an infant). For every other supplier they are not in this group and record nothing.
    cases: ['TC-SM-FRC-001', 'TC-SM-FRC-002', 'TC-SM-FRC-003', 'TC-SM-FRC-005'],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      // Close dates, one day apart (human decision, 2026-10-19: e.g. out the 20th, back the 21st) —
      // the same "search near today" rule as every other group, never weeks out.
      let cards = { index: -1, count: 0 };
      let used = null;
      // settings.roundTrip { out, back } (days from today) pins the dates the human chose.
      const pairs = s.roundTrip ? [[s.roundTrip.out, s.roundTrip.back]] : [[1, 2], [2, 3], [3, 4]];
      for (const [out, back] of pairs) {
        const route = s.roundTrip ? { from: s.roundTrip.from || s.from, to: s.roundTrip.to || s.to } : {};
        // The environment's round-trip search answers HTTP 500 / "No Flights Found" at times and then recovers
        // (seen 2026-10-26/27): search the same dates up to three times before moving on.
        for (let attempt = 1; attempt <= 3 && cards.index < 0; attempt += 1) {
          const srch = await U.searchRoundTrip(p, c.baseUrl, { ...s, ...route, daysFromToday: out }, PAX, back);
          cards = await U.waitForCard(p, c.credentialName, 60000);
          srch.stop();
          if (cards.index < 0) c.log(`return search ${out}/${back} attempt ${attempt}: no card (${cards.count} cards, responses ${srch.statuses.join(', ') || 'none'})`);
        }
        if (cards.index >= 0) { used = [out, back]; break; }
      }
      if (cards.index < 0) throw new Error(`no return-trip card from "${c.credentialName}" for out/back ${pairs.map((x) => x.join('/')).join(', ')} days from today`);
      c.env('Search', `${s.from}↔${s.to} return trip, 1 adult + 1 child + 1 infant · out ${used[0]} day(s), back ${used[1]} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        if (c.wants('TC-SM-FRC-001', 'TC-SM-FRC-002', 'TC-SM-FRC-003', 'TC-SM-FRC-005')) {
          await priceUpdateChecks(c, cards.index);
        } else {
          await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
          await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
        }
      } else {
        for (const id of ['TC-SM-FRC-001', 'TC-SM-FRC-002', 'TC-SM-FRC-003', 'TC-SM-FRC-005']) {
          await c.na(id, 'No Price Update pop-up appeared on this run: the airline did not change the fare for this search, so there is nothing to test.');
        }
      }
      const criteria = { ...s, criteria: { adults: [{}], children: [{}], infants: [{}] } };
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(3));
      c.state.travellers = travellers;
      c.env('Passengers', travellers.map((t) => `${t.name} (${t.type})`).join(' · '));

      // Journey 1: the package whose own wording says "Seat selection: All seats"; journey 2: one
      // that does not. Chosen by wording, never by a supplier's package name.
      // A supplier with no fare packages (Bundle Not Supported) has no package dropdown: nothing to choose.
      let j1; let names; let pk1 = null; let pk2 = null; const known = {};
      const allSeatsText = (n) => U.bundleServices(p, n).then((t) => /Seat selection: All seats/i.test(t));
      const bundleAt = (names2, i) => p.locator('p-dropdown').filter({ hasText: new RegExp(['Choose a bundle', ...names2].map(U.esc).join('|')) }).nth(i);
      const pickOn = async (i, name, names2) => {
        await U.expandJourneys(p);
        await bundleAt(names2, i).click();
        await U.wait(p, 300);
        await p.getByRole('option', { name, exact: true }).filter({ visible: true }).first().click();
        await U.wait(p, 600);
      };
      if (c.supported('Bundle')) {
        j1 = await U.chooseBundleForNextLeg(p); // journey 1 gets the first package
        names = j1.names;
        pk1 = j1.chosen;
        known[pk1] = await allSeatsText(pk1);
        for (const n of names) {
          if (known[pk1]) break;
          if (n === pk1) continue; // never re-pick the selected option — that clears it
          await pickOn(0, n, names);
          pk1 = n;
          known[n] = await allSeatsText(n);
        }
        if (await U.bundlesRemaining(p)) {
          const order = names.filter((n) => n !== pk1).sort((a2, b2) => (known[a2] === false ? -1 : 0) - (known[b2] === false ? -1 : 0));
          pk2 = (await U.chooseBundleForNextLeg(p, order[0])).chosen;
          for (const n of order.slice(1)) {
            if (!(await allSeatsText(pk2))) break; // journey 1 holds a different name, so this reads journey 2's
            await pickOn(1, n, names);
            pk2 = n;
          }
        }
      }
      c.state.packages = [pk1, pk2];
      c.env('Packages', c.supported('Bundle') ? `journey 1: '${pk1}'${known[pk1] ? ' ("Seat selection: All seats")' : ' (no package says "All seats")'} · journey 2: ${pk2 ? `'${pk2}'` : 'NONE OFFERED'}` : 'none — this supplier has no fare packages');

      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      c.state.openers = await U.openerTexts(p);
      c.env('Step 2', `${c.state.openers.length} seat opener(s): ${c.state.openers.join(' / ')}`);
      if (c.state.oldPrice) {
        const shown = (await U.text(p)).includes(c.state.oldPrice);
        await c.check('TC-SM-FRC-005', !shown,
          `Old search price ${c.state.oldPrice} ${shown ? 'SHOWN on step 2' : 'appeared nowhere'} on the package step or the extras step; the totals were built after accepting ${c.state.newPrice}.`,
          { fullPage: true });
      }
    },
  },
  {
    name: 'One seat map per journey, each its own',
    cases: ['TC-SM-RTP-001', 'TC-SM-RND-010', 'TC-SM-BND-003', 'TC-SM-RTP-003'],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const n = c.state.openers.length;
      // The legs of the booking, read from the page itself ("DEL → GOI Onward · Leg 1"; the arrow is an icon on the page, so any separator is accepted): one seat map is owed for each.
      // Connecting journeys label every flight "Leg N"; a direct journey has no such label, so use every route heading then.
      const pageText = await U.text(p);
      const headings = [...pageText.matchAll(/\b([A-Z]{3})\W{0,6}([A-Z]{3})\s+(Onward|Return)(?:\s*·\s*Leg\s*(\d+))?/g)]
        .map((m) => ({ from: m[1], to: m[2], dir: m[3], leg: m[4] || null }));
      const labelled = headings.filter((h) => h.leg);
      const seenLeg = new Set();
      const legsOnPage = (labelled.length ? labelled : headings).filter((h) => {
        const k = `${h.from}>${h.to}>${h.dir}>${h.leg}`;
        if (seenLeg.has(k)) return false;
        seenLeg.add(k);
        return true;
      });
      const maps = [];
      for (let i = 0; i < n; i += 1) {
        const m = await readMap(c, i);
        maps.push(m);
        await U.continueWithoutSeats(p);
      }
      c.state.maps = maps;
      const route = s.roundTrip ? { from: s.roundTrip.from || s.from, to: s.roundTrip.to || s.to } : { from: s.from, to: s.to };
      const onward = maps.filter((m) => m.dir === 'Onward');
      const back = maps.filter((m) => m.dir === 'Return');
      const [j1, j2] = [onward[0], back[0]]; // the first flight of each journey
      const directions = maps.map((m) => `"${m.title || 'no title'}"`).join(', ');
      // A connecting journey has one map per FLIGHT (the sheet's TC-SM-MCT-007: seat maps follow flights, fare
      // packages follow journeys), so the maps of a journey must chain from its origin to its destination.
      const chain = (legs) => legs.every((m, i) => i === 0 || m.from === legs[i - 1].to);
      const onwardOk = onward.length > 0 && onward[0].from === route.from && onward[onward.length - 1].to === route.to && chain(onward);
      const returnOk = back.length > 0 && back[0].from === route.to && back[back.length - 1].to === route.from && chain(back);
      const legs = (list) => list.map((m) => `${m.from} → ${m.to}`).join(', ') || 'none';
      const distinct = new Set(maps.map((m) => m.flight)).size === maps.length;
      const everyAircraft = maps.every((m) => m.aircraft && m.total > 0);
      const why = [];
      if (!onwardOk) why.push(`the Onward maps (${legs(onward)}) do not run ${route.from} → ${route.to} flight by flight`);
      if (!returnOk) why.push(`the Return maps (${legs(back)}) do not run ${route.to} → ${route.from} flight by flight`);
      if (legsOnPage.length) {
        const owed = legsOnPage.map((l) => `${l.from} → ${l.to} ${l.dir}${l.leg ? ` leg ${l.leg}` : ''}`);
        if (maps.length !== legsOnPage.length) why.push(`the booking has ${legsOnPage.length} leg(s) (${owed.join(', ')}) but ${maps.length} seat map(s) opened: one map is owed for every leg`);
        legsOnPage.forEach((l, i) => {
          const m = maps[i];
          if (!m) why.push(`no seat map for leg ${i + 1} (${l.from} → ${l.to} ${l.dir})`);
          else if (m.from !== l.from || m.to !== l.to || m.dir !== l.dir) why.push(`map ${i + 1} is titled ${m.from} → ${m.to} ${m.dir} where leg ${i + 1} is ${l.from} → ${l.to} ${l.dir}`);
        });
      } else {
        why.push('the legs of the booking could not be read from the page, so the number of maps could not be compared');
      }
      if (!distinct) why.push('two maps show the same flight');
      if (!everyAircraft) why.push('a map shows no aircraft or no seats');
      const ev = `${n} seat map(s): ${directions}; aircraft ${maps.map((m) => `${m.flight || '?'} · ${m.aircraft || '?'} (${m.total} seats)`).join(' and ')}.${n > 2 ? ` ${n} maps for 2 journeys: a connecting journey has one map per flight.` : ''}${why.length ? ` FAILED BECAUSE: ${why.join('; ')}.` : ''}`;
      await c.check('TC-SM-RTP-001', !why.length, ev);
      await c.check('TC-SM-RND-010', !why.length, `${ev} Each titled with its own route and direction, each on its own flight.`);

      if (!j1 || !j2) {
        for (const id of ['TC-SM-BND-003', 'TC-SM-RTP-003']) await c.inconclusive(id, 'Only one journey\'s seat map was reachable.');
        return;
      }
      const [pk1, pk2] = c.state.packages;
      const ev2 = `Journey 1 (${j1.from} → ${j1.to}) under '${pk1}': ${j1.available} selectable — ${j1.free} free, ${j1.paid} paid. Journey 2 (${j2.from} → ${j2.to}) under '${pk2}': ${j2.available} selectable — ${j2.free} free, ${j2.paid} paid.`;
      // The case needs one package that includes seats and one that charges for them. Where neither package does,
      // the packages cannot be told apart by seat price and the case does not apply (fare packages differ by supplier).
      if (!c.supported('Bundle')) {
        for (const id of ['TC-SM-BND-003', 'TC-SM-RTP-003']) await c.na(id, 'This supplier has no fare packages (Bundle Not Supported), so there is no package to price each journey by.');
        return;
      }
      const premise = (j1.paid === 0) !== (j2.paid === 0);
      if (!premise) {
        const reason = `${ev2} Not applicable: the case needs one package that includes seats and one that does not. This supplier's fare packages ("${pk1}" and "${pk2}") include no seats, meals or baggage (human note, 2026-10-27), so there are no packages to tell apart by seat price. The difference between the two journeys' seat prices comes from their different flights and aircraft, not from the packages (fare packages differ from one supplier to another).`;
        for (const id of ['TC-SM-BND-003', 'TC-SM-RTP-003']) await c.na(id, reason);
        return;
      }
      await c.pass('TC-SM-BND-003', `${ev2} Each journey is priced by its own package.`);
      await c.pass('TC-SM-RTP-003', `${ev2} One journey's paid tier does not leak into the other journey's map.`);
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
      // Human decision, 2026-10-27: the merged breakdown is a reporting gap, not a failure (the case's own note: "the
      // grand total is CORRECT; only the breakdown is too coarse"). The human also reports that meals and baggage are
      // shown the same way; this run chose no meal or baggage, so only the seat and package lines were observed.
      else await c.pass('TC-SM-RTP-005', `Accepted as a reporting gap, not a failure (human decision, 2026-10-27): the total is correct and the breakdown does not name each journey. ${ev5} The same applies to meals and baggage, per the human (none were chosen in this run).`, { fullPage: true });
    },
  },
];

module.exports = { id: '09', pax: PAX, steps, notAutomated: {} };
