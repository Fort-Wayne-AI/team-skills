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

    // ── .agents: physical copy ──
    const physicalDir = join(project, ".agents", "skills", "project-conventions");
    assert.equal(existsSync(physicalDir), true, ".agents copy should exist");
    assert.equal(lstatSync(physicalDir).isSymbolicLink(), false, ".agents should NOT be a symlink");
    assert.match(
      readFileSync(join(physicalDir, "SKILL.md"), "utf8"),
      /name: project-conventions/,
    );

    // ── .claude and .hermes: symlinks ──
    for (const directory of [".claude", ".hermes"]) {
      const linkDir = join(project, directory, "skills", "project-conventions");
      const SkillFile = join(linkDir, "SKILL.md");
      assert.equal(existsSync(linkDir), true, `${directory} link target should exist`);
      assert.equal(lstatSync(linkDir).isSymbolicLink(), true, `${directory} should be a symlink`);
      assert.match(readFileSync(SkillFile, "utf8"), /name: project-conventions/);
    }

    // ── AGENTS.md pointer ──
    const instructions = readFileSync(join(project, "AGENTS.md"), "utf8");
    assert.match(instructions, /<!-- team-skills:start -->/);
    assert.match(instructions, /project-conventions/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
