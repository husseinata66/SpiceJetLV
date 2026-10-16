'use strict';

// Phase 3 of the test case design quality work: non-blocking Expected Source advisories for new or changed
// cases, and the trace gap for an assertion requirement its Traceability Matrix row does not cite.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { designGate, designAdvisories } = require('../assertionContract');
const { rootGraph, findGaps } = require('../traceGraph');
const { parseTestCases } = require('../../test_suite_export/parseTestCases');

const CASE = (id, rows, objective = 'Verify one thing.') => `### ${id} — A case

**Objective:** ${objective}

**Steps:**

1. Do it.

**Expected Result:**

1. [A1] Status code is \`404\`.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
${rows.join('\n')}

**Priority:** P1

**Tags:** Atomic
`;

const suite = (...cases) => `# Manual Test Suite — Demo\n\n## Test Cases\n\n${cases.join('\n')}`;
const parse = (md) => parseTestCases(md).cases;

test('"Expected Result" as Expected Source is an advisory, not an issue', () => {
  const rows = [
    { id: 'A1', source: 'Expected Result' },
    { id: 'A2', source: 'FR-7' },
    { id: 'A3', source: '`expected result`' },
  ];
  assert.deepEqual(designAdvisories(rows).map((n) => n.slice(0, 3)), ['A1:', 'A3:']);
});

test('advisories are raised for new or changed cases only, and never block', () => {
  const circular = '| A1 | 404 | Expected Result | equals | FR-7 |';
  const grounded = '| A1 | 404 | FR-7 | equals | FR-7 |';
  const baseline = parse(suite(CASE('TC-D-001', [circular]), CASE('TC-D-002', [grounded])));
  // Unchanged legacy case with a circular source: nothing to say.
  const same = designGate(baseline, baseline);
  assert.deepEqual(same.advisories, []);
  // Changed case with a circular source: advised, still valid.
  const changed = parse(suite(CASE('TC-D-001', [circular], 'Verify a different thing.'), CASE('TC-D-002', [grounded]), CASE('TC-D-003', [circular])));
  const g = designGate(changed, baseline);
  assert.deepEqual(g.invalid, []);
  assert.deepEqual(g.missing, []);
  assert.deepEqual(g.advisories.map((a) => a.id), ['TC-D-001', 'TC-D-003']);
});

test('state trace reports an assertion requirement its Matrix row does not cite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-asr-'));
  try {
    fs.mkdirSync(path.join(dir, 'test_design'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'test_design', 'TestCases_Demo.md'), suite(
      CASE('TC-D-001', ['| A1 | 404 | FR-7 | equals | FR-7, BR-2 |']),
      CASE('TC-D-002', ['| A1 | 404 | FR-7 | equals | FR-7 |']),
      CASE('TC-D-003', ['| A1 | 404 | FR-7 | equals | §2.4 |']),
    ));
    fs.writeFileSync(path.join(dir, 'test_design', 'TraceabilityMatrix.md'), [
      '| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference |',
      '|---|---|---|---|',
      '| TC-D-001 | FR-7 | Not independently verified in Discovery | N/A |',
      '| TC-D-002 | FR-7 / BR-2 | Not independently verified in Discovery | N/A |',
      '| TC-D-003 | FR-7 | Not independently verified in Discovery | N/A |',
      '',
    ].join('\n'));
    const g = rootGraph(dir, { dir, label: 'demo' }, { executions: false });
    assert.deepEqual(g.testCases['TC-D-001'].assertionRequirements, ['FR-7', 'BR-2']);
    const gaps = findGaps([g]).filter((x) => x.kind === 'assertion-requirement-not-traced');
    assert.deepEqual(gaps.map((x) => [x.item, x.detail.match(/verifying (\S+),/)[1]]), [['TC-D-001', 'BR-2']],
      'BR-2 is missing from TC-D-001\'s row; TC-D-002 cites more than it asserts (fine); a § section is not an ID');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a case with no Assertions table adds no assertion gap (legacy)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-legacy-'));
  try {
    fs.mkdirSync(path.join(dir, 'test_design'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'test_design', 'TestCases_Demo.md'), suite(CASE('TC-D-001', []).replace(/\*\*Assertions:\*\*[\s\S]*?\n\n\*\*Priority/, '**Priority')));
    fs.writeFileSync(path.join(dir, 'test_design', 'TraceabilityMatrix.md'), '| Test Case ID | Requirement Reference |\n|---|---|\n| TC-D-001 | FR-7 |\n');
    const g = rootGraph(dir, { dir, label: 'demo' }, { executions: false });
    assert.deepEqual(g.testCases['TC-D-001'].assertionRequirements, []);
    assert.equal(findGaps([g]).filter((x) => x.kind === 'assertion-requirement-not-traced').length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a Matrix range covers every ID in it; a spaced dash is a description, not a range', () => {
  const { dependenciesFromTraceRow } = require('../scopeApproval');
  const d = dependenciesFromTraceRow({ requirement: 'SRCH-02…04, CMP-1...2, AC-7–8; AC-1 — 11 fields' });
  assert.deepEqual(d.covers.sort(), ['AC-1', 'AC-7', 'AC-8', 'CMP-1', 'CMP-2', 'SRCH-02', 'SRCH-03', 'SRCH-04'].sort());
  assert.deepEqual(d.dependsOn.sort(), ['AC-1', 'AC-7', 'CMP-1', 'SRCH-02'].sort(), 'dependsOn reads exactly as before');
});
