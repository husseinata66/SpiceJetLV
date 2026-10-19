'use strict';
// Ancillaries — Admin adapter: identical to the Portal from flight search through the e-ticket (same
// components, same markup — proven live 2026-10-19), plus Branch → Agency → Agent entry at the top of
// flight search. The three search functions are the only ones that differ: each is wrapped with
// `s.entryHook`, which `portal.js` already calls right after `goto` (Admin's dropdowns come first and
// shift every textbox index, so the airport fields are typed into by keyboard focus there instead).
// Everything else — passengers, bundles, seat map, meals, baggage — is untouched Portal code.

const portal = require('./portal');
const adminPost = require('./admin_post');

const withEntry = (fn) => (page, baseUrl, s, ...rest) => fn(page, baseUrl, { ...s, entryHook: (p) => adminPost.selectEntry(p, s.admin) }, ...rest);

module.exports = {
  ...portal,
  search: withEntry(portal.search),
  searchRoundTrip: withEntry(portal.searchRoundTrip),
  searchMultiCity: withEntry(portal.searchMultiCity),
};
