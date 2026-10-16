// Phase 5.7 — final integration hardening: checkpoint registration recovery (#8), Manifest consistency
// (#9), the Low findings (#10, #11, #13–#15), expected-source version integrity, and assertion coverage.
// Real CLIs as child processes against disposable data roots, plus the public API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const history = require('../executionHistory');

const TOOLS = path.resolve(__dirname, '..', '..');
const RM = path.join(TOOLS, 'run_manager', 'cli.js');
const MM = path.join(TOOLS, 'module_manager', 'cli.js');

const header = (title, status) => `# ${title}\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n`;
const CASES = [
  { id: 'TC-LOGIN-001', expected: 'Sign-in is refused and the banner reads "Account locked".' },
  { id: 'TC-LOGIN-002', expected: 'The account is locked and the user is told why.' },
];
const testCase = (c) => `### ${c.id} — ${c.id}\n\n**Objective:** o.\n\n**Preconditions:** p.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. s.\n\n**Expected Result:** ${c.expected}\n\n**Priority:** P1\n\n**Tags:** t\n\n**Review:** Approved\n\n**Automation:** Approved\n`;
const suite = (status, cases = CASES) => `${header('Test Cases', status)}\n## Test Cases\n\n${cases.map(testCase).join('\n')}`;
const matrix = (status) => `${header('Traceability Matrix', status)}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${CASES.map((c) => `| ${c.id} | PC §3 | N/A | N/A | N/A | N/A | Module | Low | r | Traced |`).join('\n')}\n`;
const results = (rows, records) => `| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |\n|---|---|---|---|---|---|\n${rows.map(([id, st]) => `| ${id} | login | ${st} | 1 min | — | — |`).join('\n')}\n\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|\n${records.map((r) => `| ${r.join(' | ')} | — |`).join('\n')}\n`;
const GOOD = [
  ['TC-LOGIN-001', 'Refused', 'Sign-in is refused', '—', 'Sign-in is refused', 'equals', '✅'],
  ['TC-LOGIN-001', 'Banner', '`Account locked`', '—', '`Account locked`', 'equals', '✅'],
  ['TC-LOGIN-002', 'Locked', 'The account is locked', '—', 'The account is locked', 'equals', '✅'],
];

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hardening-'));
  const ws = {
    root,
    runsDir: path.join(root, 'runs'),
    put(rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; },
    read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); },
    rm(...args) { require('./approvalFixture').preflightBeforeCliStart(args, ws.runsDir); const r = spawnSync(process.execPath, [RM, ...args, '--runs-dir', ws.runsDir], { encoding: 'utf8' }); return { code: r.status, text: `${r.stdout}\n${r.stderr}`, out: r.stdout }; },
    meta(run) { return JSON.parse(ws.read(`runs/${run}/metadata/run.json`)); },
  };
  fs.mkdirSync(ws.runsDir, { recursive: true });
  for (const a of [['propose', '--name', 'Login'], ['approve', 'login', '--by', 'Reviewer']]) {
    const r = spawnSync(process.execPath, [MM, ...a, '--modules-dir', path.join(root, 'modules')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  }
  return ws;
}
const cleanup = (ws) => fs.rmSync(ws.root, { recursive: true, force: true });
/**
 * Makes a suite LEGACY: committed before this run, with no structured assertions (Phase 5.8 compatibility).
 * Its cases are then unchanged against the committed version, so Stage 3 approves them without the
 * assertion contract — the path these tests exercise (assertion records checked textually). Committed
 * with a Draft header, so its fingerprint never equals a version a stage consumes.
 */
function commitLegacy(root, files) {
  const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  if (!fs.existsSync(path.join(root, '.git'))) git('init', '-q');
  for (const [rel, text] of files) {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text.replace(/\| Status \| [^|]+ \|/, '| Status | Draft |'));
  }
  git('add', '-A');
  const c = git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-q', '-m', 'legacy suite');
  assert.equal(c.status, 0, `git commit: ${c.stderr}`);
}

const flip = (ws, rel, from, to) => ws.put(rel, ws.read(rel).replace(`| Status | ${from} |`, `| Status | ${to} |`));
const PC = 'modules/login/context/ProjectContext.md';
const QA = 'modules/login/discovery/QA_Assessment_Report.md';
const TC = 'modules/login/test_design/TestCases_login.md';
const TM = 'modules/login/test_design/TraceabilityMatrix.md';

function newRun(ws) { return ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate').text.match(/Created (\S+)/)[1]; }
function checkpoint(ws, run, id, files) {
  assert.equal(ws.rm('state', 'start', id, '--invocation', 'Pipeline', '--run', run).code, 0, `start ${id}`);
  for (const [rel, text] of files) ws.put(rel, text);
  ws.rm('state', 'request-approval', id, '--artifacts', files.map((f) => f[0]).join(','), '--run', run);
  for (const [rel] of files) flip(ws, rel, 'Pending Review', 'Approved');
  const ap = ws.rm('state', 'approve', id, '--approved-by', 'Reviewer', '--run', run);
  assert.equal(ap.code, 0, ap.text);
}
function upstream(ws, run) {
  checkpoint(ws, run, '1', [[PC, header('Project Context', 'Pending Review')]]);
  checkpoint(ws, run, '2', [[QA, header('QA Assessment', 'Pending Review')]]);
  commitLegacy(ws.root, [[TC, suite('Pending Review')]]);
  checkpoint(ws, run, '3', [[TC, suite('Pending Review')], [TM, matrix('Pending Review')]]);
}
function manual(ws) {
  const run = newRun(ws);
  ws.rm('state', 'workflow', 'full-manual', '--by', 'Lead', '--run', run);
  upstream(ws, run);
  assert.equal(ws.rm('state', 'start', '4M', '--invocation', 'Pipeline', '--run', run).code, 0);
  return run;
}

// ---------------------------------------------------------------------------------------------
// #8 — checkpoint registration
// ---------------------------------------------------------------------------------------------

test('#8 wrong checkpoint registration: a header-less file is refused; a wrong one is corrected by name, kept in history, and re-gated', () => {
  const ws = workspace();
  try {
    const run = manual(ws);
    const MR = ws.put(`runs/${run}/manual_execution/ManualExecutionResults.md`, results([['TC-LOGIN-001', 'Passed']], GOOD.slice(0, 2)));
    const SUM = `runs/${run}/manual_execution/ManualExecutionSummary.md`;
    // A results file has no Status header: it can never be a checkpoint.
    assert.match(ws.rm('state', 'request-approval', '4M', '--artifacts', MR, '--run', run).text, /INVALID_CHECKPOINT/);
    assert.match(ws.rm('state', 'artifact', '4M', '--artifacts', MR, '--kind', 'checkpoint', '--run', run).text, /INVALID_CHECKPOINT/);

    // A wrong — but well-formed — checkpoint is registered and approval requested.
    const WRONG = ws.put(`runs/${run}/manual_execution/InterimNotes.md`, header('Interim notes', 'Pending Review'));
    ws.put(SUM, header('Manual Execution Summary', 'Pending Review'));
    assert.equal(ws.rm('state', 'request-approval', '4M', '--artifacts', `${WRONG},${SUM}`, '--run', run).code, 0);
    // Correction needs a name and a reason.
    assert.notEqual(ws.rm('state', 'correct-checkpoint', '4M', '--artifact', WRONG, '--as', 'output', '--run', run).code, 0);
    const c = ws.rm('state', 'correct-checkpoint', '4M', '--artifact', WRONG, '--as', 'output', '--by', 'QA Lead', '--reason', 'interim notes are not the reviewed artifact', '--run', run);
    assert.equal(c.code, 0, c.text);
    let st = ws.meta(run).stages['4M'];
    assert.equal(st.status, 'Blocked', 'what the reviewer was asked to approve changed');
    const entry = st.artifacts.find((a) => a.path === WRONG);
    assert.equal(entry.kind, 'output');
    assert.ok(entry.recordedAt, 'the original registration is kept');
    assert.deepEqual(entry.corrections.map((x) => [x.from, x.to, x.by]), [['checkpoint', 'output', 'QA Lead']]);
    assert.equal(st.registrationHistory.length, 1);
    // Back through the normal gates: start (entry gate), request, approve.
    assert.equal(ws.rm('state', 'start', '4M', '--invocation', 'Pipeline', '--run', run).code, 0);
    // 4M is approved only with an outcome recorded from its results (Phase 9.1, F-02).
    assert.equal(ws.rm('state', 'outcome', '4M', '--from-results', '--run', run).code, 0);
    assert.equal(ws.rm('state', 'request-approval', '4M', '--run', run).code, 0);
    flip(ws, SUM, 'Pending Review', 'Approved');
    const ap = ws.rm('state', 'approve', '4M', '--approved-by', 'QA Lead', '--run', run);
    assert.equal(ap.code, 0, ap.text);
    st = ws.meta(run).stages['4M'];
    assert.deepEqual(st.approval.headerEvidence.map((h) => h.path), [SUM]);
    // A completed stage's approved checkpoints are not corrected in place.
    assert.match(ws.rm('state', 'correct-checkpoint', '4M', '--artifact', SUM, '--as', 'output', '--by', 'QA Lead', '--reason', 'y', '--run', run).text, /ILLEGAL_TRANSITION/);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// #9 + #11 — Manifest consistency
// ---------------------------------------------------------------------------------------------

test('#9 Manifest-only approval is refused on a state-model run; an old Manifest-only row is reconciled and logged', () => {
  const ws = workspace();
  try {
    const run = newRun(ws);
    const r = ws.rm('stage', 'Stage 3 — Test Design', '--status', 'Approved', '--reviewer', 'Someone', '--run', run);
    assert.equal(r.code, 1);
    assert.match(r.text, /MANIFEST_ONLY_REFUSED/);
    // A row written that way before the refusal existed: reconciled on the next state change.
    const M = `runs/${run}/metadata/RunManifest.md`;
    const text = ws.read(M);
    const sep = text.match(/\| Stage \| Artifact \|[^\n]*\n\|[-| ]+\|\n/);
    ws.put(M, text.replace(sep[0], `${sep[0]}| Stage 3 — Test Design | — | 2026-10-01T00:00:00.000Z | Approved | Someone | 0 | — | — |\n`));
    ws.rm('state', 'workflow', 'full-manual', '--by', 'Lead', '--run', run);
    const after = ws.read(M);
    assert.match(after, /\| Stage 3 — Test Design \| — \| [^|]+ \| Not Started \|/);
    assert.match(after, /ledger reconciled with the run state: it read "Approved" \(reviewer Someone\)/);
    assert.equal(rs.readRunState(ws.runsDir, run).stages['3'].status, 'Not Started');
  } finally { cleanup(ws); }
});

test('#11 a completed 5A/6A reads Completed in the Manifest ledger', () => {
  const ws = workspace();
  try {
    const run = newRun(ws);
    ws.rm('state', 'start', '6A', '--invocation', 'Direct (degraded)', '--run', run);
    const md = path.join(ws.runsDir, run, 'reporting', 'Final_QA_Report.md');
    require('./reportFixture').writeVerifiedReport(ws.runsDir, run, md);
    ws.rm('state', 'artifact', '6A', '--artifacts', `runs/${run}/reporting/Final_QA_Report.md`, '--run', run);
    assert.equal(ws.rm('state', 'complete', '6A', '--run', run).code, 0);
    assert.match(ws.read(`runs/${run}/metadata/RunManifest.md`), /\| Stage 6A — Reporting \| \[Final_QA_Report\.md\][^|]*\| [^|]+ \| Completed \|/);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Low findings #10, #13, #14, #15
// ---------------------------------------------------------------------------------------------

test('#10 #13 #14 #15: run path, approvals vs revalidation, legacy Unknown in list, report-check paths', () => {
  const ws = workspace();
  try {
    // #10 — the printed path is where the run was created.
    const created = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate');
    const shown = created.text.match(/path:\s+(\S+)/)[1];
    assert.ok(fs.existsSync(path.resolve(path.dirname(RM), '..', '..', '..', shown)) || fs.existsSync(path.resolve(shown)), shown);
    assert.doesNotMatch(shown, /^platform_core_data\/runs\//);
    const run = created.text.match(/Created (\S+)/)[1];

    // #13 — an approval whose stage needs revalidation is shown apart.
    ws.rm('state', 'workflow', 'full-manual', '--by', 'Lead', '--run', run);
    checkpoint(ws, run, '1', [[PC, header('Project Context', 'Pending Review')]]);
    ws.put(PC, `${ws.read(PC)}\nEdited after approval.\n`);
    const st = JSON.parse(ws.rm('state', 'status', '--json', '--run', run).out);
    assert.deepEqual([st.approvals.approved, st.approvals.needsRevalidation], [[], ['1']]);
    assert.match(ws.rm('state', 'status', '--run', run).text, /approved \[\] · needs revalidation \[1\]/);

    // #14 — a legacy run lists as Unknown.
    ws.put('runs/run-001__legacy/metadata/run.json', JSON.stringify({ status: 'Preparing' }));
    assert.match(ws.rm('list').text, /run-001__legacy \[Unknown\]/);

    // #15 — report-check resolves against the data root, and refuses a path outside it.
    const rel = `runs/${run}/reporting/m.report.json`;
    ws.put(rel, JSON.stringify({ title: 'r', summary: null }));
    assert.equal(ws.rm('state', 'report-check', '--model', rel, '--run', run).code, 0);
    assert.equal(ws.rm('state', 'report-check', '--model', `${path.basename(ws.root)}/${rel}`, '--run', run).code, 0);
    assert.match(ws.rm('state', 'report-check', '--model', '../outside.report.json', '--run', run).text, /OUTSIDE_DATA_ROOT/);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Expected-source version integrity
// ---------------------------------------------------------------------------------------------

test('suite modified after execution: expected values are verified against the snapshot the stage consumed, never the current suite', () => {
  const ws = workspace();
  try {
    const run = manual(ws);
    const ref = ws.meta(run).moduleArtifactRefs.find((r) => r.stage === '4M' && r.artifact === TC);
    assert.ok(ref.snapshot && fs.existsSync(path.join(ws.root, ref.snapshot)), 'the consumed suite is snapshotted at start');
    // The suite changes after the stage started: TC-LOGIN-001's banner now reads "Account suspended".
    ws.put(TC, ws.read(TC).replace('Account locked', 'Account suspended'));
    ws.put(`runs/${run}/manual_execution/ManualExecutionResults.md`, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], [
      ...GOOD,
    ]));
    assert.equal(ws.rm('state', 'outcome', '4M', '--from-results', '--run', run).code, 0);
    const o = ws.meta(run).stages['4M'].outcome;
    const t1 = o.tests.find((t) => t.testCaseId === 'TC-LOGIN-001');
    assert.equal(t1.final, 'Passed', 'verified against what was executed');
    assert.equal(t1.assertions.sourceVersion, 'snapshot');
    assert.deepEqual(o.sourceVersions.map((v) => [v.suite, v.basis]), [[TC, 'snapshot']]);

    // An expected value that only the CURRENT suite contains is not accepted.
    const run2 = newRun(ws);
    ws.put(TC, ws.read(TC).replace('Account suspended', 'Account locked'));
    // (restore v1 so the second run consumes it, then change it again after it starts)
    ws.rm('state', 'start', '4M', '--invocation', 'Direct', '--run', run2);
    ws.put(TC, ws.read(TC).replace('Account locked', 'Account suspended'));
    ws.put(`runs/${run2}/manual_execution/ManualExecutionResults.md`, results([['TC-LOGIN-001', 'Passed']], [
      ['TC-LOGIN-001', 'Refused', 'Sign-in is refused', '—', 'Sign-in is refused', 'equals', '✅'],
      ['TC-LOGIN-001', 'Banner', '`Account suspended`', '—', '`Account suspended`', 'equals', '✅'],
    ]));
    const h = history.buildHistory(ws.runsDir, run2, '4M');
    const x = h.tests.find((t) => t.testCaseId === 'TC-LOGIN-001');
    assert.equal(x.finalStatus, 'Unverified');
    assert.match(x.finalReason, /Account suspended`?" is not in the approved test case/);
    assert.match(x.finalReason, /requires "Account locked"/, 'the literal of the consumed version is what must be checked');
  } finally { cleanup(ws); }
});

test('missing historical source version: no snapshot, suite changed, no git — Unverified, never the current suite', () => {
  const ws = workspace();
  try {
    const run = manual(ws);
    const ref = ws.meta(run).moduleArtifactRefs.find((r) => r.stage === '4M' && r.artifact === TC);
    fs.rmSync(path.join(ws.root, ref.snapshot));
    ws.put(TC, `${ws.read(TC)}\n<!-- edited -->\n`);
    ws.put(`runs/${run}/manual_execution/ManualExecutionResults.md`, results([['TC-LOGIN-001', 'Passed']], GOOD.slice(0, 2)));
    const h = history.buildHistory(ws.runsDir, run, '4M');
    assert.deepEqual(h.sourceVersions.map((v) => v.basis), ['unavailable']);
    const t = h.tests.find((x) => x.testCaseId === 'TC-LOGIN-001');
    assert.equal(t.finalStatus, 'Unverified');
    assert.match(t.finalReason, /cannot be retrieved/);
    // The original evidence is untouched.
    assert.match(ws.read(`runs/${run}/manual_execution/ManualExecutionResults.md`), /\| TC-LOGIN-001 \| login \| Passed \|/);
  } finally { cleanup(ws); }
});

test('a cited source verifies only when it names an artifact the stage consumed, whose consumed version contains the value', () => {
  const ws = workspace();
  try {
    const run = manual(ws);
    ws.put(`runs/${run}/manual_execution/ManualExecutionResults.md`, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], [
      ['TC-LOGIN-001', 'Refused', 'Sign-in is refused', '—', 'Sign-in is refused', 'equals', '✅'],
      ['TC-LOGIN-001', 'Banner', '`Account locked`', 'contract: Auth API §3.2', '`Account locked`', 'equals', '✅'], // in the case too: test-case wins
      ['TC-LOGIN-002', 'Locked', '`Project Context`', `${PC} (title)`, '`Project Context`', 'equals', '✅'],            // consumed artifact, contains it
      ['TC-LOGIN-002', 'Told why', '`reason shown`', 'contract: Auth API §3.2', '`reason shown`', 'equals', '✅'],      // external: unverifiable
    ]));
    const h = history.buildHistory(ws.runsDir, run, '4M');
    const t2 = h.tests.find((x) => x.testCaseId === 'TC-LOGIN-002');
    assert.equal(t2.finalStatus, 'Unverified');
    assert.match(t2.finalReason, /"contract: Auth API §3\.2" is not an artifact this stage consumed/);
    assert.doesNotMatch(t2.finalReason, /Project Context/);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Assertion coverage
// ---------------------------------------------------------------------------------------------

test('prose-only Expected Result: coverage is reported partial with the unmapped clause; a green report is refused', () => {
  const ws = workspace();
  try {
    const run = manual(ws);
    ws.put(`runs/${run}/manual_execution/ManualExecutionResults.md`, results([['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed']], GOOD));
    assert.equal(ws.rm('state', 'outcome', '4M', '--from-results', '--run', run).code, 0);
    const o = ws.meta(run).stages['4M'].outcome;
    assert.equal(o.verdict, 'all-passed', 'every recorded comparison is verified');
    assert.deepEqual([o.assertionCoverage.complete, o.assertionCoverage.partial], [1, 1]);
    assert.deepEqual(o.assertionCoverage.unmapped, [{ testCaseId: 'TC-LOGIN-002', clauses: ['the user is told why'] }]);
    assert.match(ws.rm('state', 'history', '4M', '--run', run).text, /complete 1 · partial 1[\s\S]*unmapped {2}TC-LOGIN-002: "the user is told why"/);
    // A green indicator claims complete verification: refused while coverage is partial.
    const integrity = require('../reportIntegrity');
    const dir = path.join(ws.runsDir, run, 'reporting');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'g.report.json'), JSON.stringify({ title: 'r', statusPill: 'ALL PASSED', statusPillTone: 'pass', outcomeVerdict: 'all-passed', statuses: [{ key: 'PASS', label: 'Passed', tone: 'pass' }], summary: { counts: [{ status: 'PASS', value: 2 }] } }));
    const res = integrity.checkReportConsistency({ json: path.join(dir, 'g.report.json'), outcome: o });
    assert.equal(res.ok, false);
    assert.ok(res.issues.some((i) => /assertion coverage is incomplete/.test(i)));
  } finally { cleanup(ws); }
});
