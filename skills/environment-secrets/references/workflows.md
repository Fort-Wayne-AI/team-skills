# Environment Secrets — Workflows

Detailed developer, Vercel, rotation, and recovery procedures for encrypted .env files.

## First-time setup (developer)

```bash
# 1. Install dependencies
npm install

# 2. Get .env.keys from an existing developer or password manager.
#    Place it in the project root. Never commit it.

# 3. Verify the setup
npx team-skills env doctor
# Expected: .env.keys present, all .env files show as "encrypted, decryptable"

# 4. Run the project
npx team-skills env run -- npm run dev
```

## Adding a new environment variable

```bash
npx team-skills env set SOME_KEY
```

The `env set` command:
1. Prompts for the value via stdin (never accepts it as a command-line argument)
2. Appends the key=value to `.env` (local development)
3. Runs `dotenvx encrypt` on the file
4. Regenerates `.env.keys` if needed

> **Security**: The value is never visible in process listings, shell history, or logs.

## Checking encryption status

```bash
npx team-skills env doctor
```

This reports:
- Whether `.env.keys` is present
- Each `.env*` file's existence and encryption status
- `NEXT_PUBLIC_*` variable names (without values)
- Whether files are decryptable

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

`env run` decrypts `.env*` files into memory and spawns the child process. It **never** writes a plaintext `.env` file to disk.

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

The `@dotenvx/next-env` override decrypts `.env` at build time using this key.

## Key rotation

When you need to rotate secrets (e.g., a team member leaves):

```bash
# 1. Generate new keys and re-encrypt
npx dotenvx keypair    # Shows the current keypair
npx dotenvx encrypt -f .env --key <new-private-key>

# 2. Share the new .env.keys privately

# 3. Update Vercel env variables
vercel env rm DOTENV_PRIVATE_KEY_DEVELOPMENT preview
vercel env add DOTENV_PRIVATE_KEY_DEVELOPMENT preview

# 4. Verify decryption works
npx team-skills env doctor
npx team-skills env run -- node -e "console.log('Decryption OK')"
```

## Recovery

If `.env.keys` is lost:

1. Restore from a developer backup or password manager.
2. If no backup exists, recreate from Vercel's environment variables or regenerate keys and re-encrypt from scratch using the plaintext values stored in a password manager.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `doctor` shows "not found" | File doesn't exist | Create or encrypt the file |
| `doctor` shows "plaintext" | File not encrypted | Run `npx dotenvx encrypt -f <file>` |
| `run` fails saying "no .env.keys" | Key file missing | Copy `.env.keys` from another developer or recreate |
| Build fails with missing env vars | Key not in Vercel env | Add `DOTENV_PRIVATE_KEY_*` to Vercel |
| Decryption fails | Wrong key | Compare keys between `.env.keys` and Vercel |

## See also

- [SKILL.md](../SKILL.md) — agent policy and quick reference
- `@dotenvx/dotenvx` documentation at https://dotenvx.com/docs
- `@dotenvx/next-env` README
