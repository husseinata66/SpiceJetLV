// Unified test status model — one meaning per status, across 4M, 5A, 5H and 6A.
//
// WHY THIS EXISTS
// Before this, the vocabularies disagreed: manual-execution-skill §8 used 7 values, automation-
// execution-skill §17 used 12, pipeline.md §17.5 named PASS/FAIL/BLOCKED and PASSED/ERROR/SKIPPED, and
// observability accepted five. A reader adding them up could not tell "the application is broken" from
// "the test script is broken" from "the supplier cannot do this" — the distinction that matters most.
//
// THE RULES
//   - Every status keeps ONE meaning and one CATEGORY (below). Categories decide which health figure a
//     result counts against; they never rename the result.
//   - A recorded status is never converted into another. Exact synonyms of the same meaning
//     (PASS / PASSED → Passed, FAIL → Failed) are read as that status, and the raw text is kept.
//     Anything not recognized is `Unrecognized` — counted as not passing, never as Passed.
//   - A status may carry a reason after a dash ("Excluded — Not supported by supplier",
//     "Blocked — depends on TC-012"); the reason is kept and the status is the leading word(s).

/**
 * Canonical statuses. `category` decides where a result is counted:
 *   pass            the expected behaviour was observed and evidenced
 *   pass-unstable   passed, but not consistently (Flaky)
 *   pass-repaired   passed only after the automation was repaired (never a clean pass)
 *   app-failure     the application did not behave as specified — a defect
 *   auto-failure    the automation itself is wrong (locator, wait, script)
 *   env-failure     the environment, infrastructure or configuration failed — nothing about the app
 *   not-run         not executed for a stated reason (prerequisite, dependency, safety, policy)
 *   not-applicable  outside executable scope (unsupported capability, not approved) — kept out of the
 *                   denominator, always reported
 *   unverified      a result exists but cannot be trusted as a pass (no evidence, inconclusive,
 *                   quarantined, unrecognized)
 */
const STATUSES = Object.freeze({
  Passed: { category: 'pass', meaning: 'Executed; the expected result was observed and is evidenced.' },
  Flaky: { category: 'pass-unstable', meaning: 'Executed; the outcome was not consistent across attempts.' },
  'Automation Repaired': { category: 'pass-repaired', meaning: 'Failed for an automation cause, repaired by Stage 5H, and passed in a rerun. Never a clean pass.' },
  Failed: { category: 'app-failure', meaning: 'Executed; the observed result differs from the expected result (an application defect unless classified otherwise).' },
  'Application Failure': { category: 'app-failure', meaning: 'The application behaved incorrectly — a real defect.' },
  'Automation Failure': { category: 'auto-failure', meaning: 'The test automation is wrong (locator, timing, script) — not an application defect.' },
  'Environment Failure': { category: 'env-failure', meaning: 'The target environment\'s state or data prevented a valid result.' },
  'Infrastructure Failure': { category: 'env-failure', meaning: 'The infrastructure (grid, browser, network) failed.' },
  'Configuration Failure': { category: 'env-failure', meaning: 'Execution configuration was wrong (URL, credential, mode).' },
  Blocked: { category: 'not-run', meaning: 'Not executed because a prerequisite or another test it depends on did not hold. Never a failure of this test.' },
  Skipped: { category: 'not-run', meaning: 'Deliberately not executed (e.g. an execution-safety policy block), with the reason.' },
  'Not Executed': { category: 'not-run', meaning: 'In scope but not reached (run stopped, time ran out).' },
  Excluded: { category: 'not-applicable', meaning: 'Outside executable scope — unsupported capability, or not approved at Review. Reported, never in the pass-rate denominator.' },
  Inconclusive: { category: 'unverified', meaning: 'Executed, but the evidence does not decide the outcome.' },
  Quarantined: { category: 'unverified', meaning: 'Repeatedly failing after repair; held out by Stage 5H. Coverage that is not currently verified.' },
  Unverified: { category: 'unverified', meaning: 'Recorded as Passed, but no evidence was cited for it — not counted as a pass.' },
  Unrecognized: { category: 'unverified', meaning: 'The recorded status is not one this platform defines — kept as written, never counted as a pass.' },
});
const STATUS_NAMES = Object.freeze(Object.keys(STATUSES));

/** Exact synonyms only — same meaning, different spelling. */
const SYNONYMS = Object.freeze({
  pass: 'Passed', passed: 'Passed', ok: 'Passed',
  fail: 'Failed', failed: 'Failed', failure: 'Failed',
  blocked: 'Blocked', skipped: 'Skipped', skip: 'Skipped',
  'not run': 'Not Executed', 'not executed': 'Not Executed',
  excluded: 'Excluded', inconclusive: 'Inconclusive', flaky: 'Flaky', quarantined: 'Quarantined',
});

const clean = (s) => String(s ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/[*`_]/g, '').trim();

/**
 * Reads one recorded status. Longest canonical name first, so "Application Failure" is never read as
 * a bare "Failure". The text after the status (after a dash, colon or parenthesis) is the reason.
 * @returns {{status: string, raw: string, reason: string|null, recognized: boolean}}
 */
function normalizeStatus(raw) {
  const text = clean(raw);
  const lower = text.toLowerCase();
  const names = [...STATUS_NAMES].filter((n) => n !== 'Unrecognized' && n !== 'Unverified').sort((a, b) => b.length - a.length);
  const reasonAfter = (len) => {
    const rest = text.slice(len).replace(/^[\s—–\-:(]+/, '').replace(/\)\s*$/, '').trim();
    return rest || null;
  };
  for (const n of names) {
    if (lower === n.toLowerCase() || lower.startsWith(`${n.toLowerCase()} `) || lower.startsWith(`${n.toLowerCase()}—`) || lower.startsWith(`${n.toLowerCase()}:`) || lower.startsWith(`${n.toLowerCase()}(`)) {
      return { status: n, raw: text, reason: reasonAfter(n.length), recognized: true };
    }
  }
  const word = lower.split(/[\s—–:(]/)[0];
  for (const [syn, status] of Object.entries(SYNONYMS).sort((a, b) => b[0].length - a[0].length)) {
    if (lower === syn || lower.startsWith(`${syn} `)) return { status, raw: text, reason: reasonAfter(syn.length), recognized: true };
  }
  if (SYNONYMS[word]) return { status: SYNONYMS[word], raw: text, reason: reasonAfter(word.length), recognized: true };
  return { status: 'Unrecognized', raw: text, reason: null, recognized: false };
}

/** Test case IDs a reason cites as what a result depended on ("blocked by TC-012", "depends on TC-3"). */
function dependenciesIn(reason) {
  const out = [];
  for (const m of String(reason || '').matchAll(/(?:blocked by|depends on|dependent on|prerequisite|requires|because of|after)\s+([^.;]*)/gi)) {
    for (const id of m[1].matchAll(/\bTC-[A-Z0-9-]*\d\b/g)) out.push(id[0]);
  }
  return [...new Set(out)];
}

/**
 * The three health figures, reported apart (automation-execution-skill §25.2), plus coverage:
 *   application — real defects, out of results that actually executed
 *   automation  — automation defects, out of results that actually executed
 *   environment — environment / infrastructure / configuration failures
 *   coverage    — executed out of executable scope (everything except not-applicable)
 * @param {Record<string, number>} counts
 */
function health(counts) {
  const by = (cat) => Object.entries(counts).filter(([s]) => STATUSES[s]?.category === cat).reduce((n, [, v]) => n + v, 0);
  const total = Object.values(counts).reduce((n, v) => n + v, 0);
  const notApplicable = by('not-applicable');
  const notRun = by('not-run');
  const executable = total - notApplicable;
  const executed = executable - notRun;
  return {
    application: { failures: by('app-failure'), executed },
    automation: { failures: by('auto-failure'), repaired: by('pass-repaired'), executed },
    environment: { failures: by('env-failure'), executed },
    coverage: { executed, executable, notRun, notApplicable, unverified: by('unverified') },
  };
}

module.exports = {
  STATUSES,
  STATUS_NAMES,
  normalizeStatus,
  dependenciesIn,
  health,
  categoryOf: (status) => STATUSES[status]?.category ?? 'unverified',
};
