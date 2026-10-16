// Parses a Stage 3 `TestCases_{Module}.md` suite into structured test case records.
//
// WHY A PARSER AND NOT TWO AUTHORED FORMATS:
// test-design-skill/SKILL.md §9 requires the Markdown and Excel suites to be "two renderings of one
// test case set — they must never diverge in content." The only way to actually guarantee that is to
// derive one from the other. The Markdown file is the authored artifact; this parser reads it, and
// the workbook is generated output. Authoring both by hand makes divergence a matter of discipline
// rather than construction, and Stage 4 then executes against whichever one the tester happened to
// open.
//
// The parser is intentionally strict about STRUCTURE and permissive about PROSE. It reports what it
// could not parse (see `warnings`) rather than silently emitting a row with empty cells — a test case
// that reaches Stage 4 with a blank Expected Result is unexecutable, and a silent blank is much worse
// than a build-time complaint.

'use strict';

const { parseSharedDefinitions, linkCases } = require('./sharedDefinitions');

/**
 * The Manual Test Suite field list, in §6.1's mandated order ("exactly these fields, in this order —
 * no more"). This array is the single ordering authority for both the workbook columns and the
 * per-case field extraction, so the two cannot fall out of step.
 */
const FIELDS = [
  { key: 'id', label: 'Test Case ID', width: 14 },
  { key: 'title', label: 'Title', width: 40 },
  { key: 'objective', label: 'Objective', width: 45 },
  { key: 'preconditions', label: 'Preconditions', width: 30 },
  { key: 'testData', label: 'Test Data', width: 30 },
  { key: 'steps', label: 'Steps', width: 60 },
  { key: 'expectedResult', label: 'Expected Result', width: 50 },
  { key: 'priority', label: 'Priority', width: 8 },
  { key: 'tags', label: 'Tags', width: 25 },
  { key: 'notes', label: 'Notes', width: 35 },
  // ── Lifecycle columns (added 2026-08-01, user-mandated) ────────────────────────────────────
  // Appended, never interleaved: they record decisions made AFTER the case is written, so they
  // belong at the end of the row. Everything above is unchanged — this is an additive evolution
  // of the contract, not a replacement.
  { key: 'review', label: 'Review', width: 12 },
  { key: 'automation', label: 'Automation', width: 12 },
  // ── Supplier gating columns (added 2026-09-27, user-mandated) ──────────────────────────────
  // Appended after the lifecycle pair so no existing column moves. `Requires` names the Supplier
  // capabilities a case cannot run without (`None`, or e.g. `Seat`, `Hold + Pay after Hold`,
  // `Not Hold`); `Supplier Rule` names a Supplier-specific rule the case tests. Both are read by
  // platform_core/tools/capability_gate, which excludes a case the Supplier cannot support.
  { key: 'requires', label: 'Requires', width: 22 },
  { key: 'supplierRule', label: 'Supplier Rule', width: 20 },
  // ── Structured assertions (added 2026-10-09, Phase 5.8) ─────────────────────────────────────
  // Appended last, so no existing column moves. The case's `**Assertions:**` table — one row per
  // assertion its Expected Result makes (Assertion ID · Expected · Expected Source · Check ·
  // Requirement) — kept as written, table lines and all. Required for a new or materially updated
  // case (run_manager assertionContract.js); a legacy case without it stays valid. Without this entry
  // the table would be appended to whichever field was open before it — usually Expected Result.
  { key: 'assertions', label: 'Assertions', width: 60 },
];

/** Fields whose absence makes a case unexecutable at Stage 4, so it is reported, never inferred. */
const REQUIRED_FIELDS = ['title', 'objective', 'steps', 'expectedResult', 'priority', 'tags'];

/**
 * The two lifecycle columns and their shared value set (added 2026-08-01, user-mandated).
 *
 * `Review`     — the human review status of the case after Stage 3.
 * `Automation` — whether the approved case should be automated.
 *
 * Both default to `Pending`, and the default is applied at export rather than demanded of the
 * author. That is deliberate: `Pending` means "no decision has been made yet", which is exactly what
 * an absent field already says, so treating absence as a missing-field warning would fire on every
 * suite authored before this contract existed while telling a reader nothing new. An unrecognised
 * VALUE is a different matter — it means someone typed a decision the lifecycle does not define —
 * and that does warn.
 *
 * Neither field is in REQUIRED_FIELDS for the same reason: a case with no review decision is not
 * unexecutable, it is simply unreviewed.
 */
const LIFECYCLE_FIELDS = ['review', 'automation'];
const LIFECYCLE_VALUES = ['Pending', 'Approved', 'Rejected'];
const LIFECYCLE_DEFAULT = 'Pending';

/** Canonicalises a lifecycle value's casing so `approved` and `Approved` are the same decision. */
function normalizeLifecycleValue(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return LIFECYCLE_VALUES.find((v) => v.toLowerCase() === trimmed.toLowerCase()) || trimmed;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// ELIGIBILITY — DERIVED, NEVER STORED
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// `Review` and `Automation` are the only two authoritative decision fields on a test case
// (test-design-skill §6.3). Everything a consumer needs to know about what may run is COMPUTED from
// that pair — there is deliberately no third persisted field such as "Automation Eligible",
// "Ready for Automation", or "Manual Only", because a stored derivation is a second source of truth
// that can disagree with the pair it came from. These helpers exist so every consumer derives the
// same answer from the same place instead of re-implementing the rule.
//
//   Manual Execution (4M):  Review = Approved                              — Automation irrelevant
//   Automation      (4A):  Review = Approved AND Automation = Approved     — both required

/** Stage `4M` eligibility. `Automation` is deliberately not consulted (manual-execution-skill §4.1). */
function isManualEligible(testCase) {
  return normalizeLifecycleValue(testCase && testCase.review) === 'Approved';
}

/** Stage `4A` eligibility. Both gates are independent and both must pass (automation-skill §11). */
function isAutomationEligible(testCase) {
  if (!testCase) return false;
  return normalizeLifecycleValue(testCase.review) === 'Approved'
    && normalizeLifecycleValue(testCase.automation) === 'Approved';
}

/**
 * Detect the one contradictory pair the lifecycle admits: an automation decision recorded on a case
 * whose own review did not accept it.
 *
 * `Automation = Approved` says "automate this case"; `Review != Approved` says "this case is not
 * accepted (yet)". Both are HUMAN decisions, and they disagree. This is reported and never
 * reconciled: silently resetting `Automation` to `Pending` would destroy one reviewer's recorded
 * intent, and silently promoting `Review` to `Approved` would manufacture an approval nobody gave —
 * which is the single thing the review gate exists to prevent. The gates above already exclude the
 * case from Stage `4A` on their own, so surfacing it is sufficient to keep it out of automation;
 * resolving it is a Human Decision (pipeline.md §5.5).
 *
 * @returns {null|{review: string, automation: string, reason: string}}
 */
function lifecycleInconsistency(testCase) {
  if (!testCase) return null;
  const review = normalizeLifecycleValue(testCase.review) || LIFECYCLE_DEFAULT;
  const automation = normalizeLifecycleValue(testCase.automation) || LIFECYCLE_DEFAULT;
  if (automation !== 'Approved' || review === 'Approved') return null;
  return {
    review,
    automation,
    reason: review === 'Rejected'
      ? 'a rejected case cannot be selected for automation — Review takes precedence'
      : 'automation was selected before the case itself was reviewed',
  };
}

/** Human-readable warning text for an inconsistent pair, shared by the export and import paths. */
function inconsistencyMessage(id, detail) {
  return `${id}: INCONSISTENT lifecycle — Review is "${detail.review}" but Automation is `
    + `"${detail.automation}" (${detail.reason}). Both values are preserved exactly as recorded; `
    + 'the case is NOT eligible for Stage 4A. Resolving this is a human decision.';
}

/** How multi-line Steps collapse into one spreadsheet cell. */
const STEP_JOINER = ' | ';

/**
 * Case headings this parser accepts.
 *
 * Two shapes exist in the wild and both are legitimate: `## TC-SR-001` (a heading per case, with the
 * Title as a **Title:** field) and `### TC-SR-001 — Title` (the current TestCase_entry.md template's
 * combined form). Accepting both means promoting this behaviour into permanent tooling does not
 * invalidate suites already written against either shape.
 */
const CASE_HEADING = /^(#{2,4})\s+(TC-[A-Za-z0-9._-]+)\s*(?:[—–-]\s*(.*))?$/;

/** `**Label:**` at the start of a line — the field marker used throughout the suite documents. */
const FIELD_MARKER = /^\*\*([^*:]+):\*\*\s*(.*)$/;

/** Map a Markdown field label to a record key. Unknown labels are ignored, not guessed at. */
const LABEL_TO_KEY = new Map(FIELDS.map((f) => [f.label.toLowerCase(), f.key]));

function stripListMarker(line) {
  // "1. Click Save" / "1) Click Save" / "- Click Save" -> "Click Save"
  return line.replace(/^\s*(?:\d+[.)]|[-*+])\s+/, '').trim();
}

/**
 * Flatten a field's raw block into one cell value.
 *
 * Steps become ` | `-joined and RENUMBERED canonically (`1. … | 2. …`), so each step stays
 * individually identifiable inside a single cell. The numbering is not decoration: Stage 4 records a
 * result per step and a defect cites "failed at step 3", so a joined cell that dropped its numbers
 * makes that reference unresolvable. Renumbering (rather than passing the authored marker through)
 * also normalizes suites written with an all-`1.` Markdown list, where the rendered numbers are
 * correct but the source text is not.
 *
 * Every other field keeps its line breaks, including Markdown tables (Test Data is often a
 * Field/Value table), because collapsing a table onto one line destroys the pairing that makes it
 * meaningful.
 */
function flattenField(key, lines) {
  const cleaned = lines.map((l) => l.replace(/\s+$/, ''));
  while (cleaned.length && cleaned[0].trim() === '') cleaned.shift();
  while (cleaned.length && cleaned[cleaned.length - 1].trim() === '') cleaned.pop();
  if (!cleaned.length) return '';

  if (key === 'steps') {
    return cleaned
      .map(stripListMarker)
      .filter(Boolean)
      .map((text, i) => `${i + 1}. ${text}`)
      .join(STEP_JOINER);
  }
  return cleaned.map((l) => l.trim()).filter(Boolean).join('\n');
}

/**
 * Parse one `TestCases_{Module}.md` document.
 *
 * @param {string} markdown
 * @param {object} [options]
 * @param {string} [options.sourceLabel] Filename used in warning messages.
 * @returns {{cases: object[], warnings: string[]}}
 */
function parseTestCases(markdown, options = {}) {
  const source = options.sourceLabel ? `${options.sourceLabel}: ` : '';
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');

  const cases = [];
  const warnings = [];
  let current = null;
  let fieldKey = null;
  let fieldLines = [];
  let inFence = false;

  const flushField = () => {
    if (current && fieldKey) {
      const value = flattenField(fieldKey, fieldLines);
      // First occurrence wins. A duplicated label is a suite-authoring error worth surfacing rather
      // than resolving by last-write, which would depend on document order no one is tracking.
      if (current.record[fieldKey]) {
        warnings.push(`${source}${current.record.id}: duplicate "${fieldKey}" field — keeping the first`);
      } else {
        current.record[fieldKey] = value;
      }
    }
    fieldKey = null;
    fieldLines = [];
  };

  const flushCase = () => {
    flushField();
    if (!current) return;
    const missing = REQUIRED_FIELDS.filter((k) => !current.record[k]);
    if (missing.length) {
      warnings.push(
        `${source}${current.record.id}: missing required field(s) ${missing.join(', ')} `
        + '— exported as an empty cell; the Markdown suite needs fixing, not the workbook'
      );
    }
    // Lifecycle columns: absent means "no decision yet", which IS `Pending` — so default it
    // silently. A present but unrecognised value is an authoring error and is reported, because it
    // would otherwise reach a reviewer looking like a decision the lifecycle does not define.
    for (const key of LIFECYCLE_FIELDS) {
      const normalized = normalizeLifecycleValue(current.record[key]);
      if (!normalized) {
        current.record[key] = LIFECYCLE_DEFAULT;
      } else if (!LIFECYCLE_VALUES.includes(normalized)) {
        const label = FIELDS.find((f) => f.key === key).label;
        warnings.push(
          `${source}${current.record.id}: ${label} is "${normalized}" — expected one of `
          + `${LIFECYCLE_VALUES.join(', ')}; exported as written, the suite needs fixing`
        );
        current.record[key] = normalized;
      } else {
        current.record[key] = normalized;
      }
    }
    // Cross-field check, run after both values are settled. Reported, never reconciled — see
    // `lifecycleInconsistency`. The record is pushed unchanged either way.
    const clash = lifecycleInconsistency(current.record);
    if (clash) warnings.push(`${source}${inconsistencyMessage(current.record.id, clash)}`);
    cases.push(current.record);
    current = null;
  };

  for (const line of lines) {
    // Fenced code inside a field (a payload, a URL block) is copied through verbatim: a `## ` or
    // `**Label:**` inside a fence is content, not structure.
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      if (fieldKey) fieldLines.push(line);
      continue;
    }
    if (inFence) {
      if (fieldKey) fieldLines.push(line);
      continue;
    }

    const heading = CASE_HEADING.exec(line);
    if (heading) {
      flushCase();
      const record = { id: heading[2].trim() };
      // `### TC-X — Title` carries the Title in the heading; a later **Title:** field, if present,
      // is then the duplicate and loses to this one, which is the correct precedence for the
      // combined-heading form.
      if (heading[3] && heading[3].trim()) record.title = heading[3].trim();
      current = { record };
      continue;
    }

    if (!current) continue; // Front matter, scope banners, and preamble are not case content.

    // A non-case heading ends the case list — `## Summary`, `## Notes`, etc.
    if (/^#{1,6}\s+/.test(line)) {
      flushCase();
      continue;
    }

    const marker = FIELD_MARKER.exec(line);
    if (marker) {
      const key = LABEL_TO_KEY.get(marker[1].trim().toLowerCase());
      if (key) {
        flushField();
        fieldKey = key;
        fieldLines = marker[2] ? [marker[2]] : [];
        continue;
      }
      // An unrecognized `**Label:**` is prose emphasis, not a field — fall through so it stays part
      // of whatever field is currently open rather than being dropped.
    }

    // A horizontal rule separates cases in every suite shape.
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushField();
      continue;
    }

    if (fieldKey) fieldLines.push(line);
  }

  flushCase();

  const seen = new Set();
  for (const c of cases) {
    if (seen.has(c.id)) {
      warnings.push(`${source}duplicate Test Case ID "${c.id}" — IDs must be unique within a module`);
    }
    seen.add(c.id);
  }

  if (!cases.length) warnings.push(`${source}no test cases found — expected headings like "## TC-XXX-001"`);

  // Shared Definitions (§6.1b): a case that cites SETUP-n / VR-n gets the cited text attached as
  // `sharedDefinitions`, so it is fingerprinted with the case. A case citing none is left untouched.
  const shared = parseSharedDefinitions(markdown, { sourceLabel: options.sourceLabel });
  const linked = linkCases(cases, shared.definitions, { sourceLabel: options.sourceLabel });
  warnings.push(...shared.warnings, ...linked.warnings);

  return { cases, warnings, definitions: shared.definitions, definitionUsage: linked.usedBy };
}

/** Records -> rows, header first, in §6.1 field order. Absent optional fields become ''. */
function toRows(cases) {
  return [
    FIELDS.map((f) => f.label),
    ...cases.map((c) => FIELDS.map((f) => c[f.key] || '')),
  ];
}

module.exports = {
  parseTestCases,
  toRows,
  FIELDS,
  REQUIRED_FIELDS,
  STEP_JOINER,
  LIFECYCLE_FIELDS,
  LIFECYCLE_VALUES,
  LIFECYCLE_DEFAULT,
  normalizeLifecycleValue,
  isManualEligible,
  isAutomationEligible,
  lifecycleInconsistency,
  inconsistencyMessage,
};
