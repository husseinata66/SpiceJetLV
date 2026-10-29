'use strict';
// Ancillaries — Setup Group 22: leg space seat rule at Hold (adult holding an infant on a leg space seat).
// Supplier rule no-leg-space-seat-inf — see legbook.js. ASSISTED: the human presses the button.
module.exports = require('./legbook').makeGroup({ id: '22', who: 'infant', mode: 'hold', caseId: 'TC-SM-LEG-005' });
