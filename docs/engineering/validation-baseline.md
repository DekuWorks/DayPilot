# Validation baseline

**Date:** 15 September 2026  
Commands discovered from package.json and CI. Failures are not suppressed.

## Desired flow vs reality

```text
Format        API Prettier (`prettier --check` in CI)
 ↓
Lint          turbo pnpm lint (web eslint, api eslint, lib/ui tsc --noEmit)
 ↓
Typecheck     no root script — included in builds + package lint
 ↓
Tests         API Jest + web `*.spec.ts`
 ↓
Web Build     next build
 ↓
Mobile        flutter analyze / flutter test (Flutter workflow; not main ci.yml)
```

## Commands

```bash
pnpm --filter @daypilot/api run format          # writes
pnpm --filter @daypilot/api exec prettier --check "src/**/*.ts"
pnpm lint
pnpm --filter @daypilot/api test
pnpm --filter @daypilot/web test
pnpm --filter @daypilot/api run build
pnpm --filter @daypilot/web run lint
pnpm --filter @daypilot/web run build
```

CI (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile` → `pnpm db:generate` → **API Jest** → **web `*.spec.ts`** → **Prettier check (API)** → `pnpm run build` → `pnpm run lint`.

## Notes

- `@daypilot/lib` / `@daypilot/ui` lint scripts typecheck with `tsc --noEmit` (no longer echo stubs).
- Debt inventory: `docs/engineering/TECHNICAL_DEBT.md`.
- Do not invent a root `typecheck` or `test` script; use the filters above.
