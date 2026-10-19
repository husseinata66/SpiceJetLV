'use strict';
// Optional ASSISTED tail for the exit-seat groups (05, 06): actually BOOK the exit seat the seat map let
// through, so it can be tracked that the booking is refused. Only when `settings.verifyExitBooking` is true
// (set per Supplier — OmanAir, human, 2026-10-19: "it fails on the UI, but if you book it gives a booking
// failure with the reason") and the run is --headed: the HUMAN presses Book, the runner reads every surface.
//
// If the booking is ACCEPTED it is a real booking and the wallet is charged — the prompt says so. The
// evidence is appended to the case (the worse result still wins, so a UI failure stays a failure).

const P = require('./postbook');

const wanted = (c) => !!c.settings.verifyExitBooking;

/** Wallet and My Bookings before the booking page is built (reading them later would leave the booking). */
async function baseline(c) {
  if (!wanted(c) || !c.headed) return;
  c.state.exitBefore = { wallet: await P.readWallet(c), bookings: (await P.readMyBookings(c)).total };
}

async function dashboardText(c) {
  await P.go(c, '/dashboard', 2500);
  return ((await c.ui.text(c.page)).match(/\d+ TOTAL FLIGHTS \d+ PENDING \d+ TICKETED/i) || ['not shown'])[0];
}

/**
 * @param what  e.g. "an adult holding an infant on exit seat 18A"
 * @param ids   case ids to attach the evidence to
 */
async function bookAndVerify(c, what, ids) {
  if (!wanted(c)) return;
  if (!c.headed) { c.log('verifyExitBooking is set but this run is headless — the booking step needs the human, so it was skipped.'); return; }
  const U = c.ui; const p = c.page;
  await U.ensureMapClosed(p); // keeps the chosen seat
  const quote = (await U.text(p)).match(/Net Payable Amount: ([\d,.]+ [A-Z]{3})/);
  const dashBefore = null;
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
      prompt: `Press BOOK now: ${what}. EXPECTED: the booking is refused with a reason. (If it is accepted it is a REAL booking and the wallet is charged.) Quote ${quote ? quote[1] : '?'}.`,
    });
    await U.wait(p, 2500);
  } finally { p.off('response', onResponse); }
  const conf = await P.readConfirmation(c);
  const err = ((calls.bookingConfirm || {}).body || '').match(/"errorMsg"\s*:\s*"([^"]*)"/);
  const reason = (err && err[1]) || conf.airlineError || null;
  const before = c.state.exitBefore;
  const wallet = await P.readWallet(c);
  const row = await P.myBookingsRow(c, conf.orderId);
  const dash = await dashboardText(c);
  const charged = before ? !P.near(before.wallet.amount, wallet.amount) : null;
  const refused = conf.status === 'Failed' || !!reason;
  const surfaces = [
    `confirmation page: status "${conf.status}"${reason ? `, reason "${reason}"` : ', NO reason shown'}`,
    `booking response: HTTP ${(calls['book-and-pay'] || {}).status || '?'}`,
    `My Bookings: ${row ? 'an ordinary row (no failure mark)' : 'not listed'}`,
    `Dashboard: ${dash}`,
    `wallet: ${before ? `${before.wallet.text} → ${wallet.text} (${charged ? 'CHARGED' : 'not charged'})` : wallet.text}`,
  ].join('; ');
  for (const id of ids) {
    if (refused && !charged) await c.pass(id, `Booking attempt (${what}), the human pressed Book: REFUSED at booking${reason ? ` — "${reason}"` : ' — but with no reason shown'}. ${surfaces}.`);
    else await c.fail(id, `Booking attempt (${what}), the human pressed Book: ${refused ? 'refused, yet the wallet was charged' : `the booking WAS ACCEPTED (order ${conf.orderId}, status ${conf.status})`}. ${surfaces}.`);
  }
}

module.exports = { baseline, bookAndVerify };
