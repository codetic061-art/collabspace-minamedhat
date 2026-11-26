# CollabSpace security research

- **Status:** research input for the auth/token-storage ADR and the other AGENTS.md §8 ADRs. **This is not an ADR.** Every item tagged **PROPOSAL — requires ADR** is open until an ADR records it and the user reviews it.
- **Date checked:** 2026-11-26 for every source (see [Sources](#sources)).
- **Scope:** documentation only. No backend request was sent for this document. Backend facts come only from `docs/discovery/` (`HANDOFF.md`, `api-probe.md`, `api-inventory.md`) and `docs/spec/mvp-spec.md` (ID-7).
- **Version matching (AGENTS.md §1.3):** the repo has no `package.json` yet, so no frontend version is installed. Frontend sources were checked against the current published docs: React 19 (react.dev), Next.js 16.x (the `proxy.ts` convention is v16.0.0+, [S35]), current Vite docs, npm CLI v11. The backend docs are Laravel 13.x, matching the probe's Laravel 13 inference (exact minor version unverified). ASVS is 5.0. The IETF browser-apps draft is now **RFC 10017 (BCP 212, August 2026)** [S3]. Re-check each frontend citation once the dependencies ADR fixes versions.

**Tags used**

| Tag | Meaning |
|---|---|
| **VERIFIED (backend, from discovery)** | Observed in the discovery probes or stated in the Postman collection, as recorded in `docs/discovery/` |
| **OFFICIAL GUIDANCE** | Stated by an official source in [Sources](#sources) |
| **PROPOSAL — requires ADR** | A recommendation for CollabSpace. Not decided. |
| **BACKEND REQUIREMENT** | Something only the existing Laravel team can do. Listed again in §9 and §10. |

---

## 1. Token storage

### 1.1 Facts that constrain the choice

- **VERIFIED (backend, from discovery):** `POST /auth/login` returns `{user, token, token_type: "Bearer"}` with no expiry field and no refresh token. `remember` "extends token lifespan" (Postman text, effect unverified). `/api/v1` responses set no cookies. CORS answers `Access-Control-Allow-Origin: *` with no `Access-Control-Allow-Credentials` and no `Access-Control-Expose-Headers`, and `Access-Control-Max-Age: 0` (a preflight before every authenticated call). `/sanctum/csrf-cookie` exists (Sanctum default). Source: `api-probe.md`.
- **VERIFIED (backend, from discovery):** the earlier reference site kept the token in an Auth.js server session (HttpOnly cookie) and never exposed the backend URL to the browser (`reference-site.md` lines 29, 43, 216). That is a working BFF precedent against this same API.
- **OFFICIAL GUIDANCE:** Sanctum API tokens "typically have a very long expiration time (years)" and by default "never expire" until revoked; expiry is set by the backend's `expiration` config or per token in `createToken` [S4]. Any token the browser can read stays useful to a thief until the backend revokes or expires it.
- **OFFICIAL GUIDANCE:** RFC 10017 is written for OAuth clients, and CollabSpace has no OAuth server. Its storage analysis (§8) and its BFF cookie, CSRF and proxy rules (§6.1.3) apply directly, because the threat is the same: JavaScript running in the app's origin [S3].

### 1.2 Options compared

| | (a) In memory only | (b) `sessionStorage` | (c) `localStorage` | (d) BFF: server holds the token, browser holds an HttpOnly cookie | (e) Sanctum SPA cookie auth |
|---|---|---|---|---|---|
| **Token readable by XSS** | Yes while the page runs. Closures can be bypassed by prototype poisoning (RFC 10017 §8.4) | Yes. A single XSS reads it [S1][S2] | Yes. A single XSS reads it [S1][S2] | **No.** The cookie is HttpOnly and the token never reaches JS. XSS can still send requests through the user's browser while the page is open ("client hijacking", RFC 10017 §5.1.4, §7.1.1) | No (session cookie, HttpOnly) |
| **At rest on disk** | No | Possibly, unencrypted [S2] | Yes, unencrypted, persistent [S2][S3 §8.6] | Cookie only. RFC says encrypt the cookie if it holds the token [S3 §6.1.3.2] | Session cookie only |
| **Survives reload** | **No.** No refresh token exists, so every reload means signing in again. This breaks ID-7 session restore | Yes, same tab | Yes | Yes | Yes |
| **Shared across tabs** | No | **No.** Each new tab is signed out [S2] | Yes. The `storage` event can sync tabs [S46] | Yes (cookie) | Yes |
| **CSRF exposure** | None. `Authorization` is not attached automatically | None | None | **Yes.** BFF MUST defend CSRF [S3 §6.1.3.3] | Yes. Laravel CSRF via XSRF-TOKEN [S4] |
| **"Remember me"** | Impossible | Tab-lifetime only | Yes | Yes: persistent vs session cookie, plus backend token lifetime | Yes (backend session) |
| **Complexity** | Lowest | Low | Low | Medium: login/logout/session route handlers, a proxy with an upstream allowlist, cookie encryption, CSRF checks, error mapping | Low on the frontend, but needs backend and DNS changes |
| **Deployment needs** | Static hosting | Static hosting | Static hosting | A server runtime (for example Next.js Route Handlers on Node). A Vite SPA would need a separate server, which is an extra dependency and an ADR | Same registrable domain as the API |
| **Other effects** | None | None | None | Removes the browser's CORS preflights (`Max-Age: 0`). **The API sees the BFF's IP**, so per-IP throttling and Turnstile `remoteip` break unless the backend trusts the BFF's forwarded IP [S3 §6.1.3.5][S15] | None |

- **OFFICIAL GUIDANCE:** OWASP: "Do not store authentication tokens, session IDs, JWTs, refresh tokens, or any credential in localStorage or sessionStorage … Use HttpOnly; Secure; SameSite=Strict cookies (preferred) or a Backend-for-Frontend (BFF) pattern" [S2]. OWASP HTML5: prefer `sessionStorage` over `localStorage` when persistence isn't needed, and don't store session identifiers in local storage [S1].
- **OFFICIAL GUIDANCE:** RFC 10017 §8.5: none of the browser storage options "can fully mitigate token exfiltration when the attacker can execute malicious code". `sessionStorage` "slightly reduces the exposure" compared with `localStorage` [S3].

### 1.3 Why option (e), Sanctum SPA cookie auth, is likely unavailable

- **OFFICIAL GUIDANCE:** it requires (1) the SPA and API to "share the same top-level domain" (subdomains allowed), (2) the SPA domain in Sanctum's `stateful` list plus `statefulApi()` middleware, (3) CORS `supports_credentials = true` so the response carries `Access-Control-Allow-Credentials: true`, (4) a session cookie `domain` covering the subdomains, and (5) `withCredentials` and `withXSRFToken` on the client [S4].
- **VERIFIED (backend, from discovery):** CORS sends `*` without `Allow-Credentials`, so browsers block credentialed calls. `/api/v1` sets no cookies. The API lives on `huma-volve.com`. The frontend's host is undecided; the reference site ran on `vercel.app`. A wildcard origin also can't be combined with credentials [S48].
- **Conclusion:** (e) needs the frontend on a `huma-volve.com` subdomain plus backend CORS, Sanctum and session changes. Treat it as unavailable unless the backend team offers all of that.

### 1.4 Recommendation

**PROPOSAL — requires ADR (primary): a BFF (option d)**, if the framework ADR picks Next.js App Router.
- Login, logout and session-check Route Handlers call Laravel from the server. The Sanctum token is stored only server-side or inside an encrypted cookie.
- The cookie follows RFC 10017 §6.1.3.2 [S3] and ASVS 3.3 [S9]:
  - MUST: `Secure` and `HttpOnly`.
  - SHOULD: `SameSite=Strict`, `Path=/`, no `Domain`, and the `__Host-Http-` prefix [S39].
  - It is persistent only when "Remember me" is checked. Otherwise it is a session cookie, and the server still enforces expiry [S2].
- A server-only data layer calls Laravel. A thin proxy forwards only allowlisted method+path pairs to the fixed API host (RFC 10017 §6.1.3.6 MUST) [S3]. Mark the token and API modules with `server-only` [S33].
- CSRF defence on every state-changing BFF route (see §5.4).
- Trade-off accepted: the BFF does not make XSS harmless. It stops token theft only. XSS prevention (§5) stays the main control.
- Dependency: the backend must keep per-IP throttling meaningful behind the BFF (BR-4).

**PROPOSAL — requires ADR (fallback if a BFF is rejected, for example if a Vite SPA is chosen):** keep the token in memory at runtime and persist it in `sessionStorage` by default. Write to `localStorage` only when the user checks "Remember me". One session module owns all reads and writes. This keeps reload restore (ID-7) and "Remember me" (story 2). The cost is accepting the XSS exfiltration risk that OWASP warns against. The fallback is acceptable only with all of these mitigations:
1. A strict CSP with no `'unsafe-inline'` scripts, `object-src 'none'` and `base-uri` (§5.2).
2. No third-party scripts except an approved bot-protection widget. No analytics or tag managers in authenticated pages.
3. No `dangerouslySetInnerHTML`, and URL scheme validation (§5.1).
4. A short, finite backend token lifetime (BR-2). The frontend cannot shorten a Sanctum token's life.
5. Clear the token on logout, on any 401 and after a password reset, then broadcast to other tabs (§2).
6. A minimal, audited dependency tree (§8).
7. The token never goes into URLs, logs, analytics or error reports (§6).

- **Rejected:** in memory only (a), because it fails ID-7 reload restore when there is no refresh token. `localStorage` for every session (c), because it gives the widest exposure with no benefit when "Remember me" is unchecked. Sanctum SPA (e), because of §1.3.

---

## 2. Session behaviour

- **Expiration.**
  - **VERIFIED (backend, from discovery):** no expiry in the login response, and the real lifetime is unknown.
  - **OFFICIAL GUIDANCE:** the lifetime is backend-controlled through Sanctum `expiration` (minutes) or per-token `createToken(..., expiresAt)`. Prune with `sanctum:prune-expired` [S4]. ASVS 7.1.1, 7.3.1 and 7.3.2 require a documented inactivity timeout and absolute lifetime (L2) [S8].
  - **BACKEND REQUIREMENT (BR-2):** set and document finite lifetimes, one for `remember=false` and a longer one for `remember=true`.
  - **PROPOSAL — requires ADR:** the frontend invents no timer (ID-7) and treats any 401 as expiry, handled in one place.
- **Logout and revocation.**
  - **VERIFIED (backend, from discovery):** `POST /auth/logout` revokes the current token.
  - **OFFICIAL GUIDANCE:** after logout or expiry, the session must be unusable on the backend (ASVS 7.4.1) [S8]. Deleting a cookie alone does not invalidate a stolen copy [S2].
  - **PROPOSAL — requires ADR:** call logout, then always clear local state, cached data and the cookie, whether the call succeeds or fails (A12.9). With a BFF, the logout route revokes the token server-side and expires the cookie.
- **Password reset.**
  - **VERIFIED (backend, from discovery):** `reset-password` revokes all of the user's tokens.
  - **OFFICIAL GUIDANCE:** don't sign the user in automatically after a reset [S52]. ASVS 7.4.3 offers ending other sessions after any credential change [S8].
  - **PROPOSAL — requires ADR:** after a reset, clear any stored session and send the user to Sign in. Other devices get a 401 on their next call.
  - **BACKEND REQUIREMENT (BR-9):** state whether `PUT /auth/password` (change password) revokes other tokens. This is unknown.
- **Multi-tab consistency.**
  - **OFFICIAL GUIDANCE:** `BroadcastChannel` sends messages to every same-origin tab and frame (Baseline since March 2022) [S45]. The `storage` event fires in other tabs only for `localStorage`. For `sessionStorage` it never crosses tabs [S46].
  - **PROPOSAL — requires ADR:** broadcast `signed-in` and `signed-out` events only, never the token. Receiving tabs clear their caches and redirect. This works the same with a BFF, where tabs share the cookie but each tab holds its own cached data.
- **Reload persistence.** **PROPOSAL — requires ADR:** on load, restore by calling `/auth/me` (ID-7). A 401 clears the session.
- **Avoiding an auth flash.**
  - **OFFICIAL GUIDANCE (Next.js):** Proxy may do *optimistic* cookie-only checks and redirects. Secure checks belong in a server-side data layer. Proxy must not be the only check [S34][S35].
  - **PROPOSAL — requires ADR:** track three session states: `unknown`, `authenticated` and `anonymous`. Protected UI renders only in `authenticated`; `unknown` shows a neutral loading shell. Next.js: an optimistic redirect on the server, so no protected HTML is sent. SPA: hold the router until `/auth/me` settles.
- **Private routes.**
  - **OFFICIAL GUIDANCE:** session tokens must be verified by a trusted backend (ASVS 7.2.1) [S8].
  - **PROPOSAL — requires ADR:** client route guards and the role-capability map are UX only. Laravel enforces every request, and the UI handles 401 and 403 (D2, ID-8).

---

## 3. Login and registration brute force, and credential stuffing

### 3.1 What is known about the backend

- **VERIFIED (backend, from discovery), password reset only:**
  - `forgot-password`, `verify-reset-otp` and `reset-password` share **10 requests/minute per IP**.
  - The OTP is 6 digits, valid 10 minutes, single use, with a 60-second resend block per email. A new code invalidates the old one.
  - Verify **locks after 5 wrong attempts**.
  - The response is the same for unknown emails. Inactive accounts get no code.
- **VERIFIED (backend, from discovery):** no `X-RateLimit-*` or `Retry-After` header appeared on any probed (GET/OPTIONS) route. No `Access-Control-Expose-Headers` is sent, so browser JS cannot read `Retry-After` cross-origin even if it is sent [S47]. Registration enforces a unique email (`api-inventory.md`), so a 422 probably reveals that an account exists.
- **UNKNOWN:**
  - whether `POST /auth/login` and `/auth/register` are throttled, and how (key, limit, window);
  - whether any lockout exists;
  - the 429 body;
  - whether login error messages are generic.
- **Not a security control:** a frontend attempt counter, a disabled button or a client-side delay. The API accepts direct calls from any origin (CORS `*`) and from scripts, so all enforcement must be server-side [S6]. Frontend counters are UX only.

### 3.2 Official guidance

- **OFFICIAL GUIDANCE (OWASP Authentication [S5]):**
  - Key the failed-login counter to the account, not the source IP. Define the threshold, observation window and lockout duration.
  - Exponential lockout (starting about 1 s and doubling) is an alternative to a fixed lockout.
  - Lockout can be abused for denial of service. Let the forgot-password flow work while an account is locked.
  - CAPTCHA is defence in depth. It is friendlier to require it only after a few failures.
  - MFA is "by far the best defense". Use generic error messages.
- **OFFICIAL GUIDANCE (OWASP Credential Stuffing [S6]):**
  - Proxy networks spread attempts across many IPs and defeat per-IP blocking and rate limits. Use a graduated response rather than "a single predictable volume limit".
  - Mitigations should be temporary.
  - Client-side defences can be spoofed.
- **OFFICIAL GUIDANCE (NIST SP 800-63B-4 [S10]):**
  - At most **100 consecutive failures** per account before disabling the authenticator. Lower limits are allowed.
  - To reduce malicious lockout: a bot challenge before authenticating, and waits that grow toward the limit ("30 seconds up to an hour").
  - Reset the count on success.
- **OFFICIAL GUIDANCE (ASVS 5.0 [S7]):**
  - 6.1.1 (L1): documentation must define rate limiting, anti-automation and adaptive response, and how they "prevent malicious account lockout".
  - 6.3.1 (L1): the controls are implemented.
  - 6.3.8 (L3): no account enumeration through messages, status codes or timing.
- **OFFICIAL GUIDANCE (Laravel 13):**
  - `RateLimiter::for('login', fn ($r) => [...])` returns several limits evaluated in order. Unique prefixes are required when limits share a `by` key [S11].
  - `Limit::...->after(fn ($response) => ...)` counts only selected responses, for example failures [S11].
  - `throttle:<name>` middleware attaches a limiter, and Laravel returns 429 automatically [S11].
  - `RateLimiter::increment` is atomic on redis, memcached and database stores. `availableIn` returns the seconds until retry [S12].
  - The starter kits block login "for one minute" after several failures, keyed by "username / email address and their IP address" [S13].
  - Fortify's `EnsureLoginIsNotThrottled` keys on username + IP, can be replaced through `fortify.limiters.login`, and Fortify recommends throttling plus 2FA plus a WAF [S14].
- **OFFICIAL GUIDANCE (HTTP):** 429 means rate limited and MAY carry `Retry-After`. 429 responses must not be cached [S18]. `Retry-After` is an HTTP-date or a number of seconds [S19].

### 3.3 The candidate policy: "10 failed logins → 15-minute temporary restriction"

| Keyed by | Effect |
|---|---|
| **Account (email) only, hard lock** | **Lockout DoS.** Anyone who knows an email can lock it with 10 requests every 15 minutes (about 40 requests/hour per victim). Emails are the usernames, so they are guessable. If only existing accounts lock, the lock also reveals which accounts exist (ASVS 6.3.8). |
| **Email + IP** (the Laravel and Fortify pattern) | No remote lockout of other people's accounts. A distributed attacker still gets 10 guesses per IP per 15 minutes against one account: 1,000 proxy IPs give about 40,000 guesses/hour. It does nothing against password spraying (one password, many accounts). |
| **IP only** | Penalises shared NAT (offices, campuses) and is bypassed by proxy rotation [S6]. |

A fixed 15-minute hard stop also penalises real users who mistype. It is within NIST's 100-failure ceiling, so it is not "too strict". Its weakness is the key it uses and the binary lock.

**PROPOSAL — requires ADR (backend policy to request; every number is a config value, not hard-coded):**
1. **Per email + IP (`login:email|ip`):** count failures only, using `after()`. After **5** failures, apply progressive backoff: 60 s, doubling per further failure, capped at **15 min**. That keeps the candidate's ceiling. Clear on success.
2. **Per IP across all accounts (`login-ip:ip`):** for example 30 failed logins per 10 min, then 429. This targets spraying and stuffing from one source. Add a coarse request ceiling, for example 100 login requests per minute per IP.
3. **Per email across all IPs (`login-acct:email`):** after **10** failures in 15 min, apply a **soft lock**: further attempts require a bot challenge (§4) plus the backoff, instead of a hard block. Hard-disable only near NIST's 100, with recovery through password reset [S10][S5]. Log it, and optionally notify the user (ASVS 6.3.5, L3).
4. **Registration:** a per-IP limit (for example 5 per hour) plus a bot challenge.
5. **Enumeration:** one generic message ("Invalid email or password") and identical 429 behaviour for existing and unknown emails.
6. **Plumbing:** use an atomic cache store (redis or database) for counters [S12]. Send `Retry-After` and expose it with `Access-Control-Expose-Headers` [S47]. Document a stable 429 body.
7. **Behind a BFF:** limits keyed by IP must use the real client IP. That means the backend trusts only the BFF's forwarded header (`trustProxies` [S15]) or a signed header. Otherwise every user shares the BFF's IP [S3 §6.1.3.5].

**BACKEND REQUIREMENT (BR-3, BR-4):** implement and document the above, or document what exists today (ASVS 6.1.1).
**PROPOSAL — requires ADR (frontend):** map 429 to "Too many attempts. Please wait and try again". Show a countdown only when `Retry-After` is readable. Keep the submit button disabled while a request is in flight. Never present a client counter as protection.
**MFA:** out of MVP scope. Recorded as the strongest control [S5][S6] for the backend roadmap, for example for Administrator accounts first.

---

## 4. Bot protection

### 4.1 Cloudflare Turnstile (official facts)

- **OFFICIAL GUIDANCE:**
  - **Modes:** Managed (recommended; shows a checkbox only when risk requires it), Non-Interactive (visible spinner, no interaction) and Invisible (nothing visible). Invisible mode requires referencing Cloudflare's Turnstile Privacy Addendum in your privacy policy [S21].
  - Each widget has a public **sitekey** and a private **secret** [S21].
- **OFFICIAL GUIDANCE (Siteverify is mandatory [S20]):**
  - "The client-side widget alone does not protect your forms." Tokens can be forged.
  - Tokens are valid for **300 s**, single use and at most 2,048 characters. Replays fail with `timeout-or-duplicate`. Reuse detection is eventually consistent: at least 99% of repeats are rejected 5 s or more after the first validation.
  - `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, optional `remoteip` and optional `idempotency_key` (a UUID that makes retries safe).
  - Check `success`, and also check `hostname` and `action` against the expected values.
  - Only the backend calls Siteverify. A secret in front-end code lets attackers bypass the check. Set timeouts, log failures, and rate-limit validation.
- **OFFICIAL GUIDANCE (testing [S22]):**
  - Dummy sitekeys: `1x00000000000000000000AA` always passes, `2x00000000000000000000AB` always fails, `3x00000000000000000000FF` forces an interactive challenge.
  - Dummy secrets: `1x0000000000000000000000000000000AA` passes, `2x…AA` fails, `3x…AA` returns "already spent".
  - Test keys accept only the dummy token, and production secrets reject it. These are public test values, not credentials.
- **OFFICIAL GUIDANCE (CSP [S23]):** use a nonce on `api.js` (it works with `strict-dynamic`), or allow `script-src https://challenges.cloudflare.com` and `frame-src https://challenges.cloudflare.com`.
- **OFFICIAL GUIDANCE (plans [S25]):** the Free plan allows unlimited challenges, up to 20 widgets and 10 hostnames per widget. Turnstile can be used without other Cloudflare services.
- **OFFICIAL GUIDANCE (pre-clearance [S24]):** pre-clearance issues a `cf_clearance` cookie that lets visitors past WAF challenges on a Cloudflare zone. **Not needed here.** Nothing in discovery shows the API behind Cloudflare (`Server: Apache`), and pre-clearance does not replace Siteverify.

### 4.2 Alternatives (brief)

| | Turnstile | hCaptcha | reCAPTCHA v3 |
|---|---|---|---|
| UX | Managed: usually no interaction [S21] | Visible or invisible widget, puzzles possible [S26] | No interaction; returns a 0.0–1.0 score; you choose a threshold (default 0.5) [S27] |
| Token | 300 s, single use [S20] | Single use, 120 s default (`expired-input-response`) [S26] | Expires after 2 minutes; verify `action` [S27] |
| Server check | JSON or form POST; `idempotency_key` [S20] | Form-encoded POST only; send `sitekey` to stop cross-sitekey reuse; `hostname` comes from the browser and is not for auth [S26] | Siteverify returns the score; scores in staging differ from production [S27] |
| Cost | Free plan, unlimited challenges [S25] | Free tier; scores are Enterprise only [S26] | Essentials free up to 10,000 assessments/month per organisation, then paid tiers [S28] |
| CSP footprint | `challenges.cloudflare.com` (script, frame) [S23] | `hcaptcha.com` and `*.hcaptcha.com` for script, frame, style and connect [S26] | Google script domains (not verified this session) |
| Local dev | Dummy keys work on `localhost` [S22] | `localhost` and `127.0.0.1` prohibited as hostnames; use a hosts entry [S26] | Not verified |
| Privacy | Invisible mode needs a privacy-policy reference [S21] | Not verified this session | Not verified this session (FAQ page fetched, no privacy text found) |

### 4.3 Recommendation and backend dependency

- **VERIFIED (backend, from discovery):** neither Postman nor the OpenAPI spec lists a captcha field on any auth endpoint. **Backend support is UNKNOWN, so this is a blocker (BR-5).**
- **PROPOSAL — requires ADR:** use **Turnstile in Managed mode** because it has the lowest friction, is free, has the smallest CSP footprint and has test keys that work locally.
  - **Placement:**
    - always on **register** and **forgot-password**; resending a code is the same endpoint;
    - on **login**, as step-up after the backend signals risk (for example the §3.3 soft lock), or always on if the backend cannot signal;
    - not on `verify-reset-otp` at first, because the 5-attempt lock and the 10/min/IP limit already apply.
  - **Transport (a backend contract change):** a JSON body field, for example `turnstile_token`; the name is the backend's choice. A body field avoids a CORS `allowed_headers` change, which a custom header would need.
  - **Backend flow (BR-5):**
    1. Reject a missing token or one over 2,048 characters.
    2. Call Siteverify with the secret from env, the real client IP and an `idempotency_key` on retries.
    3. Require `success`, `hostname` ∈ the frontend hostnames, and `action` equal to the expected value.
    4. Only then run the authentication logic.
    5. Fail closed with a generic 422 or 400. Log the `error-codes`.
    6. Keep the §3.3 rate limits as well. A challenge complements throttling and does not replace it [S5][S6].
  - **Frontend:**
    - Render the widget with the public sitekey.
    - Send the token once, then reset the widget after every submit (tokens are single use) and on expiry.
    - Handle the widget error states [S21]. Keep it keyboard and screen-reader usable.
    - Never store the token.
- **Critical rules:**
  1. A client widget alone protects nothing [S20].
  2. The secret is never in the bundle. `NEXT_PUBLIC_` and `VITE_` values are public [S36][S37].
  3. Under AGENTS.md §7 and D7, the frontend must not ship the widget, or any "I'm human" UI, until the backend verifies tokens. Keep it behind a disabled flag and document it as blocked.
- **Verifying in the BFF instead:** a BFF could call Siteverify before forwarding. The Laravel API stays directly reachable from any origin and from scripts, so this protects only the BFF path. It is defence in depth, not a replacement for BR-5.

---

## 5. Browser security

### 5.1 XSS in React

- **OFFICIAL GUIDANCE:**
  - React escapes rendered text. `dangerouslySetInnerHTML` with untrusted HTML is "trivial" XSS, so use it only with trusted, sanitised HTML [S29].
  - OWASP lists `dangerouslySetInnerHTML` and unvalidated URLs as React gaps [S31].
  - React 19 blocks `javascript:` URLs in `href`/`src` (PR #28615, merged) [S30], but this "does not replace application-specific URL validation" [S31].
  - OWASP recommends DOMPurify if HTML must ever be rendered [S31].
- **PROPOSAL — requires ADR:**
  - **Ban `dangerouslySetInnerHTML`**, enforced by lint if the lint ADR's tooling supports it. AI summaries (Tier 2) render as text.
  - **Validate every URL that comes from data** (`meeting_link`, `avatar_url`, `download_url`, file URLs): parse with `new URL()` and allow only `https:` (and `mailto:` where intended). Render anything else as plain text.
  - External links use `rel="noopener noreferrer"` [S1].
  - Never pass API strings to `eval`, `setTimeout(string)`, `innerHTML` or `location` without validation [S31].

### 5.2 Content Security Policy

- **OFFICIAL GUIDANCE:**
  - ASVS 3.4.3 (L2) requires at minimum `object-src 'none'`, `base-uri 'none'`, and an allowlist or nonces/hashes. 3.4.7 (L3) adds a reporting endpoint [S9].
  - `frame-ancestors` is not supported in `<meta>` [S43], so CSP must be an HTTP header set by the hosting or server.
  - `connect-src` governs `fetch`, XHR, WebSocket, EventSource and `sendBeacon` [S44].
- **OFFICIAL GUIDANCE (Next.js [S32]):**
  - A nonce CSP (set in `proxy.ts`, `'strict-dynamic'`) requires dynamic rendering of **all** pages. It disables static optimisation and ISR, prevents CDN caching by default, and does not work with Partial Prerendering.
  - The documented no-nonce variant uses `script-src 'self' 'unsafe-inline'`, which is weaker.
  - `'unsafe-eval'` is needed only in development.
- **OFFICIAL GUIDANCE (Vite [S38]):** with `html.cspNonce`, Vite adds the nonce to its tags, and the placeholder must be replaced with a unique value per request. Never allow `data:` in `script-src`. Allow `data:` for `img-src` and `font-src`, or set `build.assetsInlineLimit: 0`.
- **PROPOSAL — requires ADR** (directives; values depend on the framework and BFF decisions):
  - `default-src 'self'`
  - `script-src`:
    - Next.js with a BFF and dynamic rendering: `'self' 'nonce-…' 'strict-dynamic'`.
    - Static SPA: `'self'` only. Check that the Vite build emits no inline script.
    - Add `https://challenges.cloudflare.com` only if Turnstile ships.
  - `connect-src`:
    - With a BFF: `'self'`.
    - SPA: `'self' https://collabspace.huma-volve.com`.
    - Add the Reverb `wss:` origin later only if real-time ships (it is out of MVP).
  - `img-src 'self' data: blob:` plus the avatar host (the API host serves the full `avatar_url`).
  - `frame-src https://challenges.cloudflare.com` (only with Turnstile); `frame-ancestors 'none'`; `form-action 'self'`; `object-src 'none'`; `base-uri 'none'`; `upgrade-insecure-requests`.
  - Roll out with `Content-Security-Policy-Report-Only` first.

### 5.3 Security headers (hosting or BFF responsibility)

- **OFFICIAL GUIDANCE:**
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`. ASVS 3.4.1 requires at least 1 year, and subdomains from L2. Send it over HTTPS only [S9][S42].
  - `X-Content-Type-Options: nosniff` on every response (ASVS 3.4.4). It stops uploaded text being treated as HTML [S41].
  - A `Referrer-Policy` (ASVS 3.4.5). `strict-origin-when-cross-origin` is the browser default [S40]. Use `no-referrer` on reset pages [S52].
  - CSP `frame-ancestors 'none'` (ASVS 3.4.6; `X-Frame-Options` is obsolete but still useful as a fallback) [S9][S43].
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` [S48].
  - `Cross-Origin-Opener-Policy: same-origin` (ASVS 3.4.8, L3) [S9].
  - Remove `X-Powered-By` [S48].
- **PROPOSAL — requires ADR:** set all of these on the frontend origin. They are a hosting/deployment item, owned by the shared-surfaces ticket for the root config.

### 5.4 CSRF

- **OFFICIAL GUIDANCE:** CSRF works because browsers attach cookies automatically [S49]. A bearer token in an `Authorization` header set by JS is not attached automatically, so **direct SPA→API bearer calls are not CSRF-prone**.
- **OFFICIAL GUIDANCE (BFF, cookie-based):** a BFF "MUST implement a proper CSRF defense" [S3 §6.1.3.3]. Options:
  - `SameSite=Strict`, though it is weak against sibling subdomains;
  - requiring a custom header that forces a preflight;
  - checking `Origin`;
  - checking `Sec-Fetch-Site`;
  - a signed double-submit token [S3][S49].
  Don't use GET for state changes [S49]. Next.js Server Actions accept only POST and compare `Origin` with `Host` [S33]. Route Handlers get no such check automatically.
- **PROPOSAL — requires ADR (BFF):** `SameSite=Strict` plus, on every non-GET BFF route, reject `Sec-Fetch-Site: cross-site` and any mismatched `Origin`, and require a static custom header. No state change over GET.

### 5.5 CORS

- **VERIFIED (backend, from discovery):** `Access-Control-Allow-Origin: *`, no credentials, `Max-Age: 0`, no `Expose-Headers`.
- **OFFICIAL GUIDANCE:** allow only selected, trusted origins rather than `*` or a blindly reflected `Origin` [S1]. ASVS 3.4.2 requires a fixed value or an allowlist, and `*` only when the response holds no sensitive information [S9]. Laravel configures CORS in `config/cors.php` after `php artisan config:publish cors` [S11].
- **BACKEND REQUIREMENT (BR-6):**
  - Restrict `allowed_origins` to the production frontend origin(s) and local development origins.
  - Expose `Retry-After`, plus `Content-Disposition` if downloads stay cross-origin.
  - Set a non-zero `max_age`.
  - With a BFF, browsers never call the API, so the list can stay minimal.

### 5.6 HTTPS

- **OFFICIAL GUIDANCE:** `Secure` cookies are sent only over HTTPS [S39], and HSTS prevents downgrade [S42].
- **PROPOSAL — requires ADR:** HTTPS only on every environment except localhost. `upgrade-insecure-requests` is in the CSP. The API base URL is `https://`.

---

## 6. Secrets, environment variables and data leakage

- **OFFICIAL GUIDANCE:**
  - Next.js inlines `NEXT_PUBLIC_*` into the browser bundle at build time. Other variables are server only [S36].
  - Mark server modules with `server-only` so a client import fails the build [S33].
  - Vite bundles `VITE_*` into client code and warns they "should not contain sensitive information" [S37].
  - `.env*.local` files must be git-ignored [S37][S36].
- **PROPOSAL — requires ADR:**
  - **Public config allowed:** the API base URL (SPA only) and the Turnstile sitekey.
  - **Server or backend only:** the Turnstile secret (backend), BFF cookie and session encryption keys, and the upstream API URL in a BFF.
  - Nothing secret behind a public prefix.
  - The Postman collection stays git-ignored and untouched (AGENTS.md).
- **OFFICIAL GUIDANCE (logging [S50]):** don't log session identifiers, access tokens, passwords, sensitive PII or secrets. Mask, hash or remove them.
- **OFFICIAL GUIDANCE (URLs):** tokens in URLs leak through history, logs and `Referer` [S49].
- **PROPOSAL — requires ADR:**
  - No token, OTP, password or email in URLs. Keep the forgot-password → OTP → reset flow in in-memory route state, not the query string.
  - Nothing sensitive in `console` output, analytics or error reports.
  - Any error-reporting tool (it needs its own ADR) must scrub `Authorization` headers and the bodies of auth endpoints.
  - Analytics are off on authenticated pages unless an ADR approves them.

---

## 7. File uploads (Tier 2, documented now)

- **VERIFIED (backend, from discovery):**
  - Project file uploads have a maximum of 20 MB. Task-file uploads have **no stated limit**.
  - Avatars must be jpg/jpeg/png/webp, at most 2 MB and 4000×4000.
  - Download is an authenticated binary stream, so a plain link carries no bearer token.
  - No `Access-Control-Expose-Headers`, so `Content-Disposition` is probably unreadable cross-origin (unverified).
- **OFFICIAL GUIDANCE (OWASP File Upload [S51]):**
  - Allowlist extensions.
  - Validate the type without trusting `Content-Type`; check signatures as an extra step.
  - Generate server-side filenames.
  - Enforce size limits.
  - Authorise uploads.
  - Store outside the webroot.
  - Scan with AV or CDR where possible, and protect uploads from CSRF.
- **OFFICIAL GUIDANCE (ASVS and MDN):** stop uploaded content rendering in the wrong context with `Content-Disposition: attachment`, CSP `sandbox` or `Sec-Fetch-*` checks (ASVS 3.2.1) [S9]. Use `nosniff` [S41].
- **PROPOSAL — requires ADR (frontend):**
  - Client checks (`accept`, size ≤ 20 MB, avatar rules) are UX only.
  - Download with an authenticated `fetch`, then save the Blob through an object URL with the `download` attribute, and revoke the URL afterwards.
  - **Never render uploaded HTML or SVG inline in the app origin.** Preview only raster image types.
  - With a BFF, stream through a route handler that sets `Content-Disposition: attachment` and `nosniff`.
- **BACKEND REQUIREMENT (BR-8):**
  - Enforce size and type server-side on **all** upload paths, task files included.
  - Serve downloads with `attachment`, the correct `Content-Type` and `nosniff`.
  - Authorise every download.
  - Expose `Content-Disposition` through CORS if downloads stay cross-origin.

---

## 8. Dependency security

- **OFFICIAL GUIDANCE:**
  - `npm ci` requires a lockfile, fails if it doesn't match `package.json`, and never writes to it [S54].
  - `npm audit` needs a lockfile. `--audit-level=<level>` sets the CI failure threshold. `npm audit signatures` verifies registry signatures and provenance [S53].
  - Dependabot alerts plus security updates open PRs for vulnerable dependencies, and they need the dependency graph enabled. Security updates apply only to dependencies declared in a manifest or lockfile [S55].
- **PROPOSAL — requires ADR (dependencies and testing ADRs):**
  - Commit the lockfile.
  - CI runs `npm ci`, `npm audit --audit-level=high` and `npm audit signatures`.
  - Enable the dependency graph, Dependabot alerts and security updates on the public repo.
  - Pin exact direct versions. This is a convention choice, not verified against an official source this session.
  - Use one library per responsibility (AGENTS.md §6) and the smallest dependency set.
  - Allow no third-party runtime scripts except an approved bot-protection widget.

---

## 9. Responsibility matrix

| Item | Frontend | Backend (existing Laravel team) | Hosting / deployment |
|---|---|---|---|
| Token storage | BFF or fallback storage module; clear on logout, 401 and reset | Token issue and revocation (exists) | BFF needs a server runtime and secret env |
| Token lifetime and `remember` | No invented timer; handle 401 | **BR-2:** finite `expiration`, a `remember` policy, pruning | None |
| Logout, reset, revocation | Always clear locally; broadcast to tabs | Exists; **BR-9:** say whether a password change revokes other tokens | None |
| Route protection | UX guard only | Authorises every request (exists) | None |
| Login, register and reset throttling | 429 UX only; no client counter as a control | **BR-3:** layered, configurable limits; generic errors; `Retry-After`; documented 429 body | WAF or edge rate limit (optional) |
| Real client IP behind a BFF | Forward the client IP from the BFF | **BR-4:** trust only the BFF's forwarded IP | Fixed BFF egress, or a signed header |
| Bot protection | Widget (sitekey) once BR-5 exists; reset per submit | **BR-5:** token field, Siteverify with the secret, checks, fail closed | Turnstile widget and hostnames, secret in backend env |
| XSS | Ban `dangerouslySetInnerHTML`; URL allowlist; no inline scripts | Serve JSON with the correct `Content-Type` (exists) | None |
| CSP and security headers | Define the policy (nonce generation in a Next.js BFF) | API: `nosniff`; remove `X-Powered-By` | Set headers on the frontend origin; HSTS |
| CSRF | BFF: SameSite, Origin/Sec-Fetch-Site checks, custom header | N/A for bearer calls | None |
| CORS | Nothing to configure (SPA) | **BR-6:** allowlist origins; expose headers; `max_age` | None |
| HTTPS | HTTPS-only URLs | TLS on the API (exists) | TLS and HSTS on the frontend |
| Secrets and env | Public-prefixed values only; `server-only` | Turnstile secret | Secret env per environment; `.env*.local` git-ignored |
| Logging and PII | No tokens, OTPs or emails in URLs, logs or analytics | The same for backend logs | Log retention and access |
| File uploads | UX checks; Blob download; no inline HTML/SVG | **BR-8:** server-side size and type; attachment; authorisation; expose headers | None |
| Dependencies | Lockfile, `npm ci`, audit, Dependabot | Composer equivalent; **BR-1:** no dev packages in production | CI runs the audit |

---

## 10. Known backend security issues to report (from discovery only, no new probes)

| # | Issue | Evidence | Recommendation |
|---|---|---|---|
| BR-1 | **Laravel Boost is active in production** | Probe #1, #23: an inline script posts browser logs to `/_boost/browser-logs` | Boost is a development tool installed with `composer require laravel/boost --dev` [S17]. Deploy without dev packages and remove the script and route. Confirm `APP_DEBUG=false`, which Laravel says must "always be `false`" in production [S16]. That setting itself was not observed. |
| BR-7 | **The Google OAuth redirect points to `127.0.0.1:8000`** | Probe #32: `redirect_uri=http://127.0.0.1:8000/...`, no `client_id` visible | Fix the redirect URI and client config, or disable the public endpoint while Google sign-in is out of MVP (D1). |
| BR-6 | **Wildcard CORS** (`*`), `Max-Age: 0`, no `Expose-Headers` | Probes #14–#20 | Allowlist the origins, set a non-zero `max_age`, expose `Retry-After` and `Content-Disposition` [S1][S9][S47]. |
| BR-3 | **Login and register throttling unknown**; 429 body unknown; no rate-limit headers seen | `api-probe.md` "Rate limiting" | Implement or document §3.3 (ASVS 6.1.1/6.3.1) [S7]. |
| BR-2 | **Token expiration unknown**; the `remember` effect is unknown; Sanctum's default is never expire | `HANDOFF.md` §8, [S4] | Set and document finite lifetimes and prune expired tokens. |
| BR-4 | Per-IP limits would collapse behind a BFF | RFC 10017 §6.1.3.5 [S3] | Trust a forwarded client IP only from the BFF [S15]. |
| BR-5 | No bot-protection field on the auth endpoints | Postman/OpenAPI field lists | Add Turnstile verification (§4.3). |
| BR-8 | No stated size limit on task-file uploads | `api-inventory.md` Files #3 | Enforce limits server-side on every upload path. |
| BR-9 | Unknown whether a password change revokes other tokens | `api-inventory.md` | Document it, and offer "sign out other devices" (ASVS 7.4.3) [S8]. |
| BR-10 | Minor: `X-Powered-By: PHP/8.3.37` header; a missing `Accept` header gives 500 "Route [login] not defined"; registration's unique-email 422 allows account enumeration | `api-probe.md`, `api-inventory.md` | Remove the header [S48]. Return 401 JSON without depending on `Accept`. Accept or mitigate enumeration (ASVS 6.3.8 is L3) [S7]. |

---

## Sources

All checked 2026-11-26. "Version" is the documentation version that was checked.

| ID | URL | Version | Supports |
|---|---|---|---|
| S1 | https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html | current | Web storage is XSS-readable; prefer `sessionStorage`; no session IDs in local storage; allowlisted CORS origins; `noopener noreferrer` |
| S2 | https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | current | No tokens in `localStorage`/`sessionStorage`; HttpOnly cookie or BFF; cookie attributes and prefixes; server-side expiry |
| S3 | https://www.rfc-editor.org/rfc/rfc10017.html (was https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/) | RFC 10017 / BCP 212, Aug 2026 | Browser storage threat analysis (§8); BFF cookie rules, CSRF, proxy allowlist, IP rate-limit caveat (§6.1.3) |
| S4 | https://laravel.com/docs/13.x/sanctum | 13.x | Token expiry and revocation; SPA cookie-auth prerequisites (same top-level domain, `stateful`, `supports_credentials`) |
| S5 | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | current | Account-keyed counters, exponential lockout, lockout DoS, CAPTCHA after failures, MFA, generic messages |
| S6 | https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html | current | Distributed IPs defeat per-IP limits; graduated response; client defences spoofable |
| S7 | https://github.com/OWASP/ASVS/blob/master/5.0/en/0x15-V6-Authentication.md | ASVS 5.0 | 6.1.1, 6.3.1 (documented anti-automation, no malicious lockout), 6.3.5, 6.3.8 |
| S8 | https://github.com/OWASP/ASVS/blob/master/5.0/en/0x16-V7-Session-Management.md | ASVS 5.0 | 7.1.1, 7.2.1, 7.3.x, 7.4.1, 7.4.3 session timeout and termination |
| S9 | https://github.com/OWASP/ASVS/blob/master/5.0/en/0x12-V3-Web-Frontend-Security.md | ASVS 5.0 | 3.2.1 content context, 3.3 cookies, 3.4.1–3.4.8 headers, CSP, CORS, 3.5 CSRF |
| S10 | https://pages.nist.gov/800-63-4/sp800-63b.html | SP 800-63B-4 | At most 100 consecutive failures; bot challenge and growing waits against malicious lockout |
| S11 | https://laravel.com/docs/13.x/routing#rate-limiting (and #cors) | 13.x | `RateLimiter::for`, multiple limits, `by`, `after()`, `throttle`, automatic 429, CORS config publishing |
| S12 | https://laravel.com/docs/13.x/rate-limiting | 13.x | Atomic `increment`, `availableIn`, `clear` |
| S13 | https://laravel.com/docs/13.x/authentication#login-throttling | 13.x | Starter-kit login throttle keyed by email + IP, one minute |
| S14 | https://laravel.com/docs/13.x/fortify#authentication-throttling | 13.x | `EnsureLoginIsNotThrottled` (username + IP), custom limiter, throttling + 2FA + WAF |
| S15 | https://laravel.com/docs/13.x/requests#configuring-trusted-proxies | 13.x | `trustProxies` for the real client IP behind a BFF |
| S16 | https://laravel.com/docs/13.x/deployment#debug-mode | 13.x | `APP_DEBUG` must be false in production |
| S17 | https://laravel.com/docs/13.x/boost | 13.x | Boost is AI-assisted dev tooling installed with `--dev` |
| S18 | https://www.rfc-editor.org/rfc/rfc6585.html#section-4 | RFC 6585 | 429 semantics, optional `Retry-After`, not cacheable |
| S19 | https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3 | RFC 9110 | `Retry-After` format |
| S20 | https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ | modified 2026-11-16 | Mandatory Siteverify, 300 s single-use tokens, `idempotency_key`, hostname/action checks, secret server-side |
| S21 | https://developers.cloudflare.com/turnstile/concepts/widget/ | modified 2026-04-16 | Managed, Non-Interactive and Invisible modes; sitekey and secret; invisible privacy requirement; error states |
| S22 | https://developers.cloudflare.com/turnstile/troubleshooting/testing/ | modified 2026-11-05 | Dummy sitekeys, secrets and token behaviour |
| S23 | https://developers.cloudflare.com/turnstile/reference/content-security-policy/ | modified 2026-05-05 | CSP: nonce/`strict-dynamic` or `script-src`/`frame-src` `challenges.cloudflare.com` |
| S24 | https://developers.cloudflare.com/cloudflare-challenges/concepts/clearance/ | current | Pre-clearance is for Cloudflare-zone WAF; Siteverify still required |
| S25 | https://developers.cloudflare.com/turnstile/plans/ | modified 2026-08-14 | Free plan limits; usable without other Cloudflare services |
| S26 | https://docs.hcaptcha.com/ | current | hCaptcha Siteverify, 120 s single-use tokens, `sitekey` check, CSP, localhost restriction |
| S27 | https://developers.google.com/recaptcha/docs/v3 | v3 | Scores, 2-minute token expiry, verify `action`, default 0.5 threshold |
| S28 | https://docs.cloud.google.com/recaptcha/docs/compare-tiers | current | Essentials free up to 10,000 assessments/month; paid tiers |
| S29 | https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html | React 19 docs | `dangerouslySetInnerHTML` XSS risk |
| S30 | https://github.com/facebook/react/pull/28615 | merged for React 19 | React blocks `javascript:` URLs |
| S31 | https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html | current | React gaps, URL validation still required, DOMPurify, safe sinks |
| S32 | https://nextjs.org/docs/app/guides/content-security-policy | updated 2026-03-20 | Nonce CSP forces dynamic rendering (no static/ISR/PPR); the no-nonce variant uses `'unsafe-inline'` |
| S33 | https://nextjs.org/docs/app/guides/data-security | current (v16 docs) | `server-only`, DAL, `NEXT_PUBLIC_` note, Server Actions POST-only plus Origin/Host check |
| S34 | https://nextjs.org/docs/app/guides/authentication | current (v16 docs) | Optimistic vs secure checks; HttpOnly session cookie options |
| S35 | https://nextjs.org/docs/app/api-reference/file-conventions/proxy | updated 2026-11-18, v16.0.0 rename | Proxy is optimistic; verify auth inside handlers; middleware renamed to proxy |
| S36 | https://nextjs.org/docs/app/guides/environment-variables | updated 2026-08-25 | `NEXT_PUBLIC_` inlined into the bundle at build; others server-only |
| S37 | https://vite.dev/guide/env-and-mode | current | `VITE_` values bundled and public; `*.local` git-ignored |
| S38 | https://vite.dev/guide/features#content-security-policy-csp | current | `html.cspNonce`, per-request nonce, no `data:` in `script-src` |
| S39 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie | current | SameSite, Secure, HttpOnly, `__Host-` and `__Host-Http-` prefixes |
| S40 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy | current | Policies; `strict-origin-when-cross-origin` default |
| S41 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options | current | `nosniff` stops uploaded content being sniffed as HTML |
| S42 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security | current | HSTS directives; HTTPS only |
| S43 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors | current | `frame-ancestors 'none'`; not supported in `<meta>` |
| S44 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src | current | `connect-src` scope (fetch, XHR, WebSocket) |
| S45 | https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel | current | Same-origin cross-tab messaging, Baseline 2022 |
| S46 | https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event | current | The `storage` event crosses tabs for `localStorage` only |
| S47 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers | current | Only safelisted headers are readable cross-origin (`Retry-After` is not among them) |
| S48 | https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html | current | Permissions-Policy, COOP, removing `X-Powered-By`, no `*` with credentials |
| S49 | https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html | current | CSRF relies on automatic cookies; tokens, Fetch Metadata, custom headers; no GET state changes; URL token leakage |
| S50 | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | current | Data to exclude from logs (tokens, session IDs, passwords, PII) |
| S51 | https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html | current | Upload validation, renaming, size, authorisation, storage, AV/CDR |
| S52 | https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html | current | Consistent responses, rate limiting or CAPTCHA, no auto-login, `no-referrer`, no lockout on reset |
| S53 | https://docs.npmjs.com/cli/v11/commands/npm-audit | npm CLI v11 | `npm audit`, `--audit-level`, `audit signatures`, lockfile required |
| S54 | https://docs.npmjs.com/cli/v11/commands/npm-ci | npm CLI v11 | `npm ci` frozen, lockfile-enforced installs |
| S55 | https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates | current | Dependabot alerts and security-update PRs |

**Could not verify this session:**
- The MDN CSP guide (`/Web/HTTP/Guides/CSP`) returned no match for `connect-src`. The directive pages S43 and S44 were used instead.
- The reCAPTCHA FAQ had no privacy text matching the search, so reCAPTCHA and hCaptcha privacy claims are left unverified.
- The Next.js `cookies()` API page returned no match. Cookie options come from S34 instead.
- `cloud.google.com/recaptcha/docs/compare-tiers` redirected to `docs.cloud.google.com` (S28, fetched).
- Laravel's CSRF page was not fetched. The Laravel CSRF facts used come from S4.
- Exact-version pinning (§8) has no official source here and is marked as a convention.
