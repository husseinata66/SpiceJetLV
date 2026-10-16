// Assertion evidence — what makes a `Passed` result a verified pass (pipeline.md §11.4, Phase 5.6B).
//
// WHY THIS EXISTS
// Until now any non-empty Evidence or Observed cell counted as proof: a screenshot path, a list of
// captured values, even a case whose own assertion table showed a failed check (Phase 5.5 audit, E1–E5).
// §11.4 says a Passed result must show that EACH assertion was validated. This module makes that a
// mechanical check over structured assertion records, and checks that cited evidence files exist.
//
// THE RECORD (one row per assertion, in the results file of the cycle that executed the case):
//   | Test Case ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |
// or, under a heading that names the case ("### Assertions — TC-LOGIN-003"), the same columns without
// Test Case ID. Expected Source and Evidence are optional columns.
//
// WHAT IT CHECKS, per assertion
//   - complete:   Expected, Actual, Check and Result are all present;
//   - sourced:    Expected comes from the approved test case (its text contains it), or the row cites
//                 where it comes from (Expected Source — a contract, a test-data calculation). A source
//                 naming the observation itself ("observed", "actual", "screenshot") is refused;
//   - recognized: the Check names a comparison this module knows;
//   - consistent: where the comparison can be recomputed from Expected and Actual, its result must equal
//                 the recorded Result — otherwise the evidence contradicts itself;
//   - evidence:   every file it cites exists inside the run folder (see resolveEvidenceRef).
// And per case: every literal the Expected Result quotes ("Account locked", `status = Locked`) is
// checked by some assertion — the mechanical lower bound of "every required assertion".
//
// It never writes, never fills in a missing result, and never turns a recorded status into another one:
// executionHistory.js decides what the evaluation means for the final status, and keeps the raw one.

const fs = require('fs');
const path = require('path');

const clean = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/[*_]/g, '').trim();
// A path cell keeps its underscores (Phase 9.2, F-09): only comments, <br>, backticks and an emphasis that
// WRAPS the whole cell are removed — `clean` strips every _ and * as Markdown emphasis, which turned
// pw_results.json into pwresults.json and a verified pass into Unverified.
const pathCell = (s) => {
  let t = String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/`/g, '').trim();
  const WRAP = /^(\*\*|__|\*|_)([\s\S]+)\1$/;
  for (let m = t.match(WRAP); m; m = t.match(WRAP)) t = m[2].trim();
  return t;
};
const isEmpty = (s) => !s || /^(—|-|–|n\/a|none)$/i.test(clean(s).replace(/`/g, ''));
const cells = (line) => { const p = line.split('|'); return p.slice(1, p.length - 1).map((c) => c.trim()); };
/** Comparable form: no code ticks or double quotes, single spaces. Case is kept. */
const norm = (s) => clean(s).replace(/[`"“”]/g, '').replace(/\s+/g, ' ').trim();
const TC_ID = /^(?:([a-z0-9][a-z0-9.+-]*):)?(TC-[A-Z0-9-]*[A-Z0-9])$/i;

// ---------------------------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------------------------

/** Splits a cell like "login:TC-1" into module and ID. */
function parseCaseRef(text) {
  const m = clean(text).replace(/`/g, '').match(TC_ID);
  return m ? { module: m[1] || null, id: m[2] } : null;
}

/**
 * Every assertion record in a results file: consolidated tables (with a Test Case ID column) and
 * per-case tables under a heading naming the case. A table is an assertion table when its header has
 * Assertion, Expected, Actual and Result columns.
 * @returns {Array<{testCaseId: string, module: string|null, assertion: string, expected: string, source: string,
 *                  actual: string, check: string, result: string, evidence: string, line: number}>}
 */
function parseAssertionRecords(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let headingCase = null;
  for (let i = 0; i < lines.length; i += 1) {
    const h = lines[i].match(/^#{2,6}\s+(.*)$/);
    if (h) {
      const ref = /assertion/i.test(h[1]) ? (h[1].match(/((?:[a-z0-9][a-z0-9.+-]*:)?TC-[A-Z0-9-]*[A-Z0-9])/i) || [])[1] : null;
      headingCase = ref ? parseCaseRef(ref) : null;
      continue;
    }
    if (!/^\|/.test(lines[i])) continue;
    const header = cells(lines[i]).map((c) => clean(c).replace(/`/g, '').toLowerCase());
    const col = (test) => header.findIndex(test);
    const iAssert = col((c) => c.startsWith('assertion') && c !== 'assertion id');
    const iAssertId = col((c) => c === 'assertion id');
    const iExpected = col((c) => c.startsWith('expected') && !c.includes('source'));
    const iActual = col((c) => c.startsWith('actual') || c.startsWith('observed'));
    const iResult = col((c) => c === 'result' || c.startsWith('result') || c.startsWith('verification'));
    if (iAssert === -1 || iExpected === -1 || iActual === -1 || iResult === -1) {
      while (i + 1 < lines.length && /^\|/.test(lines[i + 1])) i += 1; // skip the whole non-assertion table
      continue;
    }
    const iId = col((c) => c === 'test case id' || c === 'test case');
    const iModule = col((c) => c === 'module');
    const iSource = col((c) => c.includes('source'));
    const iCheck = col((c) => c.startsWith('check') || c.startsWith('comparison'));
    const iEvidence = col((c) => c.startsWith('evidence'));
    for (let j = i + 2; j < lines.length && /^\|/.test(lines[j]); j += 1) {
      const row = cells(lines[j]);
      const ref = iId !== -1 ? parseCaseRef(row[iId]) : headingCase;
      if (!ref) continue;
      const get = (k) => (k === -1 || isEmpty(row[k]) ? '' : clean(row[k]));
      out.push({
        testCaseId: ref.id,
        module: (iModule !== -1 && !isEmpty(row[iModule]) ? clean(row[iModule]).replace(/`/g, '') : null) || ref.module,
        assertionId: iAssertId === -1 ? null : (get(iAssertId).replace(/`/g, '') || null),
        assertion: get(iAssert), expected: get(iExpected), source: get(iSource), actual: get(iActual),
        check: get(iCheck), result: get(iResult), evidence: iEvidence === -1 || isEmpty(row[iEvidence]) ? '' : pathCell(row[iEvidence]), line: j + 1,
      });
      i = j;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Comparisons
// ---------------------------------------------------------------------------------------------

/** The recorded verification result: pass, fail, unchecked (could not be checked), missing or unknown. */
function readResult(text) {
  const t = clean(text).replace(/`/g, '').toLowerCase();
  if (!t) return 'missing';
  if (/^(✅|✔|✓|pass|passed|ok|true|yes)\b|^(✅|✔|✓)/.test(t)) return 'pass';
  if (/^(❌|✖|✗|×|fail|failed|false|no)\b|^(❌|✖|✗)/.test(t)) return 'fail';
  if (/not checked|unchecked|could not|cannot be checked|not verified|unable/.test(t)) return 'unchecked';
  return 'unknown';
}

const num = (s) => {
  const t = norm(s).replace(/,/g, '');
  return /^[-+]?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

/**
 * Reads a Check and, where possible, recomputes it from Expected and Actual.
 * @returns {{method: string|null, recognized: boolean, computable: boolean, ok: boolean|null}}
 */
function compare(check, expected, actual) {
  const c = clean(check).replace(/`/g, '').toLowerCase().trim();
  const e = norm(expected);
  const a = norm(actual);
  const done = (method, ok) => ({ method, recognized: true, computable: ok !== null, ok });
  const nums = () => [num(expected), num(actual)];
  let m;
  if (!c) return { method: null, recognized: false, computable: false, ok: null };
  if (/^(not equals?|!=|≠|does not equal)/.test(c)) return done('not-equals', e !== a);
  if (/^(equals?|exact(ly)?( match)?|is)\b/.test(c) || /^==?(\s|\(|$)/.test(c)) {
    const dpm = c.match(/\((\d+)\s*dp\)/);
    const dp = dpm ? Number(dpm[1]) : null;
    const [x, y] = nums();
    if (x !== null && y !== null) return done('equals', dp !== null ? x.toFixed(dp) === y.toFixed(dp) : x === y);
    return done('equals', e === a);
  }
  if (/^(does not contain|not contains?|excludes)/.test(c)) return done('not-contains', !a.includes(e));
  if (/^(contains?|includes?)\b/.test(c)) return done('contains', a.includes(e));
  if ((m = c.match(/^match(es)?\b\s*(.*)$/))) {
    const pattern = m[2] ? clean(check).replace(/`/g, '').replace(/^match(es)?\s*/i, '') : e;
    try { return done('matches', new RegExp(pattern).test(a)); } catch { return { method: 'matches', recognized: true, computable: false, ok: null }; }
  }
  if ((m = c.match(/^within\b[^\d]*([\d.]+)/))) {
    const [x, y] = nums();
    return done('within', x === null || y === null ? null : Math.abs(x - y) <= Number(m[1]));
  }
  for (const [re, method, fn] of [[/^(≥|>=)/, 'gte', (x, y) => y >= x], [/^(≤|<=)/, 'lte', (x, y) => y <= x], [/^>/, 'gt', (x, y) => y > x], [/^</, 'lt', (x, y) => y < x]]) {
    if (re.test(c)) { const [x, y] = nums(); return done(method, x === null || y === null ? null : fn(x, y)); }
  }
  if (/^(present|exists|visible|shown)\b/.test(c)) return done('present', a !== '' && !/^(absent|none|not (present|shown|visible))$/i.test(a));
  if (/^(absent|not present|not shown|hidden|does not exist)\b/.test(c)) return done('absent', a === '' || /^(absent|none|not (present|shown|visible))$/i.test(a));
  if (/^classification\b/.test(c)) return { method: 'classification', recognized: true, computable: false, ok: null };
  return { method: null, recognized: false, computable: false, ok: null };
}

// ---------------------------------------------------------------------------------------------
// Evidence references
// ---------------------------------------------------------------------------------------------

// Test-runner output formats count too: TAP (.tap), line-delimited JSON logs (.jsonl, .ndjson), MSTest (.trx).
const FILE_EXT = 'png|jpe?g|gif|webp|bmp|svg|zip|har|jsonl|ndjson|json|txt|log|html?|md|csv|xml|mp4|webm|pdf|trace|tap|trx';

/** File references cited in a cell. Prose and URLs are not references. */
function extractEvidenceRefs(text) {
  const t = String(text ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, ' ');
  const re = new RegExp(`(?:[A-Za-z]:[\\\\/]|[\\\\/])?(?:[\\w.\\-]+[\\\\/])*[\\w.\\-]*[\\w-]\\.(?:${FILE_EXT})\\b`, 'gi');
  return [...new Set((t.match(re) || []).map((r) => r.trim()))];
}

const within = (dir, file) => { const r = path.relative(dir, file); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };

/**
 * Resolves one cited evidence file. The authorised location is the run folder: a reference is tried
 * relative to the results file's folder and to the run folder, and must stay inside the run folder —
 * through symbolic links too.
 * @returns {{ref: string, status: 'ok'|'missing'|'outside'|'traversal'|'ambiguous'|'inaccessible', path?: string}}
 */
function resolveEvidenceRef(ref, { runDir, resultsDir }) {
  const r = String(ref).replace(/\\/g, '/');
  if (/^([a-z]:)?\//i.test(r)) return { ref, status: 'outside' };
  if (r.split('/').includes('..')) return { ref, status: 'traversal' };
  const candidates = [...new Set([resultsDir, runDir].filter(Boolean).map((d) => path.resolve(d, r)))];
  const found = [];
  for (const c of candidates) {
    if (!within(runDir, c)) continue;
    let st;
    try { st = fs.statSync(c); } catch (err) { if (err.code === 'EACCES' || err.code === 'EPERM') return { ref, status: 'inaccessible' }; continue; }
    if (!st.isFile()) continue;
    let real;
    try { real = fs.realpathSync(c); } catch { return { ref, status: 'inaccessible' }; }
    if (!within(fs.realpathSync(runDir), real)) return { ref, status: 'outside' };
    try { fs.accessSync(c, fs.constants.R_OK); } catch { return { ref, status: 'inaccessible' }; }
    found.push(c);
  }
  if (found.length > 1) return { ref, status: 'ambiguous', paths: found };
  if (!found.length) return { ref, status: 'missing' };
  return { ref, status: 'ok', path: found[0] };
}

/** Every file reference in `text`, resolved. */
function checkEvidence(text, ctx) {
  return extractEvidenceRefs(text).map((r) => resolveEvidenceRef(r, ctx));
}

// ---------------------------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------------------------

/** Literals an Expected Result quotes — "…", “…” or `…` — each of which some assertion must check. */
function requiredLiterals(expectedResult) {
  const t = String(expectedResult ?? '');
  const out = [];
  for (const m of t.matchAll(/"([^"\n]{2,})"|“([^”\n]{2,})”|`([^`\n]{2,})`/g)) out.push(norm(m[1] || m[2] || m[3]));
  return [...new Set(out.filter(Boolean))];
}

const { VERIFIED_BASES } = require('./consumedVersions');

/** The consumed artifact an Expected Source names — by path, or by file name when only one matches. */
function citedArtifact(source, consumed) {
  const src = String(source).replace(/\\/g, '/');
  const byPath = consumed.find((c) => src.includes(c.artifact));
  if (byPath) return byPath;
  const byName = consumed.filter((c) => src.includes(c.artifact.split('/').pop()));
  return byName.length === 1 ? byName[0] : null;
}

/**
 * How much of a case's Expected Result its assertion records are shown to cover (Phase 5.7). The
 * Expected Result is split into clauses (at ". ", "; ", ", ", " and ", line breaks — never inside a quoted
 * value). A clause counts as covered when an assertion's Expected is found in it, or it in an assertion's
 * Expected. This is a TEXTUAL lower bound, not a judgment of meaning: a clause the records do not visibly
 * address is listed as unmapped and the case's coverage is `partial` — never reported as complete.
 * Nothing is invented for an unmapped clause.
 * @returns {{state: 'complete'|'partial'|'unknown', clauses: number, covered: number, unmapped: string[]}}
 */
function assertionCoverage(expectedResult, records) {
  const text = String(expectedResult ?? '').trim();
  if (!text) return { mode: 'textual', state: 'unknown', clauses: 0, covered: 0, unmapped: [] };
  const quoted = [];
  const masked = text.replace(/"[^"\n]*"|“[^”\n]*”|`[^`\n]*`/g, (m) => { quoted.push(m); return `\u0000${quoted.length - 1}\u0000`; });
  const clauses = masked.split(/[.;](?:\s+|$)|,\s+|\s+and\s+|\n+/i)
    .map((c) => c.replace(/\u0000(\d+)\u0000/g, (m, i) => quoted[Number(i)]).trim())
    .filter((c) => /[A-Za-z0-9]/.test(c));
  const exps = records.map((r) => norm(r.expected)).filter((e) => e.length >= 3);
  const unmapped = clauses.filter((c) => {
    const nc = norm(c);
    return !exps.some((e) => nc.includes(e) || e.includes(nc));
  });
  return { mode: 'textual', state: unmapped.length ? 'partial' : 'complete', clauses: clauses.length, covered: clauses.length - unmapped.length, unmapped };
}

const OBSERVATION_SOURCE =/\b(observ|actual|screenshot|captured|as seen|from the (page|screen|response))/i;

/**
 * Evaluates the assertion records of one result row.
 * @param {object[]} records  parseAssertionRecords() rows for this case, from the same results file
 * @param {{caseText?: string|null, expectedResult?: string|null, runDir: string, resultsDir: string}} ctx
 *   caseText/expectedResult: the approved test case (null when no approved suite can be read)
 * @returns {{state: 'verified'|'unverified'|'inconclusive'|'failed'|'contradiction'|'none',
 *            recorded: number, passed: number, failed: number, unchecked: number,
 *            issues: string[], contradictions: string[], evidence: object[], assertions: object[]}}
 */
function evaluateAssertions(records, ctx) {
  // A case whose approved version states its assertions (Phase 5.8) is checked against them, by ID.
  if (ctx.design) return evaluateStructured(records, ctx);
  const caseText = ctx.caseText ? norm(ctx.caseText) : null;
  const assertions = [];
  const issues = [];
  const contradictions = [];
  const evidence = [];
  let passed = 0; let failed = 0; let unchecked = 0;
  for (const r of records) {
    const label = r.assertion || `line ${r.line}`;
    const result = readResult(r.result);
    const cmp = compare(r.check, r.expected, r.actual);
    const a = { assertion: r.assertion, expected: r.expected, actual: r.actual, check: r.check, result, method: cmp.method, recomputed: cmp.computable ? cmp.ok : null, evidence: r.evidence || null };
    const missing = ['expected', 'actual', 'check'].filter((k) => !r[k]);
    if (missing.length) issues.push(`"${label}": no ${missing.join(', ')} recorded`);
    if (result === 'missing') issues.push(`"${label}": no verification result recorded`);
    if (result === 'unknown') issues.push(`"${label}": result "${r.result}" is not a verification result`);
    if (r.check && !cmp.recognized) issues.push(`"${label}": comparison "${r.check}" is not one the platform recognizes`);
    // Where the expected value comes from — verified against the version this stage CONSUMED (Phase 5.7):
    // the approved test case as it was when the stage started, or an artifact the stage consumed that the
    // row cites. A version that is not recorded or cannot be retrieved verifies nothing.
    if (r.expected) {
      const sv = ctx.sourceVersion;
      const why = (basis) => (basis === 'unavailable' ? 'cannot be retrieved' : 'was not recorded');
      if (r.source && OBSERVATION_SOURCE.test(r.source)) {
        issues.push(`"${label}": the expected value is sourced from the observation ("${r.source}") — it must come from the test case or its contract`);
        a.sourced = 'from-observation';
      } else if (caseText && caseText.includes(norm(r.expected))) {
        if (sv && sv.verifiable) { a.sourced = 'test-case'; a.sourceVersion = sv.basis; }
        else {
          issues.push(`"${label}": the expected value is in the test case, but the version of ${(sv && sv.suite) || 'the suite'} this stage consumed ${why(sv && sv.basis)} — it cannot be verified against the approved version`);
          a.sourced = 'version-unverified';
        }
      } else if (r.source) {
        const hit = citedArtifact(r.source, ctx.consumed || []);
        if (hit && VERIFIED_BASES.includes(hit.basis) && norm(hit.text).includes(norm(r.expected))) { a.sourced = 'cited-consumed'; a.sourceVersion = hit.basis; }
        else {
          let msg = `"${label}": the cited source "${r.source}" is not an artifact this stage consumed — its version cannot be verified`;
          if (hit && VERIFIED_BASES.includes(hit.basis)) msg = `"${label}": the cited ${hit.artifact}, as this stage consumed it, does not contain "${r.expected}"`;
          else if (hit) msg = `"${label}": the version of the cited ${hit.artifact} this stage consumed ${why(hit.basis)}`;
          issues.push(msg);
          a.sourced = 'cited-unverified';
        }
      } else {
        issues.push(sv && !sv.verifiable
          ? `"${label}": expected value "${r.expected}" is not in the available test case text (the consumed version ${why(sv.basis)}) and no source is cited`
          : `"${label}": expected value "${r.expected}" is not in the approved test case and no source is cited`);
        a.sourced = 'unsourced';
      }
    }
    if (result === 'pass') passed += 1;
    if (result === 'fail') failed += 1;
    if (result === 'unchecked') unchecked += 1;
    // Recomputed only from what was recorded: a missing Expected or Actual is incomplete, not a contradiction.
    const comparable = ['present', 'absent'].includes(cmp.method) ? Boolean(r.actual || cmp.method === 'absent') : Boolean(r.expected && r.actual);
    if (comparable && cmp.computable && (result === 'pass' || result === 'fail') && cmp.ok !== (result === 'pass')) {
      contradictions.push(`"${label}": recorded ${result === 'pass' ? '✅' : '❌'}, but ${cmp.method} of expected "${r.expected}" and actual "${r.actual}" is ${cmp.ok ? 'true' : 'false'}`);
    }
    for (const ev of checkEvidence(r.evidence, ctx)) evidence.push({ ...ev, assertion: label });
    assertions.push(a);
  }
  // Every literal the approved Expected Result quotes is checked by some assertion.
  for (const lit of requiredLiterals(ctx.expectedResult)) {
    if (records.length && !records.some((r) => norm(r.expected).includes(lit))) issues.push(`the Expected Result requires "${lit}", but no assertion checks it`);
  }
  const coverage = assertionCoverage(ctx.expectedResult, records);
  const badEvidence = evidence.filter((e) => e.status !== 'ok');
  for (const e of badEvidence) issues.push(`evidence "${e.ref}" (${e.assertion}): ${e.status}`);

  let state;
  if (!records.length) state = 'none';
  else if (failed) state = 'failed';
  else if (contradictions.length) state = 'contradiction';
  else if (unchecked) state = 'inconclusive';
  else if (issues.length) state = 'unverified';
  else state = 'verified';
  return { state, recorded: records.length, passed, failed, unchecked, issues, contradictions, evidence, assertions, coverage };
}

/**
 * Records against a case's approved assertion design (assertionContract.js, Phase 5.8). Every required
 * assertion is matched by its ID and verified on its own: its Expected must be the approved one, its
 * Check the approved method, its Result recorded, and Expected vs Actual recomputed where possible. A
 * required assertion with no record is MISSING — reported apart from a failed one. A record whose ID is
 * not in the design is EXTRA: reported, never counted towards coverage. The approved design is read from
 * the version this stage consumed; one that cannot be verified verifies nothing.
 */
function evaluateStructured(records, ctx) {
  // eslint-disable-next-line global-require
  const { matchRecords } = require('./assertionContract');
  const design = ctx.design;
  const sv = ctx.sourceVersion;
  const issues = [];
  const contradictions = [];
  const evidence = [];
  const assertions = [];
  let passed = 0; let failed = 0; let unchecked = 0;
  if (ctx.designIssues && ctx.designIssues.length) issues.push(`the approved test case's Assertions table is not valid — ${ctx.designIssues.join('; ')}`);
  if (!sv || !sv.verifiable) {
    issues.push(`the approved assertions come from the version of ${(sv && sv.suite) || 'the suite'} this stage consumed, which ${sv && sv.basis === 'unavailable' ? 'cannot be retrieved' : 'was not recorded'}`);
  }
  const m = matchRecords(design, records);
  const failedIds = [];
  const passedIds = new Set();
  for (const r of records) {
    const id = r.assertionId || null;
    const label = id || r.assertion || `line ${r.line}`;
    const required = Boolean(id && design.some((d) => d.id === id));
    const result = readResult(r.result);
    const cmp = compare(r.check, r.expected, r.actual);
    const missingFields = ['expected', 'actual', 'check'].filter((k) => !r[k]);
    if (missingFields.length) issues.push(`${label}: no ${missingFields.join(', ')} recorded`);
    if (result === 'missing') issues.push(`${label}: no verification result recorded`);
    if (result === 'unknown') issues.push(`${label}: result "${r.result}" is not a verification result`);
    if (r.check && !cmp.recognized) issues.push(`${label}: comparison "${r.check}" is not one the platform recognizes`);
    if (result === 'pass') { passed += 1; if (required && !missingFields.length) passedIds.add(id); }
    if (result === 'fail') { failed += 1; failedIds.push(label); }
    if (result === 'unchecked') unchecked += 1;
    const comparable = ['present', 'absent'].includes(cmp.method) ? Boolean(r.actual || cmp.method === 'absent') : Boolean(r.expected && r.actual);
    if (comparable && cmp.computable && (result === 'pass' || result === 'fail') && cmp.ok !== (result === 'pass')) {
      contradictions.push(`${label}: recorded ${result === 'pass' ? '✅' : '❌'}, but ${cmp.method} of expected "${r.expected}" and actual "${r.actual}" is ${cmp.ok ? 'true' : 'false'}`);
    }
    for (const ev of checkEvidence(r.evidence, ctx)) evidence.push({ ...ev, assertion: label });
    assertions.push({ id, assertion: r.assertion, expected: r.expected, actual: r.actual, check: r.check, result, required, recomputed: cmp.computable ? cmp.ok : null, evidence: r.evidence || null });
  }
  if (m.missing.length) issues.push(`required assertion(s) with no execution record: ${m.missing.join(', ')}`);
  for (const id of m.expectedChanged) {
    const d = design.find((x) => x.id === id);
    const r = m.byId.get(id)[0];
    issues.push(`${id}: the recorded Expected "${r.expected}" is not the approved "${d.expected}"`);
    passedIds.delete(id);
  }
  for (const id of m.checkChanged) {
    issues.push(`${id}: the recorded Check "${m.byId.get(id)[0].check}" is not the approved "${design.find((x) => x.id === id).check}"`);
    passedIds.delete(id);
  }
  for (const id of m.duplicate) contradictions.push(`${id}: recorded ${m.byId.get(id).length} times — which record is the result cannot be decided`);
  for (const e of evidence.filter((x) => x.status !== 'ok')) issues.push(`evidence "${e.ref}" (${e.assertion}): ${e.status}`);

  let state;
  if (!records.length) state = 'none';
  else if (failed) state = 'failed';
  else if (contradictions.length) state = 'contradiction';
  else if (unchecked) state = 'inconclusive';
  else if (issues.length) state = 'unverified';
  else state = 'verified';
  const verifiedIds = design.map((d) => d.id).filter((id) => passedIds.has(id));
  const coverage = {
    mode: 'structured',
    state: verifiedIds.length === design.length ? 'complete' : 'partial',
    required: design.length, verified: verifiedIds.length, clauses: design.length, covered: verifiedIds.length,
    missing: m.missing, failed: failedIds, extra: m.extra, unmapped: [],
  };
  return {
    state, recorded: records.length, passed, failed, unchecked, issues, contradictions, evidence, assertions, coverage,
    structured: true, missing: m.missing, failedIds, extra: m.extra, expectedChanged: m.expectedChanged, duplicate: m.duplicate,
  };
}

module.exports = {
  evaluateStructured,
  parseCaseRef,
  parseAssertionRecords,
  readResult,
  compare,
  extractEvidenceRefs,
  resolveEvidenceRef,
  checkEvidence,
  requiredLiterals,
  assertionCoverage,
  citedArtifact,
  evaluateAssertions,
};
