#!/usr/bin/env node

/**
 * Deterministic dotenvx wrapper for Fort Wayne AI consumer projects.
 *
 * All output reports file/key/variable names only. Secret values must never be
 * logged, placed in command arguments, or written to a plaintext file.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd, env } from "node:process";

const SINGLE_TARGETS = ["local", "preview", "production"];
const TARGETS = [...SINGLE_TARGETS, "all"];
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

function envPath(file, root) {
  return resolve(root || cwd(), file);
}

function fileExists(file, root) {
  return existsSync(envPath(file, root));
}

function readSafe(file, root) {
  const path = envPath(file, root);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function parseDotenv(content) {
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function isEncrypted(file, root) {
  return /^[A-Z_][A-Z0-9_]*=encrypted:/m.test(readSafe(file, root));
}

function publicKeys(file, root) {
  return Object.keys(parseDotenv(readSafe(file, root))).filter((key) => key.startsWith("NEXT_PUBLIC_"));
}

function expectedKeys(root) {
  return new Set(Object.keys(parseDotenv(readSafe(".env.example", root))));
}

function definedKeys(file, root) {
  return new Set(Object.keys(parseDotenv(readSafe(file, root))));
}

function hasKeysFile(root) {
  return existsSync(envPath(".env.keys", root));
}

function hasEnvironmentKey() {
  return Object.keys(env).some((name) => name.startsWith("DOTENV_PRIVATE_KEY") && env[name]);
}

function targetsFor(target) {
  return target === "all" ? SINGLE_TARGETS : [target];
}

/**
 * Resolve a requested target. `auto` uses Vercel's deployment context because
 * Preview builds have NODE_ENV=production and therefore NODE_ENV is unsafe.
 */
export function resolveTarget(requested = "auto", vercelEnv = env.VERCEL_ENV) {
  if (requested === undefined || requested === "auto") {
    if (vercelEnv === "preview") return "preview";
    if (vercelEnv === "production") return "production";
    return "local";
  }
  if (TARGETS.includes(requested)) return requested;
  throw new Error(
    `Unknown environment target: ${requested}. Use local, preview, production, all, or auto.`,
  );
}

/** Return the one encrypted dotenvx file for a single target. */
export function getEnvFile(target) {
  switch (target) {
    case "local":
      return ".env";
    case "preview":
      return ".env.preview";
    case "production":
      return ".env.production";
    default:
      throw new Error(`Target ${target} does not have one environment file.`);
  }
}

export function help(log = console.log) {
  log(`team-skills env — encrypted environment variable management

USAGE
  team-skills env help
  team-skills env doctor
  team-skills env validate
  team-skills env check
  team-skills env run <command> [arg...]
  team-skills env set <KEY>

Add [--target <target>] before the -- command separator (or before the key
for set).
TARGETS
  auto        Default. Uses VERCEL_ENV=preview or VERCEL_ENV=production;
              otherwise selects local.
  local       .env
  preview     .env.preview
  production  .env.production
  all         Check all three files (doctor, validate, and check only).

COMMANDS
  doctor    Report encryption/key status and prove decryption without values.
  validate  Compare variable names against .env.example without values.
  check     Fail closed unless all expected variables decrypt successfully.
  run       Decrypt one selected file into a child process; no plaintext file.
  set       Prompt for one encrypted value; values are never accepted in argv.

SECURITY
  • .env.keys must NEVER be committed or uploaded to Vercel.
  • DOTENV_PRIVATE_KEY* values must NEVER be committed or logged.
  • Vercel Preview must never receive the production dotenvx private key.
`);
}

export function check(root, log = console.log, execute = execFileSync, requestedTarget = "auto") {
  const project = root || cwd();
  const target = resolveTarget(requestedTarget);
  if (target === "all") {
    let ready = true;
    for (const singleTarget of SINGLE_TARGETS) {
      if (!check(root, log, execute, singleTarget)) ready = false;
    }
    return ready;
  }

  const file = getEnvFile(target);
  const expected = [...expectedKeys(root)];
  if (!fileExists(file, root)) {
    log(`✗ ${file} not found — cannot verify ${target} decryption.`);
    return false;
  }
  if (expected.length === 0) {
    log("✗ .env.example has no variable names to verify.");
    return false;
  }
  if (!hasKeysFile(root) && !hasEnvironmentKey()) {
    log("✗ Decryption key unavailable — enroll .env.keys or configure DOTENV_PRIVATE_KEY.");
    return false;
  }

  try {
    const output = String(
      execute(
        "npx",
        [
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
        ],
        { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
    if (!output.includes(CHECK_OK)) throw new Error("Readiness marker missing");
    log(`✓ ${target}: required environment variables decrypted successfully.`);
    return true;
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`;
    const marker = output.split("\n").find((line) => line.startsWith(CHECK_MISSING));
    if (marker) {
      log(`✗ ${target}: decryption failed or values are missing: ${marker.slice(CHECK_MISSING.length)}`);
    } else {
      log(`✗ ${target}: decryption verification failed. The configured key may be incorrect.`);
    }
    return false;
  }
}

export function doctor(root, log = console.log, execute = execFileSync, requestedTarget = "auto") {
  const project = root || cwd();
  const target = resolveTarget(requestedTarget);
  const keyAvailable = hasKeysFile(root) || hasEnvironmentKey();
  let ready = true;

  log(`\n  Environment Doctor for ${project}\n`);
  log(`  decryption key   ${keyAvailable ? "✓ available" : "✗ missing"}`);

  for (const singleTarget of targetsFor(target)) {
    const file = getEnvFile(singleTarget);
    log(`\n  Target: ${singleTarget}`);
    if (!fileExists(file, root)) {
      ready = false;
      log(`  ${file.padEnd(18)} not found`);
      continue;
    }
    const encrypted = isEncrypted(file, root);
    if (!encrypted) ready = false;
    const publicNames = publicKeys(file, root);
    const parts = [
      encrypted ? "encrypted" : "plaintext",
      publicNames.length > 0 ? `${publicNames.length} public` : null,
      encrypted ? "decryption not yet verified" : null,
    ].filter(Boolean);
    log(`  ${file.padEnd(18)} ${parts.join(", ")}`);
    for (const name of publicNames) log(`    NEXT_PUBLIC:  ${name}`);
  }

  if (!keyAvailable) {
    log("\n  ✗ Missing decryption key — enroll .env.keys locally or configure DOTENV_PRIVATE_KEY.");
    return false;
  }
  if (!ready) {
    log("\n  ✗ Selected environment files are missing or contain plaintext values.");
    return false;
  }

  const decrypted = check(root, log, execute, target);
  if (decrypted) log("  ✓ decryption verified");
  return decrypted;
}

export function validate(root, log = console.log, requestedTarget = "auto") {
  const project = root || cwd();
  const target = resolveTarget(requestedTarget);
  const expected = expectedKeys(root);
  if (expected.size === 0) {
    log(`\n  No .env.example found at ${project}. Create one first.\n`);
    return false;
  }

  let valid = true;
  for (const singleTarget of targetsFor(target)) {
    const file = getEnvFile(singleTarget);
    if (!fileExists(file, root)) {
      valid = false;
      log(`  ✗ ${file} — not found`);
      continue;
    }
    const defined = definedKeys(file, root);
    const missing = [...expected].filter((key) => !defined.has(key));
    const extra = [...defined].filter((key) => !expected.has(key) && !key.startsWith("DOTENV_PUBLIC_KEY"));
    if (missing.length === 0 && extra.length === 0) {
      log(`  ✓ ${file} — matches .env.example`);
      continue;
    }
    valid = false;
    log(`  ⚠ ${file}:`);
    if (missing.length > 0) log(`      missing: ${missing.join(", ")}`);
    if (extra.length > 0) log(`      extra:   ${extra.join(", ")}`);
  }
  log(valid ? "\n  All env files match .env.example\n" : "\n  ⚠ Differences found — review missing/extra keys above.\n");
  return valid;
}

export function run(args, root, log = console.log, execute = execFileSync, requestedTarget = "auto") {
  const target = resolveTarget(requestedTarget);
  if (target === "all") {
    log("✗ env run cannot use --target all; choose local, preview, production, or auto.");
    return false;
  }
  if (args?.[0] === "--") args = args.slice(1);
  if (!args || args.length === 0) {
    log("Usage: team-skills env run [--target <target>] -- <command> [arg...]");
    return false;
  }

  const project = root || cwd();
  const file = getEnvFile(target);
  if (!fileExists(file, root)) {
    log(`✗ ${file} not found — nothing to decrypt.`);
    return false;
  }
  if (!check(root, log, execute, target)) {
    log("✗ Command not started because environment decryption is not ready.");
    return false;
  }

  try {
    execute(
      "npx",
      ["--no-install", "dotenvx", "run", "-f", envPath(file, root), "--", ...args],
      { cwd: project, stdio: "inherit" },
    );
    return true;
  } catch (error) {
    process.exitCode = error.status ?? 1;
    return false;
  }
}

export function set(key, root, log = console.log, execute = execFileSync, requestedTarget = "auto") {
  const target = resolveTarget(requestedTarget);
  if (target === "all") {
    log("✗ env set cannot use --target all; choose local, preview, production, or auto.");
    return false;
  }
  if (!key || !/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    log("Usage: team-skills env set <KEY>");
    log("  Optional target syntax: --target <target>.");
    log("  KEY must use uppercase letters, numbers, and underscores.");
    log("  The value is collected by dotenvx's masked prompt. Never pass secrets in arguments.");
    return false;
  }

  const project = root || cwd();
  const file = getEnvFile(target);
  try {
    execute(
      "npx",
      ["--no-install", "dotenvx", "set", key, "-f", envPath(file, root)],
      { cwd: project, stdio: "inherit" },
    );
    log(`✓ ${key} encrypted into ${file}`);
    return true;
  } catch (error) {
    log(`✗ dotenvx did not update ${file}`);
    process.exitCode = error.status ?? 1;
    return false;
  }
}
