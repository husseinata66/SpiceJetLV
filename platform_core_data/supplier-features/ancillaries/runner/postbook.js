'use strict';
// Read-only pages around a booking, shared by the assisted booking groups (14, 15, 16) and Group 13.
// Nothing here clicks anything that changes data: it navigates, searches reports and reads text.
// Every reader was proven by hand on Flynas, 2026-10-19 (Groups 13–16):
//   - the Portal allows ONE tab per session ("Multiple Tabs Detected"), so everything runs in the one page;
//   - the first wallet read straight after an action can be stale — reach it through the Dashboard;
//   - the Statement report updates hourly, so a booking minutes old is normally not there yet;
//   - report date pickers refuse a future "To" date.
//
// Admin has no My Bookings and no booking-details page: `readCosting` and `readItinerary` go through
// PNR Query instead (admin_post.js), looked up by the NDC Reference `readConfirmation` records in
// `c.lookup[orderId]`. `readWallet` reads the Wallet History report. `readEticket` is unchanged — the
// e-ticket page itself is shared with the Portal.

const A = require('./admin_post');
const AP = require('./admin_parse');

const money = (t) => Number(String(t).replace(/,/g, ''));
const near = (a, b, tol = 0.11) => Math.abs(a - b) <= tol; // the wallet and the Statement report show one decimal

async function go(c, path, ms = 2500) {
  await c.page.goto(new URL(path, c.baseUrl).href, { timeout: 30000 });
  await c.ui.wait(c.page, ms);
}

async function textUntil(c, re, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    const t = await c.ui.text(c.page);
    if (re.test(t)) return t;
    await c.ui.wait(c.page, 500);
  }
  return c.ui.text(c.page);
}

async function readWallet(c) {
  if (c.app === 'Admin') return A.readWallet(c);
  await go(c, '/dashboard', 1500);
  await go(c, '/topup-wallet', 500);
  const t = await textUntil(c, /Wallet Available Balance [\d,.]+ [A-Z]{3}/);
  const m = t.match(/Wallet Available Balance ([\d,.]+) ([A-Z]{3})/);
  if (!m) throw new Error('the wallet page did not show "Wallet Available Balance"');
  return { amount: money(m[1]), text: `${m[1]} ${m[2]}` };
}

/** Admin has no My Bookings: its nearest equivalent is the Booking Report, whose rows carry the NDC
 * Reference and Invoice Number, never the order id — `newest` is therefore the latest reference on
 * the Portal's own id shape only; on Admin it is left null and callers use `c.lookup[orderId]` instead
 * (set by `readConfirmation`). */
async function readMyBookings(c) {
  if (c.app === 'Admin') { const r = await A.readBookingReport(c); return { ...r, newest: null }; }
  await go(c, '/myBooking', 500);
  const t = await textUntil(c, /Showing \d+ results of \d+ results/);
  const m = t.match(/Showing \d+ results of (\d+) results/);
  if (!m) throw new Error('My Bookings did not finish loading');
  return { total: Number(m[1]), newest: (t.match(/\b[A-Z]{3}\d{4}[A-Z0-9]+ORD\w+/) || [])[0] || null, text: t };
}

/** The row of one order: My Bookings on the Portal; on Admin, PNR Query by the booking's own NDC
 * Reference (`c.lookup[orderId].ref`, set by `readConfirmation`) stands in for "the row", since Admin
 * has no booking list to pull a <tr> out of. */
async function myBookingsRow(c, orderId) {
  if (c.app === 'Admin') {
    const ref = (c.lookup || {})[orderId];
    if (!ref) return null;
    const p = await A.pnrQuery(c, { ref: ref.ref || ref });
    return p.found ? { text: p.text, actions: [], className: '' } : null;
  }
  await readMyBookings(c);
  const row = c.page.locator('tr').filter({ hasText: orderId }).first();
  if (!(await row.count())) return null;
  return row.evaluate((tr) => {
    const tds = [...tr.querySelectorAll('td')];
    const last = tds[tds.length - 1];
    return {
      text: tr.innerText.replace(/\s+/g, ' ').trim(),
      actions: last ? [...last.querySelectorAll('button, a')].map((b) => (b.innerText || b.getAttribute('title') || '').trim()).filter(Boolean) : [],
      className: tr.className,
    };
  });
}

/** Booking confirmation or e-ticket page → its fare lines, status, ids. */
function parseFare(t) {
  const line = (re) => { const m = t.match(re); return m ? money(m[1]) : null; };
  return {
    base: line(/Base [Ff]are ([\d,.]+) ?[A-Z]{3}/),
    taxes: line(/Taxes \(\+\) ([\d,.]+)/),
    meal: line(/Meal \(\+\) ([\d,.]+)/),
    seat: line(/Seat \(\+\) ([\d,.]+)/),
    baggage: line(/Baggage \(\+\) ([\d,.]+)/),
    bundle: line(/Bundle \(\+\) ([\d,.]+)/),
    total: line(/Total(?: Amount)? ([\d,.]+) ?[A-Z]{3}/),
  };
}

/** "Booking Date … 19 Oct, 2026 12:52" on the confirmation page → "2026-10-19 12:52" (server local time). */
function bookedAtOf(t) {
  const m = t.match(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec), (\d{4}) (\d{2}):(\d{2})/);
  if (!m) return null;
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m[2]) + 1;
  return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')} ${m[4]}:${m[5]}`;
}

async function readConfirmation(c) {
  const t = await textUntil(c, /Booking Reference|Trip ID/);
  const fare = parseFare(t.slice(t.indexOf('Fare Details')));
  const orderId = (t.match(/\b[A-Z]{3}\d{4}[A-Z0-9]+ORD\w+/) || [])[0] || null;
  const ref = (t.match(/Booking Reference: (\S+)/) || [])[1] || null;
  // Admin has no My Bookings / booking-details: later readers (readCosting, readItinerary,
  // myBookingsRow) look the booking up on PNR Query by this ref instead of the order id.
  if (orderId && ref) { c.lookup = c.lookup || {}; c.lookup[orderId] = { ref }; }
  return {
    text: t,
    orderId,
    ref,
    pnr: (t.match(/Booking Date Status Note (\S+)/) || [])[1] || null,
    status: (t.match(/\d{2}:\d{2} (Confirmed|Failed|Pending|Cancelled|On Hold|Ticketed)/) || [])[1] || null,
    bookedAt: bookedAtOf(t),
    duplicate: /duplicate of an existing booking/i.test(t),
    airlineError: (t.match(/(SSR \([A-Z]+\)[^.]*\.|The requested [^.]*\.)/) || [])[1] || null,
    passengers: t.slice(t.indexOf('Passenger Details'), t.indexOf('Fare Details')),
    extraBaggage: (t.match(/Extra Baggage (.*?)(?= Bundle Details| Fare Details|$)/) || [])[1] || '',
    fare,
  };
}

async function readEticket(c, orderId) {
  await go(c, `/e-ticket/${orderId}`, 3000);
  const t = await textUntil(c, /Fare Details/);
  return {
    text: t,
    passengers: t.slice(t.indexOf('Passenger Details'), t.indexOf('Fare Details')),
    extraBaggage: (t.match(/Extra Baggage (.*?)(?= Bundle Details| Fare Details|$)/) || [])[1] || '',
    fare: parseFare(t.slice(t.indexOf('Fare Details'))),
  };
}

/** My Bookings → the order → "Costing" tab. On Admin, PNR Query's own totals stand in (no Costing
 * tab exists there): looked up by the ref `readConfirmation` recorded in `c.lookup[orderId]`. */
async function readCosting(c, orderId) {
  if (c.app === 'Admin') {
    const ref = ((c.lookup || {})[orderId] || {}).ref;
    const p = await A.pnrQuery(c, ref ? { ref } : { ref: orderId });
    const t = AP.totals(p);
    return { text: p.text, bookingAmount: t.total, salesAmount: t.sales, netAmount: t.net, ssrAmount: t.ssr };
  }
  await go(c, `/myBooking/booking-details/${orderId}`, 3000);
  const tab = c.page.getByRole('tab', { name: /Costing/ }).or(c.page.getByText('Costing', { exact: true })).first();
  if (await tab.count()) { await tab.click(); await c.ui.wait(c.page, 1500); }
  const t = await textUntil(c, /Total Booking Amount/);
  const line = (label) => { const m = t.match(new RegExp(`${label}:? ([\\d,.]+)`)); return m ? money(m[1]) : null; };
  return { text: t, bookingAmount: line('Total Booking Amount'), salesAmount: line('Total Sales Amount'), netAmount: line('Total Net Amount'), ssrAmount: line('Total SSR Amount') };
}

/**
 * My Bookings → the order → "Itinerary Details" tab (proven live 2026-10-19 on W9R33P and V9DR7C). Ancillaries are listed
 * once per JOURNEY, in a "Segment Ancillaries (Meals, Baggage, Seats)" section after that journey's last flight; inside it,
 * each traveller ("M Mohanad Dawood Adult … L Layla ExrTest Child No Ancillaries"), and for a connecting journey each leg
 * labelled by its route ("CAI RUH … Seat 2A …", "RUH DXB … Seat 4A …"). Then the passenger table ("View Passenger Details").
 * The side panel's "N Booked Seats" is the API's booked-PASSENGER count (a known bug) — never used as a seat count.
 */
async function readItinerary(c, orderId) {
  if (c.app === 'Admin') {
    const ref = ((c.lookup || {})[orderId] || {}).ref;
    const q = await A.pnrQuery(c, ref ? { ref } : { ref: orderId });
    return {
      text: q.text,
      journeys: (q.journeys || []).map((j) => ({ flights: j.flights, anc: j.anc })),
      passengers: (q.passengers || []).map((x) => x.name).join(', '),
      status: (q.booking || {}).status || null,
      pnr: (q.passengers || [])[0]?.pnr || null,
    };
  }
  const p = c.page;
  await p.goto(new URL(`/myBooking/booking-details/${orderId}`, c.baseUrl).href, { timeout: 60000, waitUntil: 'domcontentloaded' }).catch(() => {});
  await c.ui.wait(p, 4000);
  const tab = p.getByRole('tab', { name: 'Itinerary Details', exact: true }).first();
  if (await tab.count()) { await tab.click().catch(() => {}); await c.ui.wait(p, 1500); }
  const t = await textUntil(c, /Flight Detail/);
  const body = t.slice(t.indexOf('Booking Information'), t.indexOf('Booking Overview') > 0 ? t.indexOf('Booking Overview') : undefined);
  const pv = body.indexOf('View Passenger Details');
  const parts = (pv > 0 ? body.slice(0, pv) : body).split('Segment Ancillaries (Meals, Baggage, Seats)');
  const journeys = [];
  for (let i = 0; i + 1 < parts.length; i += 1) {
    const flights = [...parts[i].matchAll(/Flight Detail ([A-Z]{3}) - ([A-Z]{3}) ( ([A-Z0-9]{2}) - (d+) )/g)].map((m) => ({ from: m[1], to: m[2], flight: `${m[3]} ${m[4]}` }));
    journeys.push({ flights, anc: parts[i + 1].split(/ Journey d+ Sector | Flight Detail /)[0] });
  }
  return {
    text: body, journeys,
    passengers: pv > 0 ? body.slice(pv, pv + 1200) : '',
    status: (body.match(/Status (w+)/) || [])[1] || null,
    pnr: (body.match(/GDS PNR (w+)/) || [])[1] || null,
  };
}

/** The Itinerary text for one traveller on one flight (from–to): their part of that journey's section, cut to the leg. */
function itineraryFor(it, travellers, who, from, to) {
  const j = it.journeys.find((x) => x.flights.some((f) => f.from === from && f.to === to)) || (it.journeys.length === 1 ? it.journeys[0] : null);
  if (!j) return '';
  const idx = travellers.map((t) => ({ t, i: j.anc.indexOf(t.name) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  const k = idx.findIndex((x) => x.t === who);
  const mine = k < 0 ? '' : j.anc.slice(idx[k].i, k + 1 < idx.length ? idx[k + 1].i : undefined);
  if (j.flights.length < 2) return mine;
  const i = mine.indexOf(`${from} ${to} `);
  if (i < 0) return '';
  const rest = mine.slice(i + 8);
  const nxt = rest.search(/ [A-Z]{3} [A-Z]{3} (Meal|Extra|Seat)/);
  return mine.slice(i, i + 8 + (nxt < 0 ? rest.length : nxt));
}

async function setToday(c, fromId, toId) {
  const day = String(new Date().getDate());
  for (const id of [fromId, toId]) {
    await c.page.locator(`#${id}`).click();
    await c.ui.wait(c.page, 300);
    await c.page.locator('.p-datepicker:visible td:not(.p-datepicker-other-month) span:not(.p-disabled)').filter({ hasText: new RegExp(`^${day}$`) }).first().click();
    await c.ui.wait(c.page, 300);
  }
}

/** One report page searched for today. Returns the result text (between the Search button and the footer). */
/** Admin-only: Branch (+ Agency, or the report comes back empty) ahead of a report's own date/ref
 * fields. The Portal has no such selection step. */
async function pickAdminBranchAgency(c) {
  const admin = c.settings.admin;
  if (!admin || !admin.branch) throw new Error('settings.admin.branch is missing — see settings.example.json');
  const pick = async (n, label) => {
    const loc = c.page.locator('p-multiselect, p-dropdown').nth(n);
    if (!(await loc.count())) return;
    await loc.click();
    await c.ui.wait(c.page, 400);
    await c.page.locator('.p-multiselect-item, .p-dropdown-item').filter({ hasText: label }).first().click();
    await c.page.keyboard.press('Escape').catch(() => {});
    await c.ui.wait(c.page, 300);
  };
  await pick(0, admin.branch);
  if (admin.agency) await pick(1, admin.agency);
}

async function searchReportToday(c, path, { fromId = 'id-InvoiceFromDate', toId = 'id-InvoiceToDate', ref = null } = {}) {
  await go(c, path, 2500);
  if (c.app === 'Admin') await pickAdminBranchAgency(c);
  if (await c.page.locator(`#${fromId}`).count()) await setToday(c, fromId, toId);
  else { // the Booking report names its date fields differently: take the first two date inputs
    const ids = await c.page.locator('input[placeholder="DD/MM/YYYY"]').evaluateAll((els) => els.map((e) => e.id).filter(Boolean));
    if (ids.length >= 2) await setToday(c, ids[0], ids[1]);
  }
  if (ref) {
    const box = c.page.getByPlaceholder(/Booking Reference/i).first();
    if (await box.count()) await box.fill(ref);
  }
  await c.page.keyboard.press('Escape').catch(() => {});
  await c.page.getByRole('button', { name: 'Search', exact: true }).click();
  await c.ui.wait(c.page, 4000);
  // Reports show 10 rows a page ("Showing 10 results of 11") — a booking can be on page 2 (proven live
  // 2026-10-19: a held booking was the 11th row). Read every page, never just the first.
  const slice = async () => { const t = await c.ui.text(c.page); return t.slice(t.lastIndexOf('Search'), t.indexOf('About Us') > 0 ? t.indexOf('About Us') : undefined); };
  let all = await slice();
  const total = Number((all.match(/Showing \d+ results of (\d+) results/) || [])[1] || 0);
  for (let pg = 2; pg <= Math.min(Math.ceil(total / 10), 8); pg += 1) {
    const link = c.page.getByText(String(pg), { exact: true }).last();
    if (!(await link.count().catch(() => 0))) break;
    await link.click().catch(() => {});
    await c.ui.wait(c.page, 2500);
    all += ` ${await slice()}`;
  }
  return all;
}

module.exports = { money, near, go, textUntil, readWallet, readMyBookings, myBookingsRow, parseFare, readConfirmation, readEticket, readCosting, readItinerary, itineraryFor, searchReportToday };
