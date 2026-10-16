// Unified execution status mapping (Phase 8) — one vocabulary for telemetry and execution history.
//
// WHY THIS EXISTS
// Observability's TEST_EXECUTION_RESULT events used a 5-value vocabulary (Passed, Failed, Skipped,
// Blocked, Inconclusive). Execution History uses the canonical model (run_manager/testStatus.js): 17
// statuses, each with a health CATEGORY. This module is the single mapping between them. It introduces
// no status of its own and no second opinion about one — the canonical model is authoritative.
//
// THE RULES
//   - A canonical status maps to itself.
//   - A LEGACY telemetry `Failed` stays `Failed`, flagged `unclassified`: the old vocabulary could not say
//     whether the application or the automation failed, so it is reported as an unclassified failure,
//     never silently promoted to "Application Failure".
//   - Anything not recognized is `Unrecognized` (category `unverified`) — kept as written, never Passed.
//   - Nothing is ever mapped TO Passed except Passed (and its exact synonyms, PASS / PASSED / OK).

const { STATUSES, normalizeStatus, categoryOf } = require('../run_manager/testStatus');

/** The statuses the original telemetry vocabulary had. */
const LEGACY_TELEMETRY_STATUSES = Object.freeze(['Passed', 'Failed', 'Skipped', 'Blocked', 'Inconclusive']);

/**
 * Where each category is counted. `health` names the dimension it counts against; `denominator` says
 * whether it is part of "executed" (the denominator of application / automation / environment health).
 */
const CATEGORY_TREATMENT = Object.freeze({
  pass: { label: 'Passed', health: 'none (a verified pass)', executed: true, countsAsPass: true },
  'pass-unstable': { label: 'Passed, but not consistently', health: 'automation', executed: true, countsAsPass: false },
  'pass-repaired': { label: 'Passed only after a Stage 5H repair', health: 'automation', executed: true, countsAsPass: false },
  'app-failure': { label: 'Application defect', health: 'application', executed: true, countsAsPass: false },
  'auto-failure': { label: 'Automation defect', health: 'automation', executed: true, countsAsPass: false },
  'env-failure': { label: 'Environment / infrastructure / configuration', health: 'environment', executed: true, countsAsPass: false },
  'not-run': { label: 'Not executed, with a stated reason', health: 'coverage', executed: false, countsAsPass: false },
  'not-applicable': { label: 'Outside executable scope (reported, never in a denominator)', health: 'coverage', executed: false, countsAsPass: false },
  unverified: { label: 'A result that cannot be trusted as a pass', health: 'coverage', executed: true, countsAsPass: false },
});

/**
 * Maps one recorded status to the canonical model.
 * @param {string} raw
 * @param {{source?: 'history'|'telemetry'}} [opts]
 * @returns {{status: string, category: string, raw: string, recognized: boolean, unclassified: boolean, reason: string|null}}
 */
function mapStatus(raw, { source = 'history' } = {}) {
  const n = normalizeStatus(raw);
  const status = n.status;
  return {
    status,
    category: categoryOf(status),
    raw: n.raw,
    recognized: n.recognized,
    // The legacy telemetry vocabulary had one "Failed" for every kind of failure.
    unclassified: source === 'telemetry' && status === 'Failed',
    reason: n.reason,
  };
}

/** The full table: every canonical status, its category and how it is counted. */
function statusTable() {
  return Object.entries(STATUSES).map(([status, s]) => ({
    status, category: s.category, meaning: s.meaning, ...CATEGORY_TREATMENT[s.category],
    legacyTelemetry: LEGACY_TELEMETRY_STATUSES.includes(status),
  }));
}

/**
 * Counts per canonical status → counts per category. A status the model does not define is counted as
 * `unverified`, never as a pass.
 */
function categoryCounts(counts) {
  const out = Object.fromEntries(Object.keys(CATEGORY_TREATMENT).map((c) => [c, 0]));
  for (const [s, n] of Object.entries(counts || {})) out[STATUSES[s] ? categoryOf(s) : 'unverified'] += n;
  return out;
}

module.exports = { LEGACY_TELEMETRY_STATUSES, CATEGORY_TREATMENT, mapStatus, statusTable, categoryCounts };
