<!-- team-skills:start -->
## Shared team skills

This project uses project-local shared skills installed by `@fort-wayne-ai/team-skills`.

- `project-conventions` — versioning, naming, documentation, and release standards for Fort Wayne AI projects.
- `software-development-lifecycle` — worktree-based development, review, PR, CI, release, and deployment workflow.
- `notion-cli` — authenticated Notion access through the official `ntn` CLI.
- `task-management` — FWAI Notion task-list schema and safe project-task workflows.
- `developer-secrets` — SOPS + age repository vault workflow for safe local materialization.

Skill files physically live at `.agents/skills/` (single source of truth). `.claude/skills/` and `.hermes/skills/` are symlinks into `.agents/skills/` — no duplication.
<!-- team-skills:end -->
