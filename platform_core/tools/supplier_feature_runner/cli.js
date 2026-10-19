#!/usr/bin/env node
// Supplier Feature Runner CLI — runs one Setup Group of a Supplier-Feature run, end to end.
//
//   node platform_core/tools/supplier_feature_runner/cli.js run --run <run> --group <NN> (--headed | --headless)
//        [--app Portal|Admin] [--fresh-login] [--only TC-…,TC-…] [--login-timeout <sec>]
//
// --app is only needed when the run's testingLayerScope holds more than one application; it can
// never reach outside that frozen scope.
//   node platform_core/tools/supplier_feature_runner/cli.js groups --run <run>
//
// --run takes a run folder name, its "run-NNN" prefix, or a path. The run must already have its
// metadata/CapabilityPlan.md (capability_gate/cli.js plan --run …). Headed/Headless is never assumed.
//
// Exit codes: 0 every case passed or was not applicable · 2 something failed, was blocked or
// inconclusive, or the run stopped early · 1 the runner could not start.

'use strict';

const path = require('path');

const { RunnerError, selectGroup } = require('./index');
const { execute, prepare } = require('./runner');

const KNOWN = new Set(['run', 'group', 'app', 'headed', 'headless', 'fresh-login', 'only', 'login-timeout', 'help']);
const USAGE = 'Usage: cli.js run --run <run> --group <NN> (--headed | --headless) [--app Portal|Admin] [--fresh-login] [--only TC-…,TC-…] [--login-timeout <sec>]\n'
  + '       cli.js groups --run <run>';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const key = a.slice(2);
    if (!KNOWN.has(key)) throw new RunnerError(`Unknown flag --${key}.`);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { args[key] = true; } else { args[key] = next; i += 1; }
  }
  return args;
}

/** Headed/Headless must be said every time (CLAUDE.md standing rule). */
function displayMode(args) {
  if (args.headed && args.headless) throw new RunnerError('Choose one: --headed or --headless.');
  if (!args.headed && !args.headless) throw new RunnerError('Say --headed or --headless. It is asked before every execution, never assumed.');
  return !!args.headed;
}

function roots() {
  return {
    dataRoot: require('../platform_paths/paths').resolveRoots().dataRoot,
    repoRoot: path.resolve(__dirname, '..', '..', '..'),
  };
}

function printGroups(runArg) {
  const { dataRoot, repoRoot } = roots();
  const { run, plan, cases, feature, groups } = prepare({ runArg, group: null, dataRoot, repoRoot });
  console.log(`${run.folderName} · ${run.feature}/${run.supplier}`);
  for (const [id, g] of groups) {
    const sel = selectGroup(cases, plan, id);
    const runs = sel.filter((c) => c.plan === 'run').length;
    const how = (feature.manualGroups || {})[id] ? `manual — ${feature.manualGroups[id]}`
      : (feature.groups || {})[id]
        ? (feature.groups[id].assisted ? `assisted — stops at ${feature.groups[id].assisted} for the human (headed only)` : 'automated')
        : 'not automated yet';
    console.log(`  ${id}  ${String(runs).padStart(3)} to run / ${String(sel.length - runs).padStart(2)} excluded   ${how}   ${g.label}`);
  }
  return 0;
}

async function main(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  if (args.help || !['run', 'groups'].includes(cmd) || !args.run || args.run === true) {
    console.error(USAGE);
    return args.help ? 0 : 1;
  }
  if (cmd === 'groups') return printGroups(args.run);
  if (!args.group || args.group === true) throw new RunnerError('--group is required, e.g. --group 01.');
  const headed = displayMode(args);
  const only = typeof args.only === 'string' ? args.only.split(',').map((s) => s.trim()).filter(Boolean) : null;
  const loginTimeoutSec = args['login-timeout'] && args['login-timeout'] !== true ? Number(args['login-timeout']) : 300;
  const app = typeof args.app === 'string' ? args.app : null;
  const { exitCode } = await execute({
    runArg: args.run, group: args.group, app, headed, freshLogin: !!args['fresh-login'], only, loginTimeoutSec, ...roots(),
  });
  return exitCode;
}

if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => { process.exitCode = code; })
    .catch((err) => {
      console.error(err instanceof RunnerError ? `Error: ${err.message}` : err);
      process.exitCode = 1;
    });
}

module.exports = { main, parseArgs, displayMode };
