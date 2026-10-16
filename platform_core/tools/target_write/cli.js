#!/usr/bin/env node
// Target Write — controlled writes into a Target or Reference Project (Phase 9.4). The only supported way
// for a Skill to change files in a project the platform does not own. See run_manager/targetWrites.js.
//
//   node .../cli.js register-root --kind target|reference --path <dir> --approved-by "<name>" --reason "..."
//   node .../cli.js roots [--json]
//   node .../cli.js plan     --run <folder> --root TP-n --changes <changes.json> --environment <env> [--by "<name>"]
//                            changes.json: [{"op":"create|update|delete","path":"<relative to the root>","source":"<file in the run folder>"}]
//   node .../cli.js approve  --run <folder> --plan TWP-n --approved-by "<name>" [--fingerprint <sha>]
//   node .../cli.js apply    --run <folder> --plan TWP-n [--by "<name>"]
//   node .../cli.js recover  --run <folder> --plan TWP-n --by "<name>" [--resolution keep-current|restore-approved]
//   node .../cli.js ledger   --run <folder> [--json]
// Every command takes [--runs-dir <dir>]. Exit codes: 0 ok · 1 refused or error.

'use strict';

const fs = require('fs');
const path = require('path');
const tw = require('../run_manager/targetWrites');

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) { a[k] = argv[i + 1]; i += 1; } else a[k] = true;
    } else a._.push(argv[i]);
  }
  return a;
}
const str = (a, k) => (typeof a[k] === 'string' ? a[k] : undefined);

function runsDirOf(a) {
  if (str(a, 'runs-dir')) return path.resolve(a['runs-dir']);
  // eslint-disable-next-line global-require
  const { resolveRoots } = require('../platform_paths/paths');
  return path.join(resolveRoots({ startDir: process.cwd(), fresh: true }).dataRoot, 'runs');
}
function needRun(a) {
  const run = str(a, 'run');
  if (!run || /[\\/]/.test(run) || run === '..' || run === '.') throw Object.assign(new Error('--run <run folder name> is required (a folder name, never a path).'), { code: 'INVALID_ARGUMENT' });
  return run;
}

function main(argv) {
  const a = parseArgs(argv);
  const cmd = a._[0];
  const runsDir = runsDirOf(a);
  const dataRoot = path.dirname(runsDir);
  const now = new Date();
  switch (cmd) {
    case 'register-root': {
      const r = tw.registerRoot(dataRoot, { kind: str(a, 'kind'), rootPath: str(a, 'path'), approvedBy: str(a, 'approved-by'), reason: str(a, 'reason'), now });
      console.log(`Registered ${r.id}: ${r.kind} ${r.path} (approved by ${r.approvedBy})`);
      return 0;
    }
    case 'roots': {
      const reg = tw.readRoots(dataRoot);
      if (a.json) console.log(JSON.stringify(reg, null, 2));
      else for (const r of reg.roots) console.log(`${r.id}  ${r.kind.padEnd(9)} ${r.path}  (by ${r.approvedBy})`);
      return 0;
    }
    case 'plan': {
      const file = str(a, 'changes');
      if (!file) throw Object.assign(new Error('--changes <changes.json> is required.'), { code: 'INVALID_ARGUMENT' });
      let changes;
      try { changes = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); } catch (err) { throw Object.assign(new Error(`--changes is not readable JSON (${err.message})`), { code: 'INVALID_ARGUMENT' }); }
      const p = tw.planTargetWrite(runsDir, needRun(a), { rootId: str(a, 'root'), changes, environment: str(a, 'environment'), by: str(a, 'by'), now });
      console.log(`Target Write Plan ${p.id} PLANNED — ${p.changes.length} file(s) under ${p.root.kind} ${p.root.id} (${p.root.path}); environment ${p.environment}; fingerprint ${p.fingerprint}`);
      for (const c of p.changes) console.log(`  ${c.op.padEnd(6)} ${c.path}${c.source ? `  ← ${c.source}` : ''}`);
      console.log(`Next: a named human reviews it and runs  approve --run ${p.run} --plan ${p.id} --approved-by "<name>" --fingerprint ${p.fingerprint}`);
      return 0;
    }
    case 'approve': {
      const p = tw.approveTargetWrite(runsDir, needRun(a), { planId: str(a, 'plan'), approvedBy: str(a, 'approved-by'), fingerprint: str(a, 'fingerprint'), now });
      console.log(`Plan ${p.id} approved by ${p.approval.by} (fingerprint ${p.fingerprint.slice(0, 12)})`);
      return 0;
    }
    case 'apply': {
      const r = tw.applyTargetWrite(runsDir, needRun(a), { planId: str(a, 'plan'), by: str(a, 'by'), now });
      console.log(`Plan ${r.plan} applied: ${r.applied.map((c) => `${c.op} ${c.path}`).join(', ')}`);
      return 0;
    }
    case 'recover': {
      const r = tw.recoverTargetWrite(runsDir, needRun(a), { planId: str(a, 'plan'), by: str(a, 'by'), resolution: str(a, 'resolution'), now });
      if (r.state === 'conflict') { console.error(`RECOVERY_CONFLICT: ${r.conflicts.map((c) => c.path).join(', ')} changed after the interruption — nothing was restored; their versions are kept as evidence. A named human chooses: recover ... --resolution keep-current | restore-approved`); return 1; }
      console.log(r.recovered ? `Interrupted apply recovered (${r.state}).` : `Nothing to recover (journal: ${r.state}).`);
      return 0;
    }
    case 'ledger': {
      const run = needRun(a);
      const meta = JSON.parse(fs.readFileSync(path.join(runsDir, run, 'metadata', 'run.json'), 'utf8'));
      if (a.json) console.log(JSON.stringify({ plans: meta.targetWritePlans || [], ledger: meta.targetWriteLedger || [] }, null, 2));
      else console.log(tw.renderLedger(run, meta));
      return 0;
    }
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 14).map((l) => l.slice(3)).join('\n'));
      return cmd ? 1 : 0;
  }
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (err) {
    console.error(`${err.code || 'ERROR'}: ${String(err.message)}`);
    process.exitCode = 1;
  }
}
module.exports = { main, parseArgs };
