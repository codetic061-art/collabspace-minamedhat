# ADR-04: Component Architecture, Styling, and UI Primitives

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §2, §7, §8 (item 3: Component architecture), Spec ID-4, ID-8, ID-9, ID-11, ID-13, ID-14, ID-23

---

## Context

CollabSpace must faithfully reproduce the approved Figma visual system (`xu0rluTsYV94aopFZ6C2A2`, summarised in `HANDOFF.md` §6 and `figma.md` §9 & §12) including exact brand tokens (`#005AFB` primary, `#F6F8FA` surface, `#000712` ink, `#718096` body text, `#CBD5E0` input border, derived M4/M5 status and priority palettes), specific radii (pill `100px`, cards `16px`, auth/modals `24px`, settings cards `32px`, notch inputs `12px`), Inter + Rubik typography (`D4`), responsive layouts down to `360px` (`ID-9`), and WCAG AA keyboard/screen-reader accessibility (`ID-11`, `ID-23`).

At the same time:
- Multiple agents build features concurrently on top of `WI-4` shared primitives (`ID-13`).
- `AGENTS.md` §6 and `security.md` §8 mandate a minimal, audited dependency tree (one library per responsibility).
- Every UI component must follow `AGENTS.md` §2: single responsibility, logic in `use<Thing>` hooks, flat state rendering (early returns / per-state subcomponents), composition via `children` and slots, and ~200-line review trigger.

---

## Decision

1. **Styling:** Adopt **Tailwind CSS `4.3.5`** with the first-party **`@tailwindcss/vite` `4.3.5`** plugin and **CSS-first `@theme` design tokens** (`src/shared/tokens/tokens.css`).
2. **UI Primitives:** Build a small, custom, domain-agnostic set of accessible React 19 primitives in `src/shared/ui/` (`WI-4`) using **semantic HTML**, **native `<dialog>`**, and **WAI-ARIA APG keyboard patterns** — with **no third-party component kit (no Radix UI / shadcn / MUI / Chakra)**.
3. **Icons:** Use **exported Figma SVGs** for brand/custom artwork and **`lucide-react` `1.81.0`** for standard UI icons.
4. **Component design rules:** Enforce `AGENTS.md` §2 and `ID-14` composition and flat-rendering patterns across all shared and feature components.

### 1. Design tokens via Tailwind v4 `@theme`

- `src/shared/tokens/tokens.css` imports Tailwind (`@import "tailwindcss";`) and declares `@theme` custom properties mapped 1:1 to Figma variables (`figma.md` §9.1) plus derived M4/M5 project status and Critical priority tokens:
  - Colors: `--color-primary: #005AFB`, `--color-primary-tint: #E6EFFF`, `--color-canvas: #F6F8FA`, `--color-ink: #000712`, `--color-body: #718096`, `--color-border-input: #CBD5E0`, semantic success/danger/warning/orange/violet/teal pairs, and derived status/priority tokens.
  - Typography: `--font-sans: "Inter", system-ui, sans-serif`, `--font-wordmark: "Rubik", sans-serif`, plus Figma Inter text scale utilities (`D4`).
  - Radii & layout: `--radius-pill: 100px`, `--radius-card: 16px`, `--radius-modal: 24px`, `--radius-settings: 32px`, `--radius-input: 12px`, and spacing tokens (`64px` desktop gutter, `24px` gaps, `72px` navbar).
- Tailwind v4 automatically generates utility classes (`bg-primary`, `rounded-card`, `text-ink`) and exposes every token as a native CSS variable (`var(--color-primary)`) for SVG/chart styling (`ADR-09`) with zero `tailwind.config.js` boilerplate.
- Hardcoded hex colors in feature components are prohibited; features consume token utilities only (`AGENTS.md` §7).

### 2. Custom accessible primitives (`src/shared/ui/`, owned by `WI-4`)

Every Tier 1 primitive listed in `ID-13` and `ID-23` is built directly on modern browser semantics:

- **Modals & Confirmation Dialog:** Built on native HTML `<dialog>` opened via `showModal()`, providing browser-native Top Layer stacking, automatic background `inert`, Escape handling (suppressed while `isSubmitting` is true per `ID-23`), focus trapping, and deterministic focus return to the invoking trigger on close. Full-screen below `768px` (`ID-9`). Confirmation dialog focuses **Cancel** by default and styles the destructive button in danger red (`ID-23`).
- **Selects, Kanban Status Selector & Menus:** Standard selects and the mandatory Kanban status selector use either native `<select>` or a WAI-ARIA APG `listbox` / `menu-button` implementation with full arrow-key navigation, Home/End, Enter/Space selection, Escape close, and `aria-expanded` / `aria-controls` / `aria-activedescendant`.
- **Form Inputs & Field Wrapper:** Shared `Field` wrapper binds `id`/`htmlFor`, notch or top visible labels (`ID-11`), `aria-invalid`, and `aria-describedby` to error text; `Button` supports loading/pending states with `disabled` and `44x44` minimum touch targets (`ID-9`).
- **Shared State Components (`ID-8`, `ID-23`):** `Skeleton` (with `motion-reduce:animate-none` and `aria-busy`), `EmptyState`, `BlockErrorState` (Retry button, generic message), `PageStatusState` (403/404), `ToastRegion` (`role="status"` polite live region, ~4s auto-dismiss, close button, pause on hover/focus), and `BlockErrorBoundary` (`ADR-07`).
- **Other Figma Primitives:** `Card`, `Badge` (always pairs icon/color with text label per `ID-11`), `Avatar` / `AvatarStack` (explicit `width`/`height`, `loading="lazy"`, initials fallback per `ID-10`), `Tabs`, `Breadcrumb`, `ProgressBar`.
- **Icons:** `lucide-react` `1.81.0` (ESM tree-shakable, native React 19 peer support) paired with clean inline SVG components for Figma-specific icons. Every icon-only button requires an explicit `aria-label` (`ID-23`).

### 3. Component architecture discipline (`AGENTS.md` §2, `ID-14`)

- **Route/page files compose only:** Read route/search params, call feature hooks, and compose layout + feature components.
- **Logic in `use<Thing>` hooks:** Data queries, mutations, derived calculations, and browser subscriptions live in custom hooks returning data and callbacks (never JSX).
- **Flat state rendering:** Data views render all 5 states (`loading`, `empty`, `error`, `unauthorized`, `success`) via early returns or named state subcomponents — never deeply nested ternaries.
- **Composition via `children` and slots:** Prefer slot props (`header`, `footer`, `actions`) and `children` over boolean flag proliferation.
- **Extraction trigger:** Review any component exceeding ~200 lines or handling multiple concerns; keep one-off small fragments inline.

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Radix UI + `shadcn/ui` (used by reference site)** | Install `@radix-ui/react-dialog`, `react-dropdown-menu`, `react-select`, `react-tabs`, `class-variance-authority`, `tailwind-merge`, etc., and restyle generated templates to Figma. | **Rejected.** Pulls 10–15 extra runtime packages into the dependency graph (increasing audit/peer maintenance surface against React 19.3) for only a handful of Tier 1 primitives (`dialog`, `menu`, `select`, `tabs`). Native `<dialog>` (`showModal()`) already provides Top Layer, `inert`, and Escape natively in all modern browsers, and building our ~12 exact Figma primitives directly in `WI-4` avoids fighting default shadcn styling to match Figma's exact notch inputs, `32px` settings cards, and `100px` pill geometry. |
| **2. CSS Modules + custom utility classes (simpler styling option)** | Scoped `.module.css` files per component plus handwritten CSS custom properties. | **Rejected.** Slower across 4 parallel feature agents in a 2-day MVP (every agent invents duplicate layout/spacing/responsive classes and media queries), increases CSS bundle size, and lacks Tailwind v4's unified responsive breakpoint/token utility grammar. |

---

## Consequences

### Positive
- Zero CSS-in-JS runtime overhead; Tailwind v4 + `@tailwindcss/vite` emits a single optimized static stylesheet that does not require `'unsafe-inline'` for styling itself (`ADR-12`).
- Native `<dialog>` and semantic HTML keep the runtime dependency count minimal (`AGENTS.md` §6) while delivering full Top Layer and keyboard accessibility.
- 1:1 `@theme` token mapping guarantees visual consistency with Figma across all parallel feature slices (`WI-6` through `WI-10`).

### Negative
- `WI-4` must carefully implement and test WAI-ARIA keyboard navigation for custom dropdown menus and the searchable people picker (`D5`), verified by component tests and `axe-core` (`ADR-10`).
- Any Figma color pair failing WCAG AA contrast must be documented on the owning ticket rather than silently altered (`ID-11`, `ID-23`).

### Accepted Residual Risk
- Custom ARIA widgets (menus, combobox/people picker) carry higher implementation defect risk than pre-built headless primitives; mitigated by mandatory keyboard + `axe-core` tests in `WI-4` and Playwright accessibility audits (`ADR-10`) before Gate 1 approval.

### Backend Dependencies
- None.

---

## Sources

- https://tailwindcss.com/docs/installation/using-vite (Tailwind CSS 4.3.5, `@tailwindcss/vite` 4.3.5, peer `vite ^8`, checked 2026-11-26) — Official Vite plugin integration and `@import "tailwindcss";`.
- https://tailwindcss.com/docs/theme (Tailwind CSS 4.3.5, checked 2026-11-26) — CSS-first `@theme` design tokens generating utility classes and native CSS custom properties.
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog (MDN current, checked 2026-11-26) — Native `<dialog>` `showModal()` Top Layer, built-in `inert` backdrop, and Escape/focus behavior.
- https://www.w3.org/WAI/ARIA/apg/patterns/listbox/ (W3C WAI-ARIA APG, checked 2026-11-26) — Keyboard and ARIA semantics for custom selects and status selectors.
- https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/ (W3C WAI-ARIA APG, checked 2026-11-26) — Keyboard and ARIA semantics for the user menu and action menus.
- https://lucide.dev/guide/react (`lucide-react` 1.81.0, peer `react ^19.0.0`, checked 2026-11-26) — Tree-shakable React 19 SVG icon imports.
- https://react.dev/learn/passing-props-to-a-component (React 19.3.1 docs, checked 2026-11-26) — `children` and slot composition patterns.