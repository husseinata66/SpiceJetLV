// The data-root boundary for every artifact path the Run Manager records, approves, snapshots or reads
// as a consumed version (Phase 9.1, audit finding F-07).
//
// A run's artifacts are process artifacts: they live under the data root, always. A path is refused
// when it
//   - contains a `..` segment — relative traversal is never needed to name an artifact, and allowing
//     it would make "inside" depend on how the path happens to normalise;
//   - is absolute and resolves outside the data root;
//   - resolves inside the data root lexically but escapes it through a symbolic link or a Windows
//     junction somewhere along the way (the real path is checked, not only the spelling).
// Refused with OUTSIDE_DATA_ROOT, before anything is recorded, fingerprinted or copied.

const fs = require('fs');
const path = require('path');

class PathBoundaryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RunStateError';
    this.code = 'OUTSIDE_DATA_ROOT';
  }
}

const toPosix = (p) => String(p).split(path.sep).join('/');

/** The real path of `abs`, or of its deepest existing ancestor with the rest appended. */
function realPathOf(abs) {
  let cur = abs;
  const rest = [];
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(cur), ...rest.reverse());
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return abs;
      rest.push(path.basename(cur));
      cur = parent;
    }
  }
}

const inside = (root, p) => {
  const r = path.relative(root, p);
  return r !== '' && !r.startsWith('..') && !path.isAbsolute(r);
};

/**
 * Resolves an artifact reference against the data root and proves it stays inside it.
 * Accepts a data-root-relative path (optionally prefixed with the data root's own folder name, the
 * spelling artifacts are often cited with) or an absolute path inside the data root.
 * @param {string} ref
 * @param {{dataRoot: string, what?: string}} opts
 * @returns {{abs: string, rel: string}} `rel` is data-root-relative, POSIX separators
 */
function resolveWithinDataRoot(ref, { dataRoot, what = 'artifact' }) {
  const raw = String(ref ?? '').trim();
  if (!raw) throw new PathBoundaryError(`An empty ${what} path is not a path.`);
  const slashed = raw.replace(/\\/g, '/');
  if (slashed.split('/').includes('..')) {
    throw new PathBoundaryError(
      `${what} "${raw}" contains a ".." segment. Artifact paths are written relative to the data root ` +
      `(${toPosix(dataRoot)}) without traversal — refused, nothing recorded.`
    );
  }
  const root = path.resolve(dataRoot);
  let abs;
  if (path.isAbsolute(raw) || /^[A-Za-z]:\//.test(slashed)) {
    abs = path.resolve(raw);
  } else {
    const prefix = `${path.basename(root)}/`;
    abs = path.resolve(root, slashed.startsWith(prefix) && !fs.existsSync(path.resolve(root, slashed)) ? slashed.slice(prefix.length) : slashed);
  }
  if (!inside(root, abs)) {
    throw new PathBoundaryError(
      `${what} "${raw}" resolves outside the data root (${toPosix(root)}). Run artifacts live under the ` +
      'data root; an outside file is never registered, approved or copied into run metadata.'
    );
  }
  const realRoot = realPathOf(root);
  const real = realPathOf(abs);
  if (!inside(realRoot, real)) {
    throw new PathBoundaryError(
      `${what} "${raw}" escapes the data root through a symbolic link or junction (it resolves to ` +
      `${toPosix(real)}). Refused, nothing recorded.`
    );
  }
  return { abs, rel: toPosix(path.relative(root, abs)) };
}

/** True when `ref` passes resolveWithinDataRoot(). */
function isWithinDataRoot(ref, opts) {
  try { resolveWithinDataRoot(ref, opts); return true; } catch { return false; }
}

module.exports = { PathBoundaryError, resolveWithinDataRoot, isWithinDataRoot, realPathOf };
