// Observability — measured values, unavailable values, and every derived formula in one place.
//
// THE 0-vs-UNAVAILABLE DISTINCTION (§60) IS THE POINT OF THIS FILE.
//
//   { value: 0,    available: true  }   measured, and nothing happened
//   { value: null, available: false }   the platform could not observe it
//
// Those are different claims and the platform must never let one degrade into the other. A run that
// reports "Repair Cycles: 0" is asserting the run needed no repairs. A run that reports
// "Repair Cycles: Unavailable" is admitting it does not know. Collapsing the second into the first
// is the single easiest way for a telemetry system to start lying, and it happens by accident —
// `count || 0` is all it takes. Hence a shape that cannot be summed, printed, or charted without
// first answering "is this available?".
//
// NO HIDDEN FORMULAS (§59). Every ratio the platform reports is registered below with its exact
// expression, its numerator and denominator, and what it must NOT be read as. If a number appears in
// the report or the dashboard and is not a direct count, its formula is here.

'use strict';

const { METRIC_PROVENANCE } = require('./schema');

/** A value the platform actually observed. */
function measured(value, provenance = 'emitted') {
  if (!METRIC_PROVENANCE.includes(provenance)) {
    throw new Error(`Unknown metric provenance "${provenance}".`);
  }
  return { value, available: true, provenance };
}

/** A value the platform could not observe, WITH the reason — an unexplained gap is not a measurement. */
function unavailable(reason) {
  if (!reason) throw new Error('unavailable() requires a reason. An unexplained gap is not a measurement.');
  return { value: null, available: false, provenance: 'unavailable', reason };
}

const isAvailable = (m) => Boolean(m && m.available);

/**
 * A ratio, or an honest refusal.
 *
 * A ZERO DENOMINATOR IS NOT ZERO PERCENT. "0 of 0 test cases were accepted" is not a 0% acceptance
 * rate — it is the absence of an acceptance rate, and rendering it as 0% would make a run that
 * designed no test cases look like a run whose every test case was rejected.
 */
function ratio(numerator, denominator, { reason } = {}) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return unavailable(reason || 'One or both operands were not measured.');
  }
  if (denominator === 0) {
    return unavailable(reason || 'Denominator is zero — no ratio exists, which is not the same as a ratio of zero.');
  }
  return measured(numerator / denominator, 'derived');
}

/** Renders a ratio for display. Percentages are rounded for reading, never for storage. */
function formatRatio(m, digits = 0) {
  if (!isAvailable(m)) return 'Unavailable';
  return `${(m.value * 100).toFixed(digits)}%`;
}

/** Renders a duration. `Incomplete` is a first-class outcome, never rendered as a time. */
function formatDuration(m) {
  if (!isAvailable(m)) return 'Unavailable';
  const ms = m.value;
  if (!Number.isFinite(ms) || ms < 0) return 'Unavailable';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${String(min).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  if (min) return `${min}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

/** Renders a count. This is where `0` and `Unavailable` visibly part company. */
function formatCount(m) {
  if (!isAvailable(m)) return 'Unavailable';
  return String(m.value);
}

// ---------------------------------------------------------------------------------------------
// The formula registry (§59)
// ---------------------------------------------------------------------------------------------

/**
 * Every derived metric the platform publishes.
 *
 * `compute` takes the assembled metrics object and returns a measured-or-unavailable value. Keeping
 * the computation beside the stated expression is what stops the two drifting apart — a formula
 * documented in Markdown and implemented in code somewhere else is a formula that will eventually
 * be wrong in one of the two places.
 */
const FORMULAS = [
  {
    id: 'TC_ACCEPTANCE_RATE',
    name: 'Test Case Acceptance Rate',
    expression: 'Review Approved / (Review Approved + Review Rejected)',
    notes: 'Pending is excluded from the denominator: an undecided case is not a rejected one. '
      + 'This is HUMAN ACCEPTANCE, not correctness — a reviewer accepting a case does not make it '
      + 'factually right, and it must never be labelled "AI Accuracy" (§25).',
    compute: (m) => {
      const r = m.testDesign.review;
      if (!isAvailable(r.approved) || !isAvailable(r.rejected)) {
        return unavailable('No test suite evidence was available for this run.');
      }
      return ratio(r.approved.value, r.approved.value + r.rejected.value, {
        reason: 'No test case has been reviewed either way, so no acceptance rate exists yet.',
      });
    },
  },
  {
    id: 'AUTOMATION_APPROVAL_RATE',
    name: 'Automation Approval Rate',
    expression: 'Automation Approved / (Automation Approved + Automation Rejected)',
    notes: 'Independent of Review. A case may be Review Approved and Automation Rejected — that is a '
      + 'decision that it should be executed by hand, not a defect.',
    compute: (m) => {
      const a = m.testDesign.automation;
      if (!isAvailable(a.approved) || !isAvailable(a.rejected)) {
        return unavailable('No test suite evidence was available for this run.');
      }
      return ratio(a.approved.value, a.approved.value + a.rejected.value, {
        reason: 'No automation decision has been taken either way.',
      });
    },
  },
  {
    id: 'TOOL_FAILURE_RATE',
    name: 'Tool Failure Rate',
    expression: 'Failed Tool Calls / (Succeeded Tool Calls + Failed Tool Calls)',
    notes: 'The denominator is CLOSED calls only. A tool call still in flight has no outcome yet, and '
      + 'counting it as a success would make the rate improve simply by observing it sooner.',
    compute: (m) => {
      const t = m.tools.totals;
      if (!isAvailable(t.succeeded) || !isAvailable(t.failed)) {
        return unavailable('No tool telemetry was recorded for this run.');
      }
      return ratio(t.failed.value, t.succeeded.value + t.failed.value, {
        reason: 'No tool call completed, so there is no failure rate.',
      });
    },
  },
  {
    id: 'RETRY_RATE',
    name: 'Retry Rate',
    expression: 'Retries / Tool Calls Started',
    notes: 'Can exceed 1: one tool call may be retried several times. That is a real signal, not an '
      + 'error, and the value is not clamped.',
    compute: (m) => {
      if (!isAvailable(m.tools.totals.retries) || !isAvailable(m.tools.totals.calls)) {
        return unavailable('No tool telemetry was recorded for this run.');
      }
      return ratio(m.tools.totals.retries.value, m.tools.totals.calls.value, {
        reason: 'No tool call was started, so there is no retry rate.',
      });
    },
  },
  {
    id: 'FIRST_PASS_AUTOMATION_SUCCESS',
    name: 'First-Pass Automation Success',
    expression: 'Tests Passed on Attempt 1 / Tests Executed on Attempt 1',
    notes: 'Computed ONLY from evidence recorded at first attempt (§27). It is never reconstructed '
      + 'backwards from final results after repair — a test that failed, was repaired and then '
      + 'passed did not pass first time, and a retrospective reading cannot tell the difference.',
    compute: (m) => {
      const e = m.execution.firstAttempt;
      if (!isAvailable(e.executed) || !isAvailable(e.passed)) {
        return unavailable('No first-attempt execution evidence exists. This cannot be reconstructed '
          + 'from final results after repair (§27).');
      }
      return ratio(e.passed.value, e.executed.value, {
        reason: 'No test was executed on a first attempt.',
      });
    },
  },
  {
    id: 'EXECUTION_PASS_RATE',
    name: 'Execution Pass Rate',
    expression: 'Passed / (Passed + Failed) — Failed is every failure category (application, automation, environment)',
    notes: 'Skipped and Blocked are excluded from BOTH sides. A test blocked by Execution Safety was '
      + 'never run, and counting it as a failure would turn a correctly-governed run into a failing one.',
    compute: (m) => {
      const e = m.execution;
      if (!isAvailable(e.passed) || !isAvailable(e.failed)) {
        return unavailable('No execution telemetry was recorded for this run.');
      }
      return ratio(e.passed.value, e.passed.value + e.failed.value, {
        reason: 'No test produced a pass-or-fail outcome.',
      });
    },
  },
  {
    id: 'VERIFIED_PASS_RATE',
    name: 'Verified Pass Rate',
    expression: 'Passed / Executed — Executed counts every result that ran, including Automation Repaired, Flaky, Inconclusive, Quarantined and Unverified',
    notes: 'Phase 8. Only a canonical Passed counts as a pass: a repaired, flaky or unverified result ran but is not a clean, '
      + 'evidenced pass. Not-run (Blocked, Skipped, Not Executed) and Excluded results are outside the denominator. '
      + 'EXECUTION_PASS_RATE is kept unchanged so earlier metrics keep their meaning.',
    compute: (m) => {
      const e = m.execution;
      if (!isAvailable(e.passed) || !isAvailable(e.executed)) return unavailable('No execution telemetry was recorded for this run.');
      return ratio(e.passed.value, e.executed.value, { reason: 'No test was executed.' });
    },
  },
  {
    id: 'VALIDATION_FAILURE_RATE',
    name: 'Platform Validation Failure Rate',
    expression: 'Validation Failed / (Validation Passed + Validation Failed)',
    notes: 'PLATFORM validation only — schema checks, exporter checks, compiles, repository tests. '
      + 'Application test failures are not validation failures and are counted nowhere near this (§30).',
    compute: (m) => {
      const v = m.validation;
      if (!isAvailable(v.passed) || !isAvailable(v.failed)) {
        return unavailable('No validation telemetry was recorded for this run.');
      }
      return ratio(v.failed.value, v.passed.value + v.failed.value, {
        reason: 'No validation ran.',
      });
    },
  },
  {
    id: 'HUMAN_DECISIONS_PER_STAGE',
    name: 'Human Decisions per Stage',
    expression: 'Human Decisions Requested / Stages Started',
    notes: 'A FACT, NOT A SCORE (§23). More decisions is not worse — several gates exist deliberately, '
      + 'and a run that asked nothing may have asked too little. Never rendered with a good/bad colour.',
    compute: (m) => {
      if (!isAvailable(m.humanDecisions.requested) || !isAvailable(m.stagesStarted)) {
        return unavailable('No stage or decision telemetry was recorded for this run.');
      }
      return ratio(m.humanDecisions.requested.value, m.stagesStarted.value, {
        reason: 'No stage was started.',
      });
    },
  },
  {
    id: 'SAFETY_BLOCK_RATE',
    name: 'Safety Block Rate',
    expression: 'Operations Forbidden / Operations Evaluated at Preflight',
    notes: 'Consumed from Execution Safety evidence, never recomputed. A high rate means the policy is '
      + 'doing its job, not that the run went badly (§44).',
    compute: (m) => {
      const s = m.safety;
      if (!isAvailable(s.forbidden) || !isAvailable(s.operationsEvaluated)) {
        return unavailable('This run has no Execution Safety preflight evidence.');
      }
      return ratio(s.forbidden.value, s.operationsEvaluated.value, {
        reason: 'No operation was evaluated at preflight.',
      });
    },
  },
  {
    id: 'CLEANUP_COMPLETION_RATE',
    name: 'Cleanup Completion Rate',
    expression: 'Cleanup Completed / Cleanup Required',
    notes: 'Anything below 1 means the environment was left changed. Consumed from Safety evidence.',
    compute: (m) => {
      const s = m.safety;
      if (!isAvailable(s.cleanupRequired) || !isAvailable(s.cleanupCompleted)) {
        return unavailable('This run has no Execution Safety cleanup evidence.');
      }
      return ratio(s.cleanupCompleted.value, s.cleanupRequired.value, {
        reason: 'No operation required cleanup.',
      });
    },
  },
  {
    id: 'REPAIR_SUCCESS_RATE',
    name: 'Repair Success Rate',
    expression: 'Repair Successes / Repair Attempts',
    notes: 'Counts repair attempts recorded as events. Root-cause classes are counted only where the '
      + 'healing artifact already classified them — never inferred from failure text (§28).',
    compute: (m) => {
      const r = m.repair;
      if (!isAvailable(r.attempts) || !isAvailable(r.successes)) {
        return unavailable('No repair telemetry was recorded for this run.');
      }
      return ratio(r.successes.value, r.attempts.value, {
        reason: 'No repair was attempted.',
      });
    },
  },
];

/** Runs every registered formula against an assembled metrics object. */
function computeFormulas(metrics) {
  const out = {};
  for (const f of FORMULAS) {
    let result;
    try {
      result = f.compute(metrics);
    } catch (err) {
      result = unavailable(`Formula ${f.id} could not be computed: ${err.message}`);
    }
    out[f.id] = { ...result, name: f.name, expression: f.expression };
  }
  return out;
}

module.exports = {
  measured,
  unavailable,
  isAvailable,
  ratio,
  formatRatio,
  formatDuration,
  formatCount,
  FORMULAS,
  computeFormulas,
};
