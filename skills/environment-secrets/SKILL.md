---
name: environment-secrets
description: Encrypted .env management via dotenvx and target-aware team-skills commands. Load when working with environment variables, secrets, .env files, or key management for any Fort Wayne AI project.
---

# Environment Secrets

This skill manages encrypted environment files through `team-skills env` and `@dotenvx/dotenvx`.

## Prerequisites

- The consumer project installs `@dotenvx/dotenvx`.
- Next.js projects also install `@dotenvx/next-env` (the `@next/env` drop-in override).
- `@fort-wayne-ai/team-skills` is installed and `npx team-skills setup` has run.
- `.env.keys` exists only on authorized developer machines; it is never committed or uploaded.

## Targets and files

| Target | Encrypted file | Intended use |
|---|---|---|
| `local` | `.env` | Local development |
| `preview` | `.env.preview` | Vercel Preview |
| `production` | `.env.production` | Vercel Production |
| `auto` | Selects from `VERCEL_ENV`; otherwise `local` | Normal command default |
| `all` | All three files | `doctor`, `validate`, and `check` only |

`auto` deliberately reads `VERCEL_ENV`, not `NODE_ENV`: Vercel Preview builds use `NODE_ENV=production`.

## Commands

```bash
# Local (the default outside Vercel)
npx team-skills env doctor
npx team-skills env validate
npx team-skills env check
npx team-skills env run -- npm run dev

# Explicitly verify every committed encrypted file
npx team-skills env doctor --target all
npx team-skills env validate --target all
npx team-skills env check --target all

# Run a Preview or Production command with exactly one selected file
npx team-skills env run --target preview -- npm run build
npx team-skills env run --target production -- npm run build

# Add or change one value through dotenvx's masked prompt
npx team-skills env set --target preview SOME_KEY
```

## Agent rules

1. **Never read raw `.env` values.** Use `doctor`, `validate`, `check`, `run`, and masked `set` only.
2. **Report names and status only.** Never print secret values, dotenvx private keys, or command arguments containing values.
3. **`env set` never accepts a value argument.** dotenvx owns the masked prompt.
4. **`env run` performs `check` first** and does not start its child process if decryption is not ready.
5. **`all` is verification-only.** `run` and `set` reject it because they must select exactly one environment.
6. **Platform variables retain precedence.** dotenvx must not overwrite existing `process.env`; integration-provided Preview values therefore override encrypted defaults.
7. **Keep keys isolated.** Vercel Preview must never receive a dotenvx key that decrypts `.env.production`.

See [references/workflows.md](references/workflows.md) for setup, Vercel, rotation, and recovery procedures.
