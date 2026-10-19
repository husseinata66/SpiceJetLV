'use strict';
// Shared by the multi-city groups (10, 11): search the human-supplied multi-city route, book the first card
// of the right credential, fill the passengers by criteria, give every journey a package, reach step 2 —
// never books. A package can be refused at step 2 (`ssr-quote` 400; Next then silently does nothing), so
// when step 2 does not open the next package is tried on that journey and the refusal is recorded.

async function reachStep2(c, PAX, freshDocs, key = 'multiCity') {
  const U = c.ui; const p = c.page; const s = c.settings;
  const mc = s[key];
  const minLegs = key === 'multiCity' ? 3 : 2; // Group 10 needs 3 journeys; the different-aircraft route needs only 2 flights to compare
  if (!mc || !Array.isArray(mc.legs) || mc.legs.length < minLegs) throw new Error(`settings.local.json needs "${key}": { "legs": [{ "from", "to", "daysFromToday" } × ${minLegs} or more], "credentialName"? } — a route with inventory on every leg.`);
  const cred = mc.credentialName || c.credentialName;
  if (cred !== c.credentialName) c.env('Credential', `${cred} (the run's is ${c.credentialName}; multi-city inventory only exists on this one — human decision, 2026-10-19)`);
  const srch = await U.searchMultiCity(p, c.baseUrl, s, PAX, mc.legs);
  const cards = await U.waitForCard(p, cred, 120000);
  srch.stop();
  if (cards.index < 0) throw new Error(`no multi-city card from "${cred}" among ${cards.count} cards`);
  c.env('Search', `multi-city ${mc.legs.map((l) => `${l.from}→${l.to} (+${l.daysFromToday}d)`).join(' · ')}, 1 adult + 1 child + 1 infant`);
  await U.clickCard(p, cards.index);
  if ((await U.priceUpdateOrPassengers(p)) === 'priceUpdate') {
    await U.priceDialog(p).getByRole('button', { name: 'Accept', exact: true }).click();
    await U.region(p, '1- Adult').waitFor({ timeout: 30000 });
  }
  const criteria = { ...s, criteria: { adults: [{}], children: [{}], infants: [{}] } };
  const { travellers } = await U.fillPassengers(p, criteria, PAX, freshDocs(3));
  c.state.travellers = travellers;
  c.env('Passengers', travellers.map((t) => `${t.name} (${t.type})`).join(' · '));

  // Packages: the first one on every journey, in journey order.
  const chosen = [];
  let names = [];
  if (await U.hasBundleStep(p)) {
    const first = await U.chooseBundleForNextLeg(p);
    names = first.names; chosen.push(first.chosen);
    while (await U.bundlesRemaining(p)) chosen.push((await U.chooseBundleForNextLeg(p)).chosen);
  }
  c.state.packageBoxes = chosen.length;
  await U.acceptTerms(p);
  let opened = await U.nextExpectingToStay(p, 25000);
  const refused = [];
  const bundleAt = (i) => p.locator('p-dropdown').filter({ hasText: new RegExp(['Choose a bundle', ...names].map(U.esc).join('|')) }).nth(i);
  for (let j = 0; !opened && j < chosen.length; j += 1) {
    for (const alt of names) {
      if (opened) break;
      if (alt === chosen[j]) continue; // never re-pick the selected option — that clears it
      refused.push(`journey ${j + 1}: '${chosen[j]}'`);
      await U.expandJourneys(p);
      await bundleAt(j).click();
      await U.wait(p, 300);
      await p.getByRole('option', { name: alt, exact: true }).filter({ visible: true }).first().click();
      await U.wait(p, 700);
      chosen[j] = alt;
      opened = await U.nextExpectingToStay(p, 25000);
    }
  }
  if (!opened) throw new Error(`step 2 did not open, even after changing packages (refused: ${refused.join('; ') || 'none tried'}) — ssr-quote is refusing this itinerary (sold-out class?)`);
  await U.wait(p, 800);
  c.state.packages = chosen;
  c.state.refused = refused;
  c.env('Packages', chosen.length ? chosen.map((n, i) => `journey ${i + 1}: '${n}'`).join(' · ') : 'none offered by this supplier');
  if (refused.length) c.env('Package refused at step 2', `${refused.join('; ')} — Next did nothing and showed no message (ssr-quote 400); the next package was used`);
}

module.exports = { reachStep2 };
