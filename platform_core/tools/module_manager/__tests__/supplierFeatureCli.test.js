// `cli.js supplier-feature <...>` — the Supplier Features layer's CLI namespace, kept separate from
// the module/feature verbs above it (module_architecture.md, Supplier Features section).
//
// Run as a real subprocess, same convention as cli.test.js: the behavior under test is argument
// handling and the exit code, which main() communicates through process.exitCode.

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI = path.join(__dirname, '..', 'cli.js');

function runCli(args, dir) {
  const argv = dir ? [...args, '--supplier-features-dir', dir] : args;
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...argv], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      code: err.status === undefined ? null : err.status,
      stdout: err.stdout === undefined ? '' : err.stdout,
      stderr: err.stderr === undefined ? '' : err.stderr,
    };
  }
}

function withDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-cli-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** Drives the Feature → shared-scope + Supplier lifecycle through the CLI. No Service tier. */
function seedFullTree(dir) {
  assert.equal(runCli([
    'supplier-feature', 'feature', 'propose', '--name', 'Import Booked PNR',
    '--integration-layer', 'ndc-core-service',
  ], dir).code, 0);
  assert.equal(
    runCli(['supplier-feature', 'feature', 'approve', 'import-booked-pnr', '--by', 'Reviewer'], dir).code, 0
  );
  assert.equal(runCli([
    'supplier-feature', 'shared', 'propose', 'import-booked-pnr', '--name', 'New Layer Contract',
  ], dir).code, 0);
  assert.equal(runCli([
    'supplier-feature', 'shared', 'approve', 'import-booked-pnr', 'new-layer-contract', '--by', 'Reviewer',
  ], dir).code, 0);
  assert.equal(
    runCli(['supplier-feature', 'shared', 'scaffold', 'import-booked-pnr', 'new-layer-contract'], dir).code, 0
  );
  assert.equal(runCli([
    'supplier-feature', 'supplier', 'propose', 'import-booked-pnr', '--name', 'Travelport NDC',
  ], dir).code, 0);
  assert.equal(runCli([
    'supplier-feature', 'supplier', 'approve', 'import-booked-pnr', 'travelport-ndc', '--by', 'Reviewer',
  ], dir).code, 0);
  assert.equal(
    runCli(['supplier-feature', 'supplier', 'scaffold', 'import-booked-pnr', 'travelport-ndc'], dir).code, 0
  );
}

test('there is no Service tier — `supplier-feature service ...` is not a sub-verb', () => {
  withDir((dir) => {
    const res = runCli(['supplier-feature', 'service', 'list'], dir);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /Usage: cli\.js supplier-feature </);
  });
});

test('the registry lives at supplier-features/modules.json, with no service.json anywhere', () => {
  withDir((dir) => {
    seedFullTree(dir);
    assert.ok(fs.existsSync(path.join(dir, 'modules.json')));
    assert.equal(fs.existsSync(path.join(dir, 'services.json')), false);
    assert.equal(fs.existsSync(path.join(dir, 'service.json')), false);
  });
});

test('feature/shared/supplier: full lifecycle produces the documented on-disk layout', () => {
  withDir((dir) => {
    seedFullTree(dir);
    const feature = path.join(dir, 'import-booked-pnr');
    assert.ok(fs.existsSync(path.join(feature, 'module.json')));
    assert.ok(fs.existsSync(path.join(feature, 'shared', 'new-layer-contract', 'feature.json')));
    assert.ok(fs.existsSync(path.join(feature, 'suppliers', 'travelport-ndc', 'supplier.json')));
    // A Supplier is never stored under a `features/` folder — it is not a Feature.
    assert.equal(fs.existsSync(path.join(feature, 'features')), false);
  });
});

test('a Feature records its integrationLayer as declared, and null when not declared', () => {
  withDir((dir) => {
    assert.equal(runCli([
      'supplier-feature', 'feature', 'propose', '--name', 'Import Booked PNR',
      '--integration-layer', 'ndc-core-service',
    ], dir).code, 0);
    // Ancillaries is Supplier-driven but NOT an NDC Core Service Feature — nothing may infer one.
    assert.equal(
      runCli(['supplier-feature', 'feature', 'propose', '--name', 'Ancillaries'], dir).code, 0
    );

    const res = runCli(['supplier-feature', 'feature', 'list', '--json'], dir);
    assert.equal(res.code, 0);
    const rows = JSON.parse(res.stdout);
    const byslug = Object.fromEntries(rows.map((r) => [r.slug, r]));
    assert.equal(byslug['import-booked-pnr'].integrationLayer, 'ndc-core-service');
    assert.equal(byslug.ancillaries.integrationLayer, null);
    assert.equal(byslug.ancillaries.kind, 'supplier_feature');
  });
});

test('set-integration-layer corrects an APPROVED Feature without touching stage history', () => {
  withDir((dir) => {
    seedFullTree(dir);
    // Give the Feature some real history first, so a reset would be visible.
    assert.equal(runCli([
      'supplier-feature', 'shared', 'stage', 'import-booked-pnr', 'new-layer-contract',
      'test_design', '--status', 'Approved',
    ], dir).code, 0);

    const before = readJson(path.join(dir, 'import-booked-pnr', 'module.json'));
    const res = runCli([
      'supplier-feature', 'feature', 'set-integration-layer', 'import-booked-pnr',
      '--value', 'some-other-integration',
    ], dir);
    assert.equal(res.code, 0);

    const after = readJson(path.join(dir, 'import-booked-pnr', 'module.json'));
    assert.equal(after.integrationLayer, 'some-other-integration');
    // Everything else is byte-identical: stages, approval record, creation time, child entities.
    assert.deepEqual(after.stages, before.stages);
    assert.deepEqual(after.features, before.features);
    assert.deepEqual(after.suppliers, before.suppliers);
    assert.equal(after.status, before.status);
    assert.equal(after.approvedAt, before.approvedAt);
    assert.equal(after.approvedBy, before.approvedBy);
    assert.equal(after.createdAt, before.createdAt);
  });
});

test('set-integration-layer accepts null, and refuses an unregistered Feature', () => {
  withDir((dir) => {
    seedFullTree(dir);
    assert.equal(runCli([
      'supplier-feature', 'feature', 'set-integration-layer', 'import-booked-pnr', '--value', 'null',
    ], dir).code, 0);
    assert.equal(
      readJson(path.join(dir, 'import-booked-pnr', 'module.json')).integrationLayer, null
    );

    const bad = runCli([
      'supplier-feature', 'feature', 'set-integration-layer', 'nope', '--value', 'x',
    ], dir);
    assert.equal(bad.code, 1);
    assert.match(bad.stderr, /No Feature "nope" is registered/);
  });
});

test('there is no generic field-update verb — only the one named mutation', () => {
  withDir((dir) => {
    seedFullTree(dir);
    const res = runCli(['supplier-feature', 'feature', 'update', 'import-booked-pnr'], dir);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /set-integration-layer/);
  });
});

test('supplier list shows the Supplier under its Feature, with no service back-reference', () => {
  withDir((dir) => {
    seedFullTree(dir);
    const res = runCli(['supplier-feature', 'supplier', 'list', 'import-booked-pnr', '--json'], dir);
    assert.equal(res.code, 0);
    const rows = JSON.parse(res.stdout);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].slug, 'travelport-ndc');
    assert.equal(rows[0].feature, 'import-booked-pnr');
    assert.equal(rows[0].service, undefined);
  });
});

test('the same Supplier name under two Features stays two independent entities', () => {
  withDir((dir) => {
    seedFullTree(dir);
    assert.equal(runCli([
      'supplier-feature', 'feature', 'propose', '--name', 'Ancillaries',
    ], dir).code, 0);
    assert.equal(
      runCli(['supplier-feature', 'feature', 'approve', 'ancillaries', '--by', 'Reviewer'], dir).code, 0
    );
    assert.equal(runCli([
      'supplier-feature', 'supplier', 'propose', 'ancillaries', '--name', 'Travelport NDC',
    ], dir).code, 0);
    assert.equal(runCli([
      'supplier-feature', 'supplier', 'approve', 'ancillaries', 'travelport-ndc', '--by', 'Reviewer',
    ], dir).code, 0);
    assert.equal(
      runCli(['supplier-feature', 'supplier', 'scaffold', 'ancillaries', 'travelport-ndc'], dir).code, 0
    );

    // Same name, same slug, two completely separate folders and state files.
    assert.ok(fs.existsSync(path.join(dir, 'import-booked-pnr', 'suppliers', 'travelport-ndc', 'supplier.json')));
    assert.ok(fs.existsSync(path.join(dir, 'ancillaries', 'suppliers', 'travelport-ndc', 'supplier.json')));

    // Staging one must never move the other.
    assert.equal(runCli([
      'supplier-feature', 'supplier', 'stage', 'import-booked-pnr', 'travelport-ndc',
      'discovery', '--status', 'Approved',
    ], dir).code, 0);
    const a = readJson(path.join(dir, 'import-booked-pnr', 'suppliers', 'travelport-ndc', 'supplier.json'));
    const b = readJson(path.join(dir, 'ancillaries', 'suppliers', 'travelport-ndc', 'supplier.json'));
    assert.equal(a.stages.discovery.status, 'Approved');
    assert.equal(b.stages.discovery.status, 'Not Started');
  });
});

test('use-feature and use-supplier set the pointer without naming any Service', () => {
  withDir((dir) => {
    seedFullTree(dir);
    assert.equal(runCli(['supplier-feature', 'use-feature', 'import-booked-pnr'], dir).code, 0);
    let reg = readJson(path.join(dir, 'modules.json'));
    assert.equal(reg.activeFeature, 'import-booked-pnr');
    assert.equal(reg.activeSupplier, null);

    assert.equal(
      runCli(['supplier-feature', 'use-supplier', 'import-booked-pnr', 'travelport-ndc'], dir).code, 0
    );
    reg = readJson(path.join(dir, 'modules.json'));
    assert.equal(reg.activeFeature, 'import-booked-pnr');
    assert.equal(reg.activeSupplier, 'travelport-ndc');

    // Switching Feature clears the Supplier beneath it — a stale Supplier pointer is never kept.
    assert.equal(runCli(['supplier-feature', 'use-feature', 'import-booked-pnr'], dir).code, 0);
    assert.equal(readJson(path.join(dir, 'modules.json')).activeSupplier, null);
  });
});

test('a Proposed Feature cannot be activated', () => {
  withDir((dir) => {
    assert.equal(runCli([
      'supplier-feature', 'feature', 'propose', '--name', 'Upselling',
    ], dir).code, 0);
    const res = runCli(['supplier-feature', 'use-feature', 'upselling'], dir);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /still Proposed/);
  });
});

test('inspect-scope reports overlap candidates and exits 2', () => {
  withDir((dir) => {
    seedFullTree(dir);
    const res = runCli([
      'supplier-feature', 'inspect-scope', '--name', 'Travelport NDC', '--json',
    ], dir);
    assert.equal(res.code, 2);
    const report = JSON.parse(res.stdout);
    assert.deepEqual(report.overlapCandidates.suppliers, ['import-booked-pnr/suppliers/travelport-ndc']);
    assert.equal(report.features[0].integrationLayer, 'ndc-core-service');
    // No `services` key — there is no Service tier to sweep.
    assert.equal(report.services, undefined);
  });
});

test('inspect-scope on a clean registry exits 0 with no candidates', () => {
  withDir((dir) => {
    const res = runCli(['supplier-feature', 'inspect-scope', '--name', 'Nothing', '--json'], dir);
    assert.equal(res.code, 0);
    const report = JSON.parse(res.stdout);
    assert.deepEqual(report.features, []);
    assert.deepEqual(report.overlapCandidates.features, []);
  });
});

test('an unknown flag under the supplier-feature namespace still fails loudly', () => {
  withDir((dir) => {
    const res = runCli(['supplier-feature', 'feature', 'propose', '--name', 'X', '--nope', 'y'], dir);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /--nope/);
  });
});

test('proposing a Feature scaffolds nothing until it is approved', () => {
  withDir((dir) => {
    assert.equal(runCli([
      'supplier-feature', 'feature', 'propose', '--name', 'Refund',
    ], dir).code, 0);
    // Registered and traceable, but no folder — a folder on disk reads as an approved Feature.
    assert.equal(fs.existsSync(path.join(dir, 'refund')), false);
    const rows = JSON.parse(runCli(['supplier-feature', 'feature', 'list', '--json'], dir).stdout);
    assert.equal(rows.find((r) => r.slug === 'refund').status, 'Proposed');
  });
});

test('supplier capabilities records answers into supplier.json and prints them', () => withDir((dir) => {
  seedFullTree(dir);
  const set = runCli([
    'supplier-feature', 'supplier', 'capabilities', 'import-booked-pnr', 'travelport-ndc',
    '--hold', 'no', '--pay-after-hold', 'no', '--bundle', 'yes', '--seat', 'yes', '--by', 'QA Lead',
  ], dir);
  assert.equal(set.code, 0, set.stderr);
  assert.match(set.stdout, /Hold\s+Not Supported/);
  assert.match(set.stdout, /Meal\s+Unknown/);
  const state = readJson(path.join(dir, 'import-booked-pnr', 'suppliers', 'travelport-ndc', 'supplier.json'));
  assert.equal(state.capabilities.bundle, 'Supported');
  assert.equal(state.capabilityHistory[0].by, 'QA Lead');

  const shown = runCli([
    'supplier-feature', 'supplier', 'capabilities', 'import-booked-pnr', 'travelport-ndc', '--json',
  ], dir);
  assert.equal(JSON.parse(shown.stdout).seat, 'Supported');
}));

test('supplier capabilities without --by is refused and writes nothing', () => withDir((dir) => {
  seedFullTree(dir);
  const r = runCli([
    'supplier-feature', 'supplier', 'capabilities', 'import-booked-pnr', 'travelport-ndc', '--hold', 'yes',
  ], dir);
  assert.equal(r.code, 1);
  const state = readJson(path.join(dir, 'import-booked-pnr', 'suppliers', 'travelport-ndc', 'supplier.json'));
  assert.equal(state.capabilities, undefined);
}));

test('supplier rules records slugs, and "none" as an empty recorded list', () => withDir((dir) => {
  seedFullTree(dir);
  const base = ['supplier-feature', 'supplier', 'rules', 'import-booked-pnr', 'travelport-ndc'];
  assert.match(runCli(base, dir).stdout, /not yet asked/);
  assert.equal(runCli([...base, '--value', 'ladies-only-seats', '--by', 'QA'], dir).code, 0);
  assert.match(runCli(base, dir).stdout, /ladies-only-seats/);
  assert.equal(runCli([...base, '--value', 'none', '--by', 'QA'], dir).code, 0);
  assert.match(runCli(base, dir).stdout, /: None/);
}));
