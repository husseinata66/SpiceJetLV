'use strict';
// Ancillaries — runner module for platform_core/tools/supplier_feature_runner.
//
// Written once, used by every Ancillaries Supplier run: the run's Capability Plan decides which
// cases run for that Supplier, and the checks branch on its capabilities — never on its name.
// Groups 14–17 complete, hold or pay real bookings: manual by human decision (2026-10-18), so the
// runner never contains them. Global rules: ../context/ExecutionFlow_HappyPath.md §15–§16.

const portal = require('./portal');
const admin = require('./admin');

const isPortalLoggedIn = async (page) => !/login|signin|auth/i.test(page.url())
  && (await page.getByText(/^\s*welcome\s*$/i).count()) > 0;
// Same "welcome" check as the Portal (proven live, 2026-10-19) — Admin has no /dashboard redirect quirk
// otherwise worth separating this for.
const isAdminLoggedIn = isPortalLoggedIn;

module.exports = {
  feature: 'ancillaries',

  // One adapter per application. The group checks are shared; only login, entry (Branch → Agency →
  // Agent for Admin) and a few read-only reports (admin_post.js) differ.
  apps: {
    Portal: { startPath: '/booking/flight-search', isLoggedIn: isPortalLoggedIn, ui: portal },
    Admin: { startPath: '/booking/flight-search', isLoggedIn: isAdminLoggedIn, ui: admin },
  },

  // The runner never books, holds or pays. Allowed look-alikes: "Book Flight" opens the booking form,
  // and "Book 6A for <name>" picks a seat on the map. Neither creates a booking.
  actionGuard: {
    forbid: [/^(book|hold|pay|issue)\b/i, /^save quote\b/i, /^confirm (and )?(book|pay|hold)/i],
    allow: [/^book flight\b/i, /^book \d+[a-z] for \S/i],
  },

  // Groups 14–16 book: they are ASSISTED (`assisted: 'Book'` in each) — the runner builds the booking up to
  // Book, stops, and the HUMAN presses Book in the window (human decision, 2026-10-19); the guard lets only
  // that one button through while the runner waits idle. Group 17 (hold, then pay) is assisted too, with two stops.
  manualGroups: {},

  groups: {
    '01': require('./group01'),
    '02': require('./group02'),
    '03': require('./group03'),
    '04': require('./group04'),
    '05': require('./group05'),
    '06': require('./group06'),
    '07': require('./group07'),
    '08': require('./group08'),
    '09': require('./group09'),
    '10': require('./group10'),
    '11': require('./group11'),
    '12': require('./group12'),
    '13': require('./group13'),
    '14': require('./group14'),
    '15': require('./group15'),
    '16': require('./group16'),
    '17': require('./group17'),
  },

  validateSettings(s) {
    const missing = ['from', 'to', 'daysFromToday', 'savedPassengerSearch'].filter((k) => !s[k] || /^</.test(String(s[k])));
    for (const k of ['adults', 'children', 'infants']) {
      if (!s.profiles || !Array.isArray(s.profiles[k]) || !s.profiles[k][0] || /^</.test(s.profiles[k][0])) missing.push(`profiles.${k}`);
    }
    if (missing.length) throw new Error(`settings.local.json is missing ${missing.join(', ')}.`);
  },
};
