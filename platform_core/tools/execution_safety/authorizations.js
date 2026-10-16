// Execution Safety — run-scoped human authorizations.
//
// WHAT AN AUTHORIZATION IS
//   One human's answer to one narrowly-scoped question, valid for ONE run:
//
//       "Allow UPDATE of Shared Agency records on Staging, for run-042, this run only?"
//
//   It is class-scoped per (environment, module, action, ownership) — HD-SAFETY-003 — so twelve test
//   cases sharing that scope cost one question, not twelve. Every executed action still records the
//   exact record it touched, so the approval is class-wide while the audit trail stays per-record.
//
// WHAT AN AUTHORIZATION IS NOT
//   - It is not project policy. A run approval NEVER becomes a standing permission (§29, §45).
//   - It cannot lift `Forbidden`. Nothing here can; the evaluator refuses it and says so.
//   - It does not carry to another run, environment, module, action, or ownership class. Adjacency
//     is not inclusion: approving UPDATE says nothing about DELETE, and approving Agency says
//     nothing about Branch.
//   - It never contains a secret. Approvals name a role or an operator identity, never a
//     credential, token, session, or card value (§50).
//
// This module writes the record; it never decides. The question is asked by the Skill, and the
// answer comes from a human.

'use strict';

const fs = require('fs');
const path = require('path');
const { assertApproverName } = require('../run_manager/approverIdentity');

const { normalizeAction, normalizeOwnership, normalizeEnvironment, PolicyError } = require('./schema');
const { AUTHORIZATIONS_FILENAME, AUTHORIZATIONS_DOC_FILENAME, authorizationsPath } = require('./policyLoader');

/** Fields a stored authorization carries. Deliberately short — everything here is auditable. */
const AUTHORIZATION_FIELDS = [
  'authorizationId', 'runId', 'environment', 'module', 'action', 'ownership',
  'targetScope', 'decision', 'approvedAt', 'approvedBy', 'policyId', 'policyVersion',
  'policyHash', 'cleanupRequired', 'note', 'revoked',
];

/**
 * Builds an authorization record from an answered approval question.
 *
 * `approvedAt` and `approvedBy` are REQUIRED and are never invented — an approval with no time and
 * no approver is an assertion that someone agreed, with nothing behind it.
 *
 * @param {object} input
 * @returns {object} the record, ready to persist
 */
function createAuthorization(input) {
  const required = ['runId', 'action', 'approvedAt', 'approvedBy'];
  if (input && input.approvedBy && String(input.approvedBy).trim()) assertApproverName(input.approvedBy, 'Execution Safety authorization');
  const missing = required.filter((k) => !input || !input[k]);
  if (missing.length) {
    throw new PolicyError(`createAuthorization requires: ${missing.join(', ')}. `
      + 'An approval with no run, no action, no timestamp, or no approver records nothing auditable.');
  }
  const { action } = normalizeAction(input.action);
  const { ownership } = normalizeOwnership(input.ownership);
  const { environment } = normalizeEnvironment(input.environment, input.policy);

  const record = {
    authorizationId: input.authorizationId
      || `AUTH-${String(input.module || 'platform').toUpperCase()}-${action}-${ownership}`,
    runId: String(input.runId),
    environment,
    module: input.module || null,
    action,
    ownership,
    // The class the approval covers, stated in words for the audit trail. Per HD-SAFETY-003 the
    // approval is class-scoped; the per-record detail lives in execution evidence, not here.
    targetScope: input.targetScope || `all ${ownership} records in ${input.module || 'scope'} for this run`,
    decision: 'Allowed',
    approvedAt: input.approvedAt,
    approvedBy: input.approvedBy,
    policyId: input.policyId || null,
    policyVersion: input.policyVersion || null,
    policyHash: input.policyHash || null,
    cleanupRequired: input.cleanupRequired === true,
    note: input.note || null,
    revoked: false,
  };
  for (const key of Object.keys(record)) {
    if (!AUTHORIZATION_FIELDS.includes(key)) delete record[key];
  }
  return record;
}

/**
 * Renders the human approval question §28 specifies.
 *
 * The Skill may recommend; the human decides. The prompt states the affected-case count so the
 * reviewer sees the blast radius, and states the cleanup obligation when the rule carries one —
 * approving a mutation without knowing it must be reverted is not an informed approval.
 *
 * @param {{result: object, affectedCases?: number, recommendation?: string}} opts
 * @returns {string}
 */
function renderApprovalPrompt({ result, affectedCases, recommendation }) {
  const lines = [
    'Human Authorization Required',
    '',
    `Run:          ${result.runId || '(not set)'}`,
    `Environment:  ${result.scope.environment}`,
    `Module:       ${result.scope.module || '(platform-wide)'}`,
    `Action:       ${result.scope.action}`,
    `Ownership:    ${result.scope.ownership}`,
  ];
  if (affectedCases !== undefined) lines.push(`Affected Test Cases: ${affectedCases}`);
  lines.push(
    '',
    `Policy:       ${result.decision}`,
    `Matched rule: ${result.matchedRule}`,
    `Reason:       ${result.reason}`,
    '',
    'Proposed scope:',
    `  Allow ${result.scope.action} of ${result.scope.ownership} `
      + `${result.scope.module ? `${result.scope.module} ` : ''}records on ${result.scope.environment}, `
      + 'for this run only.',
    '  This authorization does not carry to another run, environment, module, action, or ownership class.',
  );
  if (result.cleanupRequired) {
    lines.push('', 'Cleanup:      Required — the original values must be captured before the change and restored after it.');
  }
  if (recommendation) lines.push('', `Recommendation: ${recommendation}`);
  lines.push('', 'Approve this scope?');
  return lines.join('\n');
}

/** Renders the human-readable companion to the JSON store. */
function renderAuthorizationsDoc({ runFolder, authorizations, now }) {
  const ts = (now instanceof Date ? now : new Date()).toISOString();
  const lines = [
    `# Safety Authorizations — ${runFolder}`,
    '',
    '> Run-scoped human authorizations granted for this run, and this run only. The machine-readable',
    `> source is \`${AUTHORIZATIONS_FILENAME}\` beside this file; this document exists so a reviewer can`,
    '> read what was approved without parsing JSON.',
    '>',
    '> **None of these carries forward.** A future run asks fresh. None of them lifts a `Forbidden`',
    '> policy rule — no run-scoped approval can.',
    '',
    `_Last updated: ${ts}_`,
    '',
  ];
  if (!authorizations.length) {
    lines.push('## Authorizations', '', 'None. Nothing beyond the standing project policy has been authorized for this run.', '');
    return lines.join('\n');
  }
  lines.push(
    '## Authorizations',
    '',
    '| ID | Action | Ownership | Module | Scope | Approved by | Approved at | Cleanup |',
    '|---|---|---|---|---|---|---|---|',
  );
  for (const a of authorizations) {
    lines.push(`| \`${a.authorizationId}\` | ${a.action} | ${a.ownership} | ${a.module || '—'} `
      + `| ${a.targetScope} | ${a.approvedBy} | ${a.approvedAt} | ${a.cleanupRequired ? 'Required' : '—'} |`);
  }
  lines.push('', '## Policy this run was authorized against', '');
  const first = authorizations[0];
  lines.push(
    '| Field | Value |',
    '|---|---|',
    `| Policy ID | \`${first.policyId || '—'}\` |`,
    `| Policy version | ${first.policyVersion || '—'} |`,
    `| Policy hash | \`${first.policyHash || '—'}\` |`,
    '',
    '<!-- No credential, token, session identifier, or card value appears in this file, by design',
    '     (execution safety §50). An approval names a role or an operator, never a secret. -->',
    '',
  );
  return lines.join('\n');
}

/**
 * Persists a run's authorizations, writing both the JSON store and its Markdown companion.
 *
 * Appends rather than replaces: an authorization already granted is never silently dropped by a
 * later write, because the audit trail of what was approved is the point.
 *
 * @returns {{path: string, docPath: string, authorizations: object[]}}
 */
function saveAuthorizations({ dataRoot, runFolder, authorizations, now, file }) {
  if (!runFolder && !file) throw new PolicyError('saveAuthorizations requires a runFolder (or an explicit file).');
  const target = file || authorizationsPath(dataRoot, runFolder);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  const existing = fs.existsSync(target)
    ? (JSON.parse(fs.readFileSync(target, 'utf8')).authorizations || [])
    : [];
  const byId = new Map(existing.map((a) => [a.authorizationId, a]));
  for (const a of authorizations) byId.set(a.authorizationId, a);
  const merged = [...byId.values()];

  fs.writeFileSync(target, `${JSON.stringify({ runId: runFolder, authorizations: merged }, null, 2)}\n`, 'utf8');

  const docPath = path.join(path.dirname(target), AUTHORIZATIONS_DOC_FILENAME);
  fs.writeFileSync(docPath, renderAuthorizationsDoc({ runFolder, authorizations: merged, now }), 'utf8');

  return { path: target, docPath, authorizations: merged };
}

module.exports = {
  AUTHORIZATION_FIELDS,
  createAuthorization,
  renderApprovalPrompt,
  renderAuthorizationsDoc,
  saveAuthorizations,
};
