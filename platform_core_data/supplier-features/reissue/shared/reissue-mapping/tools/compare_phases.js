#!/usr/bin/env node
// Reissue — phase-to-phase consistency check.
//
// Does the flight the agent picked survive unchanged across the three screens?
//
//     1 Choose Replacement Flights  ->  2 Review and Pay  ->  3 Confirmation
//
// The supplier chain is checked separately by compare_chain.js. This asks a different question:
// forget the supplier — does the APPLICATION contradict itself between one screen and the next?
//
// Offers are matched by flight signature, never by index. The offer the agent actually selected is
// identified from the /review response's `newOffer`, then located in the /search response by the
// same signature. Every segment of every journey is compared, not just the first.
//
// Usage:
//   node compare_phases.js --search s.json --review r.json [--confirm c.json] [--label "..."]
//
// Exit: 0 consistent · 2 a value changed between phases · 1 error

'use strict';

const fs = require('fs');

// --- phase 1 / 2 shape: offers -> journeyReferenceIds -> journeys -> segmentReferenceIds -> segments
function segmentsOf(doc, offerKey) {
  const offer = doc.offers[offerKey];
  if (!offer) return [];
  return (offer.journeyReferenceIds || [])
    .map((j) => doc.journeys[j]).filter(Boolean)
    .flatMap((j) => (j.segmentReferenceIds || []).map((s) => doc.segments[s]))
    .filter(Boolean);
}

const sigOf = (segs) => segs.map((s) => s.marketingCarrier.code + s.marketingCarrier.flightNumber).join('-');

/** Normalise a phase-1/2 segment to the common shape. */
const norm12 = (s) => ({
  carrier: s.marketingCarrier.code,
  flightNumber: String(s.marketingCarrier.flightNumber),
  airlineName: s.operatingCarrier && s.operatingCarrier.name,
  originCode: s.origin.airportCode,
  originAirport: s.origin.airportName,
  originCity: s.origin.cityName,
  destCode: s.destination.airportCode,
  destAirport: s.destination.airportName,
  destCity: s.destination.cityName,
  departureDate: String(s.departureDateTime || '').slice(0, 10),
  departureTime: String(s.departureDateTime || '').slice(11, 16),
  arrivalDate: String(s.arrivalDateTime || '').slice(0, 10),
  arrivalTime: String(s.arrivalDateTime || '').slice(11, 16),
  equipment: s.equipment,
  durationMin: s.flightTimeInMinutes,
  departureTerminal: s.departureTerminal,
  arrivalTerminal: s.arrivalTerminal,
});

/** Normalise a phase-3 (confirmation) segment to the same shape. */
const norm3 = (s) => ({
  carrier: s.airlineCode,
  flightNumber: String(s.flightNo),
  airlineName: s.airlineName,
  originCode: s.origin && s.origin.airPortCode,
  originAirport: s.origin && s.origin.airPortName,
  originCity: s.origin && s.origin.cityName,
  destCode: s.destination && s.destination.airPortCode,
  destAirport: s.destination && s.destination.airPortName,
  destCity: s.destination && s.destination.cityName,
  departureDate: String(s.departureDateTime || '').slice(0, 10),
  departureTime: String(s.departureDateTime || '').slice(11, 16),
  arrivalDate: String(s.arrivalDateTime || '').slice(0, 10),
  arrivalTime: String(s.arrivalDateTime || '').slice(11, 16),
  equipment: s.equipment,
  // confirmation states duration as text ("2h 10m"); convert so it compares like for like
  durationMin: (() => {
    const m = String(s.flightDuration || '').match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
    return m ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) || undefined : undefined;
  })(),
  departureTerminal: s.deptTerminal === '' ? null : s.deptTerminal,
  arrivalTerminal: s.arrTerminal === '' ? null : s.arrTerminal,
});

function confirmSegments(doc) {
  const root = doc.data || doc;
  return (root.journeyInfoList || []).flatMap((j) => j.segmentList || []).map(norm3);
}

const FIELDS = [
  'carrier', 'flightNumber', 'airlineName',
  'originCode', 'originAirport', 'originCity',
  'destCode', 'destAirport', 'destCity',
  'departureDate', 'departureTime', 'arrivalDate', 'arrivalTime',
  'equipment', 'durationMin', 'departureTerminal', 'arrivalTerminal',
];

const show = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

function main() {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const searchPath = get('--search');
  const reviewPath = get('--review');
  const confirmPath = get('--confirm');
  const label = get('--label') || 'capture';
  if (!searchPath || !reviewPath) {
    console.error('Usage: compare_phases.js --search s.json --review r.json [--confirm c.json] [--label "..."]');
    process.exit(1);
  }

  const S = JSON.parse(fs.readFileSync(searchPath, 'utf8'));
  const R = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  const C = confirmPath ? JSON.parse(fs.readFileSync(confirmPath, 'utf8')) : null;

  // Phase 2 is the reference: it holds the offer the agent actually selected.
  const newOffer = R.newOffer;
  if (!newOffer || !newOffer.offers) { console.error('review payload has no newOffer'); process.exit(1); }
  const rKey = Object.keys(newOffer.offers)[0];
  const rSegs = segmentsOf(newOffer, rKey);
  const signature = sigOf(rSegs);

  // Find the same itinerary in phase 1.
  let sSegs = null;
  for (const k of Object.keys(S.offers || {})) {
    const segs = segmentsOf(S, k);
    if (sigOf(segs) === signature) { sSegs = segs; break; }
  }

  const cSegs = C ? confirmSegments(C) : null;

  console.log(`\n# Phase consistency — ${label}`);
  console.log(`\n**Itinerary \`${signature}\`** · ${rSegs.length} segment(s)`);
  if (!sSegs) console.log('\n> Phase 1 does not contain this itinerary — that search response is from a different call.');
  if (C && (!cSegs || !cSegs.length)) console.log('\n> Phase 3 carries no segments (a failed exchange records none).');

  let diffs = 0, compared = 0;
  for (let i = 0; i < rSegs.length; i += 1) {
    const p1 = sSegs ? norm12(sSegs[i]) : null;
    const p2 = norm12(rSegs[i]);
    const p3 = cSegs && cSegs[i] ? cSegs[i] : null;
    console.log(`\n## Segment ${i + 1}\n`);
    console.log('| field | 1 Choose Flights | 2 Review and Pay | 3 Confirmation | |');
    console.log('|---|---|---|---|---|');
    for (const f of FIELDS) {
      const a = p1 ? show(p1[f]) : 'n/a';
      const b = show(p2[f]);
      const c = p3 ? show(p3[f]) : 'n/a';
      const present = [a, b, c].filter((x) => x !== 'n/a');
      const ok = present.every((x) => x === present[0]);
      if (present.length > 1) { compared += 1; if (!ok) diffs += 1; }
      console.log(`| ${f} | ${a} | ${b} | ${c} | ${present.length > 1 ? (ok ? 'OK' : '**DIFF**') : '—'} |`);
    }
  }

  console.log(`\n**${compared} comparisons · ${diffs} difference(s)**\n`);
  process.exit(diffs ? 2 : 0);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('ERROR', e.message); process.exit(1); }
}

module.exports = { segmentsOf, norm12, norm3, confirmSegments, FIELDS };
