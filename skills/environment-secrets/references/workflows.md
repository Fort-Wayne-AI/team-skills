# Environment Secrets — Workflows

Detailed developer, Vercel, build, rotation, and recovery procedures for encrypted .env files.

## First-time setup (developer)

```bash
# 1. Install dependencies
npm install

# 2. Get .env.keys from an existing developer or password manager.
#    Place it in the project root. Never commit it.

# 3. Verify the setup (proves decryption, not just file existence)
npx team-skills env doctor
# Expected: decryption key available, .env encrypted, decryption verified

# 4. Run the project
npx team-skills env run -- npm run dev
```

## Adding a new environment variable

```bash
npx team-skills env set SOME_KEY
```

The `env set` command:
1. Delegates to dotenvx's masked prompt — the value is never visible in process listings, shell history, or logs.
2. dotenvx atomically encrypts and writes the value into `.env`.
3. Never accepts the value as a command-line argument.

> **Security**: The value is never visible in process listings, shell history, or logs.

## Checking encryption status

```bash
npx team-skills env doctor
```

This reports:
- Whether the decryption key (`.env.keys` or `DOTENV_PRIVATE_KEY`) is available
- Each `.env` file's existence and encryption status
- `NEXT_PUBLIC_*` variable names (without values)
- **Whether decryption actually succeeds** — not just that the files exist

Exits nonzero if the environment is not ready.

## Proving decryption (for builds)

```bash
npx team-skills env check
```

Proves every variable listed in `.env.example` decrypts successfully. Exits nonzero without printing values when the key is missing or wrong. Wire this into pre-build steps:

```json
{
  "scripts": {
    "build": "npx team-skills env check && next build"
  }
}
```

## Validating against .env.example

```bash
npx team-skills env validate
```

Reports by variable name only — never by value.

## Running a command with decrypted env

```bash
npx team-skills env run -- npm run dev
npx team-skills env run -- npm run build
npx team-skills env run -- node scripts/something.mjs
```

`env run` first proves decryption is ready (via `check`), then decrypts `.env` into memory and spawns the child process. It **never** writes a plaintext `.env` file to disk. If decryption fails, the child command is not started.

The leading `--` is optional but recommended for clarity.

## First-time encryption (migrating from plaintext)

If you have an existing plaintext `.env.local` or `.env` file that you want to encrypt:

```bash
# 1. Ensure .env.example exists with the expected keys (no values)
# 2. Copy your values into .env
cp .env.local .env        # all vars in one file

# 3. Encrypt
npx dotenvx encrypt -f .env

# 4. Verify
npx team-skills env doctor

# 5. Delete the plaintext source
rm .env.local

# 6. Commit the encrypted file
git add .env .env.example
git commit -m "feat: add encrypted .env"
```

## Vercel deployment

Set the single decryption key in both environments:

```bash
# Both Preview and Production
vercel env add DOTENV_PRIVATE_KEY preview
vercel env add DOTENV_PRIVATE_KEY production
```

The `@dotenvx/next-env` override (via npm `overrides` in `package.json`) decrypts `.env` at build time using this key.

If individual env vars were previously set in Vercel, remove them after confirming the encrypted workflow works so Vercel stores only `DOTENV_PRIVATE_KEY`.

## Key rotation

When you need to rotate secrets (e.g., a team member leaves):

1. **Rotate the dotenv encryption key** — re-encrypt `.env` and share the new `.env.keys` privately.
2. **Rotate the underlying credentials** — anyone who had the old private key could have decrypted old ciphertext from Git history and learned the actual secret values. Re-encrypting alone is not sufficient.

```bash
# 1. Generate new keys and re-encrypt
npx dotenvx keypair    # Shows the current keypair
npx dotenvx encrypt -f .env --key <new-private-key>

# 2. Share the new .env.keys privately

# 3. Update Vercel env variables
vercel env rm DOTENV_PRIVATE_KEY preview
vercel env rm DOTENV_PRIVATE_KEY production
vercel env add DOTENV_PRIVATE_KEY preview
vercel env add DOTENV_PRIVATE_KEY production

# 4. Verify decryption works
npx team-skills env doctor
npx team-skills env check
```

## Recovery

If `.env.keys` is lost:

1. Restore from a developer backup or password manager.
2. If no backup exists, recreate from Vercel's `DOTENV_PRIVATE_KEY` environment variable or regenerate keys and re-encrypt from scratch using the plaintext values stored in a password manager.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `doctor` shows "not found" | File doesn't exist | Create or encrypt the file |
| `doctor` shows "plaintext" | File not encrypted | Run `npx dotenvx encrypt -f <file>` |
| `doctor` shows "decryption not yet verified" or "decryption failed" | Wrong key or key missing | Compare keys between `.env.keys` and Vercel `DOTENV_PRIVATE_KEY` |
| `check` exits nonzero | Decryption failed | Ensure `.env.keys` matches the key used to encrypt `.env` |
| `run` says "Command not started" | Readiness check failed | Run `env doctor` to diagnose |
| Build fails with missing env vars | Key not in Vercel env | Add `DOTENV_PRIVATE_KEY` to Vercel |
| Decryption fails | Wrong key | Compare keys between `.env.keys` and Vercel |

## See also

- [SKILL.md](../SKILL.md) — agent policy and quick reference
- `@dotenvx/dotenvx` documentation at https://dotenvx.com/docs
- `@dotenvx/next-env` README