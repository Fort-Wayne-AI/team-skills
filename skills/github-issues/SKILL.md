---
name: github-issues
description: Manage project tasks through GitHub Issues in the Fort-Wayne-AI organization. Use when listing, creating, updating, assigning, labeling, closing, or batching issues across Fort Wayne AI repositories.
---

# GitHub Issues

Load `github-workflows` first. It provides the `gh` CLI authentication, repository-convention patterns, and GitHub API knowledge.

## Canonical task list

Project tasks live in GitHub Issues on the relevant Fort-Wayne-AI repository:

- **Primary task repo:** `Fort-Wayne-AI/fort-wayne-ai-web-hub`
- **Team skills repo:** `Fort-Wayne-AI/team-skills`
- **Org home:** https://github.com/Fort-Wayne-AI

All issues for feature work, bugs, and operational tasks live in the hub repo unless they are specifically about the team-skills package itself. Cross-repo issues may be created in the relevant repo and cross-referenced.

## Read issues

```bash
HOME=/root gh issue list -R Fort-Wayne-AI/fort-wayne-ai-web-hub --limit 50
```

Filter with labels, assignee, state, or milestone:

```bash
HOME=/root gh issue list -R Fort-Wayne-AI/fort-wayne-ai-web-hub -l "status:in-progress" -a aualdrich
HOME=/root gh issue list -R Fort-Wayne-AI/fort-wayne-ai-web-hub -s closed -l "status:done"
HOME=/root gh issue list -R Fort-Wayne-AI/fort-wayne-ai-web-hub -m "August 2026 Sprint"
```

View a specific issue:

```bash
HOME=/root gh issue view 42 -R Fort-Wayne-AI/fort-wayne-ai-web-hub
```

## Issue operations

1. **Fetch:** view the existing issue before modifying it.
2. **Create:** obtain an explicit title, labels, and milestone before creating. Default only when the user explicitly permits defaults.
3. **Update:** patch only properties requested by the user — labels, assignee, milestone, title, or body. Preserve existing fields unless a change was requested.
4. **Close:** use `gh issue close` with a closing comment summarizing what was done.
5. **Reopen:** use `gh issue reopen` with a comment explaining why.
6. **Verify:** after every mutation, run `gh issue view <number>` and report the current state.

Use `gh issue --help` for the full command reference. Never create test issues in the live Fort-Wayne-AI repos without explicit authorization.

### Create an issue

```bash
HOME=/root gh issue create -R Fort-Wayne-AI/fort-wayne-ai-web-hub \
  -t "Short descriptive title" \
  -b "Detailed description of the task, acceptance criteria, and context." \
  -l "priority:medium,type:feature" \
  -m "August 2026 Sprint" \
  -a aualdrich
```

### Update labels / status

```bash
HOME=/root gh issue edit 42 -R Fort-Wayne-AI/fort-wayne-ai-web-hub \
  --add-label "status:in-progress" --remove-label "status:todo"
```

### Close an issue

```bash
HOME=/root gh issue close 42 -R Fort-Wayne-AI/fort-wayne-ai-web-hub \
  -c "Merged in #43. Feature is live on production."
```

### Reopen an issue

```bash
HOME=/root gh issue reopen 42 -R Fort-Wayne-AI/fort-wayne-ai-web-hub \
  -c "Reopening — regression found in production. See #44 for context."
```

## Status transitions

GitHub Issues uses labels for workflow state. The canonical labels for Fort Wayne AI are documented in [references/issue-schema.md](references/issue-schema.md).

Common transitions during the software development lifecycle:

| Desired state | Command |
|---|---|
| Work begins | `gh issue edit <n> -R … --add-label "status:in-progress" --remove-label "status:todo"` |
| PR submitted for review | `gh issue edit <n> -R … --add-label "status:in-review" --remove-label "status:in-progress"` |
| PR merged, work complete | `gh issue close <n> -R … --add-label "status:done"` |
| Blocked | `gh issue edit <n> -R … --add-label "status:blocked"` |
| Release notes batch | `gh issue list -R … -s closed -l "status:done" --search "closed:>2026-08-01"` |

These are direct `gh` commands — no wrapper scripts required. The `task-management` skill provides the canonical workflow integration on top of these primitives.

## GitHub ↔ Notion migration note

This skill replaces the retired `notion-cli` skill (2026-08). The old Notion Tasks database (`73ab655f-03d8-42e0-a87f-61da3d429c46`) is no longer the source of truth for project task tracking. All active tasks now live in GitHub Issues on `Fort-Wayne-AI/fort-wayne-ai-web-hub`.

| Old Notion concept | GitHub Issues equivalent |
|---|---|
| Status property (`status`) | Labels: `status:todo`, `status:in-progress`, `status:in-review`, `status:blocked`, `status:done` |
| Priority property (`select`) | Labels: `priority:high`, `priority:medium`, `priority:low` |
| Type (meeting, code, design…) | Labels: `type:feature`, `type:bug`, `type:docs`, `type:ops` |
| Assignee (Notion people) | Assignee (GitHub handle) |
| Reporter (Notion people) | Issue author (GitHub) |
| Due Date | Milestone (target sprint/release) |
| Project relation | Repository + milestone |
| Page ID (`abc123`) | Issue number (`#42`) |
