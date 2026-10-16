// Execution Safety — CLI contract.
//
// The exit codes are the contract that matters: a caller must be able to branch on the decision
// without parsing prose, and a script that treats "non-zero" as "something broke" must not mistake
// `Approval Required` for a crash.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLI = path.join(__dirname, '..', 'cli.js');
const { EXIT } = require('../cli');

const FIXTURE = {
  policyId: 'cli-fixture',
  policyVersion: 1,
  environment: 'Staging',
  environmentAliases: ['STG'],
  defaults: { '*': 'Forbidden' },
  categories: {
    read: { '*': 'Allowed' },
    mutation: { Shared: { decision: 'Approval Required', cleanupRequired: true } },
    financial: { '*': { decision: 'Forbidden', absolute: true } },
  },
};

function tmpFile(name, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-safety-cli-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2));
  return file;
}

/** Runs the CLI and returns {code, out} — never throws on a non-zero exit. */
function run(args) {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (err) {
    return { code: err.status, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

const POLICY_FILE = tmpFile('policy.json', FIXTURE);

test('exit code 0 means Allowed', () => {
  const r = run(['evaluate', '--action', 'READ', '--ownership', 'Shared', '--environment', 'Staging', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.ok);
  assert.match(r.out, /Decision: Allowed/);
});

test('exit code 2 means Approval Required, not a failure', () => {
  const r = run(['evaluate', '--action', 'UPDATE', '--ownership', 'Shared', '--environment', 'Staging', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.approval);
  assert.match(r.out, /Decision: Approval Required/);
});

test('exit code 3 means Forbidden', () => {
  const r = run(['evaluate', '--action', 'PAYMENT', '--ownership', 'Shared', '--environment', 'Staging', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.forbidden);
  assert.match(r.out, /Decision: Forbidden/);
});

test('every evaluation states that nothing was executed', () => {
  for (const action of ['READ', 'UPDATE', 'DELETE', 'PAYMENT']) {
    const r = run(['evaluate', '--action', action, '--ownership', 'Shared', '--environment', 'Staging', '--file', POLICY_FILE]);
    assert.match(r.out, /No operation was executed\./, action);
  }
});

test('--json emits a parseable explanation with every axis', () => {
  const r = run(['evaluate', '--action', 'UPDATE', '--ownership', 'Shared', '--module', 'agency',
    '--target', 'AGN2', '--environment', 'Staging', '--file', POLICY_FILE, '--json']);
  const parsed = JSON.parse(r.out);
  assert.equal(parsed.decision, 'Approval Required');
  assert.equal(parsed.matchedRule, 'policy.categories.mutation.Shared');
  assert.equal(parsed.targetId, 'AGN2');
  assert.equal(parsed.cleanupRequired, true);
  assert.ok(parsed.reason && parsed.scope && parsed.policyHash);
});

test('an environment alias is accepted', () => {
  const r = run(['evaluate', '--action', 'READ', '--environment', 'STG', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.ok);
});

test('evaluate without --action refuses rather than guessing one', () => {
  const r = run(['evaluate', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.error);
  assert.match(r.out, /requires --action/);
});

test('validate reports a valid policy with its identity and hash', () => {
  const r = run(['validate', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.ok);
  assert.match(r.out, /Status:  Valid/);
  assert.match(r.out, /Hash:    sha256:/);
});

test('validate lists every problem in a malformed policy and exits non-zero', () => {
  const bad = tmpFile('bad.json', { ...FIXTURE, environment: 'Sandbox', defaults: { '*': 'maybe' } });
  const r = run(['validate', '--file', bad]);
  assert.equal(r.code, EXIT.error);
  assert.match(r.out, /Status:  INVALID/);
  assert.match(r.out, /is not an environment/);
  assert.match(r.out, /is not a decision/);
  assert.match(r.out, /never partially applied/);
});

test('validate reports a missing policy as missing, and says what that means', () => {
  const r = run(['validate', '--file', path.join(os.tmpdir(), 'definitely-not-here.json')]);
  assert.equal(r.code, EXIT.error);
  assert.match(r.out, /Status:  MISSING/);
  assert.match(r.out, /Nothing is assumed in its place/);
});

test('summary prints the standing decisions without evaluating anything live', () => {
  const r = run(['summary', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.ok);
  assert.match(r.out, /Execution Safety/);
  assert.match(r.out, /READ Shared\s+Allowed/);
  assert.match(r.out, /PAYMENT Shared\s+Forbidden\s+\(absolute\)/);
  assert.match(r.out, /Run overrides: None/);
});

test('preflight groups a plan and exits on the strictest decision present', () => {
  const ops = tmpFile('ops.json', [
    { action: 'READ', ownership: 'Shared', testCaseId: 'TC-1' },
    { action: 'READ', ownership: 'Shared', testCaseId: 'TC-2' },
    { action: 'UPDATE', ownership: 'Shared', testCaseId: 'TC-3' },
  ]);
  const r = run(['preflight', '--operations', ops, '--environment', 'Staging', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.approval);
  assert.match(r.out, /2 occurrences/);
  assert.match(r.out, /1 authorization question to answer before execution/);
  assert.match(r.out, /This preflight is read-only/);

  const ops2 = tmpFile('ops2.json', [{ action: 'PAYMENT', ownership: 'Shared' }]);
  assert.equal(run(['preflight', '--operations', ops2, '--environment', 'Staging', '--file', POLICY_FILE]).code, EXIT.forbidden);
});

test('preflight without --operations refuses rather than assuming an empty plan', () => {
  const r = run(['preflight', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.error);
  assert.match(r.out, /requires --operations/);
});

test('an unknown command prints usage rather than doing something', () => {
  const r = run(['detonate']);
  assert.equal(r.code, EXIT.error);
  assert.match(r.out, /Unknown command "detonate"/);
});

test('--help lists the vocabulary a caller needs', () => {
  const r = run(['--help']);
  assert.match(r.out, /Actions:/);
  assert.match(r.out, /Ownership:/);
  assert.match(r.out, /Exit codes: 0 Allowed\/valid/);
});

test('F-22: evaluate and preflight with no --environment are refused as Unknown — never the policy\'s Staging', () => {
  const r = run(['evaluate', '--action', 'READ', '--ownership', 'Shared', '--file', POLICY_FILE]);
  assert.equal(r.code, EXIT.forbidden);
  assert.match(r.out, /Unknown/);
  const ops = tmpFile('ops-noenv.json', [{ action: 'READ', ownership: 'Shared' }]);
  assert.equal(run(['preflight', '--operations', ops, '--file', POLICY_FILE]).code, EXIT.forbidden);
  assert.equal(run(['preflight', '--operations', ops, '--environment', 'Staging', '--file', POLICY_FILE]).code, EXIT.ok);
});
