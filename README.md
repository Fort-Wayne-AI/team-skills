# Fort Wayne AI Team Skills

Portable, project-local skills for Fort Wayne AI projects.

## Release status

The SOPS + age vault is being prepared for the next major release. It is **not yet published**: a production release requires six checksum-verified official SOPS platform packages for Linux/macOS/Windows on x64/ARM64. The tool intentionally refuses a global SOPS binary or a runtime download, so do not install this unreleased branch for production vault materialization.

Once that release exists, this section will name its exact immutable Git tag. Until then, consumer projects should keep their existing released team-skills pin.

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
