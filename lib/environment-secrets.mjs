#!/usr/bin/env node

/**
 * environment-secrets — deterministic dotenvx wrapper for team-skills.
 *
 * Public interface:
 *   help()    – print usage
 *   doctor()  – check .env files, encryption status, key presence
 *   validate()– compare resolved keys against .env.example
 *   check()   – prove required values decrypt without printing them
 *   run(args) – decrypt and spawn a child process
 *   set(key)  – prompt for a single encrypted value (stdin, never argv)
 *
 * Every function that could expose secret values MUST accept a `log` callback
 * (default console.log) so test callers can capture output and assert secrets
 * never leak.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { cwd, env } from "node:process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_FILES = [".env"];
const CHECK_OK = "TEAM_SKILLS_ENV_CHECK_OK";
const CHECK_MISSING = "TEAM_SKILLS_ENV_CHECK_MISSING:";
const CHECK_SCRIPT = `
const names = JSON.parse(process.argv[1]);
const missing = names.filter((name) => {
  const value = process.env[name];
  return !value || value.startsWith("encrypted:");
});
if (missing.length > 0) {
  console.log(${JSON.stringify(CHECK_MISSING)} + missing.join(","));
  process.exit(1);
}
console.log(${JSON.stringify(CHECK_OK)});
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve an env-file path relative to project root (default: cwd). */
function envPath(file, root) {
  return resolve(root || cwd(), file);
}

/** Check if a file exists. */
function fileExists(file, root) {
  return existsSync(envPath(file, root));
}

/** Read file content, returning empty string for missing files. */
function readSafe(file, root) {
  const p = envPath(file, root);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

/** Check if a file contains encrypted values (detects `encrypted:` prefix). */
function isEncrypted(file, root) {
  const content = readSafe(file, root);
  return /^[A-Z_][A-Z0-9_]*=encrypted:/m.test(content);
}

/** Check if the .env.keys file exists. */
function hasKeys(root) {
  return existsSync(envPath(".env.keys", root));
}

/** Check for a private key supplied directly by CI/deployment process env. */
function hasEnvironmentKey() {
  return Object.keys(env).some((name) => name.startsWith("DOTENV_PRIVATE_KEY") && env[name]);
}

/** Parse .env.example and return the set of expected variable names. */
function expectedKeys(root) {
  const parsed = parseDotenv(readSafe(".env.example", root));
  return new Set(Object.keys(parsed));
}

/** Parse a resolved .env file and return the set of defined variable names. */
function definedKeys(file, root) {
  const parsed = parseDotenv(readSafe(file, root));
  return new Set(Object.keys(parsed));
}

/** Return all `NEXT_PUBLIC_*` keys from a resolved .env file. */
function publicKeys(file, root) {
  const parsed = parseDotenv(readSafe(file, root));
  return Object.keys(parsed).filter((k) => k.startsWith("NEXT_PUBLIC_"));
}

/**
 * Minimal .env parser (no dependency needed).
 * Handles KEY=value, quoted values, and comments.
 */
function parseDotenv(content) {
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function help(log = console.log) {
  log(`team-skills env — encrypted environment variable management

USAGE
  team-skills env help
  team-skills env doctor
  team-skills env validate
  team-skills env check
  team-skills env run <command> [arg...]
  team-skills env set <KEY>

COMMANDS
  help      Print this message.
  doctor    Check the .env file's encryption status and whether .env.keys
            is present.
  validate  Compare the .env variable names against .env.example and report
            missing or extra keys.
  check     Prove every variable in .env.example decrypts successfully. Exits
            nonzero without printing values when the key is missing or wrong.
  run       Decrypt .env into the environment and execute the given command.
            Never creates a plaintext .env file on disk.
  set       Prompt (stdin) for the value of a single key and encrypt it into
            .env. Does NOT accept the value as an argument.

SECURITY
  • .env.keys must NEVER be committed or uploaded to Vercel.
  • Each environment has its own file: .env (local), .env.preview (PR),
    .env.production (prod). All are complete parallel sets.
`);
}

export function doctor(root, log = console.log, execute = execFileSync) {
  const project = root || cwd();

  log(`\n  Environment Doctor for ${project}\n`);

  const keyAvailable = hasKeys(root) || hasEnvironmentKey();
  const keyStatus = keyAvailable ? "✓ available" : "✗ missing";
  log(`  decryption key   ${keyStatus}`);

  let encryptedFilesReady = true;
  for (const file of ENV_FILES) {
    const exists = fileExists(file, root);
    if (!exists) {
      encryptedFilesReady = false;
      log(`  ${file.padEnd(18)} not found`);
      continue;
    }
    const enc = isEncrypted(file, root);
    if (!enc) encryptedFilesReady = false;
    const pub = publicKeys(file, root);
    const parts = [
      enc ? "encrypted" : "plaintext",
      pub.length > 0 ? `${pub.length} public` : null,
      enc ? "decryption not yet verified" : null,
    ].filter(Boolean);
    log(`  ${file.padEnd(18)} ${parts.join(", ")}`);
    for (const k of pub) {
      log(`    NEXT_PUBLIC:  ${k}`);
    }
  }

  if (!keyAvailable) {
    log("\n  ✗ Missing decryption key — enroll .env.keys locally or configure DOTENV_PRIVATE_KEY.");
    return false;
  }
  if (!encryptedFilesReady) {
    log("\n  ✗ Environment files are missing or contain plaintext values.");
    return false;
  }

  const ready = check(root, log, execute);
  if (ready) log("  ✓ decryption verified");
  return ready;
}

export function validate(root, log = console.log) {
  const project = root || cwd();
  const expected = expectedKeys(root);

  if (expected.size === 0) {
    log(`\n  No .env.example found at ${project}. Create one first.\n`);
    return;
  }

  let allGood = true;
  for (const file of ENV_FILES) {
    if (!fileExists(file, root)) continue;
    const defined = definedKeys(file, root);
    const missing = [...expected].filter((k) => !defined.has(k));
    const extra = [...defined].filter((k) => !expected.has(k));

    if (missing.length === 0 && extra.length === 0) {
      log(`  ✓ ${file} — matches .env.example`);
    } else {
      allGood = false;
      log(`  ⚠ ${file}:`);
      if (missing.length > 0) {
        log(`      missing: ${missing.join(", ")}`);
      }
      if (extra.length > 0) {
        log(`      extra:   ${extra.join(", ")}`);
      }
    }
  }

  if (allGood) {
    log(`\n  All env files match .env.example\n`);
  } else {
    log(`\n  ⚠  Differences found — review missing/extra keys above.\n`);
  }
}

export function check(root, log = console.log, execute = execFileSync) {
  const project = root || cwd();
  const expected = [...expectedKeys(root)];
  const file = ENV_FILES.find((candidate) => fileExists(candidate, root));

  if (!file) {
    log("✗ .env not found — cannot verify decryption.");
    return false;
  }
  if (expected.length === 0) {
    log("✗ .env.example has no variable names to verify.");
    return false;
  }
  if (!hasKeys(root) && !hasEnvironmentKey()) {
    log("✗ Decryption key unavailable — enroll .env.keys or configure DOTENV_PRIVATE_KEY.");
    return false;
  }

  const args = [
    "--no-install",
    "dotenvx",
    "--quiet",
    "run",
    "-f",
    envPath(file, root),
    "--",
    process.execPath,
    "-e",
    CHECK_SCRIPT,
    JSON.stringify(expected),
  ];

  try {
    const output = String(execute("npx", args, {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }));
    if (!output.includes(CHECK_OK)) throw new Error("Readiness marker missing");
    log("✓ Required environment variables decrypted successfully.");
    return true;
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`;
    const marker = output.split("\n").find((line) => line.startsWith(CHECK_MISSING));
    if (marker) {
      const names = marker.slice(CHECK_MISSING.length);
      log(`✗ Decryption failed or values are missing: ${names}`);
    } else {
      log("✗ Decryption verification failed. The configured key may be incorrect.");
    }
    return false;
  }
}

export function run(args, root, log = console.log, execute = execFileSync) {
  if (!args || args.length === 0) {
    log("Usage: team-skills env run <command> [arg...]");
    return false;
  }

  const project = root || cwd();
  const envFiles = ENV_FILES.filter((f) => fileExists(f, root));
  if (envFiles.length === 0) {
    log("✗ No .env files found — nothing to decrypt.");
    return false;
  }

  if (!check(root, log, execute)) {
    log("✗ Command not started because environment decryption is not ready.");
    return false;
  }

  const dotenvArgs = ["run"];
  for (const f of envFiles) {
    dotenvArgs.push("-f", envPath(f, root));
  }
  dotenvArgs.push("--", ...args);

  try {
    execute("npx", ["--no-install", "dotenvx", ...dotenvArgs], {
      cwd: project,
      stdio: "inherit",
    });
    return true;
  } catch (e) {
    process.exitCode = e.status ?? 1;
    return false;
  }
}

export function set(key, root, log = console.log, execute = execFileSync) {
  if (!key || !/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    log("Usage: team-skills env set <KEY>");
    log("  KEY must use uppercase letters, numbers, and underscores.");
    log("  The value is collected by dotenvx's masked prompt. Never pass secrets in arguments.");
    return;
  }

  const project = root || cwd();
  const fullPath = envPath(".env", root);

  // Let dotenvx own both the masked TTY prompt and the encrypted update.
  // Deliberately omit the value from argv so it cannot leak through shell history,
  // process listings, or agent transcripts.
  try {
    execute("npx", ["--no-install", "dotenvx", "set", key, "-f", fullPath], {
      cwd: project,
      stdio: "inherit",
    });
    log(`✓ ${key} encrypted into .env`);
  } catch (e) {
    log("✗ dotenvx did not update .env");
    process.exitCode = e.status ?? 1;
  }
}
