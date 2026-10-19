'use strict';
// Ancillaries — Setup Group 17: a booking HELD, then PAID. SPENDS REAL MONEY. ASSISTED with TWO stops: the
// runner builds the booking up to the Hold button and stops; the HUMAN presses Hold; the runner reads the held
// state (read-only); then it opens My Bookings and stops again; the HUMAN presses "Pay And Book" on that
// booking's row, reads the popup and presses Pay; the runner then reads the paid state. Execution Safety forbids
// HOLD / TICKET / PAYMENT / WALLET_CHARGE for the runner absolutely — the human presses each one.
//
//   TC-HLD-005  extras chosen before holding are kept on the held booking (needs Meal + Baggage + Seat)
//   TC-PAH-002  paying takes exactly the booking amount from the wallet; the Statement shows one debit
//   TC-PAH-003  a price change between hold and payment is shown before paying
//   TC-PAH-004  after payment the e-ticket is issued and matches the booking
//
// Proven by hand on OmanAir, 2026-10-19 (order UAV5U6, PNR O24S21): the booking page offers Book · Hold ·
// Save Quote; a hold charges nothing; the confirmation reads "on hold … last ticketing date"; My Bookings then offers
// "Pay And Book" on the row, which opens a "Flight Details" popup (Segment · Fare & Baggage · Passenger tabs and the
// payment method — Wallet, or the bank at ~2% more) with a "Pay" button. The payment method must stay on Wallet.
// (The sheet's Notes still say "Draft 27 Sep … Review = Pending" on these cases, but their Review column is Approved.)

const P = require('./postbook');

const PAX = { adults: 1, children: 0, infants: 0 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 170}`); };
const fmt2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function dashboardCounts(c) {
  await P.go(c, '/dashboard', 2500);
  const m = (await c.ui.text(c.page)).match(/(\d+) TOTAL FLIGHTS (\d+) PENDING (\d+) TICKETED/i);
  return m ? { total: +m[1], pending: +m[2], ticketed: +m[3], text: m[0] } : { text: 'not shown' };
}

/** Everything read about the order from the booking-details page: status, flights, passenger rows, costing. */
async function readDetails(c, orderId) {
  const it = await P.readItinerary(c, orderId);
  const cost = await P.readCosting(c, orderId);
  const t = it.text || '';
  return {
    status: (t.match(/Trip Type \w+(?: \w+)? Status ([A-Za-z ]+?) Airline PNR/) || [])[1] || null,
    flights: [...t.matchAll(/Flight Detail ([A-Z]{3}) - ([A-Z]{3}) \( ([A-Z0-9]{2}) - (\d+) \)/g)].map((m) => `${m[3]} ${m[4]} ${m[1]}-${m[2]}`),
    paxStatus: (it.passengers.match(/(ON HOLD|BOOKED|CONFIRMED|TICKETED)\b/) || [])[1] || null,
    ticket: (it.passengers.match(/\b(\d{10,})\b/) || [])[1] || null,
    total: cost.bookingAmount,
    text: t,
  };
}

const steps = [
  {
    name: 'Build the booking up to Hold, and the human presses Hold',
    always: true,
    critical: true,
    cases: [],
    assisted: 'Hold',
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const days = (s.hold && s.hold.daysFromToday) || s.daysFromToday;
      c.state.walletBefore = await P.readWallet(c);
      c.state.dashBefore = await dashboardCounts(c);
      const srch = await U.search(p, c.baseUrl, { ...s, daysFromToday: days }, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 120000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const { travellers } = await U.fillPassengers(p, { ...s, criteria: { adults: [{}] } }, PAX, freshDocs(1));
      c.state.travellers = travellers;
      if (await U.hasBundleStep(p)) { const names = await U.bundleNames(p); await U.chooseBundle(p, names[0], names); }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);

      // TC-HLD-005 — runs only when the run's Capability Plan keeps it (the sheet says it Requires Hold + Seat +
      // Meal + Baggage, so a supplier without all four has it excluded and `c.wants` is false). A seat, a meal and
      // a bag are chosen BEFORE holding; the held booking is read afterwards.
      const chosen = {};
      if (c.wants('TC-HLD-005')) {
        const adult = travellers[0];
        if (c.capabilities.Seat === 'Supported') {
          await U.openMap(p);
          await U.activate(p, adult.name);
          const [n] = U.plainSeats(await U.readSeats(p), 1, {});
          if (n) { await U.bookSeat(p, n, adult.firstName); chosen.seat = n; }
          await U.confirmSeats(p);
        }
        if (c.capabilities.Meal === 'Supported') {
          const opts = (await U.dropdownOptionsAt(p, 'Choose a meal', 0).catch(() => [])).filter((o) => !/ 0(\.0+)? [A-Z]{3} /.test(o));
          if (opts[0]) { chosen.meal = opts[0].split(' ')[0]; await U.chooseOption(p, 'Choose a meal', chosen.meal); }
        }
        if (c.capabilities.Baggage === 'Supported') {
          const opts = await U.dropdownOptionsAt(p, 'Choose a baggage', 0).catch(() => []);
          if (opts[0]) { chosen.bag = opts[0].split(' - ')[0]; await U.chooseOption(p, 'Choose a baggage', chosen.bag); }
        }
        const bt = await U.text(p);
        const line = (re) => { const m = bt.match(re); return m ? P.money(m[1]) : 0; };
        chosen.prices = { seat: line(/Seat Selection \+ ([\d,.]+)/), meal: line(/Meal Preference \+ ([\d,.]+)/), bag: line(/Extra Baggage \+ ([\d,.]+)/) };
      }
      c.state.chosen = chosen;
      const t = await U.text(p);
      c.state.quote = P.money((t.match(/Net Payable Amount: ([\d,.]+)/) || [])[1] || 0);
      if (!(await p.getByRole('button', { name: 'Hold', exact: true }).count())) throw new Error('this booking page offers no Hold button — Hold is not supported for this supplier/flight');
      c.env('Before Hold', `${travellers[0].name}${chosen.seat || chosen.meal || chosen.bag ? ` (seat ${chosen.seat || '-'}, meal ${chosen.meal || '-'}, bag ${chosen.bag || '-'})` : ''} · quote ${fmt2(c.state.quote)} · wallet ${c.state.walletBefore.text} · Dashboard ${c.state.dashBefore.text}`);

      await c.humanGate({
        allow: [/^hold$/i],
        until: /booking-confirmation/,
        prompt: `Group 17 is ready. Press HOLD in the browser window now (quote ${fmt2(c.state.quote)}). A hold should not charge the wallet.`,
      });
      c.state.held = await P.readConfirmation(c);
      c.env('After Hold', `order ${c.state.held.orderId} · ref ${c.state.held.ref} · PNR ${c.state.held.pnr} · status ${c.state.held.status}`);
      if (!/hold/i.test(c.state.held.status || '')) throw new Error(`the booking is not On Hold (status "${c.state.held.status}")`);
    },
  },
  {
    name: 'The held booking, read before paying',
    always: true,
    cases: ['TC-HLD-005'],
    async run(c) {
      const { held, quote, walletBefore } = c.state;
      const d = await readDetails(c, held.orderId);
      const wallet = await P.readWallet(c);
      const row = await P.myBookingsRow(c, held.orderId);
      const dash = await dashboardCounts(c);
      const eticket = await P.readEticket(c, held.orderId);
      const bookingRep = await P.searchReportToday(c, '/reports/booking');
      c.state.heldRead = { details: d, wallet, row, dash, eticketText: eticket.text.slice(0, 300), inBookingReport: bookingRep.includes(held.ref) };
      c.env('Held state', `details status "${d.status}", passenger "${d.paxStatus}", total ${d.total} (quote ${fmt2(quote)}) · wallet ${walletBefore.text} → ${wallet.text} · My Bookings action ${row && /Pay And Book/.test(row.text) ? '"Pay And Book"' : 'none'} · Dashboard ${dash.text} · Booking report ${bookingRep.includes(held.ref) ? 'lists it' : 'does NOT list it'}`);
      const ch = c.state.chosen || {};
      if (c.wants('TC-HLD-005')) {
        if (!(ch.seat || ch.meal || ch.bag)) {
          await c.inconclusive('TC-HLD-005', 'No seat, meal or bag could be chosen before holding on this booking — nothing to carry onto the held booking.');
        } else {
          const it = await P.readItinerary(c, held.orderId);
          const leg = (it.journeys[0] && it.journeys[0].flights[0]) || {};
          const mine = P.itineraryFor(it, c.state.travellers, c.state.travellers[0], leg.from, leg.to);
          const kg = ch.bag ? (ch.bag.match(/\d+\s?Kg/i) || [ch.bag])[0] : null;
          const cost = await P.readCosting(c, held.orderId);
          const parts = [
            ch.seat ? [`seat ${ch.seat}`, mine.includes(`Seat ${ch.seat} `)] : null,
            ch.meal ? [`meal ${ch.meal}`, mine.includes(` ${ch.meal}`)] : null,
            kg ? [`bag ${kg}`, mine.includes(kg)] : null,
          ].filter(Boolean);
          const kept = parts.filter(([, ok]) => ok); const lost = parts.filter(([, ok]) => !ok);
          const stated = /cannot be held|can not be held|not (?:held|kept)|not available on hold|removed/i.test(`${held.text} ${it.text}`);
          const ssr = cost.ssrAmount || 0;
          const expected = (ch.prices.seat || 0) + (ch.prices.meal || 0) + (ch.prices.bag || 0);
          const ev = `Chosen before Hold: ${parts.map(([n]) => n).join(', ')} (${fmt2(expected)} of extras). The held booking's itinerary keeps: ${kept.map(([n]) => n).join(', ') || 'none'}${lost.length ? `; MISSING: ${lost.map(([n]) => n).join(', ')}${stated ? ' — the page says so' : ' — with NO message'}` : ''}. Costing SSR amount ${fmt2(ssr)}.`;
          if (!lost.length && P.near(ssr, expected, 0.6)) await c.pass('TC-HLD-005', ev);
          else if (lost.length && stated) await c.pass('TC-HLD-005', `${ev} Extras the airline cannot hold are reported, as the case allows.`);
          else await c.fail('TC-HLD-005', ev);
        }
      }
      if (/booking is confirmed/i.test(eticket.text)) c.env('Observation', 'the e-ticket page of this HELD booking says "Congratulations! Your flight booking is confirmed" — misleading while it is only On Hold');
      if (!row || !/Pay And Book/.test(row.text)) throw new Error('My Bookings offers no "Pay And Book" on the held booking');
    },
  },
  {
    name: 'The human pays the held booking (Pay And Book, then Pay on Wallet)',
    cases: ['TC-PAH-002', 'TC-PAH-003', 'TC-PAH-004'],
    assisted: 'Pay',
    async run(c) {
      const U = c.ui; const p = c.page;
      const { held, quote, walletBefore } = c.state;
      await P.readMyBookings(c); // the held booking's row, with its Pay And Book
      const orderId = held.orderId;
      await c.humanGate({
        allow: [/^pay and book$/i, /^pay$/i],
        untilFn: (o) => { const r = [...document.querySelectorAll('tr')].find((tr) => tr.innerText.includes(o)); return !!r && !/Pay And Book/.test(r.innerText) && !document.querySelector('.p-sidebar-active, .p-dialog'); },
        untilArg: orderId,
        prompt: `Press "Pay And Book" on order ...${orderId.slice(-6)}, check the popup, keep the payment method on WALLET (the bank costs ~2% more), then press PAY. It charges ${fmt2(quote)}.`,
      });
      await U.wait(p, 3000);

      const d = await readDetails(c, orderId);
      const wallet = await P.readWallet(c);
      const dash = await dashboardCounts(c);
      const et = await P.readEticket(c, orderId);
      const drop = walletBefore.amount - wallet.amount;
      const total = P.money((et.fare.total != null ? et.fare.total : d.total) || 0);

      // PAH-002: exactly the booking amount; the Statement shows one debit (it updates hourly).
      const stmt = await P.searchReportToday(c, '/reports/statement');
      const upd = (stmt.match(/Latest updated Date & Time is: (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/) || [])[1] || null;
      const pi = stmt.indexOf(held.pnr);
      const debits = pi >= 0 ? (stmt.match(new RegExp(held.pnr, 'g')) || []).length : 0;
      const walletOk = P.near(drop, quote);
      const stmtNote = pi >= 0 ? `Statement lists ${held.pnr} (${debits} row(s))` : `Statement (updated ${upd || '?'}) does not list ${held.pnr} yet — it updates hourly, recheck after the next update`;
      if (walletOk && pi >= 0) await c.pass('TC-PAH-002', `Wallet ${walletBefore.text} → ${wallet.text}: a drop of ${fmt2(drop)} against ${fmt2(quote)} shown when paying. ${stmtNote}.`);
      else if (!walletOk) await c.fail('TC-PAH-002', `Wallet ${walletBefore.text} → ${wallet.text}: a drop of ${fmt2(drop)}, but ${fmt2(quote)} was shown when paying. ${stmtNote}.`);
      else await c.inconclusive('TC-PAH-002', `Wallet ${walletBefore.text} → ${wallet.text}: exactly ${fmt2(drop)} = the ${fmt2(quote)} shown when paying (the wallet half is right). ${stmtNote}.`);

      // PAH-003: only meaningful if the price changed between hold and payment — it cannot be made to.
      const changed = !P.near(d.total || 0, quote);
      if (changed) await c.fail('TC-PAH-003', `The price changed between hold (${fmt2(quote)}) and payment (${d.total}); this check could not see whether the new price was shown first — confirm in the pay popup by hand.`);
      else await c.inconclusive('TC-PAH-003', `The price did not change between hold and payment (${fmt2(quote)} at hold, ${d.total} charged) — the held price was charged, as the case says; the changed-price path was not exercised (a price change cannot be forced).`);

      // PAH-004: e-ticket issued and matches the booking.
      const held0 = c.state.heldRead.details;
      const sameFlights = JSON.stringify(held0.flights) === JSON.stringify(d.flights);
      const issued = d.status === 'Booked' && d.paxStatus === 'BOOKED' && !!d.ticket;
      const fareOk = P.near(total, quote, 0.11);
      const paxOk = et.passengers.includes(c.state.travellers[0].name) && (!d.ticket || et.passengers.includes(d.ticket));
      await c.check('TC-PAH-004', issued && sameFlights && fareOk && paxOk,
        `After payment: details status "${d.status}", passenger "${d.paxStatus}", ticket number ${d.ticket || 'NONE'}; flights ${d.flights.join(' + ')}${sameFlights ? ' (same as held)' : ' — DIFFER from the held booking'}; e-ticket total ${total} vs quote ${fmt2(quote)}; e-ticket passenger row ${paxOk ? 'carries the name and ticket number' : 'is missing the name or ticket number'}. Dashboard ${c.state.heldRead.dash.text} → ${dash.text}.`);

      // The reports after payment (read-only, matched by this booking's own keys).
      const bk = await P.searchReportToday(c, '/reports/booking');
      const bi = bk.indexOf(held.ref);
      const invoice = bi >= 0 ? (bk.slice(bi, bi + 200).match(/\bINV[A-Z]*\d+\w*/) || [])[0] : null;
      const sales = await P.searchReportToday(c, '/reports/sales');
      const si = invoice ? sales.indexOf(invoice) : -1;
      c.env('Reports after payment', `Booking report ${bi >= 0 ? `lists ${held.ref}${invoice ? ` (invoice ${invoice})` : ' without an invoice'}` : 'does NOT list it'} · Sales ${si >= 0 ? `row for ${invoice}: "${sales.slice(si, si + 130)}"` : 'no row for its invoice'} · Statement updated ${upd || '?'} ${pi >= 0 ? 'lists the PNR' : 'does not list the PNR yet'}`);
    },
  },
];

module.exports = {
  id: '17', pax: PAX, assisted: 'Hold and Pay', steps,
  notAutomated: {},
};
