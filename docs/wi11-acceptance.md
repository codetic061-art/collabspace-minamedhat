# WI-11 acceptance evidence

Status is against the **integrated Vercel Preview and real API** for both Administrator and Project Manager, as required by the MVP spec. `BLOCKED` means that the required evidence is not yet available; it does not assert that the implementation fails. Team Member acceptance is separately blocked by missing credentials (D6). No credentials or personal data belong in this report.

The integrated commit and its CI results are pending. Earlier feature-branch CI is supporting evidence only: [Tasks](https://github.com/codetic061-art/collabspace-minamedhat/actions/runs/46026336607) and [Profile](https://github.com/codetic061-art/collabspace-minamedhat/actions/runs/46026609654) passed their checks, including the existing Preview smoke workflow. That workflow did not establish authenticated Tasks or Profile behavior. Read-only API probes returned 200 for both roles on projects, Kanban, task list and details, and profile tasks; they did not prove browser workflows.

The owner authorized the prefix `COLLABSPACE_WI11_TEST_` and cleanup only for records created by the test run, but no dedicated test accounts or mutation permissions have been established. Live mutations are therefore blocked; existing user data must not be modified or deleted.

## Major feature criteria

| Criterion                                                                       | Status  | Evidence or remaining check                                                                                                   |
| ------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Sign-in success, invalid credentials and field-level 422                        | BLOCKED | Integrated real-backend browser flows not yet verified for both roles.                                                        |
| Sign-up confirmation, signed-in result and taken-email error                    | BLOCKED | Live mutation authorization and integrated browser evidence needed.                                                           |
| Forgot Password uniform success path                                            | BLOCKED | Recovery flow requires authorized test data and browser evidence.                                                             |
| Verify Code validation, expiry, resend and server errors                        | BLOCKED | Authorized recovery test and browser evidence needed.                                                                         |
| Reset Password validation and success notice                                    | BLOCKED | Authorized recovery test and browser evidence needed.                                                                         |
| Reload restores session; 401 redirects and returns to original page             | BLOCKED | Integrated browser sequence required for both roles.                                                                          |
| Sign-out calls logout, clears session on network failure and returns to Sign in | BLOCKED | Integrated browser and network evidence required.                                                                             |
| Navbar contents, active state and excluded items                                | BLOCKED | Integrated Preview comparison pending.                                                                                        |
| User menu name and role, keyboard operation and drawer below 1024px             | BLOCKED | Integrated keyboard and responsive checks pending.                                                                            |
| One Dashboard request feeds independent section states                          | BLOCKED | Integrated browser network and state verification pending.                                                                    |
| Dashboard exclusions and absent links                                           | BLOCKED | Integrated rendered comparison pending.                                                                                       |
| Dashboard status and priority labels match API                                  | BLOCKED | Integrated real-data browser comparison pending.                                                                              |
| Projects server pagination, search, filter, sort and reload persistence         | BLOCKED | Integrated real-backend browser workflow pending.                                                                             |
| Add Project role visibility                                                     | BLOCKED | Integrated role-specific browser checks pending.                                                                              |
| Project create and edit fields and date validation                              | BLOCKED | Live mutation approval and integrated browser checks needed.                                                                  |
| Project 403 and not-found states                                                | BLOCKED | Integrated browser state checks pending.                                                                                      |
| Project overview fields, omitted Project Type and Leader tags                   | BLOCKED | Integrated real-data browser comparison pending.                                                                              |
| Kanban four status columns, including empty columns                             | BLOCKED | Read-only API returned 200 for both roles; integrated rendering remains unverified.                                           |
| Optimistic status move, rollback and 403                                        | BLOCKED | Task-branch component tests covered simulated 403/500 rollback; integrated real workflow and role coverage remain unverified. |
| Create task status, assignee and fields                                         | BLOCKED | Live mutation approval and integrated browser checks needed.                                                                  |
| Shareable Task Details link and verified fields                                 | BLOCKED | Task-branch component test covers a simulated deep link; integrated Preview remains unverified.                               |
| Task edit, reassign and delete permissions and confirmation                     | BLOCKED | Live mutation approval and integrated role-specific checks needed.                                                            |
| Tasks project selection, persistence and client filters                         | BLOCKED | Integrated browser workflow pending.                                                                                          |
| Profile overview data from `/auth/me`                                           | BLOCKED | Integrated authenticated Profile browser check pending.                                                                       |
| Profile task grouping                                                           | BLOCKED | Profile-branch component test covered simulated tasks; integrated real-data browser check pending.                            |
| Profile settings, avatar, password and per-field 422                            | BLOCKED | Live mutation approval and integrated browser checks needed; nullable-field clearing remains unverified.                      |

## Cross-cutting, security and resilience

| Criterion                                                        | Status  | Evidence or remaining check                                                                                              |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Responsive layouts at 1440, 1024, 768 and 360                    | BLOCKED | Integrated screen-by-screen screenshots and comparison pending.                                                          |
| Keyboard and screen-reader operation of forms, menus and dialogs | BLOCKED | Integrated keyboard and accessibility evidence pending.                                                                  |
| Feature data loads only when its screen is reached               | BLOCKED | Integrated browser network inspection pending.                                                                           |
| No production mock or hard-coded feature data                    | BLOCKED | Integrated source and runtime verification pending.                                                                      |
| No secrets in code, build or logs                                | BLOCKED | Integrated artifact and log verification pending.                                                                        |
| No token, password, OTP or email in URLs, console or analytics   | BLOCKED | Integrated flow inspection pending.                                                                                      |
| Logout, 401 and password reset clear sessions across tabs        | BLOCKED | Integrated multi-tab verification and authorized recovery testing needed.                                                |
| Neutral shell during protected-page reload                       | BLOCKED | Integrated browser verification pending.                                                                                 |
| ID-19 error behavior, sanitized 5xx and no mutation retries      | BLOCKED | Integrated error-path verification pending.                                                                              |
| Duplicate submissions prevented                                  | BLOCKED | Integrated form checks pending.                                                                                          |
| API-derived links reject non-HTTPS schemes                       | BLOCKED | Integrated verification pending.                                                                                         |
| No `dangerouslySetInnerHTML`                                     | BLOCKED | Integrated source and lint evidence pending.                                                                             |
| CSP and security headers present, main flows without violations  | BLOCKED | Feature-branch Preview smoke is insufficient for integrated authenticated flows; CSP remains report-only pending Gate 2. |
| No bot-protection widget before BR-5 confirmation                | BLOCKED | Integrated artifact verification pending.                                                                                |

## Gate 1 carryovers and WI-11 delivery

| Requirement                                                                        | Status  | Evidence or remaining check                                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finding C: Admin and PM login, reload, protected route, sign-out and old-token 401 | BLOCKED | API login and read probes do not establish the full browser and revocation sequence.                                                                                                               |
| Finding D: API documentation evidence consistency                                  | BLOCKED | Corrections were recorded at Gate 1; integrated evidence review remains open.                                                                                                                      |
| L-1 through L-10                                                                   | BLOCKED | Each carryover needs a current integrated-tree disposition; the original list is in [Gate 1 findings](https://github.com/codetic061-art/collabspace-minamedhat/issues/12#issuecomment-7213753349). |
| Final Figma fidelity                                                               | BLOCKED | Figma context was retrieved for feature work, but complete rendered integrated comparisons are not yet evidenced.                                                                                  |
| WI-11 test data cleanup                                                            | BLOCKED | No live test records created; rules and authorization are pending.                                                                                                                                 |
| Team Member acceptance                                                             | BLOCKED | Credentials unavailable under D6.                                                                                                                                                                  |
| Integrated exact-commit CI and Preview                                             | BLOCKED | Pending integrated commit and cloud checks.                                                                                                                                                        |
