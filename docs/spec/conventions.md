# CollabSpace Implementation Conventions Addendum (WI-3)

This addendum is the binding engineering reference for foundation and feature implementation slices (`WI-4` through `WI-11`). It operationalizes [AGENTS.md](../../AGENTS.md), [ADR-03](../adr/0003-folder-structure-and-import-boundaries.md), [ADR-04](../adr/0004-component-architecture-and-styling.md), [ADR-05](../adr/0005-api-layer-and-data-fetching.md), [ADR-08](../adr/0008-forms-and-validation.md), [ADR-10](../adr/0010-testing-strategy-and-tools.md), [ADR-11](../adr/0011-dependencies-versions-and-tooling.md), and [mvp-spec.md](./mvp-spec.md) (`ID-13`, `ID-14`, `ID-15`, `ID-24`).

---

## 1. Canonical `src/` Folder Layout and Path Alias

Every source file belongs to one layer in the canonical `src/` layout (`ADR-03` §1):

```text
src/
  main.tsx                    # Entry point: CSS/font imports, preloadError handler, createRoot
  app/                        # WI-6 owned: router, providers, AppShell, root & route error boundaries
    App.tsx
    router.tsx
    providers.tsx
    AppShell.tsx
    RootErrorBoundary.tsx
    RouteErrorBoundary.tsx
  features/                   # Vertical slices (one owning ticket per feature)
    auth/                     # WI-6
    dashboard/                # WI-7
    projects/                 # WI-8
    tasks/                    # WI-9
    profile/                  # WI-10
      components/             # Feature-private UI components
      hooks/                  # Feature hooks (use<Thing>.ts)
      schemas/                # Zod v4 form schemas matching docs/api/plain.md
      types/                  # Feature-local UI/view types (domain DTOs stay in shared/api)
      utils/                  # Feature-local pure helpers and copy strings
      index.ts                # Single public entry file importable by app/ or other features
  shared/
    config/                   # WI-3: validated public environment schema (env.ts, index.ts)
    tokens/                   # WI-4: Tailwind v4 @theme tokens & typography rules
    ui/                       # WI-4: domain-agnostic primitives, state components, index.ts
    api/                      # WI-5: httpClient, AppError, pagination, dates, services/, index.ts
      httpClient.ts
      errors.ts
      pagination.ts
      dates.ts
      services/               # Centralized Tier 1 domain services, query keys, queryOptions
      index.ts
    lib/                      # WI-5: session, capabilities, safeUrl, returnPath, index.ts
      index.ts
  test/                       # WI-3: shared test setup, renderWithProviders, axe helper, fixtures
    setup.ts
    render.tsx
    a11y.ts
    fixtures/
```

### Path Alias (`@/*`)

- `@/*` resolves to `./src/*` consistently across `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`.
- Use `@/...` for cross-layer and cross-directory imports (`@/shared/ui`, `@/shared/api`, `@/features/tasks`).
- Use relative imports (`./...`) only within the same feature folder or same shared module.

---

## 2. File/Symbol Naming and Export Rules

| Artifact               | File Naming Pattern     | Export Convention                                        |
| ---------------------- | ----------------------- | -------------------------------------------------------- |
| React component        | `PascalCase.tsx`        | Named export matching filename (`export function Foo()`) |
| Custom hook            | `use<Thing>.ts`         | Named export (`export function useThing()`)              |
| Domain service         | `<domain>.service.ts`   | Named exports (`<domain>Keys`, `<domain>Queries`, fns)   |
| Zod form schema        | `<form>.schema.ts`      | Named schema + inferred type (`z.infer<typeof ...>`)     |
| Pure utility / helper  | `camelCase.ts`          | Named pure functions and types                           |
| Public barrel entry    | `index.ts`              | Re-export public API only; zero side effects             |
| Unit / component tests | `*.test.ts(x)`          | Explicit Vitest imports (`describe`, `it`, `expect`)     |
| Playwright E2E tests   | `e2e/<name>.spec.ts`    | Uses `@playwright/test` and `@axe-core/playwright`       |

- **Named exports by default:** Every component, hook, service, schema, and utility uses named exports (`ID-14`).
- **Default exports:** Restricted strictly to root tool config files (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`) where the tool requires `export default`. Route modules return `{ Component }` inside React Router `lazy` loaders rather than default-exporting pages.
- **Type assertions (`as`) and `any`:** Forbidden unless genuinely unavoidable, and every `any` or type assertion MUST carry an inline comment explaining why (`AGENTS.md` §7).

---

## 3. Single Public Entry File (`index.ts`)

- **Feature public entry (`src/features/<domain>/index.ts`):** Exports only route page components, explicitly shared widgets (for example `KanbanBoard` exported by `src/features/tasks/index.ts` for Projects' Tasks tab), and public types needed by `src/app/` or a peer feature.
- **Shared surface entries (`src/shared/<area>/index.ts`):** Consumers import from `@/shared/config`, `@/shared/ui`, `@/shared/api`, and `@/shared/lib` rather than deep internal paths.
- **Shared ownership (`ID-13`):** Only the owning ticket edits a shared surface (`WI-3` config/scaffold, `WI-4` tokens/UI, `WI-5` API/lib/services, `WI-6` app shell/auth). Parallel feature tickets treat shared surfaces as read-only.

---

## 4. Import-Boundary Matrix and Banned Patterns

ESLint (`eslint-plugin-boundaries` + `no-restricted-imports` + `no-restricted-globals` + `no-restricted-syntax`) enforces `ADR-03` §2 at lint time:

| Source Layer              | May Import From                                                 | Forbidden                                                         |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/main.tsx`            | `src/app/*`, `src/shared/tokens/*`, CSS/font packages           | `features/*` internals, `shared/api/*`                            |
| `src/app/*`               | `features/*/index.ts`, `shared/*` entry points                  | Deep `features/<x>/*` internals                                   |
| `src/features/<name>/*`   | Same-feature internals, other `features/*/index.ts`, `shared/*` | Other features' deep paths, `src/app/*`                           |
| `src/shared/ui/*`         | `shared/tokens/*`, `shared/ui/*`                                | `features/*`, `app/*`, `shared/api/*`, `shared/lib/*`, `config/*` |
| `src/shared/api/*`        | `shared/api/*`, `shared/lib/*`, `shared/config`                 | `features/*`, `app/*`, `shared/ui/*`                              |
| `src/shared/lib/*`        | `shared/lib/*`, `shared/config`                                 | `features/*`, `app/*`, `shared/ui/*`                              |
| `src/shared/tokens/*`     | `shared/tokens/*`                                               | Everything else                                                   |
| `src/shared/config/*`     | `zod`                                                           | `features/*`, `app/*`, `shared/ui/*`, `shared/api/*`              |
| `src/test/**`, `*.test.*` | Any module under test + test utilities                          | Production code importing from `src/test/**`                      |

### Banned Patterns

1. **`dangerouslySetInnerHTML`:** Banned project-wide (`eslint` error, `ID-20.5`). Render all API strings and AI summaries as plain text.
2. **Raw `fetch`:** Banned in `src/` outside `src/shared/api/httpClient.ts` and test files (`eslint` error, `ADR-05`).
3. **`react-router-dom`:** Banned (`no-restricted-imports` error). React Router v8 imports from `'react-router'` and `'react-router/dom'`.
4. **Direct `import.meta.env` / `process.env`:** `process.env` is banned in `src/`; `import.meta.env` is permitted only in `src/shared/config/env.ts` so all runtime config passes `parsePublicEnv`.
5. **Deep cross-feature imports & circular imports:** Blocked by `boundaries/entry-point` and `boundaries/element-types`.
6. **Hardcoded hex colors in feature code:** Consume Tailwind `@theme` tokens from `src/shared/tokens/tokens.css` (`ADR-04`).
7. **Mock data outside tests:** Mock payloads and fixtures live solely in `src/test/` (`AGENTS.md` §7).

---

## 5. Standard Data & Hook Patterns

### (a) Domain Service (`src/shared/api/services/<domain>.service.ts`)

Each Tier 1 domain owns one service module under `src/shared/api/services/` (`WI-5`). Services define each endpoint path once, type request/response DTOs strictly from `VERIFIED` and `DOCUMENTED` fields in `docs/api/plain.md`, normalize pagination (`P1`–`P4`), and delegate HTTP transport to `httpClient`. They contain zero React imports.

```ts
import { httpClient } from '@/shared/api/httpClient';
import { normalizeP1, type PaginatedResult } from '@/shared/api/pagination';

export interface ProjectSummaryDto {
  id: number;
  name: string;
  status: string;
  deadline: string | null;
}

export interface ListProjectsParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
}

export async function listProjects(
  params: ListProjectsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<ProjectSummaryDto>> {
  const response = await httpClient.get<unknown>('/projects', {
    query: {
      page: params.page ?? 1,
      per_page: params.perPage ?? 15,
      search: params.search || undefined,
      status: params.status || undefined,
    },
    signal,
  });

  return normalizeP1<ProjectSummaryDto>(response);
}
```

### (b) Query-Key and `queryOptions` Factory

Keep query keys and `queryOptions` factories alongside the domain service so every hook, optimistic updater, and cache invalidation references one deterministic key structure and forwards TanStack Query's `AbortSignal` (`ADR-05` §3).

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { listProjects, type ListProjectsParams } from './projects.service';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: ListProjectsParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (projectId: number) => [...projectKeys.details(), projectId] as const,
};

export const projectQueries = {
  list: (params: ListProjectsParams) =>
    queryOptions({
      queryKey: projectKeys.list(params),
      queryFn: ({ signal }) => listProjects(params, signal),
      placeholderData: keepPreviousData,
    }),
};
```

### (c) Feature Hook (`src/features/<domain>/hooks/use<Thing>.ts`)

Feature hooks compose centralized `queryOptions` and domain service mutations (`ADR-04`, `ADR-08`), perform cache invalidation or optimistic rollback (`PATCH /tasks/{id}/status` only), derive display state, and return plain data and callbacks — never JSX (`ID-15`).

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProject,
  projectKeys,
  projectQueries,
  type CreateProjectInput,
  type ListProjectsParams,
} from '@/shared/api';

export function useProjectsList(params: ListProjectsParams) {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery(projectQueries.list(params));

  const createMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });

  return {
    projects: projectsQuery.data?.items ?? [],
    pagination: projectsQuery.data,
    isLoading: projectsQuery.isPending,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,
    createProject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
```

---

## 6. Pull Request Checklist

Every PR must satisfy `AGENTS.md` §7 and §10 before review:

- [ ] **Issue linking:** Reference the ticket with `Refs #N` in the PR body. **Never use `Closes #N` or `Fixes #N`** — implementation issues stay open with the `implemented` label until Gate 2 (`#13`) is approved (`AGENTS.md` §10).
- [ ] **Scope & ownership:** Changes stay strictly inside the ticket's declared file ownership; shared surfaces (`package.json`, root configs, `tokens`, `ui`, `api`, `lib`, `app`) are untouched unless this ticket owns them (`ID-13`, `ID-24`).
- [ ] **Formatting, types & lint:** `npm run format:check`, `npm run typecheck`, and `npm run lint` pass with zero errors. Any `any` or type assertion has an explanatory comment.
- [ ] **Tests & bundle budget:** `npm run test`, `npm run build`, and `npm run check:budget` pass; Layers 1–3 tests cover new behavior, and `axe-core` passes with zero violations (`ADR-10`).
- [ ] **Accessibility & responsiveness:** Semantic landmarks (`main`, `nav`, `header`), single `h1`, keyboard operability, explicit labels/ARIA wiring, and verified layout at `360px`, `768px`, `1024px`, and `1440px` (`ID-23`).
- [ ] **Security & data honesty:** Zero `dangerouslySetInnerHTML`, zero raw `fetch`, safe URL validation on external/API links, zero tokens/OTPs/passwords/emails in URLs or `console`, real API backing (mock fixtures strictly in `src/test/`), and no unapproved dependencies.
- [ ] **Tracker handoff:** Ticket comment records files created/modified, checks run with results, and implementation notes; `implemented` label applied only when all acceptance criteria pass.

---

## 7. Implementation Ticket Template (`ID-24`)

Use the following structure when authoring or refining implementation slice tickets (`ID-24`):

```markdown
**Phase:** Foundation | Full implementation
**Review Gate:** Gate 1 (#12) | Gate 2 (#13)
**Blocked by:** #<blocker-issue>

## Goal
One concise sentence describing the user-facing or architectural capability delivered.

## Scope and Exclusions
- **In scope:** ...
- **Out of scope / deferred:** ...

## References
- **Spec sections (`docs/spec/mvp-spec.md`):** ID-..., D...
- **API anchors (`docs/api/plain.md`):** `#domain-action`, ...
- **Figma nodes (`docs/discovery/figma.md` §1.3 / §12):** `node-id`, ...
- **ADRs (`docs/adr/`):** ADR-...

## File Ownership
- **Owns (create/edit only):** `src/features/<domain>/**`, ...
- **Must not touch:** shared configs, `package.json`, `src/shared/**`, peer features.

## Acceptance Criteria
- [ ] Criterion 1 (real API behavior, roles, error states)
- [ ] Criterion 2 (validation, accessibility, responsive widths)

## Testing
- **Layer 1 (Unit):** ...
- **Layer 2 (Component/Screen + MSW + axe):** ...
- **Layer 3 (Integration):** ...
- **Layer 4/5 (Playwright / Security):** ...

## Definition of Done (`AGENTS.md` §7)
- [ ] `format:check`, `typecheck`, `lint`, `test`, `build`, `check:budget` green.
- [ ] Ticket updated with files changed, check results, and notes; labelled `implemented` (kept open until Gate 2).
```
