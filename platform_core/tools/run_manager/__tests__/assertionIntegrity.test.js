// Phase 5.6B — assertion evidence and result integrity (audit findings #4, #6, #7, #12; scenarios E1–E5,
// D2, FI-6, S1, FI-7). Real CLIs as child processes against disposable data roots, plus the public API.
const test = require('node:test');
// An approval recorded through the run state model (Phase 9.1, F-01): a header alone authorizes nothing.
const { recordFixtureApproval } = require('./approvalFixture');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const history = require('../executionHistory');
const ae = require('../assertionEvidence');
const { createRun } = require('../createRun');
const rb = require('../../report_builder');

const TOOLS = path.resolve(__dirname, '..', '..');
const RM = path.join(TOOLS, 'run_manager', 'cli.js');
const MM = path.join(TOOLS, 'module_manager', 'cli.js');
const CG = path.join(TOOLS, 'capability_gate', 'cli.js');

// ---------------------------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------------------------

const CASES = [
  { id: 'TC-LOGIN-001', expected: 'Sign-in is refused and the banner reads "Account locked".' },
  { id: 'TC-LOGIN-002', expected: 'The reset link is rejected with HTTP `410`.' },
  { id: 'TC-LOGIN-003', expected: 'The account status is `Locked` after the fifth failure.' },
];
const header = (title, status) => `# ${title}\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n`;
const testCase = (c) => `### ${c.id} — ${c.id}\n\n**Objective:** Check it.\n\n**Preconditions:** A user exists.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. Do it.\n\n**Expected Result:** ${c.expected}\n\n**Priority:** P1\n\n**Tags:** Regression\n\n**Review:** Approved\n\n**Automation:** Approved\n`;
const suite = (status, cases = CASES) => `${header('Test Cases', status)}\n## Test Cases\n\n${cases.map(testCase).join('\n')}`;
const matrix = (status, cases = CASES) => `${header('Traceability Matrix', status)}\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${cases.map((c) => `| ${c.id} | PC §3 | N/A | N/A | N/A | N/A | Module | Low | r | Traced |`).join('\n')}\n`;

/** The approved, verified records for each case — what a careful executor writes. */
const GOOD = {
  'TC-LOGIN-001': [['Sign-in refused', 'Sign-in is refused', '', 'Sign-in is refused', 'equals', '✅'], ['Banner text', '`Account locked`', '', '`Account locked`', 'equals', '✅']],
  'TC-LOGIN-002': [['Reset link rejected', '`410`', '', '`410`', 'equals', '✅']],
  'TC-LOGIN-003': [['Status after 5th failure', '`Locked`', '', 'status = `Locked`', 'contains', '✅']],
};

/** A results file: per-test rows, then the §3.1 Assertion Records table. */
function resultsFile(rows, { manual = true, assertions = GOOD, extraAssertionRows = [] } = {}) {
  const head = manual
    ? '| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |\n|---|---|---|---|---|---|'
    : '| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|';
  const body = rows.map(({ id, status, evidence = '—', module = 'login', reason = '—' }) => (manual
    ? `| ${id} | ${module} | ${status} | 1 min | ${reason} | ${evidence} |`
    : `| ${id} | s | ${status} | 1 s | 1 | ${reason} | ${evidence} |`)).join('\n');
  const recs = rows.filter((r) => r.status === 'Passed' && assertions[r.id])
    .flatMap((r) => assertions[r.id].map(([a, e, src, act, chk, res, ev = '—']) => `| ${r.qualifiedId || r.id} | ${a} | ${e} | ${src || '—'} | ${act} | ${chk} | ${res} | ${ev} |`));
  return `# Results\n\n## 3. Per-Test Results\n\n${head}\n${body}\n\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|\n${[...recs, ...extraAssertionRows].join('\n')}\n`;
}

function workspace(modules = ['login']) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'assertions-'));
  const ws = {
    root,
    runsDir: path.join(root, 'runs'),
    put(rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; },
    read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); },
    rm(...args) { require('./approvalFixture').preflightBeforeCliStart(args, ws.runsDir); const r = spawnSync(process.execPath, [RM, ...args, '--runs-dir', ws.runsDir], { encoding: 'utf8' }); return { code: r.status, text: `${r.stdout}\n${r.stderr}`, out: r.stdout }; },
    tool(cli, ...args) { const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' }); assert.equal(r.status === 0 || r.status === 2, true, `${path.basename(cli)} ${args.join(' ')}: ${r.stderr}`); return r; },
    meta(run) { return JSON.parse(ws.read(`runs/${run}/metadata/run.json`)); },
  };
  fs.mkdirSync(ws.runsDir, { recursive: true });
  for (const m of modules) {
    ws.tool(MM, 'propose', '--name', m[0].toUpperCase() + m.slice(1), '--modules-dir', path.join(root, 'modules'));
    ws.tool(MM, 'approve', m, '--by', 'Reviewer', '--modules-dir', path.join(root, 'modules'));
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

function newRun(ws, modules = ['login']) {
  const r = ws.rm('new', '--scope', 'Module', '--target', 'Login', '--modules', modules.join(','), '--no-activate');
  return r.text.match(/Created (\S+)/)[1];
}
function checkpoint(ws, run, id, files) {
  assert.equal(ws.rm('state', 'start', id, '--invocation', 'Pipeline', '--run', run).code, 0, `start ${id}`);
  for (const [rel, text] of files) ws.put(rel, text);
  ws.rm('state', 'request-approval', id, '--artifacts', files.map((f) => f[0]).join(','), '--run', run);
  for (const [rel] of files) flip(ws, rel, 'Pending Review', 'Approved');
  const ap = ws.rm('state', 'approve', id, '--approved-by', 'Reviewer', '--run', run);
  assert.equal(ap.code, 0, ap.text);
}
/** A run through Stage 3 for the given modules, then 4M started through its real entry gate. */
function manualRun(ws, modules = ['login'], suites = {}) {
  const run = newRun(ws, modules);
  checkpoint(ws, run, '1', modules.map((m) => [`modules/${m}/context/ProjectContext.md`, header('Project Context', 'Pending Review')]));
  checkpoint(ws, run, '2', modules.map((m) => [`modules/${m}/discovery/QA_Assessment_Report.md`, header('QA Assessment', 'Pending Review')]));
  const design = modules.flatMap((m) => [[`modules/${m}/test_design/TestCases_${m}.md`, suite('Pending Review', suites[m])], [`modules/${m}/test_design/TraceabilityMatrix.md`, matrix('Pending Review', suites[m])]]);
  commitLegacy(ws.root, design.filter(([rel]) => /TestCases_/.test(rel)));
  checkpoint(ws, run, '3', design);
  const s = ws.rm('state', 'start', '4M', '--invocation', 'Pipeline', '--run', run);
  assert.equal(s.code, 0, s.text);
  return run;
}
/** Another run that executes the same approved suite (recorded results are never rewritten). */
function rerunIn(ws, modules = ['login']) {
  const run = newRun(ws, modules);
  const s = ws.rm('state', 'start', '4M', '--invocation', 'Direct', '--run', run);
  assert.equal(s.code, 0, s.text);
  return run;
}
function record(ws, run, text, stage = '4M') {
  const rel = ws.put(`runs/${run}/${stage === '4M' ? 'manual_execution/ManualExecutionResults.md' : 'execution/ExecutionResults.md'}`, text);
  const r = ws.rm('state', 'outcome', stage, '--from-results', '--run', run);
  assert.equal(r.code, 0, r.text);
  return { outcome: ws.meta(run).stages[stage].outcome, rel };
}
const final = (o, id) => o.tests.find((t) => t.testCaseId === id);
const ALL = CASES.map((c) => ({ id: c.id, status: 'Passed' }));

// ---------------------------------------------------------------------------------------------
// Finding #4 — assertion-level evidence
// ---------------------------------------------------------------------------------------------

test('valid multi-assertion Passed: every row complete, sourced from the test case, recomputed — Passed, all-passed (CLI)', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    const { outcome } = record(ws, run, resultsFile(ALL));
    assert.deepEqual(outcome.counts, { Passed: 3 });
    assert.equal(outcome.verdict, 'all-passed');
    assert.deepEqual(outcome.assertionSummary, { verified: 3, unverified: 0, inconclusive: 0, failed: 0, contradiction: 0, none: 0 });
    assert.equal(final(outcome, 'TC-LOGIN-001').assertions.recorded, 2);
    const h = ws.rm('state', 'history', '4M', '--run', run);
    assert.match(h.text, /verified 3 · unverified 0/);
  } finally { cleanup(ws); }
});

test('E1/E2 + missing rows: a screenshot, captured values, or nothing at all never make a Passed — Unverified', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    ws.put(`runs/${run}/manual_execution/artifacts/TC-LOGIN-001.png`, 'png');
    const { outcome, rel } = record(ws, run, resultsFile([
      { id: 'TC-LOGIN-001', status: 'Passed', evidence: 'artifacts/TC-LOGIN-001.png' },     // screenshot only (file exists)
      { id: 'TC-LOGIN-002', status: 'Passed', evidence: 'Observed: status=410, body={"error":"expired"}' }, // captured values
      { id: 'TC-LOGIN-003', status: 'Passed' },                                              // nothing
    ], { assertions: {} }));
    for (const id of ['TC-LOGIN-001', 'TC-LOGIN-002', 'TC-LOGIN-003']) {
      assert.equal(final(outcome, id).final, 'Unverified', id);
      assert.deepEqual(final(outcome, id).cycles, ['1:Passed'], 'the raw status is kept');
    }
    assert.match(final(outcome, 'TC-LOGIN-001').reason, /no assertion records/);
    assert.equal(outcome.verdict, 'incomplete');
    assert.equal(outcome.assertionSummary.none, 3);
    // Evidence existence is not sufficiency: the screenshot exists, and that is all it proves.
    assert.equal(outcome.evidenceIssues.length, 0);
    assert.match(ws.read(rel), /artifacts\/TC-LOGIN-001\.png/, 'the raw file is untouched');
  } finally { cleanup(ws); }
});

test('missing Expected, unsourced Expected, Expected sourced from the observation, an unchecked literal — Unverified (API)', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    record(ws, run, resultsFile(ALL, {
      assertions: {
        'TC-LOGIN-001': [['Sign-in refused', '', '', 'Sign-in is refused', 'equals', '✅'], ['Banner text', '`Account locked`', '', '`Account locked`', 'equals', '✅']],
        'TC-LOGIN-002': [['Reset link rejected', '`409`', '', '`409`', 'equals', '✅']],                     // not in the case
        'TC-LOGIN-003': [['Status', '`Locked`', 'observed on screen', '`Locked`', 'equals', '✅']],          // from the observation
      },
    }));
    const h = history.buildHistory(ws.runsDir, run, '4M');
    const t = (id) => h.tests.find((x) => x.testCaseId === id);
    assert.equal(t('TC-LOGIN-001').finalStatus, 'Unverified');
    assert.match(t('TC-LOGIN-001').finalReason, /no expected recorded/);
    assert.equal(t('TC-LOGIN-002').finalStatus, 'Unverified');
    assert.match(t('TC-LOGIN-002').finalReason, /not in the approved test case and no source is cited/);
    assert.equal(t('TC-LOGIN-003').finalStatus, 'Unverified');
    assert.match(t('TC-LOGIN-003').finalReason, /sourced from the observation/);

    // A quoted literal of the Expected Result that no row checks; and a cited contract is accepted.
    const run2 = rerunIn(ws);
    record(ws, run2, resultsFile(ALL, {
      assertions: {
        ...GOOD,
        'TC-LOGIN-001': [['Sign-in refused', 'Sign-in is refused', '', 'Sign-in is refused', 'equals', '✅']],
        'TC-LOGIN-002': [['Reset link rejected', '`410`', 'contract: Auth API §3.2 (expired token → 410)', '`410`', 'equals', '✅']],
      },
    }));
    const h2 = history.buildHistory(ws.runsDir, run2, '4M');
    assert.match(h2.tests.find((x) => x.testCaseId === 'TC-LOGIN-001').finalReason, /requires "Account locked", but no assertion checks it/);
    assert.equal(h2.tests.find((x) => x.testCaseId === 'TC-LOGIN-002').finalStatus, 'Passed');
  } finally { cleanup(ws); }
});

test('E3 + contradiction: a failed assertion, or a ✅ the values contradict, under a Passed status — Inconclusive with a conflict', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    const { outcome } = record(ws, run, resultsFile(ALL, {
      assertions: {
        ...GOOD,
        'TC-LOGIN-001': [['Sign-in refused', 'Sign-in is refused', '', 'Sign-in is refused', 'equals', '✅'], ['Banner text', '`Account locked`', '', '`Invalid password`', 'equals', '❌']],
        'TC-LOGIN-002': [['Reset link rejected', '`410`', '', '`200`', 'equals', '✅']],
        'TC-LOGIN-003': [['Status', '`Locked`', '', '`Locked`', 'equals', 'Not checked']],
      },
    }));
    assert.equal(final(outcome, 'TC-LOGIN-001').final, 'Inconclusive');
    assert.equal(final(outcome, 'TC-LOGIN-002').final, 'Inconclusive');
    assert.equal(final(outcome, 'TC-LOGIN-003').final, 'Inconclusive');
    const kinds = outcome.conflicts.map((c) => `${c.testCaseId}:${c.kind}`);
    assert.ok(kinds.includes('TC-LOGIN-001:assertion-failed-but-passed'));
    assert.ok(kinds.includes('TC-LOGIN-002:assertion-contradiction'));
    assert.equal(outcome.verdict, 'incomplete');
    assert.notEqual(outcome.counts.Passed, 3);
  } finally { cleanup(ws); }
});

test('E4/E5: the report model refuses a pass with a failed assertion, and all-passed without assertions; the shipped example validates', () => {
  const statuses = [{ key: 'PASS', label: 'Passed', tone: 'pass' }];
  const model = (assertions, verdict = 'all-passed') => ({
    title: 'r', outcomeVerdict: verdict, statuses,
    testCases: { categories: [{ key: 'positive', cases: [{ id: 'TC-1', title: 't', status: 'PASS', evidence: 'Screenshot 01.png', ...(assertions ? { assertions } : {}) }] }] },
  });
  assert.throws(() => rb.normalizeModel(model(null)), /records no assertions/);
  assert.throws(() => rb.normalizeModel(model([{ assertion: 'a', expected: 'x', actual: 'y', check: 'equals', result: 'fail' }])), /assertion "a" is fail/);
  assert.doesNotThrow(() => rb.normalizeModel(model([{ assertion: 'a', expected: 'x', actual: 'x', check: 'equals', result: '✅' }])));
  const html = rb.renderReport(model([{ assertion: 'Banner', expected: 'Account locked', actual: 'Account locked', check: 'equals', result: 'pass' }]));
  assert.match(html, /<div class="assertions">[\s\S]*Banner[\s\S]*Account locked/);
  const example = JSON.parse(fs.readFileSync(path.join(TOOLS, 'report_builder', 'examples', 'example.report.json'), 'utf8'));
  const passes = example.testCases.categories.flatMap((c) => c.cases).filter((c) => c.status === 'PASS');
  assert.ok(passes.every((c) => c.assertions && c.assertions.length && !/screenshot/i.test(String(c.evidence || ''))));
  assert.doesNotThrow(() => rb.normalizeModel(example));
});

// ---------------------------------------------------------------------------------------------
// Finding #6 — result file integrity
// ---------------------------------------------------------------------------------------------

test('FI-6: duplicate rows and an unknown case — conflicts, both rows kept, never the last row silently (CLI)', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    const { outcome } = record(ws, run, resultsFile([...ALL, { id: 'TC-LOGIN-003', status: 'Failed', reason: 'second row' }, { id: 'TC-LOGIN-099', status: 'Passed' }]));
    const t3 = final(outcome, 'TC-LOGIN-003');
    assert.equal(t3.final, 'Inconclusive');
    assert.deepEqual(t3.cycles, ['1:Passed', '1:Failed'], 'both rows are kept');
    assert.ok(outcome.conflicts.some((c) => c.testCaseId === 'TC-LOGIN-003' && c.kind === 'duplicate-result-row'));
    assert.equal(final(outcome, 'TC-LOGIN-099').final, 'Excluded');
    assert.ok(outcome.conflicts.some((c) => c.testCaseId === 'TC-LOGIN-099' && /outside-approved-scope|not-in-approved-suite/.test(c.kind)));
    assert.equal(outcome.verdict, 'incomplete');
  } finally { cleanup(ws); }
});

test('unknown case with no recorded scope (API path): checked against the approved suite', () => {
  const ws = workspace();
  try {
    ws.put('modules/login/test_design/TestCases_login.md', suite('Approved'));
    const { folderName } = createRun(ws.runsDir, { scope: 'Module', target: 'x', now: new Date(), extraRunJson: { modules: ['login'], moduleScope: 'single' } });
    rs._setTestHooks({ skipEntryGate: true });
    try { rs.startStage(ws.runsDir, folderName, { stageId: '4M', invocationPath: 'Direct', now: new Date() }); } finally { rs._setTestHooks({}); }
    ws.put(`runs/${folderName}/manual_execution/ManualExecutionResults.md`, resultsFile([{ id: 'TC-LOGIN-001', status: 'Passed' }, { id: 'TC-OTHER-7', status: 'Passed' }]));
    const o = rs.recordOutcomeFromResults(ws.runsDir, folderName, { stageId: '4M', now: new Date() }).state.stages['4M'].outcome;
    assert.equal(o.scope.basis, 'not-recorded');
    assert.equal(final(o, 'TC-OTHER-7').final, 'Excluded');
    assert.ok(o.conflicts.some((c) => c.kind === 'not-in-approved-suite'));
    // Phase 5.7: this stage started without its gate, so nothing recorded which suite version it consumed.
    // The expected value is in the suite on disk — but that is not shown to be the version executed.
    assert.equal(final(o, 'TC-LOGIN-001').final, 'Unverified');
    assert.match(final(o, 'TC-LOGIN-001').reason, /was not recorded/);
  } finally { cleanup(ws); }
});

test('cross-module ID collision: unqualified rows are ambiguous; a Module column or login:ID qualifies them', () => {
  const ws = workspace(['login', 'branch']);
  try {
    const shared = [{ id: 'TC-SHARED-001', expected: 'The page reads "Saved".' }];
    const run = manualRun(ws, ['login', 'branch'], { login: shared, branch: shared });
    const good = { 'TC-SHARED-001': [['Saved', '`Saved`', '', '`Saved`', 'equals', '✅']] };
    // No module on the row and none on the record: which module's case is it? Unknowable.
    const r1 = record(ws, run, resultsFile([{ id: 'TC-SHARED-001', status: 'Passed', module: '—' }], { assertions: good }));
    assert.equal(r1.outcome.tests[0].final, 'Inconclusive');
    assert.ok(r1.outcome.conflicts.some((c) => c.kind === 'ambiguous-case-id'));
    assert.equal(r1.outcome.identity.qualified, true);
    // Named: both results stand, under module-qualified identities.
    const r2 = record(ws, rerunIn(ws, ['login', 'branch']), resultsFile([{ id: 'TC-SHARED-001', status: 'Passed', module: 'login' }, { id: 'TC-SHARED-001', status: 'Passed', module: 'branch' }], {
      assertions: {},
      extraAssertionRows: ['| login:TC-SHARED-001 | Saved | `Saved` | — | `Saved` | equals | ✅ | — |', '| branch:TC-SHARED-001 | Saved | `Saved` | — | `Saved` | equals | ✅ | — |'],
    }));
    assert.deepEqual(r2.outcome.tests.map((t) => `${t.testCaseId}:${t.final}`).sort(), ['branch:TC-SHARED-001:Passed', 'login:TC-SHARED-001:Passed']);
    assert.equal(r2.outcome.verdict, 'all-passed');
  } finally { cleanup(ws); }
});

test('single-module runs keep bare IDs (no identity change)', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    const { outcome } = record(ws, run, resultsFile(ALL));
    assert.deepEqual(outcome.tests.map((t) => t.testCaseId).sort(), CASES.map((c) => c.id));
    assert.equal(outcome.identity.qualified, false);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Finding #12 — evidence references
// ---------------------------------------------------------------------------------------------

test('FI-7 / evidence references: missing files, traversal, absolute paths, ambiguity — detected; existing files accepted', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    const runDir = path.join(ws.runsDir, run);
    ws.put(`runs/${run}/manual_execution/artifacts/ok.png`, 'png');
    ws.put(`runs/${run}/dup.png`, 'a');
    ws.put(`runs/${run}/manual_execution/dup.png`, 'b');
    ws.put('secret.txt', 'outside the run');
    const { outcome } = record(ws, run, resultsFile(ALL, {
      assertions: {
        'TC-LOGIN-001': [['Sign-in refused', 'Sign-in is refused', '', 'Sign-in is refused', 'equals', '✅', 'artifacts/ok.png'], ['Banner text', '`Account locked`', '', '`Account locked`', 'equals', '✅', 'artifacts/missing.png']],
        'TC-LOGIN-002': [['Reset link rejected', '`410`', '', '`410`', 'equals', '✅', '../../../secret.txt']],
        'TC-LOGIN-003': [['Status', '`Locked`', '', '`Locked`', 'equals', '✅', 'dup.png']],
      },
    }));
    const issue = (id) => outcome.evidenceIssues.filter((e) => e.testCaseId === id).map((e) => `${e.ref}:${e.status}`);
    assert.deepEqual(issue('TC-LOGIN-001'), ['artifacts/missing.png:missing']);
    assert.deepEqual(issue('TC-LOGIN-002'), ['../../../secret.txt:traversal']);
    assert.deepEqual(issue('TC-LOGIN-003'), ['dup.png:ambiguous']);
    for (const id of ['TC-LOGIN-001', 'TC-LOGIN-002', 'TC-LOGIN-003']) assert.equal(final(outcome, id).final, 'Unverified', id);
    assert.ok(outcome.conflicts.some((c) => c.testCaseId === 'TC-LOGIN-002' && c.kind === 'evidence-reference-refused'));
    // API: resolution itself.
    const ctx = { runDir, resultsDir: path.join(runDir, 'manual_execution') };
    assert.equal(ae.resolveEvidenceRef('artifacts/ok.png', ctx).status, 'ok');
    assert.equal(ae.resolveEvidenceRef(path.join(ws.root, 'secret.txt'), ctx).status, 'outside');
    assert.equal(ae.resolveEvidenceRef('C:/Windows/win.ini', ctx).status, 'outside');
    assert.equal(ae.resolveEvidenceRef('..\\..\\secret.txt', ctx).status, 'traversal');
    // A link inside the run that leads outside it is refused (skipped where links cannot be made).
    try {
      fs.symlinkSync(path.join(ws.root, 'secret.txt'), path.join(runDir, 'link.txt'));
      assert.equal(ae.resolveEvidenceRef('link.txt', ctx).status, 'outside');
    } catch (err) { if (!['EPERM', 'EACCES'].includes(err.code)) throw err; }
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Finding #7 — Capability Plan exclusions (S1)
// ---------------------------------------------------------------------------------------------

test('S1: a case the Supplier does not support, recorded as Failed — Excluded, not a failure, conflict, verdict capped (CLI)', () => {
  const ws = workspace([]);
  try {
    const sf = (...a) => ws.tool(MM, 'supplier-feature', ...a, '--supplier-features-dir', path.join(ws.root, 'supplier-features'));
    sf('feature', 'propose', '--name', 'Import Booked PNR', '--integration-layer', 'ndc-core-service');
    sf('feature', 'approve', 'import-booked-pnr', '--by', 'Reviewer');
    sf('supplier', 'propose', 'import-booked-pnr', '--name', 'Test Air NDC');
    sf('supplier', 'approve', 'import-booked-pnr', 'test-air-ndc', '--by', 'Reviewer');
    sf('supplier', 'capabilities', 'import-booked-pnr', 'test-air-ndc', '--hold', 'no', '--pay-after-hold', 'no', '--meal', 'yes', '--baggage', 'yes', '--seat', 'yes', '--bundle', 'no', '--by', 'Supplier PO');
    const run = ws.rm('new', '--scope', 'Feature', '--target', 'Import PNR', '--feature', 'import-booked-pnr', '--supplier', 'test-air-ndc', '--no-activate').text.match(/Created (\S+)/)[1];
    const base = 'supplier-features/import-booked-pnr/suppliers/test-air-ndc';
    const cases = [{ id: 'TC-IBP-001', expected: 'The PNR is imported with status "Ticketed".' }, { id: 'TC-IBP-002', expected: 'A held PNR imports as "Held".' }];
    const withRequires = suite('Approved', cases).replace(/(### (TC-IBP-\d+)[\s\S]*?\*\*Tags:\*\* Regression\n)/g, (m, all, id) => `${m}\n**Requires:** ${id === 'TC-IBP-002' ? 'Hold' : 'None'}\n`);
    ws.put(`${base}/context/ProjectContext.md`, header('Project Context', 'Approved'));
    ws.put(`${base}/test_design/TestCases_IBP.md`, withRequires);
    ws.put(`${base}/test_design/TraceabilityMatrix.md`, matrix('Approved', cases));
    recordFixtureApproval(ws.root, [`${base}/context/ProjectContext.md`, `${base}/test_design/TestCases_IBP.md`, `${base}/test_design/TraceabilityMatrix.md`], { runsDir: ws.runsDir });
    ws.tool(CG, 'plan', '--run', run, '--runs-dir', ws.runsDir, '--data-root', ws.root, '--supplier-features-dir', path.join(ws.root, 'supplier-features'));
    assert.equal(ws.rm('state', 'start', '4M', '--invocation', 'Direct', '--run', run).code, 0);
    const { outcome } = record(ws, run, resultsFile([{ id: 'TC-IBP-001', status: 'Passed' }, { id: 'TC-IBP-002', status: 'Failed', reason: 'Hold not offered' }], {
      assertions: { 'TC-IBP-001': [['Imported', '`Ticketed`', '', 'status `Ticketed`', 'contains', '✅']] },
    }));
    const t2 = final(outcome, 'TC-IBP-002');
    assert.equal(t2.final, 'Excluded');
    assert.deepEqual(t2.cycles, ['1:Failed'], 'the recorded result is kept as evidence');
    assert.equal(outcome.health.application.failures, 0);
    assert.equal(outcome.health.coverage.executable, 1, 'outside the executable denominator');
    assert.ok(outcome.conflicts.some((c) => c.kind === 'unsupported-capability-executed'));
    assert.equal(outcome.verdict, 'incomplete');
    assert.equal(final(outcome, 'TC-IBP-001').final, 'Passed');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Legacy (D2) and reporting
// ---------------------------------------------------------------------------------------------

test('D2 legacy execution files: read-only history shows recorded Passed as Unverified; the run is never written', () => {
  const ws = workspace();
  try {
    const legacy = 'run-001__2026-07-31_11-56-38__UserStory__Legacy';
    ws.put(`runs/${legacy}/metadata/run.json`, JSON.stringify({ runId: 'RUN-1', status: 'Preparing' }));
    ws.put(`runs/${legacy}/manual_execution/artifacts/TC-1.png`, 'png');
    ws.put(`runs/${legacy}/manual_execution/ManualExecutionResults.md`, '| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |\n|---|---|---|---|---|---|\n| TC-1 | login | Passed | 1 | — | manual_execution/artifacts/TC-1.png |\n| TC-2 | login | Passed | 1 | — | Observed: name shown |\n');
    const before = fs.readFileSync(path.join(ws.runsDir, legacy, 'metadata', 'run.json'), 'utf8');
    const h = JSON.parse(ws.rm('state', 'history', '4M', '--json', '--run', legacy).out);
    assert.deepEqual(h.counts, { Unverified: 2 });
    assert.equal(h.assertionSummary.none, 2);
    assert.equal(h.evidenceIssues.length, 0, 'the screenshot exists — existence is not sufficiency');
    assert.match(ws.rm('state', 'outcome', '4M', '--from-results', '--run', legacy).text, /LEGACY_RUN/);
    assert.equal(fs.readFileSync(path.join(ws.runsDir, legacy, 'metadata', 'run.json'), 'utf8'), before);
  } finally { cleanup(ws); }
});

test('reporting: an incomplete assertion outcome cannot be reported as all-passed, and 6A refuses the report', () => {
  const ws = workspace();
  try {
    const run = manualRun(ws);
    const { outcome } = record(ws, run, resultsFile(ALL, { assertions: { 'TC-LOGIN-001': GOOD['TC-LOGIN-001'] } }));
    assert.equal(outcome.verdict, 'incomplete');
    assert.deepEqual(outcome.counts, { Passed: 1, Unverified: 2 });
    // The report-check (and so the 6A gate) compares with exactly these counts and verdict.
    const integrity = require('../reportIntegrity');
    const dir = path.join(ws.runsDir, run, 'reporting');
    fs.mkdirSync(dir, { recursive: true });
    const model = { title: 'r', outcomeVerdict: 'all-passed', statuses: [{ key: 'PASS', label: 'Passed', tone: 'pass' }], summary: { counts: [{ status: 'PASS', value: 3 }] } };
    fs.writeFileSync(path.join(dir, 'm.report.json'), JSON.stringify(model));
    const res = integrity.checkReportConsistency({ json: path.join(dir, 'm.report.json'), outcome, requireVerdict: true });
    assert.equal(res.ok, false);
    assert.ok(res.issues.some((i) => /differ from the recorded outcome/.test(i)));
    assert.ok(res.issues.some((i) => /all-passed/.test(i)));
  } finally { cleanup(ws); }
});
