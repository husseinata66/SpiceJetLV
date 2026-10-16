#!/usr/bin/env node
// prepack guard — refuses to publish a package that would install into a broken state.
//
// The failure this prevents: `files` in package.json omits something init needs, `npm publish`
// succeeds, and the break only surfaces on somebody else's machine when init copies a directory
// that is not there. Every check below mirrors an assumption plan.js makes at install time.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const problems = [];
const checked = [];

function requireExists(rel, why) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) {
    checked.push(rel);
    return true;
  }
  problems.push(`missing ${rel} — ${why}`);
  return false;
}

// --- The payload init copies -------------------------------------------------------------------
const { TOOL_PAYLOAD_DIRS, SKILL_NAMES } = require('../platform_core/tools/init/plan');

for (const dir of TOOL_PAYLOAD_DIRS) {
  requireExists(dir, 'init copies this into the target tool folder');
}
for (const name of SKILL_NAMES) {
  requireExists(path.join('.claude', 'skills', name, 'SKILL.md'), 'init installs this skill');
}

requireExists(path.join('bin', 'agentic-testing.js'), 'the package bin entry');
requireExists(path.join('scripts', 'init.sh'), 'the git-clone install route');
requireExists(path.join('scripts', 'init.ps1'), 'the Windows git-clone install route');
requireExists(
  path.join('platform_core', 'knowledge', 'patterns'),
  'Platform Knowledge ships with the tool and is copied on install (pipeline.md §10.6)',
);
requireExists(
  path.join('platform_core', 'tools', 'platform_paths', 'platform.config.schema.json'),
  'the config contract the installed platform validates against',
);

// --- package.json itself ------------------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

if (!pkg.bin || !pkg.bin['agentic-testing']) {
  problems.push('package.json has no bin.agentic-testing — `npx agentic-testing` would not work');
}
if (!Array.isArray(pkg.files) || !pkg.files.length) {
  problems.push('package.json has no files[] — publishing would ship the entire working tree');
}

// Everything the installer needs must be inside a published path.
if (Array.isArray(pkg.files)) {
  const published = pkg.files.map((f) => f.replace(/\/+$/, ''));
  const isPublished = (rel) => {
    const posix = rel.split(path.sep).join('/');
    return published.some((p) => posix === p || posix.startsWith(`${p}/`));
  };
  for (const rel of checked) {
    if (!isPublished(rel)) {
      problems.push(
        `${rel.split(path.sep).join('/')} is needed at install time but is not covered by ` +
          `package.json files[] (${published.join(', ')})`,
      );
    }
  }
}

if (!pkg.engines || !pkg.engines.node) {
  problems.push('package.json declares no engines.node — the CLI requires >= 18.17');
}

// --- The two install routes must share one implementation ---------------------------------------
const initSh = fs.readFileSync(path.join(ROOT, 'scripts', 'init.sh'), 'utf8');
if (!initSh.includes('bin/agentic-testing.js')) {
  problems.push(
    'scripts/init.sh does not delegate to bin/agentic-testing.js — the clone and npx routes would ' +
      'drift apart',
  );
}
const initPs1 = fs.readFileSync(path.join(ROOT, 'scripts', 'init.ps1'), 'utf8');
if (!initPs1.includes('agentic-testing.js')) {
  problems.push('scripts/init.ps1 does not delegate to bin/agentic-testing.js');
}

// --- Nothing project-specific may ship ----------------------------------------------------------
// A published package carrying one application's PRD would install somebody else's requirements as
// though they were the new host's.
//
// "Is this a template?" is decided by comparing against templates.js — the same source init writes
// from — rather than by looking for template-ish phrasing. Prose sniffing gave both false positives
// (a real template whose wording didn't match the regex) and false negatives (a real PRD that
// happened to quote one of those phrases).
const { getTemplate } = require('../platform_core/tools/init/templates.js');

// Only a file that WOULD be published can leak (Phase 9.2, F-21): files[] is a whitelist, and project data
// outside it never ships. Without files[] (the whole tree ships) or with platform_core_data in it, every
// listed file is checked, exactly as before.
const wouldPublish = (rel) => {
  if (!Array.isArray(pkg.files) || !pkg.files.length) return true;
  const posix = rel.split(path.sep).join('/');
  return pkg.files.map((p) => p.replace(/\/+$/, '')).some((p) => posix === p || posix.startsWith(`${p}/`));
};
for (const leaked of ['PRD.md', 'run_configuration.md', 'PRD_UserStories.md']) {
  const abs = path.join(ROOT, 'platform_core_data', 'knowledge_base', leaked);
  if (!fs.existsSync(abs)) continue;
  if (!wouldPublish(path.join('platform_core_data', 'knowledge_base', leaked))) continue;
  const content = fs.readFileSync(abs, 'utf8');
  const pristine = content.replace(/\r\n/g, '\n') === getTemplate(leaked).replace(/\r\n/g, '\n');
  if (!pristine) {
    problems.push(
      `platform_core_data/knowledge_base/${leaked} differs from its blank template in ` +
        'platform_core/tools/init/templates.js — it may hold one project\'s real content, which ' +
        'must not be published. Restore the template, or add the file to .npmignore.',
    );
  }
}

// --- Report -------------------------------------------------------------------------------------
if (problems.length) {
  console.error('\nverifyPackable: this package is NOT safe to publish.\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`verifyPackable: OK — ${checked.length} required paths present and publishable.`);
