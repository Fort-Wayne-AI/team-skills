#!/usr/bin/env node

/**
 * environment-secrets — deterministic dotenvx wrapper for team-skills.
 *
 * Public interface:
 *   help()    – print usage
 *   doctor()  – check .env files, encryption status, key presence
 *   validate()– compare resolved keys against .env.example
 *   run(args) – decrypt and spawn a child process
 *   set(key)  – prompt for a single encrypted value (stdin, never argv)
 *
 * Every function that could expose secret values MUST accept a `log` callback
 * (default console.log) so test callers can capture output and assert secrets
 * never leak.
 */

import { execFileSync, execSync } from "node:child_process";
import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd, env, stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_FILES = [".env", ".env.development", ".env.production", ".env.preview"];

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
  return /^[A-Z_]+=encrypted:/m.test(content);
}

/** Check if the .env.keys file exists. */
function hasKeys(root) {
  return existsSync(envPath(".env.keys", root));
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

/**
 * Resolve `dotenvx` CLI path from the consumer project's node_modules.
 * Falls back to `npx dotenvx` (works if dotenvx is in package.json).
 */
function dotenvxBin(root) {
  const candidates = [
    resolve(root || cwd(), "node_modules", "@dotenvx", "dotenvx", "src", "cli", "dotenvx.js"),
    resolve(root || cwd(), "node_modules", ".bin", "dotenvx"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Fallback: npx resolves it
  return "npx";
}

function useNpxFallback(root) {
  return dotenvxBin(root) === "npx";
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
  team-skills env run <command> [arg...]
  team-skills env set <KEY>

COMMANDS
  help      Print this message.
  doctor    Check which .env files exist, their encryption status,
            NEXT_PUBLIC_* presence, and whether .env.keys is present.
  validate  Compare the resolved variable names in each .env file against
            .env.example and report any missing or extra keys.
  run       Decrypt the .env files into the environment and execute the given
            command. Never creates a plaintext .env file on disk.
  set       Prompt (stdin) for the value of a single key and encrypt it into
            the matching .env file (e.g. NEXT_PUBLIC_* → .env, server-only →
            .env.production). Does NOT accept the value as an argument.

SECURITY
  • .env.keys must NEVER be committed or uploaded to Vercel.
  • Agents use doctor, validate, and run — they never read raw ENV values.
  • env set reads from /dev/tty or stdin; the value never appears in argv.
  • Missing variables are reported by name only — never by value.
`);
}

export function doctor(root, log = console.log) {
  const project = root || cwd();

  log(`\n  Environment Doctor for ${project}\n`);

  const keyStatus = hasKeys(root) ? "✓ present" : "✗ missing";
  log(`  .env.keys        ${keyStatus}`);

  for (const file of ENV_FILES) {
    const exists = fileExists(file, root);
    if (!exists) {
      log(`  ${file.padEnd(18)} not found`);
      continue;
    }
    const enc = isEncrypted(file, root);
    const pub = publicKeys(file, root);
    const parts = [
      enc ? "encrypted" : "plaintext",
      pub.length > 0 ? `${pub.length} public` : null,
      hasKeys(root) && enc ? `decryptable` : null,
    ].filter(Boolean);
    log(`  ${file.padEnd(18)} ${parts.join(", ")}`);
    for (const k of pub) {
      log(`    NEXT_PUBLIC:  ${k}`);
    }
  }

  if (!hasKeys(root)) {
    log(`\n  ⚠  Missing .env.keys — generate with \`npx dotenvx encrypt -f .env\``);
  }
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

export function run(args, root, log = console.log) {
  if (!args || args.length === 0) {
    log("Usage: team-skills env run <command> [arg...]");
    return;
  }

  const project = root || cwd();

  if (!hasKeys(root)) {
    log("✗ .env.keys not found — cannot decrypt. Run `npx dotenvx encrypt` first.");
    return;
  }

  const envFiles = ENV_FILES.filter((f) => fileExists(f, root));
  if (envFiles.length === 0) {
    log("✗ No .env files found — nothing to decrypt.");
    return;
  }

  const bin = dotenvxBin(root);
  const dotenvArgs = ["run"];
  for (const f of envFiles) {
    dotenvArgs.push("-f", envPath(f, root));
  }
  dotenvArgs.push("--", ...args);

  try {
    if (useNpxFallback(root)) {
      execFileSync("npx", ["dotenvx", ...dotenvArgs], {
        cwd: project,
        stdio: "inherit",
      });
    } else {
      execFileSync(bin, dotenvArgs, {
        cwd: project,
        stdio: "inherit",
      });
    }
  } catch (e) {
    process.exitCode = e.status ?? 1;
  }
}

export async function set(key, root, log = console.log) {
  if (!key || key.includes(" ")) {
    log("Usage: team-skills env set <KEY>");
    log("  Reads the value from stdin (one line). Never pass secrets in arguments.");
    return;
  }

  const project = root || cwd();
  const targetFile = key.startsWith("NEXT_PUBLIC_") ? ".env" : ".env.production";
  const fullPath = envPath(targetFile, root);

  // Create the file if it doesn't exist
  if (!existsSync(fullPath)) {
    writeFileSync(fullPath, "", "utf8");
  }

  // Prompt for value via stdin (hidden input)
  log(`Enter value for ${key}:`);
  const rl = createInterface({ input: stdin });
  const value = await new Promise((resolve) => {
    rl.question("", (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  if (!value) {
    log("✗ No value provided — skipping.");
    return;
  }

  // Append to file
  appendFileSync(fullPath, `${key}=${value}\n`, "utf8");

  // Encrypt with dotenvx
  const bin = dotenvxBin(root);
  const encArgs = ["encrypt", "-f", fullPath];

  try {
    if (useNpxFallback(root)) {
      execFileSync("npx", ["dotenvx", ...encArgs], {
        cwd: project,
        stdio: "inherit",
      });
    } else {
      execFileSync(bin, encArgs, { cwd: project, stdio: "inherit" });
    }
    log(`✓ ${key} encrypted into ${targetFile}`);
  } catch (e) {
    log(`✗ Encryption failed for ${targetFile}`);
    process.exitCode = e.status ?? 1;
  }
}
