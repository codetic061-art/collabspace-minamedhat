# Figma discovery: CollabSpace design

**Primary design source:** https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled
**File key:** `xu0rluTsYV94aopFZ6C2A2`. The user owns this file and copied the complete CollabSpace design into it. The earlier file (`SCHXPmHRpSLniAusWY3Lct`) is no longer used; its history is kept in the appendix.

Every Figma fact below carries an evidence tag:

| Tag | Meaning |
|---|---|
| **[seen]** | Seen in a rendered screenshot of the node. |
| **[code]** | Read from `get_design_context` reference code or `get_variable_defs` output (exact values). |
| **[meta]** | Read from `get_metadata` (node IDs, names, sizes, layer text). Layer names can be stale, see §1.3. |
| **[inferred]** | A conclusion drawn from the above, not stated by the design. |

API facts come from `api-authenticated-shapes.md` (verified live), `openapi-vs-postman.md` (spec) and `api-inventory.md` (Postman). Product decisions live in `decisions.md`. Screen-to-feature and API mapping is in `screen-feature-map.md`.

**Original versus derived:** §1–§11 describe only what exists in Figma. **§12 holds derived requirements** (decision D3), each labelled `Derived — Not in Figma`. How each §10 gap is resolved is recorded in the mismatch register in `screen-feature-map.md`.

---

## 1. File information and access

### 1.1 Access verification

| Check | Result |
|---|---|
| Client | Agy (Antigravity CLI) with its existing `figma` plugin MCP server, model `gemini-4-neon-medium`. No new MCP config, OAuth app or token was created. |
| Account | `code tic`, Full seat, Education tier (published limit: 200 read calls per day, 10 per minute). `whoami` was not re-run for this file. |
| File access | **Granted.** `create_session`, `get_metadata`, `get_screenshot`, `get_variable_defs` and `get_design_context` all succeeded on this file. |
| Pages | **One page:** `0:1` "Page 1". **[meta]** |
| Write operations | None. Only read tools were permitted for each Agy run (session-scoped allow-list). |

### 1.2 Figma call budget used during discovery

| Call | Count |
|---|---|
| `create_session` | 1 |
| `get_metadata` (page list, then page `0:1` in full) | 2 |
| `get_screenshot` (37 screens and overlays, plus the information-architecture frame) | 38 |
| `get_variable_defs` (Dashboard, Sign in, Profile settings) | 3 |
| `get_design_context` (Navbar, Sign in, All Projects, Kanban, Create Task, Dashboard, dashboard stat row, Project overview, Profile settings, Meetings) | 10 |
| **Total** | **54** of the 100-call discovery budget |

The full `0:1` metadata (8,122 frames, 3,936 text nodes) was parsed locally, so later questions about structure can be answered without new calls.

### 1.3 How to read this file (for implementation agents)

- **One page, laid out by section.** Each app area has a 2174×150 section header (`Sing in/ Up`, `Dashboard`, `Projects`, `Tasks`, `Chats`, `Meetings`, `Report`, `Profile`, `Ask AI`) with its 1440×1024 screens in a row beneath it. Overlays, modals and dropdowns float loose on the left side of the canvas, outside any section. **[meta]**
- **Layer names are often stale.** Figma text layers keep their original names after the text changes. For example, the Dashboard's stat-card text layers are named "Total Task", "Active Tasks" and "Overdue Tasks", but the rendered cards read "Pending Tasks", "In Progress", "Complated" and "Completion Rate". **Trust the screenshot, not the layer name.** **[meta]** vs **[seen]**
- **Some screens stack an old wireframe under the final design.** `1:7697` Dashboard contains `1:7698` (a grey low-fidelity wireframe) and `1:8065` (the final design). `get_design_context` on `1:7699` returned the grey wireframe stat cards. Call design context on **`1:8065`** and its children (`1:8067` stat row, `1:8151` middle row, `1:8285` bottom row). Project details (`1:8783`, `1:9008`), project Files (`1:9681`), Meetings (`1:9869`) and Ask AI chat (`1:11808`) each also hold one full-size inner frame; confirm visibility from the screenshot before reusing a sub-node. **[meta]** **[code]**
- **Placeholder content is not a spec.** The design repeats sample names ("Mohanad wahib"), sample numbers that don't add up (a 42% badge next to a 78% gauge), repeated dates ("Mon 18", "Tue 18"...) and typos ("Complated", "Passwrod", "DuE Date", "Joind", "Recent Activates", "Product Details", "Up coming meetings"). Reproduce layout and styling. Take text from the API, and fix the typos. **[seen]** **[inferred]**
- **The case study, research and cover frames are not app screens.** These are `1:12823` Case Study, the `1:21889`/`1:20299`/`1:21095` Covers, the Personas and Competitive Analysis frames, and the logos. They only matter for the information architecture in §6.2. **[meta]**

---

## 2. Page and screen inventory

Base link: `https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=<id with - instead of :>`

### 2.1 Application screens (all 1440×1024 desktop unless noted)

| Section | Screen | Node | Link | MVP tier (D1) |
|---|---|---|---|---|
| Sign in / Up | Sign in | `1:10523` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10523) | 1 |
| Sign in / Up | Sign up | `1:10573` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10573) | 1 |
| Dashboard | Dashboard (final design is the inner frame `1:8065`) | `1:7697` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-7697) | 1 |
| Projects | All Projects | `1:8545` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-8545) | 1 |
| Projects | Project details: Overview tab ("All Projects / Alpha") | `1:8753` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-8753) | 1 |
| Projects | Project details: Tasks tab (Kanban) | `1:8978` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-8978) | 1 |
| Projects | Project details: Teams tab | `1:9313` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-9313) | 2 (team management) |
| Projects | Project details: Files tab | `1:9679` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-9679) | 2 (project files) |
| Tasks | Tasks page (global Kanban) | `1:10208` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10208) | 1 |
| Chats | Chats landing (Recent) | `1:10754` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10754) | Out |
| Chats | Inbox list ("Wireframe - 16") | `1:11184` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11184) | Out |
| Chats | Direct conversation open ("Wireframe - 21") | `1:11236` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11236) | Out |
| Chats | Project Chats list ("Wireframe - 20") | `1:10803` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10803) | Out |
| Chats | Project Chats, row selected ("Wireframe - 22") | `1:10862` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10862) | Out |
| Chats | Project expanded, channel open ("Wireframe - 19") | `1:10921` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10921) | Out |
| Chats | Thread modal "#Screen edit" ("Wireframe - 24") | `1:11039` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11039) | Out |
| Meetings | Meetings (week calendar) | `1:9853` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-9853) | 2 |
| Meetings | Meeting details ("Meetings / join Meeting") | `1:10091` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10091) | 2 |
| Report | Reports | `1:7501` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-7501) | Out |
| Profile | Profile: Overview | `1:11901` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11901) | 1 |
| Profile | Profile: Tasks | `1:12020` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-12020) | 1 |
| Profile | Profile: Files | `1:12191` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-12191) | 2 (files) |
| Profile | Profile settings / edit ("Profile/Settomgs") | `1:11983` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11983) | 1 |
| Ask AI | Ask AI empty state | `1:10622` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-10622) | Out |
| Ask AI | Ask AI conversation | `1:11807` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11807) | Out |
| (no section) | Files (global, 1440×1004) | `1:11313` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11313) | 2 (files) |
| (no section) | Profile settings variant without navbar ("Frame") | `1:11864` | [open](https://www.figma.com/design/xu0rluTsYV94aopFZ6C2A2/Untitled?node-id=1-11864) | Duplicate of `1:11983`; not canonical |

### 2.2 Overlays, modals and dropdowns

| Element | Node | Size | Used by **[inferred]** | Tier |
|---|---|---|---|---|
| Search bar overlay (recent searches) | `1:12331` | 311×208 | Navbar search | 2 |
| Search results fragment ("Relevant Results") | `1:12350` | 365×264 | Navbar search. Text only, not screenshotted **[meta]** | 2 |
| Notification overlay | `1:11840` | 311×256 | Navbar bell | 2 |
| Create Task modal | `1:10646` | 720×661 | Tasks page "Create Task", Kanban "Add Task" | 1 |
| Create Task modal, alternate style | `1:10696` | 1001×928 | Older variant; not canonical | - |
| New Project modal ("New Project overlya") | `1:8650` | 720×661 | All Projects "Add Project" | 1 |
| New Meeting modal ("Add Meeting overlay") | `1:8705` | 720×595 | Meetings "Add Meeting" | 2 |
| Teams dropdown | `1:8490` | 210×164 | Dashboard Teams card, project Team Members | 1 |
| Project dropdown | `1:8501` | 210×116 | "All Projects" filters (charts, files, tasks) | 1 |
| Duration dropdown | `1:8510` | 210×164 | "This Year" chart filter, Meetings "This Week" | 1 |
| My task dropdown | `1:8523` | 210×172 | Tasks page "My Task" filter | 1 |
| Language dropdown | `1:8536` | 210×116 | Auth "English" selector. Text only: English, Arabic, France **[meta]** | See §10 |
| Period dropdown ("Project overlay") | `1:11468` | 210×116 | Reports "Monthly". Text only: Monthly, Daily, Yearly **[meta]** | Out |
| Report type dropdown ("Project overlay") | `1:11477` | 608×172 | Reports form. Text only: Project Progress, Meetings Summery, Worker Preformance, Tasks, KPI's **[meta]** | Out |
| Chat attach menu ("My task overlay") | `1:11538` | 210×144 | Chat composer. Text only: Photo, Audio, Document, Poll **[meta]** | Out |
| Chat conversation menu ("My task overlay") | `1:11529` | 210×144 | Chat kebab. Text only: Pin, Clear, Add to archive, Media **[meta]** | Out |
| Navbar component set | `1:11556` | 1480×676 | Every app screen | 1 |
| Select field component set ("Component 1") | `1:11488` | 640×140 | Two 608×48 variants. Not screenshotted **[meta]** | Unknown |
| Chat bar component set ("Component 3") | `1:11493` / `1:11507` | 383×48 | Chat composer | Out |
| Thread modal parts | `1:11508` | 1053×888 | Chat thread modal | Out |
| Loose meeting-form fragments | various, around x≈3200, y≈46550 | - | Text only: Location, Notification, Set Reminder, Meeting room, Email, Slack, "1 hour before event", Upload Attachment, Select Files **[meta]**. Not part of the New Meeting modal as drawn. | Out |

### 2.3 Not present in the file

Search of all 3,936 text nodes, every frame name and the screenshots found none of these **[meta]** **[seen]**:

- **Forgot password, verify code (OTP) and reset password screens.** The only trace is the "Forget Password?" link on Sign in. These are Tier 1 flows (D1).
- **Mobile or tablet layouts.** Every screen frame is 1440 wide. No narrower artboard exists.
- **Loading, empty, error, validation and 403 states** on any screen or form.
- **A task details view or edit-task modal.** The information architecture lists "Task Details", but no frame for it exists.
- **Edit project, delete confirmations and toast/snackbar notifications.**
- **A user menu dropdown** (profile, settings, sign out). The navbar shows the user block, but no menu frame exists.
- **Team management screens** (create team, add or remove member). The IA lists "Teams" and "Roles (admin-manger)" under Projects.
- **Prototype connections.** The metadata and design-context tools return no prototype links, so the design's interaction wiring could not be read. Navbar items are the only elements the reference code marks as links (`<a className="... cursor-pointer">`). **[code]**

---

## 3. Screen-by-screen descriptions

The navbar, page background and card style are shared by every app screen and are described once in §4. Measurements marked ~ are estimates from screenshots. Unmarked numbers are from reference code. **[code]**

### 3.1 Sign in `1:10523` [seen] [code]

- **Shell:** page background `#F6F8FA`. Top-left wordmark "Collabspace" (Rubik Regular 20). Top-right "English" language select: outlined pill with chevron. No navbar.
- **Card:** centered, about 600 wide, white, radius 24, shadow `0 4px 8px rgba(0,0,0,0.16)`, padding 64. Contents top to bottom:
  - "Sign In" (Inter Semi Bold 31, `#1F2937`).
  - "Welcome back, you've been missed!" (Inter Regular 16, `#718096`).
  - "Sign With Google": full-width outlined button with the Google "G" icon.
  - "OR" divider.
  - **Email** and **Password** inputs: outlined, `#CBD5E0` border, fill `#F9FAFB`. The field label sits in a notch in the top border (Inter 12). Each has a leading icon (mail, lock) and a placeholder ("Your Email", "Password"). Fix the "Passwrod" label typo.
  - Row: "Remember Me" checkbox (checked, primary blue) on the left, "Forget Password?" link (`#2563EB`) on the right.
  - "Log in": full-width pill primary button, `#005AFB`.
  - "Don't have an account yet?" followed by a bold blue "Sign Up" link.

### 3.2 Sign up `1:10573` [seen]

- **Shell:** same as Sign in. The card background is slightly off-white.
- **Card contents:**
  - "Sign Up" and "Connect with every application!".
  - Google button and "OR" divider.
  - Fields: Full Name (user icon), Email (mail icon), Password (lock icon).
  - "Remember Me" checkbox.
  - "Sign up" button.
  - "Already have an account? Sign In".
- **No confirm-password field.** The API register endpoint requires `password_confirmation`. See §10.

### 3.3 Dashboard `1:7697` (final layer `1:8065`) [seen] [meta]

The content is a 4-column grid of white cards, radius 16, gap 24, inside 64 page padding, in three rows.

- **Row 1 (`1:8067`): four stat cards, 310×160.**
  - Each card: a title, a large number, a trend line ("↗ +9% from last month"), "32/94" on the right, and a thin progress bar on a tinted track.
  - Each card has a tinted icon circle at top-right. Colours: "Pending Tasks" orange (`#FA9E00` on `#FFF5E6`), "In Progress" blue (`#005AFB` on `#E6EFFF`), "Completed" green (`#2BA52E` on `#EAF6EA`, typo "Complated" in the design).
  - "Completion Rate" shows a percentage and a gauge dial instead of a bar.
- **Row 2 (`1:8151`):**
  - **"Project overview"** spans 2 columns. Two text dropdowns, "All Projects" and "This Year", sit in its header. It holds a smooth area chart: blue line with a gradient fill, y-axis 0k–25k, x-axis months.
  - **"Active Projects"** has a "View All" link. Each item card shows a tinted icon circle in the project's colour (purple `#7D2D7E`/`#F2EAF2`, teal `#04B5AE`/`#E6F8F7`), the project name, a progress bar in the same colour, and "Task: 100 /140".
  - **"Recent Files"** has a "View All" link. Each row shows a file-type icon (PDF, JSX, SQL), the file name, "By <name> • 13:00" and a download icon, with dividers between rows.
- **Row 3 (`1:8285`):**
  - **"Tasks"** has "View All". Each item card shows the title, a priority badge (High: red `#DB302A` on `#FBEAEA`; Medium: yellow `#E6BA0E` on `#FFFAE7`; Low: green on `#EAF6EA`), a due label ("due today", "due Dec 18"), a percentage and a blue progress bar.
  - **"Teams"** has a team dropdown ("UI/UX") next to the title and columns Name / Tasks. Each row shows an avatar (the leader has a blue verified badge), a name, a "Leader" tag, a progress bar and "12/14".
  - **"Up coming meetings"** has "View All". Each meeting card shows the title, a date ("Today", "Dec 12") with a calendar icon, an avatar stack with "+3", and the time "14:00 - 15:00".
  - **"Ask AI"** has a soft gradient background, a robot icon, the line "ask me anything about...", and an input box with a send icon. This is out of MVP scope (D1).

### 3.4 All Projects `1:8545` [seen] [code]

- **Header:** "All Projects" (Inter Semi Bold 31). Primary pill "Add Project +" at top-right.
- **Toolbar:** white pill search "Search", about 325 wide, on the left. On the right, two outlined pill dropdowns, "All Projects" and "Newest" (`#27272B` border).
- **Table:**
  - Header row: Project Name, Start Date, Deadline, Status, Files, Teams, Priority (Inter Medium 18), with a bottom divider.
  - Rows are separate white bars about 60 high with a 16 gap between them and no cell borders.
  - Row cells: a tinted icon circle in the project's colour plus the name; dates as `YYYY-MM-DD`; status as coloured text ("active" `#FA2B75`, "Done" `#2BA52E`); a file icon plus "22 Files"; an overlapping avatar stack; priority as coloured text (High `#DB302A`, Medium `#E6BA0E`).
- **Not drawn:** pagination, row actions, empty state.

### 3.5 Project details header (shared by `1:8753`, `1:8978`, `1:9313`, `1:9679`) [seen]

- **Left:** breadcrumb "Projects > Alpha", then the title "Alpha" (Inter Semi Bold 31) next to a green-tint pill "42% Completed".
- **Top-right card, "Due Date":** a blue progress bar, "Start Date: Oct 12" and "Deadline: Dec 25".
- **Tabs:** Overview | Tasks | Teams | Files. Underline style: the active tab has blue text and a 2px blue underline; inactive tabs are grey.

### 3.6 Project Overview tab `1:8753` [seen] [code]

- **Left column (about 2/3):**
  - "Description" card with a paragraph.
  - "Project overview" chart card, the same as the dashboard's.
  - "Product Details" card (rename to "Project Details"): a grid of tinted icon circles, each with a label and value. Items: Project Type "SaaS", Start Date, Deadline, Priority, Total Tasks.
- **Right column (about 1/3):**
  - "Project Progress": a gauge with "78%" and "Project Completed", then three stats: "62/94 Pending tasks" (grey dot), "36/94 In progress tasks" (blue dot), "42/94 Completed tasks" (green dot).
  - "Team Members": a team dropdown ("UI/UX"), then a list of avatars with names and a "Leader" tag.

### 3.7 Project Tasks tab, Kanban `1:8978` [seen] [code]

- **Columns:** 4 white columns, radius 16, `#F3F4F6` border. Each has a tinted header strip with a dot, the title and a kebab menu:
  - "To-do" (light grey)
  - "In Progress" (blue tint `#E6EFFF`)
  - "In Review" (pink tint `#FAECF6`)
  - "Completed Tasks" (green tint `#EAF6EA`)
- **"Add Task +" button** at the top of every column: dashed `#005AFB` outline, pill shape.
- **Task card:** `#F6F8FA` background, radius about 16. Contents:
  - Bold title and a priority badge.
  - A 1–2 line description.
  - Optional "Progress" row with a percentage and a blue bar (In Progress cards only).
  - Optional assignee avatar with name and a "Reviewer" label (In Review cards only).
  - Footer: avatar stack, a comment icon with a count ("8"), and the date "Dec 12" with a calendar icon.
- **Not drawn:** drag-and-drop, a dragging state, or column-menu contents.

### 3.8 Project Teams tab `1:9313` [seen]

- **Layout:** 4-column grid of team cards.
- **Card header strip:** tinted per team (UI/UX pink, Frontend lavender, Backend mint, Marketing grey). It shows the team name (about 22) and "42% Completed" in the matching accent colour.
- **Card body:** Name / Tasks columns. Each row shows an avatar (the leader has a check badge), the name, the team role in small grey text, a blue progress bar and "12/20". Dividers separate the rows.
- **Not drawn:** add or remove member controls.

### 3.9 Project Files tab `1:9679` [seen]

- **"Recent Files":** a row of 3 cards.
- **"All Files":** a primary pill "Upload File +" in the section header, then a 3-column grid.
- **File card:** white, 1px `#C2C2C2` border, radius 16, about 100 high. It shows a file-type icon (red PDF), the name, "By Ahmed Hassan", "6.4 MB • 1h ago", and a download icon on the right.
- **Not drawn:** upload dialog, delete action, pagination.

### 3.10 Tasks page `1:10208` [seen]

- **Toolbar:** grey-filled pill search; outlined dropdowns "Project 1" and "My Task" (options in `1:8523`); primary "Create Task +" on the right.
- **Board:** the same 4-column Kanban as §3.7.

### 3.11 Meetings `1:9853` [seen] [code]

- **Header:** "Meetings" with a primary pill "Add Meeting +".
- **Calendar controls:** prev/next chevrons around "December 2025", and an outlined "This Week" dropdown on the right.
- **Week grid:**
  - A Time column (9:00–13:00 visible) and five day columns. "Today" is highlighted light blue (`#E6EFFF`). Day headers read "Mon 18", "Tue 18" and so on (placeholder dates).
  - Empty cells repeat the day label, which is a placeholder artifact.
- **Meeting card:** white, radius about 16. It shows the title, "1:00 - 1:30 PM", an avatar stack with "+5", and a "Join +" text button.

### 3.12 Meeting details `1:10091` [seen]

- **Header:** breadcrumb "Meetings > Design Review", then the title. A meta row shows a project chip ("Project 1"), a participant avatar stack, "December 12, 2025" and "10:00 - 10:30 AM".
- **Left (about 750 wide):**
  - A large video/recording thumbnail, radius about 24, with a blue play icon.
  - Segmented tabs "AI Summary" (active) | "Note" | "Comments".
  - The AI Summary panel: "AI Generate Summary", then "Key Points" bullets.
- **Right card, "Meeting Transcripts":** an "English" dropdown, a "Search Transcript" field, and entries. Each entry has a timestamp pill ("00:01"), the speaker's avatar and name, and a paragraph.

### 3.13 Profile Overview `1:11901`, Tasks `1:12020`, Files `1:12191` [seen]

- **Shared header:**
  - Avatar (92) with a blue gear badge.
  - Name in bold, about 32.
  - "UI/UX Designer" and a calendar icon with "Joind Apr 2022" (fix to "Joined").
  - Two stat cards on the right: "Completed Tasks 140" (blue briefcase icon circle) and "Hours Worked 345" (pink clock icon circle).
  - Tabs: Overview | Tasks | Files.
- **Navbar on these frames:** the right side (search, bell, user) is missing and "Reports" is highlighted. This looks like a design error. **[inferred]**
- **Overview tab:** an "About" paragraph, then "Recent Activates" (fix to "Recent Activities"). Each activity row has a yellow file icon, the text, and a relative time on the right ("1h ago").
- **Tasks tab:** two cards side by side.
  - "To do": grey header, count "4".
  - "Done": green-tint header, green title, count "6".
  - Both have Name / Tasks columns. Rows show the task name and a progress bar. "Done" rows have a full green bar and a green check circle.
- **Files tab:** a 3-column grid of the shared file card, with no upload button.

### 3.14 Profile settings `1:11983` [seen] [code]

- **Header:** avatar with a blue pencil badge, and the name in bold. No tabs and no stat cards.
- **Layout:** two columns. The left column holds a title and helper text for each section; the right column holds a white card (radius 32, `#E2E8F0` border) with a 2-column field grid.
  - **"Personal Info"** ("You can change your personal information settings here."): Full Name (user icon), Email Address (mail icon), Phone Number (country flag select plus number plus help icon), Availability Status ("Available").
  - **"Experience"** ("You can change Experience settings here."): Job Title, Years of Experience ("6 Years"), Current Team / Project (full width).
- **Footer:** a divider, then a full-width primary pill "Save" with a check icon.
- **Field labels sit above the inputs** (Plus Jakarta Sans Bold 14), not in the border notch. Inputs are pills with radius 100 and a `#CBD5E1` border. **This frame uses Plus Jakarta Sans, not Inter.** See §9.2.

### 3.15 Global Files `1:11313` [seen]

- **Header:** breadcrumb "Dashboard > Files", then "Files".
- **Top-right:** white pill "Search a File" and an outlined "All Projects" dropdown.
- **Body:** one large white container holding "Recent Files" (3 cards) and "All Files" with "Upload File +" and a 3-column grid of file cards.
- The navbar highlights "Dashboard", so the page is reached from the dashboard's "Recent Files → View All". **[inferred]**

### 3.16 Out-of-scope screens (recorded for completeness, D1 excludes them)

- **Chats (`1:10754`–`1:11039`)** [seen]
  - **Left panel:** a white card about 415 wide. It has an oversized "Chats" heading with a search icon, then "inbox" and "Project Chats" entries, then a "Recent" list.
  - **Direct messages:** each row shows a 64px avatar, name, preview and time.
  - **Project channels:** each row shows the project name, the channel ("Public Channel", "Frontend Team Channel"...), the last message and the time. A selected project expands into a grey group listing its channels.
  - **Conversation:** a header card (avatar or channel name with members, then search, phone, video and kebab icons). Incoming bubbles are white; outgoing bubbles are solid blue. Messages can carry hashtag chips ("#Screen edit"). The composer is "Write a message" with a paperclip and a square blue send button.
  - **Thread modal:** a blue header bar.
  - **Empty state:** "Select Chat".
  - **Style:** these frames use noticeably larger, less consistent typography than the rest of the app.
- **Reports (`1:7501`)** [seen]
  - **KPI cards:** Task Completion Rate 70%, Projects Completion Rate 88%, Teams Activity Rate 67%, each with a green or red trend.
  - **Charts:** "Task Completion Time vs Deadline" (blue bars), "Projects Progress" (green area), "Worker Activity Rate" (blue line).
  - **"Submit a detailed report" form:** an AI sparkle icon, then Select Report Type, Add Note, Start Date / End Date, and "Submit".
- **Ask AI (`1:10622`, `1:11807`)** [seen]
  - **Empty state:** "Collabspace AI", a sparkle icon tile, "Hi There 👋" and "Start chatting with Collabspace".
  - **Composer:** "ask me anything about...", a + button, a mic button and "Submit".
  - **Conversation:** bot avatar "CB", white bubbles with time and read ticks, a link-preview bubble, a message action row (speak, copy, regenerate, thumbs-down) and a typing indicator.

---

## 4. Shared layout

- **Canvas:** 1440 wide desktop. Content sits inside 64px side padding (1312 wide). Content starts 96 below the top (24 under the 72 navbar). **[code]**
- **Page background:** `#F6F8FA` ("BG color"). **[code]**
- **Navbar** (component set `1:11556`; variants `State=Dashboard` `1:11557`, `Projects` `1:11595`, `Tasks` `1:11633`, `Chats` `1:11671`, `Meetings` `1:11709`, `Reports` `1:11747`, `nav with profile` `1:11785`) **[code]**:
  - **Bar:** white, 72 high, 64 side padding. A 4px soft shadow gradient runs along the bottom.
  - **Left:** the wordmark "Collabspace" (Rubik Regular 20, `#000712`), then the nav track 24 to its right.
  - **Nav track:** a `#F6F8FA` pill (radius 100, padding 4/8/4/4, gap 19) holding items Dashboard, Projects, Tasks, Chats, Meetings and Reports. Items use Rubik Regular 12/16 with 10 padding. The active item is a solid `#005AFB` pill with white text.
  - **Right:** a search button (`#F6F8FA` pill, 206 wide, 24 search icon, "Search" in Rubik 14/18), then a bell icon (18×21) with a red dot in the screenshots. Last is the user block: name (Rubik Medium 12/20, `#000712`), a role line below it (`rgba(57,57,57,0.84)`), right-aligned, and a 32 avatar.
  - **Role line:** the design shows a team discipline ("UI/UX"), not the system role. **[seen]**
- **Card:** white, radius 16, no border on dashboard cards. Bordered variants use `#F3F4F6` (Kanban columns) or `#C2C2C2` (file cards). **[code]** **[seen]**
- **Section title inside cards:** about 20–22, regular weight, near-black. **[seen]**

## 5. Component inventory and reuse

| Component | Variants and states seen | Used on | Evidence |
|---|---|---|---|
| **Navbar** | 7 published variants (active item per section, plus "nav with profile") | All app screens | [code] [meta] |
| **Primary button** | Pill (radius 100), `#005AFB`, white text, optional trailing "+" or check icon. Sizes: auth/forms full-width ~40 high; header CTA ~40 high (Add Project, Create Task, Add Meeting, Upload File, Save, Submit) | Everywhere | [seen] [code] |
| **Secondary/outline button** | Pill, 1px border, text and chevron: "Sign With Google" (full width), filter dropdown triggers | Auth, toolbars | [seen] |
| **Dashed "Add Task +" button** | Pill, dashed `#005AFB` border, blue text | Kanban column tops | [seen] [code] |
| **Dark inline button** | `#27272B` pill "Add +" inside the Add Guests input | Create Task, New Project, New Meeting | [seen] [code] |
| **Text link button** | "View All", "Join +", "Forget Password?", "Sign Up" | Dashboard cards, meetings, auth | [seen] |
| **Text input, notch label** | Label in a top-border notch, leading icon, `#CBD5E0` border, radius 12 | Auth, Create Task, New Project, New Meeting | [seen] [code] |
| **Text input, top label** | Label above, pill input radius 100, `#CBD5E1` border | Profile settings | [seen] [code] |
| **Date input** | Trailing calendar icon, placeholder "Start Date" / "End Date" | Modals, Reports | [seen] |
| **Select / dropdown trigger** | Outlined pill with chevron ("All Projects", "Newest", "This Week", "Project 1", "My Task", "English"), or text-only with chevron (chart headers, team selector) | Toolbars, card headers | [seen] |
| **Dropdown menu** | White card radius 16, rows with dividers, selected row has a green check-circle on the right | `1:8490`, `1:8501`, `1:8510`, `1:8523`, `1:8536`, `1:11468`, `1:11477` | [seen] [meta] |
| **Search field** | Pill with search icon: grey-filled (navbar, Tasks page) or white (All Projects, Files) | Navbar, toolbars | [seen] |
| **Guest picker** | Input with "@name" + "Add +", selected people as overlapping avatar chips below | Create Task, New Project, New Meeting | [seen] |
| **File dropzone** | Dashed grey border rectangle, upload icon + "Drag and drop files or click to upload" | Create Task, New Project | [seen] |
| **Modal** | White, radius about 24, title (Inter Medium 25) with close X, about 32 padding, full-width primary action at the bottom, dark backdrop | Create Task, New Project, New Meeting, chat thread | [seen] [code] |
| **Stat card** | Title, big number, trend line, fraction, coloured progress bar, tinted icon circle; gauge variant | Dashboard, Reports, Profile | [seen] |
| **Progress bar** | Thin rounded bar on a tinted track; colours blue (default), orange, green, per-project accent | Dashboard, project lists, teams, profile tasks | [seen] |
| **Gauge** | Semicircle dial with needle, percentage + caption | Dashboard Completion Rate, Project Progress | [seen] |
| **Area/line chart** | Smooth blue line with gradient fill, light grid, month x-axis; card header with Project and Period dropdowns | Dashboard, Project Overview | [seen] |
| **Priority badge** | Pill with tinted background + coloured text: High red, Medium yellow, Low green. "Critical" is never drawn | Dashboard tasks, Kanban cards | [seen] [code] |
| **Status text** | Coloured text, no pill ("active", "Done") | All Projects table | [seen] |
| **Completion badge** | Green-tint pill "42% Completed" | Project header | [seen] |
| **Tinted icon circle** | 32–56 circle, light tint + icon in accent colour | Projects list, stat cards, Project Details grid, Profile stats | [seen] |
| **Avatar** | Circle; sizes 24 (stacks), 32 (navbar), 40 (lists), 64 (chat), 92 (profile); leader verified badge; edit/settings badge on profile | Everywhere | [seen] |
| **Avatar stack** | Overlapping avatars, optional grey "+N" circle | Projects table, Kanban cards, meetings | [seen] |
| **Tabs, underline** | Blue text + 2px underline on active | Project details, Profile | [seen] |
| **Tabs, segmented** | Grey pill track, active segment lighter | Meeting details | [seen] |
| **Breadcrumb** | Grey parent > black current | Project details, Meeting details, Files | [seen] |
| **Kanban column** | Tinted header + kebab, dashed add button, stacked task cards | Project Tasks tab, Tasks page | [seen] [code] |
| **Task card** | See §3.7 | Kanban | [seen] |
| **Team card** | Tinted header with completion %, member rows | Project Teams tab | [seen] |
| **File card** | See §3.9 | Project Files, Profile Files, global Files | [seen] |
| **List row with divider** | Recent Files, Teams, Recent Activities, Notifications | Dashboard, Profile, overlays | [seen] |
| **Popover panel** | White card radius 16, shadow, title, list | Notifications `1:11840`, Recent searches `1:12331` | [seen] |
| **Checkbox** | Primary blue filled with white check | Auth | [seen] |
| **Phone input** | Country flag select + number + help icon | Profile settings | [seen] |

## 6. Navigation and interaction map

### 6.1 Navigation seen in the screens [seen] [inferred]

- **Navbar items** go to Dashboard, Projects (All Projects), Tasks (Tasks page), Chats, Meetings and Reports. There is no Ask AI or Profile item in the navbar. The user block at top-right is the likely entry to Profile, but no menu is drawn. **[inferred]**
- **Dashboard links:**
  - "Recent Files → View All" goes to Files (breadcrumb "Dashboard > Files").
  - The other "View All" links have no drawn targets. **[inferred]** Tasks would go to the Tasks page, Active Projects to All Projects, and Upcoming meetings to Meetings.
  - The Ask AI card leads to Ask AI. Ask AI screens highlight "Dashboard" in the navbar, which supports this. **[inferred]**
- **All Projects:** a row goes to Project details (breadcrumb "Projects > Alpha"), and "Add Project +" opens New Project (`1:8650`).
- **Project details tabs:** Overview, Tasks (Kanban), Teams, Files.
- **Kanban:** "Add Task +" (per column) and "Create Task +" open Create Task (`1:10646`). Whether the column "Add Task" pre-sets the status is not designed; the derived rule is that it does (§12.8).
- **Meetings:** "Add Meeting +" opens New Meeting (`1:8705`), and a meeting card or "Join +" goes to Meeting details (breadcrumb "Meetings > Design Review").
- **Navbar overlays:** search opens the Recent Searches overlay (`1:12331`) and the bell opens the Notifications overlay (`1:11840`).
- **Auth:** "Sign Up" and "Sign In" switch between the two auth screens. "Forget Password?" has no destination in Figma.
- **Profile:** the profile gear (settings) badge goes to Profile settings `1:11983`. **[inferred]**

### 6.2 Information architecture (designer's sitemap, `1:14127`) [seen] [meta]

The design's IA diagram lists the intended structure. It covers more than the drawn screens:

| Root | Children |
|---|---|
| Dashboard | Project Progress, Recent Activity, Teams Status, AI Assistant |
| Projects | Create Project, Workflows, Project Tasks, Project Files, Teams, Roles (admin-manager), Project Overview, Project Folders, File Filter, Project calendar |
| Tasks | All tasks, My tasks, Table view, Timeline, Task Details |
| Chats | Inbox, Project Chat, Channels, Threads, File Attachment, Search in chat |
| Meetings | Upcoming meetings, Create meetings, Invite participants |
| AI Assistant | Root-cause analysis, Current Blockers, Suggested Fixes, Apply Fix |
| Reports | Project Progress, Task & Project Completion Rate, Worker Activity Rate, Detailed Reports |
| Settings | Profile, Password, Notifications, Workspace settings, Meetings settings, Chat settings |

These IA items have no screens in the file: Workflows, Project Folders, Project calendar, Roles, Table view, Timeline, Task Details, and every Settings child except Profile.

### 6.3 Interactive states

The file has no hover, focus, pressed, disabled, loading or error states for any component. The only state differences visible are:

- the active navbar item (component variants)
- the selected chat row (grey fill)
- the unread notification row (light blue `#E6EFFF`-like fill)
- the "Today" calendar column (light blue)
- the checked checkbox
- the selected dropdown row (green check)

## 7. Forms and visible validation

No validation messages, error borders, required markers or disabled buttons are drawn anywhere. **[seen]** Field lists only:

| Form | Node | Fields (as drawn) | Primary action |
|---|---|---|---|
| Sign in | `1:10523` | Email, Password, Remember Me | Log in |
| Sign up | `1:10573` | Full Name, Email, Password, Remember Me | Sign up |
| New Project | `1:8650` | Project Name, Priority (select, default "High"), Add Guests (multi), Start Date, End Date, Add Project Files (dropzone) | Add Project |
| Create Task | `1:10646` | Task Name, Start Date, End Date, Add Guests (multi), Add Task Files (dropzone) | Create Task |
| New Meeting | `1:8705` | Meeting Subject, Select Date, Select Time, Select Duration, Add Guests (multi), Add Note (textarea) | Add Meeting |
| Profile settings | `1:11983` | Full Name, Email Address, Phone Number (with country), Availability Status, Job Title, Years of Experience, Current Team / Project | Save |
| Report request | `1:7501` | Report Type (select), Note, Start Date, End Date | Submit |

The validation rules the reference site uses for auth are recorded in `reference-site.md` §4 (Auth). Under D3 they are adopted as client-side rules (see §12.2–§12.5), and the server's 422 response stays authoritative.

## 8. Responsive design

**No responsive layouts exist in the file.** Every screen is 1440×1024 (Files is 1440×1004), and no frame narrower than 1000 is a screen. **[meta]** Breakpoint behaviour is unspecified. The reference site switches to a hamburger drawer below `lg` (`reference-site.md` §7). Responsive behaviour is specified as derived, provisional requirements in §12.11 (A3).

## 9. Design tokens and visual conventions

### 9.1 Colours (Figma variables, exact) [code]

| Role | Token name in Figma | Value |
|---|---|---|
| Primary | `Primary color/primary color-500` | `#005AFB` |
| Primary tint | `Primary color/primary color-50` | `#E6EFFF` |
| Link blue (auth) | `Primary Color-Blue/600-Base` | `#2563EB` |
| Blue (other) | `Primary Color-Blue/500` | `#3B82F6` |
| Page background | `BG color` | `#F6F8FA` |
| Surface | `White` / `Base/background white` | `#FFFFFF` |
| Label background | `BG label color` | `#F3F4F6` |
| Text primary | `Text Color` | `#000712` |
| Heading (auth) | `Text Color/800-Base-Heading` | `#1F2937` |
| Body text | `Text Color/600-Body` | `#718096` |
| Input border (auth/modals) | `Text Color/400` | `#CBD5E0` |
| Input fill (auth) | `Text Color/100` | `#F9FAFB` |
| Default black | `Default Black` / `Black` | `#191919` / `#252525` |
| Secondary text | `Secondary` | `#525256` |
| Dark (inline button, outline borders) | `secodary/secodary-500` | `#27272B` |
| Neutral tint | `secodary/secodary-50` / `-100` | `#E9E9EA` / `#BCBCBD` |
| Greys | `Gray/03`, `Gray/05`, `Gray/06`, `Gray/30`, `Gray/500` | `#9F9F9F`, `#E8E8E8`, `#F3F3F3`, `#F2F4F7`, `#606C80` |
| Profile greys (Tailwind slate) | `Gray/80`, `Gray/60`, `Gray/40`, `Gray/30`, `Gray/20`, `Gray/5` | `#1E293B`, `#475569`, `#94A3B8`, `#CBD5E1`, `#E2E8F0`, `#F8FAFC` |
| Success | `Support colors/Green/Normal` / `Light` / `:hover` | `#2BA52E` / `#EAF6EA` / `#279529` |
| Danger / High | `Support colors/Red/Normal` / `Light` | `#DB302A` / `#FBEAEA` |
| Warning / Medium | `Support colors/Yellow/Normal :hover` / `Light` | `#E6BA0E` / `#FFFAE7` |
| Orange (Pending) | `Support colors/Dark orange/dark orange-500` / `-50` | `#FA9E00` / `#FFF5E6` |
| Pink ("active" status) | `Support colors/Redish/Normal` | `#FA2B75` |
| Violet (project accent) | `Support colors/Violet 2/violet 2-500` / `-50` | `#7D2D7E` / `#F2EAF2` |
| Teal (project accent) | `Support colors/greeenish/greeenish-500` / `-50` | `#04B5AE` / `#E6F8F7` |
| Purple | `Support colors/Purple/Normal :active` | `#6837A4` |
| Pink tint (In Review column) | `Support colors/dark pink/Light` | `#FAECF6` |

The reference site's CSS uses the same core values (`reference-site.md` §7).

### 9.2 Typography [code]

**Three font families are in use:**

| Family | Where | Styles defined as Figma text styles |
|---|---|---|
| **Inter** | Auth, page titles, tables, cards, modals, Kanban | `Team C Text/H4` Semi Bold 31/1.5; `H5` Medium 25/1.5; `H6` Medium 20/1.5; `Body Re` Regular 16/1.5; `Body Me` Medium 16/1.5; `Caption` Regular 13/1.5; `small Body r` Regular 14/1.5; `Small Caption` Regular 12/1.5; `16px/Regular` 16/24; `Regular 14-20` 14/20; `Semibold 16-24` 16/24; `Medium 12-16` 12/16; `12px/Regular` 12/18; `12px/Medium` 12/18; `Extra Bold/10` 10/16 |
| **Rubik** | Navbar (wordmark, nav items, search, user block), dashboard and table body text | No text styles; set directly: Regular 12/16, 14/18, 20/16; Medium 12/20 |
| **Plus Jakarta Sans** | Profile settings only | `Heading sm/ExtraBold` 30/38 (−1.3 tracking); `Text md/Bold` 16/22; `Text md/Medium` 16/22; `Text sm/Bold` 14/20; `Paragraph/sm` 14/1.6 |

`Cairo Bold` also appears four times in the Kanban reference code, probably as a font fallback inside badges. **[code]**

**Adopted for implementation (D4):** use Inter for all application text and Rubik only for the wordmark; Plus Jakarta Sans is dropped. The table above records what Figma contains; the implementation mapping is in §12.12.

### 9.3 Radius, spacing, borders, shadows [code]

| Property | Values |
|---|---|
| Radius | Pill `100px`, used for buttons, nav, search, selects and badges. Cards `16px`. Auth card, modals and meeting media `24px`. Profile settings cards `32px`. Inputs: notch style `12px`, profile `100px`. Table rows and project icons `16–17.8px`. |
| Spacing | Page padding 64. Grid and card gap 24. Card padding 16–20, auth card padding 64, modal padding about 32. Common gaps 4, 8, 12, 16, 24, 32. Nav item padding 10. |
| Borders | 1px; `#CBD5E0` (inputs), `#C2C2C2` (file cards, outline controls), `#F3F4F6` (Kanban columns, rows), `#E9E9EA`, `#27272B` (dark outline dropdowns). |
| Shadows | Auth card `0 4px 8px rgba(0,0,0,0.16)`. Modal `0 8px 8px rgba(0,0,0,0.16)`. Navbar bottom: 4px gradient `rgba(9,30,66,0.13) → 0`. Dashboard cards and lists have none. |
| Icons | Outline style, about 24px (search, bell, calendar, download, kebab). The design-context code exports them as SVG assets. Names seen include `iconamoon:*`, `stash:*` and `line/design/*`, which suggests Iconify sets. **[meta]** |

## 10. Missing, ambiguous or conflicting details

**Figma against the approved MVP scope and the API.** These are confirmed gaps, not assumptions:

1. **Password recovery screens are missing.** Forgot password, verify code and reset password are Tier 1 (D1) and the API supports them, but Figma has no designs. The reference site has all three.
2. **Sign up has no confirm-password field**, but `POST /auth/register` requires `password_confirmation`.
3. **Google sign-in buttons** appear on both auth screens, but Google sign-in is out of scope (D1) and broken in the backend.
4. **The language selector** ("English"; options English, Arabic, France) is drawn, but no i18n or RTL requirement exists.
5. **The project status vocabulary doesn't match.** Figma shows "active" and "Done". The API values are `Pending`, `In Progress`, `On Hold`, `Completed`, `Cancelled`. Figma also gives no colours for the full set.
6. **"Critical" priority has no badge colour.** Figma draws only High, Medium and Low.
7. **Kanban column labels** "To-do" and "Completed Tasks" differ from the API keys `Pending` and `Completed`.
8. **Task cards show fields the API doesn't provide.** "Progress %" and comment counts have no source: `TaskResource` has `hours_spent` but no progress, and there are no task comment endpoints. The cards also show several avatars, but a task has a single `assigned_to`, and the "Reviewer" label has no API field.
9. **The Create Task modal doesn't match the API.**
   - Missing: `description`, `priority`, `status`, a project selector (`project_id` is required) and a team.
   - Has extras: Start Date (no API field) and multiple guests (the API allows one assignee). Files can be uploaded after creation with `POST /files` and `task_id`.
10. **The New Project modal doesn't match the API.**
    - Missing: `description` and `status`.
    - Guests map to `members[]`. Project files have to be uploaded after creation through `POST /files` with `project_id`.
    - There is no edit-project design, even though editing is Tier 1.
11. **The New Meeting modal doesn't match the API.** It lacks a project selector (`project_id` is required) and `meeting_link`, which is also required. Duration has to be turned into `end_time`. All three time placeholders wrongly read "Meeting Subject".
12. **"Project Type" (Project details)** has no API field.
13. **Team role labels in Figma** ("Front Leader", "Marketing Lead", "SEO Specialist"...) aren't in the API's 19 `role_in_team` values.
14. **The meeting details screen shows a recording player and a timestamped, speaker-attributed transcript with a language switch.** The API has a plain `transcript` text input, and no recording URL or transcript segments are known.
15. **Notifications** show no mark-all-read, delete or empty state, but the API and the reference site support all three.
16. **Recent searches** have no API; they could only be stored on the device.
17. **The profile navbar variant** lacks the search, bell and user block, and highlights "Reports".
18. **Mixed font families**: Inter, Rubik and Plus Jakarta Sans (§9.2). **Resolved by D4** (§12.12).
19. **No responsive layouts and no loading, empty, error or permission states** (§2.3, §8).
20. **Role-specific UI** (Team Member versus Project Manager versus Administrator) is not designed. Every screen shows the same user and the same buttons.
21. **Dashboard trend lines** ("+9% from last month") have no matching field in `GET /dashboard`. The response has counts and percentages but no month-over-month deltas.
22. **Dashboard stat cards differ from the old wireframe** layer (Total, Active, Completed, Overdue). The API gives pending, in-progress, in-review, completed, overdue and completion rate, so either card set can be filled. The final design is the one to follow.

## 11. Reconciliation with the reference website

The reference site's routes, behaviour and tokens are in `reference-site.md`. Only its auth screens could be rendered; everything else is known from route names and bundle strings.

| Area | In Figma | In reference site | Difference |
|---|---|---|---|
| Sign in | `1:10523` | `/login` (rendered) | Same copy and layout. The reference adds a show/hide password toggle and a "Logging in..." pending state. |
| Sign up | `1:10573` | `/register` (rendered) | The reference **adds Confirm Password**. Figma has none. |
| Forgot / verify / reset password | **absent** | `/forgot-password`, `/verify-code`, `/reset-password` (rendered) | Only the reference designs these. |
| App shell | Navbar `1:11556` | Pill top nav, hamburger drawer below `lg` | Same desktop pattern. Only the reference has a mobile drawer and an avatar dropdown (Profile, Edit profile, Sign out). |
| Role-based nav | Not designed | Items shown/hidden by role; Team Member "Reports" → `/profile` | Behaviour only in reference; D2 governs. |
| Dashboard | `1:8065` | `/` (bundle only) | Content not visible in reference. |
| Projects list, details | `1:8545`, `1:8753` | `/projects`, `/projects/[id]` (bundle) | Content not visible. |
| Kanban | `1:8978`, `1:10208` | `/tasks`, `/tasks?taskId=` (bundle); no drag-and-drop library found | The reference's `taskId` deep link implies a task details view, which Figma lacks. |
| Teams | Project Teams tab `1:9313` | No route; search results only | Figma has more. |
| Files | `1:9679`, `1:12191`, `1:11313` | `/profile/files`; no `/files` | Figma adds the global Files page. |
| Meetings | `1:9853`, `1:10091` | `/meetings`, `/meetings/[id]` (bundle) | Content not visible. |
| Notifications | Popover `1:11840` | Popover with unread count, mark read, mark all, delete, empty state | Reference behaviour is richer; Figma gives the visual style. |
| Global search | Recent searches `1:12331`, results fragment `1:12350` | Debounced search with filter chips and idle, loading, error, empty and results states | Reference behaviour is richer. Figma has no filter chips. |
| Profile | Overview, Tasks, Files, Settings | `/profile`, `/edit`, `/profile/files` (bundle) | Matches the structure. |
| Reports | `1:7501` | `/reports` with the same chart titles; the report form is a stub with no API call | Same concept. Out of scope. |
| Chats | 7 frames | `/chats` (bundle) | Out of scope. |
| Ask AI | 2 frames | No route | Figma only. Out of scope. |
| Tokens | §9 | Same primary, text, background and support colours; Inter; `--radius .625rem` | Figma adds Rubik and Plus Jakarta Sans; the reference uses Inter only. |

---

## 12. Derived requirements (`Derived — Not in Figma`)

Sections 1–11 describe only what exists in the Figma file. **This section is different.** It specifies Tier 1 screens and states that Figma lacks. They are derived under decision D3: built from existing Figma components and tokens, with behaviour and wording taken from the reference site, and limited to what the real API supports.

Each item is labelled **`Derived — Not in Figma`** and lists:
- **Built from:** the Figma components and nodes it reuses.
- **Behaviour from:** the reference-site evidence.
- **API:** the endpoints, with full mapping in `screen-feature-map.md`.

API-driven changes to the *original* screens are not here. They are in the mismatch register in `screen-feature-map.md`.

Where the reference site and the API disagree, the API wins (D3 rule 3).

### 12.1 Shared rules for every derived design

- **MVP visibility rules (D7, D8, D9):**
  - Hidden: the Chats and Reports nav items, the Dashboard Ask AI card, global search, the notification bell, the Tier 2 "View All" links, the language selector and project deletion.
  - Upcoming meetings and Recent Files are shown read-only from `GET /dashboard`.
- **Visual system:** only the tokens in §9 and the components in §5. Specifically:
  - Inputs: the notch-label text input (radius 12, `#CBD5E0` border, `#F9FAFB` fill).
  - Buttons: the full-width primary pill button.
  - Containers: the auth card (white, radius 24, auth shadow, 64 padding), the modal (radius 24, title Inter Medium 25, close X, full-width primary action) and the dropdown menu (radius 16, divided rows).
- **Error colour:** `Support colors/Red/Normal` `#DB302A` text and border, with `Support colors/Red/Light` `#FBEAEA` backgrounds.
- **Success colour:** `#2BA52E` / `#EAF6EA`.
- **Copy:** fix Figma typos. Take wording from the reference site where it exists, otherwise write plain English sentences.

### 12.2 Forgot Password: `Derived — Not in Figma`

- **Built from:** the Sign in screen `1:10523`. Same shell (wordmark, background `#F6F8FA`) and auth card; one notch-label Email input with the mail icon; primary pill button.
- **Behaviour and wording from:** reference `/forgot-password`:
  - Title "Forgot Password?"
  - Subtitle "We'll send you a verification code to reset your password."
  - Email placeholder "Enter your email"
  - Button "Send verification code", pending label "Sending..."
  - Footer "Remember your password? **Sign In**"
- **API:** `POST /auth/forgot-password` with `{email}`. The 200 response has `data.expires_in_minutes` (10) (spec, postman example). The response is the same whether or not the account exists, and inactive accounts get no code (postman).
- **Behaviour:**
  1. Validate the email on the client: trimmed, "Please enter a valid email address." (reference zod).
  2. On 200, go to Verify Code and carry the email along. The reference uses `?email=`. Keep it out of logs and analytics.
  3. Show the same success path for unknown emails. Never reveal whether an account exists.
  4. On 422, show `errors.email[0]` under the field. On 429 (shared limit of 10 requests per minute per IP, postman), show "Too many attempts. Please wait a minute and try again." The 429 response body is unverified.

### 12.3 Verify Code (OTP): `Derived — Not in Figma`

- **Built from:** the auth card. The 6 code boxes reuse the notch-input border, radius and fill, each about 48×56, with Inter Medium 20 centred. Below them: the primary pill button and text links styled like "Forget Password?" (`#2563EB`).
- **Behaviour and wording from:** reference `/verify-code`:
  - Title "Verify Your Email"
  - Subtitle "Enter the 6-digit verification code sent to: {email}"
  - Button "Verify code", pending label "Verifying..."
  - "Didn't receive the code? **Resend code**" (pending label "Sending...")
  - "Change email address" link
  - When the email is missing: "Email address is missing. Request a new verification code." with "Return to Forgot Password".
- **API:** `POST /auth/verify-reset-otp` with `{email, otp}`. It returns 200 with `data: null`, or 422 with `errors.otp[]` (postman examples). It checks the code without using it up.
- **OTP rules** (postman descriptions; the spec gives `otp` as a string with no length):
  - 6 digits, numeric only (`/^\d{6}$/`, "OTP must contain exactly 6 digits.").
  - Valid for **10 minutes** (`expires_in_minutes`) and single use.
  - Requesting a new code invalidates the old one.
  - Resending is blocked for **60 seconds** per email.
  - **Locks after 5 wrong attempts.**
- **Behaviour:**
  - Input: auto-advance between boxes, paste fills all six, numeric keyboard, `autocomplete="one-time-code"`.
  - Expiry countdown: show "Code expires in mm:ss" from `expires_in_minutes`. At zero, disable "Verify code" and say "This code has expired. Request a new one."
  - Resend: disabled with a 60-second countdown after each send. A resend calls `POST /auth/forgot-password` again and restarts both timers.
  - 422: show the server's `errors.otp[0]` under the boxes. The lockout and expiry messages arrive this way; their exact text is unverified.
  - 200: go to Reset Password, carrying the email and the OTP in memory. Use router state rather than the URL for the OTP.

### 12.4 Reset Password: `Derived — Not in Figma`

- **Built from:** the auth card with two notch-label inputs using the lock icon, plus the primary pill button.
- **Behaviour and wording from:** reference `/reset-password`:
  - Title "Reset Password"
  - Subtitle "Create a new password for your account."
  - Fields "New password" and "Confirm password"
  - Button "Reset password", pending label "Resetting password..."
  - Link "Back to Sign In"
  - When the email or code is missing: "Your email address is missing." with "Request a new reset code".
  - Show/hide password toggle.
- **API:** `POST /auth/reset-password` with `{email, otp, password, password_confirmation}`. It returns 200 with `data: null`, or 422 with `errors.otp[]` / `errors.password[]`.
- **Validation:** password at least 8 characters ("Password must contain at least 8 characters."), confirmation required ("Please confirm your password."), and the two must match ("Passwords do not match.").
- **Behaviour:**
  - On 200, go to Sign in with a success notice: "Your password has been reset. Sign in with your new password."
  - The API signs the user out of all devices. If this browser held a token, clear it.
  - If the response is 422 on `otp` (expired, used or locked), offer "Request a new reset code", which leads to Forgot Password.

### 12.5 Sign up: password confirmation field: `Derived — Not in Figma`

- **Built from:** the Sign up screen `1:10573`. Add a fourth notch-label input, "Confirm Password" (lock icon, placeholder "Confirm Password"), directly under Password.
- **Behaviour from:** reference `/register`. Rules: name at least 2 characters after trimming, a valid email, password at least 8 characters, and the confirmation required and matching (messages as in §12.4). On success, sign in automatically.
- **API:** `POST /auth/register` with `{name, email, password, password_confirmation}`. The 201 response has `{user, token, token_type}` (spec). On 422, map `errors.{field}[0]` to each field. A taken email arrives as `errors.email`.
- **Removed from the original design:**
  - "Remember Me": the register endpoint has no `remember` field.
  - The Google button and "OR" divider: out of scope (D1). This also applies to Sign in.
  - The "English" language selector on both auth screens: the MVP is English only (D8).

### 12.6 Edit Project: `Derived — Not in Figma`

- **Built from:** the New Project modal `1:8650`, in edit mode:
  - Title "Edit Project". Primary action "Save Changes".
  - Every field is pre-filled from `GET /projects/{id}/overview`.
  - Entry point: an outline pill button "Edit Project" in the Project details header, left of the Due Date card. Admin and PM only (D2).
- **Fields** (API-supported only, from `UpdateProjectRequest`; all optional on update):

| Field | Control (existing pattern) | API field | Rule |
|---|---|---|---|
| Project Name | Notch input with project icon | `name` | Required in the UI; max 255 |
| Description | Notch textarea (same pattern as the New Meeting "Add Note") | `description` | Optional |
| Priority | Notch select | `priority` | `Low`, `Medium`, `High`, `Critical` |
| Status | Notch select | `status` | `Pending`, `In Progress`, `On Hold`, `Completed`, `Cancelled` |
| Start Date | Date input with calendar icon | `start_date` | Required in the UI |
| Deadline (the Figma "End Date") | Date input with calendar icon | `deadline` | Must be on or after the start date (postman rule: `after_or_equal:start_date`) |
| Teams | Multi-select using the dropdown-menu pattern with checks | `teams` (team IDs) | Options come from `GET /teams` |

- **Left out:**
  - "Add Guests" (direct members): `PUT /projects/{id}` has no `members` field, and no endpoint exists for adding or removing a project's direct members. Members are set only at creation.
  - "Add Project Files": project files are Tier 2 (D1).
- **Create mode** (`1:8650`) follows the same field set, plus `members` (see the mismatch register).
- **States:** a pending label on the button, 422 errors under each field, a 403 permission message (§12.10), and the success path closes the modal and refetches the project.

### 12.7 Task Details: `Derived — Not in Figma`

- **Built from:** the modal pattern (`1:10646` shell, 720 wide), so it matches every other overlay. It opens over the Kanban when a task card is clicked, with the deep link `?taskId={id}` (reference `/tasks?taskId=`).
- **Layout:**
  - **Header:** the task name in Inter Medium 25, a priority badge, a status pill and the close X.
  - **Body:** label/value rows using the "Project Details" icon-circle grid style from `1:8753`.
  - **Footer:** the actions below.
- **API:** `GET /tasks/{id}` returns a `TaskResource` (verified).
- **Shown** (verified fields only):

| UI row | Field |
|---|---|
| Description | `description` (nullable, shows "No description") |
| Status | `status` (`Pending` / `In Progress` / `In Review` / `Completed`) |
| Priority | `priority` (`Low` / `Medium` / `High` / `Critical`) |
| Project | `project.name`, with a link to Project details |
| Team | `team.name` (nullable) |
| Assignee | `assignee.name`, `avatar_url`, `job_title` (nullable, shows "Unassigned") |
| Due date | `due_date` (nullable) |
| Completed at | `completed_at` (only when completed) |
| Hours spent | `hours_spent` |
| Created by | `creator.name`, `created_at` |
| Last updated | `updated_at` |
| Attachments | `attachments_count` (count only; listing them is Tier 2 files) |

- **Actions:**

| Action | API | Roles (D2) |
|---|---|---|
| Change status | Status select, `PATCH /tasks/{id}/status` with `{status}` | Admin, PM, TM |
| Edit | Opens the Create Task modal in edit mode, `PUT /tasks/{id}` | Admin, PM |
| Reassign | Assignee select, `PATCH /tasks/{id}/assign` with `{assigned_to, team_id?}` | Admin, PM |
| Delete | Confirmation dialog, `DELETE /tasks/{id}` | Admin, PM |

- **Delete confirmation:** a small modal with the title "Delete task?", the body "This permanently deletes "{name}".", an outline "Cancel" button, and a primary "Delete" button in `#DB302A`.
- **Not shown, because no API source exists:** comments and comment count, subtasks, progress %, reviewer, start date, activity history and watchers or guests.

### 12.8 Edit Task (edit mode of Create Task): `Derived — Not in Figma`

- **Built from:** the Create Task modal `1:10646`. Title "Edit Task", action "Save Changes", pre-filled from `GET /tasks/{id}`.
- **Fields for create and edit** (API-supported only, replacing the Figma field set as the mismatch register describes):

| Field | Control | API field |
|---|---|---|
| Task Name | Notch input | `name` (required, max 255) |
| Description | Notch textarea | `description` |
| Project | Notch select. Create: pre-set from the current project; required on the Tasks page. Edit: read-only. | `project_id` |
| Priority | Notch select | `priority` |
| Status | Notch select. Create: defaults to the column the user clicked "Add Task" in, otherwise `Pending`. | `status` |
| Due Date (the Figma "End Date") | Date input | `due_date` |
| Assignee | **Single-select** guest picker: the Figma "Add Guests" input without the multi-chip row, showing one avatar | `assigned_to` |

- Start Date and Add Task Files are left out (see the register).

### 12.9 User menu: `Derived — Not in Figma`

- **Built from:**
  - Trigger: the navbar user block (`1:11592`: name, job line and 32 avatar), plus a chevron.
  - Menu: the dropdown-menu pattern (`1:8501` style: white, radius 16, divided rows, 210 wide), right-aligned under the navbar.
- **Items:**
  1. A header row (not clickable) with the user's name and role. The role is `roles[0]` (Administrator, Project Manager or Team Member), which is the one place the system role appears.
  2. "Profile", which goes to Profile Overview.
  3. "Edit Profile", which goes to Profile settings.
  4. A divider.
  5. "Sign out", in `#DB302A` text.
- **Behaviour from:** reference user menu (Profile, Edit profile, Sign out).
- **Sign out:**
  1. Call `POST /auth/logout` (verified: `{success: true, data: null}`; it revokes the current token).
  2. Whatever the response, clear the stored token and all cached data, then go to Sign in.
  3. If the logout request fails (network or 401), still sign out locally.
- **Accessibility:** a menu button with `aria-expanded`, arrow-key navigation, and Escape to close.

### 12.10 Application states: `Derived — Not in Figma`

These apply to every Tier 1 screen and modal. The API error shapes come from `api-probe.md`:
- 401, 403, 404 and 500: `{success: false, message, errors: null}`
- 422: `errors: {field: string[]}`
- 429: unverified

| State | Trigger | Design (built from existing components) | Behaviour |
|---|---|---|---|
| **Loading** | Any request in flight | **Skeletons** in the exact shape of the target component: stat cards, table rows (60-high white bars), Kanban cards in `#F6F8FA`, file cards. Use `#F3F4F6` blocks with a subtle pulse. Buttons show a pending label ("Saving...") and are disabled. | Load data per screen or card, not at app start (AGENTS.md §4). Load each dashboard card's section independently. |
| **Empty** | A list or block returns no items | Inside the same card: a 56 tinted icon circle (§5) in `#E6EFFF` with the primary icon, a one-line message in Inter 16 `#718096`, and a primary pill action only if the role allows it (D2). Example: All Projects says "No projects yet" and shows "Add Project +" only for Admin and PM. An empty Kanban column shows "No tasks" under its add button. | No fake placeholder rows. |
| **Error (block)** | 5xx, network failure, or an unexpected shape | Inside the failing card: a red-tint icon circle (`#FBEAEA` / `#DB302A`), "Something went wrong. Please try again.", and an outline pill "Retry". Other cards keep working. | Retry refetches only that block. |
| **Error (form)** | 422 | Under each field: Inter 12 `#DB302A` text from `errors.{field}[0]`, and the field border turns `#DB302A`. A message that isn't tied to a field shows as an alert line above the primary button (`role="alert"`). | Focus the first invalid field. |
| **Unauthorized** | 401 on any authenticated call | No screen of its own. | Clear the token and cache, then go to `/login?redirectTo=<current path>`. Only same-origin paths are honoured (reference behaviour). |
| **Permission denied** | 403 | For a mutation: an inline alert or toast, "You don't have permission to do this.", and any optimistic change is rolled back (D2), for example a Kanban card returns to its column. For a page: the empty-state layout with a lock icon, "You don't have access to this page." and a link back to the Dashboard. | The UI hides actions by role (D2). A 403 can still occur because the server is the authority. |
| **Not found** | 404 on a details route | Empty-state layout: "This project (or task) doesn't exist or was removed." and a link back to the list. | |
| **Success feedback** | Create, update, delete or status change | A toast in the popover style (white, radius 16, shadow) at the bottom right: a green check circle and a short message ("Project updated."). It closes itself after about 4 s. | The reference site uses a similar toaster. |

### 12.11 Responsive behaviour: `Derived — Not in Figma`

Figma contains **only 1440-wide desktop frames** (§8). The rules below are derived requirements, not designs. They follow the reference site's breakpoint behaviour (hamburger drawer below `lg`).

| Width | Layout rules |
|---|---|
| **≥ 1280** | As designed: 64 side padding, content up to 1312 wide, dashboard 4 columns. |
| **1024–1279** | Side padding 32. Dashboard 2 columns, so each pair of Figma rows reflows to two-wide. The navbar keeps the pill nav. (The search control is hidden in the MVP, D7; once Tier 2 search ships, it collapses to an icon button at this width.) |
| **768–1023** | The navbar becomes: wordmark, then a menu (hamburger) button, then bell and avatar. The nav items move into a slide-in drawer that uses the same pill items stacked vertically, with the active item in solid blue. The dashboard and project-details columns stack to 1–2 columns. The Projects table becomes a list of cards showing the same fields. Kanban: the 4 columns scroll horizontally with snap, each about 300 wide. |
| **< 768** (minimum 360) | Side padding 16. Everything is one column. Modals open full screen with a sticky primary action. Auth cards fill the width with 24 padding. Task Details opens full screen. Tables are always card lists. |

- Touch targets are at least 44×44.
- The Kanban status change works without drag: use the status select in Task Details, or a status menu on the card. Drag-and-drop is an enhancement, because Figma doesn't design it.

### 12.12 Typography mapping (decision D4)

The text styles Figma defines in Inter (§9.2) are the type scale. The Rubik and Plus Jakarta Sans usages in Figma map onto that scale as follows. Size and line height stay as close to Figma as the Inter scale allows.

| Figma usage | Figma font | Implementation |
|---|---|---|
| "Collabspace" wordmark (navbar `1:11557`, auth screens) | Rubik Regular 20/16 | **Rubik Regular 400, 20/16** (the only Rubik usage) |
| Navbar items | Rubik Regular 12/16 | Inter Regular 12/16. The active item keeps white on `#005AFB`. |
| Navbar search label | Rubik Regular 14/18 | Inter Regular 14/20 (`Regular 14-20`) |
| Navbar user name / job line | Rubik Medium 12/20 | Inter Medium 12/20 |
| Table body and dashboard text set in Rubik | Rubik Regular/Medium, same size | Inter at the same size and weight |
| Profile settings name heading | Plus Jakarta Sans ExtraBold 30/38, −1.3 tracking | Inter Semi Bold 31/1.5 (`Team C Text/H4`, the page-title style), normal tracking |
| Profile settings section titles ("Personal Info", "Experience") | Plus Jakarta Sans Bold 16/22 | Inter Semi Bold 16/24 (`Semibold 16-24`) |
| Profile settings field labels | Plus Jakarta Sans Bold 14/20 | Inter Semi Bold 14/20 |
| Profile settings input text | Plus Jakarta Sans Medium 16/22 | Inter Medium 16/1.5 (`Team C Text/Body Me`) |
| Profile settings helper text | Plus Jakarta Sans Regular 14/1.6 | Inter Regular 14/1.5 (`Team C Text/small Body r`) |
| Inter Extra Bold 800 (`Extra Bold/10` style, Meetings frame) | Inter 800 | Inter Bold 700, same size |
| Cairo Bold (Kanban, 4 usages) | Cairo | Inter Bold 700, same size |

- **Weights loaded:** Inter 400, 500, 600 and 700 (normal style, latin), plus Rubik 400. Nothing else.
- **Fallback stack:** `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. The wordmark uses `Rubik, Inter, sans-serif`.

---

## Appendix A. Previous file `SCHXPmHRpSLniAusWY3Lct` (no longer used)

Kept for history. These attempts and observations apply to the old file only.

### A.1 Access attempts

| # | Method | Result |
|---|--------|--------|
| 1 | `web_fetch` of the design URL | The tool returned no readable content. A direct `curl` of the same URL returned **HTTP 403** with a CloudFront "Request blocked" HTML page, so Figma's edge blocks non-browser clients. The editor is a JS app in any case and serves no design data as HTML. |
| 2 | oEmbed `https://www.figma.com/api/oembed?url=<encoded URL>` | **HTTP 200**, JSON. It returned the title `Collabpspace, Team C`, the key, the provider `Figma`, iframe HTML pointing at `embed.figma.com` (800×450, `page-selector=1`), and a signed `thumbnail_url` on `api-cdn.figma.com` (`thumbnail_width` 640, signature expires 2026-11-30 UTC). |
| 2b | The embed iframe URL `embed.figma.com/design/...` | **HTTP 302** to `https://www.figma.com/embed/interstitial?...`. That is the interactive JS viewer, which is not usable without a browser. |
| 3 | REST `GET https://api.figma.com/v1/files/SCHXPmHRpSLniAusWY3Lct` without a token | **HTTP 403**, body `{"status":403,"err":"Invalid token"}`. |
| 3b | Env vars `FIGMA_TOKEN` / `FIGMA_ACCESS_TOKEN` | Neither is set, so no authenticated call was made. The machine was not searched for other tokens. |
| 4 | Figma MCP or other Figma tools in this agent | None available. The tool catalogue has no Figma MCP server or Figma tool. |
| 5 | oEmbed thumbnail download | `width=640`: **200**, PNG 640×1536 (134 KB). Changing the width param to `width=1280` also worked: **200**, PNG 1280×3071 (361 KB). `width=2048`, `width=4096`, and no width all returned **400**. Both PNGs were saved to `%TEMP%` (`figma-collabspace-thumb.png`, `figma-thumb-1280.png`), cropped, upscaled, and viewed. |
| 6 | Web search for `"Collabpspace" Team C figma` and `CollabSpace figma community design file` | Only generic Figma help and forum pages came back. No public Community copy of this file was found. |

### A.2 What was inspected (old file, thumbnail only)

The only design content seen was the **canvas thumbnail of page 1** (`node-id=0-1`), a 1280×3071 PNG that shows the whole page zoomed out. Most text is unreadable at this size. The items below are only what is visible. Labels marked *(uncertain)* were read from blurry pixels.

#### Page and frame structure

- Page names, the page count, frame names, node IDs, and layer structure are **not visible**. The oEmbed `page-selector=1` parameter implies the file has a page selector, but the page count is unknown.
- The page-1 canvas holds four loose clusters: UX research artifacts (top), a long vertical case-study presentation (right), screen groups (bottom right), and loose components and modals (bottom left).

#### UX research artifacts (top of canvas)

- **Sitemap / information-architecture trees:** two light trees, each with one blue root node and eight blue branch headers, each branch carrying a list of child nodes. One copy sits inside a frame titled "Information Architecture" *(uncertain)*. The node text is unreadable.
- **"Information Architecture" dark frame:** a black slide with a red top node, yellow second-level nodes, and grey leaves. The node text is unreadable.
- **Competitor research:** logos for ClickUp, Trello, Asana, Notion, and Slack. There is a feature comparison table with a yellow-to-orange header row and green/red markers per cell, and a second matrix card with blue row labels and blue/red dots, titled "Competitor analysis" *(uncertain)*.
- **Personas:** one persona card named **"Omar Adel"** (photo, green side panel, text blocks for bio, goals, needs, and challenges), and a second smaller persona card with a different photo. Its name is unreadable.
- **Cover image:** a blue gradient slide reading "CollabSpace" / **"Remote Work Collaboration"** with hands holding a tablet that shows a dashboard.

#### Case-study presentation (right side, one tall frame)

Section headings, top to bottom (small blue-dot headings, mostly legible):

1. Cover: "Remote Work Collaboration" with a tablet mockup.
2. Project Overview: paragraph plus a key/value table.
3. Tools: three avatar/tool entries.
4. Problems **VS** Solutions *(uncertain wording)*: two columns.
5. Personas: two persona layouts.
6. Competitor analysis: the dot matrix.
7. Information architecture: the tree.
8. **Color palette & typography:** the font specimen reads **"Inter"**. Two half-circle swatches are visible, **blue** and **black/near-black**, with smaller swatch labels that are unreadable. No hex values could be read.
9. Wireframes: grey low-fidelity layouts.
10. Laptop mockup sections labeled roughly: Dashboard, Project Details, Tasks, Chats, Meetings Schedule, Live Meeting *(labels uncertain)*.
11. "+20 Screens" collage.
12. "Thank You For Watching" closing slide with three avatars.

#### Application screen groups (bottom right)

Each group sits under a dark header bar whose title is unreadable. The visual layout shared by the app screens: a **horizontal top navigation bar** with a blue pill for the active item, light grey page background, white cards, and blue primary buttons.

| Group (inferred from content) | Screens seen | What is visible |
|---|---|---|
| Auth | 2 | "Sign In" and "Sign Up" centered card forms, each with a full-width blue button. |
| Dashboard | 1 | Row of stat cards, a line chart, a gauge, and list widgets. |
| Projects *(inferred)* | 5 | A projects table/list; a project detail with a line chart and gauge; two column (kanban-style) boards, one with avatars; a grid of file items with red file icons. |
| Tasks board | 1 | Four colored kanban columns with task cards and a blue action button. |
| Chats | 7 | A "Chats" list with a "Recent" section; a "Select Chat" empty state; an open conversation with a message input; a "Project Chats" list; and a state with a dark overlay or modal. |
| Meetings | 2 | A weekly calendar grid titled "Meetings" *(uncertain)* with event chips; a live meeting view with a video tile and a right-side panel. |
| Analytics / reports *(inferred)* | 1 | Three percentage stat cards (values read as roughly 70 %, 88 %, 67 %), a blue bar chart, a green area chart, and a line chart. |
| Profile *(inferred)* | 4 | An avatar header with tabs, then variants: an overview with lists, a two-column list/checklist, a file grid, and a form with a full-width blue button. |
| AI assistant *(inferred)* | 2 | A centered empty/welcome state with an icon and a prompt input; a chat thread with blue user bubbles. The heading may read "CollabSpace AI" *(uncertain)*. |

#### Loose components (bottom left)

Visible but unlabeled: several modal forms with a full-width blue submit button (one may be "Create Task" *(uncertain)*), a profile edit form, a dark-themed card row, a date or schedule picker list with blue pills, a chat window component with a blue header, a files screen, and small loose fragments. There are no component names, variants, or properties.

#### What could not be inspected (old file)

- Page list, page names, and any page other than page 1.
- Frame and screen names, node IDs, frame sizes, and breakpoints (mobile vs desktop frames).
- All readable text: copy, labels, navigation item names, and table columns.
- Exact color values, design tokens or styles, type scale (sizes, weights, line heights), spacing, radii, shadows, and grid settings. Only "Inter", blue, and near-black were seen.
- Components and variants, the component library, auto-layout and constraints.
- Prototype flows and interactions, Dev Mode specs, exported assets, icons, and images.
- Whether the file uses published library styles or variables.
- The thumbnail is a downscaled raster of the page-1 canvas, so nothing above can be measured from it.

#### What the user was asked to provide (old file; superseded by the new owned file)

Cheapest first:

1. **A Figma personal access token** exported as `FIGMA_TOKEN` (Figma → Settings → Security → Personal access tokens, read-only `file_content:read` scope is enough). It must belong to an account that can view this file. With it, the agent can call `GET /v1/files/SCHXPmHRpSLniAusWY3Lct?depth=2` for pages and frames, `/v1/files/:key/nodes` for specific frames, `/v1/images/:key` for PNG renders of each frame, and `/v1/files/:key/styles` and `/variables/local` for tokens (variables require an Enterprise plan).
2. **The Figma MCP server**, configured in `.kiro/settings/mcp.json`. It handles its own OAuth and gives per-node design context and screenshots. Figma limits access to clients listed in its MCP Catalog. Whether this Kiro client is listed, and which seat is required, was **not verified** in this session.
3. **Exports without API access:** PNG exports at 2x of each screen frame, or a PDF of the pages, placed in the repo (for example `docs/design/`). Also useful: a screenshot of the Layers panel showing page and frame names, and the Local styles/variables panel.
4. **Dev Mode links** (`...?node-id=X-Y&m=dev`) for specific frames. These help only together with option 1 or 2, since the agent cannot render the Figma web app.

Source notes from that session: the endpoint names in option 1 (`/v1/files/:key/nodes`, `/v1/images/:key`, `/styles`, `/variables/local`) come from general knowledge of the Figma REST API and were not re-fetched. `api.figma.com/v1/files/:key` returned 403 `Invalid token` without a token.

### A.3 Figma MCP connectivity check (Kiro)

- **MCP server:** missing, not merely inaccessible. Neither `C:\Users\hp\.kiro\settings\mcp.json` nor `.kiro/settings/mcp.json` exists, no Figma MCP tool is available to the agent, and nothing listens on the desktop server address `http://127.0.0.1:3845/mcp` ("Unable to connect to the remote server").
- **REST fallback:** `api.figma.com/v1/files/SCHXPmHRpSLniAusWY3Lct` returns `403 {"err":"Invalid token"}` without a token. No `FIGMA_*` environment variable is set.
- **File sharing:** unknown until a signed-in account tries the file. The MCP server only reads files the signed-in account can already open.
- **Rate limits** (https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/): View and Collab seats, and every seat on the Starter plan, get 20 read tool calls per month. Full and Dev seats on paid plans get 200 per day.
- **Setup sources:** https://developers.figma.com/docs/figma-mcp-server/ lists Kiro as supporting the remote server. https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/ gives the URL `https://mcp.figma.com/mcp` with sign-in on first connect. https://kiro.dev/docs/mcp/configuration.md covers the `mcp.json` format. The user chose not to configure Kiro and to use Agy instead.

### A.4 Figma check through Agy on the old file

- **Connection:** the Agy `figma` plugin's MCP server is connected and signed in. `whoami` reported a Full seat on a team with an Education (student) tier, so the limit is 200 read calls per day and 10 per minute.
- **File access:** denied. `get_metadata` and `get_screenshot` on node `0:1` both returned: "Looks like you don't have edit access to this file. The file owner can share it with you and make you an editor." (Figma debug UUIDs `3db1b8ec-565e-492f-b36e-52153403c7f7` and `821470f1-d2a0-4034-8282-527eeeefee92`.)
- **Calls used:** 1 `whoami` (exempt from rate limits) and 2 failed read calls. Nothing was edited.
- **Inspected:** nothing. No pages, frames or screenshots were retrieved.

### A.5 Sources

- Figma REST API scopes: https://developers.figma.com/docs/rest-api/scopes/
- Figma MCP server introduction: https://developers.figma.com/docs/figma-mcp-server/
- Figma MCP rate limits and access: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/
- Figma Community publishing: https://help.figma.com/hc/en-us/articles/360040035974-Publish-files-to-the-Figma-Community
