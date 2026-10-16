'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  parseTestCases, toRows, FIELDS,
  isManualEligible, isAutomationEligible, lifecycleInconsistency,
} = require('../parseTestCases');

/** A suite in the `## TC-x` + `**Title:**` shape the reference Stage 3 run produced. */
const REFERENCE_SHAPE = `# Manual Test Suite — Search

**Run ID:** \`run-001__x\` | **Module:** Search

> Scope banner prose that is not a test case.

---

## TC-SR-001

**Title:** Search returns results for a valid query

**Objective:** Verify that submitting a query returns a matching result grid.

**Preconditions:** Anonymous session.

**Test Data:** Query: \`wireless mouse\`

**Steps:**
1. Click the search box.
2. Type \`wireless mouse\`.
3. Press Enter.

**Expected Result:** At least one result card is displayed.

**Priority:** P1

**Tags:** Atomic, Smoke, Positive

---

## TC-SR-002

**Title:** Empty query is rejected

**Objective:** Verify an empty submission does not navigate.

**Preconditions:** Homepage open.

**Test Data:** None

**Steps:**
1. Press Enter with an empty search box.

**Expected Result:** The page does not navigate.

**Priority:** P2

**Tags:** Atomic, Negative-EmptyValues

**Notes:** Reading the DOM only.

---

## Summary

| Field | Value |
|---|---|
| Total | 2 |
`;

test('parses the reference suite shape: every case, every field', () => {
  const { cases, warnings } = parseTestCases(REFERENCE_SHAPE);
  assert.deepStrictEqual(warnings, []);
  assert.strictEqual(cases.length, 2);

  const [first, second] = cases;
  assert.strictEqual(first.id, 'TC-SR-001');
  assert.strictEqual(first.title, 'Search returns results for a valid query');
  assert.strictEqual(first.objective, 'Verify that submitting a query returns a matching result grid.');
  assert.strictEqual(first.preconditions, 'Anonymous session.');
  assert.strictEqual(first.testData, 'Query: `wireless mouse`');
  assert.strictEqual(first.expectedResult, 'At least one result card is displayed.');
  assert.strictEqual(first.priority, 'P1');
  assert.strictEqual(first.tags, 'Atomic, Smoke, Positive');
  // Absent optional field stays absent rather than becoming a placeholder string.
  assert.strictEqual(first.notes, undefined);
  assert.strictEqual(second.notes, 'Reading the DOM only.');
});

test('Steps join with " | " and carry canonical numbering', () => {
  const { cases } = parseTestCases(REFERENCE_SHAPE);
  assert.strictEqual(
    cases[0].steps,
    '1. Click the search box. | 2. Type `wireless mouse`. | 3. Press Enter.'
  );
  assert.strictEqual(cases[1].steps, '1. Press Enter with an empty search box.');
});

test('renumbers an all-"1." authored list, because Stage 4 cites step numbers', () => {
  const md = [
    '## TC-A-001', '', '**Title:** T', '', '**Objective:** O', '', '**Preconditions:** P', '',
    '**Steps:**', '1. First.', '1. Second.', '1. Third.', '',
    '**Expected Result:** E', '', '**Priority:** P1', '', '**Tags:** Atomic', '',
  ].join('\n');
  const { cases } = parseTestCases(md);
  assert.strictEqual(cases[0].steps, '1. First. | 2. Second. | 3. Third.');
});

test('accepts the combined `### TC-x — Title` heading shape', () => {
  const md = [
    '### TC-LOGIN-001 — Valid credentials sign the user in', '',
    '**Objective:** O', '', '**Preconditions:** P', '',
    '**Steps:**', '1. Sign in.', '',
    '**Expected Result:** E', '', '**Priority:** P1', '', '**Tags:** Scenario', '',
  ].join('\n');
  const { cases, warnings } = parseTestCases(md);
  assert.deepStrictEqual(warnings, []);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].id, 'TC-LOGIN-001');
  assert.strictEqual(cases[0].title, 'Valid credentials sign the user in');
});

test('a heading Title wins over a later **Title:** field, without a duplicate warning', () => {
  const md = [
    '### TC-X-001 — Heading title', '', '**Title:** Field title', '',
    '**Objective:** O', '', '**Steps:**', '1. Do it.', '',
    '**Expected Result:** E', '', '**Priority:** P1', '', '**Tags:** Atomic', '',
  ].join('\n');
  const { cases, warnings } = parseTestCases(md);
  assert.strictEqual(cases[0].title, 'Heading title');
  assert.ok(warnings.some((w) => /duplicate "title"/.test(w)), 'the collision is reported, not hidden');
});

test('multi-line Test Data tables keep their line structure', () => {
  const md = [
    '## TC-D-001', '', '**Title:** T', '', '**Objective:** O', '',
    '**Test Data:**', '', '| Field | Value |', '|---|---|', '| Email | a@b.c |', '| Role | Admin |', '',
    '**Steps:**', '1. Submit.', '',
    '**Expected Result:** E', '', '**Priority:** P1', '', '**Tags:** Atomic', '',
  ].join('\n');
  const { cases } = parseTestCases(md);
  assert.strictEqual(cases[0].testData, '| Field | Value |\n|---|---|\n| Email | a@b.c |\n| Role | Admin |');
});

test('reports a missing required field instead of silently emitting a blank cell', () => {
  const md = [
    '## TC-M-001', '', '**Title:** T', '', '**Objective:** O', '',
    '**Steps:**', '1. Do something.', '', // no Expected Result, no Priority, no Tags
  ].join('\n');
  const { cases, warnings } = parseTestCases(md, { sourceLabel: 'TestCases_M.md' });
  assert.strictEqual(cases.length, 1, 'the case is still exported — the warning is the signal');
  const warning = warnings.find((w) => w.includes('TC-M-001'));
  assert.ok(warning, 'a warning names the offending case');
  assert.match(warning, /TestCases_M\.md/, 'and the file it came from');
  for (const field of ['expectedResult', 'priority', 'tags']) {
    assert.match(warning, new RegExp(field));
  }
});

test('reports duplicate Test Case IDs — uniqueness is a traceability requirement', () => {
  const caseBlock = (id) => [
    `## ${id}`, '', '**Title:** T', '', '**Objective:** O', '',
    '**Steps:**', '1. Go.', '', '**Expected Result:** E', '', '**Priority:** P1', '', '**Tags:** Atomic', '',
  ].join('\n');
  const { cases, warnings } = parseTestCases(caseBlock('TC-Z-001') + '\n---\n' + caseBlock('TC-Z-001'));
  assert.strictEqual(cases.length, 2);
  assert.ok(warnings.some((w) => /duplicate Test Case ID "TC-Z-001"/.test(w)));
});

test('an empty suite is a warning, not a silent success', () => {
  const { cases, warnings } = parseTestCases('# Manual Test Suite — Empty\n\nNo cases yet.\n');
  assert.deepStrictEqual(cases, []);
  assert.ok(warnings.some((w) => /no test cases found/.test(w)));
});

test('fenced code inside a field is preserved and never read as structure', () => {
  const md = [
    '## TC-F-001', '', '**Title:** T', '', '**Objective:** O', '',
    '**Test Data:**', '```', '## TC-FAKE-999', '**Title:** not a real case', '```', '',
    '**Steps:**', '1. Paste the payload.', '',
    '**Expected Result:** E', '', '**Priority:** P1', '', '**Tags:** Atomic', '',
  ].join('\n');
  const { cases } = parseTestCases(md);
  assert.strictEqual(cases.length, 1, 'the fenced heading did not open a second case');
  assert.match(cases[0].testData, /TC-FAKE-999/, 'the fenced content survived as data');
});

test('prose emphasis is not mistaken for a field marker', () => {
  const md = [
    '## TC-P-001', '', '**Title:** T', '', '**Objective:** O', '',
    '**Steps:**', '1. Go.', '',
    '**Expected Result:** The banner appears.', '**Important:** it must be dismissible.', '',
    '**Priority:** P1', '', '**Tags:** Atomic', '',
  ].join('\n');
  const { cases } = parseTestCases(md);
  assert.match(cases[0].expectedResult, /Important/, 'unknown label stayed with the open field');
  assert.strictEqual(cases[0].priority, 'P1', 'and real fields after it still parsed');
});

test('CRLF input parses identically to LF', () => {
  const lf = parseTestCases(REFERENCE_SHAPE);
  const crlf = parseTestCases(REFERENCE_SHAPE.replace(/\n/g, '\r\n'));
  assert.deepStrictEqual(crlf.cases, lf.cases);
});

test('toRows emits the §6.1 header in order, then one row per case', () => {
  const { cases } = parseTestCases(REFERENCE_SHAPE);
  const rows = toRows(cases);
  assert.deepStrictEqual(rows[0], [
    'Test Case ID', 'Title', 'Objective', 'Preconditions', 'Test Data',
    'Steps', 'Expected Result', 'Priority', 'Tags', 'Notes',
    // Lifecycle columns, appended 2026-08-01 — decisions made after the case is written, so they
    // sit at the end. Their position is asserted here because the order is a contract, not a
    // preference: a reader diffing two workbooks relies on columns not shifting under them.
    'Review', 'Automation',
    // Supplier gating columns, appended 2026-09-27 after the lifecycle pair for the same reason.
    'Requires', 'Supplier Rule',
    // Structured assertions, appended 2026-10-09 (Phase 5.8) after everything else, for the same reason.
    'Assertions',
  ]);
  assert.strictEqual(rows.length, cases.length + 1);
  for (const row of rows) assert.strictEqual(row.length, FIELDS.length);
  // An absent optional field becomes '', never the string "undefined".
  assert.strictEqual(rows[1][9], '');
});

test('lifecycle columns default to Pending when the author omits them', () => {
  const { cases, warnings } = parseTestCases(REFERENCE_SHAPE);
  for (const c of cases) {
    assert.strictEqual(c.review, 'Pending');
    assert.strictEqual(c.automation, 'Pending');
  }
  // Absence is not a defect: "no decision yet" is exactly what Pending means, so a suite authored
  // before this contract existed must export cleanly rather than warn on every case.
  assert.ok(
    !warnings.some((w) => /Review|Automation/.test(w)),
    'defaulting is silent'
  );
});

test('lifecycle columns are read and case-normalised when present', () => {
  const md = [
    '## TC-L-001', '', '**Title:** T', '', '**Objective:** O', '',
    '**Steps:**', '1. Go.', '', '**Expected Result:** R', '',
    '**Priority:** P1', '', '**Tags:** Atomic', '',
    '**Review:** approved', '', '**Automation:** REJECTED', '',
  ].join('\n');
  const { cases, warnings } = parseTestCases(md);
  assert.strictEqual(cases[0].review, 'Approved');
  assert.strictEqual(cases[0].automation, 'Rejected');
  assert.strictEqual(warnings.length, 0, 'casing alone is not an authoring error');
});

test('an unrecognised lifecycle value warns but still exports as written', () => {
  const md = [
    '## TC-L-002', '', '**Title:** T', '', '**Objective:** O', '',
    '**Steps:**', '1. Go.', '', '**Expected Result:** R', '',
    '**Priority:** P1', '', '**Tags:** Atomic', '',
    '**Review:** Maybe', '',
  ].join('\n');
  const { cases, warnings } = parseTestCases(md);
  assert.strictEqual(cases[0].review, 'Maybe', 'exported as written, never silently corrected');
  assert.strictEqual(cases[0].automation, 'Pending', 'the other column still defaults');
  assert.ok(
    warnings.some((w) => w.includes('Review is "Maybe"')),
    'an undefined decision is surfaced'
  );
});

test('lifecycle columns are not required fields', () => {
  // A case with no review decision is unreviewed, not unexecutable — so it must never produce a
  // "missing required field" warning, which is reserved for content Stage 4M cannot run without.
  const md = [
    '## TC-L-003', '', '**Title:** T', '', '**Objective:** O', '',
    '**Steps:**', '1. Go.', '', '**Expected Result:** R', '',
    '**Priority:** P1', '', '**Tags:** Atomic', '',
  ].join('\n');
  const { warnings } = parseTestCases(md);
  assert.strictEqual(warnings.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE REVIEW / AUTOMATION DECISION MATRIX
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// `Review` and `Automation` are two INDEPENDENT human decisions (test-design-skill §6.3):
//
//   Review     — has this test case been reviewed and accepted?
//   Automation — should this (accepted) test case be automated?
//
// Eligibility is DERIVED from the pair and never stored as a third field. These tests pin the whole
// matrix so a future change cannot quietly collapse the two decisions into one lifecycle status, nor
// let an automation decision start influencing manual scope.

/** Build a minimal one-case suite carrying an explicit lifecycle pair. */
function caseWith(review, automation) {
  const lines = [
    '## TC-M-001', '', '**Title:** T', '', '**Objective:** O', '',
    '**Steps:**', '1. Go.', '', '**Expected Result:** R', '',
    '**Priority:** P1', '', '**Tags:** Atomic', '',
  ];
  if (review) lines.push(`**Review:** ${review}`, '');
  if (automation) lines.push(`**Automation:** ${automation}`, '');
  return parseTestCases(lines.join('\n'));
}

test('decision matrix — manual and automation eligibility for every combination', () => {
  // [Review, Automation, manual eligible, automation eligible]
  const MATRIX = [
    ['Pending',  'Pending',  false, false],
    ['Pending',  'Approved', false, false], // inconsistent — automation selected before review
    ['Pending',  'Rejected', false, false],
    ['Approved', 'Pending',  true,  false], // approved case, automation undecided
    ['Approved', 'Approved', true,  true ], // the only automation-eligible state
    ['Approved', 'Rejected', true,  false], // approved case that stays manual BY DECISION
    ['Rejected', 'Pending',  false, false],
    ['Rejected', 'Approved', false, false], // inconsistent — Review takes precedence
    ['Rejected', 'Rejected', false, false],
  ];

  for (const [review, automation, manual, auto] of MATRIX) {
    const { cases } = caseWith(review, automation);
    const c = cases[0];
    assert.strictEqual(c.review, review, `${review}/${automation}: Review preserved verbatim`);
    assert.strictEqual(c.automation, automation, `${review}/${automation}: Automation preserved verbatim`);
    assert.strictEqual(
      isManualEligible(c), manual,
      `${review}/${automation}: manual eligibility must be ${manual} (Review gates 4M alone)`
    );
    assert.strictEqual(
      isAutomationEligible(c), auto,
      `${review}/${automation}: automation eligibility must be ${auto} (4A needs BOTH Approved)`
    );
  }
});

test('Automation never influences manual eligibility', () => {
  // The whole point of two independent fields: an approved case stays manually executable whatever
  // its automation decision says. `Automation = Rejected` is the REASON it must be run by hand.
  for (const automation of ['Pending', 'Approved', 'Rejected']) {
    const { cases } = caseWith('Approved', automation);
    assert.strictEqual(
      isManualEligible(cases[0]), true,
      `Approved/${automation} must remain manually executable`
    );
  }
});

test('Automation = Approved can never bypass the Review gate', () => {
  for (const review of ['Pending', 'Rejected']) {
    const { cases } = caseWith(review, 'Approved');
    assert.strictEqual(
      isAutomationEligible(cases[0]), false,
      `${review}/Approved must not be automatable — Review approval cannot be inferred`
    );
  }
});

test('an inconsistent pair is reported, and both values are preserved exactly', () => {
  for (const review of ['Pending', 'Rejected']) {
    const { cases, warnings } = caseWith(review, 'Approved');
    assert.strictEqual(cases[0].review, review, 'Review is never auto-promoted to Approved');
    assert.strictEqual(cases[0].automation, 'Approved', 'Automation is never auto-reset to Pending');
    assert.ok(
      warnings.some((w) => w.includes('INCONSISTENT lifecycle') && w.includes('TC-M-001')),
      `${review}/Approved must surface an inconsistency warning`
    );
  }
});

test('consistent pairs raise no inconsistency warning', () => {
  const CONSISTENT = [
    ['Pending', 'Pending'], ['Pending', 'Rejected'],
    ['Approved', 'Pending'], ['Approved', 'Approved'], ['Approved', 'Rejected'],
    ['Rejected', 'Pending'], ['Rejected', 'Rejected'],
  ];
  for (const [review, automation] of CONSISTENT) {
    const { warnings } = caseWith(review, automation);
    assert.ok(
      !warnings.some((w) => w.includes('INCONSISTENT')),
      `${review}/${automation} is a legitimate state and must not warn`
    );
  }
});

test('both fields default to Pending, so a bare case is eligible for nothing', () => {
  const { cases, warnings } = caseWith(null, null);
  assert.strictEqual(cases[0].review, 'Pending');
  assert.strictEqual(cases[0].automation, 'Pending');
  assert.strictEqual(isManualEligible(cases[0]), false, 'an unreviewed case is not executable');
  assert.strictEqual(isAutomationEligible(cases[0]), false);
  assert.strictEqual(warnings.length, 0, 'absence is "no decision yet", not an authoring error');
});

test('lifecycleInconsistency names which decision is contradicted', () => {
  assert.strictEqual(lifecycleInconsistency({ review: 'Approved', automation: 'Approved' }), null);
  assert.match(
    lifecycleInconsistency({ review: 'Rejected', automation: 'Approved' }).reason,
    /Review takes precedence/
  );
  assert.match(
    lifecycleInconsistency({ review: 'Pending', automation: 'Approved' }).reason,
    /before the case itself was reviewed/
  );
});
