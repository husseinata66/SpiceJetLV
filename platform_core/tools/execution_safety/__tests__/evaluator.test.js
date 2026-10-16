// Execution Safety — evaluator unit tests.
//
// These tests are the executable form of the model. Where the README and this file disagree, this
// file is what actually runs, and the README is the bug.
//
// Every fixture policy here is INVENTED FOR THE TEST. None of them is the project's policy — the
// live policy has its own test file (projectPolicy.test.js), because a test that asserted the
// project's permissions from inside platform_core/ would be exactly the hardcoding this whole
// separation exists to prevent.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluate: evaluateAny, explain, resolveRule, tierOf, findAuthorization,
} = require('../evaluator');
// F-22 (Phase 9.3): the evaluator never defaults the environment. These tests exercise rule resolution,
// so every request names the environment its policy governs — explicitly, here.
const evaluate = (req) => evaluateAny({ environment: req && req.policy ? req.policy.environment : undefined, ...req });
const { validatePolicy, assertValidPolicy, PolicyError } = require('../schema');

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

/** A deliberately ordinary policy: read open, mutation gated, the dangerous classes shut. */
function basePolicy(extra = {}) {
  return {
    policyId: 'test-policy',
    policyVersion: 1,
    environment: 'Staging',
    environmentAliases: ['STG'],
    defaults: { '*': 'Forbidden' },
    categories: {
      read: { '*': 'Allowed' },
      mutation: {
        SelfCreated: 'Allowed',
        DedicatedTestData: 'Allowed',
        Shared: { decision: 'Approval Required', cleanupRequired: true },
        Unknown: 'Approval Required',
        ProductionLike: { decision: 'Forbidden', absolute: true },
      },
      approval: { SelfCreated: 'Allowed', Shared: 'Approval Required' },
      financial: { '*': { decision: 'Forbidden', absolute: true } },
      booking: { '*': { decision: 'Forbidden', absolute: true } },
      privileged: { '*': { decision: 'Forbidden', absolute: true } },
    },
    actions: {
      DELETE: {
        SelfCreated: 'Approval Required',
        Shared: { decision: 'Forbidden', absolute: true },
        Unknown: { decision: 'Forbidden', absolute: true },
      },
    },
    ...extra,
  };
}

function decide(req) {
  return evaluate({ policy: basePolicy(), ...req }).decision;
}

// ---------------------------------------------------------------------------------------------
// §48 — the representative action × ownership matrix
// ---------------------------------------------------------------------------------------------

test('the action x ownership matrix resolves exactly as the policy states', () => {
  const expected = [
    ['READ', 'Shared', 'Allowed'],
    ['READ', 'Unknown', 'Allowed'],
    ['SEARCH', 'Shared', 'Allowed'],

    ['CREATE', 'SelfCreated', 'Allowed'],
    ['CREATE', 'DedicatedTestData', 'Allowed'],
    ['CREATE', 'Shared', 'Approval Required'],

    ['UPDATE', 'SelfCreated', 'Allowed'],
    ['UPDATE', 'DedicatedTestData', 'Allowed'],
    ['UPDATE', 'Shared', 'Approval Required'],
    ['UPDATE', 'Unknown', 'Approval Required'],

    ['DELETE', 'SelfCreated', 'Approval Required'],
    ['DELETE', 'Shared', 'Forbidden'],
    ['DELETE', 'Unknown', 'Forbidden'],

    ['APPROVE', 'Shared', 'Approval Required'],
    ['REJECT', 'Shared', 'Approval Required'],

    ['PAYMENT', 'Shared', 'Forbidden'],
    ['TOP_UP', 'Shared', 'Forbidden'],
    ['REFUND', 'Shared', 'Forbidden'],

    ['BOOK', 'Shared', 'Forbidden'],
    ['TICKET', 'Shared', 'Forbidden'],
    ['VOID', 'Shared', 'Forbidden'],
    ['CANCEL_BOOKING', 'Shared', 'Forbidden'],

    ['CREDENTIAL_CHANGE', 'Shared', 'Forbidden'],
    ['ROLE_PERMISSION_CHANGE', 'Shared', 'Forbidden'],
  ];
  for (const [action, ownership, want] of expected) {
    assert.equal(decide({ action, ownership }), want, `${action} + ${ownership}`);
  }
});

test('a financial action never inherits the permissive ordinary-mutation default', () => {
  // SelfCreated mutation is Allowed outright in this fixture. A payment against a record this run
  // created must still be Forbidden — money is not a CRUD verb.
  assert.equal(decide({ action: 'UPDATE', ownership: 'SelfCreated' }), 'Allowed');
  assert.equal(decide({ action: 'PAYMENT', ownership: 'SelfCreated' }), 'Forbidden');
  assert.equal(decide({ action: 'TOP_UP', ownership: 'SelfCreated' }), 'Forbidden');
  assert.equal(decide({ action: 'BOOK', ownership: 'SelfCreated' }), 'Forbidden');
});

test('permission to UPDATE never implies permission to DELETE', () => {
  assert.equal(decide({ action: 'UPDATE', ownership: 'Shared' }), 'Approval Required');
  assert.equal(decide({ action: 'DELETE', ownership: 'Shared' }), 'Forbidden');
});

test('permission to BOOK would never imply permission to CANCEL or VOID', () => {
  const policy = basePolicy();
  // The booking prohibition must be non-absolute for an action-level rule to override it at all —
  // which is itself the point of `absolute`, and is asserted separately below.
  policy.categories.booking = { '*': 'Forbidden' };
  policy.actions.BOOK = { '*': 'Allowed' };
  const at = (action) => evaluate({ policy, action, ownership: 'SelfCreated' }).decision;
  assert.equal(at('BOOK'), 'Allowed');
  assert.equal(at('CANCEL_BOOKING'), 'Forbidden');
  assert.equal(at('VOID'), 'Forbidden');
});

// ---------------------------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------------------------

test('Unknown ownership is never treated as SelfCreated', () => {
  assert.equal(decide({ action: 'UPDATE', ownership: 'SelfCreated' }), 'Allowed');
  assert.equal(decide({ action: 'UPDATE', ownership: 'Unknown' }), 'Approval Required');
  assert.equal(decide({ action: 'DELETE', ownership: 'Unknown' }), 'Forbidden');
});

test('an unrecognised ownership value becomes Unknown, and says so', () => {
  const r = evaluate({ policy: basePolicy(), action: 'UPDATE', ownership: 'probably ours' });
  assert.equal(r.ownership, 'Unknown');
  assert.equal(r.decision, 'Approval Required');
  assert.match(r.warnings.join('\n'), /never treated as SelfCreated/);
});

test('a missing ownership value becomes Unknown, not the most permissive class', () => {
  const r = evaluate({ policy: basePolicy(), action: 'DELETE' });
  assert.equal(r.ownership, 'Unknown');
  assert.equal(r.decision, 'Forbidden');
});

test('an unrecognised action becomes OTHER_MUTATION, never a read', () => {
  const r = evaluate({ policy: basePolicy(), action: 'FROBNICATE', ownership: 'Shared' });
  assert.equal(r.action, 'OTHER_MUTATION');
  assert.equal(r.mutating, true);
  assert.equal(r.decision, 'Approval Required');
  assert.match(r.warnings.join('\n'), /treated as a mutation, never as a read/);
});

// ---------------------------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------------------------

test('a policy refuses to decide for an environment it does not govern', () => {
  const r = evaluate({ policy: basePolicy(), action: 'READ', ownership: 'Shared', environment: 'Production' });
  assert.equal(r.decision, 'Forbidden');
  assert.match(r.reason, /governs Staging; the request names Production/);
});

test('a declared environment alias resolves to the policy environment', () => {
  assert.equal(evaluate({ policy: basePolicy(), action: 'READ', environment: 'STG' }).decision, 'Allowed');
});

test('an unrecognised environment becomes Unknown and is refused, not guessed', () => {
  const r = evaluate({ policy: basePolicy(), action: 'READ', environment: 'http://192.168.1.70' });
  assert.equal(r.environment, 'Unknown');
  assert.equal(r.decision, 'Forbidden');
  assert.match(r.warnings.join('\n'), /never from the URL/);
});

test('omitting the environment is Unknown and refused — never the policy\'s own environment (F-22)', () => {
  for (const environment of [undefined, null, '', '   ']) {
    const r = evaluateAny({ policy: basePolicy(), action: 'READ', ownership: 'Shared', environment });
    assert.equal(r.environment, 'Unknown');
    assert.equal(r.decision, 'Forbidden');
    assert.ok(r.warnings.some((w) => /No environment was supplied[\s\S]*never defaulted to the policy's environment \(Staging\)/.test(w)));
  }
  // An unknown name is Unknown too — never Staging.
  assert.equal(evaluateAny({ policy: basePolicy(), action: 'READ', environment: 'uat-2' }).environment, 'Unknown');
});

// ---------------------------------------------------------------------------------------------
// Precedence
// ---------------------------------------------------------------------------------------------

test('a module override wins over the global rule at equal specificity', () => {
  const policy = basePolicy({
    modules: { agency: { actions: { UPDATE: { Shared: 'Allowed' } } } },
  });
  assert.equal(evaluate({ policy, action: 'UPDATE', ownership: 'Shared' }).decision, 'Approval Required');
  assert.equal(evaluate({ policy, action: 'UPDATE', ownership: 'Shared', module: 'agency' }).decision, 'Allowed');
});

test('a module override does not leak to another module', () => {
  const policy = basePolicy({
    modules: { agency: { actions: { UPDATE: { Shared: 'Allowed' } } } },
  });
  assert.equal(evaluate({ policy, action: 'UPDATE', ownership: 'Shared', module: 'branch' }).decision, 'Approval Required');
});

test('an entity override is narrower than its module', () => {
  const policy = basePolicy({
    modules: {
      agency: {
        actions: { UPDATE: { Shared: 'Allowed' } },
        entities: { AGN2: { actions: { UPDATE: { Shared: 'Approval Required' } } } },
      },
    },
  });
  assert.equal(evaluate({ policy, action: 'UPDATE', ownership: 'Shared', module: 'agency' }).decision, 'Allowed');
  assert.equal(evaluate({
    policy, action: 'UPDATE', ownership: 'Shared', module: 'agency', entity: 'AGN2',
  }).decision, 'Approval Required');
});

test('a broad module permission cannot bypass a narrow global prohibition (§16)', () => {
  // The exact scenario the brief names: "Agency mutations = Allowed" must NOT produce
  // "DELETE Shared Agency = Allowed", because DELETE + Shared is the more specific, risk-bearing rule.
  const policy = basePolicy({
    modules: { agency: { categories: { mutation: { '*': 'Allowed' } } } },
  });
  const r = evaluate({ policy, action: 'DELETE', ownership: 'Shared', module: 'agency' });
  assert.equal(r.decision, 'Forbidden');
  assert.equal(r.matchedRule, 'policy.actions.DELETE.Shared');
});

test('the same broad module permission still applies where no narrow prohibition exists', () => {
  // The guard must be surgical: it blocks the bypass, it does not neuter module overrides.
  const policy = basePolicy({
    modules: { agency: { categories: { mutation: { '*': 'Allowed' } } } },
  });
  assert.equal(evaluate({ policy, action: 'UPDATE', ownership: 'Shared', module: 'agency' }).decision, 'Allowed');
});

test('an exact ownership rule beats the wildcard in the same table', () => {
  const policy = basePolicy();
  policy.categories.mutation['*'] = 'Allowed';
  assert.equal(evaluate({ policy, action: 'UPDATE', ownership: 'Shared' }).decision, 'Approval Required');
  assert.equal(evaluate({ policy, action: 'UPDATE', ownership: 'ProductionLike' }).decision, 'Forbidden');
});

test('an absolute prohibition is not overridable by any rule at any scope', () => {
  const policy = basePolicy({
    modules: { agency: { entities: { X: { actions: { PAYMENT: { Shared: 'Allowed' } } } } } },
  });
  const r = evaluate({
    policy, action: 'PAYMENT', ownership: 'Shared', module: 'agency', entity: 'X',
  });
  assert.equal(r.decision, 'Forbidden');
  assert.equal(r.absolute, true);
});

test('two equally specific conflicting rules resolve to the most restrictive (§17)', () => {
  const rules = [
    { decision: 'Allowed', scope: 'module', actionAxis: 'action', ownershipAxis: 'exact', path: 'a' },
    { decision: 'Approval Required', scope: 'module', actionAxis: 'action', ownershipAxis: 'exact', path: 'b' },
  ];
  assert.equal(resolveRule(rules).decision, 'Approval Required');
});

test('risk tier is independent of scope', () => {
  const narrow = { actionAxis: 'action', ownershipAxis: 'exact' };
  const broad = { actionAxis: 'category', ownershipAxis: 'wildcard' };
  assert.equal(tierOf(narrow), 3);
  assert.equal(tierOf(broad), 1);
});

// ---------------------------------------------------------------------------------------------
// Missing policy
// ---------------------------------------------------------------------------------------------

test('no rule found never yields Allowed for a mutating action', () => {
  const bare = {
    policyId: 'bare', policyVersion: 1, environment: 'Staging', defaults: {},
  };
  assert.equal(evaluate({ policy: bare, action: 'DELETE', ownership: 'Shared' }).decision, 'Forbidden');
  assert.equal(evaluate({ policy: bare, action: 'PAYMENT', ownership: 'Shared' }).decision, 'Forbidden');
  assert.equal(evaluate({ policy: bare, action: 'TICKET', ownership: 'Shared' }).decision, 'Forbidden');
  assert.equal(evaluate({ policy: bare, action: 'UPDATE', ownership: 'Unknown' }).decision, 'Forbidden');
});

test('no rule found escalates a read rather than assuming it is safe', () => {
  const bare = { policyId: 'bare', policyVersion: 1, environment: 'Staging', defaults: {} };
  const r = evaluate({ policy: bare, action: 'READ', ownership: 'Shared' });
  assert.equal(r.decision, 'Approval Required');
  assert.match(r.reason, /escalated, not assumed safe/);
});

test('the catch-all default catches everything the policy did not name', () => {
  const r = evaluate({ policy: basePolicy(), action: 'SEND_NOTIFICATION', ownership: 'Shared' });
  assert.equal(r.decision, 'Forbidden');
  assert.equal(r.matchedRule, 'defaults.*');
});

// ---------------------------------------------------------------------------------------------
// Run-scoped authorization
// ---------------------------------------------------------------------------------------------

const AUTH = {
  authorizationId: 'AUTH-AGENCY-UPDATE-Shared',
  runId: 'run-042',
  environment: 'Staging',
  module: 'agency',
  action: 'UPDATE',
  ownership: 'Shared',
  approvedAt: '2026-08-07T10:00:00Z',
  approvedBy: 'reviewer',
};

test('a matching run authorization satisfies Approval Required', () => {
  const r = evaluate({
    policy: basePolicy(), action: 'UPDATE', ownership: 'Shared', module: 'agency',
    runId: 'run-042', authorizations: [AUTH],
  });
  assert.equal(r.decision, 'Allowed');
  assert.equal(r.satisfiedBy.authorizationId, 'AUTH-AGENCY-UPDATE-Shared');
});

test('an authorization NEVER lifts Forbidden, and says why it did nothing', () => {
  const r = evaluate({
    policy: basePolicy(), action: 'DELETE', ownership: 'Shared', module: 'agency',
    runId: 'run-042',
    authorizations: [{ ...AUTH, authorizationId: 'AUTH-DELETE', action: 'DELETE' }],
  });
  assert.equal(r.decision, 'Forbidden');
  assert.equal(r.satisfiedBy, null);
  assert.match(r.warnings.join('\n'), /no run-scoped approval lifts a prohibition/);
});

test('an authorization does not leak to another run', () => {
  const r = evaluate({
    policy: basePolicy(), action: 'UPDATE', ownership: 'Shared', module: 'agency',
    runId: 'run-043', authorizations: [AUTH],
  });
  assert.equal(r.decision, 'Approval Required');
  assert.equal(r.satisfiedBy, null);
});

test('an authorization does not leak across module, action, ownership, or environment', () => {
  const base = {
    policy: basePolicy(), runId: 'run-042', authorizations: [AUTH],
  };
  const cases = [
    { action: 'UPDATE', ownership: 'Shared', module: 'branch' },
    { action: 'CREATE', ownership: 'Shared', module: 'agency' },
    { action: 'UPDATE', ownership: 'Unknown', module: 'agency' },
  ];
  for (const c of cases) {
    const r = evaluate({ ...base, ...c });
    assert.equal(r.satisfiedBy, null, JSON.stringify(c));
    assert.equal(r.decision, 'Approval Required', JSON.stringify(c));
  }
  // A different environment is refused outright before authorization is even consulted.
  const other = evaluate({ ...base, action: 'UPDATE', ownership: 'Shared', module: 'agency', environment: 'QA' });
  assert.equal(other.decision, 'Forbidden');
  assert.equal(other.satisfiedBy, null);
});

test('an authorization with no runId on the request applies to nothing', () => {
  const r = evaluate({
    policy: basePolicy(), action: 'UPDATE', ownership: 'Shared', module: 'agency', authorizations: [AUTH],
  });
  assert.equal(r.decision, 'Approval Required');
});

test('a revoked authorization matches nothing', () => {
  const r = evaluate({
    policy: basePolicy(), action: 'UPDATE', ownership: 'Shared', module: 'agency',
    runId: 'run-042', authorizations: [{ ...AUTH, revoked: true }],
  });
  assert.equal(r.decision, 'Approval Required');
  assert.equal(findAuthorization([{ ...AUTH, revoked: true }], {
    runId: 'run-042', environment: 'Staging', module: 'agency', action: 'UPDATE', ownership: 'Shared',
  }), null);
});

// ---------------------------------------------------------------------------------------------
// Determinism, explainability, cleanup
// ---------------------------------------------------------------------------------------------

test('the same input and the same policy always return the same decision', () => {
  const req = {
    policy: basePolicy(), action: 'UPDATE', ownership: 'Shared', module: 'agency', runId: 'run-042',
  };
  const first = evaluate(req);
  for (let i = 0; i < 25; i += 1) {
    const again = evaluate(req);
    assert.deepEqual(again, first);
  }
});

test('every decision is explainable — decision, rule, reason, scope, never a bare boolean', () => {
  const r = evaluate({ policy: basePolicy(), action: 'PAYMENT', ownership: 'Shared' });
  assert.equal(typeof r.decision, 'string');
  assert.ok(r.matchedRule && r.reason);
  assert.deepEqual(Object.keys(r.scope).sort(), ['action', 'entity', 'environment', 'module', 'ownership']);
  const text = explain(r);
  for (const heading of ['Decision:', 'Matched Rule:', 'Reason:', 'Scope:']) {
    assert.ok(text.includes(heading), `explain() is missing ${heading}`);
  }
});

test('cleanupRequired is carried through from the matched rule', () => {
  assert.equal(evaluate({ policy: basePolicy(), action: 'UPDATE', ownership: 'Shared' }).cleanupRequired, true);
  assert.equal(evaluate({ policy: basePolicy(), action: 'UPDATE', ownership: 'SelfCreated' }).cleanupRequired, false);
});

test('the target record is recorded but never influences the decision', () => {
  const withTarget = evaluate({ policy: basePolicy(), action: 'UPDATE', ownership: 'Shared', targetId: 'AGN2' });
  const without = evaluate({ policy: basePolicy(), action: 'UPDATE', ownership: 'Shared' });
  assert.equal(withTarget.targetId, 'AGN2');
  assert.equal(withTarget.decision, without.decision);
  assert.equal(withTarget.matchedRule, without.matchedRule);
});

test('evaluate refuses to run without a policy rather than defaulting to one', () => {
  assert.throws(() => evaluate({ action: 'READ' }), PolicyError);
});

// ---------------------------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------------------------

test('a decision outside the canonical three is rejected', () => {
  for (const bad of ['maybe', 'sometimes', 'safe', 'yes', 'no', 'allowed']) {
    const policy = basePolicy();
    policy.categories.mutation.Shared = bad;
    const { valid, problems } = validatePolicy(policy);
    assert.equal(valid, false, `"${bad}" should be rejected`);
    assert.match(problems.join('\n'), /is not a decision/);
  }
});

test('an unknown action, ownership, environment, or top-level key is rejected', () => {
  const checks = [
    [{ actions: { FLY: { '*': 'Allowed' } } }, /is not an action/],
    [{ categories: { read: { Somebodys: 'Allowed' } } }, /is not an ownership class/],
    [{ environment: 'Sandbox' }, /is not an environment/],
    [{ enviroment: 'Staging' }, /Unsupported top-level key/],
  ];
  for (const [patch, re] of checks) {
    const { valid, problems } = validatePolicy({ ...basePolicy(), ...patch });
    assert.equal(valid, false, JSON.stringify(patch));
    assert.match(problems.join('\n'), re);
  }
});

test('a policy without a catch-all default is rejected', () => {
  const policy = basePolicy();
  delete policy.defaults['*'];
  const { valid, problems } = validatePolicy(policy);
  assert.equal(valid, false);
  assert.match(problems.join('\n'), /the catch-all every unmatched operation lands on/);
});

test('only a Forbidden rule may be absolute', () => {
  const policy = basePolicy();
  policy.categories.mutation.Shared = { decision: 'Allowed', absolute: true };
  const { valid, problems } = validatePolicy(policy);
  assert.equal(valid, false);
  assert.match(problems.join('\n'), /only a Forbidden rule may be absolute/);
});

test('a policy cannot claim Unknown as its own environment', () => {
  const { valid, problems } = validatePolicy({ ...basePolicy(), environment: 'Unknown' });
  assert.equal(valid, false);
  assert.match(problems.join('\n'), /cannot be a policy's own environment/);
});

test('entities do not nest', () => {
  const policy = basePolicy({
    modules: { agency: { entities: { A: { entities: { B: {} } } } } },
  });
  const { valid, problems } = validatePolicy(policy);
  assert.equal(valid, false);
  assert.match(problems.join('\n'), /entities do not nest/);
});

test('a malformed policy throws with every problem listed, not just the first', () => {
  const policy = basePolicy({ environment: 'Sandbox' });
  policy.categories.mutation.Shared = 'maybe';
  try {
    assertValidPolicy(policy);
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof PolicyError);
    assert.ok(err.problems.length >= 2, 'expected more than one problem');
  }
});
