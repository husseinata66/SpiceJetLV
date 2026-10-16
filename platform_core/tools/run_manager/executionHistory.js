// Execution history — every execution cycle of a run, read from the result files themselves.
//
// WHY THIS EXISTS
// pipeline.md §6 Rule 7b: an execution's recorded outcomes are never overwritten. A rerun writes
// `*.rerun-N.md` beside the original, and the original stays cycle 1. Until now nothing read that
// history back: outcome counts were typed in by hand, a repaired pass could read as a clean pass,
// and a rewritten cycle-1 file would go unnoticed.
//
// WHAT IT READS — files only, never a summary written about them:
//   4M        runs/{run}/manual_execution/ManualExecutionResults.md        (+ .rerun-N.md)
//   5A / 5H   runs/{run}/execution/ExecutionResults.md                     (+ .rerun-N.md)
//   each file's per-test table: Test Case ID · Status · reason / failure detail · Evidence Refs
//   runs/{run}/metadata/CapabilityPlan.md   — cases excluded as not supported by the supplier
//   modules/{m}/healing/QuarantineRegister.md, BeforeAfterComparison.md — Stage 5H records
//
// HOW A TEST'S FINAL STATUS IS DECIDED (testStatus.js gives each status its meaning)
//   - the status in the LAST cycle that executed it, as recorded;
//   - Passed after an earlier Automation Failure, in a rerun Stage 5H produced → Automation Repaired
//     (pipeline.md §5.6.5 — a repaired pass is never a clean pass). A Repair Summary on its own proves
//     nothing: only a rerun result showing Passed does;
//   - Passed after an earlier failure in a rerun nothing repaired → Flaky (inconsistent across
//     executions with no change);
//   - Passed counts only when its assertion records verify it (assertionEvidence.js, pipeline.md §11.4):
//     none → Unverified; a failed, uncheckable or self-contradicting assertion → Inconclusive (and a
//     conflict); an unsourced expected value or a cited evidence file that is missing → Unverified.
//     The recorded status is kept beside it (`history[].status` raw, `history[].effective`);
//   - two rows for one case in one cycle, or an ID two modules share with no module named → Inconclusive;
//   - listed in the Quarantine Register → Quarantined;
//   - excluded by the Capability Plan → Excluded ("Not supported by supplier"), even when a result was
//     recorded — that result is kept as evidence, with a conflict.
// The first-attempt status and every cycle's status are kept beside it. Nothing is deleted.

const fs = require('fs');
const path = require('path');

const { fingerprintFile } = require('./artifactHeader');
const { normalizeStatus, dependenciesIn, health, categoryOf } = require('./testStatus');
const ae = require('./assertionEvidence');

const RESULT_FILES = Object.freeze({
  '4M': { dir: 'manual_execution', base: 'ManualExecutionResults' },
  '5A': { dir: 'execution', base: 'ExecutionResults' },
  '5H': { dir: 'execution', base: 'ExecutionResults' },
});

const clean = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/[*`]/g, '').trim();
const isEmpty = (s) => !s || /^(—|-|–|n\/a|none)$/i.test(clean(s));
const cells = (line) => { const p = line.split('|'); return p.slice(1, p.length - 1).map((c) => c.trim()); };

/** Every results file of a stage, cycle 1 first, reruns in numeric order (rerun-10 after rerun-9). */
function listCycles(runDir, stageId) {
  const spec = RESULT_FILES[stageId];
  if (!spec) return [];
  const dir = path.join(runDir, spec.dir);
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return []; }
  const out = [];
  if (names.includes(`${spec.base}.md`)) out.push({ rerun: null, file: path.join(dir, `${spec.base}.md`) });
  for (const n of names) {
    const m = n.match(new RegExp(`^${spec.base}\\.rerun-(\\d+)\\.md$`));
    if (m) out.push({ rerun: Number(m[1]), file: path.join(dir, n) });
  }
  out.sort((a, b) => (a.rerun ?? 0) - (b.rerun ?? 0));
  return out.map((c, i) => ({ ...c, cycle: i + 1 }));
}

/**
 * The per-test results table of one results file: the first table whose header has a Test Case ID
 * and a Status column plus an execution column (time, attempts, script, reason, failure detail).
 * A case ID may be module-qualified ("login:TC-1"); a Module column, when present, names the module.
 * @returns {Array<{testCaseId: string, module: string|null, status: string, raw: string, reason: string|null,
 *                  evidence: string|null, order: number, line: number}>}
 */
function parseResultsTable(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|/.test(lines[i])) continue;
    const header = cells(lines[i]).map((h) => clean(h).toLowerCase());
    const col = (...names) => header.findIndex((h) => names.some((n) => h.startsWith(n)));
    // The test-case column is "Test Case ID", or "Test Case" in tables that number their rows first.
    const iId = header.findIndex((h) => h === 'test case id' || h === 'test case');
    const iStatus = header.findIndex((h) => h === 'status' || h.startsWith('status '));
    const execution = col('execution time', 'attempts', 'automation script', 'reason', 'failure detail', 'observed');
    if (iId === -1 || iStatus === -1 || execution === -1) continue;
    const iReason = col('reason', 'failure detail');
    const iModule = header.findIndex((h) => h === 'module');
    // Evidence: an Evidence column, or the observed values a manual result records inline
    // ("Observed", "Reason / observation") — manual-execution-skill §8 evidences a pass by them.
    const iObserved = header.findIndex((h) => /observ/.test(h));
    const iEvidence = col('evidence') !== -1 ? col('evidence') : iObserved;
    const rows = [];
    for (let j = i + 2; j < lines.length && /^\|/.test(lines[j]); j += 1) {
      const row = cells(lines[j]);
      const ref = ae.parseCaseRef(row[iId]);
      if (!ref) continue;
      const s = normalizeStatus(row[iStatus]);
      const reason = iReason === -1 || isEmpty(row[iReason]) ? s.reason : clean(row[iReason]);
      const evidence = iEvidence === -1 ? null : (isEmpty(row[iEvidence]) ? '' : clean(row[iEvidence]));
      const module = (iModule !== -1 && !isEmpty(row[iModule]) ? clean(row[iModule]) : null) || ref.module;
      rows.push({ testCaseId: ref.id, module, status: s.status, raw: s.raw, reason, evidence, order: rows.length + 1, line: j + 1 });
    }
    return rows;
  }
  return [];
}

/** Test case IDs in a table whose header begins with a Test Case column, under a given heading. */
function idsUnderHeading(file, headingRe) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => headingRe.test(l));
  if (start === -1) return [];
  const out = [];
  for (let i = start + 1; i < lines.length && !/^#{1,2}\s/.test(lines[i]); i += 1) {
    const row = /^\|/.test(lines[i]) ? cells(lines[i]) : null;
    if (!row) continue;
    const id = clean(row[0]);
    if (/^TC-[A-Z0-9-]*\d$/i.test(id)) out.push({ id, row: row.map(clean) });
  }
  return out;
}

/** Which stage a rerun file belongs to, from the run state's artifact registrations. */
/**
 * Is a pass of `testId` in the 5H rerun `file` backed by a governed repair? True when a repair attempt for
 * the test was validated as fixed with exactly that rerun (repairGovernance.validateRepair records it). A
 * legacy run predates the governance record and keeps its recorded reading — historical runs are read as
 * they were written, never re-judged.
 */
function governedRepair(meta, ids, file) {
  if (meta.stateSchemaVersion === undefined) return true;
  const norm = (p) => String(p || '').replace(/\\/g, '/');
  for (const op of (meta.stages?.['5H']?.repairOperations || [])) {
    for (const [tc, list] of Object.entries(op.attempts || {})) {
      if (!ids.includes(tc)) continue;
      if ((list || []).some((a) => a.result === 'fixed' && a.validation && norm(a.validation.rerun) === norm(file))) return true;
    }
  }
  return false;
}

function producedBy(meta, rel, stageId) {
  for (const id of ['5H', '5A', '4M']) {
    if ((meta.stages?.[id]?.artifacts || []).some((a) => a.path.replace(/\\/g, '/').endsWith(rel))) return id;
  }
  return stageId === '4M' ? '4M' : null;
}

/**
 * The approved suites of a run's scope (module, Feature or Supplier roots), read from TestCases_*.md:
 *   owners — case ID → the scope labels whose suite defines it (identity across modules);
 *   cases  — "<label>:<ID>" → the case's text and Expected Result, read from the version of the suite
 *            this stage CONSUMED (consumedVersions.js); `verifiable` is false when that version is not
 *            recorded or cannot be retrieved — expected values then cannot be sourced from it.
 * A run that names no scope (legacy) has none.
 */
function suiteIndex(meta, dataRoot, runDir, stageId) {
  const empty = { available: false, multi: false, roots: [], owners: new Map(), cases: new Map(), suites: [], consumed: [] };
  const scoped = (Array.isArray(meta.modules) && meta.modules.length > 0) || Boolean(meta.scopeFamily);
  if (!scoped) return empty;
  // eslint-disable-next-line global-require
  const { resolveScopeRoots, upstreamArtifacts, consumedRefs, upstreamSource } = require('./stageGate');
  // eslint-disable-next-line global-require
  const { parseTestCases } = require('../test_suite_export/parseTestCases');
  // eslint-disable-next-line global-require
  const { readConsumedVersion, VERIFIED_BASES } = require('./consumedVersions');
  // eslint-disable-next-line global-require
  const { parseDesignAssertions } = require('./assertionContract');
  const { roots } = resolveScopeRoots(meta, dataRoot);
  const out = { ...empty, roots: roots.map((r) => r.module || r.label), multi: roots.length > 1 };
  const relOf = (abs) => path.relative(dataRoot, abs).replace(/\\/g, '/');

  // What this execution consumed. 4M reads the suite itself. 5A executes automation, so its expected
  // values come from the suite version Stage 4A was built on — this run's 4A, or the 4A approval it
  // consumed in another run. 5H executes 5A's scope. Its own references come first.
  const runsDir = path.dirname(runDir);
  const folderName = path.basename(runDir);
  const refs = [...consumedRefs(meta, stageId)];
  const add = (list) => { for (const r of list) if (!refs.some((x) => x.artifact === r.artifact)) refs.push(r); };
  if (stageId === '5H') add(consumedRefs(meta, '5A'));
  if (stageId === '5A' || stageId === '5H') {
    for (const root of roots) {
      const src = upstreamSource(runsDir, folderName, meta, '4A', root, dataRoot);
      if (src) add(consumedRefs(src.meta, '4A'));
    }
  }
  out.consumed = refs.filter((r) => /\.md$/i.test(r.artifact)).map((r) => ({ artifact: r.artifact, sha256: r.sha256, ...readConsumedVersion(r, dataRoot) }));

  for (const root of roots) {
    const label = root.module || root.label;
    const prefix = relOf(path.join(root.dir, 'test_design')) + '/';
    // The suites this run is bound to (PE-03: its own approved Stage 3; the folder only for a run without
    // one), plus any suite this stage consumed that has since gone. Another run's suite is never read here.
    // eslint-disable-next-line global-require
    const { runBoundSuites } = require('./suiteBinding');
    const bound = runBoundSuites(meta, root, { dataRoot });
    const current = (bound.basis === 'run-approved' ? bound.suites : upstreamArtifacts('3', root, runDir)).map(relOf);
    out.binding = [...(out.binding || []), { scope: label, basis: bound.basis, reason: bound.reason, unbound: bound.unbound.map(relOf) }];
    const consumedHere = out.consumed.filter((c) => c.artifact.startsWith(prefix) && /\/TestCases_.+\.md$/.test(c.artifact)).map((c) => c.artifact);
    for (const rel of [...new Set([...current, ...consumedHere])]) {
      const consumed = out.consumed.find((c) => c.artifact === rel);
      // Expected values are verified against the consumed version only. With no record of what was
      // consumed, or a version that cannot be retrieved, the current suite still says which cases
      // exist (identity) — but never where an expected value comes from.
      const basis = consumed ? consumed.basis : 'unrecorded';
      const verifiable = VERIFIED_BASES.includes(basis);
      let text = verifiable ? consumed.text : null;
      if (text === null) { try { text = fs.readFileSync(path.resolve(dataRoot, rel), 'utf8'); } catch { continue; } }
      let cases = [];
      try { cases = parseTestCases(text, { sourceLabel: path.basename(rel) }).cases; } catch { continue; }
      out.suites.push({ suite: rel, basis, ...(consumed && consumed.source ? { source: consumed.source } : {}) });
      for (const c of cases) {
        out.owners.set(c.id, [...new Set([...(out.owners.get(c.id) || []), label])]);
        const caseText = ['title', 'objective', 'preconditions', 'testData', 'steps', 'expectedResult', 'notes']
          .map((k) => (Array.isArray(c[k]) ? c[k].join('\n') : c[k] || '')).join('\n');
        // The case's approved assertion design, from the same (consumed) version — Phase 5.8.
        const design = c.assertions ? parseDesignAssertions(c.assertions) : null;
        out.cases.set(`${label}:${c.id}`, {
          text: caseText, expectedResult: c.expectedResult || '', suite: rel, basis, verifiable,
          ...(design ? { design: design.rows, designIssues: design.issues } : {}),
        });
      }
    }
  }
  out.available = out.cases.size > 0;
  return out;
}

/**
 * The execution history of a stage in a run. Pure read.
 * @param {string} runsDir
 * @param {string} folderName
 * @param {'4M'|'5A'|'5H'} stageId
 * @returns {object} see the module header
 */
function buildHistory(runsDir, folderName, stageId) {
  const dataRoot = path.dirname(runsDir);
  const runDir = path.join(runsDir, folderName);
  const rel = (p) => path.relative(dataRoot, p).replace(/\\/g, '/');
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(runDir, 'metadata', 'run.json'), 'utf8')); } catch { /* legacy or absent */ }

  // 5A's own outcome covers the cycles 5A produced; 5H's covers everything up to its reruns.
  const all = listCycles(runDir, stageId).map((c) => ({ ...c, rel: rel(c.file), producedBy: c.rerun === null ? (stageId === '4M' ? '4M' : '5A') : producedBy(meta, rel(c.file), stageId) }));
  const cycles = stageId === '5A' ? all.filter((c) => c.producedBy !== '5H') : all;
  const parsed = cycles.map((c) => ({ ...c, sha256: fingerprintFile(c.file), results: parseResultsTable(fs.readFileSync(c.file, 'utf8')) }));

  const modules = Array.isArray(meta.modules) ? meta.modules : [];
  const quarantineFiles = modules.map((m) => path.join(dataRoot, 'modules', m, 'healing', 'QuarantineRegister.md')).filter((f) => fs.existsSync(f));
  const quarantined = new Set(quarantineFiles.flatMap((f) => (idsUnderHeading(f, /^##\s+1\.\s+Currently Quarantined/i) || []).map((x) => x.id)));
  const beforeAfter = modules.map((m) => path.join(dataRoot, 'modules', m, 'healing', 'BeforeAfterComparison.md')).filter((f) => fs.existsSync(f));
  const planFile = path.join(runDir, 'metadata', 'CapabilityPlan.md');
  const excludedByPlan = new Map((idsUnderHeading(planFile, /^##\s+Excluded\b/i) || []).map((x) => [x.id, x.row[2] || 'Not supported by supplier']));

  // The approved suite(s) of the run's scope: which module owns each case ID (identity), and each case's
  // text and Expected Result (where an assertion's expected value must come from). A run that names no
  // scope (a legacy run) has none — identity stays the bare ID, and no expected value can be sourced
  // from a test case.
  const idx = suiteIndex(meta, dataRoot, runDir, stageId);
  const parsedCycles = parsed.map((c) => ({ ...c, assertions: ae.parseAssertionRecords(fs.readFileSync(c.file, 'utf8')) }));

  // Identity: the bare ID in a single-scope run (unchanged); module-qualified when the run spans several
  // modules. An ID two modules share, with no module named on the row, cannot be attributed.
  const identify = (r) => {
    if (!idx.multi) return { key: r.testCaseId, label: idx.roots[0] || null };
    if (r.module && idx.roots.includes(r.module)) return { key: `${r.module}:${r.testCaseId}`, label: r.module };
    const owners = idx.owners.get(r.testCaseId) || [];
    if (owners.length === 1) return { key: `${owners[0]}:${r.testCaseId}`, label: owners[0] };
    if (owners.length > 1) return { key: r.testCaseId, label: null, ambiguous: owners };
    return { key: r.testCaseId, label: null };
  };

  const conflicts = [];
  const evidenceIssues = [];
  const tests = new Map();
  // Raw framework reports (Phase 9.2, F-08): automated results are compared with the framework's own report.
  // eslint-disable-next-line global-require
  const fe = require('./frameworkEvidence');
  const fw = (stageId === '5A' || stageId === '5H')
    ? fe.reportsForCycles(parsedCycles, { runDir, stageDir: path.join(runDir, RESULT_FILES[stageId].dir), resolveEvidenceRef: ae.resolveEvidenceRef, extractEvidenceRefs: ae.extractEvidenceRefs })
    : null;
  if (fw) conflicts.push(...fw.conflicts);
  for (const c of parsedCycles) {
    const seen = new Map();
    if (fw) conflicts.push(...fe.cycleIdentityConflicts({ cycle: c.cycle, reports: fw.byCycle.get(c.cycle), recordedIds: new Set(c.results.map((x) => x.testCaseId)), runDir }));
    for (const r of c.results) {
      const ident = identify(r);
      if (!tests.has(ident.key)) tests.set(ident.key, { testCaseId: ident.key, id: r.testCaseId, module: ident.label, history: [] });
      const t = tests.get(ident.key);
      if (ident.ambiguous) t.ambiguous = ident.ambiguous;
      // Assertion records for this case, from the same results file (the same cycle).
      const records = c.assertions.filter((a) => a.testCaseId === r.testCaseId && (!a.module || !ident.label || a.module === ident.label));
      const tc = ident.label ? idx.cases.get(`${ident.label}:${r.testCaseId}`) : null;
      const ctx = {
        caseText: tc ? tc.text : null, expectedResult: tc ? tc.expectedResult : null,
        sourceVersion: tc ? { basis: tc.basis, verifiable: tc.verifiable, suite: tc.suite } : null,
        consumed: idx.consumed, runDir, resultsDir: path.dirname(c.file),
        ...(tc && tc.design ? { design: tc.design, designIssues: tc.designIssues } : {}),
      };
      const ev = ae.evaluateAssertions(records, ctx);
      const rowEvidence = ae.checkEvidence(r.evidence, ctx);
      for (const e of [...rowEvidence, ...ev.evidence].filter((x) => x.status !== 'ok')) {
        evidenceIssues.push({ testCaseId: ident.key, cycle: c.cycle, file: c.rel, ref: e.ref, status: e.status, ...(e.assertion ? { assertion: e.assertion } : {}) });
        if (e.status === 'outside' || e.status === 'traversal') {
          conflicts.push({ testCaseId: ident.key, kind: 'evidence-reference-refused', detail: `cycle ${c.cycle} cites "${e.ref}", which resolves ${e.status === 'traversal' ? 'through a parent-folder (..) path' : 'outside this run folder'} — evidence is read only from inside the run` });
        }
      }

      // What the recorded status amounts to (the raw status is kept beside it).
      let effective = r.status;
      let why = null;
      if (r.status === 'Passed') {
        const badRow = rowEvidence.filter((x) => x.status !== 'ok');
        if (ev.state === 'verified' && !badRow.length) effective = 'Passed';
        else if (['failed', 'contradiction', 'inconclusive'].includes(ev.state)) {
          effective = 'Inconclusive';
          why = ev.state === 'inconclusive' ? 'recorded as Passed, but an assertion could not be checked (pipeline.md §11.4)'
            : `recorded as Passed, but its assertion evidence ${ev.state === 'failed' ? 'shows a failed assertion' : 'contradicts itself'}`;
        } else {
          effective = 'Unverified';
          why = ev.state === 'none'
            ? 'recorded as Passed, but no assertion records show what was checked (pipeline.md §11.4) — a screenshot, log or captured value alone is not proof'
            : `recorded as Passed, but its assertions are not verified — ${[...ev.issues, ...badRow.map((x) => `evidence "${x.ref}": ${x.status}`)].join('; ')}`;
        }
      }
      // Raw framework evidence is never overridden by a normalized Passed (F-08).
      const fwc = fw ? fe.compareResult({ testCaseId: r.testCaseId, recorded: r.status, effective, reports: fw.byCycle.get(c.cycle), runDir, cycle: c.cycle }) : null;
      if (fwc && fwc.effective !== effective) { effective = fwc.effective; why = fwc.why; }
      if (fwc && fwc.conflict) conflicts.push({ ...fwc.conflict, testCaseId: ident.key });
      if (ev.state === 'failed' && r.status === 'Passed') {
        conflicts.push({ testCaseId: ident.key, kind: 'assertion-failed-but-passed', detail: `cycle ${c.cycle} records Passed, but ${ev.failed} of its ${ev.recorded} assertion(s) failed — a failed assertion is never a pass` });
      }
      if (ev.contradictions.length) {
        conflicts.push({ testCaseId: ident.key, kind: (ev.duplicate || []).length ? 'duplicate-assertion-record' : 'assertion-contradiction', detail: `cycle ${c.cycle}: ${ev.contradictions.join('; ')}` });
      }
      if ((ev.expectedChanged || []).length) {
        conflicts.push({ testCaseId: ident.key, kind: 'assertion-expected-changed', detail: `cycle ${c.cycle}: the recorded Expected of ${ev.expectedChanged.join(', ')} is not the approved one — an execution never changes what is expected` });
      }
      if (['app-failure', 'auto-failure'].includes(categoryOf(r.status)) && ev.state === 'verified') {
        conflicts.push({ testCaseId: ident.key, kind: 'failed-but-assertions-passed', detail: `cycle ${c.cycle} records ${r.raw}, but every recorded assertion passed — the record contradicts itself` });
      }
      t.history.push({
        cycle: c.cycle, file: c.rel, line: r.line, producedBy: c.producedBy, status: r.status, effective, raw: r.raw,
        reason: why || r.reason, evidence: r.evidence,
        assertions: {
          state: ev.state, recorded: ev.recorded, passed: ev.passed, failed: ev.failed, unchecked: ev.unchecked,
          coverage: ev.coverage, ...(ctx.sourceVersion ? { sourceVersion: ctx.sourceVersion.basis } : {}),
          ...(ev.issues.length ? { issues: ev.issues } : {}),
        },
        ...(rowEvidence.length ? { evidenceRefs: rowEvidence.map(({ ref, status }) => ({ ref, status })) } : {}),
        framework: fwc ? { state: fwc.state, ...(fwc.raw ? { raw: fwc.raw } : {}) } : { state: 'no-report' },
      });
      seen.set(ident.key, [...(seen.get(ident.key) || []), r]);
    }
    // Two rows for one case in one cycle: which one is the result cannot be decided — both are kept.
    for (const [key, rows] of seen) {
      if (rows.length < 2) continue;
      tests.get(key).duplicateCycles = [...(tests.get(key).duplicateCycles || []), c.cycle];
      conflicts.push({ testCaseId: key, kind: 'duplicate-result-row', detail: `cycle ${c.cycle} (${c.rel}) has ${rows.length} rows for it — ${rows.map((x) => `line ${x.line}: ${x.raw}`).join(', ')}; none is chosen` });
    }
  }
  const byPlainId = (id) => [...tests.values()].find((t) => t.id === id);
  for (const [id, reason] of excludedByPlan) {
    const t = byPlainId(id);
    if (!t) tests.set(id, { testCaseId: id, id, module: null, history: [], excludedByPlan: reason });
    else t.excludedByPlan = reason;
  }

  const unrecognized = [];
  const unattributed = [];
  for (const t of tests.values()) {
    const first = t.history[0];
    const last = t.history[t.history.length - 1];
    t.firstStatus = first ? first.effective : 'Excluded';
    let final = last ? last.effective : 'Excluded';
    let finalReason = last ? last.reason : (t.excludedByPlan ? `Not supported by supplier — ${t.excludedByPlan}` : null);
    if (last && last.status === 'Unrecognized') unrecognized.push({ testCaseId: t.testCaseId, raw: last.raw, file: last.file });
    // Repair and flakiness are about what was RECORDED as failing earlier; the later pass must be verified.
    const earlier = t.history.slice(0, -1);
    const failedBefore = earlier.filter((h) => ['app-failure', 'auto-failure', 'env-failure', 'unverified'].includes(categoryOf(h.status)));
    if (last && final === 'Passed' && failedBefore.length) {
      if (last.producedBy === '5H' && failedBefore.every((h) => h.status === 'Automation Failure') && !governedRepair(meta, [t.id, t.testCaseId], last.file)) {
        // A pass in a 5H rerun is a REPAIR only when the repair was governed (Phase 9.3, workflow enforcement):
        // a validated attempt for this test (state heal propose → approve → apply → validate) whose validating
        // rerun is this cycle. Without one, nothing shows the change was approved, applied as approved, or
        // even made — so it is never labelled a repair, and the gap is named.
        final = 'Flaky';
        finalReason = `failed in cycle ${failedBefore[0].cycle} (Automation Failure), passed in Stage 5H rerun cycle ${last.cycle} — but no validated repair attempt covers it, so it is not counted as repaired`;
        conflicts.push({ testCaseId: t.testCaseId, kind: 'repair-not-governed', detail: `passed in the Stage 5H rerun ${last.file}, but no repair attempt for ${t.id} was validated with that rerun (state heal validate) — an ungoverned change, or no change at all; it is not Automation Repaired` });
      } else if (last.producedBy === '5H' && failedBefore.every((h) => h.status === 'Automation Failure')) {
        final = 'Automation Repaired';
        finalReason = `failed in cycle ${failedBefore[0].cycle} (Automation Failure), passed in cycle ${last.cycle} after a Stage 5H repair`;
      } else if (last.producedBy === '5H' && failedBefore.some((h) => categoryOf(h.status) === 'app-failure')) {
        conflicts.push({ testCaseId: t.testCaseId, kind: 'application-failure-later-passed', detail: `recorded as an application failure in cycle ${failedBefore[0].cycle}, then Passed after a Stage 5H rerun — 5H must never heal an application failure; review it` });
      } else if (last.producedBy === null) {
        // A legacy rerun: nothing records which stage produced it, so it can be called neither a repair
        // nor a flaky result. It stays as recorded, and is listed.
        unattributed.push({ testCaseId: t.testCaseId, detail: `failed in cycle ${failedBefore[0].cycle}, passed in cycle ${last.cycle}; which stage produced that rerun is not recorded — kept as recorded` });
      } else if (last.producedBy !== '5H') {
        final = 'Flaky';
        finalReason = `failed in cycle ${failedBefore[0].cycle}, passed in cycle ${last.cycle} with no repair in between`;
      }
    }
    if (quarantined.has(t.id)) {
      finalReason = `listed in the Quarantine Register (last recorded: ${final})`;
      final = 'Quarantined';
    }
    // Identity that cannot be established is never a result.
    if (last && t.duplicateCycles && t.duplicateCycles.includes(last.cycle)) {
      final = 'Inconclusive';
      finalReason = `cycle ${last.cycle} has more than one row for this case — which one is the result cannot be decided`;
    }
    if (t.ambiguous) {
      conflicts.push({ testCaseId: t.testCaseId, kind: 'ambiguous-case-id', detail: `${t.id} is a case in ${t.ambiguous.join(' and ')}, and the result names no module — qualify it as <module>:${t.id} or fill the Module column` });
      final = 'Inconclusive';
      finalReason = `ambiguous across modules (${t.ambiguous.join(', ')})`;
    }
    // A capability the Supplier lacks (Capability Plan, ndc_execution_rules.md §A15): Excluded, outside the
    // executable denominator, never a failure. A result recorded anyway stays as raw evidence.
    if (t.excludedByPlan && last && last.status !== 'Excluded') {
      conflicts.push({ testCaseId: t.testCaseId, kind: 'unsupported-capability-executed', detail: `the Capability Plan excludes it (${t.excludedByPlan}), but cycle ${last.cycle} records ${last.raw} — counted Excluded, never as an application failure; the recorded result is kept as evidence` });
      t.firstStatus = 'Excluded';
      final = 'Excluded';
      finalReason = `Not supported by supplier — ${t.excludedByPlan}; recorded as ${last.raw} (kept as evidence)`;
    }
    t.finalStatus = final;
    t.finalReason = finalReason;
    if (final === 'Blocked') t.blockedBy = dependenciesIn(finalReason);
  }

  // Approved scope (Phase 5.6A, audit finding #3): a result for a case outside the exact scope this
  // stage's entry gate recorded — a case still Pending or Rejected at Review, one not approved for
  // automation, one the partial scope did not request, or one not in the suite at all — is never
  // counted as executed. It is counted Excluded, with a conflict that keeps what was recorded. The
  // result files are not touched, and every cycle's recorded status stays in `history`.
  // 5H reports on the cases 5A was authorised to run. With no recorded scope, a case that is not in the
  // run's approved suite at all is treated the same way (Phase 5.6B, finding #6).
  const scope = meta.stages?.[stageId]?.entryGate?.executableScope
    || (stageId === '5H' ? meta.stages?.['5A']?.entryGate?.executableScope : null) || null;
  const inScope = (t) => {
    if (scope) {
      if (t.testCaseId.includes(':') && Array.isArray(scope.qualified)) return scope.qualified.includes(t.testCaseId);
      return (scope.cases || []).includes(t.id);
    }
    return !idx.available || [...idx.cases.keys()].some((k) => k === t.testCaseId || k.endsWith(`:${t.id}`));
  };
  for (const t of tests.values()) {
    if (t.excludedByPlan || !t.history.length || t.ambiguous || inScope(t)) continue;
    const last = t.history[t.history.length - 1];
    const why = scope
      ? ((scope.notApproved || {})[t.id] || (scope.basis === 'partial-scope' ? 'not in the partial scope this stage was started for' : 'not in the approved suite this stage started from'))
      : "not a case of the run's approved suite";
    conflicts.push({
      testCaseId: t.testCaseId, kind: scope ? 'outside-approved-scope' : 'not-in-approved-suite',
      detail: `recorded ${last.raw} in cycle ${last.cycle}, but it is outside the approved scope${scope ? ` this stage started with (${scope.basis}: ${why})` : ` (${why})`} — counted Excluded, never as a result`,
    });
    t.firstStatus = 'Excluded';
    t.finalStatus = 'Excluded';
    t.finalReason = `Outside the approved scope (${why}); recorded as ${last.raw}`;
    delete t.blockedBy;
  }

  // Assertion evidence of the results that were recorded as Passed (their last cycle).
  const assertionSummary = { verified: 0, unverified: 0, inconclusive: 0, failed: 0, contradiction: 0, none: 0 };
  // How much of each verified pass's Expected Result its records visibly cover (assertionCoverage): a
  // textual lower bound, reported apart — `partial` is never presented as complete verification.
  const assertionCoverage = { complete: 0, partial: 0, unknown: 0, unmapped: [], missing: [], failed: [], extra: [], structured: 0, textual: 0 };
  for (const t of tests.values()) {
    const last = t.history[t.history.length - 1];
    if (!last || last.status !== 'Passed') continue;
    assertionSummary[last.assertions.state] += 1;
    const cv = last.assertions.coverage || {};
    if (cv.mode === 'structured') {
      assertionCoverage.structured += 1;
      if ((cv.missing || []).length) assertionCoverage.missing.push({ testCaseId: t.testCaseId, ids: cv.missing });
      if ((cv.failed || []).length) assertionCoverage.failed.push({ testCaseId: t.testCaseId, ids: cv.failed });
      if ((cv.extra || []).length) assertionCoverage.extra.push({ testCaseId: t.testCaseId, ids: cv.extra });
    } else assertionCoverage.textual += 1;
    if (last.assertions.state === 'verified' && t.finalStatus !== 'Excluded') {
      const cov = last.assertions.coverage || { state: 'unknown', unmapped: [] };
      assertionCoverage[cov.state] += 1;
      if (cov.unmapped.length) assertionCoverage.unmapped.push({ testCaseId: t.testCaseId, clauses: cov.unmapped });
    }
  }

  const count = (pick) => {
    const c = {};
    for (const t of tests.values()) { const s = pick(t); c[s] = (c[s] || 0) + 1; }
    return c;
  };
  const counts = count((t) => t.finalStatus);
  const firstAttemptCounts = count((t) => t.firstStatus);
  const failing = new Set([...tests.values()].filter((t) => ['app-failure', 'auto-failure', 'env-failure'].includes(categoryOf(t.finalStatus)) || t.finalStatus === 'Blocked').map((t) => t.testCaseId));
  const dependentFailures = [...tests.values()]
    .filter((t) => ['app-failure', 'auto-failure', 'env-failure'].includes(categoryOf(t.finalStatus)))
    .map((t) => ({ testCaseId: t.testCaseId, dependsOn: dependenciesIn(t.finalReason).filter((d) => failing.has(d)) }))
    .filter((x) => x.dependsOn.length);
  const h = health(counts);
  h.application.independentFailures = h.application.failures - dependentFailures.filter((d) => categoryOf(tests.get(d.testCaseId).finalStatus) === 'app-failure').length;

  return {
    stageId,
    folderName,
    cycles: parsed.map((c) => ({ cycle: c.cycle, rerun: c.rerun, file: c.rel, producedBy: c.producedBy, sha256: c.sha256, results: c.results.length })),
    tests: [...tests.values()],
    counts,
    firstAttemptCounts,
    health: h,
    blocked: [...tests.values()].filter((t) => t.finalStatus === 'Blocked').map((t) => ({ testCaseId: t.testCaseId, reason: t.finalReason, blockedBy: t.blockedBy })),
    dependentFailures,
    conflicts,
    // Framework verification of each test's latest result (F-08): never claimed without a raw report.
    framework: (() => {
      const last = [...tests.values()].map((t) => (t.history.length ? t.history[t.history.length - 1].framework : null)).filter(Boolean);
      const n = (s) => last.filter((x) => x.state === s).length;
      return { reports: fw ? [...new Set([...fw.byCycle.values()].flat().map((r) => r.file))].length : 0, verified: n('verified'), contradicted: n('contradicted'), absent: n('absent'), noReport: n('no-report') };
    })(),
    unrecognized,
    unattributed,
    assertionSummary,
    assertionCoverage,
    evidenceIssues,
    identity: { qualified: idx.multi, suites: idx.suites.map((x) => x.suite), binding: idx.binding || [] },
    sourceVersions: idx.suites,
    scope: scope ? { basis: scope.basis, cases: (scope.cases || []).length, recordedBy: stageId === '5H' && !meta.stages?.['5H']?.entryGate?.executableScope ? '5A' : stageId } : { basis: 'not-recorded' },
    capability: { plan: fs.existsSync(planFile) ? rel(planFile) : null, excluded: [...excludedByPlan.keys()] },
    sources: {
      quarantineRegisters: quarantineFiles.map(rel),
      beforeAfterComparisons: beforeAfter.map((f) => ({ file: rel(f), sha256: fingerprintFile(f) })),
    },
  };
}

module.exports = {
  RESULT_FILES,
  listCycles,
  parseResultsTable,
  suiteIndex,
  buildHistory,
};
