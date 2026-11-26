# ADR-09: Performance — Fonts, Charts, React Compiler, and Bundle Budget

- **Status:** Proposed (awaiting user approval)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §4, §6, §8 (item 9: Performance), Spec ID-10, ID-18, Decision D4

---

## Context

`AGENTS.md` §4, `D4`, `ID-10`, and `ID-18` impose specific performance and asset constraints on CollabSpace:

1. **Typography (`D4`):** Load **only** Inter weights `400`, `500`, `600`, `700` (normal style, latin subset, no italics; Figma's two 800 usages map to 700) plus Rubik `400` (latin subset, exclusively for the "Collabspace" wordmark). Plus Jakarta Sans is dropped.
2. **Charts (`ID-5`, `ID-10`, `A4`, `M16`):** Tier 1 renders two visualizations on the Dashboard and Project Overview:
   - A monthly area/line chart plotting `created_tasks` and `completed_tasks` (must be **lazy-loaded** so auth pages and non-chart routes never download chart JS).
   - A task completion rate semicircle gauge (simple single-percentage arc).
3. **Memoization & React Compiler (`AGENTS.md` §4, `ID-17`):** Keep state local and measure before adding manual `React.memo`/`useMemo`/`useCallback`. Evaluate enabling `babel-plugin-react-compiler` `1.0.0` in Vite 8 vs Vite 8's default zero-Babel Oxc transform pipeline + `eslint-plugin-react-hooks` `7.1.1`.
4. **Bundle-size discipline (`ID-18`):** Enforce an automated CI check on built `dist/assets` JS chunks plus an inspectable bundle visualizer report so accidental heavy imports into the initial chunk are caught before merge.

---

## Decision

### 1. Self-hosted static fonts (`D4`)

Install **`@fontsource/inter` `5.3.0`** and **`@fontsource/rubik` `5.3.0`**, importing **exact static latin weight stylesheets** once in `src/main.tsx`:

```ts
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/rubik/latin-400.css';
```

- Verified on `2026-11-26` against `@fontsource/inter@5.3.0` and `@fontsource/rubik@5.3.0` package exports: all five CSS files exist and bundle only the latin `.woff2` subsets for those exact weights (zero Cyrillic/Greek/Vietnamese/Arabic/italic files downloaded).
- Self-hosting eliminates third-party CDN connections (`fonts.googleapis.com` / `fonts.gstatic.com`), keeping CSP strictly `font-src 'self'` (`ADR-12`) with zero privacy leakage.

### 2. Charts: lazy-loaded `recharts` `3.11.1` + lightweight accessible SVG semicircle gauge

- **Area chart (`Dashboard` & `Project Overview`):** Use **`recharts` `3.11.1`** strictly behind module-top-level `React.lazy(() => import(...))` + `<Suspense fallback={<ChartSkeleton />}>` + `<BlockErrorBoundary>` (`ADR-07`).
  - **React 19 `react-is` compatibility (verified `2026-11-26`):** `recharts@3.11.1` declares `react-is: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0` as a peer dependency (not a bundled legacy dep). Install **`react-is` `19.3.1`** as an explicit direct dependency matching `react` `19.3.1`. Add `"overrides": { "react-is": "19.3.1" }` in `package.json` only if `npm ls react-is` during `WI-3` reveals any transitive dependency pinning an older `react-is` major.
- **Completion semicircle gauge (`Dashboard`):** Implement directly as a tiny (~40-line) accessible inline `<svg>` component (`role="img"` with `aria-label="Overall task completion: XX%"` and visible percentage text) using `@theme` CSS custom properties — **no gauge library installed**.

### 3. React Compiler evaluation and decision: Vite 8 Oxc default + `eslint-plugin-react-hooks` `7.1.1`

After verifying actual Vite `8.4.0` and `@vitejs/plugin-react` `6.3.0` npm metadata (`2026-11-26`):
- `@vitejs/plugin-react@6.3.0` removed the inline `babel` option; its Rust-native `compiler: true` option is still **experimental**; and the documented stable Babel path requires adding three extra build packages: `@rolldown/plugin-babel` (currently pre-1.0 at **`0.3.1`**), `@babel/core` (`8.1.3` + transitive Babel AST ecosystem), and `babel-plugin-react-compiler` (`1.0.0`), routing every JSX/TSX file through Babel instead of Vite 8's native Oxc transformer.
- Meanwhile, **`eslint-plugin-react-hooks` `7.1.1`'s `recommended` preset already enforces all React Compiler lint rules** (`purity`, `immutability`, `refs`, `set-state-in-effect`, `static-components`, `error-boundaries`) statically at lint time without the Babel build plugin (`react.dev/reference/eslint-plugin-react-hooks`).
- **Decision:** Keep **Vite 8's zero-Babel Oxc transform pipeline** for the MVP alongside mandatory **`eslint-plugin-react-hooks` `7.1.1` (`recommended`)** and follow `AGENTS.md` §4 ("Keep state local; measure before adding memoization"). Because all code passes the compiler lint rules from day one, enabling `babel-plugin-react-compiler` (or Vite's native Oxc compiler once stable) is a zero-refactor one-line plugin addition if React DevTools profiling ever reveals a real re-render bottleneck.

### 4. CI bundle-size gate & `rollup-plugin-visualizer` `7.3.0`

- Add **`rollup-plugin-visualizer` `7.3.0`** (verified peer `rolldown: 1.x`, compatible with Vite 8) invoked via an opt-in `npm run build:analyze` script (`ANALYZE=true vite build`) producing a git-ignored `dist/stats.html` treemap.
- Add a lightweight Node CI check script (`scripts/check-bundle-budget.mjs`, owned by `WI-3`) executed after `vite build` on every PR enforcing gzipped `dist/assets/*.js` ceilings:
  - **Initial entry chunk (shell + router + session + React):** `<= 140 KB` gzipped (ensures auth pages stay fast and never pull chart/feature code).
  - **Any single feature route chunk:** `<= 60 KB` gzipped.
  - **Lazy chart chunk (`recharts`):** `<= 150 KB` gzipped (strictly isolated from entry chunk; CI check also asserts the entry chunk contains zero `recharts` modules).
- Keep Vite 8 / Rolldown default code splitting (`build.rolldownOptions.output.codeSplitting`) without premature manual chunk overrides.
- Lists are server-paginated (`15/page`, `HANDOFF.md` §4); **do not add `@tanstack/react-virtual`** in MVP unless profiling demonstrates a slow Kanban column (`ID-18`).

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. Google Fonts CDN (`<link>` in `index.html`)** | Load Inter and Rubik from `fonts.googleapis.com` / `fonts.gstatic.com`. | **Rejected.** Adds external network requests on every cold load, forces widening CSP `style-src` and `font-src` to third-party origins, and creates external availability/privacy dependencies. |
| **2. `@fontsource-variable/inter` `5.3.0`** | Load the single variable Inter font covering weights 100–900. | **Rejected for D4 fidelity.** Per Fontsource docs, variable packages do not expose per-subset imports (shipping all subsets via `unicode-range` and weights 100–900), whereas static `@fontsource/inter/latin-{400,500,600,700}.css` delivers literally only the 4 latin weights specified in `D4`. |
| **3. Chart.js / ECharts / hand-rolled SVG area chart** | Use Chart.js, ECharts, or build the monthly area chart manually in SVG. | **Rejected.** ECharts is substantially heavier; Chart.js renders `<canvas>` (harder to style with CSS tokens and expose accessible tooltips); a hand-rolled responsive multi-series area chart with interactive hover/focus tooltips risks delaying a 2-day MVP. Lazy-loaded Recharts 3.11.1 gives native React 19 SVG charts with zero impact on non-Dashboard routes. |
| **4. Enable `babel-plugin-react-compiler` `1.0.0` via `@rolldown/plugin-babel` `0.3.1` now** | Run Babel over every TSX file in Vite 8 to auto-memoize components. | **Rejected for MVP.** Introduces a pre-1.0 adapter (`0.3.1`) and the Babel AST toolchain into Vite 8's otherwise pure Oxc pipeline without a measured rendering bottleneck. Keeping `eslint-plugin-react-hooks` `7.1.1` preserves 100% compiler compatibility at zero build/dependency cost. |

---

## Consequences

### Positive
- Zero third-party font requests; `font-src 'self'` remains strict in CSP (`ADR-12`).
- Auth screens and Projects/Tasks/Profile routes download zero bytes of Recharts.
- Fast Vite 8 Oxc builds without Babel overhead while enforcing React Compiler purity/immutability rules via ESLint.
- Automated CI budget check catches bundle regressions immediately on PRs.

### Negative
- Four small static Inter `.woff2` files load instead of one variable file (minimal total size for latin-only normal faces; cached `immutable` for 1 year under `/assets/*`).
- Recharts sets runtime inline `style` attributes on its tooltip/responsive wrapper, documented accurately in `ADR-12`'s `style-src` directive.

### Accepted Residual Risk
- Bundle budgets (`140 KB` entry, `60 KB` feature, `150 KB` chart) are initial targets set before `package.json` exists; if initial Vite 8 scaffold measurements during `WI-3` require minor calibration, adjust once in `WI-3` and review at Gate 1.

### Backend Dependencies
- None.

---

## Sources

- https://fontsource.org/docs/getting-started/subsets (Fontsource docs, checked 2026-11-26) — Per-subset CSS imports (`latin-400.css`, etc.) are available on static packages and not on variable packages.
- https://fontsource.org/fonts/inter/install and https://fontsource.org/fonts/rubik/install (`@fontsource/inter` 5.3.0, `@fontsource/rubik` 5.3.0, checked 2026-11-26) — Static latin weight imports matching D4.
- https://recharts.github.io/en-US/guide/installation/ and https://github.com/recharts/recharts/wiki/3.0-migration-guide (Recharts 3.11.1, checked 2026-11-26) — React 19 native support and `react-is` peer alignment.
- https://react.dev/learn/react-compiler/installation (React 19.3.1 docs, checked 2026-11-26) — Vite 8 setup via `@rolldown/plugin-babel` and removal of inline `babel` option in `@vitejs/plugin-react` 6.
- https://react.dev/reference/eslint-plugin-react-hooks (`eslint-plugin-react-hooks` 7.1.1, checked 2026-11-26) — `recommended` preset includes compiler lint rules even without the Babel build plugin enabled.
- https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md (`@vitejs/plugin-react` 6.3.0, checked 2026-11-26) — Experimental status of Rust `compiler: true` vs Babel preset.
- https://github.com/btd/rollup-plugin-visualizer (`rollup-plugin-visualizer` 7.3.0, peer `rolldown 1.x`, checked 2026-11-26) — Rolldown/Vite 8 bundle treemap visualization.
- https://vite.dev/guide/build (Vite 8.4.0, checked 2026-11-26) — Default Rolldown code splitting (`build.rolldownOptions.output.codeSplitting`).