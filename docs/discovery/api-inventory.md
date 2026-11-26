# CollabSpace API inventory (Postman collection discovery)

Source: `CollabSpace AI - API Collection.postman_collection (1).json` at the repo root (Postman v2.1, 136,137 bytes). The file was parsed with PowerShell `ConvertFrom-Json` and read only; it was not modified.

Scope: every request in every folder was walked (13 top-level folders, **86 requests**, no nested sub-folders). For each request the method, URL, request-level auth, headers, query params, body, description, event scripts and saved response examples were read. This is an inventory for architecture discovery, not an API reference. Nothing here was checked against a live server; everything below comes from the collection file only.

Conventions used below:

- Every path is prefixed with `{{base_url}}` in the collection. Tables show the part after it.
- Numeric IDs in paths (`/teams/1`) are hard-coded in the collection. They are written as `{team}`-style placeholders in prose only where the description names the parameter.
- "Body fields" are taken from the example body. Fields that appear only in the description are listed in Notes.
- Credentials, tokens, OTPs, emails and phone numbers are written as `REDACTED`.

---

## 1. Collection-level facts

| Item | Value |
|---|---|
| Collection name | CollabSpace AI - API Collection |
| Collection description | "Comprehensive Postman Collection for CollabSpace AI - AI-Powered Project Collaboration Platform" |
| Collection-level auth | **None defined** |
| Folder-level auth | **None defined** on any of the 13 folders |
| Request-level auth | 77 requests set `bearer` with token `{{token}}`. The 9 public auth requests set no auth. |
| Collection/folder scripts | None (no collection or folder `event` blocks) |
| Collection variables | `bearer_token_0b1z` (value is empty; referenced once, inside the Logout description text) |
| Variables used but not defined in the collection | `base_url` (186 uses), `token` (84 uses), `notification_id` (4 uses). These must come from a Postman environment, which is not in the repo. |
| Base URL value | **Not present.** `base_url` has no value anywhere in the file. The only host hint is an example avatar URL in "Update Profile with Avatar": `https://collabspace.huma-volve.com/storage/avatars/xxxx.png`. That is an inference, not a confirmed API base URL. |
| API prefix | All 86 paths start with `/api/v1/` |
| Common headers | `Accept: application/json` on 85 requests (missing only on Download File). `Content-Type: application/json` on JSON-body requests. |
| Backend hints | Laravel: "auth:sanctum", "Bearer Sanctum token", `storage/logs/laravel.log`, `MAIL_MAILER=log`, "PHP does not read uploaded files on PUT requests", Laravel Reverb. |

### Scripts that set tokens

Only 4 requests have scripts, all `test` (post-response) scripts. No pre-request scripts exist anywhere.

| Request | Trigger | Effect |
|---|---|---|
| 1. Authentication / Register | `pm.response.code === 201` | `pm.environment.set("token", jsonData.data.token)` |
| 1. Authentication / Login (Admin) | `=== 200` | same |
| 1. Authentication / Login (Project Manager) | `=== 200` | same |
| 1. Authentication / Login (Team Member) | `=== 200` | same |

The scripts tell us the login/register response carries the token at `data.token`. They write to the **environment**, not to a collection variable. The Login (Admin) description says it updates "the collection environment variable `{{token}}`".

---

## 2. Endpoint tables per folder

Legend for Auth: `none` = no auth set on the request and none inherited (the collection has no auth); `bearer` = request-level Bearer `{{token}}`.
Legend for Examples: status codes of saved response examples, or `—` for none.

### 1. Authentication (10)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Register | POST | `/api/v1/auth/register` | none | — | raw JSON: name: string, email: string, password: string, password_confirmation: string | — | Desc also lists optional job_title, years_of_experience (int, min 0), phone. 201 returns user + Sanctum token; default role "Team Member". Test script stores `data.token`. |
| 2 | Login (Admin) | POST | `/api/v1/auth/login` | none | — | raw JSON: email: string, password: string, remember: boolean | — | `remember` "extends token lifespan". Credentials in body and description (REDACTED). Test script stores token. |
| 3 | Login (Project Manager) | POST | `/api/v1/auth/login` | none | — | raw JSON: email: string, password: string | — | Same route as #2. Credentials REDACTED. |
| 4 | Login (Team Member) | POST | `/api/v1/auth/login` | none | — | raw JSON: email: string, password: string | — | Same route as #2. Body credentials differ from the credentials written in the description (see Gaps). |
| 5 | Forgot Password | POST | `/api/v1/auth/forgot-password` | none | — | raw JSON: email: string | 200 | Step 1 of 3. Sends 6-digit OTP. Same response whether or not the email exists. |
| 6 | Verify Reset OTP | POST | `/api/v1/auth/verify-reset-otp` | none | — | raw JSON: email: string, otp: string | 200, 422 | Step 2 (optional). Checks without consuming the code. Locks after 5 wrong attempts. |
| 7 | Reset Password | POST | `/api/v1/auth/reset-password` | none | — | raw JSON: email: string, otp: string, password: string, password_confirmation: string | 200, 422 | Step 3. Revokes all tokens on success (signs out all devices). |
| 8 | Social Auth Redirect (Google) | GET | `/api/v1/auth/social/google/redirect` | none | — | none | — | Providers listed: google, facebook, linkedin. "HTTP 302 Redirect ... or JSON containing redirect target". Access not stated. |
| 9 | Social Auth Callback (Google Mock/Token) | POST | `/api/v1/auth/social/google/callback` | none | — | raw JSON: token: string | — | "Handle ... callback code or simulate token exchange". Returns user + Bearer token. Placeholder token value REDACTED. |
| 10 | Logout | POST | `/api/v1/auth/logout` | bearer | — | none | — | Revokes the current token (auth:sanctum). |

### 2. Profile (6)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Get Profile (/me) | GET | `/api/v1/auth/me` | bearer | — | none | — | Desc: user object, roles array, assigned projects with role pivots, team roster. |
| 2 | Update Profile with Avatar (form-data) | POST | `/api/v1/auth/profile` | bearer | — | multipart: avatar: file, job_title: text, years_of_experience: text, phone: text, name: text (disabled) | — | POST, not PUT, because of PHP multipart. Avatar jpg/jpeg/png/webp, max 2 MB, max 4000x4000. Old file deleted. Returns `avatar_url`. 422 on bad image. Phone value REDACTED. |
| 3 | Remove Avatar | DELETE | `/api/v1/auth/profile/avatar` | bearer | — | none | — | Deletes stored file; `avatar_url` becomes null. |
| 4 | Change Password | PUT | `/api/v1/auth/password` | bearer | — | raw JSON: current_password: string, password: string, password_confirmation: string | — | Desc names fields `new_password` / `new_password_confirmation` (mismatch). Values REDACTED. |
| 5 | Get User Tasks | GET | `/api/v1/auth/profile/tasks` | bearer | — | none | — | Tasks assigned to current user across projects; "status, priority, and deadline sorting" (no params documented). |
| 6 | Get User Files | GET | `/api/v1/auth/profile/files` | bearer | — | none | — | Files uploaded by current user across projects and task attachments. |

### 3. Teams (8)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List Team Roles | GET | `/api/v1/team-roles` | bearer | — | none | 200 | Fixed list of `role_in_team` values (19). Not system roles. |
| 2 | List Teams | GET | `/api/v1/teams` | bearer | page=1, per_page=15, search=Backend (disabled) | none | — | Returns member counts, active project counts, leader details. |
| 3 | Create Team | POST | `/api/v1/teams` | bearer | — | raw JSON: name: string, description: string, members: array of {user_id: int, role_in_team: string} | 422 | Admin + PM. Creator auto-added as Team Lead. Invalid role_in_team → 422. |
| 4 | Get Team Details | GET | `/api/v1/teams/1` | bearer | — | none | — | Member directory, member roles, assigned projects. |
| 5 | Update Team | PUT | `/api/v1/teams/1` | bearer | — | raw JSON: name: string, description: string | — | Admin + Team Leads. |
| 6 | Assign Members to Team | POST | `/api/v1/teams/1/members` | bearer | — | raw JSON: members: array of {user_id: int, role_in_team: string} | — | Upsert: existing member's role is updated. `members` min 1. |
| 7 | Remove Member from Team | DELETE | `/api/v1/teams/1/members/5` | bearer | — | none | — | URL params named `team`, `user`. |
| 8 | Delete Team | DELETE | `/api/v1/teams/1` | bearer | — | none | — | Admin only. Detaches projects, does not delete them. |

### 4. Projects (8)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List Projects | GET | `/api/v1/projects` | bearer | page=1, per_page=15, search=Alpha (disabled), status=In Progress (disabled), priority=Critical (disabled), sort=newest | none | — | Admin sees all; PM/Member see created, direct-member, or team-assigned projects. `sort` is not documented in the description. |
| 2 | Create Project | POST | `/api/v1/projects` | bearer | — | raw JSON: name: string, description: string, start_date: date string, deadline: date string, priority: string, status: string, teams: array of int, members: array of {user_id: int, role: string} | — | Admin + PM. `teams` and `members` are in the body but not in the description. Desc mentions "budget metadata" with no budget field. |
| 3 | Get Project Overview | GET | `/api/v1/projects/1/overview` | bearer | — | none | — | Progress %, task status breakdown, velocity, meeting counts, file stats. |
| 4 | Get Project Teams & Task Progress (Figma Screen) | GET | `/api/v1/projects/1/teams` | bearer | — | none | — | Teams, leaders, per-team ratio as string "completed/total" (e.g. "12/20"). |
| 5 | Update Project | PUT | `/api/v1/projects/1` | bearer | — | raw JSON: name: string, priority: string, status: string | — | Progress auto-recalculated from tasks. |
| 6 | Assign Teams to Project | POST | `/api/v1/projects/1/teams` | bearer | — | raw JSON: team_ids: array of int | — | Same path as #4 with POST. |
| 7 | Remove Team from Project | DELETE | `/api/v1/projects/1/teams/2` | bearer | — | none | — | |
| 8 | Delete Project | DELETE | `/api/v1/projects/1` | bearer | — | none | — | Admin + Project Creator. "Soft/Hard delete ... along with its cascade hierarchy (tasks, meetings, messages, attachments)". |

### 5. Tasks & Kanban Board (8)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List Tasks (with filters) | GET | `/api/v1/tasks` | bearer | project_id=1, status=Pending, per_page=15 | none | — | Desc also lists priority, assigned_to, due_date, overdue (1/0). No `page` param shown. |
| 2 | Get Kanban Board for Project | GET | `/api/v1/projects/1/tasks/kanban` | bearer | — | none | — | Columns: pending, in_progress, in_review, completed. |
| 3 | Create Task | POST | `/api/v1/tasks` | bearer | — | raw JSON: name: string, description: string, project_id: int, team_id: int, assigned_to: int, priority: string, status: string, due_date: date string | — | `team_id` is in the body but not in the description. Status default Pending. |
| 4 | Get Task Details | GET | `/api/v1/tasks/1` | bearer | — | none | — | Desc: assigned user, project metadata, subtasks, attached files. |
| 5 | Update Task | PUT | `/api/v1/tasks/1` | bearer | — | raw JSON: name: string, priority: string, status: string | — | |
| 6 | Update Task Status (Kanban Drag & Drop) | PATCH | `/api/v1/tasks/1/status` | bearer | — | raw JSON: status: string | — | Values Pending / In Progress / In Review / Completed. Records completion timestamp; updates project progress. |
| 7 | Assign Task | PATCH | `/api/v1/tasks/1/assign` | bearer | — | raw JSON: assigned_to: int, team_id: int | — | Triggers in-app notification. `team_id` undocumented. |
| 8 | Delete Task | DELETE | `/api/v1/tasks/1` | bearer | — | none | — | Recalculates project progress. |

### 6. Meetings & AI Summaries (10)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List Meetings (with filters) | GET | `/api/v1/meetings` | bearer | project_id=1, time_filter=upcoming, per_page=15 | none | — | time_filter: upcoming / past / today. |
| 2 | Schedule Meeting | POST | `/api/v1/meetings` | bearer | — | raw JSON: title: string, description: string, meeting_date: date string, start_time: time string, end_time: time string, meeting_link: url string, project_id: int, participants: array of int | — | Desc names the attendee field `attendee_ids`; body uses `participants`. |
| 3 | Get Meeting Details | GET | `/api/v1/meetings/1` | bearer | — | none | — | Attendees, attendance status, attached AI summary. |
| 4 | Update Meeting / Reschedule | PUT | `/api/v1/meetings/1` | bearer | — | raw JSON: title: string, meeting_date: date string, start_time: time string, end_time: time string, meeting_link: url string | — | |
| 5 | Mark Attendance | PATCH | `/api/v1/meetings/1/attendance` | bearer | — | raw JSON: attendance: array of {user_id: int, attended: boolean} | — | Desc says fields `user_id` + `status` ('attended','absent','excused'); body uses boolean `attended` inside `attendance`. |
| 6 | Generate AI Meeting Summary | POST | `/api/v1/meetings/1/summary/generate` | bearer | — | raw JSON: transcript: string | — | AI. Desc names the field `notes`. Google Gemini 1.5 Flash, local NLP fallback. |
| 7 | Get Meeting Summary | GET | `/api/v1/meetings/1/summary` | bearer | — | none | — | |
| 8 | Update Meeting Summary Manually | PUT | `/api/v1/meetings/1/summary` | bearer | — | raw JSON: summary: string, decisions_made: array of string | — | "Allows project managers" to edit/approve summary, decisions, action items. |
| 9 | Convert Summary Action Items to Kanban Tasks | POST | `/api/v1/meetings/1/summary/create-tasks` | bearer | — | raw JSON: default_priority: string, default_due_date: date string | — | Bulk-creates tasks in the meeting's project. |
| 10 | Delete Meeting | DELETE | `/api/v1/meetings/1` | bearer | — | none | — | |

### 7. File Management (6)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List Files (with filters) | GET | `/api/v1/files` | bearer | project_id=1, per_page=15 | none | — | Desc also lists task_id, search. |
| 2 | Upload File to Project | POST | `/api/v1/files` | bearer | — | multipart: file: file, project_id: text, name: text | — | Max 20 MB. |
| 3 | Upload File to Task | POST | `/api/v1/files` | bearer | — | multipart: file: file, task_id: text | — | Same route as #2. No size limit stated. |
| 4 | Get File Details | GET | `/api/v1/files/1` | bearer | — | none | — | Human-readable size ("1.5 MB"), MIME type, uploader profile. |
| 5 | Download File | GET | `/api/v1/files/1/download` | bearer | — | none | — | Authenticated binary stream. Only request with no `Accept` header. |
| 6 | Delete File | DELETE | `/api/v1/files/1` | bearer | — | none | — | Permanent delete from storage and DB. |

### 8. Real-Time Project Chat (7)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List Project Messages | GET | `/api/v1/projects/1/messages` | bearer | per_page=20 | none | — | Paginated, threaded (parent/child), attachments, sender profiles. |
| 2 | Send Message (with Mentions & Attachment) | POST | `/api/v1/projects/1/messages` | bearer | — | raw JSON: message: string, parent_id: null, file_attachment_id: null, mentions: array of int | — | Broadcasts via Laravel Reverb on `private-projects.{id}`; notifies mentioned users. |
| 3 | Send Thread Reply | POST | `/api/v1/projects/1/messages` | bearer | — | raw JSON: message: string, parent_id: int | — | Same route as #2. |
| 4 | Edit Message | PATCH | `/api/v1/messages/1` | bearer | — | raw JSON: message: string | — | Sets `is_edited = true`. Author or Administrator only. Not nested under project. |
| 5 | Delete Message | DELETE | `/api/v1/messages/1` | bearer | — | none | — | Who may delete is not stated. |
| 6 | Mark All Messages as Read | POST | `/api/v1/projects/1/messages/mark-read` | bearer | — | none | — | Per user, per project. |
| 7 | Get Unread Messages Count | GET | `/api/v1/projects/1/messages/unread-count` | bearer | — | none | — | Badge counter. |

### 9. Notifications (6)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List User Notifications | GET | `/api/v1/notifications` | bearer | per_page=15 | none | — | Task assignments, mentions, meeting invites. |
| 2 | List Unread Notifications | GET | `/api/v1/notifications` | bearer | status=unread | none | — | Same route as #1. |
| 3 | Get Unread Notifications Count | GET | `/api/v1/notifications/unread-count` | bearer | — | none | — | Indicator dot. |
| 4 | Mark Notification as Read | PATCH | `/api/v1/notifications/{{notification_id}}/read` | bearer | — | none | — | ID is a UUID per description. |
| 5 | Mark All Notifications as Read | POST | `/api/v1/notifications/mark-all-read` | bearer | — | none | — | |
| 6 | Delete Notification | DELETE | `/api/v1/notifications/{{notification_id}}` | bearer | — | none | — | |

### 10. Dashboard & AI Assistant (4)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Get Dashboard Overview | GET | `/api/v1/dashboard` | bearer | — | none | — | Stats, yearly timeline graphs, active projects with task ratios, recent tasks, teams, upcoming meetings, files, activity logs. |
| 2 | Ask AI Assistant (General Workspace Q&A) | POST | `/api/v1/ai/ask` | bearer | — | raw JSON: query: string | — | AI. Desc names the field `prompt` (required) plus optional `project_id`. |
| 3 | Ask AI Assistant (Project-Scoped) | POST | `/api/v1/ai/ask` | bearer | — | raw JSON: query: string, project_id: int | — | Same route. |
| 4 | Ask AI Assistant (Overdue Tasks Audit) | POST | `/api/v1/ai/ask` | bearer | — | raw JSON: query: string | — | Same route. |

### 11. Reports Module (5)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Project Reports | GET | `/api/v1/reports/projects` | bearer | — | none | — | Completion rates, budget/deadline health, average velocity. |
| 2 | Task Reports & Productivity | GET | `/api/v1/reports/tasks` | bearer | — | none | — | Completion stats, overdue ratios, priority distribution. |
| 3 | Team Performance Reports | GET | `/api/v1/reports/teams` | bearer | — | none | — | Tasks per team, member velocity, active commitments. |
| 4 | Personal Productivity Report | GET | `/api/v1/reports/users` | bearer | — | none | — | Score 0–100% for current user. |
| 5 | Member Productivity Report (Admin/PM) | GET | `/api/v1/reports/users/1` | bearer | — | none | — | Admins and PMs. |

### 12. User Management (Admin) (5)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | List Users | GET | `/api/v1/users` | bearer | per_page=15 | none | — | Admin only. Role names, active status, experience. |
| 2 | Create User (Admin Only) | POST | `/api/v1/users` | bearer | — | raw JSON: name: string, email: string, password: string, role: string, job_title: string, years_of_experience: int, status: string | — | Admin only. Email/password REDACTED. |
| 3 | Show User Details | GET | `/api/v1/users/1` | bearer | — | none | — | Projects, tasks, audit logs. Access not stated in the description (folder says Admin). |
| 4 | Update User (Admin Only) | PUT | `/api/v1/users/1` | bearer | — | raw JSON: role: string, status: string, job_title: string | — | Admin only. status active/inactive. |
| 5 | Delete User (Admin Only) | DELETE | `/api/v1/users/2` | bearer | — | none | — | Admin only. "Soft/Hard delete". |

### 13. System Administration & Compliance (3)

| # | Name | Method | Path | Auth | Query | Body type + top-level fields | Examples | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Get AI Configuration Settings | GET | `/api/v1/ai/settings` | bearer | — | none | — | Provider (Gemini / Fallback), model, temperature, enabled capabilities. Access not stated. |
| 2 | Update AI Settings (Admin Only) | PUT | `/api/v1/ai/settings` | bearer | — | raw JSON: settings: array of {key: string, value: string} | — | Admin only. Keys shown: ai_provider, ai_model, ai_temperature (0.0–1.0, sent as string). |
| 3 | List Audit Logs (Admin/PM) | GET | `/api/v1/audit-logs` | bearer | per_page=20 | none | — | Logins, entity mutations, permission modifications, IP addresses. Role only in the request name. |

### Count check

| Folder | Requests |
|---|---|
| 1. Authentication | 10 |
| 2. Profile | 6 |
| 3. Teams | 8 |
| 4. Projects | 8 |
| 5. Tasks & Kanban Board | 8 |
| 6. Meetings & AI Summaries | 10 |
| 7. File Management | 6 |
| 8. Real-Time Project Chat | 7 |
| 9. Notifications | 6 |
| 10. Dashboard & AI Assistant | 4 |
| 11. Reports Module | 5 |
| 12. User Management (Admin) | 5 |
| 13. System Administration & Compliance | 3 |
| **Total** | **86** |

Distinct method+path routes: 79. The 7 extra requests reuse a route with a different body or query: login ×3, `POST /files` ×2, `POST /projects/{id}/messages` ×2, `GET /notifications` ×2, `POST /ai/ask` ×3.

---

## 3. Per-folder notes

**1. Authentication.** Email/password registration and login return a Sanctum Bearer token (stored from `data.token` by the test scripts). Register assigns the default system role "Team Member". Login accepts an optional `remember` flag that extends token lifespan. Password reset is a 3-step OTP flow: forgot-password emails a 6-digit code valid for 10 minutes and single-use; resend is blocked for 60 seconds per email; a new code invalidates the old one; inactive accounts get no code; verify-reset-otp checks without consuming and locks after 5 wrong attempts; reset-password revokes all tokens. The three reset endpoints share a rate limit of 10 requests/minute per IP. Social sign-in lists google, facebook and linkedin, but only Google requests exist. The redirect endpoint may return a 302 or JSON; the callback is a POST that takes a provider `token` and is labelled "Mock/Token". Logout revokes the current token. There is no refresh-token endpoint and no email-verification endpoint.

**2. Profile.** `/auth/me` returns the current user with roles, projects (with role pivots) and teams. Profile update is multipart POST with an optional avatar (jpg/jpeg/png/webp, 2 MB, 4000x4000 px) and the fields name, job_title, years_of_experience, phone. The response includes a full public `avatar_url`. Avatar removal sets `avatar_url` to null. Change password requires the current password. "My tasks" and "my files" lists exist under `/auth/profile/`. No pagination or filter params are shown on them.

**3. Teams.** Teams have a name, a description, and members with a per-team `role_in_team`. The 19 allowed `role_in_team` values come from `GET /team-roles`; two of them (`Team Lead`, `Tech Lead`) are leaders, and the default is `Member`. Team roles are separate from the system roles. Creating a team (Admin + PM) adds the creator as Team Lead. Assigning members is an upsert. Updating a team is allowed for Admins and Team Leads; deleting is Admin only and detaches projects. List supports `page`, `per_page`, `search`.

**4. Projects.** Projects have name, description, start_date, deadline (>= start_date), priority (Low/Medium/High/Critical), status (Planning/In Progress/On Hold/Completed) and a computed progress percentage. Visibility: Admin sees all; others see projects they created, are direct members of, or reach through a team. Projects link to teams (many-to-many) and, per the create body, to direct members with a free-text `role`. There is an analytics "overview" endpoint and a Figma-specific teams+progress endpoint. Delete cascades to tasks, meetings, messages and attachments (Admin + creator). List supports `page`, `per_page`, `search`, `status`, `priority`, `sort` (only value seen: `newest`).

**5. Tasks & Kanban Board.** Tasks belong to a project and optionally to a team and an assignee. They carry priority (Low/Medium/High/Critical), status (Pending/In Progress/In Review/Completed) and due_date. The Kanban endpoint groups tasks into `pending`, `in_progress`, `in_review`, `completed`. A dedicated PATCH status endpoint serves drag-and-drop, records completion time and recalculates project progress. Assignment sends an in-app notification. List filters: project_id, status, priority, assigned_to, due_date, overdue, per_page. The task details description mentions subtasks, but no subtask fields or endpoints exist. The Team Member login description says members can update task status.

**6. Meetings & AI Summaries.** Meetings belong to a project and have a title, a date, start/end times (HH:MM:SS, end after start), an external link (Google Meet / Zoom URL) and participants. The API does not host video; it stores a link. Attendance is marked per user. **AI:** `summary/generate` takes a transcript or notes text (the field name is inconsistent) and returns a structured summary, key decisions and action items, using "Google Gemini 1.5 Flash" with "local dynamic NLP fallback". The summary can be read, edited by hand (summary, decisions_made; the description also mentions action items) and converted into Kanban tasks with a default priority and due date. Per the PM login description, scheduling meetings and generating AI summaries are PM workflows. List filters: project_id, time_filter (upcoming/past/today), per_page.

**7. File Management.** Files are uploaded with multipart `POST /files` to either a project (`project_id`, optional `name`, max 20 MB) or a task (`task_id`). Details include human-readable size, MIME type and uploader. Download is an authenticated binary stream, so the browser must send the Bearer header (a plain link will not carry it). Delete is permanent. List filters: project_id, task_id, search, per_page.

**8. Real-Time Project Chat.** Each project has one message stream with threads (`parent_id`), @mentions (array of user IDs), and an optional attachment that references an already-uploaded file (`file_attachment_id`). **Real-time:** Send Message "instantly broadcasts via WebSockets (`Laravel Reverb`) to `private-projects.{id}` channel". No broadcasting-auth endpoint, Reverb host/port/app key, event names or payload shape appear in the collection. Edit sets `is_edited`; only the author or an Administrator may edit. Per-user read state exists (mark-read, unread-count). Pagination param: per_page.

**9. Notifications.** In-app notifications (task assignments, mentions, meeting invites) with UUID IDs (per the description; the path uses `{{notification_id}}`). The list supports `per_page` and `status=unread`. There are endpoints for unread count, mark one read, mark all read, and delete. No real-time channel for notifications is documented; the only signal is the count endpoint.

**10. Dashboard & AI Assistant.** One aggregated dashboard endpoint described as matching the Figma UI. **AI:** `POST /ai/ask` takes a natural-language question (`query` in every body; the description says `prompt`) and an optional `project_id`. It answers workspace questions about progress, deadlines and overdue tasks. The response shape is not documented at all.

**11. Reports Module.** Five read-only aggregate reports: projects, tasks, teams, personal (current user), and a single member (`/reports/users/{id}`, Admin/PM). No date-range or filter params are shown.

**12. User Management (Admin).** Admin-only user CRUD. Users have a system `role` (string, e.g. "Team Member", "Project Manager"), `status` (active/inactive), job_title and years_of_experience. List supports per_page. User details include projects, tasks and audit logs. Delete is described as "Soft/Hard".

**13. System Administration & Compliance.** **AI:** global AI settings are key/value pairs (ai_provider, ai_model, ai_temperature). Reading has no stated restriction; updating is Admin only. Audit logs (the request name says Admin/PM) record logins, entity mutations, permission changes and IPs. Pagination param: per_page. No filters are shown.

---

## 4. Response shapes actually present

Only 7 saved examples exist, on 5 endpoints. Every example uses `Content-Type: application/json`.

**Envelope seen:** success → `{ success: boolean, message: string, data: object | null }`; validation error → `{ success: false, message: string, errors: { <field>: string[] } }`. The key is `success`, not `status`. No pagination wrapper (`meta`, `links`, `last_page`) appears in any example.

| Folder / Request | Example | Envelope | `data` key fields |
|---|---|---|---|
| 1 / Forgot Password | 200 | `{success, message, data}` | `expires_in_minutes`: number |
| 1 / Verify Reset OTP | 200 | `{success, message, data}` | `data` is `null` |
| 1 / Verify Reset OTP | 422 | `{success, message, errors}` | `errors.otp`: string[] |
| 1 / Reset Password | 200 | `{success, message, data}` | `data` is `null` |
| 1 / Reset Password | 422 | `{success, message, errors}` | `errors.otp`: string[] |
| 3 / List Team Roles | 200 | `{success, message, data}` | `roles`: array of `{value: string, is_leader: boolean}` (19 items); `default`: string |
| 3 / Create Team | 422 | `{success, message, errors}` | `errors["members.0.role_in_team"]`: string[] |

**Script-derived (not an example):** Register (201) and Login (200) responses contain `data.token` (string), according to the test scripts.

**Description-derived (not an example), for orientation only:** `/auth/me` "user object, roles array, assigned projects with role pivots, and team roster"; profile update returns the user with `avatar_url`; Kanban returns columns `pending`, `in_progress`, `in_review`, `completed`; messages carry `is_edited`; project teams ratio is a string like "12/20".

All other 81 requests: **UNKNOWN (no example).** That covers every request in folders 2, 4, 5, 6, 7, 8, 9, 10, 11, 12 and 13, Teams #2 and #4–#8, and Authentication #1–#4 and #8–#10.

---

## 5. Validation errors and status codes seen

| Status | Where | Evidence |
|---|---|---|
| 200 | Forgot Password, Verify Reset OTP, Reset Password, List Team Roles | saved examples |
| 201 | Register | test script condition and description |
| 302 | Social Auth Redirect | description only ("HTTP 302 Redirect ... or JSON") |
| 422 | Verify Reset OTP, Reset Password | saved examples, key `errors.otp` |
| 422 | Create Team | saved example, key `errors["members.0.role_in_team"]` (Laravel dot-notation for array items) |
| 422 | Reset Password `errors.password`; Update Profile bad image; Assign Members invalid role | descriptions only |

Validation rules stated in descriptions: email unique on register; password min 8 with confirmation; OTP exactly 6 digits; team name max 255 and description max 1000; `user_id` exists:users,id; project deadline after_or_equal:start_date; meeting end_time after:start_time; meeting_link url; avatar type/size/dimensions; project file max 20 MB; years_of_experience min 0.

No examples or descriptions show 401, 403, 404, 429 or 500. The reset endpoints are rate limited, so 429 is likely but not shown.

---

## 6. Resource relationship map

| From | To | Cardinality | Evidence |
|---|---|---|---|
| User | System role | each user has a role (`role` string); `/auth/me` returns a "roles array" | verified (Create User / Update User body); roles array from Get Profile description |
| Team | User (team member, with `role_in_team`) | many-to-many | verified (Create Team body `members[].user_id`, Assign Members, `DELETE /teams/{team}/members/{user}`) |
| Team role values | Team member pivot | lookup | verified (List Team Roles example) |
| Project | Team | many-to-many | verified (Create Project `teams`, Assign Teams `team_ids`, `DELETE /projects/{p}/teams/{t}`) |
| Project | User (direct member, with `role`) | many-to-many | verified body (Create Project `members[].user_id`); visibility rule in List Projects description |
| Project | User (creator) | many-to-one | inferred (Delete Project "Project Creator", List Projects "projects they created") |
| Task | Project | many-to-one | verified (Create Task `project_id`, `GET /projects/{id}/tasks/kanban`, List Tasks `project_id`) |
| Task | User (assignee) | many-to-one | verified (Create Task / Assign Task `assigned_to`) |
| Task | Team | many-to-one | verified body (Create Task / Assign Task `team_id`), undocumented |
| Task | Task (subtasks) | one-to-many | inferred (Get Task Details description only) |
| Meeting | Project | many-to-one | verified (Schedule Meeting `project_id`, List Meetings filter) |
| Meeting | User (participant/attendee) | many-to-many with attendance | verified (Schedule `participants`, Mark Attendance `attendance[].user_id`) |
| Meeting | Summary | one-to-one | verified (`/meetings/{id}/summary`) |
| Summary action items | Task | one-to-many (creates tasks in the meeting's project) | verified path (`/meetings/{id}/summary/create-tasks`); project target from description |
| File | Project | many-to-one | verified (Upload to Project `project_id`, List Files filter) |
| File | Task | many-to-one | verified (Upload to Task `task_id`) |
| File | User (uploader) | many-to-one | inferred (File Details "uploader profile", Get User Files) |
| Chat message | Project | many-to-one | verified (`/projects/{id}/messages`) |
| Chat message | Chat message (parent thread) | many-to-one | verified (`parent_id` in Send Thread Reply) |
| Chat message | File | many-to-one | verified body (`file_attachment_id`) |
| Chat message | User (mentions) | many-to-many | verified body (`mentions`) |
| Chat message | User (sender) | many-to-one | inferred (List Messages "sender profiles", Edit "message author") |
| Chat message | User (read state) | per user | inferred (mark-read, unread-count) |
| Notification | User (recipient) | many-to-one | inferred (current-user list endpoints) |
| Notification | Task / Message / Meeting (source) | — | inferred (descriptions: task assignment, mentions, meeting invites) |
| Report | User | `/reports/users/{id}` | verified (path) |
| Report | Projects / Tasks / Teams | aggregate | inferred (descriptions) |
| AI ask | Project | optional scope | verified body (`project_id` in Project-Scoped ask) |
| Audit log | User | many-to-one | inferred (description: user logins; Show User includes audit logs) |
| AI setting | — | global key/value | verified body (Update AI Settings) |

---

## 7. Roles and permissions evidence

### System roles

| Role string | Where it appears |
|---|---|
| `Administrator` | List Team Roles description ("system permission role (`Administrator` / `Project Manager` / `Team Member`)"); Edit Message ("message author or Administrator"); Delete Team, Update Team, Create Team, Create Project, Delete Project, List Users, Create/Update/Delete User, Update AI Settings ("Administrators ...") |
| `Project Manager` | List Team Roles description; Update User body (`"role": "Project Manager"`); Create Team / Create Project access ("Administrators and Project Managers"); Login (Project Manager) name and description; Update Meeting Summary ("project managers") |
| `Team Member` | List Team Roles description; Register description (default role); Create User body (`"role": "Team Member"`); Login (Team Member) name and description |
| `Admin` (abbreviation) | Request names: Login (Admin), Member Productivity Report (Admin/PM), List Audit Logs (Admin/PM), "(Admin Only)" user/AI requests; folder name "User Management (Admin)"; List Projects ("Admins view all projects") |
| `PM` (abbreviation) | Member Productivity Report (Admin/PM), List Audit Logs (Admin/PM), List Projects ("PMs and Members") |

### Contextual roles (ownership, membership)

| Term | Where |
|---|---|
| Team Leads | Update Team access ("Administrators and Team Leads") |
| Project Creator | Delete Project access |
| message author | Edit Message |
| "Members" (project/team members) | List Projects visibility |
| Authenticated Users | List Team Roles, List Teams |
| Public | Register, Login ×3, Forgot/Verify/Reset Password, Social Callback |

### Team roles (`role_in_team`, from List Team Roles example and Create Team description)

`Team Lead` (leader), `Tech Lead` (leader), `Product Owner`, `Scrum Master`, `Backend Developer`, `Frontend Developer`, `Mobile Developer`, `Full-Stack Developer`, `UI/UX Designer`, `QA Engineer`, `DevOps Engineer`, `Data Engineer`, `AI/ML Engineer`, `Security Engineer`, `Business Analyst`, `Support Engineer`, `Mentor`, `Intern`, `Member` (default).

### Other role-like strings

- Project member `role`: `"Technical Lead"` in the Create Project body. It is not in the team roles list, and no vocabulary is documented.
- `"Full Stack Developer"` and `"Staff Solutions Engineer"` appear as `job_title` values, not roles.
- User `status`: `active` / `inactive`.

### Permission strings

No named permission strings (such as `projects.create`) appear anywhere. The only middleware reference is `auth:sanctum` (Logout description). "permission modifications" appears in the Audit Logs description, and "system permission role" in the Team Roles description. The API does not expose a permissions list or a current-user abilities endpoint, apart from the roles array described for `/auth/me`.

---

## 8. Gaps

### Missing response examples

81 of 86 requests have no saved response. That includes login/register, `/auth/me`, every list endpoint (so the pagination shape is unknown), every create/update, Kanban, dashboard, reports, AI ask, AI summary, chat, notifications and file download. The token location `data.token` is known only from scripts.

### Missing configuration

- `base_url`, `token` and `notification_id` are not defined in the collection, and no environment file is in the repo.
- Reverb connection details are absent: host, port, app key, and the broadcasting auth endpoint needed for `private-` channels. Event names and payloads are also absent.

### Field-name inconsistencies between example body and description

| Request | Body uses | Description uses |
|---|---|---|
| Change Password | `password`, `password_confirmation` | `new_password`, `new_password_confirmation` |
| Schedule Meeting | `participants` | `attendee_ids` |
| Mark Attendance | `attendance[].attended` (boolean) | `user_id` + `status` ('attended','absent','excused') |
| Generate AI Meeting Summary | `transcript` | `notes` |
| Ask AI Assistant | `query` | `prompt` |
| Create Project | `teams`, `members[{user_id, role}]` | not documented; description mentions "budget metadata" with no field |
| Create Task / Assign Task | `team_id` | not documented |
| Verify / Reset OTP | 4-digit sample OTP in the request body | "exactly 6 digits" (the saved examples' original requests use 6 digits) |
| Login (Team Member) | one email/password pair | a different email/password pair in the description |

### Other inconsistencies and ambiguity

- Update Profile with Avatar says "same rules as Update Profile", but no separate JSON Update Profile request exists.
- Vocabularies are inconsistent. Task statuses are title-case ("In Progress") in bodies and filters, but Kanban columns are snake_case (`in_progress`). Project status has "Planning"/"On Hold", while task status has "Pending"/"In Review".
- IDs are hard-coded (`/teams/1`, `/users/2`) instead of variables. Notifications alone use a variable, and the description says that ID is a UUID while other IDs are integers.
- Messages are created under `/projects/{id}/messages` but edited and deleted at `/messages/{id}`.
- Social auth: only Google requests exist, though 3 providers are listed. The redirect returns either a 302 or JSON. The callback is labelled "Mock" and takes a provider `token`, so the SPA OAuth flow is unclear.
- Several descriptions don't state who has access: Show User, Get AI Settings, Audit Logs (role only in the name), Delete Message, Delete Meeting, Update/Delete Task, and all Files and Notifications endpoints.
- "Soft/Hard delete" on Project and User does not say which one happens.
- Logout description references the empty collection variable `{{bearer_token_0b1z}}`, which looks like an export artifact.

### Missing operations a UI may need

- Token refresh, and email verification.
- A list of system roles for the admin create-user form.
- Project member add/remove/list outside project creation.
- Subtask CRUD (subtasks are mentioned only in Task Details).
- File rename/update, and a single-message GET.
- Notification real-time delivery.
- Filter/sort params on reports, audit logs, users list and profile tasks/files.
- Search/sort on most lists beyond the few shown.
- A documented page/total shape for pagination.

### Destructive or high-impact operations

- `DELETE /projects/{id}` cascades to tasks, meetings, messages and attachments.
- `DELETE /users/{id}` (soft/hard unclear).
- `DELETE /teams/{id}` detaches projects.
- `DELETE /files/{id}` is permanent.
- `DELETE /tasks/{id}` and `DELETE /meetings/{id}`.
- `DELETE /messages/{id}` and `DELETE /notifications/{id}`.
- `DELETE /teams/{id}/members/{user}` and `DELETE /projects/{id}/teams/{team}`.
- `DELETE /auth/profile/avatar` deletes the stored file, and avatar upload deletes the old file.
- `POST /auth/reset-password` revokes all of the user's tokens.
- `PUT /ai/settings` changes global AI behaviour.
- `POST /meetings/{id}/summary/create-tasks` bulk-creates tasks; whether repeating it duplicates tasks is unknown.
- `POST /notifications/mark-all-read` and `POST /projects/{id}/messages/mark-read` are bulk state changes.

---

## 9. Credentials

Example credentials **do appear** in the collection. Every value is written here as REDACTED.

| Kind | Requests |
|---|---|
| Email + password (request body) | Register; Login (Admin); Login (Project Manager); Login (Team Member); Create User (Admin Only) |
| Email + password (description text) | Login (Admin); Login (Project Manager); Login (Team Member) |
| Personal-looking email address (not a demo domain) | Login (Team Member) body; Forgot Password body; Verify Reset OTP body; Reset Password body |
| OTP codes | Verify Reset OTP and Reset Password, in the request body and in the saved examples' original requests |
| New/changed passwords | Reset Password body and saved examples' original requests; Change Password body (current and new) |
| Demo email in saved examples | Original-request bodies of the Forgot Password, Verify Reset OTP and Reset Password examples |
| OAuth token placeholder | Social Auth Callback body (`token`: REDACTED; looks like a placeholder) |
| Phone number | Update Profile with Avatar form-data (`phone`: REDACTED) |
| Bearer tokens | None stored. Requests reference `{{token}}`. Collection variable `bearer_token_0b1z` is empty. |
| API keys (e.g. Gemini) | None present |

Several requests share one example password, and the admin account's password is printed in plain text in its description. Treat these as seed/demo accounts of the external API. They should not be copied into app code, tests or docs.
