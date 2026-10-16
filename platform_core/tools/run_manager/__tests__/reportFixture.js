// Test helper — a Final QA Report that passes the 6A completion gate (Phase 5.6A): the Markdown, its
// .report.json model and the .html rendered from that model, all agreeing with the run's recorded
// outcome. Not a test file itself (no `.test.js`), so the runner never executes it.
const fs = require('fs');
const path = require('path');

const { renderReport } = require('../../report_builder/render');
const { authoritativeOutcome } = require('../reportIntegrity');

const keyOf = (status) => status.toUpperCase().replace(/[^A-Z]+/g, '_');

/**
 * Writes `mdAbs` and its two siblings. With no recorded outcome the model carries no counts (a report
 * with nothing to verify); otherwise the counts and verdict are exactly the recorded ones.
 * @param {{heading?: string, counts?: object, verdict?: string|null}} [override] write a report that disagrees
 * @returns {string} the Markdown path, as given
 */
function writeVerifiedReport(runsDir, folderName, mdAbs, override = {}) {
  const meta = JSON.parse(fs.readFileSync(path.join(runsDir, folderName, 'metadata', 'run.json'), 'utf8'));
  const found = authoritativeOutcome(meta);
  const counts = Object.entries(override.counts || (found ? found.outcome.counts : {})).filter(([, v]) => v > 0);
  const verdict = 'verdict' in override ? override.verdict : (found ? found.outcome.verdict : null);
  const model = {
    title: 'Final QA Report',
    statusPill: 'COMPLETE',
    statusPillTone: 'neutral',
    ...(verdict ? { outcomeVerdict: verdict } : {}),
    ...(counts.length
      ? {
        statuses: counts.map(([s]) => ({ key: keyOf(s), label: s, tone: s === 'Passed' ? 'pass' : 'warning' })),
        summary: { counts: counts.map(([s, v]) => ({ status: keyOf(s), value: v })) },
      }
      : { summary: null }),
  };
  const base = mdAbs.replace(/\.md$/, '');
  fs.mkdirSync(path.dirname(mdAbs), { recursive: true });
  fs.writeFileSync(`${base}.report.json`, JSON.stringify(model, null, 2));
  fs.writeFileSync(`${base}.html`, renderReport(model));
  const table = counts.length ? `\n| Status | Count |\n|---|---|\n${counts.map(([s, v]) => `| ${s} | ${v} |`).join('\n')}\n` : '';
  fs.writeFileSync(mdAbs, `${override.heading || '# Final QA Report'}\n${table}`);
  return mdAbs;
}

module.exports = { writeVerifiedReport };
