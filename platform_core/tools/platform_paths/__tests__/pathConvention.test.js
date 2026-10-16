// Path-convention guards for the specification and the seven skills.
//
// The refactor that made this platform installable deliberately did NOT rewrite the
// `platform_core_data/...` paths in the skills. Those paths are already correct — they are relative
// to the Tool Root, and pipeline.md §1.1 states that once, in one place. This file is what keeps
// that arrangement honest: it fails if the resolution rule goes missing, if a skill starts naming a
// Target Project path directly, or if the pre-refactor `artifacts/` paths come back.
//
// It reads the real specification and skill files — no fixtures — so a spec edit that breaks the
// contract fails here rather than at pipeline runtime.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TOOL_ROOT = path.join(__dirname, '..', '..', '..', '..');
const PIPELINE_MD = path.join(TOOL_ROOT, 'workflows_and_pipelines', 'pipeline', 'pipeline.md');
const SKILLS_DIR = path.join(TOOL_ROOT, '.claude', 'skills');

const SKILL_NAMES = [
  'project-context-skill',
  'explorer-skill',
  'test-design-skill',
  'manual-execution-skill',
  'automation-skill',
  'automation-execution-skill',
  'self-healing-skill',
  'reporting-skill',
];

function readSkill(name) {
  return fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
}

function readPipeline() {
  return fs.readFileSync(PIPELINE_MD, 'utf8');
}

// -------------------------------------------------------------------------------------------------
// The resolution rule must exist, and must be stated in exactly one authoritative place
// -------------------------------------------------------------------------------------------------

test('pipeline.md states the root-resolution rule that makes every skill path correct', () => {
  const spec = readPipeline();

  assert.match(spec, /##\s*1\.1\s+Root resolution/, '§1.1 must exist');
  assert.match(
    spec,
    /relative to the Tool Root/,
    'the rule that skill paths are Tool-Root-relative must be stated explicitly',
  );
  assert.match(
    spec,
    /platform_core\/tools\/platform_paths\/paths\.js/,
    '§1.1 must name the single module that resolves roots',
  );
  // The anti-pattern the rule exists to forbid.
  assert.match(spec, /never infer either root/i);
  assert.match(spec, /process\.cwd\(\)/, 'the rule must name process.cwd() as forbidden');
  assert.match(spec, /__dirname/, 'the rule must name __dirname as forbidden');
});

test('pipeline.md defines the Target Project contract in §13', () => {
  const spec = readPipeline();
  assert.match(spec, /##\s*13\.\s+Target Project Integration/);
  for (const section of ['13.1', '13.2', '13.3', '13.4', '13.5', '13.6', '13.7', '13.8']) {
    assert.ok(spec.includes(`### ${section}`), `§${section} must exist`);
  }
});

test('§6 Rule 9 is the two-root rule and permits reading the target for technical facts', () => {
  const spec = readPipeline();
  assert.match(spec, /9\.\s+\*\*Two Roots, One Project\.\*\*/, 'Rule 9 must be the two-root rule');
  assert.match(spec, /technical facts only/i, 'Rule 9 must scope target reads to technical facts');
  assert.match(
    spec,
    /never evidence of what it \*should\* do/,
    "Rule 9 must keep the is-vs-should distinction, the rule's whole point",
  );
  // The pre-refactor prohibition must be gone — it forbade the target design outright.
  assert.ok(
    !/Agents must not read application content from anywhere else on disk/.test(spec),
    'the blanket prohibition on reading outside platform_core_data must no longer be present',
  );
});

// -------------------------------------------------------------------------------------------------
// Skills keep Tool-Root-relative paths, and never name a Target Project path
// -------------------------------------------------------------------------------------------------

test('every skill still addresses its artifacts as platform_core_data/... (unchanged by the refactor)', () => {
  // Not cosmetic: these strings appear in machine-read YAML `location:` fields. The refactor's whole
  // premise is that they need no rewriting, so a drop to zero means someone templated them anyway.
  for (const name of SKILL_NAMES) {
    const content = readSkill(name);
    assert.ok(
      content.includes('platform_core_data/'),
      `${name} must still address artifacts relative to the Tool Root`,
    );
  }
});

test('no skill hardcodes a Target Project path or a literal target root', () => {
  // A skill naming `tests/e2e` or `{{TARGET_ROOT}}/src` as a fixed location would defeat detection:
  // the target's layout is discovered per project and carried in platform.config.json.
  //
  // One deliberate, narrow exception (Phase 8.1): automation-skill §8 is the platform's approved,
  // user-mandated Java/SHAFT package structure (added 2026-08-23, after this rule). Its Maven source
  // sets (`src/test/java/...`) describe the layout INSIDE an automation project whose root is itself
  // resolved — they never name where a Target Project keeps its tests. A Maven source-set path is
  // therefore accepted only in automation-skill, and only inside §8 or on a line that cites §8; it stays
  // forbidden everywhere else, and in every other skill. The next test pins §8.1's anchoring statement,
  // so the exception cannot outlive the rule that justifies it.
  const forbidden = [
    { pattern: /(?:^|[\s`(])tests\/e2e\//, why: 'a literal target test directory' },
    { pattern: /(?:^|[\s`(])src\/test\/java\//, why: 'a literal Maven target test directory', shaftStructure: true },
    { pattern: /\{\{TARGET_ROOT\}\}\/(?!<)/, why: 'a hardcoded path under the target root' },
  ];

  const offences = [];
  for (const name of SKILL_NAMES) {
    let section = null;
    readSkill(name).split(/\r?\n/).forEach((line, i) => {
      const top = line.match(/^# (\d+[A-Z]?)\./);
      if (top) section = top[1];
      for (const { pattern, why, shaftStructure } of forbidden) {
        if (!pattern.test(line)) continue;
        const approvedShaft = shaftStructure && name === 'automation-skill' && (section === '8' || /§8(\.\d+)?\b/.test(line));
        if (!approvedShaft) offences.push(`${name}:${i + 1} contains ${why}`);
      }
    });
  }
  assert.deepEqual(
    offences, [],
    'the target\'s layout comes from detectTestDirs and platform.config.json, never from a spec literal',
  );
});

test('automation-skill §8.1 anchors the SHAFT structure to the resolved automation project root', () => {
  // The only reason a Maven source-set path may appear in a skill (test above). Remove this statement
  // and the exception has no basis.
  const content = readSkill('automation-skill');
  const s81 = content.slice(content.indexOf('## 8.1 '), content.indexOf('## 8.2 '));
  assert.match(s81, /relative to the automation project's own root — never to the Target Project root/);
  assert.match(s81, /always resolved, never assumed/);
  assert.match(s81, /detectTestDirs/);
  assert.match(s81, /automationRoot\.js/);
});

test('the pre-refactor artifacts/ paths are gone from every spec and skill', () => {
  // `artifacts/` stopped existing in the 2026-07-25 restructure, yet two skills still referenced
  // `artifacts/runs/...` months later — the concrete evidence that hand-migrating paths across
  // thousands of lines of prose does not stay consistent.
  const files = [PIPELINE_MD, ...SKILL_NAMES.map((n) => path.join(SKILLS_DIR, n, 'SKILL.md'))];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('artifacts/runs/'),
      `${path.basename(path.dirname(file))}/${path.basename(file)} still references artifacts/runs/`,
    );
  }
});

// -------------------------------------------------------------------------------------------------
// The Target Project write contract, as the skills express it
// -------------------------------------------------------------------------------------------------

test('automation-skill offers writing into the Target Project, gated and never assumed', () => {
  const content = readSkill('automation-skill');

  assert.match(content, /4\. Write into the Target Project's own test directories/, 'Option 4 must exist');
  assert.match(content, /presented default/, 'Option 4 must be a presented default, not a silent one');
  assert.match(content, /Ask, never infer/, "the gate must retain §31.2's ask-never-infer rule");
  assert.match(content, /fail-closed/, 'the empty-allowlist behavior must be stated');
});

test('the specification forbids the platform committing into the Target Project', () => {
  const spec = readPipeline();
  assert.match(spec, /never runs `git add`, `git commit`, `git mv`, `git rm`/);
  assert.match(spec, /assertSameRepo/, 'the mechanical enforcement must be named, not just the rule');
  assert.match(spec, /RepoBoundaryError/);
});

test('the specification confines greenfield scaffolding to test infrastructure', () => {
  const spec = readPipeline();
  assert.match(spec, /###\s*13\.6\s+Greenfield: test infrastructure only/);
  assert.match(spec, /It never scaffolds the application/);
});

// -------------------------------------------------------------------------------------------------
// The config contract the specification promises must match the schema that implements it
// -------------------------------------------------------------------------------------------------

test('every config key the specification names exists in the schema', () => {
  const schema = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'platform.config.schema.json'), 'utf8'),
  );
  const target = schema.properties.target.properties;

  for (const key of ['automationRoot', 'writeAllowlist', 'readDenylist', 'testDirs']) {
    assert.ok(target[key], `target.${key} is referenced by pipeline.md §13 and must be in the schema`);
  }
  assert.deepEqual(schema.properties.git.properties.mode.enum, ['tool-repo', 'host-repo', 'off']);
  assert.equal(schema.properties.git.properties.mode.default, 'tool-repo');
  assert.deepEqual(schema.properties.mode.enum, ['installed', 'self-hosted']);
});

test('the built-in read denylist covers every secret class the specification claims', () => {
  const { BUILTIN_READ_DENYLIST } = require('../paths');
  const spec = readPipeline();

  // §13.2 lists these verbatim; the code is the enforcement, so the two must not drift apart.
  for (const claimed of ['.env*', '**/credentials*.json', '**/secrets*', '**/*.pem', '**/*.key', '**/.aws/**', '**/id_rsa*']) {
    assert.ok(spec.includes(claimed), `§13.2 should list ${claimed}`);
  }
  for (const pattern of ['.env', '.env.*', '**/credentials*.json', '**/secrets*', '**/*.pem', '**/*.key', '**/.aws/**', '**/id_rsa*']) {
    assert.ok(BUILTIN_READ_DENYLIST.includes(pattern), `${pattern} must be enforced in code`);
  }
});
