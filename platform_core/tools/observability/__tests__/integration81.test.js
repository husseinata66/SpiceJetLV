// Phase 8.1 — Observability integration hardening: the dashboard and Run Health, first-attempt / final
// reconciliation, canonical telemetry emission without duplicates, legacy compatibility, and the docs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const hf = require('../../run_manager/__tests__/healFixture');
const { buildRunHealth, HEALTH_DEFINITIONS } = require('../runHealth');
const { checkDashboard } = require('../runHealthReport');
const { renderDashboard, healthIsClean } = require('../dashboard');
const { aggregate } = require('../aggregator');
const { readEvents, recordEvent } = require('../recorder');
const { emitExecutionTelemetry } = require('../emitExecution');
const { FORMULAS } = require('../formulas');
const { STATUSES } = require('../../run_manager/testStatus');

const NOW = new Date('2026-10-09T12:00:00Z');
const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const health = (ws, run) => buildRunHealth({ dataRoot: ws.root, runFolder: run, now: NOW });
const results = (ws, run) => readEvents({ dataRoot: ws.root, runFolder: run }).events.filter((e) => e.type === 'TEST_EXECUTION_RESULT');
const metricsOf = (ws, run) => aggregate({ runId: run, events: readEvents({ dataRoot: ws.root, runFolder: run }).events });
const skill = (ws, run, seq, tc, status, extra = {}) => assert.ok(recordEvent({ runFolder: run, dataRoot: ws.root, now: new Date(NOW.getTime() + seq * 1000), event: { type: 'TEST_EXECUTION_RESULT', source: 'skill', status, testCaseId: tc, ...extra } }).ok);

/** The successful repair of TC-LOGIN-001 (5A Automation Failure → 5H rerun Passed → Automation Repaired). */
function repairedRun(ws) {
  const run = hf.failedAutomationRun(ws);
  hf.startHealing(ws, run);
  hf.confirmAutomation(ws, run);
  assert.equal(hf.propose(ws, run, hf.LOCATOR_FIX, 'fix').code, 0);
  assert.equal(hf.H(ws, run, 'batch-approve', '--by', 'QA Lead').code, 0);
  hf.applyOnDisk(ws, hf.LOCATOR_FIX);
  assert.equal(hf.H(ws, run, 'apply', '--test', 'TC-LOGIN-001', '--attempt', '1', '--by', 'QA Lead').code, 0);
  const rr = hf.rerun(ws, run, 1, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-004', 'Passed']]);
  assert.equal(hf.H(ws, run, 'validate', '--test', 'TC-LOGIN-001', '--attempt', '1', '--rerun', rr, '--regression', `TC-LOGIN-004@${rr}`, '--by', 'QA Lead').code, 0);
  assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
  return run;
}

// ---------------------------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------------------------

test('dashboard and Run Health agree: the panel is the snapshot as-is; telemetry is labelled as telemetry; nothing is green while health is not clean', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  const h = health(ws, run);
  const html = renderDashboard(metricsOf(ws, run), { now: NOW, health: h, healthReport: { revision: 'RunHealth', current: true } });
  assert.deepEqual(checkDashboard({ html, snapshot: h }), { ok: true, problems: [] });
  assert.match(html, /Verified Execution Health \(authoritative\)/);
  assert.match(html, /Telemetry Summary <span[^>]*>— instrumented events, not verified execution health/);
  assert.match(html, /href="RunHealth\.html">RunHealth<\/a> — current/);
  assert.ok(!/kpi--success[^>]*>\s*<div class="kpi__label">Passed \(telemetry\)/.test(html), 'telemetry Passed is not green for a failing run');
  assert.ok(!/hstate--success/.test(html), 'no dimension state is ever green');
  assert.equal(healthIsClean(h), false);
  // The dashboard carries no figure of its own: every figure it shows is the snapshot's.
  const shown = [...html.matchAll(/<li data-figure="([^"]+)">/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  assert.deepEqual(shown, h.figures.map(([k]) => k));
  // When the authoritative sources move on, an earlier dashboard is reported stale.
  // eslint-disable-next-line global-require
  require('../../api_contract/registry').setPolicy(ws.root, 'modules/login', { mode: 'required', by: 'QA Lead', reason: 'r', now: NOW });
  const later = health(ws, run);
  const r = checkDashboard({ html, snapshot: later });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => /contract\.blockers: dashboard "0", Run Health now "1"/.test(p)));
  // A dashboard rendered without Run Health says so.
  assert.equal(checkDashboard({ html: renderDashboard(metricsOf(ws, run), { now: NOW }), snapshot: later }).ok, false);
});

test('missing health data: no results → every execution dimension Unavailable, and the dashboard says Unavailable — never clean, never green', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
  const h = health(ws, run);
  const none = h.health.byBranch.none;
  for (const d of ['application', 'automation', 'environment', 'coverage']) assert.equal(none[d].state, 'unavailable', d);
  assert.equal(healthIsClean(h), false);
  const html = renderDashboard(metricsOf(ws, run), { now: NOW, health: h });
  assert.match(html, /unavailable/);
  const noHealth = renderDashboard(metricsOf(ws, run), { now: NOW, healthReport: { reason: 'Run Health could not be read: test' } });
  assert.match(noHealth, /<strong>Unavailable\.<\/strong>\s*Run Health could not be read: test/);
});

// ---------------------------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------------------------

test('canonical emission: one event per test per cycle plus one final — the effective status the evidence supports; a generic Failed is never classified', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  hf.failedAutomationRun(ws);
  const run = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
  assert.equal(ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--run', run).code, 0);
  const ER = ws.put(`runs/${run}/execution/ExecutionResults.md`, '| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n| TC-LOGIN-001 | s | Failed | 1 s | 1 | timeout | — |\n| TC-LOGIN-002 | s | Passed | 1 s | 1 | — | — |\n');
  ws.rm('state', 'artifact', '5A', '--artifacts', ER, '--run', run);
  assert.equal(ws.rm('state', 'outcome', '5A', '--from-results', '--run', run).code, 0);
  const ev = results(ws, run);
  const cyc = (tc) => ev.find((e) => e.testCaseId === tc && e.metadata.resultKind === 'cycle');
  assert.equal(cyc('TC-LOGIN-001').status, 'Failed', 'a generic Failed stays Failed — never Application or Automation Failure');
  assert.equal(cyc('TC-LOGIN-001').metadata.recorded, 'Failed');
  assert.equal(cyc('TC-LOGIN-002').status, 'Unverified', 'a Passed with no assertion evidence is emitted as what the evidence supports');
  assert.equal(cyc('TC-LOGIN-002').metadata.recorded, 'Passed');
  assert.ok(ev.every((e) => e.source === 'platform-tool' && e.tool === 'run_manager' && /^[0-9a-f]{24}$/.test(e.metadata.evidenceKey)));
  // Final events are kept out of the telemetry counts.
  assert.equal(metricsOf(ws, run).execution.planned.value, 2);
});

test('duplicate prevention: repeated outcome recording, recovery and reruns add only new evidence; earlier events are never rewritten', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  const before = results(ws, run);
  assert.equal(before.length, 8);
  const raw = fs.readFileSync(path.join(ws.root, 'runs', run, 'metadata', 'observability', 'ObservabilityEvents.jsonl'), 'utf8');
  // The same command again, and the same emission called directly: nothing new.
  assert.equal(ws.rm('state', 'outcome', '5A', '--from-results', '--run', run).code, 0);
  const again = emitExecutionTelemetry({ dataRoot: ws.root, runFolder: run, stageId: '5A', now: NOW });
  assert.deepEqual([again.emitted, again.skipped], [0, 8]);
  assert.equal(results(ws, run).length, 8);
  // A 5H rerun is new evidence: only its cycle events and the changed finals are added.
  hf.startHealing(ws, run);
  hf.confirmAutomation(ws, run);
  hf.failedAttempt(ws, run, 1, 1);
  assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
  assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0); // repeated
  const after = results(ws, run);
  const keys = after.map((e) => e.metadata.evidenceKey);
  assert.equal(new Set(keys).size, keys.length, 'no evidence key appears twice');
  assert.ok(after.some((e) => e.stage === '5H' && e.metadata.resultKind === 'cycle' && e.cycle === 2 && e.testCaseId === 'TC-LOGIN-001'));
  assert.ok(fs.readFileSync(path.join(ws.root, 'runs', run, 'metadata', 'observability', 'ObservabilityEvents.jsonl'), 'utf8').startsWith(raw), 'append-only: the earlier stream is a prefix of the new one');
});

// ---------------------------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------------------------

test('first attempt vs final, and the Automation Repaired transition: platform telemetry agrees; a Skill calling the repaired test Passed is flagged', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = repairedRun(ws);
  let h = health(ws, run);
  const tel = h.telemetry;
  assert.deepEqual(tel.sources, ['platform-tool']);
  assert.equal(tel.final.disagree.length, 0);
  assert.equal(tel.firstAttempt.disagree.length, 0);
  const tr = tel.repairedTransitions.find((x) => x.testCaseId === 'TC-LOGIN-001');
  assert.deepEqual([tr.history, tr.telemetry, tr.agrees], ['Automation Failure → Automation Repaired', 'Automation Failure → Automation Repaired', true]);
  // A Skill reports the repaired test as a plain pass, and the first attempt of TC-LOGIN-002 as Passed.
  skill(ws, run, 100, 'TC-LOGIN-001', 'Passed', { attempt: 2 });
  skill(ws, run, 101, 'TC-LOGIN-002', 'Passed', { attempt: 1 });
  h = health(ws, run);
  const sk = h.telemetry.repairedTransitions.find((x) => x.source === 'skill' && x.testCaseId === 'TC-LOGIN-001');
  assert.equal(sk.problem, 'telemetry counts a repaired test as Passed');
  assert.ok(h.telemetry.firstAttempt.disagree.some((d) => d.testCaseId === 'TC-LOGIN-002' && d.source === 'skill' && d.history === 'Application Failure'));
  assert.ok(h.telemetry.unresolved.some((u) => u.testCaseId === 'TC-LOGIN-002' && u.source === 'skill' && /shows a pass for a test that is Application Failure/.test(u.problem)));
  assert.ok(h.notes.some((n) => /TC-LOGIN-001: telemetry counts a repaired test as Passed/.test(n)));
  assert.equal(Object.fromEntries(h.figures)['telemetry.repairedShownAsPassed'], '1');
  // History governs: the counts are unchanged.
  assert.equal(h.stages['5H'].counts['Automation Repaired'], 1);
  assert.equal(h.stages['5H'].counts['Application Failure'], 1);
});

test('quarantine, unresolved failures, and missing / unattributed telemetry are all visible', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = hf.failedAutomationRun(ws);
  hf.startHealing(ws, run);
  hf.confirmAutomation(ws, run);
  for (let n = 1; n <= 3; n += 1) hf.failedAttempt(ws, run, n, n);
  assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
  skill(ws, run, 200, null, 'Passed'); // an event that names no test
  // Remove one test's telemetry from view by checking a test history knows and telemetry does not.
  const h = health(ws, run);
  const u1 = h.telemetry.unresolved.filter((u) => u.testCaseId === 'TC-LOGIN-001' && u.source === 'platform-tool');
  assert.ok(u1.length && ['Quarantined', 'Automation Failure'].includes(u1[0].history));
  assert.equal(u1[0].telemetry, u1[0].history, 'the platform\'s final event states the same unresolved status');
  assert.equal(h.telemetry.unattributed, 1);
  assert.ok(h.notes.some((n) => /cannot attribute 1 event/.test(n)));
});

// ---------------------------------------------------------------------------------------------
// Legacy compatibility
// ---------------------------------------------------------------------------------------------

test('legacy telemetry: old-vocabulary events still read and count as before; emission never writes into a historical run', (t) => {
  const ws = hf.workspace(); t.after(() => hf.cleanup(ws));
  const run = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1];
  skill(ws, run, 1, 'TC-1', 'Passed', { attempt: 1 });
  skill(ws, run, 2, 'TC-2', 'Failed', { attempt: 1 });
  skill(ws, run, 3, 'TC-3', 'Inconclusive', { attempt: 1 });
  const m = metricsOf(ws, run);
  assert.deepEqual([m.execution.passed.value, m.execution.failed.value, m.execution.inconclusive.value, m.execution.executed.value], [1, 1, 1, 3]);
  assert.equal(m.formulas.EXECUTION_PASS_RATE.value, 0.5, 'Passed / (Passed + Failed), unchanged for the original vocabulary');
  assert.equal(m.execution.failures.unclassified.value, 1, 'a legacy Failed is an unclassified failure');
  // A legacy run (no run state model) and a completed run are refused.
  const legacy = fs.mkdtempSync(path.join(os.tmpdir(), 'tel-legacy-'));
  t.after(() => fs.rmSync(legacy, { recursive: true, force: true }));
  fs.mkdirSync(path.join(legacy, 'runs', 'run-001', 'metadata'), { recursive: true });
  fs.writeFileSync(path.join(legacy, 'runs', 'run-001', 'metadata', 'run.json'), '{"runId":"R1"}');
  const r = emitExecutionTelemetry({ dataRoot: legacy, runFolder: 'run-001', stageId: '5A', now: NOW });
  assert.match(r.refused, /legacy run/);
  assert.deepEqual(fs.readdirSync(path.join(legacy, 'runs', 'run-001', 'metadata')), ['run.json']);
});

// ---------------------------------------------------------------------------------------------
// Documentation consistency
// ---------------------------------------------------------------------------------------------

test('documentation matches the implemented model: statuses, health dimensions, formulas, legacy behaviour, emission', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  for (const s of Object.keys(STATUSES)) assert.ok(readme.includes(s), `README §15.1 maps ${s}`);
  for (const d of Object.keys(HEALTH_DEFINITIONS)) assert.match(readme, new RegExp(`\\| ${d[0].toUpperCase()}${d.slice(1)} \\|`), `README §15.2 defines ${d}`);
  for (const f of FORMULAS) assert.ok(readme.includes(`\`${f.id}\``), `README §8 registers ${f.id}`);
  const s12 = readme.slice(readme.indexOf('## 12. Historical runs'), readme.indexOf('## 13. Usage'));
  assert.doesNotMatch(s12, /run-001, run-002 and run-003 were never instrumented/, 'the outdated three-run statement is gone');
  assert.match(s12, /Nothing is written into it/);
  assert.match(s12, /Unverified/);
  assert.match(readme, /### 15\.4 Canonical execution telemetry and reconciliation/);
  assert.match(readme, /evidenceKey/);
  assert.match(readme, /### 15\.5 The dashboard and Run Health/);
  const pipeline = fs.readFileSync(path.join(REPO, 'workflows_and_pipelines', 'pipeline', 'pipeline.md'), 'utf8');
  const p154 = pipeline.slice(pipeline.indexOf('### 15.4 Two reliability classes'), pipeline.indexOf('### 15.5'));
  assert.match(p154, /Execution results are platform-emitted since Phase 8\.1/);
  const reporting = fs.readFileSync(path.join(REPO, '.claude', 'skills', 'reporting-skill', 'SKILL.md'), 'utf8');
  assert.match(reporting, /Coverage, Contract and Workflow Health/);
  assert.doesNotMatch(reporting, /Must report the three health figures separately/);
});
