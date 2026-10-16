// Phase 5 — change impact, reuse and duplicates, traceability, conflicts, cross-module and Supplier change.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rs = require('../runState');
// Phase 9.2 (F-16): execution-stage starts are preceded by the operator's Safety Preflight (approvalFixture).
require('./approvalFixture').autoPreflight(rs);
const gate = require('../stageGate');
const { analyzeImpact, itemsOf, diffItems } = require('../changeImpact');
const { buildTraceGraph, contextReuse } = require('../traceGraph');
const dup = require('../duplicates');
const { createRun } = require('../createRun');
const { manifestPath } = require('../runManifest');

const T0 = new Date('2026-10-08T09:00:00Z');
let clock = 0;
const tick = () => new Date(T0.getTime() + (clock += 1) * 60000);
const expectCode = (fn, code) => assert.throws(fn, (err) => err.code === code, `expected ${code}`);

function workspace(modules = ['login'], extra = {}) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'change-'));
  const runsDir = path.join(dataRoot, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const runJson = Object.keys(extra).length ? extra : { modules, moduleScope: modules.length > 1 ? 'multi' : 'single' };
  const { folderName } = createRun(runsDir, { scope: 'Module', target: 'x', now: T0, extraRunJson: runJson });
  return { dataRoot, runsDir, folderName };
}
const cleanup = (ws) => fs.rmSync(ws.dataRoot, { recursive: true, force: true });
// An approval recorded through the run state model (Phase 9.1, F-01): a header alone authorizes nothing.
const { recordFixtureApproval } = require('./approvalFixture');
const put = (ws, rel, text) => { const f = path.join(ws.dataRoot, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; };

const projectContext = (status, rows, extra = '') => `# Project Context\n\n| Field | Value |\n|---|---|\n| Status | ${status} |\n\n## 2. In Scope\n\nLogin rules.\n\n## 3. Requirements\n\n| ID | Rule |\n|---|---|\n${rows.map(([id, rule]) => `| ${id} | ${rule} |`).join('\n')}\n${extra}`;

function suite(ws, root, cases, { tm = true } = {}) {
  const body = cases.map((c) => `### ${c.id} — ${c.title || c.id}\n\n**Objective:** ${c.objective || `Check ${c.id}`}.\n\n**Preconditions:** Logged in.\n\n**Test Data:** None.\n\n**Steps:**\n\n1. ${c.step || 'Do it'}.\n\n**Expected Result:** ${c.expected || 'It works'}.\n\n**Priority:** P1\n\n**Tags:** Scenario\n\n**Review:** ${c.review || 'Approved'}\n\n**Automation:** ${c.automation || 'Approved'}\n`).join('\n');
  put(ws, `${root}/test_design/TestCases_X.md`, `# Suite\n\n| Field | Value |\n|---|---|\n| Status | Approved |\n\n## Test Cases\n\n${body}`);
  if (tm) {
    const rows = cases.filter((c) => c.req !== undefined).map((c) => `| ${c.id} | ${c.req} | N/A | ${c.finding || 'N/A'} | N/A | N/A | US | Low | x | ok |`);
    put(ws, `${root}/test_design/TraceabilityMatrix.md`, `# TM\n\n| Field | Value |\n|---|---|\n| Status | Approved |\n\n| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |\n|---|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
  }
}
const decisions = (ws, root, rows) => put(ws, `${root}/automation/AutomationDecisionReport_SHAFT.md`, `# Decisions\n\n| Test Case | Decision | Justification |\n|---|---|---|\n${rows.map(([id, d]) => `| ${id} | **${d}** | x |`).join('\n')}\n`);
function executedRun(ws, module, rows) {
  const { folderName } = createRun(ws.runsDir, { scope: 'Module', target: module, now: tick(), extraRunJson: { modules: [module], moduleScope: 'single' } });
  put(ws, `runs/${folderName}/execution/ExecutionResults.md`, `| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n${rows.map(([id, st]) => `| ${id} | s | ${st} | 1 s | 1 | — | a.png |`).join('\n')}\n`);
  put(ws, `runs/${folderName}/reporting/Final_QA_Report.md`, '# Report\n');
  return folderName;
}

/** login: AC-1 → TC-1 (automated, executed, reported); AC-2 → TC-2 (pending). */
function standardLogin(ws, status = 'Approved') {
  const pc = put(ws, 'modules/login/context/ProjectContext.md', projectContext(status, [['AC-1', 'A locked account cannot log in'], ['AC-2', 'Password resets by email']]));
  fs.mkdirSync(path.join(ws.dataRoot, 'modules/login/discovery/findings/FINDING-001_LockMessage'), { recursive: true });
  suite(ws, 'modules/login', [
    { id: 'TC-1', req: 'PC §3 / AC-1', finding: 'FINDING-001' },
    { id: 'TC-2', req: 'PC §3 / AC-2', review: 'Pending', automation: 'Pending' },
  ]);
  decisions(ws, 'modules/login', [['TC-1', 'Generate New']]);
  executedRun(ws, 'login', [['TC-1', 'Passed']]);
  return pc;
}

// ---------------------------------------------------------------------------------------------
// Impact analysis
// ---------------------------------------------------------------------------------------------

test('item diffing: changed, added and removed items are found by ID', () => {
  const before = projectContext('Approved', [['AC-1', 'old'], ['AC-2', 'same'], ['AC-3', 'gone']]);
  const after = projectContext('Approved', [['AC-1', 'new'], ['AC-2', 'same'], ['AC-4', 'added']]);
  const d = diffItems(itemsOf(before, 'context'), itemsOf(after, 'context'));
  assert.ok(d.changed.includes('AC-1'));
  assert.ok(!d.changed.includes('AC-2'));
  assert.deepEqual(d.added, ['AC-4']);
  assert.deepEqual(d.removed, ['AC-3']);
});

test('a modified approved requirement: blocking, with every dependent case, automation, execution and report', () => {
  const ws = workspace();
  try {
    const pc = standardLogin(ws);
    const before = fs.readFileSync(path.join(ws.dataRoot, pc), 'utf8');
    put(ws, pc, before.replace('A locked account cannot log in', 'A locked account cannot log in for 30 minutes'));
    const a = analyzeImpact(ws.runsDir, { artifact: pc, beforeText: before });
    // The row and the section that contains it both changed — a case may cite either.
    assert.deepEqual(a.delta.changed.sort(), ['AC-1', '§3']);
    assert.equal(a.classification, 'blocking');
    // TC-2 cites §3 too, so it is reached — but it is pending, so only TC-1 is approved work affected.
    assert.deepEqual(a.affected.testCases.map((t) => t.id), ['TC-1', 'TC-2']);
    assert.deepEqual(a.affected.approvedTestCases, ['TC-1']);
    assert.equal(a.affected.automation[0].decision, 'Generate New');
    assert.equal(a.affected.executions.length, 1);
    assert.equal(a.affected.reports.length, 1);
    assert.deepEqual(a.affected.findings, ['FINDING-001']);
    assert.equal(a.humanDecisionRequired, true);
  } finally { cleanup(ws); }
});

test('a new requirement in a draft context reaches nothing approved: non-blocking, still a human decision', () => {
  const ws = workspace();
  try {
    const pc = put(ws, 'modules/login/context/ProjectContext.md', projectContext('Pending Review', [['AC-1', 'rule']]));
    const before = fs.readFileSync(path.join(ws.dataRoot, pc), 'utf8');
    put(ws, pc, projectContext('Pending Review', [['AC-1', 'rule'], ['AC-9', 'brand new']]));
    const a = analyzeImpact(ws.runsDir, { artifact: pc, beforeText: before });
    assert.deepEqual(a.delta.added, ['AC-9']);
    assert.equal(a.classification, 'non-blocking');
    assert.equal(a.humanDecisionRequired, true);
  } finally { cleanup(ws); }
});

test('no basis to compare is refused, never guessed', () => {
  const ws = workspace();
  try {
    const pc = standardLogin(ws);
    assert.throws(() => analyzeImpact(ws.runsDir, { artifact: pc }), (e) => e.code === 'NO_BASIS');
  } finally { cleanup(ws); }
});

test('approved artifacts are never changed silently: re-approval needs an approved impact decision on exactly that content', () => {
  const ws = workspace();
  try {
    put(ws, 'modules/login/context/ProjectContext.md', projectContext('Pending Review', [['AC-1', 'v1']]));
    const PC = 'modules/login/context/ProjectContext.md';
    rs._setTestHooks({ skipEntryGate: true });
    try {
      rs.startStage(ws.runsDir, ws.folderName, { stageId: '1', invocationPath: 'Direct', now: tick() });
      rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', artifacts: [PC], now: tick() });
      put(ws, PC, projectContext('Approved', [['AC-1', 'v1']]));
      rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'BA', now: tick() });
      // Changed after approval, then sent back through the gate.
      rs.reopenStage(ws.runsDir, ws.folderName, { stageId: '1', by: 'BA', reason: 'AC-1 revised', now: tick() });
    } finally { rs._setTestHooks({}); }
    put(ws, PC, projectContext('Pending Review', [['AC-1', 'v2']]));
    rs.requestApproval(ws.runsDir, ws.folderName, { stageId: '1', now: tick() });
    put(ws, PC, projectContext('Approved', [['AC-1', 'v2']]));
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'BA', now: tick() }), 'IMPACT_ANALYSIS_REQUIRED');

    const analysis = analyzeImpact(ws.runsDir, { artifact: PC, changed: ['AC-1'] });
    expectCode(() => rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis, decision: 'approved', by: 'BA', now: tick() }), 'MISSING_FIELD');
    // An analysis of other content does not count.
    const rejected = rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis, decision: 'rejected', by: 'BA', reason: 'not now', now: tick() });
    assert.equal(rejected.changeRequest.decision, 'rejected');
    expectCode(() => rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'BA', now: tick() }), 'IMPACT_ANALYSIS_REQUIRED');
    rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis, decision: 'approved', by: 'PO', reason: 'AC-1 v2 reviewed', now: tick() });
    assert.equal(rs.approveStage(ws.runsDir, ws.folderName, { stageId: '1', approvedBy: 'BA', now: tick() }).state.stages['1'].status, 'Completed');

    // An analysis taken before a further edit is stale.
    const old = analyzeImpact(ws.runsDir, { artifact: PC, changed: ['AC-1'] });
    put(ws, PC, projectContext('Approved', [['AC-1', 'v3']]));
    expectCode(() => rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis: old, decision: 'approved', by: 'PO', reason: 'x', now: tick() }), 'STALE_ANALYSIS');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Cross-module and Supplier impact
// ---------------------------------------------------------------------------------------------

test('cross-module impact: another module citing module:ID is reached, and approval must name every module', () => {
  const ws = workspace(['login', 'billing']);
  try {
    const pc = standardLogin(ws);
    put(ws, 'modules/billing/context/ProjectContext.md', projectContext('Approved', [['AC-7', 'invoice']]));
    suite(ws, 'modules/billing', [{ id: 'TC-B1', req: 'PC §3 / AC-7 / login:AC-1' }]);
    const a = analyzeImpact(ws.runsDir, { artifact: pc, changed: ['AC-1'] });
    assert.equal(a.crossModule, true);
    assert.deepEqual(a.affected.modules.sort(), ['billing', 'login']);
    assert.ok(a.affected.approvedTestCases.includes('billing:TC-B1'));
    expectCode(() => rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis: a, decision: 'approved', by: 'PO', reason: 'r', approvedModules: ['login'], now: tick() }), 'CROSS_MODULE_APPROVAL_REQUIRED');
    const ok = rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis: a, decision: 'approved', by: 'PO', reason: 'r', approvedModules: ['login', 'billing'], now: tick() });
    assert.deepEqual(ok.changeRequest.approvedModules, ['login', 'billing']);
    assert.ok(!fs.existsSync(path.join(ws.dataRoot, 'modules', 'billing', 'module.json')), 'no module is created or registered by this');
  } finally { cleanup(ws); }
});

test('Supplier impact: a Feature-level change reaches every Supplier (each named), a Supplier change only that Supplier', () => {
  const ws = workspace([], { scopeFamily: 'supplier-feature', feature: 'ancillaries', supplier: 'air-india', sharedScope: null });
  try {
    for (const s of ['air-india', 'flynas']) fs.mkdirSync(path.join(ws.dataRoot, 'supplier-features/ancillaries/suppliers', s), { recursive: true });
    const featurePC = put(ws, 'supplier-features/ancillaries/context/ProjectContext.md', projectContext('Approved', [['PO-1', 'seat rule']]));
    const fa = analyzeImpact(ws.runsDir, { artifact: featurePC, changed: ['PO-1'] });
    assert.deepEqual(fa.affected.suppliers.sort(), ['air-india', 'flynas']);
    expectCode(() => rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis: fa, decision: 'approved', by: 'PO', reason: 'r', approvedSuppliers: ['air-india'], now: tick() }), 'SUPPLIER_APPROVAL_REQUIRED');
    rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis: fa, decision: 'approved', by: 'PO', reason: 'r', approvedSuppliers: ['air-india', 'flynas'], now: tick() });

    const supplierPC = put(ws, 'supplier-features/ancillaries/suppliers/air-india/context/ProjectContext.md', projectContext('Approved', [['PO-2', 'air india only']]));
    assert.deepEqual(analyzeImpact(ws.runsDir, { artifact: supplierPC, changed: ['PO-2'] }).affected.suppliers, ['air-india'], 'a Supplier is independent of the others');
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Duplicates and reuse
// ---------------------------------------------------------------------------------------------

test('duplicate stories: overlap by content and criteria; a shared number alone proves nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stories-'));
  try {
    fs.writeFileSync(path.join(dir, 'US-100_Lock.md'), '# US-100 — Account lockout\n\n## Acceptance Criteria\n\n### AC-1 — Lock after failures\n\nAfter five failed login attempts the account is locked and the user sees a lockout message.\n');
    fs.writeFileSync(path.join(dir, 'US-200_Theme.md'), '# US-200 — Dark theme\n\n### AC-1 — Toggle\n\nUsers switch the colour theme from settings.\n');
    const incoming = '# US-300 — Lock accounts\n\n### AC-1 — Lockout\n\nAfter five failed login attempts the account is locked and a lockout message is shown to the user.\n';
    const res = dup.findDuplicateStories(incoming, dir);
    assert.equal(res[0].file, 'US-100_Lock.md');
    assert.ok(res[0].overlappingCriteria.length >= 1);
    assert.ok(!res.some((r) => r.file === 'US-200_Theme.md'));
    const sameNumber = dup.findDuplicateStories('# US-200 — Payment refunds\n\nRefund a captured card payment.\n', dir);
    assert.equal(sameNumber[0].verdict, 'same number only — numbers prove nothing; the content differs');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('suite update keeps every existing ID: unchanged, update, reuse of a duplicate, next free ID, nothing deleted', () => {
  const ws = workspace();
  try {
    suite(ws, 'modules/login', [
      { id: 'TC-LOGIN-001', title: 'Valid login', expected: 'Dashboard shows' },
      { id: 'TC-LOGIN-002', title: 'Locked account rejected', objective: 'Verify a locked account cannot log in', step: 'Enter credentials of a locked account', expected: 'Lockout message shows' },
      { id: 'TC-LOGIN-003', title: 'Remember me' },
    ], { tm: false });
    const existing = fs.readFileSync(path.join(ws.dataRoot, 'modules/login/test_design/TestCases_X.md'), 'utf8');
    suite(ws, 'modules/draft', [
      { id: 'TC-LOGIN-001', title: 'Valid login', expected: 'Dashboard shows' },
      { id: 'TC-LOGIN-003', title: 'Remember me for 30 days' },
      { id: 'TC-NEW-1', title: 'Locked account is rejected', objective: 'Verify a locked account cannot log in', step: 'Enter credentials of a locked account', expected: 'Lockout message shows' },
      { id: 'TC-NEW-2', title: 'Password expiry prompts reset', objective: 'Verify an expired password forces a reset', step: 'Log in with an expired password', expected: 'Reset page opens' },
    ], { tm: false });
    const proposed = fs.readFileSync(path.join(ws.dataRoot, 'modules/draft/test_design/TestCases_X.md'), 'utf8');
    const plan = dup.planSuiteUpdate(existing, proposed);
    const by = (a) => plan.entries.filter((e) => e.action === a);
    assert.deepEqual(by('unchanged').map((e) => e.id), ['TC-LOGIN-001']);
    assert.deepEqual(by('update').map((e) => e.id), ['TC-LOGIN-003']);
    assert.deepEqual(by('reuse-existing-id').map((e) => [e.proposedId, e.id]), [['TC-NEW-1', 'TC-LOGIN-002']]);
    assert.deepEqual(plan.nextIds, ['TC-LOGIN-004']);
    assert.deepEqual(by('not-in-proposal'), []);
    const omitted = dup.planSuiteUpdate(existing, proposed.split('### TC-LOGIN-003')[0]);
    assert.ok(omitted.entries.some((e) => e.action === 'not-in-proposal' && e.id === 'TC-LOGIN-003'), 'an omitted case is listed for a human, never dropped');
  } finally { cleanup(ws); }
});

test('duplicate findings, and reuse of an approved Project Context', () => {
  const ws = workspace();
  try {
    recordFixtureApproval(ws.dataRoot, standardLogin(ws));
    const found = dup.findDuplicateFindings('Lock message is wrong', path.join(ws.dataRoot, 'modules/login/discovery/findings'));
    assert.equal(found[0].id, 'FINDING-001');
    const reuse = contextReuse(ws.runsDir, ws.folderName);
    assert.equal(reuse[0].reusable, true);
    put(ws, 'modules/login/context/ProjectContext.md', projectContext('Pending Review', [['AC-1', 'x']]));
    assert.equal(contextReuse(ws.runsDir, ws.folderName)[0].reusable, false);
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Traceability and conflicts
// ---------------------------------------------------------------------------------------------

test('missing traceability is reported link by link', () => {
  const ws = workspace();
  try {
    put(ws, 'modules/login/context/ProjectContext.md', projectContext('Approved', [['AC-1', 'a'], ['AC-5', 'nothing traces here']]));
    suite(ws, 'modules/login', [
      { id: 'TC-1', req: 'PC §3 / AC-1' },
      { id: 'TC-2', req: 'PC §3 / AC-99', finding: 'FINDING-404' },
      { id: 'TC-3' },
    ]);
    const kinds = new Set(buildTraceGraph(ws.runsDir, ws.folderName).gaps.map((g) => `${g.kind}:${g.item}`));
    for (const k of ['case-without-trace:TC-3', 'unknown-requirement:TC-2', 'unknown-finding:TC-2', 'automation-undecided:TC-1', 'not-executed:TC-1', 'requirement-without-case:AC-5']) {
      assert.ok(kinds.has(k), `expected gap ${k}`);
    }
  } finally { cleanup(ws); }
});

test('conflict: an approved case citing a superseded requirement blocks execution until a human decides', () => {
  const ws = workspace();
  try {
    put(ws, 'modules/login/context/ProjectContext.md', projectContext('Approved', [['AC-1', 'a'], ['**PO-24** *(SUPERSEDED by PO-30)*', 'old rule'], ['PO-30', 'new rule']]));
    suite(ws, 'modules/login', [{ id: 'TC-1', req: 'PC §3 / PO-24' }, { id: 'TC-2', req: 'PC §3 / AC-1' }]);
    const g = buildTraceGraph(ws.runsDir, ws.folderName);
    const c = g.conflicts.find((x) => x.kind === 'superseded-reference');
    assert.deepEqual(c.items, ['TC-1', 'PO-24']);
    const check = () => gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Direct', now: tick() });
    assert.ok(check().blockers.some((b) => b.includes(c.id)));
    // A partial scope that does not include the conflicting case is not blocked by it.
    assert.ok(!gate.checkStageEntry(ws.runsDir, ws.folderName, { stageId: '4M', invocationPath: 'Direct', scopeItems: ['TC-2'], now: tick() }).blockers.some((b) => b.includes(c.id)));
    expectCode(() => rs.recordConflictDecision(ws.runsDir, ws.folderName, { conflictId: c.id, by: 'PO', now: tick() }), 'MISSING_FIELD');
    rs.recordConflictDecision(ws.runsDir, ws.folderName, { conflictId: c.id, decision: 'TC-1 is reworked against PO-30 in the next revision; run it as is meanwhile', by: 'PO', now: tick() });
    assert.ok(!check().blockers.some((b) => b.includes(c.id)));
  } finally { cleanup(ws); }
});

test('the same ID defined differently in two modules is a warning for a human, not a block', () => {
  const ws = workspace(['login', 'billing']);
  try {
    put(ws, 'modules/login/context/ProjectContext.md', projectContext('Approved', [['PO-15', 'Login wording']]));
    put(ws, 'modules/billing/context/ProjectContext.md', projectContext('Approved', [['PO-15', 'Billing wording']]));
    const g = buildTraceGraph(ws.runsDir, ws.folderName);
    assert.ok(g.conflicts.some((c) => c.kind === 'definition-differs' && c.items[0] === 'PO-15'));
  } finally { cleanup(ws); }
});

// ---------------------------------------------------------------------------------------------
// Partial approvals, moduleArtifactRefs, historical runs
// ---------------------------------------------------------------------------------------------

test('partial approval: a change to a Pending item is flagged, and re-recording a changed scope needs an impact decision', () => {
  const ws = workspace();
  try {
    const scope = '\n## Approval Scope\n\n| Item | Status | Depends On | Affects |\n|---|---|---|---|\n| AC-1 | Approved | — | — |\n| PO-30 | Pending | — | AC-1 |\n';
    const pc = put(ws, 'modules/login/context/ProjectContext.md', projectContext('**Approved** — AC-1. **`PO-30`: Pending Review**', [['AC-1', 'a'], ['PO-30', 'draft rule']], scope));
    suite(ws, 'modules/login', [{ id: 'TC-1', req: 'PC §3 / AC-1' }]);
    rs.approveScope(ws.runsDir, ws.folderName, { artifact: pc, approvedBy: 'BA', now: tick() });
    const before = fs.readFileSync(path.join(ws.dataRoot, pc), 'utf8');
    put(ws, pc, before.replace('draft rule', 'draft rule, revised'));
    const a = analyzeImpact(ws.runsDir, { artifact: pc, beforeText: before });
    assert.ok(a.delta.changed.includes('PO-30'));
    assert.ok(a.reasons.some((r) => /PO-30 is Pending in the recorded Approval Scope/.test(r)));
    assert.deepEqual(a.affected.approvedTestCases, ['TC-1'], 'PO-30 affects AC-1, which an approved case traces to');
    expectCode(() => rs.approveScope(ws.runsDir, ws.folderName, { artifact: pc, approvedBy: 'BA', now: tick() }), 'IMPACT_ANALYSIS_REQUIRED');
    rs.recordImpactDecision(ws.runsDir, ws.folderName, { analysis: a, decision: 'approved', by: 'PO', reason: 'PO-30 wording', now: tick() });
    assert.equal(rs.approveScope(ws.runsDir, ws.folderName, { artifact: pc, approvedBy: 'BA', now: tick() }).scopeApproval.id, 'SA-2');
  } finally { cleanup(ws); }
});

test('moduleArtifactRefs: each stage start records the revision it consumed, in run.json and the Manifest', () => {
  const ws = workspace();
  try {
    recordFixtureApproval(ws.dataRoot, put(ws, 'modules/login/context/ProjectContext.md', projectContext('Approved', [['AC-1', 'a']])));
    rs.startStage(ws.runsDir, ws.folderName, { stageId: '2', invocationPath: 'Direct', now: tick() });
    const refs = rs.readRunState(ws.runsDir, ws.folderName).moduleArtifactRefs;
    assert.equal(refs.length, 1);
    assert.equal(refs[0].artifact, 'modules/login/context/ProjectContext.md');
    assert.equal(refs[0].stage, '2');
    assert.match(refs[0].sha256, /^[0-9a-f]{64}$/);
    const manifest = fs.readFileSync(manifestPath(ws.runsDir, ws.folderName), 'utf8');
    assert.match(manifest, /## 8\. Module Artifacts Consumed/);
    assert.match(manifest, new RegExp(`\`modules/login/context/ProjectContext.md\` \\| 1 \\| Approved`));
  } finally { cleanup(ws); }
});

test('historical runs: traced read-only through their owner, never written', () => {
  const ws = workspace();
  try {
    standardLogin(ws);
    const legacy = 'login-run-009__legacy';
    const meta = path.join(ws.runsDir, legacy, 'metadata');
    fs.mkdirSync(meta, { recursive: true });
    fs.writeFileSync(path.join(meta, 'run.json'), JSON.stringify({ folderName: legacy, status: 'Preparing' }));
    put(ws, `runs/${legacy}/manual_execution/ManualExecutionResults.md`, '| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |\n|---|---|---|---|---|---|\n| TC-1 | login | Passed | 1 | — | a.png |\n');
    const before = fs.readFileSync(path.join(meta, 'run.json'), 'utf8');
    const g = buildTraceGraph(ws.runsDir, ws.folderName);
    assert.ok(g.graphs[0].testCases['TC-1'].executions.some((e) => e.run === legacy), 'linked by its owner prefix');
    const a = analyzeImpact(ws.runsDir, { artifact: 'modules/login/context/ProjectContext.md', changed: ['AC-1'] });
    expectCode(() => rs.recordImpactDecision(ws.runsDir, legacy, { analysis: a, decision: 'approved', by: 'PO', reason: 'r', now: tick() }), 'LEGACY_RUN');
    assert.equal(fs.readFileSync(path.join(meta, 'run.json'), 'utf8'), before);
  } finally { cleanup(ws); }
});
