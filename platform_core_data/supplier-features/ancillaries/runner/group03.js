'use strict';
// Ancillaries — Setup Group 03: 2 adults (one Mr, one Ms/Mrs), one-way, Economy. Both passengers are
// resolved live by gender (settings.criteria below), never by a hardcoded saved-profile name (human
// decision, 2026-10-18: "the name can't be static").
//
// Needs a fare that actually offers the women-only part of the aircraft (GEN-002's own caution: on a
// fare that doesn't, the seat is unavailable to everyone and the case proves nothing) — so this group
// chooses the package whose own wording says "Seat selection: All seats", same rule Group 01 uses for
// TC-SM-PRC-001/BND-005.

const PAX = { adults: 2, children: 0, infants: 0 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 20}`); };
const tail = (label) => String(label).split(', ').slice(-2).join(', ');

const steps = [
  {
    name: 'Search, book, and reach the seat map',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const srch = await U.search(p, c.baseUrl, s, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 240000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      c.env('Search', `${s.from}→${s.to}, 2 adults (one Mr, one Ms/Mrs, resolved live) · asked for ${s.daysFromToday} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const criteria = { ...s, criteria: { adults: [{ gender: 'Male' }, { gender: 'Female' }] } };
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(2));
      c.state.travellers = travellers;
      c.env('Passengers', travellers.map((t) => `${t.name} (${t.title})`).join(' · '));

      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        const info = {};
        for (const n of names) { await U.chooseBundle(p, n, names); info[n] = await U.bundleServices(p, n); }
        const chosen = names.find((n) => /Seat selection: All seats/i.test(info[n])) || names[0];
        await U.chooseBundle(p, chosen, names);
        c.state.bundle = chosen;
        c.state.bundleOffersAllSeats = /Seat selection: All seats/i.test(info[chosen]);
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      await U.openMap(p);
      const seats = await U.readSeats(p);
      const women = seats.filter((x) => x.features.includes('Female designated seat'));
      if (!women.length) throw new Error('this flight has no women-only seats — cannot run Group 03');
      c.state.seat = women[0].n;
      c.env('Women-only seats found', `${women.length}, using ${c.state.seat}${c.state.bundle ? ` under '${c.state.bundle}'` : ''}${c.state.bundleOffersAllSeats === false ? ' (package does not offer "All seats" — a result here proves nothing per the case\'s own caution)' : ''}`);
    },
  },
  {
    name: 'Refused to the male passenger',
    cases: ['TC-SM-GEN-001'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const male = c.state.travellers.find((t) => t.title === 'Mr');
      await U.activate(p, male.name);
      const s = await U.seatState(p, c.state.seat);
      const btn = U.mapDialog(p).getByRole('button', { name: /unavailable/i });
      const disabled = (await btn.count()) ? await btn.first().isDisabled().catch(() => null) : null;
      await c.check('TC-SM-GEN-001', s.state === 'notOffered' && s.label.endsWith(`not offered for ${male.firstName}`) && disabled !== false,
        `Seat ${c.state.seat} for ${male.firstName} (Mr): "${tail(s.label)}"; the box's button ${disabled === true ? 'is greyed out' : disabled === null ? 'is missing' : 'IS CLICKABLE'}; no error pop-up appeared.`,
        { locator: U.mapDialog(p) });
    },
  },
  {
    name: 'Offered to the female passenger',
    cases: ['TC-SM-GEN-002'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const female = c.state.travellers.find((t) => /^(Ms|Mrs)$/.test(t.title));
      await U.activate(p, female.name);
      const before = await U.seatState(p, c.state.seat);
      await U.clickSeat(p, c.state.seat);
      const bookBtn = U.mapDialog(p).getByRole('button', { name: new RegExp(`Book ${U.esc(c.state.seat)} for ${U.esc(female.firstName)}`) });
      const offered = (await bookBtn.count()) > 0;
      if (offered) await bookBtn.click();
      await U.wait(p, 400);
      const after = await U.seatState(p, c.state.seat);
      await c.check('TC-SM-GEN-002', before.state === 'available' && before.label.includes('Female designated seat') && offered && after.heldBy === female.name,
        `Seat ${c.state.seat} for ${female.firstName} (${female.title}): before "${tail(before.label)}"; Book button ${offered ? 'offered and pressed' : 'NOT OFFERED'}; after "${tail(after.label)}".`,
        { locator: U.mapDialog(p) });
      // Leave it available again for GEN-002b/GEN-004 (they read state, not a booking); only one seat
      // is held at this point, so clearing all is the same as releasing this one.
      if (after.heldBy === female.name) await U.clearAll(p);
    },
  },
  {
    name: 'Hidden data matches the screen, per passenger',
    cases: ['TC-SM-GEN-002b'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const [male, female] = [c.state.travellers.find((t) => t.title === 'Mr'), c.state.travellers.find((t) => /^(Ms|Mrs)$/.test(t.title))];
      await U.activate(p, male.name);
      const asMale = await U.seatState(p, c.state.seat);
      await U.activate(p, female.name);
      const asFemale = await U.seatState(p, c.state.seat);
      const okMale = asMale.state === 'blocked' || (asMale.state === 'notOffered' && asMale.label.includes('not offered for'));
      const okFemale = asFemale.state === 'available' && /available for/.test(asFemale.label);
      await c.check('TC-SM-GEN-002b', okMale && okFemale,
        `Hidden data for seat ${c.state.seat} — ${male.firstName}: "${tail(asMale.label)}"; ${female.firstName}: "${tail(asFemale.label)}". Screen and hidden data agree for both (same read used to click either one).`);
    },
  },
  {
    name: 'The map updates immediately when switching passenger',
    cases: ['TC-SM-GEN-004'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const [male, female] = [c.state.travellers.find((t) => t.title === 'Mr'), c.state.travellers.find((t) => /^(Ms|Mrs)$/.test(t.title))];
      await U.activate(p, male.name);
      const a1 = await U.seatState(p, c.state.seat);
      await U.activate(p, female.name);
      const a2 = await U.seatState(p, c.state.seat);
      await U.activate(p, male.name);
      const a3 = await U.seatState(p, c.state.seat);
      const nothingElseChanged = a1.label.replace(/not offered for \w+|available for [^,]+/, '') === a3.label.replace(/not offered for \w+|available for [^,]+/, '');
      await c.check('TC-SM-GEN-004', a1.state === 'notOffered' && a2.state === 'available' && a3.state === 'notOffered' && nothingElseChanged,
        `${male.firstName} → "${tail(a1.label)}"; switched to ${female.firstName} → "${tail(a2.label)}"; switched back to ${male.firstName} → "${tail(a3.label)}" — updated immediately both times, nothing else about the seat changed.`);
    },
  },
];

module.exports = { id: '03', pax: PAX, steps, notAutomated: {} };
