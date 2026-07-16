---
name: software-development-lifecycle
description: Defines the Fort Wayne AI workflow for isolated feature development, review, pull requests, CI, previews, releases, and production promotion. Use before changing code, creating branches or worktrees, opening or stacking PRs, merging, releasing, or deploying.
---

# Software Development Lifecycle

Follow this policy for every code or configuration change. Load `project-conventions` when naming, versioning, documenting, or releasing. Load `task-management` (which in turn loads `notion-cli`) when you need to read, create, or update Notion tasks as part of the change lifecycle. Use [REFERENCE.md](REFERENCE.md) for commands and detailed checklists.

## Non-negotiable policy

- Never develop or commit on `main`; use a dedicated topic branch and worktree for each change.
- Review the complete diff, fix findings, and run the repository's quality gates before opening a PR.
- Target PRs to `main` unless intentionally stacking on an unmerged parent PR.
- Require current green CI on PR creation and every subsequent push; do not merge missing, failing, or stale checks.
- Require a fresh Preview for every deployable PR and push. Verify the current head SHA and run the applicable functional suite using Preview-scoped test data and sandbox services. A missing or production-capable Preview blocks merge.
- Allow automatic Preview and staged Production builds, but never let a merge automatically assign production domains or change production traffic.
- Test staged Production with read-only smoke checks, record the rollback target, tag the exact tested SHA, and manually promote that same artifact before verifying production.

## Change lifecycle

Each step below integrates the Notion task tracker where applicable. A task ID in brackets (e.g. `FWAI-42`) identifies the corresponding Notion task for the change.

1. **Scope and task** — Confirm acceptance criteria, risks, repository instructions, and that a Notion task exists with clear requirements. If no task exists, create one under the correct project before starting work.
2. **Branch and worktree** — Synchronize the base branch, then create an isolated topic branch and worktree. Include the task ID in the branch name when helpful (`feat/FWAI-42-short-description`).
3. **Implement** — In focused steps with appropriate tests and documentation. At the first commit **update the task status to `In Progress`** so the team knows work has begun.
4. **Gate and smoke** — Run local quality gates and relevant smoke tests.
5. **Self-review** — Review the complete base-to-head change and fix every material finding.
6. **Open the PR** — With summary, rationale, validation, risks, dependencies, and release impact. **Include the Notion task link or ID in the PR body** under a `Task` or `Related` section.
7. **CI and Preview** — Verify CI and Preview for the current head SHA; rerun the applicable functional suite after every push.
8. **Review and merge** — Address feedback, re-review changed code, and merge only when authorized and green. **After merge, update the task status to `Done`** (both `Status` and `Done` properties).
9. **Clean up** — Remove the merged worktree and obsolete branches when safe.
10. **Release** — Batch, release, stage, promote, verify, and roll back according to the detailed release checklist.

## Task integration

All project work originates from the Notion task list. The `task-management` skill holds the canonical schema and safe workflows for the FWAI Tasks data source. Key integration points:

| SDLC step | Task action | Notion properties |
|---|---|---|
| Prepare | Verify or create a task with clear acceptance criteria | `Task` (title), `Status` → `To Do`, `Project` |
| Start implementation | Update task to signal active work | `Status` → `In Progress` |
| During implementation | Update task on significant milestones | `Status` → `In Review` when PR is opened |
| PR creation | Link PR in the PR body, reference task ID | Reference in PR summary |
| Merge | Mark work complete | `Status` → `Done`, `Done` → `Done` |
| Release | Batch completed tasks into release notes | Read tasks closed since last release |

Use `npx --no-install ntn datasources query <data-source-id> --filter <filter> --json` to find tasks and `npx --no-install ntn api /v1/pages/<page-id> -X PATCH --data @<payload>` to update them. See `task-management` for the exact property schema and payload shapes.

## Pull request bases

- Default: `topic branch -> main`.
- Stacked work: `child branch -> parent branch` while the parent PR is open.
- Document stack dependencies and review order. After the parent merges, update the child, retarget it to `main`, and verify fresh CI and Preview results.
