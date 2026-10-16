#!/usr/bin/env node
// Observability CLI — record events, and read what they add up to.
//
// EVERY SUBCOMMAND EXCEPT `record` IS READ-ONLY over telemetry. `metrics`, `report` and `dashboard`
// derive from the event stream and write their own derived artifacts; none of them ever edits
// ObservabilityEvents.jsonl. Telemetry is evidence, and evidence is not revised to improve a metric.
//
// Usage:
//   node platform_core/tools/observability/cli.js record --type STAGE_STARTED --stage 3 \
//        --skill test-design-skill --source skill --span-id spn-stage-000004
//   node .../cli.js summary   [--run <folder>] [--json]
//   node .../cli.js validate  [--run <folder>] [--json]
//   node .../cli.js metrics   [--run <folder>] [--out] [--json]
//   node .../cli.js report    [--run <folder>] [--out]
//   node .../cli.js dashboard [--run <folder>] [--out]
//   node .../cli.js historical [--run <folder>] [--json]
//   node .../cli.js compare --run A --run B [--json]
//   node .../cli.js health       [--run <folder>] [--json] [--out [--out-dir <dir>]] [--data-root <dir>]
//   node .../cli.js health-check [--run <folder>] [--revision RunHealth.rev-N] [--dir <dir>] [--data-root <dir>]
//                                exit 2 = the renderings disagree, or no longer match the authoritative sources
//
// `--run` defaults to the Active Run pointer, so a Skill mid-pipeline does not have to know or repeat
// the folder name it is already working inside.
//
// Exit codes: 0 = ok · 1 = error · 2 = under-instrumented / telemetry problems found

'use strict';

const fs = require('fs');
const path = require('path');

const { ObservabilityError, EVENT_TYPES, EVENT_SOURCES, SCHEMA_VERSION } = require('./schema');
const {
  recordEvent, readEvents, eventsPath, metricsPath, reportPath, dashboardPath, observabilityDir,
  resolveDataRoot,
} = require('./recorder');
const { aggregate, INSTRUMENTATION } = require('./aggregator');
const { renderReport } = require('./report');
const { renderDashboard } = require('./dashboard');
const { deriveHistorical } = require('./historical');
const { loadRunJson, loadTestSuites, loadSafetyEvidence, listRuns } = require('./sources');

// The data root every subcommand reads and writes (Phase 9.3, F-24): `--data-root <dir>` when given — an
// isolated root (a disposable workspace, a copy under review), validated once in main() — else the
// configured one. One value for the whole command, so a dashboard can never read one root and write another.
let DATA_ROOT_OVERRIDE = null;
const root = () => DATA_ROOT_OVERRIDE || resolveDataRoot();

/** Why `dir` cannot be used as a data root, or null. */
function dataRootProblem(dir) {
  let st;
  try { st = fs.statSync(dir); } catch { return `--data-root ${dir} does not exist`; }
  if (!st.isDirectory()) return `--data-root ${dir} is not a folder`;
  let runs;
  try { runs = fs.statSync(path.join(dir, 'runs')); } catch { runs = null; }
  if (!runs || !runs.isDirectory()) return `--data-root ${dir} has no runs/ folder — it is not a data root`;
  return null;
}
const { isAvailable, formatDuration, formatRatio } = require('./formulas');

const EXIT = { ok: 0, error: 1, incomplete: 2 };

function parseArgs(argv) {
  const out = { _: [], runs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const key = arg.slice(2);
    const next = argv[i + 1];
    const value = (next === undefined || next.startsWith('--')) ? true : next;
    if (value !== true) i += 1;
    if (key === 'run' && value !== true) out.runs.push(value);
    out[key] = value;
  }
  return out;
}

const USAGE = `Observability — deterministic run telemetry.

  record     --type <TYPE> --source <platform-tool|skill> [--stage N] [--skill S] [--tool T]
             [--span-id ID] [--parent-span-id ID] [--status S] [--count N] [--attempt N]
             [--decision-id ID] [--category C] [--kind K] [--artifact PATH] [--test-case-id ID]
  summary    [--run <folder>] [--json]     the run's headline metrics
  validate   [--run <folder>] [--json]     schema-check the stream; report unclosed spans
  metrics    [--run <folder>] [--out]      derive ObservabilityMetrics.json
  report     [--run <folder>] [--out]      render ObservabilityReport.md
  dashboard  [--run <folder>] [--out]      render ObservabilityDashboard.html (self-contained)
  historical [--run <folder>] [--json]     what a non-instrumented run's artifacts still prove
  compare    --run A --run B [--json]      cross-run comparison of immutable run metrics
  health     [--run <folder>] [--json] [--out [--out-dir D]]   Run Health from the authoritative sources
  health-check [--run <folder>] [--revision R] [--dir D]        Markdown / JSON / HTML agree, and are current

Event types: ${EVENT_TYPES.join(', ')}

Every command takes [--data-root <dir>] — an isolated data root (it must contain runs/); default: the configured one.

Exit codes: 0 ok · 1 error · 2 under-instrumented
`;

/** Resolves the target run: explicit `--run`, else the Active Run pointer. */
function resolveRun(args) {
  if (typeof args.run === 'string') return args.run;
  try {
    // eslint-disable-next-line global-require
    const { resolveActiveRunFolder } = require('../run_manager/activeRun');
    const folder = resolveActiveRunFolder(path.join(root(), 'runs'));
    if (folder) return folder;
  } catch { /* no pointer, or run_manager unavailable */ }
  return null;
}

function requireRun(args) {
  const run = resolveRun(args);
  if (!run) {
    console.error('No run specified and no Active Run pointer is set. Pass --run <folder>.');
    return null;
  }
  // A run is named by its folder name inside <data root>/runs — never by a path (F-24: with an isolated data
  // root, a path in --run must not reach outside it).
  if (/[\\/]/.test(run) || run === '.' || run === '..' || !fs.existsSync(path.join(root(), 'runs', run, 'metadata'))) {
    console.error(`Run "${run}" is not a run folder in ${path.join(root(), 'runs')}. Pass its folder name.`);
    return null;
  }
  return run;
}

/** Loads everything the aggregator needs, in one place so every subcommand agrees. */
function buildMetrics(runFolder, { dataRoot } = {}) {
  const base = dataRoot || root();
  const read = readEvents({ runFolder, dataRoot: base });
  const { runJson } = loadRunJson({ dataRoot: base, runFolder });
  const { suites } = loadTestSuites({ dataRoot: base });
  const safety = loadSafetyEvidence({ dataRoot: base, runFolder, events: read.events });
  const metrics = aggregate({
    runId: runFolder,
    runJson,
    events: read.events,
    testSuites: suites,
    safety,
    environment: safety.preflight ? safety.preflight.environment : null,
  });
  // A stream with unreadable lines is reported, never quietly averaged over.
  metrics.integrity.problems = [...metrics.integrity.problems, ...read.problems];
  metrics.integrity.ok = metrics.integrity.problems.length === 0;
  metrics.integrity.foreignEventsRejected = read.foreign.length;
  return { metrics, read, root: base };
}

function cmdRecord(args) {
  const run = requireRun(args);
  if (!run) return EXIT.error;
  if (typeof args.type !== 'string') { console.error('record requires --type. See --help.'); return EXIT.error; }
  if (!EVENT_SOURCES.includes(args.source)) {
    console.error(`record requires --source (${EVENT_SOURCES.join(' | ')}). Provenance is never assumed.`);
    return EXIT.error;
  }

  const event = { type: args.type, source: args.source };
  const map = {
    stage: 'stage', skill: 'skill', tool: 'tool', 'span-id': 'spanId', 'parent-span-id': 'parentSpanId',
    status: 'status', 'decision-id': 'decisionId', category: 'category', kind: 'kind',
    'error-type': 'errorType', artifact: 'artifact', 'artifact-class': 'artifactClass',
    'test-case-id': 'testCaseId', module: 'module', note: 'note',
  };
  for (const [flag, field] of Object.entries(map)) {
    if (typeof args[flag] === 'string') event[field] = args[flag];
  }
  for (const flag of ['count', 'attempt', 'cycle']) {
    if (args[flag] !== undefined && args[flag] !== true) event[flag] = Number(args[flag]);
  }
  if (args.retryable !== undefined) event.retryable = args.retryable === true || args.retryable === 'true';
  if (typeof args.metadata === 'string') {
    try { event.metadata = JSON.parse(args.metadata); } catch (err) {
      console.error(`--metadata is not valid JSON: ${err.message}`);
      return EXIT.error;
    }
  }

  const res = recordEvent({ runFolder: run, dataRoot: root(), event, now: new Date() });
  if (!res.ok) { console.error(`! ${res.warning}`); return EXIT.error; }
  if (args.json) console.log(JSON.stringify(res.event, null, 2));
  else console.log(`${res.event.eventId}  ${res.event.type}${res.event.spanId ? `  span=${res.event.spanId}` : ''}`);
  return EXIT.ok;
}

function cmdValidate(args) {
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const read = readEvents({ runFolder: run, dataRoot: root() });
  const { metrics } = buildMetrics(run);
  const unclosed = metrics.instrumentation.unclosedSpans;

  const report = {
    runId: run,
    path: read.path,
    exists: read.exists,
    schemaVersion: SCHEMA_VERSION,
    instrumentation: metrics.instrumentation.status,
    eventCount: read.events.length,
    lineCount: read.lineCount,
    problems: metrics.integrity.problems,
    unclosedSpans: unclosed,
    foreignEventsRejected: read.foreign.length,
    ok: metrics.integrity.problems.length === 0 && unclosed.length === 0 && read.exists,
  };

  if (args.json) { console.log(JSON.stringify(report, null, 2)); return report.ok ? EXIT.ok : EXIT.incomplete; }

  console.log(`Run:     ${run}`);
  console.log(`Stream:  ${read.path}`);
  if (!read.exists) {
    console.log('Status:  NOT INSTRUMENTED');
    console.log('\nThis run has no telemetry. No metric is invented in its place, and none is zero.');
    return EXIT.incomplete;
  }
  console.log(`Events:  ${read.events.length} valid of ${read.lineCount} line(s)`);
  console.log(`Status:  ${metrics.instrumentation.status}`);
  if (read.foreign.length) console.log(`Foreign: ${read.foreign.length} event(s) from another run — rejected, not counted.`);
  if (unclosed.length) {
    console.log(`\nUnclosed spans (${unclosed.length}) — reported Incomplete, never given a duration:`);
    for (const s of unclosed) {
      console.log(`  - ${s.spanId}  ${s.kind}${s.stage ? ` stage=${s.stage}` : ''}${s.tool ? ` tool=${s.tool}` : ''}  opened ${s.startedAt}`);
    }
  }
  if (report.problems.length) {
    console.log(`\nProblems (${report.problems.length}):`);
    for (const p of report.problems) console.log(`  - ${p}`);
  }
  if (report.ok) console.log('\nTelemetry is schema-valid and every span is closed.');
  return report.ok ? EXIT.ok : EXIT.incomplete;
}

function cmdSummary(args) {
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const { metrics } = buildMetrics(run);

  if (args.json) { console.log(JSON.stringify(metrics, null, 2)); return EXIT.ok; }

  const v = (m, kind) => {
    if (!isAvailable(m)) return 'Unavailable';
    if (kind === 'duration') return formatDuration(m);
    if (kind === 'ratio') return formatRatio(m, 1);
    return String(m.value);
  };

  console.log('Observability');
  console.log('─────────────');
  console.log('');
  console.log(`Run:              ${run}`);
  console.log(`Instrumentation:  ${metrics.instrumentation.status}`);
  console.log(`Events:           ${metrics.instrumentation.eventCount} `
    + `(${metrics.instrumentation.bySource['platform-tool']} platform-tool, ${metrics.instrumentation.bySource.skill} skill)`);
  console.log(`Schema:           v${metrics.schemaVersion}`);
  console.log('');
  console.log(`Duration:         ${v(metrics.run.durationMs, 'duration')}`);
  console.log(`Stages started:   ${v(metrics.stagesStarted)}`);
  console.log(`Human decisions:  ${v(metrics.humanDecisions.requested)} requested, ${v(metrics.humanDecisions.pending)} pending`);
  console.log(`Tool calls:       ${v(metrics.tools.totals.calls)} (${v(metrics.tools.totals.failed)} failed, ${v(metrics.tools.totals.retries)} retries)`);
  const tdMark = metrics.testDesign.totalCases.provenance === 'historical-derived' ? ' [current artifact values]' : '';
  console.log(`Test cases:       ${v(metrics.testDesign.totalCases)} — Review approved ${v(metrics.testDesign.review.approved)}, Automation approved ${v(metrics.testDesign.automation.approved)}${tdMark}`);
  console.log(`Execution:        ${v(metrics.execution.passed)} passed / ${v(metrics.execution.failed)} failed / ${v(metrics.execution.automationRepaired)} automation repaired / ${v(metrics.execution.unverified)} unverified / ${v(metrics.execution.blocked)} blocked  (telemetry — authoritative outcome: observability health)`);
  console.log(`Safety blocks:    ${v(metrics.safety.blocks)}`);
  console.log(`Repair cycles:    ${v(metrics.repair.cycles)}`);
  console.log('');
  console.log(`TC acceptance:    ${v(metrics.formulas.TC_ACCEPTANCE_RATE, 'ratio')}`);
  console.log(`First-pass auto:  ${v(metrics.formulas.FIRST_PASS_AUTOMATION_SUCCESS, 'ratio')}`);
  console.log(`Tool failure:     ${v(metrics.formulas.TOOL_FAILURE_RATE, 'ratio')}`);
  console.log('');
  console.log('Token usage:      Unavailable');
  console.log('Cost:             Unavailable');
  console.log('');
  if (metrics.instrumentation.reasons.length) {
    for (const r of metrics.instrumentation.reasons) console.log(`  ! ${r}`);
    console.log('');
  }
  console.log('No metric above was estimated. `Unavailable` means unmeasured, and is not zero.');
  return metrics.instrumentation.status === INSTRUMENTATION.FULL ? EXIT.ok : EXIT.incomplete;
}

function writeOut(file, contents, args, run) {
  // F-23 (Phase 9.3): never written through a symbolic link or junction that leaves the run folder.
  if (run) require('./recorder').assertRunWrite(root(), run, path.dirname(file), file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, 'utf8');
  if (!args.json) console.log(`Written: ${file}`);
  return file;
}

function cmdMetrics(args) {
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const { metrics } = buildMetrics(run);
  const json = `${JSON.stringify(metrics, null, 2)}\n`;
  if (args.out) writeOut(metricsPath(root(), run), json, args, run);
  else console.log(json.trimEnd());
  return EXIT.ok;
}

function cmdReport(args) {
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const { metrics } = buildMetrics(run);
  const md = renderReport(metrics, {
    now: new Date(),
    fixture: args.fixture === true,
    dashboard: args.out ? 'ObservabilityDashboard.html' : null,
  });
  if (args.out) writeOut(reportPath(root(), run), md, args, run);
  else console.log(md);
  return EXIT.ok;
}

function cmdDashboard(args) {
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const { metrics } = buildMetrics(run);

  // A non-instrumented run gets the historical view attached, clearly bannered — never a dashboard
  // that pretends it was instrumented.
  let historical = null;
  if (metrics.instrumentation.status === INSTRUMENTATION.NONE) {
    try { historical = deriveHistorical({ dataRoot: root(), runFolder: run }); } catch { /* nothing derivable */ }
  }

  // The authoritative Run Health view (Phase 8.1), read — never recomputed — and the latest written report's
  // status. A failure to read it is shown as Unavailable, never hidden.
  let health = null; let healthReport = null;
  try {
    // eslint-disable-next-line global-require
    health = require('./runHealth').buildRunHealth({ dataRoot: root(), runFolder: run, now: new Date() });
    // eslint-disable-next-line global-require
    const { listRevisions } = require('./runHealthReport');
    const dir = observabilityDir(root(), run);
    const rev = listRevisions(dir).pop();
    if (rev) {
      let recorded = null;
      try { recorded = JSON.parse(fs.readFileSync(path.join(dir, `${rev}.snapshot.json`), 'utf8')).fingerprint; } catch { /* none */ }
      healthReport = { revision: rev, current: recorded === health.fingerprint };
    }
  } catch (err) { healthReport = { reason: `Run Health could not be read: ${String(err.message).split('\n')[0]}` }; }

  const html = renderDashboard(metrics, { now: new Date(), fixture: args.fixture === true, historical, health, healthReport });
  if (args.out) {
    // Metrics are regenerated alongside, so the dashboard can never be newer than the data it shows.
    writeOut(metricsPath(root(), run), `${JSON.stringify(metrics, null, 2)}\n`, args, run);
    const file = writeOut(dashboardPath(root(), run), html, args, run);
    if (!args.json) console.log('\nSelf-contained: open it directly in a browser. No server, no network.');
    return file ? EXIT.ok : EXIT.error;
  }
  console.log(html);
  return EXIT.ok;
}

function cmdHistorical(args) {
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const h = deriveHistorical({ dataRoot: root(), runFolder: run });
  if (args.json) { console.log(JSON.stringify(h, null, 2)); return EXIT.ok; }
  const v = (m) => (isAvailable(m) ? String(m.value) : 'Unavailable');
  console.log(`Historical Derived Metrics — ${run}`);
  console.log('─────────────────────────────────');
  console.log('');
  console.log(h.banner);
  console.log('');
  console.log(`Duration:          ${isAvailable(h.run.durationMs) ? formatDuration(h.run.durationMs) : 'Unavailable'}`);
  console.log(`Execution cycles:  ${v(h.execution.cyclesObserved)}`);
  console.log(`Surefire tests:    ${v(h.execution.tests)} (${v(h.execution.failures)} failures, ${v(h.execution.skipped)} skipped)`);
  console.log(`Runner seconds:    ${v(h.execution.runnerSeconds)}`);
  console.log('');
  console.log('Not recoverable — no artifact records these, and none is estimated:');
  for (const k of Object.keys(h.notInstrumented)) console.log(`  - ${k}`);
  console.log('');
  for (const l of h.limitations) console.log(`  · ${l}`);
  return EXIT.ok;
}

/**
 * Cross-run comparison (§37, §38).
 *
 * Reads each run's immutable telemetry and derives fresh. There is deliberately NO stored global
 * counter: a mutable aggregate drifts from the runs it claims to summarise, and then nobody can tell
 * which of the two is wrong.
 */
function cmdCompare(args) {
  const runs = args.runs.length ? args.runs : listRuns({ dataRoot: root() }).slice(0, 3);
  if (runs.length < 2) {
    console.error('compare needs at least two runs: --run A --run B');
    return EXIT.error;
  }
  const rows = runs.map((r) => {
    const { metrics } = buildMetrics(r);
    return { runId: r, metrics };
  });

  if (args.json) {
    console.log(JSON.stringify({ runs: rows.map((r) => ({ runId: r.runId, metrics: r.metrics })) }, null, 2));
    return EXIT.ok;
  }

  const cells = (m, kind) => (isAvailable(m)
    ? (kind === 'duration' ? formatDuration(m) : kind === 'ratio' ? formatRatio(m, 0) : String(m.value))
    : '—');
  const lines = [
    ['Metric', ...rows.map((r) => r.runId.slice(0, 22))],
    ['Instrumentation', ...rows.map((r) => r.metrics.instrumentation.status)],
    ['Duration', ...rows.map((r) => cells(r.metrics.run.durationMs, 'duration'))],
    ['Human Decisions', ...rows.map((r) => cells(r.metrics.humanDecisions.requested))],
    ['Tool Calls', ...rows.map((r) => cells(r.metrics.tools.totals.calls))],
    ['Retries', ...rows.map((r) => cells(r.metrics.tools.totals.retries))],
    ['TC Acceptance', ...rows.map((r) => cells(r.metrics.formulas.TC_ACCEPTANCE_RATE, 'ratio'))],
    ['First-Pass Auto', ...rows.map((r) => cells(r.metrics.formulas.FIRST_PASS_AUTOMATION_SUCCESS, 'ratio'))],
    ['Tool Failure Rate', ...rows.map((r) => cells(r.metrics.formulas.TOOL_FAILURE_RATE, 'ratio'))],
    ['Safety Blocks', ...rows.map((r) => cells(r.metrics.safety.blocks))],
    ['Repair Cycles', ...rows.map((r) => cells(r.metrics.repair.cycles))],
  ];
  const widths = lines[0].map((_, i) => Math.max(...lines.map((l) => String(l[i]).length)));
  for (const l of lines) console.log(l.map((c, i) => String(c).padEnd(widths[i])).join('  '));
  console.log('');
  console.log('`—` is Unavailable, never zero. A run marked Not Instrumented contributes no timing.');
  const instrumented = rows.filter((r) => r.metrics.instrumentation.status !== INSTRUMENTATION.NONE).length;
  if (instrumented < 2) {
    console.log('\nTrend data unavailable — requires multiple instrumented runs.');
    return EXIT.incomplete;
  }
  return EXIT.ok;
}

/** Run Health (Phase 8): workflow, execution, coverage, repairs, contracts — read, never recomputed. */
function cmdHealth(args) {
  // eslint-disable-next-line global-require
  const { buildRunHealth } = require('./runHealth');
  // eslint-disable-next-line global-require
  const { writeRunHealth } = require('./runHealthReport');
  const dataRoot = root();
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const snapshot = buildRunHealth({ dataRoot, runFolder: run, now: new Date() });
  if (args.out) {
    if (typeof args['out-dir'] === 'string') {
      // R-03 (Phase 9.5): Run Health is written into the data root, or a registered report-output root — nowhere else.
      // eslint-disable-next-line global-require
      const { realPathOf } = require('../run_manager/pathBoundary');
      const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
      const rel = path.relative(norm(realPathOf(dataRoot)), norm(realPathOf(path.resolve(args['out-dir']))));
      // eslint-disable-next-line global-require
      const ok = (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) || require('../run_manager/targetWrites').permittedRootFor(dataRoot, args['out-dir'], ['report-output']);
      if (!ok) throw new ObservabilityError(`--out-dir ${args['out-dir']} is outside the data root and every registered report-output root — Run Health is written nowhere else.`);
    }
    const files = writeRunHealth({ dataRoot, runFolder: run, snapshot, outDir: typeof args['out-dir'] === 'string' ? args['out-dir'] : undefined });
    console.log(`Wrote ${files.revision} (.md, .report.json, .html, .snapshot.json) in ${path.dirname(files.md)}`);
    return EXIT.ok;
  }
  if (args.json) { console.log(JSON.stringify(snapshot, null, 2)); return EXIT.ok; }
  console.log(`Run Health — ${run}  (test verdict: ${snapshot.verdict.overall}; no overall health figure)`);
  for (const [k, v] of snapshot.figures) console.log(`  ${k.padEnd(44)} ${v}`);
  for (const n of snapshot.notes) console.log(`  note: ${n}`);
  return EXIT.ok;
}

function cmdHealthCheck(args) {
  // eslint-disable-next-line global-require
  const { checkRunHealth } = require('./runHealthReport');
  const dataRoot = root();
  const run = requireRun(args);
  if (!run) return EXIT.error;
  const r = checkRunHealth({ dataRoot, runFolder: run, dir: typeof args.dir === 'string' ? args.dir : undefined, revision: typeof args.revision === 'string' ? args.revision : undefined });
  // The dashboard, when one was written, must show the Run Health view the sources give now (Phase 8.1).
  const dash = typeof args.dashboard === 'string' ? path.resolve(args.dashboard) : path.join(typeof args.dir === 'string' ? args.dir : observabilityDir(dataRoot, run), 'ObservabilityDashboard.html');
  if (fs.existsSync(dash)) {
    // eslint-disable-next-line global-require
    const { checkDashboard } = require('./runHealthReport');
    // eslint-disable-next-line global-require
    const { buildRunHealth } = require('./runHealth');
    r.dashboard = checkDashboard({ html: fs.readFileSync(dash, 'utf8'), snapshot: buildRunHealth({ dataRoot, runFolder: run, now: new Date() }) });
    if (!r.dashboard.ok) r.ok = false;
  }
  if (args.json) console.log(JSON.stringify(r, null, 2));
  else {
    if (r.dashboard) {
      console.log(`dashboard: ${r.dashboard.ok ? 'agrees with Run Health' : 'DISAGREES'}`);
      for (const p of r.dashboard.problems) console.log(`  dashboard: ${p}`);
    }
    console.log(`${r.revision}: renderings ${r.consistent ? 'agree' : 'DISAGREE'}; ${r.current ? 'current' : 'STALE'}`);
    for (const p of r.problems) console.log(`  mismatch: ${p}`);
    for (const p of r.stale) console.log(`  stale: ${p}`);
  }
  return r.ok ? EXIT.ok : EXIT.incomplete;
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (args.help || args.h || !command) { console.log(USAGE); return command ? EXIT.ok : EXIT.error; }
  DATA_ROOT_OVERRIDE = null;
  if (args['data-root'] !== undefined) {
    const dir = typeof args['data-root'] === 'string' ? path.resolve(args['data-root']) : '';
    const why = dir ? dataRootProblem(dir) : '--data-root needs a folder';
    if (why) { console.error(`${why}. Nothing was read or written.`); return EXIT.error; }
    DATA_ROOT_OVERRIDE = dir;
  }
  try {
    switch (command) {
      case 'record': return cmdRecord(args);
      case 'validate': return cmdValidate(args);
      case 'summary': return cmdSummary(args);
      case 'metrics': return cmdMetrics(args);
      case 'report': return cmdReport(args);
      case 'dashboard': return cmdDashboard(args);
      case 'historical': return cmdHistorical(args);
      case 'compare': return cmdCompare(args);
      case 'health': return cmdHealth(args);
      case 'health-check': return cmdHealthCheck(args);
      default:
        console.error(`Unknown command "${command}".\n`);
        console.log(USAGE);
        return EXIT.error;
    }
  } catch (err) {
    if (err instanceof ObservabilityError || err.name === 'RunHealthError') { console.error(`\n${err.code && err.code !== 'RUN_HEALTH' ? `${err.code}: ` : ''}${err.message}\n`); return EXIT.error; }
    throw err;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, parseArgs, EXIT, buildMetrics, resolveRun, observabilityDir, eventsPath };
