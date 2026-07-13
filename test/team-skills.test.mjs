import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname;
const cli = join(repoRoot, "bin", "team-skills.mjs");

test("setup copies shared-understanding into portable project skill folders and writes an instruction pointer", () => {
  const project = mkdtempSync(join(tmpdir(), "team-skills-consumer-"));

  try {
    execFileSync(process.execPath, [cli, "setup", "--project", project, "--skip-auth"], {
      encoding: "utf8",
    });

    for (const directory of [".agents", ".claude", ".hermes"]) {
      const skill = join(project, directory, "skills", "shared-understanding", "SKILL.md");
      assert.equal(existsSync(skill), true, `${skill} should exist`);
      assert.match(readFileSync(skill, "utf8"), /name: shared-understanding/);
    }

    const instructions = readFileSync(join(project, "AGENTS.md"), "utf8");
    assert.match(instructions, /<!-- team-skills:start -->/);
    assert.match(instructions, /shared-understanding/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("read-shared-understanding delegates to the project-local ntn executable", () => {
  const result = execFileSync(process.execPath, [cli, "read-shared-understanding", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.match(result, /ntn pages get 39b47eb592be8085a79bf50afd7d6da1/);
});
