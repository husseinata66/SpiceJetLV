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
//                                               # record a stage checkpoint in the Run Manifest ONLY
//                                               # (display; never an approval in the run state model)
//
//   # run & stage state model (runState.js, run_manager.md §8.1) — every write accepts
//   # [--run <r>] [--by "<name>"] [--expected-revision N] [--json]
//   node .../cli.js state show [<stage>]                         # run + stage state (read-only)
//   node .../cli.js state verify <stage>                         # re-check approval against headers (exit 2 = not verified)
//   node .../cli.js state gate <stage> --invocation <...> [gate options]      # entry gate, read-only (exit 2 = blocked)
//   node .../cli.js state start <stage> --invocation <Pipeline|Direct|Direct (degraded)> [--instruction "..."] [gate options]
//                                               # runs the entry gate first; refuses (exit 2) when it blocks
//     gate options: [--modules a,b] [--module-feature F] [--accept-stale-by "<name>"] [--scope-items a,b --by "<name>"]
//                   [--environment-supplied] [--named-test-cases] [--external-reports]
//   node .../cli.js state approve-scope --artifact <path> --approved-by "<name>"  # record a partial (item-level) approval of a Mixed artifact
//   node .../cli.js state preflight <4M|5A|5H> --environment <env> --target-url <url> --execution-type <browser|api|database|batch|other>
//                    [--execution-mode Headed|Headless] --operations <ops.json|JSON> --confirmed-by "<name>"
//                                              # the mandatory Safety Preflight before real execution (Phase 9.2)
//   node .../cli.js state attest-legacy-approval --artifact <path> --legacy-run <folder> --approved-by "<name>" --reason "..."
//                                              # carry a pre-state-model approval forward: a named human attests it,
//                                              # backed by committed legacy-run evidence (legacyProvenance.js, Phase 9.1)
//   node .../cli.js state workflow <full-manual|full-automation|specific-stage> [--stage <ID>] --by "<name>" [--reason "..."]
//   node .../cli.js state plan [--json]       # every stage: done / pending / blocked / skipped, revalidation, next action
//   node .../cli.js state next [--json]       # the next action only (exit 0 = a stage may start, 3 = Human Decision, 4 = nothing left)
//   node .../cli.js state status [--json]     # workflow completion, test outcome and approvals — reported apart
//   node .../cli.js state outcome <4M|5A|5H> --from-results      # read the result files (all cycles) — the normal path
//   node .../cli.js state outcome <4M|5A|5H> --passed N [--failed N --blocked N ...] [--source <path>]   # typed counts
//   node .../cli.js state history <4M|5A|5H> [--json]               # every cycle, final + first-attempt status per test
//   node .../cli.js state report-path [--json]                      # where the next Final QA Report goes (rev-N, never over one)
//   node .../cli.js state report-check --model <m.report.json> [--md <m.md>] [--html <m.html>]  # exit 2 if they disagree
//   node .../cli.js state recover <stage> --by "<name>" --reason "..."   # a stage left Running by an interrupted session -> Failed, then retry
//   node .../cli.js state trace [--json]                            # Requirement → Finding → Test Case → Automation → Execution → Report, gaps, conflicts
//   node .../cli.js state reuse                                     # whether each scope's approved Project Context can be reused as it is
//   node .../cli.js state impact --artifact <path> (--base <git-rev> | --changed a,b) [--json]
//        [--record --decision approved|rejected --by "<name>" --reason "..." [--approved-modules a,b] [--approved-suppliers x,y]]
//   node .../cli.js state conflicts [--json]  ·  state conflict-decision --id CF-… --decision "..." --by "<name>"
//   node .../cli.js state duplicates --story <file> | --suite <existing.md> --proposed <proposed.md> | --finding "<text>" --module <m>
//   node .../cli.js state reconcile                                # replay run-state events the Manifest is missing
//   # Stage 5H repair governance (repairGovernance.js) — every step named, recorded, refusable
//   node .../cli.js state heal open --tests TC-1,TC-2 --environment QA --reason "..." --by "<name>"
//   node .../cli.js state heal classify --test TC-1 --class automation|application|environment|infrastructure|test-data|unknown --evidence "..." --by "<name>"
//   node .../cli.js state heal propose --test TC-1 --strategy "..." --reason "..." --patch <runs/…/x.diff> --root-cause-confidence High --factors "observed-root-cause:55:<cite>;…" [--novel] --by "<name>"
//   node .../cli.js state heal batch-approve --by "<name>"  ·  heal approve --test TC-1 --attempt N --by "<name>"   (Medium/Low)
//   node .../cli.js state heal apply --test TC-1 --attempt N [--restore-point <commit>] --by "<name>"
//   node .../cli.js state heal validate --test TC-1 --attempt N --rerun <rerun-N.md> [--regression TC-2@<rerun.md>,…] [--mutating] --by "<name>"
//   node .../cli.js state heal prod-access --scope "..." --read-only --by "<name>"  ·  heal promote --test TC-1 --attempt N --title … --body … --by "<name>"
//   node .../cli.js state heal grant-budget --test TC-1 --basis changed-failure|new-run --reason "..." --by "<name>"
//   node .../cli.js state heal close --by "<name>"  ·  heal report [--json]
//   node .../cli.js state artifact <stage> --artifacts a,b [--kind checkpoint|output|evidence]
//   node .../cli.js state request-approval <stage> [--artifacts a,b]  # Running -> Waiting For Approval
//   node .../cli.js state correct-checkpoint <stage> --artifact <path> --as output|evidence --by "<name>" --reason "..."
//                                               # a checkpoint registered in error; a waiting stage goes back to Blocked
//   node .../cli.js state approve <stage> --approved-by "<name>"      # refused unless every header reads Approved
//   node .../cli.js state reject <stage> --rejected-by "<name>" --feedback "..."
//   node .../cli.js state complete <stage>                       # 5A / 6A only (no checkpoint)
//   node .../cli.js state block <stage> --reason "..."  |  state fail <stage> --reason "..."
//   node .../cli.js state reopen <stage> --by "<name>" --reason "..."
//   node .../cli.js state run <pause|resume|complete|fail|cancel> [--by "<name>"] [--reason "..."]
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

const runState = require('./runState');

const VERBS = new Set([
  'name', 'active', 'use', 'list', 'refresh', 'clear', 'refine', 'drift',
  'new', 'stage', 'manifest', 'anchor', 'scope-change', 'rename-runs', 'state',
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
      requireRegisteredScope: true,
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
  // The folder as created — under --runs-dir when one was given (audit finding #10).
  console.log(`  path:      ${path.relative(process.cwd(), path.join(runsDir, res.folderName)).replace(/\\/g, '/') || '.'}`);
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
      console.error(err.code ? `${err.code}: ${err.message}` : err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
  console.log(`${folderName}: ${stage} -> ${status}`);
  if (status === 'Approved') {
    console.error(
      'Note: this records the Run Manifest row only. It does not approve the stage in the run state ' +
      'model — that is `cli.js state approve <stage> --approved-by "<name>"`, which checks the ' +
      'artifact header first.'
    );
  }
}

/** Prints a run-state result as JSON or as a short human summary. */
function printState(state, args, extra = {}) {
  if (args.json) {
    console.log(JSON.stringify({ ...extra, ...state }, null, 2));
    return;
  }
  console.log(`Run: ${state.folderName}${state.legacy ? '  (legacy — predates the run state model)' : ''}`);
  console.log(`Status: ${state.status}${state.legacy ? `  (recorded: ${state.recordedStatus ?? 'none'})` : ''}` +
    `${state.revision !== null ? `  · revision ${state.revision}` : ''}`);
  if (state.statusReason) console.log(`Reason: ${state.statusReason}`);
  for (const id of runState.STAGE_IDS) {
    const s = state.stages[id];
    const approval = s.approval?.status ? `  [${s.approval.status}${s.approval.approvedBy ? ` by ${s.approval.approvedBy}` : ''}]` : '';
    console.log(`  ${id.padEnd(3)} ${s.name.padEnd(34)} ${String(s.status).padEnd(21)}${approval}${s.reason ? `  — ${s.reason}` : ''}`);
  }
  if (extra.manifest && extra.manifest.synced === false) {
    console.error(`Warning: run.json was updated, but the Run Manifest was not: ${extra.manifest.reason}`);
  }
}

/** Prints a plan / next / status result for a human. */
function printPlan(res, sub) {
  console.log(`Run: ${res.folderName}`);
  if (res.workflow) console.log(`Workflow: ${res.workflow.type} (${res.workflow.stages.join(' → ')}), selected by ${res.workflow.selectedBy}`);
  console.log(`Workflow status: ${res.workflowStatus}${res.runStatus ? `   ·   run: ${res.runStatus}` : ''}`);
  if (res.testOutcome) console.log(`Test outcome: ${res.testOutcome.overall}   (${Object.entries(res.testOutcome.byStage).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none recorded'})`);
  if (res.approvals) console.log(`Approvals: approved [${res.approvals.approved.join(', ')}] · needs revalidation [${(res.approvals.needsRevalidation || []).join(', ')}] · pending [${res.approvals.pending.join(', ')}] · rejected [${res.approvals.rejected.join(', ')}] · partial scope [${res.approvals.partialScope.join(', ')}]`);
  if (sub === 'plan') {
    for (const s of res.stages) {
      console.log(`  ${s.stageId.padEnd(3)} ${s.name.padEnd(34)} ${s.category.padEnd(19)} ${s.status}${s.approval ? ` [${s.approval}]` : ''}`);
      for (const i of s.issues || []) console.log(`        ! ${i}`);
    }
  }
  const n = res.next;
  console.log(`Next: ${n.action}${n.stageId ? ` (Stage ${n.stageId})` : ''}${n.humanDecision ? '  — HUMAN DECISION' : ''}`);
  console.log(`  ${n.reason}`);
  if (n.command) console.log(`  command: ${n.command}`);
  for (const o of n.options || []) console.log(`  option:  ${o}`);
  for (const b of n.blockers || []) console.log(`  blocked: ${b}`);
}

/** Prints an entry-gate result: the decision, then why. */
function printGate(gate, args) {
  if (args.json) {
    console.log(JSON.stringify(gate, null, 2));
    return;
  }
  console.log(`Entry gate — Stage ${gate.stageId} (${gate.invocationPath || 'no invocation path'}): ${gate.decision.toUpperCase()}`);
  if (gate.scope && gate.scope.length) console.log(`  scope: ${gate.scope.join(', ')}`);
  for (const c of gate.checks) {
    console.log(`  [${c.result}] Stage ${c.stage} · ${c.scope}${c.artifact ? ` · ${c.artifact}` : ''}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  for (const g of gate.gaps) console.log(`  gap (declared, degraded): ${g}`);
  for (const w of gate.warnings || []) console.log(`  warning: ${w}`);
  if (gate.partialScope) console.log(`  partial scope: ${gate.partialScope.items.length} requested item(s), closure ${gate.partialScope.closure.length}, ${gate.partialScope.proven ? 'proven independent' : 'NOT proven'}`);
  if (gate.suggestedScope) console.log(`  provably independent approved items (a human decides whether to use them): ${gate.suggestedScope.join(',')}`);
  for (const b of gate.blockers) console.error(`  BLOCKED: ${b}`);
}

/** `state` — read and record the run & stage state model (runState.js). */
function cmdState(args) {
  const runsDir = resolveRunsDir(args);
  if (!runsDir) return;
  const folderName = (args.run && args.run !== true)
    ? resolveRunFolder(runsDir, args.run)
    : resolveActiveRunFolder(runsDir);
  if (!folderName) {
    console.error('No run. Pass --run <run>, or set an active run first.');
    process.exitCode = 1;
    return;
  }

  const sub = args._[1] || 'show';
  const stageId = args._[2];
  const list = (key) => (argValue(args, key) ? argValue(args, key).split(',').map((x) => x.trim()).filter(Boolean) : []);
  const gateOpts = {
    ...(list('modules').length ? { modules: list('modules') } : {}),
    ...(argValue(args, 'module-feature') ? { moduleFeature: argValue(args, 'module-feature') } : {}),
    ...(argValue(args, 'accept-stale-by') ? { acceptStaleBy: argValue(args, 'accept-stale-by') } : {}),
    ...(list('scope-items').length ? { scopeItems: list('scope-items') } : {}),
    conditions: {
      ...(args['environment-supplied'] ? { environmentSupplied: true } : {}),
      ...(args['named-test-cases'] ? { namedTestCases: true } : {}),
      ...(args['external-reports'] ? { externalReports: true } : {}),
    },
  };
  const common = {
    now: new Date(),
    ...(argValue(args, 'by') ? { by: argValue(args, 'by') } : {}),
    ...(argValue(args, 'expected-revision') !== undefined ? { expectedRevision: Number(argValue(args, 'expected-revision')) } : {}),
  };

  try {
    if (sub === 'heal') {
      // Stage 5H repair governance (repairGovernance.js, Phase 6). Each verb records one step and refuses
      // a step that breaks a rule; none of them edits code, runs a test, or invokes Stage 5H.
      // eslint-disable-next-line global-require
      const heal = require('./repairGovernance');
      const action = args._[2];
      const test = argValue(args, 'test');
      const attempt = argValue(args, 'attempt') !== undefined ? Number(argValue(args, 'attempt')) : undefined;
      // --factors "observed-root-cause:55:trace step 4;targets-root-cause:15:locator swap"
      const factors = (argValue(args, 'factors') || '').split(';').map((x) => x.trim()).filter(Boolean).map((x) => {
        const [factor, value, ...rest] = x.split(':');
        return { factor: factor.trim(), ...(value && value.trim() ? { value: Number(value) } : {}), citation: rest.join(':').trim() };
      });
      const ops = {
        open: () => heal.openRepairOperation(runsDir, folderName, { ...common, tests: list('tests'), environment: argValue(args, 'environment'), reason: argValue(args, 'reason') }),
        classify: () => heal.classifyFailure(runsDir, folderName, { ...common, testCaseId: test, class: argValue(args, 'class'), evidence: argValue(args, 'evidence') }),
        propose: () => heal.proposeRepair(runsDir, folderName, { ...common, testCaseId: test, strategy: argValue(args, 'strategy'), reason: argValue(args, 'reason'), patch: argValue(args, 'patch'), factors, novel: Boolean(args.novel), rootCauseConfidence: argValue(args, 'root-cause-confidence') }),
        'batch-approve': () => heal.batchApprove(runsDir, folderName, common),
        approve: () => heal.approveRepair(runsDir, folderName, { ...common, testCaseId: test, attempt }),
        apply: () => heal.applyRepair(runsDir, folderName, { ...common, testCaseId: test, attempt, restorePoint: argValue(args, 'restore-point') }),
        validate: () => heal.validateRepair(runsDir, folderName, { ...common, testCaseId: test, attempt, rerun: argValue(args, 'rerun'), regression: list('regression'), mutating: Boolean(args.mutating) }),
        'prod-access': () => heal.approveProductionAccess(runsDir, folderName, { ...common, scope: argValue(args, 'scope'), readOnly: Boolean(args['read-only']) }),
        promote: () => heal.promoteRepairKnowledge(runsDir, folderName, { ...common, testCaseId: test, attempt, title: argValue(args, 'title'), body: argValue(args, 'body') }),
        close: () => heal.closeRepairOperation(runsDir, folderName, common),
        'grant-budget': () => heal.grantRepairBudget(runsDir, folderName, { ...common, testCaseId: test, basis: argValue(args, 'basis'), reason: argValue(args, 'reason') }),
      };
      if (action === 'report') {
        const rep = heal.repairReport(runsDir, folderName);
        if (args.json) { console.log(JSON.stringify(rep, null, 2)); return; }
        if (!rep.length) { console.log('No repair operation recorded in this run.'); return; }
        for (const op of rep) {
          console.log(`${op.id} (${op.status}) — invoked by ${op.invokedBy} at ${op.invokedAt} on ${op.environment}: ${op.reason}`);
          for (const t of op.tests) {
            console.log(`  ${t.testCaseId}  recorded ${t.recorded} · class ${t.classification.class}${t.classification.confirmed ? ' (confirmed)' : ''} · ${t.finalStatus} · attempts ${t.cumulative.counted}/${t.cumulative.of}`);
            for (const a of t.attempts) {
              console.log(`    attempt ${a.n}: ${a.strategy} — ${a.confidence.band} ${a.confidence.score} · ${a.status}${a.result ? ` (${a.result})` : ''} · files ${a.filesChanged.join(', ')}${a.beforeAfter ? ` · before ${a.beforeAfter.before} → after ${a.beforeAfter.after}` : ''}${a.regression.length ? ` · regression ${a.regression.map((r) => `${r.testCaseId} ${r.status}`).join(', ')}` : ''}`);
            }
          }
          for (const d of op.decisions) console.log(`  decision  ${d.at}  ${d.by}: ${d.decision}${d.detail ? ` — ${d.detail}` : ''}`);
        }
        return;
      }
      if (!ops[action]) {
        console.error(`Usage: cli.js state heal <${[...Object.keys(ops), 'report'].join('|')}> …`);
        process.exitCode = 1;
        return;
      }
      const res = ops[action]();
      printState(res.state, args);
      return;
    }
    if (sub === 'show') {
      const state = runState.readRunState(runsDir, folderName);
      if (stageId && !args.json) {
        console.log(JSON.stringify(state.stages[runState.normalizeStageId(stageId)], null, 2));
        return;
      }
      printState(state, args);
      return;
    }
    if (sub === 'plan' || sub === 'next' || sub === 'status') {
      // eslint-disable-next-line global-require
      const planner = require('./workflowPlanner');
      const roots = resolveRoots(args);
      const popts = { now: new Date(), ...(roots && roots.targetRoot ? { targetRoot: roots.targetRoot, execFileSync } : {}) };
      const res = sub === 'plan' ? planner.planWorkflow(runsDir, folderName, popts)
        : sub === 'next' ? planner.nextStep(runsDir, folderName, popts) : planner.workflowStatus(runsDir, folderName, popts);
      if (args.json) console.log(JSON.stringify(res, null, 2));
      else printPlan(res, sub);
      if (sub === 'next') process.exitCode = ['none', 'complete-run'].includes(res.next.action) ? 4 : res.next.humanDecision ? 3 : 0;
      return;
    }
    if (sub === 'trace' || sub === 'conflicts') {
      // eslint-disable-next-line global-require
      const { buildTraceGraph } = require('./traceGraph');
      const g = buildTraceGraph(runsDir, folderName, gateOpts);
      const decided = new Map(runState.readRunState(runsDir, folderName).conflictDecisions.map((d) => [d.conflictId, d]));
      const conflicts = g.conflicts.map((c) => ({ ...c, decision: decided.get(c.id) || null }));
      if (args.json) {
        console.log(JSON.stringify(sub === 'conflicts' ? conflicts : {
          roots: g.roots, problem: g.problem, gaps: g.gaps, conflicts,
          graphs: g.graphs.map((x) => ({ scope: x.root.label, testCases: Object.values(x.testCases), findings: [...x.findings], runs: x.runs, reports: x.reports })),
        }, null, 2));
        return;
      }
      if (g.problem) console.error(`Scope: ${g.problem}`);
      if (sub === 'trace') {
        for (const x of g.graphs) {
          const cases = Object.values(x.testCases);
          console.log(`${x.root.label}: ${cases.length} case(s), ${x.findings.size} finding(s), ${cases.filter((c) => c.automationDecision).length} automation decision(s), ${x.runs.length} run(s), ${x.reports.length} report(s)`);
        }
        const kinds = {};
        for (const gp of g.gaps) kinds[gp.kind] = (kinds[gp.kind] || 0) + 1;
        console.log(`Gaps: ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
        for (const gp of g.gaps.slice(0, 40)) console.log(`  - [${gp.scope}] ${gp.detail}`);
      }
      console.log(`Conflicts: ${conflicts.length}`);
      for (const c of conflicts) console.log(`  ${c.id} [${c.kind}] ${c.decision ? `DECIDED by ${c.decision.by}: ${c.decision.decision}` : 'UNDECIDED'} — ${c.detail}`);
      return;
    }
    if (sub === 'reuse') {
      // eslint-disable-next-line global-require
      const res = require('./traceGraph').contextReuse(runsDir, folderName);
      if (args.json) console.log(JSON.stringify(res, null, 2));
      else for (const x of res) console.log(`${x.scope}: ${x.reusable ? 'REUSABLE' : 'not reusable'} — ${x.detail}`);
      return;
    }
    if (sub === 'impact') {
      // eslint-disable-next-line global-require
      const { analyzeImpact } = require('./changeImpact');
      const analysis = analyzeImpact(runsDir, {
        artifact: argValue(args, 'artifact'),
        ...(list('changed').length ? { changed: list('changed') } : {}),
        ...(argValue(args, 'base') ? { base: argValue(args, 'base'), execFileSync } : {}),
      });
      if (args.record) {
        const res = runState.recordImpactDecision(runsDir, folderName, {
          ...common, analysis, decision: argValue(args, 'decision'), reason: argValue(args, 'reason'),
          approvedModules: list('approved-modules'), approvedSuppliers: list('approved-suppliers'),
        });
        console.log(args.json ? JSON.stringify(res.changeRequest, null, 2) : `Recorded ${res.changeRequest.id}: ${res.changeRequest.decision} (${res.changeRequest.classification}) for ${analysis.artifact}`);
        return;
      }
      if (args.json) { console.log(JSON.stringify(analysis, null, 2)); return; }
      const a = analysis.affected;
      console.log(`Impact ${analysis.id} — ${analysis.artifact} — ${analysis.classification.toUpperCase()}${analysis.crossModule ? ' · CROSS-MODULE' : ''}  (HUMAN DECISION)`);
      console.log(`  changed: ${analysis.delta.changed.join(', ') || '—'}   added: ${analysis.delta.added.join(', ') || '—'}   removed: ${analysis.delta.removed.join(', ') || '—'}   (basis: ${analysis.delta.basis})`);
      console.log(`  modules: ${a.modules.join(', ') || '—'}   suppliers: ${a.suppliers.join(', ') || '—'}   findings: ${a.findings.join(', ') || '—'}`);
      console.log(`  test cases: ${a.testCases.length} (approved ${a.approvedTestCases.length})   automation: ${a.automation.length}   executions: ${a.executions.length}   reports: ${a.reports.length}`);
      for (const why of analysis.reasons) console.log(`  - ${why}`);
      console.log(`  record a decision: state impact --artifact ${analysis.artifact} ... --record --decision approved|rejected --by "<name>" --reason "..."${analysis.crossModule ? ` --approved-modules ${a.modules.join(',')}` : ''}`);
      return;
    }
    if (sub === 'duplicates') {
      // eslint-disable-next-line global-require
      const dup = require('./duplicates');
      const dataRoot = path.dirname(runsDir);
      let res;
      if (argValue(args, 'story')) {
        res = dup.findDuplicateStories(fs.readFileSync(path.resolve(argValue(args, 'story')), 'utf8'), path.join(dataRoot, 'knowledge_base', 'requirements', 'user_stories'));
      } else if (argValue(args, 'proposed')) {
        res = dup.planSuiteUpdate(fs.readFileSync(path.resolve(argValue(args, 'suite')), 'utf8'), fs.readFileSync(path.resolve(argValue(args, 'proposed')), 'utf8'));
      } else if (argValue(args, 'finding')) {
        res = dup.findDuplicateFindings(argValue(args, 'finding'), path.join(dataRoot, 'modules', argValue(args, 'module') || '', 'discovery', 'findings'));
      } else {
        console.error('Usage: state duplicates --story <file> | --suite <existing.md> --proposed <proposed.md> | --finding "<text>" --module <m>');
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    if (sub === 'history') {
      // eslint-disable-next-line global-require
      const h = require('./executionHistory').buildHistory(runsDir, folderName, runState.normalizeStageId(stageId));
      if (args.json) { console.log(JSON.stringify(h, null, 2)); return; }
      console.log(`Stage ${h.stageId} — ${h.cycles.length} cycle(s): ${h.cycles.map((c) => `${c.cycle}=${c.file.split('/').pop()}${c.producedBy ? ` (${c.producedBy})` : ''}`).join(', ')}`);
      console.log(`Final:         ${JSON.stringify(h.counts)}`);
      console.log(`First attempt: ${JSON.stringify(h.firstAttemptCounts)}`);
      const as = h.assertionSummary || {};
      const cv = h.assertionCoverage || {};
      console.log(`Assertion coverage of verified passes (textual lower bound): complete ${cv.complete || 0} · partial ${cv.partial || 0} · unknown ${cv.unknown || 0}`);
      for (const u of cv.unmapped || []) console.log(`  unmapped  ${u.testCaseId}: ${u.clauses.map((c) => `"${c}"`).join(', ')}`);
      console.log(`Recorded Passed, by assertion evidence: verified ${as.verified || 0} · unverified ${as.unverified || 0} · no records ${as.none || 0} · inconclusive ${as.inconclusive || 0} · failed assertion ${as.failed || 0} · contradiction ${as.contradiction || 0}`);
      for (const e of h.evidenceIssues || []) console.log(`  evidence  ${e.testCaseId} (cycle ${e.cycle}): "${e.ref}" ${e.status}`);
      for (const b of h.blocked) console.log(`  blocked   ${b.testCaseId}: ${b.reason || 'no reason recorded'}${b.blockedBy && b.blockedBy.length ? ` (by ${b.blockedBy.join(', ')})` : ''}`);
      for (const c of h.conflicts) console.log(`  CONFLICT  ${c.testCaseId}: ${c.detail}`);
      for (const u of h.unattributed) console.log(`  unattributed ${u.testCaseId}: ${u.detail}`);
      for (const u of h.unrecognized) console.log(`  unrecognized ${u.testCaseId}: "${u.raw}" in ${u.file}`);
      return;
    }
    if (sub === 'report-path') {
      // eslint-disable-next-line global-require
      const rp = require('./reportIntegrity').reportRevisionPath(runsDir, folderName);
      console.log(args.json ? JSON.stringify(rp, null, 2) : `Next Final QA Report: ${rp.md}${rp.revision ? ` (revision ${rp.revision}; earlier reports are kept: ${rp.previous.join(', ')})` : ''}`);
      return;
    }
    if (sub === 'report-check') {
      // eslint-disable-next-line global-require
      const { checkReportConsistency, authoritativeOutcome, contractPosition } = require('./reportIntegrity');
      // The same outcome the 6A completion gate checks against (reportIntegrity.authoritativeOutcome).
      const found = authoritativeOutcome(JSON.parse(fs.readFileSync(runState.runJsonPath(runsDir, folderName), 'utf8')));
      // Paths resolve against the data root, like every other artifact argument; one outside it is refused
      // (audit finding #15).
      const dataRoot = path.dirname(runsDir);
      const inData = (ref) => {
        if (!ref) return undefined;
        const prefix = `${path.basename(dataRoot)}/`;
        const rel = String(ref).replace(/\\/g, '/');
        const abs = path.isAbsolute(ref) ? path.resolve(ref) : path.resolve(dataRoot, rel.startsWith(prefix) ? rel.slice(prefix.length) : rel);
        const r = path.relative(dataRoot, abs);
        if (r.startsWith('..') || path.isAbsolute(r)) throw new runState.RunStateError(`${ref} is outside the data root (${dataRoot}); report files are read only from there.`, 'OUTSIDE_DATA_ROOT');
        return abs;
      };
      const res = checkReportConsistency({
        md: inData(argValue(args, 'md')), json: inData(argValue(args, 'model')), html: inData(argValue(args, 'html')),
        outcome: found ? found.outcome : undefined,
        contract: contractPosition(runsDir, folderName),
        // eslint-disable-next-line global-require
        evidence: require('./resultsIntegrity').checkResultsIntegrity(runsDir, folderName),
      });
      if (args.json) console.log(JSON.stringify(res, null, 2));
      else console.log(res.ok ? 'Report renderings agree with each other and with the recorded outcome.' : res.issues.map((i) => `  - ${i}`).join('\n'));
      if (!res.ok) process.exitCode = 2;
      return;
    }
    if (sub === 'gate') {
      // eslint-disable-next-line global-require
      const gate = require('./stageGate').checkStageEntry(runsDir, folderName, {
        ...gateOpts, stageId, invocationPath: argValue(args, 'invocation'), now: new Date(),
      });
      printGate(gate, args);
      if (gate.decision === 'blocked') process.exitCode = 2;
      return;
    }
    if (sub === 'reconcile') {
      const res = runState.reconcileManifest(runsDir, folderName, { now: new Date() });
      if (args.json) console.log(JSON.stringify(res, null, 2));
      else if (res.manifest.synced) console.log(`Run Manifest reconciled: events ${res.before} → ${res.after} of ${res.lastEventSeq}.`);
      else { console.error(`Run Manifest NOT reconciled: ${res.manifest.reason}`); process.exitCode = 1; }
      return;
    }
    if (sub === 'verify') {
      const res = runState.verifyStageApproval(runsDir, folderName, stageId);
      if (args.json) console.log(JSON.stringify(res, null, 2));
      else {
        console.log(`Stage ${res.stageId}: ${res.verified ? 'VERIFIED' : 'NOT verified'} — ${res.reason}`);
        for (const c of res.upstreamChanges) console.log(`  needs revalidation: it was built on ${c.artifact}, which ${c.detail}`);
      }
      // Exit 2 when the approval no longer holds OR the stage was built on upstream content that has
      // changed since — the same condition the planner reports as revalidation.
      if (!res.current) process.exitCode = 2;
      return;
    }

    let res;
    switch (sub) {
      case 'start':
        res = runState.startStage(runsDir, folderName, {
          ...common, ...gateOpts, stageId, invocationPath: argValue(args, 'invocation'),
          ...(argValue(args, 'instruction') ? { instruction: argValue(args, 'instruction') } : {}),
        });
        break;
      case 'artifact':
        res = runState.recordStageArtifacts(runsDir, folderName, {
          ...common, stageId, artifacts: list('artifacts').map((p) => ({ path: p, kind: argValue(args, 'kind') || 'output' })),
        });
        break;
      case 'correct-checkpoint':
        res = runState.correctCheckpointRegistration(runsDir, folderName, {
          ...common, stageId, artifact: argValue(args, 'artifact'), kind: argValue(args, 'as'), reason: argValue(args, 'reason'),
        });
        break;
      case 'request-approval':
        res = runState.requestApproval(runsDir, folderName, { ...common, stageId, artifacts: list('artifacts') });
        break;
      case 'workflow':
        res = runState.selectWorkflow(runsDir, folderName, {
          ...common, type: args._[2], ...(argValue(args, 'stage') ? { stageId: argValue(args, 'stage') } : {}),
          ...(argValue(args, 'reason') ? { reason: argValue(args, 'reason') } : {}),
        });
        break;
      case 'outcome': {
        if (args['from-results']) {
          res = runState.recordOutcomeFromResults(runsDir, folderName, { ...common, stageId });
          // Canonical execution telemetry (Phase 8.1): mirror what the results files prove into the run's
          // event stream — once per piece of evidence (deduplicated), never failing the outcome itself.
          try {
            // eslint-disable-next-line global-require
            const tel = require('../observability/emitExecution').emitExecutionTelemetry({ dataRoot: path.dirname(runsDir), runFolder: folderName, stageId: runState.normalizeStageId(stageId), now: new Date() });
            for (const w of tel.warnings) console.error(`telemetry warning: ${w}`);
          } catch (err) { console.error(`telemetry warning: execution telemetry not recorded (${String(err.message).split('\n')[0]}) — the outcome is recorded`); }
          break;
        }
        const counts = {};
        for (const status of runState.OUTCOME_STATUSES) {
          const flag = status.toLowerCase().replace(/ /g, '-');
          if (argValue(args, flag) !== undefined) counts[status] = Number(argValue(args, flag));
        }
        res = runState.recordOutcome(runsDir, folderName, { ...common, stageId, counts, ...(argValue(args, 'source') ? { source: argValue(args, 'source') } : {}) });
        {
          const o = res.state.stages[runState.normalizeStageId(stageId)].outcome;
          console.error(`WARNING: typed counts recorded as UNVERIFIED diagnostics (verdict ${o.verdict}; claimed ${o.claimedVerdict}). ` +
            `They are not evidence and never approve or complete Stage ${runState.normalizeStageId(stageId)} — record the outcome with --from-results.`);
        }
        break;
      }
      case 'recover':
        res = runState.recoverStage(runsDir, folderName, { ...common, stageId, reason: argValue(args, 'reason') });
        break;
      case 'conflict-decision':
        res = runState.recordConflictDecision(runsDir, folderName, { ...common, conflictId: argValue(args, 'id'), decision: argValue(args, 'decision') });
        break;
      case 'approve-scope':
        res = runState.approveScope(runsDir, folderName, { ...common, artifact: argValue(args, 'artifact'), approvedBy: argValue(args, 'approved-by') });
        break;
      case 'preflight': {
        // Phase 9.2, F-16. --operations takes a JSON file or an inline JSON array.
        const opsArg = argValue(args, 'operations');
        let operations = [];
        if (opsArg) {
          try { operations = JSON.parse(fs.existsSync(path.resolve(opsArg)) ? fs.readFileSync(path.resolve(opsArg), 'utf8') : opsArg); } catch (err) { throw new runState.RunStateError(`--operations is neither a readable JSON file nor a JSON array (${err.message})`, 'INVALID_ARGUMENT'); }
          if (!Array.isArray(operations)) operations = operations.operations || [];
        }
        try {
          res = runState.recordSafetyPreflight(runsDir, folderName, {
            ...common, stageId, environment: argValue(args, 'environment'), targetUrl: argValue(args, 'target-url'),
            executionType: argValue(args, 'execution-type'), executionMode: argValue(args, 'execution-mode'),
            operations, confirmedBy: argValue(args, 'confirmed-by'),
          });
        } catch (err) {
          if (err.code === 'PREFLIGHT_REFUSED') { console.error(`${err.code}: ${err.message}`); process.exitCode = 1; return; }
          throw err;
        }
        const r = res.safetyPreflight;
        console.log(`Safety Preflight ${r.id} CONFIRMED for Stage ${r.stageId} by ${r.confirmedBy}: ${r.environment} (${r.environmentClass}), ${r.targetUrl}, ${r.executionType}${r.executionMode ? ` ${r.executionMode}` : ''}; ${r.operations.length} operation(s), ${r.operations.filter((o) => o.mutating).length} mutating; binding ${r.binding.fingerprint.slice(0, 12)}`);
        return;
      }
      case 'attest-legacy-approval':
        res = runState.attestLegacyApproval(runsDir, folderName, {
          ...common, artifact: argValue(args, 'artifact'), legacyRun: argValue(args, 'legacy-run'),
          approvedBy: argValue(args, 'approved-by'), reason: argValue(args, 'reason'),
        });
        break;
      case 'approve':
        res = runState.approveStage(runsDir, folderName, { ...common, stageId, approvedBy: argValue(args, 'approved-by') });
        break;
      case 'reject':
        res = runState.rejectStage(runsDir, folderName, {
          ...common, stageId, rejectedBy: argValue(args, 'rejected-by'), feedback: argValue(args, 'feedback'),
        });
        break;
      case 'complete':
        res = runState.completeStage(runsDir, folderName, { ...common, stageId });
        break;
      case 'block':
        res = runState.blockStage(runsDir, folderName, { ...common, stageId, reason: argValue(args, 'reason') });
        break;
      case 'fail':
        res = runState.failStage(runsDir, folderName, { ...common, stageId, reason: argValue(args, 'reason') });
        break;
      case 'reopen':
        res = runState.reopenStage(runsDir, folderName, {
          ...common, stageId, reason: argValue(args, 'reason'),
          ...(argValue(args, 'invocation') ? { invocationPath: argValue(args, 'invocation') } : {}),
        });
        break;
      case 'run': {
        const op = args._[2];
        const runOps = {
          pause: runState.pauseRun, resume: runState.resumeRun, complete: runState.completeRun,
          fail: runState.failRun, cancel: runState.cancelRun,
        };
        if (!runOps[op]) {
          console.error('Usage: cli.js state run <pause|resume|complete|fail|cancel> [--by "<name>"] [--reason "..."]');
          process.exitCode = 1;
          return;
        }
        res = runOps[op](runsDir, folderName, { ...common, ...(argValue(args, 'reason') ? { reason: argValue(args, 'reason') } : {}) });
        break;
      }
      default:
        console.error(`Unknown state subcommand "${sub}". See the usage header of cli.js.`);
        process.exitCode = 1;
        return;
    }
    // Non-blocking notes from the Stage 3 assertion contract (new or changed cases only). On stderr, so
    // --json output stays parseable.
    for (const a of res.advisories || []) console.error(`advisory: ${a}`);
    printState(res.state, args, { manifest: res.manifest });
  } catch (err) {
    if (err instanceof runState.RunStateError) {
      if (err.code === 'GATE_BLOCKED' && err.gate) {
        printGate(err.gate, args);
        if (err.recorded) console.error(`Stage ${err.gate.stageId} recorded as Blocked, with these reasons.`);
        process.exitCode = 2;
        return;
      }
      console.error(`${err.code}: ${err.message}`);
      process.exitCode = 1;
      return;
    }
    if (err && err.name === 'LockError') {
      console.error(`${err.code}: ${err.message}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
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
    const res = changeSupplierFeatureRunScope(runsDir, folderName, { now: new Date(), approvedBy, reason, changes, requireRegisteredScope: true });
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
    // A run without the state model reads as Unknown, as `state show` says (audit finding #14).
    const shown = run.stateModel === false ? 'Unknown' : run.status;
    const status = shown ? ` [${shown}]` : '';
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
    case 'state': return cmdState(args);
    default: return cmdName(args);
  }
}

if (require.main === module) {
  main();
}
