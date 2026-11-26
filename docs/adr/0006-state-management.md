# ADR-06: State Management

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §4, §6, §8 (item 7: State management), Spec ID-5, ID-15, ID-17

---

## Context

CollabSpace manages five categories of state across Tier 1 screens (`ID-5`, `ID-17`, `M25`–`M27`):

1. **Remote API data:** user profile/stats, dashboard metrics, paginated projects, project overview, Kanban board tasks, task details, team rosters, and people-picker results.
2. **Shareable / deep-linkable view state:** Projects list `search`, `status`, `sort`, and `page` query parameters (`ID-5`); deep-linked `taskId` opening the Task Details modal over the current board (Story 62, `ID-3`).
3. **Device preference state:** Last-selected project ID on the global Tasks page so returning users land on their previous project (`M27`, Story 53).
4. **Ephemeral UI state:** Open/closed dialogs, user menu, dropdowns, client-side Kanban search/"My Task" filter, active tabs, and in-progress form drafts.
5. **App-wide client state:** Authenticated session (`status`, `user`, `role`, login/logout actions) and transient success/error toast notifications.

`AGENTS.md` §4 & §6 require keeping state close to its owner, avoiding redundant/duplicated state, and adding no dependency unless justified by a real requirement.

---

## Decision

Install **no global state management library** (no Redux, no Zustand, no Jotai/MobX). Assign every piece of state to exactly **one canonical owner**:

| State category | Canonical owner | Rules & scope |
|---|---|---|
| **Server state** | **TanStack Query `5.108.4`** (`ADR-05`) | Single source of truth for all API responses. Never copy query results into Context or `useState` unless editing a form draft (`ID-15`, `ID-17`). |
| **URL / shareable state** | **React Router `8.5.3` `useSearchParams` / route params** | Projects list (`search`, `status`, `sort`, `page`), selected project route (`/projects/:projectId`), and open task modal (`?taskId=...`). Survives reload and link sharing. |
| **Tasks page last project (`M27`)** | **Browser `localStorage`** (single helper key `collabspace:lastTasksProjectId`) | Used exclusively by the Tasks page when no explicit project is in the URL; validated against the user's accessible projects list and cleared on sign-out so a different user on the same browser does not inherit an inaccessible project ID. |
| **Ephemeral UI & form drafts** | **Local `useState` / `react-hook-form`** (`ADR-08`) | Dropdowns, modals, client-side Kanban board filters (`M26`), and unsaved form fields live inside the owning component/hook. Derived values are computed during render, never mirrored in `useEffect` (`ID-15`). |
| **App-wide client state** | **Two split React Contexts** (`SessionContext` & `ToastContext`) | Kept strictly separate so toast updates never re-render session consumers, and session updates never touch unrelated UI. `ToastContext` splits state (`toasts`) and dispatch (`toast`) into separate contexts where helpful so components calling `toast.success(...)` do not re-render when toasts dismiss. |

### Guardrails
- **Prop drilling first:** Pass props directly across 1–2 component levels before considering Context (`react.dev`, `ID-17`).
- **No server data in Context:** `SessionContext` stores session status and delegates the canonical `user` profile data to TanStack Query's `['auth', 'me']` cache (or mirrors it cleanly from the session restore lifecycle with `['auth', 'me']` as the invalidation target).
- **External store subscriptions:** Any non-React browser store (e.g., `BroadcastChannel` or online/offline listeners) uses `useSyncExternalStore` or clean `useEffect` subscription with cleanup (`ID-15`).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Zustand** | Lightweight external store for session, toasts, and UI filters. | **Rejected for MVP.** Once TanStack Query owns server state, React Router owns URL state, and `react-hook-form` owns form drafts, the only remaining app-wide client state is `SessionContext` (changes only on login/logout/profile update) and `ToastContext` (transient notifications). Adding Zustand introduces an extra library and second mental model for two tiny, low-churn contexts (`AGENTS.md` §6, `ID-17`). |
| **2. Redux Toolkit (RTK)** | Centralized Flux store + slices (with or without RTK Query). | **Rejected.** Heavy boilerplate (store, slices, actions, selectors) unnecessary when TanStack Query already handles all server caching, deduplication, and optimistic rollback. |
| **3. Single monolithic `AppContext` (simpler context option)** | Put session, toasts, filters, and modal flags into one root Context provider. | **Rejected.** Causes whole-tree re-renders whenever a toast appears or a filter changes, violating `ID-17` context-splitting discipline. |

---

## Consequences

### Positive
- Zero state-management dependencies; smaller bundle and zero extra APIs for parallel feature agents to learn.
- Single source of truth eliminates synchronization bugs between local state and server cache (`react.dev` state-structure rules).
- Deep-linkable URLs for Projects search/pagination and Task Details work out of the box with browser Back/Forward navigation.

### Negative
- If Tier 2 or post-MVP real-time features (e.g., Reverb live chat message buffers or complex multi-panel workspace state) later introduce high-frequency cross-tree client state, a dedicated store (such as Zustand) can be added via a new ADR without refactoring server-state queries.

### Accepted Residual Risk
- Misusing Context for rapidly changing values can cause unnecessary re-renders; mitigated by restricting Context strictly to `SessionContext` and `ToastContext`, verified in Gate 1 and Gate 2 reviews.

### Backend Dependencies
- None.

---

## Sources

- https://react.dev/learn/choosing-the-state-structure (React 19.3.1 docs, checked 2026-11-26) — Avoiding redundant and duplicated state; computing derived values during render.
- https://react.dev/learn/passing-data-deeply-with-context (React 19.3.1 docs, checked 2026-11-26) — Preferring props and `children` first; appropriate Context use cases (current account, notifications).
- https://react.dev/learn/sharing-state-between-components (React 19.3.1 docs, checked 2026-11-26) — Single source of truth per piece of state.
- https://react.dev/learn/you-might-not-need-an-effect (React 19.3.1 docs, checked 2026-11-26) — Avoiding Effect-driven state syncing and using `useSyncExternalStore` for browser subscriptions.
- https://tanstack.com/query/latest/docs/framework/react/guides/caching (TanStack Query 5.108.4, checked 2026-11-26) — Server-state ownership and shared cache deduplication.