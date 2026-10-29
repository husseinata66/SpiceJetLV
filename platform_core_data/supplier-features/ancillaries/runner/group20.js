'use strict';
// Ancillaries — Setup Group 20: leg space seat rule at Book (adult holding an infant on a leg space seat).
// Supplier rule no-leg-space-seat-inf — see legbook.js. ASSISTED: the human presses the button.
module.exports = require('./legbook').makeGroup({ id: '20', who: 'infant', mode: 'book', caseId: 'TC-SM-LEG-003' });
