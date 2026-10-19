'use strict';
// Ancillaries — Setup Group 15: a real MULTI-CITY booking with seats and extras on several flights.
// SPENDS REAL MONEY. ASSISTED: the runner builds the booking up to Book and stops; the HUMAN presses Book
// in the window (human decision, 2026-10-19). Everything after Book is read-only.
//
//   TC-SM-MCT-004  a seat booked on one flight never appears against another
//   TC-SM-MCT-005  seats and ancillaries survive to the confirmation page per flight; the total is the sum
//
// Route: `settings.bookingMultiCity` (falls back to `multiCity`). The same passengers on the same flight
// twice is refused as a duplicate booking (proven live 2026-10-19) — keep this route's dates clear of
// earlier bookings. Built from the hand-run of 2026-10-19 (booking RIUYME — both passed).

const P = require('./postbook');
const { reachStep2 } = require('./multicity');

const PAX = { adults: 1, children: 1, infants: 1 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 150}`); };
const fmt2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CARD_RE = /([A-Z0-9]{2})(\d{1,4}) · (\S+)/;

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
/** "XY 4 - AvailablePaid - (Aisle seat) (14D)" — the seat sits against its own flight number. */
const seatOnFlight = (txt, air, num, seat) => new RegExp(`${air}\\s?${num}\\s?- [^()]*\\([^)]*\\) \\(${seat}\\)`).test(txt);

const steps = [
  {
    name: 'Build the multi-city booking up to Book (seats on every flight, a meal, a bag)',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      c.state.walletBefore = await P.readWallet(c);
      await reachStep2(c, PAX, freshDocs, s.bookingMultiCity ? 'bookingMultiCity' : 'multiCity');
      const { travellers } = c.state;
      const adult = travellers.find((t) => t.type === 'Adult');
      const child = travellers.find((t) => t.type === 'Child');

      // Seats: the adult on every flight; the child too on the second flight (two travellers on one map).
      const flights = (await U.openerTexts(p)).length;
      const picks = []; // { air, num, flight, who, seat }
      for (let i = 0; i < flights; i += 1) {
        await U.openMapAt(p, i);
        const mt = await U.mapText(p);
        const card = mt.match(CARD_RE) || [];
        const route = mt.match(/Seat Map · ([A-Z]{3}) → ([A-Z]{3})/) || [];
        const taken = [];
        for (const t of (i === 1 && child ? [adult, child] : [adult])) {
          await U.activate(p, t.name);
          const [n] = U.plainSeats(await U.readSeats(p), 1, { exclude: taken });
          if (!n) continue;
          await U.bookSeat(p, n, t.firstName);
          taken.push(n);
          picks.push({ air: card[1], num: card[2], flight: `${card[1]} ${card[2]}`, from: route[1], to: route[2], who: t, seat: n });
        }
        await U.confirmSeats(p);
      }
      // A meal on the first flight and a bag on the last journey, both for the adult.
      const chosen = {};
      if (c.capabilities.Meal === 'Supported') {
        const opts = (await U.dropdownOptionsAt(p, 'Choose a meal', 0).catch(() => [])).filter((o) => !/ 0(\.0+)? [A-Z]{3} /.test(o));
        if (opts[0]) {
          await U.dropdownAt(p, 'Choose a meal', 0).click(); await U.wait(p, 350);
          await p.getByRole('option', { name: new RegExp(U.esc(opts[0].split(' ')[0])) }).filter({ visible: true }).first().click(); await U.wait(p, 800);
          chosen.meal = opts[0].split(' ')[0];
        }
      }
      if (c.capabilities.Baggage === 'Supported') {
        const bagBoxes = await U.dropdownCount(p, 'Choose a baggage');
        const journeysPerPax = bagBoxes / (PAX.adults + PAX.children);
        const last = Math.max(0, journeysPerPax - 1); // the adult's boxes come first
        const opts = await U.dropdownOptionsAt(p, 'Choose a baggage', last).catch(() => []);
        if (opts[0]) {
          await U.dropdownAt(p, 'Choose a baggage', last).click(); await U.wait(p, 350);
          await p.getByRole('option').filter({ visible: true }).first().click(); await U.wait(p, 800);
          chosen.bag = opts[0].split(' - ')[0];
        }
      }
      const t = await U.text(p);
      c.state.picks = picks; c.state.chosen = chosen;
      c.state.quote = P.money((t.match(/Net Payable Amount: ([\d,.]+)/) || [])[1] || 0);
      c.env('Before Book', `seats ${picks.map((x) => `${x.flight} ${x.who.firstName} ${x.seat}`).join(', ')} · meal ${chosen.meal || '-'} · bag ${chosen.bag || '-'} · quote ${fmt2(c.state.quote)} · wallet ${c.state.walletBefore.text}`);

      await c.humanGate({
        allow: [/^book$/i],
        until: /booking-confirmation/,
        prompt: `Group 15 is ready. Press BOOK in the browser window now (quote ${fmt2(c.state.quote)}). It spends real money.`,
      });
      c.state.conf = await P.readConfirmation(c);
      c.env('After Book', `order ${c.state.conf.orderId} · ref ${c.state.conf.ref} · PNR ${c.state.conf.pnr} · status ${c.state.conf.status}`);
      if (c.state.conf.duplicate) throw new Error('the Portal refused it as a duplicate of an existing booking — move settings.bookingMultiCity to other dates and run again');
      if (c.state.conf.status !== 'Confirmed') throw new Error(`the booking is not Confirmed (status "${c.state.conf.status}"${c.state.conf.airlineError ? `: ${c.state.conf.airlineError}` : ''})`);
    },
  },
  {
    name: 'Every seat and extra against the right flight and passenger, on the confirmation and the e-ticket',
    cases: ['TC-SM-MCT-004', 'TC-SM-MCT-005'],
    async run(c) {
      const { conf, picks, chosen, travellers, quote, walletBefore } = c.state;
      const et = await P.readEticket(c, conf.orderId);
      const check = (section) => {
        const rows = perTraveller(section, travellers);
        const misses = picks.filter((x) => !seatOnFlight(rows[x.who.type] || '', x.air, x.num, x.seat));
        const shown = (section.match(/\(\d+[A-Z]\)/g) || []).length;
        return { misses, shown };
      };
      const a = check(conf.passengers); const b = check(et.passengers);
      // My Bookings → Itinerary Details: per journey, per leg, per traveller (human, 2026-10-19: check the itinerary too).
      const it = await P.readItinerary(c, conf.orderId);
      const itMiss = picks.filter((x) => !P.itineraryFor(it, travellers, x.who, x.from, x.to).includes(`Seat ${x.seat} `));
      const ok4 = !a.misses.length && !b.misses.length && !itMiss.length && a.shown === picks.length && b.shown === picks.length;
      await c.check('TC-SM-MCT-004', ok4,
        `Seats chosen: ${picks.map((x) => `${x.flight} ${x.who.name} ${x.seat}`).join(', ')}. Confirmation ${a.misses.length ? `MISSES ${a.misses.map((x) => `${x.flight} ${x.seat}`).join(', ')}` : 'shows each against its own flight and passenger'} (${a.shown} seat(s) listed); e-ticket ${b.misses.length ? `MISSES ${b.misses.map((x) => `${x.flight} ${x.seat}`).join(', ')}` : 'the same'} (${b.shown} listed); itinerary ${itMiss.length ? `MISSES ${itMiss.map((x) => `${x.flight} ${x.who.name} ${x.seat}`).join(', ')}` : 'shows each under its own journey, leg and passenger'}.`);

      const f = conf.fare;
      const parts = ['base', 'taxes', 'meal', 'seat', 'baggage', 'bundle'].map((k) => f[k] || 0);
      const sumLines = parts.reduce((x, y) => x + y, 0);
      const wallet = await P.readWallet(c);
      const kg = chosen.bag ? (chosen.bag.match(/\d+\s?Kg/i) || [chosen.bag])[0] : null;
      const adult = travellers.find((t) => t.type === 'Adult');
      const first = picks[0]; const last = picks[picks.length - 1];
      const itMeal = !chosen.meal || P.itineraryFor(it, travellers, adult, first.from, first.to).includes(` ${chosen.meal}`);
      const itBag = !kg || P.itineraryFor(it, travellers, adult, last.from, last.to).includes(kg);
      const extrasOk = (!chosen.meal || (conf.passengers.includes(`(${chosen.meal})`) && et.passengers.includes(`(${chosen.meal})`)))
        && (!kg || (conf.extraBaggage.includes(kg) && et.extraBaggage.includes(kg))) && itMeal && itBag;
      const ok5 = ok4 && extrasOk && P.near(f.total, sumLines, 0.11) && P.near(f.total, quote, 0.11) && P.near(walletBefore.amount - wallet.amount, f.total);
      await c.check('TC-SM-MCT-005', ok5,
        `Confirmation total ${f.total} = sum of its lines ${fmt2(sumLines)} (base ${f.base}, taxes ${f.taxes}, meal ${f.meal || 0}, seat ${f.seat || 0}, baggage ${f.baggage || 0}, bundle ${f.bundle || 0}); quoted ${fmt2(quote)}; wallet ${walletBefore.text} → ${wallet.text}. Meal ${chosen.meal || '-'} and bag "${conf.extraBaggage.slice(0, 60)}" on the confirmation, the e-ticket and the itinerary (meal under ${first.from}-${first.to}: ${itMeal ? 'yes' : 'NO'}; bag under ${last.from}-${last.to}: ${itBag ? 'yes' : 'NO'}): ${extrasOk ? 'yes' : 'NO'}.`);
    },
  },
];

module.exports = { id: '15', pax: PAX, assisted: 'Book', steps, notAutomated: {} };
