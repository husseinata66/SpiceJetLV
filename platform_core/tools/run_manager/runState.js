// Run & Stage State Model — the mechanical record of where a run is.
//
// WHY THIS EXISTS
// run_manager.md §8 has always defined a run's Execution Status (Preparing, Running, Paused, Waiting
// For Approval, Completed, Failed, Cancelled), but nothing ever moved it: createRun() wrote
// `Preparing` and no code changed it again, so finished runs still read `Preparing`. Stage progress
// lived only in hand-edited Run Manifest rows, with free-text stage names and statuses that bypassed
// the Manifest's own validator. A future workflow planner, an automatic handoff, or a resume after an
// interruption all need one question answered reliably: "where is this run, and what is each stage
// waiting on?" This module is that answer.
//
// WHAT IT GUARANTEES
//   - Explicit, validated states and transitions for the run and for each of the eight stages. An
//     unknown stage ID, an illegal transition, or a missing required field is refused, never coerced.
//   - Approval is never granted by this record. approveStage() reads every checkpoint artifact's own
//     header (artifactHeader.js) and refuses unless each one already says Approved — the header stays
//     authoritative (pipeline.md §7). A Run Manifest row reading "Approved" counts for nothing here.
//   - Safe persistence: every change is one locked read-modify-write of metadata/run.json with an
//     atomic replace (atomicFile.js), so there are no partial writes and no lost updates. An optional
//     `expectedRevision` lets a caller refuse to act on a state that moved since it last read it.
//   - Prospective only. A run created before this model has no `stateSchemaVersion`; it is read as
//     Unknown — never inferred to be Completed or Approved — and is never written to.
//
// WHAT IT DOES NOT DO
// It decides nothing. It never picks the next stage, never starts one, and never judges an artifact
// (run_manager.md §10 Rules 1–2, 5). It records mechanical signals and refuses invalid ones. Workflow
// selection, automatic handoff and resume are built on top of it later.
//
// PERSISTED SHAPE (added to metadata/run.json; every other run.json field is untouched)
//   stateSchemaVersion: 1
//   stateRevision:      <int, +1 per change>
//   status:             <run status>          (the existing §8 field)
//   statusReason:       <string|null>
//   finishedTime:       <ISO, set on a terminal status>   (the existing §7 field)
//   statusHistory:      [{at, from, to, by, reason}]
//   stages: { "<stageId>": {stageId, name, checkpoint, status, startedAt, lastStartedAt,
//             completedAt, updatedAt, attempts, resumes, revisions, invocationPath, instruction,
//             artifacts: [{path, kind, recordedAt}], reason,
//             approval: {status, approvedBy, approvedAt, rejectedBy, rejectedAt, feedback,
//                        headerEvidence: [{path, status, raw, source}], previous: [...]},
//             history: [{at, from, to, by, reason}] } }
//
// See workflows_and_pipelines/pipeline/run_manager.md §8 and §8.1.

const fs = require('fs');
const path = require('path');

const { writeJsonAtomic, writeFileAtomic, withFileLock } = require('./atomicFile');
const { readArtifactApprovalStatus, fingerprintFile } = require('./artifactHeader');
const { resolveWithinDataRoot } = require('./pathBoundary');
const { checkResultsIntegrity, integrityMessage } = require('./resultsIntegrity');
const { approverProblem } = require('./approverIdentity');
const {
  CHECKPOINT_STATUSES, INVOCATION_PATHS, manifestPath, applyStateEvents, readAppliedEventSeq, readManifest,
} = require('./runManifest');

const STATE_SCHEMA_VERSION = 1;
const UNKNOWN = 'Unknown';
const LOCK_FILENAME = '.run_state.lock';

/**
 * Failure-injection points, for tests only: `beforeRunJsonWrite`, `afterRunJsonWrite`,
 * `beforeManifestWrite`. Each is called with the run folder name; a hook that throws (or exits the
 * process) simulates a crash at exactly that point. Never set outside tests.
 */
const testHooks = {};
function _setTestHooks(hooks = {}) {
  // Refused outside the Node test runner (`node --test` sets NODE_TEST_CONTEXT in every test process
  // and the processes they spawn), so no production workflow can reach a hook — including
  // `skipEntryGate`, the one way to start a stage without its entry gate.
  if (!process.env.NODE_TEST_CONTEXT) {
    throw new RunStateError('_setTestHooks is available only under the Node test runner (node --test).', 'TEST_ONLY');
  }
  for (const k of Object.keys(testHooks)) delete testHooks[k];
  Object.assign(testHooks, hooks);
}
function hook(name, folderName) {
  if (typeof testHooks[name] === 'function') testHooks[name](folderName);
}

class RunStateError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'RunStateError';
    this.code = code;
  }
}

/**
 * The data-root boundary (pathBoundary.js, Phase 9.1 F-07): `ref` must resolve inside the data root —
 * no `..` segment, no absolute path outside it, no symbolic-link or junction escape. Refused with
 * OUTSIDE_DATA_ROOT before anything is recorded, fingerprinted or copied.
 * @returns {{abs: string, rel: string}}
 */
function withinDataRoot(ref, runsDir, what = 'artifact') {
  try {
    return resolveWithinDataRoot(ref, { dataRoot: path.dirname(runsDir), what });
  } catch (err) {
    throw new RunStateError(err.message, err.code || 'OUTSIDE_DATA_ROOT');
  }
}

/**
 * The eight stages (pipeline.md §3.2) and the checkpoint each one carries (§5). The IDs and names are
 * the platform's canonical ones — the same as observability/schema.js STAGES, which a test asserts.
 */
const STAGE_DEFINITIONS = Object.freeze({
  1: { name: 'Stage 1 — Project Context', checkpoint: 'Human Review' },
  2: { name: 'Stage 2 — Discovery', checkpoint: 'Human Review' },
  3: { name: 'Stage 3 — Test Design', checkpoint: 'Human Review' },
  '4M': { name: 'Stage 4M — Manual Execution', checkpoint: 'Human Review', terminal: true },
  '4A': { name: 'Stage 4A — Automation', checkpoint: 'Automation Approval' },
  '5A': { name: 'Stage 5A — Automation Execution', checkpoint: null },
  '5H': { name: 'Stage 5H — Self-Healing', checkpoint: 'Automation Approval' },
  '6A': { name: 'Stage 6A — Reporting', checkpoint: null, terminal: true },
});
const STAGE_IDS = Object.freeze(['1', '2', '3', '4M', '4A', '5A', '5H', '6A']);

/** The pending checkpoint status each gate type opens with (pipeline.md §5.3 #1). */
const PENDING_STATUS_FOR = Object.freeze({
  'Human Review': 'Pending Review',
  'Automation Approval': 'Pending Automation Approval',
});

/** Run statuses — run_manager.md §8, plus Blocked (a stage cannot proceed without a human). */
const RUN_STATUSES = Object.freeze([
  'Preparing', 'Running', 'Waiting For Approval', 'Paused', 'Blocked', 'Completed', 'Failed', 'Cancelled',
]);
const TERMINAL_RUN_STATUSES = Object.freeze(['Completed', 'Failed', 'Cancelled']);

/** Stage statuses. `Not Started` is never stored — a stage with no record has not started. */
const STAGE_STATUSES = Object.freeze([
  'Not Started', 'Running', 'Paused', 'Waiting For Approval', 'Blocked', 'Failed', 'Completed',
]);

/**
 * Legal stage transitions. Which operation drives each one, and its extra conditions, is enforced by
 * the operation itself (e.g. Running → Completed only for a stage with no checkpoint; Waiting For
 * Approval → Completed only through approveStage with a verified header).
 */
const STAGE_TRANSITIONS = Object.freeze({
  'Not Started': ['Running', 'Blocked'],
  Running: ['Waiting For Approval', 'Completed', 'Paused', 'Blocked', 'Failed'],
  Paused: ['Running'],
  Blocked: ['Running', 'Failed'],
  Failed: ['Running'],
  'Waiting For Approval': ['Completed', 'Blocked'],
  Completed: ['Running'],
});

/** Artifact reference kinds. Only `checkpoint` artifacts are approval-bearing. */
const ARTIFACT_KINDS = Object.freeze(['checkpoint', 'output', 'evidence']);

// ---------------------------------------------------------------------------------------------
// Paths, reading, validation
// ---------------------------------------------------------------------------------------------

function runJsonPath(runsDir, folderName) {
  return path.join(runsDir, folderName, 'metadata', 'run.json');
}

function runLockPath(runsDir, folderName) {
  return path.join(runsDir, folderName, 'metadata', LOCK_FILENAME);
}

/**
 * Holds the run's exclusive lock across `fn`. Every writer of a run's metadata/run.json goes through
 * this, so the state model and createRun's in-place updaters never overwrite each other.
 */
function withRunLock(runsDir, folderName, fn, opts) {
  return withFileLock(runLockPath(runsDir, folderName), fn, opts);
}

/** Normalizes a stage ID ("1", 1, "4m") or throws UNKNOWN_STAGE. */
function normalizeStageId(stageId) {
  const id = String(stageId ?? '').trim().toUpperCase();
  if (!STAGE_IDS.includes(id)) {
    throw new RunStateError(
      `Unknown stage ID ${JSON.stringify(stageId)}. Expected one of: ${STAGE_IDS.join(', ')} ` +
      '(pipeline.md §3.2). A bare "4" is never valid — use 4M or 4A.',
      'UNKNOWN_STAGE'
    );
  }
  return id;
}

function assertDate(now, fn) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new RunStateError(`${fn} requires an explicit valid \`now\` Date.`, 'INVALID_ARGUMENT');
  }
}

function requireText(value, field, fn, why) {
  if (value === undefined || value === null || !String(value).trim()) {
    throw new RunStateError(`${fn} requires \`${field}\`${why ? ` — ${why}` : ''}.`, 'MISSING_FIELD');
  }
  return String(value).trim();
}

/**
 * requireText for a HUMAN approver (Phase 9.2, F-15): also refuses a one-character, placeholder or
 * agent-shaped name (approverIdentity.js). A name is recorded, not authenticated.
 */
function requireApprover(value, field, fn, why) {
  const v = requireText(value, field, fn, why);
  const problem = approverProblem(v);
  if (problem) throw new RunStateError(`${fn}: ${problem}. Name the human who gave it (a name is recorded, not authenticated).`, 'INVALID_APPROVER');
  return v.trim();
}

function readRunJson(runsDir, folderName) {
  const file = runJsonPath(runsDir, folderName);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    throw new RunStateError(`Run "${folderName}" has no metadata/run.json at ${file}.`, 'NO_RUN_JSON');
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    // A corrupt file is reported, never treated as a legacy run: legacy means "valid, older shape".
    throw new RunStateError(
      `metadata/run.json for "${folderName}" is not valid JSON (${err.message}). It was not changed.`,
      'CORRUPT_RUN_JSON'
    );
  }
}

function isLegacy(meta) {
  return meta.stateSchemaVersion === undefined || meta.stateSchemaVersion === null;
}

function assertSupportedSchema(meta, folderName) {
  if (!isLegacy(meta) && meta.stateSchemaVersion > STATE_SCHEMA_VERSION) {
    throw new RunStateError(
      `Run "${folderName}" uses run-state schema v${meta.stateSchemaVersion}; this tool understands up ` +
      `to v${STATE_SCHEMA_VERSION}. Upgrade the platform before reading or changing it.`,
      'UNSUPPORTED_SCHEMA'
    );
  }
}

/** The fields createRun() adds to a NEW run's run.json, so it starts inside the state model. */
function initialRunState({ now, createdBy }) {
  assertDate(now, 'initialRunState');
  return {
    stateSchemaVersion: STATE_SCHEMA_VERSION,
    stateRevision: 0,
    status: 'Preparing',
    statusReason: null,
    statusHistory: [{ at: now.toISOString(), from: null, to: 'Preparing', by: createdBy || 'Run Manager', reason: 'run created' }],
    stages: {},
    stateEventSeq: 0,
    stateEvents: [],
  };
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

function stageView(id, record) {
  const def = STAGE_DEFINITIONS[id];
  if (!record) {
    return {
      stageId: id, name: def.name, checkpoint: def.checkpoint, status: 'Not Started',
      approval: { status: def.checkpoint ? null : 'Not Required' },
      artifacts: [], allowedTransitions: STAGE_TRANSITIONS['Not Started'],
    };
  }
  return {
    ...record,
    approval: def.checkpoint ? record.approval : { ...record.approval, status: 'Not Required' },
    allowedTransitions: STAGE_TRANSITIONS[record.status] || [],
  };
}

/**
 * Reads a run's state. Never writes.
 *
 * For a run created before the state model (no `stateSchemaVersion`), the run and every stage read as
 * `Unknown`, with the raw recorded status kept as `recordedStatus` and the Manifest's ledger attached
 * as `manifestLedger` — for information only, because a Manifest row is not an approval.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {object}
 */
function readRunState(runsDir, folderName) {
  const meta = readRunJson(runsDir, folderName);
  assertSupportedSchema(meta, folderName);

  if (isLegacy(meta)) {
    const stages = {};
    for (const id of STAGE_IDS) {
      stages[id] = {
        stageId: id, name: STAGE_DEFINITIONS[id].name, checkpoint: STAGE_DEFINITIONS[id].checkpoint,
        status: UNKNOWN, approval: { status: UNKNOWN }, artifacts: [], allowedTransitions: [],
      };
    }
    return {
      folderName,
      legacy: true,
      schemaVersion: null,
      revision: null,
      status: UNKNOWN,
      recordedStatus: meta.status ?? null,
      statusReason: 'This run predates the run state model. Its state is Unknown: it is never ' +
        'assumed Completed or Approved, and it is not updated by this model.',
      finishedTime: meta.finishedTime ?? null,
      statusHistory: [],
      stages,
      manifestLedger: readManifest(runsDir, folderName).stages,
    };
  }

  const stages = {};
  for (const id of STAGE_IDS) stages[id] = stageView(id, (meta.stages || {})[id]);
  const lastEventSeq = meta.stateEventSeq ?? 0;
  const appliedSeq = readAppliedEventSeq(runsDir, folderName);
  return {
    folderName,
    legacy: false,
    schemaVersion: meta.stateSchemaVersion,
    revision: meta.stateRevision ?? 0,
    status: meta.status,
    recordedStatus: meta.status,
    statusReason: meta.statusReason ?? null,
    finishedTime: meta.finishedTime ?? null,
    statusHistory: meta.statusHistory || [],
    workflowPlan: meta.workflowPlan ?? null,
    moduleArtifactRefs: meta.moduleArtifactRefs || [],
    changeRequests: meta.changeRequests || [],
    conflictDecisions: meta.conflictDecisions || [],
    stages,
    // How far the Run Manifest lags run.json. `pendingEvents > 0` means an update reached run.json but
    // not the Manifest; the next change, or `state reconcile`, replays exactly those events.
    manifest: appliedSeq === null
      ? { present: false, lastEventSeq, appliedSeq: null, pendingEvents: null }
      : { present: true, lastEventSeq, appliedSeq, pendingEvents: Math.max(0, lastEventSeq - appliedSeq) },
  };
}

// ---------------------------------------------------------------------------------------------
// Approval verification — the header is the authority
// ---------------------------------------------------------------------------------------------

/**
 * Resolves an artifact reference to a file. References are stored as given; relative ones resolve
 * against the data root (the parent of runs/), and a leading `<dataRoot name>/` prefix is accepted
 * so both `modules/x/...` and `platform_core_data/modules/x/...` work.
 */
function resolveArtifactPath(ref, { runsDir, dataRoot }) {
  if (path.isAbsolute(ref)) return ref;
  const root = dataRoot || path.dirname(runsDir);
  const candidates = [path.resolve(root, ref)];
  const prefix = `${path.basename(root)}/`;
  const slashed = ref.replace(/\\/g, '/');
  if (slashed.startsWith(prefix)) candidates.push(path.resolve(root, slashed.slice(prefix.length)));
  return candidates.find((c) => fs.existsSync(c)) || candidates[0];
}

function readHeaders(record, ctx) {
  return (record.artifacts || [])
    .filter((a) => a.kind === 'checkpoint')
    .map((a) => {
      const file = resolveArtifactPath(a.path, ctx);
      return { path: a.path, ...readArtifactApprovalStatus(file), sha256: fingerprintFile(file) };
    });
}

/**
 * Re-checks a stage's approval against its checkpoint artifacts' headers as they are NOW. An approval
 * recorded earlier is reported unverified if a header has since moved off Approved (e.g. the artifact
 * was revised and sent back through its gate).
 *
 * `verified` is about the stage's OWN approval. `upstreamChanges` (stageGate.consumedChanges) says whether
 * what the stage was built on has changed or been re-approved since it started, and `current` combines
 * the two — the same facts the planner's revalidation and the next stage's entry gate act on
 * (Phase 5.6A), so `state verify`, `state next` and `state start` agree.
 *
 * @returns {{stageId: string, approvalStatus: string|null, verified: boolean, current: boolean, reason: string,
 *            artifacts: object[], upstreamChanges: object[]}}
 */
function verifyStageApproval(runsDir, folderName, stageId, opts = {}) {
  const own = verifyOwnApproval(runsDir, folderName, stageId, opts);
  if (own.approvalStatus === UNKNOWN) return { ...own, current: false, upstreamChanges: [] };
  // eslint-disable-next-line global-require
  const { consumedChanges } = require('./stageGate');
  const meta = JSON.parse(fs.readFileSync(runJsonPath(runsDir, folderName), 'utf8'));
  const upstreamChanges = consumedChanges(runsDir, meta, own.stageId, { dataRoot: opts.dataRoot });
  return { ...own, current: own.verified && upstreamChanges.length === 0, upstreamChanges };
}

function verifyOwnApproval(runsDir, folderName, stageId, { dataRoot } = {}) {
  const id = normalizeStageId(stageId);
  const state = readRunState(runsDir, folderName);
  const stage = state.stages[id];
  if (state.legacy) {
    return { stageId: id, approvalStatus: UNKNOWN, verified: false, reason: 'legacy run — state Unknown', artifacts: [] };
  }
  // Execution evidence (Phase 9.1, F-03): a stage built on recorded results is not verified once they changed.
  if (['4M', '5A', '5H', '6A'].includes(id) && stage.status === 'Completed') {
    const integ = checkResultsIntegrity(runsDir, folderName, { dataRoot });
    if (integ.state === 'modified') {
      return { stageId: id, approvalStatus: STAGE_DEFINITIONS[id].checkpoint ? (stage.approval?.status ?? null) : 'Not Required', verified: false, code: 'RESULTS_MODIFIED', reason: integrityMessage(integ), artifacts: [], evidence: integ };
    }
  }
  if (!STAGE_DEFINITIONS[id].checkpoint) {
    return { stageId: id, approvalStatus: 'Not Required', verified: stage.status === 'Completed', reason: 'stage has no checkpoint', artifacts: [] };
  }
  const artifacts = stage.status === 'Not Started' ? [] : readHeaders(stage, { runsDir, dataRoot });
  if (stage.approval?.status !== 'Approved') {
    return { stageId: id, approvalStatus: stage.approval?.status ?? null, verified: false, reason: 'no approval recorded', artifacts };
  }
  const notApproved = artifacts.filter((a) => a.status !== 'Approved');
  if (!artifacts.length || notApproved.length) {
    return {
      stageId: id, approvalStatus: 'Approved', verified: false, artifacts,
      reason: artifacts.length
        ? `header no longer reads Approved: ${notApproved.map((a) => `${a.path} (${a.status})`).join(', ')}`
        : 'no checkpoint artifact to verify',
    };
  }
  // The header can still say Approved after the content changed; the fingerprint taken at approval
  // is what shows it.
  const recorded = new Map((stage.approval.headerEvidence || []).map((e) => [e.path, e.sha256]));
  const modified = artifacts.filter((a) => recorded.get(a.path) && a.sha256 && recorded.get(a.path) !== a.sha256);
  if (modified.length) {
    return {
      stageId: id, approvalStatus: 'Approved', verified: false, artifacts,
      reason: `modified after approval: ${modified.map((a) => a.path).join(', ')} — content no longer matches the fingerprint taken when it was approved`,
    };
  }
  return { stageId: id, approvalStatus: 'Approved', verified: true, reason: 'every checkpoint header reads Approved, and content is unchanged since approval', artifacts };
}

// ---------------------------------------------------------------------------------------------
// The write path
// ---------------------------------------------------------------------------------------------

/** Run status implied by the stages, unless an explicit status (Paused/terminal) holds. */
function deriveRunStatus(meta) {
  const statuses = Object.values(meta.stages || {}).map((s) => s.status);
  if (statuses.includes('Running')) return 'Running';
  if (statuses.includes('Waiting For Approval')) return 'Waiting For Approval';
  if (statuses.includes('Blocked') || statuses.includes('Failed')) return 'Blocked';
  if (!statuses.length) return 'Preparing';
  // Between stages: the run is in progress, nothing is executing, nothing is awaiting a reviewer.
  return 'Running';
}

function stageReasonFor(meta, runStatus) {
  if (runStatus !== 'Blocked') return null;
  const stuck = Object.values(meta.stages || {}).filter((s) => s.status === 'Blocked' || s.status === 'Failed');
  return stuck.map((s) => `Stage ${s.stageId} ${s.status}: ${s.reason || 'no reason recorded'}`).join('; ') || null;
}

function pushHistory(list, entry) {
  return [...(Array.isArray(list) ? list : []), entry];
}

/**
 * The one write path. Locks the run, reads run.json, refuses legacy/unsupported/terminal/stale state,
 * lets `mutate` change a deep copy, re-derives the run status, bumps the revision, writes atomically,
 * then mirrors the change into the Run Manifest.
 */
function applyChange(runsDir, folderName, opts, mutate) {
  const { now, expectedRevision, allowTerminal = false, lock } = opts;
  return withRunLock(runsDir, folderName, () => {
    const meta = readRunJson(runsDir, folderName);
    assertSupportedSchema(meta, folderName);
    if (isLegacy(meta)) {
      throw new RunStateError(
        `Run "${folderName}" predates the run state model (no stateSchemaVersion). Its state is read ` +
        'as Unknown and is never changed by this model — historical runs stay exactly as written. ' +
        'Create a new run to track state.',
        'LEGACY_RUN'
      );
    }
    if (!RUN_STATUSES.includes(meta.status)) {
      throw new RunStateError(
        `Run "${folderName}" has status ${JSON.stringify(meta.status)}, which is not a run status ` +
        `(${RUN_STATUSES.join(', ')}). Refusing to build on it.`,
        'INVALID_RECORDED_STATE'
      );
    }
    const revision = meta.stateRevision ?? 0;
    if (expectedRevision !== undefined && expectedRevision !== null && Number(expectedRevision) !== revision) {
      throw new RunStateError(
        `Run "${folderName}" is at state revision ${revision}, not the expected ${expectedRevision}. ` +
        'Its state changed since you read it — re-read it and decide again.',
        'REVISION_CONFLICT'
      );
    }
    if (TERMINAL_RUN_STATUSES.includes(meta.status) && !allowTerminal) {
      throw new RunStateError(
        `Run "${folderName}" is ${meta.status} — a terminal status. Nothing more is recorded on it; ` +
        'new work gets a new run.',
        'RUN_TERMINAL'
      );
    }

    const next = JSON.parse(JSON.stringify(meta));
    next.stages = next.stages || {};
    const ts = now.toISOString();
    const effect = mutate(next, ts) || {};

    const fromStatus = meta.status;
    let toStatus = effect.runStatus;
    if (!toStatus) {
      toStatus = (fromStatus === 'Paused') ? 'Paused' : deriveRunStatus(next);
    }
    if (toStatus !== fromStatus) {
      next.status = toStatus;
      next.statusReason = effect.runReason ?? stageReasonFor(next, toStatus);
      next.statusHistory = pushHistory(next.statusHistory, {
        at: ts, from: fromStatus, to: toStatus, by: effect.by || 'Run Manager', reason: next.statusReason,
      });
    } else if (toStatus === 'Blocked') {
      next.statusReason = stageReasonFor(next, toStatus);
    }
    if (TERMINAL_RUN_STATUSES.includes(next.status)) next.finishedTime = next.finishedTime || ts;
    next.stateRevision = revision + 1;

    // The Manifest's history comes from this outbox, not from the call that made the change: the event
    // is committed to run.json first, in the same atomic write as the state it describes, so a crash
    // or a failed Manifest write can never lose it — the next mirror replays it, exactly once.
    const stage = effect.stageId ? next.stages[effect.stageId] : null;
    const runPart = next.status !== fromStatus ? `run ${fromStatus} → ${next.status}` : null;
    const transition = [effect.transition, runPart].filter(Boolean).join('; ');
    if (transition) {
      const seq = (meta.stateEventSeq ?? 0) + 1;
      next.stateEventSeq = seq;
      next.stateEvents = pushHistory(next.stateEvents, {
        seq, at: ts, stageId: stage ? stage.stageId : null, stage: stage ? stage.name : '—',
        transition, by: effect.by || 'Run Manager', reason: effect.reason ?? null, runStatus: next.status,
      });
    }

    hook('beforeRunJsonWrite', folderName);
    writeJsonAtomic(runJsonPath(runsDir, folderName), next);
    hook('afterRunJsonWrite', folderName);
    const manifest = mirrorToManifest(runsDir, folderName, next, now);
    return { state: readRunState(runsDir, folderName), revision: next.stateRevision, manifest, ...(effect.result || {}) };
  }, lock);
}

function ledgerRowFor(stage) {
  const checkpointArtifact = (stage.artifacts || []).find((a) => a.kind === 'checkpoint') || (stage.artifacts || [])[0];
  const approvalStatus = stage.approval?.status;
  // A stage with no checkpoint (5A, 6A) has no approval to show: its own status is shown instead, so a
  // completed 5A reads Completed, not a dash (audit finding #11).
  const shown = STAGE_DEFINITIONS[stage.stageId]?.checkpoint
    ? (CHECKPOINT_STATUSES.includes(approvalStatus) ? approvalStatus : null)
    : stage.status;
  return {
    stage: stage.name,
    ...(checkpointArtifact ? { artifactPath: checkpointArtifact.path } : {}),
    ...(shown ? { checkpointStatus: shown } : {}),
    ...(stage.approval?.approvedBy || stage.approval?.rejectedBy
      ? { reviewer: stage.approval.approvedBy || stage.approval.rejectedBy } : {}),
    revisions: stage.revisions || 0,
    ...(stage.invocationPath ? { invocationPath: stage.invocationPath } : {}),
    ...(stage.instruction ? { instruction: stage.instruction } : {}),
  };
}

/**
 * Brings the Manifest level with run.json: every stage's ledger row rewritten from the current state,
 * and every outbox event not yet shown appended — one atomic write (runManifest.applyStateEvents).
 * Safe to repeat: a second call finds nothing new and changes no history.
 */
function mirrorToManifest(runsDir, folderName, meta, now) {
  if (!fs.existsSync(manifestPath(runsDir, folderName))) {
    return { synced: false, reason: 'this run has no Run Manifest' };
  }
  try {
    hook('beforeManifestWrite', folderName);
    const res = applyStateEvents(runsDir, folderName, {
      events: meta.stateEvents || [],
      ledgerRows: Object.values(meta.stages || {}).map(ledgerRowFor),
      artifactRefs: meta.moduleArtifactRefs || [],
      absentStages: STAGE_IDS.filter((id) => !(meta.stages || {})[id]).map((id) => STAGE_DEFINITIONS[id].name),
      runStatus: meta.status,
      now,
    });
    return { synced: true, replayed: Math.max(0, res.appliedEvents - 1), appliedSeq: res.appliedSeq };
  } catch (err) {
    // run.json is the record and is already written, including this event in its outbox. A Manifest
    // that could not be updated is reported — never rolled back, never silently dropped — and catches
    // up on the next change or `state reconcile`.
    return { synced: false, reason: err.message, pendingEvents: (meta.stateEventSeq ?? 0) - (readAppliedEventSeq(runsDir, folderName) ?? 0) };
  }
}

/**
 * Replays any run-state events the Run Manifest is missing (after a failed or interrupted Manifest
 * write). Idempotent: with nothing pending it changes no history row.
 * @param {{now: Date, lock?: object}} opts
 */
function reconcileManifest(runsDir, folderName, opts = {}) {
  const { now, lock } = opts;
  assertDate(now, 'reconcileManifest');
  return withRunLock(runsDir, folderName, () => {
    const meta = readRunJson(runsDir, folderName);
    assertSupportedSchema(meta, folderName);
    if (isLegacy(meta)) {
      throw new RunStateError(`Run "${folderName}" predates the run state model; there is nothing to reconcile.`, 'LEGACY_RUN');
    }
    const before = readAppliedEventSeq(runsDir, folderName);
    const manifest = mirrorToManifest(runsDir, folderName, meta, now);
    return { manifest, before, after: readAppliedEventSeq(runsDir, folderName), lastEventSeq: meta.stateEventSeq ?? 0 };
  }, lock);
}

function getStageRecord(meta, id, ts) {
  if (!meta.stages[id]) {
    const def = STAGE_DEFINITIONS[id];
    meta.stages[id] = {
      stageId: id, name: def.name, checkpoint: def.checkpoint, status: 'Not Started',
      startedAt: null, lastStartedAt: null, completedAt: null, updatedAt: ts,
      attempts: 0, resumes: 0, revisions: 0, invocationPath: null, instruction: null,
      artifacts: [], reason: null,
      approval: {
        status: null, approvedBy: null, approvedAt: null, rejectedBy: null, rejectedAt: null,
        feedback: null, headerEvidence: [], previous: [],
      },
      history: [],
    };
  }
  return meta.stages[id];
}

function moveStage(stage, to, ts, by, reason) {
  const from = stage.status;
  if (!(STAGE_TRANSITIONS[from] || []).includes(to)) {
    throw new RunStateError(
      `Illegal transition for Stage ${stage.stageId}: ${from} → ${to}. Allowed from ${from}: ` +
      `${(STAGE_TRANSITIONS[from] || []).join(', ') || 'none'}.`,
      'ILLEGAL_TRANSITION'
    );
  }
  stage.status = to;
  stage.updatedAt = ts;
  stage.history = pushHistory(stage.history, { at: ts, from, to, by: by || 'Run Manager', reason: reason || null });
  return `Stage ${stage.stageId}: ${from} → ${to}`;
}

/**
 * A checkpoint artifact must carry a Status header the platform can read — it is what approval is
 * checked against (audit finding #8). An artifact that is not written yet is checked when approval is
 * requested; one that exists is checked when it is registered.
 */
function assertCheckpointHeader(p, runsDir, { mustExist = false } = {}) {
  const file = resolveArtifactPath(p, { runsDir });
  if (!fs.existsSync(file)) {
    if (mustExist) throw new RunStateError(`checkpoint artifact not found — ${p}.`, 'MISSING_ARTIFACT');
    return;
  }
  const h = readArtifactApprovalStatus(file);
  if (h.status === 'Unknown') {
    throw new RunStateError(
      `${p} cannot be a checkpoint: it has no Status header the platform recognizes (${h.source === 'unreadable' ? 'unreadable' : 'none found'}), ` +
      'so its approval could never be verified. Register the artifact whose header the reviewer sets (e.g. ManualExecutionSummary.md for 4M), ' +
      'or register this one as output/evidence.',
      'INVALID_CHECKPOINT'
    );
  }
}

/**
 * A checkpoint is what a reviewer approves FOR THIS RUN, so it must belong to the run's scope (Phase 9.2,
 * F-14): inside one of the run's scope roots (its module / module Feature / Supplier / shared scope folder,
 * stageGate.resolveScopeRoots) or inside the run's own folder. Another module's or Supplier's artifact is
 * refused — a cross-scope substitution would let one scope's approval stand in for another's.
 */
function assertCheckpointInScope(p, ctx) {
  if (!ctx.meta || !ctx.folderName) return;
  const dataRoot = path.dirname(ctx.runsDir);
  const { abs } = withinDataRoot(p, ctx.runsDir, 'checkpoint artifact');
  // eslint-disable-next-line global-require
  const { resolveScopeRoots } = require('./stageGate');
  const { roots } = resolveScopeRoots(ctx.meta, dataRoot);
  const allowed = [path.join(ctx.runsDir, ctx.folderName), ...roots.map((r) => r.dir)];
  const inside = (dir) => { const r = path.relative(path.resolve(dir), abs); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };
  if (!allowed.some(inside)) {
    throw new RunStateError(
      `${p} cannot be a checkpoint of this run: it is outside the run's scope (${roots.map((r) => r.label).join(', ') || 'no module/Feature/Supplier scope'}) and outside the run folder. ` +
      'A checkpoint is approved for the scope the run is bound to; an artifact of another scope is approved in a run bound to that scope.',
      'OUT_OF_SCOPE'
    );
  }
}

function addArtifacts(stage, artifacts, ts, forceKind, ctx = {}) {
  for (const a of artifacts) {
    const ref = typeof a === 'string' ? { path: a } : (a || {});
    const p = requireText(ref.path, 'artifact path', 'recordStageArtifacts');
    if (ctx.runsDir) withinDataRoot(p, ctx.runsDir);
    const kind = forceKind || ref.kind || 'output';
    if (!ARTIFACT_KINDS.includes(kind)) {
      throw new RunStateError(`Unknown artifact kind "${kind}". Expected one of: ${ARTIFACT_KINDS.join(', ')}.`, 'INVALID_ARGUMENT');
    }
    if (kind === 'checkpoint' && ctx.runsDir) assertCheckpointHeader(p, ctx.runsDir);
    if (kind === 'checkpoint' && ctx.runsDir) assertCheckpointInScope(p, ctx);
    const existing = stage.artifacts.find((x) => x.path === p);
    if (existing) existing.kind = kind === 'checkpoint' ? 'checkpoint' : existing.kind;
    else stage.artifacts.push({ path: p, kind, recordedAt: ts });
  }
}

// ---------------------------------------------------------------------------------------------
// Stage operations
// ---------------------------------------------------------------------------------------------

/**
 * Starts (or resumes, or retries) a stage: Not Started / Paused / Blocked / Failed → Running.
 * A Completed stage is re-entered only through reopenStage(), which needs a reason.
 * @param {{stageId: string, invocationPath: string, instruction?: string, by?: string, now: Date, expectedRevision?: number}} opts
 */
function startStage(runsDir, folderName, opts = {}) {
  const { stageId, invocationPath, instruction, by, now } = opts;
  assertDate(now, 'startStage');
  const id = normalizeStageId(stageId);
  if (!INVOCATION_PATHS.includes(invocationPath)) {
    throw new RunStateError(
      `startStage requires \`invocationPath\`, one of: ${INVOCATION_PATHS.join(', ')} (pipeline.md §5.3.1 #7). ` +
      `Got ${JSON.stringify(invocationPath)}.`,
      invocationPath ? 'INVALID_ARGUMENT' : 'MISSING_FIELD'
    );
  }
  // Self-Healing runs only when a named human invokes it (self-healing-skill §6.1, Phase 6).
  if (id === '5H') requireApprover(by, 'by', 'startStage(5H)', 'Stage 5H starts only on the explicit invocation of a named human, never automatically');
  const gate = runEntryGate(runsDir, folderName, id, invocationPath, opts);
  const expectedRevision = opts.expectedRevision ?? gate.revision ?? undefined;

  return applyChange(runsDir, folderName, { ...opts, expectedRevision }, (meta, ts) => {
    if (meta.status === 'Paused') {
      throw new RunStateError(`Run "${folderName}" is Paused. Resume the run before starting a stage.`, 'RUN_PAUSED');
    }
    const stage = getStageRecord(meta, id, ts);
    if (stage.status === 'Completed') {
      throw new RunStateError(
        `Stage ${id} is Completed. Re-entering a completed stage is a reopen, which needs a named person ` +
        'and a reason (reopenStage).',
        'ILLEGAL_TRANSITION'
      );
    }
    const from = stage.status;
    const transition = moveStage(stage, 'Running', ts, by, from === 'Paused' ? 'resumed' : null);
    if (from === 'Paused') stage.resumes = (stage.resumes || 0) + 1;
    else stage.attempts = (stage.attempts || 0) + 1;
    stage.startedAt = stage.startedAt || ts;
    stage.lastStartedAt = ts;
    stage.completedAt = null;
    stage.reason = null;
    stage.invocationPath = invocationPath;
    stage.instruction = instruction ?? null;
    keepGateEvidence(stage, gate);
    recordArtifactRefs(meta, runsDir, id, gate, ts, folderName);
    const mode = gate.decision === 'degraded' ? ', degraded' : gate.decision === 'not-checked' ? ', gate not checked' : '';
    return { stageId: id, transition: `${transition} (${invocationPath}${mode})`, by };
  });
}

/**
 * `moduleArtifactRefs[]` (run_manager.md §7, pipeline.md §7): which revision of each module, Feature,
 * Supplier or shared artifact this run consumed, and at which stage — so the run stays reproducible
 * after those artifacts move on. Taken from the artifacts the entry gate checked, with the content
 * fingerprint at that moment. Appended per stage: a new reference is written whenever the content a
 * stage consumes differs from what that stage last consumed, so each stage's last attempt can be compared
 * with the artifact as it is now (stageGate.consumedChanges — Phase 5.6A revalidation).
 */
function recordArtifactRefs(meta, runsDir, stageId, gate, ts, folderName) {
  const dataRoot = path.dirname(runsDir);
  // eslint-disable-next-line global-require
  const { snapshotRel, fingerprint } = require('./consumedVersions');
  const refs = Array.isArray(meta.moduleArtifactRefs) ? meta.moduleArtifactRefs : [];
  for (const c of gate.checks || []) {
    if (!c.artifact || !/^(modules|supplier-features)\//.test(c.artifact)) continue;
    try { withinDataRoot(c.artifact, runsDir, 'consumed artifact'); } catch { continue; }
    const sha256 = fingerprintFile(path.resolve(dataRoot, c.artifact));
    const last = refs.filter((r) => r.stage === stageId && r.artifact === c.artifact).pop();
    if (last && last.sha256 === sha256) continue;
    // An immutable copy of exactly what was consumed, named by its fingerprint, inside this run — so the
    // version an execution was built on can be read later even after the artifact moves on (Phase 5.7).
    let snapshot = null;
    if (sha256 && folderName) {
      try {
        const text = fs.readFileSync(path.resolve(dataRoot, c.artifact), 'utf8');
        if (fingerprint(text) === sha256) {
          snapshot = snapshotRel(folderName, sha256);
          const abs = path.resolve(dataRoot, snapshot);
          if (!fs.existsSync(abs)) { fs.mkdirSync(path.dirname(abs), { recursive: true }); writeFileAtomic(abs, text); }
        }
      } catch { snapshot = null; }
    }
    refs.push({ stage: stageId, artifact: c.artifact, upstreamStage: c.stage, scope: c.scope, header: c.header ?? null, integrity: c.integrity ?? null, sha256, ...(snapshot ? { snapshot } : {}), at: ts });
  }
  meta.moduleArtifactRefs = refs;
}

/**
 * Re-approving an artifact that changed after an earlier recorded approval is a change to approved
 * work: it needs an approved impact decision (recordImpactDecision) for exactly the current content.
 * An artifact never approved through the model, or unchanged since, needs none.
 */
function assertImpactDecided(meta, runsDir, files) {
  // eslint-disable-next-line global-require
  const { approvalHistory } = require('./stageGate');
  // eslint-disable-next-line global-require
  const { findScopeApproval } = require('./scopeApproval');
  const dataRoot = path.dirname(runsDir);
  for (const file of files) {
    const sha = fingerprintFile(file);
    if (!sha) continue;
    const priorShas = approvalHistory(runsDir, file).filter((e) => e.type === 'approved' && e.sha256).map((e) => e.sha256);
    const scopeRec = findScopeApproval(runsDir, file, { dataRoot });
    if (scopeRec) priorShas.push(...Object.values(scopeRec.record.fingerprints || {}));
    if (!priorShas.length || priorShas.includes(sha)) continue;
    const rel = path.relative(dataRoot, file).replace(/\\/g, '/');
    const decided = (meta.changeRequests || []).some((cr) => cr.decision === 'approved' && cr.artifact === rel && cr.artifactSha256 === sha);
    if (!decided) {
      throw new RunStateError(
        `${rel} changed after it was approved. Approving the changed version needs an approved impact decision for ` +
        `exactly this content: \`cli.js state impact --artifact ${rel} --base <revision> --record --decision approved --by "<name>" --reason "..."\` ` +
        '(run_manager.md §8.1, Phase 5). Approved artifacts are never changed silently.',
        'IMPACT_ANALYSIS_REQUIRED'
      );
    }
  }
}

/**
 * Records a human's decision on an impact analysis (changeImpact.js) in run.json `changeRequests[]`.
 * Refused when the analysis no longer describes the artifact (it changed since), when a change that
 * reaches several modules or Suppliers is approved without naming every one of them, or without a
 * named person and a reason.
 * @param {{analysis: object, decision: 'approved'|'rejected', by: string, reason: string,
 *          approvedModules?: string[], approvedSuppliers?: string[], now: Date}} opts
 */
function recordImpactDecision(runsDir, folderName, opts = {}) {
  const { analysis, decision, now } = opts;
  assertDate(now, 'recordImpactDecision');
  const by = requireApprover(opts.by, 'by', 'recordImpactDecision', 'an impact decision is a human decision');
  const reason = requireText(opts.reason, 'reason', 'recordImpactDecision');
  if (!analysis || !analysis.id || !analysis.artifact) throw new RunStateError('recordImpactDecision requires the `analysis` it decides on.', 'MISSING_FIELD');
  if (!['approved', 'rejected'].includes(decision)) throw new RunStateError('`decision` must be "approved" or "rejected".', 'INVALID_ARGUMENT');
  const file = path.resolve(path.dirname(runsDir), analysis.artifact);
  if (fingerprintFile(file) !== analysis.artifactSha256) {
    throw new RunStateError(`${analysis.artifact} changed after this impact analysis was produced — analyse it again.`, 'STALE_ANALYSIS');
  }
  const approvedModules = opts.approvedModules || [];
  const approvedSuppliers = opts.approvedSuppliers || [];
  if (decision === 'approved') {
    const missingModules = analysis.crossModule ? analysis.affected.modules.filter((m) => !approvedModules.includes(m)) : [];
    if (missingModules.length) {
      throw new RunStateError(
        `This change reaches several modules (${analysis.affected.modules.join(', ')}). Approving it means naming each one ` +
        `that may be changed — missing: ${missingModules.join(', ')} (--approved-modules).`,
        'CROSS_MODULE_APPROVAL_REQUIRED'
      );
    }
    const missingSuppliers = analysis.affected.suppliers.length > 1 ? analysis.affected.suppliers.filter((s) => !approvedSuppliers.includes(s)) : [];
    if (missingSuppliers.length) {
      throw new RunStateError(
        `This change reaches several Suppliers (${analysis.affected.suppliers.join(', ')}); each is independent. Name each one ` +
        `the change is approved for — missing: ${missingSuppliers.join(', ')} (--approved-suppliers).`,
        'SUPPLIER_APPROVAL_REQUIRED'
      );
    }
  }
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const record = {
      id: `CR-${(meta.changeRequests || []).length + 1}`,
      analysisId: analysis.id, at: ts, by, decision, reason,
      artifact: analysis.artifact, artifactSha256: analysis.artifactSha256,
      classification: analysis.classification, delta: analysis.delta,
      affected: {
        modules: analysis.affected.modules, suppliers: analysis.affected.suppliers,
        testCases: analysis.affected.testCases.length, approvedTestCases: analysis.affected.approvedTestCases,
        automation: analysis.affected.automation.length, executions: analysis.affected.executions.length,
        reports: analysis.affected.reports.length, findings: analysis.affected.findings,
      },
      approvedModules, approvedSuppliers, reasons: analysis.reasons,
    };
    meta.changeRequests = pushHistory(meta.changeRequests, record);
    return { by, reason, transition: `impact ${record.id} ${decision} for ${analysis.artifact} (${analysis.classification})`, result: { changeRequest: record } };
  });
}

/**
 * Records a human's decision on a requirement conflict (traceGraph.findConflicts). The conflict is not
 * resolved by this tool — the decision text says how a human resolved it; the conflict stops blocking.
 * @param {{conflictId: string, decision: string, by: string, now: Date}} opts
 */
function recordConflictDecision(runsDir, folderName, opts = {}) {
  const { now } = opts;
  assertDate(now, 'recordConflictDecision');
  const by = requireApprover(opts.by, 'by', 'recordConflictDecision', 'a requirement conflict is resolved by a human');
  const decision = requireText(opts.decision, 'decision', 'recordConflictDecision', 'state how the conflict is resolved');
  const conflictId = requireText(opts.conflictId, 'conflictId', 'recordConflictDecision');
  if (!/^CF-[0-9a-f]{10}$/.test(conflictId)) throw new RunStateError(`"${conflictId}" is not a conflict ID (CF-…).`, 'INVALID_ARGUMENT');
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    meta.conflictDecisions = pushHistory(meta.conflictDecisions, { conflictId, at: ts, by, decision });
    return { by, reason: decision, transition: `conflict ${conflictId} decided` };
  });
}

/**
 * Runs the entry gate (stageGate.js) for a start or a reopen, and returns its result when the stage may
 * proceed. When it blocks, the block is RECORDED — appended to the stage's gate history, never written
 * over earlier evidence — and GATE_BLOCKED is thrown.
 *
 * There is no public way to skip it. The only skip is the test-only `skipEntryGate` hook, which
 * `_setTestHooks` refuses to set outside the Node test runner, and a skipped gate is recorded on the
 * stage as `not-checked`.
 */
function runEntryGate(runsDir, folderName, id, invocationPath, opts) {
  const { by, now } = opts;
  if ('entryGate' in opts || 'dataRoot' in opts) {
    throw new RunStateError(
      'The entry gate cannot be skipped or pointed at another data root. Those options were removed; the ' +
      'gate always runs against this run\'s own data root.',
      'INVALID_ARGUMENT'
    );
  }
  if (Array.isArray(opts.scopeItems) && opts.scopeItems.length) {
    // Consuming only part of a partially approved artifact is a Human Decision: it is made by name.
    requireApprover(by, 'by', 'a partial-scope start', 'choosing to consume only an approved part of a partially approved artifact is a human decision');
  }
  if (testHooks.skipEntryGate) {
    return { decision: 'not-checked', checkedAt: now.toISOString(), invocationPath, reason: 'entry gate skipped by a test hook (Node test runner only)' };
  }
  // eslint-disable-next-line global-require
  const gate = require('./stageGate').checkStageEntry(runsDir, folderName, {
    stageId: id, invocationPath, modules: opts.modules, moduleFeature: opts.moduleFeature,
    conditions: opts.conditions, acceptStaleBy: opts.acceptStaleBy, scopeItems: opts.scopeItems, now,
  });
  if (gate.decision !== 'blocked') {
    if (gate.partialScope) gate.partialScope.requestedBy = by;
    return gate;
  }

  let recorded = false;
  try {
    recordGateBlock(runsDir, folderName, id, gate, { by, now, lock: opts.lock });
    recorded = true;
  } catch (err) {
    // A run that cannot take the record (terminal, legacy) still refuses the start; the gate's reasons
    // are returned on the error either way.
    if (!(err instanceof RunStateError)) throw err;
  }
  const err = new RunStateError(`Entry gate blocked Stage ${id}:\n  - ${gate.blockers.join('\n  - ')}`, 'GATE_BLOCKED');
  err.gate = gate;
  err.recorded = recorded;
  throw err;
}

/**
 * Records a blocked entry gate on the stage without losing earlier evidence: the result is appended
 * to `entryGateHistory`; a stage that had not started becomes Blocked with the reasons; a stage already
 * Blocked keeps its status, gets the new reasons as its current `reason`, and the change is appended to
 * its history — the previous reason stays readable there. Any other status is left as it is.
 */
function recordGateBlock(runsDir, folderName, id, gate, { by, now, lock }) {
  const reason = `Entry gate: ${gate.blockers.join(' · ')}`;
  return applyChange(runsDir, folderName, { now, lock }, (meta, ts) => {
    const stage = getStageRecord(meta, id, ts);
    keepGateEvidence(stage, gate);
    let transition;
    if (stage.status === 'Not Started') {
      transition = moveStage(stage, 'Blocked', ts, by, reason);
      stage.reason = reason;
    } else if (stage.status === 'Blocked') {
      stage.history = pushHistory(stage.history, { at: ts, from: 'Blocked', to: 'Blocked', by: by || 'Run Manager', reason, event: 'entry gate re-check' });
      stage.reason = reason;
      stage.updatedAt = ts;
      transition = `Stage ${id}: entry gate blocked again (stays Blocked)`;
    } else {
      stage.updatedAt = ts;
      transition = `Stage ${id}: entry gate blocked a re-entry (stays ${stage.status})`;
    }
    return { stageId: id, transition, by, reason: gate.blockers.join(' · ') };
  });
}

/** Keeps the latest gate result on the stage, and appends it to the stage's gate history. */
function keepGateEvidence(stage, gate) {
  const summary = summarizeGate(gate);
  stage.entryGate = summary;
  stage.entryGateHistory = pushHistory(stage.entryGateHistory, summary);
}

/** The part of a gate result worth keeping on the stage: the decision, why, and what it checked. */
function summarizeGate(gate) {
  return {
    decision: gate.decision,
    checkedAt: gate.checkedAt,
    invocationPath: gate.invocationPath ?? null,
    ...(gate.reason ? { reason: gate.reason } : {}),
    ...(gate.scope ? { scope: gate.scope } : {}),
    ...(gate.conditions && Object.keys(gate.conditions).length ? { conditions: gate.conditions } : {}),
    ...(gate.acceptedStaleBy ? { acceptedStaleBy: gate.acceptedStaleBy } : {}),
    ...(gate.partialScope ? { partialScope: gate.partialScope } : {}),
    ...(gate.executableScope ? { executableScope: gate.executableScope } : {}),
    ...(gate.blockers && gate.blockers.length ? { blockers: gate.blockers } : {}),
    gaps: gate.gaps || [],
    warnings: gate.warnings || [],
    checks: (gate.checks || []).map(({ stage, scope, artifact, result, integrity }) => ({
      stage, scope, ...(artifact ? { artifact } : {}), result, ...(integrity ? { integrity } : {}),
    })),
  };
}

/**
 * Adds artifact references to a stage (deduplicated by path). `kind: 'checkpoint'` marks an
 * approval-bearing artifact whose header approveStage() will verify.
 * @param {{stageId: string, artifacts: Array<string|{path: string, kind?: string}>, by?: string, now: Date, expectedRevision?: number}} opts
 */
function recordStageArtifacts(runsDir, folderName, opts = {}) {
  const { stageId, artifacts, by, now } = opts;
  assertDate(now, 'recordStageArtifacts');
  const id = normalizeStageId(stageId);
  if (!Array.isArray(artifacts) || !artifacts.length) {
    throw new RunStateError('recordStageArtifacts requires a non-empty `artifacts` list.', 'MISSING_FIELD');
  }
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage) throw new RunStateError(`Stage ${id} has not started — nothing to attach artifacts to.`, 'ILLEGAL_TRANSITION');
    if (stage.status === 'Completed') {
      throw new RunStateError(`Stage ${id} is Completed. Changing its artifacts needs a reopen first.`, 'ILLEGAL_TRANSITION');
    }
    addArtifacts(stage, artifacts, ts, undefined, { runsDir, meta, folderName });
    stage.updatedAt = ts;
    return { stageId: id, by };
  });
}

/**
 * Corrects a checkpoint registration made in error (audit finding #8): a named person, with a reason,
 * re-registers a checkpoint artifact as output or evidence before the stage completes. Nothing is
 * deleted — the registration keeps its original `recordedAt` and gains a `corrections[]` entry, the
 * stage gains a `registrationHistory` entry, and approval history is untouched. A stage that was
 * Waiting For Approval goes to Blocked: what the reviewer was asked to approve has changed, so approval
 * is requested again — after the stage re-enters through its entry gate (startStage).
 * @param {{stageId: string, artifact: string, kind: 'output'|'evidence', by: string, reason: string, now: Date, expectedRevision?: number}} opts
 */
function correctCheckpointRegistration(runsDir, folderName, opts = {}) {
  const { stageId, now } = opts;
  assertDate(now, 'correctCheckpointRegistration');
  const id = normalizeStageId(stageId);
  const by = requireApprover(opts.by, 'by', 'correctCheckpointRegistration', 'correcting what a reviewer is asked to approve is a human decision');
  const reason = requireText(opts.reason, 'reason', 'correctCheckpointRegistration');
  const artifact = requireText(opts.artifact, 'artifact', 'correctCheckpointRegistration');
  const kind = opts.kind;
  if (kind !== 'output' && kind !== 'evidence') {
    throw new RunStateError('A checkpoint registration is corrected to "output" or "evidence".', 'INVALID_ARGUMENT');
  }
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage) throw new RunStateError(`Stage ${id} has not started.`, 'ILLEGAL_TRANSITION');
    if (stage.status === 'Completed') {
      throw new RunStateError(`Stage ${id} is Completed; its approved checkpoints are part of the approval record. Reopen it first.`, 'ILLEGAL_TRANSITION');
    }
    const same = (x) => x.replace(/\\/g, '/') === artifact.replace(/\\/g, '/');
    const entry = (stage.artifacts || []).find((x) => same(x.path));
    if (!entry || entry.kind !== 'checkpoint') {
      throw new RunStateError(`${artifact} is not registered as a checkpoint of Stage ${id}.`, 'NOT_A_CHECKPOINT');
    }
    const correction = { at: ts, by, reason, from: 'checkpoint', to: kind };
    entry.kind = kind;
    entry.corrections = [...(entry.corrections || []), correction];
    stage.registrationHistory = pushHistory(stage.registrationHistory, { artifact: entry.path, ...correction });
    let transition = `Stage ${id}: checkpoint registration of ${entry.path} corrected to ${kind}`;
    if (stage.status === 'Waiting For Approval') {
      const why = `checkpoint registration corrected by ${by} (${reason}) — approval must be requested again`;
      transition = `${moveStage(stage, 'Blocked', ts, by, why)}; ${transition}`;
      stage.reason = why;
      stage.approval = { ...stage.approval, status: null };
    } else {
      stage.history = pushHistory(stage.history, { at: ts, from: stage.status, to: stage.status, by, reason, event: 'checkpoint registration corrected' });
      stage.updatedAt = ts;
    }
    return { stageId: id, transition, by, reason };
  });
}

/**
 * Opens the stage's checkpoint: Running → Waiting For Approval, approval → Pending Review / Pending
 * Automation Approval. Needs at least one checkpoint artifact (passed here or recorded earlier).
 * @param {{stageId: string, artifacts?: Array<string|{path: string}>, by?: string, now: Date, expectedRevision?: number}} opts
 */
function requestApproval(runsDir, folderName, opts = {}) {
  const { stageId, artifacts = [], by, now } = opts;
  assertDate(now, 'requestApproval');
  const id = normalizeStageId(stageId);
  const def = STAGE_DEFINITIONS[id];
  if (!def.checkpoint) {
    throw new RunStateError(
      `Stage ${id} has no checkpoint (pipeline.md §4), so it never waits for approval. Use completeStage.`,
      'NO_CHECKPOINT'
    );
  }
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage) throw new RunStateError(`Stage ${id} has not started.`, 'ILLEGAL_TRANSITION');
    if (artifacts.length) addArtifacts(stage, artifacts, ts, 'checkpoint', { runsDir, meta, folderName });
    if (!stage.artifacts.some((a) => a.kind === 'checkpoint')) {
      throw new RunStateError(
        `Stage ${id} has no checkpoint artifact. Name the artifact the reviewer will approve — its header ` +
        'is what approval is checked against.',
        'MISSING_FIELD'
      );
    }
    // Exit gate: the reviewer is asked to approve something that exists.
    const absent = stage.artifacts
      .filter((a) => a.kind === 'checkpoint' && !fs.existsSync(resolveArtifactPath(a.path, { runsDir })))
      .map((a) => a.path);
    if (absent.length) {
      throw new RunStateError(
        `Stage ${id} cannot request approval: checkpoint artifact(s) not found — ${absent.join(', ')}.`,
        'MISSING_ARTIFACT'
      );
    }
    // Every checkpoint carries a readable Status header, or its approval could never be verified.
    for (const a of stage.artifacts.filter((x) => x.kind === 'checkpoint')) assertCheckpointHeader(a.path, runsDir, { mustExist: true });
    const transition = moveStage(stage, 'Waiting For Approval', ts, by);
    stage.approval.status = PENDING_STATUS_FOR[def.checkpoint];
    return { stageId: id, transition: `${transition} (${stage.approval.status})`, by };
  });
}

/**
 * Stage 3's assertion contract (assertionContract.js, Phase 5.8): every NEW or MATERIALLY UPDATED test
 * case being approved states its assertions — a valid `**Assertions:**` table. "New or updated" is
 * measured against the suite as last approved (its recorded fingerprint, read back from any run's
 * snapshot or git); with no approval recorded, against the committed version; with neither, every case is
 * new. Unchanged legacy cases are never required to change. Refused with ASSERTIONS_REQUIRED, naming
 * every case and why.
 * @returns {string[]} non-blocking advisories on the new or changed cases (assertionContract.designAdvisories)
 */
function assertAssertionContract(runsDir, files, { only = null } = {}) {
  // eslint-disable-next-line global-require
  const { parseTestCases } = require('../test_suite_export/parseTestCases');
  // eslint-disable-next-line global-require
  const { designGate } = require('./assertionContract');
  // eslint-disable-next-line global-require
  const { findVersion, headVersion } = require('./consumedVersions');
  // eslint-disable-next-line global-require
  const { approvalHistory } = require('./stageGate');
  // eslint-disable-next-line global-require
  const { findScopeApproval } = require('./scopeApproval');
  const dataRoot = path.dirname(runsDir);
  const advisories = [];
  for (const file of files.filter((x) => /^TestCases_.+\.md$/.test(path.basename(x)))) {
    const rel = path.relative(dataRoot, file).replace(/\\/g, '/');
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const shas = approvalHistory(runsDir, file).filter((e) => e.type === 'approved' && e.sha256).map((e) => e.sha256).reverse();
    const scoped = findScopeApproval(runsDir, file, { dataRoot });
    if (scoped && scoped.record.fingerprints && scoped.record.fingerprints[rel]) shas.push(scoped.record.fingerprints[rel]);
    let baseline = null;
    for (const sha of shas) { baseline = findVersion(dataRoot, rel, sha); if (baseline) { baseline.basis = `last approved version (${baseline.basis})`; break; } }
    if (!baseline) { baseline = headVersion(dataRoot, rel); if (baseline) baseline.basis = 'the committed version (no approval recorded)'; }
    const before = baseline ? parseTestCases(baseline.text).cases : null;
    const g = designGate(parseTestCases(text, { sourceLabel: path.basename(file) }).cases, before, { only });
    for (const a of g.advisories) for (const n of a.notes) advisories.push(`${rel} ${a.id} ${n}`);
    if (!g.missing.length && !g.invalid.length) continue;
    const parts = [];
    if (g.missing.length) parts.push(`no Assertions table: ${g.missing.join(', ')}`);
    for (const x of g.invalid) parts.push(`${x.id}: ${x.issues.join('; ')}`);
    throw new RunStateError(
      `Approval refused: ${rel} has new or materially updated test case(s) without a valid structured assertion contract — ${parts.join(' · ')}. ` +
      `Compared with ${baseline ? baseline.basis : 'no earlier version (every case is new)'}. ` +
      'Each new or updated case states its assertions (Assertion ID · Expected · Expected Source · Check · Requirement — TestCase_entry.md); ' +
      'unchanged cases are not affected.',
      'ASSERTIONS_REQUIRED'
    );
  }
  return advisories;
}

/** Keeps an immutable copy of every approved checkpoint artifact, named by its fingerprint (Phase 5.8). */
function snapshotApproved(runsDir, folderName, files) {
  // eslint-disable-next-line global-require
  const { approvedSnapshotRel, fingerprint } = require('./consumedVersions');
  const dataRoot = path.dirname(runsDir);
  for (const file of files.filter((x) => /\.md$/i.test(x))) {
    withinDataRoot(file, runsDir, 'approved artifact');
    try {
      const text = fs.readFileSync(file, 'utf8');
      const abs = path.join(dataRoot, approvedSnapshotRel(folderName, fingerprint(text)));
      if (!fs.existsSync(abs)) { fs.mkdirSync(path.dirname(abs), { recursive: true }); writeFileAtomic(abs, text); }
    } catch { /* best effort: the fingerprint in headerEvidence is the record */ }
  }
}

/**
 * The exit check of a stage that executes tests (4M approval, 5A/5H completion) — Phase 9.1, F-02/F-03:
 *   - its latest outcome was recorded FROM ITS RESULTS (typed counts are not evidence) — OUTCOME_NOT_FROM_RESULTS;
 *   - every results file an outcome of this run was recorded from still matches its fingerprint — RESULTS_MODIFIED;
 *   - no results file of this stage was written after the outcome without being recorded — OUTCOME_STALE.
 */
function assertExecutionEvidence(runsDir, folderName, meta, id) {
  const stage = meta.stages[id];
  const o = stage && stage.outcome;
  if (!o || o.source !== 'results') {
    throw new RunStateError(
      `Stage ${id} cannot ${id === '4M' ? 'be approved' : 'complete'}: ${o ? `its outcome is typed counts (${o.source || 'typed'}), not evidence` : 'no outcome is recorded'}. ` +
      `Record the outcome from its results files: state outcome ${id} --from-results. Typed counts are kept as diagnostics only and never complete an execution stage.`,
      'OUTCOME_NOT_FROM_RESULTS'
    );
  }
  // Safety Preflight (Phase 9.2, F-16): a bound input that changed during execution invalidates it.
  {
    // eslint-disable-next-line global-require
    const pfc = require('./executionPreflight').checkPreflight(runsDir, folderName, id, { meta });
    if (pfc.record && !pfc.ok) throw new RunStateError(`Stage ${id} cannot ${id === '4M' ? 'be approved' : 'complete'}: ${pfc.reason}. Confirm the preflight again (state preflight ${id} ...).`, 'PREFLIGHT_STALE');
  }
  const integ = checkResultsIntegrity(runsDir, folderName, { meta });
  if (integ.state === 'modified') throw new RunStateError(integrityMessage(integ).replace(/^RESULTS_MODIFIED: /, ''), 'RESULTS_MODIFIED');
  const stale = integ.unrecorded.filter((u) => u.stage === id);
  if (stale.length) {
    throw new RunStateError(
      `Stage ${id} cannot ${id === '4M' ? 'be approved' : 'complete'}: ${stale.map((u) => u.file).join(', ')} ${stale.length === 1 ? 'was' : 'were'} written after the outcome was recorded. ` +
      `Record the outcome again (state outcome ${id} --from-results) so it covers every results cycle.`,
      'OUTCOME_STALE'
    );
  }
  return integ;
}

/**
 * Records a human approval: Waiting For Approval → Completed. Refused unless `approvedBy` is named AND
 * every checkpoint artifact's own header already reads Approved. This function never makes anything
 * approved; it records that the authoritative header says so, and who approved it.
 * @param {{stageId: string, approvedBy: string, now: Date, expectedRevision?: number}} opts
 */
function approveStage(runsDir, folderName, opts = {}) {
  const { stageId, now } = opts;
  assertDate(now, 'approveStage');
  const id = normalizeStageId(stageId);
  const approvedBy = requireApprover(opts.approvedBy, 'approvedBy', 'approveStage',
    'an approval must name the human who gave it; it is never inferred');
  if (!STAGE_DEFINITIONS[id].checkpoint) {
    throw new RunStateError(`Stage ${id} has no checkpoint, so there is nothing to approve.`, 'NO_CHECKPOINT');
  }
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage || stage.status !== 'Waiting For Approval') {
      throw new RunStateError(
        `Stage ${id} is ${stage ? stage.status : 'Not Started'}, not Waiting For Approval — there is no open ` +
        'checkpoint to approve.',
        'ILLEGAL_TRANSITION'
      );
    }
    for (const a of stage.artifacts.filter((x) => x.kind === 'checkpoint')) withinDataRoot(a.path, runsDir, 'checkpoint artifact');
    const headers = readHeaders(stage, { runsDir });
    const notApproved = headers.filter((h) => h.status !== 'Approved');
    if (!headers.length || notApproved.length) {
      throw new RunStateError(
        `Approval for Stage ${id} refused: the artifact header is authoritative and does not read Approved — ` +
        `${notApproved.map((h) => `${h.path}: ${h.status}${h.source === 'unreadable' ? ' (unreadable)' : ''}`).join('; ')}. ` +
        'Update the artifact\'s own status header first (pipeline.md §7), then record the approval.',
        'APPROVAL_NOT_IN_HEADER'
      );
    }
    if (id === '4A' || id === '5H') assertModuleAutomationApproval(runsDir, meta, stage);
    if (id === '4M') assertExecutionEvidence(runsDir, folderName, meta, id);
    const checkpointFiles = stage.artifacts.filter((a) => a.kind === 'checkpoint').map((a) => resolveArtifactPath(a.path, { runsDir }));
    assertImpactDecided(meta, runsDir, checkpointFiles);
    const advisories = id === '3' ? assertAssertionContract(runsDir, checkpointFiles) : [];
    snapshotApproved(runsDir, folderName, checkpointFiles);
    const transition = moveStage(stage, 'Completed', ts, approvedBy, 'approved');
    stage.completedAt = ts;
    stage.approval = {
      ...stage.approval,
      status: 'Approved', approvedBy, approvedAt: ts, rejectedBy: null, rejectedAt: null, feedback: null,
      headerEvidence: headers.map(({ path: p, status, raw, source, sha256 }) => ({ path: p, status, raw, source, sha256 })),
    };
    return { stageId: id, transition: `${transition} (Approved)`, by: approvedBy, ...(advisories.length ? { result: { advisories } } : {}) };
  });
}

// ---------------------------------------------------------------------------------------------
// Workflow selection, test outcomes, interruption recovery (Phase 3)
// ---------------------------------------------------------------------------------------------

/**
 * The three workflows (pipeline.md §5.4). Stage `5H` is in neither Full workflow and is never added
 * to one: it runs only when a human invokes it (§3.6) — as a Specific Stage, or directly.
 */
const WORKFLOWS = Object.freeze({
  'full-manual': Object.freeze(['1', '2', '3', '4M']),
  'full-automation': Object.freeze(['1', '2', '3', '4A', '5A', '6A']),
});
const WORKFLOW_TYPES = Object.freeze(['full-manual', 'full-automation', 'specific-stage']);

/**
 * Records the human's workflow choice (pipeline.md §5.4) in run.json `workflowPlan`. A later change of
 * mind is appended to `workflowPlan.history`, never written over, and needs a reason.
 * @param {{type: string, stageId?: string, by: string, reason?: string, now: Date, expectedRevision?: number}} opts
 */
function selectWorkflow(runsDir, folderName, opts = {}) {
  const { type, now } = opts;
  assertDate(now, 'selectWorkflow');
  const by = requireApprover(opts.by, 'by', 'selectWorkflow', 'choosing a workflow is a human decision (pipeline.md §5.4)');
  if (!WORKFLOW_TYPES.includes(type)) {
    throw new RunStateError(`Unknown workflow ${JSON.stringify(type)}. Expected one of: ${WORKFLOW_TYPES.join(', ')}.`, 'INVALID_ARGUMENT');
  }
  const stages = type === 'specific-stage' ? [normalizeStageId(opts.stageId)] : [...WORKFLOWS[type]];
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const prior = meta.workflowPlan || null;
    if (prior) requireText(opts.reason, 'reason', 'selectWorkflow', 'changing an already-selected workflow needs a reason');
    const { history = [], ...priorSelection } = prior || {};
    meta.workflowPlan = {
      type, stages, selectedBy: by, selectedAt: ts, reason: opts.reason ?? null,
      history: prior ? [...history, priorSelection] : [],
    };
    return {
      by, reason: opts.reason,
      transition: `workflow ${prior ? `changed ${prior.type} → ` : 'selected: '}${type}${type === 'specific-stage' ? ` (Stage ${stages[0]})` : ''}`,
    };
  });
}

/** Test-outcome statuses a stage may report (manual-execution-skill §8, automation-execution-skill §17). */
const OUTCOME_STATUSES = Object.freeze([
  'Passed', 'Failed', 'Blocked', 'Skipped', 'Not Executed', 'Inconclusive', 'Excluded', 'Flaky',
  'Application Failure', 'Automation Failure', 'Environment Failure', 'Infrastructure Failure', 'Configuration Failure',
  'Automation Repaired', 'Quarantined',
  // Phase 4 (testStatus.js): a Passed with no evidence, and a status this platform does not define.
  // Both are counted — never as a pass.
  'Unverified', 'Unrecognized',
]);
const FAILURE_STATUSES = Object.freeze(['Failed', 'Application Failure', 'Automation Failure', 'Environment Failure', 'Infrastructure Failure', 'Configuration Failure']);

/**
 * The testing verdict a set of outcome counts supports — never better than the evidence. No counts
 * means `not-recorded`; any failure means `failures`, whatever else passed; a repaired pass is never a
 * clean pass.
 */
function testVerdict(counts) {
  if (!counts) return 'not-recorded';
  const n = (k) => counts[k] || 0;
  const failed = FAILURE_STATUSES.reduce((s, k) => s + n(k), 0);
  const executed = Object.entries(counts).filter(([k]) => !['Excluded', 'Not Executed', 'Skipped'].includes(k)).reduce((s, [, v]) => s + v, 0);
  if (failed > 0) return 'failures';
  if (n('Blocked') + n('Inconclusive') + n('Quarantined') + n('Unverified') + n('Unrecognized') > 0) return 'incomplete';
  if (executed === 0) return 'nothing-executed';
  if (n('Automation Repaired') > 0) return 'passed-after-repair';
  if (n('Flaky') > 0) return 'passed-with-flaky';
  return 'all-passed';
}

/**
 * Records an execution stage's test outcome as TYPED COUNTS — diagnostic input only (Phase 9.1, F-02).
 * Typed counts carry no evidence: no results file, no fingerprint, no assertion records. They are kept
 * (`basis: 'typed'`, `verified: false`, the claimed verdict in `claimedVerdict`), but the recorded
 * verdict is never a pass: `failures` when the counts say so, otherwise `incomplete`. A stage that
 * executes tests is approved (4M) or completed (5A/5H) only with an outcome recorded FROM ITS RESULTS
 * (recordOutcomeFromResults), so typed counts can never complete a workflow as successful.
 * Appended to `outcomeHistory`; `outcome` is the latest.
 * @param {{stageId: string, counts: Record<string, number>, source?: string, by?: string, now: Date}} opts
 */
function recordOutcome(runsDir, folderName, opts = {}) {
  const { stageId, counts, now } = opts;
  assertDate(now, 'recordOutcome');
  const id = normalizeStageId(stageId);
  if (!['4M', '5A', '5H'].includes(id)) {
    throw new RunStateError(`Stage ${id} executes no tests; only 4M, 5A and 5H report a test outcome.`, 'INVALID_ARGUMENT');
  }
  if (!counts || typeof counts !== 'object' || !Object.keys(counts).length) {
    throw new RunStateError('recordOutcome requires `counts` — the number of results per status.', 'MISSING_FIELD');
  }
  for (const [k, v] of Object.entries(counts)) {
    if (!OUTCOME_STATUSES.includes(k)) throw new RunStateError(`Unknown outcome status "${k}". Expected: ${OUTCOME_STATUSES.join(', ')}.`, 'INVALID_ARGUMENT');
    if (!Number.isInteger(v) || v < 0) throw new RunStateError(`Outcome count for "${k}" must be a non-negative integer.`, 'INVALID_ARGUMENT');
  }
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage || stage.status === 'Not Started') throw new RunStateError(`Stage ${id} has not started.`, 'ILLEGAL_TRANSITION');
    const claimedVerdict = testVerdict(counts);
    const outcome = {
      at: ts, counts: { ...counts },
      verdict: claimedVerdict === 'failures' ? 'failures' : 'incomplete',
      claimedVerdict, basis: 'typed', verified: false,
      source: opts.source ?? 'typed counts', by: opts.by || 'Run Manager',
    };
    stage.outcome = outcome;
    stage.outcomeHistory = pushHistory(stage.outcomeHistory, outcome);
    stage.updatedAt = ts;
    return { stageId: id, by: opts.by, transition: `Stage ${id}: typed counts recorded — UNVERIFIED (${outcome.verdict}; claimed ${claimedVerdict}); not evidence, and never completes the stage` };
  });
}

/**
 * Records an execution stage's outcome FROM ITS RESULT FILES (executionHistory.js) — no typed counts.
 *
 *   - Every cycle (cycle 1, then each rerun-N) is read; the final status of each test, its first-attempt
 *     status, and every cycle's status are kept (`outcome.tests`).
 *   - Original results are immutable: every cycle file fingerprinted by an earlier recording, for any
 *     execution stage of this run, must still exist and match. A rewritten or deleted earlier cycle is
 *     refused (RESULTS_MODIFIED) — a rerun writes a new file.
 *   - No results file, or no per-test table, records nothing (NO_RESULTS): absence is never a pass.
 *   - A conflict (an unsupported capability recorded as executed, an application failure that later
 *     "passed" after a repair) or an unattributed recovery caps the verdict at `incomplete`.
 *   - Results are compared with the exact scope the stage's entry gate recorded (`executableScope`): a
 *     case outside it is counted Excluded with an `outside-approved-scope` conflict (Phase 5.6A).
 *   - A Passed counts only when its assertion records verify it (assertionEvidence.js, pipeline.md §11.4);
 *     duplicate rows, ambiguous IDs and Capability Plan exclusions are conflicts (Phase 5.6B).
 * @param {{stageId: '4M'|'5A'|'5H', by?: string, now: Date, expectedRevision?: number}} opts
 */
function recordOutcomeFromResults(runsDir, folderName, opts = {}) {
  const { stageId, now } = opts;
  assertDate(now, 'recordOutcomeFromResults');
  const id = normalizeStageId(stageId);
  if (!['4M', '5A', '5H'].includes(id)) {
    throw new RunStateError(`Stage ${id} executes no tests; only 4M, 5A and 5H report a test outcome.`, 'INVALID_ARGUMENT');
  }
  // eslint-disable-next-line global-require
  const { buildHistory } = require('./executionHistory');
  const dataRoot = path.dirname(runsDir);
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage || stage.status === 'Not Started') throw new RunStateError(`Stage ${id} has not started.`, 'ILLEGAL_TRANSITION');
    // Phase 9.2 (F-16): results are recorded only for an execution that actually started — a stage blocked at
    // its entry gate (no Safety Preflight, unapproved input …) never ran, so nothing it "produced" is evidence.
    if (!(stage.history || []).some((h) => h.to === 'Running')) {
      throw new RunStateError(`Stage ${id} never started (it is ${stage.status}${stage.reason ? `: ${String(stage.reason).slice(0, 160)}` : ''}) — results are recorded only for an execution that passed its entry gate.`, 'STAGE_NEVER_STARTED');
    }

    // Immutability: what was fingerprinted before must be exactly as it was.
    const recorded = new Map();
    for (const s of Object.values(meta.stages)) {
      for (const o of s.outcomeHistory || []) for (const c of o.cycles || []) recorded.set(c.file, c.sha256);
    }
    const changed = [...recorded].filter(([file, sha]) => fingerprintFile(path.resolve(dataRoot, file)) !== sha).map(([file]) => file);
    if (changed.length) {
      throw new RunStateError(
        `Original execution results were changed or removed after they were recorded: ${changed.join(', ')}. ` +
        'Recorded results are never overwritten — a rerun is written as a new rerun-N file (pipeline.md §6 Rule 7b).',
        'RESULTS_MODIFIED'
      );
    }

    const hist = buildHistory(runsDir, folderName, id);
    if (!hist.cycles.length) {
      throw new RunStateError(`Stage ${id} has no results file in this run — no outcome is recorded, and absence is never a pass.`, 'NO_RESULTS');
    }
    if (!hist.tests.length) {
      throw new RunStateError(`Stage ${id}'s results (${hist.cycles.map((c) => c.file).join(', ')}) contain no per-test table — nothing can be counted.`, 'NO_RESULTS');
    }

    let verdict = testVerdict(hist.counts);
    const capped = (hist.conflicts.length || hist.unattributed.length) && ['all-passed', 'passed-with-flaky', 'passed-after-repair', 'nothing-executed'].includes(verdict);
    if (capped) verdict = 'incomplete';
    const outcome = {
      at: ts,
      source: 'results',
      basis: 'results',
      by: opts.by || 'Run Manager',
      counts: hist.counts,
      verdict,
      firstAttemptCounts: hist.firstAttemptCounts,
      firstAttemptVerdict: testVerdict(hist.firstAttemptCounts),
      health: hist.health,
      cycles: hist.cycles,
      tests: hist.tests.map((t) => ({
        testCaseId: t.testCaseId, first: t.firstStatus, final: t.finalStatus,
        ...(t.finalReason ? { reason: t.finalReason } : {}),
        ...(t.blockedBy && t.blockedBy.length ? { blockedBy: t.blockedBy } : {}),
        cycles: t.history.map((h) => `${h.cycle}:${h.status}`),
        ...(t.history.length ? { assertions: t.history[t.history.length - 1].assertions } : {}),
      })),
      assertionSummary: hist.assertionSummary,
      assertionCoverage: hist.assertionCoverage,
      framework: hist.framework,
      sourceVersions: hist.sourceVersions,
      evidenceIssues: hist.evidenceIssues,
      identity: hist.identity,
      blocked: hist.blocked,
      dependentFailures: hist.dependentFailures,
      conflicts: hist.conflicts,
      unrecognized: hist.unrecognized,
      unattributed: hist.unattributed,
      scope: hist.scope,
      capability: hist.capability,
      sources: hist.sources,
    };
    stage.outcome = outcome;
    stage.outcomeHistory = pushHistory(stage.outcomeHistory, outcome);
    stage.updatedAt = ts;
    return {
      stageId: id, by: opts.by,
      transition: `Stage ${id}: test outcome recorded from ${hist.cycles.length} result cycle(s) (${verdict}; first attempt ${outcome.firstAttemptVerdict})`,
    };
  });
}

/**
 * Recovers a stage left `Running` by an interrupted session: Running → Failed, with the interruption as
 * the reason. It is then retried through the entry gate like any failed stage (startStage), so its
 * upstream approvals are revalidated. Whatever the interrupted attempt wrote stays where it is.
 * @param {{stageId: string, by: string, reason: string, now: Date, expectedRevision?: number}} opts
 */
function recoverStage(runsDir, folderName, opts = {}) {
  const { stageId, now } = opts;
  assertDate(now, 'recoverStage');
  const id = normalizeStageId(stageId);
  const by = requireApprover(opts.by, 'by', 'recoverStage', 'only a human can say a stage is not still being worked on');
  const reason = requireText(opts.reason, 'reason', 'recoverStage');
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage || stage.status !== 'Running') {
      throw new RunStateError(`Stage ${id} is ${stage ? stage.status : 'Not Started'}, not Running — there is nothing to recover.`, 'ILLEGAL_TRANSITION');
    }
    const full = `Interrupted: ${reason}`;
    const transition = moveStage(stage, 'Failed', ts, by, full);
    stage.reason = full;
    return { stageId: id, transition: `${transition} (recovered after interruption)`, by, reason: full };
  });
}

/**
 * Records a reviewer's PARTIAL approval of an artifact whose header reads `Mixed` (scopeApproval.js):
 * which items are Approved, Pending and Rejected, what each depends on and affects, and fingerprints of
 * every file the scope was read from. It never changes the artifact's header and never approves the
 * artifact as a whole; it is the evidence a stage needs to consume only an approved, independent part.
 *
 * Refused unless: a named `approvedBy`; the artifact is inside this run's own scope; its header reads
 * `Mixed`; and its item-level source is structured (test cases' Review fields, or an `## Approval
 * Scope` table) and reads cleanly.
 * @param {{artifact: string, approvedBy: string, now: Date, expectedRevision?: number}} opts
 */
function approveScope(runsDir, folderName, opts = {}) {
  const { now } = opts;
  assertDate(now, 'approveScope');
  const approvedBy = requireApprover(opts.approvedBy, 'approvedBy', 'approveScope', 'a partial approval must name the reviewer who gave it');
  const ref = requireText(opts.artifact, 'artifact', 'approveScope');
  // eslint-disable-next-line global-require
  const scope = require('./scopeApproval');
  // eslint-disable-next-line global-require
  const { resolveScopeRoots } = require('./stageGate');
  const dataRoot = path.dirname(runsDir);
  withinDataRoot(ref, runsDir, 'partially approved artifact');
  const file = resolveArtifactPath(ref, { runsDir });
  if (!fs.existsSync(file)) throw new RunStateError(`approveScope: ${ref} does not exist.`, 'MISSING_ARTIFACT');

  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const { roots } = resolveScopeRoots(meta, dataRoot);
    const root = roots.find((r) => path.resolve(file).toLowerCase().startsWith(path.resolve(r.dir).toLowerCase() + path.sep));
    if (!root) {
      throw new RunStateError(
        `approveScope: ${ref} is outside this run's scope (${roots.map((r) => r.label).join(', ') || 'none'}). ` +
        'A partial approval is recorded in a run scoped to that module.',
        'OUT_OF_SCOPE'
      );
    }
    assertImpactDecided(meta, runsDir, [file]);
    const header = readArtifactApprovalStatus(file).status;
    let scopeAdvisories = [];
    if (header === 'Mixed' && /^TestCases_.+\.md$/.test(path.basename(file))) {
      // The cases this partial approval approves meet the assertion contract (Phase 5.8).
      let approvedCases = [];
      try { approvedCases = Object.entries(scope.buildScopeItems(file, { runsDir, preferMeta: meta, preferRun: folderName }).items).filter(([, it]) => it.status === 'Approved').map(([tcId]) => tcId); } catch { /* reported below */ }
      scopeAdvisories = assertAssertionContract(runsDir, [file], { only: approvedCases });
    }
    if (header !== 'Mixed') {
      throw new RunStateError(
        `approveScope: ${ref}'s header reads ${header}. A partial approval applies only to an artifact whose header ` +
        'records both approved and open items (Mixed). A fully approved artifact needs no scope; a Pending or ' +
        'Rejected one is not partly approved.',
        'NOT_PARTIAL'
      );
    }
    let built;
    try {
      built = scope.buildScopeItems(file, { runsDir, preferMeta: meta, preferRun: folderName }); // PE-03: the suite's own matrix
    } catch (err) {
      if (err instanceof scope.ScopeApprovalError) throw new RunStateError(`approveScope: ${err.message}`, err.code);
      throw err;
    }
    const rel = (p) => path.relative(dataRoot, p).replace(/\\/g, '/');
    const record = {
      id: `SA-${(meta.scopeApprovals || []).length + 1}`,
      at: ts,
      approvedBy,
      scope: root.label,
      module: root.module,
      artifact: rel(file),
      kind: built.kind,
      header,
      fingerprints: Object.fromEntries(built.sources.map((s) => [rel(s), fingerprintFile(s)])),
      summary: scope.summarize(built.items),
      items: built.items,
    };
    meta.scopeApprovals = pushHistory(meta.scopeApprovals, record);
    const s = record.summary;
    return {
      by: approvedBy,
      transition: `scope approval ${record.id} recorded for ${record.artifact} (${s.approved} approved / ${s.pending} pending / ${s.rejected} rejected)`,
      result: { scopeApproval: record, ...(scopeAdvisories.length ? { advisories: scopeAdvisories } : {}) },
    };
  });
}

/**
 * Stage 4A / 5H approval must agree with the Module Manager, the automation approval authority
 * (pipeline.md §5.2, §12.9) — this check adds no authority of its own. For each module in the run:
 *   - a module that still has its own project must be `Approved` in .module_automation_state.json,
 *     approved after this stage last started (an older approval covered older code);
 *   - a `Promoted` module has no merge to approve: its change must be recorded with
 *     recordBaselineUpdate() — named approver, commit — after this stage last started.
 * Anything else means the plan/summary header says Approved while the authority does not, and the
 * stage is not completed. Supplier-Feature runs carry no module automation state and are not checked.
 */
/**
 * Records a LEGACY APPROVAL ATTESTATION (Phase 9.1, F-01; legacyProvenance.js): a named human carries an
 * approval made before the run state model existed into this run. It is the only way an artifact with
 * no recorded approval can authorize a downstream stage, and it is refused unless
 *   - the artifact is inside the data root, reads Approved, and has NO recorded approval history (a
 *     recorded rejection, withdrawal or open review is never overridden);
 *   - the named legacy run is genuinely legacy (no run state model) and references the artifact in a
 *     file that is committed and unmodified in git;
 *   - the artifact itself is committed and unmodified — its fingerprint is recorded, so a later edit
 *     makes the attestation stale exactly like any modified approval.
 * Recorded in THIS run's run.json (`legacyApprovals[]`); the historical run is never written to.
 * @param {{artifact: string, legacyRun: string, approvedBy: string, reason: string, now: Date, expectedRevision?: number}} opts
 */
function attestLegacyApproval(runsDir, folderName, opts = {}) {
  const { now } = opts;
  assertDate(now, 'attestLegacyApproval');
  const approvedBy = requireApprover(opts.approvedBy, 'approvedBy', 'attestLegacyApproval', 'a legacy approval is attested by the named human who approved it');
  const reason = requireText(opts.reason, 'reason', 'attestLegacyApproval', 'say where and when it was approved');
  const ref = requireText(opts.artifact, 'artifact', 'attestLegacyApproval');
  const legacyRun = requireText(opts.legacyRun, 'legacyRun', 'attestLegacyApproval', 'name the legacy run that approved it');
  const artifact = withinDataRoot(ref, runsDir, 'attested artifact');
  if (!fs.existsSync(artifact.abs)) throw new RunStateError(`attestLegacyApproval: ${ref} does not exist.`, 'MISSING_ARTIFACT');
  // eslint-disable-next-line global-require
  const { proveLegacyApproval } = require('./legacyProvenance');
  // eslint-disable-next-line global-require
  const { approvalHistory } = require('./stageGate');
  const dataRoot = path.dirname(runsDir);
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const proof = proveLegacyApproval({
      runsDir, dataRoot, artifact, legacyRun,
      header: readArtifactApprovalStatus(artifact.abs),
      history: approvalHistory(runsDir, artifact.abs, { dataRoot }),
      fail: (msg, code) => { throw new RunStateError(msg, code); },
    });
    const prior = (meta.legacyApprovals || []).find((a) => a.artifact === proof.artifact && a.sha256 === proof.sha256);
    if (prior) throw new RunStateError(`${proof.artifact} is already attested at this content (${prior.id}, by ${prior.approvedBy}).`, 'ALREADY_ATTESTED');
    const record = { id: `LA-${(meta.legacyApprovals || []).length + 1}`, ...proof, approvedBy, reason, at: ts };
    meta.legacyApprovals = pushHistory(meta.legacyApprovals, record);
    return { by: approvedBy, reason, transition: `legacy approval attested: ${proof.artifact} (${record.id}, from ${legacyRun})`, result: { legacyApproval: record } };
  });
}

/**
 * Records a SAFETY PREFLIGHT for an execution stage (Phase 9.2, F-16; executionPreflight.js): the named
 * human's confirmation of environment, safety policy, target URL, execution type and (browser only) mode,
 * and the intended operations — each evaluated by Execution Safety. A refusal is recorded too (the audit
 * trail keeps every confirmation and refusal) and reported as PREFLIGHT_REFUSED after it is written.
 * Appended to run.json `safetyPreflights[]`; metadata/SafetyPreflight.md is regenerated from it.
 * @param {{stageId: string, environment: string, targetUrl: string, executionType: string, executionMode?: string,
 *          operations: object[], confirmedBy: string, policyFile?: string, now: Date, expectedRevision?: number}} opts
 */
function recordSafetyPreflight(runsDir, folderName, opts = {}) {
  const { now } = opts;
  assertDate(now, 'recordSafetyPreflight');
  const id = normalizeStageId(opts.stageId);
  // eslint-disable-next-line global-require
  const pf = require('./executionPreflight');
  let record = null;
  const res = applyChange(runsDir, folderName, opts, (meta, ts) => {
    record = { id: `SP-${(meta.safetyPreflights || []).length + 1}`, ...pf.evaluatePreflight({ runsDir, folderName, meta, ...opts, stageId: id, now: new Date(ts) }) };
    meta.safetyPreflights = pushHistory(meta.safetyPreflights, record);
    try {
      writeFileAtomic(path.join(runsDir, folderName, 'metadata', 'SafetyPreflight.md'), pf.renderPreflightTrail(folderName, meta.safetyPreflights));
    } catch { /* run.json holds the record; the Markdown is its rendering */ }
    return {
      by: record.confirmedBy || 'Run Manager',
      transition: `Stage ${id}: Safety Preflight ${record.id} ${record.decision}${record.decision === 'refused' ? ` — ${record.refusals.length} reason(s)` : ` (${record.environment}, ${record.executionType}${record.executionMode ? ` ${record.executionMode}` : ''})`}`,
      result: { safetyPreflight: record },
    };
  });
  if (record.decision !== 'confirmed') {
    const err = new RunStateError(`Safety Preflight ${record.id} for Stage ${id} REFUSED (recorded): ${record.refusals.join('; ')}`, 'PREFLIGHT_REFUSED');
    err.result = res;
    throw err;
  }
  return res;
}

function assertModuleAutomationApproval(runsDir, meta, stage) {
  const modules = Array.isArray(meta.modules) ? meta.modules : [];
  const since = stage.lastStartedAt || stage.startedAt;
  const problems = [];
  for (const m of modules) {
    const file = path.join(path.dirname(runsDir), 'modules', m, 'automation', '.module_automation_state.json');
    let st;
    try {
      st = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      problems.push(`${m}: no Module Manager automation record (.module_automation_state.json)`);
      continue;
    }
    if (st.state === 'Approved') {
      const approval = [...(st.history || [])].reverse().find((h) => h.state === 'Approved');
      if (!approval || !st.approvedBy) problems.push(`${m}: automation is Approved but names no approver`);
      else if (since && approval.at < since) problems.push(`${m}: the recorded Automation Approval (${approval.at}) predates this stage (${since}) — it covered earlier code`);
    } else if (st.state === 'Promoted') {
      const update = [...(st.baselineUpdates || [])].reverse().find((u) => u.approvedBy && u.baselineRef);
      if (!update || (since && update.at < since)) {
        problems.push(`${m}: Promoted — the in-place baseline change must be recorded with recordBaselineUpdate (named approver, commit) before this approval`);
      }
    } else {
      problems.push(`${m}: the Module Manager records automation ${st.state ?? '(none)'}, not Approved`);
    }
  }
  if (problems.length) {
    throw new RunStateError(
      `Approval for Stage ${stage.stageId} refused: the artifact header and the Module Manager's Automation Approval disagree — ` +
      `${problems.join('; ')}. Record the module's Automation Approval first (module_manager cli.js automation <module> --state Approved --by "<name>"), then approve.`,
      'APPROVAL_CONFLICT'
    );
  }
}

/**
 * Records a rejection: Waiting For Approval → Blocked, approval → Rejected, feedback kept. The same
 * stage revises its output next (startStage), per pipeline.md §5.3 #4.
 * @param {{stageId: string, rejectedBy: string, feedback: string, now: Date, expectedRevision?: number}} opts
 */
function rejectStage(runsDir, folderName, opts = {}) {
  const { stageId, now } = opts;
  assertDate(now, 'rejectStage');
  const id = normalizeStageId(stageId);
  const rejectedBy = requireApprover(opts.rejectedBy, 'rejectedBy', 'rejectStage');
  const feedback = requireText(opts.feedback, 'feedback', 'rejectStage',
    'the revision that follows is what the reviewer asked for, so the reason must be kept');
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage || stage.status !== 'Waiting For Approval') {
      throw new RunStateError(`Stage ${id} is ${stage ? stage.status : 'Not Started'}, not Waiting For Approval.`, 'ILLEGAL_TRANSITION');
    }
    const reason = `Rejected by ${rejectedBy}: ${feedback}`;
    const transition = moveStage(stage, 'Blocked', ts, rejectedBy, reason);
    stage.reason = reason;
    stage.revisions = (stage.revisions || 0) + 1;
    stage.approval = { ...stage.approval, status: 'Rejected', rejectedBy, rejectedAt: ts, feedback };
    return { stageId: id, transition: `${transition} (Rejected)`, by: rejectedBy, reason: feedback };
  });
}

/**
 * Completes a stage that has no checkpoint (5A, 6A): Running → Completed. A checkpointed stage can
 * only complete through approveStage — finishing is never approval (pipeline.md §5.3 #5).
 * @param {{stageId: string, by?: string, now: Date, expectedRevision?: number}} opts
 */
function completeStage(runsDir, folderName, opts = {}) {
  const { stageId, by, now } = opts;
  assertDate(now, 'completeStage');
  const id = normalizeStageId(stageId);
  const def = STAGE_DEFINITIONS[id];
  if (def.checkpoint) {
    throw new RunStateError(
      `Stage ${id} has a ${def.checkpoint} checkpoint, so it completes only through a recorded human ` +
      'approval (requestApproval, then approveStage). Finishing the work is not approval.',
      'APPROVAL_REQUIRED'
    );
  }
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage) throw new RunStateError(`Stage ${id} has not started.`, 'ILLEGAL_TRANSITION');
    // Exit gate: a stage is complete only when what it produced is registered and on disk.
    const produced = (stage.artifacts || []).filter((a) => a.kind !== 'evidence'
      && fs.existsSync(resolveArtifactPath(a.path, { runsDir })));
    if (!produced.length) {
      throw new RunStateError(
        `Stage ${id} cannot complete: no produced artifact is registered and present. Register its output ` +
        '(e.g. execution/ExecutionResults.md, reporting/Final_QA_Report.md) first.',
        'NO_OUTPUT'
      );
    }
    // Run evidence is written once (pipeline.md §6 Rule 7b). An output fingerprinted by an earlier
    // completion of this stage that has since changed was overwritten — a reopened 6A writes
    // Final_QA_Report.rev-N.md, a rerun writes rerun-N, never over the first.
    const overwritten = (stage.completions || []).flatMap((c) => c.outputs)
      .filter((o) => o.sha256 && fs.existsSync(resolveArtifactPath(o.path, { runsDir }))
        && fingerprintFile(resolveArtifactPath(o.path, { runsDir })) !== o.sha256)
      .map((o) => o.path);
    if (overwritten.length) {
      throw new RunStateError(
        `Stage ${id} cannot complete: ${[...new Set(overwritten)].join(', ')} was changed after an earlier completion recorded it. ` +
        'Earlier results and reports are never overwritten — write a new revision (Final_QA_Report.rev-N.md, *.rerun-N.md).',
        'OUTPUT_OVERWRITTEN'
      );
    }
    // Execution exit gate (Phase 9.1, F-02/F-03): an outcome from intact, current results.
    if (id === '5A' || id === '5H') assertExecutionEvidence(runsDir, folderName, meta, id);
    // Reporting exit gate (Phase 5.6A, audit finding #1): 6A completes only with a verified report.
    const reportCheck = id === '6A' ? assertReportVerified(runsDir, meta, stage, folderName) : null;
    const transition = moveStage(stage, 'Completed', ts, by);
    stage.completedAt = ts;
    stage.completions = pushHistory(stage.completions, {
      at: ts,
      outputs: produced.map((a) => ({ path: a.path, sha256: fingerprintFile(resolveArtifactPath(a.path, { runsDir })) })),
      ...(reportCheck ? { reportCheck } : {}),
    });
    return { stageId: id, transition, by };
  });
}

/**
 * The reporting exit gate: Stage 6A completes only when its latest registered Final QA Report passes
 * report-check (reportIntegrity.checkReportConsistency) against the run's authoritative recorded
 * outcome — the Markdown, its .report.json model and the .html built from it must all exist and agree
 * with each other and with that outcome, including its verdict. It runs inside completeStage, so the
 * CLI and the API go through the same check; there is no option to skip it. Earlier revisions are not
 * re-checked: each was verified when it was delivered, and stays as it was (OUTPUT_OVERWRITTEN).
 * @returns {{report: string, model: string, html: string, outcomeStage: string|null, outcomeAt: string|null, verdict: string|null}}
 */
function assertReportVerified(runsDir, meta, stage, folderName) {
  // eslint-disable-next-line global-require
  const { checkReportConsistency, authoritativeOutcome, contractPosition } = require('./reportIntegrity');
  const revisionOf = (p) => { const m = p.match(/\.rev-(\d+)\.md$/); return m ? Number(m[1]) : 0; };
  const reports = (stage.artifacts || [])
    .filter((a) => a.kind !== 'evidence' && /(^|\/)Final_QA_Report(\.rev-\d+)?\.md$/.test(a.path.replace(/\\/g, '/')))
    .sort((a, b) => revisionOf(a.path) - revisionOf(b.path));
  if (!reports.length) {
    throw new RunStateError(
      'Stage 6A cannot complete: no Final QA Report is registered. Write it at the path `state report-path` gives ' +
      '(Final_QA_Report.md, or Final_QA_Report.rev-N.md after a delivered report), build its HTML, and register the Markdown ' +
      '(state artifact 6A --artifacts <path>).',
      'REPORT_NOT_REGISTERED'
    );
  }
  const latest = reports[reports.length - 1].path;
  const md = resolveArtifactPath(latest, { runsDir });
  const base = md.replace(/\.md$/, '');
  const found = authoritativeOutcome(meta);
  const res = checkReportConsistency({
    md, json: `${base}.report.json`, html: `${base}.html`, outcome: found ? found.outcome : undefined,
    contract: folderName ? contractPosition(runsDir, folderName) : null,
    evidence: folderName ? checkResultsIntegrity(runsDir, folderName, { meta }) : null,
    requireOutcome: true, requireVerdict: true,
  });
  if (!res.ok) {
    throw new RunStateError(
      `Stage 6A cannot complete: ${latest} is not verified against ${found ? `the outcome recorded for Stage ${found.stageId} at ${found.outcome.at}` : 'any recorded outcome'} — ` +
      `${res.issues.join('; ')}. Correct the report model, rebuild the HTML, and check it with state report-check. ` +
      'A report is never completed unverified.',
      'REPORT_UNVERIFIED'
    );
  }
  const rel = (p) => path.relative(path.dirname(runsDir), p).replace(/\\/g, '/');
  return {
    report: latest, model: rel(`${base}.report.json`), html: rel(`${base}.html`),
    outcomeStage: found ? found.stageId : null, outcomeAt: found ? found.outcome.at : null,
    verdict: found ? found.outcome.verdict : null,
  };
}

/**
 * Marks a stage Blocked (it cannot proceed without a human): Not Started / Running → Blocked.
 * @param {{stageId: string, reason: string, by?: string, now: Date, expectedRevision?: number}} opts
 */
function blockStage(runsDir, folderName, opts = {}) {
  const { stageId, by, now } = opts;
  assertDate(now, 'blockStage');
  const id = normalizeStageId(stageId);
  const reason = requireText(opts.reason, 'reason', 'blockStage', 'a blocked stage must say what it is waiting on');
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = getStageRecord(meta, id, ts);
    if (stage.status === 'Waiting For Approval') {
      // The only way out of an open checkpoint is a human decision: approveStage or rejectStage
      // (which needs the reviewer and their feedback). Blocking it would bypass both.
      throw new RunStateError(
        `Stage ${id} is Waiting For Approval. Only a reviewer's decision moves it — approve or reject.`,
        'ILLEGAL_TRANSITION'
      );
    }
    const transition = moveStage(stage, 'Blocked', ts, by, reason);
    stage.reason = reason;
    return { stageId: id, transition, by, reason };
  });
}

/**
 * Marks a stage Failed (an error stopped it): Running / Blocked → Failed. The run becomes Blocked, not
 * Failed — failing the whole run is a separate, explicit decision (failRun).
 * @param {{stageId: string, reason: string, by?: string, now: Date, expectedRevision?: number}} opts
 */
function failStage(runsDir, folderName, opts = {}) {
  const { stageId, by, now } = opts;
  assertDate(now, 'failStage');
  const id = normalizeStageId(stageId);
  const reason = requireText(opts.reason, 'reason', 'failStage');
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    const stage = meta.stages[id];
    if (!stage) throw new RunStateError(`Stage ${id} has not started.`, 'ILLEGAL_TRANSITION');
    const transition = moveStage(stage, 'Failed', ts, by, reason);
    stage.reason = reason;
    return { stageId: id, transition, by, reason };
  });
}

/**
 * Re-opens a Completed stage for revision: Completed → Running. The earlier approval is kept in
 * `approval.previous` and the stage must pass its checkpoint again.
 * @param {{stageId: string, by: string, reason: string, invocationPath?: string, now: Date, expectedRevision?: number}} opts
 */
function reopenStage(runsDir, folderName, opts = {}) {
  const { stageId, now } = opts;
  assertDate(now, 'reopenStage');
  const id = normalizeStageId(stageId);
  const by = requireApprover(opts.by, 'by', 'reopenStage', 'reopening a completed stage is a human decision');
  const reason = requireText(opts.reason, 'reason', 'reopenStage');
  if (opts.invocationPath && !INVOCATION_PATHS.includes(opts.invocationPath)) {
    throw new RunStateError(`Unknown invocationPath ${JSON.stringify(opts.invocationPath)}.`, 'INVALID_ARGUMENT');
  }
  // A reopen re-enters the stage, so it passes the same entry gate a start does.
  const current = readRunState(runsDir, folderName).stages[id];
  const gate = runEntryGate(runsDir, folderName, id, opts.invocationPath || current.invocationPath || 'Direct', opts);
  return applyChange(runsDir, folderName, { ...opts, expectedRevision: opts.expectedRevision ?? gate.revision ?? undefined }, (meta, ts) => {
    if (meta.status === 'Paused') {
      throw new RunStateError(`Run "${folderName}" is Paused. Resume the run first.`, 'RUN_PAUSED');
    }
    const stage = meta.stages[id];
    if (!stage || stage.status !== 'Completed') {
      throw new RunStateError(`Stage ${id} is ${stage ? stage.status : 'Not Started'}, not Completed — nothing to reopen.`, 'ILLEGAL_TRANSITION');
    }
    const transition = moveStage(stage, 'Running', ts, by, reason);
    const { previous = [], ...prior } = stage.approval || {};
    stage.approval = {
      status: null, approvedBy: null, approvedAt: null, rejectedBy: null, rejectedAt: null, feedback: null,
      headerEvidence: [], previous: [...previous, { ...prior, reopenedAt: ts, reopenedBy: by, reopenReason: reason }],
    };
    stage.revisions = (stage.revisions || 0) + 1;
    stage.attempts = (stage.attempts || 0) + 1;
    stage.lastStartedAt = ts;
    keepGateEvidence(stage, gate);
    stage.completedAt = null;
    if (opts.invocationPath) stage.invocationPath = opts.invocationPath;
    return { stageId: id, transition: `${transition} (reopened)`, by, reason };
  });
}

// ---------------------------------------------------------------------------------------------
// Run operations
// ---------------------------------------------------------------------------------------------

/**
 * Pauses the run deliberately (not a checkpoint). Every Running stage becomes Paused.
 * @param {{by: string, reason?: string, now: Date, expectedRevision?: number}} opts
 */
function pauseRun(runsDir, folderName, opts = {}) {
  const { reason, now } = opts;
  assertDate(now, 'pauseRun');
  const by = requireText(opts.by, 'by', 'pauseRun', 'a pause is a deliberate human instruction');
  return applyChange(runsDir, folderName, opts, (meta, ts) => {
    if (meta.status === 'Paused') throw new RunStateError(`Run "${folderName}" is already Paused.`, 'ILLEGAL_TRANSITION');
    const paused = [];
    for (const stage of Object.values(meta.stages)) {
      if (stage.status === 'Running') {
        moveStage(stage, 'Paused', ts, by, reason || 'run paused');
        paused.push(stage.stageId);
      }
    }
    return {
      runStatus: 'Paused', runReason: reason || 'paused', by, reason,
      transition: paused.length ? `paused stage(s) ${paused.join(', ')}` : 'run paused',
    };
  });
}

/**
 * Resumes a Paused run. Its status is re-derived from the stages; a stage paused with the run stays
 * Paused until it is started again (startStage), so the resume point is explicit.
 * @param {{by: string, now: Date, expectedRevision?: number}} opts
 */
function resumeRun(runsDir, folderName, opts = {}) {
  const { now } = opts;
  assertDate(now, 'resumeRun');
  const by = requireText(opts.by, 'by', 'resumeRun');
  return applyChange(runsDir, folderName, opts, (meta) => {
    if (meta.status !== 'Paused') throw new RunStateError(`Run "${folderName}" is ${meta.status}, not Paused.`, 'ILLEGAL_TRANSITION');
    return { runStatus: deriveRunStatus(meta), runReason: 'resumed', by, transition: 'run resumed' };
  });
}

/**
 * Marks the run Completed. Allowed only when a branch's terminal stage is done — 4M approved (Manual)
 * or 6A completed (Automation), run_manager.md §8 — and no stage is still running, paused, waiting,
 * blocked or failed. Completion of the workflow says nothing about test results.
 * @param {{by: string, now: Date, expectedRevision?: number}} opts
 */
function completeRun(runsDir, folderName, opts = {}) {
  const { now } = opts;
  assertDate(now, 'completeRun');
  const by = requireText(opts.by, 'by', 'completeRun');
  return applyChange(runsDir, folderName, opts, (meta) => {
    if (meta.status === 'Paused') throw new RunStateError(`Run "${folderName}" is Paused. Resume it first.`, 'RUN_PAUSED');
    // With a selected workflow, completion means every stage of THAT workflow is done — a Full Manual
    // run is not complete at Stage 3, and a Specific Stage run is complete when its one stage is.
    if (meta.workflowPlan && Array.isArray(meta.workflowPlan.stages)) {
      const notDone = meta.workflowPlan.stages.filter((id) => meta.stages[id]?.status !== 'Completed');
      if (notDone.length) {
        throw new RunStateError(
          `The ${meta.workflowPlan.type} workflow is not complete: stage(s) ${notDone.join(', ')} are not done.`,
          'WORKFLOW_NOT_COMPLETE'
        );
      }
    }
    const terminalDone = meta.workflowPlan?.type === 'specific-stage' || ['4M', '6A'].some((id) => meta.stages[id]?.status === 'Completed');
    if (!terminalDone) {
      throw new RunStateError(
        'A run is Completed only when a branch\'s terminal stage is done: Stage 4M approved (Manual) or ' +
        'Stage 6A completed (Automation). Neither is.',
        'TERMINAL_STAGE_NOT_DONE'
      );
    }
    const open = Object.values(meta.stages).filter((s) => s.status !== 'Completed');
    if (open.length) {
      throw new RunStateError(
        `Run cannot be Completed while stage(s) are open: ${open.map((s) => `${s.stageId} ${s.status}`).join(', ')}.`,
        'STAGES_OPEN'
      );
    }
    return { runStatus: 'Completed', runReason: 'terminal stage done', by, transition: 'run completed' };
  });
}

/**
 * Marks the run Failed — an explicit decision that it will not continue because of an error.
 * @param {{reason: string, by?: string, now: Date, expectedRevision?: number}} opts
 */
function failRun(runsDir, folderName, opts = {}) {
  const { by, now } = opts;
  assertDate(now, 'failRun');
  const reason = requireText(opts.reason, 'reason', 'failRun');
  return applyChange(runsDir, folderName, opts, () => (
    { runStatus: 'Failed', runReason: reason, by, reason, transition: 'run failed' }
  ));
}

/**
 * Cancels the run by explicit human decision before it reached a terminal stage.
 * @param {{by: string, reason: string, now: Date, expectedRevision?: number}} opts
 */
function cancelRun(runsDir, folderName, opts = {}) {
  const { now } = opts;
  assertDate(now, 'cancelRun');
  const by = requireText(opts.by, 'by', 'cancelRun', 'cancelling is a human decision');
  const reason = requireText(opts.reason, 'reason', 'cancelRun');
  return applyChange(runsDir, folderName, opts, () => (
    { runStatus: 'Cancelled', runReason: reason, by, reason, transition: 'run cancelled' }
  ));
}

module.exports = {
  STATE_SCHEMA_VERSION,
  UNKNOWN,
  RunStateError,
  STAGE_DEFINITIONS,
  // The locked, revisioned write path, for Run Manager modules that record into run.json
  // (repairGovernance.js). Not a way around any operation's own checks.
  applyChange,
  assertDate,
  requireText,
  requireApprover,
  STAGE_IDS,
  PENDING_STATUS_FOR,
  RUN_STATUSES,
  TERMINAL_RUN_STATUSES,
  STAGE_STATUSES,
  STAGE_TRANSITIONS,
  ARTIFACT_KINDS,
  runJsonPath,
  runLockPath,
  withRunLock,
  normalizeStageId,
  initialRunState,
  deriveRunStatus,
  readRunState,
  verifyStageApproval,
  startStage,
  recordStageArtifacts,
  correctCheckpointRegistration,
  requestApproval,
  approveStage,
  rejectStage,
  completeStage,
  blockStage,
  failStage,
  reopenStage,
  pauseRun,
  resumeRun,
  completeRun,
  failRun,
  cancelRun,
  reconcileManifest,
  approveScope,
  attestLegacyApproval,
  recordSafetyPreflight,
  assertExecutionEvidence,
  WORKFLOWS,
  WORKFLOW_TYPES,
  OUTCOME_STATUSES,
  FAILURE_STATUSES,
  testVerdict,
  selectWorkflow,
  recordOutcome,
  recordOutcomeFromResults,
  recoverStage,
  recordImpactDecision,
  recordConflictDecision,
  _setTestHooks,
};
