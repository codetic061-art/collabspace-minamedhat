# ADR-12: Browser Security Headers, CSP, and Vercel Deployment

- **Status:** Proposed (awaiting user approval)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §8, §9, §10, Spec ID-20.5, Further Notes ("Deployment environment")

---

## Context

`AGENTS.md` §9 and `docs/spec/mvp-spec.md` fix the deployment platform to **Vercel** (Preview deployments for PRs, reviews, and real-backend E2E checks; Production deployment strictly after Gate 2 approval **and** explicit user consent; the owner's physical machine is never a host).

Because `ADR-01` stores the Sanctum Bearer token client-side in Web Storage (`sessionStorage` / `localStorage` on Remember Me), browser security headers — especially a strict HTTP-header Content Security Policy (`script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`) — are a **mandatory mitigation** (`ID-20.1` Mitigation #1, `ID-20.5`). In addition, a static Vite 8 SPA on Vercel requires:

1. SPA fallback rewrites so direct visits or reloads on `/projects/42` or `/profile/settings` serve `/index.html` instead of HTTP `404`.
2. Correct cache headers so `index.html` is never served stale while content-hashed `/assets/*` bundles cache immutably (`vite.dev/guide/build`).
3. Strict referrer protection (`no-referrer`) on password-recovery routes (`OWASP Forgot Password Cheat Sheet`).
4. Accurate `style-src` analysis: Tailwind CSS v4 compiles to a static stylesheet (needing no inline styles), **but** `recharts@3.11.1` sets runtime inline `style` attributes on `ResponsiveContainer`, SVG nodes, and dynamic `Tooltip` containers, and progress bars set dynamic inline `width` styles.

---

## Decision

Deploy CollabSpace as a **static Vite SPA on Vercel** configured via a committed root **`vercel.json`** (owned by `WI-3`), enforcing full security headers, path-specific caching, and a phased **Report-Only -> Enforcing CSP rollout**.

### 1. Rewrites & Caching (`vercel.json`)

- **SPA fallback rewrite:** Route non-file paths to `/index.html` (excluding `/assets/(.*)` so missing stale hashed chunks return a clean `404` and trigger `vite:preloadError` recovery in `ADR-07` instead of silently returning HTML with a JS MIME error):
  ```json
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
  ```
- **Caching headers:**
  - `/assets/(.*)`: `Cache-Control: public, max-age=31536000, immutable` (Vite content-hashed JS/CSS/woff2 assets).
  - `/index.html` and HTML route responses: `Cache-Control: no-cache` so browsers always revalidate the entry HTML and discover new chunk hashes immediately after deploys.

### 2. HTTP Security Headers (`vercel.json`)

Applied globally on `/(.*)` over HTTPS:

| Header | Value | Rationale |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | ASVS 3.4.1 (≥ 1 year + subdomains); prevents HTTPS downgrade. |
| `X-Content-Type-Options` | `nosniff` | ASVS 3.4.4; stops MIME sniffing of responses/downloads. |
| `X-Frame-Options` | `DENY` | Legacy clickjacking fallback alongside CSP `frame-ancestors 'none'`. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (default); overridden to **`no-referrer`** on `/forgot-password`, `/verify-code`, `/reset-password` | ASVS 3.4.5 + OWASP Forgot Password guidance. Because SPA client navigations do not reload the HTML document, the auth route layout also syncs `<meta name="referrer" content="no-referrer">` on recovery routes and restores `strict-origin-when-cross-origin` on exit. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused sensitive browser APIs (`security.md` §5.3). |
| `Cross-Origin-Opener-Policy` | `same-origin` | ASVS 3.4.8; isolates browsing context group. |

### 3. Content Security Policy (phased rollout)

- **Initial header on Preview (`WI-3` through Gate 2 verification):** **`Content-Security-Policy-Report-Only`** so any unintended violation surfaces in browser consoles and Playwright Layer 5 checks (`ID-20.5`, Testing Decisions Layer 5) without silently breaking development previews.
- **Promotion gate:** Once Layer 5 security tests and Gate 2 confirm **zero unexpected CSP violations** across all Tier 1 flows on Vercel Preview, switch the header key from `Content-Security-Policy-Report-Only` to enforcing **`Content-Security-Policy`** prior to Production deployment.
- **Exact policy directives:**
  ```text
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://collabspace.huma-volve.com;
  img-src 'self' data: blob: https://collabspace.huma-volve.com;
  font-src 'self';
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
  form-action 'self';
  upgrade-insecure-requests
  ```
- **Directive notes:**
  - `script-src 'self'`: Strictly bans `'unsafe-inline'`, `'unsafe-eval'`, `data:`, and third-party script origins. `WI-3` verifies that Vite's production `index.html` emits zero inline `<script>` tags.
  - `style-src 'self' 'unsafe-inline'`: Tailwind CSS v4 itself ships a static `.css` file and requires no `'unsafe-inline'`; however, `recharts@3.11.1` mutates inline `style` attributes dynamically for responsive sizing and tooltip coordinates, and dynamic progress bars use inline `style={{ width }}`. Because `script-src` remains strictly `'self'`, `'unsafe-inline'` in `style-src` does not permit script execution. If a future audit replaces dynamic inline styles with CSS custom properties/static classes, `'unsafe-inline'` can be removed from `style-src`.
  - `font-src 'self'`: Enabled by self-hosted Fontsource fonts (`ADR-09`).
  - **Future Turnstile extension (`ADR-13`):** Add `https://challenges.cloudflare.com` to `script-src` and `frame-src` **only** when backend `BR-5` ships and the Turnstile feature flag is enabled.
  - **Future Reverb extension (`A8`):** Add the `wss:` origin to `connect-src` only when real-time chat ships post-MVP.

### 4. Vercel environments & deployment governance (`AGENTS.md` §9–§10)

- **Preview deployments:** Automatic per pull request / branch push on Vercel. Used for Gate 1 review, Gate 2 review, and Playwright Layer 4/5 real-backend checks.
- **Environment variables:** Only public `VITE_API_BASE_URL` (pointing to `https://collabspace.huma-volve.com/api/v1`) is configured in Vercel build env vars. No secrets are stored in `VITE_*`, the repository, issues, or logs.
- **Production deployment:** Strictly gated on (1) Gate 2 `APPROVED` by Claude Opus, (2) CSP promoted to enforcing, and (3) explicit user approval (`AGENTS.md` §9). No agent promotes to Production autonomously.

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Enforce `Content-Security-Policy` immediately on day 1 (no Report-Only phase)** | Ship enforcing CSP in `WI-3` without report-only verification. | **Rejected.** Prematurely enforcing CSP before Recharts, Vite asset inlining, and avatar image URLs are exercised on Preview risks masking feature bugs as cryptic blank elements during the 2-day sprint. Report-Only on Preview + mandatory clean Layer 5 audit before switching to enforcing prior to Production is industry best practice and matches `ID-20.5` / `security.md` §5.2. |
| **2. Next.js per-request nonce CSP (`'strict-dynamic'`)** | Generate cryptographic per-request nonces in Next.js `proxy.ts`. | **Not applicable (follows ADR-02).** Forces dynamic server rendering on every request, disables CDN caching, and is unnecessary when a static Vite SPA has zero inline scripts (`script-src 'self'`). |
| **3. Cloudflare Pages or self-hosted Nginx** | Host static assets outside Vercel. | **Out of scope.** The project owner fixed the hosting platform to Vercel (`AGENTS.md` §9, `mvp-spec.md` Further Notes). Note: standard Vite static output remains portable if hosting ever changes later. |

---

## Consequences

### Positive
- Satisfies `ADR-01` Mitigation #1 (`script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`) via real HTTP response headers (where `frame-ancestors` actually works, unlike `<meta>`).
- Zero stale-HTML issues after deploys (`no-cache` on `index.html`) paired with 1-year immutable edge caching on hashed `/assets/*`.
- Explicit exclusion of `/assets/` from SPA fallback prevents `text/html` MIME-type errors on stale chunks, ensuring `vite:preloadError` fires reliably (`ADR-07`).

### Negative
- `style-src` includes `'unsafe-inline'` for Recharts dynamic inline styles and dynamic widths.
- Promoting CSP from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` requires a deliberate pre-Production check (enforced at Gate 2).

### Accepted Residual Risk
- Allowing `'unsafe-inline'` in `style-src` (while keeping `script-src 'self'` strictly locked) carries minor CSS-injection risk only if untrusted style strings were ever bound; mitigated by React escaping, banning `dangerouslySetInnerHTML`, and restricting React `style` props strictly to numeric percentages/tokens.

### Backend Dependencies
- **`BR-6`:** Backend CORS origin allowlisting should include the Vercel Production and Preview origins once provisioned.
- **`BR-10`:** Backend should remove `X-Powered-By: PHP/8.3.37` on API responses.

---

## Sources

- https://vercel.com/docs/project-configuration and https://vercel.com/docs/project-configuration/vercel-json (Vercel docs, checked 2026-11-26) — `vercel.json` `rewrites` and `headers` schema for static SPAs.
- https://vercel.com/docs/headers/response-headers (Vercel docs, checked 2026-11-26) — Configuring custom HTTP security and `Cache-Control` response headers on Vercel.
- https://vercel.com/docs/deployments/environments (Vercel docs, checked 2026-11-26) — Preview vs Production deployment environments and environment-scoped variables.
- https://vite.dev/guide/build (Vite 8.4.0, checked 2026-11-26) — `Cache-Control: no-cache` on `index.html`, hashed `/assets/*`, and `vite:preloadError`.
- https://vite.dev/guide/features#content-security-policy-csp (Vite 8.4.0, checked 2026-11-26) — Vite CSP considerations and never allowing `data:` in `script-src`.
- https://github.com/OWASP/ASVS/blob/master/5.0/en/0x12-V3-Web-Frontend-Security.md (OWASP ASVS 5.0, checked 2026-11-26) — HSTS (3.4.1), CSP minimums (3.4.3), `nosniff` (3.4.4), `Referrer-Policy` (3.4.5), `frame-ancestors` (3.4.6), COOP (3.4.8).
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors (MDN current, checked 2026-11-26) — `frame-ancestors` ignored in `<meta>`, requiring HTTP headers.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src (MDN current, checked 2026-11-26) — `style-src` semantics and `'unsafe-inline'` trade-offs for JS-driven inline style attributes.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy (MDN current, checked 2026-11-26) — `strict-origin-when-cross-origin` and `no-referrer` behavior.
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html (OWASP current, checked 2026-11-26) — `Referrer-Policy: no-referrer` on password recovery screens.