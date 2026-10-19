'use strict';
// Ancillaries — Setup Group 13: cases that end the booking. Never books.
//
//   TC-SM-NEG-006  opening the booking page with a broken or missing link: access refused, no seat map or
//                  prices, no technical error. The case expects Flight Search; the human ruled (2026-10-19)
//                  that the Portal's Dashboard / "No Data Found · Go Back · Go Home" is acceptable too.
//   TC-SM-CNF-015  walking away before Book creates nothing: no new order, the wallet unchanged.
//
// PER-004 (the 60-minute time limit running out) and ERR-002 (the session expiring mid-booking) are long
// waits — skipped by human decision, 2026-10-19; recorded as such, never run here.

const PAX = { adults: 1, children: 0, infants: 0 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 120}`); };
const GARBLED = 'eyJhbGciOiJIUzUxMiJ9.eyJrZXkiOiJkYXRhIn0.AAAAAAAAAAAA'; // a token's shape with a signature that cannot verify

const { readWallet: wallet, readMyBookings } = require('./postbook');
const readWallet = async (c) => (await wallet(c)).text;

const steps = [
  {
    name: 'Baseline: wallet and My Bookings before anything is touched',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      c.state.before = { wallet: await readWallet(c), bookings: await readMyBookings(c) };
      c.env('Before', `wallet ${c.state.before.wallet} · My Bookings ${c.state.before.bookings.total} orders, newest ${c.state.before.bookings.newest || '?'}`);
    },
  },
  {
    name: 'The booking page opened with a broken or missing link',
    cases: ['TC-SM-NEG-006'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const base = new URL('/booking/passenger-details', c.baseUrl).href;
      const probes = [['garbled token', `${base}?flight-token=${GARBLED}`], ['no token', base], ['empty token', `${base}?flight-token=`]];
      const seen = [];
      let ok = true;
      for (const [label, url] of probes) {
        await p.goto(new URL('/dashboard', c.baseUrl).href, { timeout: 30000 }); // start each probe from a clean page
        await U.wait(p, 1000);
        await p.goto(url, { timeout: 30000 }).catch(() => {});
        await U.wait(p, 3500);
        const t = await U.text(p);
        const where = new URL(p.url()).pathname;
        const leaks = /Net Payable|Select Seat|Seat Map|Fare Breakdown/.test(t);
        const techError = /exception|stack trace|Cannot read|Whitelabel|Internal Server Error/i.test(t);
        const landing = /flight-search/.test(where) ? 'Flight Search' : /dashboard/.test(where) ? 'Dashboard' : /No Data Found/.test(t) ? '"No Data Found · Go Back · Go Home"' : `${where} (unexpected)`;
        if (leaks || techError || /unexpected/.test(landing)) ok = false;
        seen.push(`${label} → ${landing}${leaks ? ', SHOWS PRICES OR A SEAT MAP' : ''}${techError ? ', TECHNICAL ERROR SHOWN' : ''}`);
      }
      await c.check('TC-SM-NEG-006', ok,
        `${seen.join('; ')}. ${ok ? 'Access refused every time — no seat map, no prices, no technical error. The case expects Flight Search; Dashboard / "No Data Found" accepted by human ruling, 2026-10-19.' : 'Access was not refused cleanly.'} An expired token was not tried (it needs a link over 60 minutes old).`);
    },
  },
  {
    name: 'Fill everything in, walk away before Book, and check nothing was created',
    cases: ['TC-SM-CNF-015'],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const srch = await U.search(p, c.baseUrl, s, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 120000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const { travellers } = await U.fillPassengers(p, { ...s, criteria: { adults: [{}] } }, PAX, freshDocs(1));
      const adult = travellers[0];
      if (await U.hasBundleStep(p)) { const names = await U.bundleNames(p); await U.chooseBundle(p, names[0], names); }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      const chosen = [];
      if (c.capabilities.Seat === 'Supported') {
        await U.openMap(p);
        const [n] = U.plainSeats(await U.readSeats(p), 1, {});
        if (n) { await U.bookSeat(p, n, adult.firstName); chosen.push(`seat ${n}`); }
        await U.ensureMapClosed(p);
      }
      if (c.capabilities.Meal === 'Supported') {
        const opts = await U.dropdownOptions(p, 'Choose a meal').catch(() => []);
        if (opts[0]) { await U.chooseOption(p, 'Choose a meal', opts[0].split(' ')[0]); chosen.push(`meal ${opts[0].split(' ')[0]}`); }
      }
      if (c.capabilities.Baggage === 'Supported') {
        const opts = await U.dropdownOptions(p, 'Choose a baggage').catch(() => []);
        if (opts[0]) { const bag = opts[0].split(' - ')[0]; await U.chooseOption(p, 'Choose a baggage', bag); chosen.push(`bag ${bag}`); }
      }
      const quote = ((await U.text(p)).match(/Net Payable Amount: ([\d,.]+ [A-Z]{3})/) || [])[1] || '?';
      // Walk away: Book is never pressed (the guard would refuse it anyway).
      await p.goto(new URL('/dashboard', c.baseUrl).href, { timeout: 30000 });
      await U.wait(p, 2000);
      const after = { wallet: await readWallet(c), bookings: await readMyBookings(c) };
      const { before } = c.state;
      const same = after.wallet === before.wallet && after.bookings.total === before.bookings.total && after.bookings.newest === before.bookings.newest;
      await c.check('TC-SM-CNF-015', same,
        `${adult.name}, ${chosen.join(', ') || 'no extras offered'}; quote ${quote}; left without pressing Book. Wallet ${before.wallet} → ${after.wallet}; My Bookings ${before.bookings.total} → ${after.bookings.total} orders, newest ${before.bookings.newest} → ${after.bookings.newest}. ${same ? 'Nothing was created and nothing was charged.' : 'SOMETHING CHANGED after walking away.'}`);
    },
  },
];

module.exports = {
  id: '13', pax: PAX, steps,
  notAutomated: {
    'TC-SM-PER-004': 'Skipped by human decision, 2026-10-19: needs the 60-minute time limit to run out (and a re-run at 15 minutes before go-live) — a separate scheduled check.',
    'TC-SM-ERR-002': 'Skipped by human decision, 2026-10-19: needs ~10–12 minutes idle until the session expires, which also ends the human\'s login.',
  },
};
