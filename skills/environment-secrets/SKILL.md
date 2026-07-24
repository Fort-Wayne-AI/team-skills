---
name: environment-secrets
description: Local encrypted dotenvx configuration plus Vercel-hosted Preview and Production variables. Load when working with environment variables, secrets, .env files, or key management for any Fort Wayne AI project.
---

# Environment Secrets

Use `team-skills env` for a single encrypted local dotenvx file. Vercel Preview and Production configuration belongs in Vercel Environment Variables, not repository ciphertext.

## Prerequisites

- Consumer projects install `@dotenvx/dotenvx`.
- `@fort-wayne-ai/team-skills` is installed and `npx team-skills setup` has run.
- `.env.keys` exists only on authorized developer machines and is never committed.
- Vercel is configured with the variable **names and values** required for each hosted scope; it receives no dotenvx private key.

## Commands

```bash
npx team-skills env doctor
npx team-skills env validate
npx team-skills env check
npx team-skills env run -- npm run dev
npx team-skills env set SOME_KEY
```

## Operating model

- **Local:** `.env.local.enc` is the only committed encrypted local configuration file. Standard Next.js dotenv loading does not parse that filename; run local commands through `team-skills env run`.
- **Vercel Preview and Production:** Vercel Environment Variables are authoritative. With Vercel system context present, `env run` executes its child directly and never reads, checks, decrypts, or mentions a local file.
- **Public build variables:** Provide every `NEXT_PUBLIC_*` value to Vercel before `next build`; Next inlines them into the browser bundle at build time.

## Agent rules

1. **Never read raw secret values.** Use readiness/status commands and masked `set` only.
2. **Report names and status only.** Never print values, private keys, or secret-bearing command arguments.
3. **`env set` never accepts a value argument.** dotenvx owns the masked prompt.
4. **Local `env run` performs `check` first** and does not start its child when decryption is not ready.
5. **Vercel is a strict pass-through.** Do not add a dotenvx loader, `.env.keys`, or private key to Vercel.
6. **Do not create hosted target files.** Preview and Production are platform configuration scopes, not local dotenv files.

See [references/workflows.md](references/workflows.md) for setup, Vercel, rotation, and recovery procedures.
