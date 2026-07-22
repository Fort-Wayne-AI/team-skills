# Fort Wayne AI Team Skills

Portable, project-local skills shared across Fort Wayne AI repositories.

## Install in a consumer project

This is a public GitHub repository. Install the current tagged release over HTTPS—no GitHub token or SSH key is required:

```bash
npm install --save-dev github:Fort-Wayne-AI/team-skills#v0.6.0
npx team-skills setup
```

`setup` installs each skill physically into `.agents/skills/` (single source of truth) and creates symlinks from `.claude/skills/` and `.hermes/skills/` pointing back to `.agents/skills/`. It also adds a managed pointer to `AGENTS.md`. After installation, it reads from local files and needs no external service, token, or network access.

> `package.json` intentionally keeps `"private": true`: the project is distributed from public GitHub releases, not published to the npm registry.

## Commands

```bash
npx team-skills setup [--project <path>] [--force]
npx team-skills env doctor
npx team-skills env validate
npx team-skills env check
npx team-skills env run -- <command>
npx team-skills env set <KEY>
```

### `setup`

Copies each bundled skill (raw Markdown) into the consumer project's `.agents/skills/` directory, then symlinks `.claude/skills/` and `.hermes/skills/` to point at `.agents/skills/`. Files are read directly from disk — no Notion, no authentication, no network calls.

| Flag | Purpose |
|---|---|
| `--project <path>` | Target project directory (default: current working directory) |
| `--force` | Overwrite existing skill directories even if unmanaged |

### `env`

Encrypted environment variable management via `@dotenvx/dotenvx`. See the `environment-secrets` skill for full documentation.

## Shared skills

### `project-conventions`

Versioning, naming, documentation, and release standards for every Fort Wayne AI project. Installed as plain Markdown — agents read it locally.

### `software-development-lifecycle`

Worktree-based feature development, pre-PR review and fixes, PR/stacking rules, required CI behavior, task-status integration with Notion, and deliberate manual releases and deployments.

### `notion-cli`

Official-CLI workflow for reading, querying, creating, and updating Notion content. Requires `NOTION_API_TOKEN`; `ntn@0.19.0` is installed as a package dependency and invoked with `npx --no-install ntn`. The bundled native CLI supports macOS, Linux, and Windows on `x64` and `arm64`.

### `task-management`

Verified schema and safe create/update workflows for the Fort Wayne AI Notion Tasks data source. Loads `notion-cli` first.

### `environment-secrets`

Encrypted `.env` management via `@dotenvx/dotenvx`. Provides `doctor` (proves decryption, not just file existence), `validate` (names match `.env.example`), `check` (exits nonzero on failure, for builds), `run` (decrypt and execute), and `set` (masked prompt, never accepts values in argv).

## Development

```bash
npm install
npm test
node bin/team-skills.mjs setup --project example/consumer-project
```