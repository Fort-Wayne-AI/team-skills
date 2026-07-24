# Changelog

## 1.0.0

### Changed

- Replaced target-aware dotenvx configuration with one local encrypted file: `.env.local.enc`.
- Made Vercel Preview and Production strict pass-through contexts that use Vercel Environment Variables only.
- Updated `doctor`, `validate`, `check`, `run`, and `set` to operate only on local configuration.

### Removed

- Removed `.env`, `.env.preview`, and `.env.production` target selection from the shared CLI.
- Removed the `--target` command option; it now fails with a migration hint.

### Migration

- Rename committed local ciphertext to `.env.local.enc` in consumer repositories.
- Use `team-skills env run -- <command>` for local commands.
- Configure hosted variable names and values in Vercel; never upload `.env.keys` or dotenvx private keys.
