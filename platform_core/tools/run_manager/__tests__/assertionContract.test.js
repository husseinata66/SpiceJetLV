// Phase 5.8 — the structured assertion contract, Test Design → Execution → Reporting. Real CLIs as child
// processes against disposable data roots (git repositories, so a committed "legacy" suite is real), plus
// the public API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const contract = require('../assertionContract');
const history = require('../executionHistory');
const integrity = require('../reportIntegrity');
const rb = require('../../report_builder');
const { parseTestCases, toRows } = require('../../test_suite_export/parseTestCases');
const { writeVerifiedReport } = require('./reportFixture');

const TOOLS = path.resolve(__dirname, '..', '..');
const RM = path.join(TOOLS, 'run_manager', 'cli.js');
const MM = path.join(TOOLS, 'module_manager', 'cli.js');

// ---------------------------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------------------------

const header = (title, status) => `# ${title}\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n`;
const table = (rows) => `**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n`;
/** The cases, each optionally stating its assertions. */
const C1 = { id: 'TC-LOGIN-001', expected: 'Sign-in is refused and the banner reads "Account locked".', design: [['A1', 'Sign-in is refused', 'Expected Result', 'present', 'AC-1'], ['A2', '`Account locked`', 'Expected Result', 'equals', 'AC-1']] };
const C2 = { id: 'TC-LOGIN-002', expected: 'The reset link is rejected with HTTP `410`.', design: [['A1', '`410`', 'Expected Result', 'equals', 'AC-2']] };
const legacy = (c) => ({ ...c, design: null });
const caseText = (c, { review = 'Approved' } = {}) => `### ${c.id} — ${c.id}\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. s.\n\n**Expected Result:** ${c.expected}\n\n${c.design ? table(c.design) : ''}**Priority:** P1\n\n**Tags:** Atomic\n\n**Review:** ${review}\n\n**Automation:** Approved\n`;
const suite = (status, cases, opts) => `${header('Test Cases', status)}\n## Test Cases\n\n${cases.map((c) => caseText(c, opts)).join('\n')}`;
const matrix = (status, cases) => `${header('Traceability Matrix', status)}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${cases.map((c) => `| ${c.id} | PC §3 | N/A | N/A | N/A | N/A | Module | Low | r | Traced |`).join('\n')}\n`;
/** A results file: rows, then §3.1 records [Test Case ID, Assertion ID, Expected, Actual, Check, Result]. */
const results = (rows, records) => `| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |\n|---|---|---|---|---|---|\n${rows.map(([id, st, mod = 'login']) => `| ${id} | ${mod} | ${st} | 1 min | — | — |`).join('\n')}\n\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|---|\n${records.map(([tc, id, e, a, chk, res]) => `| ${tc} | ${id} | check | ${e} | — | ${a} | ${chk} | ${res} | — |`).join('\n')}\n`;
const GOOD = [
  ['TC-LOGIN-001', 'A1', 'Sign-in is refused', 'Sign-in is refused (no session created)', 'present', '✅'],
  ['TC-LOGIN-001', 'A2', '`Account locked`', '`Account locked`', 'equals', '✅'],
  ['TC-LOGIN-002', 'A1', '`410`', '`410`', 'equals', '✅'],
];

function workspace(modules = ['login']) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-'));
  const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  git('init', '-q');
  const ws = {
    root,
    runsDir: path.join(root, 'runs'),
    put(rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; },
    read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); },
    rm(...args) { require('./approvalFixture').preflightBeforeCliStart(args, ws.runsDir); const r = spawnSync(process.execPath, [RM, ...args, '--runs-dir', ws.runsDir], { encoding: 'utf8' }); return { code: r.status, text: `${r.stdout}\n${r.stderr}`, out: r.stdout }; },
    meta(run) { return JSON.parse(ws.read(`runs/${run}/metadata/run.json`)); },
    commit(msg) { git('add', '-A'); const c = git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-q', '-m', msg); assert.equal(c.status, 0, c.stderr); },
  };
  fs.mkdirSync(ws.runsDir, { recursive: true });
  for (const m of modules) {
    for (const a of [['propose', '--name', m[0].toUpperCase() + m.slice(1)], ['approve', m, '--by', 'Reviewer']]) {
      const r = spawnSync(process.execPath, [MM, ...a, '--modules-dir', path.join(root, 'modules')], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
    }
  }
  return ws;
}
const cleanup = (ws) => fs.rmSync(ws.root, { recursive: true, force: true });
const flip = (ws, rel, from, to) => ws.put(rel, ws.read(rel).replace(`| Status | ${from} |`, `| Status | ${to} |`));
const TC = (m = 'login') => `modules/${m}/test_design/TestCases_${m}.md`;
const TM = (m = 'login') => `modules/${m}/test_design/TraceabilityMatrix.md`;

function newRun(ws, modules = ['login']) { return ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', modules.join(','), '--no-activate').text.match(/Created (\S+)/)[1]; }
function checkpoint(ws, run, id, files, { expectRefusal = false } = {}) {
  const s = ws.rm('state', 'start', id, '--invocation', 'Pipeline', '--run', run);
  assert.equal(s.code, 0, `start ${id}: ${s.text}`);
  for (const [rel, text] of files) ws.put(rel, text);
  ws.rm('state', 'request-approval', id, '--artifacts', files.map((f) => f[0]).join(','), '--run', run);
  for (const [rel] of files) flip(ws, rel, 'Pending Review', 'Approved');
  const ap = ws.rm('state', 'approve', id, '--approved-by', 'Reviewer', '--run', run);
  if (!expectRefusal) assert.equal(ap.code, 0, ap.text);
  return ap;
}
function contextAndDiscovery(ws, run, modules = ['login']) {
  checkpoint(ws, run, '1', modules.map((m) => [`modules/${m}/context/ProjectContext.md`, header('Project Context', 'Pending Review')]));
  checkpoint(ws, run, '2', modules.map((m) => [`modules/${m}/discovery/QA_Assessment_Report.md`, header('QA Assessment', 'Pending Review')]));
}
/** A structured run through Stage 3, then 4M started through its gate. */
function structuredRun(ws, cases = [C1, C2]) {
  const run = newRun(ws);
  contextAndDiscovery(ws, run);
  checkpoint(ws, run, '3', [[TC(), suite('Pending Review', cases)], [TM(), matrix('Pending Review', cases)]]);
  assert.equal(ws.rm('state', 'start', '4M', '--invocation', 'Pipeline', '--run', run).code, 0);
  return run;
}
function record(ws, run, text) {
  ws.put(`runs/${run}/manual_execution/ManualExecutionResults.md`, text);
  const r = ws.rm('state', 'outcome', '4M', '--from-results', '--run', run);
  assert.equal(r.code, 0, r.text);
  return ws.meta(run).stages['4M'].outcome;
}
const t = (o, id) => o.tests.find((x) => x.testCaseId === id);

// ---------------------------------------------------------------------------------------------
// Design side
// ---------------------------------------------------------------------------------------------

test('new structured test cases: approved; every required assertion recorded and passing → Passed, coverage complete (CLI)', () => {
  const ws = workspace();
  try {
    const run = structuredRun(ws);
    const o = record(ws, run, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], GOOD));
    assert.deepEqual(o.counts, { Passed: 2 });
    assert.equal(o.verdict, 'all-passed');
    assert.deepEqual(t(o, 'TC-LOGIN-001').assertions.coverage, { mode: 'structured', state: 'complete', required: 2, verified: 2, clauses: 2, covered: 2, missing: [], failed: [], extra: [], unmapped: [] });
    assert.deepEqual([o.assertionCoverage.complete, o.assertionCoverage.structured, o.assertionCoverage.missing.length], [2, 2, 0]);
    // The approved suite is snapshotted at approval.
    const sha = ws.meta(run).stages['3'].approval.headerEvidence.find((h) => h.path === TC()).sha256;
    assert.ok(fs.existsSync(path.join(ws.root, `runs/${run}/metadata/approved/${sha}.md`)));
  } finally { cleanup(ws); }
});

test('a new case without assertions, or with missing / duplicate Assertion IDs, is refused at Stage 3 approval', () => {
  const ws = workspace();
  try {
    const run = newRun(ws);
    contextAndDiscovery(ws, run);
    const noIds = { ...C2, design: [['', '`410`', 'Expected Result', 'equals', 'AC-2']] };
    const dupIds = { ...C1, design: [['A1', 'Sign-in is refused', 'Expected Result', 'present', 'AC-1'], ['A1', '`Account locked`', 'Expected Result', 'equals', 'AC-1']] };
    const bad = checkpoint(ws, run, '3', [[TC(), suite('Pending Review', [dupIds, noIds, { ...C2, id: 'TC-LOGIN-003', design: null }])], [TM(), matrix('Pending Review', [C1, C2])]], { expectRefusal: true });
    assert.notEqual(bad.code, 0);
    assert.match(bad.text, /ASSERTIONS_REQUIRED/);
    assert.match(bad.text, /no Assertions table: TC-LOGIN-003/);
    assert.match(bad.text, /TC-LOGIN-001: A1: duplicate Assertion ID/);
    assert.match(bad.text, /TC-LOGIN-002: row 1: no Assertion ID/);
    assert.match(bad.text, /every case is new/);
    // Fixed in place, the same checkpoint is approved.
    ws.put(TC(), suite('Approved', [C1, C2]));
    assert.equal(ws.rm('state', 'approve', '3', '--approved-by', 'Reviewer', '--run', run).code, 0);
  } finally { cleanup(ws); }
});

test('legacy and updated test cases: unchanged legacy cases need nothing; a materially updated one needs the contract; a lifecycle-only change does not count', () => {
  const ws = workspace();
  try {
    // The committed suite: two legacy cases with no assertions.
    ws.put(TC(), suite('Approved', [legacy(C1), legacy(C2)], { review: 'Pending' }));
    ws.commit('legacy suite');
    const run = newRun(ws);
    contextAndDiscovery(ws, run);
    // Only the Review decision changed: not material. Approved as is, nothing rewritten.
    checkpoint(ws, run, '3', [[TC(), suite('Pending Review', [legacy(C1), legacy(C2)])], [TM(), matrix('Pending Review', [C1, C2])]]);
    assert.doesNotMatch(ws.read(TC()), /\*\*Assertions:\*\*/, 'legacy cases are never rewritten');

    // TC-LOGIN-002's Expected Result changes: material — it needs the contract; TC-LOGIN-001 does not.
    ws.rm('state', 'reopen', '3', '--by', 'QA', '--reason', 'reset code changed', '--run', run);
    const updated = { ...legacy(C2), expected: 'The reset link is rejected with HTTP `404`.' };
    ws.put(TC(), suite('Pending Review', [legacy(C1), updated]));
    ws.rm('state', 'request-approval', '3', '--run', run);
    flip(ws, TC(), 'Pending Review', 'Approved');
    ws.rm('state', 'impact', '--artifact', TC(), '--changed', 'TC-LOGIN-002', '--record', '--decision', 'approved', '--by', 'QA', '--reason', 'r', '--run', run);
    const refused = ws.rm('state', 'approve', '3', '--approved-by', 'QA', '--run', run);
    assert.match(refused.text, /ASSERTIONS_REQUIRED[\s\S]*no Assertions table: TC-LOGIN-002/);
    assert.doesNotMatch(refused.text, /TC-LOGIN-001/);
    assert.match(refused.text, /last approved version \(snapshot\)/);
    // With its table, approved; TC-LOGIN-001 stays legacy.
    ws.put(TC(), suite('Approved', [legacy(C1), { ...updated, design: [['A1', '`404`', 'Expected Result', 'equals', 'AC-2']] }]));
    ws.rm('state', 'impact', '--artifact', TC(), '--changed', 'TC-LOGIN-002', '--record', '--decision', 'approved', '--by', 'QA', '--reason', 'r', '--run', run);
    assert.equal(ws.rm('state', 'approve', '3', '--approved-by', 'QA', '--run', run).code, 0);

    // Execution: the legacy case is checked textually, the updated one structurally.
    assert.equal(ws.rm('state', 'start', '4M', '--invocation', 'Pipeline', '--run', run).code, 0);
    const o = record(ws, run, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], [
      ['TC-LOGIN-001', '—', 'Sign-in is refused', 'Sign-in is refused', 'equals', '✅'],
      ['TC-LOGIN-001', '—', '`Account locked`', '`Account locked`', 'equals', '✅'],
      ['TC-LOGIN-002', 'A1', '`404`', '`404`', 'equals', '✅'],
    ]));
    assert.equal(t(o, 'TC-LOGIN-001').assertions.coverage.mode, 'textual');
    assert.equal(t(o, 'TC-LOGIN-002').assertions.coverage.mode, 'structured');
    assert.deepEqual(o.counts, { Passed: 2 });
    assert.deepEqual([o.assertionCoverage.structured, o.assertionCoverage.textual], [1, 1]);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Execution side
// ---------------------------------------------------------------------------------------------

test('missing, extra and failed execution assertions are reported apart; a missing one prevents a verified Passed', () => {
  const ws = workspace();
  try {
    const run = structuredRun(ws);
    const o = record(ws, run, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], [
      ['TC-LOGIN-001', 'A1', 'Sign-in is refused', 'Sign-in is refused', 'present', '✅'],       // A2 missing
      ['TC-LOGIN-002', 'A1', '`410`', '`410`', 'equals', '✅'],
      ['TC-LOGIN-002', 'A9', '`Expired`', '`Expired`', 'equals', '✅'],                           // extra
    ]));
    assert.equal(t(o, 'TC-LOGIN-001').final, 'Unverified');
    assert.match(t(o, 'TC-LOGIN-001').reason, /required assertion\(s\) with no execution record: A2/);
    assert.equal(t(o, 'TC-LOGIN-002').final, 'Passed', 'an extra record is reported, not counted');
    assert.deepEqual(o.assertionCoverage.missing, [{ testCaseId: 'TC-LOGIN-001', ids: ['A2'] }]);
    assert.deepEqual(o.assertionCoverage.extra, [{ testCaseId: 'TC-LOGIN-002', ids: ['A9'] }]);
    assert.deepEqual(o.assertionCoverage.failed, []);

    const run2 = newRun(ws);
    ws.rm('state', 'start', '4M', '--invocation', 'Direct', '--run', run2);
    const o2 = record(ws, run2, results([['TC-LOGIN-001', 'Passed']], [
      ['TC-LOGIN-001', 'A1', 'Sign-in is refused', 'Sign-in is refused', 'present', '✅'],
      ['TC-LOGIN-001', 'A2', '`Account locked`', '`Invalid password`', 'equals', '❌'],
    ]));
    assert.equal(t(o2, 'TC-LOGIN-001').final, 'Inconclusive');
    assert.deepEqual(o2.assertionCoverage.failed, [{ testCaseId: 'TC-LOGIN-001', ids: ['A2'] }]);
    assert.deepEqual(o2.assertionCoverage.missing, []);
    assert.ok(o2.conflicts.some((c) => c.kind === 'assertion-failed-but-passed'));
    assert.equal(o2.verdict, 'incomplete');
  } finally { cleanup(ws); }
});

test('changed expected values and duplicate assertion records are conflicts; the approved design is the consumed version', () => {
  const ws = workspace();
  try {
    const run = structuredRun(ws);
    // After 4M started, the suite's A2 is changed to "Account suspended": the consumed design still says "Account locked".
    ws.put(TC(), ws.read(TC()).replace(/`Account locked`/g, '`Account suspended`').replace('"Account locked"', '"Account suspended"'));
    const o = record(ws, run, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], [
      ['TC-LOGIN-001', 'A1', 'Sign-in is refused', 'Sign-in is refused', 'present', '✅'],
      ['TC-LOGIN-001', 'A2', '`Account suspended`', '`Account suspended`', 'equals', '✅'],  // the new value, not the approved one
      ['TC-LOGIN-002', 'A1', '`410`', '`410`', 'equals', '✅'],
      ['TC-LOGIN-002', 'A1', '`410`', '`410`', 'equals', '✅'],                              // recorded twice
    ]));
    assert.equal(t(o, 'TC-LOGIN-001').final, 'Unverified');
    assert.match(t(o, 'TC-LOGIN-001').reason, /A2: the recorded Expected "`Account suspended`" is not the approved "`Account locked`"/);
    assert.ok(o.conflicts.some((c) => c.testCaseId === 'TC-LOGIN-001' && c.kind === 'assertion-expected-changed'));
    assert.equal(t(o, 'TC-LOGIN-002').final, 'Inconclusive');
    assert.ok(o.conflicts.some((c) => c.testCaseId === 'TC-LOGIN-002' && c.kind === 'duplicate-assertion-record'));
    assert.equal(t(o, 'TC-LOGIN-001').assertions.sourceVersion, 'snapshot');
  } finally { cleanup(ws); }
});

test('multi-module identity: each module\'s case is checked against its own design', () => {
  const ws = workspace(['login', 'branch']);
  try {
    const run = newRun(ws, ['login', 'branch']);
    contextAndDiscovery(ws, run, ['login', 'branch']);
    const L = { id: 'TC-SHARED-001', expected: 'The page reads "Saved".', design: [['A1', '`Saved`', 'Expected Result', 'equals', 'AC-1']] };
    const B = { id: 'TC-SHARED-001', expected: 'The page reads "Branch saved".', design: [['A1', '`Branch saved`', 'Expected Result', 'equals', 'AC-7']] };
    checkpoint(ws, run, '3', [[TC('login'), suite('Pending Review', [L])], [TM('login'), matrix('Pending Review', [L])], [TC('branch'), suite('Pending Review', [B])], [TM('branch'), matrix('Pending Review', [B])]]);
    assert.equal(ws.rm('state', 'start', '4M', '--invocation', 'Pipeline', '--run', run).code, 0);
    const o = record(ws, run, results([['TC-SHARED-001', 'Passed', 'login'], ['TC-SHARED-001', 'Passed', 'branch']], [
      ['login:TC-SHARED-001', 'A1', '`Saved`', '`Saved`', 'equals', '✅'],
      ['branch:TC-SHARED-001', 'A1', '`Saved`', '`Saved`', 'equals', '✅'],   // login's value, not branch's design
    ]));
    assert.equal(t(o, 'login:TC-SHARED-001').final, 'Passed');
    assert.equal(t(o, 'branch:TC-SHARED-001').final, 'Unverified');
    assert.match(t(o, 'branch:TC-SHARED-001').reason, /not the approved "`Branch saved`"/);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Reporting and export
// ---------------------------------------------------------------------------------------------

test('reporting: missing apart from failed; a pass with a missing assertion, or green while incomplete, is refused; 6A accepts a faithful report', () => {
  const ws = workspace();
  try {
    const run = structuredRun(ws);
    const o = record(ws, run, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], [GOOD[0], GOOD[2]]));
    assert.deepEqual(o.counts, { Passed: 1, Unverified: 1 });
    const statuses = [{ key: 'PASS', label: 'Passed', tone: 'pass' }, { key: 'UNVERIFIED', label: 'Unverified', tone: 'warning' }];
    const asCase = (status, as) => ({ id: 'TC-LOGIN-001', title: 't', status, assertions: as });
    const rows = [{ id: 'A1', assertion: 'Refused', expected: 'Sign-in is refused', actual: 'Sign-in is refused', check: 'present', result: 'pass' }, { id: 'A2', assertion: 'Banner', expected: 'Account locked', check: 'equals', result: 'missing' }];
    assert.throws(() => rb.normalizeModel({ title: 'r', statuses, testCases: { categories: [{ key: 'positive', cases: [asCase('PASS', rows)] }] } }), /assertion "Banner" is missing/);
    const html = rb.renderReport({ title: 'r', statuses, testCases: { categories: [{ key: 'positive', cases: [asCase('UNVERIFIED', rows)] }] } });
    assert.match(html, /Missing — not recorded/);
    // report-check: the green claim and the counts are checked against the outcome.
    const dir = path.join(ws.runsDir, run, 'reporting');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'g.report.json'), JSON.stringify({ title: 'r', statusPill: 'ALL PASSED', statusPillTone: 'pass', outcomeVerdict: 'all-passed', statuses, summary: { counts: [{ status: 'PASS', value: 2 }] } }));
    const res = integrity.checkReportConsistency({ json: path.join(dir, 'g.report.json'), outcome: o });
    assert.equal(res.ok, false);
    // A faithful report completes 6A.
    ws.rm('state', 'start', '6A', '--invocation', 'Direct (degraded)', '--run', run);
    writeVerifiedReport(ws.runsDir, run, path.join(dir, 'Final_QA_Report.md'));
    ws.rm('state', 'artifact', '6A', '--artifacts', `runs/${run}/reporting/Final_QA_Report.md`, '--run', run);
    const done = ws.rm('state', 'complete', '6A', '--run', run);
    assert.equal(done.code, 0, done.text);
  } finally { cleanup(ws); }
});

test('export: the Assertions table is its own field and the workbook\'s last column; Expected Result is untouched', () => {
  const { cases, warnings } = parseTestCases(suite('Approved', [C1, legacy(C2)]));
  assert.equal(cases[0].expectedResult, C1.expected);
  assert.match(cases[0].assertions, /\| A2 \| `Account locked` \|/);
  assert.equal(cases[1].assertions, undefined);
  assert.deepEqual(warnings, []);
  const rows = toRows(cases);
  assert.equal(rows[0][rows[0].length - 1], 'Assertions');
  assert.match(rows[1][rows[0].length - 1], /A1/);
  assert.equal(rows[2][rows[0].length - 1], '');
  // API: the design gate on its own.
  const g = contract.designGate(cases, null);
  assert.deepEqual([g.newOrChanged, g.missing], [['TC-LOGIN-001', 'TC-LOGIN-002'], ['TC-LOGIN-002']]);
  assert.deepEqual(contract.designGate(cases, cases).missing, [], 'unchanged cases need nothing');
});

test('Stage 3 approval prints non-blocking advisories for a circular Expected Source, and none for a named source', () => {
  const ws = workspace();
  try {
    const run = newRun(ws);
    contextAndDiscovery(ws, run);
    const grounded = { ...C2, design: [['A1', '`410`', 'AC-2', 'equals', 'AC-2']] };
    const ap = checkpoint(ws, run, '3', [[TC(), suite('Pending Review', [C1, grounded])], [TM(), matrix('Pending Review', [C1, grounded])]]);
    assert.equal(ap.code, 0, 'an advisory never refuses approval');
    assert.match(ap.text, /advisory: modules\/login\/test_design\/TestCases_login\.md TC-LOGIN-001 A1: Expected Source is "Expected Result"/);
    assert.match(ap.text, /TC-LOGIN-001 A2: Expected Source is "Expected Result"/);
    assert.doesNotMatch(ap.text, /TC-LOGIN-002 A1: Expected Source/);
  } finally { cleanup(ws); }
});
