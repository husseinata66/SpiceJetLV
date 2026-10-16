// playwright-node Browser Provider — the session implementation behind the Browser Provider
// interface (platform_core/tools/browser_provider/index.js).
//
// Skills never call Playwright directly and never require this file. They obtain a session from
// the Browser Provider interface and use its operation-level methods —
// navigate/click/type/screenshot/extractText/extractTable/waitFor/captureNetwork. Swapping the
// configured provider in platform.config.json changes nothing about how a Skill is written.
//
// This module (like driver.js) is shared platform infrastructure ONLY — it contains no
// project-specific data and hardcodes no project directory name. Locator knowledge is deliberately
// kept OUT of the Browser Profile (which stays small and stable — auth/browser-init only, see
// driver.js) and lives instead under the configured project root, loaded on demand:
//   {{PROJECT_ROOT}}/browser/screens/{ScreenName}.json      — one screen's locators
//   {{PROJECT_ROOT}}/browser/components/{ComponentName}.json — shared/reusable locators
// Call `useScreen('ScreenName')` / `useComponent('ComponentName')` to load one into the active
// locator set; `click()`/`type()`/etc. then accept either a dotted key into that set (e.g.
// "nav.master", "addButton") or a literal Playwright selector as a fallback.
//
// Guardrails wired in by default:
//   - Any unexpected browser dialog (alert/confirm/prompt/beforeunload) is captured and DISMISSED
//     (never accepted, so a destructive confirmation is never silently confirmed) — check
//     `session.takePendingDialog()` after any action and stop if one fired.
//   - Network requests/responses are captured continuously; `captureNetwork()` drains the buffer.

const fs = require('fs');
const path = require('path');
const { launchAuthenticated, projectBrowserDir, projectUiScreenshotsDir } = require('./driver');

function knowledgeFilePath(kind, name, projectRoot) {
  return path.join(projectBrowserDir(projectRoot), kind, `${name}.json`);
}

function readKnowledgeFile(kind, name, projectRoot) {
  // kind: 'screens' | 'components'
  const filePath = knowledgeFilePath(kind, name, projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No ${kind.slice(0, -1)} definition "${name}". Expected: ${filePath}\n` +
      `Add it under {{PROJECT_ROOT}}/browser/${kind}/ — see ` +
      `platform_core/tools/browser_provider/README.md.`
    );
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Schema: { meta?: {...}, locators: {...} } — fall back to treating the whole file as locators
  // for any file that predates the meta/locators split.
  return parsed.locators ? parsed.locators : parsed;
}

function resolveLocator(locators, keyOrSelector) {
  const parts = keyOrSelector.split('.');
  let node = locators;
  for (const part of parts) {
    if (node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, part)) {
      node = node[part];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node === 'string') return node;
  return keyOrSelector; // not found in loaded Screen/Component knowledge — treat as a literal selector
}

class PlaywrightNodeSession {
  constructor({ browser, context, page, profile, env, projectRoot }) {
    this.providerId = 'playwright-node';
    this.browser = browser;
    this.context = context;
    this.page = page;
    this.profile = profile;
    this.env = env;
    this.projectRoot = projectRoot;
    this._locators = {}; // populated only via useScreen()/useComponent() — never from profile.json
    this._networkLog = [];
    this._pendingDialog = null;
    this._wireGuardrails();
  }

  /**
   * The only way to obtain a session. Never construct this class directly, and never call it from
   * a Skill — go through the Browser Provider interface, which selects the provider from
   * platform.config.json.
   */
  static async authenticate({ env, credentialsPath, headless, projectRoot, preflight } = {}) {
    const { browser, context, page, profile, env: resolvedEnv } = await launchAuthenticated({
      env, credentialsPath, headless, projectRoot, preflight,
    });
    return new PlaywrightNodeSession({ browser, context, page, profile, env: resolvedEnv, projectRoot });
  }

  _wireGuardrails() {
    this.page.on('dialog', async (dialog) => {
      this._pendingDialog = { type: dialog.type(), message: dialog.message(), time: Date.now() };
      // Never accept — accepting could confirm a destructive/production-risk action.
      await dialog.dismiss();
    });
    this.page.on('request', (req) => {
      this._networkLog.push({ kind: 'request', method: req.method(), url: req.url(), time: Date.now() });
    });
    this.page.on('response', (res) => {
      this._networkLog.push({ kind: 'response', status: res.status(), url: res.url(), time: Date.now() });
    });
  }

  /** Returns and clears any dialog captured since the last check — call after every action. */
  takePendingDialog() {
    const d = this._pendingDialog;
    this._pendingDialog = null;
    return d;
  }

  /** Loads a screen's locator definitions into the active set (merged, screen/component wins last-loaded). */
  useScreen(screenName) {
    this._locators = { ...this._locators, ...readKnowledgeFile('screens', screenName, this.projectRoot) };
    return this;
  }

  /** Loads a shared component's locator definitions into the active set. */
  useComponent(componentName) {
    this._locators = { ...this._locators, ...readKnowledgeFile('components', componentName, this.projectRoot) };
    return this;
  }

  resolve(keyOrSelector) {
    return resolveLocator(this._locators, keyOrSelector);
  }

  async navigate(pathOrUrl) {
    const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
    const url = isAbsolute ? pathOrUrl : new URL(pathOrUrl, this.profile.defaultBaseUrl).toString();
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  }

  async click(keyOrSelector) {
    await this.page.click(this.resolve(keyOrSelector));
  }

  async type(keyOrSelector, text) {
    await this.page.fill(this.resolve(keyOrSelector), text);
  }

  async select(keyOrSelector, optionLabel) {
    await this.page.selectOption(this.resolve(keyOrSelector), { label: optionLabel });
  }

  async screenshot(name, opts = {}) {
    const outDir = opts.dir || process.cwd();
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, name.endsWith('.png') ? name : `${name}.png`);
    await this.page.screenshot({ path: filePath, fullPage: opts.fullPage !== false });
    return filePath;
  }

  async extractText(keyOrSelector) {
    return (await this.page.locator(this.resolve(keyOrSelector)).innerText()).trim();
  }

  /** Returns a table as an array of rows, each an array of cell strings (header row included). */
  async extractTable(keyOrSelector) {
    const sel = this.resolve(keyOrSelector);
    return this.page.locator(sel).evaluate((table) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      return rows.map((row) =>
        Array.from(row.querySelectorAll('th,td')).map((cell) => cell.innerText.trim())
      );
    });
  }

  async waitFor(keyOrSelector, opts = {}) {
    await this.page.waitForSelector(this.resolve(keyOrSelector), opts);
  }

  /** Drains and returns everything captured since the last call (or since session start). */
  captureNetwork() {
    const log = this._networkLog;
    this._networkLog = [];
    return log;
  }

  /**
   * UI Knowledge Base baseline capture — ONE canonical, versioned screenshot per screen, distinct
   * from Discovery run evidence (which stays under {{PROJECT_ROOT}}/workspace/discovery/,
   * per-run/temporary).
   *
   * Idempotent: if {{PROJECT_ROOT}}/ui/screenshots/{screenName}.png already exists, this is a
   * no-op (never overwrites) unless `opts.refresh` is explicitly true — refreshing is a deliberate,
   * human-approved action, never automatic.
   *
   * Also creates/updates {{PROJECT_ROOT}}/browser/screens/{screenName}.json's `meta` block
   * (screenName, navigationPath, lastVerified, screenshot, accessRoles, pageTitle) without
   * touching any existing `locators` in that file.
   *
   * @param {string} screenName
   * @param {object} [opts]
   * @param {string} [opts.navigationPath] - human-readable nav path, e.g. "Master → Flight → Airport"
   * @param {string[]} [opts.accessRoles] - which role(s) this baseline was captured under
   * @param {boolean} [opts.refresh] - explicitly allow overwriting an existing baseline
   * @returns {{ screenshotPath: string, created: boolean, meta: object }}
   */
  async captureBaseline(screenName, opts = {}) {
    const uiDir = projectUiScreenshotsDir(this.projectRoot);
    if (!fs.existsSync(uiDir)) fs.mkdirSync(uiDir, { recursive: true });
    const screenshotFile = `${screenName}.png`;
    const screenshotPath = path.join(uiDir, screenshotFile);

    const alreadyExists = fs.existsSync(screenshotPath);
    let created = false;
    if (!alreadyExists || opts.refresh) {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      created = true;
    }

    const pageTitle = await this.page.title().catch(() => undefined);
    const today = new Date().toISOString().slice(0, 10);

    const screenFilePath = knowledgeFilePath('screens', screenName, this.projectRoot);
    let existing = { locators: {} };
    if (fs.existsSync(screenFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(screenFilePath, 'utf8'));
      existing = parsed.locators ? parsed : { locators: parsed }; // migrate pre-meta/locators files
    } else {
      const dir = path.dirname(screenFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    const meta = {
      screenName,
      navigationPath: opts.navigationPath || (existing.meta && existing.meta.navigationPath) || '',
      lastVerified: today,
      screenshot: screenshotFile,
      accessRoles: opts.accessRoles || (existing.meta && existing.meta.accessRoles) || [],
      pageTitle: pageTitle || (existing.meta && existing.meta.pageTitle) || '',
    };

    const updated = { meta, locators: existing.locators || {} };
    fs.writeFileSync(screenFilePath, JSON.stringify(updated, null, 2) + '\n');

    return { screenshotPath, created, meta };
  }

  async close() {
    await this.browser.close();
  }
}

module.exports = { PlaywrightNodeSession };
