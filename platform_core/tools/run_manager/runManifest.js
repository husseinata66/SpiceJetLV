// Run Manifest writer — the orchestrator's own record of "where are we right now".
//
// WHY THIS EXISTS
// `pipeline.md` §7 has always required a Run Manifest at
// `platform_core_data/runs/{{RUN_FOLDER}}/metadata/RunManifest.md`, recording per stage: timestamp,
// checkpoint status, approving reviewer, revision count, Invocation Path, and a link to the artifact.
// Nothing wrote it. `migrate.js` only ever *read* legacy `*_RunManifest.md` files for metadata
// inference, and the sole creation instruction lived in prose in each workflow's Step 1 — so in
// practice the pipeline's own source of truth for run state was created by hand, if at all.
//
// DESIGN: APPEND-ONLY, like the artifact it tracks.
// A stage row is added or updated; the Checkpoint History is only ever appended to. A Rejected entry
// keeps its feedback, because the revision that followed is what the reviewer asked for and losing the
// reason makes that revision unreviewable. Nothing here rewrites history — that mirrors spec-kit's
// `/converge`, whose one write is an appended section and which leaves the file byte-identical when
// there is nothing to add.
//
// The rendered shape is authoritative in platform_core/templates/metadata/RunManifest.md; this module
// is its renderer. Where the two disagree, the template is the spec and this is the bug.
//
// See workflows_and_pipelines/pipeline/run_manager.md §5.11.

const fs = require('fs');
const path = require('path');

const { writeFileAtomic } = require('./atomicFile');

const MANIFEST_FILENAME = 'RunManifest.md';

/**
 * Read from the observability tool rather than restated, so the Manifest cannot claim a telemetry
 * schema version the recorder is not actually writing. Falls back only if that tool is absent from
 * this installation.
 */
const OBSERVABILITY_SCHEMA_VERSION = (() => {
  try {
    // eslint-disable-next-line global-require
    return require('../observability/schema').SCHEMA_VERSION;
  } catch {
    return 'unavailable';
  }
})();

/** Checkpoint statuses from pipeline.md §7. */
const CHECKPOINT_STATUSES = [
  'Pending Review',
  'Pending Automation Approval',
  'Approved',
  'Rejected',
];

/** Invocation Paths from pipeline.md §5.3.1 #7. */
const INVOCATION_PATHS = ['Pipeline', 'Direct', 'Direct (degraded)'];

class ManifestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ManifestError';
  }
}

function manifestPath(runsDir, folderName) {
  return path.join(runsDir, folderName, 'metadata', MANIFEST_FILENAME);
}

function fmt(v, dash = '—') {
  if (v === null || v === undefined || v === '') return dash;
  return String(v);
}

/**
 * Renders a fresh Run Manifest for a newly-created run.
 *
 * Sections with no content yet render as an explicit "nothing yet" row rather than an empty table:
 * an empty table reads as "unknown", while a stated absence reads as "none so far", and those are
 * different claims about a run's state.
 *
 * @param {{runJson: object, now: Date}} opts
 * @returns {string}
 */
function renderRunManifest({ runJson, now }) {
  if (!runJson || !runJson.folderName) {
    throw new ManifestError('renderRunManifest requires a runJson with a folderName.');
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ManifestError('renderRunManifest requires an explicit valid `now` Date.');
  }
  const ts = now.toISOString();

  return [
    `# Run Manifest — ${runJson.folderName}`,
    '',
    '| Field | Value |',
    '|---|---|',
    `| Run Folder | \`${runJson.folderName}\` |`,
    `| Run Scope Type / Run Type | ${fmt(runJson.scope)} / ${fmt(runJson.runType, fmt(runJson.scope))} |`,
    `| Workflow | ${fmt(runJson.workflow, 'unversioned')} |`,
    `| Status | ${fmt(runJson.status, 'Preparing')} |`,
    `| Created | ${fmt(runJson.startedTime, ts)} |`,
    `| Last updated | ${ts} |`,
    '',
    '## 1. Code-State Anchor',
    '',
    '<!-- run_manager.md §5.8 — which state of the application under test this run is about. `null` is a',
    '     legitimate value and is stated with its reason: an unversioned target is not an unchanged one. -->',
    '',
    '| Field | Value |',
    '|---|---|',
    `| \`targetRef\` | ${runJson.targetRef ? `\`${runJson.targetRef}\`` : '`null`'} |`,
    `| Scoped to | ${(runJson.targetRefScope && runJson.targetRefScope.length) ? runJson.targetRefScope.map((p) => `\`${p}\``).join(' · ') : 'repo-wide'} |`,
    `| Captured at | ${fmt(runJson.targetRefCapturedAt)} |`,
    `| Note | ${fmt(runJson.targetRefReason)} |`,
    '',
    '## 2. Stage Ledger',
    '',
    '<!-- One row per stage this run has reached. A stage never reached has NO row — absence means "not',
    '     reached", which is why no row is pre-created as "Not started". -->',
    '',
    '| Stage | Artifact | Timestamp | Checkpoint Status | Reviewer | Revisions | Invocation Path | Run-Scoped Instruction |',
    '|---|---|---|---|---|---|---|---|',
    '| _(no stage has run yet)_ | | | | | | | |',
    '',
    '## 3. Cross-Run Reuse / Source Runs',
    '',
    '<!-- pipeline.md §7 "Cross-run reuse" — one row per reused artifact. `Referenced` = read in place',
    '     from the prior run; `Copied` = a stage needed to evolve it, so it was copied in once. -->',
    '',
    '| Artifact | Source Run | Mode | Approved in source? | Drift since source |',
    '|---|---|---|---|---|',
    ...(runJson.inheritsFrom
      ? [`| _(see \`metadata/lineage.json\`)_ | \`${runJson.inheritsFrom}\` | Referenced | | |`]
      : ['| _(this run reuses nothing)_ | | | | |']),
    '',
    `**Lineage:** ${runJson.inheritsFrom
      ? `inheritsFrom / supersedes \`${runJson.inheritsFrom}\` — see \`metadata/lineage.json\` (run_manager.md §5.9)`
      : 'None; this run inherits nothing.'}`,
    '',
    '## 4. Checkpoint History',
    '',
    '<!-- Append-only. Every checkpoint transition, in order. A Rejected entry keeps its feedback: the',
    '     revision that followed is what the reviewer asked for. -->',
    '',
    '| # | Timestamp | Stage | Transition | Decided By | Feedback / Reason |',
    '|---|---|---|---|---|---|',
    `| 1 | ${ts} | — | Run created (\`Preparing\`) | ${fmt(runJson.createdBy, 'Run Manager')} | ${runJson.workflow && runJson.workflow !== 'unversioned' ? `via ${runJson.workflow}` : 'ad hoc run'} |`,
    eventsMarker(0),
    '',
    '## 5. Declared Gaps',
    '',
    '<!-- Anything this run knowingly proceeded without. A gap here must also appear in the Final QA',
    '     Report (reporting §12) — the two must not disagree. -->',
    '',
    '| Gap | Stage Affected | Why | Consequence Stated In |',
    '|---|---|---|---|',
    ...(runJson.targetRef
      ? ['| _(none declared)_ | | | |']
      : ['| No code-state anchor | all | ' + fmt(runJson.targetRefReason) + ' | Drift is `unknown-no-anchor`; inherited/reused conclusions are unverified against current code |']),
    '',
    '## 6. Execution Safety',
    '',
    '<!-- pipeline.md §14. Which policy this run was evaluated under, and what it was authorized to do.',
    '     Filled in by the executing stage (4M / 5A) at preflight — a run that has not reached an',
    '     execution stage legitimately has nothing here, and that absence is stated rather than implied.',
    '',
    '     The full records live beside this file:',
    '       metadata/SafetyPreflight.md         the run\'s mutation footprint, captured before execution',
    '       metadata/SafetyAuthorizations.md    the scoped approvals granted for THIS run only',
    '     This section points at them; it does not duplicate the project policy. -->',
    '',
    '| Field | Value |',
    '|---|---|',
    '| Policy ID / version | _(not yet evaluated)_ |',
    '| Policy hash | _(not yet evaluated)_ |',
    '| Preflight | _(not yet run)_ |',
    '| Scoped authorizations | _(none granted)_ |',
    '| Policy blocks | _(none)_ |',
    '',
    '**No run-scoped authorization carries beyond this run**, and none of them lifts a `Forbidden`.',
    '',
    '## 7. Observability',
    '',
    '<!-- pipeline.md §15. This section POINTS at the run\'s telemetry; it never restates a metric.',
    '     Duplicating a number here would give the run a second, drifting copy of a value that is',
    '     derived from evidence and regenerable at any time.',
    '',
    '       metadata/observability/ObservabilityEvents.jsonl   append-only evidence',
    '       metadata/observability/ObservabilityMetrics.json   derived, regenerable',
    '       metadata/observability/ObservabilityReport.md      human-readable',
    '       metadata/observability/ObservabilityDashboard.html self-contained, offline -->',
    '',
    '| Field | Value |',
    '|---|---|',
    `| Telemetry schema | v${OBSERVABILITY_SCHEMA_VERSION} |`,
    '| Instrumentation | _(no event recorded yet)_ |',
    '| Events | 0 |',
    '| Report / Dashboard | _(not yet generated)_ |',
    '',
    'Run `node platform_core/tools/observability/cli.js summary` for the current metrics, and',
    '`… validate` to check the stream is complete. **A metric is never recorded here by hand** — every',
    'number is derived from the event stream, and one typed in would have no evidence behind it.',
    '',
    ...ARTIFACTS_SECTION,
  ].join('\n');
}

/** pipeline.md §7 / run_manager.md §7 `moduleArtifactRefs[]` — rendered from run.json, one row per revision consumed. */
const ARTIFACTS_SECTION = [
  '## 8. Module Artifacts Consumed',
  '',
  '<!-- Which revision of each module / Feature / Supplier artifact this run consumed, at which stage —',
  '     from run.json `moduleArtifactRefs[]`, written by the Run Manager at each stage start. -->',
  '',
  '| Stage | Artifact | Upstream stage | Header | Integrity | Fingerprint | Consumed at |',
  '|---|---|---|---|---|---|---|',
  '| _(nothing consumed yet)_ | | | | | | |',
  '',
];

/** Splits a manifest into ordered sections keyed by heading, preserving everything verbatim. */
function parseSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { heading: '__preamble__', lines: [] };
  for (const line of lines) {
    if (/^## /.test(line)) {
      sections.push(current);
      current = { heading: line.replace(/^##\s+/, '').trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

function findSection(sections, prefix) {
  return sections.find((s) => s.heading.startsWith(prefix));
}

/** Detects the placeholder rows the fresh render writes, so the first real row replaces them. */
function isPlaceholderRow(line) {
  return /^\|\s*_\(/.test(line);
}

/**
 * Inserts `row` into a markdown table inside `lines`, dropping any placeholder rows first.
 *
 * Insertion is anchored to the table's **separator row** (`|---|`) and the contiguous run of data rows
 * after it — not to "the last line starting with `|`". A section can carry prose *after* its table
 * (§3 has a `**Lineage:**` paragraph, and may gain a `**Drift implication:**` note), and appending
 * after that prose silently breaks the table apart. That is what this function exists to prevent.
 *
 * @param {string[]} lines - the section's lines, mutated in place
 * @param {string} row - the row to insert
 * @param {RegExp} headerRe - matches the table's header row, so it is never treated as data
 */
function insertTableRow(lines, row, headerRe) {
  const sepIdx = lines.findIndex((l) => /^\|\s*-+/.test(l));
  if (sepIdx === -1) {
    // No table found — append rather than lose the row, so a hand-edited manifest still accepts writes.
    lines.push(row);
    return;
  }

  // Walk the contiguous data rows immediately after the separator; stop at the first non-row line, so
  // trailing prose is never crossed.
  let end = sepIdx + 1;
  const kept = [];
  while (end < lines.length && /^\|/.test(lines[end])) {
    if (!isPlaceholderRow(lines[end]) && !headerRe.test(lines[end])) kept.push(lines[end]);
    end += 1;
  }
  lines.splice(sepIdx + 1, end - (sepIdx + 1), ...kept, row);
}

const LEDGER_HEADER = /^\| Stage \|/;

/**
 * One row per stage: replaces `stage`'s row in place if the ledger already has one, else inserts it.
 * @param {{lines: string[]}} ledger - the Stage Ledger section, mutated in place
 * @returns {{priorStatus: string|null, replaced: boolean}}
 */
function upsertLedgerRow(ledger, stage, row) {
  let priorStatus = null;
  let replaced = false;
  for (let i = 0; i < ledger.lines.length; i++) {
    const line = ledger.lines[i];
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || LEDGER_HEADER.test(line) || isPlaceholderRow(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells[1] === stage) {
      priorStatus = cells[4] || null;
      ledger.lines[i] = row;
      replaced = true;
      break;
    }
  }
  if (!replaced) insertTableRow(ledger.lines, row, LEDGER_HEADER);
  else {
    // Still drop any placeholder left over from the fresh render.
    ledger.lines = ledger.lines.filter((l) => !isPlaceholderRow(l));
  }
  return { priorStatus, replaced };
}

function ledgerRowText({ stage, artifactName, artifactPath, checkpointStatus, reviewer, revisions, invocationPath, instruction }, ts) {
  const artifactCell = artifactPath
    ? `[${artifactName || path.basename(artifactPath)}](${artifactPath})`
    : fmt(artifactName);
  return `| ${stage} | ${artifactCell} | ${ts} | ${fmt(checkpointStatus)} | ${fmt(reviewer)} | ` +
    `${fmt(revisions, '0')} | ${fmt(invocationPath)} | ${fmt(instruction)} |`;
}

/**
 * Records a stage's state in the Stage Ledger (§2), adding a row or updating the existing one for that
 * stage. Also appends a Checkpoint History (§4) entry when the checkpoint status changes.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @param {object} entry
 * @param {string} entry.stage - e.g. 'Stage 1 — Project Context'
 * @param {string} [entry.artifactName]
 * @param {string} [entry.artifactPath]
 * @param {string} entry.checkpointStatus - one of CHECKPOINT_STATUSES
 * @param {string} [entry.reviewer]
 * @param {number} [entry.revisions]
 * @param {string} [entry.invocationPath] - one of INVOCATION_PATHS
 * @param {string} [entry.instruction]
 * @param {string} [entry.feedback] - required in spirit for a Rejected transition
 * @param {boolean} [entry.history=true] - append a Checkpoint History row on a status change. The
 *   run state model (runState.js) passes false and writes its own single row per transition through
 *   recordStateEvent(), so one transition never produces two history rows.
 * @param {Date} entry.now
 * @returns {{updated: boolean, created: boolean}}
 */
function recordStage(runsDir, folderName, entry = {}) {
  const {
    stage, artifactName, artifactPath, checkpointStatus, reviewer, revisions,
    invocationPath, instruction, feedback, now, history: writeHistory = true,
  } = entry;

  if (!stage) throw new ManifestError('recordStage requires a `stage`.');
  // On a run inside the run state model, run.json is the record and the ledger only displays it. A row
  // written here would claim an approval or completion that no recorded transition backs (audit
  // finding #9), so it is refused; the state commands record the stage and the Manifest follows.
  let runMeta = null;
  try { runMeta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8')); } catch { /* no run.json: not a state-model run */ }
  if (runMeta && runMeta.stateSchemaVersion) {
    const err = new ManifestError(
      `Run "${folderName}" is tracked by the run state model: its Stage Ledger is a display of run.json, never written on its own. ` +
      'Record the stage with the state commands (cli.js state start / request-approval / approve / complete …); the Manifest follows them.'
    );
    err.code = 'MANIFEST_ONLY_REFUSED';
    throw err;
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ManifestError('recordStage requires an explicit valid `now` Date.');
  }
  if (checkpointStatus && !CHECKPOINT_STATUSES.includes(checkpointStatus)) {
    throw new ManifestError(
      `Unknown checkpoint status "${checkpointStatus}". Expected one of: ${CHECKPOINT_STATUSES.join(', ')} ` +
      '(pipeline.md §7).'
    );
  }
  if (invocationPath && !INVOCATION_PATHS.includes(invocationPath)) {
    throw new ManifestError(
      `Unknown Invocation Path "${invocationPath}". Expected one of: ${INVOCATION_PATHS.join(', ')} ` +
      '(pipeline.md §5.3.1 #7).'
    );
  }

  const file = manifestPath(runsDir, folderName);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    throw new ManifestError(
      `No Run Manifest at ${file}. It is created with the run (run_manager.md §5.10); ` +
      'a run whose Manifest is missing was not created through the Run Manager.'
    );
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const sections = parseSections(text);

  const ledger = findSection(sections, '2. Stage Ledger');
  if (!ledger) throw new ManifestError('Run Manifest has no "## 2. Stage Ledger" section.');

  const ts = now.toISOString();
  const artifactCell = artifactPath
    ? `[${artifactName || path.basename(artifactPath)}](${artifactPath})`
    : fmt(artifactName);
  const row = `| ${stage} | ${artifactCell} | ${ts} | ${fmt(checkpointStatus)} | ${fmt(reviewer)} | ` +
    `${fmt(revisions, '0')} | ${fmt(invocationPath)} | ${fmt(instruction)} |`;

  const { priorStatus, replaced } = upsertLedgerRow(ledger, stage, row);

  // Append a Checkpoint History entry when the status actually changed — re-recording the same status
  // is bookkeeping, not a decision, and padding history with it makes the real transitions harder to find.
  if (writeHistory && checkpointStatus && checkpointStatus !== priorStatus) {
    const history = findSection(sections, '4. Checkpoint History');
    if (history) {
      let n = 0;
      for (const line of history.lines) {
        const m = line.match(/^\|\s*(\d+)\s*\|/);
        if (m) n = Math.max(n, Number(m[1]));
      }
      const transition = priorStatus ? `${priorStatus} → ${checkpointStatus}` : checkpointStatus;
      const histRow = `| ${n + 1} | ${ts} | ${stage} | ${transition} | ${fmt(reviewer, 'Run Manager')} | ${fmt(feedback)} |`;
      // Append after the last existing row so ordering stays chronological.
      let insertAt = history.lines.length;
      for (let i = history.lines.length - 1; i >= 0; i--) {
        if (/^\|/.test(history.lines[i]) && !/^\|\s*-+/.test(history.lines[i])) { insertAt = i + 1; break; }
      }
      history.lines.splice(insertAt, 0, histRow);
    }
  }

  let next = sections.map((s) => s.lines.join(eol)).join(eol);
  next = next.replace(/^\| Last updated \| .*$/m, `| Last updated | ${ts} |`);
  writeFileAtomic(file, next);
  return { updated: replaced, created: !replaced };
}

/**
 * Records a reused upstream artifact in Cross-Run Reuse (§3) — the structural slot for pipeline.md §7's
 * requirement that a run reusing an earlier run's artifact records the source run here.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @param {{artifact: string, sourceRun: string, mode?: 'Referenced'|'Copied', sourceApproved?: boolean|null, driftStatus?: string, now: Date}} entry
 */
function recordReuse(runsDir, folderName, entry = {}) {
  const { artifact, sourceRun, mode = 'Referenced', sourceApproved, driftStatus, now } = entry;
  if (!artifact || !sourceRun) throw new ManifestError('recordReuse requires `artifact` and `sourceRun`.');
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ManifestError('recordReuse requires an explicit valid `now` Date.');
  }
  if (!['Referenced', 'Copied'].includes(mode)) {
    throw new ManifestError(`Unknown reuse mode "${mode}". Expected Referenced or Copied (pipeline.md §7).`);
  }

  const file = manifestPath(runsDir, folderName);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    throw new ManifestError(`No Run Manifest at ${file}.`);
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const sections = parseSections(text);
  const reuse = findSection(sections, '3. Cross-Run Reuse');
  if (!reuse) throw new ManifestError('Run Manifest has no "## 3. Cross-Run Reuse" section.');

  const approvedCell = sourceApproved === true ? 'Approved'
    : sourceApproved === false ? 'NOT approved' : 'unknown';
  const row = `| ${artifact} | \`${sourceRun}\` | ${mode} | ${approvedCell} | ${fmt(driftStatus, 'not computed')} |`;

  insertTableRow(reuse.lines, row, /^\| Artifact \|/);

  // Drift that is anything but `unchanged` carries an obligation: say what it invalidates.
  if (driftStatus && driftStatus !== 'unchanged') {
    const note = `**Drift implication:** \`${driftStatus}\` — conclusions inherited from ` +
      `\`${sourceRun}\` that cover changed paths are **unverified against current code** and must be ` +
      're-checked before reuse (run_manager.md §5.9 Rule 4).';
    if (!reuse.lines.some((l) => l.startsWith('**Drift implication:**'))) {
      reuse.lines.push('', note);
    }
  }

  let next = sections.map((s) => s.lines.join(eol)).join(eol);
  next = next.replace(/^\| Last updated \| .*$/m, `| Last updated | ${now.toISOString()} |`);
  writeFileAtomic(file, next);
  return { recorded: true };
}

/**
 * Records a declared gap (§5) — something the run knowingly proceeded without.
 * @param {string} runsDir
 * @param {string} folderName
 * @param {{gap: string, stage?: string, why?: string, reportedIn?: string, now: Date}} entry
 */
function recordGap(runsDir, folderName, entry = {}) {
  const { gap, stage, why, reportedIn, now } = entry;
  if (!gap) throw new ManifestError('recordGap requires a `gap`.');
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ManifestError('recordGap requires an explicit valid `now` Date.');
  }

  const file = manifestPath(runsDir, folderName);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    throw new ManifestError(`No Run Manifest at ${file}.`);
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const sections = parseSections(text);
  const gaps = findSection(sections, '5. Declared Gaps');
  if (!gaps) throw new ManifestError('Run Manifest has no "## 5. Declared Gaps" section.');

  const row = `| ${gap} | ${fmt(stage, 'all')} | ${fmt(why)} | ${fmt(reportedIn)} |`;
  insertTableRow(gaps.lines, row, /^\| Gap \|/);

  let next = sections.map((s) => s.lines.join(eol)).join(eol);
  next = next.replace(/^\| Last updated \| .*$/m, `| Last updated | ${now.toISOString()} |`);
  writeFileAtomic(file, next);
  return { recorded: true };
}

/** Marker recording how many run-state events (run.json `stateEvents`) this Manifest already shows. */
const EVENTS_MARKER_RE = /^<!-- run-state-events-applied: (\d+) -->$/m;
const eventsMarker = (n) => `<!-- run-state-events-applied: ${n} -->`;

/**
 * Brings the Manifest up to date with the run state model, in ONE atomic write.
 *
 * run.json is the record. Its `stateEvents` list is an append-only outbox numbered by `seq`; the
 * Manifest carries a marker saying which `seq` it has already shown. This function appends a history
 * row for every event after the marker, rewrites the given ledger rows, moves the marker, and updates
 * the Status row — all in one write. So:
 *   - a write that failed (or a process that died) leaves the Manifest exactly as it was, and the next
 *     call shows the missed events: nothing is lost;
 *   - running it again after success finds nothing past the marker: nothing is duplicated.
 * A Manifest with no marker yet is treated as having shown none.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @param {{events: Array<{seq: number, at: string, stage?: string, transition: string, by?: string, reason?: string}>,
 *          ledgerRows?: object[], runStatus?: string, now: Date}} entry
 * @returns {{appliedEvents: number, appliedSeq: number}}
 */
function applyStateEvents(runsDir, folderName, entry = {}) {
  const { events = [], ledgerRows = [], runStatus, now, artifactRefs = [], absentStages = [] } = entry;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ManifestError('applyStateEvents requires an explicit valid `now` Date.');
  }
  const file = manifestPath(runsDir, folderName);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    throw new ManifestError(`No Run Manifest at ${file}.`);
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const sections = parseSections(text);
  const ledger = findSection(sections, '2. Stage Ledger');
  const history = findSection(sections, '4. Checkpoint History');
  if (!ledger || !history) throw new ManifestError('Run Manifest is missing its Stage Ledger or Checkpoint History section.');

  const ts = now.toISOString();
  for (const r of ledgerRows) upsertLedgerRow(ledger, r.stage, ledgerRowText(r, ts));
  // A ledger row for a stage the run state has no record of was written on its own (a Manifest-only
  // record, before those were refused). It is shown as what the run state says — Not Started — and the
  // reset is logged in the Checkpoint History, so what the row used to say stays readable.
  const reconciled = [];
  for (let i = 0; i < ledger.lines.length; i++) {
    const line = ledger.lines[i];
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || LEDGER_HEADER.test(line) || isPlaceholderRow(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (!absentStages.includes(cells[1]) || !cells[4] || cells[4] === '—' || cells[4] === 'Not Started') continue;
    reconciled.push({ stage: cells[1], was: cells[4], reviewer: cells[5] });
    ledger.lines[i] = ledgerRowText({ stage: cells[1], checkpointStatus: 'Not Started' }, ts);
  }

  const markerIdx = history.lines.findIndex((l) => EVENTS_MARKER_RE.test(l));
  const applied = markerIdx === -1 ? 0 : Number(history.lines[markerIdx].match(EVENTS_MARKER_RE)[1]);
  const pending = events.filter((e) => e.seq > applied).sort((a, b) => a.seq - b.seq);

  let n = 0;
  for (const line of history.lines) {
    const m = line.match(/^\|\s*(\d+)\s*\|/);
    if (m) n = Math.max(n, Number(m[1]));
  }
  // Pipes inside a cell would split the row; replace them so the table stays intact.
  const cell = (v, dash) => fmt(v, dash).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
  const rows = pending.map((e) => {
    n += 1;
    return `| ${n} | ${e.at} | ${cell(e.stage)} | ${cell(e.transition)} | ${cell(e.by, 'Run Manager')} | ${cell(e.reason)} |`;
  });
  let insertAt = history.lines.length;
  for (let i = history.lines.length - 1; i >= 0; i--) {
    if (/^\|/.test(history.lines[i]) && !/^\|\s*-+/.test(history.lines[i])) { insertAt = i + 1; break; }
  }
  for (const r of reconciled) {
    n += 1;
    rows.push(`| ${n} | ${ts} | ${cell(r.stage)} | ledger reconciled with the run state: it read "${cell(r.was)}"${r.reviewer && r.reviewer !== '—' ? ` (reviewer ${cell(r.reviewer)})` : ''}, but the run state records no such transition — shown as Not Started | Run Manager | Manifest-only record, not backed by run.json |`);
  }
  history.lines.splice(insertAt, 0, ...rows);

  const appliedSeq = Math.max(applied, ...pending.map((e) => e.seq));
  const idx = history.lines.findIndex((l) => EVENTS_MARKER_RE.test(l));
  if (idx === -1) {
    // Place the marker straight after the table, before any blank lines that end the section.
    let at = history.lines.length;
    while (at > 0 && history.lines[at - 1].trim() === '') at -= 1;
    history.lines.splice(at, 0, eventsMarker(appliedSeq));
  } else {
    history.lines[idx] = eventsMarker(appliedSeq);
  }

  if (artifactRefs.length) {
    let consumed = findSection(sections, '8. Module Artifacts Consumed');
    if (!consumed) {
      // A Manifest written before this section existed gains it at its end.
      consumed = { heading: '8. Module Artifacts Consumed', lines: [...ARTIFACTS_SECTION] };
      const last = sections[sections.length - 1];
      if (last.lines.length && last.lines[last.lines.length - 1].trim() !== '') last.lines.push('');
      sections.push(consumed);
    }
    for (const ref of artifactRefs) {
      const short = String(ref.sha256 || '').slice(0, 12);
      if (consumed.lines.some((l) => l.includes(`\`${ref.artifact}\``) && l.includes(short))) continue;
      insertTableRow(consumed.lines,
        `| ${ref.stage} | \`${ref.artifact}\` | ${fmt(ref.upstreamStage)} | ${fmt(ref.header)} | ${fmt(ref.integrity)} | \`${short || '—'}\` | ${ref.at} |`,
        /^\| Stage \| Artifact \|/);
    }
  }

  let next = sections.map((s) => s.lines.join(eol)).join(eol);
  if (runStatus) next = next.replace(/^\| Status \| .*$/m, `| Status | ${runStatus} |`);
  next = next.replace(/^\| Last updated \| .*$/m, `| Last updated | ${ts} |`);
  writeFileAtomic(file, next);
  return { appliedEvents: pending.length, appliedSeq };
}

/** The `seq` of the last run-state event this Manifest shows; null when there is no Manifest. */
function readAppliedEventSeq(runsDir, folderName) {
  let text;
  try {
    text = fs.readFileSync(manifestPath(runsDir, folderName), 'utf8');
  } catch {
    return null;
  }
  const m = text.match(EVENTS_MARKER_RE);
  return m ? Number(m[1]) : 0;
}

/**
 * Reads the Stage Ledger back as data, so an orchestrator can answer "where are we?" without parsing
 * prose — the question §7 says this artifact exists to answer.
 * @param {string} runsDir
 * @param {string} folderName
 * @returns {{stages: Array<object>, lastUpdated: string|null}}
 */
function readManifest(runsDir, folderName) {
  let text;
  try {
    text = fs.readFileSync(manifestPath(runsDir, folderName), 'utf8');
  } catch {
    return { stages: [], lastUpdated: null };
  }
  const sections = parseSections(text);
  const ledger = findSection(sections, '2. Stage Ledger');
  const stages = [];
  if (ledger) {
    for (const line of ledger.lines) {
      if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || /^\| Stage \|/.test(line) || isPlaceholderRow(line)) continue;
      const c = line.split('|').map((x) => x.trim());
      stages.push({
        stage: c[1], artifact: c[2], timestamp: c[3], checkpointStatus: c[4],
        reviewer: c[5], revisions: c[6], invocationPath: c[7], instruction: c[8],
      });
    }
  }
  const m = text.match(/^\| Last updated \| (.+?) \|$/m);
  return { stages, lastUpdated: m ? m[1] : null };
}

module.exports = {
  MANIFEST_FILENAME,
  CHECKPOINT_STATUSES,
  INVOCATION_PATHS,
  ManifestError,
  manifestPath,
  renderRunManifest,
  recordStage,
  recordReuse,
  recordGap,
  applyStateEvents,
  readAppliedEventSeq,
  readManifest,
};
