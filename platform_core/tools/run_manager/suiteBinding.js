// Suite binding — which Stage 3 suites a run is bound to, and which Traceability Matrix belongs to a suite
// (PE-03, 2026-10-11).
//
// WHY THIS EXISTS
// A scope folder (`<root>/test_design/`) can hold the suites of more than one run: a companion suite written
// by a later run sits beside the suite an earlier run is still reviewing. Reading "every TestCases_*.md in
// the folder" made one run's pending suite block another run's execution, put the other run's cases into
// its executable scope, and paired every suite with whichever `TraceabilityMatrix.md` happened to be there.
//
// THE RULE
//   run-approved     — the run's OWN Stage 3 is Completed and Approved: the run is bound to exactly the
//                      suites that approval recorded (`approval.headerEvidence`), under this scope root.
//                      Every other suite in the folder is reported as unbound — never consumed, never passed.
//   folder-fallback  — the run has no approved Stage 3 of its own (it consumes another run's approval, it
//                      is still reviewing its own, or it predates this rule): every TestCases_*.md in the
//                      folder, exactly as before. The fallback is stated in diagnostics, never silent.
//
// A suite's matrix is the TraceabilityMatrix*.md that a run's Stage 3 recorded beside that suite. The selected
// run's own record wins. Several candidates and no deciding record → ambiguous: no matrix is used, and the
// ambiguity is reported. With no record at all, the legacy `TraceabilityMatrix.md` is used only when it is
// the folder's only matrix.
//
// Pure reads. Nothing here writes, approves, or relaxes a check: a bound suite still passes every check
// the gate applies to it.

const fs = require('fs');
const path = require('path');

const SUITE_RE = /^TestCases_.+\.md$/;
const MATRIX_RE = /^TraceabilityMatrix.*\.md$/;
const LEGACY_MATRIX = 'TraceabilityMatrix.md';

function samePath(a, b) {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

function within(dir, file) {
  const rel = path.relative(path.resolve(dir), path.resolve(file));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** A path recorded in run.json, resolved against the data root (absolute, root-relative, or prefixed with the root's own name). */
function resolveRecorded(ref, dataRoot) {
  if (path.isAbsolute(ref)) return path.resolve(ref);
  const candidates = [path.resolve(dataRoot, ref)];
  const slashed = String(ref).replace(/\\/g, '/');
  const prefix = `${path.basename(dataRoot)}/`;
  if (slashed.startsWith(prefix)) candidates.push(path.resolve(dataRoot, slashed.slice(prefix.length)));
  return candidates.find((c) => fs.existsSync(c)) || candidates[candidates.length - 1];
}

function listDir(dir, re) {
  try { return fs.readdirSync(dir).filter((n) => re.test(n)).sort().map((n) => path.join(dir, n)); } catch { return []; }
}

const uniqPaths = (list) => list.filter((p, i) => list.findIndex((q) => samePath(p, q)) === i);

/**
 * The Stage 3 suites run `meta` is bound to under one scope root.
 * @param {object} meta   the run's run.json
 * @param {{dir: string, label?: string}} root
 * @param {{dataRoot: string}} opts
 * @returns {{basis: 'run-approved'|'folder-fallback', reason: string, suites: string[], unbound: string[], recorded: string[]}}
 *   suites   — absolute paths this run consumes under the root
 *   unbound  — suites present in the folder that this run is NOT bound to (run-approved only)
 *   recorded — every artifact path the run's own Stage 3 recorded under the root's test_design (absolute)
 */
function runBoundSuites(meta, root, { dataRoot }) {
  const tdDir = path.join(root.dir, 'test_design');
  const inFolder = listDir(tdDir, SUITE_RE);
  const own = meta && meta.stages ? meta.stages['3'] : null;
  const recorded = own
    ? uniqPaths([...(own.artifacts || []).map((a) => a.path), ...((own.approval && own.approval.headerEvidence) || []).map((e) => e.path)]
      .filter(Boolean).map((p) => resolveRecorded(p, dataRoot)).filter((p) => within(tdDir, p)))
    : [];
  const fallback = (reason) => ({ basis: 'folder-fallback', reason, suites: inFolder, unbound: [], recorded });

  if (!own) return fallback('this run has no Stage 3 of its own — every TestCases_*.md in the folder is required (legacy behaviour)');
  if (own.status !== 'Completed' || !own.approval || own.approval.status !== 'Approved') {
    return fallback(`this run's own Stage 3 is ${own.status}${own.approval && own.approval.status ? ` (${own.approval.status})` : ''}, not approved — every TestCases_*.md in the folder is required (legacy behaviour)`);
  }
  const approved = uniqPaths((own.approval.headerEvidence || []).map((e) => e.path).filter(Boolean)
    .map((p) => resolveRecorded(p, dataRoot))
    .filter((p) => within(tdDir, p) && SUITE_RE.test(path.basename(p))));
  if (!approved.length) {
    return fallback('this run\'s Stage 3 approval recorded no suite under this scope — every TestCases_*.md in the folder is required (legacy behaviour)');
  }
  return {
    basis: 'run-approved',
    reason: `bound to the ${approved.length} suite(s) this run's Stage 3 approved`,
    suites: approved,
    unbound: inFolder.filter((f) => !approved.some((a) => samePath(a, f))),
    recorded,
  };
}

/** Every run.json under runsDir that carries the run state model (legacy runs are skipped). */
function readRuns(runsDir) {
  let entries = [];
  try { entries = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return []; }
  const out = [];
  for (const e of entries) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(runsDir, e.name, 'metadata', 'run.json'), 'utf8'));
      if (m.stateSchemaVersion && m.stages) out.push({ run: e.name, meta: m });
    } catch { /* unreadable — not a source */ }
  }
  return out;
}

/** The matrices one run's Stage 3 recorded beside `suite` (same folder), when it recorded that suite. */
function matricesRecordedWith(meta, suite, dataRoot) {
  const own = meta && meta.stages ? meta.stages['3'] : null;
  if (!own) return [];
  const paths = [...(own.artifacts || []).map((a) => a.path), ...((own.approval && own.approval.headerEvidence) || []).map((e) => e.path)]
    .filter(Boolean).map((p) => resolveRecorded(p, dataRoot));
  if (!paths.some((p) => samePath(p, suite))) return [];
  const dir = path.dirname(suite);
  return uniqPaths(paths.filter((p) => samePath(path.dirname(p), dir) && MATRIX_RE.test(path.basename(p))));
}

/**
 * The Traceability Matrix that belongs to `suite`.
 * @param {string} runsDir
 * @param {string} suite  absolute path of a TestCases_*.md
 * @param {{dataRoot?: string, preferMeta?: object, preferRun?: string}} [opts]  the selected run, whose record wins
 * @returns {{file: string|null, basis: 'recorded-by-run'|'recorded'|'legacy-default'|'ambiguous'|'none', detail: string}}
 */
function resolveSuiteMatrix(runsDir, suite, { dataRoot = path.dirname(runsDir), preferMeta = null, preferRun = null } = {}) {
  const dir = path.dirname(suite);
  const name = path.basename(suite);
  if (preferMeta) {
    const mine = matricesRecordedWith(preferMeta, suite, dataRoot);
    if (mine.length === 1) return { file: mine[0], basis: 'recorded-by-run', detail: `${path.basename(mine[0])} — recorded with ${name} by ${preferRun || 'the selected run'}'s Stage 3` };
    if (mine.length > 1) return { file: null, basis: 'ambiguous', detail: `${preferRun || 'the selected run'}'s Stage 3 recorded ${mine.length} matrices with ${name} (${mine.map((m) => path.basename(m)).join(', ')}) — which one applies is not decided` };
  }
  const byRun = [];
  for (const r of readRuns(runsDir)) {
    for (const m of matricesRecordedWith(r.meta, suite, dataRoot)) byRun.push({ run: r.run, file: m });
  }
  const distinct = uniqPaths(byRun.map((x) => x.file));
  if (distinct.length === 1) {
    const runs = [...new Set(byRun.filter((x) => samePath(x.file, distinct[0])).map((x) => x.run))];
    return { file: distinct[0], basis: 'recorded', detail: `${path.basename(distinct[0])} — recorded with ${name} by Stage 3 of ${runs.join(', ')}` };
  }
  if (distinct.length > 1) {
    return { file: null, basis: 'ambiguous', detail: `runs recorded different matrices with ${name} (${byRun.map((x) => `${x.run}: ${path.basename(x.file)}`).join('; ')}) — which one applies is not decided` };
  }
  const inFolder = listDir(dir, MATRIX_RE);
  const legacy = path.join(dir, LEGACY_MATRIX);
  if (inFolder.length === 1 && samePath(inFolder[0], legacy)) {
    return { file: legacy, basis: 'legacy-default', detail: `${LEGACY_MATRIX} — no run recorded a matrix with ${name}; it is the folder's only matrix (legacy behaviour)` };
  }
  if (inFolder.length > 1) {
    return { file: null, basis: 'ambiguous', detail: `no run recorded a matrix with ${name}, and the folder holds ${inFolder.length} (${inFolder.map((m) => path.basename(m)).join(', ')}) — another suite's matrix is never assumed` };
  }
  return { file: null, basis: 'none', detail: inFolder.length ? `no run recorded a matrix with ${name}, and ${path.basename(inFolder[0])} is not the legacy default` : `no Traceability Matrix for ${name}` };
}

module.exports = { runBoundSuites, resolveSuiteMatrix, SUITE_RE, MATRIX_RE, LEGACY_MATRIX };
