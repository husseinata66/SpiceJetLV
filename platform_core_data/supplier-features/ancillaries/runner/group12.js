'use strict';
// Ancillaries — Setup Group 12: a supplier credential that is not in EGP. Search and step 2 only; never books.
//
//   TC-SM-PRC-005  every bundle, meal, extra-baggage and paid-seat price divides by the credential's ROE
//                  into a clean amount in the supplier's own currency (e.g. at ROE 13: 260 = 20, 610.87 = 46.99)
//
// The ROE lives in the Admin (Master → Miscellaneous → Credential Rate of Exchange for a rate of the
// credential's own, otherwise Rate of Exchange for the currency pair). The runner has no Admin adapter, so the
// human supplies it in `settings.nonEgp`: { credentialName, currency, roe }. Proven live 2026-10-19 on
// "Fly Nas KSA Staging" (Admin credential FLYNAS STG, SAR→EGP = 13; the older notes said 9 and are stale).

const PAX = { adults: 1, children: 0, infants: 0 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 110}`); };
const money = (t) => Number(String(t).replace(/,/g, ''));
const clean = (egp, roe) => { const q = egp / roe; return Math.abs(q * 100 - Math.round(q * 100)) < 1e-4; };

const steps = [
  {
    name: 'Non-EGP credential: search, book, collect every price',
    always: true,
    critical: true,
    cases: [],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const n = s.nonEgp;
      if (!n || !n.credentialName || !Number(n.roe)) throw new Error('settings.local.json needs "nonEgp": { "credentialName", "currency", "roe" } — the ROE is read from the Admin (Master → Miscellaneous) by the human.');
      c.state.roe = Number(n.roe);
      c.state.currency = n.currency || 'the supplier currency';
      const srch = await U.search(p, c.baseUrl, s, PAX, 'Economy');
      const cards = await U.waitForCard(p, n.credentialName, 120000);
      srch.stop();
      if (cards.index < 0) throw new Error(`no result card from "${n.credentialName}" among ${cards.count} cards`);
      c.env('Credential', `${n.credentialName} (${c.state.currency}, ROE ${c.state.roe} from the Admin) — the run's own is ${c.credentialName}`);
      c.env('Search', `${s.from}→${s.to}, 1 adult · asked for ${s.daysFromToday} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      await U.fillPassengers(p, { ...s, criteria: { adults: [{}] } }, PAX, freshDocs(1));

      const prices = []; // { kind, label, egp }
      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        for (const name of names) { // each package selected once; the last stays selected
          await U.chooseBundle(p, name, names);
          const svc = await U.bundleServices(p, name);
          const m = svc.match(/Price for Adult: ([\d,.]+) ([A-Z]{3})/);
          if (m) prices.push({ kind: 'bundle', label: `${name} (adult)`, egp: money(m[1]), cur: m[2] });
        }
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      if (c.capabilities.Meal === 'Supported') {
        for (const o of await U.dropdownOptions(p, 'Choose a meal').catch(() => [])) {
          const m = o.match(/^(\S+) ([\d,.]+) ([A-Z]{3}) /);
          if (m && money(m[2]) > 0) prices.push({ kind: 'meal', label: m[1], egp: money(m[2]), cur: m[3] });
        }
      }
      if (c.capabilities.Baggage === 'Supported') {
        for (const o of await U.dropdownOptions(p, 'Choose a baggage').catch(() => [])) {
          const m = o.match(/^(.+?) - \( ([\d,.]+) ([A-Z]{3}) \)$/);
          if (m && money(m[2]) > 0) prices.push({ kind: 'bag', label: m[1], egp: money(m[2]), cur: m[3] });
        }
      }
      if (c.capabilities.Seat === 'Supported') {
        await U.openMap(p);
        const seats = await U.readSeats(p);
        const seen = new Set();
        for (const x of seats) {
          const m = x.state === 'available' && String(x.price).match(/^([A-Z]{3}) ([\d,.]+)$/);
          if (m && money(m[2]) > 0 && !seen.has(m[2])) { seen.add(m[2]); prices.push({ kind: 'seat', label: `seat price`, egp: money(m[2]), cur: m[1] }); }
        }
        await U.ensureMapClosed(p);
      }
      c.state.prices = prices;
      c.env('Prices read', `${prices.length}: ${['bundle', 'meal', 'bag', 'seat'].map((k) => `${prices.filter((x) => x.kind === k).length} ${k}`).join(' · ')}`);
    },
  },
  {
    name: 'Every price divides cleanly by the ROE',
    cases: ['TC-SM-PRC-005'],
    async run(c) {
      const { prices, roe, currency } = c.state;
      if (!prices.length) { await c.inconclusive('TC-SM-PRC-005', 'No bundle, meal, baggage or paid-seat price could be read on this booking.'); return; }
      const rows = prices.map((x) => ({ ...x, q: x.egp / roe, ok: clean(x.egp, roe) }));
      const bad = rows.filter((x) => !x.ok);
      const fmt = (x) => `${x.kind} ${x.label} ${x.egp} = ${x.q.toFixed(4)}`;
      await c.check('TC-SM-PRC-005', bad.length === 0,
        bad.length === 0
          ? `All ${rows.length} prices divide by ROE ${roe} into clean ${currency} amounts: ${rows.map(fmt).join('; ')}.`
          : `${bad.length} of ${rows.length} prices do NOT divide cleanly by ROE ${roe}: ${bad.map(fmt).join('; ')}. The ROE may not be the rate in use — recheck it in the Admin (Credential Rate of Exchange first, then Rate of Exchange).`);
    },
  },
];

module.exports = { id: '12', pax: PAX, steps, notAutomated: {} };
