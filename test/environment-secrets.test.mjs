import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { help, doctor, validate, check, run, set } from "../lib/environment-secrets.mjs";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
//
// All fixture values use obviously fake data. Tests assert these values NEVER
// appear in doctor/validate output.

const EXAMPLE_CONTENT = `# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SLACK_INVITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NOTION_TOKEN=
NOTION_LEARNING_OPPS_DS=
NOTION_EVENTS_DS=
CRON_SECRET=
`;

const PLAIN_ENV_CONTENT = `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=pubkey_abc123
NEXT_PUBLIC_SLACK_INVITE_URL=https://slack.example.com/invite
SUPABASE_SERVICE_ROLE_KEY=sr_key_fake_do_not_use
NOTION_TOKEN=ntn_fake_token_do_not_use
NOTION_LEARNING_OPPS_DS=ds_fake_learning
NOTION_EVENTS_DS=ds_fake_events
CRON_SECRET=cron_secret_fake_123
`;

const FAKE_SECRETS = [
  "sr_key_fake_do_not_use",
  "ntn_fake_token_do_not_use",
  "cron_secret_fake_123",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temporary project directory with .env.example and optional .env files. */
function setupProject(withPlainEnv = false, withKeys = false) {
  const dir = mkdtempSync(join(tmpdir(), "env-secrets-test-"));
  writeFileSync(join(dir, ".env.example"), EXAMPLE_CONTENT, "utf8");

  if (withPlainEnv) {
    writeFileSync(join(dir, ".env"), PLAIN_ENV_CONTENT, "utf8");
  }

  if (withKeys) {
    writeFileSync(
      join(dir, ".env.keys"),
      `DOTENV_PRIVATE_KEY_DEVELOPMENT=fake_key_for_testing_only\n`,
      "utf8",
    );
  }

  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

/** Capture console output by providing a custom log function. */
function capture() {
  const lines = [];
  return {
    log: (msg) => lines.push(String(msg)),
    lines: () => lines,
    text: () => lines.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("help outputs usage without throwing", () => {
  const c = capture();
  help(c.log);
  assert.match(c.text(), /team-skills env/);
  assert.match(c.text(), /doctor/);
  assert.match(c.text(), /validate/);
  assert.match(c.text(), /check/);
  assert.match(c.text(), /run/);
  assert.match(c.text(), /set/);
  assert.match(c.text(), /\.env\.keys must NEVER/);
});

test("doctor reports files with encryption status", () => {
  const dir = setupProject(true, true);
  try {
    const c = capture();
    doctor(dir, c.log);

    const text = c.text();
    assert.match(text, /Environment Doctor/);
    assert.match(text, /decryption key/);
    assert.match(text, /\.env/);
    assert.match(text, /plaintext/);
    assert.match(text, /NEXT_PUBLIC_SUPABASE_URL/);

    // SECURITY: No fake secret values should appear in output
    for (const secret of FAKE_SECRETS) {
      assert.doesNotMatch(text, new RegExp(secret.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")));
    }
  } finally {
    cleanup(dir);
  }
});

test("doctor warns when .env.keys is missing", () => {
  const dir = setupProject(true, false);
  try {
    const c = capture();
    doctor(dir, c.log);

    assert.match(c.text(), /decryption key\s+✗ missing/);
    assert.match(c.text(), /Missing decryption key/);
  } finally {
    cleanup(dir);
  }
});

test("doctor handles empty project", () => {
  const dir = setupProject(false, false);
  try {
    const c = capture();
    doctor(dir, c.log);

    const text = c.text();
    assert.match(text, /not found/);
  } finally {
    cleanup(dir);
  }
});

test("validate matches when .env matches .env.example", () => {
  const dir = setupProject(true, false);
  try {
    const c = capture();
    validate(dir, c.log);

    assert.match(c.text(), /matches \.env\.example/);
    assert.match(c.text(), /All env files match/);
  } finally {
    cleanup(dir);
  }
});

test("validate reports missing and extra keys", () => {
  const dir = setupProject(false, false);
  try {
    // Write a .env that's missing some keys and has extras
    writeFileSync(join(dir, ".env"), "NEXT_PUBLIC_SUPABASE_URL=https://example.com\nEXTRA_KEY=val\n", "utf8");

    const c = capture();
    validate(dir, c.log);

    const text = c.text();
    assert.match(text, /missing/);
    assert.match(text, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    assert.match(text, /EXTRA_KEY/);

    // SECURITY: No secret values in output — only variable names
    assert.doesNotMatch(text, /sr_key_fake_do_not_use/);
  } finally {
    cleanup(dir);
  }
});

test("validate handles no .env.example gracefully", () => {
  const dir = mkdtempSync(join(tmpdir(), "env-secrets-no-example-"));
  try {
    const c = capture();
    validate(dir, c.log);
    assert.match(c.text(), /No \.env\.example found/);
  } finally {
    cleanup(dir);
  }
});

test("doctor detects encrypted files when values are encrypted", () => {
  // Simulate encrypted by writing a value starting with "encrypted:"
  const dir = setupProject(false, true);
  try {
    writeFileSync(
      join(dir, ".env"),
      `NEXT_PUBLIC_SUPABASE_URL=encrypted:BGY7o+25eniO2mZAHM7Psd5aYfvGj6aIafoClg==\n`,
      "utf8",
    );
    const c = capture();
    doctor(dir, c.log, () => "TEAM_SKILLS_ENV_CHECK_OK\n");
    assert.match(c.text(), /encrypted/);
  } finally {
    cleanup(dir);
  }
});

test("help output never includes real env values (self-check)", () => {
  const c = capture();
  help(c.log);
  for (const secret of FAKE_SECRETS) {
    assert.doesNotMatch(c.text(), new RegExp(secret.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("doctor NEXT_PUBLIC_ detection works", () => {
  const dir = setupProject(true, true);
  try {
    const c = capture();
    doctor(dir, c.log);
    // Should list public vars
    assert.match(c.text(), /NEXT_PUBLIC_SUPABASE_URL/);
    assert.match(c.text(), /NEXT_PUBLIC_SLACK_INVITE_URL/);
    // Should NOT list server-only vars by value
    assert.doesNotMatch(c.text(), /SUPABASE_SERVICE_ROLE_KEY/);
  } finally {
    cleanup(dir);
  }
});

test("doctor reports decryptable status when both encrypted and keys present", () => {
  const dir = setupProject(false, true);
  try {
    writeFileSync(
      join(dir, ".env"),
      `NEXT_PUBLIC_TEST=encrypted:BGY7o+25eniO2mZAHM7Psd5aYfvGj6aIafoClg/Cc/NqiMQES8F2pNJQSSYYm3A8azV2+twIPlGyy+PKb9xC1+Gfh2eoTPXnuoX2UU64TCaHRQOqVyIbG0Ce/dTKQBBE6eiU/bh05XrvN/dUCuySn7hN7A==\n`,
      "utf8",
    );
    const c = capture();
    doctor(dir, c.log, () => "TEAM_SKILLS_ENV_CHECK_OK\n");
    // Should prove that decryption actually succeeded.
    assert.match(c.text(), /decryption verified/);
  } finally {
    cleanup(dir);
  }
});

test("check succeeds only when the readiness probe confirms decrypted values", () => {
  const dir = setupProject(false, true);
  const c = capture();

  try {
    writeFileSync(join(dir, ".env"), "TEST_KEY=encrypted:fake-ciphertext\n", "utf8");
    writeFileSync(join(dir, ".env.example"), "TEST_KEY=\n", "utf8");

    const ready = check(dir, c.log, () => "TEAM_SKILLS_ENV_CHECK_OK\n");

    assert.equal(ready, true);
    assert.match(c.text(), /decrypted successfully/);
  } finally {
    cleanup(dir);
  }
});

test("check fails closed and reports names only when values remain encrypted", () => {
  const dir = setupProject(false, true);
  const c = capture();

  try {
    writeFileSync(join(dir, ".env"), "TEST_KEY=encrypted:fake-ciphertext\n", "utf8");
    writeFileSync(join(dir, ".env.example"), "TEST_KEY=\n", "utf8");
    const error = Object.assign(new Error("probe failed"), {
      status: 1,
      stdout: "TEAM_SKILLS_ENV_CHECK_MISSING:TEST_KEY\n",
      stderr: "",
    });

    const ready = check(dir, c.log, () => { throw error; });

    assert.equal(ready, false);
    assert.match(c.text(), /TEST_KEY/);
    assert.doesNotMatch(c.text(), /fake-ciphertext/);
  } finally {
    cleanup(dir);
  }
});

test("run does not start the requested child when readiness fails", () => {
  const dir = setupProject(false, true);
  const calls = [];
  const c = capture();

  try {
    writeFileSync(join(dir, ".env"), "TEST_KEY=encrypted:fake-ciphertext\n", "utf8");
    writeFileSync(join(dir, ".env.example"), "TEST_KEY=\n", "utf8");
    const error = Object.assign(new Error("probe failed"), {
      status: 1,
      stdout: "TEAM_SKILLS_ENV_CHECK_MISSING:TEST_KEY\n",
      stderr: "",
    });

    const started = run(["node", "child.mjs"], dir, c.log, (...args) => {
      calls.push(args);
      throw error;
    });

    assert.equal(started, false);
    assert.equal(calls.length, 1, "only the readiness probe should execute");
    assert.match(c.text(), /Command not started/);
  } finally {
    cleanup(dir);
  }
});

test("set delegates secret entry to dotenvx without putting a value in argv", () => {
  const dir = setupProject(false, false);
  const calls = [];
  const c = capture();

  try {
    set("NEW_SECRET", dir, c.log, (command, args, options) => {
      calls.push({ command, args, options });
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "npx");
    assert.deepEqual(calls[0].args, [
      "--no-install",
      "dotenvx",
      "set",
      "NEW_SECRET",
      "-f",
      join(dir, ".env"),
    ]);
    assert.equal(calls[0].options.stdio, "inherit");
    assert.doesNotMatch(calls[0].args.join(" "), /fake.*secret/i);
    assert.match(c.text(), /NEW_SECRET encrypted into \.env/);
  } finally {
    cleanup(dir);
  }
});

test("run strips a leading -- separator before passing args to dotenvx", () => {
  const dir = setupProject(false, true);
  const calls = [];
  const c = capture();

  try {
    writeFileSync(join(dir, ".env"), "TEST_KEY=encrypted:fake\n", "utf8");
    writeFileSync(join(dir, ".env.example"), "TEST_KEY=\n", "utf8");

    run(["--", "node", "-e", "console.log(1)"], dir, c.log, (command, args, options) => {
      calls.push({ command, args, options });
      return "TEAM_SKILLS_ENV_CHECK_OK\n";
    });

    // calls[0] = readiness probe (dotenvx run --quiet ...), calls[1] = actual run
    assert.equal(calls.length, 2, "check probe then run");
    const runArgs = calls[1].args;
    const separatorIndex = runArgs.indexOf("--");
    assert.ok(separatorIndex !== -1, "dotenvx needs its own -- separator");
    assert.deepEqual(runArgs.slice(separatorIndex + 1), ["node", "-e", "console.log(1)"]);
  } finally {
    cleanup(dir);
  }
});

test("run works without a leading -- separator", () => {
  const dir = setupProject(false, true);
  const calls = [];
  const c = capture();

  try {
    writeFileSync(join(dir, ".env"), "TEST_KEY=encrypted:fake\n", "utf8");
    writeFileSync(join(dir, ".env.example"), "TEST_KEY=\n", "utf8");

    run(["node", "-e", "console.log(1)"], dir, c.log, (command, args, options) => {
      calls.push({ command, args, options });
      return "TEAM_SKILLS_ENV_CHECK_OK\n";
    });

    assert.equal(calls.length, 2, "check probe then run");
    const runArgs = calls[1].args;
    const separatorIndex = runArgs.indexOf("--");
    assert.deepEqual(runArgs.slice(separatorIndex + 1), ["node", "-e", "console.log(1)"]);
  } finally {
    cleanup(dir);
  }
});

test("set rejects invalid key names before invoking dotenvx", () => {
  const calls = [];
  const c = capture();

  set("bad key", undefined, c.log, (...args) => calls.push(args));

  assert.equal(calls.length, 0);
  assert.match(c.text(), /Usage: team-skills env set <KEY>/);
});
