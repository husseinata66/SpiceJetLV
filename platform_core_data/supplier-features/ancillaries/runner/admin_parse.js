'use strict';
// Pure text parsers for the Admin application's pages (no browser). Written from the real page text of an OmanAir
// booking read on 2026-10-19 (see __tests__/adminParse.test.js in the runner tool). Admin has no My Bookings and
// no booking-details page: a booking's details live on PNR Query (looked up by PNR, Ticket No. or Booking Ref.).

const num = (t) => (t == null ? null : Number(String(t).replace(/,/g, '')));
const first = (t, re) => { const m = String(t).match(re); return m ? m[1].trim() : null; };

/** PNR Query result text → everything the Admin shows about one booking. */
function parsePnrQuery(t) {
  t = String(t).replace(/\s+/g, ' ');
  const legsAt = t.indexOf('Flight Legs');
  const ancAt = t.indexOf('Ancillaries', legsAt < 0 ? 0 : legsAt);
  const paxAt = t.indexOf('Passenger List', ancAt < 0 ? 0 : ancAt);
  const legsText = legsAt >= 0 ? t.slice(legsAt, ancAt > legsAt ? ancAt : undefined) : '';
  const ancText = ancAt >= 0 ? t.slice(ancAt, paxAt > ancAt ? paxAt : undefined) : '';
  const paxText = paxAt >= 0 ? t.slice(paxAt) : '';

  const legs = [...legsText.matchAll(/\b([A-Z]{3}) ([A-Z]{3}) (.+?) ([A-Z]{1,2}) (\d{4}-\d{2}-\d{2} [\d:.]+) (\d{4}-\d{2}-\d{2} [\d:.]+)/g)]
    .map((m) => ({ from: m[1], to: m[2], airline: m[3], bookingClass: m[4], departs: m[5], arrives: m[6] }));

  // Rows start after the header row (its last column is "Supplier Commission"); a name word is Title-case, so a
  // baggage description's "KG"/"PC" ahead of the next row is never taken for a name.
  const hdrEnd = paxText.search(/Supplier Commission /);
  const rowsText = hdrEnd >= 0 ? paxText.slice(hdrEnd + 'Supplier Commission '.length) : paxText;
  const passengers = [...rowsText.matchAll(/([A-Z][a-z'][A-Za-z.'-]*(?: [A-Z][a-z'][A-Za-z.'-]*)+?) (?:Lead Passenger )?(Adult|Child|Infant) (?:(\d{10,}|N\/A|-) )?(\d{4}-\d{2}-\d{2}) [\d:.]+ ([A-Za-z ]+?) ([A-Za-z\/]+) (Economy|Business|First|Premium Economy) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) (\w{5,8})/g)]
    .map((m) => ({ name: m[1], type: m[2], ticket: /^\d/.test(m[3] || '') ? m[3] : null, travelDate: m[4], status: m[5].trim(), refund: m[6], cabin: m[7], discount: num(m[8]), net: num(m[9]), gross: num(m[10]), tax: num(m[11]), profit: num(m[12]), total: num(m[13]), sales: num(m[14]), pnr: m[15] }));

  // Ancillaries: "CAI JED Journey 1 1 passenger(s) M Mohanad Dawood Adult CAI MCT Journey 1 · leg 1 Seat Selection … Seat 20B 906 EGP …"
  const heads = [...ancText.matchAll(/([A-Z]{3}) ([A-Z]{3}) Journey (\d+) (\d+) passenger\(s\)/g)];
  const journeys = heads.map((h, i) => {
    const body = ancText.slice(h.index + h[0].length, i + 1 < heads.length ? heads[i + 1].index : undefined);
    const labels = [...body.matchAll(/([A-Z]{3}) ([A-Z]{3}) Journey \d+ · leg \d+/g)];
    const seen = new Set(); const flights = [];
    for (const l of labels) { const k = `${l[1]}-${l[2]}`; if (!seen.has(k)) { seen.add(k); flights.push({ from: l[1], to: l[2] }); } }
    if (!flights.length) flights.push({ from: h[1], to: h[2] });
    // Same shape the Portal's itinerary uses: the leg label is just "<FROM> <TO> ".
    const anc = body.replace(/([A-Z]{3}) ([A-Z]{3}) Journey \d+ · leg \d+ /g, '$1 $2 ').trim();
    return { n: Number(h[3]), from: h[1], to: h[2], flights, anc };
  });
  const ssr = [...ancText.matchAll(/(?:Seat \d+[A-Z]|[A-Z]{4}\b[^0-9]{0,40}?|\d+ ?Kg[^0-9]{0,30}?)\s*([\d,.]+) EGP/gi)].reduce((a, m) => a + num(m[1]), 0);

  return {
    lock: { locked: first(t, /Locked: (Yes|No)/), lastLockedBy: first(t, /Last Locked By: (\S+)/), blocked: first(t, /Blocked: (Yes|No)/) },
    agency: { id: first(t, /Agency Id: (\S+)/), name: first(t, /Agency Name: (.*?) Branch Name:/), branch: first(t, /Branch Name: (.*?) Booked By:/), bookedBy: first(t, /Booked By: (.*?) Country:/) },
    payment: {
      wallet: num(first(t, /Agency wallet: ([\d,.]+)/)), creditLimit: num(first(t, /Credit Limit: ([\d,.]+)/)), mode: first(t, /Mode Of Payment: (\w+)/),
      outstanding: num(first(t, /Outstanding Balance: ([\d,.]+)/)), date: first(t, /Payment Date: (\d{4}-\d{2}-\d{2} [\d:.]+)/),
      status: first(t, /Payment Status: (.*?) Pending Deposit/), received: num(first(t, /Amount Received: ([\d,.]+)/)), refunded: num(first(t, /Refunded Amount: ([\d,.]+)/)),
    },
    flight: { id: first(t, /Flight Id: (\d+)/), route: first(t, /Route: (\S+)/), supplier: first(t, /Supplier: (\S+)/), tripType: first(t, /Trip Type: (.*?) Booking Info/) },
    booking: {
      orderId: first(t, /Order Id: (\S+)/), status: first(t, /Booking Info Order Id: \S+ Status: (.*?) NDC Reference/), ref: first(t, /NDC Reference: (\S+)/), type: first(t, /Booking Type: (.*?) Branch On The Fly Markup/),
      markups: { branch: num(first(t, /Branch On The Fly Markup: ([\d.]+)/)), agency: num(first(t, /Agency Markup: ([\d.]+)/)), agent: num(first(t, /Agent Markup: ([\d.]+)/)) },
      date: first(t, /Date Of Booking: (\d{4}-\d{2}-\d{2} [\d:.]+)/), invoice: first(t, /Invoice Number: (\S+)/), passengers: num(first(t, /Total Passenger: (\d+)/)),
    },
    legs, journeys, passengers, ssrAmount: ssr,
    found: !/No booking details found|No data has been found/i.test(t) && !!first(t, /Order Id: (\S+)/),
  };
}

/** Wallet History: the closing balance. Row text ends "End Balance <credit> <balance>". The last one wins. */
function parseWalletHistory(t) {
  const all = [...String(t).matchAll(/End Balance ([\d,.]+) ([\d,.]+)/g)];
  return all.length ? num(all[all.length - 1][2]) : null;
}

/** Order-level numbers the post-booking checks need, from a parsed PNR Query. */
function totals(p) {
  const pax = p.passengers || [];
  const sum = (k) => pax.reduce((a, x) => a + (x[k] || 0), 0);
  return { total: sum('total'), sales: sum('sales'), net: sum('net') + sum('tax'), ssr: p.ssrAmount };
}

module.exports = { num, parsePnrQuery, parseWalletHistory, totals };
