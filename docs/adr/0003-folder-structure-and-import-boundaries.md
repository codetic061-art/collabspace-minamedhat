# ADR-03: Folder Structure and Import Boundaries

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §2, §6, §8 (item 2: Folder structure), Spec ID-13, ID-14, ID-24

---

## Context

CollabSpace will be built by multiple AI agents working in parallel across foundation tickets (`WI-3` through `WI-6`) and four vertical feature slices (`WI-7` Dashboard, `WI-8` Projects, `WI-9` Tasks/Kanban, `WI-10` Profile). Without an explicit, machine-enforced directory layout and import boundary policy:

1. Parallel feature agents risk editing shared files (`AGENTS.md` §6, `ID-13`) or creating duplicate domain services for the same Laravel endpoint (`ID-24`).
2. Deep imports across feature internals (e.g., Projects importing a private Task card component instead of Tasks' public `index.ts`) create tight coupling and merge conflicts.
3. Reverse imports (`shared -> features`) break reusability and create circular dependencies.

`ID-13` and `ID-14` establish two key ownership rules:
- **Domain services live in one shared location owned by `WI-5`** so every Tier 1 endpoint path, request/response type, query-key factory, and `queryOptions` definition is written once.
- **Cross-feature reuse** (specifically Projects' Tasks tab mounting the Kanban board exported by Tasks) occurs **only** through the target feature's single public `index.ts`.

---

## Decision

Adopt a **feature-based folder structure under `src/`** paired with **compile/lint-time boundary enforcement** using `eslint-plugin-boundaries` `7.4.5` plus ESLint built-in `no-restricted-imports`.

### 1. Canonical directory layout

```text
src/
  main.tsx                    # Entry point: font CSS imports, global CSS, createRoot
  app/                        # WI-6 owned: router table, providers, layout shell, root & route error boundaries
    router.tsx
    providers.tsx
    AppShell.tsx
    RootErrorBoundary.tsx
    RouteErrorBoundary.tsx
  features/                   # Vertical slices (one owner per feature ticket)
    auth/                     # WI-6
    dashboard/                # WI-7
    projects/                 # WI-8
    tasks/                    # WI-9
    profile/                  # WI-10
      components/             # Feature-private UI components
      hooks/                  # Feature hooks (queries/mutations wiring, derived state, optimistic updates)
      schemas/                # Zod validation schemas mirroring plain.md
      types/                  # Feature-local UI/view types (domain DTOs come from shared/api)
      utils/                  # Feature-local pure helpers and copy strings (D8)
      index.ts                # THE ONLY public entry point importable by app/ or other features
  shared/
    tokens/                   # WI-4: Tailwind v4 @theme CSS tokens & TS token constants
    ui/                       # WI-4: domain-agnostic primitives, state components, BlockErrorBoundary, index.ts
    api/                      # WI-5: HTTP client, AppError, pagination (P1-P4), dates (4 formats), services/
      httpClient.ts
      errors.ts
      pagination.ts
      dates.ts
      services/               # All Tier 1 domain services + query-key factories + queryOptions
        auth.service.ts
        dashboard.service.ts
        projects.service.ts
        tasks.service.ts
        teams.service.ts
        users.service.ts
        profile.service.ts
      index.ts
    lib/                      # WI-5: session layer, capability map, safe-URL helper, return-path sanitiser
      session.ts
      capabilities.ts
      safeUrl.ts
      returnPath.ts
      index.ts
```

- **Path alias:** Configure `@/*` -> `./src/*` in both `tsconfig.json` and `vite.config.ts` so import rules match consistently across editor, type-checker, bundler, and Vitest.
- **Public entry rule:** Every feature exports only its route page components, explicitly shared UI widgets (e.g., `tasks/index.ts` exporting `KanbanBoard` for Projects' Tasks tab), and public types from `src/features/<name>/index.ts`.
- **Naming conventions:** PascalCase filenames for React components matching their named export; `use<Thing>.ts` for hooks; `<domain>.service.ts` for domain services; named exports everywhere except where a dynamic route/lazy convention requires a default export.
- **Tier 2 extensibility (`A8`):** Future features (`meetings/`, `files/`, `teams/`, `notifications/`, `search/`) add sibling folders under `src/features/` and matching service files under `src/shared/api/services/` without altering existing feature folders.

### 2. Allowed dependency matrix (enforced by ESLint)

| Source layer | May import from | Forbidden |
|---|---|---|
| `src/app/*` | `features/*/index.ts`, `shared/*` | Deep `features/<x>/*` internals |
| `src/features/<name>/*` | Same-feature internals (`./...`), other features' `index.ts` ONLY, `shared/*` | Other features' deep paths, `src/app/*` |
| `src/shared/ui/*` | `shared/tokens/*`, `shared/ui/*` | `features/*`, `app/*`, `shared/api/*`, `shared/lib/*` |
| `src/shared/api/*` | `shared/api/*`, `shared/lib/*` | `features/*`, `app/*`, `shared/ui/*` |
| `src/shared/lib/*` | `shared/lib/*` | `features/*`, `app/*`, `shared/ui/*` |
| `src/shared/tokens/*` | `shared/tokens/*` | Everything else |

### 3. Machine enforcement (`WI-3`)

1. **`eslint-plugin-boundaries` `7.4.5`:** Classifies `app`, `feature` (capturing `featureName`), `shared-ui`, `shared-api`, `shared-lib`, and `shared-tokens` element types and enforces:
   - `boundaries/element-types`: implements the matrix above, permitting same-feature internal imports (`from.featureName === to.featureName`) while blocking cross-feature deep imports and all `shared -> features` / `shared -> app` reverse edges.
   - `boundaries/entry-point`: permits cross-feature and `app -> feature` imports only via `index.ts`.
2. **ESLint built-in `no-restricted-imports` & `no-restricted-globals`:** Reinforces bans on deep feature globs, `react-router-dom` (obsolete in React Router v8), and raw `fetch` calls outside `src/shared/api/httpClient.ts`.
3. **Circular dependency detection:** Reject circular edges in ESLint CI checks so lint fails immediately on any cycle (`ID-14` rule 5).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Technical-layer folders (`src/components/`, `src/hooks/`, `src/pages/`)** | Group files by file type rather than product domain. | **Rejected.** Violates `AGENTS.md` §2 ("Organize code by feature and domain") and causes constant merge conflicts when 4 feature agents touch the same `src/components/` and `src/hooks/` directories concurrently. |
| **2. ESLint `no-restricted-imports` alone (simpler enforcement)** | Use only built-in ESLint path-pattern restrictions with per-feature config overrides. | **Rejected as sole mechanism.** Built-in `no-restricted-imports` cannot express "allow internal imports within the *same* feature while forbidding deep imports into *other* features" without brittle per-feature override stanzas that drift when Tier 2 features are added (`docs/research/react-architecture.md` §9). Combining `eslint-plugin-boundaries` with `no-restricted-imports` gives clean, parameterized enforcement directly inside editor and CI lint runs. |
| **3. `dependency-cruiser` CLI only** | Run `dependency-cruiser` as a separate npm script in CI without ESLint integration. | **Rejected for MVP.** Adds an extra CLI tool and config format outside ESLint, so violations do not surface immediately in editor lint feedback during agent edits. Can still be run ad hoc for dependency graphing if needed later. |

---

## Consequences

### Positive
- Maps 1:1 to ticket file ownership (`ID-13`, `WI-3` through `WI-10`), allowing `WI-4` + `WI-5` and later `WI-7` through `WI-10` to execute concurrently with zero file overlap.
- Enforces `ID-14` architectural rules automatically on every `npm run lint` and CI run rather than relying on manual code review alone.
- Centralizing Tier 1 services under `src/shared/api/services/` guarantees every endpoint path, query key, and DTO is authored once (`WI-5`).

### Negative
- Adds one dev dependency (`eslint-plugin-boundaries` `7.4.5`) and initial flat-config setup in `WI-3`.
- Feature agents needing a missing endpoint in `src/shared/api/services/` must raise a request rather than adding a local service file (intentional guardrail per `ID-13` and `ID-24`).

### Accepted Residual Risk
- Cross-feature imports through `index.ts` must still be reviewed during Gate 2 to ensure shared business logic is promoted to `src/shared/api/` or `src/shared/lib/` rather than leaked across features (`ID-14` rule 4).

### Backend Dependencies
- None.

---

## Sources

- https://github.com/javierbrea/eslint-plugin-boundaries (`eslint-plugin-boundaries` 7.4.5, peer `eslint >=6.0.0`, checked 2026-11-26) — Element-type classification, same-feature vs cross-feature policies, and `entry-point` enforcement in ESLint.
- https://github.com/eslint/eslint/blob/main/docs/src/rules/no-restricted-imports.md (ESLint 9.39.5, checked 2026-11-26) — Built-in `no-restricted-imports` pattern restrictions and custom error messages.
- https://github.com/sverweij/dependency-cruiser (`dependency-cruiser` 18.9.0, checked 2026-11-26) — Evaluated CLI alternative for forbidden-dependency rules.
- https://reactrouter.com/start/data/installation (React Router 8.5.3, checked 2026-11-26) — Confirms v8 imports from `react-router` (not `react-router-dom`), informing the restricted-import rule.