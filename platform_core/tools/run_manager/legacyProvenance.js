// Legacy approval provenance (Phase 9.1, audit finding F-01).
//
// An artifact header that reads Approved is text anyone can write. On its own it never authorizes a
// downstream stage: the run state model must hold a recorded, named approval whose fingerprint matches
// the content (stageGate.checkArtifact). Artifacts approved BEFORE the run state model existed have no
// such record, so they are carried forward by one route only — a LEGACY APPROVAL ATTESTATION:
//
//   - a named human, with a reason, attests it in a NEW (state-model) run — nothing is written into the
//     historical run, which stays immutable;
//   - the artifact has no recorded approval history at all (a recorded rejection, revocation or open
//     review is never laundered into an approval);
//   - a real legacy run (one with no state model) references the artifact, in a file that is committed
//     to git and unmodified — provenance comes from repository history, not from the header, a date or
//     a folder name an agent could create;
//   - the artifact itself is committed and unmodified, and its fingerprint is recorded, so any later
//     edit makes the attestation stale exactly like a modified approval.
//
// The attestation is an approval decision by the named person; the platform never makes one.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { fingerprintFile } = require('./artifactHeader');

const TEXT_EXT = /\.(md|json|txt|csv|ya?ml)$/i;
const MAX_FILES = 400;

const toPosix = (p) => String(p).split(path.sep).join('/');

function sameFile(a, b) {
  const n = (p) => path.resolve(p).toLowerCase();
  return n(a) === n(b);
}

/** Every legacy approval attestation recorded for `absPath`, across the state-model runs in `runsDir`. */
function findLegacyAttestations(runsDir, absPath, { dataRoot } = {}) {
  const root = dataRoot || path.dirname(runsDir);
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return out; }
  for (const e of entries) {
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(runsDir, e.name, 'metadata', 'run.json'), 'utf8')); } catch { continue; }
    if (!meta.stateSchemaVersion) continue;
    for (const a of meta.legacyApprovals || []) {
      if (a && a.artifact && sameFile(path.resolve(root, a.artifact), absPath)) out.push({ ...a, run: e.name });
    }
  }
  return out.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
}

function git(dataRoot, args) {
  return execFileSync('git', ['-C', dataRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** {tracked, clean, commit} for one file, from the git repository that holds the data root. */
function gitStatusOf(dataRoot, abs) {
  try {
    git(dataRoot, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    return { repo: false, tracked: false, clean: false, commit: null };
  }
  const rel = toPosix(path.relative(dataRoot, abs));
  let tracked = false;
  try { git(dataRoot, ['ls-files', '--error-unmatch', '--', rel]); tracked = true; } catch { tracked = false; }
  if (!tracked) return { repo: true, tracked: false, clean: false, commit: null };
  let clean = false;
  try { clean = git(dataRoot, ['status', '--porcelain', '--', rel]) === ''; } catch { clean = false; }
  let commit = null;
  try { commit = git(dataRoot, ['log', '-1', '--format=%H', '--', rel]) || null; } catch { commit = null; }
  return { repo: true, tracked, clean, commit };
}

/** The first file in the legacy run that names the artifact (by data-root-relative path or file name). */
function findLegacyReference(legacyRunDir, artifactRel) {
  const needles = [artifactRel, artifactRel.replace(/\//g, '\\'), path.posix.basename(artifactRel)];
  const files = [];
  const walk = (d) => {
    if (files.length >= MAX_FILES) return;
    let es = [];
    try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const x of es) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) { if (!/^(node_modules|\.git|target|artifacts.*|screenshots)$/i.test(x.name)) walk(p); } else if (TEXT_EXT.test(x.name)) files.push(p);
      if (files.length >= MAX_FILES) return;
    }
  };
  walk(legacyRunDir);
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const hit = needles.find((n) => n && lines[i].includes(n));
      if (hit) return { file: f, line: i + 1, matched: hit === artifactRel || hit === needles[1] ? 'path' : 'file-name' };
    }
  }
  return null;
}

/**
 * Checks everything a legacy attestation needs, and returns the record to store. Throws `fail(msg, code)`.
 * @param {{runsDir: string, dataRoot: string, artifact: {abs: string, rel: string}, legacyRun: string,
 *          header: {status: string}, history: object[], fail: Function}} ctx
 */
function proveLegacyApproval({ runsDir, dataRoot, artifact, legacyRun, header, history, fail }) {
  if (header.status !== 'Approved') {
    fail(`${artifact.rel}: its header reads ${header.status}, not Approved — only an artifact that reads Approved can be attested as approved before the run state model.`, 'APPROVAL_NOT_IN_HEADER');
  }
  if (history.length) {
    const last = history[history.length - 1];
    fail(
      `${artifact.rel} already has recorded approval history in the run state model (latest: ${last.type}${last.by ? ` by ${last.by}` : ''} in run ${last.run}). ` +
      'A legacy attestation is only for artifacts the state model never saw — it never overrides a recorded approval, rejection, withdrawal or open review.',
      'RECORDED_HISTORY_EXISTS'
    );
  }
  if (!/^[^\\/]+$/.test(String(legacyRun || '')) || legacyRun === '.' || legacyRun === '..') {
    fail(`--legacy-run must name one run folder in ${toPosix(runsDir)}, not a path.`, 'INVALID_ARGUMENT');
  }
  const legacyDir = path.join(runsDir, legacyRun);
  if (!fs.existsSync(legacyDir) || !fs.statSync(legacyDir).isDirectory()) fail(`Legacy run "${legacyRun}" does not exist in ${toPosix(runsDir)}.`, 'RUN_NOT_FOUND');
  let legacyMeta = null;
  try { legacyMeta = JSON.parse(fs.readFileSync(path.join(legacyDir, 'metadata', 'run.json'), 'utf8')); } catch { legacyMeta = null; }
  if (legacyMeta && legacyMeta.stateSchemaVersion) {
    fail(`"${legacyRun}" is a run state model run, not a legacy run — an approval made there is already recorded (or was never made); attestation does not apply.`, 'NOT_LEGACY');
  }
  const ref = findLegacyReference(legacyDir, artifact.rel);
  if (!ref) fail(`Legacy run "${legacyRun}" never references ${artifact.rel} — there is no historical evidence that it was approved there.`, 'NO_LEGACY_EVIDENCE');

  const refGit = gitStatusOf(dataRoot, ref.file);
  const artGit = gitStatusOf(dataRoot, artifact.abs);
  if (!refGit.repo) {
    fail('The data root is not inside a git repository, so the legacy evidence cannot be tied to committed history. Legacy approval cannot be attested without it.', 'PROVENANCE_UNVERIFIABLE');
  }
  if (!refGit.tracked || !refGit.clean) {
    fail(`The legacy evidence ${toPosix(path.relative(dataRoot, ref.file))} is ${refGit.tracked ? 'modified since its last commit' : 'not committed'} — historical provenance must come from committed, unmodified history.`, 'PROVENANCE_UNVERIFIABLE');
  }
  if (!artGit.tracked || !artGit.clean) {
    fail(`${artifact.rel} is ${artGit.tracked ? 'modified since its last commit' : 'not committed'} — only the committed content can be attested as what was approved.`, 'PROVENANCE_UNVERIFIABLE');
  }
  return {
    artifact: artifact.rel,
    sha256: fingerprintFile(artifact.abs),
    legacyRun,
    evidence: { file: toPosix(path.relative(dataRoot, ref.file)), line: ref.line, matched: ref.matched, commit: refGit.commit },
    artifactCommit: artGit.commit,
  };
}

module.exports = { findLegacyAttestations, findLegacyReference, gitStatusOf, proveLegacyApproval };
