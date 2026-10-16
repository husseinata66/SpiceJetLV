#!/usr/bin/env node
// Test Suite Export CLI — renders Stage 3's authored Markdown suites into the matching .xlsx
// workbooks. The Markdown is the authored artifact; the workbook is generated output.
//
// Usage:
//   # export every TestCases_*.md in the ACTIVE module's test_design/ folder (the normal call)
//   node platform_core/tools/test_suite_export/cli.js
//
//   node .../cli.js --module <slug>          # a specific module instead of the active one(s)
//   node .../cli.js --run <run-folder>       # a HISTORIC run folder (pre-2026-07-29 layout only)
//   node .../cli.js --dir <path>             # any folder holding TestCases_*.md
//   node .../cli.js --file <path/to/TestCases_Search.md>      # a single suite
//   node .../cli.js --sheet-name Navigation_NFR_BR            # with --file: name the sheet tab
//   node .../cli.js --check                  # parse + report only; write nothing (CI / review gate)
//   node .../cli.js --json                   # machine-readable result
//
//   # pull the reviewer's Review/Automation decisions OUT of the workbook, into the Markdown
//   node .../cli.js --import-lifecycle
//   node .../cli.js --import-lifecycle --check      # show what would change; write nothing
//
// Exit codes:  0 = exported, 1 = error, 2 = parsed with warnings (or --check found drift)
//
// `--import-lifecycle` is the ONE inverse operation, and it is narrow on purpose: only the `Review`
// and `Automation` columns come back, because only those record a human decision made after
// generation rather than derived case content (importLifecycle.js explains the asymmetry). Run it
// BEFORE re-exporting a workbook a reviewer has touched — an export regenerates the sheet from the
// Markdown and would otherwise discard their decisions.
//
// THE DEFAULT IS THE MODULE, NOT THE RUN (fixed 2026-08-01, platform defect DREC-T04). The
// 2026-07-29 module-workspace migration moved Stage 3's output from `runs/{run}/test_design/` to
// `modules/{module}/test_design/` (module_architecture.md §6.4, pipeline.md §4 Stage 3), and this
// tool's default resolution was left pointing at the old location — so every module suite had to be
// exported with an explicit `--dir`, and the no-argument call failed or, worse, silently rendered a
// stale run-folder copy. The suite is DURABLE and belongs to its module; the run only records which
// revision it executed. Resolution follows what the artifact is, not where a run happened to sit.
//
// `--run` is retained for HISTORIC run folders that still carry a pre-migration `test_design/`. It is
// not the current layout and is never the default.
//
// Neither pointer is ever GUESSED: modules come from the Active Module pointer via module_manager
// (module_architecture.md §6.5 #1), runs from the Active Run pointer via run_manager. A stage that
// writes into a target it inferred is how one module's artifacts end up scattered across folders.

'use strict';

const fs = require('fs');
const path = require('path');

const { exportSuite, exportSuiteDir, ExportError, SUITE_FILENAME } = require('./exportSuites');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i += 1; }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

const value = (args, key) => (args[key] && args[key] !== true ? args[key] : undefined);

/** Roots come from platform_paths, never from `__dirname` — installed inside a host project,
 *  `__dirname/../../..` is the host's repository rather than the tool folder (pipeline.md §1.1). */
function platformRoots() {
  try {
    return require('../platform_paths/paths').resolveRoots();
  } catch (err) {
    throw new ExportError(
      `Could not resolve platform roots (${err.message}).\n`
      + 'Pass --dir <path> explicitly, or fix platform.config.json.'
    );
  }
}

/** A HISTORIC run folder's pre-migration `test_design/`. Never the default — see the header. */
function resolveRunDesignDir(args, runsDir) {
  const { resolveActiveRunFolder } = require('../run_manager/activeRun');
  const { resolveRunFolder } = require('../run_manager/runFolderIndex');

  // `--run` with no value means "the active run"; `value()` returns undefined for a bare flag.
  const explicitRun = value(args, 'run');
  const runFolder = explicitRun
    ? resolveRunFolder(runsDir, explicitRun)
    : resolveActiveRunFolder(runsDir);

  if (!runFolder) {
    throw new ExportError(
      explicitRun
        ? `No run matches "${explicitRun}" in ${runsDir}.`
        : 'No active run, and --run named none.\n'
          + 'Set one with:  node platform_core/tools/run_manager/cli.js use <run-folder>\n'
          + '     or pass:  --run <run-folder>'
    );
  }

  const designDir = path.join(runsDir, runFolder, 'test_design');
  if (!fs.existsSync(designDir)) {
    throw new ExportError(
      `Run "${runFolder}" has no test_design/ folder (${designDir}).\n`
      + 'Since the 2026-07-29 module-workspace migration, Stage 3 writes to\n'
      + '  platform_core_data/modules/{module}/test_design/\n'
      + 'Drop --run to export the active module instead, or pass --module <slug>.'
    );
  }
  return { dirs: [designDir], source: `run ${runFolder} (historic layout)`, strict: true };
}

/**
 * Resolve the `test_design/` folder(s) to export from.
 *
 * Precedence: --dir (literal) > --run (historic) > --module (named) > the Active Module pointer.
 *
 * Returns a LIST because a module selection may legitimately be `multi` or `full-project`
 * (module_architecture.md §9.1) — one suite per module, never one merged workbook. `strict` says
 * whether a folder that holds no suite is an error: it is when the human named one target, and is
 * not when the pointer spans several modules of which only some have reached Stage 3.
 *
 * @param {object} args        parsed argv
 * @param {{dataRoot?: string}} [opts]  injected data root; tests pass a temp one, since
 *        resolveRoots() legitimately refuses a dataRoot outside the Tool Root (paths.js).
 * @returns {{dirs: string[], source: string, strict: boolean}}
 */
function resolveDesignDirs(args, opts = {}) {
  const explicitDir = value(args, 'dir');
  if (explicitDir) {
    return { dirs: [path.resolve(explicitDir)], source: 'explicit --dir', strict: true };
  }

  const dataRoot = opts.dataRoot || platformRoots().dataRoot;

  if (args.run !== undefined) {
    return resolveRunDesignDir(args, path.join(dataRoot, 'runs'));
  }

  const modulesDir = path.join(dataRoot, 'modules');
  const { resolveActiveModules } = require('../module_manager/activeModule');
  const { readRegistry, listSlugs } = require('../module_manager/moduleRegistry');
  const { resolveModuleSlug } = require('../module_manager/moduleSlug');

  const explicitModule = value(args, 'module');
  let slugs;
  let source;
  let strict;

  if (explicitModule) {
    const known = listSlugs(readRegistry(modulesDir));
    const slug = resolveModuleSlug(known, explicitModule);
    if (!slug) {
      throw new ExportError(
        `No module matches "${explicitModule}".\n`
        + `Registered: ${known.length ? known.join(', ') : '(none)'}\n`
        + 'Run:  node platform_core/tools/module_manager/cli.js list'
      );
    }
    slugs = [slug];
    source = `module ${slug}`;
    strict = true;
  } else {
    slugs = resolveActiveModules(modulesDir);
    if (!slugs.length) {
      // Never fall back to "the only module" or "the newest" — §6.5 #1 is explicit that a stage
      // with no pointer ASKS. A tool cannot ask, so it names the two ways to tell it.
      throw new ExportError(
        'No active module — cannot decide which suite to export.\n'
        + 'Set one with:  node platform_core/tools/module_manager/cli.js use <slug>\n'
        + '     or pass:  --module <slug>  /  --dir <path>'
      );
    }
    // Feature scope (Phase 9.3, F-28): an active Feature pointer decides the folder — the Feature's own
    // test_design/, never its parent module's. A stale or contradictory pointer is an error, never a
    // fallback to module scope (CLAUDE.md "Scope pointers"; activeModule.resolveActiveFeature).
    const { resolveActiveFeature } = require('../module_manager/activeModule');
    let active;
    try {
      active = resolveActiveFeature(modulesDir);
    } catch (err) {
      throw new ExportError(`${err.message}\nNothing was exported — the Feature pointer is not silently dropped to module scope.`);
    }
    if (active.scope === 'feature') {
      return {
        dirs: [path.join(require('../module_manager/featureRegistry').featureDir(modulesDir, active.module, active.feature), 'test_design')],
        source: `active Feature ${active.module}/${active.feature}`,
        strict: true,
      };
    }
    // The RESOLVED selection is reported, never the registry's recorded scope: an
    // AGENTIC_TESTING_MODULE override changes what is active for this process without touching the
    // file, so the stored scope can disagree with what is actually being exported.
    source = `active module${slugs.length > 1 ? 's' : ''}: ${slugs.join(', ')}`;
    strict = slugs.length === 1;
  }

  return {
    dirs: slugs.map((slug) => path.join(modulesDir, slug, 'test_design')),
    source,
    strict,
  };
}

/**
 * Export every resolved `test_design/` folder, merging the per-folder results into one payload.
 *
 * A folder holding no suite is fatal only when `strict` — i.e. when the human named exactly one
 * target. Under a multi-module pointer it is reported as skipped, because a module that has not
 * reached Stage 3 yet is an expected state, not an error that should abort its siblings' export.
 */
function exportResolved(args, dryRun) {
  const { dirs, source, strict } = resolveDesignDirs(args);
  const groups = [];
  const skipped = [];

  for (const dir of dirs) {
    try {
      groups.push(exportSuiteDir(dir, { dryRun }));
    } catch (err) {
      if (err instanceof ExportError && !strict) {
        skipped.push(`${dir} (no Stage 3 suite yet)`);
        continue;
      }
      throw err;
    }
  }

  if (!groups.length) {
    throw new ExportError(
      `No Stage 3 suite documents found for ${source}.\n`
      + `Looked in:\n${dirs.map((d) => `  ${d}`).join('\n')}\n`
      + 'Stage 3 authors the Markdown suites first; this tool renders them to Excel.'
    );
  }

  return {
    designDir: groups.length === 1 ? groups[0].designDir : undefined,
    designDirs: groups.map((g) => g.designDir),
    source,
    results: groups.flatMap((g) => g.results),
    skipped: [...skipped, ...groups.flatMap((g) => g.skipped)],
    warnings: groups.flatMap((g) => g.warnings),
  };
}

/**
 * `--import-lifecycle` — the inverse pass. Resolves suites exactly as an export does, so
 * `--module` / `--dir` / `--file` mean the same thing in both directions.
 */
function importResolved(args, dryRun) {
  const { importLifecycle } = require('./importLifecycle');

  const file = value(args, 'file');
  let markdownPaths;
  let source;

  if (file) {
    markdownPaths = [path.resolve(file)];
    source = 'explicit --file';
  } else {
    const resolved = resolveDesignDirs(args);
    source = resolved.source;
    markdownPaths = [];
    for (const dir of resolved.dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir).sort()) {
        const match = SUITE_FILENAME.exec(name);
        if (match && !/\.v\d+$/i.test(match[1])) markdownPaths.push(path.join(dir, name));
      }
    }
    if (!markdownPaths.length) {
      throw new ExportError(`No Stage 3 suite documents found for ${source}.`);
    }
  }

  const results = markdownPaths.map((md) => importLifecycle(md, undefined, { dryRun }));

  // The index repeats each case's lifecycle values, so an import that did not re-render it would
  // leave the document disagreeing with itself about which cases are approved.
  const { syncCaseIndex } = require('./syncCaseIndex');
  const indexResults = markdownPaths.map((md) => syncCaseIndex(md, { dryRun }));

  return {
    source,
    results,
    indexChanges: indexResults.flatMap((r) => r.changes),
    warnings: [...results.flatMap((r) => r.warnings), ...indexResults.flatMap((r) => r.warnings)],
    changes: results.flatMap((r) => r.changes.map((c) => ({ ...c, suite: path.basename(r.markdownPath) }))),
  };
}

/** `--sync-index` — re-render the Case Index from the case bodies, without touching the workbook. */
function syncResolved(args, dryRun) {
  const { syncCaseIndex } = require('./syncCaseIndex');

  const file = value(args, 'file');
  let markdownPaths;
  let source;

  if (file) {
    markdownPaths = [path.resolve(file)];
    source = 'explicit --file';
  } else {
    const resolved = resolveDesignDirs(args);
    source = resolved.source;
    markdownPaths = [];
    for (const dir of resolved.dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir).sort()) {
        const match = SUITE_FILENAME.exec(name);
        if (match && !/\.v\d+$/i.test(match[1])) markdownPaths.push(path.join(dir, name));
      }
    }
    if (!markdownPaths.length) throw new ExportError(`No Stage 3 suite documents found for ${source}.`);
  }

  const results = markdownPaths.map((md) => syncCaseIndex(md, { dryRun }));
  return { source, results, warnings: results.flatMap((r) => r.warnings) };
}

function reportImport(payload, args, dryRun) {
  if (args.json) {
    console.log(JSON.stringify({ ...payload, mode: dryRun ? 'check' : 'import' }, null, 2));
  } else {
    const verb = dryRun ? 'Would import' : 'Imported';
    console.log(`${verb} lifecycle decisions (Review, Automation) — ${payload.source}`);
    for (const r of payload.results) {
      console.log(`  ${path.basename(r.markdownPath).padEnd(34)} ${String(r.changes.length).padStart(3)} change(s) from ${path.basename(r.xlsxPath)}`);
    }
    if (payload.changes.length) {
      console.log('\nDecisions moved into the Markdown:');
      for (const c of payload.changes) {
        console.log(`  ${c.id.padEnd(16)} ${c.field.padEnd(11)} ${c.from} -> ${c.to}`);
      }
      if (!dryRun) {
        console.log('\nRe-export now, so the workbook matches the Markdown it is derived from:');
        console.log('  node platform_core/tools/test_suite_export/cli.js');
      }
    } else {
      console.log('\nNo changes — the Markdown already matches the workbook.');
    }
    if (payload.indexChanges && payload.indexChanges.length) {
      console.log(`\nCase Index re-rendered from the case bodies: ${payload.indexChanges.length} row(s)/total(s) updated.`);
    }
    if (payload.warnings.length) {
      console.log('\nWarnings:');
      for (const w of payload.warnings) console.log(`  ! ${w}`);
    }
  }
  if (payload.warnings.length) process.exitCode = 2;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args.check);

  const handleToolError = (err) => {
    const { ImportError } = require('./importLifecycle');
    const { IndexSyncError } = require('./syncCaseIndex');
    if (err instanceof ExportError || err instanceof ImportError || err instanceof IndexSyncError) {
      console.error(err.message);
      process.exitCode = 1;
      return true;
    }
    return false;
  };

  if (args['import-lifecycle']) {
    try {
      reportImport(importResolved(args, dryRun), args, dryRun);
    } catch (err) {
      if (handleToolError(err)) return;
      throw err;
    }
    return;
  }

  if (args['sync-index']) {
    try {
      const payload = syncResolved(args, dryRun);
      if (args.json) {
        console.log(JSON.stringify({ ...payload, mode: dryRun ? 'check' : 'sync' }, null, 2));
      } else {
        console.log(`${dryRun ? 'Would re-render' : 'Re-rendered'} the Case Index from the case bodies — ${payload.source}`);
        for (const r of payload.results) {
          console.log(`  ${path.basename(r.markdownPath).padEnd(34)} ${String(r.caseCount).padStart(3)} case(s), ${r.changes.length} change(s)`);
          for (const c of r.changes) console.log(`    ${c.id}`);
        }
        if (payload.warnings.length) {
          console.log('\nWarnings:');
          for (const w of payload.warnings) console.log(`  ! ${w}`);
        }
      }
      if (payload.warnings.length) process.exitCode = 2;
    } catch (err) {
      if (handleToolError(err)) return;
      throw err;
    }
    return;
  }

  let payload;
  try {
    const file = value(args, 'file');
    if (file) {
      const result = exportSuite(path.resolve(file), {
        dryRun,
        ...(value(args, 'sheet-name') ? { sheetName: value(args, 'sheet-name') } : {}),
      });
      const dir = path.dirname(result.markdownPath);
      payload = {
        designDir: dir,
        designDirs: [dir],
        source: 'explicit --file',
        results: [result],
        skipped: [],
        warnings: result.warnings,
      };
    } else {
      payload = exportResolved(args, dryRun);
    }
  } catch (err) {
    if (err instanceof ExportError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  const totalCases = payload.results.reduce((sum, r) => sum + r.caseCount, 0);

  if (args.json) {
    console.log(JSON.stringify({ ...payload, totalCases, mode: dryRun ? 'check' : 'export' }, null, 2));
  } else {
    console.log(`${dryRun ? 'Checked' : 'Exported'} Manual Test Suites — ${payload.source}`);
    for (const dir of payload.designDirs) console.log(`  ${dir}`);
    for (const r of payload.results) {
      const target = dryRun ? '(not written)' : path.basename(r.xlsxPath);
      console.log(`  ${path.basename(r.markdownPath).padEnd(34)} ${String(r.caseCount).padStart(3)} case(s) -> ${target}`);
    }
    for (const s of payload.skipped) console.log(`  skipped: ${s}`);
    console.log(`  total: ${totalCases} test case(s) across ${payload.results.length} module(s)`);

    if (payload.warnings.length) {
      console.log('\nWarnings — the Markdown suite needs fixing, not the workbook:');
      for (const w of payload.warnings) console.log(`  ! ${w}`);
    }
  }

  // Non-zero on warnings so a workflow step can gate on "did every case parse cleanly?" rather than
  // shipping a workbook with blank Expected Result cells that nobody notices until Stage 4.
  if (payload.warnings.length) process.exitCode = 2;
}

if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, resolveDesignDirs };
