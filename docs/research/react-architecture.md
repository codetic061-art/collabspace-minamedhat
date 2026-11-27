# React architecture research for CollabSpace

| | |
|---|---|
| **Status** | Research input for the AGENTS.md §8 ADRs. Nothing here is a decision until an ADR records it and the user reviews it. |
| **Checked** | 2026-11-26 (all npm versions and doc pages fetched that day) |
| **Scope** | Official docs only for recommendations (react.dev, nextjs.org, vite.dev, reactrouter.com, tanstack.com, library docs, npm registry). No backend calls, no installs. |
| **Inputs** | `docs/spec/mvp-spec.md` (ID-1..ID-13), `docs/discovery/HANDOFF.md` §4 and §8, `docs/discovery/reference-site.md` §1, `docs/discovery/decisions.md` |

**Tags used below**

- **ESTABLISHED**: already decided in `AGENTS.md`, `decisions.md` or the MVP spec.
- **OFFICIAL GUIDANCE**: stated directly by the cited official doc.
- **PROPOSAL — requires ADR**: my recommendation; not binding until an ADR accepts it.

---

## 0. Constraints that drive the choices (ESTABLISHED)

- Backend is an existing Laravel Sanctum REST API on another origin. Login returns a bearer `token`; no expiry field, no refresh token. `Accept: application/json` is mandatory (HANDOFF §4).
- CORS allows any origin with an `Authorization` header but **not credentials/cookies** (HANDOFF §4). The browser can call the API directly with a bearer token; it cannot use API-set cookies.
- Session must survive reload (spec story 16); "Remember Me" lengthens the session on the user's device (story 2); any 401 clears session and cached data in one place (ID-7).
- Token storage location is an ADR decision with a security rationale; a server-side proxy is allowed only if the auth ADR requires it (ID-6, ID-7, HANDOFF §8).
- Route-sized bundles; lazy-load heavy parts (chart, drag-and-drop) (AGENTS.md §3–4, ID-10).
- One data-fetching mechanism with dedupe and explicit revalidation (AGENTS.md §4).
- Fonts: Inter 400/500/600/700 + Rubik 400, latin only; mechanism chosen in research (D4).
- No SEO need: every data screen is behind sign-in. 2-day MVP, several agents in parallel (HANDOFF §1).
- The reference site used Next.js 16 App Router + Auth.js + TanStack Query + react-hook-form/zod + shadcn/Tailwind v4 (`reference-site.md` §1). That is a data point, not a decision.

---

## 1. Current stable versions (npm registry, checked 2026-11-26)

Source for every row: `https://registry.npmjs.org/<pkg>/latest` (and `/<pkg>` for dist-tags and publish dates). Local machine: Node 24.18.0, npm 11.16.0.

| Package | Latest | Published | Node engine / key peers | Notes |
|---|---|---|---|---|
| react / react-dom | 19.3.1 | 2026-10-14 | react-dom peer `react ^19.3.1` | react.dev documents 19.3 as latest |
| next | 16.4.6 | 2026-11-09 | Node ≥20.9; React ^18.2 or ^19 | `reactCompiler` option stable since v16.0.0 |
| vite | 8.4.0 | 2026-11-26 | Node ^20.19 or ≥22.12 | Rolldown is the single bundler since Vite 8 |
| @vitejs/plugin-react | 6.3.0 | — | peer `vite ^8`; optional `babel-plugin-react-compiler ^1`, `@rolldown/plugin-babel` | inline `babel` option removed in v6 |
| react-router | 8.5.3 | 2026-11-24 | Node ≥22.22; React ≥19.2.7 | `react-router-dom` stops at 7.18.7; v8 imports from `react-router` and `react-router/dom` |
| @react-router/dev (framework mode only) | 8.5.3 | — | peer `vite ^7 or ^8`, `typescript ^5.1 or ^6 or ^7` | |
| @tanstack/react-query | 5.108.4 | 2026-11-23 | React ^18 or ^19 | v4 is the `previous` tag |
| typescript | 7.0.2 | 2026-07-08 | Node ≥16.20 | **TS 7 ships no compiler API**; 6.0.3 is the last 6.x |
| typescript-eslint | 8.74.0 | — | peer `typescript >=4.8.4 <6.1.0`, `eslint ^8.57 or ^9 or ^10` | **incompatible with TS 7 as the `typescript` package** |
| eslint | 10.15.0 | — | Node ^20.19, ^22.13 or ≥24 | `maintenance` tag = 9.39.5 |
| eslint-plugin-react-hooks | 7.1.1 | 2026-04-17 | peer eslint up to ^10 | recommended preset includes React Compiler lints |
| eslint-plugin-jsx-a11y | 6.10.2 | 2024-10-26 | peer eslint up to **^9** | peer conflict with ESLint 10 |
| babel-plugin-react-compiler | 1.0.0 | 2025-10-07 | — | **React Compiler is stable** (react.dev: "now stable") |
| zod | 4.6.7 | 2026-10-12 | — | Zod docs: tested against TS ≥5.5, requires `strict` |
| react-hook-form | 7.92.0 | — | Node ≥18; React ^16.8–^19 | v8 exists only as `beta` (8.0.0-beta.5) |
| @hookform/resolvers | 7.0.9 | — | peer `react-hook-form ^7.55`, `zod ^3.25 or ^4` | |
| vitest | 5.1.2 | 2026-11-25 | Node ^22.12, ^24 or ≥26; peer `vite ^6.4, ^7 or ^8` | Vitest 5.0 released 2026-09-03 |
| jsdom | 31.0.1 | — | Node ^22.22.2, ^24.15 or ≥26 | |
| @testing-library/react | 16.3.3 | — | peer React ^18/^19, `@testing-library/dom ^10` (10.4.2) | |
| @testing-library/user-event | 14.6.13 | — | — | |
| @testing-library/jest-dom | 8.0.0 | 2026-11-19 | Node ≥22; peer `vitest >=5 <6` | |
| msw | 3.0.8 | 2026-11-26 | Node ≥22.12 | 3.x moves handlers to `msw/http` etc. |
| @playwright/test | 1.65.1 | — | Node ≥20 (docs: latest 22.x/24.x/26.x) | |
| Supporting (if chosen) | @fontsource-variable/inter 5.3.0, @fontsource/rubik 5.3.0, react-error-boundary 6.1.6, @tanstack/react-virtual 3.14.28, @tanstack/react-query-devtools 5.108.4, eslint-plugin-boundaries 7.4.5, dependency-cruiser 18.9.0, rollup-plugin-visualizer 7.3.0 (peer rolldown 1.x), @next/bundle-analyzer 16.4.6, @rolldown/plugin-babel 0.3.1, tailwindcss 4.3.5, recharts 3.11.1 | | | Versions only; adding any of them needs an ADR (AGENTS.md §6) |

**Compatibility findings**

- **Node floor:** React Router 8 (≥22.22), jsdom 31 (^22.22.2 / ^24.15), MSW 3 and Vitest 5 (≥22.12) set the effective floor at **Node 22.22.2+ or 24.15+**. Local Node 24.18.0 qualifies. PROPOSAL — requires ADR: pin `engines.node` to `>=22.22.2` (or 24 LTS) and use it in CI.
- **TypeScript:** TS 7.0 "does not ship with an API"; typescript-eslint caps `typescript <6.1.0`. The TS team's documented workaround is an npm alias (`typescript` → `@typescript/typescript6`, plus `@typescript/native` → TS 7 for `tsc`). PROPOSAL — requires ADR: use **TypeScript 6.0.3** for the MVP (one package, works with typescript-eslint); revisit TS 7 when 7.1 ships its API. TS 6/7 defaults to note: `strict` true, `module` esnext, `types` defaults to `[]` (so `vite/client` and test globals must be listed explicitly), `noUncheckedSideEffectImports` true.
- **ESLint:** jsx-a11y 6.10.2 declares ESLint ≤9. PROPOSAL — requires ADR: either ESLint 9.39.5 (`maintenance`) with jsx-a11y, or ESLint 10 without jsx-a11y and rely on Testing Library role queries + Playwright/axe for accessibility. The simpler path that keeps a11y linting is ESLint 9.
- **React Router 8** needs React ≥19.2.7, so React 19.3.1 is fine.

---

## 2. React rules and guidance (react.dev, React 19.3 docs)

| Topic | Guidance | Tag |
|---|---|---|
| Rules of Hooks | Call Hooks only at the top level of components/custom Hooks, never in conditions, loops, after an early return, in event handlers, in `useMemo`/`useEffect` callbacks, or in try/catch. Enforce with `eslint-plugin-react-hooks`. | OFFICIAL GUIDANCE; lint is ESTABLISHED (AGENTS.md §7) |
| Lint preset | `eslint-plugin-react-hooks` `recommended` includes `rules-of-hooks`, `exhaustive-deps` and compiler-derived rules (`set-state-in-effect`, `purity`, `refs`, `immutability`, `static-components`, `error-boundaries`, …). They work even without the compiler enabled. | OFFICIAL GUIDANCE |
| You Might Not Need an Effect | Effects are an escape hatch for syncing with external systems. Don't use them to transform data for rendering (compute during render) or to handle user events (use the handler). Subscribing to a browser store → `useSyncExternalStore`. | OFFICIAL GUIDANCE |
| Fetching in effects | An effect that fetches must abort or ignore stale results in cleanup (race conditions). Downsides: no SSR, waterfalls, no cache, boilerplate. React recommends a framework's data mechanism or a client cache such as **TanStack Query**, SWR or React Router. | OFFICIAL GUIDANCE |
| `lazy` + `Suspense` | Declare `lazy(() => import(...))` at module top level (never inside a component, or state resets). The module needs a default export. Wrap in `<Suspense fallback>`. A rejected import throws to the nearest Error Boundary. | OFFICIAL GUIDANCE |
| `memo`/`useMemo`/`useCallback` | Only a performance optimization; code must work without it. Worth it for noticeably slow calculations (≥~1 ms measured), props to `memo` components, or Hook dependencies. Prefer `children` composition, local state, pure rendering and fewer Effects first; profile before memoizing. | OFFICIAL GUIDANCE; "measure first" is ESTABLISHED (AGENTS.md §4, ID-10) |
| React Compiler | Stable (v1.0). Auto-memoizes components and hooks. For new code "rely on the compiler"; keep `useMemo`/`useCallback` as escape hatches (e.g. effect dependencies). Vite: `@vitejs/plugin-react` 6 `reactCompilerPreset()` via `@rolldown/plugin-babel` (+ `@babel/core`, `babel-plugin-react-compiler`); the Rust `compiler: true` option is **experimental**. Next.js: `reactCompiler: true` (stable since 16.0). | OFFICIAL GUIDANCE |
| Error boundaries | Still class-only ("no way to write an Error Boundary as a function component"); react.dev points to `react-error-boundary`. They don't catch event-handler, async (`setTimeout`) or SSR errors; errors inside `startTransition` are caught. Place them where an error message makes sense, not around every leaf. | OFFICIAL GUIDANCE |
| Keys | Unique among siblings, stable, from data IDs. No index keys for lists that reorder/insert/delete (Kanban cards move between columns), no `Math.random()`. | OFFICIAL GUIDANCE |
| Controlled vs uncontrolled | "Controlled" = driven by props; "uncontrolled" = local state. Choose per piece of information; each state has one owner (single source of truth). | OFFICIAL GUIDANCE |
| Context | Before context, pass props or pass JSX as `children`. Good uses: theming, **current account**, routing, reducer+context state. | OFFICIAL GUIDANCE |
| State structure | Group related state; avoid contradictions, **redundant** state (derive during render), **duplication**, deep nesting. | OFFICIAL GUIDANCE |
| React 19 forms | `<form action={fn}>` runs `fn(formData)` in a Transition, exposes pending via `useFormStatus`, propagates errors to the nearest Error Boundary, and **resets uncontrolled fields on success**. `useActionState` returns `[state, dispatch, isPending]`; `useOptimistic` gives transient optimistic UI. React calls `action` the preferred form API since 19; `onSubmit` + `preventDefault` still works and skips the reset. | OFFICIAL GUIDANCE |

**Fit of React 19 actions for a client-side bearer-token SPA.** Actions are plain async functions in the browser; Server Functions are optional, so they work without a server. Gaps for this app: (1) the auto-reset of uncontrolled fields must be worked around to keep values on a 422 (store submitted values, or use `onSubmit`); (2) per-field 422 mapping, focus on the first invalid field and client validation are manual; (3) `useOptimistic` keeps optimistic state in one component, while the Kanban board's data lives in the query cache shared by several components. PROPOSAL — requires ADR: don't build forms or Kanban optimism on actions in the MVP; see §5–6.

---

## 3. Framework options for this app

### 3a. Next.js 16 App Router

- **Rendering:** layouts and pages are Server Components by default; `"use client"` marks a module-graph boundary; Client Components are still prerendered to HTML; props crossing the boundary must be serializable. OFFICIAL GUIDANCE.
- **Secrets:** only `NEXT_PUBLIC_*` env vars reach the browser, inlined at build time; `server-only` makes a client import a build error. OFFICIAL GUIDANCE.
- **Auth guidance:** Next.js recommends an auth library; sessions are stateless (encrypted cookie) or database-backed, set server-side with `HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Path`. Checks go in a server-only Data Access Layer (DAL); Proxy (`proxy.ts`) is only an optimistic check; layouts don't re-render on navigation, so don't rely on layout auth checks. OFFICIAL GUIDANCE.
- **Data Security guide:** for an existing external HTTP API, follow a "Zero Trust" model and call it from Server Components with the token read from a cookie. Treat Route Handlers, `proxy.ts` and `"use server"` files as public endpoints. Server Actions check `Origin` against `Host` (CSRF). OFFICIAL GUIDANCE.
- **BFF:** the Backend-for-Frontend guide uses Route Handlers to proxy to a backend: map a fixed set of endpoints, validate input, forward only needed headers, attach the server-side credential. OFFICIAL GUIDANCE.
- **How auth would work here:**
  - *Option N1, client bearer:* the token sits in browser storage and Client Components call the API directly. Server Components can't see the token, so every data screen becomes a Client Component. Next.js then adds a server runtime and RSC rules with no data-loading benefit.
  - *Option N2, BFF:* login goes through a Route Handler or Server Action, which stores the Sanctum token in an encrypted `HttpOnly` cookie session. All API traffic, including multipart avatar upload, goes through Route Handlers (or Server Components/DAL). JavaScript never sees the token. Costs: a proxy layer per endpoint (or a strict allow-list catch-all), CSRF/origin handling on mutating handlers, an extra network hop, and Node hosting.
- **Deployment:** Node server or Docker support all features. Static export (`output: 'export'`) drops Route Handlers that read the Request, cookies, Proxy, rewrites, Server Actions, default image optimization, and **dynamic routes without `generateStaticParams`**, so `/projects/[id]` would not work as a path segment. OFFICIAL GUIDANCE.
- **Fit:** strong if the auth ADR requires `HttpOnly` cookies (N2). Weak for N1: more concepts (server/client boundary, serialization, caching layers) for screens that are all client-fetched.

### 3b. Vite 8 + React 19 SPA + React Router 8 (data mode)

- **Rendering:** pure client-side rendering. Route-level splitting via the route object's `lazy` (loads the component, and optionally the loader, in parallel). Data mode adds route `ErrorBoundary` (read with `useRouteError`), loaders/actions, pending states. Create the router once outside React. OFFICIAL GUIDANCE.
- **Env exposure:** only `VITE_*` vars reach client code, inlined at build; "`VITE_*` variables should not contain sensitive information". OFFICIAL GUIDANCE. The bundle holds only the public API base URL.
- **Auth:** the bearer token is held by the session module: in memory, plus Web Storage so the session survives reload. OWASP: Web Storage is readable by any XSS ("do not store session identifiers in local storage… cookies can mitigate this risk using the httpOnly flag"); prefer `sessionStorage` when persistence isn't needed. A natural mapping is `remember` → `localStorage`, otherwise `sessionStorage`. Mitigations to put in the ADR: a strict CSP at the host, no `dangerouslySetInnerHTML`, no third-party scripts, token never in URLs or logs (ID-7).
- **BFF feasibility:** not built in. It would need a separate server or edge function, which cancels most of this option's simplicity.
- **Deployment:** static files on any host plus an SPA fallback rewrite to `index.html` (React Router SPA guide: "direct all URLs to index.html"). Set `Cache-Control: no-cache` on HTML and handle `vite:preloadError` for stale chunks after a redeploy (Vite build guide). OFFICIAL GUIDANCE.
- **Fit:** matches the API contract directly (bearer + CORS without credentials) and has the fewest concepts. It satisfies "route-sized bundles". react.dev notes that from-scratch setups own routing and data choices themselves; here React Router and TanStack Query cover those.

### 3c. React Router 8 framework mode

- Adds a Vite plugin, a route config file, type-safe route modules, automatic code splitting, and SPA/SSR/SSG strategies. react.dev lists it among recommended frameworks; that page still says "(v7)" while npm latest is 8.5.3. OFFICIAL GUIDANCE.
- **SPA mode (`ssr: false`):** still prerenders the root route at build, so routes must be SSR-safe (no `window` during the initial render); needs `@react-router/node`; only `clientLoader`/`clientAction` outside the root. OFFICIAL GUIDANCE.
- **SSR mode:** the server would need the token, which means a cookie session (`createCookieSessionStorage` exists in framework/data mode). That raises the same BFF and hosting questions as Next.js N2, with less official auth guidance than Next.js.
- **Fit:** a reasonable middle ground, but it adds build-time SSR constraints and conventions without solving a requirement this app has.

### Recommendation

**PROPOSAL — requires ADR approval: Vite 8 + React 19.3 SPA with React Router 8 in data mode, TanStack Query v5 for server state, and the bearer token stored client-side (memory plus `sessionStorage`, or `localStorage` when "Remember Me" is checked), with the XSS mitigations above.**

Decisive factors:
1. The API is designed for this pattern: bearer tokens and CORS without credentials (HANDOFF §4). No server is needed to talk to it.
2. All screens are authenticated and need no SEO. Server rendering gives these screens nothing unless a server also holds the token.
3. Fewest concepts for parallel agents in two days: no server/client boundary, no serialization rules, no server cache layers. Route chunks and shared surfaces map cleanly to tickets.
4. Static hosting, so no Node runtime to operate.

**Runner-up: Next.js 16 App Router with a Route Handler BFF (option N2)** and an encrypted `HttpOnly` session cookie holding the Sanctum token.

**What would change the choice:**
- The security/auth ADR rules out JS-readable token storage (OWASP guidance) → choose Next.js N2. Route Handlers, `server-only`, the DAL pattern and `cookies()` are documented first-party, and the reference site shows it works with this backend.
- A requirement for server-rendered first paint or SEO on any screen → Next.js.
- A team preference for file-based typed routes → React Router framework mode in SPA mode (`ssr: false`).
- Next.js N1 (client bearer) is **not** recommended. It carries Next.js complexity without the BFF benefit. With static export it also loses dynamic path segments.

---

## 4. Rendering boundaries

### If Next.js is chosen (all OFFICIAL GUIDANCE unless tagged)

- Server Components by default; put `"use client"` on the **smallest interactive leaf** (e.g. the search box inside an otherwise server layout) to reduce client JS.
- Everything a `"use client"` file imports joins the client bundle. Server Components passed as `children`/props do **not**; they render on the server and arrive as output. Use this to place server UI inside client wrappers (modal, providers).
- Root layout stays a Server Component; context providers go in a dedicated client component wrapping `{children}`, rendered as deep as possible (ESTABLISHED by AGENTS.md §3 and matches Next docs).
- Props crossing the boundary must be serializable by React.
- Mark secret-holding modules with `import 'server-only'`; only `NEXT_PUBLIC_*` reaches the browser.
- Auth checks in the DAL near the data, not in layouts; Proxy is optimistic only; treat Route Handlers as public endpoints.
- Lazy loading: `next/dynamic` or `React.lazy` for Client Components; `ssr: false` only inside Client Components.

### If the Vite SPA is chosen

- Rendering is all client; AGENTS.md §3's Next.js rules don't carry over (ESTABLISHED: "Next.js rules do not carry over automatically").
- **Route-level lazy:** every route uses React Router `lazy` (OFFICIAL GUIDANCE). Heavy widgets (chart, drag-and-drop) use `React.lazy` + `Suspense` at module top level (OFFICIAL GUIDANCE; ESTABLISHED by ID-10).
- **No server secrets at all** in the repo's client code or `VITE_*` vars; the only config is the public API base URL (OFFICIAL GUIDANCE + ESTABLISHED by ID-6).
- **Error boundaries:** React Router route `ErrorBoundary` per route (OFFICIAL GUIDANCE), satisfying AGENTS.md §7 "each route or feature has an error boundary". PROPOSAL — requires ADR: a shared block-level boundary for isolated crashes (e.g. the lazy chart), either `react-error-boundary` 6.1.6 (react.dev-referenced) or one small class component in shared UI (no dependency).

---

## 5. Data fetching

### TanStack Query v5 facts (OFFICIAL GUIDANCE, tanstack.com "latest" = v5.108)

- **Query keys:** top-level arrays, JSON-serializable, unique to the data, hashed deterministically (object key order ignored, array order matters). Every variable the `queryFn` uses must be in the key; keys act as dependencies.
- **Deduplication/cache:** instances sharing a key share one cache entry and status; data is returned from cache to a newly mounted instance while it revalidates.
- **Defaults:** `staleTime` 0 (immediately stale); stale queries refetch on mount, window refocus and reconnect; inactive queries are garbage-collected after `gcTime` 5 min; failed **queries retry 3 times** with exponential backoff; **mutations do not retry by default**; structural sharing keeps references stable.
- **`staleTime` values:** number, `Infinity` (invalidation still works) or `'static'` (even invalidation is ignored).
- **Cancellation:** each `queryFn` receives an `AbortSignal`; pass it to `fetch` so out-of-date or inactive queries abort and revert. Cancellation **does not work** with `useSuspenseQuery` and the other Suspense hooks.
- **Invalidation:** `invalidateQueries({ queryKey })` marks queries matching that prefix stale and refetches active ones; `exact` and `predicate` narrow it.
- **Optimistic updates with rollback:** `onMutate` → `cancelQueries` → snapshot `getQueryData` → `setQueryData` → return `{ previous }`; `onError` restores it; `onSettled` invalidates.
- **`queryOptions`:** a helper that keeps key, function and options together with type inference. It can be reused across `useQuery`, `useSuspenseQuery` and `queryClient.query`.
- **Prefetch API change:** `prefetchQuery` and `ensureQueryData` are **deprecated** in favour of `queryClient.query(...)` and will be removed next major.
- **`useQuery` vs `useSuspenseQuery`:** the Suspense variant guarantees `data` and delegates loading and errors to Suspense and Error Boundaries. It can't be conditionally enabled, has no `placeholderData`, and throws to the boundary only when no cached data exists. Reset is via `QueryErrorResetBoundary` + `react-error-boundary`.

### Proposals

**PROPOSAL — requires ADR:**
- **TanStack Query v5 is the only server-state mechanism.** React docs name it as a recommended client cache, and Next.js docs point to it for client fetching. React Router loaders are not used for data in the MVP. At most, a route `lazy`/loader may call `queryClient.query(queryOptions)` to start a fetch in parallel with the chunk download, which keeps one cache.
- **Per-domain query-key factories** built with `queryOptions` live next to each domain service, for example `['projects','list',{page,search,status}]`, `['projects','detail',id]`, `['tasks','board',projectId]`, `['tasks','detail',id]`, `['dashboard']`, `['auth','me']`. This makes "mutations invalidate exactly the affected queries" (ID-6) mechanical.
- **Explicit revalidation policy:**
  - global `staleTime` 30 s and default `gcTime`, with refetch on focus kept on;
  - `['auth','me']` uses `staleTime: Infinity` and is invalidated on profile update;
  - `retry` skips 4xx responses (401/403/404/422/429) and retries network errors and 5xx at most twice;
  - mutations keep `retry: 0`.
  The exact numbers are an ADR choice.
- **Default hook is `useQuery`** with flat per-state rendering (loading/empty/error/unauthorized/success, AGENTS.md §5), because:
  - the projects search and board need `AbortSignal` cancellation and conditional `enabled` (the assignee picker loads on open, D5);
  - the projects list needs previous-page placeholder data;
  - one dashboard request feeds independently rendered blocks (ID-5).
  Suspense stays in use for code-splitting boundaries.
- **Kanban status change:** use the documented `onMutate`/`onError`/`onSettled` rollback recipe on `['tasks','board',projectId]` (ID-5, ID-8). Do not use `useOptimistic`.
- **401 in one place (ID-7):** the HTTP client normalizes errors. The session layer reacts to a 401 by clearing the token, calling `queryClient.clear()`, and redirecting with a return path.

**Why not plain fetch + effects:** react.dev lists the race conditions, missing cache, waterfalls and boilerplate. Hand-rolling dedupe and invalidation would duplicate what TanStack Query already provides (OFFICIAL GUIDANCE).

**Next.js server fetching with bearer tokens:** Server Components can fetch only if the server holds the token, which means a cookie session (N2). Then three cache layers exist: Next.js server cache, Next.js client RSC cache and the TanStack cache. Next.js docs say their "cache identities and mutation invalidation must stay coordinated". That coordination is extra work this MVP does not need unless the BFF route is chosen (OFFICIAL GUIDANCE).

---

## 6. Forms

| Approach | 422 `errors:{field:string[]}` mapping | Duplicate-submit prevention | Accessibility | Cost |
|---|---|---|---|---|
| **react-hook-form 7 + zod 4 + `zodResolver`** | Documented loop: `setError(name, {type:'server', message}, {shouldFocus: index===0})`; non-field errors via `setError('root.serverError', …)`, cleared on next submit | `formState.isSubmitting` is true while the `onSubmit` promise is pending (must `await`/return it, e.g. `mutateAsync`); docs suggest `disabled={!isDirty \|\| isSubmitting}` | Docs: label+`htmlFor`, `aria-invalid`, `aria-describedby`, `noValidate`, `shouldFocusError` (default true), `role="alert"` for server errors | 3 small deps; schema doubles as TS types |
| React 19 `action` + `useActionState` | Manual: return the error map as state; keep values by storing the submitted data or using `onSubmit`, because uncontrolled fields reset on success | `isPending` / `useFormStatus().pending` | Manual | No deps; more hand-written code per form; client validation is manual |
| Plain controlled inputs + `useState` | Manual | Manual flag | Manual | Most boilerplate per form; state update on every keystroke |

Rows 1–2 are OFFICIAL GUIDANCE from react-hook-form.com, the resolvers README and react.dev. Row 3 is my assessment; no official source compares it.

**PROPOSAL — requires ADR:**
- Use **react-hook-form 7.92 + zod 4.6 + @hookform/resolvers 7.0.9**. The established 422 rule (ID-8: messages from `errors.{field}[0]`, focus on the first invalid field, an alert region for non-field messages) maps directly onto `setError` + `shouldFocus` + `root.serverError`.
- Submit through TanStack `useMutation().mutateAsync` so that `isSubmitting` drives the disabled/pending button.
- Pin to v7. v8 is in beta only.
- Zod schemas mirror the reference-site rules (ID-5); the server 422 stays authoritative.
- One shared field wrapper wires `id`/`htmlFor`/`aria-invalid`/`aria-describedby`; it belongs to the WI-4 primitives.

---

## 7. Performance

| Item | Guidance | Tag |
|---|---|---|
| Route splitting | Vite SPA: React Router route `lazy` on every route. Next.js: automatic per route segment. | OFFICIAL GUIDANCE; ESTABLISHED (ID-3, ID-10) |
| Heavy components | `React.lazy` + `Suspense` (Vite) or `next/dynamic` (Next) for the dashboard chart and any drag-and-drop; module top-level declarations. Vite's `vite:preloadError` event handles chunk-load failures after deploys. | OFFICIAL GUIDANCE |
| Chunking | Vite 8 uses `build.rolldownOptions.output.codeSplitting`; default splitting is enough for MVP. | OFFICIAL GUIDANCE; PROPOSAL — requires ADR (no manual chunks) |
| Fonts (Vite) | Fontsource: "start with its variable package"; import once in the entry; generated CSS uses `unicode-range` so only used character sets download; per-subset imports are **not available for variable fonts** but are for static packages. | OFFICIAL GUIDANCE |
| Fonts (proposal, Vite) | `@fontsource-variable/inter` (covers 400–700 in one face; unicode-range keeps downloads to latin for English text) + `@fontsource/rubik/latin-400.css` (explicit latin, weight 400 only). Alternative that matches D4 literally: static `@fontsource/inter/latin-{400,500,600,700}.css` (4 files). | PROPOSAL — requires ADR |
| Fonts (Next) | `next/font/google` self-hosts at build, no requests to Google, no layout shift; `subsets: ['latin']`, explicit weights. | OFFICIAL GUIDANCE |
| Images | Avatars come from the API host. Vite has no optimizer: set `width`/`height`, `loading="lazy"` below the fold, initials fallback (ID-10). Next `next/image` needs `images.remotePatterns` for that host and a server (default loader is unsupported in static export). | OFFICIAL GUIDANCE; ESTABLISHED (ID-10 initials fallback) |
| Virtualization | Lists are server-paginated (default 15/page, HANDOFF §4). Add `@tanstack/react-virtual` only if a measured board/list is slow. | PROPOSAL — requires ADR (not in MVP) |
| Memoization | React Compiler (stable) or none; measure before manual memo. PROPOSAL — requires ADR: enable React Compiler via `reactCompilerPreset()` + `@rolldown/plugin-babel` (Vite) or `reactCompiler: true` (Next). If the ADR prefers fewer deps, skip the compiler but keep the react-hooks lint preset. | OFFICIAL GUIDANCE + PROPOSAL |
| Bundle analysis | Next ≥16.1: `next analyze` (Turbopack analyzer). Vite: `rollup-plugin-visualizer` 7.3.0 declares rolldown 1.x support (registry peer only; its docs not checked). | OFFICIAL GUIDANCE (Next); registry fact (Vite) |
| Startup | Only `/auth/me` at startup; feature data loads on its screen. | ESTABLISHED (AGENTS.md §4, ID-6) |

---

## 8. Testing

| Layer | Tool | Guidance | Tag |
|---|---|---|---|
| Unit/component | Vitest 5.1 + jsdom 31 | `environment: 'jsdom'` (or per-file `// @vitest-environment jsdom`); Browser Mode is a separate test project. Vitest 5 declares `vite ^6.4 or ^7 or ^8` as a peer (registry), so it runs on the same Vite 8 toolchain. | OFFICIAL GUIDANCE + registry fact |
| DOM queries | @testing-library/react 16.3 + @testing-library/dom 10 + user-event 14 + jest-dom 8 | "The more your tests resemble the way your software is used, the more confidence they can give you"; query by role/label; `data-testid` only as an escape hatch. jest-dom 8 requires Vitest 5. | OFFICIAL GUIDANCE |
| Network boundary | MSW 3 | Mocks at the network level; works with any client (fetch, React Query). Vitest setup: `server.listen()` in `beforeAll`, `resetHandlers()` in `afterEach`, `close()` in `afterAll`. v3: import `http`/`HttpResponse` from `msw/http`; `onUnhandledRequest` renamed `onUnhandledFrame`; Node ≥22. | OFFICIAL GUIDANCE |
| E2E | @playwright/test 1.65 | Chromium/Firefox/WebKit, parallel, HTML report, UI mode, traces. | OFFICIAL GUIDANCE |
| Next.js specifics | Vitest with `@vitejs/plugin-react`, jsdom, `vite-tsconfig-paths`; **Vitest does not support `async` Server Components**, so test those with E2E. | OFFICIAL GUIDANCE |
| Forms a11y | RHF docs: assert `aria-invalid`, `aria-describedby`, `document.activeElement`, run axe. | OFFICIAL GUIDANCE |

**PROPOSAL — requires ADR:**
- MSW handlers and fixtures live only under test/dev tooling, built from sanitised shapes in `docs/api/plain.md` (AGENTS.md §7 allows mocks only in tests).
- Unit tests cover the HTTP client (envelope, error normalization, pagination P1–P4, dates), the capability map, query-key/invalidation behaviour and form 422 mapping.
- Component tests cover each data view's five states.
- Playwright E2E runs against the real API for the Tier 1 acceptance flows, Team Member included (D6). That requires test credentials supplied via local env, never committed (A7).

---

## 9. Project structure and boundary enforcement

- **React docs:** no react.dev page I found prescribes a folder structure. Vite doesn't either.
- **Next.js:** officially "unopinionated". It offers colocation inside `app` (files are routable only with `page`/`route`), private `_folders`, route groups `(group)`, an optional `src/`, and "pick a strategy and be consistent" (OFFICIAL GUIDANCE).
- **Feature-based structure** (each feature owns components, hooks, API service, types and utils, imported through its `index.ts`) is ESTABLISHED by AGENTS.md §2. The exact layout belongs to the folder-structure ADR.

**PROPOSAL — requires ADR (Vite SPA layout):**

```
src/app/        router config (lazy routes), providers, root error boundary
src/features/<auth|dashboard|projects|tasks|profile|teams|users>/
                components/ hooks/ api/ (service + queryOptions) types/ utils/ index.ts
src/shared/     ui/ (WI-4 primitives) api/ (HTTP client, pagination, dates — WI-5)
                lib/ (capability map, session)
```

- `src/app` and `src/shared` are the AGENTS.md §6 shared surfaces. Features never import from each other except through `index.ts`, and `shared` never imports `features`.

**Enforcement options** (simplest first):

1. **ESLint built-in `no-restricted-imports`** with `patterns`/`group` (or `regex`) and custom messages. For example, it can forbid `@/features/*/*` deep imports from outside a feature. No dependency is needed, but rules are path-pattern based and can't express "same feature allowed" without per-folder overrides (OFFICIAL GUIDANCE, ESLint rule docs via GitHub source).
2. **eslint-plugin-boundaries 7.4.5:** classify folders as element types (`feature`, `shared`, `app`) and write allow/disallow policies. Violations appear as normal ESLint errors in the editor and CI (OFFICIAL GUIDANCE, project README).
3. **dependency-cruiser 18.9.0:** a separate CLI that validates `forbidden` rules (also detects cycles and orphans) and draws graphs (OFFICIAL GUIDANCE, README).

PROPOSAL — requires ADR: start with option 1 plus per-feature ESLint overrides. Move to `eslint-plugin-boundaries` only if the patterns get unwieldy, which adds one dependency.

---

## 10. Open items for the ADRs

1. Token storage and BFF (auth ADR): accept JS-readable Web Storage with mitigations (→ Vite SPA), or require an `HttpOnly` cookie (→ Next.js BFF). This one decision selects the framework.
2. TypeScript 6.0.3 vs TS 7 with the alias workaround.
3. ESLint 9 + jsx-a11y vs ESLint 10 without jsx-a11y.
4. Enable React Compiler or not.
5. Fonts: variable Inter vs four static latin faces.
6. Styling and UI kit (Tailwind v4 / shadcn per reference site, or other). Not researched here.
7. Charts library (reference used recharts 3). Not researched here beyond the version.

---

## Sources (all fetched 2026-11-26)

**npm registry (versions, dist-tags, peers, engines)**
- https://registry.npmjs.org/<pkg>/latest and https://registry.npmjs.org/<pkg> for: react, react-dom, next, vite, @vitejs/plugin-react, react-router, react-router-dom, @react-router/dev, @tanstack/react-query, @tanstack/react-query-devtools, typescript, @typescript/typescript6, typescript-eslint, @typescript-eslint/parser, eslint, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, babel-plugin-react-compiler, @rolldown/plugin-babel, @babel/core, zod, react-hook-form, @hookform/resolvers, vitest, jsdom, @testing-library/react, @testing-library/dom, @testing-library/user-event, @testing-library/jest-dom, msw, @playwright/test, @fontsource-variable/inter, @fontsource/rubik, react-error-boundary, @tanstack/react-virtual, eslint-plugin-boundaries, dependency-cruiser, rollup-plugin-visualizer, @next/bundle-analyzer, tailwindcss, recharts, vite-tsconfig-paths, @types/react, @types/react-dom, @eslint/js, server-only, globals. These support §1 versions and compatibility findings.

**React (react.dev, React 19.3)**
- https://react.dev/versions: latest docs are React 19.3; React Compiler v1.0 and 19.3 posts.
- https://react.dev/blog/2026/09/09/react-19-3: 19.3 release (View Transitions, Fragment Refs stable).
- https://react.dev/learn/react-compiler and https://react.dev/learn/react-compiler/introduction: compiler is stable; guidance on useMemo/useCallback with the compiler.
- https://react.dev/learn/react-compiler/installation: Vite setup via `reactCompilerPreset` + `@rolldown/plugin-babel`; plugin-react 6 removed the inline babel option.
- https://react.dev/reference/rules/rules-of-hooks: Rules of Hooks.
- https://react.dev/reference/eslint-plugin-react-hooks: recommended rule set including compiler lints.
- https://react.dev/learn/you-might-not-need-an-effect: avoiding Effects; fetching race conditions; prefer framework/cache.
- https://react.dev/learn/synchronizing-with-effects: fetch cleanup; alternatives (TanStack Query, SWR, React Router).
- https://react.dev/reference/react/lazy: `lazy` rules (top level, default export, Suspense, rejections to Error Boundary).
- https://react.dev/reference/react/useMemo: when memoization helps; principles that remove the need for it.
- https://react.dev/reference/react/Component: Error Boundaries are class-only; react-error-boundary; what they don't catch.
- https://react.dev/learn/rendering-lists: rules of keys.
- https://react.dev/learn/sharing-state-between-components: controlled vs uncontrolled; single source of truth.
- https://react.dev/learn/passing-data-deeply-with-context: alternatives before context; use cases (current account).
- https://react.dev/learn/choosing-the-state-structure: avoid redundant/duplicated state.
- https://react.dev/reference/react-dom/components/form: `action` prop, reset of uncontrolled fields, `useFormStatus`, `useOptimistic`, preserving values.
- https://react.dev/reference/react/useActionState: signature, pending flag, caveats.
- https://react.dev/learn/creating-a-react-app: recommended frameworks (Next.js, React Router "v7"); frameworks support SPA/CSR.
- https://react.dev/learn/build-a-react-app-from-scratch: Vite option and its trade-offs.

**Next.js (nextjs.org docs, Next 16.x; pages show lastUpdated 2026)**
- https://nextjs.org/docs/app/getting-started/server-and-client-components: default Server Components, `"use client"` boundary, serializable props, children interleaving, providers, `server-only`, `NEXT_PUBLIC_`.
- https://nextjs.org/docs/app/guides/authentication: session types, HttpOnly cookie options, DAL, Proxy optimistic checks, layout caveat, Route Handlers as public endpoints.
- https://nextjs.org/docs/app/guides/data-security: Zero Trust for external HTTP APIs, DAL, Server Actions CSRF/origin check, auditing list.
- https://nextjs.org/docs/app/guides/environment-variables: `NEXT_PUBLIC_` build-time inlining; server-only by default.
- https://nextjs.org/docs/app/guides/static-exports: unsupported features (dynamic routes without generateStaticParams, cookies, Proxy, Route Handlers using Request, image default loader).
- https://nextjs.org/docs/app/guides/single-page-applications: Next as SPA; use TanStack Query/SWR for dedupe and mutations; static export option.
- https://nextjs.org/docs/app/guides/client-side-data-fetching: TanStack Query patterns; three cache layers need coordinated invalidation.
- https://nextjs.org/docs/app/getting-started/route-handlers: Route Handler conventions and caching.
- https://nextjs.org/docs/app/guides/backend-for-frontend: BFF proxy pattern with allow-listed endpoints and server-side credentials.
- https://nextjs.org/docs/app/getting-started/deploying: Node/Docker full support; static export limited.
- https://nextjs.org/docs/app/getting-started/project-structure: unopinionated structure, colocation, private folders, route groups, `src`.
- https://nextjs.org/docs/app/guides/testing/vitest: Vitest setup; async Server Components unsupported, use E2E.
- https://nextjs.org/docs/app/guides/lazy-loading: `next/dynamic`, `React.lazy`, `ssr: false` only in Client Components.
- https://nextjs.org/docs/app/getting-started/fonts: `next/font` self-hosting, subsets.
- https://nextjs.org/docs/app/getting-started/images: `remotePatterns` for remote images.
- https://nextjs.org/docs/app/guides/package-bundling: `next analyze` (v16.1+), `@next/bundle-analyzer` for Webpack.
- https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler: `reactCompiler` stable since v16.0.0.

**Vite (vite.dev, Vite 8)**
- https://vite.dev/guide/env-and-mode: `VITE_` exposure; don't put secrets in `VITE_*`.
- https://vite.dev/guide/build: Rolldown chunking option, `vite:preloadError`, `Cache-Control: no-cache` on HTML, browser targets.
- https://vite.dev/blog/announcing-vite8: Vite 8 stable (2026-03-12) with Rolldown as the single bundler.
- https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md: plugin-react 6 options; Babel React Compiler preset; Rust compiler experimental.
- https://vite.dev/guide/static-deploy: fetched, but my search phrase matched nothing, so no claim relies on it. The SPA fallback claim comes from React Router's SPA guide.

**React Router (reactrouter.com, v8)**
- https://reactrouter.com/start/modes: declarative/data/framework modes and API availability.
- https://reactrouter.com/start/data/installation: v8 data mode imports (`react-router`, `react-router/dom`); create the router outside React.
- https://reactrouter.com/start/data/route-object: route `lazy` for code splitting; revalidation defaults.
- https://reactrouter.com/how-to/error-boundary: route ErrorBoundary in data mode via `useRouteError`; nesting.
- https://reactrouter.com/how-to/spa: framework SPA mode constraints (`ssr: false`, build-time root render, SPA fallback).
- https://reactrouter.com/upgrading/v7: v8 minimums (Node 22.22+, React 19.2.7+).

**TanStack Query (tanstack.com, v5 "latest")**
- https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults: staleTime/gcTime/retry/refetch defaults; `'static'`.
- https://tanstack.com/query/latest/docs/framework/react/guides/query-keys: key rules and hashing.
- https://tanstack.com/query/latest/docs/framework/react/guides/caching: shared cache and dedupe across instances.
- https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation: AbortSignal; not supported with Suspense hooks.
- https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation: prefix/exact/predicate invalidation.
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates: onMutate/onError/onSettled rollback recipe.
- https://tanstack.com/query/latest/docs/framework/react/guides/mutations: mutations don't retry by default; `mutateAsync`.
- https://tanstack.com/query/latest/docs/framework/react/guides/suspense: `useSuspenseQuery` trade-offs; throwOnError default; QueryErrorResetBoundary.
- https://tanstack.com/query/latest/docs/framework/react/guides/query-options: `queryOptions` helper.
- https://tanstack.com/query/latest/docs/framework/react/guides/prefetching: `queryClient.query`; `prefetchQuery`/`ensureQueryData` deprecated.

**Forms**
- https://react-hook-form.com/docs/useform/seterror: server error mapping, `shouldFocus`, `root.*` errors.
- https://react-hook-form.com/docs/useform/formstate: `isSubmitting` semantics; double-submit pattern.
- https://react-hook-form.com/advanced-usage: index of guides; mentions a v8 migration guide (v8 is beta on npm).
- https://react-hook-form.com/advanced-usage/accessibility: labels, aria attributes, focus, `role="alert"`, testing.
- https://registry.npmjs.org/@hookform/resolvers (README): `zodResolver` usage with zod v4 and the input/output typing note. The GitHub README URL returned 404.
- https://zod.dev/: Zod 4 intro; requires TS ≥5.5 and `strict`.

**TypeScript**
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/: TS 7 has no API; typescript-eslint workaround via `@typescript/typescript6` alias; 6.0 defaults carried into 7.

**Testing**
- https://vitest.dev/blog/vitest-5: Vitest 5 release (2026-09-03).
- https://vitest.dev/guide/environment: jsdom/happy-dom environments; Browser Mode is separate.
- https://testing-library.com/docs/guiding-principles: test like the user.
- https://testing-library.com/docs/react-testing-library/intro/: install with `@testing-library/dom`; query by role/label.
- https://mswjs.io/docs/: network-level mocking, client-agnostic.
- https://mswjs.io/docs/integrations/node: Vitest lifecycle setup.
- https://mswjs.io/docs/migrations/2.x-to-3.x: v3 entry points, `onUnhandledFrame`, Node ≥22.
- https://playwright.dev/docs/intro: Playwright Test features and Node requirements.

**Fonts, security, boundaries**
- https://fontsource.org/docs/getting-started/install: variable package first; unicode-range; static per-weight imports.
- https://fontsource.org/docs/getting-started/subsets: per-subset imports exist only for static packages.
- https://fontsource.org/fonts/inter/install: Inter is variable on Fontsource.
- https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html: don't store session identifiers in localStorage; prefer sessionStorage; HttpOnly cookies mitigate.
- https://github.com/eslint/eslint/blob/main/docs/src/rules/no-restricted-imports.md: `patterns`/`group`/`regex` options. This is the docs source on GitHub; eslint.org timed out twice.
- https://github.com/javierbrea/eslint-plugin-boundaries: element types and dependency policies.
- https://github.com/sverweij/dependency-cruiser: forbidden-dependency rules and graphs.

**Could not fetch (no claim relies on them)**
- https://www.jsboundaries.dev/docs/overview/ timed out; the GitHub README was used instead.
- https://eslint.org/docs/latest/rules/no-restricted-imports timed out twice; the GitHub docs source was used instead.
- https://github.com/react-hook-form/resolvers/blob/main/README.md returned 404; the npm registry README was used instead.

---

## Addendum (2026-11-26): Styling, Icons, Charts, Fonts, A11y, Compiler, and Deployment Verification

Checked on **2026-11-26** directly against `https://registry.npmjs.org/<pkg>/latest` (and specific pinned versions where noted) and official documentation URLs (HTTP 200 verified, zero search-redirect URLs). Local inspection confirmed clean branch `docs/wi-2-adrs`, Node `v24.18.0`, npm `11.16.0`, and no `package.json` in the repository yet.

### A1. Additional verified npm packages and peer constraints (2026-11-26)

| Package | Verified Version | Node engine | Verified peer / dependency constraints | Notes for ADRs |
|---|---|---|---|---|
| `@tailwindcss/vite` | `4.3.5` | — | `vite: ^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8` | First-party Tailwind v4 Vite plugin; full Vite 8 support; CSS-first `@theme` tokens (`tailwindcss` `4.3.5`). |
| `lucide-react` | `1.81.0` | — | `react: ^16.5.1 \|\| ^17 \|\| ^18 \|\| ^19`, `@types/react: *` | Full React 19 support; ESM tree-shakable icons. |
| `recharts` | `3.11.1` | `>=18` | `react: ^16.8..^19`, `react-dom: ^16..^19`, `react-is: ^16.8..^19`, `@types/react: *` | Native React 19 support; declares `react-is` as a peer dependency (not bundled as an older direct dep). Install `react-is@19.3.1` directly to match `react@19.3.1` cleanly (add npm `overrides` only if a transitive package pins an older `react-is`). Note: renders runtime inline `style` attributes for `ResponsiveContainer` and `Tooltip` positioning. |
| `react-is` | `19.3.1` | — | — | Exact major/minor/patch match for `react@19.3.1`. |
| `@fontsource/inter` | `5.3.0` | — | — | Static package; verified exports include `./latin-400.css`, `./latin-500.css`, `./latin-600.css`, `./latin-700.css` (normal style, latin subset). Matches D4 literally without pulling weights 100–300 or 800–900. |
| `@fontsource-variable/inter` | `5.3.0` | — | — | Variable font covering 100–900; does not provide per-subset CSS imports (relies on `unicode-range`). |
| `@fontsource/rubik` | `5.3.0` | — | — | Static package; verified `./latin-400.css` export for the "Collabspace" wordmark per D4. |
| `prettier` | `3.10.1` | `>=14` | — | Official docs recommend `--save-dev --save-exact`. |
| `axe-core` | `4.14.1` | `>=4` | — | Actively maintained; callable directly (`axe.run(container)`) in Vitest + jsdom tests without an outdated wrapper. |
| `vitest-axe` | `0.1.0` | — | `vitest: >=0.16.0`; direct dep `axe-core: ^4.4.2` | Stale `0.1.0` wrapper pinned to `axe-core ^4.4.2`; rejected in favour of calling `axe-core@4.14.1` directly in Vitest and `@axe-core/playwright@4.14.1` in Playwright. |
| `@axe-core/playwright` | `4.14.1` | `>=22.12.0` | `playwright-core: >=1.0.0` | Official Deque Playwright integration (`AxeBuilder`); compatible with `@playwright/test@1.65.1` and Node 22.22.2+ / 24 LTS. |
| `@eslint/js` (pinned for ESLint 9) | `9.39.5` (latest is `10.0.1`) | `^18.18 \|\| ^20.9 \|\| >=21.1` | Matches `eslint@9.39.5` | **Critical peer finding:** `@eslint/js@10.0.1` requires `eslint: ^10.0.0`. Because `eslint-plugin-jsx-a11y@6.10.2` caps `eslint` at `^9`, both `eslint` and `@eslint/js` must pin to `9.39.5`. |
| `globals` | `17.14.0` | — | — | Browser/Node global definitions for ESLint 9 flat config. |
| `@types/react` / `@types/react-dom` | `19.3.3` / `19.3.0` | — | `@types/react-dom` peer `@types/react: ^19.3.0` | Match `react@19.3.1`. |
| `@types/node` (24 LTS line) | `24.19.4` (latest is `26.6.11`) | — | — | Matches Node 24 LTS CI environment and `vite@8.4.0` peer `@types/node: ^20.19 \|\| >=22.12`. |
| `@babel/core` / `@rolldown/plugin-babel` | `8.1.3` / `0.3.1` | `>=22.12` / `^24` | `@rolldown/plugin-babel` peers: `vite: ^8`, `rolldown: ^1.0.0-rc.5`, `@babel/core: ^7.29 \|\| ^8.0.0-rc.1` | Optional peers of `@vitejs/plugin-react@6.3.0` needed only if Babel-based `babel-plugin-react-compiler@1.0.0` is enabled. Because `@rolldown/plugin-babel` is pre-1.0 (`0.3.1`), introduces Babel into Vite 8's Oxc pipeline, and `eslint-plugin-react-hooks@7.1.1` already enforces all compiler rules statically, ADR-09 defers the build-time compiler plugin for MVP. |

### A2. Additional verified official documentation sources (checked 2026-11-26)

- https://tailwindcss.com/docs/installation/using-vite (Tailwind CSS 4.3.5): official `@tailwindcss/vite` setup and `@import "tailwindcss";`.
- https://tailwindcss.com/docs/theme (Tailwind CSS 4.3.5): CSS-first `@theme` design token variables generating utility classes and CSS custom properties.
- https://lucide.dev/guide/react (`lucide-react` 1.81.0): React installation, tree-shakable ESM imports, and SVG prop forwarding (canonical target of `/guide/packages/lucide-react`).
- https://recharts.github.io/en-US/guide/installation/ and https://github.com/recharts/recharts/wiki/3.0-migration-guide (Recharts 3.11.1): React 19 compatibility and `react-is` requirement.
- https://prettier.io/docs/install and https://prettier.io/docs/configuration (Prettier 3.10.1): `--save-dev --save-exact` installation and project-local config.
- https://playwright.dev/docs/accessibility-testing (`@playwright/test` 1.65.1 + `@axe-core/playwright` 4.14.1): `AxeBuilder` WCAG tag filtering and modal/state scanning.
- https://github.com/dequelabs/axe-core (`axe-core` 4.14.1) and https://github.com/chaance/vitest-axe (`vitest-axe` 0.1.0): direct `axe.run()` vs unmaintained wrapper pinned to `axe-core ^4.4.2`.
- https://github.com/bvaughn/react-error-boundary (`react-error-boundary` 6.1.6): `ErrorBoundary` fallback/reset API for block-level boundaries.
- https://github.com/btd/rollup-plugin-visualizer (`rollup-plugin-visualizer` 7.3.0): Rolldown 1.x / Vite 8 bundle visualization support.
- https://vercel.com/docs/project-configuration, https://vercel.com/docs/project-configuration/vercel-json, https://vercel.com/docs/headers/response-headers, and https://vercel.com/docs/deployments/environments: `vercel.json` SPA rewrites, `/assets/*` immutable caching, response security headers, and Preview vs Production environments.
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog (MDN current): native `<dialog>` `showModal()` Top Layer, built-in `inert`, Escape handling, and focus management.
- https://www.w3.org/WAI/ARIA/apg/patterns/listbox/ and https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/ (W3C WAI-ARIA APG): keyboard navigation and ARIA roles for custom selects and menus.
- https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static and https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static (MDN current): combining TanStack Query's `AbortSignal` with a `15_000 ms` request timeout without leaks.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src (MDN current): `style-src` directive semantics and `'unsafe-inline'` trade-offs for runtime inline style attributes.
- https://fontsource.org/fonts/inter/install and https://fontsource.org/fonts/rubik/install (`@fontsource/inter` 5.3.0, `@fontsource/rubik` 5.3.0): static per-weight latin CSS imports (`latin-400.css`..`latin-700.css`).
- https://www.typescriptlang.org/docs/handbook/tsconfig-json.html (TypeScript 6.0.3): `tsconfig.json` compiler options.