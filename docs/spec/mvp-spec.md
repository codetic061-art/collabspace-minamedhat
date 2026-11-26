# CollabSpace MVP technical specification

| | |
|---|---|
| **Status** | Expanded in the engineering review: ID-14 to ID-24, expanded testing, revised delivery plan. Tickets are published to GitHub under the narrowed AGENTS.md gate: documentation and research tickets are ready, and implementation tickets are blocked until the ADRs are approved. Delivery runs in two phases with two Claude Opus review gates (Further Notes, "Delivery workflow and review gates"). |
| **Scope** | Tier 1 in full. Tier 2 at outline level. |
| **Sources** | Product discovery is complete (`docs/discovery/HANDOFF.md`). This spec synthesises it and does not repeat it. Where a detail lives in a discovery document, this spec points to it. Engineering research with sources is in `docs/research/react-architecture.md` and `docs/research/security.md`. |

| Reference | Location |
|---|---|
| Decisions D1–D11, assumptions A1–A8 | `docs/discovery/decisions.md` |
| Original Figma screens (§1–§11), derived designs (§12) | `docs/discovery/figma.md` |
| Screen → feature → API → roles; mismatch register M1–M35 | `docs/discovery/screen-feature-map.md` |
| Verified response shapes (current reference until `docs/api/plain.md` exists) | `docs/discovery/api-authenticated-shapes.md` |
| Engineering policy and the architecture gate | `/AGENTS.md` |
| Implementation conventions addendum (WI-3) | `docs/spec/conventions.md` |

---

## Problem Statement

Team members, project managers and administrators juggle several tools to track projects, assign and move tasks, and see progress. CollabSpace has a finished visual design (Figma) and a working backend API. It has no frontend that uses that API, and an earlier implementation (the reference site) left most screens unverified and some forms unwired.

Several specialised AI agents will build the frontend in parallel within two days. Without one shared, accurate description of scope, behaviour and API contract, those agents would each re-read a large API collection, guess response fields, contradict each other's patterns, and ship screens that look right but don't work against the real backend.

## Solution

A React web application that reproduces the approved Figma design and works end to end against the existing CollabSpace REST API for the Tier 1 features:
- authentication with password recovery;
- a role-aware app shell;
- the Dashboard;
- Projects (list, details, create, edit);
- Tasks with a Kanban board (create, edit, view, reassign, change status, delete);
- the user profile.

Tier 2 features follow only after Tier 1 is integrated and tested.

The work is delivered as a dependency-ordered sequence of small work items. **The first is the API contract document `docs/api/plain.md`.** It becomes the single API reference every later agent reads, section by section, so no agent re-analyses the API or invents fields.

---

## User Stories

### Authentication and session

1. As a visitor, I want to sign in with my email and password, so that I can reach my workspace.
2. As a visitor, I want a "Remember Me" option at sign-in, so that my session lasts longer on my own device.
3. As a visitor, I want clear messages when my email or password is wrong, so that I know how to fix it.
4. As a visitor, I want to see which field is invalid when the server rejects my input, so that I don't have to guess.
5. As a visitor, I want to register with my name, email, password and a password confirmation, so that I can create an account.
6. As a newly registered user, I want to be signed in right after registering, so that I can start working at once.
7. As a user who forgot my password, I want to request a 6-digit code by email, so that I can reset my password.
8. As a user requesting a reset code, I want the same confirmation whether or not my email is registered, so that account existence isn't revealed.
9. As a user entering a reset code, I want six separate digit boxes that accept paste and a numeric keyboard, so that entering the code is quick.
10. As a user entering a reset code, I want to see how long the code stays valid, so that I know when to request a new one.
11. As a user entering a reset code, I want a "Resend code" action that becomes available after 60 seconds, so that I can get a new code if one doesn't arrive.
12. As a user entering a wrong code, I want a clear error, and a clear lockout message after too many attempts, so that I understand what happened.
13. As a user with a valid code, I want to set and confirm a new password, so that I regain access.
14. As a user who reset my password, I want to be sent to sign-in with a confirmation that it worked, so that I can sign in with the new password.
15. As a user who hits the request limit during recovery, I want a "too many attempts" message, so that I know to wait.
16. As a signed-in user, I want my session to survive a page reload, so that I don't have to sign in again.
17. As a signed-in user whose session has expired or been revoked, I want to be sent to sign-in and then brought back to the page I was on, so that I don't lose my place.
18. As a signed-in user, I want to sign out from a user menu, so that nobody else can use my session on this device.
19. As a signed-in user, I want sign-out to work even if the network fails, so that my session is always cleared locally.

### App shell and navigation

20. As a signed-in user, I want a top navigation bar with Dashboard, Projects and Tasks, so that I can move between the main areas.
21. As a signed-in user, I want the current section highlighted in the navbar, so that I know where I am.
22. As a signed-in user, I want to see my name, job title and avatar (or initials) in the navbar, so that I know which account I'm using.
23. As a signed-in user, I want a user menu showing my name and system role, with Profile, Edit Profile and Sign out, so that account actions are in one place.
24. As a user, I want navigation items for features that don't exist yet to be hidden, so that I never hit a dead link.
25. As a keyboard user, I want to open and use the user menu and navigation with the keyboard, so that I don't need a mouse.
26. As a user on a small screen, I want the navigation in a slide-in drawer, so that it fits my screen.

### Dashboard

27. As a signed-in user, I want task counts for Pending, In Progress and Completed, each with its share of all tasks, so that I see the workload at a glance.
28. As a signed-in user, I want the overall task completion rate as a gauge, so that I see progress quickly.
29. As a signed-in user, I want a monthly chart of tasks created and completed this year, so that I see trends.
30. As a signed-in user, I want my active projects with progress bars and task counts, so that I can spot projects that need attention.
31. As a signed-in user, I want the tasks relevant to me with priority, status and due date, so that I know what to do next.
32. As a signed-in user, I want my teams listed, with the selected team's members and their roles, so that I know who I work with.
33. As a signed-in user, I want upcoming meetings shown read-only, so that I know what is scheduled.
34. As a signed-in user, I want recent files shown read-only, so that I see recent activity.
35. As a signed-in user, I want each dashboard section to load and fail independently, so that one broken section doesn't blank the page.
36. As an administrator, I want the dashboard to reflect the whole workspace, and as a project manager I want it scoped to my projects, as the server decides, so that the numbers are relevant.

### Projects

37. As a signed-in user, I want a paginated list of the projects I can see, with name, start date, deadline, status, file count, teams and priority, so that I can browse them.
38. As a signed-in user, I want to search projects by name, so that I can find one quickly.
39. As a signed-in user, I want to filter projects by status, so that I can focus on active work.
40. As a signed-in user, I want projects sorted newest first, so that recent work is on top.
41. As a signed-in user, I want a clear empty state when there are no projects, so that I understand the list isn't broken.
42. As an administrator or project manager, I want an "Add Project" action, so that I can start a new project.
43. As a team member, I want no "Add Project" action, so that I'm not offered something I can't do.
44. As an administrator or project manager, I want to create a project with name, description, priority, status, start date, deadline, teams and members, so that it is set up completely.
45. As a project creator, I want to pick members by searching people, so that I can add the right users.
46. As a project creator, I want the deadline validated against the start date, so that I can't save impossible dates.
47. As a signed-in user, I want to open a project and see its description, progress, due-date status, task statistics, details and team members, so that I understand its state.
48. As an administrator or project manager, I want to edit a project's name, description, priority, status, dates and teams, so that I can keep it current.
49. As an administrator or project manager, I want a clear message if the server refuses my change, so that I know I lack permission.
50. As a signed-in user, I want a "not found" message for a project that doesn't exist or that I can't see, so that I'm not stuck on a blank page.

### Tasks and Kanban

51. As a signed-in user, I want a project's tasks on a four-column Kanban board (Pending, In Progress, In Review, Completed), so that I see the workflow.
52. As a signed-in user, I want a Tasks page where I choose a project and see its board, so that I can work across projects.
53. As a signed-in user, I want the Tasks page to remember the last project I chose, so that I don't pick it every time.
54. As a signed-in user, I want to filter the board to my own tasks or a team's tasks, and search by name, so that I see only what matters.
55. As a signed-in user, I want each card to show the task name, priority, description, assignee avatar, due date and attachment count, so that I can scan the board.
56. As any signed-in user, I want to change a task's status with a status selector, so that I can move work forward without drag-and-drop.
57. As a user changing a task's status, I want the card to move at once and move back if the server refuses, so that the board stays truthful.
58. As an administrator or project manager, I want to create a task with name, description, priority, status, due date and one assignee, so that work can be assigned.
59. As a user creating a task from a column, I want the status pre-set to that column, so that I save a step.
60. As a task creator, I want to choose the assignee from the project's members and team members, so that I only assign people on the project.
61. As a signed-in user, I want to open a task's details, so that I see all its information: description, status, priority, project, team, assignee, due date, completion time, hours spent, creator, last update and attachment count.
62. As a signed-in user, I want a link to a task's details that I can share and reopen, so that colleagues land on the same task.
63. As an administrator or project manager, I want to edit and reassign a task, so that I can correct it.
64. As an administrator or project manager, I want to delete a task after confirming, so that mistakes are removed without accidents.
65. As a team member, I want no edit, reassign or delete actions, so that I'm not offered actions I can't perform.
66. As a user on a small screen, I want the board to scroll horizontally column by column, so that I can still use it.

### Profile

67. As a signed-in user, I want my profile with name, job title, joined date, completed task count and hours worked, so that I see my contribution.
68. As a signed-in user, I want my "About" text and recent activities on my profile, so that I have context.
69. As a signed-in user, I want my tasks grouped into "To do" and "Done", so that I see what's left.
70. As a signed-in user, I want to edit my name, email, phone, availability, job title, years of experience, current project and About text, so that my profile is accurate.
71. As a signed-in user, I want to change or remove my avatar, so that colleagues recognise me.
72. As a signed-in user, I want to change my password by entering my current one and the new one twice, so that my account stays secure.
73. As a signed-in user, I want field-level errors when my profile update is rejected, so that I can fix the input.

### Cross-cutting

74. As any user, I want skeleton placeholders shaped like the content while data loads, so that the page doesn't jump.
75. As any user, I want a retry option when a section fails to load, so that I can recover without reloading.
76. As any user, I want a short confirmation after I create, update or delete something, so that I know it worked.
77. As any user, I want the app to work at desktop, laptop, tablet and phone widths, so that I can use any device.
78. As a screen-reader user, I want labelled controls, semantic structure and announced errors, so that I can use the app.
79. As any user, I want pages to load only the data they show, so that the app stays fast.

### Tier 2 (outline; detailed later)

80. As a signed-in user, I want a notifications popover with unread state, refreshed periodically, so that I see updates.
81. As a signed-in user, I want global search across projects, tasks, meetings, files, users and teams, so that I can find anything.
82. As a signed-in user, I want a project's Teams tab with per-team completion and per-member task ratios, so that I see who is doing what.
83. As a signed-in user, I want to browse, upload and download project files, so that the project's documents live in one place.
84. As a signed-in user, I want a meetings calendar, meeting details and AI summaries, so that meetings are tracked.

### Delivery and agents

85. As an implementation agent, I want one API reference document with a stable section per endpoint, so that I read only the parts my ticket needs.
86. As an implementation agent, I want every response field labelled with how confident we are in it, so that I never build on a guessed field.
87. As the project owner, I want the first work item to be the API contract document, so that all later work shares one verified contract.

### Security, resilience and engineering quality (added in the engineering review)

88. As any user, I want my session token kept out of URLs, logs, analytics and error reports, so that it can't leak.
89. As a user signed in on several tabs, I want signing out (or being signed out) in one tab to sign me out in all of them, so that no tab keeps a stale session.
90. As a user reloading a protected page, I want a neutral loading shell instead of a flash of the sign-in screen or of protected content, so that the app feels stable and leaks nothing.
91. As a user who mistypes my password, I want a generic "invalid email or password" message, so that attackers can't learn which emails are registered.
92. As a user who is rate limited, I want to be told to wait, with a countdown only when the server says how long, so that I don't keep retrying blindly.
93. As a user submitting a form, I want the submit button disabled while the request is in flight, so that I can't create duplicates by double-clicking.
94. As a user whose form submission failed validation, I want my input kept and the errors shown next to the right fields, so that I only fix what's wrong.
95. As a user on a slow or dropped connection, I want a clear "connection problem" message with a retry, distinct from a server error, so that I know it isn't my input.
96. As a user hitting an unexpected server error, I want a safe generic message with no technical details, so that internals aren't exposed.
97. As any user, I want links from user-provided or API data to open only safe web addresses, so that I can't be tricked into running script links.
98. As a user navigating away from a loading screen, I want its pending requests cancelled, so that stale responses never overwrite what I'm looking at.
99. As a user, I want a crash in one part of a screen to show a recoverable error there instead of a blank page, so that the rest stays usable.
100. As the project owner, I want registration and password recovery protected against bots once the backend supports server-side verification, so that automated sign-ups and reset spam are stopped.
101. As the project owner, I want login brute force throttled by the backend, with the frontend only presenting the result, so that protection is real and not cosmetic.
102. As an implementation agent, I want each ticket to list the files and areas it owns, so that parallel agents never edit the same shared file.

### Delivery workflow (added in the workflow correction)

103. As the project owner, I want the whole foundation reviewed independently by Claude Opus before any feature ticket starts, so that feature agents build only on approved shared layers.
104. As the project owner, I want the implementation agent to work through every remaining ticket without intermediate batch reviews, then stop for one independent review of the entire project, so that delivery is fast and acceptance is still independent.
105. As the project owner, I want all work to run in the cloud environment with Vercel Preview deployments, and Production only after my approval, so that my own machine is never a host and nothing reaches users without my consent.

---

## Implementation Decisions

**Decision status labels used from here on:**

| Label | Meaning |
|---|---|
| **ESTABLISHED** | Already approved (D1–D11, AGENTS.md). |
| **PRINCIPLE** | Mandatory engineering rule, independent of the technology choice. |
| **PROPOSAL (ADR)** | A recommendation from the research notes that requires ADR approval (WI-2) before it binds. |

Research behind the proposals, with sources:
- `docs/research/react-architecture.md` (official React, Next.js, Vite, React Router, TanStack, testing docs; npm versions checked 2026-11-26)
- `docs/research/security.md` (OWASP, ASVS 5.0, RFC 10017, NIST SP 800-63B-4, Laravel 13, Cloudflare Turnstile, MDN)

Framework, rendering model, token storage, data-fetching library, state management, styling mechanism, test tooling and folder layout are **not** decided here. They are ADR decisions under AGENTS.md §1 and §8 (work item WI-2). The decisions below are framework-independent unless marked PROPOSAL.

### ID-1. Scope and priority

- **Scope source:** D1 (tiers), D7 (hidden entry points), D8 (English only, left-to-right), D9 (task delete in, project delete out).
- **Ordering:** Tier 1 work items are ordered by dependency (see "Delivery sequence" in Further Notes). Tier 2 starts only after Tier 1 passes its acceptance criteria.
- **No fake features:** a feature that can't be backed by the real API is hidden or documented as blocked, never simulated.

### ID-2. Roles and capability rules

- **Representation:** the system role comes from `user.roles[0]`, one of `Administrator`, `Project Manager` or `Team Member`. `user.permissions` is ignored because it is always empty.
- **Capability map module:** one shared module, the only place UI gating is decided. Its interface takes a role and a capability name and returns allowed or not. Capabilities are the D2 rows:
  - view dashboard, projects and tasks;
  - create/edit project;
  - create/edit/delete task;
  - change task status.

  Project deletion is absent in the MVP (D9).
- **Server authority:** the map only shows or hides UI. Every mutation handles 403 as specified in ID-8, including optimistic rollback.
- **Team Member column:** an unverified assumption (D6). Code comments and tests must not describe it as confirmed backend behaviour.

### ID-3. Navigation and screen organisation

**Public routes:**
- Sign in
- Sign up
- Forgot Password
- Verify Code
- Reset Password

**Authenticated routes:**

| Route | Contents |
|---|---|
| Dashboard | The default after sign-in |
| Projects list | |
| Project details | Overview tab and Tasks tab. The Teams and Files tabs are Tier 2 and hidden. |
| Tasks page | Project selector and board |
| Task details | Opened by a task-ID parameter over the current board (deep-linkable) |
| Profile | Overview and Tasks tabs. The Files tab is Tier 2. |
| Profile settings | |

- **Navbar (MVP):** wordmark; Dashboard, Projects and Tasks; user block with the user menu. Chats, Reports, search and the bell are hidden (D7).
- **Route protection:**
  - An unauthenticated visit to an authenticated route redirects to Sign in with a return path. Only same-origin paths are honoured.
  - An authenticated visit to a public auth route redirects to the Dashboard.
- **Code splitting:** each route is its own code-split unit (AGENTS.md §4).

### ID-4. Figma screen-to-feature mapping

The authoritative mapping is `screen-feature-map.md`. Each Tier 1 feature is built from these Figma nodes. Every implementation ticket must list its nodes and the derived sections it implements.

| Feature | Original Figma nodes | Derived specs (`figma.md`) |
|---|---|---|
| Sign in / Sign up | `1:10523`, `1:10573` | §12.5 |
| Password recovery | none | §12.2–§12.4 |
| App shell | Navbar set `1:11556` (variants `1:11557`, `1:11595`, `1:11633`) | §12.1, §12.9 |
| Dashboard | `1:8065` (inside `1:7697`): stat row `1:8067`, middle row `1:8151`, bottom row `1:8285` | §12.10 |
| Projects list | `1:8545` | §12.10 |
| New / Edit Project | `1:8650` | §12.6 |
| Project details: Overview | `1:8753` | §12.10 |
| Project Tasks tab / Tasks page | `1:8978`, `1:10208`, dropdowns `1:8490`, `1:8501`, `1:8523` | §12.10, §12.11 |
| Create / Edit Task | `1:10646` | §12.8 |
| Task Details | none | §12.7 |
| Profile Overview, Tasks | `1:11901`, `1:12020` | §12.10 |
| Profile settings | `1:11983` | M23 (About, Security card) |

**Corrections to the original screens are binding:** every resolved register entry M1–M33 overrides what the original Figma screen shows.

### ID-5. Expected frontend behaviour per Tier 1 feature

Behaviour details are in `figma.md` §12 and in the register. The rules agents most often get wrong:

- **Auth:**
  - The validation rules are the reference-site rules (§12.2–§12.5). The server's 422 response is authoritative.
  - The reset code lives in memory, never in the URL.
  - Recovery never reveals whether an account exists.
- **Dashboard:**
  - **One request feeds all sections.** The dashboard endpoint's blocks are rendered independently.
  - Its task status and priority values are lowercase snake_case, and they are shown through `status_label` and a normalised priority.
  - No trend lines (M13) and no per-task % (M14).
  - The Teams card shows the selected team's members from the teams data, with no ratio (M15).
  - The chart plots `created_tasks` and `completed_tasks` for the year the API returns, with no filters (M16, A4).
- **Projects list:**
  - Server-side pagination using the P1 shape.
  - Search, status filter and `sort=newest` are query parameters, kept in the URL so the view can be shared.
  - Team name chips (M19).
  - Status shown as coloured text using the derived palette (M4).
- **New / Edit Project:**
  - The field sets are the ones in M8 and §12.6.
  - Members are set on create only.
  - The files dropzone is hidden until Tier 2.
  - On success the dialog closes and the affected project data is refetched or invalidated.
- **Kanban:**
  - Columns are keyed and titled by the API status values (M6).
  - The status selector is mandatory. Drag-and-drop is optional and must not block Tier 1 (A6).
  - The "My Task" filter and search run on the client over the loaded board (M26).
  - The project selector on the Tasks page is required (M27).
  - Status changes are optimistic, with rollback.
- **Task create / edit / details:**
  - Single assignee (M11). Options come from project direct members plus project team members, deduplicated, loaded when the picker opens (D5).
  - No start date (M10).
  - Delete needs confirmation (D9).
  - Unavailable fields are never shown (§12.7).
- **Profile:**
  - To do / Done grouping (M22, A5).
  - Settings fields map to the profile update request. Phone is saved as one string (M24).
  - Avatar upload and removal.
  - A Security card for changing the password (M23).
- **Hidden in the MVP:** listed in `figma.md` §12.1. None of these may be rendered in a disabled "coming soon" state.

### ID-6. API integration requirements

> Extended by ID-18 (loading) and ID-19 (API architecture and error model).

- **One shared API reference:** `docs/api/plain.md`, produced by WI-1. Until it exists, `api-authenticated-shapes.md` is the verified reference.
- **One HTTP client module** owns:
  - the base URL (from public configuration, not hard-coded per call);
  - the mandatory `Accept: application/json` header;
  - the bearer `Authorization` header;
  - envelope unwrapping (`success`, `message`, `data`);
  - error normalisation into a single error type that carries the HTTP status, message and the `errors` field map.
- **Pagination:** the client normalises the four pagination shapes (P1–P4) into one page model (items, current page, last page, per page, total). It stays one module because the shapes differ by endpoint.
- **Dates:** one date module parses all four observed date formats and formats them for display.
- **Per-domain service modules:** one each for auth, profile, dashboard, projects, tasks, teams and users. Each endpoint path is defined once, in its domain service. Components never call HTTP directly. They use hooks or services built on the data-fetching approach chosen in the ADR.
- **Data loading:**
  - Each screen loads only its own data, at its route or interaction boundary.
  - At startup, only the session check runs (`/auth/me`).
  - Requests are deduplicated and cached under an explicit invalidation policy decided in the ADR.
  - Mutations invalidate exactly the affected queries: a project list or detail, a board, or a task.
- **Mutation payloads** send only fields the API defines. Unknown or empty optional fields are omitted, never sent as fabricated defaults.
- **Fields:** no response field may be used unless `plain.md` records it at the VERIFIED or DOCUMENTED level (see ID-12). A screen that needs an UNVERIFIED field must handle it being absent.
- **Network calls:** the browser calls the API directly with a bearer token, which CORS permits. A server-side proxy is allowed only if the auth ADR requires it.

### ID-7. Authentication and session requirements

> Extended by ID-20 (security: token storage, session behaviour, throttling) and ID-21 (recovery contract).

- **Sign-in:** `POST /auth/login` with `remember` from the checkbox. It returns `token` and `user`, followed by `/auth/me` for stats and relations.
- **Token storage:** the location (browser storage, or a server-side session behind a backend-for-frontend) is an **ADR decision with a security rationale**. Whatever the choice, the token never appears in URLs, logs or analytics.
- **Session restore:** on reload, the app restores the session by calling `/auth/me`. A 401 clears the session.
- **401 handling:** any 401 from any request clears the token and the cached data, then redirects to Sign in with the return path (A2). This happens in exactly one place, the HTTP client or session layer.
- **429 handling:** a rate-limit message. The exact body is unverified.
- **Sign-out:** `POST /auth/logout`, then always clear local state, whatever the result.
- **Password reset** revokes all of the user's tokens. A stored token for that user is cleared.
- **Token lifetime and `remember`:** both unknown (A2). No client-side expiry timer is invented.

### ID-8. Error, loading, empty, unauthorized and permission states

> Extended by ID-19 (error kinds) and ID-23 (UI-state and accessibility conventions).

These are implemented once as shared state components and used by every feature. The design is in `figma.md` §12.10.

| State | Behaviour |
|---|---|
| Loading | Skeletons in the shape of the target component. Buttons show pending labels and are disabled. |
| Empty | In-card message. A primary action appears only if the capability map allows it. |
| Block error | Retry refetches only the failed block. |
| Form 422 | Per-field messages from `errors.{field}[0]`. Focus moves to the first invalid field. Messages not tied to a field go in an alert region. |
| 401 | See ID-7. |
| 403 | Mutation: a permission message and rollback. Page: an access-denied state. |
| 404 | A not-found state with a link back. |
| Success | A self-dismissing toast. |

### ID-9. Responsive requirements

- **Breakpoints:** the derived, provisional rules in `figma.md` §12.11 (A3): ≥1280, 1024–1279, 768–1023, and below 768 down to 360. Tables become card lists, modals go full-screen below 768, and the Kanban scrolls horizontally.
- **Touch targets:** at least 44×44.
- **Typography** doesn't change between breakpoints (D4).

### ID-10. Performance requirements

> Extended by ID-18 (performance and loading architecture).

From AGENTS.md §4, applied:
- **Code splitting:** per route. Lazy-load heavy, non-critical parts: the chart library, and drag-and-drop if it is added.
- **Startup:** loads only the session. No feature data loads before its screen.
- **Fonts:** Inter 400/500/600/700 and Rubik 400, latin subset only, loaded by the mechanism the ADR picks (D4).
- **Images:** optimised avatars with an initials fallback.
- **Re-renders:** state lives close to its owner, and memoisation is added only after measuring.
- **Network:** no duplicate requests for the same data from sibling components. The dashboard makes one request.

### ID-11. Accessibility requirements

> Extended by ID-23 (UI-state and accessibility conventions).

From AGENTS.md §7 and the reference site:
- **Structure:** semantic landmarks and headings.
- **Forms:** every control has a label. The notch label is the visible label and is bound to its field.
- **Keyboard:** full keyboard operation of the navbar, menus, dialogs (focus trap, Escape, focus return), selects, the OTP boxes and the Kanban status selector.
- **Announcements:** `role="alert"` for errors and live regions for async status.
- **Contrast:** colour contrast at WCAG AA for text on the Figma backgrounds. Where a Figma colour fails, that's reported in the ticket rather than silently changed.
- **Status and priority** are never shown by colour alone; the text label is always present.

### ID-12. API contract document (`docs/api/plain.md`) requirements

These are the requirements for WI-1, the first foundational work item.

**Evidence levels** (each field, endpoint and behaviour gets one):

| Level | Meaning |
|---|---|
| **VERIFIED** | Seen in a live sanitised response (discovery probes or the WI-1 verification session) |
| **DOCUMENTED** | Stated in the OpenAPI spec or Postman, but not observed live |
| **UNVERIFIED** | Inferred or untested. Implementers must handle it being absent. |
| **CONFLICT** | Sources disagree. Lists each source's version and which one applies. |

**Coverage:** every endpoint in the Postman collection (86 requests, 79 routes) and the spec-only operations (14). For each endpoint:
- method and path;
- auth, and role restrictions where known;
- required headers;
- path, query, JSON and multipart parameters with types and constraints;
- the response envelope and `data` shape;
- pagination shape;
- filter and sort parameters;
- validation errors, with sanitised 422 examples;
- status codes;
- side effects (cascades, token revocation, rate limits);
- the evidence level.

**Structure:**
- A short "How to use this document" header.
- Global conventions: base URL, headers, envelope, error shapes, the pagination shapes P1–P4, date formats, enums.
- Then one section per domain with **one stable anchor per endpoint**, in the form `domain-action` (for example `tasks-update-status`).
- A Tier/feature index at the top maps each MVP feature to its endpoint anchors, so a ticket can link straight to them.

**Verification session (D10):**
- One read-only session as Project Manager, GET only, no Team Member login.
- It covers `/users` `search` and the maximum `per_page`, dashboard `download_url` auth, Kanban column `name` values, the 403 body, and the Tier 2 list shapes (notifications, meetings, files).
- Findings are merged at the VERIFIED level.

**Sanitisation:**
- No credentials, tokens, OTPs, emails, names, phone numbers or real IDs of people.
- Examples use obvious placeholders.
- The Postman collection is read locally and never copied into the document or committed (A7).

**Reuse:** the discovery documents are inputs. `plain.md` supersedes `api-authenticated-shapes.md`, `openapi-vs-postman.md` and `api-inventory.md` as the reference for implementers. Those files stay as evidence.

### ID-13. Shared surfaces and ownership

The AGENTS.md §6 shared surfaces each have exactly one owning work item. They are completed in the foundation phase and approved at Gate 1 before feature work starts:

| Shared surface | Owner |
|---|---|
| Project scaffold, build/lint/type-check/test configuration, dependency manifest and lockfile, import-boundary lint rules, environment-variable schema, security-header and CSP configuration on the frontend host | WI-3 |
| Design tokens, typography, UI primitives (button variants, notch and top-label inputs, field wrapper, select/dropdown menu, modal and confirmation dialog, card, badge, avatar/avatar stack, tabs, breadcrumb, progress bar, skeleton/empty/error/toast state components), the block-level error boundary | WI-4 |
| HTTP client, application error model, pagination and date modules, session/auth layer, capability map, **all Tier 1 domain service modules with their query-key factories and read query definitions** | WI-5 |
| App shell: navbar, user menu, route table, route protection, root and route error boundaries, providers, layout | WI-6 |

- **Domain services are written once, in WI-5.** WI-5 implements every Tier 1 endpoint function from `plain.md`, with its typed request/response models and query definitions. Feature tickets build feature hooks (including mutations and their invalidation), components and pages on top. They never write HTTP calls or new service files.
- **When an endpoint is missing from a service,** the feature agent raises it on the issue and the WI-5 owner (or a small follow-up ticket) adds it. This prevents two agents creating competing services for the same endpoint.

---

### ID-14. Component architecture

**Layers (PRINCIPLE).** Every piece of code belongs to exactly one layer. The physical folder layout is fixed by the folder-structure ADR. The research note proposes an `app` / `features/<feature>` / `shared` split.

| Layer | Responsibility | May depend on |
|---|---|---|
| **App** | Router/route table, providers, root and route error boundaries, layout shell | Features (through their public entry), Shared |
| **Route / page** | Reads route params and search params, picks which feature components to render, wires page-level layout. Contains almost no markup of its own and no data logic beyond calling feature hooks. | Its feature, Shared |
| **Feature components** | The UI of one feature (for example the Kanban column, the task card, the project form). Live inside their feature. | Same-feature hooks, types, utils; Shared |
| **Feature hooks** | Stateful logic of the feature: queries and mutations built on the domain service, derived state, form wiring, optimistic updates. | Domain services, Shared |
| **Domain services** (WI-5) | Endpoint functions, typed request/response models, query-key factories, read query definitions. No React rendering. | The HTTP client, the date and pagination modules |
| **Schemas** | Client-side validation schemas for forms. Mirror only fields the API defines. | Nothing UI |
| **Types** | Domain types derived from `plain.md` (VERIFIED or DOCUMENTED fields only). Optional for UNVERIFIED ones. | Nothing |
| **Shared UI** (WI-4) | Domain-agnostic primitives and state components. No domain types, no API calls. | Tokens only |
| **Shared lib** (WI-5) | HTTP client, error model, session, capability map, pagination, dates, safe-URL helper | Nothing feature-level |

**Dependency rules (PRINCIPLE):**
1. **Direction:** imports go App → Page → Feature → Domain service → Shared lib. Never the reverse.
2. **Shared never imports Features.**
3. **Cross-feature imports go only through the other feature's public entry file,** never into its internals.
4. **Allowed cross-feature use** is limited to rendering an exported component (for example Projects rendering the board exported by Tasks) or reading exported types. Business logic shared by two features moves to a domain service or Shared lib, not into either feature.
5. **No circular imports.** The import-boundary lint rules from WI-3 fail the build on a violation.
6. **One owner per file** (ID-13, ID-24).

**Extraction rules (PRINCIPLE):**
- **Split a component** when it has more than one responsibility, a region reads as its own named concept, it needs a different rendering mode or boundary (client island, lazy chunk, error boundary), or it is reused.
- **Keep it inline** when it is small, used once and has no independent concept.
- **Review trigger:** about 200 lines, or nested conditional rendering. It is not a hard limit.
- **Render states flatly:** early returns, or one subcomponent per state (loading, empty, error, success).
- **Compose with `children` and slots** rather than adding boolean props.

**Good boundaries, conceptually (PRINCIPLE):**
- **Kanban:** the Tasks page (page layer) renders the project selector, the board filters and the board.
  - The board owns the four columns and the status-change mutation.
  - A column renders a header, an "Add Task" button (shown only when the capability map allows it) and a list of task cards.
  - A task card renders its fields and a status selector.
  - Task Details is a separate modal component, opened by the route's task-ID parameter.
- **Dashboard:** one page that calls one dashboard query and passes each block's slice to its card component:
  - stat cards
  - chart card (lazy)
  - active projects card
  - tasks card
  - teams card
  - meetings card
  - recent files card

  Each card renders its own empty and error state.
- **Project form:** one form component used in create and edit mode, with the mode deciding the field set (M8, §12.6) and the submit mutation. The people picker is a separate component that loads its options on open (D5).

**Naming and export conventions (PROPOSAL (ADR), finalised in WI-3):**
- PascalCase component names matching the file. `use` prefix for hooks.
- Domain names from the glossary in Further Notes.
- Each feature exposes one public entry. No other file in a feature is importable from outside.
- Named exports. Default exports only where a framework convention requires them (for example route modules).

### ID-15. Hooks and effects

**PRINCIPLE (from react.dev, sources in the research note §2):**
- **Rules of Hooks:** call hooks only at the top level of a component or custom hook. Never conditionally, in loops, in nested functions, after an early return, or inside event handlers. The React Hooks lint rules are mandatory and must pass (AGENTS.md §7).
- **Custom hooks** encapsulate reusable stateful logic. They are named `use<Thing>` and return data and actions, not JSX.
- **Effects are for synchronising with external systems only**, for example a browser API subscription, the multi-tab session channel, or the OTP countdown timer.
- **Data fetching never happens in a raw effect.** It uses the data-fetching layer (ID-19), which handles caching, deduplication, race conditions and cancellation.
- **Derived values are computed during render, not stored in state.** Don't copy props or query data into state unless the user is editing a draft, as in forms.
- **Every effect that subscribes or starts something cleans up:** listeners, timers, channels and abort controllers.
- **Stale closures:** effects list their dependencies honestly. Values needed inside an event but not as triggers are read at event time, not captured.
- **No state duplication:** one source of truth per value. Server data lives only in the server-state cache.

### ID-16. Rendering model and client/server boundaries

ESTABLISHED: AGENTS.md §3 rules apply to whichever framework is chosen.

The framework is chosen in WI-2. The research note gives a **proposal and a runner-up that depend on the token-storage ADR** (ID-20.1):

| If the ADR decides… | Then the PROPOSAL is… | Rendering rules that apply |
|---|---|---|
| Token storage readable by JS is acceptable, with mitigations | Vite + React SPA with React Router in data mode | **SPA rules:**<br>• All rendering is client-side.<br>• Every route is lazily loaded.<br>• No server secrets exist anywhere in the bundle; only `VITE_`-prefixed public config, which is the API base URL and the bot-protection sitekey.<br>• Route-level error boundaries.<br>• The router holds rendering until the session check settles (ID-20.2).<br>• Next.js Server Component rules do **not** apply. |
| The token must be held server-side in an HttpOnly cookie (backend-for-frontend) | Next.js App Router with Route Handlers as the BFF | **App Router rules:**<br>• Server Components are the default.<br>• `"use client"` goes on the smallest interactive leaf, never on the root layout or a whole feature subtree.<br>• Providers live in one client providers component that wraps `children`.<br>• Props crossing the boundary are serialisable.<br>• Token and API modules are marked server-only.<br>• Only `NEXT_PUBLIC_` values reach the browser.<br>• Auth checks happen in a server-side data access layer. The proxy/middleware check is optimistic only.<br>• Route Handlers are treated as public endpoints. |

- **Not recommended:** Next.js with a client-held bearer token. It adds the server/client model with no security or data benefit.
- **Static export is unsuitable either way:** it loses dynamic project and task routes.

### ID-17. Rendering, state ownership and re-rendering

**PRINCIPLE:**
- **State ownership:**
  - **Server data** lives only in the server-state cache.
  - **URL state** holds anything shareable or reloadable: projects list search, filter and page; selected project on the Tasks page; the open task ID.
  - **Local component state** holds UI-only values: an open menu, a draft form.
  - **The global client-state set is small:** the session (status, user, role), the toast queue, and the multi-tab channel.

  **No global state library is added for the MVP** unless the state-management ADR shows a need.
- **Prop drilling vs context:**
  - Pass props one or two levels.
  - Use context only for app-wide, rarely changing values: session, capability lookup, toast dispatcher, theme tokens if needed.
  - Never put server data in context.
  - Split contexts so that a frequently changing value doesn't re-render unrelated consumers.
- **Memoisation:**
  - No `React.memo`, `useMemo` or `useCallback` by default.
  - Add them only to fix a measured problem, or where a library requires stable references.
  - PROPOSAL (ADR): enable the React Compiler, which is stable, and keep manual memoisation exceptional.
- **List keys** are stable domain IDs, never array indexes for reorderable data such as Kanban cards and lists.
- **Forms:**
  - Inputs bound to the form library are controlled or registered.
  - File inputs are uncontrolled.
  - Draft state lives in the form, not in the server-state cache.
- **Error boundaries:**
  - One root boundary, giving a safe full-page fallback.
  - One per route.
  - Block-level boundaries around independently failing widgets: the lazy chart, each dashboard card group, the Task Details modal.
  - Boundaries catch rendering errors only. API errors are handled as states (ID-19).
- **Suspense and lazy:**
  - Suspense boundaries wrap lazily loaded routes and heavy widgets, with skeleton fallbacks.
  - PROPOSAL (ADR): data views use non-Suspense queries (they need cancellation, conditional enabling and placeholder data). Suspense is for code loading.

### ID-18. Performance and loading architecture

Extends ID-10. **PRINCIPLE** unless marked otherwise.

| Topic | Requirement |
|---|---|
| Route splitting | Every route is its own lazily loaded chunk. The public auth routes don't load any authenticated feature code. |
| Feature-level lazy | Only for genuinely heavy or non-critical code: the chart library, the Task Details modal body, and drag-and-drop if adopted. Small or above-the-fold components are **not** lazy-loaded. |
| Initial JavaScript | The first load contains the app shell, router, session layer and the current route only. No feature data or chart code on first paint of auth pages. |
| Startup data | Only the session check (`/auth/me`). No projects, tasks, files, meetings or notifications are requested at startup. |
| Screen data | Each screen requests only its data, when mounted. The Dashboard uses exactly one dashboard request and **never** triggers Tier 2 endpoints (notifications, meetings list, files list, search). |
| On-demand data | People-picker options (D5), the edit-form pre-fill and the teams options load only when their picker, modal or form opens. |
| Deduplication | One cache entry per query key. Sibling components that need the same data share it; they never issue duplicate requests. |
| Caching and revalidation | PROPOSAL (ADR):<br>• Global stale time about 30 s.<br>• Session data stale until invalidated.<br>• Refetch on window focus for lists and the board.<br>• Mutations invalidate exactly their affected keys (ID-6).<br>• No polling in Tier 1. Notifications polling is Tier 2. |
| Cancellation | Every query passes the library's abort signal to the HTTP client. Leaving a screen or changing a search term cancels the stale request. Superseded responses never update the UI. |
| Pagination | Lists use server pagination (default 15). Previous-page data stays visible while the next page loads. Kanban columns are not paginated by the API. **Virtualisation is not added** unless a measured board or list is slow. |
| Images | Avatars have explicit dimensions and lazy loading below the fold, with an initials fallback. |
| Fonts | D4. PROPOSAL (ADR): self-hosted Inter variable font plus Rubik 400 (latin), or the framework's font loader. |
| Dependencies | One library per responsibility, smallest set, each justified in the dependencies ADR. |
| Chunk-load failure | After a redeploy, a failed chunk load shows a "new version available, reload" message instead of a blank screen. |
| Budget | PROPOSAL (ADR): a bundle-size check in CI using the framework's analyser. The numbers are set in the performance ADR. |

### ID-19. API architecture and error model

Extends ID-6 and ID-8. **PRINCIPLE.**

**Architecture:**
- **One HTTP client** with these responsibilities:
  - joining the base URL and path;
  - mandatory `Accept: application/json`;
  - JSON or multipart body serialisation;
  - attaching the credential (bearer header, or nothing if a BFF holds it);
  - passing the abort signal;
  - a request timeout (value set in the API-layer ADR);
  - envelope unwrapping;
  - error normalisation.
- **No other code calls the network,** and no component calls it directly.
- **Per-domain services:** each endpoint is defined once, with typed request and response models (ID-14).
- **Response parsing:**
  - The client recognises the envelope variants recorded in `plain.md`: with or without `message` (for example `/dashboard`, `/users`), and `data: null`.
  - The pagination module normalises P1–P4.
  - The date module parses all four date formats.
  - No endpoint is assumed to share another's shape.
- **Serialisation:** dates are sent in the format `plain.md` records for each field. Optional empty fields are omitted. Multipart is used only where the contract says so (profile update with avatar; files in Tier 2).

**The application error model.** Every failure becomes one error type with a `kind`:

| `kind` | Trigger | Carries |
|---|---|---|
| `network` | No response: offline, DNS, CORS block | Nothing else |
| `timeout` | The client's timeout elapsed | Nothing else |
| `aborted` | Cancelled by navigation or a superseded request | Never shown to the user |
| `bad_request` | 400 | Server `message` |
| `unauthorized` | 401 | Nothing shown |
| `forbidden` | 403 | Server `message` |
| `not_found` | 404 | Nothing else |
| `conflict` | 409, only if `plain.md` documents it for an endpoint | Server `message` |
| `validation` | 422 | Field map `errors.{field}[]` and `message` |
| `rate_limited` | 429 | `retryAfterSeconds`, only if a readable `Retry-After` header is present |
| `server` | 5xx | Status. The message is replaced with a generic one. |
| `unexpected` | A response that doesn't match the documented envelope | Logged as a contract mismatch |

**Behaviour per kind:**
- **401:**
  - The session layer clears the token and all cached data, broadcasts sign-out to other tabs, and redirects to Sign in with a same-origin return path.
  - **Loop guard:** the redirect happens once per session loss, and never from the auth pages themselves. A 401 on `/auth/login` is a credential failure, not a session loss.
  - Concurrent 401s collapse into one redirect.
- **403:**
  - The user stays signed in.
  - Mutations show "You don't have permission to do this." and roll back any optimistic change.
  - Pages show the access-denied state.
  - It is never silently swallowed or turned into an empty state.
- **422:**
  - Map `errors.{field}[0]` to the matching input. Unknown field keys and non-field messages go to the form-level alert.
  - Keep every value the user entered. Focus the first invalid field.
- **429:**
  - Show "Too many attempts. Please wait and try again."
  - When `Retry-After` is readable, show a countdown and keep the submit action disabled until it ends.
  - Never invent a wait time. The backend currently doesn't expose the header through CORS (BR-6).
  - No automatic retry of a 429.
- **5xx:**
  - Show a safe generic message with no stack, path, SQL or server text.
  - **Automatic retry only for safe, idempotent reads (GET):** at most 2 retries with backoff (PROPOSAL (ADR) numbers).
  - **Mutations never retry automatically.** The user gets a retry button, and the form keeps its data.
- **network / timeout:**
  - "Connection problem. Check your connection and try again", distinct from server errors.
  - Reads may retry within the same bounded policy.
  - Mutations are never resubmitted automatically. The in-flight guard (ID-22) prevents duplicates.
- **aborted:** ignored silently.
- **unexpected:** a generic error to the user. A contract-mismatch report (below) for developers.

**Optimistic updates:**
- **Used only where the spec asks for it:** the Kanban status change.
- **Pattern:** cancel in-flight reads of the board, snapshot, apply, roll back on error, then revalidate when settled.
- **Everything else** (create, edit, delete, reassign) waits for the server before updating the cache.

**Contract mismatches:**
- **When a response contradicts `plain.md`,** the agent stops and reports it on its ticket with the endpoint anchor, the expected and observed shape (sanitised) and the evidence. The `plain.md` owner fixes the document, and if needed the domain-service owner fixes the service.
- **No local workaround** (optional chaining over an invented field, a second service, a hard-coded fallback value) is merged without that report.
- **No undocumented error format is assumed.** Only `{success, message, errors}` and the observed 401/404/405/422 bodies are handled specifically, plus the 403 body once D10 verifies it. Anything else falls to `unexpected`.

### ID-20. Application security

The research and sources are in `docs/research/security.md`. Responsibilities follow its §9 matrix:
- **Frontend:** this repo.
- **Backend:** the existing Laravel team. **Not modified by this project.**
- **Hosting:** the deployment target, chosen in an ADR.

#### ID-20.1 Token storage (PROPOSAL (ADR), decides the framework)

| Option | Verdict in research |
|---|---|
| **Backend-for-frontend:** a same-origin server keeps the Sanctum token; the browser holds an encrypted `__Host-` cookie that is HttpOnly, Secure and SameSite=Strict | **Proposed primary.** The token is unreachable by XSS. There is a precedent: the reference site did this against the same API. Costs:<br>• a server runtime;<br>• an allowlisted proxy;<br>• CSRF defence on every state-changing route;<br>• backend trust for the forwarded client IP (BR-4). |
| Memory, plus `sessionStorage`; `localStorage` only when "Remember Me" is checked | **Proposed fallback.** It is the simplest and fits a static SPA. OWASP advises against JS-readable token storage, so it is acceptable only with all seven mitigations in the research note:<br>• strict CSP;<br>• no third-party scripts;<br>• no unsafe HTML;<br>• a finite backend token lifetime (BR-2);<br>• clearing on logout, 401 and reset;<br>• a minimal dependency tree;<br>• no token in URLs or logs. |
| Memory only | Rejected: no refresh token exists, so every reload would sign the user out. |
| `localStorage` always | Rejected: widest exposure. |
| Sanctum SPA cookie auth | Unavailable: backend CORS disallows credentials and the domains differ. |

**Framework dependency:** the chosen option selects the framework (ID-16). The ADR must document the decision and the accepted residual risk.

#### ID-20.2 Session behaviour (PRINCIPLE)

- **Session states:**
  - The session has three states: `unknown`, `authenticated` and `anonymous`.
  - Protected UI renders only in `authenticated`. `unknown` shows a neutral loading shell, so there is no flash of sign-in or of protected content.
  - Auth pages redirect away only from `authenticated`.
- **Restore on reload:** call `/auth/me`. A 401 → `anonymous`.
- **Expiry:** no client-side expiry timer is invented. Any 401 is treated as expiry. The real lifetime is a backend setting (BR-2).
- **Logout:** call the logout endpoint, then always clear credential, cache and session state, and broadcast.
- **Password reset:** clear any local session and send the user to Sign in. The backend has revoked every token, so other devices hit a 401.
- **Multi-tab:**
  - Tabs broadcast `signed-in` and `signed-out` events only, never the token.
  - Receiving tabs clear their caches and redirect or refresh.
- **Route protection:**
  - Client guards are UX only. The server authorises every request.
  - Return paths are same-origin relative paths only (no open redirect).

#### ID-20.3 Login, registration and brute-force protection

**VERIFIED (backend):**
- The password-reset endpoints share **10 requests/min per IP**.
- OTP rules (ID-21).
- `remember` exists.

**UNKNOWN (backend):**
- login and registration throttling;
- any lockout;
- the 429 body;
- whether login errors are generic;
- token lifetime.

**Evaluation of the candidate policy "10 failed logins → 15-minute restriction":**
- A hard lock keyed by account lets anyone lock any known email (lockout DoS), and can reveal which accounts exist.
- Keyed by email + IP, it doesn't stop distributed guessing or password spraying.
- It is within NIST's ceiling of 100 failures. Its weakness is the key it uses and its binary lock, not its strictness.

**PROPOSAL (ADR), filed as backend requirement BR-3.** Every number is configuration.

| Layer | Rule |
|---|---|
| Per email + IP | Count failures only. After 5, progressive backoff from 60 s, doubling, capped at 15 min. Reset on success. |
| Per IP across accounts | For example 30 failed logins per 10 min, then 429. Plus a coarse request ceiling. |
| Per email across IPs | After 10 failures in 15 min, a **soft lock**: a bot challenge plus backoff, not a hard block. Hard-disable only near 100, with recovery through password reset. |
| Registration | Per-IP limit (for example 5 per hour) plus a bot challenge. |
| Messages | One generic message ("Invalid email or password"). Identical 429 behaviour for existing and unknown emails. |
| Headers | `Retry-After`, exposed through CORS (BR-6). A documented 429 body. |
| Behind a BFF | IP-keyed limits use the real client IP from a trusted forwarded header (BR-4). |

**Frontend role (PRINCIPLE):**
- Present 429 (ID-19).
- Disable submit while a request is in flight.
- Show generic credential errors.
- **No client-side attempt counter is presented or relied on as a security control.**

#### ID-20.4 Bot protection

- **PROPOSAL (ADR):** Cloudflare Turnstile in Managed mode. Reasons: lowest friction, free tier, smallest CSP footprint, test keys that work on localhost.
- **Placement:**
  - always on Register and Forgot Password; Resend uses the same endpoint;
  - on Login as step-up when the backend signals risk, or always if it can't signal;
  - not on Verify OTP at first, because the 5-attempt lock and the 10/min limit already apply.
- **Transport and verification (BACKEND REQUIREMENT BR-5):**
  - The token travels in a JSON body field named by the backend.
  - The backend calls Siteverify with the **secret** (never in the client), the real client IP and an idempotency key on retries.
  - It checks `success`, `hostname` and `action`, and fails closed.
  - Throttling (ID-20.3) still applies.
- **Frontend:**
  - Render the widget with the public sitekey.
  - Send the single-use token once, then reset the widget after each submit and on expiry.
  - Handle widget errors accessibly.
- **CRITICAL RULE (PRINCIPLE):**
  - A widget alone protects nothing.
  - The current backend has no verification field, so this is a **blocker**.
  - The frontend must **not** ship the widget or any "verify you're human" UI until BR-5 exists. It is kept behind a disabled configuration flag and recorded as blocked.

#### ID-20.5 Browser and application security (PRINCIPLE, values by ADR)

| Topic | Requirement |
|---|---|
| XSS | React escaping only. **`dangerouslySetInnerHTML` is banned** (lint-enforced if the tooling supports it). AI summaries and all API text render as text. No `eval`, no string timers, no `innerHTML`. |
| Safe URLs | Every URL from data (`meeting_link`, `avatar_url`, `download_url`, file links) passes one shared safe-URL helper. It allows `https:`, plus `mailto:` where intended; anything else renders as plain text. External links get `rel="noopener noreferrer"`. |
| CSP | A header-based policy on the Vercel deployment (WI-3), rolled out report-only first. Minimum:<br>• `default-src 'self'`; `object-src 'none'`; `base-uri 'none'`; `frame-ancestors 'none'`; `form-action 'self'`; `upgrade-insecure-requests`<br>• `script-src`: `'self'` for an SPA, or a nonce with `'strict-dynamic'` for a Next.js BFF (which forces dynamic rendering)<br>• `connect-src`: `'self'` plus the API origin for an SPA<br>• `img-src`: `'self'`, `data:`, `blob:` and the avatar host<br>• Turnstile origins only once BR-5 ships |
| Security headers | HSTS (≥1 year, include subdomains); `X-Content-Type-Options: nosniff`; `Referrer-Policy` (`no-referrer` on auth/reset pages); `Permissions-Policy` disabling camera, microphone and geolocation; `Cross-Origin-Opener-Policy: same-origin`; no `X-Powered-By`. These are a hosting/BFF responsibility, configured in WI-3. |
| CSRF | Not applicable to direct bearer-header calls. **Mandatory for a BFF:** SameSite=Strict, plus rejecting cross-site `Sec-Fetch-Site` or a mismatched `Origin`, plus a required custom header on every non-GET route. No state change over GET. |
| CORS | Nothing to configure on the frontend. The wildcard origin, `Max-Age: 0` and missing exposed headers are backend items (BR-6). |
| HTTPS | HTTPS everywhere except localhost. The API base URL is `https://`. |
| Input validation | Client validation is UX (ID-22). The backend is authoritative. Inputs are trimmed and bounded per the contract. |
| Secrets and env | Only public values carry the public prefix: API base URL (SPA), sitekey. Never in the client: Turnstile secret, BFF cookie/encryption keys, the upstream URL in a BFF. `.env*.local` files are git-ignored. |
| Sensitive data | No token, password, OTP or email in URLs, `console`, analytics or error reports. The OTP and email travel through the recovery flow in memory, not the query string. Any error-reporting tool (its own ADR) scrubs the `Authorization` header and auth request bodies. No analytics on authenticated pages unless an ADR approves them. |
| File handling | Tier 2 for files. In Tier 1, the avatar only.<br>• Client checks are UX only: avatar jpg/jpeg/png/webp, at most 2 MB and 4000×4000; files at most 20 MB.<br>• Downloads use an authenticated fetch saved as a Blob, with the object URL revoked afterwards.<br>• Never render uploaded HTML or SVG inline.<br>• Server-side enforcement is BR-8. |
| Dependencies | Committed lockfile. CI uses a clean install plus a high-severity audit and a signature check. Dependency graph and security alerts enabled on the public repo. Minimal, justified dependencies. No third-party runtime scripts except an approved bot widget. |

#### ID-20.6 Backend requirements and reports (BACKEND REQUIREMENT)

These are raised with the backend team. They are **not** built or worked around in this project. Details are in the research note §10.

| ID | Requirement |
|---|---|
| BR-1 | Remove Laravel Boost from production and confirm debug mode is off. |
| BR-2 | Finite token lifetimes, plus a `remember` policy. |
| BR-3 | Layered, configurable login and registration throttling with generic errors and a documented 429. |
| BR-4 | Trust the forwarded client IP from a BFF only. |
| BR-5 | Turnstile verification on register, forgot-password and login (step-up). |
| BR-6 | CORS origin allowlist, exposed `Retry-After` and `Content-Disposition`, non-zero `max_age`. |
| BR-7 | Fix the Google OAuth redirect, or disable it. |
| BR-8 | Server-side upload limits on every path, plus `attachment` and `nosniff` on downloads. |
| BR-9 | Document whether a password change revokes other tokens. |
| BR-10 | Remove `X-Powered-By`. Return a 401 JSON response without depending on `Accept`. Decide on registration account enumeration. |

### ID-21. Authentication and password-recovery contract

**VERIFIED or DOCUMENTED backend behaviour (`api-inventory.md`, spec, D3).** The frontend follows it exactly.

| Rule | Value |
|---|---|
| OTP format | 6 digits, numeric |
| OTP validity | 10 minutes (`expires_in_minutes`), single use. A new code invalidates the old one. |
| Resend | Blocked for 60 seconds per email |
| Verification attempts | Locks after 5 wrong attempts |
| Rate limit | Forgot, verify and reset share 10 requests/min per IP |
| Account existence | Forgot-password returns the same public response for known and unknown emails. Inactive accounts get no code. |
| Reset effect | Revokes all of the user's tokens |
| Login | `remember` is accepted. No expiry field and no refresh token. |

**Frontend obligations:**
- Never reveal whether an account exists: same screen and wording for any well-formed email.
- Keep the email and OTP in memory, not in the URL.
- Run the expiry and resend countdowns from the server's values. The 60-second resend wait is a documented constant, and it is shown only as UX, not as enforcement.
- Show the server's 422 `otp` messages for wrong, expired or locked codes.
- After a reset, send the user to Sign in. Don't sign them in automatically.

**Distinguish (PRINCIPLE):** recovery rules are verified backend behaviour. Login and registration throttling is **unknown**. The ID-20.3 policy is a **proposal for the backend**, not current behaviour. The UI must never claim a lockout or wait time that the server hasn't returned.

### ID-22. Forms and validation

**PRINCIPLE:**
- **Two validation layers:**
  - Client-side schema validation for fast feedback, mirroring only the contract's rules (required fields, lengths, formats, `deadline ≥ start_date`) and the reference-site messages (D3).
  - The backend 422 is authoritative. When they disagree, `plain.md` is corrected and the schema follows. Two contradictory rule sets are never kept.
- **Required vs optional** comes from `plain.md` per request, not from the Figma field set (M8, M9).
- **Submit states:** the submit button shows a pending label and is disabled while a request is in flight. A second activation does nothing (in-flight guard). On success, the form closes or resets as specified. On failure, values are kept.
- **Errors:**
  - Field errors show under the field, linked with `aria-describedby`, and set `aria-invalid`.
  - Form-level errors go in a `role="alert"` region above the submit button.
  - Focus moves to the first invalid field.
- **Recoverable input:** preserved across 422, 429, 5xx and network failures. Cleared only on success or explicit cancel.
- **Library:** PROPOSAL (ADR): react-hook-form 7 with zod 4 and the official resolver. The research found it maps 422 field errors directly. The ADR confirms version compatibility. No form library is installed before that.

### ID-23. UI states and accessibility conventions

Extends ID-8 and ID-11. Visuals are in `figma.md` §12.10 and are built only from existing Figma components (D3).

| Convention | Rule |
|---|---|
| Loading skeleton | Same shape and size as the content. A subtle pulse; respect reduced motion. Announce busy regions (`aria-busy`). |
| Empty | In-card icon circle, one-line message, an action only if permitted. |
| Error (block) | Generic message plus Retry. Never shows technical details. |
| Permission denied / unauthorized / not found | As ID-19. Page-level states reuse the empty-state layout. |
| Success feedback | Toast in a polite live region. Self-dismisses after about 4 s, with a close button, and pauses on hover and focus. |
| Confirmation dialog | Task delete. The title names the action and object. The destructive button is styled red and is **not** the default focus; focus starts on Cancel. Escape cancels. |
| Modals | Focus moves into the modal on open and is trapped. Escape closes (unless a submit is in flight). Focus returns to the trigger on close. Background inert. Full-screen below 768. |
| Keyboard | Everything operable by keyboard. Visible focus ring in the primary colour. Menus support arrow keys and Escape. The status selector is a native-semantics select or an ARIA listbox. |
| Screen readers | Every icon-only button has an accessible name. Tables and lists use semantic elements. Status and priority are text, not colour alone. |
| Semantics | Landmarks (`header`, `nav`, `main`). One `h1` per page. Ordered headings. |
| Contrast | WCAG AA. Failing Figma colour pairs are reported on the ticket, not silently changed (ID-11). |
| Responsive | `figma.md` §12.11 (A3). Typography unchanged across widths (D4). |

### ID-24. Multi-agent engineering boundaries

**PRINCIPLE (extends AGENTS.md §6):**
- **Every agent reads, in order:**
  1. `AGENTS.md`;
  2. its ticket;
  3. only the spec ID sections the ticket lists;
  4. only the `plain.md` anchors the ticket lists;
  5. its assigned Figma node IDs, fetched once and reused (canonical layers per `figma.md` §1.3).
- **No agent reads the Postman collection** except the WI-1 owner.
- **Each ticket declares the files or areas it owns.** An agent edits only those. Shared surfaces have one owner (ID-13).
- **Forbidden for feature agents:**
  - replacing or forking the HTTP client, error model, session layer, capability map, design tokens or UI primitives;
  - adding a UI, state, data, form or HTTP library;
  - creating a second service for an existing endpoint;
  - changing an approved architecture decision.
- **Reporting:**
  - Contract mismatches follow ID-19.
  - Needed shared-surface changes are raised on the issue, and the ticket stops for that part.
  - Architectural conflicts are reported, not resolved locally.
- **Every ticket contains:** its phase (foundation or full implementation) and review gate; goal; scope and exclusions; spec sections; `plain.md` anchors; Figma nodes; dependencies; file ownership; acceptance criteria; testing; Definition of Done (AGENTS.md §7 plus ticket-specific items).

## Testing Decisions

- **What makes a good test:**
  - It exercises behaviour a user or a calling module can observe: rendered text, enabled actions, requests made and their payloads, navigation.
  - It does not test internal state, hooks or component structure, and it survives refactors that keep behaviour the same.
  - It queries the UI by role and label, the way users and assistive technology do.
- **No fictional data:** fixtures contain only fields `plain.md` records as VERIFIED or DOCUMENTED. A test never asserts an UNVERIFIED field as present. Mocks and fixtures exist only in test code (AGENTS.md §7).
- **Tools:** chosen in the testing ADR. PROPOSAL (ADR):
  - Vitest with a DOM environment;
  - Testing Library;
  - MSW for network-boundary mocking;
  - Playwright for end-to-end.

### Test layers

| # | Layer (seam) | What it covers | Notes |
|---|---|---|---|
| 1 | **Unit: pure shared modules** | • The HTTP client's envelope handling and error normalisation: every `kind` in ID-19, using the observed 401/404/405/422 bodies, the 403 body once verified, and synthetic network/timeout/abort cases.<br>• The pagination normaliser (P1–P4).<br>• The date parser (four formats).<br>• The capability map (each role × capability).<br>• The safe-URL helper.<br>• The return-path sanitiser (same-origin only). | Deep modules with small interfaces; test through the interface. |
| 2 | **Component and screen: the primary seam** | A route rendered as a user reaches it, with HTTP intercepted at the network boundary:<br>• the loading, empty, error, 401, 403, 404 and success states;<br>• capability gating per role;<br>• request payloads (only contract fields);<br>• 422 mapping onto fields with input preserved;<br>• 429 messaging (with and without `Retry-After`);<br>• duplicate-submit prevention;<br>• optimistic Kanban rollback;<br>• accessibility basics (labels, focus on error, dialog focus trap, automated axe check). | One seam for all feature behaviour. |
| 3 | **Integration: workflows across screens** | • Sign in → protected route → reload restore → sign out.<br>• A 401 mid-session → redirect → return path.<br>• Forgot → Verify (expiry and resend timers with fake time) → Reset → Sign in.<br>• Create project → appears in the list.<br>• Create task in a column → Task Details → edit → delete with confirmation.<br>• Multi-tab sign-out broadcast. | Still mocked at the network boundary. |
| 4 | **End-to-end acceptance: real backend** | The Tier 1 acceptance criteria (Further Notes), as Administrator and Project Manager. Team Member is required but blocked (D6). | **Read-only flows can run once the app exists.** Any flow that creates, edits or deletes records needs explicit user approval of the test accounts, test-data naming and cleanup first. Until then, write-based e2e tests are marked pending. Runs in the cloud environment against a Vercel Preview deployment. Credentials come from the cloud environment's or Vercel's secret store, or a git-ignored env file inside the cloud environment, and are never committed or logged. |
| 5 | **Security-focused checks** | • UI authorisation: Team Member UI hides create/edit/delete, and a forced 403 is handled.<br>• No `dangerouslySetInnerHTML` (lint).<br>• No token, OTP or email in any URL during the auth flows.<br>• No token in `console` output.<br>• Session cleared after logout, after a 401 and after a reset.<br>• Unsafe-scheme links render as text.<br>• Build output contains no non-public env values.<br>• CI dependency audit passes.<br>• The CSP report-only check runs clean on the main flows. | Mostly layers 1–3, plus CI checks. |
| 6 | **Regression after shared-foundation changes** | Any change to a WI-3/WI-4/WI-5/WI-6 shared surface reruns the full layer 1–3 suite. Ownership changes need the owner's review. | CI runs the whole suite on every PR. |

### Modules tested

- **Every Tier 1 feature,** through layers 2 and 3.
- **Shared modules,** through layer 1.
- **Dedicated behaviour tests:**
  - the auth flows (OTP expiry and resend timers);
  - the Kanban status change with rollback;
  - the people pickers (lazy load, dedupe).

**Prior art:** none, because the repository has no code yet. WI-3 sets up the runner and a first example test for each layer, which later tickets copy.

---

## Out of Scope

- **Excluded features:** real-time chat and Reverb, Google sign-in, the AI Assistant, Reports, administration (users, AI settings, audit logs), project deletion, and languages other than English or right-to-left layouts (D1, D8, D9).
- **Tier 2 implementation:** meetings and AI summaries, notifications, team management, files, global search. Specified at outline level only. Their permissions (A1) must be confirmed before their tickets.
- **Unsupported design elements:** anything the API can't support, as listed in the register. Examples: task comments, progress %, reviewer, task start date, recordings and timestamped transcripts, direct messages, recent searches persisted on the server.
- **Backend changes:** none. Backend defects (the Google redirect, Laravel Boost running in production, unpublished Reverb configuration) are reported to the backend team and not worked around.
- **This document is not the API documentation** (WI-1) and not the ADRs (WI-2).

---

## Further Notes

### Delivery sequence: Tier 1 work items (revised in the engineering review)

| WI | Title | Type | Blocked by | Output | Owns (areas; exact paths fixed in WI-3) | Phase and gate |
|---|---|---|---|---|---|---|
| **WI-1** | **API contract documentation** | Documentation only | none | `docs/api/plain.md` per ID-12, including the D10 read-only verification | `docs/api/` | Foundation (#1), Gate 1 (#12) |
| WI-2 | Architecture research and ADRs | Research and documentation only | none to start. The API-layer and auth ADRs are finalised after WI-1. | ADRs in `docs/adr/` (list below), each with sources, alternatives and the residual risk. **The user's review is the gate.** | `docs/adr/`, `docs/research/` | Foundation (#2), Gate 1 (#12) |
| WI-3 | Implementation conventions and project scaffold | Conventions document plus the empty scaffold | WI-2 (ADRs approved) | • A conventions addendum: folder layout, naming, exports, import-boundary rules, the service/hook/query-key pattern, the ticket and PR template.<br>• A runnable empty app with build, type-check, lint (hooks rules, import boundaries, the unsafe-HTML ban), the test runner with one example test per layer, CI (clean install, audit, tests), the env-variable schema, and security headers/CSP on the host config. | Root config, dependency manifest and lockfile, CI, the env schema, the conventions doc | Foundation (#3), Gate 1 (#12) |
| WI-4 | Shared UI and design-system foundation | Shared surface | WI-3 | Tokens, typography (D4), every primitive in ID-13, the state components and confirmation dialog (ID-23), the block error boundary | Shared UI area, tokens, fonts | Foundation (#4), Gate 1 (#12) |
| WI-5 | API, data and session foundation | Shared surface | WI-1, WI-3 | • The HTTP client and error model (ID-19), pagination and date modules, the safe-URL and return-path helpers.<br>• The session layer (ID-20.2, the token-storage ADR) and the capability map (ID-2).<br>• **All Tier 1 domain services**, typed from `plain.md`, with query keys and read queries. | Shared lib area, domain-service modules | Foundation (#5), Gate 1 (#12) |
| WI-6 | App shell and authentication | Vertical slice | WI-4, WI-5 | Route table with lazy routes, providers, root and route error boundaries, navbar (D7), user menu, route protection, Sign in, Sign up, Forgot, Verify and Reset password | App area, auth feature | Foundation (#6), Gate 1 (#12) |
| WI-7 | Dashboard | Vertical slice | WI-6 | Dashboard per ID-5, M13–M16, M20, M31, M33 | Dashboard feature, dashboard route | Full implementation (#7), blocked by Gate 1 (#12) |
| WI-8 | Projects | Vertical slice | WI-6 | List, details (Overview), create and edit, people picker for members (D5) | Projects feature, project routes | Full implementation (#8), blocked by Gate 1 (#12) |
| WI-9 | Tasks and Kanban | Vertical slice | WI-6 | Board on the project Tasks tab and the Tasks page, status selector with rollback, create/edit/details/reassign/delete, assignee picker (D5) | Tasks feature, Tasks route. Exports the board component that Projects mounts. | Full implementation (#9), blocked by Gate 1 (#12) |
| WI-10 | Profile | Vertical slice | WI-6 | Overview, Tasks tab, settings (fields, avatar, Security card) | Profile feature, profile routes | Full implementation (#10), blocked by Gate 1 (#12) |
| WI-11 | Tier 1 integration and acceptance | Verification | WI-7, WI-8, WI-9, WI-10, and the user's test-data approval | End-to-end acceptance against the real API, the security checks (test layer 5), and a defect list | End-to-end tests, the acceptance report | Full implementation (#11), last before Gate 2 (#13) |

**The project Tasks tab:** WI-8 owns the project details page and its tabs. The Tasks tab mounts the board component exported by WI-9 through the Tasks feature's public entry (ID-14, rule 4). Until WI-9 lands, WI-8 shows the Overview tab only. This needs no shared-file conflict.

**Planned ADRs (WI-2).** These cover AGENTS.md §8 and the security items of ID-20:

| ADR | Decides |
|---|---|
| ADR-01 | Authentication, token storage and session (ID-20.1 and ID-20.2). **Decides the framework.** |
| ADR-02 | Framework and rendering model (ID-16) |
| ADR-03 | Folder structure and import boundaries (ID-14) |
| ADR-04 | Component architecture, styling and UI-kit approach |
| ADR-05 | API layer, data fetching, caching, retry and timeout (ID-18, ID-19) |
| ADR-06 | State management (ID-17) |
| ADR-07 | Routing, loading and error boundaries |
| ADR-08 | Forms and validation (ID-22) |
| ADR-09 | Performance: fonts, charts library, React Compiler, bundle budget |
| ADR-10 | Testing strategy and tools |
| ADR-11 | Dependencies, versions and tooling: TypeScript 6 vs 7, ESLint 9 with jsx-a11y vs ESLint 10 |
| ADR-12 | Browser security and deployment: CSP, headers, Vercel configuration, Preview and Production environments. **The host is fixed to Vercel** (user decision, "Deployment environment" below). |
| ADR-13 | Bot protection and the throttling requirements requested from the backend (ID-20.3, ID-20.4, BR list) |

**What can run in parallel:**
- WI-1 and WI-2 start together.
- WI-4 and WI-5 run together after WI-3, because their owned areas don't overlap.
- WI-7, WI-8, WI-9 and WI-10 run together after Gate 1 is approved.

**Critical path:**
WI-2 research → **the user's ADR review** → WI-3 → WI-4 and WI-5 → WI-6 → **Gate 1 (#12)** → the four slices → WI-11 → **Gate 2 (#13)** → **the user's Production approval**.

**Two-day realism:**
- **Day 1:** WI-1 and WI-2 in parallel, the ADR review, WI-3, then WI-4 and WI-5.
- **Day 2:** WI-6 early, Gate 1, the four slices, WI-11, then Gate 2.
- **Main schedule risks:**
  1. ADR review time. **ADR-01 alone decides the framework,** and a BFF adds server work.
  2. Write-based acceptance waits for the test-data approval.
  3. Team Member verification stays blocked (D6).
  4. Backend security requirements (BR-n) are outside this project's control.
  5. Gate review and correction rounds. Gate 1 can't start until all six foundation tickets are done.
- **If time runs short, protect:** authentication, the Projects list and details, the Kanban status change and task create. Dashboard polish and profile settings can be trimmed. No Tier 2 work starts before Gate 2 is approved.

### Delivery workflow and review gates

The binding rules are in AGENTS.md §10. This section applies them to the published tickets. Development has **two mandatory Claude Opus review gates**: Gate 1 for the foundation and Gate 2 for the whole project. There are no fixed-size batches and no per-feature or per-group reviews.

**Phase 1: the foundation group** (label `foundation`, reviewed at Gate 1, issue #12)

The group was chosen from the real dependency graph. It holds every ticket whose output many later tickets reuse or depend on:

| Issue | WI | Why it is foundational | Starts |
|---|---|---|---|
| #1 | WI-1 API contract | `plain.md` is the only API reference for #5–#11. Every service type, fixture and acceptance check derives from it. | Now (documentation) |
| #2 | WI-2 ADRs | Every implementation ticket follows them. The user's approval lifts `adr-gate`. | Now (research) |
| #3 | WI-3 conventions and scaffold | Root config, lockfile, CI, lint boundaries, the env schema and the Vercel header/CSP config. Every later ticket builds on them and must not edit them. | After ADR approval |
| #4 | WI-4 shared UI | Tokens, typography and primitives for every screen in #6–#10. | After WI-3 |
| #5 | WI-5 API, data and session | HTTP client, error model, session layer, capability map and all Tier 1 domain services. #6–#10 consume them and must not fork them. | After WI-1 and WI-3 |
| #6 | WI-6 app shell and auth | Route table, providers, error boundaries, route protection, navbar and sign-in. All four slices are natively blocked by it, mount inside it and need its session to reach the real API. | After WI-4 and WI-5 |

**WI-6 includes the auth screens.** They sit in the group because they share one ticket with the shell. The session layer and route protection can't be checked against the real API without sign-in, and Gate 1 must review authentication and session security. Splitting the screens into a later ticket would need a new ticket and leave Gate 1 unable to exercise the session end to end.

Gate 1 sequence:
1. WI-1 and WI-2 start now.
2. The user approves the ADRs and removes `adr-gate`.
3. The implementation agent completes #3–#6 and runs their tests and checks.
4. It posts one consolidated handoff on #12 (files created and modified, tests and checks with results, deviations, gaps, Preview URL) and stops implementation completely.
5. Claude Opus reviews the complete foundation independently, using the scope listed in #12.
6. On `CHANGES REQUESTED`, the agent fixes the affected foundation tickets and Opus reviews the corrections. This repeats until `APPROVED`.
7. Then #12 is closed.

**Phase 2: full implementation** (#7–#11, each natively blocked by #12)
- When #12 closes, #7–#11 are released together and follow their real dependencies: #7–#10 in parallel, then #11.
- The implementation agent continues through all of them without stopping between tickets. Each ticket records the files changed, test results and notes, and gets `implemented` only when it is finished.
- A blocker on one ticket stops only that ticket. Examples are a needed shared-surface change (ID-13), a contract gap (ID-19) or a missing test-data approval. The agent records the blocker and continues with other startable tickets.
- The agent stops when the full scope is ready for final review, and posts one consolidated handoff on #13.

**Gate 2: final review** (#13, the project-wide acceptance gate)
- Claude Opus reviews the entire project, not the latest diff. The scope is listed in #13: code, architecture, features, API integrations, auth flows, boundaries, Figma accuracy, responsive behaviour, security, all test layers, the production build, the Vercel Preview and regressions.
- The decision is `APPROVED`, `CHANGES REQUESTED` or `BLOCKED`. Corrections are fixed by the implementation agent and verified by Opus.
- After `APPROVED`, #1–#11 and #13 are closed. Production deployment then needs the user's explicit approval.

**Independence:** the reviewer is a separate Claude Opus session that wrote none of the reviewed work. It inspects real files, diffs, tests and builds, and reruns them itself. The coding agent's handoff is an index to that evidence, and its own claim of completion is never approval.

**Status rules:**
- A blocker is satisfied when it is closed or carries `implemented`.
- A gate issue counts only when it is closed after `APPROVED`.
- Only gate issues close at their approval. Every other ticket stays open until Gate 2 approves.

### Deployment environment

- **Execution:** all development and execution happen in the online virtual/cloud environment: installs, dev servers, builds, unit, integration and end-to-end tests. The owner's physical machine is not a hosting or deployment target. No local deployment workflow is added.
- **Preview:** Vercel Preview deployments. Gate reviews and real-backend checks use a Preview URL.
- **Production:** Vercel, only after Gate 2 is approved and the user explicitly approves.
- **Setup and secrets:** the user links the Vercel project to the repository and provides access. Public configuration and secrets are set as Vercel or cloud-environment variables, never committed.
- **ADR impact:** the host is no longer an open choice in ADR-12. ADR-01 and ADR-02 still decide the framework, and both candidates (a static SPA, or Next.js with a BFF) are evaluated as Vercel deployments.
- **Open point for WI-1:** the Postman collection exists only on the owner's machine and is git-ignored. The WI-1 agent needs read access to it inside the cloud environment, supplied by the owner outside git. The owner may instead decide that WI-1 runs where the file is.

### Token-efficient agent workflow

- **Only WI-1 reads the Postman collection.** Every later agent uses `docs/api/plain.md`.
- **Every implementation ticket carries, as links (not copies):**
  - its `plain.md` endpoint anchors;
  - its Figma node IDs and `figma.md` §12 sections;
  - its register entries (M-numbers) and decisions (D-numbers);
  - its acceptance criteria.
- **Agents read** AGENTS.md, this spec's relevant ID sections, and only the linked `plain.md` sections.
- **Agents never** invent response fields, re-probe the API, or create a second HTTP or service path for an endpoint that already exists in a domain service.
- **A contract gap** found during implementation (a field missing or a shape different from `plain.md`) is reported on the ticket and fixed in `plain.md` by one owner. It is not worked around locally.
- **Figma:** agents fetch design context for their own node IDs only, from the canonical layers in `figma.md` §1.3. The account allows 200 read calls per day and 10 per minute, shared by all agents, so fetch each node once and reuse the result.

### Acceptance criteria for the major features

Each criterion is met against the real API as Administrator and Project Manager. The Team Member checks are pending (D6).

**Authentication**
- [ ] Signing in with valid credentials lands on the Dashboard. Invalid credentials show the server message. A 422 maps onto the fields.
- [ ] Sign up requires a matching confirmation, then lands signed in. A taken email shows on the email field.
- [ ] Forgot Password shows the same success path for any well-formed email.
- [ ] Verify Code accepts only 6 digits, shows the expiry countdown, enables "Resend" after 60 seconds and shows the server's error and lockout messages.
- [ ] Reset Password enforces at least 8 characters with a match, then returns to Sign in with a success notice.
- [ ] Reloading keeps the session. A 401 on any request returns to Sign in and then back to the original page.
- [ ] Sign out calls the logout endpoint, clears the session even when the network fails, and lands on Sign in.

**App shell**
- [ ] The navbar shows Dashboard, Projects and Tasks, with the active item highlighted. Chats, Reports, search and the bell are absent.
- [ ] The user menu shows the name and system role, and works by keyboard. The drawer appears below 1024px.

**Dashboard**
- [ ] One dashboard request feeds every section. Each section has its own loading, empty and error state.
- [ ] No trend lines, no per-task %, no Ask AI card and no "View All" links on meetings or files.
- [ ] Task status and priority labels match the API values.

**Projects**
- [ ] The list paginates on the server. Search, status filter and newest sort change the query and survive a reload.
- [ ] "Add Project" appears only for Administrator and Project Manager.
- [ ] Create sends only API fields and rejects a deadline before the start date. Edit pre-fills and sends only the update fields.
- [ ] A 403 shows the permission message. A missing project shows not-found.
- [ ] Project details show the overview fields with no "Project Type", and team members carry "Leader" tags from `is_leader`.

**Tasks and Kanban**
- [ ] The board shows four columns titled with the API statuses, including empty columns.
- [ ] The status selector moves a card optimistically and rolls it back on error, for any role. 403 shows the permission message.
- [ ] Create from a column pre-sets the status. One assignee, chosen from project members. No start-date field.
- [ ] Task Details opens from a shareable link and shows only the verified fields.
- [ ] Edit, reassign and delete appear only for Administrator and Project Manager. Delete asks for confirmation.
- [ ] The Tasks page requires a project, remembers the last one, and filters "My Tasks" and team views on the client.

**Profile**
- [ ] The overview shows the stats, About and recent activities from `/auth/me`.
- [ ] The Tasks tab groups tasks into To do and Done.
- [ ] Settings update each supported field, upload and remove the avatar, change the password through the Security card, and show 422 errors per field.

**Cross-cutting**
- [ ] Layouts follow the responsive rules at 1440, 1024, 768 and 360 widths.
- [ ] Keyboard and screen-reader checks pass for forms, menus and dialogs.
- [ ] No feature data loads before its screen.
- [ ] No hard-coded or mock data appears outside tests.
- [ ] No secrets appear in the code, the build or the logs.

**Security and resilience**
- [ ] No token, password, OTP or email appears in any URL, `console` output or analytics during any Tier 1 flow.
- [ ] Logout, any 401 and a password reset each clear the session, and other tabs follow within one event.
- [ ] Reloading a protected page shows the neutral shell, never a flash of Sign in or of protected data.
- [ ] Each error `kind` in ID-19 produces its specified behaviour. 5xx responses show no server internals. Mutations never retry automatically.
- [ ] Submit buttons can't send duplicate requests.
- [ ] Links built from API data reject non-`https:` schemes.
- [ ] No `dangerouslySetInnerHTML` exists in the codebase.
- [ ] The CSP and security headers from ID-20.5 are present on the frontend host, and the main flows run with no CSP violations.
- [ ] No bot-protection widget ships before BR-5 is confirmed.

### Publishing and gate notes

- **Publishing:** tickets are published to GitHub through `to-tickets`, under the narrowed AGENTS.md §0 gate:
  - WI-1 and WI-2 are documentation and research only, and carry `ready-for-agent`.
  - Every implementation ticket carries `adr-gate` and stays not-ready until the user approves the ADRs.
  - #1–#6 carry `foundation`. #7–#11 are natively blocked by the Gate 1 issue #12. The Gate 2 issue #13 is blocked by #7–#12. Both gate issues carry `review-gate`.
  - Finished tickets get `implemented` and stay open until Gate 2 (AGENTS.md §10).
  - The spec itself is not filed as an issue.
- **Testing seams:** the six layers in Testing Decisions replace the three seams first proposed. The screen at the network boundary is still the primary seam.
- **Writes to the shared backend need approval.** Feature development and acceptance testing will create, edit and delete projects and tasks on `collabspace.huma-volve.com`. Before any write-based work, the user should confirm that this backend accepts test writes, and say which accounts and naming convention (for example a test-data prefix) to use. This is not a new requirement. It is a precondition the discovery rules (read-only probing) didn't cover.
- **Glossary.** No `GLOSSARY.md` exists yet. This spec uses the discovery vocabulary:
  - **system role:** Administrator, Project Manager or Team Member;
  - **team role** (`role_in_team`);
  - **direct member:** a member of the project itself;
  - **team member** (lowercase): a member of a team, as opposed to the Team Member system role;
  - **assignee**, **Kanban board**.
