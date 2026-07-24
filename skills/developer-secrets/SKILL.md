---
name: developer-secrets
description: Use the SOPS + age repository-backed vault to safely materialize local developer secret files. Load whenever working with local env files, JSON credentials, certificates, age identities, SOPS, or `.vault.json` mappings.
---

# Developer Secrets Vault

Fort Wayne AI repositories use a repository-backed SOPS + age vault for developer-only secret files. Ciphertext belongs in the consumer repository; the private age identity stays outside Git in the approved password manager and authorized local machines.

## Rules

1. Never read, print, paste, log, or return a secret value.
2. Never pass a secret value as a command argument.
3. Do not use `cat`, `show`, `get`, `export`, or decrypt-to-stdout commands for vault content.
4. Materialize only an approved `.vault.json` entry to its Git-ignored destination.
5. Never overwrite an unmanaged plaintext file; resolve it with the repository owner.
6. Vercel Preview and Production use Vercel Environment Variables. Do not enroll an age identity or decrypt a vault in Vercel.

## Consumer layout

```text
vault/                         # committed SOPS ciphertext
.vault.json                    # committed non-secret source/destination mappings
.sops.yaml                     # committed public age recipient configuration
.env.example                   # committed names/schema only
.env.local                     # generated, ignored plaintext
.vault-receipts/               # generated ownership receipts, ignored
```

## Safe commands

```bash
npx team-skills vault doctor
npx team-skills vault list
npx team-skills vault check development
npx team-skills vault materialize development
npx team-skills vault clean development
npx team-skills vault enroll --from /approved/local/identity.txt
```

`enroll` copies a private identity from an approved local file with mode `0600`. Do not send that file through chat or add it to Git. `materialize` uses an atomic owner-only write and creates a non-secret receipt so `clean` can prove ownership.

## What belongs here

Appropriate: local dotenv files, JSON/YAML service credentials, PEM keys/certificates, and small integration configuration files.

Not appropriate: passwords, recovery codes, user data, large binaries, backups, or hosted runtime configuration.

## Rotation

A suspected master-identity compromise means both re-encrypting vault entries to a new recipient **and** rotating underlying credentials that could have been decrypted. Treat it as an explicit incident workflow, not an ordinary command.
