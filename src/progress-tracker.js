#!/usr/bin/env node
/**
 * progress-tracker.js
 *
 * Shows REAL progress on this project by querying the actual GitHub repo
 * (via `gh api`) for commits, merged PRs, closed issues, and releases —
 * plus a suggested Day 1 -> Month 1 roadmap for new contributors.
 *
 * This intentionally does NOT fabricate activity or badge counters.
 * It reports what has genuinely happened in the repo.
 *
 * Usage:
 *   node src/progress-tracker.js            # show current real stats
 *   node src/progress-tracker.js roadmap     # show the roadmap only
 */

const { execSync } = require("child_process");

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

function ghAvailable() {
  return sh("gh --version") !== null;
}

function ghAuthed() {
  try {
    execSync("gh auth status", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function detectRepo() {
  return sh("gh repo view --json nameWithOwner -q .nameWithOwner");
}

function apiCount(path) {
  const out = sh(`gh api ${path} --paginate -q '. | length' 2>/dev/null`);
  if (out === null) return null;
  const nums = out.split("\n").filter(Boolean).map(Number);
  return nums.reduce((a, b) => a + b, 0);
}

function printBar(label, value, max) {
  const width = 24;
  const filled = max > 0 ? Math.round((Math.min(value, max) / max) * width) : 0;
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  console.log(`  ${label.padEnd(18)} [${bar}] ${value}`);
}

function showStats() {
  console.log("📊 Real project progress\n");

  if (!ghAvailable()) {
    console.log("  GitHub CLI (gh) not found — install from https://cli.github.com");
    console.log("  to see live repo stats. Showing roadmap instead.\n");
    return showRoadmap();
  }
  if (!ghAuthed()) {
    console.log("  gh is not authenticated — run: gh auth login");
    console.log("  Showing roadmap instead.\n");
    return showRoadmap();
  }

  const repo = detectRepo();
  if (!repo) {
    console.log("  Could not detect a GitHub repo in this directory.");
    console.log("  Run this from inside a cloned repo with a GitHub remote.\n");
    return showRoadmap();
  }

  console.log(`  Repo: ${repo}\n`);

  const mergedPRs = apiCount(`search/issues -f q="repo:${repo} is:pr is:merged"`);
  const closedIssues = apiCount(`search/issues -f q="repo:${repo} is:issue is:closed"`);
  const openIssues = apiCount(`search/issues -f q="repo:${repo} is:issue is:open"`);
  const releases = apiCount(`repos/${repo}/releases`);
  const contributors = apiCount(`repos/${repo}/contributors`);

  printBar("Merged PRs", mergedPRs ?? 0, 20);
  printBar("Closed issues", closedIssues ?? 0, 20);
  printBar("Open issues", openIssues ?? 0, 10);
  printBar("Releases", releases ?? 0, 5);
  printBar("Contributors", contributors ?? 0, 10);

  console.log(`\n  Profile check: https://github.com/${repo}`);
  console.log(`  Activity:      https://github.com/${repo}/pulse`);
  console.log(`  Releases:      https://github.com/${repo}/releases\n`);
}

function showRoadmap() {
  console.log("🗺️  Day 1 → Month 1 roadmap for Dotfiles Manager\n");
  const steps = [
    ["Day 1", "Clone repo, run scripts/setup.sh, run npm test, run the CLI once."],
    ["Day 2-3", "Read CONTRIBUTING.md, pick a 'good first issue', open a draft PR."],
    ["Week 1", "Get one PR merged. Watch CI go green on ci.yml."],
    ["Week 2", "File a well-written bug report or feature request using the issue templates."],
    ["Week 3", "Add or improve a test. Review someone else's PR."],
    ["Week 4", "Help cut a release with scripts/release.sh (patch/minor bump + changelog)."],
    ["Month 1", "Own a small feature end-to-end: issue -> PR -> merged -> released."],
  ];
  const width = Math.max(...steps.map(([s]) => s.length));
  for (const [when, what] of steps) {
    console.log(`  ${when.padEnd(width)}  ${what}`);
  }
  console.log("\n  This roadmap reflects real collaboration steps — no shortcuts needed.\n");
}

const mode = process.argv[2];
if (mode === "roadmap") {
  showRoadmap();
} else {
  showStats();
}
