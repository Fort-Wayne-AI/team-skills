# SDLC Reference

## Worktree quick start

Run these from the repository's clean primary checkout. Replace names and paths with project-appropriate values.

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git worktree add -b feat/short-description ../worktrees/project-short-description origin/main
```

For stacked work, branch the child from the parent branch instead of `origin/main`:

```bash
git worktree add -b feat/child-change ../worktrees/project-child feat/parent-change
```

Before making changes, verify the worktree and branch:

```bash
git -C ../worktrees/project-short-description status --short --branch
git worktree list
```

After merge and when no uncommitted work remains:

```bash
git worktree remove ../worktrees/project-short-description
git branch -d feat/short-description
git fetch --prune origin
```

Never force-remove a worktree or force-delete a branch until you have verified that no needed work would be lost.

## Pre-PR review checklist

Review the complete change against its base:

```bash
git fetch origin
git status --short --branch
git diff --check
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

For a stacked PR, replace `origin/main` with the parent branch. Then confirm:

- Acceptance criteria are met without unrelated scope.
- Tests cover success, failure, edge, and regression cases appropriate to the change.
- Formatting, linting, types, tests, build, and relevant smoke checks pass.
- Authentication, authorization, secrets, personal data, and destructive operations are safe.
- Database or API changes preserve compatibility or include migrations and rollout notes.
- User-facing behavior, configuration, and operational docs are current.
- Generated files, debug output, credentials, and local artifacts are absent.
- Commit history and PR size are understandable to a reviewer.

Fix every material finding before opening the PR. Rerun checks affected by each fix.

## PR creation

Default PR:

```bash
git push -u origin feat/short-description
gh pr create --base main --head feat/short-description
```

Stacked PR:

```bash
git push -u origin feat/child-change
gh pr create --base feat/parent-change --head feat/child-change
```

A useful PR body contains:

- **Summary:** what changed.
- **Why:** user or operational value.
- **Validation:** exact checks and meaningful smoke-test evidence.
- **Risks:** security, data, compatibility, or rollout concerns.
- **Dependencies:** parent PR and merge order for a stack.
- **Release notes:** user-visible wording or `None` with a reason.

After creating or updating a PR, inspect current checks rather than assuming the push triggered CI:

```bash
gh pr checks --watch
gh pr view --json baseRefName,headRefName,mergeStateStatus,statusCheckRollup
```

## GitHub Actions PR trigger example

Adapt paths and jobs to the repository. Do not copy this blindly over an existing workflow.

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]
```

Configure required status checks and branch protection/rulesets on `main` so missing or failing CI blocks merge. If a repository intentionally uses a broader `pull_request` trigger, that also covers these events.

## Re-review after feedback

When a PR changes:

1. Read the new diff and surrounding code, not only the latest commit message.
2. Re-run checks affected by the change.
3. Push the fix and confirm CI creates a run for the new head SHA.
4. Resolve review threads only after the concern is actually addressed.
5. Confirm approvals and required checks are still current before merge.

## Manual release checklist

- Decide which merged PRs belong together and explain exclusions when useful.
- Choose the SemVer impact using `project-conventions`.
- Draft notes from merged behavior, not commit titles alone.
- Call out migrations, environment/configuration changes, deprecations, and breaking changes.
- Verify the release commit is on `main` and its CI is green.
- Create the tag/release manually; verify the tag points to the intended commit.
- Deploy manually to the named environment and capture the deployed version.
- Confirm the production host requires an explicit deploy or promotion action; automatic PR previews are acceptable.
- Perform post-deploy health checks and critical user-journey smoke tests.
- Monitor errors and have a tested rollback or remediation path.

Do not create a release or deploy solely because a PR merged. The responsible developer chooses the batch, timing, notes, and deployment window.
