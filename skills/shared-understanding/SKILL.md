---
name: shared-understanding
description: Reads the team's shared conventions for project setup, versioning, and working agreements before relevant project work. Use when starting work in a project that has this skill installed, especially before planning, setup, releases, or dependency/version decisions.
---

# Shared Understanding

Before beginning relevant project work, read the current shared conventions:

```bash
npx --no-install team-skills read-shared-understanding
```

Treat the retrieved document as the source of truth for general project setup, versioning, and team working agreements. Follow its instructions when they apply to the current project.

## If access fails

Do not guess at the conventions or request a copied credential. Tell the user that Notion access must be authorized locally, then have them run:

```bash
npx team-skills setup
```

That command uses Notion's official `ntn` OAuth flow. For unattended environments, configure `NOTION_API_TOKEN` outside the repository.
