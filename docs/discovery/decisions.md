# Discovery decisions

Decisions the user has confirmed during the discovery interview. Facts found in the sources are in the other files in this folder; this file records only what the user decided.

## D1. MVP scope (confirmed)

**Tier 1: mandatory for the first release.** Every feature must work end to end against the real backend API.

- Authentication and password recovery: login, register, forgot password, verify code, reset password.
- Role-aware application shell and navigation.
- Dashboard.
- Projects: list, details, create, edit.
- Tasks and Kanban, including status changes.
- User profile.

**Tier 2: secondary.** Starts only after Tier 1 is complete, integrated, and tested.

- Meetings and AI summaries.
- Notifications, refreshed by polling.
- Team management.
- Project files.
- Global search.

**Out of scope for the MVP:** real-time chat, Google sign-in, AI Assistant, reports, administration (user management, system settings, audit logs).

**Rules:**

1. Tier 1 takes absolute priority over all other features.
2. Integration quality comes before screen count.
3. Tier 1 uses real API endpoints only, with no fake data or simulated responses.
4. When an endpoint is unavailable or its contract is unclear, document the blocker instead of inventing behavior.
5. Tier 2 never delays Tier 1.
6. The architecture stays extensible, so excluded features can be added later without major refactoring.

## D2. Role-based UI permissions (confirmed)

The server returns `user.roles` as an array of role-name strings and an empty `user.permissions` array for every role (verified for Administrator and Project Manager). The frontend therefore keeps one client-side map from role to capability, in a single shared module.

| Action | Administrator | Project Manager | Team Member |
|---|---|---|---|
| View dashboard, projects, tasks | yes | yes | yes |
| Create / edit project | yes | yes | no |
| Delete project | yes | no (the API also allows the project's creator) | no |
| Create / edit / delete task | yes | yes | no |
| Change task status on Kanban | yes | yes | yes |

- The map only shows or hides UI. The server is the final authority.
- Every mutation handles 403 with a clear permission message and rolls back any optimistic change (for example a moved Kanban card).
- The Team Member column stays unverified until a Team Member account can be probed.

## D3. Tier 1 UI missing from Figma (confirmed)

1. **Visual source:** derive missing Tier 1 screens and states from existing Figma components, tokens and patterns. No new visual design system.
2. **Behaviour and wording:** take workflows, validation behaviour and user-facing text from the reference site where it has them.
3. **The API contract wins:** the real backend decides which fields, actions and data structures exist. A reference-site behaviour that conflicts with the API is dropped.
4. **Labelling:** every derived screen or state is marked `Derived — Not in Figma`, with its source components, reference behaviour and API endpoints.
5. **Scope of derivation:** password recovery (Forgot Password → Verify OTP → Reset Password), password confirmation on Sign up, Edit Project (from the New Project modal), Task Details (API-supported fields and actions only), the user menu with sign-out through `POST /auth/logout`, and the loading, empty, error, unauthorized and permission-denied states.
6. **API/UI mismatches:** kept in an explicit register. Examples: single assignee per task, no persistent task start date, no progress %, comment count or reviewer shown without a verified source, and backend enum values instead of sample labels.
7. **Responsive behaviour:** documented as derived requirements. The Figma file has desktop screens only.

Specs: `figma.md` §12 (derived designs) and `screen-feature-map.md` (API mapping and mismatch register).

## D4. Typography (confirmed)

1. **Inter** is the only font family for application text: dashboards, navigation, forms, tables, modals, cards and profile settings.
2. **Rubik** is kept only for the "Collabspace" wordmark. Figma renders the wordmark as live text (Rubik Regular 20/16, `#000712`, navbar `1:11557` and auth screens), not as an image asset, so it stays text in Rubik Regular 400. If a logo asset is introduced later, that asset replaces the text.
3. **Plus Jakarta Sans** is removed. The Profile settings frame `1:11983` is mapped to Inter equivalents.
4. Sizes, weights, line heights and hierarchy follow the approved Figma Inter text styles (`figma.md` §9.2). The full mapping from Rubik and Plus Jakarta Sans usages is in `figma.md` §12.12.
5. Load only what is used: Inter weights 400, 500, 600 and 700, normal style, latin subset; Rubik 400 only. No italics. Figma's two Extra Bold (800) usages map to 700. The loading mechanism (for example a self-hosted variable font or a framework font loader) is chosen in the architecture research under AGENTS.md §1 and §4.
6. Typography is the same across all features and every responsive width. Responsive changes affect layout, not type styles, except where `figma.md` §12.11 says so.

Resolves mismatch M29.

## D5. People-picker data sources (confirmed)

1. **Task assignee** (Create Task, Edit Task, Task Details reassign):
   - Options are the project's `direct_members` from `GET /projects/{id}/overview` plus the `members[]` of every team in `GET /projects/{id}/teams`, deduplicated by user `id`.
   - Options load only when the picker opens. Type-to-filter runs on the client.
   - Each option shows the avatar, falling back to initials because `avatar_url` is often null, then the name, then `job_title` or `role_in_team` when present.
   - Single select (M11).
2. **New Project members:**
   - `GET /users` with debounced server search (`search=`) and `per_page=20`.
   - Documented fallback: if `search` turns out to be ignored, filter the loaded pages on the client.
   - Only Administrators and Project Managers create projects (D2). A Project Manager can read `/users` (verified, `api-authenticated-shapes.md` §8).
3. **Unverified until the API documentation phase check (D10):** whether `search` is honoured on `/users`, and the maximum allowed `per_page`.

Resolves mismatch M28.

## D6. Team Member verification (confirmed: option C)

- The Team Member column of D2 stays an **explicitly unverified assumption**. Planning uses the verified Administrator and Project Manager results.
- Neither of the conflicting Team Member credential sets in the Postman collection is used. No other account is requested now.
- Verifying Team Member behaviour is a **required Tier 1 acceptance-test item**.
- Documentation, specs and tickets never present Team Member behaviour as confirmed backend behaviour.

## D7. Out-of-scope and Tier 2 entry points inside Tier 1 screens (confirmed)

- **Hidden in the MVP:**
  - the Chats and Reports navbar items;
  - the Dashboard Ask AI card (the Upcoming meetings card widens to fill row 3);
  - the "View All" links on Upcoming meetings and Recent Files, until their Tier 2 pages ship;
  - global search and the notification bell, until their Tier 2 features ship.
- **Shown read-only:** the Dashboard Upcoming meetings and Recent Files sections, using the existing `GET /dashboard` response only, with no extra requests.
- **Rule:** no dead links, fake data or non-functional features are shown.

## D8. Language (confirmed)

- The MVP is English only and left-to-right only. The auth language selector is hidden.
- User-facing strings are kept organised per feature so translations can be added later. No internationalisation library is installed now.
- Arabic and French support is deferred to a future phase.

Resolves mismatch M3.

## D9. Delete actions (confirmed)

- **Task deletion is in Tier 1.** It needs a confirmation dialog (`figma.md` §12.7), respects D2 (Administrator, Project Manager) and server authorisation, and handles 403 and other errors (§12.10).
- **Project deletion is excluded from the MVP** and deferred to a future feature. It is not offered as an MVP action, even though D2 lists who may perform it.

## D10. Remaining API checks (confirmed: deferred)

One consolidated, read-only verification session runs **in the API documentation phase**, as the Project Manager only (no Team Member authentication), under the security rules already approved. Use GET wherever possible, and create, update or delete nothing. It covers:

- `/users` search behaviour and the maximum `per_page`;
- whether Dashboard file `download_url` links need Bearer authentication;
- the actual Kanban column `name` values;
- the actual 403 response structure;
- the list response shapes for notifications, meetings and files (Tier 2 documentation).

## D11. Recorded assumptions (confirmed, with verification status)

| # | Assumption | Status |
|---|---|---|
| A1 | **Tier 2 permissions:** the reference site's role map (meeting scheduling, team management, file upload and delete) is provisional. | **Unverified.** Confirm the real authorisation before Tier 2 implementation tickets. |
| A2 | **Auth errors:** every 401 clears the local session and redirects to sign in. A 429 shows a clear rate-limit message. | Behaviour decided. **Token lifetime, `remember` behaviour and rate-limit configuration are unknown.** |
| A3 | **Responsive layouts:** the derived rules in `figma.md` §12.11 are provisional requirements, labelled derived because Figma has desktop designs only. | Derived, provisional |
| A4 | **Dashboard chart:** use only values the Dashboard API returns. `project_overview.data[]` has verified integer fields `projects`, `created_tasks` and `completed_tasks` per month. The Project Overview tab's `chart.data[]` has verified `created_tasks`, `completed_tasks` and `progress_percentage`. The tasks-created / tasks-completed series is therefore supported. | Verified field support (Admin, PM) |
| A5 | **Profile tasks grouping (M22):** To do = `Pending`, `In Progress`, `In Review`; Done = `Completed`. Uses the verified `status` field of `/auth/profile/tasks`. | Derived, uses verified fields |
| A6 | **Kanban interaction:** a status selector is mandatory and must work. Drag-and-drop is optional and must not delay Tier 1. | Decided |
| A7 | **Postman collection security:** the collection file is never committed to the public repository. Its exact filename is in `.gitignore`. The local copy is never modified or deleted. No credentials or tokens are copied into documentation, issues, logs or commits. | In force |
| A8 | **Future features:** Reverb chat, Google sign-in, AI Assistant, reports and administration stay outside the MVP. The architecture stays extensible without building them. | Decided |

---

## Discovery status: **COMPLETE**

Product discovery closed after decisions D1–D11. The handoff is in `HANDOFF.md`. The next phase is API documentation (`docs/api/plain.md`); see the roadmap in the handoff.
