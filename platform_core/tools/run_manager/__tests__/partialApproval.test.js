// Phase 2.2 — scope-aware partial approval.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const gate = require('../stageGate');
const scope = require('../scopeApproval');
const { createRun } = require('../createRun');

const T0 = new Date('2026-10-08T09:00:00Z');
const at = (min) => new Date(T0.getTime() + min * 60000);

function makeWorkspace(modules = ['login']) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'partial-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const { folderName } = createRun(runsDir, {
    scope: 'Module', target: modules.join('+'), now: T0,
    extraRunJson: { modules, moduleScope: modules.length > 1 ? 'multi' : 'single' },
  });
  return { dataRoot, runsDir, folderName };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
// An approval recorded through the run state model (Phase 9.1, F-01): a header alone authorizes nothing.
const { recordFixtureApproval } = require('./approvalFixture');
const write = (ws, rel, text) => {
  const f = path.join(ws.dataRoot, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  return rel;
};

/** A Project Context with a Mixed header and an Approval Scope table. */
function projectContext(ws, module, rows, status = '**Approved** — §1, §2. **`PO-30`: Pending Review**') {
  const table = ['| Item | Status | Depends On | Affects |', '|---|---|---|---|', ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
  return write(ws, `modules/${module}/context/ProjectContext.md`,
    `# Project Context — ${module}\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n\n## 1. Scope\n\nText.\n\n## Approval Scope\n\n${table}\n`);
}

/** A test suite whose cases carry their own Review / Automation decisions, plus its Traceability Matrix. */
function testDesign(ws, module, cases, { header = '**Approved** — Stage 3 gate. TC-003 reset to `Pending`', tmHeader = 'Approved' } = {}) {
  const Mod = module[0].toUpperCase() + module.slice(1);
  const body = cases.map((c) => [
    `### ${c.id} — ${c.id} title`, '',
    `**Objective:** Check ${c.id}.`, '',
    '**Preconditions:** Logged in.', '',
    '**Test Data:** None.', '',
    '**Steps:**', '', '1. Do it.', '',
    '**Expected Result:** It works.', '',
    '**Assertions:**', '', '| Assertion ID | Expected | Expected Source | Check | Requirement |', '|---|---|---|---|---|', `| A1 | It works | Expected Result | equals | ${c.req ? String(c.req).split(/[,;]/)[0].trim() : 'PC §3'} |`, '',
    '**Priority:** P1', '',
    '**Tags:** Scenario', '',
    `**Review:** ${c.review}`, '',
    `**Automation:** ${c.automation || 'Pending'}`, '',
  ].join('\n')).join('\n');
  write(ws, `modules/${module}/test_design/TestCases_${Mod}.md`,
    `# Manual Test Suite — ${Mod}\n\n| Field | Value |\n|---|---|\n| Status | ${header} |\n\n## Test Cases\n\n${body}`);
  const rows = cases.filter((c) => c.req !== undefined).map((c) => `| ${c.id} | ${c.req} | N/A | ${c.finding || 'N/A'} | N/A | N/A | US | Low | x | ok |`);
  write(ws, `modules/${module}/test_design/TraceabilityMatrix.md`,
    `# Traceability\n\n| Field | Value |\n|---|---|\n| Status | ${tmHeader} |\n\n## 1. Matrix\n\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
  return `modules/${module}/test_design/TestCases_${Mod}.md`;
}

const approveScope = (ws, artifact, minute = 1, run = ws.folderName) => rs.approveScope(ws.runsDir, run, { artifact, approvedBy: 'Jane Reviewer', now: at(minute) });
const gate4M = (ws, scopeItems, extra = {}) => gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Direct', scopeItems, now: at(100), ...extra });
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

/** The standard picture: PO-30 pending, it affects §2; §1 independent. */
function standardLogin(ws) {
  const pc = projectContext(ws, 'login', [
    ['§1', 'Approved', '—', '—'],
    ['§2', 'Approved', '—', '—'],
    ['AC-1', 'Approved', '§1', '—'],
    ['PO-30', 'Pending', '§2', '§2'],
  ]);
  const tc = testDesign(ws, 'login', [
    { id: 'TC-001', review: 'Approved', automation: 'Approved', req: 'PC §1 "Login" / AC-1 / PRD ORG-1' },
    { id: 'TC-002', review: 'Approved', automation: 'Approved', req: 'PC §2 "Reissue"' },
    { id: 'TC-003', review: 'Pending', req: 'PC §2 / PO-30' },
  ]);
  return { pc, tc };
}

// ---------------------------------------------------------------------------------------------
// Parsing — structured sources only
// ---------------------------------------------------------------------------------------------

test('the Approval Scope table is parsed exactly; a malformed one is refused, never guessed', () => {
  const items = scope.parseApprovalScopeTable('## Approval Scope\n\n| Item | Status | Depends On | Affects |\n|---|---|---|---|\n| `PO-30` | **Pending** | PO-24, §2 | §2.4 |\n| §1 | Approved | — | — |\n');
  assert.deepEqual(items['PO-30'], { status: 'Pending', dependsOn: ['PO-24', '§2'], affects: ['§2.4'] });
  assert.deepEqual(items['§1'], { status: 'Approved', dependsOn: [], affects: [] });
  assert.equal(scope.parseApprovalScopeTable('# No table here'), null);
  assert.throws(() => scope.parseApprovalScopeTable('## Approval Scope\n\n| Item | Status |\n|---|---|\n| X | Looks fine |\n'), /not one of/);
  assert.throws(() => scope.parseApprovalScopeTable('## Approval Scope\n\n| Item | Status |\n|---|---|\n| X | Approved |\n| X | Pending |\n'), /twice/);
});

test('traceability references become dependencies; PRD and spec references are kept apart as external', () => {
  const d = scope.dependenciesFromTraceRow({ requirement: 'PC §2 "Agency Master" / AC-1 / PRD ORG-05 / spec §5', finding: 'FINDING-001', acceptance: 'AC-1 — 11 fields' });
  assert.deepEqual(d.dependsOn.sort(), ['AC-1', 'FINDING-001', '§2'].sort());
  assert.deepEqual(d.external, ['PRD ORG-05', 'spec §5']);
  assert.deepEqual(scope.dependenciesFromTraceRow({ requirement: 'PC §1 / branch:PO-16' }).dependsOn.sort(), ['branch:PO-16', '§1'].sort(), 'a module qualifier is kept');
});

// ---------------------------------------------------------------------------------------------
// Independent scopes
// ---------------------------------------------------------------------------------------------

test('an independent approved scope proceeds, and the exact scope and its evidence are recorded on the stage', () => {
  const ws = makeWorkspace();
  try {
    const { pc, tc } = standardLogin(ws);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    const g = gate4M(ws, ['TC-001']);
    assert.equal(g.decision, 'proceed', g.blockers.join('\n'));
    assert.deepEqual(g.checks.filter((c) => c.result === 'partial').map((c) => c.stage).sort(), ['1', '3']);
    assert.deepEqual(g.partialScope.closure.sort(), ['login:AC-1', 'login:TC-001', 'login:§1'].sort());
    assert.equal(g.partialScope.proven, true);
    assert.equal(g.partialScope.records.length, 2, 'both partial approvals it relied on are cited');
  } finally { cleanup(ws); }
});

test('an item cited but not listed in the scope table blocks — unknown dependencies are not assumed approved', () => {
  const ws = makeWorkspace();
  try {
    const pc = projectContext(ws, 'login', [['§1', 'Approved', '—', '—'], ['PO-30', 'Pending', '—', '—']]);
    const tc = testDesign(ws, 'login', [{ id: 'TC-001', review: 'Approved', req: 'PC §1 / AC-1' }]);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    const g = gate4M(ws, ['TC-001']);
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /login:AC-1 \(needed by login:TC-001\): not an item of/.test(b)));
  } finally { cleanup(ws); }
});

test('a test case with no traceability row has unknown dependencies, which cannot be proven independent', () => {
  const ws = makeWorkspace();
  try {
    const pc = projectContext(ws, 'login', [['§1', 'Approved', '—', '—'], ['PO-30', 'Pending', '—', '—']]);
    const tc = testDesign(ws, 'login', [{ id: 'TC-009', review: 'Approved' }]); // no `req` → no row
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    const g = gate4M(ws, ['TC-009']);
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /dependencies are unknown/.test(b)));
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Overlapping dependencies, pending and rejected items
// ---------------------------------------------------------------------------------------------

test('overlap: an approved item that a pending item affects cannot proceed', () => {
  const ws = makeWorkspace();
  try {
    const { pc, tc } = standardLogin(ws);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    const g = gate4M(ws, ['TC-002']);
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /login:§2 \(needed by login:TC-002\): affected by unresolved login:PO-30 \(Pending\)/.test(b)));
    // One blocked item blocks the whole requested scope — nothing is silently dropped.
    assert.equal(gate4M(ws, ['TC-001', 'TC-002']).decision, 'blocked');
  } finally { cleanup(ws); }
});

test('a pending test case, or one that depends on a pending item, blocks', () => {
  const ws = makeWorkspace();
  try {
    const { pc, tc } = standardLogin(ws);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    const g = gate4M(ws, ['TC-003']);
    assert.ok(g.blockers.some((b) => /login:TC-003: Pending/.test(b)));
    assert.ok(g.blockers.some((b) => /login:PO-30 \(needed by login:TC-003\): Pending/.test(b)));
  } finally { cleanup(ws); }
});

test('rejected items block: a rejected case, and a case depending on a rejected requirement', () => {
  const ws = makeWorkspace();
  try {
    const pc = projectContext(ws, 'login', [['§1', 'Approved', '—', '—'], ['§3', 'Rejected', '—', '—'], ['PO-30', 'Pending', '—', '—']]);
    const tc = testDesign(ws, 'login', [
      { id: 'TC-001', review: 'Rejected', req: 'PC §1' },
      { id: 'TC-004', review: 'Approved', req: 'PC §3' },
    ]);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    assert.ok(gate4M(ws, ['TC-001']).blockers.some((b) => /login:TC-001: Rejected/.test(b)));
    assert.ok(gate4M(ws, ['TC-004']).blockers.some((b) => /login:§3 \(needed by login:TC-004\): Rejected/.test(b)));
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Cross-module impact
// ---------------------------------------------------------------------------------------------

test('cross-module: a dependency on another module\'s pending item blocks; IDs are scoped to their module', () => {
  const ws = makeWorkspace(['login', 'branch']);
  try {
    const lpc = projectContext(ws, 'login', [['§1', 'Approved', '—', '—'], ['PO-30', 'Pending', '—', '—']]);
    const bpc = projectContext(ws, 'branch', [['PO-16', 'Pending', '—', '—'], ['§1', 'Approved', '—', '—']], '**Approved** — §1. **`PO-16`: Pending Review**');
    const ltc = testDesign(ws, 'login', [
      { id: 'TC-001', review: 'Approved', req: 'PC §1' },
      { id: 'TC-005', review: 'Approved', req: 'PC §1 / branch:PO-16' },
    ]);
    const btc = testDesign(ws, 'branch', [{ id: 'TC-001', review: 'Approved', req: 'PC §1' }]);
    for (const [a, m] of [[lpc, 1], [bpc, 2], [ltc, 3], [btc, 4]]) approveScope(ws, a, m);

    // Same ID in both modules: an unqualified request is ambiguous, never guessed.
    assert.ok(gate4M(ws, ['TC-001']).blockers.some((b) => /ambiguous across modules/.test(b)));
    // Qualified, and independent: proceeds — branch's pending PO-16 does not touch it.
    const g = gate4M(ws, ['login:TC-001', 'branch:TC-001']);
    assert.equal(g.decision, 'proceed', g.blockers.join('\n'));
    // Depends on branch:PO-16 (Pending): blocked, and the message names the other module's item.
    assert.ok(gate4M(ws, ['login:TC-005']).blockers.some((b) => /branch:PO-16 \(needed by login:TC-005\): Pending/.test(b)));
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Across stages: Discovery items, Stage 3 scopes, automation
// ---------------------------------------------------------------------------------------------

test('Discovery: a finding that is still pending blocks the cases built on it; an approved one does not', () => {
  const ws = makeWorkspace();
  try {
    const pc = projectContext(ws, 'login', [['§1', 'Approved', '—', '—'], ['PO-30', 'Pending', '—', '—']]);
    const qa = write(ws, 'modules/login/discovery/QA_Assessment_Report.md',
      '# QA Assessment\n\n| Field | Value |\n|---|---|\n| Status | **Approved** — FINDING-1. FINDING-2 Pending |\n\n## Approval Scope\n\n| Item | Status |\n|---|---|\n| FINDING-1 | Approved |\n| FINDING-2 | Pending |\n');
    const tc = testDesign(ws, 'login', [
      { id: 'TC-001', review: 'Approved', req: 'PC §1', finding: 'FINDING-1' },
      { id: 'TC-002', review: 'Approved', req: 'PC §1', finding: 'FINDING-2' },
    ]);
    for (const [a, m] of [[pc, 1], [qa, 2], [tc, 3]]) approveScope(ws, a, m);
    assert.equal(gate4M(ws, ['TC-001']).decision, 'proceed');
    assert.ok(gate4M(ws, ['TC-002']).blockers.some((b) => /login:FINDING-2 \(needed by login:TC-002\): Pending/.test(b)));
  } finally { cleanup(ws); }
});

test('Stage 3 may design for an approved, independent part of a partially approved Project Context', () => {
  const ws = makeWorkspace();
  try {
    const pc = projectContext(ws, 'login', [['§1', 'Approved', '—', '—'], ['§2', 'Approved', '—', '—'], ['PO-30', 'Pending', '§2', '§2']]);
    write(ws, 'modules/login/discovery/QA_Assessment_Report.md', '| Status | Approved |\n');
    recordFixtureApproval(ws.dataRoot, 'modules/login/discovery/QA_Assessment_Report.md');
    approveScope(ws, pc, 1);
    const ok = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '3', invocationPath: 'Direct', scopeItems: ['§1'], now: at(10) });
    assert.equal(ok.decision, 'proceed', ok.blockers.join('\n'));
    const no = gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '3', invocationPath: 'Direct', scopeItems: ['§2'], now: at(10) });
    assert.equal(no.decision, 'blocked');
  } finally { cleanup(ws); }
});

test('automation: a partial scope never bypasses the Module Manager — cases need Automation = Approved, and conflicts still block', () => {
  const ws = makeWorkspace();
  try {
    const pc = projectContext(ws, 'login', [['§1', 'Approved', '—', '—'], ['PO-30', 'Pending', '—', '—']]);
    const tc = testDesign(ws, 'login', [
      { id: 'TC-001', review: 'Approved', automation: 'Approved', req: 'PC §1' },
      { id: 'TC-002', review: 'Approved', automation: 'Pending', req: 'PC §1' },
    ]);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    write(ws, 'modules/login/automation/.module_automation_state.json', JSON.stringify({ state: 'Promoted', approvedBy: 'lead' }));
    write(ws, 'modules/login/automation/AutomationPlan_SHAFT.md', '| Status | Pending Review |\n');
    const g5 = (items) => gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '5A', invocationPath: 'Direct', scopeItems: items, now: at(10) });
    assert.ok(g5(['TC-002']).blockers.some((b) => /Automation is Pending/.test(b)));
    const g = g5(['TC-001']);
    assert.equal(g.decision, 'blocked', 'the Module Manager / plan conflict still blocks');
    assert.ok(g.checks.some((c) => c.result === 'conflict'));
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Backward compatibility and artifact-level integrity
// ---------------------------------------------------------------------------------------------

test('an existing Mixed artifact with no recorded scope stays blocked — even when a scope is requested', () => {
  const ws = makeWorkspace();
  try {
    standardLogin(ws);
    const g = gate4M(ws, ['TC-001']);
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /no partial approval has been recorded/.test(b)));
    assert.equal(gate4M(ws, undefined).decision, 'blocked');
  } finally { cleanup(ws); }
});

test('a free-text header alone is never proof: no Approval Scope table, no partial approval', () => {
  const ws = makeWorkspace();
  try {
    const pc = write(ws, 'modules/login/context/ProjectContext.md', '| Status | **Approved** — all but `PO-30`, which is Pending Review |\n');
    expectCode(() => approveScope(ws, pc), 'NO_SCOPE_TABLE');
  } finally { cleanup(ws); }
});

test('approve-scope refuses: no reviewer, a header that is not Mixed, an artifact outside the run\'s scope', () => {
  const ws = makeWorkspace();
  try {
    const { pc } = standardLogin(ws);
    expectCode(() => rs.approveScope(ws.runsDir, ws.folderName, { artifact: pc, now: at(1) }), 'MISSING_FIELD');
    write(ws, 'modules/login/discovery/QA_Assessment_Report.md', '| Status | Approved |\n\n## Approval Scope\n\n| Item | Status |\n|---|---|\n| F-1 | Approved |\n');
    expectCode(() => approveScope(ws, 'modules/login/discovery/QA_Assessment_Report.md'), 'NOT_PARTIAL');
    const other = projectContext(ws, 'other', [['§1', 'Approved', '—', '—'], ['PO-1', 'Pending', '—', '—']]);
    expectCode(() => approveScope(ws, other), 'OUT_OF_SCOPE');
  } finally { cleanup(ws); }
});

test('a partial approval never approves the artifact: its header stays Mixed and stage approval is still refused', () => {
  const ws = makeWorkspace();
  try {
    const { pc } = standardLogin(ws);
    rs._setTestHooks({ skipEntryGate: true });
    try {
      rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct', now: at(1) });
    } finally { rs._setTestHooks({}); }
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [pc], now: at(2) });
    approveScope(ws, pc, 3);
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'Jane', now: at(4) }), 'APPROVAL_NOT_IN_HEADER');
    assert.equal(rs.readRunState(ws.runsDir, ws.folderName).stages['1'].status, 'Waiting For Approval');
  } finally { cleanup(ws); }
});

test('an edit after the scope was approved invalidates it — the fingerprint covers the suite and its traceability', () => {
  const ws = makeWorkspace();
  try {
    const { pc, tc } = standardLogin(ws);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    assert.equal(gate4M(ws, ['TC-001']).decision, 'proceed');
    const tm = path.join(ws.dataRoot, 'modules/login/test_design/TraceabilityMatrix.md');
    fs.appendFileSync(tm, '\n<!-- edited -->\n');
    const g = gate4M(ws, ['TC-001']);
    assert.equal(g.decision, 'blocked');
    assert.ok(g.blockers.some((b) => /changed since the scope was approved/.test(b)));
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Run State recording and the Human Decision
// ---------------------------------------------------------------------------------------------

test('the scope approval and the partial start are recorded in the run state; the start is a named human decision', () => {
  const ws = makeWorkspace();
  try {
    const { pc, tc } = standardLogin(ws);
    const rec = approveScope(ws, pc, 1).scopeApproval;
    assert.equal(rec.approvedBy, 'Jane Reviewer');
    assert.deepEqual(rec.summary, { approved: 3, pending: 1, rejected: 0 });
    assert.match(Object.values(rec.fingerprints)[0], /^[0-9a-f]{64}$/);
    approveScope(ws, tc, 2);

    expectCode(() => rs.startStage(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Direct', scopeItems: ['TC-001'], now: at(3) }), 'MISSING_FIELD');
    const res = rs.startStage(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Direct', scopeItems: ['TC-001'], by: 'QA Lead', now: at(4) });
    const ps = res.state.stages['4M'].entryGate.partialScope;
    assert.deepEqual(ps.items, ['TC-001']);
    assert.equal(ps.requestedBy, 'QA Lead');
    assert.equal(ps.proven, true);
    assert.equal(ps.records.length, 2);
    const meta = JSON.parse(fs.readFileSync(rs.runJsonPath(ws.runsDir, ws.folderName), 'utf8'));
    assert.equal(meta.scopeApprovals.length, 2);
  } finally { cleanup(ws); }
});

test('without a requested scope, the gate offers the provably independent part as a decision — it never picks it', () => {
  const ws = makeWorkspace();
  try {
    const { pc, tc } = standardLogin(ws);
    approveScope(ws, pc, 1);
    approveScope(ws, tc, 2);
    const g = gate4M(ws, undefined);
    assert.equal(g.decision, 'blocked');
    assert.deepEqual(g.suggestedScope, ['TC-001']);
  } finally { cleanup(ws); }
});
