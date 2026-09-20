#!/usr/bin/env bash
# release.sh — bumps the version, updates CHANGELOG.md, tags, and pushes.
# The actual GitHub Release is then built by .github/workflows/release.yml
# once the tag lands, using real commit history via `generate_release_notes`.
#
# Usage: scripts/release.sh [patch|minor|major]   (default: patch)
set -euo pipefail

BUMP="${1:-patch}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${BOLD}Dotfiles Manager — release helper${NC}"
echo "----------------------------------------"

# 1. Check gh auth
if ! command -v gh >/dev/null 2>&1; then
  echo -e "${RED}✘ GitHub CLI (gh) is not installed.${NC} Install it: https://cli.github.com"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo -e "${RED}✘ gh is not authenticated.${NC}"
  echo "  Fix it with: gh auth login"
  exit 1
fi
echo -e "${GREEN}✔${NC} gh authenticated"

# 2. Auto-detect repo
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || {
  echo -e "${RED}✘ Could not detect a GitHub repo here.${NC} Run this from inside a cloned repo with a GitHub remote."
  exit 1
}
echo -e "${GREEN}✔${NC} Detected repo: ${BOLD}$REPO${NC}"

# 3. Ensure clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}✘ Working tree is not clean.${NC} Commit or stash changes first."
  exit 1
fi

# 4. Run tests before releasing anything
echo "Running tests..."
if ! npm test; then
  echo -e "${RED}✘ Tests failed — aborting release.${NC}"
  exit 1
fi
echo -e "${GREEN}✔${NC} Tests passed"

# 5. Bump version (creates a commit + tag locally via npm)
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BRANCH="release/${BUMP}-${TIMESTAMP}"
git checkout -b "$BRANCH"

NEW_VERSION=$(npm version "$BUMP" -m "chore(release): v%s")
echo -e "${GREEN}✔${NC} Bumped version to ${BOLD}${NEW_VERSION}${NC}"

# 6. Update CHANGELOG.md: move [Unreleased] into a dated section
TODAY=$(date +%Y-%m-%d)
VERSION_NUM="${NEW_VERSION#v}"
if grep -q "## \[Unreleased\]" CHANGELOG.md; then
  awk -v ver="$VERSION_NUM" -v date="$TODAY" '
    /## \[Unreleased\]/ {
      print;
      print "";
      print "## [" ver "] - " date;
      next
    }
    { print }
  ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  git add CHANGELOG.md
  git commit -m "docs: update changelog for ${NEW_VERSION}"
fi

# 7. Push branch and tag
git push -u origin "$BRANCH"
git push origin "$NEW_VERSION"
echo -e "${GREEN}✔${NC} Pushed branch ${BRANCH} and tag ${NEW_VERSION}"

# 8. Open a real PR for review (no auto-merge — a human/CI approves it)
PR_URL=$(gh pr create \
  --title "chore(release): ${NEW_VERSION}" \
  --body "Automated release PR for ${NEW_VERSION}. Merging this keeps main in sync with the pushed tag. The tag push already triggers .github/workflows/release.yml to publish the GitHub Release." \
  --base main \
  --head "$BRANCH")

echo -e "${GREEN}${BOLD}Release started.${NC}"
echo "  Pull request: $PR_URL"
echo "  Once the tag's CI finishes, check the release at:"
echo "  https://github.com/${REPO}/releases/tag/${NEW_VERSION}"
echo "  Review/merge the PR at your convenience: $PR_URL"
