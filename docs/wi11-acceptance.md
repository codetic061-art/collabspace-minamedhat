# WI-11 acceptance evidence

The matrix retains evidence from integrated head `bbcd278c9358fe01bf29616b57bc212a10074b0b` and subsequent correction runs. `PASS` means the named evidence was exercised. `BLOCKED` means the required evidence is unavailable, even when fixture-backed tests or read-only checks passed. No credentials, tokens, OTPs, email addresses or personal data belong in this report.

Evidence anchors:

- [Correction CI run 46057960450](https://github.com/codetic061-art/collabspace-minamedhat/actions/runs/46057960450) passed 109 unit and integration tests, one smoke test and nine Preview tests on `4af9676a58751a012023ff7623e86756beaf96b4`. Initial JavaScript was 121.24 KB gzip.
- [Correction review rerun 46052770056 attempt 3](https://github.com/codetic061-art/collabspace-minamedhat/actions/runs/46052770056/attempts/3) passed 105 unit and integration tests, one smoke test and nine Preview tests on `0c1139ed00e5634698d2d7fc37ed45f87bf87078`. The initial bundle was 121.21 KB gzip. Later corrections require their own run.
- [exact-head CI run 46041554260](https://github.com/codetic061-art/collabspace-minamedhat/actions/runs/46041554260) passed verify, e2e and preview-verify.
- The `preview-evidence` artifact contains the sanitized fixture screenshots and browser checks.
- `wi11-real-read` exercised Administrator and Project Manager sign-in, Dashboard, reload/session restore, Projects, Tasks, Profile, sign-out and the old-token 401 response against the real API. It used GETs plus login/logout only; no live record was created or changed.

The run covered 24 unit/integration test files (87 tests), one smoke test and nine Preview tests. Initial JavaScript was 121.03 KB gzip against the unchanged 140 KB budget. Team Member acceptance remains blocked by missing credentials (D6). Live mutations and nullable-field clearing remain blocked because no dedicated test accounts or mutation permissions were established.

## Shared-surface record (Gate 2 finding G2-9)

These changes crossed the shared-surface ownership boundary and must be recorded on WI-11 and reviewed by the owning ticket. The commits are the integrated-tree commits containing the changes; several commits mix shared and feature work.

| Shared change                                                                                           | Reason                                                                                           | Commit(s)                                                        | Owning ticket / action                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/shared/api/httpClient.ts`, `src/shared/lib/session.ts`                                             | Ignore stale 401 handling from an older session by using a session epoch.                        | `8eb752b`                                                        | WI-5; record the owner review and retain the regression test.            |
| `src/shared/config/env.ts`, `src/shared/config/index.ts`, `src/main.tsx`                                | Defer form/Zod loading and keep public environment configuration at the app boundary.            | `509d5c9`                                                        | WI-3; record the owner review and the Zod security test.                 |
| `src/shared/tokens/tokens.css`                                                                          | Adjust shared color tokens for accessible contrast.                                              | `32111b7`, `ee5f710`                                             | WI-4; record the owner review and token rationale.                       |
| `src/shared/api/services/profile.service.ts`                                                            | Preserve nullable profile clearing by serializing a cleared value as an empty string.            | `f744a77`                                                        | WI-5; record the service-level serialization test.                       |
| `vite.config.ts`                                                                                        | Keep feature modules in route chunks through the `moduleSideEffects` configuration.              | `910a326`, `65a12fd`, `452e8bc`                                  | WI-3; record the bundle-budget and route-chunk review.                   |
| `.github/workflows/ci.yml`, `.github/workflows/wi11-format-temp.yml`                                    | Add integrated Preview coverage, protect authenticated artifacts and run cloud formatting.       | `f3b9dfc`, `f1ef63d`, `90fcf37`, `7d2f55e`, `9360c1e`, `5282865` | WI-3/WI-11; record the workflow ownership and sanitized-artifact review. |
| `src/app/AppShell.tsx`, `src/app/Navbar.tsx`                                                            | Integrate the authenticated shell and accessible user-menu presentation.                         | `f3b9dfc`, `f1ef63d`, `f1e394e`, `7f42ea8`, `17f2c6e`, `bbcd278` | WI-6; record the owner review.                                           |
| `src/features/auth/context/SessionContext.tsx`                                                          | Schedule session restoration, guard stale sessions and refresh profile data in the background.   | `8eb752b`, `54826c4`, `84a3a62`, `aba110b`                       | WI-6, with the shared session portion reviewed by WI-5.                  |
| `src/shared/ui/ConfirmDialog.tsx`, `Input.tsx`, `Select.tsx`, `Tabs.tsx`, `Avatar.tsx`, `modalFocus.ts` | Correct descriptions, field errors, keyboard tab stops, avatar semantics and nested modal focus. | `aba110b`, `8cf8f21`, `479f0b4`, `dac592d`                       | WI-4; regression checks in shared UI tests.                              |
| `src/main.tsx`                                                                                          | Initialize Zod security configuration before application imports.                                | `aba110b`                                                        | WI-3/WI-5; retain configuration regression coverage.                     |

## Major feature criteria

| Criterion                                                                       | Status  | Evidence or remaining check                                                                            |
| ------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| Sign-in success, invalid credentials and field-level 422                        | PASS    | Real Admin/PM sign-in in `wi11-real-read`; fixture invalid/422 states in `preview-evidence`.           |
| Sign-up confirmation, signed-in result and taken-email error                    | BLOCKED | Fixture flow is covered; real registration is a write and has no authorized test account.              |
| Forgot Password uniform success path                                            | BLOCKED | Fixture recovery path is covered; real recovery evidence is unavailable.                               |
| Verify Code validation, expiry, resend and server errors                        | BLOCKED | Fixture states are covered; authorized recovery testing is unavailable.                                |
| Reset Password validation and success notice                                    | BLOCKED | Fixture states are covered; password reset is a live mutation.                                         |
| Reload restores session; 401 redirects and returns to original page             | PASS    | `wi11-real-read` passed the Admin/PM reload, `/auth/me`, sign-out and old-token 401 sequence.          |
| Sign-out calls logout, clears session on network failure and returns to Sign in | PASS    | Real logout and old-token 401 passed; network-failure and multi-tab variants remain outside this run.  |
| Navbar contents, active state and excluded items                                | PASS    | Fixture screenshots in `preview-evidence`.                                                             |
| User menu name and role, keyboard operation and drawer below 1024px             | PASS    | Fixture keyboard check plus responsive Preview checks at 1440, 1024, 768 and 360px.                    |
| One Dashboard request feeds independent section states                          | PASS    | Dashboard network check and fixture state checks in the CI run.                                        |
| Dashboard exclusions and absent links                                           | PASS    | Fixture screenshots in `preview-evidence`.                                                             |
| Dashboard status and priority labels match API                                  | PASS    | Dashboard fixture/API shape checks in the CI run.                                                      |
| Projects server pagination, search, filter, sort and reload persistence         | PASS    | Fixture-backed Projects checks and real read-only Projects navigation; mutation is separately blocked. |
| Add Project role visibility                                                     | PASS    | Fixture role/capability checks in `preview-evidence`.                                                  |
| Project create and edit fields and date validation                              | BLOCKED | Form tests are fixture-backed; authorized live writes are unavailable.                                 |
| Project 403 and not-found states                                                | PASS    | Fixture error-state checks in `preview-evidence`.                                                      |
| Project overview fields, omitted Project Type and Leader tags                   | PASS    | Fixture comparison plus read-only Projects flow.                                                       |
| Kanban four status columns, including empty columns                             | PASS    | Read-only real API Tasks navigation and fixture board checks.                                          |
| Optimistic status move, rollback and 403                                        | BLOCKED | Simulated 403/500 rollback is covered by tests; live status mutation is not authorized.                |
| Create task status, assignee and fields                                         | BLOCKED | Fixture form checks pass; live task creation is unavailable.                                           |
| Shareable Task Details link and verified fields                                 | PASS    | Fixture deep-link and task-dialog checks in `preview-evidence`.                                        |
| Task edit, reassign and delete permissions and confirmation                     | BLOCKED | Fixture dialogs are covered; live mutations are unavailable.                                           |
| Tasks project selection, persistence and client filters                         | PASS    | Fixture Tasks checks and real read-only Tasks navigation.                                              |
| Profile overview data from `/auth/me`                                           | PASS    | `wi11-real-read` and fixture Profile checks.                                                           |
| Profile task grouping                                                           | PASS    | Fixture grouping check and read-only Profile flow; counts are limited to the loaded page.              |
| Profile settings, avatar, password and per-field 422                            | BLOCKED | Fixture settings/422 checks pass; live writes and nullable-field clearing are unavailable.             |

## Cross-cutting, security and resilience

| Criterion                                                        | Status  | Evidence or remaining check                                                                                                                                 |
| ---------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsive layouts at 1440, 1024, 768 and 360                    | PASS    | Fixture Preview checks and overflow assertions at all four widths.                                                                                          |
| Keyboard and screen-reader operation of forms, menus and dialogs | BLOCKED | Axe checks cover sign-in and exercised Projects, Tasks and Profile states; keyboard checks cover the mobile menu and project dialog, not every form/dialog. |
| Feature data loads only when its screen is reached               | BLOCKED | Dashboard request and chart lazy-loading checks passed; all feature/network boundaries were not independently established.                                  |
| No production mock or hard-coded feature data                    | PASS    | Source review and fixture boundaries in the CI run.                                                                                                         |
| No secrets in code, build or logs                                | PASS    | Source/workflow review; authenticated artifacts are not uploaded.                                                                                           |
| No token, password, OTP or email in URLs, console or analytics   | PASS    | Sanitized Preview and real-read workflow checks; no credentials or private screenshots are published.                                                       |
| Logout, 401 and password reset clear sessions across tabs        | BLOCKED | Logout/401 passed for Admin/PM; multi-tab and authorized password-reset verification remain unavailable.                                                    |
| Neutral shell during protected-page reload                       | PASS    | Authenticated Preview reload check.                                                                                                                         |
| ID-19 error behavior, sanitized 5xx and no mutation retries      | PASS    | Unit/integration and fixture error-path tests in the exact-head CI run.                                                                                     |
| Duplicate submissions prevented                                  | PASS    | Form interaction tests in the exact-head CI run.                                                                                                            |
| API-derived links reject non-HTTPS schemes                       | PASS    | Security checks in the exact-head CI run.                                                                                                                   |
| No `dangerouslySetInnerHTML`                                     | PASS    | Source and lint checks in the exact-head CI run.                                                                                                            |
| CSP and security headers present, main flows without violations  | BLOCKED | Headers are present in Report-Only mode; enforcement still requires the Gate 2 decision and the L-1 avatar-host precondition.                               |
| No bot-protection widget before BR-5 confirmation                | PASS    | Source and Preview checks show no unapproved widget.                                                                                                        |

## Gate 1 carryovers and WI-11 delivery

Finding D's documentation correction is present in `docs/api/plain.md` and `docs/discovery/api-authenticated-shapes.md`. The owner waived the remaining review sequence on #12.

| Requirement                                                                        | Status  | Evidence or remaining check                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finding C: Admin and PM login, reload, protected route, sign-out and old-token 401 | PASS    | `wi11-real-read` passed on run 46041554260 for both roles.                                                                                                                              |
| L-1 avatar host vs `img-src`                                                       | BLOCKED | Record as a Production precondition in ADR-12 and verify the actual avatar host before enforcing CSP.                                                                                   |
| L-2 ADR-12 Report-Only wording                                                     | PASS    | ADR-12 explicitly states that no `report-to`/`Reporting-Endpoints` collector is configured and names browser-console/Playwright evidence.                                               |
| L-3 `engines.node` vs ADR-11                                                       | PASS    | ADR-11 now records the existing Node `24.x` runtime and CI constraint.                                                                                                                  |
| L-4 accessibility polish                                                           | PASS    | Dialog descriptions, avatar groups, tabs, standalone field errors, and nested focus are covered by tests in cloud run 46052419224.                                                      |
| L-5 menu focus reset                                                               | PASS    | Navbar menu items are stable across renders; the cloud unit and integration suite passed in run 46052419224.                                                                            |
| L-6 wordmark color                                                                 | PASS    | Navbar wordmark uses the corrected D4/§12.12 color styling.                                                                                                                             |
| L-7 stale 401                                                                      | PASS    | Session-epoch guard is present and tested.                                                                                                                                              |
| L-8 workflow input interpolation                                                   | PASS    | `preview-verify.yml` uses the corrected workflow input handling.                                                                                                                        |
| L-9 bundle headroom                                                                | PASS    | 121.03 KB gzip is below the unchanged 140 KB budget.                                                                                                                                    |
| L-10 labels                                                                        | BLOCKED | The label recommendations are listed below; no labels were changed by this documentation update.                                                                                        |
| Final Figma fidelity                                                               | BLOCKED | Main Dashboard, Projects, Tasks, Profile and sign-in comparisons were exercised; full state-by-state fidelity is not established.                                                       |
| WI-11 test-data cleanup                                                            | BLOCKED | No live records were created, but test-account authorization and cleanup rules remain unresolved.                                                                                       |
| Team Member acceptance                                                             | BLOCKED | Credentials are unavailable under D6; do not mark this as passed.                                                                                                                       |
| Integrated exact-commit CI and Preview                                             | PASS    | Run 46041554260 and its `preview-evidence` artifact passed.                                                                                                                             |

## Actionable low-priority documentation notes

- Profile Tasks grouping is page-local: the current `/auth/profile/tasks` page is split into To do and Done, so counts must not be presented as global totals unless the feature paginates each group.
- The Tasks tab is implemented by the WI-9 board export; stale comments describing it as hidden were removed.
- L-1 is a deployment precondition, not a reason to claim CSP enforcement: the actual avatar host must be confirmed and added only if it is an approved origin.

## Delivery exception

The owner has authorized an exception to the remaining gate sequence and waived another review after automated verification. The exception is recorded on [#12](https://github.com/codetic061-art/collabspace-minamedhat/issues/12#issuecomment-7226670218) and [#13](https://github.com/codetic061-art/collabspace-minamedhat/issues/13#issuecomment-7226668764). The earlier review decisions are preserved. Closing issues under that exception does not change the blocked verification results above.
