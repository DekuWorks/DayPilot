# Validation baseline

**Date:** 7 September 2026  
Commands discovered from package.json and CI. Results recorded below after a local run. Failures are not suppressed.

## Desired flow vs reality

```text
Format        API Prettier only
 ↓
Lint          turbo pnpm lint (web eslint, api eslint, lib stub)
 ↓
Typecheck     no script — included in builds
 ↓
Tests         API Jest only
 ↓
Web Build     next build
 ↓
Mobile        flutter analyze / flutter test (not run in this pass unless noted)
```

## Commands

```bash
pnpm --filter @daypilot/api run format          # writes
pnpm --filter @daypilot/api exec prettier --check "src/**/*.ts"
pnpm lint
pnpm --filter @daypilot/api test
pnpm --filter @daypilot/api run build
pnpm --filter @daypilot/web run lint
pnpm --filter @daypilot/web run build
```

CI (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile` → `pnpm db:generate` → **API Jest** → **web `*.spec.ts`** → `pnpm run build` → `pnpm run lint`.

## Run log

| Command                                | Result                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @daypilot/api test`     | **Pass** — 7 suites, 43 tests                                                                                            |
| `pnpm --filter @daypilot/api run lint` | **Fail** — 2 errors, 91 warnings (existing). Script uses `--fix`; that rewrite was reverted and is not part of this work |
| Root `pnpm lint` / web build           | Not treated as green until recorded separately                                                                           |
| Web unit tests                         | **No script**                                                                                                            |
| Flutter                                | `flutter test` exists (~15 files). Flutter CI runs it. Main `ci.yml` does not. Not re-run in this pass                   |

Do not hide the API lint failures. They predate this audit.
