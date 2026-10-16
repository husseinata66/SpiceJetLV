// Execution Safety — integration with Test Case governance.
//
// THE CLAIM UNDER TEST: three independent gates, composed in one direction only.
//
//     Review           decides whether the case may run at all       (test-design-skill §6.3)
//     Automation       decides whether it may be automated           (test-design-skill §6.3.2)
//     Execution Safety decides whether its operations may execute    (this tool)
//
// Safety runs AFTER eligibility and can only ever narrow it. It never widens: an `Allowed` cannot
// rescue an unreviewed case, and an `Approval Required` satisfied by a run authorization still
// leaves a `Pending` case unexecuted.
//
// These are fixtures and mocks throughout. No browser starts, no environment is contacted, and no
// mutating operation is performed — a test suite for a safety mechanism must not itself be the
// thing that performs an unauthorized action.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluate: evaluateAny } = require('../evaluator');
// F-22 (Phase 9.3): the evaluator never defaults the environment. These tests exercise rule resolution,
// so every request names the environment its policy governs — explicitly, here.
const evaluate = (req) => evaluateAny({ environment: req && req.policy ? req.policy.environment : undefined, ...req });
const { preflight: preflightAny } = require('../preflight');
const preflight = (o) => preflightAny({ environment: o && o.policy ? o.policy.environment : undefined, ...o });
const { createAuthorization } = require('../authorizations');
const {
  parseTestCases, isManualEligible, isAutomationEligible,
} = require('../../test_suite_export/parseTestCases');

const POLICY = {
  policyId: 'test-policy',
  policyVersion: 1,
  environment: 'Staging',
  defaults: { '*': 'Forbidden' },
  categories: {
    read: { '*': 'Allowed' },
    mutation: { SelfCreated: 'Approval Required', Shared: 'Approval Required' },
    financial: { '*': { decision: 'Forbidden', absolute: true } },
  },
  actions: { DELETE: { Shared: { decision: 'Forbidden', absolute: true } } },
};

/** A minimal Stage 3 suite covering the combinations that matter. */
const SUITE = `# Test Cases — Fixture

### TC-F-001 — Search the branch grid
**Objective:** Read-only search.
**Steps:**
1. Search.
**Expected Result:** Results appear.
**Priority:** P1
**Tags:** Atomic
**Review:** Approved
**Automation:** Approved

### TC-F-002 — Update a shared agency record
**Objective:** Update an existing record.
**Steps:**
1. Edit.
**Expected Result:** Saved.
**Priority:** P1
**Tags:** Atomic
**Review:** Approved
**Automation:** Approved

### TC-F-003 — Delete a shared branch
**Objective:** Delete an existing record.
**Steps:**
1. Delete.
**Expected Result:** Removed.
**Priority:** P2
**Tags:** Atomic
**Review:** Approved
**Automation:** Approved

### TC-F-004 — Pay for a booking
**Objective:** Take a payment.
**Steps:**
1. Pay.
**Expected Result:** Paid.
**Priority:** P1
**Tags:** Atomic
**Review:** Approved
**Automation:** Approved

### TC-F-005 — Update, but still under review
**Objective:** Update an existing record.
**Steps:**
1. Edit.
**Expected Result:** Saved.
**Priority:** P2
**Tags:** Atomic
**Review:** Pending
**Automation:** Approved

### TC-F-006 — Update, approved but deliberately manual
**Objective:** Update a self-created record.
**Steps:**
1. Edit.
**Expected Result:** Saved.
**Priority:** P2
**Tags:** Atomic
**Review:** Approved
**Automation:** Rejected
`;

/** What each case's steps actually do — supplied by the executing Skill, not inferred here. */
const OPERATIONS = {
  'TC-F-001': { action: 'SEARCH', ownership: 'Shared', module: 'branch' },
  'TC-F-002': { action: 'UPDATE', ownership: 'Shared', module: 'agency' },
  'TC-F-003': { action: 'DELETE', ownership: 'Shared', module: 'branch' },
  'TC-F-004': { action: 'PAYMENT', ownership: 'Shared', module: 'agency' },
  'TC-F-005': { action: 'UPDATE', ownership: 'Shared', module: 'agency' },
  'TC-F-006': { action: 'UPDATE', ownership: 'SelfCreated', module: 'branch' },
};

function suite() {
  return parseTestCases(SUITE).cases;
}

/** Models Stage 4M: eligibility first, then safety, then a classification for every case. */
function manualPlan({ authorizations = [], runId = 'run-042' } = {}) {
  return suite().map((tc) => {
    if (!isManualEligible(tc)) {
      return { id: tc.id, status: 'Excluded', reason: tc.review === 'Rejected' ? 'Rejected at Review' : 'Pending Review' };
    }
    const decision = evaluate({ policy: POLICY, ...OPERATIONS[tc.id], runId, authorizations });
    if (decision.decision === 'Forbidden') {
      return { id: tc.id, status: 'Skipped', reason: 'Execution Safety Policy', detail: decision.reason };
    }
    if (decision.decision === 'Approval Required') {
      return { id: tc.id, status: 'Awaiting Authorization', reason: 'Execution Safety Policy' };
    }
    return { id: tc.id, status: 'Executable' };
  });
}

// ---------------------------------------------------------------------------------------------
// Manual Execution
// ---------------------------------------------------------------------------------------------

test('Manual Execution still selects on Review = Approved, and safety only narrows that', () => {
  const plan = manualPlan();
  const byId = Object.fromEntries(plan.map((p) => [p.id, p]));

  assert.equal(byId['TC-F-001'].status, 'Executable');            // read — allowed
  assert.equal(byId['TC-F-002'].status, 'Awaiting Authorization'); // shared update
  assert.equal(byId['TC-F-003'].status, 'Skipped');                // shared delete — forbidden
  assert.equal(byId['TC-F-004'].status, 'Skipped');                // payment — forbidden
  assert.equal(byId['TC-F-005'].status, 'Excluded');               // never reached safety at all
  assert.equal(byId['TC-F-006'].status, 'Awaiting Authorization'); // Automation = Rejected is irrelevant here
});

test('an unreviewed case is Excluded by Review, never by safety — the gates do not swap roles', () => {
  const byId = Object.fromEntries(manualPlan().map((p) => [p.id, p]));
  // TC-F-005 does the same operation as TC-F-002. Its exclusion is a Review outcome, not a policy one.
  assert.equal(byId['TC-F-005'].status, 'Excluded');
  assert.equal(byId['TC-F-005'].reason, 'Pending Review');
  assert.equal(byId['TC-F-002'].status, 'Awaiting Authorization');
});

test('an Allowed safety decision cannot make an unreviewed case executable', () => {
  const pending = suite().find((tc) => tc.id === 'TC-F-005');
  assert.equal(isManualEligible(pending), false);
  // Even the most permissive possible safety answer changes nothing about eligibility.
  const permissive = { ...POLICY, categories: { ...POLICY.categories, mutation: { '*': 'Allowed' } } };
  assert.equal(evaluate({ policy: permissive, ...OPERATIONS['TC-F-005'] }).decision, 'Allowed');
  assert.equal(isManualEligible(pending), false);
});

test('a safety block is never an Application Failure — it reuses the existing taxonomy', () => {
  const blocked = manualPlan().filter((p) => p.status === 'Skipped');
  assert.equal(blocked.length, 2);
  for (const b of blocked) {
    assert.equal(b.reason, 'Execution Safety Policy');
    assert.ok(!/Failure/.test(b.status), 'a policy block must not be reported as any kind of Failure');
  }
});

test('every case is accounted for — a safety block never shrinks the denominator', () => {
  const plan = manualPlan();
  assert.equal(plan.length, suite().length);
  assert.equal(plan.filter((p) => p.status).length, plan.length);
});

test('a scoped run authorization moves exactly the matching cases to executable', () => {
  const authorized = createAuthorization({
    runId: 'run-042',
    environment: 'Staging',
    module: 'agency',
    action: 'UPDATE',
    ownership: 'Shared',
    approvedAt: '2026-08-07T10:00:00Z',
    approvedBy: 'reviewer',
  });
  const byId = Object.fromEntries(manualPlan({ authorizations: [authorized] }).map((p) => [p.id, p]));

  assert.equal(byId['TC-F-002'].status, 'Executable');             // covered by the grant
  assert.equal(byId['TC-F-006'].status, 'Awaiting Authorization'); // different module and ownership
  assert.equal(byId['TC-F-003'].status, 'Skipped');                // Forbidden — unliftable
  assert.equal(byId['TC-F-004'].status, 'Skipped');                // Forbidden — unliftable
  assert.equal(byId['TC-F-005'].status, 'Excluded');               // still not reviewed
});

// ---------------------------------------------------------------------------------------------
// Automation
// ---------------------------------------------------------------------------------------------

test('Automation eligibility is unchanged by this feature', () => {
  const byId = Object.fromEntries(suite().map((tc) => [tc.id, tc]));
  assert.equal(isAutomationEligible(byId['TC-F-003']), true);  // Approved + Approved
  assert.equal(isAutomationEligible(byId['TC-F-005']), false); // Review Pending
  assert.equal(isAutomationEligible(byId['TC-F-006']), false); // Automation Rejected
});

test('Automation = Approved does NOT authorize the underlying business mutation', () => {
  const del = suite().find((tc) => tc.id === 'TC-F-003');
  // The case is fully eligible for generation...
  assert.equal(isAutomationEligible(del), true);
  // ...and the operation it performs is still Forbidden on this environment.
  const decision = evaluate({ policy: POLICY, ...OPERATIONS['TC-F-003'], runId: 'run-042' });
  assert.equal(decision.decision, 'Forbidden');
  assert.equal(decision.absolute, true);
});

test('the automation preflight groups the eligible suite and names what cannot run', () => {
  const eligible = suite().filter(isAutomationEligible);
  const operations = eligible.map((tc) => ({ ...OPERATIONS[tc.id], testCaseId: tc.id }));
  const result = preflight({ policy: POLICY, operations, runId: 'run-042' });

  assert.equal(result.totals.operations, 4);
  assert.equal(result.totals.allowed, 1);          // TC-F-001 search
  assert.equal(result.totals.approvalRequired, 1); // TC-F-002 shared update
  assert.equal(result.totals.forbidden, 2);        // TC-F-003 delete, TC-F-004 payment
  assert.deepEqual(
    result.blocked.map((g) => g.action).sort(),
    ['DELETE', 'PAYMENT'],
  );
  assert.equal(result.pendingApprovals.length, 1);
});

test('the preflight is discovered before execution, not after a forbidden attempt', () => {
  // The whole point: the blocked set is knowable from the plan alone, with nothing executed.
  const operations = Object.entries(OPERATIONS).map(([testCaseId, op]) => ({ ...op, testCaseId }));
  const result = preflight({ policy: POLICY, operations, runId: 'run-042' });
  assert.ok(result.blocked.length > 0);
  for (const g of result.blocked) assert.ok(g.reason, 'a blocked group must carry its reason');
});

// ---------------------------------------------------------------------------------------------
// The three-concern independence table (§39)
// ---------------------------------------------------------------------------------------------

test('the three concerns stay independent across the brief\'s named cases', () => {
  const cases = [
    // Review,     Automation, safety op,                        manual?, automate?, safety
    ['Approved', 'Rejected', OPERATIONS['TC-F-006'], true, false, 'Approval Required'],
    ['Approved', 'Approved', OPERATIONS['TC-F-004'], true, true, 'Forbidden'],
    ['Pending', 'Approved', OPERATIONS['TC-F-001'], false, false, 'Allowed'],
  ];
  for (const [review, automation, op, manual, automate, safety] of cases) {
    const tc = { id: 'X', review, automation };
    assert.equal(isManualEligible(tc), manual, `manual ${review}/${automation}`);
    assert.equal(isAutomationEligible(tc), automate, `automation ${review}/${automation}`);
    assert.equal(evaluate({ policy: POLICY, ...op }).decision, safety, `safety ${review}/${automation}`);
  }
});
