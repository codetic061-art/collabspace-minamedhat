# ADR-08: Forms and Validation

- **Status:** Approved (2026-11-26)
- **Date:** 2026-11-26
- **Implements:** AGENTS.md §2, §7, §8 (items 3 & 11: Component architecture and dependencies), Spec ID-5, ID-8, ID-11, ID-22

---

## Context

CollabSpace Tier 1 includes nine interactive forms with strict validation, accessibility, and server-error requirements (`ID-5`, `ID-8`, `ID-11`, `ID-22`):

- Authentication: Sign in, Sign up (with `password_confirmation`, `§12.5`), Forgot Password, Verify OTP (6 digit boxes), Reset Password.
- Workspace CRUD: Create/Edit Project (with `deadline >= start_date`, `M8`, `§12.6`), Create/Edit Task (`M9`–`M12`, `§12.8`), Profile Settings (multipart avatar + text fields), and Change Password (`M23`).

Every form must satisfy `ID-8` and `ID-22`:
1. **Two-layer validation:** Fast client-side schema validation mirroring only fields and rules in `docs/api/plain.md`, with Laravel's `422` response always authoritative.
2. **Exact `422` mapping:** Map `errors.{field}[0]` directly to the corresponding input, move focus to the **first invalid field**, and place unknown field keys or non-field messages in a `role="alert"` region above the submit button.
3. **Duplicate-submit protection & preserved input:** Disable submit with a pending label while a mutation is in flight; preserve every entered field value across `422`, `429`, `5xx`, and network errors.
4. **Accessibility:** Visible label bound via `id`/`htmlFor`, `aria-invalid`, `aria-describedby` pointing to the field error message, and native `noValidate` so custom accessible errors are never overridden by inconsistent browser tooltips.

---

## Decision

Adopt **`react-hook-form` `7.92.0`** + **`zod` `4.6.7`** + **`@hookform/resolvers` `7.0.9`** (`zodResolver`), paired with a shared `applyServerValidationErrors` helper and TanStack Query `mutateAsync` submission locking.

### 1. Schema and form ownership

- **Pinned to RHF v7 (`7.92.0`):** React Hook Form v8 is in beta (`8.0.0-beta.5`); v7.92.0 supports React `^19` cleanly and `@hookform/resolvers` `7.0.9` explicitly supports `react-hook-form ^7.55` + `zod ^4.0.0`.
- **Single schema source per form (`src/features/<name>/schemas/`):** Zod v4 schemas define both runtime client validation (required fields, lengths, email format, `password === password_confirmation`, `deadline >= start_date`) and inferred TypeScript form value types (`z.infer<typeof schema>`). Schemas validate only contract fields (`docs/api/plain.md`) and omit empty optional fields before sending mutation payloads (`ID-6`).
- **Uncontrolled registration by default:** Standard inputs use `register(...)` to avoid keystroke-level re-renders; custom widgets (date pickers, searchable people picker, ARIA selects) use `Controller`; file inputs (avatar upload) stay uncontrolled (`ID-17`).

### 2. Shared `applyServerValidationErrors` helper (`src/shared/lib/` or `src/shared/ui/`)

Every form's error handler passes `AppError` (`ADR-05`) into one shared helper:

- **When `error.kind === 'validation'` (`422`):**
  1. Iterate `Object.entries(error.errors)` in order.
  2. If the key exists in the form's known field set, call `setError(field, { type: 'server', message: messages[0] }, { shouldFocus: index === 0 })` so the first invalid field receives keyboard focus automatically (`ID-8`, `ID-22`).
  3. Collect any unknown field keys (not present in the form) and top-level non-field `error.message` into `setError('root.serverError', { type: 'server', message })`, rendered inside an alert region (`role="alert"`) above the submit button.
- **When `error.kind` is `'rate_limited'` (`429`), `'forbidden'` (`403`), `'bad_request'` (`400`), `'server'` (`5xx`), `'network'`, or `'timeout'`:** Set `root.serverError` with the safe mapped message from `ID-19` without clearing form inputs.
- **Automatic clear on resubmit:** `root.serverError` is cleared automatically by `react-hook-form` on the next submission attempt (`react-hook-form.com/docs/useform/seterror`).

### 3. In-flight duplicate-submit lock & input preservation

- Form `onSubmit` handlers **must `await` TanStack Query's `mutation.mutateAsync(payload)`** inside `handleSubmit(async (values) => { ... })`.
- Because `handleSubmit` tracks the returned Promise, `formState.isSubmitting` remains `true` for the full network round-trip and ignores double-clicks/Enter repeats.
- Submit buttons bind `disabled={isSubmitting || isRateLimited}` and show pending labels (`Saving…`, `Signing in…`).
- Form values are **never** reset on error; forms close or call `reset()` only after `mutateAsync` resolves successfully (`ID-22`).

### 4. Accessible field wiring (`WI-4` shared `Field` wrapper)

- Forms set `<form noValidate onSubmit={handleSubmit(...)}>`.
- `WI-4`'s `Field` component connects `<label htmlFor={id}>`, `aria-invalid={Boolean(error)}`, `aria-describedby={error ? errorId : hintId}`, and renders `<p id={errorId} role="alert">` (or error text referenced by `aria-describedby`) beneath the input.

---

## Alternatives Considered

| Option | Summary | Verdict & Why Not Chosen |
|---|---|---|
| **1. React 19 `<form action={fn}>` + `useActionState` (zero-dep native option)** | Use React 19 native form actions and `useFormStatus` for pending state. | **Rejected.** React 19 `<form action>` automatically resets uncontrolled form fields after the action settles (`react.dev`), requiring manual workarounds to preserve user input on `422`/`5xx` failures (violating Story 94 / `ID-22`). It also provides no declarative schema validation, no automatic first-invalid-field focus management, and no built-in per-field `setError` / `root.serverError` API — forcing every feature agent to hand-code validation and focus boilerplate across 9 forms. |
| **2. Manual controlled `useState` forms** | Store every input value, touched flag, error map, and submitting boolean in `useState`. | **Rejected.** Highest boilerplate and bug rate across parallel agents; triggers component-tree re-renders on every keystroke and easily drifts from consistent `422` focus/ARIA handling. |

---

## Consequences

### Positive
- Maps Laravel's `{ message, errors: { [field]: string[] } }` `422` structure cleanly onto `setError` + `shouldFocus` + `root.serverError` with one shared helper across all 9 forms.
- Eliminates keystroke re-renders via uncontrolled DOM registration and keeps Zod schemas + TypeScript types aligned in one file.
- Predictable accessibility (`noValidate`, `shouldFocusError: true`, `aria-invalid`, `aria-describedby`, `role="alert"`) verified by unit and component tests (`ADR-10`).

### Negative
- Adds three small runtime dependencies (`react-hook-form`, `zod`, `@hookform/resolvers`), all pinned to exact verified versions (`ADR-11`).
- Zod v4 requires `strict: true` in `tsconfig.json` (already mandated by `AGENTS.md` §7) and TypeScript `>= 5.5` (satisfied by TypeScript `6.0.3`).

### Accepted Residual Risk
- Client-side Zod rules can drift if the backend alters a validation rule without updating `docs/api/plain.md`; mitigated by treating `422` server errors as authoritative and mapping unknown field keys to `root.serverError` so no rejection is ever silently dropped.

### Backend Dependencies
- None (relies on existing verified `422` `{ success: false, message, errors }` envelope).

---

## Sources

- https://react-hook-form.com/docs/useform/seterror (`react-hook-form` 7.92.0, checked 2026-11-26) — Mapping server validation errors with `shouldFocus` and `root.serverError`.
- https://react-hook-form.com/docs/useform/formstate (`react-hook-form` 7.92.0, checked 2026-11-26) — `isSubmitting` async Promise tracking for duplicate-submit prevention.
- https://react-hook-form.com/advanced-usage/accessibility (`react-hook-form` 7.92.0, checked 2026-11-26) — `aria-invalid`, `aria-describedby`, `noValidate`, `shouldFocusError`, and `role="alert"` patterns.
- https://zod.dev/ (`zod` 4.6.7, checked 2026-11-26) — Zod v4 schema validation and TypeScript strict-mode compatibility.
- https://registry.npmjs.org/@hookform/resolvers (`@hookform/resolvers` 7.0.9, checked 2026-11-26) — Verified peer compatibility (`react-hook-form ^7.55.0`, `zod ^3.25.0 || ^4.0.0`).
- https://react.dev/reference/react-dom/components/form (React 19.3.1 docs, checked 2026-11-26) — Uncontrolled-field auto-reset behavior of `<form action>` evaluated in Alternatives.
- https://react.dev/reference/react/useActionState (React 19.3.1 docs, checked 2026-11-26) — `useActionState` pending/error behavior evaluated in Alternatives.