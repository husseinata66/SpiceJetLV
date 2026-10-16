// Execution Safety — preflight and approval-prompt tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { preflight: preflightAny, renderPreflight, renderPreflightDoc } = require('../preflight');
const preflight = (o) => preflightAny({ environment: o && o.policy ? o.policy.environment : undefined, ...o });
const { renderApprovalPrompt, createAuthorization } = require('../authorizations');
const { evaluate: evaluateAny } = require('../evaluator');
// F-22 (Phase 9.3): the evaluator never defaults the environment. These tests exercise rule resolution,
// so every request names the environment its policy governs — explicitly, here.
const evaluate = (req) => evaluateAny({ environment: req && req.policy ? req.policy.environment : undefined, ...req });
const { PolicyError } = require('../schema');

const POLICY = {
  policyId: 'test-policy',
  policyVersion: 1,
  environment: 'Staging',
  defaults: { '*': 'Forbidden' },
  categories: {
    read: { '*': 'Allowed' },
    mutation: {
      SelfCreated: 'Approval Required',
      Shared: { decision: 'Approval Required', cleanupRequired: true },
      Unknown: 'Approval Required',
    },
    approval: { Shared: { decision: 'Forbidden', absolute: true } },
    financial: { '*': { decision: 'Forbidden', absolute: true } },
  },
  actions: { DELETE: { Shared: { decision: 'Forbidden', absolute: true } } },
};

/** The brief's own worked example: 17 reads, 12 updates, 2 approves, 1 delete, 0 payments. */
function sampleOperations() {
  const ops = [];
  for (let i = 0; i < 17; i += 1) ops.push({ action: 'READ', ownership: 'Shared', module: 'agency', testCaseId: `TC-R-${i}` });
  for (let i = 0; i < 12; i += 1) ops.push({ action: 'UPDATE', ownership: 'Shared', module: 'agency', testCaseId: `TC-U-${i}` });
  for (let i = 0; i < 2; i += 1) ops.push({ action: 'APPROVE', ownership: 'Shared', module: 'agency', testCaseId: `TC-A-${i}` });
  ops.push({ action: 'DELETE', ownership: 'Shared', module: 'agency', testCaseId: 'TC-D-0' });
  return ops;
}

test('the preflight groups identical policy scopes into one row each', () => {
  const r = preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' });
  assert.equal(r.totals.operations, 32);
  assert.equal(r.groups.length, 4);
  const byAction = Object.fromEntries(r.groups.map((g) => [g.action, g]));
  assert.equal(byAction.READ.occurrences, 17);
  assert.equal(byAction.READ.decision, 'Allowed');
  assert.equal(byAction.UPDATE.occurrences, 12);
  assert.equal(byAction.UPDATE.decision, 'Approval Required');
  assert.equal(byAction.APPROVE.occurrences, 2);
  assert.equal(byAction.APPROVE.decision, 'Forbidden');
  assert.equal(byAction.DELETE.occurrences, 1);
  assert.equal(byAction.DELETE.decision, 'Forbidden');
});

test('twelve identical operations produce ONE authorization question, not twelve (§15)', () => {
  const r = preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' });
  assert.equal(r.pendingApprovals.length, 1);
  assert.equal(r.pendingApprovals[0].occurrences, 12);
  assert.equal(r.pendingApprovals[0].testCaseIds.length, 12);
});

test('scopes that resolve differently are never merged into one group', () => {
  const ops = [
    { action: 'UPDATE', ownership: 'Shared', module: 'agency' },
    { action: 'UPDATE', ownership: 'SelfCreated', module: 'agency' },
    { action: 'UPDATE', ownership: 'Shared', module: 'branch' },
  ];
  const r = preflight({ policy: POLICY, operations: ops, runId: 'run-042' });
  assert.equal(r.groups.length, 3);
});

test('totals separate allowed, approval-required, forbidden, mutating, and cleanup', () => {
  const r = preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' });
  assert.deepEqual(r.totals, {
    operations: 32,
    groups: 4,
    allowed: 17,
    approvalRequired: 12,
    forbidden: 3,
    mutating: 15,
    cleanupRequired: 12,
    preAuthorized: 0,
  });
});

test('an existing run authorization shows as already-authorized, not as a new question', () => {
  const auth = createAuthorization({
    runId: 'run-042',
    environment: 'Staging',
    module: 'agency',
    action: 'UPDATE',
    ownership: 'Shared',
    approvedAt: '2026-08-07T10:00:00Z',
    approvedBy: 'reviewer',
  });
  const r = preflight({
    policy: POLICY, operations: sampleOperations(), runId: 'run-042', authorizations: [auth],
  });
  assert.equal(r.pendingApprovals.length, 0);
  assert.equal(r.totals.preAuthorized, 12);
  assert.equal(r.totals.allowed, 29);
});

test('an authorization from a different run changes nothing about this run\'s preflight', () => {
  const auth = createAuthorization({
    runId: 'run-041',
    environment: 'Staging',
    module: 'agency',
    action: 'UPDATE',
    ownership: 'Shared',
    approvedAt: '2026-08-06T10:00:00Z',
    approvedBy: 'reviewer',
  });
  const r = preflight({
    policy: POLICY, operations: sampleOperations(), runId: 'run-042', authorizations: [auth],
  });
  assert.equal(r.pendingApprovals.length, 1);
  assert.equal(r.totals.preAuthorized, 0);
});

test('the rendered preflight states zero-occurrence high-risk classes explicitly', () => {
  const text = renderPreflight(preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' }));
  assert.match(text, /PAYMENT\n {2}0 occurrences/);
  assert.match(text, /TICKET\n {2}0 occurrences/);
  assert.match(text, /No operation was executed\. This preflight is read-only\./);
});

test('the rendered preflight names what is blocked and why', () => {
  const text = renderPreflight(preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' }));
  assert.match(text, /Blocked by policy/);
  assert.match(text, /DELETE \/ agency \/ Shared/);
  assert.match(text, /no approval can change that/);
});

test('an empty operation list is a valid preflight, and says so rather than looking clean', () => {
  const r = preflight({ policy: POLICY, operations: [], runId: 'run-042' });
  assert.equal(r.totals.operations, 0);
  assert.match(renderPreflight(r), /\(none — no operations were supplied to evaluate\)/);
});

test('the preflight document records the policy identity a run executed under', () => {
  const r = preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' });
  const doc = renderPreflightDoc(r, { policyHash: 'sha256:abc', now: new Date('2026-08-07T12:00:00Z') });
  assert.match(doc, /# Execution Safety Preflight — run-042/);
  assert.match(doc, /\| Policy hash \| `sha256:abc` \|/);
  assert.match(doc, /not a test result and not an Application Failure/);
});

test('the preflight is deterministic', () => {
  const a = preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' });
  const b = preflight({ policy: POLICY, operations: sampleOperations(), runId: 'run-042' });
  assert.deepEqual(a, b);
});

// ---------------------------------------------------------------------------------------------
// The approval prompt
// ---------------------------------------------------------------------------------------------

test('the approval prompt states the full scope and the non-carry-forward limit', () => {
  const result = evaluate({
    policy: POLICY, action: 'UPDATE', ownership: 'Shared', module: 'agency', runId: 'run-042',
  });
  const prompt = renderApprovalPrompt({ result, affectedCases: 12, recommendation: 'Approve — restorable.' });
  for (const fragment of [
    'Human Authorization Required', 'Run:          run-042', 'Environment:  Staging',
    'Module:       agency', 'Action:       UPDATE', 'Ownership:    Shared',
    'Affected Test Cases: 12', 'for this run only',
    'does not carry to another run, environment, module, action, or ownership class',
    'Cleanup:      Required', 'Recommendation: Approve — restorable.', 'Approve this scope?',
  ]) {
    assert.ok(prompt.includes(fragment), `prompt is missing: ${fragment}`);
  }
});

test('an authorization cannot be created without a run, a time, and an approver', () => {
  assert.throws(() => createAuthorization({ action: 'UPDATE' }), PolicyError);
  assert.throws(() => createAuthorization({ runId: 'r', action: 'UPDATE' }), PolicyError);
  assert.throws(
    () => createAuthorization({ runId: 'r', action: 'UPDATE', approvedAt: 't' }),
    /approvedBy/,
  );
});

test('an authorization records no secret, only a scope and an approver identity', () => {
  const auth = createAuthorization({
    runId: 'run-042',
    environment: 'Staging',
    module: 'agency',
    action: 'UPDATE',
    ownership: 'Shared',
    approvedAt: '2026-08-07T10:00:00Z',
    approvedBy: 'Super Admin operator',
    // Anything not in AUTHORIZATION_FIELDS is dropped, so a caller cannot smuggle one in.
    password: 'hunter2',
    token: 'abc123',
  });
  const serialized = JSON.stringify(auth);
  assert.equal(auth.password, undefined);
  assert.equal(auth.token, undefined);
  assert.ok(!/hunter2|abc123/.test(serialized));
});
