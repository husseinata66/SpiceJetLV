// Change impact analysis — what a change to an approved artifact reaches, before anyone makes it.
//
// WHY THIS EXISTS
// pipeline.md §7: a change to an approved artifact sends it back through its gate. What was missing is
// the step before: knowing what the change would invalidate. A one-line edit to a Project Context row
// can silently change what dozens of approved, automated, executed test cases assert — in this module,
// another module that cites it, and every Supplier of a Feature. This module answers that, so a human
// approves the impact before the approved artifact is touched.
//
// WHAT IT DOES (read-only)
//   1. Changed items: named explicitly (`changed`), or found by comparing the artifact with an earlier
//      version — a git revision (`base`, read through `git show`, never checked out) or a given text.
//      Items are compared by ID: requirement / decision IDs and sections in a Project Context, finding
//      IDs in Discovery, test case IDs in a suite. Added and removed items are reported too.
//   2. Reach: through the traceability graph (traceGraph.js) — every case that traces to a changed item,
//      its automation decision, its execution results and the reports of those runs; items an Approval
//      Scope `Affects`; other modules that cite the item as `module:ID`; and, for a Feature-level or
//      shared Supplier artifact, every Supplier of that Feature (each Supplier is independent, so each is
//      listed for a human to confirm, never assumed).
//   3. Classification: BLOCKING when the change reaches anything already approved, automated or
//      executed — approved work would change meaning; NON-BLOCKING when it reaches only pending or new
//      work. Either way a human decides (runState.recordImpactDecision); nothing is applied here.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { kindOf, findScopeApproval } = require('./scopeApproval');
const { fingerprintFile, readArtifactApprovalStatus } = require('./artifactHeader');

const ID_TOKEN = /\b(?:TC-[A-Z0-9-]*\d|FINDING-\d+|[A-Z]{2,7}-\d+[A-Za-z]?)\b/g;
const list = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };

class ImpactError extends Error {
  constructor(message, code = 'IMPACT') { super(message); this.name = 'ImpactError'; this.code = code; }
}

/**
 * Each item's content in a text, keyed by ID: for a test suite, the case's own block; otherwise every
 * line that names the ID, plus each numbered section's body (§n).
 */
function itemsOf(text, kind) {
  const out = {};
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  if (kind === 'test_design') {
    let id = null;
    for (const line of lines) {
      const h = line.match(/^###\s+(TC-[A-Z0-9-]*\d)\b/);
      if (h) { id = h[1]; out[id] = ''; continue; }
      if (/^#{1,2}\s/.test(line)) id = null;
      if (id) out[id] += `${line.trim()}\n`;
    }
    return out;
  }
  let section = null;
  for (const line of lines) {
    const h = line.match(/^#{2,4}\s+(\d+(?:\.\d+)*)\.?\s/);
    if (h) section = `§${h[1]}`;
    else if (/^#\s/.test(line)) section = null;
    if (section) out[section] = `${out[section] || ''}${line.trim()}\n`;
    for (const m of line.matchAll(ID_TOKEN)) {
      if (/^TC-/.test(m[0]) && kind !== 'test_design') continue;
      out[m[0]] = `${out[m[0]] || ''}${line.trim()}\n`;
    }
  }
  return out;
}

function diffItems(before, after) {
  const changed = [];
  const added = [];
  const removed = [];
  for (const id of Object.keys(after)) {
    if (!(id in before)) added.push(id);
    else if (before[id] !== after[id]) changed.push(id);
  }
  for (const id of Object.keys(before)) if (!(id in after)) removed.push(id);
  return { changed, added, removed };
}

/** The artifact's text at a git revision, read-only. */
function textAtRevision(file, base, execFileSync) {
  const cwd = path.dirname(file);
  const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
  const rel = path.relative(top, file).replace(/\\/g, '/');
  return execFileSync('git', ['show', `${base}:${rel}`], { cwd: top, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Which scope an artifact belongs to, from its path — never inferred from its content. */
function scopeOf(dataRoot, file) {
  const rel = path.relative(dataRoot, file).replace(/\\/g, '/');
  let m = rel.match(/^modules\/([^/]+)\/features\/([^/]+)\/(context|discovery|test_design)\//);
  if (m) return { family: 'module', module: m[1], feature: m[2], label: `${m[1]}/${m[2]}`, area: m[3], rel };
  m = rel.match(/^modules\/([^/]+)\/(context|discovery|test_design)\//);
  if (m) return { family: 'module', module: m[1], label: m[1], area: m[2], rel };
  m = rel.match(/^supplier-features\/([^/]+)\/suppliers\/([^/]+)\/(context|discovery|test_design)\//);
  if (m) return { family: 'supplier', feature: m[1], supplier: m[2], label: `${m[1]}/${m[2]}`, area: m[3], rel };
  m = rel.match(/^supplier-features\/([^/]+)\/shared\/([^/]+)\/(context|discovery|test_design)\//);
  if (m) return { family: 'shared', feature: m[1], sharedScope: m[2], label: `${m[1]}/shared/${m[2]}`, area: m[3], rel };
  m = rel.match(/^supplier-features\/([^/]+)\/(context|discovery|test_design)\//);
  if (m) return { family: 'feature', feature: m[1], label: m[1], area: m[2], rel };
  throw new ImpactError(`${rel} is not inside a module, Feature, Supplier or shared scope folder.`, 'UNKNOWN_SCOPE');
}

const AREA_KIND = { context: 'context', discovery: 'discovery', test_design: 'test_design' };

/**
 * Analyses the impact of a change to one artifact. Pure read.
 *
 * @param {string} runsDir
 * @param {object} opts
 * @param {string} opts.artifact - path (absolute, or relative to the data root)
 * @param {string[]} [opts.changed] - the changed item IDs, when stated explicitly
 * @param {string} [opts.base] - a git revision to compare with (e.g. HEAD)
 * @param {string} [opts.beforeText] - the earlier text, when given directly
 * @param {Function} [opts.execFileSync] - for `base`
 * @returns {object} the analysis; `id` is a fingerprint of its content
 */
function analyzeImpact(runsDir, opts = {}) {
  // eslint-disable-next-line global-require
  const { rootGraph } = require('./traceGraph');
  const dataRoot = path.dirname(runsDir);
  const file = path.isAbsolute(opts.artifact) ? opts.artifact : path.resolve(dataRoot, opts.artifact);
  if (!fs.existsSync(file)) throw new ImpactError(`${opts.artifact} does not exist.`, 'MISSING_ARTIFACT');
  const scope = scopeOf(dataRoot, file);
  const kind = AREA_KIND[scope.area];

  // 1. What changed.
  let delta;
  if (Array.isArray(opts.changed) && opts.changed.length) {
    delta = { changed: [...new Set(opts.changed)], added: [], removed: [], basis: 'stated' };
  } else {
    let before = opts.beforeText;
    if (before === undefined && opts.base) {
      if (!opts.execFileSync) throw new ImpactError('Comparing with a git revision needs git (execFileSync).', 'NO_BASIS');
      try { before = textAtRevision(file, opts.base, opts.execFileSync); } catch (err) {
        throw new ImpactError(`Cannot read ${scope.rel} at ${opts.base}: ${String(err.message).split('\n')[0]}. Name the changed items instead.`, 'NO_BASIS');
      }
    }
    if (before === undefined) throw new ImpactError('No basis to compare: name the changed items, or give a git revision to compare with.', 'NO_BASIS');
    delta = { ...diffItems(itemsOf(before, kind), itemsOf(fs.readFileSync(file, 'utf8'), kind)), basis: opts.base ? `git ${opts.base}` : 'given text' };
  }
  const touched = [...delta.changed, ...delta.added, ...delta.removed];
  if (!touched.length) {
    return finalize({ artifact: scope.rel, scope, kind, delta, affected: emptyAffected(), classification: 'none', reasons: ['no item changed'] }, file);
  }

  // 2. Reach — within the artifact's own scope root.
  const roots = [];
  if (scope.family === 'module') {
    roots.push({ label: scope.label, module: scope.module, dir: path.join(dataRoot, 'modules', scope.module, ...(scope.feature ? ['features', scope.feature] : [])) });
  } else if (scope.family === 'supplier') {
    roots.push({ label: scope.label, module: null, dir: path.join(dataRoot, 'supplier-features', scope.feature, 'suppliers', scope.supplier) });
  } else if (scope.family === 'shared') {
    roots.push({ label: scope.label, module: null, dir: path.join(dataRoot, 'supplier-features', scope.feature, 'shared', scope.sharedScope) });
  }
  const affected = emptyAffected();
  const reasons = [];
  const graphs = roots.map((r) => rootGraph(runsDir, r));

  // Items an Approval Scope says a changed item affects are reached too.
  const reach = new Set(touched);
  const header = readArtifactApprovalStatus(file);
  const scopeRecord = header.status === 'Mixed' ? findScopeApproval(runsDir, file, { dataRoot }) : null;
  for (const g of graphs) {
    const table = g.context && g.context.scope;
    for (const id of touched) for (const a of (table && table[id] && table[id].affects) || []) reach.add(a);
  }
  if (scopeRecord && scopeRecord.record) {
    for (const id of touched) {
      const it = scopeRecord.record.items[id];
      if (it && it.status === 'Pending') reasons.push(`${id} is Pending in the recorded Approval Scope; its change must not silently alter approved items`);
    }
  }

  for (const g of graphs) {
    for (const tc of Object.values(g.testCases)) {
      const viaDeps = (tc.dependsOn || []).filter((d) => reach.has(d));
      const self = kind === 'test_design' && reach.has(tc.id);
      if (!viaDeps.length && !self) continue;
      const approved = /^approved$/i.test(String(tc.review).trim());
      affected.testCases.push({
        scope: g.root.label, id: tc.id, review: tc.review, automation: tc.automation,
        via: self ? ['itself'] : viaDeps, automationDecision: tc.automationDecision, executions: tc.executions,
      });
      if (approved) affected.approvedTestCases.push(tc.id);
      if (tc.automationDecision && !/manual/i.test(tc.automationDecision)) affected.automation.push({ id: tc.id, decision: tc.automationDecision });
      for (const e of tc.executions) affected.executions.push({ id: tc.id, ...e });
    }
    for (const r of g.reports) if (affected.executions.some((e) => e.run === r.run)) affected.reports.push(r);
    if (kind === 'discovery') for (const id of touched) if (g.findings.has(id)) affected.findings.push(id);
  }
  if (kind === 'context') {
    for (const g of graphs) {
      for (const tc of Object.values(g.testCases)) {
        for (const d of tc.dependsOn || []) if (kindOf(d) === 'discovery' && affected.testCases.some((a) => a.id === tc.id)) affected.findings.push(d);
      }
    }
  }
  affected.findings = [...new Set(affected.findings)];

  // Other modules that cite these items as `module:ID`.
  if (scope.family === 'module') {
    for (const m of list(path.join(dataRoot, 'modules'))) {
      if (m === scope.module) continue;
      const g = rootGraph(runsDir, { label: m, module: m, dir: path.join(dataRoot, 'modules', m) });
      for (const tc of Object.values(g.testCases)) {
        const hits = (tc.dependsOn || []).filter((d) => d.includes(':') && d.split(':')[0] === scope.module && reach.has(d.split(':')[1]));
        if (hits.length) {
          affected.testCases.push({ scope: m, id: tc.id, review: tc.review, automation: tc.automation, via: hits, executions: tc.executions });
          if (/^approved$/i.test(String(tc.review).trim())) affected.approvedTestCases.push(`${m}:${tc.id}`);
        }
      }
    }
  }

  // Suppliers: a Feature-level or shared artifact reaches every Supplier of the Feature.
  if (scope.family === 'feature' || scope.family === 'shared') {
    affected.suppliers = list(path.join(dataRoot, 'supplier-features', scope.feature, 'suppliers'));
    if (affected.suppliers.length) reasons.push(`a ${scope.family === 'shared' ? 'shared' : 'Feature-level'} change reaches every Supplier of ${scope.feature} (${affected.suppliers.join(', ')}) — each is independent and must be confirmed separately`);
  } else if (scope.family === 'supplier') {
    affected.suppliers = [scope.supplier];
  }
  affected.modules = [...new Set([scope.module, ...affected.testCases.map((t) => t.scope.split('/')[0])].filter(Boolean))];
  if (scope.family === 'module') {
    const registered = new Set(list(path.join(dataRoot, 'modules')));
    for (const t of affected.testCases) for (const v of t.via) if (v.includes(':') && !registered.has(v.split(':')[0])) reasons.push(`${t.id} cites ${v}, whose module is not registered — the Module Manager proposes modules; none is created here`);
  }

  // 3. Classification.
  const approvedHeader = header.status === 'Approved' || header.status === 'Mixed';
  if (approvedHeader) reasons.push(`${scope.rel} is ${header.status} — an approved artifact is changing`);
  if (affected.approvedTestCases.length) reasons.push(`${affected.approvedTestCases.length} approved test case(s) trace to the changed item(s)`);
  if (affected.automation.length) reasons.push(`${affected.automation.length} case(s) are automated`);
  if (affected.executions.length) reasons.push(`${affected.executions.length} execution result(s) were produced under the earlier version`);
  if (delta.removed.length) reasons.push(`removed: ${delta.removed.join(', ')} — removing coverage is never silent`);
  const blocking = approvedHeader || affected.approvedTestCases.length || affected.automation.length || affected.executions.length || delta.removed.length;
  if (!blocking) reasons.push('only pending or new work is reached');

  return finalize({ artifact: scope.rel, scope, kind, delta, affected, classification: blocking ? 'blocking' : 'non-blocking', reasons, crossModule: affected.modules.length > 1 }, file);
}

function emptyAffected() {
  return { modules: [], suppliers: [], findings: [], testCases: [], approvedTestCases: [], automation: [], executions: [], reports: [] };
}

function finalize(analysis, file) {
  const body = { ...analysis, artifactSha256: fingerprintFile(file), crossModule: Boolean(analysis.crossModule), humanDecisionRequired: true };
  return { id: `IA-${crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12)}`, ...body };
}

module.exports = {
  ImpactError,
  itemsOf,
  diffItems,
  scopeOf,
  analyzeImpact,
};
