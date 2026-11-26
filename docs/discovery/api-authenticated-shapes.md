# CollabSpace authenticated API shapes (Admin and Project Manager probe)

- **Target:** `https://collabspace.huma-volve.com/api/v1`
- **Client:** Windows PowerShell 5.1, `System.Net.Http.HttpClient`, redirects and cookies disabled, `Accept: application/json` on every request.
- **Scope (user-authorized):** 2 logins (one attempt each), 30 GETs, 2 logouts. 34 requests in total. No other POST/PUT/PATCH/DELETE was sent.
- **Data handling:** credentials were read from the Postman collection (read only, not modified) into in-memory variables in one script. Responses were parsed in memory and reduced by a recursive schema function to key names, JSON types, nesting, array-item unions (keys absent from some items marked optional), nullability, and allow-listed values (enum-like strings, counts, pagination numbers, booleans, date formats with digits masked). Tokens, names, emails, phones, URLs, titles, descriptions and IDs were not recorded. The temporary script and console capture were deleted afterwards.

Notation: `?` = nullable (observed `null` on at least one item). `(opt)` = key missing on some items. Date formats: `YYYY-MM-DD`, `HH:MM:SS`, `ISO+offset` = `YYYY-MM-DDTHH:MM:SS+HH:MM`, `ISO-Z` = `YYYY-MM-DDTHH:MM:SS.000000Z` (microseconds, UTC).

---

## 1. Probe log

`{id}` replaces real IDs. Both roles used the project of the first task in their own task list (that project was also on page 1 of their project list). The roles ended up on different projects.

| Role | Method | Path | Status | Note |
|---|---|---|---|---|
| Admin | POST | `/auth/login` | 200 | "Logged in successfully." Body sent: `email`, `password` only. |
| Admin | GET | `/auth/me` | 200 | "Profile retrieved successfully." |
| Admin | GET | `/dashboard` | 200 | No `message` key. |
| Admin | GET | `/projects` | 200 | "Projects retrieved successfully." |
| Admin | GET | `/projects?per_page=2&page=2` | 200 | `per_page` and `page` honored. |
| Admin | GET | `/tasks` | 200 | "Tasks retrieved successfully." |
| Admin | GET | `/projects/{id}` | 200 | "Project retrieved successfully." |
| Admin | GET | `/projects/{id}/overview` | 200 | "Project overview retrieved successfully." |
| Admin | GET | `/projects/{id}/tasks/kanban` | 200 | "Kanban board for project '<name>' retrieved successfully." (the message embeds the project name) |
| Admin | GET | `/tasks?project_id={id}&per_page=2` | 200 | `project_id` filter honored. |
| Admin | GET | `/tasks/{id}` | 200 | "Task details retrieved successfully." |
| Admin | GET | `/teams` | 200 | "Teams retrieved successfully." |
| Admin | GET | `/teams?per_page=2&page=2` | 200 | `per_page` and `page` honored. |
| Admin | GET | `/team-roles` | 200 | "Team roles retrieved successfully." |
| Admin | GET | `/auth/profile/tasks` | 200 | "Assigned tasks retrieved successfully." Empty (total 0). |
| Admin | POST | `/auth/logout` | 200 | "Logged out successfully.", `data: null` |
| Admin | GET | `/auth/me` (old token) | 401 | "Unauthenticated. Please provide a valid Bearer token." |
| PM | POST | `/auth/login` | 200 | "Logged in successfully." |
| PM | GET | `/auth/me` | 200 | as Admin |
| PM | GET | `/dashboard` | 200 | No `message` key. |
| PM | GET | `/projects` | 200 | |
| PM | GET | `/projects?per_page=2&page=2` | 200 | |
| PM | GET | `/tasks` | 200 | |
| PM | GET | `/projects/{id}` | 200 | |
| PM | GET | `/projects/{id}/overview` | 200 | |
| PM | GET | `/projects/{id}/tasks/kanban` | 200 | message embeds the project name |
| PM | GET | `/tasks?project_id={id}&per_page=2` | 200 | |
| PM | GET | `/tasks/{id}` | 200 | |
| PM | GET | `/teams` | 200 | |
| PM | GET | `/teams?per_page=2&page=2` | 200 | |
| PM | GET | `/team-roles` | 200 | |
| PM | GET | `/auth/profile/tasks` | 200 | 4 items |
| PM | POST | `/auth/logout` | 200 | `data: null` |
| PM | GET | `/auth/me` (old token) | 401 | same 401 message |

No 403 occurred. No response carried `X-RateLimit-Limit`, `X-RateLimit-Remaining` or `Retry-After`. Every response was `application/json`.

---

## 2. Login and `/auth/me`

### `POST /auth/login` 200 (verified Admin, PM)

```
{ success: boolean (true), message: string, data: {
    user: {
      id: integer, name: string, email: string,
      job_title: string, about: string, years_of_experience: integer, phone: string, avatar_url: string,
      status: string ("active"), available_status: string ("available"),
      current_project_id: null,
      roles: string[]            // exactly 1 item per user
      permissions: []            // empty for both roles
      google_linked: boolean, facebook_linked: boolean, linkedin_linked: boolean,
      created_at: ISO+offset, updated_at: ISO+offset
    },
    token: string,
    token_type: string ("Bearer")
} }
```

- No `expires_at`, `expires_in` or refresh token in the login response.
- `current_project` is **absent** from the login `user` but present (as `null`) in `/auth/me`.
- For these two users, `job_title`, `about`, `phone` and `avatar_url` were non-null. The spec marks them nullable; keep them nullable in types.

### `GET /auth/me` 200 (verified Admin, PM)

```
{ success, message, data: {
    user: { ...same as login user..., current_project: null },
    stats: { completed_tasks: integer, total_tasks: integer, hours_worked: integer },
    recent_activities: [ { id: integer, category: string, action: string, description: string, created_at: ISO+offset } ],   // 5 items for both
    teams: [ {                                  // raw Eloquent Team model, not TeamResource
        id, name: string, description: string, created_by: integer,
        created_at: ISO-Z, updated_at: ISO-Z,
        pivot: { user_id: integer, team_id: integer, role_in_team: string, created_at: ISO-Z, updated_at: ISO-Z } } ],
    projects: [ {                               // raw Eloquent Project model
        id, name: string, description: string?, start_date: ISO-Z, deadline: ISO-Z,
        priority: string, status: string, progress_percentage: integer|number, created_by: integer,
        created_at: ISO-Z, updated_at: ISO-Z,
        pivot: { user_id: integer, project_id: integer, role: string, created_at: ISO-Z, updated_at: ISO-Z } } ]
} }
```

Observed values: `recent_activities[].category`: `auth`, `project`, `task`. `teams[].pivot.role_in_team`: `Product Owner`, `Team Lead` (PM). `projects[].pivot.role`: `Owner`, `Project Owner` (Admin); `Contributor`, `Meeting Participant`, `Owner`, `Project Owner` (PM).

### Roles and permissions

| | Admin | PM |
|---|---|---|
| `roles` | array of **strings**, 1 item: `["Administrator"]` | `["Project Manager"]` |
| `permissions` | array, **0 items** | array, **0 items** |

`roles` holds plain role-name strings, not `{id, name}` objects. `permissions` was empty for both roles, so its item type is still unknown. The UI cannot derive capabilities from `permissions`; it would have to map from the role string.

Spec comparison: confirms `/auth/me` keys `user`, `stats`, `recent_activities`, `teams`, `projects`. Contradicts `stats.hours_worked: number` (observed integer, so treat as number). The spec types `teams`/`projects` as plain `Team`/`Project` models without `pivot`; live data includes `pivot`.

---

## 3. Per-endpoint verified shapes

Envelope on every success seen: `{ success: true, message: string, data: … }`, except `/dashboard`, which has no `message`. Error (401): `{ success: false, message: string, errors: null }`.

### Pagination shapes observed

| Shape | Endpoints | Structure |
|---|---|---|
| **P1. Laravel API-resource collection nested in the envelope** | `GET /projects`, `GET /tasks`, `GET /teams` | `data: { data: Item[], links: { first: string, last: string, prev: string?, next: string? }, meta: { current_page, from, last_page, per_page, to, total: integer, path: string, links: [ { url: string?, label: string, page: integer? (opt), active: boolean } ] } }` |
| **P2. Raw `LengthAwarePaginator` in `data`** | `GET /auth/profile/tasks` | `data: { current_page, data: Item[], first_page_url: string, from: integer?, last_page, last_page_url: string, links: [ {url?, label, page?, active} ], next_page_url: string?, path: string, per_page, prev_page_url: string?, to: integer?, total }` |
| **P3. Dashboard blocks** | `GET /dashboard` blocks | `{ items: X[], pagination: { current_page: integer, per_page: integer, total: integer } }` |

- Default `per_page` is 15 on P1 and P2. `per_page` and `page` are honored on projects, tasks and teams.
- `meta.links[].label` values: `&laquo; Previous`, page numbers, `...`, `Next &raquo;` (HTML entities, not decoded). The `...` separator item has no `page` key. `page` is `null` on disabled prev/next items.
- Empty P2 page: `from: null`, `to: null`, `data: []`.
- The spec's `meta`-sibling shape (users, audit logs, notifications) was not probed.

Spec comparison: the openapi-vs-postman note "No endpoint uses the standard Laravel API-resource collection shape" is **contradicted**: projects, tasks and teams use it, nested one level down at `data.data` / `data.meta` / `data.links`. P2 **confirms** the spec for `/auth/profile/tasks`. P3 **contradicts** the spec's string-typed pagination values (they are integers).

### `GET /dashboard` (verified Admin, PM)

```
data: {
  overview: {
    projects: { total, active, completed: integer, average_progress: number },
    tasks: { total, pending, in_progress, in_review, completed, overdue, assigned_to_me: integer,
             pending_percentage, in_progress_percentage, in_review_percentage, completed_percentage, completion_rate: number,
             by_priority: { low, medium, high, critical: integer } },
    meetings: { upcoming_count: integer },
    teams: { total: integer } },
  project_overview: { period: string ("year"), year: integer, from: YYYY-MM-DD, to: YYYY-MM-DD, group_by: string,
    data: [ 12 × { label: string ("Jan 2026"…"Dec 2026"), month: string, month_number: integer, year: integer,
                   is_future: boolean, projects: integer, created_tasks: integer, completed_tasks: integer } ] },
  active_projects: { items: [ { id, name, progress: integer, tasks_total: integer?, tasks_completed: integer? } ], pagination },   // per_page 5
  tasks: { items: [ { id, name, priority: string, status: string, status_label: string, due_date: YYYY-MM-DD?,
                      project: {id, name}, assignee: {id, name, avatar_url?}? } ], pagination },                                  // per_page 5
  teams: { items: [ { id, name, description?, members_count: integer, projects_count: integer } ], pagination },                 // per_page 10
  upcoming_meetings: { items: [ { id, title, date: YYYY-MM-DD, start_time: HH:MM:SS, end_time: HH:MM:SS, meeting_link: string,
                                  project: {id, name}, creator: {id, name}, participants: [ {id, name, avatar_url?} ] } ] },     // no pagination
  recent_files: { items: [ { id, name, mime_type: string, file_size_formatted: string, download_url: string,
                             uploaded_by: {id, name}, project: {id, name}, created_at: ISO+offset } ], pagination },            // per_page 5
  recent_activity: { items: [ { id, category: string, action: string, description: string,
                                user: {id, name, avatar_url?}, created_at: ISO+offset } ], pagination }                         // per_page 10
}
```

- Dashboard task enums are **lowercase snake_case**: `priority` ∈ `critical`, `high`, `medium` (observed); `status` ∈ `pending`, `in_progress`, `in_review`, `completed`. `status_label` carries the Title-case value (`Pending`, `In Progress`, `In Review`, `Completed`). Every other task endpoint uses Title case in `status`/`priority`.
- `recent_activity[].category`: `auth`, `task` (Admin); `auth` (PM).
- Spec comparison: **contradicts** `overview: string` and `project_overview: string` (both are objects) and string pagination values. **Confirms** block names, `items`/`pagination` structure, missing `message`, `upcoming_meetings` without pagination, and the `Dashboard*Resource` item fields.

### `GET /projects` (verified Admin, PM)

P1 pagination. Item:

```
{ id: integer, name: string, description: string?, start_date: YYYY-MM-DD, deadline: YYYY-MM-DD,
  status: string, priority: string, progress_percentage: integer|number, files_count: integer,
  teams: [ { id: integer, name: string } ], created_at: ISO+offset }
```

- No `updated_at`, `created_by`, `creator` or member list on list items.
- `status` observed: `Pending`, `In Progress`, `On Hold`, `Completed`. `priority` observed: `Critical`, `High`, `Medium`.
- Spec: `data` untyped, so this is new information. No `Planning` and no `Cancelled` observed.

### `GET /projects/{id}` (verified Admin, PM)

Matches `ProjectOverviewResource`:

```
{ id, name, description: string, status: string, priority: string, progress_percentage: integer|number,
  due_date_indicator: { start_date: YYYY-MM-DD, deadline: YYYY-MM-DD, total_days: integer, days_remaining: integer, is_overdue: boolean },
  tasks_statistics: { total, pending, in_progress, in_review, completed: integer,
                      completion_rate, pending_percentage, in_progress_percentage, in_review_percentage, completed_percentage: integer|number },
  counts: { files, meetings, messages, teams, direct_members: integer },
  teams: [ { id, name, description: string, created_by: integer, members_count: integer, active_projects_count: integer,
             created_at: ISO+offset, updated_at: ISO+offset } ],
  direct_members: [ { id, name, email, avatar_url: string?, job_title: string, role: string } ],
  created_by: integer, creator: { id, name, email }, created_at: ISO+offset, updated_at: ISO+offset }
```

- `direct_members[].role` observed: `Owner`, `Project Owner`, `Contributor`, `Meeting Participant`, `Reviewer`, `Stakeholder`, `Tech Lead`. It is free text, not an enum.
- Spec comparison: **confirms** the resource. `total_days` is an integer (untyped in spec). `teams[]` items have **no `creator` and no `members`**, so they are a subset of `TeamResource`. Percentages come back as integers when whole (for example `0`, `100`), so treat them as `number`.

### `GET /projects/{id}/overview` (verified Admin, PM)

Same object as `GET /projects/{id}` plus:

```
chart: { period: string ("year"), year: integer, group_by: string,
         data: [ 12 × { month: string, month_number: integer, year: integer, label: string ("Jan 2026"…),
                        created_tasks: integer, completed_tasks: integer, progress_percentage: integer|number|null, is_future: boolean } ] }
```

Spec comparison: **contradicts** `data: array (untyped items)`. It is an object.

### `GET /tasks` and `GET /tasks?project_id={id}` (verified Admin, PM)

P1 pagination. Items are `TaskResource`:

```
{ id, name, description: string?, priority: string, status: string, due_date: YYYY-MM-DD?, completed_at: ISO+offset?,
  hours_spent: integer|number, project_id: integer, team_id: integer?, assigned_to: integer?, created_by: integer,
  project: { id, name }, team: { id, name }?, assignee: { id, name, email, avatar_url?, job_title? }?,
  creator: { id, name, email }, attachments_count: integer, created_at: ISO+offset, updated_at: ISO+offset }
```

- `status` observed: `Pending`, `In Progress`, `In Review`, `Completed`. `priority`: `Low`, `Medium`, `High`, `Critical`.
- `project_id` filter works with `per_page`. The global list returned the "Tasks retrieved successfully." variant, not the spec's alternative Kanban variant.
- Spec comparison: `data` untyped in spec. The items **confirm** `TaskResource`; `attachments_count` is an integer.

### `GET /tasks/{id}` (verified Admin, PM)

`data` is a single `TaskResource`, the same as the list items. No subtasks and no attachment list. This **confirms** the spec and **contradicts** the Postman description.

### `GET /projects/{id}/tasks/kanban` (verified Admin, PM)

```
data: {
  project: { id: integer, name: string, progress_percentage: integer|number },
  total_tasks: integer,
  columns: {
    "Pending":     { name: string, count: integer, tasks: TaskResource[] },
    "In Progress": { name: string, count: integer, tasks: TaskResource[] },
    "In Review":   { name: string, count: integer, tasks: TaskResource[] },
    "Completed":   { name: string, count: integer, tasks: TaskResource[] }
  }
}
```

- `columns` is an **object keyed by the Title-case `TaskStatus` value**, in the order Pending, In Progress, In Review, Completed. All four keys were present even when a column was empty (`count: 0`, `tasks: []`).
- Column `tasks` items are full `TaskResource` objects (same shape as `/tasks`). The board is not paginated.
- Spec comparison: **contradicts** `data: string`. **Contradicts** Postman's snake_case column names (`pending`, `in_progress`, `in_review`, `completed`).
- The `message` embeds the project name.

### `GET /teams` (verified Admin, PM)

P1 pagination. Items are `TeamResource` with members:

```
{ id, name, description: string?, created_by: integer, creator: { id, name, email },
  members_count: integer, active_projects_count: integer,
  members: [ { id, name, email, job_title: string, avatar_url: string?, role_in_team: string, is_leader: boolean, joined_at: ISO+offset } ],
  created_at: ISO+offset, updated_at: ISO+offset }
```

- `role_in_team` values observed in members: `AI/ML Engineer`, `Backend Developer`, `Business Analyst`, `Data Engineer`, `DevOps Engineer`, `Frontend Developer`, `Full-Stack Developer`, `Intern`, `Member`, `Mentor`, `Mobile Developer`, `Product Owner`, `QA Engineer`, `Security Engineer`, `Support Engineer`, `Team Lead`, `UI/UX Designer`.
- Spec comparison: **confirms** `TeamResource` and `TeamMemberResource`. `members_count` and `active_projects_count` are integers (the spec allows string|integer).

### `GET /team-roles` (verified Admin, PM)

```
data: { roles: [ 19 × { value: string, is_leader: boolean } ], default: string ("Member") }
```

`value` set: `AI/ML Engineer`, `Backend Developer`, `Business Analyst`, `Data Engineer`, `DevOps Engineer`, `Frontend Developer`, `Full-Stack Developer`, `Intern`, `Member`, `Mentor`, `Mobile Developer`, `Product Owner`, `QA Engineer`, `Scrum Master`, `Security Engineer`, `Support Engineer`, `Team Lead`, `Tech Lead`, `UI/UX Designer`. Identical for both roles. **Confirms** the Postman example and the spec `TeamRole` enum. The probe did not record which values have `is_leader: true`, only that both booleans occur.

### `GET /auth/profile/tasks` (verified PM; Admin returned an empty page)

P2 pagination. Items are **raw Eloquent `Task` models**, not `TaskResource`:

```
{ id, name, description: string, project_id, team_id, assigned_to, created_by: integer,
  priority: string, status: string, due_date: ISO-Z, hours_spent: integer, completed_at: ISO-Z?,
  created_at: ISO-Z, updated_at: ISO-Z,
  project: { id, name, description, start_date: ISO-Z, deadline: ISO-Z, priority, status, progress_percentage: integer|number, created_by, created_at, updated_at },
  team: { id, name, description, created_by, created_at, updated_at } }
```

No `assignee`, `creator` or `attachments_count`. `due_date` is a full UTC timestamp here, while `TaskResource` gives `YYYY-MM-DD`. This **confirms** the spec (`$Task[]` in a paginator) and adds the nested `project`/`team`.

### `POST /auth/logout` (verified Admin, PM)

`{ success: true, message: string, data: null }`. **Confirms** the spec.

### Date and time formats

| Format | Where |
|---|---|
| `YYYY-MM-DDTHH:MM:SS+HH:MM` | API Resources: `created_at`/`updated_at`/`completed_at`/`joined_at` on tasks, teams, projects details, dashboard files and activity, user |
| `YYYY-MM-DDTHH:MM:SS.000000Z` | Raw models: `/auth/me` `teams`/`projects` (including `start_date`/`deadline`), pivots, `/auth/profile/tasks` (including `due_date`) |
| `YYYY-MM-DD` | `start_date`, `deadline`, `due_date` in resources; dashboard meeting `date`; chart `from`/`to` |
| `HH:MM:SS` | dashboard meeting `start_time`/`end_time` |

The client needs one date parser that accepts all four formats.

---

## 4. Role visibility comparison (counts only)

| Measure | Admin | PM |
|---|---|---|
| `GET /projects` `meta.total` | 29 | 16 |
| Dashboard `overview.projects.total` | 29 | 16 |
| Dashboard `active_projects.pagination.total` | 26 | 13 |
| `GET /tasks` `meta.total` | 346 | 192 |
| Dashboard `overview.tasks.total` | 346 | 192 |
| `GET /teams` `meta.total` | 13 | 10 |
| Dashboard `overview.teams.total` / `teams.pagination.total` | 13 / 13 | **2 / 2** |
| Dashboard `overview.meetings.upcoming_count` | 5 | 4 |
| Dashboard `recent_files.pagination.total` | 140 | 72 |
| Dashboard `recent_activity.pagination.total` | 3308 | 414 |
| `/auth/me` `projects` length | 10 | 8 |
| `/auth/me` `teams` length | 0 | 2 |
| `/auth/me` `stats.total_tasks` | 0 | 4 |
| `/auth/profile/tasks` `total` | 0 | 4 |
| Overlap: PM page-1 projects also on Admin page 1 | | 9 of 15 |
| 403 responses | none | none |

Observations:

- Admin sees every project and task. PM sees a subset (16 of 29 projects, 192 of 346 tasks), which fits "created, direct member, or team-assigned".
- PM's `/teams` list (10) is **larger** than PM's dashboard team block (2, which matches PM's own memberships in `/auth/me`). So `/teams` is not limited to the PM's own teams, while the dashboard team block is.
- `/auth/me.projects` lists only projects where the user is a direct member (with `pivot.role`), not everything the user can see.
- PM could read details, overview, Kanban and task details for its chosen project without a 403.

---

## 5. Credential issues

| Role | Body vs description | Outcome |
|---|---|---|
| Admin (`Login (Admin)`) | Email in the description matches the body (no other email in the description); the body password appears in the description. **Match.** The body also has `remember`, which was not sent. | Logged in |
| PM (`Login (Project Manager)`) | Email matches, password appears in the description. **Match.** | Logged in |
| Team Member (`Login (Team Member)`) | Known body/description mismatch (recorded earlier in `api-inventory.md`). **Not attempted, with either set.** | **Unresolved blocker:** the user must say which credential set is correct before Team Member visibility can be probed. |

---

## 6. Still unknown

- **Team Member role:** visibility, 403 behavior, `roles` value, and dashboard shape for members.
- **`permissions` item type:** empty for both roles, so strings vs objects is unknown, and so is whether any role ever has entries.
- **403 shape on these endpoints:** no 403 was triggered. The earlier unauthenticated probe saw `{success:false, message, errors:null}` for 403 on a web route only.
- **Which `team-roles` values are leaders:** not recorded per value. Postman says `Team Lead` and `Tech Lead`.
- **Kanban column `name` value:** not recorded. It is probably the same as the key, but that is unverified. Whether the board ever returns columns beyond the four statuses is also unknown.
- **Enum-like values not captured:** `project_overview.group_by`, `chart.group_by`, `month`.
- **Filters and sorting** not exercised: `status`, `priority`, `search`, `sort`, `assigned_to`, `due_date`, `overdue` on lists; dashboard `period`/`year`/`from`/`to`; overview `period=6_months`.
- **Project priority `Low` and project status `Cancelled`:** not observed in the data, though both are in the spec.
- **Nullability of user profile fields** (`job_title`, `about`, `phone`, `avatar_url`): non-null for both users; nullable per spec.
- **Endpoints not probed:** users, audit logs, notifications (the `meta`-sibling pagination), files, meetings, messages, reports, activities, search, project teams progress (`/projects/{id}/teams`).
- **Token lifetime / expiry:** no expiry field in the login response; `remember` behavior is untested.
- **Rate limiting:** no rate-limit headers on any authenticated response. Limits and the 429 shape remain unknown.
- **Whether `download_url` / file `url` need the Bearer header:** not tested (file downloads were forbidden).

---

## 7. Token revocation

| Role | `POST /auth/logout` | `GET /auth/me` with the old token | Revocation |
|---|---|---|---|
| Admin | 200 | 401 "Unauthenticated. Please provide a valid Bearer token." | **Confirmed** |
| PM | 200 | 401, same message | **Confirmed** |

Logout ran inside `finally` for both roles. No token was written to disk.


---

## 8. People-picker probe (Project Manager)

- **Scope (user-authorized):** 1 login (PM only, one attempt), 7 GETs (limit was 8), 1 logout, 1 revocation check. 10 requests in total. No other method or endpoint was called.
- **Data handling:** same approach as the earlier probe. Credentials were read from the body of `Login (Project Manager)` in `1. Authentication` (collection read only, not modified) into memory. Responses were reduced in memory by a recursive schema function. Only key names, JSON types, nesting, array-item unions, nullability, allow-listed enum values (`roles`, `role`, `role_in_team`, `status`, `available_status`, `is_leader`) and pagination numbers were printed. Messages were printed with quoted text and email-like strings masked. The temporary script was deleted. No token was written to disk.
- Notation as in section 3. `?` here means `null` was observed on at least one item. A field shown as plain `null` was `null` on every item in the sample.

### 8.1 Probe log

| Method | Path | Status | Note |
|---|---|---|---|
| POST | `/auth/login` | 200 | "Logged in successfully." `roles`: `Project Manager`. |
| GET | `/users?per_page=5` | 200 | **No `message` key.** Top-level keys: `success`, `data`, `meta`. `meta.total` 127, `last_page` 26. |
| GET | `/users?per_page=5&search=a` | 200 | No `message` key. `meta.total` 127, `last_page` 26 (unchanged). |
| GET | `/projects?per_page=1` | 200 | "Projects retrieved successfully." Used only to pick one project id. `meta.total` 16. |
| GET | `/projects/{id}/teams` | 200 | "Project teams and progress retrieved successfully." Not paginated (no `meta`). |
| GET | `/projects/{id}/overview` | 200 | "Project overview retrieved successfully." Same project. |
| GET | `/teams?per_page=1` | 200 | "Teams retrieved successfully." Used only to pick one team id. |
| GET | `/teams/{id}` | 200 | "Team retrieved successfully." |
| POST | `/auth/logout` | 200 | "Logged out successfully.", `data: null` |
| GET | `/auth/me` (old token) | 401 | "Unauthenticated. Please provide a valid Bearer token." Body keys `success`, `message`, `errors`. |

No 403 occurred. Every response was `application/json`.

### 8.2 `GET /users?per_page=5` (verified PM)

```
{ success: boolean (true),                       // no message key
  data: [ {
    id: integer, name: string, email: string,
    job_title: null, about: null, years_of_experience: integer, phone: null, avatar_url: null,   // null on all 5 sampled users
    status: string ("active"), available_status: string ("available"),
    current_project_id: null,
    roles: string[]                              // 1 item each; only "Team Member" on this page
    permissions: []                              // empty on all 5
    google_linked: boolean, facebook_linked: boolean, linkedin_linked: boolean,
    created_at: ISO+offset, updated_at: ISO+offset } ],
  meta: { current_page: integer, last_page: integer, per_page: integer, total: integer } }
```

- Items have the same shape as the login `user` object (section 2), without `current_project`.
- Pagination is the spec's **`meta`-sibling shape** (`meta` next to `data`, not nested in it). `meta` has **only** `current_page`, `last_page`, `per_page`, `total`: no `from`, `to`, `path`, `links`, and no top-level `links`. This is a fourth pagination shape (P4), different from P1/P2/P3 in section 3.
- `roles` values present on page 1: `Team Member` only. The probe did not page further, so the full role distribution across the 127 users is unknown.
- `job_title` and `avatar_url` were `null` on all 5 sampled users, so a people picker must handle missing avatars and job titles.

### 8.3 `GET /users?per_page=5&search=a` (verified PM)

Same shape. `meta.total` 127 with and without `search=a`.

### 8.4 `GET /projects/{id}/teams` (verified PM)

```
data: [ {
  id: integer, name: string,
  completion_percentage: integer,               // integer in this sample; treat as number (see section 3 percentages)
  total_tasks: integer, completed_tasks: integer,
  members: [ {
    id: integer, name: string, avatar_url: string?,
    role_in_team: string,                       // observed: Backend Developer, Frontend Developer, Member, Product Owner, QA Engineer, Team Lead
    is_leader: boolean,                         // both true and false observed
    tasks_completed: integer, tasks_total: integer,
    tasks_ratio: string,                        // format not recorded
    progress_percentage: integer
  } ]
} ]
```

- `data` is a plain array (no pagination, no `meta`).
- Spec comparison: **contradicts** `members: string | string[]`. Members are **objects** with per-member task progress. They have **no `email`, `job_title` or `joined_at`**.

### 8.5 `GET /projects/{id}/overview`: `direct_members[]` and `teams[]` (verified PM)

```
direct_members: [ { id: integer, name: string, email: string, avatar_url: string, job_title: string,
                    role: string } ]            // observed: Owner, Technical Lead
teams: [ { id: integer, name: string, description: string, created_by: integer,
           members_count: integer, active_projects_count: integer,
           created_at: ISO+offset, updated_at: ISO+offset } ]
```

- `teams[]` carries **no `members`** (only `members_count`), confirming section 3.
- `direct_members[].role` adds `Technical Lead` to the free-text values in section 3 (which had `Tech Lead`). This supports treating `role` as free text.
- `avatar_url` was non-null on every item here, but section 3 saw it nullable; keep it nullable.

### 8.6 `GET /teams/{id}` (verified PM)

```
data: { id: integer, name: string, description: string, created_by: integer,
  creator: { id: integer, name: string, email: string },
  members_count: integer, active_projects_count: integer,
  members: [ { id: integer, name: string, email: string, job_title: string, avatar_url: string?,
               role_in_team: string,              // observed: Backend Developer, Member, Product Owner, QA Engineer
               is_leader: boolean,                // only false observed on this team
               joined_at: ISO+offset } ],
  created_at: ISO+offset, updated_at: ISO+offset }
```

Same `TeamResource` as the `/teams` list items in section 3. **Confirms** `TeamMemberResource`.

### 8.7 Findings

1. **A PM can list users.** `GET /users` returned 200 with 127 users in `meta.total`, no 403. The pagination is the `meta`-sibling shape with four keys only. **verified (PM)**
2. **`search` is not shown to be honored.** `search=a` left `meta.total` at 127. This is **inconclusive**: a single-letter term may match every user if the backend also searches email, so the probe cannot tell "ignored" from "matched everything". A distinctive multi-character term is needed to settle it. **verified (PM)** for the count result only.
3. **`/projects/{id}/teams` `members` is an array of objects**, not strings: `id`, `name`, `avatar_url?`, `role_in_team`, `is_leader`, `tasks_completed`, `tasks_total`, `tasks_ratio`, `progress_percentage`. `completion_percentage`, `total_tasks` and `completed_tasks` are integers. **verified (PM)**
4. **Member fields by endpoint** **verified (PM)**:

   | Field | `/teams/{id}` `members[]` | `/projects/{id}/overview` `direct_members[]` | `/projects/{id}/teams` `members[]` | `/users` items |
   |---|---|---|---|---|
   | `id` | yes | yes | yes | yes |
   | `name` | yes | yes | yes | yes |
   | `avatar_url` | yes (nullable) | yes | yes (nullable) | yes (null in sample) |
   | `job_title` | yes | yes | **no** | yes (null in sample) |
   | role | `role_in_team` + `is_leader` | `role` (free text) | `role_in_team` + `is_leader` | `roles: string[]` (system role) |
   | `email` | yes | yes | no | yes |

5. **Token revoked.** Logout returned 200 with `data: null`, and `GET /auth/me` with the old token returned 401. **verified (PM)**

Other observations: `/users` responses have no `message` key (unlike every other non-dashboard endpoint). Overview `teams[]` still has no members, so a project's full people list needs `/projects/{id}/teams` or one `/teams/{id}` call per team.
