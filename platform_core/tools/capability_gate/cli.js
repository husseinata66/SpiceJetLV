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

const KNOWN = new Set(['suite', 'feature', 'supplier', 'run', 'out', 'json', 'supplier-features-dir', 'help']);

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

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || args._[0] !== 'plan' || !args.suite || !args.feature || !args.supplier) {
    console.error(
      'Usage: cli.js plan --suite <TestCases.md|sheet.xlsx> --feature <feature> --supplier <supplier> '
      + '[--run <run-folder> | --out <file.md>] [--json]'
    );
    return args.help ? 0 : 1;
  }
  const sfDir = args['supplier-features-dir'] && args['supplier-features-dir'] !== true
    ? path.resolve(args['supplier-features-dir'])
    : path.join(dataRoot(), 'supplier-features');
  const supplier = findSupplier(sfDir, args.feature, args.supplier);
  if (!supplier) {
    throw new CapabilityGateError(
      `No Supplier "${args.supplier}" is registered under Feature "${args.feature}".`
    );
  }

  const suite = path.resolve(args.suite);
  const plan = planExecution(loadCases(suite), supplier);
  const rules = !supplier.supplierRulesSetAt
    ? 'not yet recorded'
    : ((supplier.supplierRules || []).join(', ') || 'None');
  const markdown = renderPlan(plan, {
    feature: args.feature, supplier: args.supplier, suite: args.suite, rules,
    generatedAt: new Date().toISOString(),
  });

  let outFile = null;
  if (args.run && args.run !== true) {
    outFile = path.join(dataRoot(), 'runs', args.run, 'metadata', 'CapabilityPlan.md');
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

module.exports = { main, parseArgs };
