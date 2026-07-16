import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname;
const cli = join(repoRoot, "bin", "team-skills.mjs");

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
    ]) {
      // ── .agents: physical copy ──
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
        { package: "@fort-wayne-ai/team-skills", version: "0.4.0", skill },
      );

      // ── .claude and .hermes: symlinks ──
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

    // ── AGENTS.md pointer ──
    const instructions = readFileSync(join(project, "AGENTS.md"), "utf8");
    assert.match(instructions, /<!-- team-skills:start -->/);
    assert.match(instructions, /project-conventions/);
    assert.match(instructions, /software-development-lifecycle/);
    assert.match(instructions, /notion-cli/);
    assert.match(instructions, /task-management/);
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
  assert.match(readme, /github:Fort-Wayne-AI\/team-skills#v0\.4\.0/);
  assert.match(notionSkill, /official Notion CLI, `ntn`/);
  assert.match(notionSkill, /NOTION_API_TOKEN/);
  assert.match(notionReference, /ntn datasources resolve/);
  assert.match(notionReference, /ntn api \/v1\/pages/);

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
    assert.match(taskSchema, new RegExp(`\\\`${field.replace(/[()]/g, "\\$&")}\\\``));
  }
});
