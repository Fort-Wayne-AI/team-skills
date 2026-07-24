# Changelog

## 1.0.0 — unreleased

### Added

- `team-skills vault` command surface for repository-backed SOPS + age developer secrets.
- `.vault.json` manifest validation and non-secret entry listing.
- `init` (empty encrypted entry), TTY-only SOPS `edit`, and `updatekeys` for committed recipient changes.
- Disposable fake-age integration tests covering actual SOPS initialization, enrollment, materialization, and recipient updates.
- Safe local materialization with Git-ignore checks, symlink refusal, atomic `0600` writes, and ownership receipts for cleanup.
- `developer-secrets` shared skill for agent-safe and developer-safe vault workflows.

### Changed

- SOPS is an explicit official system prerequisite. Agents/developers install it for their own OS using <https://getsops.io/docs/installation/>, and `vault doctor` verifies that `sops --version` is available.
- Team-skills neither ships a SOPS executable nor downloads one at runtime; it does not use unofficial npm SOPS wrappers.

### Removed

- The superseded dotenvx `team-skills env` implementation, skill, documentation, and tests.

### Migration

- Obsolete `team-skills env` commands now exit with a migration message.
- Consumer repositories must migrate local developer secrets to encrypted `vault/` entries and materialize ordinary ignored local files.
- Vercel Preview and Production continue to use Vercel Environment Variables and must never receive an age identity.
