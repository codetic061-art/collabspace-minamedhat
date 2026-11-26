# ADR-02: Framework and Rendering Model

- **Status:** Proposed (awaiting user approval)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §1, §3, §4, §8 (items 1 & 4: Framework, rendering model, and server/client boundaries), Spec ID-16

---

## Context

CollabSpace is a fully authenticated team-collaboration workspace (Dashboard, Projects, Tasks/Kanban, Profile) consuming an external Laravel 13 Sanctum REST API. Requirements driving the framework and rendering model choice (`HANDOFF.md` §1, §4; `ID-16`; `docs/research/react-architecture.md` §0, §3):

1. **Auth decision (`ADR-01`):** Bearer tokens are held client-side (memory + `sessionStorage` / `localStorage` on Remember Me) and sent directly from the browser to `https://collabspace.huma-volve.com/api/v1`, which CORS permits. No BFF server runtime is needed.
2. **Zero SEO / public content requirement:** Every data-bearing screen sits behind sign-in. Server-side HTML rendering provides no SEO value and cannot pre-fetch authenticated Laravel data without a server-held token.
3. **Route-sized bundles (`AGENTS.md` §3–§4):** The application must ship as lazily loaded route chunks (never one monolithic bundle) and lazy-load heavy widgets (chart library, optional drag-and-drop).
4. **Multi-agent velocity (`HANDOFF.md` §1, `ID-24`):** Multiple agents build Tier 1 features in parallel in a tight 2-day MVP window. Minimizing conceptual overhead (no Server/Client serialization boundaries or multi-layer server caches) reduces integration errors.
5. **Hosting (`AGENTS.md` §9, `ADR-12`):** Deployed to Vercel (Preview per PR, Production after Gate 2 + user approval).

---

## Decision

Build CollabSpace as a **pure client-side React SPA** using **Vite `8.4.0`**, **React `19.3.1`** (`@vitejs/plugin-react` `6.3.0`), and **React Router `8.5.3` in data mode**.

### Rendering and boundary rules (SPA equivalents of `AGENTS.md` §3)

Because `AGENTS.md` §3 states that Next.js App Router rules do not carry over automatically to non-Next.js stacks, the following SPA rules are binding for this repository:

1. **Pure client-side rendering:** All components render in the browser via `createRoot` (`react-dom/client`). Do not use `"use client"`, `"use server"`, or `server-only` directives.
2. **Route-level code splitting:** Every route in the `createBrowserRouter` table (`ADR-07`) uses React Router data mode's `lazy` property so public auth routes never download authenticated feature chunks, and each feature loads on demand.
3. **Widget-level lazy splitting:** Heavy, non-critical modules (Dashboard chart, Task Details modal body, optional drag-and-drop) are declared at module top level with `React.lazy(() => import(...))` and wrapped in `<Suspense>` with matching skeleton fallbacks.
4. **Public configuration only:** Only `VITE_*`-prefixed environment variables reach the browser bundle (inlined at build time by Vite). Allowed keys are strictly public: `VITE_API_BASE_URL` and (future, disabled by default) `VITE_TURNSTILE_SITEKEY` / `VITE_TURNSTILE_ENABLED`. Zero secrets exist in client code or env variables.
5. **Auth-ready rendering gate:** The router/app shell renders a neutral loading shell while session status is `unknown` (`ADR-01`), preventing auth flashes before `GET /auth/me` resolves.
6. **Build toolchain:** Vite `8.4.0` uses Rolldown as its unified bundler and Oxc for fast TypeScript/JSX transforms. Default Rolldown code-splitting is used without premature `manualChunks` overrides (`ADR-09`).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Next.js `16.4.6` App Router — BFF mode (N2)** | Server Components + Route Handlers acting as an `HttpOnly` cookie BFF proxy to Laravel. | **Rejected (follows ADR-01).** Requires server-side session secrets, allowlisted proxy routes for every endpoint including multipart uploads, CSRF protection on every mutating handler, backend `trustProxies` support (`BR-4`, unavailable on the unmodifiable API), and 3-layer cache coordination (Next.js server cache, client RSC cache, TanStack Query cache). |
| **2. Next.js `16.4.6` App Router — Client-Bearer mode (N1)** | Next.js App Router while holding Bearer tokens in browser storage and calling Laravel from Client Components. | **Rejected.** Server Components cannot read browser tokens, forcing every data screen into `"use client"`. Carries full Next.js complexity (RSC serialization rules, server runtime, `proxy.ts`) with zero data-fetching or security benefit. Furthermore, Next.js static export (`output: 'export'`) drops dynamic routes without `generateStaticParams`, breaking `/projects/:id` (`docs/research/react-architecture.md` §3a). |
| **3. React Router `8.5.3` Framework Mode (`ssr: false`)** | Vite plugin + file/config route modules with SPA mode (`ssr: false`). | **Rejected (simpler data mode suffices).** Framework SPA mode still prerenders the root route at build time (requiring SSR-safe root code and `@react-router/node`) and introduces framework-specific `clientLoader`/`clientAction` conventions that duplicate TanStack Query (`ADR-05`). Data mode provides the exact routing, `lazy`, and `ErrorBoundary` primitives needed with fewer moving parts. |

---

## Consequences

### Positive
- **Simplest viable stack (`AGENTS.md` §8):** Zero server/client module-graph splits, zero RSC serialization errors, zero server-side cache invalidation layers.
- **Fast local and CI builds:** Vite 8 (Rolldown + Oxc) compiles TypeScript and bundles route chunks rapidly in cloud agent environments.
- **Static Vercel deployment:** Ships as static HTML + hashed `/assets/*` bundles with a simple SPA rewrite rule (`ADR-12`), requiring no serverless cold starts.
- **Extensible (`D1`, `A8`):** Tier 2 routes (Meetings, Files, Teams, Notifications, Search) and future features slot cleanly into `createBrowserRouter` as additional lazy routes.

### Negative
- Initial first paint waits for the root JS bundle and `GET /auth/me` session restore before rendering authenticated screens (mitigated by strict initial bundle budgets in `ADR-09` and a neutral loading shell).
- No built-in server-side image optimization (`next/image`); avatars use explicit dimensions, `loading="lazy"`, and initials fallbacks (`ID-10`, `ID-18`).
- Migrating to a server-side BFF later would require adding a server layer or framework migration (isolated cleanly behind `src/shared/api/httpClient.ts` and `src/shared/lib/session.ts`).

### Accepted Residual Risk
- Client-only rendering relies on host-configured HTTP security headers and CSP (`ADR-12`) plus `vite:preloadError` stale-chunk recovery (`ADR-07`) after deployments.

### Backend Dependencies
- None introduced beyond `ADR-01` (`BR-6` CORS `max_age` reduces preflight latency for browser-originated requests).

---

## Sources

- https://vite.dev/blog/announcing-vite8 (Vite 8.4.0, released 2026-03-12, checked 2026-11-26) — Rolldown as the unified bundler and Oxc transform pipeline.
- https://vite.dev/guide/env-and-mode (Vite 8.4.0, checked 2026-11-26) — `VITE_*` build-time inlining and prohibition on placing secrets in client-exposed env vars.
- https://vite.dev/guide/build (Vite 8.4.0, checked 2026-11-26) — Rolldown code-splitting defaults, `Cache-Control: no-cache` on HTML, and `vite:preloadError` recovery.
- https://react.dev/learn/build-a-react-app-from-scratch (React 19.3.1 docs, checked 2026-11-26) — Official guidance for Vite-based React SPAs owning routing and data fetching explicitly.
- https://reactrouter.com/start/modes (React Router 8.5.3, checked 2026-11-26) — Comparison of declarative, data, and framework modes.
- https://reactrouter.com/start/data/installation (React Router 8.5.3, checked 2026-11-26) — Data mode imports (`react-router`, `react-router/dom`) and router creation outside React.
- https://reactrouter.com/how-to/spa (React Router 8.5.3, checked 2026-11-26) — Framework SPA mode (`ssr: false`) build-time root prerender constraint and SPA host fallback.
- https://nextjs.org/docs/app/guides/static-exports (Next.js 16.4.6, checked 2026-11-26) — Dynamic routes without `generateStaticParams` unsupported in static export.
- https://nextjs.org/docs/app/guides/client-side-data-fetching (Next.js 16.4.6, checked 2026-11-26) — Multi-layer cache coordination required when mixing Next.js caches with TanStack Query.