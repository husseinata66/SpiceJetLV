// Phase 5.6A — integration regressions for audit findings #1, #2, #3 and #5 (Phase 5.5 audit scenarios
// FI-8, W8b, FI-4b, C5, FI-3a, FI-3b, C4). Real CLIs as child processes against disposable data roots,
// plus the public API for the same checks. Nothing here uses a test hook: every start runs the gate.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const gate = require('../stageGate');
const planner = require('../workflowPlanner');
const history = require('../executionHistory');
const { writeVerifiedReport } = require('./reportFixture');

const TOOLS = path.resolve(__dirname, '..', '..');
const RM = path.join(TOOLS, 'run_manager', 'cli.js');
const MM = path.join(TOOLS, 'module_manager', 'cli.js');

// ---------------------------------------------------------------------------------------------
// Fixture: a disposable data root, driven through the real CLIs
// ---------------------------------------------------------------------------------------------

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'remediation-'));
  const ws = {
    root,
    runsDir: path.join(root, 'runs'),
    put(rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; },
    read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); },
    edit(rel, from, to) { const t = ws.read(rel); assert.ok(t.includes(from), `fixture anchor "${from}" in ${rel}`); ws.put(rel, t.replace(from, to)); },
    rm(...args) {
      require('./approvalFixture').preflightBeforeCliStart(args, ws.runsDir);
      const r = spawnSync(process.execPath, [RM, ...args, '--runs-dir', ws.runsDir], { encoding: 'utf8' });
      return { code: r.status, text: `${r.stdout}\n${r.stderr}`, out: r.stdout };
    },
    mm(...args) {
      const r = spawnSync(process.execPath, [MM, ...args, '--modules-dir', path.join(root, 'modules')], { encoding: 'utf8' });
      assert.equal(r.status, 0, `module_manager ${args.join(' ')}: ${r.stderr}`);
    },
    json(...args) { const r = ws.rm(...args, '--json'); return JSON.parse(r.out); },
    meta(run) { return JSON.parse(ws.read(`runs/${run}/metadata/run.json`)); },
  };
  fs.mkdirSync(ws.runsDir, { recursive: true });
  ws.mm('propose', '--name', 'Login');
  ws.mm('approve', 'login', '--by', 'Reviewer');
  return ws;
}
const cleanup = (ws) => fs.rmSync(ws.root, { recursive: true, force: true });

function newRun(ws) {
  const r = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', 'login', '--no-activate');
  const m = r.text.match(/Created (\S+)/);
  assert.ok(m, r.text);
  return m[1];
}

const header = (title, status) => `# ${title}\n\n| Field | Value |\n|---|---|\n| Module | \`login\` |\n| Status | ${status} |\n`;
const PC = 'modules/login/context/ProjectContext.md';
const QA = 'modules/login/discovery/QA_Assessment_Report.md';
const TC = 'modules/login/test_design/TestCases_Login.md';
const TM = 'modules/login/test_design/TraceabilityMatrix.md';
const PLAN = 'modules/login/automation/AutomationPlan_Playwright.md';
const CASES = ['TC-LOGIN-001', 'TC-LOGIN-002', 'TC-LOGIN-003'];

const projectContext = (status) => `${header('Project Context — login', status)}\n## 3. Requirements\n\n| ID | Requirement |\n|---|---|\n| AC-1 | A locked account cannot sign in |\n| AC-2 | A reset link expires after 30 minutes |\n| AC-3 | Five failed attempts lock the account |\n`;
const testCase = (id, review = 'Approved', automation = 'Approved') => `### ${id} — Case ${id}\n\n**Objective:** Check ${id}.\n\n**Preconditions:** A user exists.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. Do it.\n\n**Expected Result:** It works.\n\n**Assertions:**\n\n| Assertion ID | Expected | Expected Source | Check | Requirement |\n|---|---|---|---|---|\n| A1 | It works | Expected Result | equals | AC-1 |\n\n**Priority:** P1\n\n**Tags:** Regression\n\n**Review:** ${review}\n\n**Automation:** ${automation}\n`;
const suite = (status, reviews = {}) => `${header('Test Cases — login', status)}\n## Test Cases\n\n${CASES.map((id) => testCase(id, reviews[id] || 'Approved', reviews[id] || 'Approved')).join('\n')}`;
const matrix = (status) => `${header('Traceability Matrix — login', status)}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${CASES.map((id, i) => `| ${id} | PC §3 / AC-${i + 1} | N/A | N/A | N/A | N/A | Module | Medium | r | Traced |`).join('\n')}\n`;
// Each Passed row carries a §11.4 assertion record whose expected value is the approved case's own
// Expected Result ("It works"), so it verifies (Phase 5.6B).
const assertionRows = (rows) => {
  const passed = rows.filter(([, st]) => st === 'Passed');
  return passed.length
    ? `\n### Assertion Records\n\n| Test Case ID | Assertion ID | Assertion | Expected | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|\n${passed.map(([id]) => `| ${id} | A1 | Outcome | It works | It works | equals | ✅ | — |`).join('\n')}\n`
    : '';
};
const results = (rows, cols = 'auto') => (cols === 'auto'
  ? `| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n${rows.map(([id, st]) => `| ${id} | s | ${st} | 1 s | 1 | — | — |`).join('\n')}\n`
  : `| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |\n|---|---|---|---|---|---|\n${rows.map(([id, st]) => `| ${id} | login | ${st} | 1 min | — | — |`).join('\n')}\n`) + assertionRows(rows);

const flip = (ws, rel, from = 'Pending Review', to = 'Approved') => ws.edit(rel, `| Status | ${from} |`, `| Status | ${to} |`);

/** start → write Pending → request approval → the reviewer sets the header → approve. CLI only. */
function checkpoint(ws, run, id, files) {
  assert.equal(ws.rm('state', 'start', id, '--invocation', 'Pipeline', '--run', run).code, 0, `start ${id}`);
  for (const [rel, text] of files) ws.put(rel, text);
  assert.equal(ws.rm('state', 'request-approval', id, '--artifacts', files.map((f) => f[0]).join(','), '--run', run).code, 0);
  for (const [rel] of files) flip(ws, rel);
  const ap = ws.rm('state', 'approve', id, '--approved-by', 'Reviewer', '--run', run);
  assert.equal(ap.code, 0, `approve ${id}: ${ap.text}`);
}
function upstream(ws, run, { suiteText = suite('Pending Review') } = {}) {
  checkpoint(ws, run, '1', [[PC, projectContext('Pending Review')]]);
  checkpoint(ws, run, '2', [[QA, header('QA Assessment Report — login', 'Pending Review')]]);
  checkpoint(ws, run, '3', [[TC, suiteText], [TM, matrix('Pending Review')]]);
}
function automation(ws, run) {
  assert.equal(ws.rm('state', 'start', '4A', '--invocation', 'Pipeline', '--run', run).code, 0);
  ws.put(PLAN, `${header('Automation Plan — login', 'Pending Review')}\nAutomate approved cases.\n`);
  ws.mm('automation', 'login', '--state', 'Generated', '--by', 'agent');
  ws.rm('state', 'request-approval', '4A', '--artifacts', PLAN, '--run', run);
  flip(ws, PLAN);
  ws.mm('automation', 'login', '--state', 'Approved', '--by', 'Automation Lead');
  const ap = ws.rm('state', 'approve', '4A', '--approved-by', 'Automation Lead', '--run', run);
  assert.equal(ap.code, 0, ap.text);
}
function execute(ws, run, rows) {
  assert.equal(ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--run', run).code, 0);
  const ER = ws.put(`runs/${run}/execution/ExecutionResults.md`, results(rows));
  ws.rm('state', 'artifact', '5A', '--artifacts', ER, '--run', run);
  assert.equal(ws.rm('state', 'outcome', '5A', '--from-results', '--run', run).code, 0);
  assert.equal(ws.rm('state', 'complete', '5A', '--run', run).code, 0);
}
function automatedRun(ws) {
  const run = newRun(ws);
  ws.rm('state', 'workflow', 'full-automation', '--by', 'Lead', '--run', run);
  upstream(ws, run);
  automation(ws, run);
  return run;
}

// ---------------------------------------------------------------------------------------------
// Finding #1 — 6A completes only with a verified report (FI-8)
// ---------------------------------------------------------------------------------------------

test('FI-8: a report that disagrees with the recorded outcome cannot complete 6A — CLI and API', () => {
  const ws = workspace();
  try {
    const run = automatedRun(ws);
    execute(ws, run, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Passed'], ['TC-LOGIN-003', 'Application Failure']]);
    assert.equal(ws.rm('state', 'start', '6A', '--invocation', 'Pipeline', '--run', run).code, 0);
    const md = path.join(ws.runsDir, run, 'reporting', 'Final_QA_Report.md');
    const rel = `runs/${run}/reporting/Final_QA_Report.md`;

    // Nothing registered.
    assert.match(ws.rm('state', 'complete', '6A', '--run', run).text, /NO_OUTPUT|REPORT_NOT_REGISTERED/);

    // A green "all passed" report over a run with a failure: refused by the CLI and by the API.
    writeVerifiedReport(ws.runsDir, run, md, { counts: { Passed: 3 }, verdict: 'all-passed' });
    ws.rm('state', 'artifact', '6A', '--artifacts', rel, '--run', run);
    const cli = ws.rm('state', 'complete', '6A', '--run', run);
    assert.notEqual(cli.code, 0);
    assert.match(cli.text, /REPORT_UNVERIFIED/);
    assert.throws(() => rs.completeStage(ws.runsDir, run, { stageId: '6A', now: new Date() }), (e) => e.code === 'REPORT_UNVERIFIED');
    assert.equal(ws.meta(run).stages['6A'].status, 'Running', 'never marked completed');

    // Missing HTML, and an HTML built from another model: both refused.
    writeVerifiedReport(ws.runsDir, run, md);
    fs.rmSync(md.replace(/\.md$/, '.html'));
    assert.match(ws.rm('state', 'complete', '6A', '--run', run).text, /REPORT_UNVERIFIED[\s\S]*html/i);
    writeVerifiedReport(ws.runsDir, run, md);
    const json = md.replace(/\.md$/, '.report.json');
    fs.writeFileSync(json, fs.readFileSync(json, 'utf8').replace('"COMPLETE"', '"DONE"'));
    assert.match(ws.rm('state', 'complete', '6A', '--run', run).text, /was not built from the current/);

    // A model without the verdict: refused.
    writeVerifiedReport(ws.runsDir, run, md, { verdict: null });
    assert.match(ws.rm('state', 'complete', '6A', '--run', run).text, /declares no outcomeVerdict/);

    // The agreeing report completes, and the check is recorded with the completion.
    writeVerifiedReport(ws.runsDir, run, md);
    assert.equal(ws.rm('state', 'report-check', '--model', json, '--md', md, '--html', md.replace(/\.md$/, '.html'), '--run', run).code, 0);
    const done = ws.rm('state', 'complete', '6A', '--run', run);
    assert.equal(done.code, 0, done.text);
    const completion = ws.meta(run).stages['6A'].completions.pop();
    assert.equal(completion.reportCheck.outcomeStage, '5A');
    assert.equal(completion.reportCheck.verdict, 'failures');
  } finally { cleanup(ws); }
});

test('FI-8: after a later outcome, the delivered report is kept and a revision is required — earlier revisions untouched', () => {
  const ws = workspace();
  try {
    const run = automatedRun(ws);
    execute(ws, run, [['TC-LOGIN-001', 'Passed'], ['TC-LOGIN-002', 'Automation Failure'], ['TC-LOGIN-003', 'Passed']]);
    ws.rm('state', 'start', '6A', '--invocation', 'Pipeline', '--run', run);
    const first = path.join(ws.runsDir, run, 'reporting', 'Final_QA_Report.md');
    writeVerifiedReport(ws.runsDir, run, first);
    ws.rm('state', 'artifact', '6A', '--artifacts', `runs/${run}/reporting/Final_QA_Report.md`, '--run', run);
    assert.equal(ws.rm('state', 'complete', '6A', '--run', run).code, 0);
    const delivered = fs.readFileSync(first, 'utf8');

    // 5H repairs TC-LOGIN-002; the outcome moves on, so the delivered report no longer verifies.
    ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
    const rr = ws.put(`runs/${run}/execution/ExecutionResults.rerun-1.md`, results([['TC-LOGIN-002', 'Passed']]));
    ws.rm('state', 'artifact', '5H', '--artifacts', rr, '--run', run);
    assert.equal(ws.rm('state', 'outcome', '5H', '--from-results', '--run', run).code, 0);
    ws.rm('state', 'reopen', '6A', '--by', 'Lead', '--reason', '5H ran after the report', '--run', run);
    assert.match(ws.rm('state', 'complete', '6A', '--run', run).text, /REPORT_UNVERIFIED/);

    const rev = ws.json('state', 'report-path', '--run', run);
    assert.equal(rev.revision, 1);
    writeVerifiedReport(ws.runsDir, run, rev.md);
    ws.rm('state', 'artifact', '6A', '--artifacts', `runs/${run}/reporting/Final_QA_Report.rev-1.md`, '--run', run);
    const done = ws.rm('state', 'complete', '6A', '--run', run);
    assert.equal(done.code, 0, done.text);
    assert.equal(fs.readFileSync(first, 'utf8'), delivered, 'the first report is never rewritten');
    assert.equal(ws.meta(run).stages['6A'].completions.pop().reportCheck.outcomeStage, '5H');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Finding #2 — revalidation from what each stage consumed (W8b, FI-4b)
// ---------------------------------------------------------------------------------------------

test('W8b: a changed upstream, re-approved, still marks every stage built on the earlier version — CLI and API', () => {
  const ws = workspace();
  try {
    const run = automatedRun(ws);
    execute(ws, run, CASES.map((id) => [id, 'Passed']));
    const executionsBefore = ws.read(`runs/${run}/execution/ExecutionResults.md`);

    // The requirement changes; Stage 1 is sent back, re-approved with an impact decision.
    ws.rm('state', 'reopen', '1', '--by', 'BA', '--reason', 'AC-2 is now 15 minutes', '--run', run);
    ws.edit(PC, '30 minutes', '15 minutes');
    flip(ws, PC, 'Approved', 'Pending Review');
    ws.rm('state', 'request-approval', '1', '--run', run);
    flip(ws, PC);
    assert.equal(ws.rm('state', 'impact', '--artifact', PC, '--changed', 'AC-2', '--record', '--decision', 'approved', '--by', 'BA', '--reason', 'retest', '--run', run).code, 0);
    assert.equal(ws.rm('state', 'approve', '1', '--approved-by', 'BA', '--run', run).code, 0);

    // Planner (CLI): 2, 3, 4A and 5A need revalidation; the next action is a Human Decision, not 6A.
    const plan = ws.json('state', 'plan', '--run', run);
    const flagged = plan.stages.filter((s) => s.category === 'needs-revalidation').map((s) => s.stageId);
    assert.deepEqual(flagged, ['2', '3', '4A', '5A']);
    assert.equal(plan.next.action, 'revalidate');
    assert.ok(plan.revalidation.some((i) => i.stageId === '2' && i.kind === 'upstream-changed'));
    assert.ok(plan.revalidation.some((i) => i.stageId === '2' && i.kind === 'upstream-reapproved'));
    // API: the same plan for the same state.
    const api = planner.planWorkflow(ws.runsDir, run, { now: new Date() });
    assert.deepEqual(api.stages.filter((x) => x.category === 'needs-revalidation').map((x) => x.stageId), flagged);

    // verify (CLI) agrees: Stage 2's own approval holds, but it was built on the earlier context.
    const v = ws.rm('state', 'verify', '2', '--run', run);
    assert.equal(v.code, 2);
    assert.match(v.text, /VERIFIED[\s\S]*needs revalidation/);

    // start (CLI) agrees: 6A is blocked — 5A was built on the earlier context.
    const s6 = ws.rm('state', 'start', '6A', '--invocation', 'Pipeline', '--run', run);
    assert.equal(s6.code, 2);
    assert.match(s6.text, /built on modules\/login\/context\/ProjectContext\.md/);

    // API: the same facts.
    assert.equal(rs.verifyStageApproval(ws.runsDir, run, '2').current, false);
    assert.equal(gate.checkStageEntry(ws.runsDir, run, { stageId: '6A', invocationPath: 'Pipeline', now: new Date() }).decision, 'blocked');

    // Nothing was reopened or rerun automatically; evidence and approvals are kept.
    const meta = ws.meta(run);
    for (const id of ['2', '3', '4A', '5A']) assert.equal(meta.stages[id].status, 'Completed');
    assert.equal(ws.read(`runs/${run}/execution/ExecutionResults.md`), executionsBefore);
    assert.equal(meta.stages['1'].approval.previous.length >= 1, true, 'the earlier approval stays in history');
  } finally { cleanup(ws); }
});

test('FI-4b: Stage 3 re-approved after automation — 5A is blocked as built on an earlier suite, until a named human accepts it', () => {
  const ws = workspace();
  try {
    const run = automatedRun(ws);
    ws.rm('state', 'reopen', '3', '--by', 'QA', '--reason', 'expected result reworded', '--run', run);
    ws.edit(TC, '**Expected Result:** It works.', '**Expected Result:** It works, with a message.');
    flip(ws, TC, 'Approved', 'Pending Review');
    flip(ws, TM, 'Approved', 'Pending Review');
    ws.rm('state', 'request-approval', '3', '--run', run);
    flip(ws, TC); flip(ws, TM);
    ws.rm('state', 'impact', '--artifact', TC, '--changed', 'TC-LOGIN-001', '--record', '--decision', 'approved', '--by', 'QA', '--reason', 'wording', '--run', run);
    assert.equal(ws.rm('state', 'approve', '3', '--approved-by', 'QA', '--run', run).code, 0);

    const g = ws.json('state', 'gate', '5A', '--invocation', 'Pipeline', '--run', run);
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /Stage 4A .*was built on modules\/login\/test_design\/TestCases_Login\.md/.test(b)), g.blockers.join('\n'));
    assert.equal(ws.json('state', 'next', '--run', run).next.humanDecision, true);
    assert.equal(ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--run', run).code, 2);

    // Acceptance is by name only, and recorded.
    const ok = ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--accept-stale-by', 'QA Lead', '--run', run);
    assert.equal(ok.code, 0, ok.text);
    assert.equal(ws.meta(run).stages['5A'].entryGate.acceptedStaleBy, 'QA Lead');
  } finally { cleanup(ws); }
});

test('revalidation: an unchanged workflow raises nothing (no false positives)', () => {
  const ws = workspace();
  try {
    const run = automatedRun(ws);
    execute(ws, run, CASES.map((id) => [id, 'Passed']));
    const plan = ws.json('state', 'plan', '--run', run);
    assert.deepEqual(plan.revalidation, []);
    assert.deepEqual([plan.next.action, plan.next.command && /start 6A/.test(plan.next.command)], ['start', true]);
    assert.equal(ws.rm('state', 'verify', '3', '--run', run).code, 0);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Finding #3 — results compared with the exact approved scope (C5)
// ---------------------------------------------------------------------------------------------

test('C5: 4M started for TC-LOGIN-001 only — pending and unrequested results are Excluded with conflicts, verdict capped', () => {
  const ws = workspace();
  try {
    const run = newRun(ws);
    checkpoint(ws, run, '1', [[PC, projectContext('Pending Review')]]);
    checkpoint(ws, run, '2', [[QA, header('QA Assessment Report — login', 'Pending Review')]]);
    ws.rm('state', 'start', '3', '--invocation', 'Pipeline', '--run', run);
    ws.put(TC, suite('Approved (TC-LOGIN-001, TC-LOGIN-003); TC-LOGIN-002 Pending Review', { 'TC-LOGIN-002': 'Pending' }));
    ws.put(TM, matrix('Approved'));
    ws.rm('state', 'request-approval', '3', '--artifacts', `${TC},${TM}`, '--run', run);
    assert.equal(ws.rm('state', 'approve-scope', '--artifact', TC, '--approved-by', 'QA', '--run', run).code, 0);
    const s = ws.rm('state', 'start', '4M', '--invocation', 'Direct', '--scope-items', 'TC-LOGIN-001', '--by', 'QA Lead', '--run', run);
    assert.equal(s.code, 0, s.text);
    assert.deepEqual(ws.meta(run).stages['4M'].entryGate.executableScope.cases, ['TC-LOGIN-001']);

    const MR = ws.put(`runs/${run}/manual_execution/ManualExecutionResults.md`, results(CASES.map((id) => [id, 'Passed']), 'manual'));
    const raw = ws.read(MR);
    assert.equal(ws.rm('state', 'outcome', '4M', '--from-results', '--run', run).code, 0);
    const o = ws.meta(run).stages['4M'].outcome;
    assert.deepEqual(o.counts, { Passed: 1, Excluded: 2 });
    assert.equal(o.verdict, 'incomplete');
    assert.deepEqual(o.conflicts.map((c) => `${c.testCaseId}:${c.kind}`).sort(), ['TC-LOGIN-002:outside-approved-scope', 'TC-LOGIN-003:outside-approved-scope']);
    assert.deepEqual(o.scope, { basis: 'partial-scope', cases: 1, recordedBy: '4M' });
    // The raw record is unchanged, and every recorded status is still readable.
    assert.equal(ws.read(MR), raw);
    assert.deepEqual(o.tests.find((t) => t.testCaseId === 'TC-LOGIN-002').cycles, ['1:Passed']);

    // API path: the history reader applies the same scope.
    const h = history.buildHistory(ws.runsDir, run, '4M');
    assert.deepEqual(h.counts, { Passed: 1, Excluded: 2 });
  } finally { cleanup(ws); }
});

test('C5 (automation): a case not approved for automation, and one not in the suite, are never counted for 5A or 5H', () => {
  const ws = workspace();
  try {
    const run = newRun(ws);
    ws.rm('state', 'workflow', 'full-automation', '--by', 'Lead', '--run', run);
    upstream(ws, run, { suiteText: suite('Pending Review').replace('**Review:** Approved\n\n**Automation:** Approved\n', '**Review:** Approved\n\n**Automation:** Rejected\n') });
    automation(ws, run);
    execute(ws, run, [...CASES.map((id) => [id, 'Passed']), ['TC-LOGIN-099', 'Passed']]);
    const o5 = ws.meta(run).stages['5A'].outcome;
    assert.deepEqual(o5.counts, { Passed: 2, Excluded: 2 });
    assert.equal(o5.verdict, 'incomplete');
    assert.match(o5.conflicts.find((c) => c.testCaseId === 'TC-LOGIN-001').detail, /Automation Rejected/);
    assert.match(o5.conflicts.find((c) => c.testCaseId === 'TC-LOGIN-099').detail, /not in the approved suite/);

    // 5H reports on what 5A was authorised to run.
    ws.rm('state', 'start', '5H', '--invocation', 'Direct', '--by', 'QA Lead', '--run', run);
    const rr = ws.put(`runs/${run}/execution/ExecutionResults.rerun-1.md`, results([['TC-LOGIN-099', 'Passed']]));
    ws.rm('state', 'artifact', '5H', '--artifacts', rr, '--run', run);
    ws.rm('state', 'outcome', '5H', '--from-results', '--run', run);
    const o5h = ws.meta(run).stages['5H'].outcome;
    assert.equal(o5h.counts.Excluded, 2);
    assert.equal(o5h.scope.recordedBy, '5A');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Finding #5 — every checkpoint artifact of the upstream approval is gated (FI-3a, FI-3b, C4)
// ---------------------------------------------------------------------------------------------

test('FI-3a: an approved Automation Plan edited after 4A approval blocks 5A — gate, start, next and verify agree', () => {
  const ws = workspace();
  try {
    const run = automatedRun(ws);
    ws.edit(PLAN, 'Automate approved cases.', 'Automate approved cases and TC-LOGIN-009.');
    const g = ws.json('state', 'gate', '5A', '--invocation', 'Pipeline', '--run', run);
    assert.equal(g.decision, 'blocked');
    assert.ok(g.checks.some((c) => c.artifact === PLAN && c.result === 'modified'));
    assert.equal(ws.rm('state', 'start', '5A', '--invocation', 'Pipeline', '--run', run).code, 2);
    assert.equal(ws.rm('state', 'verify', '4A', '--run', run).code, 2);
    const n = ws.json('state', 'next', '--run', run).next;
    assert.equal(n.humanDecision, true);
    assert.notEqual(n.action, 'start');
    assert.equal(gate.checkStageEntry(ws.runsDir, run, { stageId: '5A', invocationPath: 'Pipeline', now: new Date() }).decision, 'blocked');
  } finally { cleanup(ws); }
});

test('FI-3b / C4: an approved Traceability Matrix edited after Stage 3 approval blocks 4M — in this run and in a new one', () => {
  const ws = workspace();
  try {
    const run = newRun(ws);
    ws.rm('state', 'workflow', 'full-manual', '--by', 'Lead', '--run', run);
    upstream(ws, run);
    ws.edit(TM, '| TC-LOGIN-003 | PC §3 / AC-3 |', '| TC-LOGIN-003 | PC §3 / AC-1 |');

    const n = ws.json('state', 'next', '--run', run).next;
    const g = ws.json('state', 'gate', '4M', '--invocation', 'Pipeline', '--run', run);
    const v = ws.rm('state', 'verify', '3', '--run', run);
    const s = ws.rm('state', 'start', '4M', '--invocation', 'Pipeline', '--run', run);
    assert.equal(n.action, 'revalidate');
    assert.equal(g.decision, 'blocked');
    assert.ok(g.checks.some((c) => c.artifact === TM && c.result === 'modified'), JSON.stringify(g.checks));
    assert.equal(v.code, 2);
    assert.equal(s.code, 2);

    // A new run consuming the same approved Stage 3 is blocked too (the approval is found across runs).
    const run2 = newRun(ws);
    assert.equal(ws.json('state', 'gate', '4M', '--invocation', 'Direct', '--run', run2).decision, 'blocked');
    // Restoring the approved content restores the gate.
    ws.edit(TM, '| TC-LOGIN-003 | PC §3 / AC-1 |', '| TC-LOGIN-003 | PC §3 / AC-3 |');
    assert.equal(ws.json('state', 'gate', '4M', '--invocation', 'Direct', '--run', run2).decision, 'proceed');
  } finally { cleanup(ws); }
});
