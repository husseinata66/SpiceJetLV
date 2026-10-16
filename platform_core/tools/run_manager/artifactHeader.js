// Reads an artifact's own approval status from its header — the authoritative record of approval.
//
// WHY THIS EXISTS
// pipeline.md §7: "Approving an artifact updates the `status:` field in its own header … the
// artifact's own header is authoritative and a stage requiring approved input reads the header,
// never a cache." The run state model (runState.js) records approvals, but it must never be the
// thing that makes a stage approved. Before it accepts an approval it reads the header here; a
// header that does not say Approved — or that cannot be read — blocks the approval.
//
// Header shapes in use on disk:
//   - Markdown header table:     | Status | **Approved** — Jane Doe, Stage 3 gate, 2026-09-25 |
//   - Bold status line:          **Status:** Pending Automation Approval   (Repair Summary)
//   - YAML-style frontmatter:    status: Approved
//   - Automation state (4A/5H):  .module_automation_state.json → "state": "Approved" | "Promoted"
//
// The LEADING status word decides — unless the value also records an open item (pending, rejected,
// draft) beside an approval, which reads `Mixed` (revised 2026-10-08: a partial approval is not an
// approval). Template guidance comments are ignored. Anything unrecognized is `Unknown`, never Approved.

const fs = require('fs');
const crypto = require('crypto');

/** Header statuses this reader recognizes, longest first so "Pending Automation Approval" wins. */
const HEADER_STATUSES = [
  'Pending Automation Approval',
  'Pending Review',
  'Approved',
  'Rejected',
  'Draft',
];

/** How far into a file the header can be — the status sits in the opening table or frontmatter. */
const HEADER_SCAN_LINES = 80;

/**
 * A header that records BOTH an approval and an open item — "Approved … `PO-30` Pending Review", or
 * "Approved … TC-076 reset to Pending" — is a partial approval. Reading only its leading word would
 * silently treat the pending part as approved, so it reads `Mixed`, which no gate accepts: the
 * reviewer has to state one status for the artifact as a whole.
 */
const MIXED = 'Mixed';

function normalize(raw) {
  const cleaned = String(raw)
    .replace(/<!--[\s\S]*?-->/g, '') // template guidance comments are not part of the value
    .replace(/[*_`]/g, '')
    .replace(/^\s*[✓✔✅]\s*/u, '')
    .trim();
  const lower = cleaned.toLowerCase();
  if (/\bapproved\b/.test(lower) && /\bpending\b|\brejected\b|\bdraft\b/.test(lower)) return MIXED;
  for (const s of HEADER_STATUSES) {
    if (lower.startsWith(s.toLowerCase())) return s;
  }
  return 'Unknown';
}

/**
 * @param {string} file - absolute path
 * @returns {{status: string, raw: string|null, source: 'markdown-table'|'frontmatter'|'automation-state'|'none'|'unreadable'}}
 *   `status` is one of HEADER_STATUSES or 'Unknown'.
 */
function readArtifactApprovalStatus(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { status: 'Unknown', raw: null, source: 'unreadable' };
  }

  if (file.endsWith('.json')) {
    try {
      const state = JSON.parse(text).state;
      if (state === 'Approved' || state === 'Promoted') return { status: 'Approved', raw: state, source: 'automation-state' };
      return { status: state ? 'Pending Automation Approval' : 'Unknown', raw: state ?? null, source: 'automation-state' };
    } catch {
      return { status: 'Unknown', raw: null, source: 'unreadable' };
    }
  }

  const lines = text.split(/\r?\n/).slice(0, HEADER_SCAN_LINES);

  // Frontmatter: only inside a leading --- block, so prose mentioning "status:" is never read.
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length && lines[i] !== '---'; i += 1) {
      const m = lines[i].match(/^status:\s*["']?(.+?)["']?\s*$/i);
      if (m) return { status: normalize(m[1]), raw: m[1], source: 'frontmatter' };
    }
  }

  // Markdown header table — the first `| Status | value |` row — or a bold status line
  // (`**Status:** value`, the Repair Summary's shape), whichever comes first.
  for (const line of lines) {
    const m = line.match(/^\|\s*\**Status\**\s*\|\s*(.+?)\s*\|\s*$/i);
    if (m) return { status: normalize(m[1]), raw: m[1], source: 'markdown-table' };
    const b = line.match(/^\*\*Status:?\*\*:?\s*(.+?)\s*$/i);
    if (b) return { status: normalize(b[1]), raw: b[1], source: 'status-line' };
  }

  return { status: 'Unknown', raw: null, source: 'none' };
}

/**
 * Content fingerprint taken when an approval is recorded, so a later edit to an approved artifact is
 * detectable. The header alone cannot show that: an artifact edited after approval still reads
 * "Approved". Line endings are normalized first, so a git CRLF/LF conversion is not mistaken for an
 * edit.
 *
 * Returns null for `.module_automation_state.json`: that file is rewritten legitimately after
 * approval (Executed, Promoted, baseline updates), so its approval is read from its `state`, not
 * pinned to its bytes. Also null when the file cannot be read.
 *
 * @param {string} file - absolute path
 * @returns {string|null} hex sha256
 */
function fingerprintFile(file) {
  if (file.endsWith('.json')) return null;
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  return crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
}

module.exports = {
  HEADER_STATUSES,
  MIXED,
  readArtifactApprovalStatus,
  fingerprintFile,
};
