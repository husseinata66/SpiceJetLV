// Test fixtures for Phase 9.1 (F-01, F-02).
//
// - A RECORDED upstream approval. Since an Approved header alone no longer authorizes a downstream stage,
//   a test that needs an approved upstream artifact records that approval the way the run state model
//   does — a named approver and the artifact's fingerprint in an approved stage's headerEvidence — in a
//   separate state-model run kept only for fixture approvals. Tests that exercise the header-only case on
//   purpose simply do not call it.
// - Real RESULTS. An execution stage is approved (4M) or completed (5A/5H) only with an outcome recorded
//   from its results files, so a test that needs a finished execution stage writes a results file in the
//   template's per-test table and records the outcome from it.

const fs = require('fs');
const path = require('path');

const { fingerprintFile } = require('../artifactHeader');

const FIXTURE_RUN = 'fixture-approvals';

/**
 * Records `rels` (data-root-relative) as approved by `by`, fingerprinting their CURRENT content.
 * Each call appends one approved stage, so a later call for the same artifact is a newer approval.
 */
function recordFixtureApproval(dataRoot, rels, { by = 'Fixture Reviewer', at = '2026-01-01T00:00:00.000Z', runsDir = path.join(dataRoot, 'runs') } = {}) {
  const list = Array.isArray(rels) ? rels : [rels];
  const file = path.join(runsDir, FIXTURE_RUN, 'metadata', 'run.json');
  let meta;
  try { meta = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { meta = { stateSchemaVersion: 1, runFolder: FIXTURE_RUN, status: 'In Progress', stages: {} }; }
  const n = Object.keys(meta.stages).length + 1;
  const id = `fixture-${n}`;
  meta.stages[id] = {
    stageId: id,
    status: 'Completed',
    artifacts: list.map((p) => ({ path: p, kind: 'checkpoint', recordedAt: at })),
    approval: {
      status: 'Approved', approvedBy: by, approvedAt: at,
      headerEvidence: list.map((p) => ({ path: p, status: 'Approved', sha256: fingerprintFile(path.resolve(dataRoot, p)) })),
    },
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(meta, null, 2)}\n`);
  return id;
}

const RESULTS_FILE = { '4M': 'manual_execution/ManualExecutionResults.md', '5A': 'execution/ExecutionResults.md', '5H': 'execution/ExecutionResults.rerun-1.md' };

/**
 * Writes a stage's results file (rows: [testCaseId, status]) in the template's per-test table, with an
 * assertion record for every Passed row whose expected and actual value is `expected`.
 * @returns {string} the data-root-relative path
 */
function writeResults(dataRoot, folderName, stageId, rows, { expected = 'It works', file } = {}) {
  const rel = `runs/${folderName}/${file || RESULTS_FILE[stageId]}`;
  const per = rows.map(([tc, st]) => `| ${tc} | s/${tc} | ${st} | 1 s | 1 | ${st === 'Passed' ? '—' : 'observed failure'} | — |`).join('\n');
  const asr = rows.filter(([, st]) => st === 'Passed').map(([tc]) => `| ${tc} | A1 | result | ${expected} | Expected Result | ${expected} | equals | ✅ | — |`).join('\n');
  const assertions = asr ? `\n### 3.1 Assertion Records\n\n| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |\n|---|---|---|---|---|---|---|---|---|\n${asr}\n` : '';
  const abs = path.join(dataRoot, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `# Results\n\n## 3. Per-Test Results\n\n| Test Case ID | Automation Script ID | Status | Execution Time | Attempts | Failure Detail | Evidence Refs |\n|---|---|---|---|---|---|---|\n${per}\n${assertions}`);
  return rel;
}

/** writeResults + register it as the stage's output + record the outcome from results. */
function recordResultsOutcome(rs, runsDir, folderName, stageId, rows, { now, ...opts } = {}) {
  const rel = writeResults(path.dirname(runsDir), folderName, stageId, rows, opts);
  rs.recordStageArtifacts(runsDir, folderName, { stageId, artifacts: [rel], now });
  rs.recordOutcomeFromResults(runsDir, folderName, { stageId, now });
  return rel;
}

// --- Safety Preflight (Phase 9.2, F-16) ---------------------------------------------------------------
// The Run Manager refuses to start 4M/5A/5H without a confirmed Safety Preflight. A test that is about
// something else plays the operator: a test policy in the throwaway data root, and a REAL preflight recorded
// through recordSafetyPreflight (Staging, read-only operation, Headless browser, a named confirmer). Tests of
// the preflight itself never use these helpers.

/** A test Execution Safety policy for Staging (reads allowed; mutating self-created/dedicated data allowed). */
const FIXTURE_POLICY = {
  policyId: 'fixture-policy', policyVersion: 1, environment: 'Staging', environmentAliases: ['STG'],
  defaults: { '*': 'Forbidden' },
  categories: {
    read: { '*': 'Allowed' },
    mutation: { SelfCreated: 'Allowed', DedicatedTestData: 'Allowed', Shared: 'Approval Required', Unknown: 'Approval Required', ProductionLike: { decision: 'Forbidden', absolute: true } },
    approval: { SelfCreated: 'Allowed', Shared: 'Approval Required' },
    financial: { '*': { decision: 'Forbidden', absolute: true } },
    booking: { '*': { decision: 'Forbidden', absolute: true } },
    privileged: { '*': { decision: 'Forbidden', absolute: true } },
  },
  actions: { DELETE: { SelfCreated: 'Approval Required', Shared: { decision: 'Forbidden', absolute: true }, Unknown: { decision: 'Forbidden', absolute: true } } },
};

/**
 * Ensures a loadable policy and returns the environment it governs. A test that wrote only a minimal
 * {policyId, environment} policy (the Self-Healing tests read just its environment) keeps that environment
 * and its aliases; the fixture rules complete it so the Execution Safety evaluator can load it.
 */
function ensureFixturePolicy(dataRoot, policy = FIXTURE_POLICY) {
  const file = path.join(dataRoot, 'knowledge_base', 'execution_safety_policy.json');
  // eslint-disable-next-line global-require
  const { loadPolicy } = require('../../execution_safety/policyLoader');
  if (!fs.existsSync(file)) {
    // No project policy in this data root (a test may depend on that): the fixture policy lives OUTSIDE it.
    const ext = path.join(require('os').tmpdir(), 'agentic-fixture-execution-safety-policy.json');
    if (!fs.existsSync(ext)) fs.writeFileSync(ext, JSON.stringify(policy, null, 2));
    return { environment: policy.environment, file: ext };
  }
  try { return { environment: loadPolicy({ file }).policy.environment, file }; } catch {
    let own = {};
    try { own = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { own = {}; }
    const merged = { ...policy, ...(own.policyId ? { policyId: own.policyId } : {}), ...(own.environment ? { environment: own.environment } : {}), environmentAliases: own.environmentAliases || policy.environmentAliases };
    fs.writeFileSync(file, JSON.stringify(merged, null, 2));
    return { environment: merged.environment, file };
  }
}

/** Records a confirmed preflight for an execution stage unless a current one exists. */
function recordFixturePreflight(runsDir, folderName, stageId, { now, operations, executionType = 'browser', executionMode = 'Headless', environment, targetUrl } = {}) {
  // eslint-disable-next-line global-require
  const rs = require('../runState');
  // eslint-disable-next-line global-require
  const pf = require('../executionPreflight');
  const governed = ensureFixturePolicy(path.dirname(runsDir));
  if (pf.checkPreflight(runsDir, folderName, stageId).ok) return null;
  const meta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
  const declared = pf.scopeFacts(meta, path.dirname(runsDir)).declaredTarget;
  return rs.recordSafetyPreflight(runsDir, folderName, {
    stageId, environment: environment || governed.environment, policyFile: governed.file, targetUrl: targetUrl || declared || 'https://qa.example.test', executionType, executionMode: executionType === 'browser' ? executionMode : undefined,
    operations: operations || [{ action: 'READ', ownership: 'DedicatedTestData' }], confirmedBy: 'QA Lead', now: now || new Date(),
  });
}

/** API tests: an execution stage start is preceded by the operator's preflight (see above). */
function autoPreflight(rs) {
  if (rs.__fixtureAutoPreflight) return;
  const orig = rs.startStage;
  rs.startStage = (runsDir, folderName, opts = {}) => {
    const id = rs.normalizeStageId(opts.stageId);
    if (['4M', '5A', '5H'].includes(id)) { try { recordFixturePreflight(runsDir, folderName, id, { now: opts.now }); } catch { /* the gate reports it */ } }
    return orig(runsDir, folderName, opts);
  };
  rs.__fixtureAutoPreflight = true;
  // Gate checks and the planner (which looks the gate up at call time) see the same operator preflight.
  // eslint-disable-next-line global-require
  const gate = require('../stageGate');
  if (!gate.__fixtureAutoPreflight) {
    const origCheck = gate.checkStageEntry;
    gate.checkStageEntry = (runsDir, folderName, opts = {}) => {
      const id = rs.normalizeStageId(opts.stageId);
      if (['4M', '5A', '5H'].includes(id)) { try { recordFixturePreflight(runsDir, folderName, id, { now: opts.now }); } catch { /* the gate reports it */ } }
      return origCheck(runsDir, folderName, opts);
    };
    gate.__fixtureAutoPreflight = true;
  }
}

/** CLI tests: call before spawning `state start <4M|5A|5H> --run <run>`. */
function preflightBeforeCliStart(args, runsDir) {
  if (args[0] !== 'state' || !['start', 'gate'].includes(args[1]) || !['4M', '5A', '5H'].includes(String(args[2]).toUpperCase())) return;
  const i = args.indexOf('--run');
  if (i === -1 || !args[i + 1]) return;
  try { recordFixturePreflight(runsDir, args[i + 1], String(args[2]).toUpperCase()); } catch { /* the gate reports it */ }
}

module.exports = { FIXTURE_RUN, recordFixtureApproval, writeResults, recordResultsOutcome, RESULTS_FILE, FIXTURE_POLICY, ensureFixturePolicy, recordFixturePreflight, autoPreflight, preflightBeforeCliStart };
