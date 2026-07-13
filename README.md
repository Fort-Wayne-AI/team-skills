# Fort Wayne AI Team Skills

Portable, project-local skills shared across Fort Wayne AI repositories.

## Install in a consumer project

```bash
npm install --save-dev github:Fort-Wayne-AI/team-skills#v0.1.0
npx team-skills setup
```

`setup` copies each supported skill into `.agents/skills/`, `.claude/skills/`, and `.hermes/skills/` in the current project and adds a managed pointer to `AGENTS.md`. It then uses the official Notion CLI's OAuth flow to authorize local access.

For a headless environment, configure `NOTION_API_TOKEN` outside the repository and run:

```bash
npx team-skills setup
```

## Commands

```bash
npx team-skills setup
npx team-skills doctor
npx team-skills read-shared-understanding
```

### `shared-understanding`

Reads the team's shared conventions document before relevant setup, planning, release, or versioning work. The document is retrieved live from Notion, so its current contents remain the source of truth.

## Development

```bash
npm install
npm test
node bin/team-skills.mjs setup --project example/consumer-project --skip-auth
```

The example project is deliberately minimal and is used to prove the local installer behavior without storing credentials.
