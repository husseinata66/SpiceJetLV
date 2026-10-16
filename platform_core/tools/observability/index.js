// Observability — public surface.
//
//   Facts → Telemetry → Deterministic Metrics → Transparent Reporting
//
// Nothing in this tool decides anything. It does not authorize an operation, accept a test case,
// select a test for automation, route a pipeline, or change a result. It observes, counts, and
// reports — and where it cannot observe, it says so rather than filling the gap.
//
// See README.md for the model, and pipeline.md §15.

'use strict';

const schema = require('./schema');
const recorder = require('./recorder');
const formulas = require('./formulas');
const aggregator = require('./aggregator');
const sources = require('./sources');
const historical = require('./historical');
const report = require('./report');
const dashboard = require('./dashboard');

module.exports = {
  // Vocabulary and validation
  SCHEMA_VERSION: schema.SCHEMA_VERSION,
  ObservabilityError: schema.ObservabilityError,
  EVENT_TYPES: schema.EVENT_TYPES,
  EVENT_SOURCES: schema.EVENT_SOURCES,
  METRIC_PROVENANCE: schema.METRIC_PROVENANCE,
  SPAN_PAIRS: schema.SPAN_PAIRS,
  SPAN_OPENERS: schema.SPAN_OPENERS,
  SPAN_CLOSERS: schema.SPAN_CLOSERS,
  SPAN_HIERARCHY: schema.SPAN_HIERARCHY,
  STAGES: schema.STAGES,
  STAGE_IDS: schema.STAGE_IDS,
  SKILLS: schema.SKILLS,
  DECISION_CATEGORIES: schema.DECISION_CATEGORIES,
  EXECUTION_STATUSES: schema.EXECUTION_STATUSES,
  VALIDATION_KINDS: schema.VALIDATION_KINDS,
  ARTIFACT_CLASSES: schema.ARTIFACT_CLASSES,
  EVENT_FIELDS: schema.EVENT_FIELDS,
  redactSecrets: schema.redactSecrets,
  validateEvent: schema.validateEvent,
  assertValidEvent: schema.assertValidEvent,

  // Recording
  OBSERVABILITY_DIRNAME: recorder.OBSERVABILITY_DIRNAME,
  EVENTS_FILENAME: recorder.EVENTS_FILENAME,
  METRICS_FILENAME: recorder.METRICS_FILENAME,
  REPORT_FILENAME: recorder.REPORT_FILENAME,
  DASHBOARD_FILENAME: recorder.DASHBOARD_FILENAME,
  observabilityDir: recorder.observabilityDir,
  eventsPath: recorder.eventsPath,
  metricsPath: recorder.metricsPath,
  reportPath: recorder.reportPath,
  dashboardPath: recorder.dashboardPath,
  makeEventId: recorder.makeEventId,
  makeSpanId: recorder.makeSpanId,
  recordEvent: recorder.recordEvent,
  appendEvents: recorder.appendEvents,
  startSpan: recorder.startSpan,
  endSpan: recorder.endSpan,
  readEvents: recorder.readEvents,

  // Measurement
  measured: formulas.measured,
  unavailable: formulas.unavailable,
  isAvailable: formulas.isAvailable,
  ratio: formulas.ratio,
  formatDuration: formulas.formatDuration,
  formatRatio: formulas.formatRatio,
  formatCount: formulas.formatCount,
  FORMULAS: formulas.FORMULAS,
  computeFormulas: formulas.computeFormulas,

  // Aggregation
  INSTRUMENTATION: aggregator.INSTRUMENTATION,
  NOT_INSTRUMENTED_REASON: aggregator.NOT_INSTRUMENTED_REASON,
  aggregate: aggregator.aggregate,
  resolveSpans: aggregator.resolveSpans,

  // Evidence loading
  loadRunJson: sources.loadRunJson,
  loadTestSuites: sources.loadTestSuites,
  loadSafetyEvidence: sources.loadSafetyEvidence,
  listRuns: sources.listRuns,

  // Historical
  deriveHistorical: historical.deriveHistorical,
  readSurefire: historical.readSurefire,

  // Presentation
  renderReport: report.renderReport,
  renderDashboard: dashboard.renderDashboard,

  // Run Health (Phase 8) — the authoritative sources, read side by side
  ...require('./statusMap'),
  buildRunHealth: require('./runHealth').buildRunHealth,
  HEALTH_DEFINITIONS: require('./runHealth').HEALTH_DEFINITIONS,
  writeRunHealth: require('./runHealthReport').writeRunHealth,
  checkRunHealth: require('./runHealthReport').checkRunHealth,
};
