# Tasks Schema

Source: GitHub Issues in the current project repository.

## Required labels

### Status (workflow state)

| Label | Meaning | Use when writing |
|---|---|---|
| `status:todo` | Not yet started | Default for new issues. |
| `status:in-progress` | Work has begun | Set when the first commit lands. |
| `status:in-review` | PR is open for review | Set when the PR is created. |
| `status:blocked` | Cannot proceed | Set when blocked on a dependency or decision. |
| `status:done` | Completed — applied when closing | Set when closing after merge. |

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

Milestones group issues by target sprint or release window. Issues may also have no milestone (unscheduled / backlog).

## Assignees

GitHub handles. Do not infer from a display name.

## Issue author

The GitHub user who created the issue. Preserved automatically by GitHub; do not need to set.

## Issue body

A well-formed issue includes a goal, acceptance criteria, and context. See `github-issues` for the template.
