#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const skillsRoot = join(packageRoot, "skills");
const pointerTemplate = readFileSync(join(packageRoot, "templates", "agents-pointer.md"), "utf8");
const targets = [".agents", ".claude", ".hermes"];

function usage(error) {
  const message = `Usage:
  team-skills setup [--project <path>] [--force]

Commands:
  setup   Copy project-local agent skills into the current project.`;
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
  for (const target of targets) {
    const targetRoot = join(project, target, "skills");
    mkdirSync(targetRoot, { recursive: true });

    for (const skill of ["project-conventions"]) {
      const source = join(skillsRoot, skill);
      const destination = join(targetRoot, skill);
      const marker = join(destination, ".team-skills.json");
      if (existsSync(destination) && !existsSync(marker) && !force) {
        throw new Error(
          `Refusing to replace unmanaged skill at ${destination}. Re-run with --force only if it is safe to replace.`,
        );
      }
      rmSync(destination, { recursive: true, force: true });
      cpSync(source, destination, { recursive: true });
      writeFileSync(
        marker,
        `${JSON.stringify({ package: "@fort-wayne-ai/team-skills", version: "0.1.0", skill }, null, 2)}\n`,
        "utf8",
      );
      console.log(`Installed ${skill} → ${resolve(destination)}`);
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

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    usage(false);
  } else if (command === "setup") {
    setup(args);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`team-skills: ${error.message}`);
  process.exitCode = 1;
}
