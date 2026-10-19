'use strict';
// Ancillaries — Admin knowledge for the Supplier Feature Runner: the pages Portal has no equivalent
// of. The Admin app (Booking-Mid Office) has no My Bookings and no booking-details page — a booking's
// full detail instead lives on PNR Query, looked up by PNR, Ticket No. or Booking Ref (the NDC
// Reference, never the order id — the order id does not appear on PNR Query at all). Read-only:
// nothing here books, holds, pays or saves. Captured live, 2026-10-19, from one OmanAir booking made
// by the human (see admin_parse.js and its tests for the exact page text this was built from).

const AP = require('./admin_parse');

const wait = (page, ms) => page.waitForTimeout(ms);
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const text = async (page) => norm(await page.locator('body').first().innerText());

/**
 * Branch → Agency → Agent, in that order — each later dropdown only offers options once the one
 * before it is picked. Used both to enter the flight-search form (as `portal.js`'s `s.entryHook`,
 * wired up by `admin.js`) and as the first step of every report.
 */
async function selectEntry(page, admin) {
  if (!admin || !admin.branch || !admin.agency || !admin.agent) {
    throw new Error('settings.admin { branch, agency, agent } is missing — see settings.example.json');
  }
  const dd = page.locator('p-dropdown');
  const pick = async (n, label) => {
    await dd.nth(n).click();
    await wait(page, 400);
    await page.locator('.p-dropdown-item').filter({ hasText: label }).first().click();
    await wait(page, 500);
  };
  await pick(0, admin.branch);
  await pick(1, admin.agency);
  await pick(2, admin.agent);
}

/**
 * PNR Query (`/pnr-query`): the Admin's only page for a booking's full detail. Defaults to the PNR
 * radio (the form's own default); pass `ref` (the NDC Reference) or `ticket` to search by those
 * instead — the Booking Ref radio's id is `id-GetItineraryDetailsBy-BookingRef.` (proven live).
 */
async function pnrQuery(c, { pnr, ref, ticket } = {}) {
  const p = c.page;
  const value = ref || ticket || pnr;
  if (!value) throw new Error('pnrQuery needs one of { pnr, ref, ticket }');
  await p.goto(new URL('/pnr-query', c.baseUrl).href, { timeout: 30000 });
  await wait(p, 1200);
  if (ref) await p.locator('#id-GetItineraryDetailsBy-BookingRef\\.').check();
  else if (ticket) await p.getByRole('radio', { name: /^Ticket No/ }).check();
  await p.getByPlaceholder(/PNR Code, Ticket No\.?, or Booki/).fill(String(value));
  await p.getByRole('button', { name: 'Search', exact: true }).click();
  let t = '';
  for (let i = 0; i < 20; i += 1) {
    t = await text(p);
    if (/Flight Info|No data has been found|No booking details found/.test(t)) break;
    await wait(p, 500);
  }
  return { text: t, ...AP.parsePnrQuery(t) };
}

/**
 * Any Admin report under `/reports/...`: Branch (+ Agency — without it the report comes back empty
 * even with a Branch picked) then a date range. Branch is a `p-multiselect`, Agency a `p-dropdown` or
 * `p-multiselect` depending on the report; both use `.p-multiselect-item`/`.p-dropdown-item` options,
 * not `role=option`. Paginates every page like the Portal's `searchReportToday` — never page 1 only.
 */
async function adminReport(c, path, { from = 'today', ref = null } = {}) {
  const admin = c.settings.admin;
  if (!admin || !admin.branch) throw new Error('settings.admin.branch is missing — see settings.example.json');
  const p = c.page;
  await p.goto(new URL(path, c.baseUrl).href, { timeout: 30000 });
  await wait(p, 1500);
  const pickFrom = async (loc, label) => {
    if (!(await loc.count())) return;
    await loc.first().click();
    await wait(p, 400);
    await p.locator('.p-multiselect-item, .p-dropdown-item').filter({ hasText: label }).first().click();
    await p.keyboard.press('Escape').catch(() => {});
    await wait(p, 300);
  };
  await pickFrom(p.locator('p-multiselect, p-dropdown').nth(0), admin.branch);
  if (admin.agency) await pickFrom(p.locator('p-multiselect, p-dropdown').nth(1), admin.agency);
  const dates = p.locator('input[placeholder="DD/MM/YYYY"]');
  if (await dates.count()) {
    const today = new Date();
    const fromDate = from === 'month' ? new Date(today.getFullYear(), today.getMonth(), 1) : today;
    const pick = async (box, d) => {
      await box.click();
      await wait(p, 300);
      await p.locator('.p-datepicker:visible td:not(.p-datepicker-other-month) span:not(.p-disabled)')
        .filter({ hasText: new RegExp(`^${d.getDate()}$`) }).first().click();
      await wait(p, 300);
    };
    await pick(dates.nth(0), fromDate);
    await pick(dates.nth(1), today);
  }
  if (ref) {
    const box = p.getByPlaceholder(/Booking Ref|PNR|Invoice/i).first();
    if (await box.count()) await box.fill(ref);
  }
  await p.keyboard.press('Escape').catch(() => {});
  await p.getByRole('button', { name: 'Search', exact: true }).click();
  await wait(p, 3000);
  const slice = async () => { const t = await text(p); const i = t.search(/Showing \d+ results|No .*found|No records/i); return i >= 0 ? t.slice(i) : t; };
  let all = await slice();
  const total = Number((all.match(/Showing \d+ results of (\d+) results/) || [])[1] || 0);
  for (let pg = 2; pg <= Math.min(Math.ceil(total / 10), 8); pg += 1) {
    const link = p.getByText(String(pg), { exact: true }).last();
    if (!(await link.count().catch(() => 0))) break;
    await link.click().catch(() => {});
    await wait(p, 2500);
    all += ` ${await slice()}`;
  }
  return all;
}

/** Wallet History (Admin-only report): the closing "End Balance" after every transaction, widened to
 * the whole month so a booking made minutes ago is already covered (the Portal wallet, by contrast,
 * is reached through the Dashboard and is live). */
async function readWallet(c) {
  const t = await adminReport(c, '/reports/wallet-history', { from: 'month' });
  const amount = AP.parseWalletHistory(t);
  if (amount == null) throw new Error('Wallet History showed no "End Balance" row — check settings.admin.branch/agency');
  return { amount, text: `${amount}` };
}

/** Booking Report, for the one count-and-newest-row summary `readMyBookings` reports on the Portal.
 * Admin rows carry the NDC Reference and the Invoice Number, never the order id (confirmed live). */
async function readBookingReport(c) {
  const t = await adminReport(c, '/reports/booking', { from: 'month' });
  const m = t.match(/Showing \d+ results of (\d+) results/);
  if (!m) throw new Error('Booking Report did not finish loading');
  return { total: Number(m[1]), text: t };
}

module.exports = { selectEntry, pnrQuery, adminReport, readWallet, readBookingReport };
