import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname;
const cli = join(repoRoot, "bin", "team-skills.mjs");

test("CLI routes env commands through the packaged entrypoint", () => {
  const output = execFileSync(process.execPath, [cli, "env", "help"], {
    encoding: "utf8",
  });

  assert.match(output, /team-skills env — encrypted environment variable management/);
  assert.match(output, /team-skills env doctor/);
  assert.match(output, /team-skills env run <command>/);
});

test("CLI rejects secret values passed to env set as arguments", () => {
  assert.throws(
    () => execFileSync(process.execPath, [cli, "env", "set", "TEST_KEY", "fake-secret-value"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
    (error) => {
      assert.equal(error.status, 1);
      assert.doesNotMatch(error.stderr, /fake-secret-value/);
      assert.match(error.stderr, /Never pass secret values as arguments/);
      return true;
    },
  );
});

test("CLI accepts --target and rejects unknown target names before running dotenvx", () => {
  assert.throws(
    () => execFileSync(process.execPath, [cli, "env", "doctor", "--target", "not-a-target"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
    (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stderr, /Unknown environment target: not-a-target/);
      return true;
    },
  );
});

test("CLI leaves --target after the run separator for the child command", () => {
  assert.throws(
    () => execFileSync(process.execPath, [cli, "env", "run", "--", "node", "-e", "0", "--target", "all"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
    (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stdout, /\.env not found/);
      assert.doesNotMatch(error.stdout, /cannot use --target all/);
      return true;
    },
  );
});

test("setup installs skills into .agents (physical) and symlinks from .claude and .hermes", () => {
  const project = mkdtempSync(join(tmpdir(), "team-skills-consumer-"));

  try {
    execFileSync(process.execPath, [cli, "setup", "--project", project], {
      encoding: "utf8",
    });

    for (const skill of [
      "project-conventions",
      "software-development-lifecycle",
      "notion-cli",
      "task-management",
      "environment-secrets",
    ]) {
      // .agents: physical copy
      const physicalDir = join(project, ".agents", "skills", skill);
      assert.equal(existsSync(physicalDir), true, `${skill} .agents copy should exist`);
      assert.equal(
        lstatSync(physicalDir).isSymbolicLink(),
        false,
        `${skill} .agents copy should NOT be a symlink`,
      );
      assert.match(readFileSync(join(physicalDir, "SKILL.md"), "utf8"), new RegExp(`name: ${skill}`));
      assert.deepEqual(
        JSON.parse(readFileSync(join(physicalDir, ".team-skills.json"), "utf8")),
        { package: "@fort-wayne-ai/team-skills", version: "0.7.0", skill },
      );

      // .claude and .hermes: symlinks
      for (const directory of [".claude", ".hermes"]) {
        const linkDir = join(project, directory, "skills", skill);
        const skillFile = join(linkDir, "SKILL.md");
        assert.equal(existsSync(linkDir), true, `${skill} ${directory} link target should exist`);
        assert.equal(
          lstatSync(linkDir).isSymbolicLink(),
          true,
          `${skill} ${directory} should be a symlink`,
        );
        assert.match(readFileSync(skillFile, "utf8"), new RegExp(`name: ${skill}`));
      }
    }

    // AGENTS.md pointer
    const instructions = readFileSync(join(project, "AGENTS.md"), "utf8");
    assert.match(instructions, /<!-- team-skills:start -->/);
    assert.match(instructions, /project-conventions/);
    assert.match(instructions, /software-development-lifecycle/);
    assert.match(instructions, /notion-cli/);
    assert.match(instructions, /task-management/);
    assert.match(instructions, /environment-secrets/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("CI runs for PR creation, reopened PRs, open-PR commits, and main", () => {
  const workflow = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /types: \[opened, reopened, synchronize, ready_for_review\]/);
  assert.match(workflow, /push:\n\s+branches: \[main\]/);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm pack --dry-run/);
});

test("lifecycle skill summarizes policy while reference owns deployment detail", () => {
  const skill = readFileSync(
    join(repoRoot, "skills", "software-development-lifecycle", "SKILL.md"),
    "utf8",
  );
  const reference = readFileSync(
    join(repoRoot, "skills", "software-development-lifecycle", "REFERENCE.md"),
    "utf8",
  );

  // SKILL.md stays concise and points to the detailed operating procedure.
  assert.match(skill, /Use \[REFERENCE\.md\]\(REFERENCE\.md\) for commands and detailed checklists/);
  assert.match(skill, /fresh Preview for every deployable PR and push/);
  assert.match(skill, /Preview-scoped test data and sandbox services/);
  assert.match(skill, /Test staged Production with read-only smoke checks/);
  assert.match(skill, /manually promote that same artifact/);
  assert.doesNotMatch(skill, /## Preview environments/);
  assert.doesNotMatch(skill, /## Release and deployment/);

  // SKILL.md integrates task-management as a companion skill.
  assert.match(skill, /Load `task-management`/);
  assert.match(skill, /update the task status to `In Progress`/);
  assert.match(skill, /Task integration/);
  assert.match(skill, /\| SDLC step \| Task action/);
  assert.match(skill, /npx --no-install ntn datasources query/);
  assert.match(skill, /npx --no-install ntn api \/v1\/pages/);

  // REFERENCE.md contains the detailed, testable Vercel procedure.
  assert.match(reference, /disable \*\*Auto-assign Custom Production Domains\*\*/);
  assert.match(reference, /full applicable functional test suite, including safe write paths/);
  assert.match(reference, /must not have credentials capable of sending real email/);
  assert.match(
    reference,
    /public production domains continue serving the previous \*\*Current\*\* deployment/,
  );
  assert.match(reference, /do not perform test writes or other side effects/);
  assert.match(reference, /without rebuilding, so the tested artifact becomes Current/);
  assert.match(reference, /public production domains now serve the promoted deployment and exact release SHA/);
  assert.match(reference, /rollback target/);

  // REFERENCE.md task integration defers to task-management skill.
  assert.match(reference, /## Task integration/);
  assert.match(reference, /`task-management` skill provides all commands/);
  assert.match(reference, /task-update-status\.sh/);
  assert.match(reference, /task-batch-completed\.sh/);
  assert.match(reference, /the `task-management` skill owns the \*how\*/);
});

test("Notion skills document the supported CLI, credential, and verified Tasks schema", () => {
  const notionSkill = readFileSync(join(repoRoot, "skills", "notion-cli", "SKILL.md"), "utf8");
  const notionReference = readFileSync(
    join(repoRoot, "skills", "notion-cli", "references", "operations.md"),
    "utf8",
  );
  const taskSkill = readFileSync(join(repoRoot, "skills", "task-management", "SKILL.md"), "utf8");
  const taskSchema = readFileSync(
    join(repoRoot, "skills", "task-management", "references", "tasks-schema.md"),
    "utf8",
  );
  const packageMetadata = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

  assert.equal(packageMetadata.dependencies.ntn, "0.19.0");
  assert.match(readme, /github:Fort-Wayne-AI\/team-skills#v0\.7\.0/);
  assert.match(readme, /macOS, Linux, and Windows on `x64` and `arm64`/);
  assert.match(notionSkill, /official Notion CLI, `ntn`/);
  assert.match(notionSkill, /NOTION_API_TOKEN/);
  assert.match(notionSkill, /npx --no-install ntn whoami/);
  assert.doesNotMatch(notionSkill, /\n\s+ntn (?:whoami|datasources|api)/);
  assert.match(notionReference, /npx --no-install ntn datasources resolve/);
  assert.doesNotMatch(notionReference, /\n\s+ntn (?:whoami|datasources|api)/);
  assert.match(notionReference, /umask 077/);
  assert.match(notionReference, /mktemp/);
  assert.match(notionReference, /trap 'rm -f/);
  assert.doesNotMatch(notionReference, /\/tmp\/notion-(?:create|update)\.json/);

  assert.match(taskSkill, /Load `notion-cli` first/);
  assert.match(taskSkill, /73ab655f-03d8-42e0-a87f-61da3d429c46/);
  for (const field of [
    "Task",
    "Status",
    "Done",
    "Priority",
    "Due Date",
    "Completed On (auto)",
    "Project",
    "Assignee",
    "Reporter",
  ]) {
    assert.match(taskSchema, new RegExp("`" + field.replace(/[()]/g, "\\$&") + "`"));
  }

  // Task-management skill documents status-update scripts and transitions.
  assert.match(taskSkill, /scripts\/task-update-status\.sh/);
  assert.match(taskSkill, /scripts\/task-batch-completed\.sh/);
  assert.match(taskSkill, /In Progress.*Not started/);
  assert.match(taskSkill, /Status = Done/);
  assert.match(taskSkill, /skill for \*when\*/);
});

test("packed consumer can invoke the documented package-local ntn command", () => {
  const project = mkdtempSync(join(tmpdir(), "team-skills-packed-consumer-"));
  const isolatedBin = join(project, ".test-bin");
  mkdirSync(isolatedBin);
  symlinkSync(process.execPath, join(isolatedBin, "node"));
  const standardPath = `${isolatedBin}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`;
  const npmCli = resolve(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js");

  try {
    writeFileSync(join(project, "package.json"), '{"private":true}\n', "utf8");
    const packOutput = execFileSync(process.execPath, [npmCli, "pack", "--json", "--pack-destination", project], {
      cwd: repoRoot,
      env: { ...process.env, PATH: standardPath },
      encoding: "utf8",
    });
    const tarball = join(project, JSON.parse(packOutput)[0].filename);
    execFileSync(process.execPath, [npmCli, "install", "--save-dev", tarball], {
      cwd: project,
      env: { ...process.env, PATH: standardPath },
      stdio: "ignore",
    });

    // `npm exec --no` is npx's package-local execution mode. PATH deliberately
    // excludes this host's Hermes bin directory, which contains a global ntn.
    const output = execFileSync(process.execPath, [npmCli, "exec", "--no", "--", "ntn", "--version"], {
      cwd: project,
      env: { ...process.env, PATH: standardPath },
      encoding: "utf8",
    });
    assert.match(output, /^ntn 0\.19\.0\s*$/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
