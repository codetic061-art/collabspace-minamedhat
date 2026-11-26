# CollabSpace Architecture Decision Records (ADRs)

This directory contains the complete Architecture Decision Record set (`ADR-01` through `ADR-13`) required by `AGENTS.md` §0 and §8 before implementation tickets (`#3`–`#11`, carrying the `adr-gate` label) may begin.

Every ADR cites official primary sources checked against exact npm registry versions on `2026-11-26` (supporting research in `docs/research/security.md` and `docs/research/react-architecture.md`) and aligns with the WI-1 D10-verified backend API contract in `docs/api/plain.md`.

---

## ADR Index

| ADR | Title | Status | Summary Decision | Key Links (`AGENTS.md` §8 / `D1–D11` / `BR-1–BR-10`) |
|---|---|---|---|---|
| [ADR-01](./0001-auth-token-storage-and-session.md) | Authentication, Token Storage, and Session Behaviour | Approved (2026-11-26) | Client-side session module (`src/shared/lib/session.ts`) storing Sanctum Bearer token in memory + `sessionStorage` by default, `localStorage` only when "Remember Me" is checked; 7 mandatory mitigations; `GET /auth/me` reload restore; centralized `401` handler & `BroadcastChannel` cross-tab sync; authenticated Blob file downloads; accepted XSS residual risk. | §8.6 · D2, D6, D10, D11(A2) · `BR-2`, `BR-4`, `BR-6`, `BR-9`, `BR-10` |
| [ADR-02](./0002-framework-and-rendering-model.md) | Framework and Rendering Model | Approved (2026-11-26) | Pure client-side React SPA using **Vite `8.4.0`**, **React `19.3.1`** (`@vitejs/plugin-react` `6.3.0`), and **React Router `8.5.3`** (data mode), deployed statically on Vercel; SPA equivalents of `AGENTS.md` §3 (route `lazy` + widget `React.lazy`, `VITE_*` public config only). | §8.1, §8.4 · D1, D11(A8) · `BR-4` (avoided), `BR-6` |
| [ADR-03](./0003-folder-structure-and-import-boundaries.md) | Folder Structure and Import Boundaries | Approved (2026-11-26) | Feature-based `src/` layout (`app/`, `features/<domain>/`, `shared/{tokens,ui,api,lib}/`) with centralized Tier 1 services under `src/shared/api/services/` (`WI-5`), single `index.ts` feature entry points, and lint-time enforcement via `eslint-plugin-boundaries` `7.4.5` + `no-restricted-imports`. | §8.2 · D1, D8, D11(A8) |
| [ADR-04](./0004-component-architecture-and-styling.md) | Component Architecture, Styling, and UI Primitives | Approved (2026-11-26) | **Tailwind CSS `4.3.5`** + `@tailwindcss/vite` `4.3.5` with CSS-first `@theme` design tokens mapped 1:1 to Figma; custom semantic-HTML / native `<dialog>` / WAI-ARIA APG primitives in `src/shared/ui/` (no Radix/shadcn); `lucide-react` `1.81.0` + Figma SVGs; flat state rendering & `use<Thing>` hooks. | §8.3 · D3, D4, D9, D11(A3) |
| [ADR-05](./0005-api-layer-and-data-fetching.md) | API Layer, Data Fetching, Caching, Retry, and Timeout | Approved (2026-11-26) | Single native `fetch` HTTP client (`15 s` `AbortSignal.timeout`/`any`, 12 `AppError` kinds, D10-verified `E1`–`E6` envelopes & `403`/`404` handling, authenticated `downloadBlob`), **TanStack Query `5.108.4`** (`useQuery` default, `queryOptions`, bounded GET retries, `retry: 0` mutations, optimistic Kanban rollback on Title-case columns), `P1`–`P4` pagination, `/users` `per_page=20` + server `search`, and 4-format dates. | §8.5 · D5, D6, D10, D11(A5, A6) · `BR-6`, `BR-8`, `BR-10` |
| [ADR-06](./0006-state-management.md) | State Management | Approved (2026-11-26) | No global state library (no Redux/Zustand). Single canonical owner per category: TanStack Query (server state), React Router URL/search params (shareable filters & `taskId`), `localStorage` (`collabspace:lastTasksProjectId`, cleared on sign-out), local `useState`/`react-hook-form` (UI & drafts), and two split React Contexts (`SessionContext`, `ToastContext`). | §8.7 · D1 |
| [ADR-07](./0007-routing-loading-and-error-boundaries.md) | Routing, Code Splitting, Loading, and Error Boundaries | Approved (2026-11-26) | **React Router `8.5.3`** `createBrowserRouter` with route-level `lazy` splitting, `<Suspense>` strictly for lazy code chunks, three-tier error boundaries (`RootErrorBoundary`, per-route `ErrorBoundary`, shared `BlockErrorBoundary` via `react-error-boundary` `6.1.6`), and `vite:preloadError` stale-chunk recovery. | §8.8 · D1, D7 |
| [ADR-08](./0008-forms-and-validation.md) | Forms and Validation | Approved (2026-11-26) | **`react-hook-form` `7.92.0`** + **`zod` `4.6.7`** + **`@hookform/resolvers` `7.0.9`** with shared `applyServerValidationErrors` (`422` field mapping + first-invalid-field focus + `root.serverError`), `mutateAsync` duplicate-submit locking, input preservation on error, and `<form noValidate>` ARIA wiring. | §8.3, §8.11 · D3, D5, D9 |
| [ADR-09](./0009-performance-fonts-charts-compiler.md) | Performance — Fonts, Charts, React Compiler, and Bundle Budget | Approved (2026-11-26) | Self-hosted static fonts (`@fontsource/inter` `5.3.0` latin 400–700 + `@fontsource/rubik` `5.3.0` latin 400); lazy-loaded **`recharts` `3.11.1`** (+ `react-is` `19.3.1`) + lightweight inline SVG completion gauge; keep Vite 8 zero-Babel Oxc pipeline with `eslint-plugin-react-hooks` `7.1.1` compiler lint rules; CI gzipped bundle-budget gate (`140 KB` entry / `60 KB` feature / `150 KB` chart) + `rollup-plugin-visualizer` `7.3.0`. | §8.9 · D4, D11(A4) |
| [ADR-10](./0010-testing-strategy-and-tools.md) | Testing Strategy and Tools | Approved (2026-11-26) | Unified Vite-native stack covering Spec Layers 1–6: **Vitest `5.1.2`** + **`jsdom` `31.0.1`**, Testing Library (`@testing-library/react` `16.3.3`), **MSW `3.0.8`** (`msw/http`, `onUnhandledFrame: 'error'`), direct **`axe-core` `4.14.1`** (replacing stale `vitest-axe`), and **`@playwright/test` `1.65.1`** + `@axe-core/playwright` `4.14.1` against Vercel Preview. | §8.10 · D6, D10 |
| [ADR-11](./0011-dependencies-versions-and-tooling.md) | Dependencies, Versions, and Tooling | Approved (2026-11-26) | Exact pinned manifest (13 production + 28 dev packages), Node **`>=22.22.2`** (CI on Node 24 LTS), **TypeScript `6.0.3`** (`strict`, `noUncheckedIndexedAccess`, `noUncheckedSideEffectImports`), **ESLint `9.39.5`** + `@eslint/js` `9.39.5` (retaining `jsx-a11y` `6.10.2`), `dangerouslySetInnerHTML` & raw `fetch` bans, Prettier `3.10.1`, `.npmrc` `save-exact=true`, CI `npm ci` + `npm audit` + signatures + Dependabot. | §8.11 · `BR-1` |
| [ADR-12](./0012-browser-security-and-vercel-deployment.md) | Browser Security Headers, CSP, and Vercel Deployment | Approved (2026-11-26) | Static Vite SPA deployment on Vercel via root `vercel.json`: SPA fallback excluding `/assets/*`, `no-cache` on `index.html` + 1-year `immutable` on `/assets/*`, full security headers (HSTS, `nosniff`, `DENY`, `COOP`, `Permissions-Policy`, `no-referrer` on recovery routes), and phased CSP (`Content-Security-Policy-Report-Only` on Preview -> enforcing `Content-Security-Policy` before Production). | §8.9, §9 · `BR-6`, `BR-10` |
| [ADR-13](./0013-bot-protection-and-backend-throttling.md) | Bot Protection, Backend Throttling Policy, and Backend Dependency Matrix | Approved (2026-11-26) | **Cloudflare Turnstile (Managed mode)** approved architecturally but kept **strictly disabled/unshipped** (`VITE_TURNSTILE_ENABLED=false`) until backend implements `BR-5`; layered throttling policy requested via `BR-3`; honest `429` UX (no fake counters/countdowns); canonical `BR-1`–`BR-10` backend handoff matrix. | §8.6, §7 · D1, D7, D11(A2) · `BR-1`–`BR-10` |

---

## How the Architecture Fits Together

1. **Auth-first spine (`ADR-01` -> `ADR-02` -> `ADR-12`):** Because the unmodifiable external Laravel 13 Sanctum API uses stateless Bearer tokens with `Access-Control-Allow-Origin: *`, no credentialed cookies, and no trusted BFF proxy (`BR-4`), **ADR-01** adopts client-side Bearer storage (`memory + sessionStorage` by default; `localStorage` only on "Remember Me") paired with seven mandatory security controls and an explicitly accepted residual XSS risk. That decision directly determines **ADR-02**: a pure static client-side SPA built with **Vite `8.4.0` + React `19.3.1` + React Router `8.5.3` (data mode)** deployed statically to Vercel (**ADR-12**). Direct SPA -> API calls preserve real client IP addresses for backend throttling (`BR-3`), eliminate unnecessary Next.js RSC/BFF complexity and multi-layer caches, and ship route-sized static bundles.
2. **Multi-agent modularity (`ADR-03`, `ADR-04`, `ADR-07`, `ADR-11`):** Parallel feature slices (`WI-7` Dashboard, `WI-8` Projects, `WI-9` Tasks/Kanban, `WI-10` Profile) live in isolated `src/features/<domain>/` folders guarded by `eslint-plugin-boundaries`, consuming shared Figma `@theme` tokens and native-`<dialog>`/WAI-ARIA primitives from `src/shared/ui/` (`WI-4`) and centralized domain services from `src/shared/api/services/` (`WI-5`). Every route is lazily split in `createBrowserRouter` with three-tier error boundaries and `vite:preloadError` stale-chunk recovery.
3. **Data, state, and forms runtime (`ADR-05`, `ADR-06`, `ADR-08`):** One native `fetch` HTTP client normalizes all D10-verified envelopes (`E1`–`E6`), `P1`–`P4` pagination, 4 date formats, all 12 `AppError` kinds (including verified `403` and sanitized `404`), and Bearer-authenticated Blob downloads (`#files-download`). TanStack Query `5.108.4` owns all server state (including optimistic Kanban rollback across verified Title-case columns), React Router owns shareable URL state, `react-hook-form` + `zod` own forms and `422` focus mapping, and two split React Contexts (`SessionContext`, `ToastContext`) handle the minimal app-wide client state — requiring no Redux or Zustand.
4. **Performance, verification, and security honesty (`ADR-09`, `ADR-10`, `ADR-12`, `ADR-13`):** Self-hosted Fontsource latin subsets (`D4`), lazy Recharts `3.11.1`, Vite 8 Oxc builds with `eslint-plugin-react-hooks` `7.1.1` compiler rules, and CI gzipped bundle budgets keep initial loads light. Six testing layers (Vitest 5 + Testing Library + MSW 3 + direct `axe-core` + Playwright/axe on Vercel Preview) verify behaviour and accessibility, while `ADR-12` and `ADR-13` enforce strict HTTP headers, phased CSP rollout, and zero fake security UI.

### Coverage of `AGENTS.md` §8 (All 11 Mandatory Items)

| §8 Item | Topic | Governing ADR(s) |
|---|---|---|
| 1 | Framework and rendering model | [ADR-02](./0002-framework-and-rendering-model.md) |
| 2 | Folder structure | [ADR-03](./0003-folder-structure-and-import-boundaries.md) |
| 3 | Component architecture | [ADR-04](./0004-component-architecture-and-styling.md), [ADR-08](./0008-forms-and-validation.md) |
| 4 | Server/client boundaries (SPA equivalents) | [ADR-02](./0002-framework-and-rendering-model.md) |
| 5 | API and data-fetching architecture | [ADR-05](./0005-api-layer-and-data-fetching.md) |
| 6 | Authentication strategy | [ADR-01](./0001-auth-token-storage-and-session.md), [ADR-13](./0013-bot-protection-and-backend-throttling.md) |
| 7 | State management | [ADR-06](./0006-state-management.md) |
| 8 | Routing and loading | [ADR-07](./0007-routing-loading-and-error-boundaries.md) |
| 9 | Performance | [ADR-09](./0009-performance-fonts-charts-compiler.md), [ADR-12](./0012-browser-security-and-vercel-deployment.md) |
| 10 | Testing | [ADR-10](./0010-testing-strategy-and-tools.md) |
| 11 | Dependencies, with versions and compatibility | [ADR-11](./0011-dependencies-versions-and-tooling.md) |

---

## Backend Dependency Matrix (`BR-1` – `BR-10`)

Canonical tracking and rationale live in [ADR-13](./0013-bot-protection-and-backend-throttling.md) §3 and `docs/research/security.md` §10. Summary cross-reference:

| ID | Backend Requirement | Priority | Status | Related ADR(s) |
|---|---|---|---|---|
| **BR-1** | Remove Laravel Boost (`--dev`) from production; confirm `APP_DEBUG=false` | High | Open (reported) | ADR-11, ADR-13 |
| **BR-2** | Configure finite Sanctum token lifetimes (`remember=false` vs `remember=true`) + `sanctum:prune-expired` | High | Open (reported) | **ADR-01**, ADR-13 |
| **BR-3** | Implement/document layered login & registration throttling, generic errors, `Retry-After`, and `429` body | High | Open (reported) | ADR-01, ADR-05, **ADR-13** |
| **BR-4** | Trust forwarded client IP from BFF proxy (`trustProxies`) | N/A for SPA | Avoided by ADR-01/02 | ADR-01, ADR-02, ADR-13 |
| **BR-5** | Add Cloudflare Turnstile JSON field + server-side Siteverify (fail closed) | Medium | Open (**blocks Turnstile UI**) | ADR-01, ADR-12, **ADR-13** |
| **BR-6** | Restrict CORS `allowed_origins`, set non-zero `max_age`, expose `Retry-After` & `Content-Disposition` | Medium | Open (reported) | ADR-01, ADR-02, ADR-05, ADR-12, ADR-13 |
| **BR-7** | Fix Google OAuth `redirect_uri` (`127.0.0.1:8000`) or disable endpoint | Low | Open (reported; out of MVP per `D1`) | ADR-13 |
| **BR-8** | Enforce server-side upload size/type limits on all paths + `Content-Disposition: attachment` & `nosniff` | Medium | Open (reported) | ADR-01, ADR-05, ADR-13 |
| **BR-9** | Document whether `PUT /auth/password` revokes other active tokens (ASVS 7.4.3) | Low | Open (reported) | ADR-01, ADR-13 |
| **BR-10** | Remove `X-Powered-By: PHP/8.3.37`; return `401` JSON regardless of `Accept`; confirm registration enumeration stance | Low | Open (reported) | ADR-01, ADR-05, ADR-12, ADR-13 |

> **Open Discovery Boundary (`D6`):** Team Member role credentials remain unverified; Team Member visibility and `403` behaviour stay explicitly tracked as an unverified acceptance-test item (`ADR-01`, `ADR-05`, `ADR-10`).

---

## Stage B User Approval Record

Per `AGENTS.md` §0, implementation tickets (`#3`–`#11`) carry the `adr-gate` label and **must not start** until the user has reviewed and approved `ADR-01` through `ADR-13` and removed `adr-gate`.

- **Approval status:** Approved
- **adr-gate status:** Released on `#3`–`#11`
- **Reviewed by:** Project Owner (Stage B user approval)
- **Approval date:** 2026-11-26
- **Decision:** `[x] Approved` / `[ ] Changes Requested`

### User Sign-Off Checklist

- [x] **ADR-01:** Approve client-side Bearer token storage (`sessionStorage` default, `localStorage` on Remember Me only), the 7 mandatory mitigations, and the explicitly accepted residual XSS risk (with `BR-2` raised to backend).
- [x] **ADR-02:** Approve **Vite `8.4.0` + React `19.3.1` + React Router `8.5.3` (data mode)** static SPA on Vercel (over Next.js 16 App Router BFF / client-Bearer modes).
- [x] **ADR-03 – ADR-08:** Approve feature-folder + `eslint-plugin-boundaries` layout, Tailwind CSS `4.3.5` `@theme` + custom accessible primitives, native `fetch` + TanStack Query `5.108.4` (with D10-verified `403`, Blob downloads, `/users` picker, and Kanban contracts), zero global state library, 3-tier error boundaries, and `react-hook-form` + `zod`.
- [x] **ADR-09 – ADR-11:** Approve self-hosted Fontsource static latin fonts (`D4`), lazy Recharts `3.11.1`, Vite 8 Oxc default + `eslint-plugin-react-hooks` `7.1.1`, CI bundle budgets, Vitest 5 / MSW 3 / direct `axe-core` / Playwright stack, and exact pinned dependencies (Node `>=22.22.2`, TS `6.0.3`, ESLint `9.39.5`).
- [x] **ADR-12 & ADR-13:** Approve Vercel static deployment headers + Report-Only -> Enforcing CSP rollout, Cloudflare Turnstile remaining strictly unshipped until `BR-5`, and `BR-1`–`BR-10` backend handoff.
- [x] **Gate release:** Remove the `adr-gate` label from `#3`–`#11` to unlock Phase 1 foundation implementation (`WI-3` through `WI-6` -> Gate 1 `#12`).

**Approval notes:** User approved Stage B ADRs and authorized proceeding through WI-3 to WI-6 on stacked branches while keeping PR #14 and PR #15 open.
