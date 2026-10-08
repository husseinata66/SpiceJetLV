#!/usr/bin/env node
// Run Manager CLI — run folder naming, plus the Active Run pointer.
//
// The naming path (the default verb) is the one place a new run's folder name is generated; agents
// and skills must call it instead of hand-formatting a folder name. The active-run verbs are the one
// place the pipeline's current run is read or changed (see run_manager.md §5.7).
//
// Usage:
//   # generate a folder name (default verb — the original bare-flag form still works unchanged)
//   node platform_core/tools/run_manager/cli.js --scope UserStory --target "Create Role" \
//     --started 2026-07-23T10:35:18 --existing-dir platform_core_data/runs [--json]
//
//   # active run pointer (platform_core_data/runs/current_active_run.json)
//   node .../cli.js active                      # print the active run's folder name
//   node .../cli.js active --json               # print the whole pointer
//   node .../cli.js use <run-folder-or-RunID>   # switch to an existing run (sticky)
//   node .../cli.js list [--json]               # every run on disk, newest first, active marked *
//   node .../cli.js refresh                     # re-cache status/stages for the active run
//   node .../cli.js clear                       # remove the pointer
//
//   # refinement + drift
//   node .../cli.js refine <prior-run> [--dry-run] [--scope S] [--target T] [--reason "..."]
//                                               # NEW run inheriting <prior-run>, anchored to today
//   node .../cli.js drift [--run <r>] [--json]  # what changed in the target since a run was anchored
//
//   # run creation + manifest (the Run Manager's own bookkeeping)
//   node .../cli.js new --scope <S> --target <T> [--workflow W] [--no-activate] [<owner flags>]
//                                               # create a run: name + anchor + Manifest + activate
//     owner flags — which Feature/module the run belongs to, so it joins that owner's sequence
//     (run_manager.md §5.1.1). Also accepted by the default naming verb:
//       --feature F (--supplier S | --shared-scope SS)   Supplier Feature run  -> F-run-NNN
//       --modules a[,b] [--module-feature F]             module / classic Feature run
//                                                        -> a-run-NNN · a+b-run-NNN · a.F-run-NNN
//     none of them                                       -> bare run-NNN (full-project / unscoped)
//
//   # move existing runs onto their owner's sequence (the one sanctioned rename, §5.1.1)
//   node .../cli.js rename-runs [--assign "<run>=<owner>,<run>=<owner>"] [--json]       # plan only
//   node .../cli.js rename-runs ... --apply --approved-by "<name>" --reason "..." [--no-rewrite-refs]
//   node .../cli.js stage "<Stage>" --status <Approved|...> [--reviewer R] [--revisions N]
//                                               # record a stage checkpoint in the Run Manifest
//   node .../cli.js manifest [--json]           # read the stage ledger ("where are we right now?")
//   node .../cli.js manifest --gap "..." --why "..."          # declare a gap
//   node .../cli.js manifest --reuse <artifact> --from <run>  # record cross-run reuse
//   node .../cli.js anchor [--run <r>] [--force] # backfill a missing code-state anchor
//
//   # Supplier Features ONLY — frozen-scope mutation (module_architecture.md §11.5.1)
//   node .../cli.js scope-change [--run <r>] --approved-by "<name>" --reason "..." \
//     [--feature F] [--supplier S | --clear-supplier] \
//     [--shared-scope SS | --clear-shared-scope] [--testing-layer-scope <json> | --clear-testing-layer-scope]
//                                               # the ONLY supported way to change a Supplier-Feature
//                                               # run's feature/supplier/sharedScope/testingLayerScope
//                                               # after creation; refuses on a classic run and requires
//                                               # --approved-by + --reason. Appends to scopeHistory.
//                                               # `scopeFamily` itself is never changeable.
//
// --started defaults to now if omitted. --existing-dir, if given, is scanned for existing folder
// names so the run index advances past the highest one present and collisions get a deterministic
// __2/__3 suffix. --index pins the run index explicitly; --no-index omits the run-NNN__ prefix.
// --runs-dir overrides where runs/ is looked for (defaults to the conventional location).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { generateRunFolderName, parseRunFolderName, deriveRunOwner } = require('./runFolderName');
const { planRunRenames, applyRunRenames, RenameRunsError } = require('./renameRuns');
const { resolveRunFolder } = require('./runFolderIndex');
const { captureTargetRef, computeDrift } = require('./targetRef');
const {
  LINEAGE_FILENAME, LineageError, planRefinement, writeLineage, readLineage,
} = require('./runLineage');
const {
  createRun, backfillTargetRef, changeSupplierFeatureRunScope, CreateRunError,
} = require('./createRun');
const {
  CHECKPOINT_STATUSES, INVOCATION_PATHS, ManifestError,
  recordStage, recordReuse, recordGap, readManifest,
} = require('./runManifest');
const {
  ACTIVE_RUN_FILENAME,
  ActiveRunError,
  listRuns,
  setActiveRun,
  readActiveRun,
  resolveActiveRunFolder,
  isActiveRunStale,
  clearActiveRun,
  refreshActiveRun,
} = require('./activeRun');

const VERBS = new Set([
  'name', 'active', 'use', 'list', 'refresh', 'clear', 'refine', 'drift',
  'new', 'stage', 'manifest', 'anchor', 'scope-change', 'rename-runs',
]);

function argValue(args, key) {
  return args[key] && args[key] !== true ? String(args[key]) : undefined;
}

/**
 * The run.json scope fields the owner flags describe (see the usage header). Returns {} when none are
 * given, which keeps the run unowned exactly as before these flags existed.
 */
function scopeFieldsFromArgs(args) {
  const feature = argValue(args, 'feature');
  const modules = argValue(args, 'modules');
  if (feature && modules) {
    throw new CreateRunError(
      '--feature (a Supplier Feature) and --modules (classic modules) describe different scope families — pass one.'
    );
  }
  if (feature) {
    return {
      scopeFamily: 'supplier-feature',
      feature,
      supplier: argValue(args, 'supplier') ?? null,
      sharedScope: argValue(args, 'shared-scope') ?? null,
    };
  }
  if (modules) {
    const list = modules.split(',').map((m) => m.trim()).filter(Boolean);
    const moduleFeature = argValue(args, 'module-feature');
    return {
      modules: list,
      moduleScope: list.length > 1 ? 'multi' : 'single',
      ...(moduleFeature ? { moduleFeature } : {}),
    };
  }
  if (argValue(args, 'module-feature')) {
    throw new CreateRunError('--module-feature needs its parent module: --modules <module> --module-feature <feature>.');
  }
  return {};
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

/**
 * Where runs/ lives, and where the Target Project is.
 *
 * Roots come from platform_paths and NEVER from this file's own location. `pipeline.md` §1.1 is
 * explicit: "An agent must never infer either root from process.cwd(), from __dirname, or by
 * searching for .git" — installed inside a host project, `__dirname/../../..` is the host's
 * repository rather than the tool folder, which is how artifacts land in the wrong place. Going
 * through platform_paths also picks up a relocated `dataRoot`, which a hardcoded path cannot.
 * `--runs-dir` still wins, for tests and for inspecting another checkout.
 */
function resolveRoots(args) {
  const explicit = args['runs-dir'] && args['runs-dir'] !== true;
  let roots = null;
  try {
    roots = require('../platform_paths/paths').resolveRoots();
  } catch (err) {
    // Unresolvable config is reported, never papered over with a guessed location.
    if (!explicit) {
      console.error(
        `Could not resolve platform roots (${err.message}).\n` +
        'Pass --runs-dir <path> explicitly, or fix platform.config.json.'
      );
      process.exitCode = 1;
      return null;
    }
  }
  const runsDir = explicit
    ? path.resolve(args['runs-dir'])
    : path.join(roots.dataRoot, 'runs');
  // --target-root pairs with --runs-dir: overriding only one of them would leave drift computed
  // against a different project than the runs belong to, which silently reports the wrong answer.
  const targetRoot = (args['target-root'] && args['target-root'] !== true)
    ? path.resolve(args['target-root'])
    : (roots ? roots.targetRoot : null);
  return { runsDir, targetRoot };
}

/** Shim for verbs needing only runsDir. Returns null when roots are unresolvable. */
function resolveRunsDir(args) {
  const r = resolveRoots(args);
  return r ? r.runsDir : null;
}

function cmdName(args) {
  const now = args.started ? new Date(args.started) : new Date();
  if (Number.isNaN(now.getTime())) {
    console.error(`Invalid --started value: ${args.started}`);
    process.exitCode = 1;
    return;
  }

  let existingNames = [];
  if (args['existing-dir'] && fs.existsSync(args['existing-dir'])) {
    existingNames = fs.readdirSync(args['existing-dir'], { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }

  let owner;
  try {
    owner = deriveRunOwner(scopeFieldsFromArgs(args));
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  const folderName = generateRunFolderName(
    { scope: args.scope, target: args.target, owner },
    {
      existingNames,
      now,
      ...(args.index !== undefined && args.index !== true ? { index: Number(args.index) } : {}),
      ...(args['no-index'] ? { withIndex: false } : {}),
    }
  );

  if (args.json) {
    const parsed = parseRunFolderName(folderName);
    console.log(JSON.stringify({
      folderName,
      index: parsed.index ?? null,
      runOwner: parsed.owner ?? null,
      scope: args.scope,
      target: args.target,
      started: now.toISOString(),
    }, null, 2));
  } else {
    console.log(folderName);
  }
}

function cmdActive(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const pointer = readActiveRun(runsDir);

  if (!pointer?.activeRun?.folderName) {
    console.error(
      `No active run — ${ACTIVE_RUN_FILENAME} is absent under ${runsDir}.\n` +
      'Set one with:  cli.js use <run-folder>     (see `cli.js list`)'
    );
    process.exitCode = 1;
    return;
  }

  // A pointer whose folder is gone must fail loudly: silently falling back to another run is exactly
  // the cross-run contamination this pointer exists to prevent.
  if (isActiveRunStale(runsDir)) {
    console.error(
      `Active run "${pointer.activeRun.folderName}" is recorded but its folder no longer exists.\n` +
      'Switch to an existing run (`cli.js use <run-folder>`) or clear the pointer (`cli.js clear`).'
    );
    process.exitCode = 1;
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(pointer, null, 2));
  } else {
    // Bare folder name on stdout, so a caller can capture it straight into {{RUN_FOLDER}}.
    console.log(resolveActiveRunFolder(runsDir));
  }
}

function cmdUse(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const identifier = args._[1] || (args.run && args.run !== true ? args.run : undefined);

  if (!identifier) {
    console.error('Usage: cli.js use <run-folder-name-or-RunID>   (see `cli.js list`)');
    process.exitCode = 1;
    return;
  }

  try {
    const pointer = setActiveRun(runsDir, identifier, {
      now: new Date(),
      ...(args['set-by'] && args['set-by'] !== true ? { setBy: args['set-by'] } : {}),
      ...(args.note && args.note !== true ? { note: args.note } : {}),
    });

    if (args.json) {
      console.log(JSON.stringify(pointer, null, 2));
      return;
    }

    const { folderName, status, stagesPresent } = pointer.activeRun;
    console.log(`Active run -> ${folderName}`);
    if (status) console.log(`  status: ${status}`);
    console.log(`  stages present: ${stagesPresent.length ? stagesPresent.join(', ') : 'none yet'}`);
    if (pointer.previousRun) console.log(`  previous: ${pointer.previousRun}`);
    printLineage(runsDir, folderName);
    printDrift(runsDir, folderName, resolveRoots(args));
  } catch (err) {
    if (err instanceof ActiveRunError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

/**
 * Reports what changed in the Target Project since this run was anchored. Never silent about an
 * unknown: "unknown" and "unchanged" are different answers, and conflating them is exactly how a
 * stale run's findings get trusted as current.
 */
function printDrift(runsDir, folderName, roots) {
  if (!roots || !roots.targetRoot) return;
  let meta = {};
  try {
    meta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
  } catch { /* no metadata yet — surfaces as no-anchor below */ }

  const drift = computeDrift(
    roots.targetRoot,
    { targetRef: meta.targetRef ?? null, targetRefScope: meta.targetRefScope ?? [] },
    { execFileSync }
  );

  if (drift.status === 'unchanged') {
    console.log('  target project: unchanged since this run was created');
    return;
  }
  if (drift.status === 'moved') {
    console.log(`  target project: MOVED — ${drift.commitsSince} commit(s), ${drift.changedPaths.length} file(s) changed`);
    for (const p of drift.changedPaths.slice(0, 10)) console.log(`      ${p}`);
    if (drift.changedPaths.length > 10) {
      console.log(`      ... and ${drift.changedPaths.length - 10} more (--json for all)`);
    }
    console.log('  -> findings/test cases touching these paths need re-verification before reuse');
    return;
  }
  console.log(`  target project: drift UNKNOWN (${drift.status}) — ${drift.summary}`);
}

/** Reports inheritance, so a refinement run never reads as a standalone one. */
function printLineage(runsDir, folderName) {
  const lineage = readLineage(runsDir, folderName);
  if (!lineage) return;
  console.log(`  inherits from: ${lineage.inheritsFrom}`);
  const stages = (lineage.inheritedArtifacts || []).map((a) => a.stage).join(', ');
  if (stages) console.log(`  inherited stages: ${stages}`);
}

/**
 * `refine <prior-run>` — "enhance what an earlier run delivered, against the project's CURRENT state."
 *
 * Creates a NEW run that inherits the prior run's artifacts BY REFERENCE and supersedes it, anchors
 * itself to today's target code state, and records the drift so stages know what to re-verify.
 * The prior run is never modified — it stays a valid record of what was true at its own targetRef.
 */
function cmdRefine(args) {
  const roots = resolveRoots(args);
  if (!roots) return;
  const { runsDir, targetRoot } = roots;
  const prior = args._[1] || (args.from && args.from !== true ? args.from : undefined);

  if (!prior) {
    console.error('Usage: cli.js refine <prior-run> [--scope S] [--target T] [--reason "..."] [--scope-paths a,b] [--dry-run]');
    process.exitCode = 1;
    return;
  }

  const scopePaths = args['scope-paths'] && args['scope-paths'] !== true
    ? String(args['scope-paths']).split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  let plan;
  try {
    plan = planRefinement(runsDir, prior, {
      now: new Date(),
      ...(args.scope && args.scope !== true ? { scope: args.scope } : {}),
      ...(args.target && args.target !== true ? { target: args.target } : {}),
      ...(targetRoot ? { targetRoot, execFileSync } : {}),
      scopePaths,
    });
  } catch (err) {
    if (err instanceof LineageError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (args.json && args['dry-run']) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  console.log('Refinement plan');
  console.log(`  prior run:    ${plan.priorRunFolder}`);
  console.log(`  new run:      ${plan.newRunFolder}`);
  console.log(`  scope/target: ${plan.scope} / ${plan.target}`);
  console.log('  inheritable artifacts:');
  if (!plan.inheritable.length) {
    console.log('      (none — the prior run produced no stage artifacts)');
  }
  for (const item of plan.inheritable) {
    const state = item.approved === true ? 'Approved' : item.approved === false ? 'NOT approved' : 'status unknown';
    console.log(`      ${item.stage.padEnd(17)} ${state}  (${item.files.length} file(s))`);
  }
  if (plan.drift) {
    console.log(`  drift since prior run: ${plan.drift.status}`);
    console.log(`      ${plan.drift.summary}`);
    for (const p of (plan.drift.changedPaths || []).slice(0, 10)) console.log(`      ~ ${p}`);
  }

  if (args['dry-run']) {
    console.log('\n(dry run — nothing created)');
    return;
  }

  // Creation goes through the shared creator (run_manager.md §5.10), so a refinement run gets the
  // same guarantees as any other: an attempted code-state anchor with a stated reason, metadata/,
  // and a Run Manifest. Previously this was inline logic only refine had.
  let created;
  try {
    created = createRun(runsDir, {
      folderName: plan.newRunFolder,
      scope: plan.scope,
      target: plan.target,
      now: new Date(),
      ...(targetRoot ? { targetRoot, execFileSync } : {}),
      scopePaths,
      createdBy: 'Run Manager (refine)',
      // Duplicated onto run.json so a reader of it alone still sees the inheritance.
      extraRunJson: { inheritsFrom: plan.priorRunFolder, supersedes: plan.priorRunFolder },
      activate: true,
    });
  } catch (err) {
    if (err instanceof CreateRunError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  const record = writeLineage(runsDir, plan, {
    ...(args.reason && args.reason !== true ? { reason: args.reason } : {}),
    setBy: 'Run Manager (refine)',
  });

  // Record each inherited artifact in the Manifest — this is pipeline.md §7's "records the source
  // run in its own Run Manifest" obligation, now written rather than left to a human.
  for (const item of record.inheritedArtifacts) {
    recordReuse(runsDir, plan.newRunFolder, {
      artifact: `${item.stage}/ (${item.files.length} file(s))`,
      sourceRun: plan.priorRunFolder,
      mode: 'Referenced',
      sourceApproved: item.approved,
      driftStatus: plan.drift ? plan.drift.status : undefined,
      now: new Date(),
    });
  }

  console.log(`\nCreated ${plan.newRunFolder} and made it the active run.`);
  console.log(`  lineage:   metadata/${LINEAGE_FILENAME}`);
  console.log(`  manifest:  metadata/RunManifest.md`);
  console.log(`  targetRef: ${created.anchor.targetRef ? created.anchor.targetRef.slice(0, 7) : 'null'} (${created.anchor.targetRefReason})`);
  console.log(`  inherited: ${record.inheritedArtifacts.map((a) => a.stage).join(', ') || 'nothing'}`);
  console.log('\nThe prior run was not modified.');
}

/** `drift` — what changed in the Target Project since the active run (or --run <r>) was anchored. */
function cmdDrift(args) {
  const roots = resolveRoots(args);
  if (!roots) return;
  const { runsDir, targetRoot } = roots;
  const folderName = (args.run && args.run !== true)
    ? resolveRunFolder(runsDir, args.run)
    : resolveActiveRunFolder(runsDir);

  if (!folderName) {
    console.error('No run to report on. Pass --run <run>, or set an active run first.');
    process.exitCode = 1;
    return;
  }
  if (!targetRoot) {
    console.error('No Target Project root resolved — drift cannot be computed.');
    process.exitCode = 1;
    return;
  }

  let meta = {};
  try {
    meta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
  } catch { /* no anchor — reported as such */ }

  const drift = computeDrift(
    targetRoot,
    { targetRef: meta.targetRef ?? null, targetRefScope: meta.targetRefScope ?? [] },
    { execFileSync }
  );

  if (args.json) {
    console.log(JSON.stringify({ runFolder: folderName, ...drift }, null, 2));
  } else {
    console.log(`Run: ${folderName}`);
    console.log(`Status: ${drift.status}`);
    console.log(drift.summary);
    if (drift.recordedRef) console.log(`  anchored at: ${drift.recordedRef.slice(0, 7)}`);
    if (drift.currentRef) console.log(`  current:     ${drift.currentRef.slice(0, 7)}`);
    if (drift.changedPaths && drift.changedPaths.length) {
      console.log('  changed files:');
      for (const p of drift.changedPaths) console.log(`      ${p}`);
    }
  }
  // Non-zero on anything but "unchanged", so a script can gate on "is this run still current?".
  if (drift.status !== 'unchanged') process.exitCode = 2;
}
/**
 * `new` — create a run the way every workflow Step 1 should: name it, anchor it to the Target
 * Project's current code state, write its Run Manifest, and (unless --no-activate) make it active.
 *
 * This exists because run creation used to be a prose checklist, and the code-state anchor was
 * written only if someone remembered the spec line (run_manager.md §5.10).
 */
function cmdNew(args) {
  const roots = resolveRoots(args);
  if (!roots) return;
  const { runsDir, targetRoot } = roots;

  const scope = args.scope && args.scope !== true ? args.scope : undefined;
  const target = args.target && args.target !== true ? args.target : undefined;
  if (!scope) {
    console.error('Usage: cli.js new --scope <Scope> --target <Target> [--workflow W] [--scope-paths a,b] [--no-activate]');
    process.exitCode = 1;
    return;
  }

  const scopePaths = args['scope-paths'] && args['scope-paths'] !== true
    ? String(args['scope-paths']).split(',').map((x) => x.trim()).filter(Boolean)
    : [];

  let res;
  try {
    res = createRun(runsDir, {
      scope,
      target,
      now: new Date(),
      ...(targetRoot ? { targetRoot, execFileSync } : {}),
      scopePaths,
      ...(args.workflow && args.workflow !== true ? { workflow: args.workflow } : {}),
      ...(args['created-by'] && args['created-by'] !== true ? { createdBy: args['created-by'] } : {}),
      extraRunJson: scopeFieldsFromArgs(args),
      activate: !args['no-activate'],
    });
  } catch (err) {
    if (err instanceof CreateRunError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (args.json) {
    console.log(JSON.stringify(res, null, 2));
    return;
  }
  console.log(`Created ${res.folderName}`);
  console.log(`  path:      platform_core_data/runs/${res.folderName}`);
  console.log(`  targetRef: ${res.anchor.targetRef ? res.anchor.targetRef.slice(0, 7) : 'null'} (${res.anchor.targetRefReason})`);
  console.log(`  manifest:  metadata/RunManifest.md`);
  console.log(res.activated ? '  active:    yes' : '  active:    no (--no-activate)');
  if (!res.anchor.targetRef) {
    console.log('\nNote: no code-state anchor, so drift for this run will read `unknown-no-anchor`.');
    console.log('It is declared as a gap in the Run Manifest rather than left implicit.');
  }
}

/** `stage` — record a stage's checkpoint state in the active run's Run Manifest. */
function cmdStage(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const folderName = (args.run && args.run !== true)
    ? resolveRunFolder(runsDir, args.run)
    : resolveActiveRunFolder(runsDir);
  if (!folderName) {
    console.error('No run to record against. Pass --run <run>, or set an active run first.');
    process.exitCode = 1;
    return;
  }

  const stage = args._[1] || (args.stage && args.stage !== true ? args.stage : undefined);
  const status = args.status && args.status !== true ? args.status : undefined;
  if (!stage || !status) {
    console.error('Usage: cli.js stage "<Stage name>" --status <' + CHECKPOINT_STATUSES.join('|') + '> \\');
    console.error('         [--reviewer R] [--revisions N] [--invocation <' + INVOCATION_PATHS.join('|') + '>] \\');
    console.error('         [--artifact <path>] [--instruction "..."] [--feedback "..."] [--run <r>]');
    process.exitCode = 1;
    return;
  }

  try {
    recordStage(runsDir, folderName, {
      stage,
      checkpointStatus: status,
      ...(args.artifact && args.artifact !== true ? { artifactPath: args.artifact } : {}),
      ...(args.reviewer && args.reviewer !== true ? { reviewer: args.reviewer } : {}),
      ...(args.revisions && args.revisions !== true ? { revisions: Number(args.revisions) } : {}),
      ...(args.invocation && args.invocation !== true ? { invocationPath: args.invocation } : {}),
      ...(args.instruction && args.instruction !== true ? { instruction: args.instruction } : {}),
      ...(args.feedback && args.feedback !== true ? { feedback: args.feedback } : {}),
      now: new Date(),
    });
  } catch (err) {
    if (err instanceof ManifestError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
  console.log(`${folderName}: ${stage} -> ${status}`);
}

/** `manifest` — read the Run Manifest's stage ledger back as data ("where are we right now?"). */
function cmdManifest(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const folderName = (args.run && args.run !== true)
    ? resolveRunFolder(runsDir, args.run)
    : resolveActiveRunFolder(runsDir);
  if (!folderName) {
    console.error('No run to read. Pass --run <run>, or set an active run first.');
    process.exitCode = 1;
    return;
  }

  // --gap / --reuse write; without them the verb reads.
  if (args.gap && args.gap !== true) {
    recordGap(runsDir, folderName, {
      gap: args.gap,
      ...(args.stage && args.stage !== true ? { stage: args.stage } : {}),
      ...(args.why && args.why !== true ? { why: args.why } : {}),
      ...(args['reported-in'] && args['reported-in'] !== true ? { reportedIn: args['reported-in'] } : {}),
      now: new Date(),
    });
    console.log(`${folderName}: gap recorded`);
    return;
  }
  if (args.reuse && args.reuse !== true) {
    const source = args.from && args.from !== true ? args.from : undefined;
    if (!source) {
      console.error('Usage: cli.js manifest --reuse <artifact> --from <source-run> [--mode Referenced|Copied] [--drift <status>]');
      process.exitCode = 1;
      return;
    }
    recordReuse(runsDir, folderName, {
      artifact: args.reuse,
      sourceRun: source,
      ...(args.mode && args.mode !== true ? { mode: args.mode } : {}),
      ...(args.drift && args.drift !== true ? { driftStatus: args.drift } : {}),
      now: new Date(),
    });
    console.log(`${folderName}: reuse recorded`);
    return;
  }

  const { stages, lastUpdated } = readManifest(runsDir, folderName);
  if (args.json) {
    console.log(JSON.stringify({ runFolder: folderName, lastUpdated, stages }, null, 2));
    return;
  }
  console.log(`Run: ${folderName}`);
  console.log(`Last updated: ${lastUpdated || 'unknown'}`);
  if (!stages.length) {
    console.log('No stage has run yet.');
    return;
  }
  for (const s of stages) {
    console.log(`  ${s.stage.padEnd(34)} ${(s.checkpointStatus || '—').padEnd(28)} rev ${s.revisions || '0'}  ${s.invocationPath || ''}`);
  }
}

/** `anchor` — backfill the code-state anchor onto a run created without one. */
function cmdAnchor(args) {
  const roots = resolveRoots(args);
  if (!roots) return;
  const { runsDir, targetRoot } = roots;
  const folderName = (args.run && args.run !== true)
    ? resolveRunFolder(runsDir, args.run)
    : resolveActiveRunFolder(runsDir);
  if (!folderName) {
    console.error('No run to anchor. Pass --run <run>, or set an active run first.');
    process.exitCode = 1;
    return;
  }
  if (!targetRoot) {
    console.error('No Target Project root resolved — an anchor cannot be captured.');
    process.exitCode = 1;
    return;
  }

  const scopePaths = args['scope-paths'] && args['scope-paths'] !== true
    ? String(args['scope-paths']).split(',').map((x) => x.trim()).filter(Boolean)
    : [];

  const res = backfillTargetRef(runsDir, folderName, {
    now: new Date(), targetRoot, scopePaths, execFileSync, force: Boolean(args.force),
  });

  if (!res.updated) {
    console.error(res.reason);
    process.exitCode = 1;
    return;
  }
  console.log(`${folderName}: anchor backfilled -> ${res.anchor.targetRef ? res.anchor.targetRef.slice(0, 7) : "null"}`);
  console.log('  NOTE: a backfilled anchor is the code state NOW, not when the run executed —');
  console.log('        drift measured from it understates what actually changed since the run.');
}
/**
 * `scope-change` — the one supported path to mutate a Supplier-Feature run's frozen scope after
 * creation (module_architecture.md §11.5.1). Refuses on a classic run, requires --approved-by and
 * --reason, and appends the change to `scopeHistory` rather than overwriting it.
 */
function cmdScopeChange(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const folderName = (args.run && args.run !== true)
    ? resolveRunFolder(runsDir, args.run)
    : resolveActiveRunFolder(runsDir);
  if (!folderName) {
    console.error('No run to change. Pass --run <run>, or set an active run first.');
    process.exitCode = 1;
    return;
  }

  const approvedBy = args['approved-by'] && args['approved-by'] !== true ? args['approved-by'] : undefined;
  const reason = args.reason && args.reason !== true ? args.reason : undefined;
  if (!approvedBy || !reason) {
    console.error(
      'Usage: cli.js scope-change [--run <r>] --approved-by "<name>" --reason "..." \\\n' +
      '         [--feature F] [--supplier S | --clear-supplier] \\\n' +
      '         [--shared-scope SS | --clear-shared-scope] \\\n' +
      '         [--testing-layer-scope <json> | --clear-testing-layer-scope]'
    );
    process.exitCode = 1;
    return;
  }

  const changes = {};
  const setOrClear = (field, flag, clearFlag) => {
    if (args[clearFlag]) { changes[field] = null; return; }
    if (args[flag] && args[flag] !== true) changes[field] = args[flag];
  };
  // No `service` flag: the Service tier is retired, and `scopeFamily` — its replacement — is frozen
  // absolutely rather than changeable (see SCOPE_FREEZE_FIELDS in createRun.js).
  setOrClear('feature', 'feature', 'clear-feature');
  setOrClear('supplier', 'supplier', 'clear-supplier');
  setOrClear('sharedScope', 'shared-scope', 'clear-shared-scope');
  if (args['clear-testing-layer-scope']) {
    changes.testingLayerScope = null;
  } else if (args['testing-layer-scope'] && args['testing-layer-scope'] !== true) {
    try {
      changes.testingLayerScope = JSON.parse(args['testing-layer-scope']);
    } catch {
      console.error('--testing-layer-scope must be valid JSON (a string is also valid JSON — quote it: \'"UI only"\').');
      process.exitCode = 1;
      return;
    }
  }

  try {
    const res = changeSupplierFeatureRunScope(runsDir, folderName, { now: new Date(), approvedBy, reason, changes });
    if (args.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    console.log(`${folderName}: NDC scope changed (approved by ${approvedBy})`);
    console.log(`  reason:   ${reason}`);
    console.log(`  previous: ${JSON.stringify(res.previous)}`);
    console.log(`  next:     ${JSON.stringify(res.next)}`);
  } catch (err) {
    if (err instanceof CreateRunError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

function cmdList(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const runs = listRuns(runsDir);
  const active = resolveActiveRunFolder(runsDir);

  if (args.json) {
    console.log(JSON.stringify({ activeRun: active, runs }, null, 2));
    return;
  }

  if (!runs.length) {
    console.log(`No runs yet under ${runsDir}.`);
    return;
  }

  for (const run of runs) {
    const marker = run.folderName === active ? '*' : ' ';
    const owner = run.runOwner ? `${run.runOwner.padEnd(18)} ` : `${'(unowned)'.padEnd(18)} `;
    const status = run.status ? ` [${run.status}]` : '';
    const stages = run.stagesPresent.length ? `  (${run.stagesPresent.join(', ')})` : '  (no stages yet)';
    console.log(`${marker} ${owner} ${run.folderName}${status}${stages}`);
  }
  if (active) console.log('\n* = active run');
}

/** Parses --assign "<run>=<owner>,<run>=<owner>" into { run: owner }. */
function parseAssign(raw) {
  const out = {};
  if (!raw) return out;
  for (const pair of String(raw).split(',').map((s) => s.trim()).filter(Boolean)) {
    const eq = pair.lastIndexOf('=');
    if (eq <= 0) throw new RenameRunsError(`--assign entry "${pair}" is not <run>=<owner>.`);
    out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

/**
 * `rename-runs` — move existing runs onto their Feature/module's own `<owner>-run-NNN` sequence.
 * Plans by default and writes nothing; `--apply` needs --approved-by and --reason, because this is the
 * one sanctioned exception to run immutability (run_manager.md §5.1.1, §5.6).
 */
function cmdRenameRuns(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;

  let plan;
  try {
    plan = planRunRenames(runsDir, { assign: parseAssign(argValue(args, 'assign')) });
  } catch (err) {
    if (err instanceof RenameRunsError || err instanceof TypeError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (!args.apply) {
    if (args.json) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      console.log(`Rename plan — ${plan.renames.length} run(s) to rename (nothing written)\n`);
      for (const r of plan.renames) {
        console.log(`  ${r.from}\n    -> ${r.to}    (owner from ${r.ownerSource})`);
      }
      if (plan.unchanged.length) {
        console.log(`\nAlready on their owner's sequence: ${plan.unchanged.map((u) => u.folderName).join(', ')}`);
      }
      if (plan.unowned.length) {
        console.log('\nNo owner recorded — left as they are (give one with --assign "<run>=<owner>"):');
        for (const u of plan.unowned) console.log(`  ${u.folderName}`);
      }
      if (plan.errors.length) {
        console.log('\nErrors — the plan cannot be applied until these are resolved:');
        for (const e of plan.errors) console.log(`  ${e.folderName}: ${e.error}`);
      }
      console.log('\nApply with: --apply --approved-by "<name>" --reason "..."');
    }
    if (plan.errors.length) process.exitCode = 1;
    return;
  }

  try {
    const res = applyRunRenames(runsDir, plan, {
      now: new Date(),
      approvedBy: argValue(args, 'approved-by'),
      reason: argValue(args, 'reason'),
      ...(args['no-rewrite-refs'] ? { rewriteRoot: null } : {}),
    });
    if (args.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    console.log(`Renamed ${res.renamed.length} run(s).`);
    for (const r of res.renamed) console.log(`  ${r.from} -> ${r.to}`);
    console.log(`References rewritten: ${res.replacements} in ${res.filesChanged.length} file(s).`);
    if (res.activeRunUpdated) console.log('Active run pointer updated.');
    console.log(`Old names still resolve through ${path.join('runs', '.run_folder_index.json')}.`);
  } catch (err) {
    if (err instanceof RenameRunsError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

function cmdRefresh(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const pointer = refreshActiveRun(runsDir);
  if (!pointer) {
    console.error('No active run to refresh.');
    process.exitCode = 1;
    return;
  }
  if (args.json) {
    console.log(JSON.stringify(pointer, null, 2));
  } else {
    console.log(`Refreshed ${pointer.activeRun.folderName} — status: ${pointer.activeRun.status ?? 'unknown'}`);
  }
}

function cmdClear(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  console.log(clearActiveRun(runsDir) ? 'Active run pointer cleared.' : 'No active run pointer to clear.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  // Backward compatible: no verb (or an unrecognized first token) keeps the original naming behavior,
  // so existing callers passing only --scope/--target are unaffected.
  const verb = VERBS.has(args._[0]) ? args._[0] : 'name';

  switch (verb) {
    case 'active': return cmdActive(args);
    case 'use': return cmdUse(args);
    case 'list': return cmdList(args);
    case 'refresh': return cmdRefresh(args);
    case 'clear': return cmdClear(args);
    case 'refine': return cmdRefine(args);
    case 'drift': return cmdDrift(args);
    case 'new': return cmdNew(args);
    case 'stage': return cmdStage(args);
    case 'manifest': return cmdManifest(args);
    case 'anchor': return cmdAnchor(args);
    case 'scope-change': return cmdScopeChange(args);
    case 'rename-runs': return cmdRenameRuns(args);
    default: return cmdName(args);
  }
}

if (require.main === module) {
  main();
}
