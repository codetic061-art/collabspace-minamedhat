# Reference site discovery: collab-space-next-team-kappa.vercel.app

- **Target:** https://collab-space-next-team-kappa.vercel.app/ (earlier reference implementation of CollabSpace)
- **Captured:** 2026-11-26 (server `Date` header), unauthenticated, GET requests only
- **Method:** `Invoke-WebRequest -UseBasicParsing` with `-MaximumRedirection 0` for status codes and redirect targets; `web_fetch` for readable text; every JS/CSS chunk referenced by the public HTML was downloaded (35 JS files plus 2 CSS files) and grepped.
- **Scope limit:** no login, no form submission, no POST/PUT/PATCH/DELETE. The backend was touched only with two GETs (`/` and `/api`) to identify the server.

## Evidence labels

- `rendered`: seen in a page fetched without authentication (server HTML or `web_fetch` text).
- `bundle`: string or code found in a downloaded JS/CSS chunk. A `bundle` label shows that the code exists. It does not show that the feature works.
- `inferred`: a conclusion drawn from evidence of the two kinds above. The reasoning is stated next to it.

This document never claims a feature works. Everything behind login is listed under "Not verifiable".

---

## 1. Framework & libraries detected

| Item | Finding | Evidence |
|---|---|---|
| Hosting | Vercel (`Server: Vercel`, `X-Vercel-Id: fra1::…`) | rendered (headers) |
| Framework | **Next.js 16.3.8**, App Router (`window.next={version:"16.3.8",appDir:!0}`) | bundle (`1zck-bndpnnn2.js`) |
| Router | App Router: `self.__next_f.push(...)` RSC flight data in HTML; no `__NEXT_DATA__`; no `_buildManifest.js` | rendered |
| Bundler | Turbopack (`turbopack-2r6gvmcxl3pqr.js`, `globalThis.TURBOPACK`); assets under `/_next/static/immutable/chunks/` | rendered |
| Build ID | `7vytTKsi3ET_zXRAJK2R2` (from the `"b"` field in the flight data) | rendered |
| React | `19.3.0-canary-cbb046ab-20260731` (the canary React that Next.js bundles) | bundle |
| Server Actions | Used for auth, search and notifications (`createServerReference(...)`) | bundle |
| Auth | **Auth.js / next-auth v5** with a **Credentials** provider only (`/api/auth/providers` → `{"credentials":{...}}`). Cookies `__Host-authjs.csrf-token` and `__Secure-authjs.callback-url`. `SessionProvider` from `next-auth/react` (BroadcastChannel `"next-auth"`) | rendered + bundle |
| Server state | **TanStack Query** (`QueryProvider`, `QueryClientProvider`, `useQuery`, `useMutation`, `HydrationBoundary`) | bundle |
| Forms | **react-hook-form** (`useForm`, `Controller`) with **zod** schemas via `zodResolver` | bundle |
| UI kit | **shadcn/ui** conventions (`data-slot="button"`, `data-variant`, `data-slot="field"`, `field-label`, `Card*`, `ChartContainer`, `ChartTooltip`) on **Radix UI** primitives (NavigationMenu, DropdownMenu, Popover, Select, Avatar, Slot, Presence, DismissableLayer, FocusScope, RemoveScroll) | rendered + bundle |
| Styling | **Tailwind CSS v4** utility classes (e.g. `h-7.75`, `max-w-160`, `focus-visible:ring-3`, `@layer properties`, `lab()` colors) plus CSS custom-property tokens | rendered + bundle (CSS) |
| Icons | **lucide-react** (`lucide lucide-chevron-down`, FolderKanban, CheckSquare, MessageSquare, Video, Bell, Search, Sparkles, …) | rendered + bundle |
| Charts | **recharts** (AreaChart, BarChart, LineChart, ResponsiveContainer). Recharts 3 bundles Redux Toolkit internally, which is why `redux-toolkit.js.org/Errors` appears; no app-level Redux store was found | bundle |
| Toasts | **sonner**-style `Toaster` ("Close toast") | bundle |
| OTP input | 6-slot OTP input with a caret-blink animation (`animate-caret-blink`), matching the shadcn `InputOTP` / `input-otp` pattern | bundle |
| Fonts | `next/font`: **Inter** (body class `inter_…__className`, self-hosted `.woff2`) and Geist Mono (`--font-geist-mono`) | rendered + bundle (CSS) |
| Images | `next/image` (`/_next/image?url=…Social.png&w=48&q=75`) | rendered |
| Polyfills | core-js 3.38.1 (`noModule` chunk) | bundle |
| Not found | No socket.io, Pusher, Laravel Echo, Reverb, `new WebSocket`, `EventSource`, axios, zustand, dnd-kit, framer-motion, date-fns/dayjs, next-intl/i18next, WebRTC/LiveKit/Jitsi/Agora. No app use of `localStorage`/`sessionStorage` (the only `document.cookie` read is Vercel's toolbar check) | bundle (absence in **public** chunks only) |
| `NEXT_PUBLIC_*` | None found in client chunks | bundle |
| Backend URL | Not present in client chunks. Auth, search and notification calls go through Server Actions, so the backend URL lives on the server. The only URL found was `http://localhost:3000/api/auth`, an Auth.js default | bundle |
| Backend host | `https://collabspace.huma-volve.com/` → 200, `Server: Apache`, `X-Powered-By: PHP/8.3.37`; `/api` → 404. This is the base URL of the repo's Postman collection | rendered (GET only) |

`inferred`: the backend is PHP and probably Laravel. The evidence is the `password_confirmation` field naming, the `errors: {field: [msg]}` error shape the forms consume, and the PHP headers.

---

## 2. Route inventory

How a protected route behaves: the middleware (or proxy) answers `307` with `Location: /login?redirectTo=<path>`. Unknown paths return `404`. `/reports` is not covered by the middleware. Its page performs its own server `redirect("/login")` (a 307 with an HTML error shell and no `redirectTo`).

| Route | Status / redirect (unauthenticated) | Evidence |
|---|---|---|
| `/` (Dashboard) | 307 → `/login?redirectTo=%2F` | rendered (redirect); bundle (nav item "Dashboard", `href:"/"`) |
| `/login` | 200, title "Sign In \| CollabSpace" | rendered |
| `/register` | 200, title "Sign Up \| CollabSpace" | rendered |
| `/forgot-password` | 200, title "Forgot Password" | rendered |
| `/verify-code?email=…` | 200, title "Verify Code" (without `email` it shows a "missing email" state) | rendered; bundle (`router.push('/verify-code?email=…')`) |
| `/reset-password?email=…` | 200, title "Reset Password" (without `email`: "Your email address is missing.") | rendered |
| `/projects` | 307 → `/login?redirectTo=%2Fprojects` | rendered (redirect); bundle (nav) |
| `/projects/[id]` | 307 → `/login?redirectTo=%2Fprojects%2F1` | rendered (redirect); bundle (`/projects/${e.id}` in search) |
| `/tasks` | 307 → `/login?redirectTo=%2Ftasks` | rendered (redirect); bundle (nav) |
| `/tasks?taskId=[id]` | 307 → `/login?redirectTo=%2Ftasks%3FtaskId%3D1` | rendered (redirect); bundle (search result link) |
| `/chats` | 307 → `/login?redirectTo=%2Fchats` | rendered (redirect); bundle (nav) |
| `/meetings` | 307 → `/login?redirectTo=%2Fmeetings` | rendered (redirect); bundle (nav) |
| `/meetings/[id]` | 307 → `/login?redirectTo=%2Fmeetings%2F1` | rendered (redirect); bundle (search) |
| `/reports` | 307 → `/login` (page-level redirect, no `redirectTo`) | rendered (redirect); bundle (nav, report charts/form chunks preloaded in the redirect shell) |
| `/profile` | 307 → `/login?redirectTo=%2Fprofile` | rendered (redirect); bundle (user menu "Profile"; "Reports" for Team Member) |
| `/profile/files` | 307 → `/login?redirectTo=%2Fprofile%2Ffiles` | rendered (redirect); bundle (file search results) |
| `/edit` (Edit profile) | 307 → `/login?redirectTo=%2Fedit` | rendered (redirect); bundle (user menu "Edit profile") |
| `/api/auth/session` | 200, `null` | rendered |
| `/api/auth/providers` | 200, credentials only | rendered |
| `/api/auth/csrf` | 200 | rendered |
| `/api/auth/error` | 200 (Auth.js error page) | rendered |
| `/sign-in`, `/sign-up` | 404 | rendered (404); bundle (defaults `signInHref="/sign-in"`, `signUpHref="/sign-up"` in `HeaderActions`, which look like stale defaults) |
| `/dashboard` | 404 | rendered (404); bundle (only used in the nav's active-state check) |
| 404 page | "404 · Page not found · The page you are looking for does not exist or has been moved. · Go back home" | rendered |
| `/signin`, `/signup`, `/verify`, `/otp`, `/verify-email`, `/verify-otp`, `/teams`, `/team`, `/files`, `/chat`, `/messages`, `/notifications`, `/settings`, `/admin`, `/ai`, `/assistant`, `/calendar`, `/analytics`, `/kanban`, `/workspace`, `/home` | 404 | rendered |
| `/auth/google/callback`, `/google/callback`, `/auth/callback` | 404 | rendered |
| `/robots.txt`, `/sitemap.xml`, `/manifest.json`, `/favicon.ico` | 404 | rendered |

---

## 3. Navigation structure

**Auth layout** (`rendered`): a top header holds the text logo "Collabspace" (links to `/login`) and a pill-shaped language button labeled "English" (`aria-label="Language: English"`, chevron-down). No language-switching logic was found in the bundle, so the button appears to be static. Below the header sits a centered white card (`max-w-160`, `rounded-[14px]`, `shadow-lg`) on a light background. `<html lang="en">`.

**App shell top navigation** (`bundle`, chunk `0wh1qwrn8lalu.js`). This is a horizontal Radix `NavigationMenu` styled as a pill bar (`bg-light rounded-full`) and shown at `lg` and up. Below `lg`, a hamburger button ("Open navigation menu" / "Close navigation menu") opens a "Mobile Navigation Drawer" that locks body scroll.

| Label | href | Icon | Visible when (role permission map in the bundle) |
|---|---|---|---|
| Dashboard | `/` | layout-dashboard | `view_dashboard` |
| Projects | `/projects` | folder-kanban | `view_projects` |
| Tasks | `/tasks` | square-check-big | `view_tasks` |
| Chats | `/chats` | message-square | `access_all_project_chats` \| `access_project_chats` \| `send_project_chat` |
| Meetings | `/meetings` | video | `view_meetings` \| `join_meeting` |
| Reports | `/reports` (Team Member: `/profile`) | chart-column | `view_all_reports` \| `view_project_reports` \| `view_personal_reports` |

The mobile drawer also lists: Profile (`/profile`), Edit profile (`/edit`), and Sign out. The unauthenticated variant shows "Sign in" and "Sign up".

**Header actions** (`bundle`, chunk `3-n_t51ugew8s.js`):

- A global search ("Open search", placeholder "Search projects, tasks, users…").
- A notifications bell popover with an unread red dot.
- A user avatar dropdown (name, email, Profile, Edit profile, Sign out).

**Client-side role → permission map** (`bundle`, used only for showing and hiding nav items):

- **Administrator:** view_dashboard, view_analytics, view/create/update/delete_user, view/create/edit/delete_project, view/create/edit/delete_task, update_task_status, view/create/edit/delete_team, assign_project_member, upload_file, access_all_project_chats, view_meetings, schedule/cancel/reschedule_meeting, view_all_reports, generate_report, configure_ai, use_ai_assistant, manage_permissions, manage_system_settings.
- **Project Manager:** view_dashboard, view_analytics, view/create/edit_project, view/create/edit/delete_task, update_task_status, view_teams, assign_project_member, upload_file, access_project_chats, view_meetings, schedule_meeting, generate_project_report, view_project_reports.
- **Team Member:** view_dashboard, view_projects, view_tasks, update_task_status, upload_file, send_project_chat, view_meetings, join_meeting, view_personal_reports.

`inferred`: the three role names ("Administrator", "Project Manager", "Team Member") come from the session user's roles. No role selection exists on the register form.

---

## 4. Screens & features evidenced

### Auth

- **Sign In** (`rendered`, `/login`): heading "Sign In", subtitle "Welcome back, you've been missed!", "Sign With Google" button, "OR" divider. Fields: Email (`type=email`, placeholder "Your Email", mail icon) and Password (placeholder "Password", lock icon, show/hide toggle "Show password"). A "Remember Me" checkbox (default `true` in `bundle`), a "Forget Password?" link to `/forgot-password`, a "Log in" button (shows "Logging in..." while pending, `bundle`), and "Don't have an account yet? Sign Up" linking to `/register`.
  - `bundle`: on success the form calls `router.replace(redirectTo)`, accepting only same-origin paths (it starts with `/` and not `//`; otherwise it uses `/`), then `router.refresh()`. Server field errors (`errors.{field}[0]`) map onto the inputs, and a general error shows in a `role="alert"` paragraph.
- **Sign Up** (`rendered`, `/register`): "Sign Up", "Connect with every application!", "Sign With Google", "OR". Fields: Full Name, Email, Password, Confirm Password. A "Sign up" button and "Already have an account? Sign In". No role selection. `bundle`: on success the form calls `router.replace("/")`, so registration signs the user in directly.
- **Forgot Password** (`rendered`): "Forgot Password?", "we'll send you a verification code to reset your password.", an Email field (placeholder "Enter your email" in `bundle`), "Send verification code", and "Remember your password? Sign In". `bundle`: on success it pushes `/verify-code?email=…`.
- **Verify Code** (`rendered`): "Verify Your Email", "Enter the 6-digit verification code sent to: {email}", "Verification code" (6-slot OTP, numeric, `autoComplete=one-time-code`), "Verify code" (shows "Verifying..."), "Didn't receive the code? Resend code" (shows "Sending..."), and "Change email address". Missing email shows "Email address is missing. Request a new verification code." with a "Return to Forgot Password" link (`bundle`). On success it pushes `/reset-password?email=…`.
- **Reset Password** (`rendered`): "Reset Password", "Create a new password for your account.", New password, Confirm password, "Reset password" (shows "Resetting password..."), and "Back to Sign In". Missing email shows "Your email address is missing." with "Request a new reset code" (`rendered`).
- **Google sign-in** (`bundle`): the `googleRedirectAction` server action returns `data.authorization_url`, and the browser goes there with `window.location.assign`. The button text changes to "Redirecting...". The OAuth callback route could not be found (the callback paths probed all return 404).
- **Validation rules** (`bundle`, zod):
  - email: trimmed, `.email("Please enter a valid email address.")`
  - login password: `min(1, "Password is required.")`
  - register/reset password: `min(8, "Password must contain at least 8 characters.")`
  - name: trimmed, `min(2, "Full name must contain at least 2 characters.")`
  - `password_confirmation`: `min(1, "Please confirm your password.")`, plus refine "Passwords do not match."
  - otp: `/^\d{6}$/` "OTP must contain exactly 6 digits."
  - payload field names: `email`, `password`, `remember`, `name`, `password_confirmation`, `otp`.
- **Auth query key** (`bundle`): `["auth","me"]`, removed after login, register, or reset.

### Profile

- `bundle`: `/profile` (Profile; it doubles as "Reports" for Team Members), `/edit` (Edit profile), and `/profile/files` (the destination of file search results). User fields referenced: `name`, `email`, `avatar_url`, `job_title`, `roles`. Avatar fallback shows two-letter initials.

### Teams

- `bundle`: the search returns a "Teams (n)" group with `team-${id}` items. They link to `/projects`, so no teams page exists. There is no `/teams` route (404, `rendered`). Team permissions exist in the role map only.

### Projects

- `bundle`: the "Projects" nav item, `/projects`, `/projects/[id]`, and project search results showing `name`, a `status` badge, and "{progress_percentage}% completed".

### Tasks / kanban

- `bundle`: the "Tasks" nav item, `/tasks`, and a task deep link `/tasks?taskId=[id]` (probably opens a task detail panel or modal, `inferred`). Search results show `title || name`. **No drag-and-drop library was found** in the public chunks, so a kanban board cannot be evidenced.

### Meetings / AI summaries

- `bundle`: the "Meetings" nav item, `/meetings`, `/meetings/[id]`, and meeting search results showing `title || name` and `date`. No video SDK was found. The Postman collection references `meet.google.com`, which suggests external meeting links (`inferred`). No AI-summary strings were found.

### Files

- `bundle`: "Files (n)" search results (`name`, `file_size`) linking to `/profile/files`. There is no `/files` route (404).

### Chat

- `bundle`: the "Chats" nav item and `/chats`. No real-time client library was found in the public chunks.

### Notifications

- `bundle` (header popover): heading "Notifications", "{n} unread", a "Mark all as read" button, the empty state "You're all caught up.", and an inline error alert. Each item is an `<article>` with an unread dot (`is_read`), `title`, `message` (2-line clamp), and `created_at` formatted with `Intl.DateTimeFormat` (medium date, short time). Per-item actions are "Mark as read" (check icon) and "Delete notification" (trash icon).
- Server actions: `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`. Updates are applied locally after a successful response. No dedicated notifications page exists (`/notifications` → 404).

### Global search

- `bundle`: a 350 ms debounce feeds `useQuery(["navbar-search", q], searchAction(q), {staleTime: 30s, retry: 1})`, which runs only when the query is non-empty.
- States: "Type something to find projects, tasks, meetings, files, and users." (idle), "Searching results..." (loading), "Search failed" (error), "No results found" (empty), and "Found N result(s) · Scroll to explore" (success).
- Filter chips: All, Projects, Users, Tasks, Meetings, Files, Teams. Each group has a colored icon tile.

### Dashboard / analytics

- `bundle`: the "Dashboard" nav item at `/` (gated by `view_dashboard`). The chart components `ProjectsProgress` (area/line chart titled "Projects Progress" with a project `Select` defaulting to "All Projects") and `CompletionVsDeadline` ("Task Completion Time vs Deadline" bar chart, "Completed Tasks") are present. They were preloaded by the `/reports` redirect shell, so they may belong to Reports, the Dashboard, or both (`inferred`).
- `bundle`: the "Projects Progress" select handler is `onValueChange: e => console.log(e)`, a stub.

### AI assistant

- `bundle`: only the permission names `configure_ai` and `use_ai_assistant` exist in the role map. No route, nav item, or UI strings were found (`/ai`, `/assistant` → 404). A `Sparkles` icon decorates the report form card.

### Reports / admin

- `bundle`: a "Submit a detailed report" card with:
  - Report type select: "Project summary" (`project-summary`), "Project activity" (`project-activity`), "Completion status" (`completion-status`).
  - An "Add note" input, Start date and End date (`type=date`, required), and a "Submit" button.
  - On submit it only sets local state and shows "Report details are ready." in an `aria-live` region. **No API call is wired**, so this form is a stub.
- Admin: the permissions for users, teams, permissions and system settings exist in the role map only. There is no admin route or nav item (`/admin`, `/settings` → 404).

---

## 5. API endpoints referenced by the frontend

No backend REST paths appear in the client chunks. The browser calls only the following:

| Call | Kind | Evidence |
|---|---|---|
| `/api/auth/session`, `/api/auth/csrf`, `/api/auth/providers`, `/api/auth/signin/credentials`, `/api/auth/callback/credentials` | Auth.js route handlers | rendered (`/api/auth/providers` JSON) |
| `loginAction`, `registerAction`, `forgotPasswordAction`, `verifyResetOtpAction`, `resetPasswordAction`, `googleRedirectAction` | Server Actions (POST to the page URL with `Next-Action` IDs) | bundle |
| `searchAction`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification` | Server Actions | bundle |

Server-action responses use the shape `{ success: boolean, message: string, errors?: Record<field, string[]>, data?: … }` (`bundle`, e.g. `t.data.authorization_url`).

`inferred`: these actions call `https://collabspace.huma-volve.com` on the server. The exact backend endpoints should be taken from the Postman collection in this repo, not from this site.

---

## 6. Auth & real-time handling

- **Session** (`rendered` + `bundle`): an Auth.js v5 Credentials provider holds the session in an HttpOnly Auth.js cookie. The client reads it via `SessionProvider` / `useSession`. No token was found in `localStorage` or `sessionStorage` in the public chunks. `inferred`: the backend bearer token is held server-side inside the Auth.js JWT/session and used by Server Actions.
- **Route protection** (`rendered`): the middleware redirects protected paths to `/login?redirectTo=<path>` (path and query preserved). `/reports` redirects inside the page instead. The login form honors `redirectTo` for same-origin paths only (`bundle`).
- **Authorization** (`bundle`): a client-side role → permission map hides nav items. Whether the server enforces permissions could not be verified.
- **Google OAuth** (`bundle`): the backend supplies `authorization_url`. The callback handling could not be seen.
- **Real-time** (`bundle`, absence): no WebSocket, Pusher, Echo, Reverb, socket.io or SSE code exists in the public chunks. Notifications arrive as props to `HeaderActions` (server-fetched, `inferred`). Chat and meeting chunks were not reachable, so real-time behavior in those screens is unknown.

---

## 7. Visual / UI patterns

- **Design tokens** (`bundle`, CSS `:root`):
  - primary `#005afb` (`--primary`, `--color-primary-light`), primary-50 `#e6efff`, primary-dark `#161c36`
  - text-primary `#000712`, text-body `#718096`, text-secondary `#606c80`, text-muted `#9f9f9f`
  - background-light `#f6f8fa`, bg-muted `#f2f4f7`
  - support-green `#2ba52e`, support-red `#db302a`, support-yellow `#e6ba0e`, support-dark-orange `#fa9e00`, support-violet `#7d2d7e`, support-blue `#3b82f6`
  - a long gray and neutral scale, and `--radius: .625rem`
  - `.dark` selectors occur 75 times in the CSS, which could come from shadcn defaults. No theme toggle was seen.
- **Typography:** Inter. Auth headings are 17px on mobile and 31px on desktop, and body text jumps from 9px to 16px at `md` (`rendered`).
- **Inputs** (`rendered`): floating labels that sit on the border (absolute, white background), a leading icon, `bg-bg-light`, 7px radius, a primary focus ring, and a red border plus ring on `aria-invalid`.
- **Buttons:** fully rounded primary "auth" variant (`bg-primary rounded-full`) and outline buttons (`rendered`). The bundle also has ghost and icon variants and an `icon-xs` size.
- **App shell** (`bundle`): pill-shaped horizontal top nav (`rounded-full bg-light`) on desktop, hamburger drawer on mobile, round 44px icon buttons, avatar dropdown, popovers sized `w-[min(24rem,calc(100vw-2rem))]`.
- **Cards and charts** (`bundle`): shadcn `Card` with `rounded-2xl border-0 shadow-sm`, charts 220–280px tall, light grid `#eef0f4`, axis ticks `#9ca3af`, chart colors `#86efac` (projects) and `#3b3bff` (completed tasks), indigo-600 accents.
- **Search result tiles** (`bundle`): color-coded icon tiles (projects blue, tasks amber, meetings purple, files sky, users emerald, teams indigo), sticky uppercase group headers, and filter chips.
- **Accessibility details** (`rendered`/`bundle`): `aria-label`s on icon buttons, `role="alert"` for errors, `aria-live` for the report status, `sr-only` labels on the report form, `aria-expanded` on the menu button, semantic `<header>/<main>/<section>/<article>/<time>`.
- **Responsive:** the auth pages and shell use `sm:`, `md:` and `lg:` breakpoints. Desktop nav appears at `lg` (`rendered`/`bundle`).

---

## 8. Not verifiable

Everything below sits behind login, or its chunks are not referenced by any public page:

- The actual UI and content of `/` (Dashboard), `/projects`, `/projects/[id]`, `/tasks` (and whether it is a list, a kanban board, or both), `/chats`, `/meetings`, `/meetings/[id]`, `/reports`, `/profile`, `/profile/files`, `/edit`. Only their existence, nav labels, and search-result links were evidenced.
- Whether any data screen is backed by the real API, and how loading, empty, error and unauthorized states look on those screens.
- Task creation and editing, status changes, assignment, comments, attachments, and drag-and-drop.
- Chat behavior, including real-time delivery, message composer, and attachments.
- Meeting scheduling, joining, recordings, and any AI meeting summaries.
- File upload, preview, and download.
- Team and user management, the admin, permission and system-settings screens, and the AI assistant. These exist only as permission names.
- Server-side permission enforcement, session expiry and refresh, and the sign-out flow.
- The Google OAuth callback route and its outcome.
- The backend endpoints each Server Action calls, request and response payloads, and pagination.
- Whether notifications refresh (polling or push) or load only on navigation.
- Dark mode and the language switcher's behavior; the switcher appears static.
- Absence findings (no WebSocket, dnd-kit, video SDK, and so on) cover only public chunks. Protected-route chunks may include such libraries.
