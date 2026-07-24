import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname;
const cli = join(repoRoot, "bin", "team-skills.mjs");
const fakeSecret = "FAKE_INTEGRATION_SECRET_ONLY";

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "team-skills-sops-integration-"));
  const home = join(root, "home");
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const identity = join(root, "fake-age-identity.txt");
  run("age-keygen", ["-o", identity]);
  chmodSync(identity, 0o600);
  const recipient = run("age-keygen", ["-y", identity]).trim();
  run("git", ["init", "--quiet"], { cwd: root });
  mkdirSync(join(root, "vault", "env"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".env.local\n.vault-receipts/\n");
  writeFileSync(join(root, ".vault.json"), JSON.stringify({ version: 1, entries: {
    development: { source: "vault/env/development.env.sops", destination: ".env.local", format: "dotenv" },
  } }));
  writeFileSync(join(root, ".sops.yaml"), `creation_rules:\n  - path_regex: vault/.*\\.sops$\n    age: ${recipient}\n`);
  return { root, home, identity };
}

function cleanup(root) { rmSync(root, { recursive: true, force: true }); }

function vault(root, home, args) {
  return run(process.execPath, [cli, "vault", ...args], { cwd: root, env: { ...process.env, HOME: home } });
}

function encryptFixture(root, value = fakeSecret) {
  const plaintext = join(root, "input.env");
  writeFileSync(plaintext, `TOKEN=${value}\n`, { mode: 0o600 });
  const encrypted = run("sops", ["--encrypt", "--config", join(root, ".sops.yaml"), "--filename-override", "vault/env/development.env.sops", "--input-type", "dotenv", "--output-type", "dotenv", plaintext], { cwd: root });
  writeFileSync(join(root, "vault", "env", "development.env.sops"), encrypted, { mode: 0o600 });
  rmSync(plaintext);
}

test("init creates an encrypted manifest entry using actual SOPS and the committed public recipient", () => {
  const { root, home } = fixture();
  try {
    const output = vault(root, home, ["init", "vault/env/development.env.sops"]);
    assert.match(output, /initialized encrypted vault source/);
    const source = join(root, "vault", "env", "development.env.sops");
    assert.equal(existsSync(source), true);
    assert.match(readFileSync(source, "utf8"), /sops_(?:version|age__list)/);
    assert.equal(lstatSync(source).mode & 0o777, 0o600);
    assert.doesNotMatch(output, new RegExp(fakeSecret));
  } finally { cleanup(root); }
});

test("actual SOPS materialization uses a disposable age identity and never prints fake content", () => {
  const { root, home, identity } = fixture();
  try {
    encryptFixture(root);
    const enrolled = vault(root, home, ["enroll", "--from", identity]);
    assert.doesNotMatch(enrolled, new RegExp(fakeSecret));
    const output = vault(root, home, ["materialize", "development"]);
    assert.doesNotMatch(output, new RegExp(fakeSecret));
    assert.equal(readFileSync(join(root, ".env.local"), "utf8"), `TOKEN=${fakeSecret}\n`);
    assert.equal(lstatSync(join(root, ".env.local")).mode & 0o777, 0o600);
  } finally { cleanup(root); }
});

test("updatekeys rewrites recipients from committed configuration without printing fake content", () => {
  const { root, home, identity } = fixture();
  const replacement = join(root, "replacement-age-identity.txt");
  try {
    encryptFixture(root);
    vault(root, home, ["enroll", "--from", identity]);
    run("age-keygen", ["-o", replacement]);
    const recipient = run("age-keygen", ["-y", replacement]).trim();
    writeFileSync(join(root, ".sops.yaml"), `creation_rules:\n  - path_regex: vault/.*\\.sops$\n    age: ${recipient}\n`);
    const output = vault(root, home, ["updatekeys"]);
    assert.match(output, /updated recipients for 1 vault entry/);
    assert.doesNotMatch(output, new RegExp(fakeSecret));
    assert.doesNotThrow(() => run("sops", ["--decrypt", "--input-type", "dotenv", "--output-type", "dotenv", "vault/env/development.env.sops"], { cwd: root, env: { ...process.env, SOPS_AGE_KEY_FILE: replacement } }));
  } finally { cleanup(root); }
});

test("edit refuses to run without an interactive terminal", () => {
  const { root, home, identity } = fixture();
  try {
    encryptFixture(root);
    vault(root, home, ["enroll", "--from", identity]);
    assert.throws(() => vault(root, home, ["edit", "development"]), (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stdout, /interactive terminal/i);
      assert.doesNotMatch(error.stdout, new RegExp(fakeSecret));
      return true;
    });
  } finally { cleanup(root); }
});
