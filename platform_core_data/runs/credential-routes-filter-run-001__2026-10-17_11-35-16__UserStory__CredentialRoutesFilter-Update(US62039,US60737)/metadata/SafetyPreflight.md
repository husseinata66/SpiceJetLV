# Safety Preflight — credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)

Recorded by the Run Manager (`state preflight`). A stage that executes tests (4M, 5A, 5H) starts only with a confirmed preflight whose binding still matches. Every confirmation and refusal is kept.

| ID | Stage | At | Decision | Environment | Target URL | Execution | Operations | Confirmed by | Binding |
|---|---|---|---|---|---|---|---|---|---|
| SP-1 | 2 | 2026-10-17T08:55:02.822Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 2 (0 mutating) | Ahmed Ayman | `36603567ba9c` |
| SP-2 | 2 | 2026-10-17T08:55:30.014Z | **refused** | ODEYSYS (unknown) | http://192.168.1.70/ | browser / Headless | 2 (0 mutating) | Ahmed Ayman | `8c0ac1007637` |
| SP-3 | 2 | 2026-10-17T09:00:06.513Z | **refused** | UAT (unknown) | http://192.168.1.70/ | browser / Headless | 2 (0 mutating) | Ahmed Ayman | `682e2a2187ff` |
| SP-4 | 2 | 2026-10-17T09:00:26.663Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 2 (0 mutating) | Ahmed Ayman | `de25c02c512f` |
| SP-5 | 2 | 2026-10-17T09:37:43.246Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 2 (0 mutating) | Ahmed Ayman | `de25c02c512f` |
| SP-6 | 2 | 2026-10-17T09:37:49.867Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 2 (0 mutating) | Ahmed Ayman | `de25c02c512f` |
| SP-7 | 2 | 2026-10-17T09:37:58.484Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 2 (0 mutating) | Ahmed Ayman | `de25c02c512f` |
| SP-8 | 2 | 2026-10-17T09:46:32.085Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 1 (0 mutating) | Ahmed Ayman | `8b6f80624c47` |
| SP-9 | 2 | 2026-10-17T09:46:47.989Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 1 (0 mutating) | Ahmed Ayman | `8b6f80624c47` |
| SP-10 | 2 | 2026-10-17T09:46:54.376Z | **confirmed** | Staging (non-production) | http://192.168.1.70/ | browser / Headless | 1 (0 mutating) | Ahmed Ayman | `8b6f80624c47` |

## Refusals

- **SP-2** (2026-10-17T08:55:30.014Z): "ODEYSYS" is not a known environment (Local, Development, QA, Test, Staging, PreProduction, Production; aliases: STG, staging, stg, STG_PORTAL, ANCILLARIES_STG) — an unknown environment is refused, never treated as Staging
- **SP-3** (2026-10-17T09:00:06.513Z): "UAT" is not a known environment (Local, Development, QA, Test, Staging, PreProduction, Production; aliases: STG, staging, stg, STG_PORTAL, ANCILLARIES_STG) — an unknown environment is refused, never treated as Staging
