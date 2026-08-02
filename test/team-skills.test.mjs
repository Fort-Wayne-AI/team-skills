import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname;
const cli = join(repoRoot, "bin", "team-skills.mjs");

function project() {
  const root = mkdtempSync(join(tmpdir(), "team-skills-cli-vault-"));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  mkdirSync(join(root, "vault", "env"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".env.local\n.vault-receipts/\n");
  writeFileSync(join(root, ".vault.json"), JSON.stringify({ version: 1, entries: { development: { source: "vault/env/development.env.sops", destination: ".env.local", format: "dotenv" } } }));
  writeFileSync(join(root, "vault", "env", "development.env.sops"), "fake-ciphertext\n");
  return root;
}

function cleanup(path) { rmSync(path, { recursive: true, force: true }); }

test("CLI documents vault commands and does not expose dotenvx commands", () => {
  const output = execFileSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.match(output, /team-skills vault <command>/);
  assert.match(output, /materialize/);
  assert.doesNotMatch(output, /env doctor|dotenvx/);
});

test("CLI rejects obsolete env commands with a secret-safe migration message", () => {
  assert.throws(() => execFileSync(process.execPath, [cli, "env", "doctor"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error) => {
    assert.equal(error.status, 1);
    assert.match(error.stderr, /env is retired.*vault/i);
    return true;
  });
});

test("CLI lists non-secret vault metadata", () => {
  const root = project();
  try {
    const output = execFileSync(process.execPath, [cli, "vault", "list"], { cwd: root, encoding: "utf8" });
    assert.match(output, /development/);
    assert.match(output, /vault\/env\/development\.env\.sops/);
    assert.match(output, /\.env\.local/);
    assert.doesNotMatch(output, /fake-ciphertext/);
  } finally { cleanup(root); }
});

test("setup installs current skills and omits retired skills", () => {
  const root = mkdtempSync(join(tmpdir(), "team-skills-consumer-"));
  try {
    for (const skill of ["environment-secrets", "notion-cli"]) {
      const physical = join(root, ".agents", "skills", skill);
      mkdirSync(physical, { recursive: true });
      writeFileSync(join(physical, ".team-skills.json"), JSON.stringify({ package: "@fort-wayne-ai/team-skills", version: "0.8.0", skill }));
      writeFileSync(join(physical, "SKILL.md"), `name: ${skill}\n`);
      for (const target of [".claude", ".hermes"]) {
        const link = join(root, target, "skills", skill);
        mkdirSync(dirname(link), { recursive: true });
        symlinkSync(relative(dirname(link), physical), link, "dir");
      }
    }
    execFileSync(process.execPath, [cli, "setup", "--project", root], { encoding: "utf8" });
    const developer = join(root, ".agents", "skills", "developer-secrets");
    assert.equal(existsSync(developer), true);
    assert.equal(lstatSync(developer).isSymbolicLink(), false);
    assert.match(readFileSync(join(developer, "SKILL.md"), "utf8"), /name: developer-secrets/);
    const githubIssues = join(root, ".agents", "skills", "github-issues");
    assert.equal(existsSync(githubIssues), true);
    assert.match(readFileSync(join(githubIssues, "SKILL.md"), "utf8"), /name: github-issues/);
    assert.equal(existsSync(join(root, ".agents", "skills", "environment-secrets")), false);
    assert.equal(existsSync(join(root, ".agents", "skills", "notion-cli")), false);
    assert.equal(existsSync(join(root, ".claude", "skills", "notion-cli")), false);
    assert.equal(existsSync(join(root, ".hermes", "skills", "environment-secrets")), false);
    assert.equal(lstatSync(join(root, ".claude", "skills", "developer-secrets")).isSymbolicLink(), true);
    assert.equal(lstatSync(join(root, ".hermes", "skills", "github-issues")).isSymbolicLink(), true);
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.match(agents, /developer-secrets/);
    assert.match(agents, /github-issues/);
    assert.doesNotMatch(agents, /environment-secrets|dotenvx|notion-cli/);
  } finally { cleanup(root); }
});

test("setup preserves an unmanaged retired skill directory", () => {
  const root = mkdtempSync(join(tmpdir(), "team-skills-unmanaged-retired-"));
  try {
    const unmanaged = join(root, ".agents", "skills", "notion-cli");
    mkdirSync(unmanaged, { recursive: true });
    writeFileSync(join(unmanaged, "SKILL.md"), "name: local-notion-workflow\n");
    execFileSync(process.execPath, [cli, "setup", "--project", root], { encoding: "utf8" });
    assert.equal(existsSync(join(unmanaged, "SKILL.md")), true);
  } finally { cleanup(root); }
});

test("package metadata, documentation, and CI describe the current release", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  const workflow = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
  assert.equal(pkg.version, "0.9.2");
  assert.equal(pkg.dependencies?.ntn, undefined);
  assert.match(readme, /team-skills vault/);
  assert.match(readme, /github-issues/);
  assert.doesNotMatch(readme, /notion-cli|official `ntn` CLI/);
  assert.doesNotMatch(readme, /dotenvx|team-skills env/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm pack --dry-run/);
});

test("packed consumer can install and invoke team-skills setup", () => {
  const project = mkdtempSync(join(tmpdir(), "team-skills-packed-consumer-"));
  const isolatedBin = join(project, ".test-bin");
  mkdirSync(isolatedBin);
  symlinkSync(process.execPath, join(isolatedBin, "node"));
  const standardPath = `${isolatedBin}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`;
  const npmCli = resolve(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js");
  try {
    writeFileSync(join(project, "package.json"), '{"private":true}\n');
    const pack = execFileSync(process.execPath, [npmCli, "pack", "--json", "--pack-destination", project], { cwd: repoRoot, encoding: "utf8" });
    const tarball = join(project, JSON.parse(pack)[0].filename);
    execFileSync(process.execPath, [npmCli, "install", "--save-dev", tarball], { cwd: project, env: { ...process.env, PATH: standardPath }, stdio: "ignore" });
    execFileSync(process.execPath, [npmCli, "exec", "--no", "--", "team-skills", "setup"], { cwd: project, env: { ...process.env, PATH: standardPath }, encoding: "utf8" });
    assert.equal(existsSync(join(project, ".agents", "skills", "github-issues", "SKILL.md")), true);
    assert.equal(existsSync(join(project, ".agents", "skills", "notion-cli")), false);
  } finally { cleanup(project); }
});
