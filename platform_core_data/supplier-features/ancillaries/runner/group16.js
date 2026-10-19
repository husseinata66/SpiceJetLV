'use strict';
// Ancillaries — Setup Group 16: a booking set up to FAIL on purpose — extra baggage that clashes with the
// baggage already in the fare package (same weight, same SSR code). ASSISTED: the runner builds it up to
// Book and stops; the HUMAN presses Book in the window (human decision, 2026-10-19). Expected outcome: the
// airline rejects it and the wallet is not charged. Everything after Book is read-only.
//
//   TC-SM-CNF-016  the clashing option is offered, priced and only refused by the airline — Pass by the
//                  27 Sep 2026 ruling (supplier behaviour, like the exit rows)
//   TC-SM-CNF-017  a failed booking must be reported as failed everywhere — Pass, with concerns, by the same
//                  ruling; each surface is read and written down
//
// Proven by hand 2026-10-19: package "Value Flex" (30KG PDBG) + extra 30Kg → "SSR (PDBG) is
// restricted to 1 occurence(s) per passenger and leg." The clash only happens with the PDBG code — packages
// whose baggage is BULK never clashed — so the package is chosen by that wording, never by its name.

const P = require('./postbook');

const PAX = { adults: 1, children: 1, infants: 1 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 160}`); };
const fmt2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function dashboardCounts(c) {
  await P.go(c, '/dashboard', 2500);
  const t = await c.ui.text(c.page);
  const m = t.match(/(\d+) TOTAL FLIGHTS (\d+) PENDING (\d+) TICKETED/i);
  return m ? { total: +m[1], pending: +m[2], ticketed: +m[3], text: m[0] } : { text: 'not shown' };
}

const steps = [
  {
    name: 'Build the clashing booking up to Book',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const days = (s.clash && s.clash.daysFromToday) || s.daysFromToday;
      c.state.walletBefore = await P.readWallet(c);
      c.state.dashBefore = await dashboardCounts(c);
      const srch = await U.search(p, c.baseUrl, { ...s, daysFromToday: days }, PAX, 'Economy');
      const cards = await U.waitForCard(p, c.credentialName, 120000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      c.log(`card ${cards.index} of ${cards.count}`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const { travellers } = await U.fillPassengers(p, { ...s, criteria: { adults: [{}], children: [{}], infants: [{}] } }, PAX, freshDocs(3));
      c.state.travellers = travellers;
      c.log(`passengers: ${travellers.map((t) => t.name).join(', ')}`);

      // A package whose own wording includes PDBG checked baggage; prefer one with free cancellation.
      if (!(await U.hasBundleStep(p))) throw new Error('no fare packages offered — this clash needs a package that includes checked baggage');
      const names = await U.bundleNames(p);
      const pdbg = [];
      for (const n of names) {
        await U.chooseBundle(p, n, names);
        const svc = await U.bundleServices(p, n);
        const m = svc.match(/(\d+)\s?KG Check-in Baggage \(PDBG\)/i);
        if (m) pdbg.push({ name: n, kg: +m[1], freeCancel: /Cancellation: Free/i.test(svc) });
      }
      c.log(`packages: ${names.join(', ')} · with PDBG baggage: ${pdbg.map((x) => `${x.name} ${x.kg}KG`).join(', ') || 'none'}`);
      if (!pdbg.length) throw new Error(`no package includes PDBG checked baggage (${names.join(', ')}) — the clash cannot be set up on this flight`);
      const pick = pdbg.find((x) => x.freeCancel) || pdbg[0];
      if (pick.name !== names[names.length - 1]) await U.chooseBundle(p, pick.name, names); // never re-pick the selected one
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      c.log(`step 2 open with '${pick.name}'`);

      // The extra bag of the SAME weight, for the adult.
      const opts = await U.dropdownOptionsAt(p, 'Choose a baggage', 0).catch(() => []);
      const same = opts.find((o) => new RegExp(`^${pick.kg}\\s?Kg`, 'i').test(o));
      c.log(`baggage options: ${opts.join(' | ')}`);
      if (!same) throw new Error(`no ${pick.kg}Kg extra baggage offered (${opts.join(' | ')}) — nothing to clash with`);
      await U.dropdownAt(p, 'Choose a baggage', 0).click(); await U.wait(p, 350);
      await p.getByRole('option', { name: new RegExp(`^${pick.kg}\\s?Kg`, 'i') }).filter({ visible: true }).first().click(); await U.wait(p, 900);
      const t = await U.text(p);
      c.state.quote = P.money((t.match(/Net Payable Amount: ([\d,.]+)/) || [])[1] || 0);
      c.state.pick = pick; c.state.extra = same;
      c.state.warned = /restrict|already includ|not allowed|duplicate|exceed/i.test(t);
      c.env('Before Book', `package '${pick.name}' (${pick.kg}KG PDBG${pick.freeCancel ? ', free cancellation' : ''}) + extra "${same}" for ${travellers[0].name} · warning shown: ${c.state.warned ? 'yes' : 'no'} · quote ${fmt2(c.state.quote)} · wallet ${c.state.walletBefore.text} · Dashboard ${c.state.dashBefore.text}`);

      // Keep the booking calls' own answers: the failure has to be read where the Portal reports it.
      const calls = {};
      const onResponse = async (r) => {
        const m = r.url().match(/\/(book-and-pay|bookingConfirm)\b/);
        if (m) calls[m[1]] = { status: r.status(), body: (await r.text().catch(() => '')).slice(0, 4000) };
      };
      p.on('response', onResponse);
      try {
        await c.humanGate({
          allow: [/^book$/i],
          until: /booking-confirmation/,
          prompt: `Group 16 is ready. Press BOOK in the browser window now — it is EXPECTED TO FAIL at the airline (quote ${fmt2(c.state.quote)}; the wallet should not be charged).`,
        });
        await U.wait(p, 2500);
      } finally { p.off('response', onResponse); }
      c.state.calls = calls;
      c.state.conf = await P.readConfirmation(c);
      c.env('After Book', `order ${c.state.conf.orderId} · ref ${c.state.conf.ref} · status ${c.state.conf.status}${c.state.conf.airlineError ? ` · "${c.state.conf.airlineError}"` : ''}`);
    },
  },
  {
    name: 'The clash and how every surface reports the failure',
    cases: ['TC-SM-CNF-016', 'TC-SM-CNF-017'],
    async run(c) {
      const { conf, calls, walletBefore, dashBefore, pick, extra, warned } = c.state;
      if (conf.duplicate) { // also ends "Failed" — but it is not the clash
        const msg = 'Refused as a DUPLICATE of an existing booking (same passengers on the same flight), not by the baggage clash — set settings.clash.daysFromToday to another day and run again.';
        await c.inconclusive('TC-SM-CNF-016', msg);
        await c.inconclusive('TC-SM-CNF-017', msg);
        return;
      }
      const failed = conf.status === 'Failed' || /restricted/i.test(conf.airlineError || '');
      if (!failed) {
        const msg = `The booking went through (status ${conf.status}, order ${conf.orderId}) — the clash did not happen this time; the case's own note says it can look intermittent. ${/Free/.test(pick.name) || pick.freeCancel ? 'The package has free cancellation.' : ''}`;
        await c.inconclusive('TC-SM-CNF-016', msg);
        await c.inconclusive('TC-SM-CNF-017', msg);
        return;
      }
      await c.pass('TC-SM-CNF-016', `The ${extra} extra was offered and priced on top of '${pick.name}' (${pick.kg}KG PDBG), ${warned ? 'with' : 'with NO'} warning before paying; the airline then refused it: "${conf.airlineError || 'error'}". Passed by the 27 Sep 2026 ruling (supplier behaviour — the Portal does not block the clash; the airline rejects the booking).`);

      const bp = calls['book-and-pay'] || {}; const bc = calls.bookingConfirm || {};
      const bpStatus = /"status"|"bookingStatus"/.test(bp.body || '') ? 'carries a status' : 'carries NO status';
      const pay = ((bc.body || '').match(/"paymentStatus"\s*:\s*(true|false)/) || [])[1];
      const flightErr = ((bc.body || '').match(/"hasFlightError"\s*:\s*(true|false)/) || [])[1];
      const wallet = await P.readWallet(c);
      const row = await P.myBookingsRow(c, conf.orderId);
      const dash = await dashboardCounts(c);
      const charged = !P.near(walletBefore.amount, wallet.amount);
      const surfaces = [
        `booking response (book-and-pay): HTTP ${bp.status || '?'}, ${bpStatus}`,
        `confirmation data: paymentStatus ${pay || '?'}, hasFlightError ${flightErr || '?'}`,
        `confirmation page: status "${conf.status}"${conf.airlineError ? ` with "${conf.airlineError}"` : ''}`,
        `My Bookings: ${row ? `an ordinary row (actions: ${row.actions.join(', ') || 'none'}) — no failure mark` : 'not listed'}`,
        `Dashboard: ${dashBefore.text} → ${dash.text}`,
        `wallet: ${walletBefore.text} → ${wallet.text} (${charged ? 'CHARGED' : 'not charged — correct'})`,
      ];
      if (charged) await c.fail('TC-SM-CNF-017', `The failed booking CHARGED the wallet. ${surfaces.join('; ')}.`);
      else await c.pass('TC-SM-CNF-017', `Passed, with concerns, by the 27 Sep 2026 ruling. ${surfaces.join('; ')}.`);
    },
  },
];

module.exports = { id: '16', pax: PAX, assisted: 'Book', steps, notAutomated: {} };
