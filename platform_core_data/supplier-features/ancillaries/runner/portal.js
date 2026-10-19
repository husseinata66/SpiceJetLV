'use strict';
// Ancillaries — Portal knowledge for the Supplier Feature Runner: where things are and how the
// booking flow moves. Proven live on OmanAir (2026-10-17) and Flynas NDC
// (2026-10-18). It never presses Book, Hold, Pay or Save Quote — and the runner's click guard refuses
// them anyway. Speed rules: ExecutionFlow_HappyPath.md §15.5 and §16.

const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const num = (s) => Number(String(s).replace(/[^\d.]/g, '')) || 0;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wait = (page, ms) => page.waitForTimeout(ms);
// .first(): the Dashboard renders a second <body> inside its own component (strict-mode error otherwise).
const text = async (page) => norm(await page.locator('body').first().innerText());

// The button that opens the seat map changes its words with the seats already chosen.
const OPENER = /^(Select Seat|Change Seats|Seat \d+ more)/;
const PAX_TYPES = [['adults', 'Adult'], ['children', 'Child'], ['infants', 'Infant']];

// ---------------------------------------------------------------- search and results

/**
 * Which calendar cell to click for `daysFromToday`: how many times to press "next month", and the
 * day-of-month to click once there. The Portal snaps to its own nearest available date regardless
 * (seen on both OmanAir and Flynas), so this only has to land the search in the right neighbourhood.
 */
function targetDate(daysFromToday, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Number(daysFromToday));
  const monthsForward = (t.getFullYear() - today.getFullYear()) * 12 + (t.getMonth() - today.getMonth());
  return { day: t.getDate(), monthsForward, date: t };
}

/** Search from the Flight Search page. Airport lists are slow and uneven: retype every 3 s (§15.5 rule 1). */
async function search(page, portal, s, pax, cabin = 'Economy') {
  const statuses = [];
  const onResponse = (r) => {
    if (/search|availab/i.test(r.url()) && r.request().method() !== 'OPTIONS') statuses.push(r.status());
  };
  await page.goto(new URL('/booking/flight-search', portal).href, { timeout: 45000 });
  const pickAirport = async (labelRe, code, option) => {
    await page.locator('div').filter({ hasText: labelRe }).first().click();
    const box = page.getByRole('textbox').nth(1);
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      await box.fill('');
      await box.fill(code);
      try { await option.first().waitFor({ state: 'visible', timeout: 3000 }); await option.first().click(); return; } catch (_) { /* retype */ }
    }
    throw new Error(`airport ${code} never appeared in the list`);
  };
  await pickAirport(/^From \*$/, s.from, page.getByRole('listitem', { name: s.from }));
  await pickAirport(/^To \*$/, s.to, page.getByRole('option', { name: s.to }));
  // Dates are committed through the calendar only; a typed value resets (§15.5 rule 2).
  const { day, monthsForward } = targetDate(s.daysFromToday);
  await page.getByRole('textbox', { name: 'DD/MM/YYYY *' }).click();
  for (let i = 0; i < monthsForward; i += 1) await page.locator('.p-ripple.p-element.p-datepicker-next').click();
  await page.getByRole('cell', { name: String(day), exact: true }).first().click();
  // Cabin before opening the passenger panel: picking it closes any open panel (click-outside),
  // which left the child/infant "+" clicks hitting a hidden panel when this ran after (proven live).
  if (cabin !== 'Economy') {
    await page.locator('div').filter({ hasText: /^Economy$/ }).first().click();
    await wait(page, 300);
    await page.getByRole('option', { name: cabin, exact: true }).filter({ visible: true }).first().click();
    await wait(page, 300);
  }
  await page.getByRole('button', { name: /^1/ }).first().click();
  const plus = page.locator('p-button:nth-child(3) > .p-ripple');
  for (let i = 1; i < pax.adults; i += 1) await plus.nth(0).click();
  for (let i = 0; i < pax.children; i += 1) await plus.nth(1).click();
  for (let i = 0; i < pax.infants; i += 1) await plus.nth(2).click();
  await page.getByRole('heading', { name: 'Flight Search' }).click();
  page.on('response', onResponse);
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Search' }).click();
  return { statuses, t0, stop: () => page.off('response', onResponse) };
}

/**
 * Round-trip search. Proven live, 2026-10-19: the one-way form's indexed-textbox trick
 * (`getByRole('textbox').nth(1)`) does not hold here — the extra date field shifts every index, and
 * one attempt typed the airport code into a date box instead. Clicking the field then typing directly
 * (whatever has focus receives it) is robust regardless of index. Picking the outbound "To" airport
 * auto-fills the return leg reversed (JED→CAI for a CAI→JED outbound) — it is not set separately.
 * `returnDaysFromToday` must land after the outbound date; the Portal still snaps to its own nearest
 * actual availability for each leg independently.
 */
async function searchRoundTrip(page, portal, s, pax, returnDaysFromToday, cabin = 'Economy') {
  const statuses = [];
  const onResponse = (r) => { if (/search|availab/i.test(r.url()) && r.request().method() !== 'OPTIONS') statuses.push(r.status()); };
  await page.goto(new URL('/booking/flight-search', portal).href, { timeout: 45000 });
  await wait(page, 800);
  await page.getByText('Round-trip', { exact: true }).click();
  await wait(page, 400);
  if (cabin !== 'Economy') {
    await page.locator('div').filter({ hasText: /^Economy$/ }).first().click();
    await wait(page, 300);
    await page.getByRole('option', { name: cabin, exact: true }).filter({ visible: true }).first().click();
    await wait(page, 300);
  }
  const typeIntoField = async (labelRe, code, optionLoc) => {
    await page.locator('div').filter({ hasText: labelRe }).first().click();
    await wait(page, 300);
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      await page.keyboard.type(code);
      try { await optionLoc.first().waitFor({ state: 'visible', timeout: 3000 }); await optionLoc.first().click(); return; } catch (_) { await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); }
    }
    throw new Error(`airport ${code} never appeared in the list`);
  };
  await typeIntoField(/^From \*$/, s.from, page.getByRole('listitem', { name: s.from }));
  await typeIntoField(/^To \*$/, s.to, page.getByRole('option', { name: s.to })); // return leg auto-fills reversed
  const out = targetDate(s.daysFromToday);
  const ret = targetDate(returnDaysFromToday);
  await page.getByRole('textbox', { name: 'DD/MM/YYYY *' }).first().click();
  for (let i = 0; i < out.monthsForward; i += 1) await page.locator('.p-ripple.p-element.p-datepicker-next').click();
  await page.getByRole('cell', { name: String(out.day), exact: true }).first().click();
  await page.getByRole('textbox', { name: 'DD/MM/YYYY *' }).nth(1).click();
  for (let i = 0; i < ret.monthsForward; i += 1) await page.locator('.p-ripple.p-element.p-datepicker-next').click();
  await page.getByRole('cell', { name: String(ret.day), exact: true }).first().click();
  await page.getByRole('button', { name: /^1/ }).first().click();
  const plus = page.locator('p-button:nth-child(3) > .p-ripple');
  for (let i = 1; i < pax.adults; i += 1) await plus.nth(0).click();
  for (let i = 0; i < pax.children; i += 1) await plus.nth(1).click();
  for (let i = 0; i < pax.infants; i += 1) await plus.nth(2).click();
  await page.getByRole('heading', { name: 'Flight Search' }).click();
  page.on('response', onResponse);
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  return { statuses, t0, stop: () => page.off('response', onResponse) };
}

/**
 * Multi-city search (proven live 2026-10-19). `legs` is [{ from, to, daysFromToday }, …] — each leg
 * after the first starts where the previous one ended (the form pre-fills it), so only its "To" is
 * typed. The airport inputs are zero-size and read-only: click the visible "From * / To *" wrapper
 * and type the code, retyping every 3 s like the other forms. Dates stay close to today.
 */
async function searchMultiCity(page, portal, s, pax, legs) {
  const statuses = [];
  const onResponse = (r) => { if (/search|availab/i.test(r.url()) && r.request().method() !== 'OPTIONS') statuses.push(r.status()); };
  for (let i = 1; i < legs.length; i += 1) {
    if (legs[i].from !== legs[i - 1].to) throw new Error(`multiCity leg ${i + 1} must start at leg ${i}'s destination (${legs[i - 1].to}), not ${legs[i].from}`);
  }
  await page.goto(new URL('/booking/flight-search', portal).href, { timeout: 45000 });
  await wait(page, 1500);
  await page.getByText('Multi-city', { exact: true }).click();
  await wait(page, 800);
  const typeInto = async (label, code, optionLoc) => {
    await page.locator('div').filter({ hasText: new RegExp(`^${label} \\*$`) }).nth(0).click();
    await wait(page, 300);
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      await page.keyboard.type(code);
      try { await optionLoc.first().waitFor({ state: 'visible', timeout: 3000 }); await optionLoc.first().click(); await wait(page, 300); return; } catch (_) { await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); }
    }
    throw new Error(`airport ${code} never appeared in the list`);
  };
  const opt = (code) => page.getByRole('listitem', { name: code }).or(page.getByRole('option', { name: code })).filter({ visible: true });
  await typeInto('From', legs[0].from, opt(legs[0].from));
  await typeInto('To', legs[0].to, opt(legs[0].to));
  for (let i = 1; i < legs.length; i += 1) {
    if (i >= 2) { await page.getByRole('button', { name: 'Add flight' }).click(); await wait(page, 500); }
    await typeInto('To', legs[i].to, opt(legs[i].to)); // the leg's "From" is already filled
  }
  const dates = page.getByRole('textbox', { name: 'DD/MM/YYYY *' });
  for (let i = 0; i < legs.length; i += 1) {
    const d = targetDate(legs[i].daysFromToday);
    await dates.nth(i).click();
    await wait(page, 300);
    for (let k = 0; k < d.monthsForward; k += 1) await page.locator('.p-ripple.p-element.p-datepicker-next').click();
    await page.getByRole('cell', { name: String(d.day), exact: true }).first().click();
    await wait(page, 300);
  }
  await page.getByRole('button', { name: /^1/ }).first().click();
  const plus = page.locator('p-button:nth-child(3) > .p-ripple');
  for (let i = 1; i < pax.adults; i += 1) await plus.nth(0).click();
  for (let i = 0; i < pax.children; i += 1) await plus.nth(1).click();
  for (let i = 0; i < pax.infants; i += 1) await plus.nth(2).click();
  await page.getByRole('heading', { name: 'Flight Search' }).click();
  page.on('response', onResponse);
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  return { statuses, t0, stop: () => page.off('response', onResponse) };
}

/**
 * Each journey's own "Select Bundle" sits under its own route header, which can be a collapsed
 * accordion (proven live, 2026-10-19 — the first journey happened to be open, the second was not).
 * Picks the first still-unanswered one each call, so a plain loop handles any number of journeys
 * without naming them.
 */
async function expandJourneys(page) {
  const heads = page.locator('div.custom-accordion-header');
  for (let i = 0; i < await heads.count(); i += 1) {
    const h = heads.nth(i);
    const exp = await h.evaluate((el) => {
      for (let x = el; x; x = x.parentElement) if (x.hasAttribute && x.hasAttribute('aria-expanded')) return x.getAttribute('aria-expanded');
      return null;
    }).catch(() => null);
    if (exp === 'false') { await h.click(); await wait(page, 300); } // clicking an open one would close it
  }
}

async function chooseBundleForNextLeg(page, name) {
  await expandJourneys(page);
  const dd = page.locator('p-dropdown').filter({ hasText: /^Choose a bundle/ }).first();
  await dd.click();
  await wait(page, 300);
  const names = (await page.getByRole('option').filter({ visible: true }).allInnerTexts()).map(norm);
  const pick = name || names[0];
  await page.getByRole('option', { name: pick, exact: true }).filter({ visible: true }).first().click();
  await wait(page, 600);
  return { names, chosen: pick };
}

/** How many journeys remain with no fare package chosen yet. */
const bundlesRemaining = (page) => page.locator('p-dropdown').filter({ hasText: /^Choose a bundle/ }).count();

/** Every result card: its text, its own cabin-class label, and the index of the first one from the
 * run's connection (optionally narrowed to a specific cabin — not every departure sells every cabin,
 * even when the search itself was for that cabin; proven live, 2026-10-18). */
async function readCards(page, credentialName, cabin) {
  return page.getByRole('button', { name: /^Book Flight/ }).evaluateAll((btns) => {
    const cardOf = (b) => {
      let card = b;
      for (let el = b.parentElement; el; el = el.parentElement) {
        const n = [...el.querySelectorAll('button')].filter((x) => /^\s*Book Flight/.test(x.innerText)).length;
        if (n > 1) break; // left the card
        card = el;
      }
      return card;
    };
    const cards = btns.map((b) => {
      const card = cardOf(b);
      const cabinEl = card.querySelector('.cabin-class');
      return { text: card.innerText.replace(/\s+/g, ' ').trim(), cabin: cabinEl ? cabinEl.innerText.trim() : null };
    });
    return { count: cards.length, cards };
  }).then((r) => ({
    ...r,
    index: r.cards.findIndex((c) => c.text.includes(credentialName) && (!cabin || c.cabin === cabin)),
    cards: r.cards.map((c) => c.text),
  }));
}

/** Polls until a card from the run's connection (and cabin, if given) is listed. Never falls back to
 * another connection. */
async function waitForCard(page, credentialName, timeoutMs, cabin) {
  const deadline = Date.now() + timeoutMs;
  let last = { count: 0, index: -1, cards: [] };
  while (Date.now() < deadline) {
    last = await readCards(page, credentialName, cabin).catch(() => last);
    if (last.index >= 0) return last;
    await wait(page, 2000);
  }
  return last;
}

async function clickCard(page, index) {
  await page.getByRole('button', { name: /^Book Flight/ }).nth(index).click();
}

/** After Book Flight: Flynas may show a Price Update pop-up first; others go straight to passengers. */
async function priceUpdateOrPassengers(page, timeoutMs = 45000) {
  const pax = page.getByRole('region', { name: ' 1- Adult' });
  const dlg = priceDialog(page);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await pax.isVisible().catch(() => false)) return 'passengers';
    if (await dlg.isVisible().catch(() => false)) return 'priceUpdate';
    await wait(page, 500);
  }
  throw new Error('neither the Price Update pop-up nor Passenger Details appeared');
}

const priceDialog = (page) => page.getByRole('dialog').filter({ hasText: 'Price Update' }).first();

async function readPriceUpdate(page) {
  const t = norm(await priceDialog(page).innerText());
  const m = t.match(/Previous[^\d]*([\d,.]+)[\s\S]*?New[^\d]*([\d,.]+)/);
  return {
    text: t,
    previous: m ? m[1] : null,
    next: m ? m[2] : null,
    buttons: (await priceDialog(page).getByRole('button').allInnerTexts()).map(norm).filter(Boolean),
  };
}

// ---------------------------------------------------------------- step 1: passengers

const region = (page, sec) => page.getByRole('region', { name: ` ${sec}` });

function sections(pax) {
  const out = [];
  for (const [key, type] of PAX_TYPES) for (let i = 1; i <= (pax[key] || 0); i += 1) out.push({ sec: `${i}- ${type}`, type, key, i });
  return out;
}

async function openSection(page, sec) {
  const tab = page.getByRole('tab', { name: new RegExp(esc(sec)) });
  if ((await tab.getAttribute('aria-expanded')) !== 'true') await tab.click(); // never "Expand All": it toggles
}

const ageYears = (dmy, ref) => {
  const [d, m, y] = String(dmy).split('/').map(Number);
  const b = new Date(y, m - 1, d);
  let a = ref.getFullYear() - b.getFullYear();
  if (ref < new Date(ref.getFullYear(), b.getMonth(), b.getDate())) a -= 1;
  return a;
};
// Portal and Admin: Adult >= 12; Child >= 2 and < 12; Infant >= 1 day and < 2 years (keep a margin).
const AGE_OK = { Adult: (a) => a >= 12, Child: (a) => a >= 3 && a <= 11, Infant: (a) => a <= 1 };

/**
 * Finds a saved profile matching `want` (optional `gender`; age is always checked against the
 * passenger type) inside an already-searched "Select passenger" dialog, paging through the results
 * — the dialog only shows 10 rows per page (proven live, 2026-10-18: 14 saved adults needed 2 pages,
 * and none of this run's regular child/infant profiles appeared at all when searched from the Adult
 * slot — each slot's dialog only offers profiles already of that passenger type). Never the same name
 * twice in one booking. Names are not hardcoded anywhere: this is what "the name can't be static"
 * means in practice (human decision, 2026-10-18).
 */
async function resolveProfileName(dlg, type, want, usedNames) {
  const rows = [];
  const readPage = async () => {
    for (const t of await dlg.locator('tbody tr').allInnerTexts()) {
      const parts = t.split('\t').map(norm);
      if (parts.length < 5) continue;
      rows.push({ name: parts[0], gender: parts[2], age: Number(parts[4]) });
    }
  };
  const match = () => rows.find((r) => !usedNames.has(r.name) && AGE_OK[type](r.age) && (!want.gender || r.gender === want.gender));
  await readPage();
  let pick = match();
  // Paginate only when the first page didn't already satisfy this slot — the common case needs no
  // click here at all, so a pagination hiccup never blocks a request page 1 could already answer.
  for (let pageNum = 2; !pick && pageNum <= 8; pageNum += 1) {
    const link = dlg.getByText(String(pageNum), { exact: true }).last();
    if (!(await link.count().catch(() => 0))) break;
    await link.click().catch(() => {});
    await wait(dlg.page(), 400);
    await readPage();
    pick = match();
  }
  if (!pick) throw new Error(`no saved ${type} profile matches ${JSON.stringify(want)} among ${rows.length} candidate(s) read`);
  return pick.name;
}

/**
 * Opens the infant's "Assigned to" dropdown and picks `assignTo` (an adult's first name or full name,
 * case-insensitive substring) if given, otherwise the first option — used both for the initial link
 * and to re-link an infant to a different adult later (e.g. TC-SM-EXR-005). Returns the full list of
 * options, as shown (adults only).
 */
async function setAssignedTo(page, infantSec, assignTo) {
  await openSection(page, infantSec); // a no-op when already open (e.g. right after filling it)
  // Anchored on the hidden input's id prefix, not the placeholder text — once assigned, the dropdown
  // shows the adult's name instead of "Assigned to", and a plain "last `.p-dropdown`" match picks the
  // unrelated Frequent Flyer field instead (both class names are the same; proven live, 2026-10-18).
  const r = region(page, infantSec);
  await r.locator('div.p-dropdown').filter({ has: page.locator('input[id^="assigned-to"]') }).click();
  await wait(page, 200);
  const options = page.getByRole('option').filter({ visible: true });
  const texts = (await options.allInnerTexts()).map(norm);
  const idx = assignTo ? texts.findIndex((t) => t.toLowerCase().includes(String(assignTo).toLowerCase())) : 0;
  if (idx === -1) throw new Error(`setAssignedTo: "${assignTo}" matches none of ${JSON.stringify(texts)}`);
  await options.nth(Math.max(idx, 0)).click();
  return texts;
}

/**
 * Every passenger: Pick → Confirm passenger → a fresh Document Number (§15.5 rule 4; the add-pax 409
 * guard). Each slot is either a fixed name (`s.profiles.<key>[i]`, as Group 01 uses) or resolved live
 * by criteria (`s.criteria.<key>[i]`, e.g. `{ gender: 'Female' }` — preferred: never hardcode a name
 * that depends on one environment's saved data). Infants are assigned to the first adult. Checks the
 * ages BEFORE Next — an out-of-range age makes add-pax return 400 and Next does nothing visible.
 */
async function fillPassengers(page, s, pax, docs) {
  const travellers = [];
  const usedNames = new Set();
  for (const { sec, type, key, i } of sections(pax)) {
    const fixedName = ((s.profiles || {})[key] || [])[i - 1];
    const want = ((s.criteria || {})[key] || [])[i - 1];
    if (!fixedName && !want) throw new Error(`settings.profiles.${key}[${i - 1}] or settings.criteria.${key}[${i - 1}] is missing`);
    await openSection(page, sec);
    const r = region(page, sec);
    await r.getByRole('button', { name: 'Select passenger' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('textbox', { name: /Search Passenger/ }).fill(String(s.savedPassengerSearch));
    await dlg.getByRole('button', { name: 'Search' }).click();
    await dlg.getByRole('button', { name: 'Pick' }).first().waitFor();
    const name = fixedName || await resolveProfileName(dlg, type, want, usedNames);
    usedNames.add(name);
    await dlg.locator('tr').filter({ hasText: name }).getByRole('button', { name: 'Pick' }).click();
    await dlg.getByRole('button', { name: 'Confirm passenger' }).click(); // Escape would discard the pick
    await page.getByRole('dialog').waitFor({ state: 'detached' }).catch(() => {});
    const doc = docs.shift();
    await r.getByRole('textbox', { name: 'Document Number *' }).fill(doc);
    const dob = await r.getByRole('textbox', { name: 'Date of Birth *' }).inputValue().catch(() => '');
    travellers.push({ sec, type, name, firstName: name.split(' ')[0], doc, dob, title: await titleOf(page, sec) });
  }
  let assignedOptions = [];
  for (const { sec, i } of sections(pax).filter((x) => x.type === 'Infant')) {
    const want = ((s.criteria || {}).infants || [])[i - 1] || {};
    assignedOptions = await setAssignedTo(page, sec, want.assignTo);
  }
  const today = new Date();
  const badAge = travellers.find((t) => !t.dob || !AGE_OK[t.type](ageYears(t.dob, today)));
  if (badAge) throw new Error(`age check: ${badAge.name} (${badAge.type}) born ${badAge.dob || '?'} is outside the ${badAge.type} range`);
  return { travellers, assignedOptions };
}

async function acceptTerms(page) {
  const box = page.getByRole('checkbox', { name: /I have read and agree/ });
  if (!(await box.isChecked().catch(() => false))) await page.getByText('I have read and agree to the').click();
}

const TITLES = ['Mr', 'Ms', 'Mrs', 'Miss', 'Master'];

/** Same exact-text-div pattern `setTitle`'s `from` locator and `genderOf` already rely on — proven
 * live; a bulk-text regex over the whole section was tried first and did not match the real markup. */
async function titleOf(page, sec) {
  const r = region(page, sec);
  for (const t of TITLES) {
    if (await r.locator('div').filter({ hasText: new RegExp(`^${esc(t)}$`) }).count()) return t;
  }
  return null;
}

async function setTitle(page, sec, from, to) {
  if (!from) throw new Error(`setTitle(${sec}): no current title read (titleOf returned null) — fix titleOf before this hangs on a missing locator`);
  await region(page, sec).locator('div').filter({ hasText: new RegExp(`^${esc(from)}$`) }).first().click();
  await page.getByRole('option', { name: to, exact: true }).filter({ visible: true }).first().click();
  await wait(page, 300);
}

async function titleOptions(page, sec) {
  const current = await titleOf(page, sec);
  await region(page, sec).locator('div').filter({ hasText: new RegExp(`^${esc(current)}$`) }).first().click();
  const opts = [...new Set((await page.getByRole('option').filter({ visible: true }).allInnerTexts()).map(norm))];
  await page.keyboard.press('Escape');
  await wait(page, 200);
  return opts;
}

async function genderOf(page, sec) {
  const r = region(page, sec);
  if (await r.getByText('Female', { exact: true }).count()) return 'Female';
  if (await r.getByText('Male', { exact: true }).count()) return 'Male';
  return null;
}

const visibleFirstNames = (page) => page.getByRole('textbox', { name: 'First Name *' })
  .evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length);

// ---------------------------------------------------------------- step 1: fare packages

const bundleBox = (page, names) => page.locator('p-dropdown')
  .filter({ hasText: new RegExp(['Choose a bundle', ...(names || [])].map(esc).join('|')) }).first();

// The package section can render a moment after the passengers are filled (proven live 2026-10-19 on a
// 1-adult booking: read too early, it said "no packages" and Next then refused to move). Wait briefly.
const hasBundleStep = async (page) => {
  for (let i = 0; i < 10; i += 1) {
    if ((await page.getByText('Select Bundle').count()) > 0) return true;
    await wait(page, 400);
  }
  return false;
};

async function bundleNames(page) {
  await bundleBox(page).click();
  await wait(page, 400);
  const names = (await page.getByRole('option').filter({ visible: true }).allInnerTexts()).map(norm);
  await page.keyboard.press('Escape');
  await wait(page, 200);
  return names;
}

async function chooseBundle(page, name, names) {
  await bundleBox(page, names).click();
  await wait(page, 300);
  await page.getByRole('option', { name, exact: true }).filter({ visible: true }).first().click();
  await wait(page, 700);
}

async function bundleServices(page, name) {
  const t = await text(page);
  return (t.match(new RegExp(`${esc(name)} Bundle Services: ([\\s\\S]*?)(?: Next | Payment Details|$)`)) || [])[1] || '';
}

// ---------------------------------------------------------------- moving between steps

const onStep2 = async (page) => (await page.getByRole('button', { name: OPENER }).count()) > 0
  || /\b02 Ancillaries\b[^]{0,60}?\bIn progress\b/.test(await text(page)); // a supplier without seats has no opener

async function nextToStep2(page, timeoutMs = 45000) {
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Next' }).click();
  while (!(await onStep2(page))) { // Flynas: 7–11 s
    if (Date.now() - t0 > timeoutMs) throw new Error(`step 2 did not open within ${timeoutMs / 1000} s of Next`);
    await wait(page, 400);
  }
  await wait(page, 500);
  return +((Date.now() - t0) / 1000).toFixed(1);
}

/** Clicks Next and reports whether step 2 opened within `ms` (for the checks that expect it not to). */
async function nextExpectingToStay(page, ms = 3000) {
  await page.getByRole('button', { name: 'Next' }).click();
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await onStep2(page)) return true;
    await wait(page, 300);
  }
  return false;
}

async function prevToStep1(page) {
  await page.getByRole('button', { name: /^\s*Prev/ }).first().click();
  await region(page, '1- Adult').or(page.getByRole('tab', { name: /1- Adult/ })).first().waitFor({ timeout: 15000 });
  await wait(page, 400);
}

// ---------------------------------------------------------------- prices

async function published(page) {
  const m = (await text(page)).match(/([\d,]+(?:\.\d+)?) ([A-Z]{3}) Published Fare/);
  return m ? { amount: num(m[1]), currency: m[2], raw: m[1] } : null;
}

async function breakdown(page) {
  const t = await text(page);
  const m = t.match(/Fare Breakdown([\s\S]*?)Total Amount:? ([\d,.]+)/) || [];
  const body = m[1] || '';
  const per = (re) => [...body.matchAll(re)].map((x) => ({ type: x[1], amount: num(x[2]) }));
  const lines = {};
  for (const x of body.matchAll(/(Bundle Fare|Meal Preference|Extra Baggage|Seat Selection) \+ ([\d,.]+)/g)) lines[x[1]] = num(x[2]);
  return {
    base: per(/Base fare: \(\d+ (\w+)\) ([\d,.]+)/g),
    tax: per(/Tax & Fees: \(\d+ (\w+)\) ([\d,.]+)/g),
    anc: num((body.match(/\(\+\) Ancillaries & SSR ([\d,.]+)/) || [])[1] || 0),
    lines,
    total: m[2] ? num(m[2]) : null,
  };
}

/** Step 2 "Selected seats" summary: how many travellers and each name / seat / price. */
async function selectedSeats(page) {
  const t = await text(page);
  const m = t.match(/Selected seats (\d+) travell(?:er|ers)([\s\S]*?)(?: Prev | Payment Details|$)/);
  if (!m) return { count: 0, rows: [] };
  const rows = [...m[2].matchAll(/TRAVELLER (.+?) Seat (\d+[A-Z]) Price ([A-Z]{3} [\d,.]+|Free)/g)]
    .map((x) => ({ name: x[1], seat: x[2], price: x[3] }));
  return { count: Number(m[1]), rows };
}

async function openerText(page) {
  return norm(await page.getByRole('button', { name: OPENER }).first().innerText().catch(() => ''));
}

// ---------------------------------------------------------------- seat map

const mapDialog = (page) => page.getByRole('dialog').last();
const seatLoc = (page, n) => page.locator(`[aria-label^="Seat ${n},"]`).first();

function parseSeat(label) {
  const p = label.split(', ');
  const last = p[p.length - 1];
  const m = label.match(/^Seat (\d+)([A-Z]),/);
  let state = 'unknown';
  if (last === 'Blocked') state = 'blocked';
  else if (/^available for /.test(last)) state = 'available';
  else if (/^selected for /.test(last)) state = 'selected';
  else if (/not offered for /.test(last)) state = 'notOffered';
  const features = p.slice(4, -1);
  return {
    label, n: m[1] + m[2], row: Number(m[1]), col: m[2], rowLabel: Number(String(p[1]).replace('row ', '')),
    side: p[2], section: p[3], features: features.filter(Boolean), emptySlot: features.includes(''),
    state, price: state === 'available' ? last.replace('available for ', '') : null,
    heldBy: state === 'selected' ? last.replace('selected for ', '') : null,
  };
}

async function readSeats(page) {
  const labels = await page.locator('[aria-label^="Seat "]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  return labels.filter((l) => /^Seat \d+[A-Z],/.test(l || '')).map(parseSeat);
}

const SEAT_SEL = '[aria-label^="Seat "][aria-label*=", row "]';
const mapOpen = async (page) => page.locator(SEAT_SEL).first().isVisible().catch(() => false);

/** Opens the seat map; a no-op when it is already open (steps can run alone with --only). */
async function openMap(page) {
  if (await mapOpen(page)) return 0;
  const t0 = Date.now();
  const opener = page.getByRole('button', { name: OPENER }).first();
  // The button shows a loading spinner and is briefly disabled right after step 2 opens — the same
  // thing SetupBooking_Script.md already waits out before pressing Next.
  for (let i = 0; i < 40 && !(await opener.isEnabled().catch(() => false)); i += 1) await wait(page, 250);
  await opener.click();
  await page.locator(SEAT_SEL).first().waitFor({ timeout: 20000 });
  await wait(page, 600);
  return +((Date.now() - t0) / 1000).toFixed(1);
}

/** A multi-journey booking has one opener per flight, in journey order (proven live, 2026-10-19:
 * a CAI↔JED return trip shows two "Select Seat" buttons on step 2). Opens the `index`-th one. */
async function openMapAt(page, index) {
  if (await mapOpen(page)) throw new Error('openMapAt: a seat map is already open — close it first');
  const opener = page.getByRole('button', { name: OPENER }).nth(index);
  for (let i = 0; i < 40 && !(await opener.isEnabled().catch(() => false)); i += 1) await wait(page, 250);
  await opener.click();
  await page.locator(SEAT_SEL).first().waitFor({ timeout: 20000 });
  await wait(page, 600);
}

async function openerTexts(page) {
  return (await page.getByRole('button', { name: OPENER }).allInnerTexts()).map(norm);
}

/** Leaves the map without losing a choice: confirms when something is chosen, otherwise continues without. */
async function ensureMapClosed(page) {
  if (!(await mapOpen(page))) return;
  const confirm = mapDialog(page).getByRole('button', { name: /^Confirm/ });
  if (await confirm.count()) await confirmSeats(page); else await continueWithoutSeats(page);
}

const mapText = async (page) => norm(await mapDialog(page).innerText());

// The counter reads "Seats assigned" while partial and "All assigned" once everyone has a seat.
async function assigned(page) {
  const m = (await mapText(page)).match(/(\d+) \/ (\d+) (?:Seats assigned|All assigned)/);
  return m ? { done: Number(m[1]), of: Number(m[2]) } : null;
}

async function bottomButtons(page) {
  return (await mapDialog(page).getByRole('button', { name: /^(Continue without seats|Confirm .*seats?|Clear all seats)/ })
    .allInnerTexts()).map(norm);
}

async function activate(page, fullName) {
  await mapDialog(page).getByText(fullName, { exact: false }).first().click();
  await wait(page, 300);
}

async function clickSeat(page, n) {
  await seatLoc(page, n).click({ force: true }); // blocked seats are still clickable for their box
  await wait(page, 350);
}

// Unanchored: the button's accessible name carries a leading icon glyph (proven live, 2026-10-17).
const bookButton = (page, n, firstName) => mapDialog(page).getByRole('button', { name: new RegExp(`Book ${esc(n)}${firstName ? ` for ${esc(firstName)}` : ''}`) });

async function bookSeat(page, n, firstName) {
  await clickSeat(page, n);
  await bookButton(page, n, firstName).click();
  await wait(page, 450);
}

async function seatState(page, n) {
  return parseSeat(await seatLoc(page, n).getAttribute('aria-label'));
}

async function confirmSeats(page) {
  await mapDialog(page).getByRole('button', { name: /^Confirm/ }).first().click();
  await page.locator(SEAT_SEL).first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  await wait(page, 800);
}

async function continueWithoutSeats(page) {
  await mapDialog(page).getByRole('button', { name: /^Continue without seats/ }).click();
  await wait(page, 800);
}

async function clearAll(page) {
  await mapDialog(page).getByRole('button', { name: /^Clear all/ }).click();
  await wait(page, 450);
}

/** Section headers on the map: { 'Y-1': { cabin, layout: [3,3], price: 'from EGP 642' | … } }. */
async function sectionHeaders(page) {
  const t = await mapText(page);
  const out = {};
  for (const m of t.matchAll(/\b([A-Z]-\d+) ([A-Z][a-z]+(?: [A-Z][a-z]+)?) (\d+(?:-\d+)+) rows \d+–\d+ (All seats free|Free – [A-Z]{3} [\d,.]+|from [A-Z]{3} [\d,.]+|[A-Z]{3} [\d,.]+(?: – [A-Z]{3} [\d,.]+)?)/g)) {
    out[m[1]] = { cabin: m[2], layout: m[3].split('-').map(Number), price: m[4] };
  }
  return out;
}

/** Pick `k` available seats for the active traveller, plain ones first (no exit, no women-only). */
function plainSeats(seats, k, { exclude = [], paid = null } = {}) {
  const ok = seats.filter((x) => x.state === 'available' && !exclude.includes(x.n)
    && !x.features.some((f) => /Exit|Female/.test(f))
    && (paid == null || (paid ? x.price !== 'Free' : x.price === 'Free')));
  ok.sort((a, b) => a.row - b.row || a.col.localeCompare(b.col));
  return ok.slice(0, k).map((x) => x.n);
}

// ---------------------------------------------------------------- step 2: meals and bags

const dropdown = (page, label) => page.locator('p-dropdown').filter({ hasText: label }).first();
// One per non-infant passenger, in the same order as the passenger cards on step 2 — simpler and more
// robust than matching each card's text container.
const dropdownAt = (page, label, index) => page.locator('p-dropdown').filter({ hasText: label }).nth(index);
const dropdownCount = (page, label) => page.locator('p-dropdown').filter({ hasText: label }).count();

/** Step 2's passenger cards are collapsed accordions too (proven live, 2026-10-18): Passenger 2's
 * meal/baggage dropdown is in the DOM from the start but covered by its own collapsed header until
 * "Passenger N" is clicked open — the same shape as step 1's PAX-007 finding. Checks the nearest
 * ancestor's `aria-expanded` first; clicking an already-open header would toggle it closed instead. */
async function expandPassengerCard(page, n) {
  const header = page.getByText(`Passenger ${n}`, { exact: false }).first();
  if (!(await header.count())) return;
  const expanded = await header.evaluate((el) => {
    for (let node = el; node; node = node.parentElement) if (node.hasAttribute('aria-expanded')) return node.getAttribute('aria-expanded');
    return null;
  });
  if (expanded === 'true') return;
  await header.click();
  await wait(page, 300);
}

async function readOptions(page, dd) {
  await dd.click();
  await wait(page, 350);
  const opts = (await page.getByRole('option').filter({ visible: true }).allInnerTexts()).map(norm);
  await page.keyboard.press('Escape');
  await wait(page, 200);
  return opts;
}

async function dropdownOptions(page, label) { return readOptions(page, dropdown(page, label)); }
async function dropdownOptionsAt(page, label, index) { return readOptions(page, dropdownAt(page, label, index)); }

/** `optionName` is matched anywhere in the option's name: a meal by its code (SFML), a bag by "20Kg Baggage". */
async function chooseOption(page, label, optionName) {
  await dropdown(page, label).click();
  await wait(page, 350);
  await page.getByRole('option', { name: new RegExp(esc(optionName)) }).filter({ visible: true }).first().click();
  await wait(page, 800);
}

async function clearDropdown(page, label) {
  const dd = dropdown(page, label);
  await dd.hover();
  await dd.locator('.p-dropdown-clear-icon').click();
  await wait(page, 800);
}

/** "SFML 273.00 EGP Seafood Meal" → { code, price, shown }. The dropdown then shows `shown`. */
const parseMeal = (o) => { const m = o.match(/^(\S+) ([\d,.]+) [A-Z]{3} (.+)$/); return m ? { code: m[1], price: num(m[2]), shown: m[3], text: o } : null; };
/** "20Kg Baggage - ( 4,128 EGP )" → { name, kg, price }. */
const parseBag = (o) => { const m = o.match(/^(.+?) - \( ([\d,.]+) [A-Z]{3} \)$/); return m ? { name: m[1], kg: num(m[1]), price: num(m[2]), text: o } : null; };

module.exports = {
  norm, num, esc, wait, text, OPENER,
  targetDate, search, searchRoundTrip, searchMultiCity, chooseBundleForNextLeg, bundlesRemaining, expandJourneys, readCards, waitForCard, clickCard, priceUpdateOrPassengers, priceDialog, readPriceUpdate,
  region, sections, openSection, fillPassengers, setAssignedTo, acceptTerms, titleOf, setTitle, titleOptions, genderOf,
  visibleFirstNames,
  hasBundleStep, bundleNames, chooseBundle, bundleServices,
  onStep2, nextToStep2, nextExpectingToStay, prevToStep1,
  published, breakdown, selectedSeats, openerText,
  mapDialog, seatLoc, parseSeat, readSeats, mapOpen, openMap, openMapAt, openerTexts, ensureMapClosed, mapText, assigned, bottomButtons, activate, clickSeat,
  bookButton, bookSeat, seatState, confirmSeats, continueWithoutSeats, clearAll, sectionHeaders, plainSeats,
  dropdown, dropdownAt, dropdownCount, dropdownOptions, dropdownOptionsAt, expandPassengerCard, chooseOption, clearDropdown, parseMeal, parseBag,
};
