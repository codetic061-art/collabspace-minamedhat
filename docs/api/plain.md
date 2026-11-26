# CollabSpace API Contract Reference

## How to use this document

This document is the authoritative, implementer-facing API contract for CollabSpace (`https://collabspace.huma-volve.com/api/v1`). It supersedes the raw discovery inputs (`docs/discovery/api-authenticated-shapes.md`, `docs/discovery/openapi-vs-postman.md`, `docs/discovery/api-inventory.md`, and `docs/discovery/api-probe.md`) for day-to-day frontend implementation; those files remain in the repository as historical evidence.

### Reading workflow for feature and service agents

1. Read **Global Conventions** (headers, envelopes, error mapping, pagination `P1`–`P4`, date formats, and enums) before writing or modifying the HTTP client, domain services, or hooks.
2. Use the **Feature Index** below to jump directly to the stable `#domain-action` anchors listed in your ticket. Do not read unrelated domains unless your ticket requires them.
3. Every endpoint entry uses a stable HTML anchor of the form `#domain-action` and lists the same 11 items in order: Method & Path, Auth & Role Restrictions, Required Headers, Parameters, Response Envelope & `data` Shape, Pagination Shape, Filter & Sort Parameters, Validation Errors (`422`), Status Codes, Side Effects, and Evidence Level.
4. **Contract mismatches (Spec ID-19):** If a live response contradicts this document, stop and report the mismatch on your ticket with the `#domain-action` anchor and sanitised observed vs. expected shape. Do not merge silent local workarounds.
5. **Security & sanitisation:** Every example in this document uses obvious placeholders (`user@example.com`, `Jane Doe`, `+1 555 0100`, `<bearer_token>`). Never copy real credentials, tokens, OTPs, emails, or personal identifiers into code, docs, tests, issues, or commits.

### Evidence levels

Every endpoint, field, and behaviour in this document carries one of four evidence levels (per Spec ID-12):

| Level | Meaning |
|---|---|
| **`VERIFIED`** | Observed in a live sanitised HTTP response (unauthenticated discovery probe, Admin/PM authenticated probes, people-picker probe, or the WI-1 D10 PM verification session). |
| **`DOCUMENTED`** | Stated in the public OpenAPI 3.1.2 spec (`/docs/api.json`) and/or the Postman collection, but not yet observed live. |
| **`UNVERIFIED`** | Inferred or untested (for example, missing response schemas, undocumented query parameters, or Team Member role behaviour per D6). Implementers must code defensively for absence or variance. |
| **`CONFLICT`** | Sources disagree (live response vs. OpenAPI vs. Postman body vs. Postman description). Each source's claim and the authoritative resolution are stated explicitly. |

> **D6 boundary (Team Member role):** Because the Postman Team Member demo credentials have an unresolved body-vs-description mismatch, **no Team Member session has ever been authenticated or probed**. Never treat Team Member visibility or `403` behaviour as `VERIFIED`.

---

## Feature Index

### Tier 1 — Core MVP

| Feature | Endpoints (stable anchors) |
|---|---|
| **Auth** | [`auth-login`](#auth-login), [`auth-register`](#auth-register), [`auth-forgot-password`](#auth-forgot-password), [`auth-verify-reset-otp`](#auth-verify-reset-otp), [`auth-reset-password`](#auth-reset-password), [`auth-logout`](#auth-logout) |
| **App Shell & Session** | [`profile-me`](#profile-me), [`auth-logout`](#auth-logout) |
| **Dashboard** | [`dashboard-index`](#dashboard-index), [`files-download`](#files-download) (for `recent_files.items[].download_url`) |
| **Projects** | [`projects-index`](#projects-index), [`projects-store`](#projects-store), [`projects-show`](#projects-show), [`projects-overview`](#projects-overview), [`projects-update`](#projects-update), [`projects-destroy`](#projects-destroy), [`projects-teams-index`](#projects-teams-index) |
| **Tasks & Kanban** | [`tasks-index`](#tasks-index), [`tasks-kanban`](#tasks-kanban), [`tasks-store`](#tasks-store), [`tasks-show`](#tasks-show), [`tasks-update`](#tasks-update), [`tasks-update-status`](#tasks-update-status), [`tasks-assign`](#tasks-assign), [`tasks-destroy`](#tasks-destroy) |
| **Teams & Users (read pickers)** | [`teams-index`](#teams-index), [`teams-show`](#teams-show), [`teams-roles`](#teams-roles), [`users-index`](#users-index), [`users-show`](#users-show) |
| **Profile** | [`profile-me`](#profile-me), [`profile-update`](#profile-update), [`profile-remove-avatar`](#profile-remove-avatar), [`profile-change-password`](#profile-change-password), [`profile-tasks`](#profile-tasks) |

### Tier 2 — Extended MVP

| Feature | Endpoints (stable anchors) |
|---|---|
| **Notifications** | [`notifications-index`](#notifications-index), [`notifications-unread-count`](#notifications-unread-count), [`notifications-mark-read`](#notifications-mark-read), [`notifications-mark-all-read`](#notifications-mark-all-read), [`notifications-destroy`](#notifications-destroy) |
| **Global Search** | [`search-index`](#search-index) |
| **Project Teams Management** | [`projects-teams-index`](#projects-teams-index), [`projects-teams-assign`](#projects-teams-assign), [`projects-teams-remove`](#projects-teams-remove) |
| **Files** | [`files-index`](#files-index), [`files-store`](#files-store), [`files-show`](#files-show), [`files-download`](#files-download), [`files-destroy`](#files-destroy), [`profile-files`](#profile-files) |
| **Meetings & AI Summaries** | [`meetings-index`](#meetings-index), [`meetings-store`](#meetings-store), [`meetings-show`](#meetings-show), [`meetings-update`](#meetings-update), [`meetings-destroy`](#meetings-destroy), [`meetings-attendance`](#meetings-attendance), [`meetings-summary-generate`](#meetings-summary-generate), [`meetings-summary-show`](#meetings-summary-show), [`meetings-summary-update`](#meetings-summary-update), [`meetings-summary-create-tasks`](#meetings-summary-create-tasks) |

### Out-of-Scope / Post-MVP / Deferred Domains

| Domain | Endpoints (stable anchors) | Notes |
|---|---|---|
| **Social OAuth** | [`auth-social-redirect`](#auth-social-redirect), [`auth-social-callback`](#auth-social-callback) | Backend Google OAuth is misconfigured (`redirect_uri=http://127.0.0.1:8000/...`, missing `client_id`); method `CONFLICT` on callback. |
| **Profile PUT alias** | [`profile-update-put`](#profile-update-put) | Spec-only alias; PHP ignores multipart files on `PUT` — use `POST` ([`profile-update`](#profile-update)). |
| **Team CRUD Mutations** | [`teams-store`](#teams-store), [`teams-update`](#teams-update), [`teams-assign-members`](#teams-assign-members), [`teams-remove-member`](#teams-remove-member), [`teams-destroy`](#teams-destroy) | Out of Tier 1/2 picker scope. |
| **Admin User Management** | [`users-store`](#users-store), [`users-update`](#users-update), [`users-destroy`](#users-destroy) | Admin-only CRUD. |
| **Meeting Comments & Notes** | [`meetings-comments-index`](#meetings-comments-index), [`meetings-comments-store`](#meetings-comments-store), [`meetings-comments-update`](#meetings-comments-update), [`meetings-comments-destroy`](#meetings-comments-destroy), [`meetings-notes-index`](#meetings-notes-index), [`meetings-notes-store`](#meetings-notes-store), [`meetings-notes-update`](#meetings-notes-update), [`meetings-notes-destroy`](#meetings-notes-destroy) | Spec-only operations; not in Postman or Figma MVP scope. |
| **Project Chat & Broadcasting** | [`messages-index`](#messages-index), [`messages-store`](#messages-store), [`messages-update`](#messages-update), [`messages-destroy`](#messages-destroy), [`messages-mark-read`](#messages-mark-read), [`messages-read-alias`](#messages-read-alias), [`messages-unread-count`](#messages-unread-count), [`broadcasting-auth`](#broadcasting-auth) | Reverb host/port/app key/events are undocumented (`UNVERIFIED`). |
| **AI Assistant & AI Settings** | [`ai-ask`](#ai-ask), [`ai-settings-index`](#ai-settings-index), [`ai-settings-update`](#ai-settings-update) | Out of Tier 1/2 MVP scope. |
| **Reports** | [`reports-projects`](#reports-projects), [`reports-tasks`](#reports-tasks), [`reports-teams`](#reports-teams), [`reports-users`](#reports-users) | Out of Tier 1/2 MVP scope. |
| **Activities & Audit Logs** | [`activities-index`](#activities-index), [`audit-logs-index`](#audit-logs-index) | Out of Tier 1/2 MVP scope. |

---

## Global Conventions

### Base URL & Origin (`VERIFIED`)

| Setting | Value | Notes |
|---|---|---|
| **API Base URL** | `https://collabspace.huma-volve.com/api/v1` | All endpoint paths in this document are relative to this base URL unless prefixed with `/api/v1/`. |
| **API Origin** | `https://collabspace.huma-volve.com` | Needed when resolving root-relative paths returned by the API (notably `GET /dashboard` `recent_files.items[].download_url`, which returns `/api/v1/files/{id}/download`). Never blindly prepend `/api/v1` to a URL that already starts with `/api/v1/`. |
| **Backend Stack** | Laravel (13.x hint) on PHP 8.3.37 behind Apache; stateless Laravel Sanctum personal access tokens. | `/api/v1/*` routes set no cookies. |
| **Public OpenAPI Spec** | `https://collabspace.huma-volve.com/docs/api.json` (OpenAPI 3.1.2, 65 paths, 92 operations). | No `Access-Control-Allow-Origin` header; CLI/build-time fetch only. |

### Required Headers (`VERIFIED`)

| Header | When required | Notes |
|---|---|---|
| `Accept: application/json` | **Every JSON request (mandatory).** | **Critical (`VERIFIED`):** If `Accept: application/json` is omitted (e.g. `Accept: text/html`) on a protected route without a valid token, Laravel attempts to redirect to a non-existent web `login` route and returns **`500 Internal Server Error`** with `{"success":false,"message":"Route [login] not defined.","errors":null}` instead of `401`. Only `GET /files/{file}/download` omits or overrides `Accept` when expecting binary bytes (though sending `Accept: application/json` on an unauthenticated download request cleanly yields a JSON `401`). |
| `Authorization: Bearer <token>` | Every protected endpoint (all 85 non-public operations). | Sanctum personal access token obtained from `data.token` on login/register/social-callback. No refresh token or expiry field is returned (`VERIFIED`). |
| `Content-Type: application/json` | Every JSON request body (`POST`, `PUT`, `PATCH`). | Omit on bodyless requests. |
| `Content-Type: multipart/form-data; boundary=...` | File uploads only: `POST /auth/profile`, `PUT /auth/profile`, `POST /files`. | Let `FormData` / the HTTP client generate the boundary automatically; do not set a manual `Content-Type` header without a boundary. |

### CORS Behaviour (`VERIFIED`)

Verified against `http://localhost:3000`, `http://localhost:5173`, and `https://collab-space-next-team-kappa.vercel.app`:

| Response Header | Observed Value | Frontend Implication |
|---|---|---|
| `Access-Control-Allow-Origin` | `*` on `/api/v1/*` (absent on `/docs/api.json` and web routes) | Direct cross-origin browser requests with `Authorization: Bearer` succeed from any origin. |
| `Access-Control-Allow-Credentials` | **Absent** | Cookie/credentialed fetches (`credentials: "include"`) are **blocked** by browsers due to wildcard `ACAO: *`. Sanctum cookie SPA auth cannot be used cross-origin. |
| `Access-Control-Allow-Methods` | Echoes `Access-Control-Request-Method` | Preflight returns `204 No Content`. |
| `Access-Control-Allow-Headers` | Echoes `Access-Control-Request-Headers` (e.g. `authorization,content-type`) | Bearer + JSON headers permitted. |
| `Access-Control-Max-Age` | `0` | Browsers send an `OPTIONS` preflight before **every** authenticated or JSON-body cross-origin request unless routed through a same-origin BFF/proxy. |
| `Access-Control-Expose-Headers` | **Absent** (confirmed on `/api/v1/auth/me` and `/api/v1/files/{id}/download`) | Cross-origin browser JavaScript **cannot read** `Content-Disposition`, `Retry-After`, or `X-RateLimit-*`. Always derive download filenames from file metadata (`name`) and never assume `Retry-After` is readable in direct browser calls. |

### Response Envelope Variants

Client envelope unwrapping MUST handle all six variants below (`VERIFIED` except where noted):

| Variant | Structure | Endpoints | Evidence |
|---|---|---|---|
| **E1. Standard success** | `{ "success": true, "message": string, "data": T }` | Most endpoints (`auth/*`, `profile/*`, `projects/*`, `tasks/*`, `teams/*`, `files/*`, `meetings/*`, `notifications/*`, `messages/*`, `reports/*`, `ai/settings` PUT, `users` POST/PUT). | `VERIFIED` |
| **E2. No-`message` success** | `{ "success": true, "data": T }` or `{ "success": true, "data": T[], "meta": {...} }` | `GET /dashboard`, `GET /users`, `GET /users/{user}`, `GET /audit-logs`, `GET /ai/settings` (`VERIFIED`); `POST /ai/ask` (`DOCUMENTED`). Client parsers must treat `message` as optional (`string \| undefined`). | `VERIFIED` / `DOCUMENTED` |
| **E3. `data: null` success** | `{ "success": true, "message": string, "data": null }` | `POST /auth/logout` (`VERIFIED`); `POST /auth/verify-reset-otp`, `POST /auth/reset-password`, `PUT /auth/password`, and `DELETE` on projects, tasks, teams, meetings, comments, notes, files, messages, notifications (`DOCUMENTED`). | `VERIFIED` / `DOCUMENTED` |
| **E4. No-`data` success** | `{ "success": true, "message": string }` (no `data` key) | `DELETE /users/{user}` only. | `DOCUMENTED` |
| **E5. Bare object (no envelope)** | `{ ... }` (no `success`/`message`/`data`) | `GET /broadcasting/auth` only. | `DOCUMENTED` |
| **E6. Binary stream** | Raw file bytes + `Content-Type: <mime>` + `Content-Disposition: attachment; filename=...` | `GET /files/{file}/download` (200 only; errors return JSON). | `VERIFIED` |

### Error Envelopes & Mapping to ID-19 `AppError` Kinds

> **`CONFLICT` — Error envelope shape:**
> - **Live server (`VERIFIED` for 401, 403, 404, 405, 500) & Postman saved examples (`DOCUMENTED` for 422):** `{ "success": false, "message": string, "errors": null | Record<string, string[]> }`.
> - **OpenAPI `components.responses` (`DOCUMENTED`):** omits `success` (lists `{ "message": string }` for 401/403/404 and `{ "message": string, "errors": Record<string, string[]> }` for 422), except social-auth inline 400/422 which include `success` and `errors: null`.
> - **Authoritative resolution:** Expect `{ success?: false, message: string, errors?: Record<string, string[]> | null }`. Treat `success` as optional when parsing errors so both live and spec-conformant error bodies normalize cleanly.

Every failure normalizes to one of the 12 `AppError` kinds defined in Spec ID-19:

| `AppError.kind` | HTTP Status / Trigger | Observed / Documented Wire Shape | Evidence | Client Handling (ID-19) |
|---|---|---|---|---|
| `network` | No response (offline, DNS, CORS block) | N/A (transport failure) | `DOCUMENTED` | Show connection-problem message; safe GET retries bounded; mutations never auto-retry. |
| `timeout` | Client request timeout elapsed | N/A (client timer) | `DOCUMENTED` | Distinct from 5xx; same retry rules as `network`. |
| `aborted` | `AbortSignal` triggered by navigation or superseded query | N/A | `DOCUMENTED` | Swallow silently; never render to user. |
| `bad_request` | `400` | `{ "success": false, "message": string, "errors": null }` (documented on social callback) | `DOCUMENTED` | Surface server `message`. |
| `unauthorized` | `401` | `{ "success": false, "message": "Unauthenticated. Please provide a valid Bearer token.", "errors": null }` | `VERIFIED` | On `/auth/login`, treat as credential error (do not redirect). Elsewhere: clear token + cache, broadcast logout, single redirect to Sign in with return path. |
| `forbidden` | `403` | `{ "success": false, "message": "This action is unauthorized.", "errors": null }` (live API route; web `/broadcasting/auth` returned `"You do not have permission to perform this action."`) | `VERIFIED` | Keep user signed in. Mutations show permission toast & roll back optimistic update. Pages show access-denied state (never empty state). |
| `not_found` | `404` | `{ "success": false, "message": "No query results for model [App\\Models\\Project] <id>", "errors": null }` or `"The route api/v1/... could not be found."` | `VERIFIED` | Show safe not-found state (do not leak raw PHP model class names to end users). |
| `conflict` | `409` | Not observed or documented on any current endpoint; reserved for future conflict responses (`{ "success": false, "message": string, "errors": null }`). | `UNVERIFIED` | Surface server `message` only if an endpoint documents 409. |
| `validation` | `422` | `{ "success": false, "message": string, "errors": { "<field>": ["<error>", ...], "members.0.role_in_team": ["..."] } }` (Laravel dot-notation for nested array items). Note: social-auth 422 uses `errors: null`. | `DOCUMENTED` (Postman saved examples + OpenAPI) | Map `errors[field][0]` to matching form inputs; unknown keys/null `errors` go to form alert; preserve input values; focus first invalid field. |
| `rate_limited` | `429` | Not yet observed live; no `X-RateLimit-*` or `Retry-After` headers seen on probed routes. Postman documents 10 req/min/IP on password-reset endpoints. | `UNVERIFIED` | Show `"Too many attempts. Please wait and try again."`. Read `Retry-After` only if exposed/readable; never invent countdown; never auto-retry. |
| `server` | `5xx` (e.g. `500`) | `{ "success": false, "message": "...", "errors": null }` (observed `500` when `Accept: application/json` omitted). | `VERIFIED` | Replace server text with generic error (never leak stack/SQL/route names). Bounded retry for GET only; never auto-retry mutations. |
| `unexpected` | Any `405` (observed: `"The GET method is not supported..."`), malformed JSON, or body violating the documented envelope. | `{ "success": false, "message": string, "errors": null }` (405) or non-conforming payload. | `VERIFIED` (405) | Show generic error and log a contract mismatch report. |

### Pagination Shapes (`P1`–`P4`)

The API uses **four distinct pagination shapes**. The shared pagination module must normalize all four (Spec ID-19):

| ID | Name | Verified Endpoints | Exact Structure | Evidence |
|---|---|---|---|---|
| **`P1`** | **Laravel API-resource collection nested inside `data`** | `GET /projects`, `GET /tasks`, `GET /teams`, `GET /meetings`, `GET /files`, `GET /auth/profile/files` | `data: { data: T[], links: { first: string, last: string, prev: string \| null, next: string \| null }, meta: { current_page: integer, from: integer \| null, last_page: integer, links: Array<{ url: string \| null, label: string, page?: integer \| null, active: boolean }>, path: string, per_page: integer, to: integer \| null, total: integer } }` | `VERIFIED` |
| **`P2`** | **Raw Laravel `LengthAwarePaginator` inside `data`** | `GET /auth/profile/tasks` | `data: { current_page: integer, data: T[], first_page_url: string, from: integer \| null, last_page: integer, last_page_url: string, links: Array<{ url: string \| null, label: string, page?: integer \| null, active: boolean }>, next_page_url: string \| null, path: string, per_page: integer, prev_page_url: string \| null, to: integer \| null, total: integer }` | `VERIFIED` |
| **`P3`** | **Dashboard widget block pagination** | `GET /dashboard` (`active_projects`, `tasks`, `teams`, `recent_files`, `recent_activity`; note `upcoming_meetings` has no `pagination`) | `{ items: T[], pagination: { current_page: integer, per_page: integer, total: integer } }` *(CONFLICT: OpenAPI types pagination numbers as `string`; live returns `integer`)* | `VERIFIED` |
| **`P4`** | **Sibling `meta` next to `data` (no `links`)** | `GET /users` (no `message`), `GET /audit-logs` (no `message`), `GET /notifications` (has `message` + `meta.unread_count`) | `{ success: true, message?: string, data: T[], meta: { current_page: integer, last_page: integer, per_page: integer, total: integer, unread_count?: integer } }` | `VERIFIED` |

Notes on `P1`–`P4`:
- Default `per_page` is `15` on `P1`/`P2` (verified on projects, tasks, teams; Postman uses `20` for messages/audit logs).
- `meta.links[].label` contains raw HTML entities (`&laquo; Previous`, `Next &raquo;`, `...`). The `"..."` separator omits the `page` key; disabled prev/next links have `page: null`.
- On empty pages, `from` and `to` are `null` and `data` is `[]` (`VERIFIED`).
- `GET /projects/{project}/messages`, `GET /meetings/{meeting}/comments`, and `GET /activities` are untyped in OpenAPI and unprobed (`UNVERIFIED` pagination shape — likely `P1` or `P4`).

### Date & Time Formats (`VERIFIED`)

The shared date utility must parse all four formats returned across endpoints:

| Format | Pattern | Where Observed |
|---|---|---|
| **`YYYY-MM-DD`** | `2026-11-26` | Resource calendar dates: `start_date`, `deadline`, `due_date` (`Project`, `TaskResource`), `meeting_date` (`MeetingResource`), dashboard `upcoming_meetings[].date`, chart `from`/`to`. |
| **`HH:MM:SS`** | `14:30:00` | Meeting times: `start_time`, `end_time` (`MeetingResource`, `DashboardMeetingResource`, `meeting_scheduled` notification `data.start_time`). |
| **`ISO+offset`** | `YYYY-MM-DDTHH:MM:SS+HH:MM` | API Resource timestamps: `created_at`, `updated_at`, `completed_at`, `joined_at`, `read_at` across resources (`UserResource`, `TaskResource`, `TeamResource`, `ProjectOverviewResource`, `MeetingResource`, `FileAttachmentResource`, `NotificationResource`, `Dashboard*`). |
| **`ISO-Z`** | `YYYY-MM-DDTHH:MM:SS.000000Z` | Raw Eloquent models: `/auth/me` `teams[]`, `projects[]` (including `start_date`/`deadline`), and `pivot` timestamps; `/auth/profile/tasks` (including `due_date` and `completed_at`). |

Request date/time input formatting:
- OpenAPI marks `start_date`, `deadline`, `due_date`, `meeting_date`, and `default_due_date` as `format: date-time`, while Postman sends `YYYY-MM-DD` for date fields and `HH:MM:SS` for `start_time`/`end_time`. Send `YYYY-MM-DD` for calendar dates and `HH:MM:SS` for meeting times unless a specific endpoint requires ISO timestamps; `GET /dashboard` `from`/`to` explicitly require `YYYY-MM-DD`.

### Complete Enums Table

| Enum | Allowed Values | Where Used | Evidence |
|---|---|---|---|
| **`TaskStatus`** | `"Pending"`, `"In Progress"`, `"In Review"`, `"Completed"` | `TaskResource.status`, `StoreTaskRequest`, `UpdateTaskRequest`, `UpdateTaskStatusRequest`, `Kanban` column keys & `name`, `DashboardTaskResource.status_label`. *(Note: `DashboardTaskResource.status` uses lowercase snake_case: `"pending"`, `"in_progress"`, `"in_review"`, `"completed"` — `VERIFIED`.)* | `VERIFIED` |
| **`TaskPriority`** | `"Low"`, `"Medium"`, `"High"`, `"Critical"` | `TaskResource.priority`, `StoreTaskRequest`, `UpdateTaskRequest`, `CreateTasksFromSummaryRequest.default_priority`. *(Note: `DashboardTaskResource.priority` uses lowercase: `"low"`, `"medium"`, `"high"`, `"critical"` — `VERIFIED`.)* | `VERIFIED` |
| **`ProjectStatus`** | `"Pending"`, `"In Progress"`, `"On Hold"`, `"Completed"`, `"Cancelled"` | `ProjectStatus` schema, `StoreProjectRequest`, `UpdateProjectRequest`, `ProjectOverviewResource`, `GET /projects`. **`CONFLICT`:** Postman descriptions list `"Planning"` instead of `"Pending"` and omit `"Cancelled"`. Live data confirmed `"Pending"` (no `"Planning"`). `"Cancelled"` is `DOCUMENTED` (not yet seen in live data). | `CONFLICT` / `VERIFIED` |
| **`ProjectPriority`** | `"Low"`, `"Medium"`, `"High"`, `"Critical"` | `ProjectPriority` schema, `StoreProjectRequest`, `UpdateProjectRequest`, `ProjectOverviewResource`, `GET /projects`. (`Critical`, `High`, `Medium` seen live; `Low` `DOCUMENTED`.) | `VERIFIED` (`Low` `DOCUMENTED`) |
| **`MeetingStatus`** | `"Scheduled"`, `"Completed"`, `"Cancelled"` | `MeetingResource.status`, `UpdateMeetingRequest.status`. (`Completed`, `Cancelled` seen live; `Scheduled` `DOCUMENTED`.) | `VERIFIED` (`Scheduled` `DOCUMENTED`) |
| **System Roles** | `"Administrator"`, `"Project Manager"`, `"Team Member"` | `UserResource.roles` (`string[]`, 1 element observed), `StoreUserRequest.role`, `UpdateUserRequest.role`. All three strings observed live in `UserResource.roles`. | `VERIFIED` |
| **User Account `status`** | `"active"`, `"inactive"` | `StoreUserRequest.status`, `UpdateUserRequest.status`, `UserResource.status` (`"active"` observed live). | `VERIFIED` (`inactive` `DOCUMENTED`) |
| **`AvailabilityStatus`** | `"available"`, `"busy"`, `"away"`, `"offline"` | `UserResource.available_status` (`"available"` observed live), `UpdateProfileRequest.available_status`. Distinct from account `status`. | `VERIFIED` (others `DOCUMENTED`) |
| **`TeamRole`** (`role_in_team`, 19 values; default `"Member"`) | **Leaders (`is_leader: true`):** `"Team Lead"`, `"Tech Lead"`<br>**Non-leaders (`is_leader: false`):** `"Product Owner"`, `"Scrum Master"`, `"Backend Developer"`, `"Frontend Developer"`, `"Mobile Developer"`, `"Full-Stack Developer"`, `"UI/UX Designer"`, `"QA Engineer"`, `"DevOps Engineer"`, `"Data Engineer"`, `"AI/ML Engineer"`, `"Security Engineer"`, `"Business Analyst"`, `"Support Engineer"`, `"Mentor"`, `"Intern"`, `"Member"` | `GET /team-roles`, `TeamMemberResource.role_in_team`, `StoreTeamRequest.members[].role_in_team`, `AssignMembersRequest.members[].role_in_team`. All 19 values verified live on `GET /team-roles`; leader mapping confirmed by Postman saved example. | `VERIFIED` |
| **`AuditLogCategory`** | `"auth"`, `"project"`, `"task"`, `"file"`, `"chat"`, `"meeting"`, `"ai"` | `AuditLogResource.category`, `GET /audit-logs?category=`, `GET /activities?category=`, `DashboardActivityResource.category`, `/auth/me` `recent_activities[].category`. (`auth`, `project`, `task` seen live; others `DOCUMENTED`.) | `VERIFIED` (subset) / `DOCUMENTED` |
| **Dashboard `period`** | `"year"`, `"6_months"`, `"3_months"`, `"30_days"`, `"7_days"`, `"custom"` | `GET /dashboard?period=`. (`"year"` observed live as default.) | `VERIFIED` (default) / `DOCUMENTED` |
| **Project Overview `period`** | `"year"`, `"6_months"` | `GET /projects/{project}/overview?period=`. (`"year"` observed live as default.) | `VERIFIED` (default) / `DOCUMENTED` |
| **Report `performance_level`** | `"Outstanding"`, `"High Performer"`, `"Good"`, `"Needs Improvement"` | `GET /reports/users/{id}` `data.productivity.performance_level`. | `DOCUMENTED` |
| **AI Ask `source`** | `"gemini"` (const in OpenAPI; Postman notes local NLP fallback for summaries) | `POST /ai/ask` `data.source`. | `DOCUMENTED` |
| **Notification `type`** | Not enumerated in OpenAPI. Observed live: `"task_assigned"`, `"meeting_scheduled"`. Postman mentions mentions/invites. | `NotificationResource.type` and `NotificationResource.data.type`. Treat as open `string` with known discriminant branches. | `VERIFIED` (partial) / `UNVERIFIED` (full set) |
| **Project Direct-Member `role`** | **Free text** (`string <= 100`). Observed live: `"Owner"`, `"Project Owner"`, `"Contributor"`, `"Meeting Participant"`, `"Reviewer"`, `"Stakeholder"`, `"Tech Lead"`, `"Technical Lead"`. | `StoreProjectRequest.members[].role`, `ProjectOverviewResource.direct_members[].role`, `/auth/me` `projects[].pivot.role`. Do NOT validate against `TeamRole`. | `VERIFIED` |

---

## Shared Resource Shapes

Referenced across endpoint sections below. Notation: `?` = nullable (`T | null`), `(opt)` = key may be omitted, `*` = required in request/response.

### `UserResource` (`VERIFIED`)
```ts
{
  id: number;
  name: string;
  email: string;
  job_title: string | null;
  about: string | null;
  years_of_experience: number;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "inactive" | string;
  available_status: "available" | "busy" | "away" | "offline";
  current_project_id: number | null;
  current_project?: { id: number; name: string } | null; // absent in /auth/login & /users; present (null or object) in /auth/me
  roles: string[];       // plain role names, e.g. ["Project Manager"] (VERIFIED; OpenAPI leaves items untyped)
  permissions: unknown[]; // observed [] for Admin, PM, and sampled Team Members; item type UNVERIFIED
  google_linked: boolean;
  facebook_linked: boolean;
  linkedin_linked: boolean;
  created_at: string | null; // ISO+offset
  updated_at: string | null; // ISO+offset
}
```

### `ProjectListItem` (`VERIFIED` on `GET /projects`)
```ts
{
  id: number;
  name: string;
  description: string | null;
  start_date: string;           // YYYY-MM-DD
  deadline: string;             // YYYY-MM-DD
  status: ProjectStatus;
  priority: ProjectPriority;
  progress_percentage: number;  // integer or float
  files_count: number;
  teams: Array<{ id: number; name: string }>;
  created_at: string;           // ISO+offset
}
```

### `ProjectOverviewResource` (`VERIFIED` on `GET /projects/{project}`)
```ts
{
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress_percentage: number;
  due_date_indicator: {
    start_date: string;         // YYYY-MM-DD
    deadline: string;           // YYYY-MM-DD
    total_days: number;         // integer (untyped in OpenAPI; VERIFIED integer)
    days_remaining: number;
    is_overdue: boolean;
  };
  tasks_statistics: {
    total: number;
    pending: number;
    in_progress: number;
    in_review: number;
    completed: number;
    completion_rate: number;
    pending_percentage: number;
    in_progress_percentage: number;
    in_review_percentage: number;
    completed_percentage: number;
  };
  counts: {
    files: number;
    meetings: number;
    messages: number;
    teams: number;
    direct_members: number;
  };
  teams: Array<{                // subset of TeamResource: NO creator and NO members array (VERIFIED)
    id: number;
    name: string;
    description: string | null;
    created_by: number;
    members_count: number;
    active_projects_count: number;
    created_at: string;         // ISO+offset
    updated_at: string;         // ISO+offset
  }>;
  direct_members: Array<{
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    job_title: string | null;
    role: string;               // free text (VERIFIED)
  }>;
  created_by: number;
  creator: { id: number; name: string; email: string };
  created_at: string;           // ISO+offset
  updated_at: string;           // ISO+offset
}
```

### `TaskResource` (`VERIFIED` on `GET /tasks`, `GET /tasks/{task}`, `GET /projects/{project}/tasks/kanban`)
```ts
{
  id: number;
  name: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;      // YYYY-MM-DD
  completed_at: string | null;  // ISO+offset
  hours_spent: number;
  project_id: number;
  team_id: number | null;
  assigned_to: number | null;
  created_by: number;
  project: { id: number; name: string };
  team: { id: number; name: string } | null;
  assignee: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    job_title: string | null;
  } | null;
  creator: { id: number; name: string; email: string };
  attachments_count: number;    // integer (VERIFIED; no subtasks or attachment list)
  created_at: string;           // ISO+offset
  updated_at: string;           // ISO+offset
}
```

### `TeamResource` & `TeamMemberResource` (`VERIFIED` on `GET /teams`, `GET /teams/{team}`)
```ts
{
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  creator: { id: number; name: string; email: string };
  members_count: number;         // integer (VERIFIED)
  active_projects_count: number; // integer (VERIFIED)
  members: Array<{
    id: number;
    name: string;
    email: string;
    job_title: string | null;
    avatar_url: string | null;
    role_in_team: TeamRole;
    is_leader: boolean;
    joined_at: string | null;    // ISO+offset
  }>;
  created_at: string;            // ISO+offset
  updated_at: string;            // ISO+offset
}
```

### `FileAttachmentResource` (`VERIFIED` on `GET /files`, `GET /auth/profile/files`)
```ts
{
  id: number;
  name: string;
  file_path: string;
  file_size: number;             // bytes
  file_size_formatted: string;   // e.g. "5.36 KB"
  mime_type: string | null;      // e.g. "image/png", "text/markdown"
  url: string;                   // absolute URL: "https://collabspace.huma-volve.com/api/v1/files/{id}/download" (requires Bearer auth!)
  project_id: number | null;
  task_id: number | null;
  uploaded_by: string;           // uploader display name string (NOT an object or ID!)
  uploaded_by_id: number;
  project: { id: number; name: string } | null;
  task: { id: number; name: string } | null;
  uploader: { id: number; name: string; email: string };
  created_at: string;            // ISO+offset
  updated_at: string;            // ISO+offset
}
```

### `MeetingResource` & `MeetingSummaryResource` (`VERIFIED` on `GET /meetings`)
```ts
// MeetingSummaryResource
{
  id: number;
  meeting_id: number;
  summary: string;
  decisions_made: string[];
  action_items: Array<           // VERIFIED polymorphic: strings AND structured objects observed live!
    string | { title: string; suggested_assignee?: string | null; priority?: string | null }
  >;
  assigned_tasks: string[] | Record<string, string>; // VERIFIED polymorphic: array AND name->task map observed live!
  risks: string[];
  next_steps: string[];
  generated_by_ai: boolean;
  created_at: string;            // ISO+offset
  updated_at: string;            // ISO+offset
}

// MeetingResource
{
  id: number;
  title: string;
  description: string | null;
  meeting_date: string;          // YYYY-MM-DD
  start_time: string;            // HH:MM:SS
  end_time: string;              // HH:MM:SS
  meeting_link: string;
  status: MeetingStatus;
  project_id: number;
  created_by: number;
  project: { id: number; name: string };
  creator: { id: number; name: string; email: string };
  participants_count: number;
  participants: Array<{
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    job_title: string | null;
    attended: boolean;
  }>;
  summary: MeetingSummaryResource | null;
  created_at: string;            // ISO+offset
  updated_at: string;            // ISO+offset
}
```

### `NotificationResource` (`VERIFIED` on `GET /notifications`)
```ts
{
  id: string;                    // UUID string (NOT integer)
  type: string;                  // observed: "task_assigned", "meeting_scheduled"
  title: string;
  message: string;
  data: {                        // CONFLICT: OpenAPI types `data` as array; live is a JSON object (VERIFIED)
    type: string;
    title: string;
    message: string;
    project_id?: number;
    project_name?: string;
    // task_assigned fields:
    task_id?: number;
    task_name?: string;
    assigned_by_id?: number;
    assigned_by_name?: string;
    // meeting_scheduled fields:
    meeting_id?: number;
    meeting_title?: string;
    host_id?: number;
    host_name?: string;
    start_time?: string;         // HH:MM:SS
    [extra: string]: unknown;
  };
  is_read: boolean;
  read_at: string | null;        // ISO+offset
  created_at: string;            // ISO+offset
}
```

---

## Operation Reconciliation (Postman vs. OpenAPI)

| Source | Raw Count | Breakdown |
|---|---|---|
| **Postman Collection** (`13` folders) | **86 requests** → **79 distinct method+path routes** | 7 duplicate-route requests use different bodies/queries: `POST /auth/login` (×3 roles: +2), `POST /files` (project vs. task: +1), `POST /projects/{project}/messages` (new vs. thread reply: +1), `GET /notifications` (all vs. `?status=unread`: +1), `POST /ai/ask` (general / project-scoped / overdue audit: +2). |
| **OpenAPI 3.1.2 Spec** (`/docs/api.json`) | **92 operations** across `65` paths (`24` tags) | **78** Postman-corresponding operations (**76** exact method+path matches including `GET /reports/users/{id}`, plus **2** method-mismatch matches) + **14** spec-only operations. |

### The 3 Method / Path Mismatches

| Route / Intent | Postman Collection | OpenAPI 3.1.2 Spec | Resolution / Status |
|---|---|---|---|
| **Social OAuth callback** | `POST /auth/social/google/callback` with JSON `{ token }` | `GET /auth/social/{provider}/callback` (no documented query/body) | **`CONFLICT`** — Out-of-scope MVP; social OAuth is also misconfigured on backend (`redirect_uri=127.0.0.1:8000`). Do not ship until backend confirms method & flow. |
| **Edit chat message** | `PATCH /messages/{message}` | `PUT /messages/{message}` | **`CONFLICT`** — OpenAPI is generated from Laravel routes; prefer `PUT` unless verified otherwise. Out-of-scope MVP. |
| **User productivity report** | Two routes: `GET /reports/users` (self) and `GET /reports/users/{id}` (Admin/PM) | One route: `GET /reports/users/{id}` with `x-optional: true` (`default: null`) | **`CONFLICT` (representation only)** — Laravel optional route parameter `/reports/users/{id?}`. Documented under [`reports-users`](#reports-users) covering both forms. |

### The 14 Spec-Only Operations (Absent from Postman)

1. `GET /activities` ([`activities-index`](#activities-index))
2. `GET /broadcasting/auth` ([`broadcasting-auth`](#broadcasting-auth))
3. `GET /search` ([`search-index`](#search-index))
4. `GET /projects/{project}` ([`projects-show`](#projects-show)) — `VERIFIED` live!
5. `PUT /auth/profile` ([`profile-update-put`](#profile-update-put)) — duplicate of `POST /auth/profile`
6. `POST /projects/{project}/messages/read` ([`messages-read-alias`](#messages-read-alias)) — alias of `mark-read`
7. `GET /meetings/{meeting}/comments` ([`meetings-comments-index`](#meetings-comments-index))
8. `POST /meetings/{meeting}/comments` ([`meetings-comments-store`](#meetings-comments-store))
9. `PUT /meetings/{meeting}/comments/{comment}` ([`meetings-comments-update`](#meetings-comments-update))
10. `DELETE /meetings/{meeting}/comments/{comment}` ([`meetings-comments-destroy`](#meetings-comments-destroy))
11. `GET /meetings/{meeting}/notes` ([`meetings-notes-index`](#meetings-notes-index))
12. `POST /meetings/{meeting}/notes` ([`meetings-notes-store`](#meetings-notes-store))
13. `PUT /meetings/{meeting}/notes/{note}` ([`meetings-notes-update`](#meetings-notes-update))
14. `DELETE /meetings/{meeting}/notes/{note}` ([`meetings-notes-destroy`](#meetings-notes-destroy))

---

## D10 Verification Summary (Project Manager Read-Only Session)

Executed in one in-memory session as **Project Manager** (`roles: ["Project Manager"]`), **GET-only** after login, with no Team Member authentication (D6) and no credentials, tokens, or PII persisted.

| D10 Item | Requests Sent | Verified Outcome | Evidence |
|---|---|---|---|
| **1. `/users` `search` & max `per_page`** | `GET /users?per_page=5&search=zzzz_no_match_probe_99`; `GET /users?per_page=100`; `GET /users?per_page=250` | **`search` IS honored:** non-matching term reduced `meta.total` from `127` to `0` (`data: []`). **`per_page` is not capped up to 250:** `per_page=100` returned 100 items (`last_page: 2`); `per_page=250` returned all 127 items (`meta.per_page: 250`, `last_page: 1`, `200 OK`). | `VERIFIED` |
| **2. `download_url` & file `url` auth** | Inspected `GET /dashboard` (`recent_files.items[0].download_url`) and `GET /files?per_page=1` (`url`); sent unauthenticated `GET` and Bearer-authenticated `GET` (discarding bytes). | Dashboard `download_url` is a **relative path** `/api/v1/files/{id}/download`; `FileAttachmentResource.url` is absolute `https://collabspace.huma-volve.com/api/v1/files/{id}/download`. **Both require Bearer auth:** unauthenticated `GET` returned **`401`** JSON (`"Unauthenticated. Please provide a valid Bearer token."`). Bearer `GET` returned **`200`**, `Content-Type: image/png`, `Content-Disposition: attachment; filename=<masked>`, `Access-Control-Allow-Origin: *`, and **`Access-Control-Expose-Headers` absent**. | `VERIFIED` |
| **3. Kanban column `name` values** | `GET /projects/{id}/tasks/kanban` (PM's first visible project) | `columns` keys are in exact order `["Pending", "In Progress", "In Review", "Completed"]`. Each `columns[key].name` equals its Title-case key (`"Pending"`, `"In Progress"`, `"In Review"`, `"Completed"`). | `VERIFIED` |
| **4. `403` response body structure** | GET-only probes: `GET /ai/settings` (`200`), `GET /audit-logs?per_page=1` (`200`), `GET /users/{id}` (`200`), `GET /reports/users/{id}` (`200`), `GET /projects/{non_existent}` (`404`), `GET /projects/{non_visible_existing}` (`403`). | **`403` body confirmed:** `{ "success": false, "message": "This action is unauthorized.", "errors": null }` (keys: `success`, `message`, `errors`). Also confirmed `404` model-not-found body: `{ "success": false, "message": "No query results for model [App\\Models\\Project] <id>", "errors": null }`, and confirmed PM has read access (`200`) to `/ai/settings`, `/audit-logs`, `/users/{id}`, and `/reports/users/{id}`. | `VERIFIED` |
| **5. Tier 2 list shapes** | `GET /notifications?per_page=2`, `GET /notifications/unread-count`, `GET /meetings?per_page=2`, `GET /meetings?per_page=2&time_filter=upcoming`, `GET /files?per_page=2`, `GET /auth/profile/files?per_page=2` | - `/notifications`: **P4** (`meta` sibling with `unread_count`), **`data` on each item is a JSON object** (contradicts OpenAPI `array`).<br>- `/notifications/unread-count`: `{ success, message, data: { unread_count: integer } }`.<br>- `/meetings`: **P1**, `time_filter=upcoming` honored (`total` 52 → 4); `summary.action_items` is polymorphic (`string \| object`) and `summary.assigned_tasks` is polymorphic (`string[] \| Record<string, string>`).<br>- `/files` & `/auth/profile/files`: **P1** with `FileAttachmentResource` (confirming `uploaded_by: string` and `uploader: {id, name, email}`). | `VERIFIED` |
| **Session teardown & revocation** | `POST /auth/logout` → `GET /auth/me` with revoked token | Logout returned `200` (`data: null`). Subsequent `GET /auth/me` returned `401` (`"Unauthenticated. Please provide a valid Bearer token."`). **Revocation: Confirmed.** | `VERIFIED` |

---

## Complete Domain Endpoint Reference

---

## 1. Authentication (`auth-*`)

### <a id="auth-register"></a> `auth-register` — POST /auth/register

1. **Method & Path:** `POST /auth/register` (`operationId: auth.register`)
2. **Auth & Role Restrictions:** Public (`security: []`). Newly registered accounts receive default system role `"Team Member"` (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`RegisterRequest`, required):**
     - `name*`: `string` (`maxLength: 255`)
     - `email*`: `string` (`format: email`, `maxLength: 255`, unique in `users`)
     - `password*`: `string` (`minLength: 8`)
     - `password_confirmation*`: `string` (`minLength: 8`, must match `password`)
     - *CONFLICT (extra fields):* Postman description lists optional `job_title`, `years_of_experience` (`integer >= 0`), and `phone`; OpenAPI `RegisterRequest` omits all three. **Resolution:** Send only the four OpenAPI-validated fields (`name`, `email`, `password`, `password_confirmation`); edit profile fields post-registration via [`profile-update`](#profile-update).
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: { user: UserResource, token: string, token_type: "Bearer" } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The email has already been taken.",
     "errors": {
       "email": ["The email has already been taken."],
       "password": ["The password field confirmation does not match."]
     }
   }
   ```
   *(Sanitised illustrative example following observed Laravel 422 shape.)*
9. **Status Codes:** `201`, `422`
10. **Side Effects:** Creates user account with `"Team Member"` role and issues a new Sanctum personal access token. Login/registration throttling limits are `UNVERIFIED` (Spec ID-21).
11. **Evidence Level:** `CONFLICT` / `DOCUMENTED` — OpenAPI vs. Postman description differ on optional profile fields; OpenAPI `RegisterRequest` is authoritative. Live response not probed (write operation).

### <a id="auth-login"></a> `auth-login` — POST /auth/login

1. **Method & Path:** `POST /auth/login` (`operationId: auth.login`; 3 Postman requests: Admin, Project Manager, Team Member)
2. **Auth & Role Restrictions:** Public (`security: []`). Verified for `Administrator` and `Project Manager`. Team Member login is **not verified** (D6 credential mismatch in Postman).
3. **Required Headers:** `Accept: application/json`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`LoginRequest`, required):**
     - `email*`: `string` (`format: email`)
     - `password*`: `string`
     - `remember`: `boolean | null` (optional; Postman states it extends token lifespan; exact duration `UNVERIFIED`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: "Logged in successfully.", data: { user: UserResource, token: string, token_type: "Bearer" } }`.
   - `VERIFIED`: No `expires_at`, `expires_in`, or refresh token is returned. `user.current_project` is **absent** here (present as `null`/object in [`profile-me`](#profile-me)). `user.roles` is `string[]` (1 item, e.g. `["Project Manager"]`); `user.permissions` is `[]` (item type `UNVERIFIED`).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The email field must be a valid email address.",
     "errors": {
       "email": ["The email field must be a valid email address."],
       "password": ["The password field is required."]
     }
   }
   ```
   *(Sanitised illustrative example; invalid credentials may return `401` or `422` — handle `401` on `/auth/login` as credential failure, never as session-loss redirect per ID-19.)*
9. **Status Codes:** `200` (`VERIFIED`), `401` (`DOCUMENTED`/ID-19), `422` (`DOCUMENTED`), `405` (`VERIFIED` on `GET /auth/login`)
10. **Side Effects:** Issues a new Sanctum Bearer token in the database; writes an `auth` audit log entry (`VERIFIED` via `/auth/me` recent activities). Rate-limit behaviour on login is `UNVERIFIED`.
11. **Evidence Level:** `VERIFIED` (Admin & PM `200` response shape; `405` on `GET`). `remember` token lifetime and login throttling are `UNVERIFIED`; Team Member login is `UNVERIFIED` (D6).

### <a id="auth-forgot-password"></a> `auth-forgot-password` — POST /auth/forgot-password

1. **Method & Path:** `POST /auth/forgot-password` (`operationId: auth.forgotPassword`)
2. **Auth & Role Restrictions:** Public (`security: []`). Returns the same `200` response regardless of whether an account exists; inactive accounts receive no email (`DOCUMENTED`, ID-21).
3. **Required Headers:** `Accept: application/json`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`ForgotPasswordRequest`, required):**
     - `email*`: `string` (`format: email`, `maxLength: 255`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: "If an account exists for this email, a password reset code has been sent.", data: { expires_in_minutes: 10 } }` (`expires_in_minutes` is `const 10` in OpenAPI and Postman saved example).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The email field must be a valid email address.",
     "errors": {
       "email": ["The email field must be a valid email address."]
     }
   }
   ```
   *(Sanitised illustrative example; resend cooldown is 60 seconds per email per Postman/ID-21.)*
9. **Status Codes:** `200`, `422`, `429` (`UNVERIFIED` body shape; Postman documents 10 req/min/IP shared across forgot/verify/reset)
10. **Side Effects:** Generates a single-use 6-digit numeric OTP valid for 10 minutes and invalidates any previous OTP for that email; blocks resend for 60 seconds per email; shares 10 req/min/IP rate limit across the 3 recovery endpoints (`DOCUMENTED`, ID-21).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman saved `200` example; live call not performed to avoid mutating reset state).

### <a id="auth-verify-reset-otp"></a> `auth-verify-reset-otp` — POST /auth/verify-reset-otp

1. **Method & Path:** `POST /auth/verify-reset-otp` (`operationId: auth.verifyResetOtp`)
2. **Auth & Role Restrictions:** Public (`security: []`).
3. **Required Headers:** `Accept: application/json`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`VerifyResetOtpRequest`, required):**
     - `email*`: `string` (`format: email`, `maxLength: 255`)
     - `otp*`: `string` (6-digit numeric string per Postman description & Spec ID-21; OpenAPI omits length constraint). *CONFLICT:* Postman request body sample used 4 digits while description and saved examples use 6 digits. **Resolution:** Enforce 6 numeric digits (`ID-21`).
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: "The code is valid.", data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** *(Saved Postman example, sanitised)*
   ```json
   {
     "success": false,
     "message": "The code is invalid or has expired. Please request a new one.",
     "errors": {
       "otp": [
         "The code is invalid or has expired. Please request a new one."
       ]
     }
   }
   ```
9. **Status Codes:** `200`, `422`, `429` (`UNVERIFIED` body shape; 10 req/min/IP shared limit)
10. **Side Effects:** Checks OTP validity **without consuming it**; increments wrong-attempt counter and locks code after 5 failed attempts (`DOCUMENTED`, ID-21).
11. **Evidence Level:** `CONFLICT` (OTP sample digit length) / `DOCUMENTED` (OpenAPI + Postman saved `200` and `422` examples).

### <a id="auth-reset-password"></a> `auth-reset-password` — POST /auth/reset-password

1. **Method & Path:** `POST /auth/reset-password` (`operationId: auth.resetPassword`)
2. **Auth & Role Restrictions:** Public (`security: []`).
3. **Required Headers:** `Accept: application/json`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`ResetPasswordRequest`, required):**
     - `email*`: `string` (`format: email`, `maxLength: 255`)
     - `otp*`: `string` (6-digit numeric string per ID-21)
     - `password*`: `string` (`minLength: 8`)
     - `password_confirmation*`: `string` (`minLength: 8`, must match `password`)
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: "Password has been reset successfully. Please log in with your new password.", data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** *(Saved Postman example, sanitised)*
   ```json
   {
     "success": false,
     "message": "The code is invalid or has expired. Please request a new one.",
     "errors": {
       "otp": [
         "The code is invalid or has expired. Please request a new one."
       ]
     }
   }
   ```
9. **Status Codes:** `200`, `422`, `429` (`UNVERIFIED` body shape; 10 req/min/IP shared limit)
10. **Side Effects:** Consumes OTP, updates password, and **revokes all Sanctum tokens across all devices** (`DOCUMENTED`, ID-21). Frontend must redirect to Sign in without auto-login.
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman saved `200` and `422` examples).

### <a id="auth-logout"></a> `auth-logout` — POST /auth/logout

1. **Method & Path:** `POST /auth/logout` (`operationId: auth.logout`)
2. **Auth & Role Restrictions:** Bearer required (`auth:sanctum`). Any authenticated role (verified for Admin and PM; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: "Logged out successfully.", data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED` when token missing/revoked)
10. **Side Effects:** Immediately deletes/revokes the current Sanctum token in the database. Verified: subsequent `GET /auth/me` with the revoked token returns `401` (`Revocation: Confirmed` for both Admin and PM).
11. **Evidence Level:** `VERIFIED` (Admin & PM + D10 revocation check).

### <a id="auth-social-redirect"></a> `auth-social-redirect` — GET /auth/social/{provider}/redirect

1. **Method & Path:** `GET /auth/social/{provider}/redirect` (`operationId: socialAuth.redirect`)
2. **Auth & Role Restrictions:** Public (`security: []`). Out of MVP scope (backend misconfigured).
3. **Required Headers:** `Accept: application/json`
4. **Parameters:**
   - **Path:** `provider*`: `string` (no enum in OpenAPI; Postman lists `google`, `facebook`, `linkedin`, with only `google` requested).
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: "Redirect URL for google generated successfully.", data: { provider: string, authorization_url: string } }`.
   - *CONFLICT:* Postman description says `"HTTP 302 Redirect ... or JSON"`; OpenAPI and live probe (`VERIFIED`) return `200` JSON only.
   - **Backend defect (`VERIFIED`):** Live `authorization_url` for `google` contains `redirect_uri=http://127.0.0.1:8000/api/v1/auth/social/google/callback` and omits `client_id`. Treat social login as broken until backend fixes OAuth configuration.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** Inline OpenAPI shape for unsupported provider:
   ```json
   {
     "success": false,
     "message": "Unsupported social provider.",
     "errors": null
   }
   ```
   *(Sanitised illustrative example matching inline `{success, message, errors: null}` schema.)*
9. **Status Codes:** `200` (`VERIFIED` for `google`), `422` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` (302 vs. 200 JSON) / `VERIFIED` (`200` JSON for `google`, misconfigured `authorization_url`).

### <a id="auth-social-callback"></a> `auth-social-callback` — GET /auth/social/{provider}/callback

1. **Method & Path:** `GET /auth/social/{provider}/callback` (`operationId: socialAuth.callback`)
   - **`CONFLICT` (HTTP method & input):** OpenAPI specifies `GET /auth/social/{provider}/callback` with no documented query parameters or request body. Postman specifies `POST /auth/social/google/callback` with JSON body `{ "token": "<oauth_access_token>" }` (labelled `"Mock/Token"`). **Resolution:** Out-of-scope MVP; blocked on backend fixing OAuth configuration and confirming method/payload.
2. **Auth & Role Restrictions:** Public (`security: []`).
3. **Required Headers:** `Accept: application/json` (plus `Content-Type: application/json` if Postman `POST` variant is used)
4. **Parameters:**
   - **Path:** `provider*`: `string`
   - **Query / JSON body:** Undocumented in OpenAPI (`UNVERIFIED`); Postman `POST` sends `{ token: string }`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: { user: UserResource, token: string, token_type: "Bearer" } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** Inline OpenAPI error shape:
   ```json
   {
     "success": false,
     "message": "Invalid or unsupported OAuth callback parameters.",
     "errors": null
   }
   ```
9. **Status Codes:** `200`, `400` (`{success: false, message, errors: null}`), `422` (`{success: false, message, errors: null}`)
10. **Side Effects:** Links social provider / creates or signs in user and issues a Sanctum Bearer token (`DOCUMENTED`).
11. **Evidence Level:** `CONFLICT` (method `GET` vs. `POST`; input `UNVERIFIED`).

---

## 2. Profile (`profile-*`)

### <a id="profile-me"></a> `profile-me` — GET /auth/me

1. **Method & Path:** `GET /auth/me` (`operationId: profile.me`)
2. **Auth & Role Restrictions:** Bearer required. Verified for Admin and PM; Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Profile retrieved successfully."`):
   ```ts
   data: {
     user: UserResource & { current_project: { id: number; name: string } | null }; // current_project present here (null observed)
     stats: {
       completed_tasks: number;  // integer
       total_tasks: number;      // integer
       hours_worked: number;     // observed integer; OpenAPI types as number
     };
     recent_activities: Array<{
       id: number;
       category: AuditLogCategory;
       action: string;
       description: string | null;
       created_at: string;       // ISO+offset
     }>;
     teams: Array<{              // raw Eloquent Team model + pivot (NOT TeamResource!)
       id: number; name: string; description: string | null; created_by: number;
       created_at: string; updated_at: string; // ISO-Z
       pivot: { user_id: number; team_id: number; role_in_team: TeamRole; created_at: string; updated_at: string }; // ISO-Z
     }>;
     projects: Array<{           // raw Eloquent Project model + pivot (direct memberships only!)
       id: number; name: string; description: string | null;
       start_date: string; deadline: string;   // ISO-Z (NOT YYYY-MM-DD!)
       priority: ProjectPriority; status: ProjectStatus; progress_percentage: number; created_by: number;
       created_at: string; updated_at: string; // ISO-Z
       pivot: { user_id: number; project_id: number; role: string; created_at: string; updated_at: string }; // ISO-Z
     }>;
   }
   ```
   - *CONFLICT:* OpenAPI omits `pivot` on `teams[]` and `projects[]`; live responses include `pivot` (`VERIFIED`). Also note `projects[]` contains only direct-member projects, not all visible projects.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (Admin & PM; `CONFLICT` resolved in favour of live shape with `pivot`).

### <a id="profile-update"></a> `profile-update` — POST /auth/profile

1. **Method & Path:** `POST /auth/profile` (`operationId: v1.auth.profile.update_10`)
2. **Auth & Role Restrictions:** Bearer required. Self-update for authenticated user (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: multipart/form-data; boundary=...` (auto-set by `FormData`)
4. **Parameters:**
   - **Multipart form-data (`UpdateProfileRequest`, body optional; all fields optional/nullable):**
     - `full_name`: `string | null` (`maxLength: 255`)
     - `name`: `string | null` (`maxLength: 255`)
     - `email`: `string | null` (`format: email`, `maxLength: 255`)
     - `job_title`: `string | null` (`maxLength: 255`)
     - `about`: `string | null` (`maxLength: 2000`)
     - `years_of_experience`: `integer | null` (`0`–`60`)
     - `phone`: `string | null` (`maxLength: 30` — note `50` on admin user endpoints)
     - `available_status`: `AvailabilityStatus | null` (`"available" | "busy" | "away" | "offline"`)
     - `current_project_id`: `integer | null`
     - `avatar_url`: `string | null` (`format: uri`, `maxLength: 500`)
     - `avatar`: `binary | null` (Postman: `jpg`/`jpeg`/`png`/`webp`, max 2 MB, max `4000x4000` px)
     - `old_password`: `string | null`
     - `new_password`: `string | null` (`minLength: 8`)
     - `confirmation_password`: `string | null`
   - *CONFLICT:* Postman shows only 5 fields (`avatar`, `job_title`, `years_of_experience`, `phone`, disabled `name`); OpenAPI exposes all 14 fields above. **Resolution:** OpenAPI `UpdateProfileRequest` is authoritative; prefer [`profile-change-password`](#profile-change-password) for dedicated password changes. Always use `POST` (not `PUT`) when uploading `avatar` because PHP ignores multipart files on `PUT`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: UserResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The avatar field must not be greater than 2048 kilobytes.",
     "errors": {
       "avatar": ["The avatar field must not be greater than 2048 kilobytes."],
       "years_of_experience": ["The years of experience field must not be greater than 60."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `422`
10. **Side Effects:** Uploading a new `avatar` deletes the previously stored avatar file and updates `avatar_url` (`DOCUMENTED`).
11. **Evidence Level:** `CONFLICT` (field count vs. Postman) / `DOCUMENTED` (OpenAPI `UpdateProfileRequest`).

### <a id="profile-update-put"></a> `profile-update-put` — PUT /auth/profile

1. **Method & Path:** `PUT /auth/profile` (`operationId: v1.auth.profile.update_9`; **spec-only duplicate** of `POST /auth/profile`)
2. **Auth & Role Restrictions:** Bearer required. Self-update (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: multipart/form-data` or `application/json`
4. **Parameters:** Identical schema to [`profile-update`](#profile-update) (`UpdateProfileRequest`). **Warning:** PHP does not parse `multipart/form-data` file uploads on `PUT`; always use `POST /auth/profile` for avatar uploads.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: UserResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** Same as [`profile-update`](#profile-update):
   ```json
   {
     "success": false,
     "message": "The phone field must not be greater than 30 characters.",
     "errors": {
       "phone": ["The phone field must not be greater than 30 characters."]
     }
   }
   ```
9. **Status Codes:** `200`, `401`, `403`, `422`
10. **Side Effects:** Updates user profile fields (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (spec-only operation; prefer [`profile-update`](#profile-update)).

### <a id="profile-remove-avatar"></a> `profile-remove-avatar` — DELETE /auth/profile/avatar

1. **Method & Path:** `DELETE /auth/profile/avatar` (`operationId: profile.removeAvatar`)
2. **Auth & Role Restrictions:** Bearer required. Self-action for authenticated user (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: UserResource }` (with `avatar_url: null`).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200`, `401`
10. **Side Effects:** Permanently deletes the stored avatar image from server storage and sets `user.avatar_url = null` (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="profile-change-password"></a> `profile-change-password` — PUT /auth/password

1. **Method & Path:** `PUT /auth/password` (`operationId: profile.changePassword`)
2. **Auth & Role Restrictions:** Bearer required. Self-action for authenticated user (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`ChangePasswordRequest`, required):**
     - `current_password*`: `string`
     - `password*`: `string` (`minLength: 8`)
     - `password_confirmation*`: `string` (`minLength: 8`, must match `password`)
   - *CONFLICT:* Postman description names `new_password` / `new_password_confirmation`, whereas Postman request body and OpenAPI `ChangePasswordRequest` both use `password` / `password_confirmation`. **Resolution:** Send `current_password`, `password`, and `password_confirmation` (`OpenAPI` + Postman body).
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The current password is incorrect.",
     "errors": {
       "current_password": ["The current password is incorrect."],
       "password": ["The password field must be at least 8 characters."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `422`
10. **Side Effects:** Updates account password hash. Whether existing tokens are revoked on password change (unlike password reset) is `UNVERIFIED`.
11. **Evidence Level:** `CONFLICT` (resolved: use `password`/`password_confirmation`) / `DOCUMENTED`.

### <a id="profile-tasks"></a> `profile-tasks` — GET /auth/profile/tasks

1. **Method & Path:** `GET /auth/profile/tasks` (`operationId: profile.tasks`)
2. **Auth & Role Restrictions:** Bearer required. Returns tasks assigned to the authenticated user. Verified for Admin (0 items) and PM (4 items); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** No query parameters documented in OpenAPI or Postman (`page`/`per_page` likely work as standard Laravel paginator params — `UNVERIFIED`).
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Assigned tasks retrieved successfully."`), **`P2` raw `LengthAwarePaginator`** containing **raw Eloquent `Task` models** (NOT `TaskResource`!):
   ```ts
   // Item inside data.data[]
   {
     id: number; name: string; description: string | null;
     project_id: number; team_id: number | null; assigned_to: number | null; created_by: number;
     priority: TaskPriority; status: TaskStatus;
     due_date: string | null;       // ISO-Z (NOT YYYY-MM-DD!)
     hours_spent: number;
     completed_at: string | null;   // ISO-Z
     created_at: string; updated_at: string; // ISO-Z
     project: { id: number; name: string; description: string | null; start_date: string; deadline: string; priority: ProjectPriority; status: ProjectStatus; progress_percentage: number; created_by: number; created_at: string; updated_at: string }; // ISO-Z
     team: { id: number; name: string; description: string | null; created_by: number; created_at: string; updated_at: string } | null;
   }
   ```
   - Note: No `assignee`, `creator`, or `attachments_count` fields here (`VERIFIED`).
6. **Pagination Shape:** **`P2`** (raw Laravel `LengthAwarePaginator` inside `data`; default `per_page: 15`; empty page has `from: null`, `to: null`, `data: []`).
7. **Filter & Sort Parameters:** None documented (`UNVERIFIED`; Postman mentions `"status, priority, and deadline sorting"` without parameter names).
8. **Validation Errors (`422`):** N/A — no documented query validation.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (Admin empty page & PM 4 items).

### <a id="profile-files"></a> `profile-files` — GET /auth/profile/files

1. **Method & Path:** `GET /auth/profile/files` (`operationId: profile.files`)
2. **Auth & Role Restrictions:** Bearer required. Returns files uploaded by the authenticated user. Verified for PM (D10); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:** `per_page`: `integer` (`VERIFIED` honored in D10 with `per_page=2`); `page`: `integer` (`UNVERIFIED`, standard P1). OpenAPI documents no query params.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Uploaded files retrieved successfully."`), **`P1`** collection of [`FileAttachmentResource`](#shared-resource-shapes).
   - *CONFLICT:* OpenAPI left `data` untyped (`{}`). D10 `VERIFIED` that unlike `/auth/profile/tasks` (which uses `P2` + raw models), `/auth/profile/files` uses **`P1`** + `FileAttachmentResource`.
6. **Pagination Shape:** **`P1`** (`VERIFIED` in D10).
7. **Filter & Sort Parameters:** `per_page` (`VERIFIED`), `page` (`UNVERIFIED`). No other filters documented.
8. **Validation Errors (`422`):** N/A — no documented query validation.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (D10 PM probe; resolves OpenAPI untyped `data`).

---

## 3. Dashboard (`dashboard-*`)

### <a id="dashboard-index"></a> `dashboard-index` — GET /dashboard

1. **Method & Path:** `GET /dashboard` (`operationId: dashboard.index`)
2. **Auth & Role Restrictions:** Bearer required. Scoped by role: Admin sees workspace-wide totals (`29` projects, `346` tasks, `13` teams); PM sees accessible projects/tasks (`16` projects, `192` tasks) and **only own membership teams** (`2` teams vs. `10` on `GET /teams`). Verified for Admin & PM; Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query (filters `project_overview` chart only; other blocks are unaffected):**
     - `period`: `"year" | "6_months" | "3_months" | "30_days" | "7_days" | "custom" | null` (optional; default `"year"`)
     - `year`: `integer | null` (`2000`–`2100`; used with `period=year`)
     - `from`: `string | null` (`YYYY-MM-DD`; used with `period=custom`)
     - `to`: `string | null` (`YYYY-MM-DD`; used with `period=custom`)
5. **Response Envelope & `data` Shape:** **`E2` (NO `message` key!)**, `200 OK`: `{ success: true, data: { ... } }`:
   ```ts
   data: {
     overview: {
       projects: { total: number; active: number; completed: number; average_progress: number };
       tasks: {
         total: number; pending: number; in_progress: number; in_review: number; completed: number;
         overdue: number; assigned_to_me: number;
         pending_percentage: number; in_progress_percentage: number; in_review_percentage: number;
         completed_percentage: number; completion_rate: number;
         by_priority: { low: number; medium: number; high: number; critical: number };
       };
       meetings: { upcoming_count: number };
       teams: { total: number };
     };
     project_overview: {
       period: string; year: number; from: string; to: string; group_by: string; // from/to: YYYY-MM-DD
       data: Array<{
         label: string; month: string; month_number: number; year: number;
         is_future: boolean; projects: number; created_tasks: number; completed_tasks: number;
       }>;
     };
     active_projects: { items: Array<{ id: number; name: string; progress: number; tasks_total: number | null; tasks_completed: number | null }>; pagination: P3Pagination }; // per_page 5
     tasks: { items: Array<{ id: number; name: string; priority: "low" | "medium" | "high" | "critical"; status: "pending" | "in_progress" | "in_review" | "completed"; status_label: TaskStatus; due_date: string | null; project: { id: number; name: string }; assignee: { id: number; name: string; avatar_url: string | null } | null }>; pagination: P3Pagination }; // per_page 5
     teams: { items: Array<{ id: number; name: string; description: string | null; members_count: number; projects_count: number }>; pagination: P3Pagination }; // per_page 10
     upcoming_meetings: { items: Array<{ id: number; title: string; date: string; start_time: string; end_time: string; meeting_link: string; project: { id: number; name: string }; creator: { id: number; name: string }; participants: Array<{ id: number; name: string; avatar_url: string | null }> }> }; // NO pagination
     recent_files: { items: Array<{ id: number; name: string; mime_type: string | null; file_size_formatted: string; download_url: string; uploaded_by: { id: number; name: string }; project: { id: number; name: string }; created_at: string }>; pagination: P3Pagination }; // per_page 5
     recent_activity: { items: Array<{ id: number; category: AuditLogCategory; action: string; description: string | null; user: { id: number; name: string; avatar_url: string | null }; created_at: string }>; pagination: P3Pagination }; // per_page 10
   }
   ```
   - **`CONFLICT` #1 (`overview` & `project_overview`):** OpenAPI types both as `string` and `pagination.*` fields as `string`. **Resolution (`VERIFIED`):** Both are nested JSON objects and pagination values are `integer`s as shown above.
   - **`CONFLICT` #2 (Dashboard task enums):** `tasks.items[].status` and `.priority` are **lowercase snake_case** (`"in_progress"`, `"high"`), unlike Title-case on all other task endpoints; `status_label` carries the Title-case label (`VERIFIED`).
   - **`CONFLICT` #3 (`download_url` & `uploaded_by`):** `recent_files.items[].download_url` is a **root-relative path** `/api/v1/files/{id}/download` requiring Bearer auth (whereas `FileAttachmentResource.url` is absolute), and `uploaded_by` is `{ id, name }` here (whereas `FileAttachmentResource.uploaded_by` is a plain string) (`VERIFIED` in D10).
6. **Pagination Shape:** **`P3`** per block (`{ items, pagination: { current_page, per_page, total } }`), except `upcoming_meetings` which has `{ items }` only. No block-level pagination query params are documented.
7. **Filter & Sort Parameters:** `period`, `year`, `from`, `to` (chart-only, `DOCUMENTED`; query filter runtime behaviour `UNVERIFIED`).
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected period is invalid.",
     "errors": {
       "period": ["The selected period is invalid."],
       "year": ["The year field must be between 2000 and 2100."]
     }
   }
   ```
   *(Sanitised illustrative example for OpenAPI query constraints.)*
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `422` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (Admin & PM + D10 `download_url` check; live shape resolves OpenAPI string-typing defects).

---

## 4. Projects (`projects-*`)

### <a id="projects-index"></a> `projects-index` — GET /projects

1. **Method & Path:** `GET /projects` (`operationId: projects.index`)
2. **Auth & Role Restrictions:** Bearer required. Admin sees all projects (`29` observed); PM sees subset (`16` observed — created, direct member, or team-assigned). Team Member visibility `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:** `page`: `integer` (`VERIFIED`), `per_page`: `integer` (`VERIFIED`, default `15`); Postman-only (`UNVERIFIED` by OpenAPI): `search`: `string`, `status`: `ProjectStatus`, `priority`: `ProjectPriority`, `sort`: `string` (only value seen in Postman: `"newest"`).
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Projects retrieved successfully."`), **`P1`** collection of [`ProjectListItem`](#shared-resource-shapes) (no `updated_at`, `created_by`, `creator`, or member list).
   - *CONFLICT:* OpenAPI left `data` untyped (`{}`). Live responses `VERIFIED` `P1` + `ProjectListItem`.
6. **Pagination Shape:** **`P1`** (`VERIFIED` with `per_page=2&page=2`).
7. **Filter & Sort Parameters:** `page`, `per_page` (`VERIFIED`); `search`, `status`, `priority`, `sort` (Postman-documented, `UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — OpenAPI documents no `422` for `projects.index`.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `500` (`VERIFIED` if `Accept: application/json` omitted without auth)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (Admin & PM list + pagination; filters/sort `DOCUMENTED`/`UNVERIFIED`).

### <a id="projects-store"></a> `projects-store` — POST /projects

1. **Method & Path:** `POST /projects` (`operationId: projects.store`)
2. **Auth & Role Restrictions:** Bearer required. Postman states `Administrator` and `Project Manager` (`DOCUMENTED`; Team Member `403` `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`StoreProjectRequest`, required):**
     - `name*`: `string` (`maxLength: 255`)
     - `description`: `string | null`
     - `start_date*`: `string` (`YYYY-MM-DD` in Postman; `format: date-time` in OpenAPI)
     - `deadline*`: `string` (`>= start_date` per Postman; `format: date-time` in OpenAPI)
     - `priority`: `ProjectPriority | null` (`"Low" | "Medium" | "High" | "Critical"`; optional/nullable in OpenAPI, required in Postman description — **CONFLICT**: treat as optional in schema, send a valid enum value in UI forms)
     - `status`: `ProjectStatus | null` (`"Pending" | "In Progress" | "On Hold" | "Completed" | "Cancelled"`). **`CONFLICT`:** Postman descriptions list `"Planning"` (invalid in OpenAPI and absent from live data) and omit `"Pending"`/`"Cancelled"`. **Resolution:** Use OpenAPI/live `ProjectStatus` (`"Pending"`, `"In Progress"`, `"On Hold"`, `"Completed"`, `"Cancelled"`).
     - `teams`: `integer[] | null` (team IDs)
     - `members`: `Array<{ user_id: integer, role?: string | null /* <= 100, free text */ }> | null`
     - *CONFLICT:* Postman description mentions `"budget metadata"`, but **no `budget` field exists** in OpenAPI or Postman body. **Resolution:** Omit `budget`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: ProjectOverviewResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The deadline field must be a date after or equal to start date.",
     "errors": {
       "name": ["The name field is required."],
       "deadline": ["The deadline field must be a date after or equal to start date."],
       "status": ["The selected status is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `201`, `401`, `403`, `422`
10. **Side Effects:** Creates project, attaches `teams` and direct `members`, records `project` audit log (`DOCUMENTED`).
11. **Evidence Level:** `CONFLICT` (status enum, priority requiredness, phantom budget field — resolved to OpenAPI) / `DOCUMENTED`.

### <a id="projects-show"></a> `projects-show` — GET /projects/{project}

1. **Method & Path:** `GET /projects/{project}` (`operationId: projects.show`; **spec-only**, absent from Postman)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for Admin and PM on visible projects; verified **`403`** for PM on an existing non-visible project (`D10`: `{"success":false,"message":"This action is unauthorized.","errors":null}`). Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Project retrieved successfully."`): `{ success: true, message: string, data: ProjectOverviewResource }`.
   - Note (`VERIFIED`): `data.teams[]` contains no `creator` and no `members` array (subset of `TeamResource`); `due_date_indicator.total_days` is an `integer`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`VERIFIED` in D10), `404` (`VERIFIED` in D10: `"No query results for model [App\\Models\\Project] <id>"`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (Admin & PM `200`; D10 PM `403` and `404`).

### <a id="projects-update"></a> `projects-update` — PUT /projects/{project}

1. **Method & Path:** `PUT /projects/{project}` (`operationId: projects.update`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated in OpenAPI (`UNVERIFIED`; likely Admin/PM/project creator).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `project*`: `integer`
   - **JSON body (`UpdateProjectRequest`, optional; all fields optional):**
     - `name`: `string` (`maxLength: 255`)
     - `description`: `string | null`
     - `start_date`: `string` (`format: date-time` / `YYYY-MM-DD`)
     - `deadline`: `string` (`format: date-time` / `YYYY-MM-DD`)
     - `priority`: `ProjectPriority | null`
     - `status`: `ProjectStatus | null`
     - `teams`: `integer[] | null` (spec adds `description`, `start_date`, `deadline`, `teams` beyond Postman's 3 fields; no `members` field on update)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: ProjectOverviewResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected status is invalid.",
     "errors": {
       "status": ["The selected status is invalid."],
       "deadline": ["The deadline field must be a date after or equal to start date."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates project metadata and/or team links; Postman notes progress is auto-recalculated from tasks (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI `UpdateProjectRequest` is more complete than Postman).

### <a id="projects-destroy"></a> `projects-destroy` — DELETE /projects/{project}

1. **Method & Path:** `DELETE /projects/{project}` (`operationId: projects.destroy`)
2. **Auth & Role Restrictions:** Bearer required. Postman states `Administrator` and Project Creator (`DOCUMENTED`; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no body/query validation.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** **Destructive cascade:** Postman states deletion removes the project along with its cascade hierarchy (tasks, meetings, messages, attachments). Whether soft-deleted or hard-deleted is `UNVERIFIED`.
11. **Evidence Level:** `DOCUMENTED` (soft vs. hard delete `UNVERIFIED`).

### <a id="projects-overview"></a> `projects-overview` — GET /projects/{project}/overview

1. **Method & Path:** `GET /projects/{project}/overview` (`operationId: project.overview`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for Admin and PM on visible projects; Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
   - **Query:**
     - `period`: `"year" | "6_months" | null` (optional; default `"year"`, `DOCUMENTED` in OpenAPI, absent from Postman)
     - `year`: `integer | null` (`2000`–`2100`, `DOCUMENTED`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Project overview retrieved successfully."`): `data` is `ProjectOverviewResource` **plus** `chart`:
   ```ts
   data: ProjectOverviewResource & {
     chart: {
       period: string;       // e.g. "year"
       year: number;
       group_by: string;
       data: Array<{
         month: string;
         month_number: number;
         year: number;
         label: string;      // e.g. "Jan 2026"
         created_tasks: number;
         completed_tasks: number;
         progress_percentage: number | null;
         is_future: boolean;
       }>;
     };
   }
   ```
   - **`CONFLICT`:** OpenAPI types `data` as an untyped `array`. **Resolution (`VERIFIED`):** `data` is a single JSON object (`ProjectOverviewResource` + `chart`). Also `teams[]` has no `members` array (fetch [`projects-teams-index`](#projects-teams-index) for per-team member rosters).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** `period` (`"year" | "6_months"`), `year` (`2000`–`2100`) — `DOCUMENTED`, filter behaviour `UNVERIFIED`.
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected period is invalid.",
     "errors": {
       "period": ["The selected period is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example for query validation.)*
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `404` (`DOCUMENTED`), `422` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (Admin & PM + people-picker probe; resolves OpenAPI `array` defect).

### <a id="projects-teams-index"></a> `projects-teams-index` — GET /projects/{project}/teams

1. **Method & Path:** `GET /projects/{project}/teams` (`operationId: project.teams`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for PM on visible project; Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Project teams and progress retrieved successfully."`), plain array (not paginated):
   ```ts
   data: Array<{
     id: number;
     name: string;
     completion_percentage: number; // observed integer; treat as number
     total_tasks: number;
     completed_tasks: number;
     members: Array<{
       id: number;
       name: string;
       avatar_url: string | null;
       role_in_team: TeamRole;
       is_leader: boolean;
       tasks_completed: number;
       tasks_total: number;
       tasks_ratio: string;         // e.g. "12/20" (Postman)
       progress_percentage: number;
     }>; // NOTE: no email, job_title, or joined_at on member items
   }>
   ```
   - **`CONFLICT`:** OpenAPI `ProjectTeamProgressResource` types `members` as `string | string[]`, omits `tasks_ratio`, and types counts as `string | 0`. **Resolution (`VERIFIED`):** `members` is an array of member-progress objects with numeric counts and `tasks_ratio: string`, and team counts are numeric.
6. **Pagination Shape:** `none` (plain array)
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `404` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (PM people-picker probe; resolves OpenAPI `members: string[]` defect).

### <a id="projects-teams-assign"></a> `projects-teams-assign` — POST /projects/{project}/teams

1. **Method & Path:** `POST /projects/{project}/teams` (`operationId: project.assignTeams`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; likely Admin/PM).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `project*`: `integer`
   - **JSON body (`AssignTeamsRequest`, required):**
     - `team_ids*`: `integer[]` (`minItems: 1`, existing team IDs)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: ProjectOverviewResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The team ids field must have at least 1 items.",
     "errors": {
       "team_ids": ["The team ids field must have at least 1 items."],
       "team_ids.0": ["The selected team_ids.0 is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Attaches specified teams to the project (grants team members project visibility).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="projects-teams-remove"></a> `projects-teams-remove` — DELETE /projects/{project}/teams/{team}

1. **Method & Path:** `DELETE /projects/{project}/teams/{team}` (`operationId: project.removeTeam`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; likely Admin/PM).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`, `team*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: ProjectOverviewResource }` (returns updated project, **not** `null`).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameters only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Detaches team from project without deleting the team itself (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

---

## 5. Tasks & Kanban (`tasks-*`)

### <a id="tasks-index"></a> `tasks-index` — GET /tasks

1. **Method & Path:** `GET /tasks` (`operationId: tasks.index`)
2. **Auth & Role Restrictions:** Bearer required. Verified for Admin (`346` tasks) and PM (`192` tasks — scoped to visible projects); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:** `project_id`: `integer` (`VERIFIED`), `per_page`: `integer` (`VERIFIED`, default `15`), `page`: `integer` (`UNVERIFIED`, standard P1); Postman-only (`UNVERIFIED` by OpenAPI): `status`: `TaskStatus`, `priority`: `TaskPriority`, `assigned_to`: `integer`, `due_date`: `YYYY-MM-DD`, `overdue`: `0 | 1 | boolean`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Tasks retrieved successfully."`), **`P1`** collection of [`TaskResource`](#shared-resource-shapes).
   - *CONFLICT:* OpenAPI `anyOf` lists an untyped `data` branch and an undocumented `"Kanban board retrieved successfully."` (`data: string`) branch; live calls returned `P1` + `TaskResource[]` (`VERIFIED`).
6. **Pagination Shape:** **`P1`** (`VERIFIED`).
7. **Filter & Sort Parameters:** `project_id`, `per_page` (`VERIFIED`); `page`, `status`, `priority`, `assigned_to`, `due_date`, `overdue` (`DOCUMENTED` in Postman / `UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — OpenAPI documents no `422` for `tasks.index`.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (Admin & PM list + `project_id` & `per_page`; remaining Postman filters `DOCUMENTED`/`UNVERIFIED`).

### <a id="tasks-kanban"></a> `tasks-kanban` — GET /projects/{project}/tasks/kanban

1. **Method & Path:** `GET /projects/{project}/tasks/kanban` (`operationId: task.kanban`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for Admin and PM on visible projects; Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`; note `message` embeds project name: `"Kanban board for project '<name>' retrieved successfully."`):
   ```ts
   data: {
     project: { id: number; name: string; progress_percentage: number };
     total_tasks: number;
     columns: {
       "Pending":     { name: "Pending";     count: number; tasks: TaskResource[] };
       "In Progress": { name: "In Progress"; count: number; tasks: TaskResource[] };
       "In Review":   { name: "In Review";   count: number; tasks: TaskResource[] };
       "Completed":   { name: "Completed";   count: number; tasks: TaskResource[] };
     };
   }
   ```
   - **`CONFLICT`:** OpenAPI types `data` as `string`; Postman description lists snake_case column keys (`pending`, `in_progress`, `in_review`, `completed`). **Resolution (`VERIFIED` + D10):** `data` is an object with `columns` keyed by **Title-case `TaskStatus`** in exact order `["Pending", "In Progress", "In Review", "Completed"]`, every column is always present even when `count: 0`, and `columns[key].name` equals the exact Title-case key (`"Pending"`, `"In Progress"`, `"In Review"`, `"Completed"`).
6. **Pagination Shape:** `none` (returns all tasks for the project grouped by status).
7. **Filter & Sort Parameters:** None documented.
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `404` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (Admin & PM + D10 column `name` verification).

### <a id="tasks-store"></a> `tasks-store` — POST /tasks

1. **Method & Path:** `POST /tasks` (`operationId: tasks.store`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated in OpenAPI (`UNVERIFIED`; Postman implies Admin/PM create tasks; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`StoreTaskRequest`, required):**
     - `name*`: `string` (`maxLength: 255`)
     - `description`: `string | null`
     - `project_id*`: `integer`
     - `team_id`: `integer | null` (present in OpenAPI & Postman body; omitted from Postman description)
     - `assigned_to`: `integer | null` (user ID)
     - `priority`: `TaskPriority | null` (`"Low" | "Medium" | "High" | "Critical"`)
     - `status`: `TaskStatus | null` (`"Pending" | "In Progress" | "In Review" | "Completed"`; default `"Pending"` per Postman)
     - `due_date`: `string | null` (`YYYY-MM-DD` in Postman; `format: date-time` in OpenAPI)
     - `hours_spent`: `number | null` (`0`–`10000`; OpenAPI-only, absent from Postman)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: TaskResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The project id field is required.",
     "errors": {
       "name": ["The name field is required."],
       "project_id": ["The project id field is required."],
       "hours_spent": ["The hours spent field must be between 0 and 10000."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `201`, `401`, `403`, `422`
10. **Side Effects:** Creates task, recalculates project progress, notifies `assigned_to` if set (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI `StoreTaskRequest` reconciles Postman body/description differences).

### <a id="tasks-show"></a> `tasks-show` — GET /tasks/{task}

1. **Method & Path:** `GET /tasks/{task}` (`operationId: tasks.show`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for Admin and PM on visible tasks; Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `task*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Task details retrieved successfully."`): `{ success: true, message: string, data: TaskResource }`.
   - **`CONFLICT`:** Postman description claims Task Details includes `"subtasks, attached files"`. **Resolution (`VERIFIED`):** Live response is a single `TaskResource` containing `attachments_count: integer` only — **no `subtasks` and no `attachments` array**. Fetch task attachments via `GET /files?task_id={task}` ([`files-index`](#files-index)).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `404` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (Admin & PM; resolves Postman subtask/attachment claim).

### <a id="tasks-update"></a> `tasks-update` — PUT /tasks/{task}

1. **Method & Path:** `PUT /tasks/{task}` (`operationId: tasks.update`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `task*`: `integer`
   - **JSON body (`UpdateTaskRequest`, optional; all fields optional):**
     - `name`: `string` (`maxLength: 255`)
     - `description`: `string | null`
     - `project_id`: `integer`
     - `team_id`: `integer | null`
     - `assigned_to`: `integer | null`
     - `priority`: `TaskPriority` (not nullable when sent)
     - `status`: `TaskStatus` (not nullable when sent)
     - `due_date`: `string | null` (`format: date-time` / `YYYY-MM-DD`)
     - `hours_spent`: `number | null` (`0`–`10000`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: TaskResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected priority is invalid.",
     "errors": {
       "priority": ["The selected priority is invalid."],
       "status": ["The selected status is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates task fields; recalculates project progress and `completed_at` if status changes (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="tasks-update-status"></a> `tasks-update-status` — PATCH /tasks/{task}/status

1. **Method & Path:** `PATCH /tasks/{task}/status` (`operationId: task.updateStatus`)
2. **Auth & Role Restrictions:** Bearer required. Postman Team Member login description states members can update task status (`DOCUMENTED`; Team Member behaviour `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `task*`: `integer`
   - **JSON body (`UpdateTaskStatusRequest`, required):**
     - `status*`: `TaskStatus` (`"Pending" | "In Progress" | "In Review" | "Completed"`)
     - `hours_spent`: `number | null` (`0`–`10000`; OpenAPI-only, absent from Postman)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: TaskResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected status is invalid.",
     "errors": {
       "status": ["The selected status is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Records `completed_at` timestamp when moved to `"Completed"` and recalculates parent project `progress_percentage` (`DOCUMENTED`). Spec ID-19 designates this endpoint as the **only** mutation using optimistic UI updates (with snapshot rollback on `403`/error and revalidation when settled).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="tasks-assign"></a> `tasks-assign` — PATCH /tasks/{task}/assign

1. **Method & Path:** `PATCH /tasks/{task}/assign` (`operationId: task.assign`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `task*`: `integer`
   - **JSON body (`AssignTaskRequest`, optional):**
     - `assigned_to`: `integer | null` (user ID; `null` unassigns)
     - `team_id`: `integer | null` (team ID; documented in OpenAPI & Postman body, omitted from Postman description)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: TaskResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected assigned to is invalid.",
     "errors": {
       "assigned_to": ["The selected assigned to is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Assigns/reassigns task and creates an in-app `task_assigned` notification for the assignee (`DOCUMENTED`; `task_assigned` notification payload `VERIFIED` in D10).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="tasks-destroy"></a> `tasks-destroy` — DELETE /tasks/{task}

1. **Method & Path:** `DELETE /tasks/{task}` (`operationId: tasks.destroy`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `task*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Deletes task and recalculates parent project `progress_percentage` (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

---

## 6. Teams & Team Roles (`teams-*`)

### <a id="teams-roles"></a> `teams-roles` — GET /team-roles

1. **Method & Path:** `GET /team-roles` (`operationId: v1.teamRole`)
2. **Auth & Role Restrictions:** Bearer required. Any authenticated user (`DOCUMENTED`; verified for Admin & PM; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Team roles retrieved successfully."`):
   ```ts
   data: {
     roles: Array<{ value: TeamRole; is_leader: boolean }>; // 19 items; "Team Lead" and "Tech Lead" have is_leader: true
     default: "Member";
   }
   ```
   - Note: OpenAPI leaves `roles[]` items untyped; live probe (`VERIFIED`) + Postman saved example confirm `{ value: TeamRole, is_leader: boolean }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`)
10. **Side Effects:** None (read-only static lookup).
11. **Evidence Level:** `VERIFIED` (Admin & PM + Postman saved `200` example).

### <a id="teams-index"></a> `teams-index` — GET /teams

1. **Method & Path:** `GET /teams` (`operationId: teams.index`)
2. **Auth & Role Restrictions:** Bearer required. Verified for Admin (`13` teams) and PM (`10` teams — broader than PM's `2` own memberships on `/dashboard`). Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:** `page`: `integer` (`VERIFIED`), `per_page`: `integer` (`VERIFIED`, default `15`); Postman-only (`UNVERIFIED` by OpenAPI): `search`: `string`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Teams retrieved successfully."`), **`P1`** collection of [`TeamResource`](#shared-resource-shapes) (including `creator` and `members[]`).
   - *CONFLICT:* OpenAPI left `data` untyped (`{}`) and allowed `string | integer` for `members_count`/`active_projects_count`. Live responses `VERIFIED` `P1` + integer counts.
6. **Pagination Shape:** **`P1`** (`VERIFIED` with `per_page=2&page=2`).
7. **Filter & Sort Parameters:** `page`, `per_page` (`VERIFIED`); `search` (`DOCUMENTED` in Postman / `UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — OpenAPI documents no `422`.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (Admin & PM list + pagination; `search` `UNVERIFIED`).

### <a id="teams-store"></a> `teams-store` — POST /teams

1. **Method & Path:** `POST /teams` (`operationId: teams.store`)
2. **Auth & Role Restrictions:** Bearer required. Postman states `Administrator` and `Project Manager` (`DOCUMENTED`; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`StoreTeamRequest`, required):**
     - `name*`: `string` (`maxLength: 255`)
     - `description`: `string | null` (`maxLength: 1000`)
     - `members`: `Array<{ user_id: integer, role_in_team?: TeamRole | null }> | null` (must be valid values from [`teams-roles`](#teams-roles); default `"Member"`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: TeamResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** *(Saved Postman example, sanitised)*
   ```json
   {
     "success": false,
     "message": "The selected role_in_team is invalid. Allowed values: Team Lead, Tech Lead, Product Owner, Scrum Master, Backend Developer, Frontend Developer, Mobile Developer, Full-Stack Developer, UI/UX Designer, QA Engineer, DevOps Engineer, Data Engineer, AI/ML Engineer, Security Engineer, Business Analyst, Support Engineer, Mentor, Intern, Member. See GET /api/v1/team-roles.",
     "errors": {
       "members.0.role_in_team": [
         "The selected role_in_team is invalid. Allowed values: Team Lead, Tech Lead, Product Owner, Scrum Master, Backend Developer, Frontend Developer, Mobile Developer, Full-Stack Developer, UI/UX Designer, QA Engineer, DevOps Engineer, Data Engineer, AI/ML Engineer, Security Engineer, Business Analyst, Support Engineer, Mentor, Intern, Member. See GET /api/v1/team-roles."
       ]
     }
   }
   ```
9. **Status Codes:** `201`, `401`, `403`, `422`
10. **Side Effects:** Creates team, attaches specified members, and auto-adds the creator as `"Team Lead"` (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman saved `422` example).

### <a id="teams-show"></a> `teams-show` — GET /teams/{team}

1. **Method & Path:** `GET /teams/{team}` (`operationId: teams.show`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for PM (people-picker probe); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `team*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Team retrieved successfully."`): `{ success: true, message: string, data: TeamResource }`.
   - **`CONFLICT`:** Postman description states Team Details returns `"assigned projects"`. **Resolution (`VERIFIED`):** Live response returns `active_projects_count: integer` only — **no assigned-projects array**.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `404` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (PM people-picker probe).

### <a id="teams-update"></a> `teams-update` — PUT /teams/{team}

1. **Method & Path:** `PUT /teams/{team}` (`operationId: teams.update`)
2. **Auth & Role Restrictions:** Bearer required. Postman states `Administrator` and Team Leads (`DOCUMENTED`; `UNVERIFIED` live).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `team*`: `integer`
   - **JSON body (`UpdateTeamRequest`, optional):**
     - `name`: `string` (`maxLength: 255`)
     - `description`: `string | null` (`maxLength: 1000`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: TeamResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The name field must not be greater than 255 characters.",
     "errors": {
       "name": ["The name field must not be greater than 255 characters."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates team name/description (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="teams-assign-members"></a> `teams-assign-members` — POST /teams/{team}/members

1. **Method & Path:** `POST /teams/{team}/members` (`operationId: team.assignMembers`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; likely Admin/PM/Team Lead).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `team*`: `integer`
   - **JSON body (`AssignMembersRequest`, required):**
     - `members*`: `Array<{ user_id*: integer, role_in_team?: TeamRole | null }>` (`minItems: 1`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: TeamResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The members field must have at least 1 items.",
     "errors": {
       "members": ["The members field must have at least 1 items."],
       "members.0.role_in_team": ["The selected role_in_team is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Upserts team memberships (adds new members or updates `role_in_team` for existing members) (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="teams-remove-member"></a> `teams-remove-member` — DELETE /teams/{team}/members/{user}

1. **Method & Path:** `DELETE /teams/{team}/members/{user}` (`operationId: team.removeMember`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; likely Admin/PM/Team Lead).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `team*`: `integer`, `user*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: TeamResource }` (returns updated team, **not** `null`).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameters only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Detaches user from team (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="teams-destroy"></a> `teams-destroy` — DELETE /teams/{team}

1. **Method & Path:** `DELETE /teams/{team}` (`operationId: teams.destroy`)
2. **Auth & Role Restrictions:** Bearer required. Postman states **`Administrator` only** (`DOCUMENTED`; `UNVERIFIED` live).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `team*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Deletes team and detaches linked projects without deleting those projects (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

---

## 7. Users (`users-*`)

### <a id="users-index"></a> `users-index` — GET /users

1. **Method & Path:** `GET /users` (`operationId: users.index`)
2. **Auth & Role Restrictions:** Bearer required.
   - **`CONFLICT`:** Postman folder & description say `"Admin only"`. **Resolution (`VERIFIED`):** Project Manager receives `200 OK` with all `127` users (people-picker probe & D10). Team Member access is `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:**
     - `per_page`: `integer` (`VERIFIED` in D10: `per_page=5`, `per_page=100`, and `per_page=250` all returned `200 OK` with no cap up to 250; default `15` in Postman)
     - `page`: `integer` (`UNVERIFIED`, standard P4)
     - `search`: `string` (`VERIFIED` honored in D10: non-matching string reduced `meta.total` from `127` to `0`)
     - `role`: `string` (summary mentions `"role filters"`, param name `UNVERIFIED`)
   - Note: OpenAPI documents no query parameters despite its summary mentioning search, role filters, and pagination.
5. **Response Envelope & `data` Shape:** **`E2` (NO `message` key!)**, **`P4`**, `200 OK`:
   ```ts
   {
     success: true,
     data: UserResource[], // without current_project; job_title, about, phone, avatar_url observed nullable
     meta: { current_page: number; last_page: number; per_page: number; total: number }
   }
   ```
6. **Pagination Shape:** **`P4`** (`VERIFIED` — sibling `meta` with 4 keys only, no `links`, no `from`/`to`).
7. **Filter & Sort Parameters:** `search` (`VERIFIED`), `per_page` (`VERIFIED`, uncapped up to at least `250`), `page` (`UNVERIFIED`), role filter (`UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — `per_page=250` returned `200` (no validation cap observed up to 250).
9. **Status Codes:** `200` (`VERIFIED` PM), `401` (`VERIFIED`), `403` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` (Postman Admin-only claim disproved for PM) / `VERIFIED` (people-picker probe + D10).

### <a id="users-store"></a> `users-store` — POST /users

1. **Method & Path:** `POST /users` (`operationId: users.store`)
2. **Auth & Role Restrictions:** Bearer required. **`Administrator` only** (`DOCUMENTED` in OpenAPI summary & Postman).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`StoreUserRequest`, required):**
     - `name*`: `string` (`maxLength: 255`)
     - `email*`: `string` (`format: email`, `maxLength: 255`, unique)
     - `password*`: `string` (`minLength: 8`)
     - `role*`: `"Administrator" | "Project Manager" | "Team Member"`
     - `job_title`: `string | null` (`maxLength: 255`)
     - `years_of_experience`: `integer | null` (`0`–`60`)
     - `phone`: `string | null` (`maxLength: 50`; OpenAPI-only, absent from Postman)
     - `status`: `"active" | "inactive" | null`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: UserResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected role is invalid.",
     "errors": {
       "email": ["The email has already been taken."],
       "role": ["The selected role is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `201`, `401`, `403`, `422`
10. **Side Effects:** Creates user account with specified system role and status (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="users-show"></a> `users-show` — GET /users/{user}

1. **Method & Path:** `GET /users/{user}` (`operationId: users.show`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200 OK` for **Project Manager** in D10 (disproves folder-level Admin-only assumption). Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `user*`: `integer`
5. **Response Envelope & `data` Shape:** **`E2` (NO `message` key!)**, `200 OK` (`VERIFIED` top keys `["success", "data"]` in D10): `{ success: true, data: UserResource }`.
   - **`CONFLICT`:** Postman description claims Show User returns `"projects, tasks, audit logs"`. OpenAPI `UserResource` contains none of those. **Resolution:** Treat response as `UserResource` only.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200` (`VERIFIED` PM in D10), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `404` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` (Postman extra fields vs. OpenAPI) / `VERIFIED` (D10 PM `200` & no-`message` envelope).

### <a id="users-update"></a> `users-update` — PUT /users/{user}

1. **Method & Path:** `PUT /users/{user}` (`operationId: users.update`)
2. **Auth & Role Restrictions:** Bearer required. **`Administrator` only** (`DOCUMENTED` in OpenAPI summary & Postman).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `user*`: `integer`
   - **JSON body (`UpdateUserRequest`, optional; all fields optional):**
     - `name`: `string` (`maxLength: 255`)
     - `email`: `string` (`format: email`, `maxLength: 255`)
     - `password`: `string | null` (`minLength: 8`)
     - `role`: `"Administrator" | "Project Manager" | "Team Member" | null`
     - `job_title`: `string | null` (`maxLength: 255`)
     - `years_of_experience`: `integer | null` (`0`–`60`)
     - `phone`: `string | null` (`maxLength: 50`)
     - `status`: `"active" | "inactive" | null`
     *(OpenAPI adds `name`, `email`, `password`, `years_of_experience`, `phone` beyond Postman's 3-field example.)*
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: UserResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected status is invalid.",
     "errors": {
       "status": ["The selected status is invalid."],
       "role": ["The selected role is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates user attributes, role, and/or active status (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="users-destroy"></a> `users-destroy` — DELETE /users/{user}

1. **Method & Path:** `DELETE /users/{user}` (`operationId: users.destroy`)
2. **Auth & Role Restrictions:** Bearer required. **`Administrator` only** (`DOCUMENTED` in OpenAPI summary & Postman).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `user*`: `integer`
5. **Response Envelope & `data` Shape:** **`E4` (NO `data` key!)**, `200 OK`: `{ success: true, message: string }`. (Only delete endpoint in the API without a `data: null` key.)
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Deletes user account (soft vs. hard delete is `UNVERIFIED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

---

## 8. Notifications (`notifications-*`)

### <a id="notifications-index"></a> `notifications-index` — GET /notifications

1. **Method & Path:** `GET /notifications` (`operationId: notification.index`; 2 Postman requests: all & `?status=unread`)
2. **Auth & Role Restrictions:** Bearer required. Scoped to current authenticated user. Verified for PM (D10); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:** `per_page`: `integer` (`VERIFIED` in D10 with `per_page=2`; default `15` in Postman), `page`: `integer` (`UNVERIFIED`), `status`: `"unread"` (Postman-only; `UNVERIFIED`). OpenAPI documents no query params.
5. **Response Envelope & `data` Shape:** Standard `message` + **`P4`**, `200 OK` (message `"Notifications retrieved successfully."`):
   ```ts
   {
     success: true,
     message: "Notifications retrieved successfully.",
     data: NotificationResource[], // id is UUID string; data is JSON object (NOT array!)
     meta: { current_page: number; last_page: number; per_page: number; total: number; unread_count: number }
   }
   ```
   - **`CONFLICT`:** OpenAPI types `NotificationResource.type`/`title`/`message` as untyped and `NotificationResource.data` as an untyped `array`. **Resolution (`VERIFIED` in D10):** `type`, `title`, and `message` are strings, and `data` is a structured JSON object (see [`NotificationResource`](#shared-resource-shapes)).
6. **Pagination Shape:** **`P4`** with extra `meta.unread_count: integer` (`VERIFIED` in D10).
7. **Filter & Sort Parameters:** `per_page` (`VERIFIED`), `page` (`UNVERIFIED`), `status=unread` (`DOCUMENTED` in Postman / `UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — OpenAPI documents no `422`.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`)
10. **Side Effects:** None (read-only). No real-time WebSocket channel is documented for notifications (`UNVERIFIED`); poll [`notifications-unread-count`](#notifications-unread-count) or revalidate on focus/navigation.
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (D10 PM probe; resolves OpenAPI `data: array` defect).

### <a id="notifications-unread-count"></a> `notifications-unread-count` — GET /notifications/unread-count

1. **Method & Path:** `GET /notifications/unread-count` (`operationId: notification.unreadCount`)
2. **Auth & Role Restrictions:** Bearer required. Current user only. Verified for PM (D10); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Unread count retrieved successfully."`): `{ success: true, message: string, data: { unread_count: integer } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200` (`VERIFIED`), `401` (`VERIFIED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (D10 PM probe).

### <a id="notifications-mark-read"></a> `notifications-mark-read` — PATCH /notifications/{id}/read

1. **Method & Path:** `PATCH /notifications/{id}/read` (`operationId: notification.markAsRead`)
2. **Auth & Role Restrictions:** Bearer required. Current user's notification (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `id*`: **`string` (UUID)** — NOT an integer (`VERIFIED` UUID format in D10 `GET /notifications`; `string` in OpenAPI).
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: NotificationResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `404` (`UNVERIFIED` — not listed in OpenAPI but possible for unknown UUID)
10. **Side Effects:** Sets `is_read: true` and `read_at` timestamp; decrements `unread_count` (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman; UUID `id` type `VERIFIED`).

### <a id="notifications-mark-all-read"></a> `notifications-mark-all-read` — POST /notifications/mark-all-read

1. **Method & Path:** `POST /notifications/mark-all-read` (`operationId: notification.markAllAsRead`)
2. **Auth & Role Restrictions:** Bearer required. Current user only (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: { marked_count: integer } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200`, `401`
10. **Side Effects:** Bulk-marks all unread notifications for the current user as read (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="notifications-destroy"></a> `notifications-destroy` — DELETE /notifications/{id}

1. **Method & Path:** `DELETE /notifications/{id}` (`operationId: notification.destroy`)
2. **Auth & Role Restrictions:** Bearer required. Current user's notification (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `id*`: **`string` (UUID)**
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `404` (`UNVERIFIED`)
10. **Side Effects:** Dismisses/deletes the notification for the current user (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

---

## 9. Global Search (`search-*`)

### <a id="search-index"></a> `search-index` — GET /search

1. **Method & Path:** `GET /search` (`operationId: v1.search`; **spec-only**, absent from Postman)
2. **Auth & Role Restrictions:** Bearer required (`401` verified live without token). Scoped to everything the authenticated user is allowed to see (`DOCUMENTED`; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:**
     - `q*`: `string` (`minLength: 1`, `maxLength: 100`, required)
     - `limit`: `integer | null` (`1`–`20`, optional)
     - `types`: `string | null` (optional; allowed values not enumerated in OpenAPI — `UNVERIFIED`, likely comma-separated entity names such as `projects,tasks,teams,files,meetings`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`):
   ```ts
   // OpenAPI types this as: { query: string; total: 0 /* const 0 */; results: string }
   // WARNING (UNVERIFIED): `total: const 0` and `results: string` are Scramble static-inference artifacts.
   // Real `results` is likely a grouped object or array; verify live before wiring Tier 2 search UI (ID-19)!
   ```
   - **`CONFLICT` / `UNVERIFIED`:** OpenAPI's `total: const 0` and `results: string` are implausible static-inference artifacts (mirroring `/dashboard` and `/kanban` before live verification). **Resolution:** Treat `data.results` shape as `UNVERIFIED`; verify live during Tier 2 Search implementation and report exact shape to update `plain.md`.
6. **Pagination Shape:** `none` (bounded by `limit`, `1`–`20`)
7. **Filter & Sort Parameters:** `q*` (`1`–`100`), `limit` (`1`–`20`), `types` (allowed values `UNVERIFIED`)
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The q field is required.",
     "errors": {
       "q": ["The q field is required."],
       "limit": ["The limit field must not be greater than 20."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200` (`DOCUMENTED`), `401` (`VERIFIED`), `422` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `UNVERIFIED` (route existence confirmed via `401`; `200` payload shape & `types` values `UNVERIFIED`).

---

## 10. Files (`files-*`)

### <a id="files-index"></a> `files-index` — GET /files

1. **Method & Path:** `GET /files` (`operationId: files.index`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for PM (`72` files in D10); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:** `per_page`: `integer` (`VERIFIED` in D10 with `per_page=1` and `per_page=2`; default `15` in Postman), `page`: `integer` (`UNVERIFIED`); Postman-only (`UNVERIFIED` by OpenAPI): `project_id`: `integer`, `task_id`: `integer`, `search`: `string`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Files retrieved successfully."`), **`P1`** collection of [`FileAttachmentResource`](#shared-resource-shapes).
   - *CONFLICT:* OpenAPI left `data` untyped (`{}`). D10 `VERIFIED` **`P1`** + `FileAttachmentResource`. Note `uploaded_by` is a plain display-name string, `uploader` is `{ id, name, email }`, and `url` is an absolute URL pointing to `/api/v1/files/{id}/download` (requires Bearer auth!).
6. **Pagination Shape:** **`P1`** (`VERIFIED` in D10).
7. **Filter & Sort Parameters:** `per_page` (`VERIFIED`); `page`, `project_id`, `task_id`, `search` (`DOCUMENTED` in Postman / `UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — OpenAPI documents no `422`.
9. **Status Codes:** `200` (`VERIFIED` D10), `401` (`VERIFIED`), `403` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (D10 PM probe; resolves OpenAPI untyped `data`).

### <a id="files-store"></a> `files-store` — POST /files

1. **Method & Path:** `POST /files` (`operationId: files.store`; 2 Postman requests: Upload to Project & Upload to Task)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: multipart/form-data; boundary=...` (auto-set by `FormData`)
4. **Parameters:**
   - **Multipart form-data (`UploadFileRequest`, required):**
     - `file*`: `binary` (Postman states max **20 MB** for project uploads; task upload size limit not separately stated)
     - `project_id`: `integer | null` (attach to project)
     - `task_id`: `integer | null` (attach to task)
     - `name`: `string | null` (`maxLength: 255`; optional display name override)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: FileAttachmentResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The file field is required.",
     "errors": {
       "file": ["The file field is required."],
       "name": ["The name field must not be greater than 255 characters."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `201`, `401`, `403`, `422`
10. **Side Effects:** Stores file on server disk, creates attachment DB record, increments `files_count` / `attachments_count` (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="files-show"></a> `files-show` — GET /files/{file}

1. **Method & Path:** `GET /files/{file}` (`operationId: files.show`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; scoped by project/task access).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `file*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: FileAttachmentResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (item shape `VERIFIED` via [`files-index`](#files-index)).

### <a id="files-download"></a> `files-download` — GET /files/{file}/download

1. **Method & Path:** `GET /files/{file}/download` (`operationId: file.download`; also targeted by `GET /dashboard` relative `download_url` and `FileAttachmentResource.url`)
2. **Auth & Role Restrictions:** Bearer required (`VERIFIED` in D10: unauthenticated `GET` returns `401` JSON). Verified `200` for PM; Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Authorization: Bearer <token>` (optional `Accept: */*` or omit `Accept: application/json` when streaming binary; sending `Accept: application/json` without a token cleanly returns `401` JSON).
4. **Parameters:**
   - **Path:** `file*`: `integer`
5. **Response Envelope & `data` Shape:** **`E6` Binary stream** (`200 OK`):
   - Observed headers (`VERIFIED` in D10): `Content-Type: <actual file MIME, e.g. image/png>` (not necessarily `application/octet-stream` as OpenAPI states), `Content-Disposition: attachment; filename=<filename>`, `Access-Control-Allow-Origin: *`, **`Access-Control-Expose-Headers` is ABSENT**.
   - **Frontend obligation (`VERIFIED`):** Plain `<a href>` / `<img src>` tags fail with `401` because they do not send `Authorization: Bearer`. Fetch as `Blob` via the authenticated HTTP client (or BFF proxy) and derive the download filename from `FileAttachmentResource.name` / `DashboardFileResource.name` because `Content-Disposition` is unreadable cross-origin.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200` (`VERIFIED` binary), `401` (`VERIFIED` JSON), `403` (`DOCUMENTED`), `404` (`DOCUMENTED`)
10. **Side Effects:** None (read-only binary download).
11. **Evidence Level:** `VERIFIED` (D10 PM unauthenticated `401` + Bearer `200` headers check).

### <a id="files-destroy"></a> `files-destroy` — DELETE /files/{file}

1. **Method & Path:** `DELETE /files/{file}` (`operationId: files.destroy`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `file*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** **Permanent deletion** from both server storage and database (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

---

## 11. Meetings, Attendance, AI Summaries, Comments & Notes (`meetings-*`)

### <a id="meetings-index"></a> `meetings-index` — GET /meetings

1. **Method & Path:** `GET /meetings` (`operationId: meetings.index`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200` for PM (`52` total; `4` upcoming in D10); Team Member `UNVERIFIED` (D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:** `per_page`: `integer` (`VERIFIED` in D10 with `per_page=2`; default `15` in Postman), `time_filter`: `"upcoming" | "past" | "today"` (`VERIFIED` `"upcoming"` honored in D10, reducing `total` from `52` to `4`), `page`: `integer` (`UNVERIFIED`), `project_id`: `integer` (Postman-only; `UNVERIFIED`). OpenAPI documents no query params.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`, message `"Meetings retrieved successfully."`), **`P1`** collection of [`MeetingResource`](#shared-resource-shapes).
   - **`CONFLICT`:** OpenAPI left `data` untyped (`{}`), typed `meeting_date` as plain string without format, and left `summary` arrays untyped. **Resolution (`VERIFIED` in D10):** `P1` + `MeetingResource` (`meeting_date: YYYY-MM-DD`, `start_time`/`end_time: HH:MM:SS`, `summary: MeetingSummaryResource | null` where `action_items` contains BOTH strings and objects and `assigned_tasks` can be BOTH `string[]` and `Record<string, string>`!).
6. **Pagination Shape:** **`P1`** (`VERIFIED` in D10).
7. **Filter & Sort Parameters:** `time_filter` (`"upcoming"` `VERIFIED`; `"past"`, `"today"` `DOCUMENTED` in Postman), `per_page` (`VERIFIED`), `project_id` & `page` (`DOCUMENTED`/`UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — OpenAPI documents no `422`.
9. **Status Codes:** `200` (`VERIFIED` D10), `401` (`VERIFIED`), `403` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` / `VERIFIED` (D10 PM probe; resolves untyped `data` and polymorphic `summary` fields).

### <a id="meetings-store"></a> `meetings-store` — POST /meetings

1. **Method & Path:** `POST /meetings` (`operationId: meetings.store`)
2. **Auth & Role Restrictions:** Bearer required. Postman PM login description lists scheduling meetings as a PM/Admin workflow (`DOCUMENTED`; exact policy `UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`StoreMeetingRequest`, required):**
     - `title*`: `string` (`maxLength: 255`)
     - `description`: `string | null`
     - `meeting_date*`: `string` (`YYYY-MM-DD` in Postman; `format: date-time` in OpenAPI)
     - `start_time*`: `string` (`HH:MM:SS` in Postman)
     - `end_time*`: `string` (`HH:MM:SS`, must be after `start_time` per Postman)
     - `meeting_link*`: `string` (`format: uri`; external Google Meet / Zoom URL)
     - `project_id*`: `integer`
     - `participants`: `integer[] | null` (user IDs)
   - **`CONFLICT`:** Postman description names `attendee_ids`; Postman body and OpenAPI `StoreMeetingRequest` both use `participants`. **Resolution:** Always send `participants`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: MeetingResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The end time field must be a date after start time.",
     "errors": {
       "end_time": ["The end time field must be a date after start time."],
       "meeting_link": ["The meeting link field must be a valid URL."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `201`, `401`, `403`, `422`
10. **Side Effects:** Schedules meeting and dispatches `meeting_scheduled` in-app notifications to participants (`VERIFIED` notification type in D10).
11. **Evidence Level:** `CONFLICT` (resolved: `participants`, not `attendee_ids`) / `DOCUMENTED`.

### <a id="meetings-show"></a> `meetings-show` — GET /meetings/{meeting}

1. **Method & Path:** `GET /meetings/{meeting}` (`operationId: meetings.show`)
2. **Auth & Role Restrictions:** Bearer required. Scoped by project/meeting access (`DOCUMENTED`; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: MeetingResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (`MeetingResource` shape `VERIFIED` via [`meetings-index`](#meetings-index)).

### <a id="meetings-update"></a> `meetings-update` — PUT /meetings/{meeting}

1. **Method & Path:** `PUT /meetings/{meeting}` (`operationId: meetings.update`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; likely Admin/PM/creator).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
   - **JSON body (`UpdateMeetingRequest`, optional; all fields optional):**
     - `title`: `string` (`maxLength: 255`)
     - `description`: `string | null` (spec-only addition beyond Postman)
     - `meeting_date`: `string` (`YYYY-MM-DD` / `format: date-time`)
     - `start_time`: `string` (`HH:MM:SS`)
     - `end_time`: `string` (`HH:MM:SS`)
     - `meeting_link`: `string` (`format: uri`)
     - `status`: `MeetingStatus | null` (`"Scheduled" | "Completed" | "Cancelled"`; spec-only addition)
     - `participants`: `integer[] | null` (spec-only addition)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: MeetingResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected status is invalid.",
     "errors": {
       "status": ["The selected status is invalid."],
       "meeting_link": ["The meeting link field must be a valid URL."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Reschedules/updates meeting details, status, and participant list (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI `UpdateMeetingRequest` is more complete than Postman).

### <a id="meetings-destroy"></a> `meetings-destroy` — DELETE /meetings/{meeting}

1. **Method & Path:** `DELETE /meetings/{meeting}` (`operationId: meetings.destroy`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Deletes meeting (and presumably associated attendance/summary/comments/notes — exact cascade `UNVERIFIED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="meetings-attendance"></a> `meetings-attendance` — PATCH /meetings/{meeting}/attendance

1. **Method & Path:** `PATCH /meetings/{meeting}/attendance` (`operationId: v1.markMeetingAttendance`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; likely Admin/PM/host).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
   - **JSON body (`MarkAttendanceRequest`, required):**
     - `attendance*`: `Array<{ user_id*: integer, attended*: boolean }>` (`minItems: 1`)
   - **`CONFLICT`:** Postman description mentions `user_id` + `status` (`"attended" | "absent" | "excused"`). Postman request body, OpenAPI `MarkAttendanceRequest`, and live `MeetingResource.participants[].attended` (`VERIFIED` in D10) all use boolean `attended`. **Resolution:** Send `{ attendance: [{ user_id, attended }] }`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: MeetingResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The attendance field must have at least 1 items.",
     "errors": {
       "attendance": ["The attendance field must have at least 1 items."],
       "attendance.0.attended": ["The attendance.0.attended field must be true or false."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates per-participant attendance flags (feeds into user attendance rate in reports) (`DOCUMENTED`).
11. **Evidence Level:** `CONFLICT` (resolved: boolean `attended`) / `DOCUMENTED` (`participants[].attended` boolean `VERIFIED` in D10).

### <a id="meetings-summary-generate"></a> `meetings-summary-generate` — POST /meetings/{meeting}/summary/generate

1. **Method & Path:** `POST /meetings/{meeting}/summary/generate` (`operationId: meetingSummary.generate`)
2. **Auth & Role Restrictions:** Bearer required. Postman PM login description lists generating AI summaries as a PM/Admin workflow (`DOCUMENTED`; exact policy `UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
   - **JSON body (`GenerateSummaryRequest`, optional):**
     - `transcript`: `string | null` (optional; what the backend summarizes when omitted is `UNVERIFIED`)
   - **`CONFLICT`:** Postman description names `notes`; Postman body and OpenAPI `GenerateSummaryRequest` both use `transcript`. **Resolution:** Always send `transcript`.
5. **Response Envelope & `data` Shape:** Standard (`E1`, **`200 OK`** — NOT `201`): `{ success: true, message: string, data: MeetingSummaryResource }`.
   - Note (`VERIFIED` in D10 on `GET /meetings`): `action_items` can contain strings and/or `{ title, suggested_assignee?, priority? }` objects, and `assigned_tasks` can be `string[]` or `Record<string, string>`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The transcript field must be a string.",
     "errors": {
       "transcript": ["The transcript field must be a string."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200` (not `201`), `401`, `403`, `404`, `422`
10. **Side Effects:** Invokes external AI provider (Google Gemini with local NLP fallback per Postman) and creates/overwrites the meeting's summary (`DOCUMENTED`). May take several seconds — allow generous timeout.
11. **Evidence Level:** `CONFLICT` (resolved: `transcript`, not `notes`) / `DOCUMENTED` (`MeetingSummaryResource` polymorphic shape `VERIFIED` in D10).

### <a id="meetings-summary-show"></a> `meetings-summary-show` — GET /meetings/{meeting}/summary

1. **Method & Path:** `GET /meetings/{meeting}/summary` (`operationId: meetingSummary.show`)
2. **Auth & Role Restrictions:** Bearer required. Scoped by meeting access (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: MeetingSummaryResource }`. Returns `404` if no summary exists yet for the meeting.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (`MeetingSummaryResource` shape `VERIFIED` via [`meetings-index`](#meetings-index)).

### <a id="meetings-summary-update"></a> `meetings-summary-update` — PUT /meetings/{meeting}/summary

1. **Method & Path:** `PUT /meetings/{meeting}/summary` (`operationId: meetingSummary.update`)
2. **Auth & Role Restrictions:** Bearer required. Postman states `"Allows project managers"` (and likely Admins) to edit/approve summaries (`DOCUMENTED`; exact policy `UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
   - **JSON body (`UpdateSummaryRequest`, required):**
     - `summary*`: `string`
     - `decisions_made`: `string[] | null`
     - `action_items`: `Array<{ title: string, suggested_assignee?: string | null, priority?: string | null }> | null` (spec addition beyond Postman)
     - `assigned_tasks`: `string[] | null` (spec addition beyond Postman)
     - `risks`: `string[] | null` (spec addition beyond Postman)
     - `next_steps`: `string[] | null` (spec addition beyond Postman)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: MeetingSummaryResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The summary field is required.",
     "errors": {
       "summary": ["The summary field is required."],
       "decisions_made": ["The decisions made field must be an array."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Overwrites stored meeting summary fields (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI `UpdateSummaryRequest` is more complete than Postman).

### <a id="meetings-summary-create-tasks"></a> `meetings-summary-create-tasks` — POST /meetings/{meeting}/summary/create-tasks

1. **Method & Path:** `POST /meetings/{meeting}/summary/create-tasks` (`operationId: meetingSummary.createTasks`)
2. **Auth & Role Restrictions:** Bearer required. Role restrictions not explicitly stated (`UNVERIFIED`; likely Admin/PM).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
   - **JSON body (`CreateTasksFromSummaryRequest`, optional):**
     - `action_item_indices`: `integer[] | null` (`each >= 0`; OpenAPI addition to choose specific action items; omitting likely converts all)
     - `default_priority`: `TaskPriority | null` (`"Low" | "Medium" | "High" | "Critical"`)
     - `default_due_date`: `string | null` (`YYYY-MM-DD` / `format: date-time`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: { tasks_count: integer, tasks: TaskResource[] } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The selected default priority is invalid.",
     "errors": {
       "default_priority": ["The selected default priority is invalid."],
       "action_item_indices.0": ["The action_item_indices.0 field must be at least 0."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `201`, `401`, `403`, `404`, `422`
10. **Side Effects:** **Bulk-creates Kanban tasks** inside the meeting's project and recalculates project progress. Whether repeated calls deduplicate or create duplicate tasks is `UNVERIFIED` — guard against double submission!
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman; idempotency `UNVERIFIED`).

### <a id="meetings-comments-index"></a> `meetings-comments-index` — GET /meetings/{meeting}/comments

1. **Method & Path:** `GET /meetings/{meeting}/comments` (`operationId: meetings.comments.index`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required (`DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`), `data` untyped (`{}`) in OpenAPI (`UNVERIFIED` wrapper; items are `MeetingCommentResource`: `{ id, meeting_id, parent_id?, body, is_edited, author: { id, name, avatar_url?, job_title? }, can_edit, can_delete, replies_count, replies: MeetingCommentResource[], created_at?, updated_at? }`, oldest top-level first).
6. **Pagination Shape:** `UNVERIFIED` (untyped in OpenAPI; likely plain array or `P1`).
7. **Filter & Sort Parameters:** None documented (ordered oldest first per summary).
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `UNVERIFIED` (spec-only with untyped `data`).

### <a id="meetings-comments-store"></a> `meetings-comments-store` — POST /meetings/{meeting}/comments

1. **Method & Path:** `POST /meetings/{meeting}/comments` (`operationId: meetings.comments.store`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required (`DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
   - **JSON body (required):** `body*`: `string` (`maxLength: 2000`), `parent_id`: `integer | null` (for replies)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: MeetingCommentResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The body field is required.",
     "errors": {
       "body": ["The body field is required."]
     }
   }
   ```
9. **Status Codes:** `201`, `401`, `403`, `404`, `422`
10. **Side Effects:** Creates a meeting comment or reply (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (spec-only).

### <a id="meetings-comments-update"></a> `meetings-comments-update` — PUT /meetings/{meeting}/comments/{comment}

1. **Method & Path:** `PUT /meetings/{meeting}/comments/{comment}` (`operationId: meetings.comments.update`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required (`can_edit` per resource; `DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`, `comment*`: `integer`
   - **JSON body (required):** `body*`: `string` (`maxLength: 2000`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: MeetingCommentResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The body field must not be greater than 2000 characters.",
     "errors": {
       "body": ["The body field must not be greater than 2000 characters."]
     }
   }
   ```
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates comment text and sets `is_edited: true` (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (spec-only).

### <a id="meetings-comments-destroy"></a> `meetings-comments-destroy` — DELETE /meetings/{meeting}/comments/{comment}

1. **Method & Path:** `DELETE /meetings/{meeting}/comments/{comment}` (`operationId: meetings.comments.destroy`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required (`can_delete` per resource; `DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`, `comment*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameters only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Deletes the comment **and cascades to delete all of its replies** (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (spec-only).

### <a id="meetings-notes-index"></a> `meetings-notes-index` — GET /meetings/{meeting}/notes

1. **Method & Path:** `GET /meetings/{meeting}/notes` (`operationId: meetings.notes.index`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required. Private to the authenticated caller (`"Your notes on the meeting"`, newest first) (`DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: Array<{ id: number; meeting_id: number; content: string; created_at: string | null; updated_at: string | null }> }`.
6. **Pagination Shape:** `none` (plain array)
7. **Filter & Sort Parameters:** None (newest first per summary)
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (spec-only).

### <a id="meetings-notes-store"></a> `meetings-notes-store` — POST /meetings/{meeting}/notes

1. **Method & Path:** `POST /meetings/{meeting}/notes` (`operationId: meetings.notes.store`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required. Private to caller (`DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`
   - **JSON body (required):** `content*`: `string` (`maxLength: 5000`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: MeetingNoteResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The content field is required.",
     "errors": {
       "content": ["The content field is required."]
     }
   }
   ```
9. **Status Codes:** `201`, `401`, `403`, `404`, `422`
10. **Side Effects:** Creates a private note on the meeting (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (spec-only).

### <a id="meetings-notes-update"></a> `meetings-notes-update` — PUT /meetings/{meeting}/notes/{note}

1. **Method & Path:** `PUT /meetings/{meeting}/notes/{note}` (`operationId: meetings.notes.update`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required. Owner only (`DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`, `note*`: `integer`
   - **JSON body (required):** `content*`: `string` (`maxLength: 5000`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: MeetingNoteResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The content field must not be greater than 5000 characters.",
     "errors": {
       "content": ["The content field must not be greater than 5000 characters."]
     }
   }
   ```
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates caller's private meeting note (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (spec-only).

### <a id="meetings-notes-destroy"></a> `meetings-notes-destroy` — DELETE /meetings/{meeting}/notes/{note}

1. **Method & Path:** `DELETE /meetings/{meeting}/notes/{note}` (`operationId: meetings.notes.destroy`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required. Owner only (`DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `meeting*`: `integer`, `note*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameters only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Deletes caller's private meeting note (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (spec-only).

---

## 12. Project Chat & Broadcasting (`messages-*`, `broadcasting-*`)

> **Out of MVP Scope:** All chat endpoints are post-MVP; Laravel Reverb connection settings (host, port, TLS, app key, event names, and payloads) are absent from both OpenAPI and Postman (`UNVERIFIED`).

### <a id="messages-index"></a> `messages-index` — GET /projects/{project}/messages

1. **Method & Path:** `GET /projects/{project}/messages` (`operationId: projectMessage.index`)
2. **Auth & Role Restrictions:** Bearer required. Project members / Admin (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
   - **Query:** Postman shows `per_page=20` (`UNVERIFIED` by OpenAPI); `page`: `integer` (`UNVERIFIED`).
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`), `data` untyped (`{}`) in OpenAPI (`UNVERIFIED` wrapper; items are `ProjectMessageResource`: `{ id, project_id, message, is_edited, sender: { id, name, email, avatar_url?, job_title? }, parent: { id, message, sender_name } | null, attachment: { id, name, mime_type?, file_size, url } | null, mentions: Array<{ id, name, email }>, is_read_by_me, readers_count, created_at?, updated_at? }`). Note: OpenAPI omits `nullable` on `parent` and `attachment`, but treat both as nullable.
6. **Pagination Shape:** `UNVERIFIED` (untyped in OpenAPI; likely `P1`).
7. **Filter & Sort Parameters:** `per_page` (`DOCUMENTED` in Postman / `UNVERIFIED`), `page` (`UNVERIFIED`).
8. **Validation Errors (`422`):** N/A — OpenAPI documents no `422`.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `UNVERIFIED` (untyped list wrapper in OpenAPI; item schema `DOCUMENTED`).

### <a id="messages-store"></a> `messages-store` — POST /projects/{project}/messages

1. **Method & Path:** `POST /projects/{project}/messages` (`operationId: projectMessage.store`; 2 Postman requests: standard message & thread reply)
2. **Auth & Role Restrictions:** Bearer required. Project members / Admin (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `project*`: `integer`
   - **JSON body (`SendMessageRequest`, required):**
     - `message*`: `string` (`maxLength: 5000`)
     - `parent_id`: `integer | null` (reply target message ID)
     - `file_attachment_id`: `integer | null` (pre-uploaded file ID from [`files-store`](#files-store))
     - `mentions`: `integer[] | null` (mentioned user IDs)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `201 Created`): `{ success: true, message: string, data: ProjectMessageResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The message field is required.",
     "errors": {
       "message": ["The message field is required."],
       "file_attachment_id": ["The selected file attachment id is invalid."]
     }
   }
   ```
9. **Status Codes:** `201`, `401`, `403`, `404`, `422`
10. **Side Effects:** Persists message, broadcasts via Laravel Reverb on `private-projects.{id}` (event name/payload `UNVERIFIED`), and dispatches in-app notifications to `mentions` (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (Reverb event details `UNVERIFIED`).

### <a id="messages-update"></a> `messages-update` — PUT /messages/{message}

1. **Method & Path:** `PUT /messages/{message}` (`operationId: projectMessage.update`)
   - **`CONFLICT` (HTTP method):** OpenAPI specifies **`PUT /messages/{message}`**; Postman specifies **`PATCH /messages/{message}`**. **Resolution:** Prefer `PUT` (OpenAPI is generated from Laravel route definitions) unless verified otherwise when implementing post-MVP chat.
2. **Auth & Role Restrictions:** Bearer required. Postman states **message author or `Administrator`** (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **Path:** `message*`: `integer` (not nested under project)
   - **JSON body (`UpdateMessageRequest`, required):** `message*`: `string` (`maxLength: 5000`)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: ProjectMessageResource }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The message field is required.",
     "errors": {
       "message": ["The message field is required."]
     }
   }
   ```
9. **Status Codes:** `200`, `401`, `403`, `404`, `422`
10. **Side Effects:** Updates message body and sets `is_edited: true` (`DOCUMENTED`).
11. **Evidence Level:** `CONFLICT` (`PUT` vs. `PATCH`) / `DOCUMENTED`.

### <a id="messages-destroy"></a> `messages-destroy` — DELETE /messages/{message}

1. **Method & Path:** `DELETE /messages/{message}` (`operationId: projectMessage.destroy`)
2. **Auth & Role Restrictions:** Bearer required. Exact permission (author/Admin) not explicitly stated (`UNVERIFIED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `message*`: `integer`
5. **Response Envelope & `data` Shape:** `E3` (`200 OK`): `{ success: true, message: string, data: null }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Soft-deletes the message (`DOCUMENTED` in OpenAPI summary).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="messages-mark-read"></a> `messages-mark-read` — POST /projects/{project}/messages/mark-read

1. **Method & Path:** `POST /projects/{project}/messages/mark-read` (`operationId: v1.projectMessage.markRead_70`)
2. **Auth & Role Restrictions:** Bearer required. Project members / Admin (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: { marked_count: integer } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Bulk-marks all messages in the project channel as read for the current user (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="messages-read-alias"></a> `messages-read-alias` — POST /projects/{project}/messages/read

1. **Method & Path:** `POST /projects/{project}/messages/read` (`operationId: v1.projectMessage.markRead_69`; **spec-only alias** of [`messages-mark-read`](#messages-mark-read))
2. **Auth & Role Restrictions:** Bearer required. Project members / Admin (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: { marked_count: integer } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** Identical to [`messages-mark-read`](#messages-mark-read). Prefer `/mark-read` for Postman parity.
11. **Evidence Level:** `DOCUMENTED` (spec-only alias).

### <a id="messages-unread-count"></a> `messages-unread-count` — GET /projects/{project}/messages/unread-count

1. **Method & Path:** `GET /projects/{project}/messages/unread-count` (`operationId: projectMessage.unreadCount`)
2. **Auth & Role Restrictions:** Bearer required. Project members / Admin (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `project*`: `integer`
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: { project_id: string, unread_count: integer } }` (note OpenAPI types `project_id` as `string` — likely path-param passthrough).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — path parameter only.
9. **Status Codes:** `200`, `401`, `403`, `404`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

### <a id="broadcasting-auth"></a> `broadcasting-auth` — GET /broadcasting/auth

1. **Method & Path:** `GET /broadcasting/auth` (`operationId: broadcast.authenticate`; **spec-only**)
2. **Auth & Role Restrictions:** Bearer required (`401` verified live without token on `/api/v1/broadcasting/auth`; note web route `/broadcasting/auth` exists separately and returns `403`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None documented in OpenAPI (`UNVERIFIED` — Pusher/Echo clients typically `POST` `socket_id` and `channel_name`; whether `POST` is accepted is `UNVERIFIED`).
5. **Response Envelope & `data` Shape:** **`E5` Bare JSON object** (NO `{success, message, data}` envelope), untyped `{}` in OpenAPI (`UNVERIFIED`; typically `{ auth: string }` for Pusher/Reverb).
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — undocumented.
9. **Status Codes:** `200` (`DOCUMENTED`), `401` (`VERIFIED`), `403` (`UNVERIFIED` for unauthorized channel)
10. **Side Effects:** Authorizes private WebSocket channel subscription (`private-projects.{id}`) (`UNVERIFIED`).
11. **Evidence Level:** `UNVERIFIED` (route existence confirmed via `401`; method `GET` vs. `POST`, params, and payload `UNVERIFIED`).

---

## 13. AI Assistant & AI Settings (`ai-*`)

### <a id="ai-ask"></a> `ai-ask` — POST /ai/ask

1. **Method & Path:** `POST /ai/ask` (`operationId: aiAssistant.ask`; 3 Postman requests: general Q&A, project-scoped, overdue tasks audit)
2. **Auth & Role Restrictions:** Bearer required (`DOCUMENTED`; `403` possible per OpenAPI). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (`AskAssistantRequest`, required):**
     - `query*`: `string` (`minLength: 2`, `maxLength: 1000`)
     - `project_id`: `integer | null` (optional project scope)
   - **`CONFLICT`:** Postman description names `prompt`; all 3 Postman request bodies and OpenAPI `AskAssistantRequest` use `query`. **Resolution:** Always send `query`.
5. **Response Envelope & `data` Shape:** **`E2` (NO `message` key!)**, `200 OK`: `{ success: true, data: ... }` where OpenAPI specifies `anyOf`:
   - Variant A: untyped `array` (when returned is `UNVERIFIED`);
   - Variant B: `{ query: string, answer: string, project_id: string | null, context_summary: { projects_count: integer, tasks_count: integer, overdue_tasks_count: integer, upcoming_meetings_count: integer }, suggested_actions: unknown[] /* minItems: 2 */, source: "gemini", model: string, tokens_used: integer | string }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The query field must be at least 2 characters.",
     "errors": {
       "query": ["The query field must be at least 2 characters."]
     }
   }
   ```
9. **Status Codes:** `200`, `401`, `403`, `422`
10. **Side Effects:** Calls external AI model (`gemini`) and may log an `ai` audit event (`DOCUMENTED`).
11. **Evidence Level:** `CONFLICT` (resolved: `query`, not `prompt`) / `DOCUMENTED` (`suggested_actions` items & array variant `UNVERIFIED`).

### <a id="ai-settings-index"></a> `ai-settings-index` — GET /ai/settings

1. **Method & Path:** `GET /ai/settings` (`operationId: aiSetting.index`)
2. **Auth & Role Restrictions:** Bearer required. Verified `200 OK` for **Project Manager** in D10 (not Admin-only for reads); Team Member `UNVERIFIED` (D6). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** **`E2` (NO `message` key!)**, `200 OK` (`VERIFIED` top keys `["success", "data"]` in D10):
   ```ts
   {
     success: true,
     data: Array<{
       id: number; key: string; value: unknown; type: string;
       description: string | null;
       updated_by: { id: number; name: string };
       updated_at: string | null;
     }>
   }
   ```
6. **Pagination Shape:** `none` (plain array)
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200` (`VERIFIED` PM in D10), `401` (`VERIFIED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (D10 PM `200` & `E2` no-`message` envelope; `value` type `DOCUMENTED`/`UNVERIFIED`).

### <a id="ai-settings-update"></a> `ai-settings-update` — PUT /ai/settings

1. **Method & Path:** `PUT /ai/settings` (`operationId: aiSetting.update`)
2. **Auth & Role Restrictions:** Bearer required. **`Administrator` only** (`DOCUMENTED` in OpenAPI summary & Postman). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`, `Content-Type: application/json`
4. **Parameters:**
   - **JSON body (required):**
     - `settings*`: `Array<{ key*: string, value*: string }>` (`minItems: 1`; Postman example keys: `ai_provider`, `ai_model`, `ai_temperature` `"0.0"`–`"1.0"` as string)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`): `{ success: true, message: string, data: { updated_count: integer } }`.
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The settings field must have at least 1 items.",
     "errors": {
       "settings": ["The settings field must have at least 1 items."],
       "settings.0.key": ["The settings.0.key field is required."]
     }
   }
   ```
9. **Status Codes:** `200`, `401`, `403`, `422`
10. **Side Effects:** Mutates global workspace AI configuration (`DOCUMENTED`).
11. **Evidence Level:** `DOCUMENTED` (OpenAPI + Postman).

---

## 14. Reports (`reports-*`)

> **Out of MVP Scope:** All 4 report endpoints are post-MVP; none document filter or date-range parameters.

### <a id="reports-projects"></a> `reports-projects` — GET /reports/projects

1. **Method & Path:** `GET /reports/projects` (`operationId: report.projects`)
2. **Auth & Role Restrictions:** Bearer required (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`):
   ```ts
   data: {
     summary: { total_projects: number; active_projects: number; delayed_projects: number; completed_projects: number; on_hold_projects: number; average_completion_rate: number };
     projects: Array<{ id: number; name: string; status: ProjectStatus; priority: ProjectPriority; progress_percentage: number; start_date: string; deadline: string; is_delayed: boolean; teams_count: number; tasks_count: number; completed_tasks_count: number }>;
     chart: unknown[]; // untyped items in OpenAPI
   }
   ```
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None documented.
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200`, `401`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (`chart` items `UNVERIFIED`).

### <a id="reports-tasks"></a> `reports-tasks` — GET /reports/tasks

1. **Method & Path:** `GET /reports/tasks` (`operationId: report.tasks`)
2. **Auth & Role Restrictions:** Bearer required (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`):
   ```ts
   data: {
     summary: { total_tasks: number; completed_tasks: number; in_progress_tasks: number; in_review_tasks: number; pending_tasks: number; overdue_tasks: number; completion_rate: number; on_time_completion_rate: number };
     by_priority: unknown; // OpenAPI types as string (likely inference artifact; probably object map)
     by_status: unknown;   // OpenAPI types as string (likely inference artifact; probably object map)
     chart: unknown[];     // untyped items in OpenAPI
   }
   ```
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None documented.
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200`, `401`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (`by_priority`, `by_status`, and `chart` `UNVERIFIED`).

### <a id="reports-teams"></a> `reports-teams` — GET /reports/teams

1. **Method & Path:** `GET /reports/teams` (`operationId: report.teams`)
2. **Auth & Role Restrictions:** Bearer required (`DOCUMENTED`).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:** None
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`):
   ```ts
   data: {
     summary: { total_teams: number; total_members: number | string; total_assigned_tasks: number | string };
     teams: Array<{ team_id: number; team_name: string; description: string | null; members_count: number; active_projects_count: number; total_tasks: number; completed_tasks: number; pending_tasks: number; completion_rate: number; workload_share_percentage: number }>;
     filter: unknown[]; // untyped items in OpenAPI
   }
   ```
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None documented.
8. **Validation Errors (`422`):** N/A — no validated input.
9. **Status Codes:** `200`, `401`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `DOCUMENTED` (`filter` items & string-typed summary counts `UNVERIFIED`).

### <a id="reports-users"></a> `reports-users` — GET /reports/users/{id?}

1. **Method & Path:** `GET /reports/users` (self) and `GET /reports/users/{id}` (specific user) (`operationId: report.users`)
   - **`CONFLICT` (path representation):** OpenAPI models one route `GET /reports/users/{id}` with `x-optional: true` (`default: null`), whereas Postman splits it into two requests (`GET /reports/users` and `GET /reports/users/1`). **Resolution:** Both URLs target the same Laravel route with an optional `{id?}` segment.
2. **Auth & Role Restrictions:** Bearer required. Omit `{id}` for own report; passing `{id}` is for `Administrator` & `Project Manager` (`VERIFIED` `200 OK` for PM on `GET /reports/users/{id}` in D10; Team Member `UNVERIFIED` per D6).
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Path:** `id`: `integer | null` (optional; defaults to authenticated user when omitted)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK` — top keys `["success", "message", "data"]` `VERIFIED` in D10):
   ```ts
   data: {
     user: { id: number; name: string; email: string; job_title: string | null; years_of_experience: number; roles: unknown[] };
     tasks: { total_assigned: number; completed: number; in_progress: number; pending: number; overdue: number; completion_rate: number; on_time_rate: number };
     meetings: { total_invited: number; attended: number; attendance_rate: number };
     files: { uploaded_count: number; total_size_bytes: number; formatted_size: string };
     productivity: { score: number; performance_level: "Outstanding" | "High Performer" | "Good" | "Needs Improvement" };
     chart: unknown[]; // untyped items in OpenAPI
   }
   ```
6. **Pagination Shape:** `none`
7. **Filter & Sort Parameters:** None documented.
8. **Validation Errors (`422`):** N/A — optional path parameter only.
9. **Status Codes:** `200` (`VERIFIED` PM in D10), `401` (`VERIFIED`), `403`/`404` (`UNVERIFIED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `CONFLICT` (optional path modelling) / `VERIFIED` (`200` & `E1` envelope for PM in D10; inner `chart`/`roles` shape `DOCUMENTED`/`UNVERIFIED`).

---

## 15. Activity & Audit Logs (`activities-*`, `audit-logs-*`)

### <a id="activities-index"></a> `activities-index` — GET /activities

1. **Method & Path:** `GET /activities` (`operationId: activity.index`; **spec-only**, absent from Postman)
2. **Auth & Role Restrictions:** Bearer required. Returns caller's own actions; `Administrator` can view everyone's or filter by `user_id` (`DOCUMENTED`). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query:**
     - `category`: `AuditLogCategory | null` (`"auth" | "project" | "task" | "file" | "chat" | "meeting" | "ai"`)
     - `user_id`: `integer | null` (Administrators only per summary)
     - `per_page`: `integer | null` (`1`–`50`; no `page` param documented)
5. **Response Envelope & `data` Shape:** Standard (`E1`, `200 OK`), `data` untyped (`{}`) in OpenAPI (`UNVERIFIED`).
6. **Pagination Shape:** `UNVERIFIED` (untyped in OpenAPI; `per_page` capped at `50`).
7. **Filter & Sort Parameters:** `category`, `user_id`, `per_page` (`1`–`50`) (`DOCUMENTED`).
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The per page field must not be greater than 50.",
     "errors": {
       "per_page": ["The per page field must not be greater than 50."],
       "category": ["The selected category is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200`, `401`, `422`
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `UNVERIFIED` (spec-only with untyped `data`).

### <a id="audit-logs-index"></a> `audit-logs-index` — GET /audit-logs

1. **Method & Path:** `GET /audit-logs` (`operationId: auditLog.index`)
2. **Auth & Role Restrictions:** Bearer required. **`Administrator` & `Project Manager` only** (`DOCUMENTED`; PM `200 OK` `VERIFIED` in D10; Team Member `403` `UNVERIFIED` per D6). Out of MVP scope.
3. **Required Headers:** `Accept: application/json`, `Authorization: Bearer <token>`
4. **Parameters:**
   - **Query (OpenAPI; Postman shows only `per_page=20`):**
     - `category`: `AuditLogCategory | null`
     - `user_id`: `integer | null`
     - `action`: `string | null` (`maxLength: 100`)
     - `search`: `string | null` (`maxLength: 255`)
     - `per_page`: `integer | null` (`1`–`100`)
     - `page`: `integer | null` (`>= 1`)
5. **Response Envelope & `data` Shape:** **`E2` (NO `message` key!)**, **`P4`**, `200 OK` (`VERIFIED` top keys `["success", "data", "meta"]` in D10):
   ```ts
   {
     success: true,
     data: Array<{
       id: number;
       category: AuditLogCategory;
       action: string;
       description: string | null;
       ip_address: string | null;
       user: { id: number; name: string; email: string };
       payload: unknown[] | Record<string, unknown> | null; // OpenAPI types as untyped array?
       created_at: string;
     }>,
     meta: { current_page: number; last_page: number; per_page: number; total: number }
   }
   ```
6. **Pagination Shape:** **`P4`** (`VERIFIED` top-level `meta` sibling in D10).
7. **Filter & Sort Parameters:** `category`, `user_id`, `action`, `search`, `per_page` (`1`–`100`), `page` (`>= 1`) (`DOCUMENTED` in OpenAPI).
8. **Validation Errors (`422`):**
   ```json
   {
     "success": false,
     "message": "The per page field must not be greater than 100.",
     "errors": {
       "per_page": ["The per page field must not be greater than 100."],
       "category": ["The selected category is invalid."]
     }
   }
   ```
   *(Sanitised illustrative example.)*
9. **Status Codes:** `200` (`VERIFIED` PM in D10), `401` (`VERIFIED`), `403` (`DOCUMENTED`), `422` (`DOCUMENTED`)
10. **Side Effects:** None (read-only).
11. **Evidence Level:** `VERIFIED` (D10 PM `200`, `E2` no-`message`, and `P4` sibling `meta`; query filters & `payload` item type `DOCUMENTED`/`UNVERIFIED`).
