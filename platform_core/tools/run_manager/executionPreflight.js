// Mandatory Safety Preflight at the execution boundary (Phase 9.2, audit finding F-16).
//
// Before a stage that really executes tests starts — 4M (manual execution), 5A (automated execution),
// 5H (Self-Healing reruns) — a named human confirms, and the Run Manager records, exactly what is about to
// run and where. The stage entry gate refuses to start without a CONFIRMED preflight whose binding still
// matches, and an execution stage cannot complete or be approved once a bound input has changed.
//
// What a preflight states, and what is checked (refusals are recorded too — the audit trail keeps both):
//   environment      named explicitly; must be a known environment (the policy's vocabulary + aliases). It is
//                    never inferred from the URL and never defaulted — an unknown environment is refused.
//   safety policy    the project's Execution Safety policy must govern that environment (a policy speaks only
//                    for the environment it names); its id, version and hash are bound.
//   target URL       an http(s) URL, recorded. When the run's scope declares a target (the Project Context's
//                    "Target Environment"), a different host is refused. The URL never decides the environment.
//   execution type   browser | api | database | batch | other. ONLY browser execution needs an explicit mode,
//                    Headed or Headless — never defaulted; other types never ask for one.
//   operations       the intended test operations ({action, ownership, module?, entity?, testCaseId?}); each is
//                    evaluated by the Execution Safety evaluator for that environment with the run's own
//                    authorizations: Allowed passes; Approval Required needs a run authorization; Forbidden —
//                    including every prohibited Production mutation — is refused, and nothing lifts it. Each
//                    operation is recorded as read-only or mutating. An operation naming a module outside the
//                    run's scope is refused.
//   confirmedBy      the named human (approverIdentity.js — recorded, not authenticated).
//
// The binding fingerprint covers the run, stage, environment, URL, execution type and mode, operations, the
// policy hash, the run's authorizations, the run scope, the approved suite(s) in scope and the Capability
// Plan. When any of them changes, the preflight is stale and must be confirmed again.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXECUTION_STAGES = Object.freeze(['4M', '5A', '5H']);
// Stages that use a live application without executing tests (Phase 9.4): Discovery (2) and live selector
// verification in Automation (4A). They may record a preflight; their entry gates do not require one (both can
// work without a live application), but the browser drivers refuse to launch for them without it.
const LIVE_STAGES = Object.freeze(['2', '4A']);
const EXECUTION_TYPES = Object.freeze(['browser', 'api', 'database', 'batch', 'other']);
const BROWSER_MODES = Object.freeze(['Headed', 'Headless']);
const PRODUCTION_CLASS = Object.freeze(['Production', 'PreProduction']);

const sha = (v) => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const fileSha = (f) => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch { return null; } };
const toPosix = (p) => String(p).split(path.sep).join('/');

/** The approved suite(s) and declared target of the run's scope roots. */
function scopeFacts(meta, dataRoot) {
  // eslint-disable-next-line global-require
  const { resolveScopeRoots } = require('./stageGate');
  const { roots } = resolveScopeRoots(meta, dataRoot);
  const suites = [];
  let declaredTarget = null;
  // eslint-disable-next-line global-require
  const { runBoundSuites, resolveSuiteMatrix } = require('./suiteBinding');
  for (const r of roots) {
    const td = path.join(r.dir, 'test_design');
    const bound = runBoundSuites(meta, r, { dataRoot });
    if (bound.basis === 'run-approved') {
      // PE-03: bound to the suites this run's Stage 3 approved, their matrices, and the Markdown artifacts
      // that Stage 3 recorded — another run's suite or report changing never moves this run's binding.
      const files = [...bound.suites, ...bound.recorded.filter((f) => /\.md$/i.test(f))];
      for (const s of bound.suites) {
        const m = resolveSuiteMatrix(path.join(dataRoot, 'runs'), s, { dataRoot, preferMeta: meta });
        if (m.file) files.push(m.file);
      }
      const seen = new Set();
      for (const f of files.sort()) {
        const rel = toPosix(path.relative(dataRoot, f));
        if (seen.has(rel.toLowerCase())) continue;
        seen.add(rel.toLowerCase());
        suites.push({ path: rel, sha256: fileSha(f) });
      }
    } else {
      // Legacy rule (no approved Stage 3 of its own): every Markdown file in the folder.
      try { for (const n of fs.readdirSync(td).filter((x) => /\.md$/i.test(x)).sort()) suites.push({ path: toPosix(path.relative(dataRoot, path.join(td, n))), sha256: fileSha(path.join(td, n)) }); } catch { /* none */ }
    }
    if (!declaredTarget) {
      const ctx = path.join(r.dir, 'context');
      try {
        for (const n of fs.readdirSync(ctx).filter((x) => /^ProjectContext.*\.md$/i.test(x)).sort()) {
          const m = fs.readFileSync(path.join(ctx, n), 'utf8').match(/^\|\s*Target Environment\s*\|\s*([^|]+?)\s*\|/mi);
          if (m && /^https?:\/\//i.test(m[1].replace(/[`<>]/g, ''))) { declaredTarget = m[1].replace(/[`<>]/g, '').trim(); break; }
        }
      } catch { /* none */ }
    }
  }
  return { roots, suites, declaredTarget };
}

const scopeOf = (meta) => ({
  modules: meta.modules || null, moduleFeature: meta.moduleFeature || null, scopeFamily: meta.scopeFamily || null,
  feature: meta.feature || null, supplier: meta.supplier || null, sharedScope: meta.sharedScope || null,
});

/** The dynamic half of the binding — recomputed at every check. */
function dynamicBinding({ runsDir, folderName, meta, policyHash, dataRoot }) {
  // eslint-disable-next-line global-require
  const { loadAuthorizations } = require('../execution_safety/policyLoader');
  let auths = [];
  try { auths = loadAuthorizations({ dataRoot, runFolder: folderName }).authorizations; } catch { auths = ['unreadable']; }
  const facts = scopeFacts(meta, dataRoot);
  return {
    policyHash,
    authorizations: sha(auths),
    scope: sha(scopeOf(meta)),
    suites: sha(facts.suites),
    capabilityPlan: fileSha(path.join(runsDir, folderName, 'metadata', 'CapabilityPlan.md')),
  };
}

function loadPolicySafe(dataRoot, policyFile) {
  // eslint-disable-next-line global-require
  const { loadPolicy } = require('../execution_safety/policyLoader');
  try { return loadPolicy(policyFile ? { file: policyFile } : { dataRoot }); } catch (err) { return { error: err.message.split('\n')[0] }; }
}

/**
 * Evaluates a preflight request. Pure with respect to the run (reads only); returns the record to append.
 */
function evaluatePreflight({ runsDir, folderName, meta, stageId, environment, targetUrl, executionType, executionMode, operations, confirmedBy, policyFile, now }) {
  // eslint-disable-next-line global-require
  const schema = require('../execution_safety/schema');
  // eslint-disable-next-line global-require
  const { evaluate } = require('../execution_safety/evaluator');
  // eslint-disable-next-line global-require
  const { loadAuthorizations } = require('../execution_safety/policyLoader');
  // eslint-disable-next-line global-require
  const { approverProblem } = require('./approverIdentity');
  const dataRoot = path.dirname(runsDir);
  const refusals = [];

  if (!EXECUTION_STAGES.includes(stageId) && !LIVE_STAGES.includes(stageId)) refusals.push(`Stage ${stageId} neither executes tests nor uses a live application — a Safety Preflight is for 2 and 4A (live sessions) and 4M, 5A and 5H (execution)`);
  const loaded = loadPolicySafe(dataRoot, policyFile);
  const policy = loaded.policy || null;
  if (!policy) refusals.push(`no Execution Safety policy could be loaded (${loaded.error}) — without a policy nothing is authorized`);

  // Environment: explicit, known, never inferred, never defaulted.
  const rawEnv = String(environment ?? '').trim();
  let env = null;
  if (!rawEnv) refusals.push('the target environment was not named — it is never inferred from the URL and never defaulted');
  else {
    const n = schema.normalizeEnvironment(rawEnv, policy);
    if (!n.recognised || n.environment === 'Unknown') refusals.push(`"${rawEnv}" is not a known environment (${schema.ENVIRONMENTS.filter((e) => e !== 'Unknown').join(', ')}${policy && (policy.environmentAliases || []).length ? `; aliases: ${policy.environmentAliases.join(', ')}` : ''}) — an unknown environment is refused, never treated as ${policy ? policy.environment : 'Staging'}`);
    else env = n.environment;
  }
  if (env && policy && env !== policy.environment) {
    refusals.push(`the project's Execution Safety policy governs ${policy.environment}; no policy covers ${env}${PRODUCTION_CLASS.includes(env) ? ' — Production execution is refused' : ''}`);
  }

  // Target URL: recorded; must match a declared target when the scope declares one. Never decides the environment.
  let url = null;
  try { url = new URL(String(targetUrl || '')); if (!/^https?:$/.test(url.protocol)) url = null; } catch { url = null; }
  if (!url) refusals.push(`the target URL ${targetUrl ? `"${targetUrl}" ` : ''}is not an http(s) URL`);
  const facts = scopeFacts(meta, dataRoot);
  if (url && facts.declaredTarget) {
    let declared = null;
    try { declared = new URL(facts.declaredTarget); } catch { declared = null; }
    if (declared && declared.host.toLowerCase() !== url.host.toLowerCase()) refusals.push(`the target URL host ${url.host} is not the run scope's declared target (${declared.host}, Project Context "Target Environment")`);
  }

  // Execution type and browser mode.
  const type = String(executionType || '').toLowerCase();
  if (!EXECUTION_TYPES.includes(type)) refusals.push(`execution type "${executionType || ''}" — expected one of ${EXECUTION_TYPES.join(', ')}`);
  let mode = null;
  if (type === 'browser') {
    mode = BROWSER_MODES.find((m) => m.toLowerCase() === String(executionMode || '').toLowerCase()) || null;
    if (!mode) refusals.push('browser execution needs an explicit mode — Headed or Headless — confirmed by the human; it is never defaulted');
  }

  // Operations.
  const ops = Array.isArray(operations) ? operations : [];
  if (!ops.length) refusals.push('no intended test operations were stated (e.g. [{"action":"READ","ownership":"DedicatedTestData"}])');
  let auths = [];
  try { auths = loadAuthorizations({ dataRoot, runFolder: folderName }).authorizations; } catch (err) { refusals.push(`the run's authorizations cannot be read (${err.message.split('\n')[0]})`); }
  const runModules = Array.isArray(meta.modules) ? meta.modules : null;
  const evaluated = ops.map((op, i) => {
    const out = { action: op && op.action, ownership: op && op.ownership, module: (op && op.module) || null, entity: (op && op.entity) || null, testCaseId: (op && op.testCaseId) || null };
    if (!op || !op.action) { refusals.push(`operation ${i + 1} names no action`); return { ...out, decision: 'Refused' }; }
    if (out.module && runModules && !runModules.includes(out.module)) refusals.push(`operation ${i + 1} (${op.action}) targets module "${out.module}", outside the run's scope (${runModules.join(', ')})`);
    if (!policy || !env) return { ...out, mutating: schema.isMutating(schema.normalizeAction ? schema.normalizeAction(op.action).action : op.action), decision: 'Not evaluated' };
    const r = evaluate({ policy, action: op.action, ownership: op.ownership, environment: env, module: out.module, entity: out.entity, runId: folderName, authorizations: auths });
    const rec = { ...out, action: r.action, ownership: r.ownership, mutating: r.mutating, decision: r.decision, matchedRule: r.matchedRule, reason: r.reason, ...(r.satisfiedBy ? { authorizedBy: r.satisfiedBy.approvedBy } : {}) };
    if (r.decision === 'Forbidden') refusals.push(`operation ${i + 1}: ${r.action} on ${r.ownership} data in ${env} is Forbidden — ${r.reason}`);
    else if (r.decision === 'Approval Required') refusals.push(`operation ${i + 1}: ${r.action} on ${r.ownership} data in ${env} needs a run authorization from a named human first (Execution Safety, SafetyAuthorizations.json)`);
    return rec;
  });

  const who = String(confirmedBy ?? '').trim();
  const whoProblem = approverProblem(who);
  if (whoProblem) refusals.push(`confirmation: ${whoProblem}`);

  const staticInputs = {
    run: folderName, stageId, environment: env, targetUrl: url ? url.toString() : String(targetUrl || ''), executionType: type || null, executionMode: mode,
    operations: sha(evaluated.map((o) => [o.action, o.ownership, o.module, o.entity, o.testCaseId])),
  };
  const dyn = dynamicBinding({ runsDir, folderName, meta, policyHash: loaded.policyHash || null, dataRoot });
  return {
    stageId, at: now.toISOString(), decision: refusals.length ? 'refused' : 'confirmed', refusals,
    confirmedBy: who || null, environment: env, requestedEnvironment: rawEnv || null,
    environmentClass: env ? (PRODUCTION_CLASS.includes(env) ? 'production' : 'non-production') : 'unknown',
    policy: policy ? { id: policy.policyId, version: policy.policyVersion, environment: policy.environment, hash: loaded.policyHash, file: toPosix(path.relative(dataRoot, loaded.policyPath)).startsWith('..') ? toPosix(loaded.policyPath) : toPosix(path.relative(dataRoot, loaded.policyPath)) } : null,
    targetUrl: staticInputs.targetUrl, declaredTarget: facts.declaredTarget, executionType: type || null, executionMode: mode,
    operations: evaluated,
    readOnly: evaluated.length > 0 && evaluated.every((o) => o.mutating === false),
    binding: { static: staticInputs, dynamic: dyn, fingerprint: sha({ staticInputs, dyn }) },
  };
}

/**
 * Is there a confirmed, current preflight for this stage?
 * @returns {{ok: boolean, record: object|null, reason: string|null, changed: string[]}}
 */
function checkPreflight(runsDir, folderName, stageId, { meta } = {}) {
  const m = meta || JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
  const records = (m.safetyPreflights || []).filter((r) => r.stageId === stageId);
  const record = records[records.length - 1] || null;
  if (!record) return { ok: false, record: null, reason: `no Safety Preflight is recorded for Stage ${stageId}`, changed: [] };
  if (record.decision !== 'confirmed') return { ok: false, record, reason: `the latest Safety Preflight for Stage ${stageId} (${record.id}) was refused: ${record.refusals.join('; ')}`, changed: [] };
  const dataRoot = path.dirname(runsDir);
  // Revalidated against the SAME policy file the preflight was evaluated with (its hash is bound).
  const pfile = record.policy && record.policy.file ? (path.isAbsolute(record.policy.file) ? record.policy.file : path.join(dataRoot, record.policy.file)) : null;
  const loaded = loadPolicySafe(dataRoot, pfile);
  const now = dynamicBinding({ runsDir, folderName, meta: m, policyHash: loaded.policyHash || null, dataRoot });
  const changed = Object.keys(now).filter((k) => now[k] !== record.binding.dynamic[k]);
  if (record.binding.static.run !== folderName) changed.push('run');
  if (changed.length) return { ok: false, record, reason: `the Safety Preflight for Stage ${stageId} (${record.id}) is stale — bound input(s) changed since it was confirmed: ${changed.join(', ')}`, changed };
  return { ok: true, record, reason: null, changed: [] };
}

/**
 * The live-activity boundary (Phase 9.4): a browser launched by the platform's drivers for a run's stage needs
 * that stage's confirmed, current Safety Preflight, recorded as browser execution with the SAME mode. Throws
 * (code PREFLIGHT_REQUIRED | MODE_MISMATCH) — fail closed — when the evidence is missing or does not match.
 * @param {{runsDir: string, run: string, stage: string, headless: boolean}} o
 * @returns {object} the preflight record that authorizes the launch
 */
function assertLivePreflight({ runsDir, run, stage, id, headless } = {}) {
  const fail = (msg, code) => { const e = new Error(msg); e.code = code; throw e; };
  if (!runsDir || !run || !stage || !id) fail('A browser session is opened only for a run\'s stage with its exact Safety Preflight: pass preflight: { runsDir, run, stage, id } — record it first with run_manager/cli.js state preflight <stage> … and name the SP-n it printed (pipeline.md §14).', 'PREFLIGHT_REQUIRED');
  const stageId = String(stage).trim().toUpperCase();
  if (!EXECUTION_STAGES.includes(stageId) && !LIVE_STAGES.includes(stageId)) fail(`Stage ${stage} does not use a live application.`, 'PREFLIGHT_REQUIRED');
  if (/[\\/]/.test(String(run))) fail('preflight.run is a run folder name, never a path.', 'PREFLIGHT_REQUIRED');
  let c;
  try { c = checkPreflight(runsDir, run, stageId); } catch (err) { fail(`The run's Safety Preflight cannot be read (${String(err.message).split('\n')[0]}).`, 'PREFLIGHT_REQUIRED'); }
  if (!c.ok) fail(`Browser launch refused: ${c.reason}.`, 'PREFLIGHT_REQUIRED');
  // The EXACT preflight (Phase 9.5, R-01): the one named is the stage's latest confirmed, current preflight.
  if (c.record.id !== id) fail(`Browser launch refused: ${id} is not the current Safety Preflight of Stage ${stageId} (that is ${c.record.id}).`, 'PREFLIGHT_REQUIRED');
  // ...for THIS run's stage, while it is actually running — never a preflight lent from an idle stage or another run.
  let meta = null;
  try { meta = JSON.parse(fs.readFileSync(path.join(runsDir, run, 'metadata', 'run.json'), 'utf8')); } catch { /* checked below */ }
  const st = meta && meta.stages && meta.stages[stageId];
  if (!st || st.status !== 'Running') fail(`Browser launch refused: Stage ${stageId} of ${run} is ${st ? st.status : 'not started'}, not Running — a live session belongs to a started stage (state start ${stageId}).`, 'STAGE_NOT_RUNNING');
  if (c.record.executionType !== 'browser') fail(`Browser launch refused: the Stage ${stageId} preflight (${c.record.id}) was recorded for ${c.record.executionType} execution, not a browser.`, 'PREFLIGHT_REQUIRED');
  const want = headless ? 'Headless' : 'Headed';
  if (c.record.executionMode !== want) fail(`Browser launch refused: the human confirmed ${c.record.executionMode} for Stage ${stageId} (${c.record.id}), not ${want}. Record a new preflight if the choice changed — it is never carried over or overridden.`, 'MODE_MISMATCH');
  return c.record;
}

/**
 * R-01 (Phase 9.5): the session a driver is about to open must be the one the preflight confirmed — the same
 * environment (its credentials' environment label, resolved through the policy's names and aliases; never
 * defaulted) and the same target (scheme, host and port of the base URL). Called after the driver resolves its
 * credentials and base URL and BEFORE any browser starts. Throws ENVIRONMENT_MISMATCH | TARGET_MISMATCH.
 */
function assertSessionMatchesPreflight({ record, runsDir, environment, url } = {}) {
  const fail = (msg, code) => { const e = new Error(msg); e.code = code; throw e; };
  if (!record) fail('No preflight record to compare the session with.', 'PREFLIGHT_REQUIRED');
  const dataRoot = path.dirname(runsDir);
  const pfile = record.policy && record.policy.file ? (path.isAbsolute(record.policy.file) ? record.policy.file : path.join(dataRoot, record.policy.file)) : null;
  const loaded = loadPolicySafe(dataRoot, pfile);
  if (!loaded.policy) fail(`The policy the preflight was confirmed under cannot be read (${loaded.error}).`, 'PREFLIGHT_REQUIRED');
  if (!String(environment || '').trim()) fail(`Browser launch refused: the session names no environment, so it cannot be matched with ${record.id} (${record.environment}) — it is never defaulted.`, 'ENVIRONMENT_MISMATCH');
  // eslint-disable-next-line global-require
  const { normalizeEnvironment } = require('../execution_safety/schema');
  const env = normalizeEnvironment(environment, loaded.policy).environment;
  if (env !== record.environment) fail(`Browser launch refused: the session's environment "${environment}" is ${env}, but ${record.id} confirmed ${record.environment}.`, 'ENVIRONMENT_MISMATCH');
  let u; let t;
  try { u = new URL(String(url)); } catch { fail(`Browser launch refused: the session has no valid base URL to match with ${record.id}.`, 'TARGET_MISMATCH'); }
  try { t = new URL(String(record.targetUrl)); } catch { fail(`${record.id} records no valid target URL.`, 'TARGET_MISMATCH'); }
  if (u.protocol !== t.protocol || u.host.toLowerCase() !== t.host.toLowerCase()) fail(`Browser launch refused: the session would open ${u.origin}, but ${record.id} confirmed ${t.origin}.`, 'TARGET_MISMATCH');
  return true;
}

/** The human-readable audit trail (metadata/SafetyPreflight.md), regenerated from run.json after every record. */
function renderPreflightTrail(folderName, records) {
  const rows = records.map((r) => `| ${r.id} | ${r.stageId} | ${r.at} | **${r.decision}** | ${r.environment || r.requestedEnvironment || '—'} (${r.environmentClass}) | ${r.targetUrl || '—'} | ${r.executionType || '—'}${r.executionMode ? ` / ${r.executionMode}` : ''} | ${r.operations.length} (${r.operations.filter((o) => o.mutating).length} mutating) | ${r.confirmedBy || '—'} | \`${r.binding.fingerprint.slice(0, 12)}\` |`);
  const refusals = records.filter((r) => r.decision === 'refused').map((r) => `- **${r.id}** (${r.at}): ${r.refusals.join('; ')}`);
  return `# Safety Preflight — ${folderName}\n\nRecorded by the Run Manager (\`state preflight\`). A stage that executes tests (4M, 5A, 5H) starts only with a confirmed preflight whose binding still matches. Every confirmation and refusal is kept.\n\n| ID | Stage | At | Decision | Environment | Target URL | Execution | Operations | Confirmed by | Binding |\n|---|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n${refusals.length ? `\n## Refusals\n\n${refusals.join('\n')}\n` : ''}`;
}

module.exports = { EXECUTION_STAGES, LIVE_STAGES, EXECUTION_TYPES, BROWSER_MODES, evaluatePreflight, checkPreflight, assertLivePreflight, assertSessionMatchesPreflight, renderPreflightTrail, scopeFacts };
