// playwright-node Browser Provider — internal auth/session bootstrap.
//
// This is SHARED PLATFORM INFRASTRUCTURE ONLY — a reusable execution engine. It contains no
// project-specific data and no hardcoded project directory name: every project path is resolved
// dynamically from the configured PROJECT ROOT via platform_core/tools/project_paths/.
// Design principle (see platform_core/tools/browser_provider/README.md):
//   Shared execution engine  -> platform_core/tools/browser_provider/
//   Project knowledge        -> {{PROJECT_ROOT}}/
//   Generated outputs        -> {{PROJECT_ROOT}}/workspace/     (approved artifacts) and
//                               {{GENERATED_OUTPUT_DIR}}/       (throwaway tool output, gitignored)
//   Browser Provider config  -> {{PROJECT_ROOT}}/browser/       (Discovery-stage tooling —
//                                                                NOT Automation-stage output; kept out
//                                                                of any "automation" folder to avoid two
//                                                                unrelated concepts sharing a name)
//   Credentials              -> {{PROJECT_ROOT}}/credentials/   (git-ignored, never committed)
//
// This module is intentionally low-level and intentionally narrow: it knows how to load the
// Browser Profile (browser init + login mechanics ONLY — see profile.json's own
// contract below), load the Credentials file (WHO is logging in), launch a browser,
// and produce an authenticated Playwright `page`. It knows nothing about screens, menus,
// tables, or any other application-specific locator — that is Screen/Component Knowledge,
// loaded separately by `session.js` on demand (see `useScreen`/`useComponent`).
//
// Skills NEVER require this file, and never require `playwright` themselves. Skills invoke the
// Browser Provider interface (`platform_core/tools/browser_provider/`), which selects a concrete
// provider from platform.config.json. This file is one such provider's implementation detail.
//
// SECURITY CONTRACT (do not weaken without updating platform_core/tools/browser_provider/README.md):
//   - The Browser Profile ({{PROJECT_ROOT}}/browser/profile.json) contains ONLY
//     non-secret structural configuration — defaultBaseUrl, browser settings, login
//     selectors/flow — and is versioned in this repo. It must stay small and stable; it is NOT a
//     place to accumulate screen/menu/table/dialog locators (see session.js) — those live in
//     {{PROJECT_ROOT}}/browser/screens/ and .../components/.
//   - Credentials live at {{PROJECT_ROOT}}/credentials/credentials.json, resolved from the
//     configured project root — callers never need to pass a path. That file is real, secret, and
//     git-ignored (both a repo-root rule and a local {{PROJECT_ROOT}}/credentials/.gitignore)
//     — it is NEVER committed. A non-secret {{PROJECT_ROOT}}/credentials/credentials.template.json
//     is committed and shows the expected shape; a human copies it and fills in real values.
//   - A Skill must not create or read this file itself — only this module (a plain Node
//     script the Skill runs) reads it, and only at runtime.
//   - Credentials are read once, at call time, kept only in local variables for the duration of
//     the login sequence, and never written to any log, console, or artifact.
//   - This module never persists a copy of the credentials anywhere else. If a future change
//     needs a temporary file, it MUST be deleted (fs.unlink) before this function returns or throws.
//   - Calling code must not print `creds` or any of its fields, and must not paste credential
//     values into any Markdown/JSON artifact this platform generates.

const fs = require('fs');
const path = require('path');
// Playwright is a peer tool, not a runtime dependency of this package (the platform ships
// dependency-free — see .github/workflows/ci.yml). Resolved lazily for the same reason the roots
// below are: requiring this module must never throw on a machine that has not installed it. The
// error surfaces when a browser is actually launched, and says what to install.
function chromium() {
  try {
    return require("playwright").chromium;
  } catch {
    const err = new Error(
      "Playwright is not installed. Launching a browser needs it: run `npm i -D playwright` " +
      "and `npx playwright install chromium`. The platform itself ships dependency-free, so " +
      "Playwright is installed only on a machine that actually drives a browser."
    );
    err.code = "PLAYWRIGHT_NOT_INSTALLED";
    throw err;
  }
}

// Every project-specific path is resolved dynamically from the configured PROJECT ROOT — this
// module hardcodes no project directory name (see platform_core/tools/project_paths/README.md).
const { resolvePaths } = require('../../../project_paths');

function paths(projectRoot) {
  return resolvePaths(projectRoot);
}

function projectBrowserDir(projectRoot) {
  return paths(projectRoot).browser;
}

function projectCredentialsPath(projectRoot) {
  return paths(projectRoot).credentialsFile;
}

// UI Knowledge Base — canonical, versioned baseline screenshots + screen metadata. Distinct from
// Discovery run evidence ({{PROJECT_ROOT}}/workspace/discovery/...), which stays per-run/temporary.
function projectUiScreenshotsDir(projectRoot) {
  return paths(projectRoot).uiScreenshots;
}

function loadProfile(projectRoot) {
  const profilePath = paths(projectRoot).browserProfile;
  if (!fs.existsSync(profilePath)) {
    throw new Error(
      `No browser profile found. Expected: ${profilePath}\n` +
      `Create it at {{PROJECT_ROOT}}/browser/profile.json — see ` +
      `platform_core/tools/browser_provider/README.md.`
    );
  }
  return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
}

/**
 * Loads the credentials file ({{PROJECT_ROOT}}/credentials/credentials.json, unless
 * `credentialsPathOverride` is given) and resolves which environment block to use.
 * Supported shapes (see platform_core/tools/browser_provider/README.md):
 *   1. { "environment": "STG", "username": "...", "password": "...", "baseUrl": "..." }
 *   2. { "activeEnvironment": "STG", "environments": { "STG": {...}, "PREPROD": {...} } }
 *   3. { "username": "...", "password": "..." }   (flat, no environment label at all)
 * `envOverride` (the caller-supplied `env`) wins over anything named inside the file, when given.
 *
 * @returns {{ creds: {username, password, baseUrl?}, env: string|undefined }}
 */
function loadCredentials(envOverride, credentialsPathOverride, projectRoot) {
  const credentialsPath = credentialsPathOverride || projectCredentialsPath(projectRoot);

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Credentials file not found: ${credentialsPath}\n` +
      `Create it yourself (never via a Skill) by copying ` +
      `{{PROJECT_ROOT}}/credentials/credentials.template.json to credentials.json in that ` +
      `same folder and filling in real values — see ` +
      `platform_core/tools/browser_provider/README.md and {{PROJECT_ROOT}}/credentials/README.md.`
    );
  }
  const parsed = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

  let env = envOverride;
  let creds;

  if (parsed.environments) {
    env = env || parsed.activeEnvironment;
    if (!env) {
      throw new Error(
        `Credentials file uses the multi-environment shape but names no environment — ` +
        `pass { env } to authenticate(), or set "activeEnvironment" in the credentials file.`
      );
    }
    creds = parsed.environments[env];
    if (!creds) {
      throw new Error(`Credentials file has no "environments.${env}" block.`);
    }
  } else {
    // Shapes 1 and 3 — the file itself IS the (single) environment's credentials.
    env = env || parsed.environment;
    creds = parsed;
  }

  if (!creds.username || !creds.password) {
    throw new Error(
      `Resolved credentials for environment "${env}" are missing "username" and/or "password".`
    );
  }
  return { creds, env }; // in-memory only — never logged, never re-serialized
}

/**
 * Launches a browser per the Browser Profile's settings, authenticates against the resolved
 * environment, and returns the raw Playwright handles plus the loaded (non-secret) profile.
 * Prefer `api.js`'s `browser.createSession()` in calling code — this function is the
 * low-level building block.
 *
 * @param {object} opts
 * @param {string} [opts.env] - environment label, e.g. "STG" | "PREPROD" | "PROD" — overrides
 *   whatever the credentials file names itself; omit to let the credentials file decide.
 * @param {string} [opts.credentialsPath] - override the auto-resolved
 *   {{PROJECT_ROOT}}/credentials/credentials.json path; only needed for edge cases (e.g. tests).
 * @param {boolean} opts.headless - REQUIRED: the human's explicit choice for this launch (true = Headless,
 *   false = Headed); a missing choice is refused (MODE_REQUIRED) — never the profile's browser.headless
 * @param {string} [opts.projectRoot] - override the configured project root; omit in normal use
 */
async function launchAuthenticated({ env, credentialsPath, headless, projectRoot, preflight } = {}) {
  // Headed or Headless is a human's explicit choice for THIS launch (pipeline.md §6 Rule 11; Phase 9.3,
  // workflow enforcement). It is checked here, at the launch itself, before any profile or credential is
  // read — never taken from a profile default, a per-stage default or the previous run.
  if (typeof headless !== 'boolean') {
    const err = new Error('launchAuthenticated requires an explicit `headless` (true = Headless, false = Headed), asked of the human '
      + 'immediately before this launch — it is never defaulted, inferred or carried over (pipeline.md §6 Rule 11).');
    err.code = 'MODE_REQUIRED';
    throw err;
  }
  // Live-activity boundary (Phase 9.4): the run's stage has a confirmed Safety Preflight for a browser, in this mode.
  // eslint-disable-next-line global-require
  const pfRecord = require('../../../run_manager/executionPreflight').assertLivePreflight({ ...(preflight || {}), headless });
  const profile = loadProfile(projectRoot);
  let { creds, env: resolvedEnv } = loadCredentials(env, credentialsPath, projectRoot);

  // R-01 (Phase 9.5): environment and target compared with the confirmed preflight before any browser starts.
  // eslint-disable-next-line global-require
  require('../../../run_manager/executionPreflight').assertSessionMatchesPreflight({ record: pfRecord, runsDir: preflight.runsDir, environment: resolvedEnv, url: creds.baseUrl || profile.defaultBaseUrl });
  const browserSettings = profile.browser || {};
  const isHeadless = headless;

  const browser = await chromium().launch({
    channel: browserSettings.channel || 'chrome',
    headless: isHeadless,
  });
  const context = await browser.newContext({
    viewport: browserSettings.viewport || { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const baseUrl = creds.baseUrl || profile.defaultBaseUrl;
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });

  await page.fill(profile.login.usernameSelector, creds.username);
  await page.fill(profile.login.passwordSelector, creds.password);

  // Credentials are no longer needed after this point — drop the reference so nothing
  // downstream in this process can accidentally serialize/log it.
  creds = null;

  await page.click(profile.login.submitSelector);
  await page.waitForSelector(profile.login.successSelector, { timeout: 20000 });

  return { browser, context, page, profile, env: resolvedEnv };
}

module.exports = {
  launchAuthenticated,
  loadProfile,
  projectBrowserDir,
  projectCredentialsPath,
  projectUiScreenshotsDir,
};
