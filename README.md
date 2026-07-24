# Fort Wayne AI Team Skills

Portable, project-local skills shared across Fort Wayne AI repositories.

## Install in a consumer project

Install the current tagged release over HTTPS—no GitHub token or SSH key is required:

```bash
npm install --save-dev github:Fort-Wayne-AI/team-skills#v1.0.0
npx team-skills setup
```

`setup` installs each skill physically into `.agents/skills/` (single source of truth) and creates symlinks from `.claude/skills/` and `.hermes/skills/`. It also maintains a pointer in `AGENTS.md`.

> `package.json` remains `"private": true`: this package is distributed from GitHub tags rather than the npm registry.

## Commands

```bash
npx team-skills setup [--project <path>] [--force]
npx team-skills env doctor
npx team-skills env validate
npx team-skills env check
npx team-skills env run -- <command> [arg...]
npx team-skills env set <KEY>
```

The environment contract is intentionally split by runtime:

- **Local development:** one committed encrypted file, `.env.local.enc`, decrypted only through `team-skills env` with an uncommitted `.env.keys` file.
- **Vercel Preview and Production:** Vercel Environment Variables are authoritative. `team-skills env run` detects Vercel and directly runs the child command without reading, validating, or decrypting local dotenvx configuration.

Never commit `.env.keys` or upload dotenvx private keys to Vercel. Supply every build-time `NEXT_PUBLIC_*` value in the appropriate Vercel scope before `next build` begins.

## Shared skills

- **project-conventions** — versioning, naming, documentation, and release standards.
- **software-development-lifecycle** — worktree-based development, review, PR, CI, previews, and release workflow.
- **notion-cli** — official `ntn` CLI workflow; requires `NOTION_API_TOKEN` and bundles `ntn@0.19.0` for macOS, Linux, and Windows on `x64` and `arm64`.
- **task-management** — verified Fort Wayne AI Notion Tasks schema and safe task workflows.
- **environment-secrets** — local encrypted dotenvx configuration and Vercel-hosted configuration boundary.

## Development

```bash
npm install
npm test
npm pack --dry-run
node bin/team-skills.mjs setup --project example/consumer-project
```
