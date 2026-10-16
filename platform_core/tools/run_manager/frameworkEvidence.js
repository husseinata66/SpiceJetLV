// Framework evidence integrity (Phase 9.2, audit finding F-08).
//
// A results file (ExecutionResults*.md) is a NORMALIZED transcription, written by the Automation Execution
// Skill, of what the test framework reported. When the framework's own raw report is in the run, the two are
// compared, and the raw report wins where they disagree:
//
//   raw Failed / Skipped, normalized Passed     → the Passed never stands: Failed (resp. Unverified), conflict
//   raw Passed, normalized failure              → the failure stands (it is the more conservative), conflict
//   a test in the report missing from the file  → conflict (identity mismatch)
//   a Passed missing from an existing report    → Unverified, conflict — nothing independently shows it ran
//   different numbers of tests                  → conflict (count mismatch)
//
// Supported raw formats: Maven Surefire / JUnit XML (<testsuite>/<testsuites>), and the Playwright JSON
// reporter (config + suites[].specs[].tests[]). A cycle's raw reports are the ones its results file cites
// (any cell that references one); with a single results cycle, a report found in the stage's folder but not
// cited is compared too, and reported as uncited. With several cycles an uncited report cannot be
// attributed to one, which is itself a conflict.
//
// Where no raw report exists, a result is `no-report` — never presented as independently verified
// framework execution. Nothing here writes; reports are read from inside the run folder only.

const fs = require('fs');
const path = require('path');

const toPosix = (p) => String(p).split(path.sep).join('/');

/** TC_LOGIN_001_lockout → TC-LOGIN-001: tokens up to the last purely numeric one. */
function caseIdOf(text) {
  const m = String(text || '').match(/\bTC(?:[-_][A-Za-z0-9]+)+/i);
  if (!m) return null;
  const tokens = m[0].split(/[-_]/);
  let last = -1;
  tokens.forEach((t, i) => { if (/^\d+$/.test(t)) last = i; });
  if (last < 1) return null;
  return tokens.slice(0, last + 1).map((t) => t.toUpperCase()).join('-');
}

const unxml = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`)); return m ? unxml(m[1]) : null; };

/** Surefire / JUnit XML → [{id, name, status}], or null when the text is not a JUnit report. */
function parseJUnit(text) {
  if (!/<testsuites?\b/.test(text)) return null;
  const out = [];
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m;
  while ((m = re.exec(text))) {
    const head = m[1]; const body = m[3] || '';
    const name = attr(head, 'name') || ''; const cls = attr(head, 'classname') || '';
    const status = /<(failure|error)\b/.test(body) ? 'Failed' : /<skipped\b/.test(body) ? 'Skipped' : 'Passed';
    out.push({ id: caseIdOf(name) || caseIdOf(cls), name: `${cls ? `${cls}.` : ''}${name}`, status });
  }
  return out;
}

/** Playwright JSON reporter → [{id, name, status}], or null when the text is not one. */
function parsePlaywright(text) {
  let j;
  try { j = JSON.parse(text); } catch { return null; }
  if (!j || !Array.isArray(j.suites) || !(j.config || j.stats)) return null;
  const out = [];
  const walk = (suite, trail) => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const results = t.results || [];
        const lastStatus = results.length ? results[results.length - 1].status : null;
        const status = t.status === 'skipped' || lastStatus === 'skipped' ? 'Skipped'
          : t.status === 'flaky' ? 'Flaky'
            : t.status === 'expected' || lastStatus === 'passed' ? 'Passed' : 'Failed';
        const name = [...trail, spec.title].filter(Boolean).join(' › ');
        out.push({ id: caseIdOf(spec.title) || caseIdOf(name), name, status });
      }
    }
    for (const s of suite.suites || []) walk(s, [...trail, s.title]);
  };
  for (const s of j.suites) walk(s, [s.title]);
  return out;
}

function parseReport(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  if (/\.xml$/i.test(file)) { const t = parseJUnit(text); return t ? { format: 'junit-xml', tests: t } : null; }
  if (/\.json$/i.test(file)) { const t = parsePlaywright(text); return t ? { format: 'playwright-json', tests: t } : null; }
  return null;
}

/** Every raw framework report under the stage's results folder. */
function discoverReports(dir) {
  const out = [];
  const walk = (d, depth) => {
    if (depth > 6) return;
    let es = [];
    try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { if (!/^(node_modules|\.git)$/.test(e.name)) walk(p, depth + 1); } else if (/\.(xml|json)$/i.test(e.name)) {
        const r = parseReport(p);
        if (r) out.push({ file: p, ...r });
      }
    }
  };
  walk(dir, 0);
  return out;
}

/**
 * The raw reports for every cycle: { byCycle: Map(cycle → [report]), uncited: [report], conflicts: [] }.
 * @param {Array<{cycle: number, file: string}>} cycles
 */
function reportsForCycles(cycles, { runDir, stageDir, resolveEvidenceRef, extractEvidenceRefs }) {
  const all = fs.existsSync(stageDir) ? discoverReports(stageDir) : [];
  const key = (f) => path.resolve(f).toLowerCase();
  const byFile = new Map(all.map((r) => [key(r.file), r]));
  const byCycle = new Map();
  const cited = new Set();
  for (const c of cycles) {
    let text = '';
    try { text = fs.readFileSync(c.file, 'utf8'); } catch { /* unreadable */ }
    const refs = extractEvidenceRefs(text).filter((r) => /\.(xml|json)$/i.test(r));
    const reps = [];
    for (const ref of refs) {
      const res = resolveEvidenceRef(ref, { runDir, resultsDir: path.dirname(c.file) });
      if (res.status !== 'ok') continue;
      const rep = byFile.get(key(res.path)) || (() => { const r = parseReport(res.path); return r ? { file: res.path, ...r } : null; })();
      if (rep && !reps.some((x) => key(x.file) === key(rep.file))) { reps.push(rep); cited.add(key(rep.file)); }
    }
    byCycle.set(c.cycle, reps);
  }
  const uncited = all.filter((r) => !cited.has(key(r.file)));
  const conflicts = [];
  if (uncited.length && cycles.length === 1) {
    byCycle.set(cycles[0].cycle, [...byCycle.get(cycles[0].cycle), ...uncited]);
  } else if (uncited.length) {
    conflicts.push({ testCaseId: '(run)', kind: 'framework-report-unattributed', detail: `raw framework report(s) ${uncited.map((r) => toPosix(path.relative(runDir, r.file))).join(', ')} are in the run but cited by no results cycle — with ${cycles.length} cycles they cannot be attributed, so the normalized results cannot be confirmed against them` });
  }
  return { byCycle, uncited, conflicts };
}

/**
 * Compares one normalized result with the cycle's raw reports.
 * @returns {{state: 'verified'|'contradicted'|'absent'|'no-report', raw: object|null, effective: string, why: string|null, conflict: object|null}}
 */
function compareResult({ testCaseId, recorded, effective, reports, runDir, cycle }) {
  if (!reports || !reports.length) return { state: 'no-report', raw: null, effective, why: null, conflict: null };
  const hits = reports.flatMap((r) => r.tests.filter((t) => t.id === testCaseId).map((t) => ({ ...t, report: toPosix(path.relative(runDir, r.file)), format: r.format })));
  const where = reports.map((r) => toPosix(path.relative(runDir, r.file))).join(', ');
  if (!hits.length) {
    if (effective === 'Passed' || effective === 'Unverified') {
      return { state: 'absent', raw: null, effective: 'Unverified', why: `recorded as Passed, but the framework report (${where}) has no result for it — nothing independently shows it ran`, conflict: { testCaseId, kind: 'framework-identity-mismatch', detail: `cycle ${cycle} records ${recorded} for it, but ${where} contains no such test` } };
    }
    return { state: 'absent', raw: null, effective, why: null, conflict: { testCaseId, kind: 'framework-identity-mismatch', detail: `cycle ${cycle} records ${recorded} for it, but ${where} contains no such test` } };
  }
  const rawStatus = hits.some((h) => h.status === 'Failed') ? 'Failed' : hits.some((h) => h.status === 'Skipped') ? 'Skipped' : hits.some((h) => h.status === 'Flaky') ? 'Flaky' : 'Passed';
  const raw = { status: rawStatus, report: hits[0].report, format: hits[0].format, name: hits[0].name };
  const normalizedPass = ['Passed', 'Unverified', 'Flaky', 'Automation Repaired'].includes(effective) || recorded === 'Passed';
  if (rawStatus === 'Failed' && normalizedPass) {
    return { state: 'contradicted', raw, effective: 'Failed', why: `recorded as ${recorded}, but the framework's own report (${raw.report}) records a failure — raw framework evidence is never overridden by a normalized Passed`, conflict: { testCaseId, kind: 'framework-contradiction', detail: `cycle ${cycle} records ${recorded}; ${raw.report} (${raw.format}) records Failed for ${raw.name}` } };
  }
  if (rawStatus === 'Skipped' && normalizedPass) {
    return { state: 'contradicted', raw, effective: 'Unverified', why: `recorded as ${recorded}, but the framework report (${raw.report}) shows it was skipped`, conflict: { testCaseId, kind: 'framework-contradiction', detail: `cycle ${cycle} records ${recorded}; ${raw.report} records Skipped` } };
  }
  if (rawStatus === 'Passed' && !normalizedPass && !['Excluded', 'Not Executed'].includes(effective)) {
    return { state: 'contradicted', raw, effective, why: null, conflict: { testCaseId, kind: 'framework-contradiction', detail: `cycle ${cycle} records ${recorded}; ${raw.report} records Passed — the recorded failure stands, but the two disagree` } };
  }
  return { state: 'verified', raw, effective, why: null, conflict: null };
}

/** Tests a cycle's raw reports contain that its results file does not, and count mismatches. */
function cycleIdentityConflicts({ cycle, reports, recordedIds, runDir }) {
  const conflicts = [];
  if (!reports || !reports.length) return conflicts;
  const rawIds = new Map();
  for (const r of reports) for (const t of r.tests) if (t.id) rawIds.set(t.id, toPosix(path.relative(runDir, r.file)));
  for (const [id, file] of rawIds) {
    if (!recordedIds.has(id)) conflicts.push({ testCaseId: id, kind: 'framework-identity-mismatch', detail: `${file} records a result for it, but cycle ${cycle}'s results file does not` });
  }
  const rawCount = reports.reduce((n, r) => n + r.tests.length, 0);
  if (rawCount !== recordedIds.size) {
    conflicts.push({ testCaseId: '(cycle)', kind: 'framework-count-mismatch', detail: `cycle ${cycle}: the framework report(s) record ${rawCount} test(s); the results file records ${recordedIds.size}` });
  }
  return conflicts;
}

module.exports = { caseIdOf, parseJUnit, parsePlaywright, parseReport, discoverReports, reportsForCycles, compareResult, cycleIdentityConflicts };
