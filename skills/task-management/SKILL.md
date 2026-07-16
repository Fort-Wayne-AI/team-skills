---
name: task-management
description: Manage project tasks in the Fort Wayne AI Notion Tasks data source with its verified property schema. Use when listing, creating, updating, assigning, prioritizing, scheduling, or completing project tasks in Notion.
---

# Task Management

Load `notion-cli` first. It provides the required `ntn` dependency, `NOTION_API_TOKEN` authentication, schema-discovery procedure, package-local invocation, and write safeguards.

## Canonical task list

Project tasks live in this Notion database:

- URL: `https://app.notion.com/p/angiecarel/0da40ff2d310408a98e4e0be37895add?v=2b62bd60d0f642f7ab2073c0d33a5ccc&source=copy_link`
- Database ID: `0da40ff2d310408a98e4e0be37895add`
- Data source ID: `73ab655f-03d8-42e0-a87f-61da3d429c46`
- Data source name: `Tasks`

IDs and property schema were verified on 2026-07-16. Re-fetch the schema before writes because Notion owners may change it:

```bash
npx --no-install ntn api /v1/data_sources/73ab655f-03d8-42e0-a87f-61da3d429c46 --notion-version 2025-09-03
```

## Read tasks

```bash
npx --no-install ntn datasources query 73ab655f-03d8-42e0-a87f-61da3d429c46 --limit 50 --json
```

Filter on the exact property names and values in [references/tasks-schema.md](references/tasks-schema.md). Paginate whenever the response says `has_more: true`.

## Task operations

1. **Fetch:** query the data source and inspect the existing task/page before changing it.
2. **Create:** before writing, obtain an explicit title and intended status, priority, due date, project relation, and assignee if applicable. Default only when the user explicitly permits defaults.
3. **Update:** patch only properties requested by the user. Preserve existing relation, reporter, assignee, and dates unless a change was requested.
4. **Complete:** clarify whether the user means `Status = Done`, `Done = Done`, or both; normally update both for consistency and set `Completed On (auto)` only if the workspace automation does not do so.
5. **Verify:** retrieve the returned page after every mutation and report the page ID plus the fields changed.

Use `npx --no-install ntn api /v1/pages --docs` and the narrow payload patterns in `notion-cli` for all creates and updates. Never create test tasks in the shared list without explicit authorization.
