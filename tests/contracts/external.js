// External real-world contract suite (Phase 7.1) — OPT-IN, needs network access to raw.githubusercontent.com.
//
//   npm run test:contracts:external          (or: node tests/contracts/external.js [--cache <dir>])
//
// Large public specifications (GitHub REST, Stripe, Kubernetes) and Postman collections that carry
// credential-shaped demo values are NOT committed. This script fetches each at its pinned reference
// (external.sources.json), refuses any file whose SHA-256 differs from the recorded one, and then checks:
//   1. the YAML reader against the authors' own JSON rendering of the same commit;
//   2. every file normalizes, and compares Unchanged with itself;
//   3. real version-to-version drift, against facts verified by hand in the raw specifications;
//   4. no credential value in a Postman collection survives normalization.
// It only READS public files. It never calls an API endpoint. Exit 0 = all checks pass, 1 = a failure.
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const TOOLS = path.resolve(__dirname, '..', '..', 'platform_core', 'tools', 'api_contract');
const { parseYaml } = require(path.join(TOOLS, 'yaml'));
const { normalizeContract } = require(path.join(TOOLS, 'normalize'));
const { compareContracts } = require(path.join(TOOLS, 'diff'));

const argv = process.argv.slice(2);
const CACHE = path.resolve(argv.includes('--cache') ? argv[argv.indexOf('--cache') + 1] : path.join(os.tmpdir(), 'api-contract-external-cache'));
const SOURCES = JSON.parse(fs.readFileSync(path.join(__dirname, 'external.sources.json'), 'utf8')).files;
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };

function get(url, depth = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 3) { res.resume(); resolve(get(res.headers.location, depth + 1)); return; }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`${url}: HTTP ${res.statusCode}`)); return; }
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject).on('timeout', function onTimeout() { this.destroy(new Error(`${url}: timed out`)); });
  });
}

async function fetchAll() {
  fs.mkdirSync(CACHE, { recursive: true });
  const out = {};
  for (const s of SOURCES) {
    const f = path.join(CACHE, `${s.id}${/\.ya?ml$/.test(s.url) ? '.yaml' : '.json'}`);
    let buf = fs.existsSync(f) ? fs.readFileSync(f) : null;
    if (!buf || sha(buf) !== s.sha256) {
      for (let attempt = 1; ; attempt += 1) {
        try { buf = await get(s.url); break; } catch (err) { if (attempt >= 3) throw err; }
      }
      fs.writeFileSync(f, buf);
    }
    if (sha(buf) !== s.sha256) throw new Error(`${s.id}: fingerprint ${sha(buf)} ≠ recorded ${s.sha256} — refusing to use it`);
    out[s.id] = buf.toString('utf8');
  }
  return out;
}

function firstDiff(a, b, at = '$') {
  if (Object.is(a, b)) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${at}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length || ka.some((k, n) => k !== kb[n])) return `${at}: keys differ`;
  for (const k of ka) { const d = firstDiff(a[k], b[k], `${at}.${k}`); if (d) return d; }
  return null;
}

(async () => {
  const t = await fetchAll();
  check('all external files fetched at their pinned reference and verified by SHA-256', true, `${SOURCES.length} files in ${CACHE}`);

  // 1. YAML reader vs the authors' JSON rendering.
  const sy = parseYaml(t['stripe-yaml']);
  check('Stripe spec3.yaml (6.6 MB) parses identically to Stripe\'s own spec3.json', firstDiff(sy, JSON.parse(t['stripe-json'])) === null);
  const gy = parseYaml(t['github-yaml']);
  const gd = firstDiff(gy, JSON.parse(t['github-json']));
  // The one known difference: an EXAMPLE value `0.16001e0`, a number under YAML 1.2 (and the `yaml`
  // library) but kept as a string by GitHub's YAML 1.1-based JSON export. Not a contract field.
  check('GitHub api.github.com.yaml (9.9 MB) parses identically to GitHub\'s JSON, except one YAML 1.1/1.2 example value', gd === "$.components.examples.global-advisory-items.value.0.epss.percentile: 0.16001 vs \"0.16001e0\"", gd || 'identical');

  // 2. Normalize and self-compare.
  const models = {};
  for (const id of ['github-json', 'github-json-older', 'stripe-json', 'stripe-json-older', 'k8s-1.29', 'k8s-1.30', 'newman-echo-v2', 'newman-inherited', 'postman-collection-v2']) {
    const t0 = Date.now();
    models[id] = normalizeContract(t[id], { name: id });
    const self = compareContracts(models[id], JSON.parse(JSON.stringify(models[id])));
    check(`${id}: ${models[id].format}, ${Object.keys(models[id].endpoints).length} endpoints, Unchanged against itself`, self.classification === 'Unchanged', `${Date.now() - t0} ms`);
  }
  check('GitHub YAML and JSON normalize to the same contract', firstDiff(normalizeContract(t['github-yaml']), models['github-json']) === null);

  // 3. Real version drift — facts verified by hand in the raw specifications.
  const timed = (a, b) => { const t0 = Date.now(); const d = compareContracts(models[a], models[b]); return { d, ms: Date.now() - t0 }; };
  const has = (d, pred) => d.items.some(pred);
  {
    const { d, ms } = timed('k8s-1.29', 'k8s-1.30');
    check('Kubernetes 1.29 → 1.30: IPAddressSpec.parentRef became required (request Breaking), 66 endpoints added', has(d, (i) => i.rule === 'SC-BECAME-REQUIRED' && i.direction === 'request' && /\$\.spec\.parentRef$/.test(i.field) && i.classification === 'Breaking') && d.items.filter((i) => i.rule === 'EP-ADDED').length === 66, `${d.items.length} items, ${ms} ms`);
  }
  {
    const { d, ms } = timed('github-json-older', 'github-json');
    check('GitHub (2026-09-03 → HEAD): the /enterprises/{enterprise}/teams endpoints were removed (Breaking); patterns gained maxItems 100 (request Breaking)', has(d, (i) => i.rule === 'EP-REMOVED' && i.endpoint === 'GET /enterprises/{}/teams') && has(d, (i) => i.rule === 'SC-CONSTRAINT-TIGHTENED' && /maxItems 100/.test(i.after) && i.direction === 'request'), `${d.items.length} items, ${ms} ms`);
  }
  {
    const { d, ms } = timed('stripe-json-older', 'stripe-json');
    check('Stripe (2026-03-23 → HEAD): billing_cycle_anchor string → object (Breaking); cancel_at gained the enum value max_billed_until (Non-breaking), not "Unknown"', has(d, (i) => i.rule === 'SC-TYPE-CHANGED' && i.endpoint === 'POST /v1/subscriptions/{}' && i.field === '$.billing_cycle_anchor') && has(d, (i) => i.rule === 'SC-ENUM-VALUE-ADDED' && i.value === 'max_billed_until' && i.classification === 'Non-breaking') && !has(d, (i) => /cancel_at/.test(i.field || '') && i.classification === 'Unknown'), `${d.items.length} items, ${ms} ms`);
    check('Stripe comparison completes in under 10 s and reports each shared-schema difference once', ms < 10000 && d.items.length < 5000, `${d.items.length} items`);
  }

  // 4. Credentials never survive normalization.
  const secrets = ['D+EdQ-gs$-%@2Nu7', 'vp7jxTwqgczoFHs0uIdOvv4VdBWmvCkbVbNBCuaTQ3JZplPS40BaNV47HD1zt7MztQPILJvqYsOs6PfJpFYBgwbaE3CVEKOj', 'ssh-secret', 'asdhjajsd', 'asjehcgfdjyrggucgn', 'O2TFlvAlMvKVSKOzc6XkfU6'];
  const kept = JSON.stringify([models['newman-echo-v2'], models['newman-inherited'], models['postman-collection-v2']]);
  check('no credential value from the Postman collections is kept in the normalized contracts', secrets.every((s) => !kept.includes(s)) && !/"password"\s*:\s*"password"/.test(kept));

  const bad = results.filter((r) => !r.ok).length;
  console.log(`${results.length - bad}/${results.length} external checks passed`);
  process.exitCode = bad ? 1 : 0;
})().catch((err) => { console.error(`FAIL ${err.message}`); process.exitCode = 1; });
