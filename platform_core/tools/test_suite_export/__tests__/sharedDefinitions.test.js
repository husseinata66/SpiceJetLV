'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseTestCases } = require('../parseTestCases');
const { parseSharedDefinitions, findReferences } = require('../sharedDefinitions');
const { buildWorkbook } = require('../xlsxWriter');
const { readWorkbook } = require('../readWorkbook');
const { exportSuite } = require('../exportSuites');
const { designGate, materialText } = require('../../run_manager/assertionContract');

const CASE = (id, extra = '') => `### ${id} — A case

**Objective:** Verify one thing.

**Preconditions:** ${extra || 'None.'}

**Steps:**

1. Do it.

**Expected Result:**

1. [A1] Status code is \`404\`.

**Priority:** P1

**Tags:** Atomic
`;

const suite = ({ defs = '', cases }) => `# Manual Test Suite — Demo

${defs}
## Test Cases

${cases.join('\n')}`;

const DEFS = `## Shared Definitions

### SETUP-1 — Signed-in client
1. Get a token for the \`qa_admin\` role.

### VR-01 — Error body contract
**Source:** FR-7, API contract GET /users/{id} 404
- VR-01.1 Status equals the contract status.
- VR-01.2 \`$.error.code\` equals the contract code. Needs SETUP-1.
`;

test('a suite without Shared Definitions parses exactly as before: no new key, no new warning', () => {
  const r = parseTestCases(suite({ cases: [CASE('TC-D-001')] }));
  assert.deepEqual(r.warnings, []);
  assert.equal('sharedDefinitions' in r.cases[0], false);
  assert.deepEqual(r.definitions, []);
});

test('definitions parse with kind, title, source and sub-check IDs', () => {
  const { definitions, warnings, present } = parseSharedDefinitions(DEFS);
  assert.equal(present, true);
  assert.deepEqual(warnings, []);
  assert.deepEqual(definitions.map((d) => [d.id, d.kind, d.title]), [
    ['SETUP-1', 'Setup', 'Signed-in client'],
    ['VR-01', 'Validation Rule', 'Error body contract'],
  ]);
  assert.equal(definitions[1].source, 'FR-7, API contract GET /users/{id} 404');
  assert.deepEqual(definitions[1].subIds, ['VR-01.1', 'VR-01.2']);
});

test('a citing case gets the cited text, including definitions cited by definitions', () => {
  const r = parseTestCases(suite({ defs: DEFS, cases: [CASE('TC-D-001', 'Apply VR-01.'), CASE('TC-D-002', 'SETUP-1.')] }));
  assert.deepEqual(r.warnings, []);
  assert.match(r.cases[0].sharedDefinitions, /### SETUP-1 — Signed-in client/, 'VR-01 cites SETUP-1, so it comes along');
  assert.match(r.cases[0].sharedDefinitions, /### VR-01 — Error body contract/);
  assert.doesNotMatch(r.cases[1].sharedDefinitions, /VR-01/);
  assert.deepEqual(r.definitionUsage.get('SETUP-1'), ['TC-D-001', 'TC-D-002']);
});

test('broken references, unused and malformed definitions are reported', () => {
  const defs = `## Shared Definitions

### VR-02 — No source
- VR-02.1 Something.

### VR-02 — Duplicate
**Source:** observed in the UI

### Not a definition
`;
  const r = parseTestCases(suite({ defs, cases: [CASE('TC-D-001', 'VR-02.9 and VR-07.')] }));
  const w = r.warnings.join('\n');
  assert.match(w, /VR-02: no \*\*Source:\*\* line/);
  assert.match(w, /duplicate ID VR-02/);
  assert.match(w, /Source "observed in the UI" names an observation/);
  assert.match(w, /"### Not a definition" is not a definition heading/);
  assert.match(w, /cites VR-07, which is not defined/);
  assert.match(w, /cites VR-02\.9, which VR-02 does not define/);
});

test('an unused definition is reported', () => {
  const r = parseTestCases(suite({ defs: DEFS, cases: [CASE('TC-D-001')] }));
  assert.ok(r.warnings.some((w) => /SETUP-1: defined but not used/.test(w)));
  assert.ok(r.warnings.some((w) => /VR-01: defined but not used/.test(w)));
});

test('a definition inside a fenced block or a comment is not a reference', () => {
  assert.deepEqual([...findReferences('<!-- SETUP-3 -->').ids], []);
  const r = parseTestCases(suite({ defs: DEFS, cases: [CASE('TC-D-001', 'SETUP-1.\n\n```\n### VR-01 — fake\n```')] }));
  assert.equal(r.cases[0].id, 'TC-D-001');
});

test('editing a cited definition changes the fingerprint of exactly the cases that cite it', () => {
  const before = parseTestCases(suite({ defs: DEFS, cases: [CASE('TC-D-001', 'Apply VR-01.'), CASE('TC-D-002', 'SETUP-1.'), CASE('TC-D-003')] })).cases;
  const edited = DEFS.replace('equals the contract code', 'equals `USER_NOT_FOUND`');
  const after = parseTestCases(suite({ defs: edited, cases: [CASE('TC-D-001', 'Apply VR-01.'), CASE('TC-D-002', 'SETUP-1.'), CASE('TC-D-003')] })).cases;
  assert.notEqual(materialText(before[0]), materialText(after[0]));
  assert.equal(materialText(before[1]), materialText(after[1]), 'SETUP-1 did not change');
  assert.equal(materialText(before[2]), materialText(after[2]), 'cites nothing');
  const g = designGate(after, before);
  assert.deepEqual(g.newOrChanged, ['TC-D-001']);
  assert.deepEqual(g.unchanged, ['TC-D-002', 'TC-D-003']);
});

test('the workbook writer is byte-identical without extra sheets, and adds them after sheet 1', () => {
  const rows = [['A', 'B'], ['1', '2']];
  assert.deepEqual(buildWorkbook({ sheetName: 'S', rows }), buildWorkbook({ sheetName: 'S', rows, extraSheets: [] }));
  const buf = buildWorkbook({ sheetName: 'S', rows, extraSheets: [{ sheetName: 'S', rows: [['X'], ['y']] }] });
  const s = buf.toString('latin1');
  assert.match(s, /<sheet name="S" sheetId="1" r:id="rId1"\/><sheet name="S \(2\)" sheetId="2" r:id="rId3"\/>/);
  assert.match(s, /xl\/worksheets\/sheet2\.xml/);
});

test('export writes a Shared Definitions sheet; --import-lifecycle still reads the cases sheet', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-'));
  try {
    const file = path.join(dir, 'TestCases_Demo.md');
    fs.writeFileSync(file, suite({ defs: DEFS, cases: [CASE('TC-D-001', 'Apply VR-01.')] }));
    const res = exportSuite(file);
    assert.equal(res.definitionCount, 2);
    const wb = readWorkbook(res.xlsxPath);
    const rows = wb.rows || wb;
    assert.equal(rows[0][0], 'Test Case ID', 'sheet 1 is still the cases');
    assert.equal(rows[1][0], 'TC-D-001');
    assert.ok(fs.readFileSync(res.xlsxPath).includes('Shared Definitions'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('api_contract impact scans the Shared Definitions a case cites', () => {
  const { casesOf } = require('../../api_contract/impact');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-impact-'));
  try {
    fs.mkdirSync(path.join(dir, 'test_design'));
    fs.writeFileSync(path.join(dir, 'test_design', 'TestCases_Demo.md'), suite({ defs: DEFS, cases: [CASE('TC-D-001', 'Apply VR-01.'), CASE('TC-D-002')] }));
    const cases = casesOf({ dir });
    assert.match(cases.find((c) => c.id === 'TC-D-001').text, /GET \/users\/\{id\}/, 'endpoint named only in VR-01');
    assert.doesNotMatch(cases.find((c) => c.id === 'TC-D-002').text, /GET \/users/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
