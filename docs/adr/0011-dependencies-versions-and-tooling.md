# ADR-11: Dependencies, Versions, and Tooling

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §1, §6, §7, §8 (item 11: Dependencies, with versions and compatibility), Spec ID-20.5, ID-24

---

## Context

`AGENTS.md` §6 and §7 require using **one library per responsibility**, adding no dependency outside those approved in an ADR or ticket, passing TypeScript in `strict` mode, and passing mandatory React Hooks and accessibility lint checks.

Registry verification on `2026-11-26` (`docs/research/react-architecture.md` §1 & Addendum) uncovered three critical version-compatibility constraints that must be pinned explicitly before `WI-3` generates `package.json`:

1. **Node.js floor:** `react-router@8.5.3` (`>=22.22.0`), `jsdom@31.0.1` (`^22.22.2 || ^24.15.0 || >=26`), `vitest@5.1.2`, `msw@3.0.8`, and `@axe-core/playwright@4.14.1` (`>=22.12.0`) set the real minimum Node runtime at **`>=22.22.2`** (local environment verified at `v24.18.0`, npm `11.16.0`).
2. **TypeScript 6.0.3 vs TypeScript 7.0.2:** TypeScript `7.0.2` (native compiler) does **not** ship a JS compiler API; `typescript-eslint@8.74.0` declares `peer typescript >=4.8.4 <6.1.0` and fails with `typescript@7.0.2` installed directly.
3. **ESLint 9.39.5 vs ESLint 10.15.0:** `eslint-plugin-jsx-a11y@6.10.2` caps its ESLint peer at `^9` (`<=9`), conflicting with `eslint@10.15.0`. Additionally, `@eslint/js@10.0.1` requires `eslint ^10.0.0`, so choosing ESLint 9 also requires pinning `@eslint/js` to **`9.39.5`**.

---

## Decision

### 1. Runtime & package management policy

- **Node.js engine:** Pin `24.x` in `package.json` and run **Node 24 LTS** (e.g., `24.18.0`) in CI and Vercel builds. The verified library compatibility floor is `>=22.22.2`, but this project intentionally uses the stricter Node 24 policy.
- **Exact direct version pinning:** Commit `.npmrc` with `save-exact=true` and commit `package-lock.json` so every agent and CI build installs identical direct dependency versions without surprise minor/patch drift.
- **CI supply-chain gates (`security.md` §8, `ID-20.5`):** Every CI workflow runs:
  1. `npm ci` (frozen lockfile install)
  2. `npm audit --audit-level=high`
  3. `npm audit signatures`
  4. GitHub Dependency Graph, Dependabot Alerts, and Dependabot Security Updates enabled on the repository.

### 2. Compiler, linter, and formatter decisions

- **TypeScript `6.0.3`:** Selected over `7.0.2` so `typescript-eslint@8.74.0` works cleanly with a single standard `typescript` package (no alias workarounds). Required `tsconfig.json` flags:
  - `"strict": true` (`AGENTS.md` §7)
  - `"noUncheckedSideEffectImports": true` (catches broken CSS/font side-effect imports)
  - `"noUncheckedIndexedAccess": true` (safer array/record indexing)
  - `"types": ["vite/client"]` (explicit, because TS 6 defaults `types` to `[]`; test files extend with `vitest/globals` or explicit imports)
  - `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"noEmit": true`, `"jsx": "react-jsx"`
- **ESLint `9.39.5` + `@eslint/js` `9.39.5` (flat config `eslint.config.js`):** Selected over ESLint `10.15.0` to retain `eslint-plugin-jsx-a11y@6.10.2` static accessibility linting alongside:
  - `typescript-eslint` `8.74.0` (type-aware rules + strict TS linting)
  - `eslint-plugin-react-hooks` `7.1.1` (`recommended` preset including Rules of Hooks + all React Compiler purity/immutability rules)
  - `eslint-plugin-jsx-a11y` `6.10.2` (`recommended` accessibility rules)
  - `eslint-plugin-boundaries` `7.4.5` + `no-restricted-imports` (`ADR-03` layer boundaries)
  - `no-restricted-syntax` rule explicitly **banning `JSXAttribute[name.name="dangerouslySetInnerHTML"]`** (`ID-20.5`, `ADR-01`)
  - `no-restricted-globals` banning direct `fetch` outside `src/shared/api/httpClient.ts` (`ADR-05`)
  - `globals` `17.14.0`
- **Prettier `3.10.1`:** Project-local `.prettierrc` and `.prettierignore`, enforced in CI via `prettier --check .`.

### 3. Complete approved dependency manifest (exact versions verified `2026-11-26`)

Any package not listed below requires a new ADR or explicit ticket authorization (`AGENTS.md` §6).

#### Production `dependencies`

| Package | Pinned Version | Responsibility | Owning ADR |
|---|---|---|---|
| `react` | `19.3.1` | UI runtime | ADR-02 |
| `react-dom` | `19.3.1` | Browser DOM renderer | ADR-02 |
| `react-is` | `19.3.1` | Peer dependency required by `recharts` 3 matching React 19 | ADR-09 |
| `react-router` | `8.5.3` | Data-mode client routing & lazy route splitting | ADR-02, ADR-07 |
| `@tanstack/react-query` | `5.108.4` | Server-state fetching, caching, deduplication, rollback | ADR-05 |
| `react-error-boundary` | `6.1.6` | Root & block-level error boundaries | ADR-07 |
| `react-hook-form` | `7.92.0` | Form state, `setError`, `isSubmitting` | ADR-08 |
| `zod` | `4.6.7` | Client schema validation & type inference | ADR-08 |
| `@hookform/resolvers` | `7.0.9` | `zodResolver` bridge (RHF 7 + Zod 4) | ADR-08 |
| `lucide-react` | `1.81.0` | Standard tree-shakable UI icons | ADR-04 |
| `recharts` | `3.11.1` | Lazy-loaded monthly area chart | ADR-09 |
| `@fontsource/inter` | `5.3.0` | Self-hosted static Inter latin 400/500/600/700 | ADR-09 |
| `@fontsource/rubik` | `5.3.0` | Self-hosted static Rubik latin 400 wordmark | ADR-09 |

#### Development `devDependencies`

| Package | Pinned Version | Responsibility | Owning ADR |
|---|---|---|---|
| `vite` | `8.4.0` | Dev server & Rolldown/Oxc production bundler | ADR-02 |
| `@vitejs/plugin-react` | `6.3.0` | React Fast Refresh & Oxc JSX transform | ADR-02, ADR-09 |
| `tailwindcss` | `4.3.5` | CSS-first `@theme` utility styling | ADR-04 |
| `@tailwindcss/vite` | `4.3.5` | First-party Tailwind v4 Vite plugin | ADR-04 |
| `typescript` | `6.0.3` | Strict static type checking (TS compiler API compatible) | ADR-11 |
| `@types/react` | `19.3.3` | React 19 TypeScript definitions | ADR-11 |
| `@types/react-dom` | `19.3.0` | ReactDOM 19 TypeScript definitions | ADR-11 |
| `@types/node` | `24.19.4` | Node 24 LTS definitions for config/CI scripts | ADR-11 |
| `eslint` | `9.39.5` | Flat-config linter (compatible with `jsx-a11y`) | ADR-11 |
| `@eslint/js` | `9.39.5` | Core ESLint 9 recommended rules | ADR-11 |
| `typescript-eslint` | `8.74.0` | TypeScript ESLint parser & rules | ADR-11 |
| `eslint-plugin-react-hooks` | `7.1.1` | Rules of Hooks + React Compiler static lint rules | ADR-09, ADR-11 |
| `eslint-plugin-jsx-a11y` | `6.10.2` | Static JSX accessibility linting | ADR-11 |
| `eslint-plugin-boundaries` | `7.4.5` | Feature & shared-layer import boundary enforcement | ADR-03 |
| `globals` | `17.14.0` | Browser/Node global sets for ESLint flat config | ADR-11 |
| `prettier` | `3.10.1` | Deterministic code formatting | ADR-11 |
| `rollup-plugin-visualizer` | `7.3.0` | Rolldown/Vite 8 bundle treemap analysis | ADR-09 |
| `@tanstack/react-query-devtools` | `5.108.4` | Dev-only query cache inspection (stripped in prod) | ADR-05 |
| `vitest` | `5.1.2` | Unit/component/integration test runner | ADR-10 |
| `jsdom` | `31.0.1` | DOM environment for Vitest | ADR-10 |
| `@testing-library/react` | `16.3.3` | React 19 user-centric component rendering | ADR-10 |
| `@testing-library/dom` | `10.4.2` | DOM accessibility query engine | ADR-10 |
| `@testing-library/user-event` | `14.6.13` | Realistic keyboard/pointer interaction simulation | ADR-10 |
| `@testing-library/jest-dom` | `8.0.0` | Custom DOM assertions (peer `vitest >=5 <6`) | ADR-10 |
| `axe-core` | `4.14.1` | Automated a11y checks in Vitest/jsdom | ADR-10 |
| `msw` | `3.0.8` | Network-boundary HTTP mocking (`msw/http`) | ADR-10 |
| `@playwright/test` | `1.65.1` | Real-browser E2E acceptance suite | ADR-10 |
| `@axe-core/playwright` | `4.14.1` | Real-browser WCAG AA audits in Playwright | ADR-10 |

*(Note: `@babel/core`, `@rolldown/plugin-babel`, and `babel-plugin-react-compiler` are intentionally omitted per `ADR-09`.)*

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. TypeScript `7.0.2` with `@typescript/typescript6` alias workaround** | Install TS 7 (`@typescript/native`) for `tsc` while aliasing `typescript` -> `@typescript/typescript6` so `typescript-eslint` runs. | **Rejected for MVP.** Adds dual-compiler npm alias complexity and subtle version skew between IDE, `tsc`, and `typescript-eslint`. TypeScript `6.0.3` works cleanly with one package and already enforces `strict` and `noUncheckedSideEffectImports`. Revisit TS 7 when TS 7.1 ships its compiler API. |
| **2. ESLint `10.15.0` without `eslint-plugin-jsx-a11y`** | Upgrade to ESLint 10 and drop `jsx-a11y`, relying solely on Testing Library and Playwright/axe. | **Rejected.** `jsx-a11y` catches missing labels, non-interactive click handlers, and invalid ARIA attributes immediately at lint time across every agent edit. ESLint `9.39.5` is the official `maintenance` release and keeps every plugin peer-clean. |
| **3. Caret semver ranges (`^`) instead of exact pinning** | Allow minor/patch floating ranges in `package.json`. | **Rejected.** Exact pinning (`save-exact=true`) + committed `package-lock.json` + `npm ci` ensures deterministic builds across cloud agents and matches Prettier's official recommendation (`prettier.io/docs/install`). |

---

## Consequences

### Positive
- Zero peer-dependency conflicts (`--legacy-peer-deps` is never needed); every peer constraint was verified directly against `registry.npmjs.org` on `2026-11-26`.
- Compact, auditable dependency list (13 production packages total) directly supporting `ADR-01` Mitigation #6.
- Static accessibility (`jsx-a11y`), React Compiler readiness (`react-hooks` 7.1), import boundaries (`boundaries`), and XSS prevention (`dangerouslySetInnerHTML` ban) all run in a single `npm run lint` command.

### Negative
- Upgrades to TypeScript 7 or ESLint 10 require a small maintenance follow-up once `typescript-eslint` and `eslint-plugin-jsx-a11y` publish compatible releases.

### Accepted Residual Risk
- Exact pinning shifts security patch pickup to Dependabot PRs rather than implicit caret bumps; mitigated by enabling GitHub Dependabot security updates and running `npm audit --audit-level=high` on every CI build.

### Backend Dependencies
- **`BR-1`:** Backend team should ensure Laravel Boost (`--dev`) is removed from production and `APP_DEBUG=false` is confirmed (`security.md` §10).

---

## Sources

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (TypeScript 7.0.2 / 6.0.3, checked 2026-11-26) — TS 7 ships no JS compiler API, `typescript-eslint` alias workaround, and TS 6 compiler defaults.
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html (TypeScript 6.0.3, checked 2026-11-26) — `tsconfig.json` strictness and `types` configuration.
- https://docs.npmjs.com/cli/v11/commands/npm-ci (npm CLI 11.16.0, checked 2026-11-26) — Frozen lockfile CI installs.
- https://docs.npmjs.com/cli/v11/commands/npm-audit (npm CLI 11.16.0, checked 2026-11-26) — `--audit-level=high` and `npm audit signatures` provenance verification.
- https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates (GitHub docs, checked 2026-11-26) — Dependency graph, Dependabot alerts, and automated security-update PRs.
- https://prettier.io/docs/install and https://prettier.io/docs/configuration (Prettier 3.10.1, checked 2026-11-26) — `--save-dev --save-exact` installation and project-local config.
- https://registry.npmjs.org/ (npm registry queried 2026-11-26; full version/peer table in `docs/research/react-architecture.md` §1 & Addendum A1) — Exact verified versions and peer constraints for every package in §3.
