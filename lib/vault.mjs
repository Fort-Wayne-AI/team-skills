import { execFileSync } from "node:child_process";
import { chmodSync, closeSync, copyFileSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const MANIFEST_FILE = ".vault.json";
const RECEIPT_DIR = ".vault-receipts";
const IDENTITY_FILE = resolve(homedir(), ".config", "team-skills", "age", "identity.txt");

function fail(message) {
  throw new Error(message);
}

function projectPath(root, path, label) {
  if (typeof path !== "string" || !path || path.includes("\0")) fail(`${label} must be a non-empty path.`);
  const absolute = resolve(root, path);
  const relativePath = relative(root, absolute);
  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) {
    fail(`${label} must stay inside the repository.`);
  }
  return { absolute, relative: relativePath.replaceAll("\\", "/") };
}

function sourcePath(root, path) {
  const source = projectPath(root, path, "Vault source");
  if (!source.relative.startsWith("vault/")) fail("Vault source must stay under vault/.");
  if (!source.relative.endsWith(".sops")) fail("Vault source must end in .sops.");
  return source;
}

function receiptPath(root, entry) {
  const digest = createHash("sha256").update(`${entry.source}\0${entry.destination}`).digest("hex");
  return resolve(root, RECEIPT_DIR, `${digest}.json`);
}

function isSymlink(path) {
  return existsSync(path) && lstatSync(path).isSymbolicLink();
}

function runGit(root, args) {
  try {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ignoredByGit(root, destination) {
  return runGit(root, ["check-ignore", "--quiet", "--no-index", destination]);
}

function ensureSafeEntry(root, entry) {
  const source = sourcePath(root, entry.source);
  const destination = projectPath(root, entry.destination, "Vault destination");
  if (isSymlink(source.absolute)) fail(`Vault source is a symlink: ${source.relative}`);
  if (!existsSync(source.absolute)) fail(`Vault source not found: ${source.relative}`);
  if (!ignoredByGit(root, destination.relative)) fail(`Vault destination must be Git-ignored: ${destination.relative}`);
  if (isSymlink(destination.absolute)) fail(`Vault destination is a symlink: ${destination.relative}`);
  return { source, destination };
}

const SOPS_INSTALL_URL = "https://getsops.io/docs/installation/";

function decrypt(source, execute) {
  // SOPS is an explicitly installed developer-machine prerequisite. Do not
  // download executables or substitute a bundled/unofficial wrapper here.
  if (execute === execFileSync && !existsSync(IDENTITY_FILE)) {
    fail("No enrolled age identity. Use team-skills vault enroll --from <private-identity-file>.");
  }
  try {
    return Buffer.from(execute("sops", ["--decrypt", source], {
      encoding: null,
      stdio: "pipe",
      env: { ...process.env, SOPS_AGE_KEY_FILE: IDENTITY_FILE },
    }));
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Official SOPS is unavailable. Install it for this machine: ${SOPS_INSTALL_URL}`);
    }
    fail("SOPS could not decrypt this entry. Verify the encrypted source and enrolled age identity without printing secret content.");
  }
}

function atomicWrite(destination, bytes) {
  const directory = dirname(destination);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = resolve(directory, `.${basename(destination)}.vault-${process.pid}-${crypto.randomUUID()}.tmp`);
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    chmodSync(temporary, 0o600);
    renameSync(temporary, destination);
    chmodSync(destination, 0o600);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch {}
    }
  }
}

function writeReceipt(root, entry) {
  const path = receiptPath(root, entry);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  atomicWrite(path, `${JSON.stringify({ version: 1, source: entry.source, destination: entry.destination })}\n`);
}

export function loadManifest(root = process.cwd()) {
  const manifestPath = resolve(root, MANIFEST_FILE);
  let data;
  try {
    data = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    fail(`Could not read ${MANIFEST_FILE}.`);
  }
  if (data?.version !== 1 || !data.entries || typeof data.entries !== "object" || Array.isArray(data.entries)) {
    fail(`${MANIFEST_FILE} must contain version 1 and an entries object.`);
  }
  const entries = {};
  for (const [name, entry] of Object.entries(data.entries)) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) fail(`Invalid vault entry name: ${name}`);
    if (!entry || typeof entry !== "object") fail(`Invalid vault entry: ${name}`);
    const source = sourcePath(root, entry.source);
    const destination = projectPath(root, entry.destination, "Vault destination");
    entries[name] = { name, source: source.relative, destination: destination.relative, format: entry.format || "text" };
  }
  return { root: resolve(root), entries };
}

function entryFor(name, root) {
  const manifest = loadManifest(root);
  const entry = manifest.entries[name];
  if (!entry) fail(`Unknown vault entry: ${name}`);
  return { manifest, entry };
}

export function list(manifest) {
  return Object.values(manifest.entries).map(({ name, source, destination, format }) => ({ name, source, destination, format }));
}

export function doctor(root = process.cwd(), log = console.log, execute = execFileSync) {
  try {
    const manifest = loadManifest(root);
    let version;
    try {
      version = String(execute("sops", ["--version"], { encoding: "utf8", stdio: "pipe" })).trim().split("\n")[0];
    } catch {
      version = null;
    }
    const identityReady = existsSync(IDENTITY_FILE);
    log(`  manifest         ✓ ${Object.keys(manifest.entries).length} entry(s)`);
    log(`  official SOPS    ${version ? `✓ ${version}` : `✗ unavailable — install instructions: ${SOPS_INSTALL_URL}`}`);
    log(`  age identity     ${identityReady ? "✓ enrolled" : "✗ not enrolled"}`);
    return Boolean(version && identityReady);
  } catch (error) {
    log(`✗ ${error.message}`);
    return false;
  }
}

export function enroll(from, log = console.log) {
  try {
    const source = resolve(from);
    if (!existsSync(source) || lstatSync(source).isSymbolicLink()) fail("Enrollment source must be an existing non-symlink private identity file.");
    mkdirSync(dirname(IDENTITY_FILE), { recursive: true, mode: 0o700 });
    if (existsSync(IDENTITY_FILE)) fail("An age identity is already enrolled; do not overwrite it implicitly.");
    copyFileSync(source, IDENTITY_FILE);
    chmodSync(IDENTITY_FILE, 0o600);
    log("✓ age identity enrolled with restrictive permissions");
    return true;
  } catch (error) {
    log(`✗ ${error.message}`);
    return false;
  }
}

export function check(name, root = process.cwd(), log = console.log, execute = execFileSync) {
  try {
    const { entry } = entryFor(name, root);
    const { source } = ensureSafeEntry(resolve(root), entry);
    decrypt(source.absolute, execute);
    log(`✓ ${entry.name}: decryptable and safe to materialize at ${entry.destination}`);
    return true;
  } catch (error) {
    log(`✗ ${error.message}`);
    return false;
  }
}

export function materialize(name, requestedDestination, root = process.cwd(), log = console.log, execute = execFileSync) {
  try {
    const { entry } = entryFor(name, root);
    if (requestedDestination && requestedDestination !== entry.destination) {
      fail("Vault destination must match the approved manifest mapping.");
    }
    const { source, destination } = ensureSafeEntry(resolve(root), entry);
    if (existsSync(destination.absolute)) {
      const receipt = receiptPath(resolve(root), entry);
      if (!existsSync(receipt)) fail(`Refusing to overwrite unmanaged destination: ${destination.relative}`);
      const proof = JSON.parse(readFileSync(receipt, "utf8"));
      if (proof.source !== entry.source || proof.destination !== entry.destination) fail(`Destination ownership proof does not match: ${destination.relative}`);
    }
    const bytes = decrypt(source.absolute, execute);
    atomicWrite(destination.absolute, bytes);
    writeReceipt(resolve(root), entry);
    log(`✓ ${entry.name}: materialized ${entry.destination}`);
    return true;
  } catch (error) {
    log(`✗ ${error.message}`);
    return false;
  }
}

export function clean(name, root = process.cwd(), log = console.log) {
  try {
    const { entry } = entryFor(name, root);
    const destination = projectPath(resolve(root), entry.destination, "Vault destination");
    const receipt = receiptPath(resolve(root), entry);
    if (!existsSync(destination.absolute)) {
      log(`✓ ${entry.name}: destination already absent`);
      return true;
    }
    if (isSymlink(destination.absolute)) fail(`Vault destination is a symlink: ${destination.relative}`);
    if (!existsSync(receipt)) fail(`Refusing to remove destination not owned by vault: ${destination.relative}`);
    const proof = JSON.parse(readFileSync(receipt, "utf8"));
    if (proof.source !== entry.source || proof.destination !== entry.destination) fail(`Destination ownership proof does not match: ${destination.relative}`);
    rmSync(destination.absolute);
    rmSync(receipt);
    log(`✓ ${entry.name}: cleaned ${entry.destination}`);
    return true;
  } catch (error) {
    log(`✗ ${error.message}`);
    return false;
  }
}
