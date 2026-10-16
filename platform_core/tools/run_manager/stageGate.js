// Stage Entry Gate — the mechanical check a stage passes before it starts.
//
// WHY THIS EXISTS
// pipeline.md §5.3 #5 and §5.3.1 #4–#5 say a stage never silently consumes un-approved input: a
// Pending upstream stops it, an absent one lets it run degraded only where its own SKILL.md says so.
// Until now every part of that was an instruction. This module makes it a check that runs on every
// `cli.js state start`, and whose result is recorded on the stage (`entryGate`).
//
// WHAT IT CHECKS, per required upstream stage and per scope root (module, Feature, or Supplier scope):
//   - presence      — the upstream's authoritative artifact exists;
//   - approval      — its OWN header reads Approved (artifactHeader.js), never a Manifest row and never
//                     "the stage is Completed";
//   - integrity     — where an approval was recorded by the run state model, the artifact's content
//                     still matches the fingerprint taken at approval (modified-after-approval);
//   - staleness     — the Module Manager's stale report (module_architecture.md §10.4): an upstream
//                     artifact revised after the one being consumed;
//   - this run      — an upstream stage of THIS run that is still running, waiting, blocked or failed.
//
// DECISION
//   blocked   — any Pending / Rejected / unverifiable / modified / in-progress / unresolved upstream,
//               any stale upstream not accepted by a named human, any missing upstream the stage cannot
//               run without, or a degraded start not declared as `Direct (degraded)`.
//   degraded  — only documented-degradable inputs are missing (pipeline.md §5.3.1 #5), and the
//               invocation is `Direct (degraded)`.
//   proceed   — everything required is present, approved, intact, and current.
//
// It reads; it never writes. Recording the result is runState.js's job.

const fs = require('fs');
const path = require('path');

const { readArtifactApprovalStatus, fingerprintFile, MIXED } = require('./artifactHeader');
const { isWithinDataRoot } = require('./pathBoundary');
const { findLegacyAttestations } = require('./legacyProvenance');
const { runBoundSuites, resolveSuiteMatrix } = require('./suiteBinding');

/**
 * What each stage needs from upstream, and what happens when it is absent — taken from each Skill's
 * own "Missing upstream" rules (§5.3.1 #5). `onMissing`:
 *   'degraded'     — run degraded, declare the gap
 *   'block'        — the Skill halts without it
 *   { degradedIf } — degraded only when the invoking human declares that condition, else block
 */
const STAGE_REQUIREMENTS = Object.freeze({
  1: { upstream: [] },
  2: { upstream: [{ stage: '1', onMissing: 'degraded' }] },
  3: { upstream: [{ stage: '1', onMissing: 'block' }, { stage: '2', onMissing: 'degraded' }] },
  '4M': { upstream: [{ stage: '3', onMissing: 'block' }, { stage: '1', onMissing: { degradedIf: 'environmentSupplied' } }] },
  '4A': { upstream: [{ stage: '3', onMissing: { degradedIf: 'namedTestCases' } }] },
  '5A': { upstream: [{ stage: '4A', onMissing: 'block' }, { stage: '1', onMissing: { degradedIf: 'environmentSupplied' } }] },
  '5H': {
    upstream: [{ stage: '5A', onMissing: { degradedIf: 'externalReports' } }, { stage: '1', onMissing: { degradedIf: 'environmentSupplied' } }],
    directOnly: true,
  },
  '6A': { upstream: [{ stage: '5A', onMissing: 'degraded' }, { stage: '3', onMissing: 'degraded' }, { stage: '1', onMissing: 'degraded' }] },
});

/** Conditions an invoking human may declare, each unlocking one documented degraded path. */
const GATE_CONDITIONS = Object.freeze({
  environmentSupplied: 'target environment and credentials supplied in the invocation (Project Context absent)',
  namedTestCases: 'the invocation names the test case IDs to automate (no approved Manual Test Suite)',
  externalReports: 'the suite\'s own last three execution reports are used (self-healing-skill §4.2)',
});

/** Module Manager stage slugs (moduleRegistry MODULE_STAGES) for the stages that live in a module. */
const MODULE_STAGE_SLUG = Object.freeze({ 1: 'context', 2: 'discovery', 3: 'test_design', '4A': 'automation' });

/**
 * The scope roots a run's module-level artifacts live under, from run.json. A classic run names its
 * modules (and optionally a module Feature); a Supplier-Feature run names a Feature plus a Supplier or
 * a shared scope. `override` (e.g. `--modules a,b`) wins when given.
 * @returns {{roots: Array<{label: string, dir: string, module: string|null}>, problem: string|null}}
 */
function resolveScopeRoots(meta, dataRoot, override = {}) {
  const modules = override.modules?.length ? override.modules : (Array.isArray(meta.modules) ? meta.modules : []);
  if (meta.scopeFamily === 'supplier-feature' && !override.modules?.length) {
    const base = path.join(dataRoot, 'supplier-features', meta.feature || '');
    if (meta.supplier) return { roots: [{ label: `${meta.feature}/${meta.supplier}`, dir: path.join(base, 'suppliers', meta.supplier), module: null }], problem: null };
    if (meta.sharedScope) return { roots: [{ label: `${meta.feature}/shared/${meta.sharedScope}`, dir: path.join(base, 'shared', meta.sharedScope), module: null }], problem: null };
    return { roots: [], problem: 'Supplier-Feature run names neither a supplier nor a shared scope' };
  }
  if (!modules.length) {
    return { roots: [], problem: 'the run names no module, Feature or Supplier scope — pass --modules, or create the run with its owner (run_manager.md §5.1.1)' };
  }
  const feature = override.moduleFeature ?? meta.moduleFeature ?? null;
  return {
    roots: modules.map((m) => ({
      label: feature ? `${m}/${feature}` : m,
      dir: feature ? path.join(dataRoot, 'modules', m, 'features', feature) : path.join(dataRoot, 'modules', m),
      module: m,
    })),
    problem: null,
  };
}

/** The authoritative artifact(s) for an upstream stage under one scope root. */
function upstreamArtifacts(stageId, root, runDir) {
  const firstExisting = (rels) => {
    for (const rel of rels) {
      const p = path.join(root.dir, rel);
      if (fs.existsSync(p)) return [p];
    }
    return [];
  };
  switch (stageId) {
    case '1': return firstExisting(['context/ProjectContext.md']);
    // Discovery's reviewed summary: the QA Assessment Report, or — in modules written before it
    // existed — the Coverage Summary, which carries the same Status header.
    case '2': return firstExisting(['discovery/QA_Assessment_Report.md', 'discovery/Coverage_Summary.md']);
    case '3': {
      const dir = path.join(root.dir, 'test_design');
      try {
        return fs.readdirSync(dir).filter((n) => /^TestCases_.+\.md$/.test(n)).sort().map((n) => path.join(dir, n));
      } catch {
        return [];
      }
    }
    case '4A': return firstExisting(['automation/.module_automation_state.json']);
    case '5A': {
      const p = path.join(runDir, 'execution', 'ExecutionResults.md');
      return fs.existsSync(p) ? [p] : [];
    }
    default: return [];
  }
}

/** A run folder's run.json, or null when it cannot be read. */
function runMetaOf(runDir) {
  try { return JSON.parse(fs.readFileSync(path.join(runDir, 'metadata', 'run.json'), 'utf8')); } catch { return null; }
}

function samePath(a, b) {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

/**
 * Everything the run state model has recorded about `absPath`, across every run inside the model:
 *   approved   — an approval recorded with its fingerprint (current, or kept in `approval.previous`)
 *   revoked    — that approval was withdrawn by a reopen
 *   rejected   — a reviewer rejected the artifact
 *   requested  — approval was requested and is still open (the stage is Waiting For Approval)
 * Historical runs are skipped — their approvals are neither invalidated nor counted.
 * @returns {Array<{type: string, at: string, run: string, stageId: string, by?: string, sha256?: string, reason?: string}>}
 */
function approvalHistory(runsDir, absPath, { dataRoot } = {}) {
  const root = dataRoot || path.dirname(runsDir);
  const events = [];
  let entries = [];
  try {
    entries = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    return events;
  }
  const matches = (ref) => samePath(path.isAbsolute(ref) ? ref : resolveRef(ref, root), absPath);
  for (const e of entries) {
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(path.join(runsDir, e.name, 'metadata', 'run.json'), 'utf8'));
    } catch {
      continue;
    }
    if (!meta.stateSchemaVersion || !meta.stages) continue;
    for (const stage of Object.values(meta.stages)) {
      const base = { run: e.name, stageId: stage.stageId };
      const a = stage.approval || {};
      const approvalsOf = (rec) => (rec.headerEvidence || []).filter((ev) => matches(ev.path));
      for (const prev of a.previous || []) {
        for (const ev of approvalsOf(prev)) {
          if (prev.approvedAt) events.push({ ...base, type: 'approved', at: prev.approvedAt, by: prev.approvedBy, sha256: ev.sha256 ?? null });
        }
        if (prev.reopenedAt && approvalsOf(prev).length) {
          events.push({ ...base, type: 'revoked', at: prev.reopenedAt, by: prev.reopenedBy, reason: prev.reopenReason });
        }
      }
      if (a.status === 'Approved') {
        for (const ev of approvalsOf(a)) events.push({ ...base, type: 'approved', at: a.approvedAt, by: a.approvedBy, sha256: ev.sha256 ?? null });
      }
      const isCheckpoint = (stage.artifacts || []).some((x) => x.kind === 'checkpoint' && matches(x.path));
      if (!isCheckpoint) continue;
      if (a.status === 'Rejected' && a.rejectedAt) {
        events.push({ ...base, type: 'rejected', at: a.rejectedAt, by: a.rejectedBy, reason: a.feedback });
      }
      if (stage.status === 'Waiting For Approval') {
        const opened = [...(stage.history || [])].reverse().find((h) => h.to === 'Waiting For Approval');
        events.push({ ...base, type: 'requested', at: opened ? opened.at : stage.updatedAt });
      }
    }
  }
  return events.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
}

/**
 * The most recent recorded approval for `absPath` that carries a fingerprint, or null. Kept for
 * callers that only need the fingerprint; the gate itself reads the full approvalHistory().
 */
function findRecordedApproval(runsDir, absPath, opts = {}) {
  const approved = approvalHistory(runsDir, absPath, opts).filter((ev) => ev.type === 'approved' && ev.sha256);
  const last = approved[approved.length - 1];
  return last ? { run: last.run, stageId: last.stageId, approvedBy: last.by, approvedAt: last.at, sha256: last.sha256 } : null;
}

function resolveRef(ref, root) {
  const candidates = [path.resolve(root, ref)];
  const prefix = `${path.basename(root)}/`;
  const slashed = ref.replace(/\\/g, '/');
  if (slashed.startsWith(prefix)) candidates.push(path.resolve(root, slashed.slice(prefix.length)));
  return candidates.find((c) => fs.existsSync(c)) || candidates[0];
}

function within(dir, file) {
  const rel = path.relative(path.resolve(dir), path.resolve(file));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * The recorded completion of upstream stage `stageId` that a stage consuming `root` builds on:
 *   - this run's own record of it, when it completed here (approved, for a checkpointed stage);
 *   - otherwise the most recent approval of that stage, in any run inside the run state model, whose
 *     checkpoint artifacts lie under `root`.
 * Historical (legacy) runs are never a source. Null when nothing was recorded.
 * @returns {null|{run: string, meta: object, stage: object}}
 */
function upstreamSource(runsDir, folderName, meta, stageId, root, dataRoot) {
  // eslint-disable-next-line global-require
  const { STAGE_DEFINITIONS } = require('./runState');
  const checkpointed = Boolean(STAGE_DEFINITIONS[stageId]?.checkpoint);
  const usable = (st) => st && st.status === 'Completed' && (!checkpointed || st.approval?.status === 'Approved');
  const own = meta.stages?.[stageId];
  if (usable(own)) return { run: folderName, meta, stage: own };
  if (!MODULE_STAGE_SLUG[stageId] || !checkpointed) return null;
  let best = null;
  let entries = [];
  try { entries = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return null; }
  for (const e of entries) {
    let m;
    try { m = JSON.parse(fs.readFileSync(path.join(runsDir, e.name, 'metadata', 'run.json'), 'utf8')); } catch { continue; }
    if (!m.stateSchemaVersion || !m.stages) continue;
    const st = m.stages[stageId];
    if (!usable(st)) continue;
    const covers = (st.approval.headerEvidence || []).some((ev) => within(root.dir, path.isAbsolute(ev.path) ? ev.path : resolveRef(ev.path, dataRoot)));
    if (covers && (!best || st.approval.approvedAt > best.stage.approval.approvedAt)) best = { run: e.name, meta: m, stage: st };
  }
  return best;
}

/** The latest reference per artifact that `stageId` recorded in a run's `moduleArtifactRefs[]` — its last attempt. */
function consumedRefs(meta, stageId) {
  const latest = new Map();
  for (const r of meta.moduleArtifactRefs || []) {
    if (r.stage !== stageId) continue;
    const prev = latest.get(r.artifact);
    if (!prev || r.at >= prev.at) latest.set(r.artifact, r);
  }
  return [...latest.values()];
}

/**
 * What changed since `stageId` consumed its upstream artifacts (its `moduleArtifactRefs[]`):
 *   content-changed — the artifact no longer matches the fingerprint the stage consumed. A later
 *                     re-approval does not undo this: the stage was built on the earlier version.
 *   missing         — the consumed artifact is gone.
 *   reapproved      — an approval of the artifact was recorded after the stage started.
 * Pure read. A stage that recorded no references (started before Phase 5, or with the gate skipped)
 * yields nothing here; `recheckEntryEvidence` still covers it.
 * @returns {Array<{artifact: string, kind: string, detail: string}>}
 */
function consumedChanges(runsDir, meta, stageId, { dataRoot } = {}) {
  const root = dataRoot || path.dirname(runsDir);
  const stage = (meta.stages || {})[stageId];
  const since = stage && (stage.lastStartedAt || stage.startedAt);
  const short = (s) => String(s).slice(0, 12);
  const out = [];
  for (const ref of consumedRefs(meta, stageId)) {
    const file = path.resolve(root, ref.artifact);
    if (!ref.sha256) continue; // not fingerprintable (a JSON record) — its state is cross-checked elsewhere
    const now = fingerprintFile(file);
    if (!now) out.push({ artifact: ref.artifact, kind: 'missing', detail: `it consumed at ${ref.at} (${short(ref.sha256)}) and which no longer exists` });
    else if (now !== ref.sha256) out.push({ artifact: ref.artifact, kind: 'content-changed', detail: `it consumed at ${ref.at} as ${short(ref.sha256)} and which is now ${short(now)} — the stage's output describes the earlier version, whatever that artifact's approval says now` });
    if (since) {
      const later = approvalHistory(runsDir, file, { dataRoot: root }).filter((ev) => ev.type === 'approved' && ev.at > since);
      if (later.length) {
        const l = later[later.length - 1];
        out.push({ artifact: ref.artifact, kind: 'reapproved', detail: `was re-approved by ${l.by} at ${l.at} (run ${l.run}), after the stage started (${since})` });
      }
    }
  }
  return out;
}

/** Module Manager stale report for one module, or null when it cannot be computed. */
function staleReport(dataRoot, module) {
  if (!module) return null;
  try {
    // eslint-disable-next-line global-require
    const { detectStaleStages } = require('../module_manager/moduleDrift');
    return detectStaleStages(path.join(dataRoot, 'modules'), module);
  } catch {
    return null;
  }
}

/**
 * Checks one approval-bearing artifact: its header, then what the run state model recorded about it.
 *
 * The most recent recorded event decides:
 *   approved (with fingerprint) → content must still match it, else `modified`;
 *   revoked / rejected / requested → `withdrawn` / `rejected` / `pending`, even when the header has
 *     since been edited to read Approved — a header flipped by hand is not a recorded approval;
 *   nothing recorded → `unrecorded`, a BLOCKER (Phase 9.1, F-01): a header that reads Approved is text
 *     anyone can write, and on its own it never authorizes a downstream stage. An artifact approved before
 *     the run state model existed passes only through a named legacy attestation whose fingerprint still
 *     matches (legacyProvenance.js, `state attest-legacy-approval`);
 *   a recorded approval with no fingerprint → `unverifiable`: the content it approved cannot be proven.
 */
function checkArtifact(file, ctx) {
  const header = readArtifactApprovalStatus(file);
  const rel = path.relative(ctx.dataRoot, file).replace(/\\/g, '/');
  const base = { artifact: rel, header: header.status };
  // A module's automation state is not a reviewed document: the Module Manager record IS the approval
  // (pipeline.md §5.2). It counts only with a named approver and an Approved entry in its own history.
  if (path.basename(file) === '.module_automation_state.json') {
    let st = null;
    try { st = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* unreadable */ }
    if (!st) return { ...base, result: 'unverifiable', detail: 'the automation state cannot be read' };
    if (!['Approved', 'Promoted'].includes(st.state)) return { ...base, result: 'pending', detail: `the Module Manager records automation ${st.state || 'with no state'} — its Automation Approval is needed first` };
    const named = st.approvedBy && String(st.approvedBy).trim();
    const inHistory = (st.history || []).some((h) => h && h.state === 'Approved');
    if (!named || !inHistory) {
      return { ...base, result: 'unrecorded', integrity: 'unrecorded', detail: `the Module Manager records automation ${st.state} but ${named ? 'no Approved entry in its history' : 'no named approver'} — not a recorded Automation Approval` };
    }
    return { ...base, result: 'ok', integrity: 'module-manager', approval: { approvedBy: st.approvedBy, approvedAt: st.approvedAt || null }, detail: `automation ${st.state}, approved by ${st.approvedBy}${st.approvedAt ? ` at ${st.approvedAt}` : ''} (Module Manager record)` };
  }
  if (header.source === 'unreadable') return { ...base, result: 'unverifiable', detail: 'artifact cannot be read' };
  if (header.status === MIXED) {
    return {
      ...base, result: 'mixed',
      detail: 'the Status header records both an approval and open (pending/rejected/draft) items — a partial ' +
        'approval is not an approval; the reviewer must state one status for the artifact',
    };
  }
  if (header.status === 'Rejected') return { ...base, result: 'rejected', detail: 'the artifact header reads Rejected' };
  if (header.status === 'Pending Review' || header.status === 'Pending Automation Approval' || header.status === 'Draft') {
    return { ...base, result: 'pending', detail: `the artifact header reads ${header.status} — approval is needed first` };
  }
  if (header.status !== 'Approved') {
    return { ...base, result: 'unverifiable', detail: 'the artifact has no recognizable Status header, so its approval cannot be verified' };
  }

  const history = approvalHistory(ctx.runsDir, file, { dataRoot: ctx.dataRoot });
  const last = history[history.length - 1];
  if (!last) {
    const attested = findLegacyAttestations(ctx.runsDir, file, { dataRoot: ctx.dataRoot }).pop();
    if (attested) {
      const approval = { run: attested.run, approvedBy: attested.approvedBy, approvedAt: attested.at, legacyRun: attested.legacyRun };
      if (fingerprintFile(file) !== attested.sha256) {
        return {
          ...base, result: 'modified', integrity: 'mismatch', approval,
          detail: `changed after ${attested.approvedBy} attested its legacy approval (${attested.id}, run ${attested.run}, legacy run ${attested.legacyRun}) — it must pass its gate again`,
        };
      }
      return {
        ...base, result: 'ok', integrity: 'legacy-attested', approval,
        detail: `approved before the run state model; attested by ${attested.approvedBy} at ${attested.at} (${attested.id}, run ${attested.run}) from legacy run ${attested.legacyRun} — ${attested.evidence.file}:${attested.evidence.line}; content unchanged since`,
      };
    }
    return {
      ...base, result: 'unrecorded', integrity: 'unrecorded',
      detail: 'header reads Approved, but no named approval with a matching fingerprint was recorded by the run state model — ' +
        'a header alone never authorizes a downstream stage. Request and record the approval (state request-approval, state approve), or, ' +
        'if it was approved in a run that predates the run state model, have the approver attest it: ' +
        'state attest-legacy-approval --artifact <path> --legacy-run <folder> --approved-by "<name>" --reason "..."',
    };
  }
  if (last.type === 'revoked') {
    return {
      ...base, result: 'withdrawn', integrity: 'revoked', event: last,
      detail: `its recorded approval was withdrawn by ${last.by} at ${last.at} (run ${last.run}: ${last.reason || 'reopened'}) and no newer approval was recorded — the header alone does not restore it`,
    };
  }
  if (last.type === 'rejected') {
    return {
      ...base, result: 'rejected', integrity: 'rejected', event: last,
      detail: `rejected by ${last.by} at ${last.at} (run ${last.run}) and no newer approval was recorded — the header alone does not override it`,
    };
  }
  if (last.type === 'requested') {
    return {
      ...base, result: 'pending', integrity: 'open-review', event: last,
      detail: `approval was requested in run ${last.run} (Stage ${last.stageId}) and is still open — record the reviewer's decision there first`,
    };
  }
  if (!last.sha256) {
    return {
      ...base, result: 'unverifiable', integrity: 'unfingerprinted', event: last,
      detail: `approved by ${last.by} at ${last.at}, but no fingerprint was taken — the approved content cannot be proven, so the approval cannot authorize a downstream stage; record it again`,
    };
  }
  const current = fingerprintFile(file);
  if (current !== last.sha256) {
    return {
      ...base, result: 'modified', integrity: 'mismatch', approval: { run: last.run, approvedBy: last.by, approvedAt: last.at },
      detail: `changed after it was approved by ${last.by} at ${last.at} (run ${last.run}) — it must pass its gate again`,
    };
  }
  return {
    ...base, result: 'ok', integrity: 'verified', approval: { run: last.run, approvedBy: last.by, approvedAt: last.at },
    detail: `approved by ${last.by} at ${last.at}${last.run ? ` (run ${last.run})` : ''}; content unchanged since`,
  };
}

/**
 * Cross-checks the three places that say something about a module's automation approval, without
 * adding a fourth:
 *   - `.module_automation_state.json` — the Module Manager's record, and the AUTHORITY (pipeline.md §5.2:
 *     "An approved module project moves to Approved in its .module_automation_state.json");
 *   - `automation/AutomationPlan_*.md` — the Stage 4A artifact a reviewer reads, whose header must agree;
 *   - `module.json` `stages.automation.status` — a cache (§7), reported when stale, never decisive.
 * @returns {{state: string|null, approvedBy: string|null, plans: object[], cache: string|null, conflicts: string[], warnings: string[]}}
 */
function automationApprovalCheck(dataRoot, module) {
  const out = { state: null, approvedBy: null, plans: [], cache: null, conflicts: [], warnings: [] };
  const dir = path.join(dataRoot, 'modules', module, 'automation');
  let stateJson = null;
  try {
    stateJson = JSON.parse(fs.readFileSync(path.join(dir, '.module_automation_state.json'), 'utf8'));
  } catch { /* absent — reported by the presence check */ }
  out.state = stateJson?.state ?? null;
  out.approvedBy = stateJson?.approvedBy ?? null;
  const approvedState = out.state === 'Approved' || out.state === 'Promoted';
  if (out.state === 'Approved' && !(out.approvedBy && String(out.approvedBy).trim())) {
    out.conflicts.push(`${module}: the Module Manager records automation Approved with no named approver — an approval naming nobody is not an approval (record it with module_manager automation ${module} --state Approved --by "<name>")`);
  }
  try {
    out.plans = fs.readdirSync(dir).filter((n) => /^AutomationPlan_.+\.md$/.test(n)).sort()
      .map((n) => ({ artifact: path.relative(dataRoot, path.join(dir, n)).replace(/\\/g, '/'), ...readArtifactApprovalStatus(path.join(dir, n)) }));
  } catch { /* no automation folder */ }
  for (const p of out.plans) {
    if (approvedState && p.status !== 'Approved') {
      out.conflicts.push(
        `${module}: the Module Manager records automation ${out.state}${out.approvedBy ? ` (approved by ${out.approvedBy})` : ''}, ` +
        `but ${p.artifact} reads ${p.status} — the approval record and the reviewed plan disagree`
      );
    }
    if (out.state && !approvedState && p.status === 'Approved') {
      out.conflicts.push(
        `${module}: ${p.artifact} reads Approved, but the Module Manager records automation ${out.state} — ` +
        'the plan was marked approved without the module\'s Automation Approval being recorded'
      );
    }
  }
  try {
    // eslint-disable-next-line global-require
    const { readModuleState } = require('../module_manager/moduleRegistry');
    out.cache = readModuleState(path.join(dataRoot, 'modules'), module)?.stages?.automation?.status ?? null;
  } catch { /* not registered */ }
  if (out.state && out.cache && approvedState !== (out.cache === 'Approved')) {
    out.warnings.push(`${module}: module.json caches automation as ${out.cache}, but the automation state is ${out.state} (cache out of date)`);
  }
  return out;
}

/** The stage whose artifact holds items of each kind (scopeApproval.kindOf). */
const KIND_STAGE = Object.freeze({ context: '1', discovery: '2', test_design: '3' });

/**
 * What each upstream artifact of the given kinds can say about its items, per scope root:
 *   full     — header Approved and its own checks pass: every item in it is approved
 *   partial  — header Mixed with a verified scope approval: items as recorded
 *   unproven — header Mixed and no verified scope approval
 *   blocked  — any other failing header (Pending, Rejected, …)
 */
function scopeIndex(ctx, roots, runDir) {
  // eslint-disable-next-line global-require
  const { findScopeApproval, buildScopeItems } = require('./scopeApproval');
  const index = [];
  const meta = runMetaOf(runDir);
  for (const root of roots) {
    for (const kind of Object.keys(KIND_STAGE)) {
      // PE-03: the suites this run is bound to (its own approved Stage 3), else the folder (legacy).
      const files = kind === 'test_design' && meta
        ? runBoundSuites(meta, root, { dataRoot: ctx.dataRoot }).suites
        : upstreamArtifacts(KIND_STAGE[kind], root, runDir);
      for (const file of files) {
        const c = checkArtifact(file, ctx);
        const entry = { root, kind, file, artifact: c.artifact };
        if (c.result === 'ok') {
          entry.state = 'full';
          if (kind === 'test_design') {
            // The suite's own Traceability Matrix — recorded with it, never another suite's (PE-03).
            const tmRes = resolveSuiteMatrix(ctx.runsDir, file, { dataRoot: ctx.dataRoot, preferMeta: meta, preferRun: path.basename(runDir) });
            entry.matrix = { file: tmRes.file, basis: tmRes.basis, detail: tmRes.detail };
            // A fully approved suite still has per-case decisions; read them (structured fields).
            try { entry.items = buildScopeItems(file, { matrix: tmRes }).items; } catch { entry.items = {}; }
            // Its dependencies are only trusted when its Traceability Matrix is itself approved.
            const tmOk = Boolean(tmRes.file) && fs.existsSync(tmRes.file) && checkArtifact(tmRes.file, ctx).result === 'ok';
            if (!tmOk) for (const it of Object.values(entry.items)) it.dependsOn = null;
          }
        } else if (c.result === 'mixed') {
          const found = findScopeApproval(ctx.runsDir, file, { dataRoot: ctx.dataRoot });
          if (found && found.verified) {
            Object.assign(entry, { state: 'partial', items: found.record.items, record: { id: found.record.id, run: found.run, approvedBy: found.record.approvedBy, at: found.record.at } });
          } else {
            Object.assign(entry, { state: 'unproven', reason: found ? found.reason : 'no partial approval has been recorded for it (state approve-scope)' });
          }
        } else {
          Object.assign(entry, { state: 'blocked', reason: c.detail });
        }
        index.push(entry);
      }
    }
  }
  return index;
}

/**
 * Proves — or fails to prove — that a requested set of items can be consumed on its own.
 *
 * For every requested item and, transitively, everything it depends on:
 *   - it must exist in an artifact that is fully approved, or partially approved with a verified scope
 *     record — an unknown item, an unrecorded partial approval, or an unreadable dependency is not proof;
 *   - it must be Approved (test cases also `Automation = Approved` for Stages 4A and 5A);
 *   - no Pending or Rejected item may list it in `Affects`.
 * Unqualified IDs resolve to the scope of the item that cites them; another module is `module:ID`.
 *
 * @returns {{ok: boolean, blockers: string[], covered: Set<string>, closure: string[], records: object[]}}
 */
function resolvePartialScope(ctx, roots, stageId, requested, runDir, index = scopeIndex(ctx, roots, runDir)) {
  // eslint-disable-next-line global-require
  const { kindOf } = require('./scopeApproval');
  const needAutomation = stageId === '4A' || stageId === '5A';
  const blockers = [];
  const covered = new Set();
  const records = new Map();
  const labelOf = (root) => root.module || root.label;

  // Items an unresolved (Pending / Rejected) item says it changes — they cannot proceed while it is open.
  const affected = new Map();
  for (const e of index.filter((x) => x.state === 'partial')) {
    for (const [id, it] of Object.entries(e.items)) {
      if (it.status === 'Approved') continue;
      for (const a of it.affects || []) {
        const key = a.includes(':') ? a : `${labelOf(e.root)}:${a}`;
        affected.set(key, `${labelOf(e.root)}:${id} (${it.status})`);
      }
    }
  }

  const qualify = (id, defaultScope) => {
    if (id.includes(':')) return id;
    if (defaultScope) return `${defaultScope}:${id}`;
    if (roots.length === 1) return `${labelOf(roots[0])}:${id}`;
    const owners = [...new Set(index.filter((e) => e.kind === kindOf(id) && (e.state === 'full' && e.kind !== 'test_design' ? false : e.items && e.items[id])).map((e) => labelOf(e.root)))];
    return owners.length === 1 ? `${owners[0]}:${id}` : null;
  };

  const seen = new Set();
  const queue = [];
  for (const raw of requested) {
    const key = qualify(raw);
    if (!key) blockers.push(`${raw}: ambiguous across modules — name it as <module>:${raw}`);
    else queue.push({ key, via: null });
  }
  while (queue.length) {
    const { key, via } = queue.shift();
    if (seen.has(key)) continue;
    seen.add(key);
    const [scopeLabel, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const where = via ? ` (needed by ${via})` : '';
    const entries = index.filter((e) => labelOf(e.root) === scopeLabel && e.kind === kindOf(id));
    if (!entries.length) {
      blockers.push(`${key}${where}: no ${kindOf(id).replace('_', ' ')} artifact in scope ${scopeLabel} to prove it against`);
      continue;
    }
    if (affected.has(key)) blockers.push(`${key}${where}: affected by unresolved ${affected.get(key)}`);

    const holder = entries.find((e) => e.items && e.items[id]) || entries.find((e) => e.state === 'full' && e.kind !== 'test_design');
    if (!holder) {
      const notProven = entries.find((e) => e.state === 'unproven' || e.state === 'blocked');
      blockers.push(notProven
        ? `${key}${where}: ${notProven.artifact} cannot prove it — ${notProven.reason}`
        : `${key}${where}: not an item of ${entries.map((e) => e.artifact).join(', ')} — independence cannot be proven`);
      continue;
    }
    if (holder.state !== 'full' && holder.state !== 'partial') {
      blockers.push(`${key}${where}: ${holder.artifact} — ${holder.reason}`);
      continue;
    }
    if (holder.state === 'partial') {
      covered.add(holder.file);
      records.set(holder.record.id + holder.record.run, { ...holder.record, artifact: holder.artifact });
    }
    const item = holder.items ? holder.items[id] : null;
    if (item) {
      if (item.status !== 'Approved') blockers.push(`${key}${where}: ${item.status}${item.note ? ` (${item.note})` : ''}`);
      if (needAutomation && kindOf(id) === 'test_design' && item.automation !== 'Approved') {
        blockers.push(`${key}${where}: Automation is ${item.automation}, not Approved`);
      }
      if (item.dependsOn === null) {
        const partialUpstream = index.filter((e) => labelOf(e.root) === scopeLabel && e.kind !== 'test_design' && e.state !== 'full');
        if (partialUpstream.length) {
          blockers.push(`${key}${where}: its dependencies are unknown (no approved traceability row), while ${partialUpstream.map((e) => e.artifact).join(', ')} is not fully approved — independence cannot be proven`);
        }
      } else {
        for (const dep of item.dependsOn || []) queue.push({ key: qualify(dep, scopeLabel), via: key });
      }
    }
  }
  return { ok: blockers.length === 0, blockers, covered, closure: [...seen], records: [...records.values()] };
}

/**
 * Evaluates the entry gate for `stageId` in run `folderName`. Pure read.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @param {object} opts
 * @param {string|number} opts.stageId
 * @param {string} opts.invocationPath - Pipeline | Direct | Direct (degraded)
 * @param {string[]} [opts.modules] - scope override
 * @param {string} [opts.moduleFeature]
 * @param {Record<string, boolean>} [opts.conditions] - declared GATE_CONDITIONS
 * @param {string} [opts.acceptStaleBy] - a named human accepting stale upstream input
 * @param {string} [opts.dataRoot]
 * @param {Date} opts.now
 * @returns {{stageId: string, decision: 'proceed'|'degraded'|'blocked', invocationPath: string, checkedAt: string,
 *            revision: number|null, scope: string[], conditions: object, acceptedStaleBy: string|null,
 *            checks: object[], blockers: string[], gaps: string[]}}
 */
function checkStageEntry(runsDir, folderName, opts = {}) {
  // eslint-disable-next-line global-require
  const rs = require('./runState');
  const { invocationPath, conditions = {}, now } = opts;
  // Accepting stale upstream input is a named human decision (Phase 9.3, workflow enforcement): the name passes
  // the same approver rule as every approval (approverIdentity.js). A refused name accepts nothing — the stale
  // input stays a blocker, and why is said.
  let acceptStaleBy = opts.acceptStaleBy;
  let staleAcceptorProblem = null;
  if (acceptStaleBy !== undefined && acceptStaleBy !== null && String(acceptStaleBy).trim()) {
    // eslint-disable-next-line global-require
    staleAcceptorProblem = require('./approverIdentity').approverProblem(acceptStaleBy);
    if (staleAcceptorProblem) acceptStaleBy = null;
  }
  const scopeItems = [...new Set((opts.scopeItems || []).map((x) => String(x).trim()).filter(Boolean))];
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new rs.RunStateError('checkStageEntry requires an explicit valid `now` Date.', 'INVALID_ARGUMENT');
  }
  const stageId = rs.normalizeStageId(opts.stageId);
  const unknownConditions = Object.keys(conditions).filter((k) => !(k in GATE_CONDITIONS));
  if (unknownConditions.length) {
    throw new rs.RunStateError(`Unknown gate condition(s): ${unknownConditions.join(', ')}. Known: ${Object.keys(GATE_CONDITIONS).join(', ')}.`, 'INVALID_ARGUMENT');
  }

  const dataRoot = opts.dataRoot || path.dirname(runsDir);
  const state = rs.readRunState(runsDir, folderName);
  const meta = JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
  const runDir = path.join(runsDir, folderName);
  const ctx = { runsDir, dataRoot };
  const req = STAGE_REQUIREMENTS[stageId];
  const checks = [];
  const blockers = [];
  const gaps = [];
  const warnings = [];
  const mixedChecks = [];

  if (state.legacy) {
    throw new rs.RunStateError(
      `Run "${folderName}" predates the run state model (no stateSchemaVersion). Its state is Unknown and ` +
      'it is never changed by this model. Create a new run to track state.',
      'LEGACY_RUN'
    );
  }
  if (req.directOnly && invocationPath === 'Pipeline') {
    blockers.push(`Stage ${stageId} never runs as a pipeline step — it starts only on an explicit human invocation (pipeline.md §3.6)`);
  }

  // Safety Preflight (Phase 9.2, F-16): a stage that really executes tests starts only with a confirmed,
  // current preflight — enforced here, at the execution boundary, not only described in a Skill.
  if (['4M', '5A', '5H'].includes(stageId)) {
    // eslint-disable-next-line global-require
    const pfc = require('./executionPreflight').checkPreflight(runsDir, folderName, stageId, { meta });
    if (pfc.ok) {
      const r = pfc.record;
      checks.push({ stage: stageId, result: 'ok', detail: `Safety Preflight ${r.id} confirmed by ${r.confirmedBy} — ${r.environment}, ${r.targetUrl}, ${r.executionType}${r.executionMode ? ` (${r.executionMode})` : ''}, ${r.operations.length} operation(s)` });
    } else {
      checks.push({ stage: stageId, result: 'preflight-required', detail: pfc.reason });
      blockers.push(`SAFETY_PREFLIGHT: ${pfc.reason} — record it: state preflight ${stageId} --environment <env> --target-url <url> --execution-type <browser|api|database|batch|other> [--execution-mode Headed|Headless] --operations <ops.json> --confirmed-by "<name>"`);
    }
  }

  // Execution evidence integrity (Phase 9.1, F-03): once a recorded results file of this run has been
  // rewritten or removed, no stage of the run starts on that evidence — 5H, 6A, or a re-entered 4M/5A.
  {
    // eslint-disable-next-line global-require
    const { checkResultsIntegrity, integrityMessage } = require('./resultsIntegrity');
    const integ = checkResultsIntegrity(runsDir, folderName, { meta, dataRoot });
    if (integ.state === 'modified') {
      checks.push({ stage: stageId, result: 'results-modified', detail: integrityMessage(integ), evidence: integ.modified });
      blockers.push(integrityMessage(integ));
    }
  }

  // A scope override (--modules / --module-feature) is only for a run that names no scope of its own.
  // On a scoped run it would let a stage be gated against a DIFFERENT module's approved artifacts.
  const runHasScope = (Array.isArray(meta.modules) && meta.modules.length > 0) || Boolean(meta.scopeFamily);
  if (runHasScope && (opts.modules?.length || opts.moduleFeature)) {
    blockers.push(
      `scope override refused: this run is scoped to ${meta.scopeFamily ? `${meta.feature}/${meta.supplier || meta.sharedScope}` : meta.modules.join(', ')}` +
      ', and its gate checks that scope only. Use a run created for the other scope.'
    );
  }
  const scopeOpts = runHasScope ? {} : opts;
  // On a run with no scope of its own the override names the scope — and it gets the same registry rule a
  // run's own scope gets at creation (Phase 9.3; F-11): registered and Active, never a Proposed or unknown one.
  if (!runHasScope && opts.modules?.length) {
    // eslint-disable-next-line global-require
    const problems = require('./scopeRegistration').runScopeProblems(dataRoot, { modules: opts.modules, ...(opts.moduleFeature ? { moduleFeature: opts.moduleFeature } : {}) });
    if (problems.length) blockers.push(`scope override refused: ${problems.join('; ')}`);
  }
  const needsScope = req.upstream.some((u) => MODULE_STAGE_SLUG[u.stage]);
  const { roots, problem } = needsScope ? resolveScopeRoots(meta, dataRoot, scopeOpts) : { roots: [], problem: null };
  if (needsScope && problem) blockers.push(`scope unresolved: ${problem}`);

  const seenSources = new Set();
  for (const u of req.upstream) {
    const own = state.stages[u.stage];
    // An upstream stage this run itself is part-way through is never consumable, whatever is on disk.
    const waitingButScoped = own && own.status === 'Waiting For Approval' && scopeItems.length > 0;
    if (own && !waitingButScoped && ['Running', 'Paused', 'Waiting For Approval', 'Blocked', 'Failed'].includes(own.status)) {
      const c = { stage: u.stage, scope: 'this run', result: 'in-progress', detail: `Stage ${u.stage} is ${own.status} in this run${own.reason ? ` — ${own.reason}` : ''}` };
      checks.push(c);
      blockers.push(c.detail);
      // A stage that is only WAITING for its approval has finished its artifact: inspect it anyway, so
      // an approved, independent part of it can be offered as a choice. The blocker above stands.
      if (own.status !== 'Waiting For Approval') continue;
    }

    const targets = MODULE_STAGE_SLUG[u.stage] ? roots : [{ label: 'this run', dir: runDir, module: null }];
    for (const root of targets) {
      let files = upstreamArtifacts(u.stage, root, runDir);
      // PE-03: Stage 3 output is the suites THIS run's Stage 3 approved — not every suite in the folder.
      // Other suites are listed as unbound (no `artifact` key, so they are never recorded as consumed).
      // A run with no approved Stage 3 of its own keeps the folder-wide rule, and says so.
      if (u.stage === '3' && MODULE_STAGE_SLUG[u.stage]) {
        const bound = runBoundSuites(meta, root, { dataRoot });
        if (bound.basis === 'run-approved') {
          files = bound.suites.slice();
          for (const f of bound.suites) {
            const m = resolveSuiteMatrix(runsDir, f, { dataRoot, preferMeta: meta, preferRun: folderName });
            if (m.basis === 'ambiguous') warnings.push(`${root.label}: Traceability Matrix of ${path.basename(f)} is ambiguous — ${m.detail}; its dependencies are not trusted`);
          }
          for (const f of bound.unbound) {
            checks.push({ stage: '3', scope: root.label, unboundArtifact: path.relative(dataRoot, f).replace(/\\/g, '/'), result: 'not-bound', detail: `${path.relative(dataRoot, f).replace(/\\/g, '/')} — not bound to this run (its Stage 3 approved ${bound.suites.length} other suite(s)); not consumed, not checked, never counted as passed` });
          }
        } else if (files.length) {
          checks.push({ stage: '3', scope: root.label, result: 'folder-fallback', detail: `${bound.reason} (${files.length} suite(s))` });
        }
      }
      if (!files.length) {
        const mode = u.onMissing;
        const degradable = mode === 'degraded' || (mode?.degradedIf && conditions[mode.degradedIf] === true);
        const c = { stage: u.stage, scope: root.label, result: 'missing', onMissing: mode?.degradedIf ? `degraded if ${mode.degradedIf}` : mode };
        if (degradable) {
          c.detail = `Stage ${u.stage} output is absent — this stage runs degraded and declares the gap`;
          gaps.push(`${root.label}: Stage ${u.stage} absent${mode?.degradedIf ? ` (${GATE_CONDITIONS[mode.degradedIf]})` : ''}`);
        } else {
          c.detail = `Stage ${u.stage} output is absent and this stage cannot run without it` +
            (mode?.degradedIf ? ` unless ${GATE_CONDITIONS[mode.degradedIf]}` : '');
          blockers.push(`${root.label}: ${c.detail}`);
        }
        checks.push(c);
        continue;
      }

      // Every checkpoint artifact the upstream approval covered is checked, not only the representative
      // file above: a Stage 3 approval covers the Traceability Matrix too, a Stage 4A approval its
      // Automation Plan (Phase 5.6A, audit finding #5).
      const source = upstreamSource(runsDir, folderName, meta, u.stage, root, dataRoot);
      if (source) {
        for (const ev of source.stage.approval?.headerEvidence || []) {
          if (!isWithinDataRoot(ev.path, { dataRoot })) {
            blockers.push(`${root.label}: Stage ${u.stage} (run ${source.run}) approved ${ev.path}, which is outside the data root — an outside file is never consumed (OUTSIDE_DATA_ROOT)`);
            continue;
          }
          const abs = path.isAbsolute(ev.path) ? ev.path : resolveRef(ev.path, dataRoot);
          if (MODULE_STAGE_SLUG[u.stage] && !within(root.dir, abs)) continue;
          if (!files.some((f) => samePath(f, abs))) files.push(abs);
        }
      }

      for (const file of files) {
        if (u.stage === '5A') {
          // Execution results carry no approval checkpoint; their presence, and this run's 5A having
          // finished if it ran here, is the requirement.
          checks.push({ stage: '5A', scope: root.label, artifact: path.relative(dataRoot, file).replace(/\\/g, '/'), result: 'ok', detail: 'execution results present' });
          continue;
        }
        const c = { stage: u.stage, scope: root.label, ...checkArtifact(file, ctx) };
        checks.push(c);
        if (c.warning) warnings.push(c.warning);
        if (c.result === 'mixed') mixedChecks.push({ c, file, label: root.label, stage: u.stage });
        else if (c.result !== 'ok') blockers.push(`${root.label}: Stage ${u.stage} ${c.artifact} — ${c.detail}`);
      }

      // Automation approval lives in three places; they must not contradict each other.
      if (u.stage === '4A' && root.module) {
        const x = automationApprovalCheck(dataRoot, root.module);
        for (const conflict of x.conflicts) {
          checks.push({ stage: '4A', scope: root.label, result: 'conflict', detail: conflict });
          blockers.push(`${conflict} — a human must reconcile them (approve the plan, or record the module's Automation Approval)`);
        }
        warnings.push(...x.warnings);
      }

      // Staleness: the upstream artifact itself is older than one of ITS upstreams.
      const slug = MODULE_STAGE_SLUG[u.stage];
      const report = slug ? staleReport(dataRoot, root.module) : null;
      for (const s of (report || []).filter((r) => r.stage === slug)) {
        const detail = `${root.label}: Stage ${u.stage} (${slug}) is stale — ${s.staleAgainst} was updated ${s.upstreamUpdated}, after it (${s.downstreamUpdated})`;
        if (acceptStaleBy && String(acceptStaleBy).trim()) {
          checks.push({ stage: u.stage, scope: root.label, result: 'stale-accepted', detail: `${detail}; accepted by ${acceptStaleBy}` });
        } else {
          checks.push({ stage: u.stage, scope: root.label, result: 'stale', detail });
          blockers.push(`${detail} (re-run it, or accept it with --accept-stale-by "<name>")${staleAcceptorProblem ? ` — the acceptance was refused: ${staleAcceptorProblem}` : ''}`);
        }
      }

      // Built on an earlier version: the upstream stage consumed content that has changed since — even
      // when that content was re-approved afterwards (Phase 5.6A, audit finding #2). Same acceptance
      // rule as staleness: a named human may accept it; it is never assumed.
      if (source && !seenSources.has(`${source.run}|${u.stage}`)) {
        seenSources.add(`${source.run}|${u.stage}`);
        for (const ch of consumedChanges(runsDir, source.meta, u.stage, { dataRoot })) {
          const detail = `${root.label}: Stage ${u.stage} (run ${source.run}) was built on ${ch.artifact}, which ${ch.detail}`;
          if (acceptStaleBy && String(acceptStaleBy).trim()) {
            checks.push({ stage: u.stage, scope: root.label, artifact: ch.artifact, result: 'stale-accepted', detail: `${detail}; accepted by ${acceptStaleBy}` });
          } else {
            checks.push({ stage: u.stage, scope: root.label, artifact: ch.artifact, result: 'stale', detail });
            blockers.push(`${detail} (re-run Stage ${u.stage}, or accept it with --accept-stale-by "<name>")${staleAcceptorProblem ? ` — the acceptance was refused: ${staleAcceptorProblem}` : ''}`);
          }
        }
      }
    }
  }

  // Requirement conflicts (traceGraph.findConflicts): an approved case that still traces to a superseded
  // requirement asserts a rule that may no longer hold. A stage that consumes test cases does not start
  // on it until a human decides (state conflict-decision). Differing definitions of one ID across scopes
  // are a warning. With a partial scope, only conflicts touching the requested cases count.
  if (['4M', '4A', '5A'].includes(stageId) && roots.length) {
    // eslint-disable-next-line global-require
    const { rootGraph, findConflicts } = require('./traceGraph');
    const decided = new Set((meta.conflictDecisions || []).map((d) => d.conflictId));
    const inScope = (c) => !scopeItems.length || c.affected.some((tc) => scopeItems.some((x) => x === tc || x.endsWith(`:${tc}`)));
    // PE-03: only the suites this run is bound to — another run's suite never raises this run's conflicts.
    const boundGraphs = roots.map((r) => rootGraph(runsDir, r, { executions: false, suites: runBoundSuites(meta, r, { dataRoot }).suites, preferMeta: meta, preferRun: folderName }));
    for (const c of findConflicts(boundGraphs)) {
      if (decided.has(c.id) || !inScope(c)) continue;
      if (c.kind === 'superseded-reference') {
        checks.push({ stage: '3', scope: c.scope, result: 'conflict', detail: c.detail });
        blockers.push(`requirement conflict ${c.id}: ${c.detail} — a human must decide (state conflict-decision --id ${c.id} --by "<name>" --decision "...")`);
      } else {
        warnings.push(`possible conflict ${c.id}: ${c.detail}`);
      }
    }
  }

  // API contract drift (Phase 7, api_contract/registry.contractGate): unresolved Breaking or Unknown drift
  // — a pending contract change, unreviewed real-service evidence that contradicts the approved contract,
  // a reached test case with no decision after an accepted change, or two approved contracts that
  // contradict each other — blocks the stages that consume test cases, for the cases it reaches. A scope
  // with no contract registry is untouched; another module's or Supplier's drift never blocks this one.
  if (['4M', '4A', '5A'].includes(stageId) && roots.length) {
    // eslint-disable-next-line global-require
    const { contractGate } = require('../api_contract/registry');
    let cg;
    try { cg = contractGate(dataRoot, roots, { scopeItems }); } catch (err) { cg = { blockers: [`API contract check failed: ${err.message}`], warnings: [], checked: [] }; }
    for (const b of cg.blockers) {
      checks.push({ stage: 'contract', scope: 'contract', result: 'drift', detail: b });
      blockers.push(`${b} — a human must decide (api_contract/cli.js status --scope …)`);
    }
    warnings.push(...cg.warnings);
  }

  // Capability gate (ndc_execution_rules.md §A15): a Supplier run executes only what its Supplier
  // supports. The plan must exist before 4M / 5A start, so unsupported cases are excluded — reported,
  // out of the denominator — instead of being run and failed.
  if ((stageId === '4M' || stageId === '5A') && meta.scopeFamily === 'supplier-feature' && meta.supplier) {
    const planFile = path.join(runDir, 'metadata', 'CapabilityPlan.md');
    if (fs.existsSync(planFile)) {
      // Phase 9.2, F-13: the plan must be bound to THIS run, its Feature and Supplier, and the Supplier's
      // capability answers as they are now — not merely present.
      // eslint-disable-next-line global-require
      const cap = require('../capability_gate');
      // eslint-disable-next-line global-require
      const { findSupplier } = require('../module_manager/supplierRegistry');
      const b = cap.readPlanBinding(fs.readFileSync(planFile, 'utf8'));
      let supplierNow = null;
      try { supplierNow = findSupplier(path.join(dataRoot, 'supplier-features'), meta.feature, meta.supplier); } catch { supplierNow = null; }
      const problems = [];
      if (!b) problems.push('it carries no binding (written before Phase 9.2 or by hand)');
      else {
        if (b.run && b.run !== folderName) problems.push(`it was written for run ${b.run}`);
        if (b.feature !== meta.feature) problems.push(`it is for Feature "${b.feature}", the run is bound to "${meta.feature}"`);
        if (b.supplier !== meta.supplier) problems.push(`it is for Supplier "${b.supplier}", the run is bound to "${meta.supplier}"`);
        if (!supplierNow) problems.push(`Supplier "${meta.supplier}" is not registered under "${meta.feature}"`);
        else if (b.capabilities !== cap.capabilityFingerprint(supplierNow)) problems.push('the Supplier\'s capability answers or rules changed after the plan was made');
      }
      if (problems.length) {
        checks.push({ stage: 'capability', scope: 'this run', result: 'stale', detail: problems.join('; ') });
        blockers.push(`capability plan for ${meta.feature}/${meta.supplier} cannot be used: ${problems.join('; ')} — regenerate it: node platform_core/tools/capability_gate/cli.js plan --run ${folderName}`);
      } else {
        checks.push({ stage: 'capability', scope: 'this run', result: 'ok', detail: `metadata/CapabilityPlan.md bound to ${meta.feature}/${meta.supplier} and its current capabilities — excluded cases are not executed` });
      }
    } else {
      blockers.push(
        `capability plan missing for ${meta.feature}/${meta.supplier}: run \`node platform_core/tools/capability_gate/cli.js plan --run ${folderName}\` ` +
        'before execution — a case the Supplier does not support is Excluded, never run and failed (ndc_execution_rules.md §A15)'
      );
    }
  }

  // Partially approved (Mixed) upstream artifacts: consumable only for an explicit scope whose whole
  // dependency closure is proven approved and unaffected by anything unresolved (scopeApproval.js).
  let partialScope = null;
  let suggestedScope = null;
  if (scopeItems.length) {
    const res = resolvePartialScope(ctx, roots, stageId, scopeItems, runDir);
    partialScope = { items: scopeItems, closure: res.closure, records: res.records, proven: res.ok };
    for (const b of res.blockers) blockers.push(`partial scope: ${b} — a human must decide (approve or exclude it)`);
    for (const m of mixedChecks) {
      if (res.ok && res.covered.has(m.file)) {
        m.c.result = 'partial';
        m.c.detail = `partially approved; the requested scope (${scopeItems.length} item(s)) is proven independent of its unresolved items`;
      } else {
        blockers.push(`${m.label}: Stage ${m.stage} ${m.c.artifact} — ${m.c.detail}; the requested scope does not establish an approved, independent part of it`);
      }
    }
  } else if (mixedChecks.length) {
    // Offer the part that CAN be proven independent — computed, never assumed — as a decision for a human.
    const index = scopeIndex(ctx, roots, runDir);
    // Candidates come from the stage's own item namespace: Project Context items for Stages 2 and 3,
    // test cases for every later stage.
    const suggestKind = stageId === '2' || stageId === '3' ? 'context' : 'test_design';
    const candidates = index.filter((e) => e.kind === suggestKind && e.items).flatMap((e) => Object.entries(e.items)
      .filter(([, it]) => it.status === 'Approved').map(([id]) => (roots.length > 1 ? `${e.root.module || e.root.label}:${id}` : id)));
    const provable = candidates.filter((id) => resolvePartialScope(ctx, roots, stageId, [id], runDir, index).ok);
    if (provable.length) suggestedScope = provable;
    for (const m of mixedChecks) {
      blockers.push(
        `${m.label}: Stage ${m.stage} ${m.c.artifact} — ${m.c.detail}. To consume only an approved, independent part, ` +
        `record its scope (state approve-scope) and start with --scope-items <ids> --by "<name>"` +
        (provable.length ? ` (${provable.length} item(s) can currently be proven independent)` : '')
      );
    }
  }

  // The exact set of test cases this execution stage is authorised to report (Phase 5.6A, audit
  // finding #3) — recorded with the gate, so outcome recording compares results against what was
  // approved WHEN THE STAGE STARTED, not against whatever the suite says later:
  //   partial-scope  — the requested cases and their proven closure;
  //   approved-suite — every case whose Review is Approved (and, for 5A, Automation is Approved).
  let executableScope = null;
  if ((stageId === '4M' || stageId === '5A') && roots.length) {
    // eslint-disable-next-line global-require
    const { kindOf, buildScopeItems } = require('./scopeApproval');
    const bare = (k) => (k.includes(':') ? k.slice(k.indexOf(':') + 1) : k);
    if (partialScope && partialScope.proven) {
      const cases = [...new Set([...partialScope.items, ...partialScope.closure].map(bare).filter((x) => kindOf(x) === 'test_design'))].sort();
      const qualified = [...new Set(partialScope.closure.filter((k) => k.includes(':') && kindOf(bare(k)) === 'test_design'))].sort();
      executableScope = { basis: 'partial-scope', cases, qualified, notApproved: {} };
    } else {
      // Module-qualified identities beside the bare IDs, so a multi-module run can tell login:TC-1 from
      // branch:TC-1 (Phase 5.6B); a single-module run keeps using the bare IDs.
      // PE-03: the suites this run's own Stage 3 approved; the folder only for a run without one (legacy).
      const bindings = roots.map((r) => ({ r, b: runBoundSuites(meta, r, { dataRoot }) }));
      const suites = bindings.flatMap(({ r, b }) => b.suites.map((file) => ({ file, label: r.module || r.label })));
      if (suites.length) {
        const cases = new Set();
        const qualified = new Set();
        const notApproved = {};
        for (const { file, label } of suites) {
          let items = {};
          try { items = buildScopeItems(file, { matrix: resolveSuiteMatrix(runsDir, file, { dataRoot, preferMeta: meta, preferRun: folderName }) }).items; } catch { continue; }
          for (const [tc, it] of Object.entries(items)) {
            if (it.status !== 'Approved') notApproved[tc] = `Review ${it.status}`;
            else if (stageId === '5A' && it.automation !== 'Approved') notApproved[tc] = `Automation ${it.automation}`;
            else { cases.add(tc); qualified.add(`${label}:${tc}`); }
          }
        }
        executableScope = {
          basis: 'approved-suite', cases: [...cases].sort(), qualified: [...qualified].sort(), notApproved,
          suites: suites.map((x) => path.relative(dataRoot, x.file).replace(/\\/g, '/')),
          suiteBinding: bindings.map(({ r, b }) => ({ scope: r.label, basis: b.basis, reason: b.reason, unbound: b.unbound.map((f) => path.relative(dataRoot, f).replace(/\\/g, '/')) })),
        };
      }
    }
  }

  let decision = blockers.length ? 'blocked' : gaps.length ? 'degraded' : 'proceed';
  if (decision === 'degraded' && invocationPath !== 'Direct (degraded)') {
    blockers.push(
      'required upstream input is absent, so this start is degraded — only a human invoking the Skill directly may ' +
      'run it degraded, and the invocation must be declared `Direct (degraded)` (pipeline.md §5.3.1 #5)'
    );
    decision = 'blocked';
  }

  return {
    stageId,
    decision,
    invocationPath: invocationPath ?? null,
    checkedAt: now.toISOString(),
    revision: state.revision,
    scope: roots.map((r) => r.label),
    conditions: { ...conditions },
    acceptedStaleBy: acceptStaleBy ? String(acceptStaleBy).trim() : null,
    checks,
    blockers,
    gaps,
    warnings,
    partialScope,
    suggestedScope,
    executableScope,
  };
}

/**
 * Re-checks what a stage's entry gate accepted when the stage started (its `entryGate.checks`), against
 * the files as they are NOW — the basis of a smart resume. An upstream artifact that has since been
 * edited, sent back for review, rejected, or whose partial-scope record no longer holds, is reported.
 *
 * `unknown` is true when the stage carries no usable gate evidence (started before the gate existed,
 * or with the gate skipped): the impact of upstream changes on it cannot be determined, which is a
 * Human Decision, never an assumption that nothing changed.
 * @returns {{changes: Array<{artifact: string, was: string, now: string, detail: string}>, unknown: boolean, reason: string|null}}
 */
function recheckEntryEvidence(runsDir, stage, { dataRoot } = {}) {
  const root = dataRoot || path.dirname(runsDir);
  const ctx = { runsDir, dataRoot: root };
  const g = stage && stage.entryGate;
  if (!g || g.decision === 'not-checked') {
    return { changes: [], unknown: true, reason: g ? 'the entry gate was not checked when this stage started' : 'this stage carries no entry-gate evidence' };
  }
  // eslint-disable-next-line global-require
  const { findScopeApproval } = require('./scopeApproval');
  const changes = [];
  for (const c of g.checks || []) {
    if (!c.artifact) continue;
    const file = path.resolve(root, c.artifact);
    if (c.result === 'partial') {
      const found = findScopeApproval(runsDir, file, { dataRoot: root });
      if (!found || !found.verified) changes.push({ artifact: c.artifact, was: 'partial', now: 'unproven', detail: found ? found.reason : 'its partial approval record is gone' });
      continue;
    }
    if (c.result !== 'ok') continue;
    if (c.stage === '5A') {
      if (!fs.existsSync(file)) changes.push({ artifact: c.artifact, was: 'present', now: 'missing', detail: 'execution results are no longer on disk' });
      continue;
    }
    const now = checkArtifact(file, ctx);
    if (now.result !== 'ok') changes.push({ artifact: c.artifact, was: 'ok', now: now.result, detail: now.detail });
  }
  return { changes, unknown: false, reason: null };
}

module.exports = {
  STAGE_REQUIREMENTS,
  GATE_CONDITIONS,
  resolveScopeRoots,
  approvalHistory,
  findRecordedApproval,
  automationApprovalCheck,
  scopeIndex,
  resolvePartialScope,
  recheckEntryEvidence,
  upstreamArtifacts,
  upstreamSource,
  consumedRefs,
  consumedChanges,
  checkStageEntry,
};
