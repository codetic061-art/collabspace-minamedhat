# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.

## Workflow labels (AGENTS.md §0 and §10)

| Label | Meaning |
| ----- | ------- |
| `adr-gate` | Implementation ticket. Do not start until the user approves the ADRs and removes the label. |
| `foundation` | In the foundation group, reviewed together at Gate 1 (#12). |
| `review-gate` | A Claude Opus review gate: Gate 1 (#12) or Gate 2 (#13). It closes only after its `APPROVED` decision. |
| `implemented` | Work done, checks green and a handoff note posted. The issue stays open until Gate 2 is approved. Never applied to unfinished work. |
