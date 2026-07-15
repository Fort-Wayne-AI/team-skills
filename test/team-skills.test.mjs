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

    for (const skill of ["project-conventions", "software-development-lifecycle"]) {
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
        { package: "@fort-wayne-ai/team-skills", version: "0.3.0", skill },
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
