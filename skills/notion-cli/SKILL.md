---
name: notion-cli
description: Access and manage Notion pages and data sources through the official `ntn` CLI. Use whenever another skill needs to read, query, resolve, create, or update Notion content or task data.
---

# Notion CLI

Use the official Notion CLI, `ntn`, for all Notion operations. Do not substitute browser automation or an unofficial SDK when `ntn` can perform the action.

## Prerequisites

1. Install the team-skills package dependencies:
   ```bash
   npm install
   ```
   This package includes the required `ntn` npm dependency. For a standalone environment, install `ntn@0.19.0` with npm.
2. Set `NOTION_API_TOKEN` in the process environment. Never print, commit, or add its value to a skill file.
3. Confirm access before doing useful work:
   ```bash
   ntn whoami
   ```

If `NOTION_API_TOKEN` is absent or `ntn whoami` fails, stop and ask the project owner to provide a valid token through the approved secret manager. Do not run interactive `ntn login` unless the owner explicitly requests that OAuth flow.

## Read before write

- Resolve a database ID to its data source ID(s):
  ```bash
  ntn datasources resolve <database-id> --json
  ```
- Query a data source (not a database ID):
  ```bash
  ntn datasources query <data-source-id> --limit 50 --json
  ```
- Retrieve the current property schema:
  ```bash
  ntn api /v1/data_sources/<data-source-id> --notion-version 2025-09-03
  ```
- Retrieve a page:
  ```bash
  ntn api /v1/pages/<page-id> -X GET
  ```

Use `--json` for machine-readable data-source commands. Inspect the current schema and the target page before creating or changing content.

## Write safety

Creating or updating pages changes shared project data. Before a write, identify the target data source/page, property names and types, exact intended values, and whether the user authorized the change. Use a narrow `ntn api` request; immediately read the returned page and report its ID.

Use `ntn api <path> --docs` for the current endpoint contract rather than relying on remembered payload shapes. See [references/operations.md](references/operations.md) for tested command patterns and failure handling.
