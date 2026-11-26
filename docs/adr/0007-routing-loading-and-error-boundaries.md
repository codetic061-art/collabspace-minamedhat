# ADR-07: Routing, Code Splitting, Loading, and Error Boundaries

- **Status:** Proposed (awaiting user approval)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §3, §4, §7, §8 (item 8: Routing and loading), Spec ID-3, ID-8, ID-17, ID-18

---

## Context

CollabSpace requires (`ID-3`, `ID-17`, `ID-18`, `AGENTS.md` §3–§4, §7):

1. **Route table:** Five public auth routes (`/sign-in`, `/sign-up`, `/forgot-password`, `/verify-code`, `/reset-password`) and authenticated routes (`/` Dashboard, `/projects`, `/projects/:projectId` with Overview & Tasks tabs, `/tasks`, `/profile` with Overview & Tasks tabs, `/profile/settings`), plus deep-linkable Task Details (`?taskId=...`) and a clean 404 fallback.
2. **Route-sized bundles:** Every route must be lazily split so public auth pages never download authenticated feature code or the chart library (`ID-18`).
3. **Resilient error containment (`AGENTS.md` §7, Story 99, `ID-17`):**
   - Root error boundary (safe full-page fallback).
   - Per-route error boundary so a crash on one screen leaves navigation recoverable.
   - Block-level boundaries isolating independently failing widgets (lazy Dashboard chart, Dashboard card groups, Task Details modal).
4. **Deploy-safe chunk loading (`ID-18`):** When a new Vercel deployment replaces hashed `/assets/*.js` chunks while a user has an older `index.html` tab open, failed dynamic imports must trigger a friendly "New version available — reload" recovery banner rather than a blank screen.

---

## Decision

Adopt **React Router `8.5.3` in data mode (`createBrowserRouter`)** with **route-level `lazy` splitting**, **`<Suspense>` reserved strictly for code-splitting chunks**, a **three-tier error boundary hierarchy** using **`react-error-boundary` `6.1.6`** for block boundaries, and a **`vite:preloadError` listener** for stale-chunk recovery.

### 1. Router configuration (`src/app/router.tsx`, owned by `WI-6`)

- Create the router once at module top level outside React using `createBrowserRouter` (imported from `react-router`, rendered via `RouterProvider` from `react-router/dom`, per React Router v8 docs).
- **Route guards:**
  - `ProtectedRoute` layout wrapper: renders neutral loading shell when `session.status === 'unknown'`; redirects to `/sign-in?redirectTo=<encodedCurrentPath>` when `anonymous`; renders `<AppShell><Outlet /></AppShell>` when `authenticated`.
  - `PublicOnlyRoute` layout wrapper: renders neutral loading shell while `unknown`; redirects to `/` when `authenticated`; renders auth layout `<Outlet />` when `anonymous`.
- **Route-level `lazy` splitting on every route:** Each route entry defines `lazy: async () => { const { Page } = await import('@/features/...'); return { Component: Page }; }` so every screen is an isolated Rolldown chunk.
- **No React Router data loaders for MVP:** All server data loads through TanStack Query (`ADR-05`) inside route/feature hooks so there is exactly one data-fetching and caching mechanism (`AGENTS.md` §4).

### 2. Loading and `<Suspense>` policy

- **`<Suspense>` is used ONLY for lazy code chunks:** Route transitions (`HydrateFallback` / `<Suspense>` around lazy route outlets) and module-top-level `React.lazy(...)` heavy widgets (Dashboard area chart, Task Details modal body, optional drag-and-drop). Fallbacks use shape-matched `Skeleton` components (`ID-8`, `ID-23`).
- **Data loading states use TanStack Query `useQuery`:** Each data view explicitly renders its flat `loading` (skeleton), `empty`, `error` (block retry), `unauthorized`, and `success` states (`AGENTS.md` §5, `ADR-05`).

### 3. Three-tier error boundary architecture (`AGENTS.md` §7, `ID-17`)

1. **Root Error Boundary (`src/app/RootErrorBoundary.tsx`):** Wraps `<RouterProvider>` (via `react-error-boundary` `6.1.6`) to catch unexpected provider or shell crashes with a safe, branded full-page recovery screen (Reload / Return to Dashboard) and zero raw stack traces.
2. **Per-Route `ErrorBoundary` (`src/app/RouteErrorBoundary.tsx`):** Configured on the root and feature route objects via React Router data mode's `ErrorBoundary` prop reading `useRouteError()`. Keeps the top navbar intact when a route crashes and renders a clean retry/back state.
3. **Shared `BlockErrorBoundary` (`src/shared/ui/BlockErrorBoundary.tsx`, `WI-4`):** Thin wrapper around `react-error-boundary` `6.1.6` rendering the shared `BlockErrorState` with a `Retry` action (`resetErrorBoundary`), wrapping the lazy Dashboard chart, independent Dashboard card groups, and Task Details modal body.
- Boundaries catch **rendering and lazy-chunk errors only**; API/network failures are handled declaratively via `AppError` states (`ADR-05`).

### 4. Stale-chunk deployment recovery (`vite:preloadError`)

- Register a `window.addEventListener('vite:preloadError', (event) => { ... })` listener in `src/main.tsx` (`vite.dev/guide/build`).
- On `vite:preloadError`, prevent the unhandled crash (`event.preventDefault()`) and surface a non-dismissible top recovery banner ("A new version of CollabSpace is available — Reload to continue") with a single-click `window.location.reload()` button (guarding against automatic infinite reload loops).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Declarative `<BrowserRouter>` + manual `React.lazy` (simpler router mode)** | Classic JSX `<Routes>` / `<Route>` tree with `React.lazy` wrappers per page. | **Rejected.** Lacks React Router data mode's built-in per-route `ErrorBoundary` (`useRouteError`), parallel `lazy` route object loading, and structured error bubbling. Requires hand-wiring `<ErrorBoundary>` + `<Suspense>` around every `<Route>` element manually. |
| **2. React Router `8.5.3` Framework Mode (`@react-router/dev`)** | File/config route modules with Vite plugin and `ssr: false`. | **Rejected (matches ADR-02).** Adds `@react-router/node`, build-time root SSR constraints, and framework loader/action conventions we intentionally avoid in favour of TanStack Query. |
| **3. Custom class ErrorBoundary instead of `react-error-boundary`** | Write a raw React class component (`getDerivedStateFromError` / `componentDidCatch`) in `src/shared/ui/`. | **Rejected as sole block boundary.** React 19 official docs explicitly recommend `react-error-boundary` (`6.1.6`, tiny, zero runtime deps, peer `react ^19`) because Error Boundaries remain class-only and `react-error-boundary` provides battle-tested `resetKeys` (auto-reset on route/project change) and `resetErrorBoundary` hooks out of the box. |

---

## Consequences

### Positive
- Every route and heavy widget ships in its own chunk; auth screens load zero Dashboard/Projects/Tasks/Recharts code (`ID-18`).
- Isolated rendering failures (e.g., an unexpected chart exception) degrade only the affected card rather than blanking the page (Story 99).
- Smooth post-deployment UX via `vite:preloadError` combined with `Cache-Control: no-cache` on `index.html` (`ADR-12`).

### Negative
- Adds one tiny runtime dependency (`react-error-boundary` `6.1.6`, explicitly cited by `react.dev`).
- Route modules exported for `lazy` must keep clean entry boundaries (no barrel re-exports pulling heavy siblings into the initial chunk).

### Accepted Residual Risk
- Event-handler and async callback errors are not caught by React Error Boundaries (`react.dev`); handled consistently through TanStack Query mutations and `AppError` normalization (`ADR-05`).

### Backend Dependencies
- None.

---

## Sources

- https://reactrouter.com/start/modes (React Router 8.5.3, checked 2026-11-26) — Data mode vs declarative vs framework mode feature comparison.
- https://reactrouter.com/start/data/installation (React Router 8.5.3, checked 2026-11-26) — `createBrowserRouter` outside React and `react-router` / `react-router/dom` imports.
- https://reactrouter.com/start/data/route-object (React Router 8.5.3, checked 2026-11-26) — Route-level `lazy` code splitting.
- https://reactrouter.com/how-to/error-boundary (React Router 8.5.3, checked 2026-11-26) — Nested route `ErrorBoundary` and `useRouteError()`.
- https://react.dev/reference/react/lazy (React 19.3.1 docs, checked 2026-11-26) — Top-level `React.lazy`, `<Suspense>`, and rejected-import propagation to Error Boundaries.
- https://react.dev/reference/react/Component (React 19.3.1 docs, checked 2026-11-26) — Error Boundaries remain class-only; official recommendation of `react-error-boundary` and boundary scope.
- https://github.com/bvaughn/react-error-boundary (`react-error-boundary` 6.1.6, peer `react ^19.0.0`, checked 2026-11-26) — `ErrorBoundary`, `resetKeys`, and `FallbackProps` API.
- https://vite.dev/guide/build (Vite 8.4.0, checked 2026-11-26) — `vite:preloadError` event for post-deploy stale-chunk recovery.