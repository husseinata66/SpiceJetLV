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
 * An option whose whole text is `label` — optionally followed by a bracketed code, "Test (BRN123)" —
 * wins; otherwise the first option containing it (so "Test" never lands on "Automation Test").
 */
async function optionFor(page, selector, label) {
  if (label === '*') return page.locator(selector).first(); // "any" — the first option offered
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = page.locator(selector).filter({ hasText: new RegExp(`^\\s*${escaped}\\s*(\\([^)]*\\))?\\s*$`) });
  return (await exact.count()) ? exact.first() : page.locator(selector).filter({ hasText: label }).first();
}

/**
 * Opens a dropdown and clicks the option `label`, retrying: a later dropdown (Agency after Branch) fills its list
 * a little after the earlier pick, and a single 400 ms wait missed it (192.168.1.90, 2026-10-29). Up to 3 tries,
 * each waiting up to 6 s for the option, closing and reopening the list in between.
 */
async function pickOption(page, opener, selector, label, { escape = false } = {}) {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await opener.click({ timeout: 8000 });
      await wait(page, 400 * attempt);
      const opt = await optionFor(page, selector, label);
      await opt.waitFor({ state: 'visible', timeout: 6000 });
      await opt.click({ timeout: 5000 });
      if (escape) await page.keyboard.press('Escape').catch(() => {});
      return;
    } catch (e) {
      last = e;
      await page.keyboard.press('Escape').catch(() => {});
      await wait(page, 1500);
    }
  }
  throw new Error(`could not pick "${label}" after 3 tries: ${last && last.message.split('\n')[0]}`);
}

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
    await pickOption(page, dd.nth(n), '.p-dropdown-item', label);
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
// PNR Query belongs to a DIFFERENT Admin user on some environments (192.168.1.90, Hussein 2026-10-29: the
// booking user's /pnr-query redirects to the Dashboard). So it gets its own browser context and its own saved
// session, outside the repository: the first time, the Admin login page opens and the HUMAN logs in as the
// PNR Query user (the runner never types a credential). The page is only searched and read.
const fs = require('fs');
const os = require('os');
const path = require('path');
const PNR_SESSION = (baseUrl) => path.join(os.homedir(), '.agentic-qa', 'sessions', `ancillaries__${new URL(baseUrl).host.replace(/[^\w.-]/g, '_')}__pnr-query.json`);
const onPnrQuery = async (p) => /\/pnr-query/.test(p.url()) && (await p.getByPlaceholder(/PNR Code, Ticket No\.?, or Booki/).count().catch(() => 0)) > 0;

async function pnrPage(c) {
  if (c.state.pnrPage && !c.state.pnrPage.isClosed()) return c.state.pnrPage;
  const file = PNR_SESSION(c.baseUrl);
  const ctx = await c.context.browser().newContext({ viewport: null, storageState: fs.existsSync(file) ? file : undefined });
  const p = await ctx.newPage();
  const target = new URL('/pnr-query', c.baseUrl).href;
  await p.goto(target, { timeout: 30000 });
  await wait(p, 2000);
  if (!(await onPnrQuery(p))) {
    if (!c.headed) throw new Error('PNR Query needs the PNR Query Admin user to log in — run this group --headed once');
    // Not logged in as the PNR Query user (login page, or the Dashboard of another user): start from the login page.
    await ctx.clearCookies();
    await p.goto(new URL('/auth/login', c.baseUrl).href, { timeout: 30000 });
    c.log('PNR Query: log in AS THE PNR QUERY ADMIN USER in the new browser window. Waiting up to 300 s…');
    const deadline = Date.now() + 300000;
    let ok = false;
    while (Date.now() < deadline) {
      await wait(p, 2000);
      if (!/\/auth\/login/.test(p.url())) {
        await p.goto(target, { timeout: 30000 }).catch(() => {});
        await wait(p, 2000);
        if (await onPnrQuery(p)) { ok = true; break; }
        // Logged in, but not as a user who can open PNR Query: back to the login page for another try.
        c.log('PNR Query: this user cannot open PNR Query — log out and log in as the PNR Query user.');
        await ctx.clearCookies();
        await p.goto(new URL('/auth/login', c.baseUrl).href, { timeout: 30000 }).catch(() => {});
      }
    }
    if (!ok) throw new Error('PNR Query: the PNR Query Admin user did not log in within 300 s');
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await ctx.storageState({ path: file }).catch(() => {});
  c.state.pnrPage = p;
  return p;
}

async function pnrQuery(c, { pnr, ref, ticket } = {}) {
  const p = await pnrPage(c);
  const value = ref || ticket || pnr;
  if (!value) throw new Error('pnrQuery needs one of { pnr, ref, ticket }');
  await p.goto(new URL('/pnr-query', c.baseUrl).href, { timeout: 30000 });
  await wait(p, 1200);
  if (ref) {
    // The radio's id differs between environments (missing on 192.168.1.90, 2026-10-29): try the proven id first,
    // then the radio by its label, then a click on the visible "Booking Ref…" label.
    const tries = [
      () => p.locator('#id-GetItineraryDetailsBy-BookingRef\\.').check({ timeout: 3000 }),
      () => p.getByRole('radio', { name: /Booking\s*Ref/i }).first().check({ timeout: 3000 }),
      () => p.locator('label').filter({ hasText: /Booking\s*Ref/i }).first().click({ timeout: 3000 }),
      () => p.getByText(/^\s*Booking\s*Ref(erence)?\.?\s*$/i).first().click({ timeout: 3000 }),
    ];
    let ok = false;
    for (const t of tries) { try { await t(); ok = true; break; } catch { /* next */ } }
    if (!ok) throw new Error('PNR Query: no "Booking Ref" option found (id, radio label and visible text all tried)');
  }
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
async function adminReport(c, path, { from = 'today', ref = null, whole = false } = {}) {
  const admin = c.settings.admin;
  if (!admin || !admin.branch) throw new Error('settings.admin.branch is missing — see settings.example.json');
  const p = c.page;
  await p.goto(new URL(path, c.baseUrl).href, { timeout: 30000 });
  await wait(p, 1500);
  const pickFrom = async (loc, label) => {
    if (!(await loc.count())) return;
    await pickOption(p, loc.first(), '.p-multiselect-item, .p-dropdown-item', label, { escape: true });
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
  // A slow report (Wallet History, 192.168.1.90, 2026-10-28) was still spinning after 3 s: wait for a result
  // or an explicit empty state, up to 30 s more, before reading.
  for (let i = 0; i < 30; i += 1) {
    const all = norm((await p.locator('body').allInnerTexts().catch(() => [''])).join(' '));
    if (/Showing \d+ results|No .*found|No records|End Balance/i.test(all)) break;
    await wait(p, 1000);
  }
  const slice = async () => { const t = await text(p); if (whole) return norm((await p.locator('body').allInnerTexts()).join(' ')); /* this page's table is in a nested body (shadow DOM) that the first body's text leaves out */ const i = t.search(/Showing \d+ results|No .*found|No records/i); return i >= 0 ? t.slice(i) : t; };
  let all = await slice();
  const total = Number((all.match(/Showing \d+ results of (\d+) results/) || [])[1] || 0);
  // Page 3+ often has no number to click ("‹ First 1 2 ….. 29 Last ›"): step with › instead (see postbook.searchReportToday).
  const next = p.locator('xpath=//*[normalize-space()="Last"]/following-sibling::*[1]').last();
  for (let pg = 2; pg <= Math.min(Math.ceil(total / 10), 40); pg += 1) {
    const link = p.getByText(String(pg), { exact: true }).last();
    if (await link.count().catch(() => 0)) await link.click().catch(() => {});
    else if (await next.count().catch(() => 0)) await next.click().catch(() => {});
    else break;
    await wait(p, 2500);
    all += ` ${await slice()}`;
  }
  return all;
}

/** Wallet History (Admin-only report): the closing "End Balance" after every transaction, widened to
 * the whole month so a booking made minutes ago is already covered (the Portal wallet, by contrast,
 * is reached through the Dashboard and is live). */
async function readWallet(c) {
  let t = await adminReport(c, '/reports/wallet-history', { from: 'month', whole: true });
  let amount = AP.parseWalletHistory(t);
  // The form sometimes loads too slowly for the Branch / date picks to take and is searched empty ("Required" on
  // every field, 192.168.1.90, 2026-10-29): reload once, after a pause, before calling it a failure.
  if (amount == null) {
    await wait(c.page, 3000);
    t = await adminReport(c, '/reports/wallet-history', { from: 'month', whole: true });
    amount = AP.parseWalletHistory(t);
  }
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

module.exports = { optionFor, pickOption, selectEntry, pnrQuery, adminReport, readWallet, readBookingReport };
