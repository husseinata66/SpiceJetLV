'use strict';
// Ancillaries — Setup Group 01: the default booking (1 adult + 1 child + 1 infant, one-way, Economy).
// Shared by every application: each screen action goes through `c.ui` (the Portal or Admin adapter).
// Every check follows the sheet's "What should happen" — never one supplier's numbers: amounts are
// summed, counts compared, layouts read from the map. Cases the supplier cannot have are already
// excluded by the run's Capability Plan; record() silently ignores them.
//
// Order matters: one booking serves the whole group, so the steps run in the order that keeps it
// usable (proven live on Flynas NDC, 2026-10-18).

const PAX = { adults: 1, children: 1, infants: 1 };
// TC-SM-STA-004: the only feature words a seat may carry.
const KNOWN_FEATURES = new Set(['Window seat', 'Aisle seat', 'Leg space seat', 'Chargeable seat', 'Exit and emergency exit', 'Female designated seat']);
const FRC = ['TC-SM-FRC-001', 'TC-SM-FRC-002', 'TC-SM-FRC-003', 'TC-SM-FRC-005'];

const fmt = (n) => (n == null || Number.isNaN(n) ? '?' : Number(n).toLocaleString('en-US'));
const tail = (label) => String(label).split(', ').slice(-2).join(', ');
const isZero = (price) => /^(Free|[A-Z]{3} 0(\.0+)?)$/.test(String(price));
const seatTravellers = (c) => c.state.travellers.filter((t) => t.type !== 'Infant');
// Fresh every booking: the add-pax 409 guard rejects reused document numbers (§15.5 rule 4).
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 1}`); };
const noteOldPrice = async (c, where) => {
  if (c.state.oldPrice && (await c.ui.text(c.page)).includes(c.state.oldPrice)) (c.state.oldSeen = c.state.oldSeen || []).push(where);
};
const snapshot = async (c) => {
  const U = c.ui; const p = c.page;
  return {
    pub: ((await U.published(p)) || {}).amount,
    seats: JSON.stringify((await U.selectedSeats(p)).rows),
    lines: JSON.stringify((await U.breakdown(p)).lines),
    opener: await U.openerText(p),
  };
};

const steps = [
  {
    name: 'Search and pick the run\'s connection',
    always: true,
    critical: true,
    cases: ['TC-SM-ERR-001', 'TC-SM-ERR-005'],
    async run(c) {
      const U = c.ui; const s = c.settings;
      const srch = await U.search(c.page, c.baseUrl, s, PAX);
      const cards = await U.waitForCard(c.page, c.credentialName, 240000);
      srch.stop();
      c.env('Search', `${s.from}→${s.to}, asked for ${s.daysFromToday} day(s) from today · ${cards.count} result cards · the run's connection listed after ${((Date.now() - srch.t0) / 1000).toFixed(0)} s`);
      if (cards.index < 0) throw new Error(`no result card from "${c.credentialName}" among ${cards.count} cards`);
      c.state.card = { index: cards.index, text: cards.cards[cards.index] };
      c.env('Connection used', c.credentialName);

      const codes = [...new Set(srch.statuses)].join(', ') || 'none captured';
      const failed = srch.statuses.filter((x) => x >= 400);
      await c.pass('TC-SM-ERR-001', failed.length
        ? `Search responses ${codes}: the server failed while ${cards.count} cards were shown. Known, business-accepted behaviour — not reported as a fault.`
        : `Search responses ${codes}; ${cards.count} result cards shown; no server error this time.`);

      const named = cards.cards.filter((t) => /\((?:NO )?WARNING\)/.test(t) || t.includes(c.credentialName));
      const names = [...new Set(cards.cards.map((t) => (t.match(/([A-Z][\w ]*?(?:Staging|PRODUCTION|Production)[\w ]*?(?: \((?:NO )?WARNING\))?)/) || [])[1]).filter(Boolean))];
      const ev = `${named.length} of ${cards.count} cards name their connection${names.length ? `: ${names.join(' · ')}` : ''}.`;
      if (named.length === cards.count) await c.pass('TC-SM-ERR-005', ev);
      else await c.inconclusive('TC-SM-ERR-005', `${ev} Cards without a recognisable connection name need a look.`);
    },
  },
  {
    name: 'Price Update pop-up',
    always: true,
    critical: true,
    cases: ['TC-SM-FRC-001', 'TC-SM-FRC-003', 'TC-SM-FRC-002'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.clickCard(p, c.state.card.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'passengers') {
        for (const id of FRC) await c.na(id, 'No Price Update pop-up: the price did not change for this flight (tester note: only flynas shows it).');
        c.env('Price change', 'none — no Price Update pop-up');
        return;
      }
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

      await U.clickCard(p, back.index >= 0 ? back.index : c.state.card.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
      }
      await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      const pub = await U.published(p);
      const oldShown = (await U.text(p)).includes(pu.previous);
      await c.check('TC-SM-FRC-002', !!pub && pub.amount === U.num(pu.next) && !oldShown,
        `Accept opened Passenger Details; amount to pay ${pub ? pub.raw : '?'} ${pub && pub.amount === U.num(pu.next) ? '=' : '≠'} the new price ${pu.next}; old price ${pu.previous} ${oldShown ? 'STILL SHOWN' : 'shown nowhere'}.`);
    },
  },
  {
    name: 'Step 1 before anything is filled',
    cases: ['TC-SM-NAV-001', 'TC-SM-PAX-006', 'TC-SM-NAV-002b'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const t = await U.text(p);
      const one = /\b01 Passenger Info and Bundles\b/.test(t);
      const two = /\b02 Ancillaries\b/.test(t);
      const three = /\b03 [A-Z][A-Za-z ,]+? (?:In progress|Upcoming|Completed)\b/.test(t);
      const opener = (await p.getByRole('button', { name: U.OPENER }).count()) > 0;
      await c.check('TC-SM-NAV-001', one && two && !three && !opener,
        `Steps: ${one ? "'01 Passenger Info and Bundles'" : 'NO 01'}, ${two ? "'02 Ancillaries'" : 'NO 02'}, ${three ? 'A THIRD STEP' : 'no third'}; Select Seat on step 1: ${opener ? 'YES' : 'no'}.`);

      if (c.wants('TC-SM-PAX-006')) {
        const legs = p.getByRole('tab', { name: /[a-z]+ → [A-Z][a-z]+/ });
        for (let i = 0; i < await legs.count(); i += 1) {
          if ((await legs.nth(i).getAttribute('aria-expanded')) !== 'true') await legs.nth(i).click().catch(() => {});
        }
        await U.wait(p, 400);
        const bd = await U.breakdown(p);
        const bag = ((await U.text(p)).match(/Included Baggage([\s\S]*?)(?:Penalties|Full Fare Rules|$)/) || [])[1] || '';
        const types = ['Adult', 'Child', 'Infant'];
        const priced = types.every((ty) => bd.base.some((x) => x.type === ty) && bd.tax.some((x) => x.type === ty));
        const inf = bag.match(/Infant Carry on baggage: (.+?) Check in baggage: (.+?)(?= Adult | Child |$)/) || [];
        const infOk = /Check with Airline/.test(inf[1] || '') && /Check with Airline/.test(inf[2] || '');
        await c.check('TC-SM-PAX-006', priced && infOk,
          `Base fare ${bd.base.map((x) => `${x.type} ${fmt(x.amount)}`).join(', ')}; tax ${bd.tax.map((x) => `${x.type} ${fmt(x.amount)}`).join(', ')}; infant baggage: carry-on "${(inf[1] || '?').trim()}", check-in "${(inf[2] || '?').trim()}".`);
      }

      if (c.wants('TC-SM-NAV-002b')) {
        const reached = await U.nextExpectingToStay(p, 2500);
        const req = await p.getByText('Required', { exact: true }).count();
        c.state.nav2b = `First Next on an empty step 1: ${req} "Required" messages, step 2 ${reached ? 'REACHED' : 'not reached'}.`;
        if (reached) throw new Error('Next on an empty step 1 opened step 2');
        if (!req) await c.fail('TC-SM-NAV-002b', c.state.nav2b);
      }
    },
  },
  {
    name: 'Passengers from saved profiles',
    always: true,
    critical: true,
    cases: ['TC-SM-PAX-003'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const r = await U.fillPassengers(p, c.settings, PAX, freshDocs(3));
      c.state.travellers = r.travellers;
      c.env('Passengers', `${r.travellers.map((t) => `${t.name} (${t.type.toLowerCase()}, ${t.title}, document ${t.doc})`).join('; ')} — saved profiles, fresh documents`);
      const boxes = {};
      for (const t of r.travellers) boxes[t.type] = await U.region(p, t.sec).getByText('Assigned to').count();
      const adults = r.travellers.filter((t) => t.type === 'Adult').map((t) => t.name);
      const onlyAdults = r.assignedOptions.length > 0 && r.assignedOptions.every((o) => adults.some((a) => o.includes(a)));
      await c.check('TC-SM-PAX-003', onlyAdults && boxes.Infant > 0 && !boxes.Adult && !boxes.Child,
        `"Assigned to" on adult / child / infant: ${boxes.Adult} / ${boxes.Child} / ${boxes.Infant}; it lists ${r.assignedOptions.join(', ') || 'nothing'}.`);
    },
  },
  {
    name: 'Next without a fare package',
    cases: ['TC-SM-NAV-002', 'TC-SM-NAV-002b'],
    async run(c) {
      const U = c.ui; const p = c.page;
      if (!(await U.hasBundleStep(p))) {
        await c.na('TC-SM-NAV-002', 'This supplier shows no fare package step.');
        await c.pass('TC-SM-NAV-002b', `${c.state.nav2b || ''} Second part not applicable: no fare package step.`);
        return;
      }
      await U.acceptTerms(p);
      const reached = await U.nextExpectingToStay(p, 3000);
      const msg = await p.getByText('Bundle selection is required').count();
      const req = await p.getByText('Required', { exact: true }).count();
      const ev = `All passengers filled, no fare package, Next: "Bundle selection is required" ${msg ? 'shown' : 'NOT shown'}, ${req} "Required" left, step 2 ${reached ? 'REACHED' : 'not reached'}.`;
      await c.check('TC-SM-NAV-002', msg > 0 && !reached, ev);
      await c.check('TC-SM-NAV-002b', msg > 0 && req === 0 && !reached, `${c.state.nav2b || ''} ${ev}`);
      if (reached) throw new Error('step 2 opened without a fare package');
    },
  },
  {
    name: 'Passenger fields: gender, dropdowns, sections, titles',
    cases: ['TC-SM-GEN-003', 'TC-SM-ERR-004', 'TC-SM-PAX-007', 'TC-SM-GEN-005'],
    async run(c) {
      const U = c.ui; const p = c.page;
      if (c.wants('TC-SM-GEN-003')) {
        const sec = '1- Adult';
        await U.openSection(p, sec);
        const orig = await U.titleOf(p, sec);
        let cur = orig; const seen = {};
        for (const t of ['Mr', 'Ms', 'Mrs']) { if (cur !== t) { await U.setTitle(p, sec, cur, t); cur = t; } seen[t] = await U.genderOf(p, sec); }
        if (cur !== orig) await U.setTitle(p, sec, cur, orig);
        const locked = await U.region(p, sec).getByRole('combobox', { name: 'Gender' }).isDisabled().catch(() => null);
        await c.check('TC-SM-GEN-003', seen.Mr === 'Male' && seen.Ms === 'Female' && seen.Mrs === 'Female' && locked === true,
          `Gender box ${locked ? 'not editable' : 'EDITABLE'}; Mr → ${seen.Mr}, Ms → ${seen.Ms}, Mrs → ${seen.Mrs}; title back to ${orig}.`);
      }

      if (c.wants('TC-SM-ERR-004')) {
        const [a, b] = ['1- Infant', '1- Child'];
        // The saved profiles' nationality is known test data (settings.nationality), not read from
        // the page: a bulk-text regex and a role=combobox guess were both tried first and neither
        // matched the real markup (the same class of bug as titleOf).
        const nat = c.settings.nationality || 'Egypt';
        await U.openSection(p, a);
        await U.openSection(p, b);
        await U.region(p, a).locator('div').filter({ hasText: new RegExp(`^${U.esc(nat)}$`) }).first().click();
        await p.keyboard.type(nat.slice(0, 3).toLowerCase());
        await U.wait(p, 300);
        const filtered = await p.getByRole('option').filter({ visible: true }).count();
        await p.keyboard.press('Escape');
        await U.wait(p, 200);
        await U.region(p, b).locator('div').filter({ hasText: new RegExp(`^${U.esc(nat)}$`) }).first().click();
        await U.wait(p, 300);
        const second = await p.getByRole('option').filter({ visible: true }).count();
        await p.keyboard.press('Escape');
        await c.check('TC-SM-ERR-004', second > filtered && second > 1,
          `First nationality list filtered to ${filtered} option(s) ("${nat.slice(0, 3).toLowerCase()}"); the second opened with ${second}.`);
      }

      if (c.wants('TC-SM-PAX-007')) {
        const n = c.state.travellers.length;
        await p.getByRole('button', { name: 'Collapse All' }).click().catch(() => {});
        await U.wait(p, 300);
        const collapsed = await U.visibleFirstNames(p);
        await p.getByRole('button', { name: 'Expand All' }).click().catch(() => {});
        await U.wait(p, 300);
        const expanded = await U.visibleFirstNames(p);
        await p.getByRole('button', { name: 'Collapse All' }).click().catch(() => {});
        await U.wait(p, 300);
        const open = [];
        for (const t of c.state.travellers) {
          await p.getByRole('tab', { name: new RegExp(U.esc(t.sec)) }).click();
          await U.wait(p, 250);
          open.push(await U.visibleFirstNames(p));
        }
        const oneAtATime = open.every((x) => x === 1);
        await c.check('TC-SM-PAX-007', collapsed === 0 && expanded === n && oneAtATime,
          `Collapse All → ${collapsed} open, Expand All → ${expanded} open; opening ${c.state.travellers.map((t) => t.type).join(', ')} one by one leaves ${open.join(', ')} open${oneAtATime ? '' : ' — the case expects one section at a time'}.`,
          { fullPage: true });
      }

      if (c.wants('TC-SM-GEN-005')) {
        const adult = '1- Adult'; const child = '1- Child';
        await U.openSection(p, adult);
        const ta = await U.titleOptions(p, adult);
        await U.openSection(p, child);
        const tc = await U.titleOptions(p, child);
        const orig = await U.titleOf(p, child);
        let cur = orig; const g = {};
        for (const t of ['Ms', 'Mrs']) { if (cur !== t) { await U.setTitle(p, child, cur, t); cur = t; } g[t] = await U.genderOf(p, child); }
        // The child stays female so TC-SM-STA-007 can look at women-only seats from her side, as the
        // sheet's step 3 asks; TC-SM-CNF-018 puts the original title back.
        const kid = c.state.travellers.find((t) => t.sec === child);
        kid.title = cur;
        c.state.childOriginalTitle = orig;
        const same = JSON.stringify([...ta].sort()) === JSON.stringify([...tc].sort());
        const right = ['Mr', 'Ms', 'Mrs'].every((x) => tc.includes(x)) && !tc.some((x) => /^(Miss|Master)$/.test(x));
        await c.check('TC-SM-GEN-005', same && right && g.Ms === 'Female' && g.Mrs === 'Female',
          `Titles — adult: ${ta.join('/')}, child: ${tc.join('/')}; child Ms → ${g.Ms}, Mrs → ${g.Mrs}. Women-only seats are looked at from her side in TC-SM-STA-007.`);
      }
    },
  },
  {
    name: 'Fare packages',
    always: true,
    critical: true,
    cases: ['TC-SM-BND-004', 'TC-SM-BND-006'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const hasStep = await U.hasBundleStep(p);
      if (c.wants('TC-SM-BND-006')) {
        const line = 'Bundle Fare' in (await U.breakdown(p)).lines;
        await c.check('TC-SM-BND-006', !hasStep && !line, `"Select Bundle" ${hasStep ? 'SHOWN' : 'not shown'}; Bundle Fare line ${line ? 'PRESENT' : 'absent'}.`);
      }
      await noteOldPrice(c, 'step 1');
      if (!hasStep) { c.state.bundles = null; return; }

      const names = await U.bundleNames(p);
      const distinct = names.length > 0 && names.every(Boolean) && new Set(names).size === names.length;
      const info = {};
      for (const n of names) {
        await U.chooseBundle(p, n, names);
        info[n] = { services: await U.bundleServices(p, n) };
      }
      const all = (n) => /Seat selection: All seats/i.test(info[n].services);
      const pref = c.settings.bundles || {};
      const allSeats = pref.allSeats || names.find(all) || null;
      const paidSeats = pref.paidSeats || (names.includes('Value') && !all('Value') ? 'Value' : names.find((n) => !all(n))) || null;
      c.state.bundles = { names, info, allSeats, paidSeats };

      const first = allSeats || names[0];
      await U.chooseBundle(p, first, names);
      c.state.currentBundle = first;
      const pub = await U.published(p);
      const bd = await U.breakdown(p);
      c.env('Fare packages', names.map((n) => `${n}${n === allSeats ? ' (all seats included)' : ''}${n === paidSeats ? ' (seats charged)' : ''}`).join(', '));
      c.env('Package chosen first', `${first}: Bundle Fare +${fmt(bd.lines['Bundle Fare'])}; amount to pay ${pub ? `${pub.raw} ${pub.currency}` : '?'}`);
      await c.check('TC-SM-BND-004', distinct,
        `Packages offered: ${names.map((n) => `'${n}'`).join(', ') || 'none'} — ${distinct ? 'all named, none repeated' : 'A BLANK OR REPEATED NAME'}. Each package's seat map is opened at the end.`);
    },
  },
  {
    name: 'Open step 2',
    always: true,
    critical: true,
    cases: ['TC-SM-NAV-006', 'TC-ML-006', 'TC-BG-006'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.acceptTerms(p);
      c.env('Step 2', `opened ${await U.nextToStep2(p)} s after Next`);
      const t = await U.text(p);
      c.state.step2Text = t;
      await noteOldPrice(c, 'step 2');
      const inf = c.state.travellers.find((x) => x.type === 'Infant');
      c.state.infantOnStep2 = inf ? new RegExp(`${U.esc(inf.name)} Passenger \\d`).test(t) : false;
      c.state.step2Cards = [...t.matchAll(/([A-Z][\w'-]+(?: [A-Z][\w'-]+)+) Passenger (\d+)/g)].map((m) => m[1]);
      const lines = (await U.breakdown(p)).lines;
      if (c.wants('TC-SM-NAV-006')) {
        const opener = (await p.getByRole('button', { name: U.OPENER }).count()) > 0;
        await c.check('TC-SM-NAV-006', !opener && !('Seat Selection' in lines), `Seat button ${opener ? 'SHOWN' : 'absent'}; seat line ${'Seat Selection' in lines ? 'PRESENT' : 'absent'}.`);
      }
      if (c.wants('TC-ML-006')) {
        const shown = await U.dropdown(p, 'Choose a meal').count();
        await c.check('TC-ML-006', !shown && !('Meal Preference' in lines), `Meal choice ${shown ? 'SHOWN' : 'absent'}; meal line ${'Meal Preference' in lines ? 'PRESENT' : 'absent'}.`);
      }
      if (c.wants('TC-BG-006')) {
        const shown = await U.dropdown(p, 'Choose a baggage').count();
        await c.check('TC-BG-006', !shown && !('Extra Baggage' in lines), `Extra baggage choice ${shown ? 'SHOWN' : 'absent'}; baggage line ${'Extra Baggage' in lines ? 'PRESENT' : 'absent'}.`);
      }
    },
  },
  {
    name: 'Seat map: what it shows',
    cases: ['TC-SM-NAV-003', 'TC-SM-RND-001', 'TC-SM-RND-002', 'TC-SM-RND-003', 'TC-SM-RND-005', 'TC-SM-RND-006',
      'TC-SM-STA-004', 'TC-SM-STA-005', 'TC-SM-STA-006', 'TC-SM-BND-005', 'TC-SM-PRC-002'],
    async run(c) {
      const U = c.ui; const p = c.page; const s = c.settings;
      const opened = await U.openMap(p);
      const seats = await U.readSeats(p);
      const mt = await U.mapText(p);
      const heads = await U.sectionHeaders(p);
      const [A] = seatTravellers(c);
      await U.activate(p, A.name);

      // NAV-003
      const title = mt.match(/Seat Map · ([A-Z]{3}) → ([A-Z]{3}) · (\w+)/) || [];
      const dims = await U.mapDialog(p).evaluate((el) => ({ w: el.getBoundingClientRect().width, vw: window.innerWidth }));
      const parts = { left: /Choose a traveller/.test(mt), key: /What the plan shows/.test(mt), bottom: (await U.bottomButtons(p)).length > 0 };
      await c.check('TC-SM-NAV-003', !!title[0] && title[1] === s.from && title[2] === s.to && Object.values(parts).every(Boolean) && seats.length > 0 && dims.w >= dims.vw * 0.95,
        `Opened in ${opened} s, ${Math.round((dims.w / dims.vw) * 100)}% of the window wide; title "${title[0] || 'missing'}"; left panel ${parts.left ? 'yes' : 'NO'}, chart ${seats.length} seats, colour key ${parts.key ? 'yes' : 'NO'}, bottom button ${parts.bottom ? 'yes' : 'NO'}.`,
        { locator: U.mapDialog(p) });

      // RND-001 / 002 / 003
      const panel = Number((mt.match(/SEATS (\d+)/) || [])[1]);
      await c.check('TC-SM-RND-001', panel === seats.length, `Left panel SEATS ${panel}; ${seats.length} seats drawn.`);
      const by = (st) => seats.filter((x) => x.state === st).length;
      const unique = new Set(seats.map((x) => x.n)).size === seats.length;
      const rowsOk = seats.every((x) => x.row === x.rowLabel);
      const sum = by('available') + by('blocked') + by('notOffered') + by('selected');
      await c.check('TC-SM-RND-002', unique && rowsOk && !by('unknown') && sum === panel,
        `${by('available')} available + ${by('blocked')} blocked + ${by('notOffered')} not offered + ${by('selected')} held = ${sum} (panel ${panel}); seat numbers ${unique ? 'unique' : 'REPEATED'}; ${rowsOk ? 'every row label matches' : 'ROW LABEL MISMATCH'}${by('unknown') ? `; ${by('unknown')} seats with no state` : ''}.`);
      const bad = seats.filter((x) => x.state === 'unknown' || !x.section || !x.rowLabel);
      await c.check('TC-SM-RND-003', !bad.length,
        `${seats.length - bad.length} of ${seats.length} descriptions complete (number, row, block, section, features, state)${bad.length ? `; incomplete: ${bad.slice(0, 3).map((x) => x.label).join(' | ')}` : ''}. Observation: ${seats.filter((x) => x.emptySlot).length} featureless seats show an empty feature slot.`);

      // RND-005
      const keyCabins = ((mt.match(/CABINS (.+?) DECK/) || [])[1] || '').split(/,\s*/).filter(Boolean);
      const mapCabins = [...new Set(Object.values(heads).map((h) => h.cabin))];
      const labelSections = [...new Set(seats.map((x) => x.section))].sort();
      const headSections = Object.keys(heads).sort();
      c.state.cabins = mapCabins;
      await c.check('TC-SM-RND-005', keyCabins.length > 0 && keyCabins.every((k) => mapCabins.includes(k)) && mapCabins.every((k) => keyCabins.includes(k)) && JSON.stringify(labelSections) === JSON.stringify(headSections),
        `Colour key cabins: ${keyCabins.join(', ') || 'none read'}; cabins on the map: ${mapCabins.join(', ')}; sections ${headSections.join(', ')} (seat labels: ${labelSections.join(', ')}).`);

      // RND-006
      const card = mt.match(/([A-Z0-9]{2}\d{2,4}) · (\S+)[\s\S]{0,15}?DEPARTS \w{3}, (\w{3}) (\d{1,2}), (\d{4}) (\d{2}:\d{2})[\s\S]{0,15}?ARRIVES \w{3}, \w{3} \d{1,2}, \d{4} (\d{2}:\d{2})/);
      const dep = c.state.step2Text.match(/Departure [A-Z]{3} [\s\S]*? (\d{2}:\d{2}) \w{3}, (\d{1,2}) (\w{3}), (\d{4})/);
      const arr = c.state.step2Text.match(/Arrival [A-Z]{3} [\s\S]*? (\d{2}:\d{2}) \w{3}, \d{1,2} \w{3}, \d{4}/);
      const same = card && dep && arr && card[6] === dep[1] && Number(card[4]) === Number(dep[2]) && card[3] === dep[3] && card[5] === dep[4] && card[7] === arr[1];
      const numberOnCard = card && c.state.card.text.replace(/\s/g, '').includes(card[1].replace(/\s/g, ''));
      await c.check('TC-SM-RND-006', !!same,
        `Map card ${card ? `${card[1]} · ${card[2]}, departs ${card[3]} ${card[4]} ${card[6]}, arrives ${card[7]}` : 'NOT READ'}; booked flight departs ${dep ? `${dep[3]} ${dep[2]} ${dep[1]}` : '?'}, arrives ${arr ? arr[1] : '?'}. Flight number ${numberOnCard ? 'also on the result card' : 'not printed on the result card'}.`);

      // STA-004
      const words = {};
      for (const x of seats) for (const f of x.features) words[f] = (words[f] || 0) + 1;
      const unknownWords = Object.keys(words).filter((w) => !KNOWN_FEATURES.has(w));
      await c.check('TC-SM-STA-004', !unknownWords.length,
        `Feature words: ${Object.entries(words).map(([w, n]) => `${w} ${n}`).join(', ')}${unknownWords.length ? ` — UNKNOWN: ${unknownWords.join(', ')}` : ' — all on the known list'}.`);

      // STA-005: window/aisle from each section's own layout, never "A and F"
      const wrong = []; const layouts = [];
      for (const [sid, h] of Object.entries(heads)) {
        const cols = [...new Set(seats.filter((x) => x.section === sid).map((x) => x.col))].sort();
        if (cols.length !== h.layout.reduce((a, b) => a + b, 0)) { wrong.push(`${sid} has ${cols.join('')} for a ${h.layout.join('-')} layout`); continue; }
        const blocks = []; let i = 0;
        for (const size of h.layout) { blocks.push(cols.slice(i, i + size)); i += size; }
        const win = new Set([cols[0], cols[cols.length - 1]]);
        const aisle = new Set();
        blocks.forEach((bl, bi) => { if (bi > 0) aisle.add(bl[0]); if (bi < blocks.length - 1) aisle.add(bl[bl.length - 1]); });
        layouts.push(`${sid} ${h.layout.join('-')}: window ${[...win].join('')}, aisle ${[...aisle].join('')}`);
        for (const x of seats.filter((y) => y.section === sid)) {
          if (x.features.includes('Window seat') !== win.has(x.col) || x.features.includes('Aisle seat') !== aisle.has(x.col)) wrong.push(x.n);
        }
      }
      await c.check('TC-SM-STA-005', !wrong.length && layouts.length > 0,
        `${layouts.join('; ')}${wrong.length ? ` — LABELS NOT MATCHING POSITION: ${wrong.slice(0, 8).join(', ')}${wrong.length > 8 ? ` (+${wrong.length - 8})` : ''}` : ' — every label matches its position'}.`);

      // STA-006: exit seats; never an adult holding an infant, never a child
      const exits = seats.filter((x) => x.features.includes('Exit and emergency exit'));
      if (!exits.length) await c.na('TC-SM-STA-006', 'No exit seats on this map.');
      else {
        const rows = [...new Set(exits.map((x) => x.row))];
        const leg = exits.filter((x) => x.features.includes('Leg space seat')).length;
        const holderOk = exits.filter((x) => x.state === 'available').map((x) => x.n);
        const child = seatTravellers(c).find((t) => t.type === 'Child');
        let childOk = [];
        if (child) {
          await U.activate(p, child.name);
          childOk = (await U.readSeats(p)).filter((x) => x.features.includes('Exit and emergency exit') && x.state === 'available').map((x) => x.n);
          await U.activate(p, A.name);
        }
        const together = rows.every((r) => exits.filter((x) => x.row === r).length >= 2);
        await c.check('TC-SM-STA-006', together && !holderOk.length && !childOk.length,
          `Exit seats: rows ${rows.join(', ')} (${exits.length} seats, ${leg} also "Leg space seat"); offered to ${A.firstName} (holds the infant): ${holderOk.join(', ') || 'none'}; offered to the child: ${childOk.join(', ') || 'none'}.`);
      }

      // BND-005: the package's wording against the map
      const b = c.state.bundles;
      if (b && c.state.currentBundle === b.allSeats && b.allSeats) {
        const selectable = seats.filter((x) => x.state === 'available');
        const free = selectable.filter((x) => isZero(x.price));
        await c.check('TC-SM-BND-005', selectable.length > 0 && free.length === selectable.length,
          `'${b.allSeats}' says "Seat selection: All seats": ${selectable.length} of ${seats.length} selectable for ${A.firstName}, ${free.length} free, ${by('blocked')} blocked, ${by('notOffered')} not offered to him.`);
      } else if (b) {
        await c.na('TC-SM-BND-005', 'No package says "Seat selection: All seats"; the charged package is compared in the paid-seat step.');
      }

      // PRC-002: a "Chargeable seat" always has a price
      const chg = seats.filter((x) => x.features.includes('Chargeable seat') && x.state === 'available');
      if (!chg.length) await c.na('TC-SM-PRC-002', 'No selectable "Chargeable seat" on this map.');
      else {
        const free = chg.filter((x) => isZero(x.price));
        if (free.length) {
          await U.clickSeat(p, free[0].n);
          await c.fail('TC-SM-PRC-002',
            `${free.length} of ${chg.length} "Chargeable seat" seats read "available for Free" under '${c.state.currentBundle || 'this fare'}', e.g. ${free[0].n} ("${tail(free[0].label)}"). A chargeable seat must always have a price (known fault).`,
            { locator: U.mapDialog(p) });
        } else {
          await c.pass('TC-SM-PRC-002', `All ${chg.length} "Chargeable seat" seats have a price under '${c.state.currentBundle || 'this fare'}'.`);
        }
      }
    },
  },
  {
    name: 'Seat map: taken seats, women-only seats, the information box',
    cases: ['TC-SM-STA-002', 'TC-SM-STA-007', 'TC-SM-SEL-003', 'TC-SM-SEL-001'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.openMap(p);
      const [A] = seatTravellers(c);
      await U.activate(p, A.name);
      const seats = await U.readSeats(p);
      const before = await U.assigned(p);

      const blocked = seats.find((x) => x.state === 'blocked');
      if (!blocked) await c.na('TC-SM-STA-002', 'No taken seat on this map.');
      else {
        await U.clickSeat(p, blocked.n);
        const mt = await U.mapText(p);
        const btn = U.mapDialog(p).getByRole('button', { name: /Seat unavailable/ });
        const disabled = (await btn.count()) ? await btn.first().isDisabled() : null;
        const after = await U.assigned(p);
        const says = new RegExp(`Seat ${blocked.n} is blocked`).test(mt);
        await c.check('TC-SM-STA-002', /\bBlocked\b/.test(mt) && says && disabled === true && after.done === before.done,
          `Clicked taken seat ${blocked.n}: box ${says ? `says "Seat ${blocked.n} is blocked."` : 'reads "Blocked" but NOT "Seat … is blocked."'}; button "Seat unavailable" ${disabled ? 'greyed out' : disabled === false ? 'ENABLED' : 'MISSING'}; count ${before.done}/${before.of} → ${after.done}/${after.of}.`,
          { locator: U.mapDialog(p) });
      }

      const women = seats.filter((x) => x.features.includes('Female designated seat'));
      if (!women.length) await c.na('TC-SM-STA-007', 'This flight has no women-only seats (the case skips cleanly).');
      else {
        const male = seatTravellers(c).find((t) => t.title === 'Mr');
        const female = seatTravellers(c).find((t) => /^(Ms|Mrs)$/.test(t.title));
        if (!male || !female) {
          await c.inconclusive('TC-SM-STA-007', `${women.length} women-only seats, but this booking has no ${male ? 'female' : 'male'} traveller who can take a seat.`);
        } else {
          const n = women[0].n;
          await U.activate(p, male.name);
          const m = await U.seatState(p, n);
          await U.activate(p, female.name);
          const f = await U.seatState(p, n);
          await U.activate(p, A.name);
          const okM = m.state === 'notOffered' && m.label.endsWith(`Female designated seat, not offered for ${male.firstName}`);
          const okF = f.state === 'available';
          await c.check('TC-SM-STA-007', okM && okF,
            `Women-only seat ${n} (${women.length} on this flight): for ${male.firstName} (${male.title}) "${tail(m.label)}"; for ${female.firstName} (${female.title}) "${tail(f.label)}".`,
            { locator: U.mapDialog(p) });
        }
      }

      const [free] = U.plainSeats(await U.readSeats(p), 1);
      if (!free) throw new Error('no plain available seat to click');
      await U.clickSeat(p, free);
      const s = await U.seatState(p, free);
      const mt = await U.mapText(p);
      const rowLine = mt.match(new RegExp(`Row ${s.row} (\\d+)\\w{2} of (\\d+) rows in ${U.esc(s.section)}`));
      const priceShown = isZero(s.price) ? /\bFree\b/.test(mt) : mt.includes(s.price);
      const cabinShown = (c.state.cabins || []).some((cb) => mt.includes(cb));
      await c.check('TC-SM-SEL-003', !!rowLine && priceShown && cabinShown && mt.includes(s.side) && mt.includes(free),
        `Box for ${free}: "${rowLine ? rowLine[0] : 'NO ROW LINE'}", price ${s.price}${priceShown ? '' : ' NOT SHOWN'}, side "${s.side}", cabin ${cabinShown ? 'shown' : 'MISSING'} — against "${s.label}".`,
        { locator: U.mapDialog(p) });

      const a = await U.assigned(p);
      const bb = await U.bottomButtons(p);
      const cardEmpty = new RegExp(`${U.esc(A.name)} ${A.type} Choose a seat below`).test(mt);
      await c.check('TC-SM-SEL-001', a.done === before.done && /^Continue without seats/.test(bb[0] || '') && cardEmpty,
        `Clicking ${free} only opened its box: count ${a.done}/${a.of}, ${A.firstName}'s card ${cardEmpty ? 'still has no seat' : 'CHANGED'}, bottom button "${bb[0] || '?'}".`);
    },
  },
  {
    name: 'Seat map: choosing, moving and clearing seats',
    cases: ['TC-SM-SEL-002', 'TC-SM-PAX-004', 'TC-SM-MPX-004', 'TC-SM-SEL-012', 'TC-SM-MPX-002', 'TC-SM-SEL-006',
      'TC-SM-SEL-007', 'TC-SM-SEL-008', 'TC-SM-NAV-005'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.openMap(p);
      const [A, B] = seatTravellers(c);
      await U.activate(p, A.name);
      const [s1, s2, s3] = U.plainSeats(await U.readSeats(p), 3);
      if (!s3) throw new Error('fewer than 3 plain available seats');
      const n = seatTravellers(c).length;
      const seq = [(await U.bottomButtons(p))[0]];
      const cardOf = async (t) => ((await U.mapText(p)).match(new RegExp(`${U.esc(t.name)} ${t.type} (.{0,50}?) ?(ACTIVE|SELECTED|ASSIGNED|SELECT)\\b`)) || []);

      await U.clickSeat(p, s1);
      const offered = U.norm(await U.bookButton(p, s1).first().innerText().catch(() => ''));
      await U.bookButton(p, s1, A.firstName).click();
      await U.wait(p, 450);
      const a1 = await U.assigned(p);
      const st1 = await U.seatState(p, s1);
      const cardA = await cardOf(A);
      seq.push((await U.bottomButtons(p))[0]);
      await c.check('TC-SM-SEL-002', offered === `Book ${s1} for ${A.firstName}` && a1.done === 1 && st1.heldBy === A.name && (cardA[1] || '').includes(s1),
        `Button "${offered}"; count 0/${a1.of} → ${a1.done}/${a1.of}; ${s1} now "${tail(st1.label)}"; ${A.firstName}'s card "${(cardA[1] || '').trim()} ${cardA[2] || ''}".`);

      if (B) {
        await U.clickSeat(p, s2);
        const next = U.norm(await U.bookButton(p, s2).first().innerText().catch(() => ''));
        const cb = await cardOf(B);
        await c.check('TC-SM-PAX-004', next === `Book ${s2} for ${B.firstName}`,
          `After ${A.firstName}'s seat the next click offered "${next}"; cards: ${A.firstName} ${cardA[2] || '?'}, ${B.firstName} ${cb[2] || '?'}.`);

        await U.clickSeat(p, s1);
        const taken = await U.seatState(p, s1);
        const canBook = await U.bookButton(p, s1).count();
        const ev = `${B.firstName} clicked ${s1}: "${tail(taken.label)}"; book button ${canBook ? 'OFFERED' : 'not offered'}.`;
        const ok = taken.heldBy === A.name && !canBook;
        await c.check('TC-SM-MPX-004', ok, ev);
        await c.check('TC-SM-SEL-012', ok, ev);

        await U.clickSeat(p, s2);
        await U.bookButton(p, s2, B.firstName).click();
        await U.wait(p, 450);
        const a2 = await U.assigned(p);
        const x1 = await U.seatState(p, s1);
        const x2 = await U.seatState(p, s2);
        seq.push((await U.bottomButtons(p))[0]);
        await c.check('TC-SM-MPX-002', x1.heldBy === A.name && x2.heldBy === B.name && a2.done === 2,
          `${s1} → ${x1.heldBy || 'nobody'}, ${s2} → ${x2.heldBy || 'nobody'}; count ${a2.done}/${a2.of}.`);
      }

      const clear = (await U.bottomButtons(p)).some((b) => /^Clear all seats/.test(b));
      const expected = ['Continue without seats', ...(n > 1 ? [`Confirm 1 of ${n} seats`] : []), `Confirm ${n} seat${n > 1 ? 's' : ''}`];
      const of = (await U.assigned(p)).of;
      await c.check('TC-SM-SEL-006', JSON.stringify(seq) === JSON.stringify(expected) && clear && of === n,
        `Bottom button: ${seq.map((x) => `"${x}"`).join(' → ')}; "Clear all seats" ${clear ? 'beside it' : 'MISSING'}; counted out of ${of} for ${c.state.travellers.length} passengers (infant not counted).`);

      await U.activate(p, A.name);
      await U.clickSeat(p, s3);
      const mv = U.mapDialog(p).getByRole('button', { name: new RegExp(`(Book|Move|Change) ${s3}`) }).first();
      const mvName = U.norm(await mv.innerText().catch(() => ''));
      await mv.click();
      await U.wait(p, 500);
      const y1 = await U.seatState(p, s1);
      const y3 = await U.seatState(p, s3);
      const a3 = await U.assigned(p);
      const heldByA = (await U.readSeats(p)).filter((x) => x.heldBy === A.name).map((x) => x.n);
      await c.check('TC-SM-SEL-007', y1.state === 'available' && y3.heldBy === A.name && heldByA.length === 1,
        `${A.firstName} moved ${s1} → ${s3} ("${mvName}"): ${s1} ${y1.state === 'available' ? 'free again' : `still "${tail(y1.label)}"`}; ${A.firstName} holds ${heldByA.join(', ')}; count ${a3.done}/${a3.of}.`);

      await U.clearAll(p);
      const a4 = await U.assigned(p);
      const after = await U.readSeats(p);
      const freed = [s2, s3].every((x) => (after.find((y) => y.n === x) || {}).state === 'available');
      const bb = await U.bottomButtons(p);
      const seatLine = 'Seat Selection' in (await U.breakdown(p)).lines;
      await c.check('TC-SM-SEL-008', a4.done === 0 && freed && /^Continue without seats/.test(bb[0] || '') && !seatLine,
        `Clear all: count ${a4.done}/${a4.of}; seats ${freed ? 'free again' : 'NOT ALL FREED'}; bottom button "${bb[0] || '?'}"; seat charge ${seatLine ? 'STILL IN THE PRICE' : 'gone from the price'}.`);

      const before = await U.published(p);
      await U.continueWithoutSeats(p);
      const closed = !(await U.mapOpen(p));
      const pub = await U.published(p);
      const sel = await U.selectedSeats(p);
      await c.check('TC-SM-NAV-005', closed && pub.amount === before.amount && sel.count === 0,
        `With no seat chosen "Continue without seats" ${closed ? 'closed' : 'DID NOT CLOSE'} the map; ${sel.count ? `${sel.count} SEATED` : 'nobody has a seat'}; amount ${before.raw} → ${pub.raw}.`);
    },
  },
  {
    name: 'Confirming seats',
    cases: ['TC-SM-MPX-007', 'TC-SM-SEL-009', 'TC-SM-PRC-001', 'TC-SM-SEL-010', 'TC-SM-PAX-001', 'TC-SM-PER-007'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const [A, B] = seatTravellers(c);
      const n = seatTravellers(c).length;
      const amount0 = await U.published(p);
      await U.openMap(p);
      await U.activate(p, A.name);
      const [s1] = U.plainSeats(await U.readSeats(p), 1);
      await U.bookSeat(p, s1, A.firstName);
      const noCharge = /No seat charges Free/.test(await U.mapText(p));
      const confirmName = (await U.bottomButtons(p))[0];
      await U.confirmSeats(p);
      const sel = await U.selectedSeats(p);
      const op = await U.openerText(p);
      const amount1 = await U.published(p);
      const lines = (await U.breakdown(p)).lines;
      const closed = !(await U.mapOpen(p));
      const row = sel.rows[0] || {};

      await c.check('TC-SM-MPX-007', closed && sel.count === 1 && row.name === A.name,
        `Confirmed with 1 of ${n} chosen ("${confirmName}"): allowed; summary lists ${sel.rows.map((r) => `${r.name} ${r.seat}`).join(', ') || 'nobody'}.`);
      const paidLine = 'Seat Selection' in lines;
      await c.check('TC-SM-SEL-009', closed && row.seat === s1 && op === 'Change Seats' && (isZero(row.price) ? !paidLine : paidLine),
        `Map ${closed ? 'closed' : 'STILL OPEN'}; "Selected seats ${sel.count} traveller": ${row.name || '?'} / ${row.seat || '?'} / ${row.price || '?'}; seat line in the price: ${paidLine ? 'yes' : 'no'}; the opener now reads "${op}"${op === 'Change Seats' ? '' : ' — the case expects "Change Seats"'}.`,
        { locator: p.getByRole('button', { name: U.OPENER }).first() });

      const b = c.state.bundles;
      if (b && b.allSeats && c.state.currentBundle === b.allSeats) {
        await c.check('TC-SM-PRC-001', noCharge && isZero(row.price) && amount1.amount === amount0.amount,
          `Under '${b.allSeats}': left panel ${noCharge ? '"No seat charges · Free"' : 'DID NOT SAY "No seat charges"'}; seat ${s1} price ${row.price}; amount ${amount0.raw} → ${amount1.raw}.`);
      } else {
        await c.na('TC-SM-PRC-001', 'No fare package with every seat included on this supplier.');
      }

      await U.openMap(p);
      const kept = await U.seatState(p, s1);
      const a = await U.assigned(p);
      const card = new RegExp(`${U.esc(A.name)} ${A.type} ${s1}\\b`).test(await U.mapText(p));
      await c.check('TC-SM-SEL-010', kept.heldBy === A.name && a.done === 1 && card,
        `"${op}" reopened the map: ${s1} ${kept.heldBy ? `still held by ${kept.heldBy}` : 'NO LONGER HELD'}; count ${a.done}/${a.of}; ${A.firstName}'s card ${card ? `shows ${s1}` : 'LOST IT'}.`);

      const inf = c.state.travellers.find((t) => t.type === 'Infant');
      let sel2 = sel;
      if (B) {
        await U.activate(p, B.name);
        const [s2] = U.plainSeats(await U.readSeats(p), 1, { exclude: [s1] });
        await U.bookSeat(p, s2, B.firstName);
        await U.confirmSeats(p);
        sel2 = await U.selectedSeats(p);
        await c.check('TC-SM-PAX-001', !c.state.infantOnStep2 && a.of === n && sel2.count === n && !sel2.rows.some((r) => inf && r.name === inf.name),
          `Step 2 extras for ${c.state.step2Cards.join(' and ') || '?'} only — infant ${inf ? inf.name : '?'} ${c.state.infantOnStep2 ? 'LISTED' : 'not listed'}; seats counted out of ${a.of} for ${c.state.travellers.length} passengers; child given ${s2}; summary "${sel2.count} travellers".`);
      } else {
        await U.ensureMapClosed(p);
      }

      const t = await U.text(p);
      const net = U.num((t.match(/Net Payable Amount: ([\d,.]+)/) || [])[1] || 0);
      const pub = await U.published(p);
      const bd = await U.breakdown(p);
      const seatSum = sel2.rows.reduce((s, r) => s + (isZero(r.price) ? 0 : U.num(r.price)), 0);
      const lineOk = seatSum ? bd.lines['Seat Selection'] === seatSum : !('Seat Selection' in bd.lines);
      await c.check('TC-SM-PER-007', net === pub.amount && sel2.rows.length === sel2.count && sel2.count > 0 && lineOk,
        `Payment summary: Net Payable ${fmt(net)} ${net === pub.amount ? '=' : '≠'} published ${pub.raw}; seats listed: ${sel2.rows.map((r) => `${r.name} ${r.seat} ${r.price}`).join(', ')}; seat line ${seatSum ? `+${fmt(bd.lines['Seat Selection'])} for ${fmt(seatSum)} of seats` : 'none (free seats)'}. Book was not pressed.`);
    },
  },
  {
    name: 'Meal: add and remove',
    cases: ['TC-ML-003'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.ensureMapClosed(p);
      const opts = (await U.dropdownOptions(p, 'Choose a meal')).map(U.parseMeal).filter(Boolean);
      c.state.meals = opts;
      const paid = opts.find((o) => o.price > 0);
      if (!paid) { await c.na('TC-ML-003', `No paid meal offered (${opts.map((o) => o.code).join(', ') || 'none'}).`); return; }
      const t0 = await U.published(p);
      await U.chooseOption(p, 'Choose a meal', paid.code);
      const t1 = await U.published(p);
      const l1 = (await U.breakdown(p)).lines['Meal Preference'];
      await U.clearDropdown(p, paid.shown);
      const t2 = await U.published(p);
      const l2 = (await U.breakdown(p)).lines['Meal Preference'];
      await c.check('TC-ML-003', t1.amount - t0.amount === paid.price && l1 === paid.price && t2.amount === t0.amount && l2 === undefined,
        `Meals offered: ${opts.map((o) => `${o.code} ${fmt(o.price)}`).join(', ')}. Chose ${paid.code}: "Meal Preference +${fmt(l1)}", ${t0.raw} → ${t1.raw}. Removed it: line ${l2 === undefined ? 'gone' : 'STILL THERE'}, total ${t2.raw}.`);
    },
  },
  {
    name: 'Baggage: change the weight',
    cases: ['TC-BG-003'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.ensureMapClosed(p);
      const opts = (await U.dropdownOptions(p, 'Choose a baggage')).map(U.parseBag).filter(Boolean).sort((a, b) => a.kg - b.kg);
      if (opts.length < 2) { await c.na('TC-BG-003', `Only ${opts.length} extra bag on offer.`); return; }
      const light = opts.find((o) => o.kg === 20) || opts[0];
      const heavy = opts[opts.length - 1];
      const t0 = await U.published(p);
      await U.chooseOption(p, 'Choose a baggage', light.name);
      const t1 = await U.published(p);
      await U.chooseOption(p, light.name, heavy.name);
      const t2 = await U.published(p);
      const line = (await U.breakdown(p)).lines['Extra Baggage'];
      c.state.bag = heavy;
      await c.check('TC-BG-003', t2.amount - t0.amount === heavy.price && line === heavy.price,
        `Chose ${light.name} (+${fmt(light.price)}): ${t0.raw} → ${t1.raw}. Changed to ${heavy.name} (+${fmt(heavy.price)}): one "Extra Baggage +${fmt(line)}" line, total ${t2.raw}${t2.amount - t0.amount === heavy.price ? ' — the first bag is gone' : ' — THE FIRST BAG IS STILL CHARGED'}.`);
    },
  },
  {
    name: 'Back a step without editing',
    cases: ['TC-SM-PER-001'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.ensureMapClosed(p);
      const a = await snapshot(c);
      await U.prevToStep1(p);
      await U.acceptTerms(p);
      await U.nextToStep2(p);
      const b = await snapshot(c);
      await c.check('TC-SM-PER-001', a.seats !== '[]' && a.seats === b.seats && a.lines === b.lines && a.pub === b.pub && b.opener === 'Change Seats',
        `Prev to step 1 (nothing edited), then Next: seats ${a.seats === b.seats ? 'unchanged' : 'CHANGED'} (${(JSON.parse(b.seats) || []).map((r) => `${r.name} ${r.seat}`).join(', ') || 'none'}), price lines ${a.lines === b.lines ? 'unchanged' : 'CHANGED'}, amount ${fmt(a.pub)} → ${fmt(b.pub)}; opener "${b.opener}".`);
    },
  },
  {
    name: 'Back a step and edit a passenger',
    cases: ['TC-SM-CNF-018'],
    async run(c) {
      const U = c.ui; const p = c.page;
      await U.ensureMapClosed(p);
      const a = await snapshot(c);
      await U.prevToStep1(p);
      const child = c.state.travellers.find((t) => t.type === 'Child') || c.state.travellers[0];
      await U.openSection(p, child.sec);
      const cur = await U.titleOf(p, child.sec);
      const orig = c.state.childOriginalTitle;
      let edit;
      if (orig && orig !== cur) { await U.setTitle(p, child.sec, cur, orig); edit = `${cur} → ${orig} (back to the saved title)`; child.title = orig; }
      else { const alt = cur === 'Ms' ? 'Mrs' : 'Ms'; await U.setTitle(p, child.sec, cur, alt); await U.setTitle(p, child.sec, alt, cur); edit = `${cur} → ${alt} → ${cur}`; }
      await U.acceptTerms(p);
      try {
        await U.nextToStep2(p);
      } catch (err) {
        // A documented, pre-existing quirk (see TC-SM-BND-002's own sheet note: "the stuck-wizard
        // observation from the earlier 16 attempts"), not something this step caused. Record it on
        // CNF-018 with that attribution and stop here rather than letting a bare timeout cascade
        // into every later step's own, equally honest "map not reachable" result.
        await c.blocked('TC-SM-CNF-018', `Edited ${child.firstName}'s title on step 1 (${edit}) and pressed Next: step 2 never opened (${String((err && err.message) || err).split('\n')[0].slice(0, 120)}). Matches the sheet's own documented stuck-wizard observation (TC-SM-BND-002 notes), not a new finding.`, { fullPage: false });
        return;
      }
      const b = await snapshot(c);
      const lost = [];
      if (a.seats !== '[]' && b.seats === '[]') lost.push('seats');
      for (const k of ['Meal Preference', 'Extra Baggage', 'Seat Selection']) if (k in JSON.parse(a.lines) && !(k in JSON.parse(b.lines))) lost.push(k.toLowerCase());
      const ev = `Edited ${child.firstName}'s title on step 1 (${edit}) and pressed Next: ${lost.length ? `${lost.join(', ')} silently discarded` : 'every choice kept'}; amount ${fmt(a.pub)} → ${fmt(b.pub)}; opener "${b.opener}".`;
      if (lost.length) await c.fail('TC-SM-CNF-018', `Known fault reproduced. ${ev}`, { locator: p.getByRole('button', { name: U.OPENER }).first() });
      else await c.pass('TC-SM-CNF-018', ev);
    },
  },
  {
    name: 'Changing the fare package',
    cases: ['TC-SM-BND-002'],
    async run(c) {
      const U = c.ui; const p = c.page; const b = c.state.bundles;
      if (!b || !b.allSeats || !b.paidSeats) { await c.na('TC-SM-BND-002', 'Needs one package with every seat included and one without.'); return; }
      await U.openMap(p);
      const [A] = seatTravellers(c);
      await U.activate(p, A.name);
      const [s] = U.plainSeats(await U.readSeats(p), 1);
      await U.bookSeat(p, s, A.firstName);
      await U.confirmSeats(p);
      const before = await U.published(p);
      await U.prevToStep1(p);
      await U.chooseBundle(p, b.paidSeats, b.names);
      c.state.currentBundle = b.paidSeats;
      await U.acceptTerms(p);
      await U.nextToStep2(p);
      const sel = await U.selectedSeats(p);
      const pub = await U.published(p);
      const bd = await U.breakdown(p);
      const row = sel.rows.find((r) => r.seat === s);
      const stillFree = !!row && isZero(row.price);
      const priced = !!row && !isZero(row.price);
      const totalOk = !priced || bd.lines['Seat Selection'] === U.num(row.price);
      await c.check('TC-SM-BND-002', !stillFree && totalOk,
        `Confirmed free seat ${s} under '${b.allSeats}' (${before.raw}); switched to '${b.paidSeats}' and came back: seat ${row ? `kept at ${row.price}` : 'released'}; amount ${pub.raw}; Bundle Fare +${fmt(bd.lines['Bundle Fare'])}${priced ? `, seat line +${fmt(bd.lines['Seat Selection'])}` : ''}. Clearing ancillaries on a package change is intended (business ruling, 27 Sep 2026).`,
        { locator: p.getByRole('button', { name: U.OPENER }).first() });
    },
  },
  {
    name: 'Paid seats: prices, rapid clicks, the breakdown',
    cases: ['TC-SM-PRC-003b', 'TC-SM-NEG-003', 'TC-SM-PRC-003', 'TC-SM-PRC-004', 'TC-SM-PER-002', 'TC-SM-PRC-002', 'TC-SM-BND-005'],
    async run(c) {
      const U = c.ui; const p = c.page; const b = c.state.bundles;
      await U.ensureMapClosed(p);
      if (b && b.paidSeats && c.state.currentBundle !== b.paidSeats) {
        await U.prevToStep1(p);
        await U.chooseBundle(p, b.paidSeats, b.names);
        c.state.currentBundle = b.paidSeats;
        await U.acceptTerms(p);
        await U.nextToStep2(p);
      }
      const pkg = c.state.currentBundle || 'this fare';
      // TC-SM-PER-002 order: a meal and a bag first, then the seat.
      let meal = null; let bag = null;
      if (c.wants('TC-SM-PER-002')) {
        if (c.supported('Meal')) {
          meal = (await U.dropdownOptions(p, 'Choose a meal')).map(U.parseMeal).filter(Boolean).find((o) => o.price > 0) || null;
          if (meal) await U.chooseOption(p, 'Choose a meal', meal.code);
        }
        if (c.supported('Baggage')) {
          bag = (await U.dropdownOptions(p, 'Choose a baggage')).map(U.parseBag).filter(Boolean).sort((x, y) => x.price - y.price)[0] || null;
          if (bag) await U.chooseOption(p, 'Choose a baggage', bag.name);
        }
      }
      const pub0 = await U.published(p);

      await U.openMap(p);
      const [A] = seatTravellers(c);
      await U.activate(p, A.name);
      const seats = await U.readSeats(p);
      const heads = await U.sectionHeaders(p);
      const avail = seats.filter((x) => x.state === 'available');
      const prices = [...new Set(avail.map((x) => x.price))];
      const mism = [];
      for (const [sid, h] of Object.entries(heads)) {
        const ps = avail.filter((x) => x.section === sid).map((x) => (isZero(x.price) ? 0 : U.num(x.price)));
        if (!ps.length) continue;
        const lo = Math.min(...ps); const hi = Math.max(...ps);
        let ok = true;
        if (/^All seats free$/.test(h.price)) ok = hi === 0;
        else if (/^Free – /.test(h.price)) ok = lo === 0 && hi === U.num(h.price.split('–')[1]);
        else if (/^from /.test(h.price)) ok = lo === U.num(h.price) && lo > 0;
        else if (/–/.test(h.price)) ok = lo === U.num(h.price.split('–')[0]) && hi === U.num(h.price.split('–')[1]);
        else ok = lo === hi && lo === U.num(h.price);
        if (!ok) mism.push(`${sid} says "${h.price}" but its seats run ${fmt(lo)}–${fmt(hi)}`);
      }
      const ev3b = `Prices for ${A.firstName} under '${pkg}': ${prices.join(', ')}; section headers ${Object.entries(heads).map(([k, h]) => `${k} "${h.price}"`).join(', ')}${mism.length ? ` — MISMATCH: ${mism.join('; ')}` : ' — each agrees with its seats'}.`;
      if (mism.length) await c.fail('TC-SM-PRC-003b', ev3b, { locator: U.mapDialog(p) });
      else if (prices.length < 2) await c.inconclusive('TC-SM-PRC-003b', `Only one price on this flight. ${ev3b}`);
      else await c.pass('TC-SM-PRC-003b', ev3b);

      const chg = avail.filter((x) => x.features.includes('Chargeable seat'));
      if (chg.length) {
        const freeChg = chg.filter((x) => isZero(x.price));
        await c.check('TC-SM-PRC-002', !freeChg.length, `Under '${pkg}': ${chg.length - freeChg.length} of ${chg.length} "Chargeable seat" seats have a price${freeChg.length ? `; ${freeChg.length} READ FREE, e.g. ${freeChg[0].n}` : ''}.`, { locator: U.mapDialog(p) });
      }
      if (b && /Seat selection fees apply/i.test((b.info[pkg] || {}).services || '')) {
        const paidCount = avail.filter((x) => !isZero(x.price)).length;
        await c.check('TC-SM-BND-005', paidCount > 0, `'${pkg}' says "Seat selection fees apply": ${avail.length} selectable, ${paidCount} with a price, ${avail.length - paidCount} free.`);
      }

      const [paidSeat] = U.plainSeats(seats, 1, { paid: true });
      if (!paidSeat) {
        for (const id of ['TC-SM-NEG-003', 'TC-SM-PRC-003', 'TC-SM-PRC-004', 'TC-SM-PER-002']) await c.na(id, `No seat with a price under '${pkg}'.`);
        await U.continueWithoutSeats(p);
        return;
      }
      const price = U.num(seats.find((x) => x.n === paidSeat).price);
      await U.clickSeat(p, paidSeat);
      const book = U.bookButton(p, paidSeat, A.firstName);
      for (let i = 0; i < 5; i += 1) await book.click({ timeout: 1500 }).catch(() => {});
      await U.wait(p, 600);
      const a = await U.assigned(p);
      const held = (await U.readSeats(p)).filter((x) => x.heldBy === A.name).map((x) => x.n);
      await c.check('TC-SM-NEG-003', a.done === 1 && held.length === 1,
        `Pressed "Book ${paidSeat} for ${A.firstName}" 5 times quickly: count ${a.done}/${a.of}; ${A.firstName} holds ${held.join(', ') || 'nothing'}.`);

      await U.confirmSeats(p);
      const pub1 = await U.published(p);
      const bd1 = await U.breakdown(p);
      const rise = +(pub1.amount - pub0.amount).toFixed(2);
      await c.check('TC-SM-PRC-003', bd1.lines['Seat Selection'] === price && rise === price,
        `Confirmed ${paidSeat} at ${fmt(price)} under '${pkg}': "Seat Selection +${fmt(bd1.lines['Seat Selection'] || 0)}" on its own line (Bundle Fare +${fmt(bd1.lines['Bundle Fare'] || 0)} separate); amount ${pub0.raw} → ${pub1.raw} (+${fmt(rise)}).`);

      const total = (xs) => xs.reduce((s, x) => s + x.amount, 0);
      const lineSum = Object.values(bd1.lines).reduce((x, y) => x + y, 0);
      const computed = total(bd1.base) + bd1.anc + total(bd1.tax);
      const sumOk = Math.abs(lineSum - bd1.anc) < 0.01 && Math.abs(computed - bd1.total) < 0.01 && bd1.total === pub1.amount;
      await c.check('TC-SM-PRC-004', sumOk,
        `Base ${fmt(total(bd1.base))} + extras ${fmt(bd1.anc)} (${Object.entries(bd1.lines).map(([k, v]) => `${k} ${fmt(v)}`).join(' + ')} = ${fmt(lineSum)}) + tax ${fmt(total(bd1.tax))} = ${fmt(computed)}; Total Amount ${fmt(bd1.total)}; published ${pub1.raw}.`);

      if (c.wants('TC-SM-PER-002') && (meal || bag)) {
        const want = ['Seat Selection', ...(meal ? ['Meal Preference'] : []), ...(bag ? ['Extra Baggage'] : [])];
        const allThere = want.every((k) => k in bd1.lines);
        let changed = '';
        let delta = 0;
        if (meal) {
          const other = c.state.meals && c.state.meals.find((o) => o.code !== meal.code);
          const pick = other || (await U.dropdownOptions(p, meal.shown)).map(U.parseMeal).filter(Boolean).find((o) => o.code !== meal.code);
          if (pick) { await U.chooseOption(p, meal.shown, pick.code); changed = `meal ${meal.code} → ${pick.code}`; delta = pick.price - meal.price; }
        }
        const pub2 = await U.published(p);
        const bd2 = await U.breakdown(p);
        const sel = await U.selectedSeats(p);
        const seatKept = sel.rows.some((r) => r.seat === paidSeat && U.num(r.price) === price) && bd2.lines['Seat Selection'] === price;
        await c.check('TC-SM-PER-002', allThere && seatKept && Math.abs(pub2.amount - pub1.amount - delta) < 0.01,
          `${meal ? `Meal ${meal.code} +${fmt(meal.price)}, ` : ''}${bag ? `bag ${bag.name} +${fmt(bag.price)}, ` : ''}seat ${paidSeat} +${fmt(price)}: ${allThere ? 'each on its own line' : 'A LINE IS MISSING'}. Changed the ${changed || 'nothing (no second meal)'} after the seat: seat ${seatKept ? `kept at ${fmt(price)}` : 'LOST OR REPRICED'}, total ${pub1.raw} → ${pub2.raw}.`);
      }
    },
  },
  {
    name: 'Every fare package: its seat map and its meals',
    cases: ['TC-SM-BND-004', 'TC-ML-004'],
    async run(c) {
      const U = c.ui; const p = c.page; const b = c.state.bundles;
      if (!b) return;
      await U.ensureMapClosed(p);
      // the current package last: every earlier switch has already cleared its choices
      const order = b.names.filter((n) => n !== c.state.currentBundle).concat(b.names.includes(c.state.currentBundle) ? [c.state.currentBundle] : []);
      const per = {};
      for (const n of order) {
        await U.prevToStep1(p);
        await U.chooseBundle(p, n, b.names);
        c.state.currentBundle = n;
        await U.acceptTerms(p);
        await U.nextToStep2(p);
        const meals = c.supported('Meal') ? await U.dropdownOptions(p, 'Choose a meal') : null;
        await U.openMap(p);
        per[n] = { seats: (await U.readSeats(p)).length, meals };
        await U.continueWithoutSeats(p);
      }
      const working = Object.values(per).every((x) => x.seats > 0);
      await c.check('TC-SM-BND-004', working, `Each package opened a working seat map: ${Object.entries(per).map(([n, x]) => `${n} ${x.seats} seats`).join(', ')}.`);

      if (c.wants('TC-ML-004')) {
        const noMeal = b.names.filter((n) => /No meal/i.test(b.info[n].services));
        const withMeal = b.names.filter((n) => !/No meal/i.test(b.info[n].services) && /meal|snack/i.test(b.info[n].services));
        if (!noMeal.length || !withMeal.length) { await c.na('TC-ML-004', 'Needs one package that says "No meal" and one that includes a meal.'); return; }
        const lists = [...new Set(Object.values(per).map((x) => JSON.stringify(x.meals)))];
        const list = per[noMeal[0]].meals || [];
        const hasFree = list.some((o) => (U.parseMeal(o) || {}).price === 0);
        await c.check('TC-ML-004', lists.length === 1 && hasFree,
          `'${noMeal[0]}' says "No meal"; '${withMeal[0]}' includes a meal. Meal list ${lists.length === 1 ? 'identical under every package' : 'DIFFERS between packages'}: ${list.join(' | ')}${hasFree ? '' : ' — NO FREE MEAL'}.`);
      }
    },
  },
  {
    name: 'The accepted price everywhere',
    cases: ['TC-SM-FRC-005'],
    async run(c) {
      if (!c.state.oldPrice) return; // no price change: recorded as Not Applicable with FRC-001
      await noteOldPrice(c, 'the last step 2');
      const seen = c.state.oldSeen || [];
      await c.check('TC-SM-FRC-005', !seen.length,
        `Old search price ${c.state.oldPrice} ${seen.length ? `SHOWN on ${seen.join(', ')}` : 'appeared nowhere'} on the package step, the extras step or the payment section; every total was built after accepting ${c.state.newPrice}.`);
    },
  },
];

module.exports = {
  id: '01',
  pax: PAX,
  steps,
  notAutomated: {
    'TC-SM-A11Y-001': 'Needs a person on a smaller screen — manual check.',
    'TC-SM-A11Y-002': 'Needs a screen-reader pass — manual check.',
  },
};
