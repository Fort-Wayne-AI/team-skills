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
const PHYSICAL_TARGET = targets[0]; // .agents — single source of truth

function usage(error) {
  const message = `Usage:
  team-skills setup [--project <path>] [--force]

Commands:
  setup   Install shared agent skills into the current project. Skills are
          physically copied into .agents/skills/ and symlinked from
          .claude/skills/ and .hermes/skills/.`;
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
  const skills = [
    "project-conventions",
    "software-development-lifecycle",
    "notion-cli",
    "task-management",
    "environment-secrets",
  ];

  for (const skill of skills) {
    const source = join(skillsRoot, skill);

    // ── Physical install (single source of truth) ──
    const physicalRoot = join(project, PHYSICAL_TARGET, "skills");
    const physicalDest = join(physicalRoot, skill);
    const marker = join(physicalDest, ".team-skills.json");

    mkdirSync(physicalRoot, { recursive: true });

    if (existsSync(physicalDest) && !existsSync(marker) && !force) {
      throw new Error(
        `Refusing to replace unmanaged skill at ${physicalDest}. Re-run with --force only if it is safe to replace.`,
      );
    }
    rmSync(physicalDest, { recursive: true, force: true });
    cpSync(source, physicalDest, { recursive: true });
    writeFileSync(
      marker,
      `${JSON.stringify({ package: packageMetadata.name, version: packageMetadata.version, skill }, null, 2)}\n`,
      "utf8",
    );
    console.log(`Installed ${skill} → ${resolve(physicalDest)}`);

    // ── Symlinks for other agent directories ──
    for (const target of targets.slice(1)) {
      const linkRoot = join(project, target, "skills");
      const linkDest = join(linkRoot, skill);
      const linkMarker = join(linkDest, ".team-skills.json");
      const relativePath = relative(dirname(linkDest), physicalDest);

      mkdirSync(linkRoot, { recursive: true });

      if (existsSync(linkDest) && !existsSync(linkMarker) && !force) {
        throw new Error(
          `Refusing to replace unmanaged skill at ${linkDest}. Re-run with --force only if it is safe to replace.`,
        );
      }
      rmSync(linkDest, { recursive: true, force: true });
      symlinkSync(relativePath, linkDest, "dir");
      console.log(`Linked ${skill} → ${resolve(linkDest)} -> ${relativePath}`);
    }
  }

  writeManagedPointer(project);
  console.log(`Updated ${join(project, "AGENTS.md")}`);
}

function setup(args) {
  const project = resolve(optionValue(args, "--project") ?? process.cwd());
  const force = args.includes("--force");
  if (!existsSync(project)) throw new Error(`Project directory does not exist: ${project}`);

  installSkills(project, force);
  console.log("Done. Skills are ready for local use.");
}

function parseEnvArguments(args) {
  // For `env run`, everything after `--` belongs to the child command. Do not
  // reinterpret a child option named `--target` as our environment selector.
  const separator = args.indexOf("--");
  const optionArgs = separator === -1 ? args : args.slice(0, separator);
  const targetIndexes = optionArgs.flatMap((arg, index) => (arg === "--target" ? [index] : []));
  if (targetIndexes.length > 1) throw new Error("--target may be specified only once.");
  if (targetIndexes.length === 0) return { target: "auto", args };

  const index = targetIndexes[0];
  const target = args[index + 1];
  if (!target || target.startsWith("--")) throw new Error("--target requires local, preview, production, all, or auto.");
  return { target, args: [...args.slice(0, index), ...args.slice(index + 2)] };
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    usage(false);
  } else if (command === "setup") {
    setup(args);
  } else if (command === "env") {
    const { help, doctor, validate, check, run, set } = await import("../lib/environment-secrets.mjs");
    const [sub, ...rawSubArgs] = args;
    const { target, args: subArgs } = parseEnvArguments(rawSubArgs);
    if (!sub || sub === "help") {
      if (rawSubArgs.length > 0) throw new Error("team-skills env help does not accept options.");
      help();
    } else if (sub === "doctor") {
      if (subArgs.length > 0 || !doctor(undefined, console.log, undefined, target)) process.exitCode = 1;
    } else if (sub === "validate") {
      if (subArgs.length > 0 || !validate(undefined, console.log, target)) process.exitCode = 1;
    } else if (sub === "check") {
      if (subArgs.length > 0 || !check(undefined, console.log, undefined, target)) process.exitCode = 1;
    } else if (sub === "run") {
      if (!run(subArgs, undefined, console.log, undefined, target)) process.exitCode = 1;
    } else if (sub === "set") {
      if (subArgs.length !== 1) {
        throw new Error("Usage: team-skills env set [--target <target>] <KEY>. Never pass secret values as arguments.");
      }
      if (!set(subArgs[0], undefined, console.log, undefined, target)) process.exitCode = 1;
    } else {
      throw new Error(`Unknown env subcommand: ${sub}. Use 'team-skills env help'.`);
    }
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`team-skills: ${error.message}`);
  process.exitCode = 1;
}
