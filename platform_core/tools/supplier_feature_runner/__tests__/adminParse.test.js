'use strict';
// The Ancillaries runner's Admin parsers, against page text captured from the real Admin (OmanAir, 2026-10-19).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { parsePnrQuery, parseWalletHistory, totals } = require(path.resolve(__dirname, '../../../../platform_core_data/supplier-features/ancillaries/runner/admin_parse'));

const PNR_QUERY = 'Look up a PNR and review its history. Search * Search About : Itinerary Details Agency Information Get Itinerary Details By : PNR Ticket No. Booking Ref. Search NDCEG-BR-F261019j04FrK Lock Lock Info Locked: No Last Locked By: N/A Last Locked Date: N/A Blocked: No Agency User Info Agency Id: AGN9809 Agency Name: Uplift2_Mohanad Dawood Branch Name: Uplift2_Mohanad Dawood Booked By: Mohanad Dawood Country: Egypt State: Cairo City: Badr PassCode: 4336 Agency Owner Phone +20-1068937373 Agency Owner Email mohanad.dawood@tildetech.ae Payment Info Agency wallet: 676,349.2 Credit Limit: 100,000 Mode Of Payment: Wallet Outstanding Balance: 0 Payment Date: 2026-10-19 19:18:10.0 Payment Status: Payment Settled Pending Deposit Amount: 3,000 Amount Received: 14,817.8 Refunded Amount: 0 Flight Info Flight Id: 1678713 Route: CAI-MCT-JED Supplier: OmanAirNdc Supplier Credential: N/A Supplier Currency: N/A Supplier Payment Method: Cash Trip Type: One Way '
  + 'Booking Info Order Id: AGN9809UPLUPLORD261019U4U5WC Status: Booked NDC Reference: NDCEG-BR-F261019j04FrK Booking Type: NDC Reservation Branch On The Fly Markup: 0 Agency Markup: 0 Agent Markup: 0 Date Of Booking: 2026-10-19 19:18:10.0 Invoice Number: INVNDC2610193U4aUy Total Passenger: 1 Flight Legs 2 leg(s) Origin Destination Airline Booking Class Departure Datetime Arrival Datetime CAI MCT Oman Air E 2026-10-24 18:50:00.0 2026-10-24 23:45:00.0 MCT JED Oman Air E 2026-10-25 01:35:00.0 2026-10-25 04:10:00.0 Ancillaries 1 journey(s) CAI JED Journey 1 1 passenger(s) M Mohanad Dawood Adult CAI MCT Journey 1 · leg 1 Seat Selection Seat assigned for this segment Seat 20B 906 EGP AvailablePaid — (Chargeable seat, Overwing seat(s), Seat designated for RBD "F", Left side of aircraft, Center seat (not window, not aisle), Front of cabin class/compartment) Passenger List 1 passenger(s) Select Name Type Ticket Number Travel Date Booking Status Refund Status Cabin Class Discount Net Basic Gross Basic Tax Profit Total Total Sales Amount GDS Ref. Check-in Baggage Supplier Commission Mohanad Dawood Lead Passenger Adult 91022013764205 2026-10-24 00:00:00.0 Booked N/A Economy 0 8510 8510 5401.8 0 14817.8 14817.8 2ZOQZZ Category: Checked | Description: CHECKED ALLOWANCE | Pieces: 20 KG 0 Void Reissue Refund Comments Agent Comment Add comment';

test('PNR Query: booking, payment, flight and agency facts', () => {
  const p = parsePnrQuery(PNR_QUERY);
  assert.equal(p.found, true);
  assert.equal(p.booking.orderId, 'AGN9809UPLUPLORD261019U4U5WC');
  assert.equal(p.booking.status, 'Booked');
  assert.equal(p.booking.ref, 'NDCEG-BR-F261019j04FrK');
  assert.equal(p.booking.invoice, 'INVNDC2610193U4aUy');
  assert.deepEqual(p.booking.markups, { branch: 0, agency: 0, agent: 0 });
  assert.equal(p.payment.wallet, 676349.2);
  assert.equal(p.payment.status, 'Payment Settled');
  assert.equal(p.payment.received, 14817.8);
  assert.equal(p.payment.refunded, 0);
  assert.equal(p.flight.route, 'CAI-MCT-JED');
  assert.equal(p.flight.supplier, 'OmanAirNdc');
  assert.equal(p.agency.id, 'AGN9809');
  assert.equal(p.lock.locked, 'No');
});

test('PNR Query: legs, the journey with its legs, and the passenger row', () => {
  const p = parsePnrQuery(PNR_QUERY);
  assert.deepEqual(p.legs.map((l) => `${l.from}-${l.to}`), ['CAI-MCT', 'MCT-JED']);
  assert.equal(p.journeys.length, 1);
  assert.deepEqual(p.journeys[0].flights, [{ from: 'CAI', to: 'MCT' }]); // only leg 1 carries an ancillary here
  assert.match(p.journeys[0].anc, /Mohanad Dawood Adult CAI MCT Seat Selection .*Seat 20B 906 EGP/);
  assert.equal(p.passengers.length, 1);
  assert.deepEqual(
    (({ name, type, ticket, status, total, sales, pnr }) => ({ name, type, ticket, status, total, sales, pnr }))(p.passengers[0]),
    { name: 'Mohanad Dawood', type: 'Adult', ticket: '91022013764205', status: 'Booked', total: 14817.8, sales: 14817.8, pnr: '2ZOQZZ' },
  );
  assert.equal(p.ssrAmount, 906);
  assert.deepEqual(totals(p), { total: 14817.8, sales: 14817.8, net: 13911.8, ssr: 906 });
});

test('PNR Query: nothing found', () => {
  assert.equal(parsePnrQuery('Search No data has been found! Nothing matched that query. No booking details found for the given search query').found, false);
});

test('Wallet History: the last End Balance is the closing wallet', () => {
  const t = 'AGN9809UPLUPLORD261019UAV5U6 NDCEG-TR261019zlp1pX Oct 19, 2026 F_Flight 13,911.8 0 EGP AGN9809 AGN9809UPLUPLORD261019U4U5WC NDCEG-TR261019zQQuNh Oct 19, 2026 F_Flight 14,817.8 0 EGP AGN9809 N/A N/A N/A End Balance 0 676,349.2 N/A Showing 10 results of 10 results';
  assert.equal(parseWalletHistory(t), 676349.2);
  assert.equal(parseWalletHistory('no balance here'), null);
});
