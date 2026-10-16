// Observability — the event vocabulary, and what makes an event valid.
//
// WHAT THIS FILE IS FOR
// Everything downstream (recorder, aggregator, report, CLI) agrees on the shapes defined here and
// nowhere else. An event type that is not in this file cannot be recorded, and a metric cannot be
// derived from an event the schema does not describe.
//
// THREE RULES THIS FILE ENCODES, EACH FROM A HUMAN DECISION
//
//   1. PROVENANCE IS NOT DECORATION (HD-OBS-001).
//      Every event declares whether platform-owned CODE emitted it (`platform-tool`) or whether a
//      Skill emitted it because its specification said to (`skill`). These are different reliability
//      classes and the platform is forbidden from presenting them as one. A tool-emitted
//      TOOL_FAILED is machine-guaranteed: the code that failed wrote it. A skill-emitted
//      STAGE_COMPLETED is spec-compliance evidence: reliable when the spec was followed, absent
//      when it was not. `source` carries that distinction all the way into the report.
//
//   2. AN UNCLOSED SPAN IS NOT A DURATION (HD-OBS-001).
//      Span-opening events are listed separately from span-closing ones precisely so the aggregator
//      can tell "still running / never closed" from "took 0ms". The schema's job is to make that
//      distinction structural; the aggregator's job is to refuse to invent the missing half.
//
//   3. TOKENS AND COST HAVE NO EVENT TYPE (HD-OBS-002).
//      Deliberately. There is no supported source, so there is nothing to record, so recording one
//      would require inventing it. The metrics model carries `aiUsage.available: false` with a
//      reason instead, and stays shaped so a future official source drops in without redesign.
//
// See platform_core/tools/observability/README.md for the model, and pipeline.md §15.

'use strict';

/**
 * Bumped only when the MEANING of existing telemetry changes, never for additive fields.
 * Old events keep their own recorded version; the aggregator refuses evidence it cannot interpret
 * rather than reinterpreting it under newer semantics (§40).
 */
const SCHEMA_VERSION = 1;

class ObservabilityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ObservabilityError';
  }
}

// ---------------------------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------------------------

/**
 * Who emitted an event, and therefore how much it can be trusted.
 *
 * `platform-tool`  Platform-owned code emitted this as a side effect of doing the thing. It cannot
 *                  be forgotten, because the code path that writes it IS the code path that ran.
 * `skill`          A Skill emitted this because its specification instructs it to. Machine-readable
 *                  and timestamped, but its ABSENCE proves nothing — a stage with no
 *                  STAGE_COMPLETED may have finished without recording it.
 */
const EVENT_SOURCES = ['platform-tool', 'skill'];

/**
 * How a reported metric came to exist. Attached to metrics, not events.
 *
 * `emitted`             Counted directly from events in this run's telemetry.
 * `derived`             Computed from emitted events by a registered formula.
 * `historical-derived`  Read from immutable run artifacts, NOT from telemetry. Available for runs
 *                       that predate instrumentation, and never merged into `metrics` (HD-OBS-003).
 * `unavailable`         The platform could not observe it. Distinct from zero (§60).
 */
const METRIC_PROVENANCE = ['emitted', 'derived', 'historical-derived', 'unavailable'];

// ---------------------------------------------------------------------------------------------
// Stages and Skills — the platform's actual vocabulary, not a parallel one
// ---------------------------------------------------------------------------------------------

/** Canonical stage IDs and display names (pipeline.md §3.1, §4). No obsolete `*-agent` naming. */
const STAGES = {
  1: 'Stage 1 — Project Context',
  2: 'Stage 2 — Discovery',
  3: 'Stage 3 — Test Design',
  '4M': 'Stage 4M — Manual Execution',
  '4A': 'Stage 4A — Automation',
  '5A': 'Stage 5A — Automation Execution',
  '5H': 'Stage 5H — Self-Healing',
  '6A': 'Stage 6A — Reporting',
};
const STAGE_IDS = Object.keys(STAGES);

/** The eight installed Skills. A stage is not a skill: §17 forbids assuming a 1:1 mapping. */
const SKILLS = [
  'project-context-skill',
  'explorer-skill',
  'test-design-skill',
  'manual-execution-skill',
  'automation-skill',
  'automation-execution-skill',
  'self-healing-skill',
  'reporting-skill',
];

// ---------------------------------------------------------------------------------------------
// Event vocabulary
// ---------------------------------------------------------------------------------------------

/**
 * The smallest set that answers §86's questions. Every type here earns its place by being consumed
 * by at least one metric in the aggregator — a type nothing reads is noise (§56).
 *
 * Deliberately ABSENT:
 *   VALIDATION_STARTED     the result carries its own duration; the start adds nothing
 *   TEST_CASE_REVIEWED     Review is a field on the test case, derived from the Case Index.
 *                          Emitting it as an event would be a second lifecycle record (§24).
 *   TOKEN_USAGE / COST     no supported source exists (HD-OBS-002)
 */
const EVENT_TYPES = [
  // Spans — RUN > STAGE > SKILL > TOOL (§54)
  'RUN_STARTED', 'RUN_COMPLETED',
  'STAGE_STARTED', 'STAGE_COMPLETED',
  'SKILL_STARTED', 'SKILL_COMPLETED',
  'TOOL_STARTED', 'TOOL_COMPLETED', 'TOOL_FAILED',
  'REPAIR_STARTED', 'REPAIR_COMPLETED',
  // Points
  'VALIDATION_PASSED', 'VALIDATION_FAILED',
  'RETRY_OCCURRED',
  'HUMAN_DECISION_REQUESTED', 'HUMAN_DECISION_RESOLVED',
  'ARTIFACT_CREATED', 'ARTIFACT_UPDATED',
  'TEST_CASES_GENERATED',
  'AUTOMATION_GENERATED', 'AUTOMATION_BUILD_RESULT',
  'TEST_EXECUTION_RESULT',
  'SAFETY_PREFLIGHT_COMPLETED', 'SAFETY_BLOCKED',
];

/**
 * Span pairs. The KEY opens a span; any of the VALUES closes it.
 *
 * TOOL_STARTED closes on either outcome, because a tool that failed still took time and still
 * happened — recording only successes would make the failure rate structurally unmeasurable.
 */
const SPAN_PAIRS = {
  RUN_STARTED: ['RUN_COMPLETED'],
  STAGE_STARTED: ['STAGE_COMPLETED'],
  SKILL_STARTED: ['SKILL_COMPLETED'],
  TOOL_STARTED: ['TOOL_COMPLETED', 'TOOL_FAILED'],
  REPAIR_STARTED: ['REPAIR_COMPLETED'],
};
const SPAN_OPENERS = Object.keys(SPAN_PAIRS);
const SPAN_CLOSERS = [...new Set(Object.values(SPAN_PAIRS).flat())];

/** The parent a span of each kind expects, for the explicit hierarchy §54 requires. */
const SPAN_HIERARCHY = {
  RUN_STARTED: null,
  STAGE_STARTED: 'RUN_STARTED',
  SKILL_STARTED: 'STAGE_STARTED',
  TOOL_STARTED: 'SKILL_STARTED',
  REPAIR_STARTED: 'STAGE_STARTED',
};

/**
 * Human Decision categories (§22). Taken from pipeline.md §5.5 and the gates the platform actually
 * has — NOT inferred from a decision's free text, which §22 explicitly forbids.
 */
const DECISION_CATEGORIES = [
  'Requirement', 'Architecture', 'Safety', 'Review', 'Automation', 'Execution', 'Other',
];
const DECISION_CATEGORY_FALLBACK = 'Other';

/**
 * Test execution outcomes: the canonical model (run_manager/testStatus.js), so telemetry and execution
 * history speak one vocabulary (Phase 8). The original five (Passed, Failed, Skipped, Blocked,
 * Inconclusive) are a subset, so every event already recorded stays valid. `Unrecognized` is never
 * accepted on write — an event must state a real status.
 */
const EXECUTION_STATUSES = Object.keys(require('../run_manager/testStatus').STATUSES).filter((s) => s !== 'Unrecognized'); // eslint-disable-line global-require

/** What a validation was checking. Kept separate from application test outcomes (§30). */
const VALIDATION_KINDS = [
  'schema', 'export-check', 'compile', 'test-compile', 'repository-tests',
  'safety-policy', 'packable', 'other',
];

// ---------------------------------------------------------------------------------------------
// Field whitelist
// ---------------------------------------------------------------------------------------------

/**
 * The only top-level keys an event may carry. Anything else is dropped by the recorder.
 *
 * A whitelist rather than a deny-list, for the same reason the Safety authorization store uses one:
 * a caller cannot smuggle a field past a list of everything that is allowed, but can always find a
 * field that is not on a list of everything that is banned.
 */
const EVENT_FIELDS = [
  'eventId', 'schemaVersion', 'seq', 'timestamp', 'runId', 'type', 'source',
  'stage', 'skill', 'tool', 'spanId', 'parentSpanId',
  'status', 'count', 'attempt', 'cycle', 'decisionId', 'category', 'kind', 'errorType', 'retryable',
  'artifact', 'artifactClass', 'testCaseId', 'module', 'note', 'redactedKeys', 'metadata',
];

/** Artifact classifications (§20), matching the platform's own stage folders. */
const ARTIFACT_CLASSES = [
  'context', 'discovery', 'test-design', 'automation', 'execution', 'healing', 'reporting', 'metadata',
];

// ---------------------------------------------------------------------------------------------
// Secret safety (§43)
// ---------------------------------------------------------------------------------------------

/**
 * Metadata keys whose VALUES are never persisted.
 *
 * The value is replaced with `[redacted]` and the key is listed in the event's `redactedKeys`, so a
 * reviewer can see that something was withheld. Redaction rather than rejection is deliberate:
 * §57 says a telemetry problem must not break the QA operation it is observing, and dropping the
 * whole event would lose the timing fact along with the secret.
 */
const SECRET_KEY_PATTERN = /(pass(word|phrase)?|secret|token|api[-_]?key|apikey|credential|cookie|session[-_]?id|jsessionid|authorization|auth[-_]?header|bearer|card(number)?|cardno|cvv|cvc|pan|pin|private[-_]?key)/i;

const REDACTED = '[redacted]';

/**
 * Recursively redacts secret-keyed values in a metadata object.
 *
 * Only KEYS are matched, never values: a heuristic that scanned values would redact a test case
 * titled "Email Password rejects a value exceeding 15 characters" — a real title in this
 * repository — and telemetry that mangles legitimate QA vocabulary gets turned off.
 *
 * @returns {{value: any, redactedKeys: string[]}}
 */
function redactSecrets(value, pathPrefix = '') {
  const redactedKeys = [];

  function walk(node, prefix) {
    if (node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((v, i) => walk(v, `${prefix}[${i}]`));
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      const here = prefix ? `${prefix}.${k}` : k;
      if (SECRET_KEY_PATTERN.test(k)) {
        // IDEMPOTENT. A key already holding the sentinel has been dealt with, and re-reporting it
        // would make validation reject the recorder's own sanitised output. The surviving KEY is
        // deliberate: it shows a reviewer that something was withheld here, rather than hiding the
        // fact that a secret-shaped field was ever present.
        if (node[k] === REDACTED) { out[k] = REDACTED; continue; }
        out[k] = REDACTED;
        redactedKeys.push(here);
      } else {
        out[k] = walk(v, here);
      }
    }
    return out;
  }

  return { value: walk(value, pathPrefix), redactedKeys };
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * Checks one event against the schema.
 *
 * Returns every problem rather than the first, so `observability validate` can show a whole
 * malformed stream at once instead of one line per run.
 *
 * @param {object} event
 * @returns {{valid: boolean, problems: string[]}}
 */
function validateEvent(event) {
  const problems = [];
  const p = (m) => problems.push(m);

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { valid: false, problems: ['Event is not an object.'] };
  }

  for (const key of Object.keys(event)) {
    if (!EVENT_FIELDS.includes(key)) p(`Unsupported field "${key}". Allowed: ${EVENT_FIELDS.join(', ')}.`);
  }

  if (!event.eventId || typeof event.eventId !== 'string') p('Missing `eventId`.');
  if (event.schemaVersion !== SCHEMA_VERSION) {
    p(`schemaVersion ${JSON.stringify(event.schemaVersion)} is not the supported version ${SCHEMA_VERSION}. `
      + 'Telemetry written under a different schema is not reinterpreted under this one (§40).');
  }
  if (!Number.isInteger(event.seq) || event.seq < 1) p('`seq` must be a positive integer.');
  if (!event.timestamp || !ISO_UTC.test(event.timestamp)) {
    p(`\`timestamp\` must be a UTC ISO-8601 instant (e.g. 2026-08-07T09:00:00.000Z); got ${JSON.stringify(event.timestamp)}.`);
  }
  if (!event.runId || typeof event.runId !== 'string') p('Missing `runId`. Telemetry is always run-scoped.');
  if (!EVENT_TYPES.includes(event.type)) {
    p(`Unknown event type ${JSON.stringify(event.type)}. Known: ${EVENT_TYPES.join(', ')}.`);
  }
  if (!EVENT_SOURCES.includes(event.source)) {
    p(`\`source\` must be one of ${EVENT_SOURCES.join(' | ')} — provenance is required, never assumed (HD-OBS-001).`);
  }

  if (event.stage !== undefined && !STAGE_IDS.includes(String(event.stage))) {
    p(`Unknown stage ${JSON.stringify(event.stage)}. Known: ${STAGE_IDS.join(', ')}.`);
  }
  if (event.skill !== undefined && !SKILLS.includes(event.skill)) {
    p(`Unknown skill ${JSON.stringify(event.skill)}. Known: ${SKILLS.join(', ')}.`);
  }
  if (event.category !== undefined && !DECISION_CATEGORIES.includes(event.category)) {
    p(`Unknown decision category ${JSON.stringify(event.category)}. Known: ${DECISION_CATEGORIES.join(', ')}.`);
  }
  if (event.kind !== undefined && !VALIDATION_KINDS.includes(event.kind)) {
    p(`Unknown validation kind ${JSON.stringify(event.kind)}. Known: ${VALIDATION_KINDS.join(', ')}.`);
  }
  if (event.artifactClass !== undefined && !ARTIFACT_CLASSES.includes(event.artifactClass)) {
    p(`Unknown artifact class ${JSON.stringify(event.artifactClass)}. Known: ${ARTIFACT_CLASSES.join(', ')}.`);
  }
  if (event.count !== undefined && (!Number.isInteger(event.count) || event.count < 0)) {
    p('`count` must be a non-negative integer.');
  }
  // `attempt` is what makes First-Pass Automation Success measurable rather than reconstructed (§27),
  // so it is validated as strictly as the counts it feeds.
  if (event.attempt !== undefined && (!Number.isInteger(event.attempt) || event.attempt < 1)) {
    p('`attempt` must be an integer >= 1. Attempt 1 is the first attempt, and is what First-Pass '
      + 'Automation Success is computed from.');
  }
  if (event.cycle !== undefined && (!Number.isInteger(event.cycle) || event.cycle < 1)) {
    p('`cycle` must be an integer >= 1.');
  }

  if (SPAN_OPENERS.includes(event.type) && !event.spanId) p(`${event.type} opens a span and requires a \`spanId\`.`);
  if (SPAN_CLOSERS.includes(event.type) && !event.spanId) p(`${event.type} closes a span and requires the opening \`spanId\`.`);
  if (event.type === 'HUMAN_DECISION_REQUESTED' && !event.decisionId) p('HUMAN_DECISION_REQUESTED requires a `decisionId`.');
  if (event.type === 'HUMAN_DECISION_RESOLVED' && !event.decisionId) p('HUMAN_DECISION_RESOLVED requires the matching `decisionId`.');
  if (event.type === 'TEST_EXECUTION_RESULT' && !EXECUTION_STATUSES.includes(event.status)) {
    p(`TEST_EXECUTION_RESULT requires a \`status\` from ${EXECUTION_STATUSES.join(' | ')}.`);
  }

  if (event.metadata !== undefined) {
    if (typeof event.metadata !== 'object' || event.metadata === null || Array.isArray(event.metadata)) {
      p('`metadata` must be a plain object.');
    } else {
      // Only UNREDACTED secrets are a problem. `{"password": "[redacted]"}` has already been handled
      // and is the record of a withholding, not a leak.
      const { redactedKeys } = redactSecrets(event.metadata);
      if (redactedKeys.length) {
        p(`Metadata carries secret-shaped keys whose values must never be persisted: ${redactedKeys.join(', ')} (§43).`);
      }
    }
  }

  return { valid: problems.length === 0, problems };
}

/** Throws with every problem listed. Used where an invalid event must not be written at all. */
function assertValidEvent(event) {
  const { valid, problems } = validateEvent(event);
  if (!valid) {
    throw new ObservabilityError(
      `Invalid observability event (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n`
      + problems.map((x) => `  - ${x}`).join('\n'),
    );
  }
  return event;
}

module.exports = {
  SCHEMA_VERSION,
  ObservabilityError,
  EVENT_SOURCES,
  METRIC_PROVENANCE,
  STAGES,
  STAGE_IDS,
  SKILLS,
  EVENT_TYPES,
  SPAN_PAIRS,
  SPAN_OPENERS,
  SPAN_CLOSERS,
  SPAN_HIERARCHY,
  DECISION_CATEGORIES,
  DECISION_CATEGORY_FALLBACK,
  EXECUTION_STATUSES,
  VALIDATION_KINDS,
  EVENT_FIELDS,
  ARTIFACT_CLASSES,
  SECRET_KEY_PATTERN,
  REDACTED,
  redactSecrets,
  validateEvent,
  assertValidEvent,
};
