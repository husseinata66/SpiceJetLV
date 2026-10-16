const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'cli.js');
const EXAMPLE = path.join(__dirname, '..', 'examples', 'example.report.json');

function runCli(args, { expectFailure = false } = {}) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
    if (expectFailure) assert.fail(`expected a non-zero exit, got success:\n${stdout}`);
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    if (!expectFailure) assert.fail(`expected success, got exit ${error.status}:\n${error.stderr}`);
    return { status: error.status, stdout: error.stdout || '', stderr: error.stderr || '' };
  }
}

function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-builder-'));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function writeModel(dir, model, name = 'run.report.json') {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(model), 'utf8');
  return file;
}

// A disposable platform data root (runs/ + knowledge_base/): since Phase 9.5 (R-03) a report is written only
// inside a data root or a registered report-output root.
function dataRootDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-builder-root-'));
  fs.mkdirSync(path.join(dir, 'runs')); fs.mkdirSync(path.join(dir, 'knowledge_base'));
  return dir;
}

const MINIMAL = {
  title: 'QA Execution Report',
  testCases: { categories: [{ key: 'positive', cases: [{ title: 'A', status: 'PASS' }] }] },
};

test('validate reports a valid model with its shape summary', () => {
  const { stdout } = runCli(['validate', '--model', EXAMPLE, '--json']);
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.testCases, 4);
  assert.equal(result.categories, 2);
  assert.deepEqual(result.statuses, ['PASS', 'FAIL', 'BLOCKED']);
});

test('validate exits 2 with a path-shaped message on an invalid model', () => {
  const dir = tempDir();
  const file = writeModel(dir, { title: 'X', statuses: [{ key: 'PASS', tone: 'plaid' }] });
  const { status, stderr } = runCli(['validate', '--model', file], { expectFailure: true });
  assert.equal(status, 2, 'a bad model is exit 2, distinct from a usage or I/O failure');
  assert.match(stderr, /Invalid report model — statuses\[0\]\.tone: unknown tone "plaid"/);
});

test('build writes the HTML to the requested path, creating the directory', () => {
  const dir = dataRootDir();
  const file = writeModel(dir, MINIMAL);
  const out = path.join(dir, 'nested', 'report.html');

  runCli(['build', '--model', file, '--out', out, '--data-root', dir]);
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /^<!DOCTYPE html>/);
  assert.ok(html.includes('QA Execution Report'));
});

test('build defaults the output next to the model, dropping the .report.json suffix', () => {
  const dir = dataRootDir();
  const file = writeModel(dir, MINIMAL, 'ManualQAReport.report.json');

  runCli(['build', '--model', file, '--data-root', dir]);
  assert.ok(fs.existsSync(path.join(dir, 'ManualQAReport.html')));
});

test('build --stdout writes the document without touching the filesystem', () => {
  const dir = tempDir();
  const file = writeModel(dir, MINIMAL);

  const { stdout } = runCli(['build', '--model', file, '--stdout']);
  assert.match(stdout, /^<!DOCTYPE html>/);
  assert.deepEqual(fs.readdirSync(dir), ['run.report.json']);
});

test('build --json reports where it wrote and how large the document is', () => {
  const dir = dataRootDir();
  const file = writeModel(dir, MINIMAL);
  const out = path.join(dir, 'report.html');

  const { stdout } = runCli(['build', '--model', file, '--out', out, '--json', '--data-root', dir]);
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.out, out);
  assert.equal(result.bytes, fs.statSync(out).size);
});

test('build rejects a model file that is not valid JSON', () => {
  const dir = tempDir();
  const file = path.join(dir, 'broken.json');
  fs.writeFileSync(file, '{ "title": ', 'utf8');

  const { status, stderr } = runCli(['build', '--model', file], { expectFailure: true });
  assert.equal(status, 1);
  assert.match(stderr, /--model is not valid JSON/);
});

test('a missing --model is a usage failure, not a model failure', () => {
  const { status, stderr } = runCli(['build'], { expectFailure: true });
  assert.equal(status, 1);
  assert.match(stderr, /--model is required/);
});

test('an unknown command prints the usage and exits 1', () => {
  const { status, stderr } = runCli(['render', '--model', EXAMPLE], { expectFailure: true });
  assert.equal(status, 1);
  assert.match(stderr, /Unknown command "render"/);
});

test('parseArgs treats the documented boolean flags as flags, not value options', () => {
  const { parseArgs } = require('../cli');
  const args = parseArgs(['build', '--model', 'a.json', '--stdout', '--json']);
  assert.deepEqual(args._, ['build']);
  assert.deepEqual(args.flags, { model: 'a.json', stdout: true, json: true });
});

test('parseArgs rejects a value option left without a value', () => {
  const { parseArgs } = require('../cli');
  assert.throws(() => parseArgs(['build', '--model', '--json']), /--model requires a value/);
});
