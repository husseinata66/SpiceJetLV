const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  AUTOMATION_STATE_FILENAME,
  AutomationStateError,
  automationStatePath,
  readAutomationState,
  setAutomationState,
  recordAssembly,
  listAssemblable,
} = require('../automationState');

const NOW = new Date('2026-07-29T10:00:00Z');
const LATER = new Date('2026-07-29T12:00:00Z');

function makeModulesDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'automation-state-test-'));
  const modulesDir = path.join(root, 'modules');
  fs.mkdirSync(path.join(modulesDir, 'login', 'automation'), { recursive: true });
  return modulesDir;
}

function cleanup(modulesDir) {
  fs.rmSync(path.dirname(modulesDir), { recursive: true, force: true });
}

test('readAutomationState returns null when no automation project exists', () => {
  // A legitimate state — Stage 4A has not run for this module — not an error.
  const modulesDir = makeModulesDir();
  assert.equal(readAutomationState(modulesDir, 'login'), null);
  cleanup(modulesDir);
});

test('setAutomationState writes the state file inside the module automation folder', () => {
  const modulesDir = makeModulesDir();
  const state = setAutomationState(modulesDir, 'login', 'Generated', {
    now: NOW,
    framework: 'Playwright',
    baselineRef: 'abc1234',
  });

  assert.equal(state.state, 'Generated');
  assert.equal(state.framework, 'Playwright');
  assert.equal(state.baselineRef, 'abc1234');
  assert.ok(fs.existsSync(automationStatePath(modulesDir, 'login')));
  assert.ok(automationStatePath(modulesDir, 'login').endsWith(AUTOMATION_STATE_FILENAME));
  cleanup(modulesDir);
});

test('setAutomationState requires an explicit now', () => {
  const modulesDir = makeModulesDir();
  assert.throws(() => setAutomationState(modulesDir, 'login', 'Generated', {}), /now/);
  cleanup(modulesDir);
});

test('setAutomationState rejects an unknown state', () => {
  const modulesDir = makeModulesDir();
  assert.throws(
    () => setAutomationState(modulesDir, 'login', 'Merged', { now: NOW }),
    /Unknown automation state/
  );
  cleanup(modulesDir);
});

test('the normal progression Generated -> Executed -> Approved is legal', () => {
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Executed', { now: NOW, sourceRun: 'run-001' });
  const state = setAutomationState(modulesDir, 'login', 'Approved', { now: LATER, approvedBy: 'QA Lead' });

  assert.equal(state.state, 'Approved');
  assert.equal(state.approvedBy, 'QA Lead');
  assert.equal(state.approvedAt, LATER.toISOString());
  cleanup(modulesDir);
});

test('Approved -> Healed is legal, and drops the suite out of Approved', () => {
  // An already-approved suite that later fails may be repaired; the repair must re-clear the gate.
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Approved', { now: NOW, approvedBy: 'QA Lead' });

  const healed = setAutomationState(modulesDir, 'login', 'Healed', { now: LATER, sourceRun: 'run-002' });
  assert.equal(healed.state, 'Healed');
  assert.throws(() => recordAssembly(modulesDir, 'login', { now: LATER }), /not Approved/);
  cleanup(modulesDir);
});

test('approving requires an approver — a record naming nobody is not an approval', () => {
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  assert.throws(
    () => setAutomationState(modulesDir, 'login', 'Approved', { now: NOW }),
    /requires `approvedBy`/
  );
  cleanup(modulesDir);
});

test('sourceRuns accumulate across executions without duplicating', () => {
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Executed', { now: NOW, sourceRun: 'run-001' });
  setAutomationState(modulesDir, 'login', 'Executed', { now: LATER, sourceRun: 'run-001' });
  const state = setAutomationState(modulesDir, 'login', 'Executed', { now: LATER, sourceRun: 'run-002' });
  assert.deepEqual(state.sourceRuns, ['run-001', 'run-002']);
  cleanup(modulesDir);
});

test('history records every transition', () => {
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Executed', { now: LATER, sourceRun: 'run-001' });
  const state = readAutomationState(modulesDir, 'login');
  assert.deepEqual(state.history.map((h) => h.state), ['Generated', 'Executed']);
  assert.equal(state.history[1].run, 'run-001');
  cleanup(modulesDir);
});

test('recordAssembly refuses anything but an Approved project', () => {
  // Letting an unapproved project assemble would make the §5.2 gate advisory.
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  assert.throws(() => recordAssembly(modulesDir, 'login', { now: NOW }), /not Approved/);
  cleanup(modulesDir);
});

test('recordAssembly refuses a module with no automation project', () => {
  const modulesDir = makeModulesDir();
  assert.throws(
    () => recordAssembly(modulesDir, 'login', { now: NOW }),
    /no automation project to assemble/
  );
  cleanup(modulesDir);
});

test('recordAssembly stamps assembledAt and keeps the state Approved', () => {
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Approved', { now: NOW, approvedBy: 'QA Lead' });

  const assembled = recordAssembly(modulesDir, 'login', {
    now: LATER,
    mergeSummaryPath: 'platform_core_data/modules/login/automation/automation_promotion.md',
  });

  assert.equal(assembled.assembledAt, LATER.toISOString());
  assert.equal(assembled.state, 'Approved');
  assert.equal(assembled.lastMergeSummary, 'platform_core_data/modules/login/automation/automation_promotion.md');
  assert.equal(assembled.history.at(-1).state, 'Assembled');
  cleanup(modulesDir);
});

test('listAssemblable returns only Approved module projects', () => {
  const modulesDir = makeModulesDir();
  fs.mkdirSync(path.join(modulesDir, 'booking', 'automation'), { recursive: true });

  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Approved', { now: NOW, approvedBy: 'QA Lead' });
  setAutomationState(modulesDir, 'booking', 'Generated', { now: NOW });

  const assemblable = listAssemblable(modulesDir, ['login', 'booking', 'ghost']);
  assert.deepEqual(assemblable.map((m) => m.slug), ['login']);
  cleanup(modulesDir);
});

test('a newer schemaVersion fails loudly rather than being misread', () => {
  const modulesDir = makeModulesDir();
  fs.writeFileSync(
    automationStatePath(modulesDir, 'login'),
    JSON.stringify({ schemaVersion: 99, state: 'Approved' })
  );
  assert.throws(() => readAutomationState(modulesDir, 'login'), AutomationStateError);
  cleanup(modulesDir);
});

// --- Promoted: the terminal state (2026-08-17, user-mandated) ----------------------------------

const { recordPromotion, recordBaselineUpdate } = require('../automationState');

const PROMOTION_OPTS = {
  baselinePath: 'platform_core_data/automation_baseline/shaft/tests_SHAFT',
  ownedPaths: ['src/main/java/AdminPages/Admin/Login/**'],
  retiredPath: 'modules/login/automation/tests_SHAFT',
  verification: { passed: true, fileCount: 36 },
  promotedBy: 'reviewer@example.com',
};

/** Drives a module to Approved + assembled, the only launchpad for promotion. */
function approvedAndAssembled(modulesDir) {
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Approved', { now: NOW, approvedBy: 'reviewer@example.com' });
  recordAssembly(modulesDir, 'login', { now: NOW, baselineRef: 'abc123' });
}

test('recordPromotion sets Promoted and flips the source of truth to the baseline', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  const state = recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS });
  assert.equal(state.state, 'Promoted');
  assert.equal(state.sourceOfTruth, 'baseline');
  assert.equal(state.promotionVerification.passed, true);
  assert.equal(state.retiredPath, 'modules/login/automation/tests_SHAFT');
  cleanup(modulesDir);
});

test('promotion is refused without a PASSING verification — otherwise it is a deletion', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  assert.throws(
    () => recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS, verification: { passed: false } }),
    AutomationStateError,
  );
  assert.equal(readAutomationState(modulesDir, 'login').state, 'Approved');
  cleanup(modulesDir);
});

test('promotion is refused for a module that was never assembled', () => {
  // Nothing would be in the baseline for the baseline to be the source of truth OF.
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  setAutomationState(modulesDir, 'login', 'Approved', { now: NOW, approvedBy: 'r@example.com' });
  assert.throws(() => recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS }), /never been assembled/);
  cleanup(modulesDir);
});

test('promotion is refused without owned paths — an unlocatable module cannot be edited later', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  assert.throws(() => recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS, ownedPaths: [] }), /ownedPaths/);
  cleanup(modulesDir);
});

test('promotion is refused for anything but Approved', () => {
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  assert.throws(() => recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS }), /not Approved/);
  cleanup(modulesDir);
});

test('Promoted is terminal — no state transition can move a module back to a working copy', () => {
  // Every other state implies a module directory to act on, and after promotion none exists.
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS });
  for (const target of ['Generated', 'Executed', 'Healed', 'Approved']) {
    assert.throws(
      () => setAutomationState(modulesDir, 'login', target, { now: LATER, approvedBy: 'r@example.com' }),
      /Promoted/,
    );
  }
  cleanup(modulesDir);
});

test('Promoted cannot be declared through setAutomationState', () => {
  // It is the outcome of a verified promotion, never an assertion a caller can make.
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  assert.throws(() => setAutomationState(modulesDir, 'login', 'Promoted', { now: LATER }), /recordPromotion/);
  cleanup(modulesDir);
});

test('recordBaselineUpdate is the only write path for a promoted module', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS });
  const state = recordBaselineUpdate(modulesDir, 'login', {
    now: LATER,
    changedPaths: ['src/main/java/AdminPages/Admin/Login/LogIn_Page.java'],
    approvedBy: 'reviewer@example.com',
    baselineRef: 'b'.repeat(40),
    run: 'run-004',
  });
  assert.equal(state.state, 'Promoted', 'an in-place update is not a second promotion');
  assert.equal(state.baselineUpdates.length, 1);
  assert.ok(state.sourceRuns.includes('run-004'));
  cleanup(modulesDir);
});

test('recordBaselineUpdate refuses an update with no named approver — an unapproved change is not recorded', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS });
  const before = readAutomationState(modulesDir, 'login');
  for (const approvedBy of [undefined, '', '   ']) {
    assert.throws(
      () => recordBaselineUpdate(modulesDir, 'login', { now: LATER, changedPaths: ['a.java'], baselineRef: 'b'.repeat(40), approvedBy }),
      /requires `approvedBy`/,
    );
  }
  assert.deepEqual(readAutomationState(modulesDir, 'login'), before, 'nothing written');
  cleanup(modulesDir);
});

test('recordBaselineUpdate refuses a missing or malformed baselineRef, and a ref the repository does not have', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS });
  const base = { now: LATER, changedPaths: ['a.java'], approvedBy: 'reviewer@example.com' };
  for (const baselineRef of [undefined, '', 'uncommitted', 'abc12', 'z'.repeat(40), 'a'.repeat(41)]) {
    assert.throws(() => recordBaselineUpdate(modulesDir, 'login', { ...base, baselineRef }), /baselineRef/);
  }
  assert.throws(
    () => recordBaselineUpdate(modulesDir, 'login', { ...base, baselineRef: 'c'.repeat(40), verifyRef: () => false }),
    /does not name a commit/,
  );
  cleanup(modulesDir);
});

test('recordBaselineUpdate keeps recoverable history: each entry records its restore point, nothing is overwritten', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS });
  const first = 'd'.repeat(40);
  const second = 'e'.repeat(40);
  const priorRef = readAutomationState(modulesDir, 'login').baselineRef ?? null;
  recordBaselineUpdate(modulesDir, 'login', { now: LATER, changedPaths: ['a.java'], approvedBy: 'r1', baselineRef: first, verifyRef: () => true });
  const state = recordBaselineUpdate(modulesDir, 'login', { now: LATER, changedPaths: ['b.java'], approvedBy: 'r2', baselineRef: second });
  assert.equal(state.baselineUpdates.length, 2);
  assert.equal(state.baselineUpdates[0].previousBaselineRef, priorRef);
  assert.equal(state.baselineUpdates[1].previousBaselineRef, first);
  assert.equal(state.baselineUpdates[1].approvedBy, 'r2');
  assert.equal(state.baselineRef, second);
  cleanup(modulesDir);
});

test('recordBaselineUpdate refuses a module that still has its own working copy', () => {
  const modulesDir = makeModulesDir();
  setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  assert.throws(
    () => recordBaselineUpdate(modulesDir, 'login', { now: LATER, changedPaths: ['a.java'] }),
    /not Promoted/,
  );
  cleanup(modulesDir);
});

test('recordBaselineUpdate refuses an update that names no files', () => {
  const modulesDir = makeModulesDir();
  approvedAndAssembled(modulesDir);
  recordPromotion(modulesDir, 'login', { now: LATER, ...PROMOTION_OPTS });
  assert.throws(() => recordBaselineUpdate(modulesDir, 'login', { now: LATER, changedPaths: [] }), /changed baseline paths/);
  cleanup(modulesDir);
});

test('a pre-promotion module carries sourceOfTruth "module" by default', () => {
  const modulesDir = makeModulesDir();
  const state = setAutomationState(modulesDir, 'login', 'Generated', { now: NOW });
  assert.equal(state.sourceOfTruth, 'module');
  cleanup(modulesDir);
});
