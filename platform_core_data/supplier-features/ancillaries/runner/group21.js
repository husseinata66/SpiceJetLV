'use strict';
// Ancillaries — Setup Group 21: a child MAY have a leg space seat (human decision 2026-10-28) — Book must Confirm and charge.
// Supplier rule no-leg-space-seat-inf — see legbook.js. ASSISTED: the human presses the button.
module.exports = require('./legbook').makeGroup({ id: '21', who: 'child', mode: 'book', caseId: 'TC-SM-LEG-004' });
