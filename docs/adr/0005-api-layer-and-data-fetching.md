# ADR-05: API Layer, Data Fetching, Caching, Retry, and Timeout

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §4, §5, §8 (item 5: API and data-fetching architecture), Spec ID-6, ID-8, ID-18, ID-19, Decisions D5, D10

---

## Context

CollabSpace consumes an existing Laravel 13 REST API (`https://collabspace.huma-volve.com/api/v1`) whose authoritative, evidence-audited contract is recorded in `docs/api/plain.md` (backed by committed probes in `docs/discovery/api-probe.md`, `docs/discovery/api-authenticated-shapes.md`, and the Gate 1 `#12` read-only `/files/1/download` check; `HANDOFF.md` §4, `ID-6`, `ID-19`):

1. **Mandatory header (`docs/api/plain.md` — *Required Headers*, `VERIFIED`):** Every `/api/v1/*` request — **including `GET /files/{file}/download`** (`#files-download`) — MUST include `Accept: application/json`; omitting it (e.g., `Accept: */*` or `Accept: text/html`) on a protected route without a valid token causes Laravel to return HTTP `500` (`"Route [login] not defined."`) instead of `401`.
2. **Six response envelope variants (`E1`–`E6`, `docs/api/plain.md` — *Response Envelope Variants*):**
   - `E1` Standard: `{ success: true, message: string, data: T }` (`VERIFIED` on probed reads & login; `DOCUMENTED` on writes & unprobed endpoints).
   - `E2` No-`message`: `{ success: true, data: T }` or `{ success: true, data: T[], meta }` (`#dashboard-index`, `#users-index` `VERIFIED`; `#users-show`, `#audit-logs-index`, `#ai-settings-index` `UNVERIFIED` — no committed probe log; `#ai-ask` `DOCUMENTED`).
   - `E3` `data: null`: `{ success: true, message: string, data: null }` (`#auth-logout` `VERIFIED`; `#auth-verify-reset-otp`, `#auth-reset-password`, `#profile-change-password`, and `DELETE` endpoints `DOCUMENTED`).
   - `E4` No-`data`: `{ success: true, message: string }` (`#users-destroy`, `DOCUMENTED`, out-of-scope MVP).
   - `E5` Bare object: `{ ... }` (`#broadcasting-auth`, `DOCUMENTED`, out-of-scope MVP).
   - `E6` Binary stream: raw bytes + `Content-Type: <mime>` + `Content-Disposition: attachment` (`#files-download`: `200` binary stream `DOCUMENTED` / `UNVERIFIED`; unauthenticated `401` with `Accept: application/json` vs. `500` with `Accept: */*` `VERIFIED` in Gate 1 `#12`).
   - **Error envelope (`CONFLICT` resolved):** Live server (`401`, route-not-found `404`, `405`, `500`, and web `/broadcasting/auth` `403` `VERIFIED`; API `403` and model-not-found `404` strings `DOCUMENTED` / `UNVERIFIED`) and Postman `422` examples (`DOCUMENTED`) return `{ success: false, message: string, errors: null | Record<string, string[]> }`, while OpenAPI omits `success`. Parsers must treat `success` as optional (`{ success?: false, message?: string, errors?: Record<string, string[]> | null }`).
3. **Four pagination shapes (`P1`–`P4`):** `P1` (`data: { data, links, meta }` — `VERIFIED` on `#projects-index`, `#tasks-index`, `#teams-index`; `UNVERIFIED` on `#meetings-index`, `#files-index`, `#profile-files`), `P2` (raw Laravel `LengthAwarePaginator` inside `data` on `#profile-tasks`, `VERIFIED`), `P3` (`{ items, pagination: { current_page, per_page, total } }` integers on `#dashboard-index` blocks except `upcoming_meetings` which has `{ items }` only, `VERIFIED`), and `P4` (sibling `meta` next to `data`, no `links` — `VERIFIED` on `#users-index`; `DOCUMENTED` / `UNVERIFIED` on `#notifications-index` and `#audit-logs-index`, with optional `meta.unread_count`). Default `per_page` is `15` on `P1`/`P2`.
4. **Four date/time formats (`VERIFIED` on probed endpoints):** `YYYY-MM-DD`, `HH:MM:SS`, `ISO+offset` (`YYYY-MM-DDTHH:MM:SS+HH:MM`), and `ISO-Z` (`YYYY-MM-DDTHH:MM:SS.000000Z` on raw Eloquent models in `#profile-me` and `#profile-tasks`).
5. **Evidence-audited endpoint behaviours (`docs/api/plain.md` — *D10 Verification Status (Evidence Audit)*):**
   - `403` wire shape: web `/broadcasting/auth` `403` is `VERIFIED` (`api-probe.md` #29: `"You do not have permission to perform this action."`); OpenAPI `AuthorizationException` on `/api/v1/*` (`#projects-show`) documents `"This action is unauthorized."` (`DOCUMENTED` / `UNVERIFIED` live).
   - File downloads (`#files-download`, `#dashboard-index`, `#files-index`): unauthenticated `GET /api/v1/files/1/download` returns `500` with `Accept: */*` and `401` JSON with `Accept: application/json` (`VERIFIED` in Gate 1 `#12`). Authenticated `200` headers (`Content-Disposition`, `Access-Control-Expose-Headers` on `/download`) and Dashboard `download_url` root-relative vs. absolute format remain `DOCUMENTED` / `UNVERIFIED` (`Access-Control-Expose-Headers` is `VERIFIED` absent on `/auth/me` and `OPTIONS /projects` in `api-probe.md` #14–#15).
   - `GET /users` (`#users-index`): Project Manager `200 OK`, `E2` no-`message`, and `P4` sibling `meta` (`total: 127` at `per_page=5`) are `VERIFIED` (`api-authenticated-shapes.md` §8); multi-character `search` filtering and upper `per_page` caps remain `UNVERIFIED`.
   - Kanban (`#tasks-kanban`): `columns` keys are `VERIFIED` exact Title-case `TaskStatus` values in exact order `["Pending", "In Progress", "In Review", "Completed"]` with all four always present (`api-authenticated-shapes.md` §3); exact `columns[key].name` display strings remain `UNVERIFIED` (`api-authenticated-shapes.md` §6).
   - Tier 2 list endpoints (`#notifications-index`, `#notifications-unread-count`, `#meetings-index`, `#files-index`, `#profile-files`): `GET /notifications` `401` is `VERIFIED` (`api-probe.md` #8); `200` payloads, `P1`/`P4` pagination, `NotificationResource.data` object/array shape, and `MeetingSummaryResource` polymorphism remain `DOCUMENTED` / `UNVERIFIED` (coded defensively).
6. **Strict data-fetching rules (`AGENTS.md` §4–§5, `ID-18`, `ID-19`):** One HTTP client, one service per domain, zero HTTP calls in components, request deduplication, `AbortSignal` cancellation, 12 distinct `AppError` kinds, bounded GET retries with zero retries on 4xx/mutations, and optimistic Kanban status changes with rollback.

---

## Decision

Adopt a **single native `fetch` HTTP client** (`src/shared/api/httpClient.ts`) returning a discriminated **`AppError`** union (with a dedicated authenticated binary `downloadBlob` helper), paired with **TanStack Query `5.108.4`** (`useQuery` default, `queryOptions` factories, `useMutation`), unified `P1`–`P4` pagination normalisation, and a single 4-format date module — all owned by `WI-5`.

### 1. Single native `fetch` HTTP client (`src/shared/api/httpClient.ts`)

- **Base URL, origin resolution & headers:** Reads `VITE_API_BASE_URL` (`https://collabspace.huma-volve.com/api/v1`) once and derives the trusted API origin (`https://collabspace.huma-volve.com`) so root-relative API paths (notably Dashboard `recent_files.items[].download_url` `/api/v1/files/{id}/download`) resolve cleanly without double-prepending `/api/v1`. Attaches `Accept: application/json` unconditionally on JSON requests; attaches `Authorization: Bearer <token>` from `src/shared/lib/session.ts` when authenticated; sets `Content-Type: application/json` for JSON bodies and lets the browser set the `multipart/form-data` boundary automatically for `FormData` uploads (`#profile-update`, `#files-store`).
- **Timeout + cancellation (`15_000 ms`):** Combines caller/TanStack Query `AbortSignal` with a `15_000 ms` timeout (`AbortSignal.timeout(15_000)` composed via `AbortSignal.any([callerSignal, timeoutSignal])`). Distinguishes caller cancellation (`kind: 'aborted'`, silently ignored) from elapsed timeout (`kind: 'timeout'`, distinct user message).
- **Envelope unwrapping (`E1`–`E4`):** Unwraps `{ success, message?, data? }` per each endpoint's contract in `docs/api/plain.md`:
  - `E1` (`{ success: true, message, data }`) and `E2` (`{ success: true, data }` / `{ success: true, data, meta }` — treating `message` as optional on `#dashboard-index`, `#users-index`, `#users-show`, `#audit-logs-index`, `#ai-settings-index`).
  - `E3` (`{ success: true, message, data: null }` — `#auth-logout`, `#auth-verify-reset-otp`, `#auth-reset-password`, `#profile-change-password`, `DELETE` endpoints) and `E4` (missing `data` key on `#users-destroy`).
  - Any malformed/non-JSON body, HTTP `405` (`VERIFIED`), or contract-breaking payload raises `kind: 'unexpected'`.
- **Discriminated `AppError` (all 12 `ID-19` kinds, aligned to `docs/api/plain.md`):**
  ```ts
  export type AppError =
    | { kind: 'network' }
    | { kind: 'timeout' }
    | { kind: 'aborted' }
    | { kind: 'bad_request'; status: 400; message: string }
    | { kind: 'unauthorized'; status: 401 }
    | { kind: 'forbidden'; status: 403; message: string }
    | { kind: 'not_found'; status: 404 }
    | { kind: 'conflict'; status: 409; message: string }
    | { kind: 'validation'; status: 422; message: string; errors: Record<string, string[]> }
    | { kind: 'rate_limited'; status: 429; message: string; retryAfterSeconds?: number }
    | { kind: 'server'; status: number } // server message replaced with safe generic copy
    | { kind: 'unexpected'; status?: number; detail: string };
  ```
  - **`403` parsing (`#projects-show`, `DOCUMENTED` on `/api/v1/*`; web `403` `VERIFIED`):** Parses `{ success?: false, message?: string, errors?: null }` into `{ kind: 'forbidden', status: 403, message: parsed.message || 'You do not have permission to perform this action.' }` (OpenAPI documented message: `"This action is unauthorized."`; web `403` observed message: `"You do not have permission to perform this action."`). Never clears session (`ADR-01`); mutations show a permission toast and roll back optimistic updates; page-level loads render an access-denied state (never an empty state).
  - **`404` sanitization (`#projects-show`, route `404` `VERIFIED` / model `404` `DOCUMENTED` / `UNVERIFIED`):** Laravel model-not-found `404` bodies can expose internal PHP model class names (`"No query results for model [App\\Models\\Project] <id>"`). `AppError` omits raw server text on `not_found` so UIs always render safe generic not-found states.
  - **`422` parsing (`DOCUMENTED`, `docs/api/plain.md` Global Conventions):** Normalizes `{ success?: false, message, errors }` (supporting Laravel dot-notation keys like `members.0.role_in_team` and `errors: null` edge cases) for `applyServerValidationErrors` (`ADR-08`).
- **401 hook:** Invokes the single `onUnauthorized` callback (`ADR-01`) unless the request explicitly opts out (`POST /auth/login` `#auth-login`, where `401` is a credential error).
- **429 `Retry-After` parsing:** Reads `Retry-After` (delta-seconds or HTTP-date) only when present and readable cross-origin; never invents a countdown when omitted or hidden by CORS (`BR-6`, `ADR-13`).
- **Authenticated binary file downloads (`downloadBlob`, `#files-download`, `#dashboard-index`, `#files-index`):**
  - Because unauthenticated `GET /api/v1/files/{id}/download` returns HTTP `500` (`"Route [login] not defined."`) when `Accept: */*` is sent and HTTP `401` JSON when `Accept: application/json` is sent, and CORS omits `Access-Control-Expose-Headers` (making `Content-Disposition` unreadable cross-origin), `httpClient.ts` exposes `downloadBlob(pathOrUrl, { fallbackFilename, signal })`:
    1. Resolves root-relative `/api/v1/...` paths (`#dashboard-index` `recent_files.items[].download_url`) against the API origin (`https://collabspace.huma-volve.com`) and validates absolute URLs (`FileAttachmentResource.url`) through `src/shared/lib/safeUrl.ts` — rejecting any URL outside the configured API origin or `/api/v1/files/` path.
    2. Always sends `Accept: application/json` alongside `Authorization: Bearer <token>` so expired or revoked sessions return HTTP `401` JSON and trigger `notifyUnauthorized()` before `response.blob()` rather than failing with HTTP `500`. Non-2xx responses normalize to `AppError` identically to JSON requests.
    3. Reads `response.blob()`, sanitizes `fallbackFilename` from file metadata (`DashboardFileResource.name` / `FileAttachmentResource.name`) — because `Content-Disposition` is not exposed cross-origin (`BR-6`) — triggers a programmatic download via `URL.createObjectURL` + transient `<a download>`, and immediately calls `URL.revokeObjectURL`. Untrusted HTML/SVG bytes are never rendered inline (`BR-8`).

### 2. Pagination (`P1`–`P4`), `/users` Member Picker (`D5`), and Date modules (`src/shared/api/`)

- **`pagination.ts`:** Pure normalisers mapping all four pagination shapes (`P1`–`P4`, `VERIFIED` on probed endpoints) in `docs/api/plain.md` into one typed `PaginatedResult<T>` (`{ items: T[]; currentPage: number; lastPage: number; perPage: number; total: number }`):
  - `normalizeP1` (`data: { data, links, meta }`): `#projects-index`, `#tasks-index`, `#teams-index` (`VERIFIED`), plus `#meetings-index`, `#files-index`, `#profile-files` (`UNVERIFIED`).
  - `normalizeP2` (raw `LengthAwarePaginator` inside `data`): `#profile-tasks` (`VERIFIED`; items are raw Eloquent `Task` models with `ISO-Z` dates, not `TaskResource`).
  - `normalizeP3` (`{ items, pagination: { current_page, per_page, total } }` integers): `#dashboard-index` blocks (`active_projects`, `tasks`, `teams`, `recent_files`, `recent_activity`; `VERIFIED`), deriving `lastPage = Math.max(1, Math.ceil(total / Math.max(1, perPage)))`. (`upcoming_meetings` has `{ items }` only and is not passed through `normalizeP3`.)
  - `normalizeP4` (sibling `meta` next to `data`, no `links`): `#users-index` (`E2`, no `message`, `VERIFIED`), plus `#audit-logs-index` and `#notifications-index` (`DOCUMENTED` / `UNVERIFIED`, also returning optional `unreadCount: meta.unread_count`).
- **New Project member picker (`D5`, `M28`, `#users-index`):** `api-authenticated-shapes.md` §8 verified that `GET /users` returns `200 OK` for Project Managers (`P4` + `E2`, `meta.total: 127` at `per_page=5`), while multi-character server-side `search=` filtering and upper `per_page` caps remain `UNVERIFIED`. The picker requests `GET /users?per_page=20&search=<debouncedQuery>&page=<page>` on demand (`enabled: isOpen`, debounced ~250–300 ms, `placeholderData: keepPreviousData`), supports loading additional pages when `currentPage < lastPage`, and keeps a lightweight client-side substring filter over loaded items strictly as a defensive fallback if server search is ever ignored or degraded. Task assignees follow `D5` §1 (project `direct_members` from `#projects-overview` + team `members[]` from `#projects-teams-index`, deduplicated by `id`, loaded when the picker opens and filtered client-side).
- **`dates.ts`:** Single pure parser accepting all four formats (`YYYY-MM-DD`, `HH:MM:SS`, `ISO+offset`, and `ISO-Z` — `VERIFIED` on probed endpoints, including raw Eloquent `ISO-Z` `due_date`/`start_date`/`deadline` in `#profile-me` and `#profile-tasks`) plus deterministic display formatters and `YYYY-MM-DD` / `HH:MM:SS` API request serializers.

### 3. TanStack Query `5.108.4` policy & domain services

- **Per-domain services (`src/shared/api/services/*.service.ts`):** One file per Tier 1 domain (`auth`, `dashboard`, `projects`, `tasks`, `teams`, `users`, `profile`) defining each endpoint path once, typed DTOs derived strictly from `VERIFIED`/`DOCUMENTED` fields in `docs/api/plain.md`, deterministic query-key factories, and reusable `queryOptions(...)` definitions.
  - **`dashboard.service.ts` enum note (`#dashboard-index`):** `DashboardTaskResource` returns lowercase snake_case `status` (`"pending" | "in_progress" | "in_review" | "completed"`) and lowercase `priority` (`"low" | "medium" | "high" | "critical"`) alongside Title-case `status_label` (`VERIFIED`), and `recent_files.items[].uploaded_by` is `{ id, name }` (`VERIFIED`, unlike `FileAttachmentResource.uploaded_by: string` `DOCUMENTED` on `#files-index`). Types and UI mappers handle these differences explicitly.
  - **Tier 2 extensibility (defensive shapes in `docs/api/plain.md`):** When Tier 2 services are added (`notifications.service.ts`, `meetings.service.ts`, `files.service.ts`, `search.service.ts`), they reuse `normalizeP1`/`normalizeP4`, `downloadBlob`, and defensive `DOCUMENTED` / `UNVERIFIED` shapes: `#notifications-index` (`P4` + object/array `data` guard), `#meetings-index` (`P1` + polymorphic `summary.action_items` and `summary.assigned_tasks`), and `#files-index` / `#profile-files` (`P1` + `FileAttachmentResource`).
- **Default hook is `useQuery` (not `useSuspenseQuery`):** Required because Projects search/pagination needs `placeholderData: keepPreviousData`, People pickers need conditional `enabled: isOpen` (`D5`), Dashboard renders independent card states from one query (`ID-5`), and TanStack Query officially documents that `AbortSignal` cancellation does **not** work with `useSuspenseQuery`.
- **Caching & revalidation policy:**
  - Global default: `staleTime: 30_000` (30 s), `gcTime: 5 * 60_000` (5 min), `refetchOnWindowFocus: true`, `refetchOnReconnect: true`.
  - Session query `['auth', 'me']`: `staleTime: Infinity` (revalidated explicitly on profile/avatar mutation and cleared on logout/401).
  - No polling in Tier 1 (`ID-18`; notifications polling is Tier 2).
- **Retry policy (strictly bounded):**
  - **Queries (GET):** Custom `retry(failureCount, error)` allows **at most 2 retries** (`failureCount < 2`) with exponential backoff (`Math.min(1000 * 2 ** attempt, 8000)`) **ONLY** when `error.kind` is `'network'`, `'timeout'`, or `'server'` (5xx). **Zero retries** on all 4xx errors (`400`, `401`, `403`, `404`, `409`, `422`, `429`), `'aborted'`, and `'unexpected'`.
  - **Mutations:** `retry: 0` globally — never auto-resubmit state changes (`ID-19`).
- **Prefetching:** Where preloading is needed, use `queryClient.query(options)` (TanStack Query v5.108 deprecates `prefetchQuery` and `ensureQueryData`).
- **Kanban optimistic status update (`ID-5`, `ID-19`, `#tasks-kanban`, `#tasks-update-status`):** Implemented exclusively on `PATCH /tasks/{id}/status` using the documented TanStack Query rollback recipe on `['tasks', 'board', projectId]`. `api-authenticated-shapes.md` §3 verified that `columns` keys are exact Title-case `TaskStatus` literals in fixed order `["Pending", "In Progress", "In Review", "Completed"]`, with every column always present even when `count: 0` (exact `columns[key].name` display strings remain `UNVERIFIED`):
  1. `onMutate`: `await queryClient.cancelQueries({ queryKey })` -> snapshot `previous = queryClient.getQueryData(queryKey)` -> move the task between exact Title-case `columns[fromStatus]` and `columns[toStatus]` updating `task.status` and both column `count`s -> `queryClient.setQueryData(queryKey, movedBoard)` -> return `{ previous }`.
  2. `onError`: restore `queryClient.setQueryData(queryKey, context.previous)`; surface `403` (`{ kind: 'forbidden' }`) permission toast or error message.
  3. `onSettled`: `queryClient.invalidateQueries({ queryKey })` (and invalidate `['dashboard']` and `['projects', 'detail', projectId]` so progress/counts stay accurate).
- **All other mutations** (create/edit project `#projects-store`/`#projects-update`, create/edit/reassign/delete task `#tasks-store`/`#tasks-update`/`#tasks-assign`/`#tasks-destroy`, profile/avatar/password updates `#profile-update`/`#profile-remove-avatar`/`#profile-change-password`) wait for server confirmation before invalidating affected query keys (`ID-19`).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Axios + Redux Toolkit / `useEffect` fetching** | Use Axios interceptors and manual `useEffect` or Redux thunks for API calls and caching. | **Rejected.** Native `fetch` + `AbortSignal.timeout` / `AbortSignal.any` already provides everything needed in modern browsers and Node 22+ without an extra HTTP dependency (`AGENTS.md` §6). `useEffect` fetching lacks deduplication, cache invalidation, and stale-response race protection (`react.dev`), and Redux adds unnecessary global state boilerplate (`ADR-06`). |
| **2. React Router loaders + raw `fetch` (simpler no-cache option)** | Load screen data inside React Router `loader` functions calling `httpClient` directly. | **Rejected.** Lacks cross-component deduplication, background revalidation on window focus, `placeholderData` pagination transitions, conditional on-demand picker loading (`D5`), and structured optimistic rollback (`onMutate`/`onError`). |
| **3. `useSuspenseQuery` for all data views** | Delegate all loading and error states to React `<Suspense>` and Error Boundaries. | **Rejected.** TanStack Query v5 officially notes that `useSuspenseQuery` does **not** support `AbortSignal` cancellation, cannot be conditionally `enabled` (breaking lazy people pickers), and does not support `placeholderData` (breaking smooth Projects pagination). |

---

## Consequences

### Positive
- Eliminates duplicate network calls across sibling components (`AGENTS.md` §4); Dashboard executes exactly one `GET /dashboard` request (`ID-5`, `ID-18`).
- Strict `AppError` discriminated union guarantees exhaustive handling of all 12 `ID-19` failure modes in one testable pure module (`WI-5`), backed by `VERIFIED` `401`/route-`404`/`405`/`500`/web-`403` shapes and `DOCUMENTED` API `403`/`422` contracts.
- Authenticated `downloadBlob` handles Bearer-protected downloads cleanly (unauthenticated `401`/`500` `VERIFIED`; `200` stream `DOCUMENTED`) without leaking tokens into URLs or relying on unreadable `Content-Disposition` headers.
- Zero extra HTTP client dependency; native `fetch` pairs seamlessly with MSW 3 (`ADR-10`).

### Negative
- Requires every feature mutation to carefully list affected query keys for invalidation (mitigated by centralized query-key factories in `WI-5`).
- Developers must remember to pass TanStack Query's `signal` into every `queryFn` call (enforced by `queryOptions` definitions authored once in `WI-5`).
- Binary downloads buffer the file in memory via `Blob` until triggered; acceptable for <= 20 MB attachments (`#files-store`).

### Accepted Residual Risk
- **Team Member role visibility & `403` behaviour (`D6`):** Committed authenticated probes ran as Administrator and Project Manager only; Team Member access and authorization responses remain `UNVERIFIED` until Tier 1 acceptance testing.
- **Unverified query filters:** Certain Postman-only query parameters (`search`, `status`, `priority`, `sort` on `#projects-index` and `#tasks-index`; `page` on `#profile-tasks`) were not live-probed for runtime filtering behaviour and are guarded defensively in UI and tests.

### Backend Dependencies (`docs/research/security.md` §10, `ADR-13`)
- **`BR-6`:** Expose `Retry-After` (for `429` countdowns) and `Content-Disposition` (for download filenames) via `Access-Control-Expose-Headers`, and configure non-zero CORS `max_age`.
- **`BR-8`:** Enforce server-side upload size/type limits on all upload paths and `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` on `#files-download`.
- **`BR-10`:** Return `401` JSON without depending on `Accept` (defensive on backend; frontend still sends `Accept: application/json` on every JSON request).

---

## Sources

- `docs/api/plain.md` (WI-1 evidence-audited contract) — Authoritative contracts distinguishing `VERIFIED` probed shapes (`#dashboard-index`, `#projects-show` `200`, `#tasks-kanban` column keys, `#users-index` PM `200`, `#profile-tasks`, unauthenticated `#files-download` `401`/`500`) from `DOCUMENTED` / `UNVERIFIED` endpoints (`#tasks-update-status`, `#files-index`, `#files-download` `200`, `#profile-files`, `#notifications-index`, `#meetings-index`).
- https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults (TanStack Query 5.108.4, checked 2026-11-26) — `staleTime`, `gcTime`, retry defaults, `Infinity` vs `'static'`.
- https://tanstack.com/query/latest/docs/framework/react/guides/query-options (TanStack Query 5.108.4, checked 2026-11-26) — Type-safe `queryOptions` factories shared across hooks and cache calls.
- https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation (TanStack Query 5.108.4, checked 2026-11-26) — `AbortSignal` propagation and non-support in Suspense hooks.
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates (TanStack Query 5.108.4, checked 2026-11-26) — `onMutate` / `onError` / `onSettled` cache rollback recipe.
- https://tanstack.com/query/latest/docs/framework/react/guides/suspense (TanStack Query 5.108.4, checked 2026-11-26) — `useSuspenseQuery` constraints (`enabled`, `placeholderData`, error reset).
- https://tanstack.com/query/latest/docs/framework/react/guides/prefetching (TanStack Query 5.108.4, checked 2026-11-26) — `queryClient.query(...)` replacing deprecated `prefetchQuery`/`ensureQueryData`.
- https://react.dev/learn/you-might-not-need-an-effect (React 19.3.1 docs, checked 2026-11-26) — Race conditions in raw effect fetching and recommendation to use a client cache like TanStack Query.
- https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static (MDN current, checked 2026-11-26) — Native `AbortSignal.timeout()` for request timeouts.
- https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static (MDN current, checked 2026-11-26) — Composing caller `AbortSignal` with timeout signal without listener leaks.
- https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static (MDN current, checked 2026-11-26) — Authenticated `Blob` download handling and `URL.revokeObjectURL` cleanup.
