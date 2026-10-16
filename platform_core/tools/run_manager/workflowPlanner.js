// Workflow Planner — "what is done, what is next, and what needs a human?" for one run.
//
// WHY THIS EXISTS
// pipeline.md §5.4 lets a human choose a workflow once (Full Manual, Full Automation, Specific Stage)
// and §5.4.2 lets a Full workflow move to its next stage after each recorded approval. Something has to
// answer, from the authoritative record, which stage that is — and to refuse to name one when a gate,
// an approval, or a changed upstream input says the run cannot safely move on. This module is that
// answer. It lives in the Run Manager because it only reads the run state; it is not an orchestrator.
//
// WHAT IT DOES
//   - Reads run.json (the run state model), each stage's recorded approval and entry evidence, and the
//     artifacts themselves (through the entry gate, stageGate.js).
//   - Revalidates every completed stage of the selected workflow: its approval still verifies against
//     the header and fingerprint; the upstream artifacts its entry gate accepted still hold; the run's
//     scope did not change after it finished; for execution stages, the target code did not move.
//     Anything that changed marks that stage, and every later stage of the workflow, for revalidation.
//   - Finds the first stage that is not done and evaluates its entry gate, carrying forward a proven
//     partial scope where the item namespace matches.
//   - Returns ONE next action, with the exact command, and whether it is a Human Decision.
//
// WHAT IT NEVER DOES
// It never starts, completes, approves, reopens or skips anything, and never invokes a Skill. Stage
// completion is never read as approval. Stage 5H is never part of a Full workflow and is never
// proposed as a next step. It judges no output (run_manager.md §10 Rules 1–2, 5).

const fs = require('fs');

const CLI = 'node platform_core/tools/run_manager/cli.js';

/** Which item namespace a stage's partial scope is expressed in (stageGate's resolver). */
const SCOPE_NAMESPACE = Object.freeze({ 2: 'context', 3: 'context', '4M': 'test_design', '4A': 'test_design', '5A': 'test_design', '6A': 'test_design' });

/** Worst-first ordering of test verdicts, so a combined outcome is never better than its worst part. */
const VERDICT_ORDER = ['failures', 'incomplete', 'not-recorded', 'nothing-executed', 'passed-after-repair', 'passed-with-flaky', 'all-passed'];

const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

function readMeta(runsDir, folderName) {
  // eslint-disable-next-line global-require
  const rs = require('./runState');
  return JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
}

/** Overall verdict across recorded outcomes: the worst one, so failures are never hidden by a later pass. */
function combineVerdicts(verdicts) {
  if (!verdicts.length) return 'not-recorded';
  return verdicts.slice().sort((a, b) => VERDICT_ORDER.indexOf(a) - VERDICT_ORDER.indexOf(b))[0];
}

/**
 * Changes since a completed stage finished that may make it, and what came after it, out of date.
 * @returns {Array<{stageId: string, kind: string, detail: string}>}
 */
function revalidate(runsDir, folderName, state, meta, wf, opts) {
  // eslint-disable-next-line global-require
  const rs = require('./runState');
  // eslint-disable-next-line global-require
  const { recheckEntryEvidence, consumedChanges, STAGE_REQUIREMENTS } = require('./stageGate');
  const issues = [];
  let drift = null;
  if (opts.targetRoot && opts.execFileSync && meta.targetRef) {
    try {
      // eslint-disable-next-line global-require
      drift = require('./targetRef').computeDrift(opts.targetRoot, meta, { execFileSync: opts.execFileSync });
    } catch { drift = null; }
  }
  for (const id of wf) {
    const s = state.stages[id];
    if (s.status !== 'Completed') continue;
    if (rs.STAGE_DEFINITIONS[id].checkpoint) {
      const v = rs.verifyStageApproval(runsDir, folderName, id);
      if (!v.verified) issues.push({ stageId: id, kind: 'approval-invalidated', detail: `its recorded approval no longer holds — ${v.reason}` });
    }
    const r = recheckEntryEvidence(runsDir, s);
    if (r.unknown) issues.push({ stageId: id, kind: 'impact-unknown', detail: `${r.reason}, so whether upstream changes affect it cannot be determined` });
    for (const c of r.changes) issues.push({ stageId: id, kind: 'upstream-changed', detail: `${c.artifact} was ${c.was} when it started and is now ${c.now} — ${c.detail}` });
    // What the stage actually consumed (moduleArtifactRefs) against the artifacts as they are now. A
    // re-approval does not make a stage built on the earlier content current again (Phase 5.6A).
    const consumed = consumedChanges(runsDir, meta, id);
    for (const c of consumed) {
      issues.push({ stageId: id, kind: c.kind === 'reapproved' ? 'upstream-reapproved' : 'upstream-changed', detail: `it was built on ${c.artifact}, which ${c.detail}` });
    }
    // In this run: an upstream stage approved again after this stage started.
    const started = meta.stages?.[id]?.lastStartedAt || meta.stages?.[id]?.startedAt;
    for (const u of STAGE_REQUIREMENTS[id]?.upstream || []) {
      const ap = meta.stages?.[u.stage]?.approval;
      // Already reported above when the consumed artifact itself shows the later approval.
      const covered = consumed.some((x) => x.kind === 'reapproved' && (ap?.headerEvidence || []).some((ev) => ev.path === x.artifact));
      if (started && ap && ap.status === 'Approved' && ap.approvedAt > started && !covered) {
        issues.push({ stageId: id, kind: 'upstream-reapproved', detail: `Stage ${u.stage} was approved again by ${ap.approvedBy} at ${ap.approvedAt}, after this stage started (${started})` });
      }
    }
    for (const h of meta.scopeHistory || []) {
      if (s.completedAt && h.changedAt > s.completedAt) {
        issues.push({ stageId: id, kind: 'scope-changed', detail: `the run's scope was changed by ${h.approvedBy} at ${h.changedAt} (${h.reason}), after this stage completed` });
      }
    }
    if (drift && drift.status === 'moved' && ['4M', '5A'].includes(id)) {
      issues.push({ stageId: id, kind: 'environment-changed', detail: `the target code moved since the run was anchored (${drift.commitsSince} commit(s)) — its execution evidence describes older code` });
    }
  }
  return { issues, drift };
}

/**
 * The plan for a run. Pure read.
 *
 * @param {string} runsDir
 * @param {string} folderName
 * @param {{now: Date, targetRoot?: string, execFileSync?: Function}} opts
 * @returns {object} see the module header; `next.action` is one of
 *   select-workflow · start · resume-run · in-progress · await-approval · resolve-blocked ·
 *   choose-scope · run-degraded · revalidate · complete-run · none
 */
function planWorkflow(runsDir, folderName, opts = {}) {
  // eslint-disable-next-line global-require
  const rs = require('./runState');
  // eslint-disable-next-line global-require
  const { checkStageEntry } = require('./stageGate');
  const now = opts.now instanceof Date ? opts.now : new Date();
  const state = rs.readRunState(runsDir, folderName);

  if (state.legacy) {
    return {
      folderName, legacy: true, workflow: null, runStatus: 'Unknown', workflowStatus: 'unknown',
      stages: rs.STAGE_IDS.map((id) => ({ stageId: id, name: state.stages[id].name, status: 'Unknown', category: 'unknown' })),
      next: { action: 'none', humanDecision: true, reason: 'This run predates the run state model; its state is Unknown and is not planned. Create a new run.' },
      revalidation: [], testOutcome: { overall: 'not-recorded', byStage: {} }, approvals: {},
    };
  }

  const meta = readMeta(runsDir, folderName);
  const plan = meta.workflowPlan || null;
  const wf = plan ? plan.stages : [];
  const { issues, drift } = plan ? revalidate(runsDir, folderName, state, meta, wf, opts) : { issues: [], drift: null };

  // Every later stage of the workflow is downstream of an earlier one.
  const firstIssueIdx = issues.length ? Math.min(...issues.map((i) => wf.indexOf(i.stageId))) : -1;

  const consumedPartiallyAt = (id) => wf.includes(id) && wf.slice(wf.indexOf(id) + 1)
    .some((later) => state.stages[later].status !== 'Not Started' && state.stages[later].entryGate?.partialScope?.proven);
  const stageRows = rs.STAGE_IDS.map((id) => {
    const s = state.stages[id];
    const inWorkflow = wf.includes(id);
    const idx = wf.indexOf(id);
    const own = issues.filter((i) => i.stageId === id);
    let category;
    if (!inWorkflow) category = s.status === 'Not Started' ? 'skipped' : 'outside-workflow';
    else if (own.length) category = 'needs-revalidation';
    else if (firstIssueIdx !== -1 && idx > firstIssueIdx && s.status !== 'Not Started') category = 'needs-revalidation';
    else if (s.status === 'Completed') category = 'completed';
    else if (s.status === 'Waiting For Approval' && consumedPartiallyAt(id)) category = 'pending-approval-partial-in-use';
    else if (s.status === 'Waiting For Approval') category = 'pending-approval';
    else if (['Blocked', 'Failed'].includes(s.status)) category = 'blocked';
    else if (['Running', 'Paused'].includes(s.status)) category = 'in-progress';
    else category = 'not-started';
    return {
      stageId: id,
      name: s.name,
      inWorkflow,
      status: s.status,
      category,
      approval: s.approval?.status ?? null,
      ...(s.reason ? { reason: s.reason } : {}),
      ...(s.entryGate?.partialScope ? { partialScope: s.entryGate.partialScope.items } : {}),
      ...(own.length ? { issues: own.map((i) => `${i.kind}: ${i.detail}`) } : {}),
      ...(s.outcome ? { outcome: s.outcome } : {}),
    };
  });

  const byStage = {};
  for (const id of ['4M', '5A', '5H']) if (state.stages[id].outcome) byStage[id] = state.stages[id].outcome.verdict;
  const executedInWorkflow = wf.filter((id) => ['4M', '5A'].includes(id) && state.stages[id].status === 'Completed');
  const verdicts = Object.values(byStage);
  if (executedInWorkflow.some((id) => !state.stages[id].outcome)) verdicts.push('not-recorded');
  // Three views, never merged into one: the latest result (`final`), what happened the first time
  // (`firstAttempt` — kept so a repair never hides an original failure), and the worst of everything
  // recorded (`overall`, the conservative headline).
  const recordedStages = ['4M', '5A', '5H'].filter((id) => state.stages[id].outcome)
    .sort((a, b) => (state.stages[a].outcome.at < state.stages[b].outcome.at ? -1 : 1));
  const firstAttempts = recordedStages.map((id) => state.stages[id].outcome.firstAttemptVerdict).filter(Boolean);
  const testOutcome = {
    overall: combineVerdicts([...verdicts, ...firstAttempts]),
    final: recordedStages.length ? state.stages[recordedStages[recordedStages.length - 1]].outcome.verdict : 'not-recorded',
    firstAttempt: firstAttempts.length ? firstAttempts[0] : (recordedStages.length ? state.stages[recordedStages[0]].outcome.verdict : 'not-recorded'),
    byStage,
  };

  // An approval whose stage needs revalidation is shown apart: it is recorded, but no longer holds as
  // current (audit finding #13).
  const approvals = { approved: [], needsRevalidation: [], pending: [], rejected: [], partialScope: [], notRequired: [] };
  const flagged = new Set(stageRows.filter((r) => r.category === 'needs-revalidation').map((r) => r.stageId));
  for (const id of rs.STAGE_IDS) {
    const s = state.stages[id];
    if (s.approval?.status === 'Approved' && flagged.has(id)) approvals.needsRevalidation.push(id);
    else if (s.approval?.status === 'Approved') approvals.approved.push(id);
    else if (s.approval?.status === 'Rejected') approvals.rejected.push(id);
    else if (s.status === 'Waiting For Approval') approvals.pending.push(id);
    else if (!rs.STAGE_DEFINITIONS[id].checkpoint && s.status === 'Completed') approvals.notRequired.push(id);
    if (s.entryGate?.partialScope?.proven) approvals.partialScope.push(id);
  }

  const base = {
    folderName, legacy: false, workflow: plan, runStatus: state.status,
    stages: stageRows, revalidation: issues, drift: drift ? { status: drift.status, summary: drift.summary } : null,
    testOutcome, approvals,
    manifest: state.manifest,
  };
  const out = (workflowStatus, next) => ({ ...base, workflowStatus, next });

  if (rs.TERMINAL_RUN_STATUSES.includes(state.status)) {
    return out(`run-${state.status.toLowerCase()}`, { action: 'none', humanDecision: false, reason: `The run is ${state.status}; nothing more is recorded on it. New work gets a new run.` });
  }
  if (!plan) {
    return out('not-selected', {
      action: 'select-workflow', humanDecision: true,
      reason: 'No workflow has been selected for this run (pipeline.md §5.4). The human chooses; the planner never does.',
      options: [
        `${CLI} state workflow full-manual --by "<name>"`,
        `${CLI} state workflow full-automation --by "<name>"`,
        `${CLI} state workflow specific-stage --stage <ID> --by "<name>"`,
      ],
    });
  }
  if (state.status === 'Paused') {
    return out('paused', {
      action: 'resume-run', humanDecision: true, reason: `The run was paused${state.statusReason ? ` (${state.statusReason})` : ''}. Resuming re-runs this plan, so every upstream approval is revalidated.`,
      command: `${CLI} state run resume --by "<name>"`,
    });
  }

  // A completed stage whose basis changed comes first: nothing after it can be trusted until a human decides.
  if (issues.length) {
    const first = wf.find((id) => issues.some((i) => i.stageId === id));
    const mine = issues.filter((i) => i.stageId === first);
    const downstream = wf.slice(wf.indexOf(first) + 1).filter((id) => state.stages[id].status !== 'Not Started');
    return out('needs-decision', {
      action: 'revalidate', humanDecision: true, stageId: first,
      reason: `Stage ${first} completed, but ${mine.map((i) => i.detail).join('; ')}. ` +
        (downstream.length ? `Later stage(s) ${downstream.join(', ')} were built on it and are affected too. ` : '') +
        'Only a human decides whether to re-execute it; earlier evidence is kept either way.',
      options: [
        `${CLI} state reopen ${first} --by "<name>" --reason "<why>"   # re-execute it (passes its entry gate again; prior approval kept in history)`,
        'restore the upstream artifact to its approved content, then re-plan',
      ],
      affected: [first, ...downstream],
    });
  }

  // A stage still waiting for its full approval does not hold up an independent, approved part of its
  // output that a later stage is already consuming under a proven partial scope (Phase 2.2). It stays
  // pending — the workflow is not complete until it is fully approved — but planning continues past it.
  const consumedPartially = (id) => state.stages[id].status === 'Waiting For Approval' && consumedPartiallyAt(id);
  const frontier = wf.find((id) => state.stages[id].status !== 'Completed' && !consumedPartially(id))
    || wf.find((id) => state.stages[id].status !== 'Completed');
  if (!frontier) {
    return out('complete', {
      action: 'complete-run', humanDecision: true,
      reason: `Every stage of the ${plan.type} workflow is done. Workflow completion is not a testing verdict — the test outcome is "${testOutcome.overall}".`,
      command: `${CLI} state run complete --by "<name>"`,
    });
  }

  const s = state.stages[frontier];
  const invocationPath = plan.type === 'specific-stage' ? 'Direct' : 'Pipeline';
  const startCmd = (extra = '') => `${CLI} state start ${frontier} --invocation ${q(invocationPath)}${extra}`;

  switch (s.status) {
    case 'Running':
      return out('in-progress', {
        action: 'in-progress', humanDecision: true, stageId: frontier,
        reason: `Stage ${frontier} is Running. The record cannot tell whether a Skill is still working on it or the session was interrupted — a human says which.`,
        options: [
          'still running: let its Skill finish (it records request-approval / complete itself)',
          `interrupted: ${CLI} state recover ${frontier} --by "<name>" --reason "<what happened>"  — then start it again through its gate`,
        ],
      });
    case 'Paused':
      return out('in-progress', {
        action: 'start', humanDecision: false, stageId: frontier,
        reason: `Stage ${frontier} was paused with the run; starting it again re-runs its entry gate.`,
        command: startCmd(),
      });
    case 'Waiting For Approval': {
      // When the waiting artifact is partly approved (Mixed + recorded scope), the next stage may be able
      // to consume the approved, independent part now. That is offered, never taken.
      const later = wf[wf.indexOf(frontier) + 1];
      let partialOption = null;
      if (later && state.stages[later].status === 'Not Started') {
        const lg = checkStageEntry(runsDir, folderName, { stageId: later, invocationPath, now });
        if (lg.suggestedScope && lg.suggestedScope.length) {
          partialOption = { stageId: later, suggestedScope: lg.suggestedScope, command: `${CLI} state start ${later} --invocation ${q(invocationPath)} --scope-items ${lg.suggestedScope.join(',')} --by "<name>"` };
        }
      }
      return out('waiting-approval', {
        action: 'await-approval', humanDecision: true, stageId: frontier,
        reason: `Stage ${frontier} is waiting for its reviewer. The workflow moves on only after the approval is recorded — never on silence (pipeline.md §5.3).`,
        options: [
          `${CLI} state approve ${frontier} --approved-by "<reviewer>"   # after the artifact's own Status header reads Approved`,
          `${CLI} state reject ${frontier} --rejected-by "<reviewer>" --feedback "..."`,
          `${CLI} state approve-scope --artifact <path> --approved-by "<reviewer>"   # a partial approval: header Mixed + item-level scope`,
          ...(partialOption ? [`${partialOption.command}   # proceed with Stage ${partialOption.stageId} for the ${partialOption.suggestedScope.length} item(s) proven independent — Stage ${frontier} stays pending`] : []),
        ],
        ...(partialOption ? { partialOption } : {}),
      });
    }
    case 'Blocked':
    case 'Failed':
      return out('blocked', {
        action: 'resolve-blocked', humanDecision: true, stageId: frontier,
        reason: `Stage ${frontier} is ${s.status}: ${s.reason || 'no reason recorded'}. Resolve the cause, then start it again — its entry gate re-checks everything.`,
        command: startCmd(),
      });
    default: break;
  }

  // Not started: what its entry gate says now.
  const carried = [...wf.slice(0, wf.indexOf(frontier))].reverse()
    .map((id) => state.stages[id].entryGate?.partialScope)
    .find((ps) => ps && ps.proven);
  // eslint-disable-next-line global-require
  const { kindOf } = require('./scopeApproval');
  const scopeItems = carried && carried.items.every((x) => kindOf(x.includes(':') ? x.split(':')[1] : x) === SCOPE_NAMESPACE[frontier]) ? carried.items : undefined;
  const g = checkStageEntry(runsDir, folderName, { stageId: frontier, invocationPath, scopeItems, now });

  if (g.decision === 'proceed') {
    return out('in-progress', {
      action: 'start', stageId: frontier,
      humanDecision: Boolean(scopeItems),
      reason: scopeItems
        ? `Stage ${frontier} can start for the partial scope carried from an earlier stage (${scopeItems.length} item(s)); consuming a partial scope is a named human decision.`
        : `Stage ${frontier}'s entry gate passes. Its Skill may be invoked.`,
      command: startCmd(scopeItems ? ` --scope-items ${scopeItems.join(',')} --by "<name>"` : ''),
      ...(g.warnings.length ? { warnings: g.warnings } : {}),
    });
  }
  if (g.suggestedScope && g.suggestedScope.length) {
    return out('needs-decision', {
      action: 'choose-scope', humanDecision: true, stageId: frontier,
      reason: `Stage ${frontier}'s upstream is only partly approved. ${g.suggestedScope.length} item(s) can be proven independent of everything unresolved; a human decides whether to proceed with them. Pending and stale items are never accepted automatically.`,
      suggestedScope: g.suggestedScope,
      command: startCmd(` --scope-items ${g.suggestedScope.join(',')} --by "<name>"`),
      blockers: g.blockers,
    });
  }
  // Phase 9.2 (F-16): the only thing between an execution stage and its start is the Safety Preflight — a
  // named human confirms environment, target, operations and (browser) mode. Never assumed, never skipped.
  if (g.blockers.length && g.blockers.every((b) => /^SAFETY_PREFLIGHT:/.test(b))) {
    return out('needs-decision', {
      action: 'confirm-preflight', humanDecision: true, stageId: frontier,
      reason: `Stage ${frontier} executes tests: a named human must confirm its Safety Preflight first — the target environment and URL, the intended operations (read-only or mutating), and, for browser execution, Headed or Headless. ${g.blockers[0].replace(/^SAFETY_PREFLIGHT: /, '').split(' — ')[0]}.`,
      command: `${CLI} state preflight ${frontier} --environment <env> --target-url <url> --execution-type <browser|api|database|batch|other> [--execution-mode Headed|Headless] --operations <ops.json> --confirmed-by "<name>"`,
      blockers: g.blockers,
    });
  }
  const degradable = g.gaps.length && g.blockers.length && g.blockers.every((b) => /degraded/.test(b));
  if (degradable) {
    return out('needs-decision', {
      action: 'run-degraded', humanDecision: true, stageId: frontier,
      reason: `Stage ${frontier}'s upstream input is absent: ${g.gaps.join('; ')}. Only a human invoking its Skill directly may run it degraded (pipeline.md §5.3.1 #5).`,
      command: `${CLI} state start ${frontier} --invocation "Direct (degraded)"`,
    });
  }
  return out('blocked', {
    action: 'resolve-blocked', humanDecision: true, stageId: frontier,
    reason: `Stage ${frontier}'s entry gate is blocked.`,
    blockers: g.blockers,
    command: startCmd(),
  });
}

/** Just the next action. */
function nextStep(runsDir, folderName, opts = {}) {
  const p = planWorkflow(runsDir, folderName, opts);
  return { folderName, workflowStatus: p.workflowStatus, next: p.next };
}

/** Workflow completion, test outcome and approval status — reported apart, never merged. */
function workflowStatus(runsDir, folderName, opts = {}) {
  const p = planWorkflow(runsDir, folderName, opts);
  return {
    folderName,
    workflow: p.workflow ? { type: p.workflow.type, stages: p.workflow.stages, selectedBy: p.workflow.selectedBy } : null,
    runStatus: p.runStatus,
    workflowStatus: p.workflowStatus,
    testOutcome: p.testOutcome,
    approvals: p.approvals,
    revalidation: p.revalidation,
    next: p.next,
  };
}

module.exports = {
  VERDICT_ORDER,
  combineVerdicts,
  planWorkflow,
  nextStep,
  workflowStatus,
};
