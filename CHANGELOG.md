# Changelog

## 1.0.0 — unreleased

### Added

- `team-skills vault` command surface for repository-backed SOPS + age developer secrets.
- `.vault.json` manifest validation and non-secret entry listing.
- Safe local materialization with Git-ignore checks, symlink refusal, atomic `0600` writes, and ownership receipts for cleanup.
- `developer-secrets` shared skill for agent-safe and developer-safe vault workflows.

### Removed

- The superseded dotenvx `team-skills env` implementation, skill, documentation, and tests.

### Migration

- Obsolete `team-skills env` commands now exit with a migration message.
- Consumer repositories must migrate local developer secrets to encrypted `vault/` entries and materialize ordinary ignored local files.
- Vercel Preview and Production continue to use Vercel Environment Variables and must never receive an age identity.

### Release prerequisite

The v1.0.0 release requires six separately published, checksum-verified official SOPS binary packages for Linux/macOS/Windows on x64/ARM64. This repository deliberately does not download executables at runtime or silently use a global SOPS binary.
