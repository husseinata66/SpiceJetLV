// Observability — turning events into metrics, deterministically.
//
// THIS FILE IS PURE. It takes evidence in and returns metrics out: no filesystem, no clock, no
// randomness, no network. `sources.js` does the reading; this does the counting. That split is what
// makes §58's guarantee real — the same event set always produces the same metrics, and a test can
// assert exact numbers without staging a filesystem.
//
// NO LLM IS INVOLVED IN ANY NUMBER HERE. Durations, counts, ratios and status totals are arithmetic
// over structured evidence. That is the whole point of the capability: the platform should be able to
// say what happened without a model recalling it.
//
// THREE THINGS THIS DELIBERATELY REFUSES TO DO
//
//   1. It never turns an unclosed span into a duration (HD-OBS-001). A stage that opened and never
//      closed is `Incomplete`, and its duration is `Unavailable`. Reaching for "now minus start"
//      would invent a number whose size depends on when someone happened to run the aggregator.
//
//   2. It never re-evaluates Execution Safety (§44). Safety decisions arrive already made; this
//      counts them. A second evaluator would eventually disagree with the first, and then the
//      platform would have two answers to "was this allowed?".
//
//   3. It never reconstructs first-pass success from final results (§27). Only evidence recorded at
//      `attempt: 1` counts. After a repair, the final state cannot distinguish "passed first time"
//      from "passed eventually", and guessing favours the flattering reading.

'use strict';

const { SCHEMA_VERSION, STAGES, STAGE_IDS, DECISION_CATEGORIES } = require('./schema');
const { measured, unavailable, isAvailable, computeFormulas } = require('./formulas');

const NOT_INSTRUMENTED_REASON =
  'This run has no observability telemetry. Observability applies to runs created after '
  + '2026-08-07 (HD-OBS-003); earlier runs were never instrumented and no events are fabricated for them.';

/** Instrumentation states. Surfaced verbatim in the report and the dashboard banner. */
const INSTRUMENTATION = {
  FULL: 'Fully Instrumented',
  PARTIAL: 'Partially Instrumented',
  NONE: 'Not Instrumented',
  HISTORICAL: 'Historical Derived',
};

const isoMs = (s) => {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
};

/**
 * Pairs span-opening events with their closers.
 *
 * An opener with no closer becomes `Incomplete` and carries NO duration. An orphan closer (a close
 * with no matching open) is reported as a problem rather than silently ignored — it means the stream
 * is missing a line, and a stream missing lines cannot be trusted to be complete elsewhere either.
 */
function resolveSpans(events) {
  const spans = new Map();
  const orphanCloses = [];

  for (const e of events) {
    if (!e.spanId) continue;
    if (e.type.endsWith('_STARTED')) {
      spans.set(e.spanId, {
        spanId: e.spanId,
        parentSpanId: e.parentSpanId || null,
        kind: e.type.replace(/_STARTED$/, ''),
        stage: e.stage !== undefined ? String(e.stage) : null,
        skill: e.skill || null,
        tool: e.tool || null,
        source: e.source,
        startedAt: e.timestamp,
        completedAt: null,
        closeType: null,
        status: null,
        complete: false,
      });
    } else {
      const span = spans.get(e.spanId);
      if (!span) { orphanCloses.push(e); continue; }
      span.completedAt = e.timestamp;
      span.closeType = e.type;
      span.status = e.status || (e.type === 'TOOL_FAILED' ? 'Failed' : 'Completed');
      span.complete = true;
      if (e.errorType) span.errorType = e.errorType;
    }
  }

  for (const span of spans.values()) {
    if (span.complete) {
      const a = isoMs(span.startedAt);
      const b = isoMs(span.completedAt);
      span.durationMs = (a !== null && b !== null && b >= a) ? measured(b - a) : unavailable(
        'The span closed before it opened, or carried an unparseable timestamp. A negative duration '
        + 'is evidence of a clock problem, not a fast stage.',
      );
    } else {
      // The load-bearing refusal. `Incomplete` is a status, not a zero.
      span.durationMs = unavailable(
        'This span was opened but never closed, so no duration was measured. It is reported as '
        + 'Incomplete rather than being given an elapsed-time estimate (HD-OBS-001).',
      );
    }
  }

  return { spans: [...spans.values()], orphanCloses };
}

function countBy(events, predicate) {
  return events.filter(predicate).length;
}

function sumCounts(events, predicate) {
  return events.filter(predicate).reduce((n, e) => n + (Number.isInteger(e.count) ? e.count : 1), 0);
}

/**
 * Derives every metric for one run.
 *
 * @param {object} opts
 * @param {string}  opts.runId
 * @param {object}  [opts.runJson]     the run's metadata/run.json, for identity and declared timing
 * @param {object[]} opts.events       schema-valid events, from readEvents()
 * @param {object[]} [opts.testSuites] [{module, cases:[{Review, Automation, ...}]}] — canonical artifacts
 * @param {object}  [opts.safety]      Execution Safety evidence, consumed never recomputed
 * @param {string}  [opts.environment]
 * @returns {object} the ObservabilityMetrics shape
 */
function aggregate({ runId, runJson = {}, events = [], testSuites = null, safety = null, environment = null } = {}) {
  if (!runId) throw new Error('aggregate requires a `runId`.');

  const instrumented = events.length > 0;
  const { spans, orphanCloses } = resolveSpans(events);
  const problems = orphanCloses.map(
    (e) => `Event ${e.eventId} (${e.type}) closes span "${e.spanId}", which was never opened.`,
  );

  // A helper so every event-derived count collapses to Unavailable in one place when a run carries no
  // telemetry at all. Without this, a non-instrumented run would report a tidy wall of zeroes — the
  // exact failure §75 names.
  const ev = (n) => (instrumented ? measured(n) : unavailable(NOT_INSTRUMENTED_REASON));

  // ---- Run ---------------------------------------------------------------------------------
  const runSpan = spans.find((s) => s.kind === 'RUN');
  const startedTime = runSpan?.startedAt || runJson.startedTime || null;
  const finishedTime = runSpan?.completedAt || runJson.finishedTime || null;

  let runDuration;
  if (runSpan) {
    runDuration = runSpan.durationMs;
  } else if (startedTime && finishedTime) {
    const a = isoMs(startedTime); const b = isoMs(finishedTime);
    runDuration = (a !== null && b !== null && b >= a)
      ? measured(b - a, 'historical-derived')
      : unavailable('run.json carries timestamps that do not form a valid interval.');
  } else if (startedTime) {
    runDuration = unavailable(
      'This run has started but not finished. An in-progress run has an elapsed time, not a '
      + 'duration, and the two are not reported as the same thing (§15).',
    );
  } else {
    runDuration = unavailable(NOT_INSTRUMENTED_REASON);
  }

  // ---- Stages ------------------------------------------------------------------------------
  const stageSpans = spans.filter((s) => s.kind === 'STAGE');
  const stages = {};
  for (const id of STAGE_IDS) {
    const span = stageSpans.find((s) => s.stage === String(id));
    if (!span) continue; // A stage never reached has NO row — absence means "not reached" (RunManifest §2).
    stages[id] = {
      id: String(id),
      name: STAGES[id],
      startedAt: span.startedAt,
      completedAt: span.completedAt,
      durationMs: span.durationMs,
      status: span.complete ? 'Completed' : 'Incomplete',
      source: span.source,
    };
  }

  // ---- Skills ------------------------------------------------------------------------------
  // A stage is not a skill (§17): a stage may invoke several, so these are listed, not merged.
  const skills = spans.filter((s) => s.kind === 'SKILL').map((s) => ({
    skill: s.skill,
    stage: s.stage,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    durationMs: s.durationMs,
    status: s.complete ? 'Completed' : 'Incomplete',
    source: s.source,
  }));

  // ---- Tools -------------------------------------------------------------------------------
  const toolSpans = spans.filter((s) => s.kind === 'TOOL');
  const retries = countBy(events, (e) => e.type === 'RETRY_OCCURRED');
  const timeouts = countBy(events, (e) => e.type === 'TOOL_FAILED' && e.errorType === 'TIMEOUT');

  const byTool = {};
  for (const s of toolSpans) {
    const name = s.tool || 'unknown';
    byTool[name] = byTool[name] || { tool: name, calls: 0, succeeded: 0, failed: 0, incomplete: 0, retries: 0 };
    byTool[name].calls += 1;
    if (s.closeType === 'TOOL_COMPLETED') byTool[name].succeeded += 1;
    else if (s.closeType === 'TOOL_FAILED') byTool[name].failed += 1;
    else byTool[name].incomplete += 1;
  }
  for (const e of events.filter((x) => x.type === 'RETRY_OCCURRED' && x.tool)) {
    byTool[e.tool] = byTool[e.tool] || { tool: e.tool, calls: 0, succeeded: 0, failed: 0, incomplete: 0, retries: 0 };
    byTool[e.tool].retries += 1;
  }

  const tools = {
    totals: {
      calls: ev(toolSpans.length),
      succeeded: ev(toolSpans.filter((s) => s.closeType === 'TOOL_COMPLETED').length),
      failed: ev(toolSpans.filter((s) => s.closeType === 'TOOL_FAILED').length),
      incomplete: ev(toolSpans.filter((s) => !s.complete).length),
      retries: ev(retries),
      timeouts: ev(timeouts),
    },
    // Sorted by name so the same evidence always renders in the same order (§58).
    byTool: Object.values(byTool).sort((a, b) => a.tool.localeCompare(b.tool)),
  };

  // ---- Validation (platform, NOT application tests — §30) ------------------------------------
  const vPassed = events.filter((e) => e.type === 'VALIDATION_PASSED');
  const vFailed = events.filter((e) => e.type === 'VALIDATION_FAILED');
  const byKind = {};
  for (const e of [...vPassed, ...vFailed]) {
    const k = e.kind || 'other';
    byKind[k] = byKind[k] || { kind: k, passed: 0, failed: 0 };
    if (e.type === 'VALIDATION_PASSED') byKind[k].passed += 1; else byKind[k].failed += 1;
  }
  const validation = {
    runs: ev(vPassed.length + vFailed.length),
    passed: ev(vPassed.length),
    failed: ev(vFailed.length),
    byKind: Object.values(byKind).sort((a, b) => a.kind.localeCompare(b.kind)),
  };

  // ---- Human Decisions -----------------------------------------------------------------------
  const requested = events.filter((e) => e.type === 'HUMAN_DECISION_REQUESTED');
  const resolved = events.filter((e) => e.type === 'HUMAN_DECISION_RESOLVED');
  const resolvedIds = new Set(resolved.map((e) => e.decisionId));

  const decisionEntries = requested.map((r) => {
    const res = resolved.find((x) => x.decisionId === r.decisionId) || null;
    const a = isoMs(r.timestamp);
    const b = res ? isoMs(res.timestamp) : null;
    return {
      decisionId: r.decisionId,
      // §22: the category is taken from the event, never inferred from free text. An event that did
      // not declare one is 'Other' — an honest bucket, not a guess at which one it belongs in.
      category: DECISION_CATEGORIES.includes(r.category) ? r.category : 'Other',
      stage: r.stage ? String(r.stage) : null,
      requestedAt: r.timestamp,
      resolvedAt: res ? res.timestamp : null,
      status: res ? 'Resolved' : 'Pending',
      outcome: res ? (res.status || null) : null,
      latencyMs: (a !== null && b !== null && b >= a)
        ? measured(b - a)
        : unavailable('This decision has not been resolved, so it has no latency yet.'),
      note: r.note || null,
    };
  });

  const decisionsByCategory = {};
  for (const c of DECISION_CATEGORIES) {
    const inCat = decisionEntries.filter((d) => d.category === c);
    if (inCat.length) {
      decisionsByCategory[c] = {
        requested: inCat.length,
        resolved: inCat.filter((d) => d.status === 'Resolved').length,
        pending: inCat.filter((d) => d.status === 'Pending').length,
      };
    }
  }

  const humanDecisions = {
    requested: ev(requested.length),
    resolved: ev(resolved.length),
    pending: ev(requested.filter((r) => !resolvedIds.has(r.decisionId)).length),
    byCategory: decisionsByCategory,
    entries: decisionEntries,
    // §23, restated in the data so a consumer cannot miss it.
    interpretation: 'A fact, not a quality score. Some decisions exist deliberately for governance; '
      + 'more of them is not worse.',
  };

  // ---- Test Design (derived from canonical artifacts, per §24) --------------------------------
  const testDesign = buildTestDesign(testSuites, events, ev, instrumented);

  // ---- Automation ------------------------------------------------------------------------------
  const autoBy = (status) => sumCounts(events, (e) => e.type === 'AUTOMATION_GENERATED' && e.status === status);
  const builds = events.filter((e) => e.type === 'AUTOMATION_BUILD_RESULT');
  const automation = {
    eligible: testDesign.automation.approved,
    selected: ev(sumCounts(events, (e) => e.type === 'AUTOMATION_GENERATED' && e.status === 'Selected')),
    generated: ev(autoBy('Generated')),
    reused: ev(autoBy('Reused')),
    modified: ev(autoBy('Modified')),
    compileAttempts: ev(builds.length),
    compilePassed: ev(builds.filter((e) => e.status === 'Passed').length),
    compileFailed: ev(builds.filter((e) => e.status === 'Failed').length),
  };

  // ---- Execution ---------------------------------------------------------------------------------
  // A platform-emitted FINAL event restates a test's disposition across cycles (Phase 8.1); counting it
  // beside the cycle events would count the test twice. Reconciliation reads it; the counts do not.
  const results = events.filter((e) => e.type === 'TEST_EXECUTION_RESULT' && !(e.metadata && e.metadata.resultKind === 'final'));
  const byStatus = (s, list = results) => list.filter((e) => e.status === s).length;
  const firstAttempt = results.filter((e) => e.attempt === 1);

  // `planned` is every test case that got a recorded disposition; `executed` is the subset that
  // actually ran. A test Skipped by Execution Safety was planned and never executed, and collapsing
  // the two would make the denominator of every pass rate quietly wrong.
  // Canonical categories (statusMap.js, Phase 8): a status that is neither "not run" nor "not
  // applicable" was executed. For the original five statuses this is exactly Passed + Failed +
  // Inconclusive, as before.
  // eslint-disable-next-line global-require
  const { categoryOf } = require('../run_manager/testStatus');
  const ranCount = (list) => list.filter((e) => !['not-run', 'not-applicable'].includes(categoryOf(e.status))).length;
  const byCategory = (cat) => results.filter((e) => categoryOf(e.status) === cat).length;
  const statusCounts = {};
  for (const e of results) statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;

  const execution = {
    planned: ev(results.length),
    executed: ev(ranCount(results)),
    passed: ev(byStatus('Passed')),
    // `failed` is every failure, whatever its category. A legacy `Failed` cannot say whether the
    // application or the automation failed, so `failures` reports it as `unclassified`.
    failed: ev(byCategory('app-failure') + byCategory('auto-failure') + byCategory('env-failure')),
    failures: results.length ? {
      application: measured(byStatus('Application Failure')),
      unclassified: measured(byStatus('Failed')),
      automation: measured(byCategory('auto-failure')),
      environment: measured(byCategory('env-failure')),
    } : null,
    // Passed after a repair, or not consistently, is never a clean pass (Phase 8).
    automationRepaired: ev(byStatus('Automation Repaired')),
    flaky: ev(byStatus('Flaky')),
    skipped: ev(byStatus('Skipped')),
    blocked: ev(byStatus('Blocked')),
    inconclusive: ev(byStatus('Inconclusive')),
    unverified: ev(byCategory('unverified')),
    notExecuted: ev(byStatus('Not Executed')),
    excluded: ev(byStatus('Excluded')),
    byStatus: statusCounts,
    // A Safety block is NOT an application or automation failure. It is counted apart so it can never
    // be summed into a failure total (§13 of the Safety spec, §45 here).
    blockedBySafety: ev(sumCounts(events, (e) => e.type === 'SAFETY_BLOCKED')),
    firstAttempt: firstAttempt.length
      ? {
        executed: measured(ranCount(firstAttempt)),
        passed: measured(byStatus('Passed', firstAttempt)),
        failed: measured(firstAttempt.filter((e) => ['app-failure', 'auto-failure', 'env-failure'].includes(categoryOf(e.status))).length),
      }
      : {
        executed: unavailable('No result was recorded at attempt 1. First-pass success is measured '
          + 'only from first-attempt evidence and is never reconstructed from final results (§27).'),
        passed: unavailable('No first-attempt evidence exists.'),
        failed: unavailable('No first-attempt evidence exists.'),
      },
    byTest: results.map((e) => ({
      testCaseId: e.testCaseId || null,
      status: e.status,
      attempt: Number.isInteger(e.attempt) ? e.attempt : null,
      cycle: Number.isInteger(e.cycle) ? e.cycle : null,
      classification: e.errorType || null,
      durationMs: e.metadata && Number.isFinite(e.metadata.durationMs) ? e.metadata.durationMs : null,
    })),
  };

  // ---- Repair / rework ----------------------------------------------------------------------------
  const repairSpans = spans.filter((s) => s.kind === 'REPAIR');
  const repair = {
    cycles: ev(repairSpans.length),
    attempts: ev(repairSpans.length),
    successes: ev(repairSpans.filter((s) => s.status === 'Passed' || s.status === 'Succeeded').length),
    testsRepaired: ev(sumCounts(events, (e) => e.type === 'REPAIR_COMPLETED' && (e.status === 'Passed' || e.status === 'Succeeded'))),
    remainingFailures: ev(byCategory('app-failure') + byCategory('auto-failure') + byCategory('env-failure')),
    // §29: explicit counters, never a vague reworkScore.
    rework: {
      artifactsUpdatedAfterCreation: ev(countBy(events, (e) => e.type === 'ARTIFACT_UPDATED')),
      validationFailures: validation.failed,
      repairCycles: ev(repairSpans.length),
      humanCorrections: unavailable(
        'The platform cannot attribute an edit to a human. A git diff proves a change, not its '
        + 'author (§61), and inferring authorship would make the metric confidently wrong.',
      ),
    },
  };

  // ---- Execution Safety (consumed, never re-evaluated — §44) ----------------------------------
  const safetyEvidence = buildSafety(safety, events, instrumented);

  // ---- AI usage (HD-OBS-002) ---------------------------------------------------------------------
  const aiUsage = {
    available: false,
    source: null,
    reason: 'No supported run-attributable provider usage source. The platform carries zero runtime '
      + 'dependencies and no provider SDK, and its tools run as child processes with no model '
      + 'context. Claude Code session transcripts are deliberately not read: they are session-scoped '
      + 'rather than run-scoped, and are not an official stable contract (HD-OBS-002).',
    tokens: {
      input: unavailable('No supported token source.'),
      output: unavailable('No supported token source.'),
      total: unavailable('No supported token source.'),
      cached: unavailable('No supported token source.'),
    },
    cost: {
      total: unavailable('No authoritative pricing source. Cost is never computed from hardcoded prices.'),
      currency: null,
      pricingSource: null,
    },
    provider: unavailable('Not exposed to platform code.'),
    model: unavailable('Not exposed to platform code.'),
  };

  // ---- Instrumentation status ----------------------------------------------------------------------
  const unclosedSpans = spans.filter((s) => !s.complete).map((s) => ({
    spanId: s.spanId, kind: s.kind, stage: s.stage, skill: s.skill, tool: s.tool, startedAt: s.startedAt,
  }));

  const instrumentationReasons = [];
  let status;
  if (!instrumented) {
    status = INSTRUMENTATION.NONE;
    instrumentationReasons.push(NOT_INSTRUMENTED_REASON);
  } else {
    const missingRunClose = !runSpan || !runSpan.complete;
    if (unclosedSpans.length) {
      instrumentationReasons.push(
        `${unclosedSpans.length} span${unclosedSpans.length === 1 ? ' was' : 's were'} opened and never `
        + 'closed. Their durations are Unavailable, not zero.',
      );
    }
    if (!runSpan) instrumentationReasons.push('No RUN_STARTED event — run-level timing is not measured.');
    else if (missingRunClose) instrumentationReasons.push('The run span is still open; the run has not been recorded as complete.');
    if (problems.length) instrumentationReasons.push(`${problems.length} structural problem(s) in the event stream.`);
    status = (unclosedSpans.length || missingRunClose || problems.length)
      ? INSTRUMENTATION.PARTIAL
      : INSTRUMENTATION.FULL;
  }

  const bySource = {
    'platform-tool': events.filter((e) => e.source === 'platform-tool').length,
    skill: events.filter((e) => e.source === 'skill').length,
  };

  const base = {
    schemaVersion: SCHEMA_VERSION,
    runId,
    instrumentation: {
      status,
      reasons: instrumentationReasons,
      eventCount: events.length,
      // HD-OBS-001, made visible in the data: these are two reliability classes, reported apart.
      bySource,
      provenanceNote: 'platform-tool events are emitted by platform code as a side effect of the work '
        + 'itself and cannot be forgotten. skill events are emitted because a Skill specification '
        + 'requires it; their presence is reliable, their ABSENCE proves nothing. The two are not the '
        + 'same reliability class and are never presented as one.',
      unclosedSpans,
    },
    run: {
      runId,
      folderName: runJson.folderName || runId,
      scope: runJson.scope || null,
      target: runJson.target || null,
      workflow: runJson.workflow || null,
      environment: environment || null,
      status: runJson.status || null,
      startedTime,
      finishedTime,
      durationMs: runDuration,
    },
    stagesStarted: ev(stageSpans.length),
    stages,
    skills,
    tools,
    validation,
    humanDecisions,
    testDesign,
    automation,
    execution,
    repair,
    safety: safetyEvidence,
    aiUsage,
    integrity: {
      ok: problems.length === 0,
      problems,
      foreignEventsRejected: 0,
    },
  };

  base.formulas = computeFormulas(base);
  return base;
}

/**
 * Test Design metrics.
 *
 * Review and Automation come from the CANONICAL Case Index in the module's test suite, parsed by the
 * existing `test_suite_export` parser — not from events. There is no reason to emit a second copy of
 * a decision the artifact already holds, and §24 explicitly forbids introducing another lifecycle
 * record. The event stream contributes only the count generated during THIS run.
 */
function buildTestDesign(testSuites, events, ev, instrumented) {
  const generatedThisRun = instrumented
    ? measured(events.filter((e) => e.type === 'TEST_CASES_GENERATED')
      .reduce((n, e) => n + (Number.isInteger(e.count) ? e.count : 0), 0))
    : unavailable(NOT_INSTRUMENTED_REASON);

  if (!testSuites || !testSuites.length) {
    const none = unavailable(
      'No test suite artifact was read for this run. Review and Automation totals are derived from '
      + 'the module Case Index, so without it they are unknown rather than zero.',
    );
    return {
      totalCases: none,
      generatedThisRun,
      provenanceNote: 'No test suite artifact was read.',
      review: { approved: none, rejected: none, pending: none },
      automation: { approved: none, rejected: none, pending: none },
      contradictions: none,
      modules: [],
    };
  }

  const tally = { Approved: 0, Rejected: 0, Pending: 0 };
  const review = { ...tally };
  const automation = { ...tally };
  let total = 0;
  let contradictions = 0;
  const modules = [];

  for (const suite of testSuites) {
    const cases = suite.cases || [];
    const m = { module: suite.module, cases: cases.length, review: { ...tally }, automation: { ...tally } };
    for (const c of cases) {
      total += 1;
      // `review` / `automation`, lowercase — the keys `test_suite_export/parseTestCases.js` emits.
      // Both default to Pending there, so an absent decision arrives as Pending rather than as blank.
      const r = c.review || 'Pending';
      const a = c.automation || 'Pending';
      if (review[r] !== undefined) { review[r] += 1; m.review[r] += 1; }
      if (automation[a] !== undefined) { automation[a] += 1; m.automation[a] += 1; }
      // Surfaced as a count only. Resolving a contradiction is a governance decision and is not
      // observability's to make — this reports that one exists.
      if (r === 'Rejected' && a === 'Approved') contradictions += 1;
    }
    modules.push(m);
  }

  // PROVENANCE DEPENDS ON WHETHER THIS RUN WAS INSTRUMENTED.
  //
  // The Case Index is the module's CURRENT state, and later runs keep editing it. For an
  // instrumented run those totals are contemporaneous enough to call `derived`. For a run that
  // predates instrumentation they are not evidence of what the decisions were WHEN IT EXECUTED —
  // they are today's values, read today — so they are labelled `historical-derived` and carry the
  // caveat with them. Reporting run-003's "134 test cases" as though that run measured it would be
  // precisely the mixing HD-OBS-003 forbids.
  const d = (n) => measured(n, instrumented ? 'derived' : 'historical-derived');
  return {
    totalCases: d(total),
    generatedThisRun,
    provenanceNote: instrumented
      ? 'Derived from the module Case Index, which is the canonical record of these decisions.'
      : 'This run is Not Instrumented. These are the module Case Index\'s CURRENT values, read now — '
        + 'not evidence of what the decisions were when this run executed. Later runs continue to '
        + 'edit that artifact.',
    review: { approved: d(review.Approved), rejected: d(review.Rejected), pending: d(review.Pending) },
    automation: { approved: d(automation.Approved), rejected: d(automation.Rejected), pending: d(automation.Pending) },
    contradictions: d(contradictions),
    modules: modules.sort((a, b) => String(a.module).localeCompare(String(b.module))),
  };
}

/**
 * Execution Safety metrics.
 *
 * Every number here is READ from Safety evidence. Nothing is re-decided, re-evaluated or
 * reinterpreted: if the preflight said an operation was Forbidden, this counts a Forbidden. A second
 * opinion about a Safety decision is exactly what §44 forbids.
 */
function buildSafety(safety, events, instrumented) {
  const blocksFromEvents = events.filter((e) => e.type === 'SAFETY_BLOCKED');

  if (!safety || !safety.preflight) {
    const none = unavailable(
      'This run has no Execution Safety preflight evidence. Safety metrics are read from the run\'s '
      + 'own SafetyPreflight/SafetyAuthorizations records and are never recomputed here (§44).',
    );
    return {
      preflightCompleted: instrumented
        ? measured(events.some((e) => e.type === 'SAFETY_PREFLIGHT_COMPLETED'))
        : unavailable(NOT_INSTRUMENTED_REASON),
      operationsEvaluated: none,
      allowed: none,
      approvalRequired: none,
      preAuthorized: none,
      forbidden: none,
      blocks: instrumented ? measured(blocksFromEvents.length) : none,
      cleanupRequired: none,
      cleanupCompleted: none,
      policyId: null,
      policyVersion: null,
      policyHash: null,
      environment: null,
      authorizations: [],
    };
  }

  const t = safety.preflight.totals || {};
  const c = (v, reason) => (Number.isFinite(v) ? measured(v, 'derived') : unavailable(reason));

  return {
    preflightCompleted: measured(true, 'derived'),
    operationsEvaluated: c(t.operations, 'The preflight record carries no operation total.'),
    allowed: c(t.allowed, 'The preflight record carries no allowed total.'),
    approvalRequired: c(t.approvalRequired, 'The preflight record carries no approval-required total.'),
    preAuthorized: c(t.preAuthorized, 'The preflight record carries no pre-authorized total.'),
    forbidden: c(t.forbidden, 'The preflight record carries no forbidden total.'),
    blocks: measured(Number.isFinite(t.forbidden) ? t.forbidden : blocksFromEvents.length, 'derived'),
    cleanupRequired: c(t.cleanupRequired, 'The preflight record carries no cleanup-required total.'),
    cleanupCompleted: Number.isFinite(safety.cleanupCompleted)
      ? measured(safety.cleanupCompleted, 'derived')
      : unavailable('Cleanup completion is recorded by the executing stage and was not reported for this run.'),
    policyId: safety.preflight.policyId || null,
    policyVersion: safety.preflight.policyVersion ?? null,
    policyHash: safety.policyHash || null,
    environment: safety.preflight.environment || null,
    // Identities and scopes only. An authorization record never carried a secret and none is added here.
    authorizations: (safety.authorizations || []).map((a) => ({
      authorizationId: a.authorizationId,
      action: a.action,
      ownership: a.ownership,
      module: a.module || null,
      approvedBy: a.approvedBy || null,
      approvedAt: a.approvedAt || null,
      revoked: a.revoked === true,
    })),
  };
}

module.exports = {
  INSTRUMENTATION,
  NOT_INSTRUMENTED_REASON,
  resolveSpans,
  aggregate,
  buildTestDesign,
  buildSafety,
  isAvailable,
};
