// Assertion contract — one assertion-level contract from Test Design to Reporting (Phase 5.8).
//
// WHY THIS EXISTS
// Phase 5.6B/5.7 made a Passed depend on assertion records, but which assertions a case REQUIRES was
// only inferable from the prose of its Expected Result (quoted values, clauses). This contract lets Stage
// 3 state them, with stable IDs, so execution records are matched to them one by one.
//
// THE DESIGN SIDE — a test case's `**Assertions:**` field (TestCase_entry.md), one row per assertion:
//   | Assertion ID | Expected | Expected Source | Check | Requirement |
//   Assertion ID   A1, A2, … — stable within the case; (Test Case ID, Assertion ID) is the identity.
//                  Never renumbered: a removed assertion's ID is not reused.
//   Expected       the expected behaviour or value
//   Expected Source where it comes from — "Expected Result", a requirement, or an artifact by path;
//                  never the observation
//   Check          the comparison: equals, contains, matches <pattern>, within ±N, ≥ / ≤ / > / <,
//                  present, absent, not equals, classification = … (assertionEvidence.compare)
//   Requirement    the requirement it verifies (AC-3, PO-24, §2.4, …)
//
// WHEN IT IS REQUIRED — for every NEW or MATERIALLY UPDATED case, checked when Stage 3 is approved
// (approveStage / approveScope). "Materially" = anything but the Review / Automation lifecycle fields.
// The baseline is the suite as it was last approved (its recorded fingerprint, read back from a run
// snapshot or git), else the committed version, else nothing — then every case is new. An unchanged
// legacy case is never required to gain one, and is never rewritten.
//
// THE EXECUTION SIDE — the results file's assertion records carry an `Assertion ID` column; for a case
// with a design table, records are matched to it by ID (evaluateStructured).

const { compare } = require('./assertionEvidence');

const clean = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/[*_]/g, '').trim();
const isEmpty = (s) => !s || /^(—|-|–|n\/a|none)$/i.test(clean(s).replace(/`/g, ''));
const norm = (s) => clean(s).replace(/[`"“”]/g, '').replace(/\s+/g, ' ').trim();
const cells = (line) => { const p = line.split('|'); return p.slice(1, p.length - 1).map((c) => c.trim()); };
const ID_RE = /^A\d+$/;
const OBSERVATION_SOURCE = /\b(observ|actual|screenshot|captured|as seen)/i;

/**
 * The rows of a case's `**Assertions:**` field (the parser keeps the field's text as written).
 * @returns {{rows: Array<{id: string, expected: string, source: string, check: string, requirement: string}>, issues: string[]}}
 */
function parseDesignAssertions(fieldText) {
  const lines = String(fieldText ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
  if (!lines.length) return { rows: [], issues: ['the Assertions field has no table'] };
  const header = cells(lines[0]).map((h) => clean(h).replace(/`/g, '').toLowerCase());
  const col = (test) => header.findIndex(test);
  const iId = col((h) => h === 'assertion id' || h === 'id');
  const iExp = col((h) => h.startsWith('expected') && !h.includes('source'));
  const iSrc = col((h) => h.includes('source'));
  const iCheck = col((h) => h.startsWith('check') || h.startsWith('comparison') || h.startsWith('verification'));
  const iReq = col((h) => h.startsWith('requirement'));
  const missingCols = [['Assertion ID', iId], ['Expected', iExp], ['Expected Source', iSrc], ['Check', iCheck], ['Requirement', iReq]].filter(([, i]) => i === -1).map(([n]) => n);
  if (missingCols.length) return { rows: [], issues: [`the Assertions table has no ${missingCols.join(', ')} column`] };
  const rows = lines.slice(1).filter((l) => !/^\|\s*:?-+/.test(l)).map((l) => {
    const c = cells(l);
    const get = (i) => (isEmpty(c[i]) ? '' : clean(c[i]));
    return { id: get(iId).replace(/`/g, ''), expected: get(iExp), source: get(iSrc), check: get(iCheck), requirement: get(iReq) };
  });
  return { rows, issues: validateDesignAssertions(rows) };
}

/** Problems with a design table: IDs, required fields, a recognized check, a source that is not the observation. */
function validateDesignAssertions(rows) {
  const issues = [];
  if (!rows.length) issues.push('the Assertions table has no rows');
  const seen = new Map();
  rows.forEach((r, i) => {
    const at = r.id || `row ${i + 1}`;
    if (!r.id) issues.push(`row ${i + 1}: no Assertion ID`);
    else if (!ID_RE.test(r.id)) issues.push(`${r.id}: an Assertion ID is A1, A2, …`);
    else seen.set(r.id, (seen.get(r.id) || 0) + 1);
    for (const [k, label] of [['expected', 'Expected'], ['source', 'Expected Source'], ['check', 'Check'], ['requirement', 'Requirement']]) {
      if (!r[k]) issues.push(`${at}: no ${label}`);
    }
    if (r.check && !compare(r.check, r.expected, r.expected).recognized) issues.push(`${at}: Check "${r.check}" is not one the platform recognizes`);
    if (r.source && OBSERVATION_SOURCE.test(r.source)) issues.push(`${at}: Expected Source "${r.source}" names the observation — an expected value comes from the case or its requirement`);
  });
  for (const [id, n] of seen) if (n > 1) issues.push(`${id}: duplicate Assertion ID (${n} rows)`);
  return issues;
}

/** The parts of a case that make it "the same case": everything but its Review / Automation decisions. */
function materialText(record) {
  return Object.entries(record)
    .filter(([k]) => !['review', 'automation'].includes(k))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${norm(Array.isArray(v) ? v.join('\n') : v)}`)
    .join('\n');
}

/**
 * Which cases of a suite need the contract, against a baseline version of it, and whether they meet it.
 * @param {object[]} cases          parseTestCases(current).cases
 * @param {object[]|null} baseline  parseTestCases(baseline).cases, or null when there is no baseline
 * @param {{only?: string[]}} [opts] limit to these case IDs (a partial approval)
 * @returns {{checked: number, newOrChanged: string[], unchanged: string[], missing: string[], invalid: Array<{id: string, issues: string[]}>}}
 */
function designGate(cases, baseline, { only = null } = {}) {
  const before = new Map((baseline || []).map((c) => [c.id, materialText(c)]));
  const out = { checked: 0, newOrChanged: [], unchanged: [], missing: [], invalid: [], advisories: [] };
  for (const c of cases) {
    if (only && !only.includes(c.id)) continue;
    out.checked += 1;
    if (before.has(c.id) && before.get(c.id) === materialText(c)) { out.unchanged.push(c.id); continue; }
    out.newOrChanged.push(c.id);
    if (!c.assertions) { out.missing.push(c.id); continue; }
    const d = parseDesignAssertions(c.assertions);
    if (d.issues.length) { out.invalid.push({ id: c.id, issues: d.issues }); continue; }
    const notes = designAdvisories(d.rows);
    if (notes.length) out.advisories.push({ id: c.id, notes });
  }
  return out;
}

/**
 * Non-blocking notes on a valid design table (test-design-skill §6.1a). Reported for new or changed cases
 * at approval; never a reason to refuse it, and never raised for an unchanged legacy case.
 *   - Expected Source "Expected Result" points back at the case itself, not at where the value comes from.
 */
function designAdvisories(rows) {
  return rows
    .filter((r) => norm(r.source).toLowerCase() === 'expected result')
    .map((r) => `${r.id}: Expected Source is "Expected Result" — name the requirement, contract, Test Data or artifact the value comes from`);
}

/**
 * Execution records against a case's approved design (the consumed version). Each required assertion is
 * matched by ID and verified on its own; nothing is inferred for an assertion with no record.
 * @param {Array} design   parseDesignAssertions(...).rows of the consumed case version
 * @param {Array} records  assertion records for this case (assertionEvidence.parseAssertionRecords)
 * @param {(r: object) => object} evaluateOne  evaluates one record (assertionEvidence), returns its parts
 * @returns {{missing: string[], extra: string[], duplicate: string[], expectedChanged: string[], checkChanged: string[]}}
 */
function matchRecords(design, records) {
  const byId = new Map();
  const extra = [];
  for (const r of records) {
    const id = (r.assertionId || '').replace(/`/g, '');
    if (!id || !design.some((d) => d.id === id)) { extra.push(id || `(no ID: "${r.assertion || r.expected}")`); continue; }
    byId.set(id, [...(byId.get(id) || []), r]);
  }
  const missing = design.filter((d) => !byId.has(d.id)).map((d) => d.id);
  const duplicate = [...byId].filter(([, v]) => v.length > 1).map(([k]) => k);
  const expectedChanged = [];
  const checkChanged = [];
  for (const d of design) {
    const r = (byId.get(d.id) || [])[0];
    if (!r) continue;
    if (r.expected && norm(r.expected) !== norm(d.expected)) expectedChanged.push(d.id);
    const m1 = compare(r.check, r.expected, r.actual).method;
    const m2 = compare(d.check, d.expected, d.expected).method;
    if (r.check && m1 !== m2) checkChanged.push(d.id);
  }
  return { byId, missing, extra, duplicate, expectedChanged, checkChanged };
}

module.exports = { ID_RE, parseDesignAssertions, validateDesignAssertions, materialText, designGate, designAdvisories, matchRecords };
