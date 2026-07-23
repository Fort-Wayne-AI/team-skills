# Environment Secrets — Workflows

Use `team-skills env` as the safe interface to encrypted dotenvx files. It reports variable names and readiness only; it does not print secrets.

## First-time developer setup

```bash
npm install
# Obtain .env.keys through the approved password manager or an existing developer.
# Save it at the project root. Never commit it.
npx team-skills env doctor --target local
npx team-skills env run --target local -- npm run dev
```

`auto` is equivalent to `local` outside Vercel, so everyday use remains:

```bash
npm run dev
```

Consumer projects that wrap their scripts with `team-skills env run --target auto` load the selected encrypted file before Next.js builds its browser bundle.

## Target selection

| Command target | File | Selection rule |
|---|---|---|
| `local` | `.env` | Explicit local development |
| `preview` | `.env.preview` | Explicit Vercel Preview use |
| `production` | `.env.production` | Explicit Vercel Production use |
| `auto` | One of the above | `VERCEL_ENV=preview` → Preview; `VERCEL_ENV=production` → Production; otherwise local |
| `all` | All three | Verification commands only |

Do not select based on `NODE_ENV`: Vercel Preview also uses `NODE_ENV=production`.

## Verify configuration

```bash
# Current context (auto)
npx team-skills env doctor
npx team-skills env validate
npx team-skills env check

# Release-readiness check for all committed encrypted files
npx team-skills env doctor --target all
npx team-skills env validate --target all
npx team-skills env check --target all
```

- `doctor` confirms file presence, ciphertext status, public variable *names*, and actual decryption.
- `validate` compares each file's names with `.env.example`; dotenvx public-key metadata is allowed.
- `check` fails closed when decryption or a required value fails.
- `all` fails when any selected target lacks an encrypted, decryptable file.

## Run builds safely

```bash
npx team-skills env run --target local -- npm run dev
npx team-skills env run --target preview -- npm run build
npx team-skills env run --target production -- npm run start
```

`run` first performs a readiness check, decrypts only the selected file in memory, and starts the child command only after that check succeeds. It never creates a plaintext `.env` file.

Existing platform variables retain precedence. This lets a hosted integration supply a Preview-specific Supabase URL/key while the encrypted Preview file supplies baseline non-Supabase configuration.

## Add or change a value

```bash
npx team-skills env set --target local SOME_KEY
npx team-skills env set --target preview SOME_KEY
npx team-skills env set --target production SOME_KEY
```

The value is collected by dotenvx's masked prompt, not an argument. Never place a secret in shell history, a command, a ticket, or chat.

## Vercel rollout (only after local verification)

1. Commit encrypted `.env`, `.env.preview`, and `.env.production`; do not commit `.env.keys` or plaintext `.env.local` files.
2. Scope each matching dotenvx private key to its Vercel environment. Preview must not have a key that can decrypt Production.
3. Keep existing Vercel settings until a new Preview deployment proves the new flow.
4. Build with `team-skills env run --target auto -- next build` (normally through the consumer package script), so `NEXT_PUBLIC_*` values are available at build time.
5. Verify Preview first. Test staged Production with read-only smoke checks before any explicit promotion.

Do not remove existing hosted configuration or connect Supabase branch integrations until the project owner approves that phase and provides required credentials.

## Key rotation and recovery

A dotenvx private-key rotation is not enough if anyone might have copied the old key: rotate the underlying credentials too, then re-encrypt and distribute new private key material through the approved password manager.

If `.env.keys` is unavailable, recover it only from an approved backup or password manager. Never reconstruct, commit, or paste private keys into project documentation or chat.

## Troubleshooting

| Symptom | Likely cause | Safe next step |
|---|---|---|
| `not found` | The target file is absent | Create/encrypt the target file; do not substitute another target. |
| `plaintext` | File was not encrypted | Encrypt it before committing. |
| `decryption verification failed` | Missing or incorrect target key | Compare key source and target scope privately. |
| `run` does not start | `check` failed | Run `doctor` for the same target. |
| Preview uses the wrong public value | Build was not wrapped before Next started | Ensure the build command uses `env run --target auto`. |

## See also

- [SKILL.md](../SKILL.md)
- [dotenvx documentation](https://dotenvx.com/docs)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
