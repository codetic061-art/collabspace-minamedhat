# AGENTS.md

CollabSpace is a multi-feature React application that consumes an existing external REST API. This file is the project's mandatory engineering policy. It binds the main agent and every subagent on every task.

When a user request conflicts with this policy, name the conflicting rule and ask before proceeding. When an ADR in `docs/adr/` conflicts with this file, report the conflict instead of choosing one.

## Project sources

- **Product discovery is complete.** Start from `docs/discovery/HANDOFF.md`. Decisions D1–D11 in `docs/discovery/decisions.md` are binding scope: MVP tiers, role capabilities, derived designs, typography and hidden entry points.
- **Figma** file `xu0rluTsYV94aopFZ6C2A2` is the visual source of truth. Read `docs/discovery/figma.md` §1.3 before pulling design context; layer names are stale, and some screens stack an old wireframe under the final design. Items marked `Derived — Not in Figma` (§12) are specs, not designs.
- **Backend API** (`https://collabspace.huma-volve.com/api/v1`): `docs/api/plain.md` once written; until then, `docs/discovery/api-authenticated-shapes.md` (verified) and `screen-feature-map.md`. Read only the endpoint sections your ticket links to.
- **Specification:** `docs/spec/mvp-spec.md`. Read only the sections your ticket lists. ID-14 to ID-24 hold the mandatory React, API error-handling, security and multi-agent rules.
- **Secrets:** the Postman collection file is git-ignored and is never committed, modified or deleted. Copy no credential, token, OTP or personal email into code, docs, issues, logs or commits.

## 0. Gate: architecture discovery comes first

Application code and implementation work wait until the architecture discovery in section 8 is recorded in `docs/adr/` and the user has reviewed and approved it.

**Permitted before that approval:**
- product discovery;
- documentation-only planning, including the specification and the ticket backlog;
- API contract documentation (`docs/api/`), including read-only API verification under the approved security rules;
- architecture research and ADR writing (`docs/research/`, `docs/adr/`).

Tickets for this work may be marked ready for an agent.

**Implementation tickets** may exist in the tracker before approval, but they must carry the `adr-gate` label and must not be started until the user approves the ADRs and removes the label. This includes anything that adds application code, dependencies, scaffolding or configuration. Every other rule in this file applies unchanged.

## 1. Research before every architectural decision

Run this research before any architecture decision, before writing a ticket that depends on an architectural assumption, and before implementing a feature.

1. **Inspect the repo.** Read `package.json`, the lockfile, framework and build config, `tsconfig`, the folder structure, the relevant ADRs, and existing implementations in the area. Note the installed version of every library involved.
2. **Search the web** with whatever search and fetch tools your client provides. Rank sources in this order:
   1. React official documentation (react.dev).
   2. The selected framework's official documentation (Next.js, Vite, React Router, or whichever is in use).
   3. Official documentation of the libraries involved.
   4. Official release notes and migration guides, whenever version compatibility matters.

   Model knowledge, community posts, and tutorials may supplement official sources. They never serve as the sole basis for a decision.
3. **Match versions.** Confirm each recommendation applies to the installed major version. Prefer versioned documentation URLs. Treat examples written for a newer version as unverified until checked.
4. **Compare approaches.** Evaluate at least two viable options against this application's requirements, and choose the simplest one that meets them.
5. **Record the decision** in an ADR under `docs/adr/` with: context, decision, alternatives considered, consequences, and a **Sources** list. Each source entry is a direct URL, the version it was checked against, and one line on the decision it supports.

Research is complete when every decision in the ADR cites at least one official source checked against the installed version.

When web research is unavailable, or the official documentation cannot be verified, stop. Tell the user what could not be verified, and wait for their answer before making the decision. Never describe research as done when it was not.

## 2. Component architecture

Organize code by feature and domain. Each feature owns a folder holding its components, hooks, API service, types, and utilities. The exact folder layout is fixed by the folder-structure ADR; follow it once it exists.

- **Route/page files compose.** They wire layout, data loading, and feature components together and hold little markup of their own.
- **Feature components live inside their feature.** Other features import them only through the feature's public entry file (for example `index.ts`), never through deep paths.
- **Shared components are domain-agnostic** and used by two or more features, or are design-system primitives. A component moves to shared only when a second feature needs it.
- **One responsibility per component.** Split when a component handles more than one concern, when a JSX region reads as its own named concept, or when part of it needs a different rendering mode (server vs. client). Over roughly 200 lines, or with nested ternaries, a component needs a review, though that is not a hard limit.
- **Logic lives in hooks.** Data access, derived state, and effects move into `use<Thing>` hooks, which keeps components declarative.
- **Render states flatly.** Use early returns or one named subcomponent per state (loading, empty, error, success) instead of nested conditionals.
- **Compose with `children` and slots** instead of growing a component through boolean flags and extra props.
- **Every extraction has a reason**: reuse, a separate responsibility, or a rendering boundary. A small piece used once stays inline.

The structure must stay legible when several agents build different features at the same time.

## 3. Rendering model: server and client boundaries

Identify the framework and rendering model from the repo and the ADRs before writing components.

**Next.js App Router:**

- Server Components are the default.
- Add `"use client"` at the smallest leaf that needs interactivity: event handlers, state, effects, browser APIs, or client-only libraries.
- The root layout, root page, and feature entry components stay Server Components. Context providers that need the client go in a dedicated client providers component that wraps `children`, so the children still render on the server.
- Pass only serializable props from server to client. To place server-rendered content inside a client component, pass it as `children` or another prop.
- Mark modules holding secrets or server-only logic with the `server-only` package. Client components never import them. Any `NEXT_PUBLIC_` environment variable is public.

**Any other React architecture** (Vite SPA, React Router, and so on): follow that framework's documented rendering and splitting model, record it in an ADR, and apply its equivalents. Next.js rules do not carry over automatically.

The application ships as route-sized bundles, never as one client-side bundle.

## 4. Performance and loading

Performance is designed in during architecture. Research the current practices for the chosen stack and apply them as follows:

- **Split by route first**, then by feature where a feature is heavy.
- **Lazy-load (dynamic import) components that are genuinely heavy or non-critical**: rich editors, charts, file viewers, meeting/video widgets, modals, and below-the-fold panels. Small and above-the-fold components load normally.
- **Use Suspense and loading boundaries** around each independently loading region, where the framework supports them.
- **Load data where it is used.** Each screen fetches its own data at its route, feature, or interaction boundary. App startup loads only session and user essentials. Collections of projects, tasks, files, meetings, and notifications load on the screens that show them.
- **Use one data-fetching mechanism** that deduplicates requests and caches with an explicit revalidation policy, as chosen in the data-fetching ADR. Two components that need the same data share one request.
- **Keep state local** to the component that owns it. Measure before adding memoization, and check whether the React Compiler is in use.
- **Optimize assets** with the framework's image and font tooling. Serve static assets in appropriately sized, modern formats.

## 5. API and data layer

The API architecture is decided only after the external API contract (OpenAPI spec, documentation, or observed responses) and the framework have been researched.

- **One HTTP client module** owns the base URL, shared headers, authentication, error normalization, and response parsing.
- **One service per domain** (for example projects, tasks, files, meetings, notifications) calls that client and defines its endpoint paths. Each path is written once.
- **Components reach data through hooks or services.** HTTP calls stay out of components.
- **Requests and responses are typed** with reusable types. Generate them from the API contract when a reliable spec exists.
- **Every data view handles five states**: loading, empty, error, unauthorized, and success. Unauthorized follows the auth ADR, for example by redirecting to sign-in or refreshing the session.
- **Browser code holds only public configuration.** Secrets, private keys, and server credentials stay on the server. Token storage follows the auth ADR.

## 6. Working with multiple agents

- **Read this file before starting any task**, then read the ADRs that cover your area.
- **When delegating, put this instruction in the subagent's prompt**: "Read the root `AGENTS.md` and follow it", plus the ticket number and the relevant ADRs. Clients differ in whether subagents load `AGENTS.md` on their own.
- **Search before creating.** Before adding a component, hook, service, type, or utility, search the repo for an existing one and extend it.
- **Use one library per responsibility.** Add a dependency only when an ADR or the ticket names it. If you need a library that neither names, stop and report it.
- **Shared surfaces change in their own ticket.** These are: the HTTP client, shared UI, design tokens, global styles, root layout and providers, routing config, `package.json` and the lockfile, and TypeScript/lint/test config. A ticket that changes one blocks every ticket that depends on it, and parallel tickets leave these files untouched. If your ticket needs a shared change it doesn't include, comment on the issue and stop.
- **Stay inside the ticket's feature boundary.**
- **Report architectural conflicts** on the issue (`gh issue comment`) and to the user. The established pattern holds until the conflict is resolved.

## 7. Definition of done

A change is done when all of these hold:

- TypeScript passes in strict mode. Each `any` or type assertion carries a comment explaining why.
- Hooks follow the Rules of Hooks, and the React Hooks lint rules pass.
- Each route or feature has an error boundary, and errors reach the user as clear messages.
- Markup is semantic HTML. Interactive elements work by keyboard, and form fields have labels.
- Layouts work at mobile and desktop widths.
- Styling uses the shared design tokens and the styling convention set in the ADRs.
- Important behavior has maintainable tests, following the testing ADR.
- No dependency was added beyond those named in an ADR or the ticket.
- Every feature presented as working is backed by the real API. Mock data stays in tests and in any dev tooling an ADR approves. When an endpoint is missing or broken, report it, and leave the feature visibly unfinished.
- The issue records the files created and modified, the tests and checks run with their results, and implementation notes. Only then does it get the `implemented` label. It stays open: issues close only after the review gates in section 10.

## 8. Architecture discovery (before implementation tickets)

The agent responsible for architecture and planning runs section 1's research for each item below. It records each decision in `docs/adr/`, either as one ADR per item or as a baseline ADR that covers several items, each with its own Sources.

1. Framework and rendering model.
2. Folder structure.
3. Component architecture.
4. Server/client boundaries, if applicable.
5. API and data-fetching architecture.
6. Authentication strategy.
7. State management.
8. Routing and loading.
9. Performance.
10. Testing.
11. Dependencies, with versions and compatibility.

Choose the simplest maintainable architecture that meets CollabSpace's actual requirements. Each ADR names the simpler alternative it considered and why that alternative was or wasn't enough.

Discovery is complete when all eleven items have recorded decisions with verified sources and the user has reviewed them. Implementation tickets come after that.

## 9. Execution and deployment environment

- **All development and execution run in the online virtual/cloud environment** provided for the agents: installs, dev servers, builds, tests and end-to-end runs.
- **The owner's physical machine is never a hosting or deployment target.** Add no workflow that serves, tunnels or deploys the app from it.
- **Preview:** Vercel Preview deployments. Reviews and real-backend checks use a Preview URL.
- **Production:** Vercel only, and only after Gate 2 is approved **and** the user explicitly approves the deployment. No agent promotes or deploys to Production on its own.
- **Vercel access and secrets:** the user links the Vercel project and grants access. Tokens and secrets live in Vercel or the cloud environment's secret store, never in the repository, issues or logs.

## 10. Delivery phases and review gates

Delivery has two phases and two mandatory review gates. Gate 1 reviews the foundation group, and Gate 2 is the final review of the whole project. No other review gate exists: work is not split into fixed-size batches, and no feature or group of features gets its own intermediate review. The section 0 ADR gate still applies before both phases.

**Phase 1: foundation group** (label `foundation`, reviewed at the Gate 1 issue #12)
- Foundational tickets are those whose outputs many later tickets reuse or depend on, chosen from the real dependency graph: the API contract, the ADRs, conventions and scaffold, shared UI, and the API, data, session and app-shell layers. The group has as many tickets as the graph needs. Ordinary feature tickets are not added to fill it.
- The documentation and research tickets in the group may start before ADR approval (section 0). Its implementation tickets start only after the user approves the ADRs.
- The implementation agent completes every foundation ticket and runs its tests and checks. It then posts one consolidated handoff on the Gate 1 issue and stops implementation completely.
- No dependent ticket starts until Claude Opus posts `APPROVED` on the Gate 1 issue. On `CHANGES REQUESTED`, the implementation agent fixes the affected foundation tickets and Opus reviews the corrections, until approval.

**Phase 2: full implementation** (every remaining implementation ticket, natively blocked by the Gate 1 issue)
- After Gate 1 is approved, the remaining tickets are released and follow their real dependencies.
- The implementation agent works through all of them without stopping between tickets or groups. A blocker on one ticket stops only that ticket, or the affected part (section 6). The agent records it and continues with other startable tickets.
- Progress lives on the issues: the files changed, test results, notes and the `implemented` label. An unfinished ticket is never labelled `implemented`.
- The agent stops only when the full scope is ready for final review. It then posts one consolidated handoff on the Gate 2 issue (#13).

**Gate 2: final review.** Claude Opus reviews the entire project, not the latest changes. It ends with `APPROVED`, `CHANGES REQUESTED` or `BLOCKED`. Changes are fixed by the implementation agent and verified by Opus. Only after `APPROVED` are the implementation issues closed. Production deployment then still needs the user's approval (section 9).

**Review independence**
- Claude Opus is the designated reviewer. It runs in an independent session that did not write the reviewed work.
- The coding agent never approves, or closes as approved, its own foundation or final work. Its statement that work is complete is not approval.
- The reviewer inspects the actual files, diffs, tests, build output and Preview deployment, and reruns the checks itself. A summary written by the coding agent is an index to that evidence and never replaces it.

**Ticket status**
- A blocker counts as satisfied when it is closed or carries `implemented`. A `review-gate` issue counts only when it is closed after its `APPROVED` decision.
- Only the gate issues close at their approvals. Every other ticket stays open with `implemented` until Gate 2 is approved.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues at codetic061-art/collabspace-minamedhat, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

Workflow labels: `adr-gate` (section 0), `foundation`, `review-gate` and `implemented` (section 10).

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
