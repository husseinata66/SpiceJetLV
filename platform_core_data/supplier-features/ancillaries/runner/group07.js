'use strict';
// Ancillaries — Setup Group 07: 2 adults + 1 infant, one-way, Economy. The infant starts linked to
// adult A (the dialog's first option); TC-SM-EXR-005 re-links it to adult B on step 1 and proves the
// exit-row refusal moves with the link, not with "has an infant on the booking" in general.

const PAX = { adults: 2, children: 0, infants: 1 };
const freshDocs = (n) => { const base = String(Date.now()).slice(-7); return Array.from({ length: n }, (_, i) => `R${base}${i + 60}`); };
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
      c.env('Search', `${s.from}→${s.to}, 2 adults + 1 infant · asked for ${s.daysFromToday} day(s) from today`);
      await U.clickCard(p, cards.index);
      if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
        await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
        await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
      }
      const criteria = { ...s, criteria: { adults: [{}, {}] } }; // infant links to the first option by default
      const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(3));
      c.state.travellers = travellers;
      c.state.adultA = travellers.filter((t) => t.type === 'Adult')[0];
      c.state.adultB = travellers.filter((t) => t.type === 'Adult')[1];
      c.state.infant = travellers.find((t) => t.type === 'Infant');
      c.env('Passengers', `${c.state.adultA.name} (A) · ${c.state.adultB.name} (B) · ${c.state.infant.name} (infant, linked to A)`);

      if (await U.hasBundleStep(p)) {
        const names = await U.bundleNames(p);
        let chosen = names[0];
        for (const n of names) { await U.chooseBundle(p, n, names); chosen = n; if (/Seat selection: All seats/i.test(await U.bundleServices(p, n))) break; }
        c.env('Package', chosen);
      }
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
    },
  },
  {
    name: 'The exit-row refusal follows the infant\'s linked adult',
    cases: ['TC-SM-EXR-005'],
    async run(c) {
      const U = c.ui; const p = c.page;
      const { adultA, adultB } = c.state;
      const read = async (seat) => { await U.activate(p, adultA.name); const a = await U.seatState(p, seat); await U.activate(p, adultB.name); const b = await U.seatState(p, seat); return { a, b }; };

      await U.openMap(p);
      const seats = await U.readSeats(p);
      const exits = seats.filter((x) => x.features.includes('Exit and emergency exit'));
      if (!exits.length) {
        await c.inconclusive('TC-SM-EXR-005', 'No "Exit and emergency exit" seat on this flight\'s map — needs a flight whose inventory actually offers one.');
        await U.ensureMapClosed(p);
        return;
      }
      const seat = exits[0].n;
      const before = await read(seat);
      const beforeOk = before.a.state !== 'available' && before.b.state === 'available';
      if (!beforeOk) {
        // The rule is not enforced on the map to begin with (OmanAir, 2026-10-19: an adult holding an infant is
        // offered the exit seat) — a refusal that does not exist cannot follow the infant to another adult.
        await c.fail('TC-SM-EXR-005', `Infant linked to ${adultA.firstName}: seat ${seat} — A (holds the infant) "${tail(before.a.label)}", B "${tail(before.b.label)}". Expected A refused and B allowed; ${before.a.state === 'available' ? 'the adult holding the infant is OFFERED the exit seat, so there is no refusal to follow the infant to another adult' : 'B is not allowed either'}. The re-link half was not run.`, { locator: U.mapDialog(p) });
        await U.ensureMapClosed(p);
        return;
      }

      await U.ensureMapClosed(p);
      await U.prevToStep1(p);
      await U.setAssignedTo(p, '1- Infant', adultB.firstName);
      await U.acceptTerms(p);
      await U.nextToStep2(p, 60000);
      // Seen live (2026-10-19): after the re-link and Next, step 2 came back with its whole Ancillaries
      // panel empty — no Meal, Baggage or Select Seat at all. Same family as CNF-018 (editing step-1
      // passenger data disturbs step 2) but more severe: there, the panel stayed and only the choices
      // were cleared. With no seat button left the case's method cannot continue — report that
      // honestly instead of timing out on a button that is not there.
      const opener = p.getByRole('button', { name: U.OPENER });
      for (let i = 0; i < 20 && !(await opener.count()); i += 1) await U.wait(p, 500); // allow a slow re-render
      if (!(await opener.count())) {
        await c.blocked('TC-SM-EXR-005', `Before the re-link: seat ${seat} — A "${tail(before.a.label)}", B "${tail(before.b.label)}". After re-linking the infant to ${adultB.firstName} on step 1 and pressing Next, step 2's entire Ancillaries panel came back EMPTY (no Meal, Baggage or Select Seat), so the "after" half cannot be checked. Observation worth reporting: same family as CNF-018 (editing step-1 passenger data disturbs step 2) but more severe — the panel itself is gone, not just earlier choices.`, { fullPage: true });
        return;
      }
      await U.openMap(p);
      const after = await read(seat);
      const afterOk = after.a.state === 'available' && after.b.state !== 'available';

      await c.check('TC-SM-EXR-005', beforeOk && afterOk,
        `Linked to ${adultA.firstName}: seat ${seat} — A "${tail(before.a.label)}", B "${tail(before.b.label)}" (${beforeOk ? 'A refused, B allowed' : 'WRONG — expected A refused, B allowed'}). Re-linked to ${adultB.firstName} on step 1: seat ${seat} — A "${tail(after.a.label)}", B "${tail(after.b.label)}" (${afterOk ? 'refusal moved to B, A now allowed' : 'WRONG — refusal did not move'}).`,
        { locator: U.mapDialog(p) });
    },
  },
];

module.exports = { id: '07', pax: PAX, steps, notAutomated: {} };
