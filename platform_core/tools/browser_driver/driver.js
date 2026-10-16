// Browser Driver Layer — internal auth/session bootstrap.
//
// This is SHARED PLATFORM INFRASTRUCTURE ONLY — a reusable execution engine. It contains no
// project-specific data: the browser configuration and credentials it loads live under
// platform_core_data/, the single project root (pipeline.md §1). Design principle
// (see tools/browser_driver/README.md):
//   Shared execution engine  -> platform_core/tools/
//   Project knowledge        -> platform_core_data/
//   Module design output     -> platform_core_data/modules/{module}/  (that module's durable per-stage
//                                                                  artifacts, including its standalone
//                                                                  automation project under
//                                                                  modules/{module}/automation/)
//   Execution evidence       -> platform_core_data/runs/{{RUN_FOLDER}}/  (manual + automation execution
//                                                                  results only — immutable once written)
//   Automation baseline      -> platform_core_data/automation_baseline/  (the persistent Workspace
//                                                                  Automation Baseline, per framework —
//                                                                  it outlives any single run)
//   Browser Driver config    -> platform_core_data/knowledge_base/browser/       (Stage 2 exploration tooling —
//                                                                  NOT Stage 5 output; kept out of any
//                                                                  "automation" folder to avoid two
//                                                                  unrelated concepts sharing a name)
//   Credentials              -> platform_core_data/knowledge_base/credentials/   (git-ignored, never committed)
//
// This module is intentionally low-level and intentionally narrow: it knows how to load the
// Browser Profile (browser init + login mechanics ONLY — see profile.json's own
// contract below), load the Credentials file (WHO is logging in), launch a browser,
// and produce an authenticated Playwright `page`. It knows nothing about screens, menus,
// tables, or any other application-specific locator — that is Screen/Component Knowledge,
// loaded separately by `api.js` on demand (see `useScreen`/`useComponent`).
//
// Agents and automation scripts should NOT require this file directly — use `api.js`
// (`BrowserDriver`), which wraps this and exposes the operation-level API so agents never
// touch the Playwright API surface directly.
//
// SECURITY CONTRACT (do not weaken without updating tools/browser_driver/README.md):
//   - The Browser Profile (platform_core_data/knowledge_base/browser/profile.json) contains ONLY
//     non-secret structural configuration — defaultBaseUrl, browser settings, login
//     selectors/flow — and is versioned in this repo. It must stay small and stable; it is NOT a
//     place to accumulate screen/menu/table/dialog locators (see api.js) — those live in
//     platform_core_data/knowledge_base/browser/screens/ and .../components/.
//   - Credentials live at platform_core_data/knowledge_base/credentials/credentials.json, resolved from the
//     single project root — callers never need to pass a path. That file is real, secret, and
//     git-ignored (both a repo-root rule and a local platform_core_data/knowledge_base/credentials/.gitignore)
//     — it is NEVER committed. A non-secret platform_core_data/knowledge_base/credentials/credentials.template.json
//     is committed and shows the expected shape; a human copies it and fills in real values.
//   - The agent must not create or read this file itself — only this module (a plain Node
//     script the agent runs) reads it, and only at runtime.
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

// Roots come from platform_paths, never from this file's own location: once the platform is
// installed inside a host project, `__dirname/../../..` is the host's repository, not the tool
// folder (pipeline.md §1.1). Resolved lazily so requiring this module never throws on a
// misconfigured install — the error surfaces when a path is actually needed.
const { resolveRoots } = require('../platform_paths/paths');

function dataRoot() {
  return resolveRoots().dataRoot;
}

// Everything this driver resolves is shared across runs, so all of it sits under knowledge_base/
// rather than at the data root (pipeline.md §10.4).
function knowledgeBase() {
  return path.join(dataRoot(), 'knowledge_base');
}

function projectBrowserDir() {
  return path.join(knowledgeBase(), 'browser');
}

function projectCredentialsPath() {
  return path.join(knowledgeBase(), 'credentials', 'credentials.json');
}

// UI Knowledge Base — canonical, versioned baseline screenshots + screen metadata. Distinct from
// Discovery evidence (platform_core_data/modules/{module}/discovery/evidence/...), which documents one
// module's in-scope screens at a point in time rather than serving as the canonical baseline.
function projectUiScreenshotsDir() {
  return path.join(knowledgeBase(), 'ui', 'screenshots');
}

function loadProfile() {
  const profilePath = path.join(projectBrowserDir(), 'profile.json');
  if (!fs.existsSync(profilePath)) {
    throw new Error(
      `No browser profile found. Expected: ${profilePath}\n` +
      `Create it at platform_core_data/knowledge_base/browser/profile.json — see ` +
      `platform_core/tools/browser_driver/README.md.`
    );
  }
  return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
}

/**
 * Loads the credentials file (platform_core_data/knowledge_base/credentials/credentials.json, unless
 * `credentialsPathOverride` is given) and resolves which environment block to use.
 * Supported shapes (see tools/browser_driver/README.md):
 *   1. { "environment": "STG", "username": "...", "password": "...", "baseUrl": "..." }
 *   2. { "activeEnvironment": "STG", "environments": { "STG": {...}, "PREPROD": {...} } }
 *   3. { "username": "...", "password": "..." }   (flat, no environment label at all)
 * `envOverride` (the caller-supplied `env`) wins over anything named inside the file, when given.
 *
 * @returns {{ creds: {username, password, baseUrl?}, env: string|undefined }}
 */
function loadCredentials(envOverride, credentialsPathOverride) {
  const credentialsPath = credentialsPathOverride || projectCredentialsPath();

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Credentials file not found: ${credentialsPath}\n` +
      `Create it yourself (not via the agent) by copying ` +
      `platform_core_data/knowledge_base/credentials/credentials.template.json to credentials.json in that ` +
      `same folder and filling in real values — see tools/browser_driver/README.md and ` +
      `platform_core_data/knowledge_base/credentials/README.md.`
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
 * Resolves which login flow and base URL to use: the profile's root-level `login`/`defaultBaseUrl`
 * (unchanged default, used by every existing caller), or a named entry under `profile.apps[app]`
 * when `app` is given (added 2026-09-26 for a second application — e.g. a Portal — with a
 * structurally different login form from the Admin app every other module's tooling assumes).
 * Purely additive: omitting `app` reproduces the exact prior behavior.
 *
 * @param {object} profile
 * @param {string} [app]
 * @returns {{ loginConfig: object, appBaseUrl: string|undefined }}
 */
function resolveAppConfig(profile, app) {
  if (!app) {
    return { loginConfig: profile.login, appBaseUrl: undefined };
  }
  const appConfig = profile.apps && profile.apps[app];
  if (!appConfig) {
    throw new Error(
      `No app "${app}" defined in the Browser Profile's "apps" map. ` +
      `Registered apps: ${profile.apps ? Object.keys(profile.apps).join(', ') || '(none)' : '(none)'}.`
    );
  }
  return { loginConfig: appConfig.login, appBaseUrl: appConfig.baseUrl };
}

/**
 * Launches a browser per the Browser Profile's settings, authenticates against the resolved
 * environment, and returns the raw Playwright handles plus the loaded (non-secret) profile.
 * Prefer `api.js`'s `BrowserDriver.authenticate()` in calling code — this function is the
 * low-level building block.
 *
 * @param {object} opts
 * @param {string} [opts.env] - environment label, e.g. "STG" | "PREPROD" | "PROD" — overrides
 *   whatever the credentials file names itself; omit to let the credentials file decide.
 * @param {string} [opts.credentialsPath] - override the auto-resolved
 *   platform_core_data/knowledge_base/credentials/credentials.json path; only needed for edge cases (e.g. tests).
 * @param {boolean} opts.headless - REQUIRED: the human's explicit choice for this launch (true = Headless,
 *   false = Headed). Since Phase 9.3 no profile value (`browser.headless`, `browser.headlessByStage`) decides
 *   it — a missing choice is refused (MODE_REQUIRED) before anything is read.
 * @param {string} [opts.stage] - pipeline stage label, e.g. "manual_execution" — recorded context only; it
 *   no longer selects a display mode.
 * @param {string} [opts.app] - selects a named login flow from the profile's `apps` map (e.g.
 *   `'portal'`) instead of the root-level `login`/`defaultBaseUrl` — added 2026-09-26 for a second
 *   application with a different login form. Omit for the original, single-app behavior.
 */
async function launchAuthenticated({ env, credentialsPath, headless, stage, app, preflight } = {}) {
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
  const pfRecord = require('../run_manager/executionPreflight').assertLivePreflight({ ...(preflight || {}), headless });
  const profile = loadProfile();
  let { creds, env: resolvedEnv } = loadCredentials(env, credentialsPath);
  const { loginConfig, appBaseUrl } = resolveAppConfig(profile, app);

  if (loginConfig.agencyCodeSelector && !creds.agencyCode) {
    throw new Error(
      `The "${app}" app's login requires "agencyCode" in the resolved credentials for ` +
      `environment "${resolvedEnv}", but none was found.`
    );
  }

  // R-01 (Phase 9.5): the environment and the target this session opens are the ones the preflight confirmed —
  // compared before any browser starts.
  // eslint-disable-next-line global-require
  require('../run_manager/executionPreflight').assertSessionMatchesPreflight({ record: pfRecord, runsDir: preflight.runsDir, environment: resolvedEnv, url: creds.baseUrl || appBaseUrl || profile.defaultBaseUrl });
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

  const baseUrl = creds.baseUrl || appBaseUrl || profile.defaultBaseUrl;
  // `networkidle` is NOT a usable readiness signal for this target (fixed 2026-08-02).
  //
  // It resolves only after 500ms with no more than two in-flight requests. An Angular SPA that
  // polls, holds a keep-alive, or refreshes a token may never reach that state, so the wait ran to
  // its timeout and login failed — INTERMITTENTLY, which was the confusing part: it succeeded
  // whenever the app happened to fall quiet, and failed when it did not. Measured during a Stage 4M
  // run, the server answered `/`, `/auth/login`, `/dashboard` and `/admin/agency` in 22-50ms each
  // while this call timed out at 20s, which is what ruled out the environment.
  //
  // The correct readiness signal for a login page is the login form itself, so wait for that.
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await page.waitForSelector(loginConfig.usernameSelector, { state: 'visible', timeout: 30000 });
  } catch (err) {
    const diagPath = path.join(require('os').tmpdir(), `browser-driver-login-form-failure-${Date.now()}.png`);
    try {
      await page.screenshot({ path: diagPath });
    } catch (_) { /* best-effort diagnostic only */ }
    err.message += `\nPage URL while waiting for login form: ${page.url()}\nPage title: ${await page.title().catch(() => '(unavailable)')}\nDiagnostic screenshot: ${diagPath}`;
    throw err;
  }

  // Portal's login (app: 'portal') adds a third field ahead of username/password — Agency Code.
  // Root-level Admin login has no agencyCodeSelector, so this is skipped for every existing caller.
  if (loginConfig.agencyCodeSelector) {
    await page.fill(loginConfig.agencyCodeSelector, creds.agencyCode);
  }
  await page.fill(loginConfig.usernameSelector, creds.username);
  await page.fill(loginConfig.passwordSelector, creds.password);

  // Credentials are no longer needed after this point — drop the reference so nothing
  // downstream in this process can accidentally serialize/log it.
  creds = null;

  await page.click(loginConfig.submitSelector);
  try {
    await page.waitForSelector(loginConfig.successSelector, { timeout: 20000 });
  } catch (err) {
    const diagPath = path.join(require('os').tmpdir(), `browser-driver-login-failure-${Date.now()}.png`);
    try {
      await page.screenshot({ path: diagPath });
    } catch (_) { /* best-effort diagnostic only */ }
    err.message += `\nPost-login page URL: ${page.url()}\nPost-login page title: ${await page.title().catch(() => '(unavailable)')}\nDiagnostic screenshot: ${diagPath}`;
    throw err;
  }

  return { browser, context, page, profile, env: resolvedEnv };
}

module.exports = {
  launchAuthenticated,
  loadProfile,
  projectBrowserDir,
  projectCredentialsPath,
  projectUiScreenshotsDir,
};
