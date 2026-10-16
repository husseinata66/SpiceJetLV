// Consumed versions — the exact content of an artifact a stage consumed, or an honest "cannot tell".
//
// WHY THIS EXISTS
// An assertion's Expected value must come from the approved test case (or contract) the execution stage
// actually consumed — not from whatever the suite says today (Phase 5.7). The entry gate records the
// fingerprint of every module artifact a stage consumed (`moduleArtifactRefs[]`), and since Phase 5.7 a
// content-addressed snapshot of it in the run's own folder (`metadata/consumed/<sha256>.md`). This module
// finds the content behind a recorded fingerprint, from sources that can prove they hold it:
//   snapshot — the run's own snapshot, whose fingerprint matches;
//   current  — the artifact on disk, unchanged since (its fingerprint still matches);
//   git      — a committed version of the artifact whose fingerprint matches;
//   unavailable / unrecorded — none of these: the version cannot be verified, and nothing is substituted.
// It reads; it never writes, and never returns content whose fingerprint does not match.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fingerprint = (text) => crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');

/** Where a run keeps its snapshots, relative to the data root. */
const snapshotRel = (folderName, sha256) => `runs/${folderName}/metadata/consumed/${sha256}.md`;

const gitCache = new Map();
function fromGit(dataRoot, artifactRel, want, execFileSync) {
  const key = `${dataRoot}|${artifactRel}|${want}`;
  if (gitCache.has(key)) return gitCache.get(key);
  let found = null;
  try {
    const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000, maxBuffer: 64 * 1024 * 1024 };
    const top = execFileSync('git', ['-C', dataRoot, 'rev-parse', '--show-toplevel'], opts).trim();
    const rel = path.relative(top, path.resolve(dataRoot, artifactRel)).replace(/\\/g, '/');
    const commits = execFileSync('git', ['-C', top, 'log', '--format=%H', '-n', '200', '--', rel], opts).split('\n').filter(Boolean);
    for (const c of commits) {
      let text;
      try { text = execFileSync('git', ['-C', top, 'show', `${c}:${rel}`], opts); } catch { continue; }
      if (fingerprint(text) === want) { found = { text, commit: c }; break; }
    }
  } catch { /* not a git repository, or git unavailable */ }
  gitCache.set(key, found);
  return found;
}

/**
 * The content behind one consumed-artifact reference.
 * @param {object|null} ref  a moduleArtifactRefs[] entry ({artifact, sha256, snapshot?})
 * @returns {{text: string|null, basis: 'snapshot'|'current'|'git'|'unavailable'|'unrecorded', source?: string}}
 */
function readConsumedVersion(ref, dataRoot, { execFileSync = require('child_process').execFileSync } = {}) {
  if (!ref || !ref.sha256) return { text: null, basis: 'unrecorded' };
  const want = ref.sha256;
  const tryFile = (abs) => { try { const t = fs.readFileSync(abs, 'utf8'); return fingerprint(t) === want ? t : null; } catch { return null; } };
  if (ref.snapshot) {
    const t = tryFile(path.resolve(dataRoot, ref.snapshot));
    if (t !== null) return { text: t, basis: 'snapshot', source: ref.snapshot };
  }
  const cur = tryFile(path.resolve(dataRoot, ref.artifact));
  if (cur !== null) return { text: cur, basis: 'current', source: ref.artifact };
  const g = fromGit(dataRoot, ref.artifact, want, execFileSync);
  if (g) return { text: g.text, basis: 'git', source: `${g.commit.slice(0, 12)}:${ref.artifact}` };
  return { text: null, basis: 'unavailable' };
}

/** Where a run keeps snapshots of the checkpoint artifacts it recorded an approval of (Phase 5.8). */
const approvedSnapshotRel = (folderName, sha256) => `runs/${folderName}/metadata/approved/${sha256}.md`;

/**
 * The content of `artifactRel` whose fingerprint is `sha256`, from any source that can prove it: a
 * snapshot in any run (consumed or approved — they are named by fingerprint), the file as it is now, or a
 * git commit. Null when none holds it — never another version.
 * @returns {null|{text: string, basis: 'snapshot'|'current'|'git', source: string}}
 */
function findVersion(dataRoot, artifactRel, sha256, { execFileSync = require('child_process').execFileSync } = {}) {
  if (!sha256) return null;
  const runsDir = path.join(dataRoot, 'runs');
  let runs = [];
  try { runs = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { /* none */ }
  for (const run of runs) {
    for (const rel of [snapshotRel(run, sha256), approvedSnapshotRel(run, sha256)]) {
      try {
        const t = fs.readFileSync(path.join(dataRoot, rel), 'utf8');
        if (fingerprint(t) === sha256) return { text: t, basis: 'snapshot', source: rel };
      } catch { /* not here */ }
    }
  }
  try {
    const t = fs.readFileSync(path.resolve(dataRoot, artifactRel), 'utf8');
    if (fingerprint(t) === sha256) return { text: t, basis: 'current', source: artifactRel };
  } catch { /* gone */ }
  const g = fromGit(dataRoot, artifactRel, sha256, execFileSync);
  return g ? { text: g.text, basis: 'git', source: `${g.commit.slice(0, 12)}:${artifactRel}` } : null;
}

/** The committed (HEAD) version of an artifact, or null outside a repository or for an untracked file. */
function headVersion(dataRoot, artifactRel, { execFileSync = require('child_process').execFileSync } = {}) {
  try {
    const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000, maxBuffer: 64 * 1024 * 1024 };
    const top = execFileSync('git', ['-C', dataRoot, 'rev-parse', '--show-toplevel'], opts).trim();
    const rel = path.relative(top, path.resolve(dataRoot, artifactRel)).replace(/\\/g, '/');
    return { text: execFileSync('git', ['-C', top, 'show', `HEAD:${rel}`], opts), basis: 'git-head', source: `HEAD:${rel}` };
  } catch { return null; }
}

/** True when a basis proves the content is the version that was consumed. */
const VERIFIED_BASES = Object.freeze(['snapshot', 'current', 'git']);

module.exports = { fingerprint, snapshotRel, approvedSnapshotRel, readConsumedVersion, findVersion, headVersion, VERIFIED_BASES };
