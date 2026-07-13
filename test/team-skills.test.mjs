import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname;
const cli = join(repoRoot, "bin", "team-skills.mjs");

test("setup copies project-conventions into portable project skill folders and writes an instruction pointer", () => {
  const project = mkdtempSync(join(tmpdir(), "team-skills-consumer-"));

  try {
    execFileSync(process.execPath, [cli, "setup", "--project", project], {
      encoding: "utf8",
    });

    for (const directory of [".agents", ".claude", ".hermes"]) {
      const skill = join(project, directory, "skills", "project-conventions", "SKILL.md");
      assert.equal(existsSync(skill), true, `${skill} should exist`);
      assert.match(readFileSync(skill, "utf8"), /name: project-conventions/);
    }
    const instructions = readFileSync(join(project, "AGENTS.md"), "utf8");
    assert.match(instructions, /<!-- team-skills:start -->/);
    assert.match(instructions, /project-conventions/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
