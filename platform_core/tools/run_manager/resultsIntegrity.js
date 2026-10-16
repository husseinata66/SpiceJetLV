// Execution evidence integrity (Phase 9.1, audit finding F-03).
//
// Every time an execution outcome is recorded from results (runState.recordOutcomeFromResults), each
// results cycle file is fingerprinted into `outcomeHistory[].cycles[]`. Those fingerprints are the
// record of what the outcome was computed from. Results are written once (pipeline.md §6 Rule 7b): a
// rerun is a new rerun-N file, never an edit. So a recorded results file whose content no longer
// matches its fingerprint — or that is gone — is RESULTS_MODIFIED, whatever the new content says, even
// when it looks valid. Nothing here repairs, rewrites or re-records evidence; it reports.
//
// One check, used everywhere the evidence is relied on: stage completion and approval, `state verify`,
// every stage entry gate of the run, Run Health, Final QA Report verification, and telemetry emission.

const fs = require('fs');
const path = require('path');

const { fingerprintFile } = require('./artifactHeader');

const EXECUTION_STAGES = Object.freeze(['4M', '5A', '5H']);

/** file (data-root-relative) → {sha256, stage, at} for every results cycle an outcome was recorded from. */
function recordedResultFingerprints(meta) {
  const out = new Map();
  for (const id of EXECUTION_STAGES) {
    const s = meta && meta.stages && meta.stages[id];
    for (const o of (s && s.outcomeHistory) || []) {
      for (const c of o.cycles || []) {
        if (!c || !c.file || !c.sha256) continue;
        if (!out.has(c.file)) out.set(c.file, { sha256: c.sha256, stage: id, at: o.at });
      }
    }
  }
  return out;
}

/**
 * Re-fingerprints every recorded results file.
 * @returns {{state: 'intact'|'modified'|'not-recorded', checked: number,
 *            modified: Array<{file: string, stage: string, recordedAt: string, recorded: string, current: string|null, kind: 'rewritten'|'removed'}>,
 *            unrecorded: Array<{file: string, stage: string}>}}
 *   `unrecorded`: results files on disk that no recorded outcome covers yet (a newer cycle, or results
 *   written after the outcome) — not tampering, but an outcome that is no longer current.
 */
function checkResultsIntegrity(runsDir, folderName, { meta, dataRoot } = {}) {
  const root = dataRoot || path.dirname(runsDir);
  let m = meta;
  if (!m) {
    try { m = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8')); } catch { m = {}; }
  }
  const recorded = recordedResultFingerprints(m);
  const modified = [];
  for (const [file, r] of recorded) {
    const current = fingerprintFile(path.resolve(root, file));
    if (current !== r.sha256) modified.push({ file, stage: r.stage, recordedAt: r.at, recorded: r.sha256, current: current || null, kind: current ? 'rewritten' : 'removed' });
  }
  const unrecorded = [];
  // eslint-disable-next-line global-require
  const { listCycles } = require('./executionHistory');
  for (const id of EXECUTION_STAGES) {
    if (!(m.stages && m.stages[id])) continue;
    for (const c of listCycles(path.join(runsDir, folderName), id)) {
      const rel = path.relative(root, c.file).split(path.sep).join('/');
      if (!recorded.has(rel) && !unrecorded.some((u) => u.file === rel)) unrecorded.push({ file: rel, stage: id });
    }
  }
  return { state: modified.length ? 'modified' : recorded.size ? 'intact' : 'not-recorded', checked: recorded.size, modified, unrecorded };
}

/** One line naming every modified file — the text every caller reports. */
function describeModified(res) {
  return res.modified.map((x) => `${x.file} (${x.kind === 'removed' ? 'removed' : 'rewritten'} after Stage ${x.stage}'s outcome was recorded from it at ${x.recordedAt})`).join('; ');
}

function integrityMessage(res) {
  return `RESULTS_MODIFIED: recorded execution results no longer match the fingerprints their outcome was recorded from — ${describeModified(res)}. ` +
    'Results are written once; a rerun is a new rerun-N file. The evidence is not trusted until the recorded content is restored exactly.';
}

module.exports = { EXECUTION_STAGES, recordedResultFingerprints, checkResultsIntegrity, describeModified, integrityMessage };
