---
name: environment-secrets
description: Encrypted .env management via dotenvx and team-skills env commands. Load when working with environment variables, secrets, .env files, or key management for any Fort Wayne AI project.
---

# Environment Secrets

This skill manages encrypted .env files using `@dotenvx/dotenvx` through the `team-skills env` command interface.

## Prerequisites

- The consumer project has `@dotenvx/dotenvx` installed
- Next.js projects also install `@dotenvx/next-env` (drop-in `@next/env` override)
- `@fort-wayne-ai/team-skills` is installed and `npx team-skills setup` has been run
- `.env.keys` exists on the machine but is **never committed** to Git or uploaded to Vercel

## Commands

```bash
# Check env file status and prove decryption works
npx team-skills env doctor

# Validate variable names against .env.example
npx team-skills env validate

# Prove every variable decrypts (exits nonzero on failure)
npx team-skills env check

# Run a command with decrypted env (no plaintext file created)
npx team-skills env run -- npm run dev

# Encrypt a new variable (prompts for value, never accepts in argv)
npx team-skills env set <KEY>
```

## Agent rules

1. **Never read raw .env values** — use `doctor`, `validate`, `check`, and `run` only.
2. **Report missing variables by name only** — never print a secret value in output.
3. **`env set` never accepts a value argument** — always uses dotenvx's masked prompt.
4. **`env doctor` and `env validate` expose names/status only** — no secret values.
5. **`env run` proves decryption before starting the child command** — fails closed if not ready.
6. **`env check` exits nonzero on failure** — wire it into pre-build steps.
7. **`.env.keys` is the single sensitive artifact** — guard it like a private key.

## File layout

```
.env                     # Encrypted — all variables
.env.example             # Plain text — template with keys only, no values
.env.keys                # NEVER COMMITTED — single decryption key
```

A single `.env` file with one `DOTENV_PRIVATE_KEY` serves all environments (local, preview, production).
If environment-specific overrides are needed later, add `.env.preview` or `.env.production` as parallel files.

See [references/workflows.md](references/workflows.md) for detailed developer, Vercel, rotation, and recovery procedures.