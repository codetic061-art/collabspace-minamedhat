# Screen-to-feature map

This file maps every Figma screen to its application feature, API endpoints, user roles and expected interactions. It joins the confirmed design (`figma.md`) to the confirmed API contract and the user's decisions.

**Sources and evidence labels:**

| Label | Source |
|---|---|
| **verified** | Seen in a live authenticated response (`api-authenticated-shapes.md`, Administrator and Project Manager only). |
| **spec** | The backend's OpenAPI spec (`openapi-vs-postman.md`). |
| **postman** | The Postman collection (`api-inventory.md`). |
| **gap** | The design needs something the API doesn't document. Each gap is listed in `figma.md` §10. |
| **decision** | Settled by the user: D1 (MVP scope) or D2 (role permissions) in `decisions.md`. |

All paths are under `https://collabspace.huma-volve.com/api/v1`. Every request sends `Accept: application/json` and, once signed in, `Authorization: Bearer <token>`.

**Role abbreviations:** Admin = Administrator, PM = Project Manager, TM = Team Member. TM behaviour is unverified, because the TM demo credentials conflict and weren't tried.

---

## Tier 1 screens (D1: must work end to end against the real API)

### Sign in: `1:10523`

| Aspect | Mapping |
|---|---|
| Feature | Authentication |
| API | `POST /auth/login` with `{email, password, remember}`. The response gives `data.user`, `data.token` and `token_type: "Bearer"` (verified). After that, `GET /auth/me` (verified). |
| Roles | Public |
| Interactions | Submit credentials. "Remember Me" maps to `remember` (postman: "extends token lifespan"). "Forget Password?" starts recovery. "Sign Up" goes to Sign up. |
| Not wired | "Sign With Google" and the "English" language select. Google sign-in is out of scope (D1). |
| States needed (not in Figma) | Pending submit, field errors from a 422 response (`errors.{field}[]`), invalid credentials, network error |

### Sign up: `1:10573`

| Aspect | Mapping |
|---|---|
| Feature | Registration |
| API | `POST /auth/register` with `{name, email, password, password_confirmation}`. It returns 201 with the user and a token. New accounts get the "Team Member" role (postman). |
| Roles | Public |
| Interactions | Submit, then sign in automatically. "Sign In" goes to Sign in. |
| **gap → derived** | The design has no confirm-password field, but the API requires one. Added as `Derived — Not in Figma` (`figma.md` §12.5). "Remember Me" and the Google button are removed (M1, M2). |

### Password recovery: no Figma screens

| Aspect | Mapping |
|---|---|
| Feature | Password recovery (Tier 1, D1) |
| API | 1. `POST /auth/forgot-password` with `{email}`. The response is the same whether or not the email exists.<br>2. `POST /auth/verify-reset-otp` with `{email, otp}`. Optional; it checks the code without using it up, and locks after 5 wrong attempts.<br>3. `POST /auth/reset-password` with `{email, otp, password, password_confirmation}`. This revokes all of the user's tokens. (postman, with saved examples) |
| **gap → derived** | No Figma designs exist. They are specified as `Derived — Not in Figma` in `figma.md` §12.2–§12.4: 10-minute code expiry, 60-second resend cooldown, lockout after 5 attempts, and 422/429 handling. |

### App shell and navbar: `1:11556` variants

| Aspect | Mapping |
|---|---|
| Feature | Role-aware application shell |
| API | `GET /auth/me` returns `user.name`, `user.job_title`, `user.avatar_url` and `user.roles[]` (verified). `GET /notifications/unread-count` feeds the bell dot (spec; Tier 2 polling). |
| Roles | Every signed-in user. Nav items follow D2. Chats and Reports are hidden in the MVP (D7, M30). |
| Interactions | Nav switches the section, and the active item uses the matching variant. The search opens the search overlay and the bell opens the notifications overlay. Both are Tier 2 and hidden until they ship (D7, M32). The user block opens the user menu (`Derived — Not in Figma`, `figma.md` §12.9: Profile, Edit Profile, Sign out). Sign out calls `POST /auth/logout` (verified) and then always clears the session locally. |
| Data note | The design's role line ("UI/UX") shows a discipline, not the system role. `job_title` is the closest field. |

### Dashboard: `1:7697` (final layer `1:8065`)

`GET /dashboard` provides everything in one request (verified). The response has no `message` key.

| Card | Data source | Notes |
|---|---|---|
| Pending / In Progress / Completed stat cards | `overview.tasks.pending`, `.in_progress`, `.completed`, `.total`, plus the `*_percentage` fields | **gap:** the "+9% from last month" trend has no source field. |
| Completion Rate (gauge) | `overview.tasks.completion_rate` | **gap:** no trend field. |
| Project overview chart | `project_overview.data[]`: 12 months, each with `projects`, `created_tasks`, `completed_tasks` | Resolved by M16 and A4: the filters are hidden, and the chart plots the verified `created_tasks` and `completed_tasks` per month. |
| Active Projects | `active_projects.items[]`: `name`, `progress`, `tasks_total`, `tasks_completed` | 5 per page. The per-project colour isn't in the API, so the client has to assign one. |
| Recent Files | `recent_files.items[]`: `name`, `mime_type`, `file_size_formatted`, `download_url`, `uploaded_by.name`, `created_at` | `download_url` may need the bearer token; unknown. |
| Tasks | `tasks.items[]`: `name`, `priority`, `status`, `status_label`, `due_date` | Values here are lowercase snake_case (`in_progress`), unlike the rest of the API. **gap:** the task "%" has no source. |
| Teams | `teams.items[]`: `name`, `members_count`, `projects_count` | **gap:** per-member rows and the "12/14" ratio aren't in the dashboard payload. They are in `GET /projects/{id}/teams` (postman) or `GET /teams` members. |
| Up coming meetings | `upcoming_meetings.items[]`: `title`, `date`, `start_time`, `end_time`, `participants[]` | Tier 2 content inside a Tier 1 screen. |
| Ask AI | `POST /ai/ask` | Out of scope (D1). |

- **Roles:** Admin, PM and TM can all view (D2). The server scopes the numbers: Admin sees 29 projects and PM sees 16 (verified).
- **Gap resolutions:** M13 (trends), M14 (task %), M15 (teams card), M16 (chart filters), M20 (project colours), M31 (Ask AI card hidden), M33 (meetings and files read-only, "View All" hidden).
- **Interactions:** the "View All" links go to the matching list screens. A project item goes to Project details. A file item downloads.

### All Projects: `1:8545`

| Aspect | Mapping |
|---|---|
| Feature | Projects list |
| API | `GET /projects?page&per_page&search&status&priority&sort` (verified for `page`/`per_page`; the other params come from postman). Pagination is P1: `data.data[]`, `data.meta`, `data.links` (verified). Items have `name`, `start_date`, `deadline`, `status`, `priority`, `progress_percentage`, `files_count` and `teams[]` (verified). |
| Column mapping | Project Name → `name`. Start Date → `start_date`. Deadline → `deadline`. Status → `status`. Files → `files_count`. Teams → `teams[]`; list items have no avatars, so team name chips are shown (M19). Priority → `priority`. |
| Roles | View: all. "Add Project": Admin and PM only (D2). |
| Interactions | Search, the "All Projects" filter (its meaning is unclear), the "Newest" sort, a row opening Project details, and "Add Project" opening the New Project modal. |
| **gap → resolved** | Status labels use the API values (M4). The filter and sort are M25. Pagination, empty and error states are derived (`figma.md` §12.10). |

### New Project modal: `1:8650`

| Aspect | Mapping |
|---|---|
| Feature | Create project. **Edit project has no design.** |
| API | `POST /projects` with `{name*, description, start_date*, deadline*, priority, status, teams: int[], members: [{user_id, role}]}` (spec). Edit uses `PUT /projects/{id}`. `DELETE /projects/{id}` exists and cascades to tasks, meetings, messages and attachments (postman), but **project deletion is excluded from the MVP** (D9, M34). |
| Field mapping | Project Name → `name`. Priority → `priority`, but the design has no "Critical" option. Start Date → `start_date`. End Date → `deadline`. Add Guests → `members[].user_id`, with options from `/users` (D5). Add Project Files is hidden until Tier 2 files (M8). |
| Roles | Admin and PM (D2) |
| **gap → derived** | `description`, `status` and `teams` aren't in the design. They are added in create and edit mode (M8). Edit Project is `Derived — Not in Figma` (`figma.md` §12.6). |

### Project details: Overview `1:8753`

| Aspect | Mapping |
|---|---|
| API | `GET /projects/{id}/overview` (verified). It returns the project, `due_date_indicator`, `tasks_statistics`, `counts`, `teams[]`, `direct_members[]` and `chart.data[]`. |
| Mapping | Title → `name`. Completion badge and gauge → `progress_percentage`. Due Date card → `due_date_indicator.start_date`, `.deadline`, `.days_remaining`. Description → `description`. Project Progress stats → `tasks_statistics.pending`, `.in_progress`, `.completed`, `.total`. Project Details grid → Start Date, Deadline, Priority, Total Tasks. **gap:** "Project Type" has no source. Chart → `chart.data[]`. |
| Team Members | `direct_members[]` (with `role`), plus team members from `GET /projects/{id}/teams` → `members[]` with `name`, `avatar_url?`, `role_in_team` and `is_leader` (verified PM). `is_leader` drives the "Leader" tag. Overview `teams[]` has only `members_count`, no members. The team dropdown filters by team. |
| Roles | View: all. An edit entry point would be Admin and PM, but none is designed. |

### Project details: Tasks tab (Kanban) `1:8978` and Tasks page `1:10208`

| Aspect | Mapping |
|---|---|
| Feature | Tasks and Kanban (Tier 1) |
| API | `GET /projects/{id}/tasks/kanban` (verified). `columns` is keyed by `Pending`, `In Progress`, `In Review` and `Completed`; each column has `{name, count, tasks: TaskResource[]}`. All four keys always appear, and the board isn't paginated. |
| Status change | `PATCH /tasks/{id}/status` with `{status, hours_spent?}` (spec). Roles: Admin, PM and TM (D2). A 403 rolls the card back (D2). |
| Card mapping | Title → `name`. Priority badge → `priority`; "Critical" has no design. Description → `description`. Date → `due_date`. Avatar → `assignee`. **gap:** Progress %, the comment count, several avatars and the "Reviewer" label have no source. |
| Column labels | "To-do" = `Pending`, "In Progress", "In Review", "Completed Tasks" = `Completed`. |
| Tasks page toolbar | Project selector → which project's Kanban to load. "My Task" filter and search filter the loaded board on the client (M26). The project selector is required (M27). |
| Create | "Create Task +" and the column "Add Task +" open the Create Task modal. Admin and PM only (D2). |
| **gap → derived** | No drag-and-drop design. Task Details, Edit Task and the delete confirmation are `Derived — Not in Figma` (`figma.md` §12.7–§12.8). Status changes also work through a select, so drag-and-drop is an enhancement (§12.11). |

### Create Task modal: `1:10646`

| Aspect | Mapping |
|---|---|
| API | `POST /tasks` with `{name*, description, project_id*, team_id, assigned_to, priority, status, due_date, hours_spent}` (spec). Edit uses `PUT /tasks/{id}`. Delete uses `DELETE /tasks/{id}`. Assign uses `PATCH /tasks/{id}/assign` (postman). |
| Field mapping | Task Name → `name`. End Date → `due_date`. Add Guests → `assigned_to`, which allows only one person. Files → `POST /files` with `task_id` after creation. Project → taken from the current project; on the Tasks page it comes from the selected project. |
| Roles | Admin and PM (D2) |
| **gap → resolved** | Start Date has no API field, so it is removed (M10). Description, priority, status and project are added (M9). Assignee is single-select (M11). Final field set: `figma.md` §12.8. |

### Profile: Overview `1:11901` and Tasks `1:12020`

| Aspect | Mapping |
|---|---|
| API | `GET /auth/me` (verified) returns:<br>• `user`: name, `job_title`, `about`, `avatar_url`, `created_at` (joined date)<br>• `stats`: `completed_tasks`, `total_tasks`, `hours_worked`<br>• `recent_activities[]`: `description`, `created_at`<br><br>`GET /auth/profile/tasks` (verified) uses P2 pagination and returns raw task models. `GET /activities` (spec) is an alternative activity feed. |
| Mapping | Completed Tasks → `stats.completed_tasks`. Hours Worked → `stats.hours_worked`. About → `user.about`. Recent Activities → `recent_activities[]`. Tasks tab "To do" and "Done": To do = Pending, In Progress and In Review; Done = Completed (M22, A5). |
| Roles | The signed-in user's own profile |

### Profile settings: `1:11983`

| Aspect | Mapping |
|---|---|
| API | `POST /auth/profile` or `PUT /auth/profile`, multipart (spec). All fields are optional: `name`, `email`, `phone`, `available_status` (`available` / `busy` / `away` / `offline`), `job_title`, `years_of_experience` (0–60), `current_project_id`, `about`, `avatar`. Password changes use `PUT /auth/password` with `{current_password, password, password_confirmation}` (spec). `DELETE /auth/profile/avatar` removes the avatar (postman). |
| Mapping | Full Name → `name`. Email Address → `email`. Phone Number → `phone`; the API has no country-code field. Availability Status → `available_status`. Job Title → `job_title`. Years of Experience → `years_of_experience`. Current Team / Project → `current_project_id`. The avatar pencil → `avatar` upload. |
| Roles | The signed-in user |
| **gap → resolved** | An About textarea and a derived Security (change password) card are added (M23). The phone value is saved as one string (M24). |

---

## Derived Tier 1 screens (D3, `Derived — Not in Figma`)

The full visual and behaviour specs are in `figma.md` §12. This table holds the API mapping only.

| Derived screen or state | Spec | API | Roles |
|---|---|---|---|
| Forgot Password | §12.2 | `POST /auth/forgot-password` | Public |
| Verify Code (OTP) | §12.3 | `POST /auth/verify-reset-otp`; resend reuses `POST /auth/forgot-password` | Public |
| Reset Password | §12.4 | `POST /auth/reset-password` | Public |
| Sign up confirm-password field | §12.5 | `POST /auth/register` (`password_confirmation`) | Public |
| Edit Project modal | §12.6 | `GET /projects/{id}/overview` to pre-fill, `PUT /projects/{id}`, `GET /teams` for team options | Admin, PM (D2) |
| Task Details modal (`?taskId=`) | §12.7 | `GET /tasks/{id}`, `PATCH /tasks/{id}/status`, `PATCH /tasks/{id}/assign`, `DELETE /tasks/{id}` | View: all. Status: all. Edit, reassign, delete: Admin, PM (D2) |
| Edit Task (Create Task in edit mode) | §12.8 | `PUT /tasks/{id}` | Admin, PM (D2) |
| User menu and sign out | §12.9 | `GET /auth/me`, `POST /auth/logout` | All |
| Loading, empty, error, unauthorized (401), permission denied (403), not found (404), success toast | §12.10 | Error shapes from `api-probe.md` | All |
| Responsive rules | §12.11 | None | All |

---

## API/UI mismatch register

Each row is a place where an original Figma screen and the real API disagree. **The resolution follows D3: the API wins, and anything with no verified source is not displayed.** Status values:
- **Resolved:** the rule is fixed.
- **Open:** waiting on a user decision or a fact the probe hasn't established.

| ID | Figma (original) | API reality | Resolution | Status |
|---|---|---|---|---|
| M1 | "Sign With Google" and the "OR" divider on Sign in `1:10523` and Sign up `1:10573` | Google sign-in is out of scope (D1); the backend redirects to `127.0.0.1` | Hide both | Resolved |
| M2 | "Remember Me" on Sign up | `RegisterRequest` has no `remember` | Remove from Sign up. Keep it on Sign in, where it maps to `remember`. | Resolved |
| M3 | "English" language select on the auth screens (options English, Arabic, France) | No i18n or RTL requirement exists | Hide it. The MVP is English only and left-to-right only. Strings are organised per feature for later translation, with no i18n library. | Resolved (D8) |
| M4 | Project status text "active" and "Done" on All Projects `1:8545` | `Pending`, `In Progress`, `On Hold`, `Completed`, `Cancelled` (verified and spec) | Show the API value as coloured text, following the Figma pattern. Colours are derived from §9: Pending `#606C80`, In Progress `#005AFB`, On Hold `#FA9E00`, Completed `#2BA52E`, Cancelled `#DB302A`. | Resolved |
| M5 | Priority badges for High, Medium and Low only | Values are `Low`, `Medium`, `High`, `Critical` | Keep the Figma badges. Add **Critical** (derived): a solid `#DB302A` pill with white text. | Resolved |
| M6 | Kanban column titles "To-do" and "Completed Tasks" | Keys are `Pending`, `In Progress`, `In Review`, `Completed` | Title each column with its API value | Resolved |
| M7 | Kanban card "Progress %", comment count "8", "Reviewer" row and several avatars (`1:8978`, `1:10208`) | `TaskResource` has none of these: one `assignee`, `attachments_count`, no comments | Remove progress, comments, reviewer and the extra avatars. The footer keeps a single assignee avatar and `due_date`, plus a paperclip with `attachments_count` when it is above 0 (derived). | Resolved |
| M8 | New Project `1:8650`: Name, Priority, Guests, Start/End Date, Files | `StoreProjectRequest`: `name*`, `description`, `start_date*`, `deadline*`, `priority`, `status`, `teams[]`, `members[{user_id, role}]`. Update has **no `members`**. | Add Description, Status and Teams. Guests become `members` on create only. End Date becomes `deadline`. Hide the Files dropzone until Tier 2 files; after that, upload with `POST /files` and `project_id`. | Resolved |
| M9 | Create Task `1:10646` has no description, priority, status or project | `StoreTaskRequest` needs `project_id*` and accepts `description`, `priority`, `status` | Add them (`figma.md` §12.8) | Resolved |
| M10 | Create Task "Start Date" | No task start-date field | Remove. End Date becomes `due_date`. | Resolved |
| M11 | Create Task "Add Guests" with several avatars | A task has one `assigned_to` | Single-select assignee | Resolved |
| M12 | Create Task "Add Task Files" | Files are Tier 2. `POST /files` with `task_id` works after creation. | Hide until Tier 2 files | Resolved |
| M13 | Dashboard stat-card trends ("+9% from last month") | `GET /dashboard` has no deltas | Remove the trend line. Keep the number, the fraction (`pending`/`total` and so on) and the bar. | Resolved |
| M14 | Dashboard Tasks card "82%" per task | Dashboard task items have no progress | Remove the % and the bar. Show `status_label` and `due_date`. | Resolved |
| M15 | Dashboard Teams card: member rows with "12/14" ratios | The dashboard `teams.items` has `name`, `members_count` and `projects_count` only | Keep the team dropdown, filled from `teams.items`. Rows are the selected team's members from the `members[]` of `GET /teams` (verified) or `GET /teams/{id}` (`name`, `avatar_url`, `role_in_team`, and `is_leader`, which drives the "Leader" tag). Remove the ratio and the bar. | Resolved |
| M16 | "All Projects" and "This Year" filters on the overview charts (Dashboard, Project Overview) | No filter params are documented. The response says `period: "year"`. | Hide both filters. Plot `created_tasks` and `completed_tasks` per month for the year the API returns. | Resolved |
| M17 | "Project Type: SaaS" in Project Details `1:8753` | No field | Remove | Resolved |
| M18 | Team role labels ("Front Leader", "SEO Specialist"...) | `role_in_team` (19 values) and `direct_members[].role` (free text) | Show the API value | Resolved |
| M19 | All Projects "Teams" column: avatar stack | List items carry `teams[{id, name}]` only | Show team name chips: the first 2, then "+N" | Resolved |
| M20 | Per-project accent colours (purple, teal) | No colour field | Pick one deterministically from the support palette in §9 (violet, teal, orange, blue, green) using `project.id`. | Resolved |
| M21 | Profile screens use a navbar without search, bell or user block, with "Reports" highlighted | Not applicable | Use the standard navbar with no item active | Resolved |
| M22 | Profile Tasks "To do" and "Done" with progress bars | `/auth/profile/tasks` items have `status` and no progress | To do = Pending, In Progress and In Review. Done = Completed. Remove the bars and show a status label. | Resolved |
| M23 | Profile settings has no About field and no password change | `UpdateProfileRequest` accepts `about`; `PUT /auth/password` exists | Add an "About" textarea to the Experience card, and a derived "Security" card (current, new and confirm password) using the same settings-card pattern | Resolved |
| M24 | Profile settings phone with a country selector | One `phone` string, max 30 | Keep the visual. Save one combined string such as `+20 1234567890`. | Resolved |
| M25 | All Projects filter dropdown "All Projects" (its options are project names, `1:8501`) and sort "Newest" | `GET /projects` has `status`, `priority`, `search` and `sort=newest` (postman; other sort values unknown) | Replace it with a Status filter on `status`. Keep "Newest" and remove any other sort options. | Resolved |
| M26 | Tasks page "My Task" filter (My Tasks, UI/UX Tasks, ..., All Tasks) and search | The Kanban endpoint documents no filters | Filter the loaded board on the client: My Tasks = `assigned_to` is the current user; a team option = `team_id`. Options come from the user's teams in `/auth/me`. Search filters on the client by name. | Resolved |
| M27 | Tasks page "Project 1" selector | The Kanban is per project | Required selector filled from `GET /projects`. It defaults to the last used project, then the first one. | Resolved |
| M28 | Guest and assignee pickers (New Project members, task assignee) | Verified as PM (`api-authenticated-shapes.md` §8):<br>• `GET /users` returns 200, 127 users, with pagination `{data, meta}`. Whether `search` works is unconfirmed.<br>• `/projects/{id}/teams` returns `members[]` objects: `id`, `name`, `avatar_url?`, `role_in_team`, `is_leader`, `tasks_ratio`, `progress_percentage`.<br>• Overview `direct_members[]` has `id`, `name`, `avatar_url`, `job_title`, `role`.<br>• `job_title` and `avatar_url` are often `null`. | Assignee options: project direct members plus the members of the project's teams, deduplicated by `id` and loaded when the picker opens. Project member options: `/users` with debounced `search` and `per_page=20`, filtering on the client as the fallback. `search` and the maximum `per_page` stay unverified until the API documentation phase check (D10). | Resolved (D5) |
| M29 | The Figma design language uses three fonts (Inter, Rubik, Plus Jakarta Sans) | Not applicable | Inter for all app text. Rubik Regular only for the "Collabspace" wordmark, which Figma renders as text. Plus Jakarta Sans removed. Mapping: `figma.md` §12.12. | Resolved (D4) |
| M30 | Navbar items Chats and Reports (`1:11556` variants) | Both features are out of scope (D1) | Hide them in the MVP | Resolved (D7) |
| M31 | Dashboard Ask AI card (row 3, `1:8285`) | AI Assistant is out of scope (D1) | Hide it. Upcoming meetings widens to fill row 3. | Resolved (D7) |
| M32 | Navbar search and notification bell | Search and notifications are Tier 2 | Hidden until their Tier 2 features ship | Resolved (D7) |
| M33 | Dashboard Upcoming meetings and Recent Files "View All" links | Their target pages are Tier 2 | Show both sections read-only from `GET /dashboard` with no extra requests. Hide "View All" until the Tier 2 pages ship. | Resolved (D7) |
| M34 | Project deletion (listed in D2; the API supports a cascading `DELETE /projects/{id}`) | Destructive cascade; not in the D1 list | Excluded from the MVP and deferred. No delete action is offered. | Deferred (D9) |
| M35 | Team Member role behaviour (D2 column) | Not probed: the Postman Team Member credentials conflict | Treat as an unverified assumption. It is a required Tier 1 acceptance-test item. | Deferred (D6) |

**Register status at discovery close:** every row is either resolved or explicitly deferred (M34, M35). Remaining API unknowns are scheduled for the API documentation phase (D10).

---

## Tier 2 screens (D1: after Tier 1 is complete)

| Screen | Node | API | Roles | Notes |
|---|---|---|---|---|
| Notifications popover | `1:11840` | `GET /notifications` (pagination A, with `meta.unread_count`), `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`, `POST /notifications/mark-all-read`, `DELETE /notifications/{id}` (spec) | All | Refreshed by polling (D1). Item fields are untyped in the spec. Mark-all, delete and the empty state aren't designed. |
| Global search overlay | `1:12331`, `1:12350` | `GET /search?q&limit&types` (spec; the response type is unreliable) | All | Recent searches would have to be stored on the device. No results design exists beyond the text fragment. |
| Project Teams tab | `1:9313` | `GET /projects/{id}/teams` (verified PM): a plain array of teams with integer `completion_percentage`, `total_tasks` and `completed_tasks`. Each has `members[]` with `id`, `name`, `avatar_url?`, `role_in_team`, `is_leader`, `tasks_completed`, `tasks_total`, `tasks_ratio` (a string such as "12/20") and `progress_percentage`. Also `GET /teams`, `POST /projects/{id}/teams`, `DELETE /projects/{id}/teams/{team}`, team CRUD and members (postman). | View: all. Manage: provisional per the reference role map (A1), to be confirmed before Tier 2 tickets. | The design's per-team "% Completed" and per-member "12/20" with progress bars **have a verified source**. No management UI is designed. |
| Project Files tab | `1:9679` | `GET /files?project_id&per_page&search` (postman), `POST /files` multipart with `{file, project_id, name}` (20 MB max), `GET /files/{id}/download`, `DELETE /files/{id}` (permanent) | View: all. Upload: all per the reference map (`upload_file`). | No upload dialog or delete action is designed. |
| Profile Files tab | `1:12191` | `GET /auth/profile/files` (postman) | Own | |
| Global Files | `1:11313` | `GET /files` with a project filter | All | |
| Meetings calendar | `1:9853` | `GET /meetings?project_id&time_filter=upcoming\|past\|today&per_page` (postman) | View: all. Schedule: provisional, PM per the reference map; Admin unconfirmed (A1). | No date-range parameter is known for a week view. |
| New Meeting modal | `1:8705` | `POST /meetings` with `{title*, description, meeting_date*, start_time*, end_time*, meeting_link*, project_id*, participants: int[]}` (spec) | PM (reference map) | `project_id` and `meeting_link` are required but not in the design. Duration has to be converted to `end_time`. |
| Meeting details | `1:10091` | `GET /meetings/{id}`, `GET`/`POST /meetings/{id}/summary/generate`, `GET`/`PUT /meetings/{id}/summary`, `/meetings/{id}/notes` CRUD, `/meetings/{id}/comments` CRUD, `PATCH /meetings/{id}/attendance`, `POST /meetings/{id}/summary/create-tasks` (spec and postman) | View: participants. Edit summary: PM (postman). | The recording player, timestamped transcript and transcript language have no API support. |

---

## Out of scope (D1)

| Screen | Nodes | API that exists | Mismatch noted for the future |
|---|---|---|---|
| Chats | `1:10754`, `1:11184`, `1:11236`, `1:10803`, `1:10862`, `1:10921`, `1:11039` | One message stream per project: list, send, thread reply (`parent_id`), edit, delete, mark-read, unread-count. Real-time through Reverb on `private-projects.{id}`, with no configuration published. | The design has direct messages, per-team channels, hashtags and voice/video calls. None of these has API support. |
| Reports | `1:7501` | `GET /reports/projects`, `/reports/tasks`, `/reports/teams`, `/reports/users[/{id}]` | The design's report-request form has no matching endpoint. |
| Ask AI | `1:10622`, `1:11807` | `POST /ai/ask` with `{query, project_id?}` | Voice input, attachments, message actions and the typing indicator have no API support. |
| Admin | none in Figma | `/users` CRUD, `/ai/settings`, `/audit-logs` | No designs. |
