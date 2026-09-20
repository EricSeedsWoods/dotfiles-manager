const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { currentPlatform, resolveLinks, classifyLink, linkOne } = require("../src/dotfiles-manager.js");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✘ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("dotfiles-manager tests");

function makeFixture() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "dotfiles-repo-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "dotfiles-home-"));
  fs.writeFileSync(path.join(repo, "vimrc"), "\" vim config\n");
  return { repo, home };
}

test("currentPlatform returns one of macos/linux/windows", () => {
  assert.ok(["macos", "linux", "windows"].includes(currentPlatform()));
});

test("resolveLinks expands '~' to the given home directory", () => {
  const manifest = { links: { "vimrc": "~/.vimrc" } };
  const [link] = resolveLinks(manifest, "linux", "/home/test");
  assert.strictEqual(link.target, "/home/test/.vimrc");
});

test("resolveLinks applies platform-specific overrides", () => {
  const manifest = {
    links: { "gitconfig": "~/.gitconfig" },
    platformOverrides: { windows: { "gitconfig": "~/AppData/gitconfig" } },
  };
  const [linuxLink] = resolveLinks(manifest, "linux", "/home/test");
  const [winLink] = resolveLinks(manifest, "windows", "/home/test");
  assert.strictEqual(linuxLink.target, "/home/test/.gitconfig");
  assert.strictEqual(winLink.target, "/home/test/AppData/gitconfig");
});

test("classifyLink reports 'source-missing' when the repo file doesn't exist", () => {
  const { repo, home } = makeFixture();
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const result = classifyLink({ source: "does-not-exist", target: path.join(home, ".foo") });
    assert.strictEqual(result.state, "source-missing");
  } finally {
    process.chdir(cwd);
  }
});

test("classifyLink reports 'not-linked' when the target doesn't exist yet", () => {
  const { repo, home } = makeFixture();
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const result = classifyLink({ source: "vimrc", target: path.join(home, ".vimrc") });
    assert.strictEqual(result.state, "not-linked");
  } finally {
    process.chdir(cwd);
  }
});

test("linkOne creates a real symlink pointing at the repo file", () => {
  const { repo, home } = makeFixture();
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const target = path.join(home, ".vimrc");
    const result = linkOne({ source: "vimrc", target });
    assert.strictEqual(result.action, "linked");
    const stat = fs.lstatSync(target);
    assert.ok(stat.isSymbolicLink());
    assert.strictEqual(fs.readFileSync(target, "utf8"), "\" vim config\n");
  } finally {
    process.chdir(cwd);
  }
});

test("linkOne is idempotent — running twice reports already-linked the second time", () => {
  const { repo, home } = makeFixture();
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const target = path.join(home, ".vimrc");
    linkOne({ source: "vimrc", target });
    const second = linkOne({ source: "vimrc", target });
    assert.strictEqual(second.action, "already-linked");
  } finally {
    process.chdir(cwd);
  }
});

test("linkOne refuses to overwrite a real (non-symlink) file without --force", () => {
  const { repo, home } = makeFixture();
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const target = path.join(home, ".vimrc");
    fs.writeFileSync(target, "a real pre-existing file");
    const result = linkOne({ source: "vimrc", target });
    assert.strictEqual(result.action, "skipped-conflict");
    assert.strictEqual(fs.readFileSync(target, "utf8"), "a real pre-existing file");
  } finally {
    process.chdir(cwd);
  }
});

test("linkOne overwrites a conflicting real file when force is set", () => {
  const { repo, home } = makeFixture();
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const target = path.join(home, ".vimrc");
    fs.writeFileSync(target, "a real pre-existing file");
    const result = linkOne({ source: "vimrc", target }, { force: true });
    assert.strictEqual(result.action, "linked");
    assert.ok(fs.lstatSync(target).isSymbolicLink());
  } finally {
    process.chdir(cwd);
  }
});

test("linkOne in dry-run mode reports what it would do without touching the filesystem", () => {
  const { repo, home } = makeFixture();
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const target = path.join(home, ".vimrc");
    const result = linkOne({ source: "vimrc", target }, { dryRun: true });
    assert.strictEqual(result.action, "would-link");
    assert.strictEqual(fs.existsSync(target), false);
  } finally {
    process.chdir(cwd);
  }
});

console.log(`\n${passed} test(s) passed`);
if (process.exitCode === 1) process.exit(1);
