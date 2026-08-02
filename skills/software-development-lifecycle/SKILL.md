---
name: software-development-lifecycle
description: Defines the Fort Wayne AI workflow for isolated feature development, review, pull requests, CI, previews, releases, and production promotion. Use before changing code, creating branches or worktrees, opening or stacking PRs, merging, releasing, or deploying.
---

# Software Development Lifecycle

Follow this policy for every code or configuration change. Load `project-conventions` when naming, versioning, documenting, or releasing. Load `task-management` (which in turn loads `github-issues`) when you need to read, create, or update GitHub issues as part of the change lifecycle. Use [REFERENCE.md](REFERENCE.md) for commands and detailed checklists.

## Non-negotiable policy

- Never develop or commit on `main`; use a dedicated topic branch and worktree for each change.
- Review the complete diff, fix findings, and run the repository's quality gates before opening a PR.
- Target PRs to `main` unless intentionally stacking on an unmerged parent PR.
- Require current green CI on PR creation and every subsequent push; do not merge missing, failing, or stale checks.
- Require a fresh Preview for every deployable PR and push. Verify the current head SHA and run the applicable functional suite using Preview-scoped test data and sandbox services. A missing or production-capable Preview blocks merge.
- Allow automatic Preview and staged Production builds, but never let a merge automatically assign production domains or change production traffic.
- Test staged Production with read-only smoke checks, record the rollback target, tag the exact tested SHA, and manually promote that same artifact before verifying production.

## Change lifecycle

Each step below integrates GitHub Issues where applicable. Reference the issue number (e.g. `#42`) in commits, branch names, and PR bodies.

1. **Scope and task** — Confirm acceptance criteria, risks, repository instructions, and that a GitHub issue exists with clear requirements. If no issue exists, create one before starting work.
2. **Branch and worktree** — Synchronize the base branch, then create an isolated topic branch and worktree. Include the issue number in the branch name when helpful (`feat/42-short-description`).
3. **Implement** — In focused steps with appropriate tests and documentation. At the first commit **label the issue `status:in-progress`** so the team knows work has begun.
4. **Gate and smoke** — Run local quality gates and relevant smoke tests.
5. **Self-review** — Review the complete base-to-head change and fix every material finding.
6. **Open the PR** — With summary, rationale, validation, risks, dependencies, and release impact. **Include the GitHub issue link (e.g. `Closes #42`) in the PR body** under a `Related` section.
7. **CI and Preview** — Verify CI and Preview for the current head SHA; rerun the applicable functional suite after every push.
8. **Review and merge** — Address feedback, re-review changed code, and merge only when authorized and green. **After merge, close the issue with a summary comment (GitHub auto-applies `status:done` as a label) before closing.**
9. **Clean up** — Remove the merged worktree and obsolete branches when safe.
10. **Release** — Batch, release, stage, promote, verify, and roll back according to the detailed release checklist.

## Task integration

All project work originates from GitHub Issues. The `task-management` skill holds the canonical schema and safe workflows for FWAI task tracking. Key integration points:

| SDLC step | Task action | GitHub action |
|---|---|---|
| Prepare | Verify or create an issue with clear acceptance criteria | Issue title, `status:todo`, assignee |
| Start implementation | Signal active work | Label → `status:in-progress` |
| During implementation | Update on significant milestones | Label → `status:in-review` when PR is opened |
| PR creation | Link issue in the PR body, reference issue number | `Closes #42` in PR summary |
| Merge | Mark work complete | Close the issue (label → `status:done`) |
| Release | Batch completed issues into release notes | `gh issue list -s closed -l "status:done"` |

Use `gh issue list --search "label:status:in-progress" --json title,number,labels` to find issues and `gh issue edit <number> --add-label "…"` to update them. See `task-management` for the exact label taxonomy and reference commands.

## Pull request bases

- Default: `topic branch -> main`.
- Stacked work: `child branch -> parent branch` while the parent PR is open.
- Document stack dependencies and review order. After the parent merges, update the child, retarget it to `main`, and verify fresh CI and Preview results.
