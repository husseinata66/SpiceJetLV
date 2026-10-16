// Runs the classification accuracy matrix against the real Swagger Petstore spec and reports, per case,
// whether the tool's result matches the independently justified expectation.
//   node tests/contracts/matrixRunner.js [--markdown]
const fs = require('fs');
const path = require('path');
const { parseYaml } = require('../../platform_core/tools/api_contract/yaml');
const { normalizeContract } = require('../../platform_core/tools/api_contract/normalize');
const { compareContracts } = require('../../platform_core/tools/api_contract/diff');
const { CASES } = require('./classificationMatrix');

const SPEC = path.join(__dirname, 'fixtures', 'swagger-petstore', 'openapi.yaml');

function runCase(c) {
  const raw = parseYaml(fs.readFileSync(SPEC, 'utf8'));
  const base = JSON.parse(JSON.stringify(raw));
  if (c.base) c.base(base);
  const cand = JSON.parse(JSON.stringify(base));
  c.mutate(cand);
  const d = compareContracts(normalizeContract(JSON.stringify(base)), normalizeContract(JSON.stringify(cand)));
  const problems = [];
  for (const e of c.expect) {
    const ok = d.items.some((i) => i.rule === e.rule && i.classification === e.classification && (!e.direction || i.direction === e.direction) && (!e.where || e.where(i)));
    if (!ok) problems.push(`missing ${e.rule}/${e.classification}${e.direction ? `/${e.direction}` : ''}`);
  }
  if (d.classification !== c.overall) problems.push(`overall ${d.classification}, expected ${c.overall}`);
  for (const r of c.absent || []) if (d.items.some((i) => i.rule === r)) problems.push(`unexpected ${r}`);
  // Nothing more severe than the expectation may appear unexplained.
  return { id: c.id, area: c.area, change: c.change, expected: c.overall, actual: d.classification, items: d.items.map((i) => `${i.rule}/${i.classification}${i.direction ? `/${i.direction}` : ''}`), ok: problems.length === 0, problems, why: c.why };
}

function runMatrix() { return CASES.map(runCase); }

if (require.main === module) {
  const rows = runMatrix();
  if (process.argv.includes('--markdown')) {
    console.log('| ID | Area | Change | Expected | Actual | Result | Justification |\n|---|---|---|---|---|---|---|');
    for (const r of rows) console.log(`| ${r.id} | ${r.area} | ${r.change.replace(/\|/g, '/')} | ${r.expected} | ${r.actual} | ${r.ok ? 'match' : `MISMATCH: ${r.problems.join('; ')}`} | ${r.why.replace(/\|/g, '/')} |`);
  } else {
    for (const r of rows) console.log(`${r.ok ? 'MATCH   ' : 'MISMATCH'} ${r.id.padEnd(3)} ${r.change}${r.ok ? '' : `\n         ${r.problems.join('; ')}\n         items: ${r.items.join(', ')}`}`);
  }
  const bad = rows.filter((r) => !r.ok).length;
  console.log(`${rows.length - bad}/${rows.length} match`);
  process.exitCode = bad ? 1 : 0;
}

module.exports = { runMatrix, runCase };
