# ADR-05: API Layer, Data Fetching, Caching, Retry, and Timeout

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §4, §5, §8 (item 5: API and data-fetching architecture), Spec ID-6, ID-8, ID-18, ID-19, Decisions D5, D10

---

## Context

CollabSpace consumes an existing Laravel 13 REST API (`https://collabspace.huma-volve.com/api/v1`) whose authoritative contract and WI-1 D10 read-only Project Manager verification results are recorded in `docs/api/plain.md` (`HANDOFF.md` §4, `ID-6`, `ID-19`):

1. **Mandatory header (`docs/api/plain.md` — *Required Headers*, `VERIFIED`):** Every JSON request MUST include `Accept: application/json`; omitting it on a protected route without a valid token causes Laravel to return HTTP `500` (`"Route [login] not defined."`) instead of `401`. The sole exception is binary streaming on `GET /files/{file}/download` (`#files-download`).
2. **Six response envelope variants (`E1`–`E6`, `docs/api/plain.md` — *Response Envelope Variants*):**
   - `E1` Standard: `{ success: true, message: string, data: T }` (most endpoints).
   - `E2` No-`message`: `{ success: true, data: T }` or `{ success: true, data: T[], meta }` (`#dashboard-index`, `#users-index`, `#users-show`, `#audit-logs-index`, `#ai-settings-index` `VERIFIED`; `#ai-ask` `DOCUMENTED`).
   - `E3` `data: null`: `{ success: true, message: string, data: null }` (`#auth-logout` `VERIFIED`; `#auth-verify-reset-otp`, `#auth-reset-password`, `#profile-change-password`, and `DELETE` endpoints `DOCUMENTED`).
   - `E4` No-`data`: `{ success: true, message: string }` (`#users-destroy`, `DOCUMENTED`, out-of-scope MVP).
   - `E5` Bare object: `{ ... }` (`#broadcasting-auth`, `DOCUMENTED`, out-of-scope MVP).
   - `E6` Binary stream: raw bytes + `Content-Type: <mime>` + `Content-Disposition: attachment` (`#files-download`, `VERIFIED`).
   - **Error envelope (`CONFLICT` resolved):** Live server (`401`, `403`, `404`, `405`, `500` `VERIFIED`) and Postman `422` examples return `{ success: false, message: string, errors: null | Record<string, string[]> }`, while OpenAPI omits `success`. Parsers must treat `success` as optional (`{ success?: false, message?: string, errors?: Record<string, string[]> | null }`).
3. **Four pagination shapes (`P1`–`P4`, `VERIFIED`):** `P1` (`data: { data, links, meta }` on `#projects-index`, `#tasks-index`, `#teams-index`, `#meetings-index`, `#files-index`, `#profile-files`), `P2` (raw Laravel `LengthAwarePaginator` inside `data` on `#profile-tasks`), `P3` (`{ items, pagination: { current_page, per_page, total } }` integers on `#dashboard-index` blocks except `upcoming_meetings` which has `{ items }` only), and `P4` (sibling `meta` next to `data`, no `links`, optional `meta.unread_count` on `#users-index`, `#notifications-index`, `#audit-logs-index`). Default `per_page` is `15` on `P1`/`P2`.
4. **Four date/time formats (`VERIFIED`):** `YYYY-MM-DD`, `HH:MM:SS`, `ISO+offset` (`YYYY-MM-DDTHH:MM:SS+HH:MM`), and `ISO-Z` (`YYYY-MM-DDTHH:MM:SS.000000Z` on raw Eloquent models in `#profile-me` and `#profile-tasks`).
5. **D10 verified endpoint behaviours (`docs/api/plain.md` — *D10 Verification Summary*):**
   - `403` wire shape confirmed on `#projects-show`: `{ "success": false, "message": "This action is unauthorized.", "errors": null }`.
   - `download_url` (`#dashboard-index`, root-relative `/api/v1/files/{id}/download`) and `FileAttachmentResource.url` (`#files-index`, absolute) **both require Bearer auth** (`401` unauthenticated) and omit `Access-Control-Expose-Headers` (`#files-download`).
   - `GET /users` (`#users-index`) is accessible to Project Managers (`200 OK`), **honours `search`** (`meta.total` 127 -> 0), and has **no `per_page` cap up to at least `250`** (`per_page=100` and `per_page=250` both returned `200 OK`).
   - Kanban (`#tasks-kanban`) `columns` keys are exact Title-case `TaskStatus` values in exact order `["Pending", "In Progress", "In Review", "Completed"]`, every column is always present, and `columns[key].name` equals its Title-case key.
   - Tier 2 list shapes verified (`#notifications-index`, `#notifications-unread-count`, `#meetings-index`, `#files-index`, `#profile-files`).
6. **Strict data-fetching rules (`AGENTS.md` §4–§5, `ID-18`, `ID-19`):** One HTTP client, one service per domain, zero HTTP calls in components, request deduplication, `AbortSignal` cancellation, 12 distinct `AppError` kinds, bounded GET retries with zero retries on 4xx/mutations, and optimistic Kanban status changes with rollback.

---

## Decision

Adopt a **single native `fetch` HTTP client** (`src/shared/api/httpClient.ts`) returning a discriminated **`AppError`** union (with a dedicated authenticated binary `downloadBlob` helper), paired with **TanStack Query `5.108.4`** (`useQuery` default, `queryOptions` factories, `useMutation`), unified `P1`–`P4` pagination normalisation, and a single 4-format date module — all owned by `WI-5`.

### 1. Single native `fetch` HTTP client (`src/shared/api/httpClient.ts`)

- **Base URL, origin resolution & headers:** Reads `VITE_API_BASE_URL` (`https://collabspace.huma-volve.com/api/v1`) once and derives the trusted API origin (`https://collabspace.huma-volve.com`) so root-relative API paths (notably Dashboard `recent_files.items[].download_url` `/api/v1/files/{id}/download`) resolve cleanly without double-prepending `/api/v1`. Attaches `Accept: application/json` unconditionally on JSON requests; attaches `Authorization: Bearer <token>` from `src/shared/lib/session.ts` when authenticated; sets `Content-Type: application/json` for JSON bodies and lets the browser set the `multipart/form-data` boundary automatically for `FormData` uploads (`#profile-update`, `#files-store`).
- **Timeout + cancellation (`15_000 ms`):** Combines caller/TanStack Query `AbortSignal` with a `15_000 ms` timeout (`AbortSignal.timeout(15_000)` composed via `AbortSignal.any([callerSignal, timeoutSignal])`). Distinguishes caller cancellation (`kind: 'aborted'`, silently ignored) from elapsed timeout (`kind: 'timeout'`, distinct user message).
- **Envelope unwrapping (`E1`–`E4`):** Unwraps `{ success, message?, data? }` per each endpoint's verified contract in `docs/api/plain.md`:
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
  - **Verified `403` parsing (`#projects-show`):** Parses `{ success?: false, message?: string, errors?: null }` into `{ kind: 'forbidden', status: 403, message: parsed.message || 'You do not have permission to perform this action.' }` (live verified wire message: `"This action is unauthorized."`). Never clears session (`ADR-01`); mutations show a permission toast and roll back optimistic updates; page-level loads render an access-denied state (never an empty state).
  - **Verified `404` sanitization (`#projects-show`):** Live `404` bodies expose internal PHP model class names (`"No query results for model [App\\Models\\Project] <id>"`). `AppError` omits raw server text on `not_found` so UIs always render safe generic not-found states.
  - **Verified `422` parsing (`docs/api/plain.md` Global Conventions):** Normalizes `{ success?: false, message, errors }` (supporting Laravel dot-notation keys like `members.0.role_in_team` and `errors: null` edge cases) for `applyServerValidationErrors` (`ADR-08`).
- **401 hook:** Invokes the single `onUnauthorized` callback (`ADR-01`) unless the request explicitly opts out (`POST /auth/login` `#auth-login`, where `401` is a credential error).
- **429 `Retry-After` parsing:** Reads `Retry-After` (delta-seconds or HTTP-date) only when present and readable cross-origin; never invents a countdown when omitted or hidden by CORS (`BR-6`, `ADR-13`).
- **Authenticated binary file downloads (`downloadBlob`, `#files-download`, `#dashboard-index`, `#files-index`):**
  - Because D10 verified that `/api/v1/files/{id}/download` requires `Authorization: Bearer <token>` (returning `401` JSON unauthenticated) and omits `Access-Control-Expose-Headers` (making `Content-Disposition` unreadable cross-origin), `httpClient.ts` exposes a dedicated `downloadBlob(pathOrUrl, { fallbackFilename, signal })` method:
    1. Resolves root-relative `/api/v1/...` paths (`#dashboard-index` `recent_files.items[].download_url`) against the API origin (`https://collabspace.huma-volve.com`) and validates absolute URLs (`FileAttachmentResource.url`) through `src/shared/lib/safeUrl.ts` — rejecting any URL outside the configured API origin or `/api/v1/files/` path.
    2. Sends `GET` with `Authorization: Bearer <token>` (omitting `Accept: application/json` for binary `200` streaming, while inspecting `Content-Type` / JSON error payloads on non-2xx responses so `401`, `403`, `404`, and `5xx` normalize to `AppError` identically to JSON requests).
    3. Reads `response.blob()`, uses `fallbackFilename` from file metadata (`DashboardFileResource.name` / `FileAttachmentResource.name`) — falling back to `Content-Disposition` only if `BR-6` later exposes it — triggers a programmatic download via `URL.createObjectURL` + transient `<a download>`, and immediately calls `URL.revokeObjectURL`. Untrusted HTML/SVG bytes are never rendered inline (`BR-8`).

### 2. Pagination (`P1`–`P4`), `/users` Member Picker (`D5`), and Date modules (`src/shared/api/`)

- **`pagination.ts`:** Pure normalisers mapping all four verified shapes in `docs/api/plain.md` into one typed `PaginatedResult<T>` (`{ items: T[]; currentPage: number; lastPage: number; perPage: number; total: number }`):
  - `normalizeP1` (`data: { data, links, meta }`): `#projects-index`, `#tasks-index`, `#teams-index`, `#meetings-index`, `#files-index`, `#profile-files`.
  - `normalizeP2` (raw `LengthAwarePaginator` inside `data`): `#profile-tasks` (noting items are raw Eloquent `Task` models with `ISO-Z` dates, not `TaskResource`).
  - `normalizeP3` (`{ items, pagination: { current_page, per_page, total } }` integers): `#dashboard-index` blocks (`active_projects`, `tasks`, `teams`, `recent_files`, `recent_activity`), deriving `lastPage = Math.max(1, Math.ceil(total / Math.max(1, perPage)))`. (`upcoming_meetings` has `{ items }` only and is not passed through `normalizeP3`.)
  - `normalizeP4` (sibling `meta` next to `data`, no `links`): `#users-index` (`E2`, no `message`), `#audit-logs-index` (`E2`), and `#notifications-index` (`E1`, also returning `unreadCount: meta.unread_count`).
- **New Project member picker (`D5`, `M28`, `#users-index`):** D10 verified that `GET /users` returns `200 OK` for Project Managers (`P4` + `E2`), **honours server-side `search=`** (`meta.total` 127 -> 0), and imposes **no `per_page` cap up to at least `250`**. The picker requests `GET /users?per_page=20&search=<debouncedQuery>&page=<page>` on demand (`enabled: isOpen`, debounced ~250–300 ms, `placeholderData: keepPreviousData`), supports loading additional pages when `currentPage < lastPage`, and keeps a lightweight client-side substring filter over loaded items strictly as a defensive fallback if server search is ever degraded. Task assignees follow `D5` §1 (project `direct_members` from `#projects-overview` + team `members[]` from `#projects-teams-index`, deduplicated by `id`, loaded when the picker opens and filtered client-side).
- **`dates.ts`:** Single pure parser accepting all four verified formats (`YYYY-MM-DD`, `HH:MM:SS`, `ISO+offset`, and `ISO-Z` — including raw Eloquent `ISO-Z` `due_date`/`start_date`/`deadline` in `#profile-me` and `#profile-tasks`) plus deterministic display formatters and `YYYY-MM-DD` / `HH:MM:SS` API request serializers.

### 3. TanStack Query `5.108.4` policy & domain services

- **Per-domain services (`src/shared/api/services/*.service.ts`):** One file per Tier 1 domain (`auth`, `dashboard`, `projects`, `tasks`, `teams`, `users`, `profile`) defining each endpoint path once, typed DTOs derived strictly from `VERIFIED`/`DOCUMENTED` fields in `docs/api/plain.md`, deterministic query-key factories, and reusable `queryOptions(...)` definitions.
  - **`dashboard.service.ts` enum note (`#dashboard-index`):** `DashboardTaskResource` returns lowercase snake_case `status` (`"pending" | "in_progress" | "in_review" | "completed"`) and lowercase `priority` (`"low" | "medium" | "high" | "critical"`) alongside Title-case `status_label`, and `recent_files.items[].uploaded_by` is `{ id, name }` (unlike `FileAttachmentResource.uploaded_by: string` on `#files-index`). Types and UI mappers handle these verified differences explicitly.
  - **Tier 2 extensibility (`D10`-verified shapes in `docs/api/plain.md`):** When Tier 2 services are added (`notifications.service.ts`, `meetings.service.ts`, `files.service.ts`, `search.service.ts`), they reuse `normalizeP1`/`normalizeP4`, `downloadBlob`, and D10-verified shapes: `#notifications-index` (`P4` + object `data` contradicting OpenAPI array), `#meetings-index` (`P1` + polymorphic `summary.action_items` and `summary.assigned_tasks`), and `#files-index` / `#profile-files` (`P1` + `FileAttachmentResource`).
- **Default hook is `useQuery` (not `useSuspenseQuery`):** Required because Projects search/pagination needs `placeholderData: keepPreviousData`, People pickers need conditional `enabled: isOpen` (`D5`), Dashboard renders independent card states from one query (`ID-5`), and TanStack Query officially documents that `AbortSignal` cancellation does **not** work with `useSuspenseQuery`.
- **Caching & revalidation policy:**
  - Global default: `staleTime: 30_000` (30 s), `gcTime: 5 * 60_000` (5 min), `refetchOnWindowFocus: true`, `refetchOnReconnect: true`.
  - Session query `['auth', 'me']`: `staleTime: Infinity` (revalidated explicitly on profile/avatar mutation and cleared on logout/401).
  - No polling in Tier 1 (`ID-18`; notifications polling is Tier 2).
- **Retry policy (strictly bounded):**
  - **Queries (GET):** Custom `retry(failureCount, error)` allows **at most 2 retries** (`failureCount < 2`) with exponential backoff (`Math.min(1000 * 2 ** attempt, 8000)`) **ONLY** when `error.kind` is `'network'`, `'timeout'`, or `'server'` (5xx). **Zero retries** on all 4xx errors (`400`, `401`, `403`, `404`, `409`, `422`, `429`), `'aborted'`, and `'unexpected'`.
  - **Mutations:** `retry: 0` globally — never auto-resubmit state changes (`ID-19`).
- **Prefetching:** Where preloading is needed, use `queryClient.query(options)` (TanStack Query v5.108 deprecates `prefetchQuery` and `ensureQueryData`).
- **Kanban optimistic status update (`ID-5`, `ID-19`, `#tasks-kanban`, `#tasks-update-status`):** Implemented exclusively on `PATCH /tasks/{id}/status` using the documented TanStack Query rollback recipe on `['tasks', 'board', projectId]`. D10 verified `columns` keys and `columns[key].name` values are exact Title-case `TaskStatus` literals in fixed order `["Pending", "In Progress", "In Review", "Completed"]`, with every column always present even when `count: 0`:
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
- Strict `AppError` discriminated union guarantees exhaustive handling of all 12 `ID-19` failure modes in one testable pure module (`WI-5`), backed by D10-verified `401`/`403`/`404`/`405` shapes.
- Authenticated `downloadBlob` handles D10-verified Bearer-protected downloads cleanly without leaking tokens into URLs or relying on unreadable `Content-Disposition` headers.
- Zero extra HTTP client dependency; native `fetch` pairs seamlessly with MSW 3 (`ADR-10`).

### Negative
- Requires every feature mutation to carefully list affected query keys for invalidation (mitigated by centralized query-key factories in `WI-5`).
- Developers must remember to pass TanStack Query's `signal` into every `queryFn` call (enforced by `queryOptions` definitions authored once in `WI-5`).
- Binary downloads buffer the file in memory via `Blob` until triggered; acceptable for <= 20 MB attachments (`#files-store`).

### Accepted Residual Risk
- **Team Member role visibility & `403` behaviour (`D6`):** All D10 probes ran as Project Manager; Team Member access and authorization responses remain `UNVERIFIED` until Tier 1 acceptance testing.
- **Unverified query filters:** Certain Postman-only query parameters (`search`, `status`, `priority`, `sort` on `#projects-index` and `#tasks-index`; `page` on `#profile-tasks`) were not live-probed for runtime filtering behaviour and are guarded defensively in UI and tests.

### Backend Dependencies (`docs/research/security.md` §10, `ADR-13`)
- **`BR-6`:** Expose `Retry-After` (for `429` countdowns) and `Content-Disposition` (for download filenames) via `Access-Control-Expose-Headers`, and configure non-zero CORS `max_age`.
- **`BR-8`:** Enforce server-side upload size/type limits on all upload paths and `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` on `#files-download`.
- **`BR-10`:** Return `401` JSON without depending on `Accept` (defensive on backend; frontend still sends `Accept: application/json` on every JSON request).

---

## Sources

- `docs/api/plain.md` (WI-1 D10 verified 2026-11-26) — Authoritative verified contracts for Global Conventions (`E1`–`E6`, `P1`–`P4`, error envelopes, date formats), `#dashboard-index`, `#projects-show`, `#tasks-kanban`, `#tasks-update-status`, `#users-index`, `#files-index`, `#files-download`, `#profile-tasks`, `#profile-files`, `#notifications-index`, and `#meetings-index`.
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
