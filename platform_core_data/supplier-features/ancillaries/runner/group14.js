'use strict';
// Ancillaries — Setup Group 14: a real booking (1 adult + 1 child + 1 infant) with a seat, a meal and a bag,
// then 15 read-only checks on the confirmation page, e-ticket, wallet, My Bookings and the reports.
// SPENDS REAL MONEY. ASSISTED: the runner builds the booking up to Book and stops; the HUMAN presses Book in
// the window (Execution Safety forbids BOOK / PAYMENT / WALLET_CHARGE for the runner absolutely — human
// decision, 2026-10-19: "run the script until the Book, I click Book, then you continue"). Everything after
// Book is read-only. Built from the hand-run of 2026-10-19 (booking UY38MC — all 15 passed).
//
// The same passengers on the same flight twice is refused as a duplicate booking — `settings.booking.
// daysFromToday` moves this group's date away from earlier bookings.

const P = require('./postbook');

const PAX = { adults: 1, children: 1, infants: 1 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 140}`); };
const CASES = ['TC-SM-CNF-001', 'TC-SM-CNF-002', 'TC-SM-CNF-003', 'TC-SM-CNF-004', 'TC-SM-CNF-007', 'TC-SM-CNF-008', 'TC-SM-CNF-010',
  'TC-SM-CNF-011', 'TC-SM-CNF-012', 'TC-ML-005', 'TC-BG-005', 'TC-RPT-001', 'TC-RPT-002', 'TC-RPT-003', 'TC-RPT-004'];
const fmt2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = (a) => a.reduce((x, y) => x + y, 0);

/** Step 2's Fare Breakdown, before Book. */
function readBreakdown(t) {
  const per = (re) => [...t.matchAll(re)].map((m) => ({ type: m[1], amount: P.money(m[2]) }));
  const one = (re) => { const m = t.match(re); return m ? P.money(m[1]) : 0; };
  return {
    base: per(/Base fare: \(\d+ (Adult|Child|Infant)\) ([\d,.]+)/g),
    taxes: per(/Tax & Fees: \(\d+ (Adult|Child|Infant)\) ([\d,.]+)/g),
    bundle: one(/Bundle Fare \+ ([\d,.]+)/), seat: one(/Seat Selection \+ ([\d,.]+)/),
    meal: one(/Meal Preference \+ ([\d,.]+)/), baggage: one(/Extra Baggage \+ ([\d,.]+)/),
    total: one(/Total Amount: ([\d,.]+)/), net: one(/Net Payable Amount: ([\d,.]+)/),
  };
}

/** The passenger table split per traveller (each name up to the next one). */
function perTraveller(section, travellers) {
  const out = {};
  const idx = travellers.map((t) => ({ t, i: section.indexOf(t.name) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  // Each row ends at the next traveller — or, for the last one, where the passenger table ends (the Extra
  // Baggage and Bundle Details cards follow it; "(BULK)" there once read as a meal code — 2026-10-19).
  const end = [" Extra Baggage ", " Bundle Details "].map((m) => section.indexOf(m)).filter((i) => i > 0);
  const tableEnd = end.length ? Math.min(...end) : section.length;
  idx.forEach((x, k) => { out[x.t.type] = section.slice(x.i, k + 1 < idx.length ? idx[k + 1].i : tableEnd); });
  return out;
}

const steps = [
  {
    name: 'Build the booking up to Book (seat, meal, bag) and take the pre-Book snapshot',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const days = (s.booking && s.booking.daysFromToday) || s.daysFromToday;
      c.state.walletBefore = await P.readWallet(c);
      const srch = await U.search(p, c.baseUrl, { ...s, daysFromToday: days }, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 120000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      c.env('Search', `${s.from}→${s.to}, 1 adult + 1 child + 1 infant · ${days} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const { travellers } = await U.fillPassengers(p, { ...s, criteria: { adults: [{}], children: [{}], infants: [{}] } }, PAX, freshDocs(3));
      c.state.travellers = travellers;
      const adult = travellers.find((t) => t.type === 'Adult');

      // A package that charges for seats, so the seat line on the confirmation is a real amount.
      let pkg = null;
      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        for (const n of names) {
          await U.chooseBundle(p, n, names); pkg = n;
          if (!/Seat selection: All seats/i.test(await U.bundleServices(p, n))) break;
        }
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);

      const chosen = {};
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
      c.state.chosen = chosen;
      c.state.pre = readBreakdown(await U.text(p));
      c.env('Before Book', `${travellers.map((t) => `${t.name} (${t.type})`).join(' · ')} · package ${pkg || 'none'} · ${adult.name}: seat ${chosen.seat || '-'}, meal ${chosen.meal || '-'}, bag ${chosen.bag || '-'} · quote ${fmt2(c.state.pre.net)} (breakdown total ${fmt2(c.state.pre.total)}) · wallet ${c.state.walletBefore.text}`);

      await c.humanGate({
        allow: [/^book$/i],
        until: /booking-confirmation/,
        prompt: `Group 14 is ready. Press BOOK in the browser window now (quote ${fmt2(c.state.pre.net)}). It spends real money.`,
      });
      c.state.conf = await P.readConfirmation(c);
      c.env('After Book', `order ${c.state.conf.orderId} · ref ${c.state.conf.ref} · PNR ${c.state.conf.pnr} · status ${c.state.conf.status}`);
      if (c.state.conf.duplicate) throw new Error('the Portal refused it as a duplicate of an existing booking (same passengers on the same flight) — set settings.booking.daysFromToday to another day and run again');
      if (c.state.conf.status !== 'Confirmed') throw new Error(`the booking is not Confirmed (status "${c.state.conf.status}"${c.state.conf.airlineError ? `: ${c.state.conf.airlineError}` : ''})`);
    },
  },
  {
    name: 'Confirmation page and e-ticket',
    cases: ['TC-SM-CNF-001', 'TC-SM-CNF-002', 'TC-SM-CNF-003', 'TC-SM-CNF-004', 'TC-SM-CNF-007', 'TC-SM-CNF-008', 'TC-ML-005', 'TC-BG-005'],
    async run(c) {
      const { conf, pre, chosen, travellers } = c.state;
      const f = conf.fare;
      await c.check('TC-SM-CNF-001', P.near(f.total, pre.net, 0.11), `Quoted ${fmt2(pre.net)}; confirmation Total Amount ${f.total}.`);
      const base = sum(pre.base.map((x) => x.amount)); const tax = sum(pre.taxes.map((x) => x.amount));
      await c.check('TC-SM-CNF-002', P.near(f.base, base) && P.near(f.taxes, tax),
        `Booking screen: base ${pre.base.map((x) => `${x.type} ${x.amount}`).join(', ')} = ${fmt2(base)}; taxes ${pre.taxes.map((x) => `${x.type} ${x.amount}`).join(', ')} = ${fmt2(tax)}. Confirmation: Base fare ${f.base}, Taxes ${f.taxes}.`);
      const lines = [['Meal', pre.meal, f.meal], ['Seat', pre.seat, f.seat], ['Baggage', pre.baggage, f.baggage], ['Bundle', pre.bundle, f.bundle]].filter(([, q]) => q > 0);
      await c.check('TC-SM-CNF-003', lines.every(([, q, cf]) => P.near(q, cf || 0)), `Each chosen extra on its own line, quoted → confirmed: ${lines.map(([n, q, cf]) => `${n} ${q} → ${cf}`).join(', ') || 'none chosen'}.`);
      const rows = perTraveller(conf.passengers, travellers);
      const seatRe = /\(\d+[A-Z]\)/;
      if (chosen.seat) {
        await c.check('TC-SM-CNF-004', (rows.Adult || '').includes(`(${chosen.seat})`) && !seatRe.test(rows.Child || '') && !seatRe.test(rows.Infant || ''),
          `Passenger table: adult row ${(rows.Adult || '').includes(`(${chosen.seat})`) ? `shows seat ${chosen.seat}` : `does NOT show seat ${chosen.seat}`}; child and infant rows ${!seatRe.test(rows.Child || '') && !seatRe.test(rows.Infant || '') ? 'show no seat' : 'SHOW A SEAT'}.`);
      }
      await c.check('TC-SM-CNF-007', !seatRe.test(rows.Infant || '') && !/\([A-Z]{4}\)/.test(rows.Infant || ''),
        `Infant row: "${(rows.Infant || '').slice(0, 140)}" — no seat and no meal, as an infant holds none.`);
      const et = await P.readEticket(c, conf.orderId);
      const keys = ['base', 'taxes', 'meal', 'seat', 'baggage', 'bundle', 'total'];
      const diff = keys.filter((k) => (f[k] || 0) !== (et.fare[k] || 0));
      const same = diff.length === 0 && (!chosen.seat || et.passengers.includes(`(${chosen.seat})`)) && (!chosen.meal || et.passengers.includes(`(${chosen.meal})`));
      await c.check('TC-SM-CNF-008', same, `E-ticket (/e-ticket/${conf.orderId}) against the confirmation — fare lines ${diff.length ? `DIFFER: ${diff.map((k) => `${k} ${f[k]} vs ${et.fare[k]}`).join(', ')}` : `identical (${keys.map((k) => `${k} ${f[k] || 0}`).join(', ')})`}; seat and meal ${same ? 'on both' : 'not matching'}.`);
      // My Bookings → Itinerary Details (human, 2026-10-19: check the itinerary too). One-way: one journey.
      const it = await P.readItinerary(c, conf.orderId);
      const adult = travellers.find((t) => t.type === 'Adult');
      const leg = (it.journeys[0] && it.journeys[0].flights[0]) || {};
      const itAdult = P.itineraryFor(it, travellers, adult, leg.from, leg.to);
      if (chosen.seat) {
        const others = travellers.filter((t) => t.type !== 'Adult').some((t) => /Seat \d+[A-Z] /.test(P.itineraryFor(it, travellers, t, leg.from, leg.to)));
        await c.check('TC-SM-CNF-004', itAdult.includes(`Seat ${chosen.seat} `) && !others,
          `Itinerary (${leg.from}-${leg.to}): the adult ${itAdult.includes(`Seat ${chosen.seat} `) ? `has seat ${chosen.seat}` : `does NOT show seat ${chosen.seat}`}; the child and infant ${others ? 'SHOW A SEAT' : 'show none'}.`);
      }
      if (chosen.meal) {
        const onIt = itAdult.includes(` ${chosen.meal}`);
        await c.check('TC-ML-005', conf.passengers.includes(`(${chosen.meal})`) && et.passengers.includes(`(${chosen.meal})`) && onIt, `Meal ${chosen.meal} against the adult on the confirmation, the e-ticket and the itinerary${onIt ? '' : ' (NOT on the itinerary)'}.`);
      }
      if (chosen.bag) {
        const kg = (chosen.bag.match(/\d+\s?Kg/i) || [chosen.bag])[0];
        const onIt = itAdult.includes(kg);
        await c.check('TC-BG-005', conf.extraBaggage.includes(kg) && et.extraBaggage.includes(kg) && onIt, `Extra baggage ${chosen.bag}: confirmation "${conf.extraBaggage.slice(0, 80)}", e-ticket "${et.extraBaggage.slice(0, 80)}", itinerary ${onIt ? 'under the adult' : 'MISSING'}.`);
      }
    },
  },
  {
    name: 'Wallet, My Bookings and the Costing tab',
    cases: ['TC-SM-CNF-010', 'TC-SM-CNF-011', 'TC-SM-CNF-012', 'TC-RPT-001'],
    async run(c) {
      const { conf, walletBefore } = c.state;
      const total = conf.fare.total;
      const after = await P.readWallet(c);
      await c.check('TC-SM-CNF-010', P.near(walletBefore.amount - after.amount, total), `Wallet ${walletBefore.text} → ${after.text}: a drop of ${fmt2(walletBefore.amount - after.amount)} against a total of ${total}.`);
      const cost = await P.readCosting(c, conf.orderId);
      await c.check('TC-SM-CNF-011', P.near(cost.bookingAmount || 0, total),
        `Costing tab: Total Booking Amount ${cost.bookingAmount}, Total Sales Amount ${cost.salesAmount}, Total Net Amount ${cost.netAmount}, Total SSR Amount ${cost.ssrAmount} — against the confirmed ${total}.`);
      const row = await P.myBookingsRow(c, conf.orderId);
      const listTotal = row ? P.money((row.text.match(/([\d,.]+) [A-Z]{3}\s*$/) || [])[1] || 0) : null;
      const fareOnly = (conf.fare.base || 0) + (conf.fare.taxes || 0);
      await c.check('TC-SM-CNF-012', !!row && P.near(listTotal, fareOnly, 0.6) && P.near(cost.bookingAmount || 0, total),
        `My Bookings list shows ${listTotal} for this order — the fare only (base ${conf.fare.base} + taxes ${conf.fare.taxes} = ${fmt2(fareOnly)}), as the case says it should; the Costing tab shows the amount charged, ${cost.bookingAmount}.`);
      await c.check('TC-RPT-001', !!row, row ? `My Bookings lists ${conf.orderId} (ref ${conf.ref}).` : `${conf.orderId} is NOT on My Bookings.`);
    },
  },
  {
    name: 'Reports: Booking, Sales and Statement',
    cases: ['TC-RPT-001', 'TC-RPT-002', 'TC-RPT-003', 'TC-RPT-004'],
    async run(c) {
      // Rows are matched by THIS booking's own keys — never by amount alone: two bookings on one day can cost
      // exactly the same (proven 2026-10-19: UY38MC and W9R33P were both 18,848.00).
      const { conf } = c.state;
      const total = fmt2(conf.fare.total);
      const booking = await P.searchReportToday(c, '/reports/booking', { ref: conf.ref });
      const at = booking.indexOf(conf.ref);
      // The row reads "<ref> <invoice> <customer> …": the invoice is the first one AFTER the ref (looking
      // before it picks up the previous row's — proven 2026-10-19).
      const invoice = at >= 0 ? (booking.slice(at, at + 200).match(/\bINV[A-Z]*\d+\w*/) || [])[0] || null : null;
      await c.check('TC-RPT-001', at >= 0, `Booking report, today${at >= 0 ? `, finds ${conf.ref}${invoice ? ` (invoice ${invoice})` : ''}` : `: ${conf.ref} NOT found`}.`);
      const sales = await P.searchReportToday(c, '/reports/sales');
      const si = invoice ? sales.indexOf(invoice) : -1;
      const salesRow = si >= 0 ? sales.slice(si, si + 220) : '';
      const inSales = salesRow.includes(total);
      const salesEv = !invoice ? 'the Booking report gave no invoice number to find this booking\'s Sales row by'
        : si < 0 ? `no Sales row for invoice ${invoice}` : `invoice ${invoice}: "${salesRow.slice(0, 160)}"`;
      await c.check('TC-RPT-003', inSales, `Sales report, today — ${salesEv}. ${inSales ? `Shows ${total}, the amount charged — same as the confirmation, e-ticket and Costing tab.` : `Does not show ${total}.`}`);
      await c.check('TC-RPT-004', inSales, `Sales row for invoice ${invoice || '?'}: ${inSales ? `${total} includes the extras (meal ${conf.fare.meal || 0}, seat ${conf.fare.seat || 0}, bag ${conf.fare.baggage || 0}, bundle ${conf.fare.bundle || 0}) — not fare-only` : 'the charged total was not found there, so the extras cannot be traced'}.`);
      // The Statement report updates hourly and says when, after a search: "Latest updated Date & Time is:
      // 2026-10-19 16:05:00.0" (server local time, like the confirmation's Booking Date). A booking made after
      // that cannot be there yet — that is not a fault; one made before it and still missing is.
      const stmt = await P.searchReportToday(c, '/reports/statement');
      const pi = stmt.indexOf(conf.pnr);
      const stmtRows = pi >= 0 ? stmt.slice(pi, pi + 900) : '';
      const upd = (stmt.match(/Latest updated Date & Time is: (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/) || [])[1] || null;
      const bookedAt = conf.bookedAt; // "YYYY-MM-DD HH:MM", from the confirmation page
      const upToDate = upd && bookedAt ? upd >= bookedAt : null;
      const when = `last updated ${upd || '?'}, booked ${bookedAt || '?'}`;
      if (pi >= 0 && stmtRows.includes(total)) await c.pass('TC-RPT-002', `Statement report, today (${when}): PNR ${conf.pnr} is listed with debit ${total}.`);
      else if (pi >= 0) await c.fail('TC-RPT-002', `Statement report, today (${when}): PNR ${conf.pnr} is listed but not with ${total}: "${stmtRows.slice(0, 200)}".`);
      else if (upToDate === true) await c.fail('TC-RPT-002', `Statement report, today (${when}): updated AFTER the booking, yet PNR ${conf.pnr} is missing.`);
      else await c.inconclusive('TC-RPT-002', `Statement report, today (${when}): PNR ${conf.pnr} not there yet — the report was last updated before this booking (it updates hourly). Recheck after the next update.`);
    },
  },
];

module.exports = { id: '14', pax: PAX, assisted: 'Book', steps, notAutomated: {}, cases: CASES };
