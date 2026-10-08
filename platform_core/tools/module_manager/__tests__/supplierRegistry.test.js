// Supplier Registry — Suppliers registered under a Supplier Feature.
//
// A Feature is implemented by reusing moduleRegistry.js wholesale: `supplier-features/` is passed as
// its `modulesDir`, and the Feature slug is its "module" slug. These tests therefore seed a Feature
// the same way, then exercise supplierRegistry.js against it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { registerModule, readModuleState, readRegistry } = require('../moduleRegistry');
const { scaffoldModule } = require('../moduleScaffold');
const {
  SupplierRegistryError,
  proposeSupplier,
  approveSuppliers,
  recordSupplierStage,
  resolveSupplier,
  scaffoldSupplier,
  listSuppliers,
  listAllSuppliers,
  findSupplier,
  hasSuppliers,
} = require('../supplierRegistry');

const NOW = new Date('2026-09-02T08:00:00Z');
const LATER = new Date('2026-09-02T09:00:00Z');

function makeSvcDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'supplier-registry-test-'));
  const svcDir = path.join(root, 'supplier-features');
  fs.mkdirSync(svcDir, { recursive: true });
  return svcDir;
}
const cleanup = (d) => fs.rmSync(path.dirname(d), { recursive: true, force: true });

/** Seeds an Active, scaffolded Feature — the host a Supplier registers under. */
function seedFeature(svcDir, name = 'Import Booked PNR') {
  const { entry } = registerModule(
    svcDir,
    { name, status: 'Active', kind: 'supplier_feature', integrationLayer: 'ndc-core-service' },
    { now: NOW }
  );
  scaffoldModule(svcDir, entry.slug, { now: NOW });
  return entry.slug;
}

function seedSupplier(svcDir, featureSlug, name = 'NDCGal') {
  const { supplier } = proposeSupplier(svcDir, featureSlug, { name }, { now: NOW });
  approveSuppliers(svcDir, featureSlug, [supplier.slug], { now: NOW, approvedBy: 'Reviewer' });
  return supplier.slug;
}

test('a Feature carries kind:supplier_feature and its integrationLayer — never a plain module', () => {
  const svcDir = makeSvcDir();
  try {
    const slug = seedFeature(svcDir);
    const state = readModuleState(svcDir, slug);
    assert.equal(state.kind, 'supplier_feature');
    // The integration layer is METADATA on the Feature, not a folder tier above it — which is what
    // lets a Supplier Feature declare a different backend, or none at all.
    assert.equal(state.integrationLayer, 'ndc-core-service');
    assert.equal(state.service, undefined);
  } finally {
    cleanup(svcDir);
  }
});

test('proposeSupplier requires the parent Feature to exist first', () => {
  const svcDir = makeSvcDir();
  try {
    assert.throws(
      () => proposeSupplier(svcDir, 'nonexistent', { name: 'NDCGal' }, { now: NOW }),
      (err) => err instanceof SupplierRegistryError && /No Feature "nonexistent"/.test(err.message)
    );
  } finally {
    cleanup(svcDir);
  }
});

test('a proposed Supplier is not scaffolded, and scaffolding one is refused', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    const { supplier } = proposeSupplier(svcDir, featureSlug, { name: 'NDCGal' }, { now: NOW });
    assert.equal(supplier.status, 'Proposed');
    assert.equal(fs.existsSync(path.join(svcDir, featureSlug, 'suppliers')), false);
    assert.throws(
      () => scaffoldSupplier(svcDir, featureSlug, supplier.slug, { now: NOW }),
      (err) => err instanceof SupplierRegistryError && /still Proposed/.test(err.message)
    );
  } finally {
    cleanup(svcDir);
  }
});

test('approving a Supplier requires an approver', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    proposeSupplier(svcDir, featureSlug, { name: 'NDCGal' }, { now: NOW });
    assert.throws(
      () => approveSuppliers(svcDir, featureSlug, [], { now: NOW }),
      (err) => err instanceof SupplierRegistryError && /approvedBy/.test(err.message)
    );
  } finally {
    cleanup(svcDir);
  }
});

test('scaffolding an approved Supplier creates suppliers/<slug>/ with eager context/discovery', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    const supplierSlug = seedSupplier(svcDir, featureSlug);
    scaffoldSupplier(svcDir, featureSlug, supplierSlug, { now: NOW });

    const dir = path.join(svcDir, featureSlug, 'suppliers', supplierSlug);
    assert.ok(fs.existsSync(path.join(dir, 'context')));
    assert.ok(fs.existsSync(path.join(dir, 'discovery')));
    assert.ok(fs.existsSync(path.join(dir, 'supplier.json')));
    assert.equal(fs.existsSync(path.join(dir, 'test_design')), false);

    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'supplier.json'), 'utf8'));
    // (feature, slug) is a Supplier's whole identity — there is no `service` back-reference, and the
    // parent Feature's integrationLayer is deliberately NOT copied down onto its Suppliers.
    assert.equal(onDisk.feature, featureSlug);
    assert.equal(onDisk.service, undefined);
    assert.equal(onDisk.integrationLayer, undefined);
  } finally {
    cleanup(svcDir);
  }
});

test('two Suppliers with the same name under DIFFERENT Features are independent', () => {
  const svcDir = makeSvcDir();
  try {
    const refund = seedFeature(svcDir, 'Refund');
    const pnr = seedFeature(svcDir, 'Import Booked PNR');
    const refundGal = seedSupplier(svcDir, refund, 'NDCGal');
    const pnrGal = seedSupplier(svcDir, pnr, 'NDCGal');

    scaffoldSupplier(svcDir, refund, refundGal, { now: NOW });
    scaffoldSupplier(svcDir, pnr, pnrGal, { now: NOW });

    recordSupplierStage(svcDir, refund, refundGal, 'context', { status: 'Approved' }, { now: NOW });

    // The SAME supplier name under a different Feature is untouched.
    assert.equal(findSupplier(svcDir, pnr, pnrGal).stages.context.status, 'Not Started');
    assert.equal(findSupplier(svcDir, refund, refundGal).stages.context.status, 'Approved');
  } finally {
    cleanup(svcDir);
  }
});

test('recording a Supplier stage never advances the parent Feature stage', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    const supplierSlug = seedSupplier(svcDir, featureSlug);
    scaffoldSupplier(svcDir, featureSlug, supplierSlug, { now: NOW });

    recordSupplierStage(svcDir, featureSlug, supplierSlug, 'test_design', { status: 'Approved' }, { now: NOW });

    assert.equal(findSupplier(svcDir, featureSlug, supplierSlug).stages.test_design.status, 'Approved');
    const feature = readModuleState(svcDir, featureSlug);
    assert.equal(feature.stages.test_design.status, 'Not Started');
  } finally {
    cleanup(svcDir);
  }
});

test('a Supplier stage increments its own revision count, and writes supplier.json when on disk', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    const supplierSlug = seedSupplier(svcDir, featureSlug);
    scaffoldSupplier(svcDir, featureSlug, supplierSlug, { now: NOW });

    recordSupplierStage(svcDir, featureSlug, supplierSlug, 'context', { status: 'Draft' }, { now: NOW });
    const second = recordSupplierStage(
      svcDir, featureSlug, supplierSlug, 'context', { status: 'Approved' }, { now: LATER }
    );
    assert.equal(second.stages.context.revisionCount, 2);

    const onDisk = JSON.parse(fs.readFileSync(
      path.join(svcDir, featureSlug, 'suppliers', supplierSlug, 'supplier.json'), 'utf8'
    ));
    assert.equal(onDisk.stages.context.status, 'Approved');
  } finally {
    cleanup(svcDir);
  }
});

test('an unregistered Supplier cannot record a stage', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    assert.throws(
      () => recordSupplierStage(svcDir, featureSlug, 'ghost', 'context', { status: 'Draft' }, { now: NOW }),
      (err) => err instanceof SupplierRegistryError && /No Supplier "ghost"/.test(err.message)
    );
  } finally {
    cleanup(svcDir);
  }
});

test('resolveSupplier reports which stage folders actually exist on disk', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    const supplierSlug = seedSupplier(svcDir, featureSlug);
    scaffoldSupplier(svcDir, featureSlug, supplierSlug, { now: NOW });

    const resolved = resolveSupplier(svcDir, featureSlug, supplierSlug);
    assert.equal(resolved.onDisk, true);
    assert.deepEqual(resolved.stagesPresent, ['context', 'discovery']);
  } finally {
    cleanup(svcDir);
  }
});

test('a Feature with no Suppliers reports hasSuppliers false and an empty list', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    assert.equal(hasSuppliers(svcDir, featureSlug), false);
    assert.deepEqual(listSuppliers(svcDir, featureSlug), []);
  } finally {
    cleanup(svcDir);
  }
});

test('listAllSuppliers flattens Suppliers across every Feature under one service', () => {
  const svcDir = makeSvcDir();
  try {
    const refund = seedFeature(svcDir, 'Refund');
    const pnr = seedFeature(svcDir, 'Import Booked PNR');
    seedSupplier(svcDir, refund, 'NDCGal');
    seedSupplier(svcDir, pnr, 'SabreNDC');

    const all = listAllSuppliers(svcDir);
    assert.equal(all.length, 2);
    assert.deepEqual(all.map((s) => s.feature).sort(), [pnr, refund].sort());
  } finally {
    cleanup(svcDir);
  }
});

test('the suppliers[] cache lands in BOTH the Feature module.json and the modules.json registry', () => {
  const svcDir = makeSvcDir();
  try {
    const featureSlug = seedFeature(svcDir);
    seedSupplier(svcDir, featureSlug, 'NDCGal');

    const state = readModuleState(svcDir, featureSlug);
    assert.equal(state.suppliers.length, 1);

    const registry = readRegistry(svcDir);
    const cached = registry.modules.find((m) => m.slug === featureSlug);
    assert.equal(cached.suppliers.length, 1);
  } finally {
    cleanup(svcDir);
  }
});

// ── Supplier capabilities and rules ────────────────────────────────────────────────────────────
const {
  setSupplierCapabilities, setSupplierRules, emptyCapabilities,
} = require('../supplierRegistry');

test('capabilities default to Unknown and merge answers, keeping a history', () => {
  const svcDir = makeSvcDir();
  try {
    const f = seedFeature(svcDir);
    const s = seedSupplier(svcDir, f);
    assert.deepEqual(emptyCapabilities(), {
      hold: 'Unknown', payAfterHold: 'Unknown',
      meal: 'Unknown', baggage: 'Unknown', seat: 'Unknown', bundle: 'Unknown',
    });
    setSupplierCapabilities(svcDir, f, s, { hold: 'no', seat: 'yes' }, { now: NOW, setBy: 'QA' });
    const updated = setSupplierCapabilities(svcDir, f, s, { meal: 'Supported' }, { now: LATER, setBy: 'QA' });
    assert.equal(updated.capabilities.hold, 'Not Supported');
    assert.equal(updated.capabilities.seat, 'Supported');
    assert.equal(updated.capabilities.meal, 'Supported');
    assert.equal(updated.capabilities.bundle, 'Unknown');
    assert.equal(updated.capabilityHistory.length, 2);
    assert.equal(findSupplier(svcDir, f, s).capabilities.meal, 'Supported');
  } finally { cleanup(svcDir); }
});

test('Pay after Hold cannot be Supported without Hold', () => {
  const svcDir = makeSvcDir();
  try {
    const f = seedFeature(svcDir);
    const s = seedSupplier(svcDir, f);
    assert.throws(
      () => setSupplierCapabilities(svcDir, f, s, { payAfterHold: 'yes' }, { now: NOW, setBy: 'QA' }),
      SupplierRegistryError
    );
    assert.throws(
      () => setSupplierCapabilities(svcDir, f, s, { hold: 'no', payAfterHold: 'yes' }, { now: NOW, setBy: 'QA' }),
      SupplierRegistryError,
      'asking for both at once is a contradiction, not something to quietly resolve'
    );
    assert.equal(findSupplier(svcDir, f, s).capabilities, undefined, 'nothing written on refusal');
  } finally { cleanup(svcDir); }
});

test('turning Hold off takes Pay after Hold with it, recorded in the history', () => {
  const svcDir = makeSvcDir();
  try {
    const f = seedFeature(svcDir);
    const s = seedSupplier(svcDir, f);
    setSupplierCapabilities(svcDir, f, s, { hold: 'yes', payAfterHold: 'yes' }, { now: NOW, setBy: 'QA' });
    const after = setSupplierCapabilities(svcDir, f, s, { hold: 'no' }, { now: LATER, setBy: 'QA' });
    assert.equal(after.capabilities.hold, 'Not Supported');
    assert.equal(after.capabilities.payAfterHold, 'Not Supported', 'it follows Hold down');
    assert.deepEqual(
      after.capabilityHistory[1].changes,
      { hold: 'Not Supported', payAfterHold: 'Not Supported' },
      'the implied change is recorded, not silent'
    );
  } finally { cleanup(svcDir); }
});

test('Pay after Hold cannot stand on an Unknown Hold either', () => {
  const svcDir = makeSvcDir();
  try {
    const f = seedFeature(svcDir);
    const s = seedSupplier(svcDir, f);
    // Unknown is treated as Not Supported by the capability gate, so it cannot support a later payment.
    assert.throws(
      () => setSupplierCapabilities(svcDir, f, s, { payAfterHold: 'Supported' }, { now: NOW, setBy: 'QA' }),
      SupplierRegistryError
    );
  } finally { cleanup(svcDir); }
});

test('unknown capability names, bad values, and a missing setBy are refused', () => {
  const svcDir = makeSvcDir();
  try {
    const f = seedFeature(svcDir);
    const s = seedSupplier(svcDir, f);
    assert.throws(() => setSupplierCapabilities(svcDir, f, s, { refund: 'yes' }, { now: NOW, setBy: 'QA' }),
      SupplierRegistryError);
    assert.throws(() => setSupplierCapabilities(svcDir, f, s, { seat: 'maybe' }, { now: NOW, setBy: 'QA' }),
      SupplierRegistryError);
    assert.throws(() => setSupplierCapabilities(svcDir, f, s, { seat: 'yes' }, { now: NOW }),
      SupplierRegistryError);
  } finally { cleanup(svcDir); }
});

test('supplier rules record a list, and an empty list is a recorded None', () => {
  const svcDir = makeSvcDir();
  try {
    const f = seedFeature(svcDir);
    const s = seedSupplier(svcDir, f);
    assert.equal(findSupplier(svcDir, f, s).supplierRulesSetAt, undefined);
    const withRule = setSupplierRules(svcDir, f, s, ['ladies-only-seats', 'ladies-only-seats'],
      { now: NOW, setBy: 'QA' });
    assert.deepEqual(withRule.supplierRules, ['ladies-only-seats']);
    const none = setSupplierRules(svcDir, f, s, [], { now: LATER, setBy: 'QA' });
    assert.deepEqual(none.supplierRules, []);
    assert.ok(none.supplierRulesSetAt);
    assert.throws(() => setSupplierRules(svcDir, f, s, ['Not A Slug'], { now: NOW, setBy: 'QA' }));
  } finally { cleanup(svcDir); }
});
