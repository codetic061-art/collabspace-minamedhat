# ADR-01: Authentication, Token Storage, and Session Behaviour

- **Status:** Proposed (awaiting user approval)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §1, §5, §8 (item 6: Authentication strategy), Spec ID-7, ID-20.1, ID-20.2, ID-21

---

## Context

CollabSpace consumes an existing, unmodifiable external Laravel 13 + Sanctum REST API (`https://collabspace.huma-volve.com/api/v1`, `HANDOFF.md` §4, `docs/api/plain.md`). Discovery and the WI-1 D10 read-only Project Manager verification session (`docs/api/plain.md` — *D10 Verification Summary*) established the following verified constraints:

1. **Auth contract (`docs/api/plain.md#auth-login`, `#auth-register`, `#profile-me`, `#auth-logout`, `#auth-reset-password`):**
   - `POST /auth/login` (`#auth-login`, `VERIFIED`) accepts `{ email, password, remember }` and returns `E1` `200 OK` `{ success: true, message, data: { user, token, token_type: "Bearer" } }` with **no expiry field and no refresh token**. `user.current_project` is absent here (present on `GET /auth/me`), `user.roles` is `string[]` (1 role name observed), and `user.permissions` is `[]` (item type `UNVERIFIED`).
   - `POST /auth/register` (`#auth-register`, `DOCUMENTED`) accepts only the four OpenAPI-validated fields `{ name, email, password, password_confirmation }` (resolving Postman's extra profile-field conflict) and returns the identical `E1` `201 Created` `{ user, token, token_type: "Bearer" }` shape with default system role `"Team Member"`.
   - `POST /auth/logout` (`#auth-logout`, `VERIFIED`) returns `E3` `200 OK` (`data: null`) and **immediately revokes** the active Sanctum token — confirmed in D10 when a subsequent `GET /auth/me` with the revoked token returned `401` (`"Unauthenticated. Please provide a valid Bearer token."`) for both Administrator and Project Manager sessions.
   - `POST /auth/reset-password` (`#auth-reset-password`, `DOCUMENTED`) revokes all of the user's Sanctum tokens across all devices.
2. **CORS configuration (`docs/api/plain.md` — *Global Conventions: CORS Behaviour*, `VERIFIED`):** The backend responds with `Access-Control-Allow-Origin: *`, **no** `Access-Control-Allow-Credentials`, **no** `Access-Control-Expose-Headers` (confirmed on `#profile-me` and `#files-download`), and `Access-Control-Max-Age: 0`. The API sets no cookies on `/api/v1/*` responses, and the frontend deploys to Vercel rather than a `huma-volve.com` subdomain.
3. **Verified D10 auth-scoped behaviours (`docs/api/plain.md`):**
   - **`401` vs `403` payloads:** `401` (`VERIFIED`) returns `{ "success": false, "message": "Unauthenticated. Please provide a valid Bearer token.", "errors": null }`. `403` (`VERIFIED` in D10 on `GET /projects/{non_visible_existing}`, `#projects-show`) returns `{ "success": false, "message": "This action is unauthorized.", "errors": null }`.
   - **Authenticated file downloads (`#dashboard-index`, `#files-download`, `#files-index`):** Dashboard `recent_files.items[].download_url` (`/api/v1/files/{id}/download`) and `FileAttachmentResource.url` (`https://collabspace.huma-volve.com/api/v1/files/{id}/download`) **both require `Authorization: Bearer <token>`** — unauthenticated `GET` returned `401` JSON, while Bearer `GET` returned `200` binary bytes without `Access-Control-Expose-Headers`.
   - **Role-scoped read access (`#users-index`, `#users-show`, `#ai-settings-index`, `#audit-logs-index`, `#reports-users`):** Despite Postman labelling `/users` "Admin only", Project Manager received `200 OK` on `GET /users` (all 127 users, `search` honoured, `per_page` uncapped up to at least `250`) and on `/users/{id}`, `/ai/settings`, `/audit-logs`, and `/reports/users/{id}`. Team Member behaviour remains **`UNVERIFIED` per `D6`**.
4. **Product and session requirements (`ID-7`, `ID-20.2`, `ID-21`):**
   - Sessions must survive a full page reload (Story 16) and restore via `GET /auth/me` (`#profile-me`).
   - "Remember Me" (`remember === true`) must persist the session across browser restarts on the user's device (Story 2); when unchecked, persistence ends with the browser session/tab.
   - Reloading a protected page must show a neutral loading shell with no flash of the sign-in page or protected UI (Story 90).
   - Explicit sign-out or any authenticated `401` must clear token and cached data in one place, broadcast to other tabs, and redirect to Sign in with a validated same-origin `redirectTo` path.
   - Password recovery (`Forgot Password -> Verify OTP -> Reset Password`) must keep `email` and `otp` out of URLs, logs, and persistent storage.
   - This decision directly selects the frontend framework (`ADR-02`, `ID-16`, `ID-20.1`).
5. **Backend unknowns (`docs/research/security.md` §10, `ADR-13`):** Sanctum tokens default to never expiring unless configured (`BR-2`); login/register throttling (`BR-3`), BFF trusted proxy support (`BR-4`), CORS origin allowlisting and `Retry-After`/`Content-Disposition` exposure (`BR-6`), password-change token revocation (`BR-9`, `#profile-change-password`), and missing-`Accept` `500` responses (`BR-10`) are outside frontend control.

---

## Decision

Adopt a **client-side session module** (`src/shared/lib/session.ts`) for a static React SPA (`ADR-02`) storing the Sanctum Bearer token in **memory + `sessionStorage` by default**, and in **`localStorage` ONLY when "Remember Me" (`remember === true`) is checked**, paired with all seven mandatory mitigations (`ID-20.1`, `security.md` §1.4).

### 1. Token storage rules

- **Single owner:** `src/shared/lib/session.ts` is the only module allowed to read, write, or clear the token. Components and feature hooks never touch `sessionStorage` or `localStorage` for auth tokens.
- **Default (`remember === false`):** Hold the token in a module-scoped memory variable and mirror it to `sessionStorage` so reloads restore cleanly while closing the tab/browser ends persistence.
- **Remember Me (`remember === true`):** Hold the token in memory and mirror it to `localStorage`. Writing to either store clears any key in the other store so only one storage slot is ever active.
- **No invented expiry timer:** Because `POST /auth/login` (`#auth-login`) and `POST /auth/register` (`#auth-register`) return no expiry timestamp (`A2`), the frontend invents no client-side expiration timer; any `401` is treated as session expiry or revocation.

### 2. All seven mandatory mitigations (`ID-20.1`, `security.md` §1.4)

Because Web Storage is accessible to JavaScript in the same origin, this decision holds **only** with all seven controls enforced across `WI-3`, `WI-5`, and `WI-6`:

1. **Strict header-based CSP (`ADR-12`):** Delivered via Vercel HTTP response headers (`vercel.json`): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://collabspace.huma-volve.com; img-src 'self' data: blob: https://collabspace.huma-volve.com; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests`. `script-src` strictly forbids `'unsafe-inline'`, `'unsafe-eval'`, `data:`, and third-party origins (`style-src 'unsafe-inline'` exists solely for Recharts runtime inline styles and dynamic progress widths, as documented in `ADR-12`). Rolled out as `Content-Security-Policy-Report-Only` on Preview first and promoted to enforcing `Content-Security-Policy` before Production.
2. **No third-party scripts:** Zero analytics, tag managers, or third-party runtime scripts on authenticated pages. The sole future exception is Cloudflare Turnstile (`https://challenges.cloudflare.com`) once `BR-5` is implemented (`ADR-13`).
3. **No `dangerouslySetInnerHTML` + safe URL validation:** `dangerouslySetInnerHTML` is banned via ESLint `no-restricted-syntax` (`ADR-11`). Every API-sourced URL (`avatar_url`, `meeting_link`, `download_url`, file `url`) passes `src/shared/lib/safeUrl.ts`, allowing only `https:` (and `mailto:` where intended, plus trusted API-origin `/api/v1/files/*` paths for authenticated Blob downloads); external links carry `rel="noopener noreferrer"`.
4. **Finite backend token lifetime (`BR-2`):** Logged as a required backend change (`ADR-13`) requesting finite lifetimes (shorter for `remember=false`, longer for `remember=true`) and scheduled pruning (`sanctum:prune-expired`).
5. **Deterministic clearing on logout, `401`, and password reset:** Clear memory, `sessionStorage`, `localStorage`, and `queryClient.clear()` on explicit logout (calling `POST /auth/logout` `#auth-logout` whose server-side revocation is D10-verified, and still clearing local state even if the network request fails), on any authenticated `401`, and after `POST /auth/reset-password` (`#auth-reset-password`), then broadcast `signed-out` to other tabs.
6. **Minimal, audited dependency tree (`ADR-11`):** One library per responsibility (`AGENTS.md` §6), exact pinned versions, committed lockfile, CI `npm ci`, `npm audit --audit-level=high`, `npm audit signatures`, and Dependabot security updates.
7. **Zero token, OTP, password, or email in URLs or logs:** Never place credentials, Bearer tokens, OTPs, or emails in URLs (including file download links), `console.*`, analytics, or error reports.

### 3. Session state machine and reload restore (`ID-20.2`)

- **States:** `unknown` | `authenticated` | `anonymous`.
- **Startup restore:** If neither `sessionStorage` nor `localStorage` holds a token on load, transition directly to `anonymous` with zero network requests. If a token is present, remain in `unknown` and execute `GET /auth/me` (`docs/api/plain.md#profile-me`, the sole startup request per `AGENTS.md` §4 and `ID-18`):
  - `200 OK`: populate `user` (with `current_project`), `stats`, `recent_activities`, `teams`, and `projects`, derive `role = user.roles[0]` (`ID-2`), seed `['auth', 'me']`, and transition to `authenticated`.
  - `401 Unauthorized`: clear token and cache, transition to `anonymous`.
  - Transient network/5xx error: preserve token and render a recoverable startup error with Retry rather than logging the user out silently.
- **No auth flash:** While `status === 'unknown'`, protected routes render a neutral loading shell (never protected content, never a premature sign-in flash). Public auth routes redirect to `/` only when `status === 'authenticated'`.
- **Sign-in & Sign-up sequence (`ID-7`, `#auth-login`, `#auth-register`, `#profile-me`):** Both `POST /auth/login` (`200 OK`, `VERIFIED`) and `POST /auth/register` (`201 Created`, `DOCUMENTED`) return `{ user, token, token_type: "Bearer" }` without `current_project`, `stats`, `teams`, or `projects`. In both flows, store `token` via `session.ts` (`remember` applies to sign-in; sign-up defaults to `sessionStorage`), then immediately fetch `GET /auth/me` (`#profile-me`) to populate the canonical profile/stats cache before transitioning to `authenticated` and navigating to validated `redirectTo` (default `/`).

### 4. Centralized `401` handler, `403` separation, loop guard, and `redirectTo`

- **Single `401` handler:** The HTTP client (`ADR-05`) invokes one registered `onUnauthorized` handler owned by the session layer on HTTP `401` (`{ "success": false, "message": "Unauthenticated. Please provide a valid Bearer token.", "errors": null }`).
- **Auth-endpoint exclusion:** `401` from `POST /auth/login` (`#auth-login`) is treated as invalid credentials and returned to the login form; it never triggers session-loss redirect (`ID-19`).
- **`403` never clears session:** Verified D10 `403` responses (`{ "success": false, "message": "This action is unauthorized.", "errors": null }`, `#projects-show`) indicate an authorization denial for a valid session; the user stays `authenticated`, mutations roll back optimistic state, and the UI shows a permission toast or access-denied state (`ADR-05`).
- **Loop guard & concurrent collapse:** A module-scoped guard collapses concurrent `401` responses from in-flight requests into a single clear + `queryClient.clear()` + `BroadcastChannel` `signed-out` event + single redirect to `/sign-in?redirectTo=<encodedPath>`. If the current route is already a public auth route, no redirect occurs.
- **Same-origin `redirectTo` validation:** `src/shared/lib/returnPath.ts` accepts only same-origin relative paths starting with a single `/` (rejecting `//`, scheme-prefixed URLs, and auth routes) and falls back to `/`.

### 5. Multi-tab consistency (`BroadcastChannel`)

- A same-origin `BroadcastChannel('collabspace-session')` emits `{ type: 'signed-in' }` and `{ type: 'signed-out' }` events only — **never the token** (`ID-20.2`, `security.md` §2).
- Receiving `signed-out`: clear local token state, call `queryClient.clear()`, transition to `anonymous`, and redirect protected screens to `/sign-in`.
- Receiving `signed-in`: check `localStorage` for a shared Remember Me token; if present, revalidate via `GET /auth/me` (`#profile-me`) and sync to `authenticated`; otherwise leave tab state untouched (preserving `sessionStorage` tab isolation).
- Feature-detect `BroadcastChannel` so environments lacking it degrade cleanly without throwing.

### 6. Password recovery, capability gating, and authenticated downloads

- **Recovery in memory only (`#auth-forgot-password`, `#auth-verify-reset-otp`, `#auth-reset-password`):** `Forgot Password -> Verify OTP -> Reset Password` passes `email` and `otp` solely via React Router in-memory location state (`navigate(..., { state })`). Navigating directly to `/verify-code` or `/reset-password` without state redirects to `/forgot-password`. Password recovery routes enforce `Referrer-Policy: no-referrer` (`ADR-12`).
- **Capability map (`D2`, `D6`, `ID-2`):** `src/shared/lib/capabilities.ts` gates UI affordances only (for example showing New Project / Edit Project / task mutations for `Administrator` and `Project Manager`, and hiding unverified/restricted actions per `D2`). Laravel enforces authorization on every request — D10 confirmed `GET /projects/{non_visible_existing}` (`#projects-show`) returns `403`, while `GET /users` (`#users-index`) returns `200` for Project Manager (enabling the `D5` New Project member picker). Team Member enforcement remains `UNVERIFIED` per `D6` and is a required Tier 1 acceptance test item.
- **Authenticated file downloads (`#dashboard-index`, `#files-download`, `#files-index`):** D10 confirmed that both Dashboard `recent_files.items[].download_url` (`/api/v1/files/{id}/download`) and `FileAttachmentResource.url` require `Authorization: Bearer <token>` and return `401` to unauthenticated browser navigation. Therefore, file downloads **must never** render raw `<a href>` links to `/api/v1/files/{id}/download` or pass Bearer tokens in query strings; every download uses `httpClient.downloadBlob(...)` (`ADR-05`) with `safeUrl.ts` API-origin validation, `Authorization: Bearer`, and filename sourced from file metadata `name` (`security.md` §7, `BR-6`, `BR-8`).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Next.js 16 App Router BFF (`__Host-Http-` encrypted cookie)** | Route Handlers proxy auth and every API call; Sanctum token lives server-side in an encrypted `HttpOnly; Secure; SameSite=Strict` cookie. | **Rejected for MVP.** Although OWASP and RFC 10017 prefer BFFs to prevent XSS token exfiltration, against this unmodifiable external Laravel API it causes major issues: (a) **breaks backend per-IP throttling (`BR-4`)** because Laravel observes Vercel's egress IP rather than client IPs unless the backend trusts our proxy headers; (b) requires managing server-side cookie encryption secrets, CSRF defenses (`SameSite=Strict` + `Origin`/`Sec-Fetch-Site` + custom header), and allowlisted proxy Route Handlers across every endpoint including multipart uploads and binary downloads; (c) introduces 3-layer cache coordination (Next.js server cache, client RSC cache, TanStack Query cache) and Server/Client boundary complexity across parallel agents in a 2-day MVP. |
| **2. In-memory token only (simpler client option)** | Keep the Bearer token exclusively in a JS variable with no Web Storage persistence. | **Rejected.** Without a refresh token or backend cookie session, every page reload signs the user out, failing Story 16, Story 2 ("Remember Me"), and `ID-7`. |
| **3. Always store in `localStorage`** | Persist all sessions in `localStorage` regardless of "Remember Me". | **Rejected.** Gives the widest at-rest exposure on shared machines even when "Remember Me" is unchecked (`security.md` §1.4). |
| **4. Sanctum SPA cookie auth** | Use `/sanctum/csrf-cookie` and first-party session cookies directly from the browser. | **Unavailable.** Requires same top-level domain (`huma-volve.com`), `statefulApi()`, and `Access-Control-Allow-Credentials: true`. Verified CORS returns `*` with no credentials (`docs/api/plain.md` Global Conventions, `security.md` §1.3). |

---

## Consequences

### Positive
- Matches the verified Laravel API contract (Bearer auth + stateless CORS + confirmed `#auth-logout` server revocation) directly with zero server runtime, zero session secret rotation, and zero proxy hops.
- Preserves true client IP addresses for Laravel's existing password-reset rate limits (10 req/min/IP) and future login throttling (`BR-3`), avoiding `BR-4`.
- Eliminates cookie-based CSRF risk on direct API calls because browsers never attach `Authorization: Bearer` headers automatically.
- Enables a clean Vite `8.4.0` + React `19.3.1` static SPA on Vercel (`ADR-02`, `ADR-12`).

### Negative
- Non-"Remember Me" sessions (`sessionStorage`) do not auto-authenticate newly opened tabs; users opening a second tab sign in again unless "Remember Me" was checked.
- Authenticated file downloads (`#files-download`) must buffer bytes through `fetch` + `Blob` rather than native browser link streaming because `<a href>` cannot send `Authorization: Bearer`.
- Browser CORS preflights remain uncached (`Access-Control-Max-Age: 0`) until the backend updates `config/cors.php` (`BR-6`).

### Accepted Residual Risk
- **XSS token exfiltration:** Per OWASP Session Management and RFC 10017 §8.5, malicious JavaScript executed via an XSS flaw in the app origin can read tokens from memory, `sessionStorage`, or `localStorage` until revoked or expired by Laravel. This residual risk is **explicitly accepted** for the MVP contingent on strict enforcement of all 7 mitigations above (`ADR-11`, `ADR-12`) and raising `BR-2` with the backend team.
- **Unverified Team Member role (`D6`):** Team Member auth and `403` behaviour remain unverified against the live API until Tier 1 acceptance testing.

### Backend Dependencies (`docs/research/security.md` §10, `ADR-13`)
- **`BR-2` (High):** Set and document finite Sanctum token lifetimes (`remember=false` vs `remember=true`) and prune expired tokens (`sanctum:prune-expired`).
- **`BR-4` (N/A — avoided by SPA):** Not required for direct SPA -> API calls; becomes mandatory only if migrating to a BFF in the future.
- **`BR-6` (Medium):** Allowlist frontend Vercel origins, set non-zero `max_age`, and expose `Retry-After` and `Content-Disposition` via `Access-Control-Expose-Headers`.
- **`BR-9` (Low):** Document whether `PUT /auth/password` (`#profile-change-password`) revokes other active tokens (and support signing out other devices per ASVS 7.4.3).
- **`BR-10` (Low):** Remove `X-Powered-By`, return `401` JSON regardless of `Accept`, and confirm registration enumeration policy.

---

## Sources

- `docs/api/plain.md` (WI-1 D10 verified 2026-11-26) — Verified contracts for `#auth-login`, `#auth-register`, `#profile-me`, `#auth-logout` (revocation confirmed), `#projects-show` (`403` shape), `#dashboard-index`, `#files-download` (Bearer required + no `Access-Control-Expose-Headers`), and `#users-index` (PM `200 OK`).
- https://www.rfc-editor.org/rfc/rfc10017.html (RFC 10017 / BCP 212, August 2026) — Browser storage threat analysis (§8), `sessionStorage` vs `localStorage` exposure (§8.5), XSS client hijacking (§5.1.4), and BFF IP rate-limit caveats (§6.1.3.5).
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — Web Storage XSS risk vs HttpOnly/BFF trade-offs and backend token invalidation.
- https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — Preferring `sessionStorage` over `localStorage` when persistence is unnecessary, and `rel="noopener noreferrer"`.
- https://github.com/OWASP/ASVS/blob/master/5.0/en/0x16-V7-Session-Management.md (OWASP ASVS 5.0, checked 2026-11-26) — Server-side token verification (7.2.1), finite session lifetimes (7.1.1, 7.3.x), and logout/password-change termination (7.4.1, 7.4.3).
- https://laravel.com/docs/13.x/sanctum (Laravel 13.x, checked 2026-11-26) — Sanctum non-expiring token defaults, `expiration`/`sanctum:prune-expired`, and SPA cookie-auth requirements.
- https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel (MDN current, checked 2026-11-26) — Same-origin cross-tab messaging without exposing tokens.
- https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event (MDN current, checked 2026-11-26) — `storage` event fires only for `localStorage`, motivating `BroadcastChannel` for `sessionStorage` sign-out sync.
- https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Request_Forgery_Prevention_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — Non-automatic `Authorization` headers avoid CSRF; never place tokens in URLs.
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — Excluding tokens, OTPs, passwords, and sensitive PII from logs.
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — Consistent recovery responses and not auto-signing in after reset.
