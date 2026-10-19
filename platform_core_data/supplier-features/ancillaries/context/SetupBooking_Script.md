# Setup Booking Script — Ancillaries — Portal

<!-- FEATURE-LEVEL operational knowledge, referenced (never copied) by every Ancillaries Supplier run.
     It is a DOCUMENT with a code block, not a platform tool: nothing executes it automatically, and it
     holds no credential, no Supplier name and no per-run value beyond the example parameters. -->

**Feature:** Ancillaries (`ancillaries`) · **Applies to:** the Portal (`playwright-ancillaries` server)
**Used by:** `ExecutionFlow_HappyPath.md` §15.4 and §16
**Status:** Draft — pending approval · **Revision:** 1 (human decision, Mohanad Dawood, 2026-10-17)
**Proven on:** OmanAir, CAI→JED, 1 adult + 1 child + 1 infant, Economy, 2026-10-17: Flight Search to
step 2 in about 30 s in one call, against about 9m20s–9m46s done one action at a time.

## 1. What it does, and what it never does

One `browser_run_code_unsafe` call: search → pick the first fare → fill every passenger from a saved
profile → link the infant → accept the terms → Next → wait until *Select Seat* is enabled. It **stops
there**. It never opens a seat map, never selects a seat, and never presses Book, Hold, Pay or Save
Quote (§15.4 limits 1–3). It carries **no credential**: log in first (the human, or the scoped login
exception in `platform_core/tools/mcp/README.md` §1.3).

## 2. Change these per run — nothing else

| Parameter | Meaning |
|---|---|
| `FROM`, `TO` | IATA codes shown in the airport lists |
| `DAY_NEXT_MONTH` | day of next month to fly (the calendar opens on the current month; one click forward) |
| `PAX` | Adults / children / infants searched |
| `PROFILES` | The saved profile to pick for each passenger **by name** (search by the saved mobile number) |
| `DOCS` | A **fresh** Document Number per passenger, every booking (§15.5 rule 4) |

Pick profiles by real date of birth, not the dialog's Age column. Age rules: **Adult at least 12
years; Child at least 2 and less than 12; Infant at least 1 day and less than 2 years.** Keep a margin
from each edge. The script checks this before pressing Next and stops with `age check` if a profile
is out of range.

## 3. The script

```js
async (page) => {
  page.setDefaultTimeout(10000);                       // short cap: stacked 30 s waits were the slowest thing we saw
  const P = {
    FROM: 'CAI', TO: 'JED', DAY_NEXT_MONTH: '30', PAX: { adults: 1, children: 1, infants: 1 },
    MOBILE: '<saved passengers mobile number>',
    PROFILES: { '1- Adult': 'Mohanad Dawood', '1- Child': 'Layla ExrTest', '1- Infant': 'Youssef Dawood' },
    DOCS: { '1- Adult': 'R40000001', '1- Child': 'R40000002', '1- Infant': 'R40000003' },   // fresh every booking
  };
  const T0 = Date.now(); const out = { steps: [] };
  const mark = (s) => out.steps.push(`${((Date.now() - T0) / 1000).toFixed(1)}s ${s}`);
  const get = async (r, l) => await r.getByRole('textbox', { name: l }).inputValue().catch(() => '');
  const ageYears = (dmy, ref) => { const [d, m, y] = dmy.split('/').map(Number); const b = new Date(y, m - 1, d); let a = ref.getFullYear() - b.getFullYear(); if (ref < new Date(ref.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
  try {
    await page.goto('http://<portal host>/booking/flight-search');   // already logged in
    // Airport lists are slow and uneven: type the code at once and search AGAIN every 3 s instead of waiting (§15.5 rule 1)
    const pickAirport = async (labelRe, code, optionLoc) => {
      await page.locator('div').filter({ hasText: labelRe }).first().click();
      const box = page.getByRole('textbox').nth(1);
      const deadline = Date.now() + 120000;
      while (Date.now() < deadline) {
        await box.fill(''); await box.fill(code);
        try { await optionLoc.first().waitFor({ state: 'visible', timeout: 3000 }); await optionLoc.first().click(); return; } catch (e) {}
      }
      throw new Error(`airport ${code} never appeared`);
    };
    await pickAirport(/^From \*$/, P.FROM, page.getByRole('listitem', { name: P.FROM }));
    await pickAirport(/^To \*$/, P.TO, page.getByRole('option', { name: P.TO }));
    // Dates must be committed through the calendar; a typed value resets (§15.5 rule 2)
    await page.getByRole('textbox', { name: 'DD/MM/YYYY *' }).click();
    await page.locator('.p-ripple.p-element.p-datepicker-next').click();
    await page.getByRole('cell', { name: P.DAY_NEXT_MONTH, exact: true }).first().click();
    await page.getByRole('button', { name: /^1/ }).first().click();
    const plus = page.locator('p-button:nth-child(3) > .p-ripple');
    for (let i = 1; i < P.PAX.adults; i++) await plus.nth(0).click();
    for (let i = 0; i < P.PAX.children; i++) await plus.nth(1).click();
    for (let i = 0; i < P.PAX.infants; i++) await plus.nth(2).click();
    await page.getByRole('heading', { name: 'Flight Search' }).click();
    await page.getByRole('button', { name: 'Search' }).click();
    const book = page.getByRole('button', { name: 'Book Flight ' }).first();   // first fare only; do not wait for the whole list
    await book.waitFor({ timeout: 150000 });
    mark('first result');
    await book.click();
    await page.getByRole('region', { name: ' 1- Adult' }).waitFor({ timeout: 30000 });
    mark('passenger details open');

    // Passengers from saved profiles: Pick, then Confirm passenger, then a fresh Document Number (§15.5 rule 4)
    for (const [sec, name] of Object.entries(P.PROFILES)) {
      const tab = page.getByRole('tab', { name: new RegExp(sec) });
      if ((await tab.getAttribute('aria-expanded')) !== 'true') await tab.click();   // never "Expand All": it toggles
      const r = page.getByRole('region', { name: ` ${sec}` });
      await r.getByRole('button', { name: 'Select passenger' }).click();
      const dlg = page.getByRole('dialog');
      await dlg.getByRole('textbox', { name: /Search Passenger/ }).fill(P.MOBILE);
      await dlg.getByRole('button', { name: 'Search' }).click();
      await dlg.getByRole('button', { name: 'Pick' }).first().waitFor();
      await dlg.locator('tr').filter({ hasText: name }).getByRole('button', { name: 'Pick' }).click();
      await dlg.getByRole('button', { name: 'Confirm passenger' }).click();           // Escape would discard the pick
      await page.getByRole('dialog').waitFor({ state: 'detached' }).catch(() => {});
      await r.getByRole('textbox', { name: 'Document Number *' }).fill(P.DOCS[sec]);
    }
    if (P.PAX.infants) {
      const inf = page.getByRole('region', { name: ' 1- Infant' });
      await inf.locator('div').filter({ hasText: /^Assigned to$/ }).first().click();
      await page.getByRole('option').first().click();                                 // lists adults only
    }
    // Check the ages BEFORE Next: an out-of-range age makes add-pax return 400 and Next does nothing visible
    const today = new Date(), ages = {};
    for (const sec of Object.keys(P.PROFILES)) ages[sec] = ageYears(await get(page.getByRole('region', { name: ` ${sec}` }), 'Date of Birth *'), today);
    out.ages = ages;
    if (ages['1- Adult'] < 12 || (ages['1- Child'] !== undefined && (ages['1- Child'] < 3 || ages['1- Child'] > 11)) || (ages['1- Infant'] !== undefined && ages['1- Infant'] > 1))
      return { ...out, ok: false, stoppedAt: 'age check' };
    mark('passengers filled');

    await page.getByText('I have read and agree to the').click();
    await page.getByRole('button', { name: 'Next' }).click();
    const seatBtn = page.getByRole('button', { name: 'Select Seat' }).first();
    await seatBtn.waitFor({ state: 'visible', timeout: 15000 });
    for (let i = 0; i < 40 && !(await seatBtn.isEnabled()); i++) await page.waitForTimeout(250);   // enabled a moment after it appears
    mark('step 2 open, Select Seat enabled');
    return { ...out, ok: true, totalSec: +((Date.now() - T0) / 1000).toFixed(1) };
  } catch (err) { return { ...out, ok: false, error: String(err).slice(0, 250) }; }
}
```

## 4. If it fails

Continue in single steps from the last screen it reached (§15.4 limit 7); the failure is a setup problem,
not a test result. Typical causes: the section is collapsed (open it by its own tab), a dropdown from
the previous passenger is still open (press Escape), or a profile whose age is out of range. If Next
seems dead, read the `add-pax` response for the reason.
