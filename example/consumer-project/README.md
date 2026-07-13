# Example consumer project

This directory is a minimal fixture for testing `team-skills setup`.

It intentionally contains no Notion credential. From the repository root, run:

```bash
node bin/team-skills.mjs setup --project example/consumer-project --skip-auth
```

The generated `.agents/`, `.claude/`, `.hermes/`, and `AGENTS.md` files are ignored because they are installer output.
