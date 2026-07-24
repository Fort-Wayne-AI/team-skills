# Fort Wayne AI Team Skills

Portable, project-local skills for Fort Wayne AI projects.

## SOPS + age developer vault

`team-skills vault` is a repository-backed developer-secrets workflow. Consumer projects commit SOPS-encrypted files under `vault/`, public recipient configuration, and a non-secret `.vault.json` manifest. The private age identity is enrolled locally and never committed.

### Prerequisite: official SOPS

SOPS is installed and maintained on each developer/agent machine as an official system tool. It is **not** bundled by this package, downloaded at runtime, or replaced with an unofficial npm wrapper.

1. Run `sops --version`.
2. If it is unavailable, follow the official instructions for the current OS and package manager: <https://getsops.io/docs/installation/>.
3. Confirm the installation with `sops --version` and run `npx team-skills vault doctor`.

```bash
npx team-skills vault doctor
npx team-skills vault list
npx team-skills vault check development
npx team-skills vault materialize development
npx team-skills vault clean development
npx team-skills vault enroll --from /approved/local/identity.txt
```

The tool reports names, paths, and status only. It does not provide a command to print secret values. Materialization requires a manifest-approved, Git-ignored destination; it refuses symlinks and unmanaged files, writes `0600` output atomically, and records non-secret ownership for safe cleanup.

Vercel Preview and Production are deliberately outside this system: use Vercel Environment Variables and do not provide an age identity to hosted builds.

## Shared skills

- **project-conventions** — naming, versioning, and release standards.
- **software-development-lifecycle** — worktrees, reviews, PRs, CI, previews, and staged releases.
- **notion-cli** — official `ntn` CLI workflow.
- **task-management** — Fort Wayne AI Notion task workflows.
- **developer-secrets** — SOPS + age developer vault policy and safe materialization workflow.

## Development

```bash
npm install
npm test
npm pack --dry-run
```
