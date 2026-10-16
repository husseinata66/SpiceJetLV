// Run scope registration (Phase 9.2, audit finding F-11).
//
// A run is bound to registered, ELIGIBLE scope — never to a name that merely looks like a module:
//   modules[]                       each registered in modules/modules.json and Active;
//   moduleFeature                   registered under its (single) module and Active;
//   scopeFamily supplier-feature    the Supplier Feature registered in supplier-features/ and Active, and
//                                   exactly one of: the Supplier registered under it and Active, or the
//                                   shared scope registered under it and Active.
// Proposed, Superseded and Archived entities are not eligible: a Proposed entity has no approved scope
// yet, and a retired one must not receive new runs. A run that names no scope at all (a bare global run)
// has nothing to check. Reading only — the registries are owned by the Module Manager.

const path = require('path');

/** Every reason the scope cannot be bound, or [] when it can. */
function runScopeProblems(dataRoot, scope = {}) {
  // eslint-disable-next-line global-require
  const { readRegistry } = require('../module_manager/moduleRegistry');
  // eslint-disable-next-line global-require
  const { listFeatures } = require('../module_manager/featureRegistry');
  // eslint-disable-next-line global-require
  const { findSupplier } = require('../module_manager/supplierRegistry');
  const problems = [];
  const modulesDir = path.join(dataRoot, 'modules');
  const sfDir = path.join(dataRoot, 'supplier-features');
  const entryIn = (dir, slug) => { try { return (readRegistry(dir).modules || []).find((m) => m.slug === slug) || null; } catch { return null; } };
  const eligible = (what, slug, entry) => {
    if (!entry) { problems.push(`${what} "${slug}" is not registered`); return false; }
    if (entry.status !== 'Active') { problems.push(`${what} "${slug}" is ${entry.status}, not approved (Active)`); return false; }
    return true;
  };

  if (Array.isArray(scope.modules)) {
    for (const m of scope.modules) eligible('Module', m, entryIn(modulesDir, m));
    if (scope.moduleFeature) {
      const parent = scope.modules[0];
      let f = null;
      try { f = (listFeatures(modulesDir, parent) || []).find((x) => x.slug === scope.moduleFeature) || null; } catch { f = null; }
      eligible(`Feature (under module "${parent}")`, scope.moduleFeature, f);
    }
  }
  if (scope.scopeFamily === 'supplier-feature') {
    if (eligible('Supplier Feature', scope.feature, entryIn(sfDir, scope.feature))) {
      if (scope.supplier) {
        let s = null;
        try { s = findSupplier(sfDir, scope.feature, scope.supplier) || null; } catch { s = null; }
        eligible(`Supplier (under "${scope.feature}")`, scope.supplier, s);
      }
      if (scope.sharedScope) {
        let sh = null;
        try { sh = (listFeatures(sfDir, scope.feature) || []).find((x) => x.slug === scope.sharedScope) || null; } catch { sh = null; }
        eligible(`Shared scope (under "${scope.feature}")`, scope.sharedScope, sh);
      }
    }
  }
  return problems;
}

module.exports = { runScopeProblems };
