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
# Server-only variable (goes into .env.production):
npx team-skills env set SUPABASE_SERVICE_ROLE_KEY

# Client-accessible variable (goes into .env):
npx team-skills env set NEXT_PUBLIC_SUPABASE_URL
```

The `env set` command:
1. Prompts for the value via stdin (never accepts it as a command-line argument)
2. Appends the key=value to the appropriate file (`.env` for `NEXT_PUBLIC_*`, `.env.production` for server-only)
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
# 2. Copy your values into the right files:
cp .env.local .env              # Public vars
cp .env.local .env.production   # Server-only vars

# 3. Encrypt each file:
npx dotenvx encrypt -f .env
npx dotenvx encrypt -f .env.production

# 4. Verify:
npx team-skills env doctor

# 5. Delete the plaintext source:
rm .env.local

# 6. Commit the encrypted files
git add .env .env.production .env.example
git commit -m "chore: migrate to encrypted .env files"
```

## Vercel deployment

### Preview deployments

Preview environments (PR branches) use `.env.preview`. The encrypted file is in the repository. Vercel decrypts it at build time using `@dotenvx/next-env` (via npm override).

1. Create `.env.preview` with preview-specific overrides:
   ```bash
   npx dotenvx encrypt -f .env.preview
   ```
2. Commit the encrypted file — it is safe to commit.
3. Vercel Preview builds will auto-decrypt it.

**Important**: Do NOT set `DOTENV_KEY` or the encrypted values in Vercel's dashboard. The `@next/env` override handles decryption at build time using the `.env.keys` file.

However, **.env.keys is NOT uploaded to Vercel**. Preview builds therefore need the encryption key available differently:

**Option A (current recommendation)**: Set the private key directly as a Vercel Environment Variable:
```bash
# Copy the private key from .env.keys
DOTENV_PRIVATE_KEY_DEVELOPMENT=<value>

# Add to Vercel project (Preview environment)
vercel env add DOTENV_PRIVATE_KEY_DEVELOPMENT preview
```

**Option B**: Use Vercel's Encrypted Environment Variables for the few values that differ between local and preview, and let `.env` with its shared encrypted values handle the rest.

### Production deployments

Production uses `.env.production` encrypted file from the repository, plus whatever overrides are needed.

1. Verify the staged Production build:
   ```bash
   npx team-skills env run -- npm run build
   ```
2. Promote the tested artifact.

For production, set the private key as a Vercel Environment Variable:
```bash
vercel env add DOTENV_PRIVATE_KEY_PRODUCTION production
```

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
