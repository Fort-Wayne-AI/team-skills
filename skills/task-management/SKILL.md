---
name: task-management
description: Manage project tasks in GitHub Issues with the canonical label taxonomy. Use when listing, creating, updating, assigning, prioritizing, scheduling, or completing project tasks.
---

# Task Management

Load `github-issues` first. It provides the `gh` CLI authentication, issue commands, and the label taxonomy.

## Canonical task list

Project tasks live in GitHub Issues on the current repository. From the project root, `gh` auto-detects the repo.

## Read tasks

```bash
gh issue list --limit 50
```

Filter on the exact label names in [references/tasks-schema.md](references/tasks-schema.md). Paginate with `--limit` and `--search` for date-range queries.

## Task operations

1. **Fetch:** view the existing issue before changing it.
2. **Create:** before writing, obtain an explicit title, labels, milestone, and assignee if applicable. Default only when the user explicitly permits defaults.
3. **Update:** patch only properties requested by the user. Preserve existing assignee, labels, and milestone unless a change was requested.
4. **Complete:** close the issue with a summary comment. The closed state replaces the old Notion `Done` property.
5. **Verify:** after every mutation, run `gh issue view <number>` and report the current state plus the fields changed.

Use the `github-issues` skill for all `gh issue` commands. Never create test issues in the shared repos without explicit authorization.

## Status transitions

Refer to the `software-development-lifecycle` skill for *when* to update issue status during the development workflow. Use direct `gh` commands for the *how*:

| Desired state | Command |
|---|---|
| Work begins | `gh issue edit <n> --add-label "status:in-progress" --remove-label "status:todo"` |
| PR submitted for review | `gh issue edit <n> --add-label "status:in-review" --remove-label "status:in-progress"` |
| PR merged, work complete | `gh issue close <n> -c "Merged. Status update."` |
| Blocked | `gh issue edit <n> --add-label "status:blocked"` |
| Release notes batch | `gh issue list -s closed -l "status:done" --search "closed:>2026-08-01" --json title,number,closedAt` |
