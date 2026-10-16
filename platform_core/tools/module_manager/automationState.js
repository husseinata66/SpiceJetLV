// Module Automation State — a module automation project's lifecycle, from Generated to Approved.
//
// See workflows_and_pipelines/pipeline/module_architecture.md §7.4.
//
// This tracks the third automation location the module workspace introduces: the Module Automation
// Project at modules/{slug}/automation/, which sits between generation and the whole-project
// baseline. It replaces the per-run .lifecycle_snapshot.json that §12.3's Working Copy Creation
// used to write, and carries the same baseline-ref role for the shared/ directory.
//
// The first four states are a strict progression with exactly one branch: Healed re-enters at
// Executed's position, because a healed suite must be re-approved before assembly (§8.4). Approval
// is per module and is the EXISTING §5.2 Automation Approval gate — not a new one.
//
// PROMOTED (added 2026-08-17, user-mandated). A fifth state, and the only TERMINAL one. It means the
// module's code has been merged into the Workspace Automation Baseline, verified byte-identical
// there, and the module's own tests_{Framework}/ directory has been retired. From that point the
// baseline is the module's single source of truth: every later change — generation, execution,
// repair, self-healing — happens in the baseline, scoped by the ownership manifest
// (automation_lifecycle/baselineOwnership.js). `sourceOfTruth` is the field every path resolution
// reads; the state name alone is never interpreted by callers that need a directory.

const fs = require('fs');
const path = require('path');
const { assertApproverName } = require('../run_manager/approverIdentity');

const { writeJsonAtomic } = require('./moduleRegistry');

const AUTOMATION_STATE_FILENAME = '.module_automation_state.json';
const AUTOMATION_STATE_SCHEMA_VERSION = 2;

/**
 * The lifecycle states, in order.
 *   Generated — Stage 4A wrote it; not yet executed
 *   Executed  — Stage 5A ran it; results live in a run folder, referenced here
 *   Healed    — Stage 5H applied approved repairs and re-ran the affected tests
 *   Approved  — cleared the §5.2 gate; eligible for assembly into the baseline
 *   Promoted  — assembled, verified, and retired from the module workspace; the baseline owns it
 */
const AUTOMATION_STATES = ['Generated', 'Executed', 'Healed', 'Approved', 'Promoted'];

/** Where a module's executable automation actually lives, and the ONLY field a path resolver reads. */
const SOURCE_OF_TRUTH = ['module', 'baseline'];

/**
 * Which transitions are legal.
 *
 * The three that matter:
 *   - `Approved -> Healed` is legal: an already-approved suite that later fails may be repaired, and
 *     the repair drops it out of Approved so it must clear the gate again (§8.4). Healing never
 *     shortcuts assembly.
 *   - `Generated -> Approved` is legal but notable: a reviewer may approve a suite they ran
 *     themselves rather than through Stage 5A. §7.2's standalone requirement is what makes that
 *     possible, and refusing it would punish the reviewer for doing the more careful thing.
 *   - `Promoted -> anything` is ILLEGAL, and that is the point (pipeline.md §12.10 safety rules).
 *     Every other state implies a module working copy to act on, and after promotion no such copy
 *     exists. A transition out of Promoted would be a caller announcing it is about to work in a
 *     directory this lifecycle deleted on purpose — so it fails loudly here rather than silently
 *     resurrecting the module workspace. Post-promotion work is recorded by recordBaselineUpdate().
 */
const LEGAL_TRANSITIONS = {
  Generated: ['Generated', 'Executed', 'Approved'],
  Executed: ['Generated', 'Executed', 'Healed', 'Approved'],
  Healed: ['Generated', 'Executed', 'Healed', 'Approved'],
  Approved: ['Generated', 'Executed', 'Healed', 'Approved', 'Promoted'],
  Promoted: [],
};

class AutomationStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AutomationStateError';
  }
}

/**
 * @param {string} modulesDir
 * @param {string} slug
 * @returns {string} absolute path to the state file
 */
// Build, report and IDE output that is never part of an automation project's reviewed revision.
const REVISION_IGNORED_DIRS = new Set(['.git', 'node_modules', 'target', 'build', 'out', 'dist', 'coverage', '.idea', '.vscode',
  'allure-results', 'allure-report', 'extent-reports', 'execution-summary', 'test-output', 'test-results', 'playwright-report', '.gradle']);
const REVISION_IGNORED_FILE = /(^\.DS_Store$|\.log$)/;

/**
 * The exact REVISION of a module's automation project(s) — every source file under
 * modules/{slug}/automation/tests_{Framework}/ and its content hash, excluding build/report/IDE output
 * (Phase 9.1, F-04). Recorded with an Automation Approval, and re-computed before a workspace merge or a
 * retirement: what is merged or retired must be exactly what was approved. Deterministic and independent
 * of git, so it can be taken before anything is committed.
 * @returns {{sha256: string, fileCount: number, projects: Record<string, {sha256: string, fileCount: number}>}}
 */
function automationRevision(modulesDir, slug) {
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
  const dir = path.join(modulesDir, slug, 'automation');
  let projectDirs = [];
  try { projectDirs = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && /^tests_/.test(e.name)).map((e) => e.name).sort(); } catch { projectDirs = []; }
  const projects = {};
  for (const name of projectDirs) projects[name] = treeRevision(path.join(dir, name));
  const sha256 = crypto.createHash('sha256').update(JSON.stringify(Object.entries(projects).map(([k, v]) => [k, v.sha256]))).digest('hex');
  return { sha256, fileCount: Object.values(projects).reduce((n, p) => n + p.fileCount, 0), projects };
}

/** Revision of one directory tree (see automationRevision). */
function treeRevision(root) {
  // eslint-disable-next-line global-require
  const crypto = require('crypto');
  const files = [];
  const walk = (d) => {
    let es = [];
    try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!REVISION_IGNORED_DIRS.has(e.name)) walk(p); } else if (e.isFile() && !REVISION_IGNORED_FILE.test(e.name)) files.push(p);
    }
  };
  walk(root);
  const rows = files.map((f) => [path.relative(root, f).split(path.sep).join('/'), crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { sha256: crypto.createHash('sha256').update(rows.map((r) => r[0] + '\u0000' + r[1]).join('\n')).digest('hex'), fileCount: rows.length };
}

function automationStatePath(modulesDir, slug) {
  return path.join(modulesDir, slug, 'automation', AUTOMATION_STATE_FILENAME);
}

/**
 * Reads a module's automation state. Returns null when there is no automation project yet — a
 * legitimate state (Stage 4A has not run for this module), not an error.
 * @param {string} modulesDir
 * @param {string} slug
 * @returns {object|null}
 */
function readAutomationState(modulesDir, slug) {
  let raw;
  try {
    raw = fs.readFileSync(automationStatePath(modulesDir, slug), 'utf8');
  } catch {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new AutomationStateError(
      `${AUTOMATION_STATE_FILENAME} for module "${slug}" is not valid JSON: ${err.message}`
    );
  }

  if (parsed.schemaVersion !== undefined && parsed.schemaVersion > AUTOMATION_STATE_SCHEMA_VERSION) {
    throw new AutomationStateError(
      `${AUTOMATION_STATE_FILENAME} for module "${slug}" declares schemaVersion ` +
      `${parsed.schemaVersion}, but this tool understands ${AUTOMATION_STATE_SCHEMA_VERSION}.`
    );
  }

  return parsed;
}

/**
 * Records a module automation project's state.
 *
 * Transitions are validated rather than assumed: an illegal one means a caller has skipped a step,
 * and skipping the step before Approved is exactly the failure mode §5.2's gate exists to prevent.
 *
 * `approvedBy` is REQUIRED when moving to Approved, and never defaulted — for the same reason
 * pipeline.md §12.6 forbids a fabricated Automation Approval record for code nobody reviewed.
 *
 * @param {string} modulesDir
 * @param {string} slug
 * @param {string} state - one of AUTOMATION_STATES
 * @param {{now: Date, framework?: string, baselineRef?: string, sourceRun?: string,
 *          approvedBy?: string, note?: string}} opts
 * @returns {object} the written state
 */
function setAutomationState(modulesDir, slug, state, opts = {}) {
  const { now, sourceRun, approvedBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new AutomationStateError('setAutomationState requires an explicit valid `now` Date.');
  }
  if (!AUTOMATION_STATES.includes(state)) {
    throw new AutomationStateError(
      `Unknown automation state "${state}". Expected one of: ${AUTOMATION_STATES.join(', ')}.`
    );
  }

  const prior = readAutomationState(modulesDir, slug);
  if (prior?.state === 'Promoted') {
    throw new AutomationStateError(
      `Module "${slug}"'s automation is Promoted: the Workspace Automation Baseline is its single ` +
      `source of truth and its module working copy no longer exists, so it cannot move to ` +
      `"${state}". Work on the baseline directly and record it with recordBaselineUpdate() ` +
      '(pipeline.md §12.9).'
    );
  }
  if (state === 'Promoted') {
    throw new AutomationStateError(
      `"Promoted" is not set through setAutomationState. It is the outcome of a verified promotion ` +
      '— merge, byte-identity verification, then retirement — and is recorded by recordPromotion() ' +
      'so it can never be declared for code that was not actually verified in the baseline.'
    );
  }
  if (prior?.state && !LEGAL_TRANSITIONS[prior.state].includes(state)) {
    throw new AutomationStateError(
      `Illegal automation state transition for "${slug}": ${prior.state} -> ${state}. ` +
      `Legal next states: ${LEGAL_TRANSITIONS[prior.state].join(', ') || '(none — terminal state)'}.`
    );
  }
  if (state === 'Approved' && approvedBy && String(approvedBy).trim()) assertApproverName(approvedBy, `Automation Approval of "${slug}"`);
  if (state === 'Approved' && (!approvedBy || !String(approvedBy).trim())) {
    throw new AutomationStateError(
      `Approving "${slug}"'s automation requires \`approvedBy\` — an Automation Approval record ` +
      'naming no approver is not an approval (pipeline.md §5.2).'
    );
  }

  const timestamp = now.toISOString();
  const sourceRuns = new Set(prior?.sourceRuns || []);
  if (sourceRun) sourceRuns.add(sourceRun);

  const next = {
    schemaVersion: AUTOMATION_STATE_SCHEMA_VERSION,
    module: slug,
    state,
    framework: opts.framework ?? prior?.framework ?? null,
    // The shared/ commit this project was generated against — path-scoped, per §12.3's rule that a
    // bare repo HEAD must never stand in for a scoped one in a monorepo.
    baselineRef: opts.baselineRef ?? prior?.baselineRef ?? null,
    // Every state below Promoted works in the module workspace. Carried explicitly rather than
    // inferred from `state`, so a resolver reads one field and never re-derives the rule.
    sourceOfTruth: prior?.sourceOfTruth ?? 'module',
    sourceRuns: [...sourceRuns],
    assembledAt: prior?.assembledAt ?? null,
    approvedBy: state === 'Approved' ? approvedBy : (prior?.approvedBy ?? null),
    approvedAt: state === 'Approved' ? timestamp : (prior?.approvedAt ?? null),
    // The exact revision the approval covers (Phase 9.1, F-04): merged and retired code must match it.
    approvedRevision: state === 'Approved' ? (opts.approvedRevision ?? automationRevision(modulesDir, slug)) : (prior?.approvedRevision ?? null),
    updatedAt: timestamp,
    history: [
      ...(prior?.history || []),
      { state, at: timestamp, ...(sourceRun ? { run: sourceRun } : {}), ...(opts.note ? { note: opts.note } : {}) },
    ],
  };

  writeJsonAtomic(automationStatePath(modulesDir, slug), next);
  return next;
}

/**
 * Records that an approved module project has been assembled into the whole-project baseline (§7.5).
 *
 * Refuses anything but Approved. Assembly is the point at which one module's code joins the suite
 * the Target Project will receive, and letting an unapproved project through here would make §5.2's
 * gate advisory.
 *
 * @param {string} modulesDir
 * @param {string} slug
 * @param {{now: Date, baselineRef?: string, mergeSummaryPath?: string}} opts
 * @returns {object} the written state
 */
function recordAssembly(modulesDir, slug, opts = {}) {
  const { now } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new AutomationStateError('recordAssembly requires an explicit valid `now` Date.');
  }

  const prior = readAutomationState(modulesDir, slug);
  if (!prior) {
    throw new AutomationStateError(`Module "${slug}" has no automation project to assemble.`);
  }
  if (prior.state !== 'Approved') {
    throw new AutomationStateError(
      `Module "${slug}"'s automation is ${prior.state}, not Approved. Only an Approved module ` +
      'project may be assembled into the baseline (module_architecture.md §7.5).'
    );
  }

  if (!prior.approvedBy || !String(prior.approvedBy).trim()) {
    throw new AutomationStateError(`Module "${slug}"'s automation is Approved but names no approver — not an Automation Approval (pipeline.md §5.2).`);
  }
  const timestamp = now.toISOString();
  const next = {
    ...prior,
    assembledAt: timestamp,
    ...(opts.assembledRevision ? { assembledRevision: opts.assembledRevision } : {}),
    baselineRef: opts.baselineRef ?? prior.baselineRef,
    ...(opts.mergeSummaryPath ? { lastMergeSummary: opts.mergeSummaryPath } : {}),
    updatedAt: timestamp,
    history: [...(prior.history || []), { state: 'Assembled', at: timestamp }],
  };

  writeJsonAtomic(automationStatePath(modulesDir, slug), next);
  return next;
}

/**
 * Records that an assembled module has been PROMOTED: verified byte-identical in the baseline, its
 * module working copy retired, and the baseline made its single source of truth (pipeline.md §12.5).
 *
 * Four things are refused, each because accepting it would let the module workspace and the baseline
 * both claim to be authoritative:
 *   - a state other than Approved — promotion is the far side of the §5.2 gate, never a shortcut;
 *   - a module that was never assembled (`assembledAt` null) — there would be nothing in the
 *     baseline to be the source of truth;
 *   - a verification report that did not pass — retirement without proof of an identical baseline
 *     copy is how automation gets deleted, not promoted;
 *   - an empty `ownedPaths` — a promoted module with no declared ownership cannot be located inside
 *     the shared baseline afterwards, which makes every later edit unscopeable.
 *
 * `retiredPath` is recorded for exactly one reason: so a later check can assert that the directory
 * has NOT come back (pipeline.md §12.10, safety rule 3).
 *
 * @param {string} modulesDir
 * @param {string} slug
 * @param {{now: Date, baselinePath: string, ownedPaths: string[], retiredPath: string,
 *          verification: {passed: boolean, fileCount?: number, reportPath?: string},
 *          promotedBy: string, baselineRef?: string, evidence?: string[], note?: string}} opts
 * @returns {object} the written state
 */
function recordPromotion(modulesDir, slug, opts = {}) {
  const { now, verification, ownedPaths, promotedBy } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new AutomationStateError('recordPromotion requires an explicit valid `now` Date.');
  }

  const prior = readAutomationState(modulesDir, slug);
  if (!prior) {
    throw new AutomationStateError(`Module "${slug}" has no automation project to promote.`);
  }
  if (prior.state !== 'Approved') {
    throw new AutomationStateError(
      `Module "${slug}"'s automation is ${prior.state}, not Approved. Only an Approved module may ` +
      'be promoted (pipeline.md §5.2).'
    );
  }
  if (!prior.assembledAt) {
    throw new AutomationStateError(
      `Module "${slug}" has never been assembled into the baseline, so there is no baseline copy ` +
      'to promote to. Run the Workspace Merge first (pipeline.md §12.4).'
    );
  }
  if (!verification || verification.passed !== true) {
    throw new AutomationStateError(
      `Promoting "${slug}" requires a PASSING verification report proving every module file exists ` +
      'in the baseline with identical content (promoteVerify.js). Retiring a module working copy ' +
      'without that proof is a deletion, not a promotion.'
    );
  }
  if (!Array.isArray(ownedPaths) || ownedPaths.length === 0) {
    throw new AutomationStateError(
      `Promoting "${slug}" requires \`ownedPaths\` — the baseline paths this module owns. Without ` +
      'them the module cannot be located inside the shared baseline, so no later change to it ' +
      'could be scoped (pipeline.md §12.9).'
    );
  }
  if (promotedBy && String(promotedBy).trim()) assertApproverName(promotedBy, `Promotion of "${slug}"`);
  if (!promotedBy || !String(promotedBy).trim()) {
    throw new AutomationStateError(
      `Promoting "${slug}" requires \`promotedBy\` — an unattributed promotion record is the same ` +
      'failure pipeline.md §12.6 forbids for an unattributed Automation Approval.'
    );
  }

  const timestamp = now.toISOString();
  const next = {
    ...prior,
    state: 'Promoted',
    sourceOfTruth: 'baseline',
    baselinePath: opts.baselinePath ?? prior.baselinePath ?? null,
    baselineRef: opts.baselineRef ?? prior.baselineRef,
    ownedPaths: [...ownedPaths],
    retiredPath: opts.retiredPath ?? null,
    promotedAt: timestamp,
    promotedBy,
    promotionVerification: {
      passed: true,
      fileCount: verification.fileCount ?? null,
      reportPath: verification.reportPath ?? null,
      verifiedAt: timestamp,
    },
    ...(opts.evidence ? { promotionEvidence: [...opts.evidence] } : {}),
    updatedAt: timestamp,
    history: [
      ...(prior.history || []),
      { state: 'Promoted', at: timestamp, ...(opts.note ? { note: opts.note } : {}) },
    ],
  };

  writeJsonAtomic(automationStatePath(modulesDir, slug), next);
  return next;
}

/**
 * Records an in-place change to an already-Promoted module's code inside the baseline (§12.9).
 *
 * This is the ONLY write path for a promoted module, and it deliberately does not change `state`:
 * there is no second promotion, because there is no second copy to promote. What it records is the
 * evidence a reviewer needs after the fact — which files moved, which run verified them, who
 * approved, and the commit that captured it.
 *
 * @param {string} modulesDir
 * @param {string} slug
 * Refuses (since 2026-10-08) an update with no named `approvedBy` or no valid `baselineRef` commit —
 * an unapproved or unrecoverable in-place change is never recorded. `verifyRef(ref)` optionally
 * confirms the commit exists (e.g. `git cat-file -e <ref>^{commit}`).
 *
 * @param {{now: Date, changedPaths: string[], baselineRef: string, approvedBy: string,
 *          run?: string, verification?: object, note?: string, verifyRef?: (ref: string) => boolean}} opts
 * @returns {object} the written state
 */
function recordBaselineUpdate(modulesDir, slug, opts = {}) {
  const { now, changedPaths } = opts;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new AutomationStateError('recordBaselineUpdate requires an explicit valid `now` Date.');
  }

  const prior = readAutomationState(modulesDir, slug);
  if (!prior) {
    throw new AutomationStateError(`Module "${slug}" has no automation state.`);
  }
  if (prior.state !== 'Promoted') {
    throw new AutomationStateError(
      `Module "${slug}"'s automation is ${prior.state}, not Promoted. A module that still has its ` +
      'own working copy records changes through setAutomationState, not as a baseline update.'
    );
  }
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) {
    throw new AutomationStateError(
      'recordBaselineUpdate requires the list of changed baseline paths — an update naming no ' +
      'files leaves a reviewer nothing to review.'
    );
  }
  // An in-place baseline change is approved code or it is nothing (pipeline.md §5.2, §12.9): the
  // approval moved to this recording step when the module was promoted, so recording without a named
  // approver would record an unapproved change as if it were approved.
  const approvedBy = typeof opts.approvedBy === 'string' ? opts.approvedBy.trim() : '';
  if (approvedBy) assertApproverName(approvedBy, `Baseline update of "${slug}"`);
  if (!approvedBy) {
    throw new AutomationStateError(
      'recordBaselineUpdate requires `approvedBy` — the named human who gave the Automation Approval ' +
      'for this in-place change (pipeline.md §5.2, §12.9). An unapproved baseline change is not recorded.'
    );
  }
  // The commit that captured the change is what makes it recoverable; without it, "which version was
  // approved?" has no answer once the next edit lands.
  const baselineRef = typeof opts.baselineRef === 'string' ? opts.baselineRef.trim() : '';
  if (!/^[0-9a-f]{7,40}$/i.test(baselineRef)) {
    throw new AutomationStateError(
      'recordBaselineUpdate requires `baselineRef` — the git commit (7–40 hex characters) that captured ' +
      `this change (pipeline.md §12.9). Got ${JSON.stringify(opts.baselineRef ?? null)}. Commit the change first.`
    );
  }
  if (typeof opts.verifyRef === 'function' && !opts.verifyRef(baselineRef)) {
    throw new AutomationStateError(
      `recordBaselineUpdate: baselineRef ${baselineRef} does not name a commit in the baseline's repository.`
    );
  }

  const timestamp = now.toISOString();
  const entry = {
    at: timestamp,
    changedPaths: [...changedPaths],
    baselineRef,
    // The ref this change was made on top of — the restore point, kept with the entry so history
    // stays recoverable even after later updates move `baselineRef` on.
    previousBaselineRef: prior.baselineRef ?? null,
    approvedBy,
    ...(opts.run ? { run: opts.run } : {}),
    ...(opts.verification ? { verification: opts.verification } : {}),
    ...(opts.note ? { note: opts.note } : {}),
  };

  const sourceRuns = new Set(prior.sourceRuns || []);
  if (opts.run) sourceRuns.add(opts.run);

  const next = {
    ...prior,
    sourceRuns: [...sourceRuns],
    baselineRef,
    baselineUpdates: [...(prior.baselineUpdates || []), entry],
    updatedAt: timestamp,
    history: [...(prior.history || []), { state: 'BaselineUpdated', at: timestamp, ...(opts.run ? { run: opts.run } : {}) }],
  };

  writeJsonAtomic(automationStatePath(modulesDir, slug), next);
  return next;
}

/**
 * Every module whose automation project is Approved and therefore eligible for assembly. This is
 * what the assembly step iterates: the whole-project baseline is built from approved module
 * projects, and an unapproved one is simply not part of it yet.
 * @param {string} modulesDir
 * @param {string[]} slugs
 * @returns {Array<{slug: string, state: object}>}
 */
function listAssemblable(modulesDir, slugs = []) {
  return slugs
    .map((slug) => ({ slug, state: readAutomationState(modulesDir, slug) }))
    .filter((m) => m.state && m.state.state === 'Approved');
}

module.exports = {
  automationRevision,
  treeRevision,
  AUTOMATION_STATE_FILENAME,
  AUTOMATION_STATE_SCHEMA_VERSION,
  AUTOMATION_STATES,
  SOURCE_OF_TRUTH,
  LEGAL_TRANSITIONS,
  AutomationStateError,
  automationStatePath,
  readAutomationState,
  setAutomationState,
  recordAssembly,
  recordPromotion,
  recordBaselineUpdate,
  listAssemblable,
};

// Concurrency (Phase 9.4): each read-modify-write below holds the registry lock (registryLock.js).
require('./registryLock').lockExports(module.exports, ['setAutomationState', 'recordAssembly', 'recordPromotion', 'recordBaselineUpdate']);
