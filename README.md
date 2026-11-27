# CollabSpace

CollabSpace is a responsive collaboration application for monitoring projects, managing tasks and maintaining a team profile. The Tier 1 implementation connects to the existing CollabSpace REST API and applies role-based capabilities throughout the interface.

[Live application](https://collabspace-minamedhat.vercel.app/) · [Project report](docs/FINAL_PROJECT_REPORT.md) · [Acceptance evidence](docs/wi11-acceptance.md)

## Features

- Authentication and session recovery, including sign-in, registration and password recovery flows.
- Dashboard summaries and lazily loaded charts.
- Project search, details, progress and a project Tasks tab.
- Task details and a Kanban board with status updates, filters and optimistic rollback.
- Profile, avatar and password settings.
- Responsive layouts based on the final Figma designs, with keyboard-accessible controls and visible loading, empty and error states.

The interface enforces the documented capabilities for Administrator, Project Manager and Team Member. API errors are surfaced to users, while access decisions remain subject to the backend.

## Stack and architecture

React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, React Hook Form and Zod form the application. Recharts is loaded for chart views. Domain features live under `src/features`, shared API services and UI primitives under `src/shared`, and routing and shell composition under `src/app`. Architecture decisions and API contracts are recorded in `docs/adr` and `docs/api`.

## Setup

Use Node.js 24 and npm. Copy `.env.example` to `.env.local`, then install dependencies and start the Vite development server.

```sh
npm ci
npm run dev
```

`VITE_API_BASE_URL` must be an HTTPS API URL. `VITE_TURNSTILE_ENABLED` controls the optional integration and `VITE_TURNSTILE_SITEKEY` is its public site key when configured. Variables prefixed with `VITE_` are exposed to the browser and must never contain secrets.

## Verification and deployment

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:budget` and `npm run test:e2e` run the principal checks. GitHub Actions runs automated checks and protected Vercel Preview verification. Vercel builds the connected branches and deploys main to Production. The initial JavaScript budget is 140 KB gzipped.

Security measures include centralized API handling, session guards, validation, safe external URLs and security headers. The current Content Security Policy is Report-Only. See the acceptance evidence for its enforcement precondition.

## Known limitations

Live mutations and nullable-field clearing have not been verified with dedicated authorized test accounts. Team Member acceptance lacks suitable credentials. Full state-by-state visual verification against Figma remains incomplete. Fixture tests and read-only Admin and PM checks are documented separately in the [project report](docs/FINAL_PROJECT_REPORT.md).
