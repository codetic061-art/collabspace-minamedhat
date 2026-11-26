# CollabSpace OpenAPI spec vs Postman collection

Source: `https://collabspace.huma-volve.com/docs/api.json`, fetched once with a single `GET` (`Invoke-WebRequest -UseBasicParsing`, HTTP 200, 435,866 bytes) into `%TEMP%`, parsed with Python `json`, then deleted. Compared against `docs/discovery/api-inventory.md` (the Postman inventory). The Postman collection file was read only, for one grep of enum strings.

Scope: every path and every operation in the spec was walked (65 paths, **92 operations**). Every `$ref` into `components.schemas` and `components.responses` was resolved. No other request was sent to the server.

The spec contains **no `example` / `examples` values** anywhere, so there was nothing to redact. The only vendor extension is `x-optional` on one path parameter.

Notation used below:

- `*` after a field = required in the spec. `?` after a type = nullable (`["type","null"]`).
- `$Name` = a named schema in `components.schemas` (see section 4).
- `untyped in spec` = the spec gives an empty schema `{}`, a bare `object` with no properties, or an array with no `items`. The real shape is unverified.
- Every success body has the envelope `{ success*: boolean, message*: string, data*: … }` unless the row says otherwise. Tables show only `data`.

---

## 1. Spec-level facts

| Item | Value |
|---|---|
| `openapi` | `3.1.2` |
| `info.title` | `CollabSpace AI API` |
| `info.version` | `0.0.1` |
| `info.description` | "CollabSpace AI REST API (v1). Authenticate via `POST /api/v1/auth/login`, then send the token as `Authorization: Bearer <token>`." |
| `servers` | one: `https://collabspace.huma-volve.com/api`. Paths start with `/v1/`, so the full base URL is `https://collabspace.huma-volve.com/api/v1`. This confirms the host that the Postman inventory could only infer. |
| `components.securitySchemes` | `http`: `{ type: http, scheme: bearer }` (no `bearerFormat`) |
| Global `security` | `[{ http: [] }]` → every operation needs the Bearer token unless it overrides with `security: []` |
| Public operations (`security: []`) | `POST /v1/auth/register`, `/login`, `/forgot-password`, `/verify-reset-otp`, `/reset-password`; `GET /v1/auth/social/{provider}/redirect`, `GET /v1/auth/social/{provider}/callback` (7) |
| Top-level `tags` array | absent. Operations carry 24 distinct tags. |
| `components.responses` | `ValidationException` (422) `{message*, errors*: {[field]: string[]}}`; `AuthenticationException` (401), `AuthorizationException` (403), `ModelNotFoundException` (404): each `{message*: string}` |
| Generator | Not stated. The operationId style (`projects.index`, `v1.auth.profile.update_9`), `components.responses` names and `const` message strings match Laravel Scramble's output. This is an inference. |

Error envelope note: the spec's shared 422 schema has **no `success` key** (`{message, errors}`), but the Postman saved 422 examples show `{success: false, message, errors}`. The social-auth 400/422 responses are typed inline as `{success*, message*, errors*: null}`. Treat the error envelope as `{message, errors?}` with `success` possibly present.

---

## 2. Operation table (grouped by tag)

"In Postman?": `yes` = same method + path and compatible body; `differs` = route exists in Postman but method, path or fields differ (detail in section 6); `no` = spec only.

### Activity

| Method | Path | operationId / summary | Auth | Request (query/body) | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/activities` | `activity.index`: Recent activity feed, own actions (Administrators can see everyone's or filter by `user_id`) | bearer | query: `category`: `$AuditLogCategory`?, `user_id`: integer?, `per_page`: integer? (1–50) | 200, `data`: **untyped in spec** | no |

### AiAssistant

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| POST | `/v1/ai/ask` | `aiAssistant.ask`: Answer natural language query about projects, tasks, sprints, and meetings | bearer | JSON `$AskAssistantRequest`: `query*`: string (2–1000), `project_id`: integer? | 200, envelope has **no `message`**. `data` is `anyOf`: (a) array, items untyped; (b) `{query*: string, answer*: string, project_id*: string?, context_summary*: {projects_count, tasks_count, overdue_tasks_count, upcoming_meetings_count: integer}, suggested_actions*: array (untyped items, minItems 2), source*: const "gemini", model*: string, tokens_used*: integer\|string}`. Also 403. | yes (body `query` matches; description's `prompt` is wrong) |

### AiSetting

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/ai/settings` | `aiSetting.index`: Get all AI configuration settings | bearer | none | 200, no `message`. `data`: array of `{id*: integer, key*: string, value*: untyped in spec, type*: string, description*: string?, updated_by*: {id, name}, updated_at*: string?}` | yes |
| PUT | `/v1/ai/settings` | `aiSetting.update`: Update AI configuration settings (Administrator only) | bearer | JSON: `settings*`: array (min 1) of `{key*: string, value*: string}` | 200, `data`: `{updated_count*: integer}`. 403 | yes |

### AuditLog

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/audit-logs` | `auditLog.index`: List paginated audit logs (Administrator & Project Manager only) | bearer | query: `category`: `$AuditLogCategory`?, `user_id`: integer?, `action`: string? (≤100), `search`: string? (≤255), `per_page`: integer? (1–100), `page`: integer? (≥1) | 200, no `message`. `data`: array of `$AuditLogResource`; sibling `meta*`: `{current_page, last_page, per_page, total: integer}`. 403 | differs (Postman shows only `per_page`) |

### Auth

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| POST | `/v1/auth/register` | `auth.register`: Register a new user | **public** | JSON `$RegisterRequest`: `name*`: string ≤255, `email*`: email ≤255, `password*`: string ≥8, `password_confirmation*`: string ≥8 | 201, `data`: `{user*: $UserResource, token*: string, token_type*: const "Bearer"}` | differs (Postman description lists `job_title`, `years_of_experience`, `phone`; spec has none) |
| POST | `/v1/auth/login` | `auth.login`: Authenticate and obtain an access token | **public** | JSON `$LoginRequest`: `email*`: email, `password*`: string, `remember`: boolean? | 200, `data`: `{user*: $UserResource, token*: string, token_type*: const "Bearer"}` | yes |
| POST | `/v1/auth/forgot-password` | `auth.forgotPassword`: Send a 6-digit password reset code (same response whether or not the account exists) | **public** | JSON: `email*`: email ≤255 | 200, `data`: `{expires_in_minutes*: integer const 10}` | yes |
| POST | `/v1/auth/verify-reset-otp` | `auth.verifyResetOtp`: Check that a reset code is valid | **public** | JSON: `email*`: email ≤255, `otp*`: string | 200, `data`: null | yes |
| POST | `/v1/auth/reset-password` | `auth.resetPassword`: Set a new password using the emailed code; signs the user out of all devices | **public** | JSON: `email*`, `otp*`: string, `password*`: ≥8, `password_confirmation*`: ≥8 | 200, `data`: null | yes |
| POST | `/v1/auth/logout` | `auth.logout`: Terminate the authenticated session | bearer | none | 200, `data`: null | yes |

### Broadcast

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/broadcasting/auth` | `broadcast.authenticate`: Authenticate the request for channel access | bearer | no params or body documented | 200, whole body is a bare `object`: **untyped in spec** (no envelope) | no |

### Dashboard

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/dashboard` | `dashboard.index`: Aggregated workspace statistics, task status counts, recent activity | bearer | query: `period`: enum `year`, `6_months`, `3_months`, `30_days`, `7_days`, `custom` (nullable); `year`: integer? 2000–2100 (with `period=year`); `from`, `to`: date? `Y-m-d` (with `period=custom`). Description: only the `project_overview` chart is filtered. | 200, no `message`. `data`: `$DashboardResource` = `{overview*: string, project_overview*: string, active_projects*: {items, pagination}, tasks*: {items, pagination}, teams*: {items, pagination}, upcoming_meetings*: {items}, recent_files*: {items, pagination}, recent_activity*: {items, pagination}}` | differs (Postman shows no query params) |

### File

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/files/{file}/download` | `file.download`: Download the specified file | bearer | path `file*`: integer | 200 `application/octet-stream`, binary. 403, 404 | yes |
| GET | `/v1/files` | `files.index`: Listing of files with filters | bearer | **no query params documented** | 200, `data`: **untyped in spec** | differs (Postman uses `project_id`, `per_page`; description adds `task_id`, `search`) |
| POST | `/v1/files` | `files.store`: Upload and store a new file attachment | bearer | multipart `$UploadFileRequest`: `file*`: binary, `project_id`: integer?, `task_id`: integer?, `name`: string? ≤255 | 201, `data`: `$FileAttachmentResource` | yes (both Postman variants) |
| GET | `/v1/files/{file}` | `files.show`: File attachment metadata | bearer | path `file*` | 200, `data`: `$FileAttachmentResource` | yes |
| DELETE | `/v1/files/{file}` | `files.destroy`: Remove from storage and DB | bearer | path `file*` | 200, `data`: null | yes |

### MarkMeetingAttendance

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| PATCH | `/v1/meetings/{meeting}/attendance` | `v1.markMeetingAttendance`: Mark attendance for participants | bearer | JSON `$MarkAttendanceRequest`: `attendance*`: array (min 1) of `{user_id*: integer, attended*: boolean}` | 200, `data`: `$MeetingResource` | yes (body matches; description's `status` enum is wrong) |

### Meeting

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/meetings` | `meetings.index`: Listing of meetings with filters | bearer | **no query params documented** | 200, `data`: **untyped in spec** | differs (Postman uses `project_id`, `time_filter`, `per_page`) |
| POST | `/v1/meetings` | `meetings.store`: Store a new meeting | bearer | JSON `$StoreMeetingRequest`: `title*` ≤255, `description`: string?, `meeting_date*`: date-time string, `start_time*`: string, `end_time*`: string, `meeting_link*`: uri, `project_id*`: integer, `participants`: integer[]? | 201, `data`: `$MeetingResource` | yes (`participants` matches; description's `attendee_ids` is wrong) |
| GET | `/v1/meetings/{meeting}` | `meetings.show` | bearer | path `meeting*` | 200, `data`: `$MeetingResource` | yes |
| PUT | `/v1/meetings/{meeting}` | `meetings.update` | bearer | JSON `$UpdateMeetingRequest` (all optional): `title`, `description`?, `meeting_date`, `start_time`, `end_time`, `meeting_link`, `status`: `$MeetingStatus`?, `participants`: integer[]? | 200, `data`: `$MeetingResource` | differs (spec adds `status`, `participants`, `description`) |
| DELETE | `/v1/meetings/{meeting}` | `meetings.destroy` | bearer | path `meeting*` | 200, `data`: null | yes |

### MeetingComment

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/meetings/{meeting}/comments` | `meetings.comments.index`: Top-level comments (oldest first) with their replies | bearer | path `meeting*` | 200, `data`: **untyped in spec** | no |
| POST | `/v1/meetings/{meeting}/comments` | `meetings.comments.store` | bearer | JSON: `body*`: string ≤2000, `parent_id`: integer? | 201, `data`: `$MeetingCommentResource` | no |
| PUT | `/v1/meetings/{meeting}/comments/{comment}` | `meetings.comments.update` | bearer | JSON: `body*`: string ≤2000 | 200, `data`: `$MeetingCommentResource` | no |
| DELETE | `/v1/meetings/{meeting}/comments/{comment}` | `meetings.comments.destroy`: also deletes its replies | bearer | path `meeting*`, `comment*` | 200, `data`: null | no |

### MeetingNote

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/meetings/{meeting}/notes` | `meetings.notes.index`: Your notes on the meeting (newest first) | bearer | path `meeting*` | 200, `data`: array of `$MeetingNoteResource` (not paginated) | no |
| POST | `/v1/meetings/{meeting}/notes` | `meetings.notes.store` | bearer | JSON: `content*`: string ≤5000 | 201, `data`: `$MeetingNoteResource` | no |
| PUT | `/v1/meetings/{meeting}/notes/{note}` | `meetings.notes.update` | bearer | JSON: `content*`: string ≤5000 | 200, `data`: `$MeetingNoteResource` | no |
| DELETE | `/v1/meetings/{meeting}/notes/{note}` | `meetings.notes.destroy` | bearer | path `meeting*`, `note*` | 200, `data`: null | no |

### MeetingSummary

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| POST | `/v1/meetings/{meeting}/summary/generate` | `meetingSummary.generate`: Generate AI-powered summary | bearer | JSON `$GenerateSummaryRequest` (body not required): `transcript`: string? | **200** (not 201), `data`: `$MeetingSummaryResource` | yes (`transcript` matches; description's `notes` is wrong) |
| GET | `/v1/meetings/{meeting}/summary` | `meetingSummary.show` | bearer | path `meeting*` | 200, `data`: `$MeetingSummaryResource`. 404 | yes |
| PUT | `/v1/meetings/{meeting}/summary` | `meetingSummary.update`: Manually update summary | bearer | JSON `$UpdateSummaryRequest`: `summary*`: string, `decisions_made`: string[]?, `action_items`: array? of `{title: string, suggested_assignee: string?, priority: string?}`, `assigned_tasks`: string[]?, `risks`: string[]?, `next_steps`: string[]? | 200, `data`: `$MeetingSummaryResource` | differs (spec adds `action_items`, `assigned_tasks`, `risks`, `next_steps`) |
| POST | `/v1/meetings/{meeting}/summary/create-tasks` | `meetingSummary.createTasks`: Convert AI action items into Kanban tasks | bearer | JSON `$CreateTasksFromSummaryRequest` (body not required): `action_item_indices`: integer[]? (≥0), `default_priority`: `Low`/`Medium`/`High`/`Critical`?, `default_due_date`: date-time? | 201, `data`: `{tasks_count*: integer, tasks*: $TaskResource[]}` | differs (spec adds `action_item_indices`) |

### Notification

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/notifications` | `notification.index`: List paginated notifications for current user | bearer | **no query params documented** | 200, `data`: array of `$NotificationResource`; sibling `meta*`: `{current_page, last_page, per_page, total, unread_count: integer}` | differs (Postman uses `per_page`, `status=unread`) |
| GET | `/v1/notifications/unread-count` | `notification.unreadCount` | bearer | none | 200, `data`: `{unread_count*: integer}` | yes |
| PATCH | `/v1/notifications/{id}/read` | `notification.markAsRead` | bearer | path `id*`: **string** | 200, `data`: `$NotificationResource` | yes |
| POST | `/v1/notifications/mark-all-read` | `notification.markAllAsRead` | bearer | none | 200, `data`: `{marked_count*: integer}` | yes |
| DELETE | `/v1/notifications/{id}` | `notification.destroy`: Delete/dismiss | bearer | path `id*`: string | 200, `data`: null | yes |

### Profile

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/auth/me` | `profile.me`: Authenticated user profile with roles, teams, and projects | bearer | none | 200, `data`: `{user*: $UserResource (allOf with a bare object), stats*: {completed_tasks*: integer, total_tasks*: integer, hours_worked*: number}, recent_activities*: [{id, category: $AuditLogCategory, action, description?, created_at}], teams*: $Team[], projects*: $Project[]}` | yes |
| PUT | `/v1/auth/profile` | `v1.auth.profile.update_9`: Update user profile information | bearer | multipart `$UpdateProfileRequest` (see POST) | 200, `data`: `$UserResource`. 403 | no (Postman uses POST only) |
| POST | `/v1/auth/profile` | `v1.auth.profile.update_10`: Update user profile information | bearer | multipart `$UpdateProfileRequest`, all optional: `full_name`?, `name`?, `email`?, `job_title`?, `about`? ≤2000, `years_of_experience`? 0–60, `phone`? ≤30, `available_status`: `$AvailabilityStatus`?, `current_project_id`?, `avatar_url`? uri ≤500, `avatar`? binary, `old_password`?, `new_password`? ≥8, `confirmation_password`? | 200, `data`: `$UserResource` | differs (spec has 9 more fields than Postman) |
| DELETE | `/v1/auth/profile/avatar` | `profile.removeAvatar` | bearer | none | 200, `data`: `$UserResource` | yes |
| PUT | `/v1/auth/password` | `profile.changePassword`: Change account password | bearer | JSON `$ChangePasswordRequest`: `current_password*`: string, `password*`: ≥8, `password_confirmation*`: ≥8 | 200, `data`: null. 403 | yes (body matches; description's `new_password` is wrong) |
| GET | `/v1/auth/profile/tasks` | `profile.tasks`: User assigned tasks | bearer | no params documented | 200, `data`: **Laravel paginator object** `{current_page, data: $Task[], first_page_url, from, last_page, last_page_url, links: [{url?, label, active}], next_page_url, path, per_page, prev_page_url, to, total}` | yes |
| GET | `/v1/auth/profile/files` | `profile.files`: User uploaded files | bearer | none | 200, `data`: **untyped in spec** | yes |

### Project

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/projects` | `projects.index`: Listing of projects | bearer | **no query params documented** | 200, `data`: **untyped in spec** | differs (Postman uses `page`, `per_page`, `search`, `status`, `priority`, `sort`) |
| POST | `/v1/projects` | `projects.store` | bearer | JSON `$StoreProjectRequest`: `name*` ≤255, `description`?, `start_date*`: date-time, `deadline*`: date-time, `priority`: `$ProjectPriority`?, `status`: `$ProjectStatus`?, `teams`: integer[]?, `members`: array? of `{user_id: integer, role: string? ≤100}` | 201, `data`: `$ProjectOverviewResource` (allOf with a bare object) | differs (status enum; priority optional in spec) |
| GET | `/v1/projects/{project}` | `projects.show` | bearer | path `project*` | 200, `data`: `$ProjectOverviewResource` | no |
| PUT | `/v1/projects/{project}` | `projects.update` | bearer | JSON `$UpdateProjectRequest` (all optional): `name`, `description`?, `start_date`, `deadline`, `priority`?, `status`?, `teams`: integer[]? | 200, `data`: `$ProjectOverviewResource` | differs (spec adds `teams`, dates, description) |
| DELETE | `/v1/projects/{project}` | `projects.destroy` | bearer | path `project*` | 200, `data`: null | yes |
| GET | `/v1/projects/{project}/overview` | `project.overview`: Complete project overview (Figma Projects / Alpha / Overview) | bearer | query: `period`: enum `year`, `6_months` (nullable); `year`: integer? 2000–2100 | 200, `data`: array, items **untyped in spec**. Also 422 | differs (Postman shows no query params) |
| GET | `/v1/projects/{project}/teams` | `project.teams`: Project teams with task progress and member ratios | bearer | path `project*` | 200, `data`: array of `$ProjectTeamProgressResource` | yes |
| POST | `/v1/projects/{project}/teams` | `project.assignTeams` | bearer | JSON: `team_ids*`: integer[] (min 1) | 200, `data`: `$ProjectOverviewResource` | yes |
| DELETE | `/v1/projects/{project}/teams/{team}` | `project.removeTeam` | bearer | path `project*`, `team*` | 200, `data`: `$ProjectOverviewResource` (not null) | yes |

### ProjectMessage

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/projects/{project}/messages` | `projectMessage.index`: Paginated messages for a project channel | bearer | **no query params documented** | 200, `data`: **untyped in spec** | differs (Postman uses `per_page`) |
| POST | `/v1/projects/{project}/messages` | `projectMessage.store`: Send a new message | bearer | JSON `$SendMessageRequest`: `message*`: string ≤5000, `parent_id`: integer?, `file_attachment_id`: integer?, `mentions`: integer[]? | 201, `data`: `$ProjectMessageResource` | yes (both Postman variants) |
| PUT | `/v1/messages/{message}` | `projectMessage.update`: Edit an existing message | bearer | JSON: `message*`: string ≤5000 | 200, `data`: `$ProjectMessageResource` | **differs** (Postman uses PATCH) |
| DELETE | `/v1/messages/{message}` | `projectMessage.destroy`: Delete a message (soft delete) | bearer | path `message*` | 200, `data`: null | yes |
| POST | `/v1/projects/{project}/messages/read` | `v1.projectMessage.markRead_69`: Mark message(s) in project as read | bearer | none | 200, `data`: `{marked_count*: integer}` | no (alias) |
| POST | `/v1/projects/{project}/messages/mark-read` | `v1.projectMessage.markRead_70`: same | bearer | none | 200, `data`: `{marked_count*: integer}` | yes |
| GET | `/v1/projects/{project}/messages/unread-count` | `projectMessage.unreadCount` | bearer | none | 200, `data`: `{project_id*: string, unread_count*: integer}` | yes |

### Report

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/reports/projects` | `report.projects`: Project reports (active, delayed, completed, completion rates) | bearer | none | 200, `data`: `{summary*: {total_projects, active_projects, delayed_projects, completed_projects, on_hold_projects: integer, average_completion_rate: number}, projects*: [{id, name, status: $ProjectStatus, priority: $ProjectPriority, progress_percentage, start_date, deadline, is_delayed: boolean, teams_count, tasks_count, completed_tasks_count}], chart*: array (untyped items)}` | yes |
| GET | `/v1/reports/tasks` | `report.tasks`: Task reports (completion rate, on-time delivery, priority & status breakdowns) | bearer | none | 200, `data`: `{summary*: {total_tasks, completed_tasks, in_progress_tasks, in_review_tasks, pending_tasks, overdue_tasks: integer, completion_rate, on_time_completion_rate: number}, by_priority*: string, by_status*: string, chart*: array (untyped items)}` | yes |
| GET | `/v1/reports/teams` | `report.teams`: Team performance reports and workload distribution | bearer | none | 200, `data`: `{summary*: {total_teams: integer, total_members: string, total_assigned_tasks: string}, teams*: [{team_id, team_name, description?, members_count, active_projects_count, total_tasks, completed_tasks, pending_tasks: integer, completion_rate, workload_share_percentage: number}], filter*: array (untyped items)}` | yes |
| GET | `/v1/reports/users/{id}` | `report.users`: User productivity and performance report | bearer | path `id`: integer?, marked "**Optional**", `x-optional: true`, default null (so the route is likely `/reports/users/{id?}`) | 200, `data`: `{user*: {id, name, email, job_title?, years_of_experience, roles: [{relations: ["roles"]}]}, tasks*: {total_assigned, completed, in_progress, pending, overdue: integer, completion_rate, on_time_rate: number}, meetings*: {total_invited, attended: integer, attendance_rate: number}, files*: {uploaded_count, total_size_bytes: integer, formatted_size: string}, productivity*: {score: number, performance_level: enum}, chart*: array (untyped items)}` | differs (Postman has both `/reports/users` and `/reports/users/1`; spec has one path with an optional segment) |

### Search

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/search` | `v1.search`: Navbar global search across everything the user may see | bearer | query: `q*`: string 1–100, `limit`: integer? 1–20, `types`: string? (no allowed values documented) | 200, `data`: `{query*: string, total*: integer (const 0), results*: string}`. The types look like inference artifacts (see section 9). | no |

### SocialAuth

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/auth/social/{provider}/redirect` | `socialAuth.redirect`: OAuth authorization redirect URL for client apps | **public** | path `provider*`: string (no enum) | 200, `data`: `{provider*: string, authorization_url*: string}` (JSON, not 302). 422 `{success, message, errors: null}` | yes (Postman `google` only) |
| GET | `/v1/auth/social/{provider}/callback` | `socialAuth.callback`: OAuth callback from web redirect or client access token | **public** | path `provider*`: string. **No query params and no body documented.** | 200, `data`: `{user*: $UserResource, token*: string, token_type*: const "Bearer"}`. 400 and 422 `{success, message, errors: null}` | **differs** (Postman uses POST with body `token`) |

### Task

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/projects/{project}/tasks/kanban` | `task.kanban`: Kanban board view for a project | bearer | path `project*` | 200, `data`: typed as **`string`** (unverified; the column structure is not in the spec) | yes |
| PATCH | `/v1/tasks/{task}/status` | `task.updateStatus`: Quick status update for Kanban drag-and-drop | bearer | JSON `$UpdateTaskStatusRequest`: `status*`: `$TaskStatus`, `hours_spent`: number? 0–10000 | 200, `data`: `$TaskResource` | differs (spec adds `hours_spent`) |
| PATCH | `/v1/tasks/{task}/assign` | `task.assign`: Assign or reassign a task | bearer | JSON `$AssignTaskRequest` (body not required): `assigned_to`: integer?, `team_id`: integer? | 200, `data`: `$TaskResource` | yes (`team_id` is documented in the spec) |
| GET | `/v1/tasks` | `tasks.index`: Listing of tasks with filters | bearer | **no query params documented** | 200, `anyOf`: (a) message "Tasks retrieved successfully.", `data` **untyped in spec**; (b) message "Kanban board retrieved successfully.", `data`: string. The trigger for (b) is not documented. | differs (Postman uses `project_id`, `status`, `per_page`; description adds `priority`, `assigned_to`, `due_date`, `overdue`) |
| POST | `/v1/tasks` | `tasks.store` | bearer | JSON `$StoreTaskRequest`: `name*` ≤255, `description`?, `project_id*`: integer, `team_id`?, `assigned_to`?, `priority`: `$TaskPriority`?, `status`: `$TaskStatus`?, `due_date`: date-time?, `hours_spent`: number? 0–10000 | 201, `data`: `$TaskResource` | differs (spec adds `hours_spent`) |
| GET | `/v1/tasks/{task}` | `tasks.show` | bearer | path `task*` | 200, `data`: `$TaskResource` (no subtasks or attachment list; only `attachments_count`) | yes |
| PUT | `/v1/tasks/{task}` | `tasks.update` | bearer | JSON `$UpdateTaskRequest` (all optional, `priority`/`status` not nullable): `name`, `description`?, `project_id`, `team_id`?, `assigned_to`?, `priority`, `status`, `due_date`?, `hours_spent`? | 200, `data`: `$TaskResource` | yes |
| DELETE | `/v1/tasks/{task}` | `tasks.destroy` | bearer | path `task*` | 200, `data`: null | yes |

### Team

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/teams` | `teams.index`: Listing of teams | bearer | **no query params documented** | 200, `data`: **untyped in spec** | differs (Postman uses `page`, `per_page`, `search`) |
| POST | `/v1/teams` | `teams.store` | bearer | JSON `$StoreTeamRequest`: `name*` ≤255, `description`? ≤1000, `members`: array? of `{user_id: integer, role_in_team: $TeamRole?}` | 201, `data`: `$TeamResource` | yes |
| GET | `/v1/teams/{team}` | `teams.show` | bearer | path `team*` | 200, `data`: `$TeamResource` (no assigned-projects list in the schema) | yes |
| PUT | `/v1/teams/{team}` | `teams.update` | bearer | JSON: `name` ≤255, `description`? ≤1000 | 200, `data`: `$TeamResource` | yes |
| DELETE | `/v1/teams/{team}` | `teams.destroy` | bearer | path `team*` | 200, `data`: null | yes |
| POST | `/v1/teams/{team}/members` | `team.assignMembers`: Assign or update members | bearer | JSON: `members*` (min 1) of `{user_id*: integer, role_in_team: $TeamRole?}` | 200, `data`: `$TeamResource` | yes |
| DELETE | `/v1/teams/{team}/members/{user}` | `team.removeMember` | bearer | path `team*`, `user*` | 200, `data`: `$TeamResource` | yes |

### TeamRole

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/team-roles` | `v1.teamRole`: Allowed values for `role_in_team` | bearer | none | 200, `data`: `{roles*: array (items untyped in spec), default*: const "Member"}`. Postman example shows items as `{value, is_leader}`. | yes |

### User

| Method | Path | operationId / summary | Auth | Request | Success + `data` shape | In Postman? |
|---|---|---|---|---|---|---|
| GET | `/v1/users` | `users.index`: List users with search, role filters, and pagination | bearer | **no query params documented** (the summary mentions search and role filters) | 200, no `message`. `data`: `$UserResource[]`; sibling `meta*`: `{current_page, last_page, per_page, total}` | differs (Postman uses `per_page`) |
| POST | `/v1/users` | `users.store`: Create a new user (Administrator only) | bearer | JSON `$StoreUserRequest`: `name*` ≤255, `email*` ≤255, `password*` ≥8, `role*`: `Administrator`/`Project Manager`/`Team Member`, `job_title`?, `years_of_experience`? 0–60, `phone`? ≤50, `status`: `active`/`inactive`? | 201, `data`: `$UserResource` | yes (spec adds optional `phone`) |
| GET | `/v1/users/{user}` | `users.show` | bearer | path `user*` | 200, no `message`. `data`: `$UserResource` (no projects, tasks or audit logs in the schema) | yes |
| PUT | `/v1/users/{user}` | `users.update`: Update an existing user (Administrator only) | bearer | JSON `$UpdateUserRequest` (all optional): `name`, `email`, `password`? ≥8, `role`?, `job_title`?, `years_of_experience`?, `phone`?, `status`? | 200, `data`: `$UserResource` | differs (spec adds `name`, `email`, `password`, `years_of_experience`, `phone`) |
| DELETE | `/v1/users/{user}` | `users.destroy`: Delete a user (Administrator only) | bearer | path `user*` | 200, `{success*, message*}`, **no `data` key** | yes |

### Count check

| Tag | Ops | Tag | Ops |
|---|---|---|---|
| Activity | 1 | Notification | 5 |
| AiAssistant | 1 | Profile | 7 |
| AiSetting | 2 | Project | 9 |
| AuditLog | 1 | ProjectMessage | 7 |
| Auth | 6 | Report | 4 |
| Broadcast | 1 | Search | 1 |
| Dashboard | 1 | SocialAuth | 2 |
| File | 5 | Task | 8 |
| MarkMeetingAttendance | 1 | Team | 7 |
| Meeting | 5 | TeamRole | 1 |
| MeetingComment | 4 | User | 5 |
| MeetingNote | 4 | | |
| MeetingSummary | 4 | **Total** | **92** |

---

## 3. Pagination

The spec documents **three different paginated shapes**, plus nine list endpoints whose shape is untyped.

| Shape | Where | Exact structure |
|---|---|---|
| A. Custom `meta` sibling of `data` | `GET /v1/users`, `GET /v1/audit-logs`, `GET /v1/notifications` | `{success, [message], data: Item[], meta: {current_page: integer, last_page: integer, per_page: integer, total: integer}}`. Notifications add `meta.unread_count: integer`. **No `links` object.** `users` and `audit-logs` have no `message`. |
| B. Raw Laravel `LengthAwarePaginator` nested in `data` | `GET /v1/auth/profile/tasks` | `data: {current_page, data: Task[], first_page_url?, from?, last_page, last_page_url?, links: [{url?, label, active}], next_page_url?, path?, per_page, prev_page_url?, to?, total}` |
| C. Dashboard widget blocks | `GET /v1/dashboard` (`active_projects`, `tasks`, `teams`, `recent_files`, `recent_activity`) | `{items: X[], pagination: {current_page, per_page, total}}`, with all three pagination values **typed as string** (likely inference noise). `upcoming_meetings` has `items` only. No query params for paging these blocks are documented. |
| Untyped | `GET /v1/projects`, `/tasks`, `/teams`, `/files`, `/meetings`, `/projects/{project}/messages`, `/meetings/{meeting}/comments`, `/activities`, `/auth/profile/files` | `data` is `{}` in the spec. Shape **unverified**. It could be A, B, a plain array, or a Laravel resource collection `{data, links, meta}`. |
| Not paginated (plain array) | `/meetings/{meeting}/notes`, `/projects/{project}/teams`, `/ai/settings` | `data: Item[]` |

No endpoint uses the standard Laravel API-resource collection shape `{data, links, meta}` with `meta.from/to/path/links`.

### Query parameters per list endpoint

| Endpoint | Spec-documented query params | Postman-only params (unverified by spec) |
|---|---|---|
| `GET /v1/audit-logs` | `category` (`$AuditLogCategory`), `user_id`, `action` (≤100), `search` (≤255), `per_page` (1–100), `page` (≥1) | — |
| `GET /v1/activities` | `category`, `user_id` (Administrators only, per summary), `per_page` (1–50). No `page`. | — (not in Postman) |
| `GET /v1/dashboard` | `period`, `year`, `from`, `to` (chart only) | — |
| `GET /v1/projects/{project}/overview` | `period` (`year`, `6_months`), `year` | — |
| `GET /v1/search` | `q*`, `limit` (1–20), `types` | — |
| `GET /v1/projects` | none | `page`, `per_page`, `search`, `status`, `priority`, `sort` (`newest`) |
| `GET /v1/tasks` | none | `project_id`, `status`, `per_page`; description: `priority`, `assigned_to`, `due_date`, `overdue` |
| `GET /v1/teams` | none | `page`, `per_page`, `search` |
| `GET /v1/meetings` | none | `project_id`, `time_filter` (`upcoming`/`past`/`today`), `per_page` |
| `GET /v1/files` | none | `project_id`, `per_page`; description: `task_id`, `search` |
| `GET /v1/projects/{project}/messages` | none | `per_page` |
| `GET /v1/notifications` | none | `per_page`, `status=unread` |
| `GET /v1/users` | none (summary says "search, role filters, and pagination") | `per_page` |
| `GET /v1/auth/profile/tasks`, `/profile/files`, `/meetings/{meeting}/comments` | none | none |

Param names where documented: `page` and `per_page` (snake_case). No sort parameter is documented anywhere in the spec.

---

## 4. Core resource schemas

Types are exactly as in `components.schemas`. Dates are plain `string` unless a `format` is shown.

### User: `UserResource`

| Field | Type |
|---|---|
| `id`* | integer |
| `name`* | string |
| `email`* | string |
| `job_title`* | string? |
| `about`* | string? |
| `years_of_experience`* | integer |
| `phone`* | string? |
| `avatar_url`* | string? |
| `status`* | string (no enum here; request schemas use `active`/`inactive`) |
| `available_status`* | enum `available`, `busy`, `away`, `offline` |
| `current_project_id`* | integer? |
| `current_project` | `{id*: integer, name*: string}` |
| `roles`* | array, **items untyped in spec** |
| `permissions`* | array, **items untyped in spec** |
| `google_linked`*, `facebook_linked`*, `linkedin_linked`* | boolean |
| `created_at`*, `updated_at`* | string? |

`GET /v1/auth/me` wraps it as `data.user` (allOf `UserResource` + bare object, so extra keys may exist) next to `stats`, `recent_activities`, `teams: Team[]`, `projects: Project[]`.

### Team: `Team` (plain model) and `TeamResource`

`Team`: `id`* integer, `name`* string, `description`* string?, `created_by`* integer, `created_at`*/`updated_at`* string? (date-time).

`TeamResource`: `id`*, `name`*, `description`*?, `created_by`* integer, `creator`: `{id*, name*, email*}`, `members_count`*: string\|integer (≥0), `active_projects_count`*: string\|integer (≥0), `members`: `TeamMemberResource[]`, `created_at`*?, `updated_at`*?. Responses use `allOf [TeamResource, object]`.

### TeamMember: `TeamMemberResource`

`id`* integer, `name`* string, `email`* string, `job_title`* string?, `avatar_url`* string?, `role_in_team`* `$TeamRole` enum (section 5), `is_leader`* boolean, `joined_at`* string?.

### Project: `Project` (plain model) and `ProjectOverviewResource`

`Project`: `id`*, `name`*, `description`*?, `start_date`* (date-time), `deadline`* (date-time), `priority`* `$ProjectPriority`, `status`* `$ProjectStatus`, `progress_percentage`* number, `created_by`* integer, `created_at`*?, `updated_at`*?.

`ProjectOverviewResource` (returned by show/store/update/assignTeams/removeTeam):

| Field | Type |
|---|---|
| `id`*, `name`*, `description`*? | integer, string, string? |
| `status`* | enum `Pending`, `In Progress`, `On Hold`, `Completed`, `Cancelled` |
| `priority`* | enum `Low`, `Medium`, `High`, `Critical` |
| `progress_percentage`* | number |
| `due_date_indicator`* | `{start_date*: string, deadline*: string, total_days*: untyped, days_remaining*: integer, is_overdue*: boolean}` |
| `tasks_statistics`* | `{total, pending, in_progress, in_review, completed: integer; completion_rate, pending_percentage, in_progress_percentage, in_review_percentage, completed_percentage: number}` |
| `counts`* | `{files, meetings, messages, teams, direct_members: integer}` |
| `teams` | `TeamResource[]` |
| `direct_members` | `[{id*, name*, email*, avatar_url*?, job_title*?, role*: string (`Contributor` listed as a possible value)}]` |
| `created_by`*, `creator` | integer, `{id*, name*, email*}` |
| `created_at`*, `updated_at`* | string? |

`ProjectTeamProgressResource` (`GET /projects/{project}/teams`): `id`* integer, `name`* string, `completion_percentage`*: string \| number(const 0), `total_tasks`*: string \| integer(0), `completed_tasks`*: string \| integer(0), `members`*: string \| string[]. The Postman "12/20" ratio string does **not** appear as a field.

### Task: `Task` (plain model) and `TaskResource`

`Task`: `id`*, `name`*, `description`*?, `project_id`*, `team_id`*?, `assigned_to`*?, `created_by`*, `priority`* `$TaskPriority`, `status`* `$TaskStatus`, `due_date`*? (date-time), `hours_spent`* number, `completed_at`*? (date-time), `created_at`*?, `updated_at`*?.

`TaskResource`: `id`*, `name`*, `description`*?, `priority`* `$TaskPriority`, `status`* `$TaskStatus`, `due_date`*?, `completed_at`*?, `hours_spent`* number, `project_id`*, `team_id`*?, `assigned_to`*?, `created_by`*, `project`: `{id*, name*}`, `team`: `{id*, name*}`, `assignee`: `{id*, name*, email*, avatar_url*?, job_title*?}`, `creator`: `{id*, name*, email*}`, `attachments_count`*: string\|integer, `created_at`*?, `updated_at`*?. (The nested `project`/`team`/`assignee`/`creator` are nullable where referenced inside other schemas.)

`DashboardTaskResource`: `id`, `name`, `priority`: string, `status`: string, `status_label`: `$TaskStatus` enum, `due_date`?, `project`: `{id, name}`, `assignee`: `{id, name, avatar_url?}`.

### Meeting: `MeetingResource`

`id`*, `title`*, `description`*?, `meeting_date`* string, `start_time`* string, `end_time`* string, `meeting_link`* string, `status`* `$MeetingStatus`, `project_id`*, `created_by`*, `project`: `{id*, name*}`, `creator`: `{id*, name*, email*}`, `participants_count`*: string\|integer, `participants`*: array? of `{id*, name*, email*, avatar_url*?, job_title*?, attended*: boolean}`, `summary`*: `MeetingSummaryResource` \| null, `created_at`*?, `updated_at`*?.

`DashboardMeetingResource`: `id`, `title`, `date`, `start_time`, `end_time`, `meeting_link`, `project`: `{id, name}`, `creator`: `{id, name}`, `participants`: `[{id, name, avatar_url?}]`.

### MeetingSummary / AI: `MeetingSummaryResource`

`id`* integer, `meeting_id`* integer, `summary`* string, `decisions_made`* array, `action_items`* array, `assigned_tasks`* array, `risks`* array, `next_steps`* array (**all five arrays have untyped items** in the response schema), `generated_by_ai`* boolean, `created_at`*?, `updated_at`*?.

The request schema `UpdateSummaryRequest` does type them: `decisions_made`, `assigned_tasks`, `risks`, `next_steps` are `string[]`, and `action_items` is `[{title: string, suggested_assignee: string?, priority: string?}]`. The response item shape is likely the same but is unverified.

Other AI shapes: `POST /ai/ask` response (section 2, AiAssistant); AI settings item `{id, key, value: untyped, type: string, description?, updated_by: {id, name}, updated_at?}`. No schema names the AI provider beyond `source: const "gemini"` in the ask response.

### MeetingComment and MeetingNote (spec only)

`MeetingCommentResource`: `id`*, `meeting_id`*, `parent_id`*?, `body`* string, `is_edited`* boolean, `author`*: `{id*, name*, avatar_url*?, job_title*?}`, `can_edit`* boolean, `can_delete`* boolean, `replies_count`*: string\|integer, `replies`*: `MeetingCommentResource[]`, `created_at`*?, `updated_at`*?.

`MeetingNoteResource`: `id`*, `meeting_id`*, `content`* string, `created_at`*?, `updated_at`*?. Per summary, notes are private to the caller ("Your notes").

### File / Attachment: `FileAttachmentResource`

`id`*, `name`*, `file_path`* string, `file_size`* integer (bytes), `file_size_formatted`* string, `mime_type`*?, `url`* string, `project_id`*?, `task_id`*?, `uploaded_by`* **string** (a name, not an ID), `uploaded_by_id`* integer, `project`: `{id*, name*}`, `task`: `{id*, name*}`, `uploader`: `{id*, name*, email*}`, `created_at`*?, `updated_at`*?.

`DashboardFileResource`: `id`, `name`, `mime_type`?, `file_size_formatted`, `download_url`, `uploaded_by`: `{id, name}` (an object here), `project`: `{id, name}`, `created_at`?.

Whether `url` is a public storage URL or needs the Bearer header is not stated; the separate `/files/{file}/download` endpoint requires bearer auth.

### Message: `ProjectMessageResource`

`id`*, `project_id`*, `message`* string, `is_edited`* boolean, `sender`*: `{id*, name*, email*, avatar_url*?, job_title*?}`, `parent`*: `{id*, message*, sender_name*}` (nullable in practice, not marked), `attachment`*: `{id*, name*, mime_type*?, file_size*: integer, url*}`, `mentions`*: `[{id*, name*, email*}]`, `is_read_by_me`* boolean, `readers_count`* integer, `created_at`*?, `updated_at`*?. No `replies` list.

### Notification: `NotificationResource`

`id`* **string**, `type`* untyped, `title`* untyped, `message`* untyped, `data`* array (items untyped), `is_read`* boolean, `read_at`*?, `created_at`*?. Only `id`, `is_read` and timestamps are typed. The notification kinds (task assigned, mention, meeting invite) are not enumerated.

### Report (inline, no named schema)

See section 2, Report. Fixed enum: `productivity.performance_level`: `Outstanding`, `High Performer`, `Good`, `Needs Improvement`. `by_priority` and `by_status` (task report) are typed as `string`, though the names suggest maps. Every report's `chart` (and the team report's `filter`) has untyped items. No report documents query params (date range, project filter).

### Dashboard: `DashboardResource`

`overview`*: string, `project_overview`*: string, `active_projects`*: `{items: DashboardProjectResource[], pagination}`, `tasks`*: `{items: DashboardTaskResource[], pagination}`, `teams`*: `{items: DashboardTeamResource[], pagination}`, `upcoming_meetings`*: `{items: DashboardMeetingResource[]}`, `recent_files`*: `{items: DashboardFileResource[], pagination}`, `recent_activity`*: `{items: DashboardActivityResource[], pagination}`; `pagination` = `{current_page, per_page, total}` (strings).

- `DashboardProjectResource`: `id`, `name`, `progress`: number, `tasks_total`: integer?, `tasks_completed`: integer?.
- `DashboardTeamResource`: `id`, `name`, `description`?, `members_count`, `projects_count`: integer.
- `DashboardActivityResource`: `id`, `category`: `$AuditLogCategory`, `action`: string, `description`?, `user`: `{id, name, avatar_url?}`, `created_at`.

`overview` (stat cards) and `project_overview` (chart) are typed as `string`, which is almost certainly an inference failure; their real shape is unverified.

### AuditLog: `AuditLogResource`

`id`*, `category`* `$AuditLogCategory`, `action`* string (free text), `description`*?, `ip_address`*?, `user`*: `{id*, name*, email*}`, `payload`*: array? (items untyped), `created_at`*.

---

## 5. Enums and role values (exactly as in the spec)

| Enum | Values | Where defined |
|---|---|---|
| `TaskStatus` | `Pending`, `In Progress`, `In Review`, `Completed` | `components.schemas.TaskStatus`; same list in Store/Update/UpdateTaskStatus requests and `DashboardTaskResource.status_label` |
| `TaskPriority` | `Low`, `Medium`, `High`, `Critical` | `components.schemas.TaskPriority` |
| `ProjectStatus` | `Pending`, `In Progress`, `On Hold`, `Completed`, `Cancelled` | `components.schemas.ProjectStatus` |
| `ProjectPriority` | `Low`, `Medium`, `High`, `Critical` | `components.schemas.ProjectPriority` |
| `MeetingStatus` | `Scheduled`, `Completed`, `Cancelled` | `components.schemas.MeetingStatus` (settable via `PUT /meetings/{meeting}`) |
| System role (`role` on user create/update) | `Administrator`, `Project Manager`, `Team Member` | inline in `StoreUserRequest.role` and `UpdateUserRequest.role`. No named `UserRole` schema exists, although the `TeamRole` description refers to one. `UserResource.roles` items are untyped. |
| User account `status` (requests) | `active`, `inactive` | `StoreUserRequest`, `UpdateUserRequest`. `UserResource.status` is a plain string. |
| `AvailabilityStatus` | `available`, `busy`, `away`, `offline` | `components.schemas.AvailabilityStatus` ("not the account status active/inactive") |
| `TeamRole` (`role_in_team`) | `Team Lead`, `Tech Lead`, `Product Owner`, `Scrum Master`, `Backend Developer`, `Frontend Developer`, `Mobile Developer`, `Full-Stack Developer`, `UI/UX Designer`, `QA Engineer`, `DevOps Engineer`, `Data Engineer`, `AI/ML Engineer`, `Security Engineer`, `Business Analyst`, `Support Engineer`, `Mentor`, `Intern`, `Member` (19; default `Member` per `/team-roles`) | `components.schemas.TeamRole`. Matches the Postman example list exactly. `is_leader` is a separate boolean; the spec does not say which roles are leaders. |
| Project direct-member `role` | free string ≤100 on input; response lists `Contributor` as a possible value | `StoreProjectRequest.members[].role`, `ProjectOverviewResource.direct_members[].role` |
| `AuditLogCategory` | `auth`, `project`, `task`, `file`, `chat`, `meeting`, `ai` | `components.schemas.AuditLogCategory` (audit logs, activities, dashboard activity) |
| Dashboard `period` | `year`, `6_months`, `3_months`, `30_days`, `7_days`, `custom` | `GET /v1/dashboard` query |
| Project overview `period` | `year`, `6_months` | `GET /v1/projects/{project}/overview` query |
| `performance_level` | `Outstanding`, `High Performer`, `Good`, `Needs Improvement` | `GET /v1/reports/users/{id}` |
| AI ask `source` | const `gemini` | `POST /v1/ai/ask` |
| `token_type` | const `Bearer` | login, register, social callback |
| Social `provider` | **no enum** (plain string) | path param |
| Kanban column keys | **not in spec** (`data` typed as string) | — |

---

## 6. Discrepancies with Postman

### 6.1 Resolution of the field-name conflicts from api-inventory.md "Gaps"

| Conflict (Postman body vs description) | Spec uses | Resolution |
|---|---|---|
| Change Password: `password`/`password_confirmation` vs `new_password`/`new_password_confirmation` | `PUT /v1/auth/password` → `current_password*`, `password*`, `password_confirmation*` | **Postman body is right.** Note: `POST/PUT /v1/auth/profile` separately accepts `old_password`, `new_password`, `confirmation_password`, which is probably where the description's names came from. `new_password_confirmation` exists nowhere in the spec. |
| Schedule Meeting: `participants` vs `attendee_ids` | `participants`: integer[]? (also on update) | **Postman body is right.** `attendee_ids` does not exist in the spec. |
| Mark Attendance: `attendance[].attended` (boolean) vs `user_id` + `status` (`attended`/`absent`/`excused`) | `attendance*`: `[{user_id*: integer, attended*: boolean}]` | **Postman body is right.** No attendance `status` enum exists; the response exposes `participants[].attended: boolean`. |
| AI summary input: `transcript` vs `notes` | `transcript`: string? (body optional) | **Postman body is right.** There is no `notes` field on generate. "Notes" in the spec is a separate per-user resource, `/v1/meetings/{meeting}/notes`. What the AI uses when `transcript` is omitted is not documented. |
| AI ask input: `query` vs `prompt` | `query*`: string 2–1000, `project_id`: integer? | **Postman body is right.** `prompt` does not exist in the spec. |
| Create Project `teams`, `members[{user_id, role}]` undocumented; "budget metadata" | `teams`: integer[]?, `members`: `[{user_id, role: string? ≤100}]` | Both fields exist. **No budget field** exists anywhere in the spec. |
| Create/Assign Task `team_id` undocumented | `team_id`: integer? on StoreTask, UpdateTask, AssignTask | Field exists. |
| OTP digits (4-digit sample vs "exactly 6 digits") | `otp*`: string, no length constraint in spec | Unresolved by spec. The forgot-password summary says "6-digit". |

### 6.2 Route and method differences

| Postman | Spec | Note |
|---|---|---|
| `PATCH /api/v1/messages/{id}` (Edit Message) | `PUT /v1/messages/{message}` | Method differs. Use PUT unless verified otherwise. |
| `POST /api/v1/auth/social/google/callback` with JSON `{token}` | `GET /v1/auth/social/{provider}/callback`, no params or body documented | Method differs and input is undocumented. |
| `GET /api/v1/auth/social/google/redirect` (302 or JSON) | `GET …/{provider}/redirect` → 200 JSON `{provider, authorization_url}` | Spec says JSON only. |
| `GET /api/v1/reports/users` and `GET /api/v1/reports/users/1` | `GET /v1/reports/users/{id}` with `id` marked optional | One route with an optional segment. Calling `/reports/users` with no ID is implied but not modelled as a separate path. |
| `POST /api/v1/projects/{id}/messages/mark-read` | `…/mark-read` **and** `…/read` (identical) | Alias in spec only. |
| `POST /api/v1/auth/profile` (multipart) | `POST` **and** `PUT /v1/auth/profile` | PUT is spec only. Multipart over PUT will not carry files in PHP, so POST stays the safe choice for avatars. |

### 6.3 Field-level differences

| Operation | Difference |
|---|---|
| Register | Postman description lists optional `job_title`, `years_of_experience`, `phone`; spec `RegisterRequest` has only `name`, `email`, `password`, `password_confirmation`. |
| Update profile | Spec adds `full_name`, `email`, `about`, `available_status`, `current_project_id`, `avatar_url`, `old_password`, `new_password`, `confirmation_password`. `phone` max 30 here vs 50 on user create/update. |
| Project status | Postman descriptions: `Planning`, `In Progress`, `On Hold`, `Completed`. Spec: `Pending`, `In Progress`, `On Hold`, `Completed`, `Cancelled`. **`Planning` is not a valid spec value.** |
| Create Project `priority` | Postman description: required. Spec: optional, nullable. |
| Update Project | Spec adds `description`, `start_date`, `deadline`, `teams`. No `members` on update. |
| Task create / update / status | Spec adds `hours_spent` (number 0–10000). Response adds `completed_at`, `hours_spent`, `attachments_count`. |
| Task details | Postman description mentions subtasks and attached files; `TaskResource` has neither (only `attachments_count`). |
| Update Meeting | Spec adds `description`, `status` (`MeetingStatus`), `participants`. |
| Meeting date/time | Spec: `meeting_date` format `date-time`; `start_time`/`end_time` plain strings (Postman uses `YYYY-MM-DD` and `HH:MM:SS`). |
| Update Summary | Spec adds `action_items[{title, suggested_assignee, priority}]`, `assigned_tasks`, `risks`, `next_steps`. |
| Create tasks from summary | Spec adds `action_item_indices` (pick which items to convert). |
| Generate summary | Returns 200, not 201. Body is optional. |
| Update User | Spec adds `name`, `email`, `password`, `years_of_experience`, `phone`. |
| Create User | Spec adds optional `phone`. |
| Show User | Postman description: projects, tasks, audit logs. Spec `UserResource` has none of these. |
| Team details | Postman description: assigned projects. `TeamResource` has `active_projects_count` only. |
| Project teams ratio | Postman: string like "12/20". Spec: `total_tasks`, `completed_tasks`, `completion_percentage` separately. |
| Notifications list filter | Postman `status=unread`; not in spec. Spec `meta.unread_count` exists. |
| Meetings list filter | Postman `time_filter` (`upcoming`/`past`/`today`); not in spec. |
| Project list `sort` | Postman `sort=newest`; not in spec. |
| Dashboard | Spec adds `period`, `year`, `from`, `to`. |
| Error 422 envelope | Postman examples include `success: false`; spec `ValidationException` has only `message`, `errors`. |
| Delete User | Returns `{success, message}` with no `data` key (every other delete returns `data: null`). |
| Notification ID | Spec: `string` path param (Postman description says UUID). Other IDs are integers. |

---

## 7. Operations only in the spec / only in Postman

### Only in the spec (14)

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/activities` | Personal activity feed (Admins: everyone, filter by user) |
| GET | `/v1/broadcasting/auth` | Channel authorization for private broadcast channels |
| GET | `/v1/search` | Global navbar search |
| GET | `/v1/projects/{project}` | Project details (`ProjectOverviewResource`) |
| PUT | `/v1/auth/profile` | Profile update via PUT (duplicate of POST) |
| POST | `/v1/projects/{project}/messages/read` | Alias of `mark-read` |
| GET / POST | `/v1/meetings/{meeting}/comments` | Meeting comment thread list / create |
| PUT / DELETE | `/v1/meetings/{meeting}/comments/{comment}` | Edit / delete comment (delete cascades replies) |
| GET / POST | `/v1/meetings/{meeting}/notes` | Caller's private meeting notes list / create |
| PUT / DELETE | `/v1/meetings/{meeting}/notes/{note}` | Edit / delete note |

### Only in Postman

No Postman route is missing from the spec entirely. Three Postman requests have no exact spec match:

- `POST /api/v1/auth/social/google/callback` (spec: GET).
- `PATCH /api/v1/messages/{id}` (spec: PUT).
- `GET /api/v1/reports/users` without an ID (spec: one path with an optional `{id}`).

Mapping: Postman has 79 distinct method+path routes; 76 match a spec operation exactly, and the 3 above map to spec operations with a different method or optional segment. Of the 92 spec operations, 78 correspond to Postman routes and 14 are spec only.

---

## 8. Still unknown after reading the spec

| Unknown | Detail |
|---|---|
| Real-time event names and payloads | The spec has no event, channel or payload definitions. The only real-time artifact is `GET /v1/broadcasting/auth` with an untyped response and no documented params. Postman mentions channel `private-projects.{id}` for chat only. Nothing covers notifications, task or meeting events. |
| Reverb connection config | No host, port, scheme, app key or cluster appears in the spec. Whether `/broadcasting/auth` also accepts POST (Pusher/Echo clients POST `socket_id` + `channel_name` by default) is not documented; the spec lists GET only. |
| Untyped list responses | `data` is untyped for `GET /projects`, `/tasks`, `/teams`, `/files`, `/meetings`, `/projects/{project}/messages`, `/meetings/{meeting}/comments`, `/activities`, `/auth/profile/files`. Their item shape and pagination shape are unknown. |
| List filter/sort params | None documented for projects, tasks, teams, files, meetings, messages, notifications, users. Only Postman lists them. |
| Kanban structure | `GET /projects/{project}/tasks/kanban` and the second `tasks.index` variant type `data` as `string`. Column keys and item shape unknown. What triggers the Kanban variant of `GET /tasks` is unknown. |
| Project overview analytics | `GET /projects/{project}/overview` returns `array` with untyped items, even though its summary says "complete project overview". |
| Dashboard `overview` and `project_overview` | Typed as `string`. Real stat-card and chart shapes unknown. |
| Report charts | `chart` (all user/project/task reports) and `filter` (team report) untyped; `by_priority`/`by_status` typed as `string`. |
| Roles and permissions shape | `UserResource.roles` and `.permissions` items untyped. Whether `roles` holds strings (`"Administrator"`) or objects (`{id, name}`) is unknown, and the report schema hints at Eloquent role models (`relations: ["roles"]`). No permission strings are listed. |
| Notification content | `type`, `title`, `message` untyped; `data` items untyped. Notification kinds not enumerated. |
| Meeting summary arrays in responses | `decisions_made`, `action_items`, `assigned_tasks`, `risks`, `next_steps` untyped in responses (typed only in the update request). |
| Meeting comments list | Untyped (`data: {}`), though the item schema `MeetingCommentResource` exists. |
| AI settings `value` | Untyped; settings `type` is a free string. Allowed keys not enumerated. |
| AI ask response | `anyOf` of an untyped array and an object; `suggested_actions` items untyped. When the array form is returned is unknown. |
| Search results | `results` typed as `string`, `total` as const 0; `types` filter values not listed. |
| Social OAuth input | Callback documents no query/body; whether it takes `code`, `token` or `access_token` is unknown. Supported providers are not enumerated (user flags suggest `google`, `facebook`, `linkedin`). |
| `broadcasting/auth` | Response untyped, no envelope. |
| Authorization rules | Role restrictions appear only in some summaries ("Administrator only", "Administrator & Project Manager only"). Most operations do not say who may call them; 403 responses are listed but not explained. |
| Token lifetime and `remember` | No expiry, refresh endpoint or `expires_at` field. |
| Rate limits | No 429 responses are documented (Postman mentions 10 req/min on reset endpoints). |
| File URL access | Whether `FileAttachmentResource.url` / `DashboardFileResource.download_url` are public or need the Bearer header. |
| Soft vs hard delete | Only message delete says "soft delete". Project/user delete behavior is not stated. |
| Endpoints with no response body schema | None are missing a 2xx schema entirely, apart from `broadcasting/auth` (bare object). `DELETE /users/{user}` has no `data` key. |

---

## 9. Spec-quality notes

Classification of each operation's success `data` (computed by walking every resolved schema):

| Class | Count | Meaning |
|---|---|---|
| Fully typed | 33 | Every leaf has a type. **Includes 4 with implausible types**: Kanban (`data: string`), search (`results: string`, `total: const 0`), dashboard (`overview`/`project_overview: string`, pagination values `string`), project teams progress (`string \| const 0` unions). |
| Partially typed | 33 | Some nested nodes untyped: mostly `roles[]`/`permissions[]` on every `UserResource` (11 ops), the five summary arrays on every `MeetingResource`/`MeetingSummaryResource` (7 ops), `due_date_indicator.total_days` on every `ProjectOverviewResource` (5 ops), notification `type`/`title`/`message`/`data`, report `chart`/`filter`, AI settings `value`, AI ask, audit-log `payload`, team-roles `roles[]`. |
| Untyped | 11 | `data: {}` on 9 list endpoints (projects, tasks, teams, files, meetings, messages, meeting comments, activities, profile files); project overview `array` with untyped items; `broadcasting/auth` bare object. |
| `data: null` | 13 | Deletes, logout, password flows. |
| No `data` key | 1 | `DELETE /users/{user}`. |
| Binary | 1 | `GET /files/{file}/download`. |
| **Total** | **92** | |

Other observations:

- The spec is generated from code, not hand-written. Request schemas (FormRequest validation) are reliable. Response schemas come from inference, so `string`, `const 0` and `string | integer` count types often mean "could not infer". Unions like `members_count: string | integer` and `attachments_count: string | integer` likely come from `withCount` values.
- No examples anywhere, so nothing in the spec shows a real payload.
- No query parameters are documented for most list endpoints, although the controllers clearly accept them (Postman shows `per_page`, `status`, `project_id`, and others in use).
- `info.version` is `0.0.1`, so there is no versioning signal beyond the `/v1` prefix.
- Date fields mix `format: date-time` (plain models, request bodies) with plain `string` (resources). `meeting_date` is `date-time` on input but the meeting is a calendar date plus separate times.
- Some envelopes omit `message` (`users.index`, `users.show`, `audit-logs`, `ai/ask`, `ai/settings` GET, dashboard). Client parsing should not require `message`.
- `allOf [Resource, {type: object}]` on teams, projects and `/me` user means extra keys may be present beyond the named schema.
- The `TeamRole` description mentions a `UserRole` schema that does not exist in `components.schemas`.
- `ProjectMessageResource.parent` and `.attachment` are required objects, not marked nullable, though top-level messages have no parent. Treat them as nullable.
- `ValidationException` lacks the `success` key that the Postman examples show.
