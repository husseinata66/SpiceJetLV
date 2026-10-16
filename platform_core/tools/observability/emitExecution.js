// Canonical execution telemetry (Phase 8.1) — TEST_EXECUTION_RESULT events emitted by the platform from
// RECORDED execution evidence, never from a Skill's account of it.
//
// WHERE IT RUNS
// After the Run Manager records a stage outcome from its results files (`state outcome <4M|5A|5H>
// --from-results`). The Run Manager stays the owner of the outcome; this only mirrors what Execution
// History already reads into telemetry, as a side effect (`source: platform-tool`). Skills stay
// independently invoked and are not changed.
//
// WHAT IS EMITTED
//   cycle  one event per test per results cycle: the cycle's EFFECTIVE status — what the evidence supports
//          (a recorded Passed without assertion evidence is Unverified) — with the recorded text in
//          metadata. A generic Failed stays Failed: Application vs Automation Failure is never inferred.
//          `attempt` is the cycle's position in that test's history (1 = first attempt).
//   final  one event per test for the recorded outcome: the test-level final status (Automation
//          Repaired, Quarantined, Flaky … are decided across cycles, never per cycle).
//
// NO DUPLICATES
// Every event carries `metadata.evidenceKey`, derived from the evidence itself (run, stage, results file
// and its fingerprint, test, cycle — or, for a final event, the final status and the cycles it rests on).
// An event whose key is already in the stream is not emitted again, so recovery, a rerun of the same
// command, or a reopened stage add nothing. A new cycle, or a changed final status, is new evidence and
// gets new events; earlier events are never rewritten (the stream is append-only).
//
// NEVER into a finished, cancelled or legacy run: that would modify a historical run.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const key = (...parts) => crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);

/**
 * Emits the missing canonical execution events for one stage of a run.
 * @param {{dataRoot: string, runFolder: string, stageId: '4M'|'5A'|'5H', now: Date}} o
 * @returns {{emitted: number, skipped: number, refused: string|null, warnings: string[]}}
 */
function emitExecutionTelemetry({ dataRoot, runFolder, stageId, now }) {
  // eslint-disable-next-line global-require
  const { buildHistory } = require('../run_manager/executionHistory');
  // eslint-disable-next-line global-require
  const { appendEvents } = require('./recorder');
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('emitExecutionTelemetry requires an explicit valid `now` Date.');
  const out = { emitted: 0, skipped: 0, refused: null, warnings: [] };
  const runDir = path.join(dataRoot, 'runs', runFolder);
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(runDir, 'metadata', 'run.json'), 'utf8')); } catch { /* legacy */ }
  if (meta.stateSchemaVersion === undefined || ['Completed', 'Cancelled', 'Failed'].includes(meta.status)) {
    out.refused = `${runFolder} is ${meta.stateSchemaVersion === undefined ? 'a legacy run' : meta.status} — telemetry is never added to a historical run`;
    return out;
  }
  // Execution evidence integrity (Phase 9.1, F-03): telemetry is never emitted from rewritten results.
  // eslint-disable-next-line global-require
  const { checkResultsIntegrity, integrityMessage } = require('../run_manager/resultsIntegrity');
  const integ = checkResultsIntegrity(path.join(dataRoot, 'runs'), runFolder, { meta, dataRoot });
  if (integ.state === 'modified') {
    return { emitted: 0, skipped: 0, refused: 'RESULTS_MODIFIED', warnings: [integrityMessage(integ)] };
  }
  const h = buildHistory(path.join(dataRoot, 'runs'), runFolder, stageId);
  const fileSha = new Map(h.cycles.map((c) => [c.file, c.sha256]));
  // Every candidate event, in emission order. Which of them are new is decided in ONE locked read of the
  // stream (Phase 9.3, F-18): against what is on disk at that moment, so a concurrent emitter cannot
  // make both runs see the same evidence as missing — and the batch is appended in a single write.
  const candidates = [];
  const emit = (event) => candidates.push({ type: 'TEST_EXECUTION_RESULT', source: 'platform-tool', stage: stageId, tool: 'run_manager', ...event });
  for (const t of h.tests) {
    t.history.forEach((c, i) => {
      emit({
        testCaseId: t.testCaseId, status: c.effective, attempt: i + 1, cycle: c.cycle,
        metadata: { resultKind: 'cycle', evidenceKey: key(runFolder, stageId, 'cycle', c.file, fileSha.get(c.file) || '', t.testCaseId, c.cycle), resultsFile: c.file, recorded: c.raw, producedBy: c.producedBy },
      });
    });
    if (t.finalStatus) {
      emit({
        testCaseId: t.testCaseId, status: t.finalStatus,
        metadata: { resultKind: 'final', evidenceKey: key(runFolder, stageId, 'final', t.testCaseId, t.finalStatus, t.history.map((c) => `${c.file}#${c.cycle}`).join(',')), firstStatus: t.firstStatus, cycles: t.history.length },
      });
    }
  }
  const r = appendEvents({
    runFolder, dataRoot, now,
    build: (existing) => {
      const have = new Set(existing.map((e) => e.metadata && e.metadata.evidenceKey).filter(Boolean));
      const fresh = [];
      for (const ev of candidates) {
        if (have.has(ev.metadata.evidenceKey)) { out.skipped += 1; continue; }
        have.add(ev.metadata.evidenceKey);
        fresh.push(ev);
      }
      return fresh;
    },
  });
  if (r.ok) out.emitted = r.events.length;
  else out.warnings.push(r.warning || `could not record ${candidates.length} execution events`);
  return out;
}

module.exports = { emitExecutionTelemetry };
