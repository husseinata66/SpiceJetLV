// Platform Knowledge promotion (Phase 9.4) — the controlled path from a project-layer Repair KB entry to the
// reusable Platform Knowledge layer (pipeline.md §10.5; self-healing-skill §10.3).
//
// Platform Knowledge is read by every project, so what lands there must be verified, clean and approved:
//   propose  only from a project entry written by `state heal promote` — i.e. from a repair attempt that was
//            VALIDATED AS FIXED by its rerun — and only while that entry is byte-for-byte what heal promote
//            wrote (its fingerprint is recorded in run.json). The content is scanned: anything secret-shaped
//            (credentials, tokens, cookies, e-mail, phone, card numbers) refuses the proposal outright — a secret
//            is never redacted into shared knowledge, it is sent back. The provenance (run, operation, attempt,
//            patch, validating rerun, source fingerprint) is fixed in the proposal.
//   review   a named human approves or rejects THAT proposal, bound to its fingerprint; a rejection is kept.
//   apply    the approved, unchanged source is written as a NEW Platform Knowledge file (never over an existing
//            one) through fileMutation.js, with its provenance header; the written file's fingerprint is kept.
//   verify   every applied file still matches what was approved; any other file in the governed folder is an
//            unapproved knowledge change.
// The ledger is <platform knowledge dir>/PROMOTION_LEDGER.json. Files that predate it are reported, not judged.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rs = require('./runState');
const fm = require('./fileMutation');
const { sanitizeKnowledge } = require('./repairGovernance');
const { writeJsonAtomic, withFileLock } = require('./atomicFile');

const { RunStateError } = rs;
const DEFAULT_PLATFORM_DIR = path.resolve(__dirname, '..', '..', 'knowledge');
const GOVERNED = 'patterns/repair_patterns';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const stable = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(stable).join(',')}]` : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`);

const ledgerFile = (dir) => path.join(dir, 'PROMOTION_LEDGER.json');

/**
 * R-03 (Phase 9.5): promotions are written only to the platform's own knowledge folder, or to a folder a named
 * human registered as a platform-knowledge root (target_write/cli.js register-root --kind platform-knowledge).
 */
function assertKnowledgeDir(runsDir, platformDir) {
  const norm = (p) => { let r; try { r = fs.realpathSync.native(path.resolve(p)); } catch { r = path.resolve(p); } return process.platform === 'win32' ? r.toLowerCase() : r; };
  if (norm(platformDir) === norm(DEFAULT_PLATFORM_DIR)) return;
  // eslint-disable-next-line global-require
  const { permittedRootFor } = require('./targetWrites');
  const root = permittedRootFor(path.dirname(runsDir), platformDir, ['platform-knowledge']);
  if (!root || norm(root.path) !== norm(platformDir)) {
    throw new RunStateError(`${platformDir} is not the platform's knowledge folder nor a registered platform-knowledge root — Platform Knowledge is written nowhere else.`, 'NOT_PERMITTED_ROOT');
  }
}
function readLedger(dir) { try { return JSON.parse(fs.readFileSync(ledgerFile(dir), 'utf8')); } catch { return { schema: 'platform-knowledge-ledger/1', entries: [] }; } }
const saveLedger = (dir, l) => writeJsonAtomic(ledgerFile(dir), l);
const bodyOf = (e) => ({ source: e.source, provenance: e.provenance, target: e.target, contentSha: e.contentSha });

/** Proposes a promotion of a project Repair KB entry (by its REPAIR-NNN id) recorded in `folderName`. */
function proposePromotion({ runsDir, folderName, entryId, platformDir = DEFAULT_PLATFORM_DIR, by, now }) {
  rs.assertDate(now, 'proposePromotion');
  const proposer = rs.requireText(by, 'by', 'proposePromotion');
  assertKnowledgeDir(runsDir, platformDir);
  const dataRoot = path.dirname(runsDir);
  const meta = JSON.parse(fs.readFileSync(rs.runJsonPath(runsDir, folderName), 'utf8'));
  let found = null;
  for (const op of (meta.stages && meta.stages['5H'] && meta.stages['5H'].repairOperations) || []) {
    for (const p of op.promotions || []) if (p.id === entryId) found = { op, p };
  }
  if (!found) throw new RunStateError(`${entryId} was not promoted to the project Repair KB in run ${folderName} (state heal promote) — only verified project knowledge is proposed for the Platform layer.`, 'UNKNOWN_SOURCE');
  const { op, p } = found;
  const attempt = ((op.attempts || {})[p.testCaseId] || []).find((a) => a.n === p.attempt);
  if (!attempt || attempt.result !== 'fixed' || !attempt.validation) {
    throw new RunStateError(`${entryId}'s repair attempt (${p.testCaseId}#${p.attempt}) is ${attempt ? attempt.result || attempt.status : 'missing'} — only a repair validated as fixed by its rerun becomes knowledge.`, 'UNVERIFIED_KNOWLEDGE');
  }
  if (!p.sha256) throw new RunStateError(`${entryId} was promoted before its fingerprint was recorded (Phase 9.4) — promote it again from the run so its content can be proven.`, 'NO_FINGERPRINT');
  let content;
  try { content = fs.readFileSync(path.resolve(dataRoot, p.file)); } catch { throw new RunStateError(`${p.file} is missing.`, 'MISSING_ARTIFACT'); }
  if (sha(content) !== p.sha256) throw new RunStateError(`${p.file} changed after heal promote wrote it — an edited entry is not the verified one.`, 'SOURCE_MODIFIED');
  const scan = sanitizeKnowledge(content.toString('utf8'));
  const kinds = Object.entries(scan.redactions || {}).filter(([, n]) => n > 0).map(([k, n]) => `${k} ×${n}`);
  if (kinds.length) throw new RunStateError(`${entryId} contains secret-shaped content (${kinds.join(', ')}) — refused; secrets never enter Platform Knowledge, even redacted. Fix the project entry first.`, 'SECRET_FOUND');
  return withFileLock(`${ledgerFile(platformDir)}.lock`, () => {
    fs.mkdirSync(platformDir, { recursive: true });
    const l = readLedger(platformDir);
    const n = l.entries.length + 1;
    const existing = (() => { try { return fs.readdirSync(path.join(platformDir, GOVERNED)).filter((x) => /^REPAIR-\d+\.md$/.test(x)).length; } catch { return 0; } })();
    const pending = l.entries.filter((e) => ['proposed', 'approved'].includes(e.status)).length;
    const e = {
      id: `KP-${n}`, at: now.toISOString(), status: 'proposed', proposedBy: proposer,
      source: { run: folderName, entry: entryId, file: p.file, sha256: p.sha256 },
      provenance: { operation: op.id, testCaseId: p.testCaseId, attempt: p.attempt, strategy: attempt.strategy, patch: attempt.patch && attempt.patch.sha256, rerun: attempt.validation.rerun, validatedBy: attempt.validation.by, promotedToProjectBy: p.by },
      target: `${GOVERNED}/REPAIR-${String(existing + pending + 1).padStart(3, '0')}.md`,
      contentSha: p.sha256, review: null, appliedAt: null, writtenSha: null,
    };
    e.fingerprint = sha(stable(bodyOf(e)));
    l.entries.push(e);
    saveLedger(platformDir, l);
    return e;
  });
}

function entryOf(l, id) {
  const e = l.entries.find((x) => x.id === id);
  if (!e) throw new RunStateError(`No promotion "${id}" in the Platform Knowledge ledger.`, 'UNKNOWN_PROPOSAL');
  return e;
}

/** A named human approves or rejects a proposal (bound to its fingerprint). */
function reviewPromotion({ id, decision, by, reason, fingerprint, platformDir = DEFAULT_PLATFORM_DIR, runsDir, now }) {
  rs.assertDate(now, 'reviewPromotion');
  if (!runsDir) throw new RunStateError('reviewPromotion requires runsDir (the data root whose registered roots decide where knowledge may go).', 'MISSING_FIELD');
  assertKnowledgeDir(runsDir, platformDir);
  const reviewer = rs.requireApprover(by, 'by', 'reviewPromotion', 'Platform Knowledge is changed only on a named human\'s review');
  const why = rs.requireText(reason, 'reason', 'reviewPromotion', 'say why it is (or is not) reusable beyond this application');
  if (!['approve', 'reject'].includes(decision)) throw new RunStateError('--decision is approve or reject.', 'INVALID_ARGUMENT');
  return withFileLock(`${ledgerFile(platformDir)}.lock`, () => {
    const l = readLedger(platformDir);
    const e = entryOf(l, id);
    if (e.status !== 'proposed') throw new RunStateError(`${id} is ${e.status}, not proposed.`, 'ILLEGAL_TRANSITION');
    if (sha(stable(bodyOf(e))) !== e.fingerprint) throw new RunStateError(`${id} was edited after it was proposed.`, 'TAMPERED');
    if (fingerprint && fingerprint !== e.fingerprint) throw new RunStateError(`${id}'s fingerprint is ${e.fingerprint.slice(0, 12)}, not the ${String(fingerprint).slice(0, 12)} reviewed.`, 'FINGERPRINT_MISMATCH');
    e.review = { decision, by: reviewer, reason: why, at: now.toISOString(), fingerprint: e.fingerprint };
    e.status = decision === 'approve' ? 'approved' : 'rejected';
    saveLedger(platformDir, l);
    return e;
  });
}

/** Writes an approved promotion into Platform Knowledge — a new file, never an overwrite. */
function applyPromotion({ id, runsDir, platformDir = DEFAULT_PLATFORM_DIR, now }) {
  rs.assertDate(now, 'applyPromotion');
  assertKnowledgeDir(runsDir, platformDir);
  const dataRoot = path.dirname(runsDir);
  return withFileLock(`${ledgerFile(platformDir)}.lock`, () => {
    const l = readLedger(platformDir);
    const e = entryOf(l, id);
    if (e.status !== 'approved' || !e.review || e.review.fingerprint !== e.fingerprint) throw new RunStateError(`${id} is ${e.status} — only an approved promotion is applied.`, 'APPROVAL_REQUIRED');
    if (sha(stable(bodyOf(e))) !== e.fingerprint) throw new RunStateError(`${id} was edited after it was approved.`, 'TAMPERED');
    let content;
    try { content = fs.readFileSync(path.resolve(dataRoot, e.source.file)); } catch { throw new RunStateError(`${e.source.file} is missing.`, 'MISSING_ARTIFACT'); }
    if (sha(content) !== e.contentSha) throw new RunStateError(`${e.source.file} changed after ${id} was approved — what is written is what was approved, nothing else.`, 'SOURCE_MODIFIED');
    const header = `<!-- Platform Knowledge — promoted ${now.toISOString()} as ${id}; approved by ${e.review.by}; source ${e.source.run} ${e.source.entry} (sha256 ${e.contentSha.slice(0, 16)}); validated by rerun ${e.provenance.rerun}. Do not edit by hand: changes go through knowledge_promotion. -->\n`;
    const out = Buffer.concat([Buffer.from(header, 'utf8'), content]);
    const dir = path.join(platformDir, '.promotions', id);
    fm.applyFileChanges({ root: platformDir, changes: [{ op: 'create', path: e.target, beforeSha: null, content: out, afterSha: sha(out) }], journalFile: path.join(dir, 'journal.json'), backupDir: path.join(dir, 'backup'), label: `Platform Knowledge promotion ${id}` });
    e.status = 'applied';
    e.appliedAt = now.toISOString();
    e.writtenSha = sha(out);
    saveLedger(platformDir, l);
    return e;
  });
}

/** Every applied file still matches; no unapproved file sits in the governed folder. */
function verifyKnowledge({ platformDir = DEFAULT_PLATFORM_DIR } = {}) {
  const l = readLedger(platformDir);
  const issues = [];
  const applied = l.entries.filter((e) => e.status === 'applied');
  for (const e of applied) {
    const now = fm.fileSha(path.join(platformDir, e.target));
    if (now !== e.writtenSha) issues.push(`${e.target}: ${now ? 'modified after it was approved and written' : 'missing'} (${e.id})`);
  }
  const known = new Set(applied.map((e) => e.target));
  let files = [];
  try { files = fs.readdirSync(path.join(platformDir, GOVERNED)).filter((x) => x.endsWith('.md')); } catch { /* none yet */ }
  for (const f of files) if (!known.has(`${GOVERNED}/${f}`)) issues.push(`${GOVERNED}/${f}: not in the promotion ledger — an unapproved Platform Knowledge change`);
  return { ok: issues.length === 0, issues, applied: applied.length, proposed: l.entries.filter((e) => e.status === 'proposed').length };
}

module.exports = { DEFAULT_PLATFORM_DIR, GOVERNED, readLedger, proposePromotion, reviewPromotion, applyPromotion, verifyKnowledge };
