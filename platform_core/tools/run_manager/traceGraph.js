// Traceability graph — Requirement → Discovery Finding → Test Case → Automation → Execution → Report.
//
// WHY THIS EXISTS
// pipeline.md §8 requires every artifact from Stage 3 on to trace back, ID for ID, to the Project
// Context. The links exist — the Traceability Matrix cites requirements and findings, the Automation
// Decision Report decides each case, execution results name each case, reports cite each run — but
// nothing read them as one chain. So a missing link, a case still citing a superseded decision, or a
// change whose reach crosses modules could only be found by reading everything by hand.
//
// WHAT IT READS (never writes), per scope root — module, module Feature, Supplier or shared scope,
// resolved the same way the entry gate resolves them (stageGate.resolveScopeRoots):
//   context/ProjectContext.md           requirement / decision IDs, sections (§n), superseded markers
//   discovery/findings/FINDING-*        finding IDs
//   test_design/TestCases_*.md          cases and their Review / Automation decisions
//   test_design/TraceabilityMatrix.md   each case's requirement / finding / acceptance references
//   automation/AutomationDecisionReport_*.md   each case's automation decision
//   runs/*  (in this scope)             execution history per case (executionHistory.js), reports
// Any `## Approval Scope` table is read too (scopeApproval.js).

const fs = require('fs');
const path = require('path');

const { parseTraceability, parseApprovalScopeTable, kindOf, dependenciesFromTraceRow } = require('./scopeApproval');

const ID_RE = /\b(?!TC-|FINDING-)[A-Z]{2,7}-\d+[A-Za-z]?\b/g;
const clean = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/[*`]/g, '').trim();
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const list = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };

/** IDs and sections a Project Context defines, which IDs it marks superseded, and each ID's definition rows. */
function readProjectContext(file) {
  const text = read(file);
  if (text === null) return null;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const defined = new Set();
  const definitions = {};
  const superseded = {};
  for (const line of lines) {
    const h = line.match(/^#{2,4}\s+(\d+(?:\.\d+)*)\.?\s/);
    if (h) defined.add(`§${h[1]}`);
    for (const m of line.matchAll(ID_RE)) defined.add(m[0]);
    // A definition row: a table row whose first cell names the ID.
    const first = /^\|/.test(line) ? clean(line.split('|')[1]) : '';
    const id = (first.match(ID_RE) || [])[0];
    if (id && first.startsWith(id)) {
      definitions[id] = clean(line);
      if (/superseded/i.test(first)) superseded[id] = first;
    }
  }
  let scope = null;
  try { scope = parseApprovalScopeTable(text); } catch { scope = null; }
  return { file, defined, definitions, superseded, scope };
}

function readAutomationDecisions(dir) {
  const out = {};
  for (const n of list(dir).filter((x) => /^AutomationDecisionReport_.+\.md$/.test(x))) {
    for (const line of (read(path.join(dir, n)) || '').split(/\r?\n/)) {
      if (!/^\|/.test(line)) continue;
      const cells = line.split('|').slice(1, -1).map(clean);
      if (/^TC-/.test(cells[0] || '') && cells[1]) out[cells[0]] = { decision: cells[1], file: n };
    }
  }
  return out;
}

/** Runs whose scope covers a root, newest last. */
function runsForRoot(runsDir, root) {
  const out = [];
  for (const name of list(runsDir).sort()) {
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(runsDir, name, 'metadata', 'run.json'), 'utf8')); } catch { continue; }
    // A run covers a module when it names it in `modules[]`, or — for runs written before `modules[]`
    // was recorded — when its owner (the folder-name prefix, run_manager.md §5.1.1) names it.
    const owners = String(meta.runOwner || name.split('-run-')[0] || '').split('.')[0].split('+');
    const covers = root.module
      ? ((Array.isArray(meta.modules) && meta.modules.includes(root.module)) || (!meta.modules && owners.includes(root.module)))
      : (meta.scopeFamily === 'supplier-feature' && root.label === `${meta.feature}/${meta.supplier || `shared/${meta.sharedScope}`}`);
    if (covers) out.push({ name, meta });
  }
  return out;
}

/**
 * The graph for one scope root.
 * @returns {object} { root, context, findings, testCases: {id: {...}}, runs, reports }
 */
function rootGraph(runsDir, root, { executions = true, suites = null, preferMeta = null, preferRun = null } = {}) {
  // eslint-disable-next-line global-require
  const { parseTestCases } = require('../test_suite_export/parseTestCases');
  // eslint-disable-next-line global-require
  const { buildHistory, listCycles } = require('./executionHistory');
  // eslint-disable-next-line global-require
  const { parseDesignAssertions } = require('./assertionContract');
  const context = readProjectContext(path.join(root.dir, 'context', 'ProjectContext.md'));
  const findings = new Set(list(path.join(root.dir, 'discovery', 'findings')).map((n) => (n.match(/^FINDING-\d+/) || [])[0]).filter(Boolean));
  const tdDir = path.join(root.dir, 'test_design');
  // PE-03: each suite is read with ITS OWN Traceability Matrix — the one a run's Stage 3 recorded with it.
  // eslint-disable-next-line global-require
  const { resolveSuiteMatrix } = require('./suiteBinding');
  const traceCache = new Map();
  const matrices = [];
  const automation = readAutomationDecisions(path.join(root.dir, 'automation'));

  const testCases = {};
  // `suites` (absolute paths) narrows the graph to the suites a run is bound to; omitted, every suite in the
  // folder is read (impact analysis must still reach them all).
  const suiteNames = suites
    ? suites.map((p) => path.basename(p)).filter((x) => /^TestCases_.+\.md$/.test(x)).sort()
    : list(tdDir).filter((x) => /^TestCases_.+\.md$/.test(x));
  for (const n of suiteNames) {
    const { cases } = parseTestCases(read(path.join(tdDir, n)) || '', { sourceLabel: n });
    const m = resolveSuiteMatrix(runsDir, path.join(tdDir, n), { preferMeta, preferRun });
    matrices.push({ suite: n, matrix: m.file ? path.basename(m.file) : null, basis: m.basis, detail: m.detail });
    if (m.file && !traceCache.has(m.file)) traceCache.set(m.file, parseTraceability(read(m.file) || ''));
    const trace = m.file ? traceCache.get(m.file) : {};
    for (const c of cases) {
      testCases[c.id] = {
        id: c.id, suite: n, title: c.title, review: c.review, automation: c.automation,
        dependsOn: trace[c.id] ? trace[c.id].dependsOn : null,
        covers: trace[c.id] ? trace[c.id].covers : null, // dependsOn plus expanded ranges (SRCH-02…09)
        // The requirement IDs its Assertions table names, read the same way as a Matrix row (§6.1a: each
        // must also be in the case's Matrix row). Empty for a case with no table.
        assertionRequirements: c.assertions
          ? [...new Set(parseDesignAssertions(c.assertions).rows.flatMap((r) => dependenciesFromTraceRow({ requirement: r.requirement }).dependsOn))]
          : [],
        automationDecision: automation[c.id] ? automation[c.id].decision : null,
        executions: [],
      };
    }
  }

  const runs = executions ? runsForRoot(runsDir, root) : [];
  const reports = [];
  for (const r of runs) {
    // 5A and 5H share the execution/ folder: read it once, through its full history (original plus every
    // rerun), so a result is never counted twice.
    for (const [stageId, label] of [['4M', '4M'], ['5H', '5A/5H']]) {
      if (!listCycles(path.join(runsDir, r.name), stageId).length) continue;
      let h;
      try { h = buildHistory(runsDir, r.name, stageId); } catch { continue; }
      for (const t of h.tests) {
        if (testCases[t.testCaseId]) testCases[t.testCaseId].executions.push({ run: r.name, stage: label, status: t.finalStatus, firstStatus: t.firstStatus });
      }
    }
    for (const rel of ['reporting', 'manual_execution']) {
      for (const n of list(path.join(runsDir, r.name, rel)).filter((x) => /^(Final_QA_Report|ManualQAReport)(\.rev-\d+)?\.md$/.test(x))) {
        reports.push({ run: r.name, file: `${rel}/${n}` });
      }
    }
  }
  return { root, context, findings, testCases, runs: runs.map((r) => r.name), reports, matrices };
}

/**
 * The graph for every scope root of a run, plus its gaps and conflicts.
 * @param {string} runsDir
 * @param {string} folderName
 * @param {{modules?: string[]}} [opts] - scope override, only for a run that names no scope
 */
function buildTraceGraph(runsDir, folderName, opts = {}) {
  // eslint-disable-next-line global-require
  const { resolveScopeRoots } = require('./stageGate');
  const dataRoot = path.dirname(runsDir);
  const meta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
  const runHasScope = (Array.isArray(meta.modules) && meta.modules.length) || meta.scopeFamily;
  const { roots, problem } = resolveScopeRoots(meta, dataRoot, runHasScope ? {} : opts);
  // PE-03: a run's trace covers the suites it is bound to (its own approved Stage 3; else the folder).
  // eslint-disable-next-line global-require
  const { runBoundSuites } = require('./suiteBinding');
  const graphs = roots.map((r) => {
    const bound = runBoundSuites(meta, r, { dataRoot });
    const g = rootGraph(runsDir, r, { suites: bound.suites, preferMeta: meta, preferRun: folderName });
    g.binding = { basis: bound.basis, reason: bound.reason, unbound: bound.unbound.map((f) => path.relative(dataRoot, f).replace(/\\/g, '/')) };
    return g;
  });
  return { folderName, problem, roots: graphs.map((g) => g.root.label), graphs, gaps: findGaps(graphs), conflicts: findConflicts(graphs) };
}

/** Links that should exist and do not. Reported; never repaired here. */
function findGaps(graphs) {
  const gaps = [];
  for (const g of graphs) {
    const scope = g.root.label;
    // PE-03: a suite whose matrix cannot be decided is reported — its cases are never traced through
    // another suite's matrix.
    for (const m of g.matrices || []) {
      if (m.basis === 'ambiguous') gaps.push({ scope, kind: 'traceability-matrix-ambiguous', item: m.suite, detail: m.detail });
    }
    const defined = g.context ? g.context.defined : new Set();
    const referenced = new Set();
    for (const tc of Object.values(g.testCases)) {
      if (tc.dependsOn === null) { gaps.push({ scope, kind: 'case-without-trace', item: tc.id, detail: `${tc.id} has no Traceability Matrix row — it traces to no requirement` }); continue; }
      for (const d of tc.assertionRequirements || []) {
        if (!(tc.covers || tc.dependsOn).includes(d)) gaps.push({ scope, kind: 'assertion-requirement-not-traced', item: tc.id, detail: `${tc.id} has an assertion verifying ${d}, which its Traceability Matrix row does not cite` });
      }
      for (const d of tc.dependsOn) {
        if (d.includes(':')) continue; // another module's item: checked by impact analysis, not here
        referenced.add(d);
        if (kindOf(d) === 'discovery') {
          if (!g.findings.has(d)) gaps.push({ scope, kind: 'unknown-finding', item: tc.id, detail: `${tc.id} cites ${d}, which is not a finding of ${scope}` });
        } else if (g.context && !defined.has(d)) {
          gaps.push({ scope, kind: 'unknown-requirement', item: tc.id, detail: `${tc.id} cites ${d}, which its Project Context does not define` });
        }
      }
      const approved = /^approved$/i.test(String(tc.review).trim());
      if (approved && /^approved$/i.test(String(tc.automation).trim()) && !tc.automationDecision) {
        gaps.push({ scope, kind: 'automation-undecided', item: tc.id, detail: `${tc.id} is approved for automation, but no Automation Decision Report decides it` });
      }
      if (approved && !tc.executions.length) gaps.push({ scope, kind: 'not-executed', item: tc.id, detail: `${tc.id} is approved but has no execution result in any run of ${scope}` });
    }
    if (!g.context) gaps.push({ scope, kind: 'no-project-context', item: scope, detail: `${scope} has no Project Context` });
    for (const run of g.runs) {
      const executed = Object.values(g.testCases).some((tc) => tc.executions.some((e) => e.run === run));
      if (executed && !g.reports.some((r) => r.run === run)) gaps.push({ scope, kind: 'execution-without-report', item: run, detail: `run ${run} has execution results but no report` });
    }
    for (const id of [...(g.context ? Object.keys(g.context.definitions) : [])]) {
      if (/^(AC|REQ|BR)-/.test(id) && !referenced.has(id)) gaps.push({ scope, kind: 'requirement-without-case', item: id, detail: `${id} is defined but no test case traces to it` });
    }
  }
  return gaps;
}

/** Contradictions a human must decide. Each has a stable id, so its decision can be recorded once. */
function findConflicts(graphs) {
  const crypto = require('crypto'); // eslint-disable-line global-require
  const conflicts = [];
  const add = (c) => conflicts.push({ id: `CF-${crypto.createHash('sha256').update(`${c.kind}|${c.scope}|${c.items.join(',')}`).digest('hex').slice(0, 10)}`, ...c });
  for (const g of graphs) {
    const sup = g.context ? g.context.superseded : {};
    for (const tc of Object.values(g.testCases)) {
      if (!/^approved$/i.test(String(tc.review).trim())) continue;
      for (const d of tc.dependsOn || []) {
        if (sup[d]) {
          add({
            kind: 'superseded-reference', scope: g.root.label, items: [tc.id, d],
            sources: [path.basename(g.context.file), 'TraceabilityMatrix.md'],
            affected: [tc.id],
            detail: `${tc.id} is approved but traces to ${d}, which the Project Context marks "${sup[d]}" — the case may assert a rule that no longer holds`,
          });
        }
      }
    }
  }
  // The same ID defined differently in two scopes of one run.
  for (let i = 0; i < graphs.length; i += 1) {
    for (let j = i + 1; j < graphs.length; j += 1) {
      const a = graphs[i].context; const b = graphs[j].context;
      if (!a || !b) continue;
      for (const id of Object.keys(a.definitions)) {
        if (b.definitions[id] && b.definitions[id] !== a.definitions[id]) {
          add({
            kind: 'definition-differs', scope: `${graphs[i].root.label} / ${graphs[j].root.label}`, items: [id],
            sources: [graphs[i].root.label, graphs[j].root.label], affected: [],
            detail: `${id} is defined in both ${graphs[i].root.label} and ${graphs[j].root.label} with different text — if it is one shared rule, the two may contradict each other`,
          });
        }
      }
    }
  }
  return conflicts;
}

/**
 * Whether each scope's approved Project Context can be reused as it is (pipeline.md §7 "Reusing design
 * output across runs needs no mechanism") — through the same check the entry gate makes.
 */
function contextReuse(runsDir, folderName) {
  // eslint-disable-next-line global-require
  const { resolveScopeRoots, checkStageEntry } = require('./stageGate');
  const meta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
  const { roots } = resolveScopeRoots(meta, path.dirname(runsDir));
  const g = checkStageEntry(runsDir, folderName, { stageId: '2', invocationPath: 'Direct', now: new Date() });
  return roots.map((r) => {
    const checks = g.checks.filter((c) => c.stage === '1' && c.scope === r.label);
    const ok = checks.length && checks.every((c) => c.result === 'ok');
    return {
      scope: r.label,
      reusable: Boolean(ok),
      detail: ok ? `approved Project Context reusable (${checks.map((c) => c.integrity).join(', ')})` : (checks.map((c) => c.detail).join('; ') || 'no Project Context'),
    };
  });
}

module.exports = {
  readProjectContext,
  rootGraph,
  buildTraceGraph,
  findGaps,
  findConflicts,
  contextReuse,
};
