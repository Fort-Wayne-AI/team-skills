import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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

test("setup installs developer-secrets and removes obsolete managed environment skill", () => {
  const root = mkdtempSync(join(tmpdir(), "team-skills-consumer-"));
  try {
    execFileSync(process.execPath, [cli, "setup", "--project", root], { encoding: "utf8" });
    const developer = join(root, ".agents", "skills", "developer-secrets");
    assert.equal(existsSync(developer), true);
    assert.equal(lstatSync(developer).isSymbolicLink(), false);
    assert.match(readFileSync(join(developer, "SKILL.md"), "utf8"), /name: developer-secrets/);
    assert.equal(existsSync(join(root, ".agents", "skills", "environment-secrets")), false);
    assert.equal(lstatSync(join(root, ".claude", "skills", "developer-secrets")).isSymbolicLink(), true);
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.match(agents, /developer-secrets/);
    assert.doesNotMatch(agents, /environment-secrets|dotenvx/);
  } finally { cleanup(root); }
});

test("package metadata, documentation, and CI describe the vault release", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  const workflow = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
  assert.equal(pkg.version, "1.0.0");
  assert.match(readme, /team-skills vault/);
  assert.doesNotMatch(readme, /dotenvx|team-skills env/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm pack --dry-run/);
});

test("packed consumer can invoke package-local ntn without global binaries", () => {
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
    const output = execFileSync(process.execPath, [npmCli, "exec", "--no", "--", "ntn", "--version"], { cwd: project, env: { ...process.env, PATH: standardPath }, encoding: "utf8" });
    assert.match(output, /^ntn 0\.19\.0\s*$/);
  } finally { cleanup(project); }
});
