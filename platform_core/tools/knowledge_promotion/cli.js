#!/usr/bin/env node
// Platform Knowledge promotion (Phase 9.4) — see run_manager/knowledgePromotion.js.
//
//   node .../cli.js propose --run <folder> --entry REPAIR-NNN --by "<name>"
//   node .../cli.js review  --proposal KP-n --decision approve|reject --by "<name>" --reason "..." [--fingerprint <sha>]
//   node .../cli.js apply   --proposal KP-n --run <folder>
//   node .../cli.js verify  [--json]                    exit 2 = an applied file changed, or an unapproved file exists
//   node .../cli.js ledger  [--json]
// Every command takes [--runs-dir <dir>] and [--platform-dir <dir>] (default platform_core/knowledge).

'use strict';

const fs = require('fs');
const path = require('path');
const kp = require('../run_manager/knowledgePromotion');

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

function main(argv) {
  const a = parseArgs(argv);
  const platformDir = str(a, 'platform-dir') ? path.resolve(a['platform-dir']) : kp.DEFAULT_PLATFORM_DIR;
  const now = new Date();
  switch (a._[0]) {
    case 'propose': {
      const run = str(a, 'run');
      if (!run || /[\\/]/.test(run)) throw Object.assign(new Error('--run <run folder name> is required.'), { code: 'INVALID_ARGUMENT' });
      const e = kp.proposePromotion({ runsDir: runsDirOf(a), folderName: run, entryId: str(a, 'entry'), platformDir, by: str(a, 'by'), now });
      console.log(`Proposed ${e.id}: ${e.source.entry} from ${e.source.run} → ${e.target} (fingerprint ${e.fingerprint}). A named human reviews it: review --proposal ${e.id} --decision approve|reject --by "<name>" --reason "..."`);
      return 0;
    }
    case 'review': {
      const e = kp.reviewPromotion({ id: str(a, 'proposal'), decision: str(a, 'decision'), by: str(a, 'by'), reason: str(a, 'reason'), fingerprint: str(a, 'fingerprint'), platformDir, runsDir: runsDirOf(a), now });
      console.log(`${e.id} ${e.status} by ${e.review.by}`);
      return 0;
    }
    case 'apply': {
      const e = kp.applyPromotion({ id: str(a, 'proposal'), runsDir: runsDirOf(a), platformDir, now });
      console.log(`${e.id} applied: ${e.target}`);
      return 0;
    }
    case 'verify': {
      const r = kp.verifyKnowledge({ platformDir });
      if (a.json) console.log(JSON.stringify(r, null, 2));
      else { console.log(r.ok ? `Platform Knowledge verified: ${r.applied} applied promotion(s) unchanged; no unapproved file.` : 'Platform Knowledge NOT verified:'); for (const i of r.issues) console.log(`  - ${i}`); }
      return r.ok ? 0 : 2;
    }
    case 'ledger': {
      const l = kp.readLedger(platformDir);
      if (a.json) console.log(JSON.stringify(l, null, 2));
      else for (const e of l.entries) console.log(`${e.id}  ${e.status.padEnd(9)} ${e.source.entry} (${e.source.run}) → ${e.target}${e.review ? `  reviewed by ${e.review.by}` : ''}`);
      return 0;
    }
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 9).map((l) => l.slice(3)).join('\n'));
      return a._[0] ? 1 : 0;
  }
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (err) {
    console.error(`${err.code || 'ERROR'}: ${String(err.message)}`);
    process.exitCode = 1;
  }
}
module.exports = { main };
