# Credentials

Real credentials for Browser Automation (`platform_core/tools/browser_driver/`) live here, as `credentials.json`, created **locally by a human** — never by the agent, never committed.

- `credentials.template.json` — committed, non-secret placeholder showing the required shape. Copy it to `credentials.json` in this same folder and fill in real values.
- `credentials.json` — **your real credentials.** Blocked from Git by this folder's own `.gitignore` (belt-and-suspenders alongside the repo root `.gitignore`'s `**/credentials.json` rule). Never rename/remove that `.gitignore` entry, and never `git add -f` this file.
- `BrowserDriver.authenticate({ env, app? })` loads this file automatically — you never need to pass a path. See `platform_core/tools/browser_driver/README.md` for the full contract (in-memory-only use, never logged, never copied into artifacts). An environment block may include `agencyCode` and/or `baseUrl` — only needed when the selected `app` (e.g. `'portal'`) declares an `agencyCodeSelector`, or when you want to override that app's own `baseUrl` from `profile.json`.

Unlike the earlier session-scratchpad convention, this file is **not** session-scoped — it persists on your local disk across sessions (protected only by `.gitignore`, not by being outside the working tree). Delete it yourself if you want it gone; the platform never deletes or rotates it for you.
