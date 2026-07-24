import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  check,
  doctor,
  getLocalEnvFile,
  help,
  isVercelBuild,
  run,
  set,
  validate,
} from "../lib/environment-secrets.mjs";

const EXAMPLE_CONTENT = `NEXT_PUBLIC_FAKE_URL=
SERVER_FAKE_KEY=
`;
const LOCAL_ENV_FILE = ".env.local.enc";

function setupProject({ local = "", keys = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "env-secrets-test-"));
  writeFileSync(join(dir, ".env.example"), EXAMPLE_CONTENT, "utf8");
  if (local) writeFileSync(join(dir, LOCAL_ENV_FILE), local, "utf8");
  if (keys) writeFileSync(join(dir, ".env.keys"), "DOTENV_PRIVATE_KEY=fake_key_for_testing_only\n", "utf8");
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function capture() {
  const lines = [];
  return { log: (message) => lines.push(String(message)), text: () => lines.join("\n") };
}

test("the only local encrypted file is .env.local.enc", () => {
  assert.equal(getLocalEnvFile(), LOCAL_ENV_FILE);
});

test("Vercel context is recognized only from VERCEL=1", () => {
  assert.equal(isVercelBuild({ VERCEL: "1" }), true);
  assert.equal(isVercelBuild({ VERCEL: "0" }), false);
  assert.equal(isVercelBuild({ VERCEL_ENV: "preview" }), false);
  assert.equal(isVercelBuild({}), false);
});

test("help describes one local file and Vercel-hosted configuration", () => {
  const c = capture();
  help(c.log);
  assert.match(c.text(), /\.env\.local\.enc/);
  assert.match(c.text(), /Vercel Environment Variables/);
  assert.doesNotMatch(c.text(), /--target/);
});

test("doctor and validate inspect only the local encrypted file", () => {
  const dir = setupProject({ local: "NEXT_PUBLIC_FAKE_URL=encrypted:fake\nSERVER_FAKE_KEY=encrypted:fake\n", keys: true });
  try {
    writeFileSync(join(dir, ".env"), "UNRELATED=plaintext\n", "utf8");
    writeFileSync(join(dir, ".env.preview"), "UNRELATED=plaintext\n", "utf8");
    writeFileSync(join(dir, ".env.production"), "UNRELATED=plaintext\n", "utf8");
    const c = capture();
    assert.equal(doctor(dir, c.log, () => "TEAM_SKILLS_ENV_CHECK_OK\n"), true);
    assert.equal(validate(dir, c.log), true);
    assert.match(c.text(), /\.env\.local\.enc/);
    assert.doesNotMatch(c.text(), /\.env\.preview|\.env\.production/);
  } finally {
    cleanup(dir);
  }
});

test("check fails closed when local encrypted configuration or its key is absent", () => {
  const dir = setupProject();
  try {
    const c = capture();
    assert.equal(check(dir, c.log), false);
    assert.match(c.text(), /\.env\.local\.enc not found/);
  } finally {
    cleanup(dir);
  }
});

test("local run checks then invokes dotenvx with only .env.local.enc", () => {
  const dir = setupProject({ local: "NEXT_PUBLIC_FAKE_URL=encrypted:fake\nSERVER_FAKE_KEY=encrypted:fake\n", keys: true });
  try {
    const calls = [];
    const c = capture();
    assert.equal(run(["--", "node", "-e", "0"], dir, c.log, (command, args, options) => {
      calls.push({ command, args, options });
      return "TEAM_SKILLS_ENV_CHECK_OK\n";
    }, {}), true);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((call) => call.args.includes(join(dir, LOCAL_ENV_FILE))));
    assert.deepEqual(calls[1].args.slice(calls[1].args.indexOf("--") + 1), ["node", "-e", "0"]);
  } finally {
    cleanup(dir);
  }
});

test("Vercel run executes the child directly without reading or decrypting local files", () => {
  const dir = setupProject();
  try {
    const calls = [];
    const c = capture();
    const hosted = { VERCEL: "1", NEXT_PUBLIC_FAKE_CONTEXT: "preview" };
    assert.equal(run(["--", "node", "-e", "0"], dir, c.log, (command, args, options) => {
      calls.push({ command, args, options });
    }, hosted), true);
    assert.deepEqual(calls, [{ command: "node", args: ["-e", "0"], options: { cwd: dir, stdio: "inherit", env: hosted } }]);
    assert.doesNotMatch(c.text(), /\.env\.local\.enc|decrypt/i);
  } finally {
    cleanup(dir);
  }
});

test("set prompts through dotenvx for the one local encrypted file without secret argv", () => {
  const dir = setupProject();
  try {
    const calls = [];
    const c = capture();
    assert.equal(set("NEW_SECRET", dir, c.log, (command, args, options) => calls.push({ command, args, options })), true);
    assert.deepEqual(calls[0].args, ["--no-install", "dotenvx", "set", "NEW_SECRET", "-f", join(dir, LOCAL_ENV_FILE)]);
    assert.match(c.text(), /NEW_SECRET encrypted into \.env\.local\.enc/);
  } finally {
    cleanup(dir);
  }
});
