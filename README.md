# Fort Wayne AI Team Skills

Portable, project-local skills shared across Fort Wayne AI repositories.

## Install in a consumer project

```bash
npm install --save-dev github:Fort-Wayne-AI/team-skills#v0.1.0
npx team-skills setup
```

`setup` copies each supported skill into `.agents/skills/`, `.claude/skills/`, and `.hermes/skills/` in the current project and adds a managed pointer to `AGENTS.md`. No external services, tokens, or network access are required.

## Commands

```bash
npx team-skills setup [--project <path>] [--force]
```

### `setup`

Copies the bundled skill files (raw Markdown) into the consumer project's agent skill directories. Files are read directly from disk — no Notion, no authentication, no network calls.

| Flag | Purpose |
|---|---|
| `--project <path>` | Target project directory (default: current working directory) |
| `--force` | Overwrite existing skill directories even if unmanaged |

## Shared skills

### `project-conventions`

Versioning, naming, documentation, and release standards for every Fort Wayne AI project. Installed as plain Markdown — agents read it locally.

## Development

```bash
npm install
npm test
node bin/team-skills.mjs setup --project example/consumer-project
```
