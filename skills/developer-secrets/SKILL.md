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

## Install SOPS on the current machine

SOPS is an **official system prerequisite**, not an npm dependency and not a binary bundled by team-skills.

1. Inspect the current OS, architecture, available package managers, and whether `sops --version` already works.
2. If missing or unsuitable, use the official instructions: <https://getsops.io/docs/installation/>.
3. Choose the documented installation route appropriate to this execution environment; do not use an unofficial npm wrapper and do not write a custom downloader.
4. Verify with `sops --version`, then run `npx team-skills vault doctor`.

Agents may use their environment knowledge to choose an official installation method. Before installing system software, follow the repository/user approval policy and report the command/result. Do not infer an installation command from this skill when the official documentation is unavailable.

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
sops --version
npx team-skills vault doctor
npx team-skills vault list
npx team-skills vault init vault/env/development.env.sops
npx team-skills vault edit development
npx team-skills vault check development
npx team-skills vault materialize development
npx team-skills vault clean development
npx team-skills vault enroll --from /approved/local/identity.txt
npx team-skills vault updatekeys
```

`init` creates an empty encrypted file using the committed `.sops.yaml` recipient configuration. `edit` requires an interactive terminal and delegates secure value editing to SOPS; non-interactive agents and CI are intentionally refused. `updatekeys` applies committed recipient changes to all manifest entries without printing values. `enroll` copies a private identity from an approved local file with mode `0600`. Do not send identity files through chat or add them to Git. `materialize` invokes the official `sops` command from the local environment, uses an atomic owner-only write, and creates a non-secret receipt so `clean` can prove ownership.

## What belongs here

Appropriate: local dotenv files, JSON/YAML service credentials, PEM keys/certificates, and small integration configuration files.

Not appropriate: passwords, recovery codes, user data, large binaries, backups, or hosted runtime configuration.

## Rotation

`team-skills vault rotate-key` is deliberately **not automated**. A suspected master-identity compromise is an incident workflow:

1. Generate the replacement age identity only on an authorized machine.
2. Store its private identity in the approved FWAI 1Password vault before using it; commit only the public recipient.
3. Add the new recipient to committed `.sops.yaml`, run `team-skills vault updatekeys`, and verify access from an authorized machine.
4. Remove the old recipient, run `updatekeys` again, and verify every entry.
5. Rotate underlying credentials that the old identity may have exposed.

Never generate, paste, or retain the organization private identity in Git, CI, agent context, terminal logs, tickets, or chat.
