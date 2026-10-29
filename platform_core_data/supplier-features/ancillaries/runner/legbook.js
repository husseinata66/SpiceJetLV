'use strict';
// Ancillaries — the leg space seat rule when the booking is submitted (Supplier rule
// `no-leg-space-seat-inf`, Spicejet, human decisions Hussein 2026-10-28). The seat map LETS an infant-holding
// adult select a leg space seat (TC-SM-LEG-002); Book, Hold or Pay after Hold with one is refused:
// Portal → "In Progress", Admin → "Failed", wallet unchanged on both. Compliant seats → Confirmed (Book) /
// On Hold → Booked (Pay), wallet charged — that path is Groups 14 and 17, whose plain-seat choice avoids leg
// space seats. A CHILD may have a leg space seat (human decision 2026-10-28): Group 21 books one and expects
// Confirmed + the wallet charged. Groups 20 and 22 each build ONE booking that deliberately breaks the rule. ASSISTED: the HUMAN presses
// Book or Hold; the runner never does. Everything else is read-only.

const P = require('./postbook');
const { freshDocs } = require('./docs');

const fmt2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tail = (label) => String(label).split(', ').slice(-2).join(', ');
// The status a submission with a rule-breaking seat ends in, per application (human decision, Hussein 2026-10-28):
// Portal "In Progress", Admin "Failed". settings.ruleRefusedStatus may override it per Supplier.
const refusedStatus = (c) => ((c.settings.ruleRefusedStatus || {})[c.app]) || (c.app === 'Admin' ? 'Failed' : 'In Progress');
/** The wallet after a submission; Admin's Wallet History is slow and sometimes empty on the first read, so try twice. */
async function walletAfter(c) { try { return await P.readWallet(c); } catch (e) { await c.ui.wait(c.page, 3000); return P.readWallet(c); } }

/**
 * @param {{id: string, who: 'infant'|'child', mode: 'book'|'hold', caseId: string}} o
 */
function makeGroup({ id, who, mode, caseId }) {
  const PAX = who === 'infant' ? { adults: 1, children: 0, infants: 1 } : { adults: 1, children: 1, infants: 0 };
  const whoText = who === 'infant' ? '1 adult holding 1 infant' : '1 adult + 1 child';

  const steps = [
    {
      name: `Build the booking with a leg space seat for the ${who === 'infant' ? 'infant-holding adult' : 'child'}`,
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
        c.env('Search', `${s.from}→${s.to}, ${whoText} · ${days} day(s) from today`);
        await U.clickCard(p, cards.index);
        if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
          await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
          await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
        }
        const criteria = who === 'infant' ? { adults: [{}], infants: [{}] } : { adults: [{}], children: [{}] };
        const { travellers } = await U.fillPassengers(p, { ...s, criteria }, PAX, freshDocs(2));
        c.state.travellers = travellers;
        const target = travellers.find((t) => t.type === (who === 'infant' ? 'Adult' : 'Child'));
        c.state.target = target;
        c.env('Passengers', travellers.map((t) => `${t.name} (${t.type})`).join(' · '));
        await U.acceptTerms(p);
        await U.nextToStep2(p, 60000);

        await U.openMap(p);
        await U.activate(p, target.name);
        const seats = await U.readSeats(p);
        const leg = seats.filter((x) => x.state === 'available' && x.features.some((f) => /leg ?space/i.test(f)));
        let seat = null;
        for (const x of leg) {
          await U.clickSeat(p, x.n);
          const offered = (await U.mapDialog(p).getByRole('button', { name: new RegExp(`Book ${U.esc(x.n)} for ${U.esc(target.firstName)}`) }).count()) > 0;
          if (offered) { seat = x.n; break; }
        }
        if (!seat) throw new Error(`the seat map offers no leg space seat to ${target.firstName} — the rule is already enforced on the map, so the ${mode === 'book' ? 'Book' : 'Hold'} path cannot be set up`);
        await U.bookSeat(p, seat, target.firstName);
        await U.confirmSeats(p);
        const st = await U.seatState(p, seat).catch(() => null);
        c.state.seat = seat;
        const t = await U.text(p);
        c.state.quote = P.money((t.match(/Net Payable Amount: ([\d,.]+)/) || [])[1] || 0);
        c.env(mode === 'book' ? 'Before Book' : 'Before Hold', `${target.name} (${target.type}) on leg space seat ${seat}${st ? ` ("${tail(st.label)}")` : ''} · quote ${fmt2(c.state.quote)} · wallet ${c.state.walletBefore.text}`);
      },
    },
  ];

  if (mode === 'book') {
    steps.push({
      name: who === 'child' ? 'The human presses Book; a child MAY have a leg space seat — the booking must be Confirmed and the wallet charged' : 'The human presses Book; the booking must be refused (Portal In Progress, Admin Failed) and the wallet untouched',
      cases: [caseId],
      assisted: 'Book',
      async run(c) {
        const { target, seat, quote, walletBefore } = c.state;
        await c.humanGate({
          allow: [/^book$/i],
          until: /booking-confirmation/,
          prompt: `Press BOOK now: ${target.name} (${target.type}) on leg space seat ${seat}. ${who === 'child' ? `EXPECTED: status "Confirmed" and the wallet charged ${fmt2(quote)} (a child may have a leg space seat).` : `EXPECTED: status "${refusedStatus(c)}" and the wallet NOT charged (quote ${fmt2(quote)}).`}`,
        });
        await c.ui.wait(c.page, 2500);
        const conf = await P.readConfirmation(c);
        const wallet = await walletAfter(c);
        const charged = !P.near(walletBefore.amount, wallet.amount);
        c.env('After Book', `order ${conf.orderId} · ref ${conf.ref} · PNR ${conf.pnr} · status ${conf.status} · wallet ${walletBefore.text} → ${wallet.text}`);
        const ev = `${target.name} (${target.type}) on leg space seat ${seat}, the human pressed Book: status "${conf.status}" (order ${conf.orderId}, ref ${conf.ref}); wallet ${walletBefore.text} → ${wallet.text} (${charged ? 'CHARGED' : 'not charged'}).`;
        if (who === 'child') {
          // A child may have a leg space seat (human decision, Hussein 2026-10-28): passes when the booking is Confirmed
          // and the wallet is charged the quoted amount.
          const drop = walletBefore.amount - wallet.amount;
          const paid = P.near(drop, quote);
          await c.check(caseId, conf.status === 'Confirmed' && paid, `${ev}${conf.status !== 'Confirmed' ? ' Expected "Confirmed" — a child may have a leg space seat.' : ''}${paid ? ` Wallet charged ${fmt2(drop)} = the quote.` : ` Expected the wallet charged ${fmt2(quote)}, it moved ${fmt2(drop)}.`}`);
          return;
        }
        await c.check(caseId, conf.status === refusedStatus(c) && !charged, `${ev}${conf.status !== refusedStatus(c) ? ` Expected "${refusedStatus(c)}" on ${c.app}.` : ''}${charged ? ' Expected no wallet change.' : ''}`);
      },
    });
  } else {
    // Hold is ruled the same way (human decision, Hussein 2026-10-28, after Group 22 showed it): Hold with a leg
    // space seat for an infant-holding adult goes "In Progress" (not On Hold) and charges nothing.
    steps.push({
      name: "The human presses Hold; the booking must be refused (Portal In Progress, Admin Failed — not On Hold) and the wallet untouched",
      cases: [caseId],
      assisted: "Hold",
      async run(c) {
        const { target, seat, quote, walletBefore } = c.state;
        if (!(await c.page.getByRole("button", { name: "Hold", exact: true }).count())) throw new Error("this booking page offers no Hold button");
        await c.humanGate({
          allow: [/^hold$/i],
          until: /booking-confirmation/,
          prompt: `Press HOLD now: ${target.name} (${target.type}) on leg space seat ${seat}. EXPECTED: status "${refusedStatus(c)}" (not On Hold) and the wallet NOT charged (quote ${fmt2(quote)}).`,
        });
        await c.ui.wait(c.page, 2500);
        const held = await P.readConfirmation(c);
        const wallet = await walletAfter(c);
        const charged = !P.near(walletBefore.amount, wallet.amount);
        c.env("After Hold", `order ${held.orderId} · ref ${held.ref} · status ${held.status} · wallet ${walletBefore.text} → ${wallet.text}`);
        const ev = `${target.name} (${target.type}) on leg space seat ${seat}, the human pressed Hold: status "${held.status}" (order ${held.orderId}, ref ${held.ref}); wallet ${walletBefore.text} → ${wallet.text} (${charged ? "CHARGED" : "not charged"}).`;
        await c.check(caseId, held.status === refusedStatus(c) && !charged, `${ev}${held.status !== refusedStatus(c) ? ` Expected "${refusedStatus(c)}" on ${c.app}.` : ""}${charged ? " Expected no wallet change." : ""}`);
      },
    });
  }

  return { id, pax: PAX, assisted: mode === 'book' ? 'Book' : 'Hold', steps, notAutomated: {} };
}

module.exports = { makeGroup };
