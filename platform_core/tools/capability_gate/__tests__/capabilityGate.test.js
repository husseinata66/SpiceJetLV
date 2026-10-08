const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseRequires, evaluateCase, planExecution, loadCasesFromMarkdown } = require('../index');

const FLYNAS = {
  capabilities: {
    hold: 'Not Supported', payAfterHold: 'Not Supported',
    meal: 'Supported', baggage: 'Supported', seat: 'Supported', bundle: 'Supported',
  },
  supplierRules: ['ladies-only-seats'],
  supplierRulesSetAt: '2026-09-27T00:00:00.000Z',
};

test('parseRequires reads None, lists, and negations', () => {
  assert.deepEqual(parseRequires('None'), { declared: true, required: [], forbidden: [], invalid: [] });
  assert.deepEqual(parseRequires('Hold + Pay after Hold').required, ['hold', 'payAfterHold']);
  assert.deepEqual(parseRequires('Meal, Seat').required, ['meal', 'seat']);
  // Booking is not a capability: every Supplier books (2026-09-28).
  assert.deepEqual(parseRequires('Book').invalid, ['Book']);
  assert.deepEqual(parseRequires('Not Hold').forbidden, ['hold']);
  assert.deepEqual(parseRequires('!Meal').forbidden, ['meal']);
  assert.deepEqual(parseRequires('Refund').invalid, ['Refund']);
  assert.equal(parseRequires('').declared, false);
});

test('a case needing a capability the supplier lacks is excluded with its reason', () => {
  const d = evaluateCase({ id: 'TC-HLD-001', requires: 'Hold' }, FLYNAS);
  assert.equal(d.decision, 'Excluded');
  assert.match(d.reasons[0], /Needs Hold — Not Supported/);
  assert.equal(evaluateCase({ id: 'TC-SM-NAV-001', requires: 'Seat' }, FLYNAS).decision, 'Run');
});

test('Unknown is treated as Not Supported', () => {
  const d = evaluateCase({ id: 'TC-ML-001', requires: 'Meal' }, { capabilities: {} });
  assert.equal(d.decision, 'Excluded');
  assert.match(d.reasons[0], /Unknown for this supplier, treated as Not Supported/);
});

test('a Not-capability case runs only when the supplier lacks it', () => {
  assert.equal(evaluateCase({ id: 'TC-HLD-007', requires: 'Not Hold' }, FLYNAS).decision, 'Run');
  assert.equal(evaluateCase({ id: 'TC-ML-006', requires: 'Not Meal' }, FLYNAS).decision, 'Excluded');
});

test('a supplier-rule case runs only for a supplier that has the rule', () => {
  assert.equal(
    evaluateCase({ id: 'TC-SM-GEN-001', requires: 'Seat', supplierRule: 'ladies-only-seats' }, FLYNAS).decision,
    'Run'
  );
  const other = { ...FLYNAS, supplierRules: [] };
  assert.match(
    evaluateCase({ id: 'TC-SM-GEN-001', requires: 'Seat', supplierRule: 'ladies-only-seats' }, other).reasons[0],
    /does not apply/
  );
  const never = { capabilities: FLYNAS.capabilities };
  assert.match(
    evaluateCase({ id: 'X', requires: 'None', supplierRule: 'ladies-only-seats' }, never).reasons[0],
    /never recorded/
  );
});

test('an unknown Requires value excludes the case rather than guessing', () => {
  const d = evaluateCase({ id: 'X', requires: 'Refund' }, FLYNAS);
  assert.equal(d.decision, 'Excluded');
});

test('planExecution splits the suite and warns on untagged cases', () => {
  const plan = planExecution([
    { id: 'A', requires: 'Seat' }, { id: 'B', requires: 'Hold' }, { id: 'C' },
  ], FLYNAS);
  assert.deepEqual(plan.run.map((c) => c.id), ['A', 'C']);
  assert.deepEqual(plan.excluded.map((c) => c.id), ['B']);
  assert.equal(plan.warnings.length, 1);
});

test('Markdown suites carry Requires and Supplier Rule through the parser', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-gate-'));
  try {
    const file = path.join(dir, 'TestCases_X.md');
    fs.writeFileSync(file, [
      '## TC-X-001 — Ladies-only seat refused to a man',
      '**Objective:** o', '**Steps:**', '1. s', '**Expected Result:** e', '**Priority:** P1', '**Tags:** Atomic',
      '**Requires:** Seat', '**Supplier Rule:** ladies-only-seats', '',
    ].join('\n'));
    const [c] = loadCasesFromMarkdown(file);
    assert.equal(c.requires, 'Seat');
    assert.equal(c.supplierRule, 'ladies-only-seats');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
