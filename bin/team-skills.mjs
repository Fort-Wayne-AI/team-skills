#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const packageMetadata = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
const skillsRoot = join(packageRoot, "skills");
const pointerTemplate = readFileSync(join(packageRoot, "templates", "agents-pointer.md"), "utf8");
const targets = [".agents", ".claude", ".hermes"];
const skills = ["project-conventions", "software-development-lifecycle", "notion-cli", "task-management", "developer-secrets"];

function usage(error) {
  const message = `Usage:
  team-skills setup [--project <path>] [--force]
  team-skills vault <command> [arguments]

Vault commands:
  doctor
  list
  init <vault-path>
  edit <entry>
  updatekeys
  check <entry>
  materialize <entry> [destination]
  clean <entry>
  enroll --from <private-identity-file>

The deprecated 'team-skills env' command no longer exists. Use 'team-skills vault'.`;
  console[error ? "error" : "log"](message);
  process.exitCode = error ? 1 : 0;
}

function optionValue(args, option) {
  const index = args.indexOf(option);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a path.`);
  return value;
}

function writeManagedPointer(project) {
  const path = join(project, "AGENTS.md");
  const start = "<!-- team-skills:start -->";
  const end = "<!-- team-skills:end -->";
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const expression = new RegExp(`${start}[\\s\\S]*?${end}\\n?`, "g");
  const next = expression.test(existing)
    ? existing.replace(expression, pointerTemplate)
    : `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${pointerTemplate}`;
  writeFileSync(path, next, "utf8");
}

function installSkills(project, force) {
  for (const skill of skills) {
    const source = join(skillsRoot, skill);
    const physicalDest = join(project, ".agents", "skills", skill);
    const marker = join(physicalDest, ".team-skills.json");
    mkdirSync(dirname(physicalDest), { recursive: true });
    if (existsSync(physicalDest) && !existsSync(marker) && !force) {
      throw new Error(`Refusing to replace unmanaged skill at ${physicalDest}. Re-run with --force only if safe.`);
    }
    rmSync(physicalDest, { recursive: true, force: true });
    cpSync(source, physicalDest, { recursive: true });
    writeFileSync(marker, `${JSON.stringify({ package: packageMetadata.name, version: packageMetadata.version, skill }, null, 2)}\n`);
    console.log(`Installed ${skill} → ${resolve(physicalDest)}`);
    for (const target of targets.slice(1)) {
      const linkDest = join(project, target, "skills", skill);
      mkdirSync(dirname(linkDest), { recursive: true });
      if (existsSync(linkDest) && !existsSync(join(linkDest, ".team-skills.json")) && !force) {
        throw new Error(`Refusing to replace unmanaged skill at ${linkDest}. Re-run with --force only if safe.`);
      }
      rmSync(linkDest, { recursive: true, force: true });
      symlinkSync(relative(dirname(linkDest), physicalDest), linkDest, "dir");
    }
  }
  writeManagedPointer(project);
  console.log(`Updated ${join(project, "AGENTS.md")}`);
}

async function vault(args) {
  const { check, clean, doctor, edit, enroll, init, list, loadManifest, materialize, updatekeys } = await import("../lib/vault.mjs");
  const [command, ...rest] = args;
  if (!command || command === "help") return usage(false);
  if (command === "doctor") {
    if (rest.length || !doctor()) process.exitCode = 1;
  } else if (command === "list") {
    if (rest.length) throw new Error("Usage: team-skills vault list");
    for (const entry of list(loadManifest())) console.log(`${entry.name}\t${entry.source}\t→ ${entry.destination}\t${entry.format}`);
  } else if (command === "init") {
    if (rest.length !== 1 || !init(rest[0])) process.exitCode = 1;
  } else if (command === "check") {
    if (rest.length !== 1 || !check(rest[0])) process.exitCode = 1;
  } else if (command === "materialize") {
    if (rest.length < 1 || rest.length > 2 || !materialize(rest[0], rest[1])) process.exitCode = 1;
  } else if (command === "clean") {
    if (rest.length !== 1 || !clean(rest[0])) process.exitCode = 1;
  } else if (command === "enroll") {
    const from = optionValue(rest, "--from");
    if (rest.length !== 2 || !from || !enroll(from)) process.exitCode = 1;
  } else if (command === "edit") {
    if (rest.length !== 1 || !edit(rest[0])) process.exitCode = 1;
  } else if (command === "updatekeys") {
    if (rest.length || !updatekeys()) process.exitCode = 1;
  } else if (command === "rotate-key") {
    throw new Error("vault rotate-key is a high-risk incident workflow and is not automated. Follow the developer-secrets recovery runbook; generate and store the replacement private identity in the approved 1Password vault before changing recipients.");
  } else {
    throw new Error(`Unknown vault command: ${command}`);
  }
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") usage(false);
  else if (command === "setup") {
    const project = resolve(optionValue(args, "--project") ?? process.cwd());
    if (!existsSync(project)) throw new Error(`Project directory does not exist: ${project}`);
    installSkills(project, args.includes("--force"));
    console.log("Done. Skills are ready for local use.");
  } else if (command === "vault") await vault(args);
  else if (command === "env") throw new Error("team-skills env is retired. Migrate to team-skills vault; see the developer-secrets skill.");
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(`team-skills: ${error.message}`);
  process.exitCode = 1;
}
