#!/usr/bin/env node
/**
 * Dotfiles Manager — a cross-platform dotfiles sync and bootstrap tool.
 *
 * Manages a dotfiles repo using a manifest file (dotfiles.json) mapping
 * repo-relative source paths to their destination in $HOME, with optional
 * per-OS overrides. Symlinks (not copies) are used so edits in $HOME are
 * live-tracked in the repo — the standard, safe dotfiles pattern.
 *
 * Usage:
 *   node src/dotfiles-manager.js init                      Create a starter dotfiles.json in the current repo
 *   node src/dotfiles-manager.js add <path>                 Move a file/dir into the repo and symlink it back
 *   node src/dotfiles-manager.js link [--dry-run] [--force] Symlink everything in the manifest into $HOME
 *   node src/dotfiles-manager.js status                     Show what's linked, missing, or conflicting
 *   node src/dotfiles-manager.js --help
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const MANIFEST_FILE = "dotfiles.json";

function currentPlatform() {
  const p = process.platform;
  if (p === "darwin") return "macos";
  if (p === "win32") return "windows";
  return "linux";
}

function loadManifest(cwd = process.cwd()) {
  const manifestPath = path.join(cwd, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No ${MANIFEST_FILE} found in ${cwd}. Run 'init' first.`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function saveManifest(manifest, cwd = process.cwd()) {
  fs.writeFileSync(path.join(cwd, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * Resolves the manifest's "links" into a flat list of { source, target }
 * pairs for the current platform, applying any per-OS override in
 * "platformOverrides" (same source key, different target).
 */
function resolveLinks(manifest, platform = currentPlatform(), home = os.homedir()) {
  const overrides = manifest.platformOverrides?.[platform] || {};
  return Object.entries(manifest.links || {}).map(([source, defaultTarget]) => {
    const target = overrides[source] || defaultTarget;
    return {
      source,
      target: target.replace(/^~/, home),
    };
  });
}

function classifyLink(link, cwd = process.cwd()) {
  const sourceAbs = path.join(cwd, link.source);
  const targetAbs = path.resolve(link.target);

  if (!fs.existsSync(sourceAbs)) return { ...link, state: "source-missing" };

  if (!fs.existsSync(targetAbs) && !isBrokenSymlink(targetAbs)) return { ...link, state: "not-linked" };

  let stat;
  try {
    stat = fs.lstatSync(targetAbs);
  } catch {
    return { ...link, state: "not-linked" };
  }

  if (stat.isSymbolicLink()) {
    const real = fs.readlinkSync(targetAbs);
    const resolvedReal = path.isAbsolute(real) ? real : path.resolve(path.dirname(targetAbs), real);
    if (path.resolve(resolvedReal) === path.resolve(sourceAbs)) return { ...link, state: "linked" };
    return { ...link, state: "linked-elsewhere", actualTarget: resolvedReal };
  }

  return { ...link, state: "conflict" }; // a real file/dir already exists at the target
}

function isBrokenSymlink(p) {
  try {
    const stat = fs.lstatSync(p);
    return stat.isSymbolicLink() && !fs.existsSync(p);
  } catch {
    return false;
  }
}

function linkOne(link, opts = {}) {
  const sourceAbs = path.resolve(process.cwd(), link.source);
  const targetAbs = path.resolve(link.target);
  const classified = classifyLink(link);

  if (classified.state === "source-missing") {
    return { ...classified, action: "skipped" };
  }
  if (classified.state === "linked") {
    return { ...classified, action: "already-linked" };
  }
  if (classified.state === "conflict" && !opts.force) {
    return { ...classified, action: "skipped-conflict" };
  }

  if (opts.dryRun) {
    return { ...classified, action: "would-link" };
  }

  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  if (fs.existsSync(targetAbs) || isBrokenSymlink(targetAbs)) {
    fs.rmSync(targetAbs, { recursive: true, force: true });
  }
  fs.symlinkSync(sourceAbs, targetAbs);
  return { ...classified, action: "linked" };
}

function cmdInit() {
  const manifestPath = path.join(process.cwd(), MANIFEST_FILE);
  if (fs.existsSync(manifestPath)) {
    console.error(`${MANIFEST_FILE} already exists here.`);
    process.exit(1);
  }
  const starter = {
    links: {
      "zsh/.zshrc": "~/.zshrc",
      "git/.gitconfig": "~/.gitconfig",
      "vim/.vimrc": "~/.vimrc",
    },
    platformOverrides: {
      windows: {
        "git/.gitconfig": "~/.gitconfig",
      },
    },
  };
  saveManifest(starter);
  console.log(`Created ${MANIFEST_FILE}. Edit it, then run: node src/dotfiles-manager.js link`);
}

function cmdAdd(args) {
  const [target] = args;
  if (!target) { console.error("Usage: add <path-in-home>"); process.exit(1); }
  const targetAbs = path.resolve(target.replace(/^~/, os.homedir()));
  if (!fs.existsSync(targetAbs)) {
    console.error(`✘ ${targetAbs} does not exist.`);
    process.exit(1);
  }
  const base = path.basename(targetAbs);
  const destInRepo = path.join(process.cwd(), base);
  if (fs.existsSync(destInRepo)) {
    console.error(`✘ ${destInRepo} already exists in the repo.`);
    process.exit(1);
  }
  fs.renameSync(targetAbs, destInRepo);
  fs.symlinkSync(destInRepo, targetAbs);

  let manifest;
  try {
    manifest = loadManifest();
  } catch {
    manifest = { links: {} };
  }
  manifest.links[base] = target.startsWith("~") ? target : `~/${base}`;
  saveManifest(manifest);
  console.log(`Moved ${targetAbs} -> ${destInRepo} and symlinked it back. Added to ${MANIFEST_FILE}.`);
}

function cmdLink(args) {
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const manifest = loadManifest();
  const links = resolveLinks(manifest);
  console.log(`Platform: ${currentPlatform()}${dryRun ? " (dry run)" : ""}\n`);
  let linked = 0, skipped = 0, alreadyLinked = 0;
  for (const link of links) {
    const result = linkOne(link, { dryRun, force });
    console.log(`  [${result.action}] ${link.source} -> ${link.target}`);
    if (result.action === "linked" || result.action === "would-link") linked++;
    else if (result.action === "already-linked") alreadyLinked++;
    else skipped++;
  }
  console.log(`\n${linked} linked, ${alreadyLinked} already linked, ${skipped} skipped.`);
  if (skipped > 0 && !force) console.log("Re-run with --force to overwrite conflicting real files.");
}

function cmdStatus() {
  const manifest = loadManifest();
  const links = resolveLinks(manifest);
  console.log(`Platform: ${currentPlatform()}\n`);
  for (const link of links) {
    const classified = classifyLink(link);
    console.log(`  [${classified.state}] ${link.source} -> ${link.target}`);
  }
}

function printHelp() {
  console.log(`Dotfiles Manager — cross-platform dotfiles sync and bootstrap tool

Usage:
  node src/dotfiles-manager.js init                      Create a starter dotfiles.json in the current repo
  node src/dotfiles-manager.js add <path-in-home>         Move a file/dir into the repo and symlink it back
  node src/dotfiles-manager.js link [--dry-run] [--force] Symlink everything in the manifest into $HOME
  node src/dotfiles-manager.js status                     Show what's linked, missing, or conflicting
  node src/dotfiles-manager.js --help

Run these from the root of your dotfiles repo. dotfiles.json maps repo-relative
paths to a destination (supports "~"), with optional "platformOverrides" for
macos/linux/windows. Real files use symlinks (not copies), so edits in $HOME
are automatically tracked back in the repo.
`);
}

function main() {
  const [, , cmd, ...args] = process.argv;
  if (!cmd || cmd === "--help" || cmd === "-h") return printHelp();
  switch (cmd) {
    case "init": return cmdInit();
    case "add": return cmdAdd(args);
    case "link": return cmdLink(args);
    case "status": return cmdStatus();
    default:
      console.error(`Unknown command: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { currentPlatform, resolveLinks, classifyLink, linkOne, loadManifest, saveManifest };
