---
name: software-development-lifecycle
description: Defines the Fort Wayne AI workflow for isolated feature development, review, pull requests, CI, previews, releases, and production promotion. Use before changing code, creating branches or worktrees, opening or stacking PRs, merging, releasing, or deploying.
---

# Software Development Lifecycle

Follow this policy for every code or configuration change. Load `project-conventions` when naming, versioning, documenting, or releasing. Use [REFERENCE.md](REFERENCE.md) for commands and detailed checklists.

## Non-negotiable policy

- Never develop or commit on `main`; use a dedicated topic branch and worktree for each change.
- Review the complete diff, fix findings, and run the repository's quality gates before opening a PR.
- Target PRs to `main` unless intentionally stacking on an unmerged parent PR.
- Require current green CI on PR creation and every subsequent push; do not merge missing, failing, or stale checks.
- Require a fresh Preview for every deployable PR and push. Verify the current head SHA and run the applicable functional suite using Preview-scoped test data and sandbox services. A missing or production-capable Preview blocks merge.
- Allow automatic Preview and staged Production builds, but never let a merge automatically assign production domains or change production traffic.
- Test staged Production with read-only smoke checks, record the rollback target, tag the exact tested SHA, and manually promote that same artifact before verifying production.

## Change lifecycle

1. Confirm scope, acceptance criteria, risks, and repository instructions.
2. Synchronize the base branch, then create an isolated topic branch and worktree.
3. Implement in focused steps with appropriate tests and documentation.
4. Run local quality gates and relevant smoke tests.
5. Review the complete base-to-head change and fix every material finding.
6. Open the PR with summary, rationale, validation, risks, dependencies, and release impact.
7. Verify CI and Preview for the current head SHA; rerun the applicable functional suite after every push.
8. Address review feedback, re-review changed code, and merge only when authorized and green.
9. Remove the merged worktree and obsolete branches when safe.
10. Batch, release, stage, promote, verify, and roll back according to the detailed release checklist.

## Pull request bases

- Default: `topic branch -> main`.
- Stacked work: `child branch -> parent branch` while the parent PR is open.
- Document stack dependencies and review order. After the parent merges, update the child, retarget it to `main`, and verify fresh CI and Preview results.
