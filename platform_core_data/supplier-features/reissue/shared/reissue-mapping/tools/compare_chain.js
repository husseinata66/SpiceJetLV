#!/usr/bin/env node
// Reissue mapping — supplier-to-screen chain comparator.
//
// Answers one question per displayed value: does what the screen shows actually come from the
// supplier, and did it arrive intact?
//
//     Sabre  ->  ndc-core-service  ->  Admin/Portal API  ->  screen
//
// Every rule declares what it EXPECTS the value's origin to be:
//
//   SUPPLIER   Sabre sends it; core and Portal must carry it unchanged
//   DERIVED    computed from supplier data by a stated formula
//   PORTAL     the app provides it; Sabre sends nothing. Not a defect — but it must be
//              DECLARED, and the set must never grow silently
//
// A rule fails when the observed chain disagrees with the declared origin, or when a SUPPLIER
// value changes as it travels.
//
// Data-driven by design: add a row to RULES, not a branch to the code.
//
// Usage:
//   node compare_chain.js --manifest capture.json [--json] [--md out.md]
//
// Manifest — the payloads captured for ONE transaction, paths relative to the manifest:
//   {
//     "label": "scenario 2 · CAI-RUH",
//     "supplier": "s2-sabre-reshop.json",
//     "core":     "s2-core-reshop.json",
//     "portal":   "s2-portal-search.json",
//     "offerIndex": 0,
//     "rate": 9            // optional: the agency's rate-of-exchange multiplier, when the UI
//                          // presents a currency other than the supplier's. Supplier and core
//                          // price in the supplier currency; the UI value is (supplier x rate).
//                          // Omit for a same-currency agency.
//   }
//
// Exit: 0 everything as declared · 2 one or more failures · 1 error

'use strict';

const fs = require('fs');
const path = require('path');

const ORIGIN = { SUPPLIER: 'SUPPLIER', DERIVED: 'DERIVED', PORTAL: 'PORTAL' };

// ---------------------------------------------------------------------------
// helpers

/** Resolve "a.b[0].c" against an object, returning undefined rather than throwing. */
function pick(obj, dotted) {
  if (obj == null || !dotted) return undefined;
  return dotted.split('.').reduce((acc, key) => {
    if (acc == null) return undefined;
    const m = key.match(/^([^[]*)\[(\d+)\]$/);
    if (m) {
      const base = m[1] ? acc[m[1]] : acc;
      return base == null ? undefined : base[Number(m[2])];
    }
    return acc[key];
  }, obj);
}

/** Take the nth entry of an array or of an id-keyed object. */
function nth(mapOrArray, i = 0) {
  if (mapOrArray == null) return undefined;
  if (Array.isArray(mapOrArray)) return mapOrArray[i];
  const keys = Object.keys(mapOrArray);
  return keys.length > i ? mapOrArray[keys[i]] : undefined;
}

/** Amounts arrive as {amount, currency} in some layers, as strings or numbers in others. */
function amount(v) {
  if (v == null) return undefined;
  if (typeof v === 'object' && 'amount' in v) return Number(v.amount);
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/** "2026-12-20T10:40:00" / "10:40" / "10:40:00" -> "10:40" */
function hhmm(v) {
  if (v == null) return undefined;
  const m = String(v).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : undefined;
}

/** "2026-12-20T10:40:00" -> "2026-12-20" */
function ymd(v) {
  if (v == null) return undefined;
  const m = String(v).match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : undefined;
}

// ---------------------------------------------------------------------------
// Reference resolution.
//
// Every layer keys its collections by opaque id, and key order is arbitrary — so reading
// `segments[0]` compares unrelated flights. Each layer must be walked offer -> journey -> segment.

const RESOLVE = {
  supplier(s, i = 0) {
    const offer = (s.offers || [])[i];
    if (!offer) return [];
    const byId = (arr, id) => (arr || []).find((x) => x.id === id);
    return (offer.journeyRefs || [])
      .map((jr) => byId(s.journeys, jr))
      .filter(Boolean)
      .flatMap((j) => (j.flightRefs || []).map((fr) => byId(s.flights, fr)))
      .filter(Boolean);
  },
  core(c, i = 0) {
    const offer = (c.offers || [])[i];
    if (!offer) return [];
    return (offer.offerJourneys || [])
      .map((jk) => (c.journeys || {})[jk])
      .filter(Boolean)
      .flatMap((j) => (j.segmentRefIds || []).map((sk) => (c.flightSegments || {})[sk]))
      .filter(Boolean);
  },
  portal(p, i = 0) {
    const key = Object.keys(p.offers || {})[i];
    const offer = key && p.offers[key];
    if (!offer) return [];
    return (offer.journeyReferenceIds || [])
      .map((jk) => (p.journeys || {})[jk])
      .filter(Boolean)
      .flatMap((j) => (j.segmentReferenceIds || []).map((sk) => (p.segments || {})[sk]))
      .filter(Boolean);
  },
};

/** Flights of ONE journey of the selected offer, supplier side (journeys are not flattened). */
RESOLVE.supplierJourney = function (s, i = 0, j = 0) {
  const offer = (s.offers || [])[i];
  if (!offer) return [];
  const byId = (arr, id) => (arr || []).find((x) => x.id === id);
  const journey = byId(s.journeys, (offer.journeyRefs || [])[j]);
  if (!journey) return [];
  return (journey.flightRefs || []).map((fr) => byId(s.flights, fr)).filter(Boolean);
};

const OFFER = {
  supplier: (s, i = 0) => (s.offers || [])[i],
  core: (c, i = 0) => (c.offers || [])[i],
  portal: (p, i = 0) => { const k = Object.keys(p.offers || {})[i]; return k ? p.offers[k] : undefined; },
};

const JOURNEY = {
  core(c, i = 0) { const o = OFFER.core(c, i); return o ? (c.journeys || {})[(o.offerJourneys || [])[0]] : undefined; },
  portal(p, i = 0) { const o = OFFER.portal(p, i); return o ? (p.journeys || {})[(o.journeyReferenceIds || [])[0]] : undefined; },
};

/**
 * Flight signature of an offer, per layer — carrier + flight number per segment, in order.
 *
 * Offer INDEX is not comparable across layers: each layer's payload comes from its own call to
 * Sabre, and Sabre returns a different selection of flight combinations each time. Comparing
 * `offers[0]` to `offers[0]` therefore risks comparing two unrelated itineraries. Every comparison
 * must be anchored to the same flights.
 */
function sigSupplier(s, i) {
  const byId = (arr, id) => (arr || []).find((x) => x.id === id);
  const o = (s.offers || [])[i];
  if (!o) return null;
  const f = (o.journeyRefs || []).map((r) => byId(s.journeys, r)).filter(Boolean)
    .flatMap((j) => (j.flightRefs || []).map((r) => byId(s.flights, r))).filter(Boolean);
  return f.length ? f.map((x) => x.marketingAirlineCode + x.marketingFlightNumber).join('-') : null;
}
function sigCore(c, i) {
  const o = (c.offers || [])[i];
  if (!o) return null;
  const f = (o.offerJourneys || []).map((k) => (c.journeys || {})[k]).filter(Boolean)
    .flatMap((j) => (j.segmentRefIds || []).map((k) => (c.flightSegments || {})[k])).filter(Boolean);
  return f.length ? f.map((x) => x.marketingCarrierCode + x.marketingFlightNumber).join('-') : null;
}
function sigPortal(p, i) {
  const k = Object.keys(p.offers || {})[i];
  const o = k ? p.offers[k] : null;
  if (!o) return null;
  const f = (o.journeyReferenceIds || []).map((x) => (p.journeys || {})[x]).filter(Boolean)
    .flatMap((j) => (j.segmentReferenceIds || []).map((x) => (p.segments || {})[x])).filter(Boolean);
  return f.length ? f.map((x) => x.marketingCarrier.code + x.marketingCarrier.flightNumber).join('-') : null;
}

/**
 * Align the three layers on one itinerary. Takes the supplier's offer at `i` and finds the offer
 * in core and Portal carrying the same flights. Returns per-layer indices, or nulls when a layer
 * does not contain that itinerary at all — which is itself worth reporting.
 */
function alignOffers(ctx, i) {
  const want = sigSupplier(ctx.supplier, i);
  if (!want) return { supplier: i, core: null, portal: null, signature: null };
  let core = null;
  for (let k = 0; k < (ctx.core.offers || []).length; k += 1) if (sigCore(ctx.core, k) === want) { core = k; break; }
  let portal = null;
  const pn = Object.keys(ctx.portal.offers || {}).length;
  for (let k = 0; k < pn; k += 1) if (sigPortal(ctx.portal, k) === want) { portal = k; break; }
  return { supplier: i, core, portal, signature: want };
}

/** First segment of the selected offer, per layer. */
const SEG = {
  s: (s, i) => RESOLVE.supplierJourney(s, i, 0)[0],
  c: (c, i) => RESOLVE.core(c, i)[0],
  p: (p, i) => RESOLVE.portal(p, i)[0],
};

function sameNumber(a, b, tol = 0.001) {
  if (a === undefined || b === undefined) return false;
  return Math.abs(Number(a) - Number(b)) < tol;
}

function eq(a, b) {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (typeof a === 'number' || typeof b === 'number') return sameNumber(a, b);
  return String(a) === String(b);
}

// ---------------------------------------------------------------------------
// One rule per value the reissue screens display.

const RULES = [
  // --- flight identity and schedule ---------------------------------------
  { screen: 'Departure time', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => hhmm(pick(SEG.s(s, i), 'departureTime')),
    core: (c, i) => hhmm(pick(SEG.c(c, i), 'departureDateTime')),
    portal: (p, i) => hhmm(pick(SEG.p(p, i), 'departureDateTime')) },

  { screen: 'Arrival time', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => hhmm(pick(SEG.s(s, i), 'arrivalTime')),
    core: (c, i) => hhmm(pick(SEG.c(c, i), 'arrivalDateTime')),
    portal: (p, i) => hhmm(pick(SEG.p(p, i), 'arrivalDateTime')) },

  { screen: 'Departure date', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(SEG.s(s, i), 'departureDate'),
    core: (c, i) => ymd(pick(SEG.c(c, i), 'departureDateTime')),
    portal: (p, i) => ymd(pick(SEG.p(p, i), 'departureDateTime')) },

  { screen: 'Origin airport code', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(SEG.s(s, i), 'departureAirportCode'),
    core: (c, i) => pick(SEG.c(c, i), 'origin'),
    portal: (p, i) => pick(SEG.p(p, i), 'origin.airportCode') },

  { screen: 'Destination airport code', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(SEG.s(s, i), 'arrivalAirportCode'),
    core: (c, i) => pick(SEG.c(c, i), 'destination'),
    portal: (p, i) => pick(SEG.p(p, i), 'destination.airportCode') },

  { screen: 'Marketing flight number', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => { const v = pick(SEG.s(s, i), 'marketingFlightNumber'); return v == null ? undefined : String(v); },
    core: (c, i) => { const v = pick(SEG.c(c, i), 'marketingFlightNumber'); return v == null ? undefined : String(v); },
    portal: (p, i) => { const v = pick(SEG.p(p, i), 'marketingCarrier.flightNumber'); return v == null ? undefined : String(v); } },

  { screen: 'Marketing airline code', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(SEG.s(s, i), 'marketingAirlineCode'),
    core: (c, i) => pick(SEG.c(c, i), 'marketingCarrierCode'),
    portal: (p, i) => pick(SEG.p(p, i), 'marketingCarrier.code') },

  { screen: 'Operating airline code', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(SEG.s(s, i), 'operatingAirlineCode'),
    core: (c, i) => pick(SEG.c(c, i), 'operatingCarrierCode'),
    portal: (p, i) => pick(SEG.p(p, i), 'operatingCarrier.code') },

  { screen: 'Aircraft type', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(SEG.s(s, i), 'aircraftTypeCode'),
    core: (c, i) => pick(SEG.c(c, i), 'equipment'),
    portal: (p, i) => pick(SEG.p(p, i), 'equipment') },

  { screen: 'Flight duration (minutes)', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(SEG.s(s, i), 'durationInMinutes'),
    core: (c, i) => pick(SEG.c(c, i), 'flightTime'),
    portal: (p, i) => pick(SEG.p(p, i), 'flightTimeInMinutes') },

  { screen: 'Number of stops (journey 1)', origin: ORIGIN.DERIVED,
    supplier: (s, i) => { const n = RESOLVE.supplierJourney(s, i, 0).length; return n ? n - 1 : undefined; },
    core: (c, i) => pick(JOURNEY.core(c, i), 'numberOfStops'),
    portal: (p, i) => pick(JOURNEY.portal(p, i), 'numberOfStops'),
    derive: (ctx) => { const n = RESOLVE.supplierJourney(ctx.supplier, ctx.align ? ctx.align.supplier : ctx.i, 0).length; return n ? n - 1 : undefined; },
    note: 'Sabre sends no stop count; it is the flight count of that journey minus one. Counted PER JOURNEY — flattening a round trip across journeys is wrong.' },

  // --- fare presentation ---------------------------------------------------
  { screen: 'Fare brand name', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(OFFER.supplier(s, i), 'items[0].fares[0].fareComponents[0].brand.name'),
    core: (c) => pick(nth(c.priceClasses, 0), 'priceClassName'),
    portal: (p) => pick(nth(p.priceClasses, 0), 'priceClassName') },

  { screen: 'Booking class (RBD)', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(OFFER.supplier(s, i), 'items[0].fares[0].fareComponents[0].segmentDetails[0].bookingClassCode'),
    core: (c, i) => pick(OFFER.core(c, i), 'passengerFareBreakdown[0].segmentDetails[0].rbd'),
    portal: (p, i) => pick(OFFER.portal(p, i), 'passengerFareBreakdowns[0].segmentDetails[0].rbd') },

  { screen: 'Cabin', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(OFFER.supplier(s, i), 'items[0].fares[0].fareComponents[0].segmentDetails[0].cabinName'),
    core: (c, i) => pick(OFFER.core(c, i), 'passengerFareBreakdown[0].segmentDetails[0].cabinCode'),
    portal: (p, i) => pick(JOURNEY.portal(p, i), 'cabinClass'),
    note: 'Portal lifts cabin from fare level up to journey level' },

  // --- prices --------------------------------------------------------------
  { screen: 'Additional base fare', origin: ORIGIN.SUPPLIER, money: true,
    supplier: (s, i) => amount(pick(OFFER.supplier(s, i), 'totalPriceDifference.baseFare')),
    core: (c, i) => amount(pick(OFFER.core(c, i), 'modifyPrice.baseDifference')),
    portal: (p, i) => amount(pick(OFFER.portal(p, i), 'reissuePricing.additionalTotalBaseAmount')) },

  { screen: 'Additional taxes', origin: ORIGIN.SUPPLIER, money: true,
    supplier: (s, i) => amount(pick(OFFER.supplier(s, i), 'totalPriceDifference.totalTax')),
    core: (c, i) => amount(pick(OFFER.core(c, i), 'modifyPrice.taxDifference')),
    portal: (p, i) => amount(pick(OFFER.portal(p, i), 'reissuePricing.additionalTotalTaxesAndFeesAmount')) },

  { screen: 'Supplier fee / penalty', origin: ORIGIN.SUPPLIER, money: true,
    supplier: (s, i) => {
      const d = pick(OFFER.supplier(s, i), 'totalPriceDifference') || {};
      if (d.totalFee === undefined && d.totalTaxOnFee === undefined) return undefined;
      return (amount(d.totalFee) || 0) + (amount(d.totalTaxOnFee) || 0);
    },
    core: (c, i) => amount(pick(OFFER.core(c, i), 'modifyPrice.penalty')),
    portal: (p, i) => amount(pick(OFFER.portal(p, i), 'reissuePricing.supplierPenalty')),
    note: 'core penalty = totalFee + totalTaxOnFee; an absent part reads as 0' },

  { screen: 'Amount payable at core level', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => amount(pick(OFFER.supplier(s, i), 'totalPriceDifference.grandTotal')),
    core: (c, i) => amount(pick(OFFER.core(c, i), 'modifyPrice.totalPayable')),
    portal: () => undefined,
    skipPortal: true,
    note: 'The Portal total differs deliberately — it adds the change fee. Next rule checks that.' },

  { screen: 'DUE NOW (what the customer pays)', origin: ORIGIN.DERIVED, money: false,
    supplier: () => undefined,
    core: (c, i) => amount(pick(OFFER.core(c, i), 'modifyPrice.totalPayable')),
    portal: (p, i) => amount(pick(OFFER.portal(p, i), 'reissuePricing.totalPayable')),
    derive: (ctx) => {
      const base = amount(pick(OFFER.core(ctx.core, ctx.align ? ctx.align.core : ctx.i), 'modifyPrice.totalPayable'));
      const fee = amount(pick(OFFER.portal(ctx.portal, ctx.align ? ctx.align.portal : ctx.i), 'reissuePricing.changeFee'));
      if (base === undefined || fee === undefined) return undefined;
      // The change fee is stated in the UI currency and added AFTER conversion.
      return base * (ctx.rate || 1) + fee;
    },
    note: 'UI total must equal (core total x rate) plus the app change fee, stated in UI currency' },

  { screen: 'Exchange charge type', origin: ORIGIN.SUPPLIER,
    supplier: (s, i) => pick(OFFER.supplier(s, i), 'totalPriceDifference.type'),
    core: () => undefined,
    portal: () => undefined,
    skipPortal: true,
    note: 'Sabre states Add collect / Even / Refund outright; watch whether core republishes it' },

  // --- app-origin: Sabre sends nothing -------------------------------------
  { screen: 'Airline name', origin: ORIGIN.PORTAL,
    supplier: () => undefined, core: () => undefined,
    portal: (p, i) => pick(SEG.p(p, i), 'operatingCarrier.name') },

  { screen: 'Origin airport name', origin: ORIGIN.PORTAL,
    supplier: () => undefined, core: () => undefined,
    portal: (p, i) => pick(SEG.p(p, i), 'origin.airportName') },

  { screen: 'Origin city name', origin: ORIGIN.PORTAL,
    supplier: () => undefined, core: () => undefined,
    portal: (p, i) => pick(SEG.p(p, i), 'origin.cityName') },

  { screen: 'Destination airport name', origin: ORIGIN.PORTAL,
    supplier: () => undefined, core: () => undefined,
    portal: (p, i) => pick(SEG.p(p, i), 'destination.airportName') },

  { screen: 'Destination city name', origin: ORIGIN.PORTAL,
    supplier: () => undefined, core: () => undefined,
    portal: (p, i) => pick(SEG.p(p, i), 'destination.cityName') },

  { screen: 'Change fee', origin: ORIGIN.PORTAL,
    supplier: () => undefined, core: () => undefined,
    portal: (p, i) => amount(pick(OFFER.portal(p, i), 'reissuePricing.changeFee')),
    note: 'App-origin by design — confirmed by the user, 2026-09-28' },

  { screen: 'Supplier badge text', origin: ORIGIN.PORTAL,
    supplier: () => undefined, core: () => undefined,
    portal: (p, i) => pick(OFFER.portal(p, i), 'properties.refundableInfo'),
    note: 'Read from a field named for refundability' },

  // --- counts --------------------------------------------------------------
  // Offer COUNT is deliberately not a pass/fail rule. Each layer's payload comes from its own call
  // to Sabre, and Sabre returns a different selection of combinations per call, so the counts may
  // legitimately differ. Reported for information only.
  { screen: 'Number of offers (informational)', origin: ORIGIN.DERIVED,
    supplier: (s) => (s.numberOfOffers != null ? s.numberOfOffers : (s.offers || []).length),
    core: (c) => (c.offers || []).length,
    portal: (p) => Object.keys(p.offers || {}).length,
    derive: (ctx) => Object.keys(ctx.portal.offers || {}).length,
    note: 'Counts come from independent calls; a difference is not a defect' },
];

// ---------------------------------------------------------------------------

function evaluate(rule, ctx) {
  const ix = ctx.align || { supplier: ctx.i || 0, core: ctx.i || 0, portal: ctx.i || 0 };
  const sup = rule.supplier(ctx.supplier, ix.supplier);
  const core = ix.core === null ? undefined : rule.core(ctx.core, ix.core);
  let por = ix.portal === null ? undefined : rule.portal(ctx.portal, ix.portal);

  // The UI may present a different currency from the supplier. The agency's rate is a MULTIPLIER
  // applied to the supplier amount, so divide the UI value back before comparing. Money rules only
  // — codes, times and names are never converted.
  if (ctx.rate && ctx.rate !== 1 && rule.money && typeof por === 'number') {
    por /= ctx.rate;
  }

  let status;
  let detail;

  if (rule.origin === ORIGIN.PORTAL) {
    if (sup !== undefined || core !== undefined) {
      status = 'FAIL';
      detail = `declared app-origin, but a supplier/core value is present (supplier=${sup} core=${core})`;
    } else if (por === undefined) {
      status = 'ABSENT';
      detail = 'not present at the Portal either';
    } else {
      status = 'PORTAL';
      detail = 'no supplier source — provided by the app, as declared';
    }
  } else if (rule.origin === ORIGIN.DERIVED) {
    const expected = rule.derive(Object.assign({}, ctx, { i: ix.core !== null ? ix.core : ctx.i }));
    const target = rule.skipPortal ? core : por;
    status = eq(expected, target) ? 'PASS' : 'FAIL';
    detail = status === 'PASS'
      ? `matches the stated calculation (${expected})`
      : `expected ${expected}, found ${target}`;
  } else {
    const chain = rule.skipPortal ? [sup, core] : [sup, core, por];
    if (chain.some((v) => v === undefined)) {
      status = 'MISSING';
      detail = `supplier=${sup} core=${core} portal=${por}`;
    } else if (chain.every((v) => eq(v, chain[0]))) {
      status = 'PASS';
      detail = 'carried unchanged from the supplier';
    } else {
      status = 'FAIL';
      detail = `supplier=${sup} core=${core} portal=${por}`;
    }
  }
  return { screen: rule.screen, origin: rule.origin, supplier: sup, core, portal: por, status, detail, note: rule.note };
}

function render(label, results, align, rate) {
  const c = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const head = align
    ? [`**Aligned on itinerary \`${align.signature}\`** — supplier offer ${align.supplier}, `
      + `core offer ${align.core === null ? 'NOT PRESENT' : align.core}, `
      + `Portal offer ${align.portal === null ? 'NOT PRESENT' : align.portal}. `
      + 'Offers are matched by flight signature, never by index: each layer calls Sabre separately '
      + 'and Sabre returns a different selection of combinations per call.', '']
    : [];
  return [
    `# Supplier-to-screen chain — ${label}`, '', ...head,
    ...(rate && rate !== 1 ? [`**Currency:** the UI presents a converted currency at rate **${rate}** `
      + '(multiplier on the supplier amount). Money values are divided back before comparison; the '
      + 'change fee is stated in the UI currency and added after conversion.', ''] : []),
    '| Screen value | Expected origin | Sabre | core service | Portal | Result |',
    '|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.screen} | ${r.origin} | ${r.supplier ?? '—'} | ${r.core ?? '—'} | ${r.portal ?? '—'} | **${r.status}** — ${r.detail} |`),
    '',
    `**${c.PASS || 0} carried correctly from the supplier · ${c.PORTAL || 0} provided by the app · `
    + `${c.FAIL || 0} wrong · ${c.MISSING || 0} missing · ${c.ABSENT || 0} absent**`,
    '',
    ...results.filter((r) => r.note).map((r) => `- _${r.screen}_: ${r.note}`),
    '',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const manifestPath = get('--manifest');
  if (!manifestPath) {
    console.error('Usage: compare_chain.js --manifest capture.json [--json] [--md out.md]');
    process.exit(1);
  }
  const base = path.dirname(path.resolve(manifestPath));
  const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const load = (f) => JSON.parse(fs.readFileSync(path.resolve(base, f), 'utf8'));

  const ctx = {
    supplier: load(man.supplier),
    core: load(man.core),
    portal: load(man.portal),
    i: man.offerIndex || 0,
    rate: man.rate || 1,
  };
  ctx.align = alignOffers(ctx, ctx.i);
  const results = RULES.map((r) => evaluate(r, ctx));
  const bad = results.filter((r) => r.status === 'FAIL' || r.status === 'MISSING');

  if (args.includes('--json')) {
    console.log(JSON.stringify({ label: man.label, results }, null, 2));
  } else {
    const md = render(man.label || 'capture', results, ctx.align, ctx.rate);
    const out = get('--md');
    if (out) { fs.writeFileSync(out, md); }
    console.log(md);
    if (out) console.log(`written -> ${out}`);
  }
  process.exit(bad.length ? 2 : 0);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('ERROR', e.message); process.exit(1); }
}

module.exports = { RULES, evaluate, render, pick, nth, amount, hhmm, ymd, RESOLVE, OFFER, JOURNEY, ORIGIN };
