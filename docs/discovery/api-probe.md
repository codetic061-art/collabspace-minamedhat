# CollabSpace backend API probe

- **Target:** `https://collabspace.huma-volve.com`
- **Probe date:** 2026-11-26 (per server `Date` header), from a Windows PowerShell 5.1 client using `System.Net.Http.HttpClient` with redirects and cookies disabled, so raw status codes and `Set-Cookie` headers are visible.
- **Scope:** read-only. Only GET, HEAD, and OPTIONS were sent, 41 requests in total. No login, no registration, no credentials or tokens were sent, and nothing from the collection's credential fields was used.
- **Source for routes:** `CollabSpace AI - API Collection.postman_collection (1).json` (read only, not modified).

## Postman collection summary

- Every request uses `{{base_url}}/api/v1/...`. The collection does **not** define `base_url` itself. The only collection variable is `bearer_token_0b1z` (value redacted). It is resolved here as `https://collabspace.huma-volve.com`, which matches the host named in the collection's avatar URL example.
- Route prefix: `/api/v1`. Modules: auth, profile, teams, projects, tasks/kanban, meetings + AI summaries, files, project chat, notifications, dashboard + AI assistant, reports, user admin, AI settings, audit logs.
- Protected requests use Postman `bearer` auth. The descriptions say `Requires Bearer {{token}} (auth:sanctum)` and the logout description says it deletes the current token "from the database". Both point to Sanctum personal access tokens.
- The collection descriptions contain plaintext demo login credentials. The collection variable `bearer_token_0b1z` exists but is empty (verified), so no token is stored. They were not used and are not reproduced here. Hygiene note: treat that file as sensitive.
- Real-time hint: the "Send Message" description says it "broadcasts via WebSockets (`Laravel Reverb`) to `private-projects.{id}` channel". No Reverb host, port, app key, or scheme appears anywhere in the collection.

## Request log

Cookie values are redacted. Headers common to almost every response are omitted from the table: `Server: Apache`, `X-Powered-By: PHP/8.3.37`, `Cache-Control: no-cache, private`. "JSON accept" means `Accept: application/json`.

| # | Method | URL (path on target) | Key request headers | Status | Key response headers | Body snippet |
|---|---|---|---|---|---|---|
| 1 | GET | `/` | none | 200 | `Content-Type: text/html`; `Set-Cookie: XSRF-TOKEN=<redacted>; Max-Age=7200; path=/; secure; samesite=lax`; `Set-Cookie: collabspace-session=<redacted>; Max-Age=7200; path=/; secure; httponly; samesite=lax` | Laravel welcome page (`<title>collabspace</title>`, links to laravel.com docs and `laravel/framework/blob/13.x/CHANGELOG.md`). Contains an inline Laravel Boost script posting to `/_boost/browser-logs`. |
| 2 | HEAD | `/` | none | 200 | same cookies as #1, `text/html` | (empty) |
| 3 | GET | `/api` | JSON accept | 404 | `application/json` (no ACAO) | `{"success":false,"message":"The route api could not be found.","errors":null}` |
| 4 | GET | `/api/v1` | JSON accept | 404 | `application/json`, `Access-Control-Allow-Origin: *` | `{"success":false,"message":"The route api\/v1 could not be found.","errors":null}` |
| 5 | GET | `/api/v1/auth/me` | JSON accept | 401 | `application/json`, `ACAO: *` | `{"success":false,"message":"Unauthenticated. Please provide a valid Bearer token.","errors":null}` |
| 6 | GET | `/api/v1/projects?page=1&per_page=15&sort=newest` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 7 | GET | `/api/v1/dashboard` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 8 | GET | `/api/v1/notifications?per_page=15` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 9 | GET | `/api/v1/teams?page=1&per_page=15` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 10 | GET | `/api/v1/team-roles` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 11 | GET | `/api/v1/tasks?per_page=15` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 12 | GET | `/api/v1/this-route-does-not-exist` | JSON accept | 404 | `application/json`, `ACAO: *` | `{"success":false,"message":"The route api\/v1\/this-route-does-not-exist could not be found.","errors":null}` |
| 13 | GET | `/api/v1/projects` | `Accept: text/html` | **500** | `application/json`, `ACAO: *`, `Connection: close` | `{"success":false,"message":"Route [login] not defined.","errors":null}` |
| 14 | GET | `/api/v1/auth/me` | JSON accept, `Origin: http://localhost:3000` | 401 | `ACAO: *` (no `Access-Control-Allow-Credentials`, no `Access-Control-Expose-Headers`) | same as #5 |
| 15 | OPTIONS | `/api/v1/projects` | `Origin: http://localhost:3000`, `ACR-Method: GET`, `ACR-Headers: authorization,content-type` | 204 | `ACAO: *`; `Access-Control-Allow-Methods: GET`; `Access-Control-Allow-Headers: authorization,content-type`; `Access-Control-Max-Age: 0`; `Vary: Access-Control-Request-Method, Access-Control-Request-Headers` | (empty) |
| 16 | OPTIONS | `/api/v1/auth/login` | `Origin: http://localhost:3000`, `ACR-Method: POST`, same ACR-Headers | 204 | `ACAO: *`; `Allow-Methods: POST`; `Allow-Headers: authorization,content-type`; `Max-Age: 0`; same `Vary` | (empty) |
| 17 | OPTIONS | `/api/v1/projects` | `Origin: https://collab-space-next-team-kappa.vercel.app`, `ACR-Method: GET`, same ACR-Headers | 204 | identical to #15 | (empty) |
| 18 | OPTIONS | `/api/v1/auth/login` | `Origin: https://collab-space-next-team-kappa.vercel.app`, `ACR-Method: POST`, same ACR-Headers | 204 | identical to #16 | (empty) |
| 19 | OPTIONS | `/api/v1/projects` | `Origin: http://localhost:5173`, `ACR-Method: GET`, same ACR-Headers | 204 | identical to #15 | (empty) |
| 20 | OPTIONS | `/api/v1/auth/login` | `Origin: http://localhost:5173`, `ACR-Method: POST`, same ACR-Headers | 204 | identical to #16 | (empty) |
| 21 | GET | `/docs` | none | 301 | `Location: https://collabspace.huma-volve.com/docs/` (Apache) | Apache "Moved Permanently" |
| 22 | GET | `/api/documentation` | none | 404 | `application/json`, `ACAO: *` | `{"success":false,"message":"The route api\/documentation could not be found.","errors":null}` |
| 23 | GET | `/swagger` | none | **200** | `text/html`; session + XSRF cookies as #1 | `<title>CollabSpace AI API - Swagger UI</title>`, loads `swagger-ui-dist@5` from unpkg with `url: '/docs/api.json'`; also includes the Boost browser-logger script |
| 24 | GET | `/openapi.json` | none | 404 | `text/html` | Laravel HTML "Not Found" page |
| 25 | GET | `/api/docs` | none | 404 | `application/json`, `ACAO: *` | `{"success":false,"message":"The route api\/docs could not be found.","errors":null}` |
| 26 | GET | `/telescope` | none | 404 | `text/html` | Laravel HTML "Not Found" page |
| 27 | GET | `/up` | none | 200 | `text/html` | Laravel health page (`<title>collabspace</title>`, Figtree font) |
| 28 | GET | `/health` | none | 404 | `text/html` | Laravel HTML "Not Found" page |
| 29 | GET | `/broadcasting/auth` | JSON accept | 403 | `application/json`; `Set-Cookie: collabspace-session=<redacted>; ... secure; httponly; samesite=lax` (no ACAO) | `{"success":false,"message":"You do not have permission to perform this action.","errors":null}` |
| 30 | GET | `/api/broadcasting/auth` | JSON accept | 404 | `application/json`, `ACAO: *` | `{"success":false,"message":"The route api\/broadcasting\/auth could not be found.","errors":null}` |
| 31 | GET | `/sanctum/csrf-cookie` | JSON accept | 204 | `ACAO: *`; XSRF + session cookies as #1 | (empty) |
| 32 | GET | `/api/v1/auth/social/google/redirect` | JSON accept | 200 | `application/json`, `ACAO: *` | `{"success":true,"message":"Redirect URL for google generated successfully.","data":{"provider":"google","authorization_url":"https://accounts.google.com/o/oauth2/auth?redirect_uri=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Fv1%2Fauth%2Fsocial%2Fgoogle%2Fcallback&scope=openid+profile+email&response_type=code"}}` |
| 33 | GET | `/` | none | 200 | as #1 | (re-read full body to search for Reverb/Echo/Vite hints: none found) |
| 34 | GET | `/swagger` | none | 200 | as #23 | (re-read full body: spec URL is `/docs/api.json`) |
| 35 | GET | `/docs/` | none | 301 | `Location: https://collabspace.huma-volve.com/public/docs` | Apache "Moved Permanently" |
| 36 | GET | `/docs/` | none | 301 | same as #35 | (repeat to read `Location`) |
| 37 | GET | `/docs/api.json` | JSON accept | **200** | `application/json`, **no** `ACAO` | OpenAPI 3.1.2 document, 435,866 bytes, `info.title: "CollabSpace AI API"`, `version: 0.0.1` |
| 38 | GET | `/api/v1/broadcasting/auth` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 39 | GET | `/api/v1/auth/login` | JSON accept | 405 | `application/json`, `ACAO: *` | `{"success":false,"message":"The GET method is not supported for route api\/v1\/auth\/login. Supported methods: POST.","errors":null}` |
| 40 | GET | `/api/v1/search?q=test` | JSON accept | 401 | `application/json`, `ACAO: *` | same as #5 |
| 41 | GET | `/docs/api.json` | none | 200 | `application/json` | (re-read to inspect `components.responses`, login response schema, and the broadcasting route) |

No response, on any route, carried `X-RateLimit-Limit`, `X-RateLimit-Remaining`, or `Retry-After`.

## OpenAPI spec (`/docs/api.json`)

- OpenAPI 3.1.2, `servers: [https://collabspace.huma-volve.com/api]`, so spec paths start at `/v1/...`.
- `components.securitySchemes`: one scheme named `http`, `type: http, scheme: bearer`, applied globally.
- 65 paths, 92 operations, 61 component schemas. Shared error responses: `ValidationException`, `AuthenticationException`, `AuthorizationException`, `ModelNotFoundException`.
- The shape (server URL ending in `/api`, a scheme named `http`, those four exception responses) matches the output of the Scramble generator for Laravel. That is an inference from the shape. The spec does not name its generator.
- Login 200 schema: `{ success, message: "Logged in successfully.", data: { user: UserResource, token: string, token_type: "Bearer" } }`.
- Success envelope on list and detail routes: `{ success, message, data }`.
- The spec lists routes the collection does not: `GET /v1/activities`, `GET /v1/search`, meeting `comments` and `notes` CRUD, `POST /v1/projects/{project}/messages/read`, `GET /v1/broadcasting/auth`, and `GET /v1/auth/social/{provider}/callback`. The collection lists routes the spec does not, or lists them differently: `GET /v1/reports/users` without an id, and `POST` (collection) vs. `GET` (spec) for the social callback. Message edit is `PATCH` in the collection and `PUT` in the spec. These differences need resolving before any client code is generated.
- The spec's error schemas list only `message` (plus `errors` for validation). The live responses always use the envelope `{success:false, message, errors}`, so the spec under-describes the error body.

## Findings

### Backend framework

Laravel on PHP 8.3.37 behind Apache. The evidence:

- `XSRF-TOKEN` and `<app>-session` cookies, encrypted in Laravel's `eyJpdiI6...` format.
- The Laravel welcome page at `/`, which links the `13.x` framework changelog, so the app was likely created on Laravel 13.
- Laravel's `/up` health route and `/sanctum/csrf-cookie`.
- Laravel's default route-not-found messages ("The route ... could not be found.", "Route [login] not defined.") inside a custom JSON envelope.
- Laravel Boost's browser-log script injected into HTML pages.

The Reverb mention in the collection is also consistent with Laravel.

### Auth style

**Bearer token, Sanctum personal access tokens.** The evidence:

- Every protected `/api/v1` route answers 401 with "Please provide a valid Bearer token."
- The spec's only security scheme is HTTP bearer.
- Login returns `data.token` with `token_type: "Bearer"`.
- The collection says `auth:sanctum` and describes token deletion on logout.
- `/api/v1` responses set **no cookies**, so the API is stateless.

`/sanctum/csrf-cookie` exists and returns 204 with cookies, because Sanctum registers it by default. Cookie-based SPA auth is still not usable cross-origin, because CORS does not allow credentials (see CORS below). Token storage in the browser is a decision for the auth ADR.

Cookie attributes, seen only on web routes (`/`, `/swagger`, `/sanctum/csrf-cookie`, `/broadcasting/auth`):

- `XSRF-TOKEN`: `secure; samesite=lax; path=/`, not HttpOnly, no `Domain` (host-only), `Max-Age=7200`.
- `collabspace-session`: `secure; httponly; samesite=lax; path=/`, no `Domain`, `Max-Age=7200`.

### Unauthenticated and error shape

Every JSON error uses one envelope:

```json
{ "success": false, "message": "<human-readable text>", "errors": null }
```

`errors` is `null` for 401, 403, 404, 405, and 500. For 422 it is a field map, `{ "<field>": ["<message>", ...] }`, as shown in the collection's saved examples (for example `members.0.role_in_team`). Status codes observed:

- **401**: missing token on a protected route. Every collection route sampled returned 401, so those routes exist.
- **404**: unknown route.
- **405**: wrong method.
- **403**: the web `/broadcasting/auth` route without a session.

Important: when `Accept: application/json` is missing, a protected route returns **500 "Route [login] not defined."** instead of 401. The backend tries to redirect to a `login` web route that does not exist. The HTTP client must always send `Accept: application/json`.

### CORS verdict per origin

All three origins received identical answers on the GET route (`/api/v1/projects`) and the POST route (`/api/v1/auth/login`): `Access-Control-Allow-Origin: *`, the requested method and headers echoed back (`authorization,content-type`), `Access-Control-Max-Age: 0`, and no `Access-Control-Allow-Credentials`.

| Origin | Direct browser call with `Authorization: Bearer` | Cookie or credentialed call (`credentials: 'include'`) |
|---|---|---|
| `http://localhost:3000` | Allowed | Blocked (wildcard origin with no `Allow-Credentials`) |
| `https://collab-space-next-team-kappa.vercel.app` | Allowed | Blocked |
| `http://localhost:5173` | Allowed | Blocked |

Verdict: a browser app can call `/api/v1` directly with a bearer header from any origin, so a proxy is not required for CORS. Consequences:

- `Max-Age: 0` means the browser sends a preflight before every request that carries `Authorization` or a JSON `Content-Type`. That roughly doubles round trips for authenticated calls. A same-origin proxy or server-side fetching (for example Next.js route handlers or Server Components) would avoid the preflights. That trade-off belongs in the data-fetching ADR.
- No `Access-Control-Expose-Headers` was seen. Browser JavaScript can then read only CORS-safelisted response headers. For example, `Content-Disposition` on `/files/{id}/download` would not be readable cross-origin. This is unverified, because the download route was not called.
- `/docs/api.json` sends no ACAO header, so browsers cannot fetch it cross-origin. Fetching it at build time or from the CLI for type generation works.

### Docs availability

- **Swagger UI:** `https://collabspace.huma-volve.com/swagger` (200).
- **OpenAPI 3.1.2 JSON:** `https://collabspace.huma-volve.com/docs/api.json` (200, public, about 436 KB). This is a usable contract for generating types, subject to the collection/spec differences listed above.
- `/docs` redirects to `/docs/`, which redirects to `/public/docs` (not followed further).
- 404: `/api/documentation`, `/api/docs`, `/openapi.json`, `/telescope`, `/health`.
- 200: `/up` (Laravel health page).

### Real-time evidence

- The collection says chat messages broadcast through **Laravel Reverb** on the private channel `private-projects.{id}`. No other channel names or event names were found.
- `GET /api/v1/broadcasting/auth` returns **401** "Please provide a valid Bearer token". The spec lists it as `broadcast.authenticate`. This is the token-authenticated channel-auth endpoint a browser Echo or Pusher client would use, normally with POST (not tested). The web-group `/broadcasting/auth` also exists and returns 403 without a session.
- No Reverb or Pusher host, port, scheme, or app key appeared in any response body (`/`, `/swagger`), in the spec, or in the collection. The frontend needs these values from the backend team.

### Rate limiting

No `X-RateLimit-*` headers appeared on any response. That includes public routes (`/api/v1/auth/social/google/redirect`, 404s, 405s). Either the API has no throttle middleware, or throttling applies only to routes that were not exercised (for example the POST auth routes). The 429 response shape is unknown.

### Other observations

- **Google social login is misconfigured.** The generated `authorization_url` has `redirect_uri=http://127.0.0.1:8000/api/v1/auth/social/google/callback` and no visible `client_id`. Google sign-in should be treated as broken until the backend fixes it.
- **Laravel Boost runs in production.** Its browser-log script posts page errors to `/_boost/browser-logs`. Boost is development tooling. Report this to the backend team; it does not block the frontend.

## Unknowns

1. Reverb or Pusher connection settings (host, port, TLS, app key) and the full list of channels and events (notifications, task updates, meeting events).
2. Token lifetime and expiry behavior. The collection says `remember` "extends token lifespan". Nothing shows whether expired tokens get a distinct 401 message or whether a refresh endpoint exists (none is listed).
3. Rate limits and the 429 body shape.
4. Whether `Access-Control-Expose-Headers` is configured, which matters for reading download filenames in the browser.
5. Which source is authoritative when the Postman collection and the OpenAPI spec disagree, for example the social callback method, message edit method, and `reports/users`.
6. Pagination envelope details inside `data` (meta and links). The spec has them, but they were not inspected in detail here.
7. Exact Laravel version. The welcome page points to 13.x, but no response header confirms it.
8. Behavior of authenticated routes, which could not be tested without credentials by design: 403 role responses, empty collections, and real payloads.
