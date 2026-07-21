---
name: environment-secrets
description: Encrypted .env management via dotenvx and team-skills env commands. Load when working with environment variables, secrets, .env files, or key management for any Fort Wayne AI project.
---

# Environment Secrets

This skill manages encrypted .env files using `@dotenvx/dotenvx` through the `team-skills env` command interface.

## Prerequisites

- The consumer project has `@dotenvx/dotenvx` and `@dotenvx/next-env` installed
- `@fort-wayne-ai/team-skills` is installed and `npx team-skills setup` has been run
- `.env.keys` exists on the machine but is **never committed** to Git or uploaded to Vercel

## Commands

```bash
# Check env file status and encryption
npx team-skills env doctor

# Validate against .env.example
npx team-skills env validate

# Run a command with decrypted env (no plaintext file created)
npx team-skills env run -- <command>

# Encrypt a new variable (prompts for value, never accepts in argv)
npx team-skills env set <KEY>
```

## Agent rules

1. **Never read raw .env values** — use `doctor`, `validate`, and `run` only.
2. **Report missing variables by name only** — never print a secret value in output.
3. **`env set` never accepts a value argument** — always prompt via stdin.
4. **`env doctor` and `env validate` expose names/status only** — no secret values.
5. **`env run` decrypts in-process** — it does not create a plaintext .env file on disk.
6. **`.env.keys` is the single sensitive artifact** — guard it like a private key.

## File layout

```
.env                     # Encrypted — all variables
.env.example             # Plain text — template with keys only, no values
.env.keys                # NEVER COMMITTED — single decryption key
```

A single `.env` file serves all environments (local, preview, production).
If environment-specific overrides are needed later, add `.env.preview` or
`.env.production` as parallel files.

See [references/workflows.md](references/workflows.md) for detailed developer, Vercel, rotation, and recovery procedures.
