# ADR-10: Testing Strategy and Tools

- **Status:** Proposed (awaiting user approval)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §7, §8 (item 10: Testing), Spec Testing Decisions (Layers 1–6), D6

---

## Context

`AGENTS.md` §7 requires maintainable tests covering important behavior, keeping mock data strictly inside tests, and backing every shipped feature with the real API. `docs/spec/mvp-spec.md` ("Testing Decisions") defines six mandatory test layers:

1. **Layer 1 (Unit):** Pure shared modules (`httpClient`, all 12 `AppError` kinds, pagination `P1`–`P4`, 4-format date parser, capability map, safe-URL helper, return-path sanitiser).
2. **Layer 2 (Component & screen — primary seam):** Rendered routes with network-boundary HTTP mocking covering all 5 view states (`loading`, `empty`, `error`, `401`, `403`, `404`, `success`), role gating, contract-only mutation payloads, `422` field mapping + focus, `429` messaging, duplicate-submit guard, optimistic Kanban rollback, and automated accessibility checks.
3. **Layer 3 (Integration):** Multi-screen workflows (sign in -> reload restore -> sign out; mid-session `401` -> return path; Forgot -> Verify with fake timers -> Reset -> Sign in; Project create -> list; Task create -> details -> edit -> delete confirmation; multi-tab sign-out broadcast).
4. **Layer 4 (End-to-end acceptance):** Real-backend Playwright runs against the Vercel Preview deployment (`AGENTS.md` §9) for Admin and Project Manager (read-only flows immediately; write flows only after explicit user approval of test accounts/naming/cleanup; Team Member explicitly tracked as unverified per `D6`).
5. **Layer 5 (Security checks):** UI auth gating + forced `403`, ESLint `dangerouslySetInnerHTML` ban, zero token/OTP/email in URLs or `console`, full session clearing on logout/`401`/reset, unsafe URLs rendered as text, build output secret check, CI `npm audit`, and clean CSP report-only pass.
6. **Layer 6 (Regression):** Any edit to shared surfaces (`WI-3`..`WI-6`) reruns the full Layers 1–3 suite in CI on every PR.

---

## Decision

Adopt a unified Vite-native testing stack:

- **Unit, Component & Integration runner:** **Vitest `5.1.2`** + **`jsdom` `31.0.1`**
- **DOM queries & assertions:** **`@testing-library/react` `16.3.3`** + **`@testing-library/dom` `10.4.2`** + **`@testing-library/user-event` `14.6.13`** + **`@testing-library/jest-dom` `8.0.0`**
- **Network-boundary mocking:** **MSW `3.0.8`** (`msw/http`, `msw/node`)
- **Automated accessibility:** **`axe-core` `4.14.1`** directly in Vitest/jsdom (`axe.run(container)`) + **`@axe-core/playwright` `4.14.1`** (`AxeBuilder`) in Playwright E2E
- **End-to-end acceptance:** **`@playwright/test` `1.65.1`**

### 1. Stack alignment & compatibility (verified `2026-11-26`)

- `vitest@5.1.2` declares `vite: ^6.4 || ^7 || ^8` as a peer, sharing the exact Vite `8.4.0` config, path aliases (`@/*`), and Oxc transform pipeline with zero duplicate Babel/ts-jest setup.
- `@testing-library/jest-dom@8.0.0` explicitly pairs with `vitest >=5 <6` and `@testing-library/dom >=10 <11`.
- `msw@3.0.8` runs natively on Node `>=22.12` (matching our Node `>=22.22.2` floor). Uses v3 entry points (`import { http, HttpResponse } from 'msw/http'`, `import { setupServer } from 'msw/node'`) and `server.listen({ onUnhandledFrame: 'error' })` (renamed from `onUnhandledRequest` in MSW v3) in `beforeAll`, `server.resetHandlers()` in `afterEach`, and `server.close()` in `afterAll`.
- **Direct `axe-core@4.14.1` instead of `vitest-axe@0.1.0`:** Registry inspection revealed `vitest-axe@0.1.0` is an unmaintained wrapper pinned to legacy `axe-core ^4.4.2`. Calling `axe-core@4.14.1` directly via a tiny shared `expectNoA11yViolations(container)` helper in `src/test/a11y.ts` stays up to date with WCAG 2.2 rules and avoids stale transitive dependencies, while `@axe-core/playwright@4.14.1` runs full real-browser WCAG AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) audits including computed color contrast (which jsdom cannot measure).

### 2. Layer mapping & testing conventions (`WI-3` scaffolding)

- **Query by user-facing semantics:** Always prefer `getByRole`, `getByLabelText`, `getByText`; reserve `data-testid` strictly as a last resort (`testing-library.com`). Never test internal React state or private hook internals.
- **Strict fixture sanitation (`AGENTS.md` §7, `ID-12`):** All MSW fixtures live under `src/test/fixtures/` (never imported by production code) and contain **only** fields recorded as `VERIFIED` or `DOCUMENTED` in `docs/api/plain.md` with obvious synthetic placeholders (`user@example.test`, fake tokens). Tests never assert `UNVERIFIED` fields as present.
- **Fake timers for OTP flows:** Layer 3 tests for Verify OTP 10-minute expiry and 60-second resend cooldown use `vi.useFakeTimers()` cleanly scoped inside the test with `vi.useRealTimers()` cleanup.
- **Fresh QueryClient per test:** Shared `renderWithProviders` helper in `src/test/render.tsx` constructs a new `QueryClient({ defaultOptions: { queries: { retry: false } } })` and `createMemoryRouter(...)` per test so cache state never leaks between test cases.
- **Playwright E2E (`Layer 4`):** Runs in the cloud CI environment against the Vercel Preview URL (`BASE_URL`), reading test credentials strictly from cloud/CI secret env vars (never committed, never logged). Read-only acceptance suites run first; write-based acceptance tests remain marked skipped/pending until the user approves test accounts, naming prefixes, and cleanup (`mvp-spec.md` Testing Decisions).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Jest + `ts-jest` / Babel** | Traditional Jest test runner configured separately from Vite. | **Rejected.** Requires maintaining a separate TypeScript/ESM transform pipeline (`ts-jest` or Babel) alongside Vite 8 / Rolldown, slower execution, and friction with native ESM packages like MSW 3 and React Router 8. |
| **2. Cypress for E2E** | Browser E2E testing with Cypress instead of Playwright. | **Rejected.** Playwright `1.65.1` provides faster parallel execution across Chromium/Firefox/WebKit, first-class multi-tab/context support (needed for `BroadcastChannel` sign-out E2E verification), built-in trace viewer, and official `@axe-core/playwright` integration. |
| **3. Vitest Browser Mode only (dropping jsdom)** | Run all Layer 2–3 component and integration tests in real headless browsers via `@vitest/browser-playwright`. | **Rejected for MVP.** Slower startup and heavier CI resource usage when 4 parallel agents run hundreds of component tests during a 2-day sprint. Pairing fast `jsdom` Layers 1–3 with real-browser Playwright + `@axe-core/playwright` Layer 4/5 gives both rapid feedback and real-browser layout/contrast verification. |
| **4. `vitest-axe@0.1.0` wrapper** | Use `vitest-axe` for Vitest matcher sugar. | **Rejected.** Unmaintained `0.1.0` package pulling outdated `axe-core ^4.4.2`; a 10-line helper calling `axe-core@4.14.1` directly is simpler and keeps WCAG rules current. |

---

## Consequences

### Positive
- Single Vite 8 config shared across dev, build, and Vitest 5 tests with zero transform drift.
- Network-boundary MSW 3 tests validate the real HTTP client, envelope parsing, TanStack Query caching/rollback, and forms end-to-end without mocking internal hooks.
- Covers all 6 spec test layers including automated WCAG AA checks in both jsdom and real Playwright browsers.

### Negative
- `jsdom` does not compute real CSS layout or color contrast (and requires lightweight polyfills if `<dialog>.showModal()` edge cases arise in jsdom `31.0.1`); real-browser dialog focus, contrast, and responsive checks are verified in Playwright Layer 4/5.
- Write-based E2E and Team Member acceptance (`D6`) remain gated on external approvals/credentials.

### Accepted Residual Risk
- Automated `axe-core` catches ~30–50% of WCAG issues; manual keyboard and screen-reader verification at Gate 1 and Gate 2 complements automated scans.

### Backend Dependencies
- Layer 4 write-based acceptance depends on user approval of backend test accounts/cleanup; Team Member acceptance depends on `D6`.

---

## Sources

- https://vitest.dev/blog/vitest-5 (Vitest 5.1.2, peer `vite ^8`, checked 2026-11-26) — Vitest 5 release and Vite 8 compatibility.
- https://vitest.dev/guide/environment (Vitest 5.1.2, checked 2026-11-26) — `jsdom` environment configuration vs Browser Mode.
- https://testing-library.com/docs/guiding-principles and https://testing-library.com/docs/react-testing-library/intro/ (`@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, checked 2026-11-26) — Role/label querying principles and React 19 peer compatibility.
- https://mswjs.io/docs/integrations/node and https://mswjs.io/docs/migrations/2.x-to-3.x (MSW 3.0.8, checked 2026-11-26) — Vitest server lifecycle, `msw/http` imports, `onUnhandledFrame`, and Node `>=22.12`.
- https://playwright.dev/docs/intro and https://playwright.dev/docs/accessibility-testing (`@playwright/test` 1.65.1, `@axe-core/playwright` 4.14.1, checked 2026-11-26) — Playwright Test features and `AxeBuilder` WCAG audits.
- https://github.com/dequelabs/axe-core (`axe-core` 4.14.1, checked 2026-11-26) — Direct `axe.run()` API for jsdom checks.
- https://github.com/chaance/vitest-axe (`vitest-axe` 0.1.0, checked 2026-11-26) — Inspected and rejected due to stale `axe-core ^4.4.2` dependency.