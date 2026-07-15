---
name: software-development-lifecycle
description: Defines the Fort Wayne AI workflow for isolated feature development, review, pull requests, CI, releases, and deployment. Use before changing code, creating branches or worktrees, opening or stacking PRs, merging, releasing, or deploying.
---

# Software Development Lifecycle

Follow this process for every code or configuration change. Also load `project-conventions` when naming, versioning, documenting, or releasing.

## Non-negotiable rules

- Never develop or commit on `main`. Keep the primary checkout clean and use it only to synchronize and manage worktrees.
- Give each change its own topic branch and worktree. Do not reuse a worktree for unrelated changes.
- Review the complete diff and fix discovered issues before opening a PR.
- Target PRs to `main` unless the change is intentionally stacked on an unmerged parent PR.
- Require CI on PR creation and every new commit while the PR is open. Do not merge failing, missing, or stale CI.
- Use deploy previews for runtime or user-facing changes when the hosting platform supports them. Test the preview for the current commit before merge.
- Merging does not automatically authorize a release or production deployment.
- Releases and production deployments are deliberate, manual developer decisions.
- Automatic preview environments are allowed; production deployment must require an explicit developer action or approval.

## Change workflow

1. **Understand the change.** Confirm scope, acceptance criteria, risks, and the repository's instructions.
2. **Synchronize safely.** Fetch the remote and update local `main` without placing feature work on it.
3. **Create isolation.** Create a topic branch from the intended base and attach it to a dedicated worktree.
4. **Develop in small steps.** Add or update tests with the behavior, keep commits focused, and update relevant documentation.
5. **Verify locally.** Run the repository's required formatter, linter, type checks, tests, build, and relevant smoke tests.
6. **Review and fix.** Inspect the full base-to-head diff for correctness, security, privacy, regressions, maintainability, test gaps, and accidental files. Fix findings and rerun affected checks.
7. **Open the PR.** Push the branch and create a PR with summary, rationale, validation evidence, risks, rollout notes, and release-note impact.
8. **Pass CI, preview validation, and review.** Confirm CI and the deploy preview represent the PR's current commit. Test affected behavior on the preview, address failures and review feedback, then re-review changed code.
9. **Merge when ready.** Merge only with required approvals and current green CI. Prefer the repository's documented merge strategy.
10. **Clean up.** Remove the merged worktree and delete obsolete local/remote branches according to repository policy.

## Pull request bases

- Default: `topic branch -> main`.
- Stacked work: `child branch -> parent branch` while the parent PR is open.
- State the dependency and review order in every stacked PR.
- After the parent merges, rebase or update the child, retarget it to `main`, and confirm CI reruns against the new base.
- Do not use stacked PRs merely to avoid keeping one PR focused and reviewable.

## CI contract

A repository's PR CI should trigger at least on `pull_request` activity that covers creation/reopening and head updates (commonly `opened`, `reopened`, and `synchronize`). Include `ready_for_review` when draft PRs skip expensive checks. Required checks should cover the repository's actual quality gates.

If CI is absent or does not rerun for open-PR commits, treat that as a workflow gap: fix the workflow or explicitly report the blocker. Never claim CI passed without inspecting the current PR checks.

## Preview environments

- A preview is an isolated, non-production deployment for testing a branch or PR. It is not a production release.
- Prefer a commit-specific preview URL for approval evidence; a branch URL can move after another push.
- Scope preview environment variables separately from production. Use non-production databases, storage, email, payment, webhook, and other external services whenever practical.
- Disable, sandbox, or explicitly authorize preview actions that can mutate production data, contact real users, run scheduled jobs, or invoke billable integrations.
- Validate the affected user journeys, authentication/callback behavior, data migrations or compatibility, responsive UI, and runtime logs as appropriate to the change.
- After each pushed fix, confirm both CI and the preview deployment succeeded for the new head commit, then repeat affected tests.

## Release and deployment

After one or more PRs have merged, the responsible developer decides when the accumulated changes form a release. Consider user value, operational risk, dependency order, rollback complexity, and release size; no fixed one-PR/one-release rule applies.

For each release:

1. Select the exact merged changes and version according to `project-conventions`.
2. Assemble human-readable release notes, including notable fixes, breaking changes, migrations, configuration changes, and known limitations.
3. Confirm `main` is green and identify the exact release commit.
4. Create or select a release-candidate deployment for that exact commit. Prefer a staged Production deployment when the platform supports one, because it uses production configuration without serving production traffic; otherwise use an isolated preview or staging environment.
5. Run release-candidate smoke tests and inspect runtime errors. Confirm the candidate's code, configuration, migrations, and external dependencies match the intended production release as closely as practical.
6. Create the release manually using the repository's release mechanism.
7. Deploy or promote manually to the intended environment; do not infer deployment from merge alone.
8. Verify production health and key user journeys, record the deployed version, and be prepared to roll back or remediate.

If a hosting integration automatically deploys `main` to production, treat that as a workflow gap and disable or gate it. Automatic PR preview deployments do not count as production releases.

See [REFERENCE.md](REFERENCE.md) for command examples and detailed checklists.
