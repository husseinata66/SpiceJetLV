// Execution Safety — authorization persistence.
//
// The claim under test is structural, not procedural: an authorization granted in one run must be
// incapable of authorizing another, even when the two runs want the identical thing on the identical
// environment. Two independent mechanisms enforce that, and both are asserted here:
//
//   1. The store lives INSIDE the run folder, so run B never reads run A's file.
//   2. Every record carries its own `runId`, re-checked on load and again in the evaluator, so a
//      copied file authorizes nothing either.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createAuthorization, saveAuthorizations, renderAuthorizationsDoc } = require('../authorizations');
const { loadAuthorizations, authorizationsPath, hashPolicy, stableStringify } = require('../policyLoader');
const { evaluate: evaluateAny } = require('../evaluator');
// F-22 (Phase 9.3): the evaluator never defaults the environment. These tests exercise rule resolution,
// so every request names the environment its policy governs — explicitly, here.
const evaluate = (req) => evaluateAny({ environment: req && req.policy ? req.policy.environment : undefined, ...req });

const POLICY = {
  policyId: 'test-policy',
  policyVersion: 1,
  environment: 'Staging',
  defaults: { '*': 'Forbidden' },
  categories: { mutation: { Shared: 'Approval Required' } },
};

function tmpDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'exec-safety-'));
}

function auth(runId, over = {}) {
  return createAuthorization({
    runId,
    environment: 'Staging',
    module: 'agency',
    action: 'UPDATE',
    ownership: 'Shared',
    approvedAt: '2026-08-07T10:00:00Z',
    approvedBy: 'reviewer',
    policyId: POLICY.policyId,
    policyVersion: POLICY.policyVersion,
    policyHash: hashPolicy(POLICY),
    ...over,
  });
}

test('an authorization round-trips through the run folder', () => {
  const dataRoot = tmpDataRoot();
  const runFolder = 'run-042__2026-08-07__UserStory__X';
  saveAuthorizations({ dataRoot, runFolder, authorizations: [auth(runFolder)] });

  const loaded = loadAuthorizations({ dataRoot, runFolder });
  assert.equal(loaded.exists, true);
  assert.equal(loaded.authorizations.length, 1);
  assert.equal(loaded.authorizations[0].action, 'UPDATE');
  assert.equal(loaded.authorizations[0].decision, 'Allowed');
});

test('a run with no store is granted nothing, and that is not an error', () => {
  const dataRoot = tmpDataRoot();
  const loaded = loadAuthorizations({ dataRoot, runFolder: 'run-099' });
  assert.equal(loaded.exists, false);
  assert.deepEqual(loaded.authorizations, []);
});

test('run B cannot read run A\'s authorizations — the store is inside the run folder', () => {
  const dataRoot = tmpDataRoot();
  saveAuthorizations({ dataRoot, runFolder: 'run-A', authorizations: [auth('run-A')] });

  assert.equal(loadAuthorizations({ dataRoot, runFolder: 'run-A' }).authorizations.length, 1);
  assert.equal(loadAuthorizations({ dataRoot, runFolder: 'run-B' }).authorizations.length, 0);
  assert.notEqual(authorizationsPath(dataRoot, 'run-A'), authorizationsPath(dataRoot, 'run-B'));
});

test('a copied authorization file authorizes nothing — the runId is re-checked on load', () => {
  const dataRoot = tmpDataRoot();
  saveAuthorizations({ dataRoot, runFolder: 'run-A', authorizations: [auth('run-A')] });
  // Somebody copies run A's store into run B's folder, verbatim.
  const src = authorizationsPath(dataRoot, 'run-A');
  const dst = authorizationsPath(dataRoot, 'run-B');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);

  const loaded = loadAuthorizations({ dataRoot, runFolder: 'run-B' });
  assert.equal(loaded.authorizations.length, 0, 'a foreign record must not be honoured');
  assert.equal(loaded.foreign.length, 1, 'and it must be reported, not silently dropped');
});

test('even if a foreign record reaches the evaluator, the runId check refuses it', () => {
  const r = evaluate({
    policy: POLICY, action: 'UPDATE', ownership: 'Shared', module: 'agency',
    runId: 'run-B', authorizations: [auth('run-A')],
  });
  assert.equal(r.decision, 'Approval Required');
  assert.equal(r.satisfiedBy, null);
});

test('saving appends rather than replacing, so an earlier approval is never lost', () => {
  const dataRoot = tmpDataRoot();
  const runFolder = 'run-042';
  saveAuthorizations({ dataRoot, runFolder, authorizations: [auth(runFolder)] });
  saveAuthorizations({
    dataRoot,
    runFolder,
    authorizations: [auth(runFolder, { action: 'CREATE', authorizationId: 'AUTH-AGENCY-CREATE-Shared' })],
  });
  const loaded = loadAuthorizations({ dataRoot, runFolder });
  assert.equal(loaded.authorizations.length, 2);
  assert.deepEqual(
    loaded.authorizations.map((a) => a.action).sort(),
    ['CREATE', 'UPDATE'],
  );
});

test('a run approval never becomes project policy — it is written only into the run folder', () => {
  const dataRoot = tmpDataRoot();
  saveAuthorizations({ dataRoot, runFolder: 'run-042', authorizations: [auth('run-042')] });
  const written = fs.readdirSync(dataRoot);
  assert.deepEqual(written, ['runs'], 'nothing outside runs/ may be touched by an approval');
  assert.equal(fs.existsSync(path.join(dataRoot, 'knowledge_base')), false);
});

test('the Markdown companion states the limits a reviewer needs to see', () => {
  const doc = renderAuthorizationsDoc({
    runFolder: 'run-042', authorizations: [auth('run-042')], now: new Date('2026-08-07T12:00:00Z'),
  });
  assert.match(doc, /# Safety Authorizations — run-042/);
  assert.match(doc, /None of these carries forward/);
  assert.match(doc, /no run-scoped approval can/);
  assert.match(doc, /No credential, token, session identifier, or card value appears in this file/);
});

test('an empty authorization set renders as an explicit "none", never as an empty table', () => {
  const doc = renderAuthorizationsDoc({ runFolder: 'run-042', authorizations: [], now: new Date() });
  assert.match(doc, /Nothing beyond the standing project policy has been authorized for this run/);
});

test('no secret value reaches the persisted store', () => {
  const dataRoot = tmpDataRoot();
  const runFolder = 'run-042';
  saveAuthorizations({
    dataRoot,
    runFolder,
    authorizations: [auth(runFolder, {
      note: 'approved verbally by the module owner',
      // A caller tries to attach credential material. None of these keys is in
      // AUTHORIZATION_FIELDS, so none of them survives createAuthorization().
      password: 'hunter2', token: 'tok_live_9911', apiKey: 'AKIA-XYZ', sessionId: 'JSESSIONID=99',
      cardNumber: '4111111111111111',
    })],
  });
  const json = fs.readFileSync(authorizationsPath(dataRoot, runFolder), 'utf8');
  const md = fs.readFileSync(path.join(path.dirname(authorizationsPath(dataRoot, runFolder)), 'SafetyAuthorizations.md'), 'utf8');
  // Assert on the VALUES, not on the words: the Markdown companion deliberately contains the
  // sentence "never a secret", and a test that failed on that would be testing its own prose.
  for (const value of ['hunter2', 'tok_live_9911', 'AKIA-XYZ', 'JSESSIONID=99', '4111111111111111']) {
    assert.ok(!json.includes(value), `store leaks ${value}`);
    assert.ok(!md.includes(value), `doc leaks ${value}`);
  }
  // And the field keys themselves never appear as data keys either.
  for (const key of ['"password"', '"token"', '"apiKey"', '"sessionId"', '"cardNumber"']) {
    assert.ok(!json.includes(key), `store carries a ${key} field`);
  }
});

// ---------------------------------------------------------------------------------------------
// Policy identity
// ---------------------------------------------------------------------------------------------

test('the policy hash is stable across key order and whitespace, and changes with a decision', () => {
  const a = { b: 1, a: { d: 2, c: 3 } };
  const b = { a: { c: 3, d: 2 }, b: 1 };
  assert.equal(stableStringify(a), stableStringify(b));
  assert.equal(hashPolicy(a), hashPolicy(b));

  const relaxed = { ...POLICY, categories: { mutation: { Shared: 'Allowed' } } };
  assert.notEqual(hashPolicy(POLICY), hashPolicy(relaxed));
});
