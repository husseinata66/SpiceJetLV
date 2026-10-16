#!/usr/bin/env node
// API contract CLI — contract versions, drift, impact and the human decisions on them.
// Owned by Stage 2 (Explorer: discovering what the system exposes) and consumed by Stage 3 (Test Design)
// and the execution entry gates. See README.md beside this file.
//
//   node platform_core/tools/api_contract/cli.js <command> --scope <scope> [...] [--data-root <dir>] [--json]
//
//   register         --name N --role proposed|observed --source <file> --by "<name>"
//                    [--environment mock|real --run <run> --declared <env>] [--base-path /v1] [--reason "..."]
//   import-approved  --name N --source <file> --approved-by "<name>" --reason "..." [--base-path /v1]
//   list
//   analyze          [--candidate CV-n] [--base CV-m]            exit 2 = Breaking or Unknown drift
//   report           [--candidate CV-n] [--base CV-m] [--out <dir>]
//   accept           --candidate CV-n --analysis CD-… --by "<name>" --reason "..." [--endpoints "GET /a,POST /b"] [--approved-suppliers a,b]
//   reject           --candidate CV-n --by "<name>" --reason "..."
//   review-observed  --observed CV-n --analysis CD-… --decision application-defect|contract-outdated|environment-issue|accepted-risk|conforms --by "<name>" --reason "..."
//   impact-decision  --acceptance CDEC-n --item TC-1 --decision no-change-needed|update-required|updated|retire --by "<name>" --reason "..." [--case-scope <label>]
//   contradictions   ·  decide-contradiction --id CX-… --decision "..." --by "<name>"
//   supplier-diff    --name N                                    (a Supplier scope against its Feature)
//   status                                                       exit 2 = something blocks
//   policy           --mode optional|required --by "<name>" --reason "..."   (--scope <scope> | --scope project)
//                    the contract coverage policy: a named human choice; without one a scope is optional
//   rules                                                        the drift rules and their classifications
//
// <scope>: modules/<m> · modules/<m>/features/<f> · supplier-features/<F> · supplier-features/<F>/suppliers/<S>
//          · supplier-features/<F>/shared/<SS>   (relative to the data root)
// Exit: 0 ok · 1 error / refused · 2 blocking drift or blockers (analyze, status)

'use strict';

const path = require('path');
const R = require('./registry');
const D = require('./diff');
const { writeReport } = require('./report');

const VALUE_FLAGS = new Set(['mode', 'scope', 'name', 'role', 'source', 'by', 'environment', 'run', 'declared', 'base-path', 'reason', 'approved-by', 'candidate', 'base', 'analysis', 'endpoints', 'approved-suppliers', 'observed', 'decision', 'acceptance', 'item', 'case-scope', 'id', 'out', 'data-root']);
const BOOL_FLAGS = new Set(['json', 'help']);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const key = a.slice(2);
    if (BOOL_FLAGS.has(key)) { args[key] = true; continue; }
    if (!VALUE_FLAGS.has(key)) throw new R.ContractError(`Unknown flag --${key}.`, 'USAGE');
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) throw new R.ContractError(`--${key} needs a value.`, 'USAGE');
    args[key] = next; i += 1;
  }
  return args;
}

function dataRootOf(args) {
  if (args['data-root']) return path.resolve(args['data-root']);
  return require('../platform_paths/paths').resolveRoots().dataRoot; // eslint-disable-line global-require
}
const csv = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : []);

function printAnalysis(a) {
  const c = a.comparison;
  console.log(`Analysis ${a.id} — ${a.scope} — ${a.mode} — ${c.classification.toUpperCase()}  (HUMAN DECISION)`);
  console.log(`  base:      ${a.base ? `${a.base.id} ${a.base.name} (${a.base.role}/${a.base.status}, ${a.base.format}, normalized ${a.base.normalizedSha256.slice(0, 12)})` : 'none'}`);
  console.log(`  candidate: ${a.candidate.id} ${a.candidate.name} (${a.candidate.role}/${a.candidate.status}${a.candidate.environment ? `, ${a.candidate.environment.kind}` : ''}, ${a.candidate.format}, normalized ${a.candidate.normalizedSha256.slice(0, 12)})`);
  console.log(`  Breaking ${c.counts.Breaking} · Potentially breaking ${c.counts['Potentially breaking']} · Non-breaking ${c.counts['Non-breaking']} · Unknown ${c.counts.Unknown} · endpoints compared ${c.endpointsCompared}`);
  for (const i of c.items.slice(0, 60)) console.log(`  [${i.classification}] ${i.rule}  ${i.endpoint}${i.endpoints && i.endpoints.length > 1 ? ` (+${i.endpoints.length - 1})` : ''}  ${[i.location, i.status, i.param, i.field].filter(Boolean).join(' ')}: ${i.before} → ${i.after}`);
  if (c.items.length > 60) console.log(`  … ${c.items.length - 60} more (--json)`);
  console.log(`  impact: confirmed ${a.impact.confirmed.map((e) => `${e.scope}:${e.testCase}${e.assertions.length ? `[${[...new Set(e.assertions.map((x) => x.assertionId))].join(',')}]` : ''}`).join(', ') || '—'}`);
  console.log(`          potential ${a.impact.potential.map((e) => `${e.scope}:${e.testCase}`).join(', ') || '—'}`);
  console.log(`          missing traceability ${a.impact.missing.map((m) => m.endpoint).join(', ') || '—'}`);
  for (const r of a.evidence.rows) if (r.mock.verdict !== 'not exercised' || r.real.verdict !== 'not exercised') console.log(`  evidence ${r.endpoint}: mock ${r.mock.verdict} · real ${r.real.verdict}${r.note ? ` — ${r.note}` : ''}`);
  for (const n of a.notes) console.log(`  note: ${n}`);
  for (const d of a.decisionsRequired) console.log(`  decision required (${d.kind}): ${d.detail}`);
}

function main(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  if (!cmd || args.help) { console.log('Usage: see the header of platform_core/tools/api_contract/cli.js, or README.md beside it.'); return 0; }
  if (cmd === 'rules') {
    const rows = Object.entries(D.RULES).map(([id, r]) => ({ id, request: r.request || r.any, response: r.response || r.any, conformance: r.conformance || r.response || r.any, text: r.text }));
    if (args.json) console.log(JSON.stringify({ version: D.RULES_VERSION, rules: rows }, null, 2));
    else for (const r of rows) console.log(`${r.id.padEnd(26)} request ${r.request.padEnd(21)} response ${r.response.padEnd(21)} ${r.text}`);
    return 0;
  }
  const dataRoot = dataRootOf(args);
  const scope = args.scope;
  if (!scope) throw new R.ContractError('--scope is required.', 'USAGE');
  const now = new Date();
  const out = (obj, line) => { console.log(args.json ? JSON.stringify(obj, null, 2) : line); };
  switch (cmd) {
    case 'register': {
      const v = R.registerVersion(dataRoot, scope, { name: args.name, role: args.role, source: args.source, by: args.by, now, reason: args.reason, basePath: args['base-path'], environment: args.environment, run: args.run, declared: args.declared });
      out(v, `Registered ${v.id}: ${v.name} ${v.role}${v.environment ? ` (${v.environment.kind})` : ''} — ${v.format}, ${v.endpoints} endpoint(s), source ${v.sourceSha256.slice(0, 12)}, normalized ${v.normalizedSha256.slice(0, 12)}${v.issues.length ? `, ${v.issues.length} issue(s)` : ''}`);
      return 0;
    }
    case 'import-approved': {
      const r = R.importApproved(dataRoot, scope, { name: args.name, source: args.source, approvedBy: args['approved-by'], reason: args.reason, basePath: args['base-path'], now });
      out(r, `Recorded ${r.version.id} as the approved ${r.version.name} contract (${r.decision}, by ${r.version.approval.by})`);
      return 0;
    }
    case 'list': {
      const reg = R.readRegistry(R.resolveScope(dataRoot, scope));
      if (args.json) { console.log(JSON.stringify(reg, null, 2)); return 0; }
      for (const v of reg.versions) console.log(`${v.id.padEnd(6)} ${v.name.padEnd(20)} ${v.role.padEnd(9)} ${v.status.padEnd(18)} ${(v.environment ? v.environment.kind : '').padEnd(5)} ${v.format.padEnd(11)} ${v.source}`);
      for (const d of reg.decisions) console.log(`${d.id.padEnd(8)} ${d.kind.padEnd(16)} ${d.at} by ${d.by}${d.reason ? ` — ${d.reason}` : ''}`);
      return 0;
    }
    case 'analyze': {
      const a = R.analyzeContract(dataRoot, scope, { candidate: args.candidate, base: args.base });
      if (args.json) console.log(JSON.stringify(a, null, 2)); else printAnalysis(a);
      return ['Breaking', 'Unknown'].includes(a.comparison.classification) ? 2 : 0;
    }
    case 'report': {
      const s = R.resolveScope(dataRoot, scope);
      const a = R.analyzeContract(dataRoot, s, { candidate: args.candidate, base: args.base });
      const files = writeReport(dataRoot, s, a, { out: args.out, now });
      out(files, `Wrote ${path.relative(process.cwd(), files.md)} (+ .report.json, .html) for ${a.id}`);
      return 0;
    }
    case 'accept': {
      const r = R.acceptVersion(dataRoot, scope, { candidate: args.candidate, analysisId: args.analysis, by: args.by, reason: args.reason, now, endpoints: csv(args.endpoints), approvedSuppliers: csv(args['approved-suppliers']) });
      out(r, `${r.decision}: ${r.partial ? 'partially ' : ''}accepted as ${r.version.id}. ${r.pendingImpact.length ? `${r.pendingImpact.length} reached test case(s) now need a decision: ${r.pendingImpact.map((e) => `${e.scope}:${e.testCase}`).join(', ')}` : 'No approved test case is reached.'}`);
      return 0;
    }
    case 'reject': {
      const r = R.rejectVersion(dataRoot, scope, { candidate: args.candidate, by: args.by, reason: args.reason, now });
      out(r, `${r.decision}: rejected ${r.version.id}`);
      return 0;
    }
    case 'review-observed': {
      const r = R.reviewObserved(dataRoot, scope, { observed: args.observed, analysisId: args.analysis, decision: args.decision, by: args.by, reason: args.reason, now });
      out(r, `${r.decision}: ${r.version.id} reviewed — ${r.version.review.decision}`);
      return 0;
    }
    case 'impact-decision': {
      const r = R.decideImpact(dataRoot, scope, { acceptance: args.acceptance, item: args.item, caseScope: args['case-scope'], decision: args.decision, by: args.by, reason: args.reason, now });
      out(r, `${r.acceptance}: ${r.testCase} — ${r.decision}${r.resolved ? '' : ' (still open: the Test Design update is pending)'}`);
      return 0;
    }
    case 'contradictions': {
      const s = R.resolveScope(dataRoot, scope);
      const cx = R.findContradictions(dataRoot, s, R.readRegistry(s));
      if (args.json) { console.log(JSON.stringify(cx, null, 2)); return 0; }
      if (!cx.length) console.log('No contradictions between approved contracts.');
      for (const c of cx) console.log(`${c.id} ${c.versions.join(' vs ')} — ${c.classification}, ${c.items.length} difference(s) — ${c.decision ? `DECIDED by ${c.decision.by}: ${c.decision.decision}` : 'UNDECIDED'}`);
      return 0;
    }
    case 'decide-contradiction': {
      const r = R.decideContradiction(dataRoot, scope, { id: args.id, decision: args.decision, by: args.by, now });
      out(r, `${r.decision}: contradiction ${r.contradiction} decided`);
      return 0;
    }
    case 'supplier-diff': {
      const r = R.supplierDifferences(dataRoot, scope, args.name);
      if (args.json) { console.log(JSON.stringify(r, null, 2)); return 0; }
      if (!r.available) { console.log(`Not comparable: ${r.detail}`); return 2; }
      console.log(`${r.supplier} vs Feature ${r.feature.id} → ${r.supplierVersion.id}: ${r.comparison.classification}`);
      for (const i of r.comparison.items) console.log(`  [${i.classification}] ${i.rule} ${i.endpoint} ${[i.location, i.status, i.param, i.field].filter(Boolean).join(' ')}: ${i.before} → ${i.after}`);
      return 0;
    }
    case 'policy': {
      if (!args.mode) {
        const p = scope === 'project' ? (R.readProjectPolicy(dataRoot) || { mode: 'optional', source: 'default' }) : R.effectivePolicy(dataRoot, R.resolveScope(dataRoot, scope));
        out(p, `${scope}: contract validation ${p.mode}${p.source ? ` (${p.source}${p.by ? `, chosen by ${p.by}` : ''})` : ''}`);
        return 0;
      }
      const r = R.setPolicy(dataRoot, scope, { mode: args.mode, by: args.by, reason: args.reason, now });
      out(r, `${r.scope}: contract validation is now ${r.mode} (${r.decision}, was ${r.previous || 'not set'})`);
      return 0;
    }
    case 'status': {
      const st = R.scopeStatus(dataRoot, scope);
      if (args.json) console.log(JSON.stringify(st, null, 2));
      else {
        console.log(`${st.scope}: contract validation ${st.policy.mode} (${st.policy.source}${st.policy.by ? `, chosen by ${st.policy.by}` : ''})`);
        if (!st.registry) console.log(`${st.scope}: no API contract registered.`);
        for (const b of st.blockers) console.log(`BLOCKER  ${b.detail}`);
        for (const w of st.warnings) console.log(`warning  ${w.detail}`);
        if (st.registry && !st.blockers.length && !st.warnings.length) console.log(`${st.scope}: no unresolved contract drift.`);
      }
      return st.blockers.length ? 2 : 0;
    }
    default:
      throw new R.ContractError(`Unknown command "${cmd}".`, 'USAGE');
  }
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`${err.code || 'ERROR'}: ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = { main, parseArgs };
