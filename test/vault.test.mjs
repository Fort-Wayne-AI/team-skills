import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { check, clean, doctor, list, loadManifest, materialize } from "../lib/vault.mjs";

const FAKE_SECRET = "fake-secret-value-must-not-appear";

function project(manifest = {
  version: 1,
  entries: {
    development: {
      source: "vault/env/development.env.sops",
      destination: ".env.local",
      format: "dotenv",
    },
  },
}) {
  const root = mkdtempSync(join(tmpdir(), "team-skills-vault-"));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  writeFileSync(join(root, ".vault.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(root, ".gitignore"), ".env.local\n.private/\n.vault-receipts/\n");
  writeFileSync(join(root, "vault.env"), "public-key-placeholder\n");
  mkdirSync(join(root, "vault"), { recursive: true });
  return root;
}

function writeSource(root, name = "vault/env/development.env.sops") {
  const path = join(root, name);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, "encrypted-fixture\n", { flag: "a" });
  return path;
}

function fakeSops(secret = FAKE_SECRET) {
  return (command, args, options) => {
    assert.equal(command, "sops");
    assert.equal(args[0], "--decrypt");
    assert.equal(options.stdio, "pipe");
    return Buffer.from(secret);
  };
}

function capture() {
  const messages = [];
  return { log: (message) => messages.push(String(message)), text: () => messages.join("\n") };
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

test("loadManifest exposes paths and destinations but no ciphertext", () => {
  const root = project();
  try {
    writeSource(root);
    const manifest = loadManifest(root);
    assert.deepEqual(list(manifest), [{ name: "development", source: "vault/env/development.env.sops", destination: ".env.local", format: "dotenv" }]);
  } finally { cleanup(root); }
});

test("manifest rejects source traversal and destinations outside the repository", () => {
  const root = project({ version: 1, entries: { bad: { source: "../secret.sops", destination: ".env.local" } } });
  try {
    assert.throws(() => loadManifest(root), /must stay inside the repository|must stay under vault/);
  } finally { cleanup(root); }

  const second = project({ version: 1, entries: { bad: { source: "vault/env/a.sops", destination: "../outside" } } });
  try {
    assert.throws(() => loadManifest(second), /must stay inside the repository/);
  } finally { cleanup(second); }
});

test("doctor verifies official SOPS from PATH and gives the official install URL when missing", () => {
  const root = project();
  try {
    const present = capture();
    const officialSops = (command, args) => {
      assert.equal(command, "sops");
      assert.deepEqual(args, ["--version"]);
      return "sops 3.13.3\n";
    };
    assert.equal(doctor(root, present.log, officialSops), false);
    assert.match(present.text(), /official SOPS\s+✓ sops 3\.13\.3/);
    assert.doesNotMatch(present.text(), /packaged SOPS|TEAM_SKILLS_SOPS_BINARY/);

    const absent = capture();
    assert.equal(doctor(root, absent.log, () => { throw Object.assign(new Error("missing"), { code: "ENOENT" }); }), false);
    assert.match(absent.text(), /https:\/\/getsops\.io\/docs\/installation\//);
  } finally { cleanup(root); }
});

test("check validates an encrypted source and ignored destination without leaking decrypted content", () => {
  const root = project();
  try {
    writeSource(root);
    const c = capture();
    assert.equal(check("development", root, c.log, fakeSops()), true);
    assert.match(c.text(), /development/);
    assert.doesNotMatch(c.text(), new RegExp(FAKE_SECRET));
  } finally { cleanup(root); }
});

test("materialize writes a private, owned generated file and clean removes it", () => {
  const root = project();
  try {
    writeSource(root);
    const c = capture();
    assert.equal(materialize("development", undefined, root, c.log, fakeSops()), true);
    const destination = join(root, ".env.local");
    assert.equal(readFileSync(destination, "utf8"), FAKE_SECRET);
    assert.equal(lstatSync(destination).mode & 0o777, 0o600);
    assert.equal(existsSync(join(root, ".vault-receipts")), true);
    assert.doesNotMatch(c.text(), new RegExp(FAKE_SECRET));
    assert.equal(clean("development", root, c.log), true);
    assert.equal(existsSync(destination), false);
  } finally { cleanup(root); }
});

test("materialize refuses unmanaged existing plaintext, symlinks, and unignored destinations", () => {
  const root = project();
  try {
    writeSource(root);
    writeFileSync(join(root, ".env.local"), "unmanaged\n");
    const c = capture();
    assert.equal(materialize("development", undefined, root, c.log, fakeSops()), false);
    assert.match(c.text(), /unmanaged/);
    rmSync(join(root, ".env.local"));
    symlinkSync("vault.env", join(root, ".env.local"));
    assert.equal(materialize("development", undefined, root, c.log, fakeSops()), false);
    assert.match(c.text(), /symlink/);
  } finally { cleanup(root); }

  const second = project({ version: 1, entries: { dev: { source: "vault/env/dev.sops", destination: ".not-ignored" } } });
  try {
    writeSource(second, "vault/env/dev.sops");
    const c = capture();
    assert.equal(materialize("dev", undefined, second, c.log, fakeSops()), false);
    assert.match(c.text(), /Git-ignored/);
  } finally { cleanup(second); }
});

test("clean refuses unmanaged destinations", () => {
  const root = project();
  try {
    writeFileSync(join(root, ".env.local"), "unmanaged\n");
    const c = capture();
    assert.equal(clean("development", root, c.log), false);
    assert.equal(existsSync(join(root, ".env.local")), true);
    assert.match(c.text(), /not owned/);
  } finally { cleanup(root); }
});
