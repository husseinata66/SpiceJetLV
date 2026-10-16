// Report Builder — public surface.
//
// One HTML report design for every stage that reports results. A stage supplies a
// report model (JSON); this renders it to a single self-contained HTML file with
// the platform's standard layout: run metadata card, executive summary with the
// pass donut, searchable/filterable test-case tree with request/response and
// evidence, then findings, and any follow-up sections.
//
// The HTML is produced ALONGSIDE the stage's Markdown report, never instead of it.
// Markdown stays the authoritative, diffable artifact; the HTML is the shareable
// view for stakeholders.
//
// See README.md for the model reference.

'use strict';

const model = require('./model');
const render = require('./render');

module.exports = {
  DEFAULT_CATEGORY_ICONS: model.DEFAULT_CATEGORY_ICONS,
  DEFAULT_STATUSES: model.DEFAULT_STATUSES,
  ReportModelError: model.ReportModelError,
  TONES: model.TONES,
  normalizeModel: model.normalizeModel,
  modelFingerprint: model.modelFingerprint,
  renderReport: render.renderReport,
  verifyHtml: render.verifyHtml,
};
