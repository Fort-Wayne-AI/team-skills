# GitHub Issues Schema

Source: GitHub Issues in the current project repository.

## Required labels

Create these labels once in the repository (they persist):

### Status (workflow state)

| Label | Meaning | Use when writing |
|---|---|---|
| `status:todo` | Not yet started | Default for new issues. |
| `status:in-progress` | Work has begun | Set when the first commit lands. |
| `status:in-review` | PR is open for review | Set when the PR is created. |
| `status:blocked` | Cannot proceed | Set when blocked on a dependency or decision. |
| `status:done` | Completed | Set when closing the issue after merge. |

### Priority

| Label | Meaning |
|---|---|
| `priority:high` | Ship this cycle; blocking others. |
| `priority:medium` | Default priority for planned work. |
| `priority:low` | Nice-to-have; can slip. |

### Type

| Label | Meaning |
|---|---|
| `type:feature` | New capability or visible behavior. |
| `type:bug` | Defect to fix. |
| `type:docs` | Documentation only. |
| `type:ops` | Infrastructure, CI, deployments, tooling. |

## Milestones

Milestones group issues by target sprint or release window. Use the `August 2026 Sprint` convention for time-boxed work. Issues may also have no milestone (unscheduled / backlog).

## Assignees

GitHub handles. Unlike Notion, these are the same usernames used across the platform. Do not infer from a display name.

## Issue body template

A well-formed issue includes:

```markdown
**Goal:** One sentence describing the desired outcome.

**Acceptance criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Context:** Any relevant background, links, or constraints.
```

## Mapping from Notion (deprecated)

| Notion property | Notion type | GitHub equivalent |
|---|---|---|
| `Task` | `title` | Issue title |
| `Status` | `status` | `status:*` label |
| `Done` | `status` | Closing the issue (closed state) |
| `Priority` | `select` | `priority:*` label |
| `Due Date` | `date` | Milestone |
| `Assignee` | `people` | GitHub assignee |
| `Reporter` | `people` | Issue author |
| `Project` | `relation` | Repository + milestone |
