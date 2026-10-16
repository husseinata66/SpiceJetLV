// playwright-cli Browser Provider — CLI-backed implementation.
//
// Implements the Browser Provider interface (../../interface.md) by shelling out to the Playwright
// CLI (`npx playwright ...`) instead of holding an in-process browser. This is the right provider
// for operations the CLI genuinely owns — running a generated suite, recording a script, taking a
// one-shot screenshot, opening a trace — and it deliberately does NOT pretend to support a
// persistent interactive session.
//
// Skills never require this file, and never construct a Playwright command themselves. They call
// the Browser Provider interface; the interface reports `capabilities` and raises an explicit
// UnsupportedOperation rather than silently degrading when a provider cannot do something.
//
// Every artifact this provider produces is written under the configured, isolated, gitignored
// generated-output directory ({{GENERATED_OUTPUT_DIR}}/playwright) — never into maintained source.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolvePaths, browserProviderConfig } = require('../../../project_paths');

const CAPABILITIES = Object.freeze({
  persistentSession: false,
  authenticate: false,
  navigate: false,
  click: false,
  type: false,
  select: false,
  screenshot: true, // one-shot only, via `playwright screenshot`
  extractText: false,
  extractTable: false,
  waitFor: false,
  captureNetwork: false,
  dialogGuardrail: false,
  captureBaseline: false,
  runSuite: true,
  codegen: true,
  showTrace: true,
});

function baseCommand() {
  const { settings } = browserProviderConfig();
  const raw = (settings && settings.command) || 'npx playwright';
  const parts = String(raw).trim().split(/\s+/);
  return { bin: parts[0], leading: parts.slice(1) };
}

function outputDir(projectRoot, subdir) {
  const dir = path.join(resolvePaths(projectRoot).generatedPlaywright, subdir || '');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Runs a Playwright CLI subcommand. Never shell-interpolates: arguments are passed as an argv
 * array, so a value containing a space or a quote cannot alter the command.
 */
function invoke(args, { cwd, env, timeoutMs = 900000 } = {}) {
  const { bin, leading } = baseCommand();
  const argv = [...leading, ...args];
  const result = spawnSync(bin, argv, {
    cwd: cwd || resolvePaths().repoRoot,
    env: { ...process.env, ...(env || {}) },
    encoding: 'utf8',
    timeout: timeoutMs,
    shell: process.platform === 'win32', // npx resolution on Windows
  });
  if (result.error) {
    throw new Error(`Playwright CLI could not be invoked (${bin} ${argv.join(' ')}): ${result.error.message}`);
  }
  return {
    command: `${bin} ${argv.join(' ')}`,
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

module.exports = {
  id: 'playwright-cli',
  engine: 'playwright',
  integration: 'cli',
  capabilities: CAPABILITIES,

  /** This provider has no persistent session — the interface converts this into a clear error. */
  async createSession() {
    const err = new Error(
      'The playwright-cli provider does not support a persistent browser session. ' +
      'Configure "browserProvider": "playwright-node" in platform.config.json for interactive ' +
      'Discovery/Manual Execution work, or use runSuite/codegen/screenshot/showTrace instead.'
    );
    err.code = 'UNSUPPORTED_OPERATION';
    throw err;
  },

  /**
   * Executes a generated automation suite. Reports/results land in the isolated generated-output
   * directory, never beside the suite's source.
   */
  runSuite({ suiteDir, grep, mode, reporter = 'list', projectRoot, preflight, environment, baseUrl } = {}) {
    if (!suiteDir) throw new Error('runSuite requires a suiteDir.');
    // The display mode is the human's explicit choice for this run (pipeline.md §6 Rule 11; Phase 9.3) —
    // never defaulted to headless here.
    if (!['headed', 'headless', 'debug'].includes(mode)) {
      const err = new Error('runSuite requires an explicit mode: "headed" or "headless" (or "debug"), asked of the human immediately before this run — it is never defaulted (pipeline.md §6 Rule 11).');
      err.code = 'MODE_REQUIRED';
      throw err;
    }
    // Live-activity boundary (Phase 9.4): a suite runs only for a run's stage with a confirmed browser preflight in
    // this mode (debug is a headed session).
    // eslint-disable-next-line global-require
    const pf = require('../../../run_manager/executionPreflight');
    const pfRecord = pf.assertLivePreflight({ ...(preflight || {}), headless: mode === 'headless' });
    // R-01 (Phase 9.5): the suite runs against the environment and base URL the preflight confirmed; both are
    // passed to it as TEST_ENVIRONMENT and BASE_URL (a suite that ignores them is outside this check).
    pf.assertSessionMatchesPreflight({ record: pfRecord, runsDir: preflight.runsDir, environment, url: baseUrl });
    const reportDir = outputDir(projectRoot, 'report');
    const resultsDir = outputDir(projectRoot, 'results');
    const args = ['test', '--reporter', reporter];
    if (mode === 'headed') args.push('--headed');
    if (mode === 'debug') args.push('--debug');
    if (grep) args.push('--grep', grep);
    return invoke(args, {
      cwd: suiteDir,
      env: {
        PLAYWRIGHT_HTML_REPORT: reportDir,
        PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(resultsDir, 'results.json'),
        PLAYWRIGHT_TEST_OUTPUT_DIR: resultsDir,
        BASE_URL: baseUrl,
        TEST_ENVIRONMENT: environment,
      },
    });
  },

  /** Records a script interactively. Output is written into the generated-output directory. */
  codegen({ url, outputFile = 'codegen.spec.ts', projectRoot } = {}) {
    if (!url) throw new Error('codegen requires a url.');
    const target = path.join(outputDir(projectRoot, 'codegen'), outputFile);
    return { ...invoke(['codegen', '--output', target, url]), outputPath: target };
  },

  /** One-shot screenshot — no session, no login. Use the node provider for authenticated screens. */
  screenshot({ url, name = 'screenshot.png', fullPage = true, projectRoot } = {}) {
    if (!url) throw new Error('screenshot requires a url.');
    const target = path.join(outputDir(projectRoot, 'screenshots'), name.endsWith('.png') ? name : `${name}.png`);
    const args = ['screenshot'];
    if (fullPage) args.push('--full-page');
    args.push(url, target);
    return { ...invoke(args), outputPath: target };
  },

  /** Opens a recorded trace in the Playwright trace viewer. */
  showTrace({ tracePath } = {}) {
    if (!tracePath) throw new Error('showTrace requires a tracePath.');
    return invoke(['show-trace', tracePath]);
  },

  /** Reports the installed Playwright CLI version — used by the Playwright prerequisite check. */
  version() {
    return invoke(['--version'], { timeoutMs: 60000 });
  },
};
