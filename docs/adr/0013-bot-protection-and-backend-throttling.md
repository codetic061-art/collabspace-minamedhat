# ADR-13: Bot Protection, Backend Throttling Policy, and Backend Dependency Matrix

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §7, §8, Spec ID-20.3, ID-20.4, ID-20.6, ID-21, Decision D7

---

## Context

Discovery and security research (`docs/research/security.md` §3–§4, §10; `ID-20.3`–`ID-20.6`) established critical boundaries between what this frontend controls and what only the unmodifiable external Laravel 13 backend can enforce:

1. **Verified backend limits:** Password-recovery endpoints (`forgot-password`, `verify-reset-otp`, `reset-password`) share **10 requests/min per IP**; OTPs are 6 digits, valid 10 minutes, single use, 60-second resend block per email, and lock after 5 wrong attempts.
2. **Unknown backend behavior:** Login and registration throttling, account lockout rules, exact `429` JSON payloads, and whether login messages are generic are **unverified**. Neither Postman nor OpenAPI defines a bot-protection token field on any auth endpoint.
3. **Why naive policies and client-side controls fail:**
   - The candidate policy "10 failed logins -> 15-minute hard lock" keyed by email alone enables trivial **lockout DoS** against any known user email and can leak account existence (ASVS 6.3.8). Keyed by email + IP alone, it does not stop distributed credential stuffing or password spraying (`security.md` §3.3).
   - Because the Laravel API accepts direct calls from any origin/script (`CORS *`), any client-side attempt counter, artificial delay, or unverified CAPTCHA widget is **pure security theater** that attackers bypass trivially (`OWASP Credential Stuffing`, `Cloudflare Turnstile Siteverify docs`).
4. **Honesty rule (`AGENTS.md` §7, `D7`, `ID-20.4`):** The frontend must never ship non-functional security UI or claim protection that the backend does not enforce.

---

## Decision

### 1. Bot protection design: Cloudflare Turnstile (Managed mode) — strictly unshipped until `BR-5`

Select **Cloudflare Turnstile in Managed mode** as the approved bot-protection architecture, kept **strictly disabled / unshipped behind a configuration flag** until the backend team implements server-side Siteverify (`BR-5`):

- **Feature-flag gating (`ID-20.4`):** Guarded by `VITE_TURNSTILE_ENABLED=false` (default) and `VITE_TURNSTILE_SITEKEY` (unset in MVP). While disabled, **zero** Turnstile script tags, CSP allowances, or "verify you're human" UI render anywhere in the application (`D7`, `AGENTS.md` §7).
- **Planned placement once `BR-5` ships:**
  - Always on **Register** (`POST /auth/register`) and **Forgot Password** (`POST /auth/forgot-password`, which also handles resend).
  - On **Login** (`POST /auth/login`) as step-up when the backend signals elevated risk (soft lock), or always on if the backend cannot signal step-up.
  - Not on **Verify OTP** initially (already protected by 5-attempt lock and 10 req/min/IP).
- **Planned contract (`BR-5`):** Frontend renders Managed widget with public sitekey, sends single-use token (valid 300 s, `<= 2048` chars) in a backend-named JSON body field (e.g., `turnstile_token`, avoiding CORS custom-header changes), and resets the widget after every submit and on expiry. Backend validates via `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` using the server-only secret, real client IP (`remoteip`), and `idempotency_key`, checking `success`, `hostname`, and `action`, failing closed (`400`/`422`).
- **CSP update when enabled:** Add `https://challenges.cloudflare.com` to `script-src` and `frame-src` (`ADR-12`) only when `BR-5` is live.

### 2. Layered throttling policy requested from backend (`BR-3`) & frontend `429` obligations

Document and submit the following configurable, layered throttling policy to the Laravel team (`BR-3`, replacing any single-key hard lockout):

| Layer | Requested backend rule (all thresholds configurable) |
|---|---|
| **Per `email + IP`** | Count **failures only** (`Limit::...->after(...)`). After **5** failures, apply progressive backoff starting at `60 s`, doubling per failure, capped at **`15 min`**. Reset on success. |
| **Per `IP` across accounts** | E.g. `30` failed logins / `10 min` -> `429`, plus a coarse ceiling (e.g. `100` req/min/IP) to slow password spraying. |
| **Per `email` across IPs** | After **10** failures in `15 min`, apply a **soft lock** (require Turnstile challenge + backoff, not a hard DoS block). Hard-disable only near NIST's 100-failure ceiling with password-reset recovery. |
| **Registration** | Per-IP limit (e.g. `5 / hour`) + Turnstile challenge (`BR-5`). |
| **Responses & headers** | Generic invalid-credential message (`"Invalid email or password"`), identical `429` behavior for existing/unknown emails, atomic store (`redis`/`database`), `Retry-After` header exposed via CORS (`BR-6`), and a documented `429` JSON body. |

- **Frontend obligations (`ID-19`, `ID-20.3`, `ID-21`):**
  - Map `429` to `"Too many attempts. Please wait and try again."`
  - Show a countdown and disable submit **only** when `Retry-After` is actually readable from the response; never invent a wait time or claim a lockout policy the server has not returned.
  - Keep the submit button disabled while a request is in flight (`ADR-08`).
  - Never implement or display a client-side attempt counter as a security control.

### 3. Complete Backend Dependency Matrix (`BR-1` – `BR-10`)

Tracked formally for handoff to the external Laravel backend team (`docs/research/security.md` §10, `ID-20.6`). This frontend **never** fakes or works around these items:

| ID | Backend Requirement | Priority | Status | Frontend Impact / Dependency |
|---|---|---|---|---|
| **BR-1** | Remove Laravel Boost (`--dev`) from production; confirm `APP_DEBUG=false` | High | Open (reported) | None on frontend code; security hygiene of shared production API. |
| **BR-2** | Configure finite Sanctum token lifetimes (`remember=false` vs `remember=true`) + `sanctum:prune-expired` | High | Open (reported) | **Critical companion to ADR-01** to bound residual XSS token-theft window; frontend invents no expiry timer. |
| **BR-3** | Implement/document layered login & registration throttling, generic errors, `Retry-After`, and `429` body | High | Open (reported) | Frontend renders `429` generically; countdown activates automatically once `Retry-After` is sent + exposed. |
| **BR-4** | Trust forwarded client IP from BFF proxy only (`trustProxies`) | N/A for SPA | Avoided by ADR-01/02 | Not required for direct SPA -> API calls; becomes mandatory only if migrating to a BFF later. |
| **BR-5** | Add Cloudflare Turnstile JSON field + server-side Siteverify (`secret`, `hostname`, `action`, fail closed) | Medium | Open (**blocks Turnstile UI**) | Turnstile stays **disabled/unshipped** in frontend until backend implements `BR-5` (`ID-20.4`). |
| **BR-6** | Restrict CORS `allowed_origins` (replace `*`), set non-zero `max_age`, expose `Retry-After` & `Content-Disposition` | Medium | Open (reported) | Enables readable `429` countdowns, proper cross-origin download filenames, and eliminates repeated preflights. |
| **BR-7** | Fix Google OAuth `redirect_uri` (currently `127.0.0.1:8000`) or disable endpoint | Low | Open (reported) | Google sign-in is out of MVP scope (`D1`). |
| **BR-8** | Enforce server-side upload size/type limits on all paths (including task files) + `Content-Disposition: attachment` & `nosniff` on downloads | Medium | Open (reported) | Tier 1 avatar client checks are UX only; Tier 2 file downloads use authenticated `fetch` + Blob + no inline HTML/SVG (`security.md` §7). |
| **BR-9** | Document whether `PUT /auth/password` revokes other active tokens (and support signing out other devices per ASVS 7.4.3) | Low | Open (reported) | Frontend preserves current session on password change unless server returns `401`, in which case centralized `401` handler clears session (`ADR-01`). |
| **BR-10** | Remove `X-Powered-By: PHP/8.3.37`; return `401` JSON without depending on `Accept`; confirm registration enumeration stance | Low | Open (reported) | Frontend always sends `Accept: application/json` (`ADR-05`) regardless. |

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. hCaptcha** | Bot protection via hCaptcha widget and Siteverify. | **Rejected.** Prohibits `localhost` and `127.0.0.1` hostnames during local development (requiring custom hosts entries), requires a broader CSP footprint (`hcaptcha.com` and `*.hcaptcha.com` across script/frame/style/connect), and uses 120 s tokens with more frequent interactive puzzles (`security.md` §4.2). |
| **2. Google reCAPTCHA v3** | Invisible score-based bot detection (`0.0`–`1.0`). | **Rejected.** Essentials free tier caps at 10,000 assessments/month per organization before paid billing, requires tuning score thresholds that behave differently in staging vs production, and lacks Turnstile's unlimited free Managed tier (`security.md` §4.2). |
| **3. Client-side-only CAPTCHA widget or client-side login attempt counter (simpler frontend-only option)** | Render a Turnstile/checkbox widget or count failed logins in `localStorage` without backend verification. | **Rejected as security theater.** Explicitly warned against by Cloudflare ("The client-side widget alone does not protect your forms"), OWASP Credential Stuffing, and `AGENTS.md` §7 / `D7` (no fake or non-functional UI). |

---

## Consequences

### Positive
- Zero fake security UI shipped in MVP; frontend stays 100% honest about what the backend enforces (`AGENTS.md` §7, `D7`).
- When the backend team delivers `BR-5`, enabling Cloudflare Turnstile Managed mode is a clean, pre-specified integration with local dummy test keys (`1x00000000000000000000AA`, etc.) and minimal CSP footprint (`challenges.cloudflare.com`).
- Gives the backend team an actionable, standards-backed (`OWASP`, `ASVS 5.0`, `NIST SP 800-63B-4`, `Laravel 13`) specification (`BR-1`–`BR-10`).

### Negative
- Until the backend implements `BR-3` and `BR-5`, login and registration remain reliant on whatever throttling Laravel currently enforces (unknown in discovery).
- `Retry-After` countdown UI cannot display exact remaining seconds until `BR-6` exposes the header cross-origin.

### Accepted Residual Risk
- Automated credential stuffing or registration spam against `POST /auth/login` and `POST /auth/register` cannot be mitigated by frontend code alone; risk remains owned by the backend team via `BR-3` and `BR-5`, transparently documented here and in `docs/research/security.md`.

### Backend Dependencies
- Governs the complete **`BR-1`–`BR-10`** matrix above (primarily `BR-3`, `BR-5`, and `BR-6` for throttling and bot protection).

---

## Sources

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ (Cloudflare Turnstile docs, modified 2026-11-16, checked 2026-11-26) — Mandatory server-side Siteverify, 300 s single-use tokens, `idempotency_key`, `hostname`/`action` checks, and secret protection.
- https://developers.cloudflare.com/turnstile/concepts/widget/ (Cloudflare Turnstile docs, checked 2026-11-26) — Managed vs Non-Interactive vs Invisible modes and error states.
- https://developers.cloudflare.com/turnstile/troubleshooting/testing/ (Cloudflare Turnstile docs, checked 2026-11-26) — Dummy sitekeys and secrets working on `localhost`.
- https://developers.cloudflare.com/turnstile/reference/content-security-policy/ (Cloudflare Turnstile docs, checked 2026-11-26) — Minimal CSP (`challenges.cloudflare.com` for `script-src` and `frame-src`).
- https://developers.cloudflare.com/turnstile/plans/ (Cloudflare Turnstile docs, checked 2026-11-26) — Free unlimited challenges usable without other Cloudflare services.
- https://docs.hcaptcha.com/ (hCaptcha docs, checked 2026-11-26) — `localhost` prohibition, 120 s tokens, and wider CSP footprint evaluated in Alternatives.
- https://developers.google.com/recaptcha/docs/v3 and https://docs.cloud.google.com/recaptcha/docs/compare-tiers (Google reCAPTCHA docs, checked 2026-11-26) — Score-based model and 10,000/month free cap evaluated in Alternatives.
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — Account-keyed counters, lockout DoS, progressive backoff, and generic messages.
- https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — Distributed proxy rotation defeating per-IP limits; client-side defenses are spoofable.
- https://pages.nist.gov/800-63-4/sp800-63b.html (NIST SP 800-63B-4, checked 2026-11-26) — Maximum 100 consecutive failures ceiling; bot challenge + growing waits against malicious lockout.
- https://github.com/OWASP/ASVS/blob/master/5.0/en/0x15-V6-Authentication.md (OWASP ASVS 5.0, checked 2026-11-26) — 6.1.1 / 6.3.1 documented anti-automation preventing malicious lockout; 6.3.8 account enumeration.
- https://laravel.com/docs/13.x/routing#rate-limiting and https://laravel.com/docs/13.x/rate-limiting (Laravel 13.x, checked 2026-11-26) — `RateLimiter::for`, `after()` failure counting, atomic cache stores, and automatic `429`.
- https://www.rfc-editor.org/rfc/rfc6585.html#section-4 and https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3 (RFC 6585 / RFC 9110, checked 2026-11-26) — `429 Too Many Requests` and `Retry-After` semantics.