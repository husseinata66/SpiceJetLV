#!/usr/bin/env node
// Capability gate CLI — prints (and optionally records) which cases a Supplier can run.
//
//   node platform_core/tools/capability_gate/cli.js plan --suite <TestCases.md|sheet.xlsx> \
//        --feature <feature> --supplier <supplier> [--run <run-folder> | --out <file.md>] [--json]
//
// --run writes runs/<run-folder>/metadata/CapabilityPlan.md — run it before execution starts,
// the same way the Safety Preflight is written first.
//
// Exit codes: 0 plan produced · 1 error · 2 plan produced with warnings (e.g. untagged cases).

'use strict';

const fs = require('fs');
const path = require('path');

const { findSupplier } = require('../module_manager/supplierRegistry');
const { CapabilityGateError, loadCases, planExecution, renderPlan } = require('./index');

const KNOWN = new Set(['suite', 'feature', 'supplier', 'run', 'out', 'json', 'supplier-features-dir', 'runs-dir', 'data-root', 'help']);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const key = a.slice(2);
    if (!KNOWN.has(key)) throw new CapabilityGateError(`Unknown flag --${key}.`);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { args[key] = true; } else { args[key] = next; i += 1; }
  }
  return args;
}

function dataRoot() {
  return require('../platform_paths/paths').resolveRoots().dataRoot;
}

/**
 * Fills --feature, --supplier and --suite from the run itself, so the documented form
 * `cli.js plan --run <run>` (CLAUDE.md, ndc_execution_rules.md §A15, manual-execution-skill) works:
 * the Feature and Supplier come from the run's run.json; the suite is the Supplier scope's one
 * TestCases_*.md. An explicit flag always wins. Anything ambiguous is refused, never guessed.
 */
function fillFromRun(args, root) {
  if (!args.run || args.run === true || (args.suite && args.feature && args.supplier)) return args;
  const runsDir = args['runs-dir'] && args['runs-dir'] !== true ? path.resolve(args['runs-dir']) : path.join(root, 'runs');
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(runsDir, args.run, 'metadata', 'run.json'), 'utf8'));
  } catch {
    throw new CapabilityGateError(`Run "${args.run}" has no readable metadata/run.json.`);
  }
  if (meta.scopeFamily !== 'supplier-feature' || !meta.feature) {
    throw new CapabilityGateError(`Run "${args.run}" is not a Supplier-Feature run — the capability gate applies only to Supplier runs (ndc_execution_rules.md §A15).`);
  }
  if (!meta.supplier && !args.supplier) {
    throw new CapabilityGateError(`Run "${args.run}" is a shared-scope run (${meta.sharedScope}); name the Supplier with --supplier.`);
  }
  const out = { ...args, feature: args.feature || meta.feature, supplier: args.supplier || meta.supplier };
  if (!out.suite) {
    const dir = path.join(root, 'supplier-features', out.feature, 'suppliers', out.supplier, 'test_design');
    let suites = [];
    try { suites = fs.readdirSync(dir).filter((n) => /^TestCases_.+\.md$/.test(n)); } catch { /* none */ }
    if (suites.length !== 1) {
      throw new CapabilityGateError(
        `Cannot pick the suite for ${out.feature}/${out.supplier}: found ${suites.length} TestCases_*.md in ${dir}. Pass --suite.`
      );
    }
    out.suite = path.join(dir, suites[0]);
  }
  return out;
}

function main(argv) {
  let args = parseArgs(argv);
  if (!args.help && args._[0] === 'plan' && args.run && args.run !== true) {
    const root = args['data-root'] && args['data-root'] !== true ? path.resolve(args['data-root']) : dataRoot();
    args = { ...fillFromRun(args, root), _root: root };
  }
  if (args.help || args._[0] !== 'plan' || !args.suite || !args.feature || !args.supplier) {
    console.error(
      'Usage: cli.js plan --run <run-folder> [--json]\n'
      + '   or: cli.js plan --suite <TestCases.md|sheet.xlsx> --feature <feature> --supplier <supplier> '
      + '[--run <run-folder> | --out <file.md>] [--json]'
    );
    return args.help ? 0 : 1;
  }
  const sfDir = args['supplier-features-dir'] && args['supplier-features-dir'] !== true
    ? path.resolve(args['supplier-features-dir'])
    : path.join(args._root || dataRoot(), 'supplier-features');
  const supplier = findSupplier(sfDir, args.feature, args.supplier);
  if (!supplier) {
    throw new CapabilityGateError(
      `No Supplier "${args.supplier}" is registered under Feature "${args.feature}".`
    );
  }

  const suite = path.resolve(args.suite);
  // Phase 9.2, F-13: a plan written into a run is for THAT run's Feature and Supplier — never another's.
  if (args.run && args.run !== true) {
    const runsDir0 = args['runs-dir'] && args['runs-dir'] !== true ? path.resolve(args['runs-dir']) : path.join(args._root || dataRoot(), 'runs');
    let meta = null;
    try { meta = JSON.parse(fs.readFileSync(path.join(runsDir0, args.run, 'metadata', 'run.json'), 'utf8')); } catch { meta = null; }
    if (!meta) throw new CapabilityGateError(`Run "${args.run}" has no readable metadata/run.json.`);
    if (meta.scopeFamily !== 'supplier-feature' || !meta.feature) throw new CapabilityGateError(`Run "${args.run}" is not a Supplier-Feature run — the capability gate applies only to Supplier runs.`);
    if (meta.feature !== args.feature) throw new CapabilityGateError(`Refused: run "${args.run}" is bound to Feature "${meta.feature}", not "${args.feature}" — a plan is written only for the run's own Feature.`);
    if (meta.supplier && meta.supplier !== args.supplier) throw new CapabilityGateError(`Refused: run "${args.run}" is bound to Supplier "${meta.supplier}", not "${args.supplier}" — another Supplier's capabilities never decide this run's scope.`);
  }
  const plan = planExecution(loadCases(suite), supplier);
  // eslint-disable-next-line global-require
  const { capabilityFingerprint } = require('./index');
  const suiteSha = (() => { try { return require('crypto').createHash('sha256').update(fs.readFileSync(suite)).digest('hex'); } catch { return null; } })();
  const binding = { run: args.run && args.run !== true ? args.run : null, feature: args.feature, supplier: args.supplier, capabilities: capabilityFingerprint(supplier), suite: suiteSha, suitePath: path.basename(suite) };
  const rules = !supplier.supplierRulesSetAt
    ? 'not yet recorded'
    : ((supplier.supplierRules || []).join(', ') || 'None');
  const markdown = renderPlan(plan, {
    feature: args.feature, supplier: args.supplier, suite: args.suite, rules,
    generatedAt: new Date().toISOString(), binding,
  });

  let outFile = null;
  if (args.run && args.run !== true) {
    const runsDir = args['runs-dir'] && args['runs-dir'] !== true ? path.resolve(args['runs-dir']) : path.join(args._root || dataRoot(), 'runs');
    outFile = path.join(runsDir, args.run, 'metadata', 'CapabilityPlan.md');
    if (!fs.existsSync(path.dirname(path.dirname(outFile)))) {
      throw new CapabilityGateError(`Run folder "${args.run}" does not exist.`);
    }
  } else if (args.out && args.out !== true) {
    outFile = path.resolve(args.out);
  }
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, markdown, 'utf8');
  }

  if (args.json) {
    console.log(JSON.stringify({ ...plan, outFile }, null, 2));
  } else {
    console.log(`Will run: ${plan.run.length}   Excluded (not supported by supplier): ${plan.excluded.length}`);
    if (plan.awaitingReview.length) {
      console.log(`  of which ${plan.awaitingReview.length} still await Review approval: `
        + plan.awaitingReview.map((c) => c.id).join(', '));
    }
    for (const c of plan.excluded) console.log(`  excluded ${c.id.padEnd(16)} ${c.reasons.join('; ')}`);
    for (const w of plan.warnings) console.log(`  warning  ${w}`);
    if (outFile) console.log(`Wrote ${outFile}`);
  }
  return plan.warnings.length ? 2 : 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof CapabilityGateError || err.name === 'SupplierRegistryError' || err.name === 'WorkbookReadError') {
      console.error(err.message);
      process.exitCode = 1;
    } else {
      throw err;
    }
  }
}

module.exports = { main, parseArgs, fillFromRun };
