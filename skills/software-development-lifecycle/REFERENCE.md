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

Include the task ID in the branch name when it adds context:

```bash
git worktree add -b feat/FWAI-42-short-description ../worktrees/project-FWAI-42 origin/main
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

## Task integration

The `task-management` skill provides all commands and scripts for reading, updating, and batching Notion tasks. Load it when you need to find a task, update its status, or batch completed work for release notes.

Key scripts available in the installed skill directory:

| SDLC action | Script / command | Location |
|---|---|---|
| Find a task by title, status, or project | `task-management` query commands | `task-management` SKILL.md |
| Mark work started (In Progress) | `scripts/task-update-status.sh <page-id> "In Progress" "Not started"` | `task-management/scripts/` |
| Mark PR in review (In Review) | `scripts/task-update-status.sh <page-id> "In Review" "Not started"` | `task-management/scripts/` |
| Mark task done after merge | `scripts/task-update-status.sh <page-id> "Done" "Done"` | `task-management/scripts/` |
| Batch completed tasks for release notes | `scripts/task-batch-completed.sh <data-source-id> [since-date]` | `task-management/scripts/` |

Do not inline `ntn` commands for task operations in this reference — the `task-management` skill owns the *how*. The *when* is documented in the SDLC SKILL.md change lifecycle and task-integration table.

## Pre-PR review checklist

Review the complete change against its base:

```bash
git fetch origin
git status --short --branch
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

Before this final review, commit all intended PR changes and require `git status --short` to show a clean worktree. If you are reviewing before committing, also inspect `git diff`, `git diff --cached`, and every untracked file shown by `git status`; untracked files are not included in Git diffs.

For a stacked PR, replace `origin/main` with the parent branch. Then confirm:

- Acceptance criteria are met without unrelated scope.
- Tests cover success, failure, edge, and regression cases appropriate to the change.
- Formatting, linting, types, tests, build, and relevant smoke checks pass.
- Authentication, authorization, secrets, personal data, and destructive operations are safe.
- Database or API changes preserve compatibility or include migrations and rollout notes.
- User-facing behavior, configuration, and operational docs are current.
- Generated files, debug output, credentials, and local artifacts are absent.
- Commit history and PR size are understandable to a reviewer.
- **If this change has a Notion task, the task ID is referenced in the PR body.**

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
- **Task:** Notion task ID or link when the change originates from the task tracker.
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

## Preview validation checklist

- Require a fresh Preview for every deployable PR and confirm it corresponds to the PR's current head SHA. A missing Preview blocks merge.
- Record or link the commit-specific preview URL in the PR; do not rely only on a mutable branch URL.
- Confirm Preview-scoped credentials use dedicated non-production data stores and sandbox accounts.
- Exercise full functional behavior, including writes, against disposable or test data and sandbox integrations.
- A Preview must not have credentials capable of sending real email, charging live accounts, invoking production webhooks or jobs, or mutating production data.
- Test the acceptance criteria and affected critical paths in a real browser or through the deployed API.
- Exercise authentication redirects and provider callback URLs when auth behavior changes.
- Inspect deployment/build logs and runtime errors, not only the rendered page.
- After every push, verify the new Preview and CI both correspond to the new head SHA, then rerun the full applicable functional test suite, including safe write paths.

### Vercel example

Configure Vercel's Git integration so every deployable PR and every subsequent push creates a fresh Preview deployment. Treat a missing Preview as a merge-blocking workflow failure. Vercel provides a branch URL that moves to the latest deployment and a commit-specific URL that identifies immutable review evidence.

For deliberate manual releases, prefer Vercel's **staged Production deployment** workflow:

1. In **Project Settings → Environments → Production → Branch Tracking**, disable **Auto-assign Custom Production Domains**.
2. Merges or pushes to the production branch still build with Production environment variables, but the deployment remains **Staged** and the public production domains continue serving the previous **Current** deployment.
3. Inspect the staged deployment and confirm its Git SHA exactly matches the selected release commit.
4. Test the generated staged URL only with controlled, read-only smoke checks. It uses Production configuration and may reach live data and integrations; do not perform test writes or other side effects.
5. Create the release/tag for that exact tested SHA and record the existing Current deployment as the rollback target.
6. When approved, promote that exact staged deployment. Vercel assigns the production domains without rebuilding, so the tested artifact becomes Current.
7. Verify the public production domains now serve the promoted deployment and exact release SHA, run production health and critical read-only smoke checks, and retain the previously Current deployment as the rollback target.

Use the Git-integrated staged Production deployment created from the selected `main` commit. CLI creation is an exceptional recovery path only; it must use a clean worktree at the exact release SHA and does not replace verification of deployment provenance:

```bash
git status --short --branch
git rev-parse HEAD
vercel --prod --skip-domain
vercel inspect <staged-deployment-url>
vercel curl / --deployment <staged-deployment-url>
vercel logs --deployment <staged-deployment-url> --level error --limit 50
vercel promote <staged-deployment-url>
vercel promote status
```

Promoting a regular Preview is also supported, but Vercel rebuilds it using Production environment variables. Prefer a staged Production deployment for a release candidate when artifact parity matters.

Use the Vercel dashboard if the CLI is not authenticated. Do not pass access tokens in chat or commit project-link credentials.

## Manual release checklist

- Decide which merged PRs belong together and explain exclusions when useful.
- Choose the SemVer impact using `project-conventions`.
- Draft notes from merged behavior, not commit titles alone. **Include references to completed Notion tasks when useful for context.**
- Call out migrations, environment/configuration changes, deprecations, and breaking changes.
- Verify the release commit is on `main` and its CI is green.
- Create or identify a release-candidate deployment for the exact release commit and complete smoke tests. Prefer a staged Production deployment when available.
- Run only controlled, read-only staged Production checks; do not perform test writes or other side effects.
- Record the existing Current production deployment as the rollback target.
- Create the tag/release manually; verify the tag points to the exact tested commit.
- Promote the exact tested staged artifact, or deploy through the documented manual mechanism, and capture the deployed version.
- Confirm changing production traffic requires an explicit promotion or approval; automatic Preview and staged Production builds are acceptable.
- Verify the public production domains serve the promoted deployment and exact release SHA, then perform health checks and critical read-only smoke tests.
- Monitor errors and have a tested rollback or remediation path.

Do not create a release or deploy solely because a PR merged. The responsible developer chooses the batch, timing, notes, and deployment window.
