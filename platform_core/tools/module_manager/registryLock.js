// Registry concurrency (Phase 9.4) — every Module Manager read-modify-write holds one exclusive lock per
// registry folder, so two processes approving, proposing or switching scope at the same moment can no longer
// both read the old registry and have the second write silently drop the first one's change.
//
// The lock file sits BESIDE the registry folder (`<modulesDir>.registry.lock`), so taking it never creates the
// folder. It is reentrant within a process: an operation that calls another locked operation on the same
// registry does not wait for itself. Built on run_manager/atomicFile.withFileLock (bounded wait, stale-lock
// recovery), the same lock the run state uses.

'use strict';

const path = require('path');
const { withFileLock } = require('../run_manager/atomicFile');

const held = new Map();
const keyOf = (dir) => { const p = path.resolve(String(dir)); return process.platform === 'win32' ? p.toLowerCase() : p; };

function withRegistryLock(dir, fn) {
  if (!dir) return fn();
  const key = keyOf(dir);
  if (held.has(key)) {
    held.set(key, held.get(key) + 1);
    try { return fn(); } finally { held.set(key, held.get(key) - 1); }
  }
  return withFileLock(`${path.resolve(String(dir))}.registry.lock`, () => {
    held.set(key, 1);
    try { return fn(); } finally { held.delete(key); }
  });
}

/** Replaces the named exports with versions that hold the registry lock of their first argument. */
function lockExports(exp, names) {
  for (const n of names) {
    const fn = exp[n];
    if (typeof fn !== 'function') throw new Error(`registryLock: ${n} is not an exported function`);
    exp[n] = function lockedRegistryOperation(...args) { return withRegistryLock(args[0], () => fn.apply(this, args)); };
  }
  return exp;
}

module.exports = { withRegistryLock, lockExports };
