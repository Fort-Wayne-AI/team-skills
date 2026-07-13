#!/usr/bin/env node

import { spawnSync } from "node:child_process";
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
const notionPageId = "39b47eb592be8085a79bf50afd7d6da1";
const targets = [".agents", ".claude", ".hermes"];

function usage(error) {
  const message = `Usage:
  team-skills setup [--project <path>] [--skip-auth] [--force]
  team-skills doctor
  team-skills read-shared-understanding [--dry-run]

Commands:
  setup                       Copy project-local skills and authorize Notion access.
  doctor                      Check the bundled Notion CLI and local authorization.
  read-shared-understanding   Print the live shared conventions document as Markdown.`;
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

function ntn(args, options = {}) {
  const executable = join(packageRoot, "node_modules", ".bin", "ntn");
  if (!existsSync(executable)) {
    throw new Error("Bundled Notion CLI is missing. Reinstall @fort-wayne-ai/team-skills.");
  }
  return spawnSync(executable, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
}

function isAuthenticated() {
  const result = ntn(["api", "v1/users/me"]);
  return result.status === 0;
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

    for (const skill of ["shared-understanding"]) {
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
  const skipAuth = args.includes("--skip-auth");
  const force = args.includes("--force");
  if (!existsSync(project)) throw new Error(`Project directory does not exist: ${project}`);

  installSkills(project, force);
  if (skipAuth) {
    console.log("Skipped Notion authorization (--skip-auth).");
    return;
  }

  if (isAuthenticated()) {
    console.log("Notion authorization verified.");
    return;
  }

  console.log("Notion authorization is required to read the shared conventions. Starting Notion's official login flow…");
  const login = ntn(["login"], { cwd: project, stdio: "inherit" });
  if (login.status !== 0 || !isAuthenticated()) {
    throw new Error("Notion authorization was not verified. Re-run `npx team-skills setup` in an interactive terminal, or provide NOTION_API_TOKEN outside the repository.");
  }
  console.log("Notion authorization verified.");
}

function doctor() {
  const result = ntn(["doctor"], { stdio: "inherit" });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

function readSharedUnderstanding(args) {
  const command = `ntn pages get ${notionPageId}`;
  if (args.includes("--dry-run")) {
    console.log(command);
    return;
  }
  const result = ntn(["pages", "get", notionPageId], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    usage(false);
  } else if (command === "setup") {
    setup(args);
  } else if (command === "doctor") {
    doctor();
  } else if (command === "read-shared-understanding") {
    readSharedUnderstanding(args);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`team-skills: ${error.message}`);
  process.exitCode = 1;
}
