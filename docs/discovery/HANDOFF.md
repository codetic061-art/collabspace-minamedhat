# CollabSpace product discovery handoff

**Status: Product discovery COMPLETE.** Decisions D1–D11 are recorded in `decisions.md`.

This file is the entry point for every later phase and agent. It summarises the discovery and points to the detailed source documents, which stay authoritative.

| Document | Holds |
|---|---|
| `decisions.md` | Every user decision: D1–D11 and assumptions A1–A8 |
| `figma.md` | The original Figma inventory (§1–§11) and the derived requirements (§12, `Derived — Not in Figma`) |
| `screen-feature-map.md` | Screen → feature → API → roles; the API/UI mismatch register M1–M35 |
| `api-authenticated-shapes.md` | Response shapes verified live as Administrator and Project Manager, including the people-picker probe (§8) |
| `openapi-vs-postman.md` | The backend OpenAPI spec (92 operations) compared with Postman |
| `api-inventory.md` | The Postman collection inventory (86 requests), credentials redacted |
| `api-probe.md` | Unauthenticated probe: framework, CORS, error shapes |
| `reference-site.md` | The earlier implementation's routes, behaviour, validation and tokens |
| `/AGENTS.md` | The mandatory engineering policy, including the architecture gate |

---

## 1. Product requirements and MVP scope

CollabSpace is a team collaboration web app: projects, tasks on a Kanban board, teams, meetings with AI summaries, files, chat and notifications. It consumes an existing Laravel REST API, so no new backend is built. The target is an MVP built in two days by several specialised agents.

**Tier 1: mandatory.** Everything must work end to end against the real API with no fake data (D1).

| Feature | Includes |
|---|---|
| Authentication | Sign in, Sign up (with confirm password), Forgot Password → Verify OTP → Reset Password, sign out |
| App shell | Role-aware navbar (Dashboard, Projects, Tasks), user menu |
| Dashboard | Stat cards, project overview chart, Active Projects, Tasks, Teams; Upcoming meetings and Recent Files read-only (D7) |
| Projects | List (search, status filter, newest sort), details (Overview tab), create, edit. **No delete** (D9). |
| Tasks and Kanban | Project Tasks tab and the global Tasks page, a **mandatory status selector**, create, edit, Task Details, reassign, **delete with confirmation** (D9). Drag-and-drop is optional (A6). |
| Profile | Overview, Tasks, settings (edit profile, About, change password, avatar) |

**Tier 2: only after Tier 1 is complete, integrated and tested.** Meetings and AI summaries, notifications refreshed by polling, team management (the project Teams tab), files (project, profile and global Files), and global search.

**Out of the MVP:** real-time chat, Google sign-in, AI Assistant, reports, administration, project deletion, and languages other than English (D1, D8, D9).

**Rules:**
- Tier 1 has absolute priority, and Tier 2 never delays it.
- No dead links, fake data or non-functional features (D7).
- A blocked endpoint is documented, not simulated.
- The architecture stays open to the excluded features (A8).

## 2. Figma

- **Source:** https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled. The user owns this file. Access is read-only through Agy's Figma MCP (`code tic`, Full seat, Education tier).
- **Calls used in discovery:** 54 of the 100 budgeted.
- **Before pulling design context, read `figma.md` §1.3:**
  - Layer names are stale. Trust the screenshots.
  - The Dashboard's final design is the inner frame `1:8065`, not the wireframe `1:7698`.
  - Sample data and typos are not spec.

### 2.1 Original screens: 26 distinct screens, plus 1 duplicate frame

| Area | Screens (node) | Tier |
|---|---|---|
| Auth | Sign in `1:10523`, Sign up `1:10573` | 1 |
| Dashboard | Dashboard `1:7697` (final layer `1:8065`) | 1 |
| Projects | All Projects `1:8545`, Overview `1:8753`, Tasks/Kanban `1:8978` | 1 |
| Projects | Teams tab `1:9313`, Files tab `1:9679` | 2 |
| Tasks | Tasks page `1:10208` | 1 |
| Profile | Overview `1:11901`, Tasks `1:12020`, Settings `1:11983` | 1 |
| Profile | Files `1:12191` | 2 |
| Files | Global Files `1:11313` | 2 |
| Meetings | Calendar `1:9853`, Meeting details `1:10091` | 2 |
| Chats | `1:10754`, `1:11184`, `1:11236`, `1:10803`, `1:10862`, `1:10921`, `1:11039` | Out |
| Reports | `1:7501` | Out |
| Ask AI | `1:10622`, `1:11807` | Out |
| Duplicate | Profile settings without navbar `1:11864` (not canonical) | - |

Direct links and full descriptions are in `figma.md` §2.1 and §3.

### 2.2 Original overlays, modals, dropdowns and component sets: 21 items

- **Tier 1:**
  - Create Task modal `1:10646` (canonical; `1:10696` is an older variant)
  - New Project modal `1:8650`
  - Dropdowns: Teams `1:8490`, Project `1:8501`, Duration `1:8510`, My task `1:8523`
  - Navbar component set `1:11556` (7 variants)
- **Tier 2:**
  - New Meeting modal `1:8705`
  - Notifications popover `1:11840`
  - Recent searches `1:12331`
  - Search results fragment `1:12350`
- **Out of scope or hidden:**
  - Language dropdown `1:8536` (hidden, D8)
  - Reports dropdowns `1:11468`, `1:11477`
  - Chat menus `1:11538`, `1:11529`
  - Chat bar `1:11493`/`1:11507`
  - Thread modal parts `1:11508`
  - Loose meeting-form fragments
- **Unknown use:** select component set `1:11488`

The full table is in `figma.md` §2.2. The component inventory and reuse map is in §5.

### 2.3 Not in Figma

The file has none of these:
- password recovery screens
- a confirm-password field
- edit project
- task details
- a user menu
- loading, empty, error and permission states
- mobile or tablet layouts
- prototype wiring and interaction states

All the Tier 1 ones are now **derived** (§3 below).

## 3. Derived screens and states (D3): `Derived — Not in Figma`

These are built only from existing Figma components and tokens. Behaviour and wording come from the reference site, and the API contract wins wherever they disagree. Full specs are in `figma.md` §12; API mapping is in `screen-feature-map.md`.

| Derived item | Spec | Key rules |
|---|---|---|
| MVP visibility | §12.1 | Hidden: Chats and Reports nav items, the Ask AI card, search, the bell, Tier 2 "View All" links, the language selector, project delete |
| Forgot Password | §12.2 | Never reveal whether an account exists. Handle 429 (10 requests per minute per IP). |
| Verify OTP | §12.3 | 6 digits, 10-minute expiry, single use, 60-second resend cooldown, lock after 5 wrong attempts |
| Reset Password | §12.4 | Minimum 8 characters plus confirmation. Signs out all devices. |
| Sign up confirm password | §12.5 | `password_confirmation` is required. "Remember Me" and Google are removed. |
| Edit Project | §12.6 | Fields from `UpdateProjectRequest`. Members can't be edited (the API has no member field on update). |
| Task Details | §12.7 | Verified `TaskResource` fields only. No comments, progress, reviewer, subtasks or start date. |
| Create / Edit Task | §12.8 | Single assignee, project required, no start date, status defaults to the clicked column |
| User menu | §12.9 | Profile, Edit Profile, Sign out. `POST /auth/logout`, then always clear the session locally. |
| Application states | §12.10 | Loading skeletons, empty, block error with retry, form 422, 401 → sign in, 403 with rollback, 404, success toast |
| Responsive | §12.11 | Provisional rules for ≥1280, 1024–1279, 768–1023 and <768 (minimum 360). Labelled derived (A3). |
| Typography | §12.12 | D4 |

## 4. API contract findings

**Platform:**
- `https://collabspace.huma-volve.com/api/v1`, served by Laravel 13 on PHP 8.3.
- The public OpenAPI 3.1 spec is at `/docs/api.json` (92 operations). It is partly typed and **wrong in places**: Kanban, dashboard and overview objects are typed as strings. Verified shapes override it.

**Auth:**
- Sanctum bearer tokens. `POST /auth/login` returns `{user, token, token_type: "Bearer"}`.
- There is no expiry field and no refresh token. `POST /auth/logout` revokes the token (verified).
- Registration gives the "Team Member" role.

**Required header:**
- `Accept: application/json` on every request. Without it, protected routes return **500**.

**CORS:**
- Any origin is allowed with an `Authorization` header, but not with credentials (cookies).
- Preflight responses aren't cached.

**Envelope:**
- Success: `{success, message, data}`. `/dashboard` and `/users` have no `message`.
- Error: `{success: false, message, errors}`, with `errors` set to a field map on 422.

**Pagination, four shapes:**

| Shape | Endpoints | Structure |
|---|---|---|
| P1 | projects, tasks, teams | `data.data` / `data.meta` / `data.links` |
| P2 | `/auth/profile/tasks` | Raw Laravel paginator |
| P3 | Dashboard blocks | `{items, pagination}` |
| P4 | users, notifications (plus `unread_count`), audit logs | `{data, meta}` |

Default page size is 15.

**Enums:**

| Field | Values |
|---|---|
| Task status | `Pending`, `In Progress`, `In Review`, `Completed` (lowercase snake_case on `/dashboard`, with `status_label`) |
| Priority | `Low`, `Medium`, `High`, `Critical` |
| Project status | `Pending`, `In Progress`, `On Hold`, `Completed`, `Cancelled` |
| System roles | `Administrator`, `Project Manager`, `Team Member` |
| `role_in_team` | 19 values, default `Member` |
| `available_status` | `available`, `busy`, `away`, `offline` |

**Dates:** four formats are in use (`YYYY-MM-DD`, ISO with offset, ISO with microseconds and `Z`, and `HH:MM:SS`). The client needs one parser that accepts all of them.

**Key Tier 1 endpoints:**

| Area | Endpoints |
|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/auth/verify-reset-otp`, `/auth/reset-password` |
| Dashboard | `/dashboard` |
| Projects | `/projects`, `/projects/{id}/overview`, `/projects/{id}/teams`, `PUT /projects/{id}` |
| Tasks | `/tasks`, `/tasks/{id}`, `/projects/{id}/tasks/kanban`, `PATCH /tasks/{id}/status`, `PATCH /tasks/{id}/assign`, `DELETE /tasks/{id}` |
| Teams and users | `/teams`, `/teams/{id}`, `/users` |
| Profile | `/auth/profile` (POST/PUT, multipart), `PUT /auth/password`, `/auth/profile/tasks` |

The full mapping is in `screen-feature-map.md`.

**Known backend issues, to report to the backend team:**
- The Google redirect points to `127.0.0.1:8000`.
- Laravel Boost, a development tool, is active in production.
- Reverb real-time configuration is unpublished.

## 5. Authentication and role capabilities

- `user.roles` is an array of role-name strings. `user.permissions` is always empty (verified for Administrator and Project Manager).
- UI gating therefore uses **one client-side role → capability map**. The server stays the authority, and every mutation handles 403 with a rollback (D2).

| Action | Administrator | Project Manager | Team Member (unverified, D6) |
|---|---|---|---|
| View dashboard, projects, tasks | yes | yes | yes (assumed) |
| Create / edit project | yes | yes | no (assumed) |
| Delete project | not in MVP (D9) | not in MVP | not in MVP |
| Create / edit / delete task | yes | yes | no (assumed) |
| Change task status | yes | yes | yes (assumed) |

- **Data scope:** the server limits what each role sees. Administrator sees 29 projects; Project Manager sees 16.
- **Team Member behaviour is unverified,** because the Postman credentials conflict and weren't used. It is a **required Tier 1 acceptance-test item** and is never presented as confirmed (D6).
- **People pickers (D5):**
  - Task assignee: project direct members plus the members of the project's teams, deduplicated, loaded when the picker opens.
  - Project members: `/users` with debounced search, filtering on the client as the fallback.
  - A Project Manager can read `/users` (verified).
- **Tier 2 permissions** follow the reference role map **provisionally** (A1).

## 6. UI/UX decisions and design tokens

| Category | Decision |
|---|---|
| Typography (D4) | **Inter** in weights 400/500/600/700 for all text. **Rubik 400** only for the "Collabspace" wordmark (live text). Plus Jakarta Sans dropped. The scale is Figma's Inter text styles; the mapping is in `figma.md` §12.12. |
| Colours | Primary `#005AFB` (tint `#E6EFFF`), page background `#F6F8FA`, text `#000712`, body text `#718096`, input border `#CBD5E0`. Success `#2BA52E`/`#EAF6EA`, danger `#DB302A`/`#FBEAEA`, warning `#E6BA0E`/`#FFFAE7`, orange `#FA9E00`/`#FFF5E6`, violet `#7D2D7E`, teal `#04B5AE`. Full table: `figma.md` §9.1. |
| Shape | Pill radius 100 (buttons, nav, selects, badges). Cards 16. Auth card and modals 24. Settings cards 32. Notch inputs 12. |
| Layout | 1440 desktop design, 64 side padding, 24 gaps, 72 navbar |
| Status and priority display | Real API values only. Derived colours for project status and for the Critical priority (M4, M5). |
| Language | English and left-to-right only. Strings are organised per feature, with no i18n library (D8). |
| Visibility | The D7 hiding rules |

## 7. Known mismatches and resolutions

The register in `screen-feature-map.md` has **35 entries**. At discovery close, every entry is resolved except two, which are explicitly deferred.

- **Auth:** Google and "Remember Me" on Sign up are hidden; the language selector is hidden (M1–M3).
- **Labels:** project status and priority use the real enums; Kanban columns are titled with the API values (M4–M6).
- **Removed for lack of a data source:**
  - Kanban card progress, comment count and reviewer (M7)
  - dashboard trend lines (M13) and task % (M14)
  - "Project Type" (M17)
- **Forms:**
  - The New Project and Create Task field sets are corrected to the API: single assignee, no task start date, required project (M8–M12).
  - File dropzones are hidden until Tier 2.
- **Data-source rules:**
  - teams card (M15), charts (M16, A4), team roles (M18), project list teams (M19), project accent colours (M20)
  - profile (M21–M24), filters and sorting (M25–M27), people pickers (M28)
- **Typography:** M29 (D4).
- **Hidden entry points:** M30–M33 (D7).
- **Deferred:** project deletion (M34, D9) and Team Member behaviour (M35, D6).

## 8. Remaining technical uncertainties

| Uncertainty | Resolve in | Reference |
|---|---|---|
| `/users` search behaviour and maximum `per_page` | Phase 1, read-only Project Manager check | D10, D5 |
| Whether dashboard `download_url` needs the bearer token | Phase 1 | D10 |
| Actual Kanban column `name` values | Phase 1 | D10 |
| 403 response structure | Phase 1 | D10 |
| Notifications, meetings and files list shapes (Tier 2) | Phase 1 | D10 |
| Team Member visibility and 403 behaviour | Tier 1 acceptance testing | D6, M35 |
| Token lifetime, `remember` effect, rate-limit configuration, 429 body | Handled generically; document what is observed | A2 |
| Tier 2 authorisation (meetings, teams, files) | Before Tier 2 tickets | A1 |
| `GET /search` response (typed unreliably) and meeting week-range parameters | Before Tier 2 tickets | `screen-feature-map.md` Tier 2 |
| Framework, rendering model, token storage, data fetching, state, testing | Phase 2 ADRs | AGENTS.md §8 |
| Figma interaction states and prototype flows (none exist) | Covered by derived §12; reviewed in the technical spec | D3 |

One architecture input for Phase 2: CORS allows bearer-token calls straight from the browser but not cookies. **Where the token lives** is a security-relevant ADR: browser storage, or a server-side session such as a backend-for-frontend (the reference site kept it in an Auth.js server session). It has to be researched, not assumed.

## 9. Security and repository restrictions

- **The repository is public:** `codetic061-art/collabspace-minamedhat`. Nothing has been committed or pushed yet.
- **The Postman collection** (`CollabSpace AI - API Collection.postman_collection (1).json`) holds plain-text demo credentials.
  - It is listed in `.gitignore`; `git check-ignore` confirms it is ignored.
  - It must never be committed, modified or deleted (A7).
  - Before the first commit, check `git status` to confirm it is excluded.
- **Never copy secrets** (credentials, tokens, OTPs, personal emails) into code, docs, issues, logs or commits. The discovery docs were scanned and contain none.
- **API probes** are read-only, Administrator and Project Manager only, with tokens kept in memory and revoked afterwards. No Team Member login (D6, D10).
- **Figma access** is read-only. The discovery screenshots sit in `%TEMP%\agy-figma\shots`, outside the repo.
- **The AGENTS.md gate:** no implementation tickets or application code until the architecture decisions are researched, recorded as ADRs in `docs/adr/` and reviewed by the user.

## 10. Recommended next phases

| Phase | Output | Exit criteria |
|---|---|---|
| **1. API documentation** | `docs/api/plain.md` | • Every endpoint: method, path, auth, headers, request JSON, **verified** response JSON (sanitised), validation errors, status codes, pagination shape, enums.<br>• Each item marked verified or spec-only.<br>• The D10 read-only verification session done as Project Manager, with its results merged.<br>• No secrets in the file. |
| **2. Architecture research and ADRs** | `docs/adr/0001…` | • The AGENTS.md §1 research done with official, version-matched sources.<br>• ADRs for all 11 items in AGENTS.md §8: framework and rendering model, folder structure, component architecture, server/client boundaries, API and data fetching, auth and token storage, state management, routing and loading, performance, testing, dependencies.<br>• User review. |
| **3. Technical implementation specification** | `docs/spec/…` | • Folder structure and feature boundaries.<br>• Shared components mapped to the `figma.md` §5 inventory.<br>• Design-token module.<br>• API client and per-domain services.<br>• Role capability map module.<br>• Error and state conventions.<br>• Coding conventions.<br>• Definition of done per AGENTS.md §7. |
| **4. GitHub Issues** | Issues in `codetic061-art/collabspace-minamedhat` | • Small, independently testable Tier 1 tickets with blocking dependencies (shared surfaces first, per AGENTS.md §6), acceptance criteria and Figma node links.<br>• Triage labels.<br>• Tier 2 tickets only after A1 is confirmed. |
| **5. Implementation and integration** | Working MVP | • Specialised agents build the tickets under AGENTS.md, using Figma MCP read access.<br>• Tier 1 integrated and tested against the real API, including Team Member acceptance (D6); then Tier 2. |
