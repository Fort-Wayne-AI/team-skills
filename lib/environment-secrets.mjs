#!/usr/bin/env node

/**
 * Local dotenvx wrapper for Fort Wayne AI consumer projects.
 *
 * Local development decrypts one committed ciphertext file. Vercel builds are
 * an explicit pass-through: Vercel Environment Variables are their only source.
 * Output reports names and readiness only; secret values are never logged.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd, env, execPath } from "node:process";

const LOCAL_ENV_FILE = ".env.local.enc";
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

function readSafe(file, root) {
  const path = envPath(file, root);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function parseDotenv(content) {
  const result = {};
  for (const line of content.split("\n")) {
    const match = line.trim().match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match || match[0].startsWith("#")) continue;
    result[match[1]] = match[2].trim().replace(/^("|')|("|')$/g, "");
  }
  return result;
}

function expectedKeys(root) {
  return new Set(Object.keys(parseDotenv(readSafe(".env.example", root))));
}

function hasKey(root, processEnv) {
  return existsSync(envPath(".env.keys", root)) || Object.keys(processEnv).some(
    (name) => name.startsWith("DOTENV_PRIVATE_KEY") && processEnv[name],
  );
}

function encrypted(root) {
  return /^[A-Z_][A-Z0-9_]*=encrypted:/m.test(readSafe(LOCAL_ENV_FILE, root));
}

export function getLocalEnvFile() {
  return LOCAL_ENV_FILE;
}

/** Vercel documents VERCEL=1 as the system build-context signal. */
export function isVercelBuild(processEnv = env) {
  return processEnv.VERCEL === "1";
}

export function help(log = console.log) {
  log(`team-skills env — encrypted environment variable management

USAGE
  team-skills env help
  team-skills env doctor
  team-skills env validate
  team-skills env check
  team-skills env run -- <command> [arg...]
  team-skills env set <KEY>

LOCAL CONFIGURATION
  ${LOCAL_ENV_FILE} is the one committed encrypted local configuration file.
  .env.keys stays local and must never be committed.

HOSTED CONFIGURATION
  Vercel Preview and Production use Vercel Environment Variables only.
  A Vercel build passes the child command through without reading or decrypting
  local dotenvx configuration. Never upload dotenvx keys to Vercel.

COMMANDS
  doctor    Report local encryption/key status and prove decryption without values.
  validate  Compare local variable names against .env.example without values.
  check     Fail closed unless all local expected variables decrypt successfully.
  run       Decrypt local config into a child process, or pass through in Vercel.
  set       Prompt for one local encrypted value; values are never accepted in argv.
`);
}

export function check(root, log = console.log, execute = execFileSync, processEnv = env) {
  const project = root || cwd();
  const file = envPath(LOCAL_ENV_FILE, root);
  const expected = [...expectedKeys(root)];
  if (!existsSync(file)) {
    log(`✗ ${LOCAL_ENV_FILE} not found — cannot verify local decryption.`);
    return false;
  }
  if (expected.length === 0) {
    log("✗ .env.example has no variable names to verify.");
    return false;
  }
  if (!hasKey(root, processEnv)) {
    log("✗ Decryption key unavailable — enroll .env.keys locally.");
    return false;
  }
  try {
    const output = String(execute("npx", [
      "--no-install", "dotenvx", "--quiet", "run", "-f", file, "--", execPath,
      "-e", CHECK_SCRIPT, JSON.stringify(expected),
    ], { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: processEnv }));
    if (!output.includes(CHECK_OK)) throw new Error("Readiness marker missing");
    log("✓ local: required environment variables decrypted successfully.");
    return true;
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`;
    const marker = output.split("\n").find((line) => line.startsWith(CHECK_MISSING));
    log(marker
      ? `✗ local: decryption failed or values are missing: ${marker.slice(CHECK_MISSING.length)}`
      : "✗ local: decryption verification failed. The configured key may be incorrect.");
    return false;
  }
}

export function doctor(root, log = console.log, execute = execFileSync, processEnv = env) {
  const project = root || cwd();
  const file = envPath(LOCAL_ENV_FILE, root);
  const keyAvailable = hasKey(root, processEnv);
  log(`\n  Environment Doctor for ${project}\n`);
  log(`  decryption key   ${keyAvailable ? "✓ available" : "✗ missing"}`);
  if (!existsSync(file)) {
    log(`  ${LOCAL_ENV_FILE} not found`);
    return false;
  }
  const publicNames = Object.keys(parseDotenv(readSafe(LOCAL_ENV_FILE, root))).filter((key) => key.startsWith("NEXT_PUBLIC_"));
  log(`  ${LOCAL_ENV_FILE} ${encrypted(root) ? "encrypted" : "plaintext"}${publicNames.length ? `, ${publicNames.length} public` : ""}`);
  for (const name of publicNames) log(`    NEXT_PUBLIC:  ${name}`);
  if (!encrypted(root) || !keyAvailable) return false;
  const ready = check(root, log, execute, processEnv);
  if (ready) log("  ✓ decryption verified");
  return ready;
}

export function validate(root, log = console.log) {
  const expected = expectedKeys(root);
  if (expected.size === 0) {
    log(`\n  No .env.example found at ${root || cwd()}. Create one first.\n`);
    return false;
  }
  const file = envPath(LOCAL_ENV_FILE, root);
  if (!existsSync(file)) {
    log(`  ✗ ${LOCAL_ENV_FILE} — not found`);
    return false;
  }
  const defined = new Set(Object.keys(parseDotenv(readSafe(LOCAL_ENV_FILE, root))));
  const missing = [...expected].filter((key) => !defined.has(key));
  const extra = [...defined].filter((key) => !expected.has(key) && !key.startsWith("DOTENV_PUBLIC_KEY"));
  if (missing.length === 0 && extra.length === 0) {
    log(`  ✓ ${LOCAL_ENV_FILE} — matches .env.example\n`);
    return true;
  }
  log(`  ⚠ ${LOCAL_ENV_FILE}:`);
  if (missing.length) log(`      missing: ${missing.join(", ")}`);
  if (extra.length) log(`      extra:   ${extra.join(", ")}`);
  return false;
}

export function run(args, root, log = console.log, execute = execFileSync, processEnv = env) {
  if (args?.[0] === "--") args = args.slice(1);
  if (!args?.length) {
    log("Usage: team-skills env run -- <command> [arg...]");
    return false;
  }
  const project = root || cwd();
  if (isVercelBuild(processEnv)) {
    try {
      execute(args[0], args.slice(1), { cwd: project, stdio: "inherit", env: processEnv });
      return true;
    } catch (error) {
      process.exitCode = error.status ?? 1;
      return false;
    }
  }
  if (!check(root, log, execute, processEnv)) {
    log("✗ Command not started because local environment decryption is not ready.");
    return false;
  }
  try {
    execute("npx", ["--no-install", "dotenvx", "run", "-f", envPath(LOCAL_ENV_FILE, root), "--", ...args], {
      cwd: project, stdio: "inherit", env: processEnv,
    });
    return true;
  } catch (error) {
    process.exitCode = error.status ?? 1;
    return false;
  }
}

export function set(key, root, log = console.log, execute = execFileSync) {
  if (!key || !/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    log("Usage: team-skills env set <KEY>");
    log("  KEY must use uppercase letters, numbers, and underscores.");
    log("  The value is collected by dotenvx's masked prompt. Never pass secrets in arguments.");
    return false;
  }
  try {
    execute("npx", ["--no-install", "dotenvx", "set", key, "-f", envPath(LOCAL_ENV_FILE, root)], {
      cwd: root || cwd(), stdio: "inherit",
    });
    log(`✓ ${key} encrypted into ${LOCAL_ENV_FILE}`);
    return true;
  } catch (error) {
    log(`✗ dotenvx did not update ${LOCAL_ENV_FILE}`);
    process.exitCode = error.status ?? 1;
    return false;
  }
}
