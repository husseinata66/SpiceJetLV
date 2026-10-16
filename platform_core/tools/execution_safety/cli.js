#!/usr/bin/env node
// Execution Safety CLI — a strictly read-only way to ask the policy a question.
//
// NOTHING HERE EXECUTES ANYTHING. Every subcommand loads a policy, evaluates, and prints. No
// browser, no application, no mutation, no write — except `preflight --out`, which writes the run's
// own preflight record and nothing else.
//
// Usage:
//   node platform_core/tools/execution_safety/cli.js evaluate \
//        --action UPDATE --ownership Shared --module <slug> [--environment <env>] [--run <folder>]
//
//   node .../cli.js validate                        # schema-check the project policy
//   node .../cli.js summary                         # the standing decisions, at a glance
//   node .../cli.js preflight --operations ops.json --environment <env> [--run <folder>] [--out]
//
// Common flags:
//   --file <path>     a policy other than the project's own (fixtures, review)
//   --run <folder>    a run folder, so that run's scoped authorizations are consulted
//   --json            machine-readable output
//
// Exit codes:  0 = Allowed / valid   ·   1 = error   ·   2 = Approval Required   ·   3 = Forbidden
// The distinct non-zero codes let a caller branch on the decision without parsing prose.

'use strict';

const fs = require('fs');

const { evaluate, explain } = require('./evaluator');
const { loadPolicy, validatePolicyFile, loadAuthorizations, preflightPath } = require('./policyLoader');
const { preflight, renderPreflight, renderPreflightDoc } = require('./preflight');
const { ACTIONS, OWNERSHIPS, PolicyError } = require('./schema');

const EXIT = { ok: 0, error: 1, approval: 2, forbidden: 3 };

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

const USAGE = `Execution Safety — read-only policy evaluation.

  evaluate   --action <ACTION> [--ownership <CLASS>] [--module <slug>] [--entity <name>]
             [--environment <env>] [--run <run-folder>] [--target <id>] [--json]
  validate   [--file <policy.json>] [--json]
  summary    [--module <slug>] [--json]
  preflight  --operations <ops.json> --environment <env> [--run <run-folder>] [--out] [--json]

Actions:    ${ACTIONS.join(', ')}
Ownership:  ${OWNERSHIPS.join(', ')}

Exit codes: 0 Allowed/valid · 1 error · 2 Approval Required · 3 Forbidden
`;

function authorizationsFor(args) {
  if (!args.run) return [];
  try {
    return loadAuthorizations({ runFolder: args.run }).authorizations;
  } catch (err) {
    console.error(`! ${err.message}`);
    return [];
  }
}

function cmdEvaluate(args) {
  if (!args.action || args.action === true) {
    console.error('evaluate requires --action. See --help.');
    return EXIT.error;
  }
  const { policy, policyHash } = loadPolicy({ file: typeof args.file === 'string' ? args.file : undefined });
  const result = evaluate({
    policy,
    action: args.action,
    ownership: args.ownership,
    module: typeof args.module === 'string' ? args.module : undefined,
    entity: typeof args.entity === 'string' ? args.entity : undefined,
    environment: typeof args.environment === 'string' ? args.environment : undefined,
    runId: typeof args.run === 'string' ? args.run : undefined,
    targetId: typeof args.target === 'string' ? args.target : undefined,
    authorizations: authorizationsFor(args),
  });

  if (args.json) {
    console.log(JSON.stringify({ ...result, policyHash }, null, 2));
  } else {
    console.log(explain(result));
    console.log('\nNo operation was executed.');
  }
  if (result.decision === 'Forbidden') return EXIT.forbidden;
  if (result.decision === 'Approval Required') return EXIT.approval;
  return EXIT.ok;
}

function cmdValidate(args) {
  const report = validatePolicyFile({ file: typeof args.file === 'string' ? args.file : undefined });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return report.ok ? EXIT.ok : EXIT.error;
  }
  console.log(`Policy:  ${report.path}`);
  if (!report.exists) {
    console.log('Status:  MISSING');
    console.log('\nNo policy means nothing is authorized. Nothing is assumed in its place.');
    return EXIT.error;
  }
  if (!report.ok) {
    console.log('Status:  INVALID\n');
    for (const p of report.problems) console.log(`  - ${p}`);
    console.log('\nA malformed policy is never partially applied.');
    return EXIT.error;
  }
  console.log('Status:  Valid');
  console.log(`Id:      ${report.policy.policyId} v${report.policy.policyVersion}`);
  console.log(`Env:     ${report.policy.environment}`);
  console.log(`Hash:    ${report.policyHash}`);
  return EXIT.ok;
}

/** The standing decisions a reviewer most often wants to confirm, in one glance. */
const SUMMARY_PROBES = [
  ['READ', 'Shared'], ['READ', 'Unknown'],
  ['CREATE', 'SelfCreated'], ['UPDATE', 'SelfCreated'], ['DELETE', 'SelfCreated'],
  ['UPDATE', 'Shared'], ['UPDATE', 'Unknown'],
  ['DELETE', 'Shared'], ['DELETE', 'Unknown'],
  ['APPROVE', 'SelfCreated'], ['APPROVE', 'Shared'], ['REJECT', 'Shared'],
  ['PAYMENT', 'Shared'], ['TOP_UP', 'Shared'], ['REFUND', 'Shared'],
  ['BOOK', 'Shared'], ['TICKET', 'Shared'], ['VOID', 'Shared'],
  ['CREDENTIAL_CHANGE', 'Shared'], ['ROLE_PERMISSION_CHANGE', 'Shared'],
];

function cmdSummary(args) {
  const { policy, policyHash, policyPath: file } = loadPolicy({ file: typeof args.file === 'string' ? args.file : undefined });
  const mod = typeof args.module === 'string' ? args.module : undefined;
  const rows = SUMMARY_PROBES.map(([action, ownership]) => {
    // The summary describes the policy's OWN rules, so it names the policy's environment explicitly.
    const r = evaluate({ policy, action, ownership, module: mod, environment: policy.environment, authorizations: authorizationsFor(args) });
    return {
      action, ownership, decision: r.decision, absolute: r.absolute, matchedRule: r.matchedRule,
    };
  });
  if (args.json) {
    console.log(JSON.stringify({ policyId: policy.policyId, policyVersion: policy.policyVersion, policyHash, module: mod || null, rows }, null, 2));
    return EXIT.ok;
  }
  console.log('Execution Safety');
  console.log('────────────────');
  console.log('');
  console.log(`Environment:  ${policy.environment}`);
  console.log(`Policy:       ${policy.policyId} v${policy.policyVersion}`);
  console.log(`Hash:         ${policyHash}`);
  console.log(`Source:       ${file}`);
  console.log(`Scope:        ${mod ? `module ${mod}` : 'platform-wide defaults (pass --module for overrides)'}`);
  console.log('');
  const width = Math.max(...rows.map((r) => `${r.action} ${r.ownership}`.length));
  for (const r of rows) {
    console.log(`  ${`${r.action} ${r.ownership}`.padEnd(width)}  ${r.decision}${r.absolute ? '  (absolute)' : ''}`);
  }
  const auths = authorizationsFor(args);
  console.log('');
  console.log(`Run overrides: ${auths.length ? auths.map((a) => a.authorizationId).join(', ') : 'None'}`);
  return EXIT.ok;
}

function cmdPreflight(args) {
  if (!args.operations || args.operations === true) {
    console.error('preflight requires --operations <file.json>: a JSON array of '
      + '{action, ownership, module?, entity?, testCaseId?}.');
    return EXIT.error;
  }
  const { policy, policyHash } = loadPolicy({ file: typeof args.file === 'string' ? args.file : undefined });
  let operations;
  try {
    const raw = JSON.parse(fs.readFileSync(args.operations, 'utf8'));
    operations = Array.isArray(raw) ? raw : raw.operations;
  } catch (err) {
    console.error(`Could not read --operations: ${err.message}`);
    return EXIT.error;
  }
  const runId = typeof args.run === 'string' ? args.run : undefined;
  // The environment is named, never defaulted (Phase 9.3, F-22): without it every operation is evaluated as Unknown.
  const result = preflight({ policy, operations, runId, environment: typeof args.environment === 'string' ? args.environment : undefined, authorizations: authorizationsFor(args) });

  if (args.json) console.log(JSON.stringify({ ...result, policyHash }, null, 2));
  else console.log(renderPreflight(result, { policyHash }));

  if (args.out && runId) {
    const out = preflightPath(undefined, runId);
    fs.mkdirSync(require('path').dirname(out), { recursive: true });
    fs.writeFileSync(out, renderPreflightDoc(result, { policyHash }), 'utf8');
    if (!args.json) console.log(`Written: ${out}`);
  }

  if (result.blocked.length) return EXIT.forbidden;
  if (result.pendingApprovals.length) return EXIT.approval;
  return EXIT.ok;
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (args.help || args.h || !command) { console.log(USAGE); return command ? EXIT.ok : EXIT.error; }
  try {
    switch (command) {
      case 'evaluate': return cmdEvaluate(args);
      case 'validate': return cmdValidate(args);
      case 'summary': return cmdSummary(args);
      case 'preflight': return cmdPreflight(args);
      default:
        console.error(`Unknown command "${command}".\n`);
        console.log(USAGE);
        return EXIT.error;
    }
  } catch (err) {
    if (err instanceof PolicyError) { console.error(`\n${err.message}\n`); return EXIT.error; }
    throw err;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, parseArgs, EXIT, SUMMARY_PROBES };
